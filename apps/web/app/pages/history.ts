import type { HistoryPoint } from "@merkl/shared";

const DAY_MS = 86_400_000;

export type HistoryRange = "7D" | "30D" | "All";

const RANGE_DAYS = { "7D": 7, "30D": 30 } as const;

export const sortPoints = (points: HistoryPoint[]) =>
  [...points].sort((left, right) => left.timestamp - right.timestamp);

export const sliceRange = (points: HistoryPoint[], range: HistoryRange) => {
  const sorted = sortPoints(points);
  if (range === "All" || sorted.length === 0) return sorted;
  const latest = sorted[sorted.length - 1];
  if (!latest) return sorted;
  const start = latest.timestamp - RANGE_DAYS[range] * DAY_MS;
  return sorted.filter((point) => point.timestamp >= start);
};

export const valueDomain = (points: HistoryPoint[]): [number, number] => {
  const first = points[0];
  if (!first) return [0, 1];
  let min = first.value;
  let max = first.value;
  for (const point of points) {
    if (point.value < min) min = point.value;
    if (point.value > max) max = point.value;
  }
  const span = max - min;
  const pad = span === 0 ? Math.max(Math.abs(max) * 0.05, 1) : span * 0.25;
  return [min - pad, max + pad];
};

export const scaleTicks = (domain: [number, number], count = 3) => {
  const [min, max] = domain;
  if (count < 1 || min === max) return [min];
  const step = (max - min) / (count + 1);
  return Array.from({ length: count }, (_, index) => min + step * (index + 1));
};

export const changeSinceYesterday = (points: HistoryPoint[]) => {
  const sorted = sortPoints(points);
  const latest = sorted[sorted.length - 1];
  if (!latest) return null;
  const cutoff = latest.timestamp - DAY_MS;
  const prior = [...sorted].reverse().find((point) => point.timestamp <= cutoff);
  if (!prior) return null;
  return latest.value - prior.value;
};
