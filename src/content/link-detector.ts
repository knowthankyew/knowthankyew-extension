import { DiscoveredLegalLink } from '../core/types';

interface WellKnownEntry {
  path: string;
  title: string;
  category: 'TERMS' | 'PRIVACY' | 'BILLING' | 'ARBITRATION';
}

/**
 * Pre-compiled, zero-network canonical legal routes for major consumer platforms.
 * Enables instant one-click audit suggestions even on complex SPAs before footers render.
 */
export const WELL_KNOWN_LEGAL_MAP: Record<string, WellKnownEntry[]> = {
  'fiverr.com': [
    { path: '/terms_of_service', title: 'Terms of Service', category: 'TERMS' },
    { path: '/privacy-policy', title: 'Privacy Policy', category: 'PRIVACY' },
  ],
  'doordash.com': [
    { path: '/consumers/s/terms-and-conditions-us', title: 'Consumer Terms & Conditions', category: 'TERMS' },
  ],
  'spotify.com': [
    { path: '/legal/end-user-agreement/', title: 'End User Agreement', category: 'TERMS' },
  ],
  'netflix.com': [
    { path: '/legal/termsofuse', title: 'Terms of Use', category: 'TERMS' },
  ],
  'paypal.com': [
    { path: '/us/legalhub/useragreement-full', title: 'User Agreement', category: 'TERMS' },
  ],
  'uber.com': [
    { path: '/legal/en/document/?name=general-terms-of-use', title: 'General Terms of Use', category: 'TERMS' },
  ],
  'airbnb.com': [
    { path: '/help/article/2908', title: 'Terms of Service', category: 'TERMS' },
  ],
  'reddit.com': [
    { path: '/policies/user-agreement', title: 'User Agreement', category: 'TERMS' },
  ],
  'amazon.com': [
    { path: '/gp/help/customer/display.html?nodeId=GLSBYFE9MGKKQWW4', title: 'Conditions of Use', category: 'TERMS' },
  ],
  'adobe.com': [
    { path: '/legal/terms.html', title: 'General Terms of Use', category: 'TERMS' },
  ],
  'instacart.com': [
    { path: '/terms', title: 'Terms of Service', category: 'TERMS' },
  ],
  'chegg.com': [
    { path: '/termsofuse', title: 'Terms of Use', category: 'TERMS' },
  ],
  'hulu.com': [
    { path: '/terms', title: 'Subscriber Agreement', category: 'TERMS' },
  ],
  'nytimes.com': [
    { path: '/subscription-terms', title: 'Subscriber Terms', category: 'BILLING' },
  ],
};

const CATEGORY_PRIORITY: Record<string, number> = {
  TERMS: 1,
  ARBITRATION: 2,
  BILLING: 3,
  PRIVACY: 4,
};

const TRACKING_QUERY_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'ref',
  'source',
  'fbclid',
  'gclid',
  'mc_eid',
]);

/**
 * Normalizes and compares two URLs to determine if they target the same resource/page.
 */
export function isSamePage(url1: string, url2: string): boolean {
  try {
    const u1 = new URL(url1);
    const u2 = new URL(url2);
    const host1 = u1.hostname.replace(/^www\./, '').toLowerCase();
    const host2 = u2.hostname.replace(/^www\./, '').toLowerCase();
    const path1 = u1.pathname.replace(/\/+$/, '').toLowerCase();
    const path2 = u2.pathname.replace(/\/+$/, '').toLowerCase();
    return host1 === host2 && path1 === path2 && u1.search === u2.search;
  } catch {
    return url1.trim().toLowerCase() === url2.trim().toLowerCase();
  }
}

/**
 * Strips tracking query parameters and hash anchors from candidate URLs.
 */
export function sanitizeCandidateUrl(rawUrl: string, baseUrl?: string): string | null {
  try {
    const parsed = baseUrl ? new URL(rawUrl, baseUrl) : new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    // Strip hash fragment
    parsed.hash = '';

    // Strip ad/analytics tracking parameters
    const toDelete: string[] = [];
    parsed.searchParams.forEach((_, key) => {
      if (TRACKING_QUERY_PARAMS.has(key.toLowerCase()) || key.startsWith('utm_')) {
        toDelete.push(key);
      }
    });
    for (const key of toDelete) {
      parsed.searchParams.delete(key);
    }

    return parsed.href;
  } catch {
    return null;
  }
}

export const CLASSIFICATION_PATTERNS = {
  arbitrationText: /arbitration|dispute\s+resolution|jury\s+trial\s+waiver|jury\s+waiver/i,
  arbitrationHref: /\/(?:arbitration|dispute|jury-waiver)/i,
  termsText: /(?:^terms$|terms\s+(?:of\s+(?:service|use|sale)|&|and|conditions)|user\s+agreement|subscriber\s+agreement|customer\s+agreement|conditions\s+of\s+use|legal\s+terms)/i,
  termsHref: /\/(?:terms|tos|terms-of-service|terms-and-conditions|user-agreement|conditions|subscriber-agreement)/i,
  billingText: /(?:billing\s+terms|recurring\s+terms|subscription\s+terms|cancellation\s+policy|auto-renewal\s+terms)/i,
  billingHref: /\/(?:billing|subscription-terms|auto-renewal|cancellation)/i,
  privacyText: /(?:privacy\s+policy|privacy\s+notice|data\s+policy)/i,
  privacyHref: /\/(?:privacy|privacy-policy)/i,
};

/**
 * Classifies anchor text and href attributes into legal agreement categories.
 */
export function classifyLink(text: string, href: string): { title: string; category: DiscoveredLegalLink['category'] } | null {
  const t = text.trim();
  const lowerText = t.toLowerCase();
  const lowerHref = href.toLowerCase();

  // 1. Mandatory Arbitration / Dispute Resolution
  if (
    CLASSIFICATION_PATTERNS.arbitrationText.test(lowerText) ||
    CLASSIFICATION_PATTERNS.arbitrationHref.test(lowerHref)
  ) {
    return {
      title: t.length > 0 && t.length < 50 ? t : 'Dispute Resolution / Arbitration',
      category: 'ARBITRATION',
    };
  }

  // 2. Terms of Service / User Agreement / Conditions of Use
  if (
    CLASSIFICATION_PATTERNS.termsText.test(lowerText) ||
    CLASSIFICATION_PATTERNS.termsHref.test(lowerHref)
  ) {
    return {
      title: t.length > 0 && t.length < 50 ? t : 'Terms of Service',
      category: 'TERMS',
    };
  }

  // 3. Billing & Subscription Policy
  if (
    CLASSIFICATION_PATTERNS.billingText.test(lowerText) ||
    CLASSIFICATION_PATTERNS.billingHref.test(lowerHref)
  ) {
    return {
      title: t.length > 0 && t.length < 50 ? t : 'Subscription & Billing Terms',
      category: 'BILLING',
    };
  }

  // 4. Privacy Notice
  if (
    CLASSIFICATION_PATTERNS.privacyText.test(lowerText) ||
    CLASSIFICATION_PATTERNS.privacyHref.test(lowerHref)
  ) {
    return {
      title: t.length > 0 && t.length < 50 ? t : 'Privacy Policy',
      category: 'PRIVACY',
    };
  }

  return null;
}

/**
 * Automatically extracts, scores, and prioritizes governing legal agreements
 * present on the current DOM (footers, checkout consent labels, forms) or known domain maps.
 * 
 * Runs 100% locally with ZERO network egress.
 */
export function discoverLegalLinks(
  doc?: Document,
  currentHref?: string
): DiscoveredLegalLink[] {
  const discovered: DiscoveredLegalLink[] = [];
  const seenUrls = new Set<string>();

  const base = currentHref || (typeof window !== 'undefined' ? window.location.href : 'http://localhost');
  let currentHostname = '';
  try {
    currentHostname = new URL(base).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    currentHostname = '';
  }

  // 1. Check Pre-Compiled Well-Known Platform Routes
  if (currentHostname) {
    for (const [domain, entries] of Object.entries(WELL_KNOWN_LEGAL_MAP)) {
      if (currentHostname === domain || currentHostname.endsWith('.' + domain)) {
        for (const entry of entries) {
          const fullUrl = `https://${domain}${entry.path}`;
          if (isSamePage(fullUrl, base)) {
            continue;
          }
          if (!seenUrls.has(fullUrl)) {
            seenUrls.add(fullUrl);
            discovered.push({
              url: fullUrl,
              title: entry.title,
              category: entry.category,
              source: 'WELL_KNOWN',
            });
          }
        }
      }
    }
  }

  // 2. Scan DOM Anchor Elements (Footers, Checkout consent labels, forms)
  if (doc && typeof doc.querySelectorAll === 'function') {
    const anchors = doc.querySelectorAll('a[href]');
    for (let i = 0; i < anchors.length; i++) {
      const a = anchors[i] as HTMLAnchorElement;
      const rawHref = a.getAttribute('href') || '';
      if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('javascript:')) {
        continue;
      }

      const text = (a.innerText || a.textContent || '').trim();
      const classification = classifyLink(text, rawHref);
      if (!classification) continue;

      const cleanUrl = sanitizeCandidateUrl(rawHref, base);
      if (!cleanUrl) continue;

      // Don't surface the exact page the user is currently on
      if (isSamePage(cleanUrl, base)) {
        continue;
      }

      if (!seenUrls.has(cleanUrl)) {
        seenUrls.add(cleanUrl);
        discovered.push({
          url: cleanUrl,
          title: classification.title,
          category: classification.category,
          source: 'DOM_ANCHOR',
        });
      }
    }
  }

  // Sort by category importance: TERMS -> ARBITRATION -> BILLING -> PRIVACY
  discovered.sort((a, b) => {
    const pA = CATEGORY_PRIORITY[a.category] || 99;
    const pB = CATEGORY_PRIORITY[b.category] || 99;
    return pA - pB;
  });

  // Cap at top 4 most relevant governing agreements
  return discovered.slice(0, 4);
}
