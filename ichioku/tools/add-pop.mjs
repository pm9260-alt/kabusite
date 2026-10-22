// data-src/population.json（日本の人口の目安）を site/data/history.json の nat.popNat に書き込み、出典を足す（何度動かしても同じ結果）
import fs from 'fs'; import path from 'path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const f = path.join(ROOT, 'site', 'data', 'history.json');
const H = JSON.parse(fs.readFileSync(f, 'utf8')), P = JSON.parse(fs.readFileSync(path.join(ROOT, 'data-src', 'population.json'), 'utf8'));
H.nat.popNat = { pop: P.pop, src: P.src, note: P.note };
for (const [k, v] of Object.entries(P.sources)) if (!H.sources[k]) H.sources[k] = v;
fs.writeFileSync(f, JSON.stringify(H));
console.log('history.json に人口の目安', Object.keys(P.pop).length, '年');
