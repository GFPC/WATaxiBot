import {
    GetLocation,
    parseGetLocationException,
} from "../../../utils/orderUtils";
import { localizationNames } from "../../../l10n";
import { formatString } from "../../../utils/formatter";
import { OrderMachine } from "../../../states/machines/orderMachine";
import { Context } from "../../../index";
import { HandlerRouteResponse, SuccessResponse } from "../format";

export async function collectionTo(
    ctx: Context,
    state: OrderMachine,
): Promise<HandlerRouteResponse> {
    // Собираем информацию о конечной точке
    try {
        const location = await GetLocation(
            ctx.message,
            ctx.userID,
            ctx.storage,
            state,
            ctx,
        );

        if (typeof location != "string") {
            state.data.to = location;
            state.state = "collectionHowManyPeople";
            state.data.nextStateForAI = "collectionHowManyPeople";
            state.data.nextMessageForAI = ctx.constants.getPrompt(
                localizationNames.collectionPeopleCount,
                ctx.user.settings.lang.api_id,
            );
            await ctx.storage.push(ctx.userID, state);
            await ctx.chat.sendMessage(
                ctx.constants.getPrompt(
                    localizationNames.collectionPeopleCount,
                    ctx.user.settings.lang.api_id,
                ),
            );
            return SuccessResponse;
        }

        await ctx.chat.sendMessage(location);
    } catch (e) {
        ctx.logger.error(`OrderHandler: ${e}`);
        const response = formatString(
            ctx.constants.getPrompt(
                localizationNames.errorGeolocation,
                ctx.user.settings.lang.api_id,
            ),
            {
                error: await parseGetLocationException(String(e), ctx),
            },
        );
        await ctx.chat.sendMessage(response);
        return SuccessResponse;
    }

    return SuccessResponse;
}
