import axios from "axios";
import { createForm } from "../api/general";

export class ConfigManager {
    configsMap: {
        [key: string]: { login: string; password: string; type: string };
    };
    urlManager: { [key: string]: string } = {};
    constructor(
        configsMap: {
            [key: string]: { login: string; password: string; type: string };
        },
        urlManager: { [key: string]: string },
    ) {
        this.configsMap = configsMap;
        this.urlManager = urlManager;
    }
    async auth(config: string, botID: string) {
        const configData = this.configsMap[config];
        const url = this.urlManager[botID];
        console.log("URL: " + url, this.urlManager);
        console.log({
            login: configData.login,
            password: configData.password,
            type: configData.type,
        });
        const tokenForm = new FormData();
        tokenForm.append("login", configData.login);
        tokenForm.append("password", configData.password);
        tokenForm.append("type", configData.type);

        const tokenRes = await axios.post(url + "/auth", tokenForm);
        console.log(tokenRes.data);
        const adminAuthForm = new FormData();

        adminAuthForm.append("auth_hash", tokenRes.data.auth_hash);
        const adminAuth = await axios.post(url + "/token", adminAuthForm);
        console.log(adminAuth.data.data);
        return {
            token: adminAuth.data.data.token,
            hash: adminAuth.data.data.u_hash,
        };
    }
}
