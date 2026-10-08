/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { extractPageLegalContent } from '../src/content/dom-extractor';
import { executeScan, handleHardBurnDOM, getCachedScanResult, resetHardBurnForTesting } from '../src/content/scanner';
import { PageScanResult } from '../src/core/types';
import { AuditReceiptCard } from '../src/popup/components/AuditReceiptCard';
import { SparseScanWarning } from '../src/popup/components/SparseScanWarning';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('Milestone 7 Phase 1.5 — Clean-State Proof of Work & Scope Transparency (proof-of-work.test.tsx)', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    resetHardBurnForTesting();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
      root = null;
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    container = null;
    handleHardBurnDOM();
    resetHardBurnForTesting();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------
  // Test 1: Container selector attribution in dom-extractor.ts
  // -------------------------------------------------------------
  it('extractPageLegalContent attributes container selectors (main, form.checkout, article.legal)', () => {
    document.body.innerHTML = `
      <main class="checkout-main">
        <article class="legal">
          <h2>Terms of Use</h2>
          <p>These terms are standard terms without subscription traps.</p>
        </article>
        <form class="checkout">
          <p>Payment information will be collected securely.</p>
        </form>
      </main>
    `;

    const { text, inspectedContainers } = extractPageLegalContent(document.body);
    expect(text).toContain('These terms are standard terms');
    expect(text).toContain('Payment information');
    // Preorder disjoint ancestor is main
    expect(inspectedContainers).toContain('main');
  });

  it('extractPageLegalContent attributes sibling containers when no wrapping <main>', () => {
    document.body.innerHTML = `
      <article class="legal">
        <p>Honest one-time purchase terms. No renewals or recurring billing.</p>
      </article>
      <form class="checkout">
        <p>Enter billing address below.</p>
      </form>
    `;

    const { text, inspectedContainers } = extractPageLegalContent(document.body);
    expect(text).toContain('Honest one-time purchase terms');
    expect(inspectedContainers).toContain('article.legal');
    expect(inspectedContainers).toContain('form.checkout');
  });

  it('extractPageLegalContent falls back to body container when candidate nodes are absent', () => {
    document.body.innerHTML = `
      <div>
        <p>General informational paragraph on an unstructured document.</p>
      </div>
    `;

    const { inspectedContainers } = extractPageLegalContent(document.body);
    expect(inspectedContainers).toEqual(['body']);
  });

  // -------------------------------------------------------------
  // Test 2: Telemetry calculations in executeScan() & engine.ts
  // -------------------------------------------------------------
  it('executeScan populates all quantitative telemetry fields in PageScanResult', () => {
    document.body.innerHTML = `
      <main>
        <div class="terms legal">
          <p>Section 1: You agree to purchase this software license outright. Refunds are honored within 30 days of initial purchase.</p>
          <p>Section 2: Disputes are handled in municipal court. No arbitration clause is asserted.</p>
        </div>
      </main>
    `;

    const result = executeScan();

    expect(result.scannedLength).toBeGreaterThan(150);
    expect(result.wordCount).toBe(Math.round(result.scannedLength / 5));
    expect(result.segmentCount).toBeGreaterThanOrEqual(1);
    expect(result.durationMs).toBeGreaterThanOrEqual(1);
    expect(result.evaluatedRulesCount).toBeGreaterThan(0);
    expect(result.inspectedContainers).toBeDefined();
    expect(result.inspectedContainers!.length).toBeGreaterThan(0);
    expect(result.sanitizedTextPreview).toBeDefined();
    expect(result.extractedTextSnippet).toBe(result.sanitizedTextPreview);
  });

  // -------------------------------------------------------------
  // Test 3: AuditReceiptCard Clean-State Proof of Work Receipt
  // -------------------------------------------------------------
  it('renders AuditReceiptCard with quantitative telemetry and statutory pass checklist', () => {
    const mockCleanResult: PageScanResult = {
      timestamp: new Date().toISOString(),
      urlDomain: 'honest-store.org',
      scannedLength: 14820,
      wordCount: 2964,
      segmentCount: 48,
      durationMs: 38,
      evaluatedRulesCount: 42,
      inspectedContainers: ['main', 'form.checkout'],
      sanitizedTextPreview: 'Section 1. Standard one-time purchase software license. No subscription or automatic renewal.',
      extractedTextSnippet: 'Section 1. Standard one-time purchase software license. No subscription or automatic renewal.',
      matches: [],
      riskScore: 0,
      summary: { critical: 0, warning: 0, info: 0 },
      limitationsNotice: 'Scans visible on-page DOM text only.',
      discoveredLinks: [],
    };

    act(() => {
      root = createRoot(container!);
      root.render(<AuditReceiptCard scanResult={mockCleanResult} />);
    });

    const card = container!.querySelector('[data-testid="audit-receipt-card"]');
    expect(card).not.toBeNull();

    const textContent = card!.textContent || '';
    // Proof of work header
    expect(textContent).toContain('Proof of Work · Verification Receipt');
    expect(textContent).toContain('NO TRAPS IDENTIFIED');

    // Telemetry stats
    expect(textContent).toContain('14,820 chars');
    expect(textContent).toContain('~2,964 words');
    expect(textContent).toContain('48 clauses');
    expect(textContent).toContain('38ms');
    expect(textContent).toContain('42 rules evaluated');
    expect(textContent).toContain('main');
    expect(textContent).toContain('form.checkout');

    // Itemized Statutory Pass Checklist items
    expect(textContent).toContain('Automatic Renewal & Negative Option');
    expect(textContent).toContain('ROSCA 15 U.S.C. § 8403');
    expect(textContent).toContain('Mandatory Binding Arbitration & Jury Trial Waivers');
    expect(textContent).toContain('FAA 9 U.S.C. § 2');
    expect(textContent).toContain('Unilateral Terms Modification & Illusory Discretion');
    expect(textContent).toContain('Surveillance & Cross-Context Data Brokerage Disclosures');
    expect(textContent).toContain('EU CRD / UK DMCC 2024 Pre-ticked Consent & Cooling-off Disclosures');
  });

  it('AuditReceiptCard toggles the sanitized evaluated text preview accordion', () => {
    const mockCleanResult: PageScanResult = {
      timestamp: new Date().toISOString(),
      urlDomain: 'honest-store.org',
      scannedLength: 800,
      wordCount: 160,
      segmentCount: 5,
      durationMs: 12,
      evaluatedRulesCount: 42,
      inspectedContainers: ['body'],
      sanitizedTextPreview: 'This is the exact sanitized preview of evaluated agreement clauses.',
      extractedTextSnippet: 'This is the exact sanitized preview of evaluated agreement clauses.',
      matches: [],
      riskScore: 0,
      summary: { critical: 0, warning: 0, info: 0 },
      limitationsNotice: 'Scans visible on-page DOM text only.',
    };

    act(() => {
      root = createRoot(container!);
      root.render(<AuditReceiptCard scanResult={mockCleanResult} />);
    });

    // Initially preview is collapsed
    expect(container!.querySelector('[data-testid="sanitized-text-preview"]')).toBeNull();

    // Click toggle button
    const toggleButton = container!.querySelector('button');
    expect(toggleButton).not.toBeNull();
    expect(toggleButton!.textContent).toContain('Inspect Evaluated Text');

    act(() => {
      toggleButton!.click();
    });

    // Now preview is expanded and displays sanitized text
    const preview = container!.querySelector('[data-testid="sanitized-text-preview"]');
    expect(preview).not.toBeNull();
    expect(preview!.textContent).toContain('This is the exact sanitized preview of evaluated agreement clauses.');
  });

  // -------------------------------------------------------------
  // Test 4: Sparse Content & Unreached Frame Warning Guard (< 250 chars)
  // -------------------------------------------------------------
  it('renders SparseScanWarning when content is under 250 characters and elevates discovered links', () => {
    const mockNavigate = vi.fn();
    const mockSparseResult: PageScanResult = {
      timestamp: new Date().toISOString(),
      urlDomain: 'stripe-embed.com',
      scannedLength: 95,
      wordCount: 19,
      segmentCount: 1,
      durationMs: 3,
      evaluatedRulesCount: 42,
      inspectedContainers: ['body'],
      sanitizedTextPreview: 'Pay now with credit card. SSL secured.',
      extractedTextSnippet: 'Pay now with credit card. SSL secured.',
      matches: [],
      riskScore: 0,
      summary: { critical: 0, warning: 0, info: 0 },
      limitationsNotice: 'Scans visible on-page DOM text only.',
      discoveredLinks: [
        {
          url: 'https://example.com/legal/subscription-terms',
          title: 'Subscription & Renewal Terms',
          category: 'TERMS',
          source: 'DOM_ANCHOR',
        },
        {
          url: 'https://example.com/legal/arbitration',
          title: 'Binding Arbitration Waiver',
          category: 'ARBITRATION',
          source: 'DOM_ANCHOR',
        },
      ],
    };

    act(() => {
      root = createRoot(container!);
      root.render(<SparseScanWarning scanResult={mockSparseResult} onNavigate={mockNavigate} />);
    });

    const warningCard = container!.querySelector('[data-testid="sparse-scan-warning"]');
    expect(warningCard).not.toBeNull();

    const textContent = warningCard!.textContent || '';
    expect(textContent).toContain('Sparse Content / Indeterminate Scan');
    expect(textContent).toContain('INCONCLUSIVE');
    expect(textContent).toContain('Only 95 characters evaluated');
    expect(textContent).toContain('Cross-origin <iframe>');
    expect(textContent).toContain('Closed Shadow DOM');

    // Elevates discovered primary contract link
    expect(textContent).toContain('Discovered Linked Agreement');
    expect(textContent).toContain('Subscription & Renewal Terms');

    // Also renders secondary discovered contracts without starvations
    expect(textContent).toContain('Other Discovered Agreements (1):');
    expect(textContent).toContain('Binding Arbitration Waiver');

    // Click 1-click navigation button for primary link
    const openBtn = Array.from(container!.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Open & Scan Linked Terms')
    );
    expect(openBtn).toBeDefined();

    act(() => {
      openBtn!.click();
    });

    expect(mockNavigate).toHaveBeenCalledWith('https://example.com/legal/subscription-terms');

    // Click navigation button for secondary link
    const auditBtn = Array.from(container!.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Audit →')
    );
    expect(auditBtn).toBeDefined();

    act(() => {
      auditBtn!.click();
    });

    expect(mockNavigate).toHaveBeenCalledWith('https://example.com/legal/arbitration');
  });

  // -------------------------------------------------------------
  // Test 5: Amnesiac Hard Burn Zeroization
  // -------------------------------------------------------------
  it('purges all cached scan telemetry and DOM state on Nuclear Hard Burn', () => {
    document.body.innerHTML = `
      <main class="terms legal">
        <p>Amnesia test clause content for validation.</p>
      </main>
    `;

    const scan = executeScan();
    expect(scan).toBeDefined();
    expect(getCachedScanResult()).not.toBeNull();

    // Fire hard burn
    handleHardBurnDOM();

    expect(getCachedScanResult()).toBeNull();
  });

  // -------------------------------------------------------------
  // Test 6: PII Redaction Boundary Safety (Sanitizing before truncation)
  // -------------------------------------------------------------
  it('sanitizes text before 2000-char preview truncation and bounds 4000-char source buffer without boundary leakage', async () => {
    const { scanDocumentText: scanDoc } = await import('../src/core/engine');
    // Boundary 1: Sensitive email straddling character 2000 in raw text (starts at 1971, length ~50 chars)
    const paddingLength = 1970;
    const padding = 'x'.repeat(paddingLength);
    const emailStraddlingBoundary = 'corporate.executive@confidential-defense-firm.com';
    const textWithBoundaryPII = padding + ' ' + emailStraddlingBoundary + ' ' + 'y'.repeat(500);

    const result = scanDoc(textWithBoundaryPII, 'boundary-test.com');
    expect(result.sanitizedTextPreview).toContain('[EMAIL REDACTED]');
    expect(result.sanitizedTextPreview).not.toContain('corporate.executive');
    expect(result.sanitizedTextPreview).not.toContain('confidential-defense-firm');

    // Boundary 2: Sensitive token straddling the 4000-char raw preview source buffer boundary
    const text4000Boundary = 'z'.repeat(3980) + ' corporate.executive@confidential-defense-firm.com ' + 'w'.repeat(500);
    const result4000 = scanDoc(text4000Boundary, 'boundary-test.com');
    expect(result4000.sanitizedTextPreview).not.toContain('corporate.executive');
    expect(result4000.sanitizedTextPreview).toBeDefined();
    expect(result4000.sanitizedTextPreview!.length).toBeLessThanOrEqual(2003);
  });
});
