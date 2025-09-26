import { localizationNames } from "../../../l10n";
import { OrderMachine } from "../../../states/machines/orderMachine";
import { Context } from "../../../index";
import { HandlerRouteResponse, SuccessResponse } from "../format";
import {
    getDriverList,
    GetTimestamp,
    DriverSearchManager,
} from "../../../utils/orderUtils";
import { OrderObserverCallback } from "../../../observer/order";
import { Order } from "../../../api/order";
import { constants } from "../../../constants";
import { newRide, newVote } from "../../../states/machines/rideMachine";
import { getLocalizationText } from "../../../utils/textUtils";
import { Message } from "whatsapp-web.js";

export async function formatDriversList(
    drivers: {
        id_user: string;
        phone: string;
        name: string;
        [key: string]: any;
    }[],
) {
    let text = "";
    let drivers_map: { [key: string]: string } = {};
    for (let i = 0; i < drivers.length; i++) {
        text += `${i + 1}. ${drivers[i].name} - ${drivers[i].phone}\n`;
        drivers_map[(i + 1).toString()] = drivers[i].id_user;
    }
    return {
        text: text,
        drivers_map: drivers_map,
    };
}

export async function collectionOrderConfirm(
    ctx: Context,
    state: OrderMachine,
): Promise<HandlerRouteResponse> {
    // Собираем подтверждение и создаём заказ.
    if (ctx.message.body !== "1") {
        await ctx.chat.sendMessage(
            ctx.constants.getPrompt(
                localizationNames.confirmPrompt,
                ctx.user.settings.lang.api_id,
            ),
        );
        return SuccessResponse;
    }

    if (ctx.configName === "children") {
        const latitude = 43.26275; //await input("LATITUDE? ");
        const longitude = -2.92528; //await input("LONGITUDE? ");
        console.log("INJECTED: " + latitude + " " + longitude);
        //state.data.from.latitude = latitude;
        //state.data.from.longitude = longitude;

        state.data.waitingForDrivers = true;
        await ctx.storage.push(ctx.userID, state);
        const searchMsg = await ctx.chat.sendMessage(
            getLocalizationText(ctx, localizationNames.searchingForDrivers),
        );
        state.data.driverSearchManager.start(ctx, state, searchMsg);
        return SuccessResponse;
    }

    const chat = await ctx.message.getChat();
    const orderMsg = await chat.sendMessage(
        ctx.constants.getPrompt(
            localizationNames.creatingOrder,
            ctx.user.settings.lang.api_id,
        ),
    );

    const observer = new OrderObserverCallback(
        ctx.client,
        chat.id,
        ctx.logger,
        ctx.userID,
        ctx.storage,
        ctx.constants,
        ctx.user.settings.lang.api_id,
    );

    if (state.data.voting) {
        const order = new Order(
            ctx.userID,
            ctx.auth,
            observer.callback.bind(observer),
            async () => {},
            true,
        );
        const timestamp = await GetTimestamp("сейчас"); // здесь язык не важен

        if (
            timestamp === undefined ||
            (timestamp !== null && Date.now() - timestamp.getTime() > 0)
        ) {
            return SuccessResponse;
        }

        const b_driver_code = await order.new(
            state.data.from,
            state.data.to,
            timestamp,
            state.data.peopleCount,
            constants.maxWaitingTimeSecs,
            ctx.chat,
            ctx,
            state.data.additionalOptions,
            state.data.priceModel,
        );

        await ctx.chat.sendMessage("TEST POINT: VOTING DRIVE ID: " + order.id);
        await new Promise((f) => setTimeout(f, constants.orderMessageDelay));
        await orderMsg.edit(
            ctx.constants.getPrompt(
                localizationNames.votingActivated,
                ctx.user.settings.lang.api_id,
            ),
        );
        await ctx.chat.sendMessage(
            ctx.constants
                .getPrompt(
                    localizationNames.votingVerificationCode,
                    ctx.user.settings.lang.api_id,
                )
                .replace("%code%", b_driver_code),
        );
        const newState = newVote(order);

        await ctx.storage.push(ctx.userID, newState);
        return SuccessResponse;
    }

    const order = new Order(
        ctx.userID,
        ctx.auth,
        observer.callback.bind(observer),
        async () => {},
    );

    try {
        if (state.data.when === undefined)
            return {
                status: "error",
                message: ctx.constants.getPrompt(
                    localizationNames.errorWhenCreatingOrder,
                    ctx.user.settings.lang.api_id,
                ),
                details: {
                    state: state,
                    error: "when is undefined",
                },
            };
        await order.new(
            state.data.from,
            state.data.to,
            state.data.when,
            state.data.peopleCount,
            constants.maxWaitingTimeSecs,
            ctx.chat,
            ctx,
            state.data.additionalOptions,
            state.data.priceModel,
        );

        await ctx.chat.sendMessage("TEST POINT: DRIVE ID: " + order.id);
    } catch (e) {
        ctx.logger.error(`OrderHandler: Error when creating an order: ${e}`);
        await orderMsg.edit(
            ctx.constants.getPrompt(
                localizationNames.errorWhenCreatingOrder,
                ctx.user.settings.lang.api_id,
            ),
        );
        return SuccessResponse;
    }
    const newState = newRide(order);
    await ctx.storage.push(ctx.userID, newState);
    await new Promise((f) => setTimeout(f, constants.orderMessageDelay));
    await orderMsg.edit(
        ctx.constants.getPrompt(
            localizationNames.orderCreated,
            ctx.user.settings.lang.api_id,
        ),
    );
    return SuccessResponse;
}
