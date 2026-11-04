import type { OpportunitiesQuery } from "@merkl/shared";

type Filters = Omit<OpportunitiesQuery, "sort" | "order" | "page" | "pageSize">;

const MERKL_FILTER_NAMES = {
  chain: "chainId",
  protocol: "mainProtocolId",
  action: "action",
  status: "status",
  minTvl: "minimumTvl",
  maxTvl: "maximumTvl",
  minApr: "minimumApr",
  search: "search",
} as const satisfies Record<keyof Filters, string>;

export function toMerklFilterParams(query: Filters): URLSearchParams {
  const params = new URLSearchParams();

  for (const [ours, theirs] of Object.entries(MERKL_FILTER_NAMES)) {
    const value = query[ours as keyof Filters];
    if (value === undefined) continue;
    params.set(theirs, Array.isArray(value) ? value.join(",") : String(value));
  }

  return params;
}

export function toMerklListParams(query: OpportunitiesQuery): URLSearchParams {
  const params = toMerklFilterParams(query);

  params.set("sort", query.sort);
  params.set("order", query.order);
  params.set("page", String(query.page - 1));
  params.set("items", String(query.pageSize));

  return params;
}
