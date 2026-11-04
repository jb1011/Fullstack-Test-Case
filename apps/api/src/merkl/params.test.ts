import { opportunitiesQuerySchema } from "@merkl/shared";
import { describe, expect, it } from "vitest";

import { toMerklFilterParams, toMerklListParams } from "./params";

const query = (input: Record<string, string> = {}) => opportunitiesQuerySchema.parse(input);

describe("toMerklListParams", () => {
  it("translates the default query, with Merkl's page starting at 0", () => {
    expect(Object.fromEntries(toMerklListParams(query()))).toEqual({
      status: "LIVE",
      sort: "tvl",
      order: "desc",
      page: "0",
      items: "20",
    });
  });

  it("renames every filter to Merkl's parameter name", () => {
    const params = toMerklListParams(
      query({
        chain: "42161,1",
        protocol: "aave,morpho",
        action: "LEND",
        status: "LIVE,SOON",
        minTvl: "1000",
        maxTvl: "5000",
        minApr: "4",
        search: "usdc",
        page: "3",
        pageSize: "50",
      }),
    );

    expect(Object.fromEntries(params)).toMatchObject({
      chainId: "1,42161",
      mainProtocolId: "aave,morpho",
      action: "LEND",
      status: "LIVE,SOON",
      minimumTvl: "1000",
      maximumTvl: "5000",
      minimumApr: "4",
      search: "usdc",
      page: "2",
      items: "50",
    });
  });
});

describe("toMerklFilterParams", () => {
  it("leaves out sorting and paging, which the count endpoint does not need", () => {
    const params = toMerklFilterParams(query({ chain: "1", sort: "apr", page: "4" }));

    expect(Object.fromEntries(params)).toEqual({ chainId: "1", status: "LIVE" });
  });
});
