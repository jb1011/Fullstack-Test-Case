import { describe, expect, it } from "vitest";

import { changeSinceYesterday, scaleTicks, sliceRange, valueDomain } from "./history";

const day = 86_400_000;
const latest = 1_700_086_400_000;

const points = [
  { timestamp: latest - 40 * day, value: 1 },
  { timestamp: latest - 20 * day, value: 3 },
  { timestamp: latest - day, value: 4 },
  { timestamp: latest, value: 6 },
];

describe("history series", () => {
  it("keeps the window that ends on the newest point", () => {
    expect(sliceRange(points, "7D").map((point) => point.value)).toEqual([4, 6]);
    expect(sliceRange(points, "30D").map((point) => point.value)).toEqual([3, 4, 6]);
    expect(sliceRange(points, "All")).toHaveLength(4);
  });

  it("pads the vertical range so a small move still shows", () => {
    expect(valueDomain(points)).toEqual([1 - 1.25, 6 + 1.25]);
    expect(valueDomain([{ timestamp: latest, value: 5 }])).toEqual([4, 6]);
    expect(scaleTicks([4, 10])).toEqual([5.5, 7, 8.5]);
  });

  it("reads the change from the point a day earlier", () => {
    expect(changeSinceYesterday(points)).toBe(2);
    expect(changeSinceYesterday([{ timestamp: latest, value: 6 }])).toBeNull();
    expect(
      changeSinceYesterday([
        { timestamp: latest - 3_600_000, value: 5 },
        { timestamp: latest, value: 6 },
      ]),
    ).toBeNull();
  });
});
