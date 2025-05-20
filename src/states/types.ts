export interface StateMachine {
  id: string;
  state: string;
  data: object;
  constants?: object;
}

export interface Location {
  latitude?: number;
  longitude?: number;
  address?: string;
}
export type PricingModel = {
  formula: string;
  price: number;
  options: { [key: string]: number };
  calculationType?: string;
};
