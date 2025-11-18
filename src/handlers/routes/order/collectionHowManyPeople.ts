import { localizationNames } from "../../../l10n";
import { OrderMachine } from "../../../states/machines/orderMachine";
import { Context } from "../../../index";
import { HandlerRouteResponse, SuccessResponse } from "../format";
import { constants } from "../../../constants";
import {isRouteInCity} from "../../../api/custom";

function remap(data: { [key: string]: { maxVolume?: number; maxWeight?: number } }) {
    let map: { [key: string]: string } = {}
    let counter = 1
    let newData: { [key: string]: { maxVolume?: number; maxWeight?: number } } = {}
    Object.entries(data).forEach(([key, value]) => {
        map[counter.toString()] = key
        newData[counter.toString()] = value
        counter += 1
    })

    return {map, newData}
}


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

    if(ctx.configName === "truck") {
        return handleTruckConfig(ctx, state);
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

    if (ctx.configName === "children") return handleChildrenConfig(ctx, state);
    else if(ctx.configName === "gruzvill") return handleGruzvillConfig(ctx, state);
    else {
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

async function handleChildrenConfig(ctx: Context, state: OrderMachine) : Promise<HandlerRouteResponse> {
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
}

async function handleGruzvillConfig(ctx: Context, state: OrderMachine) : Promise<HandlerRouteResponse>  {
    let inCityFlag;
    let coordsNotRecognized = false;
    if (!state.data.from.latitude || !state.data.from.longitude || !state.data.to.latitude || !state.data.to.longitude) {
        console.log(state.data.from, state.data.to)
        inCityFlag = true;
        coordsNotRecognized = true;
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
    console.log('Coords not recognized: '+coordsNotRecognized);

    const car_classes = Object.fromEntries(
        Object.entries(ctx.constants.data.data.car_classes).filter(([key, value]) => {
            if (!state.data.locationClasses) return false;
            return state.data.locationClasses.some(lc => value.booking_location_classes.includes(lc));
        })
    );
    if(Object.values(car_classes).length > 1 && !coordsNotRecognized) {
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
    } else if(coordsNotRecognized) {
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
        Object.entries(car_classes).forEach(([id, carClass], index) => {
            carClassesRebase[(index + 1).toString()] = {
                id,
                locationClasses: carClass.booking_location_classes
            };
            text += `${index + 1}. ${carClass[ctx.user.settings.lang.iso]}\n`;
        });
        state.data.carClassesRebase = carClassesRebase
        state.state = "collectionCarClass";
        state.data.nextStateForAI = "collectionCarClass";
        state.data.nextMessageForAI = text;
        await ctx.storage.push(ctx.userID, state);
        await ctx.chat.sendMessage(text);
    } else {
        if(Object.values(car_classes).length === 1) {
            state.data.carClass = Object.keys(car_classes)[0];
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
}
async function handleTruckConfig(ctx: Context, state: OrderMachine) : Promise<HandlerRouteResponse>  {
    const data = ctx.message.body.trim().replace('  ', ' ').split(' ');
    if( data.length !== 4) {
        await ctx.chat.sendMessage(
            ctx.constants.getPrompt(
                localizationNames.error,
                ctx.user.settings.lang.api_id,
            ) + '4 params required',
        );
        return SuccessResponse;
    }

    data.forEach( d => {
        if (isNaN(Number(d))) {
            ctx.chat.sendMessage(
                ctx.constants.getPrompt(
                    localizationNames.error,
                    ctx.user.settings.lang.api_id,
                ) + 'all must be numbers',
            );
            return SuccessResponse;
        }
    })

    let input_volume = data[0];
    let input_weight = data[1];

    let type_sizes = remap(JSON.parse(ctx.constants.data.data.site_constants.type_size.value));
    let type_weights = remap(JSON.parse(ctx.constants.data.data.site_constants.type_weight.value));

// Находим первый подходящий id для объема
    const volume_id = type_sizes["map"][input_volume]
    if (!volume_id) {
        ctx.chat.sendMessage(
            ctx.constants.getPrompt(
                localizationNames.error,
                ctx.user.settings.lang.api_id,
            ) + 'type_size value not found',
        );
        return SuccessResponse;
    }

// Находим первый подходящий id для веса
    const weight_id = type_weights["map"][input_weight]
    if (!weight_id) {
        ctx.chat.sendMessage(
            ctx.constants.getPrompt(
                localizationNames.error,
                ctx.user.settings.lang.api_id,
            ) + 'type_weight value not found',
        );
        return SuccessResponse;
    }

    console.log('Volume API ID:', volume_id);
    console.log('Weight API ID:', weight_id);

    state.data.truck_sizetype = volume_id;
    state.data.truck_drivetype = weight_id;
    state.data.truck_floornumber = data[2];
    state.data.truck_count = data[3];


    let inCityFlag;
    let coordsNotRecognized = false;
    if (!state.data.from.latitude || !state.data.from.longitude || !state.data.to.latitude || !state.data.to.longitude) {
        console.log(state.data.from, state.data.to)
        inCityFlag = true;
        coordsNotRecognized = true;
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
    console.log('Coords not recognized: '+coordsNotRecognized);

    const car_classes = Object.fromEntries(
        Object.entries(ctx.constants.data.data.car_classes).filter(([key, value]) => {
            if (!state.data.locationClasses) return false;
            return state.data.locationClasses.some(lc => value.booking_location_classes.includes(lc));
        })
    );
    if(Object.values(car_classes).length > 1 && !coordsNotRecognized) {
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
    } else if(coordsNotRecognized) {
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
        Object.entries(car_classes).forEach(([id, carClass], index) => {
            carClassesRebase[(index+1).toString()] = {
                id,
                locationClasses: carClass.booking_location_classes
            };
            text += `${index+1}. ${carClass[ctx.user.settings.lang.iso]}\n`;
        });
        state.data.carClassesRebase = carClassesRebase
        state.state = "collectionCarClass";
        state.data.nextStateForAI = "collectionCarClass";
        state.data.nextMessageForAI = text;
        await ctx.storage.push(ctx.userID, state);
        await ctx.chat.sendMessage(text);
    } else {
        if(Object.values(car_classes).length === 1) {
            state.data.carClass = Object.keys(car_classes)[0];
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
}