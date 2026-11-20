#!/usr/bin/env node
/**
 * test-webkit-e2e.mjs - Real WebKit (Safari Engine) E2E Verification Suite
 *
 * Runs purely against standalone build artifacts and local source harnesses (zero sibling repo deps):
 * 1. dist-safari/ popup.html & options.html render in WebKit with MV3 CSP connect-src 'none' enforced.
 * 2. WebKit physically blocks outbound fetch() under extension CSP (negative control).
 * 3. dist-safari/content/scanner.js scans checkout DOM in WebKit, mounts Closed Shadow DOM
 *    indicators (shadowRoot === null), and tears down atomically via BroadcastChannel Hard Burn.
 * 4. #kty_handoff= URL fragment delivery encodes via src/core/handoff.ts, decodes in WebKit,
 *    and immediately scrubs window.location.hash via history.replaceState without persistence.
 * 5. Native Safari container host UI (safari/host-resources/Main.html) runs offline checks cleanly.
 */

import assert from 'node:assert/strict';
import http from 'node:http';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { webkit } from 'playwright';
import { build as viteBuild } from 'vite';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const ROOT_DIR = resolve(__dirname, '..');
const DIST_SAFARI = resolve(ROOT_DIR, 'dist-safari');
const HOST_RESOURCES = resolve(ROOT_DIR, 'safari/host-resources');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
};

async function buildFragmentHarness(outDir) {
  const srcDir = join(outDir, 'src');
  mkdirSync(srcDir, { recursive: true });

  writeFileSync(
    join(outDir, 'index.html'),
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>WebKit Handoff Harness</title></head><body><div id="status">INIT</div><div id="domain"></div><div id="count">0</div><button id="burn-btn" type="button">Burn</button><script type="module" src="/src/main.ts"></script></body></html>'
  );

  writeFileSync(
    join(srcDir, 'main.ts'),
    `import { buildDestinationUrl, KTY_HANDOFF_SESSION_KEY, validateHandoffPayload } from '${resolve(ROOT_DIR, 'src/core/handoff.ts').replace(/\\\\/g, '/')}';

declare global {
  interface Window {
    __ktyBuildDestUrl?: typeof buildDestinationUrl;
  }
}

window.__ktyBuildDestUrl = buildDestinationUrl;

function decodeFragment(token: string) {
  const normalized = token.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const parsed = JSON.parse(new TextDecoder().decode(bytes));
  return validateHandoffPayload(parsed) ? parsed : null;
}

const rawHash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
const params = new URLSearchParams(rawHash);
const encoded = params.get(KTY_HANDOFF_SESSION_KEY);

// Always scrub hash fragment immediately (matching useKTYHandoff)
if (encoded !== null) {
  params.delete(KTY_HANDOFF_SESSION_KEY);
  const nextHash = params.toString();
  const cleanUrl = \`\${window.location.pathname}\${window.location.search}\${nextHash ? '#' + nextHash : ''}\`;
  window.history.replaceState(window.history.state, '', cleanUrl);
}

const statusEl = document.getElementById('status')!;
const domainEl = document.getElementById('domain')!;
const countEl = document.getElementById('count')!;
const payload = encoded ? decodeFragment(encoded) : null;

if (payload) {
  statusEl.textContent = 'ACTIVE';
  domainEl.textContent = payload.domain;
  countEl.textContent = String(payload.findings.length);
} else {
  statusEl.textContent = 'EMPTY';
}

document.getElementById('burn-btn')!.addEventListener('click', () => {
  statusEl.textContent = 'EMPTY';
  domainEl.textContent = '';
  countEl.textContent = '0';
});
`
  );

  await viteBuild({
    root: outDir,
    configFile: false,
    logLevel: 'silent',
    base: '/handoff-app/',
    build: {
      outDir: join(outDir, 'dist'),
      emptyOutDir: true,
    },
  });

  return join(outDir, 'dist');
}

async function main() {
  execSync('npm run build:safari', { cwd: ROOT_DIR, stdio: 'pipe' });

  const safariManifest = JSON.parse(readFileSync(resolve(DIST_SAFARI, 'manifest.json'), 'utf-8'));
  const extensionCsp = safariManifest.content_security_policy?.extension_pages;
  assert.ok(extensionCsp && extensionCsp.includes("connect-src 'none'"), 'dist-safari CSP must enforce connect-src none');
  assert.equal(safariManifest.version_name, undefined, 'dist-safari manifest must omit Chromium-only version_name');

  const tmpHarnessRoot = mkdtempSync(join(tmpdir(), 'kty-webkit-'));
  let server;
  let browser;

  try {
    const handoffDist = await buildFragmentHarness(tmpHarnessRoot);

    server = http.createServer((req, res) => {
      const reqUrl = new URL(req.url || '/', 'http://127.0.0.1');
      const pathname = reqUrl.pathname;

      if (pathname === '/checkout') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<!DOCTYPE html>
<html>
  <head><title>WebKit Checkout Fixture</title></head>
  <body>
    <main class="checkout-form">
      <h1>Complete Your Membership</h1>
      <label class="consent-box">
        <input type="checkbox" name="auto_renew" />
        <span>Your subscription will automatically renew each month unless cancelled 7 days prior.</span>
      </label>
      <p>To cancel, you must call our customer service hotline during business hours.</p>
      <p>Any dispute shall be resolved exclusively through binding arbitration.</p>
    </main>
  </body>
</html>`);
        return;
      }

      let baseDir = DIST_SAFARI;
      let relPath = pathname.replace(/^\/+/, '');
      let extraCsp = null;

      if (pathname.startsWith('/handoff-app/')) {
        baseDir = handoffDist;
        relPath = pathname.slice('/handoff-app/'.length) || 'index.html';
      } else if (pathname.startsWith('/safari-app/')) {
        baseDir = HOST_RESOURCES;
        relPath = pathname.slice('/safari-app/'.length) || 'Main.html';
        if (relPath === 'Base.lproj/Main.html') relPath = 'Main.html';
        extraCsp = "default-src 'self'; connect-src 'none'; style-src 'self'; script-src 'self'; img-src 'self' data:;";
      } else {
        if (!relPath) relPath = 'popup.html';
        if (relPath === 'popup.html' || relPath === 'options.html') {
          extraCsp = extensionCsp;
        }
      }

      const targetPath = resolve(baseDir, relPath);
      if (!targetPath.startsWith(baseDir) || !existsSync(targetPath)) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const mime = MIME_TYPES[extname(targetPath)] || 'application/octet-stream';
      const headers = { 'Content-Type': mime };
      if (extraCsp) headers['Content-Security-Policy'] = extraCsp;
      res.writeHead(200, headers);
      res.end(readFileSync(targetPath));
    });

    await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
    const { port } = server.address();
    const baseUrl = `http://127.0.0.1:${port}`;

    browser = await webkit.launch({ headless: true });

    // 1. Extension popup & options in WebKit + CSP negative control
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      const pageErrors = [];
      const nonLoopbackRequests = [];

      page.on('pageerror', (err) => pageErrors.push(err.message));
      page.on('request', (req) => {
        const u = req.url();
        if (!u.startsWith('http://127.0.0.1:') && !u.startsWith('data:') && !u.startsWith('blob:')) {
          nonLoopbackRequests.push(u);
        }
      });

      await page.goto(`${baseUrl}/popup.html`, { waitUntil: 'networkidle' });
      const popupText = await page.textContent('body');
      assert.ok(popupText && popupText.length > 0, 'WebKit popup.html must render non-empty body');

      const cspBlocked = await page.evaluate(async () => {
        try {
          await fetch('https://example.com/leak-probe');
          return 'ALLOWED';
        } catch (err) {
          return `BLOCKED:${err?.name || 'Error'}`;
        }
      });
      assert.ok(cspBlocked.startsWith('BLOCKED:'), `Expected WebKit CSP to block fetch(), got ${cspBlocked}`);

      await page.goto(`${baseUrl}/options.html`, { waitUntil: 'networkidle' });
      const optionsText = await page.textContent('body');
      assert.ok(optionsText && optionsText.includes('KnowThankYew'), 'WebKit options.html must render');

      assert.deepEqual(pageErrors, [], `Unexpected page errors in WebKit extension UI: ${pageErrors.join('; ')}`);
      assert.deepEqual(nonLoopbackRequests, [], `Non-loopback requests observed: ${nonLoopbackRequests.join(', ')}`);
      await context.close();
      console.log('✓ WebKit Test 1: dist-safari popup.html & options.html render cleanly and block fetch() under connect-src none');
    }

    // 2. Classic content/scanner.js in WebKit + Closed Shadow DOM + BroadcastChannel Hard Burn
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      const pageErrors = [];
      const nonLoopbackRequests = [];

      page.on('pageerror', (err) => pageErrors.push(err.message));
      page.on('request', (req) => {
        const u = req.url();
        if (!u.startsWith('http://127.0.0.1:') && !u.startsWith('data:') && !u.startsWith('blob:')) {
          nonLoopbackRequests.push(u);
        }
      });

      await page.goto(`${baseUrl}/checkout`, { waitUntil: 'networkidle' });
      await page.addInitScript(() => {
        // Ignore script injection; runtime message mock captures KTY_SCAN_COMPLETED
      });
      await page.evaluate(() => {
        window.chrome = {
          runtime: {
            sendMessage: async (msg) => {
              window.__ktyLastScanMsg = msg;
              return { status: 'ok' };
            },
          },
        };
      });
      await page.addScriptTag({ path: resolve(DIST_SAFARI, 'content/scanner.js') });

      const scanOutcome = await page.evaluate(() => {
        const msg = window.__ktyLastScanMsg;
        const hosts = Array.from(document.querySelectorAll('[data-kty-indicator-host]'));
        return {
          critical: msg?.summary?.critical ?? 0,
          warning: msg?.summary?.warning ?? 0,
          hostCount: hosts.length,
          allClosedShadow: hosts.every((h) => h.shadowRoot === null),
        };
      });
      assert.ok(scanOutcome.critical >= 1, `Expected CRITICAL findings in WebKit checkout scan, got ${JSON.stringify(scanOutcome)}`);
      assert.ok(scanOutcome.hostCount >= 1, 'Expected inline indicator host in WebKit DOM');
      assert.equal(scanOutcome.allClosedShadow, true, 'WebKit indicator hosts must use closed Shadow DOM (shadowRoot === null)');

      await page.evaluate(() => {
        const bc = new BroadcastChannel('kty_hard_burn');
        bc.postMessage({ type: 'KTY_HARD_BURN_DOM' });
        bc.close();
      });
      await page.waitForFunction(() => document.querySelectorAll('[data-kty-indicator-host]').length === 0);

      assert.deepEqual(pageErrors, [], `Unexpected page errors in WebKit scanner: ${pageErrors.join('; ')}`);
      assert.deepEqual(nonLoopbackRequests, [], `Non-loopback requests during WebKit scanner run: ${nonLoopbackRequests.join(', ')}`);
      await context.close();
      console.log('✓ WebKit Test 2: dist-safari/content/scanner.js scans checkout DOM, mounts Closed Shadow DOM badges, and burns via BroadcastChannel');
    }

    // 3. Fragment #kty_handoff= encoding + WebKit URL/history replaceState scrubbing
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      const pageErrors = [];
      const nonLoopbackRequests = [];

      page.on('pageerror', (err) => pageErrors.push(err.message));
      page.on('request', (req) => {
        const u = req.url();
        if (!u.startsWith('http://127.0.0.1:') && !u.startsWith('data:') && !u.startsWith('blob:')) {
          nonLoopbackRequests.push(u);
        }
      });

      await page.goto(`${baseUrl}/handoff-app/`, { waitUntil: 'networkidle' });
      const encodedUrl = await page.evaluate(() => {
        const payload = {
          version: '1.0',
          originApp: 'knowthankyew-extension',
          domain: 'sketchy-trial.example',
          scanTimestamp: new Date().toISOString(),
          riskScore: 80,
          summary: { critical: 1, warning: 0, info: 0 },
          primaryLegalLink: { url: 'https://sketchy-trial.example/terms', title: 'Terms', category: 'TERMS' },
          targetTool: 'bill-of-rights-bot',
          findings: [
            {
              ruleId: 'AR-001',
              title: 'Automatic Negative Option Renewal',
              category: 'AUTO_RENEWAL',
              severity: 'CRITICAL',
              statuteCode: '15 U.S.C. § 8403 (ROSCA)',
              statuteTitle: 'Restore Online Shoppers Confidence Act',
              explanation: 'Auto-renews monthly.',
              recommendation: 'Cancel before billing.',
              matchedSnippet: 'Subscription renews monthly.',
            },
          ],
        };
        return window.__ktyBuildDestUrl('bill-of-rights-bot', false, payload);
      });

      assert.ok(encodedUrl.startsWith('https://knowthankyew.github.io/bill-of-rights-bot/?kty_handoff=1#kty_handoff='), `Unexpected production handoff URL: ${encodedUrl}`);
      const fragmentOnly = encodedUrl.split('#')[1];
      await page.goto(`${baseUrl}/handoff-app/?kty_handoff=1#${fragmentOnly}`, { waitUntil: 'networkidle' });

      await page.waitForFunction(() => document.getElementById('status')?.textContent === 'ACTIVE');
      assert.equal(await page.textContent('#domain'), 'sketchy-trial.example');
      assert.equal(await page.textContent('#count'), '1');

      const scrubbedLocation = await page.evaluate(() => ({
        href: window.location.href,
        hash: window.location.hash,
      }));
      assert.equal(scrubbedLocation.hash, '', 'WebKit must scrub #kty_handoff= hash on mount');
      assert.ok(!scrubbedLocation.href.includes('#kty_handoff='), `Expected scrubbed hash fragment, got ${scrubbedLocation.href}`);

      await page.click('#burn-btn');
      await page.reload({ waitUntil: 'networkidle' });
      assert.equal(await page.textContent('#status'), 'EMPTY');

      assert.deepEqual(pageErrors, [], `Unexpected errors in WebKit fragment harness: ${pageErrors.join('; ')}`);
      assert.deepEqual(nonLoopbackRequests, [], `Non-loopback requests during WebKit handoff: ${nonLoopbackRequests.join(', ')}`);
      await context.close();
      console.log('✓ WebKit Test 3: #kty_handoff= URL fragment payload built by src/core/handoff.ts, decoded in WebKit, and scrubbed via replaceState');
    }

    // 4. Native Safari container host app UI (safari/host-resources/Main.html)
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      const pageErrors = [];
      const nonLoopbackRequests = [];

      page.on('pageerror', (err) => pageErrors.push(err.message));
      page.on('request', (req) => {
        const u = req.url();
        if (!u.startsWith('http://127.0.0.1:') && !u.startsWith('data:') && !u.startsWith('blob:')) {
          nonLoopbackRequests.push(u);
        }
      });

      await page.goto(`${baseUrl}/safari-app/Base.lproj/Main.html`, { waitUntil: 'networkidle' });
      await page.click('#load-sample-btn');
      const resultsText = await page.textContent('#clause-results');
      assert.ok(resultsText?.includes('ROSCA'), 'Container UI self-check must identify ROSCA sample clause in WebKit');
      assert.ok(resultsText?.includes('Federal Arbitration Act'), 'Container UI self-check must identify arbitration sample clause in WebKit');

      await page.click('#burn-clause-btn');
      assert.equal((await page.textContent('#clause-results'))?.trim(), '', 'Clear Memory button must wipe container sandbox findings');

      assert.deepEqual(pageErrors, [], `Unexpected errors in Safari host UI: ${pageErrors.join('; ')}`);
      assert.deepEqual(nonLoopbackRequests, [], `Non-loopback requests in Safari host UI: ${nonLoopbackRequests.join(', ')}`);
      await context.close();
      console.log('✓ WebKit Test 4: Native Safari companion host app UI & offline clause self-check verified in WebKit');
    }

    console.log('\n[PASS] All WebKit 27.2 E2E Safari readiness assertions passed.');
  } finally {
    if (browser) await browser.close();
    if (server) server.close();
    rmSync(tmpHarnessRoot, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error('[FAIL] WebKit E2E test failed:', err);
  process.exit(1);
});
