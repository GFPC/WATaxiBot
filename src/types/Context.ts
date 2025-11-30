import {Chat, Client, Message} from "whatsapp-web.js";
import {Storage} from "../storage/storage";
import {AuthData} from "../api/general";
import {Logger} from "winston";
import {Constants, GFPTaxiBotConstants} from "../api/constants";
import {UsersStorage} from "../storage/usersStorage";
import {AIStorage} from "../storage/AIStorage";
import {UserSettings} from "./User/UserSettings";

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
    gfp_constants: GFPTaxiBotConstants;
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