// v19 受け入れ（ブラウザ）：node tools/ui19.cjs <試験> [件数] [幅]
//   auto  N  … 「すべておまかせ」だけを押して、何も押さずに死亡記録まで進むか（生まれの画面・5秒の表示・帯の名前も確かめる）
//   band     … 390×844・360×740・1440×900 で、いちばん下まで送っても帯に名前が見えるか
//   cont     … 亡くなった後の続きのボタンが3つ以下・家系図への案内・子孫をたどる・きょうだい／子／子孫の人生が生まれの画面から始まるか
//   desc  N  … 生まれた年と都道府県を入れて、あなたにつながる子孫を N 代続け、距離と年が近づくか
//   inputs   … どの画面にも文を書かせる入力欄がないか（名前の欄と選ぶ欄は除く）
// 結果は logs/ui19/<試験>.json と画面写真。サーバーは site/ で python3 -m http.server 8123
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, '..', 'logs', 'ui19'); fs.mkdirSync(OUT, { recursive: true });
const URL = 'http://localhost:8123/index.html';
const MODE = process.argv[2] || 'auto', N = +(process.argv[3] || 5), W = +(process.argv[4] || 390);
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function page(b, w, h) {
  const p = await b.newPage({ viewport: { width: w, height: h || (w > 900 ? 900 : 844) } });
  p.errs = []; p.ext = [];
  p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') p.errs.push(m.text()); });
  p.on('request', q => { if (!/^http:\/\/localhost:8123\//.test(q.url()) && !/^(data|blob):/.test(q.url())) p.ext.push(q.url()); });
  return p;
}
async function prep(p, seed, extra) {
  await p.goto(URL);
  await p.evaluate(([s, ex]) => {
    localStorage.clear();
    localStorage.setItem('ichioku-seen-me', '1'); localStorage.setItem('ichioku-tip', '1');
    localStorage.setItem('ichioku-speed', '5');
    Object.keys(ex || {}).forEach(k => localStorage.setItem(k, JSON.stringify(ex[k])));
    if (s) { let x = s; crypto.getRandomValues = a => { for (let i = 0; i < a.length; i++) { x = (x * 1103515245 + 12345) >>> 0; a[i] = x; } return a; }; }
  }, [seed, extra]);
  await p.reload();
  await p.evaluate(s => { if (s) { let x = s; crypto.getRandomValues = a => { for (let i = 0; i < a.length; i++) { x = (x * 1103515245 + 12345) >>> 0; a[i] = x; } return a; }; } }, seed);
  await p.waitForSelector('#born:not([disabled])', { timeout: 30000 });
}
const vis = (p, id) => p.evaluate(i => { const e = document.getElementById(i); return !!e && !e.hidden && e.offsetParent !== null; }, id);
// 何も押さずに最期まで（止まった時間が60秒を超えたら止まったとみる）
async function autoRun(p, seed, tag) {
  await prep(p, seed, { 'ichioku-auto': '2' });
  await p.evaluate(() => localStorage.setItem('ichioku-auto', '2'));
  await p.reload(); await p.waitForSelector('#born:not([disabled])', { timeout: 30000 });
  const t0 = Date.now(); await p.click('#born');
  const r = { seed, birth: false, autoLine: '', end: false, stuck: null, by: null, age: null, band: '' };
  let last = '', lastT = Date.now();
  while (Date.now() - t0 < 600000) {
    if (!r.birth && await vis(p, 'screen-birth')) { r.birth = true; r.autoLine = await p.textContent('#bt-auto').catch(() => ''); r.by = parseInt(await p.textContent('#bt-sub')); }
    if (await vis(p, 'screen-end')) { r.end = true; break; }
    const st = await p.evaluate(() => [document.getElementById('age') && document.getElementById('age').textContent, document.body.dataset.screen, !document.getElementById('branch').hidden].join('|'));
    if (st !== last) { last = st; lastT = Date.now(); }
    if (await vis(p, 'screen-life') && !r.band) r.band = await p.textContent('#o-name');
    if (Date.now() - lastT > 60000) { r.stuck = st; await p.screenshot({ path: path.join(OUT, tag + '-stuck-' + seed + '.png') }); break; }
    await sleep(250);
  }
  if (r.end) r.age = await p.evaluate(() => parseInt(String(document.getElementById('end-sub').textContent).split('·')[1]));
  r.secs = Math.round((Date.now() - t0) / 1000);
  return r;
}
(async () => {
  const b = await chromium.launch(); const res = { mode: MODE, at: new Date().toISOString(), bad: [] };
  if (MODE === 'auto') {
    const p = await page(b, W); res.runs = [];
    for (let i = 0; i < N; i++) {
      const r = await autoRun(p, 1000 + i * 7919, 'auto');
      res.runs.push(r);
      if (!r.birth) res.bad.push('生まれの画面が出ない ' + r.seed);
      if (!/5秒後に人生を始めます・画面を押すと止まります/.test(r.autoLine)) res.bad.push('5秒の表示がない ' + r.seed);
      if (!r.end) res.bad.push('最期まで進まない ' + r.seed + ' ' + r.stuck);
      if (!r.band) res.bad.push('帯に名前がない ' + r.seed);
      console.log(JSON.stringify(r));
    }
    const eras = {}; res.runs.forEach(r => { const k = r.by < 1600 ? '1000〜1599' : r.by < 1868 ? '1600〜1867' : r.by < 1946 ? '1868〜1945' : '1946〜'; eras[k] = (eras[k] || 0) + 1; });
    res.summary = { runs: N, end: res.runs.filter(r => r.end).length, stuck: res.runs.filter(r => !r.end).length, eras, errors: p.errs.length, ext: p.ext.length };
    if (p.errs.length) res.bad.push('画面のエラー ' + p.errs.slice(0, 3).join(' / '));
    if (p.ext.length) res.bad.push('外部への通信 ' + p.ext.slice(0, 2).join(' '));
  }
  if (MODE === 'band') {
    res.sizes = [];
    for (const [w, h] of [[390, 844], [360, 740], [1440, 900]]) {
      const p = await page(b, w, h);
      await prep(p, 4242);
      await p.click('#born'); await p.waitForSelector('#screen-birth:not([hidden])', { timeout: 30000 });
      const bn = await p.textContent('#bt-name');
      await p.click('#bt-start'); await p.waitForSelector('#screen-life:not([hidden])');
      for (let k = 0; k < 40 && (await p.$$('#feed > *')).length < 12; k++) { if (await vis(p, 'branch')) { const o = await p.$('#branch .opt-btn'); if (o) await o.click(); } await sleep(300); }
      await p.click('#pause').catch(() => {});
      await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await sleep(300);
      const r = await p.evaluate(() => { const e = document.getElementById('o-name'), rc = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { name: e.textContent, top: Math.round(rc.top), h: Math.round(rc.height), w: Math.round(rc.width), vis: cs.display !== 'none' && cs.visibility !== 'hidden' && rc.height > 0 && rc.top >= 0 && rc.bottom <= innerHeight, fs: cs.fontSize, ageFs: getComputedStyle(document.getElementById('age')).fontSize, scrolled: scrollY, over: document.documentElement.scrollWidth - innerWidth }; });
      r.size = w + '×' + h; r.birthName = bn; res.sizes.push(r);
      await p.screenshot({ path: path.join(OUT, 'band-' + w + '.png') });
      if (!r.vis || !r.name) res.bad.push(r.size + ' 帯の名前が見えない');
      if (r.over > 0) res.bad.push(r.size + ' 横にはみ出す ' + r.over);
      if (!bn) res.bad.push(r.size + ' 生まれの画面に名前がない');
      if (/（.*氏）/.test(r.name)) res.bad.push(r.size + ' 帯に氏が出た');
      if (p.errs.length) res.bad.push(r.size + ' エラー ' + p.errs[0]);
      await p.close();
    }
  }
  if (MODE === 'inputs') {
    const p = await page(b, W);
    await prep(p, 777);
    const count = () => p.evaluate(() => [...document.querySelectorAll('textarea, input')].filter(e => !['hidden', 'checkbox', 'radio'].includes(e.type) && e.id !== 'pet-name').map(e => e.id || e.className || e.type));
    const seen = new Set((await count()));
    await p.click('#born'); await p.waitForSelector('#screen-birth:not([hidden])', { timeout: 30000 }); (await count()).forEach(x => seen.add(x));
    await p.click('#bt-start');
    for (let k = 0; k < 1200 && !(await vis(p, 'screen-end')); k++) {
      if (await vis(p, 'branch')) { (await count()).forEach(x => seen.add(x)); const o = await p.$('#branch .opt-btn'); if (o) await o.click().catch(() => {}); const m = await p.$('#branch .btn-main'); if (m && await m.isVisible()) await m.click().catch(() => {}); }
      await sleep(100);
    }
    (await count()).forEach(x => seen.add(x));
    res.inputs = [...seen]; if (res.inputs.length) res.bad.push('文を書かせる入力欄 ' + res.inputs.join(','));
    const html = ['index.html', 'contact.html', 'about.html', 'privacy.html'].map(f => fs.readFileSync(path.join(__dirname, '..', 'site', f), 'utf8')).join('');
    res.htmlInputs = (html.match(/<(textarea|input)\b/g) || []).length; if (res.htmlInputs) res.bad.push('HTML に入力欄 ' + res.htmlInputs);
    if (p.errs.length) res.bad.push('エラー ' + p.errs[0]);
  }
  if (MODE === 'cont') {
    // 子・きょうだい・子孫の3つのボタン、家系図への案内、子孫をたどる。それぞれから始めた人生で生まれの画面が出るか
    const p = await page(b, W); res.runs = [];
    for (let i = 0; i < N; i++) {
      await prep(p, 9000 + i * 104729);
      await p.click('#born'); await p.waitForSelector('#screen-birth:not([hidden])', { timeout: 30000 }); await p.click('#bt-start');
      const t0 = Date.now();
      while (Date.now() - t0 < 300000 && !(await vis(p, 'screen-end'))) { if (await vis(p, 'branch')) { const o = await p.$('#branch .opt-btn'); if (o) await o.click().catch(() => {}); const m = await p.$('#branch .btn-main'); if (m && await m.isVisible()) await m.click().catch(() => {}); } if (await p.isVisible('#death-skip').catch(() => false)) await p.click('#death-skip').catch(() => {}); await sleep(120); }
      await sleep(600);
      const r = await p.evaluate(() => ({ btns: [...document.querySelectorAll('#kyodai-list button')].map(b => b.className.replace('btn-sub kyodai-btn ', '') + ':' + b.textContent), link: !document.getElementById('tree-link').hidden && /家系図から選べます/.test(document.getElementById('tree-link').textContent), desc: !document.getElementById('tree-desc').hidden, same: !!document.getElementById('same-life'), again: !!document.getElementById('again') }));
      r.seed = 9000 + i * 104729; res.runs.push(r);
      if (r.btns.length > 3) res.bad.push('ボタンが3つより多い ' + r.btns.length);
      if (!r.link) res.bad.push('家系図への案内がない ' + r.seed);
      if (i === 0) await p.screenshot({ path: path.join(OUT, 'cont-' + W + '.png'), fullPage: true });
      // 1つ目のボタンから続きの人生へ：生まれの画面が出るか
      if (r.btns.length) {
        await p.click('#kyodai-list button');
        const ok = await p.waitForSelector('#screen-birth:not([hidden])', { timeout: 60000 }).then(() => true).catch(() => false);
        r.nextBirth = ok; r.nextName = ok ? await p.textContent('#bt-name') : '';
        if (!ok) res.bad.push('続きの人生で生まれの画面が出ない ' + r.btns[0]);
      }
      console.log(JSON.stringify(r));
    }
    if (p.errs.length) res.bad.push('エラー ' + p.errs.slice(0, 2).join(' / '));
  }
  if (MODE === 'desc') {
    const p = await page(b, W); const me = { y: 1998, pref: '13' };
    await prep(p, 31337, { 'ichioku-me': me });
    // 1000〜1500年に生まれるまで引き直す
    let by = 0;
    for (let k = 0; k < 60; k++) { await p.click('#born'); await p.waitForSelector('#screen-birth:not([hidden])', { timeout: 30000 }); by = parseInt(await p.textContent('#bt-sub')); if (by <= 1600) break; await p.click('[data-go-top]').catch(() => {}); await prep(p, 31337 + k * 17, { 'ichioku-me': me }); }
    res.gens = [{ by, place: await p.textContent('#bt-sub') }];
    for (let g = 0; g < N; g++) {
      await p.click('#bt-start');
      const t0 = Date.now();
      while (Date.now() - t0 < 300000 && !(await vis(p, 'screen-end'))) { if (await vis(p, 'branch')) { const o = await p.$('#branch .opt-btn'); if (o) await o.click().catch(() => {}); const m = await p.$('#branch .btn-main'); if (m && await m.isVisible()) await m.click().catch(() => {}); } if (await p.isVisible('#death-skip').catch(() => false)) await p.click('#death-skip').catch(() => {}); await sleep(120); }
      await sleep(600);
      const btn = await p.$('#kyodai-list button.to-me');
      if (!btn) { res.gens.push({ end: 'あなたにつながる子孫のボタンなし', btns: await p.$$eval('#kyodai-list button', x => x.map(b => b.textContent)) }); break; }
      await btn.click();
      await p.waitForSelector('#screen-birth:not([hidden])', { timeout: 60000 });
      const info = await p.evaluate(() => ({ sub: document.getElementById('bt-sub').textContent, grid: [...document.querySelectorAll('#bt-grid .rc-item')].map(d => d.textContent).filter(t => /あなた/.test(t)) }));
      res.gens.push(info); console.log(JSON.stringify(info));
      if (!info.grid.length) res.bad.push('生まれの画面に「あなたまで」がない');
      await p.screenshot({ path: path.join(OUT, 'desc-' + g + '.png') });
    }
    if (p.errs.length) res.bad.push('エラー ' + p.errs.slice(0, 2).join(' / '));
  }
  fs.writeFileSync(path.join(OUT, MODE + (W !== 390 ? '-' + W : '') + '.json'), JSON.stringify(res, null, 1));
  console.log('気になる点', res.bad.length, JSON.stringify(res.bad.slice(0, 10)), JSON.stringify(res.summary || ''));
  await b.close();
})();
