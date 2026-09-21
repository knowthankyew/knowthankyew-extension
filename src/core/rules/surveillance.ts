import { DetectionRule } from '../types';

export const surveillanceRules: DetectionRule[] = [
  {
    id: 'SURV-001',
    title: 'Third-Party Behavioral Data Sale / Brokerage',
    category: 'SURVEILLANCE',
    severity: 'CRITICAL',
    statute: {
      code: 'Cal. Civ. Code § 1798.120 (CCPA / CPRA) / GDPR Art. 6',
      title: 'Consumer Right to Opt-Out of Data Sale & Sharing',
      jurisdiction: 'California & Global',
      plainExplanation: 'Consumers have an unconditional statutory right to prohibit businesses from selling, sharing, or cross-context tracking their personal information.'
    },
    patterns: [
      /share\s+(?:your\s+personal\s+information|your\s+data)\s+with\s+(?:third-party|third\s+party)\s+(?:advertisers|data\s+brokers|marketing\s+partners)\s+for\s+(?:targeted|cross-context)/i,
      /we\s+may\s+sell(?:,\s+rent,?\s+or\s+trade)?\s+(?:your\s+information|user\s+data|personal\s+data)/i,
      /third\s+parties\s+may\s+collect\s+information\s+about\s+your\s+online\s+activities\s+over\s+time\s+and\s+across\s+different\s+websites/i
    ],
    explanation: 'The policy states that your personal data and online habits may be sold, licensed, or shared with commercial data brokers or advertisers.',
    recommendation: 'Look for a "Do Not Sell or Share My Personal Information" link in the page footer and exercise your statutory opt-out.'
  },
  {
    id: 'SURV-002',
    title: 'Biometric or Location Continuous Tracking',
    category: 'SURVEILLANCE',
    severity: 'WARNING',
    statute: {
      code: '740 ILCS 14/ (BIPA) / CPRA § 1798.140',
      title: 'Biometric Information Privacy & Precise Geolocation',
      jurisdiction: 'Illinois & Multi-State',
      plainExplanation: 'Continuous collection of precise GPS location or biometric identifiers requires explicit written authorization and public retention schedules.'
    },
    patterns: [
      /collects?\s+precise\s+(?:geolocation|location\s+data)\s+(?:even\s+when\s+the\s+app\s+is\s+closed|in\s+the\s+background)/i,
      /voice\s+recordings|facial\s+geometry|biometric\s+identifiers.*?may\s+be\s+stored\s+and\s+analyzed/i
    ],
    explanation: 'The platform retains rights to track your precise physical coordinates or analyze biometric features continuously.',
    recommendation: 'Deny location permissions in your browser unless strictly needed for local services.'
  }
];
