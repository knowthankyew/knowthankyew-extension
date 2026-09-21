import { DetectionRule, EvaluationMatch, PageScanResult } from './types';
import { autoRenewalRules } from './rules/auto-renewal';
import { arbitrationRules } from './rules/arbitration';
import { unilateralRules } from './rules/unilateral';
import { surveillanceRules } from './rules/surveillance';

export const ALL_RULES: DetectionRule[] = [
  ...autoRenewalRules,
  ...arbitrationRules,
  ...unilateralRules,
  ...surveillanceRules,
];

/**
 * Strips sensitive PII patterns like credit card numbers or emails from snippets
 * before displaying them in the local UI (Pillar 3/4 invariant: Zero PII/Egress).
 */
export function sanitizeSnippet(snippet: string): string {
  return snippet
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL REDACTED]')
    .replace(/\b(?:\d[ -]*?){13,16}\b/g, '[CARD REDACTED]')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Splits raw document text into readable sentences / paragraphs for heuristic matching.
 */
export function segmentText(rawText: string): string[] {
  if (!rawText) return [];
  // Split on paragraph breaks or clause markers
  return rawText
    .split(/(?:\r?\n\s*\r?\n)|(?<=[.!?])\s+(?=[A-Z0-9])/g)
    .map(t => t.trim())
    .filter(t => t.length > 20); // filter trivial snippets
}

/**
 * Scans provided text paragraphs against statutory rule packs.
 * Runs 100% locally with zero external network dispatch.
 */
export function scanDocumentText(text: string, domain = 'current-page'): PageScanResult {
  const segments = segmentText(text);
  const matches: EvaluationMatch[] = [];
  const matchedRuleIds = new Set<string>();

  for (const segment of segments) {
    for (const rule of ALL_RULES) {
      if (matchedRuleIds.has(rule.id)) continue; // Keep one match per rule ID to prevent clutter

      for (const pattern of rule.patterns) {
        if (pattern.test(segment)) {
          matchedRuleIds.add(rule.id);
          const clean = sanitizeSnippet(segment);
          const truncated = clean.length > 280 ? clean.substring(0, 277) + '...' : clean;

          matches.push({
            ruleId: rule.id,
            title: rule.title,
            category: rule.category,
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

  return {
    timestamp: new Date().toISOString(),
    urlDomain: domain,
    scannedLength: text.length,
    matches,
    riskScore,
    summary,
  };
}
