import {
    GetLocation,
    parseGetLocationException,
} from "../../../utils/orderUtils";
import { localizationNames } from "../../../l10n";
import { formatString } from "../../../utils/formatter";
import { OrderMachine } from "../../../states/machines/orderMachine";
import { Context } from "../../../index";
import { HandlerRouteResponse, SuccessResponse } from "../format";
import {
    ChildProfileMachine,
    newChildProfile,
} from "../../../states/machines/childrenProfile";
import { getLocalizationText } from "../../../utils/textUtils";
export async function collectionName(
    ctx: Context,
    state: ChildProfileMachine,
): Promise<HandlerRouteResponse> {
    const name = ctx.message.body;
    state.data.name = name;
    state.state = "collectionDetails";
    state.data.nextStateForAI = "collectionDetails";
    state.data.nextMessageForAI = `${getLocalizationText(ctx, localizationNames.enterChildDetails)}(${getLocalizationText(ctx, localizationNames.profileNumberPattern)}${state.data.currentChildrenIndex + 1})`;
    await ctx.chat.sendMessage(
        `${getLocalizationText(ctx, localizationNames.enterChildDetails)}(${getLocalizationText(ctx, localizationNames.profileNumberPattern)}${state.data.currentChildrenIndex + 1})`,
    );
    await ctx.storage.push(ctx.userID, state);

    return SuccessResponse;
}
