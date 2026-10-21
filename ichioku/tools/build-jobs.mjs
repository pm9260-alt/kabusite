// data-src/jobs.json から site/js/jobs.js を作る（node tools/build-jobs.mjs）
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const R = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const d = JSON.parse(fs.readFileSync(path.join(R, 'data-src', 'jobs.json'), 'utf8'));
// 第6版で足した仕事（data-src/jobs-add/*.json。1ファイル = 行の配列）
const ADD = path.join(R, 'data-src', 'jobs-add');
if (fs.existsSync(ADD)) for (const f of fs.readdirSync(ADD).filter(f => f.endsWith('.json')).sort()) d.rows = d.rows.concat(JSON.parse(fs.readFileSync(path.join(ADD, f), 'utf8')));
const t = fs.readFileSync(path.join(R, 'tools', 'jobs-template.js'), 'utf8');
fs.writeFileSync(path.join(R, 'site', 'js', 'jobs.js'), t.replace('__ROWS__', JSON.stringify(d.rows)));
console.log('jobs.js', d.rows.length);
