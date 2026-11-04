import { filtersSchema, opportunitiesQuerySchema, opportunityListSchema } from "@merkl/shared";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { createMerklClient } from "../merkl/client";
import aprRecordsFixture from "../merkl/__fixtures__/apr-records.json";
import chainsFixture from "../merkl/__fixtures__/chains.json";
import opportunityFixture from "../merkl/__fixtures__/opportunity.json";
import opportunitiesFixture from "../merkl/__fixtures__/opportunities.json";
import protocolsFixture from "../merkl/__fixtures__/protocols.json";
import tvlRecordsFixture from "../merkl/__fixtures__/tvl-records.json";
import { MERKL_TEST_URL, server } from "../test/msw";
import { createOpportunitiesService } from "./opportunities";

const service = createOpportunitiesService(
  createMerklClient({ baseUrl: MERKL_TEST_URL, timeoutMs: 50 }),
);
const query = opportunitiesQuerySchema.parse({ chain: "1", page: "2" });

const respond = (path: string, body: Parameters<typeof HttpResponse.json>[0], status = 200) => {
  server.use(http.get(`${MERKL_TEST_URL}${path}`, () => HttpResponse.json(body, { status })));
};

const notFound = (path: string) => {
  respond(path, { title: "Not Found" }, 404);
};

const stubList = () => {
  respond("/v4/opportunities", opportunitiesFixture);
  respond("/v4/opportunities/count", 618);
  respond("/v4/opportunities/aggregate/tvl", { sum: 2.8e9 });
};

describe("list", () => {
  it("asks Merkl for the page, the count and the total TVL together", async () => {
    stubList();

    const list = await service.list(query);

    expect(list).toMatchObject({ total: 618, totalTvl: 2.8e9, page: 2, pageSize: 20 });
    expect(list.items).toHaveLength(2);
    expect(list.items[1]?.protocol).toBeNull();
    expect(opportunityListSchema.parse(list)).toEqual(list);
  });
});

describe("get", () => {
  it("returns null when Merkl has no such opportunity", async () => {
    notFound("/v4/opportunities/missing");

    await expect(service.get("missing")).resolves.toBeNull();
  });

  it("returns null when the action is one this app doesn't know", async () => {
    respond("/v4/opportunities/2433802672589613459", { ...opportunityFixture, action: "TELEPORT" });

    await expect(service.get("2433802672589613459")).resolves.toBeNull();
  });
});

describe("history", () => {
  it("returns null when Merkl has no such opportunity", async () => {
    notFound("/v4/opportunities/missing/apr-records");
    notFound("/v4/opportunities/missing/tvl-records");

    await expect(service.history("missing")).resolves.toBeNull();
  });

  it("orders points from oldest to newest", async () => {
    respond("/v4/opportunities/2433802672589613459/apr-records", aprRecordsFixture);
    respond("/v4/opportunities/2433802672589613459/tvl-records", tvlRecordsFixture);

    const history = await service.history("2433802672589613459");
    const timestamps = history?.apr.map((point) => point.timestamp) ?? [];

    expect(timestamps).toEqual([...timestamps].sort((a, b) => a - b));
    expect(history?.apr.at(-1)?.timestamp).toBe(1793750400000);
  });
});

describe("filters", () => {
  it("loads every chain and protocol and sorts them by name", async () => {
    let protocolItems: string | null = null;
    server.use(
      http.get(`${MERKL_TEST_URL}/v4/chains`, () => HttpResponse.json(chainsFixture)),
      http.get(`${MERKL_TEST_URL}/v4/protocols`, ({ request }) => {
        protocolItems = new URL(request.url).searchParams.get("items");
        return HttpResponse.json([...protocolsFixture].reverse());
      }),
    );

    const filters = await service.filters();

    expect(protocolItems).toBe("500");
    expect(filters.protocols.map((protocol) => protocol.id)).toEqual([
      "1inch",
      "40acres",
      "9summits",
    ]);
    expect(filters.chains).toHaveLength(chainsFixture.length);
    expect(filters.actions).not.toContain("INVALID");
    expect(filtersSchema.parse(filters)).toEqual(filters);
  });
});
