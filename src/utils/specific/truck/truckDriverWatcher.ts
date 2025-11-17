// Менеджер фонового поиска водителей с возможностью остановки
import WAWebJS, {Message} from "whatsapp-web.js";
import {OrderMachine} from "../../../states/machines/orderMachine";
import {Context} from "../../../index";
import axios from "axios";
import {AuthData} from "../../../api/general";
import {getLocalizationText} from "../../textUtils";
import {localizationNames} from "../../../l10n";
import {countBy} from "lodash";
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
    driversMap: {
        [key: string]: string
    } = {};

    private async pollPerformers(
        ctx: Context,
    ) {
        // Проверяем флаг в начале
        if (this.isStopped) return;
        console.log('Polling...');

        const res = await axios.post(`${this.url}drive/get/${this.b_id}?fields=00000000u1`, {
            token: this.auth.token,
            u_hash: this.auth.hash,
        }, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            }
        });

        // Проверяем флаг после асинхронной операции
        if (this.isStopped) return;

        if(['3', '4'].includes(res.data.data.booking[this.b_id].b_state)) {
            console.log('drive closed or completed -> stop');
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

        const drivers_profiles_formatted = drivers_profiles.data.data.user
            ? Object.values(drivers_profiles.data.data.user).map((x: any, index: number) => {
                this.driversMap[(index+1).toString()] = x.u_id;
                drivers_cars[x.u_id] = x.c_id
                const car = cars.data.data.car[drivers_cars_link[x.u_id]];
                const car_model = ctx.constants.data.data.car_models[car.cm_id][ctx.user.settings.lang.iso]
                const car_mark = ctx.constants.data.data.car_makes[ctx.constants.data.data.car_models[car.cm_id].make][ctx.user.settings.lang.iso];
                const text = drivers.find((d: any) => d.u_id === x.u_id).c_options.text || 'Текст отклика отсутствует';
                const price = drivers.find((d: any) => d.u_id === x.u_id).c_options.price || 'Цена не назначена';
                const rating = x.u_rating || 'RNS';
                console.log(drivers.find((d: any) => d.u_id === x.u_id));
                console.log(x)
                const fullText = `${index+1}.${rating} | ${car_mark || ''} ${car.cm_id || ''} | ${x.u_name || ''} ${x.u_family || ''} ${x.u_phone || ''} | ${text} | ${price}`.trim().replace('  ', ' ');
                return fullText || '-';
            })
            : [getLocalizationText(ctx,localizationNames.truckDriversResponsesNotFound)];

        const drivers_text = drivers_profiles_formatted.join('\n');

        await this.message.edit(`${drivers_text}`);

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
    ) {
        this.isStopped = false; // Сбрасываем флаг при старте
        this.message = msg;
        this.auth = ctx.auth;
        this.url = ctx.baseURL;
        this.b_id = b_id;

        this.stop(); // На всякий случай остановить предыдущий поиск
        this.isStopped = false;
        await this.pollPerformers(ctx);
    }

    stop() {
        this.isStopped = true; // Устанавливаем флаг остановки
        clearTimeout(this.timer);
    }
}