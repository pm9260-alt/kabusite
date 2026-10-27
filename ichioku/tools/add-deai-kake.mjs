// data-src/sources-deai-kake.json（2020年代の出会い・昭和以降の賭けごとの出典）を site/data/common.json と history.json の sources に足す（何度動かしても同じ結果）
// build.mjs・build-history.mjs で作り直したあとは、add-pop.mjs などと同じく、これも動かし直す
import fs from 'fs'; import path from 'path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const S = JSON.parse(fs.readFileSync(path.join(ROOT, 'data-src', 'sources-deai-kake.json'), 'utf8')).sources;
for (const f of ['common.json', 'history.json']) {
  const p = path.join(ROOT, 'site', 'data', f), D = JSON.parse(fs.readFileSync(p, 'utf8'));
  D.sources = D.sources || {};
  let n = 0;
  for (const [k, v] of Object.entries(S)) { if (JSON.stringify(D.sources[k]) !== JSON.stringify(v)) { D.sources[k] = v; n++; } }
  fs.writeFileSync(p, JSON.stringify(D));
  console.log(f + ' に出典', n, '件');
}
