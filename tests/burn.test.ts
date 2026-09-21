import { describe, it, expect, beforeEach, vi } from 'vitest';
import { telemetry, recordScanMetrics, hardBurnAllData } from '../src/telemetry/client';

describe('Pillar 5: Amnesiac Hard Burn Invariant (burn.test.ts)', () => {
  let mockStorage: Record<string, any>;
  let badgeText: string;
  let tabMessages: Array<{ tabId: number; message: any }>;

  beforeEach(() => {
    mockStorage = {
      'kty_findings_cache': { sample: 'data' },
      'kty_user_settings': { autoScan: true }
    };
    badgeText = '3';
    tabMessages = [];

    // Reset telemetry instance
    telemetry.reset();

    // Mock Chrome WebExtensions API environment
    (globalThis as any).chrome = {
      storage: {
        local: {
          get: vi.fn(async () => mockStorage),
          set: vi.fn(async (items) => Object.assign(mockStorage, items)),
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
        query: vi.fn(async () => [{ id: 101, active: true }]),
        sendMessage: vi.fn(async (id, msg) => {
          tabMessages.push({ tabId: id, message: msg });
        }),
      },
    };
  });

  it('populates telemetry, storage, and badge prior to burn', () => {
    recordScanMetrics({ critical: 2, warning: 1, info: 0 }, 88);
    expect(telemetry.getBufferedSpans().length).toBe(1);
    expect(telemetry.getAuditLog().length).toBe(1);
    expect(Object.keys(mockStorage).length).toBe(2);
    expect(badgeText).toBe('3');
  });

  it('hard burn atomically purges in-memory spans, clears audit logs, wipes chrome.storage, and resets badges', async () => {
    recordScanMetrics({ critical: 2, warning: 1, info: 0 }, 88);

    await hardBurnAllData();

    // 1. In-memory spans and audit logs purged
    expect(telemetry.getBufferedSpans().length).toBe(0);
    expect(telemetry.getAuditLog().length).toBe(0);

    const report = telemetry.getPrivacyAuditReport();
    expect(report.activeSpanCount).toBe(0);
    expect(report.sessionAuditCount).toBe(0);

    // 2. Storage flushed
    expect(chrome.storage.local.clear).toHaveBeenCalled();
    expect(Object.keys(mockStorage).length).toBe(0);

    // 3. Action badge cleared
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
    expect(badgeText).toBe('');

    // 4. Content script notified to tear down DOM overlays
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(101, { type: 'KTY_HARD_BURN_DOM' });
    expect(tabMessages.length).toBe(1);
  });

  it('tombstones telemetry instance after hard burn, dropping all subsequent data recording attempts', async () => {
    await hardBurnAllData();

    // Any subsequent recording fails closed into noop
    const span = telemetry.startSpan('extension.forbidden_scan', { 'extension.action': 'scan_completed' });
    expect(span.spanId).toBe('noop');
    span.end('OK');

    telemetry.recordAuditEvent('audit_performed', 'Illegal post-burn audit');

    // Verification that zero data was retained
    expect(telemetry.getBufferedSpans().length).toBe(0);
    expect(telemetry.getAuditLog().length).toBe(0);
  });

  it('broadcasts KTY_HARD_BURN_DOM to all open tabs and tolerates non-fatal tab rejections', async () => {
    (globalThis as any).chrome.tabs.query = vi.fn(async () => [
      { id: 101 },
      { id: 102 },
      { id: undefined },
      { id: 103 },
    ]);
    (globalThis as any).chrome.tabs.sendMessage = vi.fn(async (id: number) => {
      if (id === 102) {
        throw new Error('No receiver in tab 102');
      }
      tabMessages.push({ tabId: id, message: { type: 'KTY_HARD_BURN_DOM' } });
    });

    await expect(hardBurnAllData()).resolves.not.toThrow();
    expect((globalThis as any).chrome.tabs.sendMessage).toHaveBeenCalledWith(101, { type: 'KTY_HARD_BURN_DOM' });
    expect((globalThis as any).chrome.tabs.sendMessage).toHaveBeenCalledWith(102, { type: 'KTY_HARD_BURN_DOM' });
    expect((globalThis as any).chrome.tabs.sendMessage).toHaveBeenCalledWith(103, { type: 'KTY_HARD_BURN_DOM' });
    expect(tabMessages.map(t => t.tabId)).toEqual([101, 103]);
  });

  it('handles gracefully when chrome API or tabs are missing/disconnected during burn', async () => {
    (globalThis as any).chrome = {
      storage: {
        local: {
          clear: vi.fn(async () => {}),
        },
      },
      action: {
        setBadgeText: vi.fn(async () => {}),
      },
      tabs: {
        query: vi.fn(async () => {
          throw new Error('Tab connection failed');
        }),
      },
    };

    // Should complete cleanly without throwing unhandled exceptions
    await expect(hardBurnAllData()).resolves.not.toThrow();
    expect(telemetry.getBufferedSpans().length).toBe(0);
  });
});
