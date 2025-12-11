import { Context } from "../types/Context";
import {RideMachine, VoteMachine} from "../states/machines/rideMachine";
import { localizationNames } from "../l10n";
import { constants } from "../constants";
import { newEmptyOrder, OrderMachine } from "../states/machines/orderMachine";
import { MessageMedia } from "whatsapp-web.js";
import {getLocalizationText} from "../utils/textUtils";
import {initPriceModelForTruck} from "../utils/specific/truck/priceUtils";

export async function RideHandler(ctx: Context) {
    var state  = await ctx.storage.pull(ctx.userID);
    console.log("RIDE HANDLER: ", ctx.message.body, state.state);
    if (ctx.message.body.toLowerCase() === "0") {
        ctx.message.body = "отмена";
    }
    switch (state.state) {
        case "searchCar":
            if(ctx.configName === "truck") {
                switch (ctx.message.body.toLowerCase()) {
                    case "отмена":
                        state.data.isCollectionReason = true;
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
                            "\n*1* - " +
                            text.mistakenlyOrder +
                            "\n*2* - " +
                            text.waitingForLonger +
                            "\n*3* - " +
                            text.conflictWithRider +
                            "\n*4* - " +
                            text.veryExpensive +
                            "";
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
                    case "02":
                        await ctx.chat.sendMessage(
                            ctx.constants.getPrompt(
                                localizationNames.enterStartPriceSum,
                                ctx.user.settings.lang.api_id,
                            ),
                        );
                        state.state = "extendStartTips";
                        await ctx.storage.push(ctx.userID, state);
                        break;
                    default:
                        if(state.data.order.truck_driverSelected){
                            await ctx.chat.sendMessage(
                                getLocalizationText(ctx, localizationNames.truckDriverAlreadySelected)
                            )
                            break
                        }
                        const select = ctx.message.body;
                        if(!state.data.order.truckDriversWatcher.driversMap[select]) {
                            await ctx.chat.sendMessage(
                                getLocalizationText(ctx, localizationNames.truckDriverNumberIncorrect)
                            )
                            break
                        }
                        const estimatedPriceParams = state.data.order.truckDriversWatcher.driversMap[select].priceModel
                        state.data.order.pricingModel = estimatedPriceParams;
                        state.data.pricingModel = estimatedPriceParams;

                        await ctx.chat.sendMessage(
                            getLocalizationText(ctx, localizationNames.truckYourSelectedDriver).replace("%driverNumber%", select)
                        );
                        state.data.order.truckDriversWatcher?.stop()
                        state.data.order.truck_driverSelected = true
                        await state.data.order.setPerformerAsDriver(state.data.order.truckDriversWatcher.driversMap[select].id);
                        break;
                }
                break;
            } else {
                switch (ctx.message.body.toLowerCase()) {
                    case "отмена":
                        state.data.isCollectionReason = true;
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
                            "\n*1* - " +
                            text.mistakenlyOrder +
                            "\n*2* - " +
                            text.waitingForLonger +
                            "\n*3* - " +
                            text.conflictWithRider +
                            "\n*4* - " +
                            text.veryExpensive +
                            "";
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
                    case "2":
                        await ctx.chat.sendMessage(
                            ctx.constants.getPrompt(
                                localizationNames.enterStartPriceSum,
                                ctx.user.settings.lang.api_id,
                            ),
                        );
                        state.state = "extendStartTips";
                        await ctx.storage.push(ctx.userID, state);
                        break;
                    default:
                        await ctx.chat.sendMessage(
                            ctx.constants.getPrompt(
                                localizationNames.enterStartPriceCommandNotFoundRide,
                                ctx.user.settings.lang.api_id,
                            ),
                        );
                        break;
                }
                break;
            }

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

            state.state = "searchCar";
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
                if (state.data.order.isVoting) {
                    state.id = "voting";
                    state.state = "voting";
                    await ctx.chat.sendMessage(
                        ctx.constants.getPrompt(
                            localizationNames.orderCancellationInterrupted,
                            ctx.user.settings.lang.api_id,
                        ),
                    );
                    await state.data.order.resendTimerMessage();
                    break;
                }
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
            } else {
                await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(
                        localizationNames.commandNotFound,
                        ctx.user.settings.lang.api_id,
                    ),
                );
            }
            break;
        case "rate":
            if (ctx.message.body == "отмена") {
                await ctx.storage.delete(ctx.userID);
                await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(
                        localizationNames.defaultPrompt,
                        ctx.user.settings.lang.api_id,
                    ),
                );
                break;
            }
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
            if (ctx.message.body == "отмена") {
                await ctx.storage.delete(ctx.userID);
                await ctx.chat.sendMessage(
                    ctx.constants.getPrompt(
                        localizationNames.defaultPrompt,
                        ctx.user.settings.lang.api_id,
                    ),
                );
                break;
            }
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
            console.log("GFP POINT 0x02, state: ", state.state);
            await ctx.chat.sendMessage("RIDE HANDLER -> GFP POINT 0x02");
    }
}
