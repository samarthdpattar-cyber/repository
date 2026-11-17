import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { classifyClauseHeuristic, segmentAgreementClauses } from './src/utils/clauseSegmenter';
import {
  deleteCustomRulebook,
  deleteReport,
  getStoreStats,
  listCustomRulebooks,
  listInquiries,
  listReports,
  saveCustomRulebook,
  saveInquiry,
  saveReport,
} from './server/store';
import type {
  AccessInquiry,
  CategoryRiskRow,
  ClauseRiskFlag,
  ClauseType,
  LeaseAnalysisReport,
  ResolvedActiveRule,
  ResolvedRulebook,
  RulebookPack,
  SegmentedClause,
  TenantChecklistItem,
} from './src/types/lease';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

const VALID_CLAUSE_TYPES: ClauseType[] = [
  'Rent & Escalation',
  'Security Deposit',
  'Lock-In Period',
  'Termination & Eviction',
  'Maintenance & Repairs',
  'Subletting & Assignment',
  'Entry & Privacy',
  'Utilities & Fees',
  'Renewal & Notice',
  'Other',
];

async function extractTextFromPdfBuffer(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    verbosity: 0,
  });

  const pdfDoc = await loadingTask.promise;
  const pageTexts: string[] = [];

  for (let p = 1; p <= pdfDoc.numPages; p++) {
    const page = await pdfDoc.getPage(p);
    const textContent = await page.getTextContent();
    const lines: string[] = [];
    let currentLine = '';
    let lastY: number | null = null;

    for (const rawItem of textContent.items) {
      if (!('str' in rawItem)) continue;
      const item = rawItem as { str: string; hasEOL?: boolean; transform?: number[] };
      const y = Array.isArray(item.transform) ? item.transform[5] : null;

      if (lastY !== null && y !== null && Math.abs(y - lastY) > 4) {
        if (currentLine.trim()) {
          lines.push(currentLine.trim());
        }
        if (Math.abs(y - lastY) > 18) {
          lines.push('');
        }
        currentLine = item.str;
      } else {
        const needsSpace =
          currentLine.length > 0 &&
          !currentLine.endsWith(' ') &&
          item.str.length > 0 &&
          !item.str.startsWith(' ');
        currentLine += (needsSpace ? ' ' : '') + item.str;
      }

      if (item.hasEOL) {
        if (currentLine.trim()) {
          lines.push(currentLine.trim());
        }
        currentLine = '';
        lastY = null;
      } else if (y !== null) {
        lastY = y;
      }
    }

    if (currentLine.trim()) {
      lines.push(currentLine.trim());
    }

    pageTexts.push(lines.join('\n'));
  }

  const combined = pageTexts.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
  return { text: combined, pageCount: pdfDoc.numPages };
}

function buildCategoryMatrix(
  clauses: SegmentedClause[],
  flags: ClauseRiskFlag[],
  activeRules: ResolvedActiveRule[]
): CategoryRiskRow[] {
  const coreCategories: Array<{ label: string; matchTypes: ClauseType[] }> = [
    { label: 'Security Deposit', matchTypes: ['Security Deposit'] },
    { label: 'Rent', matchTypes: ['Rent & Escalation'] },
    { label: 'Maintenance', matchTypes: ['Maintenance & Repairs'] },
    { label: 'Termination', matchTypes: ['Termination & Eviction'] },
    { label: 'Lock-In Period', matchTypes: ['Lock-In Period'] },
    { label: 'Entry & Privacy', matchTypes: ['Entry & Privacy'] },
    { label: 'Subletting', matchTypes: ['Subletting & Assignment'] },
    { label: 'Fees & Renewal', matchTypes: ['Utilities & Fees', 'Renewal & Notice'] },
  ];

  const rows: CategoryRiskRow[] = [];

  for (const cat of coreCategories) {
    const matchingClauses = clauses.filter((c) => cat.matchTypes.includes(c.clauseType));
    const matchingFlags = flags.filter((f) => {
      const c = clauses.find((cl) => cl.index === f.clauseIndex);
      return c ? cat.matchTypes.includes(c.clauseType) : false;
    });
    const hasRulesForCategory = activeRules.some((r) => cat.matchTypes.includes(r.category));

    // Always display the 4 core benchmark rows (Security Deposit, Rent, Maintenance, Termination) plus any other present/flagged categories
    const isCoreBenchmark = ['Security Deposit', 'Rent', 'Maintenance', 'Termination'].includes(
      cat.label
    );

    if (!isCoreBenchmark && matchingClauses.length === 0 && matchingFlags.length === 0) {
      continue;
    }

    if (matchingFlags.length > 0) {
      const hasHigh = matchingFlags.some((f) => f.severity === 'HIGH');
      const risk: CategoryRiskRow['risk'] = hasHigh ? 'High' : 'Medium';
      const primary = matchingFlags[0];
      rows.push({
        category: cat.label,
        risk,
        explanation:
          matchingFlags.length > 1
            ? `${matchingFlags.length} conflicts with active rules (${matchingFlags
                .map((f) => `${f.ruleId} ${f.ruleVersion}`)
                .join(', ')})`
            : `Potential conflict with ${primary.ruleId} (${primary.ruleVersion}): ${primary.ruleTitle}`,
        simpleExplanation: primary.simpleEnglishExplanation || primary.plainExplanation,
        ruleRefs: matchingFlags.map((f) => `${f.ruleId} · ${f.ruleVersion}`),
      });
    } else if (matchingClauses.length > 0 && hasRulesForCategory) {
      rows.push({
        category: cat.label,
        risk: 'Low',
        explanation: 'No configured conflict detected against active rulebook checks',
        simpleExplanation: `We checked ${matchingClauses.length} clause(s) for ${cat.label.toLowerCase()} and did not find a conflict with the active rulebook.`,
        ruleRefs: activeRules
          .filter((r) => cat.matchTypes.includes(r.category))
          .map((r) => `${r.ruleId} · ${r.version}`),
      });
    } else if (matchingClauses.length === 0 && hasRulesForCategory) {
      rows.push({
        category: cat.label,
        risk: 'Medium',
        explanation: 'Clause not stated in submitted text — responsibility is unclear',
        simpleExplanation: `Your agreement does not clearly mention ${cat.label.toLowerCase()}. Ask the landlord to put this in writing before signing.`,
        ruleRefs: activeRules
          .filter((r) => cat.matchTypes.includes(r.category))
          .map((r) => `${r.ruleId} · ${r.version}`),
      });
    } else {
      rows.push({
        category: cat.label,
        risk: 'Low',
        explanation: 'No active rulebook rule applies to this category',
        simpleExplanation: 'The active rulebook has no specific restriction triggered here.',
        ruleRefs: [],
      });
    }
  }

  return rows;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '16mb' }));

  app.get('/api/health', (_req, res) => {
    return res.json({
      ok: true,
      ...getStoreStats(),
    });
  });

  app.get('/api/reports', (_req, res) => {
    return res.json({ reports: listReports() });
  });

  app.delete('/api/reports/:id', (req, res) => {
    const removed = deleteReport(req.params.id);
    if (!removed) {
      return res.status(404).json({ error: 'Report not found.' });
    }
    return res.json({ ok: true });
  });

  app.get('/api/rulebooks', (_req, res) => {
    return res.json({ customRulebooks: listCustomRulebooks() });
  });

  app.post('/api/rulebooks', (req, res) => {
    const pack = req.body as Partial<RulebookPack> | undefined;
    if (!pack || !pack.id || !pack.name || !pack.version || !Array.isArray(pack.rules)) {
      return res.status(400).json({
        error: 'Rulebook JSON must include id, name, version, and a rules array.',
      });
    }
    for (const r of pack.rules) {
      if (!r.ruleId || !r.version || !r.title || !r.category) {
        return res.status(400).json({
          error: 'Each rule must specify ruleId, version, title, and category.',
        });
      }
    }

    const normalized: RulebookPack = {
      id: String(pack.id).trim(),
      name: String(pack.name).trim(),
      region: pack.region ? String(pack.region).trim() : 'Custom Region',
      version: String(pack.version).trim(),
      effectiveDate: pack.effectiveDate
        ? String(pack.effectiveDate).trim()
        : new Date().toISOString().slice(0, 10),
      description: pack.description
        ? String(pack.description).trim()
        : 'Custom regional rulebook configuration.',
      parentPackId: pack.parentPackId ? String(pack.parentPackId).trim() : undefined,
      isCustom: true,
      rules: pack.rules,
    };

    const saved = saveCustomRulebook(normalized);
    return res.status(201).json({ rulebook: saved });
  });

  app.delete('/api/rulebooks/:id', (req, res) => {
    const removed = deleteCustomRulebook(req.params.id);
    if (!removed) {
      return res.status(404).json({ error: 'Custom rulebook not found.' });
    }
    return res.json({ ok: true });
  });

  app.get('/api/inquiries', (_req, res) => {
    const items = listInquiries();
    return res.json({ count: items.length, inquiries: items.slice(0, 10) });
  });

  app.post('/api/inquiries', (req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    const organizationType =
      typeof req.body?.organizationType === 'string' ? req.body.organizationType.trim() : '';
    const region = typeof req.body?.region === 'string' ? req.body.region.trim() : '';
    const notes = typeof req.body?.notes === 'string' ? req.body.notes.trim() : '';

    if (name.length < 2 || name.length > 100) {
      return res.status(400).json({ error: 'Please enter your name (2–100 characters).' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const allowedOrgTypes: AccessInquiry['organizationType'][] = [
      'Tenant',
      'Legal Aid Clinic',
      'Student Housing',
      'Tenant Union',
      'Other',
    ];
    const validOrgType = allowedOrgTypes.includes(
      organizationType as AccessInquiry['organizationType']
    )
      ? (organizationType as AccessInquiry['organizationType'])
      : 'Tenant';

    if (region.length < 2 || region.length > 120) {
      return res.status(400).json({
        error: 'Please enter a city, state, or regional housing jurisdiction.',
      });
    }

    const inquiry: AccessInquiry = {
      id: `inq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      email,
      organizationType: validOrgType,
      region,
      notes: notes.slice(0, 1000),
      createdAt: new Date().toISOString(),
    };

    const saved = saveInquiry(inquiry);
    return res.status(201).json({
      inquiry: saved,
      totalInquiries: listInquiries().length,
    });
  });

  app.post('/api/extract-document', async (req, res) => {
    const fileName = typeof req.body?.fileName === 'string' ? req.body.fileName.trim() : 'document';
    const mimeType = typeof req.body?.mimeType === 'string' ? req.body.mimeType.trim() : '';
    const base64Data = typeof req.body?.base64Data === 'string' ? req.body.base64Data.trim() : '';

    if (!base64Data) {
      return res.status(400).json({ error: 'No file content was provided.' });
    }

    try {
      const buffer = Buffer.from(base64Data, 'base64');
      const isPdf =
        mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');

      if (isPdf) {
        const { text, pageCount } = await extractTextFromPdfBuffer(buffer);
        if (!text || text.length < 20) {
          return res.status(422).json({
            error:
              'No selectable text could be extracted from this PDF (it may be a scanned image). Please upload a text-based PDF or paste the agreement text directly.',
          });
        }
        return res.json({
          text,
          pageCount,
          format: 'PDF',
          fileName,
        });
      }

      const text = buffer.toString('utf8').trim();
      if (!text) {
        return res.status(422).json({ error: 'The uploaded text file is empty.' });
      }
      return res.json({
        text,
        pageCount: 1,
        format: 'TEXT',
        fileName,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to parse uploaded document.';
      console.error('Document extraction error:', message);
      return res.status(500).json({ error: `Failed to extract document text: ${message}` });
    }
  });

  app.post('/api/review-lease', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        error:
          'GEMINI_API_KEY is not configured. Add your Gemini API key in Settings > Secrets to enable AI rental agreement analysis.',
      });
    }

    const leaseText = typeof req.body?.leaseText === 'string' ? req.body.leaseText.trim() : '';
    const documentName =
      typeof req.body?.documentName === 'string' && req.body.documentName.trim()
        ? req.body.documentName.trim()
        : 'Rental Agreement';
    const resolvedRulebook = req.body?.resolvedRulebook as ResolvedRulebook | undefined;

    if (leaseText.length < 40) {
      return res.status(400).json({
        error: 'Please provide at least 40 characters of rental or lease agreement text to analyze.',
      });
    }

    if (leaseText.length > 50000) {
      return res.status(400).json({
        error: 'Agreement text exceeds the 50,000-character limit.',
      });
    }

    if (
      !resolvedRulebook ||
      !Array.isArray(resolvedRulebook.activeRules) ||
      resolvedRulebook.activeRules.length === 0
    ) {
      return res.status(400).json({
        error: 'An active resolved rulebook with at least one rule is required.',
      });
    }

    const segmentedRaw = segmentAgreementClauses(leaseText);
    if (segmentedRaw.length === 0) {
      return res.status(400).json({
        error: 'Unable to segment clauses from the provided text.',
      });
    }

    const activeRuleMap = new Map<string, ResolvedActiveRule>();
    resolvedRulebook.activeRules.forEach((r) => {
      if (r && typeof r.ruleId === 'string') {
        activeRuleMap.set(r.ruleId, r);
      }
    });

    const clauseListingForModel = segmentedRaw
      .map(
        (c) =>
          `[ClauseIndex: ${c.index}] (${c.numberingLabel || 'Unnumbered'} — ${c.heading})\n${c.text}`
      )
      .join('\n\n---\n\n');

    const rulebookListingForModel = resolvedRulebook.activeRules.map((r) => ({
      ruleId: r.ruleId,
      version: r.version,
      title: r.title,
      category: r.category,
      severity: r.severity,
      description: r.description,
      checkCriteria: r.checkCriteria,
    }));

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents:
          `ACTIVE RULEBOOK (${resolvedRulebook.packName} ${resolvedRulebook.version}):\n` +
          `${JSON.stringify(rulebookListingForModel, null, 2)}\n\n` +
          `SEGMENTED AGREEMENT CLAUSES (${segmentedRaw.length} clauses):\n` +
          `${clauseListingForModel}`,
        config: {
          systemInstruction:
            'You are LeaseGuard AI, a strict, transparent Rental Agreement Risk Reviewer grounded EXCLUSIVELY in the provided ACTIVE RULEBOOK. ' +
            'Follow these non-negotiable rules:\n' +
            '1. Classify EVERY segmented clauseIndex (1 to N) into one of the allowed clauseType labels.\n' +
            '2. Compare each clause ONLY against the rules in ACTIVE RULEBOOK. Flag a conflict ONLY when a clause violates or conflicts with the specific checkCriteria of an active rule.\n' +
            '3. NEVER invent rule IDs, rule versions, external statutes, municipal laws, or legal figures that are not explicitly written in ACTIVE RULEBOOK or the submitted agreement.\n' +
            '4. For every flagged conflict, provide:\n' +
            '   - plainExplanation: clear, factual explanation referencing the rule criteria.\n' +
            '   - simpleEnglishExplanation: everyday non-lawyer explanation (8th-grade reading level, zero legalese).\n' +
            '   - safeSuggestion: tenant-friendly counter-proposal strictly bounded by the rule criteria.\n' +
            '5. Also generate:\n' +
            '   - plainLanguageSummary: factual 2-3 sentence summary.\n' +
            '   - simpleEnglishSummary: super clear, everyday-English 2-3 sentence summary for someone signing their first apartment lease.\n' +
            '   - tenantQuestions: specific practical questions a tenant should ask the landlord tied to an exact ruleId from ACTIVE RULEBOOK.\n' +
            '6. Refuse unsupported legal claims: if an issue is outside the active rulebook, do not invent legal rules.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              clauseClassifications: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    clauseIndex: { type: Type.INTEGER },
                    clauseType: {
                      type: Type.STRING,
                      enum: VALID_CLAUSE_TYPES,
                    },
                  },
                  required: ['clauseIndex', 'clauseType'],
                },
              },
              flaggedConflicts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    clauseIndex: { type: Type.INTEGER },
                    ruleId: { type: Type.STRING },
                    clauseExcerpt: { type: Type.STRING },
                    plainExplanation: { type: Type.STRING },
                    simpleEnglishExplanation: { type: Type.STRING },
                    safeSuggestion: { type: Type.STRING },
                  },
                  required: [
                    'clauseIndex',
                    'ruleId',
                    'clauseExcerpt',
                    'plainExplanation',
                    'simpleEnglishExplanation',
                    'safeSuggestion',
                  ],
                },
              },
              plainLanguageSummary: { type: Type.STRING },
              simpleEnglishSummary: { type: Type.STRING },
              renegotiationPoints: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              tenantQuestions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    whyItMatters: { type: Type.STRING },
                    ruleId: { type: Type.STRING },
                  },
                  required: ['question', 'whyItMatters', 'ruleId'],
                },
              },
              guardNote: { type: Type.STRING },
            },
            required: [
              'clauseClassifications',
              'flaggedConflicts',
              'plainLanguageSummary',
              'simpleEnglishSummary',
              'renegotiationPoints',
              'tenantQuestions',
              'guardNote',
            ],
          },
        },
      });

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        return res.status(502).json({
          error: 'The analysis service returned an empty response. Please try again.',
        });
      }

      const parsed = JSON.parse(rawText) as {
        clauseClassifications?: Array<{ clauseIndex: number; clauseType: ClauseType }>;
        flaggedConflicts?: Array<{
          clauseIndex: number;
          ruleId: string;
          clauseExcerpt: string;
          plainExplanation: string;
          simpleEnglishExplanation: string;
          safeSuggestion: string;
        }>;
        plainLanguageSummary?: string;
        simpleEnglishSummary?: string;
        renegotiationPoints?: string[];
        tenantQuestions?: Array<{ question: string; whyItMatters: string; ruleId: string }>;
        guardNote?: string;
      };

      const classMap = new Map<number, ClauseType>();
      (parsed.clauseClassifications || []).forEach((item) => {
        if (
          typeof item.clauseIndex === 'number' &&
          VALID_CLAUSE_TYPES.includes(item.clauseType)
        ) {
          classMap.set(item.clauseIndex, item.clauseType);
        }
      });

      const clauseByIndex = new Map<number, (typeof segmentedRaw)[number]>();
      segmentedRaw.forEach((c) => clauseByIndex.set(c.index, c));

      // Strict Zero-Invented-Rules Grounding Guard
      const verifiedFlags: ClauseRiskFlag[] = [];
      const seenKeys = new Set<string>();

      (parsed.flaggedConflicts || []).forEach((flag) => {
        const authoritativeRule = activeRuleMap.get(flag.ruleId);
        const targetClause = clauseByIndex.get(flag.clauseIndex);
        if (!authoritativeRule || !targetClause) {
          return;
        }
        const dedupeKey = `${targetClause.index}::${authoritativeRule.ruleId}`;
        if (seenKeys.has(dedupeKey)) {
          return;
        }
        seenKeys.add(dedupeKey);

        verifiedFlags.push({
          flagKey: dedupeKey,
          ruleId: authoritativeRule.ruleId,
          ruleVersion: authoritativeRule.version,
          ruleTitle: authoritativeRule.title,
          severity: authoritativeRule.severity,
          clauseIndex: targetClause.index,
          clauseHeading: `${targetClause.numberingLabel ? `${targetClause.numberingLabel} ` : ''}${targetClause.heading}`.trim(),
          clauseExcerpt: flag.clauseExcerpt?.trim() || targetClause.text.slice(0, 220),
          plainExplanation: flag.plainExplanation?.trim() || authoritativeRule.description,
          simpleEnglishExplanation:
            flag.simpleEnglishExplanation?.trim() ||
            flag.plainExplanation?.trim() ||
            authoritativeRule.description,
          safeSuggestion: flag.safeSuggestion?.trim() || authoritativeRule.checkCriteria,
          groundedInRuleText: authoritativeRule.description,
        });
      });

      const segmentedClauses: SegmentedClause[] = segmentedRaw.map((c) => ({
        ...c,
        clauseType: classMap.get(c.index) || classifyClauseHeuristic(c.text, c.heading),
        flags: verifiedFlags.filter((f) => f.clauseIndex === c.index),
      }));

      // Verify Tenant Action Checklist strictly references valid active rules
      const verifiedChecklist: TenantChecklistItem[] = [];
      (parsed.tenantQuestions || []).forEach((q, idx) => {
        const rule = activeRuleMap.get(q.ruleId);
        if (!rule || !q.question?.trim()) return;
        verifiedChecklist.push({
          id: `chk-${idx + 1}-${rule.ruleId}`,
          question: q.question.trim(),
          whyItMatters: q.whyItMatters?.trim() || rule.description,
          relatedRuleId: rule.ruleId,
          relatedRuleVersion: rule.version,
        });
      });

      if (verifiedChecklist.length === 0 && verifiedFlags.length > 0) {
        verifiedFlags.forEach((f, idx) => {
          verifiedChecklist.push({
            id: `chk-auto-${idx + 1}`,
            question: `Can we update "${f.clauseHeading}" so it aligns with ${f.ruleTitle} (${f.ruleId} ${f.ruleVersion})?`,
            whyItMatters: f.simpleEnglishExplanation,
            relatedRuleId: f.ruleId,
            relatedRuleVersion: f.ruleVersion,
          });
        });
      }

      const categoryMatrix = buildCategoryMatrix(
        segmentedClauses,
        verifiedFlags,
        resolvedRulebook.activeRules
      );

      let rawPoints = 0;
      verifiedFlags.forEach((f) => {
        if (f.severity === 'HIGH') rawPoints += 22;
        else if (f.severity === 'MEDIUM') rawPoints += 12;
        else rawPoints += 6;
      });
      const riskScore = Math.min(100, rawPoints);
      const overallRiskLevel: LeaseAnalysisReport['overallRiskLevel'] =
        riskScore >= 70
          ? 'CRITICAL'
          : riskScore >= 40
            ? 'HIGH'
            : riskScore >= 15
              ? 'MODERATE'
              : 'LOW';

      const report: LeaseAnalysisReport = {
        id: `rep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        documentName,
        analyzedAt: new Date().toISOString(),
        rawText: leaseText,
        rulebookId: resolvedRulebook.packId,
        rulebookName: resolvedRulebook.packName,
        rulebookVersion: resolvedRulebook.version,
        overallRiskLevel,
        riskScore,
        plainLanguageSummary:
          parsed.plainLanguageSummary?.trim() ||
          `Evaluated ${segmentedClauses.length} clauses against ${resolvedRulebook.packName} (${resolvedRulebook.version}) and identified ${verifiedFlags.length} potential conflict(s).`,
        simpleEnglishSummary:
          parsed.simpleEnglishSummary?.trim() ||
          `We checked ${segmentedClauses.length} sections of your lease against the ${resolvedRulebook.version} protection checklist and found ${verifiedFlags.length} item(s) to discuss with your landlord.`,
        categoryMatrix,
        tenantChecklist: verifiedChecklist,
        renegotiationPoints: Array.isArray(parsed.renegotiationPoints)
          ? parsed.renegotiationPoints.filter((p) => typeof p === 'string' && p.trim().length > 0)
          : [],
        guardNote:
          `Illustrational decision-support only — not legal advice. Grounded strictly in ${resolvedRulebook.packName} (${resolvedRulebook.version}); all ${verifiedFlags.length} citation(s) were verified against active rulebook IDs with zero external or invented rules.` +
          (parsed.guardNote ? ` ${parsed.guardNote.trim()}` : ''),
        clauses: segmentedClauses,
        flags: verifiedFlags,
      };

      saveReport(report);
      return res.json(report);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Unexpected server error during lease analysis.';
      console.error('Lease review error:', message);
      return res.status(500).json({
        error: `Unable to analyze rental agreement: ${message}`,
      });
    }
  });

  // "No Fake Laws" Rulebook Grounding Q&A Endpoint
  app.post('/api/ask-rulebook', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY is not configured.',
      });
    }

    const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
    const leaseText = typeof req.body?.leaseText === 'string' ? req.body.leaseText.trim() : '';
    const resolvedRulebook = req.body?.resolvedRulebook as ResolvedRulebook | undefined;

    if (!question || !resolvedRulebook?.activeRules?.length) {
      return res.status(400).json({ error: 'Question and active rulebook are required.' });
    }

    const validRuleIds = new Set(resolvedRulebook.activeRules.map((r) => r.ruleId));

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents:
          `ACTIVE RULEBOOK (${resolvedRulebook.packName} ${resolvedRulebook.version}):\n` +
          `${JSON.stringify(resolvedRulebook.activeRules, null, 2)}\n\n` +
          (leaseText ? `AGREEMENT EXCERPT:\n${leaseText.slice(0, 12000)}\n\n` : '') +
          `USER QUESTION: "${question}"`,
        config: {
          systemInstruction:
            'You are the LeaseGuard AI "No Fake Laws" guard. Answer the user question using ONLY the provided ACTIVE RULEBOOK and AGREEMENT EXCERPT. ' +
            'If the ACTIVE RULEBOOK does not contain a rule addressing the user question (for example, pets, parking, diplomatic clauses, or local statutes not listed), ' +
            'you MUST set coveredByRulebook=false and clearly refuse to invent a rule or cite external laws. Never fabricate figures, statutes, or rule IDs.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              coveredByRulebook: { type: Type.BOOLEAN },
              citedRuleIds: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              answer: { type: Type.STRING },
            },
            required: ['coveredByRulebook', 'citedRuleIds', 'answer'],
          },
        },
      });

      const raw = (response.text ?? '').trim();
      const parsed = JSON.parse(raw) as {
        coveredByRulebook: boolean;
        citedRuleIds: string[];
        answer: string;
      };

      const verifiedIds = (parsed.citedRuleIds || []).filter((id) => validRuleIds.has(id));
      const isCovered = parsed.coveredByRulebook && verifiedIds.length > 0;

      return res.json({
        coveredByRulebook: isCovered,
        citedRuleIds: verifiedIds,
        answer: isCovered
          ? parsed.answer
          : `Not covered in ${resolvedRulebook.packName} (${resolvedRulebook.version}). ${parsed.answer} (LeaseGuard AI does not invent external laws or rules outside the active rulebook.)`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to query rulebook.';
      return res.status(500).json({ error: message });
    }
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distPath, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LeaseGuard AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
