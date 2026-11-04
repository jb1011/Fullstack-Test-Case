const percent = new Intl.NumberFormat("en", { maximumFractionDigits: 2 });
const dollars = new Intl.NumberFormat("en", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

export const formatApr = (value: number) => `${percent.format(value)}%`;

export const formatTvl = (value: number) => dollars.format(value);
