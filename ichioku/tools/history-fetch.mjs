// 1800〜1974年生まれのための昔の統計を取り込む（国立社会保障・人口問題研究所の人口統計資料集、Wikipedia の表、Our World in Data）
// 使い方：node tools/history-fetch.mjs            まだ取っていないものだけ取る
//         node tools/history-fetch.mjs --refresh  全部取り直す
// 取ったものは raw/history/ に置き、tools/history.mjs が data-src/stats/history.json にまとめる。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'raw', 'history');
const REFRESH = process.argv.includes('--refresh');
fs.mkdirSync(OUT, { recursive: true });

// 人口統計資料集（2025年版）の表。表の番号は https://www.ipss.go.jp/syoushika/tohkei/Popular/Popular2025.asp
export const IPSS_TABLES = [
  'T01-02', 'T01-06', 'T01-07', 'T02-05', 'T03-01', 'T04-01', 'T04-03', 'T04-23', 'T05-02', 'T05-13', 'T05-15', 'T05-22', 'T05-28',
  'T06-01', 'T06-02', 'T06-12', 'T06-23', 'T06-24', 'T07-04', 'T08-07', 'T09-09', 'T11-03', 'T12-02', 'T12-21', 'T12-27', 'T12-29'
];
const IPSS = t => `https://www.ipss.go.jp/syoushika/tohkei/Data/Popular2025/${t}.files/sheet001.htm`;
const WIKI = t => `https://ja.wikipedia.org/w/index.php?title=${encodeURIComponent(t)}&action=raw`;
export const WIKI_PAGES = ['江戸時代の日本の人口統計', '壬申戸籍'];
const OWID = [
  ['owid-life.csv', 'https://ourworldindata.org/grapher/life-expectancy.csv?country=JPN'],
  ['owid-u5.csv', 'https://ourworldindata.org/grapher/child-mortality.csv?country=JPN'],
  ['owid-gdp.csv', 'https://ourworldindata.org/grapher/gdp-per-capita-maddison-project-database.csv?country=JPN'],
  // 物価の上がり幅（Clio Infra、Zwart 2015）。昔の年の年収をその年のお金（両・円）に直すのに使う
  ['clio-inflation.xlsx', 'https://clio-infra.eu/data/Inflation_Broad.xlsx'],
  // 消費者物価指数の長期時系列（持家の帰属家賃を除く総合・全国・月次。1946年8月から）。e-Stat の公開ファイル
  ['cpi-1946.csv', 'https://www.e-stat.go.jp/stat-search/file-download?statInfId=000032103843&fileKind=1', b => new TextDecoder('shift_jis').decode(b)],
  // 日本銀行の戦前基準の企業物価指数（月次。1900年10月から）。1946年より前の物価に使う
  ['boj-prewar.json', 'https://www.stat-search.boj.or.jp/api/v1/getDataCode?format=json&lang=jp&db=PR01&code=PRCG_28Z0000000&startDate=190001&endDate=197012']
];

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(url) {
  let last;
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'ichioku-stats/1.0 (statistics research)' } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return Buffer.from(await r.arrayBuffer());
    } catch (e) { last = e; await sleep(2000 * Math.pow(2, i)); }
  }
  throw last;
}
async function save(name, url, decode) {
  const p = path.join(OUT, name);
  if (!REFRESH && fs.existsSync(p)) return 'skip';
  const b = await get(url);
  fs.writeFileSync(p, decode ? decode(b) : b);
  return 'ok';
}

const failed = [];
const jobs = [
  ...IPSS_TABLES.map(t => [t + '.htm', IPSS(t), b => new TextDecoder('shift_jis').decode(b)]),
  ...WIKI_PAGES.map(t => ['wiki-' + t + '.txt', WIKI(t)]),
  ...OWID
];
for (const [name, url, dec] of jobs) {
  try { console.log(name, await save(name, url, dec)); }
  catch (e) { failed.push(name + ' ' + e.message); console.log(name, '失敗', e.message); }
  await sleep(300);
}
if (failed.length) { console.log('取れなかったもの:\n' + failed.join('\n')); process.exitCode = 1; }
