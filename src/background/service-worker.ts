import { hardBurnAllData } from '../telemetry/client';

chrome.runtime.onInstalled.addListener(async () => {
  // Set initial default badges
  await chrome.action.setBadgeText({ text: '' });
  await chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
});

// Coordinate background notifications and badge counters
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'KTY_SCAN_COMPLETED') {
    (async () => {
      const summary = message.summary || { critical: 0, warning: 0 };
      if (summary.critical > 0) {
        await chrome.action.setBadgeText({ text: String(summary.critical) });
        await chrome.action.setBadgeBackgroundColor({ color: '#ef4444' }); // Red
      } else if (summary.warning > 0) {
        await chrome.action.setBadgeText({ text: String(summary.warning) });
        await chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' }); // Amber
      } else {
        await chrome.action.setBadgeText({ text: 'OK' });
        await chrome.action.setBadgeBackgroundColor({ color: '#10b981' }); // Green
      }
      sendResponse({ status: 'badge_updated' });
    })();
    return true; // Keep channel open
  }

  if (message?.type === 'KTY_TRIGGER_HARD_BURN') {
    (async () => {
      await hardBurnAllData();
      sendResponse({ status: 'burned', success: true });
    })();
    return true; // Keep channel open
  }
});
