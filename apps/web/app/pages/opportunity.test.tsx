import { ChakraProvider } from "@chakra-ui/react";
import { hydrate, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
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
import { formatAprNumber, formatEndsIn, formatTvl } from "../lib/format";
import {
  createQueryClient,
  dehydratedLoaderData,
  queryClientContext,
  queryClientMiddleware,
  requireQueryClient,
} from "../lib/queryClient";
import { system } from "../theme";
import Opportunity, { clientLoader, ErrorBoundary, loader } from "./opportunity";

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

const pageDetail = {
  ...detail,
  description: "Lend USDC",
  depositUrl: "https://app.merkl.xyz/opportunities/1",
  endsAt: "2099-01-01T00:00:00.000Z",
};

const day = 86_400_000;
const latest = 1_700_086_400_000;

const pageHistory = {
  apr: [
    { timestamp: latest - 40 * day, value: 1 },
    { timestamp: latest - 20 * day, value: 3 },
    { timestamp: latest - day, value: 4 },
    { timestamp: latest, value: 6 },
  ],
  tvl: [
    { timestamp: latest - 40 * day, value: 100 },
    { timestamp: latest - 20 * day, value: 400 },
    { timestamp: latest - day, value: 800 },
    { timestamp: latest, value: 1200 },
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
  it("renders the hero and charts the recent APR", () => {
    renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "Supply USDC" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "← Opportunities" }).getAttribute("href")).toBe("/");
    expect(screen.getAllByText("USDC").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Aave").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Ethereum").length).toBeGreaterThan(0);
    expect(screen.getByText("Live")).toBeTruthy();
    expect(screen.getByText("Lend")).toBeTruthy();
    expect(screen.getByText("Lend USDC")).toBeTruthy();
    expect(screen.getByText("Current APR")).toBeTruthy();
    expect(screen.getByText(formatAprNumber(pageDetail.apr))).toBeTruthy();
    expect(screen.getByText(formatTvl(pageDetail.tvl))).toBeTruthy();
    expect(screen.getByText(formatTvl(pageDetail.dailyRewards))).toBeTruthy();
    expect(screen.getByText("Ends in")).toBeTruthy();
    expect(screen.getByText(formatEndsIn(pageDetail.endsAt, Date.now()) ?? "")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Deposit on Aave" }).getAttribute("href")).toBe(
      pageDetail.depositUrl,
    );
    expect(screen.getByText("▲ 2 pts today")).toBeTruthy();
    expect(screen.getByRole("button", { name: "APR" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "7D" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("img", { name: "APR history, 2 points" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "30D" }));
    expect(screen.getByRole("img", { name: "APR history, 3 points" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "All" }));
    fireEvent.click(screen.getByRole("button", { name: "TVL" }));
    expect(screen.getByRole("img", { name: "TVL history, 4 points" })).toBeTruthy();
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

    expect(await screen.findByRole("img", { name: "APR history, 1 point" })).toBeTruthy();
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
