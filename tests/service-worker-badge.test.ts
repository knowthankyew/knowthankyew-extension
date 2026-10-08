import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Background Service Worker Badge Scoping & Navigation Lifecycle (service-worker-badge.test.ts)', () => {
  let sw: typeof import('../src/background/service-worker');

  beforeEach(async () => {
    vi.resetModules();
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

    sw = await import('../src/background/service-worker');
  });

  it('registers all required lifecycle listeners on service worker startup and exercises callbacks', async () => {
    expect(chrome.runtime.onInstalled.addListener).toHaveBeenCalledTimes(1);
    expect(chrome.tabs.onUpdated.addListener).toHaveBeenCalledTimes(1);
    expect(chrome.tabs.onReplaced.addListener).toHaveBeenCalledTimes(1);
    expect(chrome.runtime.onMessage.addListener).toHaveBeenCalledTimes(1);

    const onInstalledCallback = (chrome.runtime.onInstalled.addListener as any).mock.calls[0][0];
    const onUpdatedCallback = (chrome.tabs.onUpdated.addListener as any).mock.calls[0][0];
    const onReplacedCallback = (chrome.tabs.onReplaced.addListener as any).mock.calls[0][0];
    const onMessageCallback = (chrome.runtime.onMessage.addListener as any).mock.calls[0][0];

    // 1. Exercise onInstalled listener
    await onInstalledCallback();
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
    expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#ef4444' });

    vi.mocked(chrome.action.setBadgeText).mockClear();

    // 2. Exercise onUpdated listener
    onUpdatedCallback(101, { status: 'loading' });
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '', tabId: 101 });

    vi.mocked(chrome.action.setBadgeText).mockClear();

    // 3. Exercise onReplaced listener
    onReplacedCallback(505);
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '', tabId: 505 });

    vi.mocked(chrome.action.setBadgeText).mockClear();

    // 4. Exercise onMessage listener
    const sendResponse = vi.fn();
    const handled = onMessageCallback(
      { type: 'KTY_SCAN_COMPLETED', summary: { critical: 2, warning: 0 } },
      { tab: { id: 707 } },
      sendResponse
    );
    expect(handled).toBe(true);
    await new Promise((r) => setTimeout(r, 10));
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '2', tabId: 707 });
    expect(sendResponse).toHaveBeenCalledWith({ status: 'badge_updated' });
  });

  it('scopes critical issue badge and red background color strictly to target tabId', async () => {
    await sw.updateBadgeForScan({ critical: 3, warning: 1 }, 101);

    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '3', tabId: 101 });
    expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#ef4444', tabId: 101 });
  });

  it('scopes warning issue badge and amber background color to target tabId when no critical findings', async () => {
    await sw.updateBadgeForScan({ critical: 0, warning: 2 }, 202);

    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '2', tabId: 202 });
    expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#f59e0b', tabId: 202 });
  });

  it('clears badge on target tabId when scan has 0 findings to prevent false reassurance', async () => {
    await sw.updateBadgeForScan({ critical: 0, warning: 0 }, 303);

    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '', tabId: 303 });
    expect(chrome.action.setBadgeBackgroundColor).not.toHaveBeenCalled();
  });

  it('does not set a global badge if target tabId is undefined (strict tab scoping)', async () => {
    await sw.updateBadgeForScan({ critical: 1, warning: 0 });

    expect(chrome.action.setBadgeText).not.toHaveBeenCalled();
    expect(chrome.action.setBadgeBackgroundColor).not.toHaveBeenCalled();
  });

  it('handleTabNavigation immediately resets badge for the specified tab', async () => {
    await sw.handleTabNavigation(404);

    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '', tabId: 404 });
  });

  it('handleTabNavigation handles closed or restricted tab errors gracefully without rejections', async () => {
    (chrome.action.setBadgeText as any).mockRejectedValueOnce(new Error('No tab with id: 999'));

    await expect(sw.handleTabNavigation(999)).resolves.not.toThrow();
  });

  it('handleTabUpdated clears badge on loading status or URL change', () => {
    // 1. When status is loading
    sw.handleTabUpdated(101, { status: 'loading' });
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '', tabId: 101 });

    vi.clearAllMocks();

    // 2. When url changes
    sw.handleTabUpdated(102, { url: 'https://wikipedia.org' });
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '', tabId: 102 });

    vi.clearAllMocks();

    // 3. When unrelated properties change (e.g. pinned), does NOT clear badge
    sw.handleTabUpdated(103, { pinned: true });
    expect(chrome.action.setBadgeText).not.toHaveBeenCalled();
  });

  it('handleTabReplaced clears badge for the replacement tab', () => {
    sw.handleTabReplaced(505);
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '', tabId: 505 });
  });

  it('handleRuntimeMessage processes KTY_SCAN_COMPLETED with sender tab ID', async () => {
    const sendResponse = vi.fn();
    const handled = sw.handleRuntimeMessage(
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

  it('handleRuntimeMessage processes KTY_TRIGGER_HARD_BURN and executes hardBurnAllData', async () => {
    const sendResponse = vi.fn();
    const handled = sw.handleRuntimeMessage(
      { type: 'KTY_TRIGGER_HARD_BURN' },
      {},
      sendResponse
    );

    expect(handled).toBe(true);
    await new Promise((r) => setTimeout(r, 10));
    expect(sendResponse).toHaveBeenCalledWith({ status: 'burned', success: true });
    expect(chrome.storage.local.clear).toHaveBeenCalled();
  });

  it('ensures findings on Tab 101 do not bleed into or affect Tab 102', async () => {
    // Tab 101 has 3 critical traps
    await sw.updateBadgeForScan({ critical: 3, warning: 0 }, 101);
    // Tab 102 has 0 findings
    await sw.updateBadgeForScan({ critical: 0, warning: 0 }, 102);

    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '3', tabId: 101 });
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '', tabId: 102 });

    // Navigating Tab 101 clears Tab 101's badge only
    vi.clearAllMocks();
    await sw.handleTabNavigation(101);
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '', tabId: 101 });
    expect(chrome.action.setBadgeText).not.toHaveBeenCalledWith({ text: '', tabId: 102 });
  });
});
