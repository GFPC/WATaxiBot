import {StateMachine} from "../types";


export interface SettingsMachine extends StateMachine {
    id: 'settings'
    state: 'settings' | 'changeLanguage'
    data: {}
}

export function newSettings(): SettingsMachine {
    return {
        id: 'settings',
        state: 'settings',
        data: {}
    };
}