import WAWebJS from "whatsapp-web.js";
import {Storage} from "../storage/storage";
import {OrderMachine} from "../states/machines/orderMachine";
import {Location} from "../states/types";
import {localization, localizationNames} from "../l10n";
import {constants} from "../constants";
import {readQRCodeFromImage} from "./qr";
import {Context} from "../index";

export async function GetLocation(msg: WAWebJS.Message, userId: string, storage: Storage, state: OrderMachine, ctx: Context): Promise<Location | string> {
  /* Получение локации из сообщения.
   * Возвращает строку, либо null, если требуется дополнительные действия.
   * Может бросить исключение. */

  if (state.data.handbookActive) {
    // TODO: Вызывать интерфейс справочника
    throw 'No implement'
  }

  if (state?.data.topPlacesActive) {
    // TODO: Вызывать интерфейс любимых мест
    throw 'No implement'
  }

  const codeRegex = /^\d{4,5}$/;

  if (msg.body.toLowerCase() === ctx.constants.getPrompt(localizationNames.topPlacesLower, ctx.user.settings.lang.api_id)) {
    state.data.topPlacesActive = true;
    await storage.push(userId, state);

    // TODO: Сделать отправку любимых мест
    console.log('Любимые места');
    return "Top places";
  } else if (msg.body.toLowerCase() === ctx.constants.getPrompt(localizationNames.handbookLower, ctx.user.settings.lang.api_id)) {
    state.data.handbookActive = true;
    await storage.push(userId, state);

    // TODO: Сделать отправку справочника
    console.log('Справочник');
    return "Handbook";
  } else if (msg.location) {
    // @ts-ignore
    if ((msg.location.latitude == undefined || msg.location.longitude == undefined) && msg.location.address == undefined) {
      throw 'Location is not found'
    }

    const location = msg.location as unknown as Location
    return {
      latitude: location.latitude,
      longitude: location.longitude,
      address: location.address
    }
  } else if (codeRegex.test(msg.body)) {
    // TODO: Сделать получение адреса по коду
    console.log('Код');
    throw 'No implement';
  } else if (msg.hasMedia) {
    // TODO: Скачиваем, расшифруем, проверяем (как выше с кодом)
    const media = await msg.downloadMedia();
    const allowedMimeTypes = ['image/png', 'image/jpeg']; // Разрешённые типы файлов

    if ((media.filesize ?? 0) > constants.maxFileSize) throw 'File size is too large';

    if (media.mimetype.includes('audio/ogg')) {
      // TODO: Сделать поддержку голосовых
      throw 'No implement';
    } else if (allowedMimeTypes.includes(media.mimetype)) {
      const data = await readQRCodeFromImage(media.data); // TODO: Сделать обработку ошибки
      if (data === undefined) throw 'Failed to recognize the QR code';
      console.log(data);
      await msg.reply(`QR-Код: ${data}`);

      throw 'No code found'
    } else {
      throw 'Invalid media type';
    }
  } else if (msg.body.length > 0) {
    // Если просто передан адрес
    return {
      address: msg.body
    };
  } else {
    throw 'Invalid message type';
  }
}

export async function GetTimestamp(body: string,tomorrowMarker:string = "завтра"): Promise<Date | undefined | null> {
  /* Получение timestamp из содержимого сообщения.
   * Если возвращается undefined - то сообщение не распознано.
   * Если возвращается null - то сейчас. */
  const now = new Date( new Date().getTime() + 3600 * 1000).toUTCString().replace( / GMT$/, "" )
  console.log(now);
  const trimmedBody = body.trim().toLowerCase();

  if (trimmedBody === "сейчас") {
    return null;
  }

  const match = trimmedBody.match(/^({tomorrowMarker}\s+)?(\d{1,2}):(\d{2})$/);
  console.log(match);
  if (match) {
    const isTomorrow = Boolean(match[1]);
    const hours = parseInt(match[2]);
    const minutes = parseInt(match[3]);

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

export async function parseGetLocationException(error: string, ctx: Context): Promise<string> {
  switch (error) {
    case "Invalid message type":
      return ctx.constants.getPrompt(localizationNames.incorrectTextMessageType, ctx.user.settings.lang.api_id );
    case "Invalid media type":
      return ctx.constants.getPrompt(localizationNames.incorrectImageMediaType, ctx.user.settings.lang.api_id );
    case "File size is too large":
      return ctx.constants.getPrompt(localizationNames.largeFileSize, ctx.user.settings.lang.api_id );
    case "Failed to recognize the QR code":
      return ctx.constants.getPrompt(localizationNames.qrScanFailed, ctx.user.settings.lang.api_id );
    case "Location is not found":
      return ctx.constants.getPrompt(localizationNames.locationNotFound, ctx.user.settings.lang.api_id );
  }

  return error;
}
