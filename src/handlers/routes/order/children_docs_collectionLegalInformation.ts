import {
    GetLocation,
    parseGetLocationException,
} from "../../../utils/orderUtils";
import { localizationNames } from "../../../l10n";
import { formatString } from "../../../utils/formatter";
import { OrderMachine } from "../../../states/machines/orderMachine";
import { Context } from "../../../types/Context";
import { HandlerRouteResponse, SuccessResponse } from "../format";
import {editUser} from "../../../api/user";

export async function children_docs_collectionLegalInformation(
    ctx: Context,
    state: OrderMachine,
): Promise<HandlerRouteResponse> {

    await ctx.chat.sendMessage(
        "Документы приняты, можете продолжать создание заказа"
    )
    await ctx.chat.sendMessage(
        ctx.constants.getPrompt(
            localizationNames.enterStartPoint,
            ctx.user.settings.lang.api_id,
        ),
        { linkPreview: false },
    );
    if(state.data.children_docs?.public_offer) {
        state.data.children_docs.legal_information.accepted = (new Date()).toUTCString();
    }

    state.state = "collectionFrom";
    await ctx.storage.push(ctx.userID, state);

    const res = await editUser(
        ctx.userID.split("@")[0],
        {
            u_details: [
                ['=', ['docs', 'public_offer','version'], state.data.children_docs?.public_offer.version],
                ['=', ['docs', 'privacy_policy','version'], state.data.children_docs?.privacy_policy.version],
                ['=', ['docs', 'legal_information','version'], state.data.children_docs?.legal_information.version],
                ['=', ['docs', 'public_offer','accepted'], state.data.children_docs?.public_offer.accepted],
                ['=', ['docs', 'privacy_policy','accepted'], state.data.children_docs?.privacy_policy.accepted],
                ['=', ['docs', 'legal_information','accepted'], state.data.children_docs?.legal_information.accepted]
            ]
        },
        ctx.auth,
        ctx.baseURL
    )
    console.log('Order Docs: ', res, 'body', state.data.children_docs)
    if(res.status !== "success") {
        ctx.logger.info(
            `RegisterHandler: Failed to edit user ${ctx.userID} msg: ${res.message}`,
        )
        await ctx.chat.sendMessage(
            "Something went wrong.Log: " + JSON.stringify(res)
        )
    } else {

        const user = await ctx.usersList.pull(ctx.userID)
        user.reloadFromApi = true
        await ctx.usersList.push(ctx.userID, user)
    }


    return SuccessResponse;
}
