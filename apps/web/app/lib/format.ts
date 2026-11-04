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
