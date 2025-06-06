import { Storage } from "./storage";

export class UsersStorage implements Storage {
    table: {
        [id: string]: {
            api_u_id: number;
            reloadFromApi: boolean;
            settings: {
                lang: {
                    iso: string;
                    native: string;
                };
            };
        };
    } = {};

    async pull(id: string): Promise<any | null> {
        if (this.table[id] === undefined) {
            return null;
        } else {
            if (!this.table[id].reloadFromApi) {
                this.table[id].reloadFromApi = false;
            }
            return this.table[id];
        }
    }
    async push(id: string, data: any) {
        this.table[id] = data;
    }
    async delete(id: string) {
        delete this.table[id];
    }
}
