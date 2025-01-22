import {StateMachine} from "../types";
import {Context} from "../../index";

export interface RegistrationMachine extends StateMachine {
  id: 'register'
  state: 'collectionFullName' | 'collectionRefCode' | 'collectionLanguage'
  data: {
    fullName: string
    refCode?: string,
    lang: {
      api_id: string,
      iso: string,
    }
  }
}

export async function createEmptyRegistration(ctx: Context): Promise<RegistrationMachine> {
  return {
    id: 'register',
    state: 'collectionLanguage',
    data: {
      fullName: '',
      lang: {
        api_id: ctx.constants.data.default_lang,
        iso: ctx.constants.data.data.langs[ctx.constants.data.default_lang].iso
      }
    }
  };
}
