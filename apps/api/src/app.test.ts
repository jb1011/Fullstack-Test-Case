import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "./app";
import { silentLogger } from "./test/logger";

const app = createApp({ logger: silentLogger });

describe("createApp", () => {
  it("answers the health check", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.headers["access-control-allow-origin"]).toBe("*");
    expect(response.body).toEqual({ status: "ok" });
  });

  it("answers unknown routes with a 404 problem", async () => {
    const response = await request(app).get("/nope");

    expect(response.status).toBe(404);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.headers["access-control-allow-origin"]).toBe("*");
    expect(response.type).toBe("application/problem+json");
    expect(response.body).toEqual({
      type: "about:blank",
      title: "Not Found",
      status: 404,
      detail: "No route for GET /nope",
    });
  });

  it("answers a preflight from any origin", async () => {
    const response = await request(app).options("/opportunities");

    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe("*");
    expect(response.headers["access-control-allow-methods"]).toContain("GET");
  });

  it("doesn't advertise Express", async () => {
    const response = await request(app).get("/health");

    expect(response.headers["x-powered-by"]).toBeUndefined();
  });
});
