// 昔の統計（raw/history/）を data-src/stats/history.json にまとめる
// 先に node tools/history-fetch.mjs で取り込んでおく。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ipssRows, num } from './ipss-lite.mjs';
import { readSheets } from './xlsx-lite.mjs';
import { PROVINCES } from '../data-src/history.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW = path.join(ROOT, 'raw', 'history');
const OUT = path.join(ROOT, 'data-src', 'stats', 'history.json');
const T = t => ipssRows(path.join(RAW, t + '.htm'));
const missing = [];
const out = { generated: new Date().toISOString().slice(0, 10), nat: {}, provinces: [], prefs: {}, ezo: {}, ryukyu: {}, missing };
const yearOf = s => { const m = String(s).match(/(1[89]\d\d|20\d\d)/); return m ? +m[1] : null; };
const kanaStrip = s => s.replace(/[ァ-ヶー]+$/, '').trim();
const PREF_NAMES = ['北海道', '青森', '岩手', '宮城', '秋田', '山形', '福島', '茨城', '栃木', '群馬', '埼玉', '千葉', '東京', '神奈川', '新潟', '富山', '石川', '福井', '山梨', '長野', '岐阜', '静岡', '愛知', '三重', '滋賀', '京都', '大阪', '兵庫', '奈良', '和歌山', '鳥取', '島根', '岡山', '広島', '山口', '徳島', '香川', '愛媛', '高知', '福岡', '佐賀', '長崎', '熊本', '大分', '宮崎', '鹿児島', '沖縄'];
const prefCode = name => { const n = kanaStrip(name); let i = PREF_NAMES.indexOf(n); if (i < 0) i = PREF_NAMES.indexOf(n.replace(/[都府県]$/, '')); return i < 0 ? null : String(i + 1).padStart(2, '0'); };

function guard(name, fn) {
  try { fn(); } catch (e) { missing.push(name + '：' + e.message); console.log('取れなかった', name, e.message); }
}

/* ---------- 全国 ---------- */
guard('平均寿命（1891〜2023年）', () => {
  const e0 = { m: {}, f: {} };
  // 1891-98年・1935-36年など（表5-15 の期首年の平均寿命）
  let sex = null;
  for (const r of T('T05-15')) {
    if (/^男/.test(r[0])) sex = 'm';
    else if (/^女/.test(r[0])) sex = 'f';
    else if (sex && /^\d{4}/.test(r[0]) && num(r[1]) != null) {
      const p = r[0].split('～')[0];
      const ys = p.match(/\d{4}(-\d{2})?/)[0];
      const y = ys.includes('-') ? Math.round((+ys.slice(0, 4) + +(ys.slice(0, 2) + ys.slice(5))) / 2) : +ys;
      e0[sex][y] = num(r[1]);
    }
  }
  // 1921-25年から（表5-13 の0歳の平均余命）
  const rows = T('T05-13');
  const head = rows.find(r => r[0] === '年齢');
  const ys = head.slice(1).map(s => (s.match(/\d{4}/) || [])[0]).map(Number);
  const mid = { 1921: 1923, 1950: 1951 };
  let s2 = null;
  for (const r of rows) {
    if (r[1] === '男') s2 = 'm'; else if (r[1] === '女') s2 = 'f';
    else if (s2 && r[0] === '0') r.slice(1).forEach((v, i) => { if (ys[i] && num(v) != null) e0[s2][mid[ys[i]] || ys[i]] = num(v); });
  }
  if (Object.keys(e0.m).length < 8) throw new Error('行が足りない');
  out.nat.e0 = e0;
});
guard('乳児死亡率（1900年〜）', () => {
  const q0 = {};
  for (const r of T('T05-02')) { const y = num(r[0]); if (y && y < 1975 && num(r[6]) != null) q0[y] = num(r[6]) / 1000; }
  out.nat.q0 = q0;
});
guard('出生数・死亡数（1873年〜）', () => {
  const b = {};
  for (const r of T('T03-01')) { const y = num(r[0]); if (y && y < 1980) b[y] = { birth: num(r[4]), death: num(r[5]) }; }
  out.nat.vitalRate = b;
});
guard('妻の生まれ年別の子どもの数', () => {
  const c = {};
  for (const r of T('T04-23')) {
    const m = r[0].match(/^(\d{4})～(\d{4})/);
    if (!m) continue;
    const v = r.slice(3, 9).map(num);
    c[Math.round((+m[1] + +m[2]) / 2)] = { dist: v.slice(0, 5).map(x => x / 100), mean: v[5] };
  }
  out.nat.children = c;
});
guard('平均初婚年齢（1910年〜）', () => {
  const m = {}, f = {};
  for (const r of T('T06-12')) {
    for (const off of [0, 7]) {
      const y = num(r[off]);
      if (!y || y > 1975) continue;
      const fm = num(r[off + 4]), ff = num(r[off + 5]), am = num(r[off + 1]), af = num(r[off + 2]);
      // 初婚がない年（1899〜1905年）は全婚姻の平均から再婚の分を引いた形にそろえる（1910年の差で）
      if (fm != null) { m[y] = fm; f[y] = ff; }
      else if (am != null) { m[y] = +(am - 1.7).toFixed(1); f[y] = +(af - 1.0).toFixed(1); }
    }
  }
  out.nat.firstMarriage = { m, f };
});
guard('50歳時の未婚割合（1920年〜）', () => {
  const m = {}, f = {};
  for (const r of T('T06-23')) { const y = num(r[0]); if (y && y <= 1980) { m[y] = num(r[2]) / 100; f[y] = num(r[6]) / 100; } }
  out.nat.neverMarried = { m, f };
});
guard('離婚率（1900年〜）', () => {
  const d = {};
  for (const r of T('T06-02')) { const y = num(r[0]); const v = num(r[r.length - 1]); if (y && y <= 1975 && v != null) d[y] = v / 1000; }
  out.nat.divorce = d;
});
guard('産業3部門の割合（1920年〜）', () => {
  const s = {};
  for (const r of T('T08-07')) { const y = num(r[0]); if (y && y <= 1975) s[y] = [num(r[6]), num(r[7]), num(r[8])].map(x => x / 100); }
  out.nat.sectors = s;
});
guard('高校・短大・大学への進学率（1950年〜）', () => {
  const hs = { m: {}, f: {} }, jc = { m: {}, f: {} }, un = { m: {}, f: {} };
  for (const r of T('T11-03')) {
    const y = num(r[0]);
    if (!y || y > 1995) continue;
    const g = i => num(r[i]) == null ? null : num(r[i]) / 100;
    hs.m[y] = g(2); hs.f[y] = g(3);
    if (g(5) != null) { jc.m[y] = g(5); jc.f[y] = g(6); un.m[y] = g(8); un.f[y] = g(9); }
  }
  out.nat.highSchool = hs; out.nat.juniorCollege = jc; out.nat.univ = un;
});
guard('市部に住む人の割合（1920年〜）', () => {
  const u = {};
  for (const r of T('T09-09')) { const y = num(r[0]); if (y && y <= 1975) u[y] = num(r[4]) / 100; }
  out.nat.urban = u;
});
guard('平均世帯人員（1920年〜）', () => {
  const h = {};
  for (const r of T('T07-04')) { const y = num(r[0]); if (y && y <= 1975 && num(r[2]) != null) h[y] = num(r[2]); }
  out.nat.hhSize = h;
});
guard('死因の順位（1900年〜）', () => {
  const rows = T('T05-22'), res = {};
  let years = [];
  for (const r of rows) {
    if (r[0] === '順位') years = r.slice(1).map(yearOf);
    const m = r[0].match(/^第(\d)位/);
    if (m && years.length) for (let i = 0; i < 4; i++) { const y = years[i * 2]; if (y && y <= 1970 && r[1 + i * 2]) (res[y] = res[y] || [])[+m[1] - 1] = { name: r[1 + i * 2], rate: num(r[2 + i * 2]) }; }
  }
  out.nat.causeRank = res;
});
guard('全国の人口（1872〜1920年）', () => {
  const p = {};
  for (const r of T('T01-02')) { const y = num(r[0]); if (y) p[y] = num(r[2]) * 1000; }
  for (const r of T('T01-07')) for (let i = 0; i < 6; i += 2) { const y = yearOf(r[i]); if (y && num(r[i + 1])) p[y] = num(r[i + 1]) * 1000; }
  out.nat.pop = p;
});
guard('平均寿命（1865年〜、Our World in Data）と1人あたりの豊かさ（Maddison）', () => {
  const rd = (f, maxY) => {
    const o = {};
    for (const l of fs.readFileSync(path.join(RAW, f), 'utf8').split('\n')) {
      const c = l.split(',');
      if (c[0] === 'Japan' && +c[2] >= 1800 && +c[2] <= maxY) o[+c[2]] = +(+c[3]).toFixed(2);
    }
    return o;
  };
  out.nat.owidLife = rd('owid-life.csv', 1975);
  out.nat.u5 = Object.fromEntries(Object.entries(rd('owid-u5.csv', 1975)).map(([k, v]) => [k, +(v / 100).toFixed(4)]));
  out.nat.gdp = rd('owid-gdp.csv', 2022);
});

guard('物価の上がり幅（1819〜2010年、Clio Infra）', () => {
  const sh = readSheets(fs.readFileSync(path.join(RAW, 'clio-inflation.xlsx')));
  const long = sh.find(x => /Long/.test(x.name));
  const o = {};
  for (const r of long.rows) if (r[1] === 'Japan' && r[3] != null) o[+r[2]] = +(+r[3]).toFixed(2);
  if (Object.keys(o).length < 100) throw new Error('日本の行が少ない');
  out.nat.inflation = o;
});

guard('消費者物価指数の長期時系列（1946年8月〜、全国）', () => {
  const t = fs.readFileSync(path.join(RAW, 'cpi-1946.csv'), 'utf8');
  const by = {};
  for (const l of t.split(/\r?\n/)) {
    const p = l.split(',');
    if (/^\d{6}$/.test(p[0]) && p[1] && !isNaN(+p[1])) (by[+p[0].slice(0, 4)] = by[+p[0].slice(0, 4)] || []).push(+p[1]);
  }
  const o = {};
  for (const [y, v] of Object.entries(by)) if (+y <= 1975 && v.length >= 5) o[y] = +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(3);
  if (!o[1950] || !o[1970]) throw new Error('1950年か1970年の値がない');
  out.nat.cpiLong = o;
});

guard('日本銀行の戦前基準企業物価指数（1900年〜）', () => {
  const j = JSON.parse(fs.readFileSync(path.join(RAW, 'boj-prewar.json'), 'utf8'));
  const v = j.RESULTSET[0].VALUES, by = {};
  v.SURVEY_DATES.forEach((d, i) => { const x = v.VALUES[i]; if (x != null) (by[Math.floor(d / 100)] = by[Math.floor(d / 100)] || []).push(+x); });
  const o = {};
  for (const [y, a] of Object.entries(by)) if (a.length >= 3) o[y] = +(a.reduce((p, q) => p + q, 0) / a.length).toPrecision(5);
  if (!o[1934] || !o[1947]) throw new Error('1934年か1947年の値がない');
  out.nat.bojPrewar = o;
});

/* ---------- 都道府県 ---------- */
guard('都道府県の人口（1920年〜）', () => {
  const rows = T('T12-02');
  const head = rows.find(r => r[0] === '都道府県');
  const ys = head.map(yearOf);
  for (const r of rows) {
    const c = prefCode(r[0]);
    if (!c) continue;
    const o = out.prefs[c] = out.prefs[c] || { name: kanaStrip(r[0]) };
    o.pop = {};
    r.forEach((v, i) => { if (i && ys[i] && ys[i] <= 1975 && num(v) != null) o.pop[ys[i]] = num(v) * 1000; });
  }
});
for (const [t, key] of [['T12-27', 'births'], ['T12-29', 'infantDeaths']]) guard('都道府県の' + (key === 'births' ? '出生数' : '乳児死亡数'), () => {
  const rows = T(t);
  const head = rows.find(r => r[0] === '都道府県');
  const ys = head.map(yearOf);
  let done = false;
  for (const r of rows) {
    if (done) break;
    if (/^（２）/.test(r[0])) done = true;
    const c = prefCode(r[0]);
    if (!c) continue;
    const o = out.prefs[c] = out.prefs[c] || { name: kanaStrip(r[0]) };
    if (o[key]) continue;
    o[key] = {};
    r.forEach((v, i) => { if (i && ys[i] && ys[i] <= 1960 && num(v) != null) o[key][ys[i]] = num(v); });
  }
});

guard('都道府県の市部人口の割合（1950年）', () => {
  for (const r of T('T12-21')) {
    const c = prefCode(r[0]);
    if (c && num(r[4]) != null) (out.prefs[c] = out.prefs[c] || { name: kanaStrip(r[0]) }).urban1950 = num(r[4]) / 100;
  }
});

/* ---------- 旧国（Wikipedia「江戸時代の日本の人口統計」「壬申戸籍」） ---------- */
function wikiRows(file, from, to) {
  const t = fs.readFileSync(path.join(RAW, file), 'utf8').split('\n');
  const a = t.findIndex(l => l.includes(from));
  const res = [];
  for (let i = a; i < t.length && !(to && i > a && t[i].includes(to)); i++) {
    let l = t[i];
    // 注釈（ref）が次の行にまたがるときはつなげる
    while (/^\|align=left/.test(l) && (l.match(/<ref[^/>]*>/g) || []).length > (l.match(/<\/ref>/g) || []).length && i + 1 < t.length) l += ' ' + t[++i];
    if (!/^\|align=left/.test(l)) continue;
    const cleaned = l.replace(/<ref[^>]*\/>/g, '').replace(/<ref[^>]*>.*?<\/ref>/g, '');
    const cells = cleaned.split('||');
    const indent = (cells[0].match(/&nbsp;/g) || []).length;
    const name = cells[0].replace(/^\|align=left[^|]*\|/, '').replace(/&nbsp;/g, '').replace(/\[\[[^|\]]*\|([^\]]*)\]\]/g, '$1').replace(/\[\[|\]\]/g, '').trim();
    res.push({ indent, name, cells: cells.slice(1).map(c => c.replace(/style="[^"]*"\|/, '').trim()) });
  }
  return res;
}
guard('旧国別の人口（1721〜1873年）', () => {
  const rows = wikiRows('wiki-江戸時代の日本の人口統計.txt', '江戸時代の全国国別人口', '===地域別推定人口の変遷===');
  const YEARS = [1721, 1750, 1756, 1786, 1792, 1798, 1804, 1822, 1828, 1834, 1840, 1846, 1872, 1873];
  const byName = {};
  for (const r of rows) {
    if (r.indent === 0) continue;
    const pop = {};
    YEARS.forEach((y, i) => { const v = num(r.cells[i]); if (v != null) pop[y] = v; });
    const nm = r.name.replace(/^\|align=left style="white-space:nowrap"\|/, '');
    byName[r.indent >= 6 && nm === '陸奥' ? '陸奥（明治）' : nm] = pop;
  }
  const status = {};
  for (const r of wikiRows('wiki-壬申戸籍.txt', '地域・族籍・職業別人口表', '|}')) {
    const v = r.cells.map(num);
    // 皇族 華族 士族 卒族 地士 僧 旧神官 尼 平民 総計 入寄留 出寄留 異宗徒 現住 官員 神官 兵隊 従者 学者 漁業 医術 武術 算術 筆学 農 工 商 雑業 雇人 合計
    status[r.name] = {
      shizoku: (v[1] || 0) + (v[2] || 0) + (v[3] || 0) + (v[4] || 0), sotsu: v[3] || 0, priest: (v[5] || 0) + (v[6] || 0) + (v[7] || 0), heimin: v[8] || 0, total: v[9] || 0,
      jobs: { fish: v[19] || 0, farm: v[24] || 0, craft: v[25] || 0, trade: v[26] || 0, misc: v[27] || 0, hired: v[28] || 0 }
    };
  }
  for (const p of PROVINCES) {
    const src = byName[p.name];
    if (!src) { missing.push('旧国の人口：' + p.name); continue; }
    const st = status[p.statusKey || p.name] || null;
    out.provinces.push({ name: p.name, pop: src, status1873: st });
  }
  if (out.provinces.length < 60) throw new Error('旧国が' + out.provinces.length + 'しかない');
});
guard('蝦夷地のアイヌと和人の人口', () => {
  const rows = wikiRows('wiki-江戸時代の日本の人口統計.txt', '19世紀の蝦夷地・松前藩の和人・アイヌ人の人口変遷', '|}');
  const ainu = {}, wajin = {};
  for (const r of rows) {
    const y = yearOf(r.cells[0]);
    if (!y) continue;
    const w = num(r.cells[2]), a = num(r.cells[4]);
    if (w != null) wajin[y] = w;
    if (a != null) ainu[y] = a; // 北海道アイヌ（樺太を除く）
  }
  out.ezo = { ainu, wajin };
});
guard('琉球の人口と士の割合', () => {
  const t = fs.readFileSync(path.join(RAW, 'wiki-江戸時代の日本の人口統計.txt'), 'utf8').split('\n');
  const YEARS = [1677, 1684, 1706, 1772, 1800, 1826, 1852];
  const pop = {}, shi = {};
  for (const l of t) {
    if (/^\|align=left\|琉球国\|\|/.test(l)) l.split('||').slice(1).forEach((c, i) => { if (num(c) != null) pop[YEARS[i]] = num(c); });
    if (/按司・親方・士\|\|/.test(l)) {
      const c = l.split('||').slice(1).filter(x => x !== '');
      [1706, 1772, 1800, 1826, 1852].forEach((y, i) => { if (num(c[i]) != null) shi[y] = num(c[i]); });
    }
  }
  if (!pop[1800]) throw new Error('琉球国の行がない');
  out.ryukyu = { pop, shi };
});

fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log('書き出し', path.relative(ROOT, OUT), '旧国', out.provinces.length, '都道府県', Object.keys(out.prefs).length, '取れなかった', missing.length);
if (missing.length) console.log(missing.join('\n'));
