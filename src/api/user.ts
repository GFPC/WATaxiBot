import axios from "axios";
import {baseURL, AuthData, postHeaders, createForm} from "./general";

export interface User {
  phone: string,
  whatsappId: string,
  name?: string,
  refCode?: string,
  lang?: string
}

async function createFormData(user: User, admin_auth: AuthData, data?: string): Promise<FormData> {
  /* Функция, которая создает FormData для регистрации пользователя */

  return createForm(
    {
      u_phone: user.phone,
      u_tg: user.whatsappId,
      u_role: '1',
      u_name: user.name,
      ref_code: user.refCode,
      data: data
    },
    admin_auth
  );
}

export async function checkRegister(user: User, adminAuth: AuthData): Promise<boolean> {
  /* Функция, которая проверяет зарегистрирован ли пользователь */
  const form = await createFormData(user, adminAuth, '{"u_details":""}');
  const response = await axios.post(`${baseURL}/register/`, form, {headers: postHeaders});

  if (response.status != 200) throw "Status code != 200";

  return response.data.message !== 'u_details not array';
}

export async function register(user: User, adminAuth: AuthData) {
  /* Функция, которая регистрирует пользователя. */
    const lang = user.lang
  const form = await createFormData(user, adminAuth);
  const response = await axios.post(`${baseURL}/register/`, form, {headers: postHeaders});

  if (response.status != 200 || response.data.status != 'success') throw `API Error: ${response.data.message}`;

  await changeLang(user.phone, lang, adminAuth);
}

export async function authUser(user: User, adminAuth: AuthData): Promise<string> {
  const form = createForm({
    u_a_tg: user.whatsappId,
    type: 'telegram'
  }, adminAuth)
  const response = await axios.post(`${baseURL}/token/`, form, {headers: postHeaders});

  if (response.status != 200 || response.data.status != 'success') throw `API Error: ${response.data.message}`;

  return String(response.data.auth_user.u_id);
}

export async function changeLang(phone: string, lang_id: string | undefined, adminAuth: AuthData): Promise<{status: string, message: string}> {
  const response = await axios.post(`${baseURL}/user`, {
      token: adminAuth.token,
      u_hash: adminAuth.hash,
      u_a_phone: phone,
      data: JSON.stringify({
          u_lang: lang_id
      })
  }, {headers: postHeaders});

  if (response.status != 200) throw `API Error: ${response.data.message}`;

  return {
      status:response.data.status,
      message:response.data.message
  };
}