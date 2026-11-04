export const NO_STORE = "no-store";

export const publicCache = (ttlMs: number) => `public, max-age=${String(ttlMs / 1000)}`;
