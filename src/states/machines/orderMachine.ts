import { StateMachine, Location, PricingModel } from "../types";
import { Order } from "../../api/order";
import { Message } from "whatsapp-web.js";

export interface OrderMachine extends StateMachine {
    id: "order";
    state:
        | "collectionFrom"
        | "collectionTo"
        | "collectionHowManyPeople"
        | "collectionWhen"
        | "collectionOrderConfirm"
        | "collectionCarCode"
        | "collectionShowAdditionalOptions"
        | "collectionAdditionalOptions"
        | "collectionShowCarClass"
        | "collectionCarClass"
        | "aiQuestion"
        | "aiAnswer";
    data: {
        handbookActive: boolean;
        topPlacesActive: boolean;
        from: Location;
        to: Location;
        peopleCount: number;
        when?: Date | null; // null - сейчас,
        additionalOptions: number[];
        voting: boolean;
        priceModel: PricingModel;
        carClass: string | null;
        backupStateForAI?: string | null;
        nextStateForAI?: string | null;
        aiMessage?: Message;
        nextMessageForAI?: string | null;
    };
}

export function newEmptyOrder(): OrderMachine {
    return {
        id: "order",
        state: "collectionFrom",
        data: {
            handbookActive: false,
            topPlacesActive: false,
            from: {},
            to: {},
            peopleCount: 0,
            additionalOptions: [],
            voting: false,
            priceModel: {
                formula: "",
                price: "0",
                options: {
                    FAKE_OPTION: 0,
                },
            },
            carClass: null,
        },
    };
}

export interface VotingMachine extends StateMachine {
    id: "voting";
    state: "voting";
    data: {
        order: OrderMachine;
        startAt: Date;
        carCode: string;
        from: Location;
        to: Location;
        priceModel: PricingModel;
        carClass: string | null;
        backupStateForAI?: string | null;
        nextStateForAI?: string | null;
        aiMessage?: Message;
    };
}

export function newVoting(order: OrderMachine, startAt?: Date): VotingMachine {
    return <VotingMachine>{
        id: "voting",
        state: "voting",
        data: {
            order: order,
            startAt: startAt ?? new Date(),
            carCode: "",
            from: {},
            to: {},
            priceModel: {
                formula: "",
                price: "0",
                options: {},
            },
            carClass: null,
        },
    };
}
