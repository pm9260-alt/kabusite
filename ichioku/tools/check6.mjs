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
  return { ok: rate === 0 && away.length === 0, n: Ls.length, detail: '丁寧体でない文 ' + rate + '件' + (rate ? '（' + [...new Set(plain)].slice(0, 4).join('／') + '）' : '') + '・離れた人向けの文 ' + away.length + '件' };
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
  for (const L of Ls) for (const e of texts(L)) if (/縁談|見合い|再婚した|と結婚した/.test(e.t) && /^[^。]*[ぁ-んァ-ン一-龥]+(との縁談|と再婚|と結婚)/.test(e.t)) { n++; if (!/\d+歳/.test(e.t)) { bad++; if (!ex) ex = e.t.slice(0, 30); } }
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

/* ---------- 動かす ---------- */
const args = process.argv.slice(2);
if (args.includes('--list')) { for (const [k, v] of Object.entries(T)) console.log(k + '\t' + v.name); process.exit(0); }
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
for (const [id, t] of Object.entries(T)) {
  if (only && id !== only) continue;
  const t0 = Date.now(); let r;
  try { r = t.fn(); } catch (e) { r = { ok: false, n: 0, detail: 'エラー：' + e.message + ' ' + (e.stack || '').split('\n')[1] }; }
  r = Object.assign({ id, name: t.name, secs: Math.round((Date.now() - t0) / 1000), at: new Date().toISOString() }, r);
  fs.writeFileSync(path.join(OUT, id + '.json'), JSON.stringify(r));
  console.log((r.ok ? '合格' : '不合格') + '\t' + id + '\t' + r.name + '\t' + r.detail + '\t（' + r.n + '件・' + r.secs + '秒）');
}
