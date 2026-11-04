import { describe, expect, it } from "vitest";

import {
  opportunityDetailSchema,
  opportunityHistorySchema,
  opportunityListSchema,
  type OpportunitySummary,
} from "./dto";

const summary: OpportunitySummary = {
  id: "2433802672589613459",
  name: "Supply to Sentora RLUSD Main V2 vault on Morpho on Ethereum",
  chain: { id: 1, name: "Ethereum", icon: "https://example.com/1.svg" },
  protocol: { id: "morpho", name: "Morpho", icon: null },
  action: "LEND",
  status: "LIVE",
  apr: 2.79,
  tvl: 431_533_047.45,
  dailyRewards: 33_060.53,
  tokens: [{ address: "0x6dC5", symbol: "senRLUSDv2", icon: null }],
};

describe("opportunityListSchema", () => {
  it("accepts a page of summaries with its totals", () => {
    const list = { items: [summary], total: 197, totalTvl: 2.8e9, page: 1, pageSize: 20 };

    expect(opportunityListSchema.parse(list)).toEqual(list);
  });

  it("accepts an opportunity without a protocol", () => {
    const list = {
      items: [{ ...summary, protocol: null }],
      total: 1,
      totalTvl: 0,
      page: 1,
      pageSize: 20,
    };

    expect(opportunityListSchema.safeParse(list).success).toBe(true);
  });

  it("rejects a status Merkl did not document", () => {
    const list = {
      items: [{ ...summary, status: "ENDED" }],
      total: 1,
      totalTvl: 0,
      page: 1,
      pageSize: 20,
    };

    expect(opportunityListSchema.safeParse(list).success).toBe(false);
  });
});

describe("opportunityDetailSchema", () => {
  it("adds the item page fields, with ISO dates", () => {
    const detail = {
      ...summary,
      description: "Earn rewards by supplying",
      depositUrl: null,
      startsAt: "2026-10-30T19:00:00.000Z",
      endsAt: null,
    };

    expect(opportunityDetailSchema.parse(detail)).toEqual(detail);
  });

  it("rejects a date that is not ISO", () => {
    const detail = {
      ...summary,
      description: "",
      depositUrl: null,
      startsAt: "1793300400",
      endsAt: null,
    };

    expect(opportunityDetailSchema.safeParse(detail).success).toBe(false);
  });
});

describe("opportunityHistorySchema", () => {
  it("accepts APR and TVL points as millisecond timestamps", () => {
    const history = {
      apr: [{ timestamp: 1_793_750_400_000, value: 2.79 }],
      tvl: [{ timestamp: 1_793_750_400_000, value: 431_703_044.28 }],
    };

    expect(opportunityHistorySchema.parse(history)).toEqual(history);
  });
});
