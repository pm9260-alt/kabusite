// 1000分の1 第6版の選択と場面（data-src/s6/choices-*.json・lines-*.json）を確かめて、site/js/s6.js にまとめる。
// 使い方：node tools/build-s6.mjs [--only ファイル名]（--only のときは確かめるだけで書かない）
// 書き方は data-src/s6/README.md
import fs from 'fs'; import path from 'path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DIR = path.join(ROOT, 'data-src', 's6');
const ONLY = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
const BAN = /まず|見ます|効く|効いて|重い|重く|重さ|重か|読み|判定|一方で|結論から言うと|示唆|わけです|極めて|興味深い|齟齬|——|[()]/;
const PH = ['name', 'dad', 'mom', 'spouse', 'child', 'friend', 'place', 'sibOlder', 'sibYounger', 'en', 'enName', 'job', 'pet'];
const KAKAKU = ['kugyo', 'tenjo', 'zuryo', 'jige', 'sekke', 'seiga', 'daijin', 'urin', 'meika', 'hanke', 'jigekan', 'koshaku', 'koshaku2', 'hakushaku', 'shishaku', 'danshaku'];
const GRADE = ['ashigaru', 'kachi', 'hirazamurai', 'monogashira', 'karo', 'hatamoto', 'gokenin', 'shizoku_jo', 'shizoku_ka', 'hei', 'kashi', 'junshi', 'ikan', 'sakan', 'shokan', 'jsdf_shi', 'jsdf_so', 'jsdf_i', 'jsdf_sa', 'jsdf_sho'];
const WHEN = ['kind', 'ind', 'y', 'status', 'sex', 'unmarried', 'married', 'divorced', 'childless', 'hasChild', 'hasSib', 'parentOld', 'poor', 'rich', 'pref', 'kakaku', 'grade', 'jobIs', 'rank', 'mode', 'crime', 'debt', 'u', 'pet', 'petOld', 'noPet'];
const FX = ['sat', 'learn', 'tie', 'body'];
const errs = [], choices = [], lines = [], ids = new Set();
const SRC = {};
for (const f of fs.readdirSync(path.join(ROOT, 'data-src', 'paths')).filter(f => /^sources.*\.json$/.test(f))) Object.assign(SRC, JSON.parse(fs.readFileSync(path.join(ROOT, 'data-src', 'paths', f), 'utf8')));
const txt = (t, where) => {
  for (const s of [].concat(t)) {
    if (typeof s !== 'string' || !s) { errs.push(where + ' 文が空'); continue; }
    if (BAN.test(s)) errs.push(where + ' 禁止語 ' + s.match(BAN)[0] + '：' + s.slice(0, 20));
    for (const m of s.matchAll(/\{(\w+)\}/g)) if (!PH.includes(m[1])) errs.push(where + ' 差し込み ' + m[0]);
  }
};
const whenOk = (w, where) => {
  for (const k of Object.keys(w || {})) if (!WHEN.includes(k)) errs.push(where + ' when の鍵 ' + k);
  for (const k of (w || {}).kakaku || []) if (!KAKAKU.includes(k)) errs.push(where + ' kakaku ' + k);
  for (const k of (w || {}).grade || []) if (!GRADE.includes(k)) errs.push(where + ' grade ' + k);
};
for (const f of fs.readdirSync(DIR).filter(f => /^(choices|lines)-.*\.json$/.test(f) && (!ONLY || f === ONLY)).sort()) {
  let list;
  try { list = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')); } catch (e) { errs.push(f + ' JSON が壊れている ' + e.message); continue; }
  for (const o of list) {
    const where = f + ':' + o.id;
    if (!/^[a-z][a-z0-9_.]*$/.test(o.id || '') || ids.has(o.id)) errs.push(where + ' id');
    ids.add(o.id);
    if (!Array.isArray(o.y) || !Array.isArray(o.a) || o.y[0] > o.y[1] || o.a[0] > o.a[1]) errs.push(where + ' y/a');
    whenOk(o.when, where);
    for (const k of o.src || []) if (!SRC[k]) errs.push(where + ' 出典の鍵がない ' + k);
    if (f.startsWith('choices-')) {
      if (!['small', 'parent'].includes(o.kind)) errs.push(where + ' kind');
      const texts = [].concat(o.text);
      if (!texts.length) errs.push(where + ' text');
      txt(texts, where);
      if (!Array.isArray(o.options) || o.options.length < 2 || o.options.length > 3) errs.push(where + ' 答えの数');
      for (const p of o.options || []) {
        if (!p.k || !p.l || !p.after) errs.push(where + ' 答えの k/l/after');
        txt([p.l, p.after], where);
        if (p.after && !/。$/.test(p.after)) errs.push(where + ' after が「。」で終わらない');
        const v = FX.map(k => (p.fx || {})[k] || 0), up = v.some(x => x > 0) || (p.money && p.money.f > 0), dn = v.some(x => x < 0) || (p.money && p.money.f < 0);
        if (!up || !dn) errs.push(where + ' ' + p.k + ' 得るものと失うものの両方がない');
      }
      // 土地の種類（kind）と仕事の種類（ind）の条件を必ず付ける（v8直し2）。書いていないときは、文から決める：
      // 問いの文に村・畑・田の言葉があれば市街地（city）を除く。問いと答えに商いの言葉があれば商い（shop）の人だけ（仕事・位・格で絞った選択は除く）。それ以外はどの仕事でも（home）
      const w = o.when = Object.assign({}, o.when || {});
      const q = texts.join(''), ql = q + (o.options || []).map(p => p.l || '').join('');
      if (!Array.isArray(w.kind)) w.kind = /村|畑|田んぼ|田植|稲/.test(q) ? ['village', 'fish', 'town'] : ['village', 'fish', 'town', 'city'];
      if (!Array.isArray(w.ind)) w.ind = /仕入れ|客が|売り上げ|商い/.test(ql) && !w.jobIs && !w.grade && !w.kakaku && !w.mode ? ['shop'] : ['home'];
      choices.push(o);
    } else {
      if (!o.t) errs.push(where + ' t');
      txt([].concat(o.t), where);
      for (const s of [].concat(o.t)) if (!/。$/.test(s)) errs.push(where + ' 「。」で終わらない');
      lines.push(o);
    }
  }
}
if (errs.length) { console.error(errs.slice(0, 60).join('\n')); console.error('ほか ' + Math.max(0, errs.length - 60) + ' 件'); process.exit(1); }
if (ONLY) { console.log(ONLY, choices.length + lines.length, '件 よし'); process.exit(0); }
const out = '/* 1000分の1 第6版の選択と場面（data-src/s6 から tools/build-s6.mjs で作る。手で直さない） */\n' +
  '(function (root) {\n  \'use strict\';\n  var API = { choices: ' + JSON.stringify(choices) + ', lines: ' + JSON.stringify(lines) + ' };\n  if (typeof module !== \'undefined\' && module.exports) module.exports = API;\n  root.IchiokuS6 = API;\n})(typeof self !== \'undefined\' ? self : this);\n';
fs.writeFileSync(path.join(ROOT, 'site', 'js', 's6.js'), out);
console.log('s6.js 選択', choices.length, '場面', lines.length);
