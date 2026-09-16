/**
 * Every rate, average and default the ROI calculator prefills, each dated
 * and sourced — the calculator's assumptions panel renders this list
 * directly rather than hardcoding numbers into the UI. Update `value` and
 * `lastChecked` together when a figure is re-verified; don't let one drift
 * without the other.
 */

export type SourcedAssumption = {
  id: string;
  label: string;
  value: string;
  source: string;
  sourceLabel: string;
  lastChecked: string;
};

export const DEFAULT_GBP_TO_INR_RATE = 129.3;
export const DEFAULT_VISA_FEE_GBP = 558;
export const DEFAULT_IHS_ANNUAL_GBP = 776;
export const DEFAULT_LOAN_INTEREST_RATE_PERCENT = 9.15;

export const ROI_ASSUMPTIONS: SourcedAssumption[] = [
  {
    id: "gbp-inr-rate",
    label: "GBP → INR exchange rate",
    value: `₹${DEFAULT_GBP_TO_INR_RATE.toFixed(2)} per £1 (mid-market — you'll pay more via a bank or remittance service)`,
    source: "https://www.xe.com/currencyconverter/convert/?Amount=1&From=GBP&To=INR",
    sourceLabel: "XE.com",
    lastChecked: "2026-09-16",
  },
  {
    id: "visa-fee",
    label: "UK Student visa application fee",
    value: `£${DEFAULT_VISA_FEE_GBP} (applying from outside the UK)`,
    source: "https://www.gov.uk/student-visa/what-you-need-to-apply",
    sourceLabel: "gov.uk — Student visa",
    lastChecked: "2026-09-16",
  },
  {
    id: "ihs-rate",
    label: "Immigration Health Surcharge (IHS)",
    value: `£${DEFAULT_IHS_ANNUAL_GBP} per year of visa length`,
    source: "https://www.gov.uk/healthcare-immigration-application/how-much-pay",
    sourceLabel: "gov.uk — Healthcare surcharge",
    lastChecked: "2026-09-16",
  },
  {
    id: "graduate-route-window",
    label: "Graduate Route job-search window",
    value:
      "2 years (3 for PhD) for visas applied for on or before 31 Dec 2026 — falling to 18 months for applications from 1 Jan 2027. This calculator's downside scenario uses 2 years; check the current rule if you'll graduate near that cutover.",
    source: "https://www.gov.uk/graduate-visa",
    sourceLabel: "gov.uk — Graduate visa",
    lastChecked: "2026-09-16",
  },
  {
    id: "loan-interest-rate",
    label: "Education loan interest rate (default)",
    value: `${DEFAULT_LOAN_INTEREST_RATE_PERCENT}% p.a. — SBI Global Ed-Vantage representative rate. Varies by lender, collateral and your profile; use your actual sanction letter rate if you have one.`,
    source: "https://sbi.co.in",
    sourceLabel: "sbi.co.in",
    lastChecked: "2026-09-16",
  },
];

/**
 * Methodology notes, as distinct from sourced numbers: choices this
 * calculator makes about *how* to model your situation, not facts it looked
 * up. Shown alongside `ROI_ASSUMPTIONS` in the panel.
 */
export const ROI_METHODOLOGY_NOTES: string[] = [
  "This tracks net position (assets minus liabilities), not month-to-month cash in hand. If loan repayment starts during your studies, you still need enough income or savings to actually make those payments alongside living costs.",
  "Tuition and one-off costs (visa, IHS, flights, deposits) are treated as paid in month 1. Living costs are spread evenly across your course duration.",
  "The downside scenario assumes no income during the Graduate Route job-search window, and that UK living costs continue at your monthly rate through it. After returning home, income resumes at your current annual salary.",
  "Post-study UK income and your current India income are compared gross — this calculator doesn't model your ongoing cost of living once you're earning, in either country, since that wasn't one of your inputs.",
  "If your loan's repayment starts after your studies, interest accrues monthly on the unpaid balance during that gap and is added to the principal once repayment begins (a common but not universal term — check your actual loan agreement).",
];
