import { describe, it, expect } from 'vitest';
import { ALL_RULES } from '../src/core/engine';

describe('Auto-Renewal Rule Pack (ROSCA & State ARLs)', () => {
  it('detects negative option automatic renewal clauses', () => {
    const text = 'Your subscription automatically renews for successive one-month periods unless you cancel at least 24 hours prior.';
    const rule = ALL_RULES.find(r => r.id === 'AR-001')!;
    const matched = rule.patterns.some(p => p.test(text));
    expect(matched).toBe(true);
  });

  it('detects phone-only cancellation dark patterns', () => {
    const text = 'To cancel your membership, you must call our customer support department during regular business hours.';
    const rule = ALL_RULES.find(r => r.id === 'AR-002')!;
    const matched = rule.patterns.some(p => p.test(text));
    expect(matched).toBe(true);
  });

  it('detects free trial conversion traps', () => {
    const text = 'Upon the expiration of your trial, your account will be billed the standard price automatically.';
    const rule = ALL_RULES.find(r => r.id === 'AR-003')!;
    const matched = rule.patterns.some(p => p.test(text));
    expect(matched).toBe(true);
  });
});

describe('Arbitration & Class Action Waiver Rule Pack', () => {
  it('detects mandatory binding arbitration agreements', () => {
    const text = 'Any dispute arising out of or relating to this contract shall be resolved by binding arbitration administered by the American Arbitration Association.';
    const rule = ALL_RULES.find(r => r.id === 'ARB-001')!;
    const matched = rule.patterns.some(p => p.test(text));
    expect(matched).toBe(true);
  });

  it('detects class action bans', () => {
    const text = 'You waive the right to pursue any class action against the company or participate as a plaintiff or class member.';
    const rule = ALL_RULES.find(r => r.id === 'ARB-002')!;
    const matched = rule.patterns.some(p => p.test(text));
    expect(matched).toBe(true);
  });
});

describe('Unilateral Modification Rule Pack', () => {
  it('detects unilateral rights to modify without notice', () => {
    const text = 'We reserve the right to modify these terms at any time without notice in our sole discretion.';
    const rule = ALL_RULES.find(r => r.id === 'UNI-001')!;
    const matched = rule.patterns.some(p => p.test(text));
    expect(matched).toBe(true);
  });

  it('detects deemed consent via continued usage', () => {
    const text = 'Your continued use of the service thereafter shall constitute your acceptance of the revised terms.';
    const rule = ALL_RULES.find(r => r.id === 'UNI-002')!;
    const matched = rule.patterns.some(p => p.test(text));
    expect(matched).toBe(true);
  });
});

describe('Surveillance & Data Brokerage Rule Pack', () => {
  it('detects third-party behavioral advertising data sharing', () => {
    const text = 'We may share your personal information with third-party advertisers for targeted cross-context tracking.';
    const rule = ALL_RULES.find(r => r.id === 'SURV-001')!;
    const matched = rule.patterns.some(p => p.test(text));
    expect(matched).toBe(true);
  });

  it('detects continuous background biometric or location collection', () => {
    const text = 'We collect precise geolocation data in the background while the application is closed.';
    const rule = ALL_RULES.find(r => r.id === 'SURV-002')!;
    const matched = rule.patterns.some(p => p.test(text));
    expect(matched).toBe(true);
  });
});

describe('Arbitration Opt-Out Provision (ARB-003)', () => {
  it('detects 30-day arbitration opt-out provisions', () => {
    const text = 'You have the right to opt-out of this arbitration agreement by mailing a written notice within 30 days.';
    const rule = ALL_RULES.find(r => r.id === 'ARB-003')!;
    const matched = rule.patterns.some(p => p.test(text));
    expect(matched).toBe(true);
  });
});

describe('Negative Tests: False Positive Prevention', () => {
  it('does NOT trigger on standard benign cancellation language', () => {
    const text = 'You may cancel your subscription at any time through your online account settings. No fees or penalties apply.';
    for (const rule of ALL_RULES) {
      const matched = rule.patterns.some(p => p.test(text));
      expect(matched, `Rule ${rule.id} (${rule.title}) should NOT match benign cancellation language`).toBe(false);
    }
  });

  it('does NOT trigger on standard privacy-respecting data policy', () => {
    const text = 'We do not sell or share your personal data with third parties. Your information is stored securely and deleted upon account closure.';
    for (const rule of ALL_RULES) {
      const matched = rule.patterns.some(p => p.test(text));
      expect(matched, `Rule ${rule.id} (${rule.title}) should NOT match privacy-respecting policy`).toBe(false);
    }
  });

  it('does NOT trigger on standard refund policy language', () => {
    const text = 'If you are not satisfied with your purchase, you may request a full refund within 30 days. Contact our support team via email or chat for assistance.';
    for (const rule of ALL_RULES) {
      const matched = rule.patterns.some(p => p.test(text));
      expect(matched, `Rule ${rule.id} (${rule.title}) should NOT match standard refund policy`).toBe(false);
    }
  });
});
