import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Check,
  CheckSquare,
  Copy,
  FilePlus2,
  FileText,
  GitCompare,
  History,
  Layers,
  MessageSquareText,
  Scale,
  Send,
  ShieldAlert,
  ShieldBan,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { SAMPLE_LEASE_PRESETS } from '../data/harborluxData';
import {
  BUILTIN_RULEBOOK_PACKS,
  SAMPLE_CUSTOM_RULEBOOK_TEMPLATE,
  computeAnalysisDiff,
  resolveRulebookPack,
} from '../data/rulebooks';
import type {
  AnalysisDiffResult,
  ClauseType,
  LeaseAnalysisReport,
  RulebookPack,
} from '../types/lease';
import { segmentAgreementClauses } from '../utils/clauseSegmenter';

interface LeaseWorkspaceProps {
  focusUploadNonce: number;
  timeMachineTriggerNonce: number;
}

type WorkspaceTab = 'dashboard' | 'clauses' | 'timemachine' | 'rulebook';

const REPORTS_STORAGE_KEY = 'leaseguard_reports_v2';
const CUSTOM_PACKS_STORAGE_KEY = 'leaseguard_custom_rulebooks_v2';

export const LeaseWorkspace: React.FC<LeaseWorkspaceProps> = ({
  focusUploadNonce,
  timeMachineTriggerNonce,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [customPacks, setCustomPacks] = useState<RulebookPack[]>(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_PACKS_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as RulebookPack[]) : [];
    } catch {
      return [];
    }
  });

  const allRulebookPacks = useMemo(
    () => [...BUILTIN_RULEBOOK_PACKS, ...customPacks],
    [customPacks]
  );

  const [selectedPackId, setSelectedPackId] = useState<string>('metro-v1.0');
  const resolvedRulebook = useMemo(
    () => resolveRulebookPack(selectedPackId, allRulebookPacks),
    [selectedPackId, allRulebookPacks]
  );

  // Document & extraction state
  const [documentName, setDocumentName] = useState<string>(SAMPLE_LEASE_PRESETS[0].label);
  const [docFormatMeta, setDocFormatMeta] = useState<string>(SAMPLE_LEASE_PRESETS[0].formatTag);
  const [leaseText, setLeaseText] = useState<string>(SAMPLE_LEASE_PRESETS[0].text);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  // Report modes
  const [simpleEnglishMode, setSimpleEnglishMode] = useState<boolean>(false);
  const [evidenceMode, setEvidenceMode] = useState<boolean>(true);
  const [checkedQuestions, setCheckedQuestions] = useState<Record<string, boolean>>({});

  // Analysis & Time Machine state
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [currentReport, setCurrentReport] = useState<LeaseAnalysisReport | null>(null);
  const [historyReports, setHistoryReports] = useState<LeaseAnalysisReport[]>(() => {
    try {
      const saved = localStorage.getItem(REPORTS_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as LeaseAnalysisReport[]) : [];
    } catch {
      return [];
    }
  });
  const [compareBaselineId, setCompareBaselineId] = useState<string | null>(null);

  // Sub-tabs & Clause navigator
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('dashboard');
  const [selectedClauseIdx, setSelectedClauseIdx] = useState<number>(1);
  const [clauseFilter, setClauseFilter] = useState<'ALL' | 'FLAGGED' | ClauseType>('ALL');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // JSON Rulebook hot-loader
  const [showJsonImporter, setShowJsonImporter] = useState<boolean>(false);
  const [jsonInput, setJsonInput] = useState<string>(() =>
    JSON.stringify(SAMPLE_CUSTOM_RULEBOOK_TEMPLATE, null, 2)
  );
  const [jsonError, setJsonError] = useState<string | null>(null);

  // No Fake Laws Q&A guard
  const [guardQuestion, setGuardQuestion] = useState<string>('');
  const [guardLoading, setGuardLoading] = useState<boolean>(false);
  const [guardResponse, setGuardResponse] = useState<{
    coveredByRulebook: boolean;
    citedRuleIds: string[];
    answer: string;
  } | null>(null);
  const [guardError, setGuardError] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(historyReports.slice(0, 12)));
    } catch {
      // Ignore quota errors
    }
  }, [historyReports]);

  useEffect(() => {
    try {
      localStorage.setItem(CUSTOM_PACKS_STORAGE_KEY, JSON.stringify(customPacks));
    } catch {
      // Ignore quota errors
    }
  }, [customPacks]);

  // Hydrate persisted reports & custom rulebooks from backend on mount
  useEffect(() => {
    let active = true;
    fetch('/api/reports')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data || !Array.isArray(data.reports) || data.reports.length === 0) return;
        setHistoryReports((prev) => {
          const seen = new Set(data.reports.map((r: LeaseAnalysisReport) => r.id));
          const merged = [...data.reports, ...prev.filter((r) => !seen.has(r.id))];
          return merged.slice(0, 20);
        });
      })
      .catch(() => {});

    fetch('/api/rulebooks')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data || !Array.isArray(data.customRulebooks) || data.customRulebooks.length === 0) {
          return;
        }
        setCustomPacks((prev) => {
          const seen = new Set(data.customRulebooks.map((p: RulebookPack) => p.id));
          return [...prev.filter((p) => !seen.has(p.id)), ...data.customRulebooks];
        });
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (focusUploadNonce > 0) {
      textareaRef.current?.focus();
    }
  }, [focusUploadNonce]);

  useEffect(() => {
    if (timeMachineTriggerNonce > 0) {
      setActiveTab('timemachine');
      if (!currentReport) {
        // Pre-select v2.0 if user hasn't run yet, or run comparison demo cleanly
        setSelectedPackId('metro-v1.0');
      } else if (currentReport.rulebookId === 'metro-v1.0') {
        setSelectedPackId('metro-v2.0');
      }
    }
  }, [timeMachineTriggerNonce, currentReport]);

  const previewSegments = useMemo(() => segmentAgreementClauses(leaseText), [leaseText]);

  const diffResult: AnalysisDiffResult | null = useMemo(() => {
    if (!currentReport || !compareBaselineId) return null;
    const baseline = historyReports.find((r) => r.id === compareBaselineId);
    if (!baseline || baseline.id === currentReport.id) return null;
    return computeAnalysisDiff(baseline, currentReport);
  }, [currentReport, compareBaselineId, historyReports]);

  const processUploadedFile = async (file: File) => {
    setExtractError(null);
    setReviewError(null);
    setIsExtracting(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Data = btoa(binary);

      const res = await fetch('/api/extract-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type,
          base64Data,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setExtractError(data?.error || 'Unable to extract text from uploaded file.');
      } else {
        setLeaseText(data.text);
        setDocumentName(file.name);
        setDocFormatMeta(
          data.format === 'PDF'
            ? `PDF · ${data.pageCount} page${data.pageCount === 1 ? '' : 's'}`
            : 'Text File'
        );
        setCurrentReport(null);
        setCompareBaselineId(null);
      }
    } catch {
      setExtractError('Failed to read or upload document.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
    e.target.value = '';
  };

  const runAnalysis = async (
    overridePackId?: string,
    reanalyzeFromReport?: LeaseAnalysisReport
  ) => {
    setReviewError(null);
    const targetPackId = overridePackId || selectedPackId;
    const targetRulebook = resolveRulebookPack(targetPackId, allRulebookPacks);
    const textToAnalyze = reanalyzeFromReport ? reanalyzeFromReport.rawText : leaseText;
    const nameToUse = reanalyzeFromReport ? reanalyzeFromReport.documentName : documentName;

    if (textToAnalyze.trim().length < 40) {
      setReviewError('Provide at least 40 characters of rental agreement text to analyze.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/review-lease', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaseText: textToAnalyze,
          documentName: nameToUse,
          resolvedRulebook: targetRulebook,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReviewError(data?.error || 'Unable to analyze rental agreement.');
      } else {
        const newReport = data as LeaseAnalysisReport;
        const priorMatch =
          reanalyzeFromReport ||
          currentReport ||
          historyReports.find(
            (r) =>
              r.rawText.trim() === textToAnalyze.trim() && r.rulebookId !== newReport.rulebookId
          ) ||
          null;

        setCurrentReport(newReport);
        setHistoryReports((prev) => [newReport, ...prev.slice(0, 11)]);
        if (newReport.clauses.length > 0) {
          setSelectedClauseIdx(newReport.clauses[0].index);
        }

        if (priorMatch && priorMatch.id !== newReport.id) {
          setCompareBaselineId(priorMatch.id);
          setActiveTab('timemachine');
        } else {
          setCompareBaselineId(null);
          setActiveTab('dashboard');
        }
      }
    } catch {
      setReviewError('Network error while contacting the lease risk analyzer.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleImportRulebookJson = (e: React.FormEvent) => {
    e.preventDefault();
    setJsonError(null);
    try {
      const parsed = JSON.parse(jsonInput) as RulebookPack;
      if (!parsed.id || !parsed.name || !parsed.version || !Array.isArray(parsed.rules)) {
        setJsonError('Rulebook JSON must include id, name, version, and a rules array.');
        return;
      }
      for (const r of parsed.rules) {
        if (!r.ruleId || !r.version || !r.title || !r.category) {
          setJsonError('Each rule must specify ruleId, version, title, and category.');
          return;
        }
      }
      const normalizedPack: RulebookPack = {
        ...parsed,
        isCustom: true,
        effectiveDate: parsed.effectiveDate || new Date().toISOString().slice(0, 10),
        region: parsed.region || 'Custom Region',
        description: parsed.description || 'Imported custom rulebook configuration.',
      };
      setCustomPacks((prev) => {
        const filtered = prev.filter((p) => p.id !== normalizedPack.id);
        return [...filtered, normalizedPack];
      });
      setSelectedPackId(normalizedPack.id);
      setShowJsonImporter(false);

      // Persist custom rulebook to backend store
      fetch('/api/rulebooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalizedPack),
      }).catch(() => {});
    } catch (err: unknown) {
      setJsonError(err instanceof Error ? `Invalid JSON: ${err.message}` : 'Invalid JSON format.');
    }
  };

  const handleAskRulebookGuard = async (questionToAsk: string) => {
    const trimmed = questionToAsk.trim();
    if (!trimmed) return;
    setGuardError(null);
    setGuardLoading(true);
    try {
      const res = await fetch('/api/ask-rulebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: trimmed,
          leaseText,
          resolvedRulebook,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGuardError(data?.error || 'Unable to check rulebook coverage.');
      } else {
        setGuardResponse(data);
      }
    } catch {
      setGuardError('Network error while checking rulebook coverage.');
    } finally {
      setGuardLoading(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1600);
  };

  const riskBadgeClass = (level: string) => {
    switch (level) {
      case 'CRITICAL':
      case 'HIGH':
      case 'High':
        return 'bg-red-50 text-red-700 border border-red-200';
      case 'MODERATE':
      case 'MEDIUM':
      case 'Medium':
        return 'bg-amber-50 text-amber-800 border border-amber-200';
      default:
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    }
  };

  const filteredClauses = useMemo(() => {
    if (!currentReport) return [];
    return currentReport.clauses.filter((c) => {
      if (clauseFilter === 'ALL') return true;
      if (clauseFilter === 'FLAGGED') return c.flags.length > 0;
      return c.clauseType === clauseFilter;
    });
  }, [currentReport, clauseFilter]);

  const navigableClauses = useMemo(() => {
    if (currentReport) {
      return filteredClauses.map((c) => ({
        id: c.id,
        index: c.index,
        numberingLabel: c.numberingLabel,
        heading: c.heading,
        clauseTypeLabel: c.clauseType as string,
        flagCount: c.flags.length,
      }));
    }
    return previewSegments.map((p) => ({
      id: p.id,
      index: p.index,
      numberingLabel: p.numberingLabel,
      heading: p.heading,
      clauseTypeLabel: 'Awaiting Analysis',
      flagCount: 0,
    }));
  }, [currentReport, filteredClauses, previewSegments]);

  const activeClause = useMemo(() => {
    if (!currentReport) return null;
    return (
      currentReport.clauses.find((c) => c.index === selectedClauseIdx) ||
      filteredClauses[0] ||
      currentReport.clauses[0] ||
      null
    );
  }, [currentReport, selectedClauseIdx, filteredClauses]);

  const canCompareRuleChanges =
    Boolean(currentReport) && currentReport!.rulebookId !== resolvedRulebook.packId;

  return (
    <section id="workspace" className="bg-slate-50 py-12 lg:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Section Heading + Disclaimer */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
              Interactive Rental Agreement Reviewer
            </h2>
            <p className="text-sm text-slate-600">
              Upload a PDF or paste text, select a regional rulebook version, and inspect your
              complete report.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3.5 py-2 text-xs text-emerald-900">
            <Scale className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              <strong>Informational Only — Not Legal Advice.</strong> Zero invented laws or
              unverified citations.
            </span>
          </div>
        </div>

        {/* Input & Rulebook Control Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Upload & Extracted Agreement Text (7 cols) */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) processUploadedFile(file);
            }}
            className={`lg:col-span-7 rounded-xl bg-white border p-5 space-y-3 transition-colors ${
              isDragging ? 'border-indigo-700 bg-indigo-50/40' : 'border-slate-200'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-slate-900">
                  1. Upload PDF / Text Agreement
                </div>
                <div className="text-xs text-slate-500 tabular-nums">
                  {documentName} · {docFormatMeta} · {previewSegments.length} clauses segmented
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.md,application/pdf,text/plain"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-950 hover:bg-indigo-900 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isExtracting ? 'Reading PDF...' : 'Upload PDF / TXT'}</span>
                </button>
              </div>
            </div>

            {/* Sample Formats */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-500 mr-1">Sample formats:</span>
              {SAMPLE_LEASE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setLeaseText(preset.text);
                    setDocumentName(preset.label);
                    setDocFormatMeta(preset.formatTag);
                    setCurrentReport(null);
                    setCompareBaselineId(null);
                    setExtractError(null);
                    setReviewError(null);
                  }}
                  className={`px-2.5 py-1 rounded-md border text-xs transition-colors cursor-pointer ${
                    leaseText === preset.text
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {preset.shortLabel}
                </button>
              ))}
            </div>

            <textarea
              ref={textareaRef}
              rows={6}
              value={leaseText}
              onChange={(e) => {
                setLeaseText(e.target.value);
                setDocumentName('Custom Pasted Agreement');
                setDocFormatMeta('Direct Text');
              }}
              placeholder="Drop a PDF here or paste rental agreement clauses in any numbering format..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs text-slate-800 font-mono-code leading-relaxed focus:outline-none focus:border-indigo-700 focus:bg-white"
            />

            {extractError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <span>{extractError}</span>
              </div>
            )}
          </div>

          {/* Active Rulebook Version & Actions (5 cols) */}
          <div className="lg:col-span-5 rounded-xl bg-white border border-slate-200 p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-bold text-slate-900">
                  2. Active Rulebook Version
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('rulebook');
                    setShowJsonImporter(true);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-900 hover:underline cursor-pointer"
                >
                  <FilePlus2 className="w-3.5 h-3.5" />
                  <span>Add Rulebook JSON</span>
                </button>
              </div>

              <select
                aria-label="Select active rulebook version"
                value={selectedPackId}
                onChange={(e) => setSelectedPackId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-700"
              >
                {allRulebookPacks.map((pack) => (
                  <option key={pack.id} value={pack.id}>
                    {pack.name} ({pack.version}) — {pack.effectiveDate}
                    {pack.isCustom ? ' [Custom]' : ''}
                  </option>
                ))}
              </select>

              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-1 text-xs">
                <div className="font-semibold text-slate-800">
                  Precedence Chain: {resolvedRulebook.chainLabels.join(' → ')}
                </div>
                <div className="text-slate-600 tabular-nums">
                  {resolvedRulebook.activeRules.length} active tenant-protection rules ·{' '}
                  {resolvedRulebook.supersededRules.length} superseded/repealed rule(s) overridden
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              {canCompareRuleChanges ? (
                <button
                  type="button"
                  disabled={isAnalyzing}
                  onClick={() => runAnalysis(selectedPackId, currentReport!)}
                  className="w-full py-2.5 px-4 rounded-lg bg-indigo-950 hover:bg-indigo-900 disabled:opacity-60 text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <GitCompare className="w-4 h-4" />
                  <span>
                    {isAnalyzing
                      ? 'Re-analyzing & Computing Time Machine Diff...'
                      : `Compare Rule Changes (${currentReport!.rulebookVersion} → ${resolvedRulebook.version})`}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isAnalyzing}
                  onClick={() => runAnalysis()}
                  className="w-full py-2.5 px-4 rounded-lg bg-indigo-950 hover:bg-indigo-900 disabled:opacity-60 text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>
                    {isAnalyzing
                      ? 'Reading, Segmenting & Auditing...'
                      : `Run Complete Risk Report (${resolvedRulebook.version})`}
                  </span>
                </button>
              )}

              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <History className="w-3.5 h-3.5" />
                  {historyReports.length} saved analysis run(s)
                </span>
                {currentReport && currentReport.rulebookId === 'metro-v1.0' && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPackId('metro-v2.0');
                      runAnalysis('metro-v2.0', currentReport);
                    }}
                    className="font-semibold text-indigo-900 hover:underline cursor-pointer"
                  >
                    Quick Compare v1.0 → v2.0
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {reviewError && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <span>{reviewError}</span>
          </div>
        )}

        {/* Report Workspace Container */}
        <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
          {/* Tabs + Mode Toggles Header */}
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  ['dashboard', 'Risk Dashboard'],
                  [
                    'clauses',
                    `Segmented Clauses (${
                      currentReport ? currentReport.clauses.length : previewSegments.length
                    })`,
                  ],
                  [
                    'timemachine',
                    diffResult
                      ? `Agreement Time Machine (+${diffResult.appeared.length} / -${diffResult.disappeared.length} / ~${diffResult.changed.length})`
                      : 'Agreement Time Machine',
                  ],
                  ['rulebook', `Rulebook & No Fake Laws (${resolvedRulebook.activeRules.length})`],
                ] as Array<[WorkspaceTab, string]>
              ).map(([tabKey, label]) => (
                <button
                  key={tabKey}
                  type="button"
                  onClick={() => setActiveTab(tabKey)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    activeTab === tabKey
                      ? 'bg-indigo-950 text-white'
                      : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Evidence Mode & Simple English Mode Toggles */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSimpleEnglishMode((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  simpleEnglishMode
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-950'
                    : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                <MessageSquareText className="w-3.5 h-3.5" />
                <span>Simple English Mode: {simpleEnglishMode ? 'ON' : 'OFF'}</span>
              </button>

              <button
                type="button"
                onClick={() => setEvidenceMode((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  evidenceMode
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-950'
                    : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Evidence Mode: {evidenceMode ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {/* TAB 1: COMPLETE RISK DASHBOARD */}
            {activeTab === 'dashboard' && (
              <>
                {!currentReport ? (
                  <div className="py-10 text-center space-y-3">
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-900 flex items-center justify-center mx-auto">
                      <FileText className="w-5 h-5" />
                    </div>
                    <h3 className="font-display text-base font-bold text-slate-900">
                      Ready to generate your Risk Dashboard
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
                      {previewSegments.length} clauses are segmented from{' '}
                      <strong>{documentName}</strong>. Click{' '}
                      <strong>Run Complete Risk Report</strong> above to populate the Category Risk
                      Matrix, Evidence citations, Simple English breakdown, and Tenant Action
                      Checklist.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Summary KPI Row */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-1">
                        <div className="text-xs text-slate-500">Overall Risk Score</div>
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-2xl font-bold tabular-nums text-slate-950">
                            {currentReport.riskScore} / 100
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${riskBadgeClass(
                              currentReport.overallRiskLevel
                            )}`}
                          >
                            {currentReport.overallRiskLevel}
                          </span>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-1">
                        <div className="text-xs text-slate-500">Clauses &amp; Conflicts</div>
                        <div className="text-2xl font-bold tabular-nums text-slate-950">
                          {currentReport.flags.length} / {currentReport.clauses.length}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Flagged vs. total segmented clauses
                        </div>
                      </div>

                      <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700">
                            {simpleEnglishMode
                              ? 'Simple English Summary'
                              : 'Executive Summary (Rulebook-Grounded)'}
                          </span>
                          <span className="font-mono-code text-[11px] text-indigo-900">
                            {currentReport.rulebookName} · {currentReport.rulebookVersion}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                          {simpleEnglishMode
                            ? currentReport.simpleEnglishSummary
                            : currentReport.plainLanguageSummary}
                        </p>
                      </div>
                    </div>

                    {/* Category Risk Matrix Table (Matching Prompt Structure) */}
                    <div className="space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-display text-sm font-bold text-slate-900">
                          Category Risk Overview
                        </h3>
                        <span className="text-[11px] text-slate-500">
                          Illustrative rulebook comparison — not legal advice
                        </span>
                      </div>

                      <div className="rounded-xl border border-slate-200 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                              <th className="py-2.5 px-4">Category</th>
                              <th className="py-2.5 px-4">Risk</th>
                              <th className="py-2.5 px-4">Explanation</th>
                              {evidenceMode && <th className="py-2.5 px-4">Rule Reference</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                            {currentReport.categoryMatrix.map((row) => (
                              <tr key={row.category} className="hover:bg-slate-50/70">
                                <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                                  {row.category}
                                </td>
                                <td className="py-3 px-4 whitespace-nowrap">
                                  <span
                                    className={`inline-flex px-2.5 py-0.5 rounded text-xs font-semibold ${riskBadgeClass(
                                      row.risk
                                    )}`}
                                  >
                                    {row.risk}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-slate-700">
                                  {simpleEnglishMode ? row.simpleExplanation : row.explanation}
                                </td>
                                {evidenceMode && (
                                  <td className="py-3 px-4 font-mono-code text-xs text-indigo-900 whitespace-nowrap">
                                    {row.ruleRefs.length > 0 ? row.ruleRefs.join(', ') : '—'}
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Flagged Risks + Evidence Mode */}
                    <div className="space-y-3">
                      <h3 className="font-display text-sm font-bold text-slate-900">
                        Flagged Clauses &amp; Rulebook Evidence ({currentReport.flags.length})
                      </h3>

                      {currentReport.flags.length === 0 ? (
                        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3 text-sm text-emerald-900">
                          <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
                          <span>
                            No conflicts detected against {currentReport.rulebookName} (
                            {currentReport.rulebookVersion}).
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {currentReport.flags.map((flag) => (
                            <div
                              key={flag.flagKey}
                              className="rounded-xl border border-slate-200 bg-white p-4 space-y-3"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                  <span className="font-mono-code px-2.5 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-950 font-semibold">
                                    {flag.ruleId} · {flag.ruleVersion}
                                  </span>
                                  <span className="text-sm font-bold text-slate-900">
                                    {flag.ruleTitle}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedClauseIdx(flag.clauseIndex);
                                      setActiveTab('clauses');
                                    }}
                                    className="text-indigo-800 hover:underline font-medium cursor-pointer"
                                  >
                                    Clause {flag.clauseIndex} ({flag.clauseHeading})
                                  </button>
                                </div>

                                <span
                                  className={`px-2.5 py-0.5 rounded text-xs font-semibold ${riskBadgeClass(
                                    flag.severity
                                  )}`}
                                >
                                  {flag.severity} RISK
                                </span>
                              </div>

                              <p className="text-sm text-slate-700 leading-relaxed">
                                {simpleEnglishMode
                                  ? flag.simpleEnglishExplanation
                                  : flag.plainExplanation}
                              </p>

                              {evidenceMode && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-1">
                                    <div className="text-[11px] font-semibold text-slate-500">
                                      Agreement Evidence (Clause {flag.clauseIndex})
                                    </div>
                                    <p className="text-xs text-slate-800 italic leading-relaxed">
                                      “{flag.clauseExcerpt}”
                                    </p>
                                  </div>
                                  <div className="rounded-lg bg-indigo-50/60 border border-indigo-200 p-3 space-y-1">
                                    <div className="text-[11px] font-semibold text-indigo-950">
                                      Rulebook Reference ({flag.ruleId} · {flag.ruleVersion})
                                    </div>
                                    <p className="text-xs text-indigo-950/85 leading-relaxed">
                                      {flag.groundedInRuleText}
                                    </p>
                                  </div>
                                </div>
                              )}

                              <div className="rounded-lg bg-slate-50 border border-slate-200 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2">
                                <div className="text-xs text-slate-700">
                                  <strong className="text-slate-900">Safe Renegotiation:</strong>{' '}
                                  {flag.safeSuggestion}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(flag.safeSuggestion, flag.flagKey)}
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-900 hover:underline cursor-pointer shrink-0"
                                >
                                  {copiedKey === flag.flagKey ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5" />
                                      <span>Copy</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Tenant Action Checklist */}
                    {currentReport.tenantChecklist.length > 0 && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <CheckSquare className="w-4 h-4 text-indigo-900" />
                            <h3 className="font-display text-sm font-bold text-slate-900">
                              Tenant Action Checklist — Questions to Ask the Landlord
                            </h3>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopy(
                                currentReport.tenantChecklist
                                  .map(
                                    (c, i) =>
                                      `${i + 1}. ${c.question} [${c.relatedRuleId} ${c.relatedRuleVersion}]`
                                  )
                                  .join('\n'),
                                'checklist-all'
                              )
                            }
                            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-900 hover:underline cursor-pointer"
                          >
                            {copiedKey === 'checklist-all' ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Checklist Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy All Questions</span>
                              </>
                            )}
                          </button>
                        </div>

                        <div className="space-y-2">
                          {currentReport.tenantChecklist.map((item) => {
                            const isChecked = Boolean(checkedQuestions[item.id]);
                            return (
                              <label
                                key={item.id}
                                className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                                  isChecked
                                    ? 'bg-emerald-50/50 border-emerald-200'
                                    : 'bg-white border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) =>
                                    setCheckedQuestions((prev) => ({
                                      ...prev,
                                      [item.id]: e.target.checked,
                                    }))
                                  }
                                  className="mt-0.5 rounded border-slate-300 text-indigo-950 focus:ring-indigo-900"
                                />
                                <div className="flex-1 space-y-0.5">
                                  <div
                                    className={`text-xs sm:text-sm font-medium ${
                                      isChecked ? 'line-through text-slate-400' : 'text-slate-900'
                                    }`}
                                  >
                                    {item.question}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {item.whyItMatters}{' '}
                                    <span className="font-mono-code text-indigo-800">
                                      [{item.relatedRuleId} · {item.relatedRuleVersion}]
                                    </span>
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Grounding / Guard Notice */}
                    <div className="rounded-lg bg-slate-100 px-4 py-2.5 text-xs text-slate-600 flex items-start gap-2">
                      <ShieldBan className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                      <span>{currentReport.guardNote}</span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* TAB 2: SEGMENTED CLAUSES NAVIGATOR */}
            {activeTab === 'clauses' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                <div className="md:col-span-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      Clauses ({navigableClauses.length})
                    </span>
                    {currentReport && (
                      <select
                        aria-label="Filter clauses"
                        value={clauseFilter}
                        onChange={(e) =>
                          setClauseFilter(e.target.value as 'ALL' | 'FLAGGED' | ClauseType)
                        }
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-800"
                      >
                        <option value="ALL">All Clauses</option>
                        <option value="FLAGGED">Flagged Only</option>
                        <option value="Security Deposit">Security Deposit</option>
                        <option value="Rent & Escalation">Rent &amp; Escalation</option>
                        <option value="Lock-In Period">Lock-In Period</option>
                        <option value="Termination & Eviction">Termination &amp; Eviction</option>
                        <option value="Maintenance & Repairs">Maintenance &amp; Repairs</option>
                        <option value="Entry & Privacy">Entry &amp; Privacy</option>
                        <option value="Subletting & Assignment">Subletting &amp; Assignment</option>
                        <option value="Renewal & Notice">Renewal &amp; Notice</option>
                        <option value="Utilities & Fees">Utilities &amp; Fees</option>
                      </select>
                    )}
                  </div>

                  <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
                    {navigableClauses.map((item) => {
                      const isSelected = (activeClause?.index ?? selectedClauseIdx) === item.index;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedClauseIdx(item.index)}
                          className={`w-full text-left rounded-lg p-3 border transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-50 border-indigo-300'
                              : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="font-semibold text-indigo-900 tabular-nums">
                              {item.numberingLabel || `#${item.index}`} · {item.clauseTypeLabel}
                            </span>
                            {item.flagCount > 0 && (
                              <span className="px-2 py-0.5 rounded bg-red-50 border border-red-200 text-red-700 font-semibold tabular-nums">
                                {item.flagCount} flag{item.flagCount > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-xs font-semibold text-slate-900 truncate">
                            {item.heading}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="md:col-span-7 rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-4">
                  {currentReport && activeClause ? (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                        <div>
                          <div className="text-xs font-semibold text-indigo-900">
                            Clause {activeClause.index} · {activeClause.clauseType}
                          </div>
                          <h4 className="font-display text-base font-bold text-slate-900">
                            {activeClause.heading}
                          </h4>
                        </div>
                        <span className="text-xs text-slate-500 tabular-nums">
                          {activeClause.flags.length} conflict(s)
                        </span>
                      </div>

                      <div className="rounded-lg bg-white border border-slate-200 p-3.5 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-mono-code">
                        {activeClause.text}
                      </div>

                      {activeClause.flags.length > 0 ? (
                        <div className="space-y-2.5">
                          {activeClause.flags.map((flag) => (
                            <div
                              key={flag.flagKey}
                              className="rounded-lg bg-white border border-slate-200 p-3 space-y-1.5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-slate-900">
                                  [{flag.ruleId} · {flag.ruleVersion}] {flag.ruleTitle}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[11px] font-semibold ${riskBadgeClass(
                                    flag.severity
                                  )}`}
                                >
                                  {flag.severity}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 leading-relaxed">
                                {simpleEnglishMode
                                  ? flag.simpleEnglishExplanation
                                  : flag.plainExplanation}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2.5 text-xs text-emerald-900 flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                          <span>
                            No conflicts detected on this clause under {currentReport.rulebookVersion}.
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    (() => {
                      const previewItem =
                        previewSegments.find((p) => p.index === selectedClauseIdx) ||
                        previewSegments[0];
                      if (!previewItem) {
                        return (
                          <p className="text-xs text-slate-500">No clauses segmented yet.</p>
                        );
                      }
                      return (
                        <div className="space-y-3">
                          <div className="text-xs font-semibold text-indigo-900">
                            Preview · {previewItem.numberingLabel || `#${previewItem.index}`}
                          </div>
                          <h4 className="font-display text-sm font-bold text-slate-900">
                            {previewItem.heading}
                          </h4>
                          <div className="rounded-lg bg-white border border-slate-200 p-3 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-mono-code">
                            {previewItem.text}
                          </div>
                          <p className="text-xs text-slate-500">
                            Run the Risk Report to classify this clause and check it against{' '}
                            {resolvedRulebook.packName} ({resolvedRulebook.version}).
                          </p>
                        </div>
                      );
                    })()
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: AGREEMENT TIME MACHINE (COMPARE RULE CHANGES) */}
            {activeTab === 'timemachine' && (
              <div className="space-y-5">
                <div className="rounded-xl bg-indigo-50/70 border border-indigo-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-indigo-950">
                      Agreement Time Machine — Compare Rule Changes
                    </div>
                    <p className="text-xs text-indigo-950/80">
                      Pick a newer or updated rulebook version and click{' '}
                      <strong>Compare Rule Changes</strong> to see which risks appeared,
                      disappeared, or changed on the same agreement.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <select
                      aria-label="Target rulebook version for Time Machine"
                      value={selectedPackId}
                      onChange={(e) => setSelectedPackId(e.target.value)}
                      className="rounded-lg border border-indigo-300 bg-white px-3 py-2 text-xs font-medium text-slate-900"
                    >
                      {allRulebookPacks.map((pack) => (
                        <option key={pack.id} value={pack.id}>
                          {pack.name} ({pack.version})
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      disabled={isAnalyzing}
                      onClick={() => runAnalysis(selectedPackId, currentReport || undefined)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-950 hover:bg-indigo-900 disabled:opacity-60 text-white text-xs font-semibold cursor-pointer"
                    >
                      <GitCompare className="w-3.5 h-3.5" />
                      <span>{isAnalyzing ? 'Comparing...' : 'Compare Rule Changes'}</span>
                    </button>
                  </div>
                </div>

                {historyReports.length < 2 || !currentReport ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-6 text-center space-y-2">
                    <div className="text-sm font-bold text-slate-900">
                      Run two versions to view the Time Machine diff
                    </div>
                    <p className="text-xs text-slate-600 max-w-lg mx-auto leading-relaxed">
                      First run an analysis under <strong>v1.0</strong>, then switch the rulebook
                      above to <strong>v2.0</strong> or <strong>v2.1</strong> and click{' '}
                      <strong>Compare Rule Changes</strong>.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                      <span>Comparing baseline:</span>
                      <select
                        aria-label="Baseline report"
                        value={compareBaselineId || ''}
                        onChange={(e) => setCompareBaselineId(e.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                      >
                        {historyReports
                          .filter((r) => r.id !== currentReport.id)
                          .map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.documentName} · {r.rulebookVersion} ({r.flags.length} flags)
                            </option>
                          ))}
                      </select>
                      <ArrowRight className="w-4 h-4 text-indigo-800" />
                      <span className="font-semibold text-slate-900">
                        {currentReport.rulebookName} ({currentReport.rulebookVersion})
                      </span>
                    </div>

                    {diffResult && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="rounded-xl bg-red-50 border border-red-200 p-3.5">
                            <div className="text-xs text-red-700 font-medium">Appeared</div>
                            <div className="text-2xl font-bold tabular-nums text-red-900">
                              +{diffResult.appeared.length}
                            </div>
                          </div>
                          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5">
                            <div className="text-xs text-emerald-700 font-medium">Disappeared</div>
                            <div className="text-2xl font-bold tabular-nums text-emerald-900">
                              -{diffResult.disappeared.length}
                            </div>
                          </div>
                          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5">
                            <div className="text-xs text-amber-800 font-medium">Changed</div>
                            <div className="text-2xl font-bold tabular-nums text-amber-900">
                              ~{diffResult.changed.length}
                            </div>
                          </div>
                          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5">
                            <div className="text-xs text-slate-600 font-medium">Unchanged</div>
                            <div className="text-2xl font-bold tabular-nums text-slate-900">
                              {diffResult.unchangedCount}
                            </div>
                          </div>
                        </div>

                        {diffResult.appeared.map((f) => (
                          <div
                            key={f.flagKey}
                            className="rounded-xl bg-red-50/50 border border-red-200 p-4 space-y-1.5"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                              <span className="font-bold text-red-950">
                                + APPEARED · [{f.ruleId} · {f.ruleVersion}] {f.ruleTitle} (Clause{' '}
                                {f.clauseIndex})
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-semibold ${riskBadgeClass(
                                  f.severity
                                )}`}
                              >
                                {f.severity}
                              </span>
                            </div>
                            <p className="text-xs text-slate-700">
                              {simpleEnglishMode ? f.simpleEnglishExplanation : f.plainExplanation}
                            </p>
                          </div>
                        ))}

                        {diffResult.changed.map((item) => (
                          <div
                            key={item.after.flagKey}
                            className="rounded-xl bg-amber-50/60 border border-amber-200 p-4 space-y-1.5"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                              <span className="font-bold text-amber-950">
                                ~ CHANGED · [{item.after.ruleId}] {item.after.ruleTitle} (Clause{' '}
                                {item.after.clauseIndex})
                              </span>
                              <span className="font-mono-code text-[11px] text-amber-900 font-semibold">
                                {item.changeSummary}
                              </span>
                            </div>
                            <p className="text-xs text-slate-700">
                              {simpleEnglishMode
                                ? item.after.simpleEnglishExplanation
                                : item.after.plainExplanation}
                            </p>
                          </div>
                        ))}

                        {diffResult.disappeared.map((f) => (
                          <div
                            key={f.flagKey}
                            className="rounded-xl bg-emerald-50/60 border border-emerald-200 p-4 space-y-1"
                          >
                            <div className="text-xs font-bold text-emerald-950">
                              − DISAPPEARED · [{f.ruleId} · {f.ruleVersion}] {f.ruleTitle} (Clause{' '}
                              {f.clauseIndex})
                            </div>
                            <p className="text-xs text-emerald-900/80">
                              No longer flagged under {diffResult.currentVersionLabel}.
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* TAB 4: RULEBOOK PRECEDENCE, JSON IMPORT & NO FAKE LAWS GUARD */}
            {activeTab === 'rulebook' && (
              <div className="space-y-6">
                {/* Interactive "No Fake Laws" Guard Verifier */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-display text-sm font-bold text-slate-900">
                        No Fake Laws Guard — Ask About Rulebook Coverage
                      </h3>
                      <p className="text-xs text-slate-600">
                        Test whether a topic exists in {resolvedRulebook.packName} (
                        {resolvedRulebook.version}). Topics outside the rulebook are refused without
                        inventing external laws.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    {[
                      'Does the rulebook cap security deposits?',
                      'Does the rulebook cover pet fees or diplomatic break clauses?',
                    ].map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => {
                          setGuardQuestion(q);
                          handleAskRulebookGuard(q);
                        }}
                        className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
                      >
                        Try: “{q}”
                      </button>
                    ))}
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAskRulebookGuard(guardQuestion);
                    }}
                    className="flex flex-col sm:flex-row gap-2"
                  >
                    <input
                      type="text"
                      value={guardQuestion}
                      onChange={(e) => setGuardQuestion(e.target.value)}
                      placeholder="Ask if a clause or rule exists in the active rulebook..."
                      className="flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-700"
                    />
                    <button
                      type="submit"
                      disabled={guardLoading}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-950 hover:bg-indigo-900 text-white text-xs font-semibold cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{guardLoading ? 'Checking...' : 'Verify Against Rulebook'}</span>
                    </button>
                  </form>

                  {guardError && <div className="text-xs text-red-700">{guardError}</div>}

                  {guardResponse && (
                    <div
                      className={`rounded-lg border p-3 text-xs space-y-1 ${
                        guardResponse.coveredByRulebook
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                          : 'bg-amber-50 border-amber-200 text-amber-950'
                      }`}
                    >
                      <div className="font-semibold">
                        {guardResponse.coveredByRulebook
                          ? `Grounded in Rulebook (${guardResponse.citedRuleIds.join(', ')})`
                          : 'Guard Refusal — Not Covered in Active Rulebook'}
                      </div>
                      <p className="leading-relaxed">{guardResponse.answer}</p>
                    </div>
                  )}
                </div>

                {/* Rulebook JSON Importer */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-display text-sm font-bold text-slate-900">
                      Active Rules &amp; Override Precedence ({resolvedRulebook.activeRules.length})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Chain: {resolvedRulebook.chainLabels.join(' → ')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowJsonImporter((v) => !v)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-semibold cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>{showJsonImporter ? 'Close JSON Editor' : 'Load Custom Rulebook JSON'}</span>
                  </button>
                </div>

                {showJsonImporter && (
                  <form
                    onSubmit={handleImportRulebookJson}
                    className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-indigo-950">
                        Hot-Load Updated Regional Rulebook JSON (No Code Changes)
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setJsonInput(JSON.stringify(SAMPLE_CUSTOM_RULEBOOK_TEMPLATE, null, 2))
                        }
                        className="text-indigo-900 font-semibold hover:underline cursor-pointer"
                      >
                        Reset Sample Amendment JSON
                      </button>
                    </div>
                    <textarea
                      rows={8}
                      value={jsonInput}
                      onChange={(e) => setJsonInput(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white p-3 text-xs font-mono-code text-slate-800"
                    />
                    {jsonError && <div className="text-xs text-red-700">{jsonError}</div>}
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowJsonImporter(false)}
                        className="px-3.5 py-1.5 rounded-lg text-xs text-slate-600 hover:bg-slate-200 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-lg bg-indigo-950 text-white text-xs font-semibold cursor-pointer"
                      >
                        Activate Rulebook
                      </button>
                    </div>
                  </form>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {resolvedRulebook.activeRules.map((rule) => (
                    <div
                      key={`${rule.ruleId}-${rule.version}`}
                      className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono-code text-xs font-semibold text-indigo-950 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                          {rule.ruleId} · {rule.version}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${riskBadgeClass(
                            rule.severity
                          )}`}
                        >
                          {rule.severity}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-900">
                        {rule.title} · <span className="text-slate-500 font-normal">{rule.category}</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{rule.description}</p>
                      {rule.overridesHistory.length > 0 && (
                        <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                          Overrides prior rule(s): {rule.overridesHistory.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {resolvedRulebook.supersededRules.length > 0 && (
                  <div className="space-y-2 pt-3 border-t border-slate-200">
                    <div className="text-xs font-bold text-slate-600">
                      Superseded &amp; Repealed Rules Overridden by Newer Versions
                    </div>
                    {resolvedRulebook.supersededRules.map((rule, idx) => (
                      <div
                        key={`${rule.ruleId}-${rule.version}-${idx}`}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"
                      >
                        <span className="line-through">
                          {rule.ruleId} {rule.version} — {rule.title}
                        </span>
                        <span className="font-mono-code text-[11px] text-indigo-900 font-semibold">
                          Overridden by {rule.overriddenBy}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
