"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Calculator,
  Info,
  AlertTriangle,
  Link as LinkIcon,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { getAllCountries } from "@/data/countries";
import type { CourseHub } from "@/data/courses";
import { formatMoney, formatINRCompact, rangeMidpoint } from "@/lib/money";
import { PRIMARY_DESTINATION } from "@/config/site";
import { calculateRoi, GRADUATE_ROUTE_MONTHS, type RepaymentTiming, type RoiInputs } from "@/lib/roi-calculator";
import {
  ROI_ASSUMPTIONS,
  ROI_METHODOLOGY_NOTES,
  DEFAULT_GBP_TO_INR_RATE,
  DEFAULT_VISA_FEE_GBP,
  DEFAULT_IHS_ANNUAL_GBP,
  DEFAULT_LOAN_INTEREST_RATE_PERCENT,
} from "@/lib/roi-assumptions";
import { NetPositionChart } from "./net-position-chart";

/** Every editable number lives as a string in state — an empty field or a
 * half-typed "1." shouldn't be forced into a number until it's actually used. */
type FormState = {
  tuitionGBP: string;
  livingCostPerMonthGBP: string;
  durationMonths: string;
  visaFeeGBP: string;
  ihsGBP: string;
  flightsGBP: string;
  depositsGBP: string;
  loanAmountINR: string;
  loanInterestRatePercent: string;
  loanTenureMonths: string;
  repaymentTiming: RepaymentTiming;
  currentAnnualSalaryINR: string;
  postStudyAnnualSalaryGBP: string;
  gbpToInrRate: string;
};

/** Short URL param keys — kept short because there are thirteen of them. */
const PARAM_KEYS: Record<keyof FormState | "course", string> = {
  course: "course",
  tuitionGBP: "tu",
  livingCostPerMonthGBP: "lv",
  durationMonths: "du",
  visaFeeGBP: "vf",
  ihsGBP: "ih",
  flightsGBP: "fl",
  depositsGBP: "dp",
  loanAmountINR: "la",
  loanInterestRatePercent: "ir",
  loanTenureMonths: "lt",
  repaymentTiming: "rt",
  currentAnnualSalaryINR: "cs",
  postStudyAnnualSalaryGBP: "ps",
  gbpToInrRate: "fx",
};

const DEFAULT_DURATION_MONTHS = 12;

function defaultsFromHub(hub: CourseHub | undefined): FormState {
  const tuition = hub ? rangeMidpoint({ min: hub.tuitionMin ?? null, max: hub.tuitionMax ?? null, currency: "GBP" }) : null;
  const living = hub ? rangeMidpoint({ min: hub.livingCostMin ?? null, max: hub.livingCostMax ?? null, currency: "GBP" }) : null;
  const salary = hub ? rangeMidpoint({ min: hub.salaryMin ?? null, max: hub.salaryMax ?? null, currency: "GBP" }) : null;
  const ihsForCourse = Math.round(DEFAULT_IHS_ANNUAL_GBP * (DEFAULT_DURATION_MONTHS / 12));

  return {
    tuitionGBP: tuition != null ? String(Math.round(tuition)) : "",
    livingCostPerMonthGBP: living != null ? String(Math.round(living)) : "",
    durationMonths: String(DEFAULT_DURATION_MONTHS),
    visaFeeGBP: String(DEFAULT_VISA_FEE_GBP),
    ihsGBP: String(ihsForCourse),
    flightsGBP: "",
    depositsGBP: "",
    loanAmountINR: "",
    loanInterestRatePercent: String(DEFAULT_LOAN_INTEREST_RATE_PERCENT),
    loanTenureMonths: "",
    repaymentTiming: "after_study",
    currentAnnualSalaryINR: "",
    postStudyAnnualSalaryGBP: salary != null ? String(Math.round(salary)) : "",
    gbpToInrRate: String(DEFAULT_GBP_TO_INR_RATE),
  };
}

function readParamsIntoState(params: URLSearchParams, fallback: FormState): FormState {
  const next = { ...fallback };
  for (const key of Object.keys(PARAM_KEYS) as (keyof typeof PARAM_KEYS)[]) {
    if (key === "course") continue;
    const raw = params.get(PARAM_KEYS[key]);
    if (raw == null || raw === "") continue;
    if (key === "repaymentTiming") {
      if (raw === "during_study" || raw === "after_study") next.repaymentTiming = raw;
    } else {
      (next as Record<string, string>)[key] = raw;
    }
  }
  return next;
}

function num(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function monthsToYearsLabel(months: number): string {
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years === 0) return `${rem} month${rem === 1 ? "" : "s"}`;
  if (rem === 0) return `${years} year${years === 1 ? "" : "s"}`;
  return `${years}y ${rem}mo`;
}

function NumberField({
  id,
  label,
  value,
  onChange,
  prefix,
  suffix,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
  suffix?: string;
  hint?: string;
}) {
  return (
    <div>
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      <div className="mt-1.5 flex items-center gap-2">
        {prefix && <span className="text-sm text-ink-soft">{prefix}</span>}
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1"
        />
        {suffix && <span className="whitespace-nowrap text-sm text-ink-soft">{suffix}</span>}
      </div>
      {hint && <p className="mt-1 text-micro text-ink-soft">{hint}</p>}
    </div>
  );
}

export default function ROICalculatorPage({ hubs }: { hubs: CourseHub[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const countries = getAllCountries().filter((c) => c.live);
  const [selectedCountry, setSelectedCountry] = useState(PRIMARY_DESTINATION);

  const initialCourse = searchParams.get(PARAM_KEYS.course) ?? "";
  const [selectedCourse, setSelectedCourse] = useState(
    initialCourse && hubs.some((h) => h.slug === initialCourse) ? initialCourse : "",
  );
  const course = hubs.find((c) => c.slug === selectedCourse);

  const [form, setForm] = useState<FormState>(() =>
    readParamsIntoState(searchParams, defaultsFromHub(course)),
  );
  const [copied, setCopied] = useState(false);

  const syncUrl = useCallback(
    (nextForm: FormState, nextCourse: string) => {
      const params = new URLSearchParams();
      if (nextCourse) params.set(PARAM_KEYS.course, nextCourse);
      for (const key of Object.keys(PARAM_KEYS) as (keyof typeof PARAM_KEYS)[]) {
        if (key === "course") continue;
        const value = nextForm[key];
        if (value !== "") params.set(PARAM_KEYS[key], String(value));
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router],
  );

  const updateField = (key: keyof FormState, value: string) => {
    const next = { ...form, [key]: value };
    setForm(next);
    syncUrl(next, selectedCourse);
  };

  const handleCourseChange = (slug: string) => {
    setSelectedCourse(slug);
    const hub = hubs.find((c) => c.slug === slug);
    const next = defaultsFromHub(hub);
    setForm(next);
    syncUrl(next, slug);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied; the URL bar itself is already the
      // shareable link, so there's nothing else to fall back to.
    }
  };

  const inputs: RoiInputs | null = useMemo(() => {
    if (!course) return null;
    return {
      tuitionGBP: num(form.tuitionGBP),
      livingCostPerMonthGBP: num(form.livingCostPerMonthGBP),
      durationMonths: Math.max(1, num(form.durationMonths)),
      visaFeeGBP: num(form.visaFeeGBP),
      ihsGBP: num(form.ihsGBP),
      flightsGBP: num(form.flightsGBP),
      depositsGBP: num(form.depositsGBP),
      loanAmountINR: num(form.loanAmountINR),
      loanInterestRatePercent: num(form.loanInterestRatePercent),
      loanTenureMonths: num(form.loanTenureMonths),
      repaymentTiming: form.repaymentTiming,
      currentAnnualSalaryINR: num(form.currentAnnualSalaryINR),
      postStudyAnnualSalaryGBP: num(form.postStudyAnnualSalaryGBP),
      gbpToInrRate: num(form.gbpToInrRate) || DEFAULT_GBP_TO_INR_RATE,
    };
  }, [course, form]);

  const result = useMemo(() => (inputs ? calculateRoi(inputs) : null), [inputs]);

  const fmtGBP = (n: number) => formatMoney(Math.round(n), "GBP");
  const fmtINR = (n: number) => formatINRCompact(Math.round(n));

  return (
    <div className="mx-auto max-w-3xl gutter py-16">
      <div className="mb-8 text-center">
        <Badge variant="outline" className="mb-4">
          <Calculator className="mr-1.5 h-3.5 w-3.5" />
          ROI Calculator
        </Badge>
        <h1 className="text-3xl font-bold">What studying abroad actually costs you</h1>
        <p className="mt-2 text-muted-foreground">
          Enter your real numbers — loan, salary, exchange rate — to see cost,
          break-even and the downside case, not just a fee comparison.
        </p>
      </div>

      <div className="mb-8 flex gap-3 rounded-r-lg border-l-[3px] border-sky bg-sky-dim px-4 py-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-sky-text" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">
          This is an estimate to help you think through the decision. It is{" "}
          <strong>not financial advice</strong>. Verify loan terms, visa fees
          and exchange rates with your lender and official sources before
          making a decision.
        </p>
      </div>

      {/* Destination / course */}
      <Card className="mb-8">
        <CardContent className="p-6 space-y-4">
          <div>
            <Label className="text-sm font-medium">Destination</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {countries.map((c) => (
                <Button
                  key={c.slug}
                  variant={selectedCountry === c.slug ? "default" : "outline"}
                  size="sm"
                  disabled={!c.live}
                  onClick={() => setSelectedCountry(c.slug)}
                  className="gap-1.5"
                >
                  <span>{c.flagEmoji}</span>
                  {c.shortLabel}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Course</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {hubs.map((c) => (
                <Button
                  key={c.slug}
                  variant={selectedCourse === c.slug ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleCourseChange(c.slug)}
                >
                  {c.name}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {course && inputs && result && (
        <div className="space-y-8">
          {/* Inputs */}
          <Card>
            <CardContent className="space-y-6 p-6">
              <div>
                <h2 className="font-semibold">Course costs</h2>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <NumberField
                    id="tuition"
                    label="Total tuition for the whole degree"
                    prefix="£"
                    value={form.tuitionGBP}
                    onChange={(v) => updateField("tuitionGBP", v)}
                    hint="Prefilled from this course's typical annual fee — raise it if your programme runs more than a year."
                  />
                  <NumberField
                    id="living"
                    label="Living costs per month"
                    prefix="£"
                    value={form.livingCostPerMonthGBP}
                    onChange={(v) => updateField("livingCostPerMonthGBP", v)}
                  />
                  <NumberField
                    id="duration"
                    label="Course duration"
                    suffix="months"
                    value={form.durationMonths}
                    onChange={(v) => updateField("durationMonths", v)}
                  />
                </div>
              </div>

              <div>
                <h2 className="font-semibold">One-off costs</h2>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <NumberField
                    id="visa"
                    label="Visa application fee"
                    prefix="£"
                    value={form.visaFeeGBP}
                    onChange={(v) => updateField("visaFeeGBP", v)}
                  />
                  <NumberField
                    id="ihs"
                    label="Immigration Health Surcharge"
                    prefix="£"
                    value={form.ihsGBP}
                    onChange={(v) => updateField("ihsGBP", v)}
                  />
                  <NumberField
                    id="flights"
                    label="Flights"
                    prefix="£"
                    value={form.flightsGBP}
                    onChange={(v) => updateField("flightsGBP", v)}
                    hint="No universal default — enter your own estimate."
                  />
                  <NumberField
                    id="deposits"
                    label="Deposits (accommodation, CAS, etc.)"
                    prefix="£"
                    value={form.depositsGBP}
                    onChange={(v) => updateField("depositsGBP", v)}
                    hint="No universal default — enter your own estimate."
                  />
                </div>
              </div>

              <div>
                <h2 className="font-semibold">Loan</h2>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <NumberField
                    id="loan-amount"
                    label="Loan amount"
                    prefix="₹"
                    value={form.loanAmountINR}
                    onChange={(v) => updateField("loanAmountINR", v)}
                    hint="Leave at 0 if you're self-funding."
                  />
                  <NumberField
                    id="loan-rate"
                    label="Interest rate"
                    suffix="% p.a."
                    value={form.loanInterestRatePercent}
                    onChange={(v) => updateField("loanInterestRatePercent", v)}
                  />
                  <NumberField
                    id="loan-tenure"
                    label="Repayment tenure"
                    suffix="months"
                    value={form.loanTenureMonths}
                    onChange={(v) => updateField("loanTenureMonths", v)}
                  />
                  <div>
                    <Label className="text-sm font-medium">Repayment starts</Label>
                    <RadioGroup
                      value={form.repaymentTiming}
                      onValueChange={(v) => updateField("repaymentTiming", v as RepaymentTiming)}
                      className="mt-2 flex gap-4"
                    >
                      <label className="flex items-center gap-2 text-sm">
                        <RadioGroupItem value="during_study" id="rt-during" />
                        During study
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <RadioGroupItem value="after_study" id="rt-after" />
                        After study
                      </label>
                    </RadioGroup>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="font-semibold">Income</h2>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <NumberField
                    id="current-salary"
                    label="Your current annual salary"
                    prefix="₹"
                    value={form.currentAnnualSalaryINR}
                    onChange={(v) => updateField("currentAnnualSalaryINR", v)}
                  />
                  <NumberField
                    id="post-study-salary"
                    label="Expected post-study annual salary"
                    prefix="£"
                    value={form.postStudyAnnualSalaryGBP}
                    onChange={(v) => updateField("postStudyAnnualSalaryGBP", v)}
                    hint="Prefilled from this course's graduate salary range."
                  />
                </div>
              </div>

              <div>
                <h2 className="font-semibold">Exchange rate</h2>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <NumberField
                    id="fx-rate"
                    label="GBP → INR rate"
                    prefix="₹"
                    suffix="per £1"
                    value={form.gbpToInrRate}
                    onChange={(v) => updateField("gbpToInrRate", v)}
                    hint={`Assumed ₹${DEFAULT_GBP_TO_INR_RATE} as of 16 Sep 2026 (XE.com mid-market) — editable.`}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assumptions panel — always visible, never behind a toggle */}
          <Card className="border-sky/30">
            <CardContent className="p-6">
              <h2 className="flex items-center gap-2 font-semibold">
                <Info className="h-4 w-4 text-sky-text" aria-hidden="true" />
                Assumptions behind this calculation
              </h2>
              <dl className="mt-4 space-y-3">
                {ROI_ASSUMPTIONS.map((a) => (
                  <div key={a.id} className="text-sm">
                    <dt className="font-medium">{a.label}</dt>
                    <dd className="text-ink-soft">
                      {a.value}{" "}
                      <a
                        href={a.source}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-sky-text"
                      >
                        {a.sourceLabel}
                      </a>
                      , checked {a.lastChecked}
                    </dd>
                  </div>
                ))}
              </dl>
              <h3 className="mt-5 text-sm font-semibold">How this is calculated</h3>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-ink-soft">
                {ROI_METHODOLOGY_NOTES.map((note, i) => (
                  <li key={i}>{note}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Itemized cost */}
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold">Total cost of the degree</h2>
              <dl className="mt-4 space-y-2">
                {[
                  ["Tuition", result.itemized.tuitionGBP],
                  ["Living costs", result.itemized.livingCostsGBP],
                  ["Visa fee", result.itemized.visaFeeGBP],
                  ["Immigration Health Surcharge", result.itemized.ihsGBP],
                  ["Flights", result.itemized.flightsGBP],
                  ["Deposits", result.itemized.depositsGBP],
                ].map(([label, value]) => (
                  <div key={label as string} className="flex items-center justify-between border-b border-line py-1.5 text-sm">
                    <dt className="text-ink-soft">{label}</dt>
                    <dd>{fmtGBP(value as number)}</dd>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 text-base font-semibold">
                  <dt>Total</dt>
                  <dd>
                    {fmtGBP(result.itemized.totalGBP)} · {fmtINR(result.itemized.totalINR)}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Loan summary */}
          {inputs.loanAmountINR > 0 && (
            <Card>
              <CardContent className="p-6">
                <h2 className="font-semibold">Loan repayment</h2>
                {inputs.loanTenureMonths <= 0 ? (
                  <p className="mt-3 text-sm text-ink-soft">
                    Enter a repayment tenure above to see your EMI and total
                    repayment — a £0 EMI below isn&rsquo;t a free loan, it
                    just means no tenure is set yet.
                  </p>
                ) : (
                  <dl className="mt-4 space-y-2 text-sm">
                    <div className="flex items-center justify-between border-b border-line py-1.5">
                      <dt className="text-ink-soft">Principal</dt>
                      <dd>{fmtINR(result.loan.principalINR)}</dd>
                    </div>
                    {result.loan.capitalizedInterestINR > 0 && (
                      <div className="flex items-center justify-between border-b border-line py-1.5">
                        <dt className="text-ink-soft">Interest added during moratorium</dt>
                        <dd>{fmtINR(result.loan.capitalizedInterestINR)}</dd>
                      </div>
                    )}
                    <div className="flex items-center justify-between border-b border-line py-1.5">
                      <dt className="text-ink-soft">Monthly EMI</dt>
                      <dd>{fmtINR(result.loan.monthlyEmiINR)}</dd>
                    </div>
                    <div className="flex items-center justify-between pt-2 text-base font-semibold">
                      <dt>Total repayment (incl. interest)</dt>
                      <dd>{fmtINR(result.loan.totalRepaymentINR)}</dd>
                    </div>
                  </dl>
                )}
              </CardContent>
            </Card>
          )}

          {/* Optimistic vs downside — equal visual weight, downside never hidden */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="border-[#2c9676]/30">
              <CardContent className="p-6">
                <span className="font-mono text-mini uppercase tracking-wide text-[#2c9676]">
                  If you secure a qualifying job
                </span>
                <p className="mt-2 text-sm text-ink-soft">
                  Break-even vs. staying in your current job:
                </p>
                <p className="mt-1 text-2xl font-bold">
                  {result.breakEvenMonth.optimistic != null
                    ? monthsToYearsLabel(result.breakEvenMonth.optimistic)
                    : "Beyond 10 years"}
                </p>
              </CardContent>
            </Card>

            <Card className="border-[#dc8f09]/30">
              <CardContent className="p-6">
                <span className="font-mono text-mini uppercase tracking-wide text-[#b3720a]">
                  If you don&rsquo;t, within {monthsToYearsLabel(GRADUATE_ROUTE_MONTHS)}
                </span>
                <p className="mt-2 text-sm text-ink-soft">
                  Break-even vs. staying in your current job:
                </p>
                <p className="mt-1 text-2xl font-bold">
                  {result.breakEvenMonth.downside != null
                    ? monthsToYearsLabel(result.breakEvenMonth.downside)
                    : "Doesn't break even within 10 years"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Net position snapshots */}
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold">Net position, both scenarios vs. staying put</h2>
              <div className="mt-4 space-y-4">
                {result.netPositionAtYear.map((snap) => (
                  <div key={snap.years}>
                    <p className="font-mono text-mini uppercase tracking-wide text-ink-soft">
                      Year {snap.years}
                    </p>
                    <div className="mt-2 grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-micro uppercase text-ink-soft">Stay put</p>
                        <p className="font-semibold">{fmtINR(snap.stayPutINR)}</p>
                      </div>
                      <div>
                        <p className="text-micro uppercase text-[#2c9676]">Job secured</p>
                        <p className="font-semibold">{fmtINR(snap.optimisticINR)}</p>
                      </div>
                      <div>
                        <p className="text-micro uppercase text-[#b3720a]">No job in time</p>
                        <p className="font-semibold">{fmtINR(snap.downsideINR)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Chart */}
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold">Cumulative net position over 10 years</h2>
              <div className="mt-4">
                <NetPositionChart series={result.series} formatValue={fmtINR} />
              </div>
            </CardContent>
          </Card>

          <Button variant="outline" size="sm" onClick={handleCopyLink} className="gap-2">
            {copied ? <Check className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
            {copied ? "Link copied" : "Copy shareable link"}
          </Button>
        </div>
      )}

      {course && !inputs && (
        <Card>
          <CardContent className="p-12 text-center">
            <Calculator className="mx-auto h-12 w-12 text-muted-foreground/30" />
          </CardContent>
        </Card>
      )}

      {!course && (
        <Card>
          <CardContent className="p-12 text-center">
            <Calculator className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <h3 className="mt-4 text-lg font-semibold text-muted-foreground">
              Select a course to start
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose a destination and course above — every field below will
              be editable once you do.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
