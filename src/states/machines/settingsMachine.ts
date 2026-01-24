import { StateMachine } from "../types";
import {Message} from "whatsapp-web.js";

export interface SettingsMachine extends StateMachine {
    id: "settings";
    state:
        | "settings"
        | "changeLanguage"
        | "changeReferralCode"
        | "collectionPublicOffers"
        | "collectionPrivacyPolicy"
        | "collectionLegalInformation"
        | "deleteAccount"
        | "children_collectionFullNameAndBirthYear"
        | "children_collectionPhone"
        | "children_collectionCity";
    data: {
        docs: {
            publicOffersMessage: Message | null;
            privacyPolicyMessage: Message | null;
            legalInformationMessage: Message | null;

            publicOffersExpanded: boolean;
            privacyPolicyExpanded: boolean;
            legalInformationExpanded: boolean;
        };
    };
}

export function newSettings(): SettingsMachine {
    return {
        id: "settings",
        state: "settings",
        data: {
            docs: {
                publicOffersMessage: null,
                privacyPolicyMessage: null,
                legalInformationMessage: null,

                publicOffersExpanded: false,
                privacyPolicyExpanded: false,
                legalInformationExpanded: false,
            },
        },
    };
}
