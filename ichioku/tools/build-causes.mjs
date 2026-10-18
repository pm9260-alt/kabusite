// data-src/causes.json から site/js/causes.js を作る（node tools/build-causes.mjs）
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const R = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const d = JSON.parse(fs.readFileSync(path.join(R, 'data-src', 'causes.json'), 'utf8'));
const slim = { eras: d.eras.map(e => ({ from: e.from, to: e.to, est: !!e.est, causes: e.causes.map(c => { const o = { n: c.n, w: c.w }; for (const k of ['age', 'sex', 'kind', 'years', 'peak', 'famine']) if (c[k] != null) o[k] = c[k]; return o; }) })), ageMult: d.ageMult };
const t = fs.readFileSync(path.join(R, 'tools', 'causes-template.js'), 'utf8');
fs.writeFileSync(path.join(R, 'site', 'js', 'causes.js'), t.replace('__DATA__', JSON.stringify(slim)));
console.log('causes.js', slim.eras.length, 'eras');
