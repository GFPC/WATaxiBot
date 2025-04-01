import { localizationNames } from "../l10n";
import { Context } from "../index";

export function formatString(
  text: string,
  args: { [key: string]: string },
): string {
  let result = text;
  Object.keys(args).forEach((key) => {
    result = result.replace(`%${key}%`, args[key]);
  });
  return result;
}

export function formatDateHuman(date: Date | null, ctx: Context): string {
  if (date === null) {
    return ctx.constants.getPrompt(
      localizationNames.nowLower,
      ctx.user.settings.lang.api_id,
    );
  }
  return date.toLocaleDateString(ctx.user.settings.lang.iso, {
    month: 'numeric', day: 'numeric'
  }) + " " + date.toLocaleTimeString(ctx.user.settings.lang.iso, {
    hour: '2-digit', minute: '2-digit'
  });
}
