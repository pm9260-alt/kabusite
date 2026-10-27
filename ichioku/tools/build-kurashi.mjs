// v18 指示書 11-1・11-4：data-src の表を、site/js の小さな部品に書き込む（BEGIN DATA〜END DATA の間だけを書きかえる）
//   data-src/hobbies.json・goods.json・pets.json → site/js/kurashi.js
//   data-src/shiryo.json → site/js/shiryo.js
// 使い方：node tools/build-kurashi.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rd = f => JSON.parse(fs.readFileSync(path.join(ROOT, 'data-src', f), 'utf8'));
const BAN = /まず|見ます|効く|効いて|重い|重く|重さ|重か|読み|判定|一方で|結論から言うと|示唆|わけです|極めて|興味深い|齟齬|——/;
function put(file, body) {
  const p = path.join(ROOT, 'site', 'js', file), s = fs.readFileSync(p, 'utf8');
  const a = s.indexOf('// BEGIN DATA'), b = s.indexOf('// END DATA');
  if (a < 0 || b < 0) throw new Error(file + ' に BEGIN DATA／END DATA がない');
  const head = s.slice(0, s.indexOf('\n', a) + 1);
  fs.writeFileSync(p, head + body + '\n  ' + s.slice(b));
}
const errs = [];
const hob = rd('hobbies.json').list, goods = rd('goods.json').list, pets = rd('pets.json').animals;
for (const r of hob.concat(goods)) {
  if (!r.id || !r.name || !Array.isArray(r.y) || r.y[0] > r.y[1]) errs.push('行が足りない ' + JSON.stringify(r));
  if (BAN.test(r.name)) errs.push('禁止語 ' + r.name);
}
// 出せる年の表（data-src/s6/README.md・engine.js の GOODS_FROM）より前に出す品物がないか
const FROM = { 'スマートフォン': 2008, '携帯電話': 1995, 'パソコン': 1980, 'テレビ': 1953, '電子レンジ': 1965, 'ラジオ': 1925, '自転車': 1890, '電話': 1890, '懐中時計': 1872, '腕時計': 1872, '算盤': 1570, '煙管': 1590 };
for (const r of goods) if (FROM[r.name] && r.y[0] < FROM[r.name]) errs.push(r.name + ' が ' + FROM[r.name] + '年より前から');
if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
put('kurashi.js', '  var HOB = ' + JSON.stringify(hob) + ';\n  var GOODS = ' + JSON.stringify(goods) + ';\n  var PETS = ' + JSON.stringify(pets) + ';');
console.log('kurashi.js 趣味', hob.length, '持ち物', goods.length, '動物', Object.keys(pets).length);
if (fs.existsSync(path.join(ROOT, 'data-src', 'shiryo.json')) && fs.existsSync(path.join(ROOT, 'site', 'js', 'shiryo.js'))) {
  const sh = rd('shiryo.json');
  for (const r of sh.list) { if (BAN.test(r.text)) errs.push('禁止語 ' + r.text); if (!/\d|\{(v|m|f)\}/.test(r.text)) errs.push('数字がない ' + r.text); if (!r.src) errs.push('出典がない ' + r.text); }
  if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
  put('shiryo.js', '  var LIST = ' + JSON.stringify(sh.list) + ';\n  var SOURCES = ' + JSON.stringify(sh.sources || {}) + ';');
  console.log('shiryo.js 資料', sh.list.length);
}
