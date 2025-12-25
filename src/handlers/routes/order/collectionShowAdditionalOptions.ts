import { localizationNames } from "../../../l10n";
import { OrderMachine } from "../../../states/machines/orderMachine";
import { Context } from "../../../types/Context";
import { HandlerRouteResponse, SuccessResponse } from "../format";
import { makeCurrencySymbol } from "../../order";

export async function collectionShowAdditionalOptions(
    ctx: Context,
    state: OrderMachine,
): Promise<HandlerRouteResponse> {
    if (ctx.message.body === "1") {
        state.state = "collectionAdditionalOptions";
        state.data.nextStateForAI = "collectionAdditionalOptions";
        await ctx.storage.push(ctx.userID, state);
    } else if (ctx.message.body === "2") {
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
        return { status: "success" };
    } else {
        await ctx.chat.sendMessage(
            ctx.constants.getPrompt(
                localizationNames.commandNotFound,
                ctx.user.settings.lang.api_id,
            ),
        );
        return SuccessResponse;
    }

    const MAX_BOOKING_COMMENT_ID = 20;
    var text =
        ctx.constants.getPrompt(
            localizationNames.selectAdditionalOptions,
            ctx.user.settings.lang.api_id,
        ) + "\n";
    for (let i in ctx.constants.data.data.booking_comments) {
        if (
            Number(i) < MAX_BOOKING_COMMENT_ID &&
            !ctx.constants.data.data.booking_comments[i].options.hidden
        ) {
            text +=
                (ctx.configName==="children" ? "*" : "") +i.toString()+(ctx.configName==="children" ? "*" : "") +
                (ctx.configName==="children" ? "    " : ". ") +(ctx.configName==="children" ? "_" : "")+
                ctx.constants.data.data.booking_comments[i][
                    ctx.user.settings.lang.iso
                ] +
                (ctx.configName == "children" ||
                ctx.constants.data.data.booking_comments[i].options.priceHidden
                    ? ""
                    : " ( " +
                      makeCurrencySymbol(
                          ctx.constants.data.data.booking_comments[i].options
                              .price,
                          ctx.constants.data.default_currency,
                      ) +
                      " )") + (ctx.configName==="children" ? "_" : "")+"\n";
        }
    }
    await ctx.chat.sendMessage(text);
    return SuccessResponse;
}
