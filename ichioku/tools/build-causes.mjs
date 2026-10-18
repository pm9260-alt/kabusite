// data-src/causes.json から site/js/causes.js を作る（node tools/build-causes.mjs）
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const R = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const d = JSON.parse(fs.readFileSync(path.join(R, 'data-src', 'causes.json'), 'utf8'));
// まれな死因（毒キノコ・クラゲ・雷など。data-src/causes-rare.json）を、その年代の表に足す（作る人の指示 2026-10-19）。
// w は人口10万あたりの目安。遊ぶ人が出会えるよう20倍にする（それでも死因全体の数%）（RARE_X）。1899年までの表は割合の目盛りなので、表の合計に合わせて直す
const RARE_X = 20;
const rare = JSON.parse(fs.readFileSync(path.join(R, 'data-src', 'causes-rare.json'), 'utf8'));
for (const e of d.eras) {
  const tot = e.causes.reduce((s, c) => s + c.w, 0), scale = e.from < 1900 ? tot / 1500 : 1;
  for (const r of rare) {
    const y0 = Math.max(r.y[0], e.from), y1 = Math.min(r.y[1], e.to);
    if (y0 > y1) continue;
    const c = { n: r.n, w: +(r.w * RARE_X * scale).toFixed(4), age: r.age, kind: r.kind || 'acc', rare: true };
    if (y0 > e.from || y1 < e.to) c.years = y1 - y0 > 1 ? [y0, y1] : Array.from({ length: y1 - y0 + 1 }, (_, i) => y0 + i);
    if (r.sex) c.sex = r.sex; if (r.place) c.place = r.place; if (r.pref) c.pref = r.pref;
    e.causes = e.causes.filter(x => x.n !== r.n).concat([c]);
  }
}
const slim = { eras: d.eras.map(e => ({ from: e.from, to: e.to, est: !!e.est, causes: e.causes.map(c => { const o = { n: c.n, w: c.w }; for (const k of ['age', 'sex', 'kind', 'years', 'peak', 'famine', 'place', 'pref', 'rare']) if (c[k] != null) o[k] = c[k]; return o; }) })), ageMult: d.ageMult,
  rareLines: Object.fromEntries(rare.map(r => [r.n, r.line])),
  rare: rare.filter(r => r.y[1] >= 1975).map(r => ({ n: r.n, w: r.w * RARE_X, y: r.y, age: r.age, sex: r.sex || null, place: r.place || null, pref: r.pref || null })) };
const t = fs.readFileSync(path.join(R, 'tools', 'causes-template.js'), 'utf8');
fs.writeFileSync(path.join(R, 'site', 'js', 'causes.js'), t.replace('__DATA__', JSON.stringify(slim)));
console.log('causes.js', slim.eras.length, 'eras');
