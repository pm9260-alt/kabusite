// data-src/hisabetsu.json（被差別身分とされた家に生まれた人の場面と選択。spec v19 4）を確かめて site/js/hisabetsu.js に書き込み、
// 出典を site/data/history.json の sources に足す。あわせて history.json に残っていた差別のための呼び名を、今の言い方に直す（何度動かしても同じ結果）
// 使い方：node tools/add-hisabetsu.mjs（tools/build-history.mjs のあとに動かす）
import fs from 'fs'; import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const D = JSON.parse(fs.readFileSync(path.join(ROOT, 'data-src', 'hisabetsu.json'), 'utf8'));
const PO = require(path.join(ROOT, 'site', 'js', 'polite.js'));
const BAN = /まず|見ます|効く|効いて|重い|重く|重さ|重か|読み|判定|一方で|結論から言うと|示唆|わけです|極めて|興味深い|齟齬|——|[()]/;
// 差別のための呼び名（せりふの中でも書かない）。tools/check6.mjs の 10-4 と同じ
export const SLUR = /穢多|えた・ひにん|えた身分|ひにん|非人|エタ|ヒニン|新平民|特殊部落|部落民/;
const CATS = ['家庭', '地域', '時代', '健康', '人間関係', '学歴と仕事'];
const FX = ['sat', 'learn', 'tie', 'body'];
const errs = [], ids = new Set();
const sentences = t => String(t).split(/(?<=。)/).filter(Boolean);
const checkText = (t, where) => {
  if (!t || !/。$/.test(t)) errs.push(where + ' 「。」で終わらない');
  if (BAN.test(t)) errs.push(where + ' 禁止語 ' + t.match(BAN)[0]);
  if (SLUR.test(t)) errs.push(where + ' 差別のための呼び名 ' + t.match(SLUR)[0]);
  for (const s of sentences(t)) if (PO.polite(s) === s) errs.push(where + ' 丁寧体にならない：' + s);
};
for (const o of D.items) {
  const w = o.id;
  if (!/^[a-z][a-z0-9_.]*$/.test(o.id) || ids.has(o.id)) errs.push(w + ' id'); ids.add(o.id);
  if (!Array.isArray(o.y) || !Array.isArray(o.a) || o.y[0] > o.y[1] || o.a[0] > o.a[1]) errs.push(w + ' y/a');
  if (!CATS.includes(o.cat)) errs.push(w + ' cat');
  if (!(o.src || []).length) errs.push(w + ' 出典がない');
  for (const k of o.src || []) if (!D.sources[k]) errs.push(w + ' 出典の鍵 ' + k);
  if (o.table && !(o.prov || o.pref)) errs.push(w + ' 表の場面に国がない');
  if (o.q) {
    if (BAN.test(o.q) || SLUR.test(o.q)) errs.push(w + ' 問いの文');
    if (!Array.isArray(o.opts) || o.opts.length < 2 || o.opts.length > 3) errs.push(w + ' 答えの数');
    for (const p of o.opts || []) {
      if (!p.k || !p.l || !p.after) errs.push(w + ' 答えの k/l/after');
      if (BAN.test(p.l) || SLUR.test(p.l)) errs.push(w + ' 答えの文');
      checkText(p.after, w + ':' + p.k);
      const v = FX.map(k => (p.fx || {})[k] || 0), up = v.some(x => x > 0) || (p.money && p.money.f > 0), dn = v.some(x => x < 0) || (p.money && p.money.f < 0);
      if (!up || !dn) errs.push(w + ':' + p.k + ' 得るものと失うものの両方がない');
    }
    // どの答えも、ほかの答えより、どの数でも同じか上にならない（spec6 2-15）
    const vec = p => FX.map(k => (p.fx || {})[k] || 0).concat([(p.money && p.money.f) || 0]);
    for (const a of o.opts) for (const b of o.opts) if (a !== b && vec(a).every((x, i) => x >= vec(b)[i])) errs.push(w + ' ' + a.k + ' が ' + b.k + ' より、どの数でも同じか上');
  } else checkText(o.t, w);
}
for (const [k, s] of Object.entries(D.sources)) if (SLUR.test(s.name + s.org)) errs.push('出典 ' + k + ' に差別のための呼び名');
if (errs.length) { console.error(errs.join('\n')); process.exit(1); }

// site/js/hisabetsu.js の BEGIN〜END
const js = path.join(ROOT, 'site', 'js', 'hisabetsu.js');
let src = fs.readFileSync(js, 'utf8');
const items = D.items.map(o => { const x = Object.assign({}, o); return x; });
src = src.replace(/\/\/ BEGIN DATA[\s\S]*?\/\/ END DATA/, '// BEGIN DATA\n  var SOURCES = ' + JSON.stringify(D.sources) + ', ITEMS = ' + JSON.stringify(items) + ';\n  // END DATA');
fs.writeFileSync(js, src);

// history.json：出典を足し、残っていた呼び名を直す（data-src の history.mjs・history-timeline.mjs・history-scenes.mjs も同じ文に直してある）
const hf = path.join(ROOT, 'site', 'data', 'history.json');
const H = JSON.parse(fs.readFileSync(hf, 'utf8'));
for (const [k, v] of Object.entries(D.sources)) H.sources[k] = v;
H.sources.outcast = { name: '解放令（1871年）の時点で、差別されていた身分とされた人の数', org: 'Wikipedia日本語版の被差別身分の項目（解放令の節）より' };
if (H.status && H.status.outcast) H.status.outcast.note = '差別されていた身分とされ、住む場所や仕事、つき合いを厳しく制限された人々の家';
const FIX = [
  [/えた・ひにんの呼び名と身分をなくす布告/g, '差別されていた身分の呼び名と身分をなくす布告'],
  [/戸籍に「新平民」と書かれたり/g, '戸籍にひどい呼び名を書かれたり']
];
let txt = JSON.stringify(H);
for (const [re, to] of FIX) txt = txt.replace(re, to);
const left = (txt.match(new RegExp(SLUR.source, 'g')) || []);
fs.writeFileSync(hf, txt);
console.log('hisabetsu.js 場面', D.items.filter(o => !o.q).length, '選択', D.items.filter(o => o.q).length, '・出典', Object.keys(D.sources).length, '・history.json に残る呼び名', left.length);
