import { StateMachine, Location, PricingModel } from "../types";
import { Order } from "../../api/order";
import { Message } from "whatsapp-web.js";
import { DriverSearchManager } from "../../utils/orderUtils";

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
        | "aiAnswer"
        | "children_collectionTime"
        | "children_collectionChildrenCount"
        | "children_collectionSelectBabySisterRange"
        | "children_collectionSelectBabySister";
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

        // Children
        childrenTime?: number;
        //childrenCount?: number;
        childrenSelectBabySisterRange?: string;
        childrenSelectBabySister?: string;
        childrenProfiles?: Array<{
            name: string;
            age: number;
            gender: string;
            details: string;
        }> | string;
        preferredDriversList?: string[];
        driversMap?: { [key: string]: string };
        selectedDrivers?: string[];
        waitingForDrivers?: boolean;
        driverSearchManager: DriverSearchManager;
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
            driverSearchManager: new DriverSearchManager(),
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
