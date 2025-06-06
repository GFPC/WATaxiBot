import { createCanvas, Image, ImageData } from "canvas";
import jsqr from "jsqr";

async function loadImage(imageBody: string): Promise<ImageData> {
    // Удаляем префикс "data:image/png;base64," и декодируем строку в буфер
    const base64Data = imageBody.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, "base64");

    // Создаем новый объект Image и загружаем в него изображение
    const img = new Image();
    img.src = imageBuffer;

    // Создаем canvas с размерами изображения
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext("2d");

    // Отрисовываем изображение на canvas
    ctx.drawImage(img, 0, 0);

    // Получаем данные изображения (pixels) в формате Uint8ClampedArray
    return ctx.getImageData(0, 0, img.width, img.height);
}

export async function readQRCodeFromImage(
    imageBody: string,
): Promise<string | undefined> {
    /* Функция, которая считывает QR-код с изображения, закодированного в base64 */
    // Загружаем изображение
    const image = await loadImage(imageBody);

    // Читаем QR код
    const qrCode = jsqr(image.data, image.width, image.height);

    return qrCode?.data;
}
