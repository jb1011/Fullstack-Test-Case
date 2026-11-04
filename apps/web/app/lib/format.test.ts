import { describe, expect, it } from "vitest";

import {
  formatApr,
  formatAprNumber,
  formatCount,
  formatEndsIn,
  formatScale,
  formatTvl,
} from "./format";

describe("format", () => {
  it("formats APR and TVL for display", () => {
    expect(formatApr(5)).toBe("5%");
    expect(formatApr(2.796)).toBe("2.8%");
    expect(formatAprNumber(2.796)).toBe("2.8");
    expect(formatCount(1747)).toBe("1,747");
    expect(formatTvl(1000)).toBe("$1.0K");
    expect(formatTvl(709_100_000)).toBe("$709.1M");
    expect(formatScale("apr", 4.96)).toBe("4.96%");
    expect(formatScale("tvl", 587_100_000)).toBe("$587.1M");
  });

  it("says how long is left until a campaign ends", () => {
    const now = Date.parse("2026-11-04T00:00:00.000Z");
    expect(formatEndsIn("2026-11-06T00:00:00.000Z", now)).toBe("2 days");
    expect(formatEndsIn("2026-11-05T00:00:00.000Z", now)).toBe("1 day");
    expect(formatEndsIn("2026-11-03T00:00:00.000Z", now)).toBe("Ended");
    expect(formatEndsIn("not a date", now)).toBeNull();
  });
});
