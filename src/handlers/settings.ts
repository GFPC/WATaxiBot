import {localization, localizationNames} from "../l10n";
import {Context} from "../index";
import {changeLang} from "../api/user";
import {UsersStorage} from "../storage/usersStorage";

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

export async function SettingsHandler(ctx: Context): Promise<void> {
    const state = await ctx.storage.pull(ctx.userID);

    if(ctx.message.body === ctx.constants.getPrompt(localizationNames.cancelDigital, ctx.user.settings.lang.api_id ) || ctx.message.body === ctx.constants.getPrompt(localizationNames.cancelLower, ctx.user.settings.lang.api_id )){
        await ctx.chat.sendMessage(ctx.constants.getPrompt(localizationNames.defaultPrompt, ctx.user.settings.lang.api_id ))
        await ctx.storage.delete(ctx.userID);
        return;
    }

    if(state.state === 'settings'){
        switch (ctx.message.body) {
            case '1':
                await ctx.chat.sendMessage(ctx.constants.getPrompt(localizationNames.selectLanguage, ctx.user.settings.lang.api_id ))
                await ctx.chat.sendMessage(languages.map( item => item.native + '(' + item.iso + ')' + ' - *' + item.id + '*').join('\n'));
                state.state  = 'changeLanguage';
                await ctx.storage.push(ctx.userID, state);
                break;

            default:
                await ctx.chat.sendMessage(ctx.constants.getPrompt(localizationNames.commandNotFound, ctx.user.settings.lang.api_id ))
                break;
        }
        return 
    }
    switch (state.state) {
        case 'changeLanguage':
            console.log(ctx.message.body, languages.map( item => item.id), ctx.message.body.toString() in languages.map( item => item.id))
            if(languages.map( item => item.id).includes(ctx.message.body)){
                const response = await changeLang(ctx.userID.split('@')[0], languages.find( item => item.id == ctx.message.body)?.api_id ?? '-1', ctx.auth);

                if(response.status === 'success' || response.message === 'user or modified data not found'){
                    state.state = 'settings';
                    await ctx.storage.push(ctx.userID, state);

                    const selectedLang = languages.find( item => item.id == ctx.message.body);

                    const user = await ctx.usersList.pull(ctx.userID.split('@')[0]);
                    user.reloadFromApi = true;
                    user.settings.lang.iso = selectedLang?.iso ?? 'en';
                    user.settings.lang.native = selectedLang?.native ?? 'English(en)';
                    user.settings.lang.api_id = selectedLang?.api_id ?? '2';
                    await ctx.usersList.push(ctx.userID.split('@')[0], user);
                    await ctx.chat.sendMessage(ctx.constants.getPrompt(localizationNames.langSelectedBakingToSettings, ctx.user.settings.lang.api_id ))
                    await ctx.chat.sendMessage(ctx.constants.getPrompt(localizationNames.settingsMenu, ctx.user.settings.lang.api_id ).replace('%language%', user.settings.lang.native + '(' + user.settings.lang.iso + ')'));
                    break;
                }
                await ctx.chat.sendMessage(ctx.constants.getPrompt(localizationNames.error, ctx.user.settings.lang.api_id ));
                break;

            } else {
                await ctx.chat.sendMessage(ctx.constants.getPrompt(localizationNames.commandNotFound, ctx.user.settings.lang.api_id ));
            }
            break;
        default:
            await ctx.chat.sendMessage("Not Implemented: SettingsHandler");
            break;
    }


}