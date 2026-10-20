// 40代からの場面（作る人の指示 2026-10-20「40代以降が単調」）を、作り直さずにデータの束へ足す。
// data-src/scenes-late.json → site/data/common.json の scenes、data-src/history-scenes-late.json → site/data/history.json の scenes。
// 何度動かしても同じ結果になる（前に足した分を外してから足す）。build.mjs・build-history.mjs も同じファイルを読む
import fs from 'fs'; import path from 'path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const rd = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const wr = (f, o) => fs.writeFileSync(path.join(ROOT, f), JSON.stringify(o));
const C = rd('site/data/common.json');
if (fs.existsSync(path.join(ROOT, 'data-src/scenes-late.json'))) {
  const late = rd('data-src/scenes-late.json'), whatOf = {};
  C.scenes.forEach(s => { if (!whatOf[s.src] && s.what) whatOf[s.src] = s.what; });
  C.scenes = C.scenes.filter(s => !s.late).concat(late.map(s => ({ ...s, what: s.what || whatOf[s.src] || '', late: true })));
  wr('site/data/common.json', C);
  console.log('common.json の場面', C.scenes.length);
}
const H = rd('site/data/history.json');
if (fs.existsSync(path.join(ROOT, 'data-src/history-scenes-late.json'))) {
  const late = rd('data-src/history-scenes-late.json');
  H.scenes = H.scenes.filter(s => !s.late).concat(late.map(s => ({ ...s, late: true })));
  wr('site/data/history.json', H);
  console.log('history.json の場面', H.scenes.length);
}
