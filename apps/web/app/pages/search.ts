import { opportunitiesQuerySchema, type OpportunitiesQuery } from "@merkl/shared";

const rawParams = (search: string) => {
  const params = new URLSearchParams(search);
  const raw: Record<string, string> = {};

  for (const key of params.keys()) {
    if (key in raw) continue;
    const values = params
      .getAll(key)
      .map((value) => value.trim())
      .filter(Boolean);
    if (values.length > 0) raw[key] = values.join(",");
  }

  return raw;
};

export const queryFromSearch = (search: string) =>
  opportunitiesQuerySchema.parse(rawParams(search));

export const pendingQuery = (search: string) => {
  const parsed = opportunitiesQuerySchema.safeParse(rawParams(search));
  return parsed.success ? parsed.data : null;
};

export const queryFromRequest = (request: Request) => queryFromSearch(new URL(request.url).search);

export const withFilter = (
  query: OpportunitiesQuery,
  patch: Partial<Record<keyof OpportunitiesQuery, unknown>>,
) => opportunitiesQuerySchema.parse({ ...query, ...patch, page: 1 });

export const withPage = (query: OpportunitiesQuery, page: number) =>
  opportunitiesQuerySchema.parse({ ...query, page });
