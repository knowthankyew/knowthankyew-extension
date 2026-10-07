import { KtyHandoffPayload, KTY_HANDOFF_SESSION_KEY } from '../core/handoff-types';
import { buildDestinationUrl, validateHandoffPayload } from '../core/handoff';

export { KTY_HANDOFF_SESSION_KEY };

/**
 * Dispatches a sanitized handoff payload to the target portfolio destination tool.
 *
 * In Chrome extension context:
 * - Opens target advocate tool in a new tab via chrome.tabs.create.
 * - Injects the payload into the new tab's ephemeral sessionStorage via chrome.scripting.
 *
 * In web / mock / test environment:
 * - Writes to local sessionStorage and opens window in new tab.
 */
export async function dispatchHandoffToDestination(
  payload: KtyHandoffPayload,
  options?: boolean | { isDev?: boolean }
): Promise<{ success: boolean; url: string }> {
  const isDev = typeof options === 'boolean' ? options : Boolean(options?.isDev);
  const targetUrl = buildDestinationUrl(payload.targetTool, isDev);
  const serialized = JSON.stringify(payload);

  if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
    try {
      const newTab = await chrome.tabs.create({ url: targetUrl, active: true });
      if (!targetUrl.startsWith('https://github.com/') && newTab.id && chrome.scripting?.executeScript) {
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
          // Scripting may fail if host permissions are restricted or tab is still loading; non-fatal
        }
      }
      return { success: true, url: targetUrl };
    } catch (err) {
      // If chrome.tabs.create fails, fall through to window.open
    }
  }

  // Web / dev / test fallback
  if (typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.setItem(KTY_HANDOFF_SESSION_KEY, serialized);
    } catch {
      // Non-fatal if sessionStorage restricted
    }
  }

  if (typeof window !== 'undefined' && typeof window.open === 'function') {
    window.open(targetUrl, '_blank');
  }

  return { success: true, url: targetUrl };
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
