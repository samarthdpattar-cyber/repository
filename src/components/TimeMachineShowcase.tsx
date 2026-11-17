import React from 'react';
import { ArrowRight, GitCompare, PlusCircle, RefreshCw, Sparkles } from 'lucide-react';

interface TimeMachineShowcaseProps {
  onRunTimeMachineDemo: () => void;
}

const TIME_MACHINE_STEPS = [
  '1. Upload a rental agreement (PDF or text).',
  '2. AI segments and identifies important clauses.',
  '3. Checks every clause against the active rulebook version.',
  '4. Highlights risky clauses with plain explanations & citations.',
  '5. Regional housing rules update — a new rulebook version is loaded.',
  '6. Click "Compare Rule Changes" to re-evaluate the agreement.',
  '7. Inspect exactly which risks appeared, disappeared, or changed.',
];

export const TimeMachineShowcase: React.FC<TimeMachineShowcaseProps> = ({
  onRunTimeMachineDemo,
}) => {
  return (
    <section id="time-machine" className="bg-indigo-950 text-white border-y border-indigo-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="text-xs font-semibold text-indigo-200 tracking-wide">
              Signature Feature · Agreement Time Machine
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white text-balance">
              Watch how lease risk shifts when regional rules evolve.
            </h2>
            <p className="text-sm sm:text-base text-indigo-100/85 leading-relaxed max-w-2xl">
              Housing regulations change—deposit caps tighten, notice windows extend, and older
              clauses are repealed. Load an updated rulebook JSON or switch versions without code
              changes, then click <strong className="text-white">Compare Rule Changes</strong> to
              audit the exact delta on previously reviewed leases.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 pt-2 text-xs text-indigo-100/90">
              {TIME_MACHINE_STEPS.map((step) => (
                <div key={step} className="flex items-start gap-2">
                  <span className="text-amber-300 font-bold">·</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>

            <div className="pt-3">
              <button
                type="button"
                onClick={onRunTimeMachineDemo}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white hover:bg-indigo-50 text-indigo-950 text-sm font-semibold transition-colors cursor-pointer"
              >
                <GitCompare className="w-4 h-4" />
                <span>Compare Rule Changes (v1.0 → v2.0)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Visual Diff Snapshot */}
          <div className="lg:col-span-5 rounded-xl bg-white/8 border border-white/15 p-5 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white">Example Amendment Delta</span>
              <span className="font-mono-code text-indigo-200">v1.0 (2024) → v2.0 (2025)</span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="rounded-lg bg-red-500/15 border border-red-400/30 p-3 flex items-start gap-2.5">
                <PlusCircle className="w-4 h-4 text-red-300 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">
                    Appeared · DEP-01 (v2.0) Security Deposit Cap
                  </div>
                  <div className="text-indigo-100/80 mt-0.5">
                    2.5-month deposit passed v1.0 (3-month cap), now flagged High Risk under v2.0
                    (2-month cap).
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-amber-400/15 border border-amber-300/30 p-3 flex items-start gap-2.5">
                <RefreshCw className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">
                    Changed · ESC-01 (v1.0 → v2.0) Escalation Ceiling
                  </div>
                  <div className="text-indigo-100/80 mt-0.5">
                    Annual escalation limit tightened from 10% (Medium) to 5% (High).
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-emerald-400/15 border border-emerald-300/30 p-3 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">
                    Disappeared · SUB-01 (Repealed in v2.1)
                  </div>
                  <div className="text-indigo-100/80 mt-0.5">
                    Superseded administrative sublet-fee check removed cleanly on re-analysis.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
