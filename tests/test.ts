// ... existing code ...

// Тесты для функций расчета формул и цены из handlers/order
import { strictEqual } from "assert";
import {
    calculateOrderPrice,
    calculatePrice,
    formatPriceFormula,
} from "../src/handlers/order";
import { ServiceMap } from "../src/ServiceMap";
import { Context } from "../src";
import WAWebJS, {
    Chat,
    Client,
    LocalAuth,
    Message,
    MessageContent,
} from "whatsapp-web.js";
import { Storage } from "../src/storage/storage";
import { AuthData } from "../src/api/general";
import { Logger } from "winston";
import { Constants } from "../src/api/constants";
import { UsersStorage } from "../src/storage/usersStorage";
import { Location } from "../src/states/types";

console.log("\nТесты функций расчета формул и цены:");
async function test_price() {
    // Тест calculatePrice
    const formula =
        "base_price + distance * price_per_km + duration * price_per_minute + options_sum";
    const params = {
        base_price: 100,
        distance: 10,
        price_per_km: 20,
        duration: 5,
        price_per_minute: 2,
        options_sum: 15,
    };
    const price = calculatePrice(formula, params);
    strictEqual(
        price,
        100 + 10 * 20 + 5 * 2 + 15,
        "calculatePrice должен корректно считать цену",
    );
    console.log("✓ calculatePrice test passed");

    // Тест formatPriceFormula
    const formatted = formatPriceFormula(formula, params, "incomplete");
    console.log("Formatted formula: " + formatted);
    strictEqual(
        formatted.includes("100"),
        true,
        "formatPriceFormula должен подставлять значения",
    );
    strictEqual(
        formatted.includes("10"),
        true,
        "formatPriceFormula должен подставлять значения",
    );
    strictEqual(
        formatted.includes("20"),
        true,
        "formatPriceFormula должен подставлять значения",
    );
    strictEqual(
        formatted.includes("5"),
        true,
        "formatPriceFormula должен подставлять значения",
    );
    strictEqual(
        formatted.includes("2"),
        true,
        "formatPriceFormula должен подставлять значения",
    );
    strictEqual(
        formatted.includes("15"),
        true,
        "formatPriceFormula должен подставлять значения",
    );
    console.log("✓ formatPriceFormula test passed");

    const constants = new Constants();
    await constants.getData("https://ibronevik.ru/taxi/c/gruzvill/api/v1/");

    // Мок для calculateOrderPrice
    const mockCtx: Context = {
        message: {} as Message,
        chat: {} as Chat,
        storage: {} as Storage,
        auth: {} as AuthData,
        userID: "test-user",
        user: {
            settings: { lang: { api_id: "ru", iso: "ru", native: "Русский" } },
        },
        logger: {} as Logger,
        client: {} as Client,
        usersList: {} as UsersStorage,
        botID: "test-bot",
        api_u_id: "test-api",
        baseURL: "http://test.example.com",
        constants: constants,
    };
    const mockFrom: Location = {};
    const mockTo = { latitude: 55.76, longitude: 37.62 };
    const mockPricingModels = {
        basic: {
            constants: {
                base_price: 100,
                price_per_km: 20,
                price_per_minute: 2,
                time_ratio: { day: 1, night: 1.5 },
            },
            model: {
                expression:
                    "base_price + distance * price_per_km + duration * price_per_minute + options_sum",
            },
        },
        voting: {
            constants: {
                base_price: 50,
                price_per_km: 10,
                price_per_minute: 1,
                time_ratio: { day: 1, night: 2 },
            },
            model: {
                expression:
                    "base_price + distance * price_per_km + duration * price_per_minute + options_sum",
            },
        },
    };
    // Мокаем getRouteInfo, чтобы не было реального запроса
    const orderModule = require("../src/handlers/order");
    orderModule.getRouteInfo = async () => ({ distance: 10000, duration: 600 });
    (async () => {
        const result = await calculateOrderPrice(
            mockCtx,
            mockFrom,
            mockTo,
            mockPricingModels,
            false,
            [1, 2],
        );
        strictEqual(
            result.price > 0,
            true,
            "calculateOrderPrice должен возвращать цену больше 0",
        );
        strictEqual(
            result.formula,
            mockPricingModels.basic.model.expression,
            "Формула должна совпадать",
        );
        console.log("✓ calculateOrderPrice test passed");
    })();
}

test_price().then((r) => "finished");
// ... existing code ...
