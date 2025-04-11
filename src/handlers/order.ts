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
        ctx.message.body.toLowerCase() !==
          ctx.constants.getPrompt(
            localizationNames.confirmLower,
            ctx.user.settings.lang.api_id,
          ) &&
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
      const orderMsg = await chat.sendMessage(
        ctx.constants.getPrompt(
          localizationNames.creatingOrder,
          ctx.user.settings.lang.api_id,
        ),
      );

      const observer = new OrderObserverCallback(
        ctx.client,
        chat.id,
        ctx.logger,
        ctx.userID,
        ctx.storage,
        ctx.constants,
        ctx.user.settings.lang.api_id,
      );
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
        ctx.message.body.toLowerCase() ===
          ctx.constants.getPrompt(
            localizationNames.votingLower,
            ctx.user.settings.lang.api_id,
          ) ||
        ctx.message.body.toLowerCase() === "3"
      ) {
        // Создаём новый стейт
        const car_code = ctx.message.body;
        const chat = await ctx.message.getChat();
        const observer = new OrderObserverCallback(
          ctx.client,
          chat.id,
          ctx.logger,
          ctx.userID,
          ctx.storage,
          ctx.constants,
          ctx.user.settings.lang.api_id,
        );
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
        );
        await ctx.chat.sendMessage("TEST POINT:DRIVE ID: " + order.id);
        await ctx.chat.sendMessage(
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
      await ctx.storage.push(ctx.userID, state);

      const response = formatString(
        ctx.constants.getPrompt(
          localizationNames.collectionOrderConfirm,
          ctx.user.settings.lang.api_id,
        ),
        {
          from:
            state.data.from?.address ??
            `${state.data.from.latitude} ${state.data.from.longitude}`,
          to:
            state.data.to?.address ??
            `${state.data.to.latitude} ${state.data.to.longitude}`,
          peoplecount: state.data.peopleCount.toString(),
          when: formatDateHuman(timestamp, ctx),
          options:
            state.data.additionalOptions.length > 0
              ? state.data.additionalOptions
                  .map(
                    (i) =>
                      ctx.constants.data.data.booking_comments[i][
                        ctx.user.settings.lang.iso
                      ],
                  )
                  .join(", ")
              : "",
        },
      );
      await ctx.chat.sendMessage(response);
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
      } else {
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

      console.log(getRouteInfo(
        state.data.from,
        state.data.to
      ))

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
