import {getCar} from "../api/main";
import {Context} from "../types/Context";

export async function getPriceParams(ctx: Context, c_id: string): Promise<{base_price?: number, price_per_km?: number, status: string}> {
    // 1-search in defined car(request)
    // 2-search in defined car_class(constants)

    const car = await getCar(ctx.auth, ctx.baseURL, c_id);
    console.log(car.data.car[c_id]);
    if(!car.data.car[c_id]){
        return {
            status: "error",
        }
    }

    if(!car.data.car[c_id].courier_call_rate || !car.data.car[c_id].courier_fare_per_1_km){
        if(!ctx.constants.data.data.car_classes[car.data.car[c_id].cc_id]){
            return {
                status: "error",
            }
        }
        return {
            base_price: ctx.constants.data.data.car_classes[car.data.car[c_id].cc_id].courier_call_rate,
            price_per_km: ctx.constants.data.data.car_classes[car.data.car[c_id].cc_id].courier_fare_per_1_km,
            status: "success",
        }
    } else {
        return {
            base_price: car.data.car[c_id].courier_call_rate,
            price_per_km: car.data.car[c_id].courier_fare_per_1_km,
            status: "success",
        }
    }
}