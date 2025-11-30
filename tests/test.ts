import * as fs from "fs";
import * as readline from "readline";
import * as winston from "winston";
import axios, { AxiosError } from "axios";

// Storage imports
import { MemoryStorage } from "../src/storage/mem";
import { UsersStorage } from "../src/storage/usersStorage";
import { AIStorage } from "../src/storage/AIStorage";

// Handler imports
import { RegisterHandler } from "../src/handlers/register";
import { HelpHandler } from "../src/handlers/help";
import { AIHandler } from "../src/handlers/ai";
import { RideHandler } from "../src/handlers/ride";
import { VotingHandler } from "../src/handlers/voting";
import { SettingsHandler } from "../src/handlers/settings";
import { OrderHandler } from "../src/handlers/order";
import { ChildrenProfileHandler } from "../src/handlers/childrenProfile";
import { DefaultHandler } from "../src/handlers/default";

// Type imports
import {Context} from "../src/types/Context";
import { Handler } from "../src";
import { AuthData, baseURL, postHeaders} from "../src/api/general";
import { StateMachine } from "../src/states/types";
import { localizationNames } from "../src/l10n";
import {getPerformersList} from "../src/utils/specific/truck/truckDriverWatcher";

// Interfaces
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

interface TestContext extends Context {
    _meta?: any;
    _savedAt?: string;
    _note?: string;
}

interface TestMessage {
    body: string;
    from: string;
    timestamp: Date;
}

interface TestChat {
    id: { _serialized: string };
    sendMessage: (message: string, options?: any) => Promise<{ id: string; body: string, edit: (message: string) => Promise<void> }>;
}

// Mock WhatsApp Client
export class WhatsAppMockClient {
    private messages: any[] = [];
    private eventListeners: { [event: string]: Function[] } = {};
    private chats: Map<string, TestChat> = new Map();


    constructor() {
        this.chats.set('79135550015', createChatMock());
    }

    async sendMessage(chatId: string, content: string) {
        const message = {
            id: Math.random().toString(36),
            body: content,
            timestamp: new Date(),
            from: 'bot',
            to: chatId
        };
        this.messages.push(message);
        console.log(`🤖 BOT -> USER: ${content}`);
        return message;
    }

    simulateUserMessage(body: string, from: string = 'user') {
        const message = {
            id: Math.random().toString(36),
            body,
            timestamp: new Date(),
            from,
            to: 'bot'
        };

        if (this.eventListeners['message']) {
            this.eventListeners['message'].forEach(callback => callback(message));
        }
    }

    on(event: string, callback: Function) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }

    getMessages() {
        return this.messages;
    }

    clearMessages() {
        this.messages = [];
    }

    async getChatById(chatId: string): Promise<TestChat> {
        if (!this.chats.has(chatId)) {
            this.chats.set(chatId, createChatMock());
        }
        return this.chats.get(chatId)!;
    }

}

// Context Management
export function loadTestContext(filePath: string): TestContext {
    const savedData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

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

    const testContext: TestContext = {
        ...savedData,
        client: new WhatsAppMockClient(),
        storage: new MemoryStorage(),
        logger,
        chat: {} as any
    };

    // Clean up meta fields
    delete testContext._meta;
    delete testContext._savedAt;
    delete testContext._note;
    return testContext;
}

async function createWorkingConstants(savedConstants: any, baseURL: string): Promise<any> {
    const res = await axios.get(`${baseURL}/data`)
    console.log(Object.keys(res.data.data))
    return {
        data: res.data.data,
        localization_prefix: savedConstants.localization_prefix || "wab_",

        getPrompt: (name: string, lang_id: string = res.data.data?.default_lang || "1"): string => {
            if (!res.data.data?.data?.lang_vls?.[name]) {
                return `@@@Lang value not found@@@${name}`;
            }

            const langValues = res.data.data?.data?.lang_vls?.[name];
            if (!langValues || !lang_id) {
                return `@@@Lang value not found@@@${name}`;
            }

            return langValues[lang_id] || `@@@Lang value not found@@@${name}`;
        },

        get getForDriverAndCar() {
            return {
                car_colors: this.data.data.car_colors,
                car_models: this.data.data.car_models,
            };
        },
    };
}

// Router Function
async function router(
    ctx: Context,
    userList: UsersStorage,
    aiStorage: AIStorage,
    adminAuth: AuthData,
): Promise<Handler> {
    try {
        const user = await userList.pull(ctx.userID);
        const stateForLog = await ctx.storage.pull(ctx.userID);

        logStateInfo(stateForLog);

        if (user?.api_u_id === "-1" || !user || user?.reloadFromApi) {
            const userData = await fetchUserData(ctx, adminAuth);
            if (!userData) {
                return RegisterHandler;
            }
            await userList.push(ctx.userID, userData);
            ctx.api_u_id = Object.keys(userData)[0];
        }

        ctx.user = await userList.pull(ctx.userID);
        const state: StateMachine | null = await ctx.storage.pull(ctx.userID);

        if (shouldUseHelpHandler(ctx.message.body, state)) {
            return HelpHandler;
        } else if (shouldUseAIHandler(ctx.message.body, state)) {
            return AIHandler;
        }

        return getHandlerForState(state);
    } catch (error) {
        ctx.logger.error(`Router error: ${error}`);
        return DefaultHandler;
    }
}

// Helper Functions
function logStateInfo(stateForLog: any): void {
    if (!stateForLog) {
        console.log("[ main ] <on-message> state: unknown");
        return;
    }

    const orange = "\x1b[38;5;208m";
    const reset = "\x1b[0m";

    if (stateForLog.id && stateForLog.state) {
        console.log(
            `[ main ] <on-message> state: ${orange}${stateForLog.id}${reset}->${stateForLog.state}`
        );
    } else if (stateForLog.id) {
        console.log(
            `[ main ] <on-message> state: ${orange}${stateForLog.id}${reset}`
        );
    } else {
        console.log("[ main ] <on-message> state: unknown");
    }
}

function shouldUseHelpHandler(messageBody: string, state: StateMachine | null): boolean {
    return messageBody === "9" &&
        state?.id === "order" &&
        (state?.state === "collectionFrom" || state?.state === "collectionTo");
}

function shouldUseAIHandler(messageBody: string, state: StateMachine | null): boolean {
    return (messageBody === "9" && state?.id === "order") ||
        state?.state === "aiQuestion" ||
        state?.state === "aiAnswer";
}

function getHandlerForState(state: StateMachine | null): Handler {
    const handlerMap: Record<string, Handler> = {
        ride: RideHandler,
        voting: VotingHandler,
        settings: SettingsHandler,
        order: OrderHandler,
        register: RegisterHandler,
        childrenProfile: ChildrenProfileHandler,
    };

    return handlerMap[state?.id ?? ""] ?? DefaultHandler;
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
            return null;
        }

        const userSection = userData.data.data.user[Object.keys(userData.data.data.user)[0]];
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
            ctx.logger.error(`Unexpected error while fetching user data: ${error}`);
        }
        return null;
    }
}

function createChatMock(): TestChat {
    return {
        id: { _serialized: 'test-chat-id' },
        sendMessage: async (message: string, options?: any) => {
            console.log(`🤖 Bot response: ${message}`);

            if (options) {
                const optionDetails = [];
                if (options.linkPreview !== undefined) {
                    optionDetails.push(`linkPreview: ${options.linkPreview}`);
                }
                if (options.mentions) {
                    optionDetails.push(`mentions: ${options.mentions.length}`);
                }

                if (optionDetails.length > 0) {
                    console.log(`   📋 ${optionDetails.join(', ')}`);
                }
            }

            return { id: 'mock-msg-id', body: message, edit: async (message: string) => { console.log(`🤖 Bot edit: ${message}`); } };
        }
    };
}

function createMessageMock(body: string): any {
    return {
        body,
        from: '79135550015',
        timestamp: new Date(),
        // Добавляем минимально необходимые поля для Message
        ack: 0,
        deviceType: 'android',
        broadcast: false,
        isStatus: false,
        isGif: false,
        hasMedia: false,
        hasQuotedMsg: false,
        location: undefined,
        vCards: [],
        mentionedIds: [],
        links: [],
        // Добавляем методы которые могут использоваться
        getChat: async () => createChatMock(),
        reply: async (message: string) => {
            console.log(`🤖 Bot reply: ${message}`);
            return { id: 'mock-reply-id' };
        },
        edit: async (message: string) => {
            console.log(`🤖 Bot edit: ${message}`);
            return { id: 'mock-edit-id' };
        }
    };
}

// Main Loop
async function initializeTestContext(): Promise<{ ctx: TestContext; usersList: UsersStorage }> {
    const ctx = loadTestContext('./tests/data/ctx.json');

    const usersList = new UsersStorage();
    await usersList.push("79135550015", {
        api_u_id: '837',
        settings: { lang: { iso: 'ru', api_id: '1', native: 'Русский' } },
        referrer_u_id: '666',
        u_details: null,
        ref_code: 'uid837'
    });

    // Configure context
    ctx.botID = '79999183175'
    ctx.userID = '79135550015';
    ctx.configName = 'truck';
    ctx.baseURL = 'https://ibronevik.ru/taxi/c/truck/api/v1/';
    ctx.usersList = usersList;
    ctx.auth = {
        token: 'e6c2c1f2907d51061e1abf362d6d9ff2',
        hash: 'nORNR3TP1zlsu0cbg/St/gnB3Eu7rAQfJNWq8Cc7xly3GRzvqK3Jf2QInX+eqRqSH3Lk1QViINC0mwqiAq4+NOPoPbC60WwjPzd/K2CeDJrVtwtiRjzxYu6hgNuwnhnF'
    } as AuthData;

    // Setup constants
    ctx.constants = await createWorkingConstants(JSON.parse(JSON.stringify(ctx.constants)), ctx.baseURL);
    ctx.gfp_constants = {
        data: {
            defaultLangID: "2",
            defaultCurrency: "GHS",
            maxDefaultDriveWaiting: 3600,
            maxVotingDriveWaiting: 1800,
            searchDriversPeriodShort: 30,
            searchDriversPeriodLong: 300,
            maxPeoplesCount: 5
        }
    }
    // Setup test user




    return { ctx, usersList };
}

async function botTestingLoop() {
    const { ctx, usersList } = await initializeTestContext();
    const aiStorage = new AIStorage();
    const adminAuth = { token: '', hash: '' } as AuthData;

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const question = (prompt: string): Promise<string> => {
        return new Promise((resolve) => rl.question(prompt, resolve));
    };

    console.log('🚀 Bot Testing Environment Started');
    console.log('💡 Type "exit" to quit\n');

    try {
        while (true) {
            const userInput = await question('👤 You: ');

            if (userInput.toLowerCase() === 'exit') {
                console.log('👋 Goodbye!');
                break;
            }

            await processUserMessage(ctx, usersList, aiStorage, adminAuth, userInput);
        }
    } finally {
        rl.close();
    }
}

async function processUserMessage(
    ctx: TestContext,
    usersList: UsersStorage,
    aiStorage: AIStorage,
    adminAuth: AuthData,
    userInput: string
): Promise<void> {
    const message = createMessageMock(userInput);
    const chat = createChatMock();

    const currentCtx: TestContext = {
        ...ctx,
        message: message as any, // Приводим к нужному типу
        chat: chat as any
    };

    console.log('🔄 Processing message...\n');

    try {
        const handler = await router(currentCtx as Context, usersList, aiStorage, adminAuth);
        console.log(`🤖 Selected handler: ${handler.name}`);
        await handler(currentCtx as Context);
        console.log('✅ Processing completed\n');
    } catch (error) {
        console.error('❌ Error during processing:', error);
        console.log(''); // Empty line for better readability
    }
}

// Start the application
if (require.main === module) {
    botTestingLoop().catch(console.error);
}