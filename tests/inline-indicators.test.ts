/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  injectIndicator,
  removeAllIndicators,
  getActiveIndicatorCount,
} from '../src/content/inline-indicators';
import {
  findPredatoryCheckboxAnchors,
  injectIndicatorsForScanResult,
} from '../src/content/scanner';
import { PageScanResult } from '../src/core/types';

describe('Closed Shadow DOM Inline Indicators (inline-indicators.test.ts)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    removeAllIndicators();
  });

  afterEach(() => {
    removeAllIndicators();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('injectIndicator() creates a host element as a sibling after the anchor', () => {
    const anchor = document.createElement('input');
    anchor.type = 'checkbox';
    document.body.appendChild(anchor);

    const host = injectIndicator({
      anchorElement: anchor,
      severity: 'CRITICAL',
      label: '⚠ Trap',
      tooltipText: 'Mandatory auto-renewal trap detected',
    });

    expect(host).not.toBeNull();
    expect(anchor.nextElementSibling).toBe(host);
    expect(host?.getAttribute('data-kty-indicator-host')).toBe('true');
  });

  it('injectIndicator() returns null when attachShadow is unavailable', () => {
    const anchor = document.createElement('input');
    document.body.appendChild(anchor);

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const el = originalCreateElement(tagName);
      if (tagName === 'span') {
        (el as any).attachShadow = undefined;
      }
      return el;
    });

    const host = injectIndicator({
      anchorElement: anchor,
      severity: 'WARNING',
      label: '⚠ Risk',
      tooltipText: 'Arbitration waiver',
    });

    expect(host).toBeNull();
  });

  it('enforces closed Shadow DOM mode: shadowRoot is null externally', () => {
    const anchor = document.createElement('input');
    document.body.appendChild(anchor);

    const host = injectIndicator({
      anchorElement: anchor,
      severity: 'CRITICAL',
      label: '⚠ Trap',
      tooltipText: 'Pre-ticked box',
    });

    expect(host).not.toBeNull();
    // In closed mode, host.shadowRoot is inaccessible externally
    expect(host?.shadowRoot).toBeNull();
  });

  it('applies CRITICAL red styling inside shadow root stylesheet', () => {
    let capturedCss = '';
    const anchor = document.createElement('input');
    document.body.appendChild(anchor);

    const originalAttachShadow = HTMLElement.prototype.attachShadow;
    vi.spyOn(HTMLElement.prototype, 'attachShadow').mockImplementation(function (
      this: HTMLElement,
      _init: ShadowRootInit
    ) {
      const root = originalAttachShadow.call(this, { mode: 'open' }); // open for test assertion
      const origAppend = root.appendChild.bind(root);
      root.appendChild = function <T extends Node>(node: T): T {
        if ((node as any).tagName === 'STYLE') {
          capturedCss = (node as any).textContent || '';
        }
        return origAppend(node);
      };
      return root;
    });

    injectIndicator({
      anchorElement: anchor,
      severity: 'CRITICAL',
      label: '⚠ Trap',
      tooltipText: 'Critical statutory trap',
    });

    expect(capturedCss).toContain('background-color: #ef4444');
    expect(capturedCss).toContain('color: #ffffff');
  });

  it('applies WARNING amber styling inside shadow root stylesheet', () => {
    let capturedCss = '';
    const anchor = document.createElement('input');
    document.body.appendChild(anchor);

    const originalAttachShadow = HTMLElement.prototype.attachShadow;
    vi.spyOn(HTMLElement.prototype, 'attachShadow').mockImplementation(function (
      this: HTMLElement,
      _init: ShadowRootInit
    ) {
      const root = originalAttachShadow.call(this, { mode: 'open' });
      const origAppend = root.appendChild.bind(root);
      root.appendChild = function <T extends Node>(node: T): T {
        if ((node as any).tagName === 'STYLE') {
          capturedCss = (node as any).textContent || '';
        }
        return origAppend(node);
      };
      return root;
    });

    injectIndicator({
      anchorElement: anchor,
      severity: 'WARNING',
      label: '⚠ Risk',
      tooltipText: 'Discretionary unilateral change',
    });

    expect(capturedCss).toContain('background-color: #f59e0b');
  });

  it('removeAllIndicators() removes all injected host elements from document', () => {
    const anchor1 = document.createElement('input');
    const anchor2 = document.createElement('input');
    document.body.appendChild(anchor1);
    document.body.appendChild(anchor2);

    injectIndicator({ anchorElement: anchor1, severity: 'CRITICAL', label: '1', tooltipText: 'T1' });
    injectIndicator({ anchorElement: anchor2, severity: 'WARNING', label: '2', tooltipText: 'T2' });

    expect(document.querySelectorAll('[data-kty-indicator-host]').length).toBe(2);
    expect(getActiveIndicatorCount()).toBe(2);

    removeAllIndicators();

    expect(document.querySelectorAll('[data-kty-indicator-host]').length).toBe(0);
    expect(getActiveIndicatorCount()).toBe(0);
  });

  it('getActiveIndicatorCount() accurately reflects active indicator count', () => {
    expect(getActiveIndicatorCount()).toBe(0);

    const anchor = document.createElement('input');
    document.body.appendChild(anchor);

    injectIndicator({ anchorElement: anchor, severity: 'INFO', label: 'Info', tooltipText: 'Note' });
    expect(getActiveIndicatorCount()).toBe(1);

    removeAllIndicators();
    expect(getActiveIndicatorCount()).toBe(0);
  });

  it('injectIndicatorsForScanResult() is idempotent: removes prior indicators before re-injecting', () => {
    const label = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    label.appendChild(cb);
    label.appendChild(document.createTextNode('Automatically renew subscription each month'));
    document.body.appendChild(label);

    const mockScanResult: PageScanResult = {
      urlDomain: 'checkout.example.com',
      timestamp: new Date().toISOString(),
      scannedLength: 500,
      riskScore: 85,
      matches: [
        {
          ruleId: 'AR-001',
          title: 'Auto-Renewal Commitment',
          category: 'AUTO_RENEWAL',
          classification: 'STATUTORY_VIOLATION',
          severity: 'CRITICAL',
          statute: {
            code: '15 U.S.C. § 8403',
            title: 'ROSCA',
            jurisdiction: 'Federal',
            plainExplanation: 'Auto-renewal disclosure',
          },
          matchedSnippet: 'Automatically renew subscription',
          explanation: 'Requires affirmative consent',
          recommendation: 'Check cancel options',
        },
      ],
      discoveredLinks: [],
      summary: { critical: 1, warning: 0, info: 0 },
      limitationsNotice: 'Visible text only',
    };

    // First injection
    injectIndicatorsForScanResult(mockScanResult);
    expect(getActiveIndicatorCount()).toBe(1);

    // Second injection (simulating dynamic MutationObserver re-scan or SPA re-render)
    injectIndicatorsForScanResult(mockScanResult);
    expect(getActiveIndicatorCount()).toBe(1);
    expect(document.querySelectorAll('[data-kty-indicator-host]').length).toBe(1);
  });

  it('injectIndicatorsForScanResult() with zero CRITICAL/WARNING matches injects nothing', () => {
    const label = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    label.appendChild(cb);
    label.appendChild(document.createTextNode('Automatically renew recurring plan'));
    document.body.appendChild(label);

    const mockInfoResult: PageScanResult = {
      urlDomain: 'example.com',
      timestamp: new Date().toISOString(),
      scannedLength: 200,
      riskScore: 10,
      matches: [
        {
          ruleId: 'SURV-002',
          title: 'Background Location',
          category: 'SURVEILLANCE',
          classification: 'SURVEILLANCE_NOTICE',
          severity: 'INFO',
          statute: { code: 'BIPA', title: 'Location', jurisdiction: 'State', plainExplanation: 'Notice' },
          matchedSnippet: 'Location collected',
          explanation: 'Background GPS',
          recommendation: 'Deny permission',
        },
      ],
      discoveredLinks: [],
      summary: { critical: 0, warning: 0, info: 1 },
      limitationsNotice: 'Visible text only',
    };

    injectIndicatorsForScanResult(mockInfoResult);
    expect(getActiveIndicatorCount()).toBe(0);
  });

  it('findPredatoryCheckboxAnchors() detects suspicious checkbox labels and caps at 3', () => {
    for (let i = 1; i <= 5; i++) {
      const label = document.createElement('label');
      label.htmlFor = `cb-${i}`;
      label.textContent = `I agree to automatically renew subscription ${i}`;

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.id = `cb-${i}`;

      document.body.appendChild(cb);
      document.body.appendChild(label);
    }

    const anchors = findPredatoryCheckboxAnchors();
    // Must identify suspicious checkboxes and cap strictly at 3
    expect(anchors.length).toBe(3);
    anchors.forEach((el) => {
      expect(el.tagName).toBe('INPUT');
    });
  });
});
