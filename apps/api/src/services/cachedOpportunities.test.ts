import { opportunitiesQuerySchema, serializeOpportunitiesQuery } from "@merkl/shared";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { FILTERS_TTL_MS, HISTORY_TTL_MS, LIST_TTL_MS } from "../cache/lifetimes";
import { createMemoryStore } from "../cache/memoryStore";
import { createMerklClient } from "../merkl/client";
import aprRecordsFixture from "../merkl/__fixtures__/apr-records.json";
import chainsFixture from "../merkl/__fixtures__/chains.json";
import opportunityFixture from "../merkl/__fixtures__/opportunity.json";
import opportunitiesFixture from "../merkl/__fixtures__/opportunities.json";
import protocolsFixture from "../merkl/__fixtures__/protocols.json";
import tvlRecordsFixture from "../merkl/__fixtures__/tvl-records.json";
import { MERKL_TEST_URL, server } from "../test/msw";
import { createCachedOpportunitiesService } from "./cachedOpportunities";
import { createOpportunitiesService } from "./opportunities";

const start = 1_000_000;
let now = start;
const query = opportunitiesQuerySchema.parse({ chain: "1", page: "2" });
const detailId = "2433802672589613459";

const json = (body: Parameters<typeof HttpResponse.json>[0], status = 200) =>
  HttpResponse.json(body, { status });

const serviceWith = () => {
  now = start;
  const store = createMemoryStore(10, () => now);
  const service = createCachedOpportunitiesService(
    createOpportunitiesService(createMerklClient({ baseUrl: MERKL_TEST_URL, timeoutMs: 50 })),
    store,
  );
  return { service, store };
};

const stubList = () => {
  let calls = 0;
  server.use(
    http.get(`${MERKL_TEST_URL}/v4/opportunities`, () => {
      calls += 1;
      return json(opportunitiesFixture);
    }),
    http.get(`${MERKL_TEST_URL}/v4/opportunities/count`, () => json(618)),
    http.get(`${MERKL_TEST_URL}/v4/opportunities/aggregate/tvl`, () => json({ sum: 2.8e9 })),
  );
  return { calls: () => calls };
};

describe("list", () => {
  it("fetches once for queries that normalize to the same key", async () => {
    const calls = stubList();
    const { service, store } = serviceWith();
    const firstQuery = opportunitiesQuerySchema.parse({ chain: "8453,1", status: "PAST" });
    const sameQuery = opportunitiesQuerySchema.parse({ chain: "1,8453", status: "PAST" });

    const first = await service.list(firstQuery);
    const second = await service.list(sameQuery);

    expect(calls.calls()).toBe(1);
    expect(second).toEqual(first);
    expect(second).not.toBe(first);
    expect(store.get(`opportunities?${serializeOpportunitiesQuery(firstQuery)}`)).toEqual(first);
  });

  it("fetches again for a different page", async () => {
    const calls = stubList();
    const { service } = serviceWith();

    await service.list(query);
    await service.list(opportunitiesQuerySchema.parse({ chain: "1", page: "3" }));

    expect(calls.calls()).toBe(2);
  });

  it("fetches again once the list ttl has passed", async () => {
    const calls = stubList();
    const { service } = serviceWith();

    await service.list(query);
    now = start + LIST_TTL_MS + 1;
    await service.list(query);

    expect(calls.calls()).toBe(2);
  });

  it("does not store a failed fetch, and serves the previous list when a refresh fails", async () => {
    let calls = 0;
    server.use(
      http.get(`${MERKL_TEST_URL}/v4/opportunities`, () => {
        calls += 1;
        if (calls === 2) return json(opportunitiesFixture);
        return json({ message: "nope" }, 500);
      }),
      http.get(`${MERKL_TEST_URL}/v4/opportunities/count`, () => json(618)),
      http.get(`${MERKL_TEST_URL}/v4/opportunities/aggregate/tvl`, () => json({ sum: 2.8e9 })),
    );
    const { service } = serviceWith();

    await expect(service.list(query)).rejects.toThrow(/Merkl responded 500/);
    const fresh = await service.list(query);
    now = start + LIST_TTL_MS + 1;

    await expect(service.list(query)).resolves.toEqual(fresh);
    expect(calls).toBe(3);
  });

  it("runs one fetch when the same list is asked for twice at once", async () => {
    let calls = 0;
    let release: () => void = () => undefined;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.get(`${MERKL_TEST_URL}/v4/opportunities`, async () => {
        calls += 1;
        await pending;
        return json(opportunitiesFixture);
      }),
      http.get(`${MERKL_TEST_URL}/v4/opportunities/count`, () => json(618)),
      http.get(`${MERKL_TEST_URL}/v4/opportunities/aggregate/tvl`, () => json({ sum: 2.8e9 })),
    );
    const { service } = serviceWith();

    const first = service.list(query);
    const second = service.list(query);
    release();

    await expect(first).resolves.toEqual(await second);
    expect(calls).toBe(1);
  });
});

describe("get", () => {
  it("remembers a missing opportunity", async () => {
    let calls = 0;
    server.use(
      http.get(`${MERKL_TEST_URL}/v4/opportunities/1`, () => {
        calls += 1;
        return json({ title: "Not Found" }, 404);
      }),
    );
    const { service } = serviceWith();

    await expect(service.get("1")).resolves.toBeNull();
    await expect(service.get("1")).resolves.toBeNull();

    expect(calls).toBe(1);
  });

  it("remembers a detail for the list ttl", async () => {
    let calls = 0;
    server.use(
      http.get(`${MERKL_TEST_URL}/v4/opportunities/${detailId}`, () => {
        calls += 1;
        return json(opportunityFixture);
      }),
    );
    const { service } = serviceWith();

    const detail = await service.get(detailId);
    now = start + LIST_TTL_MS;
    await expect(service.get(detailId)).resolves.toEqual(detail);
    now = start + LIST_TTL_MS + 1;
    await service.get(detailId);

    expect(detail?.name).toContain("Sentora");
    expect(calls).toBe(2);
  });
});

describe("history", () => {
  const stubHistory = () => {
    let calls = 0;
    server.use(
      http.get(`${MERKL_TEST_URL}/v4/opportunities/${detailId}/apr-records`, () => {
        calls += 1;
        return json(aprRecordsFixture);
      }),
      http.get(`${MERKL_TEST_URL}/v4/opportunities/${detailId}/tvl-records`, () =>
        json(tvlRecordsFixture),
      ),
    );
    return { calls: () => calls };
  };

  it("stays fresh for longer than a list", async () => {
    const calls = stubHistory();
    const { service } = serviceWith();

    await service.history(detailId);
    now = start + LIST_TTL_MS + 1;
    await service.history(detailId);
    now = start + HISTORY_TTL_MS + 1;
    await service.history(detailId);

    expect(calls.calls()).toBe(2);
  });
});

describe("filters", () => {
  it("stays fresh for an hour", async () => {
    let calls = 0;
    server.use(
      http.get(`${MERKL_TEST_URL}/v4/chains`, () => {
        calls += 1;
        return json(chainsFixture);
      }),
      http.get(`${MERKL_TEST_URL}/v4/protocols`, () => json(protocolsFixture)),
    );
    const { service } = serviceWith();

    await service.filters();
    now = start + HISTORY_TTL_MS + 1;
    await service.filters();
    now = start + FILTERS_TTL_MS + 1;
    await service.filters();

    expect(calls).toBe(2);
  });
});
