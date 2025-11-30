import {
    GetLocation,
    parseGetLocationException,
} from "../../../utils/orderUtils";
import { localizationNames } from "../../../l10n";
import { formatString } from "../../../utils/formatter";
import { OrderMachine } from "../../../states/machines/orderMachine";
import { Context } from "../../../types/Context";
import { HandlerRouteResponse, SuccessResponse } from "../format";
import { OrderObserverCallback } from "../../../observer/order";
import { Order } from "../../../api/order";
import { constants } from "../../../constants";
import { newRide } from "../../../states/machines/rideMachine";
import { getLocalizationText } from "../../../utils/textUtils";

// Парсер выбора водителей
function parseDriverSelection(
    input: string,
    driversMap: Record<string, string>,
    ctx: Context,
): { selected: string[] } | { error: string } {
    const trimmed = input.trim();
    const allNumbers = Object.keys(driversMap);

    if (trimmed === "01") {
        // Все водители
        return { selected: Object.values(driversMap) };
    }

    // Исключение водителей
    if (trimmed.startsWith("-")) {
        const numbers = trimmed.slice(1).split(/\s+/).filter(Boolean);
        if (numbers.length === 0) {
            return { error: getLocalizationText(ctx, localizationNames.noDriverNumbersForExclusion) };
        }
        // Проверка на валидность номеров
        for (const n of numbers) {
            if (!driversMap[n]) {
                return { error: getLocalizationText(ctx, localizationNames.incorrectDriverNumber).replace("%number%", n) };
            }
        }
        // Все кроме указанных
        const selected = allNumbers
            .filter((n) => !numbers.includes(n))
            .map((n) => driversMap[n]);
        return { selected };
    }

    // Выбор конкретных водителей
    const numbers = trimmed.split(/\s+/).filter(Boolean);
    if (numbers.length === 0) {
        return { error: getLocalizationText(ctx, localizationNames.noDriverNumbersSpecified) };
    }
    for (const n of numbers) {
        if (!driversMap[n]) {
            return { error: getLocalizationText(ctx, localizationNames.incorrectDriverNumber).replace("%number%", n) };
        }
    }
    const selected = numbers.map((n) => driversMap[n]);
    return { selected };
}

export async function children_collectionSelectBabySister(
    ctx: Context,
    state: OrderMachine,
): Promise<HandlerRouteResponse> {
    // Собираем нянь из списка и переходим к доп опциям
    const driversMap = state.data.driversMap as Record<string, string>;
    const result = parseDriverSelection(ctx.message.body, driversMap, ctx);
    if ("error" in result) {
        await ctx.chat.sendMessage(result.error);
        return SuccessResponse;
    }
    // result.selected — массив id водителей
    console.log(result);
    state.data.preferredDriversList = result.selected;
    // Здесь можно добавить переход к следующему шагу или отправку сообщения

    const orderMsg = await ctx.chat.sendMessage(
        ctx.constants.getPrompt(
            localizationNames.creatingOrder,
            ctx.user.settings.lang.api_id,
        ),
    );

    const observer = new OrderObserverCallback(
        ctx.client,
        ctx.chat.id,
        ctx.logger,
        ctx.userID,
        ctx.storage,
        ctx.constants,
        ctx.user.settings.lang.api_id,
    );

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
        console.log('Creating drive with b_waiting='+ctx.gfp_constants.data.maxDefaultDriveWaiting)
        await order.new(
            state.data.from,
            state.data.to,
            state.data.when,
            state.data.peopleCount,
            ctx.gfp_constants.data.maxDefaultDriveWaiting,
            ctx.chat,
            ctx,
            state.data.additionalOptions,
            state.data.priceModel,
        );

        const newState = newRide(order);
        await ctx.storage.push(ctx.userID, newState);

        await ctx.chat.sendMessage("TEST POINT: DRIVE ID=" + order.id);
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

    await new Promise((f) => setTimeout(f, constants.orderMessageDelay));
    await orderMsg.edit(
        ctx.constants.getPrompt(
            localizationNames.orderCreated,
            ctx.user.settings.lang.api_id,
        ),
    );
    return SuccessResponse;
}
