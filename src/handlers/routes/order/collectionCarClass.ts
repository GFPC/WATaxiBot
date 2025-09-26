import { localizationNames } from "../../../l10n";
import { OrderMachine } from "../../../states/machines/orderMachine";
import { Context } from "../../../index";
import { HandlerRouteResponse, SuccessResponse } from "../format";

export async function collectionCarClass(
    ctx: Context,
    state: OrderMachine,
): Promise<HandlerRouteResponse> {
    console.log('received classes', state.data.locationClasses)
    if(ctx.message.body === "00" && state.data.carClassesRebase){
        if (JSON.stringify(state.data.locationClasses) === JSON.stringify(['1','2','3'])) {
            state.data.carClass = null;
            state.data.locationClasses = undefined;
        } else if (JSON.stringify(state.data.locationClasses) === JSON.stringify(['2','3'])) {
            state.data.carClass = null;
            state.data.locationClasses = ['2','3'];
        }
    } else if (state.data.carClassesRebase && !state.data.carClassesRebase[ctx.message.body]) {
        await ctx.chat.sendMessage(
            ctx.constants.getPrompt(
                localizationNames.commandNotFound,
                ctx.user.settings.lang.api_id,
            ),
        );
        return SuccessResponse;
    } else {
        if (state.data.carClassesRebase) {
            state.data.carClass = state.data.carClassesRebase[ctx.message.body].id;
        } else {
            state.data.carClass = ctx.message.body;
        }
    }
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
    console.log('TEST-CCCL-MAP:\ncarClasses: ' + state.data.carClass + '\nlocationClasses: ' + state.data.locationClasses);
    return SuccessResponse;
}
