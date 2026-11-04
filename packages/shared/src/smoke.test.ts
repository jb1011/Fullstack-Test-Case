import { describe, expect, it } from "vitest";

describe("shared workspace", () => {
  it("loads its entry point", async () => {
    const entry = await import("./index");

    expect(entry).toBeTypeOf("object");
  });
});
