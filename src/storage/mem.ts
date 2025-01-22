import {Storage} from "./storage";

export class MemoryStorage implements Storage {
  table: {[id: string]: any} = {}

  async pull(id: string): Promise<any | null> {
    return this.table[id] !== undefined ? this.table[id] : null;
  }

  async push(id: string, data: any) {
    this.table[id] = data;
  }

  async delete(id: string) {
    delete this.table[id];
  }
}
