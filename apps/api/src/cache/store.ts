export interface CacheStore {
  get(key: string): unknown;
  set(key: string, value: unknown, ttlMs?: number): void;
  delete(key: string): void;
}
