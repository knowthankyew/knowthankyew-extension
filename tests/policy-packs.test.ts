import { describe, it, expect } from 'vitest';
import { ALL_POLICY_PACKS, compilePolicyPack, COMPILED_POLICY_RULES } from '../src/core/policy-packs';
import safeRegex from 'safe-regex';

describe('Declarative Policy Pack Architecture (policy-packs.test.ts)', () => {
  it('loads valid bundled policy packs with required fields', () => {
    expect(ALL_POLICY_PACKS.length).toBeGreaterThanOrEqual(2);

    for (const pack of ALL_POLICY_PACKS) {
      expect(pack.packId).toBeTruthy();
      expect(pack.name).toBeTruthy();
      expect(pack.jurisdiction).toBeTruthy();
      expect(pack.rules.length).toBeGreaterThan(0);

      for (const rule of pack.rules) {
        expect(rule.id).toMatch(/^[A-Z]+-\d{3}$/);
        expect(rule.title).toBeTruthy();
        expect(rule.category).toBeTruthy();
        expect(rule.classification).toBeTruthy();
        expect(rule.severity).toMatch(/^(CRITICAL|WARNING|INFO)$/);
        expect(rule.patterns.length).toBeGreaterThan(0);
        expect(rule.statute?.code).toBeTruthy();
        expect(rule.statute?.title).toBeTruthy();
        expect(rule.statute?.plainExplanation).toBeTruthy();
        expect(rule.explanation).toBeTruthy();
        expect(rule.recommendation).toBeTruthy();

        // Verify tracking metadata for CI legal monitor
        if (rule.tracking) {
          expect(Array.isArray(rule.tracking.apiKeywords)).toBe(true);
          expect(rule.tracking.lastVerifiedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        }
      }
    }
  });

  it('compiles declarative string patterns into executable and safe RegExps', () => {
    for (const pack of ALL_POLICY_PACKS) {
      const compiled = compilePolicyPack(pack);
      expect(compiled.length).toBe(pack.rules.length);

      for (const rule of compiled) {
        for (const pattern of rule.patterns) {
          expect(pattern).toBeInstanceOf(RegExp);
          expect(pattern.flags).toContain('i');
          expect(safeRegex(pattern)).toBe(true);
        }
      }
    }
  });

  it('verifies COMPILED_POLICY_RULES accurately populates engine rules', () => {
    expect(COMPILED_POLICY_RULES.length).toBe(10);
    const ruleIds = COMPILED_POLICY_RULES.map(r => r.id);
    expect(ruleIds).toContain('AR-001');
    expect(ruleIds).toContain('AR-002');
    expect(ruleIds).toContain('AR-003');
    expect(ruleIds).toContain('ARB-001');
    expect(ruleIds).toContain('ARB-002');
    expect(ruleIds).toContain('ARB-003');
    expect(ruleIds).toContain('UNI-001');
    expect(ruleIds).toContain('UNI-002');
    expect(ruleIds).toContain('SURV-001');
    expect(ruleIds).toContain('SURV-002');
  });
});
