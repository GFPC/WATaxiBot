import {
    GetLocation,
    parseGetLocationException,
} from "../../../utils/orderUtils";
import { localizationNames } from "../../../l10n";
import { formatString } from "../../../utils/formatter";
import { OrderMachine } from "../../../states/machines/orderMachine";
import { Context } from "../../../index";
import { HandlerRouteResponse, SuccessResponse } from "../format";
function formatRanges(items: Record<string, { maxVolume?: number; maxWeight?: number }>, label: string): string {
    // Преобразуем в массив и сортируем по ключу
    const sorted = Object.entries(items)
        .map(([key, value]) => ({
            key: parseInt(key),
            value: value.maxVolume || value.maxWeight || 0
        }))
        .sort((a, b) => a.key - b.key);

    let result = `${label}:\n`;

    sorted.forEach((item, index) => {
        let range: string;

        if (index === 0) {
            // Первый элемент: < значение
            range = `<${item.value}`;
        } else {
            // Остальные элементы: предыдущее значение - текущее значение
            const prevValue = sorted[index - 1].value;
            range = `${prevValue}-${item.value}`;
        }

        result += `  ${index + 1}. ${range}\n`;
    });

    return result;
}

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

export async function collectionTo(
    ctx: Context,
    state: OrderMachine,
): Promise<HandlerRouteResponse> {
    // Собираем информацию о конечной точке
    try {
        const location = await GetLocation(
            ctx.message,
            ctx.userID,
            ctx.storage,
            state,
            ctx,
        );

        if (typeof location != "string") {
            state.data.to = location;
            state.state = "collectionHowManyPeople";
            state.data.nextStateForAI = "collectionHowManyPeople";
            state.data.nextMessageForAI = ctx.constants.getPrompt(
                localizationNames.collectionPeopleCount,
                ctx.user.settings.lang.api_id,
            );
            await ctx.storage.push(ctx.userID, state);
            if(ctx.configName === "truck") {
                let type_sizes = remap(JSON.parse(ctx.constants.data.data.site_constants.type_size.value));
                let type_weights = remap(JSON.parse(ctx.constants.data.data.site_constants.type_weight.value));
                await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(
                        localizationNames.collectionPeopleCount,
                        ctx.user.settings.lang.api_id,
                    ) +  formatRanges(type_sizes.newData as Record<string, { maxVolume: number }>, '\nТиповые размеры(м³)') + formatRanges(type_weights.newData as Record<string, { maxWeight: number }>, 'Типовые веса(кг)')
                )

            } else {
                await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(
                        localizationNames.collectionPeopleCount,
                        ctx.user.settings.lang.api_id,
                    ),
                );
            }
            return SuccessResponse;
        }

        await ctx.chat.sendMessage(location);
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
