import { localizationNames } from "../../../l10n";
import { OrderMachine } from "../../../states/machines/orderMachine";
import { Context } from "../../../types/Context";
import { HandlerRouteResponse, SuccessResponse } from "../format";
import { calculateOrderPrice, formatOrderConfirmation } from "../../order";
import { GetTimestamp } from "../../../utils/orderUtils";
import { getLocalizationText } from "../../../utils/textUtils";
import {
    getCitiesByDriveStartLoc,
    getDriversForCity,
    getDriversForCityNight,
    isNightTime,
} from "../../../api/sql_templates";
import {MultiUsersRefCodes} from "../../../ServiceMap";
import {formatDateHuman} from "../../../utils/formatter";

function getMaroccoTime() {
    return new Date(new Date().getTime() + 3600 * 1000)
        .toUTCString()
        .replace(/ GMT$/, "");
}
export async function collectionWhen(
    ctx: Context,
    state: OrderMachine,
): Promise<HandlerRouteResponse> {
    if (ctx.message.body === "3" && ctx.configName === "children") {
        await ctx.chat.sendMessage(
            getLocalizationText(ctx, localizationNames.commandNotFound),
        );
        return SuccessResponse;
    }
    if(ctx.message.body === "3" && ctx.configName === "truck") {
        state.data.voting = true;
        state.data.when = null;
        state.state = "collectionOrderConfirm";
        await ctx.storage.push(ctx.userID, state);
        await ctx.chat.sendMessage(
            "=Данные по заказу voting, подтверждаете?"
        )
        return SuccessResponse;
    }
    if (ctx.message.body === "3" && ctx.configName !== "truck") {
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
            state.data.truck_floornumber,
            state.data.truck_gross_weight,
            state.data.truck_count
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
        await ctx.chat.sendMessage(response);
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
        state.data.truck_floornumber,
        state.data.truck_gross_weight,
        state.data.truck_count
    );
    if(ctx.configName === "truck") {
        state.data.nextMessageForAI = await truck_formatOrderConfirmation(ctx,state);
        state.data.nextStateForAI = "collectionOrderConfirm";
        await ctx.chat.sendMessage(await truck_formatOrderConfirmation(ctx,state));
        await ctx.storage.push(ctx.userID, state);
        return SuccessResponse;
    }

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

async function truck_formatOrderConfirmation(
    ctx: Context,
    state: OrderMachine,
) : Promise<string> {
    const user = await ctx.usersList.pull(ctx.userID);
    let template = ctx.constants.getPrompt(
        user.referrer_u_id === MultiUsersRefCodes[ctx.botID].test
            ? localizationNames.collectionOrderConfirmTestMode
            : localizationNames.collectionOrderConfirm,
        ctx.user.settings.lang.api_id,
    )
    template = template.replace('%from%', `${state.data.from.latitude} ${state.data.from.longitude}`)
    template = template.replace('%to%', `${state.data.to.latitude} ${state.data.to.longitude}`)
    template = template.replace('%units%', (state.data.truck_count || 0).toString())
    template = template.replace("%weight%", (state.data.truck_gross_weight || 0).toString() + ' ' + ctx.constants.getPrompt(localizationNames.kg, ctx.user.settings.lang.api_id))
    template = template.replace("%floors%", (state.data.truck_floornumber || 0).toString())
    template = template.replace("%when%", formatDateHuman(state.data.when ?? null, ctx))
    template = template.replace("%class%", state.data.carClass
        ? ctx.constants.data.data.car_classes[state.data.carClass][
            ctx.user.settings.lang.iso
            ]
        : ctx.constants.getPrompt(
            localizationNames.anyClass,
            ctx.user.settings.lang.api_id,
        ))
    template = template.replace("%options%", state.data.additionalOptions.length > 0
        ? state.data.additionalOptions
            .map(
                (i) =>
                    ctx.constants.data.data.booking_comments[i][
                        ctx.user.settings.lang.iso
                        ] +
                    " ( " +
                    ctx.constants.data.data.booking_comments[i]
                        .options.price +
                    ctx.constants.data.default_currency +
                    " )" + (ctx.configName === "children" ? '_' : ''),
            )
            .join(', ')
        : getLocalizationText(ctx,localizationNames.noAdditionalOptions))

    return template
}