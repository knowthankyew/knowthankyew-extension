import puppeteer from 'puppeteer';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Render small promo tile (440x280)
  const smallSvg = readFileSync(resolve('assets/store/promo-small-440x280.svg'), 'utf8');
  await page.setViewport({ width: 440, height: 280, deviceScaleFactor: 2 });
  await page.setContent(`<!DOCTYPE html><html><body style="margin:0;padding:0;overflow:hidden">${smallSvg}</body></html>`);
  await page.screenshot({ path: resolve('assets/store/promo-small-440x280.png'), type: 'png' });
  console.log('Generated assets/store/promo-small-440x280.png');

  // Render marquee promo tile (1400x560)
  const marqueeSvg = readFileSync(resolve('assets/store/promo-marquee-1400x560.svg'), 'utf8');
  await page.setViewport({ width: 1400, height: 560, deviceScaleFactor: 2 });
  await page.setContent(`<!DOCTYPE html><html><body style="margin:0;padding:0;overflow:hidden">${marqueeSvg}</body></html>`);
  await page.screenshot({ path: resolve('assets/store/promo-marquee-1400x560.png'), type: 'png' });
  console.log('Generated assets/store/promo-marquee-1400x560.png');

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
