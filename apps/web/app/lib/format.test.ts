import { describe, expect, it } from "vitest";

import { formatApr, formatAprNumber, formatCount, formatTvl } from "./format";

describe("format", () => {
  it("formats APR and TVL for display", () => {
    expect(formatApr(5)).toBe("5%");
    expect(formatApr(2.796)).toBe("2.8%");
    expect(formatAprNumber(2.796)).toBe("2.8");
    expect(formatCount(1747)).toBe("1,747");
    expect(formatTvl(1000)).toBe("$1.0K");
    expect(formatTvl(709_100_000)).toBe("$709.1M");
  });
});
