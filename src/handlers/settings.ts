import {localization, localizationNames} from "../l10n";
import {Context} from "../index";
import {changeLang, changeReferralCode} from "../api/user";
import {UsersStorage} from "../storage/usersStorage";
import {REFCODES} from "../api/constants";
import axios from "axios";
import {baseURL, postHeaders} from "../api/general";
import searchRefCodeByREfID from "../utils/settings";

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

    if((ctx.message.body === ctx.constants.getPrompt(localizationNames.cancelDigital, ctx.user.settings.lang.api_id )
        || ctx.message.body === ctx.constants.getPrompt(localizationNames.cancelLower, ctx.user.settings.lang.api_id ))
        && (state.state === 'settings' || state.state === '' || !state.state)) {
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
                /*
            case '2':
                // change referral code
                await ctx.chat.sendMessage(ctx.constants.getPrompt(localizationNames.newReferralCodeCollection, ctx.user.settings.lang.api_id ))
                state.state  = 'changeReferralCode';
                await ctx.storage.push(ctx.userID, state);
                break;*/
            case '3':
                const user = await ctx.usersList.pull(ctx.userID.split('@')[0]);
                let mode = 'default';
                if (user.referrer_u_id == '666') {
                    mode = 'test'
                }
                if (mode === 'default') {
                    const res = await changeReferralCode(user.api_u_id, '666', user.referrer_u_id, ctx.auth);
                    const actualUserData =  await axios.post(`${baseURL}user`, { token: ctx.auth.token, u_hash: ctx.auth.hash,u_a_phone: ctx.userID.split('@')[0]}, {headers: postHeaders});
                    const actualUserDataSection = actualUserData.data.data.user[Object.keys(actualUserData.data.data.user)[0]]
                    if(!user.u_details) {
                        user.u_details = {}
                    }
                    user.u_details.refCodeBackup = user.referrer_u_id;
                    user.referrer_u_id = '666';
                    
                    await ctx.usersList.push(ctx.userID.split('@')[0], user);
                    await ctx.chat.sendMessage(ctx.constants.getPrompt(localizationNames.settingsMenu, ctx.user.settings.lang.api_id )
                        .replace( '%language%', user.settings.lang.native + '(' + user.settings.lang.iso + ')')
                        .replace( '%refCode%', searchRefCodeByREfID(actualUserDataSection?.referrer_u_id) ?? '---')
                        .replace('%selfRefCode%', user.ref_code ?? '---')
                        .replace('%testModeHint%',  ctx.constants.getPrompt(localizationNames.settingsTestModeActive, ctx.user.settings.lang.api_id ))
                    );

                } else if (mode === 'test') {
                    const res = await changeReferralCode(user.api_u_id, user.u_details?.refCodeBackup, '666', ctx.auth);
                    const actualUserData =  await axios.post(`${baseURL}user`, { token: ctx.auth.token, u_hash: ctx.auth.hash,u_a_phone: ctx.userID.split('@')[0]}, {headers: postHeaders});
                    const actualUserDataSection = actualUserData.data.data.user[Object.keys(actualUserData.data.data.user)[0]]
                    console.log(actualUserDataSection);
                    if(!user.u_details) {
                        user.u_details = {}
                    }
                    user.referrer_u_id = user.u_details?.refCodeBackup;
                    user.u_details.refCodeBackup = '666';
                    await ctx.usersList.push(ctx.userID.split('@')[0], user);

                    await ctx.chat.sendMessage(ctx.constants.getPrompt(localizationNames.settingsMenu, ctx.user.settings.lang.api_id )
                        .replace( '%language%', user.settings.lang.native + '(' + user.settings.lang.iso + ')')
                        .replace( '%refCode%', searchRefCodeByREfID(actualUserDataSection?.referrer_u_id) ?? '---')
                        .replace('%selfRefCode%', user.ref_code ?? '---')
                        .replace('%testModeHint%', ctx.constants.getPrompt(localizationNames.settingsTestModeHint, ctx.user.settings.lang.api_id ))
                    );

                }
                state.state  = 'settings';
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
            const userPreload = await ctx.usersList.pull(ctx.userID.split('@')[0]);
            if (ctx.message.body === ctx.constants.getPrompt(localizationNames.cancelLower, ctx.user.settings.lang.api_id ) || ctx.message.body === ctx.constants.getPrompt(localizationNames.cancelDigital, ctx.user.settings.lang.api_id )) {
                state.state = 'settings';
                await ctx.storage.push(ctx.userID, state);
                await ctx.chat.sendMessage(ctx.constants.getPrompt(localizationNames.settingsMenu, ctx.user.settings.lang.api_id )
                    .replace( '%language%', userPreload.settings.lang.native + '(' + userPreload.settings.lang.iso + ')')
                    .replace( '%refCode%', searchRefCodeByREfID(userPreload.referrer_u_id) ?? '---')
                    .replace('%selfRefCode%', userPreload.ref_code ?? '---')
                    .replace('%prevRefCodeHint%', userPreload.referrer_u_id === '666' ?
                    ctx.constants.getPrompt(localizationNames.settingsPreviousReferralCode, ctx.user.settings.lang.api_id ).replace('%code%',userPreload.u_details?.refCodeBackup) + '\n': '')
                    .replace('%testModeHint%', userPreload.referrer_u_id === '666' ? ctx.constants.getPrompt(localizationNames.settingsTestModeActive, ctx.user.settings.lang.api_id ) :
                    ctx.constants.getPrompt(localizationNames.settingsTestModeHint, ctx.user.settings.lang.api_id ))
                );
                break;
            }
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
                    await ctx.chat.sendMessage(ctx.constants.getPrompt(localizationNames.settingsMenu, ctx.user.settings.lang.api_id )
                        .replace( '%language%', user.settings.lang.native + '(' + user.settings.lang.iso + ')')
                        .replace( '%refCode%', searchRefCodeByREfID(user.referrer_u_id) ?? '---')
                        .replace('%selfRefCode%', user.ref_code ?? '---')
                        .replace('%prevRefCodeHint%', user.referrer_u_id === '666' ?
                        ctx.constants.getPrompt(localizationNames.settingsPreviousReferralCode, ctx.user.settings.lang.api_id ).replace('%code%',searchRefCodeByREfID(user.u_details?.refCodeBackup)) + '\n': '')
                        .replace('%testModeHint%', user.referrer_u_id === '666' ? ctx.constants.getPrompt(localizationNames.settingsTestModeActive, ctx.user.settings.lang.api_id ) :
                        ctx.constants.getPrompt(localizationNames.settingsTestModeHint, ctx.user.settings.lang.api_id ))
                    );
                    break;
                }
                await ctx.chat.sendMessage(ctx.constants.getPrompt(localizationNames.error, ctx.user.settings.lang.api_id ));
                break;

            } else {
                await ctx.chat.sendMessage(ctx.constants.getPrompt(localizationNames.commandNotFound, ctx.user.settings.lang.api_id ));
            }
            break;
        case 'changeReferralCode':
            const user = await ctx.usersList.pull(ctx.userID.split('@')[0]);
            console.log('changeReferralCode: ', ctx.message.body,user)

            if (ctx.message.body === ctx.constants.getPrompt(localizationNames.cancelLower, ctx.user.settings.lang.api_id ) || ctx.message.body === ctx.constants.getPrompt(localizationNames.cancelDigital, ctx.user.settings.lang.api_id )) {
                state.state = 'settings';
                await ctx.storage.push(ctx.userID, state);
                await ctx.chat.sendMessage(ctx.constants.getPrompt(localizationNames.settingsMenu, ctx.user.settings.lang.api_id )
                    .replace( '%language%', user.settings.lang.native + '(' + user.settings.lang.iso + ')')
                    .replace( '%refCode%', searchRefCodeByREfID(user.referrer_u_id) ?? '---')
                    .replace('%selfRefCode%', user.ref_code ?? '---')
                    .replace('%prevRefCodeHint%', user.referrer_u_id === '666' ?
                    ctx.constants.getPrompt(localizationNames.settingsPreviousReferralCode, ctx.user.settings.lang.api_id ).replace('%code%',user.u_details?.refCodeBackup) + '\n': '')
                    .replace('%testModeHint%', user.referrer_u_id === '666' ? ctx.constants.getPrompt(localizationNames.settingsTestModeActive, ctx.user.settings.lang.api_id ) :
                    ctx.constants.getPrompt(localizationNames.settingsTestModeHint, ctx.user.settings.lang.api_id ))
                );
                break;
            }
            const refCode = REFCODES[ctx.message.body] ?? ctx.message.body;

            //detect test mode
            if(user.referrer_u_id === '666'){
                await ctx.chat.sendMessage('Смена рефкода в режиме теста нвеозможна, отключите тестовый режим в настройках');
                state.state = 'settings';
                await ctx.storage.push(ctx.userID, state);
                await ctx.chat.sendMessage(ctx.constants.getPrompt(localizationNames.settingsMenu, ctx.user.settings.lang.api_id )
                    .replace( '%language%', user.settings.lang.native + '(' + user.settings.lang.iso + ')')
                    .replace( '%refCode%', searchRefCodeByREfID(user.referrer_u_id) ?? '---')
                    .replace('%selfRefCode%', user.ref_code ?? '---')
                    .replace('%prevRefCodeHint%', user.referrer_u_id === '666' ?
                        ctx.constants.getPrompt(localizationNames.settingsPreviousReferralCode, ctx.user.settings.lang.api_id ).replace('%code%',user.u_details?.refCodeBackup) + '\n': '')
                    .replace('%testModeHint%', user.referrer_u_id === '666' ? ctx.constants.getPrompt(localizationNames.settingsTestModeActive, ctx.user.settings.lang.api_id ) :
                        ctx.constants.getPrompt(localizationNames.settingsTestModeHint, ctx.user.settings.lang.api_id ))
                );
                break;
                /*
                if(refCode != user.u_details?.refCodeBackup){
                    ///await ctx.chat.sendMessage("PREV CODE: " + user.u_details?.refCodeBackup + '\n' + "NEW CODE: " + refCode + '\nCUR CODE: ' + user.referrer_u_id);
                    await ctx.chat.sendMessage(ctx.constants.getPrompt(localizationNames.settingsExitTestModeError, ctx.user.settings.lang.api_id ));
                    state.state = 'settings';
                    await ctx.storage.push(ctx.userID, state);
                    await ctx.chat.sendMessage(ctx.constants.getPrompt(localizationNames.settingsMenu, ctx.user.settings.lang.api_id )
                        .replace( '%language%', user.settings.lang.native + '(' + user.settings.lang.iso + ')')
                        .replace( '%refCode%', searchRefCodeByREfID(user.referrer_u_id) ?? '---')
                        .replace('%selfRefCode%', user.ref_code ?? '---')
                        .replace('%prevRefCodeHint%', user.referrer_u_id === '666' ?
                            ctx.constants.getPrompt(localizationNames.settingsPreviousReferralCode, ctx.user.settings.lang.api_id ).replace('%code%',user.u_details?.refCodeBackup) + '\n': '')
                        .replace('%testModeHint%', user.referrer_u_id === '666' ? ctx.constants.getPrompt(localizationNames.settingsTestModeActive, ctx.user.settings.lang.api_id ) :
                            ctx.constants.getPrompt(localizationNames.settingsTestModeHint, ctx.user.settings.lang.api_id ))
                    );
                    break;
                }
                */
            }

            console.log(user.api_u_id, refCode, user.referrer_u_id, ctx.auth)
            const response = await changeReferralCode(user.api_u_id, refCode, user.referrer_u_id, ctx.auth);
            if(response.status === 'success'){
                const actualUserData =  await axios.post(`${baseURL}user`, { token: ctx.auth.token, u_hash: ctx.auth.hash,u_a_phone: ctx.userID.split('@')[0]}, {headers: postHeaders});
                const actualUserDataSection = actualUserData.data.data.user[Object.keys(actualUserData.data.data.user)[0]]
                await ctx.chat.sendMessage(ctx.constants.getPrompt(localizationNames.changeReferralCodeSuccess, ctx.user.settings.lang.api_id ));
                await ctx.chat.sendMessage(ctx.constants.getPrompt(localizationNames.settingsMenu, ctx.user.settings.lang.api_id )
                    .replace( '%language%', user.settings.lang.native + '(' + user.settings.lang.iso + ')')
                    .replace( '%refCode%', searchRefCodeByREfID(actualUserDataSection.referrer_u_id) ?? '---')
                    .replace('%selfRefCode%', actualUserDataSection.ref_code ?? '---')
                    .replace('%prevRefCodeHint%', actualUserDataSection.referrer_u_id === '666' ?
                    ctx.constants.getPrompt(localizationNames.settingsPreviousReferralCode, ctx.user.settings.lang.api_id ).replace('%code%',actualUserDataSection.u_details?.refCodeBackup) + '\n': '')
                    .replace('%testModeHint%', actualUserDataSection.referrer_u_id === '666' ? ctx.constants.getPrompt(localizationNames.settingsTestModeActive, ctx.user.settings.lang.api_id ) :
                    ctx.constants.getPrompt(localizationNames.settingsTestModeHint, ctx.user.settings.lang.api_id ))
                );
                state.state = 'settings';
                user.referrer_u_id = refCode;
                await ctx.usersList.push(ctx.userID.split('@')[0], user);
                await ctx.storage.push(ctx.userID, state);
                break;
            }
            else if (response.message === 'user or modified data not found'){
                await ctx.chat.sendMessage(ctx.constants.getPrompt(localizationNames.changeReferralCodeErrorEqual, ctx.user.settings.lang.api_id ));
                await ctx.chat.sendMessage(ctx.constants.getPrompt(localizationNames.settingsMenu, ctx.user.settings.lang.api_id )
                    .replace( '%language%', user.settings.lang.native + '(' + user.settings.lang.iso + ')')
                    .replace( '%refCode%', searchRefCodeByREfID(user.referrer_u_id) ?? '---')
                    .replace('%selfRefCode%', user.ref_code ?? '---')
                    .replace('%prevRefCodeHint%', user.referrer_u_id === '666' ?
                    ctx.constants.getPrompt(localizationNames.settingsPreviousReferralCode, ctx.user.settings.lang.api_id ).replace('%code%',user.u_details?.refCodeBackup) + '\n': '')
                    .replace('%testModeHint%', user.referrer_u_id === '666' ? ctx.constants.getPrompt(localizationNames.settingsTestModeActive, ctx.user.settings.lang.api_id ) :
                    ctx.constants.getPrompt(localizationNames.settingsTestModeHint, ctx.user.settings.lang.api_id ))
                );
                state.state = 'settings';
                await ctx.storage.push(ctx.userID, state);
                break;
            }
            else {
                await ctx.chat.sendMessage(ctx.constants.getPrompt(localizationNames.invalidReferralCode, ctx.user.settings.lang.api_id ));
                state.state = 'settings';
                await ctx.storage.push(ctx.userID, state);
                await ctx.chat.sendMessage(ctx.constants.getPrompt(localizationNames.settingsMenu, ctx.user.settings.lang.api_id )
                    .replace( '%language%', user.settings.lang.native + '(' + user.settings.lang.iso + ')')
                    .replace( '%refCode%', searchRefCodeByREfID(user.referrer_u_id) ?? '---')
                    .replace('%selfRefCode%', user.ref_code ?? '---')
                    .replace('%prevRefCodeHint%', user.referrer_u_id === '666' ?
                        ctx.constants.getPrompt(localizationNames.settingsPreviousReferralCode, ctx.user.settings.lang.api_id ).replace('%code%',user.u_details?.refCodeBackup) + '\n': '')
                    .replace('%testModeHint%', user.referrer_u_id === '666' ? ctx.constants.getPrompt(localizationNames.settingsTestModeActive, ctx.user.settings.lang.api_id ) :
                        ctx.constants.getPrompt(localizationNames.settingsTestModeHint, ctx.user.settings.lang.api_id ))
                );
                break;
            }
            break;
        default:
            await ctx.chat.sendMessage("Not Implemented: SettingsHandler");
            break;
    }


}