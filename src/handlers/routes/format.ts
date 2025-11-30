import { StateMachine } from "../../states/types";
import type { Context } from "../../types/Context";

export type HandlerRouteResponse = {
    status: "success" | "error" | "warning";
    message?: string;
    details?: {
        state?: StateMachine;
        error?: string;
        [key: string]: any;
    };
    [key: string]: any;
};

export const SuccessResponse: HandlerRouteResponse = {
    status: "success",
};

/**
 * Универсальный вызов route-обработчика с логированием и обработкой ошибок
 */
export async function handleRoute(
    handler: (ctx: Context, state: any) => Promise<HandlerRouteResponse>,
    ctx: Context,
    state: any,
    logger: { log: (...args: any[]) => void },
): Promise<boolean> {
    const response = await handler(ctx, state);
    logger.log(`<${state.state}> routeResponse`, response);
    if (response.status === "success") {
        return true;
    } else {
        await ctx.chat.sendMessage(response.message || "Error not specified");
        return false;
    }
}
