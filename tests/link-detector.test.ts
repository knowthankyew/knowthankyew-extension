/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import safeRegex from 'safe-regex';
import {
  sanitizeCandidateUrl,
  isSamePage,
  classifyLink,
  discoverLegalLinks,
  WELL_KNOWN_LEGAL_MAP,
  CLASSIFICATION_PATTERNS,
} from '../src/content/link-detector';

describe('Legal Terms Link Discovery Engine (link-detector.ts)', () => {
  describe('Static ReDoS Analysis for Classification Patterns', () => {
    it('verifies all classification regexes are provably free of catastrophic backtracking', () => {
      for (const [name, pattern] of Object.entries(CLASSIFICATION_PATTERNS)) {
        const isSafe = safeRegex(pattern);
        expect(isSafe, `Pattern ${name} (${pattern.toString()}) must be safe from ReDoS`).toBe(true);
      }
    });
  });

  describe('sanitizeCandidateUrl', () => {
    it('resolves relative URLs against the base URL', () => {
      const sanitized = sanitizeCandidateUrl('/terms', 'https://example.com/checkout');
      expect(sanitized).toBe('https://example.com/terms');
    });

    it('strips hash fragments from candidate URLs', () => {
      const sanitized = sanitizeCandidateUrl('https://example.com/terms#section-dispute');
      expect(sanitized).toBe('https://example.com/terms');
    });

    it('strips tracking query parameters (utm, ref, fbclid, gclid)', () => {
      const raw = 'https://example.com/legal/terms?utm_source=email&utm_campaign=winter&ref=footer&fbclid=123&legal_ver=2026';
      const sanitized = sanitizeCandidateUrl(raw);
      expect(sanitized).toBe('https://example.com/legal/terms?legal_ver=2026');
      expect(sanitized).not.toContain('utm_source');
      expect(sanitized).not.toContain('ref');
      expect(sanitized).not.toContain('fbclid');
    });

    it('rejects non-HTTP/HTTPS protocols', () => {
      expect(sanitizeCandidateUrl('javascript:alert(1)')).toBeNull();
      expect(sanitizeCandidateUrl('mailto:legal@example.com')).toBeNull();
      expect(sanitizeCandidateUrl('data:text/html,<h1>Terms</h1>')).toBeNull();
    });
  });

  describe('isSamePage', () => {
    it('identifies identical URLs as the same page', () => {
      expect(isSamePage('https://example.com/terms', 'https://example.com/terms')).toBe(true);
    });

    it('normalizes trailing slashes and www prefix', () => {
      expect(isSamePage('https://www.example.com/terms/', 'https://example.com/terms')).toBe(true);
      expect(isSamePage('https://example.com/about/', 'https://example.com/about')).toBe(true);
    });

    it('differentiates distinct paths and query strings', () => {
      expect(isSamePage('https://example.com/checkout', 'https://example.com/terms')).toBe(false);
      expect(isSamePage('https://example.com/terms?v=1', 'https://example.com/terms?v=2')).toBe(false);
    });
  });

  describe('classifyLink', () => {
    it('classifies Terms of Service variants', () => {
      expect(classifyLink('Terms of Service', '/terms')?.category).toBe('TERMS');
      expect(classifyLink('Terms & Conditions', '/legal')?.category).toBe('TERMS');
      expect(classifyLink('User Agreement', '/agreement')?.category).toBe('TERMS');
      expect(classifyLink('Subscriber Agreement', '/subscriber')?.category).toBe('TERMS');
      expect(classifyLink('Terms', '/policy')?.category).toBe('TERMS');
      expect(classifyLink('Read our conditions', '/conditions')?.category).toBe('TERMS');
    });

    it('classifies Dispute Resolution and Arbitration clauses', () => {
      expect(classifyLink('Dispute Resolution', '/dispute')?.category).toBe('ARBITRATION');
      expect(classifyLink('Binding Arbitration Agreement', '/legal/terms')?.category).toBe('ARBITRATION');
      expect(classifyLink('Jury Trial Waiver', '/waiver')?.category).toBe('ARBITRATION');
      expect(classifyLink('Review dispute procedures', '/arbitration')?.category).toBe('ARBITRATION');
    });

    it('classifies Billing and Subscription terms', () => {
      expect(classifyLink('Subscription Terms', '/billing')?.category).toBe('BILLING');
      expect(classifyLink('Auto-Renewal Terms', '/sub-terms')?.category).toBe('BILLING');
      expect(classifyLink('Cancellation Policy', '/cancel')?.category).toBe('BILLING');
    });

    it('classifies Privacy Notices', () => {
      expect(classifyLink('Privacy Policy', '/privacy')?.category).toBe('PRIVACY');
      expect(classifyLink('Privacy Notice', '/data-protection')?.category).toBe('PRIVACY');
      expect(classifyLink('Our policies', '/privacy-policy')?.category).toBe('PRIVACY');
    });

    it('returns null for irrelevant links', () => {
      expect(classifyLink('Home', '/home')).toBeNull();
      expect(classifyLink('Contact Us', '/contact')).toBeNull();
      expect(classifyLink('Company Blog', '/blog')).toBeNull();
      expect(classifyLink('Careers', '/jobs')).toBeNull();
    });
  });

  describe('discoverLegalLinks with DOM anchors', () => {
    it('extracts, classifies, and prioritizes legal links from document DOM', () => {
      document.body.innerHTML = `
        <header><a href="/home">Home</a></header>
        <main>
          <h1>Checkout</h1>
          <label>
            <input type="checkbox" /> I agree to the <a href="/terms-of-service">Terms of Service</a>
            and the <a href="/arbitration-terms">Mandatory Arbitration Policy</a>.
          </label>
        </main>
        <footer>
          <a href="/privacy-policy">Privacy Policy</a>
          <a href="/subscription-terms">Recurring Billing Terms</a>
          <a href="#top">Back to top</a>
          <a href="javascript:void(0)">Help</a>
        </footer>
      `;

      const links = discoverLegalLinks(document, 'https://example.com/checkout');
      expect(links.length).toBe(4);

      // Prioritization order: TERMS -> ARBITRATION -> BILLING -> PRIVACY
      expect(links[0].category).toBe('TERMS');
      expect(links[0].url).toBe('https://example.com/terms-of-service');
      expect(links[0].source).toBe('DOM_ANCHOR');

      expect(links[1].category).toBe('ARBITRATION');
      expect(links[1].url).toBe('https://example.com/arbitration-terms');

      expect(links[2].category).toBe('BILLING');
      expect(links[2].url).toBe('https://example.com/subscription-terms');

      expect(links[3].category).toBe('PRIVACY');
      expect(links[3].url).toBe('https://example.com/privacy-policy');
    });

    it('does not return a discovered link if the user is already on that exact page', () => {
      document.body.innerHTML = `
        <footer>
          <a href="/terms">Terms of Service</a>
          <a href="/privacy">Privacy Policy</a>
        </footer>
      `;

      // Current page is the terms page itself
      const links = discoverLegalLinks(document, 'https://example.com/terms');
      expect(links.length).toBe(1);
      expect(links[0].url).toBe('https://example.com/privacy');
    });
  });

  describe('discoverLegalLinks with Pre-Compiled Canonical Platform Routes', () => {
    it('resolves DoorDash consumer terms on any DoorDash domain or subdomain', () => {
      const links = discoverLegalLinks(undefined, 'https://www.doordash.com/consumer/checkout');
      expect(links.length).toBeGreaterThanOrEqual(1);

      const doordashTerms = links.find(l => l.category === 'TERMS');
      expect(doordashTerms).toBeDefined();
      expect(doordashTerms?.url).toBe('https://doordash.com/consumers/s/terms-and-conditions-us');
      expect(doordashTerms?.source).toBe('WELL_KNOWN');
    });

    it('resolves Fiverr terms and privacy routes', () => {
      const links = discoverLegalLinks(undefined, 'https://fiverr.com/categories/programming-tech');
      expect(links.length).toBe(2);

      const terms = links.find(l => l.category === 'TERMS');
      const privacy = links.find(l => l.category === 'PRIVACY');

      expect(terms?.url).toBe('https://fiverr.com/terms_of_service');
      expect(privacy?.url).toBe('https://fiverr.com/privacy-policy');
    });

    it('suppresses well-known route if user is already viewing that exact contract', () => {
      const links = discoverLegalLinks(undefined, 'https://doordash.com/consumers/s/terms-and-conditions-us');
      const doordashTerms = links.find(l => l.url === 'https://doordash.com/consumers/s/terms-and-conditions-us');
      expect(doordashTerms).toBeUndefined();
    });

    it('verifies WELL_KNOWN_LEGAL_MAP registers canonical routes for key consumer platforms', () => {
      expect(WELL_KNOWN_LEGAL_MAP['fiverr.com']).toBeDefined();
      expect(WELL_KNOWN_LEGAL_MAP['doordash.com']).toBeDefined();
      expect(WELL_KNOWN_LEGAL_MAP['spotify.com']).toBeDefined();
      expect(WELL_KNOWN_LEGAL_MAP['netflix.com']).toBeDefined();
      expect(WELL_KNOWN_LEGAL_MAP['adobe.com']).toBeDefined();
    });
  });
});
