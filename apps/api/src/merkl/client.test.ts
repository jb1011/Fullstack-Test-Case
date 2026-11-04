import { opportunitiesQuerySchema } from "@merkl/shared";
import { delay, http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { MERKL_TEST_URL, server } from "../test/msw";
import opportunityFixture from "./__fixtures__/opportunity.json";
import opportunitiesFixture from "./__fixtures__/opportunities.json";
import { createMerklClient } from "./client";
import { MerklError } from "./errors";

const client = createMerklClient({ baseUrl: MERKL_TEST_URL, timeoutMs: 50 });
const query = opportunitiesQuerySchema.parse({ chain: "1", minTvl: "1000" });

const respond = (path: string, resolver: Parameters<typeof http.get>[1]) => {
  server.use(http.get(`${MERKL_TEST_URL}${path}`, resolver));
};

const rejection = (promise: Promise<unknown>) =>
  promise.then(
    () => {
      throw new Error("expected a MerklError");
    },
    (error: unknown) => error as MerklError,
  );

describe("listOpportunities", () => {
  it("sends Merkl's parameter names and parses real responses", async () => {
    let sent: URLSearchParams | undefined;
    respond("/v4/opportunities", ({ request }) => {
      sent = new URL(request.url).searchParams;
      return HttpResponse.json(opportunitiesFixture);
    });

    const opportunities = await client.listOpportunities(query);

    expect(sent?.get("chainId")).toBe("1");
    expect(sent?.get("minimumTvl")).toBe("1000");
    expect(sent?.get("page")).toBe("0");
    expect(opportunities).toHaveLength(2);
    expect(opportunities[0]?.protocol?.id).toBe("morpho");
  });

  it("accepts opportunities without a protocol", async () => {
    respond("/v4/opportunities", () => HttpResponse.json(opportunitiesFixture));

    const [, withoutProtocol] = await client.listOpportunities(query);

    expect(withoutProtocol?.protocol).toBeUndefined();
  });

  it("keeps only the fields I use", async () => {
    respond("/v4/opportunities", () => HttpResponse.json(opportunitiesFixture));

    const [first] = await client.listOpportunities(query);

    expect(first).not.toHaveProperty("aprRecord");
    expect(first?.chain).not.toHaveProperty("explorers");
  });
});

describe("countOpportunities", () => {
  it("returns Merkl's count without paging parameters", async () => {
    let sent: URLSearchParams | undefined;
    respond("/v4/opportunities/count", ({ request }) => {
      sent = new URL(request.url).searchParams;
      return HttpResponse.json(197);
    });

    await expect(client.countOpportunities(query)).resolves.toBe(197);
    expect(sent?.has("page")).toBe(false);
  });
});

describe("getOpportunity", () => {
  it("returns one opportunity", async () => {
    respond("/v4/opportunities/:id", () => HttpResponse.json(opportunityFixture));

    const opportunity = await client.getOpportunity(opportunityFixture.id);

    expect(opportunity.id).toBe(opportunityFixture.id);
    expect(opportunity.tokens.length).toBeGreaterThan(0);
  });
});

describe("errors", () => {
  it("reports a missing opportunity as not_found", async () => {
    respond("/v4/opportunities/:id", () =>
      HttpResponse.json({ title: "Not Found", status: 404 }, { status: 404 }),
    );

    const error = await rejection(client.getOpportunity("123"));

    expect(error).toBeInstanceOf(MerklError);
    expect(error.kind).toBe("not_found");
  });

  it("reports a server error as http with its status", async () => {
    respond("/v4/opportunities", () => new HttpResponse(null, { status: 503 }));

    const error = await rejection(client.listOpportunities(query));

    expect(error.kind).toBe("http");
    expect(error.status).toBe(503);
  });

  it("reports a body that does not match the schema as invalid_response", async () => {
    respond("/v4/opportunities", () => HttpResponse.json([{ id: 1 }]));

    expect((await rejection(client.listOpportunities(query))).kind).toBe("invalid_response");
  });

  it("reports a body that is not JSON as invalid_response", async () => {
    respond("/v4/opportunities", () => HttpResponse.text("<html>"));

    expect((await rejection(client.listOpportunities(query))).kind).toBe("invalid_response");
  });

  it("reports a network failure as network", async () => {
    respond("/v4/opportunities", () => HttpResponse.error());

    expect((await rejection(client.listOpportunities(query))).kind).toBe("network");
  });

  it("gives up after the timeout", async () => {
    respond("/v4/opportunities", async () => {
      await delay(200);
      return HttpResponse.json(opportunitiesFixture);
    });

    expect((await rejection(client.listOpportunities(query))).kind).toBe("timeout");
  });
});
