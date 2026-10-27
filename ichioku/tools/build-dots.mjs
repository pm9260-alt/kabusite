// 生まれの画面の「点の集まりの日本地図」（v18 指示書 ui-spec2 の 3）：data/map.json の都道府県の形の中に等間隔の点を並べ、
// site/data/dots.json に保存する（作るときに一度だけ計算し、画面では毎回計算しない）
// 使い方：node tools/build-dots.mjs
import fs from 'node:fs'; import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const M = JSON.parse(fs.readFileSync(path.join(ROOT, 'site', 'data', 'map.json'), 'utf8'));
const STEP = 3.2; // 点の間隔（地図の座標で）
function polys(d) {
  const out = []; let cur = null;
  for (const m of d.matchAll(/([MLZ])([^MLZ]*)/g)) {
    if (m[1] === 'M') { cur = []; out.push(cur); }
    if (m[1] !== 'Z') { const n = m[2].trim().split(/[\s,]+/).map(Number); for (let i = 0; i + 1 < n.length; i += 2) cur.push([n[i], n[i + 1]]); }
  }
  return out.filter(p => p.length > 2);
}
function inside(x, y, ps) { // 偶奇の規則（穴や飛び地もまとめて数える）
  let c = false;
  for (const p of ps) for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, yi] = p[i], [xj, yj] = p[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; }
  return c;
}
const [vx, vy, vw, vh] = M.view, dots = [], byPref = {};
const P = Object.fromEntries(Object.entries(M.prefs).map(([k, d]) => [k, polys(d)]));
const box = {};
for (const [k, ps] of Object.entries(P)) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of ps) for (const [x, y] of p) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } box[k] = [x0, y0, x1, y1]; }
for (let y = vy + STEP / 2; y < vy + vh; y += STEP) for (let x = vx + STEP / 2; x < vx + vw; x += STEP) {
  for (const [k, ps] of Object.entries(P)) { const b = box[k]; if (x < b[0] || x > b[2] || y < b[1] || y > b[3]) continue; if (inside(x, y, ps)) { dots.push([Math.round(x * 10) / 10, Math.round(y * 10) / 10, k]); byPref[k] = (byPref[k] || 0) + 1; break; } }
}
// 点が1つも入らない小さな県は、県の中心に1つ置く
for (const k of Object.keys(P)) if (!byPref[k] && M.center[k]) { dots.push([M.center[k][0], M.center[k][1], k]); byPref[k] = 1; }
fs.writeFileSync(path.join(ROOT, 'site', 'data', 'dots.json'), JSON.stringify({ source: M.source, step: STEP, view: M.view, insets: M.insets, center: M.center, prov: M.prov, dots }));
console.log('点', dots.length, '・都道府県', Object.keys(byPref).length);
