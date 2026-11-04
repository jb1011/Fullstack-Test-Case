import { z } from "zod";

import type { OpportunityAction, OpportunityStatus } from "./enums";
import { opportunityActionSchema, opportunityStatusSchema } from "./enums";

export interface ChainDto {
  id: number;
  name: string;
  icon: string | null;
}

export interface ProtocolDto {
  id: string;
  name: string;
  icon: string | null;
}

export interface TokenDto {
  address: string;
  symbol: string;
  icon: string | null;
}

export interface OpportunitySummary {
  id: string;
  name: string;
  chain: ChainDto;
  protocol: ProtocolDto | null;
  action: OpportunityAction;
  status: OpportunityStatus;
  apr: number;
  tvl: number;
  dailyRewards: number;
  tokens: TokenDto[];
}

export interface OpportunityDetail extends OpportunitySummary {
  description: string;
  depositUrl: string | null;
  startsAt: string | null;
  endsAt: string | null;
}

export interface OpportunityList {
  items: OpportunitySummary[];
  total: number;
  totalTvl: number;
  page: number;
  pageSize: number;
}

export interface HistoryPoint {
  timestamp: number;
  value: number;
}

export interface OpportunityHistory {
  apr: HistoryPoint[];
  tvl: HistoryPoint[];
}

export interface Filters {
  chains: ChainDto[];
  protocols: ProtocolDto[];
  actions: OpportunityAction[];
}

export const chainDtoSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  icon: z.string().nullable(),
}) satisfies z.ZodType<ChainDto>;

export const protocolDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().nullable(),
}) satisfies z.ZodType<ProtocolDto>;

export const tokenDtoSchema = z.object({
  address: z.string(),
  symbol: z.string(),
  icon: z.string().nullable(),
}) satisfies z.ZodType<TokenDto>;

export const opportunitySummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  chain: chainDtoSchema,
  protocol: protocolDtoSchema.nullable(),
  action: opportunityActionSchema,
  status: opportunityStatusSchema,
  apr: z.number(),
  tvl: z.number(),
  dailyRewards: z.number(),
  tokens: z.array(tokenDtoSchema),
}) satisfies z.ZodType<OpportunitySummary>;

export const opportunityDetailSchema = opportunitySummarySchema.extend({
  description: z.string(),
  depositUrl: z.string().nullable(),
  startsAt: z.iso.datetime().nullable(),
  endsAt: z.iso.datetime().nullable(),
}) satisfies z.ZodType<OpportunityDetail>;

export const opportunityListSchema = z.object({
  items: z.array(opportunitySummarySchema),
  total: z.number().int().nonnegative(),
  totalTvl: z.number().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
}) satisfies z.ZodType<OpportunityList>;

export const historyPointSchema = z.object({
  timestamp: z.number().int(),
  value: z.number(),
}) satisfies z.ZodType<HistoryPoint>;

export const opportunityHistorySchema = z.object({
  apr: z.array(historyPointSchema),
  tvl: z.array(historyPointSchema),
}) satisfies z.ZodType<OpportunityHistory>;

export const filtersSchema = z.object({
  chains: z.array(chainDtoSchema),
  protocols: z.array(protocolDtoSchema),
  actions: z.array(opportunityActionSchema),
}) satisfies z.ZodType<Filters>;
