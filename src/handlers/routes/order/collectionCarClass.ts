import { localizationNames } from "../../../l10n";
import { OrderMachine } from "../../../states/machines/orderMachine";
import { Context } from "../../../index";
import { HandlerRouteResponse, SuccessResponse } from "../format";

export async function collectionCarClass(
    ctx: Context,
    state: OrderMachine,
): Promise<HandlerRouteResponse> {
    if (ctx.message.body === "00") {
        state.state = "collectionShowAdditionalOptions";
        state.data.nextStateForAI = "collectionShowAdditionalOptions";
        state.data.nextMessageForAI = ctx.constants.getPrompt(
            localizationNames.needAdditionalOptionsQuestion,
            ctx.user.settings.lang.api_id,
        );
        await ctx.chat.sendMessage(
            ctx.constants.getPrompt(
                localizationNames.needAdditionalOptionsQuestion,
                ctx.user.settings.lang.api_id,
            ),
        );
        await ctx.storage.push(ctx.userID, state);
        return SuccessResponse;
    }
    if (!ctx.constants.data.data.car_classes[ctx.message.body]) {
        await ctx.chat.sendMessage(
            ctx.constants.getPrompt(
                localizationNames.commandNotFound,
                ctx.user.settings.lang.api_id,
            ),
        );
        return SuccessResponse;
    }
    state.data.carClass = ctx.message.body;
    state.state = "collectionShowAdditionalOptions";
    state.data.nextMessageForAI = ctx.constants.getPrompt(
        localizationNames.needAdditionalOptionsQuestion,
        ctx.user.settings.lang.api_id,
    );
    state.data.nextStateForAI = "collectionShowAdditionalOptions";
    await ctx.chat.sendMessage(
        ctx.constants.getPrompt(
            localizationNames.needAdditionalOptionsQuestion,
            ctx.user.settings.lang.api_id,
        ),
    );
    return SuccessResponse;
}
