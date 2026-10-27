// data-src/multiples.json（多胎＝双子・三つ子などの統計。tools/fetch-multiples.mjs で取り込む）から、
// 年ごとの多胎の割合と、多胎の子が1歳までに亡くなりやすい度合いを作り、site/data/history.json と site/data/common.json の nat.multiples に書き、出典を足す（何度動かしても同じ結果）
// build.mjs・build-history.mjs で作り直したあとは、add-pop.mjs・add-imani.mjs と同じく、これも動かし直す
//
// 割合（1回のお産＝分娩1件あたり）
//   1995年から：人口動態統計の分娩件数（双子・三つ児・四つ児・五つ児以上）をそのまま割る（統計）
//   1980〜1994年：分娩の種類別の表がないため、周産期死亡の表の「複産の出生数」（死亡数÷率）から推計する。
//     複産の分娩件数＝複産の出生数÷（2015〜2024年の、複産の分娩1件あたりの出生数）。三つ子より上はヘリンの法則（三つ子＝双子²…）で分ける（推計）
//   1979年以前：統計がないため、1980〜1984年の平均を土台にした推計（ヘリンの法則で分ける）。Wikipedia「双生児」の「かつては1/150〜1/160」と同じ水準
// 1歳までに亡くなりやすい度合い（多胎の子の、単産の子に対する比）
//   1980年から：周産期死亡率の複産÷単産（1994年までは妊娠満28週・出生千対、1995年からは満22週・出産千対）。2015〜2024年の病死による乳児死亡率の比も参考に残す
//   1979年以前：1980〜1984年の平均（推計）
import fs from 'fs'; import path from 'path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const M = JSON.parse(fs.readFileSync(path.join(ROOT, 'data-src', 'multiples.json'), 'utf8'));
const r6 = x => Number(x.toPrecision(4)), r3 = x => Math.round(x * 1000) / 1000;

// 複産の分娩1件あたりの出生数（2015〜2024年）
const inf = M.infant, ky = Object.keys(inf).filter(y => M.deliveries[y] && inf[y].birthsMulti);
const kPer = ky.reduce((s, y) => s + inf[y].birthsMulti / M.deliveries[y].multi, 0) / ky.length;
// ヘリンの法則：t + t² + t³ + t⁴ = 多胎の割合 m になる t（双子の割合）
function hellin(m) { let t = m; for (let i = 0; i < 50; i++) t = m / (1 + t + t * t + t * t * t); return [t, t * t, t * t * t, t * t * t * t]; }

const rate = {}, mort = {};
for (const [y, d] of Object.entries(M.deliveries)) rate[y] = [r6(d.twin / d.total), r6(d.triplet / d.total), r6(d.quad / d.total), r6(((d.quint || 0) + (d.sext || 0) + (d.sept || 0)) / d.total), 0];
for (const [y, p] of Object.entries(M.perinatal)) {
  mort[y] = [r3(p.rate.multi / p.rate.single), 0];
  if (rate[y]) continue;
  const bm = p.deaths.multi / p.rate.multi * 1000, bt = p.deaths.total / p.rate.total * 1000, dm = bm / kPer;
  rate[y] = hellin(dm / (bt - bm + dm)).map(r6).concat([1]);
}
const first = Math.min(...Object.keys(rate).map(Number));
const avg = (tab, i) => { let s = 0, n = 0; for (let y = first; y < first + 5; y++) if (tab[y]) { s += tab[y][i]; n++; } return s / n; };
const baseM = [0, 1, 2, 3].reduce((s, i) => s + avg(rate, i), 0);
const base = { rate: hellin(baseM).map(r6), mort: r3(avg(mort, 0)), from: first, years: first + '〜' + (first + 4) };
const infRatio = {};
for (const y of ky) infRatio[y] = r3((inf[y].deathsMulti / inf[y].birthsMulti) / (inf[y].deathsSingle / inf[y].birthsSingle));

const out = { rate, mort, base, infRatio, kPer: r3(kPer), src: { rate: 'vitalMulti', est: 'vitalPeri', mort: 'vitalPeri', base: 'wpTwins', hellin: 'hellin', inf: 'vitalInfMulti', quint: 'wpQuint', chikusho: 'wpChikusho' } };
for (const f of ['history.json', 'common.json']) {
  const p = path.join(ROOT, 'site', 'data', f), J = JSON.parse(fs.readFileSync(p, 'utf8'));
  J.nat.multiples = out;
  for (const [k, v] of Object.entries(M.sources)) J.sources[k] = { name: v.name, org: v.org || '' };
  fs.writeFileSync(p, JSON.stringify(J));
}
console.log('多胎の割合', Object.keys(rate).length, '年（' + first + '年から）・1980〜1984年の平均を土台に：双子', (base.rate[0] * 1000).toFixed(2) + '‰・死亡の比', base.mort, '・複産1件の出生数', r3(kPer));
