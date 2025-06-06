import { Context } from "../index";
import { localization, localizationNames } from "../l10n";
import { newEmptyOrder } from "../states/machines/orderMachine";
import { OrderObserverCallback } from "../observer/order";
import { Order } from "../api/order";
import { constants } from "../constants";
import { RideHandler } from "./ride";

export async function VotingHandler(ctx: Context) {
    let state = await ctx.storage.pull(ctx.userID);
    console.log("VOTING HANDLER: ", ctx.message.body, state.state);
    switch (state.state) {
        case "voting":
            if (
                ctx.message.body.toLowerCase() === "2" ||
                ctx.message.body.toLowerCase() ===
                    ctx.constants.getPrompt(
                        localizationNames.extendVotingTimeLower,
                        ctx.user.settings.lang.api_id,
                    )
            ) {
                //addTime - Продлить
                await state.data.order.addVotingTime();
                break;
            } else if (
                ctx.message.body.toLowerCase() === "0" ||
                ctx.message.body.toLowerCase() ===
                    ctx.constants.getPrompt(
                        localizationNames.cancelLower,
                        ctx.user.settings.lang.api_id,
                    )
            ) {
                //Отмена
                const text = {
                    mistakenlyOrder: ctx.constants.getPrompt(
                        "mistakenly_ordered",
                        ctx.user.settings.lang.api_id,
                    ),
                    waitingForLonger: ctx.constants.getPrompt(
                        "waiting_for_long",
                        ctx.user.settings.lang.api_id,
                    ),
                    conflictWithRider: ctx.constants.getPrompt(
                        "conflict_with_rider",
                        ctx.user.settings.lang.api_id,
                    ),
                    veryExpensive: ctx.constants.getPrompt(
                        "very_expensive",
                        ctx.user.settings.lang.api_id,
                    ),
                };
                const reasonContainer =
                    "\n" +
                    text.mistakenlyOrder +
                    " - 1\n" +
                    text.waitingForLonger +
                    " - 2\n" +
                    text.conflictWithRider +
                    " - 3\n" +
                    text.veryExpensive +
                    " - 4";
                await ctx.chat.sendMessage(
                    ctx.constants
                        .getPrompt(
                            localizationNames.collectionCancelReason,
                            ctx.user.settings.lang.api_id,
                        )
                        .replace("%reasons%", reasonContainer),
                );
                state.state = "cancelReason";
                await ctx.storage.push(ctx.userID, state);
                break;
            } else if (ctx.message.body.trim() == "3") {
                await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(
                        localizationNames.enterStartPriceSum,
                        ctx.user.settings.lang.api_id,
                    ),
                );
                state.state = "extendStartTips";
                await ctx.storage.push(ctx.userID, state);
                break;
            } else {
                await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(
                        localizationNames.enterStartPriceCommandNotFoundRide,
                        ctx.user.settings.lang.api_id,
                    ),
                );
                break;
            }
            break;
        case "extendStartTips":
            if (ctx.message.body.replace(" ", "") === "00") {
                await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(
                        localizationNames.extendingStartPriceClosed,
                        ctx.user.settings.lang.api_id,
                    ),
                );
                state.state = "searchCar";
                await ctx.storage.push(ctx.userID, state);
                break;
            }
            if (!ctx.message.body.match(/^[0-9]+$/)) {
                await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(
                        localizationNames.enterStartPriceSumMustBeNumber,
                        ctx.user.settings.lang.api_id,
                    ),
                );
                break;
            }
            if (Number(ctx.message.body) < 0) {
                await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(
                        localizationNames.enterStartPriceSumMustBePositive,
                        ctx.user.settings.lang.api_id,
                    ),
                );
                break;
            }
            await state.data.order.extendSubmitPrice(
                Number(ctx.message.body),
                ctx,
            );
            await ctx.chat.sendMessage(
                ctx.constants
                    .getPrompt(
                        localizationNames.startPriceExtended,
                        ctx.user.settings.lang.api_id,
                    )
                    .replace("%price%", state.data.order.submitPrice)
                    .replace("%currency%", ctx.constants.data.default_currency),
            );
            state.state = "voting";
            await ctx.storage.push(ctx.userID, state);
            break;
        case "cancelReason":
            if (
                ctx.message.body.toLowerCase() ===
                    ctx.constants.getPrompt(
                        localizationNames.answerBackLower,
                        ctx.user.settings.lang.api_id,
                    ) ||
                ctx.message.body.trim() === "01"
            ) {
                //назад
                await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(
                        localizationNames.orderCancellationInterrupted,
                        ctx.user.settings.lang.api_id,
                    ),
                );
                state.state = "voting";
                await ctx.storage.push(ctx.userID, state);
                break;
            }
            if (
                ctx.message.body.toLowerCase() ===
                    ctx.constants.getPrompt(
                        localizationNames.cancelLower,
                        ctx.user.settings.lang.api_id,
                    ) ||
                ctx.message.body.toLowerCase() ===
                    ctx.constants.getPrompt(
                        localizationNames.cancelDigital,
                        ctx.user.settings.lang.api_id,
                    ) ||
                ctx.message.body.toLowerCase() === "отмена"
            ) {
                await state.data.order.cancel("");
                await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(
                        localizationNames.orderCanceled,
                        ctx.user.settings.lang.api_id,
                    ),
                );
                await ctx.storage.delete(ctx.userID);
                break;
            }
            if (["1", "2", "3", "4"].includes(ctx.message.body)) {
                if (ctx.message.body === "1") {
                    await state.data.order.cancel(
                        ctx.constants.getPrompt(
                            "mistakenly_ordered",
                            ctx.user.settings.lang.api_id,
                        ),
                    );
                } else if (ctx.message.body === "2") {
                    await state.data.order.cancel(
                        ctx.constants.getPrompt(
                            "waiting_for_long",
                            ctx.user.settings.lang.api_id,
                        ),
                    );
                } else if (ctx.message.body === "3") {
                    await state.data.order.cancel(
                        ctx.constants.getPrompt(
                            "conflict_with_rider",
                            ctx.user.settings.lang.api_id,
                        ),
                    );
                } else if (ctx.message.body === "4") {
                    await state.data.order.cancel(
                        ctx.constants.getPrompt(
                            "very_expensive",
                            ctx.user.settings.lang.api_id,
                        ),
                    );
                }
                await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(
                        localizationNames.closeReasonSpecified,
                        ctx.user.settings.lang.api_id,
                    ),
                );
                await ctx.storage.delete(ctx.userID);
            }
            break;
        case "rate":
            if (
                ctx.message.body.toLowerCase() ===
                ctx.constants.getPrompt(
                    localizationNames.answerBackLower,
                    ctx.user.settings.lang.api_id,
                )
            ) {
                //назад
                state.state = "searchCar";
                await ctx.storage.push(ctx.userID, state);
                await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(
                        localizationNames.stateProcessing,
                        ctx.user.settings.lang.api_id,
                    ),
                );
                break;
            }
            state.state = "comment";
            await ctx.storage.push(ctx.userID, state);
            await ctx.chat.sendMessage(
                ctx.constants.getPrompt(
                    localizationNames.rateSet,
                    ctx.user.settings.lang.api_id,
                ),
            );
            break;
        case "comment":
            if (
                ctx.message.body.toLowerCase() ===
                ctx.constants.getPrompt(
                    localizationNames.answerBackLower,
                    ctx.user.settings.lang.api_id,
                )
            ) {
                //назад
                await ctx.storage.delete(ctx.userID);
                await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(
                        localizationNames.defaultPrompt,
                        ctx.user.settings.lang.api_id,
                    ),
                );
                break;
            }
            await ctx.chat.sendMessage(
                ctx.constants.getPrompt(
                    localizationNames.commentReceived,
                    ctx.user.settings.lang.api_id,
                ),
            );
            await ctx.storage.delete(ctx.userID);
            await ctx.chat.sendMessage(
                ctx.constants.getPrompt(
                    localizationNames.defaultPrompt,
                    ctx.user.settings.lang.api_id,
                ),
            );
            break;
        default:
            break;
    }
}
