import { DetectionRule } from '../types';

export const autoRenewalRules: DetectionRule[] = [
  {
    id: 'AR-001',
    title: 'Negative Option Automatic Renewal',
    category: 'AUTO_RENEWAL',
    classification: 'STATUTORY_VIOLATION',
    severity: 'CRITICAL',
    statute: {
      code: '15 U.S.C. § 8403 (ROSCA) / Cal. Bus. & Prof. Code § 17602',
      title: 'Restore Online Shoppers Confidence Act & State ARL',
      jurisdiction: 'US Federal (ROSCA) & California (AB 2863)',
      plainExplanation: 'Federal ROSCA and state Automatic Renewal Laws require clear, conspicuous disclosure of recurring terms and explicit consumer consent before initial billing.'
    },
    patterns: [
      /automatically\s+(?:renews?|renewing|extend(?:s|ed)?)[^.\n]{0,80}(?:until|unless|each|every|successive)/i,
      /renews?\s+automatically[^.\n]{0,80}(?:on\s+a|each|every|at\s+the\s+end|until|unless)/i,
      /(?:subscription|membership|plan)\s+(?:will\s+automatically|automatically)\s+(?:renews?|renewing)/i,
      /recurring\s+(?:billing|charge|subscription|fee)[^.\n]{0,80}(?:will\s+occur|will\s+be\s+billed|unless\s+you\s+cancel)/i,
      /subscription\s+will\s+continue\s+unless\s+(?:cancelled|canceled)/i,
      /continuous\s+service\s+(?:program|plan|agreement)/i
    ],
    explanation: 'The agreement binds you to automated recurring charges that renew indefinitely until you affirmatively navigate their cancellation procedure.',
    recommendation: 'Verify that clear, upfront billing disclosures and an online cancellation button are present before submitting payment.'
  },
  {
    id: 'AR-002',
    title: 'Asymmetrical Cancellation Dark Pattern (Call/Mail-Only)',
    category: 'AUTO_RENEWAL',
    classification: 'STATUTORY_VIOLATION',
    severity: 'CRITICAL',
    statute: {
      code: '15 U.S.C. § 45(a) (FTC Act § 5) / Cal. Bus. & Prof. Code § 17602(a)(4)',
      title: 'FTC Deceptive Trade Practice & Online Cancellation Mandate',
      jurisdiction: 'US Federal & California',
      plainExplanation: 'If you subscribed online, state statutes and FTC Act § 5 enforcement require that you must be allowed to cancel online through the same medium without having to call or mail.'
    },
    patterns: [
      /(?:cancel|terminate)\s+(?:by\s+calling|only\s+by\s+phone|via\s+telephone|by\s+written\s+notice\s+sent\s+to)/i,
      /(?:to\s+cancel|cancellation)[^.\n]{0,50}must\s+call/i,
      /must\s+call[^.\n]{0,50}(?:to\s+cancel|customer\s+support|business\s+hours)/i,
      /to\s+cancel\s+(?:please\s+call|call|contact)/i,
      /cancellation\s+(?:must\s+be\s+received|notice)\s+at\s+least\s+(?:30|60|90)\s+days\s+prior/i
    ],
    explanation: 'The agreement forces you to call customer support or mail physical letters to cancel a subscription initiated online.',
    recommendation: 'Do not agree unless an immediate online cancellation button is available in your account dashboard.'
  },
  {
    id: 'AR-003',
    title: 'Post-Trial Immediate Conversion Charge',
    category: 'AUTO_RENEWAL',
    classification: 'STATUTORY_VIOLATION',
    severity: 'WARNING',
    statute: {
      code: 'Cal. Bus. & Prof. Code § 17602(a)(2) / N.Y. GBL § 527-a',
      title: 'Free Trial Disclosure Mandate',
      jurisdiction: 'California & New York',
      plainExplanation: 'Companies cannot convert free or discounted trials into full-rate paid subscriptions without upfront, conspicuous disclosure of the price after trial.'
    },
    patterns: [
      /(?:free|introductory|discounted)\s+trial\s+(?:will|shall)\s+(?:automatically\s+convert|be\s+charged|transition)/i,
      /upon\s+the\s+expiration\s+of\s+(?:the\s+free\s+trial|your\s+trial),\s+(?:you\s+will\s+be\s+charged|your\s+account\s+will\s+be\s+billed)/i,
      /after\s+(?:your\s+trial|the\s+trial\s+period),\s+(?:the\s+regular|standard)\s+(?:rate|price|fee)\s+will\s+apply/i
    ],
    explanation: 'A promotional or free trial immediately converts into a recurring subscription billing at full price.',
    recommendation: 'Set a calendar alert or utilize a single-use virtual card before starting the promotional trial.'
  }
];
