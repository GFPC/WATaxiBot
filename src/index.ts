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
import axios, { AxiosError } from "axios";
import { UsersStorage } from "./storage/usersStorage";
import { VotingHandler } from "./handlers/voting";
import { Constants, ConstantsStorage } from "./api/constants";
import { SettingsHandler } from "./handlers/settings";
import { DefaultHandler } from "./handlers/default";
import { HelpHandler } from "./handlers/help";
import * as fs from "fs";
import { ConfigsMap, ServiceMap } from "./ServiceMap";
import { URLManager } from "./managers/URLManager";
import * as url from "url";
import { ConfigManager } from "./managers/ConfigManager";
import {AIStorage} from "./storage/AIStorage";
import {AIHandler} from "./handlers/ai";

const SESSION_DIR = "./sessions";
const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY = 1000; // 1 second
const MESSAGE_FILTER = "c.us";
const BLACKLIST = ["79999183175@c.us", "34614478119@c.us"];

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
const configManager = new ConfigManager(ConfigsMap, urlManager);

const API_CONSTANTS = ConstantsStorage(urlManager);

interface UserSettings {
    lang: {
        iso: string;
        api_id: string;
        native: string;
    };
}

interface UserData {
    api_u_id: string;
    settings: UserSettings;
    referrer_u_id: string | null;
    u_details: any | null;
    ref_code: string | null;
}

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
    aiStorage: AIStorage;
    user: {
        settings: UserSettings;
    };
    botID: string;
    baseURL: string;
    configName: string;
}

export type Handler = (ctx: Context) => Promise<void>;
async function router(
    ctx: Context,
    userList: UsersStorage,
    aiStorage: AIStorage,
    adminAuth: AuthData,
): Promise<Handler> {
    try {
        const user = await userList.pull(ctx.userID);
        console.log("->Router. State=", (await ctx.storage.pull(ctx.userID))?.id + "." + (await ctx.storage.pull(ctx.userID))?.state + ". User=", user, ' Message=', ctx.message.body);

        if (user?.api_u_id === "-1" || !user || user?.reloadFromApi) {
            const userData = await fetchUserData(ctx, adminAuth);
            //console.log("USER DATA", userData);
            if (!userData) {
                return RegisterHandler;
            }
            await userList.push(ctx.userID, userData);
            ctx.api_u_id = Object.keys(userData)[0];
        }

        ctx.user = await userList.pull(ctx.userID);
        const state: StateMachine | null = await ctx.storage.pull(ctx.userID);

        if (
            ctx.message.body === "9" &&
            state?.id === "order" &&
            (state?.state === "collectionFrom" ||
                state?.state === "collectionTo")
        ) {
            return HelpHandler;
        } else if (
            (ctx.message.body === "9" &&
            (state?.id === "order")) || state?.state === "aiQuestion" || state?.state === "aiAnswer"
        ) {
            return AIHandler;
        }

        const handlerMap: Record<string, Handler> = {
            ride: RideHandler,
            voting: VotingHandler,
            settings: SettingsHandler,
            order: OrderHandler,
            register: RegisterHandler,
        };

        return handlerMap[state?.id ?? ""] ?? DefaultHandler;
    } catch (error) {
        ctx.logger.error(`Router error: ${error}`);
        return DefaultHandler;
    }
}

async function fetchUserData(
    ctx: Context,
    adminAuth: AuthData,
): Promise<UserData | null> {
    try {
        const userData = await axios.post(
            `${ctx.baseURL}user`,
            {
                token: adminAuth.token,
                u_hash: adminAuth.hash,
                u_a_phone: ctx.userID,
            },
            { headers: postHeaders },
        );
        console.log("REQUESTING USER DATA RES:", userData.data);

        if (userData.data.status === "error") {
            return null;
        }

        const userSection =
            userData.data.data.user[Object.keys(userData.data.data.user)[0]];
        const langId = userSection.u_lang ?? ctx.constants.data.default_lang;
        const langData = ctx.constants.data.data.langs[langId];

        return {
            api_u_id: userData.data.auth_user.u_id,
            settings: {
                lang: {
                    iso: langData.iso,
                    api_id: langId,
                    native: langData.native,
                },
            },
            referrer_u_id: userSection?.referrer_u_id ?? null,
            u_details: userSection?.u_details ?? null,
            ref_code: userSection?.ref_code ?? null,
        };
    } catch (error) {
        if (error instanceof AxiosError) {
            ctx.logger.error(`Failed to fetch user data: ${error.message}`);
        } else {
            ctx.logger.error(
                `Unexpected error while fetching user data: ${error}`,
            );
        }
        return null;
    }
}

// Функция создания бота
async function createBot(botId: string) {
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const baseDelay = 1000; // 1 секунда

    const adminAuth: AuthData = await configManager.auth(
        ServiceMap[botId],
        botId,
    );

    // Создаём Storage
    const storage = new MemoryStorage();

    // Справочник юзеров и их api_id
    const userList = new UsersStorage();

    // Справочник сообщений к ИИ от юзера
    const aiStorage = new AIStorage();

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
        const filter = "c.us";

        const blackList: string[] = ["79999183175@c.us", "34614478119@c.us"];
        if (blackList.includes(msg.from)) {
            return;
        }
        let userId = msg.from;
        if (Object.values(ServiceMap).includes(userId)) {
            return;
        } // hide messages from other bots
        if (!userId.endsWith(filter)) {
            return;
        }

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
            aiStorage: aiStorage,
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
            configName: ServiceMap[botId],
        };
        const handler = await router(ctx, userList, aiStorage, adminAuth);
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
            const delay = Math.min(
                baseDelay * Math.pow(2, reconnectAttempts),
                30000,
            ); // Макс 30 сек
            reconnectAttempts++;

            console.log(
                `Попытка переподключения ${reconnectAttempts} через ${delay}мс...`,
            );
            await new Promise((resolve) => setTimeout(resolve, delay));

            client.initialize(); // Перезапуск
        } else {
            console.error(
                `Бот ${botId}: достигнут лимит попыток переподключения`,
            );
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
process.on("SIGINT", async () => {
    console.log("\nЗавершение работы...");
    for (const bot of bots) {
        (await bot)
            .destroy()
            .then((r) =>
                console.log(
                    `Бот ${bot} завершен, response: ${r === undefined ? "ok" : r}`,
                ),
            );
    }
    process.exit();
});
