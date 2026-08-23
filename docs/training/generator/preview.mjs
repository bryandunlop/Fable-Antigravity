// Render a real .docx in Chromium via docx-preview and screenshot each page.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const docxPath = process.argv[2];
const outDir = process.argv[3] || './preview';
const maxPages = Number(process.argv[4] || 6);
fs.mkdirSync(outDir, { recursive: true });

const lib = fs.readFileSync('node_modules/docx-preview/dist/docx-preview.js', 'utf8');
const jszip = fs.readFileSync('node_modules/jszip/dist/jszip.min.js', 'utf8');
const b64 = fs.readFileSync(docxPath).toString('base64');

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 900, height: 1180 }, deviceScaleFactor: 1.6 });
const page = await ctx.newPage();
page.on('pageerror', e => console.log('PAGE ERR:', String(e).slice(0, 200)));

await page.setContent('<body style="margin:0;background:#8a8f98"><div id="c"></div></body>');
await page.addScriptTag({ content: jszip });
await page.addScriptTag({ content: lib });

const count = await page.evaluate(async (data) => {
  const bin = Uint8Array.from(atob(data), c => c.charCodeAt(0));
  await window.docx.renderAsync(bin.buffer, document.getElementById('c'), null,
    { className: 'dx', inWrapper: true, breakPages: true, ignoreWidth: false, ignoreHeight: false });
  return document.querySelectorAll('section.dx').length;
}, b64);

console.log(`${path.basename(docxPath)}: ${count} rendered pages`);
// docx-preview only breaks on explicit page breaks, so slice the flow by scrolling.
const total = await page.evaluate(() => document.body.scrollHeight);
const vh = 1180;
const slices = Math.min(Math.ceil(total / vh), maxPages);
console.log(`  flow height ${total}px -> ${slices} slices`);
for (let i = 0; i < slices; i++) {
  await page.evaluate((y) => window.scrollTo(0, y), i * vh);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(outDir, `p${String(i + 1).padStart(2, '0')}.png`) });
}
await browser.close();
