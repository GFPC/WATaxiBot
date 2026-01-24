import {Context} from "../../../types/Context";
import axios from "axios";
import {Message} from "whatsapp-web.js";


export default class TripWatcher {
    private timer: NodeJS.Timeout = setTimeout(() => {}, 0);
    private isStopped: boolean = false; // Добавляем флаг остановки

    private ctx: Context;
    private b_id: string = '';
    private currentList: string[] = [];
    private trips_list_msg: Message = {} as Message;
    public tripList: { [key: string]: { [key: string]: any } } = {};

    constructor(ctx: Context, b_id: string) {
        this.ctx = ctx;
        this.b_id = b_id;
    }
    async stop() {
        console.log("[ TruckTripWatcher ]  CALLED STOP")
        this.isStopped = true;
        clearTimeout(this.timer);
    }

    async start(trips_list_msg:Message) {
        this.trips_list_msg = trips_list_msg;
        await this.pollTrips();
    }

    private async pollTrips(){
        console.log("[ TruckTripWatcher ] Polling trips...");
        const interval = 5*1000;

        const res = await axios.post(`${this.ctx.baseURL}trip`, {
            token: this.ctx.auth.token,
            u_hash: this.ctx.auth.hash,
        }, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            }
        });

        const driversIds: (string | number)[] = [];

        if (res.data.data.trip) {
            Object.values(res.data.data.trip).forEach((trip: any) => {
                if (trip.u_id && !driversIds.includes(trip.u_id)) {
                    driversIds.push(trip.u_id);
                }
            });
        }

        const drivers_res = await axios.post(`${this.ctx.baseURL}user/${driversIds.join(',')}`, {
            token: this.ctx.auth.token,
            u_hash: this.ctx.auth.hash,
        }, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            }
        });

        console.log('[ TruckTripWatcher ] Drivers:', driversIds);
        let text = '';
        let counter = 0;
        for(let trip in res.data.data.trip) {
            counter++;
            this.tripList[counter] = res.data.data.trip[trip];
            text += `${counter}. ${res.data.data.trip[trip].t_start_datetime.split('+')[0]} ${drivers_res.data.data.user[res.data.data.trip[trip].u_id].u_name}`
            +`${res.data.data.trip[trip].t_options ? res.data.data.trip[trip].t_options.price + ' ' + res.data.data.trip[trip].currency: ''}`
            + ` MNS RNS\n`;
        }

        await this.trips_list_msg.edit('Trips:\n' + text + '\n\nВыберите рейс');

        if (!this.isStopped) {
            this.timer = setTimeout(async () => {
                await this.pollTrips();
            }, interval);
        }
    }
}