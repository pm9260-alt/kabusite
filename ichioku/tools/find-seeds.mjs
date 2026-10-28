// ブラウザの受け入れ試験で開く人生の種を探す（v19）。画面と同じ作り方（yearOfSeed・pickBirth・newLife）で、分かれ道はいつも1つ目を選ぶ
// 使い方：node tools/find-seeds.mjs → logs/ui19/seeds.json
import fs from 'fs'; import path from 'path'; import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), SITE = path.join(ROOT, 'site');
const E = require(SITE + '/js/engine.js'), O = require(SITE + '/js/history.js');
const C = JSON.parse(fs.readFileSync(SITE + '/data/common.json', 'utf8')), H = JSON.parse(fs.readFileSync(SITE + '/data/history.json', 'utf8'));
const P = {}; const gp = c => P[c] || (P[c] = JSON.parse(fs.readFileSync(SITE + '/data/pref/' + c + '.json', 'utf8')));
const yearOf = sd => { const r = C.meta.birthRange; return r[0] + Math.floor(E.makeRng(sd ^ 0x51ed270b)() * (r[1] - r[0] + 1)); };
function make(sd) {
  const y = yearOf(sd);
  if (y >= 1975) return E.newLife(C, gp(E.pickPref(C, y, E.makeRng(sd ^ 0x9e3779b9))), { year: y, seed: sd });
  const b = O.pickBirth(C, H, y, E.makeRng(sd ^ 0x9e3779b9)); return O.newLife(C, H, gp(b.pref), { year: y, seed: sd, birth: b });
}
const first = br => { const a = {}; (br.groups || []).forEach(g => { a[g.id] = (g.options[0] || {}).k; }); return a; };
function play(L, onBr) { const M = L.old ? O : E; let g = 0; while (L.alive && g++ < 130) { let r = M.step(L); while (r && r.branch) { if (onBr) onBr(r.branch, L); r = M.resolve(L, r.branch.ask ? { text: '' } : first(r.branch)); } } return L; }
const want = {
  outcast: L => L.by >= 1600 && L.by <= 1842 && L.status === 'outcast',
  pet: null, marry2020: null, kake: null, athlete: null
};
const out = {};
for (let i = 1; i < 400000 && Object.keys(out).length < 5; i++) {
  const sd = (Math.imul(i, 2654435761) >>> 0) || 1, y = yearOf(sd);
  if (!out.outcast && y >= 1600 && y <= 1842) { const L = make(sd); if (L.status === 'outcast') { play(L); if (L.deathAge >= 25) out.outcast = { seed: sd, by: L.by, age: L.deathAge }; } continue; }
  if (!out.pet && y >= 1950 && y <= 1990 && i % 7 === 0) { const L = make(sd); let saw = false; play(L, br => { if (br.d && br.d.cid === '_pet') saw = true; }); const p = (L.pets || []).find(p => p.dy != null && p.dy < L.deathYear); if (saw && p) out.pet = { seed: sd, by: L.by, pet: p.a + ' ' + p.name, from: p.y, died: p.dy }; continue; }
  if ((!out.marry2020 || !out.kake || !out.athlete) && y >= 1950 && y <= 2000 && i % 3 === 0) {
    const L = make(sd); play(L);
    const txt = L.log.flatMap(r => r.events.map(e => ({ y: r.year, t: e.t })));
    const m = txt.find(e => e.y >= 2020 && e.y <= 2029 && /と結婚した。/.test(e.t));
    if (!out.marry2020 && m) out.marry2020 = { seed: sd, by: L.by, t: m.y + ' ' + m.t.slice(0, 40) };
    const k = L.kake && L.kake.log && L.kake.log.find(b => /keiba|keirin|g1|kyotei|auto/.test(String(b.kind)));
    if (!out.kake && k) out.kake = { seed: sd, by: L.by, t: k.y + ' ' + k.kind + ' ' + k.stake + '→' + k.ret };
    const a = L.proSport ? { y: L.proSport.y, t: L.proSport.job || L.proSport.k } : null;
    if (!out.athlete && a) out.athlete = { seed: sd, by: L.by, t: a.y + ' ' + a.t.slice(0, 40) };
  }
}
fs.mkdirSync(path.join(ROOT, 'logs', 'ui19'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'logs', 'ui19', 'seeds.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
