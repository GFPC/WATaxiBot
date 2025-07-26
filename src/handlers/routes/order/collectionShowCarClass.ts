import { localizationNames } from "../../../l10n";
import { OrderMachine } from "../../../states/machines/orderMachine";
import { Context } from "../../../index";
import { HandlerRouteResponse, SuccessResponse } from "../format";

export async function collectionShowCarClass(
    ctx: Context,
    state: OrderMachine,
): Promise<HandlerRouteResponse> {
    if (ctx.message.body === "1") {
        const car_classes = ctx.constants.data.data.car_classes;
        let text = ctx.constants.getPrompt(
            localizationNames.selectCarClass,
            ctx.user.settings.lang.api_id,
        );
        for (let i in car_classes) {
            text +=
                i.replace(" ", "") +
                ". " +
                car_classes[i][ctx.user.settings.lang.iso] +
                "\n";
        }
        state.state = "collectionCarClass";
        state.data.nextStateForAI = "collectionCarClass";
        state.data.nextMessageForAI = text;
        await ctx.storage.push(ctx.userID, state);
        await ctx.chat.sendMessage(text);
    } else if (ctx.message.body === "2") {
        state.state = "collectionShowAdditionalOptions";
        state.data.nextStateForAI = "collectionShowAdditionalOptions";
        await ctx.chat.sendMessage(
            ctx.constants.getPrompt(
                localizationNames.needAdditionalOptionsQuestion,
                ctx.user.settings.lang.api_id,
            ),
        );
    } else {
        await ctx.chat.sendMessage(
            ctx.constants.getPrompt(
                localizationNames.commandNotFound,
                ctx.user.settings.lang.api_id,
            ),
        );
        return SuccessResponse;
    }
    return SuccessResponse;
}
