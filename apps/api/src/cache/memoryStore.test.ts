import { describe, expect, it } from "vitest";
import { z } from "zod";

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
