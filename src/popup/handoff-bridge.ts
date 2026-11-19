import { KtyHandoffPayload, KTY_HANDOFF_SESSION_KEY } from '../core/handoff-types';
import { buildDestinationUrl, validateHandoffPayload } from '../core/handoff';
import {
  confirmPendingHandoffCommit,
  getHardBurnEpoch,
  registerPendingHandoffCommit,
  revokePendingHandoffCommit,
  subscribeHardBurnEpoch,
} from '../telemetry/client';

export { KTY_HANDOFF_SESSION_KEY };

/**
 * Dispatches a sanitized handoff payload to the target portfolio destination tool.
 *
 * In Chrome extension context:
 * - Opens target advocate tool in a new tab via chrome.tabs.create.
 * - Coordinates destination-side commit confirmation over chrome.runtime before
 *   allowing the injected script to write sessionStorage or dispatch postMessage.
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

  const unsubscribeBurn = subscribeHardBurnEpoch();
  try {
    const burnEpochAtStart = getHardBurnEpoch();
    const isDev = typeof options === 'boolean' ? options : Boolean(options?.isDev);
    const targetUrl = buildDestinationUrl(payload.targetTool, isDev);
    const serialized = JSON.stringify(payload);

    if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
      try {
        const newTab = await chrome.tabs.create({ url: targetUrl, active: true });
        if (getHardBurnEpoch() !== burnEpochAtStart) {
          if (newTab?.id && chrome.tabs?.remove) {
            try {
              await chrome.tabs.remove(newTab.id);
            } catch {
              // Best-effort cleanup of post-burn tab
            }
          }
          return { success: false, url: '' };
        }
        if (!targetUrl.startsWith('https://github.com/')) {
          if (!newTab.id || !chrome.scripting?.executeScript) {
            return { success: false, url: targetUrl };
          }
          const targetTabId = newTab.id;
          let commitConfirmListener:
            | ((
                message: any,
                sender: any,
                sendResponse: (res: any) => void
              ) => boolean | void)
            | null = null;
          try {
            if (newTab.status && newTab.status !== 'complete' && chrome.tabs?.onUpdated) {
              await new Promise<void>((resolve) => {
                const listener = (tabId: number, info: { status?: string }) => {
                  if (tabId === targetTabId && info.status === 'complete') {
                    chrome.tabs.onUpdated.removeListener(listener);
                    resolve();
                  }
                };
                chrome.tabs.onUpdated.addListener(listener);
                setTimeout(() => {
                  try {
                    chrome.tabs.onUpdated.removeListener(listener);
                  } catch {
                    // Non-fatal if listener removal fails
                  }
                  resolve();
                }, 2000);
              });
            }

            if (
              getHardBurnEpoch() !== burnEpochAtStart ||
              !registerPendingHandoffCommit(serialized, targetTabId, burnEpochAtStart)
            ) {
              try {
                await chrome.tabs?.remove?.(targetTabId);
              } catch {
                // Best-effort cleanup of post-burn tab
              }
              return { success: false, url: '' };
            }

            if (chrome.runtime?.onMessage?.addListener) {
              commitConfirmListener = (message, sender, sendResponse) => {
                if (
                  message?.type === 'KTY_CONFIRM_HANDOFF_COMMIT' &&
                  message?.payload === serialized
                ) {
                  const senderTabId = sender?.tab?.id;
                  if (typeof senderTabId === 'number' && senderTabId !== targetTabId) {
                    return;
                  }
                  const approved =
                    getHardBurnEpoch() === burnEpochAtStart &&
                    confirmPendingHandoffCommit(serialized, targetTabId);
                  sendResponse({ approved });
                  return true;
                }
              };
              chrome.runtime.onMessage.addListener(commitConfirmListener);
            }

            if (typeof chrome.runtime?.sendMessage === 'function') {
              try {
                await Promise.resolve(
                  chrome.runtime.sendMessage({
                    type: 'KTY_REGISTER_HANDOFF_COMMIT',
                    tabId: targetTabId,
                    payload: serialized,
                    epoch: burnEpochAtStart,
                  })
                ).catch(() => {});
              } catch {
                // Service worker mirror is best-effort when popup owns confirmation listener
              }
            }

            const results = await chrome.scripting.executeScript({
              target: { tabId: targetTabId },
              func: async (key: string, data: string) => {
                let runtimeAborted = false;
                let burnListener: ((msg: unknown) => void) | null = null;
                try {
                  if (
                    typeof chrome === 'undefined' ||
                    typeof chrome.runtime?.sendMessage !== 'function'
                  ) {
                    return false;
                  }

                  if (chrome.runtime?.onMessage?.addListener) {
                    burnListener = (msg: unknown) => {
                      if (
                        typeof msg === 'object' &&
                        msg !== null &&
                        (msg as { type?: unknown }).type === 'KTY_HARD_BURN_DOM'
                      ) {
                        runtimeAborted = true;
                      }
                    };
                    chrome.runtime.onMessage.addListener(burnListener);
                  }

                  const confirmation = await new Promise<{ approved?: boolean } | null>(
                    (resolve) => {
                      try {
                        let settled = false;
                        const finish = (res: { approved?: boolean } | null) => {
                          if (!settled) {
                            settled = true;
                            resolve(res);
                          }
                        };
                        const maybePromise = (
                          chrome.runtime.sendMessage as unknown as (
                            message: unknown,
                            callback?: (response: { approved?: boolean }) => void
                          ) => Promise<{ approved?: boolean }> | void
                        )({ type: 'KTY_CONFIRM_HANDOFF_COMMIT', payload: data }, (res) => {
                          if (chrome.runtime?.lastError) {
                            finish(null);
                            return;
                          }
                          finish(res ?? null);
                        });
                        if (
                          maybePromise &&
                          typeof (maybePromise as Promise<unknown>).then === 'function'
                        ) {
                          (maybePromise as Promise<{ approved?: boolean }>).then(
                            (res) => finish(res ?? null),
                            () => finish(null)
                          );
                        }
                      } catch {
                        resolve(null);
                      }
                    }
                  );

                  if (runtimeAborted || confirmation?.approved !== true) {
                    return false;
                  }

                  sessionStorage.setItem(key, data);
                  const origin =
                    typeof window.location?.origin === 'string' &&
                    window.location.origin.length > 0 &&
                    window.location.origin !== 'null'
                      ? window.location.origin
                      : null;
                  if (origin && typeof window.postMessage === 'function') {
                    window.postMessage(
                      { type: 'KTY_HANDOFF_PAYLOAD', payload: JSON.parse(data) },
                      origin
                    );
                  }
                  return true;
                } catch {
                  return false;
                } finally {
                  if (
                    burnListener &&
                    typeof chrome !== 'undefined' &&
                    chrome.runtime?.onMessage?.removeListener
                  ) {
                    try {
                      chrome.runtime.onMessage.removeListener(burnListener);
                    } catch {
                      // Non-fatal
                    }
                  }
                }
              },
              args: [KTY_HANDOFF_SESSION_KEY, serialized],
            });
            const written = Boolean(results?.[0]?.result);
            if (getHardBurnEpoch() !== burnEpochAtStart) {
              try {
                await chrome.tabs?.remove?.(targetTabId);
              } catch {
                // Best-effort cleanup of post-burn tab
              }
              return { success: false, url: '' };
            }
            if (!written) {
              return { success: false, url: targetUrl };
            }
          } catch {
            return { success: false, url: targetUrl };
          } finally {
            revokePendingHandoffCommit(serialized, targetTabId);
            if (
              commitConfirmListener &&
              typeof chrome !== 'undefined' &&
              chrome.runtime?.onMessage?.removeListener
            ) {
              try {
                chrome.runtime.onMessage.removeListener(commitConfirmListener);
              } catch {
                // Non-fatal
              }
            }
            if (typeof chrome.runtime?.sendMessage === 'function') {
              try {
                await Promise.resolve(
                  chrome.runtime.sendMessage({
                    type: 'KTY_REVOKE_HANDOFF_COMMIT',
                    tabId: targetTabId,
                    payload: serialized,
                  })
                ).catch(() => {});
              } catch {
                // Non-fatal
              }
            }
          }
        }
        return { success: true, url: targetUrl };
      } catch {
        // If chrome.tabs.create fails, fall through to window.open
      }
    }

    if (getHardBurnEpoch() !== burnEpochAtStart) {
      if (typeof sessionStorage !== 'undefined') {
        try {
          sessionStorage.removeItem(KTY_HANDOFF_SESSION_KEY);
        } catch {
          // Non-fatal
        }
      }
      return { success: false, url: '' };
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
  } finally {
    unsubscribeBurn();
  }
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
