import React, { useState } from 'react';
import { ArrowRight, BookOpen, GitCompare, ShieldAlert } from 'lucide-react';
import { ILLUSTRATIVE_PREVIEW_MATRIX, PIPELINE_STEPS } from '../data/harborluxData';

interface HeroSectionProps {
  onStartReview: () => void;
  onLaunchTimeMachine: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onStartReview,
  onLaunchTimeMachine,
}) => {
  const [previewSimpleEnglish, setPreviewSimpleEnglish] = useState<boolean>(false);
  const [previewEvidence, setPreviewEvidence] = useState<boolean>(true);

  const badgeClass = (risk: 'High' | 'Medium' | 'Low') => {
    if (risk === 'High') return 'bg-red-50 text-red-700 border border-red-200';
    if (risk === 'Medium') return 'bg-amber-50 text-amber-800 border border-amber-200';
    return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  };

  return (
    <section id="top" className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-12 lg:pt-16 lg:pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
          {/* Left Column: Value Proposition & Primary Action */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-8">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-indigo-900">
                <span>Rental Agreement Risk Reviewer</span>
                <span aria-hidden="true" className="text-slate-300">
                  ·
                </span>
                <span className="text-slate-500">Versioned Rulebook Engine</span>
                <span aria-hidden="true" className="text-slate-300">
                  ·
                </span>
                <span className="text-slate-500">Zero Invented Laws</span>
              </div>

              <h1 className="font-display text-[clamp(2.25rem,4vw,3.75rem)] font-extrabold tracking-tight text-slate-950 leading-[1.06] text-balance max-w-2xl">
                Spot risky rental clauses before you sign the lease.
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
                Upload a rental agreement as PDF or plain text. LeaseGuard AI extracts every
                clause, classifies deposit, rent, maintenance, and termination terms, verifies them
                strictly against versioned rulebooks, and tracks rule shifts with the Agreement Time
                Machine.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={onStartReview}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-indigo-950 hover:bg-indigo-900 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Analyze Your Lease</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={onLaunchTimeMachine}
                  className="inline-flex items-center gap-2 px-4 py-3 text-slate-700 hover:text-indigo-950 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <GitCompare className="w-4 h-4 text-indigo-900" />
                  <span>Compare Rule Changes</span>
                </button>
              </div>
            </div>

            <div className="pt-5 border-t border-slate-100 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
              <span>PDF &amp; multi-format clause segmentation</span>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span>Rulebook-verified citations only</span>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span>Informational decision-support, not legal advice</span>
            </div>
          </div>

          {/* Right Column: Interactive Illustrative Risk Dashboard Preview */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="flex-1 rounded-xl border border-slate-200 bg-slate-50/70 p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold text-indigo-950">
                      Risk Dashboard Preview
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Illustrative results — not actual legal conclusions
                    </div>
                  </div>

                  {/* Interactive Preview Mode Segmented Control */}
                  <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setPreviewSimpleEnglish(false)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer ${
                        !previewSimpleEnglish
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Rule Detail
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewSimpleEnglish(true)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer ${
                        previewSimpleEnglish
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Simple English
                    </button>
                  </div>
                </div>

                {/* Category Risk Table */}
                <div className="rounded-lg bg-white border border-slate-200 overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3">Risk</th>
                        <th className="py-2.5 px-3">Explanation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {ILLUSTRATIVE_PREVIEW_MATRIX.map((row) => (
                        <tr key={row.category} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                            {row.category}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${badgeClass(
                                row.risk
                              )}`}
                            >
                              {row.risk}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 leading-snug">
                            <div>
                              {previewSimpleEnglish ? row.simpleExplanation : row.explanation}
                            </div>
                            {previewEvidence && row.ruleRefs.length > 0 && (
                              <div className="mt-1 font-mono-code text-[10px] text-indigo-800">
                                Evidence: {row.ruleRefs.join(', ')}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1 text-[11px] text-slate-500">
                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={previewEvidence}
                    onChange={(e) => setPreviewEvidence(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-950 focus:ring-indigo-900"
                  />
                  <span className="font-medium text-slate-700 inline-flex items-center gap-1">
                    <BookOpen className="w-3 h-3 text-indigo-800" />
                    Evidence Mode
                  </span>
                </label>

                <button
                  type="button"
                  onClick={onStartReview}
                  className="text-indigo-900 font-semibold hover:underline cursor-pointer inline-flex items-center gap-1 whitespace-nowrap"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Run Live Audit</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 7-Step End-to-End Pipeline Strip */}
        <div id="pipeline" className="mt-12 pt-8 border-t border-slate-200">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-5">
            <h2 className="font-display text-base font-bold text-slate-900">
              How LeaseGuard AI Works
            </h2>
            <span className="text-xs text-slate-500">
              Deterministic clause segmentation · AI classification · Versioned rulebook verification
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {PIPELINE_STEPS.map((item) => (
              <div
                key={item.step}
                className="rounded-lg border border-slate-200 bg-slate-50/50 p-3.5 space-y-1.5"
              >
                <div className="font-mono-code text-[11px] font-semibold text-indigo-900 tabular-nums">
                  0{item.step}.
                </div>
                <div className="text-xs font-semibold text-slate-900 leading-snug">
                  {item.title}
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
