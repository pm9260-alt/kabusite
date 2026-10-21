// 検査を小分けに動かし、1つ終わるごとに結果を保存する（途中で止まっても、もう一度動かせば続きから）。最後に test-results.md を作る
// 使い方：node tools/run-checks.mjs [--fresh]（--fresh は前の結果を消してはじめから）
//   1) tools/check6.mjs の検査を1つずつ（第6版の受け入れの検査）
//   2) tools/check.mjs --test（今までの検査をまとめて。10分ほど）
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'logs', 'check6');
fs.mkdirSync(OUT, { recursive: true });
if (process.argv.includes('--fresh')) for (const f of fs.readdirSync(OUT)) fs.unlinkSync(path.join(OUT, f));
const ids = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'check6.mjs'), '--list'], { encoding: 'utf8' }).stdout.trim().split('\n').map(l => l.split('\t')[0]);
for (const id of ids) {
  if (fs.existsSync(path.join(OUT, id + '.json'))) continue;
  const r = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'check6.mjs'), '--only', id], { encoding: 'utf8', timeout: 40 * 60 * 1000 });
  process.stdout.write(r.stdout || '');
  if (!fs.existsSync(path.join(OUT, id + '.json'))) fs.writeFileSync(path.join(OUT, id + '.json'), JSON.stringify({ id, name: id, ok: false, n: 0, detail: '途中で止まった：' + String(r.stderr || r.error || '').slice(0, 200) }));
}
// 今までの検査（まとめて1つ）
if (!fs.existsSync(path.join(OUT, 'old.json'))) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'check.mjs'), '--test'], { encoding: 'utf8', timeout: 90 * 60 * 1000, maxBuffer: 64 * 1024 * 1024 });
  const rep = fs.existsSync(path.join(ROOT, 'logs', 'check-report.txt')) ? fs.readFileSync(path.join(ROOT, 'logs', 'check-report.txt'), 'utf8') : (r.stdout || '');
  fs.writeFileSync(path.join(OUT, 'old.json'), JSON.stringify({ id: 'old', name: '今までの検査（tools/check.mjs --test）', ok: r.status === 0, secs: Math.round((Date.now() - t0) / 1000), report: rep.slice(0, 200000) }));
}
// test-results.md
const rs = ids.map(id => JSON.parse(fs.readFileSync(path.join(OUT, id + '.json'), 'utf8')));
const old = JSON.parse(fs.readFileSync(path.join(OUT, 'old.json'), 'utf8'));
const pass = rs.filter(r => r.ok).length;
const oldLines = String(old.report || '').split('\n').filter(l => /^(合格|不合格|目標)/.test(l));
let md = '# 試験の結果の一覧（1000分の1 v16）\n\n';
md += '作った日：' + new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 16).replace('T', ' ') + '（日本時間）\n\n';
md += '## 第6版の受け入れの検査（指示書 spec6 の「確かめ方」）\n\n';
md += '合格 ' + pass + '／' + rs.length + '\n\n| 番号 | 検査 | 件数 | 結果 | 中身 |\n|---|---|---|---|---|\n';
for (const r of rs) md += '| ' + r.id + ' | ' + String(r.name).replace(/\|/g, '｜') + ' | ' + (r.n || 0) + ' | ' + (r.ok ? '合格' : '不合格') + ' | ' + String(r.detail || '').replace(/\|/g, '｜').replace(/\n/g, ' ') + ' |\n';
md += '\n## 今までの検査（tools/check.mjs --test）\n\n';
md += '全体：' + (old.ok ? '合格' : '不合格') + '（' + (old.secs || 0) + '秒）\n\n';
if (oldLines.length) { md += '| 結果 | 検査と中身 |\n|---|---|\n'; for (const l of oldLines) { const m = l.match(/^(合格|不合格|目標[^\s]*)\s*(.*)$/); md += '| ' + (m ? m[1] : '') + ' | ' + String(m ? m[2] : l).replace(/\|/g, '｜') + ' |\n'; } }
md += '\n## ブラウザでの確かめ\n\n' + (fs.existsSync(path.join(OUT, 'browser.md')) ? fs.readFileSync(path.join(OUT, 'browser.md'), 'utf8') : '（まだ）\n');
fs.writeFileSync(path.join(ROOT, 'test-results.md'), md);
console.log('test-results.md：第6版 ' + pass + '／' + rs.length + '・今まで ' + (old.ok ? '合格' : '不合格'));
