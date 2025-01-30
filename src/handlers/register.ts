import {Context} from "../index";
import {createEmptyRegistration, RegistrationMachine} from "../states/machines/registerMachine";
import {localization, localizationNames} from "../l10n";
import {changeLang, register} from "../api/user";
import {constants} from "../constants";
import {formatString} from "../utils/formatter";

type LanguageCodeData = ({ id: string, native: string, api_id: string, iso: string });
type LanguageCodeListData = LanguageCodeData[];
const languages: LanguageCodeListData = [
  {
    id: '1',
    native: 'Русский',
    api_id: '1',
    iso: 'ru',
  },
  {
    id: '2',
    native: 'English',
    api_id: '2',
    iso: 'en',
  },
  {
    id: '3',
    native: 'العربية',
    api_id: '3',
    iso: 'ar',
  },
  {
    id: '4',
    native: 'Français',
    api_id: '4',
    iso: 'fr',
  }
];

export async function RegisterHandler(ctx: Context) {
  /* Обработчик регистрации пользователя */
  let state: RegistrationMachine | null = await ctx.storage.pull(ctx.userID);
  ctx.logger.info(`RegisterHandler: User ${ctx.userID} state: ${JSON.stringify(state)}`);

  switch (state?.state) {
    case "collectionRefCode":
      // Получаем реферальный код и зарегистрируем пользователя
      state.data.refCode = ctx.message.body;
      try {
        await register(
          {
            whatsappId: ctx.userID,
            name: state.data.fullName,
            phone: ctx.userID.split('@')[0],
            lang: ctx.user.settings.lang.api_id,
            refCode: state.data.refCode!=='0' ? state.data.refCode : undefined
          },
          ctx.auth
        );
      } catch (e: any) {
        if(String(e).includes("wrong ref_code")){
          await ctx.chat.sendMessage(
            ctx.constants.getPrompt(localizationNames.refCodeInvalid, state.data.lang.api_id )
          );
          break;
        }
        ctx.logger.error(`RegisterHandler: Error during user registration: ${e}`)
        await ctx.chat.sendMessage(formatString(
            ctx.constants.getPrompt(localizationNames.registrationError, state.data.lang.api_id ),
          {
            "%error%": String(e)
          }
        ));
        return;
      }

      ctx.logger.info(`RegisterHandler: New user ${ctx.userID} registered`);

      await ctx.storage.delete(ctx.userID);
      await ctx.storage.delete(`reg:${ctx.userID}`);
      await ctx.chat.sendMessage(
        ctx.constants.getPrompt(localizationNames.defaultPrompt, state.data.lang.api_id )
      )
      break;
    case "collectionFullName":
      // Получаем ФИО пользователя
      state.data.fullName = ctx.message.body;
      state.state = "collectionRefCode";
      await ctx.storage.push(ctx.userID, state);

      await ctx.chat.sendMessage(ctx.constants.getPrompt(localizationNames.sendRefCode, state.data.lang.api_id ));
      break;
    case 'collectionLanguage':
      if(languages.map( item => item.id).includes(ctx.message.body)){
        state.state = 'collectionFullName';


        const selectedLang = languages.find( item => item.id == ctx.message.body);
        state.data.lang.iso = selectedLang?.iso ?? 'en';
        state.data.lang.api_id = selectedLang?.api_id ?? '2';
        await ctx.storage.push(ctx.userID, state);
        await ctx.chat.sendMessage(ctx.constants.getPrompt(localizationNames.sendFullName, state.data.lang.api_id ));
        break;
      } else {
        await ctx.chat.sendMessage(ctx.constants.getPrompt(localizationNames.commandNotFound, state.data.lang.api_id ));
      }
    default:
      // Создаём новое состояние
      state = await createEmptyRegistration(ctx);
      await ctx.storage.push(ctx.userID, state);
      // Возвращаем приветственные сообщения
      await ctx.chat.sendMessage(ctx.constants.getPrompt(localizationNames.welcome, ctx.constants.data.default_lang ));
      //await new Promise(f => setTimeout(f, constants.registerMessagesDelay));
      await ctx.chat.sendMessage(ctx.constants.getPrompt(localizationNames.selectLanguage, ctx.constants.data.default_lang ))
      await ctx.chat.sendMessage(languages.map( item => item.native + '(' + item.iso + ')' + ' - *' + item.id + '*').join('\n'));
      break;
  }
}