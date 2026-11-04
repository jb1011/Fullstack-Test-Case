import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import type { OpportunityList } from "@merkl/shared";
import createEmotionServer from "@emotion/server/create-instance";
import { CacheProvider } from "@emotion/react";
import { hydrate, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Suspense } from "react";
import { renderToString } from "react-dom/server";
import {
  createMemoryRouter,
  data,
  RouterContextProvider,
  RouterProvider,
  type ClientLoaderFunctionArgs,
} from "react-router";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { apiBaseUrl } from "../api/client";
import { filters, list, summary } from "../api/fixture";
import { opportunityQueries } from "../api/queries";
import { createEmotionCache } from "../lib/emotion";
import {
  createQueryClient,
  dehydratedLoaderData,
  queryClientContext,
  queryClientMiddleware,
  requireQueryClient,
} from "../lib/queryClient";
import Home, { clientLoader, ErrorBoundary, loader } from "./home";
import { queryFromSearch } from "./search";

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

const requestArgs = (context: RouterContextProvider, href = "http://localhost/") => ({
  request: new Request(href),
  url: new URL(href),
  params: {},
  pattern: "/",
  context,
});

const seededClient = (search = "", current: OpportunityList = list) => {
  const client = createQueryClient();
  client.setQueryData(opportunityQueries.list(queryFromSearch("")).queryKey, list);
  client.setQueryData(opportunityQueries.list(queryFromSearch(search)).queryKey, current);
  client.setQueryData(opportunityQueries.filters().queryKey, filters);
  return client;
};

const shell = (path = "/", current: OpportunityList = list) => {
  const search = path.includes("?") ? path.slice(path.indexOf("?")) : "";
  const client = seededClient(search, current);
  const router = createMemoryRouter([{ path: "/", Component: Home }], { initialEntries: [path] });
  const cache = createEmotionCache();
  const tree = (
    <CacheProvider value={cache}>
      <QueryClientProvider client={client}>
        <ChakraProvider value={defaultSystem}>
          <Suspense fallback={null}>
            <RouterProvider router={router} />
          </Suspense>
        </ChakraProvider>
      </QueryClientProvider>
    </CacheProvider>
  );
  return { cache, tree, client, router };
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

  it("writes a chain filter into the URL and loads that list", async () => {
    const filtered = {
      ...list,
      items: [{ ...list.items[0], name: "Supply ETH" }],
    };
    server.use(
      http.get(`${apiBaseUrl}/opportunities`, ({ request }) => {
        const search = new URL(request.url).search;
        return HttpResponse.json(search === "?chain=1" ? filtered : list);
      }),
    );

    const { tree, router } = shell("/?page=2");
    render(tree);
    fireEvent.change(screen.getByLabelText("Chain"), { target: { value: "1" } });

    expect(router.state.location.search).toBe("?chain=1");
    expect(await screen.findByText("Supply ETH")).toBeTruthy();
  });

  it("clears every filter", () => {
    const { tree, router } = shell("/?chain=1&search=usdc&page=2");
    render(tree);

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));

    expect(router.state.location.search).toBe("");
    expect(screen.getByLabelText<HTMLSelectElement>("Chain").value).toBe("");
    expect(screen.getByLabelText<HTMLInputElement>("Search").value).toBe("");
  });

  it("shows the filtered total and opens the next page", async () => {
    const first = { ...list, total: 40, totalTvl: 2_000_000 };
    const second = {
      ...first,
      page: 2,
      items: [{ ...summary, id: "2", name: "Page two" }],
    };
    server.use(
      http.get(`${apiBaseUrl}/opportunities`, ({ request }) => {
        const search = new URL(request.url).search;
        return HttpResponse.json(search === "?chain=1&page=2" ? second : first);
      }),
    );

    const { tree, router } = shell("/?chain=1", first);
    render(tree);

    expect(screen.getByText("Total TVL $2.0M")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Previous" }).hasAttribute("disabled")).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(router.state.location.search).toBe("?chain=1&page=2");
    expect(await screen.findByText("Page two")).toBeTruthy();
  });

  it("says when nothing matches and hides the pages", () => {
    const empty = { ...list, items: [], total: 0, totalTvl: 0 };
    render(shell("/", empty).tree);

    expect(screen.getByRole("status").textContent).toBe("No opportunities match these filters.");
    expect(screen.queryByRole("listitem")).toBeNull();
    expect(screen.queryByRole("navigation", { name: "Pagination" })).toBeNull();
    expect(screen.getByLabelText("Search")).toBeTruthy();
  });

  it("says when the requested page is empty", () => {
    const past = { ...list, items: [], total: 40, totalTvl: 1000, page: 3 };
    render(shell("/?page=3", past).tree);

    expect(screen.getByRole("status").textContent).toBe("No opportunities on this page.");
    expect(screen.getByRole("navigation", { name: "Pagination" })).toBeTruthy();
  });

  it("shows the error boundary when the loader fails", async () => {
    const router = createMemoryRouter(
      [
        {
          path: "/",
          Component: Home,
          ErrorBoundary,
          loader: () => {
            // eslint-disable-next-line @typescript-eslint/only-throw-error -- React Router route error
            throw data("Merkl returned an unexpected response", { status: 502 });
          },
        },
      ],
      { initialEntries: ["/"] },
    );

    render(
      <ChakraProvider value={defaultSystem}>
        <RouterProvider router={router} />
      </ChakraProvider>,
    );

    expect(await screen.findByRole("heading", { name: "Something went wrong" })).toBeTruthy();
    expect(screen.getByText("Merkl returned an unexpected response")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
  });

  it("turns an invalid address into a readable error", async () => {
    const href = "http://localhost/?minTvl=10&maxTvl=1";
    const context = new RouterContextProvider();
    await queryClientMiddleware(requestArgs(context, href), async () => {
      try {
        await loader(requestArgs(context, href));
        throw new Error("The loader should have failed");
      } catch (error) {
        expect(error).toMatchObject({
          data: "These filters are not valid.",
          init: { status: 400 },
        });
      }
      return new Response();
    });
  });
});

describe("list loaders", () => {
  it("fetches the URL query once and reuses it in the browser", async () => {
    let hits = 0;
    let search = "";
    let filterHits = 0;
    server.use(
      http.get(`${apiBaseUrl}/opportunities`, ({ request }) => {
        hits += 1;
        search = new URL(request.url).search;
        return HttpResponse.json(list);
      }),
      http.get(`${apiBaseUrl}/filters`, () => {
        filterHits += 1;
        return HttpResponse.json(filters);
      }),
    );

    const href = "http://localhost/?page=2&chain=1";
    const serverContext = new RouterContextProvider();
    await queryClientMiddleware(requestArgs(serverContext, href), async () => {
      await loader(requestArgs(serverContext, href));
      const dehydrated = dehydratedLoaderData(requireQueryClient(serverContext)).dehydratedState;
      expect(dehydrated.queries.map((query) => query.queryKey)).toEqual([
        ["opportunities", "list", "chain=1&page=2"],
        ["filters"],
      ]);

      const browserContext = new RouterContextProvider();
      const browserClient = createQueryClient();
      browserContext.set(queryClientContext, browserClient);
      hydrate(browserClient, dehydrated);

      const clientArgs: ClientLoaderFunctionArgs = {
        ...requestArgs(browserContext, href),
        serverLoader: () => Promise.reject(new Error("The client loader called the server")),
      };
      await clientLoader(clientArgs);
      return new Response();
    });

    expect(hits).toBe(1);
    expect(filterHits).toBe(1);
    expect(search).toBe("?chain=1&page=2");
  });
});
