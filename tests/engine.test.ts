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

  it('returns clean zero-risk assessment for benign terms', () => {
    const document = `
      This is a one-time purchase software license.
      No recurring fees or subscriptions apply.
      You may request a full refund within 30 days via our online dashboard.
      Disputes are subject to the jurisdiction of the state courts located in your county.
    `;

    const result = scanDocumentText(document, 'honest-vendor.org');
    expect(result.matches.length).toBe(0);
    expect(result.summary.critical).toBe(0);
    expect(result.summary.warning).toBe(0);
    expect(result.riskScore).toBe(0);
  });
});
