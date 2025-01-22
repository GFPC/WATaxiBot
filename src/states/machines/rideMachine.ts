import {StateMachine} from "../types";
import {Order} from "../../api/order";

export interface RideMachine extends StateMachine {
  id: 'ride'
  // `searchCar` - поиск машины.
  // `orderAccepted` - заказ принят, водитель едет.
  // `carArrived` - машина прибыла, ждём пассажира.
  // `inDrive` - в пути.
  // `rate` - оценка водителя (заказ завершён).
  state: 'searchCar' | 'orderAccepted' | 'carArrived' | 'inDrive' | 'rate' | 'cancelReason'
  data: {
    isCollectionReason: boolean
    chatModeActive: boolean
    order: Order
  }
}

export function newRide(order: Order): RideMachine {
  return {
    id: 'ride',
    state: 'searchCar',
    data: {
      isCollectionReason: false,
      chatModeActive: false,
      order: order
    }
  }
}

export interface VoteMachine extends StateMachine {
  id: 'voting'
  state: 'voting'
  data: {
    order: Order,
    chatModeActive: boolean
  }
}

export function newVote(order: Order): VoteMachine {
  return {
    id: 'voting',
    state: 'voting',
    data: {
      order: order,
      chatModeActive: false
    }
  }
}