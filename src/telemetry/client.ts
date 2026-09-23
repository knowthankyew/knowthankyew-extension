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
export async function hardBurnAllData(): Promise<void> {
  // 1. Burn in-memory telemetry and session audit log for this extension context.
  telemetry.burn();

  // 2. Clear the extension's local storage namespace.
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.clear();
  }

  // 3. Clear action badges.
  if (typeof chrome !== 'undefined' && chrome.action?.setBadgeText) {
    await chrome.action.setBadgeText({ text: '' });
  }

  // 4. Command every open tab to dereference DOM state and stop observation.
  // Tabs without an injected content script reject sendMessage; those failures
  // are expected and must not prevent cleanup in other tabs.
  if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
    try {
      const tabs = await chrome.tabs.query({});
      const burnMessage = { type: 'KTY_HARD_BURN_DOM' };
      const notifications = tabs
        .filter((tab) => typeof tab.id === 'number')
        .map((tab) => chrome.tabs.sendMessage(tab.id as number, burnMessage));

      await Promise.allSettled(notifications);
    } catch {
      // The tabs API may be unavailable or disconnected; non-fatal.
    }
  }

  // 5. Command local ML worker (if active) to burn in-memory session and prompt context (fire-and-forget)
  import('../ml/local-ml-client')
    .then(({ localMLClient }) => {
      localMLClient.burn().catch(() => {});
    })
    .catch(() => {});
}
