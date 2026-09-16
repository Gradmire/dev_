/**
 * Currency-aware money formatting.
 *
 * Every figure in the database is stored as an integer plus the owning
 * course hub's `currency` column, so formatting must take that currency as
 * an argument. Hardcoding "£" — as several call sites previously did —
 * renders US, Canadian and Australian fees in sterling the day a second
 * destination goes live.
 *
 * Ranges are carried as numbers (`MoneyRange`) and formatted at the edge.
 * They are deliberately *not* passed around as pre-formatted strings: the
 * ROI calculator used to regex-parse "£22,000–£95,000/year" back into
 * numbers, which silently yields 0 the moment a symbol or separator changes.
 */

export const DEFAULT_CURRENCY = "GBP";

/** Currencies for the destinations on the roadmap. */
const SYMBOLS: Record<string, string> = {
  GBP: "£",
  USD: "$",
  CAD: "CA$",
  AUD: "A$",
  EUR: "€",
  INR: "₹",
};

/** The locale whose grouping separators suit each currency. */
const LOCALES: Record<string, string> = {
  GBP: "en-GB",
  USD: "en-US",
  CAD: "en-CA",
  AUD: "en-AU",
  EUR: "en-IE",
  INR: "en-IN",
};

export type MoneyRange = {
  min: number | null;
  max: number | null;
  currency: string;
};

export function currencySymbol(currency: string = DEFAULT_CURRENCY): string {
  return SYMBOLS[currency] ?? `${currency} `;
}

export function formatMoney(
  amount: number,
  currency: string = DEFAULT_CURRENCY,
  { compact = false }: { compact?: boolean } = {},
): string {
  const symbol = currencySymbol(currency);
  if (compact && amount >= 1000) {
    const thousands = amount / 1000;
    return `${symbol}${thousands.toFixed(amount % 1000 === 0 ? 0 : 1)}k`;
  }
  return `${symbol}${amount.toLocaleString(LOCALES[currency] ?? "en-GB")}`;
}

/**
 * Formats a stored min/max pair the way the content spec writes it, e.g.
 * "£22,000–£95,000/year". Returns null when there is no figure at all, so
 * callers can distinguish "no data" from a zero.
 */
export function formatMoneyRange(
  range: MoneyRange,
  { suffix = "", compact = false }: { suffix?: string; compact?: boolean } = {},
): string | null {
  const { min, max, currency } = range;
  if (min == null && max == null) return null;

  const fmt = (n: number) => formatMoney(n, currency, { compact });
  if (min != null && max != null && min !== max) {
    return `${fmt(min)}–${fmt(max)}${suffix}`;
  }
  return `${fmt((min ?? max)!)}${suffix}`;
}

/**
 * Compact INR formatting in lakhs/crores rather than the "k" thousands
 * `formatMoney({ compact: true })` uses — "₹56.3L" is how the audience this
 * site is built for reads a six-figure rupee amount; "₹5634.1k" is not.
 * Handles negative amounts (a net position can go negative) with a leading
 * sign rather than folding it into the number.
 */
export function formatINRCompact(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);
  if (abs >= 1_00_00_000) {
    const crore = abs / 1_00_00_000;
    return `${sign}₹${crore.toFixed(crore % 1 === 0 ? 0 : 1)}Cr`;
  }
  if (abs >= 1_00_000) {
    const lakh = abs / 1_00_000;
    return `${sign}₹${lakh.toFixed(lakh % 1 === 0 ? 0 : 1)}L`;
  }
  return `${sign}${formatMoney(abs, "INR")}`;
}

/** Midpoint of a range, for averages. Null when the range is empty. */
export function rangeMidpoint(range: MoneyRange): number | null {
  const { min, max } = range;
  if (min == null && max == null) return null;
  if (min == null) return max;
  if (max == null) return min;
  return (min + max) / 2;
}
