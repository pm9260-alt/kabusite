// 統計の取り込み（e-Stat の API と公開ファイル）
// 使い方：
//   node tools/fetch.mjs --survey   18章の確認。表を検索して、何年分あるかを logs/18-survey.txt にまとめる
//   node tools/fetch.mjs --test     試験モード（表ごとに少しだけ取る）
//   node tools/fetch.mjs            本番
//   node tools/fetch.mjs --refresh  取り込み済みの表も取り直す（統計が新しくなったとき）
// 途中で止まっても、次に動かすと続きから始める（logs/progress.json に進みを残す）。
// 失敗した統計は飛ばして先へ進み、最後に logs/skipped.txt に一覧を書く。
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW = path.join(ROOT, 'raw');
const LOGS = path.join(ROOT, 'logs');
const API = 'https://api.e-stat.go.jp/rest/3.0/app/json/';
const args = process.argv.slice(2);
const SURVEY = args.includes('--survey');
const TEST = args.includes('--test');
const REFRESH = args.includes('--refresh');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'sources.json'), 'utf8'));
fs.mkdirSync(RAW, { recursive: true });
fs.mkdirSync(LOGS, { recursive: true });

function appId() {
  if (process.env.ICHIOKU_ESTAT_APPID) return process.env.ICHIOKU_ESTAT_APPID.trim();
  const base = process.env.LOCALAPPDATA || path.join(os.homedir(), '.local', 'share');
  const p = path.join(base, 'ichioku-keys', 'estat-appid.txt');
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, 'utf8').replace(/^﻿/, '').trim();
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function getJSON(url, tries = +process.env.ICHIOKU_TRIES || 4) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } catch (e) { last = e; await sleep(2000 * Math.pow(2, i)); }
  }
  throw last;
}
const asArr = x => (x == null ? [] : Array.isArray(x) ? x : [x]);
const txt = x => (x == null ? '' : typeof x === 'object' ? (x.$ ?? '') : String(x));

const progressPath = path.join(LOGS, 'progress.json');
const progress = fs.existsSync(progressPath) ? JSON.parse(fs.readFileSync(progressPath, 'utf8')) : {};
const saveProgress = () => fs.writeFileSync(progressPath, JSON.stringify(progress, null, 1));
const skipped = [];

async function search(id, job) {
  const tables = [];
  for (const withCode of job.statsCode ? [true, false] : [false]) {
    let start = 1;
    for (let page = 0; page < 20; page++) {
      const q = new URLSearchParams({ appId: id, lang: 'J', searchWord: job.search, limit: '100', startPosition: String(start) });
      if (withCode) q.set('statsCode', job.statsCode);
      const j = await getJSON(API + 'getStatsList?' + q);
      const root = j.GET_STATS_LIST || {};
      const st = (root.RESULT || {}).STATUS;
      if (st !== 0 && st !== '0' && st !== 1 && st !== '1') throw new Error('e-Stat の応答：' + txt((root.RESULT || {}).ERROR_MSG));
      const list = asArr(((root.DATALIST_INF || {}).TABLE_INF));
      for (const t of list) tables.push({ id: t['@id'], stat: txt(t.STAT_NAME), title: txt(t.TITLE), survey: txt(t.SURVEY_DATE), open: txt(t.OPEN_DATE), area: txt(t.COLLECT_AREA), cycle: txt(t.CYCLE) });
      const next = ((root.DATALIST_INF || {}).NEXT_KEY);
      if (!next) break;
      start = +next;
    }
    if (tables.length) break;
  }
  return tables;
}

async function survey(id) {
  const lines = ['18章の確認（e-Stat の検索結果から）　' + new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }) + '（日本時間）', ''];
  for (const job of cfg.estat.filter(j => j.check18)) {
    try {
      const t = await search(id, job);
      fs.writeFileSync(path.join(RAW, job.id + '-candidates.json'), JSON.stringify(t, null, 1));
      const years = t.map(x => parseInt(String(x.survey).slice(0, 4), 10)).filter(y => y > 1900);
      const muni = t.filter(x => /市区町村|市町村/.test(x.title));
      const myears = muni.map(x => parseInt(String(x.survey).slice(0, 4), 10)).filter(y => y > 1900);
      lines.push('[' + job.check18 + '] ' + job.name);
      lines.push('    見つかった表：' + t.length + '件' + (years.length ? '（調査年 ' + Math.min(...years) + '〜' + Math.max(...years) + '）' : ''));
      lines.push('    うち市区町村の表：' + muni.length + '件' + (myears.length ? '（調査年 ' + [...new Set(myears)].sort().join('・') + '）' : ''));
      t.slice(0, 5).forEach(x => lines.push('    例：' + x.survey + '　' + x.title + '（' + x.id + '）'));
    } catch (e) {
      lines.push('[' + job.check18 + '] ' + job.name + '　…　確かめられなかった：' + e.message);
    }
    lines.push('');
  }
  for (const w of cfg.web.filter(j => j.check18)) {
    try {
      const r = await fetch(w.url);
      lines.push('[' + w.check18 + '] ' + w.name + '　…　ページ ' + (r.ok ? 'あり' : 'なし（HTTP ' + r.status + '）') + '　' + w.url);
    } catch (e) { lines.push('[' + w.check18 + '] ' + w.name + '　…　つながらない：' + e.message); }
  }
  const out = lines.join('\n');
  fs.writeFileSync(path.join(LOGS, '18-survey.txt'), '﻿' + out + '\n');
  console.log(out);
}

async function fetchTable(id, job, tableId) {
  const dir = path.join(RAW, job.id);
  fs.mkdirSync(dir, { recursive: true });
  let start = 1, part = 0;
  const key = job.id + '/' + tableId;
  if (progress[key] === 'done') return 'skip';
  if (progress[key] && progress[key].next) { start = progress[key].next; part = progress[key].part; }
  for (;;) {
    const q = new URLSearchParams({ appId: id, lang: 'J', statsDataId: tableId, startPosition: String(start), limit: TEST ? '1000' : '100000', metaGetFlg: part === 0 ? 'Y' : 'N' });
    const j = await getJSON(API + 'getStatsData?' + q);
    const root = j.GET_STATS_DATA || {};
    const st = (root.RESULT || {}).STATUS;
    if (st !== 0 && st !== '0' && st !== 1 && st !== '1') throw new Error('e-Stat の応答：' + txt((root.RESULT || {}).ERROR_MSG));
    fs.writeFileSync(path.join(dir, tableId + '-' + part + '.json'), JSON.stringify(root.STATISTICAL_DATA || {}));
    const next = ((root.STATISTICAL_DATA || {}).RESULT_INF || {}).NEXT_KEY;
    part++;
    if (!next || TEST) break;
    start = +next;
    progress[key] = { next: start, part };
    saveProgress();
  }
  progress[key] = 'done';
  saveProgress();
  return 'ok';
}

// 表番号と絞り込みの条件が決まっている表（sources.json の pull）。全ページをつないで1つのファイルにする
async function fetchPull(id, job) {
  const key = 'pull/' + job.id;
  const out = path.join(RAW, 'pull', job.id + '.json');
  if (!REFRESH && progress[key] === 'done' && fs.existsSync(out)) return 'skip';
  fs.mkdirSync(path.dirname(out), { recursive: true });
  let start = 1, classes = null, table = null;
  const values = [];
  for (let page = 0; page < 200; page++) {
    const q = new URLSearchParams({ appId: id, lang: 'J', statsDataId: job.statsDataId, startPosition: String(start), limit: '100000', metaGetFlg: page === 0 ? 'Y' : 'N', ...(job.params || {}) });
    const j = await getJSON(API + 'getStatsData?' + q);
    const root = j.GET_STATS_DATA || {};
    const st = (root.RESULT || {}).STATUS;
    if (st !== 0 && st !== '0') throw new Error('e-Stat の応答：' + txt((root.RESULT || {}).ERROR_MSG));
    const sd = root.STATISTICAL_DATA || {};
    if (page === 0) {
      table = { id: job.statsDataId, stat: txt((sd.TABLE_INF || {}).STAT_NAME), title: txt((sd.TABLE_INF || {}).TITLE), updated: txt((sd.TABLE_INF || {}).UPDATED_DATE) };
      classes = {};
      for (const o of asArr((sd.CLASS_INF || {}).CLASS_OBJ)) classes[o['@id']] = Object.fromEntries(asArr(o.CLASS).map(c => [c['@code'], c['@name']]));
    }
    for (const v of asArr((sd.DATA_INF || {}).VALUE)) values.push(v);
    const next = (sd.RESULT_INF || {}).NEXT_KEY;
    if (!next) break;
    start = +next;
  }
  if (!values.length) throw new Error('数字が1つも返ってこなかった（条件 ' + JSON.stringify(job.params || {}) + '）');
  fs.writeFileSync(out, JSON.stringify({ job: job.id, name: job.name, src: job.src, table, params: job.params || {}, fetched: new Date().toISOString(), classes, values }));
  progress[key] = 'done';
  saveProgress();
  return values.length;
}

// Excel で置かれている表（sources.json の files）。同じ題名のうち一番新しく更新されたものを取る
async function fetchFile(id, job) {
  const key = 'files/' + job.id;
  const out = path.join(RAW, 'files', job.id + '.xlsx');
  if (!REFRESH && progress[key] === 'done' && fs.existsSync(out)) return 'skip';
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const found = [];
  let start = 1;
  for (let page = 0; page < 20; page++) {
    const q = new URLSearchParams({ appId: id, lang: 'J', statsCode: job.statsCode, searchWord: job.search, limit: '100', startPosition: String(start) });
    const j = await getJSON(API + 'getDataCatalog?' + q);
    const root = j.GET_DATA_CATALOG || {};
    for (const c of asArr((root.DATA_CATALOG_LIST_INF || {}).DATA_CATALOG_INF)) for (const r of asArr((c.RESOURCES || {}).RESOURCE)) {
      const name = txt((r.TITLE || {}).NAME) || txt(r.TITLE);
      if (name === job.title && /XLS/i.test(txt(r.FORMAT))) found.push({ url: txt(r.URL), modified: txt(r.LAST_MODIFIED_DATE) });
    }
    const next = (root.DATA_CATALOG_LIST_INF || {}).NEXT_KEY;
    if (!next) break;
    start = +next;
  }
  if (!found.length) throw new Error('題名「' + job.title + '」のファイルが見つからない');
  found.sort((a, b) => b.modified.localeCompare(a.modified));
  const r = await fetch(found[0].url);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.readUInt32LE(0) !== 0x04034b50) throw new Error('Excel（.xlsx）ではないファイルが返ってきた');
  fs.writeFileSync(out, buf);
  fs.writeFileSync(out.replace(/\.xlsx$/, '.json'), JSON.stringify({ job: job.id, name: job.name, src: job.src, url: found[0].url, modified: found[0].modified, fetched: new Date().toISOString() }));
  progress[key] = 'done';
  saveProgress();
  return found[0].modified;
}

async function main() {
  const id = appId();
  if (!id) {
    console.error('e-Stat のアプリケーションIDが見つかりません。先に scripts\\setup-keys.ps1 を1回だけ動かしてください。');
    process.exit(2);
  }
  if (SURVEY) return survey(id);
  for (const job of cfg.pull || []) {
    try { const r = await fetchPull(id, job); console.log(job.name + '：' + (r === 'skip' ? '取り込み済み' : r + '個の数字を取り込んだ')); }
    catch (e) { skipped.push(job.name + '（表 ' + job.statsDataId + '）：' + e.message); }
  }
  for (const job of cfg.files || []) {
    try { const r = await fetchFile(id, job); console.log(job.name + '：' + (r === 'skip' ? '取り込み済み' : r + ' 更新のファイルを取り込んだ')); }
    catch (e) { skipped.push(job.name + '：' + e.message); }
  }
  for (const job of cfg.estat) {
    if (!job.tables.length) {
      try {
        const t = await search(id, job);
        fs.writeFileSync(path.join(RAW, job.id + '-candidates.json'), JSON.stringify(t, null, 1));
        skipped.push(job.name + '：使う表の番号がまだ決まっていない（候補 ' + t.length + '件を raw/' + job.id + '-candidates.json に書き出した）');
      } catch (e) { skipped.push(job.name + '：検索できなかった（' + e.message + '）'); }
      continue;
    }
    for (const tid of TEST ? job.tables.slice(0, 1) : job.tables) {
      try { const r = await fetchTable(id, job, tid); console.log(job.name + ' ' + tid + '：' + (r === 'skip' ? '取り込み済み' : '取り込んだ')); }
      catch (e) { skipped.push(job.name + ' ' + tid + '：' + e.message); }
    }
  }
  for (const w of cfg.web) {
    const key = 'web/' + w.id;
    if (!REFRESH && progress[key] === 'done' && fs.existsSync(path.join(RAW, 'web', w.id + '.html'))) continue;
    try {
      const r = await fetch(w.url);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      fs.mkdirSync(path.join(RAW, 'web'), { recursive: true });
      fs.writeFileSync(path.join(RAW, 'web', w.id + '.html'), Buffer.from(await r.arrayBuffer()));
      progress[key] = 'done'; saveProgress();
      console.log(w.name + '：ページを保存した');
    } catch (e) { skipped.push(w.name + '：取得できなかった（' + e.message + '）。理由を確かめて作る人に判断を仰ぐ'); }
  }
  const out = skipped.length ? '飛ばした工程（' + skipped.length + '件）\n' + skipped.map(s => '・' + s).join('\n') : '飛ばした工程はありません';
  fs.writeFileSync(path.join(LOGS, 'skipped.txt'), '﻿' + out + '\n');
  console.log(out);
}
main().catch(e => { console.error('取り込みが止まりました：' + e.message); process.exit(1); });
