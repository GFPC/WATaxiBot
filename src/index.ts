import WAWebJS, { Chat, Client, LocalAuth, Message } from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import { RegisterHandler } from "./handlers/register";
import dotenv from "dotenv";
import { Storage } from "./storage/storage";
import { AuthData, postHeaders } from "./api/general";
import { OrderHandler } from "./handlers/order";
import winston, { Logger } from "winston";
import { localizationNames } from "./l10n";
import { StateMachine } from "./states/types";
import { RideHandler } from "./handlers/ride";
import { MemoryStorage } from "./storage/mem";
import axios, { AxiosError } from "axios";
import { UsersStorage } from "./storage/usersStorage";
import { VotingHandler } from "./handlers/voting";
import {Constants, ConstantsStorage, GFPTaxiBotConstants} from "./api/constants";
import { SettingsHandler } from "./handlers/settings";
import { DefaultHandler } from "./handlers/default";
import { HelpHandler } from "./handlers/help";
import * as fs from "fs";
import { ConfigsMap, ServiceMap } from "./ServiceMap";
import { URLManager } from "./managers/URLManager";
import { ConfigManager } from "./managers/ConfigManager";
import { AIStorage } from "./storage/AIStorage";
import { AIHandler } from "./handlers/ai";
import { GFPWAQRClient } from "./GFPWaQRHubConfig";
import { createHash } from "crypto";
import { ChildrenProfileHandler } from "./handlers/childrenProfile";
import {Context} from "./types/Context";
import {UserSettings} from "./types/User/UserSettings";

const SESSION_DIR = "./sessions";
const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY = 1000; // 1 second
const MESSAGE_FILTER = "c.us";
const BLACKLIST = ["79999183175@c.us", "34614478119@c.us"];
const GFPWAQRHubURL = "http://188.225.44.153:8010/api";

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

const GFPWAQRClientInstance = new GFPWAQRClient(GFPWAQRHubURL);



interface UserData {
    api_u_id: string;
    settings: UserSettings;
    referrer_u_id: string | null;
    u_details: any | null;
    ref_code: string | null;
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
        const stateForLog = await ctx.storage.pull(ctx.userID);
        if (stateForLog && stateForLog.id && stateForLog.state) {
            const orange = "\x1b[38;5;208m";
            const reset = "\x1b[0m";
            console.log(
                `[ main ] <on-message> state: ${orange}${stateForLog.id}${reset}->${stateForLog.state}`,
            );
        } else if (stateForLog && stateForLog.id) {
            const orange = "\x1b[38;5;208m";
            const reset = "\x1b[0m";
            console.log(
                `[ main ] <on-message> state: ${orange}${stateForLog.id}${reset}`,
            );
        } else {
            console.log(`[ main ] <on-message> state: unknown`);
        }

        if (user?.api_u_id === "-1" || !user || user?.reloadFromApi) {
            const userData = await fetchUserData(ctx, adminAuth);
            console.log("USER DATA", userData);
            if (!userData) {
                return RegisterHandler;
            }
            console.log(userData)
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
            (ctx.message.body === "9" && state?.id === "order") ||
            state?.state === "aiQuestion" ||
            state?.state === "aiAnswer"
        ) {
            return AIHandler;
        }

        const handlerMap: Record<string, Handler> = {
            ride: RideHandler,
            voting: VotingHandler,
            settings: SettingsHandler,
            order: OrderHandler,
            register: RegisterHandler,
            childrenProfile: ChildrenProfileHandler,
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

        if (userData.data.status === "error") {
            console.error("Failed to fetch user data: ", userData.data, " Admin Creds: ", adminAuth);
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
function formatQRData(qr: any): string {
    // Если уже строка в base64
    if (typeof qr === "string" && !qr.startsWith("data:image")) {
        return qr;
    }

    // Если data URL
    if (typeof qr === "string" && qr.startsWith("data:image")) {
        return qr;
    }

    // Если Buffer или Uint8Array
    if (Buffer.isBuffer(qr) || qr instanceof Uint8Array) {
        return Buffer.from(qr).toString("base64");
    }

    // Если объект с данными
    if (typeof qr === "object" && qr !== null) {
        if (qr.data) {
            return Buffer.from(qr.data).toString("base64");
        }
        if (qr.base64) {
            return qr.base64;
        }
    }

    throw new Error("Unsupported QR format");
}
async function safeLogout(
    client: WAWebJS.Client,
    maxRetries = 3,
    delayMs = 1000,
) {
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            await client.logout();
            console.log("[ main ] Сессия успешно завершена и удалена.");
            return; // Успешный выход
        } catch (err: any) {
            lastError = err;

            if (err.message.includes("EBUSY")) {
                console.log(
                    `[ main ] Попытка ${attempt}/${maxRetries}: Не удалось удалить сессию (файл занят). Повтор через ${delayMs} мс...`,
                );
                await new Promise((resolve) => setTimeout(resolve, delayMs));
            } else {
                console.error("[ main ] Ошибка при выходе:", err.message);
                throw err; // Если ошибка не EBUSY, прерываем
            }
        }
    }

    // Если все попытки исчерпаны
    console.error(
        `[ main ] Не удалось удалить сессию после ${maxRetries} попыток. Последняя ошибка:`,
        lastError.message,
    );
    throw lastError;
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

    const botInfo = {
        id: "",
        name: "Taxi MultiConfig Bot config=" + ServiceMap[botId],
        description:
            "Config: " +
            ServiceMap[botId] +
            ",Phone: " +
            botId +
            ". Powered by GFP",
    };
    botInfo.id = createHash("md5")
        .update(botInfo.name + ServiceMap[botId] + botId)
        .digest("hex");

    let isRegisteredOnGFPWAQRHub = false;
    client.on("qr", async (qr) => {
        console.log(`[ main ] \nQR для Бота ${botId}:`);
        qrcode.generate(qr, { small: true });

        if (!isRegisteredOnGFPWAQRHub) {
            const response = await GFPWAQRClientInstance.checkRegistration(
                botInfo.id,
            )
            if (!response.success) {
                console.log(
                    "[ main ] ⚠️ Bot not registered on GFPWAQRHub, try to register",
                );
                const registerResponse =
                    await GFPWAQRClientInstance.registerBot(botInfo);
                if (registerResponse.success) {
                    console.log("[ main ] ✅ Bot registered on GFPWAQRHub");
                    isRegisteredOnGFPWAQRHub = true;
                }
            } else {
                console.log("[ main ] ✅ Bot already registered on GFPWAQRHub");
                const response = await GFPWAQRClientInstance.setAuthenticated(
                    botInfo.id,
                    false,
                );
                console.log("[ main ]", response);
            }
        } else {
            console.log("[ main ] ✅ Bot already registered on GFPWAQRHub");
            const response = await GFPWAQRClientInstance.setAuthenticated(
                botInfo.id,
                false,
            );
            console.log("[ main ]", response);
        }

        const qrCode = formatQRData(qr);
        const response = await GFPWAQRClientInstance.sendQRCode(
            botInfo.id,
            qrCode,
        );
        console.log("[ main ]", response);
    });
    client.on("authenticated", async () => {
        console.log(`[ main ] 🔑Бот ${botId} успешно аутентифицирован`);
        const response = await GFPWAQRClientInstance.setAuthenticated(
            botInfo.id,
            true,
        );
        console.log("[ main ]", response);
    });

    client.on("ready", () => {
        console.log(`[ main ] 🟢 Бот ${botId} готов к работе!`);
    });

    client.on("message", async (msg) => {
        console.log(`[ check ] Received message from ${msg.from}`);
        const blackList: string[] = ["79999183175@c.us", "34614478119@c.us", "212778382140@c.us"];
        if (blackList.includes(msg.from)) {
            return;
        }
        let userId = msg.from;
        //userId="3532523513515213465134513@c.us";
        if (Object.values(ServiceMap).includes(userId)) {
            return;
        } // hide messages from other bots
        if (!userId.endsWith("@c.us") && !userId.endsWith("@lid")) {
            return;
        }

        logger.info(`Received message from ${userId} messageType=${msg.type}`);

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
            gfp_constants: new GFPTaxiBotConstants(API_CONSTANTS[botId]),
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
        console.log(`[ main ] Бот ${botId} отключен (причина: ${reason})`);
        await GFPWAQRClientInstance.sendCustomNotification(
            botInfo.id,
            "🔴 Bot disconnected: Whatsapp status: " + reason,
            botInfo.name,
        );
        console.log("[ main ] poin1", reason === "LOGOUT");
        if (reason === "LOGOUT") {
            console.log("[ main ] tryng to logout safety");
            try {
                await safeLogout(client);
            } catch (err) {
                console.error("[ main ] Критическая ошибка при выходе:", err);
            }
            return;
        }
        if (reconnectAttempts < maxReconnectAttempts) {
            const delay = Math.min(
                baseDelay * Math.pow(2, reconnectAttempts),
                30000,
            ); // Макс 30 сек
            reconnectAttempts++;

            console.log(
                `[ main ] Попытка переподключения ${reconnectAttempts} через ${delay}мс...`,
            );
            await new Promise((resolve) => setTimeout(resolve, delay));

            await client.initialize(); // Перезапуск
        } else {
            console.error(
                `[ main ] Бот ${botId}: достигнут лимит попыток переподключения`,
            );
        }
    });
    client.on("auth_failure", async () => {
        await client.initialize();
    });
    client
        .initialize()
        .then((r) =>
            console.log(
                `[ main ] Бот ${botId} инициализирован, response: ${r === undefined ? "ok" : r}`,
            ),
        );
    return client;
}

// Startup MAP
// 1. Load constants
// 2. Start all bots

Object.keys(API_CONSTANTS).forEach(async (key) => {
    console.log(`[ main ] Загрузка констант для ${key}...`);
    await API_CONSTANTS[key].getData(urlManager[key]);
    console.log(`[ main ] Константы для ${key} загружены`);
});

// Создаем N ботов
const bots = Object.keys(ServiceMap).map((key) => {
    return createBot(key);
});

// Обработка завершения работы
process.on("SIGINT", async () => {
    console.log("[ main ] \nЗавершение работы...");
    for (const bot of bots) {
        (await bot)
            .destroy()
            .then((r) =>
                console.log(
                    `[ main ] Бот ${bot} завершен, response: ${r === undefined ? "ok" : r}`,
                ),
            );
    }
    process.exit();
});
