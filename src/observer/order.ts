import { ChatId, Client } from "whatsapp-web.js";
import { Logger } from "winston";
import { Order } from "../api/order";
import { localization, localizationNames } from "../l10n";
import { BookingState } from "../api/general";
import { Storage } from "../storage/storage";
import { RideMachine } from "../states/machines/rideMachine";
import { Constants } from "../api/constants";
import {calculatePrice, formatPriceFormula} from "../handlers/order";

export class OrderObserverCallback {
  client: Client;
  logger: Logger;
  chatId: ChatId;
  userId: string;
  storage: Storage;
  constants: Constants;
  lang: string;
  constructor(
    client: Client,
    chatId: ChatId,
    logger: Logger,
    userId: string,
    storage: Storage,
    constants: Constants,
    lang: string,
  ) {
    this.client = client;
    this.logger = logger;
    this.chatId = chatId;
    this.userId = userId;
    this.storage = storage;
    this.constants = constants;
    this.lang = lang;
  }

  async callback(order: Order, oldState: BookingState, newState: BookingState) {
    this.logger.info(order.state);

    const chat = await this.client.getChatById(this.chatId._serialized);
    const state: RideMachine = await this.storage.pull(this.userId);
    console.log(newState);

    // TODO: Approved -> Processing => водитель отказался от заказа

    if (order.isVoting) {
      // Для режима голосования

      switch (newState) {
        case BookingState.Processing:
          break;
        case BookingState.Approved:
          await chat.sendMessage(
            this.constants.getPrompt(
              localizationNames.stateApproved,
              this.lang,
            ),
          );
          break;
        case BookingState.DriverArrived:
          var driver_and_car = await order.getDriverAndCar();
          await chat.sendMessage(
            this.constants
              .getPrompt(localizationNames.driverArrived, this.lang)
              .replace("%phone%", driver_and_car.phone),
          );
          break;
        case BookingState.DriverStarted:
          state.data.driveStartedTimestamp = Math.floor(Date.now() / 1000);
          await this.storage.push(this.userId, state);
          await chat.sendMessage(
            this.constants.getPrompt(
              localizationNames.driverStarted,
              this.lang,
            ),
          );
          break;
        case BookingState.DriverCanceled:
          await chat.sendMessage(
            this.constants.getPrompt(
              localizationNames.driverCanceled,
              this.lang,
            ),
          );
          break;
        case BookingState.Canceled:
          await chat.sendMessage(
            this.constants.getPrompt(
              localizationNames.driverCanceled,
              this.lang,
            ),
          );
          break;
        case BookingState.Completed:
          const currentTimestamp = Math.floor(Date.now() / 1000);
          state.data.pricingModel.options.duration = Math.round((currentTimestamp - (state.data.driveStartedTimestamp ?? Math.floor(Date.now() / 1000))) / 60);
          state.data.pricingModel.options.submit_price = order.submitPrice;
          state.data.pricingModel.price = calculatePrice(state.data.pricingModel.formula, state.data.pricingModel.options);
          await chat.sendMessage(
            this.constants.getPrompt(
              localizationNames.stateCompleted,
              this.lang,
            ).replace('%price%', state.data.pricingModel.price == 0 ? '-' : String(state.data.pricingModel.price))
                .replace('%formula%', formatPriceFormula(
                    state.data.pricingModel.formula,
                    state.data.pricingModel.options
                ))
          );
          state.state = "rate";
          await this.storage.push(this.userId, state);
          break;
        default:
          await chat.sendMessage(
            this.constants
              .getPrompt(localizationNames.stateOther, this.lang)
              .replace("%state%", newState.toString()),
          );
      }
    } else {
      // Для обычной поездки
      switch (newState) {
        case BookingState.Processing:
          //await chat.sendMessage(this.constants.getPrompt(localizationNames.stateProcessing, this.lang));
          break;
        case BookingState.Approved:
          console.log("Approved");
          var driver_and_car = await order.getDriverAndCar();
          await chat.sendMessage(
            this.constants
              .getPrompt(localizationNames.stateApproved, this.lang)
              .replace("%driver%", driver_and_car.name)
              .replace("%color%", driver_and_car.color)
              .replace("%model%", driver_and_car.model)
              .replace("%plate%", driver_and_car.plate),
          );
          break;
        case BookingState.DriverArrived:
          var driver_and_car = await order.getDriverAndCar();
          await chat.sendMessage(
            this.constants
              .getPrompt(localizationNames.driverArrived, this.lang)
              .replace("%phone%", driver_and_car.phone),
          );
          break;
        case BookingState.DriverStarted:
          state.data.driveStartedTimestamp = Math.floor(Date.now() / 1000);
          await this.storage.push(this.userId, state);
          await chat.sendMessage(
            this.constants.getPrompt(
              localizationNames.driverStarted,
              this.lang,
            ),
          );
          break;
        case BookingState.DriverCanceled:
          await chat.sendMessage(
            this.constants.getPrompt(
              localizationNames.driverCanceled,
              this.lang,
            ),
          );
          break;
        case BookingState.Canceled:
          //await chat.sendMessage(this.constants.getPrompt(localizationNames.orderClosedByAPI, this.lang) + this.constants.getPrompt(localizationNames.defaultPrompt, this.lang));
          break;

        case BookingState.Completed:
          const currentTimestamp = Math.floor(Date.now() / 1000);
          state.data.pricingModel.options.duration = Math.round((currentTimestamp - (state.data.driveStartedTimestamp ?? Math.floor(Date.now() / 1000))) / 60);
          state.data.pricingModel.options.submit_price = order.submitPrice;
          state.data.pricingModel.price = calculatePrice(state.data.pricingModel.formula, state.data.pricingModel.options);
          await chat.sendMessage(
            this.constants.getPrompt(
              localizationNames.stateCompleted,
              this.lang,
            ).replace('%price%', state.data.pricingModel.price == 0 ? '-' : String(state.data.pricingModel.price))
                .replace('%formula%', formatPriceFormula(
                    state.data.pricingModel.formula,
                    state.data.pricingModel.options
                )),
          );
          state.state = "rate";
          await this.storage.push(this.userId, state);
          break;
        default:
          await chat.sendMessage(
            this.constants
              .getPrompt(localizationNames.stateOther, this.lang)
              .replace("%state%", newState.toString()),
          );
          break;
      }
    }
  }
}
