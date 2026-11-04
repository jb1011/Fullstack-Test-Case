import { ChakraProvider } from "@chakra-ui/react";
import type { OpportunityList } from "@merkl/shared";
import createEmotionServer from "@emotion/server/create-instance";
import { CacheProvider } from "@emotion/react";
import { hydrate, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
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
import { system } from "../theme";
import {
  createQueryClient,
  dehydratedLoaderData,
  queryClientContext,
  queryClientMiddleware,
  requireQueryClient,
} from "../lib/queryClient";
import Home, { clientLoader, ErrorBoundary, loader } from "./home";
import { queryFromSearch } from "./search";

globalThis.ResizeObserver = class {
  observe() {
    return undefined;
  }
  unobserve() {
    return undefined;
  }
  disconnect() {
    return undefined;
  }
};

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
        <ChakraProvider value={system}>
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
    fireEvent.click(screen.getByRole("button", { name: "Chains" }));
    const ethereum = await screen.findByRole<HTMLInputElement>("checkbox", { name: "Ethereum" });
    await act(async () => {
      ethereum.click();
      await Promise.resolve();
    });

    expect(router.state.location.search).toBe("?chain=1");
    expect(await screen.findByText("Supply ETH")).toBeTruthy();
  });

  it("selects a segment before the list arrives", async () => {
    let release = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const lendList = {
      ...list,
      items: [{ ...summary, id: "lend", name: "Lend only" }],
    };
    const client = seededClient();
    const router = createMemoryRouter(
      [
        {
          path: "/",
          Component: Home,
          loader: async ({ request }) => {
            if (new URL(request.url).search === "?action=LEND") {
              await gate;
              client.setQueryData(
                opportunityQueries.list(queryFromSearch("action=LEND")).queryKey,
                lendList,
              );
            }
            return null;
          },
        },
      ],
      { initialEntries: ["/"] },
    );
    const cache = createEmotionCache();

    render(
      <CacheProvider value={cache}>
        <QueryClientProvider client={client}>
          <ChakraProvider value={system}>
            <Suspense fallback={null}>
              <RouterProvider router={router} />
            </Suspense>
          </ChakraProvider>
        </QueryClientProvider>
      </CacheProvider>,
    );

    expect(await screen.findByRole("button", { name: "All" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Lend" }));

    expect(await screen.findByRole("status", { name: "Loading opportunities" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Lend" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByText("Supply USDC")).toBeNull();

    await act(async () => {
      release();
      await gate;
    });

    expect(await screen.findByText("Lend only")).toBeTruthy();
    expect(screen.queryByRole("status", { name: "Loading opportunities" })).toBeNull();
  });

  it("shows a cached list without skeletons", async () => {
    const waits: (() => void)[] = [];
    let started = false;
    const lendList = {
      ...list,
      items: [{ ...summary, id: "lend", name: "Lend only" }],
    };
    const client = seededClient("action=LEND", lendList);
    const router = createMemoryRouter(
      [
        {
          path: "/",
          Component: Home,
          loader: () => {
            if (!started) {
              started = true;
              return null;
            }
            return new Promise<null>((resolve) => {
              waits.push(() => {
                resolve(null);
              });
            });
          },
        },
      ],
      { initialEntries: ["/"] },
    );
    const cache = createEmotionCache();

    render(
      <CacheProvider value={cache}>
        <QueryClientProvider client={client}>
          <ChakraProvider value={system}>
            <Suspense fallback={null}>
              <RouterProvider router={router} />
            </Suspense>
          </ChakraProvider>
        </QueryClientProvider>
      </CacheProvider>,
    );

    expect(await screen.findByText("Supply USDC")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Lend" }));

    expect(await screen.findByText("Lend only")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Lend" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByRole("status", { name: "Loading opportunities" })).toBeNull();
    expect(screen.queryByText("Supply USDC")).toBeNull();

    await act(async () => {
      waits.shift()?.();
      await Promise.resolve();
    });

    fireEvent.click(screen.getByRole("button", { name: "All" }));

    expect(await screen.findByText("Supply USDC")).toBeTruthy();
    expect(screen.getByRole("button", { name: "All" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByRole("status", { name: "Loading opportunities" })).toBeNull();
    expect(screen.queryByText("Lend only")).toBeNull();
  });

  it("clears every filter", () => {
    const { tree, router } = shell("/?chain=1&search=usdc&page=2");
    render(tree);

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));

    expect(router.state.location.search).toBe("");
    expect(screen.queryByRole("button", { name: "Reset" })).toBeNull();
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

    expect(screen.getByText("Total value locked")).toBeTruthy();
    expect(screen.getByText("$2.0M")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Prev" }).hasAttribute("disabled")).toBe(true);

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
      <ChakraProvider value={system}>
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
