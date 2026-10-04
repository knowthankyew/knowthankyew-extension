import { describe, it, expect } from 'vitest';
import { scanDocumentText, sanitizeSnippet, segmentText } from '../src/core/engine';

describe('Local Document Scanning Engine', () => {
  it('segments text into coherent paragraphs and clauses', () => {
    const raw = `Section 1. Terms of service are here.\n\nSection 2. You must pay monthly fees. Another sentence here.`;
    const segments = segmentText(raw);
    expect(segments.length).toBeGreaterThanOrEqual(2);
    expect(segments[0]).toContain('Terms of service');
  });

  it('sanitizes sensitive emails and credit card tokens from snippets', () => {
    const dirty = 'Contact legal@company.com with card 4111-2222-3333-4444 to confirm.';
    const clean = sanitizeSnippet(dirty);
    expect(clean).toContain('[EMAIL REDACTED]');
    expect(clean).toContain('[CARD REDACTED]');
    expect(clean).not.toContain('legal@company.com');
    expect(clean).not.toContain('4111-2222-3333-4444');
  });

  it('scans text and returns structured evaluation matches and risk score', () => {
    const document = `
      Welcome to our cloud service.
      
      Your subscription automatically renews each month until you cancel.
      To cancel your membership, you must call our customer support department during business hours.
      
      Any dispute arising out of this agreement shall be resolved by binding arbitration.
      You waive any right to bring a class action against the company.
    `;

    const result = scanDocumentText(document, 'predatory-checkout.com');
    expect(result.urlDomain).toBe('predatory-checkout.com');
    expect(result.matches.length).toBe(4);
    expect(result.summary.critical).toBe(2);
    expect(result.summary.warning).toBe(2);
    expect(result.riskScore).toBeGreaterThanOrEqual(70);
  });

  it('returns clean zero-risk assessment for benign terms with full proof-of-work telemetry', () => {
    const document = `
      This is a one-time purchase software license.
      No recurring fees or subscriptions apply.
      You may request a full refund within 30 days via our online dashboard.
      Disputes are subject to the jurisdiction of the state courts located in your county.
    `;

    const result = scanDocumentText(document, 'honest-vendor.org', ['main', 'article.legal']);
    expect(result.matches.length).toBe(0);
    expect(result.summary.critical).toBe(0);
    expect(result.summary.warning).toBe(0);
    expect(result.riskScore).toBe(0);

    // Phase 1.5 Extraction Scope Telemetry assertions
    expect(result.scannedLength).toBe(document.length);
    expect(result.wordCount).toBe(Math.round(document.length / 5));
    expect(result.segmentCount).toBeGreaterThanOrEqual(1);
    expect(result.durationMs).toBeGreaterThanOrEqual(1);
    expect(result.evaluatedRulesCount).toBeGreaterThan(0);
    expect(result.inspectedContainers).toEqual(['main', 'article.legal']);
    expect(result.sanitizedTextPreview).toBeDefined();
    expect(result.extractedTextSnippet).toBe(result.sanitizedTextPreview);
    expect(result.sanitizedTextPreview?.length).toBeLessThanOrEqual(2003);
  });

  it('bounds sanitizedTextPreview to 2,000 characters and redacts PII', () => {
    const hugeDocument = 'Confidential agreement for user@example.com with payment 4111-2222-3333-4444. ' + 'Long clause content. '.repeat(200);
    const result = scanDocumentText(hugeDocument, 'test-doc.com');

    expect(result.sanitizedTextPreview).toContain('[EMAIL REDACTED]');
    expect(result.sanitizedTextPreview).toContain('[CARD REDACTED]');
    expect(result.sanitizedTextPreview).not.toContain('user@example.com');
    expect(result.sanitizedTextPreview).not.toContain('4111-2222-3333-4444');
    expect(result.sanitizedTextPreview?.endsWith('...')).toBe(true);
    expect(result.sanitizedTextPreview?.length).toBeLessThanOrEqual(2003);
  });

  it('correctly discriminates sparse sub-threshold text (< 250 chars) from thorough documents', () => {
    const sparseText = 'Short disclaimer: All sales are final. No refunds.';
    const sparseResult = scanDocumentText(sparseText, 'sparse-checkout.com');
    expect(sparseResult.scannedLength).toBeLessThan(250);
    expect(sparseResult.riskScore).toBe(0);

    const fullText = 'Terms of Service. '.repeat(30);
    const fullResult = scanDocumentText(fullText, 'full-terms.com');
    expect(fullResult.scannedLength).toBeGreaterThanOrEqual(250);
  });
});
