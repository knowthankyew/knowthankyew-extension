import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import puppeteer, { Browser } from 'puppeteer';
import http from 'http';
import { resolve } from 'path';
import { rmSync } from 'fs';
import { execSync } from 'child_process';

describe('Real-Chromium Local ML Assist E2E Verification (chromium-local-ml-e2e.test.ts)', () => {
  let workerServer: http.Server;
  let browser: Browser;
  const distMlPath = resolve(__dirname, '../dist-ml-e2e');
  let extensionId: string;
  let burnReceived = false;

  beforeAll(async () => {
    // 1. Build Local ML Assist extension bundle
    execSync(`VITE_LOCAL_ML_ENABLED=true npx vite build --outDir dist-ml-e2e`, {
      cwd: resolve(__dirname, '..'),
      stdio: 'pipe',
    });

    // 2. Start reference Local ML loopback worker on port 8420
    workerServer = http.createServer((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Access-Control-Request-Private-Network');
      res.setHeader('Access-Control-Allow-Private-Network', 'true');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      if (req.url === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            status: 'ok',
            model: 'SmolLM2-135M-FTaaS (Local Edge)',
            contextWindow: 4096,
            latencyMs: 12,
            burnSupported: true,
          })
        );
        return;
      }

      if (req.url === '/classify-links' && req.method === 'POST') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            primaryConsumerTermsId: 1,
            confidence: 0.95,
            category: 'TERMS',
            reasoning: 'Primary consumer agreement promoted by local model.',
          })
        );
        return;
      }

      if (req.url === '/burn' && req.method === 'POST') {
        burnReceived = true;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            status: 'burned',
            memoryClearedBytes: 1048576,
            sessionPurged: true,
          })
        );
        return;
      }

      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((res) => {
      workerServer.listen(8420, '127.0.0.1', () => res());
    });

    // 3. Launch real Chromium with the Local ML extension loaded
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        `--disable-extensions-except=${distMlPath}`,
        `--load-extension=${distMlPath}`,
      ],
    });

    // 4. Retrieve extension ID from background service worker target
    const targets = browser.targets();
    const swTarget = targets.find((t) => t.type() === 'service_worker' && t.url().startsWith('chrome-extension://'));
    if (swTarget) {
      extensionId = new URL(swTarget.url()).hostname;
    } else {
      // Wait for service worker target
      const target = await browser.waitForTarget(
        (t) => t.type() === 'service_worker' && t.url().startsWith('chrome-extension://'),
        { timeout: 5000 }
      );
      extensionId = new URL(target.url()).hostname;
    }
  });

  afterAll(async () => {
    if (browser) await browser.close();
    if (workerServer) await new Promise<void>((res) => workerServer.close(() => res()));
    rmSync(distMlPath, { recursive: true, force: true });
  });

  it('connects to local ML worker on options.html and renders ● Connected', async () => {
    const page = await browser.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`, { waitUntil: 'networkidle0' });

    // Wait for async health check to resolve and update DOM
    await page.waitForFunction(
      () => document.body.innerText.includes('● Connected'),
      { timeout: 5000 }
    );

    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText).toContain('● Connected');
    expect(bodyText).toContain('Loopback semantic reranker active (127.0.0.1:8420)');
    await page.close();
  });

  it('renders tooltipped ● Local Assist badge in popup.html', async () => {
    const page = await browser.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`, { waitUntil: 'networkidle0' });

    // Wait for popup to check ML availability and render the badge
    await page.waitForFunction(
      () => document.body.innerText.includes('Local Assist'),
      { timeout: 5000 }
    );

    const badgeData = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="privacy-status-badge"]');
      return {
        text: el?.textContent?.trim(),
        title: el?.getAttribute('title'),
      };
    });

    expect(badgeData.text).toContain('Local Assist');
    expect(badgeData.title).toBe('Local ML Assist active on loopback (127.0.0.1:8420)');
    await page.close();
  });

  it('executes Hard Burn and successfully dispatches /burn handshake to loopback worker', async () => {
    const page = await browser.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`, { waitUntil: 'networkidle0' });

    // Click the master hard burn button
    const burnButton = await page.waitForSelector('button');
    expect(burnButton).not.toBeNull();

    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('BURN ALL DATA')
      );
      if (btn) btn.click();
    });

    // Wait for handshake
    await page.waitForFunction(
      () => document.body.innerText.includes('ALL DATA INCINERATED') || document.body.innerText.includes('Amnesia engaged'),
      { timeout: 5000 }
    );

    expect(burnReceived).toBe(true);
    await page.close();
  });
});
