/**
 * Pure ROI arithmetic for the study-abroad calculator. No React, no fetch,
 * no formatting — this module only turns a user's numbers into a month-by-
 * month net-worth trajectory for three scenarios, so it can be unit tested
 * without a DOM.
 *
 * Accounting model: every function here tracks *net position* (assets minus
 * liabilities), not cash-in-hand. Taking a loan doesn't change net position
 * at disbursement — the cash you receive and the debt you owe cancel out —
 * so only two things ever move it: money actually spent (tuition, living
 * costs, one-off fees) and interest accrued on the loan (whether paid via an
 * EMI or capitalised onto the principal during a moratorium). An EMI's
 * *principal* portion doesn't touch net position either, since it just
 * converts cash into a smaller liability.
 *
 * Three scenarios share the same during-study cost and debt burden, then
 * diverge at graduation:
 *   - `optimistic`: a qualifying UK job starts the month after graduation.
 *   - `downside`: no qualifying job is found inside the Graduate Route
 *     window (`GRADUATE_ROUTE_MONTHS`) — the user keeps paying UK living
 *     costs with no income for that window, then returns home to their
 *     original salary. This is the scenario the tool exists to surface, so
 *     every consumer of this module must give it equal billing with
 *     `optimistic`, not hide it behind a default-off toggle.
 *   - `stayPut`: the counterfactual of never leaving — income accrues at
 *     the current salary with no costs at all.
 *
 * Both employed scenarios (`optimistic`, `stayPut`) compare *gross* income
 * streams — this module does not model ongoing cost of living once someone
 * is earning, in either country, because that was never one of the user's
 * inputs. The one exception is the downside's job-search window, where the
 * whole point is that UK living costs continue with no income to offset
 * them.
 */

export type RepaymentTiming = "during_study" | "after_study";

export type RoiInputs = {
  /** Total tuition for the whole degree, not per year. */
  tuitionGBP: number;
  livingCostPerMonthGBP: number;
  durationMonths: number;
  visaFeeGBP: number;
  ihsGBP: number;
  flightsGBP: number;
  depositsGBP: number;
  loanAmountINR: number;
  /** Annual, e.g. 9.15 for 9.15%. */
  loanInterestRatePercent: number;
  loanTenureMonths: number;
  repaymentTiming: RepaymentTiming;
  currentAnnualSalaryINR: number;
  postStudyAnnualSalaryGBP: number;
  gbpToInrRate: number;
};

/** How far out the chart and the 5/10-year snapshots run. */
export const HORIZON_MONTHS = 120;

/**
 * The Graduate Route job-search window the downside scenario burns through
 * before giving up and going home. 24 months for a Master's today, but this
 * is scheduled to fall to 18 months for visas applied for on or after
 * 1 Jan 2027 — see `ROI_ASSUMPTIONS`. Not user-editable: it's a policy fact,
 * not a personal input.
 */
export const GRADUATE_ROUTE_MONTHS = 24;

export type ItemizedCost = {
  tuitionGBP: number;
  livingCostsGBP: number;
  visaFeeGBP: number;
  ihsGBP: number;
  flightsGBP: number;
  depositsGBP: number;
  totalGBP: number;
  totalINR: number;
};

export type LoanSummary = {
  principalINR: number;
  /** Interest capitalised onto the principal during a study-period moratorium, before any EMI starts. */
  capitalizedInterestINR: number;
  monthlyEmiINR: number;
  emiStartMonth: number;
  totalInterestINR: number;
  totalRepaymentINR: number;
};

export type MonthlyPoint = {
  month: number;
  optimisticINR: number;
  downsideINR: number;
  stayPutINR: number;
};

export type NetPositionSnapshot = {
  years: number;
  optimisticINR: number;
  downsideINR: number;
  stayPutINR: number;
};

export type RoiResult = {
  itemized: ItemizedCost;
  loan: LoanSummary;
  series: MonthlyPoint[];
  breakEvenMonth: { optimistic: number | null; downside: number | null };
  netPositionAtYear: NetPositionSnapshot[];
};

/** Standard reducing-balance EMI. Falls back to a straight split at 0% interest. */
function monthlyEmi(principal: number, monthlyRate: number, tenureMonths: number): number {
  if (tenureMonths <= 0 || principal <= 0) return 0;
  if (monthlyRate === 0) return principal / tenureMonths;
  const factor = Math.pow(1 + monthlyRate, tenureMonths);
  return (principal * monthlyRate * factor) / (factor - 1);
}

/** Interest/principal split for each month of a loan's repayment, stopping once the balance clears. */
function amortizationSchedule(
  principal: number,
  monthlyRate: number,
  tenureMonths: number,
): { interest: number; principalPaid: number }[] {
  const emi = monthlyEmi(principal, monthlyRate, tenureMonths);
  const schedule: { interest: number; principalPaid: number }[] = [];
  let balance = principal;
  for (let i = 0; i < tenureMonths && balance > 0.005; i++) {
    const interest = balance * monthlyRate;
    const principalPaid = Math.min(emi - interest, balance);
    balance -= principalPaid;
    schedule.push({ interest, principalPaid });
  }
  return schedule;
}

export function calculateRoi(inputs: RoiInputs): RoiResult {
  const {
    tuitionGBP,
    livingCostPerMonthGBP,
    durationMonths,
    visaFeeGBP,
    ihsGBP,
    flightsGBP,
    depositsGBP,
    loanAmountINR,
    loanInterestRatePercent,
    loanTenureMonths,
    repaymentTiming,
    currentAnnualSalaryINR,
    postStudyAnnualSalaryGBP,
    gbpToInrRate,
  } = inputs;

  const livingCostsGBP = livingCostPerMonthGBP * durationMonths;
  const totalGBP = tuitionGBP + livingCostsGBP + visaFeeGBP + ihsGBP + flightsGBP + depositsGBP;
  const itemized: ItemizedCost = {
    tuitionGBP,
    livingCostsGBP,
    visaFeeGBP,
    ihsGBP,
    flightsGBP,
    depositsGBP,
    totalGBP,
    totalINR: totalGBP * gbpToInrRate,
  };

  const monthlyRate = loanInterestRatePercent / 100 / 12;
  const hasLoan = loanAmountINR > 0;

  // During a study-period moratorium, interest compounds monthly onto the
  // principal rather than being paid — tracked per month so the same
  // figures drive both the loan summary and the net-position series.
  const moratoriumInterestByMonth: number[] = [];
  let principalForEmi = loanAmountINR;
  let emiStartMonth = 1;
  if (hasLoan && repaymentTiming === "after_study" && durationMonths > 0) {
    let balance = loanAmountINR;
    for (let m = 1; m <= durationMonths; m++) {
      const interest = balance * monthlyRate;
      balance += interest;
      moratoriumInterestByMonth.push(interest);
    }
    principalForEmi = balance;
    emiStartMonth = durationMonths + 1;
  }

  const schedule = hasLoan ? amortizationSchedule(principalForEmi, monthlyRate, loanTenureMonths) : [];
  const capitalizedInterestINR = moratoriumInterestByMonth.reduce((s, v) => s + v, 0);
  const scheduleInterestINR = schedule.reduce((s, r) => s + r.interest, 0);
  const loan: LoanSummary = {
    principalINR: loanAmountINR,
    capitalizedInterestINR,
    monthlyEmiINR: hasLoan ? monthlyEmi(principalForEmi, monthlyRate, loanTenureMonths) : 0,
    emiStartMonth,
    totalInterestINR: capitalizedInterestINR + scheduleInterestINR,
    totalRepaymentINR: loanAmountINR + capitalizedInterestINR + scheduleInterestINR,
  };

  const livingCostPerMonthINR = livingCostPerMonthGBP * gbpToInrRate;
  const oneOffINR = (tuitionGBP + visaFeeGBP + ihsGBP + flightsGBP + depositsGBP) * gbpToInrRate;
  const postStudyMonthlyIncomeINR = (postStudyAnnualSalaryGBP / 12) * gbpToInrRate;
  const currentMonthlyIncomeINR = currentAnnualSalaryINR / 12;

  const series: MonthlyPoint[] = [{ month: 0, optimisticINR: 0, downsideINR: 0, stayPutINR: 0 }];
  let optimistic = 0;
  let downside = 0;
  let stayPut = 0;

  for (let m = 1; m <= HORIZON_MONTHS; m++) {
    let spend = 0;
    if (m <= durationMonths) {
      spend += livingCostPerMonthINR;
      if (m === 1) spend += oneOffINR;
    }

    let interest = 0;
    if (hasLoan) {
      if (repaymentTiming === "after_study" && m <= durationMonths) {
        interest = moratoriumInterestByMonth[m - 1] ?? 0;
      } else {
        const idx = m - emiStartMonth;
        interest = idx >= 0 && idx < schedule.length ? schedule[idx].interest : 0;
      }
    }

    optimistic -= spend + interest;
    downside -= spend + interest;

    if (m > durationMonths) {
      const monthsSinceGraduation = m - durationMonths;
      if (monthsSinceGraduation <= GRADUATE_ROUTE_MONTHS) {
        // Still searching in the UK: no qualifying income, but living
        // costs don't pause — this window is why the downside scenario
        // exists.
        downside -= livingCostPerMonthINR;
      } else {
        downside += currentMonthlyIncomeINR;
      }
      optimistic += postStudyMonthlyIncomeINR;
    }

    stayPut += currentMonthlyIncomeINR;

    optimistic = Math.round(optimistic);
    downside = Math.round(downside);
    stayPut = Math.round(stayPut);

    series.push({ month: m, optimisticINR: optimistic, downsideINR: downside, stayPutINR: stayPut });
  }

  const breakEvenMonth = {
    optimistic: findBreakEven(series, "optimisticINR"),
    downside: findBreakEven(series, "downsideINR"),
  };

  const netPositionAtYear: NetPositionSnapshot[] = [5, 10]
    .map((years) => years * 12)
    .filter((month) => month <= HORIZON_MONTHS)
    .map((month) => {
      const point = series[month];
      return {
        years: month / 12,
        optimisticINR: point.optimisticINR,
        downsideINR: point.downsideINR,
        stayPutINR: point.stayPutINR,
      };
    });

  return { itemized, loan, series, breakEvenMonth, netPositionAtYear };
}

/**
 * First month a scenario's net position matches or exceeds staying put, or
 * null if it never does within the horizon. Starts at month 1: month 0 is
 * the shared zero baseline for every scenario, not a real break-even.
 */
function findBreakEven(
  series: MonthlyPoint[],
  key: "optimisticINR" | "downsideINR",
): number | null {
  for (let i = 1; i < series.length; i++) {
    if (series[i][key] >= series[i].stayPutINR) return series[i].month;
  }
  return null;
}
