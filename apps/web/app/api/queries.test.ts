import { opportunitiesQuerySchema } from "@merkl/shared";
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import type { ApiClient } from "./client";
import { detail, filters, history, list } from "./fixture";
import {
  createOpportunityQueries,
  FILTERS_STALE_MS,
  HISTORY_STALE_MS,
  LIST_STALE_MS,
} from "./queries";

const calls: string[] = [];

const client = {
  list: (query) => {
    calls.push(`list:${String(query.page)}`);
    return Promise.resolve(list);
  },
  detail: (id) => {
    calls.push(`detail:${id}`);
    return Promise.resolve(detail);
  },
  history: (id) => {
    calls.push(`history:${id}`);
    return Promise.resolve(history);
  },
  filters: () => {
    calls.push("filters");
    return Promise.resolve(filters);
  },
} satisfies ApiClient;

const queries = createOpportunityQueries(client);

describe("opportunity queries", () => {
  it("gives equivalent filters the same key and keeps each lifetime", () => {
    const first = queries.list(opportunitiesQuerySchema.parse({ chain: "8453,1", status: "PAST" }));
    const same = queries.list(opportunitiesQuerySchema.parse({ status: "PAST", chain: "1,8453" }));
    const other = queries.list(opportunitiesQuerySchema.parse({ chain: "1", page: "2" }));

    expect(first.queryKey).toEqual(same.queryKey);
    expect(other.queryKey).not.toEqual(first.queryKey);
    expect(first.staleTime).toBe(LIST_STALE_MS);
    expect(queries.detail("1").staleTime).toBe(LIST_STALE_MS);
    expect(queries.history("1").staleTime).toBe(HISTORY_STALE_MS);
    expect(queries.filters().staleTime).toBe(FILTERS_STALE_MS);
    expect(queries.filters().gcTime).toBe(FILTERS_STALE_MS);
  });

  it("calls the matching client method", async () => {
    calls.length = 0;
    const queryClient = new QueryClient();
    const query = opportunitiesQuerySchema.parse({ page: "3" });

    await queryClient.query(queries.list(query));
    await queryClient.query(queries.detail("9"));
    await queryClient.query(queries.history("9"));
    await queryClient.query(queries.filters());

    expect(calls).toEqual(["list:3", "detail:9", "history:9", "filters"]);
  });
});
