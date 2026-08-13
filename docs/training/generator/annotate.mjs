import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { SHOTS } from './shotlist.mjs';
import { ROLES } from './manifest.mjs';

const BASE = 'http://127.0.0.1:3000';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const OUT = process.argv[2] || './annotated';
fs.mkdirSync(OUT, { recursive: true });

const LABEL = Object.fromEntries(ROLES.map(r => [r.key, r.label]));
const misses = [];
const audit = [];

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });

const byRole = new Map();
for (const s of SHOTS) {
  if (!byRole.has(s.role)) byRole.set(s.role, []);
  byRole.get(s.role).push(s);
}

for (const [roleKey, shots] of byRole) {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1050 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { try { localStorage.setItem('mygfo_demo_unlocked', 'true'); } catch {} });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.getByRole('combobox').click();
  await page.waitForTimeout(400);
  await page.getByRole('option', { name: LABEL[roleKey], exact: true }).click();
  await page.getByRole('button', { name: /access dashboard/i }).click();
  await page.waitForTimeout(3200);
  console.log(`\n--- ${roleKey}`);

  for (const shot of shots) {
    await page.evaluate((t) => { window.history.pushState({}, '', t); window.dispatchEvent(new PopStateEvent('popstate')); }, shot.path);
    await page.waitForTimeout(2600);
    await page.evaluate(() => document.querySelectorAll('.__cal').forEach(e => e.remove()));

    if (shot.scrollTo) {
      try {
        await page.getByText(shot.scrollTo, { exact: false }).first()
          .scrollIntoViewIfNeeded({ timeout: 3000 });
        await page.waitForTimeout(700);
      } catch { console.log(`   scrollTo failed: ${shot.scrollTo}`); }
    }

    const boxes = [];
    for (const c of shot.calls) {
      let box = null, matched = '';
      if (c.rect) {
        boxes.push({ x: c.rect.x, y: c.rect.y, width: c.rect.w, height: c.rect.h,
                     n: c.n, place: c.place || 'tl', pad: c.pad ?? 0 });
        continue;
      }
      try {
        const loc = c.find.startsWith('css=')
          ? page.locator(c.find.slice(4)).first()
          : page.getByText(c.find, { exact: !!c.exact }).first();
        await loc.waitFor({ state: 'visible', timeout: 2500 });
        box = await loc.boundingBox();
        try { matched = (await loc.innerText()).replace(/\s+/g, ' ').trim(); } catch {}
      } catch { box = null; }
      if (!box || box.width < 4 || box.height < 4) {
        misses.push(`${shot.id} #${c.n} "${c.find}"  MISSING`);
        console.log(`   MISS ${shot.id} #${c.n} "${c.find.slice(0, 42)}"`);
        continue;
      }
      // A box below the fold would draw outside the captured viewport.
      const vp = page.viewportSize();
      if (box.y + box.height > vp.height - 4 || box.y < 18) {
        misses.push(`${shot.id} #${c.n} "${c.find}"  OFFSCREEN y=${Math.round(box.y)}`);
        console.log(`   OFFSCREEN ${shot.id} #${c.n} "${c.find.slice(0, 38)}" y=${Math.round(box.y)}`);
        continue;
      }
      boxes.push({ ...box, n: c.n, place: c.place || 'tl', pad: c.pad ?? 6 });
      audit.push(`${shot.id.padEnd(26)} #${c.n}  want="${c.find}"  ->  got="${matched.slice(0, 70)}"`);
    }

    await page.evaluate((bs) => {
      const layer = document.createElement('div');
      layer.className = '__cal';
      Object.assign(layer.style, {
        position: 'fixed', inset: '0', zIndex: '2147483647', pointerEvents: 'none',
      });
      for (const b of bs) {
        const x = b.x - b.pad, y = b.y - b.pad, w = b.width + b.pad * 2, h = b.height + b.pad * 2;
        const ring = document.createElement('div');
        Object.assign(ring.style, {
          position: 'absolute', left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px',
          border: '3px solid #E8590C', borderRadius: '8px',
          boxShadow: '0 0 0 2px rgba(255,255,255,.95), 0 2px 10px rgba(0,0,0,.22)',
        });
        layer.appendChild(ring);

        const badge = document.createElement('div');
        badge.textContent = String(b.n);
        const bx = b.place === 'tr' || b.place === 'br' ? x + w - 15 : x - 15;
        const by = b.place === 'bl' || b.place === 'br' ? y + h - 15 : y - 15;
        Object.assign(badge.style, {
          position: 'absolute', left: bx + 'px', top: by + 'px',
          width: '30px', height: '30px', borderRadius: '50%',
          background: '#E8590C', color: '#fff',
          font: '700 17px/30px ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
          textAlign: 'center',
          boxShadow: '0 0 0 3px #fff, 0 2px 8px rgba(0,0,0,.3)',
        });
        layer.appendChild(badge);
      }
      document.body.appendChild(layer);
    }, boxes);

    await page.waitForTimeout(150);
    const file = path.join(OUT, `${shot.id}.png`);
    await page.screenshot({ path: file });
    await page.evaluate(() => document.querySelectorAll('.__cal').forEach(e => e.remove()));
    console.log(`   ok ${shot.id}  (${boxes.length}/${shot.calls.length} callouts)`);
  }
  await ctx.close();
}

await browser.close();
fs.writeFileSync(path.join(OUT, '_misses.txt'), misses.join('\n'));
fs.writeFileSync(path.join(OUT, '_audit.txt'), audit.join('\n'));
console.log(`\nDone. ${SHOTS.length} images, ${misses.length} missed callouts.`);
