import { describe, expect, it } from "vitest";
import { z } from "zod";

import { FILTERS_TTL_MS, HISTORY_TTL_MS, LIST_TTL_MS } from "./lifetimes";
import { createMemoryStore } from "./memoryStore";
import type { CacheStore } from "./store";

const storeOf = (maxEntries: number): CacheStore => createMemoryStore(maxEntries);
const record = z.object({ name: z.string() });

describe("createMemoryStore", () => {
  it("returns undefined for a missing key", () => {
    const store = storeOf(2);

    expect(store.get("missing")).toBeUndefined();
  });

  it("keeps null, which is a real value and not a miss", () => {
    const store = storeOf(2);
    store.set("empty", null);

    expect(store.get("empty")).toBeNull();
  });

  it("replaces a key without growing the store", () => {
    const store = storeOf(1);
    store.set("a", 1);
    store.set("a", 2);

    expect(store.get("a")).toBe(2);
  });

  it("drops the least recently used entry when full", () => {
    const store = storeOf(2);
    store.set("a", 1);
    store.set("b", 2);
    store.set("c", 3);

    expect(store.get("a")).toBeUndefined();
    expect(store.get("b")).toBe(2);
    expect(store.get("c")).toBe(3);
  });

  it("treats a read as recent, so that entry survives the next eviction", () => {
    const store = storeOf(2);
    store.set("a", 1);
    store.set("b", 2);
    store.get("a");
    store.set("c", 3);

    expect(store.get("b")).toBeUndefined();
    expect(store.get("a")).toBe(1);
    expect(store.get("c")).toBe(3);
  });

  it("treats a replacement as recent too", () => {
    const store = storeOf(2);
    store.set("a", 1);
    store.set("b", 2);
    store.set("a", 10);
    store.set("c", 3);

    expect(store.get("b")).toBeUndefined();
    expect(store.get("a")).toBe(10);
  });

  it("copies values, so a caller cannot change what is stored", () => {
    const store = storeOf(2);
    const input = { name: "Aave" };
    store.set("protocol", input);
    input.name = "changed";

    const first = record.parse(store.get("protocol"));
    expect(first.name).toBe("Aave");

    first.name = "mutated";
    expect(record.parse(store.get("protocol")).name).toBe("Aave");
  });

  it("deletes a key", () => {
    const store = storeOf(2);
    store.set("a", 1);
    store.delete("a");

    expect(store.get("a")).toBeUndefined();
    store.delete("missing");
  });

  it("refuses undefined and a non positive size", () => {
    const store = storeOf(1);

    expect(() => {
      store.set("a", undefined);
    }).toThrow(/undefined/);
    expect(store.get("a")).toBeUndefined();
    expect(() => createMemoryStore(0)).toThrow(/positive integer/);
    expect(() => createMemoryStore(1.5)).toThrow(/positive integer/);
  });
});

describe("ttl", () => {
  const start = 1_000_000;
  let now = start;

  const store = () => {
    now = start;
    return createMemoryStore(10, () => now);
  };

  it("returns the value at the exact ttl and nothing one millisecond later", () => {
    const cache = store();
    cache.set("list", "rows", LIST_TTL_MS);

    now = start + LIST_TTL_MS;
    expect(cache.get("list")).toBe("rows");

    now = start + LIST_TTL_MS + 1;
    expect(cache.get("list")).toBeUndefined();
  });

  it("lets each entry expire on its own", () => {
    const cache = store();
    cache.set("list", "rows", LIST_TTL_MS);
    cache.set("history", "points", HISTORY_TTL_MS);
    cache.set("chains", "eth", FILTERS_TTL_MS);

    now = start + LIST_TTL_MS + 1;
    expect(cache.get("list")).toBeUndefined();
    expect(cache.get("history")).toBe("points");

    now = start + HISTORY_TTL_MS + 1;
    expect(cache.get("history")).toBeUndefined();
    expect(cache.get("chains")).toBe("eth");
  });

  it("restarts the ttl when the value is replaced", () => {
    const cache = store();
    cache.set("list", "old", LIST_TTL_MS);

    now = start + LIST_TTL_MS - 1;
    cache.set("list", "new", LIST_TTL_MS);
    now = start + LIST_TTL_MS + 10;
    expect(cache.get("list")).toBe("new");

    now = start + LIST_TTL_MS - 1 + LIST_TTL_MS + 1;
    expect(cache.get("list")).toBeUndefined();
  });

  it("keeps an entry with no ttl until the size limit drops it", () => {
    const cache = store();
    cache.set("a", 1);

    now = start + FILTERS_TTL_MS;
    expect(cache.get("a")).toBe(1);
  });

  it("refuses a non positive ttl", () => {
    const cache = store();

    expect(() => {
      cache.set("a", 1, 0);
    }).toThrow(/positive integer/);
    expect(cache.get("a")).toBeUndefined();
  });
});

describe("load", () => {
  const start = 1_000_000;
  let now = start;

  const store = () => {
    now = start;
    return createMemoryStore(10, () => now);
  };

  it("runs one fetch for identical keys in flight", async () => {
    const cache = store();
    let calls = 0;
    let release: (value: string) => void = () => undefined;
    const pending = new Promise<string>((resolve) => {
      release = resolve;
    });
    const fetch = () => {
      calls += 1;
      return pending;
    };

    const first = cache.load("list", LIST_TTL_MS, fetch);
    const second = cache.load("list", LIST_TTL_MS, fetch);
    release("rows");

    await expect(first).resolves.toBe("rows");
    await expect(second).resolves.toBe("rows");
    expect(calls).toBe(1);
  });

  it("does not fetch again while the value is fresh", async () => {
    const cache = store();
    await cache.load("list", LIST_TTL_MS, () => Promise.resolve("rows"));

    let calls = 0;
    await expect(
      cache.load("list", LIST_TTL_MS, () => {
        calls += 1;
        return Promise.resolve("other");
      }),
    ).resolves.toBe("rows");
    expect(calls).toBe(0);
  });

  it("fetches again once the ttl has passed", async () => {
    const cache = store();
    await cache.load("list", LIST_TTL_MS, () => Promise.resolve("old"));

    now = start + LIST_TTL_MS + 1;
    await expect(cache.load("list", LIST_TTL_MS, () => Promise.resolve("new"))).resolves.toBe(
      "new",
    );
    expect(cache.get("list")).toBe("new");
  });

  it("throws when the fetch fails and nothing was stored", async () => {
    const cache = store();

    await expect(
      cache.load("list", LIST_TTL_MS, () => Promise.reject(new Error("down"))),
    ).rejects.toThrow("down");
    expect(cache.get("list")).toBeUndefined();
    await expect(cache.load("list", LIST_TTL_MS, () => Promise.resolve("rows"))).resolves.toBe(
      "rows",
    );
  });

  it("returns the previous value when a refresh fails, without making it fresh", async () => {
    const cache = store();
    cache.set("list", "old", LIST_TTL_MS);
    now = start + LIST_TTL_MS + 1;

    await expect(
      cache.load("list", LIST_TTL_MS, () => Promise.reject(new Error("down"))),
    ).resolves.toBe("old");
    expect(cache.get("list")).toBeUndefined();
    await expect(
      cache.load("list", LIST_TTL_MS, () => Promise.reject(new Error("still down"))),
    ).resolves.toBe("old");
  });
});
