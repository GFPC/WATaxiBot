import {Context} from "../index";
import {RideMachine} from "../states/machines/rideMachine";
import {localization, localizationNames} from "../l10n";
import {constants} from "../constants";
import {newEmptyOrder, OrderMachine} from "../states/machines/orderMachine";
import {MessageMedia} from "whatsapp-web.js";

export async function RideHandler(ctx: Context) {
  var state = await ctx.storage.pull(ctx.userID);
  console.log('RIDE HANDLER: ', ctx.message.body,state.state)
  if(ctx.message.body.toLowerCase() === ctx.constants.getPrompt(localizationNames.cancelLower, ctx.user.settings.lang.api_id ) || ctx.message.body.toLowerCase() === ctx.constants.getPrompt(localizationNames.cancelDigital, ctx.user.settings.lang.api_id )){
      ctx.message.body = "отмена";
  }
  switch (state.state) {
    case "searchCar":
      switch (ctx.message.body.toLowerCase()) {
        case "отмена":
          state.data.isCollectionReason = true;
          const text = {
            mistakenlyOrder: ctx.constants.getPrompt('mistakenly_ordered', ctx.user.settings.lang.api_id ),
            waitingForLonger: ctx.constants.getPrompt('waiting_for_long', ctx.user.settings.lang.api_id ),
            conflictWithRider: ctx.constants.getPrompt('conflict_with_rider', ctx.user.settings.lang.api_id ),
            veryExpensive: ctx.constants.getPrompt('very_expensive', ctx.user.settings.lang.api_id ),
          }
          const reasonContainer = "\n" + text.mistakenlyOrder + " - 1\n" + text.waitingForLonger + " - 2\n" + text.conflictWithRider + " - 3\n" + text.veryExpensive + " - 4";
          await ctx.chat.sendMessage(ctx.constants.getPrompt(localizationNames.collectionCancelReason, ctx.user.settings.lang.api_id ).replace('%reasons%', reasonContainer));
          state.state = 'cancelReason';
          await ctx.storage.push(ctx.userID, state);
          break;
        default:
          if (state.data.isCollectionReason) {
            await state.data.order.cancel(ctx.message.body);
            await ctx.chat.sendMessage(ctx.constants.getPrompt(localizationNames.orderCanceled, ctx.user.settings.lang.api_id ));
            break;
          }

          if (state.state === "rate") {
            const rateNum = Number(ctx.message.body);
            if (!isNaN(rateNum) && rateNum >= 1 && rateNum <= 5) {
              await state.data.order.setRate(rateNum);
              await ctx.chat.sendMessage(ctx.constants.getPrompt(localizationNames.rateSet, ctx.user.settings.lang.api_id ));
              await new Promise(f => setTimeout(f, constants.rateMessagesDelay));
            }

            await ctx.chat.sendMessage(ctx.constants.getPrompt(localizationNames.orderCompleted, ctx.user.settings.lang.api_id ));
            await ctx.storage.delete(ctx.userID);
            break;
          }

          await ctx.chat.sendMessage("from ride handler");
          break;
      }
      break;
    case "cancelReason":
      if(ctx.message.body.toLowerCase() === ctx.constants.getPrompt(localizationNames.answerBackLower, ctx.user.settings.lang.api_id ) || ctx.message.body === '1'){ //назад
        if(state.data.order.isVoting){
          state.id = 'voting'
          state.state = 'voting'
          await ctx.chat.sendMessage(ctx.constants.getPrompt(localizationNames.orderCancellationInterrupted, ctx.user.settings.lang.api_id ));
          await state.data.order.resendTimerMessage();
          break;
        }
        state.state = "searchCar";
        await ctx.storage.push(ctx.userID, state);
        await ctx.chat.sendMessage(ctx.constants.getPrompt(localizationNames.stateProcessing, ctx.user.settings.lang.api_id ));
        break;
      }
      if(ctx.message.body.toLowerCase() === ctx.constants.getPrompt(localizationNames.cancelLower, ctx.user.settings.lang.api_id ) ||
          ctx.message.body.toLowerCase() === ctx.constants.getPrompt(localizationNames.cancelDigital, ctx.user.settings.lang.api_id ) ||
          ctx.message.body.toLowerCase() === 'отмена'){
        await state.data.order.cancel('');
        await ctx.chat.sendMessage(ctx.constants.getPrompt(localizationNames.orderCanceled, ctx.user.settings.lang.api_id ));
        await ctx.storage.delete(ctx.userID);
        break;
      }
      if(['1', '2', '3', '4'].includes(ctx.message.body)){

        if(ctx.message.body === '1'){
          await state.data.order.cancel(ctx.constants.getPrompt('mistakenly_ordered', ctx.user.settings.lang.api_id ));
        } else if(ctx.message.body === '2'){
          await state.data.order.cancel(ctx.constants.getPrompt('waiting_for_long', ctx.user.settings.lang.api_id ));
        } else if(ctx.message.body === '3'){
          await state.data.order.cancel(ctx.constants.getPrompt('conflict_with_rider', ctx.user.settings.lang.api_id ));
        } else if(ctx.message.body === '4'){
          await state.data.order.cancel(ctx.constants.getPrompt('very_expensive', ctx.user.settings.lang.api_id ));
        }
        await ctx.chat.sendMessage(ctx.constants.getPrompt(localizationNames.closeReasonSpecified, ctx.user.settings.lang.api_id ));
        await ctx.storage.delete(ctx.userID);
      }
      break;


    case "rate":
      if(ctx.message.body.toLowerCase() === ctx.constants.getPrompt(localizationNames.answerBackLower, ctx.user.settings.lang.api_id )){ //назад
        state.state = "searchCar";
        await ctx.storage.push(ctx.userID, state);
        await ctx.chat.sendMessage(ctx.constants.getPrompt(localizationNames.stateProcessing, ctx.user.settings.lang.api_id ));
        break;
      }
      await ctx.storage.delete(ctx.userID);
      await ctx.chat.sendMessage(ctx.constants.getPrompt(localizationNames.closeReasonSpecified, ctx.user.settings.lang.api_id ));
      break;

    default:
      console.log('GFP POINT 0x02, state: ', state.state);
      await ctx.chat.sendMessage("RIDE HANDLER -> GFP POINT 0x02");
  }


}