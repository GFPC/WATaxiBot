import { localizationNames } from "../../../l10n";
import { OrderMachine } from "../../../states/machines/orderMachine";
import { Context } from "../../../types/Context";
import { HandlerRouteResponse, SuccessResponse } from "../format";

export async function collectionAdditionalOptions(
    ctx: Context,
    state: OrderMachine,
): Promise<HandlerRouteResponse> {
    if (ctx.message.body === "00") {
        state.state = "collectionWhen";
        state.data.nextMessageForAI = ctx.constants.getPrompt(
            localizationNames.collectionWhen,
            ctx.user.settings.lang.api_id,
        );
        state.data.nextStateForAI = "collectionWhen";
        await ctx.chat.sendMessage(
            ctx.constants.getPrompt(
                localizationNames.collectionWhen,
                ctx.user.settings.lang.api_id,
            ),
        );
        await ctx.storage.push(ctx.userID, state);
        return SuccessResponse;
    }
    const msg = ctx.message.body.replace(/\s{2,}/g, " ");
    let successFlag = true;

    for (let i = 0; i < msg.split(" ").length; i++) {
        console.log(ctx.constants.data.data.booking_comments[msg.split(" ")[i]])
        if (
            ctx.constants.data.data.booking_comments[msg.split(" ")[i]] !== undefined &&
            !ctx.constants.data.data.booking_comments[msg.split(" ")[i]].options.hidden
        ) {
            state.data.additionalOptions.push(Number(msg.split(" ")[i]));
        } else {
            successFlag = false;
            break;
        }
    }
    if (!successFlag) {
        await ctx.chat.sendMessage(
            ctx.constants.getPrompt(
                localizationNames.collectionAdditionalOptionsError,
                ctx.user.settings.lang.api_id,
            ),
        );
        state.state = "collectionAdditionalOptions";
        state.data.nextMessageForAI = ctx.constants.getPrompt(
            localizationNames.collectionAdditionalOptionsError,
            ctx.user.settings.lang.api_id,
        );
        state.data.nextStateForAI = "collectionAdditionalOptions";
        state.data.additionalOptions = [];
        await ctx.storage.push(ctx.userID, state);
        return SuccessResponse;
    }
    state.state = "collectionWhen";
    state.data.nextMessageForAI = ctx.constants.getPrompt(
        localizationNames.collectionWhen,
        ctx.user.settings.lang.api_id,
    );
    state.data.nextStateForAI = "collectionWhen";
    await ctx.chat.sendMessage(
        ctx.constants.getPrompt(
            localizationNames.collectionWhen,
            ctx.user.settings.lang.api_id,
        ),
    );
    return SuccessResponse;
}
