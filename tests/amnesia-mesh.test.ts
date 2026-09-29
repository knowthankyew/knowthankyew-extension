import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  broadcastAmnesiaMeshBurn,
  subscribeAmnesiaMesh,
  closeAmnesiaMesh,
  AMNESIA_MESH_CHANNEL,
} from '../src/telemetry/amnesia-mesh';
import { hardBurnAllData, telemetry } from '../src/telemetry/client';

describe('v2.0 Phase 2.1: Distributed Amnesia Mesh Coordinator (amnesia-mesh.test.ts)', () => {
  let listeners: Array<(event: MessageEvent) => void> = [];
  let postedMessages: any[] = [];
  let originalBroadcastChannel: any;

  beforeEach(() => {
    listeners = [];
    postedMessages = [];
    telemetry.reset();

    // Mock BroadcastChannel implementation
    class MockBroadcastChannel {
      name: string;
      constructor(name: string) {
        this.name = name;
      }
      postMessage(message: any) {
        postedMessages.push(message);
        // Synchronously notify mock listeners for testing
        const event = { data: message } as MessageEvent;
        listeners.forEach(fn => fn(event));
      }
      addEventListener(type: string, listener: any) {
        if (type === 'message') {
          listeners.push(listener);
        }
      }
      removeEventListener(type: string, listener: any) {
        if (type === 'message') {
          listeners = listeners.filter(l => l !== listener);
        }
      }
      close() {
        listeners = [];
      }
    }

    originalBroadcastChannel = (globalThis as any).BroadcastChannel;
    (globalThis as any).BroadcastChannel = MockBroadcastChannel;
    closeAmnesiaMesh();

    // Mock chrome environment
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
        query: vi.fn(async () => []),
      },
    };
  });

  afterEach(() => {
    closeAmnesiaMesh();
    (globalThis as any).BroadcastChannel = originalBroadcastChannel;
  });

  it('broadcasts an atomic KTY_MESH_HARD_BURN event across channel', () => {
    expect(AMNESIA_MESH_CHANNEL).toBe('kty_amnesia_mesh');
    const onBurnSpy = vi.fn();
    const unsubscribe = subscribeAmnesiaMesh(onBurnSpy);

    broadcastAmnesiaMeshBurn();

    expect(postedMessages.length).toBe(1);
    expect(postedMessages[0].type).toBe('KTY_MESH_HARD_BURN');
    expect(typeof postedMessages[0].timestamp).toBe('number');
    expect(onBurnSpy).toHaveBeenCalledTimes(1);

    unsubscribe();
  });

  it('notifies multiple subscribers simultaneously across contexts', () => {
    const sub1 = vi.fn();
    const sub2 = vi.fn();
    const sub3 = vi.fn();

    const unsub1 = subscribeAmnesiaMesh(sub1);
    const unsub2 = subscribeAmnesiaMesh(sub2);
    const unsub3 = subscribeAmnesiaMesh(sub3);

    broadcastAmnesiaMeshBurn();

    expect(sub1).toHaveBeenCalledTimes(1);
    expect(sub2).toHaveBeenCalledTimes(1);
    expect(sub3).toHaveBeenCalledTimes(1);

    unsub1();
    unsub2();
    unsub3();
  });

  it('unsubscribes listeners cleanly without memory leaks', () => {
    const onBurnSpy = vi.fn();
    const unsubscribe = subscribeAmnesiaMesh(onBurnSpy);

    unsubscribe();
    broadcastAmnesiaMeshBurn();

    expect(onBurnSpy).not.toHaveBeenCalled();
  });

  it('hardBurnAllData dispatches amnesia mesh signal alongside chrome APIs', async () => {
    const onBurnSpy = vi.fn();
    const unsubscribe = subscribeAmnesiaMesh(onBurnSpy);

    await hardBurnAllData();

    expect(postedMessages.length).toBe(1);
    expect(postedMessages[0].type).toBe('KTY_MESH_HARD_BURN');
    expect(onBurnSpy).toHaveBeenCalledTimes(1);
    expect(chrome.storage.local.clear).toHaveBeenCalled();

    unsubscribe();
  });

  it('gracefully degrades when BroadcastChannel is undefined in execution context', () => {
    closeAmnesiaMesh();
    delete (globalThis as any).BroadcastChannel;

    expect(() => {
      broadcastAmnesiaMeshBurn();
    }).not.toThrow();

    const onBurnSpy = vi.fn();
    const unsub = subscribeAmnesiaMesh(onBurnSpy);
    expect(typeof unsub).toBe('function');
    expect(() => unsub()).not.toThrow();
  });
});
