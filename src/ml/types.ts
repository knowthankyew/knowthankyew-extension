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

/**
 * 4-state availability model for local neural reality engines (Gemini Nano / Chrome Prompt API / Loopback).
 * - 'ready': Model loaded or loopback worker active and responsive.
 * - 'downloading': Device qualifies but on-device weights are downloading.
 * - 'unsupported': Device hardware/storage or Chrome version does not meet capabilities.
 * - 'disabled': User has not opted into Local Assist.
 */
export type NeuralAvailabilityState = 'ready' | 'downloading' | 'unsupported' | 'disabled';

export interface LocalMLProvider {
  isAvailable(force?: boolean): Promise<boolean>;
  checkAvailability?(): Promise<NeuralAvailabilityState>;
  getHealth(force?: boolean): Promise<HealthResponse | null>;
  classifyLinks(request: ClassifyLinksRequest): Promise<ClassifyLinksResponse | null>;
  analyzeClause(request: AnalyzeClauseRequest): Promise<AnalyzeClauseResponse | null>;
  burn(): Promise<BurnResponse | null>;
}

