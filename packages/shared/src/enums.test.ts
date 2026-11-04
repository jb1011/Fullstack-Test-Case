import { describe, expect, it } from "vitest";

import {
  opportunityActionSchema,
  opportunitySortSchema,
  opportunityStatusSchema,
  sortOrderSchema,
} from "./enums";

describe("opportunityStatusSchema", () => {
  it.each(["LIVE", "PAST", "SOON"])("accepts %s", (value) => {
    expect(opportunityStatusSchema.parse(value)).toBe(value);
  });

  it.each(["live", "ENDED", ""])("rejects %j", (value) => {
    expect(opportunityStatusSchema.safeParse(value).success).toBe(false);
  });
});

describe("opportunityActionSchema", () => {
  it("matches the actions documented by Merkl", () => {
    expect(opportunityActionSchema.options).toEqual([
      "POOL",
      "HOLD",
      "DROP",
      "LEND",
      "BORROW",
      "LONG",
      "SHORT",
      "SWAP",
      "STAKE",
      "INVALID",
    ]);
  });

  it("rejects an unknown action", () => {
    expect(opportunityActionSchema.safeParse("FARM").success).toBe(false);
  });
});

describe("opportunitySortSchema", () => {
  it("only exposes the sorts the list page offers", () => {
    expect(opportunitySortSchema.options).toEqual(["apr", "tvl", "rewards"]);
  });

  it("rejects a Merkl sort I don't expose", () => {
    expect(opportunitySortSchema.safeParse("endingSoon").success).toBe(false);
  });
});

describe("sortOrderSchema", () => {
  it.each(["asc", "desc"])("accepts %s", (value) => {
    expect(sortOrderSchema.parse(value)).toBe(value);
  });

  it("rejects uppercase", () => {
    expect(sortOrderSchema.safeParse("DESC").success).toBe(false);
  });
});
