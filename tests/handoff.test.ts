import { describe, it, expect } from 'vitest';
import {
  CANONICAL_DESTINATION_TOOLS,
  resolveDestinationTool,
  buildDestinationUrl,
  buildHandoffPayload,
  validateHandoffPayload,
} from '../src/core/handoff';
import { PageScanResult, EvaluationMatch } from '../src/core/types';

describe('Milestone 7 Phase 2 — Handoff Schema, Tools Registry & Payload Sanitization (tests/handoff.test.ts)', () => {
  // -------------------------------------------------------------
  // Test 1: Canonical Destination Tools Registry
  // -------------------------------------------------------------
  it('registers all 5 canonical destination tools with valid production and dev URLs', () => {
    const expectedIds = [
      'bill-of-rights-bot',
      'care-check',
      'lease-audit',
      'warranty-watch',
      'paystub-check',
    ] as const;

    for (const id of expectedIds) {
      const tool = CANONICAL_DESTINATION_TOOLS[id];
      expect(tool).toBeDefined();
      expect(tool.id).toBe(id);
      expect(tool.name).toBeTruthy();
      expect(tool.tagline).toBeTruthy();
      expect(tool.productionUrl).toMatch(/^https:\/\/github\.com\/knowthankyew\/[a-z0-9-]+$/);
      expect(tool.localDevUrl).toMatch(/^http:\/\/localhost:\d+$/);
    }
  });

  // -------------------------------------------------------------
  // Test 2: resolveDestinationTool routing logic
  // -------------------------------------------------------------
  it('routes findings to the best-fit advocate destination tool', () => {
    const baseMatch: EvaluationMatch = {
      ruleId: 'test-rule',
      title: 'Test Trap',
      category: 'AUTO_RENEWAL',
      classification: 'STATUTORY_VIOLATION',
      severity: 'CRITICAL',
      statute: {
        code: '16 CFR Part 425',
        title: 'Click-to-Cancel',
        jurisdiction: 'US Federal',
        plainExplanation: 'Cancellation must be as easy as signup.',
      },
      explanation: 'Recurring subscription fee without easy opt-out.',
      recommendation: 'Cancel subscription immediately.',
      matchedSnippet: 'Recurring membership fee of $29.99 will auto-renew.',
    };

    // 1. AUTO_RENEWAL -> bill-of-rights-bot
    expect(resolveDestinationTool([baseMatch]).id).toBe('bill-of-rights-bot');

    // 2. SURVEILLANCE -> care-check
    const surveillanceMatch: EvaluationMatch = {
      ...baseMatch,
      category: 'SURVEILLANCE',
      title: 'Patient Data Sharing',
    };
    expect(resolveDestinationTool([surveillanceMatch]).id).toBe('care-check');

    // 3. WARRANTY_DISCLAIMER -> warranty-watch
    const warrantyMatch: EvaluationMatch = {
      ...baseMatch,
      category: 'WARRANTY_DISCLAIMER',
      title: 'As-Is Disclaimer',
    };
    expect(resolveDestinationTool([warrantyMatch]).id).toBe('warranty-watch');

    // 4. ARBITRATION in lease context -> lease-audit
    const arbitrationMatch: EvaluationMatch = {
      ...baseMatch,
      category: 'ARBITRATION',
      title: 'Mandatory Binding Arbitration',
    };
    expect(resolveDestinationTool([arbitrationMatch], 'myapartment-lease.com').id).toBe('lease-audit');

    // 5. ARBITRATION in general commercial context -> bill-of-rights-bot
    expect(resolveDestinationTool([arbitrationMatch], 'cloudsoftware.com').id).toBe('bill-of-rights-bot');

    // 6. Empty findings fallback -> bill-of-rights-bot
    expect(resolveDestinationTool([]).id).toBe('bill-of-rights-bot');
  });

  it('prioritizes CRITICAL findings over WARNING and INFO findings when routing', () => {
    const warningSurveillance: EvaluationMatch = {
      ruleId: 'r-surv',
      title: 'Third-party tracking cookies',
      category: 'SURVEILLANCE',
      classification: 'SURVEILLANCE_NOTICE',
      severity: 'WARNING',
      statute: { code: 'CCPA', title: 'CCPA', jurisdiction: 'CA', plainExplanation: '' },
      explanation: 'Tracking info',
      recommendation: 'Opt out',
      matchedSnippet: 'We share analytics.',
    };

    const criticalAutoRenewal: EvaluationMatch = {
      ruleId: 'r-renewal',
      title: 'Immediate Uncancelled Billing',
      category: 'AUTO_RENEWAL',
      classification: 'STATUTORY_VIOLATION',
      severity: 'CRITICAL',
      statute: { code: 'ROSCA', title: 'ROSCA', jurisdiction: 'US', plainExplanation: '' },
      explanation: 'Auto renewal trap',
      recommendation: 'Dispute charges',
      matchedSnippet: 'Card will be charged monthly forever.',
    };

    // Despite surveillance appearing first in the array, the CRITICAL auto-renewal takes priority
    const resolved = resolveDestinationTool([warningSurveillance, criticalAutoRenewal]);
    expect(resolved.id).toBe('bill-of-rights-bot');
  });

  // -------------------------------------------------------------
  // Test 3: buildDestinationUrl
  // -------------------------------------------------------------
  it('builds destination URL with repository link in prod and ?kty_handoff=1 query flag in dev mode', () => {
    const prodUrl = buildDestinationUrl('bill-of-rights-bot', false);
    expect(prodUrl).toBe('https://github.com/knowthankyew/bill-of-rights-bot');

    const devUrl = buildDestinationUrl('care-check', true);
    expect(devUrl).toBe('http://localhost:3001?kty_handoff=1');
  });

  // -------------------------------------------------------------
  // Test 4: buildHandoffPayload with PII sanitization
  // -------------------------------------------------------------
  it('builds a strictly sanitized handoff payload redacting emails and credit cards', () => {
    const dummyScan: PageScanResult = {
      timestamp: '2026-10-04T12:00:00.000Z',
      urlDomain: 'predatory-service.com',
      scannedLength: 1500,
      riskScore: 70,
      summary: { critical: 2, warning: 0, info: 0 },
      limitationsNotice: 'Visible text only',
      discoveredLinks: [
        { url: 'https://predatory-service.com/privacy', title: 'Privacy Policy', category: 'PRIVACY', source: 'DOM_ANCHOR' },
        { url: 'https://predatory-service.com/terms', title: 'Terms and Conditions', category: 'TERMS', source: 'DOM_ANCHOR' },
      ],
      matches: [
        {
          ruleId: 'pii-test-1',
          title: 'Hidden Billing',
          category: 'AUTO_RENEWAL',
          classification: 'STATUTORY_VIOLATION',
          severity: 'CRITICAL',
          statute: {
            code: '15 U.S.C. § 8403',
            title: 'ROSCA',
            jurisdiction: 'US',
            plainExplanation: 'Unfair negative option billing.',
          },
          explanation: 'Reach us at support@predatory-service.com to dispute.',
          recommendation: 'Email support@predatory-service.com or call bank.',
          matchedSnippet: 'Card 4111 2222 3333 4444 will be billed. Contact billing-help@secret.org.',
        },
      ],
    };

    const payload = buildHandoffPayload(dummyScan);

    expect(payload.version).toBe('1.0');
    expect(payload.originApp).toBe('knowthankyew-extension');
    expect(payload.domain).toBe('predatory-service.com');
    expect(payload.targetTool).toBe('bill-of-rights-bot');
    expect(payload.primaryLegalLink?.url).toBe('https://predatory-service.com/terms');

    // Strict PII Redaction Verification
    const finding = payload.findings[0];
    expect(finding.matchedSnippet).not.toContain('4111 2222 3333 4444');
    expect(finding.matchedSnippet).toContain('[CARD REDACTED]');
    expect(finding.matchedSnippet).not.toContain('billing-help@secret.org');
    expect(finding.matchedSnippet).toContain('[EMAIL REDACTED]');

    expect(finding.explanation).not.toContain('support@predatory-service.com');
    expect(finding.explanation).toContain('[EMAIL REDACTED]');

    expect(finding.recommendation).not.toContain('support@predatory-service.com');
    expect(finding.recommendation).toContain('[EMAIL REDACTED]');
  });

  it('supports single-match itemized handoff payload construction', () => {
    const dummyScan: PageScanResult = {
      timestamp: '2026-10-04T12:00:00.000Z',
      urlDomain: 'multi-trap.com',
      scannedLength: 2000,
      riskScore: 85,
      summary: { critical: 2, warning: 1, info: 0 },
      limitationsNotice: 'Visible text only',
      matches: [
        {
          ruleId: 'trap-1',
          title: 'Recurring Renewal',
          category: 'AUTO_RENEWAL',
          classification: 'STATUTORY_VIOLATION',
          severity: 'CRITICAL',
          statute: { code: 'ROSCA', title: 'ROSCA', jurisdiction: 'US', plainExplanation: '' },
          explanation: 'Auto renewal',
          recommendation: 'Cancel',
          matchedSnippet: 'Renews every month.',
        },
        {
          ruleId: 'trap-2',
          title: 'Medical Surveillance',
          category: 'SURVEILLANCE',
          classification: 'SURVEILLANCE_NOTICE',
          severity: 'WARNING',
          statute: { code: 'HIPAA/FTC', title: 'Health Breach', jurisdiction: 'US', plainExplanation: '' },
          explanation: 'Health tracking',
          recommendation: 'Opt out',
          matchedSnippet: 'We sell fitness data.',
        },
      ],
    };

    // Itemized single match handoff for trap-2
    const singlePayload = buildHandoffPayload(dummyScan, undefined, dummyScan.matches[1]);
    expect(singlePayload.findings.length).toBe(1);
    expect(singlePayload.findings[0].ruleId).toBe('trap-2');
    expect(singlePayload.targetTool).toBe('care-check');
    expect(singlePayload.summary.critical).toBe(0);
    expect(singlePayload.summary.warning).toBe(1);
    expect(singlePayload.riskScore).toBe(15);
  });

  // -------------------------------------------------------------
  // Test 5: validateHandoffPayload fail-closed schema checks
  // -------------------------------------------------------------
  it('validates legitimate payloads and rejects corrupted or malformed envelopes', () => {
    const dummyScan: PageScanResult = {
      timestamp: '2026-10-04T12:00:00.000Z',
      urlDomain: 'good-shop.com',
      scannedLength: 800,
      riskScore: 35,
      summary: { critical: 1, warning: 0, info: 0 },
      limitationsNotice: 'Notice',
      matches: [
        {
          ruleId: 'r1',
          title: 'Renewal',
          category: 'AUTO_RENEWAL',
          classification: 'STATUTORY_VIOLATION',
          severity: 'CRITICAL',
          statute: { code: 'ROSCA', title: 'ROSCA', jurisdiction: 'US', plainExplanation: '' },
          explanation: 'Expl',
          recommendation: 'Rec',
          matchedSnippet: 'Snippet',
        },
      ],
    };

    const validPayload = buildHandoffPayload(dummyScan);
    expect(validateHandoffPayload(validPayload)).toBe(true);

    // Negative controls
    expect(validateHandoffPayload(null)).toBe(false);
    expect(validateHandoffPayload(undefined)).toBe(false);
    expect(validateHandoffPayload('string')).toBe(false);
    expect(validateHandoffPayload({ ...validPayload, version: '2.0' })).toBe(false);
    expect(validateHandoffPayload({ ...validPayload, originApp: 'malicious-extension' })).toBe(false);
    expect(validateHandoffPayload({ ...validPayload, domain: '' })).toBe(false);
    expect(validateHandoffPayload({ ...validPayload, targetTool: 'unregistered-tool' })).toBe(false);
    expect(validateHandoffPayload({ ...validPayload, targetTool: 'toString' })).toBe(false);
    expect(validateHandoffPayload({ ...validPayload, targetTool: 'constructor' })).toBe(false);
    expect(validateHandoffPayload({ ...validPayload, targetTool: '__proto__' })).toBe(false);

    // Malformed findings
    expect(validateHandoffPayload({ ...validPayload, findings: [{ ...validPayload.findings[0], category: 'UNKNOWN_CAT' }] })).toBe(false);
    expect(validateHandoffPayload({ ...validPayload, findings: [{ ...validPayload.findings[0], severity: 'FATAL' }] })).toBe(false);

    // Malformed or unsafe primaryLegalLink URL protocols
    expect(validateHandoffPayload({ ...validPayload, primaryLegalLink: { url: 'javascript:alert(1)', title: 'XSS' } })).toBe(false);
    expect(validateHandoffPayload({ ...validPayload, primaryLegalLink: { url: 'not-a-url', title: 'Invalid' } })).toBe(false);
    expect(validateHandoffPayload({ ...validPayload, primaryLegalLink: { url: 'https://example.com/terms', title: 'Valid' } })).toBe(true);
  });

  it('filters out non-HTTP links (javascript:, data:) when building handoff payload', () => {
    const scanWithBadLinks: PageScanResult = {
      timestamp: '2026-10-04T12:00:00.000Z',
      urlDomain: 'bad-link-site.com',
      scannedLength: 1000,
      riskScore: 50,
      summary: { critical: 1, warning: 0, info: 0 },
      limitationsNotice: 'Visible text only',
      matches: [],
      discoveredLinks: [
        { url: 'javascript:void(0)', title: 'Deceptive Link', category: 'TERMS', source: 'DOM_ANCHOR' },
        { url: 'https://example.com/legal/terms?tracking=1#section2', title: 'Real Terms', category: 'TERMS', source: 'DOM_ANCHOR' },
      ],
    };

    const payload = buildHandoffPayload(scanWithBadLinks);
    expect(payload.primaryLegalLink).not.toBeNull();
    expect(payload.primaryLegalLink?.url).toBe('https://example.com/legal/terms');
    expect(validateHandoffPayload(payload)).toBe(true);
  });

  it('strips sensitive URL userinfo credentials (user:pass@) when building handoff payload', () => {
    const scanWithCredentials: PageScanResult = {
      timestamp: '2026-10-04T12:00:00.000Z',
      urlDomain: 'corp.internal',
      scannedLength: 1000,
      riskScore: 50,
      summary: { critical: 1, warning: 0, info: 0 },
      limitationsNotice: 'Visible text only',
      matches: [],
      discoveredLinks: [
        { url: 'https://admin:secretToken123@corp.internal/legal/terms?token=leak#hash', title: 'Terms', category: 'TERMS', source: 'DOM_ANCHOR' },
      ],
    };

    const payload = buildHandoffPayload(scanWithCredentials);
    expect(payload.primaryLegalLink?.url).toBe('https://corp.internal/legal/terms');
    expect(payload.primaryLegalLink?.url).not.toContain('admin');
    expect(payload.primaryLegalLink?.url).not.toContain('secretToken123');
    expect(validateHandoffPayload(payload)).toBe(true);
  });

  it('rejects payloads with non-finite riskScore or invalid/negative summary counts', () => {
    const validPayload = buildHandoffPayload({
      timestamp: '2026-10-04T12:00:00.000Z',
      urlDomain: 'example.com',
      scannedLength: 500,
      riskScore: 25,
      summary: { critical: 0, warning: 1, info: 0 },
      limitationsNotice: 'test',
      matches: [],
      discoveredLinks: [],
    });

    expect(validateHandoffPayload(validPayload)).toBe(true);

    // Non-finite riskScore
    expect(validateHandoffPayload({ ...validPayload, riskScore: NaN })).toBe(false);
    expect(validateHandoffPayload({ ...validPayload, riskScore: Infinity })).toBe(false);
    expect(validateHandoffPayload({ ...validPayload, riskScore: -1 })).toBe(false);
    expect(validateHandoffPayload({ ...validPayload, riskScore: 101 })).toBe(false);

    // Invalid summary counts
    expect(validateHandoffPayload({ ...validPayload, summary: { critical: -1, warning: 0, info: 0 } })).toBe(false);
    expect(validateHandoffPayload({ ...validPayload, summary: { critical: 1.5, warning: 0, info: 0 } })).toBe(false);
    expect(validateHandoffPayload({ ...validPayload, summary: { critical: NaN, warning: 0, info: 0 } })).toBe(false);
    expect(validateHandoffPayload({ ...validPayload, summary: { critical: Infinity, warning: 0, info: 0 } })).toBe(false);
    expect(validateHandoffPayload({ ...validPayload, summary: null })).toBe(false);
  });
});

