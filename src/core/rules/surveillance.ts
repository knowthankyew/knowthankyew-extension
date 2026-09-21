import { DetectionRule } from '../types';

export const surveillanceRules: DetectionRule[] = [
  {
    id: 'SURV-001',
    title: 'Third-Party Behavioral Data Sale & Advertising Sharing',
    category: 'SURVEILLANCE',
    classification: 'SURVEILLANCE_NOTICE',
    severity: 'WARNING',
    statute: {
      code: 'Cal. Civ. Code § 1798.120 (CCPA/CPRA) / Multi-State Privacy',
      title: 'Consumer Opt-Out of Data Sale & Cross-Context Sharing',
      jurisdiction: 'California & Multi-State',
      plainExplanation: 'Consumers possess an unconditional statutory right to direct businesses to cease selling or sharing their personal information for cross-context behavioral advertising.'
    },
    patterns: [
      /share\s+(?:your\s+personal\s+information|your\s+data)[^.\n]{0,80}(?:advertisers|data\s+brokers|marketing\s+partners)[^.\n]{0,60}(?:targeted|cross-context)/i,
      /we\s+may\s+sell(?:,\s+rent,?\s+or\s+trade)?[^.\n]{0,40}(?:your\s+information|user\s+data|personal\s+data)/i,
      /third\s+parties\s+may\s+collect\s+information\s+about\s+your\s+online\s+activities/i
    ],
    explanation: 'The policy states that your personal data and online habits may be sold, licensed, or shared with commercial data brokers or advertisers.',
    recommendation: 'Look for a "Do Not Sell or Share My Personal Information" link in the page footer and exercise your statutory opt-out.'
  },
  {
    id: 'SURV-002',
    title: 'Continuous Background Location or Biometric Collection',
    category: 'SURVEILLANCE',
    classification: 'SURVEILLANCE_NOTICE',
    severity: 'INFO',
    statute: {
      code: '740 ILCS 14/ (BIPA) / Cal. Civ. Code § 1798.140',
      title: 'Biometric Information Privacy & Precise Geolocation',
      jurisdiction: 'Illinois & California',
      plainExplanation: 'Continuous collection of precise GPS location or biometric identifiers requires explicit written authorization and publicly available retention schedules.'
    },
    patterns: [
      /collects?\s+precise\s+(?:geolocation|location\s+data)[^.\n]{0,60}(?:closed|background)/i,
      /(?:voice\s+recordings|facial\s+geometry|biometric\s+identifiers)[^.\n]{0,60}(?:stored|analyzed)/i
    ],
    explanation: 'The platform retains rights to track your precise physical coordinates or analyze biometric identifiers continuously.',
    recommendation: 'Deny persistent location permissions in your browser unless strictly needed for local services.'
  }
];
