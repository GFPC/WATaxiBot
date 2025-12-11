import {Context} from "../../../types/Context";


export default class TripWatcher {
    private timer: NodeJS.Timeout = setTimeout(() => {}, 0);
    private isStopped: boolean = false; // Добавляем флаг остановки

    private ctx: Context;
    private b_id: string = '';
    private currentList: string[] = [];

    constructor(ctx: Context, b_id: string) {
        this.ctx = ctx;
        this.b_id = b_id;
    }

    async start() {
        await this.pollTrips();
    }

    private async pollTrips(){
        console.log("=pollTrips");
        const interval = 5*1000;

        if (!this.isStopped) {
            this.timer = setTimeout(async () => {
                await this.pollTrips();
            }, interval);
        }
    }
}