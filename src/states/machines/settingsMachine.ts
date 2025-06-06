import { StateMachine } from "../types";

export interface SettingsMachine extends StateMachine {
    id: "settings";
    state:
        | "settings"
        | "changeLanguage"
        | "changeReferralCode"
        | "collectionLegalInformation"
        | "deleteAccount";
    data: {
        docs?: {
            legalInformationExpanded?: boolean;
            legalInformationMessage?: string;
        };
    };
}

export function newSettings(): SettingsMachine {
    return {
        id: "settings",
        state: "settings",
        data: {
            docs: {
                legalInformationExpanded: false,
            },
        },
    };
}
