// 時代ごとに分けたデータ（dist/js/d）で作った人生が、全部を読んだとき（site/js）とまったく同じになるかを確かめる（v19 12）
// ブラウザと同じく、スクリプトを index.html の順に1つの場所で動かし、人生ごとに、その時代の分だけを足してから作る。
// 時代を行き来して読んでいくので、読む順が変わっても並びが崩れないことも確かめられる。
// 使い方：node tools/build-dist.mjs のあとで node tools/check-split.mjs [件数]
import fs from 'fs'; import path from 'path'; import vm from 'vm'; import crypto from 'crypto';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SITE = path.join(ROOT, 'site'), DIST = path.join(ROOT, 'dist');
const N = +(process.argv[2] || 120);
const html = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8');
const order = [...html.matchAll(/<script src="js\/([a-z0-9]+)\.js"><\/script>/g)].map(m => m[1]).filter(n => !['app', 'top', 'prefs', 'avatar', 'scene', 'card', 'curve'].includes(n));
const C = JSON.parse(fs.readFileSync(path.join(SITE, 'data', 'common.json'), 'utf8')), H = JSON.parse(fs.readFileSync(path.join(SITE, 'data', 'history.json'), 'utf8'));
const P = {}; for (const p of C.prefs) P[p.code] = JSON.parse(fs.readFileSync(path.join(SITE, 'data', 'pref', p.code + '.json'), 'utf8'));
const mf = JSON.parse(fs.readFileSync(path.join(ROOT, 'logs', 'build-dist.json'), 'utf8'));
const manifest = mf.manifest || null;
if (!manifest) { console.log('不合格\t分けたデータの一覧が core に見つからない'); process.exit(1); }
function world(split) {
  const ctx = { console, Math, Date, JSON, Object, Array, String, Number, Promise, setTimeout, clearTimeout };
  ctx.self = ctx; vm.createContext(ctx);
  if (split) {
    ctx.IchiokuPaths = { list: [] }; ctx.IchiokuS6 = { choices: [], lines: [] };
    const seen = { paths: {}, s6c: {}, s6l: {} };
    const tgt = k => k === 'paths' ? ctx.IchiokuPaths.list : k === 's6c' ? ctx.IchiokuS6.choices : ctx.IchiokuS6.lines;
    ctx.IchiokuData = { put: (k, items) => { const t = tgt(k), s = seen[k]; let n = 0; for (const o of items) { if (s[o._i]) continue; s[o._i] = 1; t.push(o); n++; } if (n) t.sort((a, b) => a._i - b._i); } };
  }
  for (const n of order) {
    if (split && (n === 'paths' || n === 's6' || n === 'jobdesc')) continue;
    vm.runInContext(fs.readFileSync(path.join(SITE, 'js', n + '.js'), 'utf8'), ctx, { filename: n + '.js' });
  }
  const loaded = {};
  ctx.need = (y0, y1) => {
    if (!split) return;
    const fs0 = [manifest.files.jobdesc];
    for (const k of ['paths', 's6c', 's6l']) { if (manifest.files[k + '.all']) fs0.push(manifest.files[k + '.all']); for (const e of manifest.eras) if (e[2] >= y0 && e[1] <= y1 && manifest.files[k + '.' + e[0]]) fs0.push(manifest.files[k + '.' + e[0]]); }
    for (const f of fs0) if (f && !loaded[f]) { loaded[f] = 1; vm.runInContext(fs.readFileSync(path.join(DIST, f), 'utf8'), ctx, { filename: f }); }
    ctx.IchiokuStory.dataChanged();
  };
  return ctx;
}
function run(ctx, i) {
  const by = 1000 + (i * 389) % 1001, seed = ((i + 1) * 7919 + 4242) >>> 0, E = ctx.Ichioku, O = ctx.IchiokuOld;
  ctx.need(by, by + 115);
  let L;
  if (by >= 1975) L = E.newLife(C, P[E.pickPref(C, by, E.makeRng(seed ^ 0x9e3779b9))], { year: by, seed });
  else { const b = O.pickBirth(C, H, by, E.makeRng(seed ^ 0x9e3779b9)); L = O.newLife(C, H, P[b.pref] || null, { year: by, seed, birth: b }); }
  const M = L.old ? O : E; let g = 0;
  while (L.alive && g++ < 130) { let r = M.step(L); while (r && r.branch) r = M.resolve(L, r.branch.ask ? { text: '' } : null); }
  const h = crypto.createHash('sha1'), lines = []; L.log.forEach(r => r.events.forEach(e => { h.update(r.year + e.t); lines.push(r.year + ' ' + e.t); })); return { by, h: h.digest('hex').slice(0, 12), n: L.log.length, lines };
}
const full = world(false), split = world(true);
let diff = [];
for (let i = 0; i < N; i++) { const a = run(full, i), b = run(split, i); if (a.h !== b.h) { diff.push(a.by + '年生まれ（' + i + '件目）'); if (process.env.SHOW) { const k = a.lines.findIndex((x, j) => x !== b.lines[j]); console.log('全部：', a.lines.slice(k, k + 3).join(' / ')); console.log('分けた：', b.lines.slice(k, k + 3).join(' / ')); } } }
const ok = !diff.length;
const res = { ok, n: N, diff: diff.slice(0, 10), loadedChunks: Object.keys(split).length };
fs.writeFileSync(path.join(ROOT, 'logs', 'check-split.json'), JSON.stringify(res, null, 1));
console.log((ok ? '合格' : '不合格') + '\t時代ごとに分けたデータで作った人生が、全部を読んだときと同じ\t違った人生 ' + diff.length + '件／' + N + '件' + (diff.length ? '（' + diff.slice(0, 3).join('、') + '）' : ''));
