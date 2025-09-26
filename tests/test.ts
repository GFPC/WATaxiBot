import { strictEqual } from "assert";
import {
    calculateOrderPrice,
    calculatePrice,
    formatPriceFormula,
} from "../src/handlers/order";
import { ServiceMap } from "../src/ServiceMap";
import { Context } from "../src";
import WAWebJS, {
    Chat,
    Client,
    LocalAuth,
    Message,
    MessageContent,
} from "whatsapp-web.js";
import { Storage } from "../src/storage/storage";
import { AuthData } from "../src/api/general";
import { Logger } from "winston";
import {Constants, GFPTaxiBotConstants} from "../src/api/constants";
import { UsersStorage } from "../src/storage/usersStorage";
import { Location } from "../src/states/types";
import {getPolygonsForPoint} from "../src/api/custom";
import * as constants from "constants";
import {AIStorage} from "../src/storage/AIStorage";
getPolygonsForPoint(40.785805611688, 67.83).then((r) => console.log(r.data.data));
