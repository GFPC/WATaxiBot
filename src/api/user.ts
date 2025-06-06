import axios from "axios";
import { AuthData, postHeaders, createForm } from "./general";

export interface User {
    phone: string;
    whatsappId: string;
    name?: string;
    refCode?: string;
    lang?: string;
    u_details?: any;
}

async function createFormData(
    user: User,
    admin_auth: AuthData,
    data?: string,
): Promise<FormData> {
    /* Функция, которая создает FormData для регистрации пользователя */

    return createForm(
        {
            u_phone: user.phone,
            u_role: "1",
            u_name: user.name,
            ref_code: user.refCode,
            data: data,
        },
        admin_auth,
    );
}

export async function checkRegister(
    user: User,
    adminAuth: AuthData,
    baseURL: string,
): Promise<boolean> {
    /* Функция, которая проверяет зарегистрирован ли пользователь */
    const form = await createFormData(user, adminAuth, '{"u_details":""}');
    const response = await axios.post(`${baseURL}/register/`, form, {
        headers: postHeaders,
    });

    if (response.status != 200) throw "Status code != 200";

    return response.data.message !== "u_details not array";
}

export async function register(
    user: User,
    adminAuth: AuthData,
    baseURL: string,
) {
    /* Функция, которая регистрирует пользователя. */
    const lang = user.lang;
    const form = await createFormData(user, adminAuth);
    const response = await axios.post(`${baseURL}/register/`, form, {
        headers: postHeaders,
    });
    console.log("REG RESPONSE: ", response);

    if (response.status != 200 || response.data.status != "success")
        throw `API Error: ${response.data.message}`;

    await changeLang(user.phone, lang, adminAuth, baseURL);
}

export async function authUser(
    user: User,
    adminAuth: AuthData,
    baseURL: string,
): Promise<string> {
    const form = createForm(
        {
            u_a_tg: user.whatsappId,
            type: "telegram",
        },
        adminAuth,
    );
    const response = await axios.post(`${baseURL}/token/`, form, {
        headers: postHeaders,
    });

    if (response.status != 200 || response.data.status != "success")
        throw `API Error: ${response.data.message}`;

    return String(response.data.auth_user.u_id);
}

export async function changeLang(
    phone: string,
    lang_id: string | undefined,
    adminAuth: AuthData,
    baseURL: string,
): Promise<{ status: string; message: string }> {
    const response = await axios.post(
        `${baseURL}/user`,
        {
            token: adminAuth.token,
            u_hash: adminAuth.hash,
            u_a_phone: phone,
            data: JSON.stringify({
                u_lang: lang_id,
            }),
        },
        { headers: postHeaders },
    );

    if (response.status != 200) throw `API Error: ${response.data.message}`;

    return {
        status: response.data.status,
        message: response.data.message,
    };
}

export async function changeReferralCode(
    u_id: string,
    code: string,
    prevRefCode: string,
    adminAuth: AuthData,
    baseURL: string,
): Promise<{ status: string; message: string }> {
    let data;
    if (prevRefCode && prevRefCode != "") {
        data = {
            referrer_u_id: code,
            u_details: [["=", ["refCodeBackup"], prevRefCode]],
        };
    } else {
        data = {
            referrer_u_id: code,
        };
    }
    const response = await axios.post(
        `${baseURL}user/${u_id}`,
        {
            token: adminAuth.token,
            u_hash: adminAuth.hash,
            data: JSON.stringify(data),
        },
        { headers: postHeaders },
    );
    console.log("CHANGE REF RESPONSE: ", response.data);
    if (response.status != 200)
        throw `POINT->changeReferralCode: API Error: ${response.data.message}`;

    return {
        status: response.data.status,
        message: response.data.message,
    };
}
