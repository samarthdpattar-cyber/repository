import type {
  AnalysisDiffResult,
  ClauseRiskFlag,
  FlagChange,
  LeaseAnalysisReport,
  ResolvedActiveRule,
  ResolvedRulebook,
  RuleDefinition,
  RulebookPack,
  SupersededRule,
} from '../types/lease';

export const BUILTIN_RULEBOOK_PACKS: RulebookPack[] = [
  {
    id: 'metro-v1.0',
    name: 'Metro Housing Standard Rulebook',
    region: 'Metro Housing Authority',
    version: 'v1.0',
    effectiveDate: '2024-01-15',
    description:
      'Baseline tenant-protection standard covering 3-month deposit caps, 10% escalation ceiling, 15-day termination notice, and structural maintenance boundaries.',
    rules: [
      {
        ruleId: 'DEP-01',
        version: 'v1.0',
        title: 'Security Deposit Ceiling (3 Months)',
        category: 'Security Deposit',
        description:
          'Security deposits may not exceed 3 months of base rent and must be returned with an itemized deduction statement within 30 days of surrender.',
        checkCriteria:
          'Flag if deposit exceeds 3 months base rent, allows unilateral/sole-discretion forfeiture, or waives itemized accounting.',
        severity: 'MEDIUM',
        effectiveDate: '2024-01-15',
      },
      {
        ruleId: 'ESC-01',
        version: 'v1.0',
        title: 'Annual Rent Escalation Limit (10%)',
        category: 'Rent & Escalation',
        description:
          'Scheduled annual rent increases during a fixed lease term must not exceed 10% per year.',
        checkCriteria:
          'Flag if annual rent escalation exceeds 10% or authorizes arbitrary mid-term rent spikes.',
        severity: 'MEDIUM',
        effectiveDate: '2024-01-15',
      },
      {
        ruleId: 'LCK-01',
        version: 'v1.0',
        title: 'Asymmetric Lock-In & Early Exit Penalty',
        category: 'Lock-In Period',
        description:
          'Lock-in periods exceeding 12 months without bilateral break protections or imposing punitive multi-month forfeiture even after re-letting are unfair.',
        checkCriteria:
          'Flag if lock-in exceeds 12 months unilaterally or imposes >3 months liquidated exit penalty regardless of mitigation.',
        severity: 'LOW',
        effectiveDate: '2024-01-15',
      },
      {
        ruleId: 'TRM-01',
        version: 'v1.0',
        title: 'Minimum Landlord Termination Notice (15 Days)',
        category: 'Termination & Eviction',
        description:
          'Landlord termination or eviction for non-emergency reasons requires at least 15 days written notice.',
        checkCriteria:
          'Flag if landlord may terminate or evict immediately or with fewer than 15 days notice.',
        severity: 'HIGH',
        effectiveDate: '2024-01-15',
      },
      {
        ruleId: 'MNT-01',
        version: 'v1.0',
        title: 'Landlord Structural & Core System Responsibility',
        category: 'Maintenance & Repairs',
        description:
          'Landlords remain responsible for structural envelope, roof, glazing seals, and primary HVAC/plumbing systems.',
        checkCriteria:
          'Flag if clause transfers structural repairs, primary HVAC compressor, roof, or pre-existing defect liability to tenant.',
        severity: 'HIGH',
        effectiveDate: '2024-01-15',
      },
      {
        ruleId: 'ENT-01',
        version: 'v1.0',
        title: 'Prior Notice for Non-Emergency Entry (12 Hours)',
        category: 'Entry & Privacy',
        description:
          'Landlord must provide at least 12 hours notice prior to non-emergency entry for inspections or showings.',
        checkCriteria:
          'Flag if clause permits entry at any time without prior notice or with <12 hours notice.',
        severity: 'MEDIUM',
        effectiveDate: '2024-01-15',
      },
      {
        ruleId: 'SUB-01',
        version: 'v1.0',
        title: 'Subletting Transfer Fee Cap (1 Week Rent)',
        category: 'Subletting & Assignment',
        description:
          'Administrative charges for reviewing a sublease or assignment request must not exceed one week of base rent.',
        checkCriteria:
          'Flag if subletting/assignment imposes a non-refundable administrative fee exceeding 25% of monthly rent (approx. 1 week) or arbitrary blanket forfeiture.',
        severity: 'LOW',
        effectiveDate: '2024-01-15',
      },
      {
        ruleId: 'REN-01',
        version: 'v1.0',
        title: 'Automatic Renewal Trap Safeguard',
        category: 'Renewal & Notice',
        description:
          'Automatic multi-year renewals requiring >90 days advance notarized/courier opt-out or imposing >10% default renewal hikes are abusive.',
        checkCriteria:
          'Flag if auto-renewal requires >90 days advance notice, courier/notarized hurdles, or >10% automatic rent increase.',
        severity: 'MEDIUM',
        effectiveDate: '2024-01-15',
      },
    ],
  },
  {
    id: 'metro-v2.0',
    name: 'Metro Housing Amendment',
    region: 'Metro Housing Authority',
    version: 'v2.0',
    effectiveDate: '2025-03-01',
    parentPackId: 'metro-v1.0',
    description:
      '2025 Amendment tightening deposit caps to 2 months, escalation caps to 5%, termination notice to 30 days, entry notice to 24 hours, and adding late-fee caps.',
    rules: [
      {
        ruleId: 'DEP-01',
        version: 'v2.0',
        supersedes: 'DEP-01@v1.0',
        title: 'Tightened Security Deposit Cap (2 Months / 21-Day Return)',
        category: 'Security Deposit',
        description:
          'Amends v1.0: Security deposits are capped at 2 months of base rent and must be refunded within 21 days with itemized receipts.',
        checkCriteria:
          'Flag if security deposit exceeds 2 months base rent, delays refund past 21 days, or permits sole-discretion retention without receipts.',
        severity: 'HIGH',
        effectiveDate: '2025-03-01',
      },
      {
        ruleId: 'ESC-01',
        version: 'v2.0',
        supersedes: 'ESC-01@v1.0',
        title: 'Annual Escalation Cap (5%) & Pass-Through Ban',
        category: 'Rent & Escalation',
        description:
          'Amends v1.0: Fixed-term rent increases are capped at 5% annually; landlords cannot pass through building capital improvements or property tax hikes as Additional Rent.',
        checkCriteria:
          'Flag if annual escalation exceeds 5% or passes through capital improvement levies, facade assessments, or property taxes as Additional Rent.',
        severity: 'HIGH',
        effectiveDate: '2025-03-01',
      },
      {
        ruleId: 'TRM-01',
        version: 'v2.0',
        supersedes: 'TRM-01@v1.0',
        title: '30-Day Minimum Termination Notice & Habitability Protection',
        category: 'Termination & Eviction',
        description:
          'Amends v1.0: Requires at least 30 days written notice for landlord termination and prohibits waiving rent abatement during essential service outages.',
        checkCriteria:
          'Flag if landlord termination notice is under 30 days or if tenant waives rent abatement / habitability claims during utility or elevator outages.',
        severity: 'HIGH',
        effectiveDate: '2025-03-01',
      },
      {
        ruleId: 'ENT-01',
        version: 'v2.0',
        supersedes: 'ENT-01@v1.0',
        title: '24-Hour Written Entry Notice Requirement',
        category: 'Entry & Privacy',
        description:
          'Amends v1.0: Non-emergency landlord entry requires at least 24 hours advance written notice during reasonable hours.',
        checkCriteria:
          'Flag if clause allows entry without notice or with less than 24 hours advance written notice.',
        severity: 'HIGH',
        effectiveDate: '2025-03-01',
      },
      {
        ruleId: 'LCK-02',
        version: 'v2.0',
        supersedes: 'LCK-01@v1.0',
        title: 'Lock-In Penalty Cap (Max 2 Months Rent)',
        category: 'Lock-In Period',
        description:
          'Replaces LCK-01: Early exit penalties during a lock-in period cannot exceed 2 months rent and must terminate once a replacement tenant begins paying.',
        checkCriteria:
          'Flag if early termination penalty exceeds 2 months rent or collects double-rent after re-letting.',
        severity: 'HIGH',
        effectiveDate: '2025-03-01',
      },
      {
        ruleId: 'FEE-01',
        version: 'v2.0',
        title: 'Late Fee Grace Period (5 Days) & 5% Cap',
        category: 'Utilities & Fees',
        description:
          'New 2025 rule: Rent late fees require at least a 5-day grace period and cannot exceed 5% of overdue monthly rent.',
        checkCriteria:
          'Flag if late fee applies with <5 days grace period or exceeds 5% of monthly rent.',
        severity: 'MEDIUM',
        effectiveDate: '2025-03-01',
      },
    ],
  },
  {
    id: 'metro-v2.1',
    name: 'Metro Emergency Rent & Deposit Reform',
    region: 'Metro Housing Authority',
    version: 'v2.1',
    effectiveDate: '2026-01-10',
    parentPackId: 'metro-v2.0',
    description:
      '2026 Reform lowering deposit cap to 1.5 months (14-day refund), adding mandatory cleaning-fee bans, and repealing the v1.0 sublet transfer fee rule.',
    rules: [
      {
        ruleId: 'DEP-01',
        version: 'v2.1',
        supersedes: 'DEP-01@v2.0',
        title: 'Emergency Deposit Cap (1.5 Months / 14-Day Return)',
        category: 'Security Deposit',
        description:
          'Amends v2.0: Caps residential security deposits at 1.5 months base rent with mandatory 14-day return and itemized invoices.',
        checkCriteria:
          'Flag if security deposit exceeds 1.5 months base rent or allows refund delay beyond 14 days.',
        severity: 'HIGH',
        effectiveDate: '2026-01-10',
      },
      {
        ruleId: 'SUB-01',
        version: 'v2.1',
        supersedes: 'SUB-01@v1.0',
        repealed: true,
        title: 'Repeal of Sublet Transfer Fee Cap',
        category: 'Subletting & Assignment',
        description:
          'Repealed under 2026 Urban Lease Reform: administrative sublet review fees are no longer regulated under SUB-01.',
        checkCriteria: 'Repealed — no longer generates a conflict flag.',
        severity: 'LOW',
        effectiveDate: '2026-01-10',
      },
      {
        ruleId: 'FEE-02',
        version: 'v2.1',
        title: 'Prohibition on Mandatory Deep-Cleaning Deductions',
        category: 'Utilities & Fees',
        description:
          'New 2026 rule: Landlords cannot mandate automatic non-refundable move-out deep-cleaning or stone-polishing fees regardless of unit condition.',
        checkCriteria:
          'Flag if clause imposes mandatory move-out cleaning/polishing deductions unrelated to documented damage beyond normal wear and tear.',
        severity: 'HIGH',
        effectiveDate: '2026-01-10',
      },
    ],
  },
];

export function resolveRulebookPack(
  selectedPackId: string,
  allPacks: RulebookPack[]
): ResolvedRulebook {
  const packMap = new Map<string, RulebookPack>();
  allPacks.forEach((p) => packMap.set(p.id, p));

  const target = packMap.get(selectedPackId) || allPacks[0];
  const chain: RulebookPack[] = [];
  const visited = new Set<string>();

  let cursor: RulebookPack | undefined = target;
  while (cursor && !visited.has(cursor.id)) {
    visited.add(cursor.id);
    chain.unshift(cursor);
    cursor = cursor.parentPackId ? packMap.get(cursor.parentPackId) : undefined;
  }

  const activeMap = new Map<string, ResolvedActiveRule>();
  const supersededRules: SupersededRule[] = [];

  for (const pack of chain) {
    for (const rule of pack.rules) {
      const overridesHistory: string[] = [];

      // 1. Check explicit `supersedes` target (e.g., "LCK-01@v1.0" or "DEP-01")
      if (rule.supersedes) {
        const targetRuleId = rule.supersedes.split('@')[0];
        const existingTarget = activeMap.get(targetRuleId);
        if (existingTarget) {
          overridesHistory.push(...existingTarget.overridesHistory, `${existingTarget.ruleId} ${existingTarget.version}`);
          supersededRules.push({
            ...existingTarget,
            overriddenBy: `${rule.ruleId} ${rule.version}${rule.repealed ? ' (Repealed)' : ''}`,
          });
          activeMap.delete(targetRuleId);
        }
      }

      // 2. Check same ruleId overridden by a newer version in the chain
      const existingSameId = activeMap.get(rule.ruleId);
      if (existingSameId) {
        const priorLabel = `${existingSameId.ruleId} ${existingSameId.version}`;
        if (!overridesHistory.includes(priorLabel)) {
          overridesHistory.push(...existingSameId.overridesHistory, priorLabel);
          supersededRules.push({
            ...existingSameId,
            overriddenBy: `${rule.ruleId} ${rule.version}${rule.repealed ? ' (Repealed)' : ''}`,
          });
        }
        activeMap.delete(rule.ruleId);
      }

      if (!rule.repealed) {
        activeMap.set(rule.ruleId, {
          ...rule,
          overridesHistory,
        });
      }
    }
  }

  return {
    packId: target.id,
    packName: target.name,
    region: target.region,
    version: target.version,
    effectiveDate: target.effectiveDate,
    chainLabels: chain.map((p) => `${p.name} (${p.version})`),
    activeRules: Array.from(activeMap.values()),
    supersededRules,
  };
}

export function computeAnalysisDiff(
  previous: LeaseAnalysisReport,
  current: LeaseAnalysisReport
): AnalysisDiffResult {
  const prevByKey = new Map<string, ClauseRiskFlag>();
  const currByKey = new Map<string, ClauseRiskFlag>();

  previous.flags.forEach((f) => {
    const key = `${f.clauseIndex}::${f.ruleId}`;
    prevByKey.set(key, f);
  });

  current.flags.forEach((f) => {
    const key = `${f.clauseIndex}::${f.ruleId}`;
    currByKey.set(key, f);
  });

  const appeared: ClauseRiskFlag[] = [];
  const disappeared: ClauseRiskFlag[] = [];
  const changed: FlagChange[] = [];
  let unchangedCount = 0;

  currByKey.forEach((currFlag, key) => {
    const prevFlag = prevByKey.get(key);
    if (!prevFlag) {
      appeared.push(currFlag);
    } else if (
      prevFlag.severity !== currFlag.severity ||
      prevFlag.ruleVersion !== currFlag.ruleVersion
    ) {
      const parts: string[] = [];
      if (prevFlag.ruleVersion !== currFlag.ruleVersion) {
        parts.push(`Rule updated ${prevFlag.ruleVersion} → ${currFlag.ruleVersion}`);
      }
      if (prevFlag.severity !== currFlag.severity) {
        parts.push(`Severity ${prevFlag.severity} → ${currFlag.severity}`);
      }
      changed.push({
        before: prevFlag,
        after: currFlag,
        changeSummary: parts.join(' · '),
      });
    } else {
      unchangedCount += 1;
    }
  });

  prevByKey.forEach((prevFlag, key) => {
    if (!currByKey.has(key)) {
      disappeared.push(prevFlag);
    }
  });

  return {
    previousReportId: previous.id,
    previousDocumentName: previous.documentName,
    previousVersionLabel: `${previous.rulebookName} (${previous.rulebookVersion})`,
    currentVersionLabel: `${current.rulebookName} (${current.rulebookVersion})`,
    appeared,
    disappeared,
    changed,
    unchangedCount,
  };
}

export const SAMPLE_CUSTOM_RULEBOOK_TEMPLATE: RulebookPack = {
  id: 'custom-amendment-2026',
  name: 'Custom Regional Amendment Pack',
  region: 'Custom Municipal Region',
  version: 'v3.0-custom',
  effectiveDate: '2026-06-01',
  parentPackId: 'metro-v2.0',
  isCustom: true,
  description:
    'Custom amendment layered over Metro v2.0: lowers deposit cap to 1 month and limits lock-in to 6 months.',
  rules: [
    {
      ruleId: 'DEP-01',
      version: 'v3.0-custom',
      supersedes: 'DEP-01@v2.0',
      title: 'Strict 1-Month Deposit Cap',
      category: 'Security Deposit',
      description: 'Deposit cannot exceed 1 month of base rent under any circumstance.',
      checkCriteria: 'Flag if security deposit exceeds 1 month base rent.',
      severity: 'HIGH',
      effectiveDate: '2026-06-01',
    },
    {
      ruleId: 'FEE-01',
      version: 'v3.0-custom',
      supersedes: 'FEE-01@v2.0',
      repealed: true,
      title: 'Repeal Late Fee Rule',
      category: 'Utilities & Fees',
      description: 'Repeals FEE-01 check for demonstration.',
      checkCriteria: 'Repealed',
      severity: 'LOW',
      effectiveDate: '2026-06-01',
    },
  ],
};
