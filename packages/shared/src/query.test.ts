import { describe, expect, it } from "vitest";

import { opportunitiesQuerySchema, serializeOpportunitiesQuery } from "./query";

const parse = (input: Record<string, unknown>) => opportunitiesQuerySchema.parse(input);
const fails = (input: Record<string, unknown>) =>
  !opportunitiesQuerySchema.safeParse(input).success;

describe("opportunitiesQuerySchema", () => {
  it("applies defaults to an empty query", () => {
    expect(parse({})).toEqual({
      status: ["LIVE"],
      sort: "tvl",
      order: "desc",
      page: 1,
      pageSize: 20,
    });
  });

  it("turns comma separated values into sorted, unique lists", () => {
    expect(parse({ chain: "42161, 1,1", status: "SOON,LIVE" })).toMatchObject({
      chain: [1, 42161],
      status: ["LIVE", "SOON"],
    });
  });

  it("accepts repeated keys as well as comma separated values", () => {
    expect(parse({ chain: ["8453", "1"] }).chain).toEqual([1, 8453]);
  });

  it("coerces numbers from strings", () => {
    expect(parse({ minTvl: "1000", minApr: "4.5", page: "3" })).toMatchObject({
      minTvl: 1000,
      minApr: 4.5,
      page: 3,
    });
  });

  it("treats blank values as absent instead of zero", () => {
    expect(parse({ minTvl: "", chain: "", search: "   ", sort: "" })).toEqual(parse({}));
  });

  it("lowercases protocol slugs and trims the search", () => {
    expect(parse({ protocol: "Aave,MORPHO", search: "  usdc " })).toMatchObject({
      protocol: ["aave", "morpho"],
      search: "usdc",
    });
  });

  it("drops unknown keys", () => {
    expect(parse({ utm_source: "x" })).toEqual(parse({}));
  });

  it.each([
    { chain: "abc" },
    { chain: "1.5" },
    { status: "live" },
    { action: "FARM" },
    { minTvl: "-1" },
    { minApr: "lots" },
    { page: "0" },
    { pageSize: "101" },
    { sort: "endingSoon" },
  ])("rejects %j", (input) => {
    expect(fails(input)).toBe(true);
  });

  it("rejects a minimum TVL above the maximum", () => {
    const result = opportunitiesQuerySchema.safeParse({ minTvl: "500", maxTvl: "100" });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["maxTvl"]);
  });
});

describe("serializeOpportunitiesQuery", () => {
  it("returns an empty string for the default query", () => {
    expect(serializeOpportunitiesQuery(parse({}))).toBe("");
  });

  it("gives the same string whatever the input order", () => {
    const a = serializeOpportunitiesQuery(parse({ status: "PAST", chain: "1,8453" }));
    const b = serializeOpportunitiesQuery(parse({ chain: "8453,1", status: "PAST" }));

    expect(a).toBe(b);
    expect(a).toBe("chain=1%2C8453&status=PAST");
  });

  it("omits values equal to their default", () => {
    expect(serializeOpportunitiesQuery(parse({ status: "LIVE", page: "1", minApr: "5" }))).toBe(
      "minApr=5",
    );
  });

  it("round trips through the schema", () => {
    const query = parse({ chain: "1", protocol: "aave", maxTvl: "1e6", sort: "apr", page: "2" });
    const roundTrip = parse(
      Object.fromEntries(new URLSearchParams(serializeOpportunitiesQuery(query))),
    );

    expect(roundTrip).toEqual(query);
  });
});
