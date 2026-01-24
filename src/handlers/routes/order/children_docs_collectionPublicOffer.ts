import {
    GetLocation,
    parseGetLocationException,
} from "../../../utils/orderUtils";
import { localizationNames } from "../../../l10n";
import { formatString } from "../../../utils/formatter";
import { OrderMachine } from "../../../states/machines/orderMachine";
import { Context } from "../../../types/Context";
import { HandlerRouteResponse, SuccessResponse } from "../format";
import {pickMaxVersion} from "../../../types/api/LegalDoc";

export async function children_docs_collectionPublicOffer(
    ctx: Context,
    state: OrderMachine,
): Promise<HandlerRouteResponse> {
    if(ctx.message.body !== "1") {
        await ctx.chat.sendMessage(
            ctx.constants.getPrompt(
                localizationNames.docsDeclinedCanNotUseOrder,
                ctx.user.settings.lang.api_id,
            ),
        );
        return SuccessResponse;
    }

    const botLegalDocs = JSON.parse(ctx.constants.data.data.site_constants.bot_legal_docs?.value || '{}')
    //const currentVersions = getLegalDocsVersionsMap(botLegalDocs);

    const privacy_policy_parts = pickMaxVersion(botLegalDocs.privacy_policy.content)

    privacy_policy_parts.parts.forEach(async (part: {[lang: string]: string}) => {
        await ctx.chat.sendMessage(part[ctx.user.settings.lang.api_id])
    })
    state.state = "children_docs_collectionPrivacyPolicy";

    const public_offer_parts = pickMaxVersion(botLegalDocs.public_offer.content)
    const legal_information_parts = pickMaxVersion(botLegalDocs.legal_information.content)
    if(!state.data.children_docs) {
        state.data.children_docs = {
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
    if(state.data.children_docs?.public_offer){
        state.data.children_docs.public_offer.accepted = (new Date()).toUTCString();
    }
    await ctx.storage.push(ctx.userID, state);

    return SuccessResponse;
}
