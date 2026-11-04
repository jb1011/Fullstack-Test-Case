import { ChakraProvider } from "@chakra-ui/react";
import { hydrate, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import { Suspense } from "react";
import { CacheProvider } from "@emotion/react";
import {
  createMemoryRouter,
  data,
  RouterContextProvider,
  RouterProvider,
  type ClientLoaderFunctionArgs,
} from "react-router";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { apiBaseUrl } from "../api/client";
import { detail, history } from "../api/fixture";
import { opportunityQueries } from "../api/queries";
import { createEmotionCache } from "../lib/emotion";
import { formatApr, formatTvl } from "../lib/format";
import {
  createQueryClient,
  dehydratedLoaderData,
  queryClientContext,
  queryClientMiddleware,
  requireQueryClient,
} from "../lib/queryClient";
import { system } from "../theme";
import Opportunity, { clientLoader, ErrorBoundary, loader } from "./opportunity";

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

const pageDetail = {
  ...detail,
  description: "Lend USDC",
  depositUrl: "https://app.merkl.xyz/opportunities/1",
};

const pageHistory = {
  apr: [
    { timestamp: 1_700_000_000_000, value: 4 },
    { timestamp: 1_700_086_400_000, value: 6 },
  ],
  tvl: [
    { timestamp: 1_700_000_000_000, value: 800 },
    { timestamp: 1_700_086_400_000, value: 1200 },
  ],
};

const requestArgs = (context: RouterContextProvider, id = "1") => {
  const href = `http://localhost/opportunities/${id}`;
  return {
    request: new Request(href),
    url: new URL(href),
    params: { id },
    pattern: "/opportunities/:id",
    context,
  };
};

const renderPage = (current = pageDetail, points = pageHistory) => {
  const client = createQueryClient();
  client.setQueryData(opportunityQueries.detail(current.id).queryKey, current);
  client.setQueryData(opportunityQueries.history(current.id).queryKey, points);
  const router = createMemoryRouter([{ path: "/opportunities/:id", Component: Opportunity }], {
    initialEntries: [`/opportunities/${current.id}`],
  });
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
};

describe("Opportunity", () => {
  it("renders the hero and the newest history first", () => {
    renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "Supply USDC" })).toBeTruthy();
    expect(screen.getByText("USDC")).toBeTruthy();
    expect(screen.getByText("Aave")).toBeTruthy();
    expect(screen.getByText("Ethereum")).toBeTruthy();
    expect(screen.getByText("Live")).toBeTruthy();
    expect(screen.getByText("LEND")).toBeTruthy();
    expect(screen.getByText("Lend USDC")).toBeTruthy();
    expect(screen.getByText(formatApr(pageDetail.apr))).toBeTruthy();
    expect(screen.getByText(formatTvl(pageDetail.tvl))).toBeTruthy();
    expect(screen.getByText(`${formatTvl(pageDetail.dailyRewards)} /day`)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Deposit" }).getAttribute("href")).toBe(
      pageDetail.depositUrl,
    );

    const cells = within(screen.getByRole("table", { name: "History" }))
      .getAllByRole("cell")
      .map((cell) => cell.textContent);
    expect(cells).toEqual([
      "Nov 15, 2023",
      formatApr(6),
      formatTvl(1200),
      "Nov 14, 2023",
      formatApr(4),
      formatTvl(800),
    ]);
  });

  it("shows the hero while history is still loading", async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = () => {
        resolve();
      };
    });
    server.use(
      http.get(`${apiBaseUrl}/opportunities/1/history`, async () => {
        await gate;
        return HttpResponse.json(history);
      }),
    );

    const client = createQueryClient();
    client.setQueryData(opportunityQueries.detail("1").queryKey, pageDetail);
    const router = createMemoryRouter([{ path: "/opportunities/:id", Component: Opportunity }], {
      initialEntries: ["/opportunities/1"],
    });

    render(
      <QueryClientProvider client={client}>
        <ChakraProvider value={system}>
          <Suspense fallback={null}>
            <RouterProvider router={router} />
          </Suspense>
        </ChakraProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByRole("heading", { name: "Supply USDC" })).toBeTruthy();
    expect(screen.getByRole("status", { name: "Loading history" })).toBeTruthy();

    await act(async () => {
      release();
      await gate;
    });

    expect(await screen.findByText("Nov 14, 2023")).toBeTruthy();
    expect(screen.queryByRole("status", { name: "Loading history" })).toBeNull();
  });

  it("shows the 404 boundary when the opportunity is missing", async () => {
    const router = createMemoryRouter(
      [
        {
          path: "/opportunities/:id",
          Component: Opportunity,
          ErrorBoundary,
          loader: () => {
            // eslint-disable-next-line @typescript-eslint/only-throw-error -- React Router route error
            throw data("No opportunity", { status: 404 });
          },
        },
      ],
      { initialEntries: ["/opportunities/404"] },
    );

    render(
      <ChakraProvider value={system}>
        <RouterProvider router={router} />
      </ChakraProvider>,
    );

    expect(await screen.findByRole("heading", { name: "Opportunity not found" })).toBeTruthy();
    expect(screen.getByText("No opportunity")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Opportunities" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });
});

describe("opportunity loaders", () => {
  it("returns before history finishes and does not retry a 404", async () => {
    let historyStarted = false;
    let detailHits = 0;
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = () => {
        resolve();
      };
    });
    server.use(
      http.get(`${apiBaseUrl}/opportunities/1`, () => {
        detailHits += 1;
        return HttpResponse.json(detail);
      }),
      http.get(`${apiBaseUrl}/opportunities/1/history`, async () => {
        historyStarted = true;
        await gate;
        return HttpResponse.json(history);
      }),
    );

    const context = new RouterContextProvider();
    await queryClientMiddleware(requestArgs(context), async () => {
      const client = requireQueryClient(context);
      await loader(requestArgs(context));
      expect(detailHits).toBe(1);
      await vi.waitFor(() => {
        expect(historyStarted).toBe(true);
      });
      expect(client.getQueryData(opportunityQueries.history("1").queryKey)).toBeUndefined();

      release();
      await client.query(opportunityQueries.history("1"));

      let missingHits = 0;
      server.use(
        http.get(`${apiBaseUrl}/opportunities/404`, () => {
          missingHits += 1;
          return HttpResponse.json(
            { title: "Not found", detail: "No opportunity" },
            { status: 404 },
          );
        }),
      );
      await expect(loader(requestArgs(context, "404"))).rejects.toMatchObject({
        data: "No opportunity",
        init: { status: 404 },
      });
      expect(missingHits).toBe(1);
      return new Response();
    });
  });

  it("reuses a fresh detail and history in the browser", async () => {
    let detailHits = 0;
    let historyHits = 0;
    server.use(
      http.get(`${apiBaseUrl}/opportunities/1`, () => {
        detailHits += 1;
        return HttpResponse.json(detail);
      }),
      http.get(`${apiBaseUrl}/opportunities/1/history`, () => {
        historyHits += 1;
        return HttpResponse.json(history);
      }),
    );

    const serverContext = new RouterContextProvider();
    await queryClientMiddleware(requestArgs(serverContext), async () => {
      const serverClient = requireQueryClient(serverContext);
      await loader(requestArgs(serverContext));
      await vi.waitFor(() => {
        expect(serverClient.getQueryData(opportunityQueries.history("1").queryKey)).toEqual(
          history,
        );
      });
      const dehydrated = dehydratedLoaderData(serverClient).dehydratedState;

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

    expect(detailHits).toBe(1);
    expect(historyHits).toBe(1);
  });

  it("rejects a route with no id", async () => {
    const context = new RouterContextProvider();
    const args = { ...requestArgs(context), params: {} };
    await expect(loader(args)).rejects.toMatchObject({
      data: "This opportunity does not exist.",
      init: { status: 404 },
    });
  });
});
