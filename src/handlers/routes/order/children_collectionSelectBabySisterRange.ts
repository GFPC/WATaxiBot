import {
    GetLocation,
    parseGetLocationException,
} from "../../../utils/orderUtils";
import { localizationNames } from "../../../l10n";
import { formatString } from "../../../utils/formatter";
import { OrderMachine } from "../../../states/machines/orderMachine";
import { Context } from "../../../index";
import { HandlerRouteResponse, SuccessResponse } from "../format";
//TODO здесь еще над оценить и сделать алгоритм договоров при ночном времени
export async function children_collectionSelectBabySisterRange(
    ctx: Context,
    state: OrderMachine,
): Promise<HandlerRouteResponse> {
    // Собираем диапазон нянь
    const mode = ctx.message.body;

    if (mode === "01") {
        state.state = "children_collectionSelectBabySister";
        state.data.nextMessageForAI = ctx.constants.getPrompt(
            localizationNames.askShowCarClass,
            ctx.user.settings.lang.api_id,
        );
        state.data.nextStateForAI = "children_collectionSelectBabySister";
        await ctx.storage.push(ctx.userID, state);
        await ctx.chat.sendMessage(
            ctx.constants.getPrompt(
                localizationNames.askShowCarClass,
                ctx.user.settings.lang.api_id,
            ),
        );
        return SuccessResponse;
    } else if (mode === "02") {
        await ctx.chat.sendMessage(
            "Список нянь в черте города.\n1. Нянь 1\n2. Нянь 2\n3. Нянь 3\n4. Нянь 4\n5. Нянь 5\n6. Нянь 6\n7. Нянь 7\n8. Нянь 8\n9. Нянь 9\n10. Нянь 10",
        );
        return SuccessResponse;
    } else if (mode === "03") {
        await ctx.chat.sendMessage(
            "Список нянь в черте города.\n1. Нянь 1\n2. Нянь 2\n3. Нянь 3\n4. Нянь 4\n5. Нянь 5\n6. Нянь 6\n7. Нянь 7\n8. Нянь 8\n9. Нянь 9\n10. Нянь 10",
        );
        return SuccessResponse;
    } else {
        await ctx.chat.sendMessage("Команда не распознана");
        return SuccessResponse;
    }
}
