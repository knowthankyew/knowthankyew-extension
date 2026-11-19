import {
  DestinationToolId,
  DestinationToolMetadata,
  KtyHandoffFinding,
  KtyHandoffPayload,
  KTY_HANDOFF_SESSION_KEY,
} from './handoff-types';
import {
  EvaluationMatch,
  PageScanResult,
  DiscoveredLegalLink,
} from './types';
import { sanitizeSnippet } from './engine';

export { KTY_HANDOFF_SESSION_KEY };

/**
 * Canonical registry of destination advocacy tools in the KnowThankYew portfolio.
 */
export const CANONICAL_DESTINATION_TOOLS: Record<DestinationToolId, DestinationToolMetadata> = {
  'bill-of-rights-bot': {
    id: 'bill-of-rights-bot',
    name: 'Bill of Rights Bot',
    tagline: 'AI consumer rights advocate & dispute generator',
    productionUrl: 'https://github.com/knowthankyew/bill-of-rights-bot',
    localDevUrl: 'http://localhost:3000',
    supportedCategories: ['AUTO_RENEWAL', 'ARBITRATION', 'UNILATERAL_CHANGE'],
  },
  'care-check': {
    id: 'care-check',
    name: 'CareCheck',
    tagline: 'Medical billing & patient surveillance compliance',
    productionUrl: 'https://github.com/knowthankyew/care-check',
    localDevUrl: 'http://localhost:3001',
    supportedCategories: ['SURVEILLANCE'],
  },
  'lease-audit': {
    id: 'lease-audit',
    name: 'Lease Audit',
    tagline: 'Tenant rights & residential lease agreement scanner',
    productionUrl: 'https://github.com/knowthankyew/lease-audit',
    localDevUrl: 'http://localhost:3002',
    supportedCategories: ['ARBITRATION', 'UNILATERAL_CHANGE'],
  },
  'warranty-watch': {
    id: 'warranty-watch',
    name: 'Warranty Watch',
    tagline: 'Magnuson-Moss warranty and tie-in clause auditor',
    productionUrl: 'https://github.com/knowthankyew/warranty-watch',
    localDevUrl: 'http://localhost:3003',
    supportedCategories: ['WARRANTY_DISCLAIMER'],
  },
  'paystub-check': {
    id: 'paystub-check',
    name: 'Paystub Check',
    tagline: 'Wage theft & independent contractor misclassification auditor',
    productionUrl: 'https://github.com/knowthankyew/paystub-check',
    localDevUrl: 'http://localhost:3004',
    supportedCategories: ['ARBITRATION', 'UNILATERAL_CHANGE'],
  },
};

/**
 * Resolves the destination advocacy tool best suited for the given findings.
 * Evaluates findings by severity tier (CRITICAL > WARNING > INFO) and category fit.
 */
export function resolveDestinationTool(
  findings: EvaluationMatch[],
  domain = ''
): DestinationToolMetadata {
  if (!findings || findings.length === 0) {
    return CANONICAL_DESTINATION_TOOLS['bill-of-rights-bot'];
  }

  const leaseDomainPattern =
    /(?:^|[.-])(?:apartments?|tenants?|landlords?|leaseholds?|habitations?|habitability|evictions?|subleases?|residential[\s-]?leases?|leases?)(?:[.-]|$)/i;
  const leaseStrongPattern =
    /\b((?:residential|apartment|housing|month[\s-]to[\s-]month|fixed[\s-]term|rental|dwelling|room|unit)[\s-]+leases?|leases?[\s-]+(?:premises|property|unit|apartment|term|renewal)|leased\s+(?:premises|property|unit|apartment|dwelling|residence|home)|leasehold|tenant|landlord|apartment|residential\s+rental|habitation|habitability|eviction|security\s+deposit|sublease)\b/i;
  const leaseWeakPattern = /\b(rent|rental|premises|realty)\b/i;
  const isStrongLeaseContext =
    (leaseDomainPattern.test(domain) &&
      !/\b(?:equipment|vehicle|auto|car|truck|fleet|tool|machinery|software|hardware)\b/i.test(
        domain
      )) ||
    findings.some(f => leaseStrongPattern.test(`${f.title} ${f.matchedSnippet}`));
  const isWeakLeaseContext =
    leaseWeakPattern.test(domain) ||
    findings.some(f => leaseWeakPattern.test(`${f.title} ${f.matchedSnippet}`));

  // Strip boilerplate consumer disclaimers before scanning for employment evidence so
  // B2C clauses like "nothing in these terms creates an employment / employer-employee
  // relationship" or "our payment processor is an independent contractor" do not hijack B2C routing.
  const employmentRelationPhrase =
    '(?:employment|employer(?:[\\s/-]+|\\s+(?:or|and)\\s+)employee)(?:\\s+(?:or\\s+agency\\s+)?(?:relationship|status|agreements?|contracts?))?';
  const relationPrefix =
    '(?:an?\\s+|any\\s+)?(?:(?:partnership|agency|joint\\s+venture|fiduciary|franchise)(?:,?\\s+(?:or|nor)|,)?\\s+){0,3}';
  const disclaimerPattern = new RegExp(
    `\\b(?:(?:nothing|no\\s+provision)(?:\\s+(?:in\\s+(?:these|this)\\s+(?:terms|agreement|policy)|herein))?\\s+(?:creates?|shall\\s+be\\s+construed\\s+to\\s+create|establishes?|constitutes?|implies?|forms?)\\s+${relationPrefix}${employmentRelationPhrase}|(?:(?:do|does|did|will|shall|would|can)\\s+not|don't|doesn't|won't|shan't)\\s+(?:create|establish|constitute|imply|form)\\s+${relationPrefix}${employmentRelationPhrase}|(?:no|not\\s+an?|neither\\s+an?)\\s+${relationPrefix}${employmentRelationPhrase}|neither\\s+(?:party|side)\\s+(?:is|are|shall\\s+be(?:\\s+deemed)?)\\s+(?:an?\\s+)?(?:employees?|workers?|agents?)(?:\\s+of\\s+(?:the\\s+)?other)?|not\\s+(?:(?:an?|their)\\s+)?(?:employees?|workers?)\\s+of\\s+(?:each\\s+other|the\\s+other(?:\\s+party)?)|(?:our|any|each|their|third[\\s-]party)\\s+(?:payment\\s+processors?|processors?|vendors?|suppliers?|subcontractors?|service\\s+providers?|partners?|affiliates?)\\s+(?:is|are|acts?\\s+as)\\s+(?:an?\\s+)?independent\\s+contractors?(?:\\s+(?:(?:that|which|who|when|while|and)\\s+)?(?:(?:they|it)\\s+)?perform(?:ing|ed|s)?\\s+(?:work|services)\\s+for\\s+(?:us|the\\s+company))?)\\b`,
    'gi'
  );

  const hasEmploymentEvidence = (text: string): boolean => {
    const cleaned = text.replace(disclaimerPattern, ' ');
    if (
      /\b(pay[\s-]?stub|wage(?:s|\s+theft|\s+dispute)?|overtime|hourly\s+(?:wage|pay|rate\s+of\s+pay|employee)|hours\s+worked|minimum\s+wage|unpaid\s+wages|paycheck|payroll|flsa|worker\s+misclassification|employee\s+misclassification|offer\s+letter|non-compete|employment|employer|workplace)\b/i.test(
        cleaned
      ) ||
      /\b(?:(?:base|annual)\s+salary|salary\s+(?:and\s+(?:benefits|bonus(?:es)?|wages)|or\s+(?:bonus(?:es)?|wages|compensation)|structure|reduction|deductions?|withholding|agreement|terms)|(?:alter|reduce|adjust|deduct|withhold|pay(?:ment)?\s+of|regarding)\s+(?:your\s+)?salary|salaried\s+(?:exempt|non-exempt|employees?|workers?|staff)|as\s+(?:an?|our)\s+employees?|you\s+are\s+(?:an?\s+|our\s+)employees?|for\s+(?:all\s+)?employees|employees\s+agree\s+to|employee\s+(?:handbook|arbitration|agreements?|claims?|disputes?|classification|onboarding))\b/i.test(
        cleaned
      )
    ) {
      return true;
    }
    const hasContractorMarker = /\b(?:independent\s+contractor|1099)\b/i.test(cleaned);
    if (!hasContractorMarker) {
      return false;
    }
    if (
      /\b(?:worker|employee|misclassif\w*|gig\s+work(?:er)?|your\s+(?:work|services|compensation|pay)|tax\s+(?:withholding|form)|w-?2|wage|payroll|overtime)\b/i.test(
        cleaned
      )
    ) {
      return true;
    }
    return (
      /\byou(?:r|'re|'ve|'ll)?\b/i.test(cleaned) &&
      /\bperform(?:ing|ed)?\s+(?:work|services)\s+for\b/i.test(cleaned)
    );
  };

  const isEmploymentContext =
    findings.some(f => hasEmploymentEvidence(`${f.title} ${f.matchedSnippet}`));

  // Prioritize findings by severity: CRITICAL, then WARNING, then INFO
  const severityWeight: Record<string, number> = { CRITICAL: 3, WARNING: 2, INFO: 1 };
  const sorted = [...findings].sort(
    (a, b) => (severityWeight[b.severity] || 0) - (severityWeight[a.severity] || 0)
  );

  for (const finding of sorted) {
    if (finding.category === 'AUTO_RENEWAL') {
      return CANONICAL_DESTINATION_TOOLS['bill-of-rights-bot'];
    }
    if (finding.category === 'SURVEILLANCE') {
      return CANONICAL_DESTINATION_TOOLS['care-check'];
    }
    if (finding.category === 'WARRANTY_DISCLAIMER') {
      return CANONICAL_DESTINATION_TOOLS['warranty-watch'];
    }
    if (finding.category === 'ARBITRATION' || finding.category === 'UNILATERAL_CHANGE') {
      if (isStrongLeaseContext || (isWeakLeaseContext && !isEmploymentContext)) {
        return CANONICAL_DESTINATION_TOOLS['lease-audit'];
      }
      if (isEmploymentContext) {
        return CANONICAL_DESTINATION_TOOLS['paystub-check'];
      }
      return CANONICAL_DESTINATION_TOOLS['bill-of-rights-bot'];
    }
  }

  return CANONICAL_DESTINATION_TOOLS['bill-of-rights-bot'];
}

/**
 * Builds the URL to invoke the destination tool or navigate to its repository.
 */
export function buildDestinationUrl(toolId: DestinationToolId, isDev = false): string {
  const tool = CANONICAL_DESTINATION_TOOLS[toolId] || CANONICAL_DESTINATION_TOOLS['bill-of-rights-bot'];
  const baseUrl = isDev ? tool.localDevUrl : tool.productionUrl;
  if (!isDev && baseUrl.startsWith('https://github.com/')) {
    return baseUrl;
  }
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}kty_handoff=1`;
}

function sanitizeLegalLink(link: DiscoveredLegalLink): DiscoveredLegalLink | null {
  if (!link || typeof link.url !== 'string') return null;
  try {
    const parsed = new URL(link.url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return {
      ...link,
      title: sanitizeSnippet(link.title || ''),
      url: `${parsed.protocol}//${parsed.host}${parsed.pathname}`,
    };
  } catch {
    return null;
  }
}

/**
 * Builds a strictly-sanitized, schema-compliant handoff payload from scan results.
 * Guarantees zero raw PII (emails, cards) enter the handoff envelope via sanitizeSnippet().
 */
export function buildHandoffPayload(
  scanResult: PageScanResult,
  targetToolId?: DestinationToolId,
  singleMatch?: EvaluationMatch
): KtyHandoffPayload {
  const matchesToProcess = singleMatch ? [singleMatch] : (scanResult.matches || []);

  const findings: KtyHandoffFinding[] = matchesToProcess.map(match => ({
    ruleId: match.ruleId,
    title: sanitizeSnippet(match.title || match.ruleId || 'Untitled finding'),
    category: match.category,
    severity: match.severity,
    statuteCode: sanitizeSnippet(match.statute?.code || ''),
    statuteTitle: sanitizeSnippet(match.statute?.title || ''),
    matchedSnippet: sanitizeSnippet(match.matchedSnippet || ''),
    explanation: sanitizeSnippet(match.explanation || ''),
    recommendation: sanitizeSnippet(match.recommendation || ''),
  }));

  const resolvedTool = targetToolId || resolveDestinationTool(matchesToProcess, scanResult.urlDomain).id;

  let primaryLegalLink: DiscoveredLegalLink | null = null;
  if (scanResult.discoveredLinks && scanResult.discoveredLinks.length > 0) {
    const preferredCategories = ['TERMS', 'BILLING', 'PRIVACY', 'ARBITRATION'];
    for (const cat of preferredCategories) {
      const found = scanResult.discoveredLinks.find(l => l.category === cat);
      if (found) {
        const sanitized = sanitizeLegalLink(found);
        if (sanitized) {
          primaryLegalLink = sanitized;
          break;
        }
      }
    }
    if (!primaryLegalLink) {
      for (const link of scanResult.discoveredLinks) {
        const sanitized = sanitizeLegalLink(link);
        if (sanitized) {
          primaryLegalLink = sanitized;
          break;
        }
      }
    }
  }

  const summary = singleMatch
    ? {
        critical: singleMatch.severity === 'CRITICAL' ? 1 : 0,
        warning: singleMatch.severity === 'WARNING' ? 1 : 0,
        info: singleMatch.severity === 'INFO' ? 1 : 0,
      }
    : {
        critical: scanResult.summary?.critical || 0,
        warning: scanResult.summary?.warning || 0,
        info: scanResult.summary?.info || 0,
      };

  const riskScore = singleMatch
    ? Math.min(100, Math.max(0, summary.critical * 35 + summary.warning * 15 + summary.info * 5))
    : typeof scanResult.riskScore === 'number'
    ? scanResult.riskScore
    : 0;

  return {
    version: '1.0',
    originApp: 'knowthankyew-extension',
    domain: scanResult.urlDomain || 'current-page',
    scanTimestamp: scanResult.timestamp || new Date().toISOString(),
    riskScore,
    summary,
    findings,
    primaryLegalLink,
    targetTool: resolvedTool,
  };
}

const VALID_CATEGORIES = new Set<string>([
  'AUTO_RENEWAL',
  'ARBITRATION',
  'UNILATERAL_CHANGE',
  'SURVEILLANCE',
  'WARRANTY_DISCLAIMER',
]);

const VALID_SEVERITIES = new Set<string>(['CRITICAL', 'WARNING', 'INFO']);

/**
 * Fail-closed runtime validator for incoming KtyHandoffPayload envelopes.
 */
export function validateHandoffPayload(payload: unknown): payload is KtyHandoffPayload {
  if (!payload || typeof payload !== 'object') return false;
  const p = payload as Record<string, any>;

  if (p.version !== '1.0') return false;
  if (p.originApp !== 'knowthankyew-extension') return false;
  if (typeof p.domain !== 'string' || p.domain.trim().length === 0) return false;
  if (typeof p.scanTimestamp !== 'string' || Number.isNaN(Date.parse(p.scanTimestamp))) return false;
  if (!Number.isFinite(p.riskScore) || p.riskScore < 0 || p.riskScore > 100) return false;

  if (!p.summary || typeof p.summary !== 'object') return false;
  const isCount = (n: unknown) => typeof n === 'number' && Number.isInteger(n) && n >= 0;
  if (!isCount(p.summary.critical) || !isCount(p.summary.warning) || !isCount(p.summary.info)) {
    return false;
  }

  if (!Array.isArray(p.findings)) return false;
  for (const f of p.findings) {
    if (!f || typeof f !== 'object') return false;
    if (typeof f.ruleId !== 'string' || f.ruleId.trim().length === 0) return false;
    if (typeof f.title !== 'string' || f.title.trim().length === 0) return false;
    if (!VALID_CATEGORIES.has(f.category)) return false;
    if (!VALID_SEVERITIES.has(f.severity)) return false;
    if (typeof f.statuteCode !== 'string') return false;
    if (typeof f.statuteTitle !== 'string') return false;
    if (typeof f.matchedSnippet !== 'string') return false;
    if (typeof f.explanation !== 'string') return false;
    if (typeof f.recommendation !== 'string') return false;
  }

  if (
    typeof p.targetTool !== 'string' ||
    !Object.prototype.hasOwnProperty.call(CANONICAL_DESTINATION_TOOLS, p.targetTool)
  ) {
    return false;
  }

  if (p.primaryLegalLink !== null) {
    if (!p.primaryLegalLink || typeof p.primaryLegalLink !== 'object') return false;
    if (typeof p.primaryLegalLink.url !== 'string') return false;
    try {
      const proto = new URL(p.primaryLegalLink.url).protocol;
      if (proto !== 'https:' && proto !== 'http:') return false;
    } catch {
      return false;
    }
    if (typeof p.primaryLegalLink.title !== 'string') return false;
  }

  return true;
}
