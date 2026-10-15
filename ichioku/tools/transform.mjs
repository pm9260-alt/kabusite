// 取り込んだ表（raw/pull）→ 人生の進め方が使う形（data-src/stats/stats.json）
// 使い方：node tools/transform.mjs
// 取り込んでいない表があっても止まらず、作れた分だけ書き出す。作れなかった項目は stats.json の missing に残す。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSheets } from './xlsx-lite.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW = path.join(ROOT, 'raw', 'pull');
const FILES = path.join(ROOT, 'raw', 'files');
const OUT = path.join(ROOT, 'data-src', 'stats', 'stats.json');

// 地方の区分（engine.js の HUB と同じ8区分。沖縄県は九州に入れる）
const REGION = {
  '北海道': ['01'],
  '東北': ['02', '03', '04', '05', '06', '07'],
  '関東': ['08', '09', '10', '11', '12', '13', '14'],
  '中部': ['15', '16', '17', '18', '19', '20', '21', '22', '23'],
  '近畿': ['24', '25', '26', '27', '28', '29', '30'],
  '中国': ['31', '32', '33', '34', '35'],
  '四国': ['36', '37', '38', '39'],
  '九州': ['40', '41', '42', '43', '44', '45', '46', '47']
};
const regionOf = c => Object.keys(REGION).find(r => REGION[r].includes(c));

// 国勢調査の産業大分類 → 人生の進め方の9区分（T 分類不能の産業は除いて割合を出す）
const IND_MAP = {
  agri: ['A'], fish: ['B'], factory: ['C', 'E'], build: ['D'],
  office: ['F', 'G', 'H', 'J', 'K', 'L'], shop: ['I'], pub: ['S'],
  care: ['O', 'P'], service: ['M', 'N', 'Q', 'R']
};

const missing = [];
const used = [];
function load(id) {
  const p = path.join(RAW, id + '.json');
  if (!fs.existsSync(p)) { missing.push(id + '：まだ取り込んでいない'); return null; }
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  used.push({ job: j.job, name: j.name, src: j.src, table: j.table.id, title: j.table.title, updated: j.table.updated, fetched: j.fetched });
  return j;
}
const yearOf = t => parseInt(String(t).slice(0, 4), 10);
const num = v => { const x = parseFloat(String(v.$).replace(/,/g, '')); return Number.isFinite(x) ? x : null; };
const r4 = x => +x.toFixed(4);

// 値を [項目][地域][年] にまとめる
function cube(j, catKey = '@cat01') {
  const c = {};
  if (!j) return c;
  for (const v of j.values) {
    const x = num(v); if (x == null) continue;
    const k = v[catKey] || '_', a = v['@area'], y = yearOf(v['@time']);
    ((c[k] = c[k] || {})[a] = c[k][a] || {})[y] = x;
  }
  return c;
}
const get = (c, k, a) => (c[k] || {})[a] || {};
// 2つの系列の比（両方ある年だけ）。lag は分母を何年前にずらすか
function ratio(nu, de, lag = 0, lo = 0, hi = 10) {
  const out = {};
  for (const y of Object.keys(nu).map(Number)) {
    const d = de[y - lag];
    if (d > 0 && nu[y] != null) { const v = nu[y] / d; if (v >= lo && v <= hi) out[y] = r4(v); }
  }
  return out;
}
const keysN = o => Object.keys(o).length;

/* ---------- 都道府県 ---------- */
const births = cube(load('pref-births'));
// 1975〜1979年は社会・人口統計体系にないため、人口動態統計の年次別の表（5年おき）で補う
const birthsVital = cube(load('pref-births-vital'), '@tab');
const school = cube(load('pref-school'));
const life = cube(load('pref-life'));
const income = cube(load('pref-income'));

const prefNames = {};
for (const j of ['pref-births', 'pref-school'].map(id => { try { return JSON.parse(fs.readFileSync(path.join(RAW, id + '.json'), 'utf8')); } catch { return null; } }).filter(Boolean)) {
  for (const [code, name] of Object.entries(j.classes.area || {})) if (code !== '00000') prefNames[code.slice(0, 2)] = name;
}

const nat = {};
const A = '00000';
if (keysN(get(births, 'A4101', A))) {
  nat.q0 = ratio(get(births, 'A4281', A), get(births, 'A4101', A), 0, 0, 0.1);
}
// 有効求人倍率：一般職業紹介状況の長期時系列表 第11表（暦年の年平均、パートタイムを含む一般）
const jobs = {};
{
  const meta = path.join(FILES, 'jobs-long.json'), x = path.join(FILES, 'jobs-long.xlsx');
  if (fs.existsSync(x)) {
    const m = JSON.parse(fs.readFileSync(meta, 'utf8'));
    const sheet = readSheets(fs.readFileSync(x)).find(s => s.name.includes('有効求人倍率（実数）'));
    if (!sheet) missing.push('jobs-long：有効求人倍率（実数）のシートが見つからない');
    else {
      const head = sheet.rows.find(r => r.includes('全国'));
      const col = {};
      head.forEach((h, i) => { if (h === '全国') col['00'] = i; const c = Object.keys(prefNames).find(k => prefNames[k] === h); if (c) col[c] = i; });
      for (const r of sheet.rows) {
        // 年平均の行だけを使う（後ろにある月ごとの行は3列目に月が入っている）
        const y = /^(\d{4})年$/.exec(String(r[0] || ''));
        if (!y || r[2] != null) continue;
        for (const [c, i] of Object.entries(col)) if (typeof r[i] === 'number') (jobs[c] = jobs[c] || {})[+y[1]] = r[i];
      }
      used.push({ job: m.job, name: m.name, src: m.src, table: m.url, title: sheet.name, updated: m.modified, fetched: m.fetched });
      if (Object.keys(col).length !== 48) missing.push('jobs-long：都道府県の列が ' + (Object.keys(col).length - 1) + ' しか見つからない');
    }
  } else missing.push('jobs-long：まだ取り込んでいない');
}
if (jobs['00']) nat.jobs = jobs['00'];
if (keysN(get(life, '#I0520101', A))) nat.e0 = { m: get(life, '#I0520101', A), f: get(life, '#I0520102', A) };

const prefs = [];
for (const pc of Object.keys(prefNames).sort()) {
  const a = pc + '000';
  const s = {}, est = {};
  const E = k => get(school, k, a);
  if (keysN(E('E3701'))) {
    s.hs = Object.fromEntries(Object.entries(E('E3801')).map(([y, v]) => [y, r4(v / 100)]));
    s.univ = ratio(E('E470205'), E('E3701'), 3, 0, 1);
    s.jc = ratio(E('E470206'), E('E3701'), 3, 0, 1);
    // 出身高校の県別の短大入学者は2000年からしかない。それより前は、県内の短大の入学者の動きを
    // 2000年の「出身県別 ÷ 所在県別」の比でそろえて推し量る（est に始まりの年を残す）
    const jcLoc = ratio(E('E6402'), E('E3701'), 3, 0, 1);
    const jcFrom = Math.min(...Object.keys(s.jc).map(Number));
    if (Number.isFinite(jcFrom) && jcLoc[jcFrom] > 0) {
      const k = s.jc[jcFrom] / jcLoc[jcFrom];
      for (const [y, v] of Object.entries(jcLoc)) if (+y < jcFrom) s.jc[y] = r4(Math.min(1, v * k));
      est.jc = jcFrom;
    }
    s.voc = ratio(E('E4603'), E('E3701'), 3, 0, 1);
    s.out = ratio(E('E470202'), E('E470205'), 0, 0, 1);
    est.out = Math.min(...Object.keys(s.out).map(Number));
    const inPref = E('E460410'), job = E('E4604');
    s.outJob = Object.fromEntries(Object.keys(inPref).filter(y => job[y] > 0).map(y => [y, r4(1 - inPref[y] / job[y])]));
    const pub = E('E350101'), all = E('E3501');
    s.priv = Object.fromEntries(Object.keys(pub).filter(y => all[y] > 0).map(y => [y, r4(1 - pub[y] / all[y])]));
    s.privHs = ratio(E('E4513'), E('E4501'), 0, 0, 1);
  }
  if (jobs[pc] && jobs['00']) s.jobs = ratio(jobs[pc], jobs['00'], 0, 0, 10);
  if (keysN(get(income, 'L450101', a))) s.income = ratio(get(income, 'L450101', a), get(income, 'L450101', A), 0, 0, 10);
  for (const [k, v] of Object.entries(s)) if (!keysN(v)) delete s[k];
  const e0 = { m: get(life, '#I0520101', a), f: get(life, '#I0520102', a) };
  const e0diff = { m: {}, f: {} };
  for (const sex of ['m', 'f']) for (const [y, v] of Object.entries(e0[sex])) { const n = (nat.e0 || { m: {}, f: {} })[sex][y]; if (n) e0diff[sex][y] = +(v - n).toFixed(2); }
  const b = { ...get(birthsVital, '10040', a), ...get(births, 'A4101', a) };
  prefs.push({ code: pc, name: prefNames[pc], region: regionOf(pc), births: b, s, est, e0diff });
}

/* ---------- 市区町村 ---------- */
const mb = load('muni-births');
const mi = load('muni-industry');
const munisByPref = {};
if (mb) {
  // 地域の名前は「北海道 札幌市 中央区」の形。区を持つ市（政令指定都市の全体）は、区と二重になるので外す
  const names = mb.classes.area;
  const parts = Object.fromEntries(Object.entries(names).map(([c, n]) => [c, n.split(/\s+/)]));
  const parents = new Set(Object.keys(parts).filter(c => parts[c].join('').endsWith('特別区部')));
  const parentOf = {};
  for (const [c, p] of Object.entries(parts)) if (p.length >= 3) {
    const parent = Object.keys(parts).find(k => k !== c && k.slice(0, 2) === c.slice(0, 2) && parts[k].length === 2 && parts[k][1] === p[1]);
    if (parent) { parents.add(parent); parentOf[c] = parent; }
  }
  const cnt = cube(mb);
  const byMuni = cnt['A4101'] || {};
  // 区ができる前の年（政令指定都市になる前）は、区の数字がない。市全体の出生数を、
  // 区の数字が出そろった最初の年の区ごとの割合で分けて推し量る（realFrom に区の数字がある最初の年を残す）
  const realFrom = {};
  const merged = new Set(), bigCity = new Set();
  const kids = {};
  for (const [w, pa] of Object.entries(parentOf)) (kids[pa] = kids[pa] || []).push(w);
  for (const [pa, ws] of Object.entries(kids)) {
    const pb = byMuni[pa] || {};
    const yAll = Object.keys(pb).map(Number).filter(y => ws.every(w => (byMuni[w] || {})[y] != null)).sort((x, y) => x - y)[0];
    // 区の組み直しのあとで区の数字がまだない市（浜松市）は、区に分けず市全体で1つとして扱う
    if (!yAll) { parents.delete(pa); ws.forEach(w => merged.add(w)); bigCity.add(pa); missing.push(names[pa] + '：区ごとの出生数がまだないため、区に分けず市全体で扱った'); continue; }
    const tot = ws.reduce((t, w) => t + byMuni[w][yAll], 0);
    for (const w of ws) {
      byMuni[w] = byMuni[w] || {};
      for (const [y, v] of Object.entries(pb)) if (byMuni[w][y] == null && tot > 0) { byMuni[w][y] = v * byMuni[w][yAll] / tot; realFrom[w] = Math.max(realFrom[w] || 0, yAll); }
    }
  }
  // 産業
  const ind = {};
  if (mi) {
    for (const v of mi.values) {
      const x = num(v); if (x == null) continue;
      (ind[v['@area']] = ind[v['@area']] || {})[v['@cat02']] = x;
    }
  }
  const indShare = area => {
    const t = ind[area]; if (!t) return null;
    const o = {}; let sum = 0;
    for (const [k, codes] of Object.entries(IND_MAP)) { o[k] = codes.reduce((s, c) => s + (t[c] || 0), 0); sum += o[k]; }
    if (!(sum > 0)) return null;
    for (const k of Object.keys(o)) o[k] = r4(o[k] / sum);
    return o;
  };
  if (mi) nat.indNat = indShare('00000');
  for (const [code, p] of Object.entries(parts)) {
    if (parents.has(code) || merged.has(code)) continue;
    const pc = code.slice(0, 2);
    const name = p.slice(1).join('');
    const kind = (p.length >= 3 || /^131/.test(code) || bigCity.has(code)) ? '大都市' : /市$/.test(p[1]) ? '都市' : '町村';
    // 2020年の国勢調査のあとにできた区（浜松市の3区）は市全体の値、住む人がいなかった町（双葉町）は県全体の値を使う
    let ind = indShare(code), indEst = false;
    if (!ind && parentOf[code]) { ind = indShare(parentOf[code]); indEst = !!ind; }
    if (!ind) { ind = indShare(pc + '000'); indEst = !!ind; }
    (munisByPref[pc] = munisByPref[pc] || []).push({ code, name, kind, births: byMuni[code] || {}, ind, ...(indEst ? { indEst: true } : {}), ...(realFrom[code] ? { realFrom: realFrom[code] } : {}) });
  }
  // 生まれた割合：県の中の各市区町村の出生数 ÷ 県内の合計。0人の年があっても選ばれうるように前後5年の平均を使う
  for (const [pc, list] of Object.entries(munisByPref)) {
    const years = [...new Set(list.flatMap(m => Object.keys(m.births).map(Number)))].sort((a, b) => a - b);
    const avg = (m, y) => { let s = 0, n = 0; for (let d = -2; d <= 2; d++) if (m.births[y + d] != null) { s += m.births[y + d]; n++; } return n ? s / n : 0; };
    const floor = [];
    for (const y of years) {
      const tot = list.reduce((s, m) => s + avg(m, y), 0);
      for (const m of list) {
        m.share = m.share || {};
        let v = tot > 0 ? avg(m, y) / tot : 0;
        if (!(v > 0)) { v = 1e-6; floor.push(m.name + y); }
        m.share[y] = +v.toPrecision(4);
      }
    }
    if (floor.length) missing.push(prefNames[pc] + '：前後5年とも出生数が0人の市区町村・年（最小の値を入れた）' + floor.length + '件　例 ' + floor.slice(0, 3).join('、'));
    for (const m of list) {
      m.shareFrom = years[0];
      delete m.births;
      if (!m.ind) missing.push(prefNames[pc] + m.name + '：産業の割合がない');
      else if (m.indEst) missing.push(prefNames[pc] + m.name + '：2020年の国勢調査に数字がないため、市全体か県全体の産業の割合を使った');
    }
  }
}
for (const p of prefs) p.munis = munisByPref[p.code] || [];

/* ---------- 全国 ---------- */
const cpi = load('nat-cpi');
if (cpi) {
  nat.cpi = {};
  for (const v of cpi.values) { const t = String(v['@time']); if (/^\d{4}000000$/.test(t) && num(v) != null) nat.cpi[yearOf(t)] = num(v); }
}
const un = load('nat-unemp');
if (un) {
  nat.unemp = {};
  for (const v of un.values) if (num(v) != null) nat.unemp[yearOf(v['@time'])] = num(v);
}

const out = { generated: new Date().toISOString(), tables: used, missing, nat, prefs };
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out));
const muniN = prefs.reduce((s, p) => s + p.munis.length, 0);
console.log('統計の形を整えました：都道府県 ' + prefs.length + '、市区町村 ' + muniN + '、全国の系列 ' + Object.keys(nat).join('・'));
if (missing.length) console.log('作れなかった・補った項目（' + missing.length + '件）\n' + missing.slice(0, 20).map(s => '・' + s).join('\n'));
