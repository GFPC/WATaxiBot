import axios from "axios";
import { postHeaders } from "./general";
import { CarClass } from "../states/types";

export class GFPTaxiBotConstants {
    data: {
        defaultLangID: string;
        defaultCurrency: string;
        maxDefaultDriveWaiting: number;
        maxVotingDriveWaiting: number;
        searchDriversPeriodShort: number;
        searchDriversPeriodLong: number;
        maxPeoplesCount: number;
    } = {
        defaultLangID: '2',
        defaultCurrency: 'GHS',
        maxDefaultDriveWaiting: 3601,
        maxVotingDriveWaiting: 1800,
        searchDriversPeriodShort: 30,
        searchDriversPeriodLong: 300,
        maxPeoplesCount: 5,
    }
    constructor(data: Constants) {
        const my_container = JSON.parse(data.data.data.site_constants.gfp_taxi_bot_settings.value)
        this.data = {
            ...my_container
        }
    }
}


export class Constants {
    data: {
        data: {
            car_colors: any[];
            car_models: any[];
            lang_vls: {
                [key: string] : { [key: string]: string }
            };
            car_classes: { [key: string]: {
                ru: string;
                booking_location_classes: string[];
                [key: string]: any
            } };
            booking_comments: { [key: string]: any };
            car_makes: { [key: string]: any };
            site_constants: { gfp_taxi_bot_settings: { value: string }; pricingModels: { value: string }; waiting_interval_or?: any };
            langs: { [key: string]: any },
        };
        default_lang: string;
        default_currency: string
    } = {
        data: {
            car_colors: [],
            car_models: [],
            langs: {},
            lang_vls: {},
            car_classes: {},
            booking_comments: {},
            car_makes: {},
            site_constants: {
                pricingModels: {
                    value: "",
                },
                gfp_taxi_bot_settings: {
                    value: JSON.stringify({
                        defaultLangID: '2',
                        defaultCurrency: 'GHS',
                        maxDefaultDriveWaiting: 3601,
                        maxVotingDriveWaiting: 1800,
                        searchDriversPeriodShort: 30,
                        searchDriversPeriodLong: 300,
                        maxPeoplesCount: 5,
                    })
                }
            },
        },
        default_lang: "2",
        default_currency: "GHS",
    };
    localization_prefix = "wab_";
    constructor() {}

    async getData(baseUrl: string) {
        const response = await axios
            .post(baseUrl + "/data", {}, { headers: postHeaders })
        this.data = response.data.data;

    }
    get getForDriverAndCar() {
        return {
            car_colors: this.data.data.car_colors,
            car_models: this.data.data.car_models,
        };
    }
    getPrompt(
        name: string,
        lang_id: string | undefined = this.data.default_lang,
    ): string {
        if (!this.data.data.lang_vls[name]) {
            return "@@@Lang value not found@@@" + name;
        }
        
        const langValues = this.data.data.lang_vls[name];
        if (!langValues || !lang_id) {
            return "@@@Lang value not found@@@" + name;
        }
        
        return langValues[lang_id] || "@@@Lang value not found@@@" + name;
    }
}

export const REFCODES: { [key: string]: string } = {
    test: "666",
};

export const ConstantsStorage = (urlManager: {
    [key: string]: string;
}): { [key: string]: Constants } => {
    let out: { [key: string]: Constants } = {};
    for (let i in urlManager) {
        out[i] = new Constants();
    }
    return out;
};
