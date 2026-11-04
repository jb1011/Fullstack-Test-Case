import { LRUCache } from "lru-cache";

import type { CacheStore } from "./store";

export function createMemoryStore(maxEntries: number, now?: () => number): CacheStore {
  if (!Number.isInteger(maxEntries) || maxEntries < 1) {
    throw new Error(`maxEntries must be a positive integer, got ${String(maxEntries)}`);
  }

  const entries = new LRUCache<string, object | string | number | boolean>({
    max: maxEntries,
    ttl: Number.MAX_SAFE_INTEGER,
    ...(now && { perf: { now }, ttlResolution: 0 }),
  });

  return {
    get(key) {
      const value = entries.get(key);
      return value === undefined ? undefined : structuredClone(value);
    },

    set(key, value, ttlMs) {
      if (value === undefined) throw new Error("Cannot store undefined");
      if (ttlMs !== undefined && (!Number.isInteger(ttlMs) || ttlMs < 1)) {
        throw new Error(`ttlMs must be a positive integer, got ${String(ttlMs)}`);
      }
      const stored = structuredClone(value) as object | string | number | boolean;
      if (ttlMs === undefined) entries.set(key, stored);
      else entries.set(key, stored, { ttl: ttlMs });
    },

    delete(key) {
      entries.delete(key);
    },
  };
}
