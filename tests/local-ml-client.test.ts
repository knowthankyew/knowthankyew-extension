import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LocalMLClient } from '../src/ml/local-ml-client';
import { ClassifyLinksRequest, AnalyzeClauseRequest } from '../src/ml/types';

describe('Local ML Loopback Client & /burn Protocol Handshake (local-ml-client.test.ts)', () => {
  let client: LocalMLClient;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    client = new LocalMLClient('http://127.0.0.1:8420');
    // Force feature enabled for unit testing
    vi.spyOn(client, 'isFeatureEnabled').mockReturnValue(true);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('reports isAvailable() as true when health check returns 200 OK', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'ok',
        model: 'SmolLM2-135M-FTaaS',
        contextWindow: 4096,
        latencyMs: 18,
        burnSupported: true,
      }),
    });

    const isUp = await client.isAvailable();
    expect(isUp).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:8420/health',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('gracefully handles worker offline without crashing', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

    const isUp = await client.isAvailable();
    expect(isUp).toBe(false);

    const health = await client.getHealth();
    expect(health).toBeNull();
  });

  it('classifies and reranks ambiguous candidate legal links via POST /classify-links', async () => {
    const mockResponse = {
      primaryConsumerTermsId: 2,
      confidence: 0.96,
      category: 'TERMS',
      reasoning: 'Identified consumer agreement over merchant portal and courier terms',
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const request: ClassifyLinksRequest = {
      domain: 'doordash.com',
      pageType: 'home',
      candidates: [
        { id: 1, text: 'Become a Dasher', href: 'https://doordash.com/dasher' },
        { id: 2, text: 'Terms of Service', href: 'https://doordash.com/consumers/terms' },
        { id: 3, text: 'Merchant Agreement', href: 'https://doordash.com/merchants' },
      ],
    };

    const result = await client.classifyLinks(request);
    expect(result).toEqual(mockResponse);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:8420/classify-links',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(request),
      })
    );
  });

  it('analyzes clause snippets via POST /analyze', async () => {
    const mockAnalysis = {
      plainEnglishSummary: 'You forfeit your right to join a class-action lawsuit.',
      hiddenObligations: ['Must submit dispute to private AAA arbitrator within 1 year'],
      rightsSurrendered: ['7th Amendment jury trial', 'Class action participation'],
      severity: 'WARNING',
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockAnalysis,
    });

    const request: AnalyzeClauseRequest = {
      clauseText: 'Any dispute shall be resolved on an individual basis in binding arbitration.',
      categoryHint: 'ARBITRATION',
    };

    const result = await client.analyzeClause(request);
    expect(result).toEqual(mockAnalysis);
  });

  it('fulfills Pillar 5 Hard Burn handshake by dispatching POST /burn', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'burned',
        memoryClearedBytes: 1048576,
        sessionPurged: true,
      }),
    });

    const result = await client.burn();
    expect(result).toEqual({
      status: 'burned',
      memoryClearedBytes: 1048576,
      sessionPurged: true,
    });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:8420/burn',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ action: 'PURGE_ALL_SESSION_STATE' }),
      })
    );
  });
});
