import WAWebJS from "whatsapp-web.js";
import { Storage } from "../storage/storage";
import { OrderMachine } from "../states/machines/orderMachine";
import { Location } from "../states/types";
import { localizationNames } from "../l10n";
import { constants } from "../constants";
import { readQRCodeFromImage } from "./qr";
import {
    getCityByDriveStartLoc,
    getDriversForCity,
    getDriversForCityNight,
    isNightTime,
} from "../api/sql_templates";
import { formatDriversList } from "../handlers/routes/order/collectionOrderConfirm";
import { getLocalizationText } from "./textUtils";

export async function GetLocation(
    msg: WAWebJS.Message,
    userId: string,
    storage: Storage,
    state: OrderMachine,
    ctx: Context,
): Promise<Location> {
    if (msg.location) {
        // @ts-ignore
        if (
            msg.location.latitude == undefined ||
            msg.location.longitude == undefined
        ) {
            throw "Location is not found";
        }

        const location = msg.location as unknown as Location;
        console.log("LOCATION: ", msg.location);
        return {
            latitude: location.latitude,
            longitude: location.longitude,
            address: location.address,
        };
    } else if (msg.body.length > 0) {
        // Если просто передан адрес или координаты в разных форматах
        const coord: Location | null = parseCoordinatesFromText(msg.body);
        if (coord) {
            return coord;
        } else {
            return {
                address: msg.body,
            };
        }
    } else {
        throw "Invalid message type";
    }
}

export async function GetTimestamp(
    body: string,
    tomorrowMarker: string = "завтра",
): Promise<Date | undefined | null> {
    /* Получение timestamp из содержимого сообщения.
     * Если возвращается undefined - то сообщение не распознано.
     * Если возвращается null - то сейчас. */
    const now = new Date(new Date().getTime() + 3600 * 1000)
        .toUTCString()
        .replace(/ GMT$/, "");
    console.log(now);
    const trimmedBody = body.trim().toLowerCase().normalize("NFC");

    if (trimmedBody.toString() === "сейчас") {
        return null;
    }

    const match = trimmedBody.match(
        /^({tomorrowMarker}\s+)?(\d{1,2}):(\d{2})$/,
    );
    console.log(match);
    if (match) {
        const isTomorrow = Boolean(match[1]);
        const hours = parseInt(match[2]);
        if (hours > 23) {
            return undefined;
        }
        const minutes = parseInt(match[3]);
        if (minutes > 59) {
            return undefined;
        }

        // Создаем объект Date на основе текущего времени
        const date = new Date();
        date.setTime(date.getTime() + 3600 * 1000);
        console.log(date);
        if (isTomorrow) {
            date.setDate(date.getDate() + 1);
        }
        date.setHours(hours, minutes, 0, 0);

        return date;
    }

    return undefined;
}

export async function parseGetLocationException(
    error: string,
    ctx: Context,
): Promise<string> {
    switch (error) {
        case "Invalid message type":
            return ctx.constants.getPrompt(
                localizationNames.incorrectTextMessageType,
                ctx.user.settings.lang.api_id,
            );
        case "Invalid media type":
            return ctx.constants.getPrompt(
                localizationNames.incorrectImageMediaType,
                ctx.user.settings.lang.api_id,
            );
        case "File size is too large":
            return ctx.constants.getPrompt(
                localizationNames.largeFileSize,
                ctx.user.settings.lang.api_id,
            );
        case "Failed to recognize the QR code":
            return ctx.constants.getPrompt(
                localizationNames.qrScanFailed,
                ctx.user.settings.lang.api_id,
            );
        case "Location is not found":
            return ctx.constants.getPrompt(
                localizationNames.locationNotFound,
                ctx.user.settings.lang.api_id,
            );
    }

    return error;
}

export async function getDriverList(
    ctx: Context,
    latitude: number,
    longitude: number,
    test_message: boolean = false
): Promise<
    [
        {
            id_user: string;
            phone: string;
            name: string;
            [key: string]: any;
        },
    ]
> {
    const city = await getCityByDriveStartLoc(ctx.auth, ctx.baseURL, {
        latitude: latitude,
        longitude: longitude,
    });
    if (!city.data) {
        throw new Error("CITY NOT FOUND");
    }
    if(test_message){
        await ctx.chat.sendMessage(`TEST POINT: Looking drivers for city '${city.data[0].name_ru}' id='${city.data[0].id_city}'`);
    }
    let drivers;
    const user = await ctx.usersList.pull(ctx.userID);
    if (await isNightTime(latitude, longitude)) {
        drivers = await getDriversForCityNight(
            ctx.auth,
            ctx.baseURL,
            city.data[0].id_city,
            user.api_u_id,
        );
    } else {
        drivers = await getDriversForCity(
            ctx.auth,
            ctx.baseURL,
            city.data[0].id_city,
        );
    }
    if (!drivers.data) {
        throw new Error("DRIVERS NOT FOUND");
    }
    return drivers.data;
}

// Универсальный парсер координат из текста
/**
 * Парсит координаты из строки в разных форматах. Примеры поддерживаемых форматов:
 *
 * 1. Десятичные координаты:
 *    55.7558 37.6176
 *    55.7558,37.6176
 *    55.7558N 37.6176E
 *    55.7558 S, 37.6176 W
 *
 * 2. Ссылки на Google Maps:
 *    https://maps.google.com/?q=55.7558,37.6176
 *    https://www.google.com/maps/place/55.7558,37.6176
 *
 * 3. Градусы, минуты, секунды (DMS):
 *    55°45'21.0"N 37°37'03.4"E
 *    55 45 21 N 37 37 03 E
 *    55°45.350'N 37°37.057'E
 *
 * 4. DMS без секунд:
 *    55 45 N 37 37 E
 *
 * 5. Смешанные варианты:
 *    N55.7558 E37.6176
 *    55.7558N, 37.6176E
 *    55.7558;37.6176
 *
 * Если формат не распознан — строка будет обработана как обычный адрес.
 */
function parseCoordinatesFromText(
    text: string,
): { latitude: number; longitude: number; address: string } | null {
    const original = text;
    text = text.trim();

    // 1. Ссылки на Google Maps
    // Пример: https://maps.google.com/?q=55.7558,37.6176
    let match = text.match(
        /(?:[?&]q=|\/place\/)(-?\d{1,3}(?:[.,]\d+)?)[, ]+(-?\d{1,3}(?:[.,]\d+)?)/i,
    );
    if (match) {
        const lat = parseFloat(match[1].replace(",", "."));
        const lon = parseFloat(match[2].replace(",", "."));
        if (!isNaN(lat) && !isNaN(lon))
            return { latitude: lat, longitude: lon, address: original };
    }

    // 2. Десятичные координаты с пробелом или запятой, с/без N/S/E/W
    // Пример: 55.7558 37.6176, 55.7558N 37.6176E, 55.7558,37.6176
    match = text.match(
        /(-?\d{1,3}(?:[.,]\d+)?)[°\s]*([NS])?[\s,]+(-?\d{1,3}(?:[.,]\d+)?)[°\s]*([EW])?/i,
    );
    if (match) {
        let lat = parseFloat(match[1].replace(",", "."));
        let lon = parseFloat(match[3].replace(",", "."));
        if (match[2] && match[2].toUpperCase() === "S") lat = -lat;
        if (match[4] && match[4].toUpperCase() === "W") lon = -lon;
        if (!isNaN(lat) && !isNaN(lon))
            return { latitude: lat, longitude: lon, address: original };
    }

    // 3. Градусы, минуты, секунды (DMS)
    // Пример: 55°45'21.0"N 37°37'03.4"E
    match = text.match(
        /(\d{1,3})[°\s](\d{1,2})['′\s](\d{1,2}(?:\.\d+)?)["”\s]?([NS])?[,\s]+(\d{1,3})[°\s](\d{1,2})['′\s](\d{1,2}(?:\.\d+)?)["”\s]?([EW])?/i,
    );
    if (match) {
        let lat = dmsToDecimal(match[1], match[2], match[3], match[4]);
        let lon = dmsToDecimal(match[5], match[6], match[7], match[8]);
        if (!isNaN(lat) && !isNaN(lon))
            return { latitude: lat, longitude: lon, address: original };
    }

    // 4. DMS без секунд (только градусы и минуты)
    // Пример: 55 45 N 37 37 E
    match = text.match(
        /(\d{1,3})[°\s](\d{1,2})['′\s]?([NS])?[,\s]+(\d{1,3})[°\s](\d{1,2})['′\s]?([EW])?/i,
    );
    if (match) {
        let lat = dmsToDecimal(match[1], match[2], 0, match[3]);
        let lon = dmsToDecimal(match[4], match[5], 0, match[6]);
        if (!isNaN(lat) && !isNaN(lon))
            return { latitude: lat, longitude: lon, address: original };
    }

    // 5. Координаты с точкой/запятой-разделителем
    match = text.match(/(-?\d{1,3}(?:[.,]\d+)?)[;|, ]+(-?\d{1,3}(?:[.,]\d+)?)/);
    if (match) {
        const lat = parseFloat(match[1].replace(",", "."));
        const lon = parseFloat(match[2].replace(",", "."));
        if (!isNaN(lat) && !isNaN(lon))
            return { latitude: lat, longitude: lon, address: original };
    }

    return null;
}

function dmsToDecimal(
    deg: string,
    min: string,
    sec: string | number,
    dir?: string,
): number {
    let d = parseFloat(deg);
    let m = parseFloat(min);
    let s = typeof sec === "string" ? parseFloat(sec) : sec;
    let result = d + m / 60 + (s || 0) / 3600;
    if (dir) {
        dir = dir.toUpperCase();
        if (dir === "S" || dir === "W") result = -result;
    }
    return result;
}

// Менеджер фонового поиска водителей с возможностью остановки
import { Message } from "whatsapp-web.js";
import { Context } from "../index";
import {at, attempt} from "lodash";

interface DriverSearchManagerType {
    start: (
        ctx: Context,
        state: OrderMachine,
        searchMsg: Message,
        maxAttempts?: number,
    ) => void;
    stop: (userID: string) => void;
}

export class DriverSearchManager {
    private timers: Map<string, NodeJS.Timeout> = new Map();

    private async pollDrivers(
        ctx: Context,
        state: OrderMachine,
        searchMsg: Message,
        attempts = 0,
        maxAttempts = -1
    ) {
        const freshState: OrderMachine = await ctx.storage.pull(ctx.userID);
        // распределение интервалов и подсчет попыток
        let interval;
        if(freshState.data.when===undefined) {
            await ctx.chat.sendMessage(getLocalizationText(ctx, localizationNames.errorNoTimeUndefined));
            return
        }
        if(freshState.data.when === null)  /* значит сейчас или 4 часа максимум - берем shor interval*/ {
            interval = ctx.gfp_constants.data.searchDriversPeriodShort;
        } else {
            if((Date.now() - freshState.data.when.getTime() + ctx.gfp_constants.data.maxDefaultDriveWaiting) > 1*60*60) {
                interval = ctx.gfp_constants.data.searchDriversPeriodLong;
            } else {
                interval = ctx.gfp_constants.data.searchDriversPeriodShort;
            }

        }

        if(maxAttempts === -1) {
            maxAttempts = Math.floor((Date.now() - (freshState.data.when ? freshState.data.when.getTime() : Date.now()) + ctx.gfp_constants.data.maxDefaultDriveWaiting) / interval);
        }

        if(attempts===0){
            await ctx.chat.sendMessage("TEST POINT: INTERVAL: " + interval + " TIME DELTA: " + (Date.now() - (freshState.data.when ? freshState.data.when.getTime() : Date.now())) + " MAX ATTEMPTS: " + maxAttempts);
        }

        if (
            !freshState ||
            !freshState.data ||
            freshState.state !== "collectionOrderConfirm" ||
            !freshState.data.waitingForDrivers
        ) {
            await searchMsg.edit(getLocalizationText(ctx, localizationNames.searchCancelled));
            await ctx.chat.sendMessage(
                getLocalizationText(ctx, localizationNames.defaultPrompt),
            );
            this.timers.delete(ctx.userID);
            return;
        }
        if(!freshState.data.from.latitude || !freshState.data.from.longitude) {
            await searchMsg.edit(getLocalizationText(ctx, localizationNames.errorNoCoordinates));
            return;
        }

        const driverList = await getDriverList(
            ctx,
            freshState.data.from.latitude,
            freshState.data.from.longitude,
            attempts == 0,
        );
        if (driverList && driverList.length > 0) {
            const formattedDriversList = await formatDriversList(driverList);
            freshState.data.driversMap = formattedDriversList.drivers_map;
            const text = getLocalizationText(
                ctx,
                localizationNames.selectBabySisterRange,
            ).replace(
                "%driversList%",
                formattedDriversList.text ||
                    getLocalizationText(ctx, localizationNames.noDrivers),
            );
            freshState.state = "children_collectionSelectBabySister";
            freshState.data.nextStateForAI =
                "children_collectionSelectBabySister";
            freshState.data.nextMessageForAI = text;
            freshState.data.waitingForDrivers = false;
            await ctx.storage.push(ctx.userID, freshState);
            await searchMsg.edit(text);
            this.timers.delete(ctx.userID);
            return;
        }

        if (attempts + 1 >= maxAttempts) {
            await searchMsg.edit(
                getLocalizationText(ctx, localizationNames.noDriversFoundOrderCancelled),
            );
            await ctx.chat.sendMessage(
                getLocalizationText(ctx, localizationNames.defaultPrompt),
            );
            await ctx.storage.delete(ctx.userID);
            this.timers.delete(ctx.userID);
            return;
        }

        await searchMsg.edit(
            getLocalizationText(ctx, localizationNames.noDriversAvailableAttempt).replace("%attempt%", (attempts + 1).toString()).replace("%maxAttempts%", maxAttempts.toString()),
        );
        const timer = setTimeout(async () => {
            await this.pollDrivers(
                ctx,
                freshState,
                searchMsg,
                attempts + 1,
                maxAttempts,
            );
        }, interval * 1000);
        this.timers.set(ctx.userID, timer);
    }

    start(
        ctx: Context,
        state: OrderMachine,
        searchMsg: Message,
        maxAttempts = -1,
    ) {
        this.stop(ctx.userID); // На всякий случай остановить предыдущий поиск
        this.pollDrivers(ctx, state, searchMsg, 0, maxAttempts);
    }

    stop(userID: string) {
        if (this.timers.has(userID)) {
            clearTimeout(this.timers.get(userID));
            this.timers.delete(userID);
        }
    }
}

export function compareDateTimeWithWaitingList(
    b_start_datetime: string,
    b_max_waiting_list: { [key: string]: { additional: string; created: string } },
): boolean {
    try {
        const startDate = new Date(b_start_datetime);
        if (isNaN(startDate.getTime())) return false;
        
        const sumSeconds = (obj: any): number => 
            <number>Object.values(obj).reduce((sum: number, item: any) =>
                sum + (parseInt(item.additional) || 0) +
                (Object.keys(item).some(k => k !== 'additional' && k !== 'created' && typeof item[k] === 'object') ? sumSeconds(item) : 0), 0);
        
        return new Date(startDate.getTime() + sumSeconds(b_max_waiting_list) * 1000) < new Date();
    } catch {
        return false;
    }
}
