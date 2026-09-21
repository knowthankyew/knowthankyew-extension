export type Severity = 'CRITICAL' | 'WARNING' | 'INFO';

export type LegalClassification =
  | 'STATUTORY_VIOLATION'   // Explicit violation of statute (ROSCA non-disclosure, dark cancellation)
  | 'RIGHTS_WAIVER'         // Enforceable under FAA/UCC, but strips consumer access to courts
  | 'ONE_SIDED_DISCRETION'  // Unilateral modification / illusory promise
  | 'SURVEILLANCE_NOTICE';  // Cross-context data brokerage / tracking disclosure

export type TrapCategory = 
  | 'AUTO_RENEWAL'
  | 'ARBITRATION'
  | 'UNILATERAL_CHANGE'
  | 'SURVEILLANCE'
  | 'WARRANTY_DISCLAIMER';

export interface StatuteReference {
  code: string;
  title: string;
  jurisdiction: string;
  plainExplanation: string;
}

export interface DetectionRule {
  id: string;
  title: string;
  category: TrapCategory;
  classification: LegalClassification;
  severity: Severity;
  statute: StatuteReference;
  patterns: RegExp[];
  explanation: string;
  recommendation: string;
}

export interface EvaluationMatch {
  ruleId: string;
  title: string;
  category: TrapCategory;
  classification: LegalClassification;
  severity: Severity;
  statute: StatuteReference;
  explanation: string;
  recommendation: string;
  matchedSnippet: string;
}

export interface DiscoveredLegalLink {
  url: string;
  title: string;
  category: 'TERMS' | 'PRIVACY' | 'BILLING' | 'ARBITRATION';
  source: 'DOM_ANCHOR' | 'WELL_KNOWN';
}

export interface PageScanResult {
  timestamp: string;
  urlDomain: string;
  scannedLength: number;
  matches: EvaluationMatch[];
  riskScore: number;
  summary: {
    critical: number;
    warning: number;
    info: number;
  };
  limitationsNotice: string;
  discoveredLinks?: DiscoveredLegalLink[];
}
