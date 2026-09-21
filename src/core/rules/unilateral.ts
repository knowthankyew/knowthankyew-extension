import { DetectionRule } from '../types';

export const unilateralRules: DetectionRule[] = [
  {
    id: 'UNI-001',
    title: 'Unilateral Contract Modification Without Prior Notice',
    category: 'UNILATERAL_CHANGE',
    classification: 'ONE_SIDED_DISCRETION',
    severity: 'WARNING',
    statute: {
      code: 'Restatement (Second) of Contracts § 211 / Illusory Promise Doctrine',
      title: 'Common Law Contract Modification Standards',
      jurisdiction: 'US Common Law',
      plainExplanation: 'Courts frequently find provisions granting unlimited unilateral rights to alter material terms without notice to be unenforceable illusory promises.'
    },
    patterns: [
      /reserve\s+the\s+right\s+to\s+(?:modify|change|alter|update|amend)\s+these\s+terms[^.\n]{0,60}(?:without\s+notice|in\s+our\s+sole\s+discretion)/i,
      /we\s+may\s+(?:change|modify|amend)\s+these\s+terms\s+in\s+our\s+sole\s+discretion\s+without\s+liability/i,
      /modifications\s+are\s+effective\s+immediately\s+upon\s+posting/i
    ],
    explanation: 'The platform claims the power to rewrite their agreement with you at any time without advance notice or affirmative re-consent.',
    recommendation: 'Periodically monitor recurring pricing and terms directly rather than assuming terms remain fixed.'
  },
  {
    id: 'UNI-002',
    title: 'Passive Deemed Consent via Continued Usage',
    category: 'UNILATERAL_CHANGE',
    classification: 'ONE_SIDED_DISCRETION',
    severity: 'INFO',
    statute: {
      code: '15 U.S.C. § 45 (FTC Act § 5 - Deceptive Omissions)',
      title: 'Inferred Consent & Unfair Trade Practice',
      jurisdiction: 'US Federal',
      plainExplanation: 'Treating silence or normal app usage as affirmative assent to modified material terms is scrutinized as an unfair business practice.'
    },
    patterns: [
      /(?:your\s+)?continued\s+use[^.\n]{0,60}(?:constitute|signif(?:y|ies))\s+(?:your\s+)?acceptance/i,
      /by\s+continuing\s+to\s+(?:access|use)[^.\n]{0,60}agree\s+to\s+be\s+bound/i,
      /continued\s+use\s+following\s+any\s+updates\s+constitutes\s+binding\s+agreement/i
    ],
    explanation: 'Simply logging into your account is treated by the company as your legal signature accepting their newly revised terms.',
    recommendation: 'Check policy revision dates if you notice billing or feature changes in your service.'
  }
];
