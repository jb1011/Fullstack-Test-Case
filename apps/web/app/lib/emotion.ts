import createCache from "@emotion/cache";

/** Same key on the server and in the browser, so hydration reuses the style tags. */
export const createEmotionCache = () => createCache({ key: "css" });
