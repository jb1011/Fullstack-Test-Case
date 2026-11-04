import express from "express";
import { pinoHttp } from "pino-http";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { MerklError } from "../merkl/errors";
import { silentLogger } from "../test/logger";
import { errorHandler, HttpError } from "./errors";

const appThrowing = (error: unknown) => {
  const app = express();
  app.use(pinoHttp({ logger: silentLogger }));
  app.get("/boom", () => {
    throw error;
  });
  app.use(errorHandler);
  return app;
};

const problemFor = async (error: unknown) => {
  const response = await request(appThrowing(error)).get("/boom");
  return { status: response.status, type: response.type, body: response.body as unknown };
};

describe("errorHandler", () => {
  it("sends an HttpError's status and message", async () => {
    expect(await problemFor(new HttpError(400, "Invalid query"))).toEqual({
      status: 400,
      type: "application/problem+json",
      body: { type: "about:blank", title: "Bad Request", status: 400, detail: "Invalid query" },
    });
  });

  it.each([
    ["not_found", 404],
    ["timeout", 504],
    ["network", 502],
    ["http", 502],
    ["invalid_response", 502],
  ] as const)("maps a Merkl %s error to %i", async (kind, status) => {
    const result = await problemFor(new MerklError(kind, "upstream secret", { status: 500 }));

    expect(result.status).toBe(status);
    expect(JSON.stringify(result.body)).not.toContain("upstream secret");
  });

  it("tells caches not to store an error", async () => {
    const response = await request(appThrowing(new HttpError(404, "Opportunity not found"))).get(
      "/boom",
    );

    expect(response.headers["cache-control"]).toBe("no-store");
  });

  it("hides unexpected errors behind a bare 500", async () => {
    const result = await problemFor(new Error("database password is hunter2"));

    expect(result.status).toBe(500);
    expect(result.body).toEqual({
      type: "about:blank",
      title: "Internal Server Error",
      status: 500,
    });
  });
});
