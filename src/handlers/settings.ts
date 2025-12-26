import { localizationNames } from "../l10n";
import { Context } from "../types/Context";
import { changeLang, changeReferralCode } from "../api/user";
import { UsersStorage } from "../storage/usersStorage";
import { REFCODES } from "../api/constants";
import axios from "axios";
import { baseURL, postHeaders } from "../api/general";
import searchRefCodeByREfID from "../utils/settings";
import { newSettings } from "../states/machines/settingsMachine";

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
async function sendSettingMenu(ctx: Context, user: any) {
    await ctx.chat.sendMessage(
        ctx.constants
            .getPrompt(
                localizationNames.settingsMenu,
                ctx.user.settings.lang.api_id,
            )
            .replace(
                "%language%",
                user.settings.lang.native +
                "(" +
                user.settings.lang.iso +
                ")",
            )
            .replace(
                "%refCode%",
                searchRefCodeByREfID(user.referrer_u_id, ctx) ??
                "---",
            )
            .replace("%selfRefCode%", user.ref_code ?? "---")
            .replace(
                "%prevRefCodeHint%",
                user.referrer_u_id === "666"
                    ? ctx.constants
                    .getPrompt(
                        localizationNames.settingsPreviousReferralCode,
                        ctx.user.settings.lang.api_id,
                    )
                    .replace(
                        "%code%",
                        user.u_details?.refCodeBackup,
                    ) + "\n"
                    : "",
            )
            .replace(
                "%testModeHint%",
                user.referrer_u_id === "666"
                    ? ctx.constants.getPrompt(
                        localizationNames.settingsTestModeActive,
                        ctx.user.settings.lang.api_id,
                    )
                    : ctx.constants.getPrompt(
                        localizationNames.settingsTestModeHint,
                        ctx.user.settings.lang.api_id,
                    ),
            ),
    );
}

export async function SettingsHandler(ctx: Context): Promise<void> {
    const state = await ctx.storage.pull(ctx.userID);

    if (
        (ctx.message.body ===
            ctx.constants.getPrompt(
                localizationNames.cancelDigital,
                ctx.user.settings.lang.api_id,
            ) ||
            ctx.message.body ===
                ctx.constants.getPrompt(
                    localizationNames.cancelLower,
                    ctx.user.settings.lang.api_id,
                )) &&
        (state.state === "settings" || state.state === "" || !state.state)
    ) {
        await ctx.chat.sendMessage(
            ctx.constants.getPrompt(
                localizationNames.defaultPrompt,
                ctx.user.settings.lang.api_id,
            ),
        );
        await ctx.storage.delete(ctx.userID);
        return;
    }

    if (state.state === "settings") {
        switch (ctx.message.body) {
            case "1":
                await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(
                        localizationNames.selectLanguage,
                        ctx.user.settings.lang.api_id,
                    ),
                );
                if(ctx.configName==="children"){
                    const sortedLanguages = ChildrenConfigLanguages.sort((a, b) => Number(a.id) - Number(b.id));
                    await ctx.chat.sendMessage(
                        "--------------------------------------------------\n" +
                        sortedLanguages
                            .map((item) => {
                                // Форматируем номер с выравниванием
                                const number = ((Number(item.id) <= 9 ? "  " : "")+"_*"+String(item.id)+"*").padStart(2);
                                // Форматируем название языка
                                const languageName = item.native.padEnd(11);
                                // Определяем символ разделителя
                                const separator = "▪︎";

                                const postfix = Number(item.id)<=5 ? "+" : "-";

                                return `${number}      ${languageName} ${separator} (*${item.iso}*) ${postfix}_`;
                            })
                            .join("\n")
                    );
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
                state.state = "changeLanguage";
                await ctx.storage.push(ctx.userID, state);
                break;
            /*
            case '2':
                // change referral code
                await ctx.chat.sendMessage(ctx.constants.getPrompt(localizationNames.newReferralCodeCollection, ctx.user.settings.lang.api_id ))
                state.state  = 'changeReferralCode';
                await ctx.storage.push(ctx.userID, state);
                break;*/
            case "2":
                state.data.docs.legalInformationMessage =
                    await ctx.chat.sendMessage(
                        ctx.constants
                            .getPrompt(
                                localizationNames.legal_information_settings,
                                ctx.user.settings.lang.api_id,
                            )
                            .replace("%doc%", "")
                            .replace(
                                "%action%",
                                ctx.constants.getPrompt(
                                    localizationNames.expand_doc,
                                    ctx.user.settings.lang.api_id,
                                ),
                            )
                            .replace("%next%",
                                ctx.constants.getPrompt(
                                    localizationNames.next_step,
                                    ctx.user.settings.lang.api_id,
                                )
                            )
                    );
                state.state = "collectionLegalInformation";
                await ctx.storage.push(ctx.userID, state);
                break;
            case "3":
                const user = await ctx.usersList.pull(ctx.userID);
                let mode = "default";
                if (user.referrer_u_id == "666") {
                    mode = "test";
                }
                if (mode === "default") {
                    const res = await changeReferralCode(
                        user.api_u_id,
                        "666",
                        user.referrer_u_id,
                        ctx.auth,
                        ctx.baseURL,
                    );
                    await ctx.chat.sendMessage(JSON.stringify(res));
                    const actualUserData = await axios.post(
                        `${ctx.baseURL}user`,
                        {
                            token: ctx.auth.token,
                            u_hash: ctx.auth.hash,
                            u_a_phone: ctx.userID.split("@")[0],
                        },
                        { headers: postHeaders },
                    );
                    const actualUserDataSection =
                        actualUserData.data.data.user[
                            Object.keys(actualUserData.data.data.user)[0]
                        ];
                    if (!user.u_details) {
                        user.u_details = {};
                    }
                    user.u_details.refCodeBackup = user.referrer_u_id;
                    user.referrer_u_id = "666";

                    await ctx.usersList.push(ctx.userID, user);
                    await ctx.chat.sendMessage(
                        ctx.constants
                            .getPrompt(
                                localizationNames.settingsMenu,
                                ctx.user.settings.lang.api_id,
                            )
                            .replace(
                                "%language%",
                                user.settings.lang.native +
                                    "(" +
                                    user.settings.lang.iso +
                                    ")",
                            )
                            .replace(
                                "%refCode%",
                                searchRefCodeByREfID(
                                    actualUserDataSection?.referrer_u_id,
                                    ctx,
                                ) ?? "---",
                            )
                            .replace("%selfRefCode%", user.ref_code ?? "---")
                            .replace(
                                "%testModeHint%",
                                ctx.constants.getPrompt(
                                    localizationNames.settingsTestModeActive,
                                    ctx.user.settings.lang.api_id,
                                ),
                            ),
                    );
                } else if (mode === "test") {
                    const res = await changeReferralCode(
                        user.api_u_id,
                        user.u_details?.refCodeBackup,
                        "666",
                        ctx.auth,
                        ctx.baseURL,
                    );
                    await ctx.chat.sendMessage(JSON.stringify(res));
                    const actualUserData = await axios.post(
                        `${ctx.baseURL}user`,
                        {
                            token: ctx.auth.token,
                            u_hash: ctx.auth.hash,
                            u_a_phone: ctx.userID.split("@")[0],
                        },
                        { headers: postHeaders },
                    );
                    const actualUserDataSection =
                        actualUserData.data.data.user[
                            Object.keys(actualUserData.data.data.user)[0]
                        ];
                    console.log(actualUserDataSection);
                    if (!user.u_details) {
                        user.u_details = {};
                    }
                    user.referrer_u_id = user.u_details?.refCodeBackup;
                    user.u_details.refCodeBackup = "666";
                    await ctx.usersList.push(ctx.userID, user);

                    await ctx.chat.sendMessage(
                        ctx.constants
                            .getPrompt(
                                localizationNames.settingsMenu,
                                ctx.user.settings.lang.api_id,
                            )
                            .replace(
                                "%language%",
                                user.settings.lang.native +
                                    "(" +
                                    user.settings.lang.iso +
                                    ")",
                            )
                            .replace(
                                "%refCode%",
                                searchRefCodeByREfID(
                                    actualUserDataSection?.referrer_u_id,
                                    ctx,
                                ) ?? "---",
                            )
                            .replace("%selfRefCode%", user.ref_code ?? "---")
                            .replace(
                                "%testModeHint%",
                                ctx.constants.getPrompt(
                                    localizationNames.settingsTestModeHint,
                                    ctx.user.settings.lang.api_id,
                                ),
                            ),
                    );
                }
                state.state = "settings";
                await ctx.storage.push(ctx.userID, state);
                break;
            case "4":
                await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(
                        localizationNames.askDeleteAccount,
                        ctx.user.settings.lang.api_id,
                    ),
                );
                state.state = "deleteAccount";
                await ctx.storage.push(ctx.userID, state);
                break;
            case "5":
                state.data.docs.privacyPolicyMessage =
                    await ctx.chat.sendMessage(
                        ctx.constants
                            .getPrompt(
                                localizationNames.privacy_policy_settings,
                                ctx.user.settings.lang.api_id,
                            )
                            .replace("%doc%", "")
                            .replace(
                                "%action%",
                                ctx.constants.getPrompt(
                                    localizationNames.expand_doc,
                                    ctx.user.settings.lang.api_id,
                                ),
                            )
                            .replace("%next%",
                                ctx.constants.getPrompt(
                                    localizationNames.next_step,
                                    ctx.user.settings.lang.api_id,
                                )
                            )
                    );
                state.state = "collectionPrivacyPolicy";
                await ctx.storage.push(ctx.userID, state);
                break;
            case "6":
                state.data.docs.publicOffersMessage =
                    await ctx.chat.sendMessage(
                        ctx.constants
                            .getPrompt(
                                localizationNames.public_offers_settings,
                                ctx.user.settings.lang.api_id,
                            )
                            .replace("%doc%", "")
                            .replace(
                                "%action%",
                                ctx.constants.getPrompt(
                                    localizationNames.expand_doc,
                                    ctx.user.settings.lang.api_id,
                                ),
                            )
                            .replace("%next%",
                                ctx.constants.getPrompt(
                                    localizationNames.next_step,
                                    ctx.user.settings.lang.api_id,
                                )
                            )
                    );
                state.state = "collectionPublicOffers";
                await ctx.storage.push(ctx.userID, state);
                break;
            default:
                await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(
                        localizationNames.commandNotFound,
                        ctx.user.settings.lang.api_id,
                    ),
                );
                break;
        }
        return;
    }
    const user = await ctx.usersList.pull(ctx.userID);
    switch (state.state) {
        case "changeLanguage":
            console.log(
                ctx.message.body,
                languages.map((item) => item.id),
                ctx.message.body.toString() in languages.map((item) => item.id),
            );
            const userPreload = await ctx.usersList.pull(ctx.userID);
            if (
                ctx.message.body ===
                    ctx.constants.getPrompt(
                        localizationNames.cancelLower,
                        ctx.user.settings.lang.api_id,
                    ) ||
                ctx.message.body ===
                    ctx.constants.getPrompt(
                        localizationNames.cancelDigital,
                        ctx.user.settings.lang.api_id,
                    )
            ) {
                state.state = "settings";
                await ctx.storage.push(ctx.userID, state);
                await ctx.chat.sendMessage(
                    ctx.constants
                        .getPrompt(
                            localizationNames.settingsMenu,
                            ctx.user.settings.lang.api_id,
                        )
                        .replace(
                            "%language%",
                            userPreload.settings.lang.native +
                                "(" +
                                userPreload.settings.lang.iso +
                                ")",
                        )
                        .replace(
                            "%refCode%",
                            searchRefCodeByREfID(
                                userPreload.referrer_u_id,
                                ctx,
                            ) ?? "---",
                        )
                        .replace("%selfRefCode%", userPreload.ref_code ?? "---")
                        .replace(
                            "%prevRefCodeHint%",
                            userPreload.referrer_u_id === "666"
                                ? ctx.constants
                                      .getPrompt(
                                          localizationNames.settingsPreviousReferralCode,
                                          ctx.user.settings.lang.api_id,
                                      )
                                      .replace(
                                          "%code%",
                                          userPreload.u_details?.refCodeBackup,
                                      ) + "\n"
                                : "",
                        )
                        .replace(
                            "%testModeHint%",
                            userPreload.referrer_u_id === "666"
                                ? ctx.constants.getPrompt(
                                      localizationNames.settingsTestModeActive,
                                      ctx.user.settings.lang.api_id,
                                  )
                                : ctx.constants.getPrompt(
                                      localizationNames.settingsTestModeHint,
                                      ctx.user.settings.lang.api_id,
                                  ),
                        ),
                );
                break;
            }
            if (languages.map((item) => item.id).includes(ctx.message.body)) {
                if (ctx.message.body !== (ctx.configName==="children"?"8":"1") && ctx.configName !== "gruzvill") {
                    await ctx.chat.sendMessage(
                        `TEST POINT: На данный момент доступен только русский язык, выберите его, введя ( *${ctx.configName==="children"?"8":"1"}* )`,
                    );
                    state.state = "changeLanguage";
                    await ctx.storage.push(ctx.userID, state);
                    break;
                }
                const response = await changeLang(
                    ctx.userID.split("@")[0],
                    languages.find((item) => item.id == ctx.message.body)
                        ?.api_id ?? "-1",
                    ctx.auth,
                    ctx.baseURL,
                );

                if (
                    response.status === "success" ||
                    response.message === "user or modified data not found"
                ) {
                    state.state = "settings";
                    await ctx.storage.push(ctx.userID, state);

                    const selectedLang = languages.find(
                        (item) => item.id == ctx.message.body,
                    );

                    const user = await ctx.usersList.pull(ctx.userID);
                    user.reloadFromApi = true;
                    user.settings.lang.iso = selectedLang?.iso ?? "en";
                    user.settings.lang.native =
                        selectedLang?.native ?? "English(en)";
                    user.settings.lang.api_id = selectedLang?.api_id ?? "2";
                    await ctx.usersList.push(ctx.userID, user);
                    await ctx.chat.sendMessage(
                        ctx.constants.getPrompt(
                            localizationNames.langSelectedBakingToSettings,
                            ctx.user.settings.lang.api_id,
                        ).replace("%lang%",user.settings.lang.iso.toUpperCase()),
                    );
                    await ctx.chat.sendMessage(
                        ctx.constants
                            .getPrompt(
                                localizationNames.settingsMenu,
                                ctx.user.settings.lang.api_id,
                            )
                            .replace(
                                "%language%",
                                user.settings.lang.native +
                                    "(" +
                                    user.settings.lang.iso +
                                    ")",
                            )
                            .replace(
                                "%refCode%",
                                searchRefCodeByREfID(user.referrer_u_id, ctx) ??
                                    "---",
                            )
                            .replace("%selfRefCode%", user.ref_code ?? "---")
                            .replace(
                                "%prevRefCodeHint%",
                                user.referrer_u_id === "666"
                                    ? ctx.constants
                                          .getPrompt(
                                              localizationNames.settingsPreviousReferralCode,
                                              ctx.user.settings.lang.api_id,
                                          )
                                          .replace(
                                              "%code%",
                                              searchRefCodeByREfID(
                                                  user.u_details?.refCodeBackup,
                                                  ctx,
                                              ),
                                          ) + "\n"
                                    : "",
                            )
                            .replace(
                                "%testModeHint%",
                                user.referrer_u_id === "666"
                                    ? ctx.constants.getPrompt(
                                          localizationNames.settingsTestModeActive,
                                          ctx.user.settings.lang.api_id,
                                      )
                                    : ctx.constants.getPrompt(
                                          localizationNames.settingsTestModeHint,
                                          ctx.user.settings.lang.api_id,
                                      ),
                            ),
                    );
                    break;
                }
                await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(
                        localizationNames.error,
                        ctx.user.settings.lang.api_id,
                    ),
                );
                break;
            } else {
                await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(
                        localizationNames.commandNotFound,
                        ctx.user.settings.lang.api_id,
                    ),
                );
            }
            break;
        case "changeReferralCode":
            console.log("changeReferralCode: ", ctx.message.body, user);

            if (
                ctx.message.body ===
                    ctx.constants.getPrompt(
                        localizationNames.cancelLower,
                        ctx.user.settings.lang.api_id,
                    ) ||
                ctx.message.body ===
                    ctx.constants.getPrompt(
                        localizationNames.cancelDigital,
                        ctx.user.settings.lang.api_id,
                    )
            ) {
                state.state = "settings";
                await ctx.storage.push(ctx.userID, state);
                await ctx.chat.sendMessage(
                    ctx.constants
                        .getPrompt(
                            localizationNames.settingsMenu,
                            ctx.user.settings.lang.api_id,
                        )
                        .replace(
                            "%language%",
                            user.settings.lang.native +
                                "(" +
                                user.settings.lang.iso +
                                ")",
                        )
                        .replace(
                            "%refCode%",
                            searchRefCodeByREfID(user.referrer_u_id, ctx) ??
                                "---",
                        )
                        .replace("%selfRefCode%", user.ref_code ?? "---")
                        .replace(
                            "%prevRefCodeHint%",
                            user.referrer_u_id === "666"
                                ? ctx.constants
                                      .getPrompt(
                                          localizationNames.settingsPreviousReferralCode,
                                          ctx.user.settings.lang.api_id,
                                      )
                                      .replace(
                                          "%code%",
                                          user.u_details?.refCodeBackup,
                                      ) + "\n"
                                : "",
                        )
                        .replace(
                            "%testModeHint%",
                            user.referrer_u_id === "666"
                                ? ctx.constants.getPrompt(
                                      localizationNames.settingsTestModeActive,
                                      ctx.user.settings.lang.api_id,
                                  )
                                : ctx.constants.getPrompt(
                                      localizationNames.settingsTestModeHint,
                                      ctx.user.settings.lang.api_id,
                                  ),
                        ),
                );
                break;
            }
            const refCode = REFCODES[ctx.message.body] ?? ctx.message.body;

            //detect test mode
            if (user.referrer_u_id === "666") {
                await ctx.chat.sendMessage(
                    "Смена рефкода в режиме теста нвеозможна, отключите тестовый режим в настройках",
                );
                state.state = "settings";
                await ctx.storage.push(ctx.userID, state);
                await ctx.chat.sendMessage(
                    ctx.constants
                        .getPrompt(
                            localizationNames.settingsMenu,
                            ctx.user.settings.lang.api_id,
                        )
                        .replace(
                            "%language%",
                            user.settings.lang.native +
                                "(" +
                                user.settings.lang.iso +
                                ")",
                        )
                        .replace(
                            "%refCode%",
                            searchRefCodeByREfID(user.referrer_u_id, ctx) ??
                                "---",
                        )
                        .replace("%selfRefCode%", user.ref_code ?? "---")
                        .replace(
                            "%prevRefCodeHint%",
                            user.referrer_u_id === "666"
                                ? ctx.constants
                                      .getPrompt(
                                          localizationNames.settingsPreviousReferralCode,
                                          ctx.user.settings.lang.api_id,
                                      )
                                      .replace(
                                          "%code%",
                                          user.u_details?.refCodeBackup,
                                      ) + "\n"
                                : "",
                        )
                        .replace(
                            "%testModeHint%",
                            user.referrer_u_id === "666"
                                ? ctx.constants.getPrompt(
                                      localizationNames.settingsTestModeActive,
                                      ctx.user.settings.lang.api_id,
                                  )
                                : ctx.constants.getPrompt(
                                      localizationNames.settingsTestModeHint,
                                      ctx.user.settings.lang.api_id,
                                  ),
                        ),
                );
                break;
                /*
                if(refCode != user.u_details?.refCodeBackup){
                    ///await ctx.chat.sendMessage("PREV CODE: " + user.u_details?.refCodeBackup + '\n' + "NEW CODE: " + refCode + '\nCUR CODE: ' + user.referrer_u_id);
                    await ctx.chat.sendMessage(ctx.constants.getPrompt(localizationNames.settingsExitTestModeError, ctx.user.settings.lang.api_id ));
                    state.state = 'settings';
                    await ctx.storage.push(ctx.userID, state);
                    await ctx.chat.sendMessage(ctx.constants.getPrompt(localizationNames.settingsMenu, ctx.user.settings.lang.api_id )
                        .replace( '%language%', user.settings.lang.native + '(' + user.settings.lang.iso + ')')
                        .replace( '%refCode%', searchRefCodeByREfID(user.referrer_u_id) ?? '---')
                        .replace('%selfRefCode%', user.ref_code ?? '---')
                        .replace('%prevRefCodeHint%', user.referrer_u_id === '666' ?
                            ctx.constants.getPrompt(localizationNames.settingsPreviousReferralCode, ctx.user.settings.lang.api_id ).replace('%code%',user.u_details?.refCodeBackup) + '\n': '')
                        .replace('%testModeHint%', user.referrer_u_id === '666' ? ctx.constants.getPrompt(localizationNames.settingsTestModeActive, ctx.user.settings.lang.api_id ) :
                            ctx.constants.getPrompt(localizationNames.settingsTestModeHint, ctx.user.settings.lang.api_id ))
                    );
                    break;
                }
                */
            }

            console.log(user.api_u_id, refCode, user.referrer_u_id, ctx.auth);
            const response = await changeReferralCode(
                user.api_u_id,
                refCode,
                user.referrer_u_id,
                ctx.auth,
                ctx.baseURL,
            );
            if (response.status === "success") {
                const actualUserData = await axios.post(
                    `${ctx.baseURL}user`,
                    {
                        token: ctx.auth.token,
                        u_hash: ctx.auth.hash,
                        u_a_phone: ctx.userID.split("@")[0],
                    },
                    { headers: postHeaders },
                );
                const actualUserDataSection =
                    actualUserData.data.data.user[
                        Object.keys(actualUserData.data.data.user)[0]
                    ];
                await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(
                        localizationNames.changeReferralCodeSuccess,
                        ctx.user.settings.lang.api_id,
                    ),
                );
                await ctx.chat.sendMessage(
                    ctx.constants
                        .getPrompt(
                            localizationNames.settingsMenu,
                            ctx.user.settings.lang.api_id,
                        )
                        .replace(
                            "%language%",
                            user.settings.lang.native +
                                "(" +
                                user.settings.lang.iso +
                                ")",
                        )
                        .replace(
                            "%refCode%",
                            searchRefCodeByREfID(
                                actualUserDataSection.referrer_u_id,
                                ctx,
                            ) ?? "---",
                        )
                        .replace(
                            "%selfRefCode%",
                            actualUserDataSection.ref_code ?? "---",
                        )
                        .replace(
                            "%prevRefCodeHint%",
                            actualUserDataSection.referrer_u_id === "666"
                                ? ctx.constants
                                      .getPrompt(
                                          localizationNames.settingsPreviousReferralCode,
                                          ctx.user.settings.lang.api_id,
                                      )
                                      .replace(
                                          "%code%",
                                          actualUserDataSection.u_details
                                              ?.refCodeBackup,
                                      ) + "\n"
                                : "",
                        )
                        .replace(
                            "%testModeHint%",
                            actualUserDataSection.referrer_u_id === "666"
                                ? ctx.constants.getPrompt(
                                      localizationNames.settingsTestModeActive,
                                      ctx.user.settings.lang.api_id,
                                  )
                                : ctx.constants.getPrompt(
                                      localizationNames.settingsTestModeHint,
                                      ctx.user.settings.lang.api_id,
                                  ),
                        ),
                );
                state.state = "settings";
                user.referrer_u_id = refCode;
                await ctx.usersList.push(ctx.userID, user);
                await ctx.storage.push(ctx.userID, state);
                break;
            } else if (response.message === "user or modified data not found") {
                await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(
                        localizationNames.changeReferralCodeErrorEqual,
                        ctx.user.settings.lang.api_id,
                    ),
                );
                await ctx.chat.sendMessage(
                    ctx.constants
                        .getPrompt(
                            localizationNames.settingsMenu,
                            ctx.user.settings.lang.api_id,
                        )
                        .replace(
                            "%language%",
                            user.settings.lang.native +
                                "(" +
                                user.settings.lang.iso +
                                ")",
                        )
                        .replace(
                            "%refCode%",
                            searchRefCodeByREfID(user.referrer_u_id, ctx) ??
                                "---",
                        )
                        .replace("%selfRefCode%", user.ref_code ?? "---")
                        .replace(
                            "%prevRefCodeHint%",
                            user.referrer_u_id === "666"
                                ? ctx.constants
                                      .getPrompt(
                                          localizationNames.settingsPreviousReferralCode,
                                          ctx.user.settings.lang.api_id,
                                      )
                                      .replace(
                                          "%code%",
                                          user.u_details?.refCodeBackup,
                                      ) + "\n"
                                : "",
                        )
                        .replace(
                            "%testModeHint%",
                            user.referrer_u_id === "666"
                                ? ctx.constants.getPrompt(
                                      localizationNames.settingsTestModeActive,
                                      ctx.user.settings.lang.api_id,
                                  )
                                : ctx.constants.getPrompt(
                                      localizationNames.settingsTestModeHint,
                                      ctx.user.settings.lang.api_id,
                                  ),
                        ),
                );
                state.state = "settings";
                await ctx.storage.push(ctx.userID, state);
                break;
            } else {
                await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(
                        localizationNames.invalidReferralCode,
                        ctx.user.settings.lang.api_id,
                    ),
                );
                state.state = "settings";
                await ctx.storage.push(ctx.userID, state);
                await ctx.chat.sendMessage(
                    ctx.constants
                        .getPrompt(
                            localizationNames.settingsMenu,
                            ctx.user.settings.lang.api_id,
                        )
                        .replace(
                            "%language%",
                            user.settings.lang.native +
                                "(" +
                                user.settings.lang.iso +
                                ")",
                        )
                        .replace(
                            "%refCode%",
                            searchRefCodeByREfID(user.referrer_u_id, ctx) ??
                                "---",
                        )
                        .replace("%selfRefCode%", user.ref_code ?? "---")
                        .replace(
                            "%prevRefCodeHint%",
                            user.referrer_u_id === "666"
                                ? ctx.constants
                                      .getPrompt(
                                          localizationNames.settingsPreviousReferralCode,
                                          ctx.user.settings.lang.api_id,
                                      )
                                      .replace(
                                          "%code%",
                                          user.u_details?.refCodeBackup,
                                      ) + "\n"
                                : "",
                        )
                        .replace(
                            "%testModeHint%",
                            user.referrer_u_id === "666"
                                ? ctx.constants.getPrompt(
                                      localizationNames.settingsTestModeActive,
                                      ctx.user.settings.lang.api_id,
                                  )
                                : ctx.constants.getPrompt(
                                      localizationNames.settingsTestModeHint,
                                      ctx.user.settings.lang.api_id,
                                  ),
                        ),
                );
                break;
            }
        case "collectionLegalInformation":
            if (ctx.message.body === "1") {
                await sendSettingMenu(ctx,user);

                await ctx.storage.push(ctx.userID, newSettings());
                break;
            } else if (ctx.message.body === "3") {
                state.data.docs.legalInformationExpanded =
                    !state.data.docs.legalInformationExpanded;

                await state.data.docs.legalInformationMessage?.edit(
                    ctx.constants
                        .getPrompt(
                            localizationNames.legal_information_settings,
                            ctx.user.settings.lang.api_id,
                        )
                        .replace(
                            "%doc%",
                            state.data.docs.legalInformationExpanded
                                ? ctx.constants.getPrompt(
                                      localizationNames.legal_information_big,
                                      ctx.user.settings.lang.api_id,
                                  )
                                : "",
                        )
                        .replace(
                            "%action%",
                            ctx.constants.getPrompt(
                                state.data.docs.legalInformationExpanded
                                    ? localizationNames.collapse_doc
                                    : localizationNames.expand_doc,
                                ctx.user.settings.lang.api_id,
                            ),
                        )
                        .replace(
                            "%next%",
                            ctx.constants.getPrompt(
                                localizationNames.next_step,
                                ctx.user.settings.lang.api_id,
                            ),
                        ),
                );

                await ctx.storage.push(ctx.userID, state);
                break;
            } else {
                await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(
                        localizationNames.commandNotFound,
                        ctx.user.settings.lang.api_id,
                    ),
                );
            }
            break;

        case "collectionPrivacyPolicy":
            if (ctx.message.body === "1") {
                await sendSettingMenu(ctx,user);

                await ctx.storage.push(ctx.userID, newSettings());
                break;
            } else if (ctx.message.body === "3") {
                state.data.docs.privacyPolicyExpanded =
                    !state.data.docs.privacyPolicyExpanded;
                await new Promise((f) =>
                    setTimeout(
                        f,
                        state?.data.docs.privacyPolicyExpanded ? 500 : 500,
                    ),
                );

                await state.data.docs.privacyPolicyMessage?.edit(
                    ctx.constants
                        .getPrompt(
                            localizationNames.privacy_policy_settings,
                            ctx.user.settings.lang.api_id,
                        )
                        .replace(
                            "%doc%",
                            state.data.docs.privacyPolicyExpanded
                                ? ctx.constants.getPrompt(
                                    localizationNames.privacy_policy_big,
                                    ctx.user.settings.lang.api_id,
                                )
                                : "",
                        )
                        .replace(
                            "%action%",
                            ctx.constants.getPrompt(
                                state.data.docs.privacyPolicyExpanded
                                    ? localizationNames.collapse_doc
                                    : localizationNames.expand_doc,
                                ctx.user.settings.lang.api_id,
                            ),
                        )
                        .replace("%next%",
                            ctx.constants.getPrompt(
                                localizationNames.next_step,
                                ctx.user.settings.lang.api_id,
                            )
                        )
                );

                await ctx.storage.push(ctx.userID, state);
                break;
            } else {
                await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(
                        localizationNames.commandNotFound,
                        ctx.user.settings.lang.api_id,
                    ),
                );
            }
            break;

        case "collectionPublicOffers":
            if (ctx.message.body === "1") {
                await sendSettingMenu(ctx,user);

                await ctx.storage.push(ctx.userID, newSettings());
                break;
            } else if (ctx.message.body === "3") {
                state.data.docs.publicOffersExpanded =
                    !state.data.docs.publicOffersExpanded;
                await new Promise((f) =>
                    setTimeout(
                        f,
                        state?.data.docs.publicOffersExpanded ? 500 : 500,
                    ),
                );
                console.log('111111111',state.data.docs.publicOffersMessage)

                await state.data.docs.publicOffersMessage?.edit(
                    ctx.constants
                        .getPrompt(
                            localizationNames.public_offers_settings,
                            ctx.user.settings.lang.api_id,
                        )
                        .replace(
                            "%doc%",
                            state.data.docs.publicOffersExpanded
                                ? ctx.constants.getPrompt(
                                    localizationNames.public_offers_big,
                                    ctx.user.settings.lang.api_id,
                                )
                                : "",
                        )
                        .replace(
                            "%action%",
                            ctx.constants.getPrompt(
                                state.data.docs.publicOffersExpanded
                                    ? localizationNames.collapse_doc
                                    : localizationNames.expand_doc,
                                ctx.user.settings.lang.api_id,
                            ),
                        )
                        .replace("%next%",
                            ctx.constants.getPrompt(
                                localizationNames.next_step,
                                ctx.user.settings.lang.api_id,
                            )
                        )
                );

                await ctx.storage.push(ctx.userID, state);
                break;
            } else {
                await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(
                        localizationNames.commandNotFound,
                        ctx.user.settings.lang.api_id,
                    ),
                );
            }
            break;
        case "deleteAccount":
            if (ctx.message.body === "1") {
                await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(
                        localizationNames.accountDeleted,
                        ctx.user.settings.lang.api_id,
                    ),
                );
                state.id = "register";
                state.state = "previouslyDeleted";
                await ctx.storage.push(ctx.userID, state);
            } else if (ctx.message.body === "2") {
                await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(
                        localizationNames.accountDeletionCanceled,
                        ctx.user.settings.lang.api_id,
                    ),
                );
                await ctx.chat.sendMessage(
                    ctx.constants
                        .getPrompt(
                            localizationNames.settingsMenu,
                            ctx.user.settings.lang.api_id,
                        )
                        .replace(
                            "%language%",
                            user.settings.lang.native +
                                "(" +
                                user.settings.lang.iso +
                                ")",
                        )
                        .replace(
                            "%refCode%",
                            searchRefCodeByREfID(user.referrer_u_id, ctx) ??
                                "---",
                        )
                        .replace("%selfRefCode%", user.ref_code ?? "---")
                        .replace(
                            "%prevRefCodeHint%",
                            user.referrer_u_id === "666"
                                ? ctx.constants
                                      .getPrompt(
                                          localizationNames.settingsPreviousReferralCode,
                                          ctx.user.settings.lang.api_id,
                                      )
                                      .replace(
                                          "%code%",
                                          searchRefCodeByREfID(
                                              user.u_details?.refCodeBackup,
                                              ctx,
                                          ),
                                      ) + "\n"
                                : "",
                        )
                        .replace(
                            "%testModeHint%",
                            user.referrer_u_id === "666"
                                ? ctx.constants.getPrompt(
                                      localizationNames.settingsTestModeActive,
                                      ctx.user.settings.lang.api_id,
                                  )
                                : ctx.constants.getPrompt(
                                      localizationNames.settingsTestModeHint,
                                      ctx.user.settings.lang.api_id,
                                  ),
                        ),
                );
                state.state = "settings";
                await ctx.storage.push(ctx.userID, state);
            } else {
                await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(
                        localizationNames.commandNotFound,
                        ctx.user.settings.lang.api_id,
                    ),
                );
            }

            break;
        default:
            await ctx.chat.sendMessage("Not Implemented: SettingsHandler");
            break;
    }
}
