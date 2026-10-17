// data-src/jobs.json から site/js/jobs.js を作る（node tools/build-jobs.mjs）
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const R = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const d = JSON.parse(fs.readFileSync(path.join(R, 'data-src', 'jobs.json'), 'utf8'));
const t = fs.readFileSync(path.join(R, 'tools', 'jobs-template.js'), 'utf8');
fs.writeFileSync(path.join(R, 'site', 'js', 'jobs.js'), t.replace('__ROWS__', JSON.stringify(d.rows)));
console.log('jobs.js', d.rows.length);
