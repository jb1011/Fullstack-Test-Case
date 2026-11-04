import {
  serializeOpportunitiesQuery,
  type Filters,
  type OpportunitiesQuery,
  type OpportunityDetail,
  type OpportunityHistory,
  type OpportunityList,
} from "@merkl/shared";

import { FILTERS_TTL_MS, HISTORY_TTL_MS, LIST_TTL_MS } from "../cache/lifetimes";
import type { CacheStore } from "../cache/store";
import type { OpportunitiesService } from "./opportunities";

const load = <T>(
  store: CacheStore,
  key: string,
  ttlMs: number,
  fetch: () => Promise<T>,
): Promise<T> => store.load(key, ttlMs, fetch) as Promise<T>;

export function createCachedOpportunitiesService(
  service: OpportunitiesService,
  store: CacheStore,
): OpportunitiesService {
  return {
    list: (query: OpportunitiesQuery): Promise<OpportunityList> =>
      load(store, `opportunities?${serializeOpportunitiesQuery(query)}`, LIST_TTL_MS, () =>
        service.list(query),
      ),

    get: (id: string): Promise<OpportunityDetail | null> =>
      load(store, `opportunities/${id}`, LIST_TTL_MS, () => service.get(id)),

    history: (id: string): Promise<OpportunityHistory | null> =>
      load(store, `opportunities/${id}/history`, HISTORY_TTL_MS, () => service.history(id)),

    filters: (): Promise<Filters> =>
      load(store, "filters", FILTERS_TTL_MS, () => service.filters()),
  };
}
