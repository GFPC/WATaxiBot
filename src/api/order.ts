import {
  AuthData,
  BookingState,
  builderException,
  createForm,
  postHeaders,
} from "./general";
import { Location } from "../states/types";
import axios from "axios";
import { Chat, Message } from "whatsapp-web.js";
import { constants } from "../constants";
import { newEmptyOrder } from "../states/machines/orderMachine";
import { Context } from "../index";
import { localization, localizationNames } from "../l10n";

export function formatDateAPI(date: Date): string {
  /* Возвращает Date в виде строки формата "год-месяц-день час:минуты:секунды±часы:минуты" */
  const pad = (num: number) => num.toString().padStart(2, "0");

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());

  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  const offsetMinutes = "00"; //date.getTimezoneOffset();
  const offsetSign = "+"; //offsetMinutes > 0 ? '-' : '+';
  const offsetHours = "01"; //pad(Math.floor(Math.abs(offsetMinutes) / 60));
  const offsetMins = "00"; //pad(Math.abs(offsetMinutes) % 60);

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}${offsetSign}${offsetHours}:${offsetMins}`;
}

// Функция, которая вызывается классом Order при изменении состояния заказа
type StateCallback = (
  order: Order,
  oldState: BookingState,
  newState: BookingState,
) => Promise<void>;

// Функция, которая вызывается классом Order при получении нового сообщения в чате
type ChatCallback = (order: Order, message: string) => Promise<void>;
async function CriticalErrorHandler(ctx: Context | undefined, error: any) {
  await ctx?.chat.sendMessage(
    "Ошибка обращения к апи, откат на дефолтное состояние.\nДанные: " +
      error.toString(),
  );
  await ctx?.storage.delete(ctx?.userID ? ctx.userID : "");
  await ctx?.chat?.sendMessage(
    ctx?.constants.getPrompt(
      localizationNames.defaultPrompt,
      ctx?.user.settings.lang.api_id,
    ) ?? "error",
  );
}
export class Order {
  private readonly clientTg: string;
  private readonly adminAuth: AuthData;
  private readonly stateCallback: StateCallback;
  private readonly chatCallback: ChatCallback;
  private readonly observerFrequency: number = 3000; // ms
  isVoting: boolean;
  private socket?: WebSocket;
  id?: number;
  clientId?: string; // TODO: Добавить получение
  driverId?: string; // TODO: Добавить получение
  isComplete: boolean = false;
  isCanceled: boolean = false;
  rate?: number;
  intervalId?: NodeJS.Timeout;
  state?: BookingState;

  waitingTime: number = constants.maxWaitingTimeSecs;
  votingTimer: number = constants.maxVotingWaitingTimeSecs * 1000;
  timerMessage: Message | undefined;
  chat?: Chat | null;
  notificationMessageSended: boolean = false;
  notificationMessage: Message | undefined;
  ctx: Context | undefined;
  submitPrice: number = 0;

  constructor(
    clientTg: string,
    adminAuth: AuthData,
    stateCallback: StateCallback,
    chatCallback: ChatCallback,
    isVoting: boolean = false,
  ) {
    this.clientTg = clientTg;
    this.adminAuth = adminAuth;
    this.stateCallback = stateCallback;
    this.chatCallback = chatCallback;
    this.isVoting = isVoting;
  }

  async extendSubmitPrice(price: number, ctx: Context) {
    this.submitPrice += price;
    console.log("API extendSubmitPrice:", this.submitPrice);
    const data = {
      b_options: [["=", ["submitPrice"], this.submitPrice]],
    };
    const form = createForm(
      {
        data: JSON.stringify(data),
        u_a_phone: ctx.userID.split("@")[0],
        u_a_role: "1",
        action: "edit",
      },
      this.adminAuth,
    );
    try {
      const res = await axios.post(
        `${this.ctx?.baseURL}drive/get/` + this.id,
        form,
        {
          headers: postHeaders,
        },
      );
      console.log("API extendSubmitPrice:", res.data);
    } catch (e) {
      await CriticalErrorHandler(ctx, e);
    }
  }

  async getState(): Promise<BookingState> {
    if (this.id === undefined) throw "The order has not yet been created";

    const data = await this.getData();

    var state = Number(data.data.booking[this.id].b_state);

    var driver_state = -1;
    var suitable_driver: any | undefined =
      data.data.booking[this.id].drivers?.length > 0
        ? (data.data.booking[this.id].drivers.find(
            (driver: any) => driver?.c_canceled === null,
          ) ?? undefined)
        : undefined;
    if (suitable_driver) {
      if (suitable_driver?.c_appointed !== null) {
        driver_state = 0;
      }
      if (suitable_driver?.c_arrived !== null) {
        driver_state = 1;
      }
      if (suitable_driver?.c_started !== null) {
        driver_state = 2;
      }
      if (suitable_driver?.c_canceled !== null) {
        driver_state = 3;
      }
      if (suitable_driver?.c_completed !== null) {
        driver_state = 4;
      }
    } else {
      if (data.data.booking[this.id].drivers?.length > 0) {
        driver_state = 3;
      }
    }

    if (state === 1) {
      if (driver_state === 3) {
        return BookingState.DriverCanceled;
      } else {
        return BookingState.Processing;
      }
    } else if (state === 2) {
      if (driver_state === 0) {
        return BookingState.Approved;
      } else if (driver_state === 1) {
        return BookingState.DriverArrived;
      } else if (driver_state === 2) {
        return BookingState.DriverStarted;
      } else if (driver_state === 3) {
        return BookingState.DriverCanceled;
      } else if (driver_state === 4) {
        return BookingState.Completed;
      }
    } else if (state === 3) {
      return BookingState.Canceled;
    } else if (state === 4) {
      return BookingState.Completed;
    }
    return BookingState.Approved;
    /*
    switch (state) {
      case 1:
        return BookingState.Processing;
      case 2:
        return BookingState.Approved;
      case 3:
        return BookingState.Canceled;
      case 4:
        return BookingState.Completed;
      case 5:
        return BookingState.PendingActivation;
      case 6:
        return BookingState.OfferedToDrivers;
      default:
        throw "Invalid state"
    }
     */
  }

  async resendTimerMessage() {
    await this.timerMessage?.edit(
      this.ctx?.constants.getPrompt(
        localizationNames.votingTimerNotActive,
        this.ctx?.user.settings.lang.api_id,
      ) ?? "error",
    );

    this.timerMessage = await this.ctx?.chat.sendMessage(
      this.ctx?.constants
        .getPrompt(
          localizationNames.votingTimer,
          this.ctx?.user.settings.lang.api_id,
        )
        .replace("%time%", String(this.votingTimer / 1000)) ?? "error",
    );
  }

  async addVotingTime() {
    if (this.id === undefined) throw "The order has not yet been created";
    this.votingTimer += 3 * 60 * 1000;
    await this.ctx?.chat.sendMessage(
      this.ctx?.constants.getPrompt(
        localizationNames.votingExtended,
        this.ctx?.user.settings.lang.api_id,
      ) ?? "error",
    );
    await this.resendTimerMessage();

    const form = createForm(
      {
        u_a_phone: this.clientTg.toString(),
        action: "set_waiting_time",
        previous: this.waitingTime.toString(),
        additional: "180",
      },
      this.adminAuth,
    );
    this.waitingTime += 3 * 60 * 1000;

    // Отправляем запрос
    console.log("CREATING ADD TIME REQ: ", form);
    try {
      const response = await axios.post(
        `${this.ctx?.baseURL}/drive/get/` + this.id,
        form,
        { headers: postHeaders },
      );
      console.log("CREATING ADD TIME RES: ", response.data);

      if (response.status != 200 || response.data.status != "success")
        throw builderException(response.status, response.data.message.error);
    } catch (e) {
      await CriticalErrorHandler(this.ctx, e);
    }
  }

  private async stateChecking() {
    if (this.isVoting && this.state === BookingState.Processing) {
      this.votingTimer -= this.observerFrequency;
      if (this.votingTimer <= 30 * 1000 && !this.notificationMessageSended) {
        this.notificationMessage = await this.chat?.sendMessage(
          this.ctx?.constants
            .getPrompt(
              localizationNames.votingTimerNotification,
              this.ctx?.user.settings.lang.api_id,
            )
            .replace("%time%", String(this.votingTimer / 1000)) ?? "error",
        );
        //this.notificationMessage = await this.chat?.sendMessage(`Время ожидания заканчивается. Осталось *${this.votingTimer/1000}* сек.\nДанное сообщение будет удалено через 5 секунд`);

        this.notificationMessageSended = true;
        setTimeout(async () => {
          await this.notificationMessage?.delete(true);
        }, 5000);
      }
      if (this.votingTimer <= 0) {
        await this.chat?.sendMessage(
          this.ctx?.constants.getPrompt(
            localizationNames.votingTimerExpired,
            this.ctx?.user.settings.lang.api_id,
          ) ?? "error",
        );

        await this.cancel("Voting time expired");
        await this.ctx?.storage.delete(this.ctx?.userID ? this.ctx.userID : "");
        await this.chat?.sendMessage(
          this.ctx?.constants.getPrompt(
            localizationNames.defaultPrompt,
            this.ctx?.user.settings.lang.api_id,
          ) ?? "error",
        );
        return;
      }
      this.timerMessage?.edit(
        this.ctx?.constants
          .getPrompt(
            localizationNames.votingTimer,
            this.ctx?.user.settings.lang.api_id,
          )
          .replace("%time%", String(this.votingTimer / 1000)) ?? "error",
      );
    }
    const state = await this.getState();

    if (state === BookingState.Canceled || state === BookingState.Completed) {
      this.finish();
    }

    if (state !== this.state) {
      const oldState = this.state;
      this.state = state;
      await this.stateCallback(this, oldState ?? state, state);
    }
  }

  async getData(): Promise<any> {
    if (this.id === undefined) throw "The order has not yet been created";
    if (this.isCanceled) throw "The trip was canceled";
    if (this.isComplete) throw "The trip was completed";

    const form = createForm({}, this.adminAuth);
    try {
      return axios
        .post(`${this.ctx?.baseURL}/drive/get/${this.id}`, form, {
          headers: postHeaders,
          timeout: 20000,
        })
        .then((response) => {
          if (response.status != 200 || response.data.status != "success")
            console.log("EXTRAPOINT 0x02: ", response.data);
          if (response.status != 200 || response.data.status != "success")
            throw `API Error: ${response.data}`;
          return response.data;
        })
        .catch(async (error) => {
          console.log("EXTRAPOINT 0x00: ", error);
          await this.chat?.sendMessage(
            "TEMPORARY MSG(EXFA POINT 0x00): Не удалось соединиться с апи, откат к стартовому состоянию",
          );
          await this.ctx?.storage.delete(
            this.ctx?.userID ? this.ctx.userID : "",
          );
          await this.chat?.sendMessage(
            this.ctx?.constants.getPrompt(
              localizationNames.defaultPrompt,
              this.ctx?.user.settings.lang.api_id,
            ) ?? "error",
          );
          throw `API Error: ${error}`;
        });
    } catch (e) {
      await CriticalErrorHandler(this.ctx, e);
    }
  }

  async startStateChecking() {
    if (this.isVoting) {
      this.timerMessage = await this.chat?.sendMessage(
        this.ctx?.constants
          .getPrompt(
            localizationNames.votingTimer,
            this.ctx?.user.settings.lang.api_id,
          )
          .replace("%time%", String(this.votingTimer / 1000)) ?? "error",
      );
    }
    this.intervalId = setInterval(
      this.stateChecking.bind(this),
      this.observerFrequency,
    );
  }

  stopStateChecking() {
    if (this.intervalId === undefined) throw "intervalId is undefined";
    clearInterval(this.intervalId);
  }

  async new(
    startLoc: Location,
    endLoc: Location,
    startDatetime: Date | null,
    peopleCount: number,
    maxWaitingSecs: number,
    chat: Chat | null,
    ctx: Context,
    b_comments: number[],
  ) {
    /* Создание нового заказа */
    if (this.id) throw "The order has already been created";
    if (this.isVoting) {
      this.chat = chat;
      this.waitingTime =
        ctx.constants.data.data.site_constants.waiting_interval_or.value * 1;
      this.votingTimer = this.waitingTime * 1000;
      maxWaitingSecs = this.waitingTime;
    }
    this.ctx = ctx;

    // Переменная для кода водителя(нужно для режима voting)
    var b_driver_code = undefined;

    // Формируем запрос
    const data: { [key: string]: any } = {};

    if (startLoc.address) {
      data.b_start_address = startLoc.address;
    } else {
      data.b_start_latitude = startLoc.latitude;
      data.b_start_longitude = startLoc.longitude;
    }

    if (endLoc.address) {
      data.b_destination_address = endLoc.address;
    } else {
      data.b_destination_latitude = endLoc.latitude;
      data.b_destination_longitude = endLoc.longitude;
    }

    if (startDatetime) {
      data.b_start_datetime = formatDateAPI(startDatetime);
    } else {
      data.b_start_datetime = "now";
    }

    data.b_passengers_count = peopleCount;
    data.b_max_waiting = maxWaitingSecs;
    data.b_payment_way = 1;
    data.b_services = [];
    data.b_comments = b_comments;
    data.b_options = {
      submitPrice: 0,
    };
    // data.u_id = clientId;

    if (this.isVoting) {
      data.b_services.push(5);
    }

    const form = createForm(
      {
        data: JSON.stringify(data),
        u_a_phone: this.ctx.userID.split("@")[0],
        u_a_role: "1",
      },
      this.adminAuth,
    );

    // Отправляем запрос
    console.log("CREATING DRIVE REQ: ", form);
    let response;
    try {
      response = await axios.post(`${this.ctx?.baseURL}/drive`, form, {
        headers: postHeaders,
        timeout: 10000,
      });
    } catch (e) {
      await CriticalErrorHandler(this.ctx, e);
      return false;
    }
    console.log("CREATING DRIVE RES: ", response.data);
    if (this.isVoting) {
      b_driver_code = response.data.data.b_driver_code;
    }

    if (response.status != 200 || response.data.status != "success")
      throw builderException(response.status, JSON.stringify(response.data));

    if (this.isVoting) {
      const confirmForm = createForm(
        {
          action: "set_confirm_state",
          u_a_phone: this.clientTg.toString(),
          u_a_role: "1",
        },
        this.adminAuth,
      );
      try {
        const confirmResponse = await axios.post(
          `${this.ctx?.baseURL}/drive/get/${response.data.data.b_id}`,
          confirmForm,
          { headers: postHeaders, timeout: 10000 },
        );
        console.log("CONFIRMING DRIVE RES: ", confirmResponse.data);
      } catch (e) {
        await CriticalErrorHandler(this.ctx, e);
        return false;
      }
    }

    //if (confirmResponse.status != 200 || confirmResponse.data.status != 'success') throw builderException(confirmResponse.status, confirmResponse.data.message.error);

    this.id = Number(response.data.data.b_id);

    if (isNaN(this.id)) throw "Invalid id";

    this.startStateChecking();
    if (this.isVoting) return b_driver_code;
  }

  private finish(isCanceled: boolean = false) {
    this.isComplete = true;
    this.isCanceled = isCanceled;

    this.stopStateChecking();
  }

  async cancel(reason: string) {
    /* Отмена заказа. */
    if (this.id === undefined) throw "The order has not yet been created";
    if (this.isCanceled) throw "Already been canceled";
    if (this.isComplete) throw "The trip was completed";

    const form = createForm(
      {
        action: "set_cancel_state",
        reason: reason,
        u_a_phone: this.clientTg.split("@")[0],
        u_a_role: "1",
      },
      this.adminAuth,
    );
    try {
      const response = await axios.post(
        `${this.ctx?.baseURL}drive/get/${this.id}`,
        form,
        { headers: postHeaders, timeout: 10000 },
      );
      if (response.status != 200 || response.data.status != "success")
        throw `API Error: ${response.data}`;
    } catch (e) {
      await this.ctx?.chat.sendMessage(
        "Ошибка обращения к апи, откат на дефолтное состояние.\nДанные: " +
          JSON.stringify(e),
      );
      await this.ctx?.storage.delete(this.ctx?.userID ? this.ctx.userID : "");
      await this.chat?.sendMessage(
        this.ctx?.constants.getPrompt(
          localizationNames.defaultPrompt,
          this.ctx?.user.settings.lang.api_id,
        ) ?? "error",
      );
    }

    this.finish(true);
  }

  async setRate(value: number) {
    /* Оценка водителя.
     * Значение должно быть целочисленным числом от 1 до 5 (включительно). */
    if (this.id === undefined) throw "The order has not yet been created";
    if (this.isCanceled) throw "Trip been canceled";
    if (!this.isComplete) throw "Trip not yet complete";
    if (this.rate) throw "The grade has already been set";
    if (value < 1 || value > 5)
      throw "The value must be in the range of 1 to 5 (inclusive).";
    if (!Number.isInteger(value)) throw "The value must be an integer";

    const form = createForm(
      {
        action: "set_rate",
        value: value.toString(),
        u_a_phone: this.clientTg.split("@")[0],
        u_a_role: "1",
      },
      this.adminAuth,
    );

    const response = await axios.post(`${this.ctx?.baseURL}/drive`, form, {
      headers: postHeaders,
      timeout: 10000,
    });

    if (response.status != 200 || response.data.status != "success")
      throw `API Error: ${response.data}`;

    this.rate = value;
  }

  async setOffer(driverId: string) {
    /* Предложение поездки водителю.
     * Доступно только в режиме голосования. */
    if (this.id === undefined) throw "The order has not yet been created";
    if (this.isCanceled) throw "Trip been canceled";
    if (this.isComplete) throw "Trip completed";
    if (!this.isVoting) throw "The type of trip is not a voting";

    const form = createForm(
      {
        action: "set_offer",
        u_id: driverId,
        u_a_phone: this.clientTg.split("@")[0],
        u_a_role: "1",
      },
      this.adminAuth,
    );

    const response = await axios.post(`${this.ctx?.baseURL}/drive`, form, {
      headers: postHeaders,
    });

    if (response.status != 200 || response.data.status != "success")
      throw `API Error: ${response.data}`;
  }

  async getDriverAndCar(): Promise<{
    name: string;
    color: string;
    model: string;
    plate: string;
    phone: string;
  }> {
    if (this.id === undefined) throw "The order has not yet been created";
    const drive = await this.getData();
    const form = createForm({}, this.adminAuth);
    if (drive.data.booking[this.id].drivers.length == 0)
      throw "No driver found";

    const suitable_driver =
      drive.data.booking[this.id].drivers?.length > 0
        ? drive.data.booking[this.id].drivers?.find(
            (driver: any) => driver.c_canceled === null,
          )
        : undefined;
    if (!suitable_driver) throw "No driver found";

    const driver_u_id = drive.data.booking[this.id].drivers[0]?.u_id;
    const car_u_id = drive.data.booking[this.id].drivers[0]?.c_id;

    const driver = await axios.post(
      `${this.ctx?.baseURL}user/${driver_u_id}`,
      form,
      {
        headers: postHeaders,
        timeout: 10000,
      },
    );
    if (driver.status != 200 || driver.data.status != "success")
      console.log(`API Error: ${driver}`);

    const car = await axios.post(
      `${this.ctx?.baseURL}user/${driver_u_id}/car/${car_u_id}`,
      form,
      { headers: postHeaders, timeout: 10000 },
    );
    if (car.status != 200 || car.data.status != "success")
      console.log(`API Error: ${car}`);
    console.log(car.data.data.car, car_u_id);

    const data = {
      name: (
        driver.data.data.user[driver_u_id].u_family +
        " " +
        driver.data.data.user[driver_u_id].u_name
      ).trim(),
      color: car.data.data.car[car_u_id.toString()].color
        ? this.ctx?.constants.getForDriverAndCar.car_colors[
            car.data.data.car[car_u_id.toString()].color.toString()
          ].ru
        : this.ctx?.constants.getPrompt(
            localizationNames.carColorNotSpecified,
            this.ctx?.user.settings.lang.api_id,
          ),
      plate: car.data.data.car[car_u_id].registration_plate,
      model:
        this.ctx?.constants.getForDriverAndCar.car_models[
          car.data.data.car[car_u_id?.toString()].cm_id?.toString()
        ]?.ru ??
        this.ctx?.constants.getPrompt(
          localizationNames.carModelNotSpecified,
          this.ctx?.user.settings.lang.api_id,
        ),
      phone: driver.data.data.user[driver_u_id].u_phone.startsWith("+")
        ? driver.data.data.user[driver_u_id].u_phone
        : "+" + driver.data.data.user[driver_u_id].u_phone,
    };
    return data;
  }
}
