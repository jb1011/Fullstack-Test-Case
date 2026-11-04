import { ChakraProvider } from "@chakra-ui/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { apiBaseUrl } from "../api/client";
import { detail, history, summary } from "../api/fixture";
import { opportunityQueries } from "../api/queries";
import { createQueryClient } from "../lib/queryClient";
import { system } from "../theme";
import { OpportunityTable } from "./opportunity-table";

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

const second = { ...summary, id: "2", name: "Supply ETH" };

describe("opportunity rows", () => {
  it("loads the detail and history on hover and on focus", async () => {
    const detailHits = new Map<string, number>();
    const historyHits = new Map<string, number>();
    server.use(
      http.get(`${apiBaseUrl}/opportunities/:id/history`, ({ params }) => {
        const id = String(params.id);
        historyHits.set(id, (historyHits.get(id) ?? 0) + 1);
        return HttpResponse.json(history);
      }),
      http.get(`${apiBaseUrl}/opportunities/:id`, ({ params }) => {
        const id = String(params.id);
        detailHits.set(id, (detailHits.get(id) ?? 0) + 1);
        return HttpResponse.json({ ...detail, id, name: id === "2" ? second.name : summary.name });
      }),
    );

    const client = createQueryClient();
    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: (
            <OpportunityTable
              items={[summary, second]}
              sort="tvl"
              order="desc"
              onSort={() => undefined}
            />
          ),
        },
      ],
      { initialEntries: ["/"] },
    );
    render(
      <QueryClientProvider client={client}>
        <ChakraProvider value={system}>
          <RouterProvider router={router} />
        </ChakraProvider>
      </QueryClientProvider>,
    );

    fireEvent.mouseEnter(screen.getByRole("link", { name: /Supply USDC/ }));
    await vi.waitFor(() => {
      expect(detailHits.get("1")).toBe(1);
      expect(historyHits.get("1")).toBe(1);
    });

    fireEvent.focus(screen.getByRole("link", { name: /Supply ETH/ }));
    await vi.waitFor(() => {
      expect(detailHits.get("2")).toBe(1);
      expect(historyHits.get("2")).toBe(1);
    });

    fireEvent.mouseEnter(screen.getByRole("link", { name: /Supply USDC/ }));
    fireEvent.focus(screen.getByRole("link", { name: /Supply USDC/ }));
    await client.query(opportunityQueries.detail("1"));
    await client.query(opportunityQueries.history("1"));

    expect(detailHits.get("1")).toBe(1);
    expect(historyHits.get("1")).toBe(1);
    expect(detailHits.get("2")).toBe(1);
    expect(historyHits.get("2")).toBe(1);
  });
});
