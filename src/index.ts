import WAWebJS, {
  Chat,
  Client,
  LocalAuth,
  Message,
  MessageContent,
} from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import { RegisterHandler } from "./handlers/register";
import dotenv from "dotenv";
import { Storage } from "./storage/storage";
import { AuthData, baseURL, createForm, postHeaders } from "./api/general";
import { OrderHandler } from "./handlers/order";
import { checkRegister } from "./api/user";
import winston, { Logger } from "winston";
import { localization, localizationNames } from "./l10n";
import { StateMachine } from "./states/types";
import { RideHandler } from "./handlers/ride";
import { MemoryStorage } from "./storage/mem";
import { DrivesStorage } from "./storage/drivesStorage";
import axios from "axios";
import { UsersStorage } from "./storage/usersStorage";
import { VotingHandler } from "./handlers/voting";
import { Constants, ConstantsStorage } from "./api/constants";
import { SettingsHandler } from "./handlers/settings";
import { DefaultHandler } from "./handlers/default";
import { HelpHandler } from "./handlers/help";
import * as fs from "fs";
import { ServiceMap } from "./ServiceMap";
import { URLManager } from "./URLManager";
import * as url from "url";

const SESSION_DIR = "./sessions";

// Создаем папку для сессий
if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR);
}

const envFile =
  process.env.NODE_ENV === "production" ? ".env.prod" : ".env.dev";
dotenv.config({ path: envFile });

// Настраиваем логгер
const logger = winston.createLogger({
  level: process.env.LOGGING_LEVEL ?? "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.File({
      filename: "error.jsonl",
      level: "error",
      dirname: process.env.LOGGING_DIR ?? "logs",
    }),
    new winston.transports.File({
      filename: "full.jsonl",
      dirname: process.env.LOGGING_DIR ?? "logs",
    }),
    new winston.transports.Console({
      format: winston.format.combine(winston.format.cli()),
    }),
  ],
});

// Получение данных аутентификации администратора

const urlManager = URLManager(
  "https://ibronevik.ru/taxi/c/%config%/api/v1/",
  ServiceMap,
);

const API_CONSTANTS = ConstantsStorage(urlManager);
export interface Context {
  message: Message;
  chat: Chat;
  storage: Storage;
  auth: AuthData;
  logger: Logger;
  client: Client;
  userID: string;
  api_u_id: string;
  constants: Constants;
  details?: any;
  usersList: UsersStorage;
  user: any;
  botID: string;
  baseURL: string;
}

export type Handler = (ctx: Context) => Promise<void>;

async function router(
  ctx: Context,
  userList: UsersStorage,
  adminAuth: AuthData,
): Promise<(ctx: Context) => Promise<void>> {
  const user = await userList.pull(ctx.userID.split("@")[0]);
  if (user?.api_u_id == "-1" || !user || user?.reloadFromApi == true) {
    console.log(
      "Point 0x0000-0 router requesting user, config: " + ServiceMap[ctx.botID],
      "USER:",
      {
        token: adminAuth.token,
        u_hash: adminAuth.hash,
        u_a_phone: ctx.userID.split("@")[0],
      },
    );
    const userData = await axios.post(
      `${ctx.baseURL}user`,
      {
        token: adminAuth.token,
        u_hash: adminAuth.hash,
        u_a_phone: ctx.userID.split("@")[0],
      },
      { headers: postHeaders },
    );
    console.log("Point 0x0000-1 response", userData.data);
    if (userData.data.status === "error") {
      console.log("REG POINT DEFAULT_LANG: ", ctx.constants.data.default_lang);
      ctx.details.lang = {
        iso: API_CONSTANTS[ctx.botID].data.data.langs[
          ctx.constants.data.default_lang
        ].iso,
        api_id: ctx.constants.data.default_lang,
        native:
          API_CONSTANTS[ctx.botID].data.data.langs[
            ctx.constants.data.default_lang
          ].native,
      };
      // Если пользователь не зарегистрирован, то вызываем обработчик регистрации
      return RegisterHandler;
    }
    const userSection =
      userData.data.data.user[Object.keys(userData.data.data.user)[0]];
    await userList.push(ctx.userID.split("@")[0], {
      api_u_id: userData.data.auth_user.u_id,
      settings: {
        lang: {
          iso: API_CONSTANTS[ctx.botID].data.data.langs[
            userData.data.data.user[Object.keys(userData.data.data.user)[0]]
              .u_lang ?? ctx.constants.data.default_lang
          ].iso,
          api_id:
            userData.data.data.user[Object.keys(userData.data.data.user)[0]]
              .u_lang ?? ctx.constants.data.default_lang,
          native:
            API_CONSTANTS[ctx.botID].data.data.langs[
              userData.data.data.user[Object.keys(userData.data.data.user)[0]]
                .u_lang ?? ctx.constants.data.default_lang
            ].native,
        },
      },
      referrer_u_id: userSection?.referrer_u_id ?? null,
      u_details: userSection?.u_details ?? null,
      ref_code: userSection?.ref_code ?? null,
    });
    ctx.api_u_id = Object.keys(userData.data.data.user)[0];
  }

  ctx.user = await userList.pull(ctx.userID.split("@")[0]);

  const state: StateMachine | null = await ctx.storage.pull(ctx.userID);
  console.log("BOT `" + ctx.botID + "`  STATE: ", state);

  if (ctx.message.body == "9") {
    if (state?.id === "order" && state?.state === "collectionFrom") {
      return HelpHandler;
    } else if (state?.id === "order" && state?.state === "collectionTo") {
      return HelpHandler;
    }
  }

  switch (state?.id) {
    case "ride":
      return RideHandler;
    case "voting":
      return VotingHandler;
    case "settings":
      return SettingsHandler;
    case "order":
      return OrderHandler;
    default:
      return DefaultHandler;
  }
}

// Функция создания бота
function createBot(botId: string) {
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;
  const baseDelay = 1000; // 1 секунда

  const adminAuth: AuthData = {
    token: process.env.API_ADMIN_TOKEN ?? "",
    hash: process.env.API_ADMIN_HASH ?? "",
  };

  // Создаём Storage
  const storage = new MemoryStorage();

  // Справочник юзеров и их api_id
  const userList = new UsersStorage();

  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: `bot-${botId}`,
      dataPath: `${SESSION_DIR}/bot-${botId}`,
    }),
    puppeteer: {
      headless: true,
      args: ["--no-sandbox"],
    },
  });

  client.on("qr", (qr) => {
    console.log(`\nQR для Бота ${botId}:`);
    qrcode.generate(qr, { small: true });
  });
  client.on("authenticated", (session) => {
    console.log(`🔑Бот ${botId} успешно аутентифицирован`);
  });

  client.on("ready", () => {
    console.log(`🟢 Бот ${botId} готов к работе!`);
  });

  client.on("message", async (msg) => {
    const blackList: string[] = [
        //"79999183175@c.us"
    ]
    if (blackList.includes(msg.from)) {
        return;
    }
    let userId = msg.from;
    if (Object.values(ServiceMap).includes(userId)) {
    } // hide messages from other bots

    logger.info(`Received message from ${userId}`);

    const defaultLang =
      API_CONSTANTS[botId].data.data.langs[
        API_CONSTANTS[botId].data.default_lang
      ];

    // Создаём контекст
    const ctx: Context = {
      auth: adminAuth,
      client: client,
      storage: storage,
      logger: logger,
      userID: userId,
      message: msg,
      chat: await msg.getChat(),
      api_u_id: "-1",
      constants: API_CONSTANTS[botId],
      details: {},
      usersList: userList,
      user: {
        settings: {
          lang: {
            iso: defaultLang.iso,
            api_id: API_CONSTANTS[botId].data.default_lang,
            native: defaultLang.native,
          },
        },
      },
      botID: botId,
      baseURL: urlManager[botId],
    };
    const handler = await router(ctx, userList, adminAuth);
    await handler(ctx);
    try {
    } catch (e) {
      logger.error(`Error when calling the handler: ${e}`);
      await msg.reply(
        ctx.constants.getPrompt(
          localizationNames.error,
          ctx.constants.data.default_lang,
        ),
      );
      await storage.delete(userId);
    }
  });

  client.on("disconnected", async (reason) => {
    console.log(`Бот ${botId} отключен (причина: ${reason})`);

    if (reconnectAttempts < maxReconnectAttempts) {
      const delay = Math.min(baseDelay * Math.pow(2, reconnectAttempts), 30000); // Макс 30 сек
      reconnectAttempts++;

      console.log(
        `Попытка переподключения ${reconnectAttempts} через ${delay}мс...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));

      client.initialize(); // Перезапуск
    } else {
      console.error(`Бот ${botId}: достигнут лимит попыток переподключения`);
    }
  });

  client
    .initialize()
    .then((r) =>
      console.log(
        `Бот ${botId} инициализирован, response: ${r === undefined ? "ok" : r}`,
      ),
    );
  return client;
}

// Startup MAP
// 1. Load constants
// 2. Start all bots

Object.keys(API_CONSTANTS).forEach(async (key) => {
  console.log(`Загрузка констант для ${key}...`);
  await API_CONSTANTS[key].getData(urlManager[key]);
  console.log(`Константы для ${key} загружены`);
});

// Создаем N ботов
const bots = Object.keys(ServiceMap).map((key, index) => {
  return createBot(key);
});

// Обработка завершения работы
process.on("SIGINT", () => {
  console.log("\nЗавершение работы...");
  bots.forEach((bot) => bot.destroy());
  process.exit();
});
