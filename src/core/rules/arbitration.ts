import { DetectionRule } from '../types';

export const arbitrationRules: DetectionRule[] = [
  {
    id: 'ARB-001',
    title: 'Mandatory Binding Arbitration & Jury Waiver',
    category: 'ARBITRATION',
    classification: 'RIGHTS_WAIVER',
    severity: 'WARNING',
    statute: {
      code: '9 U.S.C. § 2 (FAA Enforcement) / U.S. Const. amend. VII',
      title: 'Federal Arbitration Act & 7th Amendment Jury Right',
      jurisdiction: 'US Federal',
      plainExplanation: 'Enforceable under the Federal Arbitration Act (9 U.S.C. § 2). While lawful, it compels consumers to resolve disputes in private confidential forums instead of public courtrooms.'
    },
    patterns: [
      /any\s+dispute(?:,\s+claim,?\s+or\s+controversy)?[^.\n]{0,80}shall\s+be\s+resolved\s+by\s+binding\s+arbitration/i,
      /you\s+and\s+(?:the\s+company|we)\s+agree\s+that\s+any\s+(?:and\s+all\s+)?disputes?[^.\n]{0,80}resolved\s+exclusively[^.\n]{0,40}binding\s+arbitration/i,
      /waive\s+(?:any\s+right\s+to\s+a|the\s+right\s+to\s+a)\s+jury\s+trial/i,
      /administered\s+by\s+the\s+american\s+arbitration\s+association/i,
      /administered\s+by\s+jams\s+(?:pursuant\s+to|under)/i
    ],
    explanation: 'Lawful under federal law, but you surrender your constitutional right to a jury trial and access to a public court of law if the company harms you.',
    recommendation: 'Check whether the agreement includes a 30-day opt-out window to reject arbitration while maintaining your account.'
  },
  {
    id: 'ARB-002',
    title: 'Class Action & Collective Lawsuit Waiver',
    category: 'ARBITRATION',
    classification: 'RIGHTS_WAIVER',
    severity: 'WARNING',
    statute: {
      code: 'Fed. R. Civ. P. 23 / AT&T Mobility LLC v. Concepcion',
      title: 'Class Action Ban & Representative Action Waiver',
      jurisdiction: 'US Federal',
      plainExplanation: 'Prevents consumers from joining together in collective lawsuits, shielding companies from aggregate accountability for widespread small-dollar overcharges.'
    },
    patterns: [
      /waive\s+(?:any\s+right\s+to\s+bring|the\s+right\s+to\s+pursue|any\s+right\s+to\s+participate\s+in)\s+(?:any\s+class|a\s+class\s+action|representative\s+action)/i,
      /no\s+arbitration\s+or\s+(?:proceeding|claim)\s+shall\s+be\s+joined\s+with\s+any\s+other/i,
      /you\s+may\s+only\s+resolve\s+disputes\s+(?:with\s+us\s+)?on\s+an\s+individual\s+basis/i,
      /may\s+not\s+bring\s+a\s+claim\s+as\s+a\s+plaintiff\s+or\s+class\s+member\s+in\s+any\s+purported\s+class/i
    ],
    explanation: 'Forces every consumer into isolated individual dispute proceedings, preventing class-wide relief for systematic issues.',
    recommendation: 'Understand that you cannot join a class settlement if the company engages in unauthorized billing.'
  },
  {
    id: 'ARB-003',
    title: '30-Day Written Mail Opt-Out Provision',
    category: 'ARBITRATION',
    classification: 'RIGHTS_WAIVER',
    severity: 'INFO',
    statute: {
      code: 'UCC § 2-302 / Procedural Arbitration Opt-Out',
      title: 'Dispute Resolution Opt-Out Mechanism',
      jurisdiction: 'Uniform Commercial Code',
      plainExplanation: 'A provision allowing consumers to reject binding arbitration and preserve court access if notice is provided within a limited timeframe.'
    },
    patterns: [
      /you\s+have\s+the\s+right\s+to\s+opt\s*-\s*out\s+of\s+(?:this\s+arbitration|the\s+arbitration\s+agreement)/i,
      /opt-out\s+notice\s+must\s+be\s+(?:postmarked|received)\s+within\s+30\s+days/i,
      /must\s+mail\s+(?:a\s+written|written)\s+notice\s+of\s+opt-out/i
    ],
    explanation: 'You can legally preserve your right to sue in court, but only if you send an opt-out notice within 30 days of signing up.',
    recommendation: 'If you plan to use this service long-term, send an opt-out notice immediately to preserve your consumer legal remedies.'
  }
];
