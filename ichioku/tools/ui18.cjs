// v18 受け入れ（ブラウザ）：指示書 ichioku1000-v17-ui-spec2 の確かめ方
// 使い方：site/ を http://localhost:8123/ で開いた状態で  node tools/ui18.cjs [sizes|modal|top|trip <seed>]
// 画面写真は tools/screens/ に入れ、結果は logs/ui18-<part>.json に書く
const path = require('path'), fs = require('fs');
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const ROOT = path.resolve(__dirname, '..'), SHOT = path.join(ROOT, 'tools', 'screens'), LOG = path.join(ROOT, 'logs');
fs.mkdirSync(SHOT, { recursive: true }); fs.mkdirSync(LOG, { recursive: true });
const URL0 = 'http://localhost:8123/index.html';
const SIZES = [[1920, 1080], [1440, 900], [1280, 800], [1024, 768], [390, 844], [360, 740]];
const part = process.argv[2] || 'sizes';

async function page(b, w, h, errs) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  p.on('pageerror', e => errs.push(w + 'x' + h + ' ' + e.stack.split('\n').slice(0, 2).join(' | ')));
  p.on('console', m => { if (m.type() === 'error') errs.push(w + 'x' + h + ' ' + m.text()); });
  p.on('request', q => { if (!/^http:\/\/localhost:8123\//.test(q.url()) && !/^(data|blob):/.test(q.url())) errs.push('外部への通信 ' + q.url()); });
  return p;
}
async function setup(p, seed, opt) {
  await p.goto(URL0);
  await p.evaluate(([s, o]) => {
    localStorage.clear();
    localStorage.setItem('ichioku-motion', JSON.stringify('less'));
    if (o.me !== false) localStorage.setItem('ichioku-me', JSON.stringify({ y: 2002, pref: '13' }));
    if (!o.modal) localStorage.setItem('ichioku-seen-me', '1');
    if (o.auto) localStorage.setItem('ichioku-auto', o.auto);
    localStorage.setItem('ichioku-tip', '1');
  }, [seed, opt || {}]);
  await p.addInitScript(s => { const g = crypto.getRandomValues.bind(crypto); let used = false; crypto.getRandomValues = a => { if (!used && a instanceof Uint32Array && a.length === 1) { used = true; a[0] = s; return a; } return g(a); }; }, seed);
  await p.reload(); await p.waitForSelector('#born:not([disabled])');
}
async function bornToBirth(p) {
  await p.click('#born');
  await p.waitForSelector('#screen-birth:not([hidden])', { timeout: 20000 });
}
async function answer(p) {
  if (!(await p.isVisible('#branch'))) return false;
  const bs = await p.$$('#branch .opt-btn');
  const multi = await p.$('#branch .btn-main');
  if (bs.length && !(multi && await multi.isVisible())) { await bs[0].click().catch(() => {}); return true; }
  if (multi && await multi.isVisible()) { for (const o of await p.$$('#branch .opts')) { const x = await o.$$('.opt-btn'); if (x[0]) await x[0].click().catch(() => {}); } await multi.click().catch(() => {}); return true; }
  return false;
}
async function playUntil(p, cond, ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < (ms || 300000)) {
    if (await cond()) return true;
    if (await p.isVisible('#death')) await p.click('#death-skip').catch(() => {});
    if (await answer(p)) { await p.waitForTimeout(40); continue; }
    if (await p.isVisible('#screen-life') && (await p.getAttribute('#pause', 'aria-pressed')) === 'true') await p.click('#pause').catch(() => {});
    await p.waitForTimeout(60);
  }
  return false;
}
const vis = (p, sel, vh) => p.evaluate(([s, h]) => { const e = document.querySelector(s); if (!e || e.offsetParent === null) return false; const r = e.getBoundingClientRect(); return r.top >= 0 && r.top < h && r.height > 0; }, [sel, vh]);

(async () => {
  const b = await chromium.launch(), errs = [], res = { part, at: new Date().toISOString(), checks: [] };
  const check = (name, ok, detail) => res.checks.push({ name, ok: !!ok, detail: detail || '' });
  if (part === 'sizes') {
    for (const [w, h] of SIZES) {
      const p = await page(b, w, h, errs), tag = w + 'x' + h, pc = w >= 960;
      await setup(p, 7919 * 37 + w);
      await bornToBirth(p);
      await p.waitForTimeout(400);
      await p.screenshot({ path: path.join(SHOT, tag + '-birth.png') });
      const ov0 = await p.evaluate(() => document.documentElement.scrollWidth);
      check(tag + ' 生まれ：横のはみ出しなし', ov0 <= w, 'scrollWidth ' + ov0);
      if (w === 1440) {
        const sb = await p.evaluate(() => { const r = document.getElementById('bt-start').getBoundingClientRect(); return r.bottom; });
        check(tag + ' 生まれ：送らずに「人生を始める」が見える', sb <= h && sb > 0, 'ボタンの下端 ' + Math.round(sb));
        const ring = await p.evaluate(() => { const r = document.querySelector('[data-ring]'); return r ? r.getAttribute('data-ring') : null; });
        const hot = await p.evaluate(() => [...new Set([...document.querySelectorAll('#bt-dots .dm-on')].map(c => c.getAttribute('data-pref')))]);
        check(tag + ' 生まれ：紅の点と輪が生まれた場所と一致', ring && hot.includes(ring), '輪 ' + ring + '・紅の県 ' + hot.join(','));
      }
      await p.click('#bt-start');
      await p.waitForSelector('#screen-life:not([hidden])');
      await p.click('#speed .o-sp:last-child').catch(() => {});
      await playUntil(p, async () => (await p.isVisible('#screen-end')) || parseInt(await p.textContent('#age')) >= 26, 240000);
      if (await p.isVisible('#screen-life')) {
        if ((await p.getAttribute('#pause', 'aria-pressed')) !== 'true') await p.click('#pause').catch(() => {});
        await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(250);
        await p.screenshot({ path: path.join(SHOT, tag + '-life.png') });
        const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, head: document.querySelector('.o-head').getBoundingClientRect().height, ctrl: document.querySelector('.o-ctrl').getBoundingClientRect().height }));
        check(tag + ' 人生：横のはみ出しなし', m.sw <= w, 'scrollWidth ' + m.sw);
        if (pc) check(tag + ' 人生：上の帯が150px以下', m.head <= 150, Math.round(m.head) + 'px');
        else { check(tag + ' 人生：上の帯が120px以下', m.head <= 120, Math.round(m.head) + 'px'); check(tag + ' 人生：帯のボタンが2行に折り返さない', m.ctrl <= 50, Math.round(m.ctrl) + 'px'); }
        if (w === 1440) {
          const items = { 上の帯: '.o-head', 場面の絵: '.scene-card', 状態: '.stats4', 人生の記録の最新: '#feed li:nth-child(1)', 記録の3件目: '#feed li:nth-child(3)', 人生地図: '#pane-map' };
          const miss = []; for (const [k, s] of Object.entries(items)) if (!(await vis(p, s, h))) miss.push(k);
          if (await p.isVisible('#branch')) { if (!(await vis(p, '#branch', h))) miss.push('分かれ道'); }
          check(tag + ' 人生：送らずに帯・絵・状態・記録の3件・人生地図が見える', miss.length === 0, miss.length ? '見えない：' + miss.join('、') : 'すべて見える');
        }
        if (w === 1440 || w === 390) {
          // 札・ひと息・書き付け・家族と暮らし・同じ年に生まれた人たち（v18 11 の画面写真）
          await p.evaluate(() => { document.querySelectorAll('details.pane').forEach(d => { d.open = true; }); });
          await p.waitForTimeout(200);
          for (const [id, nm] of [['pane-kaki', 'kakitsuke'], ['pane-family', 'family'], ['pane-comps', 'comps'], ['pane-era', 'era']]) { const el = await p.$('#' + id); if (el && await el.isVisible()) await el.screenshot({ path: path.join(SHOT, tag + '-' + nm + '.png') }); }
        }
      }
      if (await p.isVisible('#pause')) { /* 最期まで */ }
      const done = await playUntil(p, async () => await p.isVisible('#screen-end'), 400000);
      check(tag + ' 最後まで遊べる', done, done ? '最期の画面まで' : '時間切れ');
      if (done) {
        await p.waitForTimeout(500);
        await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(200);
        await p.screenshot({ path: path.join(SHOT, tag + '-end.png') });
        const sw = await p.evaluate(() => document.documentElement.scrollWidth);
        check(tag + ' 最期：横のはみ出しなし', sw <= w, 'scrollWidth ' + sw);
        if (w === 1440) {
          const a = await vis(p, '#end-title', h), n = await vis(p, '#next-life', h);
          check(tag + ' 最期：送らずに名前と「この家の続きを生きる」が見える', a && n, '名前 ' + a + '・続き ' + n);
        }
      }
      await p.close();
    }
  }
  if (part === 'modal') {
    for (const [w, h] of [[1440, 900], [390, 844]]) {
      const p = await page(b, w, h, errs), tag = w + 'x' + h;
      await setup(p, 12345, { modal: true, me: false });
      const shown = await p.isVisible('#me-modal');
      check(tag + ' 初めて開いたときに窓が出る', shown);
      await p.screenshot({ path: path.join(SHOT, tag + '-modal.png') });
      const pos = await p.evaluate(() => { const r = document.querySelector('.mm-box').getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; });
      check(tag + ' 窓の出方（スマホは下から・パソコンは中央）', w < 960 ? Math.abs(pos.bottom - h) < 2 : pos.top > 20 && pos.bottom < h - 20, JSON.stringify(pos));
      await p.click('#mm-skip');
      await p.waitForTimeout(800);
      await p.goto(URL0); await p.waitForSelector('#born:not([disabled])');
      check(tag + ' 「入れずに始める」の後に開き直すと出ない', !(await p.isVisible('#me-modal')));
      await p.evaluate(() => { localStorage.clear(); localStorage.setItem('ichioku-motion', JSON.stringify('less')); });
      await p.reload(); await p.waitForSelector('#me-modal:not([hidden])');
      await p.selectOption('#mm-year', '1998'); await p.selectOption('#mm-pref', '27');
      await p.click('#mm-go'); await p.waitForTimeout(800);
      const me = await p.evaluate(() => localStorage.getItem('ichioku-me'));
      check(tag + ' 入れた値が ichioku-me に保存される', /1998/.test(me) && /"27"/.test(me), me);
      await p.goto(URL0); await p.waitForSelector('#born:not([disabled])');
      check(tag + ' 入れた人には出ない', !(await p.isVisible('#me-modal')));
      await p.close();
    }
  }
  if (part === 'top') {
    for (const [w, h] of [[1440, 900], [390, 844]]) {
      const tag = w + 'x' + h;
      let okN = 0, n = 0, brN = 0, brOk = 0;
      for (let k = 0; k < (process.argv[3] ? +process.argv[3] : 5); k++) {
        const p = await page(b, w, h, errs);
        await setup(p, 104729 * (k + 3) + w);
        await bornToBirth(p); await p.click('#bt-start'); await p.waitForSelector('#screen-life:not([hidden])');
        await p.click('#speed .o-sp:last-child').catch(() => {});
        const wantBr = k % 2 === 0, target = 6 + k * 3;
        await playUntil(p, async () => { if (await p.isVisible('#screen-end')) return true; const a = parseInt(await p.textContent('#age')); if (a < target) return false; if (wantBr) return await p.isVisible('#branch'); if (!(await p.isVisible('#branch'))) { if ((await p.getAttribute('#pause', 'aria-pressed')) !== 'true') await p.click('#pause'); return true; } return false; }, 120000);
        if (await p.isVisible('#screen-end')) { await p.close(); continue; }
        const st = () => p.evaluate(() => ({ age: document.getElementById('age').textContent, year: document.getElementById('year-now').textContent, s: ['body', 'sat', 'learn', 'tie'].map(k => document.getElementById('mini-' + k + '-v').textContent).join(','), br: !document.getElementById('branch').hidden ? (document.querySelector('#branch h2, #branch .q') || {}).textContent : null }));
        const before = await st();
        const btn = (await p.$$('[data-go-top]')).filter(async x => await x.isVisible());
        let clicked = false; for (const x of await p.$$('[data-go-top]')) { if (await x.isVisible()) { await x.click(); clicked = true; break; } }
        await p.waitForSelector('#screen-top:not([hidden])');
        const rs = await p.isVisible('#resume');
        await p.click('#resume'); await p.waitForSelector('#screen-life:not([hidden])'); await p.waitForTimeout(300);
        const after = await st();
        n++; const same = before.age === after.age && before.year === after.year && before.s === after.s && before.br === after.br;
        if (same && rs && clicked) okN++;
        if (before.br) { brN++; if (same) brOk++; }
        if (!same) errs.push(tag + ' トップへの前後で違う ' + JSON.stringify(before) + ' → ' + JSON.stringify(after));
        await p.close();
      }
      check(tag + ' 途中で「トップへ」→「続きから」で年・年齢・状態が一致（分かれ道の年 ' + brN + '件を含む）', n > 0 && okN === n, okN + '／' + n + '（分かれ道 ' + brOk + '／' + brN + '）');
    }
  }
  if (part === 'trip') {
    const seed = +process.argv[3], [w, h] = [1440, 900], tag = 'trip';
    const p = await page(b, w, h, errs);
    await setup(p, seed);
    await bornToBirth(p);
    const mt = await p.textContent('#bt-multi');
    check('三つ子の生まれの画面に「三つ子です」', /三つ子です/.test(mt), mt.slice(0, 60));
    await p.screenshot({ path: path.join(SHOT, 'triplets-birth.png') });
    await p.click('#bt-start'); await p.waitForSelector('#screen-life:not([hidden])');
    await p.click('#speed .o-sp:last-child').catch(() => {});
    const names = [];
    for (let k = 0; k < 3; k++) {
      const done = await playUntil(p, async () => await p.isVisible('#screen-end'), 400000);
      names.push(await p.textContent('#end-title'));
      if (!done) break;
      if (k === 2) break;
      const bs = await p.$$('#kyodai-list .kyodai-btn');
      let hit = null; for (const x of bs) { const t = await x.textContent(); if (/三つ子/.test(t) && !/^子の/.test(t) && !names.some(nm => t.indexOf(String(nm).split(' ').pop()) >= 0)) { hit = x; break; } }
      const cnt = []; for (const x of bs) { const t = await x.textContent(); if (/三つ子/.test(t)) cnt.push(t); }
      const allT = []; for (const x of bs) allT.push(await x.textContent());
      if (!bs.length) { await p.screenshot({ path: path.join(LOG, 'trip-fail.png'), fullPage: true }); allT.push(await p.textContent('#end-sub')); }
      if (k === 0) check('三つ子の人生で、残りの2人として生きるボタンが2つ出る', cnt.length === 2, (cnt.join(' / ') || 'なし') + '｜候補 ' + allT.join(' / ') + '｜見出し ' + (await p.isVisible('#kyodai-block')));
      if (!hit) break;
      await hit.click(); await p.waitForSelector('#screen-life:not([hidden])', { timeout: 30000 });
    }
    check('三つ子の3人全員の人生を最後まで生きる', names.length === 3, names.join('・'));
    const mb = await p.isVisible('#multi-block');
    check('全員を生き終えたら、3人の一生を並べて比べる', mb, mb ? await p.textContent('#multi-h') : '');
    if (mb) { await (await p.$('#multi-block')).screenshot({ path: path.join(SHOT, 'triplets-compare.png') }); }
    await p.close();
  }
  res.errors = errs;
  check('エラー0件・外部への通信0件', errs.length === 0, errs.slice(0, 5).join(' ／ '));
  fs.writeFileSync(path.join(LOG, 'ui18-' + part + '.json'), JSON.stringify(res, null, 1));
  for (const c of res.checks) console.log((c.ok ? '合格' : '不合格') + '\t' + c.name + '\t' + c.detail);
  await b.close();
})();
