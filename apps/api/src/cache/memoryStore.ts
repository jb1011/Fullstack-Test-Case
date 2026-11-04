import { LRUCache } from "lru-cache";

import type { CacheStore } from "./store";

type CacheValue = object | string | number | boolean;

const positiveInteger = (value: number, name: string) => {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer, got ${String(value)}`);
  }
};

const copy = (value: unknown): CacheValue => structuredClone(value) as CacheValue;

export function createMemoryStore(maxEntries: number, now?: () => number): CacheStore {
  positiveInteger(maxEntries, "maxEntries");

  const fetchers = new Map<string, () => Promise<unknown>>();
  const entries = new LRUCache<string, CacheValue>({
    max: maxEntries,
    ttl: Number.MAX_SAFE_INTEGER,
    noDeleteOnStaleGet: true,
    noDeleteOnFetchRejection: true,
    ...(now && { perf: { now }, ttlResolution: 0 }),
    fetchMethod: (key) => {
      const fetch = fetchers.get(key);
      if (!fetch) throw new Error(`No fetcher for cache key ${key}`);
      return fetch().then((value) => {
        if (value === undefined) throw new Error("Cannot store undefined");
        return copy(value);
      });
    },
  });

  return {
    get(key) {
      const value = entries.get(key);
      return value === undefined ? undefined : structuredClone(value);
    },

    set(key, value, ttlMs) {
      if (value === undefined) throw new Error("Cannot store undefined");
      if (ttlMs !== undefined) positiveInteger(ttlMs, "ttlMs");
      const stored = copy(value);
      if (ttlMs === undefined) entries.set(key, stored);
      else entries.set(key, stored, { ttl: ttlMs });
    },

    delete(key) {
      entries.delete(key);
    },

    async load(key, ttlMs, fetch) {
      positiveInteger(ttlMs, "ttlMs");
      const joined = fetchers.has(key);
      if (!joined) fetchers.set(key, fetch);

      try {
        const value = await entries.fetch(key, { ttl: ttlMs });
        if (value === undefined) throw new Error("Cannot store undefined");
        return structuredClone(value);
      } catch (error) {
        const previous = entries.get(key, { allowStale: true, noDeleteOnStaleGet: true });
        if (previous !== undefined) return structuredClone(previous);
        throw error;
      } finally {
        if (!joined) fetchers.delete(key);
      }
    },
  };
}
