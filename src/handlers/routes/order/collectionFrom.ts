import {
    GetLocation,
    parseGetLocationException,
} from "../../../utils/orderUtils";
import { localizationNames } from "../../../l10n";
import { formatString } from "../../../utils/formatter";
import { OrderMachine } from "../../../states/machines/orderMachine";
import { Context } from "../../../index";
import { HandlerRouteResponse, SuccessResponse } from "../format";

export async function collectionFrom(
    ctx: Context,
    state: OrderMachine,
): Promise<HandlerRouteResponse> {
    // Собираем информацию о начальной точке
    try {
        const location = await GetLocation(
            ctx.message,
            ctx.userID,
            ctx.storage,
            state,
            ctx,
        );

        if (ctx.configName === "children") {
            // Проверяем, что location — это координаты
            if (
                typeof location === "object" &&
                location.latitude !== undefined &&
                location.longitude !== undefined
            ) {
                // Всё ок — сохраняем и продолжаем
                state.data.from = location;
                state.state = "children_collectionTime";
                state.data.nextStateForAI = ctx.constants.getPrompt(
                    localizationNames.enterHoursCount,
                    ctx.user.settings.lang.api_id,
                );
                state.data.nextMessageForAI = localizationNames.enterHoursCount;
                await ctx.storage.push(ctx.userID, state);
                await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(
                        localizationNames.enterHoursCount,
                        ctx.user.settings.lang.api_id,
                    ),
                );
                return SuccessResponse;
            } else {
                // Нет координат — отправляем ошибку
                await ctx.chat.sendMessage(
                    "Пожалуйста, укажите координаты в формате: 55.7558 37.6176 или отправьте геолокацию.",
                    { linkPreview: false },
                );
                return SuccessResponse;
            }
        }
        state.data.from = location;
        state.state = "collectionTo";
        state.data.nextStateForAI = "collectionTo";
        state.data.nextMessageForAI = ctx.constants.getPrompt(
            localizationNames.collectionTo,
            ctx.user.settings.lang.api_id,
        );
        await ctx.storage.push(ctx.userID, state);
        await ctx.chat.sendMessage(
            ctx.constants.getPrompt(
                localizationNames.collectionTo,
                ctx.user.settings.lang.api_id,
            ),
            { linkPreview: false },
        );
        return SuccessResponse;
    } catch (e) {
        ctx.logger.error(`OrderHandler: ${e}`);
        const response = formatString(
            ctx.constants.getPrompt(
                localizationNames.errorGeolocation,
                ctx.user.settings.lang.api_id,
            ),
            {
                error: await parseGetLocationException(String(e), ctx),
            },
        );
        await ctx.chat.sendMessage(response);
        return SuccessResponse;
    }
    return SuccessResponse;
}
