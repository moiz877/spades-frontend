'use client';

import { Source_Serif_4 } from 'next/font/google';
import type { BenchmarkResult, NarrativeSections } from '@/lib/teaTypes';
import { VERDICT_STYLES } from '@/lib/teaVerdict';

// Scoped to this component only (via the variable + className below), not
// applied globally -- the report card is meant to read like a printed
// consultancy deliverable inside the app's otherwise dark/cyan shell, not
// change the whole product's typography.
const reportSerif = Source_Serif_4({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-report-serif' });

export function ExecutiveSummaryReport({
  narrative,
  benchmarks,
}: {
  narrative: NarrativeSections;
  benchmarks?: BenchmarkResult[];
}) {
  const verdict = VERDICT_STYLES[narrative.verdict];
  const VerdictIcon = verdict.icon;
  const { hurdle_comparison: hurdle } = narrative;

  return (
    <div className={`${reportSerif.variable} rounded-xl border border-white/10 bg-[#f7f5f0] p-6 text-[#1c1a16] shadow-xl sm:p-8`}>
      <div className="flex items-start justify-between gap-4 border-b border-black/10 pb-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-black/40">Executive summary</p>
          <h2 className="mt-1 font-[family-name:var(--font-report-serif)] text-2xl font-semibold text-[#1c1a16]">
            Investment assessment
          </h2>
        </div>
        <span className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${verdict.classes}`}>
          <VerdictIcon size={14} weight="fill" />
          {verdict.label}
        </span>
      </div>

      <p className="mt-5 font-[family-name:var(--font-report-serif)] text-[15px] leading-relaxed text-[#2b2820]">
        {narrative.executive_summary}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 border-t border-black/10 pt-5 sm:grid-cols-2">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-black/40">IRR vs. hurdle rate</p>
          <p className="mt-1 text-sm text-[#2b2820]">
            {hurdle.meets_irr_hurdle === null
              ? `Not calculable (hurdle: ${(hurdle.irr_hurdle_pct * 100).toFixed(0)}%)`
              : hurdle.meets_irr_hurdle
                ? `Clears the ${(hurdle.irr_hurdle_pct * 100).toFixed(0)}% hurdle`
                : `Below the ${(hurdle.irr_hurdle_pct * 100).toFixed(0)}% hurdle`}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-black/40">Payback vs. target</p>
          <p className="mt-1 text-sm text-[#2b2820]">
            {hurdle.meets_payback_hurdle === null
              ? `Never (target: ${hurdle.payback_hurdle_years}yr)`
              : hurdle.meets_payback_hurdle
                ? `Within the ${hurdle.payback_hurdle_years}-year target`
                : `Exceeds the ${hurdle.payback_hurdle_years}-year target`}
          </p>
        </div>
      </div>

      {narrative.key_risks.length > 0 && (
        <div className="mt-6 border-t border-black/10 pt-5">
          <h3 className="font-[family-name:var(--font-report-serif)] text-sm font-semibold text-[#1c1a16]">
            Key risks
          </h3>
          <ul className="mt-2 flex flex-col gap-2">
            {narrative.key_risks.map((risk, i) => (
              <li key={i} className="flex gap-2 text-sm leading-relaxed text-[#2b2820]">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-black/40" />
                {risk}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 border-t border-black/10 pt-5">
        <h3 className="font-[family-name:var(--font-report-serif)] text-sm font-semibold text-[#1c1a16]">
          Recommendations
        </h3>
        <ul className="mt-2 flex flex-col gap-2">
          {narrative.recommendations.map((rec, i) => (
            <li key={i} className="flex gap-2 text-sm leading-relaxed text-[#2b2820]">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-black/40" />
              {rec}
            </li>
          ))}
        </ul>
      </div>

      {benchmarks && benchmarks.length > 0 && (
        <div className="mt-6 border-t border-black/10 pt-5">
          <h3 className="font-[family-name:var(--font-report-serif)] text-sm font-semibold text-[#1c1a16]">
            Price benchmarking against EIA projections
          </h3>
          <div className="mt-3 flex flex-col gap-3">
            {benchmarks.map((b, i) => (
              <div key={i} className="rounded-lg border border-black/10 bg-white/50 p-3 text-sm text-[#2b2820]">
                <p className="font-medium">{b.name}</p>
                {b.matched_series && b.projected_range ? (
                  <>
                    <p className="mt-1 text-black/70">
                      Assumed ${b.assumed_price.toLocaleString()}/unit sits at the {b.percentile}th percentile of
                      the ${b.projected_range.min.toLocaleString()}-${b.projected_range.max.toLocaleString()}{' '}
                      projected range (median ${b.projected_range.median.toLocaleString()}).
                    </p>
                    <p className="mt-1 text-xs italic text-black/40">{b.note}</p>
                  </>
                ) : (
                  <p className="mt-1 text-xs italic text-black/40">{b.note}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-6 border-t border-black/10 pt-4 text-[11px] italic text-black/40">
        Generated automatically from the inputs and assumptions provided. Not a substitute for a full feasibility
        study.
      </p>
    </div>
  );
}
