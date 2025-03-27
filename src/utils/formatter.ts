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
  return date.toLocaleString(ctx.user.settings.lang.iso);
}
