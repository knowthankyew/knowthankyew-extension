import { Severity, TrapCategory, DiscoveredLegalLink } from './types';

export type DestinationToolId =
  | 'bill-of-rights-bot'
  | 'lease-audit'
  | 'care-check'
  | 'warranty-watch'
  | 'paystub-check';

export interface DestinationToolMetadata {
  id: DestinationToolId;
  name: string;
  tagline: string;
  productionUrl: string;
  localDevUrl: string;
  supportedCategories: TrapCategory[];
}

export interface KtyHandoffFinding {
  ruleId: string;
  title: string;
  category: TrapCategory;
  severity: Severity;
  statuteCode: string;
  statuteTitle: string;
  matchedSnippet: string; // Must already be sanitized
  explanation: string;
  recommendation: string;
}

export interface KtyHandoffPayload {
  version: '1.0';
  originApp: 'knowthankyew-extension';
  domain: string;
  scanTimestamp: string;
  riskScore: number;
  summary: {
    critical: number;
    warning: number;
    info: number;
  };
  findings: KtyHandoffFinding[];
  primaryLegalLink: DiscoveredLegalLink | null;
  targetTool: DestinationToolId;
}

export const KTY_HANDOFF_SESSION_KEY = 'kty_handoff';
