import {
    GetLocation,
    parseGetLocationException,
} from "../../../utils/orderUtils";
import { localizationNames } from "../../../l10n";
import { formatString } from "../../../utils/formatter";
import { OrderMachine } from "../../../states/machines/orderMachine";
import { Context } from "../../../types/Context";
import { HandlerRouteResponse, SuccessResponse } from "../format";
import { ChildProfileMachine } from "../../../states/machines/childrenProfile";
import { getLocalizationText } from "../../../utils/textUtils";
export async function collectionShortedVariant(
    ctx: Context,
    state: ChildProfileMachine,
): Promise<HandlerRouteResponse> {
    // Собираем возраст ребенка
    const childrenInfo =  ctx.message.body;

    const orderState: OrderMachine = state.data.orderState;
    if (!orderState.data.childrenProfiles)
        orderState.data.childrenProfiles = [];
    orderState.data.childrenProfiles = childrenInfo;

    orderState.state = "collectionShowAdditionalOptions";
    orderState.data.nextStateForAI = "collectionShowAdditionalOptions";
    orderState.data.nextMessageForAI = ctx.constants.getPrompt(
        localizationNames.needAdditionalOptionsQuestion,
        ctx.user.settings.lang.api_id,
    );
    await ctx.chat.sendMessage(
        ctx.constants.getPrompt(
            localizationNames.needAdditionalOptionsQuestion,
            ctx.user.settings.lang.api_id,
        ),
    );
    await ctx.storage.push(ctx.userID, orderState);
    return SuccessResponse;
}
