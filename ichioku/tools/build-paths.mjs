// 1000分の1 人生の筋（data-src/paths/*.json）を site/js/paths.js にまとめる。
// 使い方：node tools/build-paths.mjs
// 筋の書き方は data-src/paths/README.md。作るときに、場面のつながり・禁止語・差し込み・答えの数を確かめる
import fs from 'fs'; import path from 'path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DIR = path.join(ROOT, 'data-src', 'paths');
const BAN = /まず|見ます|効く|効いて|重い|重く|重さ|読み|判定|一方で|結論から言うと|示唆|わけです|極めて|興味深い|齟齬|——|[()]/;
const all = [], errs = [], ids = new Set();
for (const f of fs.readdirSync(DIR).filter(f => f.endsWith('.json')).sort()) {
  const list = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
  for (const p of list) {
    const where = f + ':' + p.id;
    if (!/^[a-z][a-z0-9_]*$/.test(p.id || '') || ids.has(p.id)) errs.push(where + ' id');
    ids.add(p.id);
    if (!Array.isArray(p.y) || !Array.isArray(p.a) || !p.text || !Array.isArray(p.opts) || p.opts.length < 2) errs.push(where + ' 項目が足りない');
    const texts = [p.title, p.text];
    const chk = (o, at) => {
      if (!o.k || !o.l || !o.say) errs.push(where + ' ' + at + ' k/l/say');
      if (o.say && !/。$/.test(o.say)) errs.push(where + ' ' + at + ' 「。」で終わらない');
      if (o.next && !(p.nodes || {})[o.next.node]) errs.push(where + ' ' + at + ' つながらない ' + o.next.node);
      texts.push(o.l, o.say);
    };
    p.opts.forEach((o, i) => chk(o, 'opts' + i));
    for (const [nk, nd] of Object.entries(p.nodes || {})) {
      if (nd.say && !/。$/.test(nd.say)) errs.push(where + ' ' + nk + ' 「。」で終わらない');
      if (nd.next && !p.nodes[nd.next.node]) errs.push(where + ' ' + nk + ' つながらない');
      texts.push(nd.say);
      if (nd.ask) { texts.push(nd.ask.title, nd.ask.text); nd.ask.opts.forEach((o, i) => chk(o, nk + '.ask' + i)); }
    }
    for (const t of texts) if (t && BAN.test(t)) errs.push(where + ' 禁止語 ' + t.match(BAN)[0] + '：' + t.slice(0, 20));
    for (const t of texts) if (t) for (const m of t.matchAll(/\{(\w+)\}/g)) if (!['name', 'dad', 'mom', 'place'].includes(m[1])) errs.push(where + ' 差し込み ' + m[0]);
    all.push(p);
  }
}
if (errs.length) { console.error(errs.slice(0, 30).join('\n')); process.exit(1); }
const out = '/* 1000分の1 人生の筋（作る人の指示 2026-10-19）。data-src/paths/*.json から tools/build-paths.mjs で作る。手で直さない */\n' +
  '(function (root) {\n  \'use strict\';\n  var API = { list: ' + JSON.stringify(all) + ' };\n  if (typeof module !== \'undefined\' && module.exports) module.exports = API;\n  root.IchiokuPaths = API;\n})(typeof self !== \'undefined\' ? self : this);\n';
fs.writeFileSync(path.join(ROOT, 'site', 'js', 'paths.js'), out);
console.log('paths.js', all.length, '筋');
