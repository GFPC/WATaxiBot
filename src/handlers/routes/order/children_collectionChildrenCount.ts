import {
    GetLocation,
    parseGetLocationException,
} from "../../../utils/orderUtils";
import { localizationNames } from "../../../l10n";
import { formatString } from "../../../utils/formatter";
import { OrderMachine } from "../../../states/machines/orderMachine";
import { Context } from "../../../index";
import { HandlerRouteResponse, SuccessResponse } from "../format";
import { newChildProfile } from "../../../states/machines/childrenProfile";
import { getLocalizationText } from "../../../utils/textUtils";

export async function children_collectionChildrenCount(
    ctx: Context,
    state: OrderMachine,
): Promise<HandlerRouteResponse> {
    // Собираем кол-во детей
    const count = ctx.message.body;
    if (isNaN(+count)) {
        await ctx.chat.sendMessage(
            getLocalizationText(
                ctx,
                localizationNames.childrenCountMustBeNumber,
            ),
        );
        return SuccessResponse;
    }
    state.data.peopleCount = Number(count);
    await ctx.storage.delete(ctx.userID);
    const newState = newChildProfile(state, 0); // здесь точка входа в loop
    newState.state = "collectionShortedVariant";
    newState.data.nextStateForAI = "collectionShortedVariant";
    newState.data.nextMessageForAI = getLocalizationText(ctx, localizationNames.childrenInfoShortedVariant)
    await ctx.chat.sendMessage(
        getLocalizationText(ctx, localizationNames.childrenInfoShortedVariant)
    );
    await ctx.storage.push(ctx.userID, newState);
    return SuccessResponse;
}
