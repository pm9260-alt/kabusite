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
// 妻の氏を選んだ結婚の割合（夫妻の氏別婚姻件数。作る人の指示書「継がない子の道」7）
const wn = load('nat-wifename');
if (wn) {
  const tot = {}, wife = {};
  for (const v of wn.values) { const y = yearOf(v['@time']), x = num(v); if (x == null) continue; if (v['@cat01'] === '00100') tot[y] = x; if (v['@cat01'] === '00120') wife[y] = x; }
  nat.wifeName = {};
  for (const y of Object.keys(tot)) if (wife[y] != null && tot[y] > 0) nat.wifeName[y] = +(wife[y] / tot[y]).toFixed(4);
}
const un = load('nat-unemp');
if (un) {
  nat.unemp = {};
  for (const v of un.values) if (num(v) != null) nat.unemp[yearOf(v['@time'])] = num(v);
}

/* ---------- 全国の暮らしの値（2回目の取り込み、2026-10-16） ---------- */
const census = {};
const fileJob = id => {
  const x = path.join(FILES, id + '.xlsx'), meta = path.join(FILES, id + '.json');
  if (!fs.existsSync(x)) { missing.push(id + '：まだ取り込んでいない'); return null; }
  const m = JSON.parse(fs.readFileSync(meta, 'utf8'));
  used.push({ job: m.job, name: m.name, src: m.src, table: m.url, title: m.name, updated: m.modified, fetched: m.fetched });
  return readSheets(fs.readFileSync(x));
};
const clsYear = name => { const m = /(\d{4})/.exec(String(name || '')); return m ? +m[1] : null; };

// 25〜34歳の非正規の割合（%）：1988〜2001年は2月の特別調査、2002年からは四半期平均を年でならす
{
  const sh = fileJob('labor-nonreg');
  if (sh) {
    const rows = sh[0].rows;
    const head = rows.find(r => r.some(x => String(x || '').startsWith('25～34')));
    const c = head.findIndex(x => String(x || '').startsWith('25～34')) + 13;
    const acc = {};
    for (const r of rows) {
      const lab = String(r[2] || '');
      let y = null;
      if (/^Feb\. \d{4}$/.test(lab)) y = +lab.slice(5);
      else if (/^\d{4} .*average$/.test(lab)) y = +lab.slice(0, 4);
      if (!y || typeof r[c] !== 'number') continue;
      (acc[y] = acc[y] || []).push(r[c]);
    }
    nat.nonreg = Object.fromEntries(Object.entries(acc).filter(([, v]) => v.length === 1 || v.length === 4).map(([y, v]) => [y, +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(1)]));
  }
}

// 普及率（%）：消費動向調査 二人以上の世帯。2004年で調べ終わった品目は data-src/stats/goods-ended.json
const goods = {};
{
  const sh = fileJob('goods-long');
  if (sh) {
    const rows = sh[0].rows;
    const head = rows.find(r => r.includes('ルームエアコン'));
    const want = { washlet: '温水洗浄便座', aircon: 'ルームエアコン', pc: 'パソコン', mobile: '携帯電話_全体', smart: '携帯電話_スマートフォン' };
    for (const [id, label] of Object.entries(want)) {
      const c = head.indexOf(label);
      if (c < 0) { missing.push('goods-long：「' + label + '」の列が見つからない'); continue; }
      goods[id] = {};
      for (const r of rows) if (typeof r[0] === 'number' && r[0] > 1e9 && typeof r[c] === 'number') goods[id][Math.floor(r[0] / 1e6)] = r[c];
    }
  }
  const endedPath = path.join(ROOT, 'data-src', 'stats', 'goods-ended.json');
  if (fs.existsSync(endedPath)) {
    const e = JSON.parse(fs.readFileSync(endedPath, 'utf8'));
    for (const [id, d] of Object.entries(e.diff)) goods[id] = d;
    // 今も調べている品目でも、今の表が始まる年より前は古い表の値を使う（携帯電話・温水洗浄便座）
    for (const [id, d] of Object.entries(e.diff_old || {})) if (goods[id]) { const first = Math.min(...Object.keys(goods[id]).map(Number)); for (const [y, v] of Object.entries(d)) if (+y < first) goods[id][y] = v; }
    used.push({ job: 'goods-ended', name: '消費動向調査（2004年3月で調査終了した品目の普及率）', src: 'consumer', table: e.source, title: e.source, updated: '2012-10-31', fetched: e.extracted });
  }
}

// 名前の流行：明治安田生命 生まれ年別の名前調査（上位10）
const names = {};
for (const [sex, id] of [['m', 'names-boy'], ['f', 'names-girl']]) {
  const p = path.join(ROOT, 'raw', 'web', id + '.html');
  if (!fs.existsSync(p)) { missing.push(id + '：まだ取り込んでいない'); continue; }
  const html = fs.readFileSync(p, 'utf8');
  let n = 0;
  for (const tr of html.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
    // 同じ順位の名前は1つの欄に改行で並び、そのぶん後ろの欄が「-」になる
    const cells = [...tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(m => m[1].replace(/<br\s*\/?>/g, '|').replace(/<[^>]+>/g, '').replace(/\s+/g, ''));
    const y = /[（(](\d{4})[）)]/.exec(cells[0] || '');
    if (!y) continue;
    const list = cells.slice(1).flatMap(c => c.split('|')).map(x => x.trim()).filter(x => x && x !== '-' && x !== '－').slice(0, 10);
    if (list.length < 5) continue;
    (names[+y[1]] = names[+y[1]] || {})[sex] = list; n++;
  }
  used.push({ job: id, name: '生まれ年別の名前調査（明治安田生命）', src: 'names', table: 'https://www.meijiyasuda.co.jp/enjoy/ranking/year_men/' + (sex === 'm' ? 'boy' : 'girl') + '.html', title: n + '年分', updated: '', fetched: fs.statSync(p).mtime.toISOString() });
  if (n < 50) missing.push(id + '：名前の表が ' + n + ' 年分しか取り出せなかった');
}
for (const y of Object.keys(names)) if (!names[y].m || !names[y].f) delete names[y];

// 母の出産年齢の平均：母の年齢（5歳階級）別の出生数から、各階級の真ん中の年齢で計算する
{
  const j = load('nat-mother-age');
  if (j) {
    const mid = { '00110': 14, '00120': 17.5, '00130': 22.5, '00140': 27.5, '00150': 32.5, '00160': 37.5, '00170': 42.5, '00180': 47.5, '00190': 50.5 };
    const t = {};
    for (const v of j.values) { const m = mid[v['@cat01']], x = num(v); if (m && x != null) { const y = yearOf(v['@time']); t[y] = t[y] || [0, 0]; t[y][0] += m * x; t[y][1] += x; } }
    nat.motherAge = Object.fromEntries(Object.entries(t).filter(([, a]) => a[1] > 0).map(([y, a]) => [y, +(a[0] / a[1]).toFixed(1)]));
  }
}

// 離婚の起きやすさ：1年の離婚件数 ÷ 有配偶の女性の数（国勢調査の年のあいだはまっすぐつなぐ）
{
  const d = load('nat-divorce'), w = load('nat-married-women');
  if (d && w) {
    const wv = {};
    for (const v of w.values) if (num(v) != null) wv[yearOf(v['@time'])] = num(v);
    const ws = Object.keys(wv).map(Number).sort((a, b) => a - b);
    const at = y => { if (y <= ws[0]) return wv[ws[0]]; if (y >= ws[ws.length - 1]) return wv[ws[ws.length - 1]]; const i = ws.findIndex(k => k > y); const a = ws[i - 1], b = ws[i]; return wv[a] + (wv[b] - wv[a]) * (y - a) / (b - a); };
    nat.divorce = {};
    for (const v of d.values) { const x = num(v), y = yearOf(v['@time']); if (x != null && y >= 1970) nat.divorce[y] = +(x / at(y)).toFixed(5); }
  }
}

// 亡くなった場所の割合（病院・診療所・介護施設・老人ホーム・自宅・その他。1951年から）
{
  const j = load('nat-death-place');
  if (j) {
    const K = { '001100': 'hospital', '001200': 'clinic', '001300': 'care', '001500': 'nursing', '002100': 'home', '002200': 'other' };
    const t = {};
    for (const v of j.values) { const k = K[v['@cat01']], x = num(v); if (k && x != null) { const y = yearOf(v['@time']); (t[y] = t[y] || {})[k] = x / 100; } }
    nat.deathPlace = t;
  }
}

// 暮らしの意識（「苦しい」「普通」「ゆとりがある」と答えた世帯の割合。1986年から）
{
  const j = load('nat-life-feel');
  if (j) {
    const K = { '2': 'hard', '3': 'veryHard', '5': 'normal', '6': 'easy' };
    const t = {};
    for (const v of j.values) {
      const k = K[v['@cat01']], x = num(v), nm = j.classes.cat02[v['@cat02']] || '';
      const y = parseInt(nm, 10);
      if (k && x != null && y > 1900) (t[y] = t[y] || {})[k] = x / 100;
    }
    nat.lifeFeel = t;
  }
}

// 手取りの割合（勤労者世帯の 可処分所得 ÷ 実収入）と平均貯蓄率。1985年から（家計調査）
{
  const j = load('nat-kakei-takehome');
  if (j) {
    const t = {};
    for (const v of j.values) {
      const x = num(v), y = yearOf(v['@time']);
      if (x == null) continue;
      // 2000年からは「二人以上の世帯（04）」、それより前は「農林漁家世帯を除く（02）」を使う
      if ((y >= 2000) !== (v['@cat02'] === '04')) continue;
      const k = { '019': 'inc', '233': 'disp', '252': 'save' }[v['@cat01']];
      if (k) (t[y] = t[y] || {})[k] = x;
    }
    nat.takeHome = {}; nat.saveRate = {};
    for (const [y, o] of Object.entries(t)) {
      if (o.inc && o.disp) nat.takeHome[y] = +(o.disp / o.inc).toFixed(4);
      if (o.save != null) nat.saveRate[y] = +(o.save / 100).toFixed(4);
    }
  }
}

// 貯蓄現在高 ÷ 年間収入（二人以上の世帯。貯蓄現在高五分位・世帯主の年齢別）。2007年から（家計調査 貯蓄・負債編）
{
  const j = load('nat-kakei-saving');
  if (j) {
    const AGE = { '430': 25, '303': 35, '304': 45, '305': 55, '306': 65, '570': 75 };
    const raw = {};
    for (const v of j.values) {
      const x = num(v), y = yearOf(v['@time']), a = AGE[v['@cat04']], q = +v['@cat03'];
      if (x == null || !a || q < 1 || q > 5) continue;
      const o = ((raw[y] = raw[y] || {})[a] = raw[y][a] || {});
      (o[q] = o[q] || {})[v['@cat01'] === '011' ? 'inc' : 'sav'] = x;
    }
    nat.savingRatio = {};
    for (const [y, ages] of Object.entries(raw)) {
      const r = {};
      for (const [a, qs] of Object.entries(ages)) {
        const arr = [];
        for (let q = 1; q <= 5; q++) arr.push(qs[q] && qs[q].inc ? +(qs[q].sav / qs[q].inc).toFixed(3) : null);
        if (arr.every(v => v != null)) r[a] = { ratio: arr, inc: [1, 2, 3, 4, 5].map(q => qs[q].inc), sav: [1, 2, 3, 4, 5].map(q => qs[q].sav) };
      }
      if (Object.keys(r).length === 6) nat.savingRatio[y] = r;
    }
  }
}

// 年齢別の死亡率（簡易生命表・全国。1歳刻みで0〜104歳。2007年から）。年齢ごとの亡くなりやすさの形に使う
{
  const j = load('nat-lifetable');
  if (j) {
    const t = {};
    for (const v of j.values) {
      const nm = j.classes.cat01[v['@cat01']] || '', m = /^(\d+)年$/.exec(nm), x = num(v);
      if (!m || x == null) continue;
      const y = yearOf(v['@time']), sex = v['@cat02'] === '10' ? 'm' : 'f', a = +m[1];
      ((t[y] = t[y] || { m: [], f: [] })[sex])[a] = x;
    }
    nat.lifeQx = {};
    for (const [y, o] of Object.entries(t)) if (o.m.length >= 100 && o.f.length >= 100 && !o.m.includes(undefined) && !o.f.includes(undefined)) nat.lifeQx[y] = o;
  }
}

// 年齢層ごとの死因の割合（病気・事故など・自殺）：直近10年の死亡数を合わせて計算する
{
  const j = load('nat-cause');
  if (j) {
    const band = name => { const m = /^(\d+)(?:～(\d+))?歳/.exec(name || ''); if (!m) return null; const lo = +m[1], hi = m[2] ? +m[2] : lo; if (hi - lo !== 4 && !/以上/.test(name)) return null; return lo < 15 ? 'child' : lo < 40 ? 'young' : lo < 65 ? 'mid' : 'old'; };
    const t = {};
    for (const v of j.values) {
      const nm = j.classes.cat01[v['@cat01']] || '';
      const b = /以上/.test(nm) ? (parseInt(nm, 10) >= 65 ? 'old' : null) : band(nm);
      const x = num(v); if (!b || x == null) continue;
      t[b] = t[b] || { all: 0, ext: 0, sui: 0 };
      t[b][{ '00000': 'all', '20000': 'ext', '20200': 'sui' }[v['@cat03']]] += x;
    }
    nat.cause = {};
    for (const [b, o] of Object.entries(t)) nat.cause[b] = { ill: r4((o.all - o.ext) / o.all), acc: r4((o.ext - o.sui) / o.all), sui: r4(o.sui / o.all) };
    nat.causeYears = [...new Set(j.values.map(v => yearOf(v['@time'])))].sort();
  }
}

// くわしい死因：年齢（10の区分）ごとに、直近10年の死亡数から割合を出す（亡くなり方の文に使う）
{
  const j = load('nat-cause-detail');
  if (j) {
    const NAME = {
      '021002017': 'がん', '02100': 'がん', '02103': '胃がん', '02104': '大腸がん', '02106': '肝臓がん', '02108': 'すい臓がん', '02110': '肺がん', '02112': '乳がん', '02113': '子宮がん', '02115': '前立腺がん', '02119': '白血病',
      '09202': '急性心筋梗塞', '09207': '心不全', '09301': 'くも膜下出血', '09302': '脳出血', '09303': '脳梗塞', '09400': '大動脈瘤・大動脈解離', '10200': '肺炎', '106012017': '誤嚥性肺炎', '10400': '慢性閉塞性肺疾患',
      '04100': '糖尿病', '05100': '認知症', '06400': 'アルツハイマー病', '11300': '肝臓の病気', '14200': '腎不全', '01200': '結核', '01300': '敗血症', '18100': '老衰', '18200': '乳幼児突然死症候群', '16000': '生まれたときの病気',
      '17000': '生まれつきの病気', '22201': '新型コロナウイルス感染症', '101002017': 'インフルエンザ', '10100': 'インフルエンザ',
      '20101': '交通事故', '201022017': '転倒・転落', '20102': '転倒・転落', '20103': '溺れる事故', '20104': '窒息', '20105': '火事', '20106': '中毒', '20107': 'その他の事故', '20300': '他殺', '20200': '自殺'
    };
    // 「がん」は部位別を引いた残り。同じ名前は年代の違う番号を足す
    const BANDS = [[0, 0], [1, 4], [5, 14], [15, 24], [25, 39], [40, 54], [55, 64], [65, 74], [75, 84], [85, 200]];
    const bandOf = nm => { const m = /^(\d+)(?:～(\d+))?歳/.exec(nm || ''); if (!m) return null; const lo = +m[1]; return BANDS.findIndex(b => lo >= b[0] && lo <= b[1]); };
    const t = BANDS.map(() => ({}));
    for (const v of j.values) {
      const nm = j.classes.cat01[v['@cat01']] || '';
      if (/^0歳/.test(nm) === false && !/^\d+(～\d+)?歳|以上/.test(nm)) continue;
      const lo = /以上/.test(nm) ? parseInt(nm, 10) : null;
      let b = lo != null ? (lo >= 85 ? 9 : null) : bandOf(nm);
      if (/^0歳$/.test(nm)) b = 0;
      const x = num(v); if (b == null || b < 0 || x == null) continue;
      const code = v['@cat03'];
      const key = code === '00000' ? '_all' : code === '20000' ? '_ext' : NAME[code];
      if (!key) continue;
      t[b][key] = (t[b][key] || 0) + x;
    }
    const sites = ['胃がん', '大腸がん', '肝臓がん', 'すい臓がん', '肺がん', '乳がん', '子宮がん', '前立腺がん', '白血病'];
    nat.causeDetail = { bands: BANDS, years: [...new Set(j.values.map(v => yearOf(v['@time'])))].sort(), dist: t.map(o => {
      const all = o._all || 0; if (!all) return {};
      const r = {};
      const ext = o._ext || 0;
      if (o['がん'] != null) o['がん'] = Math.max(0, o['がん'] - sites.reduce((a, k) => a + (o[k] || 0), 0));
      let ill = 0, acc = 0;
      for (const [k, x] of Object.entries(o)) {
        if (k[0] === '_') continue;
        r[k] = r4(x / all);
        if (['交通事故', '転倒・転落', '溺れる事故', '窒息', '火事', '中毒', 'その他の事故', '他殺', '自殺'].includes(k)) acc += x; else ill += x;
      }
      r['その他の病気'] = r4(Math.max(0, all - ext - ill) / all);
      r['その他の外因'] = r4(Math.max(0, ext - acc) / all);
      return r;
    }) };
  }
}

// 家庭の年収：子どものいる世帯（国民生活基礎調査の児童のいる世帯）の平均所得と分布の広がり
{
  const j = load('nat-income-child'), dist = load('nat-income-child-dist');
  if (j) {
    const ydim = Object.keys(j.classes).find(k => /^cat/.test(k) && Object.values(j.classes[k]).some(n => /^\d{4}\(/.test(n)));
    nat.incomeMean = {};
    for (const v of j.values) if (v['@tab'] === '2760' && num(v) != null) nat.incomeMean[clsYear(j.classes[ydim][v['@' + ydim]])] = num(v);
    // 1985年より前は、全国消費実態調査の全世帯の年間収入の伸び（1979年→1984年）でさかのぼる（推計）
    const L = get(income, 'L450101', A);
    const first = Math.min(...Object.keys(nat.incomeMean).map(Number));
    if (L[1979] && L[1984]) { nat.incomeMean[1979] = Math.round(nat.incomeMean[first] * L[1979] / L[1984]); nat.incomeEstBefore = first; }
  }
  if (dist && nat.incomeMean) {
    const ydim = Object.keys(dist.classes).find(k => /^cat/.test(k) && Object.values(dist.classes[k]).some(n => /^\d{4}\(/.test(n)));
    const cdim = Object.keys(dist.classes).find(k => /^cat/.test(k) && k !== ydim);
    const cum = {};
    for (const v of dist.values) if (v['@tab'] === '1370' && num(v) != null) { const y = clsYear(dist.classes[ydim][v['@' + ydim]]); (cum[y] = cum[y] || {})[v['@' + cdim]] = num(v); }
    const bounds = Object.fromEntries(Object.entries(dist.classes[cdim]).map(([c, n]) => { const z = n.replace(/[０-９]/g, d => String.fromCharCode(d.charCodeAt(0) - 0xFEE0)); const m = /(\d+)～(\d+)万円未満/.exec(z) || /(\d+)万円未満/.exec(z); return [c, m ? (m[2] ? [+m[1], +m[2]] : [0, +m[1]]) : null]; }));
    const sig = {};
    for (const [y, cs] of Object.entries(cum)) {
      const list = Object.entries(cs).filter(([c]) => bounds[c]).sort((a, b) => bounds[a[0]][0] - bounds[b[0]][0]);
      let prev = 0, med = null;
      for (const [c, v] of list) { if (v >= 50) { const [lo, hi] = bounds[c]; med = lo + (hi - lo) * (50 - prev) / (v - prev); break; } prev = v; }
      const mean = nat.incomeMean[y];
      if (med && mean > med) sig[y] = +Math.sqrt(2 * Math.log(mean / med)).toFixed(3);
    }
    const vs = Object.values(sig).sort((a, b) => a - b);
    if (vs.length) { nat.incomeSigma = vs[Math.floor(vs.length / 2)]; nat.incomeSigmaByYear = sig; }
  }
}

// 持ち家・三世代・保育所の割合を、市区町村の種類（大都市・都市・町村）ごとに合わせる。
// 分子と分母の両方がある市区町村だけで足す。種類ごとの値が始まる年より前は、全国の値の動きに合わせてさかのぼる（推計）
{
  const kindOf = {};
  for (const p of prefs) for (const m of p.munis) kindOf[m.code] = m.kind;
  const kinds = ['大都市', '都市', '町村'];
  const vals = j => { const o = {}; if (!j) return o; for (const v of j.values) { const x = num(v); if (x == null) continue; ((o[v['@cat01']] = o[v['@cat01']] || {})[v['@area']] = o[v['@cat01']][v['@area']] || {})[yearOf(v['@time'])] = x; } return o; };
  // nu・de：{地域: {年: 値}}。deYear(y) で分母に使う年を選ぶ
  const ratioByKind = (nu, de, deYear = y => y, cap = 1) => {
    const o = Object.fromEntries(kinds.map(k => [k, {}]));
    const acc = {};
    for (const [a, ys] of Object.entries(nu || {})) {
      const k = kindOf[a]; if (!k || !de || !de[a]) continue;
      for (const [y, x] of Object.entries(ys)) { const dy = deYear(+y, Object.keys(de[a]).map(Number)); if (dy == null || !(de[a][dy] > 0)) continue; const t = ((acc[k] = acc[k] || {})[y] = acc[k][y] || [0, 0]); t[0] += x; t[1] += de[a][dy]; }
    }
    for (const k of kinds) for (const [y, [a, b]] of Object.entries(acc[k] || {})) if (b > 0) o[k][y] = r4(Math.min(cap, a / b));
    return o;
  };
  const nearYear = (y, ys) => { const n = ys.reduce((b, c) => Math.abs(c - y) < Math.abs(b - y) ? c : b, ys[0]); return Math.abs(n - y) <= 2 ? n : null; };
  const natOf = (j, a, b, deYear = y => y) => { const o = {}; const v = vals(j); const A0 = (v[a] || {})['00000'] || {}, B0 = (v[b] || {})['00000'] || {}; for (const [y, x] of Object.entries(A0)) { const dy = deYear(+y, Object.keys(B0).map(Number)); if (dy != null && B0[dy] > 0) o[y] = x / B0[dy]; } return o; };
  const backcast = (byK, natS, label) => {
    for (const k of kinds) {
      const ys = Object.keys(byK[k]).map(Number).sort((a, b) => a - b); if (!ys.length) continue;
      const y0 = ys[0], n0 = natS[y0] ?? natS[nearYear(y0, Object.keys(natS).map(Number))];
      if (!n0) continue;
      for (const [y, nv] of Object.entries(natS)) if (+y < y0) byK[k][y] = r4(Math.min(1, byK[k][y0] * nv / n0));
      (nat.kindEstBefore = nat.kindEstBefore || {})[label] = y0;
    }
    return byK;
  };
  const h = vals(load('muni-house'));
  if (h.H1310) nat.ownHome = backcast(ratioByKind(h.H1310, h.H3111), natOf(load('nat-house'), 'H1310', 'H3111'), 'ownHome');
  const hh = vals(load('muni-household'));
  // 災害の被害の割合に使う、市区町村ごとの人口と一般世帯数（国勢調査の年ごと）
  census.pop = Object.fromEntries(Object.entries(hh.A1101 || {}).filter(([c]) => kindOf[c]));
  census.hh = Object.fromEntries(Object.entries(hh.A710101 || {}).filter(([c]) => kindOf[c]));
  if (hh.A810103) {
    const fam = {};
    for (const [a, ys] of Object.entries(hh.A810103)) for (const [y, x] of Object.entries(ys)) if (hh.A810102[a] && hh.A810102[a][y] != null) (fam[a] = fam[a] || {})[y] = x + hh.A810102[a][y];
    const nh = vals(load('nat-household'));
    const natS = {};
    for (const [y, x] of Object.entries((nh.A810103 || {})['00000'] || {})) { const n2 = ((nh.A810102 || {})['00000'] || {})[y]; if (n2) natS[y] = x / (x + n2); }
    nat.threeGen = backcast(ratioByKind(hh.A810103, fam), natS, 'threeGen');
  }
  const nu = vals(load('muni-nursery'));
  if (nu.J2506 && hh.A1405) nat.nursery = backcast(ratioByKind(nu.J2506, hh.A1405, nearYear), (() => { const a = vals(load('nat-nursery')).J2506, b = vals(load('nat-household')).A1405; const o = {}; if (!a || !b) return o; const B = b['00000'] || {}; for (const [y, x] of Object.entries(a['00000'] || {})) { const dy = nearYear(+y, Object.keys(B).map(Number)); if (dy != null) o[y] = x / B[dy]; } return o; })(), 'nursery');
}

// 親の世代の最終学歴（中学・高校・短大高専・大学）：生まれ年ごとに、45〜59歳になった国勢調査の値を使う
{
  const pe = { m: {}, f: {} };
  const put = (j, cohort, sexKey, sexCodes, eduKey, eduMap, filt) => {
    if (!j) return;
    const t = { m: [0, 0, 0, 0], f: [0, 0, 0, 0] };
    for (const v of j.values) {
      if (filt && !filt(v)) continue;
      const sx = sexCodes[v['@' + sexKey]], e = eduMap[v['@' + eduKey]], x = num(v);
      if (!sx || e == null || x == null) continue;
      t[sx][e] += x;
    }
    for (const sx of ['m', 'f']) { const s = t[sx].reduce((a, b) => a + b, 0); if (s > 0) pe[sx][cohort] = t[sx].map(x => r4(x / s)); }
  };
  const e80 = load('edu-1980');
  put(e80, 1935, 'cat02', { '001': 'm', '002': 'f' }, 'cat04', { '002': 0, '003': 0, '004': 1, '005': 2, '006': 3 }, v => v['@cat03'] === '209');
  put(e80, 1925, 'cat02', { '001': 'm', '002': 'f' }, 'cat04', { '002': 0, '003': 0, '004': 1, '005': 2, '006': 3 }, v => v['@cat03'] === '211');
  put(load('edu-1990'), 1945, 'cat01', { '001': 'm', '002': 'f' }, 'cat03', { '002': 0, '003': 1, '004': 2, '005': 3 });
  put(load('edu-2000'), 1955, 'cat03', { '001': 'm', '002': 'f' }, 'cat05', { '002': 0, '003': 1, '004': 2, '005': 3 });
  put(load('edu-2010'), 1965, 'cat02', { '001': 'm', '002': 'f' }, 'cat04', { '002': 0, '003': 1, '004': 2, '005': 3 });
  put(load('edu-2020'), 1975, 'cat01', { '1': 'm', '2': 'f' }, 'cat03', { '11': 0, '12': 0, '13': 1, '14': 2, '15': 3, '16': 3 });
  if (Object.keys(pe.m).length) nat.parentEdu = pe;
}

// 生涯獲得賃金のもと：2020〜2023年の年齢・男女・学歴・正規か非正規か別の年収（きまって支給する現金給与額×12＋年間賞与）と、
// 1975年からの男女別の所定内給与額の動き（全国と都道府県）
const wage = {};
{
  const j = load('wage-profile');
  if (j) {
    const sexK = { '02': 'm', '03': 'f' }, regK = { '02': 'r', '03': 'n' };
    const eduK = { '01': 'all', '02': '中学', '03': '高校', '04': '専門', '05': '短大高専', '06': '大学', '07': '大学院' };
    const bandK = { '02': 15, '03': 20, '04': 25, '05': 30, '06': 35, '07': 40, '08': 45, '09': 50, '10': 55, '11': 60, '12': 65, '13': 70 };
    const t = {};
    for (const v of j.values) {
      const sx = sexK[v['@cat02']], rg = regK[v['@cat06']], ed = eduK[v['@cat04']], b = bandK[v['@cat03']], x = num(v);
      if (!sx || !rg || !ed || b == null || x == null) continue;
      const k = [sx, ed, rg, b].join('|');
      t[k] = t[k] || { m: [], bonus: [] };
      if (v['@tab'] === '40') t[k].m.push(x); else if (v['@tab'] === '44') t[k].bonus.push(x);
    }
    const avg = a => a.length ? a.reduce((p, q) => p + q, 0) / a.length : null;
    wage.profile = {};
    for (const [k, o] of Object.entries(t)) {
      const [sx, ed, rg, b] = k.split('|');
      const m = avg(o.m), bo = avg(o.bonus);
      if (m == null) continue;
      (((wage.profile[sx] = wage.profile[sx] || {})[ed] = wage.profile[sx][ed] || { r: {}, n: {} })[rg])[b] = Math.round(m * 12 + (bo || 0));
    }
    wage.baseYears = [...new Set(j.values.map(v => yearOf(v['@time'])))].sort();
  }
  const w = load('wage-pref');
  if (w && wage.profile) {
    const c = cube(w);
    const ser = (sx, a) => ({ ...get(c, sx === 'm' ? 'F620201' : 'F620202', a), ...get(c, sx === 'm' ? 'F620217' : 'F620218', a) });
    wage.idx = {};
    for (const sx of ['m', 'f']) {
      const n = ser(sx, A), base = wage.baseYears.map(y => n[y]).filter(Boolean);
      const b = base.reduce((p, q) => p + q, 0) / base.length;
      wage.idx[sx] = Object.fromEntries(Object.entries(n).map(([y, v]) => [y, r4(v / b)]));
    }
    for (const p of prefs) {
      const o = {};
      for (const sx of ['m', 'f']) o[sx] = ratio(ser(sx, p.code + '000'), ser(sx, A), 0, 0, 5);
      if (Object.keys(o.m).length) p.s.wage = o;
    }
  }
}

const out = { generated: new Date().toISOString(), tables: used, missing, nat, prefs, goods, names, wage, census };
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out));
const muniN = prefs.reduce((s, p) => s + p.munis.length, 0);
console.log('統計の形を整えました：都道府県 ' + prefs.length + '、市区町村 ' + muniN + '、全国の系列 ' + Object.keys(nat).join('・'));
if (missing.length) console.log('作れなかった・補った項目（' + missing.length + '件）\n' + missing.slice(0, 20).map(s => '・' + s).join('\n'));
