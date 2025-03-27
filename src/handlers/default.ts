import { Context } from "../index";
import { localization, localizationNames } from "../l10n";
import { newEmptyOrder } from "../states/machines/orderMachine";
import { newSettings } from "../states/machines/settingsMachine";
import { addAbortListener } from "ws";
import searchRefCodeByREfID from "../utils/settings";
export async function DefaultHandler(ctx: Context): Promise<void> {
  const state = await ctx.storage.pull(ctx.userID);

  if (state === null || state === undefined || state === "") {
    switch (ctx.message.body) {
      case "0":
        await ctx.chat.sendMessage(
          ctx.constants.getPrompt(
            localizationNames.enterStartPoint,
            ctx.user.settings.lang.api_id,
          ),
          { linkPreview: false },
        );
        await ctx.storage.push(ctx.userID, newEmptyOrder());
        break;
      case "1":
        const user = await ctx.usersList.pull(ctx.userID.split("@")[0]);
        await ctx.chat.sendMessage(
          ctx.constants
            .getPrompt(
              localizationNames.settingsMenu,
              ctx.user.settings.lang.api_id,
            )
            .replace(
              "%language%",
              user.settings.lang.native + "(" + user.settings.lang.iso + ")",
            )
            .replace(
              "%refCode%",
              searchRefCodeByREfID(user.referrer_u_id,ctx) ?? "---",
            )
            .replace("%selfRefCode%", user.ref_code ?? "---")
            .replace(
              "%prevRefCodeHint%",
              user.referrer_u_id === "666"
                ? ctx.constants
                    .getPrompt(
                      localizationNames.settingsPreviousReferralCode,
                      ctx.user.settings.lang.api_id,
                    )
                    .replace("%code%", user.u_details?.refCodeBackup) + "\n"
                : "",
            )
            .replace(
              "%testModeHint%",
              user.referrer_u_id === "666"
                ? ctx.constants.getPrompt(
                    localizationNames.settingsTestModeActive,
                    ctx.user.settings.lang.api_id,
                  )
                : ctx.constants.getPrompt(
                    localizationNames.settingsTestModeHint,
                    ctx.user.settings.lang.api_id,
                  ),
            ),
        );

        await ctx.storage.push(ctx.userID, newSettings());
        break;
      case "9":
        await ctx.chat.sendMessage(
          ctx.constants.getPrompt(
            localizationNames.help,
            ctx.user.settings.lang.api_id,
          ),
        );
        break;
      default:
        await ctx.chat.sendMessage(
          ctx.constants.getPrompt(
            localizationNames.commandNotFound,
            ctx.user.settings.lang.api_id,
          ),
        );
        break;
    }
  }
}
