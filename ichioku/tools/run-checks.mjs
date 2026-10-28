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
let md = '# 試験の結果の一覧（1000分の1 v19）\n\n';
md += '作った日：' + new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 16).replace('T', ' ') + '（日本時間）\n\n';
md += '## 受け入れの検査（tools/check6.mjs。10-x は v18-fix-spec2 の1〜17、1-x・2-x は spec6、7-x は tsunagari-spec1、8-x・9-x は ui-spec2 の「確かめ方」）\n\n';
md += '合格 ' + pass + '／' + rs.length + '\n\n| 番号 | 検査 | 件数 | 結果 | 中身 |\n|---|---|---|---|---|\n';
for (const r of rs) md += '| ' + r.id + ' | ' + String(r.name).replace(/\|/g, '｜') + ' | ' + (r.n || 0) + ' | ' + (r.ok ? '合格' : '不合格') + ' | ' + String(r.detail || '').replace(/\|/g, '｜').replace(/\n/g, ' ') + ' |\n';
md += '\n## 今までの検査（tools/check.mjs --test）\n\n';
md += '全体：' + (old.ok ? '合格' : '不合格') + '（' + (old.secs || 0) + '秒）\n\n';
if (oldLines.length) { md += '| 結果 | 検査と中身 |\n|---|---|\n'; for (const l of oldLines) { const m = l.match(/^(合格|不合格|目標[^\s]*)\s*(.*)$/); md += '| ' + (m ? m[1] : '') + ' | ' + String(m ? m[2] : l).replace(/\|/g, '｜') + ' |\n'; } }
// v19：開くまでの時間（tools/load-time.cjs）・分けたデータで同じ人生になるか（tools/check-split.mjs）・ブラウザの受け入れ（tools/ui19.cjs）・目で確かめた300文
const LG0 = path.join(ROOT, 'logs'), J = f => fs.existsSync(path.join(LG0, f)) ? JSON.parse(fs.readFileSync(path.join(LG0, f), 'utf8')) : null;
const lt = J('load-time.json');
md += '\n## 開くまでの時間（v19 12・tools/load-time.cjs。公開用の dist/ を gzip で送るサーバーで、何も覚えていないブラウザから5回ずつ）\n\n';
if (lt) {
  md += '| 条件 | トップが見えるまで（中央の値） | 「生まれる」が押せるまで（中央の値） | 5回の値（押せるまで） | 読んだ量 | 目標 | 結果 |\n|---|---|---|---|---|---|---|\n';
  for (const r of lt.profiles) md += '| ' + r.name + (r.name === '遅い' ? '（1.6Mbps・遅れ150ms・処理4分の1）' : '（20Mbps・遅れ20ms）') + ' | ' + (r.top / 1000).toFixed(2) + '秒 | ' + (r.born / 1000).toFixed(2) + '秒 | ' + r.borns.map(x => (x / 1000).toFixed(2)).join('・') + ' | 約' + r.kb + 'KB | ' + (r.goalTop ? 'トップ ' + r.goalTop / 1000 + '秒・' : '') + '生まれる ' + r.goalBorn / 1000 + '秒 | ' + (r.ok ? '合格' : '不合格') + ' |\n';
  const lv = J('load-time-v18.json'); if (lv) md += '\n比べ：v18 の作り（site/ をそのまま、同じサーバー）では、遅い条件で「生まれる」が押せるまで ' + (lv.profiles[0].born / 1000).toFixed(1) + '秒・読んだ量 約' + lv.profiles[0].kb + 'KB でした。\n';
} else md += '（まだ）\n';
const sp = J('check-split.json');
md += '\n### 時代ごとに分けたデータで作った人生が、全部を読んだときと同じか（tools/check-split.mjs）\n\n' + (sp ? (sp.ok ? '合格' : '不合格') + '：' + sp.n + '件のうち違った人生 ' + sp.diff.length + '件\n' : '（まだ）\n');
md += '\n## ブラウザでの受け入れ（v19・tools/ui19.cjs）\n\n| 結果 | 確かめたこと | 中身 |\n|---|---|---|\n';
const U = (f, name, fn) => { const u = J('ui19/' + f); md += '| ' + (u ? (u.bad.length ? '不合格' : '合格') : 'まだ') + ' | ' + name + ' | ' + (u ? String(fn(u)).replace(/\|/g, '｜') + (u.bad.length ? '・気になる点：' + u.bad.slice(0, 3).join('、') : '') : '') + ' |\n'; };
U('auto.json', '「すべておまかせ」だけを押して何も押さずに最期まで（390×844）', u => u.summary.runs + '件のうち最期まで ' + u.summary.end + '件・止まった ' + u.summary.stuck + '件・時代 ' + Object.entries(u.summary.eras).map(([k, v]) => k + ' ' + v).join('、') + '・エラー ' + u.summary.errors + '・外部への通信 ' + u.summary.ext);
U('auto-1440.json', '「すべておまかせ」だけを押して何も押さずに最期まで（1440×900）', u => u.summary.runs + '件のうち最期まで ' + u.summary.end + '件・エラー ' + u.summary.errors);
U('births.json', '自分で選ぶ遊び方で、生まれ年を入れずに生まれの画面を開く（比べの表・人生を始める）', u => u.summary.runs + '件のうち始まった ' + u.summary.ok + '件・時代 ' + Object.entries(u.summary.eras).map(([k, v]) => k + ' ' + v).join('、') + '・エラー ' + u.summary.errors);
U('band.json', '帯の名前（390×844・360×740・1440×900、いちばん下まで送ったとき）', u => u.sizes.map(x => x.size + '「' + x.name + '」' + (x.vis ? '見える' : '見えない')).join('・'));
U('inputs.json', '文を書かせる入力欄（名前の欄と選ぶ欄を除く）', u => '画面 ' + u.inputs.length + '件・HTML ' + u.htmlInputs + '件');
U('cont.json', '亡くなった後の続きのボタン（3つ以下・家系図への案内・続きの人生で生まれの画面）', u => u.runs.map(r => r.btns.length + 'つ').join('・'));
U('desc.json', 'あなたにつながる子孫を代ごとに（生まれた年・都道府県を入れて）', u => u.gens.slice(1).map(g => (g.grid || []).join(' ') || g.end || '').join(' → '));
for (const acc of [J('ui19/accept.json'), J('ui19/accept-1440.json')]) if (acc) for (const c of acc.checks) md += '| ' + (c.ok ? '合格' : '不合格') + ' | ' + c.name.replace(/\|/g, '｜') + ' | ' + String(c.detail || '').replace(/\|/g, '｜').slice(0, 400) + ' |\n';
// 7 の目で確かめた300文
const rv = fs.existsSync(path.join(ROOT, 'data-src', 'review300.json')) ? JSON.parse(fs.readFileSync(path.join(ROOT, 'data-src', 'review300.json'), 'utf8')) : null;
md += '\n## 目で確かめた300文（v19 7。記録500件から無作為に300文。tools/sample300.mjs）\n\n';
if (rv) {
  const fixed = rv.items.filter(x => x.fix), left = rv.items.filter(x => x.v === '分からない' && !x.fix);
  md += '確かめた文 ' + rv.items.length + '・直した文 ' + fixed.length + '・直さずに残したあいまいな文 ' + left.length + '\n\n';
  if (fixed.length) { md += '### 直した文\n\n| 前の文 | 直した文 |\n|---|---|\n'; for (const x of fixed) md += '| ' + x.t.replace(/\|/g, '｜') + ' | ' + x.fix.replace(/\|/g, '｜') + ' |\n'; }
  md += '\n### 300文の一覧（決めたことは、画面で文の前に出る「決めたこと」）\n\n| 番号 | 年・年齢 | 決めたこと | 文 | 目で確かめた結果 |\n|---|---|---|---|---|\n';
  rv.items.forEach((x, i) => { md += '| ' + (i + 1) + ' | ' + x.y + '年・' + x.a + '歳 | ' + String(x.did || '').replace(/\|/g, '｜') + ' | ' + x.t.replace(/\|/g, '｜') + ' | ' + x.v + (x.note ? '（' + x.note + '）' : '') + ' |\n'; });
} else md += '（まだ）\n';
// v18：ブラウザの検査（tools/ui18.cjs）・色の差（tools/contrast18.cjs）・一生の骨組みの表（tools/count-skeleton.mjs）
const LG = path.join(ROOT, 'logs');
md += '\n## ブラウザでの検査（v18・tools/ui18.cjs。画面写真は tools/screens/）\n\n';
for (const k of ['sizes', 'modal', 'top', 'trip']) {
  const f = path.join(LG, 'ui18-' + k + '.json');
  if (!fs.existsSync(f)) { md += '- ' + k + '：まだ\n'; continue; }
  const u = JSON.parse(fs.readFileSync(f, 'utf8'));
  md += '\n### ' + ({ sizes: '6つの大きさの画面（人生・生まれ・最期）', modal: '初めて開いたときの窓', top: '遊んでいる途中の「トップへ」', trip: '三つ子の3人全員の人生' })[k] + '\n\n| 結果 | 確かめたこと | 中身 |\n|---|---|---|\n';
  for (const c of u.checks) md += '| ' + (c.ok ? '合格' : '不合格') + ' | ' + c.name.replace(/\|/g, '｜') + ' | ' + String(c.detail || '').replace(/\|/g, '｜').slice(0, 300) + ' |\n';
}
const cf = path.join(LG, 'contrast18.json');
if (fs.existsSync(cf)) { const c = JSON.parse(fs.readFileSync(cf, 'utf8')); md += '\n### 文字と背景の色の差（明るい表示・暗い表示、1440×900 と 390×844。tools/contrast18.cjs）\n\n' + (c.length ? '不合格：' + c.length + '組（' + c.slice(0, 5).map(x => x.scheme + ' ' + x.sel + ' ' + x.ratio).join('、') + '）' : '合格：基準（本文4.5・大きな文字3）に足りない組み合わせ 0') + '\n'; }
const sk = path.join(LG, 'skeleton.md');
if (fs.existsSync(sk)) md += '\n' + fs.readFileSync(sk, 'utf8').replace(/^# /, '## ') + '\n';
md += '\n## ブラウザでの確かめ\n\n' + (fs.existsSync(path.join(OUT, 'browser.md')) ? fs.readFileSync(path.join(OUT, 'browser.md'), 'utf8') : '（まだ）\n');
fs.writeFileSync(path.join(ROOT, 'test-results.md'), md);
console.log('test-results.md：第6版 ' + pass + '／' + rs.length + '・今まで ' + (old.ok ? '合格' : '不合格'));
