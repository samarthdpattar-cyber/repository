import React from 'react';
import { BookOpen, CheckSquare, LayoutDashboard, MessageSquareText, ShieldBan } from 'lucide-react';

const PROOF_METRICS = [
  {
    value: '7 Stages',
    label: 'End-to-end document extraction, segmentation, classification & audit',
  },
  {
    value: '3 Versions',
    label: 'Built-in Metro Tenant Protection rulebooks (v1.0, v2.0, v2.1) + JSON hot-load',
  },
  {
    value: '100% Verified',
    label: 'Every flagged warning requires a matching active Rule ID & clause excerpt',
  },
  {
    value: '0 Invented Laws',
    label: 'Strict refusal guard when a topic is absent from the active rulebook',
  },
];

export const ModesSection: React.FC = () => {
  return (
    <section id="modes" className="bg-white border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-16 space-y-10">
        {/* Header + Quantified Proof Strip */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
          <div className="lg:col-span-6 space-y-2">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 text-balance">
              Built for everyday renters. Grounded strictly in real rulebooks.
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Every LeaseGuard AI report pairs five transparent verification modes so tenants can
              inspect exact clause wording without fabricated legal claims.
            </p>
          </div>

          <div className="lg:col-span-6 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 lg:pt-0">
            {PROOF_METRICS.map((metric) => (
              <div key={metric.value} className="space-y-1 border-t border-slate-200 pt-3">
                <div className="font-display text-lg font-bold text-slate-950 tabular-nums">
                  {metric.value}
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">{metric.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Asymmetric 6-Column Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {/* Marquee Mode 1 (span 3) */}
          <div className="md:col-span-3 rounded-xl border border-slate-200 bg-slate-50/50 p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono-code text-slate-400 tabular-nums">
                <span>01.</span>
                <LayoutDashboard className="w-4 h-4 text-indigo-900" />
              </div>
              <h3 className="font-display text-lg font-bold text-slate-950">Risk Dashboard</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Summarizes overall agreement exposure (0–100), clause counts, and a scannable
                Category Risk Overview across Security Deposit, Rent, Maintenance, and Termination.
              </p>
            </div>
            <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
              <span>Categories audited automatically</span>
              <span className="font-mono-code text-indigo-950 font-semibold tabular-nums">
                9 Clause Types
              </span>
            </div>
          </div>

          {/* Marquee Mode 2 (span 3) */}
          <div className="md:col-span-3 rounded-xl border border-slate-200 bg-slate-50/50 p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono-code text-slate-400 tabular-nums">
                <span>02.</span>
                <BookOpen className="w-4 h-4 text-indigo-900" />
              </div>
              <h3 className="font-display text-lg font-bold text-slate-950">Evidence Mode</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Displays the exact quoted agreement excerpt side by side with the authoritative
                Rule ID, rulebook version, and check criteria behind every risk flag.
              </p>
            </div>
            <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
              <span>Citation verification</span>
              <span className="font-mono-code text-indigo-950 font-semibold">
                Agreement Excerpt ↔ Rule ID
              </span>
            </div>
          </div>

          {/* Secondary Mode 3 (span 2) */}
          <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50/50 p-5 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono-code text-slate-400 tabular-nums">
              <span>03.</span>
              <MessageSquareText className="w-4 h-4 text-indigo-900" />
            </div>
            <h3 className="font-display text-base font-bold text-slate-950">
              Simple English Mode
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Translates dense rental clauses into plain, everyday language so non-lawyers grasp
              deposit caps, repair duties, and lock-in penalties immediately.
            </p>
          </div>

          {/* Secondary Mode 4 (span 2) */}
          <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50/50 p-5 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono-code text-slate-400 tabular-nums">
              <span>04.</span>
              <CheckSquare className="w-4 h-4 text-indigo-900" />
            </div>
            <h3 className="font-display text-base font-bold text-slate-950">
              Tenant Action Checklist
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Produces practical, checkable questions to ask the landlord and copyable counter-edits
              grounded strictly in the flagged rule criteria.
            </p>
          </div>

          {/* Secondary Mode 5 (span 2) */}
          <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50/50 p-5 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono-code text-slate-400 tabular-nums">
              <span>05.</span>
              <ShieldBan className="w-4 h-4 text-indigo-900" />
            </div>
            <h3 className="font-display text-base font-bold text-slate-950">No Fake Laws Guard</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Server-side citation checks strip unverified claims and refuse topics not covered by
              the active rulebook instead of inventing statutes.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
