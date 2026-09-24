import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import { resolve } from 'path';

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // ---------------------------------------------------------------------------
  // 1. Promotional Tiles (exact CWS pixel dimensions — no retina scaling)
  // ---------------------------------------------------------------------------

  // Small promo tile (440x280)
  const smallSvg = readFileSync(resolve('assets/store/promo-small-440x280.svg'), 'utf8');
  await page.setViewport({ width: 440, height: 280, deviceScaleFactor: 1 });
  await page.setContent(`<!DOCTYPE html><html><body style="margin:0;padding:0;overflow:hidden">${smallSvg}</body></html>`);
  await page.screenshot({ path: resolve('assets/store/promo-small-440x280.png'), type: 'png' });
  console.log('✓ Generated assets/store/promo-small-440x280.png (440×280)');

  // Marquee promo tile (1400x560)
  const marqueeSvg = readFileSync(resolve('assets/store/promo-marquee-1400x560.svg'), 'utf8');
  await page.setViewport({ width: 1400, height: 560, deviceScaleFactor: 1 });
  await page.setContent(`<!DOCTYPE html><html><body style="margin:0;padding:0;overflow:hidden">${marqueeSvg}</body></html>`);
  await page.screenshot({ path: resolve('assets/store/promo-marquee-1400x560.png'), type: 'png' });
  console.log('✓ Generated assets/store/promo-marquee-1400x560.png (1400×560)');

  // ---------------------------------------------------------------------------
  // 2. Store Screenshots (1280x800) — Simulated extension UI on dark background
  // ---------------------------------------------------------------------------

  // Screenshot 1: "Findings Detected" — popup overlay on the demo checkout page
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
  await page.setContent(buildScreenshotHTML({
    title: 'Subscription Traps Detected',
    subtitle: 'KnowThankYew instantly flagged 5 predatory clauses in the checkout fine print.',
    findings: [
      { severity: 'CRITICAL', icon: '🔴', label: 'Auto-Renewal Trap', desc: 'Subscription automatically renews each month at the then-standard rate until you cancel.', law: 'ROSCA 15 U.S.C. § 8403' },
      { severity: 'CRITICAL', icon: '🔴', label: 'Cancellation Obstacle', desc: 'Must call customer service hotline during business hours. No email cancellation accepted.', law: 'FTC Symmetrical Cancellation' },
      { severity: 'HIGH', icon: '🟠', label: 'Forced Binding Arbitration', desc: 'Disputes resolved exclusively through binding arbitration. Jury trial rights waived.', law: 'FAA § 2 Rights Waiver' },
      { severity: 'HIGH', icon: '🟠', label: 'Class Action Waiver', desc: 'You waive any right to participate in class action lawsuits or collective proceedings.', law: 'FAA § 2 Rights Waiver' },
      { severity: 'MEDIUM', icon: '🟡', label: 'Unilateral Modification', desc: 'Company reserves the right to change prices and terms at any time without notice.', law: 'Illusory Promise Doctrine' },
    ],
    badgeCount: '5',
    badgeColor: '#ef4444',
  }));
  await page.screenshot({ path: resolve('assets/store/screenshot-1-findings.png'), type: 'png' });
  console.log('✓ Generated assets/store/screenshot-1-findings.png (1280×800)');

  // Screenshot 2: "Zero-Egress Security Invariant" — clean informational
  await page.setContent(buildScreenshotHTML({
    title: 'Zero-Egress Security Invariant',
    subtitle: 'Your documents never leave your device. Enforced by the browser engine itself.',
    infoCards: [
      { icon: '🔒', title: 'Browser-Enforced Air Gap', desc: 'Manifest CSP declares connect-src \'none\'. The Chromium engine physically blocks all outbound network requests from extension pages.' },
      { icon: '🚫', title: 'Zero Host Permissions', desc: 'No <all_urls>, no remote servers, no analytics endpoints. Outbound network egress from extension pages is physically dropped.' },
      { icon: '🧠', title: '100% On-Device Analysis', desc: 'All regex pattern matching and statutory rule evaluation runs locally in your browser tab sandbox.' },
      { icon: '🔥', title: 'Hard Burn Amnesia', desc: 'One click wipes all local storage, flushes memory buffers, and leaves the extension in complete amnesia.' },
    ],
    badgeCount: '✓',
    badgeColor: '#10b981',
  }));
  await page.screenshot({ path: resolve('assets/store/screenshot-2-privacy.png'), type: 'png' });
  console.log('✓ Generated assets/store/screenshot-2-privacy.png (1280×800)');

  // Screenshot 3: "No Findings" — clean state showing the safe-but-honest UX
  await page.setContent(buildScreenshotHTML({
    title: 'No Findings on This Page',
    subtitle: 'No predatory clauses detected — but "No Findings" never means "Safe".',
    emptyState: true,
    emptyMessage: 'The Reality Engine scanned visible DOM text on this page and found zero matches against 37 statutory heuristic rules. This does not guarantee the page is free of predatory terms — external links, cross-origin iframes, and documents behind hyperlinks are not inspectable without explicit navigation.',
    badgeCount: '0',
    badgeColor: '#6b7280',
  }));
  await page.screenshot({ path: resolve('assets/store/screenshot-3-no-findings.png'), type: 'png' });
  console.log('✓ Generated assets/store/screenshot-3-no-findings.png (1280×800)');

  await browser.close();
  console.log('\nAll store assets generated successfully.');
}

/**
 * Build a self-contained HTML page that simulates a polished CWS screenshot
 * showing the extension popup overlaid on a dark background.
 */
function buildScreenshotHTML({ title, subtitle, findings, infoCards, emptyState, emptyMessage, badgeCount, badgeColor }) {
  const findingsHTML = findings ? findings.map(f => `
    <div style="display:flex;gap:12px;padding:14px 16px;background:#111827;border-radius:10px;border:1px solid #1f2937;margin-bottom:10px;">
      <div style="font-size:20px;flex-shrink:0;padding-top:2px;">${f.icon}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:700;color:#fff;font-size:14px;margin-bottom:3px;">${f.label}</div>
        <div style="color:#9ca3af;font-size:12.5px;line-height:1.5;margin-bottom:5px;">${f.desc}</div>
        <div style="display:inline-block;background:rgba(59,130,246,0.12);color:#60a5fa;font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;border:1px solid rgba(59,130,246,0.25);">${f.law}</div>
      </div>
    </div>
  `).join('') : '';

  const infoHTML = infoCards ? `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:8px;">
      ${infoCards.map(c => `
        <div style="background:#111827;border:1px solid #1f2937;border-radius:10px;padding:20px;">
          <div style="font-size:28px;margin-bottom:10px;">${c.icon}</div>
          <div style="font-weight:700;color:#fff;font-size:14px;margin-bottom:6px;">${c.title}</div>
          <div style="color:#9ca3af;font-size:12.5px;line-height:1.5;">${c.desc}</div>
        </div>
      `).join('')}
    </div>
  ` : '';

  const emptyHTML = emptyState ? `
    <div style="text-align:center;padding:40px 20px;margin-top:8px;">
      <div style="font-size:64px;margin-bottom:16px;opacity:0.4;">🛡️</div>
      <div style="color:#6b7280;font-size:13px;line-height:1.7;max-width:360px;margin:0 auto;">${emptyMessage}</div>
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;width:1280px;height:800px;background:#090d16;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;align-items:center;justify-content:center;overflow:hidden;">
  <!-- Subtle brand watermark -->
  <div style="position:absolute;top:28px;left:36px;display:flex;align-items:center;gap:10px;">
    <div style="width:32px;height:32px;background:#10b981;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px;">🛡️</div>
    <div style="color:#4b5563;font-size:14px;font-weight:600;letter-spacing:0.02em;">KnowThankYew Reality Engine</div>
  </div>

  <!-- Simulated popup card -->
  <div style="width:440px;background:#0f1629;border:1px solid #1e293b;border-radius:16px;box-shadow:0 25px 60px -12px rgba(0,0,0,0.6);overflow:hidden;">
    <!-- Header bar -->
    <div style="padding:20px 22px 16px;border-bottom:1px solid #1e293b;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="width:24px;height:24px;background:#10b981;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:13px;">🛡️</div>
          <span style="color:#fff;font-weight:700;font-size:15px;">Reality Engine</span>
        </div>
        <div style="background:${badgeColor};color:#fff;font-size:12px;font-weight:800;padding:3px 10px;border-radius:999px;min-width:24px;text-align:center;">${badgeCount}</div>
      </div>
      <div style="color:#fff;font-size:17px;font-weight:700;margin-bottom:4px;">${title}</div>
      <div style="color:#64748b;font-size:12.5px;line-height:1.5;">${subtitle}</div>
    </div>
    <!-- Content area -->
    <div style="padding:16px 22px 22px;max-height:520px;overflow-y:auto;">
      ${findingsHTML}${infoHTML}${emptyHTML}
    </div>
  </div>

  <!-- Right side context label -->
  <div style="position:absolute;bottom:28px;right:36px;color:#374151;font-size:12px;font-weight:500;">
    v1.1.0 • Zero Data Egress • MIT License
  </div>
</body>
</html>`;
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
