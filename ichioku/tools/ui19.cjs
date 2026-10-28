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
const URL = process.env.ICHIOKU_URL || 'http://localhost:8123/index.html';
const MODE = process.argv[2] || 'auto', N = +(process.argv[3] || 5), W = +(process.argv[4] || 390);
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function page(b, w, h) {
  const p = await b.newPage({ viewport: { width: w, height: h || (w > 900 ? 900 : 844) } });
  p.errs = []; p.ext = [];
  p.on('pageerror', e => p.errs.push(e.message + ' @ ' + String(e.stack || '').split('\n').slice(1, 4).join(' | '))); p.on('console', m => { if (m.type() === 'error') p.errs.push(m.text()); });
  p.on('request', q => { if (!/^http:\/\/localhost:812[0-9]\//.test(q.url()) && !/^(data|blob):/.test(q.url())) p.ext.push(q.url()); });
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
      const r = await autoRun(p, 1000 + (i + +(process.env.ICHIOKU_SEED0 || 0)) * 7919, 'auto');
      r.errs = p.errs.length - (res.errN || 0); res.errN = p.errs.length; if (r.errs) r.err = p.errs[p.errs.length - 1];
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
    // 生まれた年と都道府県（1998年・東京都）を入れて、「あなたにつながる子孫」を N 代続ける。途中の代が15歳前に亡くなって続かないときは、別の人生からやり直す
    const p = await page(b, W); const me = { y: 1998, pref: '13' };
    res.tries = [];
    for (let at = 0; at < 15; at++) {
      await prep(p, 31337 + at * 7717, { 'ichioku-me': me });
      let by = 0;
      for (let k = 0; k < 60; k++) { await p.click('#born'); await p.waitForSelector('#screen-birth:not([hidden])', { timeout: 30000 }); by = parseInt(await p.textContent('#bt-sub')); if (by <= 1600) break; await prep(p, 31337 + at * 7717 + k * 17 + 1, { 'ichioku-me': me }); }
      const gens = [{ by, sub: await p.textContent('#bt-sub') }];
      let broke = '';
      for (let g = 0; g < N; g++) {
        await p.click('#bt-start');
        const t0 = Date.now();
        while (Date.now() - t0 < 600000 && !(await vis(p, 'screen-end'))) { if (await vis(p, 'branch')) { const o = await p.$('#branch .opt-btn'); if (o) await o.click().catch(() => {}); const m = await p.$('#branch .btn-main'); if (m && await m.isVisible()) await m.click().catch(() => {}); } if (await p.isVisible('#death-skip').catch(() => false)) await p.click('#death-skip').catch(() => {}); await sleep(120); }
        await sleep(600);
        const btn = await p.$('#kyodai-list button.to-me');
        if (!btn) { broke = (g + 1) + '代目が子孫を残す前に亡くなった'; break; }
        gens[gens.length - 1].btn = await btn.textContent();
        await btn.click();
        await p.waitForSelector('#screen-birth:not([hidden])', { timeout: 60000 });
        const info = await p.evaluate(() => ({ sub: document.getElementById('bt-sub').textContent, grid: [...document.querySelectorAll('#bt-grid .rc-item')].map(d => d.textContent).filter(t => /あなた/.test(t)) }));
        info.by = parseInt(info.sub); const km = (info.grid.join(' ').match(/約([\d,]+)km/) || [])[1]; info.km = km ? +km.replace(/,/g, '') : (/同じ都道府県/.test(info.grid.join('')) ? 0 : null);
        gens.push(info); console.log(JSON.stringify(info));
        if (!info.grid.length) res.bad.push('生まれの画面に「あなたまで」がない');
        await p.screenshot({ path: path.join(OUT, 'desc-' + g + '.png') });
      }
      res.tries.push({ at, gens: gens.length - 1, broke });
      if (gens.length - 1 >= N) { res.gens = gens; break; }
    }
    if (!res.gens) res.bad.push(N + '代続けられた人生がない（' + res.tries.map(t => t.gens + '代・' + t.broke).join('／') + '）');
    else {
      const kms = res.gens.slice(1).map(g => g.km).filter(x => x != null), ys = res.gens.map(g => g.by);
      if (!(kms.length >= 2 && kms[kms.length - 1] <= kms[0])) res.bad.push('代を重ねても、あなたの都道府県に近づかない ' + kms.join('→'));
      for (let k = 1; k < ys.length; k++) if (ys[k] <= ys[k - 1]) res.bad.push('生まれ年が進まない ' + ys.join('→'));
      res.summary = { years: ys.join('→'), km: kms.join('→'), tries: res.tries.length };
    }
    if (p.errs.length) res.bad.push('エラー ' + p.errs.slice(0, 2).join(' / '));
  }
  if (MODE === 'births') {
    // 自分で選ぶ遊び方で、生まれ年を入れずに、いろいろな時代の生まれの画面を開く（比べの表が出て、「人生を始める」で人生が始まるか。v19 で 1975年からの生まれが止まっていた誤りの再発を防ぐ）
    const p = await page(b, W); res.runs = [];
    for (let i = 0; i < N; i++) {
      await prep(p, 0);
      // 時代ごとに同じ数ずつ（1000〜1599・1600〜1867・1868〜1974・1975〜）になる種を、画面と同じ計算で選ぶ
      const E = require(path.join(__dirname, '..', 'site', 'js', 'engine.js')), CM = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'site', 'data', 'common.json'), 'utf8')), R = CM.meta.birthRange;
      const band = [[1000, 1599], [1600, 1867], [1868, 1974], [1975, 2000]][i % 4];
      let sd = 0; for (let k = 1; ; k++) { const c = (Math.imul(i * 100003 + k, 2654435761) >>> 0) || 1, y = R[0] + Math.floor(E.makeRng(c ^ 0x51ed270b)() * (R[1] - R[0] + 1)); if (y >= band[0] && y <= band[1]) { sd = c; break; } }
      await p.goto(URL + '?seed=' + sd); await p.waitForSelector('#born:not([disabled])', { timeout: 30000 });
      await p.click('#born');
      const ok = await p.waitForSelector('#screen-birth:not([hidden])', { timeout: 60000 }).then(() => true).catch(() => false);
      const r = { seed: sd, birth: ok, by: ok ? parseInt(await p.textContent('#bt-sub')) : null, rows: ok ? await p.$$eval('#bt-tab tbody tr, .bt-tab tbody tr', x => x.length) : 0 };
      if (ok) { await p.click('#bt-start'); r.life = await p.waitForSelector('#screen-life:not([hidden])', { timeout: 20000 }).then(() => true).catch(() => false); }
      res.runs.push(r);
      if (!r.birth || !r.life || !r.rows) res.bad.push('生まれの画面か比べの表で止まる ' + JSON.stringify(r));
    }
    const eras = {}; res.runs.forEach(r => { const k = r.by == null ? '不明' : r.by < 1600 ? '1000〜1599' : r.by < 1868 ? '1600〜1867' : r.by < 1975 ? '1868〜1974' : '1975〜'; eras[k] = (eras[k] || 0) + 1; });
    res.summary = { runs: N, ok: res.runs.filter(r => r.birth && r.life && r.rows).length, eras, errors: p.errs.length };
    if (p.errs.length) res.bad.push('エラー ' + p.errs.slice(0, 2).join(' / '));
  }
  if (MODE === 'accept') {
    // 受け入れ条件 4 の遊び方（tools/find-seeds.mjs で探した人生を ?seed= で開き、分かれ道はいつも1つ目を選ぶ）
    const seeds = JSON.parse(fs.readFileSync(path.join(OUT, 'seeds.json'), 'utf8')), want = k => !process.env.ACCEPT_ONLY || process.env.ACCEPT_ONLY === k;
    const p = await page(b, W); res.checks = [];
    const ck = (name, ok, detail) => { res.checks.push({ name: name + '（' + W + '）', ok: !!ok, detail }); if (!ok) res.bad.push(name + ' ' + detail); };
    async function open(seed, extra) {
      await prep(p, 0, extra);
      await p.goto(URL + '?seed=' + seed); await p.waitForSelector('#born:not([disabled])', { timeout: 30000 });
      await p.click('#born'); await p.waitForSelector('#screen-birth:not([hidden])', { timeout: 60000 });
    }
    async function play(stop, onBr) {
      await p.click('#bt-start');
      const t0 = Date.now();
      while (Date.now() - t0 < 900000) {
        if (await vis(p, 'screen-end')) return 'end';
        if (stop && await stop()) return 'stop';
        if (await vis(p, 'branch')) {
          if (onBr) await onBr();
          const groups = await p.$$('#branch .opts');
          if (groups.length > 1) { for (const g of groups) { const o = await g.$('.opt-btn'); if (o) await o.click().catch(() => {}); } const m = await p.$('#branch .btn-main'); if (m) await m.click().catch(() => {}); }
          else { const o = await p.$('#branch .opt-btn'); if (o) await o.click().catch(() => {}); else { const m = await p.$('#branch .btn-main'); if (m && await m.isVisible()) await m.click().catch(() => {}); } }
        }
        if (await p.isVisible('#death-skip').catch(() => false)) await p.click('#death-skip').catch(() => {});
        await sleep(80);
      }
      await p.screenshot({ path: path.join(OUT, 'accept-timeout-' + W + '-' + Date.now() + '.png') }); res.lastState = await p.evaluate(() => ({ screen: document.body.dataset.screen, age: (document.getElementById('age') || {}).textContent, branch: !document.getElementById('branch').hidden && document.getElementById('branch').innerText.slice(0, 300), paused: document.getElementById('pause').getAttribute('aria-pressed') }));
      return 'timeout';
    }
    // 一生の記録（最期の画面の「一生をふり返る」で開く全部の記録）
    const feed = async () => { if (await p.isVisible('#end-log')) { await p.click('#end-log'); await sleep(500); } const t = await p.evaluate(() => (document.getElementById('sheet') || {}).innerText || '') + '\n' + await p.evaluate(() => [...document.querySelectorAll('#feed li')].map(x => x.textContent).join('\n')); await p.keyboard.press('Escape').catch(() => {}); await sleep(200); return t; };
    const endGrid = () => p.evaluate(() => (document.getElementById('rc-grid') || {}).innerText || '');
    // 江戸の被差別身分の家に生まれる人生を25歳まで
    if (seeds.outcast && want('outcast')) {
      await open(seeds.outcast.seed);
      const grid = await p.textContent('#bt-grid');
      const r = await play(() => p.evaluate(() => +document.getElementById('age').textContent >= 25));
      const age = await p.evaluate(() => +document.getElementById('age').textContent);
      await p.screenshot({ path: path.join(OUT, 'accept-outcast-' + W + '.png') });
      const all = await p.evaluate(() => document.body.innerText);
      ck('江戸の被差別身分の家に生まれる人生を25歳まで', /被差別身分/.test(grid) && age >= 25 && !/えた|ひにん|非人|穢多/.test(all), seeds.outcast.by + '年生まれ・生まれの画面「' + (grid.match(/身分と家[^\n]*\n?[^\n]*/) || [''])[0].replace(/\s+/g, ' ') + '」・' + age + '歳まで進んだ（' + r + '）');
    }
    // 動物を迎える人生を、動物が亡くなるまで
    if (seeds.pet && want('pet')) {
      await open(seeds.pet.seed);
      let field = false, offered = '';
      const r = await play(null, async () => { if (await p.$('#pet-name')) { field = true; offered = offered || await p.textContent('#branch'); } });
      const g = await endGrid();
      await p.screenshot({ path: path.join(OUT, 'accept-pet-' + W + '.png'), fullPage: true });
      ck('動物を迎える人生を、動物が亡くなるまで', field && /ともに暮らした動物/.test(g), '名前の欄 ' + (field ? 'あり' : 'なし') + '・最期の画面「' + ((g.match(/ともに暮らした動物\s*\n?([^\n]*)/) || [])[1] || 'なし') + '」・' + r);
      // 亡くなった後：続きのボタンは3つ以下・家系図から別の家族を選んで生きる
      await sleep(600);
      const btns = await p.$$eval('#kyodai-list button', x => x.length);
      const hit = await p.$('#tree-end rect[role="button"]');
      let started = false, who = '';
      if (hit) { await hit.click(); await sleep(400); const lb = await p.$('.person-live:not([disabled])'); if (lb) { who = await p.evaluate(() => (document.getElementById('sheet-title') || {}).textContent || ''); await lb.click(); started = await p.waitForSelector('#screen-birth:not([hidden])', { timeout: 60000 }).then(() => true).catch(() => false); } }
      const nm = started ? await p.textContent('#bt-name') : '';
      ck('亡くなった後、続きのボタンが3つ以下で、家系図から別の家族を選んで生きる', btns <= 3 && started, '続きのボタン ' + btns + 'つ・家系図から選んだ人「' + (who || nm) + '」の生まれの画面 ' + (started ? '出た' : '出ない'));
    }
    // 2020年代に結婚する人生
    if (seeds.marry2020 && want('marry2020')) { await open(seeds.marry2020.seed); const r = await play(); const f = await feed(); const m = f.split('\n').find(t => /と結婚しました/.test(t)) || ''; ck('2020年代に結婚する人生', /と結婚しました/.test(f), seeds.marry2020.by + '年生まれ・「' + m.slice(0, 60) + '」・' + r); }
    // 20歳以降に公営競技に賭ける人生
    if (seeds.kake && want('kake')) { await open(seeds.kake.seed); let seen = ''; const r = await play(null, async () => { const t = await p.textContent('#branch'); if (/競馬|競輪|競艇|ボートレース|オートレース|G1|八大競走|最終レース/.test(t) && !seen) seen = t.replace(/\s+/g, ' ').slice(0, 60); }); ck('20歳以降に競馬や競輪などに賭ける人生', !!seen, seeds.kake.by + '年生まれ・分かれ道「' + seen + '」・' + r); }
    // プロの選手になる人生
    if (seeds.athlete && want('athlete')) { await open(seeds.athlete.seed); const r = await play(); const f = await feed(); const g = await endGrid(); const ok = /選手/.test(f + g); ck('プロの選手になる人生', ok, seeds.athlete.by + '年生まれ・' + seeds.athlete.t + '・' + r); }
    if (p.errs.length) res.bad.push('エラー ' + p.errs.slice(0, 2).join(' / '));
    ck('画面のエラー・外部への通信', !p.errs.length && !p.ext.length, 'エラー ' + p.errs.length + '・外部への通信 ' + p.ext.length);
  }
  fs.writeFileSync(path.join(OUT, MODE + (W !== 390 ? '-' + W : '') + (process.env.ICHIOKU_PART ? '-' + process.env.ICHIOKU_PART : '') + '.json'), JSON.stringify(res, null, 1));
  console.log('気になる点', res.bad.length, JSON.stringify(res.bad.slice(0, 10)), JSON.stringify(res.summary || ''));
  await b.close();
})();
