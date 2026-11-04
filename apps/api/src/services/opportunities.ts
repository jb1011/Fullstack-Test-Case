import type {
  Filters,
  OpportunitiesQuery,
  OpportunityDetail,
  OpportunityHistory,
  OpportunityList,
} from "@merkl/shared";

import type { MerklClient } from "../merkl/client";
import { MerklError } from "../merkl/errors";
import {
  toFilters,
  toOpportunityDetail,
  toOpportunityHistory,
  toOpportunityList,
} from "../merkl/mappers";

export interface OpportunitiesService {
  list(query: OpportunitiesQuery): Promise<OpportunityList>;
  get(id: string): Promise<OpportunityDetail | null>;
  history(id: string): Promise<OpportunityHistory | null>;
  filters(): Promise<Filters>;
}

const missingAsNull = (error: unknown): null => {
  if (error instanceof MerklError && error.kind === "not_found") return null;
  throw error;
};

export const createOpportunitiesService = (merkl: MerklClient): OpportunitiesService => ({
  async list(query) {
    const [opportunities, total, totalTvl] = await Promise.all([
      merkl.listOpportunities(query),
      merkl.countOpportunities(query),
      merkl.getTotalTvl(query),
    ]);
    return toOpportunityList(opportunities, { total, totalTvl }, query);
  },

  get: (id) => merkl.getOpportunity(id).then(toOpportunityDetail).catch(missingAsNull),

  history: (id) =>
    Promise.all([merkl.getAprRecords(id), merkl.getTvlRecords(id)])
      .then(([apr, tvl]) => toOpportunityHistory(apr, tvl))
      .catch(missingAsNull),

  async filters() {
    const [chains, protocols] = await Promise.all([merkl.listChains(), merkl.listProtocols()]);
    return toFilters(chains, protocols);
  },
});
