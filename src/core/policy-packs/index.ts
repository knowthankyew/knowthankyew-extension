import { PolicyPack, DeclarativeRule, DetectionRule } from '../types';
import usFederalJson from './us-federal.json';
import stateArlJson from './state-arl.json';

export const usFederalPack = usFederalJson as unknown as PolicyPack;
export const stateArlPack = stateArlJson as unknown as PolicyPack;

export const ALL_POLICY_PACKS: PolicyPack[] = [
  usFederalPack,
  stateArlPack,
];

/**
 * Compiles a declarative rule with string pattern definitions into a runtime DetectionRule
 * containing live, case-insensitive RegExp instances.
 */
export function compileDeclarativeRule(rule: DeclarativeRule): DetectionRule {
  return {
    id: rule.id,
    title: rule.title,
    category: rule.category,
    classification: rule.classification,
    severity: rule.severity,
    statute: rule.statute,
    patterns: rule.patterns.map((p) => new RegExp(p, 'i')),
    explanation: rule.explanation,
    recommendation: rule.recommendation,
  };
}

/**
 * Compiles an entire PolicyPack into executable DetectionRules.
 */
export function compilePolicyPack(pack: PolicyPack): DetectionRule[] {
  return pack.rules.map(compileDeclarativeRule);
}

/**
 * Master collection of compiled detection rules loaded from all bundled policy packs.
 */
export const COMPILED_POLICY_RULES: DetectionRule[] = ALL_POLICY_PACKS.flatMap(compilePolicyPack);
