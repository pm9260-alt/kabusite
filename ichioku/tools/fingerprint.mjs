// 人生N件の出来事の文を1つのハッシュにまとめる（データの分け方や読み込み順で結果が変わらないことを確かめる。v19 12）
// 使い方：node tools/fingerprint.mjs [件数]
import fs from 'fs'; import path from 'path'; import crypto from 'crypto'; import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const SITE = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'site');
const E = require(SITE + '/js/engine.js'), O = require(SITE + '/js/history.js');
const C = JSON.parse(fs.readFileSync(SITE + '/data/common.json', 'utf8')), H = JSON.parse(fs.readFileSync(SITE + '/data/history.json', 'utf8'));
const P = {}; for (const p of C.prefs) P[p.code] = JSON.parse(fs.readFileSync(SITE + '/data/pref/' + p.code + '.json', 'utf8'));
const n = +(process.argv[2] || 150), h = crypto.createHash('sha1');
for (let i = 0; i < n; i++) {
  const by = 1000 + (i * 37) % 1001, seed = ((i + 1) * 7919 + 77) >>> 0;
  let L;
  if (by >= 1975) L = E.newLife(C, P[E.pickPref(C, by, E.makeRng(seed ^ 0x9e3779b9))], { year: by, seed });
  else { const b = O.pickBirth(C, H, by, E.makeRng(seed ^ 0x9e3779b9)); L = O.newLife(C, H, P[b.pref] || null, { year: by, seed, birth: b }); }
  const M = L.old ? O : E; let g = 0;
  while (L.alive && g++ < 130) { let r = M.step(L); while (r && r.branch) r = M.resolve(L, r.branch.ask ? { text: '' } : null); }
  L.log.forEach(r => r.events.forEach(e => h.update(r.year + e.t)));
}
console.log(h.digest('hex'));
