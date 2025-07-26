import { AuthData, postHeaders } from "./general";
import axios from "axios";
import * as geoTz from "geo-tz";
import { DateTime } from "luxon";

export async function getCityByDriveStartLoc(
    adminAuth: AuthData,
    baseURL: string,
    geo: {
        latitude: number;
        longitude: number;
    },
): Promise<{
    status: string;
    data?: [
        {
            id_city: string;
            [key: string]: string | number;
        },
    ];
}> {
    const response = await axios.post(
        `${baseURL}/query/template/1`,
        {
            token: adminAuth.token,
            u_hash: adminAuth.hash,
            data: JSON.stringify({
                ":drive_latitude": geo.latitude.toString(),
                ":drive_longitude": geo.longitude.toString(),
            }),
        },
        {
            headers: postHeaders,
        },
    );
    return response.data;
}

export async function getDriversForCity(
    adminAuth: AuthData,
    baseURL: string,
    city_id: string,
): Promise<{
    status: string;
    code: string;
    data?: [
        {
            id_user: string;
            phone: string;
            name: string;
            [key: string]: any;
        },
    ];
}> {
    const response = await axios.post(
        `${baseURL}/query/template/2`,
        {
            token: adminAuth.token,
            u_hash: adminAuth.hash,
            data: JSON.stringify({
                ":city_id": city_id,
            }),
        },
        {
            headers: postHeaders,
        },
    );
    return response.data;
}

export async function getDriversForCityNight(
    adminAuth: AuthData,
    baseURL: string,
    city_id: string,
    client_id: string,
): Promise<{
    status: string;
    data?: [
        {
            id_user: string;
            phone: string;
            name: string;
            [key: string]: any;
        },
    ];
}> {
    const response = await axios.post(
        `${baseURL}/query/template/3`,
        {
            token: adminAuth.token,
            u_hash: adminAuth.hash,
            data: JSON.stringify({
                ":city_id": city_id,
                ":client_id": client_id,
            }),
        },
        {
            headers: postHeaders,
        },
    );
    return response.data;
}

export async function isNightTime(lat: number, lng: number): Promise<boolean> {
    try {
        // 1. Получаем часовой пояс по координатам
        const timezones = geoTz.find(lat, lng);
        if (!timezones.length) return false;

        // 2. Создаем DateTime объект с нужным часовым поясом
        const localTime = DateTime.now().setZone(timezones[0]);

        // 3. Получаем текущий час в этом часовом поясе
        const currentHour = localTime.hour;

        // 4. Определяем ночное время (22:00-06:00)
        return currentHour >= 22 || currentHour < 6;
    } catch (error) {
        console.error("Error determining night time:", error);
        return false;
    }
}
