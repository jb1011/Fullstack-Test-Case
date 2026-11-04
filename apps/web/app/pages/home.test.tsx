import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import createEmotionServer from "@emotion/server/create-instance";
import { CacheProvider } from "@emotion/react";
import { hydrate, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { cleanup, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { RouterContextProvider, type ClientLoaderFunctionArgs } from "react-router";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { apiBaseUrl } from "../api/client";
import { list } from "../api/fixture";
import { opportunityQueries } from "../api/queries";
import { createEmotionCache } from "../lib/emotion";
import {
  createQueryClient,
  dehydratedLoaderData,
  queryClientContext,
  queryClientMiddleware,
  requireQueryClient,
} from "../lib/queryClient";
import Home, { clientLoader, firstPage, loader } from "./home";

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledFrame: "error" });
});
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => {
  server.close();
});

const requestArgs = (context: RouterContextProvider) => ({
  request: new Request("http://localhost/"),
  url: new URL("http://localhost/"),
  params: {},
  pattern: "/",
  context,
});

const seededClient = () => {
  const client = createQueryClient();
  client.setQueryData(opportunityQueries.list(firstPage).queryKey, list);
  return client;
};

const shell = (client = seededClient()) => {
  const cache = createEmotionCache();
  const tree = (
    <CacheProvider value={cache}>
      <QueryClientProvider client={client}>
        <ChakraProvider value={defaultSystem}>
          <Home />
        </ChakraProvider>
      </QueryClientProvider>
    </CacheProvider>
  );
  return { cache, tree, client };
};

describe("Home", () => {
  it("renders the page title", () => {
    render(shell().tree);
    expect(screen.getByRole("heading", { level: 1, name: "Opportunities" })).toBeTruthy();
  });

  it("renders the first page from the cache", () => {
    render(shell().tree);

    const row = screen.getByRole("listitem");
    expect(row.textContent).toContain("Supply USDC");
    expect(row.textContent).toContain("Ethereum");
    expect(row.textContent).toContain("Aave");
    expect(row.textContent).toContain("USDC");
  });

  it("includes Chakra styles in the server HTML", () => {
    const { cache, tree } = shell();
    const html = renderToString(tree);
    const styles = createEmotionServer(cache).extractCriticalToChunks(html);

    expect(html).toContain("Opportunities");
    expect(styles.styles.length).toBeGreaterThan(0);
  });
});

describe("list loaders", () => {
  it("fetches the default list once and reuses it in the browser", async () => {
    let hits = 0;
    let search = "";
    server.use(
      http.get(`${apiBaseUrl}/opportunities`, ({ request }) => {
        hits += 1;
        search = new URL(request.url).search;
        return HttpResponse.json(list);
      }),
    );

    const serverContext = new RouterContextProvider();
    await queryClientMiddleware(requestArgs(serverContext), async () => {
      await loader(requestArgs(serverContext));
      const dehydrated = dehydratedLoaderData(requireQueryClient(serverContext)).dehydratedState;
      expect(dehydrated.queries.map((query) => query.queryKey)).toEqual([
        ["opportunities", "list", ""],
      ]);

      const browserContext = new RouterContextProvider();
      const browserClient = createQueryClient();
      browserContext.set(queryClientContext, browserClient);
      hydrate(browserClient, dehydrated);

      const clientArgs: ClientLoaderFunctionArgs = {
        ...requestArgs(browserContext),
        serverLoader: () => Promise.reject(new Error("The client loader called the server")),
      };
      await clientLoader(clientArgs);
      return new Response();
    });

    expect(hits).toBe(1);
    expect(search).toBe("");
  });
});
