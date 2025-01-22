import {Context} from "../index";
import {localization, localizationNames} from "../l10n";
import {newEmptyOrder} from "../states/machines/orderMachine";
import {newSettings} from "../states/machines/settingsMachine";
export async function DefaultHandler(ctx: Context): Promise<void> {
    const state = await ctx.storage.pull(ctx.userID);

    if (state === null) {

        switch (ctx.message.body) {
            case '0':
                await ctx.chat.sendMessage(ctx.constants.getPrompt(localizationNames.enterStartPoint, ctx.user.settings.lang.api_id ), { linkPreview: false });
                await ctx.storage.push(ctx.userID, newEmptyOrder());
                break;
            case '1':
                await ctx.chat.sendMessage(ctx.constants.getPrompt(localizationNames.settingsMenu, ctx.user.settings.lang.api_id ).replace('%language%', ctx.user.settings.lang.native + '(' + ctx.user.settings.lang.iso + ')'));
                await ctx.storage.push(ctx.userID, newSettings());
                break;
            default:
                await ctx.chat.sendMessage(ctx.constants.getPrompt(localizationNames.commandNotFound, ctx.user.settings.lang.api_id ));
                break;
        }
    }

}