import { describe, it, expect } from 'vitest';
import { autoRenewalRules } from '../src/core/rules/auto-renewal';
import { arbitrationRules } from '../src/core/rules/arbitration';
import { unilateralRules } from '../src/core/rules/unilateral';
import { surveillanceRules } from '../src/core/rules/surveillance';

describe('Auto-Renewal Rule Pack (FTC Click-to-Cancel & ARL)', () => {
  it('detects negative option automatic renewal clauses', () => {
    const text = 'Your subscription automatically renews for successive one-month periods unless you cancel at least 24 hours prior.';
    const rule = autoRenewalRules.find(r => r.id === 'AR-001')!;
    const matched = rule.patterns.some(p => p.test(text));
    expect(matched).toBe(true);
  });

  it('detects phone-only cancellation dark patterns', () => {
    const text = 'To cancel your membership, you must call our customer support department during regular business hours.';
    const rule = autoRenewalRules.find(r => r.id === 'AR-002')!;
    const matched = rule.patterns.some(p => p.test(text));
    expect(matched).toBe(true);
  });

  it('detects free trial conversion traps', () => {
    const text = 'Upon the expiration of your trial, your account will be billed the standard price automatically.';
    const rule = autoRenewalRules.find(r => r.id === 'AR-003')!;
    const matched = rule.patterns.some(p => p.test(text));
    expect(matched).toBe(true);
  });
});

describe('Arbitration & Class Action Waiver Rule Pack', () => {
  it('detects mandatory binding arbitration agreements', () => {
    const text = 'Any dispute arising out of or relating to this contract shall be resolved by binding arbitration administered by the American Arbitration Association.';
    const rule = arbitrationRules.find(r => r.id === 'ARB-001')!;
    const matched = rule.patterns.some(p => p.test(text));
    expect(matched).toBe(true);
  });

  it('detects class action bans', () => {
    const text = 'You waive the right to pursue any class action against the company or participate as a plaintiff or class member.';
    const rule = arbitrationRules.find(r => r.id === 'ARB-002')!;
    const matched = rule.patterns.some(p => p.test(text));
    expect(matched).toBe(true);
  });
});

describe('Unilateral Modification Rule Pack', () => {
  it('detects unilateral rights to modify without notice', () => {
    const text = 'We reserve the right to modify these terms at any time without notice in our sole discretion.';
    const rule = unilateralRules.find(r => r.id === 'UNI-001')!;
    const matched = rule.patterns.some(p => p.test(text));
    expect(matched).toBe(true);
  });

  it('detects deemed consent via continued usage', () => {
    const text = 'Your continued use of the service thereafter shall constitute your acceptance of the revised terms.';
    const rule = unilateralRules.find(r => r.id === 'UNI-002')!;
    const matched = rule.patterns.some(p => p.test(text));
    expect(matched).toBe(true);
  });
});

describe('Surveillance & Data Brokerage Rule Pack', () => {
  it('detects third-party behavioral advertising data sharing', () => {
    const text = 'We may share your personal information with third-party advertisers for targeted cross-context tracking.';
    const rule = surveillanceRules.find(r => r.id === 'SURV-001')!;
    const matched = rule.patterns.some(p => p.test(text));
    expect(matched).toBe(true);
  });
});
