import { Context } from "../index";
import {
  createEmptyRegistration,
  RegistrationMachine,
} from "../states/machines/registerMachine";
import { localization, localizationNames } from "../l10n";
import { changeLang, register } from "../api/user";
import { constants } from "../constants";
import { formatString } from "../utils/formatter";

type LanguageCodeData = {
  id: string;
  native: string;
  api_id: string;
  iso: string;
};
type LanguageCodeListData = LanguageCodeData[];
const languages: LanguageCodeListData = [
  {
    id: "1",
    native: "Русский",
    api_id: "1",
    iso: "ru",
  },
  {
    id: "2",
    native: "English",
    api_id: "2",
    iso: "en",
  },
  {
    id: "3",
    native: "العربية",
    api_id: "3",
    iso: "ar",
  },
  {
    id: "4",
    native: "Français",
    api_id: "4",
    iso: "fr",
  },
];

export async function RegisterHandler(ctx: Context) {
  /* Обработчик регистрации пользователя */
  let state: RegistrationMachine | null = await ctx.storage.pull(ctx.userID);
  ctx.logger.info(
    `RegisterHandler: User ${ctx.userID} state: ${JSON.stringify(state)}`,
  );

  switch (state?.state) {
    case "collectionRefCode":
      // Получаем реферальный код и зарегистрируем пользователя
      state.data.refCode = ctx.message.body;
      console.log("TEST POINT: ", state.data);
      try {
        await register(
          {
            whatsappId: ctx.userID,
            name: state.data.fullName,
            phone: ctx.userID.split("@")[0],
            lang: state.data.lang.api_id,
            refCode:
              state.data.refCode !== "0" ? state.data.refCode : undefined,
            u_details: {
              refCodeBackup: "",
            },
          },
          ctx.auth,
          ctx.baseURL,
        );
      } catch (e: any) {
        if (String(e).includes("wrong ref_code")) {
          await ctx.chat.sendMessage(
            ctx.constants.getPrompt(
              localizationNames.refCodeInvalid,
              state.data.lang.api_id,
            ),
          );
          break;
        }
        ctx.logger.error(
          `RegisterHandler: Error during user registration: ${e}`,
        );
        await ctx.chat.sendMessage(
          formatString(
            ctx.constants.getPrompt(
              localizationNames.registrationError,
              state.data.lang.api_id,
            ),
            {
              "%error%": String(e),
            },
          ),
        );
        return;
      }

      ctx.logger.info(`RegisterHandler: New user ${ctx.userID} registered`);

      await ctx.storage.delete(ctx.userID);
      await ctx.storage.delete(`reg:${ctx.userID}`);
      await ctx.chat.sendMessage(
        ctx.constants.getPrompt(
          localizationNames.registrationSuccessful,
          state.data.lang.api_id,
        ),
      );
      break;
    case "collectionFullName":
      // Получаем ФИО пользователя
      state.data.fullName = ctx.message.body;
      state.state = "collectionRefCode";
      await ctx.storage.push(ctx.userID, state);

      await ctx.chat.sendMessage(
        ctx.constants.getPrompt(
          localizationNames.sendRefCode,
          state.data.lang.api_id,
        ),
      );
      break;

    case "collectionLegalInformation":
      if (ctx.message.body === "1") {
        state.state = "collectionFullName";
        await ctx.chat.sendMessage(
          ctx.constants.getPrompt(
            localizationNames.sendFullName,
            state.data.lang.api_id,
          ),
        );
        await ctx.storage.push(ctx.userID, state);
        break;
      } else if (ctx.message.body === "3") {
        state.data.docs.legalInformationExpanded =
          !state.data.docs.legalInformationExpanded;

        await state.data.docs.legalInformationMessage?.edit(
          ctx.constants
            .getPrompt(
              localizationNames.legal_information,
              state.data.lang.api_id,
            )
            .replace(
              "%doc%",
              state.data.docs.legalInformationExpanded
                ? ctx.constants.getPrompt(
                    localizationNames.legal_information_big,
                    state.data.lang.api_id,
                  )
                : "",
            )
            .replace(
              "%action%",
              ctx.constants.getPrompt(
                state.data.docs.legalInformationExpanded
                  ? localizationNames.collapse_doc
                  : localizationNames.expand_doc,
                state.data.lang.api_id,
              ),
            )
              .replace(
                  "%accept%",
                  ctx.constants.getPrompt(localizationNames.next_step, state.data.lang.api_id)
              ),
        );

        await ctx.storage.push(ctx.userID, state);
        break;
      } else {
        await ctx.chat.sendMessage(
          ctx.constants.getPrompt(
            localizationNames.commandNotFound,
            state.data.lang.api_id,
          ),
        );
      }
      break;

    case "collectionPrivacyPolicy":
      if (ctx.message.body === "1") {
        if(!state.data.docs.publicOffersExpanded){
          await ctx.chat.sendMessage(
              ctx.constants
                  .getPrompt(localizationNames.commandNotFound, state.data.lang.api_id)
          );
          break;
        }
        state.state = "collectionLegalInformation";
        state.data.docs.legalInformationMessage = await ctx.chat.sendMessage(
          ctx.constants
            .getPrompt(
              localizationNames.legal_information,
              state.data.lang.api_id,
            )
            .replace("%doc%", "")
            .replace(
              "%action%",
              ctx.constants.getPrompt(
                localizationNames.expand_doc,
                state.data.lang.api_id
              ),
            ).replace(
                "%accept%",
              ctx.constants.getPrompt(localizationNames.next_step, state.data.lang.api_id)
          ),
        );
        await ctx.storage.push(ctx.userID, state);
        break;
      } else if (ctx.message.body === "2") {
        await ctx.chat.sendMessage(
          ctx.constants.getPrompt(
            localizationNames.reject_terms,
            state.data.lang.api_id,
          ),
        );
      } else if (ctx.message.body === "3") {
        state.data.docs.privacyPolicyExpanded =
          !state.data.docs.privacyPolicyExpanded;

        await state.data.docs.privacyPolicyMessage?.edit(
          ctx.constants
            .getPrompt(localizationNames.privacy_policy, state.data.lang.api_id)
            .replace(
              "%doc%",
              state.data.docs.privacyPolicyExpanded
                ? ctx.constants.getPrompt(
                    localizationNames.privacy_policy_big,
                    state.data.lang.api_id,
                  )
                : "",
            )
            .replace(
              "%action%",
              ctx.constants.getPrompt(
                state.data.docs.privacyPolicyExpanded
                  ? localizationNames.collapse_doc
                  : localizationNames.expand_doc,
                state.data.lang.api_id,
              ),
            )
              .replace(
                  "%accept%",
                  state.data.docs.privacyPolicyExpanded ? ctx.constants.getPrompt(
                      localizationNames.accept_doc,
                      state.data.lang.api_id
                  ) : ""
              ),
        );

        await ctx.storage.push(ctx.userID, state);
        break;
      } else {
        await ctx.chat.sendMessage(
          ctx.constants.getPrompt(
            localizationNames.commandNotFound,
            state.data.lang.api_id,
          ),
        );
      }
      break;

    case "collectionPublicOffers":
      if (ctx.message.body === "1") {

        if(!state.data.docs.publicOffersExpanded){
          await ctx.chat.sendMessage(
            ctx.constants
              .getPrompt(localizationNames.commandNotFound, state.data.lang.api_id)
          );
          break;
        }

        state.state = "collectionPrivacyPolicy";
        state.data.docs.privacyPolicyMessage = await ctx.chat.sendMessage(
          ctx.constants
            .getPrompt(localizationNames.privacy_policy, state.data.lang.api_id)
            .replace("%doc%", "")
            .replace(
              "%action%",
              ctx.constants.getPrompt(
                localizationNames.expand_doc,
                state.data.lang.api_id,
              ),
            )
              .replace("%accept%", ""),
        );
        await ctx.storage.push(ctx.userID, state);
        break;
      } else if (ctx.message.body === "2") {
        await ctx.chat.sendMessage(
          ctx.constants.getPrompt(
            localizationNames.reject_terms,
            state.data.lang.api_id,
          ),
        );
      } else if (ctx.message.body === "3") {
        state.data.docs.publicOffersExpanded =
          !state.data.docs.publicOffersExpanded;

        await state.data.docs.publicOffersMessage?.edit(
          ctx.constants
            .getPrompt(localizationNames.public_offers, state.data.lang.api_id)
            .replace(
              "%doc%",
              state.data.docs.publicOffersExpanded
                ? ctx.constants.getPrompt(
                    localizationNames.public_offers_big,
                    state.data.lang.api_id,
                  )
                : "",
            )
            .replace(
              "%action%",
              ctx.constants.getPrompt(
                state.data.docs.publicOffersExpanded
                  ? localizationNames.collapse_doc
                  : localizationNames.expand_doc,
                state.data.lang.api_id,
              ),
            )
              .replace(
                  "%accept%",
                  state.data.docs.publicOffersExpanded ? ctx.constants.getPrompt(localizationNames.accept_doc, state.data.lang.api_id) : "",
              ),
        );

        await ctx.storage.push(ctx.userID, state);
        break;
      } else {
        await ctx.chat.sendMessage(
          ctx.constants.getPrompt(
            localizationNames.commandNotFound,
            state.data.lang.api_id,
          ),
        );
      }
      break;

    case "collectionLanguage":
      if (languages.map((item) => item.id).includes(ctx.message.body)) {
        state.state = "collectionPublicOffers";

        const selectedLang = languages.find(
          (item) => item.id == ctx.message.body,
        );
        if(ctx.message.body !== '1'){
          await ctx.chat.sendMessage('TEST POINT: На данный момент доступен только русский язык, выберите его, введя ( *1* )');
          state.state = "collectionLanguage";
          await ctx.storage.push(ctx.userID, state);
          break;
        }
        state.data.lang.iso = selectedLang?.iso ?? "en";
        state.data.lang.api_id = selectedLang?.api_id ?? "2";
        state.data.docs.publicOffersMessage = await ctx.chat.sendMessage(
          ctx.constants
            .getPrompt(localizationNames.public_offers, state.data.lang.api_id)
            .replace("%doc%", "")
            .replace(
              "%action%",
              ctx.constants.getPrompt(
                localizationNames.expand_doc,
                state.data.lang.api_id,
              ),
            ).replace("%accept%", ""),
        );
        await ctx.storage.push(ctx.userID, state);
        break;
      } else {
        await ctx.chat.sendMessage(
          ctx.constants.getPrompt(
            localizationNames.invalid_language,
            state.data.lang.api_id,
          ),
        );
      }

      break;

    default:
      // Создаём новое состояние
      state = await createEmptyRegistration(ctx);
      await ctx.storage.push(ctx.userID, state);
      // Возвращаем приветственные сообщения
      await ctx.chat.sendMessage(
        ctx.constants.getPrompt(
          localizationNames.welcome,
          ctx.constants.data.default_lang,
        ),
      );
      await ctx.chat.sendMessage(
        ctx.constants.getPrompt(
          localizationNames.selectLanguage,
          ctx.constants.data.default_lang,
        ),
      );
      state.state = "collectionLanguage";
      await ctx.storage.push(ctx.userID, state);
      //await new Promise(f => setTimeout(f, constants.registerMessagesDelay));

      await ctx.chat.sendMessage(
        languages
          .map(
            (item) =>
              item.native + "(" + item.iso + ")" + " - *" + item.id + "*",
          )
          .join("\n"),
      );
      break;
  }
}
