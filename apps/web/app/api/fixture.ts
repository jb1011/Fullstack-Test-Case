import type {
  Filters,
  OpportunityDetail,
  OpportunityList,
  OpportunitySummary,
} from "@merkl/shared";

export const summary: OpportunitySummary = {
  id: "1",
  name: "Supply USDC",
  chain: { id: 1, name: "Ethereum", icon: null },
  protocol: { id: "aave", name: "Aave", icon: null },
  action: "LEND",
  status: "LIVE",
  apr: 5,
  tvl: 1000,
  dailyRewards: 10,
  tokens: [{ address: "0x1", symbol: "USDC", icon: null }],
};

export const list: OpportunityList = {
  items: [summary],
  total: 1,
  totalTvl: 1000,
  page: 1,
  pageSize: 20,
};

export const detail: OpportunityDetail = {
  ...summary,
  description: "Lend USDC",
  depositUrl: null,
  startsAt: null,
  endsAt: null,
};

export const history = {
  apr: [{ timestamp: 1_700_000_000_000, value: 4 }],
  tvl: [{ timestamp: 1_700_000_000_000, value: 1000 }],
};

export const filters: Filters = {
  chains: [summary.chain],
  protocols: summary.protocol ? [summary.protocol] : [],
  actions: ["LEND"],
};
