import { opportunitiesQuerySchema } from "@merkl/shared";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { ApiError, createApiClient } from "./client";
import { detail, filters, history, list } from "./fixture";

const API_TEST_URL = "http://api.test";
const client = createApiClient(API_TEST_URL);
const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledFrame: "error" });
});
afterEach(() => {
  server.resetHandlers();
});
afterAll(() => {
  server.close();
});

const ok = (path: string, body: Parameters<typeof HttpResponse.json>[0]) => {
  server.use(http.get(`${API_TEST_URL}${path}`, () => HttpResponse.json(body)));
};

describe("createApiClient", () => {
  it("requests a list with the normalized query", async () => {
    let seen = "";
    server.use(
      http.get(`${API_TEST_URL}/opportunities`, ({ request }) => {
        seen = new URL(request.url).search;
        return HttpResponse.json(list);
      }),
    );

    const query = opportunitiesQuerySchema.parse({ chain: "8453,1", status: "PAST" });
    await expect(client.list(query)).resolves.toEqual(list);
    expect(seen).toBe("?chain=1%2C8453&status=PAST");
  });

  it("omits the query string for the default list", async () => {
    let seen = "";
    server.use(
      http.get(`${API_TEST_URL}/opportunities`, ({ request }) => {
        seen = new URL(request.url).search;
        return HttpResponse.json(list);
      }),
    );

    await client.list(opportunitiesQuerySchema.parse({}));
    expect(seen).toBe("");
  });

  it("loads a detail, its history and the filters", async () => {
    ok("/opportunities/42", detail);
    ok("/opportunities/42/history", history);
    ok("/filters", filters);

    await expect(client.detail("42")).resolves.toEqual(detail);
    await expect(client.history("42")).resolves.toEqual(history);
    await expect(client.filters()).resolves.toEqual(filters);
  });

  it("throws the problem detail when the API rejects the request", async () => {
    server.use(
      http.get(`${API_TEST_URL}/opportunities/1`, () =>
        HttpResponse.json(
          { type: "about:blank", title: "Not Found", status: 404, detail: "Opportunity not found" },
          { status: 404 },
        ),
      ),
    );

    const error = await client.detail("1").then(
      () => undefined,
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 404, message: "Opportunity not found" });
  });

  it("throws when a successful response is not the expected shape", async () => {
    ok("/filters", { chains: "nope" });

    await expect(client.filters()).rejects.toThrow(/unexpected response/);
  });
});
