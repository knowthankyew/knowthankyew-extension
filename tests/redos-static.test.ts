import { describe, it, expect } from 'vitest';
import safeRegex from 'safe-regex';
import { ALL_RULES } from '../src/core/engine';

describe('Static ReDoS Analysis (safe-regex)', () => {
  it('statically proves every regex pattern is free of exponential catastrophic backtracking', () => {
    const results: Array<{ id: string; pattern: string; isSafe: boolean }> = [];

    for (const rule of ALL_RULES) {
      for (const pattern of rule.patterns) {
        const isSafe = safeRegex(pattern);
        results.push({ id: rule.id, pattern: pattern.toString(), isSafe });
      }
    }

    // Print analysis table
    console.log('\n=== STATIC REDOS AUDIT TABLE (safe-regex) ===');
    for (const res of results) {
      console.log(`[${res.isSafe ? 'SAFE' : 'DANGEROUS'}] ${res.id}: ${res.pattern}`);
    }

    const unsafePatterns = results.filter(r => !r.isSafe);
    expect(unsafePatterns).toEqual([]);
  });
});
