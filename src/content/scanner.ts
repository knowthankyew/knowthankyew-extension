import { extractPageLegalText } from './dom-extractor';
import { discoverLegalLinks } from './link-detector';
import { scanDocumentText } from '../core/engine';
import { PageScanResult } from '../core/types';
import { injectIndicator, removeAllIndicators } from './inline-indicators';

let cachedScanResult: PageScanResult | null = null;
let lastExtractedTextLength = 0;
let mutationObserver: MutationObserver | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
export const BUCKET_CAPACITY = 15;
export const TOKEN_REFILL_INTERVAL_MS = 4000; // 1 token every 4s = 15 tokens/min steady state
export const DEBOUNCE_DELAY_MS = 400;
export const TEXT_DELTA_THRESHOLD = 25;

let tokens = BUCKET_CAPACITY;
let lastRefillTimestamp = Date.now();

export function replenishTokens(now: number = Date.now()): void {
  const elapsed = now - lastRefillTimestamp;
  if (elapsed >= TOKEN_REFILL_INTERVAL_MS) {
    const addedTokens = Math.floor(elapsed / TOKEN_REFILL_INTERVAL_MS);
    tokens = Math.min(BUCKET_CAPACITY, tokens + addedTokens);
    if (tokens === BUCKET_CAPACITY) {
      lastRefillTimestamp = now;
    } else {
      lastRefillTimestamp += addedTokens * TOKEN_REFILL_INTERVAL_MS;
    }
  }
}

export function consumeScanToken(now: number = Date.now()): boolean {
  replenishTokens(now);
  if (tokens >= 1) {
    tokens -= 1;
    return true;
  }
  return false;
}

export function getTokenCount(now: number = Date.now()): number {
  replenishTokens(now);
  return tokens;
}

export function resetTokenBucket(): void {
  tokens = BUCKET_CAPACITY;
  lastRefillTimestamp = Date.now();
}

/**
 * Executes a full scan of the active document's legal text and discovers governing links.
 * Caches the result and broadcasts the summary to the background service worker.
 */
export function executeScan(): PageScanResult {
  const text = extractPageLegalText();
  const hostname = (typeof window !== 'undefined' && window.location?.hostname) || 'current-page';
  const currentHref = (typeof window !== 'undefined' && window.location?.href) || '';
  const discoveredLinks = discoverLegalLinks(typeof document !== 'undefined' ? document : undefined, currentHref);

  const result: PageScanResult = scanDocumentText(text, hostname);
  result.discoveredLinks = discoveredLinks;
  cachedScanResult = result;
  lastExtractedTextLength = text.length;

  try {
    injectIndicatorsForScanResult(result);
  } catch {
    // Non-fatal if host DOM rejects indicator attachment
  }

  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    chrome.runtime.sendMessage({
      type: 'KTY_SCAN_COMPLETED',
      domain: hostname,
      summary: result.summary,
      riskScore: result.riskScore,
    }).catch(() => {});
  }

  return result;
}

/**
 * Resolves the associated textual label for a form checkbox input.
 */
export function findLabelForInput(input: HTMLInputElement): string {
  if (input.id && typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    const label = document.querySelector(`label[for="${CSS.escape(input.id)}"]`);
    if (label) return label.textContent || '';
  } else if (input.id) {
    const label = document.querySelector(`label[for="${input.id}"]`);
    if (label) return label.textContent || '';
  }
  const parentLabel = input.closest('label');
  if (parentLabel) return parentLabel.textContent || '';
  if (input.getAttribute('aria-label')) return input.getAttribute('aria-label')!;
  const next = input.nextElementSibling;
  if (next) return next.textContent || '';
  return '';
}

/**
 * Scans the active document for consent checkboxes whose labels match predatory
 * auto-renewal, mandatory arbitration, or unilateral rights-waiver patterns.
 * Capped at 3 indicators to prevent visual clutter.
 */
export function findPredatoryCheckboxAnchors(): Element[] {
  if (typeof document === 'undefined') return [];

  const results: Element[] = [];
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  const suspiciousPatterns = [
    /auto(?:matic(?:ally)?)?[\s-]?renew/i,
    /recurring/i,
    /arbitrat/i,
    /waive/i,
    /automatically.{0,30}charge/i,
    /binding/i,
    /class.action/i,
  ];

  checkboxes.forEach((cb) => {
    const label = findLabelForInput(cb as HTMLInputElement);
    if (label && suspiciousPatterns.some((p) => p.test(label))) {
      results.push(cb);
    }
  });

  return results.slice(0, 3);
}

/**
 * Injects non-intrusive Closed Shadow DOM visual indicators adjacent to identified
 * predatory consent anchors on the page.
 */
export function injectIndicatorsForScanResult(result: PageScanResult): void {
  removeAllIndicators();

  const actionableMatches = result.matches.filter(
    (m) => m.severity === 'CRITICAL' || m.severity === 'WARNING'
  );

  if (actionableMatches.length === 0) return;

  const anchors = findPredatoryCheckboxAnchors();
  if (anchors.length === 0) return;

  anchors.forEach((anchor, idx) => {
    const match = actionableMatches[idx % actionableMatches.length];
    injectIndicator({
      anchorElement: anchor,
      severity: match.severity,
      label: match.severity === 'CRITICAL' ? '⚠ Trap' : '⚠ Risk',
      tooltipText: `${match.title}: ${match.explanation.slice(0, 120)}`,
    });
  });
}

export function getCachedScanResult(): PageScanResult | null {
  return cachedScanResult;
}

/**
 * Starts a debounced MutationObserver on document.body to continuously monitor
 * dynamic checkout pages, terms accordions, and asynchronous subscription modals.
 */
export function startDynamicObserver(): void {
  if (mutationObserver || typeof MutationObserver === 'undefined') return;
  if (typeof document === 'undefined' || !document.body) return;

  mutationObserver = new MutationObserver((mutations) => {
    let hasMeaningfulChange = false;
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        if (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0) {
          hasMeaningfulChange = true;
          break;
        }
      } else if (mutation.type === 'characterData') {
        hasMeaningfulChange = true;
        break;
      }
    }

    if (!hasMeaningfulChange) return;

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      const currentText = extractPageLegalText();
      const lengthDelta = Math.abs(currentText.length - lastExtractedTextLength);

      if (lengthDelta < TEXT_DELTA_THRESHOLD) {
        return; // Sub-threshold text mutation; ignore
      }

      if (!consumeScanToken()) {
        return; // Throttled by token bucket to prevent CPU runaway on chaotic dynamic pages
      }

      executeScan();
    }, DEBOUNCE_DELAY_MS);
  });

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

/**
 * Ceases DOM observation, clears debounced timers, and resets the throttle token bucket.
 */
export function stopDynamicObserver(): void {
  if (mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
  }
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  resetTokenBucket();
}

/**
 * Intentional content script lifecycle activation:
 * Content scripts execute in the tab's isolated world upon injection and must automatically
 * bind the DOM MutationObserver and execute an initial scan when the document is ready.
 */
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      startDynamicObserver();
      executeScan();
    });
  } else {
    startDynamicObserver();
    executeScan();
  }
}

let burnBroadcastChannel: BroadcastChannel | null = null;

/**
 * Idempotent DOM teardown and sanitization handler.
 * Executed on receiving KTY_HARD_BURN_DOM via chrome.runtime.onMessage OR BroadcastChannel.
 */
export function handleHardBurnDOM(): void {
  // Disconnect observer and cease all monitoring
  stopDynamicObserver();
  cachedScanResult = null;
  lastExtractedTextLength = 0;

  // Clear any active highlights or injected attributes
  if (typeof document !== 'undefined') {
    const highlights = document.querySelectorAll('[data-kty-trap]');
    highlights.forEach(el => el.removeAttribute('data-kty-trap'));
  }

  // Remove any active Closed Shadow DOM inline indicator badges
  removeAllIndicators();

  // Close BroadcastChannel to release event handlers and isolate frame.
  // Note: Nulling burnBroadcastChannel here is intentional to achieve true amnesia.
  // If the page remains open and the scanner is subsequently re-injected or rescanned,
  // the primary chrome.runtime.onMessage / chrome.tabs.sendMessage transport remains active
  // and covers any subsequent burn commands for that context.
  if (burnBroadcastChannel) {
    try {
      burnBroadcastChannel.close();
    } catch {
      // Non-fatal if channel already closed
    }
    burnBroadcastChannel = null;
  }
}

// Primary transport: Listen for explicit commands from popup or service worker
if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'KTY_REQUEST_PAGE_SCAN') {
      try {
        const result = executeScan();
        sendResponse({ success: true, data: result });
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        sendResponse({ success: false, error: errorMsg });
      }
      return true; // Keep message channel open for async response
    }

    if (message?.type === 'KTY_HARD_BURN_DOM') {
      handleHardBurnDOM();
      sendResponse({ success: true, message: 'DOM references and observer terminated' });
      return true;
    }
  });
}

// Secondary transport: BroadcastChannel coordinator for multi-context amnesia
if (typeof BroadcastChannel !== 'undefined') {
  try {
    burnBroadcastChannel = new BroadcastChannel('kty_hard_burn');
    burnBroadcastChannel.onmessage = (event) => {
      if (event?.data?.type === 'KTY_HARD_BURN_DOM') {
        handleHardBurnDOM();
      }
    };
  } catch {
    // Non-fatal if BroadcastChannel is restricted in current context
  }
}
