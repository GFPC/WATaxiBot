import {
    GetLocation,
    parseGetLocationException,
} from "../../../utils/orderUtils";
import { localizationNames } from "../../../l10n";
import { formatString } from "../../../utils/formatter";
import { OrderMachine } from "../../../states/machines/orderMachine";
import { Context } from "../../../index";
import { HandlerRouteResponse, SuccessResponse } from "../format";
import { ChildProfileMachine } from "../../../states/machines/childrenProfile";
import { getLocalizationText } from "../../../utils/textUtils";
export async function collectionAge(
    ctx: Context,
    state: ChildProfileMachine,
): Promise<HandlerRouteResponse> {
    // Собираем возраст ребенка
    const age = ctx.message.body;
    if (isNaN(+age)) {
        return SuccessResponse;
    }
    await ctx.storage.delete(ctx.userID);
    state.state = "collectionName";
    state.data.nextStateForAI = "collectionName";
    state.data.nextMessageForAI = `${getLocalizationText(ctx, localizationNames.enterChildName)}(${getLocalizationText(ctx, localizationNames.profileNumberPattern)}${state.data.currentChildrenIndex + 1})`;
    await ctx.chat.sendMessage(
        `${getLocalizationText(ctx, localizationNames.enterChildName)}(${getLocalizationText(ctx, localizationNames.profileNumberPattern)}${state.data.currentChildrenIndex + 1})`,
    );
    await ctx.storage.push(ctx.userID, state);
    return SuccessResponse;
}
