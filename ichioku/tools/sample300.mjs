// 7 の目で確かめる300文（v19）：記録500件から、出来事の文を無作為に300文取り出す。分かれ道のあとの文には、画面と同じく「決めたこと」を添える
// 使い方：node tools/sample300.mjs → logs/sample300.json（文・年・年齢・決めたこと）。目で確かめた結果は data-src/review300.json に書き、run-checks.mjs が test-results.md に出す
import fs from 'fs'; import path from 'path'; import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), SITE = path.join(ROOT, 'site');
const E = require(SITE + '/js/engine.js'), O = require(SITE + '/js/history.js'), PO = require(SITE + '/js/polite.js');
const C = JSON.parse(fs.readFileSync(SITE + '/data/common.json', 'utf8')), H = JSON.parse(fs.readFileSync(SITE + '/data/history.json', 'utf8'));
const P = {}; for (const p of C.prefs) P[p.code] = JSON.parse(fs.readFileSync(SITE + '/data/pref/' + p.code + '.json', 'utf8'));
const all = [];
for (let i = 0; i < 500; i++) {
  const by = 1000 + (i * 211) % 1001, seed = ((i + 1) * 15485863 + 300) >>> 0;
  let L;
  if (by >= 1975) L = E.newLife(C, P[E.pickPref(C, by, E.makeRng(seed ^ 0x9e3779b9))], { year: by, seed });
  else { const b = O.pickBirth(C, H, by, E.makeRng(seed ^ 0x9e3779b9)); L = O.newLife(C, H, P[b.pref] || null, { year: by, seed, birth: b }); }
  const M = L.old ? O : E; let g = 0;
  while (L.alive && g++ < 130) { let r = M.step(L); while (r && r.branch) r = M.resolve(L, r.branch.ask ? { text: '' } : null); }
  for (const r of L.log) for (const e of r.events) {
    if (e.cat === '時代' && !e.story) continue;
    const t = PO.polite(e.t);
    for (const s of t.split(/(?<=。)(?![」』）])/)) { const k = s.trim(); if (k.length >= 6) all.push({ life: i, y: r.year, a: r.age, did: e.story && r.storyPick ? r.storyPick : '', t: k }); }
  }
}
// 決まった種で並べ替えて300文（毎回同じ300文になる）
let x = 20261028; const rnd = () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
const pick = all.slice(0, 300);
fs.mkdirSync(path.join(ROOT, 'logs'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'logs', 'sample300.json'), JSON.stringify(pick, null, 1));
console.log('文 ' + all.length + ' から 300 文を取り出した → logs/sample300.json');
