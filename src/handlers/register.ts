import { Context } from "../types/Context";
import {
    createEmptyRegistration,
    RegistrationMachine,
} from "../states/machines/registerMachine";
import { localizationNames } from "../l10n";
import {changeLang, editUser, register} from "../api/user";
import { formatString } from "../utils/formatter";
import {findSuggestionsInList} from "../utils/findSuggestion";
import {getLocalizationText} from "../utils/textUtils";
import {pickMaxVersion} from "../types/api/LegalDoc";
import {newEmptyOrder} from "../states/machines/orderMachine";

type LanguageCodeData = {
    id: string;
    native: string;
    api_id: string;
    iso: string;
};
type LanguageCodeListData = LanguageCodeData[];
const languages: LanguageCodeListData = [
    {
        id: "1",
        native: "Русский",
        api_id: "1",
        iso: "ru"
    },
    {
        id: "2",
        native: "English",
        api_id: "2",
        iso: "en"
    },
    {
        id: "3",
        native: "español",
        api_id: "3",
        iso: "es"
    },
    {
        id: "4",
        native: "Français",
        api_id: "4",
        iso: "fr"
    },
    {
        id: "5",
        native: "الدارجة المغربية",
        api_id: "24",
        iso: "ary-Arab"
    },
    {
        id: "6",
        native: "Darija Maġribiya",
        api_id: "25",
        iso: "ary-Latn"
    },
    {
        id: "7",
        native: "ⵜⴰⵎⴰⵣⵉⵖⵜ",
        api_id: "26",
        iso: "zgh-Tfng"
    },
    {
        id: "8",
        native: "Tamazight",
        api_id: "27",
        iso: "zgh-Latn"
    },
    {
        id: "9",
        native: "العربية",
        api_id: "28",
        iso: "ar-Arab"
    }
];
const ChildrenConfigLanguages: LanguageCodeListData = [
    {
        id: "8",
        native: "Русский",
        api_id: "1",
        iso: "ru",
    },
    {
        id: "1",
        native: "English",
        api_id: "2",
        iso: "en",
    },
    {
        id: "2",
        native: "Español",
        api_id: "3",
        iso: "es",
    },
    {
        id: "5",
        native: "Français",
        api_id: "4",
        iso: "fr",
    },
    {
        id: "3",
        native: "Italiano",
        api_id: "5",
        iso: "it",
    },
    {
        id: "4",
        native: "Deutsch",
        api_id: "6",
        iso: "de",
    },
    {
        id: "6",
        native: "Norway",
        api_id: "7",
        iso: "no",
    },
    {
        id: "7",
        native: "Denmark",
        api_id: "8",
        iso: "dk",
    },
    {
        id: "9",
        native: "Sweden",
        api_id: "9",
        iso: "se",
    },
    {
        id: "10",
        native: "Finland",
        api_id: "10",
        iso: "fi",
    },
];

export async function RegisterHandler(ctx: Context) {
    /* Обработчик регистрации пользователя */
    let state: RegistrationMachine | null = await ctx.storage.pull(ctx.userID);
    ctx.logger.info(
        `RegisterHandler: User ${ctx.userID} state: ${JSON.stringify(state)}`,
    );

    switch (state?.state) {
        case "collectionRefCode":
            // Получаем реферальный код и зарегистрируем пользователя
            state.data.refCode = ctx.message.body;
            console.log("TEST POINT: ", state.data);
            try {
                await register(
                    {
                        whatsappId: ctx.userID,
                        name: state.data.fullName,
                        phone: ctx.userID.split("@")[0],
                        lang: state.data.lang.api_id,
                        refCode:
                            state.data.refCode !== "0"
                                ? state.data.refCode
                                : undefined,
                        u_details: {
                            refCodeBackup: "",
                        },
                    },
                    ctx.auth,
                    ctx.baseURL,
                );
            } catch (e: any) {
                if (String(e).includes("wrong ref_code")) {
                    await ctx.chat.sendMessage(
                        ctx.constants.getPrompt(
                            localizationNames.refCodeInvalid,
                            state.data.lang.api_id,
                        ),
                    );
                    break;
                }
                ctx.logger.error(
                    `RegisterHandler: Error during user registration: ${e}`,
                );
                await ctx.chat.sendMessage(
                    formatString(
                        ctx.constants.getPrompt(
                            localizationNames.registrationError,
                            state.data.lang.api_id,
                        ),
                        {
                            "%error%": String(e),
                        },
                    ),
                );
                return;
            }

            ctx.logger.info(
                `RegisterHandler: New user ${ctx.userID} registered`,
            );

            await ctx.storage.delete(ctx.userID);
            await ctx.storage.delete(`reg:${ctx.userID}`);
            await ctx.chat.sendMessage(
                ctx.constants.getPrompt(
                    localizationNames.registrationSuccessful,
                    state.data.lang.api_id,
                ),
            );
            break;
        case "collectionFullName":
            if(ctx.configName === "children"){
                const body = ctx.message.body.split(" ");
                if(body.length != 3){
                    await ctx.chat.sendMessage(
                        ctx.constants.getPrompt(
                            localizationNames.enterFirstNameLastNameAndBirthYearError,
                            state.data.lang.api_id,
                        )
                    );
                    break;
                }
                if (!body[2].trim().match(/^[0-9]{4}$/)) {  // age not specified in 4 digits
                    await ctx.chat.sendMessage(
                        ctx.constants.getPrompt(
                            localizationNames.enterFirstNameLastNameAndBirthYearError,
                            state.data.lang.api_id,
                        )
                    );
                    break;
                }
                if( new Date().getFullYear() - Number(body[2].trim()) < 18 ) {
                    await ctx.chat.sendMessage(
                        ctx.constants.getPrompt(
                            localizationNames.enterFirstNameLastNameAndBirthYearError,
                            state.data.lang.api_id,
                        )
                    )
                    return
                }

                state.data.fullName = `${body[0]} ${body[1]}`;
                state.data.birthYear = body[2].trim();
                console.log("TEST POINT: ", state.data);
                state.state = "children_collectionPhone";
                await ctx.storage.push(ctx.userID, state);
                await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(
                        localizationNames.enterPhoneNumber,
                        state.data.lang.api_id,
                    )
                );
                break;
            }
            // Получаем ФИО пользователя
            state.data.fullName = ctx.message.body;
            state.state = "collectionRefCode";
            await ctx.storage.push(ctx.userID, state);

            await ctx.chat.sendMessage(
                ctx.constants.getPrompt(
                    localizationNames.sendRefCode,
                    state.data.lang.api_id,
                ),
            );
            break;

        case "collectionLegalInformation":
            if (ctx.message.body === "1") {
                state.state = "collectionFullName";
                await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(
                        localizationNames.sendFullName,
                        state.data.lang.api_id,
                    ),
                );
                await ctx.storage.push(ctx.userID, state);
                break;
            } else if (ctx.message.body === "3") {
                state.data.docs.legalInformationExpanded =
                    !state.data.docs.legalInformationExpanded;
                await new Promise((f) =>
                    setTimeout(
                        f,
                        state?.data.docs.legalInformationExpanded ? 3000 : 1000,
                    ),
                );

                await state.data.docs.legalInformationMessage?.edit(
                    ctx.constants
                        .getPrompt(
                            localizationNames.legal_information,
                            state.data.lang.api_id,
                        )
                        .replace(
                            "%doc%",
                            state.data.docs.legalInformationExpanded
                                ? ctx.constants.getPrompt(
                                    localizationNames.legal_information_big,
                                    state.data.lang.api_id,
                                )
                                : "",
                        )
                        .replace(
                            "%action%",
                            ctx.constants.getPrompt(
                                state.data.docs.legalInformationExpanded
                                    ? localizationNames.collapse_doc
                                    : localizationNames.expand_doc,
                                state.data.lang.api_id,
                            ),
                        )
                        .replace(
                            "%accept%",
                            ctx.constants.getPrompt(
                                localizationNames.next_step,
                                state.data.lang.api_id,
                            ),
                        ),
                );

                await ctx.storage.push(ctx.userID, state);
                break;
            } else {
                await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(
                        localizationNames.commandNotFound,
                        state.data.lang.api_id,
                    ),
                );
            }
            break;

        case "collectionPrivacyPolicy":
            if (ctx.message.body === "1") {
                if (!state.data.docs.privacyPolicyAcceptAvailable) {
                    await ctx.chat.sendMessage(
                        ctx.constants.getPrompt(
                            localizationNames.commandNotFound,
                            state.data.lang.api_id,
                        ),
                    );
                    break;
                }
                state.state = "collectionLegalInformation";
                state.data.docs.legalInformationMessage =
                    await ctx.chat.sendMessage(
                        ctx.constants
                            .getPrompt(
                                localizationNames.legal_information,
                                state.data.lang.api_id,
                            )
                            .replace("%doc%", "")
                            .replace(
                                "%action%",
                                ctx.constants.getPrompt(
                                    localizationNames.expand_doc,
                                    state.data.lang.api_id,
                                ),
                            )
                            .replace(
                                "%accept%",
                                ctx.constants.getPrompt(
                                    localizationNames.next_step,
                                    state.data.lang.api_id,
                                ),
                            ),
                    );
                await ctx.storage.push(ctx.userID, state);
                break;
            } else if (ctx.message.body === "2") {
                await ctx.chat.sendMessage(
                    ctx.constants
                        .getPrompt(
                            localizationNames.reject_terms,
                            state.data.lang.api_id,
                        )
                        .replace(
                            "%command%",
                            state.data.docs.privacyPolicyExpanded ? "1" : "3",
                        ),
                );
            } else if (ctx.message.body === "3") {
                if (!state.data.docs.privacyPolicyExpanded) {
                    state.data.docs.privacyPolicyAcceptAvailable = true;
                }
                state.data.docs.privacyPolicyExpanded =
                    !state.data.docs.privacyPolicyExpanded;
                await new Promise((f) =>
                    setTimeout(
                        f,
                        state?.data.docs.privacyPolicyExpanded ? 3000 : 1000,
                    ),
                );

                await state.data.docs.privacyPolicyMessage?.edit(
                    ctx.constants
                        .getPrompt(
                            localizationNames.privacy_policy,
                            state.data.lang.api_id,
                        )
                        .replace(
                            "%doc%",
                            state.data.docs.privacyPolicyExpanded
                                ? ctx.constants.getPrompt(
                                    localizationNames.privacy_policy_big,
                                    state.data.lang.api_id,
                                )
                                : "",
                        )
                        .replace(
                            "%action%",
                            ctx.constants.getPrompt(
                                state.data.docs.privacyPolicyExpanded
                                    ? localizationNames.collapse_doc
                                    : localizationNames.expand_doc,
                                state.data.lang.api_id,
                            ),
                        )
                        .replace(
                            "%accept%",
                            state.data.docs.privacyPolicyAcceptAvailable
                                ? ctx.constants.getPrompt(
                                    localizationNames.accept_doc,
                                    state.data.lang.api_id,
                                )
                                : "",
                        ),
                );

                await ctx.storage.push(ctx.userID, state);
                break;
            } else {
                await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(
                        localizationNames.commandNotFound,
                        state.data.lang.api_id,
                    ),
                );
            }
            break;

        case "collectionPublicOffers":
            if (ctx.message.body === "1") {
                if (!state.data.docs.publicOffersAcceptAvailable) {
                    await ctx.chat.sendMessage(
                        ctx.constants.getPrompt(
                            localizationNames.commandNotFound,
                            state.data.lang.api_id,
                        ),
                    );
                    break;
                }

                state.state = "collectionPrivacyPolicy";
                state.data.docs.privacyPolicyMessage =
                    await ctx.chat.sendMessage(
                        ctx.constants
                            .getPrompt(
                                localizationNames.privacy_policy,
                                state.data.lang.api_id,
                            )
                            .replace("%doc%", "")
                            .replace(
                                "%action%",
                                ctx.constants.getPrompt(
                                    localizationNames.expand_doc,
                                    state.data.lang.api_id,
                                ),
                            )
                            .replace("%accept%", ""),
                    );
                await ctx.storage.push(ctx.userID, state);
                break;
            } else if (ctx.message.body === "2") {
                await ctx.chat.sendMessage(
                    ctx.constants
                        .getPrompt(
                            localizationNames.reject_terms,
                            state.data.lang.api_id,
                        )
                        .replace(
                            "%command%",
                            state.data.docs.publicOffersExpanded ? "1" : "3",
                        ),
                );
            } else if (ctx.message.body === "3") {
                if (!state.data.docs.publicOffersExpanded) {
                    state.data.docs.publicOffersAcceptAvailable = true;
                }
                state.data.docs.publicOffersExpanded =
                    !state.data.docs.publicOffersExpanded;
                await new Promise((f) =>
                    setTimeout(
                        f,
                        state?.data.docs.publicOffersExpanded ? 3000 : 1000,
                    ),
                );

                await state.data.docs.publicOffersMessage?.edit(
                    ctx.constants
                        .getPrompt(
                            localizationNames.public_offers,
                            state.data.lang.api_id,
                        )
                        .replace(
                            "%doc%",
                            state.data.docs.publicOffersExpanded
                                ? ctx.constants.getPrompt(
                                    localizationNames.public_offers_big,
                                    state.data.lang.api_id,
                                )
                                : "",
                        )
                        .replace(
                            "%action%",
                            ctx.constants.getPrompt(
                                state.data.docs.publicOffersExpanded
                                    ? localizationNames.collapse_doc
                                    : localizationNames.expand_doc,
                                state.data.lang.api_id,
                            ),
                        )
                        .replace(
                            "%accept%",
                            state.data.docs.publicOffersAcceptAvailable
                                ? ctx.constants.getPrompt(
                                    localizationNames.accept_doc,
                                    state.data.lang.api_id,
                                )
                                : "",
                        ),
                );

                await ctx.storage.push(ctx.userID, state);
                break;
            } else {
                await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(
                        localizationNames.commandNotFound,
                        state.data.lang.api_id,
                    ),
                );
            }
            break;


        case "children_docs_collectionLegalInformation":
            if (ctx.message.body === "1") {
                await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(localizationNames.enterFirstNameLastNameAndBirthYear, state.data.lang.api_id),
                )
                state.state = "collectionFullName"
                if(state.data.childrenDocs?.legal_information) {
                    state.data.childrenDocs.legal_information.accepted = (new Date()).toUTCString();
                }
                await ctx.storage.push(ctx.userID, state);
            } else {
                await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(localizationNames.commandNotFound,state.data.lang.api_id)
                );
            }
            break
        case "children_docs_collectionPrivacyPolicy":
            if (ctx.message.body === "1") {
                const botLegalDocs = JSON.parse(ctx.constants.data.data.site_constants.bot_legal_docs?.value || '{}')
                const legal_information_parts = pickMaxVersion(botLegalDocs.legal_information.content)
                for (const part of legal_information_parts.parts) {
                    await ctx.chat.sendMessage(part[state?.data.lang.api_id || "2"].replace('%action%',
                        ctx.constants.getPrompt(localizationNames.childrenDocsActionContinueRegistration,state?.data.lang.api_id)));
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
                state.state = "children_docs_collectionLegalInformation";
                if(state.data.childrenDocs?.privacy_policy) {
                    state.data.childrenDocs.privacy_policy.accepted = (new Date()).toUTCString();
                }
                await ctx.storage.push(ctx.userID, state);
                return
            } else if(ctx.message.body === "2") {
                await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(localizationNames.docsDeclinedCanNotUseRegistration,state.data.lang.api_id)
                );
            } else {
                await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(localizationNames.commandNotFound,state.data.lang.api_id)
                );
            }
            break
        case "children_docs_collectionPublicOffer":
            if (ctx.message.body === "1") {
                const botLegalDocs = JSON.parse(ctx.constants.data.data.site_constants.bot_legal_docs?.value || '{}')
                const privacy_policy_parts = pickMaxVersion(botLegalDocs.privacy_policy.content)
                for (const part of privacy_policy_parts.parts) {
                    await ctx.chat.sendMessage(part[state?.data.lang.api_id || "2"]);
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
                state.state = "children_docs_collectionPrivacyPolicy";
                if(state.data.childrenDocs?.public_offer) {
                    state.data.childrenDocs.public_offer.accepted = (new Date()).toUTCString();
                }
                await ctx.storage.push(ctx.userID, state);
                return
            }  else if(ctx.message.body === "2") {
                await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(localizationNames.docsDeclinedCanNotUseRegistration,state.data.lang.api_id)
                );
            } else {
                await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(localizationNames.commandNotFound,state.data.lang.api_id)
                );
            }
            break


        case "collectionLanguage":
            let langs_data = ctx.configName === "children" ? ChildrenConfigLanguages : languages;
            if (langs_data.map((item) => item.id).includes(ctx.message.body)) {
                const selectedLang = langs_data.find(
                    (item) => item.id == ctx.message.body,
                );
                if (ctx.message.body !== (ctx.configName==="children"?"8":"1") && ctx.configName !== "gruzvill") {
                    await ctx.chat.sendMessage(
                        ctx.constants.getPrompt(
                            localizationNames.commandNotFound,
                            ctx.gfp_constants.data.defaultLangID,
                        ),
                    );
                    break;
                }
                state.data.lang.iso = selectedLang?.iso ?? "en";
                state.data.lang.api_id = selectedLang?.api_id ?? "2";

                if(ctx.configName === "gruzvill") {
                    state.state = "collectionFullName";
                    await ctx.chat.sendMessage(
                        ctx.constants.getPrompt(
                            localizationNames.sendFullName,
                            state.data.lang.api_id,
                        ),
                    );
                }
                else if(ctx.configName === "children") {
                    // Возвращаем приветственные сообщения
                    await ctx.chat.sendMessage(
                        ctx.constants.getPrompt(
                            localizationNames.welcome,
                            ctx.constants.data.default_lang,
                        ),
                    );
                    state.state = "children_welcome"
                    await ctx.storage.push(ctx.userID, state);
                    return
                }
                else {
                    state.state = "collectionPublicOffers";
                    state.data.docs.publicOffersMessage =
                        await ctx.chat.sendMessage(
                            ctx.constants
                                .getPrompt(
                                    localizationNames.public_offers,
                                    state.data.lang.api_id,
                                )
                                .replace("%doc%", "")
                                .replace(
                                    "%action%",
                                    ctx.constants.getPrompt(
                                        localizationNames.expand_doc,
                                        state.data.lang.api_id,
                                    ),
                                )
                                .replace("%accept%", ""),
                        );
                }
                await ctx.storage.push(ctx.userID, state);
                break;
            } else {

                await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(
                        localizationNames.commandNotFound,
                        ctx.gfp_constants.data.defaultLangID,
                    ),
                );
            }

            break;

        case "previouslyDeleted":
            await ctx.chat.sendMessage(
                ctx.constants.getPrompt(
                    localizationNames.accountRecovery,
                    ctx.user.settings.lang.api_id,
                ),
            );
            state.state = "recoverAccount";
            await ctx.storage.push(ctx.userID, state);
            break;

        case "recoverAccount":
            if (ctx.message.body === "1") {
                await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(
                        localizationNames.defaultPrompt,
                        ctx.user.settings.lang.api_id,
                    ),
                );
                await ctx.storage.delete(ctx.userID);
            }
            break;

        case "children_collectionCity":
            let city = ctx.message.body.trim()
            state.data.city = city
            console.log("TEST POINT: ", state.data)

            if(state.data.previouslyDeleted === false || !state.data.previouslyDeleted) {
                try {
                    await register(
                        {
                            whatsappId: ctx.userID,
                            name: state.data.fullName,
                            phone: ctx.userID.split("@")[0],
                            lang: state.data.lang.api_id,
                            refCode:
                                state.data.refCode !== "0"
                                    ? state.data.refCode
                                    : undefined,
                            u_details: {
                                refCodeBackup: "",
                            },
                        },
                        ctx.auth,
                        ctx.baseURL,
                    );
                    console.log(`successfully registered ${ctx.userID}`)
                } catch (e: any) {
                    ctx.logger.error(
                        `RegisterHandler: Error during user registration: ${e}`,
                    );
                    await ctx.chat.sendMessage(
                        ctx.constants.getPrompt(
                            localizationNames.registrationError,
                            state.data.lang.api_id,
                        )
                    );
                    await ctx.storage.delete(ctx.userID);
                    return;
                }
            }

            const res = await editUser(
                ctx.userID.split("@")[0],
                {
                    u_details: [
                        ['=', ['docs', 'public_offer','version'], state.data.childrenDocs?.public_offer.version],
                        ['=', ['docs', 'privacy_policy','version'], state.data.childrenDocs?.privacy_policy.version],
                        ['=', ['docs', 'legal_information','version'], state.data.childrenDocs?.legal_information.version],
                        ['=', ['docs', 'public_offer','accepted'], state.data.childrenDocs?.public_offer.accepted],
                        ['=', ['docs', 'privacy_policy','accepted'], state.data.childrenDocs?.privacy_policy.accepted],
                        ['=', ['docs', 'legal_information','accepted'], state.data.childrenDocs?.legal_information.accepted],
                        ['=', ["birthYear"], state.data.birthYear],
                        ['=', ['phone'], state.data.phone],
                        ['=', ['cityString'], state.data.city],
                        ['=',['deleted'], '0']
                    ],
                    u_name: state.data.fullName,
                },
                ctx.auth,
                ctx.baseURL
            )
            ///const user = await ctx.usersList.pull(ctx.userID);
            ///user.reloadFromApi = true;
            ///await ctx.usersList.push(ctx.userID,user)
            if(res.status !== "success") {
                ctx.logger.info(
                    `RegisterHandler: Failed to edit user ${ctx.userID} msg: ${JSON.stringify(res.message)}`,
                )
                await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(
                            localizationNames.registrationError,
                            state.data.lang.api_id,
                        )
                );
                await ctx.storage.delete(ctx.userID);
                return;
            }
            await ctx.chat.sendMessage(
                ctx.constants.getPrompt(
                    localizationNames.registrationSuccessful,
                    state.data.lang.api_id,

                )
            )
            await ctx.storage.delete(ctx.userID);
            await ctx.storage.delete("reg:" + ctx.userID);
            break

        case "children_collectionPhone":
            state.data.phone = ctx.message.body.trim()
            await ctx.chat.sendMessage(
                ctx.constants.getPrompt(
                    localizationNames.enterCity,
                    state.data.lang.api_id,
                )
            )
            state.state = "children_collectionCity"
            await ctx.storage.push(ctx.userID, state);
            break

        case "children_welcome":
            if(ctx.message.body.trim() === "1") {
                const botLegalDocs = JSON.parse(ctx.constants.data.data.site_constants.bot_legal_docs?.value || '{}')

                const public_offer_parts = pickMaxVersion(botLegalDocs.public_offer.content)
                const privacy_policy_parts = pickMaxVersion(botLegalDocs.privacy_policy.content)
                const legal_information_parts = pickMaxVersion(botLegalDocs.legal_information.content)
                if(!state.data.childrenDocs) {
                    state.data.childrenDocs = {
                        public_offer: {
                            version: public_offer_parts.version.toString(),
                            accepted: ""
                        },
                        privacy_policy: {
                            version: privacy_policy_parts.version.toString(),
                            accepted: ""
                        },
                        legal_information: {
                            version: legal_information_parts.version.toString(),
                            accepted: ""
                        }
                    }
                }

                for (const part of public_offer_parts.parts) {
                    await ctx.chat.sendMessage(part[state?.data.lang.api_id || "2"]);
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
                state.state = "children_docs_collectionPublicOffer";
                await ctx.storage.push(ctx.userID, state);
            } else {
                await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(
                        localizationNames.commandNotFound,
                        ctx.constants.data.default_lang,
                    ),
                );
            }
            break

        default:
            // Создаём новое состояние
            state = await createEmptyRegistration(ctx);
            await ctx.storage.push(ctx.userID, state);

            await ctx.chat.sendMessage(
                ctx.constants.getPrompt(
                    localizationNames.selectLanguage,
                    ctx.gfp_constants.data.defaultLangID,
                ),
            );
            if(ctx.configName==="children"){
                if(ctx.user?.u_details?.deleted === "1") {
                    state.data.previouslyDeleted = true;
                }


                const text = "--------------------------------------------------\n" +
                    "  _*1*        English ............ 🇺🇸 (en)_ +\n" +
                    "  _*2*        Español ........... 🇪🇸 (es)_ +\n" +
                    "  _*3*        Italiano ............ 🇮🇹  (it)_  +\n" +
                    "  _*4*        Deutsch ........... 🇩🇪 (de)_ +\n" +
                    "  _*5*        Français ........... 🇫🇷  (fr)_ +\n" +
                    "  _*6*        Norsk ............... 🇳🇴 (nb)_ –\n" +
                    "  _*7*        Dansk ............... 🇩🇰 (da)_ –\n" +
                    "  _*8*        Русский ........... 🇷🇺 (ru)_  +\n" +
                    "  _*9*        Svenska ............ 🇸🇪 (sv)_ –\n" +
                    "_*10*        Suomi ............... 🇫🇮  (fi)_  –"
                await ctx.chat.sendMessage(text);
            } else {
                await ctx.chat.sendMessage(
                    languages
                        .map(
                            (item) =>
                                item.native +
                                "(" +
                                item.iso +
                                ")" +
                                " - *" +
                                item.id +
                                "*",
                        )
                        .join("\n"),
                );
            }
            state.state = "collectionLanguage";
            await ctx.storage.push(ctx.userID, state);
            break;
    }
}