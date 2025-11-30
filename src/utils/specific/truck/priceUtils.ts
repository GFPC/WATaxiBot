import {Context} from "../../../types/Context";
import {Location} from "../../../states/types";
import {getRouteInfo} from "../../../api/osrm";
import {calculatePrice} from "../../../handlers/order";
import PriceModel from "../../../types/Price/PriceModel";
import {getPriceParams} from "../../getCarPriceParams";
import PriceCalculationParams from "../../../types/Price/PriceCalculationParams";
export async function getPrice(
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

        floors: null,
        weight: null,
        units: null,
        price_per_unit: 0,
        price_per_kg: 0,
    },
    calculationType: string = "full",
): Promise<string> {
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
function getNativeDistanceAndDuration(
    from: Location,
    to: Location,
): { distance: number; duration: number } {
    let distance = null;
    let duration = null;
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

        return {distance, duration};
    }
    else {
        return {distance: 0, duration: 0};
    }
}

export async function getDistanceAndDuration(
    from: Location,
    to: Location,
) {
    // Добавляем значения по умолчанию на случай ошибки OSRM
    let calculationType: string = "incomplete";

    let distance;
    let duration;

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
            const distanceAndDuration = getNativeDistanceAndDuration(from, to);
            distance = distanceAndDuration.distance;
            duration = distanceAndDuration.duration;
        }
    } else {
        distance = 0;
        duration = 0;
    }
    return {calculationType, distance, duration};
}
export async function initPriceModelForTruck(
    ctx: Context,
    c_id: string,
    calculationType: string,
    distance: number,
    duration: number,
    pricingModels: any,
    isVoting: boolean,
    additionalOptions: number[],
    submitPrice: number,
    floors: string,
    weight: string,
    entities_count: string,
): Promise<PriceModel> {
    const priceModel = pricingModels[isVoting ? "voting" : "basic"];
    const now = new Date();
    const gmtPlus1 = new Date(now.getTime() + 60 * 60 * 1000);
    const currentHour = gmtPlus1.getUTCHours();

    const isDayTime = currentHour >= 6 && currentHour < 21;
    const timeRatio = isDayTime ? priceModel.constants.time_ratio.day : priceModel.constants.time_ratio.night;
    const carPriceParams = await getPriceParams(ctx, c_id);
    if (carPriceParams.status === "error") throw new Error("Failed to get car price params");
    const courier_fare_per_km = carPriceParams?.price_per_km || 0;
    const courier_call_rate = carPriceParams?.base_price || 0;
    let params: {
        [key: string]: any
    } = {
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

        price_per_unit: priceModel.constants.price_per_unit,
        price_per_floor: priceModel.constants.price_per_floor,
        price_per_kg: priceModel.constants.price_per_kg,
        weight: weight,
        floors: floors,
        units: entities_count
    };
    const price = await getPrice(priceModel.model.expression, params);

    return {
        formula: priceModel.model.expression,
        price: price,
        options: {
            ...params,
        },
        calculationType: calculationType,
    };
}
