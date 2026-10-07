import { hardBurnAllData } from '../telemetry/client';

export async function updateBadgeForScan(
  summary: { critical?: number; warning?: number } | undefined,
  targetTabId?: number
): Promise<void> {
  const critical = summary?.critical ?? 0;
  const warning = summary?.warning ?? 0;

  if (targetTabId != null) {
    if (critical > 0) {
      await chrome.action.setBadgeText({ text: String(critical), tabId: targetTabId });
      await chrome.action.setBadgeBackgroundColor({ color: '#ef4444', tabId: targetTabId }); // Red
    } else if (warning > 0) {
      await chrome.action.setBadgeText({ text: String(warning), tabId: targetTabId });
      await chrome.action.setBadgeBackgroundColor({ color: '#f59e0b', tabId: targetTabId }); // Amber
    } else {
      // Zero findings does NOT imply page is legally safe or trap-free.
      // Clear badge to prevent deceptive false reassurance.
      await chrome.action.setBadgeText({ text: '', tabId: targetTabId });
    }
  } else {
    // Fallback if message has no associated tab (e.g. test harness)
    if (critical > 0) {
      await chrome.action.setBadgeText({ text: String(critical) });
      await chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
    } else if (warning > 0) {
      await chrome.action.setBadgeText({ text: String(warning) });
      await chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' });
    } else {
      await chrome.action.setBadgeText({ text: '' });
    }
  }
}

export async function handleTabNavigation(tabId: number): Promise<void> {
  // Clear any existing badge when a tab navigates to a new page or domain,
  // preventing previous domain findings from persisting across navigations.
  try {
    if (typeof chrome !== 'undefined' && chrome.action?.setBadgeText) {
      await chrome.action.setBadgeText({ text: '', tabId });
    }
  } catch {
    // Tab may be closed or restricted
  }
}

export function handleTabUpdated(
  tabId: number,
  changeInfo: { status?: string; url?: string; [key: string]: any }
): void {
  if (changeInfo.status === 'loading' || changeInfo.url) {
    handleTabNavigation(tabId);
  }
}

export function handleTabReplaced(addedTabId: number): void {
  handleTabNavigation(addedTabId);
}

export function handleRuntimeMessage(
  message: any,
  sender: any,
  sendResponse: (res: any) => void
): boolean | void {
  if (message?.type === 'KTY_SCAN_COMPLETED') {
    const targetTabId = sender?.tab?.id ?? message?.tabId;
    (async () => {
      await updateBadgeForScan(message.summary, targetTabId);
      sendResponse({ status: 'badge_updated' });
    })();
    return true; // Keep channel open
  }

  if (message?.type === 'KTY_TRIGGER_HARD_BURN') {
    (async () => {
      try {
        await hardBurnAllData();
        sendResponse({ status: 'burned', success: true });
      } catch (err) {
        sendResponse({ status: 'error', success: false, error: String(err) });
      }
    })();
    return true; // Keep channel open
  }
}

// Set initial default badges on install
if (typeof chrome !== 'undefined' && chrome.runtime?.onInstalled) {
  chrome.runtime.onInstalled.addListener(async () => {
    await chrome.action.setBadgeText({ text: '' });
    await chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
  });
}

// Reset badge on navigation or reload to prevent findings from prior domains leaking
if (typeof chrome !== 'undefined' && chrome.tabs?.onUpdated) {
  chrome.tabs.onUpdated.addListener(handleTabUpdated);
}

// Reset badge on tab replacement (prerendering / session restore)
if (typeof chrome !== 'undefined' && chrome.tabs?.onReplaced) {
  chrome.tabs.onReplaced.addListener(handleTabReplaced);
}

// Coordinate background notifications and badge counters
if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener(handleRuntimeMessage);
}
