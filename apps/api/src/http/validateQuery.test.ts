import { opportunitiesQuerySchema } from "@merkl/shared";
import { Router } from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { createApp } from "../app";
import { silentLogger } from "../test/logger";
import { readQuery, validateQuery } from "./validateQuery";

const router = Router();

router.get("/search", validateQuery(opportunitiesQuerySchema), (_req, res) => {
  res.json(readQuery(res, opportunitiesQuerySchema));
});

router.get("/unvalidated", (_req, res) => {
  res.json(readQuery(res, opportunitiesQuerySchema));
});

const app = createApp({ logger: silentLogger, routes: [router] });

const problemBody = (text: string) =>
  z
    .object({ title: z.string(), status: z.number(), detail: z.string() })
    .parse(JSON.parse(text) as unknown);

describe("validateQuery", () => {
  it("fills in the defaults", async () => {
    const response = await request(app).get("/search");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: ["LIVE"],
      sort: "tvl",
      order: "desc",
      page: 1,
      pageSize: 20,
    });
  });

  it("parses comma separated lists, blanks and unknown parameters", async () => {
    const response = await request(app).get("/search").query({
      chain: "42161, 1,1",
      protocol: "Aave",
      minTvl: "",
      search: "  usdc ",
      utm_source: "newsletter",
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      chain: [1, 42161],
      protocol: ["aave"],
      search: "usdc",
    });
    expect(response.body).not.toHaveProperty("minTvl");
    expect(response.body).not.toHaveProperty("utm_source");
  });

  it("keeps every value when a key is repeated", async () => {
    const response = await request(app)
      .get("/search")
      .query({ chain: ["8453", "1"] });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ chain: [1, 8453] });
  });

  it("answers 400 and names every invalid field", async () => {
    const response = await request(app).get("/search").query({ page: "0", status: "ENDED" });

    expect(response.status).toBe(400);
    expect(response.type).toBe("application/problem+json");
    const problem = problemBody(response.text);
    expect(problem).toMatchObject({ title: "Bad Request", status: 400 });
    expect(problem.detail).toMatch(/status[\s\S]*page/);
  });

  it("reports a minimum TVL above the maximum", async () => {
    const response = await request(app).get("/search").query({ minTvl: "500", maxTvl: "100" });

    expect(response.status).toBe(400);
    expect(problemBody(response.text).detail).toContain("maxTvl");
  });

  it("hides the message when a route reads the query without validating", async () => {
    const response = await request(app).get("/unvalidated");

    expect(response.status).toBe(500);
    expect(JSON.stringify(response.body)).not.toContain("readQuery");
  });
});
