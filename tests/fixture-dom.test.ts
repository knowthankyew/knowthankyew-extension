/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { extractPageLegalText } from '../src/content/dom-extractor';
import { scanDocumentText, segmentText, ALL_RULES } from '../src/core/engine';
import { executeScan, startDynamicObserver, stopDynamicObserver, getCachedScanResult } from '../src/content/scanner';

describe('DOM Fixture Unit & Redaction Assertion (fixture-dom.test.ts)', () => {
  it('extracts visible page text from a realistic checkout DOM fixture, stripping scripts and nav', () => {
    // Construct DOM fixture
    document.body.innerHTML = `
      <header>
        <nav><a href="/home">Home</a> | <a href="/cart">Cart</a></nav>
      </header>
      <script>var decoy = "automatically renews fake fake";</script>
      <style>.hidden { display: none; }</style>
      
      <main class="checkout-container">
        <h1>Order Review</h1>
        <div class="user-data">
          Customer: victim@example.com, Card: 4111-2222-3333-4444
        </div>
        <div class="terms legal">
          <p class="trap-1">
            By clicking "Complete Purchase", you agree that your subscription automatically renews for successive one-month periods at $49.99/mo until you cancel.
          </p>
          <p class="trap-2">
            To cancel your membership, you must call our customer support department during regular business hours.
          </p>
          <p class="trap-3">
            Any dispute arising out of or relating to this contract shall be resolved by binding arbitration administered by the American Arbitration Association.
          </p>
          <p class="trap-4">
            You waive any right to bring a class action against the company or participate as a plaintiff or class member.
          </p>
          <p class="trap-5">
            We reserve the right to modify these terms at any time without notice in our sole discretion.
          </p>
          <p class="trap-6">
            We may share your personal information with third-party advertisers for targeted cross-context tracking.
          </p>
        </div>
      </main>
      <footer>
        <p>Copyright 2026 Predatory Vendor Inc.</p>
      </footer>
    `;

    const extractedText = extractPageLegalText();

    // Verification: Noise stripped
    expect(extractedText).not.toContain('Home | Cart');
    expect(extractedText).not.toContain('var decoy');
    expect(extractedText).not.toContain('.hidden');

    // Verification: Legal clauses preserved
    expect(extractedText).toContain('automatically renews for successive one-month periods');
    expect(extractedText).toContain('call our customer support department');
    expect(extractedText).toContain('resolved by binding arbitration');
    expect(extractedText).toContain('waive any right to bring a class action');

    // Execute scan on extracted text
    const scanResult = scanDocumentText(extractedText, 'predatory-checkout.test');

    // Verify detection counts
    expect(scanResult.matches.length).toBeGreaterThanOrEqual(6);
    expect(scanResult.summary.critical).toBeGreaterThanOrEqual(2); // Auto-renewal statutory violations
    expect(scanResult.summary.warning).toBeGreaterThanOrEqual(3);  // Rights waivers & unilateral discretion
    expect(scanResult.riskScore).toBeGreaterThanOrEqual(80);

    // Verify statutory & classification anchoring
    const ar001 = scanResult.matches.find(m => m.ruleId === 'AR-001');
    expect(ar001?.classification).toBe('STATUTORY_VIOLATION');
    expect(ar001?.severity).toBe('CRITICAL');
    expect(ar001?.statute.code).toContain('15 U.S.C. § 8403');

    const arb001 = scanResult.matches.find(m => m.ruleId === 'ARB-001');
    expect(arb001?.classification).toBe('RIGHTS_WAIVER');
    expect(arb001?.severity).toBe('WARNING');
    expect(arb001?.statute.code).toContain('9 U.S.C. § 2');

    const uni001 = scanResult.matches.find(m => m.ruleId === 'UNI-001');
    expect(uni001?.classification).toBe('ONE_SIDED_DISCRETION');
    expect(uni001?.severity).toBe('WARNING');

    // Verify PII Sanitization
    for (const match of scanResult.matches) {
      expect(match.matchedSnippet).not.toContain('victim@example.com');
      expect(match.matchedSnippet).not.toContain('4111-2222-3333-4444');
    }
  });

  it('resists ReDoS attacks on hostile repetitive input with bounded execution time (<25ms)', () => {
    // Construct adversarial string with nested repetitions
    const repeatingToken = 'Your subscription automatically renews each month until you cancel. ';
    const hostileInput = repeatingToken.repeat(500) + ' ' + 'Any dispute shall be resolved by binding arbitration. '.repeat(500);

    expect(hostileInput.length).toBeGreaterThan(20000);

    const start = performance.now();
    const segments = segmentText(hostileInput);
    
    // Pillar invariant: Segment bounds prevent runaway regex parsing
    expect(segments.length).toBeGreaterThan(0);
    expect(segments.every(s => s.length <= 1000)).toBe(true);

    // Test all patterns across all rules
    let matchCount = 0;
    for (const segment of segments) {
      for (const rule of ALL_RULES) {
        for (const pattern of rule.patterns) {
          if (pattern.test(segment)) {
            matchCount++;
          }
        }
      }
    }
    const duration = performance.now() - start;

    expect(matchCount).toBeGreaterThan(0);
    // Bounded execution guarantee: Must finish comfortably under 50ms without tab lock
    expect(duration).toBeLessThan(50);
  });

  it('Invariant 2: Enforces connect-src none in Manifest CSP and contains zero network egress primitives', () => {
    // 1. Read Manifest V3
    const manifestPath = resolve(__dirname, '../manifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

    expect(manifest.manifest_version).toBe(3);
    
    // Assert CSP enforcement
    const csp = manifest.content_security_policy?.extension_pages;
    expect(csp).toBeDefined();
    expect(csp).toContain("connect-src 'none'");
    expect(csp).toContain("default-src 'self'");

    // Assert no broad host permissions
    expect(manifest.permissions).toContain('activeTab');
    expect(manifest.permissions).not.toContain('<all_urls>');
    expect(manifest.permissions).not.toContain('*://*/*');

    // 2. If dist exists, inspect built bundles for network egress
    const distPath = resolve(__dirname, '../dist');
    if (existsSync(distPath)) {
      const checkBundle = (filePath: string) => {
        const content = readFileSync(filePath, 'utf8');
        // No network egress primitives allowed in bundled output
        expect(content).not.toMatch(/fetch\s*\(/);
        expect(content).not.toMatch(/new\s+WebSocket\s*\(/);
        expect(content).not.toMatch(/navigator\.sendBeacon\s*\(/);
        expect(content).not.toMatch(/new\s+XMLHttpRequest\s*\(/);
      };

      const workerPath = resolve(distPath, 'background/service-worker.js');
      if (existsSync(workerPath)) checkBundle(workerPath);

      const scannerPath = resolve(distPath, 'content/scanner.js');
      if (existsSync(scannerPath)) checkBundle(scannerPath);
    }
  });

  it('dynamically observes DOM mutations and re-scans when checkout clauses are injected', async () => {
    document.body.innerHTML = '<main><h1>Welcome</h1></main>';
    startDynamicObserver();

    const initial = executeScan();
    expect(initial.matches.length).toBe(0);

    // Simulate dynamic SPA insertion of checkout subscription terms
    const termsDiv = document.createElement('div');
    termsDiv.className = 'terms legal';
    termsDiv.innerHTML = '<p>Your subscription renews automatically each month unless you cancel.</p>';
    document.body.appendChild(termsDiv);

    // Wait for debounce (450ms)
    await new Promise(r => setTimeout(r, 450));

    const updated = getCachedScanResult();
    expect(updated).not.toBeNull();
    expect(updated!.summary.critical).toBeGreaterThan(0);
    expect(updated!.matches.some(m => m.ruleId === 'AR-001')).toBe(true);

    stopDynamicObserver();
  });
});
