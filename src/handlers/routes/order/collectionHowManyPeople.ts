import { localizationNames } from "../../../l10n";
import { OrderMachine } from "../../../states/machines/orderMachine";
import { Context } from "../../../index";
import { HandlerRouteResponse, SuccessResponse } from "../format";
import { constants } from "../../../constants";

export async function collectionHowManyPeople(
    ctx: Context,
    state: OrderMachine,
): Promise<HandlerRouteResponse> {
    const peopleCount = Number(ctx.message.body);
    if (ctx.message.body.length === 0) {
        await ctx.chat.sendMessage(
            ctx.constants.getPrompt(
                localizationNames.incorrectTextMessageType,
                ctx.user.settings.lang.api_id,
            ),
        );
        return SuccessResponse;
    }
    if (isNaN(peopleCount)) {
        await ctx.chat.sendMessage(
            ctx.constants.getPrompt(
                localizationNames.incorrectNumeric,
                ctx.user.settings.lang.api_id,
            ),
        );
        return SuccessResponse;
    }
    if (peopleCount > constants.maxPeopleInOrder) {
        state.data.nextMessageForAI = ctx.constants.getPrompt(
            localizationNames.tooManyPeople,
            ctx.user.settings.lang.api_id,
        );
        await ctx.chat.sendMessage(
            ctx.constants.getPrompt(
                localizationNames.tooManyPeople,
                ctx.user.settings.lang.api_id,
            ),
        );
        return SuccessResponse;
    }
    if (peopleCount < constants.minPeopleInOrder) {
        state.data.nextMessageForAI = ctx.constants.getPrompt(
            localizationNames.tooFewPeople,
            ctx.user.settings.lang.api_id,
        );
        await ctx.chat.sendMessage(
            ctx.constants.getPrompt(
                localizationNames.tooFewPeople,
                ctx.user.settings.lang.api_id,
            ),
        );
        return SuccessResponse;
    }
    state.data.peopleCount = peopleCount;

    if (ctx.configName === "children") {
        state.state = "collectionShowCarClass";
        state.data.nextMessageForAI = ctx.constants.getPrompt(
            localizationNames.askShowCarClass,
            ctx.user.settings.lang.api_id,
        );
        state.data.nextStateForAI = "collectionShowCarClass";
        await ctx.storage.push(ctx.userID, state);
        await ctx.chat.sendMessage(
            ctx.constants.getPrompt(
                localizationNames.askShowCarClass,
                ctx.user.settings.lang.api_id,
            ),
        );
        return SuccessResponse;
    }

    state.state = "collectionShowAdditionalOptions";
    state.data.nextMessageForAI = ctx.constants.getPrompt(
        localizationNames.needAdditionalOptionsQuestion,
        ctx.user.settings.lang.api_id,
    );
    state.data.nextStateForAI = "collectionShowAdditionalOptions";
    await ctx.storage.push(ctx.userID, state);

    await ctx.chat.sendMessage(
        ctx.constants.getPrompt(
            localizationNames.needAdditionalOptionsQuestion,
            ctx.user.settings.lang.api_id,
        ),
    );
    return SuccessResponse;
}
