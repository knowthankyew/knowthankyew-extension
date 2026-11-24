const PRIVACY_FACTS = [
  {
    label: 'Network Egress',
    value: 'connect-src none in extension pages; no network client entitlement in container app.',
  },
  {
    label: 'Declared Permissions',
    value: 'activeTab, storage, scripting — never <all_urls> or background page snooping.',
  },
  {
    label: 'Privacy Manifest',
    value: 'NSPrivacyTracking = false · NSPrivacyCollectedDataTypes = [] (zero data collected).',
  },
  {
    label: 'Handoff Delivery',
    value: 'Uses #kty_handoff URL fragment scrubbed via history.replaceState on load.',
  },
];

const LOCAL_PATTERNS = [
  {
    severity: 'critical',
    title: 'Auto-Renewal / Negative Option',
    statute: 'ROSCA (15 U.S.C. § 8403) · State ARLs',
    pattern: /automatically\s+(?:renews?|renewing)|subscription\s+will\s+continue\s+unless\s+(?:cancelled|canceled)/i,
    summary: 'Binds future recurring billing unless an explicit cancellation workflow is completed.',
  },
  {
    severity: 'critical',
    title: 'Asymmetric Cancellation Obstacle',
    statute: 'FTC Act § 5(a) (15 U.S.C. § 45(a))',
    pattern: /(?:must\s+call|only\s+by\s+phone|written\s+notice\s+sent\s+to)/i,
    summary: 'Requires phone or physical mail steps to exit an online enrollment.',
  },
  {
    severity: 'warning',
    title: 'Mandatory Binding Arbitration / Jury Waiver',
    statute: 'Federal Arbitration Act (9 U.S.C. § 2)',
    pattern: /binding\s+arbitration|waiv(?:e|ing|es|ed)[^.\n]{0,40}jury\s+trial/i,
    summary: 'Shifts disputes out of public courtrooms unless an opt-out notice applies.',
  },
];

const SAMPLE_CLAUSE =
  'Your membership automatically renews monthly unless cancelled at least 7 days prior. To cancel you must call support during business hours. Disputes are resolved by binding arbitration.';

function show(enabled) {
  const badge = document.getElementById('status-badge');
  if (!badge) return;
  if (typeof enabled === 'boolean') {
    badge.textContent = enabled
      ? 'Safari Extension Active · Zero-Egress Enforced'
      : 'Safari Extension Ready — Enable in Safari Settings';
  }
}

function renderPrivacyMatrix() {
  const container = document.getElementById('privacy-matrix');
  if (!container) return;
  container.replaceChildren();
  for (const item of PRIVACY_FACTS) {
    const card = document.createElement('div');
    card.className = 'metric';

    const label = document.createElement('div');
    label.className = 'metric-label';
    label.textContent = item.label;

    const value = document.createElement('div');
    value.className = 'metric-value';
    value.textContent = item.value;

    card.appendChild(label);
    card.appendChild(value);
    container.appendChild(card);
  }
}

function renderClauseCheck() {
  const input = document.getElementById('clause-input');
  const results = document.getElementById('clause-results');
  if (!input || !results) return;

  results.replaceChildren();
  const text = input.value.trim();
  if (!text) {
    const emptyCard = document.createElement('div');
    emptyCard.className = 'finding finding-warning';
    emptyCard.textContent = 'Enter text or load the sample clause to run an offline check.';
    results.appendChild(emptyCard);
    return;
  }

  const hits = LOCAL_PATTERNS.filter((rule) => rule.pattern.test(text));
  if (hits.length === 0) {
    const cleanCard = document.createElement('div');
    cleanCard.className = 'finding finding-ok';
    cleanCard.textContent = 'Zero matching sample triggers detected locally. Note: sparse excerpts never guarantee legal safety.';
    results.appendChild(cleanCard);
    return;
  }

  for (const hit of hits) {
    const card = document.createElement('div');
    card.className = `finding finding-${hit.severity}`;

    const heading = document.createElement('strong');
    heading.textContent = `${hit.title} (${hit.statute})`;

    const body = document.createElement('div');
    body.textContent = hit.summary;

    card.appendChild(heading);
    card.appendChild(body);
    results.appendChild(card);
  }
}

function openPreferences() {
  if (window.webkit?.messageHandlers?.controller) {
    window.webkit.messageHandlers.controller.postMessage('open-preferences');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderPrivacyMatrix();

  const openBtn = document.getElementById('open-safari-settings');
  openBtn?.addEventListener('click', openPreferences);

  const loadBtn = document.getElementById('load-sample-btn');
  loadBtn?.addEventListener('click', () => {
    const input = document.getElementById('clause-input');
    if (input) {
      input.value = SAMPLE_CLAUSE;
      renderClauseCheck();
    }
  });

  const checkBtn = document.getElementById('check-clause-btn');
  checkBtn?.addEventListener('click', renderClauseCheck);

  const burnBtn = document.getElementById('burn-clause-btn');
  burnBtn?.addEventListener('click', () => {
    const input = document.getElementById('clause-input');
    const results = document.getElementById('clause-results');
    if (input) input.value = '';
    if (results) results.replaceChildren();
  });
});

window.show = show;
