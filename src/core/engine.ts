import { DetectionRule, EvaluationMatch, PageScanResult } from './types';
import { COMPILED_POLICY_RULES } from './policy-packs';

export const ALL_RULES: DetectionRule[] = COMPILED_POLICY_RULES;

/**
 * Strips sensitive PII patterns like credit card numbers or emails from snippets
 * before displaying them in the local UI (Pillar 3/4 invariant: Zero PII/Egress).
 */
export function sanitizeSnippet(snippet: string): string {
  return snippet
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[EMAIL REDACTED]')
    .replace(/\b(?:\d[ -]*?){13,16}\b/g, '[CARD REDACTED]')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Splits raw document text into readable sentences / paragraphs for heuristic matching.
 * Bounded to 1,000 characters per segment to guard against ReDoS backtracking.
 */
export function segmentText(rawText: string): string[] {
  if (!rawText) return [];
  return rawText
    .split(/(?:\r?\n\s*\r?\n)|(?<=[.!?])\s+(?=[A-Z0-9])/g)
    .map(t => t.trim())
    .filter(t => t.length > 20)
    .map(t => (t.length > 1000 ? t.slice(0, 1000) : t)); // Bounded segment guard
}

/**
 * Scans provided text paragraphs against statutory rule packs.
 * Runs 100% locally with zero external network dispatch.
 */
export function isJurisdictionMatch(ruleJurisdiction?: string, targetJurisdiction?: string): boolean {
  if (!targetJurisdiction || targetJurisdiction.toUpperCase() === 'ALL') return true;
  const target = targetJurisdiction.trim().toUpperCase();
  const j = (ruleJurisdiction || '').trim().toUpperCase();
  if (!j) return true;

  const isUsFederalBaseline = (
    j === 'US FEDERAL' ||
    j === 'US FEDERAL & MULTI-STATE' ||
    j === 'US FEDERAL & STATE' ||
    j === 'UNIFORM COMMERCIAL CODE' ||
    j === 'US COMMON LAW'
  );

  if (target === 'EU') return j === 'EU';
  if (target === 'UK') return j === 'UK';
  if (target === 'US' || target === 'US FEDERAL') return isUsFederalBaseline;

  // State target: inherit federal baseline plus matching state rules
  if (isUsFederalBaseline) return true;
  if (j === target) return true;

  const parts = j.split(/[&,]/).map(p => p.trim());
  return parts.includes(target);
}

export function scanDocumentText(
  text: string,
  domain = 'current-page',
  inspectedContainers?: string[],
  targetJurisdiction?: string
): PageScanResult {
  const startTime = performance.now();
  const segments = segmentText(text);
  const matches: EvaluationMatch[] = [];
  const matchedRuleIds = new Set<string>();

  const rulesToEvaluate = targetJurisdiction && targetJurisdiction.toUpperCase() !== 'ALL'
    ? ALL_RULES.filter(rule => isJurisdictionMatch(rule.statute?.jurisdiction, targetJurisdiction))
    : ALL_RULES;

  for (const segment of segments) {
    for (const rule of rulesToEvaluate) {
      if (matchedRuleIds.has(rule.id)) continue;

      for (const pattern of rule.patterns) {
        if (pattern.test(segment)) {
          matchedRuleIds.add(rule.id);
          const clean = sanitizeSnippet(segment);
          const truncated = clean.length > 280 ? clean.substring(0, 277) + '...' : clean;

          matches.push({
            ruleId: rule.id,
            title: rule.title,
            category: rule.category,
            classification: rule.classification,
            severity: rule.severity,
            statute: rule.statute,
            explanation: rule.explanation,
            recommendation: rule.recommendation,
            matchedSnippet: truncated,
          });
          break;
        }
      }
    }
  }

  // Calculate summary counts
  const summary = {
    critical: matches.filter(m => m.severity === 'CRITICAL').length,
    warning: matches.filter(m => m.severity === 'WARNING').length,
    info: matches.filter(m => m.severity === 'INFO').length,
  };

  // Compute composite risk score (0 - 100)
  const rawScore = (summary.critical * 35) + (summary.warning * 15) + (summary.info * 5);
  const riskScore = Math.min(100, Math.max(0, rawScore));

  const durationMs = Math.max(1, Math.round(performance.now() - startTime));
  const wordCount = Math.round(text.length / 5);
  const sanitizedPreviewText = sanitizeSnippet(text.slice(0, 4000));
  const sanitizedTextPreview = sanitizedPreviewText.length > 2000
    ? sanitizedPreviewText.slice(0, 2000) + '...'
    : sanitizedPreviewText;

  return {
    timestamp: new Date().toISOString(),
    urlDomain: domain,
    scannedLength: text.length,
    wordCount,
    segmentCount: segments.length,
    inspectedContainers: inspectedContainers && inspectedContainers.length > 0 ? inspectedContainers : ['body'],
    durationMs,
    evaluatedRulesCount: rulesToEvaluate.length,
    targetJurisdiction,
    sanitizedTextPreview,
    extractedTextSnippet: sanitizedTextPreview,
    matches,
    riskScore,
    summary,
    limitationsNotice: 'Scans visible on-page DOM text only. Does not audit linked external Terms pages or cross-origin iframes without direct user navigation. Findings may be jurisdiction-dependent.',
  };
}
