import { localizationNames } from "../../../l10n";
import { OrderMachine } from "../../../states/machines/orderMachine";
import { Context } from "../../../index";
import { HandlerRouteResponse, SuccessResponse } from "../format";
import { constants } from "../../../constants";
import {isRouteInCity} from "../../../api/custom";

export async function collectionHowManyPeople(
    ctx: Context,
    state: OrderMachine,
): Promise<HandlerRouteResponse> {
    const peopleCount = Number(ctx.message.body);
    if (ctx.message.body.length === 0) {
        await ctx.chat.sendMessage(
            ctx.constants.getPrompt(
                localizationNames.incorrectTextMessageType,
                ctx.user.settings.lang.api_id,
            ),
        );
        return SuccessResponse;
    }
    if (isNaN(peopleCount)) {
        await ctx.chat.sendMessage(
            ctx.constants.getPrompt(
                localizationNames.incorrectNumeric,
                ctx.user.settings.lang.api_id,
            ),
        );
        return SuccessResponse;
    }
    if (peopleCount > constants.maxPeopleInOrder) {
        state.data.nextMessageForAI = ctx.constants.getPrompt(
            localizationNames.tooManyPeople,
            ctx.user.settings.lang.api_id,
        );
        await ctx.chat.sendMessage(
            ctx.constants.getPrompt(
                localizationNames.tooManyPeople,
                ctx.user.settings.lang.api_id,
            ),
        );
        return SuccessResponse;
    }
    if (peopleCount < constants.minPeopleInOrder) {
        state.data.nextMessageForAI = ctx.constants.getPrompt(
            localizationNames.tooFewPeople,
            ctx.user.settings.lang.api_id,
        );
        await ctx.chat.sendMessage(
            ctx.constants.getPrompt(
                localizationNames.tooFewPeople,
                ctx.user.settings.lang.api_id,
            ),
        );
        return SuccessResponse;
    }
    state.data.peopleCount = peopleCount;

    if (ctx.configName === "children") {
        state.state = "collectionShowCarClass";
        state.data.nextMessageForAI = ctx.constants.getPrompt(
            localizationNames.askShowCarClass,
            ctx.user.settings.lang.api_id,
        );
        state.data.nextStateForAI = "collectionShowCarClass";
        await ctx.storage.push(ctx.userID, state);
        await ctx.chat.sendMessage(
            ctx.constants.getPrompt(
                localizationNames.askShowCarClass,
                ctx.user.settings.lang.api_id,
            ),
        );
        return SuccessResponse;
    } else if(ctx.configName === "gruzvill") {
        let inCityFlag;
        if (!state.data.from.latitude || !state.data.from.longitude || !state.data.to.latitude || !state.data.to.longitude) {
            console.log(state.data.from, state.data.to)
            inCityFlag = true;
        } else {
            const startPointCoords = {
                lat: state.data.from.latitude,
                lon: state.data.from.longitude,
            };
            const endPointCoords = {
                lat: state.data.to.latitude,
                lon: state.data.to.longitude,
            };
            inCityFlag = await isRouteInCity(startPointCoords, endPointCoords);
        }
        //

        if(inCityFlag){
            state.data.locationClasses = ['1','2','3'];
        } else {
            state.data.locationClasses = ['2','3'];
        }

        console.log('CITY FLAG: '+inCityFlag, state.data.locationClasses);

        const car_classes = Object.fromEntries(
            Object.entries(ctx.constants.data.data.car_classes).filter(([key, value]) => {
                if (!state.data.locationClasses) return false;
                return state.data.locationClasses.some(lc => value.booking_location_classes.includes(lc));
            })
        );
        if(Object.values(car_classes).length > 1) {
            state.state = "collectionShowCarClass";
            state.data.nextMessageForAI = ctx.constants.getPrompt(
                localizationNames.askShowCarClass,
                ctx.user.settings.lang.api_id,
            );
            state.data.nextStateForAI = "collectionShowCarClass";
            await ctx.chat.sendMessage(
                ctx.constants.getPrompt(
                    localizationNames.askShowCarClass,
                    ctx.user.settings.lang.api_id,
                ),
            );
        } else {
            if(Object.values(car_classes).length === 1) {
                state.data.carClass = Object.keys(car_classes)[0];
                console.log('Inserting default car class: ' + JSON.stringify(car_classes));
            }
            state.state = "collectionShowAdditionalOptions";
            state.data.nextMessageForAI = ctx.constants.getPrompt(
                localizationNames.needAdditionalOptionsQuestion,
                ctx.user.settings.lang.api_id,
            );
            state.data.nextStateForAI = "collectionShowAdditionalOptions";
            await ctx.chat.sendMessage(
                ctx.constants.getPrompt(
                    localizationNames.needAdditionalOptionsQuestion,
                    ctx.user.settings.lang.api_id,
                ),
            );
        }


        await ctx.storage.push(ctx.userID, state);

        return SuccessResponse;
    } else {
        state.state = "collectionShowAdditionalOptions";
        state.data.nextMessageForAI = ctx.constants.getPrompt(
            localizationNames.needAdditionalOptionsQuestion,
            ctx.user.settings.lang.api_id,
        );
        state.data.nextStateForAI = "collectionShowAdditionalOptions";
        await ctx.storage.push(ctx.userID, state);

        await ctx.chat.sendMessage(
            ctx.constants.getPrompt(
                localizationNames.needAdditionalOptionsQuestion,
                ctx.user.settings.lang.api_id,
            ),
        );
        return SuccessResponse;
    }
}
