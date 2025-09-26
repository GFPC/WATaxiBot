import axios from "axios";
import {baseURL, postHeaders} from "./general";

export async function getPolygonsForPoint(lat: number, lng: number) {
    const response = await axios.post(
        `${baseURL}/data?fields=G&easy=&key=${lat.toString()}%2C+${lng.toString()}`,
    );
    return response.data;
}