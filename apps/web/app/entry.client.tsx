import { CacheProvider } from "@emotion/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";

import { createEmotionCache } from "./lib/emotion";
import { getBrowserQueryClient } from "./lib/queryClient";

const cache = createEmotionCache();

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <CacheProvider value={cache}>
        <QueryClientProvider client={getBrowserQueryClient()}>
          <HydratedRouter />
          <ReactQueryDevtools buttonPosition="bottom-left" />
        </QueryClientProvider>
      </CacheProvider>
    </StrictMode>,
  );
});
