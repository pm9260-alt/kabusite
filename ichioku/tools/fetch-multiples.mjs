// 双子・三つ子などの多胎（複産）の統計を取り込み、data-src/multiples.json に書く
// 使い方：node tools/fetch-multiples.mjs（e-Stat のアプリケーションIDは環境変数 ICHIOKU_ESTAT_APPID。ファイルやログには書かない）
// 取るもの
//   1. 人口動態統計 上巻 4-36「単産－複産（複産の種類・出生－死産の組合せ）別にみた年次別分娩件数」
//      e-Stat の API（表 0003411624。1995・2000・2002〜2024年）と、年ごとの報告書の CSV（2001年版で1996〜1999・2001年、2025年版で2025年）
//   2. 人口動態統計 上巻 8-10「単産－複産・出産順位別にみた周産期死亡数及び率」（1995〜2025年。2015〜2024年は API の表 0003411825、ほかは年ごとの CSV）
//      1994年は 8-8 の CSV。1980〜1993年は報告書の画像の PDF しかないため、表の「総数」の行を目で写し取って下の PDF_1980_1993 に写した
//   3. 人口動態統計 保管統計表「病死による乳児（１歳未満）死亡数，単産－複産」（表 0003411934）と、上巻 4-27「性・単産－複産別出生数」（表 0003411616）。2015〜2024年
// 1979年以前の単産－複産の統計は e-Stat にない（データカタログの検索で1980年より前の表が見つからない）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'data-src', 'multiples.json');
const API = 'https://api.e-stat.go.jp/rest/3.0/app/json/';
const FILE = id => 'https://www.e-stat.go.jp/stat-search/file-download?statInfId=' + id + '&fileKind=1';
const APPID = (process.env.ICHIOKU_ESTAT_APPID || '').trim();
if (!APPID) { console.error('環境変数 ICHIOKU_ESTAT_APPID がありません'); process.exit(2); }

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(url, tries = 4) {
  let last;
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url); if (!r.ok) throw new Error('HTTP ' + r.status); return r; } catch (e) { last = e; await sleep(2000 * Math.pow(2, i)); }
  }
  throw new Error(String(last && last.message).replace(APPID, '***'));
}
const asArr = x => (x == null ? [] : Array.isArray(x) ? x : [x]);
const num = s => { s = String(s == null ? '' : s).replace(/[,\s"]/g, ''); return s === '-' || s === '' ? 0 : +s; };
async function statsData(id, params) {
  const q = new URLSearchParams({ appId: APPID, lang: 'J', statsDataId: id, metaGetFlg: 'Y', limit: '100000', ...(params || {}) });
  const j = await (await get(API + 'getStatsData?' + q)).json();
  const root = j.GET_STATS_DATA || {}, st = (root.RESULT || {}).STATUS;
  if (st !== 0 && st !== '0') throw new Error('e-Stat の応答：' + JSON.stringify((root.RESULT || {}).ERROR_MSG));
  const sd = root.STATISTICAL_DATA || {};
  const title = ((sd.TABLE_INF || {}).TITLE || {}).$ || (sd.TABLE_INF || {}).TITLE;
  return { title, values: asArr((sd.DATA_INF || {}).VALUE) };
}
async function csv(id) {
  const buf = Buffer.from(await (await get(FILE(id))).arrayBuffer());
  return new TextDecoder('shift_jis').decode(buf).split(/\r?\n/).map(l => l.split(','));
}
const yearOf = t => +String(t).slice(0, 4);

const deliveries = {}, perinatal = {}, infant = {};
const KIND = { '00100': 'total', '00110': 'single', '00120': 'multi', '00130': 'twin', '00140': 'triplet', '00150': 'quad', '00160': 'quint', '00170': 'sext', '00180': 'sept' };

// 1. 分娩件数（API）
{
  const t = await statsData('0003411624', { cdCat01: Object.keys(KIND).join(',') });
  for (const v of t.values) { const y = yearOf(v['@time']); (deliveries[y] = deliveries[y] || { src: 'estat:0003411624' })[KIND[v['@cat01']]] = num(v.$); }
  console.log('分娩件数（API）', Object.keys(deliveries).length, '年');
}
// 1. 分娩件数（年ごとの報告書の CSV。API にない年だけ）
const ROWS = { '総数': 'total', '単産': 'single', '複産': 'multi', '双子': 'twin', '三つ児': 'triplet', '四つ児': 'quad', '五つ児': 'quint', '六つ児': 'sext', '七つ児': 'sept' };
for (const [id, ed] of [['000002623904', 2001], ['000040503673', 2025]]) {
  const rows = await csv(id), head = rows.find(r => r.filter(c => /^\d{4}$/.test(c.trim())).length >= 3);
  const ys = head.map(c => (/^\d{4}$/.test(c.trim()) ? +c : null)), seen = {};
  for (const r of rows) {
    const k = ROWS[(r[0] || '').replace(/[\s　]/g, '')];
    if (!k || seen[k]) continue; // 下の「出生－死産の組合せ」の再掲は使わない
    seen[k] = 1;
    ys.forEach((y, i) => { if (y && !deliveries[y]) { (deliveries[y + '_csv'] = deliveries[y + '_csv'] || { src: 'file:' + id, edition: ed })[k] = num(r[i]); } });
  }
}
for (const k of Object.keys(deliveries)) if (k.endsWith('_csv')) { deliveries[k.slice(0, 4)] = deliveries[k]; delete deliveries[k]; }

// 2. 周産期死亡（1995年からは出産千対・妊娠満22週以後。1994年までは出生千対・妊娠満28週以後）
const PERI_FILES = { 1994: '000023597368', 1995: '000020292748', 1996: '000012915238', 1997: '000002613240', 1998: '000002612894', 1999: '000002627273', 2000: '000002625635', 2001: '000002623992', 2002: '000002622349', 2003: '000002620687', 2004: '000002619025', 2005: '000002615756', 2006: '000002613802', 2007: '000001266459', 2008: '000003071047', 2009: '000008185187', 2010: '000012423027', 2011: '000014887934', 2012: '000022220210', 2013: '000027231665', 2014: '000031288574', 2025: '000040502661' };
for (const [y, id] of Object.entries(PERI_FILES)) {
  const rows = await csv(id);
  let d = null, r = null, sec = 'd';
  const has = row => /\d/.test(row[1] || '');
  for (const row of rows) {
    const h = (row[0] || '').replace(/[\s　]/g, '');
    if (/死亡数$/.test(h)) sec = 'd';
    if (/死亡率$/.test(h)) sec = 'r';
    if (!has(row) || !(/死亡[数率]$/.test(h) || h === '総数')) continue;
    if (row.length >= 13 && h === '総数') { d = d || row.slice(1, 4).map(num); r = row.slice(10, 13).map(num); continue; } // 2025年版は1行に数と率が並ぶ
    if (sec === 'd' && !d) d = row.slice(1, 4).map(num);
    else if (sec === 'r' && !r) r = row.slice(1, 4).map(num);
  }
  if (!d || !r) throw new Error('周産期の表を取り出せない ' + y);
  perinatal[y] = { deaths: { total: d[0], single: d[1], multi: d[2] }, rate: { total: r[0], single: r[1], multi: r[2] }, def: +y >= 1995 ? '22週・出産千対' : '28週・出生千対', src: 'file:' + id };
  await sleep(300);
}
{
  const t = await statsData('0003411825', { cdCat03: '00100' });
  const CAT = { '00110': 'single', '00120': 'multi', '00100': 'total' };
  for (const v of t.values) {
    const y = yearOf(v['@time']), p = perinatal[y] = perinatal[y] || { deaths: {}, rate: {}, def: '22週・出産千対', src: 'estat:0003411825' };
    if (v['@cat02'] === '00100') p.deaths[CAT[v['@cat01']]] = num(v.$);
    if (v['@cat02'] === '00130') p.rate[CAT[v['@cat01']]] = num(v.$);
  }
}
// 1980〜1993年：報告書（上巻 表8.6〜8.8）の画像の PDF から、目で写し取った「総数」の行（周産期死亡数・周産期死亡率。率は単産－複産別の出生千対）
const PDF_1980_1993 = {
  1980: ['000031455947', 18385, 17177, 1208, 11.7, 11.0, 62.9],
  1981: ['000031455681', 16531, 15395, 1136, 10.8, 10.2, 59.8],
  1982: ['000031455054', 15303, 14210, 1093, 10.1, 9.5, 57.5],
  1983: ['000031395349', 14035, 13080, 955, 9.3, 8.8, 50.8],
  1984: ['000031376816', 12998, 12025, 973, 8.7, 8.2, 52.3],
  1985: ['000031376542', 11470, 10660, 810, 8.0, 7.5, 45.1],
  1986: ['000031321381', 10148, 9406, 742, 7.3, 6.9, 43.2],
  1987: ['000031321101', 9317, 8592, 725, 6.9, 6.5, 42.2],
  1988: ['000031320812', 8508, 7845, 663, 6.5, 6.0, 38.8],
  1989: ['000027436759', 7450, 6881, 569, 6.0, 5.6, 33.7],
  1990: ['000027399868', 7001, 6403, 598, 5.7, 5.3, 35.7],
  1991: ['000027397933', 6544, 5966, 578, 5.3, 4.9, 33.3],
  1992: ['000023599557', 6321, 5785, 536, 5.2, 4.9, 29.5],
  1993: ['000023597787', 5989, 5458, 531, 5.0, 4.7, 28.5]
};
// PDF の場所（statInfId）はデータカタログ（getDataCatalog、検索語「複産」、政府統計コード 00450011）の「上巻_8-6〜8-8_単産－複産…」の PDF
for (const [y, a] of Object.entries(PDF_1980_1993)) {
  perinatal[y] = { deaths: { total: a[1], single: a[2], multi: a[3] }, rate: { total: a[4], single: a[5], multi: a[6] }, def: '28週・出生千対', src: 'pdf:' + a[0], url: FILE(a[0]).replace('fileKind=1', 'fileKind=2'), read: '画像のPDFから目で写し取った' };
}
// 3. 病死による乳児死亡と出生数（単産－複産別。2015〜2024年）
{
  const d = await statsData('0003411934', { cdArea: '00000', cdCat01: '00100', cdCat02: '00100' });
  for (const v of d.values) { const y = yearOf(v['@time']); (infant[y] = infant[y] || {})[v['@cat03'] === '00120' ? 'deathsMulti' : v['@cat03'] === '00110' ? 'deathsSingle' : 'deaths'] = num(v.$); }
  const b = await statsData('0003411616', { cdTab: '10040', cdCat02: '00100', cdCat03: '00100' });
  for (const v of b.values) { const y = yearOf(v['@time']); (infant[y] = infant[y] || {})[v['@cat01'] === '00120' ? 'birthsMulti' : v['@cat01'] === '00110' ? 'birthsSingle' : 'births'] = num(v.$); }
}

const out = {
  _説明: '多胎（複産）の統計。tools/fetch-multiples.mjs で取り込み、tools/add-multiples.mjs で site/data/history.json と common.json に入れる。1979年以前の単産－複産の統計は e-Stat にない',
  fetched: new Date().toISOString().slice(0, 10),
  sources: {
    vitalMulti: { name: '人口動態統計（単産－複産（複産の種類）別にみた年次別分娩件数・上巻 表4-36）', org: '厚生労働省', url: 'https://www.e-stat.go.jp/dbview?sid=0003411624', tables: ['0003411624', 'file:000002623904（2001年版）', 'file:000040503673（2025年版）'] },
    vitalPeri: { name: '人口動態統計（単産－複産・出産順位別にみた周産期死亡数及び率・上巻 表8-6〜8-10）', org: '厚生労働省', url: 'https://www.e-stat.go.jp/dbview?sid=0003411825', tables: ['0003411825', '1980〜1993年は報告書のPDF', '1994〜2014・2025年は年ごとのCSV'] },
    vitalInfMulti: { name: '人口動態統計（病死による乳児死亡数・出生数，単産－複産別）', org: '厚生労働省', url: 'https://www.e-stat.go.jp/dbview?sid=0003411934', tables: ['0003411934', '0003411616'] },
    wpTwins: { name: 'Wikipedia「双生児」（日本の双生児の出生頻度は、かつては1/150から1/160の水準で安定していた）', org: 'ウィキペディア', url: 'https://ja.wikipedia.org/wiki/%E5%8F%8C%E7%94%9F%E5%85%90' },
    hellin: { name: 'ヘリンの法則（Hellin 1895。双子の割合を t とすると、三つ子 t²・四つ子 t³・五つ子 t⁴ の目安）', org: '' },
    wpQuint: { name: 'Wikipedia「多胎児」（1976年1月、鹿児島市立病院で日本で初めての五つ子が生まれた）', org: 'ウィキペディア', url: 'https://ja.wikipedia.org/wiki/%E5%A4%9A%E8%83%8E%E5%85%90' },
    wpChikusho: { name: 'Wikipedia「双生児」（多胎の出生率が低かった日本では、近世まで双子を忌む迷信が一部の地域にあった）', org: 'ウィキペディア', url: 'https://ja.wikipedia.org/wiki/%E5%8F%8C%E7%94%9F%E5%85%90' }
  },
  deliveries, perinatal, infant
};
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log('data-src/multiples.json：分娩件数', Object.keys(deliveries).length, '年・周産期', Object.keys(perinatal).length, '年・乳児死亡', Object.keys(infant).length, '年');
