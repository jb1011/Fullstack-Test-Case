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

export type MerklToken = z.infer<typeof merklTokenSchema>;
export type MerklOpportunity = z.infer<typeof merklOpportunitySchema>;
