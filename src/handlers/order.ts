import { Context } from "../index";
import {
  newEmptyOrder,
  newVoting,
  OrderMachine,
} from "../states/machines/orderMachine";
import { localization, localizationNames } from "../l10n";
import { OrderObserverCallback } from "../observer/order";
import { Order } from "../api/order";
import { constants } from "../constants";
import {
  GetLocation,
  GetTimestamp,
  parseGetLocationException,
} from "../utils/orderUtils";
import { formatDateHuman, formatString } from "../utils/formatter";
import { newRide, newVote } from "../states/machines/rideMachine";
import {getRouteInfo} from "../api/osrm";
import { Location } from "../states/types";

interface PriceCalculationParams {
/*    base_price: number;
    distance: number;
    price_per_km: number;
    duration: number;
    price_per_minute: number;
    time_ratio: number;
    options_sum: number;*/
    [key: string]: any;
}

interface PriceModel {
    formula: string;
    price: number;
    options: PriceCalculationParams;
}

export function calculatePrice(formula: string, params: PriceCalculationParams): number {
    try {
        // Заменяем переменные в формуле на их значения
        let evaluatedFormula = formula
            .replace('base_price', params.base_price.toString())
            .replace('distance', params.distance.toString())
            .replace('price_per_km', params.price_per_km.toString())
            .replace('duration', params.duration.toString())
            .replace('price_per_minute', params.price_per_minute.toString())
            .replace('time_ratio', params.time_ratio.toString())
            .replace('options_sum', params.options_sum.toString());

        // Вычисляем выражение
        const result = eval(evaluatedFormula);

        // Проверяем, что результат является числом
        if (typeof result !== 'number' || isNaN(result)) {
            throw new Error('Invalid calculation result');
        }

        // Округляем до 2 знаков после запятой
        return Math.trunc(Math.round(result * 100) / 100);
    } catch (error) {
        console.error('Error calculating price:', error);
        throw new Error('Failed to calculate price: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
}
export function formatPriceFormula(formula: string, params: PriceCalculationParams): string {
    try {
        // Заменяем переменные в формуле на их значения
        let formattedFormula = formula
            .replace('base_price', `${params.base_price}`)
            .replace('distance', `${params.distance}`)
            .replace('price_per_km', `${params.price_per_km}`)
            .replace('duration', `${params.duration}`)
            .replace('price_per_minute', `${params.price_per_minute}`)
            .replace('time_ratio', `${params.time_ratio}`)
            .replace('options_sum', `${params.options_sum}`);

        // Добавляем пробелы вокруг операторов для лучшей читаемости
        formattedFormula = formattedFormula
            .replace(/\*/g, ' * ')
            .replace(/\+/g, ' + ')
            .replace(/\-/g, ' - ')
            .replace(/\//g, ' / ')
            .replace(/\(/g, '( ')
            .replace(/\)/g, ' )');

        return formattedFormula;
    } catch (error) {
        console.error('Error formatting price formula:', error);
        throw new Error('Failed to format price formula: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
}

async function calculateOrderPrice(
    from: Location | undefined,
    to: Location | undefined,
    pricingModels: any,
    isVoting: boolean
): Promise<PriceModel> {
    // If either location is not set, return default values
    if (!from?.latitude || !to?.latitude) {
        return {
            formula: '-',
            price: 0,
            options: {}
        };
    }

    const priceModel = pricingModels[isVoting ? "voting" : "basic"];
    const routeInfo = await getRouteInfo(from, to);
    
    // Get current time in GMT+1
    const now = new Date();
    const gmtPlus1 = new Date(now.getTime() + (60 * 60 * 1000)); // Add 1 hour for GMT+1
    const currentHour = gmtPlus1.getUTCHours();
    console.log("CURRENT HOUR: " + currentHour);
    
    // Determine if it's day (6-21) or night (21-6)
    const isDayTime = currentHour >= 6 && currentHour < 21;
    const timeRatio = isDayTime 
        ? priceModel.constants.time_ratio.day
        : priceModel.constants.time_ratio.night;
    
    const params = {
        base_price: priceModel.constants.base_price,
        distance: routeInfo.distance/1000,
        price_per_km: priceModel.constants.price_per_km,
        duration: routeInfo.duration/60,
        price_per_minute: priceModel.constants.price_per_minute,
        time_ratio: timeRatio,
        options_sum: 0
    };

    const price = calculatePrice(priceModel.model.expression, params);

    return {
        formula: priceModel.model.expression,
        price: price,
        options: {
            ...params,
            distance: Math.trunc(params.distance),
            duration: Math.trunc(params.duration)
        }
    };
}

function formatOrderConfirmation(
    ctx: Context,
    state: OrderMachine,
    priceModel: PriceModel
): string {
    return formatString(
        ctx.constants.getPrompt(
            localizationNames.collectionOrderConfirm,
            ctx.user.settings.lang.api_id,
        ),
        {
            from: state.data.from?.address ?? 
                `${state.data.from.latitude} ${state.data.from.longitude}`,
            to: state.data.to?.address ?? 
                `${state.data.to.latitude} ${state.data.to.longitude}`,
            peoplecount: state.data.peopleCount.toString(),
            when: formatDateHuman(state.data.when ?? null, ctx),
            options: state.data.additionalOptions.length > 0
                ? state.data.additionalOptions
                    .map(i => ctx.constants.data.data.booking_comments[i][ctx.user.settings.lang.iso])
                    .join(", ")
                : "",
            price: Math.trunc(priceModel.price).toString() + ' ' + ctx.constants.data.default_currency,
            formula: formatPriceFormula(priceModel.formula, priceModel.options)
        }
    );
}

export async function OrderHandler(ctx: Context) {
  let state: OrderMachine | null = await ctx.storage.pull(ctx.userID);

  if (state === null) {
    // Если состояния нет, создаем новое
    state = newEmptyOrder();
  }
  const exitAvailableStates = [
    "collectionFrom",
    "collectionTo",
    "collectionHowManyPeople",
    "collectionWhen",
    "collectionOrderConfirm",
    "collectionCarCode",
      "collectionShowAdditionalOptions",
      "collectionAdditionalOptions",
  ];
  console.log(state.state);
  if (
    exitAvailableStates.includes(state.state) &&
    (ctx.message.body.toLowerCase() ===
      ctx.constants.getPrompt(
        localizationNames.cancelLower,
        ctx.user.settings.lang.api_id,
      ) ||
      ctx.message.body.toLowerCase() ===
        ctx.constants.getPrompt(
          localizationNames.cancelDigital,
          ctx.user.settings.lang.api_id,
        ))
  ) {
    // Отмена создания заказа доступная после задания начальной точки
    await ctx.storage.delete(ctx.userID);
    await ctx.chat.sendMessage(
      ctx.constants.getPrompt(
        localizationNames.orderCreatingCancel,
        ctx.user.settings.lang.api_id,
      ),
    );
    await ctx.chat.sendMessage(
      ctx.constants.getPrompt(
        localizationNames.defaultPrompt,
        ctx.user.settings.lang.api_id,
      ),
    );
    return;
  }

  switch (state.state) {
    case "collectionOrderConfirm":
      // Собираем подтверждение и создаём заказ.
      if (
        ctx.message.body.toLowerCase() !== "1"
      ) {
        await ctx.chat.sendMessage(
          ctx.constants.getPrompt(
            localizationNames.confirmPrompt,
            ctx.user.settings.lang.api_id,
          ),
        );
        break;
      }

      const chat = await ctx.message.getChat();
      const orderMsg = await chat.sendMessage(ctx.constants.getPrompt(
          localizationNames.creatingOrder,
          ctx.user.settings.lang.api_id,
      ))

      const observer = new OrderObserverCallback(
        ctx.client,
        chat.id,
        ctx.logger,
        ctx.userID,
        ctx.storage,
        ctx.constants,
        ctx.user.settings.lang.api_id,
      );

      if(state.data.voting){
        const order = new Order(
            ctx.userID,
            ctx.auth,
            observer.callback.bind(observer),
            async () => {},
            true,
        );
        const timestamp = await GetTimestamp("сейчас"); // здесь язык не важен

        if (
            timestamp === undefined ||
            (timestamp !== null && Date.now() - timestamp.getTime() > 0)
        ) {
          break;
        }

        const b_driver_code = await order.new(
            state.data.from,
            state.data.to,
            timestamp,
            state.data.peopleCount,
            constants.maxWaitingTimeSecs,
            ctx.chat,
            ctx,
            state.data.additionalOptions,
            state.data.priceModel,
        );

        await ctx.chat.sendMessage("TEST POINT: VOTING DRIVE ID: " + order.id);
        await new Promise((f) => setTimeout(f, constants.orderMessageDelay));
        await orderMsg.edit(
            ctx.constants.getPrompt(
                localizationNames.votingActivated,
                ctx.user.settings.lang.api_id,
            ),
        );
        await ctx.chat.sendMessage(
            ctx.constants
                .getPrompt(
                    localizationNames.votingVerificationCode,
                    ctx.user.settings.lang.api_id,
                )
                .replace("%code%", b_driver_code),
        );
        const newState = newVote(order);

        await ctx.storage.push(ctx.userID, newState);
        break;
      }

      const order = new Order(
        ctx.userID,
        ctx.auth,
        observer.callback.bind(observer),
        async () => {},
      );

      try {
        if (state.data.when === undefined)
          throw "The meaning of when is undefined";
        await order.new(
          state.data.from,
          state.data.to,
          state.data.when,
          state.data.peopleCount,
          constants.maxWaitingTimeSecs,
          ctx.chat,
          ctx,
          state.data.additionalOptions,
            state.data.priceModel
        );

        await ctx.chat.sendMessage("TEST POINT: DRIVE ID: " + order.id);
      } catch (e) {
        ctx.logger.error(`OrderHandler: Error when creating an order: ${e}`);
        await orderMsg.edit(
          ctx.constants.getPrompt(
            localizationNames.errorWhenCreatingOrder,
            ctx.user.settings.lang.api_id,
          ),
        );
        break;
      }
      const newState = newRide(order);
      await ctx.storage.push(ctx.userID, newState);
      await new Promise((f) => setTimeout(f, constants.orderMessageDelay));
      await orderMsg.edit(
        ctx.constants.getPrompt(
          localizationNames.orderCreated,
          ctx.user.settings.lang.api_id,
        ),
      );
      break;
    case "collectionWhen":
      // Собираем информацию о времени.
      // В этот стейт также попадает активация режима голосования
      if (
        ctx.message.body.toLowerCase() === "3"
      ) {
          const pricingModels = JSON.parse(ctx.constants.data.data.site_constants.pricingModels.value).pricing_models;
          state.data.priceModel = await calculateOrderPrice(
              state.data.from,
              state.data.to,
              pricingModels,
              true
          );
          
          state.data.voting = true;
          state.data.when = null;
          state.state = "collectionOrderConfirm";
          
          const response = formatOrderConfirmation(ctx, state, state.data.priceModel);
          await ctx.chat.sendMessage(response);
          await ctx.storage.push(ctx.userID, state);
          break;
      }

      // Здесь нужно привести все варианты ответов к русскому языку
      var msg_body_for_timestamp;
      if (
        ctx.message.body.toLowerCase() ===
          ctx.constants.getPrompt(
            localizationNames.nowLower,
            ctx.user.settings.lang.api_id,
          ) ||
        ctx.message.body.toLowerCase() === "2"
      ) {
        msg_body_for_timestamp = "сейчас";
      } else {
        msg_body_for_timestamp = ctx.message.body;
      }

      const timestamp = await GetTimestamp(
        msg_body_for_timestamp,
        ctx.constants.getPrompt(
          localizationNames.tomorrowLower,
          ctx.user.settings.lang.api_id,
        ),
      );
      await ctx.chat.sendMessage(
        "TEST POINT: RECEIVED +01:00 TIME: " +
          new Date(new Date().getTime() + 3600 * 1000)
            .toUTCString()
            .replace(/ GMT$/, ""),
      );
      const calculatingRouteMessage = await ctx.chat.sendMessage(
          ctx.constants.getPrompt(localizationNames.calculatingRoute, ctx.user.settings.lang.api_id)
      )

      if (timestamp === undefined) {
        await ctx.chat.sendMessage(
          ctx.constants.getPrompt(
            localizationNames.getTimestampError,
            ctx.user.settings.lang.api_id,
          ),
        );
        break;
      }
      if (timestamp !== null && "getTime" in timestamp) {
        console.log(
          parseInt(
            String(
              Date.parse(
                new Date(new Date().getTime() + 3600 * 1000)
                  .toUTCString()
                  .replace(/ GMT$/, ""),
              ) / 1000,
            ),
          ) -
            timestamp?.getTime() / 1000,
        );
      }
      if (
        timestamp !== null &&
        parseInt(
          String(
            Date.parse(
              new Date(new Date().getTime() + 3600 * 1000)
                .toUTCString()
                .replace(/ GMT$/, ""),
            ) / 1000,
          ),
        ) -
          timestamp.getTime() / 1000 >
          0
      ) {
        await ctx.chat.sendMessage(
          ctx.constants.getPrompt(
            localizationNames.timestampTimeout,
            ctx.user.settings.lang.api_id,
          ),
        );
        break;
      }

      state.data.when = timestamp;
      state.state = "collectionOrderConfirm";
      
      const pricingModels = JSON.parse(ctx.constants.data.data.site_constants.pricingModels.value).pricing_models;
      state.data.priceModel = await calculateOrderPrice(
          state.data.from,
          state.data.to,
          pricingModels,
          state.data.voting
      );

      const response = formatOrderConfirmation(ctx, state, state.data.priceModel);
      await new Promise(f => setTimeout(f, 500));
      await calculatingRouteMessage.edit(response);
      await ctx.storage.push(ctx.userID, state);
      break;
    case "collectionAdditionalOptions":
      if (ctx.message.body === "00") {
        state.state = "collectionWhen";
        await ctx.chat.sendMessage(
          ctx.constants.getPrompt(
            localizationNames.collectionWhen,
            ctx.user.settings.lang.api_id,
          ),
        );
        await ctx.storage.push(ctx.userID, state);
        break;
      }
      const msg = ctx.message.body.replace(/\s{2,}/g, " ");
      let successFlag = true;
      for (let i = 0; i < msg.split(" ").length; i++) {
        console.log(state.data.additionalOptions, i);
        if (
          msg.split(" ")[i] in
          [
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8",
            "9",
            "10",
            "11",
            "12",
            "13",
            "14",
            "15",
            "16",
            "17",
            "18",
            "19",
            "20",
          ]
        ) {
          state.data.additionalOptions.push(Number(msg.split(" ")[i]));
        } else {
          successFlag = false;
          break;
        }
      }
      if (!successFlag) {
        await ctx.chat.sendMessage(
          ctx.constants.getPrompt(
            localizationNames.collectionAdditionalOptionsError,
            ctx.user.settings.lang.api_id,
          ),
        );
        state.state = "collectionAdditionalOptions";
        state.data.additionalOptions = [];
        await ctx.storage.push(ctx.userID, state);
        break;
      }
      state.state = "collectionWhen";
      await ctx.chat.sendMessage(
        ctx.constants.getPrompt(
          localizationNames.collectionWhen,
          ctx.user.settings.lang.api_id,
        ),
      );
      break;
    case "collectionShowAdditionalOptions":
      if (ctx.message.body === "1") {
        state.state = "collectionAdditionalOptions";
        await ctx.storage.push(ctx.userID, state);
      }
      else if (ctx.message.body === "2") {
        state.state = "collectionWhen";
        await ctx.chat.sendMessage(
          ctx.constants.getPrompt(
            localizationNames.collectionWhen,
            ctx.user.settings.lang.api_id,
          ),
        );
        await ctx.storage.push(ctx.userID, state);
        break;
      }
      else {
        await ctx.chat.sendMessage(
          ctx.constants.getPrompt(
            localizationNames.commandNotFound,
            ctx.user.settings.lang.api_id,
          ),
        );
        break;
      }

      const MAX_BOOKING_COMMENT_ID = 20;
      var text =
        ctx.constants.getPrompt(
          localizationNames.selectAdditionalOptions,
          ctx.user.settings.lang.api_id,
        ) + "\n";
      for (let i in ctx.constants.data.data.booking_comments) {
        if (Number(i) < MAX_BOOKING_COMMENT_ID) {
          text +=
            i.toString() +
            ". " +
            ctx.constants.data.data.booking_comments[i][
              ctx.user.settings.lang.iso
            ] +
            "\n";
        }
      }
      await ctx.chat.sendMessage(text);
      break;
    case "collectionHowManyPeople":
      // Собираем информацию о кол-ве человек

      // Делаем проверки
      const peopleCount = Number(ctx.message.body);

      if (ctx.message.body.length === 0) {
        await ctx.chat.sendMessage(
          ctx.constants.getPrompt(
            localizationNames.incorrectTextMessageType,
            ctx.user.settings.lang.api_id,
          ),
        );
        break;
      }
      if (isNaN(peopleCount)) {
        await ctx.chat.sendMessage(
          ctx.constants.getPrompt(
            localizationNames.incorrectNumeric,
            ctx.user.settings.lang.api_id,
          ),
        );
        break;
      }
      if (peopleCount > constants.maxPeopleInOrder) {
        await ctx.chat.sendMessage(
          ctx.constants.getPrompt(
            localizationNames.tooManyPeople,
            ctx.user.settings.lang.api_id,
          ),
        );
        break;
      }
      if (peopleCount < constants.minPeopleInOrder) {
        await ctx.chat.sendMessage(
          ctx.constants.getPrompt(
            localizationNames.tooFewPeople,
            ctx.user.settings.lang.api_id,
          ),
        );
        break;
      }

      state.data.peopleCount = peopleCount;
      //state.state = 'collectionWhen';
      state.state = "collectionShowAdditionalOptions";
      await ctx.storage.push(ctx.userID, state);

      //await ctx.chat.sendMessage(ctx.constants.getPrompt(localizationNames.collectionWhen, ctx.user.settings.lang.api_id ));
      await ctx.chat.sendMessage(
        ctx.constants.getPrompt(
          localizationNames.needAdditionalOptionsQuestion,
          ctx.user.settings.lang.api_id,
        ),
      );
      break;
    case "collectionTo":
      // Собираем информацию о конечной точке
      try {
        const location = await GetLocation(
          ctx.message,
          ctx.userID,
          ctx.storage,
          state,
          ctx,
        );

        if (typeof location != "string") {
          state.data.to = location;
          state.state = "collectionHowManyPeople";
          await ctx.storage.push(ctx.userID, state);
          await ctx.chat.sendMessage(
            ctx.constants.getPrompt(
              localizationNames.collectionPeopleCount,
              ctx.user.settings.lang.api_id,
            ),
          );
          break;
        }

        await ctx.chat.sendMessage(location);
      } catch (e) {
        ctx.logger.error(`OrderHandler: ${e}`);
        const response = formatString(
          ctx.constants.getPrompt(
            localizationNames.errorGeolocation,
            ctx.user.settings.lang.api_id,
          ),
          {
            error: await parseGetLocationException(String(e), ctx),
          },
        );
        await ctx.chat.sendMessage(response);
      }

      break;
    default:
      // Если состояние не найдено, создаем новое
      // и собираем информацию о начальной точке.
      try {
        const location = await GetLocation(
          ctx.message,
          ctx.userID,
          ctx.storage,
          state,
          ctx,
        );

        if (typeof location != "string") {
          state.data.from = location;
          state.state = "collectionTo";
          await ctx.storage.push(ctx.userID, state);
          await ctx.chat.sendMessage(
            ctx.constants.getPrompt(
              localizationNames.collectionTo,
              ctx.user.settings.lang.api_id,
            ),
            { linkPreview: false },
          );
          break;
        }

        await ctx.chat.sendMessage(location, { linkPreview: false });
      } catch (e) {
        ctx.logger.error(`OrderHandler: ${e}`);
        const response = formatString(
          ctx.constants.getPrompt(
            localizationNames.errorGeolocation,
            ctx.user.settings.lang.api_id,
          ),
          {
            error: await parseGetLocationException(String(e), ctx),
          },
        );
        await ctx.chat.sendMessage(response);
      }
      break;
  }
}
