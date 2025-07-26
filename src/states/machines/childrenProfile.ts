import { StateMachine, Location, PricingModel } from "../types";
import { Order } from "../../api/order";
import { Message } from "whatsapp-web.js";
import { newEmptyOrder, OrderMachine } from "./orderMachine";

export interface ChildProfileMachine extends StateMachine {
    id: "childrenProfile";
    state:
        | "collectionGender"
        | "collectionAge"
        | "collectionName"
        | "collectionDetails"
        | "collectionShortedVariant";
    data: {
        orderState: OrderMachine;
        gender: string;
        age: number;
        name: string;
        details: string;
        currentChildrenIndex: number;
        backupStateForAI?: string | null;
        nextStateForAI?: string | null;
        aiMessage?: Message;
        nextMessageForAI?: string | null;
    };
}

export function newChildProfile(
    orderState: OrderMachine,
    childrenIndex: number,
): ChildProfileMachine {
    return {
        id: "childrenProfile",
        state: "collectionGender",
        data: {
            orderState: orderState,
            gender: "",
            age: 0,
            name: "",
            details: "",
            currentChildrenIndex: childrenIndex,
        },
    };
}
