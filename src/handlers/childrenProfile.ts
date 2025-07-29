import { Context } from "../index";
import { ChildProfileMachine } from "../states/machines/childrenProfile";
import { collectionDetails } from "./routes/childProfile/collectionDetails";
import { handleRoute } from "./routes/format";
import { collectionName } from "./routes/childProfile/collectionName";
import { collectionAge } from "./routes/childProfile/collectionAge";
import { collectionGender } from "./routes/childProfile/collectionGender";
import { Logger } from "../utils/Logger";
import { localizationNames } from "../l10n";
import {collectionShortedVariant} from "./routes/childProfile/collectShortedVariant";

const logger = new Logger("ChildrenProfileHandler", "#e430ff");

export async function ChildrenProfileHandler(ctx: Context) {
    let state: ChildProfileMachine = await ctx.storage.pull(ctx.userID);

    const exitAvailableStates = [
        "collectionGender",
        "collectionAge",
        "collectionName",
        "collectionDetails",
        "collectionShortedVariant",
    ];
    if (exitAvailableStates.includes(state.state) && ctx.message.body === "0") {
        // Отмена создания заказа доступная после задания начальной точки
        await ctx.storage.delete(ctx.userID);
        await ctx.chat.sendMessage(
            ctx.constants.getPrompt(
                localizationNames.orderCreatingCancel,
                ctx.user.settings.lang.api_id,
            ),
        );
        await ctx.chat.sendMessage(
            ctx.constants.getPrompt(
                localizationNames.defaultPrompt,
                ctx.user.settings.lang.api_id,
            ),
        );
        return;
    }

    switch (state?.state) {
        case "collectionGender":
            if (await handleRoute(collectionGender, ctx, state, logger)) break;
            else break;
        case "collectionAge":
            if (await handleRoute(collectionAge, ctx, state, logger)) break;
            else break;
        case "collectionName":
            if (await handleRoute(collectionName, ctx, state, logger)) break;
            else break;
        case "collectionDetails":
            if (await handleRoute(collectionDetails, ctx, state, logger)) break;
            else break;
        case "collectionShortedVariant":
            if (await handleRoute(collectionShortedVariant,ctx,state,logger)) break;
            else break;
        default:
            await ctx.chat.sendMessage("Error not specified");
            break;
    }
}
