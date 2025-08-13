export const baseURL = "https://ibronevik.ru/taxi/c/gruzvill/api/v1/";

export interface AuthData {
    token: string;
    hash: string;
}

export enum BookingState {
    Processing = "PROCESSING", // Поиск водителя
    Approved = "APPROVED", // Водитель найден
    Canceled = "CANCELED", // Отменено
    Completed = "COMPLETED", // Завершено
    PendingActivation = "PENDINGACTIVATION",
    OfferedToDrivers = "OFFEREDTODRIVERS",
    DriverArrived = "DURINGDRIVERARRIVED",
    DriverStarted = "DURINGDRIVERSTARTED",
    DriverCanceled = "DURINGDRIVERCANCELED",
    OutOfTime = "OUTOFTIME",
}

export const postHeaders = {
    "User-Agent": "WhatsAppBot/1.0",
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
};

export function createForm(
    data: {
        [key: string]:
            | string
            | Blob
            | undefined
            | { [key: string]: string }
            | string[];
    },
    auth: AuthData,
): FormData {
    /* Функция, которая создает FormData на основе данных авторизации и данных для отправки */
    const form = new FormData();

    form.append("token", auth.token);
    form.append("u_hash", auth.hash);

    for (let key in data) {
        if (data[key] !== undefined) {
            // @ts-ignore
            form.append(key, data[key]);
        }
    }

    return form;
}

export function builderException(status: number, message: string) {
    /* Генерация сообщения для исключения */
    return `API Error (${status}): ${message}`;
}
