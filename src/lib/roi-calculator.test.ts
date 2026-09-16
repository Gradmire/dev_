import { describe, expect, it } from "vitest";
import { calculateRoi, GRADUATE_ROUTE_MONTHS, HORIZON_MONTHS, type RoiInputs } from "./roi-calculator";

/**
 * Every expected figure here was independently derived with a plain
 * reference script (standard EMI formula, monthly-compounding moratorium),
 * not by reading this module's own output — otherwise the test would only
 * prove the code agrees with itself.
 */

const scenarioA: RoiInputs = {
  tuitionGBP: 20_000,
  livingCostPerMonthGBP: 1_000,
  durationMonths: 12,
  visaFeeGBP: 500,
  ihsGBP: 800,
  flightsGBP: 700,
  depositsGBP: 0,
  loanAmountINR: 1_000_000,
  loanInterestRatePercent: 12,
  loanTenureMonths: 12,
  repaymentTiming: "during_study",
  currentAnnualSalaryINR: 600_000,
  postStudyAnnualSalaryGBP: 40_000,
  gbpToInrRate: 100,
};

const scenarioB: RoiInputs = {
  tuitionGBP: 0,
  livingCostPerMonthGBP: 1_000,
  durationMonths: 6,
  visaFeeGBP: 0,
  ihsGBP: 0,
  flightsGBP: 0,
  depositsGBP: 0,
  loanAmountINR: 500_000,
  loanInterestRatePercent: 12,
  loanTenureMonths: 12,
  repaymentTiming: "after_study",
  currentAnnualSalaryINR: 1_200_000,
  postStudyAnnualSalaryGBP: 60_000,
  gbpToInrRate: 100,
};

describe("calculateRoi — itemized cost", () => {
  it("sums one-off and recurring costs, and converts to INR at the given rate", () => {
    const { itemized } = calculateRoi(scenarioA);
    expect(itemized.livingCostsGBP).toBe(12_000); // 1,000 × 12
    expect(itemized.totalGBP).toBe(34_000); // 20,000 + 12,000 + 500 + 800 + 700
    expect(itemized.totalINR).toBe(3_400_000); // × 100
  });
});

describe("calculateRoi — loan repaid during study (no moratorium)", () => {
  const { loan } = calculateRoi(scenarioA);

  it("computes the standard reducing-balance EMI on the original principal", () => {
    // Reference: EMI = P·r·(1+r)^n / ((1+r)^n − 1), P=1,000,000, r=1%, n=12.
    expect(loan.monthlyEmiINR).toBeCloseTo(88_848.79, 1);
    expect(loan.emiStartMonth).toBe(1);
    expect(loan.capitalizedInterestINR).toBe(0);
  });

  it("totals interest and repayment across the full schedule", () => {
    expect(loan.totalInterestINR).toBeCloseTo(66_185.46, 1);
    expect(loan.totalRepaymentINR).toBeCloseTo(1_066_185.46, 1);
  });
});

describe("calculateRoi — during-study net position (scenario A)", () => {
  const { series } = calculateRoi(scenarioA);

  it("charges one-off costs and the first EMI in month 1, identically for both study paths", () => {
    // spend = living (100,000) + one-off (22,000 × 100 = 2,200,000); interest = 1,000,000 × 1%.
    expect(series[1]).toMatchObject({ optimisticINR: -2_310_000, downsideINR: -2_310_000, stayPutINR: 50_000 });
  });

  it("keeps optimistic and downside identical while still studying", () => {
    expect(series[2]).toMatchObject({ optimisticINR: -2_419_212, downsideINR: -2_419_212, stayPutINR: 100_000 });
    expect(series[3]).toMatchObject({ optimisticINR: -2_527_627, downsideINR: -2_527_627, stayPutINR: 150_000 });
  });
});

describe("calculateRoi — deferred repayment capitalises moratorium interest", () => {
  const { loan } = calculateRoi(scenarioB);

  it("compounds interest monthly onto the principal for the whole study period", () => {
    // Reference: 500,000 compounded at 1%/month for 6 months.
    expect(loan.capitalizedInterestINR).toBeCloseTo(30_760.08, 1);
    expect(loan.emiStartMonth).toBe(7); // durationMonths + 1
  });

  it("computes the EMI on the capitalised principal, not the original", () => {
    expect(loan.monthlyEmiINR).toBeCloseTo(47_157.39, 1);
  });
});

describe("calculateRoi — the downside scenario (scenario B)", () => {
  const { series } = calculateRoi(scenarioB);

  it("matches the optimistic path exactly through the moratorium", () => {
    expect(series[6].downsideINR).toBe(series[6].optimisticINR);
    expect(series[6]).toMatchObject({ optimisticINR: -630_760, stayPutINR: 600_000 });
  });

  it("diverges from month 1 post-study: optimistic earns, downside burns cash job-hunting", () => {
    expect(series[7]).toMatchObject({ optimisticINR: -136_068, downsideINR: -736_068, stayPutINR: 700_000 });
  });

  it(`keeps burning UK living costs with zero income for the ${GRADUATE_ROUTE_MONTHS}-month Graduate Route window`, () => {
    const lastSearchMonth = 6 + GRADUATE_ROUTE_MONTHS;
    expect(series[lastSearchMonth]).toMatchObject({ downsideINR: -3_065_889 });
  });

  it("resumes India income the month after the Graduate Route window closes", () => {
    const firstMonthHome = 6 + GRADUATE_ROUTE_MONTHS + 1;
    const delta =
      series[firstMonthHome].downsideINR - series[firstMonthHome - 1].downsideINR;
    expect(delta).toBe(100_000); // currentAnnualSalaryINR / 12, no more living-cost burn
  });
});

describe("calculateRoi — break-even", () => {
  it("finds the month the optimistic path overtakes staying put", () => {
    const { breakEvenMonth } = calculateRoi(scenarioB);
    expect(breakEvenMonth.optimistic).toBe(10);
  });

  it("reports null rather than a fabricated month when a path never catches up", () => {
    // After returning home, downside's income matches stay-put's exactly, so
    // a gap opened by lost years and loan interest never closes again.
    const { breakEvenMonth } = calculateRoi(scenarioB);
    expect(breakEvenMonth.downside).toBeNull();
  });

  it("never returns a break-even at month 0 — that's the shared starting baseline, not a real crossover", () => {
    const zeroCost: RoiInputs = { ...scenarioA, tuitionGBP: 0, livingCostPerMonthGBP: 0, visaFeeGBP: 0, ihsGBP: 0, flightsGBP: 0, depositsGBP: 0, loanAmountINR: 0, currentAnnualSalaryINR: 0, postStudyAnnualSalaryGBP: 0 };
    const { breakEvenMonth } = calculateRoi(zeroCost);
    expect(breakEvenMonth.optimistic).not.toBe(0);
  });
});

describe("calculateRoi — 5/10-year snapshots", () => {
  it("reads net position at year 5 and year 10 directly off the series", () => {
    const { netPositionAtYear, series } = calculateRoi(scenarioB);
    expect(netPositionAtYear).toHaveLength(2);
    expect(netPositionAtYear[0]).toMatchObject({ years: 5, ...atMonth(series, 60) });
    expect(netPositionAtYear[1]).toMatchObject({ years: 10, ...atMonth(series, 120) });
  });

  it("still trails staying put at year 10 in the downside case — the point of the scenario", () => {
    const { netPositionAtYear } = calculateRoi(scenarioB);
    const year10 = netPositionAtYear[1];
    expect(year10.downsideINR).toBeLessThan(year10.stayPutINR);
  });
});

describe("calculateRoi — series shape", () => {
  it(`runs from month 0 through the ${HORIZON_MONTHS}-month horizon inclusive`, () => {
    const { series } = calculateRoi(scenarioA);
    expect(series).toHaveLength(HORIZON_MONTHS + 1);
    expect(series[0]).toMatchObject({ optimisticINR: 0, downsideINR: 0, stayPutINR: 0 });
  });

  it("handles a loan-free scenario without dividing by zero", () => {
    const noLoan: RoiInputs = { ...scenarioA, loanAmountINR: 0, loanTenureMonths: 0 };
    const { loan, series } = calculateRoi(noLoan);
    expect(loan.monthlyEmiINR).toBe(0);
    expect(Number.isFinite(series[1].optimisticINR)).toBe(true);
  });
});

function atMonth(series: ReturnType<typeof calculateRoi>["series"], month: number) {
  const point = series[month];
  return { optimisticINR: point.optimisticINR, downsideINR: point.downsideINR, stayPutINR: point.stayPutINR };
}
