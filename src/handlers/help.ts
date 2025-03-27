import { Context } from "../index";
import { localization, localizationNames } from "../l10n";
import { newEmptyOrder } from "../states/machines/orderMachine";
import { newSettings } from "../states/machines/settingsMachine";
import { addAbortListener } from "ws";
export async function HelpHandler(ctx: Context): Promise<void> {
  const state = await ctx.storage.pull(ctx.userID);

  if (state?.id === "order" && state?.state === "collectionFrom") {
    await ctx.chat.sendMessage(
      ctx.constants.getPrompt(
        localizationNames.helpStartPoint,
        ctx.user.settings.lang.api_id,
      ),
    );
    return;
  } else if (state?.id === "order" && state?.state === "collectionTo") {
    await ctx.chat.sendMessage(
      ctx.constants.getPrompt(
        localizationNames.helpEndPoint,
        ctx.user.settings.lang.api_id,
      ),
    );
    return;
  }

  return;
}
