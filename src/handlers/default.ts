import { Context } from "../types/Context";
import { localizationNames } from "../l10n";
import { newEmptyOrder } from "../states/machines/orderMachine";
import { newSettings } from "../states/machines/settingsMachine";
import searchRefCodeByREfID from "../utils/settings";
import {User} from "../api/user";
import {getLegalDocsVersionsMap, pickMaxVersion} from "../types/api/LegalDoc";
import {getLocalizationText} from "../utils/textUtils";
export async function DefaultHandler(ctx: Context): Promise<void> {
    const state = await ctx.storage.pull(ctx.userID);

    if (state === null || state === undefined || state === "") {
        switch (ctx.message.body) {
            case "0":
                if(ctx.configName === "children") { // Логика проверки принятия последней версии документов для children
                    const user: User = await ctx.usersList.pull(ctx.userID);
                    let needUpdate = false
                    if( user.u_details?.docs ) {
                        let b1 = {
                            privacy_policy: user.u_details?.docs?.privacy_policy?.version,
                            public_offer: user.u_details?.docs?.public_offer?.version,
                            legal_information: user.u_details?.docs?.legal_information?.version
                        }
                        const botLegalDocs = JSON.parse(ctx.constants.data.data.site_constants.bot_legal_docs?.value || '{}')
                        const currentVersions = getLegalDocsVersionsMap(botLegalDocs);
                        let b2 = {
                            privacy_policy: currentVersions?.privacy_policy,
                            public_offer: currentVersions.public_offer,
                            legal_information: currentVersions.legal_information
                        }
                        if (b1.privacy_policy !== b2.privacy_policy || b1.public_offer !== b2.public_offer) {
                            needUpdate = true
                        } else {
                            // ok
                            //await ctx.chat.sendMessage("Все правила подтверждены")
                        }
                    } else {
                        needUpdate = true
                    }

                    if(needUpdate){
                        const botLegalDocs = JSON.parse(ctx.constants.data.data.site_constants.bot_legal_docs?.value || '{}')
                        await ctx.chat.sendMessage(getLocalizationText(
                            ctx,
                            localizationNames.needToAcceptNewDocs
                        ))

                        const public_offer_parts = pickMaxVersion(botLegalDocs.public_offer.content)

                        public_offer_parts.parts.forEach(async (part: {[lang: string]: string}) => {
                            await ctx.chat.sendMessage(part[ctx.user.settings.lang.api_id])
                        })
                        const freshState = newEmptyOrder();
                        freshState.state = "children_docs_collectionPublicOffer";
                        await ctx.storage.push(ctx.userID, freshState);
                        return
                    }
                }

                await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(
                        localizationNames.enterStartPoint,
                        ctx.user.settings.lang.api_id,
                    ),
                    { linkPreview: false },
                );
                await ctx.storage.push(ctx.userID, newEmptyOrder());
                break;
            case "1":
                const user = await ctx.usersList.pull(ctx.userID);
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

                await ctx.storage.push(ctx.userID, newSettings());
                break;
            case "9":
                console.log(
                    JSON.parse(
                        ctx.constants.data.data.site_constants.pricingModels
                            .value,
                    ).pricing_models,
                );
                await ctx.chat.sendMessage(
                    ctx.constants
                        .getPrompt(
                            localizationNames.help,
                            ctx.user.settings.lang.api_id,
                        )
                        .replace(
                            "%base_price%",
                            String(
                                Math.min(
                                    JSON.parse(
                                        ctx.constants.data.data.site_constants
                                            .pricingModels.value,
                                    ).pricing_models.basic.constants.base_price,
                                    JSON.parse(
                                        ctx.constants.data.data.site_constants
                                            .pricingModels.value,
                                    ).pricing_models.voting.constants
                                        .base_price,
                                ),
                            ),
                        )
                        .replace(
                            "%currency%",
                            ctx.constants.data.default_currency,
                        ),
                );
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
    }
}
