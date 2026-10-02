/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { hardBurnAllData, telemetry, recordScanMetrics } from '../src/telemetry/client';
import { OptionsApp } from '../src/options/OptionsApp';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('Dual-Broadcast Amnesia Coordinator & OptionsApp Sync (amnesia-coordinator.test.ts)', () => {
  let channelInstances: MockBroadcastChannel[] = [];
  let postedMessages: any[] = [];
  let originalBroadcastChannel: any;
  let mockStorage: Record<string, any>;
  let container: HTMLDivElement | null = null;
  let root: any = null;

  class MockBroadcastChannel {
    name: string;
    onmessage: ((event: MessageEvent) => void) | null = null;

    constructor(name: string) {
      this.name = name;
      channelInstances.push(this);
    }

    postMessage(message: any) {
      postedMessages.push(message);
      const event = { data: message } as MessageEvent;
      // Dispatch to all OTHER instances on the same channel
      for (const instance of [...channelInstances]) {
        if (instance !== this && instance.name === this.name) {
          if (instance.onmessage) {
            instance.onmessage(event);
          }
        }
      }
    }

    close() {
      const idx = channelInstances.indexOf(this);
      if (idx !== -1) {
        channelInstances.splice(idx, 1);
      }
    }
  }

  beforeEach(() => {
    channelInstances = [];
    postedMessages = [];
    mockStorage = {
      'site_settings:example.com': { autoScan: true },
      'user_display_preference': { theme: 'dark' },
    };

    telemetry.reset();

    originalBroadcastChannel = (globalThis as any).BroadcastChannel;
    (globalThis as any).BroadcastChannel = MockBroadcastChannel;

    (globalThis as any).chrome = {
      storage: {
        local: {
          get: vi.fn(async () => mockStorage),
          getBytesInUse: vi.fn(async () => JSON.stringify(mockStorage).length),
          clear: vi.fn(async () => {
            mockStorage = {};
          }),
        },
      },
      action: {
        setBadgeText: vi.fn(async () => {}),
      },
      tabs: {
        query: vi.fn(async () => [{ id: 101, url: 'https://example.com' }]),
        sendMessage: vi.fn(async () => {}),
      },
      runtime: {
        openOptionsPage: vi.fn(async () => {}),
        getURL: vi.fn((path: string) => `chrome-extension://mock-id/${path}`),
      },
    };
  });

  afterEach(() => {
    if (root && container) {
      act(() => {
        root.unmount();
      });
      container.remove();
      root = null;
      container = null;
    }
    (globalThis as any).BroadcastChannel = originalBroadcastChannel;
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('hardBurnAllData broadcasts KTY_HARD_BURN_DOM on kty_hard_burn channel alongside chrome APIs', async () => {
    let receivedEvent: any = null;
    const subscriber = new MockBroadcastChannel('kty_hard_burn');
    subscriber.onmessage = (event) => {
      receivedEvent = event.data;
    };

    recordScanMetrics({ critical: 2, warning: 1, info: 0 }, 50);
    expect(telemetry.getBufferedSpans().length).toBe(1);

    await hardBurnAllData();

    expect(postedMessages).toEqual([{ type: 'KTY_HARD_BURN_DOM' }]);
    expect(receivedEvent).toEqual({ type: 'KTY_HARD_BURN_DOM' });
    expect(chrome.storage.local.clear).toHaveBeenCalled();
    expect(telemetry.getBufferedSpans().length).toBe(0);
  });

  it('notifies multiple subscribers simultaneously across contexts', async () => {
    const sub1Events: any[] = [];
    const sub2Events: any[] = [];
    const sub3Events: any[] = [];

    const sub1 = new MockBroadcastChannel('kty_hard_burn');
    sub1.onmessage = (e) => sub1Events.push(e.data);

    const sub2 = new MockBroadcastChannel('kty_hard_burn');
    sub2.onmessage = (e) => sub2Events.push(e.data);

    const sub3 = new MockBroadcastChannel('kty_hard_burn');
    sub3.onmessage = (e) => sub3Events.push(e.data);

    await hardBurnAllData();

    expect(sub1Events).toEqual([{ type: 'KTY_HARD_BURN_DOM' }]);
    expect(sub2Events).toEqual([{ type: 'KTY_HARD_BURN_DOM' }]);
    expect(sub3Events).toEqual([{ type: 'KTY_HARD_BURN_DOM' }]);
  });

  it('unsubscribes / closes channel cleanly without memory leaks or stale delivery', async () => {
    const sub1Events: any[] = [];
    const sub1 = new MockBroadcastChannel('kty_hard_burn');
    sub1.onmessage = (e) => sub1Events.push(e.data);

    sub1.close();

    await hardBurnAllData();

    expect(sub1Events.length).toBe(0);
  });

  it('OptionsApp subscribes to kty_hard_burn and reactively triggers burned confirmation on external burn', async () => {
    vi.useFakeTimers();

    container = document.createElement('div');
    document.body.appendChild(container);

    await act(async () => {
      root = createRoot(container!);
      root.render(React.createElement(OptionsApp));
    });

    // Verify initial button text
    expect(container.textContent).toContain('BURN ALL DATA ACROSS ALL DOMAINS');

    // Simulate an external hard burn from another tab / popup
    const externalSender = new MockBroadcastChannel('kty_hard_burn');
    await act(async () => {
      externalSender.postMessage({ type: 'KTY_HARD_BURN_DOM' });
    });

    // OptionsApp should reactively display the incinerated state
    expect(container.textContent).toContain('ALL DATA INCINERATED ACROSS ALL DOMAINS');

    // Fast forward 4 seconds (timeout for resetting burned flag)
    await act(async () => {
      vi.advanceTimersByTime(4000);
    });

    expect(container.textContent).toContain('BURN ALL DATA ACROSS ALL DOMAINS');
    expect(container.textContent).not.toContain('ALL DATA INCINERATED ACROSS ALL DOMAINS');
  });

  it('OptionsApp cleanly unmounts and closes its BroadcastChannel handle', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);

    await act(async () => {
      root = createRoot(container!);
      root.render(React.createElement(OptionsApp));
    });

    const activeChannelsBeforeUnmount = channelInstances.length;
    expect(activeChannelsBeforeUnmount).toBeGreaterThan(0);

    await act(async () => {
      root.unmount();
    });
    root = null;

    expect(channelInstances.length).toBe(activeChannelsBeforeUnmount - 1);
  });

  it('gracefully degrades when BroadcastChannel is undefined in execution context', async () => {
    delete (globalThis as any).BroadcastChannel;

    // hardBurnAllData should not throw
    await expect(hardBurnAllData()).resolves.not.toThrow();

    // OptionsApp should mount without error
    container = document.createElement('div');
    document.body.appendChild(container);

    await act(async () => {
      root = createRoot(container!);
      root.render(React.createElement(OptionsApp));
    });

    expect(container.textContent).toContain('BURN ALL DATA ACROSS ALL DOMAINS');
  });
});
