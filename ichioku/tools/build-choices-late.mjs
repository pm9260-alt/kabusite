// 40代からの小さな選択（data-src/choices-late.json。作る人の指示 2026-10-20）を site/js/choices.js の印のあいだに書き込む。
// 使い方：node tools/build-choices-late.mjs（何度動かしても同じ結果）
import fs from 'fs'; import path from 'path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const f = path.join(ROOT, 'site', 'js', 'choices.js');
const list = JSON.parse(fs.readFileSync(path.join(ROOT, 'data-src', 'choices-late.json'), 'utf8'));
const block = '  // BEGIN LATE（40代からの小さな選択。data-src/choices-late.json から tools/build-choices-late.mjs で書き込む。手で直さない）\n' +
  '  var LATE = ' + JSON.stringify(list) + ';\n' +
  '  LATE.forEach(function (o) { c(o.id, o.kind, o.y, o.a, w(o.when), o.text, o.options.map(function (p) { return [p.k, p.l, p.fx, p.after]; })); });\n' +
  '  // END LATE\n';
let s = fs.readFileSync(f, 'utf8');
if (/\/\/ BEGIN LATE[\s\S]*?\/\/ END LATE\n/.test(s)) s = s.replace(/  \/\/ BEGIN LATE[\s\S]*?\/\/ END LATE\n/, () => block);
else { const a = '  // 選んだあとの1文（v11の直し 9）'; if (!s.includes(a)) throw new Error('印がない'); s = s.replace(a, () => block + a); }
fs.writeFileSync(f, s);
console.log('choices.js に40代からの選択', list.length);
