/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import {
  dispatchHandoffToDestination,
  readAndClearHandoffPayload,
  KTY_HANDOFF_SESSION_KEY,
} from '../src/popup/handoff-bridge';
import { buildHandoffPayload, encodeHandoffFragmentValue } from '../src/core/handoff';
import { PageScanResult, EvaluationMatch } from '../src/core/types';
import { TrapCard } from '../src/popup/components/TrapCard';
import { handleHardBurnDOM } from '../src/content/scanner';
import { hardBurnAllData } from '../src/telemetry/client';
import { App } from '../src/popup/App';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('Milestone 7 Phase 2 — Handoff Bridge, UI Actions & Amnesia Purge (tests/handoff-bridge.test.tsx)', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  const sampleMatch: EvaluationMatch = {
    ruleId: 'test-renewal-rule',
    title: 'Hidden Auto-Renewal Trap',
    category: 'AUTO_RENEWAL',
    classification: 'STATUTORY_VIOLATION',
    severity: 'CRITICAL',
    statute: {
      code: '15 U.S.C. § 8403 (ROSCA)',
      title: 'Restore Online Shoppers Confidence Act',
      jurisdiction: 'US Federal',
      plainExplanation: 'Recurring terms and cancellation mechanism must be clearly disclosed.',
    },
    explanation: 'Your subscription will renew automatically every month.',
    recommendation: 'Request instant cancellation receipt.',
    matchedSnippet: 'Recurring monthly billing of $19.99 applies until cancelled.',
  };

  const sampleScan: PageScanResult = {
    timestamp: '2026-10-04T12:00:00.000Z',
    urlDomain: 'sketchy-trial.com',
    scannedLength: 1200,
    riskScore: 70,
    summary: { critical: 1, warning: 0, info: 0 },
    limitationsNotice: 'Visible text only',
    matches: [sampleMatch],
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    sessionStorage.clear();
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
      root = null;
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    container = null;
    sessionStorage.clear();
    vi.restoreAllMocks();
    delete (globalThis as any).chrome;
  });

  // -------------------------------------------------------------
  // Test 1: dispatchHandoffToDestination with Chrome Extension APIs
  // -------------------------------------------------------------
  it('dispatches handoff via chrome.tabs.create and navigates to target GitHub Pages app with fragment handoff', async () => {
    const payload = buildHandoffPayload(sampleScan);
    const expectedUrl = `https://knowthankyew.github.io/bill-of-rights-bot/?kty_handoff=1#kty_handoff=${encodeHandoffFragmentValue(payload)}`;
    const mockCreate = vi.fn().mockResolvedValue({ id: 101, url: expectedUrl });
    const mockExecuteScript = vi.fn().mockResolvedValue([{ result: undefined }]);

    (globalThis as any).chrome = {
      tabs: { create: mockCreate },
      scripting: { executeScript: mockExecuteScript },
    };

    const result = await dispatchHandoffToDestination(payload);

    expect(result.success).toBe(true);
    expect(result.url).toBe(expectedUrl);
    expect(mockCreate).toHaveBeenCalledWith({
      url: expectedUrl,
      active: true,
    });
    expect(mockExecuteScript).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------
  // Test 2: dispatchHandoffToDestination fallback for web/dev
  // -------------------------------------------------------------
  it('falls back to window.open when chrome.tabs is unavailable', async () => {
    delete (globalThis as any).chrome;
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    const payload = buildHandoffPayload(sampleScan);
    const expectedUrl = `https://knowthankyew.github.io/bill-of-rights-bot/?kty_handoff=1#kty_handoff=${encodeHandoffFragmentValue(payload)}`;
    const result = await dispatchHandoffToDestination(payload);

    expect(result.success).toBe(true);
    expect(result.url).toBe(expectedUrl);
    expect(windowOpenSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^https:\/\/knowthankyew\.github\.io\/bill-of-rights-bot\/\?kty_handoff=1#kty_handoff=[A-Za-z0-9_-]+$/),
      '_blank',
      'noopener,noreferrer'
    );

    // Ephemeral sessionStorage was cleared to prevent residual leakage
    expect(sessionStorage.getItem(KTY_HANDOFF_SESSION_KEY)).toBeNull();
  });

  it('injects payload via chrome.scripting.executeScript in dev mode', async () => {
    const payload = buildHandoffPayload(sampleScan);
    const expectedUrl = `http://localhost:3000?kty_handoff=1#kty_handoff=${encodeHandoffFragmentValue(payload)}`;
    const mockCreate = vi.fn().mockResolvedValue({ id: 101, url: expectedUrl });
    const mockExecuteScript = vi.fn().mockResolvedValue([{ result: true }]);

    (globalThis as any).chrome = {
      tabs: { create: mockCreate },
      scripting: { executeScript: mockExecuteScript },
    };

    const result = await dispatchHandoffToDestination(payload, true);

    expect(result.success).toBe(true);
    expect(result.url).toBe(expectedUrl);
    expect(mockExecuteScript).toHaveBeenCalledTimes(1);
    expect(mockExecuteScript).toHaveBeenCalledWith(expect.objectContaining({
      target: { tabId: 101 },
      args: [KTY_HANDOFF_SESSION_KEY, JSON.stringify(payload)],
    }));
  });

  it('returns success: false when chrome.scripting.executeScript fails to write payload', async () => {
    const mockCreate = vi.fn().mockResolvedValue({ id: 101, url: 'http://localhost:3000?kty_handoff=1' });
    const mockExecuteScript = vi.fn().mockResolvedValue([{ result: false }]);

    (globalThis as any).chrome = {
      tabs: { create: mockCreate },
      scripting: { executeScript: mockExecuteScript },
    };

    const payload = buildHandoffPayload(sampleScan);
    const result = await dispatchHandoffToDestination(payload, true);

    expect(result.success).toBe(false);
  });

  it('returns success: false when chrome.scripting.executeScript rejects', async () => {
    const mockCreate = vi.fn().mockResolvedValue({ id: 101, url: 'http://localhost:3000?kty_handoff=1' });
    const mockExecuteScript = vi.fn().mockRejectedValue(new Error('Script injection blocked'));

    (globalThis as any).chrome = {
      tabs: { create: mockCreate },
      scripting: { executeScript: mockExecuteScript },
    };

    const payload = buildHandoffPayload(sampleScan);
    const result = await dispatchHandoffToDestination(payload, true);

    expect(result.success).toBe(false);
  });

  it('rejects invalid payloads before dispatch and fails closed', async () => {
    const invalidPayload = { invalid: true } as any;
    const result = await dispatchHandoffToDestination(invalidPayload);
    expect(result.success).toBe(false);
    expect(result.url).toBe('');
  });

  // -------------------------------------------------------------
  // Test 3: readAndClearHandoffPayload
  // -------------------------------------------------------------
  it('reads and immediately purges handoff payload from sessionStorage', () => {
    const payload = buildHandoffPayload(sampleScan);
    sessionStorage.setItem(KTY_HANDOFF_SESSION_KEY, JSON.stringify(payload));

    const consumed = readAndClearHandoffPayload();
    expect(consumed).toBeDefined();
    expect(consumed?.domain).toBe('sketchy-trial.com');
    expect(consumed?.targetTool).toBe('bill-of-rights-bot');

    // Ephemeral key must now be completely zeroed
    expect(sessionStorage.getItem(KTY_HANDOFF_SESSION_KEY)).toBeNull();
  });

  // -------------------------------------------------------------
  // Test 4: TrapCard renders Defend Rights and triggers onHandoff
  // -------------------------------------------------------------
  it('renders Defend Rights button on TrapCard and triggers callback', () => {
    const onHandoffSpy = vi.fn();
    root = createRoot(container!);

    act(() => {
      root!.render(<TrapCard match={sampleMatch} onHandoff={onHandoffSpy} />);
    });

    const defendBtn = Array.from(container!.querySelectorAll('button')).find(
      b => b.textContent?.includes('Defend Rights →')
    );
    expect(defendBtn).toBeDefined();

    act(() => {
      defendBtn!.click();
    });

    expect(onHandoffSpy).toHaveBeenCalledWith(sampleMatch);
  });

  // -------------------------------------------------------------
  // Test 5: Amnesia purge in scanner and telemetry client
  // -------------------------------------------------------------
  it('instantly purges sessionStorage handoff payload on Nuclear Hard Burn', async () => {
    // 1. In content scanner
    sessionStorage.setItem(KTY_HANDOFF_SESSION_KEY, '{"version":"1.0"}');
    expect(sessionStorage.getItem(KTY_HANDOFF_SESSION_KEY)).toBeTruthy();
    handleHardBurnDOM();
    expect(sessionStorage.getItem(KTY_HANDOFF_SESSION_KEY)).toBeNull();

    // 2. In telemetry client hardBurnAllData
    sessionStorage.setItem(KTY_HANDOFF_SESSION_KEY, '{"version":"1.0"}');
    expect(sessionStorage.getItem(KTY_HANDOFF_SESSION_KEY)).toBeTruthy();
    await hardBurnAllData();
    expect(sessionStorage.getItem(KTY_HANDOFF_SESSION_KEY)).toBeNull();
  });

  // -------------------------------------------------------------
  // Test 6: App.tsx displays Take Action banner and executes handoff
  // -------------------------------------------------------------
  it('renders actionable Take Action banner in App.tsx and executes batch handoff', async () => {
    delete (globalThis as any).chrome;
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    root = createRoot(container!);
    await act(async () => {
      root!.render(<App />);
    });

    // Verify Action Banner is present
    expect(container!.textContent).toContain('Take Action: Dispute or Cancel');
    expect(container!.textContent).toContain('Bill of Rights Bot');

    const launchButton = Array.from(container!.querySelectorAll('button')).find(
      b => b.textContent?.includes('Launch Rights Advocate →')
    );
    expect(launchButton).toBeDefined();

    // Click Launch Rights Advocate
    await act(async () => {
      launchButton!.click();
    });

    expect(windowOpenSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^https:\/\/knowthankyew\.github\.io\/bill-of-rights-bot\/\?kty_handoff=1#kty_handoff=[A-Za-z0-9_-]+$/),
      '_blank',
      'noopener,noreferrer'
    );
    // Ephemeral payload is cleared post-dispatch to prevent residual storage leakage
    expect(sessionStorage.getItem(KTY_HANDOFF_SESSION_KEY)).toBeNull();
  });

  // -------------------------------------------------------------
  // Test 7: App.tsx renders Quick-Paste scratchpad for PDF tabs
  // -------------------------------------------------------------
  it('renders Quick-Paste Scratchpad on PDF tabs and audits pasted contract clauses without permissions', async () => {
    (globalThis as any).chrome = {
      tabs: {
        query: vi.fn().mockResolvedValue([{ id: 42, url: 'https://example.com/legal/agreement.pdf' }]),
        sendMessage: vi.fn((_tabId: number, _msg: any, callback: (res: any) => void) => {
          (chrome as any).runtime.lastError = { message: 'Cannot access chrome-native PDF viewer' };
          callback(null);
        }),
      },
      runtime: {
        lastError: { message: 'Cannot access chrome-native PDF viewer' },
        openOptionsPage: vi.fn(),
      },
      scripting: {
        executeScript: vi.fn().mockRejectedValue(new Error('Cannot script PDF viewer tab')),
      },
    };

    root = createRoot(container!);
    await act(async () => {
      root!.render(<App />);
    });

    // Verify PDF agreement card and scratchpad are rendered
    expect(container!.textContent).toContain('PDF Agreement Detected');
    expect(container!.textContent).toContain('Chromium Native PDF Viewer');

    const textarea = container!.querySelector('textarea');
    expect(textarea).not.toBeNull();
    expect(textarea!.getAttribute('placeholder')).toContain('Cmd+V');

    // Simulate pasting an agreement with automatic renewal
    const predatoryClause =
      'Your subscription will automatically renew each month indefinitely unless cancelled at least 48 hours prior to renewal.';

    await act(async () => {
      // Fire paste event
      const pasteEvent = new Event('paste', { bubbles: true, cancelable: true });
      (pasteEvent as any).clipboardData = {
        getData: (format: string) => (format === 'text' ? predatoryClause : ''),
      };
      textarea!.dispatchEvent(pasteEvent);
    });

    // Allow debounce / setTimeout
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    // Verification: PDF card transitioned to scan results
    expect(container!.textContent).toContain('Moderate Risk');
    expect(container!.textContent).toContain('Negative Option Automatic Renewal');
    expect(container!.textContent).toContain('Take Action: Dispute or Cancel');
  });
});

describe('Handoff Bridge Injection Contract — CodeRabbit R9', () => {
  let originalChrome: any;

  beforeEach(() => {
    originalChrome = (globalThis as any).chrome;
  });

  afterEach(() => {
    (globalThis as any).chrome = originalChrome;
    vi.restoreAllMocks();
  });

  it('injects sessionStorage handoff state AND dispatches KTY_HANDOFF_PAYLOAD postMessage for ARBITRATION and UNILATERAL_CHANGE paystub payloads', async () => {
    const { validateHandoffPayload } = await import('@knowthankyew/privacy-telemetry');
    const { resolveDestinationTool, buildHandoffPayload } = await import('../src/core/handoff');

    const runtimeListeners = new Set<
      (msg: any, sender: any, sendResponse: (res: any) => void) => boolean | void
    >();
    let capturedExec: any = null;
    let capturedInjectedResult: any = null;

    (globalThis as any).chrome = {
      tabs: {
        create: vi.fn().mockResolvedValue({ id: 77 }),
        get: vi.fn().mockResolvedValue({ id: 77, status: 'complete' }),
        onUpdated: {
          addListener: vi.fn(),
          removeListener: vi.fn(),
        },
        onRemoved: {
          addListener: vi.fn(),
          removeListener: vi.fn(),
        },
      },
      scripting: {
        executeScript: vi.fn().mockImplementation(async (spec: any) => {
          capturedExec = spec;
          capturedInjectedResult = await spec.func(...spec.args);
          return [{ result: capturedInjectedResult }];
        }),
      },
      runtime: {
        lastError: undefined,
        onMessage: {
          addListener: vi.fn((cb) => {
            runtimeListeners.add(cb);
          }),
          removeListener: vi.fn((cb) => {
            runtimeListeners.delete(cb);
          }),
        },
        sendMessage: vi.fn((msg: any, cb?: (res: any) => void) => {
          let resolved: any = undefined;
          for (const listener of [...runtimeListeners]) {
            listener(msg, { tab: { id: 77 } }, (res: any) => {
              resolved = res;
            });
          }
          if (cb) {
            cb(resolved);
            return;
          }
          return Promise.resolve(resolved);
        }),
      },
    };

    const categories: Array<'ARBITRATION' | 'UNILATERAL_CHANGE'> = [
      'ARBITRATION',
      'UNILATERAL_CHANGE',
    ];

    for (const category of categories) {
      capturedExec = null;
      capturedInjectedResult = null;
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      const postMessageSpy = vi.spyOn(window, 'postMessage');

      const finding = {
        ruleId: `KTY-${category}-01`,
        title: category === 'ARBITRATION' ? 'Mandatory Arbitration' : 'Unilateral Salary Change',
        category,
        classification:
          category === 'ARBITRATION' ? ('RIGHTS_WAIVER' as const) : ('ONE_SIDED_DISCRETION' as const),
        severity: 'CRITICAL' as const,
        statute: {
          code: '29 U.S.C. § 206',
          title: 'FLSA',
          jurisdiction: 'US-Federal',
          plainExplanation: 'Federal wage and hour protection.',
        },
        matchedSnippet: 'Any dispute arising out of your employment requires arbitration and wage deduction.',
        explanation: 'Employment rights risk.',
        recommendation: 'Review with Paystub Check.',
      };
      const scanResult = {
        timestamp: new Date().toISOString(),
        urlDomain: 'employer-portal.example.com',
        scannedLength: 250,
        matches: [finding],
        riskScore: 85,
        summary: { critical: 1, warning: 0, info: 0 },
        limitationsNotice: 'Static scan only.',
      };
      const tool = resolveDestinationTool([finding], 'employer-portal.example.com');
      expect(tool.id).toBe('paystub-check');

      const payload = buildHandoffPayload(scanResult, tool.id, finding);
      expect(validateHandoffPayload(payload)).toBe(true);

      const dispatchResult = await dispatchHandoffToDestination(payload, true);
      expect(dispatchResult.success).toBe(true);
      expect(capturedExec).not.toBeNull();
      expect(typeof capturedExec.func).toBe('function');
      expect(capturedInjectedResult).toBe(true);
      expect(setItemSpy).toHaveBeenCalledWith(capturedExec.args[0], capturedExec.args[1]);
      expect(postMessageSpy).toHaveBeenCalledTimes(1);

      const [postedEnvelope, postedOrigin] = postMessageSpy.mock.calls[0];
      expect(postedOrigin).toBe(window.location.origin);
      expect(postedOrigin).not.toBe('*');
      expect((postedEnvelope as any).type).toBe('KTY_HANDOFF_PAYLOAD');
      expect(validateHandoffPayload((postedEnvelope as any).payload)).toBe(true);
      expect((postedEnvelope as any).payload.findings[0].category).toBe(category);

      vi.restoreAllMocks();
    }
  });

  it('aborts in-flight handoff injection when hardBurnAllData fires before executeScript', async () => {
    const { buildHandoffPayload } = await import('../src/core/handoff');

    const onUpdatedHolder: { cb: ((tabId: number, info: { status?: string }) => void) | null } = { cb: null };
    const mockRemove = vi.fn().mockResolvedValue(undefined);
    const mockExecuteScript = vi.fn().mockResolvedValue([{ result: true }]);

    (globalThis as any).chrome = {
      tabs: {
        create: vi.fn().mockResolvedValue({ id: 99, status: 'loading' }),
        remove: mockRemove,
        onUpdated: {
          addListener: vi.fn((cb: (tabId: number, info: { status?: string }) => void) => {
            onUpdatedHolder.cb = cb;
          }),
          removeListener: vi.fn(),
        },
      },
      scripting: {
        executeScript: mockExecuteScript,
      },
    };

    const finding = {
      ruleId: 'KTY-WAGE-01',
      title: 'Unilateral Wage Deduction',
      category: 'UNILATERAL_CHANGE' as const,
      classification: 'ONE_SIDED_DISCRETION' as const,
      severity: 'CRITICAL' as const,
      statute: {
        code: '29 U.S.C. § 206',
        title: 'FLSA',
        jurisdiction: 'US-Federal',
        plainExplanation: 'Federal wage protection.',
      },
      matchedSnippet: 'Employer may deduct fees from wages.',
      explanation: 'Wage deduction risk.',
      recommendation: 'Review with Paystub Check.',
    };
    const scanResult = {
      timestamp: new Date().toISOString(),
      urlDomain: 'employer-portal.example.com',
      scannedLength: 200,
      matches: [finding],
      riskScore: 80,
      summary: { critical: 1, warning: 0, info: 0 },
      limitationsNotice: 'Static scan only.',
    };
    const payload = buildHandoffPayload(scanResult, 'paystub-check', finding);
    const pendingDispatch = dispatchHandoffToDestination(payload, true);

    // Yield one microtask so chrome.tabs.create resolves and attaches onUpdated listener
    await Promise.resolve();
    await hardBurnAllData();
    onUpdatedHolder.cb?.(99, { status: 'complete' });

    const result = await pendingDispatch;
    expect(result.success).toBe(false);
    expect(mockExecuteScript).not.toHaveBeenCalled();
    expect(mockRemove).toHaveBeenCalledWith(99);
  });

  it('prevents delayed injected function from writing sessionStorage or posting payload after hardBurnAllData (CodeRabbit R11)', async () => {
    const { buildHandoffPayload } = await import('../src/core/handoff');
    const finding = {
      ruleId: 'KTY-R11-DELAY-01',
      title: 'Delayed Injection Test Trap',
      category: 'AUTO_RENEWAL' as const,
      classification: 'STATUTORY_VIOLATION' as const,
      severity: 'CRITICAL' as const,
      statute: {
        code: '15 U.S.C. § 8403 (ROSCA)',
        title: 'Restore Online Shoppers Confidence Act',
        jurisdiction: 'US-Federal',
        plainExplanation: 'Clear cancellation disclosure required.',
      },
      matchedSnippet: 'Subscription auto-renews monthly unless canceled.',
      explanation: 'Recurring billing risk.',
      recommendation: 'Review with Bill of Rights Bot.',
    };
    const scanResult: PageScanResult = {
      timestamp: new Date().toISOString(),
      urlDomain: 'subscription.example.com',
      scannedLength: 180,
      matches: [finding],
      riskScore: 75,
      summary: { critical: 1, warning: 0, info: 0 },
      limitationsNotice: 'Static scan only.',
    };

    const runtimeListeners = new Set<
      (msg: any, sender: any, sendResponse: (res: any) => void) => boolean | void
    >();
    const mockRemove = vi.fn().mockResolvedValue(undefined);
    let releaseInjectedScript!: () => void;
    const executeScriptStarted = new Promise<void>((resolveStarted) => {
      releaseInjectedScript = resolveStarted;
    });
    let signalExecSubmitted!: () => void;
    const execSubmitted = new Promise<void>((res) => {
      signalExecSubmitted = res;
    });

    let delayedInjectedResult: any = null;

    (globalThis as any).chrome = {
      tabs: {
        create: vi.fn().mockResolvedValue({ id: 109, status: 'complete' }),
        remove: mockRemove,
        query: vi.fn().mockResolvedValue([]),
      },
      scripting: {
        executeScript: vi.fn().mockImplementation(async (spec: any) => {
          signalExecSubmitted();
          await executeScriptStarted;
          delayedInjectedResult = await spec.func(...spec.args);
          return [{ result: delayedInjectedResult }];
        }),
      },
      runtime: {
        lastError: undefined,
        onMessage: {
          addListener: vi.fn((cb) => {
            runtimeListeners.add(cb);
          }),
          removeListener: vi.fn((cb) => {
            runtimeListeners.delete(cb);
          }),
        },
        sendMessage: vi.fn((msg: any, cb?: (res: any) => void) => {
          let resolved: any = undefined;
          for (const listener of [...runtimeListeners]) {
            listener(msg, { tab: { id: 109 } }, (res: any) => {
              resolved = res;
            });
          }
          if (cb) {
            cb(resolved);
            return;
          }
          return Promise.resolve(resolved);
        }),
      },
    };

    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const postMessageSpy = vi.spyOn(window, 'postMessage');

    const payload = buildHandoffPayload(scanResult);
    const pendingDispatch = dispatchHandoffToDestination(payload, true);

    // Wait until executeScript has been submitted, then trigger hard burn BEFORE func runs
    await execSubmitted;
    await hardBurnAllData();
    releaseInjectedScript();

    const dispatchResult = await pendingDispatch;
    expect(delayedInjectedResult).toBe(false);
    expect(dispatchResult.success).toBe(false);
    expect(dispatchResult.url).toBe('');
    expect(setItemSpy).not.toHaveBeenCalled();
    expect(postMessageSpy).not.toHaveBeenCalled();
    expect(mockRemove).toHaveBeenCalledWith(109);
  });

  it('invalidates hardBurnEpoch and aborts pending handoff on remote KTY_HARD_BURN_DOM over BroadcastChannel or runtime.onMessage (CodeRabbit R11)', async () => {
    const { buildHandoffPayload } = await import('../src/core/handoff');
    const { getHardBurnEpoch, recordScanMetrics, telemetry } = await import('../src/telemetry/client');
    const finding = {
      ruleId: 'KTY-R11-REMOTE-01',
      title: 'Remote Burn Epoch Test Trap',
      category: 'AUTO_RENEWAL' as const,
      classification: 'STATUTORY_VIOLATION' as const,
      severity: 'CRITICAL' as const,
      statute: {
        code: '15 U.S.C. § 8403 (ROSCA)',
        title: 'Restore Online Shoppers Confidence Act',
        jurisdiction: 'US-Federal',
        plainExplanation: 'Clear cancellation disclosure required.',
      },
      matchedSnippet: 'Subscription auto-renews monthly unless canceled.',
      explanation: 'Recurring billing risk.',
      recommendation: 'Review with Bill of Rights Bot.',
    };
    const scanResult: PageScanResult = {
      timestamp: new Date().toISOString(),
      urlDomain: 'subscription.example.com',
      scannedLength: 180,
      matches: [finding],
      riskScore: 75,
      summary: { critical: 1, warning: 0, info: 0 },
      limitationsNotice: 'Static scan only.',
    };

    // Scenario A: remote Options burn via BroadcastChannel('kty_hard_burn')
    const channels: MockBC[] = [];
    class MockBC {
      name: string;
      onmessage: ((e: MessageEvent) => void) | null = null;
      constructor(name: string) {
        this.name = name;
        channels.push(this);
      }
      postMessage(data: any) {
        for (const ch of [...channels]) {
          if (ch !== this && ch.name === this.name) {
            ch.onmessage?.({ data } as MessageEvent);
          }
        }
      }
      close() {
        const idx = channels.indexOf(this);
        if (idx !== -1) channels.splice(idx, 1);
      }
    }

    const origBC = (globalThis as any).BroadcastChannel;
    (globalThis as any).BroadcastChannel = MockBC;
    try {
      const runtimeListeners = new Set<
        (msg: any, sender: any, sendResponse: (res: any) => void) => boolean | void
      >();
      const onUpdatedHolder: { cb: ((tabId: number, info: { status?: string }) => void) | null } = {
        cb: null,
      };
      const mockRemove = vi.fn().mockResolvedValue(undefined);
      const mockExecuteScript = vi.fn().mockResolvedValue([{ result: true }]);

      (globalThis as any).chrome = {
        tabs: {
          create: vi.fn().mockResolvedValue({ id: 201, status: 'loading' }),
          remove: mockRemove,
          onUpdated: {
            addListener: vi.fn((cb) => {
              onUpdatedHolder.cb = cb;
            }),
            removeListener: vi.fn(),
          },
        },
        scripting: {
          executeScript: mockExecuteScript,
        },
        runtime: {
          onMessage: {
            addListener: vi.fn((cb) => runtimeListeners.add(cb)),
            removeListener: vi.fn((cb) => runtimeListeners.delete(cb)),
          },
        },
      };

      recordScanMetrics({ critical: 1, warning: 0, info: 0 }, 50);
      const epochBeforeBroadcastBurn = getHardBurnEpoch();
      const pendingA = dispatchHandoffToDestination(buildHandoffPayload(scanResult), true);
      await Promise.resolve();

      // Remote Options context posts KTY_HARD_BURN_DOM over BroadcastChannel
      const remoteSender = new MockBC('kty_hard_burn');
      remoteSender.postMessage({ type: 'KTY_HARD_BURN_DOM' });
      remoteSender.close();

      expect(getHardBurnEpoch()).toBeGreaterThan(epochBeforeBroadcastBurn);
      expect(telemetry.getBufferedSpans().length).toBe(0);

      onUpdatedHolder.cb?.(201, { status: 'complete' });
      const resA = await pendingA;
      expect(resA.success).toBe(false);
      expect(mockExecuteScript).not.toHaveBeenCalled();
      expect(mockRemove).toHaveBeenCalledWith(201);

      // Scenario B: remote runtime KTY_HARD_BURN_DOM via chrome.runtime.onMessage while executeScript waits
      telemetry.reset();
      recordScanMetrics({ critical: 1, warning: 0, info: 0 }, 50);
      const epochBeforeRuntimeBurn = getHardBurnEpoch();

      let releaseExec!: () => void;
      const execGate = new Promise<void>((r) => {
        releaseExec = r;
      });
      let signalStarted!: () => void;
      const startedGate = new Promise<void>((r) => {
        signalStarted = r;
      });
      let delayedResult: any = null;

      (globalThis as any).chrome.tabs = {
        create: vi.fn().mockResolvedValue({ id: 202, status: 'complete' }),
        remove: mockRemove,
      };
      (globalThis as any).chrome.scripting = {
        executeScript: vi.fn().mockImplementation(async (spec: any) => {
          signalStarted();
          await execGate;
          delayedResult = await spec.func(...spec.args);
          return [{ result: delayedResult }];
        }),
      };
      (globalThis as any).chrome.runtime.sendMessage = vi.fn((msg: any, cb?: (r: any) => void) => {
        let out: any;
        for (const cbListener of [...runtimeListeners]) {
          cbListener(msg, { tab: { id: 202 } }, (r: any) => {
            out = r;
          });
        }
        if (cb) {
          cb(out);
          return;
        }
        return Promise.resolve(out);
      });

      const pendingB = dispatchHandoffToDestination(buildHandoffPayload(scanResult), true);
      await startedGate;

      for (const listener of [...runtimeListeners]) {
        listener({ type: 'KTY_HARD_BURN_DOM' }, {}, () => {});
      }
      expect(getHardBurnEpoch()).toBeGreaterThan(epochBeforeRuntimeBurn);

      releaseExec();
      const resB = await pendingB;
      expect(delayedResult).toBe(false);
      expect(resB.success).toBe(false);
      expect(mockRemove).toHaveBeenCalledWith(202);
    } finally {
      (globalThis as any).BroadcastChannel = origBC;
    }
  });
});
