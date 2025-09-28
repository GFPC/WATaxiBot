import axios from "axios";
import {baseURL, postHeaders} from "./general";

export async function getPolygonsForPoint(lat: number, lng: number) {
    const response = await axios.post(
        `${baseURL}/data?fields=G&easy=&key=${lat.toString()}%2C+${lng.toString()}`,
    );
    return response.data;
}

export async function isRouteInCity(
    start: { lat: number; lon: number },
    end: { lat: number; lon: number },
): Promise<boolean> {
    const startPointPolygons = await getPolygonsForPoint(start.lat, start.lon);
    const endPointPolygons = await getPolygonsForPoint(end.lat, end.lon);

    // Нормализуем возможные варианты структуры ответа
    const startData = (startPointPolygons && startPointPolygons.data) ? startPointPolygons.data : startPointPolygons;
    const endData = (endPointPolygons && endPointPolygons.data) ? endPointPolygons.data : endPointPolygons;
    console.log('Polygons: ',startData.data.map_place_polygons, endData.data.map_place_polygons,start, end);

    if (!startData || !endData) {
        return false;
    }

    const citiesIdStart = Object.values(startData.data.map_place_polygons || {}).map((polygon: any) => polygon.city) || [];
    const citiesIdEnd = Object.values(endData.data.map_place_polygons || {}).map((polygon: any) => polygon.city) || [];

    for (let i = 0; i < citiesIdStart.length; i++) {
        if (citiesIdEnd.includes(citiesIdStart[i])) {
            return true;
        }
    }
    return false;
}