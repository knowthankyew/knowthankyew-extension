import { extractPageLegalText } from './dom-extractor';
import { scanDocumentText } from '../core/engine';
import { PageScanResult } from '../core/types';

let cachedScanResult: PageScanResult | null = null;
let lastExtractedTextLength = 0;
let mutationObserver: MutationObserver | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let scanCountInWindow = 0;
let windowResetTimer: ReturnType<typeof setTimeout> | null = null;

const MAX_AUTO_SCANS_PER_MINUTE = 15;
const DEBOUNCE_DELAY_MS = 400;
const TEXT_DELTA_THRESHOLD = 25;

/**
 * Executes a full scan of the active document's legal text.
 * Caches the result and broadcasts the summary to the background service worker.
 */
export function executeScan(): PageScanResult {
  const text = extractPageLegalText();
  const hostname = (typeof window !== 'undefined' && window.location?.hostname) || 'current-page';
  const result: PageScanResult = scanDocumentText(text, hostname);
  cachedScanResult = result;
  lastExtractedTextLength = text.length;

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
      if (scanCountInWindow >= MAX_AUTO_SCANS_PER_MINUTE) {
        return; // Throttled to prevent CPU runaway on chaotic dynamic pages
      }

      const currentText = extractPageLegalText();
      const lengthDelta = Math.abs(currentText.length - lastExtractedTextLength);

      if (lengthDelta >= TEXT_DELTA_THRESHOLD) {
        scanCountInWindow++;
        if (!windowResetTimer) {
          windowResetTimer = setTimeout(() => {
            scanCountInWindow = 0;
            windowResetTimer = null;
          }, 60000);
        }
        executeScan();
      }
    }, DEBOUNCE_DELAY_MS);
  });

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

/**
 * Ceases DOM observation and clears all debounced timers.
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
  if (windowResetTimer) {
    clearTimeout(windowResetTimer);
    windowResetTimer = null;
  }
}

// Auto-start observer if document is ready in browser context
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

// Listen for explicit commands from popup or service worker
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
      // Disconnect observer and cease all monitoring
      stopDynamicObserver();
      cachedScanResult = null;
      lastExtractedTextLength = 0;

      // Clear any active highlights or injected attributes
      const highlights = document.querySelectorAll('[data-kty-trap]');
      highlights.forEach(el => el.removeAttribute('data-kty-trap'));
      sendResponse({ success: true, message: 'DOM references and observer terminated' });
      return true;
    }
  });
}
