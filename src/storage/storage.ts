export interface Storage {
  pull(id: string): Promise<any | null>;
  push(id: string, data: any): Promise<void>;
  delete(id: string): Promise<void>;
}
