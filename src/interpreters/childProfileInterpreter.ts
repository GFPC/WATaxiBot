// Интерпретатор сценария childProfile
import { Context } from "../index";
import { localization } from "../l10n";

// Типы для JSON-машины состояний
export type StateMachine = {
    states: {
        [state: string]: {
            onEnter?: any;
            transitions?: {
                [event: string]: {
                    target: string;
                    actions?: any[];
                };
            };
        };
    };
};

export type HandlerMap = {
    [name: string]: (ctx: Context, payload?: any) => Promise<void> | void;
};

// Валидации по имени
const validators: { [name: string]: (input: any) => boolean } = {
    isNumber: (input) => !isNaN(Number(input)),
    // можно добавить другие валидаторы
};

// Получить текст по ключу локализации
function getLocalizedText(
    key: string,
    params?: Record<string, string | number>,
): string {
    const dict = localization as Record<string, string>;
    let text = dict[key] || key;
    if (params) {
        for (const k in params) {
            text = text.replace(new RegExp(`%${k}%`, "g"), String(params[k]));
        }
    }
    return text;
}

// Базовые действия
async function runAction(
    action: any,
    ctx: any,
    input: any,
    customFns: HandlerMap,
) {
    switch (action.type) {
        case "sendMessage": {
            // Отправка кастомного текста
            let text = action.text;
            if (text && typeof text === "string") {
                text = text.replace(
                    /\{(\w+)\}/g,
                    (_: string, k: string) =>
                        ctx[k] ??
                        ctx.state?.data?.[k] ??
                        ctx.profile?.[k] ??
                        "",
                );
            }
            await ctx.chat.sendMessage(text);
            break;
        }
        case "sendLocalized": {
            // Отправка текста по ключу локализации
            const key = action.key;
            const params = action.params || {};
            const text = getLocalizedText(key, params);
            await ctx.chat.sendMessage(text);
            break;
        }
        case "set": {
            // setByPath(ctx, action.path, ...)
            let value = action.valueFromInput ? input : action.value;
            if (
                action.valueTemplate &&
                typeof action.valueTemplate === "string"
            ) {
                value = action.valueTemplate.replace(
                    /\{(\w+)\}/g,
                    (_: string, k: string) =>
                        ctx[k] ??
                        ctx.state?.data?.[k] ??
                        ctx.profile?.[k] ??
                        "",
                );
            }
            setByPath(ctx, action.path, value);
            break;
        }
        case "push": {
            // push value/object в массив по path
            let arr = getByPath(ctx, action.path);
            if (!Array.isArray(arr)) {
                setByPath(ctx, action.path, []);
                arr = getByPath(ctx, action.path);
            }
            arr.push(action.valueFromInput ? input : action.value);
            break;
        }
        case "validate": {
            if (!validators[action.validator](input)) {
                await ctx.chat.sendMessage(
                    action.errorText || "Ошибка валидации!",
                );
                throw new Error("Validation failed");
            }
            break;
        }
        case "if": {
            // Условный переход: if {path} == value
            const val = getByPath(ctx, action.path);
            if (val === action.equals) {
                await runAction(action.then, ctx, input, customFns);
            } else if (action.else) {
                await runAction(action.else, ctx, input, customFns);
            }
            break;
        }
        case "custom": {
            if (action.function && customFns[action.function]) {
                await customFns[action.function](ctx, input);
            }
            break;
        }
        default:
            throw new Error(`Unknown action type: ${action.type}`);
    }
}

// Утилита для set
function setByPath(obj: any, path: string, value: any) {
    const keys = path.split(".");
    let o = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        if (!o[keys[i]]) o[keys[i]] = {};
        o = o[keys[i]];
    }
    o[keys[keys.length - 1]] = value;
}

function getByPath(obj: any, path: string) {
    const keys = path.split(".");
    let o = obj;
    for (let i = 0; i < keys.length; i++) {
        if (!o) return undefined;
        o = o[keys[i]];
    }
    return o;
}

// Интерпретатор
export class ChildProfileInterpreter {
    private machine: StateMachine;
    private customFns: HandlerMap;
    private ctx: Context;
    private state: string;

    constructor(
        machine: StateMachine,
        customFns: HandlerMap,
        ctx: Context,
        initialState: string,
    ) {
        this.machine = machine;
        this.customFns = customFns;
        this.ctx = ctx;
        this.state = initialState;
    }

    async start() {
        await this.enterState(this.state);
    }

    async send(event: string, input?: any) {
        const stateDef = this.machine.states[this.state];
        const transition =
            stateDef.transitions?.[event] || stateDef.transitions?.["*"];
        if (!transition)
            throw new Error(
                `No transition for event ${event} in state ${this.state}`,
            );
        if (transition.actions) {
            for (const action of transition.actions) {
                await runAction(action, this.ctx, input, this.customFns);
            }
        }
        await this.enterState(transition.target);
    }

    private async enterState(state: string) {
        this.state = state;
        const stateDef = this.machine.states[state];
        if (stateDef.onEnter) {
            await runAction(
                stateDef.onEnter,
                this.ctx,
                undefined,
                this.customFns,
            );
        }
    }
}

// Подробные комментарии:
// - Для добавления новых действий расширьте switch в runAction
// - Для поддержки новых валидаторов добавьте их в validators
// - Для сложных переходов используйте action типа "custom" и реализуйте функцию в customFns
// - Для локализации используйте action типа "sendLocalized" с ключом из l10n.ts
