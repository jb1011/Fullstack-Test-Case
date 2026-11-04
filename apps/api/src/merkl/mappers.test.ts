import {
  filtersSchema,
  opportunityDetailSchema,
  opportunityHistorySchema,
  opportunityListSchema,
} from "@merkl/shared";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import aprRecordsFixture from "./__fixtures__/apr-records.json";
import chainsFixture from "./__fixtures__/chains.json";
import opportunityFixture from "./__fixtures__/opportunity.json";
import opportunitiesFixture from "./__fixtures__/opportunities.json";
import protocolsFixture from "./__fixtures__/protocols.json";
import tvlRecordsFixture from "./__fixtures__/tvl-records.json";
import {
  toFilters,
  toOpportunityDetail,
  toOpportunityHistory,
  toOpportunityList,
  toOpportunitySummary,
} from "./mappers";
import {
  merklAprRecordSchema,
  merklChainSchema,
  merklOpportunitySchema,
  merklProtocolSchema,
  merklTvlRecordSchema,
} from "./schemas";

const opportunities = z.array(merklOpportunitySchema).parse(opportunitiesFixture);
const opportunity = merklOpportunitySchema.parse(opportunityFixture);
const aprRecords = z.array(merklAprRecordSchema).parse(aprRecordsFixture);
const tvlRecords = z.array(merklTvlRecordSchema).parse(tvlRecordsFixture);
const chains = z.array(merklChainSchema).parse(chainsFixture);
const protocols = z.array(merklProtocolSchema).parse(protocolsFixture);

const [morpho, withoutProtocol] = opportunities;
if (!morpho || !withoutProtocol) throw new Error("fixture needs two opportunities");

describe("toOpportunitySummary", () => {
  it("keeps the fields the list shows", () => {
    expect(toOpportunitySummary(morpho)).toMatchObject({
      id: "2433802672589613459",
      chain: { id: 1, name: "Ethereum" },
      protocol: { id: "morpho" },
      action: "LEND",
      status: "LIVE",
      apr: morpho.apr,
      tvl: morpho.tvl,
      dailyRewards: morpho.dailyRewards,
    });
  });

  it("turns empty icons into null", () => {
    expect(toOpportunitySummary(morpho)?.tokens[0]?.icon).toBeNull();
  });

  it("turns a missing protocol into null", () => {
    expect(toOpportunitySummary(withoutProtocol)?.protocol).toBeNull();
  });

  it("returns null for an action or status this app doesn't know", () => {
    expect(toOpportunitySummary({ ...morpho, action: "TELEPORT" })).toBeNull();
    expect(toOpportunitySummary({ ...morpho, status: "ENDED" })).toBeNull();
  });
});

describe("toOpportunityDetail", () => {
  it("converts campaign dates from unix seconds to ISO", () => {
    const detail = toOpportunityDetail(opportunity);

    expect(detail?.startsAt).toBe("2026-10-29T19:00:00.000Z");
    expect(detail?.endsAt).toBe("2026-11-05T19:00:00.000Z");
    expect(opportunityDetailSchema.parse(detail)).toEqual(detail);
  });

  it("turns missing or malformed values into null", () => {
    const detail = toOpportunityDetail({
      ...opportunity,
      depositUrl: undefined,
      earliestCampaignStart: undefined,
      latestCampaignEnd: "soon",
    });

    expect(detail).toMatchObject({ depositUrl: null, startsAt: null, endsAt: null });
  });
});

describe("toOpportunityList", () => {
  it("builds a valid list response", () => {
    const list = toOpportunityList(
      opportunities,
      { total: 618, totalTvl: 2.8e9 },
      { page: 2, pageSize: 20 },
    );

    expect(list.items).toHaveLength(2);
    expect(list).toMatchObject({ total: 618, totalTvl: 2.8e9, page: 2, pageSize: 20 });
    expect(opportunityListSchema.parse(list)).toEqual(list);
  });

  it("skips opportunities it can't map instead of failing the page", () => {
    const list = toOpportunityList(
      [morpho, { ...withoutProtocol, action: "TELEPORT" }],
      { total: 2, totalTvl: 0 },
      { page: 1, pageSize: 20 },
    );

    expect(list.items.map((item) => item.id)).toEqual([morpho.id]);
  });
});

describe("toOpportunityHistory", () => {
  it("returns points oldest first with millisecond timestamps", () => {
    const history = toOpportunityHistory(aprRecords, tvlRecords);
    const timestamps = history.apr.map((point) => point.timestamp);

    expect(timestamps).toEqual([...timestamps].sort((a, b) => a - b));
    expect(history.apr.at(-1)).toEqual({ timestamp: 1793750400000, value: aprRecords[0]?.apr });
    expect(history.tvl).toHaveLength(tvlRecords.length);
    expect(opportunityHistorySchema.parse(history)).toEqual(history);
  });

  it("drops records with a malformed timestamp", () => {
    const history = toOpportunityHistory([{ timestamp: "", apr: 1 }], []);

    expect(history.apr).toEqual([]);
  });
});

describe("toFilters", () => {
  it("sorts chains and protocols by name and hides the INVALID action", () => {
    const filters = toFilters(chains, protocols);

    expect(filters.chains.map((chain) => chain.name)).toEqual(
      chains.map((chain) => chain.name).sort((a, b) => a.localeCompare(b)),
    );
    expect(filters.protocols.map((protocol) => protocol.id)).toEqual([
      "1inch",
      "40acres",
      "9summits",
    ]);
    expect(filters.actions).not.toContain("INVALID");
    expect(filtersSchema.parse(filters)).toEqual(filters);
  });
});
