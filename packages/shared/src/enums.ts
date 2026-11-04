import { z } from "zod";

export const opportunityStatusSchema = z.enum(["LIVE", "PAST", "SOON"]);
export type OpportunityStatus = z.infer<typeof opportunityStatusSchema>;

export const opportunityActionSchema = z.enum([
  "POOL",
  "HOLD",
  "DROP",
  "LEND",
  "BORROW",
  "LONG",
  "SHORT",
  "SWAP",
  "STAKE",
  "INVALID",
]);
export type OpportunityAction = z.infer<typeof opportunityActionSchema>;

export const opportunitySortSchema = z.enum(["apr", "tvl", "rewards"]);
export type OpportunitySort = z.infer<typeof opportunitySortSchema>;

export const sortOrderSchema = z.enum(["asc", "desc"]);
export type SortOrder = z.infer<typeof sortOrderSchema>;
