import { z } from "zod";

export const merklTokenSchema = z.object({
  address: z.string(),
  chainId: z.number(),
  symbol: z.string(),
  name: z.string(),
  decimals: z.number(),
  icon: z.string(),
  price: z.number().nullish(),
});

export const merklChainSchema = z.object({
  id: z.number(),
  name: z.string(),
  icon: z.string(),
});

export const merklProtocolSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
});

export const merklOpportunitySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  identifier: z.string(),
  chainId: z.number(),
  chain: merklChainSchema,
  protocol: merklProtocolSchema.optional(),
  action: z.string(),
  status: z.string(),
  tvl: z.number(),
  apr: z.number(),
  dailyRewards: z.number(),
  depositUrl: z.string().optional(),
  tokens: z.array(merklTokenSchema),
  earliestCampaignStart: z.string().optional(),
  latestCampaignEnd: z.string().optional(),
});

export const merklAprRecordSchema = z.object({
  timestamp: z.string(),
  apr: z.number(),
});

export const merklTvlRecordSchema = z.object({
  timestamp: z.string(),
  total: z.number(),
});

export const merklAggregateSchema = z.object({
  sum: z.number().nullable(),
});

export type MerklToken = z.infer<typeof merklTokenSchema>;
export type MerklChain = z.infer<typeof merklChainSchema>;
export type MerklProtocol = z.infer<typeof merklProtocolSchema>;
export type MerklOpportunity = z.infer<typeof merklOpportunitySchema>;
export type MerklAprRecord = z.infer<typeof merklAprRecordSchema>;
export type MerklTvlRecord = z.infer<typeof merklTvlRecordSchema>;
