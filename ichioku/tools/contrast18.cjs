// v18 の新しい部品（3列の枠・表・人生地図・生存曲線・点の地図・吹き出し・窓・札）の文字と背景の色の差（WCAG）を、明るい表示と暗い表示で測る
// 使い方：site/ を http://localhost:8123/ で開いた状態で node tools/contrast18.cjs（結果は logs/contrast18.json）
const path = require('path'), fs = require('fs');
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
  const b = await chromium.launch(), all = {};
  for (const [w, h] of [[1440, 900], [390, 844]]) for (const scheme of ['light', 'dark']) {
    const p = await b.newPage({ viewport: { width: w, height: h }, colorScheme: scheme });
    const shot = async name => { const r = await p.evaluate(MEASURE); r.forEach(x => { const k = scheme + ' ' + x.sel + ' ' + x.ratio; if (!all[k]) all[k] = Object.assign({ scheme, w, at: name }, x); }); };
    await p.goto('http://localhost:8123/index.html');
    await p.evaluate(() => { localStorage.clear(); localStorage.setItem('ichioku-motion', JSON.stringify('less')); });
    await p.reload(); await p.waitForSelector('#born:not([disabled])'); await shot('最初の窓');
    await p.evaluate(() => { localStorage.setItem('ichioku-seen-me', '1'); localStorage.setItem('ichioku-me', JSON.stringify({ y: 2002, pref: '13' })); });
    await p.addInitScript(() => { let u = false; const g = crypto.getRandomValues.bind(crypto); crypto.getRandomValues = a => { if (!u && a.length === 1) { u = true; a[0] = 7919 * 43; return a; } return g(a); }; });
    await p.reload(); await p.waitForSelector('#born:not([disabled])'); await shot('トップ');
    await p.click('#born'); await p.waitForSelector('#screen-birth:not([hidden])'); await p.waitForTimeout(500); await shot('生まれ');
    await p.click('#bt-start'); await p.waitForSelector('#screen-life:not([hidden])');
    await p.evaluate(() => { const t = document.getElementById('speed-tip'); if (t) t.hidden = false; });
    await p.click('#speed .o-sp:last-child').catch(() => {});
    const t0 = Date.now(); let shotLife = false;
    while (Date.now() - t0 < 200000) {
      if (await p.isVisible('#screen-end')) break;
      if (await p.isVisible('#branch')) { await shot('分かれ道の札'); const bs = await p.$$('#branch .opt-btn'); const mm = await p.$('#branch .btn-main'); if (mm && await mm.isVisible()) { for (const o of await p.$$('#branch .opts')) { const x = await o.$$('.opt-btn'); if (x[0]) await x[0].click().catch(() => {}); } await mm.click().catch(() => {}); } else if (bs[0]) await bs[0].click().catch(() => {}); }
      if (!shotLife && parseInt(await p.textContent('#age')) >= 20) { await p.evaluate(() => document.querySelectorAll('details.pane').forEach(d => { d.open = true; })); await p.waitForTimeout(200); await shot('人生（列・表・地図・曲線）'); shotLife = true; }
      if (await p.isVisible('#death')) await p.click('#death-skip').catch(() => {});
      if (await p.isVisible('#screen-life') && (await p.getAttribute('#pause', 'aria-pressed')) === 'true' && !(await p.isVisible('#branch'))) await p.click('#pause').catch(() => {});
      await p.waitForTimeout(60);
    }
    if (await p.isVisible('#screen-end')) { await p.waitForTimeout(500); await shot('最期'); }
    await p.close();
  }
  const list = Object.values(all);
  fs.mkdirSync(path.join(__dirname, '..', 'logs'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, '..', 'logs', 'contrast18.json'), JSON.stringify(list, null, 1));
  console.log((list.length ? '不合格' : '合格') + '\t色の差が基準に足りない組み合わせ ' + list.length);
  list.slice(0, 20).forEach(x => console.log(' ', x.scheme, x.w, x.at, x.sel, x.text, x.ratio, '/', x.need, x.fg, x.bg));
  await b.close();
})();
