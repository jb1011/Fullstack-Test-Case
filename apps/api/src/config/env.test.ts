import { describe, expect, it } from "vitest";

import { loadEnv } from "./env";

describe("loadEnv", () => {
  it("falls back to defaults so the API starts without a .env", () => {
    expect(loadEnv({})).toEqual({
      NODE_ENV: "development",
      PORT: 4000,
      LOG_LEVEL: "info",
      MERKL_API_URL: "https://api.merkl.xyz",
      MERKL_TIMEOUT_MS: 5000,
    });
  });

  it("coerces numbers from strings", () => {
    expect(loadEnv({ PORT: "8080", MERKL_TIMEOUT_MS: "2000" })).toMatchObject({
      PORT: 8080,
      MERKL_TIMEOUT_MS: 2000,
    });
  });

  it("fails at startup with every invalid variable named", () => {
    expect(() => loadEnv({ PORT: "abc", MERKL_API_URL: "not a url" })).toThrow(
      /PORT[\s\S]*MERKL_API_URL/,
    );
  });
});
