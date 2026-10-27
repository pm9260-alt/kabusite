// 1000分の1 記録によく出る仕事を数える（spec 13）。1000〜2000年生まれの人生を動かし、15歳から就いた仕事の名前（selfJob・pathJob）を人生ごとに1回数える
// 使い方：node tools/jobdesc-freq.mjs [人数=8000] [書き出し先=data-src/jobdesc-top.json]
// 1人およそ0.05秒。8000人で7分ほど（4つに分けて動かすときは --from 0 --n 2000 のようにして、結果を足し合わせる）
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), SITE = path.join(ROOT, 'site');
globalThis.self = globalThis;
const E = require(path.join(SITE, 'js', 'engine.js')), O = require(path.join(SITE, 'js', 'history.js'));
require(path.join(SITE, 'js', 'story.js'));
const C = JSON.parse(fs.readFileSync(path.join(SITE, 'data', 'common.json'), 'utf8')), H = JSON.parse(fs.readFileSync(path.join(SITE, 'data', 'history.json'), 'utf8'));
const P = {}; for (const p of C.prefs) P[p.code] = JSON.parse(fs.readFileSync(path.join(SITE, 'data', 'pref', p.code + '.json'), 'utf8'));
function birth(by, seed) {
  if (by >= 1975) return E.newLife(C, P[E.pickPref(C, by, E.makeRng(seed ^ 0x9e3779b9))], { year: by, seed });
  const b0 = O.pickBirth(C, H, by, E.makeRng(seed ^ 0x9e3779b9));
  return O.newLife(C, H, P[b0.pref] || null, { year: by, seed, birth: b0 });
}
const args = process.argv.slice(2), opt = k => args.includes(k) ? args[args.indexOf(k) + 1] : null;
const N = +(opt('--n') || args.find(a => /^\d+$/.test(a)) || 8000), FROM = +(opt('--from') || 0);
const OUT = opt('--out') || path.join(ROOT, 'data-src', 'jobdesc-top.json');
const cnt = {};
for (let i = FROM; i < FROM + N; i++) {
  const by = 1000 + (i * 37) % 1001, L = birth(by, ((i + 1) * 7919 + 5) >>> 0), M = L.old ? O : E, seen = {};
  let g = 0;
  const note = n => { if (n && !seen[n]) { seen[n] = 1; cnt[n] = (cnt[n] || 0) + 1; } };
  while (L.alive && g++ < 130) {
    let r = M.step(L);
    while (r && r.branch) r = M.resolve(L, r.branch.ask ? { text: '' } : null);
    if (L.year - L.by >= 15) { note(L.selfJob && L.selfJob.n); note(L.pathJob && L.pathJob.n); }
  }
}
const top = Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 300);
fs.writeFileSync(OUT, JSON.stringify({ note: '13 記録によく出る仕事の上位300（tools/jobdesc-freq.mjs：1000〜2000年生まれの' + N + '人の人生で、15歳から就いた仕事の名前を人生ごとに1回数えた）', lives: N, top }, null, 0).replace(/\],\[/g, '],\n['));
console.log('人生 ' + N + '・仕事の名前 ' + Object.keys(cnt).length + '・300位の回数 ' + (top[299] || [])[1]);
