import {
    GetLocation,
    parseGetLocationException,
} from "../../../utils/orderUtils";
import { localizationNames } from "../../../l10n";
import { formatString } from "../../../utils/formatter";
import { OrderMachine } from "../../../states/machines/orderMachine";
import { Context } from "../../../types/Context";
import { HandlerRouteResponse, SuccessResponse } from "../format";
import {
    ChildProfileMachine,
    newChildProfile,
} from "../../../states/machines/childrenProfile";
import { getLocalizationText } from "../../../utils/textUtils";
import * as readline from "readline";

function input(question: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}
export async function collectionDetails(
    ctx: Context,
    state: ChildProfileMachine,
): Promise<HandlerRouteResponse> {
    const details = ctx.message.body;
    state.data.details = details;

    const childProfile = {
        gender: state.data.gender,
        age: state.data.age,
        name: state.data.name,
        details: state.data.details,
    };

    if (
        state.data.currentChildrenIndex <
        (state.data.orderState.data.peopleCount || 0) - 1
    ) {
        const newState = newChildProfile(
            state.data.orderState,
            state.data.currentChildrenIndex + 1,
        );
        if (!newState.data.orderState.data.childrenProfiles)
            newState.data.orderState.data.childrenProfiles = [];
        if (typeof newState.data.orderState.data.childrenProfiles !== "string") {
            newState.data.orderState.data.childrenProfiles?.push(childProfile);
        }
        newState.data.nextStateForAI = "collectionAge";
        newState.data.nextMessageForAI = `${getLocalizationText(ctx, localizationNames.selectChildGender).replace("%profileNumber%", `${getLocalizationText(ctx, localizationNames.profileNumberPattern)}${newState.data.currentChildrenIndex + 1}`)}`;
        await ctx.storage.push(ctx.userID, newState);
        await ctx.chat.sendMessage(
            `${getLocalizationText(ctx, localizationNames.selectChildGender).replace("%profileNumber%", `${getLocalizationText(ctx, localizationNames.profileNumberPattern)}${newState.data.currentChildrenIndex + 1}`)}`,
        );
    } else {
        // loop окончен
        const orderState = state.data.orderState;
        if (!orderState.data.childrenProfiles)
            orderState.data.childrenProfiles = [];
        if (typeof orderState.data.childrenProfiles !== "string") {
            orderState.data.childrenProfiles?.push(childProfile);
        }
        await ctx.storage.push(ctx.userID, orderState);
        console.log(orderState.data.childrenProfiles);

        orderState.state = "collectionShowCarClass";
        orderState.data.nextMessageForAI = ctx.constants.getPrompt(
            localizationNames.askShowCarClass,
            ctx.user.settings.lang.api_id,
        );
        orderState.data.nextStateForAI = "collectionShowCarClass";
        await ctx.storage.push(ctx.userID, orderState);
        await ctx.chat.sendMessage(
            ctx.constants.getPrompt(
                localizationNames.askShowCarClass,
                ctx.user.settings.lang.api_id,
            ),
        );
        return SuccessResponse
    }
    return SuccessResponse;
}
