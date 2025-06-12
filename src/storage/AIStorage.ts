import { Storage } from "./storage";
import {ai_instructions} from "../ai/ai";

export class AIStorage implements Storage {
    table: {
        [id: string]: {
            messages: string[];
        };
    } = {};

    async pull(id: string): Promise<any | null> {
        return this.table[id] !== undefined ? this.table[id] : null
    }
    async push(id: string, data: any) {
        this.table[id] = data;
    }
    async delete(id: string) {
        delete this.table[id];
    }
}
