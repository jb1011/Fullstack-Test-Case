import { HydrationBoundary, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { RouterContextProvider } from "react-router";
import { describe, expect, it } from "vitest";

import { filters } from "./api/fixture";
import { opportunityQueries } from "./api/queries";
import {
  createQueryClient,
  dehydratedLoaderData,
  getBrowserQueryClient,
  queryClientClientMiddleware,
  queryClientContext,
  queryClientMiddleware,
  requireQueryClient,
} from "./queryClient";

const requestArgs = (context: RouterContextProvider) => ({
  request: new Request("http://localhost/"),
  url: new URL("http://localhost/"),
  params: {},
  pattern: "/",
  context,
});

const pending = <T,>() => {
  const box: { resolve?: (value: T) => void } = {};
  const promise = new Promise<T>((resolve) => {
    box.resolve = resolve;
  });
  const resolve = box.resolve;
  if (!resolve) throw new Error("Promise executor did not run");
  return { promise, resolve };
};

describe("query client", () => {
  it("gives each request its own client", async () => {
    const first = new RouterContextProvider();
    const second = new RouterContextProvider();

    await queryClientMiddleware(requestArgs(first), () => Promise.resolve(new Response()));
    await queryClientMiddleware(requestArgs(second), () => Promise.resolve(new Response()));

    expect(first.get(queryClientContext)).not.toBe(second.get(queryClientContext));
  });

  it("refuses a request that has no client", () => {
    const context = new RouterContextProvider();
    expect(context.get(queryClientContext)).toBeNull();
    expect(() => requireQueryClient(context)).toThrow(/missing/);
  });

  it("keeps one client for the browser session", async () => {
    const first = new RouterContextProvider();
    const second = new RouterContextProvider();

    await queryClientClientMiddleware(requestArgs(first), () => Promise.resolve());
    await queryClientClientMiddleware(requestArgs(second), () => Promise.resolve());

    expect(first.get(queryClientContext)).toBe(second.get(queryClientContext));
    expect(first.get(queryClientContext)).toBe(getBrowserQueryClient());
  });

  it("includes a query that finishes after the loader data is created", async () => {
    const context = new RouterContextProvider();
    await queryClientMiddleware(requestArgs(context), async () => {
      const queryClient = requireQueryClient(context);
      const gate = pending<typeof filters>();
      const loading = queryClient.query({
        ...opportunityQueries.filters(),
        queryFn: () => gate.promise,
      });
      const data = dehydratedLoaderData(queryClient);

      expect(data.dehydratedState.queries).toHaveLength(0);
      gate.resolve(filters);
      await loading;
      expect(data.dehydratedState.queries.map((query) => query.queryKey)).toEqual([["filters"]]);

      return new Response();
    });
  });

  it("restores a prefetched query without fetching again", async () => {
    const server = new RouterContextProvider();
    const browser = createQueryClient();
    let state = dehydratedLoaderData(browser).dehydratedState;

    await queryClientMiddleware(requestArgs(server), async () => {
      const queryClient = requireQueryClient(server);
      await queryClient.query({
        ...opportunityQueries.filters(),
        queryFn: () => Promise.resolve(filters),
      });
      state = dehydratedLoaderData(queryClient).dehydratedState;
      return new Response();
    });

    let fetches = 0;
    function ChainName() {
      const { data } = useQuery({
        ...opportunityQueries.filters(),
        queryFn: () => {
          fetches += 1;
          return Promise.resolve(filters);
        },
      });
      return <p>{data?.chains[0]?.name}</p>;
    }

    render(
      <QueryClientProvider client={browser}>
        <HydrationBoundary state={state}>
          <ChainName />
        </HydrationBoundary>
      </QueryClientProvider>,
    );

    expect(screen.getByText("Ethereum")).toBeTruthy();
    expect(fetches).toBe(0);
  });
});
