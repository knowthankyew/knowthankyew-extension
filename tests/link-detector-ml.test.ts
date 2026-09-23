/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { discoverLegalLinksWithML } from '../src/content/link-detector';
import { LocalMLProvider } from '../src/ml/types';

describe('2-Stage Legal Link Discovery with ML Reranking (link-detector-ml.test.ts)', () => {
  it('falls back to heuristic discovery when ML provider is not provided or offline', async () => {
    document.body.innerHTML = `
      <footer>
        <a href="/legal/terms">Terms of Service</a>
        <a href="/legal/privacy">Privacy Policy</a>
      </footer>
    `;

    const linksWithoutProvider = await discoverLegalLinksWithML(document, 'https://example.com');
    expect(linksWithoutProvider.length).toBe(2);
    expect(linksWithoutProvider[0].title).toBe('Terms of Service');

    const offlineProvider: LocalMLProvider = {
      isAvailable: vi.fn().mockResolvedValue(false),
      getHealth: vi.fn().mockResolvedValue(null),
      classifyLinks: vi.fn().mockResolvedValue(null),
      analyzeClause: vi.fn().mockResolvedValue(null),
      burn: vi.fn().mockResolvedValue(null),
    };

    const linksWithOffline = await discoverLegalLinksWithML(document, 'https://example.com', offlineProvider);
    expect(linksWithOffline.length).toBe(2);
    expect(offlineProvider.classifyLinks).not.toHaveBeenCalled();
  });

  it('promotes the ML-selected primary consumer terms contract to the top', async () => {
    document.body.innerHTML = `
      <footer>
        <a href="https://doordash.com/merchant">Merchant Agreement</a>
        <a href="https://doordash.com/consumer-terms">Consumer Terms of Service</a>
        <a href="https://doordash.com/dasher">Dasher Terms</a>
      </footer>
    `;

    const mockProvider: LocalMLProvider = {
      isAvailable: vi.fn().mockResolvedValue(true),
      getHealth: vi.fn().mockResolvedValue({ status: 'ok', model: 'SmolLM2', contextWindow: 4096, latencyMs: 10, burnSupported: true }),
      classifyLinks: vi.fn().mockResolvedValue({
        primaryConsumerTermsId: 2, // Consumer Terms of Service
        confidence: 0.98,
        category: 'TERMS',
        reasoning: 'Selected consumer agreement over merchant portal and dasher courier terms',
      }),
      analyzeClause: vi.fn().mockResolvedValue(null),
      burn: vi.fn().mockResolvedValue({ status: 'burned', memoryClearedBytes: 0, sessionPurged: true }),
    };

    const links = await discoverLegalLinksWithML(document, 'https://doordash.com', mockProvider);
    expect(links.length).toBeGreaterThanOrEqual(2);
    // The consumer terms should be promoted to index 0
    expect(links[0].url).toBe('https://doordash.com/consumer-terms');
    expect(links[0].title).toBe('Consumer Terms of Service');
  });
});
