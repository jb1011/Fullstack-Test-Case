/** Lists and opportunity details. */
export const LIST_TTL_MS = 60_000;

/** APR and TVL history. */
export const HISTORY_TTL_MS = 5 * 60_000;

/** Chains and protocols for the filter dropdowns. */
export const FILTERS_TTL_MS = 60 * 60_000;

/** Distinct answers kept in memory. Past this, the least recently used entry is dropped. */
export const MAX_CACHE_ENTRIES = 500;
