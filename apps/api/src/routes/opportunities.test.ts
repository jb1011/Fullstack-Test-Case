import {
  filtersSchema,
  opportunityDetailSchema,
  opportunityHistorySchema,
  opportunityListSchema,
} from "@merkl/shared";
import { http, HttpResponse } from "msw";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { createApp } from "../app";
import { createMerklClient } from "../merkl/client";
import aprRecordsFixture from "../merkl/__fixtures__/apr-records.json";
import chainsFixture from "../merkl/__fixtures__/chains.json";
import opportunityFixture from "../merkl/__fixtures__/opportunity.json";
import opportunitiesFixture from "../merkl/__fixtures__/opportunities.json";
import protocolsFixture from "../merkl/__fixtures__/protocols.json";
import tvlRecordsFixture from "../merkl/__fixtures__/tvl-records.json";
import { createOpportunitiesService } from "../services/opportunities";
import { MERKL_TEST_URL, server } from "../test/msw";
import { silentLogger } from "../test/logger";
import { createOpportunitiesRouter } from "./opportunities";

const app = createApp({
  logger: silentLogger,
  routes: [
    createOpportunitiesRouter(
      createOpportunitiesService(createMerklClient({ baseUrl: MERKL_TEST_URL, timeoutMs: 50 })),
    ),
  ],
});

const json = (value: Parameters<typeof HttpResponse.json>[0]) => HttpResponse.json(value);

const problem = z.object({ title: z.string(), status: z.number(), detail: z.string() });

describe("GET /opportunities", () => {
  it("returns one page, with my page number and not Merkl's", async () => {
    let sent: URLSearchParams | undefined;
    server.use(
      http.get(`${MERKL_TEST_URL}/v4/opportunities`, ({ request: incoming }) => {
        sent = new URL(incoming.url).searchParams;
        return json(opportunitiesFixture);
      }),
      http.get(`${MERKL_TEST_URL}/v4/opportunities/count`, () => json(12)),
      http.get(`${MERKL_TEST_URL}/v4/opportunities/aggregate/tvl`, () => json({ sum: 1000 })),
    );

    const response = await request(app).get("/opportunities").query({ chain: "1", page: "2" });
    const list = opportunityListSchema.parse(JSON.parse(response.text) as unknown);

    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("public, max-age=60");
    expect(list).toMatchObject({ total: 12, totalTvl: 1000, page: 2 });
    expect(sent?.get("chainId")).toBe("1");
    expect(sent?.get("page")).toBe("1");
  });

  it("rejects an invalid query without calling Merkl", async () => {
    const response = await request(app).get("/opportunities").query({ page: "0" });

    expect(response.status).toBe(400);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(problem.parse(JSON.parse(response.text) as unknown).detail).toContain("page");
  });

  it("turns a Merkl failure into a 502 that hides the upstream message", async () => {
    server.use(
      http.get(`${MERKL_TEST_URL}/v4/opportunities`, () =>
        HttpResponse.json({ message: "database password is hunter2" }, { status: 500 }),
      ),
      http.get(`${MERKL_TEST_URL}/v4/opportunities/count`, () => json(0)),
      http.get(`${MERKL_TEST_URL}/v4/opportunities/aggregate/tvl`, () => json({ sum: 0 })),
    );

    const response = await request(app).get("/opportunities");

    expect(response.status).toBe(502);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.text).not.toContain("hunter2");
  });
});

describe("GET /opportunities/:id", () => {
  it("returns the detail", async () => {
    server.use(
      http.get(`${MERKL_TEST_URL}/v4/opportunities/2433802672589613459`, () =>
        json(opportunityFixture),
      ),
    );

    const response = await request(app).get("/opportunities/2433802672589613459");

    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("public, max-age=60");
    expect(
      opportunityDetailSchema.parse(JSON.parse(response.text) as unknown).depositUrl,
    ).toContain("morpho.org");
  });

  it("rejects an id that isn't a number without calling Merkl", async () => {
    const response = await request(app).get("/opportunities/does-not-exist");

    expect(response.status).toBe(400);
    expect(problem.parse(JSON.parse(response.text) as unknown).detail).toBe(
      "Invalid opportunity id",
    );
  });

  it("answers 404 when Merkl has no such opportunity", async () => {
    server.use(
      http.get(
        `${MERKL_TEST_URL}/v4/opportunities/1`,
        () => new HttpResponse(null, { status: 404 }),
      ),
    );

    const response = await request(app).get("/opportunities/1");

    expect(problem.parse(JSON.parse(response.text) as unknown)).toMatchObject({
      status: 404,
      detail: "Opportunity not found",
    });
  });
});

describe("GET /opportunities/:id/history", () => {
  it("returns the chart data", async () => {
    server.use(
      http.get(`${MERKL_TEST_URL}/v4/opportunities/2433802672589613459/apr-records`, () =>
        json(aprRecordsFixture),
      ),
      http.get(`${MERKL_TEST_URL}/v4/opportunities/2433802672589613459/tvl-records`, () =>
        json(tvlRecordsFixture),
      ),
    );

    const response = await request(app).get("/opportunities/2433802672589613459/history");
    const history = opportunityHistorySchema.parse(JSON.parse(response.text) as unknown);

    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("public, max-age=300");
    expect(history.apr.at(-1)?.timestamp).toBeGreaterThan(history.apr[0]?.timestamp ?? 0);
  });
});

describe("GET /filters", () => {
  it("returns chains, protocols and actions", async () => {
    server.use(
      http.get(`${MERKL_TEST_URL}/v4/chains`, () => json(chainsFixture)),
      http.get(`${MERKL_TEST_URL}/v4/protocols`, () => json(protocolsFixture)),
    );

    const response = await request(app).get("/filters");
    const filters = filtersSchema.parse(JSON.parse(response.text) as unknown);

    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("public, max-age=3600");
    expect(filters.chains).toHaveLength(chainsFixture.length);
    expect(filters.protocols).toHaveLength(protocolsFixture.length);
    expect(filters.actions).not.toContain("INVALID");
  });

  it("turns a Merkl failure into a 502 that hides the upstream message", async () => {
    server.use(
      http.get(`${MERKL_TEST_URL}/v4/chains`, () =>
        HttpResponse.json({ message: "database password is hunter2" }, { status: 500 }),
      ),
      http.get(`${MERKL_TEST_URL}/v4/protocols`, () => json(protocolsFixture)),
    );

    const response = await request(app).get("/filters");

    expect(response.status).toBe(502);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.text).not.toContain("hunter2");
  });
});
