// 画面に見えている文字の色と背景色のコントラスト比（WCAG）を測る。明るい表示・暗い表示の両方
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const MEASURE = () => {
  const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map(x => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const mix = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
  const bgOf = el => { const layers = []; for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; } } let b = { r: 255, g: 255, b: 255, a: 1 }; if (layers.length && layers[layers.length - 1].a >= 1) b = layers.pop(); while (layers.length) b = mix(layers.pop(), b); return b; };
  const out = [];
  document.querySelectorAll('body *').forEach(el => {
    if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') return;
    const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (!own) return;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity === 0) return;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
    let fg = parse(cs.color); const bg = bgOf(el); fg = mix(fg, bg);
    const L1 = lum(fg), L2 = lum(bg), ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const size = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700, large = size >= 24 || (bold && size >= 18.66);
    const need = large ? 3 : 4.5;
    if (ratio < need) out.push({ sel: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').join('.') : ''), text: el.textContent.trim().slice(0, 16), ratio: +ratio.toFixed(2), need, fg: cs.color, bg: `rgb(${bg.r | 0},${bg.g | 0},${bg.b | 0})` });
  });
  return out;
};
(async () => {
  const b = await chromium.launch(); const all = {};
  for (const scheme of ['light', 'dark']) {
    const p = await b.newPage({ viewport: { width: 390, height: 844 }, colorScheme: scheme });
    const shot = async name => { const r = await p.evaluate(MEASURE); r.forEach(x => { const k = scheme + ' ' + x.sel + ' ' + x.ratio; if (!all[k]) all[k] = { scheme, at: name, ...x }; }); };
    await p.goto('http://localhost:8123/index.html'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('ichioku-motion', JSON.stringify('less')); }); await p.reload();
    await p.waitForSelector('#born:not([disabled])'); await shot('top');
    await p.evaluate(s => { crypto.getRandomValues = a => { a[0] = s; return a; }; }, 7919 * 41);
    await p.click('#born'); await p.waitForSelector('#screen-birth:not([hidden])', { timeout: 15000 }); await shot('birth');
    await p.click('#bt-start'); await p.waitForTimeout(400); await shot('life');
    const t0 = Date.now(); let br = 0;
    while (Date.now() - t0 < 90000 && !(await p.isVisible('#screen-end'))) {
      if (await p.isVisible('#branch')) { if (br++ < 2) await shot('branch'); const bt = await p.$$('#branch .opt-btn'); await bt[0].click(); const m = await p.$('#branch .btn-main'); if (m && await m.isVisible()) { for (const o of await p.$$('#branch .opts')) { const bs = await o.$$('.opt-btn'); await bs[0].click(); } await p.click('#branch .btn-main'); } }
      if ((await p.getAttribute('#pause', 'aria-pressed')) === 'true') await p.click('#pause');
      await p.click('#speed .o-sp:last-child').catch(() => {}); await p.waitForTimeout(60);
      if (Date.now() - t0 > 3000 && Date.now() - t0 < 3200) await shot('life2');
    }
    await p.waitForTimeout(300); await shot('end');
    await p.evaluate(() => { document.getElementById('end-more').open = true; }); await p.waitForTimeout(300); await shot('end-more');
    for (const id of ['end-log', 'card-end']) { if (await p.isVisible('#' + id)) { await p.click('#' + id); await p.waitForTimeout(500); await shot(id); await p.click('#sheet-close').catch(() => {}); } }
    for (const pg of ['about.html', 'privacy.html', 'changelog.html', 'contact.html']) { await p.goto('http://localhost:8123/' + pg); await shot(pg); }
    await p.close();
  }
  const list = Object.values(all);
  console.log('failures', list.length); list.slice(0, 60).forEach(x => console.log(x.scheme, x.at, x.sel, '「' + x.text + '」', x.ratio, '<', x.need, x.fg, 'on', x.bg));
  await b.close();
})();
