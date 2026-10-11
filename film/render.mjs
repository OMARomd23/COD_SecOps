import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const OUT = process.argv[2] || path.join(__dir, 'frames');
import fs from 'fs';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--force-color-profile=srgb','--disable-lcd-text','--hide-scrollbars']
});
const page = await browser.newPage({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
});
await page.addInitScript(() => { window.__RENDER = true; });
await page.goto('file://' + path.join(__dir, 'index.html'));
await page.waitForFunction(() => document.fonts && document.fonts.status === 'loaded', { timeout: 20000 }).catch(()=>{});
await page.evaluate(() => document.fonts.ready);
// neutralize the fit() scale so the canvas captures at native 1920x1080
await page.evaluate(() => { document.getElementById('stage').style.transform='none'; });

const DUR = await page.evaluate(() => window.__DUR);
const FPS = await page.evaluate(() => window.__FPS);
const total = Math.round(DUR * FPS);
console.log(`rendering ${total} frames @ ${FPS}fps (${DUR}s)`);

const stage = await page.$('#stage');
for (let i = 0; i < total; i++) {
  const t = i / FPS;
  await page.evaluate((tt) => window.__seek(tt), t);
  await stage.screenshot({ path: path.join(OUT, String(i).padStart(4,'0') + '.png') });
  if (i % 30 === 0) process.stdout.write(`\r  frame ${i}/${total}`);
}
process.stdout.write(`\r  frame ${total}/${total}\n`);
await browser.close();
console.log('done');
