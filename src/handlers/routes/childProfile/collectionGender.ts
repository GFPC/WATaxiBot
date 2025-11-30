import {
    GetLocation,
    parseGetLocationException,
} from "../../../utils/orderUtils";
import { localizationNames } from "../../../l10n";
import { formatString } from "../../../utils/formatter";
import { OrderMachine } from "../../../states/machines/orderMachine";
import { Context } from "../../../types/Context";
import { HandlerRouteResponse, SuccessResponse } from "../format";
import { ChildProfileMachine } from "../../../states/machines/childrenProfile";
import { getLocalizationText } from "../../../utils/textUtils";
export async function collectionGender(
    ctx: Context,
    state: ChildProfileMachine,
): Promise<HandlerRouteResponse> {
    const gender = ctx.message.body;

    if (gender == "1") {
        state.data.gender = "male";
    } else if (gender == "2") {
        state.data.gender = "female";
    } else {
        await ctx.chat.sendMessage(
            ctx.constants.getPrompt(
                localizationNames.commandNotFound,
                ctx.user.settings.lang.api_id,
            ),
        );
        return SuccessResponse;
    }

    state.state = "collectionAge";
    state.data.nextStateForAI = "collectionAge";
    state.data.nextMessageForAI = `${getLocalizationText(ctx, localizationNames.selectChildAge)}(${getLocalizationText(ctx, localizationNames.profileNumberPattern)}${state.data.currentChildrenIndex + 1})`;

    await ctx.chat.sendMessage(
        `${getLocalizationText(ctx, localizationNames.selectChildAge)}(${getLocalizationText(ctx, localizationNames.profileNumberPattern)}${state.data.currentChildrenIndex + 1})`,
    );
    await ctx.storage.push(ctx.userID, state);

    return SuccessResponse;
}
