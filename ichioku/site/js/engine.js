/* 1億分の1 人生の進め方（本体）
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

  /* ---------- 根拠（出来事を押すと出る統計） ---------- */
  function ev(C, src, year, what, value, extra) {
    var e = { src: src, name: (C.sources[src] || {}).name || src, org: (C.sources[src] || {}).org || '', y: year, what: what, val: value, prov: !!C.meta.provisional };
    if (extra) for (var k in extra) e[k] = extra[k];
    return e;
  }
  function pct(v) { return Math.round(v * 100) + '%'; }

  /* ---------- 死亡の確率（生命表から作った係数を使う） ---------- */
  function deathProb(C, P, sex, age, year) {
    var tab = (P && P.alpha) ? P.alpha : C.mort.alpha;
    var alpha = val(tab[sex], year), beta = C.mort.beta, bg = C.mort.bg;
    if (age === 0) return val(C.mort.q0, year);
    var h = alpha / beta * (Math.exp(beta * (age + 1)) - Math.exp(beta * age)) + bg;
    return clamp(1 - Math.exp(-h), 0, 1);
  }

  /* ---------- 名前（生まれた年の流行に合わせる。家族の中で重ねない） ---------- */
  function nameFor(L, sex, by) {
    var keys = Object.keys(L.C.names).map(Number).sort(function (a, b) { return a - b; });
    var k = keys[0];
    for (var i = 0; i < keys.length; i++) if (keys[i] <= by) k = keys[i];
    var list = L.C.names[k][sex];
    var used = {};
    L.members.forEach(function (m) { used[m.name] = 1; });
    if (L.name) used[L.name] = 1;
    var free = list.filter(function (n) { return !used[n]; });
    if (!free.length) free = L.C.names[keys[keys.length - 1]][sex].filter(function (n) { return !used[n]; });
    return free.length ? free[Math.floor(L.rnd() * free.length)] : list[0] + '（二）';
  }
  function addMember(L, role, sex, by, extra) {
    var m = { id: L.members.length + 1, role: role, sex: sex, by: by, alive: true, dy: null };
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

  function newLife(C, P, opts) {
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
      stats: { univ: false, emptyYears: 0, dupes: 0, nonreg: {}, atHome30: null, events: 0 }
    };
    CATS.forEach(function (c) { L.cat[c] = 0; });
    familyAtBirth(L);
    L.sm = drawMinority(L);
    L.out = null;
    return L;
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
    var k = pick(rnd, [1, 2, 3, 4], function (n) { return C.nat.sibDist[n - 1]; });
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
    C.goods.forEach(function (g) { if (val(g.diff, y) / 100 >= L.adoptU) L.goods[g.id] = y; });
    L.fAge = fAge; L.mAge = mAge; L.dad = dad; L.mom = mom;
  }
  function eduDraw(L, sex, by) {
    var t = L.C.nat.parentEdu[sex];
    var r = nv(t, by).v; // [中学, 高校, 短大・専門, 大学]
    var tilt = (L.incPct - 0.5) * 0.6;
    var w = [r[0] * (1 - tilt), r[1], r[2] * (1 + tilt * 0.5), r[3] * (1 + tilt)];
    var labels = ['中学', '高校', '短大・専門', '大学'];
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
    var rec = { year: y, age: a, place: placeLabel(L), world: worldLine(L, y, a), events: [], branch: null, future: y >= FUTURE_FROM };
    L.rec = rec;
    if (a === 0) birthEvent(L, rec);
    else {
      familyYear(L, rec);
      lifeYear(L, rec);
    }
    if (L.queue.length) { rec.branch = L.queue.shift(); return rec; }
    finishYear(L, rec);
    return rec;
  }

  function push(L, rec, cat, text, evs, extra) {
    var e = { cat: cat, t: text, ev: evs || [] };
    if (extra) for (var k in extra) e[k] = extra[k];
    rec.events.push(e);
    L.cat[cat]++; L.catTotal++;
    L.stats.events++;
    return e;
  }

  function birthEvent(L, rec) {
    var C = L.C, P = L.P, y = L.year;
    var share = val(L.place.muniObj.share, y);
    var sibs = L.members.filter(function (m) { return m.sib && m.by < y; });
    var s = L.place.prefName + L.place.muniName + 'で、' + (L.sex === 'm' ? '男の子' : '女の子') + 'として生まれた。名前は' + L.name + '。';
    s += '父は' + L.fAge + '歳で' + IND[L.dadJob].job + '、母は' + L.mAge + '歳で' + (L.momJob ? IND[L.momJob].job + 'をしている' : '家で家事をしている') + '。';
    if (sibs.length) s += sibs.map(function (m) { return m.role + 'の' + m.name; }).join('、') + 'がいる。';
    else s += 'はじめての子どもだった。';
    s += L.ownHome ? '家は持ち家。' : '家は借家。';
    if (L.threeGen) s += '父方の祖父母と一緒に暮らしている。';
    var evs = [
      ev(C, 'vital', y, P.name + 'で生まれた子のうち' + L.place.muniName + 'で生まれた割合', pct(share), { est: !!L.place.muniObj.est }),
      ev(C, 'census', y, L.place.muniName + 'で働く人の産業の割合（親の仕事の抽選に使用）', indSummary(L.place.muniObj.ind)),
      ev(C, 'income', nv(C.nat.incomeMean, y).y, 'この年の世帯の年収の分布から抽選した家庭の年収', 'およそ' + L.income + '万円'),
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
        if (!L.mom.alive) { m.gone = true; m.alive = false; return; } // 母が亡くなっていれば生まれない
        var who = m.role === '孫' ? '孫の' + m.name + 'が生まれた。' : relWord(L, m) + 'の' + m.name + 'が生まれた。';
        push(L, rec, '家庭', who, [ev(C, 'vital', y, '出生数', '')]);
        return;
      }
      if (!m.alive || m.by >= y) return;
      if (rnd() < deathProb(C, L.P, m.sex, y - m.by, y)) {
        m.alive = false; m.dy = y;
        if (m.role === '配偶者') { L.married = false; L.widowed = true; }
        if (m.role === 'パートナー') { L.partner = false; L.partnerLost = true; }
        push(L, rec, '家庭', relWord(L, m) + 'の' + m.name + 'が亡くなった。' + (y - m.by) + '歳だった。', [ev(C, 'lifetable', y, (y - m.by) + '歳の人が1年のうちに亡くなる確率（生命表から推計）', (deathProb(C, L.P, m.sex, y - m.by, y) * 100).toFixed(2) + '%')]);
      }
    });
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
      if (rnd() < nr) push(L, rec, '家庭', (L.momJob ? '母が働いているため、' : '') + '保育園に通っている。', [ev(C, 'census', nv(C.nat.nursery[L.place.kind], y).y, '3歳で保育所に通う子の割合（' + L.place.kind + '）', pct(nr), { est: true })]);
      else push(L, rec, '家庭', '家で過ごしている。来年から幼稚園に通う予定だ。', [ev(C, 'census', nv(C.nat.nursery[L.place.kind], y).y, '3歳で保育所に通う子の割合（' + L.place.kind + '）', pct(nr), { est: true })]);
    }
    if (a === 6) { L.stage = 'school'; push(L, rec, '学歴と仕事', '地元の公立小学校に入学した。' + (L.place.kind === '町村' ? '家から学校まで、歩いて30分ほどかかる。' : ''), [ev(C, 'school', y, '小学校の在学者', '')]); }
    // 転校（小学校のあいだ）
    if (a >= 7 && a <= 11 && !L.moved && P.munis.length > 1 && rnd() < C.nat.moveChild) {
      var nm = pickMuni(P, y, rnd, L.place.muni);
      L.moved = true;
      L.place.muni = nm.code; L.place.muniName = nm.name; L.place.kind = nm.kind; L.place.muniObj = nm;
      push(L, rec, '家庭', '父の仕事の都合で' + nm.name + 'へ引っ越し、転校した。', [ev(C, 'migration', y, '県内の市区町村間の移動', '')]);
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
      L.job = { ind: pickInd(rnd, (L.place.muniObj || {}).ind || C.nat.indNat), reg: false, since: y };
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
    if (L.married && L.marriedY && y - L.marriedY <= 20 && rnd() < C.nat.divorce) {
      L.married = false; L.divorced = true;
      var sp = L.members.filter(function (m) { return m.role === '配偶者' && !m.gone; })[0];
      if (sp) sp.gone = true;
      push(L, rec, '家庭', '話し合いのすえ、離婚した。', [ev(C, 'vital', y, '離婚件数', '')]);
    }
    if (future) return;
    // 時代：家に物が来る
    C.goods.forEach(function (g) {
      if (L.goods[g.id]) return;
      var d = val(g.diff, y) / 100;
      if (d >= L.adoptU) {
        L.goods[g.id] = y;
        if (a >= 3) {
          var own = a >= 22 || L.place.away;
          push(L, rec, '時代', own ? g.own : g.home, [ev(C, g.src, nv(g.diff, y).y, g.name + 'を持っている世帯の割合', Math.round(d * 100) + '%')]);
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
    var k;
    if (dir && DIRECTION[dir] && rnd() < 0.65) k = DIRECTION[dir][Math.floor(rnd() * DIRECTION[dir].length)];
    else k = pickInd(rnd, ind);
    var base = val(C.nat.nonreg, y) / 100;
    var eduF = L.edu === '大学' ? 0.8 : 1.15;
    var sexF = L.sex === 'm' ? 0.7 : 1.3;
    var jrPref = val(C.nat.jobs, y) * val(P.s.jobs, y);
    var jrF = clamp(1 + 0.2 * (1 - val(P.s.jobs, y)), 0.85, 1.15);
    // 職を失ったあとの再就職は非正規になりやすい
    var againF = L.lostJob ? 1.6 : 1;
    var pNon = clamp(base * 1.1 * eduF * sexF * jrF * againF, 0.02, 0.85);
    var reg = rnd() >= pNon;
    L.job = { ind: k, reg: reg, since: y };
    L.stage = 'work';
    var evs = [
      ev(C, 'jobs', nv(C.nat.jobs, y).y, P.name + 'のこの年の有効求人倍率', jrPref.toFixed(2) + '倍', { est: true }),
      ev(C, 'labor', nv(C.nat.nonreg, y).y, '25〜34歳で非正規で働く人の割合', pct(base))
    ];
    if (text) { push(L, rec, '学歴と仕事', text + jobText(L, k, reg, jrPref), evs); return; }
    return { k: k, reg: reg, jr: jrPref, evs: evs };
  }
  function jobText(L, k, reg, jr) {
    var s = '';
    if (jr < 0.7) s += '求人が少ない年で、何社も受けたすえに';
    else if (jr > 1.3) s += '求人が多い年で、早いうちに';
    var place = { agri: '地元の農家で', fish: '地元の漁業の仕事で', factory: 'ものを作る会社の工場で', build: '建設の会社で', office: '会社の事務や営業の仕事で', shop: '地元の店で', pub: '役所で', care: '病院や福祉の施設で', service: '飲食やサービスの店で' }[k];
    s += place + (reg ? '正社員として' : (L.year < 1995 ? 'パートやアルバイトとして' : '契約社員として')) + '働くことになった。';
    return s;
  }

  function marryYear(L, rec) {
    var C = L.C, y = L.year, a = L.age, rnd = L.rnd;
    if (samesex(L)) return partnerYear(L, rec);
    var target = val(C.nat.everMarried[L.sex], L.by);
    var h = C.nat.marryShape[L.sex][a - 18] || 0;
    var k = -Math.log(1 - target) / C.nat.marryShapeSum[L.sex];
    var mult = L.marryMult || 1;
    var p = 1 - Math.exp(-k * h * mult);
    if (L.divorced || L.widowed) p *= 0.4;
    if (rnd() < p) {
      var diff = L.sex === 'm' ? -Math.round(Math.abs(gauss(rnd)) * 2) : Math.round(Math.abs(gauss(rnd)) * 2.5);
      var sp = addMember(L, '配偶者', L.sex === 'm' ? 'f' : 'm', L.by + diff);
      L.married = true; L.everMarried = true; L.marriedY = y; L.divorced = false; L.widowed = false;
      push(L, rec, '家庭', (a <= 30 ? '' : '') + sp.name + 'さんと結婚した。相手は' + (L.by + diff) + '年生まれ。', [ev(C, 'vital', y, '生まれ年ごとの、50歳までに結婚する人の割合', pct(target), { est: true })]);
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
        push(L, rec, '学歴と仕事', '出産を機に仕事をやめ、子育てに専念することにした。', [ev(C, 'fertility', y, '第1子の出産を機に仕事をやめた女性の割合', pct(val(C.nat.leaveAtBirth, y)))]);
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
      ev: [ev(C, 'census', nv(C.nat.everMarried[L.sex], L.by).y, '同じ年に生まれた人のうち50歳までに結婚する人の割合（推計）', pct(val(C.nat.everMarried[L.sex], L.by)), { est: true })]
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
    var rec = L.rec, br = rec.branch, C = L.C, P = L.P, y = L.year, rnd = L.rnd;
    var natural = !answers;
    answers = answers || {};
    L.branchCount++;
    var e;
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
      var txt = school ? school + 'を卒業し、' + jobText(L, r.k, r.reg, r.jr) : jobText(L, r.k, r.reg, r.jr);
      // 学校を出るときに地元へ戻るか（Uターン）
      if (school && L.place.away && rnd() < val(P.s.ret, y)) {
        L.place = { pref: L.home.pref, prefName: L.home.prefName, muni: L.home.muni, muniName: L.home.muniName, kind: homeMuni(L).kind, away: false, muniObj: homeMuni(L) };
        txt = school + 'を卒業して地元に戻り、' + jobText(L, r.k, r.reg, r.jr);
      }
      e = push(L, rec, '学歴と仕事', txt, r.evs.concat([ev(C, 'migration', nv(P.s.ret, y).y, '県外に出た人が地元へ戻る割合', pct(val(P.s.ret, y)), { est: true })]));
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
      t = '高校を卒業し、' + (away ? L.place.prefName + 'に出て' : '地元で') + '働くことにした。';
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
  function finishYear(L, rec) {
    var C = L.C, y = L.year, a = L.age, rnd = L.rnd;
    {
      var dp = deathProb(C, L.P, L.sex, a, y);
      if (a >= MAX_AGE) dp = 1;
      if (rnd() < dp) { die(L, rec, dp); return advance(L, rec); }
    }
    var need = rec.events.length === 0 ? 1 : (rec.events.length === 1 && rnd() < (a < 80 ? 0.35 : 0.08) ? 1 : 0);
    for (var i = 0; i < need; i++) {
      var s = pickScene(L);
      var mem = [];
      if (s) push(L, rec, s.cat, fill(L, s.t, mem), [ev(C, s.src, y, s.what || '', s.val || '', { verified: !!s.verified })], { sid: s.id, mem: mem });
      if (s && s.hl) rec.hotline = true;
    }
    if (!rec.events.length) L.stats.emptyYears++;
    return advance(L, rec);
  }
  function advance(L, rec) {
    L.log.push(rec);
    L.rec = null;
    if (L.alive) { L.year++; L.age++; }
    return rec;
  }
  function die(L, rec, dp) {
    var C = L.C, a = L.age, rnd = L.rnd, y = L.year;
    var cw = a < 15 ? C.nat.cause.child : a < 40 ? C.nat.cause.young : a < 65 ? C.nat.cause.mid : C.nat.cause.old;
    var cause = pick(rnd, ['ill', 'acc', 'sui'], function (k) { return cw[k]; });
    var t = y + '年、' + a + '歳で' + ({ ill: '病気のため亡くなった。', acc: '事故のため亡くなった。', sui: '自ら命を絶った。' })[cause];
    L.alive = false; L.deathAge = a; L.deathYear = y; L.cause = cause;
    rec.dead = true;
    if (cause === 'sui') rec.hotline = true;
    push(L, rec, '健康', t, [
      ev(C, 'lifetable', y, a + '歳の人が1年のうちに亡くなる確率（生命表から推計）', (dp * 100).toFixed(2) + '%'),
      ev(C, cause === 'sui' ? 'suicide' : 'vital', y, '年齢別の死因の割合', pct(cw[cause]))
    ]);
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
  function cohort(C, P, year, muniCode, seed, n) {
    n = n || 100;
    var r = { n: n, stayed: 0, univ: 0, to80: 0, married: 0 };
    for (var i = 0; i < n; i++) {
      var L = autoRun(newLife(C, P, { year: year, muniCode: muniCode, seed: (seed * 7919 + i * 104729 + 13) >>> 0 }));
      if (L.stats.atHome30) r.stayed++;
      if (L.stats.univ) r.univ++;
      if (L.deathAge >= 80) r.to80++;
      if (L.everMarried) r.married++;
    }
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
    makeRng: makeRng, nv: nv, val: val, deathProb: deathProb, invNorm: invNorm,
    pickPref: pickPref, newLife: newLife, step: step, resolve: resolve, autoRun: autoRun,
    cohort: cohort, majorTimeline: majorTimeline, familyList: familyList, fill: fill, sceneOk: sceneOk
  };
});
