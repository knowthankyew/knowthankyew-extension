import { DetectionRule } from '../types';

export const autoRenewalRules: DetectionRule[] = [
  {
    id: 'AR-001',
    title: 'Automatic Negative Option Renewal',
    category: 'AUTO_RENEWAL',
    severity: 'CRITICAL',
    statute: {
      code: '15 U.S.C. § 8403 (ROSCA) / Cal. Bus. & Prof. Code § 17602',
      title: 'Restore Online Shoppers Confidence Act & State ARL',
      jurisdiction: 'US Federal & California',
      plainExplanation: 'Federal ROSCA and state Automatic Renewal Laws require clear disclosure of recurring terms and explicit consumer consent before initial billing.'
    },
    patterns: [
      /automatically\s+(?:renews?|renewing|extend(?:s|ed)?).*?(?:until|unless|each|every|successive)/i,
      /renews?\s+automatically.*?(?:on\s+a|each|every|at\s+the\s+end|until|unless)/i,
      /(?:subscription|membership|plan).*?automatically\s+(?:renews?|renewing)/i,
      /recurring\s+(?:billing|charge|subscription|fee).*?(?:will\s+occur|will\s+be\s+billed|unless\s+you\s+cancel)/i,
      /subscription\s+will\s+continue\s+unless\s+(?:cancelled|canceled)/i,
      /continuous\s+service\s+(?:program|plan|agreement)/i
    ],
    explanation: 'The contract binds you to automated recurring charges that renew indefinitely until you affirmatively navigate their cancellation procedure.',
    recommendation: 'Check whether the service provides an immediate, equivalent online cancellation mechanism before submitting payment details.'
  },
  {
    id: 'AR-002',
    title: 'Burdensome Cancellation Obstacle (Dark Pattern)',
    category: 'AUTO_RENEWAL',
    severity: 'CRITICAL',
    statute: {
      code: '15 U.S.C. § 45(a) / Cal. Bus. & Prof. Code § 17602(a)(4)',
      title: 'FTC Act § 5 (Unfair Practices) & Symmetrical Cancellation',
      jurisdiction: 'US Federal & State Law',
      plainExplanation: 'Federal enforcement under FTC Act § 5 and state statutes mandate that consumers who subscribe online must be provided a simple, online mechanism to terminate recurring billing.'
    },
    patterns: [
      /(?:cancel|terminate)\s+(?:by\s+calling|only\s+by\s+phone|via\s+telephone|by\s+written\s+notice\s+sent\s+to)/i,
      /(?:to\s+cancel|cancellation).*?must\s+call/i,
      /must\s+call.*?(?:to\s+cancel|customer\s+support|business\s+hours)/i,
      /to\s+cancel(?:,\s+please)?\s+(?:call|contact)/i,
      /cancellation\s+(?:must\s+be\s+received|notice)\s+at\s+least\s+(?:30|60|90)\s+days\s+prior/i
    ],
    explanation: 'The agreement forces you to call customer support, send physical mail, or navigate artificial delays to cancel a service you bought online.',
    recommendation: 'Do not agree unless an online self-service cancellation button is clearly available in your account settings.'
  },
  {
    id: 'AR-003',
    title: 'Post-Trial Immediate Conversion Charge',
    category: 'AUTO_RENEWAL',
    severity: 'WARNING',
    statute: {
      code: 'Cal. Bus. & Prof. Code § 17602(a)(2)',
      title: 'Free Trial Disclosure Mandate',
      jurisdiction: 'California & Multi-State',
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
