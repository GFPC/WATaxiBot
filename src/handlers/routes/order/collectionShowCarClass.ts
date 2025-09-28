import { localizationNames } from "../../../l10n";
import { OrderMachine } from "../../../states/machines/orderMachine";
import { Context } from "../../../index";
import { HandlerRouteResponse, SuccessResponse } from "../format";
import { isRouteInCity } from "../../../api/custom";

export async function collectionShowCarClass(
    ctx: Context,
    state: OrderMachine,
): Promise<HandlerRouteResponse> {
    if (ctx.message.body === "1") {
        // Здесь фильтрация по типу маршрута
        // 1-город 2-межгород, 3-область
        if (ctx.configName === "gruzvill") {
            const car_classes = Object.fromEntries(
                Object.entries(ctx.constants.data.data.car_classes).filter(([key, value]) => {
                    if (!state.data.locationClasses) return false;
                    return state.data.locationClasses.some(lc => value.booking_location_classes.includes(lc));
                })
            );

            var carClassesRebase: {
                [key: string]: {
                    id: string;
                    locationClasses: string[];
                };
            } = {}
            let text = ctx.constants.getPrompt(
                localizationNames.selectCarClass,
                ctx.user.settings.lang.api_id,
            );
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
