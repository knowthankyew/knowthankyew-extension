import { TelemetryManager } from '@knowthankyew/privacy-telemetry';

// Extension-specific operational metric keys (Pillar 3: Fail-Closed Allowlist)
export const EXTENSION_ALLOWLIST_KEYS = [
  'extension.action',
  'extension.rule_category',
  'extension.rule_id',
  'extension.severity',
  'extension.scan_duration_ms',
  'extension.traps_found',
  'extension.critical_count',
  'extension.warning_count',
  'app.version',
  'app.environment',
] as const;

export const telemetry = new TelemetryManager(
  {
    serviceName: 'knowthankyew-extension',
    mode: 'memory_only',
    networkEgress: 'deny',
    burnEnabled: true,
    allowRawPayloads: false,
  },
  EXTENSION_ALLOWLIST_KEYS
);

/**
 * Records an operational scan event strictly using allowlisted keys.
 * Absolutely NO clause text, URLs with queries, or DOM snippets are recorded.
 */
export function recordScanMetrics(summary: { critical: number; warning: number; info: number }, durationMs: number): void {
  const span = telemetry.startSpan('extension.page_scan', {
    'extension.traps_found': summary.critical + summary.warning + summary.info,
    'extension.critical_count': summary.critical,
    'extension.warning_count': summary.warning,
    'extension.scan_duration_ms': durationMs,
    'extension.action': 'scan_completed',
  });
  span.end('OK');

  telemetry.recordAuditEvent(
    'audit_performed',
    `Local page audit completed: ${summary.critical} critical, ${summary.warning} warning traps detected.`,
    {
      'extension.traps_found': summary.critical + summary.warning + summary.info,
    }
  );
}

/**
 * Pillar 5 Invariant: The Hard Burn
 *
 * Purges this context's in-memory telemetry, clears local extension storage,
 * clears the toolbar badge, and asks every open tab to tear down any injected
 * scanner state. Cleanup is intentionally best-effort across tabs because
 * tabs may be restricted, closed, or missing the content script.
 */
let hardBurnEpoch = 0;

interface PendingHandoffCommit {
  epoch: number;
  payload: string;
  tabId?: number;
}

const pendingHandoffCommits = new Map<string, PendingHandoffCommit>();

function buildHandoffCommitKey(payload: string, tabId?: number): string {
  return `${typeof tabId === 'number' ? tabId : 'any'}:${payload}`;
}

/**
 * Monotonic counter incremented synchronously at the start of every hard burn so
 * in-flight async UI/handoff operations can abort before writing storage or posting messages.
 */
export function getHardBurnEpoch(): number {
  return hardBurnEpoch;
}

/**
 * Advances the local hard-burn epoch, tombstones in-memory telemetry, revokes all
 * pending destination handoff commits, and clears local session handoff storage.
 * Safe to call idempotently when receiving remote KTY_HARD_BURN_DOM broadcasts.
 */
export function advanceHardBurnEpoch(): number {
  hardBurnEpoch += 1;
  pendingHandoffCommits.clear();
  telemetry.burn();
  if (typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.removeItem('kty_handoff');
    } catch {
      // Non-fatal if sessionStorage is restricted
    }
  }
  return hardBurnEpoch;
}

/**
 * Registers a single-use destination commit authorization bound to the current burn epoch.
 */
export function registerPendingHandoffCommit(
  payload: string,
  tabId?: number,
  expectedEpoch: number = hardBurnEpoch
): boolean {
  if (expectedEpoch !== hardBurnEpoch) {
    return false;
  }
  const key = buildHandoffCommitKey(payload, tabId);
  pendingHandoffCommits.set(key, { epoch: expectedEpoch, payload, tabId });
  return true;
}

/**
 * Authorizes a destination script commit only if an unconsumed grant exists for the
 * current burn epoch (and matching tabId when provided). Consumes the grant atomically.
 */
export function confirmPendingHandoffCommit(payload: string, tabId?: number): boolean {
  if (typeof payload !== 'string' || payload.length === 0) {
    return false;
  }

  if (typeof tabId === 'number') {
    const exactKey = buildHandoffCommitKey(payload, tabId);
    const exactEntry = pendingHandoffCommits.get(exactKey);
    if (exactEntry) {
      pendingHandoffCommits.delete(exactKey);
      return exactEntry.epoch === hardBurnEpoch;
    }
    const wildcardKey = buildHandoffCommitKey(payload, undefined);
    const wildcardEntry = pendingHandoffCommits.get(wildcardKey);
    if (wildcardEntry) {
      pendingHandoffCommits.delete(wildcardKey);
      return wildcardEntry.epoch === hardBurnEpoch;
    }
    return false;
  }

  for (const [key, entry] of pendingHandoffCommits.entries()) {
    if (entry.payload === payload) {
      pendingHandoffCommits.delete(key);
      return entry.epoch === hardBurnEpoch;
    }
  }
  return false;
}

/**
 * Revokes an unconsumed handoff commit grant during cleanup.
 */
export function revokePendingHandoffCommit(payload: string, tabId?: number): void {
  if (typeof tabId === 'number') {
    pendingHandoffCommits.delete(buildHandoffCommitKey(payload, tabId));
  }
  pendingHandoffCommits.delete(buildHandoffCommitKey(payload, undefined));
}

/**
 * Subscribes to BroadcastChannel('kty_hard_burn') so remote context burns
 * advance this context's hardBurnEpoch synchronously.
 */
export function subscribeHardBurnBroadcast(onBurn?: () => void): () => void {
  let channel: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      channel = new BroadcastChannel('kty_hard_burn');
      channel.onmessage = (event) => {
        if (event?.data?.type === 'KTY_HARD_BURN_DOM') {
          advanceHardBurnEpoch();
          onBurn?.();
        }
      };
    } catch {
      // Non-fatal if BroadcastChannel is restricted in current context
    }
  }
  return () => {
    if (channel) {
      try {
        channel.close();
      } catch {
        // Non-fatal
      }
      channel = null;
    }
  };
}

/**
 * Subscribes to both BroadcastChannel('kty_hard_burn') and chrome.runtime.onMessage
 * so remote KTY_HARD_BURN_DOM dispatches invalidate this context's epoch before
 * any pending handoff can continue.
 */
export function subscribeHardBurnEpoch(onBurn?: () => void): () => void {
  const stopBroadcast = subscribeHardBurnBroadcast(onBurn);
  let runtimeListener: ((message: any) => void) | null = null;

  if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage?.addListener) {
    try {
      runtimeListener = (message: any) => {
        if (message?.type === 'KTY_HARD_BURN_DOM') {
          advanceHardBurnEpoch();
          onBurn?.();
        }
      };
      chrome.runtime.onMessage.addListener(runtimeListener);
    } catch {
      runtimeListener = null;
    }
  }

  return () => {
    stopBroadcast();
    if (
      runtimeListener &&
      typeof chrome !== 'undefined' &&
      chrome.runtime?.onMessage?.removeListener
    ) {
      try {
        chrome.runtime.onMessage.removeListener(runtimeListener);
      } catch {
        // Non-fatal
      }
      runtimeListener = null;
    }
  };
}

export async function hardBurnAllData(): Promise<void> {
  advanceHardBurnEpoch();
  // 1. Burn in-memory telemetry and session audit log for this extension context.

  // 2. Clear the extension's local storage namespace.
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.clear();
  }

  // 3. Clear action badges.
  if (typeof chrome !== 'undefined' && chrome.action?.setBadgeText) {
    await chrome.action.setBadgeText({ text: '' });
  }

  // 4. Command every open tab and sibling extension context to tear down state.
  // Dual-transport amnesia:
  // Primary transport: chrome.tabs.sendMessage + chrome.runtime.sendMessage.
  // Secondary transport: BroadcastChannel('kty_hard_burn') to guarantee simultaneous
  // cross-context sanitization across detached frames, cross-origin child documents,
  // and partitioned worker environments (e.g. Safari).
  const burnMessage = { type: 'KTY_HARD_BURN_DOM' };

  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const channel = new BroadcastChannel('kty_hard_burn');
      channel.postMessage(burnMessage);
      channel.close();
    } catch {
      // BroadcastChannel may throw if restricted or suspended; non-fatal fallback.
    }
  }

  if (typeof chrome !== 'undefined' && typeof chrome.runtime?.sendMessage === 'function') {
    try {
      await Promise.resolve(chrome.runtime.sendMessage(burnMessage)).catch(() => {});
    } catch {
      // No active extension listener or runtime unavailable; non-fatal.
    }
  }

  if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
    try {
      const tabs = await chrome.tabs.query({});
      const badgeClears = tabs
        .filter((tab) => typeof tab.id === 'number')
        .map(async (tab) => {
          try {
            if (chrome.action?.setBadgeText) {
              await chrome.action.setBadgeText({ text: '', tabId: tab.id });
            }
          } catch {
            // Tab may be closed or restricted
          }
        });
      const notifications = tabs
        .filter((tab) => typeof tab.id === 'number')
        .map((tab) => chrome.tabs.sendMessage(tab.id as number, burnMessage));

      await Promise.allSettled([...badgeClears, ...notifications]);
    } catch {
      // The tabs API may be unavailable or disconnected; non-fatal.
    }
  }

  // 5. Command local ML worker (if active) to burn in-memory session and prompt context
  try {
    const { localMLClient } = await import('../ml/local-ml-client');
    await localMLClient.burn();
  } catch {
    // Non-fatal if loopback worker is offline or unconfigured
  }
}
