/* 1000分の1 人生の進め方（本体）
   ブラウザでも Node でも同じものを使う。画面は app.js、検査は tools/check.mjs が呼ぶ。 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Ichioku = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var FUTURE_FROM = 2027;          // これ以降は統計がない年（6-5）
  var MAX_AGE = 110;
  var CATS = ['家庭', '地域', '時代', '健康', '人間関係', '学歴と仕事'];
  // 場面の種類ごとのねらいの割合（2章の偏り防止）
  var TARGET = { '家庭': 0.17, '地域': 0.15, '時代': 0.21, '健康': 0.14, '人間関係': 0.19, '学歴と仕事': 0.14 };
  var PREF_CODE = { '北海道': '01', '宮城県': '04', '東京都': '13', '神奈川県': '14', '愛知県': '23', '大阪府': '27', '広島県': '34', '香川県': '37', '福岡県': '40' };
  var HUB = { '北海道': '北海道', '東北': '宮城県', '関東': '東京都', '中部': '愛知県', '近畿': '大阪府', '中国': '広島県', '四国': '香川県', '九州': '福岡県' };
  var IND = {
    agri: { name: '農業', job: '農業' },
    fish: { name: '漁業', job: '漁業' },
    factory: { name: '製造業', job: '工場勤め' },
    build: { name: '建設業', job: '建設の仕事' },
    office: { name: '事務・営業', job: '会社勤め（事務・営業）' },
    shop: { name: '小売業', job: '自営の商店' },
    pub: { name: '公務', job: '公務員' },
    care: { name: '医療・福祉・教育', job: '医療や福祉の仕事' },
    service: { name: '飲食・サービス業', job: '飲食やサービスの仕事' }
  };
  var DIRECTION = { office: ['office', 'pub'], tech: ['factory', 'build'], care: ['care'], service: ['service', 'shop'] };
  var DIR_WORD = { office: '事務や営業', tech: 'ものづくりや技術', care: '医療・福祉・教育', service: '店やサービス' };

  /* ---------- 乱数と数表 ---------- */
  function makeRng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(rnd) {
    var u = 1 - rnd(), v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function clamp(x, lo, hi) { return x < lo ? lo : x > hi ? hi : x; }
  // 標準正規分布の逆関数（Acklam の近似）
  function invNorm(p) {
    p = clamp(p, 1e-9, 1 - 1e-9);
    var a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
    var b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155211539];
    var c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
    var d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
    var q, r;
    if (p < 0.02425) {
      q = Math.sqrt(-2 * Math.log(p));
      return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
    if (p > 1 - 0.02425) {
      q = Math.sqrt(-2 * Math.log(1 - p));
      return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
    q = p - 0.5; r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  function pick(rnd, list, wfn) {
    var tot = 0, i, w = new Array(list.length);
    for (i = 0; i < list.length; i++) { w[i] = Math.max(0, wfn(list[i])); tot += w[i]; }
    if (tot <= 0) return list.length ? list[Math.floor(rnd() * list.length)] : null;
    var x = rnd() * tot;
    for (i = 0; i < list.length; i++) { x -= w[i]; if (x < 0) return list[i]; }
    return list[list.length - 1];
  }

  // 年ごとの値 {年: 値}。その年がなければいちばん近い年の値を使う（8章 過去の年代の扱い）
  var seriesCache = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  function nv(series, year) {
    if (!series) return null;
    var s = seriesCache && seriesCache.get(series);
    if (!s) {
      var ys = Object.keys(series).map(Number).sort(function (x, y) { return x - y; });
      s = { ys: ys, vs: ys.map(function (k) { return series[k]; }) };
      if (seriesCache) seriesCache.set(series, s);
    }
    var lo = 0, hi = s.ys.length - 1;
    if (hi < 0) return null;
    if (year <= s.ys[0]) return { v: s.vs[0], y: s.ys[0] };
    if (year >= s.ys[hi]) return { v: s.vs[hi], y: s.ys[hi] };
    while (hi - lo > 1) { var m = (lo + hi) >> 1; if (s.ys[m] <= year) lo = m; else hi = m; }
    var pickHi = (s.ys[hi] - year) < (year - s.ys[lo]);
    var k = pickHi ? hi : lo;
    return { v: s.vs[k], y: s.ys[k] };
  }
  function val(series, year) { var r = nv(series, year); return r ? r.v : 0; }
  // きょうだいの人数の割合：配列ならそのまま、生まれ年ごとの表なら前後の世代の間をならす
  function sibDistFor(t, by) {
    if (Array.isArray(t)) return t;
    var ks = Object.keys(t).map(Number).sort(function (a, b) { return a - b; });
    if (by <= ks[0]) return t[ks[0]];
    if (by >= ks[ks.length - 1]) return t[ks[ks.length - 1]];
    for (var i = 1; i < ks.length; i++) if (by <= ks[i]) {
      var a = ks[i - 1], b = ks[i], w = (by - a) / (b - a);
      return t[a].map(function (x, j) { return x * (1 - w) + t[b][j] * w; });
    }
  }

  /* ---------- 根拠（出来事を押すと出る統計） ---------- */
  function ev(C, src, year, what, value, extra) {
    var e = { src: src, name: (C.sources[src] || {}).name || src, org: (C.sources[src] || {}).org || '', y: year, what: what, val: value, prov: !!C.meta.provisional };
    if (extra) for (var k in extra) e[k] = extra[k];
    return e;
  }
  function pct(v) { return Math.round(v * 100) + '%'; }

  /* ---------- 死亡の確率（生命表から作った係数を使う） ---------- */
  // 簡易生命表の年齢ごとの死亡率の形（mort.shape）に、その年・その県の平均寿命に合う強さ（alpha）を掛ける。
  // 形の表がないときは、なだらかな曲線（ゴンペルツの式）で近似する
  function shapeRow(S, sex, year) {
    var ys = S.years, best = ys[0];
    for (var i = 1; i < ys.length; i++) if (Math.abs(ys[i] - year) < Math.abs(best - year)) best = ys[i];
    return S[sex][best];
  }
  function deathProb(C, P, sex, age, year) {
    var tab = (P && P.alpha) ? P.alpha : C.mort.alpha;
    var alpha = val(tab[sex], year), beta = C.mort.beta, bg = C.mort.bg;
    if (age === 0) return val(C.mort.q0, year);
    if (C.mort.shape) {
      var row = shapeRow(C.mort.shape, sex, year);
      return clamp(1 - Math.pow(1 - row[Math.min(age, row.length - 1)], alpha), 0, 1);
    }
    var h = alpha / beta * (Math.exp(beta * (age + 1)) - Math.exp(beta * age)) + bg;
    return clamp(1 - Math.exp(-h), 0, 1);
  }

  /* ---------- 名前（生まれた年の流行に合わせる。家族の中で重ねない） ---------- */
  function nameFor(L, sex, by) {
    var keys = Object.keys(L.C.names).map(Number).sort(function (a, b) { return a - b; });
    var k = keys[0];
    for (var i = 0; i < keys.length; i++) if (keys[i] <= by) k = keys[i];
    var list = withPool(L.C.names[k][sex], by, sex);
    var used = {};
    L.members.forEach(function (m) { used[m.name] = 1; });
    if (L.name) used[L.name] = 1;
    var free = list.filter(function (n) { return !used[n]; });
    if (!free.length) free = L.C.names[keys[keys.length - 1]][sex].filter(function (n) { return !used[n]; });
    return free.length ? free[Math.floor(L.rnd() * free.length)] : list[0] + '（二）';
  }
  // 上位10の名前に、その時代によくある名前（js/names.js）を足す
  function namesMod() {
    if (typeof self !== 'undefined' && self.IchiokuNames) return self.IchiokuNames;
    if (typeof require === 'function') { try { return require('./names.js'); } catch (e) { return null; } }
    return null;
  }
  function withPool(top, by, sex) {
    var N = namesMod(), pool = N ? N.modernPool(by, sex) : [];
    var out = top.slice();
    pool.forEach(function (n) { if (out.indexOf(n) < 0) out.push(n); });
    return out;
  }

  /* ---------- 物語の分かれ道（js/story.js）とのつなぎ ---------- */
  function jobsMod() {
    if (typeof self !== 'undefined' && self.IchiokuJobs) return self.IchiokuJobs;
    if (typeof require === 'function') { try { return require('./jobs.js'); } catch (e) { return null; } }
    return null;
  }
  function storyMod() {
    if (typeof self !== 'undefined' && self.IchiokuStory) return self.IchiokuStory;
    if (typeof require === 'function') { try { return require('./story.js'); } catch (e) { return null; } }
    return null;
  }
  // 物語で使う名前：本体の乱数を使わない（ほかの抽選の順番を変えない）
  function storyName(L, sex, by) {
    var keys = Object.keys(L.C.names).map(Number).sort(function (a, b) { return a - b; });
    var k = keys[0];
    for (var i = 0; i < keys.length; i++) if (keys[i] <= by) k = keys[i];
    var list = withPool(L.C.names[k][sex], by, sex), used = {};
    L.members.forEach(function (m) { used[m.name] = 1; });
    if (L.name) used[L.name] = 1;
    var free = list.filter(function (n) { return !used[n]; });
    return (free.length ? free : list)[Math.floor(L.story.r() * (free.length || list.length))];
  }
  function storyMove(L, where) {
    if (where !== 'home') { L.place = { pref: '13', prefName: '東京都', muni: null, muniName: '', kind: '都市', away: true, muniObj: null }; return; }
    var m = homeMuni(L);
    L.place = { pref: L.home.pref, prefName: L.home.prefName, muni: L.home.muni, muniName: L.home.muniName, kind: m ? m.kind : '都市', away: false, muniObj: m };
  }
  // 戦時中（1938〜1945年）に出せない場面と選択（縁日の夜店・旅人を泊める など。v8の直し 3）
  var WAR_BAN = /綿菓子|金魚すくい|夜店|縁日|旅人|花火大会|海水浴|行楽|物見遊山/;
  var STORY_API = {
    WAR_BAN: WAR_BAN, homeLife: function (L) { return homeLife(L); },
    surv5: function (L) { var l = 1; for (var a = 0; a < 5; a++) l *= 1 - deathProb(L.C, L.P, L.sex, a, L.by + a); return l; },
    makeRng: makeRng, gauss: gauss, eraWords: function (t, y, L) { return eraWords(t, y, L); }, push: function (L, rec, cat, t, evs) { return push(L, rec, cat, t, evs); }, nameFor: storyName, move: storyMove,
    job: function (L, label, pay, reg, ind) { L.job = { ind: IND[ind] ? ind : (L.job && L.job.ind) || 'service', reg: !!reg, since: L.year, pay: pay, label: label }; L.lastJob = label; L.lastInd = L.job.ind; L.stage = 'work'; },
    noJob: function (L) { if (L.job) { L.job = null; L.stage = 'jobless'; } },
    marryBoost: function (L, k) { L.marryMult = (L.marryMult || 1) * k; }
  };
  function storyYear(L, rec) { var S = storyMod(); if (S && L.alive) S.year(L, rec, STORY_API); }

  function addMember(L, role, sex, by, extra) {
    var m = { id: L.members.reduce(function (x, o) { return Math.max(x, o.id); }, 0) + 1, role: role, sex: sex, by: by, alive: true, dy: null };
    if (extra) for (var k in extra) m[k] = extra[k];
    m.name = nameFor(L, sex, by);
    L.members.push(m);
    return m;
  }
  function relWord(L, m) {
    if (m.role === '配偶者') return m.sex === 'm' ? '夫' : '妻';
    if (m.role === '子') return m.order;
    if (m.role === '孫') return '孫';
    return m.role;
  }
  function living(L, role) {
    return L.members.filter(function (m) {
      return m.alive && m.by <= L.year && (role === 'きょうだい' ? m.sib : m.role === role) && !m.gone;
    });
  }

  /* ---------- 生まれる ---------- */
  function pickPref(C, year, rnd) {
    var p = pick(rnd, C.prefs, function (x) { return val(x.births, year); });
    return p.code;
  }
  function pickMuni(P, year, rnd, exceptCode) {
    var list = P.munis.filter(function (m) { return m.code !== exceptCode; });
    return pick(rnd, list, function (m) { return val(m.share, year); });
  }

  /* ---------- きょうだいとして生きる（1975年以降の生まれ。history.js と同じ考え方） ---------- */
  var FAMILY_ROLES = ['父', '母', '祖父', '祖母'];
  function houseOf(L, chain) {
    // 家が住んでいた場所：本人が18歳になるまでは本人の場所、そのあとは生まれた場所
    var place = L.age < 18 && !L.place.away ? L.place : null;
    var moves = [];
    var prevMuni = L.home.muni;
    L.log.forEach(function (r) { if (r.age < 18 && r.pin && r.pin.muni && r.pin.muni !== prevMuni) { moves.push({ year: r.year, muni: r.pin.muni }); prevMuni = r.pin.muni; } });
    var mem = L.members.filter(function (m) { return m.sib || FAMILY_ROLES.indexOf(m.role) >= 0; }).map(function (m) {
      var o = {}; for (var k in m) if (k !== 'fixDy') o[k] = m[k]; return o;
    });
    return {
      old: false, seed: L.seed0 || L.seed, deathYear: L.deathYear, deathAge: L.deathAge, cause: L.cause,
      prev: { name: L.name, sex: L.sex, by: L.by, surname: L.surname || null },
      members: mem, homeMuni: L.home.muni, placeMuni: place ? place.muni : L.home.muni, moves: moves,
      incPct: L.incPct, adoptU: L.adoptU, parentEdu: L.parentEdu, dadJob: L.dadJob, momJob: L.momJob, dadJobD: L.dadJobD || null, momJobD: L.momJobD || null, ownHome: L.ownHome, threeGen: L.threeGen, income: L.income, goods: L.goods || {},
      chain: (chain || []).slice(), story: L.story ? { toxic: !!L.story.f.toxic, bigwig: !!L.story.f.bigwig, prosper: L.story.f.prosper || L.story.f.prosperHouse || 0 } : null
    };
  }
  function sibRole(sex, by, myBy) { return by < myBy ? (sex === 'm' ? '兄' : '姉') : (sex === 'm' ? '弟' : '妹'); }
  function heirCandidates(L) {
    var dy = L.deathYear, momAlive = L.mom && L.mom.alive;
    return L.members.filter(function (m) { return m.sib && !m.gone && ((m.by > dy && momAlive) || (m.alive && m.by <= dy)); }).map(function (m) {
      return { id: m.id, role: m.role, name: m.by > dy ? null : m.name, sex: m.sex, by: m.by, age: m.by > dy ? null : dy - m.by, later: m.by > dy ? m.by - dy : 0 };
    });
  }
  // 子として生きる：亡くなった人の子（亡くなった年に生きている子）
  function kidLabel(L, m) {
    var same = L.members.filter(function (x) { return x.role === '子' && x.sex === m.sex; }).sort(function (a, b) { return a.by - b.by || a.id - b.id; });
    var n = same.indexOf(m), NUM = ['長', '次', '三', '四', '五', '六', '七', '八', '九'];
    return (NUM[n] || (n + 1) + '番目の') + (m.sex === 'm' ? '男' : '女');
  }
  function childCandidates(L) {
    var dy = L.deathYear;
    return L.members.filter(function (m) { return m.role === '子' && !m.gone && m.alive && m.by <= dy; }).sort(function (a, b) { return a.by - b.by; }).map(function (m) {
      return { id: m.id, role: kidLabel(L, m), name: m.name, sex: m.sex, by: m.by, age: dy - m.by, later: 0, child: true };
    });
  }
  // 子の目から見た家：亡くなった人と配偶者が親、ほかの子がきょうだい、亡くなった人の親が祖父母
  var EDU4 = { '中学': '中学', '高校': '高校', '短大・専門': '短大・高専', '大学': '大学' };
  function childHouse(L, memberId, chain) {
    var h = houseOf(L, chain), kid = L.members.filter(function (m) { return m.id === memberId; })[0];
    if (!kid) throw new Error('引き継ぐ子がいない');
    var r2 = makeRng(((L.seed ^ Math.imul(memberId, 0x85ebca6b)) >>> 0) || 1);
    var pRole = L.sex === 'm' ? '父' : '母', oRole = L.sex === 'm' ? '母' : '父', side = L.sex === 'm' ? '父方' : '母方';
    var sp = L.members.filter(function (m) { return m.role === '配偶者'; }).sort(function (a, b) { return Math.abs(a.by - L.by) - Math.abs(b.by - L.by); })[0];
    var mem = [], maxId = 0;
    L.members.forEach(function (m0) {
      maxId = Math.max(maxId, m0.id);
      var role = m0.role === '子' ? 'kid' : m0 === sp ? oRole : m0.role === '父' ? '祖父' : m0.role === '母' ? '祖母' : null;
      if (!role) return;
      var o = {}; for (var k in m0) if (k !== 'fixDy') o[k] = m0[k];
      if (role === 'kid') { o.sib = true; o.role = '子'; }
      else { o.sib = false; o.role = role; if (role === '祖父' || role === '祖母') o.side = side; else delete o.side; }
      mem.push(o);
    });
    if (!sp) mem.push({ id: maxId + 2, role: oRole, sex: L.sex === 'm' ? 'f' : 'm', by: L.by + (L.sex === 'm' ? 2 : -2), name: null, alive: true, dy: null, gone: true });
    // 生まれた場所：その子が生まれた年に親が住んでいた所
    var at = L.log.filter(function (r) { return r.year === kid.by; })[0], pin = at && at.pin && !at.pin.abroad ? at.pin : null;
    h.homeMuni = pin && pin.muni ? pin.muni : L.home.muni;
    h.pref = pin && pin.pref ? pin.pref : L.home.pref;
    var moves = [], prev = h.homeMuni, lastMuni = h.homeMuni;
    L.log.forEach(function (r) { if (r.year > kid.by && r.year < kid.by + 18 && r.pin && r.pin.muni && !r.pin.abroad && r.pin.muni !== prev) { moves.push({ year: r.year, muni: r.pin.muni }); prev = r.pin.muni; } if (r.pin && r.pin.muni && !r.pin.abroad) lastMuni = r.pin.muni; });
    h.moves = moves;
    h.placeMuni = L.deathYear - kid.by < 18 ? lastMuni : h.homeMuni;
    var myEdu = EDU4[L.edu] || '中学', spEdu = sp && sp.edu ? sp.edu : myEdu;
    h.parentEdu = L.sex === 'm' ? { dad: myEdu, mom: spEdu } : { dad: spEdu, mom: myEdu };
    var myInd = L.lastInd != null ? L.lastInd : null, ind = (muniOf(L.P, h.homeMuni) || {}).ind || L.C.nat.indNat;
    var otherInd = pickInd(r2, ind);
    h.dadJob = L.sex === 'm' ? (myInd != null ? myInd : otherInd) : otherInd;
    h.momJob = L.sex === 'f' ? myInd : (r2() < 0.5 ? pickInd(r2, ind) : null);
    var eduRank = { '中学': 0.3, '高校': 0.45, '短大・高専': 0.6, '大学': 0.75 }[myEdu];
    h.incPct = Math.min(0.99, Math.max(0.01, 0.5 * L.incPct + 0.5 * eduRank + (r2() - 0.5) * 0.2));
    h.threeGen = false;
    h.members = mem;
    h.gen = 'child';
    return h;
  }
  function muniOf(P, code) { return P.munis.filter(function (m) { return m.code === code; })[0] || null; }
  function inheritLife(C, P, opts) {
    var h = opts.house, me = h.members.filter(function (m) { return m.id === opts.memberId; })[0];
    if (!me) throw new Error('引き継ぐきょうだいがいない');
    var seed = (opts.seed >>> 0) || 1, rnd = makeRng(seed);
    // 生まれた場所：そのきょうだいが生まれた年に家が住んでいた所
    var hm = h.homeMuni;
    h.moves.forEach(function (mv) { if (mv.year <= me.by) hm = mv.muni; });
    if (me.by > h.deathYear) hm = h.placeMuni;
    var muni = muniOf(P, hm) || muniOf(P, h.homeMuni) || P.munis[0];
    var L = {
      C: C, P: P, rnd: rnd, seed: seed, seed0: h.seed, by: me.by, year: me.by, age: 0, sex: me.sex,
      home: { pref: P.code, prefName: P.name, muni: muni.code, muniName: muni.name },
      place: { pref: P.code, prefName: P.name, muni: muni.code, muniName: muni.name, kind: muni.kind, away: false, muniObj: muni },
      members: [], used: {}, cat: {}, catTotal: 0, alive: true, stage: 'child',
      ab: { study: gauss(rnd), body: gauss(rnd), social: gauss(rnd) },
      edu: null, school: null, job: null, married: false, everMarried: false, kids: 0,
      goods: {}, queue: [], log: [], branchCount: 0,
      stats: { univ: false, emptyYears: 0, dupes: 0, nonreg: {}, atHome30: null, events: 0 },
      earn: { real: 0, nominal: 0, years: 0, nonregYears: 0, futureYears: 0 },
      inherited: true, surname: h.prev.surname || null
    };
    CATS.forEach(function (c) { L.cat[c] = 0; });
    L.house = { deathYear: h.deathYear, prevName: h.prev.name, prevSex: h.prev.sex, prevBy: h.prev.by, prevAge: h.deathAge, moves: h.moves, chain: h.chain, story: h.gen === 'child' ? (h.story && h.story.prosper ? { prosper: h.story.prosper } : null) : h.story };
    var maxId = 0;
    h.members.forEach(function (m0) {
      maxId = Math.max(maxId, m0.id);
      if (m0.id === me.id) return;
      var m = {}; for (var k in m0) m[k] = m0[k];
      m.fixDy = m.dy != null && !m.alive && m.dy <= h.deathYear ? m.dy : null;
      if (m.sib) m.role = sibRole(m.sex, m.by, me.by);
      if (!m.gone) { m.alive = !(m.fixDy != null && m.fixDy < me.by); m.before = !m.alive; if (m.alive) m.dy = null; else m.dy = m.fixDy; }
      L.members.push(m);
    });
    var kidGen = h.gen === 'child';
    var pv = { id: maxId + 1, role: kidGen ? (h.prev.sex === 'm' ? '父' : '母') : sibRole(h.prev.sex, h.prev.by, me.by), sex: h.prev.sex, by: h.prev.by, name: h.prev.name, sib: !kidGen, alive: true, dy: null, fixDy: h.deathYear, prevLife: true };
    if (pv.fixDy < me.by) { pv.alive = false; pv.before = true; pv.dy = pv.fixDy; }
    L.members.push(pv);
    L.dad = L.members.filter(function (m) { return m.role === '父'; })[0];
    L.mom = L.members.filter(function (m) { return m.role === '母'; })[0];
    L.members.forEach(function (m) { if (!m.name) m.name = nameFor(L, m.sex, m.by); });
    L.name = me.name || nameFor(L, L.sex, L.by);
    if (kidGen) L.house.gen = 'child';
    L.fAge = L.by - L.dad.by; L.mAge = L.by - L.mom.by;
    L.sibs = L.members.filter(function (m) { return m.sib && !m.gone; }).length;
    L.incPct = h.incPct; L.adoptU = h.adoptU; L.parentEdu = h.parentEdu; L.dadJob = h.dadJob; L.momJob = h.momJob; L.dadJobD = h.dadJobD || null; L.momJobD = h.momJobD || null;
    L.ownHome = h.ownHome; L.threeGen = h.threeGen; L.income = h.income;
    L.ab.study += (L.parentEdu.dad === '大学' || L.parentEdu.mom === '大学') ? 0.25 : 0;
    for (var g in h.goods) if (h.goods[g] <= L.by) L.goods[g] = h.goods[g];
    C.goods.forEach(function (gg) { if (!L.goods[gg.id] && goodsOk(gg, L.by) && val(gg.diff, L.by) / 100 >= L.adoptU) L.goods[gg.id] = L.by; });
    L.protectUntil = h.deathYear;
    L.sm = drawMinority(L);
    L.out = null;
    return L;
  }
  // ほかの抽選の順番を変えないための別の乱数
  function rnd2(L) { if (!L.r2) L.r2 = makeRng(((L.seed ^ 0x2545f491) >>> 0) || 1); return L.r2(); }
  // 妻の氏を選んだ結婚（夫妻の氏別婚姻件数。2014年以前は2015年の値）
  function wifeNameYear(L, rec) {
    var t = L.C.nat.wifeName;
    if (!t || !Object.keys(t).length) return;
    var v = val(t, L.year);
    if (rnd2(L) >= v) return;
    push(L, rec, '家庭', L.sex === 'm' ? '結婚して、妻の名字を名乗ることにした。' : '結婚して、夫が自分の名字を名乗ることになった。', [ev(L.C, 'vital', nv(t, L.year).y, '婚姻届で妻の氏を選んだ夫婦の割合（夫妻の氏別婚姻件数）', (v * 100).toFixed(1) + '%')]);
  }
  // 戦後の形：家制度はなくなったが、長男が家や墓を継ぐ考え方は残った（分かれ道にはせず、出来事として出す）
  function eldestSon(L) { return L.sex === 'm' && !L.members.some(function (m) { return m.sib && m.sex === 'm' && m.by < L.by && m.alive && !m.gone; }); }
  function postwarYear(L, rec) {
    var y = L.year, a = L.age;
    if (y < 1948 || !eldestSon(L) || L.place.away && a < 40) return;
    if (!L.grave && L.dad && !L.dad.alive && L.dad.dy === y && a >= 18) { L.grave = true; push(L, rec, '家庭', '父が亡くなり、長男として実家の墓を守ることになった。', [ev(L.C, 'census', y, '家制度はなくなったが、長男が家や墓を継ぐ考え方は残った', '', { est: true, noYearNote: true })]); }
    if (!L.withParents && a >= 35 && a <= 55 && L.mom && L.mom.alive && y - L.mom.by >= 70 && rnd2(L) < 0.1) {
      L.withParents = true;
      push(L, rec, '家庭', '年老いた母と同居することになった。', [ev(L.C, 'census', nv(L.C.nat.threeGen[L.place.kind] || L.C.nat.threeGen['都市'], y).y, '三世代で暮らす世帯の割合（' + L.place.kind + '）', pct(val(L.C.nat.threeGen[L.place.kind] || L.C.nat.threeGen['都市'], y)), { est: true })]);
    }
  }
  function fixedYear(L, m) { return L.house && L.year <= L.house.deathYear && m.fixDy !== undefined; }
  // 生まれた年に、前の人生で亡くなった家族（ふだんは0歳の年に家族の死を抽選しないため、記録どおりにここで出す）
  function fixedDeathsAtBirth(L, rec) {
    var y = L.year;
    L.members.forEach(function (m) {
      if (!m.alive || m.gone || m.by >= y || !fixedYear(L, m) || m.fixDy !== y) return;
      m.alive = false; m.dy = y;
      var e = push(L, rec, '家庭', relWord(L, m) + 'の' + m.name + 'が' + (y - m.by) + '歳で亡くなった。', [ev(L.C, 'vital', y, '前の人生で起きた家族の死', '', { noYearNote: true })]);
      if (m.prevLife) e.house = true;
      if (m.prevLife) e.short = relWord(L, m) + 'の' + m.name + 'が亡くなった。';
    });
  }
  function protectedYear(L) { return L.protectUntil != null && L.year <= L.protectUntil; }

  // 品物が家庭に広まり始める年（spec6 1-2）。統計の数字がそれより前にあっても、家族が持つ文は出さない（携帯電話は自動車電話・肩掛けの時代を除く）
  var GOODS_FROM = { mobile: 1995, net: 1995, smart: 2008, pc: 1980 };
  function goodsOk(g, y) { return !(GOODS_FROM[g.id] && y < GOODS_FROM[g.id]); }
  function newLife(C, P, opts) {
    if (opts.house) return inheritLife(C, P, opts);
    var year = opts.year, seed = (opts.seed >>> 0) || 1;
    var rnd = makeRng(seed);
    var muni = opts.muniCode ? P.munis.filter(function (m) { return m.code === opts.muniCode; })[0] : pickMuni(P, year, rnd);
    var L = {
      C: C, P: P, rnd: rnd, seed: seed, by: year, year: year, age: 0,
      sex: rnd() < 0.513 ? 'm' : 'f',
      home: { pref: P.code, prefName: P.name, muni: muni.code, muniName: muni.name },
      place: { pref: P.code, prefName: P.name, muni: muni.code, muniName: muni.name, kind: muni.kind, away: false, muniObj: muni },
      members: [], used: {}, cat: {}, catTotal: 0, alive: true, stage: 'child',
      ab: { study: gauss(rnd), body: gauss(rnd), social: gauss(rnd) },
      edu: null, school: null, job: null, married: false, everMarried: false, kids: 0,
      goods: {}, queue: [], log: [], branchCount: 0,
      stats: { univ: false, emptyYears: 0, dupes: 0, nonreg: {}, atHome30: null, events: 0 },
      earn: { real: 0, nominal: 0, years: 0, nonregYears: 0, futureYears: 0 }
    };
    CATS.forEach(function (c) { L.cat[c] = 0; });
    familyAtBirth(L);
    L.sm = drawMinority(L);
    L.out = null;
    L.surname = modernSurname(L);
    return L;
  }
  // 名字（spec6 2-27：1875年からは全員が名乗る）。その土地に多い名字と全国に多い名字から、別の乱数で引く
  var SURN = ['佐藤', '鈴木', '高橋', '田中', '伊藤', '渡辺', '山本', '中村', '小林', '加藤', '吉田', '山田', '佐々木', '山口', '松本', '井上', '木村', '林', '斎藤', '清水', '山崎', '森', '池田', '橋本', '阿部', '石川', '山下', '中島', '石井', '小川', '前田', '岡田', '長谷川', '藤田', '後藤', '近藤', '村上', '遠藤', '青木', '坂本'];
  var SURN_LOCAL = { '47': ['比嘉', '金城', '大城', '宮城', '新垣', '玉城', '上原', '島袋', '平良', '山城'], '02': ['工藤', '佐藤', '成田', '木村', '中村'], '03': ['佐藤', '高橋', '千葉', '菊地', '佐々木'], '04': ['佐藤', '高橋', '千葉', '阿部', '菅原'], '05': ['佐藤', '高橋', '佐々木', '伊藤', '斎藤'], '06': ['佐藤', '高橋', '鈴木', '斎藤', '渡部'], '07': ['佐藤', '鈴木', '渡辺', '遠藤', '斎藤'], '15': ['佐藤', '渡辺', '小林', '高橋', '五十嵐'], '20': ['小林', '田中', '中村', '丸山', '宮沢'], '40': ['田中', '中村', '古賀', '井上', '吉田'], '41': ['山口', '古賀', '田中', '松尾', '中島'], '42': ['山口', '田中', '松尾', '中村', '松本'], '43': ['田中', '中村', '松本', '村上', '坂本'], '45': ['黒木', '甲斐', '河野', '日高', '佐藤'], '46': ['中村', '浜田', '山下', '前田', '川畑'] };
  function modernSurname(L) {
    var r = makeRng(((L.seed ^ 0x3c6ef372) >>> 0) || 1), x = r(), loc = SURN_LOCAL[String(L.home.pref)];
    if (loc && (L.home.pref === '47' ? x < 0.85 : x < 0.4)) return loc[Math.floor(r() * loc.length)];
    return SURN[Math.floor(r() * SURN.length)];
  }

  // 性的少数者かどうか（国の委託調査の出現率をもとに抽選。null は該当しない）
  function drawMinority(L) {
    var r = (L.C.nat.minority || {})[L.sex];
    if (!r) return null;
    var u = L.rnd(), acc = 0;
    for (var k in r) { acc += r[k]; if (u < acc) return k; }
    return null;
  }
  // 人口カバー率は確かめた年（2024年以降）だけ数字を出す。制度は2015年11月の渋谷区・世田谷区から
  function coverText(C, y) { return y < 2015 ? 'まだない' : y < 2024 ? '広がり始めた時期（年ごとの数字は未確認）' : pct(val(C.nat.partnerCover, y)); }
  function samesex(L) { return L.sm === 'gay' || L.sm === 'lesbian'; }
  // パートナーシップ制度がその年・その場所で使えるか
  function partnerOk(L) {
    var from = (L.C.nat.partnerFrom || {})[L.place.pref];
    if (!from) from = (L.C.nat.partnerFrom || {}).other || 9999;
    return L.year >= from;
  }

  function familyAtBirth(L) {
    var C = L.C, P = L.P, rnd = L.rnd, y = L.year;
    var mAge = Math.round(clamp(val(C.nat.motherAge, y) + gauss(rnd) * 4.2, 18, 44));
    var fAge = Math.round(clamp(mAge + 2.5 + gauss(rnd) * 3.2, 18, 50));
    L.incPct = rnd();
    L.adoptU = rnd();
    // 親の学歴（親の生まれ年の割合。年収と結びつける）
    var dadBy = y - fAge, momBy = y - mAge;
    L.parentEdu = { dad: eduDraw(L, 'm', dadBy), mom: eduDraw(L, 'f', momBy) };
    var dad = addMember(L, '父', 'm', dadBy, { edu: L.parentEdu.dad });
    var mom = addMember(L, '母', 'f', momBy, { edu: L.parentEdu.mom });
    // 祖父母
    [['祖父', 'm', dadBy, '父方'], ['祖母', 'f', dadBy, '父方'], ['祖父', 'm', momBy, '母方'], ['祖母', 'f', momBy, '母方']].forEach(function (g) {
      var by = g[2] - Math.round(24 + rnd() * 10 + (g[1] === 'm' ? 2 : 0));
      var m = addMember(L, g[0], g[1], by, { side: g[3] });
      if (!surviveUntil(L, m, y)) { m.alive = false; m.dy = m.dy || y - 1; m.before = true; }
    });
    // きょうだい
    // 母の生まれ年に近い世代の「子どもの数の割合」から、子どもの側から見た人数（人数の多い家ほど当たりやすい）で引く
    var sd = sibDistFor(C.nat.sibDist, momBy);
    var k = pick(rnd, [1, 2, 3, 4], function (n) { return n * sd[n - 1]; });
    L.sibK = k;
    var pos = Math.floor(rnd() * k);
    var gaps = [], i;
    for (i = 0; i < k; i++) gaps.push(i === 0 ? 0 : 2 + Math.floor(rnd() * 3));
    var offs = [], acc = 0;
    for (i = 0; i < k; i++) { acc += gaps[i]; offs.push(acc); }
    var mine = offs[pos];
    L.sibs = 0;
    for (i = 0; i < k; i++) {
      if (i === pos) continue;
      var sby = y + (offs[i] - mine);
      var mAt = sby - momBy;
      if (mAt < 18 || mAt > 44) continue;
      var ss = rnd() < 0.513 ? 'm' : 'f';
      var older = sby < y;
      var role = older ? (ss === 'm' ? '兄' : '姉') : (ss === 'm' ? '弟' : '妹');
      addMember(L, role, ss, sby, { sib: true });
      L.sibs++;
    }
    L.name = null; L.name = nameFor(L, L.sex, y);
    // 仕事と住まい
    var ind = L.place.muniObj.ind;
    L.dadJob = pickInd(rnd, ind);
    var dual = rnd() < val(C.nat.dualIncome, y);
    L.momJob = dual ? pickInd(rnd, ind) : null;
    parentJobs(L);
    var own = val(C.nat.ownHome[L.place.kind], y);
    L.ownHome = rnd() < clamp(own + (L.incPct - 0.5) * 0.4, 0.05, 0.97);
    var tg = val(C.nat.threeGen[L.place.kind], y);
    var gpa = L.members.filter(function (m) { return m.side === '父方' && m.alive; });
    L.threeGen = gpa.length > 0 && rnd() < tg;
    if (L.threeGen) gpa.forEach(function (m) { m.live = true; });
    // 家庭の年収（その年の都道府県の所得分布から）
    var mean = val(C.nat.incomeMean, y) * val(P.s.income, y);
    var sigma = C.nat.incomeSigma;
    L.income = Math.round(mean / Math.exp(sigma * sigma / 2) * Math.exp(sigma * invNorm(L.incPct)));
    L.ab.study += (L.parentEdu.dad === '大学' || L.parentEdu.mom === '大学') ? 0.25 : 0;
    // 家に物が来る時期（年収の高い家庭・都市部ほど早い）
    L.adoptU = clamp(L.adoptU + 0.25 * (0.5 - L.incPct) + ({ '大都市': -0.06, '都市': 0, '町村': 0.07 })[L.place.kind], 0.002, 0.998);
    C.goods.forEach(function (g) { if (goodsOk(g, y) && val(g.diff, y) / 100 >= L.adoptU) L.goods[g.id] = y; });
    L.fAge = fAge; L.mAge = mAge; L.dad = dad; L.mom = mom;
  }
  function eduDraw(L, sex, by) {
    var t = L.C.nat.parentEdu[sex];
    var r = nv(t, by).v; // [中学, 高校, 短大・高専, 大学]（国勢調査の区分。専門学校は高校に入る）
    var tilt = (L.incPct - 0.5) * 0.6;
    var w = [r[0] * (1 - tilt), r[1], r[2] * (1 + tilt * 0.5), r[3] * (1 + tilt)];
    var labels = ['中学', '高校', '短大・高専', '大学'];
    return pick(L.rnd, labels, function (x) { return w[labels.indexOf(x)]; });
  }
  function pickInd(rnd, ind) {
    var keys = Object.keys(ind);
    return pick(rnd, keys, function (k) { return ind[k]; });
  }
  function surviveUntil(L, m, year) {
    for (var yy = m.by; yy < year; yy++) {
      if (L.rnd() < deathProb(L.C, L.P, m.sex, yy - m.by, yy)) { m.dy = yy; return false; }
    }
    return true;
  }

  /* ---------- 1年分 ---------- */
  function placeLabel(L) {
    return L.place.away ? L.place.prefName : L.place.prefName + L.place.muniName;
  }

  function worldLine(L, y, a) {
    var C = L.C;
    if (y >= FUTURE_FROM) return { future: true, items: [{ t: 'この先の世の中は誰にも分からない。ここからは人口と寿命の将来推計だけを使って進む', type: '未来', ev: [ev(C, 'ipss', y, '将来推計人口・将来の寿命', '推計')] }] };
    var rows = C.timeline.filter(function (r) {
      if (r.y !== y) return false;
      if (r.ages && (a < r.ages[0] || a > r.ages[1])) return false;
      if (r.regions && r.regions.length && r.regions.indexOf(L.place.pref) < 0 && !(r.alsoAll)) return false;
      return true;
    });
    if (!rows.length) return { items: [{ t: 'この年の出来事は、まだ年表に入っていない', type: '空き', ev: [] }], empty: true };
    var econ = rows.filter(function (r) { return r.type === '景気'; });
    var other = rows.filter(function (r) { return r.type !== '景気'; });
    var chosen = [];
    if (econ.length) chosen.push(econ[0]);
    // 地域の出来事を優先し、あとは決まった順で最大2件
    other.sort(function (p, q) { return (q.regions && q.regions.length ? 1 : 0) - (p.regions && p.regions.length ? 1 : 0); });
    for (var i = 0; i < other.length && chosen.length < 3; i++) chosen.push(other[i]);
    return {
      items: chosen.map(function (r) {
        return { t: r.text, type: r.type, ev: [ev(C, r.src, r.y, r.srcNote || r.type, r.srcVal || '', { verified: !!r.verified })] };
      })
    };
  }

  function step(L) {
    if (!L.alive) return null;
    var y = L.year, a = L.age;
    var rec = { year: y, age: a, place: placeLabel(L), pin: { pref: L.place.pref, muni: L.place.muni || null }, world: worldLine(L, y, a), events: [], branch: null, future: y >= FUTURE_FROM };
    L.rec = rec;
    if (a === 0) { birthEvent(L, rec); if (L.house && L.house.deathYear >= y) fixedDeathsAtBirth(L, rec); storyYear(L, rec); }
    else {
      familyYear(L, rec);
      lifeYear(L, rec);
      storyYear(L, rec);
    }
    if (L.alive && ASK_AGES.indexOf(a) >= 0) L.queue.push(askFor(L));
    if (L.queue.length) { rec.branch = L.queue.shift(); return rec; }
    finishYear(L, rec);
    return rec;
  }

  // 時代で呼び方が変わる役職（庄屋は江戸の呼び方。それより前は名主、明治5年からは戸長、明治22年からは村長）
  // 時代と土地で言い方を変える表（spec6 1-7）：祝言は明治のおわりまで、縁談は戦前まで（戦後は見合いの話）。市街地や戦後の町では「村の年寄り」を親戚に
  function eraWords(t, y, L) {
    if (!t) return t;
    if (t.indexOf('庄屋') >= 0) {
      if (y < 1600) t = t.replace(/庄屋/g, '名主');
      else if (y >= 1889) t = t.replace(/庄屋/g, '村長');
      else if (y >= 1872) t = t.replace(/庄屋/g, '戸長');
    }
    if (y >= 1913 && t.indexOf('祝言') >= 0) t = t.replace(/祝言をあげ/g, '結婚式を挙げ').replace(/祝言/g, '結婚式');
    if (y >= 1946 && t.indexOf('縁談') >= 0) t = t.replace(/縁談が持ち込まれた/g, '見合いの話が来た').replace(/縁談が来た/g, '見合いの話が来た').replace(/縁談/g, '見合いの話');
    var city = L && (L.old ? L.kind === 'city' : ((L.place || {}).kind === '大都市' || (L.place || {}).kind === '都市'));
    if ((city || y >= 1946) && t.indexOf('村の年寄り') >= 0) t = t.replace(/村の年寄り/g, '親戚');
    return t;
  }
  // 家を離れている年（出家・旅・奉公・出征）に家族が亡くなったときは、知らせが届いた形で書く
  // 何年か前に選んだことと結果がつながるときの書き出し（v11の直し 9）：「16歳で決めたとおり、」。同じ年の選択や5年より前の選択には付けない
  var WORK_RE = /働きに出|働く|働こう|就職|村を出|町に出|集団就職|奉公/, STUDY_RE = /進学|上の学校|受験|大学|勉強を続け/;
  function asDecided(L, re) {
    var cs = (L.choices || []).filter(function (c) { return c.y < L.year && L.year - c.y <= 5 && re.test((c.q || '') + (c.l || '')); });
    var c = cs[cs.length - 1];
    return c ? c.age + '歳で決めたとおり、' : '';
  }
  // 家で暮らしているか（v11の直し 1）。出家・旅・奉公・出征の間は false。
  // 結婚と再婚・縁談、配偶者や子の名前の入る家の出来事、家の仕事と村の暮らしの場面、家にいる前提のまわりの人の出来事は、すべてここを通して止める
  var AWAY_MODES = { shukke: 1, tabi: 1, hoko: 1, hei: 1 };
  function homeLife(L) { return !(L && L.mode && AWAY_MODES[L.mode]); }
  // 家と村の暮らしに結びついた場面の言葉（家を離れている間は出さない）
  var HOME_RE = /近所|講を作|お伊勢参り|年貢|田植|稲刈|麦刈|夜なべ|屋根|用水|隣の田|隣の家|同じ村|五人組|寄り合い|村の者|村人|村の衆|家の田|田畑|畑|代官所|名主|庄屋|囲炉裏|台所|家の仕事|家の手伝い|看病|言い争い|夫婦|連れ添/;
  function awayWords(L, cat, t) {
    if (!L.mode || cat !== '家庭' || !t || /知らせ|便り|手紙/.test(t)) return t;
    return t.replace(/(が|、)([^。]*?)亡くなった。/, function (m0, a, b) { return a + b + '亡くなったと、知らせが届いた。'; });
  }
  function push(L, rec, cat, text, evs, extra) {
    text = eraWords(text, rec && rec.year != null ? rec.year : L.year, L);
    text = awayWords(L, cat, text);
    // 人生の記録の文は、すべて「。」で終える（v11の直し 9）
    if (text && !/。$/.test(text)) text += '。';
    var e = { cat: cat, t: text, ev: evs || [] };
    if (extra) for (var k in extra) e[k] = extra[k];
    rec.events.push(e);
    L.cat[cat]++; L.catTotal++;
    L.stats.events++;
    return e;
  }

  // 親のくわしい仕事（js/jobs.js。産業の抽選はそのままで、呼び名だけ細かくする。別の乱数）
  function parentJobs(L) {
    var J = jobsMod();
    if (!J) return;
    var c = { y: L.by, kind: ({ '大都市': 'city', '都市': 'town', '町村': 'village' })[L.place.kind] || 'town', pref: L.place.pref, rich: L.incPct };
    L.dadJobD = J.selfJob(L.dadJob, Object.assign({ sex: 'm' }, c), L.seed ^ 0x51ed27, null, false);
    L.momJobD = L.momJob ? J.selfJob(L.momJob, Object.assign({ sex: 'f' }, c), L.seed ^ 0x2f7a3c, null, false) : null;
  }
  // 自分のくわしい仕事（産業の抽選はそのままで、呼び名だけ細かくする。別の乱数）
  function selfJobE(L, k, reg) {
    var J = jobsMod();
    if (!J) return;
    var c = { y: L.year, kind: ({ '大都市': 'city', '都市': 'town', '町村': 'village' })[L.place.kind] || 'town', pref: L.place.pref, sex: L.sex, rich: L.incPct, univ: L.edu === '大学' || L.school === 'univ' };
    var sj = J.selfJob(k, c, L.seed ^ 0x3c6ef372, null, false);
    if (sj) { L.selfJob = sj; L.lastJob = sj.n + (reg ? '' : '（非正規）'); }
  }
  function birthEvent(L, rec) {
    var C = L.C, P = L.P, y = L.year;
    var share = val(L.place.muniObj.share, y);
    var sibs = L.members.filter(function (m) { return m.sib && m.by < y && m.alive; });
    var s = L.place.prefName + L.place.muniName + 'で、' + (L.sex === 'm' ? '男の子' : '女の子') + 'として生まれた。名前は' + L.name + 'と名付けられた。';
    s += '父は' + L.fAge + '歳で' + (L.dadJobD ? L.dadJobD.n + '（' + L.dadJobD.d + '）' : IND[L.dadJob].job) + '、母は' + L.mAge + '歳で' + (L.momJob ? (L.momJobD ? L.momJobD.n : IND[L.momJob].job) + 'をしている' : '家で家事をしている') + '。';
    if (sibs.length) s += sibs.map(function (m) { return m.role + 'の' + m.name; }).join('、') + 'がいる。';
    else if (!L.members.some(function (m) { return m.sib && m.by < y; })) s += 'はじめての子どもだった。';
    if (L.descendLine) s += L.descendLine;
    if (L.house && L.by > L.house.deathYear) {
      var pm = L.members.filter(function (m) { return m.prevLife; })[0];
      if (pm) s += relWord(L, pm) + 'の' + pm.name + 'が亡くなって' + (L.by - L.house.deathYear) + '年後に生まれた。';
    }
    s += L.ownHome ? '家は持ち家。' : '家は借家。';
    if (L.threeGen) s += '父方の祖父母と一緒に暮らしている。';
    var evs = [
      ev(C, 'vital', y, P.name + 'で生まれた子のうち' + L.place.muniName + 'で生まれた割合', pct(share), { est: !!L.place.muniObj.est || y < (L.place.muniObj.estBefore || 0) }),
      ev(C, 'census', y, L.place.muniName + 'で働く人の産業の割合（親の仕事の抽選に使用）', indSummary(L.place.muniObj.ind)),
      ev(C, 'income', nv(C.nat.incomeMean, y).y, 'この年の子どものいる世帯の年収の分布から抽選した家庭の年収', 'およそ' + L.income + '万円'),
      ev(C, 'census', nv(C.nat.threeGen[L.place.kind], y).y, '三世代で暮らす世帯の割合（' + L.place.kind + '）', pct(val(C.nat.threeGen[L.place.kind], y)))
    ];
    push(L, rec, '家庭', s, evs);
    L.used.__birth = 1;
  }
  function indSummary(ind) {
    var keys = Object.keys(ind).sort(function (a, b) { return ind[b] - ind[a]; }).slice(0, 3);
    return keys.map(function (k) { return IND[k].name + ' ' + pct(ind[k]); }).join('、');
  }

  /* 家族の出来事（きょうだいの誕生、亡くなる、孫） */
  function familyYear(L, rec) {
    var C = L.C, y = L.year, rnd = L.rnd;
    L.members.forEach(function (m) {
      if (m.gone) return;
      if (m.by === y && (m.sib || m.role === '子' || m.role === '孫')) {
        if (m.role === '子' || m.role === '孫') return; // 子と孫の誕生は別の所で出す
        if (!L.mom.alive && !fixedYear(L, m)) { m.gone = true; m.alive = false; return; } // 母が亡くなっていれば生まれない
        var who = m.role === '孫' ? '孫の' + m.name + 'が生まれた。' : relWord(L, m) + 'の' + m.name + 'が生まれた。';
        push(L, rec, '家庭', who, [ev(C, 'vital', y, '出生数', '')]);
        if (fixedYear(L, m) && m.fixDy === y) {
          m.alive = false; m.dy = y;
          var fe0 = push(L, rec, '家庭', relWord(L, m) + 'の' + m.name + 'が、生まれて1年もたたずに亡くなった。', [ev(C, 'vital', y, '前の人生で起きた家族の死', '', { noYearNote: true })]);
          if (m.prevLife) fe0.house = true;
          fe0.short = relWord(L, m) + 'の' + m.name + 'が亡くなった。';
        }
        return;
      }
      if (!m.alive || m.by >= y) return;
      if (fixedYear(L, m)) {
        if (m.fixDy !== y) return;
        m.alive = false; m.dy = y;
        var fe = push(L, rec, '家庭', relWord(L, m) + 'の' + m.name + 'が' + (y - m.by) + '歳で亡くなった。', [ev(C, 'vital', y, '前の人生で起きた家族の死', '', { noYearNote: true })]);
        if (m.prevLife) fe.house = true;
        if (m.prevLife) fe.short = relWord(L, m) + 'の' + m.name + 'が亡くなった。';
        return;
      }
      if (rnd() < deathProb(C, L.P, m.sex, y - m.by, y)) {
        m.alive = false; m.dy = y;
        if (m.role === '配偶者') { L.married = false; L.widowed = true; }
        if (m.role === 'パートナー') { L.partner = false; L.partnerLost = true; }
        push(L, rec, '家庭', relWord(L, m) + 'の' + m.name + 'が亡くなった。' + (y - m.by) + '歳だった。', [ev(C, 'lifetable', y, (y - m.by) + '歳の人が1年のうちに亡くなる確率（生命表から推計）', (deathProb(C, L.P, m.sex, y - m.by, y) * 100).toFixed(2) + '%')]);
      }
    });
    if (!protectedYear(L)) postwarYear(L, rec);
    // 孫（子がいない人に孫は生まれない）
    var kids = L.members.filter(function (m) { return m.role === '子' && m.alive && y - m.by >= 24 && y - m.by <= 42; });
    kids.forEach(function (k) {
      var gk = L.members.filter(function (m) { return m.role === '孫' && m.parentId === k.id; }).length;
      if (gk < 2 && rnd() < 0.07) {
        var g = addMember(L, '孫', rnd() < 0.513 ? 'm' : 'f', y, { parentId: k.id });
        push(L, rec, '家庭', relWord(L, k) + 'の' + k.name + 'に子どもが生まれ、孫の' + g.name + 'ができた。', [ev(C, 'vital', y, '母の年齢別の出生率', '')]);
      }
    });
  }

  /* 本人の出来事 */
  function lifeYear(L, rec) {
    var C = L.C, P = L.P, y = L.year, a = L.age, rnd = L.rnd;
    var future = y >= FUTURE_FROM;
    // 保育園・幼稚園
    if (a === 3) {
      var nr = val(C.nat.nursery[L.place.kind], y);
      if (rnd() < nr) push(L, rec, '家庭', (L.momJob ? '母が働いているため、' : '') + '保育園に通っている。', [ev(C, 'census', nv(C.nat.nursery[L.place.kind], y).y, '0〜5歳の子のうち保育所に通う子の割合（' + L.place.kind + '）', pct(nr), { est: true })]);
      else push(L, rec, '家庭', '家で過ごしている。来年から幼稚園に通う予定だ。', [ev(C, 'census', nv(C.nat.nursery[L.place.kind], y).y, '0〜5歳の子のうち保育所に通う子の割合（' + L.place.kind + '）', pct(nr), { est: true })]);
    }
    if (a === 6) { L.stage = 'school'; push(L, rec, '学歴と仕事', '地元の公立小学校に入学した。' + (L.place.kind === '町村' ? '家から学校まで、歩いて30分ほどかかる。' : ''), [ev(C, 'school', y, '小学校の在学者', '')]); }
    // 転校（小学校のあいだ）
    var mc = typeof C.nat.moveChild === 'number' ? C.nat.moveChild : val(C.nat.moveChild, y);
    // 引き継いだ人生で前の人が亡くなるまでは、家の引っ越しを前の人生と同じ年に同じ町へ
    if (L.house && L.house.moves && y <= L.house.deathYear) {
      L.house.moves.forEach(function (mv) {
        if (mv.year !== y || mv.muni === L.place.muni) return;
        var nm0 = muniOf(P, mv.muni);
        if (!nm0 || L.place.away) return;
        L.moved = true; L.place.muni = nm0.code; L.place.muniName = nm0.name; L.place.kind = nm0.kind; L.place.muniObj = nm0;
        push(L, rec, '家庭', '家族で' + nm0.name + 'へ引っ越した。', [ev(C, 'census', y, '前の人生で起きた家の引っ越し', '', { noYearNote: true })]);
      });
    }
    if (a >= 7 && a <= 11 && !L.moved && !protectedYear(L) && P.munis.length > 1 && rnd() < mc) {
      var nm = pickMuni(P, y, rnd, L.place.muni);
      L.moved = true;
      L.place.muni = nm.code; L.place.muniName = nm.name; L.place.kind = nm.kind; L.place.muniObj = nm;
      push(L, rec, '家庭', '父の仕事の都合で' + nm.name + 'へ引っ越し、転校した。', [typeof C.nat.moveChild === 'number' ? ev(C, 'migration', y, '県内の市区町村間の移動', '') : ev(C, 'census', nv(C.nat.moveChild, y).y + 3, '10〜14歳のうち、5年のあいだに同じ県の別の市区町村から引っ越してきた子の割合（1年あたりに直した値）', (mc * 100).toFixed(1) + '%')]);
    }
    if (a === 12) L.queue.push(branchMiddle(L));
    if (a === 15) {
      var hs = val(P.s.hs, y);
      if (rnd() < hs) L.queue.push(branchHigh(L));
      else {
        L.edu = '中学'; L.school = null;
        startWork(L, rec, null, '中学を卒業して働き始めた。', true);
      }
    }
    if (a === 17 && L.sm) L.queue.push(branchOut(L));
    if (a === 18 && L.school === 'hs') L.queue.push(branchPath(L));
    if (L.school && L.gradAge === a && L.school !== 'hs') L.queue.push(branchJob(L));
    // 仕事
    if (L.job && !future) workYear(L, rec);
    else if (L.job && future) workYearFuture(L, rec);
    // 戻り先が決まっていない無職の年
    if (L.stage === 'jobless') {
      if (rnd() < 0.55) { startWork(L, rec, null, '新しい勤め先が決まり、また働き始めた。', false); }
    }
    // 女性の再就職
    if (L.stage === 'home' && L.youngestBy && y - L.youngestBy >= 6 && a < 60 && rnd() < 0.14) {
      L.job = { ind: pickInd(rnd, (L.place.muniObj || {}).ind || C.nat.indNat), reg: false, since: y }; L.lastJob = IND[L.job.ind].job; L.lastInd = L.job.ind;
      selfJobE(L, L.job.ind, false);
      L.stage = 'work';
      push(L, rec, '学歴と仕事', '子どもが小学校に上がり、近くの職場でパートとして働き始めた。', [ev(C, 'labor', y, '女性の年齢別の働く人の割合', '')]);
    }
    // 定年
    var retireAge = y <= 2012 ? 60 : (y <= 2024 ? 63 : 65);
    if (L.job && L.job.reg && a >= retireAge && L.stage === 'work') {
      L.job = null; L.stage = 'retired';
      push(L, rec, '学歴と仕事', '定年を迎え、長く勤めた職場を退いた。', [ev(C, 'law', y, '定年と雇用の年齢の制度（高年齢者雇用安定法）', retireAge + '歳')]);
    } else if (L.job && !L.job.reg && a >= 68 && rnd() < 0.3) {
      L.job = null; L.stage = 'retired';
      push(L, rec, '学歴と仕事', '仕事をやめ、家で過ごす時間が増えた。', [ev(C, 'labor', y, '65歳以上の働く人の割合', '')]);
    }
    if (a === 65) push(L, rec, '家庭', '年金を受け取り始めた。', [ev(C, 'law', y, '公的年金の支給開始年齢', '65歳')]);
    // 結婚
    if (a === 26 && !L.everMarried) L.queue.push(samesex(L) ? branchPartner(L) : branchMarry(L));
    if (!L.married && !L.divorced && a >= 18 && a <= 55) marryYear(L, rec);
    if (L.married) childYear(L, rec);
    if (L.married && L.marriedY && y - L.marriedY <= 20 && rnd() < (typeof C.nat.divorce === 'number' ? C.nat.divorce : val(C.nat.divorce, y))) {
      L.married = false; L.divorced = true; L.everDivorced = y;
      var sp = L.members.filter(function (m) { return m.role === '配偶者' && !m.gone; })[0];
      if (sp) sp.gone = true;
      push(L, rec, '家庭', '話し合いのすえ、離婚した。', [ev(C, 'vital', y, '離婚件数', '')]);
    }
    if (future) return;
    // 時代：家に物が来る
    C.goods.forEach(function (g) {
      if (L.goods[g.id] || !goodsOk(g, y)) return;
      var d = val(g.diff, y) / 100;
      if (d >= L.adoptU) {
        L.goods[g.id] = y;
        if (a >= 3) {
          var own = a >= 22 || L.place.away;
          var gy = nv(g.diff, y).y;
          push(L, rec, '時代', own ? g.own : g.home, [ev(C, g.srcFrom && gy < g.srcFrom ? g.srcEarly : g.src, gy, g.name + 'を持っている世帯の割合', Math.round(d * 100) + '%', g.estBefore && gy < g.estBefore ? { est: true } : undefined)]);
        }
      }
    });
    // 時代：景気と物価
    var jr = val(C.nat.jobs, y), un = val(C.nat.unemp, y) / 100;
    var cpiNow = val(C.nat.cpi, y), cpiPrev = val(C.nat.cpi, y - 1);
    var infl = cpiPrev ? cpiNow / cpiPrev - 1 : 0;
    if (a < 18 && !L.place.away) {
      if (rnd() < un * 0.55 && !L.dadLost) {
        L.dadLost = true; L.incPct = clamp(L.incPct - 0.15, 0.01, 0.99);
        push(L, rec, '時代', '父の勤め先が人を減らすことになり、父は新しい仕事を探すことになった。', [ev(C, 'labor', y, 'この年の失業率', (un * 100).toFixed(1) + '%')]);
      } else if (jr >= 1.2 && rnd() < 0.12 && !L.used.__boom) {
        L.used.__boom = 1;
        push(L, rec, '時代', '景気がよく、父の残業とボーナスが増えた。週末に家族で出かけることが増えた。', [ev(C, 'jobs', y, 'この年の有効求人倍率（全国）', jr.toFixed(2) + '倍')]);
      }
    }
    if (infl >= 0.025 && L.incPct < 0.4 && rnd() < 0.35 && !L.used['__infl' + Math.floor(y / 5)]) {
      L.used['__infl' + Math.floor(y / 5)] = 1;
      var txt = y < 1990 ? '灯油や食べ物の値段が上がり、家では冬の暖房を控えるようになった。' : '食べ物や電気代の値上がりが続き、買う物を見直すようになった。';
      push(L, rec, '時代', txt, [ev(C, 'cpi', y, '消費者物価指数の前の年からの上がり幅', (infl * 100).toFixed(1) + '%')]);
    }
    // 時代：災害（被害の大きかった地域に住む人に強く出す）
    C.timeline.forEach(function (r) {
      if (r.y !== y || !r.hit) return;
      if (r.hit.prefs.indexOf(L.place.pref) < 0) return;
      if (rnd() < r.hit.p) push(L, rec, '時代', fill(L, r.hit.text), [ev(C, r.src, y, r.srcNote || '災害の被害の範囲', '')]);
    });
    // 大きな災害・事件・催し（その年にいる市区町村で判定する）
    eventYear(L, rec);
    if (!L.alive) return;
    // 30歳のとき地元（生まれた都道府県）にいるか
    if (a === 30) L.stats.atHome30 = !L.place.away && L.place.pref === L.home.pref;
  }

  function workYear(L, rec) {
    var C = L.C, y = L.year, a = L.age, rnd = L.rnd;
    var t = val(C.nat.nonreg, y) / 100;
    var un = val(C.nat.unemp, y) / 100;
    if (a >= 25 && a <= 34) L.stats.nonreg[y] = !L.job.reg;
    if (rnd() < un * (L.job.reg ? 0.45 : 1.1)) {
      L.job = null; L.stage = 'jobless'; L.lostJob = true;
      push(L, rec, '学歴と仕事', '勤め先の仕事が減り、職を失った。', [ev(C, 'labor', y, 'この年の失業率', (un * 100).toFixed(1) + '%')]);
      return;
    }
    if (a < 45) {
      if (!L.job.reg && rnd() < 0.1) { L.job.reg = true; push(L, rec, '学歴と仕事', '正社員として雇われることになった。', [ev(C, 'labor', y, '非正規から正規の職に移った人の割合', '')]); }
      else if (L.job.reg && rnd() < 0.1 * t / (1 - t)) { L.job.reg = false; push(L, rec, '学歴と仕事', '勤め先が変わり、契約社員として働くことになった。', [ev(C, 'labor', y, '非正規で働く人の割合（25〜34歳）', pct(t))]); }
    }
    if (L.job && L.job.reg && a >= 36 && a <= 52 && !L.promoted && rnd() < 0.07) {
      L.promoted = true;
      push(L, rec, '学歴と仕事', '職場で役職に就き、部下を持つようになった。', [ev(C, 'wage', y, '役職者の割合（年齢別）', '')]);
    }
  }
  function workYearFuture(L, rec) {
    var a = L.age, y = L.year;
    if (a >= 25 && a <= 34) L.stats.nonreg[y] = !L.job.reg;
  }

  function startWork(L, rec, dir, text, auto, outcome) {
    var C = L.C, y = L.year, rnd = L.rnd, P = L.P;
    var ind = L.place.away ? C.nat.indNat : L.place.muniObj.ind;
    var k, miss = null;
    // 進路で選んだ方向の仕事から引く（v11の直し 5-2）。求人の都合で外れたときは、そのことを文で説明する
    if (dir && DIRECTION[dir] && rnd() < 0.93) k = DIRECTION[dir][Math.floor(rnd() * DIRECTION[dir].length)];
    else { k = pickInd(rnd, ind); if (dir && DIRECTION[dir] && DIRECTION[dir].indexOf(k) < 0) miss = DIR_WORD[dir]; }
    L.jobDir = dir || null; L.jobMiss = !!miss;
    var base = val(C.nat.nonreg, y) / 100;
    var eduF = L.edu === '大学' ? 0.8 : 1.15;
    var sexF = L.sex === 'm' ? 0.7 : 1.3;
    var jrPref = val(C.nat.jobs, y) * val(P.s.jobs, y);
    var jrF = clamp(1 + 0.2 * (1 - val(P.s.jobs, y)), 0.85, 1.15);
    // 職を失ったあとの再就職は非正規になりやすい
    var againF = L.lostJob ? 1.6 : 1;
    var pNon = clamp(base * 1.1 * eduF * sexF * jrF * againF, 0.02, 0.85);
    var reg = rnd() >= pNon;
    L.job = { ind: k, reg: reg, since: y }; L.lastJob = IND[k].job + (reg ? '' : '（非正規）'); L.lastInd = k;
    selfJobE(L, k, reg);
    L.stage = 'work';
    var evs = [
      ev(C, 'jobs', nv(C.nat.jobs, y).y, P.name + 'のこの年の有効求人倍率', jrPref.toFixed(2) + '倍', { est: true }),
      ev(C, 'labor', nv(C.nat.nonreg, y).y, '25〜34歳で非正規で働く人の割合', pct(base))
    ];
    if (text) { push(L, rec, '学歴と仕事', text + (miss ? miss + 'の仕事を目指したが、思うような求人がなく、' : '') + jobText(L, k, reg, jrPref), evs); return; }
    return { k: k, reg: reg, jr: jrPref, evs: evs, miss: miss };
  }
  function jobText(L, k, reg, jr) {
    var s = '';
    if (jr < 0.7) s += '求人が少ない年で、何社も受けたすえに';
    else if (jr > 1.3) s += '求人が多い年で、早いうちに';
    var place = { agri: '地元の農家で', fish: '地元の漁業の仕事で', factory: 'ものを作る会社の工場で', build: '建設の会社で', office: '会社の事務や営業の仕事で', shop: '地元の店で', pub: '役所で', care: '病院や福祉の施設で', service: '飲食やサービスの店で' }[k];
    s += place + (reg ? '正社員として' : (L.year < 1995 ? 'パートやアルバイトとして' : '契約社員として')) + '働くことになった。';
    if (L.selfJob) s += '仕事は' + L.selfJob.n + '（' + L.selfJob.d + '）だ。';
    return s;
  }

  function marryYear(L, rec) {
    var C = L.C, y = L.year, a = L.age, rnd = L.rnd;
    if (samesex(L)) return partnerYear(L, rec);
    var target = val(C.nat.everMarried[L.sex], L.by);
    var h = C.nat.marryShape[L.sex][a - 18] || 0;
    // 統計は「50歳までに結婚した割合」なので、50歳までの形の合計で割る。
    // 同性を好きな人は別の流れ（パートナー）に進むため、その分を除いた人の中で統計に合うようにする
    var shp = C.nat.marryShape[L.sex], sum50 = 0;
    for (var i = 0; i < 32 && i < shp.length; i++) sum50 += shp[i];
    var ss = ((C.nat.minority || {})[L.sex] || {})[L.sex === 'm' ? 'gay' : 'lesbian'] || 0;
    var t2 = Math.min(0.98, target / (1 - ss));
    var k = -Math.log(1 - t2) / (sum50 || C.nat.marryShapeSum[L.sex]);
    var mult = L.marryMult || 1;
    var p = 1 - Math.exp(-k * h * mult);
    if (L.divorced || L.widowed) p *= 0.4;
    if (rnd() < p) {
      var diff = L.sex === 'm' ? -Math.round(Math.abs(gauss(rnd)) * 2) : Math.round(Math.abs(gauss(rnd)) * 2.5);
      var sp = addMember(L, '配偶者', L.sex === 'm' ? 'f' : 'm', L.by + diff);
      L.married = true; L.everMarried = true; L.marriedY = y; L.divorced = false; L.widowed = false;
      var SMd = storyMod();
      push(L, rec, '家庭', sp.name + 'さんと結婚した。' + (SMd && L.story ? SMd.spouseDesc(L, sp, y) : '相手は' + (L.by + diff) + '年生まれ。'), [ev(C, 'vital', y, '生まれ年ごとの、50歳までに結婚する人の割合', pct(target), { est: true })]);
      wifeNameYear(L, rec);
    }
  }
  // 同性のパートナーとの暮らし（法律上の結婚はできない。制度があれば宣誓できる）
  function partnerYear(L, rec) {
    var C = L.C, y = L.year, a = L.age, rnd = L.rnd;
    if (!L.partner) {
      var target = val(C.nat.everMarried[L.sex], L.by);
      var h = C.nat.marryShape[L.sex][a - 18] || 0;
      var k = -Math.log(1 - target) / C.nat.marryShapeSum[L.sex];
      var p = (1 - Math.exp(-k * h * (L.marryMult || 1))) * 0.7;
      if (rnd() < p) {
        var pt = addMember(L, 'パートナー', L.sex, L.by + Math.round(gauss(rnd) * 3));
        L.partner = true; L.partnerY = y;
        push(L, rec, '家庭', pt.name + 'さんと一緒に暮らし始めた。法律の上では、結婚することはできなかった。', [ev(C, 'law', y, '同性どうしの結婚を認める法律', 'なし')]);
      }
      return;
    }
    if (!L.pledged && partnerOk(L) && rnd() < (L.wantPledge ? 0.5 : 0.15)) {
      L.pledged = true;
      push(L, rec, '家庭', '住んでいる自治体のパートナーシップ制度で、パートナーと宣誓をした。証明書は受け取れたが、法律上の家族にはならなかった。', [ev(C, 'partner', y, 'パートナーシップ制度のある自治体に住む人の割合（人口カバー率）', coverText(C, y))]);
    }
  }

  function childYear(L, rec) {
    var C = L.C, y = L.year, rnd = L.rnd;
    if (L.mode) return; // 家を離れている年は子が生まれない
    var sp = L.members.filter(function (m) { return m.role === '配偶者' && m.alive && !m.gone; })[0];
    if (!sp) return;
    var wifeAge = L.sex === 'f' ? L.age : y - sp.by;
    if (wifeAge < 18 || wifeAge > 44) return;
    var base = wifeAge < 25 ? 0.09 : wifeAge < 35 ? 0.17 : wifeAge < 40 ? 0.07 : 0.015;
    var parity = [1.3, 1.15, 0.33, 0.1, 0.05][Math.min(L.kids, 4)];
    if (rnd() < base * parity) {
      var sx = rnd() < 0.513 ? 'm' : 'f';
      var nth = L.members.filter(function (m) { return m.role === '子' && m.sex === sx; }).length;
      var order = (['長', '次', '三', '四', '五'][nth] || '末') + (sx === 'm' ? '男' : '女');
      var c = addMember(L, '子', sx, y, { order: order });
      L.kids++; L.youngestBy = y;
      push(L, rec, '家庭', order + 'の' + c.name + 'が生まれた。', [ev(C, 'fertility', y, '結婚した夫婦の子どもの数（完結出生児数）', '')]);
      if (L.sex === 'f' && L.job && L.kids === 1 && rnd() < val(C.nat.leaveAtBirth, y)) {
        L.job = null; L.stage = 'home';
        push(L, rec, '学歴と仕事', '出産を機に仕事をやめ、子育てに専念することにした。', [ev(C, 'fertility', nv(C.nat.leaveAtBirth, y).y, '妊娠がわかったときに働いていた女性のうち、第1子の出産で仕事をやめた人の割合（第1子の生まれ年5年ごと）', pct(val(C.nat.leaveAtBirth, y)))]);
      }
    }
  }

  /* ---------- 分かれ道（遊ぶ人が選ぶ。選択は確率を動かすが結果を確定させない） ---------- */
  function branchMiddle(L) {
    var C = L.C, y = L.year, P = L.P;
    var priv = val(P.s.priv, y);
    return {
      id: 'middle', title: '中学受験',
      groups: [{ id: 'take', q: '中学受験をしますか', options: [{ k: 'take', l: '受けたいと言う' }, { k: 'no', l: '受けない' }] }],
      ev: [ev(C, 'school', nv(P.s.priv, y).y, P.name + 'で私立中学に進んだ人の割合', pct(priv), { est: true })]
    };
  }
  function branchHigh(L) {
    var C = L.C, y = L.year, P = L.P;
    return {
      id: 'high', title: '高校進学',
      groups: [{ id: 'course', q: '高校はどの方向にしますか', options: [{ k: 'gen', l: '普通科' }, { k: 'voc', l: '商業・工業・農業などの専門の学科' }] }],
      ev: [ev(C, 'school', nv(P.s.hs, y).y, P.name + 'の高校進学率', pct(val(P.s.hs, y)))]
    };
  }
  function branchPath(L) {
    var C = L.C, y = L.year, P = L.P;
    return {
      id: 'path', title: '18歳の進路',
      groups: [
        { id: 'path', q: '高校を出たあと、どうしますか', options: [{ k: 'univ', l: '大学へ進みたい' }, { k: 'semi', l: '短大・専門学校で学びたい' }, { k: 'work', l: '働きたい' }] },
        { id: 'loc', q: '住む場所は', options: [{ k: 'local', l: '地元に残りたい' }, { k: 'away', l: '県外に出てもいい' }] }
      ],
      ev: [
        ev(C, 'school', nv(P.s.univ, y).y, P.name + 'の大学進学率', pct(val(P.s.univ, y))),
        ev(C, 'school', nv(P.s.out, y).y, P.name + 'の高校から県外の大学へ進んだ人の割合', pct(val(P.s.out, y)), { est: true })
      ]
    };
  }
  function branchJob(L) {
    var C = L.C, y = L.year, P = L.P;
    return {
      id: 'job', title: '就職',
      groups: [{ id: 'dir', q: 'どんな仕事を目指しますか', options: [{ k: 'office', l: '事務や営業' }, { k: 'tech', l: 'ものづくりや技術' }, { k: 'care', l: '医療・福祉・教育' }, { k: 'service', l: '店や接客' }] }],
      ev: [ev(C, 'jobs', nv(C.nat.jobs, y).y, P.name + 'のこの年の有効求人倍率', (val(C.nat.jobs, y) * val(P.s.jobs, y)).toFixed(2) + '倍', { est: true })]
    };
  }
  function branchMarry(L) {
    var C = L.C;
    return {
      id: 'marry', title: '結婚',
      groups: [{ id: 'm', q: '結婚について、どう考えていますか', options: [{ k: 'yes', l: 'したい' }, { k: 'maybe', l: '縁があれば' }, { k: 'no', l: 'しないつもり' }] }],
      ev: [ev(C, 'hhproj', nv(C.nat.everMarried[L.sex], L.by).y, '同じ年に生まれた人のうち50歳までに一度は結婚する人の割合（2020年の国勢調査と世帯数の将来推計から）', pct(val(C.nat.everMarried[L.sex], L.by)), { est: true })]
    };
  }

  function branchOut(L) {
    var C = L.C, y = L.year;
    return {
      id: 'out', title: '打ち明けるかどうか',
      groups: [{ id: 'o', q: (L.sm === 'trans' ? '自分の性のことを' : '自分が好きになる相手のことを') + '、誰かに打ち明けますか', options: [{ k: 'family', l: '家族に打ち明ける' }, { k: 'friend', l: '信頼できる友だちにだけ' }, { k: 'none', l: '今は誰にも言わない' }] }],
      ev: [ev(C, 'lgbt', 2024, '働く性的少数者のうち、職場で自分のことを伝えている人の割合', '16.8%'),
        ev(C, 'rebit', 2025, '10代の性的少数者のうち、この1年に自ら命を絶つことを考えた人の割合（民間の調査）', '53.9%')]
    };
  }
  function branchPartner(L) {
    var C = L.C, y = L.year;
    return {
      id: 'partner', title: 'パートナー',
      groups: [{ id: 'p', q: '同性のパートナーとの暮らしについて、どう考えていますか', options: [{ k: 'pledge', l: '一緒に暮らし、制度があれば宣誓もしたい' }, { k: 'live', l: '一緒に暮らしたい' }, { k: 'alone', l: 'ひとりで生きていく' }] }],
      ev: [ev(C, 'law', y, '同性どうしの結婚を認める法律', 'なし（2026年10月時点で最高裁の大法廷が審理中）'),
        ev(C, 'partner', y, 'パートナーシップ制度のある自治体に住む人の割合（人口カバー率）', coverText(C, y))]
    };
  }

  // 自動で選ぶときは「統計どおり」に任せる（answers = null）
  function resolve(L, answers) {
    var rec0 = L.rec, br0 = rec0 && rec0.branch, n0 = rec0 ? rec0.events.length : 0, sy = L.year, sa = L.age;
    var out = resolve0(L, answers);
    // 進学・就職・結婚などの分かれ道も覚えておく（死亡の記録の「ひとこと」に使う）
    if (br0 && br0.id !== 'story' && !(br0.id === 'ask')) {
      var lab = null;
      (br0.groups || []).forEach(function (g) { var k = answers && answers[g.id]; (g.options || []).forEach(function (o) { if (o.k === k && !lab) lab = o.l; }); });
      var evs = rec0.events.slice(n0);
      (L.choices = L.choices || []).push({ age: sa, y: sy, title: br0.title || '', l: lab, out: evs.length ? evs[evs.length - 1].t : '', big: true, kind: br0.kind || br0.id });
    }
    return out;
  }
  function resolve0(L, answers) {
    var rec = L.rec, br = rec.branch, C = L.C, P = L.P, y = L.year, rnd = L.rnd;
    var natural = !answers;
    answers = answers || {};
    var e;
    if (br.id === 'ask') {
      answerAsk(L, br, answers);
      rec.branch = null;
      if (L.queue.length) { rec.branch = L.queue.shift(); return rec; }
      finishYear(L, rec);
      return rec;
    }
    L.branchCount++;
    if (br.id === 'story') {
      var SM = storyMod();
      if (SM) SM.resolve(L, rec, br, natural ? null : answers, STORY_API);
      rec.branch = null;
      if (L.queue.length) { rec.branch = L.queue.shift(); return rec; }
      finishYear(L, rec);
      return rec;
    }
    if (br.id === 'middle') {
      var priv = val(P.s.priv, y), passAvg = 0.65;
      var base = clamp(priv / passAvg * (0.3 + 1.4 * L.incPct), 0, 0.95);
      var take;
      if (natural) take = rnd() < base;
      else if (answers.take === 'take') take = rnd() < clamp(base * 5, 0.1, 0.85);
      else take = rnd() < base * 0.15;
      var pass = take && rnd() < clamp(0.65 + 0.12 * L.ab.study, 0.2, 0.95);
      var t;
      if (pass) { L.privMiddle = true; t = '中学受験をして私立中学に合格し、' + (L.place.kind === '町村' ? 'バスと電車を乗り継いで' : '電車で') + '通い始めた。'; }
      else if (take) t = '中学受験をしたが合格せず、地元の公立中学に進んだ。';
      else if (!natural && answers.take === 'take') t = '受験したいと伝えたが、通える範囲の学校や家の事情もあり、地元の公立中学に進んだ。';
      else t = '地元の公立中学に進んだ。';
      e = push(L, rec, '学歴と仕事', t, br.ev);
    } else if (br.id === 'high') {
      var genP = natural ? 0.73 : (answers.course === 'gen' ? 0.88 : 0.15);
      L.course = rnd() < genP ? 'gen' : 'voc';
      var privH = rnd() < val(P.s.privHs, y);
      L.school = 'hs'; L.edu = '高校';
      var where = L.course === 'gen' ? (privH ? '私立高校の普通科' : '地元の公立高校の普通科') : (privH ? '私立高校の専門の学科' : ['地元の商業高校', '地元の工業高校', '地元の農業高校'][Math.floor(rnd() * 3)]);
      e = push(L, rec, '学歴と仕事', where + 'に進んだ。', br.ev);
    } else if (br.id === 'path') {
      e = resolvePath(L, rec, br, natural, answers);
    } else if (br.id === 'job') {
      var r = startWork(L, rec, natural ? null : answers.dir, null, natural);
      var school = { univ: '大学', jc: '短大', voc: '専門学校' }[L.school];
      L.school = null;
      var mt = r.miss ? r.miss + 'の仕事を目指したが、思うような求人がなく、' : '';
      var txt = school ? school + 'を卒業し、' + mt + jobText(L, r.k, r.reg, r.jr) : mt + jobText(L, r.k, r.reg, r.jr);
      // 学校を出るときに地元へ戻るか（Uターン）
      if (school && L.place.away && rnd() < val(P.s.ret, y)) {
        L.place = { pref: L.home.pref, prefName: L.home.prefName, muni: L.home.muni, muniName: L.home.muniName, kind: homeMuni(L).kind, away: false, muniObj: homeMuni(L) };
        txt = school + 'を卒業して地元に戻り、' + mt + jobText(L, r.k, r.reg, r.jr);
      }
      e = push(L, rec, '学歴と仕事', txt, r.evs.concat([ev(C, 'ipssmig', nv(P.s.ret, y).y, P.name + 'で生まれて県外に出たことのある人のうち、' + P.name + 'に戻って住んでいる人の割合', pct(val(P.s.ret, y)))]));
    } else if (br.id === 'out') {
      var w = natural ? { family: 0.2, friend: 0.45, none: 0.35 } : ({ family: { family: 0.8, friend: 0.15, none: 0.05 }, friend: { family: 0.05, friend: 0.85, none: 0.1 }, none: { family: 0, friend: 0.1, none: 0.9 } })[answers.o];
      L.out = pick(rnd, ['family', 'friend', 'none'], function (k) { return w[k]; });
      var ot;
      if (L.out === 'family') ot = rnd() < 0.55 ? '家族に打ち明けた。しばらく沈黙が続いたあと、「話してくれてよかった」と言われた。' : '家族に打ち明けた。「一時の気の迷いだ」と言われ、その話はそれきりになった。';
      else if (L.out === 'friend') ot = '信頼できる友だちにだけ打ち明けた。「そうなんだ」と、いつもどおりに話を続けてくれた。';
      else ot = (!natural && answers.o !== 'none') ? '打ち明けようとしたが、言葉が出てこなかった。誰にも言わないまま過ごした。' : '誰にも言わないまま過ごした。';
      e = push(L, rec, '人間関係', ot, br.ev, { est: true });
    } else if (br.id === 'partner') {
      L.marryMult = natural ? 1 : ({ pledge: 1.7, live: 1.2, alone: 0.1 })[answers.p];
      L.wantPledge = !natural && answers.p === 'pledge';
      var pt2 = natural ? 'これからの暮らしのことを、ひとりで考える時間が増えた。' : ({ pledge: 'パートナーと暮らし、制度があれば宣誓もしたいと思っている。', live: 'パートナーと一緒に暮らしたいと思っている。', alone: 'ひとりで生きていくつもりでいる。' })[answers.p];
      e = push(L, rec, '人間関係', pt2, br.ev);
    } else if (br.id === 'marry') {
      L.marryMult = natural ? 1 : ({ yes: 1.7, maybe: 1, no: 0.15 })[answers.m];
      var tt = natural ? '結婚について、まわりと話すことが増えた。' : ({ yes: '結婚したいと思っている。', maybe: '縁があれば結婚したいと思っている。', no: '結婚はしないつもりでいる。' })[answers.m];
      e = push(L, rec, '人間関係', tt, br.ev);
    }
    rec.branch = null;
    if (L.queue.length) { rec.branch = L.queue.shift(); return rec; }
    finishYear(L, rec);
    return rec;
  }
  function homeMuni(L) {
    return L.P.munis.filter(function (m) { return m.code === L.home.muni; })[0] || L.place.muniObj;
  }

  function resolvePath(L, rec, br, natural, answers) {
    var C = L.C, P = L.P, y = L.year, rnd = L.rnd;
    var hsR = val(P.s.hs, y - 3);
    var u = clamp(val(P.s.univ, y) / hsR, 0.01, 0.97);
    var semi = clamp((val(P.s.jc, y) + val(P.s.voc, y)) / hsR, 0, 0.97 - u);
    // 学力・家庭の年収・親の学歴・学科から「進学しやすさ」を出し、統計の割合で線を引く
    var pu = (L.parentEdu.dad === '大学' || L.parentEdu.mom === '大学') ? 1 : 0;
    var score = 0.6 * L.ab.study + 1.2 * (L.incPct - 0.5) + 0.4 * pu + (L.course === 'gen' ? 0.25 : -0.9) + gauss(rnd) * 0.8;
    var mean = 0.4 * 0.28 + (0.25 * 0.73 - 0.9 * 0.27), sd = 1.19;
    if (!natural && answers.path === 'univ') score += 0.9;
    if (!natural && answers.path === 'semi') score += 0.4;
    var tU = mean + sd * invNorm(1 - u), tS = mean + sd * invNorm(1 - u - semi);
    var path = score > tU ? 'univ' : score > tS ? 'semi' : 'work';
    if (!natural && answers.path === 'semi' && path === 'univ' && rnd() < 0.6) path = 'semi';
    if (!natural && answers.path === 'work' && rnd() < 0.8) path = 'work';
    var t, evs = br.ev;
    if (path === 'work') {
      L.school = null;
      var away = natural ? rnd() < val(P.s.outJob, y) : rnd() < (answers.loc === 'away' ? clamp(val(P.s.outJob, y) * 2.5, 0.1, 0.85) : val(P.s.outJob, y) * 0.3);
      if (away) moveAway(L);
      L.queue.push(branchJob(L));
      L.gradAge = L.age;
      L.school = 'hs-done';
      t = asDecided(L, WORK_RE) + '高校を卒業し、' + (away ? L.place.prefName + 'に出て' : '地元の会社や店で') + '働くことにした。';
      return push(L, rec, '学歴と仕事', t, evs);
    }
    if (path === 'semi') {
      var jcShare = clamp(val(P.s.jc, y) / Math.max(0.01, val(P.s.jc, y) + val(P.s.voc, y)) * (L.sex === 'f' ? 1.7 : 0.25), 0, 0.95);
      L.school = rnd() < jcShare ? 'jc' : 'voc';
      L.edu = '短大・専門'; L.gradAge = 20;
    } else {
      L.school = 'univ'; L.edu = '大学'; L.gradAge = 22; L.stats.univ = true;
    }
    var o = val(P.s.out, y) * (path === 'semi' ? 0.6 : 1);
    var goAway = natural ? rnd() < o : rnd() < (answers.loc === 'away' ? clamp(o * 1.8 + 0.1, 0, 0.9) : o * 0.35);
    var kind;
    if (path === 'univ') {
      var pubP = clamp(0.27 + 0.1 * L.ab.study, 0.05, 0.6);
      kind = rnd() < pubP ? (rnd() < 0.8 ? '国立大学' : '公立大学') : '私立大学';
    } else kind = L.school === 'jc' ? '短大' : '専門学校';
    var where;
    if (goAway) { moveAway(L); where = (L.place.prefName === '東京都' ? '首都圏の' : L.place.prefName + 'の') + kind + 'に進み、一人暮らしを始めた。'; }
    else where = inPref(L.P.name) + 'の' + kind + 'に進み、' + (L.place.kind === '町村' ? '家から通うことにした。' : '家から通い始めた。');
    t = '高校を卒業し、' + where;
    return push(L, rec, '学歴と仕事', t, evs);
  }
  function inPref(name) {
    var t = name.slice(-1);
    return (t === '都' ? '都' : t === '道' ? '道' : t === '府' ? '府' : '県') + '内';
  }
  function moveAway(L) {
    var reg = L.P.region;
    var dest = HUB[reg] && HUB[reg] !== L.P.name ? (L.rnd() < 0.55 ? '東京都' : HUB[reg]) : (L.P.name === '東京都' ? '神奈川県' : '東京都');
    if (dest === L.P.name) dest = L.P.name === '東京都' ? '神奈川県' : '東京都';
    L.place = { pref: PREF_CODE[dest] || 'away', prefName: dest, muni: null, muniName: '', kind: '大都市', away: true, muniObj: null };
  }

  /* 年の終わり：場面が空なら必ず1つ出す。亡くなるかを決める */
  /* ---------- 稼ぎ（生涯獲得賃金） ---------- */
  // 2020〜2023年の年齢・男女・学歴・正規か非正規か別の年収に、その年の賃金の水準（全国の所定内給与額の動き）と
  // 住んでいる都道府県の差を掛け、消費者物価指数で2025年のお金の価値に直す。2026年以降は2025年の水準のまま
  var WAGE_YEAR = 2025;
  function wageOf(L, y, a) {
    var W = L.C.wage, C = L.C;
    if (!W || !L.job) return null;
    // 物語で就いた仕事は、その仕事の年収の目安（2025年の物価）を、その年の物価に直して使う
    if (L.job.pay != null) {
      var yp = Math.min(y, WAGE_YEAR), nom = L.job.pay * val(C.nat.cpi, yp) / val(C.nat.cpi, WAGE_YEAR);
      return { nominal: nom, real: L.job.pay, future: y > WAGE_YEAR };
    }
    var P = W.profile[L.sex], kind = L.job.reg ? 'r' : 'n';
    var band = a < 20 ? 15 : a >= 70 ? 70 : Math.floor(a / 5) * 5;
    function at(e) { var t = P[e]; return t && t[kind] && t[kind][band] != null ? t[kind][band] : null; }
    var base;
    if (L.edu === '短大・専門') { var x1 = at('専門'), x2 = at('短大高専'); base = x1 != null && x2 != null ? (x1 + x2) / 2 : (x1 != null ? x1 : x2); }
    else base = at({ '中学': '中学', '高校': '高校', '大学': '大学' }[L.edu] || 'all');
    if (base == null) base = at('all');
    if (base == null) return null;
    var yy = Math.min(y, WAGE_YEAR);
    var pref = L.place.away ? 1 : (val((L.P.s.wage || {})[L.sex], yy) || 1);
    var nominal = base * val(W.idx[L.sex], yy) * pref;
    var real = nominal * val(C.nat.cpi, WAGE_YEAR) / val(C.nat.cpi, yy);
    return { nominal: nominal, real: real, future: y > WAGE_YEAR };
  }
  function earnYear(L, rec) {
    var w = wageOf(L, L.year, L.age);
    if (rec) rec.income = w ? { nominal: w.nominal, real: w.real, cur: '円', future: w.future } : null;
    if (!w) return;
    L.earn.real += w.real; L.earn.nominal += w.nominal; L.earn.years++;
    if (!L.job.reg) L.earn.nonregYears++;
    if (w.future) L.earn.futureYears++;
  }

  /* ---------- 大きな災害・事件・催し ---------- */
  // 同じ家に暮らしている家族（子どものうちは親ときょうだい、結婚してからは配偶者と18歳未満の子）
  function household(L) {
    var y = L.year;
    return L.members.filter(function (m) {
      if (!m.alive || m.gone || m.by > y) return false;
      if (L.married) return m.role === '配偶者' || (m.role === '子' && y - m.by < 18);
      if (L.age < 22) return m.role === '父' || m.role === '母' || (m.sib && y - m.by < 22) || m.live;
      return false;
    });
  }
  function eventArea(L, e) {
    var a = L.age;
    for (var i = 0; i < (e.areas || []).length; i++) {
      var ar = e.areas[i];
      if (ar.pref !== L.place.pref) continue;
      if (ar.codes && ar.codes.indexOf(L.place.muni) < 0) continue;
      if (ar.ages && (a < ar.ages[0] || a > ar.ages[1])) return null;
      return ar;
    }
    return null;
  }
  function eventYear(L, rec) {
    var C = L.C, y = L.year, a = L.age, rnd = L.rnd;
    (C.events || []).forEach(function (e) {
      if (e.y !== y || !L.alive) return;
      var base = ev(C, e.src, y, e.title + '（' + e.srcNote + '）', '', { verified: !!e.verified });
      var ar = L.place.away ? null : eventArea(L, e);
      if (!ar && e.all) {
        for (var i = 0; i < e.all.length; i++) {
          var g = e.all[i];
          if (a >= g.ages[0] && a <= g.ages[1]) { if (rnd() < g.p) push(L, rec, '時代', fill(L, g.text), [base]); break; }
        }
        return;
      }
      if (!ar) return;
      // 市区町村ごとの被害の割合（組み立てのときに消防庁などの資料から計算したもの）があれば、それを使う
      var r = {}, k2, bc = e.byCode && e.byCode[L.place.muni];
      for (k2 in (ar.rates || {})) r[k2] = ar.rates[k2];
      if (bc && ar.rates) for (k2 in bc) if (bc[k2] != null) r[k2] = bc[k2];
      var src2 = (e.disSources && e.disSources[0] && bc) ? e.disSources[0].name : (ar.rateSrc || e.srcNote);
      function rateEv(what, v) { return ev(C, e.src, y, e.title + '：' + what + '（' + src2 + '）', v < 0.001 && v > 0 ? (v * 100).toFixed(3) + '%' : pct(v), { est: !!(bc && (bc.est || (what.indexOf('家') >= 0 && bc.houseEst))) }); }
      if (rnd() < (ar.p == null ? 1 : ar.p)) push(L, rec, '時代', fill(L, ar.text), [base]);
      // 亡くなる（本人・同じ家の家族）
      if (r.dead != null) {
        household(L).forEach(function (m) {
          if (fixedYear(L, m)) return;
          if (rnd() < r.dead) { m.alive = false; m.dy = y; push(L, rec, '家庭', e.title + 'で、' + relWord(L, m) + 'の' + m.name + 'が亡くなった。', [rateEv('亡くなった人の割合', r.dead)]); }
        });
        if (rnd() < r.dead) { var dst = deathStory(L, { kind: 'disaster', head: e.title + 'に遭い、亡くなった' }); dieBy(L, rec, 'disaster', dst.text, [rateEv('亡くなった人の割合', r.dead)]); if (!L.alive) L.causeName = e.title; return; }
      }
      // 家を失う・避難して町を離れる
      var moved = false;
      if (r.house != null && rnd() < r.house) {
        L.ownHome = false;
        push(L, rec, '家庭', e.title + 'で家が住めなくなり、しばらく避難所や仮設住宅で暮らした。', [rateEv('家を失った世帯の割合', r.house)]);
        moved = rnd() < 0.3;
      }
      if (!moved && r.evac != null && rnd() < r.evac) moved = true;
      if (moved && L.P.munis.length > 1 && !protectedYear(L)) {
        var hit = ar.codes || [];
        var nm = pickMuni(L.P, y, rnd, L.place.muni);
        for (var k = 0; k < 5 && hit.indexOf(nm.code) >= 0; k++) nm = pickMuni(L.P, y, rnd, L.place.muni);
        L.place.muni = nm.code; L.place.muniName = nm.name; L.place.kind = nm.kind; L.place.muniObj = nm;
        push(L, rec, '家庭', e.title + 'のあと、住んでいた町を離れ、' + nm.name + 'へ移って暮らすことになった。', [rateEv('町を離れて避難した人の割合', r.evac != null ? r.evac : r.house)]);
      }
      if (r.job != null && L.job && rnd() < r.job) {
        L.job = null; L.stage = 'jobless'; L.lostJob = true;
        push(L, rec, '学歴と仕事', e.title + 'で勤め先が被害を受け、仕事を失った。', [rateEv('仕事を失った人の割合', r.job)]);
      }
    });
  }
  function dieBy(L, rec, cause, text, evs) {
    if (protectedYear(L)) return;
    L.alive = false; L.deathAge = L.age; L.deathYear = L.year; L.cause = cause;
    L.queue = [];
    rec.dead = true;
    var e = push(L, rec, '健康', text, evs);
    if (cause === 'disaster') e.short = L.age + '歳で、災害に遭って亡くなった。';
  }

  function finishYear(L, rec) {
    var C = L.C, y = L.year, a = L.age, rnd = L.rnd;
    earnYear(L, rec);
    if (!L.alive) return advance(L, rec);
    // 物語の結末で亡くなる（spec6：遭難・戦・災害など。死因は物語の呼び名）
    if (L.storyDeath && !protectedYear(L)) {
      var sd = L.storyDeath; L.storyDeath = null;
      L.alive = false; L.deathAge = a; L.deathYear = y; L.cause = sd.kind || 'acc'; L.causeName = sd.n; L.causeShare = null; rec.dead = true;
      push(L, rec, '健康', sd.t, [ev(C, 'vital', y, '物語の結末（死因：' + sd.n + '）', '', { est: true })]);
      return advance(L, rec);
    }
    {
      var dp = clamp(deathProb(C, L.P, L.sex, a, y) * bodyMult(L, a), 0, 1);
      if (a >= MAX_AGE) dp = 1;
      if (protectedYear(L)) dp = 0;
      if (rnd() < dp) { die(L, rec, dp); return advance(L, rec); }
    }
    var need = rec.events.length === 0 ? 1 : (rec.events.length === 1 && rnd() < (a < 80 ? 0.35 : 0.08) ? 1 : 0);
    for (var i = 0; i < need; i++) {
      var s = pickScene(L);
      var mem = [];
      if (s) push(L, rec, s.cat, fill(L, s.t, mem), [ev(C, s.src, y, s.what || '', s.val || '', { verified: !!s.verified })], s.short ? { sid: s.id, mem: mem, short: s.short } : { sid: s.id, mem: mem });
      if (s && s.hl) rec.hotline = true;
    }
    if (!rec.events.length) L.stats.emptyYears++;
    return advance(L, rec);
  }
  function advance(L, rec) {
    moneyYear(L, rec);
    statusYear(L, rec);
    var Sm = storyMod(); if (Sm && Sm.familyLine) Sm.familyLine(L, rec, STORY_API);
    L.log.push(rec);
    L.rec = null;
    if (L.alive) { L.year++; L.age++; }
    return rec;
  }
  function die(L, rec, dp) {
    var C = L.C, a = L.age, rnd = L.rnd, y = L.year;
    var cw = a < 15 ? C.nat.cause.child : a < 40 ? C.nat.cause.young : a < 65 ? C.nat.cause.mid : C.nat.cause.old;
    var sm = L.story && L.story.sui > 1 ? L.story.sui : 1;
    var cause = pick(rnd, ['ill', 'acc', 'sui'], function (k) { return k === 'sui' ? cw[k] * sm : cw[k]; });
    var cd = pickCause(C, a, L.sex, y, rnd, cause, { place: ({ '町村': 'village', '都市': 'town', '大都市': 'city' })[(L.place || {}).kind] || 'town', pref: (L.place || {}).pref });
    var st = deathStory(L, { kind: cause, cause: cd });
    L.alive = false; L.deathAge = a; L.deathYear = y; L.cause = cause; L.causeName = cd ? cd.name : null; L.causeShare = cd ? { v: cd.share, y0: cd.years[0], y1: cd.years[cd.years.length - 1], est: !!cd.group } : null;
    rec.dead = true;
    if (cause === 'sui') rec.hotline = true;
    var de = push(L, rec, '健康', st.text, [
      ev(C, 'lifetable', y, a + '歳の人が1年のうちに亡くなる確率（生命表から推計）', (dp * 100).toFixed(2) + '%'),
      ev(C, cause === 'sui' ? 'suicide' : 'vital', y, '年齢別の死因の割合（病気・事故など・自殺）', pct(cw[cause]))
    ].concat(cd ? [ev(C, 'vital', cd.years[cd.years.length - 1], 'この年齢の死因のうち「' + cd.name + '」の割合（' + cd.years[0] + '〜' + cd.years[cd.years.length - 1] + '年の死亡数から）', pct(cd.share))] : []).concat(st.evs));
    // 授業用の表示で使う短い一行
    if (cause === 'sui') de.short = a + '歳で、自ら命を絶った。';
    else if (cause === 'acc') de.short = a + '歳で、' + (cd && cd.name === '他殺' ? '事件に巻き込まれて' : '事故で') + '亡くなった。';
  }


  /* ---------- 4つの状態の数値（からだ・暮らしの満足・学び・つながり。0〜100） ----------
     毎年の出来事と統計から決める。数値は「亡くなる確率」の補正にだけ使い、出来事そのものは決めない。
     別の乱数（種から作る）を使うので、ほかの抽選の順番は変わらない。1975年より前は推計の印を付ける。 */
  var ST_KEYS = ['body', 'sat', 'learn', 'tie'];
  var ST_NAMES = { body: 'からだ', sat: '暮らしの満足', learn: '学び', tie: 'つながり' };
  // 年齢ごとのからだの目安（生命表で亡くなる確率が上がっていく形に合わせた目安。推計）
  var BODY_AGE = [[0, 66], [3, 78], [15, 84], [25, 84], [40, 79], [55, 72], [65, 66], [75, 57], [85, 45], [95, 30], [110, 15]];
  // 学校や学歴ごとの学びの目安（推計）
  var LEARN_EDU = { '家学': 62, '寺での手習い': 46, '寺子屋': 50, '藩校': 58, '村学校': 48, '小学校': 48, '中学': 55, '中学校': 55, '高校': 62, '旧制の上の学校': 74, '短大・専門': 68, '大学': 75, '大学院': 82 };
  // 出来事の文から数値を動かす決まり。others が true の決まりは、家族や他人が主語の文（「父が入院した」など）には当てはめない
  var WHO_OTHER = /^(父|母|祖父|祖母|夫|妻|兄|姉|弟|妹|息子|娘|子ども|長男|長女|次男|次女|三男|三女|孫|義|友だち|友人|同僚|上司|近所|隣)/;
  var ST_RULES = [
    { re: /入院|手術|骨折|寝込|療養|持病|と診断され|体調を崩|けがをし|大けが|病気になっ|病気にかか|高い熱|結核にかか|かぜをこじら|インフルエンザにかか/, k: 'body', d: -12, self: true },
    { re: /家を失|家が壊|家が流さ|焼け出さ|全壊|半壊|床上まで|浸水し|空襲で家|家が焼け|飢饉|凶作/, k: 'sat', d: -8 },
    { re: /戦死|召集|出征|兵隊にとられ|戦地へ/, k: 'tie', d: -6 },
    { re: /が亡くなった/, k: 'tie', d: -7 },
    { re: /が亡くなった/, k: 'sat', d: -5 },
    { re: /さんと結婚した|と結婚した|夫婦になった|嫁いだ|婿に入|パートナーと暮らし始め|と一緒に暮らし始め/, k: 'tie', d: 12 },
    { re: /さんと結婚した|と結婚した|夫婦になった|嫁いだ|婿に入|パートナーと暮らし始め|と一緒に暮らし始め/, k: 'sat', d: 6 },
    { re: /(長男|長女|次男|次女|三男|三女|四男|四女|男の子|女の子|子ども|孫)が生まれた/, k: 'tie', d: 8 },
    { re: /(長男|長女|次男|次女|三男|三女|四男|四女|男の子|女の子|子ども|孫)が生まれた/, k: 'sat', d: 5 },
    { re: /離婚した/, k: 'tie', d: -10 },
    { re: /離婚した/, k: 'sat', d: -8 },
    { re: /職を失|失業し|倒産し|解雇され|雇い止め|勤め先がなくな/, k: 'sat', d: -10, self: true },
    { re: /に入学した|へ進んだ|に進んだ|進学した|資格を取|学び始め|習い始め|稽古に通|夜学に通|通信制で学/, k: 'learn', d: 5, self: true },
    { re: /引っ越し|転校|移り住|上京し|奉公に出/, k: 'tie', d: -4, self: true },
    { re: /友だちができ|友だちと再会|昔の友だち|仲間ができ|仲間と/, k: 'tie', d: 4 },
    { re: /働き始め|勤め先が決ま|昇進し|任され/, k: 'sat', d: 4, self: true }
  ];
  function stLin(pts, x) {
    if (x <= pts[0][0]) return pts[0][1];
    for (var i = 1; i < pts.length; i++) if (x <= pts[i][0]) { var a = pts[i - 1], b = pts[i]; return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); }
    return pts[pts.length - 1][1];
  }
  function statusInit(L) {
    var r = makeRng(((L.seed >>> 0) ^ 0x2545f491) >>> 0);
    L.st4 = { r: r, ind: { body: L.ab ? L.ab.body : gauss(r), study: L.ab ? L.ab.study : gauss(r), social: L.ab ? L.ab.social : gauss(r) }, shock: { body: 0, sat: 0, learn: 0, tie: 0 }, v: null };
  }
  function feelOf(C, y) {
    var t = C.nat && C.nat.lifeFeel;
    if (!t) return null;
    var ys = Object.keys(t).map(Number).sort(function (a, b) { return a - b; });
    var yy = y < ys[0] ? ys[0] : y > ys[ys.length - 1] ? ys[ys.length - 1] : y;
    while (!t[yy] && yy > ys[0]) yy--;
    return t[yy] ? { y: yy, hard: t[yy].hard } : null;
  }
  var OLD_SAT = { kuge: 6, genin: -10, satsumon: -2, gusuku: -2, bushi: 4, chonin: 2, hyakusho: 0, priest: 3, outcast: -12, ainu: -8, ryukyuShi: 3, ryukyuHyakusho: -2, shizoku: 2, buraku: -10, heimin: 0 };
  function statusYear(L, rec) {
    if (!L.st4) statusInit(L);
    var S = L.st4, C = L.C, y = rec.year, a = rec.age, est = y < 1975, why = [];
    var prev = S.v;
    // 1年たつと、去年の出来事の影響は4分の3に薄れる
    ST_KEYS.forEach(function (k) { S.shock[k] *= 0.75; if (Math.abs(S.shock[k]) < 0.5) S.shock[k] = 0; });
    (rec.events || []).forEach(function (e) {
      var hit = {};
      if (e.st) {
        for (var sk in e.st) { S.shock[sk] += e.st[sk]; hit[sk] = 1; why.push({ k: sk, d: e.st[sk], t: e.t.length > 30 ? e.t.slice(0, 29) + '…' : e.t, ev: [] }); }
        return;
      }
      if (e.story) return;
      ST_RULES.forEach(function (ru) {
        if (hit[ru.k] || !ru.re.test(e.t)) return;
        if (ru.self && (WHO_OTHER.test(e.t) || /子どもの|息子の|娘の|孫の/.test(e.t))) return;
        if (ru.k === 'body' && /亡くなった/.test(e.t) && !/(入院|手術|骨折|寝込)/.test(e.t)) return;
        hit[ru.k] = 1;
        S.shock[ru.k] += ru.d;
        why.push({ k: ru.k, d: ru.d, t: e.t.length > 30 ? e.t.slice(0, 29) + '…' : e.t, ev: e.ev || [] });
      });
    });
    var ind = S.ind;
    // からだ：年齢の目安＋生まれつきの差＋出来事
    var bodyT = stLin(BODY_AGE, a) + 8 * ind.body;
    // 暮らしの満足：その年に「暮らしが苦しい」と答えた世帯の割合＋家の暮らしむき＋家族
    var f = feelOf(C, y), satT = 52;
    if (f) satT += (0.5 - f.hard) * 40;
    if (L.old && y < 1975) satT += OLD_SAT[L.status] || 0;
    else if (typeof L.incPct === 'number') satT += 20 * (L.incPct - 0.5);
    if (L.stage === 'jobless') satT -= 8;
    if (L.married) satT += 4;
    // 学び：学校や学歴の目安＋生まれつきの得意不得意
    // 子どものうちは年齢とともに伸び、学校を終えたあとは学歴の目安に、働きながら身につけた分を少し足す
    var eduT = L.edu && LEARN_EDU[L.edu] != null ? LEARN_EDU[L.edu] : 34;
    var growT = 12 + Math.min(a, 12) * 2.6;
    var learnT = L.school ? Math.min(20 + a * 3, 80) : a < 13 ? growT : Math.max(eduT, Math.min(growT, 40));
    if (!L.school && a >= 20 && a < 75) learnT += Math.min(8, (a - 20) * 0.25);
    if (a >= 75) learnT += 8 - (a - 75) * 0.6;
    learnT += 6 * ind.study;
    // つながり：一緒に暮らす人と家族の数
    var mem = L.members || [];
    var kids = mem.filter(function (m) { return m.role === '子' && m.alive && !m.gone && m.by <= y; }).length;
    var parents = mem.filter(function (m) { return (m.role === '父' || m.role === '母') && m.alive; }).length;
    var tieT = 50 + 5 * ind.social + (L.married ? 12 : 0) + Math.min(kids, 3) * 3;
    if (a < 18) tieT += parents * 6;
    if (a >= 70 && !L.married) tieT -= 8;
    // 今年の重点で、目安を少しだけ動かす
    var tg = { body: bodyT, sat: satT, learn: learnT, tie: tieT };
    // 物語で続いていく影響（夢をかなえた・地元に戻った など）
    if (L.story && L.story.base) ST_KEYS.forEach(function (k) { tg[k] += clamp(L.story.base[k] || 0, -15, 15); });
    var fb = L.focus && FOCUS_BONUS[L.focus];
    if (fb) for (var fk in fb) { tg[fk] += fb[fk]; why.push({ k: fk, d: fb[fk], t: '今年の重点「' + FOCUS[L.focus] + '」', ev: [], focus: true }); }
    // 目安は一気に変わらず、1年に4割ずつ近づく
    if (!S.base) S.base = tg;
    else ST_KEYS.forEach(function (k) { S.base[k] += (tg[k] - S.base[k]) * 0.4; });
    var v = {
      body: S.base.body + S.shock.body, sat: S.base.sat + S.shock.sat,
      learn: S.base.learn + S.shock.learn, tie: S.base.tie + S.shock.tie
    };
    ST_KEYS.forEach(function (k) { v[k] = Math.round(clamp(v[k], 0, 100)); });
    // 出来事で説明しきれない動きには、もとになった目安を理由として書く
    if (prev) {
      var base = {
        body: { t: a >= 40 ? '年齢とともに体が変わっていく' : '体が育ち、また前の年の不調から回復していく', ev: [ev(C, est ? 'ipss' : 'lifetable', y, 'からだの数値は年齢ごとの亡くなる確率の形から作った目安', '', { est: true })] },
        sat: { t: '家の暮らしむきと、世の中の景気', ev: f ? [ev(C, 'income', f.y, '暮らしが「苦しい」と答えた世帯の割合（国民生活基礎調査）' + (f.y !== y ? '。この年の数字がないため' + f.y + '年の値' : ''), pct(f.hard), { est: f.y !== y || est })] : [] },
        learn: { t: L.school ? '学校で学んでいる' : '仕事や暮らしの中で身につけたこと', ev: [ev(C, 'school', y, '学歴ごとの学びの目安', L.edu || 'まだ学校に通う前', { est: true })] },
        tie: { t: '一緒に暮らす人や家族の数', ev: [ev(C, 'census', y, '世帯の人数と家族の形', '', { est: true })] }
      };
      ST_KEYS.forEach(function (k) {
        if (v[k] !== prev[k] && !why.some(function (w) { return w.k === k; })) why.push({ k: k, d: v[k] - prev[k], t: base[k].t, ev: base[k].ev });
      });
    }
    S.v = v;
    rec.st = { body: v.body, sat: v.sat, learn: v.learn, tie: v.tie, est: est, why: why, prev: prev };
    return rec.st;
  }
  // からだの数値で亡くなる確率を少し補正する。幅は都道府県の生命表の差（およそ上下15%）と同じくらいにした。
  // 全体の平均は生命表に合うよう割り戻してある
  var BODY_K = 0.018, BODY_NORM = 1.02;
  function bodyMult(L, age) {
    if (!L.st4 || !L.st4.v) return 1;
    var d = L.st4.v.body - stLin(BODY_AGE, age);
    return clamp(Math.exp(-BODY_K * d) / BODY_NORM, 0.6, 1.8);
  }

  /* ---------- 人生地図：その年のいちばん大きな出来事の種類（7種類まで） ----------
     強い順に 災害・戦争 > 病気・けが > 結婚 > 子ども > 学び > 仕事 > 引っ越し。どれでもない年は 0 */
  var MAP_KINDS = ['', '学び', '仕事', '結婚', '子ども', '病気・けが', '災害・戦争', '引っ越し'];
  var MAP_RULES = [
    [6, /空襲|地震|津波|洪水|台風|噴火|大火|戦死|召集|出征|戦地|家が焼け|焼け出さ|浸水|飢饉|凶作|疎開|引き揚げ/],
    [5, /入院|手術|骨折|寝込|療養|持病|と診断され|体調を崩|けがをし|大けが|病気になっ|病気にかか|高い熱|結核にかか|インフルエンザにかか/],
    [3, /さんと結婚した|と結婚した|夫婦になった|嫁いだ|婿に入|パートナーと暮らし始め|と一緒に暮らし始め/],
    [4, /(長男|長女|次男|次女|三男|三女|四男|四女|男の子|女の子|子ども)が生まれた/],
    [1, /に入学した|へ進んだ|に進んだ|進学した|卒業し|寺子屋|藩校|村学校|資格を取|学び始め|夜学/],
    [2, /働き始め|働きに出|就職|勤め先|奉公|定年|仕事をやめ|職を失|家業を継/],
    [7, /引っ越し|転校|移り住|上京し|移民|渡った|村を出/]
  ];
  function yearKind(rec, L, dead) {
    if ((dead || rec.dead) && L) return L.cause === 'disaster' || L.cause === 'war' ? 6 : (L.cause === 'ill' ? 5 : 0);
    var best = 0, rank = 99;
    (rec.events || []).forEach(function (e) {
      for (var i = 0; i < MAP_RULES.length; i++) {
        if (i >= rank) break;
        var k = MAP_RULES[i][0];
        if (!MAP_RULES[i][1].test(e.t)) continue;
        if ((k === 5 || k === 1 || k === 2 || k === 7) && (WHO_OTHER.test(e.t) || /子どもの|息子の|娘の|孫の/.test(e.t))) continue;
        best = k; rank = i; break;
      }
    });
    return best;
  }

  /* ---------- 今年の重点とおまかせ ----------
     重点は4つの数値の伸び方を少し変えるだけ（からだは亡くなる確率の補正にも入る）。分かれ道の結果は今までどおり統計の割合で決まる。
     おまかせは、重点に沿った答えを選ぶ。重点がないときは統計どおりに進む（答えなし）。 */
  var FOCUS = { study: '学ぶ', earn: '稼ぐ', family: '家族', body: 'からだ', save: '貯める' };
  var FOCUS_BONUS = { study: { learn: 5 }, earn: { sat: 3, tie: -2 }, family: { tie: 6 }, body: { body: 4 }, save: { sat: -1 } };
  var FOCUS_PICK = {
    study: { take: 'take', course: 'gen', path: 'univ', loc: 'away', dir: 'care', m: 'maybe', o: 'friend', p: 'live', out: 'go', marry: 'yes', pathOld: 'study' },
    earn: { take: 'no', course: 'voc', path: 'work', loc: 'away', dir: 'office', m: 'maybe', o: 'friend', p: 'live', out: 'go', marry: 'yes', pathOld: 'work' },
    family: { take: 'no', course: 'gen', path: 'semi', loc: 'local', dir: 'care', m: 'yes', o: 'family', p: 'pledge', out: 'stay', marry: 'yes', pathOld: 'work' },
    body: { take: 'no', course: 'gen', path: 'semi', loc: 'local', dir: 'service', m: 'maybe', o: 'friend', p: 'live', out: 'stay', marry: 'yes', pathOld: 'study' },
    save: { take: 'no', course: 'voc', path: 'work', loc: 'local', dir: 'office', m: 'maybe', o: 'friend', p: 'live', out: 'stay', marry: 'yes', pathOld: 'work' }
  };
  function autoAnswer(br, focus) {
    if (!br || br.ask) return null;
    if (br.id === 'story') { var SM = storyMod(); return SM ? SM.autoAnswer(br, focus) : null; }
    if (!focus || !FOCUS_PICK[focus]) return null;
    var t = FOCUS_PICK[focus], a = {};
    (br.groups || []).forEach(function (g) {
      var want = g.id === 'path' && br.kind === 'path' ? t.pathOld : t[g.id];
      var ok = g.options.some(function (o) { return o.k === want; });
      a[g.id] = ok ? want : g.options[0].k;
    });
    return a;
  }

  /* ---------- お金の見える化（手取り・今の物価・米に直した目安・貯金） ----------
     金額は千円単位。real は2025年の物価、nominal はその年のお金。
     貯金は家計調査（貯蓄・負債編）の「貯蓄現在高 ÷ 年間収入」を、年齢と暮らしむきの段（5段）ごとに目安にして近づけていく。
     病気・失業・災害・離婚などの出来事で減る。乱数は別のもの（種から作る）を使うので、ほかの抽選の順番は変わらない。 */
  var SAV_AGES = [25, 35, 45, 55, 65, 75];
  var OLD_Q = { kuge: 4, genin: 1, satsumon: 1, gusuku: 2, bushi: 3, chonin: 3, hyakusho: 2, priest: 3, outcast: 1, ainu: 1, ryukyuShi: 3, ryukyuHyakusho: 2, shizoku: 3, buraku: 1, heimin: 2 };
  var MONEY_RULES = [
    { re: /職を失|失業し|倒産し|解雇され|雇い止め|勤め先がなくな/, f: 0.2, t: '仕事を失い、貯金を取り崩した' },
    { re: /家を失|家が壊|家が流さ|焼け出さ|全壊|半壊|床上まで|浸水し|空襲で家|家が焼け/, f: 0.3, t: '災害で家や家財を失い、建て直しに貯金を使った' },
    { re: /入院|手術|療養|大けが/, f: 0.08, t: '病気やけがの治療に貯金を使った' },
    { re: /離婚した/, f: 0.25, t: '離婚で家計が分かれ、貯金が減った' },
    { re: /さんと結婚した|と結婚した|夫婦になった/, f: 0.05, t: '結婚の支度に貯金を使った' },
    { re: /飢饉|凶作/, f: 0.3, t: '不作の年をしのぐため、蓄えを取り崩した' }
  ];
  function priceOf(L, y) {
    // 2025年を1とした物価。昔の人生は history.json の物価のつながり、1975年からは消費者物価指数
    var C = L.C;
    if (L.H && L.H.price && y < 1970) return { p: val(L.H.price, y), src: (L.H.priceSrc || {})[y] || 'clio' };
    return { p: val(C.nat.cpi, Math.min(y, 2025)) / val(C.nat.cpi, 2025), src: 'cpi' };
  }
  function priceEv(L, y, pr) {
    var C = L.C;
    var what = { cpi: '消費者物価指数（総合）で2025年の物価に直した', cpiLong: '消費者物価指数の長期時系列（持家の帰属家賃を除く総合）で2025年の物価に直した', boj: '日本銀行の戦前基準企業物価指数と消費者物価指数をつないで2025年の物価に直した（推計）', clio: '物価の上がり幅の研究（Clio Infra）と日本銀行・消費者物価指数をつないで2025年の物価に直した（推計）' }[pr.src];
    var srcKey = pr.src === 'cpiLong' ? 'cpi' : pr.src;
    return ev(C, srcKey, y, what, 'その年の1' + (y < 1871 ? '両' : '円') + '＝今の約' + Math.round(1 / pr.p).toLocaleString('ja-JP') + '円', { est: pr.src !== 'cpi' && pr.src !== 'cpiLong' });
  }
  function takeRate(C, y) {
    var t = C.nat.takeHome;
    if (!t) return null;
    var ks = Object.keys(t).map(Number).sort(function (a, b) { return a - b; });
    var yy = y < ks[0] ? ks[0] : y > ks[ks.length - 1] ? ks[ks.length - 1] : y;
    return { r: t[yy], y: yy, est: yy !== y };
  }
  // お金の選択で、貯まり方が長く変わる分（郵便貯金を続ける・住宅ローンを返す など）
  function moneyMul(L, y) {
    var k = 1;
    (L.moneyAdj || []).forEach(function (m) { if (m.mul && y >= m.y && y <= (m.until || 9999)) k *= m.mul; });
    return k;
  }
  function savTable(C, y) {
    var t = C.nat.savingRatio;
    if (!t) return null;
    var ks = Object.keys(t).map(Number).sort(function (a, b) { return a - b; });
    var yy = y < ks[0] ? ks[0] : y > ks[ks.length - 1] ? ks[ks.length - 1] : y;
    return { t: t[yy], y: yy };
  }
  function moneyYear(L, rec) {
    var C = L.C, y = rec.year, a = rec.age;
    if (!L.money) {
      var r = makeRng(((L.seed >>> 0) ^ 0x6a09e667) >>> 0);
      var q = typeof L.incPct === 'number' ? Math.min(5, 1 + Math.floor(L.incPct * 5)) : (OLD_Q[L.status] || 2);
      if (typeof L.incPct !== 'number') q = clamp(q + (r() < 0.25 ? 1 : r() < 0.33 ? -1 : 0), 1, 5);
      L.money = { r: r, q: q, sav: 0, incSum: 0, incN: 0, focus: null };
    }
    var M = L.money, inc = rec.income, pr = priceOf(L, y), why = [];
    M.focus = L.focus || null;
    var out = { est: y < 1975 || !!(inc && inc.est), why: why, priceSrc: pr.src, perNow: 1 / pr.p };
    if (inc && inc.real > 0) {
      M.incSum += inc.real; M.incN++;
      var tr = y >= 1871 ? takeRate(C, y) : null;
      out.take = tr ? inc.nominal * tr.r : null;
      out.takeReal = tr ? inc.real * tr.r : null;
      out.takeRate = tr;
      out.real = inc.real;
      // 米に直した目安：1830年ごろの米1石＝およそ1両とし、物価の動きに合わせて米の値段を動かす（推計）
      if (y < 1871 && L.H && L.H.price) out.koku = inc.nominal / (pr.p / val(L.H.price, 1830));
    }
    // 貯金：18歳から（それより前は家の家計）
    var st = savTable(C, y);
    if (a >= 18 && st) {
      var ai = 0;
      for (var i = 0; i < SAV_AGES.length; i++) if (Math.abs(SAV_AGES[i] - a) < Math.abs(SAV_AGES[ai] - a)) ai = i;
      var row = st.t[SAV_AGES[ai]], ref = st.t[45];
      // この人の稼ぎの水準（これまでの平均の年収）を、表の同じ段の年間収入と比べて目安を伸び縮みさせる
      var avg = M.incN ? M.incSum / M.incN : 0;
      var scale = clamp(avg / (ref.inc[M.q - 1] * 10), 0, 2.5);
      if (L.married) scale *= 1.3;
      var target = row.sav[M.q - 1] * 10 * scale * (M.focus === 'save' ? 1.15 : 1) * moneyMul(L, y);
      if (a < 25) target *= (a - 17) / 8;
      var before = M.sav;
      M.sav += (target - M.sav) * 0.25;
      var hit = false;
      (rec.events || []).forEach(function (e) {
        MONEY_RULES.forEach(function (ru) {
          if (hit || !ru.re.test(e.t)) return;
          if (/^(父|母|祖父|祖母|兄|姉|弟|妹|息子|娘|子ども|孫|友|同僚|近所)/.test(e.t) && ru.f !== 0.3) return;
          hit = true;
          var loss = M.sav * ru.f;
          M.sav -= loss;
          why.push({ t: ru.t, d: -loss, ev: e.ev || [] });
        });
      });
      // お金の選択（第4弾の11）：その年の貯金に足し引きする。額は年収かその時の貯金に対する割合で決める
      (L.moneyAdj || []).forEach(function (m) {
        if (m.y !== y || m.done) return;
        m.done = true;
        var avgInc = M.incN ? M.incSum / M.incN : 0;
        var d = (m.f ? M.sav * m.f : 0) + (m.inc ? avgInc * m.inc : 0);
        if (d < 0 && -d > M.sav) d = -M.sav;
        M.sav += d;
        why.push({ t: m.t, d: d, ev: [], choice: true });
      });
      if (M.sav < 0) M.sav = 0;
      out.sav = M.sav;
      out.savNominal = M.sav * pr.p;
      out.savEv = ev(C, 'kakeichosa', st.y, '世帯主が' + (SAV_AGES[ai] === 25 ? '29歳以下' : SAV_AGES[ai] === 75 ? '70歳以上' : (SAV_AGES[ai] - 5) + '〜' + (SAV_AGES[ai] + 4) + '歳') + 'の二人以上の世帯で、貯蓄の多さが下から' + M.q + '番目の段の平均の貯蓄（年間収入 ' + row.inc[M.q - 1] + '万円）' + (st.y !== y ? '。この年の数字がないため' + st.y + '年の値で、この人の稼ぎに合わせて伸び縮みさせた目安' : '。この人の稼ぎに合わせて伸び縮みさせた目安'), row.sav[M.q - 1].toLocaleString('ja-JP') + '万円', { est: true });
      if (Math.abs(M.sav - before) >= 1 && !why.length) why.push({ t: M.sav > before ? '稼ぎの一部を貯めた' : '暮らしのために少しずつ取り崩した', d: M.sav - before, ev: [out.savEv] });
    }
    out.priceEv = priceEv(L, y, pr);
    if (out.takeRate) out.takeEv = ev(C, 'kakeichosa', out.takeRate.y, '勤め人の世帯の収入のうち、税金と社会保険料を引いた手取り（可処分所得）の割合' + (out.takeRate.est ? '。この年の数字がないため' + out.takeRate.y + '年の値' : ''), pct(out.takeRate.r), { est: out.takeRate.est });
    rec.money = out;
    return out;
  }

  /* ---------- 節目の問いかけ（5・15・30・50・70歳）。答えは人生の進み方に関わらない ---------- */
  var ASK_AGES = [5, 15, 30, 50, 70];
  function askFor(L) {
    var y = L.year, a = L.age, by = L.by, q = [];
    var kids = L.members.some(function (m) { return m.role === '子' && m.alive && !m.gone; });
    var lostParent = L.members.some(function (m) { return (m.role === '父' || m.role === '母') && !m.alive && m.dy && m.dy <= y && !m.before; });
    var lostSpouse = L.widowed || L.members.some(function (m) { return m.role === '配偶者' && !m.alive && m.dy && m.dy <= y; });
    var edo = y < 1868, prewar = y >= 1868 && y < 1937, war = y >= 1937 && y <= 1945, post = y > 1945 && y < 1975;
    if (a === 5) {
      q.push('この子が大人になるころ、世の中はどう変わっていると思いますか');
      q.push('この子のいちばん古い記憶は、どんな場面だと思いますか');
      if (lostParent) q.push('幼くして親を亡くしたこの子に、何を残してあげたいですか');
      if (war) q.push('空襲や食べ物の足りない日々を知るこの子に、何と声をかけますか');
      if (edo) q.push('学校のない時代に育つこの子に、あなたなら何を教えますか');
      if (y >= 1975) q.push('あなたが5歳のころ、何がいちばん楽しみでしたか');
    } else if (a === 15) {
      q.push('あなたが15歳だったころ、いちばん悩んでいたことは何ですか');
      if (edo || prewar) q.push('15歳でもう働き手とされる時代です。あなたなら学ぶことと働くことのどちらを選びますか');
      if (war) q.push('勉強より工場や畑の仕事が優先された15歳の毎日を、あなたならどう過ごしますか');
      if (post || y >= 1975) q.push('15歳のこの人に、ひとつだけ助言できるとしたら何を伝えますか');
      if (L.ainu || L.ryukyu) q.push('自分の言葉や暮らしを変えるよう求められる15歳に、何と言ってあげたいですか');
    } else if (a === 30) {
      if (kids) q.push('30歳で子どもを育てているこの人。あなたにとって家族とは何ですか');
      else if (L.married) q.push('30歳で連れ合いと暮らすこの人。あなたは誰と生きていきたいですか');
      else q.push('30歳でひとりのこの人。あなたが30歳のころ大事にしていたものは何ですか');
      if (edo || prewar) q.push('平均寿命が40年ほどの時代の30歳です。残りの時間を何に使いますか');
      q.push('ここまでの30年で、いちばんの分かれ目はどこだったと思いますか');
    } else if (a === 50) {
      q.push('これまでの50年で、いちばん忘れられない年はいつですか');
      if (lostSpouse) q.push('連れ合いを亡くしたこの人に、どんな言葉をかけたいですか');
      if (edo || prewar) q.push('50歳は長生きと言われた時代です。あなたは何歳まで生きたいですか');
      if (y >= 1975) q.push('50歳からやり直せるとしたら、何を始めますか');
    } else if (a === 70) {
      q.push('この人が70年で見てきた世の中の変わり方を、若い人にどう伝えますか');
      q.push('70歳の自分に手紙を書くとしたら、最初の一行は何にしますか');
      if (by >= 1790 && by < 1900) q.push('江戸や明治から生きてきたこの人が、いちばん驚いたことは何だったと思いますか');
      if (by < 1600) q.push('戦や飢饉の続く世を70年生きたこの人に、何と声をかけますか');
      if (by >= 1920 && by <= 1935) q.push('戦争を子どものころに見たこの人は、孫に何を語ると思いますか');
    }
    var t = q[((L.seed >>> 0) + a) % q.length]; // 乱数を使わずに選ぶ（人生の進み方を変えないため）
    return { id: 'ask', kind: 'ask', ask: true, title: a + '歳の節目', q: t + '？', groups: [], ev: [] };
  }
  // 問いかけの答え（書かずに進んでもよい。40字まで）
  function answerAsk(L, br, answers) {
    var text = answers && typeof answers.text === 'string' ? answers.text.replace(/\s+/g, ' ').trim().slice(0, 40) : '';
    L.notes = L.notes || [];
    L.notes.push({ age: L.age, year: L.year, q: br.q, text: text });
  }

  /* ---------- 亡くなり方をくわしく書く（昔の人生の進め方でも使う） ---------- */
  var ACC_NAMES = ['交通事故', '転倒・転落', '溺れる事故', '窒息', '火事', '中毒', 'その他の事故', '他殺', 'その他の外因'];
  // 年齢・性別・年に合う死因を、人口動態統計の死因の割合から選ぶ。kind を渡すとその種類（ill・acc・sui）の中から選ぶ
  function causesMod() {
    if (typeof self !== 'undefined' && self.IchiokuCauses) return self.IchiokuCauses;
    if (typeof require === 'function') { try { return require('./causes.js'); } catch (e) { return null; } }
    return null;
  }
  function pickCause(C, a, sex, y, rnd, kind, ctx) {
    var D = C.nat.causeDetail;
    if (!D || !D.dist) return null;
    var bi = 0;
    for (var i = 0; i < D.bands.length; i++) if (a >= D.bands[i][0] && a <= D.bands[i][1]) bi = i;
    var d = D.dist[bi] || {};
    var keys = Object.keys(d).filter(function (k) {
      if (sex === 'm' && (k === '乳がん' || k === '子宮がん')) return false;
      if (sex === 'f' && k === '前立腺がん') return false;
      if (k === '新型コロナウイルス感染症' && y < 2020) return false;
      var kk = k === '自殺' ? 'sui' : ACC_NAMES.indexOf(k) >= 0 ? 'acc' : 'ill';
      return !kind || kk === kind;
    });
    var tot = 0, name = null, u = 0.5;
    keys.forEach(function (k) { tot += Math.max(0, d[k]); });
    if (!keys.length || tot <= 0) return null;
    var x = rnd() * tot;
    for (var i = 0; i < keys.length; i++) { var w = Math.max(0, d[keys[i]]); if (x < w) { name = keys[i]; u = w ? x / w : 0.5; break; } x -= w; }
    if (!name) name = keys[keys.length - 1];
    // 統計で「その他の病気」「がん（ほかのがん）」「その他の事故」とまとめられたものは、細かい病名に分ける（js/causes.js。推計）
    var K = causesMod(), rare = /^(その他の事故|その他の外因|窒息|溺れる事故|転倒・転落)$/.test(name) && K && K.rareModern && ctx ? K.rareModern(y, a, sex, ctx.place, ctx.pref, u) : null;
    var sub = rare || (K && K.refine ? K.refine(name, a, sex, y, u) : name);
    return { name: sub, group: sub !== name ? name : null, share: d[name] * (sub !== name && K.subShare ? K.subShare(name, a, sex, y, sub) : 1), kind: name === '自殺' ? 'sui' : ACC_NAMES.indexOf(name) >= 0 ? 'acc' : 'ill', years: D.years };
  }
  // 病気ごとの経過（統計ではなく、その病気でよく見られる経過の書き方）
  var COURSE = {
    // 1974年までの死因（js/causes.js）の経過。統計ではなく、その病でよく見られた経過の書き方
    '疱瘡': ['高い熱のあと、顔と体に赤いできものが広がった。疱瘡だった。家族は戸口に赤い紙を貼って祈った'],
    'はしか': ['はしかにかかり、熱と咳が何日も続いた。いったん下がりかけた熱が、また上がった'],
    '赤痢': ['ひどい腹下しと血の混じる便が続いた。赤痢だった。水も受けつけなくなった'],
    '疫病・はやり病': ['村にはやり病が広がり、高い熱が出て床についた。看病していた家族にもうつった'],
    'コレラ': ['激しい下痢と吐き気が急に始まり、たった数日で体が干からびたようになった。コレラだった'],
    '腸チフス': ['何日も高い熱が下がらず、腹が張って、うわごとを言うようになった。腸チフスだった'],
    'ジフテリア': ['のどが腫れて息ができなくなった。ジフテリアだった'],
    '百日咳': ['発作のような咳が止まらず、ひと晩じゅう息を詰まらせた'],
    '労咳': ['咳が長く続き、血を吐くようになった。労咳（結核）だった。少しずつやせ細っていった'],
    '脚気': ['足がむくんでしびれ、歩くのがつらくなった。脚気だった。やがて胸が苦しくなり、心臓が弱った'],
    '中風': ['ある朝、半身が動かなくなった。中風だった。何年か床についたまま暮らした'],
    '卒中': ['仕事の最中に突然倒れ、そのまま目を覚まさなかった'],
    '腹の病・癪': ['腹の激しい痛みが何日も続いた。薬も祈祷も役に立たなかった'],
    '水腫': ['体じゅうがむくみ、息をするのも苦しくなった'],
    '産後の病・難産': ['お産が重なり、産後の熱が下がらなかった'],
    '妊娠・出産': ['お産のあと、出血が止まらなかった'],
    '飢え': ['不作が続き、食べるものが底をついた。草の根や木の皮で飢えをしのいだが、力が尽きた'],
    '栄養失調': ['食べるものが足りず、やせ細って体が弱っていった。栄養失調だった'],
    '溺死': ['川で足をとられ、流された'],
    '落馬・転落': ['崖の道で足をすべらせて落ちた'],
    '転落・けが': ['仕事中に高い所から落ち、大けがを負った'],
    '山仕事・野良仕事のけが': ['山で木を伐っているとき、倒れてきた木の下敷きになった'],
    'けんか・刀傷': ['酒の席の口論から刃傷沙汰になり、深い傷を負った'],
    'いくさ': ['いくさに駆り出され、戻らなかった'],
    '腫れ物': ['背中にできた腫れ物が膿み、高い熱が続いた'],
    '梅毒': ['長く患った瘡（梅毒）が体の奥まで進み、床から起き上がれなくなった'],
    '胃の病': ['胃の痛みが続き、食べたものを吐くようになった。やがて何も食べられなくなった'],
    '腹くだし': ['ひどい腹くだしが続き、乳も受けつけなくなった'],
    'ひきつけ': ['高い熱のあと、ひきつけを起こした。手当てのしようがなかった'],
    '乳が足りず弱った': ['母の乳の出が悪く、もらい乳もままならず、日に日にやせて弱っていった'],
    '乳児脚気': ['乳を吐き、手足がむくんで、息が苦しそうになった。乳児脚気だった'],
    '生まれつきの梅毒': ['生まれたときから肌に湿疹があり、体が弱かった。母からうつった梅毒だった'],
    '疳の病': ['夜泣きと腹下しが続き、やせて弱っていった'],
    '腎炎': ['顔と足がむくみ、尿が出にくくなった。腎臓の病だった'],
    '肝硬変': ['腹が張って黄だんが出た。肝臓の病が進んでいた'],
    '心臓の病気': ['息切れと動悸が続き、ある晩、胸を押さえて倒れた'],
    '鉄道・馬車の事故': ['荷車や馬車の事故に巻き込まれた'],
    '生まれつきの病気・早産': ['予定より早く小さく生まれ、乳を吸う力も弱かった'],
    'がん': ['がんが見つかったのは、亡くなる前の年だった。治療を続けたが、少しずつ食事がとれなくなっていった', 'がんが体のあちこちに広がっていると告げられてから、半年ほどだった'],
    '胃がん': ['胃のあたりの痛みと胸やけが続き、検査で胃がんと分かった。手術を受けたが、やがて再発した'],
    '大腸がん': ['便に血が混じるようになり、大腸がんと分かった。治療を続けたが、病は進んでいった'],
    '肝臓がん': ['体のだるさと黄だんが出て、肝臓がんと分かった。見つかったときには、すでに進んでいた'],
    'すい臓がん': ['背中の痛みと体重の減りが続き、すい臓がんと分かった。見つかってから数か月だった'],
    '肺がん': ['咳と息苦しさが続き、肺がんと分かった。治療を重ねたが、息をするのが少しずつ苦しくなっていった'],
    '乳がん': ['胸のしこりに気づき、乳がんと分かった。何年も治療を続けたが、病は骨や肺に広がった'],
    '子宮がん': ['子宮がんと分かり、手術と放射線の治療を受けたが、再び悪くなった'],
    '前立腺がん': ['前立腺がんと分かり、長く治療を続けたが、病は骨に広がった'],
    '白血病': ['熱とあざが続き、白血病と分かった。長い入院と治療が続いた'],
    '急性心筋梗塞': ['胸の強い痛みを訴えて倒れ、そのまま帰らぬ人となった'],
    '心不全': ['息切れと足のむくみが続き、入院と退院をくり返していた'],
    'くも膜下出血': ['突然、激しい頭痛を訴えて倒れ、意識が戻らなかった'],
    '脳出血': ['突然倒れて意識を失い、数日後に息を引き取った'],
    '脳梗塞': ['ろれつが回らなくなって倒れ、体の片側が動かなくなった。それから寝たきりの日々が続いていた'],
    '大動脈瘤・大動脈解離': ['胸から背中にかけての激しい痛みに襲われ、急いで運ばれたが助からなかった'],
    '肺炎': ['かぜをこじらせて高い熱が下がらず、肺炎になった'],
    '誤嚥性肺炎': ['飲み込む力が弱り、食べ物が気管に入って肺炎を起こした'],
    '慢性閉塞性肺疾患': ['長年の咳と息切れが少しずつひどくなり、酸素の管を手放せなくなっていた'],
    '糖尿病': ['長く患っていた糖尿病が悪くなり、体のあちこちが弱っていった'],
    '認知症': ['物忘れが進み、やがて家族の顔も分からなくなっていった'],
    'アルツハイマー病': ['アルツハイマー病で物忘れが進み、言葉も少なくなっていった'],
    '肝臓の病気': ['肝臓の病気が進み、おなかに水がたまるようになっていた'],
    '腎不全': ['腎臓の働きが落ち、体にむくみが出ていた'],
    '結核': ['長く咳が続き、熱と寝汗でやせ細っていった'],
    '敗血症': ['小さな傷から菌が体じゅうに回り、高い熱が出た'],
    '老衰': ['食が細くなり、眠っている時間が長くなっていった。眠るように息を引き取った'],
    '乳幼児突然死症候群': ['眠っている間に、突然息をしなくなった'],
    '生まれたときの病気': ['生まれたときから体が弱く、ずっと手当てを受けていた'],
    '生まれつきの病気': ['生まれつきの病気があり、手術も受けていた'],
    '新型コロナウイルス感染症': ['新型コロナウイルスに感染し、高い熱と息苦しさが続いた'],
    'インフルエンザ': ['インフルエンザにかかり、高い熱が続いた'],
    'その他の病気': ['病気で床につくようになり、そのまま回復しなかった'],
    '脳炎・脳症': ['高い熱のあと、けいれんを起こして意識が戻らなくなった。脳炎だった'],
    '心筋症': ['心臓の筋肉が弱る病気があり、少し動くだけで息が切れるようになっていた'],
    'てんかん': ['てんかんの持病があり、大きな発作のあと、意識が戻らなかった'],
    '神経や筋肉の難病': ['体の力が少しずつ抜けていく難しい病気で、長く療養を続けていた'],
    '腸閉塞': ['おなかが張って激しく痛み、腸がふさがっていると分かった。手術を受けたが、体力がもたなかった'],
    'ぜんそく': ['ぜんそくの大きな発作が夜中に起き、息ができなくなった'],
    '不整脈': ['脈がときどき乱れていた。ある日、急に胸が苦しくなって倒れた'],
    '膠原病': ['体のあちこちに炎症が起きる膠原病を長く患い、治療を続けていた'],
    '間質性肺炎': ['乾いた咳と息切れが少しずつひどくなり、間質性肺炎と分かった。酸素の管を手放せなくなっていた'],
    'パーキンソン病': ['手のふるえから始まったパーキンソン病が進み、歩くのも飲み込むのも難しくなっていた'],
    '高血圧の病気': ['長く血圧の高い状態が続き、心臓と腎臓が少しずつ弱っていった'],
    '尿路の感染症': ['尿の通り道から菌が入り、高い熱が続いた'],
    '胆のう・胆管の病気': ['右のわき腹の痛みと黄だんが出て、胆のうの病気と分かった'],
    '胃や腸からの出血': ['急に黒い便が出て、胃や腸から大量に出血していると分かった'],
    'すい炎': ['みぞおちから背中にかけて激しい痛みが続き、すい炎と分かった'],
    '血液の病気': ['血をつくる力が弱る病気で、輸血を続けていた'],
    'ALS（筋萎縮性側索硬化症）': ['手足の力が少しずつ抜けていくALSと分かり、やがて呼吸も機械の助けが必要になった'],
    '脳腫瘍': ['頭痛と吐き気が続き、脳に腫瘍が見つかった。手術と治療を続けた'],
    '神経芽腫': ['おなかのしこりから、神経芽腫という子どものがんが見つかった。長い入院が続いた'],
    '骨肉腫': ['足の痛みが続き、骨のがんだと分かった。手術と治療を続けた'],
    '悪性リンパ腫': ['首のしこりが消えず、悪性リンパ腫と分かった。治療を続けたが、再び悪くなった'],
    '胆のうがん': ['黄だんが出て、胆のうのがんと分かった。見つかったときには、すでに進んでいた'],
    '食道がん': ['食べ物がのどにつかえるようになり、食道がんと分かった。手術を受けたが、再発した'],
    '膀胱がん': ['尿に血が混じるようになり、膀胱がんと分かった。治療を続けたが、病は広がった'],
    '口とのどのがん': ['口の中の治らない傷から、がんが見つかった。手術を受けたが、病は首まで広がった'],
    '腎臓がん': ['検診で腎臓に影が見つかり、腎臓がんと分かった。手術のあと、肺に広がった'],
    '卵巣がん': ['おなかが張るようになり、卵巣がんと分かった。治療を続けたが、再び悪くなった'],
    '多発性骨髄腫': ['腰の痛みが続き、血液のがんの一つと分かった。長く治療を続けた'],
    '皮膚がん': ['足の裏のほくろが大きくなり、皮膚がんと分かった。病は体の中に広がっていった'],
    '熱中症': ['とても暑い日、家の中で具合が悪くなり、倒れているのを見つけられた'],
    '寒さによる事故': ['寒い夜、外で動けなくなり、体が冷えきってしまった'],
    '機械に挟まれる事故': ['仕事中、動いている機械に巻き込まれた'],
    '山や雪の事故': ['屋根の雪下ろしをしているとき、雪と一緒に落ちた', '山道で足をすべらせ、谷へ落ちた'],
    '感電': ['電気の工事をしているとき、感電した'],
    '交通事故': ['道を渡っているときに車にはねられた', '運転中に事故に遭った'],
    '転倒・転落': ['転んで頭を強く打った', '高い所から落ちた'],
    '溺れる事故': ['水の事故に遭い、溺れた'],
    '窒息': ['食べ物をのどに詰まらせた'],
    '火事': ['家が火事になり、逃げ遅れた'],
    '中毒': ['有毒なガスを吸い込んだ'],
    'その他の事故': ['思いがけない事故に遭った'],
    'その他の外因': ['思いがけない出来事に巻き込まれた'],
    '他殺': ['事件に巻き込まれ、命を奪われた'],
    '胃腸炎': ['ひどい下痢と熱が続き、数日のうちに体が弱りきった'],
    '疱瘡・はしか': ['高い熱と発疹が出て、何日も苦しんだ']
  };
  // 亡くなった場所（1951年からは人口動態統計の「死亡の場所」の割合。それより前は家で亡くなる人がほとんど）
  function placeOfDeath(C, y, rnd, kind) {
    if (kind === 'acc') return null;
    var t = C.nat.deathPlace;
    if (!t || y < 1951) return { w: '家', est: true, y: y };
    var yy = Math.min(y, Math.max.apply(null, Object.keys(t).map(Number)));
    var p = t[yy] || {};
    var k = pick(rnd, ['hospital', 'clinic', 'care', 'nursing', 'home', 'other'], function (x) { return p[x] || 0; });
    return { w: { hospital: '病院', clinic: '診療所', care: '介護施設', nursing: '老人ホーム', home: '自宅', other: '外出先' }[k], share: p[k], y: yy };
  }
  // 最期を見送った家族（生きていて別れていない配偶者・子・孫。いなければ、きょうだい）
  // 家を離れている間の亡くなった場所と看取り（v11の直し 1）
  var AWAY_PLACE = { shukke: function (L) { return L.templeName || '寺'; }, tabi: function () { return '旅先の宿'; }, hoko: function () { return '奉公先'; }, hei: function () { return '陣中'; } };
  var AWAY_SEE = { shukke: '寺の僧たちに看取られた', tabi: '一座の仲間に看取られた', hoko: '奉公先の人たちに看取られた', hei: '同じ隊の仲間に看取られた' };
  function mourners(L) {
    var y = L.year;
    function ok(m) { return m.alive && !m.gone && m.by <= y; }
    var list = L.members.filter(function (m) { return ok(m) && (m.role === '配偶者' || m.role === 'パートナー' || m.role === '子'); });
    if (!list.length && L.age < 30) list = L.members.filter(function (m) { return ok(m) && (m.role === '父' || m.role === '母'); });
    if (!list.length) list = L.members.filter(function (m) { return ok(m) && m.sib; });
    var order = { '配偶者': 0, 'パートナー': 0, '父': 1, '母': 2, '子': 3 };
    list.sort(function (p, q) { return ((order[p.role] != null ? order[p.role] : 4) - (order[q.role] != null ? order[q.role] : 4)) || p.by - q.by; });
    return list.slice(0, 3);
  }
  function whoName(m) {
    var r = m.role === '配偶者' ? (m.sex === 'm' ? '夫' : '妻') : m.role === '子' ? (m.sex === 'm' ? '息子' : '娘') : m.role;
    return r + (m.name && !/アイヌ語/.test(m.name) ? 'の' + m.name : '');
  }
  // 文を組み立てる。o：{ kind: ill|acc|sui|disaster|war, cause: pickCause の結果か死因の名前, head: 先に置く文 }
  function deathStory(L, o) {
    var C = L.C, y = L.year, a = L.age, rnd = L.rnd;
    var parts = [], evs = [];
    if (o.head) parts.push(o.head);
    var name = o.cause && (o.cause.name || o.cause);
    if (o.kind === 'sui') {
      // 自ら命を絶った場合は、方法や様子を書かない（報道の指針にそろえる）
      parts.push('自ら命を絶った');
    } else if (o.kind === 'ill' || o.kind === 'acc') {
      var K0 = causesMod(), rl = K0 && K0.rareLine ? K0.rareLine(name) : null;
      var c = COURSE[name] || (rl ? [rl] : null) || COURSE[o.kind === 'acc' ? 'その他の事故' : 'その他の病気'];
      var line = c[Math.floor(rnd() * c.length)];
      // 家を離れている間は、家族や村の暮らしの出てくる言い方を、その場の言い方に変える
      if (!homeLife(L)) line = line.replace(/^村に/, 'あたりに').replace(/看病していた家族/g, '看病してくれた人').replace(/家族/g, 'まわりの人');
      if (name === '転倒・転落') line = a >= 65 ? '家の中で転んで頭を強く打った' : '仕事中に高い所から落ちた';
      if (name === '溺れる事故' && a >= 65 && y >= 1960) line = '入浴中に意識を失い、湯船で溺れた';
      if (name === '窒息' && a < 2) line = '寝ている間に息ができなくなった';
      if (name === '交通事故' && y < 1930) line = '荷車や馬車の事故に巻き込まれた';
      if (name === '腎不全' && y >= 1970) line = '腎臓の働きが落ち、週に何度も人工透析に通っていた';
      if (name === '心不全' && y < 1950) line = '息切れと足のむくみが続き、床につく日が増えていった';
      parts.push(line);
    }
    // 場所と看取り
    var sudden = o.kind === 'acc' || o.kind === 'disaster' || o.kind === 'war' || ['急性心筋梗塞', 'くも膜下出血', '大動脈瘤・大動脈解離', '乳幼児突然死症候群'].indexOf(name) >= 0;
    if (o.kind === 'ill') {
      var pl = placeOfDeath(C, y, rnd, o.kind);
      if (pl) {
        parts.push((AWAY_PLACE[L.mode] ? AWAY_PLACE[L.mode](L) : pl.w) + 'で亡くなった');
        if (!pl.est) evs.push(ev(C, 'vital', pl.y, '亡くなった場所の割合（' + pl.w + '）', pct(pl.share)));
        else evs.push(ev(C, 'vital', 1951, '亡くなった場所の割合（1951年は自宅82.5%。それより前の統計はない）', '', { est: true }));
      }
    }
    if (o.kind !== 'war' && o.kind !== 'disaster' || o.withFamily) {
      var ms = homeLife(L) ? mourners(L) : [], aw = AWAY_SEE[L.mode];
      if (aw) parts.push(aw);
      else if (ms.length && (!sudden || rnd() < 0.4)) parts.push(ms.map(whoName).join('、') + 'に看取られた');
      else if (ms.length) parts.push('家族は最期に間に合わなかった');
      else parts.push('最期を看取る家族はいなかった');
    }
    parts.push(a === 0 ? '生まれて1年もたっていなかった' : a + '歳だった');
    return { text: y + '年、' + parts.join('。') + '。', evs: evs, name: name };
  }

  /* ---------- 場面の抽選 ---------- */
  function sceneBuckets(C) {
    if (C._buckets) return C._buckets;
    var b = [];
    for (var a = 0; a <= MAX_AGE; a++) b.push([]);
    C.scenes.forEach(function (s) { for (var a = s.a[0]; a <= Math.min(s.a[1], MAX_AGE); a++) b[a].push(s); });
    Object.defineProperty(C, '_buckets', { value: b, enumerable: false });
    return b;
  }
  function sceneOk(L, s) {
    var y = L.year, c = s.c || {};
    if (L.used[s.id]) return false;
    if (s.y && (y < s.y[0] || y > s.y[1])) return false;
    if (s.since && y < s.since) return false;
    if (y >= FUTURE_FROM && (s.y || s.cat === '時代')) return false;
    if (c.sex && c.sex !== L.sex) return false;
    if (c.kind && c.kind.indexOf(L.place.kind) < 0) return false;
    var tr = L.place.away ? {} : (L.place.muniObj || {});
    if (c.snow && !tr.snow) return false;
    if (c.coast && !tr.coast) return false;
    if (c.car && !(tr.car || L.place.kind === '町村')) return false;
    if (c.stage && c.stage.indexOf(L.stage) < 0) return false;
    if (c.married === true && !L.married) return false;
    if (c.married === false && L.married) return false;
    if (c.kids === true && L.kids === 0) return false;
    if (c.kids === false && L.kids > 0) return false;
    if (c.inc === 'low' && L.incPct > 0.35) return false;
    if (c.inc === 'high' && L.incPct < 0.65) return false;
    if (c.away === true && !L.place.away) return false;
    if (c.away === false && L.place.away) return false;
    if (c.edu && c.edu.indexOf(L.edu) < 0) return false;
    if (c.school && c.school.indexOf(L.school) < 0) return false;
    if (c.reg === true && !(L.job && L.job.reg)) return false;
    if (c.reg === false && !(L.job && !L.job.reg)) return false;
    if (c.threeGen && !L.threeGen) return false;
    if (c.need) for (var i = 0; i < c.need.length; i++) if (!living(L, c.need[i]).length) return false;
    if (c.oldParent) {
      var op = L.members.filter(function (m) { return (m.role === '父' || m.role === '母') && m.alive && y - m.by >= 75; });
      if (!op.length) return false;
    }
    if (c.lostParent && !L.members.some(function (m) { return (m.role === '父' || m.role === '母') && !m.alive && m.dy; })) return false;
    if (c.grand && !L.members.some(function (m) { return m.role === '孫' && m.alive; })) return false;
    if (c.ownGoods && !L.goods[c.ownGoods]) return false;
    if (c.sm === true && !L.sm) return false;
    if (c.sm && c.sm !== true && c.sm.indexOf(L.sm) < 0) return false;
    if (c.out && c.out.indexOf(L.out) < 0) return false;
    if (c.partner === true && !L.partner) return false;
    if (c.partnerOk && !partnerOk(L)) return false;
    if (c.pref && c.pref.indexOf(L.place.pref) < 0) return false;
    if (c.homePref && (L.place.pref === L.home.pref || c.homePref.indexOf(L.home.pref) < 0)) return false;
    if (c.yrs && c.yrs.indexOf(y) < 0) return false;
    if (c.widowed && !L.widowed) return false;
    return true;
  }
  function pickScene(L) {
    var bucket = sceneBuckets(L.C)[Math.min(L.age, MAX_AGE)];
    var cands = [];
    for (var i = 0; i < bucket.length; i++) if (sceneOk(L, bucket[i])) cands.push(bucket[i]);
    if (!cands.length) return null;
    var tot = L.catTotal + 6;
    var s = pick(L.rnd, cands, function (x) {
      var share = (L.cat[x.cat] + 1) / tot;
      return (x.w || 1) * Math.pow(TARGET[x.cat] / share, 2);
    });
    L.used[s.id] = 1;
    return s;
  }

  // 文中の {父} などを生きている家族の続柄に置き換える
  function fill(L, t, mem) {
    return t.replace(/\{(父|母|きょうだい|配偶者|パートナー|子|孫|祖父|祖母|町|県)\}/g, function (_, k) {
      if (k === '町') return L.place.away ? L.place.prefName : L.place.muniName;
      if (k === '県') return L.place.prefName;
      var list = living(L, k);
      if (!list.length) return k;
      var m = list[Math.floor(L.rnd() * list.length)];
      if (mem) mem.push(m.id);
      return relWord(L, m);
    });
  }

  /* ---------- まとめて回す ---------- */
  function autoRun(L) {
    var guard = 0;
    while (L.alive && guard++ < 200) {
      var rec = step(L);
      while (rec && rec.branch) rec = resolve(L, null);
    }
    return L;
  }
  // 同じ町・同じ年に生まれた100人のその後（最期の画面）
  // 年齢ごとの暮らしの満足の平均（一生の浮き沈みの曲線の「比べる線」）。その年齢で生きている人だけで平均し、10人を下回る年齢は null
  function satAdd(r, L) {
    r.satSum = r.satSum || []; r.satN = r.satN || [];
    L.log.forEach(function (rec) { if (rec.st && rec.st.sat != null) { r.satSum[rec.age] = (r.satSum[rec.age] || 0) + rec.st.sat; r.satN[rec.age] = (r.satN[rec.age] || 0) + 1; } });
  }
  function satDone(r) {
    r.satAvg = [];
    for (var a = 0; a < (r.satN || []).length; a++) r.satAvg.push(r.satN[a] >= 10 ? r.satSum[a] / r.satN[a] : null);
    delete r.satSum;
  }
  function cohort(C, P, year, muniCode, seed, n) {
    n = n || 100;
    var r = { n: n, stayed: 0, univ: 0, to80: 0, married: 0 }, earns = [];
    for (var i = 0; i < n; i++) {
      var L = autoRun(newLife(C, P, { year: year, muniCode: muniCode, seed: (seed * 7919 + i * 104729 + 13) >>> 0 }));
      if (L.stats.atHome30) r.stayed++;
      if (L.stats.univ) r.univ++;
      if (L.deathAge >= 80) r.to80++;
      if (L.everMarried) r.married++;
      earns.push(L.earn ? L.earn.real : 0);
      satAdd(r, L);
    }
    earns.sort(function (p, q) { return p - q; });
    r.earnMedian = (earns[Math.floor((n - 1) / 2)] + earns[Math.ceil((n - 1) / 2)]) / 2;
    satDone(r);
    return r;
  }
  function majorTimeline(C, by, until, prefCode) {
    return C.timeline.filter(function (r) {
      return r.major && r.y >= by && r.y <= until && (!r.regions || !r.regions.length || r.regions.indexOf(prefCode) >= 0 || r.alsoAll);
    }).map(function (r) { return { y: r.y, t: r.short || r.text, type: r.type }; });
  }
  function familyList(L) {
    return L.members.filter(function (m) { return m.by <= L.year && !m.before; }).map(function (m) {
      return { rel: relWord(L, m) + (m.side ? '（' + m.side + '）' : ''), name: m.name, by: m.by, alive: m.alive, dy: m.dy, gone: !!m.gone };
    });
  }

  return {
    FUTURE_FROM: FUTURE_FROM, CATS: CATS, TARGET: TARGET,
    houseOf: houseOf, heirCandidates: heirCandidates, childCandidates: childCandidates, childHouse: childHouse, satAdd: satAdd, satDone: satDone, postwarYear: postwarYear, wifeNameYear: wifeNameYear,
    makeRng: makeRng, nv: nv, val: val, deathProb: deathProb, invNorm: invNorm,
    pickPref: pickPref, newLife: newLife, step: step, resolve: resolve, autoRun: autoRun,
    cohort: cohort, majorTimeline: majorTimeline, familyList: familyList, fill: fill, sceneOk: sceneOk,
    pickCause: pickCause, deathStory: deathStory, COURSE: COURSE, ev: ev, askFor: askFor, answerAsk: answerAsk, ASK_AGES: ASK_AGES,
    storyMod: storyMod, jobsMod: jobsMod, goodsOk: goodsOk, eraWords: eraWords, awayWords: awayWords, asDecided: asDecided, WORK_RE: WORK_RE, STUDY_RE: STUDY_RE, homeLife: homeLife, HOME_RE: HOME_RE, WAR_BAN: WAR_BAN, storyName: storyName, namesMod: namesMod, withPool: withPool,
    statusYear: statusYear, bodyMult: bodyMult, moneyYear: moneyYear, autoAnswer: autoAnswer, FOCUS: FOCUS, yearKind: yearKind, MAP_KINDS: MAP_KINDS, ST_KEYS: ST_KEYS, ST_NAMES: ST_NAMES
  };
});
