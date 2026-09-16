import { describe, expect, it } from "vitest";
import {
  currencySymbol,
  formatINRCompact,
  formatMoney,
  formatMoneyRange,
  rangeMidpoint,
} from "./money";

/**
 * Every figure is stored as an integer plus the owning hub's `currency`, so
 * the thing worth guarding is that the currency argument is actually honoured
 * — hardcoding "£" renders US and Australian fees in sterling the day a
 * second destination goes live.
 */

describe("currencySymbol", () => {
  it("maps the roadmap currencies", () => {
    expect(currencySymbol("GBP")).toBe("£");
    expect(currencySymbol("USD")).toBe("$");
    expect(currencySymbol("CAD")).toBe("CA$");
    expect(currencySymbol("AUD")).toBe("A$");
  });

  it("defaults to sterling and degrades to a prefixed code", () => {
    expect(currencySymbol()).toBe("£");
    expect(currencySymbol("XYZ")).toBe("XYZ ");
  });
});

describe("formatMoney", () => {
  it("groups by the locale that suits the currency", () => {
    expect(formatMoney(22_000, "GBP")).toBe("£22,000");
    expect(formatMoney(22_000, "USD")).toBe("$22,000");
    // Indian grouping is 2,2 not 3,3 — the audience this site is built for.
    expect(formatMoney(2_200_000, "INR")).toBe("₹22,00,000");
  });

  it("compacts thousands, keeping one decimal only when it is not round", () => {
    expect(formatMoney(22_000, "GBP", { compact: true })).toBe("£22k");
    expect(formatMoney(22_500, "GBP", { compact: true })).toBe("£22.5k");
    // Below 1000 compact is a no-op, or "0.9k" would read as free.
    expect(formatMoney(999, "GBP", { compact: true })).toBe("£999");
  });
});

describe("formatMoneyRange", () => {
  it("writes a range the way the content spec does", () => {
    expect(
      formatMoneyRange({ min: 22_000, max: 95_000, currency: "GBP" }, { suffix: "/year" }),
    ).toBe("£22,000–£95,000/year");
  });

  it("collapses to a single figure when only one end exists, or both match", () => {
    expect(formatMoneyRange({ min: 22_000, max: null, currency: "GBP" })).toBe("£22,000");
    expect(formatMoneyRange({ min: null, max: 95_000, currency: "USD" })).toBe("$95,000");
    expect(formatMoneyRange({ min: 22_000, max: 22_000, currency: "GBP" })).toBe("£22,000");
  });

  it("returns null for no data, so callers can tell it from a zero", () => {
    expect(formatMoneyRange({ min: null, max: null, currency: "GBP" })).toBeNull();
    expect(formatMoneyRange({ min: 0, max: null, currency: "GBP" })).toBe("£0");
  });
});

describe("formatINRCompact", () => {
  it("switches to lakhs at 1,00,000 and crores at 1,00,00,000", () => {
    expect(formatINRCompact(45_000)).toBe("₹45,000");
    expect(formatINRCompact(5_634_111)).toBe("₹56.3L");
    expect(formatINRCompact(100_000)).toBe("₹1L");
    expect(formatINRCompact(125_000_000)).toBe("₹12.5Cr");
  });

  it("keeps the sign on a negative net position rather than folding it into the number", () => {
    expect(formatINRCompact(-2_310_000)).toBe("-₹23.1L");
    expect(formatINRCompact(-45_000)).toBe("-₹45,000");
  });
});

describe("rangeMidpoint", () => {
  it("averages a full range and falls back to whichever end exists", () => {
    expect(rangeMidpoint({ min: 10, max: 20, currency: "GBP" })).toBe(15);
    expect(rangeMidpoint({ min: null, max: 20, currency: "GBP" })).toBe(20);
    expect(rangeMidpoint({ min: 10, max: null, currency: "GBP" })).toBe(10);
    expect(rangeMidpoint({ min: null, max: null, currency: "GBP" })).toBeNull();
  });
});
