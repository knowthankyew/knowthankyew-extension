import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  const repoRoot = path.resolve(__dirname, '..');
  const tempVideoDir = path.join(repoRoot, '.temp_demo_videos');
  if (!fs.existsSync(tempVideoDir)) fs.mkdirSync(tempVideoDir, { recursive: true });

  const destMp4 = path.join(repoRoot, 'demo.mp4');
  const destGif = path.join(repoRoot, 'demo.gif');
  const fixturePath = path.join(repoRoot, 'tests', 'demo.html');

  // Spin up local HTTP server to serve the fixture page
  const server = http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/demo.html') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(fs.readFileSync(fixturePath, 'utf8'));
      return;
    }
    res.writeHead(404);
    res.end('Not found');
  });

  const port = await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve(server.address().port);
    });
  });

  const activeUrl = `http://127.0.0.1:${port}/demo.html`;
  console.log(`🎬 Launching Playwright browser for knowthankyew-extension demo against ${activeUrl}...`);

  // Import Chromium from local bill-of-rights-bot peer
  const { chromium } = await import('/Users/cl0rkster/Dev/bill-of-rights-bot/node_modules/playwright/index.mjs');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--window-size=1366,860'],
  });

  const context = await browser.newContext({
    viewport: { width: 1366, height: 860 },
    recordVideo: {
      dir: tempVideoDir,
      size: { width: 1366, height: 860 },
    },
  });

  const page = await context.newPage();

  console.log(`Step 1: Navigating to Live Checkout Test Fixture (${activeUrl})...`);
  await page.goto(activeUrl, { waitUntil: 'networkidle' });
  await sleep(1500);

  console.log('Step 2: Inspecting Checkout fine print disclaimers...');
  await page.evaluate(() => window.scrollBy({ top: 220, behavior: 'smooth' }));
  await sleep(2000);

  console.log('Step 3: Triggering Live Dynamic MutationObserver injection...');
  await page.click('.dynamic-btn');
  await sleep(2500);

  console.log('Step 4: Inspecting newly injected promotional trial conversion terms...');
  await page.evaluate(() => window.scrollBy({ top: 200, behavior: 'smooth' }));
  await sleep(2000);

  console.log('Step 5: Scrolling to sample legal navigation links (TOS, Arbitration, Billing, Privacy)...');
  await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
  await sleep(2500);

  console.log('Closing browser context to finalize video recording...');
  await page.close();
  await context.close();
  await browser.close();
  server.close();

  // Locate the recorded WebM
  const videoFiles = fs.readdirSync(tempVideoDir).filter((f) => f.endsWith('.webm'));
  if (videoFiles.length === 0) {
    console.error('❌ Error: No recorded WebM video found in temp folder.');
    return;
  }

  const latestVideo = path.join(tempVideoDir, videoFiles[videoFiles.length - 1]);

  const candidateFfmpeg = [
    '/Users/cl0rkster/Dev/ml/src/FtaaSService.Worker/.venv/lib/python3.12/site-packages/imageio_ffmpeg/binaries/ffmpeg-macos-x86_64-v7.1',
    '/opt/homebrew/bin/ffmpeg',
    '/usr/local/bin/ffmpeg',
    'ffmpeg',
  ];

  let ffmpegPath = null;
  for (const p of candidateFfmpeg) {
    if (fs.existsSync(p)) {
      ffmpegPath = p;
      break;
    }
  }

  if (ffmpegPath) {
    try {
      console.log(`🎬 Transcoding recording to web-standard MP4 via ${ffmpegPath}...`);
      execSync(`"${ffmpegPath}" -y -i "${latestVideo}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "${destMp4}"`, { stdio: 'inherit' });
      const stats = fs.statSync(destMp4);
      console.log(`✓ Demo MP4 generated: ${destMp4} (${(stats.size / (1024 * 1024)).toFixed(2)} MB)`);

      console.log('🎬 Transcoding animated preview GIF for GitHub README...');
      execSync(`"${ffmpegPath}" -y -i "${destMp4}" -vf "fps=10,scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer" "${destGif}"`, { stdio: 'inherit' });
      const gifStats = fs.statSync(destGif);
      console.log(`✓ Demo GIF generated: ${destGif} (${(gifStats.size / (1024 * 1024)).toFixed(2)} MB)`);
    } catch (err) {
      console.warn('⚠️ FFmpeg conversion warning, keeping WebM:', err.message);
      fs.copyFileSync(latestVideo, destMp4);
    }
  } else {
    fs.copyFileSync(latestVideo, destMp4);
  }

  fs.rmSync(tempVideoDir, { recursive: true, force: true });
  console.log('✨ Demo video recording complete!');
})();
