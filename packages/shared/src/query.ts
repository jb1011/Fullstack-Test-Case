import { z } from "zod";

import {
  opportunityActionSchema,
  opportunitySortSchema,
  opportunityStatusSchema,
  sortOrderSchema,
} from "./enums";

export const MAX_PAGE_SIZE = 100;

const blankToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value);

const splitList = (value: unknown) => {
  const raw = Array.isArray(value) ? value.join(",") : value;
  if (typeof raw !== "string") return raw;
  const parts = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : undefined;
};

const compare = <T extends string | number>(a: T, b: T) => (a < b ? -1 : a > b ? 1 : 0);

const list = <T extends z.ZodType<string | number>>(item: T) =>
  z
    .preprocess(splitList, z.array(item).optional())
    .transform((values) => (values ? [...new Set(values)].sort(compare) : undefined));

const optionalNumber = z.preprocess(blankToUndefined, z.coerce.number().nonnegative().optional());

export const opportunitiesQuerySchema = z
  .object({
    chain: list(z.coerce.number().int().positive()),
    protocol: list(z.string().toLowerCase()),
    action: list(opportunityActionSchema),
    status: list(opportunityStatusSchema).default(["LIVE"]),
    minTvl: optionalNumber,
    maxTvl: optionalNumber,
    minApr: optionalNumber,
    search: z.preprocess(
      (value) => (typeof value === "string" ? blankToUndefined(value.trim()) : value),
      z.string().max(100).optional(),
    ),
    sort: z.preprocess(blankToUndefined, opportunitySortSchema.default("tvl")),
    order: z.preprocess(blankToUndefined, sortOrderSchema.default("desc")),
    page: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).default(1)),
    pageSize: z.preprocess(
      blankToUndefined,
      z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(20),
    ),
  })
  .refine(
    ({ minTvl, maxTvl }) => minTvl === undefined || maxTvl === undefined || minTvl <= maxTvl,
    { path: ["maxTvl"], message: "maxTvl must be greater than or equal to minTvl" },
  );

export type OpportunitiesQueryInput = z.input<typeof opportunitiesQuerySchema>;
export type OpportunitiesQuery = z.output<typeof opportunitiesQuerySchema>;

const DEFAULT_QUERY = opportunitiesQuerySchema.parse({});

const toParam = (value: OpportunitiesQuery[keyof OpportunitiesQuery]) =>
  Array.isArray(value) ? value.join(",") : value?.toString();

export function serializeOpportunitiesQuery(query: OpportunitiesQuery): string {
  const params = new URLSearchParams();
  const keys = (Object.keys(query) as (keyof OpportunitiesQuery)[]).sort();

  for (const key of keys) {
    const value = toParam(query[key]);
    if (value === undefined || value === toParam(DEFAULT_QUERY[key])) continue;
    params.set(key, value);
  }

  return params.toString();
}
