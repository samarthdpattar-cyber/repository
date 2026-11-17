import type { ClauseType } from '../types/lease';

export interface RawSegmentedClause {
  id: string;
  index: number;
  numberingLabel: string;
  heading: string;
  text: string;
}

const HEADING_PATTERNS: RegExp[] = [
  // "1. RENT & ESCALATION: ..." or "1.2 Security Deposit. ..."
  /^\s*((?:Clause|Section|Article|ARTICLE|SECTION|CLAUSE|Part|PART)\s+(?:[IVXLCDM]+|\d+(?:\.\d+)*)|(?:[IVXLCDM]+\.)|(?:\d+(?:\.\d+)*[.)])|(?:\([a-z0-9]+\)))\s+([A-Z][A-Za-z0-9 &,/()-]{2,70}?)(?:\s*[:.—–-]\s*|\s*$)/,
  // "ARTICLE I - RENT AND ESCALATION" or "Section 4: Termination"
  /^\s*((?:Clause|Section|Article|ARTICLE|SECTION|CLAUSE|Part|PART)\s+(?:[IVXLCDM]+|\d+(?:\.\d+)*))\s*[:.—–-]?\s*(.*)$/i,
  // Numbered line without separate heading: "1. Monthly rent shall be..." or "(a) Tenant may not..."
  /^\s*(\d+(?:\.\d+)*[.)]|\([a-z0-9]+\)|[IVXLCDM]+\.)\s+(.+)$/,
  // All-caps standalone heading line: "SECURITY DEPOSIT" or "LOCK-IN PERIOD AND EARLY EXIT:"
  /^\s*([A-Z][A-Z0-9 &,/()-]{3,65})(?:\s*[:.—–-])?\s*$/,
  // Inline bold/titled lead-in without numbers: "Security Deposit: Tenant shall..."
  /^\s*([A-Z][A-Za-z0-9 &,/()-]{2,48}):\s+(.+)$/,
];

function isBoundaryLine(line: string): {
  isStart: boolean;
  numberingLabel: string;
  heading: string;
  remainder: string;
} {
  const trimmed = line.trim();
  if (!trimmed) {
    return { isStart: false, numberingLabel: '', heading: '', remainder: '' };
  }

  // Skip likely document title or page markers
  if (/^page\s+\d+(\s+of\s+\d+)?$/i.test(trimmed)) {
    return { isStart: false, numberingLabel: '', heading: '', remainder: '' };
  }

  // 1. Named Section / Article / Clause prefix (e.g. "ARTICLE II — SECURITY DEPOSIT", "Clause 3: Lock-In")
  const namedMatch = trimmed.match(
    /^((?:Clause|Section|Article|Part)\s+(?:[IVXLCDM]+|\d+(?:\.\d+)*))\s*[:.—–-]?\s*(.*)$/i
  );
  if (namedMatch) {
    const label = namedMatch[1].trim();
    const rest = namedMatch[2].trim();
    const splitHeading = rest.match(/^([A-Z][A-Za-z0-9 &,/()-]{2,60}?)(?:\s*[:.—–-]\s*(.+))?$/);
    if (splitHeading && splitHeading[2]) {
      return {
        isStart: true,
        numberingLabel: label,
        heading: splitHeading[1].trim(),
        remainder: splitHeading[2].trim(),
      };
    }
    return {
      isStart: true,
      numberingLabel: label,
      heading: rest.length <= 65 ? rest : `${rest.slice(0, 52).trim()}…`,
      remainder: rest.length <= 65 ? '' : rest,
    };
  }

  // 2. Numeric or Roman prefix ("1.", "1.1", "2)", "III.")
  const numMatch = trimmed.match(/^(\d+(?:\.\d+)*[.)]|[IVXLCDM]+\.)\s+(.+)$/);
  if (numMatch) {
    const label = numMatch[1].trim();
    const body = numMatch[2].trim();
    const colonSplit = body.match(/^([A-Z][A-Za-z0-9 &,/()-]{2,60}?)\s*[:.—–-]\s+(.+)$/);
    if (colonSplit) {
      return {
        isStart: true,
        numberingLabel: label,
        heading: colonSplit[1].trim(),
        remainder: colonSplit[2].trim(),
      };
    }
    const capsSplit = body.match(/^([A-Z0-9 &,/()-]{3,55})$/);
    if (capsSplit) {
      return {
        isStart: true,
        numberingLabel: label,
        heading: capsSplit[1].trim(),
        remainder: '',
      };
    }
    return {
      isStart: true,
      numberingLabel: label,
      heading: '',
      remainder: body,
    };
  }

  // 3. Lettered sub-clause at line start ("(a)", "(b)", "(i)")
  const subMatch = trimmed.match(/^(\([a-z0-9]{1,3}\))\s+(.+)$/i);
  if (subMatch) {
    const label = subMatch[1].trim();
    const body = subMatch[2].trim();
    const colonSplit = body.match(/^([A-Z][A-Za-z0-9 &,/()-]{2,55}?)\s*[:.—–-]\s+(.+)$/);
    if (colonSplit) {
      return {
        isStart: true,
        numberingLabel: label,
        heading: colonSplit[1].trim(),
        remainder: colonSplit[2].trim(),
      };
    }
    return {
      isStart: true,
      numberingLabel: label,
      heading: '',
      remainder: body,
    };
  }

  // 4. Unnumbered All-Caps heading line ("SECURITY DEPOSIT" or "MAINTENANCE & REPAIRS:")
  const allCapsMatch = trimmed.match(/^([A-Z][A-Z0-9 &,/()-]{4,64})(?:\s*[:.—–-])?\s*$/);
  if (allCapsMatch && /[A-Z]{2,}/.test(allCapsMatch[1]) && !/^(RESIDENTIAL|PENTHOUSE|LEASE|AGREEMENT|EXHIBIT|SCHEDULE)/.test(allCapsMatch[1])) {
    return {
      isStart: true,
      numberingLabel: '',
      heading: allCapsMatch[1].trim(),
      remainder: '',
    };
  }

  // 5. Unnumbered Title-Case heading with colon ("Security Deposit: Tenant shall...")
  const titleColonMatch = trimmed.match(/^([A-Z][A-Za-z0-9 &,/()-]{2,48}):\s+(.+)$/);
  if (titleColonMatch) {
    return {
      isStart: true,
      numberingLabel: '',
      heading: titleColonMatch[1].trim(),
      remainder: titleColonMatch[2].trim(),
    };
  }

  return { isStart: false, numberingLabel: '', heading: '', remainder: '' };
}

function inferFallbackHeading(text: string, index: number): string {
  const lower = text.toLowerCase();
  if (/deposit|escrow|refund/.test(lower)) return 'Security Deposit Terms';
  if (/lock[\s-]?in|minimum\s+term|early\s+(exit|termination)/.test(lower)) return 'Lock-In & Early Exit';
  if (/rent|escalat|annual\s+increase|additional\s+rent/.test(lower)) return 'Rent & Escalation';
  if (/evict|terminat|vacate|notice\s+to\s+quit/.test(lower)) return 'Termination & Notice';
  if (/repair|maint|hvac|structural|plumb/.test(lower)) return 'Maintenance & Repairs';
  if (/sublet|subleas|assign/.test(lower)) return 'Subletting & Assignment';
  if (/entry|inspect|privacy|access/.test(lower)) return 'Landlord Access & Privacy';
  if (/renew|auto[\s-]?renew|holdover/.test(lower)) return 'Renewal & Holdover';
  if (/late\s+fee|utilit|cleaning|charge/.test(lower)) return 'Fees & Utilities';
  return `Clause ${index}`;
}

export function segmentAgreementClauses(rawInput: string): RawSegmentedClause[] {
  const normalized = rawInput
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!normalized) return [];

  const lines = normalized.split('\n');
  const clauses: Array<{
    numberingLabel: string;
    heading: string;
    lines: string[];
  }> = [];

  let preambleLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (/^page\s+\d+(\s+of\s+\d+)?$/i.test(trimmed)) {
      continue;
    }

    const boundary = isBoundaryLine(rawLine);

    if (boundary.isStart) {
      const contentLine = boundary.remainder || trimmed;
      clauses.push({
        numberingLabel: boundary.numberingLabel,
        heading: boundary.heading,
        lines: boundary.remainder ? [rawLine.trim()] : [trimmed],
      });
      if (!boundary.remainder && boundary.heading && clauses[clauses.length - 1].lines[0] === trimmed) {
        // Keep the heading line inside text so verbatim excerpt matches
      } else if (contentLine && clauses[clauses.length - 1].lines.length === 0) {
        clauses[clauses.length - 1].lines.push(contentLine);
      }
    } else if (clauses.length > 0) {
      if (trimmed === '') {
        clauses[clauses.length - 1].lines.push('');
      } else {
        clauses[clauses.length - 1].lines.push(trimmed);
      }
    } else if (trimmed !== '') {
      preambleLines.push(trimmed);
    }
  }

  // Fallback for pure unnumbered paragraph prose
  if (clauses.length <= 1) {
    const paragraphs = normalized
      .split(/\n\s*\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 25);

    if (paragraphs.length > 1) {
      return paragraphs.map((p, idx) => {
        const firstLine = p.split('\n')[0].trim();
        const maybeTitle = firstLine.match(/^([A-Z][A-Za-z0-9 &,/()-]{2,48}):\s+/);
        const heading = maybeTitle ? maybeTitle[1] : inferFallbackHeading(p, idx + 1);
        return {
          id: `C${idx + 1}`,
          index: idx + 1,
          numberingLabel: `¶${idx + 1}`,
          heading,
          text: p,
        };
      });
    }
  }

  const finalClauses: RawSegmentedClause[] = [];
  if (preambleLines.length > 0) {
    const preambleText = preambleLines.join(' ').trim();
    // Only include preamble if it contains substantive terms rather than just a short document title
    if (preambleText.length > 90) {
      finalClauses.push({
        id: 'C0',
        index: 0,
        numberingLabel: 'Preamble',
        heading: 'Agreement Header & Parties',
        text: preambleText,
      });
    }
  }

  clauses.forEach((c, idx) => {
    const text = c.lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    if (!text) return;
    const numIdx = finalClauses.length + 1;
    finalClauses.push({
      id: `C${numIdx}`,
      index: numIdx,
      numberingLabel: c.numberingLabel || `§${idx + 1}`,
      heading: c.heading || inferFallbackHeading(text, numIdx),
      text,
    });
  });

  // Re-index cleanly 1..N
  return finalClauses.map((c, idx) => ({
    ...c,
    id: `C${idx + 1}`,
    index: idx + 1,
  }));
}

export function classifyClauseHeuristic(text: string, heading: string): ClauseType {
  const combined = `${heading} ${text}`.toLowerCase();
  if (/security\s+deposit|damage\s+deposit|escrow|refund\s+of\s+deposit/.test(combined)) {
    return 'Security Deposit';
  }
  if (/lock[\s-]?in|minimum\s+stay|early\s+(exit|surrender)|liquidated\s+penalty/.test(combined)) {
    return 'Lock-In Period';
  }
  if (/rent|escalat|additional\s+rent|annual\s+increase|base\s+rent/.test(combined)) {
    return 'Rent & Escalation';
  }
  if (/evict|terminat|vacate|notice\s+to\s+quit|habitability|abatement/.test(combined)) {
    return 'Termination & Eviction';
  }
  if (/maint|repair|hvac|structural|plumb|roof|glazing/.test(combined)) {
    return 'Maintenance & Repairs';
  }
  if (/sublet|subleas|assign|transfer\s+fee/.test(combined)) {
    return 'Subletting & Assignment';
  }
  if (/entry|inspect|privacy|prior\s+notice\s+for\s+entry|enter\s+the\s+premises/.test(combined)) {
    return 'Entry & Privacy';
  }
  if (/auto[\s-]?renew|renewal|holdover|extension/.test(combined)) {
    return 'Renewal & Notice';
  }
  if (/late\s+fee|grace\s+period|utilit|cleaning|meter|amenity/.test(combined)) {
    return 'Utilities & Fees';
  }
  return 'Other';
}

// Unused regex array kept referenced for clarity of supported patterns
export const SUPPORTED_SEGMENTATION_PATTERNS = HEADING_PATTERNS.length;
