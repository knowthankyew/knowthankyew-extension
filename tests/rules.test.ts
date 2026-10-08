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

    const contractorText = 'You and the contractor agree to binding arbitration for all disputes.';
    expect(rule.patterns.some(p => p.test(contractorText))).toBe(true);

    const clientText = 'You and the client agree to binding arbitration regarding any claim.';
    expect(rule.patterns.some(p => p.test(clientText))).toBe(true);
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

describe('UK DMCC Act 2024 Rule Pack', () => {
  it('detects missing pre-renewal reminder disclosures (UK-AR-001)', () => {
    const text = 'Your subscription will automatically renew each month without prior notice unless cancelled.';
    const rule = ALL_RULES.find(r => r.id === 'UK-AR-001')!;
    expect(rule).toBeDefined();
    const matched = rule.patterns.some(p => p.test(text));
    expect(matched).toBe(true);
  });

  it('detects 14-day cooling-off rights waivers (UK-AR-002)', () => {
    const text = 'You acknowledge and waive cooling-off period once digital content is accessed.';
    const rule = ALL_RULES.find(r => r.id === 'UK-AR-002')!;
    expect(rule).toBeDefined();
    const matched = rule.patterns.some(p => p.test(text));
    expect(matched).toBe(true);
  });

  it('detects unilateral variation of material subscription terms (UK-CONS-001)', () => {
    const text = 'We reserve the right to vary subscription fees at any time at our sole discretion.';
    const rule = ALL_RULES.find(r => r.id === 'UK-CONS-001')!;
    expect(rule).toBeDefined();
    const matched = rule.patterns.some(p => p.test(text));
    expect(matched).toBe(true);
  });
});

describe('EU Consumer Rights Directive (2011/83/EU) Rule Pack', () => {
  it('detects pre-ticked consent boxes (EU-AR-001)', () => {
    const text = 'The monthly subscription checkbox is pre-selected for your convenience at checkout.';
    const rule = ALL_RULES.find(r => r.id === 'EU-AR-001')!;
    expect(rule).toBeDefined();
    expect(rule.patterns.some(p => p.test(text))).toBe(true);

    const directText = 'An additional fee is checked by default at checkout.';
    expect(rule.patterns.some(p => p.test(directText))).toBe(true);
  });

  it('detects statutory withdrawal right waivers (EU-AR-002)', () => {
    const text = 'By subscribing to this digital service you waive right of withdrawal immediately.';
    const rule = ALL_RULES.find(r => r.id === 'EU-AR-002')!;
    expect(rule).toBeDefined();
    const matched = rule.patterns.some(p => p.test(text));
    expect(matched).toBe(true);
  });

  it('detects bundled tracking and profiling consent (EU-SURV-001)', () => {
    const text = 'Agreeing to these terms includes consent to profiling and targeted advertising.';
    const rule = ALL_RULES.find(r => r.id === 'EU-SURV-001')!;
    expect(rule).toBeDefined();
    const matched = rule.patterns.some(p => p.test(text));
    expect(matched).toBe(true);
  });
});

describe('Expanded State ARL Rule Pack (CO, IL, OR)', () => {
  it('detects Colorado advance renewal notice disclaimers (US-CO-001)', () => {
    const text = 'Colorado residents agree that no advance notice of subscription renewal shall be given.';
    const rule = ALL_RULES.find(r => r.id === 'US-CO-001')!;
    expect(rule).toBeDefined();
    const matched = rule.patterns.some(p => p.test(text));
    expect(matched).toBe(true);
  });

  it('detects Illinois asymmetric online cancellation obstructions (US-IL-001)', () => {
    const text = 'Illinois residents must call our customer service hotline to cancel your subscription.';
    const rule = ALL_RULES.find(r => r.id === 'US-IL-001')!;
    expect(rule).toBeDefined();
    const matched = rule.patterns.some(p => p.test(text));
    expect(matched).toBe(true);
  });

  it('detects Oregon statutory acknowledgment and cancellation omissions (US-OR-001)', () => {
    const text = 'Oregon residents acknowledge that no written acknowledgment or cancellation details will be provided.';
    const rule = ALL_RULES.find(r => r.id === 'US-OR-001')!;
    expect(rule).toBeDefined();
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

  it('does NOT trigger on standard UK statutory refund policy', () => {
    const text = 'Under our UK store policy, you may return faulty goods within 30 days for a full refund or exchange in accordance with statutory consumer rights. Please retain your receipt.';
    for (const rule of ALL_RULES) {
      const matched = rule.patterns.some(p => p.test(text));
      expect(matched, `Rule ${rule.id} (${rule.title}) should NOT match standard UK refund policy`).toBe(false);
    }
  });

  it('does NOT trigger on standard EU GDPR privacy disclosure', () => {
    const text = 'In compliance with EU regulations, we process your personal data solely for fulfilling your purchase order and invoicing purposes. We do not engage in automated profiling without explicit consent.';
    for (const rule of ALL_RULES) {
      const matched = rule.patterns.some(p => p.test(text));
      expect(matched, `Rule ${rule.id} (${rule.title}) should NOT match standard EU privacy disclosure`).toBe(false);
    }
  });
});
