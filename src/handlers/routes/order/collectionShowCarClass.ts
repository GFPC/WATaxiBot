import { localizationNames } from "../../../l10n";
import { OrderMachine } from "../../../states/machines/orderMachine";
import { Context } from "../../../index";
import { HandlerRouteResponse, SuccessResponse } from "../format";
import {getPolygonsForPoint} from "../../../api/custom";

export async function collectionShowCarClass(
    ctx: Context,
    state: OrderMachine,
): Promise<HandlerRouteResponse> {
    if (ctx.message.body === "1") {
        // Здесь фильтрация по типу маршрута
        // 1-город 2-межгород, 3-область
        if (ctx.configName === "gruzvill") {
            if (!state.data.from.latitude || !state.data.from.longitude || !state.data.to.latitude || !state.data.to.longitude) {
                console.log(state.data.from, state.data.to)
                throw "Не указаны координаты";
            }
            const startPointCoords = {
                lat: state.data.from.latitude,
                lon: state.data.from.longitude,
            };
            const endPointCoords = {
                lat: state.data.to.latitude,
                lon: state.data.to.longitude,
            };
            const startPointPolygons = await getPolygonsForPoint(startPointCoords.lat, startPointCoords.lon);
            const endPointPolygons = await getPolygonsForPoint(endPointCoords.lat, endPointCoords.lon);
            console.log(startPointPolygons.data.data, endPointPolygons.data.data)

            if (!startPointPolygons.data.data || !endPointPolygons.data.data) {
                throw "Не удалось получить полигон";
            }
            let startPolygons = startPointPolygons.data.data;
            let endPolygons = endPointPolygons.data.data;
            const citiesIdStart = Object.values(startPolygons.map_place_polygons).map((polygon: any) => {
                return polygon.city_id;
            }) || [];

            const citiesIdEnd = Object.values(endPolygons.map_place_polygons).map((polygon: any) => {
                return polygon.city_id;
            }) || [];
            console.log(citiesIdStart, citiesIdEnd);
            let inCityFlag = false;
            inCityFlag = citiesIdStart.filter((item: string) => citiesIdEnd.includes(item) && item).length > 0;
            //

            if(inCityFlag){
                state.data.locationClasses = ['1','2','3'];
            } else {
                state.data.locationClasses = ['2','3'];
            }

            console.log('CITY FLAG: '+inCityFlag, state.data.locationClasses);

            console.log(JSON.stringify(ctx.constants.data.data.car_classes))

            const car_classes = Object.fromEntries(
                Object.entries(ctx.constants.data.data.car_classes).filter(([key, value]) => {
                    if (!state.data.locationClasses) return false;
                    return state.data.locationClasses.some(lc => value.booking_location_classes.includes(lc));
                })
            );
            /*            const car_classes = ctx.constants.data.data.car_classes.filter((car_class: any) => {
                return state.data.locationClasses?.includes(car_class.booking_location_classes[0]);
            });*/

            let text = ctx.constants.getPrompt(
                localizationNames.selectCarClass,
                ctx.user.settings.lang.api_id,
            );
            var carClassesRebase: {
                [key: string]: {
                    id: string;
                    locationClasses: string[];
                };
            } = {}
            var counter = 1
            for (let i in car_classes) {
                carClassesRebase[counter.toString()] = {
                    id: i,
                    locationClasses: car_classes[i].booking_location_classes
                }

                text +=
                    counter.toString() +
                    ". " +
                    car_classes[i][ctx.user.settings.lang.iso] +
                    "\n";
                counter++
            }
            state.data.carClassesRebase = carClassesRebase
            state.state = "collectionCarClass";
            state.data.nextStateForAI = "collectionCarClass";
            state.data.nextMessageForAI = text;
            await ctx.storage.push(ctx.userID, state);
            await ctx.chat.sendMessage(text);
        }
        } else if (ctx.message.body === "2") {
            state.state = "collectionShowAdditionalOptions";
            state.data.nextStateForAI = "collectionShowAdditionalOptions";
            await ctx.chat.sendMessage(
                ctx.constants.getPrompt(
                    localizationNames.needAdditionalOptionsQuestion,
                    ctx.user.settings.lang.api_id,
                ),
            );
        } else {
            await ctx.chat.sendMessage(
                ctx.constants.getPrompt(
                    localizationNames.commandNotFound,
                    ctx.user.settings.lang.api_id,
                ),
            );
            return SuccessResponse;
        }
        return SuccessResponse;
}
