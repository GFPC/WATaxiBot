import PriceCalculationParams from "./PriceCalculationParams";

export default interface PriceModel {
    formula: string;
    price: string;
    options: PriceCalculationParams;
    calculationType?: string;
}