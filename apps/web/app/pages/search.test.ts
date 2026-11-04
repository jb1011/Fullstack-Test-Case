import { opportunitiesQuerySchema, serializeOpportunitiesQuery } from "@merkl/shared";
import { describe, expect, it } from "vitest";

import { queryFromSearch, withFilter } from "./search";

describe("queryFromSearch", () => {
  it("reads a repeated key as one list", () => {
    expect(queryFromSearch("?chain=8453&chain=1")).toEqual(
      opportunitiesQuerySchema.parse({ chain: "1,8453" }),
    );
  });
});

describe("withFilter", () => {
  it("returns to the first page and drops a cleared filter", () => {
    const current = opportunitiesQuerySchema.parse({ chain: "1", page: "3" });
    const next = withFilter(current, { chain: undefined });

    expect(next.page).toBe(1);
    expect(next.chain).toBeUndefined();
    expect(serializeOpportunitiesQuery(next)).toBe("");
  });

  it("keeps the new filters and drops the page", () => {
    const current = opportunitiesQuerySchema.parse({ page: "3" });
    const next = withFilter(current, { chain: [1], search: "usdc" });

    expect(serializeOpportunitiesQuery(next)).toBe("chain=1&search=usdc");
  });
});
