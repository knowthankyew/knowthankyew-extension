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
import { buildHandoffPayload } from '../src/core/handoff';
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
      code: '16 CFR Part 425',
      title: 'Click-to-Cancel Rule',
      jurisdiction: 'US Federal',
      plainExplanation: 'Cancellation must be symmetrical to signup.',
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
  it('dispatches handoff via chrome.tabs.create and executes ephemeral sessionStorage script', async () => {
    const mockCreate = vi.fn().mockResolvedValue({ id: 101, url: 'https://billofrightsbot.knowthankyew.org?kty_handoff=1' });
    const mockExecuteScript = vi.fn().mockResolvedValue([{ result: undefined }]);

    (globalThis as any).chrome = {
      tabs: { create: mockCreate },
      scripting: { executeScript: mockExecuteScript },
    };

    const payload = buildHandoffPayload(sampleScan);
    const result = await dispatchHandoffToDestination(payload);

    expect(result.success).toBe(true);
    expect(result.url).toBe('https://billofrightsbot.knowthankyew.org?kty_handoff=1');
    expect(mockCreate).toHaveBeenCalledWith({
      url: 'https://billofrightsbot.knowthankyew.org?kty_handoff=1',
      active: true,
    });
    expect(mockExecuteScript).toHaveBeenCalledWith({
      target: { tabId: 101 },
      func: expect.any(Function),
      args: [KTY_HANDOFF_SESSION_KEY, JSON.stringify(payload)],
    });
  });

  // -------------------------------------------------------------
  // Test 2: dispatchHandoffToDestination fallback for web/dev
  // -------------------------------------------------------------
  it('falls back to sessionStorage and window.open when chrome.tabs is unavailable', async () => {
    delete (globalThis as any).chrome;
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    const payload = buildHandoffPayload(sampleScan);
    const result = await dispatchHandoffToDestination(payload, true);

    expect(result.success).toBe(true);
    expect(result.url).toBe('http://localhost:3000?kty_handoff=1');
    expect(windowOpenSpy).toHaveBeenCalledWith('http://localhost:3000?kty_handoff=1', '_blank');

    // Ephemeral sessionStorage was written
    const stored = sessionStorage.getItem(KTY_HANDOFF_SESSION_KEY);
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!).targetTool).toBe('bill-of-rights-bot');
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

    expect(windowOpenSpy).toHaveBeenCalledWith('https://billofrightsbot.knowthankyew.org?kty_handoff=1', '_blank');
    const stored = sessionStorage.getItem(KTY_HANDOFF_SESSION_KEY);
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!).targetTool).toBe('bill-of-rights-bot');
  });
});
