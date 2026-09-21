import { extractPageLegalText } from './dom-extractor';
import { scanDocumentText } from '../core/engine';
import { PageScanResult } from '../core/types';

// Listen for explicit commands from popup or service worker
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'KTY_REQUEST_PAGE_SCAN') {
    (async () => {
      try {
        const text = extractPageLegalText();
        const hostname = window.location.hostname || 'current-page';
        const result: PageScanResult = scanDocumentText(text, hostname);

        // Notify background service worker to update action badge if traps are found
        chrome.runtime.sendMessage({
          type: 'KTY_SCAN_COMPLETED',
          domain: hostname,
          summary: result.summary,
          riskScore: result.riskScore,
        }).catch(() => {});

        sendResponse({ success: true, data: result });
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        sendResponse({ success: false, error: errorMsg });
      }
    })();
    return true; // Keep message channel open for async response
  }

  if (message?.type === 'KTY_HARD_BURN_DOM') {
    // Clear any active highlights or injected attributes
    const highlights = document.querySelectorAll('[data-kty-trap]');
    highlights.forEach(el => el.removeAttribute('data-kty-trap'));
    sendResponse({ success: true, message: 'DOM references dereferenced' });
    return true;
  }
});
