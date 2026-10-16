// 1000〜1974年生まれのための束を作る：data-src/stats/history.json と data-src/history*.mjs → site/data/history.json
// 使い方：node tools/build-history.mjs（tools/build.mjs のあとに動かす。1975年の都道府県の出生数を common.json から使う）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROVINCES, STATUS, OUTCAST_SHARE, HISTORY_SOURCES, MED_CITIES, CITY_FROM } from '../data-src/history.mjs';
import { MED_STATUS, MED_STATUS_PROV, EZO_W, AINU_SHARE_EARLY, RYUKYU_W, RYUKYU_SHI_EARLY, MED_E0, MED_Q0, MED_U5, MED_NATPOP, MED_TIMELINE, MED_CONTEXT, MED_SCENES, MED_NAMES, MED_EVENTS } from '../data-src/history-medieval.mjs';
import { OLD_EVENTS, OLD_MOVES, MANCHURIA_1945 } from '../data-src/history-events.mjs';
import { OLD_TIMELINE, ERA_CONTEXT, ERAS } from '../data-src/history-timeline.mjs';
import { OLD_SCENES, OLD_NAMES } from '../data-src/history-scenes.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const S = JSON.parse(fs.readFileSync(path.join(ROOT, 'data-src', 'stats', 'history.json'), 'utf8'));
const C = JSON.parse(fs.readFileSync(path.join(ROOT, 'site', 'data', 'common.json'), 'utf8'));
const errors = [];
const est = []; // 推計で埋めたもの（画面と README に出す）

/* ---------- 数表の道具 ---------- */
const keysOf = s => Object.keys(s).map(Number).sort((a, b) => a - b);
function lin(series, y) {
  const ks = keysOf(series);
  if (!ks.length) return null;
  if (y <= ks[0]) return series[ks[0]];
  if (y >= ks[ks.length - 1]) return series[ks[ks.length - 1]];
  for (let i = 1; i < ks.length; i++) if (y <= ks[i]) {
    const a = ks[i - 1], b = ks[i], t = (y - a) / (b - a);
    return series[a] + (series[b] - series[a]) * t;
  }
  return null;
}
const r4 = x => +(+x).toPrecision(4);
const pad = c => String(c).padStart(2, '0');

/* ---------- 死亡の確率（1800〜1974年） ---------- */
// 平均寿命：1800〜1864年は宗門改帳などの村の研究（出生時の平均余命 30〜40年台。乳児死亡率200‰を仮定したものが多い）から 男35.8・女37.0年とした（推計）
// 1895年（1891-98年の改作生命表）以降は人口統計資料集。1975年は今の本体の値につなぐ
const BETA = C.mort.beta, BG = C.mort.bg;
const e0 = { m: { ...MED_E0.m, 1800: 35.8, 1864: 35.8 }, f: { ...MED_E0.f, 1800: 37.0, 1864: 37.0 } };
est.push('1799年以前の平均寿命（中世は人骨の研究、平安と江戸の前半はそこからつないだ目安）');
for (const sx of ['m', 'f']) for (const [y, v] of Object.entries(S.nat.e0[sx])) if (+y < 1975) e0[sx][y] = v;
est.push('1800〜1864年の平均寿命（村の研究の値の中ほど）と、1865〜1894年のつなぎ');
// 0歳で亡くなる確率：江戸時代は200‰（研究でよく仮定される値。村の推計は140〜300‰台）、1900年から人口統計資料集
const q0 = { ...MED_Q0, 1800: 0.2, 1872: 0.2 };
for (const [y, v] of Object.entries(S.nat.q0)) q0[y] = v;
// 5歳までに亡くなる割合：江戸の村は推計で33%（江戸の町の人骨の研究では36%）、1920年からは Our World in Data
const u5 = { ...MED_U5, 1800: 0.33, 1872: 0.33 };
for (const [y, v] of Object.entries(S.nat.u5)) if (+y >= 1920 && +y <= 1975 && +y % 5 === 0) u5[y] = v;
est.push('1919年以前の5歳までに亡くなる割合');
function e0Calc(alpha, q00, qc) {
  let l = 1, e = 0;
  for (let a = 0; a < 120; a++) {
    let q;
    if (a === 0) q = q00;
    else if (a < 5) q = Math.max(qc, 1 - Math.exp(-(alpha / BETA * (Math.exp(BETA * (a + 1)) - Math.exp(BETA * a)) + BG)));
    else q = 1 - Math.exp(-(alpha / BETA * (Math.exp(BETA * (a + 1)) - Math.exp(BETA * a)) + BG));
    const next = l * (1 - q);
    e += (l + next) / 2;
    l = next;
    if (l < 1e-7) break;
  }
  return e;
}
function solve(target, q00, qc) {
  let lo = Math.log(1e-8), hi = Math.log(5e-2);
  for (let i = 0; i < 90; i++) { const mid = (lo + hi) / 2; if (e0Calc(Math.exp(mid), q00, qc) > target) lo = mid; else hi = mid; }
  return Math.exp((lo + hi) / 2);
}
const mort = { beta: BETA, bg: BG, q0: {}, qc: {}, alpha: { m: {}, f: {} }, cityMul: 1.4, prefMul: {} };
for (let y = 1000; y <= 1975; y += 5) {
  const qq = lin(q0, y), uu = lin(u5, y);
  const qc = 1 - Math.pow((1 - uu) / (1 - qq), 1 / 4);
  mort.q0[y] = r4(qq); mort.qc[y] = r4(qc);
  for (const sx of ['m', 'f']) {
    const target = y === 1975 ? null : lin(e0[sx], y);
    // 1975年は今の本体の係数につなぐ
    mort.alpha[sx][y] = target == null ? r4(lin(C.mort.alpha[sx], 1975)) : r4(solve(target, qq, qc));
  }
}
// 都道府県の差：乳児死亡率の全国との比（1900・1920・1940・1960年）
const natIMR = {};
for (const y of [1900, 1920, 1940, 1960]) {
  let d = 0, b = 0;
  for (const p of Object.values(S.prefs)) if (p.births?.[y] && p.infantDeaths?.[y] != null) { d += p.infantDeaths[y]; b += p.births[y]; }
  natIMR[y] = d / b;
}
for (const [c, p] of Object.entries(S.prefs)) {
  const m = {};
  for (const y of [1900, 1920, 1940, 1960]) if (p.births?.[y] && p.infantDeaths?.[y] != null) m[y] = r4(Math.min(1.6, Math.max(0.6, p.infantDeaths[y] / p.births[y] / natIMR[y])));
  mort.prefMul[c] = m;
}

/* ---------- 生まれる場所 ---------- */
const provByName = Object.fromEntries(S.provinces.map(p => [p.name, p]));
const SURVEY_YEARS = [1721, 1750, 1756, 1786, 1792, 1798, 1804, 1822, 1828, 1834, 1840, 1846];
const sum1846 = S.provinces.filter(p => !PROVINCES.find(q => q.name === p.name)?.parent && p.pop[1846]).reduce((a, p) => a + p.pop[1846], 0);
const sum1873 = S.provinces.filter(p => !PROVINCES.find(q => q.name === p.name)?.parent && p.pop[1846]).reduce((a, p) => a + p.pop[1873], 0);
const prov = {};
for (const def of PROVINCES) {
  const sp = provByName[def.name];
  if (!sp) { errors.push('旧国の人口がない：' + def.name); continue; }
  const o = { kuni: (def.kuni || def.name) + (def.kuni === '蝦夷地' ? '' : '国'), region: def.region };
  if (def.parent) o.parent = def.parent;
  if (def.subs) o.subs = def.subs;
  if (def.city) o.city = CITY_FROM[def.city.name] ? { ...def.city, from: CITY_FROM[def.city.name] } : def.city;
  if (MED_CITIES[def.name]) o.medCity = MED_CITIES[def.name];
  if (def.one) o.one = true;
  if (def.prefs) o.prefs = Object.fromEntries(Object.entries(def.prefs).map(([k, v]) => [pad(k), v]));
  o.pop1873 = sp.pop[1873];
  // 1872年より前の重み（武士などを数えていない幕府の調査を、1873年の本籍人口との比で補う）
  if (!def.parent && def.name !== '蝦夷・松前') {
    const r = (sp.pop[1873] / sp.pop[1846]) / (sum1873 / sum1846);
    const w = {};
    for (const y of SURVEY_YEARS) if (sp.pop[y]) w[y] = Math.round(sp.pop[y] * r);
    w[1873] = sp.pop[1873];
    // 1000〜1600年は鬼頭宏の旧国別の推定人口（1000年は900年と1150年の間を直線でつないだ値）
    const mp = S.medProv && S.medProv[def.name];
    if (mp) { w[1000] = Math.round(mp[900] + (mp[1150] - mp[900]) * 0.4); w[1150] = mp[1150]; w[1600] = mp[1600]; }
    else errors.push('中世の旧国の人口がない：' + def.name);
    o.w = w;
  }
  // 身分の割合（1873年の族籍。平民は職業で百姓と町人に分ける）
  const stList = def.subs ? def.subs.map(n => provByName[n]?.status1873).filter(Boolean) : [sp.status1873].filter(Boolean);
  if (stList.length) {
    const t = k => stList.reduce((a, s) => a + (s[k] || 0), 0);
    const tj = k => stList.reduce((a, s) => a + (s.jobs[k] || 0), 0);
    const total = t('total');
    const jobs = tj('farm') + tj('craft') + tj('trade') + tj('misc') + tj('hired');
    const heimin = t('heimin') / total;
    const farmShare = jobs ? (tj('farm') + tj('misc') / 2) / jobs : 0.85;
    const outcast = OUTCAST_SHARE;
    o.status = {
      bushi: r4(t('shizoku') / total), priest: r4(t('priest') / total),
      hyakusho: r4((heimin - outcast) * farmShare), chonin: r4((heimin - outcast) * (1 - farmShare)), outcast
    };
  }
  prov[def.name] = o;
}
// 蝦夷地（和人とアイヌ）と琉球
const ezoW = {};
for (const y of [1804, 1822, 1839, 1854, 1873]) ezoW[y] = Math.round(lin(S.ezo.wajin, y) + lin(S.ezo.ainu, y));
ezoW[1798] = 28711 + S.ezo.ainu[1804];
Object.assign(ezoW, EZO_W);
est.push('1797年以前の北海道と沖縄の人口（記録がないため目安）');
prov['蝦夷・松前'].w = ezoW;
prov['蝦夷・松前'].status = { ...prov['渡島']?.status || { bushi: 0.06, priest: 0.01, hyakusho: 0.6, chonin: 0.33, outcast: 0 } };
const ainuShare = {};
Object.assign(ainuShare, AINU_SHARE_EARLY);
for (const y of keysOf(S.ezo.ainu)) ainuShare[y] = r4(S.ezo.ainu[y] / (S.ezo.ainu[y] + lin(S.ezo.wajin, y)));
const ryukyuPop = { ...S.ryukyu.pop, 1873: provByName['琉球']?.pop[1873] || 166789 };
prov['琉球'] = { kuni: '琉球王国', region: '琉球', prefs: { 47: 1 }, w: { ...RYUKYU_W, ...Object.fromEntries(Object.entries(ryukyuPop).filter(([y]) => +y >= 1772)) }, pop1873: ryukyuPop[1873], one: true };
const ryukyuShi = { ...RYUKYU_SHI_EARLY };
for (const y of keysOf(S.ryukyu.shi)) ryukyuShi[y] = r4(S.ryukyu.shi[y] / S.ryukyu.pop[y]);

// 1873年以降の都道府県の重み：1873年は旧国の人口を県に分けたもの、1900・1920・1940・1960年は出生数、1975年は今の本体の出生数
const prefW = {};
const add = (y, c, v) => { (prefW[y] = prefW[y] || {})[c] = (prefW[y][c] || 0) + v; };
for (const [n, o] of Object.entries(prov)) if (o.prefs && o.pop1873 && !o.subs) for (const [c, w] of Object.entries(o.prefs)) add(1873, c, o.pop1873 * w);
for (const y of [1900, 1920, 1940]) for (const [c, p] of Object.entries(S.prefs)) if (p.births?.[y]) add(y, c, p.births[y]);
for (const [c, p] of Object.entries(S.prefs)) { if (p.births?.[1960]) add(1960, c, p.births[1960]); }
// 1960年の沖縄はアメリカの統治下で全国の統計にないため、1975年の割合から補う
for (const p of C.prefs) { const b = lin(p.births, 1975); if (b) add(1975, p.code, b); }
if (!prefW[1960]['47'] && prefW[1975]['47']) { prefW[1960]['47'] = Math.round(prefW[1975]['47'] * 1.4); est.push('1960年の沖縄県の出生数（アメリカの統治下）'); }
for (const y of Object.keys(prefW)) for (const c of Object.keys(prefW[y])) prefW[y][c] = Math.round(prefW[y][c]);
// 町に住む人の割合（市部人口の割合。1873年は江戸時代の都市の人口の目安から10%とした推計）
const urban = { 1873: 0.1, ...S.nat.urban };
const urbanPref = Object.fromEntries(Object.entries(S.prefs).map(([c, p]) => [c, r4((p.urban1950 || 0.373) / 0.373)]));

/* ---------- 都道府県の人口（出来事の割合を出すため） ---------- */
function prefPop(code, y) {
  const p = S.prefs[code];
  const pop1873 = Object.entries(prov).reduce((a, [n, o]) => a + (o.prefs && !o.subs && o.pop1873 ? (o.prefs[code] || 0) * o.pop1873 : 0), 0);
  const s = { 1873: pop1873, ...(p?.pop || {}) };
  return lin(s, y);
}
function provPop(name, y) {
  const o = prov[name];
  if (o.w) return lin(o.w, y);
  return o.pop1873;
}
const natPopAt = y => lin({ ...MED_NATPOP, 1800: 30600000, 1846: 32297200, ...S.nat.pop, 1920: 55963000, 1940: 71933000, 1950: 84115000, 1960: 94302000, 1970: 104665000 }, y);

/* ---------- 出来事の割合 ---------- */
const eventsOut = [];
for (const e of [...MED_EVENTS, ...OLD_EVENTS]) {
  const ys = Array.isArray(e.y) ? e.y : [e.y, e.y];
  const o = { id: e.id, y: ys, m: e.m || null, title: e.title, kind: e.kind, where: e.where, who: e.who || null, text: e.text, deadText: e.deadText, src: e.src, note: e.note || '', est: !!e.est, cityWeight: e.cityWeight || 1, rates: {} };
  if (e.city) o.city = e.city;
  if (e.prefs) o.prefs = e.prefs;
  if (e.notProvs) o.notProvs = e.notProvs;
  for (let y = ys[0]; y <= ys[1]; y++) {
    const share = e.share ? (e.share[y] || 0) : 1 / (ys[1] - ys[0] + 1);
    const r = {};
    if (e.famine) {
      // 天保の飢饉：1834→1840年の人口の減り方から、ふだんの伸び（年0.3%）を差し引いて4年に分ける
      for (const [n, p] of Object.entries(prov)) {
        const src = provByName[n];
        if (!src || !src.pop[1834] || !src.pop[1840]) continue;
        const loss = 1 - (src.pop[1840] / src.pop[1834]) / Math.pow(1.003, 6);
        if (loss > 0.002) r[n] = r4(Math.min(0.08, loss) / (ys[1] - ys[0] + 1));
      }
    } else if (e.deaths) {
      for (const [k, d] of Object.entries(e.deaths)) {
        if (k === 'all') {
          let base = natPopAt(y);
          if (e.who?.status?.includes('bushi')) {
            // 士族・卒族の数（1873年）×16〜50歳の男の割合（およそ4分の1）。西南戦争は薩摩・大隅・日向の士族だけ
            const names = e.who.prefs ? ['薩摩', '大隅', '日向'] : S.provinces.map(p => p.name);
            base = names.reduce((a, n) => a + (provByName[n]?.status1873?.shizoku || 0), 0) * 0.25;
          }
          r.all = r4(d * share / base);
        } else if (k === '江戸') r[k] = r4(d * share / 1100000);
        else if (e.where === 'prov') r[k] = r4(d * share / provPop(k, y));
        else r[pad(k)] = r4(d * share / prefPop(pad(k), y));
      }
    } else if (e.rateProv) {
      for (const [k, v] of Object.entries(e.rateProv)) r[k] = typeof v === 'number' ? v : (v[y] || 0);
    } else if (e.rate != null) {
      r.all = typeof e.rate === 'number' ? e.rate : (e.rate[y] || 0);
    }
    for (const v of Object.values(r)) if (!(v >= 0 && v < 0.6)) errors.push('出来事の割合がおかしい：' + e.id + ' ' + y + ' ' + v);
    o.rates[y] = r;
  }
  eventsOut.push(o);
}

/* ---------- 学校・結婚・子ども・仕事の割合 ---------- */
// 小学校の就学率（学制百年史 資料編 第1表の学齢児童数と就学児童数から計算）
const elem = {
  m: { 1873: 0.399, 1877: 0.560, 1882: 0.646, 1887: 0.603, 1892: 0.717, 1897: 0.807, 1902: 0.958, 1907: 0.985, 1913: 0.988, 1920: 0.992 },
  f: { 1873: 0.151, 1877: 0.225, 1882: 0.310, 1887: 0.283, 1892: 0.365, 1897: 0.509, 1902: 0.870, 1907: 0.961, 1913: 0.975, 1920: 0.988 }
};
// 旧制中学（男）と高等女学校（女）に進んだ割合（同 第4表・第5表の生徒数を修業年数で割り、学齢児童数の6分の1で割った）
const mid = {
  m: { 1890: 0.0037, 1895: 0.0099, 1900: 0.0275, 1905: 0.036, 1910: 0.038, 1915: 0.0425, 1920: 0.0465, 1925: 0.075, 1930: 0.081, 1935: 0.071, 1940: 0.085, 1943: 0.135 },
  f: { 1895: 0.002, 1900: 0.0051, 1905: 0.0133, 1910: 0.021, 1915: 0.034, 1920: 0.047, 1925: 0.088, 1930: 0.099, 1935: 0.098, 1940: 0.125, 1943: 0.192 }
};
// 寺子屋に通った割合の目安（1877年の滋賀県で自分の名前を書けた人が男89%・女39%、鹿児島県や青森県は格段に低い。幕末の全体は男4〜5割・女1〜2割の目安）
const terakoya = { m: { city: 0.8, town: 0.7, village: 0.4, fish: 0.3 }, f: { city: 0.5, town: 0.4, village: 0.12, fish: 0.08 }, high: ['畿内', '近江'], low: ['薩摩', '大隅', '日向', '陸奥', '出羽'] };
// 高等小学校まで通った割合（統計を取り込めていない目安）と、旧制の上の学校に進んだ割合（中学・高女に進んだ人のうち）
const higherPrimary = { 1890: 0.08, 1900: 0.15, 1910: 0.3, 1920: 0.45, 1930: 0.6, 1940: 0.7 };
const higherOld = { m: 0.3, f: 0.1 };
est.push('寺子屋に通った割合、高等小学校まで通った割合、旧制の上の学校に進んだ割合（統計がないため目安）');
// 結婚：1899年からは平均初婚年齢。それより前は江戸時代の村の研究の目安（男25.5歳・女20.5歳）
const marriage = { m: { 1800: 25.5, 1898: 25.5, ...S.nat.firstMarriage.m }, f: { 1800: 20.5, 1898: 21.5, ...S.nat.firstMarriage.f } };
est.push('1898年以前の初婚年齢（村の研究の目安）');
const neverMarried = { m: { 1800: 0.02, ...S.nat.neverMarried.m }, f: { 1800: 0.018, ...S.nat.neverMarried.f } };
// 離婚：人口千人あたりの離婚率を、夫婦の数（人口千人あたり約170組の目安）で割って夫婦1組あたりにする。1899年以前は明治前半の高い離婚率の目安
const divorce = { 1800: 0.012, 1898: 0.012 };
for (const [y, v] of Object.entries(S.nat.divorce)) divorce[y] = r4(v * 1000 / 170);
est.push('1899年以前の離婚の起きやすさ');
// 子どもの数：妻の生まれ年別の出生児数（1890〜1976年生まれ）。それより前は1890〜1905年生まれと同じとした
const children = S.nat.children;
// 仕事：1873年は明治6年の職業別人口（農79%・工4%・商7%・雑業9%・雇人2%）、1920年からは産業3部門
const sectors = { 1873: [0.79, 0.08, 0.13], ...S.nat.sectors };
const hs = S.nat.highSchool, univ = S.nat.univ, jc = S.nat.juniorCollege;
// 1948〜1949年の高校進学率は1950年の値の目安
hs.m[1948] = 0.42; hs.f[1948] = 0.3;

/* ---------- その年のお金の価値（2025年を1とする物価の水準） ---------- */
// 1970年からは消費者物価指数（総合）、1947〜1969年は消費者物価指数の長期時系列（持家の帰属家賃を除く総合）、
// 1900〜1946年は日本銀行の戦前基準企業物価指数、1819〜1899年は Clio Infra の物価の上がり幅でさかのぼる。1819年より前は1819年と同じ（推計）
const price = {}, priceSrc = {};
{
  const cpi = C.nat.cpi, c25 = lin(cpi, 2025);
  for (let y = 2026; y >= 1970; y--) { price[y] = lin(cpi, y) / c25; priceSrc[y] = 'cpi'; }
  const cl = S.nat.cpiLong || {}, bj = S.nat.bojPrewar || {}, inf = S.nat.inflation || {};
  for (let y = 1969; y >= 1800; y--) {
    if (y >= 1947 && cl[y] && cl[1970]) { price[y] = price[1970] * cl[y] / cl[1970]; priceSrc[y] = 'cpiLong'; }
    else if (y >= 1901 && bj[y] && bj[y + 1] && price[y + 1]) { price[y] = price[y + 1] * bj[y] / bj[y + 1]; priceSrc[y] = 'boj'; }
    else if (y >= 1819) { price[y] = price[y + 1] / (1 + (inf[y + 1] || 0) / 100); priceSrc[y] = 'clio'; }
    else { price[y] = price[1819]; priceSrc[y] = 'clio'; }
  }
  for (const y of Object.keys(price)) price[y] = +price[y].toPrecision(5);
  est.push('1819年より前の物価（1819年と同じとした）と、その年のお金に直した年収');
}

/* ---------- 書き出し ---------- */
// 都道府県の名前（試験モードの束は3都道府県だけなので、昔の統計の表の名前から作る）
const prefNames = Object.fromEntries(Object.entries(S.prefs).map(([c, p]) => [c, c === '01' ? '北海道' : c === '13' ? '東京都' : c === '26' || c === '27' ? p.name + '府' : p.name + '県']));
for (const p of C.prefs) prefNames[p.code] = p.name;
// 江戸時代の場面の始まりの年を、その風習が広まった頃に合わせる（もとの表は1800年からとしていた）
const SCENE_FROM = [
  ['寺子屋', 1700], ['藩校', 1700], ['参勤交代', 1635], ['歌舞伎', 1680], ['町火消し', 1720], ['七五三', 1700], ['お伊勢参り', 1650], ['丁稚', 1650],
  ['漁場', 1700], ['王府に納める', 1609], ['村学校', 1800], ['科（試験）', 1760], ['村の外れ', 1600], ['皮なめし', 1600], ['ひどい言葉', 1000],
  ['檀家', 1640], ['村の子どもたちに字', 1700], ['年貢を納める季節', 1600], ['若者組', 1600], ['機織りや糸繰り', 1000], ['子守り', 1000], ['疱瘡', 1000],
  ['田植えや稲刈り', 1000], ['網を引く', 1000], ['女中奉公', 1650], ['前髪を落とし', 1600], ['神楽や屋台', 1600], ['半鐘', 1650], ['禄（給料）', 1650],
  ['盆と暮れの勘定', 1650], ['雑煮', 1400], ['お手玉', 1600], ['質に入れた', 1600], ['隠居', 1300], ['三線', 1600], ['シーミー', 1700], ['エイサー', 1600],
  ['イオマンテ', 1200], ['ユカラ', 1200], ['アットゥシ', 1200]
];
const scenesAll = OLD_SCENES.map(s0 => {
  const s = { ...s0 };
  const hit = SCENE_FROM.find(([k]) => s.t.includes(k));
  if (s.y && s.y[0] === 1800) s.y = [hit ? hit[1] : (s.y[1] <= 1879 ? 1650 : 1000), s.y[1]];
  else if (!s.y && hit) s.y = [hit[1], 2100];
  return s;
}).concat(MED_SCENES);
const erasAll = [...(S.medEras || []), ...ERAS];
if (!S.medEras) errors.push('元号の一覧（990〜1788年）がない');
const H = {
  generated: new Date().toISOString().slice(0, 10),
  range: [1000, 1974],
  medStatus: MED_STATUS, medStatusProv: MED_STATUS_PROV,
  sources: HISTORY_SOURCES, status: STATUS,
  eras: erasAll, eraContext: [...MED_CONTEXT, ...ERA_CONTEXT], timeline: [...MED_TIMELINE, ...OLD_TIMELINE], scenes: scenesAll, names: { ...OLD_NAMES, ...MED_NAMES },
  prov, prefW, urban, urbanPref, prefNames,
  ainuShare, ryukyuShi, mort,
  nat: { elem, mid, terakoya, higherPrimary, higherOld, hs, univ, jc, marriage, neverMarried, divorce, children, sectors, gdp: S.nat.gdp, causeRank: S.nat.causeRank, e0 },
  events: eventsOut, moves: OLD_MOVES, manchuria: MANCHURIA_1945, price, priceSrc,
  estimated: est
};
if (errors.length) { console.log('束を作れなかった：\n' + errors.join('\n')); process.exit(1); }
fs.writeFileSync(path.join(ROOT, 'site', 'data', 'history.json'), JSON.stringify(H));
console.log('site/data/history.json', Math.round(fs.statSync(path.join(ROOT, 'site', 'data', 'history.json')).size / 1024) + 'KB', '旧国', Object.keys(prov).length, '出来事', eventsOut.length);
