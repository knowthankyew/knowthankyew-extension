import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  updateBadgeForScan,
  handleTabNavigation,
  handleTabUpdated,
  handleTabReplaced,
  handleRuntimeMessage,
} from '../src/background/service-worker';

describe('Background Service Worker Badge Scoping & Navigation Lifecycle (service-worker-badge.test.ts)', () => {
  beforeEach(() => {
    (globalThis as any).chrome = {
      action: {
        setBadgeText: vi.fn(async () => {}),
        setBadgeBackgroundColor: vi.fn(async () => {}),
      },
      tabs: {
        onUpdated: {
          addListener: vi.fn(),
        },
        onReplaced: {
          addListener: vi.fn(),
        },
        query: vi.fn(async () => []),
        sendMessage: vi.fn(async () => {}),
      },
      runtime: {
        onInstalled: {
          addListener: vi.fn(),
        },
        onMessage: {
          addListener: vi.fn(),
        },
      },
      storage: {
        local: {
          clear: vi.fn(async () => {}),
        },
      },
    };
  });

  it('scopes critical issue badge and red background color strictly to target tabId', async () => {
    await updateBadgeForScan({ critical: 3, warning: 1 }, 101);

    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '3', tabId: 101 });
    expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#ef4444', tabId: 101 });
  });

  it('scopes warning issue badge and amber background color to target tabId when no critical findings', async () => {
    await updateBadgeForScan({ critical: 0, warning: 2 }, 202);

    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '2', tabId: 202 });
    expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#f59e0b', tabId: 202 });
  });

  it('clears badge on target tabId when scan has 0 findings to prevent false reassurance', async () => {
    await updateBadgeForScan({ critical: 0, warning: 0 }, 303);

    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '', tabId: 303 });
    expect(chrome.action.setBadgeBackgroundColor).not.toHaveBeenCalled();
  });

  it('falls back to global badge if target tabId is undefined', async () => {
    await updateBadgeForScan({ critical: 1, warning: 0 });

    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '1' });
    expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#ef4444' });
  });

  it('handleTabNavigation immediately resets badge for the specified tab', async () => {
    await handleTabNavigation(404);

    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '', tabId: 404 });
  });

  it('handleTabNavigation handles closed or restricted tab errors gracefully without rejections', async () => {
    (chrome.action.setBadgeText as any).mockRejectedValueOnce(new Error('No tab with id: 999'));

    await expect(handleTabNavigation(999)).resolves.not.toThrow();
  });

  it('handleTabUpdated clears badge on loading status or URL change', () => {
    // 1. When status is loading
    handleTabUpdated(101, { status: 'loading' });
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '', tabId: 101 });

    vi.clearAllMocks();

    // 2. When url changes
    handleTabUpdated(102, { url: 'https://wikipedia.org' });
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '', tabId: 102 });

    vi.clearAllMocks();

    // 3. When unrelated properties change (e.g. pinned), does NOT clear badge
    handleTabUpdated(103, { pinned: true });
    expect(chrome.action.setBadgeText).not.toHaveBeenCalled();
  });

  it('handleTabReplaced clears badge for the replacement tab', () => {
    handleTabReplaced(505);
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '', tabId: 505 });
  });

  it('handleRuntimeMessage processes KTY_SCAN_COMPLETED with sender tab ID', async () => {
    const sendResponse = vi.fn();
    const handled = handleRuntimeMessage(
      { type: 'KTY_SCAN_COMPLETED', summary: { critical: 2, warning: 0 } },
      { tab: { id: 707 } },
      sendResponse
    );

    expect(handled).toBe(true);
    // Allow async execution
    await new Promise((r) => setTimeout(r, 10));
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '2', tabId: 707 });
    expect(sendResponse).toHaveBeenCalledWith({ status: 'badge_updated' });
  });

  it('ensures findings on Tab 101 do not bleed into or affect Tab 102', async () => {
    // Tab 101 has 3 critical traps
    await updateBadgeForScan({ critical: 3, warning: 0 }, 101);
    // Tab 102 has 0 findings
    await updateBadgeForScan({ critical: 0, warning: 0 }, 102);

    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '3', tabId: 101 });
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '', tabId: 102 });

    // Navigating Tab 101 clears Tab 101's badge only
    vi.clearAllMocks();
    await handleTabNavigation(101);
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '', tabId: 101 });
    expect(chrome.action.setBadgeText).not.toHaveBeenCalledWith({ text: '', tabId: 102 });
  });
});
