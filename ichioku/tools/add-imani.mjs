// data-src/imani.json（旧国ごとの一宮・国分寺の跡・街道・祭り。出典つき）を site/data/history.json の imani に書き込み、出典を足す（何度動かしても同じ結果）
// build-history.mjs で history.json を作り直したあとは、add-pop.mjs とこれを動かし直す
import fs from 'fs'; import path from 'path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const f = path.join(ROOT, 'site', 'data', 'history.json');
const H = JSON.parse(fs.readFileSync(f, 'utf8')), J = JSON.parse(fs.readFileSync(path.join(ROOT, 'data-src', 'imani.json'), 'utf8'));
// 画面に出すのは、その時代からある一宮だけ（全国一の宮会に加わっただけの社や、近ごろ定めた新一の宮は出さない）
const prov = {};
let n = 0;
for (const [k, v] of Object.entries(J.prov)) {
  if (!H.prov[k]) throw new Error('history.json にない旧国 ' + k);
  const ic = (v.ichinomiya || []).filter(x => !/加盟|新一の宮/.test(x.note || ''));
  prov[k] = { ichinomiya: ic.map(x => ({ name: x.name, place: x.place, src: x.src })), kokubunji: v.kokubunji || null, kaido: v.kaido || [], matsuri: v.matsuri || [] };
  for (const x of [...ic, ...(v.kaido || []), ...(v.matsuri || []), ...(v.kokubunji ? [v.kokubunji] : [])]) for (const s of x.src || []) { if (!J.sources[s]) throw new Error('出典がない ' + s); n++; }
}
H.imani = { prov, surname: J.surname || {} };
for (const [k, v] of Object.entries(J.sources)) H.sources[k] = { name: v.name, org: v.org };
fs.writeFileSync(f, JSON.stringify(H));
console.log('history.json に今に残るもの', Object.keys(prov).length, '国・出典の付いた項目', n);
