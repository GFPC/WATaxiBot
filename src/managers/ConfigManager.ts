import axios, { AxiosResponse } from "axios";
import { AuthData } from "../api/general";

/** Логгер для API */
const logApi = (msg: string, ...args: any[]) =>
    console.log("\x1b[35m[ api ]\x1b[0m", msg, ...args);

interface AuthApiResponse {
    status: string;
    auth_hash?: string;
    data?: { token: string; u_hash: string };
}

type Config = { login: string; password: string; type: string };

/** Формирует FormData для авторизации */
function makeAuthForm({ login, password, type }: Config) {
    const form = new FormData();
    form.append("login", login);
    form.append("password", password);
    form.append("type", type);
    return form;
}

/** Менеджер конфигов и авторизации для ботов */
export class ConfigManager {
    constructor(
        public configsMap: Record<string, Config>,
        public urlManager: Record<string, string>,
    ) {}

    /**
     * Авторизация для конкретного бота
     * @param config ключ конфига
     * @param botID id бота
     * @returns AuthData с токеном и хэшем (пустые строки при ошибке)
     */
    async auth(config: string, botID: string): Promise<AuthData> {
        const configData = this.configsMap[config];
        const url = this.urlManager[botID];
        logApi("🔑 Trying to auth config:", config, configData);

        try {
            const tokenRes: AxiosResponse<AuthApiResponse> = await axios.post(
                url + "/auth",
                makeAuthForm(configData),
            );
            if (
                tokenRes.data.status !== "success" ||
                !tokenRes.data.auth_hash
            ) {
                logApi("❌ Failed to get token config:", config, configData);
                return { token: "", hash: "" };
            }

            const adminAuthForm = new FormData();
            adminAuthForm.append("auth_hash", tokenRes.data.auth_hash);

            const adminAuth: AxiosResponse<AuthApiResponse> = await axios.post(
                url + "/token",
                adminAuthForm,
            );
            if (adminAuth.data.status === "success" && adminAuth.data.data) {
                logApi("✅ Succesfuly auth config:", config, configData);
                const { token, u_hash: hash } = adminAuth.data.data;
                return { token, hash };
            }

            logApi("❌ Failed to auth config:", config, configData);
            return { token: "", hash: "" };
        } catch (error: any) {
            logApi(
                "❌ Exception during auth:",
                error?.message?.slice(0, 80) ?? String(error).slice(0, 80),
            );
            return { token: "", hash: "" };
        }
    }
}
