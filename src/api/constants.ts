import axios from "axios";
import { postHeaders } from "./general";

export class Constants {
  data: {
    data: {
      car_colors: any[];
      car_models: any[];
      lang_vls: {
        [key: string]: {
          [key: string]: string;
        };
      };
      site_constants: {
        pricingModels: {
          value: string;
        };
        [key: string]: any;
      };
      langs: {
        [key: string]: {
          native: string;
          iso: string;
        };
      };
      [key: string]: any;
    };
    default_lang: string;
    default_currency: string
  } = {
    data: {
      car_colors: [],
      car_models: [],
      langs: {},
      lang_vls: {},
      site_constants: {
        pricingModels: {
          value: ''
        }
      }
    },
    default_lang: "2",
    default_currency: "GHS",

  };
  localization_prefix = "wab_";
  constructor() {}

  async getData(baseUrl: string) {
    await axios
      .post(baseUrl + "/data", {}, { headers: postHeaders })
      .then((response) => {
        this.data = response.data.data;
      });
  }
  get getForDriverAndCar() {
    return {
      car_colors: this.data.data.car_colors,
      car_models: this.data.data.car_models,
    };
  }
  getPrompt(name: string, lang_id: string | undefined = this.data.default_lang): string {
    console.log(name, lang_id);
    if (!this.data.data.lang_vls[name]) {
      return "@@@Lang value not found@@@" + name;
    }
    return this.data.data.lang_vls[name]
      ? this.data.data.lang_vls[name][lang_id]
      : "@@@Lang value not found@@@" + name;
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
