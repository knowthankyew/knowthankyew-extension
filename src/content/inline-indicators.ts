/**
 * Closed Shadow DOM Inline Visual Indicators Subsystem.
 *
 * Injects non-intrusive, isolated shield warning badges adjacent to predatory
 * consent checkboxes and deceptive subscription toggles.
 *
 * Invariant Constraints:
 * - Mode: attachShadow({ mode: 'closed' }) to strictly prevent host CSS leakage or tamper.
 * - Layout Safety: position: absolute; pointer-events: none to avoid disrupting host form layouts.
 * - Zero Network: Native system styling with zero external fonts or remote assets.
 * - Text Nodes: Uses document.createTextNode() exclusively (zero innerHTML).
 * - Fail-Silent: Wraps all injection attempts in defensive try/catch blocks.
 */

export interface IndicatorConfig {
  /** The host DOM element to anchor the indicator adjacent to */
  anchorElement: Element;
  /** Severity level — drives badge color and classification */
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  /** Short label displayed inside the shield badge */
  label: string;
  /** Full explanation or statutory notice for accessibility / title */
  tooltipText: string;
}

const activeHostElements = new Set<Element>();

/**
 * Injects a closed Shadow DOM shield badge adjacent to anchorElement.
 * Returns the injected host wrapper element, or null if injection failed.
 */
export function injectIndicator(config: IndicatorConfig): Element | null {
  try {
    if (!config?.anchorElement || typeof document === 'undefined') {
      return null;
    }

    const { anchorElement, severity, label, tooltipText } = config;

    // Create host wrapper element
    const host = document.createElement('span');
    host.setAttribute('data-kty-indicator-host', 'true');
    host.style.cssText =
      'display: inline-block; position: absolute; pointer-events: none; z-index: 2147483647; margin-left: 6px; vertical-align: middle; line-height: 1;';

    // Attach closed shadow root
    if (typeof host.attachShadow !== 'function') {
      return null;
    }

    const shadowRoot = host.attachShadow({ mode: 'closed' });

    // Color definitions
    let bgColor = '#ef4444'; // CRITICAL: Red
    let textColor = '#ffffff';

    if (severity === 'WARNING') {
      bgColor = '#f59e0b'; // WARNING: Amber
      textColor = '#0f172a';
    } else if (severity === 'INFO') {
      bgColor = '#38bdf8'; // INFO: Blue
      textColor = '#0f172a';
    }

    // Construct isolated stylesheet
    const style = document.createElement('style');
    style.textContent = `
      .kty-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background-color: ${bgColor};
        color: ${textColor};
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 11px;
        font-weight: 700;
        height: 18px;
        max-width: 120px;
        padding: 0 6px;
        border-radius: 4px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
        opacity: 0.92;
        user-select: none;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    `;
    shadowRoot.appendChild(style);

    // Construct badge element using text nodes (zero innerHTML)
    const badge = document.createElement('span');
    badge.className = 'kty-badge';
    badge.setAttribute('title', tooltipText);
    badge.setAttribute('role', 'alert');
    badge.setAttribute('aria-label', tooltipText);
    badge.appendChild(document.createTextNode(label));

    shadowRoot.appendChild(badge);

    // Insert as a sibling after the anchor element
    if (typeof anchorElement.insertAdjacentElement === 'function') {
      anchorElement.insertAdjacentElement('afterend', host);
    } else if (anchorElement.parentNode) {
      anchorElement.parentNode.insertBefore(host, anchorElement.nextSibling);
    } else {
      return null;
    }

    activeHostElements.add(host);
    return host;
  } catch {
    // Fail-silent: host forms must never crash due to indicator injection
    return null;
  }
}

/**
 * Removes all injected indicator host elements from the document.
 */
export function removeAllIndicators(): void {
  try {
    for (const host of activeHostElements) {
      try {
        if (host.parentNode) {
          host.parentNode.removeChild(host);
        }
      } catch {
        // Non-fatal if element already detached
      }
    }
    activeHostElements.clear();

    // Fallback cleanup in case any orphaned hosts exist in DOM
    if (typeof document !== 'undefined') {
      const remaining = document.querySelectorAll('[data-kty-indicator-host]');
      remaining.forEach((el) => {
        try {
          el.remove();
        } catch {
          // Non-fatal
        }
      });
    }
  } catch {
    // Fail-silent
  }
}

/**
 * Returns the count of currently active indicators.
 */
export function getActiveIndicatorCount(): number {
  return activeHostElements.size;
}
