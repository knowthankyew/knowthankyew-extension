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
    productionUrl: 'https://billofrightsbot.knowthankyew.org',
    localDevUrl: 'http://localhost:3000',
    supportedCategories: ['AUTO_RENEWAL', 'ARBITRATION', 'UNILATERAL_CHANGE'],
  },
  'care-check': {
    id: 'care-check',
    name: 'CareCheck',
    tagline: 'Medical billing & patient surveillance compliance',
    productionUrl: 'https://carecheck.knowthankyew.org',
    localDevUrl: 'http://localhost:3001',
    supportedCategories: ['SURVEILLANCE'],
  },
  'lease-audit': {
    id: 'lease-audit',
    name: 'Lease Audit',
    tagline: 'Tenant rights & residential lease agreement scanner',
    productionUrl: 'https://leaseaudit.knowthankyew.org',
    localDevUrl: 'http://localhost:3002',
    supportedCategories: ['ARBITRATION', 'UNILATERAL_CHANGE'],
  },
  'warranty-watch': {
    id: 'warranty-watch',
    name: 'Warranty Watch',
    tagline: 'Magnuson-Moss warranty and tie-in clause auditor',
    productionUrl: 'https://warrantywatch.knowthankyew.org',
    localDevUrl: 'http://localhost:3003',
    supportedCategories: ['WARRANTY_DISCLAIMER'],
  },
  'paystub-check': {
    id: 'paystub-check',
    name: 'Paystub Check',
    tagline: 'Wage theft & independent contractor misclassification auditor',
    productionUrl: 'https://paystubcheck.knowthankyew.org',
    localDevUrl: 'http://localhost:3004',
    supportedCategories: [],
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

  const isLeaseContext =
    /\b(lease|rent|tenant|landlord|apartment|rental|realty)\b/i.test(domain) ||
    findings.some(f =>
      /\b(lease|rent|tenant|landlord|apartment|rental|premises)\b/i.test(
        `${f.title} ${f.matchedSnippet}`
      )
    );

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
      if (isLeaseContext) {
        return CANONICAL_DESTINATION_TOOLS['lease-audit'];
      }
      return CANONICAL_DESTINATION_TOOLS['bill-of-rights-bot'];
    }
  }

  return CANONICAL_DESTINATION_TOOLS['bill-of-rights-bot'];
}

/**
 * Builds the URL with query flag to invoke the destination tool.
 */
export function buildDestinationUrl(toolId: DestinationToolId, isDev = false): string {
  const tool = CANONICAL_DESTINATION_TOOLS[toolId] || CANONICAL_DESTINATION_TOOLS['bill-of-rights-bot'];
  const baseUrl = isDev ? tool.localDevUrl : tool.productionUrl;
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}kty_handoff=1`;
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
    title: match.title,
    category: match.category,
    severity: match.severity,
    statuteCode: match.statute?.code || '',
    statuteTitle: match.statute?.title || '',
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
        primaryLegalLink = found;
        break;
      }
    }
    if (!primaryLegalLink) {
      primaryLegalLink = scanResult.discoveredLinks[0];
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
  if (typeof p.riskScore !== 'number' || p.riskScore < 0 || p.riskScore > 100) return false;

  if (!p.summary || typeof p.summary !== 'object') return false;
  if (
    typeof p.summary.critical !== 'number' ||
    typeof p.summary.warning !== 'number' ||
    typeof p.summary.info !== 'number'
  ) {
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

  if (typeof p.targetTool !== 'string' || !(p.targetTool in CANONICAL_DESTINATION_TOOLS)) {
    return false;
  }

  if (p.primaryLegalLink !== null) {
    if (!p.primaryLegalLink || typeof p.primaryLegalLink !== 'object') return false;
    if (typeof p.primaryLegalLink.url !== 'string') return false;
    if (typeof p.primaryLegalLink.title !== 'string') return false;
  }

  return true;
}
