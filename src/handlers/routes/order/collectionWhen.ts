import { localizationNames } from "../../../l10n";
import { OrderMachine } from "../../../states/machines/orderMachine";
import { Context } from "../../../index";
import { HandlerRouteResponse, SuccessResponse } from "../format";
import { calculateOrderPrice, formatOrderConfirmation } from "../../order";
import { GetTimestamp } from "../../../utils/orderUtils";
import { getLocalizationText } from "../../../utils/textUtils";
import {
    getCityByDriveStartLoc,
    getDriversForCity,
    getDriversForCityNight,
    isNightTime,
} from "../../../api/sql_templates";

function getMaroccoTime() {
    return new Date(new Date().getTime() + 3600 * 1000)
        .toUTCString()
        .replace(/ GMT$/, "");
}
export async function collectionWhen(
    ctx: Context,
    state: OrderMachine,
): Promise<HandlerRouteResponse> {
    // Собираем информацию о времени.
    // В этот стейт также попадает активация режима голосования
    if (ctx.message.body === "3" && ctx.configName === "children") {
        await ctx.chat.sendMessage(
            getLocalizationText(ctx, localizationNames.commandNotFound),
        );
        return SuccessResponse;
    }
    if (ctx.message.body.toLowerCase() === "3") {
        const pricingModels = JSON.parse(
            ctx.constants.data.data.site_constants.pricingModels.value,
        ).pricing_models;
        state.data.priceModel = await calculateOrderPrice(
            ctx,
            state.data.from,
            state.data.to,
            pricingModels,
            true,
            state.data.additionalOptions ?? [],
            0,
            state.data.carClass,
        );

        state.data.voting = true;
        state.data.when = null;
        state.state = "collectionOrderConfirm";
        const response = await formatOrderConfirmation(
            ctx,
            state,
            state.data.priceModel,
        );
        state.data.nextMessageForAI = response;
        state.data.nextStateForAI = "collectionOrderConfirm";
        await ctx.storage.push(ctx.userID, state);
        return SuccessResponse;
    }

    const timestamp = await GetTimestamp(
        ctx.message.body === "2" ? "сейчас" : ctx.message.body,
        getLocalizationText(ctx, localizationNames.tomorrowLower),
    );

    let calculatingRouteMessage;
    if (state.data.from.latitude && state.data.to.latitude) {
        calculatingRouteMessage = await ctx.chat.sendMessage(
            getLocalizationText(ctx, localizationNames.calculatingRoute),
        );
    }

    if (timestamp === undefined) {
        await ctx.chat.sendMessage(
            getLocalizationText(ctx, localizationNames.getTimestampError),
        );
        return SuccessResponse;
    }
    if (
        timestamp !== null &&
        parseInt(String(Date.parse(getMaroccoTime()) / 1000)) -
            timestamp.getTime() / 1000 >
            0
    ) {
        await ctx.chat.sendMessage(
            getLocalizationText(ctx, localizationNames.timestampTimeout),
        );
        return SuccessResponse;
    }

    state.data.when = timestamp;
    state.state = "collectionOrderConfirm";
    const pricingModels = JSON.parse(
        ctx.constants.data.data.site_constants.pricingModels.value,
    ).pricing_models;
    state.data.priceModel = await calculateOrderPrice(
        ctx,
        state.data.from,
        state.data.to,
        pricingModels,
        false,
        state.data.additionalOptions ?? [],
        0,
        state.data.carClass,
    );

    const response = await formatOrderConfirmation(
        ctx,
        state,
        state.data.priceModel,
    );
    state.data.nextMessageForAI = response;
    state.data.nextStateForAI = "collectionOrderConfirm";
    await ctx.chat.sendMessage(response);
    await ctx.storage.push(ctx.userID, state);
    return SuccessResponse;
}
