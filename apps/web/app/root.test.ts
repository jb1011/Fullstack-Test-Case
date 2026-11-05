import { describe, expect, it } from "vitest";

import { shouldRevalidate } from "./root";

describe("root route", () => {
  it("does not reload on navigation", () => {
    expect(shouldRevalidate()).toBe(false);
  });
});
