import { StateMachine } from "../types";
import { Context } from "../../types/Context";
import { Message } from "whatsapp-web.js";

export interface RegistrationMachine extends StateMachine {
    id: "register";
    state:
        | "collectionPublicOffers"
        | "collectionPrivacyPolicy"
        | "collectionLegalInformation"
        | "collectionFullName"
        | "collectionRefCode"
        | "collectionLanguage"
        | "previouslyDeleted"
        | "recoverAccount";
    data: {
        fullName: string;
        refCode?: string;
        lang: {
            api_id: string;
            iso: string;
        };
        docs: {
            publicOffersMessage: Message | null;
            privacyPolicyMessage: Message | null;
            legalInformationMessage: Message | null;

            publicOffersExpanded: boolean;
            privacyPolicyExpanded: boolean;
            legalInformationExpanded: boolean;

            publicOffersAcceptAvailable: boolean;
            privacyPolicyAcceptAvailable: boolean;
            legalInformationAcceptAvailable: boolean;
        };
    };
}

export async function createEmptyRegistration(
    ctx: Context,
): Promise<RegistrationMachine> {
    return {
        id: "register",
        state: "collectionPublicOffers",
        data: {
            fullName: "",
            lang: {
                api_id: ctx.constants.data.default_lang,
                iso: ctx.constants.data.data.langs[
                    ctx.constants.data.default_lang
                ].iso,
            },
            docs: {
                publicOffersMessage: null,
                privacyPolicyMessage: null,
                legalInformationMessage: null,

                publicOffersExpanded: false,
                privacyPolicyExpanded: false,
                legalInformationExpanded: false,

                publicOffersAcceptAvailable: false,
                privacyPolicyAcceptAvailable: false,
                legalInformationAcceptAvailable: false,
            },
        },
    };
}
