import { describe, it, expect } from 'vitest';
import {
  CANONICAL_DESTINATION_TOOLS,
  resolveDestinationTool,
  buildDestinationUrl,
  buildHandoffPayload,
  encodeHandoffFragmentValue,
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
      expect(tool.productionUrl).toMatch(/^https:\/\/knowthankyew\.github\.io\/[a-z0-9-]+\/$/);
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
        code: '15 U.S.C. § 8403 (ROSCA)',
        title: 'Restore Online Shoppers Confidence Act',
        jurisdiction: 'US Federal',
        plainExplanation: 'Clear recurring disclosure and simple cancellation required.',
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

    // 5. ARBITRATION / UNILATERAL_CHANGE in employment & wage context -> paystub-check
    const employmentArbitrationMatch: EvaluationMatch = {
      ...arbitrationMatch,
      matchedSnippet: 'All wage, overtime, and independent contractor 1099 disputes require binding arbitration.',
    };
    expect(resolveDestinationTool([employmentArbitrationMatch], 'company-payroll.com').id).toBe('paystub-check');

    const offerUnilateralMatch: EvaluationMatch = {
      ...baseMatch,
      category: 'UNILATERAL_CHANGE',
      title: 'Unilateral Compensation Reduction',
      matchedSnippet: 'Employer may alter salary and offer letter bonus terms at any time.',
    };
    expect(resolveDestinationTool([offerUnilateralMatch], 'portal.example.com').id).toBe('paystub-check');

    // 6. Negative control: consumer boilerplate disclaimer mentioning "employment relationship" or "hourly" service rates must NOT route to paystub-check
    const consumerDisclaimerArbitration: EvaluationMatch = {
      ...arbitrationMatch,
      matchedSnippet: 'Nothing in these terms creates an employment relationship. Any dispute goes to binding arbitration.',
    };
    expect(resolveDestinationTool([consumerDisclaimerArbitration], 'saas-platform.com').id).toBe('bill-of-rights-bot');

    const consumerHourlyArbitration: EvaluationMatch = {
      ...arbitrationMatch,
      matchedSnippet: 'Support and compute usage are billed on an hourly basis. Disputes must be arbitrated.',
    };
    expect(resolveDestinationTool([consumerHourlyArbitration], 'cloudsoftware.com').id).toBe('bill-of-rights-bot');

    const consumerContractorArbitration: EvaluationMatch = {
      ...arbitrationMatch,
      matchedSnippet:
        'Our payment processor is an independent contractor. Nothing in these terms creates an employment relationship. All customer disputes require binding arbitration.',
    };
    expect(resolveDestinationTool([consumerContractorArbitration], 'shop.example').id).toBe('bill-of-rights-bot');

    const workerContractorArbitration: EvaluationMatch = {
      ...arbitrationMatch,
      matchedSnippet: 'All 1099 independent contractor worker misclassification and compensation claims go to arbitration.',
    };
    expect(resolveDestinationTool([workerContractorArbitration], 'gig.example').id).toBe('paystub-check');

    // 7. ARBITRATION in general commercial context -> bill-of-rights-bot
    expect(resolveDestinationTool([arbitrationMatch], 'cloudsoftware.com').id).toBe('bill-of-rights-bot');

    // 8. Empty findings fallback -> bill-of-rights-bot
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
  it('builds destination URL with live GitHub Pages URL in prod, localhost in dev, and #kty_handoff fragment when payload provided', () => {
    const prodUrl = buildDestinationUrl('bill-of-rights-bot', false);
    expect(prodUrl).toBe('https://knowthankyew.github.io/bill-of-rights-bot/?kty_handoff=1');

    const devUrl = buildDestinationUrl('care-check', true);
    expect(devUrl).toBe('http://localhost:3001?kty_handoff=1');

    const payload = buildHandoffPayload({
      timestamp: '2026-10-04T12:00:00.000Z',
      urlDomain: 'example.com',
      scannedLength: 500,
      riskScore: 70,
      summary: { critical: 1, warning: 0, info: 0 },
      limitationsNotice: 'Visible text only',
      matches: [],
    });
    const token = encodeHandoffFragmentValue(payload);
    expect(token).toBeTruthy();
    expect(buildDestinationUrl('bill-of-rights-bot', false, payload)).toBe(
      `https://knowthankyew.github.io/bill-of-rights-bot/?kty_handoff=1#kty_handoff=${token}`
    );
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

  it('resolves ARBITRATION with plural employment terms on a non-payroll domain to paystub-check', () => {
    const dest = resolveDestinationTool(
      [
        {
          ruleId: 'arb-plural-1',
          title: 'Mandatory Arbitration',
          category: 'ARBITRATION',
          classification: 'STATUTORY_VIOLATION',
          severity: 'CRITICAL',
          statute: { code: '9 U.S.C. § 2', title: 'FAA', jurisdiction: 'US', plainExplanation: '' },
          explanation: 'Forces workplace arbitration.',
          recommendation: 'Review rights.',
          matchedSnippet: 'All employment disputes and employment claims require binding arbitration.',
        },
      ],
      'company.example'
    );
    expect(dest.id).toBe('paystub-check');
  });

  it('routes employment UNILATERAL_CHANGE on company premises to paystub-check while keeping strong tenancy clauses on lease-audit', () => {
    const employerPremises = resolveDestinationTool(
      [
        {
          ruleId: 'emp-premises-1',
          title: 'Unilateral Compensation Change',
          category: 'UNILATERAL_CHANGE',
          classification: 'ONE_SIDED_DISCRETION',
          severity: 'WARNING',
          statute: { code: 'FLSA', title: 'Wage Modification', jurisdiction: 'US', plainExplanation: '' },
          explanation: 'Permits retroactive pay changes.',
          recommendation: 'Review wage notice laws.',
          matchedSnippet: 'Employer may change your salary for work performed on company premises at any time.',
        },
      ],
      'company.example'
    );
    expect(employerPremises.id).toBe('paystub-check');

    const leasedPremises = resolveDestinationTool(
      [
        {
          ruleId: 'lease-premises-1',
          title: 'Unilateral Entry Rule',
          category: 'UNILATERAL_CHANGE',
          classification: 'ONE_SIDED_DISCRETION',
          severity: 'WARNING',
          statute: { code: 'State Landlord-Tenant', title: 'Quiet Enjoyment', jurisdiction: 'US', plainExplanation: '' },
          explanation: 'Alters tenant entry rules.',
          recommendation: 'Review state notice statutes.',
          matchedSnippet: 'Landlord may change rules for tenant access to leased premises at any time.',
        },
      ],
      'apartments.example'
    );
    expect(leasedPremises.id).toBe('lease-audit');
  });

  it('routes consumer contractor-compensation boilerplate to bill-of-rights-bot instead of paystub-check', () => {
    const dest = resolveDestinationTool(
      [
        {
          ruleId: 'consumer-contractor-comp-1',
          title: 'Mandatory Arbitration',
          category: 'ARBITRATION',
          classification: 'STATUTORY_VIOLATION',
          severity: 'CRITICAL',
          statute: { code: '9 U.S.C. § 2', title: 'FAA', jurisdiction: 'US', plainExplanation: '' },
          explanation: 'Forces customer arbitration.',
          recommendation: 'Review opt-out.',
          matchedSnippet:
            'Our payment processor is an independent contractor and receives compensation. All customer disputes require binding arbitration.',
        },
      ],
      'retail.example'
    );
    expect(dest.id).toBe('bill-of-rights-bot');
  });

  it('builds valid KtyHandoffPayload envelopes targeting paystub-check for ARBITRATION and UNILATERAL_CHANGE', () => {
    for (const category of ['ARBITRATION', 'UNILATERAL_CHANGE'] as const) {
      const scan: PageScanResult = {
        timestamp: '2026-11-13T12:00:00.000Z',
        urlDomain: 'company.example',
        scannedLength: 900,
        riskScore: 60,
        summary: { critical: 1, warning: 0, info: 0 },
        limitationsNotice: 'Visible text only',
        matches: [
          {
            ruleId: `pay-${category.toLowerCase()}`,
            title: `Employment ${category}`,
            category,
            classification: 'STATUTORY_VIOLATION',
            severity: 'CRITICAL',
            statute: { code: '29 U.S.C. § 206', title: 'FLSA', jurisdiction: 'US', plainExplanation: '' },
            explanation: 'Affects employee wages.',
            recommendation: 'Inspect wage terms.',
            matchedSnippet: 'Employer may alter employee salary and wage claims unilaterally.',
          },
        ],
        discoveredLinks: [],
      };
      const payload = buildHandoffPayload(scan);
      expect(payload.targetTool).toBe('paystub-check');
      expect(payload.findings[0]?.category).toBe(category);
      expect(validateHandoffPayload(payload)).toBe(true);
    }
  });

  it('does not route SaaS customer disputes on payroll-provider domains to paystub-check', () => {
    const dest = resolveDestinationTool(
      [
        {
          ruleId: 'arb-saas-cust',
          title: 'Binding Arbitration',
          category: 'ARBITRATION',
          classification: 'ONE_SIDED_DISCRETION',
          severity: 'WARNING',
          statute: { code: '9 U.S.C. § 2', title: 'FAA', jurisdiction: 'US', plainExplanation: '' },
          explanation: 'Forces customer arbitration.',
          recommendation: 'Review terms.',
          matchedSnippet: 'All customer disputes require binding arbitration.',
        },
      ],
      'gusto.com'
    );
    expect(dest.id).toBe('bill-of-rights-bot');
  });

  it('does not route third-party processor contractor disclaimers with negated employee wording to paystub-check', () => {
    const dest = resolveDestinationTool(
      [
        {
          ruleId: 'arb-vendor-contractor',
          title: 'Vendor Status & Arbitration',
          category: 'ARBITRATION',
          classification: 'ONE_SIDED_DISCRETION',
          severity: 'WARNING',
          statute: { code: '9 U.S.C. § 2', title: 'FAA', jurisdiction: 'US', plainExplanation: '' },
          explanation: 'Forces customer arbitration.',
          recommendation: 'Review terms.',
          matchedSnippet:
            'Our payment processor is an independent contractor, not our employee. All customer disputes require binding arbitration.',
        },
      ],
      'merchant.example'
    );
    expect(dest.id).toBe('bill-of-rights-bot');
  });
});


describe('Handoff Tool Routing — CodeRabbit R7 Regressions', () => {
  const makeFinding = (
    title: string,
    matchedSnippet: string,
    category: EvaluationMatch['category'] = 'ARBITRATION'
  ): EvaluationMatch => ({
    ruleId: 'r7-test-rule',
    title,
    category,
    classification: 'STATUTORY_VIOLATION',
    severity: 'CRITICAL',
    statute: { code: 'TEST', title: 'Test Statute', jurisdiction: 'US', plainExplanation: '' },
    explanation: 'Expl',
    recommendation: 'Rec',
    matchedSnippet,
  });

  it('does not route third-party payment processor contractor + customer arbitration clauses to paystub-check', () => {
    const tool = resolveDestinationTool(
      [
        makeFinding(
          'Customer Binding Arbitration',
          'Our payment processor is an independent contractor performing services for us. All customer disputes require binding arbitration.',
          'ARBITRATION'
        ),
      ],
      'shop.example.com'
    );
    expect(tool.id).toBe('bill-of-rights-bot');
  });

  it('does not route employer equipment lease clauses to lease-audit', () => {
    const tool = resolveDestinationTool(
      [
        makeFinding(
          'Unilateral Compensation Change',
          'Employer may change your salary for work performed using leased equipment.',
          'UNILATERAL_CHANGE'
        ),
      ],
      'portal.example.com'
    );
    expect(tool.id).toBe('paystub-check');
  });

  it('preserves second-person independent-contractor worker classification clauses for paystub-check', () => {
    const tool = resolveDestinationTool(
      [
        makeFinding(
          'Worker Arbitration & Status',
          'You are an independent contractor, not our employee. All disputes require binding arbitration.',
          'ARBITRATION'
        ),
      ],
      'work.example.com'
    );
    expect(tool.id).toBe('paystub-check');
  });

  it('routes affirmative employee-status arbitration clauses without contractor markers to paystub-check (CodeRabbit R8)', () => {
    const tool = resolveDestinationTool(
      [
        makeFinding(
          'Mandatory Arbitration',
          'As an employee, you agree to resolve all disputes by binding arbitration.',
          'ARBITRATION'
        ),
      ],
      'hr.example.com'
    );
    expect(tool.id).toBe('paystub-check');
  });

  it('does not treat a standalone salary reference in a rental clause as employment evidence (CodeRabbit R8)', () => {
    const tool = resolveDestinationTool(
      [
        makeFinding(
          'Unilateral Rent Increase',
          'We may change your rent at any time, including if your salary decreases.',
          'UNILATERAL_CHANGE'
        ),
      ],
      'apartments.example.com'
    );
    expect(tool.id).toBe('lease-audit');
  });

  it('keeps consumer disclaimer clauses routed to bill-of-rights-bot (CodeRabbit R8)', () => {
    const tool = resolveDestinationTool(
      [
        makeFinding(
          'Binding Arbitration',
          'Customer acknowledges customer is not an employee of the company. All disputes require binding arbitration.',
          'ARBITRATION'
        ),
      ],
      'shop.example.com'
    );
    expect(tool.id).toBe('bill-of-rights-bot');
  });

  it('evaluates repeated independent-contractor and disclaimer prefixes in linear time without ReDoS (CodeRabbit R8/R11)', () => {
    const measureMedianMs = (text: string, iterations = 5): number => {
      // Warmup
      const warmTool = resolveDestinationTool(
        [makeFinding('Customer Arbitration', text, 'ARBITRATION')],
        'shop.example.com'
      );
      expect(warmTool.id).toBe('bill-of-rights-bot');

      const samples: number[] = [];
      for (let i = 0; i < iterations; i += 1) {
        const started = performance.now();
        const tool = resolveDestinationTool(
          [makeFinding('Customer Arbitration', text, 'ARBITRATION')],
          'shop.example.com'
        );
        const elapsedMs = performance.now() - started;
        expect(tool.id).toBe('bill-of-rights-bot');
        samples.push(elapsedMs);
      }
      samples.sort((a, b) => a - b);
      return samples[Math.floor(samples.length / 2)];
    };

    const sizes = [1000, 4000, 16000];
    const variants = [
      (n: number) =>
        'our processor is an independent contractor '.repeat(n) +
        'All customer disputes require arbitration.',
      // Near-match prefixes that force repeated disclaimer/contractor pattern failure paths
      (n: number) =>
        'our third-party payment processor acts as an independent contractor performing '.repeat(n) +
        'service obligations for customers; customer disputes require arbitration.',
      (n: number) =>
        'nothing in these terms creates a partnership, agency, joint venture, '.repeat(n) +
        'obligation; all consumer disputes require binding arbitration.',
    ];

    for (const buildInput of variants) {
      const timings = sizes.map((n) => measureMedianMs(buildInput(n)));
      const smallest = timings[0];
      const largest = timings[timings.length - 1];
      // 16x input growth must stay sub-quadratic (256x would indicate quadratic backtracking);
      // 80ms floor absorbs sub-2ms baseline scheduler jitter under 25 parallel Vitest workers.
      expect(largest).toBeLessThan(Math.max(smallest * 32, 80));
      expect(largest).toBeLessThan(250);
    }
  });

  it('bounds lease-domain keywords so multitenant-saas.example routes to bill-of-rights-bot (CodeRabbit R11)', () => {
    const saasTool = resolveDestinationTool(
      [
        makeFinding(
          'Mandatory Arbitration',
          'All customer service disputes require binding arbitration.',
          'ARBITRATION'
        ),
      ],
      'multitenant-saas.example'
    );
    expect(saasTool.id).toBe('bill-of-rights-bot');

    const residentialTool = resolveDestinationTool(
      [
        makeFinding(
          'Mandatory Arbitration',
          'All residential disputes require binding arbitration.',
          'ARBITRATION'
        ),
      ],
      'tenant-rights.org'
    );
    expect(residentialTool.id).toBe('lease-audit');
  });

  it('strips employer-employee relationship disclaimers before routing classification (CodeRabbit R11)', () => {
    const disclaimerTool = resolveDestinationTool(
      [
        makeFinding(
          'Mandatory Arbitration',
          'Disputes require arbitration; these terms do not create an employer-employee relationship.',
          'ARBITRATION'
        ),
      ],
      'shop.example.com'
    );
    expect(disclaimerTool.id).toBe('bill-of-rights-bot');

    const slashDisclaimerTool = resolveDestinationTool(
      [
        makeFinding(
          'Mandatory Arbitration',
          'Nothing herein establishes an employer/employee status. Customer claims go to arbitration.',
          'ARBITRATION'
        ),
      ],
      'shop.example.com'
    );
    expect(slashDisclaimerTool.id).toBe('bill-of-rights-bot');
  });

  it('routes employer equipment lease wage deductions to paystub-check instead of lease-audit (CodeRabbit R9)', () => {
    const tool = resolveDestinationTool(
      [
        makeFinding(
          'Equipment Lease Wage Deduction',
          'Employer may deduct equipment lease payments from your wages.',
          'UNILATERAL_CHANGE'
        ),
      ],
      'onboarding.example.com'
    );
    expect(tool.id).toBe('paystub-check');
  });

  it('routes affirmative standalone "your employment" arbitration clauses to paystub-check while keeping consumer disclaimers on bill-of-rights-bot (CodeRabbit R9)', () => {
    const employmentTool = resolveDestinationTool(
      [
        makeFinding(
          'Mandatory Arbitration',
          'Any dispute arising out of your employment with the Company requires binding arbitration.',
          'ARBITRATION'
        ),
      ],
      'careers.example.com'
    );
    expect(employmentTool.id).toBe('paystub-check');

    const consumerDisclaimerTool = resolveDestinationTool(
      [
        makeFinding(
          'Binding Arbitration',
          'No partnership, joint venture, or employment relationship is created by these Terms. Customer disputes require arbitration.',
          'ARBITRATION'
        ),
      ],
      'shop.example.com'
    );
    expect(consumerDisclaimerTool.id).toBe('bill-of-rights-bot');

    const doNotCreateDisclaimerTool = resolveDestinationTool(
      [
        makeFinding(
          'Binding Arbitration',
          'These terms do not create an employment relationship. All customer disputes require arbitration.',
          'ARBITRATION'
        ),
      ],
      'shop.example.com'
    );
    expect(doNotCreateDisclaimerTool.id).toBe('bill-of-rights-bot');
  });
});
