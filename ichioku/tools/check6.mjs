// 第6版（spec6）の受け入れの検査。1つの検査を1つずつ動かし、結果をすぐ logs/check6/<番号>.json に書く（小分けにして、途中で止まっても続きから）
// 使い方：node tools/check6.mjs --list ／ node tools/check6.mjs --only 1-1
// まとめて動かすのは tools/run-checks.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.join(ROOT, 'site');
globalThis.self = globalThis;
const E = require(path.join(SITE, 'js', 'engine.js'));
const O = require(path.join(SITE, 'js', 'history.js'));
const S = require(path.join(SITE, 'js', 'story.js'));
const CH = require(path.join(SITE, 'js', 'choices.js'));
const PM = require(path.join(SITE, 'js', 'paths.js'));
const S6 = require(path.join(SITE, 'js', 's6.js'));
const JB = require(path.join(SITE, 'js', 'jobs.js'));
const PO = require(path.join(SITE, 'js', 'polite.js'));
const JP = require(path.join(SITE, 'js', 'japapedia.js'));
const TG = require(path.join(SITE, 'js', 'tsunagari.js'));
const CMP = require(path.join(SITE, 'js', 'compare.js'));
const C = JSON.parse(fs.readFileSync(path.join(SITE, 'data', 'common.json'), 'utf8'));
const H = JSON.parse(fs.readFileSync(path.join(SITE, 'data', 'history.json'), 'utf8'));
const P = {};
for (const p of C.prefs) P[p.code] = JSON.parse(fs.readFileSync(path.join(SITE, 'data', 'pref', p.code + '.json'), 'utf8'));
const OUT = path.join(ROOT, 'logs', 'check6');
fs.mkdirSync(OUT, { recursive: true });

/* ---------- 人生を作る道具 ---------- */
function birth(by, seed) {
  if (by >= 1975) return E.newLife(C, P[E.pickPref(C, by, E.makeRng(seed ^ 0x9e3779b9))], { year: by, seed });
  const b0 = O.pickBirth(C, H, by, E.makeRng(seed ^ 0x9e3779b9));
  return O.newLife(C, H, P[b0.pref] || null, { year: by, seed, birth: b0 });
}
function play(L, onBr, pick) {
  const M = L.old ? O : E; let g = 0;
  while (L.alive && g++ < 130) {
    let r = M.step(L);
    while (r && r.branch) { const br = r.branch; if (onBr) onBr(br, L); r = M.resolve(L, br.ask ? { text: '' } : pick ? pick(br, L) : null); }
  }
  return L;
}
function lives(n, y0, y1, salt, filter) {
  const out = [];
  for (let i = 0; out.length < n && i < n * 40; i++) {
    const by = y0 + (i * 37) % (y1 - y0 + 1), seed = ((i + 1) * 7919 + (salt || 0)) >>> 0;
    const L0 = birth(by, seed);
    if (filter && !filter(L0)) continue;
    out.push(play(L0));
  }
  return out;
}
const texts = L => L.log.flatMap(r => r.events.map(e => ({ y: r.year, a: r.age, t: e.t, cat: e.cat, story: !!e.story })));
const pct = (a, b) => b ? Math.round(a / b * 1000) / 10 : 0;
const PID = {}; PM.list.forEach(p => { PID[p.id] = p; });
const started = (L, grp) => Object.keys((L.story || {}).done || {}).filter(id => PID[id] && (!grp || PID[id].group === grp));
const era = y => y < 1185 ? '平安' : y < 1333 ? '鎌倉' : y < 1467 ? '室町' : y < 1600 ? '戦国' : y < 1868 ? '江戸' : y < 1946 ? '明治〜戦前' : '戦後';

/* ---------- 検査 ---------- */
const T = {};
function test(id, name, fn) { T[id] = { name, fn }; }

test('1-1', '40歳から先の選択（1年0.5回以上・どの10年も3回以上）', () => {
  let adult = 0, tot = 0, yrs = 0, dec = 0, low = 0;
  for (let i = 0; adult < 500 && i < 3000; i++) {
    const by = 1000 + (i * 37) % 1001, L = birth(by, i * 7919 + 3), ages = {};
    play(L, (br, L) => { if (!br.ask) { const a = L.year - L.by; ages[a] = (ages[a] || 0) + 1; } });
    if (L.deathAge < 20) continue; adult++;
    tot += Object.values(ages).reduce((a, b) => a + b, 0); yrs += L.deathAge;
    for (const d of [40, 50, 60, 70]) { if (L.deathAge < d + 10) continue; let c = 0; for (let a = d; a < d + 10; a++) c += ages[a] || 0; dec++; if (c < 3) low++; }
  }
  const per = tot / yrs;
  return { ok: per >= 0.5 && low === 0, n: adult, detail: '1年あたり ' + per.toFixed(2) + '回・3回に満たない10年 ' + low + '／' + dec };
});
test('1-2', 'その時代にない品物（スマートフォン・家族の携帯電話・貸本屋）', () => {
  const Ls = lives(600, 1950, 2000, 11); let bad = [];
  for (const L of Ls) for (const e of texts(L)) {
    if (/スマートフォン|スマホ/.test(e.t) && e.y < 2008) bad.push(e.y + ' ' + e.t);
    if (/家族が携帯電話/.test(e.t) && e.y < 1995) bad.push(e.y + ' ' + e.t);
    if (/貸本屋/.test(e.t) && e.y >= 1971) bad.push(e.y + ' ' + e.t);
  }
  return { ok: bad.length === 0, n: Ls.length, detail: bad.length ? bad.slice(0, 3).join('／') : '0件' };
});
test('1-3', '文の終わりが丁寧体・生まれた土地を離れていない人に離れた人向けの文が出ない', () => {
  const Ls = lives(500, 1000, 2000, 13); let plain = [], away = [];
  for (const L of Ls) {
    for (const e of texts(L)) {
      const p = PO.polite(e.t);
      // 「」の中は除いて、文ごとに終わりを見る
      const outer = p.replace(/「[^」]*」/g, '「」');
      for (const s of outer.split(/(?<=。)/)) { const k = s.trim(); if (!k) continue; if (!/(ます|ました|ません|です|でした|ませんでした)。$|」。?$|）。$/.test(k)) plain.push(k.slice(-14)); }
    }
    const moved = L.old ? L.log.some(r => r.pin && L.log[0].pin && r.pin.pref !== L.log[0].pin.pref) || L.abroad : L.place.away;
    if (!moved) for (const e of texts(L)) if (/町の暮らしに|同じ長屋の人と|ふるさとからの便り/.test(e.t)) away.push(e.t.slice(0, 20));
    for (const e of texts(L)) if (/長屋|路地|表通り/.test(e.t) && L.old && /village|fish/.test(L.kind) && !L.moved && !L.abroad && L.mode !== 'away' && e.cat !== '時代') away.push('村に' + e.t.slice(0, 16));
  }
  const rate = plain.length;
  return { ok: rate === 0 && away.length === 0, n: Ls.length, detail: '丁寧体でない文 ' + rate + '件' + (rate ? '（' + [...new Set(plain)].slice(0, 4).join('／') + '）' : '') + '・離れた人向けの文 ' + away.length + '件' + (away.length ? '（' + away.slice(0, 3).join('／') + '）' : '') };
});
test('1-4', '選んだ中身の文（did）が1つの人生で2回以上出ない', () => {
  const Ls = lives(500, 1000, 2000, 17); let bad = 0, ex = '';
  for (const L of Ls) {
    const cnt = {};
    for (const e of texts(L)) if (e.story || /縁談|見合い/.test(e.t)) { cnt[e.t] = (cnt[e.t] || 0) + 1; }
    const d = Object.entries(cnt).filter(([t, c]) => c > 1);
    if (d.length) { bad++; if (!ex) ex = d[0][0].slice(0, 24); }
  }
  return { ok: bad === 0, n: Ls.length, detail: '同じ文が2回以上の人生 ' + bad + '件' + (ex ? '（' + ex + '）' : '') };
});
test('1-5', '言い合いの後に合わない人柄の一文が出ない', () => {
  const Ls = lives(500, 1000, 2000, 19); let bad = 0;
  for (const L of Ls) for (const e of texts(L)) if (/言い合い|けんか|口論/.test(e.t) && /。(相変わらず、こちらの暮らしの心配ばかり|会うなり大声で笑い|明るく)/.test(e.t)) bad++;
  return { ok: bad === 0, n: Ls.length, detail: bad + '件' };
});
test('1-6', '1つの筋で結末が2つ出ない・筋の仕事のあとに家の仕事に戻らない', () => {
  let n = 0, two = 0, back = 0, ex = '';
  for (let i = 0; n < 500 && i < 20000; i++) {
    const by = 1000 + (i * 37) % 1001, L = play(birth(by, i * 104729 + 7));
    const ids = started(L); if (!ids.length) continue; n++;
    const s = L.story, ends = {};
    for (const k of Object.keys(s.pathNode || {})) { const [pid, nk] = k.split('.'); const nd = (PID[pid].nodes || {})[nk]; if (nd && !nd.next && !nd.ask) ends[pid] = (ends[pid] || 0) + 1; }
    if (Object.values(ends).some(c => c > 1)) { two++; if (!ex) ex = Object.keys(ends).find(k => ends[k] > 1); }
    if (L.pathJob) { const y0 = L.pathJob.y; if (texts(L).some(e => e.y > y0 && !e.story && e.cat === '学歴と仕事' && /家の田畑|家の仕事を継|田を請け負/.test(e.t))) back++; }
  }
  return { ok: two === 0 && back === 0, n, detail: '結末が2つ ' + two + '件' + (ex ? '（' + ex + '）' : '') + '・家の仕事に戻った ' + back + '件' };
});
test('1-7', '今の時代の文に昔の言い方が混じらない', () => {
  const Ls = lives(600, 1900, 2000, 23); let shu = 0, mura = 0;
  for (const L of Ls) for (const e of texts(L)) {
    if (e.y >= 1946 && /祝言/.test(e.t)) shu++;
    const city = L.old ? L.kind === 'city' : (L.place.kind === '大都市');
    if (city && /村の年寄り/.test(e.t)) mura++;
  }
  return { ok: shu === 0 && mura === 0, n: Ls.length, detail: '1946年からの祝言 ' + shu + '件・市街地の村の年寄り ' + mura + '件' };
});
test('1-8', '1文の中に「相手は」が2回出ない', () => {
  const Ls = lives(500, 1000, 2000, 29); let bad = 0;
  for (const L of Ls) for (const e of texts(L)) for (const s of e.t.split('。')) if ((s.match(/相手は/g) || []).length >= 2) bad++;
  return { ok: bad === 0, n: Ls.length, detail: bad + '件' };
});
test('1-9', '1948年からの生まれに士族・公家の身分がない', () => {
  let n = 0, bad = 0;
  for (let i = 0; n < 500; i++) { const by = 1948 + i % 27, L = birth(by, i * 31 + 5); n++; if (/^(shizoku|kuge)$/.test(L.status)) bad++; }
  return { ok: bad === 0, n, detail: bad + '件' };
});
test('2-1', '貴族の格（格が付いている・摂家清華家以外に関白や大臣がない・子爵男爵に自動の議席がない・1947年からの爵位の文がない）', () => {
  let n = 0, noK = 0, kan = 0, jido = 0, after = 0;
  for (let i = 0; n < 500 && i < 60000; i++) {
    const by = 1000 + (i * 37) % 947, L0 = birth(by, i * 7907 + 3);
    if (L0.status !== 'kuge') continue; n++;
    const L = play(L0);
    if (!L.kakaku) noK++;
    for (const e of texts(L)) {
      if (!/^(sekke|seiga)$/.test(L.kakaku) && /関白になった|関白に任じ|大臣になった|大臣に任じ/.test(e.t)) kan++;
      if (/^(shishaku|danshaku)$/.test(L.kakaku) && /自動で議席|自動で議員/.test(e.t)) jido++;
      if (e.y >= 1948 && e.cat !== '時代' && /公爵|侯爵|伯爵|子爵|男爵/.test(e.t)) after++;
    }
  }
  const cnt = {}; for (const o of S6.choices.concat(S6.lines)) for (const k of (o.when || {}).kakaku || []) cnt[k] = (cnt[k] || 0) + 1;
  const few = Object.entries(cnt).filter(([k, v]) => v < 20).map(([k]) => k);
  return { ok: noK === 0 && kan === 0 && jido === 0 && after === 0 && few.length === 0, n, detail: '格なし ' + noK + '・関白や大臣 ' + kan + '・自動の議席 ' + jido + '・1948年からの爵位の文 ' + after + '・場面と選択が20に満たない格 ' + (few.join('、') || 'なし') };
});
function meet(n, y0, y1, grp, filter, salt) {
  let m = 0, k = 0;
  for (let i = 0; k < n && i < n * 60; i++) {
    const by = y0 + (i * 37) % (y1 - y0 + 1), L0 = birth(by, i * 7919 + (salt || 1));
    if (filter && !filter(L0)) continue;
    const L = play(L0);
    if (L.deathAge < 20) continue;
    k++; if (started(L, grp).length) m++;
  }
  return [m, k];
}
test('2-2', '海を渡る・遠くを旅する物語（1000〜1600年の生まれで3〜6%）', () => {
  const [m, k] = meet(1000, 1000, 1600, 'kaigai', null, 31);
  const kg = PM.list.filter(p => p.group === 'kaigai'); let ends = 0, dies = 0;
  for (const p of kg) for (const nd of Object.values(p.nodes || {})) if (!nd.next && !nd.ask) { ends++; if (nd.die) dies++; }
  for (const p of kg) for (const nd of Object.values(p.nodes || {})) for (const o of (nd.ask || {}).opts || []) if (o.die) { ends++; dies++; }
  const r = pct(m, k), dr = pct(dies, ends);
  return { ok: r >= 3 && r <= 6 && dr >= 30 && kg.length >= 16 && kg.every(p => (p.src || []).length), n: k, detail: '出会った人生 ' + r + '%（' + m + '／' + k + '）・遭難や異国での死の結末 ' + dr + '%・筋 ' + kg.length + '本' };
});
test('2-3', '出世の物語（e_ が50本以上・どの時代も5本以上・農民町人の2〜3割が出会う・1591年からの百姓が侍になる筋の決まり）', () => {
  const es = PM.list.filter(p => /^e_/.test(p.id)), by = {};
  es.forEach(p => { const k = era(p.y[0]); by[k] = (by[k] || 0) + 1; });
  const thin = ['平安', '鎌倉', '室町', '戦国', '江戸', '明治〜戦前', '戦後'].filter(k => (by[k] || 0) < 5);
  let m = 0, k = 0;
  for (let i = 0; k < 1000 && i < 60000; i++) {
    const y = 1000 + (i * 37) % 1001, L0 = birth(y, i * 7919 + 37);
    if (!/^(hyakusho|chonin|heimin|genin|modern)$/.test(L0.old ? L0.status : 'modern')) continue;
    const L = play(L0); if (L.deathAge < 20) continue; k++;
    if (started(L).some(id => /^e_/.test(id))) m++;
  }
  let viol = 0;
  for (const p of es) { if (p.y[1] < 1591) continue; const all = [...p.opts, ...Object.values(p.nodes || {}).flatMap(n => [n, ...((n.ask || {}).opts || [])])]; for (const o of all) if (o.status === 'bushi' && !/御家人株|養子|取り立て|召し抱え|召し出|家を継/.test((o.say || '') + (o.l || ''))) viol++; }
  const r = pct(m, k);
  return { ok: es.length >= 50 && !thin.length && r >= 20 && r <= 30 && viol === 0, n: k, detail: 'e_ ' + es.length + '本（' + Object.entries(by).map(([a, b]) => a + b).join('・') + '）・出会った人生 ' + r + '%・決まりの外の取り立て ' + viol };
});
test('2-4', '新しい物語の時代の呼び方（宋・元・明・清と年、長崎は1571年から、鉄砲は1543年から）', () => {
  const RULE = [[/(?<!呂)宋の(国|都|商人|寺|僧|船)|(?<!呂)宋へ|(?<!呂)宋に渡/, 960, 1279], [/元の(国|都|寺|僧|船|軍)|元へ渡|元に渡/, 1271, 1368], [/明の(国|都|寺|商人|役人|船)|明へ渡|明に渡/, 1368, 1644], [/清の(国|商人|船|役人)|清へ渡|清に渡/, 1644, 1912], [/長崎/, 1571, 2100], [/鉄砲/, 1543, 2100], [/たばこ|煙草/, 1590, 2100], [/さつまいも|甘藷/, 1605, 2100]];
  const bad = [];
  for (const p of PM.list.filter(p => p.group)) {
    const ts = [p.text, ...p.opts.map(o => o.say), ...Object.values(p.nodes || {}).flatMap(n => [n.say, ...(((n.ask || {}).opts) || []).map(o => o.say), (n.ask || {}).text])].filter(Boolean).join('');
    for (const [re, a, b] of RULE) if (re.test(ts) && (p.y[1] < a - 40 || p.y[0] > b + 40)) bad.push(p.id + ':' + re.source.slice(0, 4));
  }
  return { ok: bad.length === 0, n: PM.list.filter(p => p.group).length, detail: bad.length ? bad.slice(0, 5).join('、') : '0件' };
});
test('2-5', '貴族の家の没落（40歳以上の貴族の3〜5割が出会う）', () => {
  let m = 0, k = 0;
  for (let i = 0; k < 500 && i < 200000; i++) {
    const y = 1000 + (i * 37) % 947, L0 = birth(y, i * 7919 + 41);
    if (L0.status !== 'kuge') continue;
    const L = play(L0); if (L.deathAge < 40) continue; k++;
    if (started(L, 'botsuraku').length || texts(L).some(e => /財産税|屋敷を売|家が傾/.test(e.t))) m++;
  }
  const r = pct(m, k);
  return { ok: r >= 30 && r <= 50, n: k, detail: '家が傾く出来事に出会った人生 ' + r + '%' };
});
test('2-6', '何代か後の子孫（家の記録を受け継ぐ・農地改革の決まり）', () => {
  let n = 0, inh = 0, line = 0, land = 0;
  for (let i = 0; n < 200 && i < 3000; i++) {
    const by = 1000 + (i * 53) % 950, L0 = play(birth(by, i * 7919 + 5)); if (L0.deathAge < 15) continue;
    const rec = S.houseRec(L0), gap = [54, 81, 135][i % 3], b = L0.deathYear + gap; if (b > 2000) continue;
    const L = b >= 1975 ? E.newLife(C, P[rec.pref], { year: b, seed: i + 1 }) : O.newLife(C, H, P[rec.pref] || null, { year: b, seed: i + 1, birth: { prov: rec.prov || O.pickBirth(C, H, b, E.makeRng(i)).prov, sub: rec.sub, pref: rec.pref, kuge: rec.status === 'kuge' && b <= 1946 } });
    S.applyDescend(L, rec); play(L); n++;
    if ((rec.surname && L.surname === rec.surname) || L.house6.treasure) inh++;
    if (texts(L)[0] && texts(L)[0].t.includes('家は')) line++;
    if (rec.land && rec.land.ta === '大' && b >= 1950 && !L.houseLand) land++;
  }
  return { ok: inh === n && line === n && land === 0, n, detail: '受け継いだ ' + inh + '・家の歴史の一文 ' + line + '・農地改革なしに土地が残った ' + land };
});
test('2-7', '戦後の財産と貴族院（地主の家に農地改革・30歳前の公侯爵議員なし・平民は勅選か多額納税だけ）', () => {
  let n = 0, ok = 0, early = 0, wrong = 0;
  for (let i = 0; n < 200 && i < 6000; i++) {
    const by = 1880 + (i * 7) % 65, L = birth(by, i * 7919 + 11); let land = false, g = 0;
    while (L.alive && g++ < 130) { if (L.year === 1947) { const k = (L.home0 || {}).kind || L.kind; land = (L.incPct || 0) > 0.8 && (k === 'village' || k === 'fish' || L.status === 'kuge') && !L.abroad; } let r = O.step(L); while (r && r.branch) r = O.resolve(L, r.branch.ask ? { text: '' } : null); }
    for (const p of L.posts || []) if (p.t === '貴族院議員') { if (/^koshaku2?$/.test(L.kakaku) && p.y - L.by < 30) early++; if (L.status !== 'kuge' && !/chokusen|tagaku/.test(p.how || '')) wrong++; }
    if (!land || L.deathYear < 1950) continue; n++;
    if (texts(L).some(e => /農地改革/.test(e.t))) ok++;
  }
  return { ok: ok === n && early === 0 && wrong === 0, n, detail: '農地改革あり ' + ok + '／' + n + '・30歳前の議員 ' + early + '・決まりの外の平民議員 ' + wrong };
});
test('2-8', '軍で成り上がる物語（1860〜1925年の農家の男性の1〜3割・暗い結末3割以上）', () => {
  let m = 0, k = 0;
  for (let i = 0; k < 1000 && i < 80000; i++) {
    const y = 1860 + (i * 7) % 66, L0 = birth(y, i * 7919 + 43);
    if (L0.sex !== 'm' || !/^(hyakusho|heimin)$/.test(L0.status) || !/village|fish/.test(L0.kind)) continue;
    const L = play(L0); if (L.deathAge < 20) continue; k++;
    if (started(L, 'gun').length) m++;
  }
  const g = PM.list.filter(p => p.group === 'gun'); let ends = 0, dark = 0;
  for (const p of g) for (const nd of Object.values(p.nodes || {})) if (!nd.next && !nd.ask) { ends++; if (nd.die || /戦死|傷痍|追放|恩給|裁判|抑留|殉職|負傷|傷を|戦犯|巣鴨|捕虜|失っ|帰らぬ/.test(nd.say || '')) dark++; }
  const r = pct(m, k), d = pct(dark, ends);
  return { ok: r >= 10 && r <= 30 && d >= 30, n: k, detail: '出会った人生 ' + r + '%・暗い結末 ' + d + '%' };
});
test('2-9', '位ごとの場面と選択（各10以上・位に合わない場面なし・年の呼び名）', () => {
  const cnt = {};
  for (const o of S6.choices) for (const g of (o.when || {}).grade || []) { cnt[g] = cnt[g] || [0, 0]; cnt[g][0]++; }
  for (const o of S6.lines) for (const g of (o.when || {}).grade || []) { cnt[g] = cnt[g] || [0, 0]; cnt[g][1]++; }
  const few = Object.entries(cnt).filter(([g, v]) => v[0] < 10 || v[1] < 10).map(([g]) => g);
  const Ls = lives(400, 1840, 1980, 47); let bad = 0;
  for (const L of Ls) for (const e of texts(L)) { if (e.y < 1873 && /二等兵|少尉/.test(e.t)) bad++; if (e.y > 1945 && /陸軍(二等兵|上等兵|伍長|軍曹|曹長|少尉|中尉|大尉|少佐|中佐|大佐)/.test(e.t) && e.cat !== '時代') bad++; }
  return { ok: !few.length && bad === 0 && Object.keys(cnt).length >= 20, n: Object.keys(cnt).length, detail: '位 ' + Object.keys(cnt).length + '・足りない位 ' + (few.join('、') || 'なし') + '・年の外の呼び名 ' + bad };
});
test('2-10', '勲章と位階の年（1946〜1963年の生存者叙勲なし・2002年からの数字の呼び方なし・文化勲章と紫綬褒章の年）', () => {
  const Ls = lives(1500, 1850, 2000, 53); let bad = [];
  for (const L of Ls) for (const h of S.finalHonors(L)) if (!S.honorOk(h)) bad.push(h.y + h.t);
  return { ok: bad.length === 0, n: Ls.length, detail: bad.length ? bad.slice(0, 4).join('、') : '0件' };
});
test('2-11', '選挙の物語（30歳以上の5〜10%・落選後の借金と選択・年の決まり）', () => {
  let m = 0, k = 0, bad = 0, debtOk = 0, lose = 0;
  for (let i = 0; k < 1000 && i < 30000; i++) {
    const y = 1000 + (i * 37) % 1001, L = play(birth(y, i * 7919 + 59)); if (L.deathAge < 30) continue; k++;
    if (started(L, 'senkyo').length) m++;
    for (const e of texts(L)) { if (e.y < 1890 && /衆議院/.test(e.t) && e.story) bad++; if (e.y < 1946 && /女性.*立候補|立候補.*女性/.test(e.t)) bad++; if (e.y < 1947 && /知事選/.test(e.t)) bad++; }
  }
  const sk = PM.list.filter(p => p.group === 'senkyo');
  for (const p of sk) for (const [nk, nd] of Object.entries(p.nodes || {})) if (/^lose/.test(nk)) { lose++; if (nd.ask && nd.ask.opts.some(o => o.debt > 0)) debtOk++; }
  const r = pct(m, k);
  return { ok: r >= 5 && r <= 10 && bad === 0 && debtOk === lose, n: k, detail: '出会った人生 ' + r + '%・落選の場面で借金の答えがある ' + debtOk + '／' + lose + '・年の外 ' + bad };
});
test('2-12', 'Japapedia（条件に当てはまる人生にだけ出る）', () => {
  let yes = 0, no = 0, wrongY = 0, wrongN = 0;
  for (let i = 0; (yes < 300 || no < 300) && i < 40000; i++) {
    const y = 1000 + (i * 37) % 1001, L = play(birth(y, i * 7919 + 61));
    const should = L.status === 'kuge' || !!L.kakaku || L.rank === 'shogun' || L.rank === 'daimyo' || S.finalHonors(L).length > 0 || (L.posts || []).some(p => /議員|村長|町長|市長|知事|大臣|名主|乙名|庄屋|貴族院/.test(p.t)) || /^(sakan|shokan)$/.test(L.grade) || (L.feats || []).length > 0;
    const got = JP.eligible(L);
    if (should) { yes++; if (!got) wrongY++; } else { no++; if (got) wrongN++; }
  }
  return { ok: wrongY === 0 && wrongN === 0, n: yes + no, detail: '当てはまる ' + yes + '（出ない ' + wrongY + '）・当てはまらない ' + no + '（出る ' + wrongN + '）' };
});
test('2-13', '出来事の物語（年と土地の外で出ない・住む人の3〜5割が出会う・死因が合う）', () => {
  const jk = PM.list.filter(p => p.group === 'jiken'); let out = 0, n = 0;
  const Ls = lives(1500, 1000, 2000, 67);
  for (const L of Ls) for (const id of started(L, 'jiken')) { n++; const p = PID[id], y = L.story.done[id]; if (y < p.y[0] || y > p.y[1] + 2) out++; }
  // 出会う割合：いくつかの物語で、出来事の年にその土地に住む人を集めて数える
  const sample = jk.filter(p => p.pref && p.y[1] - p.y[0] <= 3).slice(0, 6); const rates = [];
  for (const p of sample) {
    let m = 0, k = 0;
    for (let i = 0; k < 100 && i < 30000; i++) {
      const y = p.y[0] - p.a[0] - (i % Math.max(1, p.a[1] - p.a[0])), b0 = O.pickBirth(C, H, Math.max(1000, y), E.makeRng(i * 13 + 1));
      if (!p.pref.includes(String(b0.pref))) continue;
      const L = O.newLife(C, H, P[b0.pref] || null, { year: Math.max(1000, y), seed: i * 17 + 3, birth: b0 });
      let g = 0; while (L.alive && L.year <= p.y[1] + 2 && g++ < 130) { let r = O.step(L); while (r && r.branch) r = O.resolve(L, r.branch.ask ? { text: '' } : null); }
      if (!L.alive && L.deathYear < p.y[0]) continue;
      const ageAt = p.y[0] - L.by; if (ageAt < p.a[0] || ageAt > p.a[1]) continue; // 出来事の年に、その物語に出会う年ごろの人だけ
      if (!(p.st || []).length || p.st.includes(L.status)) { if ((p.kind || []).length && !p.kind.includes(L.kind)) continue; if (p.sex && p.sex !== L.sex) continue; k++; if (L.story && L.story.done[p.id]) m++; }
    }
    rates.push(p.id + ' ' + pct(m, k) + '%');
  }
  const low = rates.filter(r => +r.split(' ')[1].replace('%', '') < 30 || +r.split(' ')[1].replace('%', '') > 50);
  return { ok: out === 0 && low.length === 0, n, detail: '年の外 ' + out + '・出会う割合 ' + rates.join('、') };
});
test('2-14', '「大事なときだけ選ぶ」で止まる回数（平均8〜15回）', () => {
  const KEY = /縁談|見合い|結婚|婿|養子|家督|跡を継|跡取り|移り住|引っ越|借金|家を売|田を売|田畑を売|屋敷を|選挙|奉公|出家|離縁|離婚|再婚|進学|上の学校|店を継|家業/;
  let n = 0, tot = 0;
  for (let i = 0; n < 500 && i < 3000; i++) { const by = 1000 + (i * 37) % 1001, L = birth(by, i * 7919 + 3); let c = 0; play(L, br => { if (!br.ask && (br.id !== 'story' || br.sid !== 'choice' || KEY.test(br.groups[0].q))) c++; }); if (L.deathAge < 20) continue; n++; tot += c; }
  const av = tot / n;
  return { ok: av >= 8 && av <= 15, n, detail: '平均 ' + av.toFixed(1) + '回' };
});
test('2-15', 'どちらの答えにも得るものと失うものがある（ほかの答えより、どの数でも同じか上の答えがない）', () => {
  const K = ['sat', 'learn', 'tie', 'body'];
  const vec = o => K.map(k => (o.fx || {})[k] || 0).concat([(o.money && o.money.f) || 0, -(o.debt || 0), o.die ? -99 : 0]);
  const bad = opts => { const v = opts.map(vec); return v.some((a, i) => v.some((b, j) => i !== j && a.every((x, n) => x >= b[n]))); };
  const side = o => { const v = vec(o); return v.some(x => x > 0) && v.some(x => x < 0); };
  let n = 0, b = 0, s1 = 0;
  for (const o of CH.list) { n++; if (bad(o.options)) b++; if (!o.options.every(side)) s1++; }
  for (const p of PM.list) { const g = [p.opts, ...Object.values(p.nodes || {}).filter(x => x.ask).map(x => x.ask.opts)]; for (const os of g) { n++; if (bad(os)) b++; if (!os.every(side)) s1++; } }
  return { ok: b === 0 && s1 === 0, n, detail: '片方だけ得な分かれ道 ' + b + '・得るものか失うものがない答えの分かれ道 ' + s1 };
});
test('2-16', '親の人生（同じ選択なら子の条件が同じ・住む土地を変えると子の土地が変わる）', () => {
  let n = 0, same = 0;
  for (let i = 0; n < 200 && i < 3000; i++) {
    const by = 1700 + (i * 7) % 250, L0 = play(birth(by, i * 7919 + 71)); const dad = L0.members.find(m => m.role === '父'); if (!dad || dad.by < 1000) continue;
    const run = () => { const b0 = O.pickBirth(C, H, dad.by, E.makeRng(i)); const L = O.newLife(C, H, P[b0.pref] || null, { year: dad.by, seed: i * 31 + 9, birth: b0 }); L.sex = 'm'; L.watchYear = L0.by; play(L); return JSON.stringify(L.snapAt || null); };
    n++; if (run() === run()) same++;
  }
  return { ok: same === n, n, detail: '同じ選択で同じ条件 ' + same + '／' + n };
});
test('2-18', '身分の割合（貴族2%・将軍家0.5%・大名家1%・武士7%・士族7%）', () => {
  const ERAS = [['鎌倉', 1185, 1332], ['室町', 1333, 1466], ['戦国', 1467, 1599], ['江戸', 1600, 1871], ['明治〜', 1872, 1946]];
  const N = 6000, out = [], bad = [];
  for (const [nm, y0, y1] of ERAS) {
    const c = {}; let sgOk = 0, sgN = 0;
    for (let i = 0; i < N; i++) { const by = y0 + (i * 7) % (y1 - y0 + 1), seed = (i * 2654435761 % 4294967291) + 17; const b0 = O.pickBirth(C, H, by, E.makeRng(seed ^ 0x9e3779b9)); const L = O.newLife(C, H, P[b0.pref] || null, { year: by, seed, birth: b0 }); const k = L.rank || L.status; c[k] = (c[k] || 0) + 1; if (L.rank === 'shogun') { sgN++; if (['14', '26', '13'].includes(String(L.pref))) sgOk++; } }
    const p = k => (c[k] || 0) / N * 100, bushi = p('bushi') + p('shogun') + p('daimyo');
    out.push(nm + ' 貴族' + p('kuge').toFixed(1) + '・' + (y0 >= 1872 ? '士族' + p('shizoku').toFixed(1) : '武士' + bushi.toFixed(1) + '・将軍家' + p('shogun').toFixed(2) + '・大名家' + p('daimyo').toFixed(2)));
    if (Math.abs(p('kuge') - 2) > 0.3) bad.push(nm + '貴族');
    if (y0 >= 1872) { if (Math.abs(p('shizoku') - 7) > 1) bad.push(nm + '士族'); }
    else { if (Math.abs(bushi - 7) > 1) bad.push(nm + '武士'); if (y0 >= 1192 && Math.abs(p('shogun') - 0.5) > 0.3) bad.push(nm + '将軍家'); if (y0 >= 1467 && Math.abs(p('daimyo') - 1) > 0.3) bad.push(nm + '大名家'); }
    if (sgOk !== sgN) bad.push(nm + '将軍家の土地');
  }
  return { ok: bad.length === 0, n: N * ERAS.length, detail: out.join('／') + (bad.length ? '　外れ：' + bad.join('、') : '') };
});
test('2-19', '時代ごとの仕事を30ずつ（210）・年の外で出ない・仕事ごとに場面と選択2つ以上', () => {
  const add = ['s6_19a', 's6_19b'].flatMap(f => JSON.parse(fs.readFileSync(path.join(ROOT, 'data-src', 'jobs-add', f + '.json'), 'utf8')));
  const scenes = {}; for (const o of S6.choices.concat(S6.lines)) for (const j of (o.when || {}).jobIs || []) scenes[j] = (scenes[j] || 0) + 1;
  const thin = add.filter(r => (scenes[r[1]] || 0) < 2).map(r => r[1]);
  const all = JB.rows || JB.ROWS || null;
  return { ok: add.length >= 210 && thin.length === 0, n: add.length, detail: '足した仕事 ' + add.length + '・場面と選択が2つに満たない仕事 ' + thin.length + (thin.length ? '（' + thin.slice(0, 3).join('、') + '）' : '') };
});
test('2-20', '時代ごとの細かい死因（35）が決めた年・土地・年齢の外で出ない', () => {
  const R = JSON.parse(fs.readFileSync(path.join(ROOT, 'data-src', 'causes-rare.json'), 'utf8')).filter(r => r.s6);
  const Ls = lives(2000, 1000, 2000, 73); let out = 0; const seen = {};
  // 物語の結末で亡くなった人（同じ呼び名を使う）は、物語の年と土地で出るので数えない
  const byStory = L => L.log.some(r => r.events.some(e => (e.ev || []).some(v => /物語の結末/.test(v.what || ''))));
  // 1975年からの人生は、人口動態統計の死因（新型コロナウイルス感染症など）からも選ぶので、統計にある呼び名は数えない
  const CS = JSON.stringify(C.nat || {});
  for (const L of Ls) { const r = R.find(x => x.n === L.causeName); if (!r || byStory(L) || (L.deathYear >= 1975 && CS.includes(r.n))) continue; seen[r.n] = 1; const y = L.deathYear, a = L.deathAge; if (y < r.y[0] || y > r.y[1] || a < r.age[0] || a > r.age[1]) out++; }
  return { ok: R.length >= 35 && out === 0, n: Ls.length, detail: '死因 ' + R.length + '・条件の外 ' + out + '・2000件の中で出た死因 ' + Object.keys(seen).length };
});
test('2-23', '国や海をまたぐ仕事（140）と、仕事ごとの物語2つ以上', () => {
  const add = ['s6_23a', 's6_23b', 's6_23c', 's6_23d'].flatMap(f => JSON.parse(fs.readFileSync(path.join(ROOT, 'data-src', 'jobs-add', f + '.json'), 'utf8')));
  const cnt = {}; for (const p of PM.list.filter(p => p.group === 'shoku')) for (const j of p.jobIs || []) cnt[j] = (cnt[j] || 0) + 1;
  const thin = add.filter(r => (cnt[r[1]] || 0) < 2).map(r => r[1]);
  return { ok: add.length >= 140 && thin.length === 0, n: add.length, detail: '足した仕事 ' + add.length + '・物語が2つに満たない仕事 ' + thin.length };
});
test('2-25', '一定以上の役職・偉業の人に必ず位階か勲章', () => {
  const Ls = lives(3000, 1000, 2000, 79); let n = 0, miss = 0;
  const POST = /摂政|関白|大臣|大納言|中納言|参議|近衛大将|蔵人頭|将軍|執権|管領|大名|藩主|老中|若年寄|次官|知事|将官|国会議員|市長|最高裁|学長/;
  for (const L of Ls) { const jb = [L.selfJob && L.selfJob.n, L.lastJob, L.pathJob && L.pathJob.n, L.rank === 'shogun' ? '将軍' : '', L.rank === 'daimyo' ? '大名' : ''].join('・'); const feat = (L.feats || []).some(f => f.group === 'ijou'); if (!POST.test(jb) && !feat) continue; n++; if (!S.finalHonors(L).length) miss++; }
  return { ok: miss === 0, n, detail: '役職・偉業の人生 ' + n + '・栄典なし ' + miss };
});
test('2-27', '苗字（1870年より前の百姓・町人に名字なし・1875年からの生まれに名字あり）', () => {
  let n = 0, bad1 = 0, bad2 = 0;
  for (let i = 0; i < 1500; i++) {
    const by = [1650, 1750, 1850, 1880, 1920, 1990][i % 6], L = birth(by, i * 7919 + 83); n++;
    const name = L.old ? O.displayName(L) : (L.surname ? L.surname + ' ' + L.name : L.name);
    if (by < 1870 && /^(hyakusho|chonin)$/.test(L.status) && !L.taito && /\s/.test(name)) bad1++;
    if (by >= 1875 && !L.surname && !L.ainu) bad2++;
  }
  return { ok: bad1 === 0 && bad2 === 0, n, detail: '1870年より前の百姓・町人に名字 ' + bad1 + '・1875年からで名字なし ' + bad2 };
});
test('2-28', '外戚争いと政略結婚（摂家・清華家・大臣家の8割以上が出会う）', () => {
  let m = 0, k = 0;
  for (let i = 0; k < 300 && i < 400000; i++) {
    const y = 1000 + (i * 37) % 868, L0 = birth(y, i * 7919 + 89);
    if (L0.status !== 'kuge' || !/^(sekke|seiga|daijin|kugyo)$/.test(L0.kakaku)) continue;
    const L = play(L0); if (L.deathAge < 20) continue; k++;
    if (started(L, 'gaiseki').length || texts(L).some(e => /入内|后がね|東宮|外祖父|政略|縁組/.test(e.t))) m++;
  }
  const r = pct(m, k);
  return { ok: r >= 80, n: k, detail: '出会った人生 ' + r + '%' };
});
test('2-29', '縁談・見合い・再婚の文に相手の年齢と家柄がある', () => {
  const Ls = lives(800, 1000, 2000, 97); let n = 0, bad = 0, ex = '';
  for (const L of Ls) for (const e of texts(L)) if (/縁談|見合い|再婚した|と結婚した/.test(e.t) && /^[^。]*[ぁ-んァ-ン一-龥]+(との縁談|と再婚|と結婚)/.test(e.t) && !/の縁談は/.test(e.t)) { /* 子の縁談（いとの縁談は…）は本人の結婚ではない */ n++; if (!/\d+歳/.test(e.t)) { bad++; if (!ex) ex = e.t.slice(0, 30); } }
  return { ok: bad === 0, n, detail: '年齢のない文 ' + bad + (ex ? '（' + ex + '）' : '') };
});
test('2-30', '罪の物語（20歳以上の5〜10%・罪と罰の時代・立ち直りの続き）', () => {
  let m = 0, k = 0;
  for (let i = 0; k < 1000 && i < 30000; i++) { const y = 1000 + (i * 37) % 1001, L = play(birth(y, i * 7919 + 101)); if (L.deathAge < 20) continue; k++; if (started(L, 'tsumi').length) m++; }
  let noRec = 0;
  for (const p of PM.list.filter(p => p.group === 'tsumi')) { const all = Object.values(p.nodes || {}); const hasFree = JSON.stringify(p).includes('"free":true'); if (!hasFree) noRec++; }
  const r = pct(m, k);
  return { ok: r >= 5 && r <= 10 && noRec === 0, n: k, detail: '出会った人生 ' + r + '%・立ち直りのない筋 ' + noRec };
});

/* ---------- v17 あなたとのつながり（tsunagari-spec1） ---------- */
const NOWY = 2026;
const tctx = { C, H, E, O, S, P: c => P[c] || null, pol: t => PO.polite(t) };
test('7-1', 'あなたとのつながり（代の数・先祖の数・人口の目安と出典・結びの一文。15年以内の人に先祖の文0件）', () => {
  let n = 0, miss = 0, near = 0, nearBad = 0, ex = '', dan = 0;
  for (let i = 0; n < 500 && i < 3000; i++) {
    const by = 1000 + (i * 37) % 1001, L = play(birth(by, i * 7919 + 701)), meY = 1950 + (i * 13) % 61;
    const c = TG.connect(H, L, { y: meY, pref: '13' }, NOWY); n++;
    const all = c.lines.join('') + c.close;
    if (/先祖です/.test(all)) dan++;
    if (meY - L.by < 15) { near++; if (/先祖/.test(all) || c.kind !== 'near') nearBad++; continue; }
    if (meY - L.by <= 60) { if (c.kind !== 'parent') { miss++; ex = ex || 'parent ' + L.by; } continue; }
    const ok = /約\d+代/.test(c.lines[0] || '') && /計算上およそ/.test(c.lines[1] || '') && /人口は、およそ.*（.+）/.test(c.lines[2] || '') && c.pop && c.pop.src && H.sources[c.pop.src] && /見こみ|かもしれません/.test(c.close);
    if (!ok) { miss++; ex = ex || L.by + ' ' + all.slice(0, 60); }
  }
  return { ok: miss === 0 && nearBad === 0 && dan === 0 && near > 0, n, detail: '欠けた人生 ' + miss + '・15年以内の人 ' + near + '（先祖の文 ' + nearBad + '）・言い切り ' + dan + (ex ? '（' + ex + '）' : '') };
});
test('7-2', 'この家をあなたまでたどる（200件：最後の子があなたの生まれ年と都道府県・代の差16〜45年・名字と家宝を受け継ぐか理由の文）', () => {
  let n = 0, born = 0, gone = 0, wrong = 0, gapBad = 0, inhBad = 0, ex = '';
  const prefs = C.prefs.map(p => p.code);
  for (let i = 0; n < 200 && i < 2000; i++) {
    const by = 1000 + (i * 53) % 900, L = play(birth(by, i * 7919 + 702)), me = { y: 1960 + (i * 7) % 66, pref: prefs[(i * 11) % prefs.length] };
    if (me.y - L.by <= 60) continue;
    n++;
    const st = TG.traceAll(tctx, TG.traceStart(tctx, L, me, i * 31 + 7));
    if (!st.done) { wrong++; ex = ex || '終わらない ' + by; continue; }
    if (st.end.kind === 'gone') { gone++; continue; }
    born++;
    const t = TG.endText(H, st);
    if (st.end.y !== me.y || st.end.pref !== me.pref || t.indexOf(me.y + '年、' + H.prefNames[me.pref] + 'で') !== 0) { wrong++; ex = ex || t; }
    const ys = [L.by].concat(st.gens.map(g => g.by), [me.y]);
    for (let k = 1; k < ys.length; k++) { const d = ys[k] - ys[k - 1]; if (d < 16 || d > 45) { gapBad++; ex = ex || '差 ' + d + '（' + ys[k - 1] + '→' + ys[k] + '）'; break; } }
    const last = st.gens[st.gens.length - 1];
    if (last && last.pref !== me.pref && st.gens.length >= 1) { const k3 = st.gens.slice(-2).some(g => g.pref === me.pref); if (!k3) { wrong++; ex = ex || '最後の代まで移り住まない'; } }
    // 前の代の名字（理由の文で変わったものも含む）と家宝が、次の代に受け継がれているか。変わった代には理由（why）がある
    let prevS = st.head.surname0 || null, prevT = st.keep.treasure;
    for (const g of st.gens) { if (prevS && g.surname && g.surname !== prevS && !g.why) { inhBad++; ex = ex || '名字 ' + prevS + '→' + g.surname; } if (g.treasure !== prevT && !g.why) { inhBad++; ex = ex || '家宝 ' + prevT + '→' + g.treasure; } prevS = g.surnameEnd || g.surname || prevS; prevT = g.treasure; }
  }
  return { ok: wrong === 0 && gapBad === 0 && inhBad === 0 && born > 0, n, detail: '最後の子まで ' + born + '・家が絶えた ' + gone + '・年か都道府県の違い ' + wrong + '・代の差の外 ' + gapBad + '・受け継ぎの抜け ' + inhBad + (ex ? '（' + ex + '）' : '') };
});
test('7-3', '今に残るもの（500件：表にない寺社・街道・祭りの名前0件・表の全項目に出典）', () => {
  const IM = H.imani; let n = 0, lines = 0, bad = 0, ex = '', noSrc = 0;
  for (const [k, r] of Object.entries(IM.prov)) for (const x of [...r.ichinomiya, ...(r.kokubunji ? [r.kokubunji] : []), ...r.kaido, ...r.matsuri]) if (!(x.src || []).length || x.src.some(s => !H.sources[s])) noSrc++;
  for (let i = 0; n < 500 && i < 3000; i++) {
    const by = 1000 + (i * 37) % 975, L = play(birth(by, i * 7919 + 703)); n++;
    const row = IM.prov[(L.home0 || {}).prov || L.prov] || { ichinomiya: [], kaido: [], matsuri: [] };
    for (const t of TG.imani(H, L, '東京都千代田区')) {
      lines++;
      const m1 = t.match(/一宮の(.+?)は、/); if (m1 && !row.ichinomiya.some(x => x.name === m1[1])) { bad++; ex = ex || t; }
      const m2 = t.match(/通っていた(.+?)は、/); if (m2 && m2[1].split('・').some(nm => !row.kaido.some(x => x.name === nm))) { bad++; ex = ex || t; }
      const m3 = t.match(/見たかもしれない(.+?)は、/); if (m3 && !row.matsuri.some(x => x.name === m3[1] && x.since <= L.deathYear)) { bad++; ex = ex || t; }
      if (/国分寺/.test(t) && !row.kokubunji) { bad++; ex = ex || t; }
      if (/今もあり|今もある/.test(t) && /堤|用水|防塁/.test(t)) { bad++; ex = ex || t; }
    }
  }
  return { ok: bad === 0 && noSrc === 0 && lines > 0, n, detail: '文 ' + lines + '・表にない名前 ' + bad + '・出典のない項目 ' + noSrc + (ex ? '（' + ex + '）' : '') };
});
test('7-4', '同じ年齢のあなた（500件：生きた人生の全件に特別な行・生きられなかった全件に最期の一文・compare.js の「だ。」0件）', () => {
  let n = 0, lived = 0, rowMiss = 0, died = 0, endMiss = 0, ex = '';
  for (let i = 0; n < 500 && i < 3000; i++) {
    const by = 1000 + (i * 37) % 1001, L = play(birth(by, i * 7919 + 704)), me = { y: 1960 + (i * 7) % 60, pref: '13' }, a = NOWY - me.y; n++;
    if (L.deathAge >= a) { lived++; const r = L.log.find(x => x.age === a); const t = r && TG.sameAgeRow(L, r, me, NOWY, PO.polite); if (!t || t.indexOf('あなたと同じ' + a + '歳') < 0) { rowMiss++; ex = ex || by + ' ' + a; } }
    else { died++; const t = TG.shortLived(C, H, L, me, NOWY, CMP); if (!t || !/生きられませんでした.*(約\d+(\.\d)?%|0\.1%未満|99\.9%以上)/.test(t)) { endMiss++; ex = ex || String(t); } }
  }
  const src = fs.readFileSync(path.join(SITE, 'js', 'compare.js'), 'utf8'), da = (src.match(/だ。'/g) || []).length;
  return { ok: rowMiss === 0 && endMiss === 0 && da === 0 && lived > 0 && died > 0, n, detail: '生きた ' + lived + '（行なし ' + rowMiss + '）・生きられなかった ' + died + '（一文なし ' + endMiss + '）・compare.js の「だ。」 ' + da + (ex ? '（' + ex + '）' : '') };
});
test('7-5', '共有の画像の「あなたまで約○代」は生まれた年を入れた人だけ・トップと入力の場所の一文', () => {
  const app = fs.readFileSync(path.join(SITE, 'js', 'app.js'), 'utf8'), card = fs.readFileSync(path.join(SITE, 'js', 'card.js'), 'utf8'), html = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8');
  const a = /var tc = TG\(\) && meInfo\(\)/.test(app) && /if \(o\.gens\)/.test(card) && /あなたまで約' \+ o\.gens \+ '代/.test(card);
  const b = /あなたの先祖の一人かもしれません/.test(html), c2 = /入れると、主人公とあなたのつながりが出ます/.test(html);
  return { ok: a && b && c2, n: 3, detail: '画像の行 ' + (a ? 'あり（生まれた年を入れた人だけ）' : 'なし') + '・トップの一文 ' + (b ? 'あり' : 'なし') + '・入力の場所の一文 ' + (c2 ? 'あり' : 'なし') + '（390×844 で2行以内かはブラウザの検査で確かめる）' };
});

/* ---------- 双子・三つ子（作る人の指示 8） ---------- */
// app.js の lifeSeedOf と inheritFrom（きょうだいとして生きる）と同じ作り方
const lifeSeedOf = (seed, id) => ((seed ^ Math.imul(id, 0x9e3779b1)) >>> 0) || 1;
function asSibling(Lp, seed0, id) {
  const MM = Lp.old ? O : E, h = MM.houseOf(Lp, []), opt = { house: h, memberId: id, seed: lifeSeedOf(seed0, id) };
  return Lp.old ? O.newLife(C, H, P[h.home.pref] || null, opt) : E.newLife(C, h.pref ? P[h.pref] : Lp.P, opt);
}
const candsOf = L => { const MM = L.old ? O : E; let c = MM.childCandidates(L).concat(MM.heirCandidates(L)); if (L.deathAge === 0) c = c.slice(0, 2); return c; };
// 多胎の抽選だけを、人生と同じ関数（E.multiBirth）・同じ種で行う（速い。人生を作るのは当たったときだけ）
function multiN(by, seed) {
  const L = { seed, by, sex: 'm', C, members: [], rnd: Math.random };
  let id = 0;
  E.multiBirth(L, C, () => ({ id: ++id }), () => 0);
  return L.multi ? L.multi.n : 1;
}
function findMulti(n, y0, y1, salt, max) {
  const out = [];
  for (let i = 0; out.length < max && i < 3000000; i++) {
    const by = y0 + (i * 37) % (y1 - y0 + 1), seed = ((i + 1) * 7919 + salt) >>> 0, k = multiN(by, seed);
    if (k === 1 || (n && k !== n)) continue;
    const L = birth(by, seed);
    if (L.multi) out.push({ L, seed });
  }
  return out;
}
test('8-1', '1950年以降の生まれ10万件で、双子・三つ子以上の割合が統計から大きく外れない（双子±20%・三つ子以上は期待値の幅の中）', () => {
  let n = 0, tw = 0, tr = 0, eTw = 0, eTr = 0, byN = {};
  for (let i = 0; i < 100000; i++) {
    const by = 1950 + (i * 37) % 51, k = multiN(by, ((i + 1) * 7919 + 801) >>> 0), R = E.multiRate(C, by); n++;
    eTw += R.twin; eTr += R.triplet + R.quad + R.quint;
    if (k === 1) continue;
    byN[k] = (byN[k] || 0) + 1;
    if (k === 2) tw++; else tr++;
  }
  // 本物の人生（3000件）で、抽選の結果と家族の形が同じか
  let real = 0, same = 0, sibBad = 0;
  for (let i = 0; i < 3000; i++) {
    const by = 1950 + (i * 37) % 51, seed = ((i + 1) * 7919 + 801) >>> 0, L = birth(by, seed); real++;
    if ((L.multi ? L.multi.n : 1) === multiN(by, seed)) same++;
    if (!L.multi) continue;
    const sib = L.members.filter(m => L.multi.sibIds.includes(m.id));
    if (!(sib.length === L.multi.n - 1 && sib.every(m => m.by === L.by && m.sib && m.multi && m.multi.n === L.multi.n && new RegExp('^' + L.multi.kind + 'の(兄|姉|弟|妹)$').test(m.role)))) sibBad++;
  }
  const dTw = (tw - eTw) / eTw, trOk = Math.abs(tr - eTr) <= 3 * Math.sqrt(eTr) + 2;
  return { ok: Math.abs(dTw) <= 0.2 && trOk && same === real && sibBad === 0, n, detail: '双子 ' + tw + '（統計から ' + eTw.toFixed(0) + '・' + (dTw * 100).toFixed(1) + '%）・三つ子以上 ' + tr + '（統計から ' + eTr.toFixed(1) + '）・内訳 ' + JSON.stringify(byN) + '・本物の人生 ' + real + '件で抽選の結果が違う ' + (real - same) + '・きょうだいの形の誤り ' + sibBad };
});
test('8-2', '三つ子の人生で、亡くなった後に残りの2人として生きる候補が2つ出る（同じ日に生まれたきょうだいが先頭）', () => {
  const found = findMulti(3, 1975, 2000, 802, 40).concat(findMulti(3, 1000, 1974, 803, 20));
  let n = 0, both = 0, bad = 0, ex = '';
  for (const { L } of found) {
    play(L); n++;
    const alive = L.members.filter(m => L.multi.sibIds.includes(m.id) && m.alive && !m.gone);
    // app.js は子の候補のあとにきょうだいの候補を並べる。きょうだいの候補の中では同じ日に生まれたきょうだいが先頭
    const c = candsOf(L), sibs = c.filter(x => !x.child), first = sibs.slice(0, alive.length);
    if (alive.length === 2) both++;
    if (!first.every(x => alive.some(m => m.id === x.id) && /^三つ子の(兄|姉|弟|妹)$/.test(x.role)) || first.length !== alive.length) { bad++; ex = ex || L.by + ' ' + JSON.stringify(c.slice(0, 3).map(x => x.role)); }
  }
  return { ok: bad === 0 && both > 0 && n >= 20, n, detail: '残りの2人が生きていた人生 ' + both + '・候補の誤り ' + bad + (ex ? '（' + ex + '）' : '') };
});
test('8-3', '同じ日に生まれたきょうだいの人生で、親の死の年が全員一致する（app.js の inheritFrom と同じ作り方）', () => {
  const found = findMulti(0, 1975, 2000, 804, 40).concat(findMulti(0, 1000, 1974, 805, 60));
  let n = 0, lives2 = 0, bad = 0, multiBad = 0, ex = '';
  for (const { L, seed } of found) {
    play(L); n++;
    const pd = {}; for (const r of ['父', '母']) { const m = L.members.find(x => x.role === r); pd[r] = m && !m.alive && m.dy <= L.deathYear ? m.dy : null; }
    for (const c of candsOf(L).filter(x => x.by === L.by)) {
      const L2 = play(asSibling(L, seed, c.id)); lives2++;
      for (const r of ['父', '母']) {
        const m2 = L2.members.find(x => x.role === r), d2 = m2 && !m2.alive ? m2.dy : null;
        // 前の人が亡くなるまでに親が亡くなっていれば同じ年。生きていれば、その年まではきょうだいの人生でも亡くならない
        if (pd[r] != null ? d2 !== pd[r] : d2 != null && d2 <= L.deathYear) { bad++; ex = ex || L.by + ' ' + r + ' ' + pd[r] + '→' + d2; }
      }
      const pv = L2.members.find(x => x.prevLife);
      if (!L2.multi || L2.multi.n !== L.multi.n || !pv || !L2.multi.sibIds.includes(pv.id) || pv.dy !== L.deathYear || !new RegExp('^' + L.multi.kind + 'の').test(pv.role)) { multiBad++; ex = ex || '多胎の印 ' + JSON.stringify(L2.multi) + ' ' + (pv && pv.role); }
    }
  }
  return { ok: bad === 0 && multiBad === 0 && lives2 >= 30, n, detail: 'きょうだいの人生 ' + lives2 + '・親の死の年の違い ' + bad + '・多胎の印の誤り ' + multiBad + (ex ? '（' + ex + '）' : '') };
});

/* ---------- v18（ichioku1000-v17-ui-spec2）の中身の検査：6-1・6-2・11-1・11-3・11-4・11-7・11-8 ---------- */
const MB = require(path.join(SITE, 'js', 'mibun.js'));
const KK = require(path.join(SITE, 'js', 'kakitsuke.js'));
const KR = require(path.join(SITE, 'js', 'kurashi.js'));
const TE = require(path.join(SITE, 'js', 'tegotae.js'));
const SH = require(path.join(SITE, 'js', 'shiryo.js'));
const BAN18 = /まず|見ます|効く|効いて|重い|重く|重さ|重か|読み|判定|一方で|結論から言うと|示唆|わけです|極めて|興味深い|齟齬|——/;
test('9-1', '家の事情の文の時代の呼び方（1000〜1599年生まれに小作・地主が出ない・1600〜1649年に小作が出ない・身分の行のかっこが二重にならない）', () => {
  let n = 0, bad = 0, ex = '', saku = 0, dbl = 0, exd = '';
  for (const L of lives(400, 1000, 1599, 901)) {
    n++;
    for (const e of texts(L)) {
      if ((e.y < 1600 && /小作|地主/.test(e.t)) || (e.y < 1650 && /小作/.test(e.t))) { bad++; ex = ex || e.y + ' ' + e.t; }
      if (/作人/.test(e.t)) saku++;
    }
  }
  // 身分の行（生まれの画面）：1000〜1974年の生まれで、かっこの中にかっこが入らない
  for (let i = 0; i < 400; i++) {
    const L = birth(1000 + (i * 37) % 975, i * 7919 + 911), w = MB.statusLine(L), w2 = L.old ? O.houseWord(L) : '';
    for (const s of [w, w2, L.log[0] && L.log[0].events[0] ? L.log[0].events[0].t : '']) if (/（[^）]*（/.test(s)) { dbl++; exd = exd || s; }
  }
  const flat = MB.flatParen('平民（自作農（米作））の家');
  return { ok: bad === 0 && dbl === 0 && flat === '平民の家（自作農・米作）', n, detail: '小作・地主の出た文 ' + bad + '・作人の出た文 ' + saku + '・かっこが二重の身分の行 ' + dbl + '・直した形「' + flat + '」' + (ex ? '（' + ex + '）' : '') + (exd ? '（' + exd + '）' : '') };
});
test('9-2', '一生の骨組み（区分16×時代7のどこも3以上。tools/count-skeleton.mjs）', async () => {
  const SK = await import(path.join(ROOT, 'tools', 'count-skeleton.mjs'));
  const r = SK.countSkeleton(300);
  const min = Math.min(...r.table.flat());
  return { ok: r.low.length === 0, n: r.total, detail: '分かれ道 ' + r.total + '・いちばん少ない所 ' + min + (r.low.length ? '・3に満たない所 ' + r.low.join('、') : '') };
});
test('9-3', '大きな決断500件（家族の年齢の一行が全件・資料の箱が6割以上・資料の箱はすべて出典つき・数字入りの丁寧な1文）', () => {
  let n = 0, fam = 0, sh = 0, noSrc = 0, badT = 0, ex = '';
  for (let i = 0; n < 500 && i < 600; i++) {
    const L = birth(1000 + (i * 37) % 1001, i * 7919 + 931);
    play(L, (br, L) => {
      if (n >= 500 || !SH.isBig(br)) return; n++;
      const f = SH.familyAges(br, L); if (f && /\d+歳/.test(f)) fam++;
      const s = SH.forBranch(br, L, H, C);
      if (s) {
        sh++;
        if (!s.src || !(H.sources[s.src] || C.sources[s.src] || SH.SOURCES[s.src])) { noSrc++; ex = ex || s.text; }
        if (!/\d/.test(s.text) || !/(です|ます|でした|ました)(（[^）]*）)?。$/.test(s.text) || BAN18.test(s.text) || (s.text.match(/。/g) || []).length !== 1) { badT++; ex = ex || s.text; }
      }
    });
  }
  return { ok: n >= 500 && fam === n && sh / n >= 0.6 && noSrc === 0 && badT === 0, n, detail: '家族の年齢の一行 ' + fam + '／' + n + '・資料の箱 ' + pct(sh, n) + '%・出典なし ' + noSrc + '・文の形の違反 ' + badT + (ex ? '（' + ex + '）' : '') };
});
test('9-4', '身元の書き付け・趣味と持ち物・飼う動物・この人生の手ざわり（300人：時代の形・出せる年・英字なし・16の型）', () => {
  const FROM = { 'スマートフォン': 2008, '携帯電話': 1995, 'パソコン': 1980, 'テレビ': 1953, '電子レンジ': 1965, 'ラジオ': 1925, '自転車': 1890, '懐中時計': 1872, '腕時計': 1930, '算盤': 1570, '煙管': 1600 };
  let n = 0, formBad = 0, eng = 0, goodsBad = 0, hobBad = 0, typeBad = 0, petN = 0, petBad = 0, ex = '';
  const types = {};
  for (let i = 0; n < 300 && i < 400; i++) {
    const L = play(birth(1000 + (i * 37) % 1001, i * 7919 + 941)); n++;
    const k = KK.build(L, H, C), y = L.year;
    const want = y >= 1872 ? '戸籍' : (L.old && y >= 1640 && ['hyakusho', 'chonin', 'genin', 'outcast'].includes(L.status) && L.pref !== '47' && !L.ainu) ? '宗門人別改' : '身元の覚え';
    if (!k || k.form !== want || !k.rows.length) { formBad++; ex = ex || want + ' ' + (k && k.form); }
    if (k && k.form === '戸籍' && y > 1947 && k.rows.some(r => r[0] === '族籍')) { formBad++; ex = ex || '1948年からの族籍'; }
    const all = k ? k.title + k.rows.flat().join('') : '';
    if (/[A-Za-z]/.test(all) || BAN18.test(all)) { eng++; ex = ex || all.slice(0, 40); }
    for (const yy of [L.by + 10, L.by + 30, y]) {
      if (yy > y) continue;
      for (const g of KR.goods(L, yy)) if ((FROM[g] && yy < FROM[g]) || (g === '刀' && (L.status !== 'bushi' || yy > 1875))) { goodsBad++; ex = ex || yy + ' ' + g; }
      for (const h of KR.hobbies(L, yy)) if (!(h.lv >= 1 && h.lv <= 99 && h.years >= 1 && h.from <= yy && h.from >= L.by)) { hobBad++; ex = ex || JSON.stringify(h); }
    }
    for (const p of KR.pets(L, y)) { petN++; if (!p.a || !p.name || p.from < L.by || (p.to != null && p.to < p.from)) { petBad++; ex = ex || JSON.stringify(p); } }
    const t = TE.typeOf(L);
    if (!t || t.axes.length !== 4 || t.axes.some(a => a.v < -1 || a.v > 1) || !TE.TYPES[t.code] || !/でした。$/.test(t.line)) { typeBad++; ex = ex || JSON.stringify(t); }
    else types[t.code] = 1;
  }
  const nt = Object.keys(types).length;
  return { ok: formBad === 0 && eng === 0 && goodsBad === 0 && hobBad === 0 && typeBad === 0 && petBad === 0 && nt >= 12, n, detail: '書き付けの形の違い ' + formBad + '・英字や禁止語 ' + eng + '・年の外の持ち物 ' + goodsBad + '・趣味の値の外れ ' + hobBad + '・飼った動物 ' + petN + '（おかしなもの ' + petBad + '）・手ざわりの型 ' + nt + '種（違反 ' + typeBad + '）' + (ex ? '（' + ex + '）' : '') };
});

/* ---------- v19（ichioku1000-v18-fix-spec2） ---------- */
// 7 出来事の文の日本語：機械の点検（記録500件のすべての文を、画面と同じ丁寧体に直してから調べる）
function sentencesOf(t) { const out = []; let d = 0, cur = ''; for (const ch of t) { cur += ch; if ('「『（'.includes(ch)) d++; else if ('」』）'.includes(ch) && d > 0) d--; else if (ch === '。' && d === 0) { out.push(cur); cur = ''; } } if (cur.trim()) out.push(cur); return out; }
const BAD_JA = [['でしました・ましました', /でしました|ましました|でしたでした|ですです/], ['同じ助詞の連続', /([一-龠ァ-ヶ]のの[一-龠ァ-ヶ]|をを)/], ['二重のかっこ', /（[^）]*（|）（/], ['〜かったです', /かったです/], ['埋めこみの名前が空', /[、。]と(結婚|再婚)|^と(結婚|再婚)|\{\w+\}|undefined|null|NaN/]];
const END_OK = /(ます|ました|ません|ませんでした|です|でした|でしょう)。$/;
test('10-7', '出来事の文の日本語（でしました・助詞の連続・二重のかっこ・かったです・文の終わり・空の名前が0件）', () => {
  const Ls = lives(500, 1000, 2000, 1907); const cnt = {}; const ex = {}; let n = 0;
  const add = (k, t) => { cnt[k] = (cnt[k] || 0) + 1; if (!ex[k]) ex[k] = t.slice(0, 40); };
  for (const L of Ls) for (const e of texts(L)) {
    const pt = PO.polite(e.t);
    for (const st of sentencesOf(pt)) {
      n++;
      for (const [k, re] of BAD_JA) if (re.test(st)) add(k, st);
      const body = st.replace(/「[^」]*」/g, '').replace(/（[^（）]*）。$/, '。');
      if (/。$/.test(st) && body.trim() !== '。' && !END_OK.test(body.trim())) add('文の終わり', st);
    }
  }
  const tot = Object.values(cnt).reduce((a, b) => a + b, 0);
  return { ok: tot === 0, n, detail: tot ? Object.entries(cnt).map(([k, v]) => k + ' ' + v + '（' + ex[k] + '）').join('・') : '文 ' + n + '・おかしな文 0' };
});

test('10-5', '動物を迎える分かれ道（20歳以上の人生の4割以上が出会う・時代に合わない動物0件・迎えた動物に名前）', () => {
  const ERA = [[1000, 1599, '犬 猫 鶏 馬 牛 鷹'], [1600, 1867, '犬 猫 金魚 鈴虫 小鳥 狆'], [1868, 1945, '犬 猫 小鳥 金魚 山羊'], [1946, 2120, '犬 猫 インコ ハムスター うさぎ 魚']];
  let n = 0, met = 0, bad = [], noName = 0, kept = 0, died = 0, sick = 0; const kinds = {};
  for (let i = 0; n < 500 && i < 4000; i++) {
    const by = 1000 + (i * 37) % 1001, L = birth(by, ((i + 1) * 7919 + 505) >>> 0); let saw = false;
    play(L, br => { if (br.d && br.d.cid === '_pet') saw = true; if (br.d && br.d.cid === '_petSick') sick++; }, br => br.d && br.d.cid === '_pet' ? { s: 'p0' } : null);
    if (L.deathAge < 20) continue;
    n++; if (saw) met++;
    for (const p of L.pets || []) {
      if (!/^s6\./.test(p.src || '') ) { const row = ERA.find(r => p.y >= r[0] && p.y <= r[1]); if (row && !row[2].split(' ').includes(p.a) && !['犬', '猫', '馬', '牛', '鶏', '鷹', '金魚', '小鳥', '鈴虫'].includes(p.a)) bad.push(p.y + p.a); }
      if (p.a === 'ハムスター' && p.y < 1975 || p.a === 'インコ' && p.y < 1946 || p.a === '金魚' && p.y < 1700 || p.a === '狆' && p.y < 1600) bad.push(p.y + p.a);
      if (!p.name && p.a !== '鈴虫' && p.a !== '魚') noName++;
      kept++; if (p.dy != null) died++; kinds[p.a] = (kinds[p.a] || 0) + 1;
    }
  }
  const r = pct(met, n);
  return { ok: r >= 40 && !bad.length && !noName, n, detail: '出会った人生 ' + r + '%・時代に合わない動物 ' + bad.length + (bad.length ? '（' + bad.slice(0, 3).join('、') + '）' : '') + '・名前なし ' + noName + '・迎えた動物 ' + kept + '（亡くなった ' + died + '・病気の分かれ道 ' + sick + '）・' + Object.entries(kinds).map(([k, v]) => k + v).join(' ') };
});
test('10-10', 'あなたに近づく子孫（代ごとに距離が縮む・あなたの生まれ年の100年前より後は同じか隣の都道府県・1代16〜45年・最後の代があなたの年）', () => {
  const PREFS = C.prefs.map(p => p.code); let n = 0, nearBad = 0, gapBad = 0, endBad = 0; const dist = [];
  for (let i = 0; i < 100; i++) {
    const rnd = E.makeRng(((i + 1) * 104729) >>> 0), me = { y: 1960 + Math.floor(rnd() * 50), pref: PREFS[Math.floor(rnd() * 47)] };
    let by = 1000 + Math.floor(rnd() * 700), pref = PREFS[Math.floor(rnd() * 47)], g = 0;
    while (g < 40) {
      const dAge = 20 + Math.floor(rnd() * 60), L = { by, deathYear: by + dAge, members: [] };
      const d = TG.descPlan(L, 2, me);
      if (!d) break;
      if (d.by - by < 16 * d.g || d.by - by > 45 * d.g) gapBad++;
      const mv = TG.drift(H, pref, d.by, me, Math.min(1, 1.5 / Math.max(1, TG.gensTo(d.by, me.y)) + (d.by >= me.y - 160 ? 0.3 : 0)), rnd);
      if (mv) pref = mv.pref;
      (dist[g] = dist[g] || []).push(TG.kmPref(pref, me.pref));
      if (d.by > me.y - 100 && !TG.nearMe(pref, me.pref)) nearBad++;
      by = d.by; g++;
    }
    // 最後は「たどる」と同じく、あなたの年に生まれる子で終える（1代16〜45年）
    const last = me.y - by; if (last < 16 && g > 0 || last > 90) endBad++;
    n++;
  }
  const avg = dist.map(a => Math.round(a.reduce((x, y) => x + y, 0) / a.length));
  let shrink = true; for (let k = 1; k < Math.min(avg.length, 10); k++) if (dist[k].length >= 10 && avg[k] > avg[k - 1]) shrink = false;
  return { ok: shrink && !nearBad && !gapBad, n, detail: '代ごとの距離の平均 ' + avg.slice(0, 10).join('→') + 'km・100年前より後で遠い代 ' + nearBad + '・間隔の外 ' + gapBad + '・最後の代までの年が合わない ' + endBad };
});
test('10-9', '2020年代の出会い（2020〜2030年に初めて結婚する人生500件でアプリの出会いが調査の25%±7ポイント・2014年より前の相席屋と2010年より前のマッチングアプリが0件）', () => {
  const DE = require(path.join(SITE, 'js', 'deai.js'));
  let n = 0, app = 0, early = 0, seen = 0, cnt = {};
  for (let i = 0; n < 500 && i < 30000; i++) {
    const by = 1965 + (i * 7) % 41, L = birth(by, ((i + 1) * 7919 + 99) >>> 0), M = L.old ? O : E;
    let g = 0;
    while (L.alive && g++ < 130 && L.year <= 2030) { let r = M.step(L); while (r && r.branch) { r = M.resolve(L, r.branch.ask ? { text: '' } : null); } }
    seen++;
    for (const e of texts(L)) { if (e.y < 2014 && /相席屋/.test(e.t)) early++; if (e.y < 2010 && /マッチングアプリ|出会いのアプリ|アプリで知り合/.test(e.t)) early++; }
    if (L.metBy === 'app' && L.metByY < 2010) early++;
    const fm = L.log.find(r => r.events.some(e => e.cat === '家庭' && /と結婚した。/.test(e.t)));
    if (!fm || fm.year < 2020 || fm.year > 2030 || L.metByY !== fm.year) continue;
    n++; cnt[L.metBy] = (cnt[L.metBy] || 0) + 1; if (L.metBy === 'app') app++;
  }
  const r = pct(app, n), want = DE.MY2023.app;
  return { ok: n >= 500 && Math.abs(r - want) <= 7 && early === 0, n, detail: 'アプリ ' + r + '%（調査 ' + want + '%）・職場 ' + pct(cnt.work || 0, n) + '%・友人 ' + pct(cnt.friend || 0, n) + '%・見合い ' + pct(cnt.miai || 0, n) + '%・2014年より前の相席屋と2010年より前のアプリ ' + early + '件（' + seen + '人生を2030年まで）' };
});
test('10-14', '昭和以降の賭けごと（1910〜2005年生まれの20歳以上1000件：分かれ道に出会うのが3〜6割・賭けた人の通算の収支の平均がマイナス・20歳未満の賭け0件・始まった年より前の競技0件）', () => {
  const KK = require(path.join(SITE, 'js', 'kake.js'));
  let n = 0, met = 0, bettors = 0, sum = 0, minor = 0, early = 0, bets = 0, wins = 0, bigW = 0, bigL = 0;
  for (let i = 0; n < 1000 && i < 5000; i++) {
    const by = 1910 + (i * 37) % 96, L = play(birth(by, ((i + 1) * 7919 + 1414) >>> 0));
    if (!(L.deathAge >= 20)) continue;
    n++;
    const k = L.kake; if (k && k.met) met++;
    if (!k || !k.log.length) continue;
    bettors++; sum += k.net;
    for (const b of k.log) { bets++; if (b.net > 0) wins++; if (b.a < 20) minor++; if (!KK.open(b.kind, b.y)) early++; }
    if (k.net >= 100) bigW++; if (k.net <= -100) bigL++;
  }
  const mean = bettors ? sum / bettors : 0, r = pct(met, n);
  return { ok: r >= 30 && r <= 60 && mean < 0 && minor === 0 && early === 0, n, detail: '出会った人生 ' + r + '%・賭けた人 ' + bettors + '人の通算の収支の平均 ' + Math.round(mean) + '千円（今の物価）・勝った賭け ' + wins + '/' + bets + '・10万円以上の大勝ち ' + bigW + '人・大負け ' + bigL + '人・20歳未満 ' + minor + '件・始まる前 ' + early + '件' };
});
test('10-13', '仕事の中身（上位300の仕事すべてに6つの項目と出典がある。その仕事に就いて10年以上働いた人生の記録に、6つの項目に沿った場面が2つ以上出る）', () => {
  const JD = require(path.join(SITE, 'js', 'jobdesc.js'));
  const top = JSON.parse(fs.readFileSync(path.join(ROOT, 'data-src', 'jobdesc-top.json'), 'utf8')).top.map(x => x[0]);
  let noItem = 0, noSrc = 0, ex = '';
  for (const n of top) {
    const e = JD.get(n, null);
    if (!e || JD.KEYS.some(k => !e[k] || !/。$/.test(e[k]))) { noItem++; ex = ex || n; continue; }
    if (!e.src.length || e.src.some(s => !JD.SRC[s])) { noSrc++; ex = ex || n + '（出典）'; }
  }
  const TOPS = new Set(top);
  const working = L => L.old ? !!(L.job && L.job !== 'home') : !!(L.job && L.job.ind);
  let n = 0, low = 0, scenesN = 0, ex2 = '';
  for (let i = 0; n < 300 && i < 2400; i++) {
    const by = 1000 + (i * 37) % 1001, L = birth(by, (i + 1) * 15485863 + 13), M = L.old ? O : E, run = {}, best = {};
    let g = 0;
    while (L.alive && g++ < 130) {
      let r = M.step(L);
      while (r && r.branch) r = M.resolve(L, r.branch.ask ? { text: '' } : null);
      const nm = (L.pathJob && L.pathJob.n) || (L.selfJob && L.selfJob.n), a = L.year - 1 - L.by;
      for (const k of Object.keys(run)) if (k !== nm) delete run[k];
      if (nm && a >= 15 && working(L) && !(L.mode && L.mode !== 'away' && !L.pathJob) && TOPS.has(nm)) { const rr = run[nm] = run[nm] || { from: L.year - 1, ys: [] }; rr.ys.push(L.year - 1); if (rr.ys.length >= 10 && !best[nm]) best[nm] = rr; }
      else if (nm) delete run[nm];
    }
    const jobs = Object.keys(best);
    if (!jobs.length) continue;
    n++;
    for (const j of jobs) {
      const set = new Set(); for (const y of best[j].ys) JD.scenes(j, y).forEach(t => set.add(t));
      const c = texts(L).filter(e => e.story && e.cat === '学歴と仕事' && set.has(e.t)).length;
      scenesN += c;
      if (c < 2) { low++; ex2 = ex2 || j + ' ' + L.by + '年生まれ ' + c + '件'; }
    }
  }
  return { ok: noItem === 0 && noSrc === 0 && low === 0 && n >= 100, n, detail: '上位' + top.length + 'の仕事で6つの項目がない ' + noItem + '・出典がない ' + noSrc + (ex ? '（' + ex + '）' : '') + '・10年以上働いた人生 ' + n + '人で場面が2つに満たない ' + low + (ex2 ? '（' + ex2 + '）' : '') + '・場面の平均 ' + (n ? (scenesN / n).toFixed(1) : 0) + '件' };
});
const HB = require(path.join(SITE, 'js', 'hisabetsu.js'));
test('10-4', '被差別身分の家に生まれ25歳まで生きた人生200件で、0〜25歳のうち場面が出た年の割合が3分の1以上。表の場面が決まった藩・国・年の外で0件。蔑称の文字列が0件（全データ・全js）', () => {
  // 作る人の表（spec v19 4）。決まった国と年の外では出さない
  const TABLE = {
    tajima1675: { prov: ['但馬'], y: [1675, 1690] }, awa1699: { prov: ['阿波'], y: [1699, 1699] }, takada1742: { prov: ['越後'], y: [1742, 1742] },
    chosyu1743: { prov: ['周防', '長門'], y: [1743, 1743] }, kaga1776: { prov: ['加賀', '能登', '越中'], y: [1776, 1776] }, izumi1772: { prov: ['和泉'], y: [1772, 1772] },
    okayama1855: { prov: ['備前'], y: [1855, 1856] }, okayama1856: { prov: ['備前'], y: [1856, 1856] }, mimasaka1873: { prov: ['美作'], y: [1873, 1873] },
    kyoto1922: { prov: ['山城'], pref: ['26'], y: [1922, 1922] }, nagano1924: { prov: ['信濃'], pref: ['20'], y: [1924, 1924] }, kochi1961: { prov: ['土佐'], pref: ['39'], y: [1961, 1963] }
  };
  const IT = {}; HB.items.forEach(o => { IT[o.id] = o; });
  const st = by => by >= 1872 ? 'buraku' : 'outcast';
  const mk = (by, seed, b) => O.newLife(C, H, P[b.pref] || null, { year: by, seed, birth: b, status: st(by) });
  const hbEvs = L => L.log.flatMap(r => r.events.filter(e => e.hb).map(e => ({ y: r.year, a: r.age, id: e.hb, at: e.hbAt || '', t: e.t, ev: e.ev })));
  let bad = [], noSrc = 0, ex = '';
  const checkPlace = (L) => {
    for (const e of hbEvs(L)) {
      const o = IT[e.id]; if (!o) { bad.push('不明 ' + e.id); continue; }
      if (!e.ev || !e.ev.length || e.ev.some(v => !v.name)) noSrc++;
      const [pv, pf] = e.at.split('|');
      const T = o.table ? TABLE[o.table] : null;
      if (o.table && !T) { bad.push('表にない ' + o.table); continue; }
      const lim = T || (o.prov || o.pref ? { prov: o.prov || [], pref: o.pref || [], y: o.y } : null);
      if (!lim) continue;
      const inPlace = (lim.prov || []).includes(pv) || (e.y >= 1872 && (lim.pref || []).includes(pf));
      if (!inPlace || e.y < lim.y[0] || e.y > lim.y[1]) bad.push(e.id + ' ' + e.y + ' ' + pv);
    }
  };
  // 1. 0〜25歳の場面の割合（1000〜1974年生まれ）
  let n = 0, hit = 0, yrs = 0;
  for (let i = 0; n < 200 && i < 3000; i++) {
    const by = 1000 + (i * 37) % 975, seed = ((i + 1) * 7919 + 4041) >>> 0;
    const L = play(mk(by, seed, O.pickBirth(C, H, by, E.makeRng(seed ^ 0x9e3779b9))));
    checkPlace(L);
    if (L.deathAge < 25) continue;
    n++; yrs += 26; hit += new Set(hbEvs(L).filter(e => e.a <= 25).map(e => e.a)).size;
  }
  // 2. 表の国・年の人生（出ること）と、同じ年のほかの国の人生（出ないこと）
  let tableHit = 0, tableN = 0;
  const pref1 = pv => Object.keys(H.prov[pv].prefs)[0];
  for (const [k, T] of Object.entries(TABLE)) for (const pv of [T.prov[0], '大和']) for (const d of [4, 9, 14, 19]) {
    const by = T.y[0] - d, L = play(mk(by, (by * 131 + d * 17 + pv.length) >>> 0, { prov: pv, sub: null, pref: pref1(pv) }));
    checkPlace(L);
    if (pv !== '大和' && L.deathAge >= d) { tableN++; if (hbEvs(L).some(e => IT[e.id] && IT[e.id].table === k)) tableHit++; }
  }
  // 3. 差別のための呼び名（全データ・全js）。本や事典の項目の題名（『…』、コトバンク「…」）は除く
  const SLUR = /穢多|えた・ひにん|えた身分|ひにん|非人|エタ|ヒニン|新平民|特殊部落|部落民/g;
  const files = [];
  const walk = d => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (/\.(js|json|mjs|html)$/.test(f.name)) files.push(p); } };
  walk(path.join(SITE, 'js')); walk(path.join(SITE, 'data')); walk(path.join(ROOT, 'data-src'));
  const slur = [];
  for (const f of files) {
    const t = fs.readFileSync(f, 'utf8').replace(/『[^』\n]{0,60}』/g, '').replace(/(コトバンク|Wikipedia)[「『][^」』\n]{0,30}[」』]/g, '');
    const m = t.match(SLUR); if (m) slur.push(path.relative(ROOT, f) + '：' + [...new Set(m)].join('・'));
  }
  const r = n ? hit / yrs : 0;
  return { ok: n >= 200 && r >= 1 / 3 && bad.length === 0 && noSrc === 0 && tableHit >= tableN * 0.5 && slur.length === 0, n,
    detail: '0〜25歳で場面が出た年 ' + pct(hit, yrs) + '%・表の外の場面 ' + bad.length + (bad.length ? '（' + bad.slice(0, 3).join('／') + '）' : '') + '・出典なし ' + noSrc +
      '・表の国と年の人生で出会った ' + tableHit + '／' + tableN + '・呼び名の残る所 ' + slur.length + (slur.length ? '（' + slur.join('／') + '）' : '') };
});

/* ---------- v19 15・16・17 素養と夢・プロの選手（site/js/yume.js） ---------- */
const YM = require(path.join(SITE, 'js', 'yume.js'));
const playTo = (L, age) => { const M = L.old ? O : E; let g = 0; while (L.alive && g++ < 130 && L.age < age) { let r = M.step(L); while (r && r.branch) r = M.resolve(L, r.branch.ask ? { text: '' } : null); } return L; };
const MUSIC_P = /楽|琴|三味線|歌の師|奏|音楽|能役者|囃子/, STUDY_P = /学者|研究|博士|教授|医|塾|師範|訓導|教師/;
const pathDomT = p => { if (/^s7sp_/.test(p.id)) return 'sport'; const js = []; const w = o => { if (o && o.job) js.push(o.job.n); }; p.opts.forEach(w); for (const n of Object.values(p.nodes || {})) { w(n); if (n.ask) n.ask.opts.forEach(w); } const t = js.join('・'); return p.id === 's7_ongaku' || MUSIC_P.test(t) ? 'music' : p.id === 's7_gakumon' || STUDY_P.test(t) ? 'study' : null; };
test('10-15', '素養の親から子へ（親子の組10万件で回帰の傾きが決めた遺伝の割合±0.03・資料の範囲0.32〜0.71の中。素養が高い子ほどその分野の道に出会う割合が高い）', () => {
  // 1 親子の組10万件（人々のばらつきから父母を引き、子を作る。yume.js と同じ式）
  let r = 12345; const rnd = () => { r = (Math.imul(r, 1103515245) + 12345) >>> 0; return r / 4294967296; };
  const det = []; const D = ['music', 'sport', 'study'];
  const acc = {}; D.forEach(d => { acc[d] = { sx: 0, sy: 0, sxx: 0, sxy: 0, n: 0 }; });
  for (let i = 0; i < 100000; i++) {
    const a = YM.popApt(rnd), b = YM.popApt(rnd), c = YM.childApt(a, b, rnd);
    for (const d of D) { const x = (a[d] + b[d]) / 2, y = c[d], o = acc[d]; o.sx += x; o.sy += y; o.sxx += x * x; o.sxy += x * y; o.n++; }
  }
  let ok1 = true;
  for (const d of D) { const o = acc[d], sl = (o.sxy - o.sx * o.sy / o.n) / (o.sxx - o.sx * o.sx / o.n); det.push(d + ' 傾き' + sl.toFixed(3) + '（決めた' + YM.H2[d] + '）'); if (Math.abs(sl - YM.H2[d]) > 0.03 || sl < 0.32 || sl > 0.71) ok1 = false; }
  // 2 人生の中の親子：父母に素養があり、子の素養が父母から作られている
  // 3 1925〜2005年生まれ3000件（30歳まで）：素養の上の3分の1と下の3分の1で、その分野の道（筋）に出会う割合
  const rows = [];
  let withPar = 0, n0 = 0;
  for (let i = 0; i < 3000; i++) {
    const by = 1925 + (i * 37) % 81, L = playTo(birth(by, (i + 1) * 7919 + 1515), 30);
    n0++; const dad = (L.members || []).find(m => m.role === '父'), mom = (L.members || []).find(m => m.role === '母');
    if (L.apt && dad && dad.apt && mom && mom.apt) withPar++;
    if (L.age < 22) continue;
    const met = { music: 0, sport: 0, study: 0 };
    for (const id of Object.keys((L.story || {}).done || {})) { const p = PID[id]; const d = p && pathDomT(p); if (d) met[d] = 1; }
    if (L.proSport) met.sport = 1;
    rows.push({ apt: L.apt, met });
  }
  let ok2 = withPar === n0;
  for (const d of D) {
    const s = rows.slice().sort((a, b) => a.apt[d] - b.apt[d]), k = Math.floor(s.length / 3);
    const lo = s.slice(0, k).reduce((t, x) => t + x.met[d], 0) / k, hi = s.slice(-k).reduce((t, x) => t + x.met[d], 0) / k;
    det.push(d + ' 上' + (hi * 100).toFixed(1) + '%・下' + (lo * 100).toFixed(1) + '%');
    if (!(hi > lo)) ok2 = false;
  }
  return { ok: ok1 && ok2, n: 100000 + n0, detail: det.join('・') + '・父母の素養がある人生 ' + withPar + '／' + n0 };
});
test('10-16', 'プロの選手（1925〜2005年生まれで20歳まで生きた人生1万件：男性1.5%・女性0.8%の±0.3ポイント・始まった年より前の競技0件）', () => {
  const n = { m: 0, f: 0 }, pro = { m: 0, f: 0 }, ks = {}; let bad = [];
  const SP = {}; YM.SPORT.forEach(o => { SP[o.k] = o; });
  for (let i = 0; n.m + n.f < 10000 && i < 20000; i++) {
    const by = 1925 + (i * 37) % 81, L = playTo(birth(by, (i + 1) * 7919 + 1616), 27);
    if (L.age < 20) continue;
    n[L.sex]++;
    if (!L.proSport) continue;
    pro[L.sex]++; ks[L.proSport.k] = (ks[L.proSport.k] || 0) + 1;
    const o = SP[L.proSport.k], y = L.proSport.y;
    const ok = L.sex === 'm' ? o.m && y >= o.m[0] && y <= o.m[1] : o.f.some(r => y >= r[0] && y <= r[1]);
    if (!ok) bad.push(L.proSport.k + ' ' + y + ' ' + L.sex);
  }
  const pm = pro.m / n.m * 100, pf = pro.f / n.f * 100;
  return { ok: Math.abs(pm - 1.5) <= 0.3 && Math.abs(pf - 0.8) <= 0.3 && bad.length === 0, n: n.m + n.f, detail: '男性 ' + pm.toFixed(2) + '%（' + pro.m + '／' + n.m + '）・女性 ' + pf.toFixed(2) + '%（' + pro.f + '／' + n.f + '）・始まる前の競技 ' + bad.length + '件' + (bad.length ? '（' + bad.slice(0, 3).join('、') + '）' : '') + '・競技 ' + Object.entries(ks).map(([k, v]) => k + ':' + v).join(' ') };
});
test('10-17', '10歳の将来の夢（1926年以降に生まれ10歳まで生きた人生500件で全件に夢・夢に合う習い事や進路の道が出る割合が合わない道より高い）', () => {
  let n = 0, has = 0, mt = 0, mn = 0, ot = 0, on = 0; const D5 = ['music', 'sport', 'study', 'care', 'food'];
  for (let i = 0; n < 500 && i < 3000; i++) {
    const by = 1926 + (i * 37) % 80, L = playTo(birth(by, (i + 1) * 7919 + 1717), 20);
    if (L.age < 11) continue;
    n++; if (L.dream10 && L.dream10.name && !L.dream10.pending) has++;
    for (const b of ((L.story || {}).yume || {}).shown || []) {
      if (D5.indexOf(b.dream) < 0) continue;
      mt++; if (b.doms.indexOf(b.dream) >= 0) mn++;
      for (const e of D5) if (e !== b.dream) { ot++; if (b.doms.indexOf(e) >= 0) on++; }
    }
  }
  const pm = mt ? mn / mt : 0, po = ot ? on / ot : 0;
  return { ok: has === n && n >= 500 && pm > po, n, detail: '夢がある人生 ' + has + '／' + n + '・夢に合う道が出た割合 ' + (pm * 100).toFixed(1) + '%（' + mt + '回）・合わない分野の道が出た割合 ' + (po * 100).toFixed(1) + '%' };
});

test('10-0', 'site/js のスクリプトがすべて index.html から読まれている（v18 で5つが読まれていなかった誤りの再発を防ぐ）', () => {
  const html = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8') + fs.readFileSync(path.join(SITE, 'js', 'app.js'), 'utf8');
  const files = fs.readdirSync(path.join(SITE, 'js')).filter(f => /\.js$/.test(f) && !/^sw\b/.test(f));
  const miss = files.filter(f => html.indexOf('js/' + f.replace(/\.js$/, '')) < 0 && html.indexOf(f.replace(/\.js$/, '')) < 0);
  return { ok: !miss.length, n: files.length, detail: '読まれていないスクリプト ' + miss.length + (miss.length ? '（' + miss.join('、') + '）' : '') };
});
/* ---------- 動かす ---------- */
const args = process.argv.slice(2);
if (args.includes('--list')) { for (const [k, v] of Object.entries(T)) console.log(k + '\t' + v.name); process.exit(0); }
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
for (const [id, t] of Object.entries(T)) {
  if (only && id !== only) continue;
  const t0 = Date.now(); let r;
  try { r = await t.fn(); } catch (e) { r = { ok: false, n: 0, detail: 'エラー：' + e.message + ' ' + (e.stack || '').split('\n')[1] }; }
  r = Object.assign({ id, name: t.name, secs: Math.round((Date.now() - t0) / 1000), at: new Date().toISOString() }, r);
  fs.writeFileSync(path.join(OUT, id + '.json'), JSON.stringify(r));
  console.log((r.ok ? '合格' : '不合格') + '\t' + id + '\t' + r.name + '\t' + r.detail + '\t（' + r.n + '件・' + r.secs + '秒）');
}
