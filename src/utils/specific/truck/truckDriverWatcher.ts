// Менеджер фонового поиска водителей с возможностью остановки
import WAWebJS, {Message} from "whatsapp-web.js";
import {OrderMachine} from "../../../states/machines/orderMachine";
import {Context} from "../../../types/Context";
import axios from "axios";
import {AuthData} from "../../../api/general";
import {getLocalizationText} from "../../textUtils";
import {localizationNames} from "../../../l10n";
import {countBy} from "lodash";
import {getDistanceAndDuration, getPrice, initPriceModelForTruck} from "./priceUtils";
import PriceModel from "../../../types/Price/PriceModel";
export async function getPerformersList(
    ctx: Context,
    b_id: string
): Promise<[
    {
        c_options: any,
        c_tips: string,
        c_completed: string,
        c_started: string,
        c_arrived: string,
        c_canceled: string,
        c_appointed: null,
        c_becomed_candidate: string,
        c_rating: string,
        c_cancel_reason: string,
        c_payment_datetime: string,
        c_payment_sum: string,
        c_payment_card: string,
        c_payment_way: string,
        l_datetime: string,
        c_longitude: string,
        c_latitude: string,
        c_state: string,
        c_id: string,
        u_id: string,
        c_arrive_state: number
    }
]
> {
    const url = `${ctx.baseURL}/drive/get/${b_id}`;
    const response = await axios.post(url, {
        ...ctx.auth,
    }, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    })
    const drivers = response.data.data.booking['3942'].drivers

    return drivers
}

export class TruckDriverWatcher {
    private timer: NodeJS.Timeout = setTimeout(() => {}, 0);
    private message: Message = {} as Message;
    private url: string = '';
    private auth: AuthData = {token: '', hash: ''} as AuthData;
    private b_id: string = '';
    private isStopped: boolean = false; // Добавляем флаг остановки

    private order_form: OrderMachine = {} as OrderMachine;
    private isVoting: boolean = false;
    private distanceAndDuration: {
        distance: number;
        duration: number;
        calculationType: string;
    } = {} as {distance: number; duration: number; calculationType: string};
    driversMap: {
        [key: string]: {
            id: string;
            priceModel: PriceModel;
        }
    } = {};

    private async pollPerformers(
        ctx: Context,
    ) {
        // Проверяем флаг в начале
        if (this.isStopped) return;
        console.log('Polling...');

        let res;
        try {
            res = await axios.post(`${this.url}drive/get/${this.b_id}?fields=00000000u1`, {
                token: this.auth.token,
                u_hash: this.auth.hash,
            }, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                }
            });
        } catch (e) {
            return
        }

        // Проверяем флаг после асинхронной операции
        if (this.isStopped) return;

        if(['3', '4'].includes(res.data.data.booking[this.b_id].b_state)) {
            console.log('drive closed or completed -> stop, b_state', res.data.data.booking[this.b_id].b_state);
            this.stop()
            return
        }

        const start_datetime = new Date(res.data.data.booking[this.b_id].b_start_datetime);
        const now_utc = new Date();
        const timeDelta = start_datetime.getTime() - now_utc.getTime();
        let interval = 0;

        if(timeDelta > 60*60*1000) {
            interval = 5*60*1000;
        } else if (timeDelta > 0 && timeDelta < 60*60*1000) {
            interval = 15*1000;
        } else if (timeDelta < 0 && timeDelta > -60*60*1000) {
            interval = 15*1000;
        } else {
            console.log('+1hour after start -> stop');
            this.stop()
            return
        }
        console.log('selecting interval', interval);
        const drivers = res.data.data.booking[this.b_id].drivers;

        if(!drivers){
            // Проверяем флаг перед планированием следующего вызова
            if (!this.isStopped) {

                await this.message.edit(getLocalizationText(ctx, localizationNames.truckDriversList) + getLocalizationText(ctx, localizationNames.truckDriversResponsesNotFound));

                this.timer = setTimeout(() => {
                    this.pollPerformers(ctx);
                }, interval);
            }
            return;
        }
        let drivers_cars_link:{
            [key: string]: string
        } = {}

        const drivers_profiles = await axios.post(`${this.url}user/${drivers.map((d: any) =>
            Array.isArray(d?.u_id) ? d.u_id[0] : d?.u_id ?? d
        ).join(',')}?fields=00000000u1`, {
            token: this.auth.token,
            u_hash: this.auth.hash,
        }, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            }
        })
        let drivers_cars: {
            [key: string]: {
                cm_id: string
            }
        } = {}
        // Проверяем флаг после второй асинхронной операции
        if (this.isStopped) return;

        drivers
            ? drivers.map((x: any) => {
                const uid = Array.isArray(x?.u_id) ? x.u_id[0] : x?.u_id ?? x
                drivers_cars_link[uid] = x.c_id
                return ;
            }) : [];
        console.log('linking', drivers_cars_link);
        const cars = await axios.post(`${this.url}car/${Object.values(drivers_cars_link).join(',')}`, {
            token: this.auth.token,
            u_hash: this.auth.hash,
        }, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            }
        })
        console.log('cars', cars.data, Object.keys(cars.data.data));

        const distanceAndDuration = this.distanceAndDuration;
        let counter = 0

        const drivers_profiles_formatted = drivers_profiles.data.data.user
            ? await Promise.all(Object.values(drivers_profiles.data.data.user).map(async (x: any) => {
                if(!ctx.constants.data.data.car_classes[cars.data.data.car[drivers_cars_link[x.u_id]].cc_id]){
                    return 'er-'
                }

                if(!this.driversMap[(counter+1).toString()]) {
                    this.driversMap[(counter+1).toString()] = {
                        id: x.u_id,
                        priceModel: {} as PriceModel
                    }
                }
                drivers_cars[x.u_id] = x.c_id
                const car = cars.data.data.car[drivers_cars_link[x.u_id]];
                console.log(car)
                const car_model = car.cm_id ? ctx.constants.data.data.car_models[car.cm_id][ctx.user.settings.lang.iso] : '-'
                const car_mark = car.cm_id ? ctx.constants.data.data.car_makes[ctx.constants.data.data.car_models[car.cm_id].make][ctx.user.settings.lang.iso] : '-';
                const text = drivers.find((d: any) => d.u_id === x.u_id).c_options.text || 'Текст отклика отсутствует';
                const price = drivers.find((d: any) => d.u_id === x.u_id).c_options.price || 'Цена не назначена';
                const rating = x.u_rating || 'RNS';
                console.log(drivers.find((d: any) => d.u_id === x.u_id));
                console.log(x)

                if(!this.order_form.data.truck_floornumber || !this.order_form.data.truck_gross_weight || !this.order_form.data.truck_count){
                    return
                }

                try{
                    const estimatedPriceParams = await initPriceModelForTruck(
                        ctx,
                        drivers_cars_link[x.u_id],
                        distanceAndDuration.calculationType,
                        distanceAndDuration.distance,
                        distanceAndDuration.duration,
                        JSON.parse(
                            ctx.constants.data.data.site_constants.pricingModels.value,
                        ).pricing_models,
                        this.isVoting,
                        this.order_form.data.additionalOptions,
                        res.data.data.booking[this.b_id].b_options.submitPrice,
                        this.order_form.data.truck_floornumber,
                        this.order_form.data.truck_gross_weight,
                        this.order_form.data.truck_count,
                    )
                    this.driversMap[(counter+1).toString()].priceModel = estimatedPriceParams;
                    console.log('estimatedPriceParams', estimatedPriceParams);
                    let estimatedPrice = await getPrice(
                        estimatedPriceParams.formula,
                        estimatedPriceParams.options,
                        distanceAndDuration.calculationType,
                    );
                    if(distanceAndDuration.calculationType === "incomplete"){
                        estimatedPrice += " + ?";
                    }
                    //console.log('estimatedPrice', estimatedPrice); // return

                    const fullText = `${counter+1}.${rating} | ${car_mark || ''} ${car_model || ''} | ${x.u_name || ''} ${x.u_family || ''} ${x.u_phone || ''} | ${estimatedPrice} | ${price}`.trim().replace('  ', ' ');
                    counter++;
                    return fullText || '-';
                } catch (e){
                    console.log('Error in truckDriverWatcher', e);
                    return 'er-'
                }


            }))
            : [getLocalizationText(ctx,localizationNames.truckDriversResponsesNotFound)];

        const drivers_text = drivers_profiles_formatted.filter(x => x!=='er-').join('\n');
        //console.log(drivers_text);
        await this.message.edit(`${getLocalizationText(ctx, localizationNames.truckDriversList)}${drivers_text}`);

        // Проверяем флаг перед планированием следующего вызова
        if (!this.isStopped) {
            this.timer = setTimeout(async () => {
                await this.pollPerformers(ctx);
            }, interval);
        }
    }

    async start(
        ctx: Context,
        msg: Message,
        b_id: string,
        order_form: OrderMachine,
        isVoting?: boolean,
        distanceAndDuration?: {
            distance: number;
            duration: number;
            calculationType: string;
        },
    ) {
        this.isStopped = false; // Сбрасываем флаг при старте
        this.message = msg;
        this.auth = ctx.auth;
        this.url = ctx.baseURL;
        this.b_id = b_id;
        this.order_form = order_form;
        this.isVoting = isVoting || false;

        this.stop(); // На всякий случай остановить предыдущий поиск
        this.isStopped = false;
        await this.pollPerformers(ctx);
    }

    stop() {
        this.isStopped = true; // Устанавливаем флаг остановки
        clearTimeout(this.timer);
    }
}