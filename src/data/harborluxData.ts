import type { CategoryRiskRow } from '../types/lease';

export const SAMPLE_LEASE_PRESETS: Array<{
  id: string;
  label: string;
  shortLabel: string;
  formatTag: string;
  text: string;
}> = [
  {
    id: 'harbour-loft-articles',
    label: 'Harbour Loft Lease (Roman Articles · Time Machine Demo)',
    shortLabel: 'Roman Articles Lease',
    formatTag: 'Article I / (a)',
    text: `HARBOUR RESIDENCE LEASE — SCHEDULE OF TERMS

ARTICLE I — SECURITY DEPOSIT
Tenant shall deposit an amount equal to 2.5 months' base rent ($49,500) upon execution. Landlord shall return the deposit within 25 days of surrender with an itemized repair statement.

ARTICLE II — ANNUAL ESCALATION
Base monthly rent of $19,800 shall increase by 7.5% on each lease anniversary during the 36-month term.

ARTICLE III — LOCK-IN & EARLY EXIT
(a) Tenant agrees to a 10-month lock-in period. Early exit prior to month 10 incurs a fixed penalty equal to 2.5 months' rent even if the residence is re-let immediately.

ARTICLE IV — TERMINATION NOTICE & ACCESS
Landlord may terminate this lease upon 18 days' written notice in the event of building redevelopment. Landlord may enter the unit for inspection upon 14 hours' advance notice.

ARTICLE V — SUBLETTING TRANSFER FEE
Any approved sublease or lease assignment shall carry a non-refundable administrative processing fee equal to 2 weeks' rent ($9,900).

ARTICLE VI — LATE RENT CHARGE
Rent due on the 1st of each month carries a 3-day grace period, after which a 6% late fee applies.`,
  },
  {
    id: 'aggressive-penthouse',
    label: 'Summit Tower Lease (Numeric 1., 2. · High Risk)',
    shortLabel: 'Numeric High-Risk Lease',
    formatTag: 'Numeric 1.',
    text: `RESIDENTIAL LEASE AGREEMENT — SUMMIT TOWER
1. RENT & ESCALATION: Monthly base rent of $3,200 shall escalate automatically by 11% on each anniversary, plus Landlord may pass through 100% of building capital improvement assessments, facade maintenance levies, and property tax increases with 10 days' notice as Additional Rent.
2. SECURITY DEPOSIT: Tenant shall post 4 months' rent ($12,800). Landlord may retain the full deposit at Landlord's sole discretion for any perceived wear, scuffing of floors, or delay in vacating by noon on the termination date, without itemized invoicing.
3. MAINTENANCE & STRUCTURAL REPAIRS: Tenant assumes full responsibility for all HVAC compressors, window glazing seals, drainage systems, and primary plumbing fixtures regardless of pre-existing condition or manufacturer defect.
4. LANDLORD ACCESS & TERMINATION: Landlord and its agents may enter the Premises at any time without prior notice for inspection, marketing, or photography. Landlord may terminate this Lease upon 10 days' notice if management elects to renovate the floor; Tenant waives all claims for relocation costs or rent abatement during service outages exceeding 72 hours.
5. AUTO-RENEWAL: Unless Tenant delivers notarized written notice via courier at least 120 days prior to expiration, this Lease renews automatically for an additional 24-month term at 112% of the then-current rent.
6. MOVE-OUT CLEANING FEE: Upon vacating, Landlord shall deduct a mandatory $650 non-refundable deep-cleaning fee from the deposit regardless of cleanliness.`,
  },
  {
    id: 'unnumbered-prose',
    label: 'Waterfront Studio Lease (Unnumbered Prose Paragraphs)',
    shortLabel: 'Unnumbered Prose Lease',
    formatTag: 'Unnumbered Prose',
    text: `Security Deposit: Tenant pays a refundable deposit equal to 1.5 months' rent ($3,000), returned within 14 days of move-out with receipts for any damage beyond normal wear and tear.

Rent and Utilities: Monthly rent is $2,000 payable on the 1st with a 5-day grace period and a 3% late fee thereafter. Annual renewal increases are capped at 3%.

Maintenance and Repairs: Landlord maintains the roof, exterior walls, primary HVAC system, and main plumbing risers. Tenant replaces interior lightbulbs and air filters.

Entry and Termination: Landlord must give 24 hours' written notice prior to non-emergency entry and at least 30 days' written notice for end-of-term non-renewal.`,
  },
];

export const ILLUSTRATIVE_PREVIEW_MATRIX: CategoryRiskRow[] = [
  {
    category: 'Security Deposit',
    risk: 'High',
    explanation: 'Potential conflict with a provided rule',
    simpleExplanation:
      'The landlord is asking for more deposit money—or keeping it longer—than the active rulebook allows.',
    ruleRefs: ['DEP-01 · v2.0'],
  },
  {
    category: 'Rent',
    risk: 'Low',
    explanation: 'No configured conflict detected',
    simpleExplanation:
      'Your rent amount and yearly increase stay within the rulebook limits.',
    ruleRefs: ['ESC-01 · v2.0'],
  },
  {
    category: 'Maintenance',
    risk: 'Medium',
    explanation: 'Responsibility is unclear',
    simpleExplanation:
      'The wording does not clearly state who pays when major appliances or pipes break.',
    ruleRefs: ['MNT-01 · v1.0'],
  },
  {
    category: 'Termination',
    risk: 'High',
    explanation: 'Requires further review',
    simpleExplanation:
      'The landlord can end your lease on shorter notice than the active rulebook protects.',
    ruleRefs: ['TRM-01 · v2.0'],
  },
];

export const PIPELINE_STEPS: Array<{ step: number; title: string; detail: string }> = [
  {
    step: 1,
    title: 'User uploads PDF or text',
    detail: 'Supports diverse numbering, Roman articles, or unnumbered prose.',
  },
  {
    step: 2,
    title: 'AI reads the document',
    detail: 'Extracts clean line-preserved text page by page.',
  },
  {
    step: 3,
    title: 'Separates individual clauses',
    detail: 'Builds a navigable clause list without losing original wording.',
  },
  {
    step: 4,
    title: 'AI identifies clause categories',
    detail: 'Labels Deposit, Rent, Maintenance, Termination, Lock-In & more.',
  },
  {
    step: 5,
    title: 'Rule engine checks rulebook',
    detail: 'Resolves active rules & overrides with zero invented laws.',
  },
  {
    step: 6,
    title: 'Identifies potential risks',
    detail: 'Assigns High/Medium/Low flags with exact Rule ID & version.',
  },
  {
    step: 7,
    title: 'Receives complete report',
    detail: 'Risk Dashboard, Evidence, Simple English, Checklist & Time Machine.',
  },
];
