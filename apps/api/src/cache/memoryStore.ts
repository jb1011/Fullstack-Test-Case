import { LRUCache } from "lru-cache";

import type { CacheStore } from "./store";

export function createMemoryStore(maxEntries: number): CacheStore {
  if (!Number.isInteger(maxEntries) || maxEntries < 1) {
    throw new Error(`maxEntries must be a positive integer, got ${String(maxEntries)}`);
  }

  // `null` is a real cached value. The package's type excludes it, so the cast is at this boundary.
  const entries = new LRUCache<string, object | string | number | boolean>({ max: maxEntries });

  return {
    get(key) {
      const value = entries.get(key);
      return value === undefined ? undefined : structuredClone(value);
    },

    set(key, value) {
      if (value === undefined) throw new Error("Cannot store undefined");
      entries.set(key, structuredClone(value) as object | string | number | boolean);
    },

    delete(key) {
      entries.delete(key);
    },
  };
}
