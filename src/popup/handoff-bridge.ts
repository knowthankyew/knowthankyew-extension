import { KtyHandoffPayload, KTY_HANDOFF_SESSION_KEY } from '../core/handoff-types';
import { buildDestinationUrl, validateHandoffPayload } from '../core/handoff';

export { KTY_HANDOFF_SESSION_KEY };

/**
 * Dispatches a sanitized handoff payload to the target portfolio destination tool.
 *
 * In Chrome extension context:
 * - Opens target advocate tool in a new tab via chrome.tabs.create.
 * - Injects the payload into the new tab's ephemeral sessionStorage via chrome.scripting.
 * In web / mock / test fallback environment:
 * - Cleans up local sessionStorage and opens destination window in new tab.
 */
export async function dispatchHandoffToDestination(
  payload: KtyHandoffPayload,
  options?: boolean | { isDev?: boolean }
): Promise<{ success: boolean; url: string }> {
  if (!validateHandoffPayload(payload)) {
    return { success: false, url: '' };
  }

  const isDev = typeof options === 'boolean' ? options : Boolean(options?.isDev);
  const targetUrl = buildDestinationUrl(payload.targetTool, isDev);
  const serialized = JSON.stringify(payload);

  if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
    try {
      const newTab = await chrome.tabs.create({ url: targetUrl, active: true });
      if (!targetUrl.startsWith('https://github.com/')) {
        if (!newTab.id || !chrome.scripting?.executeScript) {
          return { success: false, url: targetUrl };
        }
        try {
          await chrome.scripting.executeScript({
            target: { tabId: newTab.id },
            func: (key: string, data: string) => {
              try {
                sessionStorage.setItem(key, data);
              } catch {
                // Non-fatal if sessionStorage is blocked
              }
            },
            args: [KTY_HANDOFF_SESSION_KEY, serialized],
          });
        } catch {
          return { success: false, url: targetUrl };
        }
      }
      return { success: true, url: targetUrl };
    } catch {
      // If chrome.tabs.create fails, fall through to window.open
    }
  }

  // Web / dev fallback context
  const canOpen = typeof window !== 'undefined' && typeof window.open === 'function';
  if (canOpen) {
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  }

  if (typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.removeItem(KTY_HANDOFF_SESSION_KEY);
    } catch {
      // Non-fatal if sessionStorage restricted
    }
  }

  // Without chrome.scripting, dev destinations cannot receive the injected sessionStorage payload
  return { success: canOpen && !isDev, url: targetUrl };
}

/**
 * Consumes and zeroizes any handoff payload from sessionStorage.
 * Used by destination tools or test fixtures to read context.
 */
export function readAndClearHandoffPayload(): KtyHandoffPayload | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(KTY_HANDOFF_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (validateHandoffPayload(parsed)) {
      sessionStorage.removeItem(KTY_HANDOFF_SESSION_KEY);
      return parsed;
    }
  } catch {
    // Non-fatal
  }
  return null;
}
