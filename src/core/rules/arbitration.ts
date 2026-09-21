import { DetectionRule } from '../types';

export const arbitrationRules: DetectionRule[] = [
  {
    id: 'ARB-001',
    title: 'Mandatory Binding Arbitration Waiver',
    category: 'ARBITRATION',
    severity: 'CRITICAL',
    statute: {
      code: '9 U.S.C. § 2 / Consumer Due Process Protocol',
      title: 'Federal Arbitration Act & Consumer Dispute Standard',
      jurisdiction: 'US Federal',
      plainExplanation: 'Forces disputes out of public courtrooms and constitutional juries into private, confidential corporate arbitration proceedings.'
    },
    patterns: [
      /any\s+dispute(?:,\s+claim,?\s+or\s+controversy)?\s+(?:arising\s+out\s+of|relating\s+to).*?shall\s+be\s+resolved\s+by\s+binding\s+arbitration/i,
      /you\s+and\s+(?:the\s+company|we)\s+agree\s+that\s+any\s+(?:and\s+all\s+)?disputes?\s+will\s+be\s+resolved\s+exclusively\s+(?:through|by)\s+binding\s+arbitration/i,
      /waive\s+(?:any\s+right\s+to\s+a|the\s+right\s+to\s+a)\s+jury\s+trial/i,
      /administered\s+by\s+the\s+american\s+arbitration\s+association/i,
      /administered\s+by\s+jams\s+(?:pursuant\s+to|under)/i
    ],
    explanation: 'You surrender your 7th Amendment right to a jury trial and access to a public court of law in the event the company harms or defrauds you.',
    recommendation: 'Check whether the contract includes a 30-day opt-out window to reject arbitration while retaining service.'
  },
  {
    id: 'ARB-002',
    title: 'Class Action & Collective Lawsuit Waiver',
    category: 'ARBITRATION',
    severity: 'CRITICAL',
    statute: {
      code: 'Fed. R. Civ. P. 23 / State Consumer Remedies Act',
      title: 'Class Action Ban & Representative Action Waiver',
      jurisdiction: 'US Federal & State',
      plainExplanation: 'Prevents injured consumers from joining together in collective lawsuits, effectively killing low-dollar claims where individual legal action is cost-prohibitive.'
    },
    patterns: [
      /waive\s+(?:any\s+right\s+to\s+bring|the\s+right\s+to\s+pursue|any\s+right\s+to\s+participate\s+in)\s+(?:any\s+class|a\s+class\s+action|representative\s+action)/i,
      /no\s+arbitration\s+or\s+(?:proceeding|claim)\s+shall\s+be\s+joined\s+with\s+any\s+other/i,
      /you\s+may\s+only\s+resolve\s+disputes\s+(?:with\s+us\s+)?on\s+an\s+individual\s+basis/i,
      /may\s+not\s+bring\s+a\s+claim\s+as\s+a\s+plaintiff\s+or\s+class\s+member\s+in\s+any\s+purported\s+class/i
    ],
    explanation: 'Forces every injured consumer to fight independently, shielding the company from accountability for widespread systematic overcharges or privacy violations.',
    recommendation: 'Be aware that collective relief is prohibited; you cannot join a class settlement if the company acts unlawfully.'
  },
  {
    id: 'ARB-003',
    title: '30-Day Physical Mail Opt-Out Buried Provision',
    category: 'ARBITRATION',
    severity: 'WARNING',
    statute: {
      code: 'UCC § 2-302 / Unconscionability Doctrine',
      title: 'Dispute Resolution Opt-Out Procedure',
      jurisdiction: 'Uniform Commercial Code',
      plainExplanation: 'Contracts often include an opt-out window, but make it intentionally difficult by demanding notarized letters or specific snail-mail formats.'
    },
    patterns: [
      /you\s+have\s+the\s+right\s+to\s+opt\s*-\s*out\s+of\s+(?:this\s+arbitration|the\s+arbitration\s+agreement)\s+(?:within|by\s+sending)/i,
      /opt-out\s+notice\s+must\s+be\s+(?:postmarked|received)\s+within\s+30\s+days/i,
      /must\s+mail\s+(?:a\s+written|written)\s+notice\s+of\s+opt-out/i
    ],
    explanation: 'You can legally preserve your right to sue in court, but only if you send an opt-out notice within 30 days of accepting the terms.',
    recommendation: 'If you use this service long-term, send an opt-out email or letter right now to preserve your consumer legal rights.'
  }
];
