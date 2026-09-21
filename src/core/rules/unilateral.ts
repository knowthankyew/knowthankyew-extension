import { DetectionRule } from '../types';

export const unilateralRules: DetectionRule[] = [
  {
    id: 'UNI-001',
    title: 'Unilateral Modification Without Notice',
    category: 'UNILATERAL_CHANGE',
    severity: 'CRITICAL',
    statute: {
      code: 'Restatement (Second) of Contracts § 211 / CFPB Circular 2024-03',
      title: 'Illusory Promise & Unilateral Contract Modification',
      jurisdiction: 'Common Law & Federal Consumer Financial Protection',
      plainExplanation: 'Terms of service cannot reserve the unlimited right to alter terms or pricing retroactively without requiring affirmative consumer consent.'
    },
    patterns: [
      /reserve\s+the\s+right\s+to\s+(?:modify|change|alter|update|amend)\s+these\s+terms\s+(?:at\s+any\s+time|from\s+time\s+to\s+time)\s+without\s+(?:prior\s+)?notice/i,
      /we\s+may\s+(?:change|modify|amend)\s+these\s+terms\s+in\s+our\s+sole\s+discretion\s+without\s+liability/i,
      /modifications\s+are\s+effective\s+immediately\s+upon\s+posting/i
    ],
    explanation: 'The company claims the power to rewrite their contract with you at any time without giving you notice or asking for your consent.',
    recommendation: 'Beware of sudden price increases, feature removals, or data collection expansions under this clause.'
  },
  {
    id: 'UNI-002',
    title: 'Deemed Consent via Continued Use',
    category: 'UNILATERAL_CHANGE',
    severity: 'WARNING',
    statute: {
      code: 'FTC Act § 5 (Unfair and Deceptive Practices)',
      title: 'Deceptive Inferred Consent Standard',
      jurisdiction: 'US Federal',
      plainExplanation: 'Treating passive inaction or normal app use as binding legal consent to modified material terms is considered an unfair consumer practice.'
    },
    patterns: [
      /(?:your\s+)?continued\s+use.*?(?:shall|will)?\s*(?:constitute|signif(?:y|ies))\s+(?:your\s+)?acceptance/i,
      /by\s+continuing\s+to\s+(?:access|use)\s+(?:the\s+service|our\s+platform).*?you\s+agree\s+to\s+be\s+bound\s+by\s+the\s+revised/i,
      /continued\s+use\s+following\s+any\s+updates\s+constitutes\s+binding\s+agreement/i
    ],
    explanation: 'Simply opening the app or staying logged in is treated by the company as your legal signature on their new terms.',
    recommendation: 'Periodically check subscription terms directly rather than assuming terms remain unchanged.'
  }
];
