import { Context } from "../index";
import {
    newEmptyOrder,
    newVoting,
    OrderMachine,
} from "../states/machines/orderMachine";
import { localization, localizationNames } from "../l10n";
import { OrderObserverCallback } from "../observer/order";
import { Order } from "../api/order";
import { constants } from "../constants";
import {
    GetLocation,
    GetTimestamp,
    parseGetLocationException,
} from "../utils/orderUtils";
import { formatDateHuman, formatString } from "../utils/formatter";
import { newRide, newVote } from "../states/machines/rideMachine";
import { getRouteInfo } from "../api/osrm";
import { Location } from "../states/types";
import { MultiUsersRefCodes } from "../ServiceMap";

interface PriceCalculationParams {
    /*    base_price: number;
    distance: number;
    price_per_km: number;
    duration: number;
    price_per_minute: number;
    time_ratio: number;
    options_sum: number;*/
    [key: string]: any;
}

interface PriceModel {
    formula: string;
    price: string;
    options: PriceCalculationParams;
    calculationType?: string;
}

function simplifyExpression(expr: string): string {
    // Удаляем пробелы для удобства обработки
    expr = expr.replace(/\s+/g, '');

    // Регулярное выражение для поиска ( ... ) * 1 (в любом виде)
    const regex = /(\(([^()]+)\)|([a-zA-Z]\w*|\d+\.?\d*(?:[eE][+-]?\d+)?))\*1(?:\.0+)?(?:[eE]0)?\b/g;

    // Заменяем (expr)*1 → expr и var*1 → var (но сохраняет 123*1, если это не "1")
    let newExpr = expr.replace(regex, (match, group) => {
        if (group.startsWith('(') && group.endsWith(')')) {
            return group.slice(1, -1); // Убираем скобки
        }
        // Проверяем, является ли множитель "1" (включая 1.0, 1e0 и т.д.)
        const multiplier = match.substring(group.length + 1); // часть после "*"
        if (isNumericOne(multiplier)) {
            return group; // Убираем *1, оставляя основное выражение
        }
        return match; // Оставляем как есть (например, 5*1 останется)
    });

    // Рекурсивная обработка, если были изменения
    if (newExpr !== expr) {
        return simplifyExpression(newExpr);
    }

    return newExpr;
}
function isNumericOne(s: string): boolean {
    if (s === "1") return true;
    const num = parseFloat(s);
    if (isNaN(num)) return false;
    return Math.abs(num - 1) < 1e-10; // Учитывает погрешность для дробных чисел
}
export function calculatePrice(
    formula: string,
    params: PriceCalculationParams = {
        base_price: 0,
        distance: 0,
        price_per_km: 0,
        duration: 0,
        price_per_minute: 0,
        time_ratio: 0,
        options_sum: 0,
        submit_price: 0,
        car_class_ratio: null
    },
    calculationType: string = "full",
): string {
    try {
        // Заменяем переменные в формуле на их значения
        let evaluatedFormula = formula;
        for(const [key, value] of Object.entries(params)) {
            if(value !== null) {
                evaluatedFormula = evaluatedFormula.replace(key, (value || 0).toString());
            }
        }

        // Вычисляем выражение
        const result = eval(evaluatedFormula);

        // Проверяем, что результат является числом
        if (typeof result !== "number" || isNaN(result)) {
            throw new Error("Invalid calculation result");
        }

        // Округляем до 2 знаков после запятой
        return Math.trunc(result).toString();
    } catch (error) {
        console.error(
            "Failed to calculate price: " +
                (error instanceof Error
                    ? error.message + "STACK: " + JSON.stringify(params)
                    : "Unknown error"),
        );
        return "0";
    }
}
export function formatPriceFormula(
    formula: string,
    params: PriceCalculationParams,
    calculationType: string = "full",
): string {
    try {
        // Сначала заменим все переменные на их значения
        let formattedFormula = formula;
        const variables = [
            "base_price",
            "distance",
            "price_per_km",
            "duration",
            "price_per_minute",
            "time_ratio",
            "options_sum",
            "submit_price",
            "car_class_ratio",
        ];
        const incompleteteVariables = ["distance", "duration"];

        for (const variable of variables) {
            let value = params[variable];
            console.log(
                "var: " + variable + ", val: " + value,
                incompleteteVariables.includes(variable),
            );
            if (
                calculationType === "incomplete" &&
                incompleteteVariables.includes(variable)
            ) {
                console.log("filling incomplete variable: " + variable);
                value = "?";
            } else {
                if (variable.endsWith('ratio') && value%1 !== 0) {
                    value = value.toFixed(2);
                } else {
                    value = Math.trunc(value);
                }

            }
            const regex = new RegExp(variable, "g");
            formattedFormula = formattedFormula.replace(
                regex,
                value.toString(),
            );
        }
        console.log("Formatted formula: " + formattedFormula);

        // Если time_ratio равен 1, попробуем упростить выражения вида (X)*1
        /*if (params.time_ratio === 1) {
            // Ищем все выражения в скобках, умноженные на 1
            formattedFormula = formattedFormula.replace(
                /\(([^()]+)\)\s*\*\s*1(?!\d)/g,
                "$1",
            );
        }
        if (params.car_class_ratio === 1) {
            // Ищем все выражения в скобках, умноженные на 1
            formattedFormula = formattedFormula.replace(
                /\(([^()]+)\)\s*\*\s*1(?!\d)/g,
                "$1",
            );
        }*/
        formattedFormula = simplifyExpression(formattedFormula);
        console.log("Formatted formula: " + formattedFormula);

        // Добавляем пробелы вокруг операторов для лучшей читаемости
        formattedFormula = formattedFormula
            .replace(/\*/g, "*")
            .replace(/\+/g, "+")
            .replace(/\-/g, "-")
            .replace(/\//g, "/")
            .replace(/\(/g, "(")
            .replace(/\)/g, ")")
            // Убираем лишние пробелы
            .replace(/\s+/g, "")
            .trim();

        return formattedFormula;
    } catch (error) {
        console.error("Error formatting price formula:", error);
        throw new Error(
            "Failed to format price formula: " +
                (error instanceof Error ? error.message : "Unknown error"),
        );
    }
}

export async function calculateOrderPrice(
    ctx: Context,
    from: Location,
    to: Location,
    pricingModels: any,
    isVoting: boolean,
    additionalOptions: number[],
    submitPrice?: number,
    carClass?: string | null,
): Promise<PriceModel> {
    /*if (!from?.latitude || !to?.latitude) {
        console.log('Skipping price calculation due to missing location');
        return {
            formula: '-',
            price: 0,
            options: {}
        };
    }*/
    let calculationType: string = "incomplete";

    try {
        const priceModel = pricingModels[isVoting ? "voting" : "basic"];

        // Добавляем значения по умолчанию на случай ошибки OSRM
        let distance = null;
        let duration = null;

        if (from.latitude && from.longitude && to.latitude && to.longitude) {
            try {
                const routeInfo = await getRouteInfo(from, to);
                distance = routeInfo.distance;
                duration = routeInfo.duration;
                calculationType = "full";
            } catch (error) {
                console.error(
                    "Failed to get route info, using straight-line distance",
                );
                // Вычисляем примерное расстояние по прямой линии
                if (
                    from.latitude &&
                    to.latitude &&
                    from.longitude &&
                    to.longitude
                ) {
                    const R = 6371e3; // радиус Земли в метрах
                    const φ1 = (from.latitude * Math.PI) / 180;
                    const φ2 = (to.latitude * Math.PI) / 180;
                    const Δφ = ((to.latitude - from.latitude) * Math.PI) / 180;
                    const Δλ =
                        ((to.longitude - from.longitude) * Math.PI) / 180;

                    const a =
                        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                        Math.cos(φ1) *
                            Math.cos(φ2) *
                            Math.sin(Δλ / 2) *
                            Math.sin(Δλ / 2);
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

                    distance = R * c; // в метрах
                    duration = distance / 8.33; // примерно 30 км/ч в м/с
                }
            }
        } else {
            distance = 0;
            duration = 0;
        }

        const now = new Date();
        const gmtPlus1 = new Date(now.getTime() + 60 * 60 * 1000);
        const currentHour = gmtPlus1.getUTCHours();

        const isDayTime = currentHour >= 6 && currentHour < 21;
        const timeRatio = isDayTime
            ? priceModel.constants.time_ratio.day
            : priceModel.constants.time_ratio.night;
        const carClassRatio = carClass ?priceModel.constants.car_class_ratio[carClass] : 1;
        const params = {
            base_price: priceModel.constants.base_price,
            distance: (distance || 0) / 1000,
            price_per_km: priceModel.constants.price_per_km,
            duration: (duration || 0) / 60,
            price_per_minute: priceModel.constants.price_per_minute,
            time_ratio: timeRatio,
            options_sum: additionalOptions.reduce(
                (sum, option) =>
                    sum +
                    ctx.constants.data.data.booking_comments[String(option)]
                        .options.price,
                0,
            ),
            submit_price: 0 || submitPrice,
            car_class_ratio: carClassRatio,
        };
        console.log("PARAMS", params);

        const price = calculatePrice(priceModel.model.expression, params);

        return {
            formula: priceModel.model.expression,
            price: price,
            options: {
                ...params,
            },
            calculationType: calculationType,
        };
    } catch (error) {
        console.error("Price calculation error:", error);
        throw new Error("ROUTE_SERVICE_UNAVAILABLE");
    }
}

async function formatOrderConfirmation(
    ctx: Context,
    state: OrderMachine,
    priceModel: PriceModel,
): Promise<string> {
    console.log('formatOrderConfirmation', state, priceModel);
    const user = await ctx.usersList.pull(ctx.userID);
    return formatString(
        ctx.constants.getPrompt(
            user.referrer_u_id === MultiUsersRefCodes[ctx.botID].test
                ? localizationNames.collectionOrderConfirmTestMode
                : localizationNames.collectionOrderConfirm,
            ctx.user.settings.lang.api_id,
        ),
        {
            from:
                state.data.from?.address ??
                `${state.data.from.latitude} ${state.data.from.longitude}`,
            to:
                state.data.to?.address ??
                `${state.data.to.latitude} ${state.data.to.longitude}`,
            peoplecount: state.data.peopleCount.toString(),
            when: formatDateHuman(state.data.when ?? null, ctx),
            options:
                state.data.additionalOptions.length > 0
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
                                  " )",
                          )
                          .join(", ")
                    : "",
            price:
                priceModel.price === "0"
                    ? "-"
                    : makeCurrencySymbol(priceModel.price +
                      (priceModel.calculationType === "incomplete"
                          ? " + ?"
                          : "") ,
                      ctx.constants.data.default_currency),
            formula: formatPriceFormula(
                priceModel.formula,
                priceModel.options,
                !!state.data.from.latitude &&
                    !!state.data.from.longitude &&
                    !!state.data.to.latitude &&
                    !!state.data.to.longitude
                    ? "full"
                    : "incomplete",
            ),
            class: state.data.carClass? ctx.constants.data.data.car_classes[state.data.carClass][ctx.user.settings.lang.iso] : ctx.constants.getPrompt(localizationNames.anyClass, ctx.user.settings.lang.api_id),
        },
    );
}

function makeCurrencySymbol(price: string, currency: string): string {
    if(currency==="EUR"){
        return "€" + price
    } else {
        return price + " " + currency
    }
}
export async function OrderHandler(ctx: Context) {
    let state: OrderMachine | null = await ctx.storage.pull(ctx.userID);

    if (state === null) {
        // Если состояния нет, создаем новое
        state = newEmptyOrder();
    }
    const exitAvailableStates = [
        "collectionFrom",
        "collectionTo",
        "collectionHowManyPeople",
        "collectionWhen",
        "collectionOrderConfirm",
        "collectionCarCode",
        "collectionShowAdditionalOptions",
        "collectionAdditionalOptions",
        "collectionCarClass",
    ];
    console.log(state.state,state.data.priceModel);
    if (
        exitAvailableStates.includes(state.state) &&
        (ctx.message.body.toLowerCase() ===
            ctx.constants.getPrompt(
                localizationNames.cancelLower,
                ctx.user.settings.lang.api_id,
            ) ||
            ctx.message.body.toLowerCase() ===
                ctx.constants.getPrompt(
                    localizationNames.cancelDigital,
                    ctx.user.settings.lang.api_id,
                ))
    ) {
        // Отмена создания заказа доступная после задания начальной точки
        await ctx.storage.delete(ctx.userID);
        await ctx.chat.sendMessage(
            ctx.constants.getPrompt(
                localizationNames.orderCreatingCancel,
                ctx.user.settings.lang.api_id,
            ),
        );
        await ctx.chat.sendMessage(
            ctx.constants.getPrompt(
                localizationNames.defaultPrompt,
                ctx.user.settings.lang.api_id,
            ),
        );
        return;
    }

    switch (state.state) {
        case "collectionOrderConfirm":
            // Собираем подтверждение и создаём заказ.
            if (ctx.message.body.toLowerCase() !== "1") {
                await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(
                        localizationNames.confirmPrompt,
                        ctx.user.settings.lang.api_id,
                    ),
                );
                break;
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
                    break;
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

                await ctx.chat.sendMessage(
                    "TEST POINT: VOTING DRIVE ID: " + order.id,
                );
                await new Promise((f) =>
                    setTimeout(f, constants.orderMessageDelay),
                );
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
            }

            const order = new Order(
                ctx.userID,
                ctx.auth,
                observer.callback.bind(observer),
                async () => {},
            );

            try {
                if (state.data.when === undefined)
                    throw "The meaning of when is undefined";
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
                ctx.logger.error(
                    `OrderHandler: Error when creating an order: ${e}`,
                );
                await orderMsg.edit(
                    ctx.constants.getPrompt(
                        localizationNames.errorWhenCreatingOrder,
                        ctx.user.settings.lang.api_id,
                    ),
                );
                break;
            }
            const newState = newRide(order);
            await ctx.storage.push(ctx.userID, newState);
            await new Promise((f) =>
                setTimeout(f, constants.orderMessageDelay),
            );
            await orderMsg.edit(
                ctx.constants.getPrompt(
                    localizationNames.orderCreated,
                    ctx.user.settings.lang.api_id,
                ),
            );
            break;
        case "collectionWhen":
            // Собираем информацию о времени.
            // В этот стейт также попадает активация режима голосования
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
                    state.data.carClass
                );

                state.data.voting = true;
                state.data.when = null;
                state.state = "collectionOrderConfirm";
                const response = await formatOrderConfirmation(ctx, state, state.data.priceModel);
                state.data.nextMessageForAI = response;
                state.data.nextStateForAI = "collectionOrderConfirm";
                await ctx.storage.push(ctx.userID, state);
                break;
            }

            // Здесь нужно привести все варианты ответов к русскому языку
            var msg_body_for_timestamp;
            if (
                ctx.message.body.toLowerCase() ===
                    ctx.constants.getPrompt(
                        localizationNames.nowLower,
                        ctx.user.settings.lang.api_id,
                    ) ||
                ctx.message.body.toLowerCase() === "2"
            ) {
                msg_body_for_timestamp = "сейчас";
            } else {
                msg_body_for_timestamp = ctx.message.body;
            }

            const timestamp = await GetTimestamp(
                msg_body_for_timestamp,
                ctx.constants.getPrompt(
                    localizationNames.tomorrowLower,
                    ctx.user.settings.lang.api_id,
                ),
            );
            await ctx.chat.sendMessage(
                "TEST POINT: RECEIVED +01:00 TIME: " +
                    new Date(new Date().getTime() + 3600 * 1000)
                        .toUTCString()
                        .replace(/ GMT$/, ""),
            );

            let calculatingRouteMessage;
            if (state.data.from.latitude && state.data.to.latitude) {
                calculatingRouteMessage = await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(
                        localizationNames.calculatingRoute,
                        ctx.user.settings.lang.api_id,
                    ),
                );
            }

            if (timestamp === undefined) {
                await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(
                        localizationNames.getTimestampError,
                        ctx.user.settings.lang.api_id,
                    ),
                );
                break;
            }
            if (timestamp !== null && "getTime" in timestamp) {
                console.log(
                    parseInt(
                        String(
                            Date.parse(
                                new Date(new Date().getTime() + 3600 * 1000)
                                    .toUTCString()
                                    .replace(/ GMT$/, ""),
                            ) / 1000,
                        ),
                    ) -
                        timestamp?.getTime() / 1000,
                );
            }
            if (
                timestamp !== null &&
                parseInt(
                    String(
                        Date.parse(
                            new Date(new Date().getTime() + 3600 * 1000)
                                .toUTCString()
                                .replace(/ GMT$/, ""),
                        ) / 1000,
                    ),
                ) -
                    timestamp.getTime() / 1000 >
                    0
            ) {
                await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(
                        localizationNames.timestampTimeout,
                        ctx.user.settings.lang.api_id,
                    ),
                );
                break;
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
                state.data.carClass
            );
            const response = await formatOrderConfirmation(ctx, state, state.data.priceModel);
            state.data.nextMessageForAI = response;
            state.data.nextStateForAI = "collectionOrderConfirm";
            await ctx.chat.sendMessage(response);
            await ctx.storage.push(ctx.userID, state);
            break;
        case "collectionAdditionalOptions":
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
                break;
            }
            const msg = ctx.message.body.replace(/\s{2,}/g, " ");
            let successFlag = true;
            for (let i = 0; i < msg.split(" ").length; i++) {
                if (
                    msg.split(" ")[i] in
                    [
                        "1",
                        "2",
                        "3",
                        "4",
                        "5",
                        "6",
                        "7",
                        "8",
                        "9",
                        "10",
                        "11",
                        "12",
                        "13",
                        "14",
                        "15",
                        "16",
                        "17",
                        "18",
                        "19",
                        "20",
                    ]
                ) {
                    state.data.additionalOptions.push(
                        Number(msg.split(" ")[i]),
                    );
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
                break;
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
            break;
        case "collectionShowAdditionalOptions":
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
                break;
            } else {
                await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(
                        localizationNames.commandNotFound,
                        ctx.user.settings.lang.api_id,
                    ),
                );
                break;
            }

            const MAX_BOOKING_COMMENT_ID = 20;
            var text =
                ctx.constants.getPrompt(
                    localizationNames.selectAdditionalOptions,
                    ctx.user.settings.lang.api_id,
                ) + "\n";
            for (let i in ctx.constants.data.data.booking_comments) {
                if (Number(i) < MAX_BOOKING_COMMENT_ID && !ctx.constants.data.data.booking_comments[i].options.hidden) {
                    text +=
                        i.toString() +
                        ". " + ctx.constants.data.data.booking_comments[i][ctx.user.settings.lang.iso] +
                        ((ctx.configName=="children" || ctx.constants.data.data.booking_comments[i].options.priceHidden) ? "" : " ( " + makeCurrencySymbol(ctx.constants.data.data.booking_comments[i].options.price, ctx.constants.data.default_currency )+ " )") + "\n";
                }
            }
            await ctx.chat.sendMessage(text);
            break;
        case "collectionCarClass":
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
                break;
            }
            if (!ctx.constants.data.data.car_classes[ctx.message.body]) {
                await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(
                        localizationNames.commandNotFound,
                        ctx.user.settings.lang.api_id,
                    ),
                );
                break;
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
            break;
        case "collectionShowCarClass":
            if (ctx.message.body === "1") {
                const car_classes = ctx.constants.data.data.car_classes;
                let text = ctx.constants.getPrompt(localizationNames.selectCarClass, ctx.user.settings.lang.api_id);
                for (let i in car_classes) {
                    text += i.replace(' ','') + '. ' + car_classes[i][ctx.user.settings.lang.iso]+'\n';
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
            }
            break;
        case "collectionHowManyPeople":
            const peopleCount = Number(ctx.message.body);
            if (ctx.message.body.length === 0) {
                await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(
                        localizationNames.incorrectTextMessageType,
                        ctx.user.settings.lang.api_id,
                    ),
                );
                break;
            }
            if (isNaN(peopleCount)) {
                await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(
                        localizationNames.incorrectNumeric,
                        ctx.user.settings.lang.api_id,
                    ),
                );
                break;
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
                break;
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
                break;
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
                await ctx.chat.sendMessage(ctx.constants.getPrompt(localizationNames.askShowCarClass, ctx.user.settings.lang.api_id));
                break;
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
            break;
        case "collectionTo":
            // Собираем информацию о конечной точке
            try {
                const location = await GetLocation(
                    ctx.message,
                    ctx.userID,
                    ctx.storage,
                    state,
                    ctx,
                );

                if (typeof location != "string") {
                    state.data.to = location;
                    state.state = "collectionHowManyPeople";
                    state.data.nextStateForAI = "collectionHowManyPeople";
                    state.data.nextMessageForAI = ctx.constants.getPrompt(
                        localizationNames.collectionPeopleCount,
                        ctx.user.settings.lang.api_id,
                    );
                    await ctx.storage.push(ctx.userID, state);
                    await ctx.chat.sendMessage(
                        ctx.constants.getPrompt(
                            localizationNames.collectionPeopleCount,
                            ctx.user.settings.lang.api_id,
                        ),
                    );
                    break;
                }

                await ctx.chat.sendMessage(location);
            } catch (e) {
                ctx.logger.error(`OrderHandler: ${e}`);
                const response = formatString(
                    ctx.constants.getPrompt(
                        localizationNames.errorGeolocation,
                        ctx.user.settings.lang.api_id,
                    ),
                    {
                        error: await parseGetLocationException(String(e), ctx),
                    },
                );
                await ctx.chat.sendMessage(response);
            }

            break;
        default:
            // Если состояние не найдено, создаем новое
            // и собираем информацию о начальной точке.
            try {
                const location = await GetLocation(
                    ctx.message,
                    ctx.userID,
                    ctx.storage,
                    state,
                    ctx,
                );

                if (typeof location != "string") {
                    state.data.from = location;
                    state.state = "collectionTo";
                    state.data.nextStateForAI = "collectionTo";
                    state.data.nextMessageForAI = ctx.constants.getPrompt(
                        localizationNames.collectionTo,
                        ctx.user.settings.lang.api_id,
                    );
                    await ctx.storage.push(ctx.userID, state);
                    await ctx.chat.sendMessage(
                        ctx.constants.getPrompt(
                            localizationNames.collectionTo,
                            ctx.user.settings.lang.api_id,
                        ),
                        { linkPreview: false },
                    );
                    break;
                }

                await ctx.chat.sendMessage(location, { linkPreview: false });
            } catch (e) {
                ctx.logger.error(`OrderHandler: ${e}`);
                const response = formatString(
                    ctx.constants.getPrompt(
                        localizationNames.errorGeolocation,
                        ctx.user.settings.lang.api_id,
                    ),
                    {
                        error: await parseGetLocationException(String(e), ctx),
                    },
                );
                await ctx.chat.sendMessage(response);
            }
            break;
    }
}
