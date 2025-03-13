import axios from "axios";
import {baseURL, postHeaders} from "./general";

export class Constants{
    data:{
        data:{
            car_colors: any,
            car_models: any,
            langs: {
                [key: string]: {
                    native: string,
                    iso: string
                }
            },
            lang_vls: {
                [key: string]: {
                    [key: string]: string
                }
            },
            [key: string]: any
        },
        default_lang: string,
        default_currency: string
    } = {
        data: {
            car_colors: [],
            car_models: [],
            langs: {},
            lang_vls: {},
        },
        default_lang: "2",
        default_currency: "GHS"
    };
    localization_prefix = "wab_";
    constructor() {

    }

    getData() {
        axios.post( baseURL + '/data', {}, {headers: postHeaders})
            .then(response => {
                this.data = response.data.data
            })
    }
    get getForDriverAndCar() {
        return {
            car_colors: this.data.data.car_colors,
            car_models: this.data.data.car_models
        }
    }
    get getLanguages() {
        return this.data.data.langs
    }
    getPrompt(name: string,lang_id: string) : string {
        console.log(name,lang_id)
        if(!this.data.data.lang_vls[name]){
            return "@@@Lang value not found@@@" + name
        }
        return this.data.data.lang_vls[name]? this.data.data.lang_vls[name][lang_id] : "@@@Lang value not found@@@" + name
    }
}

export const REFCODES: { [key: string]: string } = {
    "test": "666"
}