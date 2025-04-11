import { StateMachine, Location } from "../types";
import { Order } from "../../api/order";

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
    | "collectionAdditionalOptions";
  data: {
    handbookActive: boolean;
    topPlacesActive: boolean;
    from: Location;
    to: Location;
    peopleCount: number;
    when?: Date | null; // null - сейчас,
    additionalOptions: number[];
    voting: boolean
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
      voting: false
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
  };
}

export function newVoting(order: OrderMachine, startAt?: Date): VotingMachine {
  return {
    id: "voting",
    state: "voting",
    data: {
      order: order,
      startAt: startAt ?? new Date(),
      carCode: "",
      from: {},
      to: {},
    },
  };
}
