export type ClauseType =
  | 'Rent & Escalation'
  | 'Security Deposit'
  | 'Lock-In Period'
  | 'Termination & Eviction'
  | 'Maintenance & Repairs'
  | 'Subletting & Assignment'
  | 'Entry & Privacy'
  | 'Utilities & Fees'
  | 'Renewal & Notice'
  | 'Other';

export type RuleSeverity = 'HIGH' | 'MEDIUM' | 'LOW';

export interface RuleDefinition {
  ruleId: string;
  version: string;
  title: string;
  category: ClauseType;
  description: string;
  checkCriteria: string;
  severity: RuleSeverity;
  effectiveDate: string;
  supersedes?: string;
  repealed?: boolean;
}

export interface RulebookPack {
  id: string;
  name: string;
  region: string;
  version: string;
  effectiveDate: string;
  description: string;
  parentPackId?: string;
  isCustom?: boolean;
  rules: RuleDefinition[];
}

export interface ResolvedActiveRule extends RuleDefinition {
  overridesHistory: string[];
}

export interface SupersededRule extends RuleDefinition {
  overriddenBy: string;
}

export interface ResolvedRulebook {
  packId: string;
  packName: string;
  region: string;
  version: string;
  effectiveDate: string;
  chainLabels: string[];
  activeRules: ResolvedActiveRule[];
  supersededRules: SupersededRule[];
}

export interface ClauseRiskFlag {
  flagKey: string;
  ruleId: string;
  ruleVersion: string;
  ruleTitle: string;
  severity: RuleSeverity;
  clauseIndex: number;
  clauseHeading: string;
  clauseExcerpt: string;
  plainExplanation: string;
  simpleEnglishExplanation: string;
  safeSuggestion: string;
  groundedInRuleText: string;
}

export interface CategoryRiskRow {
  category: string;
  risk: 'High' | 'Medium' | 'Low';
  explanation: string;
  simpleExplanation: string;
  ruleRefs: string[];
}

export interface TenantChecklistItem {
  id: string;
  question: string;
  whyItMatters: string;
  relatedRuleId: string;
  relatedRuleVersion: string;
}

export interface SegmentedClause {
  id: string;
  index: number;
  numberingLabel: string;
  heading: string;
  text: string;
  clauseType: ClauseType;
  flags: ClauseRiskFlag[];
}

export interface LeaseAnalysisReport {
  id: string;
  documentName: string;
  analyzedAt: string;
  rawText: string;
  rulebookId: string;
  rulebookName: string;
  rulebookVersion: string;
  overallRiskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  riskScore: number;
  plainLanguageSummary: string;
  simpleEnglishSummary: string;
  categoryMatrix: CategoryRiskRow[];
  tenantChecklist: TenantChecklistItem[];
  renegotiationPoints: string[];
  guardNote: string;
  clauses: SegmentedClause[];
  flags: ClauseRiskFlag[];
}

export interface FlagChange {
  before: ClauseRiskFlag;
  after: ClauseRiskFlag;
  changeSummary: string;
}

export interface AnalysisDiffResult {
  previousReportId: string;
  previousDocumentName: string;
  previousVersionLabel: string;
  currentVersionLabel: string;
  appeared: ClauseRiskFlag[];
  disappeared: ClauseRiskFlag[];
  changed: FlagChange[];
  unchangedCount: number;
}

export interface AccessInquiry {
  id: string;
  name: string;
  email: string;
  organizationType: 'Tenant' | 'Legal Aid Clinic' | 'Student Housing' | 'Tenant Union' | 'Other';
  region: string;
  notes: string;
  createdAt: string;
}

