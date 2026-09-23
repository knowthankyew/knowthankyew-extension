import {
  LocalMLProvider,
  HealthResponse,
  ClassifyLinksRequest,
  ClassifyLinksResponse,
  AnalyzeClauseRequest,
  AnalyzeClauseResponse,
  BurnResponse,
} from './types';

// Declared via vite.config.ts define (Pillar 2 Invariant: Compile-Time Tree Shaking)
declare const __LOCAL_ML_ENABLED__: boolean;

export class LocalMLClient implements LocalMLProvider {
  private readonly baseUrl: string;
  private cachedHealth: HealthResponse | null = null;
  private lastHealthCheck = 0;
  private readonly healthTtlMs = 15000;

  constructor(baseUrl = 'http://127.0.0.1:8420') {
    this.baseUrl = baseUrl;
  }

  /**
   * Helper that checks whether the local ML tier is enabled at compile-time.
   */
  public isFeatureEnabled(): boolean {
    return typeof __LOCAL_ML_ENABLED__ !== 'undefined' && Boolean(__LOCAL_ML_ENABLED__);
  }

  /**
   * Checks if the local ML loopback service is currently reachable and responding to health pings.
   */
  public async isAvailable(force = false): Promise<boolean> {
    if (!this.isFeatureEnabled()) {
      return false;
    }

    const health = await this.getHealth(force);
    return health !== null && (health.status === 'ok' || health.status === 'degraded');
  }

  /**
   * Pings the loopback worker for model health and latency metrics.
   */
  public async getHealth(force = false): Promise<HealthResponse | null> {
    if (!this.isFeatureEnabled()) {
      return null;
    }

    const now = Date.now();
    if (!force && this.cachedHealth && now - this.lastHealthCheck < this.healthTtlMs) {
      return this.cachedHealth;
    }

    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(1500),
      });

      if (!response.ok) {
        this.cachedHealth = null;
        return null;
      }

      const data = (await response.json()) as HealthResponse;
      this.cachedHealth = data;
      this.lastHealthCheck = now;
      return data;
    } catch {
      this.cachedHealth = null;
      return null;
    }
  }

  /**
   * Dispatches candidate legal links discovered on the active tab for semantic ranking.
   * Disambiguates primary consumer contracts from courier, merchant, or developer agreements.
   */
  public async classifyLinks(request: ClassifyLinksRequest): Promise<ClassifyLinksResponse | null> {
    if (!this.isFeatureEnabled()) {
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/classify-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(1500),
      });

      if (!response.ok) {
        return null;
      }

      return (await response.json()) as ClassifyLinksResponse;
    } catch {
      return null;
    }
  }

  /**
   * Analyzes an isolated legal clause snippet and returns a plain-English explanation.
   */
  public async analyzeClause(request: AnalyzeClauseRequest): Promise<AnalyzeClauseResponse | null> {
    if (!this.isFeatureEnabled()) {
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(3000),
      });

      if (!response.ok) {
        return null;
      }

      return (await response.json()) as AnalyzeClauseResponse;
    } catch {
      return null;
    }
  }

  /**
   * Fulfills the Pillar 5 Hard Burn protocol handshake:
   * Commands the local ML service to wipe its in-memory session history, prompt context, and KV caches.
   */
  public async burn(): Promise<BurnResponse | null> {
    this.cachedHealth = null;
    this.lastHealthCheck = 0;

    if (!this.isFeatureEnabled()) {
      return { status: 'burned', memoryClearedBytes: 0, sessionPurged: true };
    }

    try {
      const response = await fetch(`${this.baseUrl}/burn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'PURGE_ALL_SESSION_STATE' }),
        signal: AbortSignal.timeout(1000),
      });

      if (!response.ok) {
        return null;
      }

      return (await response.json()) as BurnResponse;
    } catch {
      return null;
    }
  }
}

export const localMLClient = new LocalMLClient();
