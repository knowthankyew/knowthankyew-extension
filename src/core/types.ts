export type Severity = 'CRITICAL' | 'WARNING' | 'INFO';

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
  severity: Severity;
  statute: StatuteReference;
  explanation: string;
  recommendation: string;
  matchedSnippet: string;
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
}
