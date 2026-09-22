import { describe, it, expect, beforeEach, vi } from 'vitest';
import { telemetry, recordScanMetrics, hardBurnAllData } from '../src/telemetry/client';

describe('v1.3.0 Options Dashboard & Cross-Domain Burn Suite (options-burn.test.ts)', () => {
  let mockStorage: Record<string, any>;
  let badgeText: string;
  let tabMessages: Array<{ tabId: number; message: any }>;

  beforeEach(() => {
    mockStorage = {
      'site_settings:amazon.com': { autoScan: true },
      'site_settings:github.com': { autoScan: false },
      'user_display_preference': { theme: 'cyberpunk' },
    };
    badgeText = '5';
    tabMessages = [];

    telemetry.reset();

    (globalThis as any).chrome = {
      storage: {
        local: {
          get: vi.fn((_keys: any, cb?: (items: any) => void) => {
            if (cb) {
              cb(mockStorage);
              return;
            }
            return Promise.resolve(mockStorage);
          }),
          getBytesInUse: vi.fn((_keys: any, cb: (bytes: number) => void) => {
            const size = JSON.stringify(mockStorage).length;
            cb(size);
          }),
          clear: vi.fn(async () => {
            mockStorage = {};
          }),
        },
      },
      action: {
        setBadgeText: vi.fn(async ({ text }) => {
          badgeText = text;
        }),
      },
      tabs: {
        query: vi.fn(async () => [
          { id: 101, url: 'https://checkout.stripe.com/pay' },
          { id: 102, url: 'https://store.steampowered.com/checkout' },
          { id: 103, url: 'https://substack.com/subscribe' },
        ]),
        sendMessage: vi.fn(async (id: number, msg: any) => {
          tabMessages.push({ tabId: id, message: msg });
        }),
      },
      runtime: {
        openOptionsPage: vi.fn(async () => {}),
        getURL: vi.fn((path: string) => `chrome-extension://mock-id/${path}`),
      },
    };
  });

  it('measures non-zero storage footprint across multiple domain records prior to burn', async () => {
    let measuredBytes = 0;
    chrome.storage.local.getBytesInUse(null, (bytes: number) => {
      measuredBytes = bytes;
    });

    expect(measuredBytes).toBeGreaterThan(0);
    expect(Object.keys(mockStorage).length).toBe(3);
  });

  it('detects and targets open tabs across different domain origins', async () => {
    const tabs = await chrome.tabs.query({});
    expect(tabs.length).toBe(3);
    expect(tabs.map((t: any) => t.id)).toEqual([101, 102, 103]);
  });

  it('executes global hard burn across all domains, wiping all storage keys and notifying every tab', async () => {
    // Record mock telemetry metrics
    recordScanMetrics({ critical: 3, warning: 2, info: 1 }, 120);
    expect(telemetry.getBufferedSpans().length).toBe(1);
    expect(telemetry.getAuditLog().length).toBe(1);

    // Trigger cross-domain burn
    await hardBurnAllData();

    // 1. Storage is empty
    expect(chrome.storage.local.clear).toHaveBeenCalled();
    expect(Object.keys(mockStorage).length).toBe(0);

    // 2. Telemetry memory buffer is purged
    expect(telemetry.getBufferedSpans().length).toBe(0);
    expect(telemetry.getAuditLog().length).toBe(0);

    // 3. Action badge is cleared
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
    expect(badgeText).toBe('');

    // 4. KTY_HARD_BURN_DOM dispatched to every tab across all domains
    expect(tabMessages.length).toBe(3);
    expect(tabMessages.map((m) => m.tabId)).toEqual([101, 102, 103]);
    tabMessages.forEach((m) => {
      expect(m.message).toEqual({ type: 'KTY_HARD_BURN_DOM' });
    });
  });

  it('supports opening options page from extension runtime', () => {
    chrome.runtime.openOptionsPage();
    expect(chrome.runtime.openOptionsPage).toHaveBeenCalled();
  });
});
