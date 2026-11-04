import type { OpportunitiesQuery } from "@merkl/shared";
import { serializeOpportunitiesQuery } from "@merkl/shared";
import { queryOptions } from "@tanstack/react-query";

import { api, type ApiClient } from "./client";

const MINUTE = 60_000;

export const LIST_STALE_MS = MINUTE;
export const HISTORY_STALE_MS = 5 * MINUTE;
export const FILTERS_STALE_MS = 60 * MINUTE;

const freshFor = (staleTime: number) => ({
  staleTime,
  gcTime: Math.max(staleTime, 5 * MINUTE),
});

export function createOpportunityQueries(client: ApiClient) {
  return {
    list(query: OpportunitiesQuery) {
      return queryOptions({
        queryKey: ["opportunities", "list", serializeOpportunitiesQuery(query)] as const,
        queryFn: () => client.list(query),
        ...freshFor(LIST_STALE_MS),
      });
    },

    detail(id: string) {
      return queryOptions({
        queryKey: ["opportunities", "detail", id] as const,
        queryFn: () => client.detail(id),
        ...freshFor(LIST_STALE_MS),
      });
    },

    history(id: string) {
      return queryOptions({
        queryKey: ["opportunities", "history", id] as const,
        queryFn: () => client.history(id),
        ...freshFor(HISTORY_STALE_MS),
      });
    },

    filters() {
      return queryOptions({
        queryKey: ["filters"] as const,
        queryFn: () => client.filters(),
        ...freshFor(FILTERS_STALE_MS),
      });
    },
  };
}

export const opportunityQueries = createOpportunityQueries(api);
