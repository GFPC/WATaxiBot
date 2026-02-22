import {
    GetLocation,
    parseGetLocationException,
} from "../../../utils/orderUtils";
import { localizationNames } from "../../../l10n";
import { formatString } from "../../../utils/formatter";
import {newEmptyOrder, OrderMachine} from "../../../states/machines/orderMachine";
import { Context } from "../../../types/Context";
import { HandlerRouteResponse, SuccessResponse } from "../format";
import {getLegalDocsVersionsMap, pickMaxVersion} from "../../../types/api/LegalDoc";
import {editUser} from "../../../api/user";

export async function children_docs_collectionPrivacyPolicy(
    ctx: Context,
    state: OrderMachine,
): Promise<HandlerRouteResponse> {
    if(ctx.message.body === "1") {}
    else if(ctx.message.body === "2") {
        await ctx.chat.sendMessage(
            ctx.constants.getPrompt(
                localizationNames.docsDeclinedCanNotUseOrder,
                ctx.user.settings.lang.api_id,
            ),
        );
        return SuccessResponse;
    }
    else {
        await ctx.chat.sendMessage(
            ctx.constants.getPrompt(
                localizationNames.commandNotFound,
                ctx.user.settings.lang.api_id,
            ),
        );
        return SuccessResponse;
    }

    const botLegalDocs = JSON.parse(ctx.constants.data.data.site_constants.bot_legal_docs?.value || '{}')
    //const currentVersions = getLegalDocsVersionsMap(botLegalDocs);

    const legal_information_parts = pickMaxVersion(botLegalDocs.legal_information.content)
    for (const part of legal_information_parts.parts) {
        await ctx.chat.sendMessage(part[ctx.user.settings.lang.api_id].replace('%action%',
            ctx.constants.getPrompt(
                localizationNames.childrenDocsActionContinueOrder,
                ctx.user.settings.lang.api_id
            )));
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    if(state.data.children_docs?.privacy_policy) {
        state.data.children_docs.privacy_policy.accepted = (new Date()).toUTCString();
    }
    state.state = "children_docs_collectionLegalInformation";
    await ctx.storage.push(ctx.userID, state);


    return SuccessResponse;
}
