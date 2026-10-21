// 1000分の1 人生の筋（data-src/paths/*.json）を site/js/paths.js にまとめる。
// 使い方：node tools/build-paths.mjs
// 筋の書き方は data-src/paths/README.md。作るときに、場面のつながり・禁止語・差し込み・答えの数を確かめる
import fs from 'fs'; import path from 'path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DIR = path.join(ROOT, 'data-src', 'paths');
const BAN = /まず|見ます|効く|効いて|重い|重く|重さ|読み|判定|一方で|結論から言うと|示唆|わけです|極めて|興味深い|齟齬|——|[()]/;
const all = [], errs = [], ids = new Set();
// 出典の一覧（sources.json と sources-*.json をまとめる）
const SRC = {};
for (const f of fs.readdirSync(DIR).filter(f => /^sources.*\.json$/.test(f)).sort()) Object.assign(SRC, JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')));
const GROUPS = ['kaigai', 'shusse', 'botsuraku', 'gun', 'kurai', 'jiken', 'shoku', 'ijou', 'gaiseki', 'tsumi', 'kakaku', 'senkyo'];
const KAKAKU = ['kugyo', 'tenjo', 'zuryo', 'jige', 'sekke', 'seiga', 'daijin', 'urin', 'meika', 'hanke', 'jigekan', 'koshaku', 'koshaku2', 'hakushaku', 'shishaku', 'danshaku'];
const GRADE = ['ashigaru', 'kachi', 'hirazamurai', 'monogashira', 'karo', 'hatamoto', 'gokenin', 'shizoku_jo', 'shizoku_ka', 'hei', 'kashi', 'junshi', 'ikan', 'sakan', 'shokan', 'jsdf_shi', 'jsdf_so', 'jsdf_i', 'jsdf_sa', 'jsdf_sho'];
const STATUS = ['kuge', 'bushi', 'priest', 'chonin', 'hyakusho', 'heimin', 'shizoku', 'genin', 'outcast', 'modern', 'satsumon', 'ainu', 'gusuku', 'ryukyuShi', 'ryukyuHyakusho'];
const FX = ['sat', 'learn', 'tie', 'body'];
// --only ファイル名：そのファイルだけを確かめて、paths.js は書かない（何人かで別々のファイルを書くとき）
const ONLY = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
for (const f of fs.readdirSync(DIR).filter(f => f.endsWith('.json') && !/^sources/.test(f) && (!ONLY || f === ONLY)).sort()) {
  const list = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
  for (const p of list) {
    const where = f + ':' + p.id;
    if (!/^[a-z][a-z0-9_]*$/.test(p.id || '') || ids.has(p.id)) errs.push(where + ' id');
    ids.add(p.id);
    if (!Array.isArray(p.y) || !Array.isArray(p.a) || !p.text || !Array.isArray(p.opts) || p.opts.length < 2) errs.push(where + ' 項目が足りない');
    const texts = [p.title, p.text];
    const strict = !!p.group; // 第6版の筋は、決まりを細かく確かめる
    if (p.group && !GROUPS.includes(p.group)) errs.push(where + ' group ' + p.group);
    if (strict && !(p.src || []).length) errs.push(where + ' 出典がない');
    for (const k of p.src || []) if (!SRC[k]) errs.push(where + ' 出典の鍵がない ' + k);
    for (const k of p.kakaku || []) if (!KAKAKU.includes(k)) errs.push(where + ' kakaku ' + k);
    for (const k of p.grade || []) if (!GRADE.includes(k)) errs.push(where + ' grade ' + k);
    for (const k of p.st || []) if (!STATUS.includes(k)) errs.push(where + ' st ' + k);
    for (const k of p.pref || []) if (!/^(0[1-9]|[1-3][0-9]|4[0-7])$/.test(k)) errs.push(where + ' pref ' + k);
    if (p.y && p.y[0] > p.y[1] || p.a && p.a[0] > p.a[1]) errs.push(where + ' 年か年齢の範囲が逆');
    const side = o => { const fx = o.fx || {}; const v = FX.map(k => fx[k] || 0); const up = v.some(x => x > 0) || (o.money && o.money.f > 0) || (o.debt < 0); const dn = v.some(x => x < 0) || (o.money && o.money.f < 0) || o.debt > 0 || !!o.die; return [up, dn]; };
    const chkNode = (o, at) => {
      if (o.die && (!o.die.n || !/。$/.test(o.die.t || ''))) errs.push(where + ' ' + at + ' die の n/t');
      if (o.kakakuSet && !KAKAKU.includes(o.kakakuSet)) errs.push(where + ' ' + at + ' kakakuSet');
      if (o.gradeSet && !GRADE.includes(o.gradeSet)) errs.push(where + ' ' + at + ' gradeSet');
      if (o.status && !STATUS.includes(o.status)) errs.push(where + ' ' + at + ' status ' + o.status);
      if (o.honor && (!o.honor.t || !['ikai', 'kunsho', 'hosho', 'hobi', 'zoui'].includes(o.honor.k))) errs.push(where + ' ' + at + ' honor');
      if (o.crime && (!o.crime.t || !o.crime.pun)) errs.push(where + ' ' + at + ' crime');
      if (o.die) texts.push(o.die.t);
    };
    const chk = (o, at) => {
      chkNode(o, at);
      if (strict) { const [up, dn] = side(o); if (!up || !dn) errs.push(where + ' ' + at + ' 得るものと失うものの両方がない'); }
      if (!o.k || !o.l || !o.say) errs.push(where + ' ' + at + ' k/l/say');
      if (o.say && !/。$/.test(o.say)) errs.push(where + ' ' + at + ' 「。」で終わらない');
      if (o.next && !(p.nodes || {})[o.next.node]) errs.push(where + ' ' + at + ' つながらない ' + o.next.node);
      texts.push(o.l, o.say);
    };
    p.opts.forEach((o, i) => chk(o, 'opts' + i));
    for (const [nk, nd] of Object.entries(p.nodes || {})) {
      if (nd.say && !/。$/.test(nd.say)) errs.push(where + ' ' + nk + ' 「。」で終わらない');
      if (nd.next && !p.nodes[nd.next.node]) errs.push(where + ' ' + nk + ' つながらない');
      chkNode(nd, nk);
      texts.push(nd.say);
      if (nd.ask) { texts.push(nd.ask.title, nd.ask.text); nd.ask.opts.forEach((o, i) => chk(o, nk + '.ask' + i)); }
    }
    for (const t of texts) if (t && BAN.test(t)) errs.push(where + ' 禁止語 ' + t.match(BAN)[0] + '：' + t.slice(0, 20));
    for (const t of texts) if (t) for (const m of t.matchAll(/\{(\w+)\}/g)) if (!['name', 'dad', 'mom', 'place', 'en', 'enName'].includes(m[1])) errs.push(where + ' 差し込み ' + m[0]);
    all.push(p);
  }
}
if (errs.length) { console.error(errs.slice(0, 60).join('\n')); process.exit(1); }
if (ONLY) { console.log(ONLY, all.length, '筋 よし'); process.exit(0); }
const out = '/* 1000分の1 人生の筋（作る人の指示 2026-10-19）。data-src/paths/*.json から tools/build-paths.mjs で作る。手で直さない */\n' +
  '(function (root) {\n  \'use strict\';\n  var API = { list: ' + JSON.stringify(all) + ' };\n  if (typeof module !== \'undefined\' && module.exports) module.exports = API;\n  root.IchiokuPaths = API;\n})(typeof self !== \'undefined\' ? self : this);\n';
fs.writeFileSync(path.join(ROOT, 'site', 'js', 'paths.js'), out);
const byG = {}; all.forEach(p => { byG[p.group || '-'] = (byG[p.group || '-'] || 0) + 1; });
console.log('paths.js', all.length, '筋', JSON.stringify(byG));
