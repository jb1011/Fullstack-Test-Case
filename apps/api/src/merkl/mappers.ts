import type {
  ChainDto,
  Filters,
  HistoryPoint,
  OpportunitiesQuery,
  OpportunityDetail,
  OpportunityHistory,
  OpportunityList,
  OpportunitySummary,
  ProtocolDto,
  TokenDto,
} from "@merkl/shared";
import { opportunityActionSchema, opportunityStatusSchema } from "@merkl/shared";

import type {
  MerklAprRecord,
  MerklChain,
  MerklOpportunity,
  MerklProtocol,
  MerklToken,
  MerklTvlRecord,
} from "./schemas";

const blankToNull = (value: string | undefined) =>
  value === undefined || value === "" ? null : value;

const unixSecondsToMs = (value: string | undefined) =>
  value && /^\d+$/.test(value) ? Number(value) * 1000 : null;

const unixSecondsToIso = (value: string | undefined) => {
  const ms = unixSecondsToMs(value);
  return ms === null ? null : new Date(ms).toISOString();
};

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

export const toChainDto = (chain: MerklChain): ChainDto => ({
  id: chain.id,
  name: chain.name,
  icon: blankToNull(chain.icon),
});

export const toProtocolDto = (protocol: MerklProtocol): ProtocolDto => ({
  id: protocol.id,
  name: protocol.name,
  icon: blankToNull(protocol.icon),
});

export const toTokenDto = (token: MerklToken): TokenDto => ({
  address: token.address,
  symbol: token.symbol,
  icon: blankToNull(token.icon),
});

export const toOpportunitySummary = (opportunity: MerklOpportunity): OpportunitySummary | null => {
  const action = opportunityActionSchema.safeParse(opportunity.action);
  const status = opportunityStatusSchema.safeParse(opportunity.status);
  if (!action.success || !status.success) return null;

  return {
    id: opportunity.id,
    name: opportunity.name,
    chain: toChainDto(opportunity.chain),
    protocol: opportunity.protocol ? toProtocolDto(opportunity.protocol) : null,
    action: action.data,
    status: status.data,
    apr: opportunity.apr,
    tvl: opportunity.tvl,
    dailyRewards: opportunity.dailyRewards,
    tokens: opportunity.tokens.map(toTokenDto),
  };
};

export const toOpportunityDetail = (opportunity: MerklOpportunity): OpportunityDetail | null => {
  const summary = toOpportunitySummary(opportunity);
  if (!summary) return null;

  return {
    ...summary,
    description: opportunity.description,
    depositUrl: blankToNull(opportunity.depositUrl),
    startsAt: unixSecondsToIso(opportunity.earliestCampaignStart),
    endsAt: unixSecondsToIso(opportunity.latestCampaignEnd),
  };
};

export const toOpportunityList = (
  opportunities: MerklOpportunity[],
  totals: { total: number; totalTvl: number },
  query: Pick<OpportunitiesQuery, "page" | "pageSize">,
): OpportunityList => ({
  items: opportunities.map(toOpportunitySummary).filter((item) => item !== null),
  total: totals.total,
  totalTvl: totals.totalTvl,
  page: query.page,
  pageSize: query.pageSize,
});

const toHistoryPoints = <T extends { timestamp: string }>(
  records: T[],
  value: (record: T) => number,
): HistoryPoint[] =>
  records
    .flatMap((record) => {
      const timestamp = unixSecondsToMs(record.timestamp);
      return timestamp === null ? [] : [{ timestamp, value: value(record) }];
    })
    .sort((a, b) => a.timestamp - b.timestamp);

export const toOpportunityHistory = (
  aprRecords: MerklAprRecord[],
  tvlRecords: MerklTvlRecord[],
): OpportunityHistory => ({
  apr: toHistoryPoints(aprRecords, (record) => record.apr),
  tvl: toHistoryPoints(tvlRecords, (record) => record.total),
});

export const toFilters = (chains: MerklChain[], protocols: MerklProtocol[]): Filters => ({
  chains: chains.map(toChainDto).sort(byName),
  protocols: protocols.map(toProtocolDto).sort(byName),
  actions: opportunityActionSchema.options.filter((action) => action !== "INVALID"),
});
