/**
 * Service contract interfaces for the KnowThankYew Local ML Reality Engine tier.
 * Defines request/response payloads for the loopback worker (http://127.0.0.1:8420).
 */

export interface HealthResponse {
  status: 'ok' | 'degraded';
  model: string;
  contextWindow: number;
  latencyMs: number;
  burnSupported: boolean;
}

export interface CandidateLinkItem {
  id: number;
  text: string;
  href: string;
  surroundingContext?: string;
}

export interface ClassifyLinksRequest {
  domain: string;
  pageType: 'home' | 'checkout' | 'terms' | 'unknown';
  candidates: CandidateLinkItem[];
}

export interface ClassifyLinksResponse {
  primaryConsumerTermsId: number | null;
  confidence: number;
  category: 'TERMS' | 'PRIVACY' | 'BILLING' | 'ARBITRATION';
  reasoning: string;
}

export interface AnalyzeClauseRequest {
  clauseText: string;
  categoryHint?: string;
}

export interface AnalyzeClauseResponse {
  plainEnglishSummary: string;
  hiddenObligations: string[];
  rightsSurrendered: string[];
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
}

export interface BurnResponse {
  status: 'burned';
  memoryClearedBytes: number;
  sessionPurged: boolean;
}

export interface LocalMLProvider {
  isAvailable(): Promise<boolean>;
  getHealth(): Promise<HealthResponse | null>;
  classifyLinks(request: ClassifyLinksRequest): Promise<ClassifyLinksResponse | null>;
  analyzeClause(request: AnalyzeClauseRequest): Promise<AnalyzeClauseResponse | null>;
  burn(): Promise<BurnResponse | null>;
}
