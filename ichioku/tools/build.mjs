// データの束を作る：data-src（と取り込んだ統計）→ site/data/common.json, site/data/pref/XX.json
// 使い方：node tools/build.mjs [--test]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sources, nat, e0, q0, marryShape } from '../data-src/national.mjs';
import { prefs, natSchool } from '../data-src/prefs.mjs';
import { timeline } from '../data-src/timeline.mjs';
import { goods, names, hotline } from '../data-src/goods.mjs';
import { scenes } from '../data-src/scenes.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'site', 'data');
const BETA = 0.1, BG = 0.0003;

const WHAT = {
  timeuse: '年齢別の余暇活動・生活時間（行動者率）',
  census: '国勢調査の世帯・地域の集計',
  income: '国民生活基礎調査（世帯・健康の集計）',
  kanja: '年齢別の受療率',
  kansen: '感染症の発生の届出',
  gakkohoken: '年齢別の健康状態の調査',
  consumer: '主要耐久消費財の普及率',
  comm: '通信機器・インターネットの利用の状況',
  jma: '地点ごとの平年値（雪・気温）',
  bousai: '災害の被害の範囲',
  labor: '働き方・失業の状況',
  jobs: '有効求人倍率',
  school: '進学・在学の状況',
  vital: '出生・死亡・婚姻・離婚の数',
  migration: '市区町村・都道府県をまたぐ移動',
  fertility: '結婚・交際・子どもの数の調査',
  law: '法令の施行日',
  cpi: '物価の上がり幅',
  retail: '品目ごとの小売価格',
  sna: '景気の流れ',
  wage: '年齢・勤続年数別の賃金',
  mhlw: '公表資料'
};

// 0歳の平均余命 e を満たす係数 alpha を二分法で探す
function e0Of(alpha, q00) {
  let l = 1, e = 0;
  for (let a = 0; a < 120; a++) {
    let q;
    if (a === 0) q = q00;
    else { const h = alpha / BETA * (Math.exp(BETA * (a + 1)) - Math.exp(BETA * a)) + BG; q = 1 - Math.exp(-h); }
    const next = l * (1 - q);
    e += (l + next) / 2;
    l = next;
    if (l < 1e-7) break;
  }
  return e;
}
function nearest(series, y) {
  const ks = Object.keys(series).map(Number).sort((a, b) => a - b);
  let best = ks[0];
  for (const k of ks) if (Math.abs(k - y) < Math.abs(best - y)) best = k;
  return series[best];
}
function solveAlpha(target, q00) {
  let lo = Math.log(1e-8), hi = Math.log(1e-2);
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (e0Of(Math.exp(mid), q00) > target) lo = mid; else hi = mid;
  }
  return Math.exp((lo + hi) / 2);
}
function alphaTable(diff) {
  const out = { m: {}, f: {} };
  for (const sex of ['m', 'f']) {
    for (const y of Object.keys(e0[sex]).map(Number)) {
      out[sex][y] = +solveAlpha(e0[sex][y] + (diff ? diff[sex] : 0), nearest(q0, y)).toPrecision(6);
    }
  }
  return out;
}
const mulSeries = (s, m, cap) => Object.fromEntries(Object.entries(s).map(([k, v]) => [k, +Math.min(cap ?? 1, v * m).toFixed(4)]));

export function build({ test = false } = {}) {
  fs.mkdirSync(path.join(OUT, 'pref'), { recursive: true });
  const shapeM = marryShape('m'), shapeF = marryShape('f');
  const common = {
    meta: {
      provisional: true,
      note: 'この束の数字はすべて仮の値です。統計の取り込みが終わるまで公開できません。',
      built: new Date().toISOString(),
      birthRange: [1975, 2006],
      futureFrom: 2027,
      mode: test ? 'test' : 'full'
    },
    sources,
    prefs: prefs.map(p => ({ code: p.code, name: p.name, region: p.region, births: p.births })),
    nat: { ...nat, marryShape: { m: shapeM, f: shapeF }, marryShapeSum: { m: shapeM.reduce((a, b) => a + b, 0), f: shapeF.reduce((a, b) => a + b, 0) } },
    mort: { beta: BETA, bg: BG, q0, alpha: alphaTable(null) },
    timeline,
    goods,
    names,
    hotline,
    scenes: scenes.map(s => ({ ...s, what: s.what || WHAT[s.src] || (sources[s.src] || {}).name || '' }))
  };
  fs.writeFileSync(path.join(OUT, 'common.json'), JSON.stringify(common));
  for (const p of prefs) {
    const bundle = {
      code: p.code, name: p.name, region: p.region, provisional: true,
      munis: p.munis.map(m => ({ ...m, est: !!p.est })),
      s: {
        hs: mulSeries(natSchool.hs, p.mult.hs, 0.995),
        univ: mulSeries(natSchool.univ, p.mult.univ, 0.9),
        jc: mulSeries(natSchool.jc, p.mult.jc, 0.5),
        voc: mulSeries(natSchool.voc, p.mult.voc, 0.5),
        priv: p.priv, privHs: p.privHs, out: p.out, outJob: p.outJob, ret: p.ret,
        jobs: { 1975: p.mult.jobs }, income: { 1975: p.mult.income }
      },
      alpha: alphaTable(p.e0diff)
    };
    fs.writeFileSync(path.join(OUT, 'pref', p.code + '.json'), JSON.stringify(bundle));
  }
  return { common, prefCount: prefs.length };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const r = build({ test: process.argv.includes('--test') });
  console.log('データの束を作りました：都道府県 ' + r.prefCount + '、場面 ' + r.common.scenes.length + '、年表 ' + r.common.timeline.length + '行');
}
