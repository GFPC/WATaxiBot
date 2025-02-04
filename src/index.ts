import WAWebJS, {Chat, Client, LocalAuth, Message, MessageContent} from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import {RegisterHandler} from "./handlers/register";
import dotenv from 'dotenv';
import {Storage} from "./storage/storage";
import {AuthData, baseURL, createForm, postHeaders} from "./api/general";
import {OrderHandler} from "./handlers/order";
import {checkRegister} from "./api/user";
import winston, {Logger} from 'winston';
import {localization, localizationNames} from "./l10n";
import {StateMachine} from "./states/types";
import {RideHandler} from "./handlers/ride";
import {MemoryStorage} from "./storage/mem";
import {DrivesStorage} from "./storage/drivesStorage";
import axios from "axios";
import {UsersStorage} from "./storage/usersStorage";
import {VotingHandler} from "./handlers/voting";
import {Constants} from "./api/constants";
import {SettingsHandler} from "./handlers/settings";
import {DefaultHandler} from "./handlers/default";

// Загружаем конфиг
const envFile = process.env.NODE_ENV === 'production' ? '.env.prod' : '.env.dev';
dotenv.config({path: envFile});

// Настраиваем логгер
const logger = winston.createLogger({
  level: process.env.LOGGING_LEVEL ?? 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({filename: 'error.jsonl', level: 'error', dirname: process.env.LOGGING_DIR ?? 'logs'}),
    new winston.transports.File({filename: 'full.jsonl', dirname: process.env.LOGGING_DIR ?? 'logs'}),
    new winston.transports.Console({format: winston.format.combine(winston.format.cli())})
  ],
});

// Получение данных аутентификации администратора
const adminAuth: AuthData = {
  token: process.env.API_ADMIN_TOKEN ?? '',
  hash: process.env.API_ADMIN_HASH ?? ''
};

// Создаём Storage
const storage = new MemoryStorage();

// Список активных поездок
const driveList = new DrivesStorage();

// Справочник юзеров и их api_id
const userList = new UsersStorage();

// Создаёт клиент WhatsApp
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox']},
});

const API_CONSTANTS = new Constants();

client.on('qr', (qr) => {
  logger.info('Authentication required. Scan the QR code in the mobile app');
  qrcode.generate(qr, {small: true});
});

client.on('ready', () => {
  logger.info('Client is ready!');
});

client.on('authenticated', () => {
  logger.info('Authenticated');
});

client.on('auth_failure', msg => {
  // Если восстановление сеанса не увенчалось успехом
  logger.error(`Authentication failure: ${msg}`);
});

async function checkUserRegister(userId: string): Promise<boolean> {
  /* Функция, которая проверяет зарегистрирован ли пользователь */
  let status: boolean | null = await storage.pull(`reg:${userId}`);
  if (status !== null) {
    return status;
  }

  status = await checkRegister(
    {whatsappId: userId, phone: userId.split('@')[0]},
    adminAuth
  );

  await storage.push(`reg:${userId}`, status);
  return status;
}

export interface Context {
  message: Message
  chat: Chat
  storage: Storage
  auth: AuthData
  logger: Logger
  client: Client
  userID: string
  api_u_id: string,
  constants: Constants,
  details?: any,
  usersList: UsersStorage,
  user: any
}

export type Handler = (ctx: Context) => Promise<void>;

async function router(ctx: Context): Promise<Handler> {
  const user = await userList.pull(ctx.userID.split('@')[0]);
  if(user?.api_u_id == '-1' || !user || user?.reloadFromApi == true) {
    console.log("REQUESTING USER API_ID REQ:",{ token: adminAuth.token, u_hash: adminAuth.hash,u_a_phone: ctx.userID.split('@')[0]})
    const userData = await axios.post(`${baseURL}user`, { token: adminAuth.token, u_hash: adminAuth.hash,u_a_phone: ctx.userID.split('@')[0]}, {headers: postHeaders});
    console.log("REQUESTING USER API_ID RES:",userData.data)
    if(userData.data.status === 'error') {
      console.log("REG TOP POINT")
      ctx.details.lang = {
        iso:API_CONSTANTS.data.data.langs[ctx.constants.data.default_lang].iso,
        api_id: ctx.constants.data.default_lang,
        native:API_CONSTANTS.data.data.langs[ctx.constants.data.default_lang].native
      }
      // Если пользователь не зарегистрирован, то вызываем обработчик регистрации
      return RegisterHandler;
    }
    await userList.push(ctx.userID.split('@')[0], {
      api_u_id: userData.data.auth_user.u_id,
      settings:{
        lang: {
          iso:API_CONSTANTS.data.data.langs[userData.data.data.user[Object.keys(userData.data.data.user)[0]].u_lang ?? ctx.constants.data.default_lang].iso,
          api_id: userData.data.data.user[Object.keys(userData.data.data.user)[0]].u_lang ?? ctx.constants.data.default_lang,
          native:API_CONSTANTS.data.data.langs[userData.data.data.user[Object.keys(userData.data.data.user)[0]].u_lang ?? ctx.constants.data.default_lang].native
        }
      }
    });
    ctx.api_u_id = Object.keys(userData.data.data.user)[0]
  }


  ctx.user = await userList.pull(ctx.userID.split('@')[0]);


  const state: StateMachine | null = await ctx.storage.pull(ctx.userID);
  console.log('STATE: ', state)

  switch (state?.id) {
    case "ride":
      return RideHandler
    case "voting":
      return VotingHandler
    case "settings":
      return SettingsHandler
    case "order":
      return OrderHandler
    default:
      return DefaultHandler
  }
}

client.on('message', async (msg) => {
  let userId = "3525235511@c.us"; //msg.from; // Тут можно сделать замену исходного номера телефона на фейковый для тестов
  //if(userId==="79999183175@c.us" || userId==="79029403313@c.us"){ return}
  if(userId ==="status@broadcast"){
    return
  }
  const user = await userList.pull(userId.split('@')[0]);

  logger.info(`Received message from ${userId}`);

  // Создаём контекст
  const ctx: Context = {
    auth: adminAuth,
    client: client,
    storage: storage,
    logger: logger,
    userID: userId,
    message: msg,
    chat: await msg.getChat(),
    api_u_id: '-1',
    constants: API_CONSTANTS,
    details: {},
    usersList: userList,
    user: {
      settings: {
        lang: {
          iso:API_CONSTANTS.data.data.langs[API_CONSTANTS.data.default_lang].iso,
          api_id: API_CONSTANTS.data.default_lang,
          native:API_CONSTANTS.data.data.langs[API_CONSTANTS.data.default_lang].native
        }
      }
    }
  }

  try {
    const handler = await router(ctx);
    await handler(ctx);
  } catch (e) {
    logger.error(`Error when calling the handler: ${e}`)
    await msg.reply(ctx.constants.getPrompt(localizationNames.error, ctx.constants.data.default_lang));
    await storage.delete(userId);
  }
});

async function startUp() {
  await API_CONSTANTS.getData();
  console.log('Constants received')
  await client.initialize();
  console.log('Client initialized')
}

console.log('Bot starting');
startUp().then(
    () => {
      logger.info('Default lang: ' + API_CONSTANTS.data.default_lang);
      logger.info('GFP -> Bot started!');
    },
).catch(
    (err) => {
      logger.error('Error: ' + err)
      process.exit(1)
    }
)