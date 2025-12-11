import { Context } from "../types/Context";
import {
    newEmptyOrder,
    newVoting,
    OrderMachine,
} from "../states/machines/orderMachine";
import { localizationNames } from "../l10n";
import { OrderObserverCallback } from "../observer/order";
import { Order } from "../api/order";
import { constants } from "../constants";
import {
    GetLocation,
    GetTimestamp,
    parseGetLocationException,
    DriverSearchManager,
} from "../utils/orderUtils";
import { formatDateHuman, formatString } from "../utils/formatter";
import { newRide, newVote } from "../states/machines/rideMachine";
import { getRouteInfo } from "../api/osrm";
import { Location } from "../states/types";
import { MultiUsersRefCodes } from "../ServiceMap";
import { collectionFrom } from "./routes/order/collectionFrom";
import { collectionTo } from "./routes/order/collectionTo";
import { Logger } from "../utils/Logger";
import { collectionHowManyPeople } from "./routes/order/collectionHowManyPeople";
import { collectionShowCarClass } from "./routes/order/collectionShowCarClass";
import { collectionCarClass } from "./routes/order/collectionCarClass";
import { collectionShowAdditionalOptions } from "./routes/order/collectionShowAdditionalOptions";
import { collectionAdditionalOptions } from "./routes/order/collectionAdditionalOptions";
import { collectionWhen } from "./routes/order/collectionWhen";
import { collectionOrderConfirm } from "./routes/order/collectionOrderConfirm";
import { handleRoute } from "./routes/format";
import { children_collectionTime } from "./routes/order/children_collectionTime";
import { children_collectionChildrenCount } from "./routes/order/children_collectionChildrenCount";
import { children_collectionSelectBabySisterRange } from "./routes/order/children_collectionSelectBabySisterRange";
import { children_collectionSelectBabySister } from "./routes/order/children_collectionSelectBabySister";
import {getLocalizationText} from "../utils/textUtils";
import {getPriceParams} from "../utils/getCarPriceParams";
import PriceModel from "../types/Price/PriceModel";
import PriceCalculationParams from "../types/Price/PriceCalculationParams";



const logger = new Logger("OrderHandler", "#12b095");




function simplifyExpression(expr: string): string {
    // Удаляем пробелы для удобства обработки
    expr = expr.replace(/\s+/g, "");

    // Регулярное выражение для поиска ( ... ) * 1 (в любом виде)
    const regex =
        /(\(([^()]+)\)|([a-zA-Z]\w*|\d+\.?\d*(?:[eE][+-]?\d+)?))\*1(?:\.0+)?(?:[eE]0)?\b/g;

    // Заменяем (expr)*1 → expr и var*1 → var (но сохраняет 123*1, если это не "1")
    let newExpr = expr.replace(regex, (match, group) => {
        if (group.startsWith("(") && group.endsWith(")")) {
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
        car_class_ratio: null,

        floors: null,
        weight: null,
        units: null,
        price_per_unit: 0,
        price_per_kg: 0,
    },
    calculationType: string = "full",
): string {
    try {
        // Заменяем переменные в формуле на их значения
        let evaluatedFormula = formula;
        for (const [key, value] of Object.entries(params)) {
            if (value !== null) {
                evaluatedFormula = evaluatedFormula.replace(
                    key,
                    (value || 0).toString(),
                );
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
        let variables = [
            "base_price",
            "distance",
            "price_per_km",
            "duration",
            "price_per_minute",
            "time_ratio",
            "options_sum",
            "submit_price",
            "car_class_ratio",

            "floors",
            "weight",
            "units",
            "price_per_kg",
            "price_per_unit",
            "price_per_floor"
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
                if (variable.endsWith("ratio") && value % 1 !== 0) {
                    value = (value || 0).toFixed(2);
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
    floors?: string | null,
    weight?: string | null,
    entities_count?: string | null,
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
        const carClassRatio = carClass && priceModel.constants.car_class_ratio
            ? priceModel.constants.car_class_ratio[carClass]
            : 1;

        const courier_fare_per_km = carClass && ctx.constants.data.data.car_classes[carClass].courier_fare_per_1_km
            ? ctx.constants.data.data.car_classes[carClass].courier_fare_per_1_km
            : 0;

        const courier_call_rate = carClass && ctx.constants.data.data.car_classes[carClass].courier_call_rate
            ? ctx.constants.data.data.car_classes[carClass].courier_call_rate
            : 0;
        let params : {
            [key: string]: any
        } = {
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



        if(ctx.configName === "truck") {
            //const carPriceParams = await getPriceParams(ctx, carClass);
            params = {
                base_price: courier_call_rate,
                distance: (distance || 0) / 1000,
                price_per_km: courier_fare_per_km,
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

                price_per_unit: priceModel.constants.price_per_unit,
                price_per_floor:priceModel.constants.price_per_floor,
                price_per_kg:priceModel.constants.price_per_kg,
                weight:weight,
                floors:floors,
                units:entities_count
            };
        }

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
        throw new Error("ROUTE_SERVICE_UNAVAILABLE, " + error);
    }
}

export async function formatOrderConfirmation(
    ctx: Context,
    state: OrderMachine,
    priceModel: PriceModel,
): Promise<string> {
    const user = await ctx.usersList.pull(ctx.userID);

    let template = ctx.constants.getPrompt(
        user.referrer_u_id === MultiUsersRefCodes[ctx.botID].test
            ? localizationNames.collectionOrderConfirmTestMode
            : localizationNames.collectionOrderConfirm,
        ctx.user.settings.lang.api_id,
    )
    const options_text = state.data.additionalOptions.length > 0
        ? state.data.additionalOptions
            .map(
                (i) =>
                    (ctx.configName === "children" ? '_' : '') +
                    ctx.constants.data.data.booking_comments[i][
                        ctx.user.settings.lang.iso
                        ] +
                    " ( " +
                    ctx.constants.data.data.booking_comments[i]
                        .options.price +
                    ctx.constants.data.default_currency +
                    " )" + (ctx.configName === "children" ? '_' : ''),
            )
            .join(ctx.configName === "children" ? '\n' : ', ')
        : (ctx.configName === "children" ? '' : getLocalizationText(ctx,localizationNames.noAdditionalOptions))

    if(ctx.configName === "children" && state.data.additionalOptions.length == 0){
        template = template.replace(/###START###.*?###END###\s?/, '')
    }
    return formatString(
        template,
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
                                  (ctx.configName === "children" ? '_' : '') +
                                  ctx.constants.data.data.booking_comments[i][
                                      ctx.user.settings.lang.iso
                                  ] +
                                  " ( " +
                                  ctx.constants.data.data.booking_comments[i]
                                      .options.price +
                                  ctx.constants.data.default_currency +
                                  " )" + (ctx.configName === "children" ? '_' : ''),
                          )
                          .join(ctx.configName === "children" ? '\n' : ', ')
                    : getLocalizationText(ctx,localizationNames.noAdditionalOptions),
            price:
                priceModel.price === "0"
                    ? "-"
                    : makeCurrencySymbol(
                          priceModel.price +
                              (priceModel.calculationType === "incomplete"
                                  ? " + ?"
                                  : ""),
                          ctx.constants.data.default_currency,
                      ),
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
            class: state.data.carClass
                ? ctx.constants.data.data.car_classes[state.data.carClass][
                      ctx.user.settings.lang.iso
                  ]
                : ctx.constants.getPrompt(
                      localizationNames.anyClass,
                      ctx.user.settings.lang.api_id,
                  ),
            childrenInfo: typeof state.data.childrenProfiles === "string" ? state.data.childrenProfiles :
            (state.data.childrenProfiles || []).join("\n"),

            floors: (Math.abs(Number(state.data.truck_floornumber))).toString(),
            units: typeof state.data.truck_count === "string" ? state.data.truck_count :
            (state.data.truck_count || []).join(", "),
            weight: ctx.configName === "truck" ? (Number(state.data.truck_count)*(JSON.parse(ctx.constants.data.data.site_constants.type_weight.value)[state.data.truck_drivetype || -1].maxWeight || JSON.parse(ctx.constants.data.data.site_constants.type_weight.value)[state.data.truck_drivetype || -1].minWeight)).toString() : '',
        },
    );
}

export function makeCurrencySymbol(price: string, currency: string): string {
    if (currency === "EUR") {
        return "€" + price;
    } else {
        return price + " " + currency;
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
        "collectionOrderConfirm",
        "children_collectionSelectBabySister",
        "children_collectionChildrenCount",
        "children_collectionTime"
    ];
    //console.log(state.state, state.data.priceModel);
    if (
        exitAvailableStates.includes(state.state) &&
        ctx.message.body.toLowerCase() === "0"
    ) {
        // Остановить поиск водителей, если он был запущен
        state.data.driverSearchManager.stop(ctx.userID);
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
            if (await handleRoute(collectionOrderConfirm, ctx, state, logger))
                break;
            else break;
        case "collectionWhen":
            if (await handleRoute(collectionWhen, ctx, state, logger)) break;
            else break;
        case "collectionAdditionalOptions":
            if (
                await handleRoute(
                    collectionAdditionalOptions,
                    ctx,
                    state,
                    logger,
                )
            )
                break;
            else break;
        case "collectionShowAdditionalOptions":
            if (
                await handleRoute(
                    collectionShowAdditionalOptions,
                    ctx,
                    state,
                    logger,
                )
            )
                break;
            else break;
        case "collectionCarClass":
            if (await handleRoute(collectionCarClass, ctx, state, logger))
                break;
            else break;
        case "collectionShowCarClass":
            if (await handleRoute(collectionShowCarClass, ctx, state, logger))
                break;
            else break;
        case "collectionHowManyPeople":
            if (await handleRoute(collectionHowManyPeople, ctx, state, logger))
                break;
            else break;

        case "children_collectionSelectBabySister":
            if (
                await handleRoute(
                    children_collectionSelectBabySister,
                    ctx,
                    state,
                    logger,
                )
            )
                break;
            else break;
        case "children_collectionSelectBabySisterRange":
            if (
                await handleRoute(
                    children_collectionSelectBabySisterRange,
                    ctx,
                    state,
                    logger,
                )
            )
                break;
            else break;
        case "children_collectionChildrenCount":
            if (
                await handleRoute(
                    children_collectionChildrenCount,
                    ctx,
                    state,
                    logger,
                )
            )
                break;
            else break;
        case "children_collectionTime":
            if (await handleRoute(children_collectionTime, ctx, state, logger))
                break;
            else break;

        case "collectionTo":
            if (await handleRoute(collectionTo, ctx, state, logger)) break;
            else break;
        default:
            if (await handleRoute(collectionFrom, ctx, state, logger)) break;
            else break;
    }
}
