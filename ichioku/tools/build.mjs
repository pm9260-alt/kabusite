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
import { events, extraTimeline } from '../data-src/events.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'site', 'data');
// 取り込んだ統計（tools/transform.mjs が作る）。ないときは data-src の仮の値だけで作る
const STATS_PATH = path.join(ROOT, 'data-src', 'stats', 'stats.json');
const stats = fs.existsSync(STATS_PATH) ? JSON.parse(fs.readFileSync(STATS_PATH, 'utf8')) : null;
// 試験モードで使う3都道府県
const TEST_PREFS = ['05', '13', '28'];
// まだ取り込みで置き換えていない全国の値（national.mjs の記憶にもとづく仮の値）。取り込みで置き換えたら外す
const NAT_PROVISIONAL = {
  nonreg: '25〜34歳の非正規の割合（労働力調査）', incomeMean: '世帯の平均所得（国民生活基礎調査）', incomeSigma: '所得の分布の広がり（国民生活基礎調査）',
  motherAge: '母の出産年齢（人口動態統計）', sibDist: 'きょうだいの人数（出生動向基本調査）', dualIncome: '共働きの割合（労働力調査）',
  ownHome: '持ち家の割合（国勢調査）', threeGen: '三世代の世帯の割合（国勢調査）', nursery: '保育所に通う割合', parentEdu: '親の世代の最終学歴（国勢調査）',
  everMarried: '50歳までに結婚する割合（国勢調査・将来推計）', divorce: '離婚の起きやすさ（人口動態統計）', leaveAtBirth: '出産で仕事をやめる割合（出生動向基本調査）',
  moveChild: '子どもの時期の引っ越し（住民基本台帳人口移動報告）', cause: '年齢層ごとの死因（人口動態統計）'
};
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
  mhlw: '公表資料',
  lgbt: '性的少数者の働き方・暮らしの調査',
  rebit: '10代〜30代の性的少数者の学校・暮らしの調査',
  partner: 'パートナーシップ制度のある自治体と人口カバー率',
  local: 'その土地の祭り・行事・制度',
  shogyo: '大型の小売店の数と売場面積'
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
// e0s：0歳の平均余命の系列、q0s：0歳で亡くなる確率の系列。diff は都道府県の差（数字か、年ごとの系列）
function alphaTable(e0s, q0s, diff) {
  const out = { m: {}, f: {} };
  for (const sex of ['m', 'f']) {
    for (const y of Object.keys(e0s[sex]).map(Number)) {
      const d = !diff ? 0 : typeof diff[sex] === 'number' ? diff[sex] : (Object.keys(diff[sex] || {}).length ? nearest(diff[sex], y) : 0);
      out[sex][y] = +solveAlpha(e0s[sex][y] + d, nearest(q0s, y)).toPrecision(6);
    }
  }
  return out;
}
const mulSeries = (s, m, cap) => Object.fromEntries(Object.entries(s).map(([k, v]) => [k, +Math.min(cap ?? 1, v * m).toFixed(4)]));

// 取り込んだ都道府県の束を、人生の進め方が使う形にする
function prefFromStats(sp) {
  const proto = prefs.find(p => p.code === sp.code);
  const flags = {};
  if (proto) for (const m of proto.munis) flags[m.code] = { snow: m.snow, coast: m.coast, car: m.car };
  return {
    code: sp.code, name: sp.name, region: sp.region, births: sp.births,
    munis: sp.munis.map(m => {
      const f = flags[m.code] || {};
      const o = { code: m.code, name: m.name, kind: m.kind, share: m.share, ind: m.ind, estBefore: Math.max(m.shareFrom || 0, m.realFrom || 0) };
      for (const k of ['snow', 'coast', 'car']) if (f[k]) o[k] = true;
      if (m.indEst) o.indEst = true;
      return o;
    }),
    s: { ...sp.s, ret: proto ? proto.ret : RET_PROVISIONAL },
    sEst: sp.est,
    e0diff: sp.e0diff,
    provisional: ['ret']
  };
}
// 県外に出た人が地元へ戻る割合は、まだ取り込みで置き換えていない（仮の値）
const RET_PROVISIONAL = { 1995: 0.4, 2010: 0.38, 2020: 0.36 };

export function build({ test = false } = {}) {
  fs.mkdirSync(path.join(OUT, 'pref'), { recursive: true });
  const shapeM = marryShape('m'), shapeF = marryShape('f');
  const N = stats ? stats.nat : {};
  // 全国の値：取り込んだものがあれば置き換える。寿命の将来（2027年以降）は将来推計がまだ取れないため仮の値のまま
  const natReal = {};
  for (const k of ['jobs', 'unemp', 'cpi', 'indNat', 'nonreg', 'incomeMean', 'motherAge', 'divorce', 'cause', 'ownHome', 'threeGen', 'nursery', 'parentEdu', 'deathPlace', 'causeDetail', 'lifeFeel', 'takeHome', 'saveRate', 'savingRatio']) if (N[k] && Object.keys(N[k]).length) natReal[k] = N[k];
  if (typeof N.incomeSigma === 'number') natReal.incomeSigma = N.incomeSigma;
  // 普及率：取り込んだ品目は置き換える。取り込んだ表が始まる年より前に仮の値がある品目は、その年だけ仮の値を残して一覧に出す
  const goodsOut = goods.map(g => {
    const real = stats && stats.goods && stats.goods[g.id];
    if (!real || !Object.keys(real).length) return g;
    const first = Math.min(...Object.keys(real).map(Number));
    const keep = Object.fromEntries(Object.entries(g.diff).filter(([y]) => +y < first));
    const o = { ...g, src: 'consumer', diff: { ...keep, ...real } };
    if (Object.keys(keep).length) o.provBefore = first;
    return o;
  });
  // 出来事：市区町村の名前を番号に直す。合わない名前があれば止める
  const muniIndex = {};
  for (const p of (stats ? stats.prefs : prefs)) for (const m of p.munis) muniIndex[p.code + '|' + m.name] = m.code;
  const badNames = [];
  const eventsOut = events.map(e => ({
    ...e,
    areas: (e.areas || []).map(a => {
      const codes = a.munis ? a.munis.map(n => { const c = muniIndex[a.pref + '|' + n]; if (!c) badNames.push(e.title + '：' + a.pref + ' ' + n); return c; }) : null;
      const { munis, ...rest } = a;
      return { ...rest, codes };
    })
  }));
  if (stats && badNames.length) throw new Error('出来事の市区町村の名前が統計の一覧と合わない（' + badNames.length + '件）：' + badNames.slice(0, 10).join('、'));
  // 被害の割合：data-src/stats/disasters.json の市区町村ごとの死者・行方不明者・全壊を、国勢調査の人口と一般世帯数で割る
  const DIS_PATH = path.join(ROOT, 'data-src', 'stats', 'disasters.json');
  const dis = fs.existsSync(DIS_PATH) ? JSON.parse(fs.readFileSync(DIS_PATH, 'utf8')) : {};
  const popOf = {}, hhOf = {};
  if (stats && stats.census) { Object.assign(popOf, stats.census.pop); Object.assign(hhOf, stats.census.hh); }
  // 資料の名前と今の市区町村名の違い（字の違い・改名・合併）
  const NAME_FIX = { '塩竃市': '塩竈市', '篠山市': '丹波篠山市', '鳩ヶ谷市': '川口市' };
  const wardsOf = {};
  for (const p of (stats ? stats.prefs : prefs)) for (const m of p.munis) { const w = /^(.+?市)(.+区)$/.exec(m.name); if (w) (wardsOf[p.code + '|' + w[1]] = wardsOf[p.code + '|' + w[1]] || []).push(m.code); }
  const near = (series, y) => { const ks = Object.keys(series || {}).map(Number); if (!ks.length) return null; const k = ks.reduce((b, c) => Math.abs(c - y) < Math.abs(b - y) ? c : b); return series[k]; };
  const disBad = [];
  for (const e of eventsOut) {
    const d = dis[e.id];
    if (!d) continue;
    // 市区町村の名前を番号に直す。区のある市の数字は、区に市全体の割合を使う（推計）
    const per = {}; // code -> {dead, missing, zenkai, est}
    const pdead = {};
    for (const [key, v] of Object.entries(d.munis)) {
      const [pc, raw] = key.split('|');
      let nm = NAME_FIX[raw] || raw;
      if (!muniIndex[pc + '|' + nm] && !wardsOf[pc + '|' + nm] && muniIndex[pc + '|' + nm.replace(/ヶ/g, 'ケ')]) nm = nm.replace(/ヶ/g, 'ケ');
      pdead[pc] = (pdead[pc] || 0) + (v.dead || 0) + (v.missing || 0);
      const code = muniIndex[pc + '|' + nm];
      const ws = wardsOf[pc + '|' + nm];
      if (code && per[code] && !per[code].est) { for (const k of ['dead', 'missing', 'zenkai']) if (v[k] != null) per[code][k] = (per[code][k] || 0) + v[k]; }
      else if (code) per[code] = { ...v, codes: [code] };
      else if (ws) for (const c of ws) per[c] = { ...v, codes: ws, est: true };
      else disBad.push(e.title + '：' + key);
    }
    for (const [key, v] of Object.entries(d.wards || {})) { const c = muniIndex[key]; if (c) per[c] = { ...per[c], ...v, codes: [c], est: false, zenkai: undefined }; else disBad.push(e.title + '：' + key); }
    const rate = (n, codes, tab) => { const den = codes.reduce((s, c) => s + (near(tab[c], d.census) || 0), 0); return den > 0 ? +Math.min(0.95, n / den).toFixed(5) : null; };
    e.byCode = {};
    const allCodes = new Set((e.areas || []).flatMap(a => a.rates ? (a.codes || []) : []));
    for (const c of allCodes) {
      const v = per[c];
      const o = {};
      if (!v) { o.dead = 0; o.house = 0; e.byCode[c] = o; continue; }
      const codes = v.codes;
      o.dead = rate((v.dead || 0) + (v.missing || 0), codes, popOf);
      if (v.zenkai != null) o.house = rate(v.zenkai, codes, hhOf);
      else {
        // 市区町村ごとの全壊がない資料：県の全壊を、県の中の死者の割合で分ける（推計）
        const pz = (d.prefZenkai || {})[c.slice(0, 2)];
        const pd = pdead[c.slice(0, 2)];
        if (pz && pz.zenkai != null && pd > 0) { o.house = rate(pz.zenkai * ((v.dead || 0) + (v.missing || 0)) / pd, codes, hhOf); o.houseEst = true; }
        else o.house = null;
      }
      if (v.est) o.est = true;
      e.byCode[c] = o;
    }
    e.disSources = d.sources;
    e.disNotes = d.notes;
  }
  if (stats && disBad.length) throw new Error('被害の資料の市区町村の名前が統計の一覧と合わない（' + disBad.length + '件）：' + disBad.slice(0, 15).join('、'));
  // 数字待ち：割合を使う地域なのに、資料がない（または全壊が出せない）出来事
  const pendingRates = eventsOut.filter(e => (e.areas || []).some(a => a.rates && Object.entries(a.rates).some(([k, v]) => v === null && !(e.byCode && (a.codes || []).every(c => e.byCode[c] && e.byCode[c][k] != null))))).map(e => e.title);
  const timelineOut = [...timeline.map(({ hit, ...r }) => r), ...extraTimeline].sort((a, b) => a.y - b.y);
  const namesOut = stats && stats.names && Object.keys(stats.names).length > 50 ? stats.names : names;
  const e0s = { m: { ...e0.m }, f: { ...e0.f } };
  if (N.e0) for (const sex of ['m', 'f']) {
    const last = Math.max(...Object.keys(N.e0[sex]).map(Number));
    for (const y of Object.keys(e0s[sex]).map(Number)) if (y <= last) delete e0s[sex][y];
    Object.assign(e0s[sex], N.e0[sex]);
  }
  const q0s = N.q0 && Object.keys(N.q0).length ? N.q0 : q0;
  const list = stats ? stats.prefs.filter(p => !test || TEST_PREFS.includes(p.code)).map(prefFromStats) : prefs;
  const provisional = [];
  for (const [k, label] of Object.entries(NAT_PROVISIONAL)) if (!natReal[k]) provisional.push(label);
  for (const k of ['jobs', 'unemp', 'cpi']) if (!natReal[k]) provisional.push('全国の' + { jobs: '有効求人倍率', unemp: '完全失業率', cpi: '消費者物価指数' }[k]);
  if (!N.e0) provisional.push('平均寿命（生命表）');
  provisional.push('2027年以降の平均寿命（将来推計人口。国立社会保障・人口問題研究所のサイトに通信の許可がない）');
  if (!stats) provisional.push('都道府県・市区町村のすべての値');
  else {
    provisional.push('県外に出た人が地元へ戻る割合（' + list.length + '都道府県）');
    provisional.push('雪・海沿いの印（試験用の3都道府県の12市区町村だけ。ほかの市区町村は未設定）');
    provisional.push('1995年より前に生まれた人の市区町村の割合（1995年の割合で代用。1975〜1994年は文字認識で取り出す予定）');
  }
  for (const g of goodsOut) {
    if (!(stats && stats.goods && stats.goods[g.id])) provisional.push(g.name + 'の普及率（通信利用動向調査。総務省のサイトに通信の許可がない）');
    else if (g.provBefore) provisional.push(g.name + 'の普及率（' + (g.provBefore - 1) + '年以前。取り込んだ表が' + g.provBefore + '年からのため）');
  }
  if (namesOut === names) provisional.push('名前の流行（取り込み前の値）');
  if (pendingRates.length) provisional.push('大きな災害の被害の割合（亡くなる・家を失う）：' + pendingRates.length + '件の出来事が数字待ち（' + pendingRates.join('、') + '）');
  const common = {
    meta: {
      provisional: provisional.length > 0,
      provisionalItems: provisional,
      note: provisional.length ? 'この束にはまだ仮の値が含まれます（' + provisional.length + '項目）。統計の取り込みが終わるまで公開できません。' : '',
      built: new Date().toISOString(),
      birthRange: [1800, 2000],
      futureFrom: 2027,
      mode: test ? 'test' : 'full',
      stats: stats ? { generated: stats.generated, tables: stats.tables.map(t => ({ name: t.name, table: t.table, updated: t.updated, fetched: t.fetched })), missing: stats.missing } : null
    },
    sources,
    prefs: list.map(p => ({ code: p.code, name: p.name, region: p.region, births: p.births })),
    nat: { ...nat, ...natReal, marryShape: { m: shapeM, f: shapeF }, marryShapeSum: { m: shapeM.reduce((a, b) => a + b, 0), f: shapeF.reduce((a, b) => a + b, 0) } },
    mort: { beta: BETA, bg: BG, q0: q0s, alpha: alphaTable(e0s, q0s, null) },
    timeline: timelineOut,
    events: eventsOut,
    wage: stats && stats.wage && stats.wage.profile ? stats.wage : null,
    goods: goodsOut,
    names: namesOut,
    hotline,
    scenes: scenes.map(s => ({ ...s, what: s.what || WHAT[s.src] || (sources[s.src] || {}).name || '' }))
  };
  fs.writeFileSync(path.join(OUT, 'common.json'), JSON.stringify(common));
  for (const p of list) {
    if (stats) {
      const bundle = { code: p.code, name: p.name, region: p.region, provisional: p.provisional.length > 0, provisionalItems: p.provisional, munis: p.munis, s: p.s, sEst: p.sEst, alpha: alphaTable(e0s, q0s, p.e0diff) };
      fs.writeFileSync(path.join(OUT, 'pref', p.code + '.json'), JSON.stringify(bundle));
      continue;
    }
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
      alpha: alphaTable(e0s, q0s, p.e0diff)
    };
    fs.writeFileSync(path.join(OUT, 'pref', p.code + '.json'), JSON.stringify(bundle));
  }
  // 前の束に残っている、今回作らなかった都道府県のファイルを消す（試験モードと本番の切り替えで混ざらないように）
  const keep = new Set(list.map(p => p.code + '.json'));
  for (const f of fs.readdirSync(path.join(OUT, 'pref'))) if (!keep.has(f)) fs.unlinkSync(path.join(OUT, 'pref', f));
  return { common, prefCount: list.length, muniCount: list.reduce((s, p) => s + p.munis.length, 0) };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const r = build({ test: process.argv.includes('--test') });
 console.log('データの束を作りました：都道府県 ' + r.prefCount + '、市区町村 ' + r.muniCount + '、場面 ' + r.common.scenes.length + '、年表 ' + r.common.timeline.length + '行');
}
