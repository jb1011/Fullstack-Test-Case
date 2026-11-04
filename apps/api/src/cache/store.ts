/** `undefined` from `get` means the key is missing. The memory store is `lru-cache`. */
export interface CacheStore {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
  delete(key: string): void;
}
