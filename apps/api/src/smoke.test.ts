import { describe, expect, it } from "vitest";

describe("api workspace", () => {
  it("resolves @merkl/shared from its TypeScript source", async () => {
    const shared = await import("@merkl/shared");

    expect(shared).toBeTypeOf("object");
  });
});
