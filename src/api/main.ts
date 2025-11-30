import {AuthData} from "./general";
import axios from "axios";
const postHeaders = {
    "Content-Type": "application/x-www-form-urlencoded",
}
export async function getCar(auth: AuthData, baseURL: string, c_id: string | string[]) {
    const response = await axios.post(
        `${baseURL}/car/${typeof c_id === "string" ? c_id : c_id.join(",")}`,
        {
            token: auth.token,
            u_hash: auth.hash,
        },
        {
            headers: postHeaders,
        },
    );
    return response.data;
}