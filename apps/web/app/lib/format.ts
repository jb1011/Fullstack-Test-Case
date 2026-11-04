const percent = new Intl.NumberFormat("en", { maximumFractionDigits: 2 });
const count = new Intl.NumberFormat("en");
const dollars = new Intl.NumberFormat("en", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

export const formatCount = (value: number) => count.format(value);

export const formatAprNumber = (value: number) => percent.format(value);

export const formatApr = (value: number) => `${formatAprNumber(value)}%`;

export const formatTvl = (value: number) => dollars.format(value);

const DAY_MS = 86_400_000;

export const formatEndsIn = (endsAt: string, now: number) => {
  const end = Date.parse(endsAt);
  if (Number.isNaN(end)) return null;
  const remaining = end - now;
  if (remaining <= 0) return "Ended";
  const days = Math.ceil(remaining / DAY_MS);
  return days === 1 ? "1 day" : String(days) + " days";
};
