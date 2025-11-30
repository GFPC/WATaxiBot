import {
    GetLocation,
    parseGetLocationException,
} from "../../../utils/orderUtils";
import { localizationNames } from "../../../l10n";
import { formatString } from "../../../utils/formatter";
import { OrderMachine } from "../../../states/machines/orderMachine";
import { Context } from "../../../types/Context";
import { HandlerRouteResponse, SuccessResponse } from "../format";

export async function children_collectionTime(
    ctx: Context,
    state: OrderMachine,
): Promise<HandlerRouteResponse> {
    // Собираем время
    const time = ctx.message.body;
    if (isNaN(+time)) {
        await ctx.chat.sendMessage(
            ctx.constants.getPrompt(
                localizationNames.hoursNumberMystBeNumber,
                ctx.user.settings.lang.api_id,
            ),
        );
        return SuccessResponse;
    }
    state.data.childrenTime = Number(time);

    state.state = "children_collectionChildrenCount";
    state.data.nextStateForAI = "children_collectionChildrenCount";
    state.data.nextMessageForAI = ctx.constants.getPrompt(
        localizationNames.enterChildrenCount,
        ctx.user.settings.lang.api_id,
    );
    await ctx.storage.push(ctx.userID, state);
    await ctx.chat.sendMessage(
        ctx.constants.getPrompt(
            localizationNames.enterChildrenCount,
            ctx.user.settings.lang.api_id,
        ),
    );
    return SuccessResponse;
}
