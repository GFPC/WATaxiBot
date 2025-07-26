import { Context } from "../index";

export function getLocalizationText(
    ctx: Context,
    localizationName: string,
): string {
    return ctx.constants.getPrompt(
        localizationName,
        ctx.user.settings.lang.api_id,
    );
}
