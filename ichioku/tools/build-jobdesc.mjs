// 1000分の1 仕事の中身（spec 13）を site/js/jobdesc.js にまとめる
// 使い方：node tools/build-jobdesc.mjs
// 元：data-src/jobdesc.json（仕事ごとの6つの項目・出典・年）・data-src/jobdesc-top.json（上位300）・data-src/paths/sources-jobdesc.json（出典）
// 作るときに、上位300すべてに6つの項目と出典があるか・禁止語・丁寧体に直るか・年の範囲を確かめる
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const D = JSON.parse(fs.readFileSync(path.join(ROOT, 'data-src', 'jobdesc.json'), 'utf8'));
const TOP = JSON.parse(fs.readFileSync(path.join(ROOT, 'data-src', 'jobdesc-top.json'), 'utf8')).top.map(x => x[0]);
const SRCALL = {};
const SD = path.join(ROOT, 'data-src', 'paths');
for (const f of fs.readdirSync(SD).filter(f => /^sources.*\.json$/.test(f))) Object.assign(SRCALL, JSON.parse(fs.readFileSync(path.join(SD, f), 'utf8')));
const PO = require(path.join(ROOT, 'site', 'js', 'polite.js'));
const BAN = /まず|見ます|効く|効いて|効き|重い|重く|重さ|重か|重た|読み|判定|一方で|結論から言うと|示唆|わけです|極めて|興味深い|齟齬|——|[()A-Za-z]/;
const KEYS = ['day', 'tools', 'trade', 'season', 'pay', 'risk'];
const errs = [], used = {};
for (const [n, v] of Object.entries(D)) {
  if (v.same) { if (!D[v.same] || D[v.same].same) errs.push(n + ' same の先がない'); continue; }
  for (const e of [].concat(v)) {
    for (const k of KEYS) {
      const t = e[k];
      if (!t || !/。$/.test(t)) { errs.push(n + ' ' + k + ' がない'); continue; }
      if (BAN.test(t)) errs.push(n + ' ' + k + ' 禁止語 ' + t);
      for (const s of PO.polite(t).split(/(?<=。)/)) if (s.trim() && !/(ました|でした|ません|ます|です)。$|）。$/.test(s)) errs.push(n + ' ' + k + ' 丁寧体にならない ' + s);
    }
    if (!(e.src || []).length) errs.push(n + ' 出典がない');
    for (const s of e.src || []) { if (!SRCALL[s]) errs.push(n + ' 出典の鍵がない ' + s); used[s] = 1; }
    if (!Array.isArray(e.y) || e.y.length !== 2 || !(e.y[0] <= e.y[1])) errs.push(n + ' 年の範囲');
  }
}
const SRC = {};
for (const s of Object.keys(used).sort()) SRC[s] = SRCALL[s].name;
let js = fs.readFileSync(path.join(ROOT, 'tools', 'jobdesc-template.js'), 'utf8')
  .replace('/*DATA*/{}', () => JSON.stringify(D))
  .replace('/*SRC*/{}', () => JSON.stringify(SRC))
  .replace('/*TOP*/[]', () => JSON.stringify(TOP));
const OUT = path.join(ROOT, 'site', 'js', 'jobdesc.js');
fs.writeFileSync(OUT, js);
const JD = require(OUT);
for (const n of TOP) if (!JD.get(n, null)) errs.push('上位300の「' + n + '」がない');
if (errs.length) { console.error(errs.slice(0, 40).join('\n')); console.error('直すところ ' + errs.length + '件'); process.exit(1); }
console.log('仕事の中身 ' + Object.keys(D).length + '件（上位300すべてあり）・出典 ' + Object.keys(SRC).length + '件 → site/js/jobdesc.js');
