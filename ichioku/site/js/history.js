/* 1億分の1 昔の人生の進め方（1800〜1974年生まれ）
   ブラウザでも Node でも同じものを使う。乱数や数表の道具は engine.js（Ichioku）のものを使う。
   1975年以降の年の世の中・死亡の確率・物の普及は、今の本体と同じ数字を使う。 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./engine.js'));
  else root.IchiokuOld = factory(root.Ichioku);
})(typeof self !== 'undefined' ? self : this, function (E) {
  'use strict';

  var FUTURE_FROM = E.FUTURE_FROM;
  var CATS = E.CATS;
  var KANSAI = ['24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39'];
  var TOKAI = ['16', '17', '18', '21', '22', '23'];
  var KYUSHU = ['40', '41', '42', '43', '44', '45', '46', '47'];

  /* ---------- 道具 ---------- */
  function gauss(rnd) { var u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function clamp(x, lo, hi) { return x < lo ? lo : x > hi ? hi : x; }
  function pick(rnd, list, wfn) {
    var tot = 0, i, w = new Array(list.length);
    for (i = 0; i < list.length; i++) { w[i] = Math.max(0, wfn ? wfn(list[i]) : 1); tot += w[i]; }
    if (tot <= 0) return list.length ? list[Math.floor(rnd() * list.length)] : null;
    var x = rnd() * tot;
    for (i = 0; i < list.length; i++) { x -= w[i]; if (x < 0) return list[i]; }
    return list[list.length - 1];
  }
  function keys(s) { return Object.keys(s).map(Number).sort(function (a, b) { return a - b; }); }
  // 年の間を直線でつなぐ
  function lin(s, y) {
    if (!s) return null;
    var ks = keys(s);
    if (!ks.length) return null;
    if (y <= ks[0]) return s[ks[0]];
    if (y >= ks[ks.length - 1]) return s[ks[ks.length - 1]];
    for (var i = 1; i < ks.length; i++) if (y <= ks[i]) { var a = ks[i - 1], b = ks[i]; return s[a] + (s[b] - s[a]) * (y - a) / (b - a); }
    return null;
  }
  function near(s, y) { var r = E.nv(s, y); return r ? r.y : y; }
  function pct(v) { return (v < 0.01 && v > 0 ? (v * 100).toFixed(2) : v < 0.1 && v > 0 ? (v * 100).toFixed(1) : Math.round(v * 100)) + '%'; }
  function srcOf(H, C, s) {
    if (s && typeof s === 'object') return s;
    return (H.sources[s]) || (C.sources[s]) || { name: s, org: '' };
  }
  function ev(L, s, y, what, value, extra) {
    var o = srcOf(L.H, L.C, s);
    var e = { src: typeof s === 'string' ? s : 'old', name: o.name, org: o.org || '', y: y, what: what, val: value == null ? '' : value, prov: false };
    if (extra) for (var k in extra) e[k] = extra[k];
    return e;
  }
  var LIFE_SRC = { name: '時代の暮らし（その時代に広く見られた暮らしの様子から作った場面）', org: '' };

  /* ---------- 年号 ---------- */
  function eraLabel(H, y) {
    var e = null;
    for (var i = 0; i < H.eras.length; i++) if (H.eras[i][0] <= y) e = H.eras[i];
    if (!e) return '';
    var n = y - e[0] + 1;
    return e[1] + (n === 1 ? '元' : n) + '年';
  }

  /* ---------- 死亡の確率 ---------- */
  function prefMul(H, pref, y) {
    var m = H.mort.prefMul[pref];
    if (!m || !Object.keys(m).length) return 1;
    return E.val(m, Math.max(1900, y));
  }
  function dp(L, sex, age, y) {
    var C = L.C, H = L.H;
    if (y >= 1975) return E.deathProb(C, L.P, sex, age, y);
    var mt = H.mort, mul = prefMul(H, L.pref, y);
    if (y < 1873 && L.kind === 'city') mul *= mt.cityMul;
    var q;
    if (age === 0) return clamp(lin(mt.q0, y) * mul, 0, 0.6);
    var alpha = lin(mt.alpha[sex], y), beta = mt.beta, bg = mt.bg;
    var h = alpha / beta * (Math.exp(beta * (age + 1)) - Math.exp(beta * age)) + bg;
    q = 1 - Math.exp(-h);
    if (age < 5) q = Math.max(q, lin(mt.qc, y) * mul);
    else if (y < 1873 && L.kind === 'city') q = 1 - Math.exp(-h * mt.cityMul);
    return clamp(q, 0, 1);
  }

  /* ---------- 名前 ---------- */
  function nameFor(L, sex, by, st) {
    var N = L.H.names, list;
    var ryu = L.pref === '47' && by < 1912;
    if (ryu) list = st === 'ryukyuShi' ? (sex === 'm' ? N.ryukyuShiM : N.ryukyuShiF) : (sex === 'm' ? N.ryukyuM : N.ryukyuF);
    else if (st === 'ainu' && by < 1876) return 'アイヌ語の名前';
    else if (by >= 1912) {
      var ks = Object.keys(L.C.names).map(Number).sort(function (a, b) { return a - b; });
      var k = ks[0];
      for (var i = 0; i < ks.length; i++) if (ks[i] <= by) k = ks[i];
      list = L.C.names[k][sex];
    } else if (by >= 1868) list = sex === 'm' ? N.mMeiji : N.fMeiji;
    else list = sex === 'm' ? (st === 'bushi' ? N.mBushi : N.m) : N.f;
    var used = {};
    L.members.forEach(function (m) { used[m.name] = 1; });
    if (L.name) used[L.name] = 1;
    var free = list.filter(function (n) { return !used[n]; });
    if (!free.length) free = list;
    return free[Math.floor(L.rnd() * free.length)];
  }
  function addMember(L, role, sex, by, extra) {
    var m = { id: L.members.length + 1, role: role, sex: sex, by: by, alive: true, dy: null };
    if (extra) for (var k in extra) m[k] = extra[k];
    m.name = nameFor(L, sex, by, m.st || L.status);
    L.members.push(m);
    return m;
  }
  // 「父の○○」。アイヌ語の名前は書き表さない
  function who(m) { return relWord(m) + (m.name && !/アイヌ語/.test(m.name) ? 'の' + m.name : ''); }
  function relWord(m) {
    if (m.role === '配偶者') return m.sex === 'm' ? '夫' : '妻';
    if (m.role === '子') return m.sex === 'm' ? '息子' : '娘';
    return m.role;
  }

  /* ---------- 生まれる場所 ---------- */
  // 1872年までは旧国、1873年からは都道府県で抽選する。どちらも今の都道府県の番号を決めて返す
  function topProvs(H) { return Object.keys(H.prov).filter(function (n) { return !H.prov[n].parent; }); }
  function pickBirth(C, H, year, rnd) {
    var prov, sub, pref;
    if (year < 1873) {
      prov = pick(rnd, topProvs(H), function (n) { return H.prov[n].w ? lin(H.prov[n].w, year) : 0; });
      var p = H.prov[prov];
      if (p.subs) { sub = pick(rnd, p.subs, function (n) { return H.prov[n].pop1873; }); }
      var src = H.prov[sub || prov];
      pref = pick(rnd, Object.keys(src.prefs), function (c) { return src.prefs[c]; });
    } else {
      pref = pick(rnd, Object.keys(H.prefW[1975]), function (c) { return lin(prefSeries(H, c), year); });
      // その県に入る旧国（明治の前半の呼び名に使う）
      var cands = Object.keys(H.prov).filter(function (n) { var o = H.prov[n]; return !o.subs && o.prefs && o.prefs[pref]; });
      prov = pick(rnd, cands, function (n) { return H.prov[n].pop1873 * H.prov[n].prefs[pref]; });
      if (H.prov[prov].parent) { sub = prov; prov = H.prov[prov].parent; }
    }
    return { prov: prov, sub: sub || null, pref: pref };
  }
  var prefSeriesCache = {};
  function prefSeries(H, c) {
    if (prefSeriesCache[c]) return prefSeriesCache[c];
    var s = {};
    Object.keys(H.prefW).forEach(function (y) {
      var tot = 0;
      Object.keys(H.prefW[y]).forEach(function (k) { tot += H.prefW[y][k]; });
      s[y] = (H.prefW[y][c] || 0) / tot;
    });
    prefSeriesCache[c] = s;
    return s;
  }

  function drawStatus(L) {
    var H = L.H, y = L.by, rnd = L.rnd, p = H.prov[L.prov];
    if (L.prov === '蝦夷・松前' || (L.pref === '01' && y < 1900)) {
      var share = y < 1873 ? lin(H.ainuShare, Math.max(1804, y)) : clamp(17000 / popHokkaido(y), 0.005, 0.15);
      if (rnd() < share) return 'ainu';
    }
    if (L.pref === '47' && y < 1912) return rnd() < lin(H.ryukyuShi, Math.min(1852, y)) ? 'ryukyuShi' : 'ryukyuHyakusho';
    var st = (p && p.status) || { bushi: 0.06, priest: 0.01, hyakusho: 0.8, chonin: 0.12, outcast: 0.009 };
    var w = { bushi: st.bushi, priest: st.priest, hyakusho: st.hyakusho, chonin: st.chonin, outcast: st.outcast };
    // 江戸には武士が多く住んでいた（1873年の数は東京から武士が去ったあとのため、江戸時代は多めにする目安）
    if (L.prov === '武蔵' && y < 1868) w.bushi = 0.2;
    var s = pick(rnd, Object.keys(w), function (k) { return w[k]; });
    if (y >= 1872) s = s === 'bushi' ? 'shizoku' : s === 'outcast' ? 'buraku' : s === 'priest' ? 'priest' : 'heimin';
    return s;
  }
  // 北海道の人口（1873年は12万人、1920年からは国勢調査）
  function popHokkaido(y) { return lin({ 1873: 123668, 1890: 427000, 1900: 985000, 1910: 1610000, 1920: 2359000, 1930: 2812000, 1940: 3229000, 1950: 4296000 }, y); }

  // 海のない県と旧国（浜の村にしない）
  var INLAND_PREF = ['09', '10', '11', '19', '20', '21', '29'];
  var INLAND_PROV = ['甲斐', '信濃', '美濃', '飛騨', '上野', '下野', '大和', '近江', '山城', '伊賀', '丹波', '美作'];
  function inland(L) { return INLAND_PROV.indexOf(L.prov) >= 0 || INLAND_PREF.indexOf(L.pref) >= 0; }
  function drawKind(L) {
    var H = L.H, rnd = L.rnd, y = L.by, st = L.status, p = H.prov[L.prov];
    if (st === 'ainu') return 'kotan';
    if (y < 1873) {
      var city = p && p.city;
      if (st === 'ryukyuShi') return 'town';
      if (st === 'bushi') return city && rnd() < (city.share > 0.3 ? 0.6 : 0.4) ? 'city' : 'town';
      if (st === 'chonin') return city && rnd() < Math.min(0.85, city.share * 1.6) ? 'city' : 'town';
      if (st === 'priest' || st === 'outcast') return rnd() < 0.3 ? 'town' : 'village';
      return !inland(L) && rnd() < 0.1 ? 'fish' : 'village';
    }
    var u = clamp(lin(H.urban, y) * (H.urbanPref[L.pref] || 1), 0.02, 0.95);
    if (rnd() < u) return 'city';
    if (st === 'shizoku' && rnd() < 0.6) return 'town';
    if (rnd() < 0.15) return 'town';
    return !inland(L) && rnd() < 0.1 ? 'fish' : 'village';
  }
  function cityName(L) {
    var p = L.H.prov[L.prov];
    var c = p && p.city;
    if (!c) return null;
    if (c.after1868 && L.year >= 1868) return c.after1868;
    return c.name;
  }
  // 今の市区町村（旧国が今の1つの県にまるごと入るときと、1889年の町村制のあと）
  function pickMuni(L) {
    if (!L.P || !L.P.munis) return null;
    var p = L.H.prov[L.sub || L.prov];
    if (L.by < 1889 && !(p && p.one)) return null;
    if (L.status === 'ryukyuShi' && L.kind === 'town') return null;
    // 大東島は1900年に人が住み始めた島
    var skip = L.by < 1900 ? ['北大東村', '南大東村'] : [];
    var want = L.kind === 'city' ? ['大都市', '都市'] : L.kind === 'town' ? ['都市', '町村'] : ['町村'];
    var list = L.P.munis.filter(function (m) { return want.indexOf(m.kind) >= 0 && skip.indexOf(m.name) < 0; });
    if (!list.length) list = L.P.munis;
    return pick(L.rnd, list, function (m) { return Math.sqrt(E.val(m.share, 1995)); });
  }
  var KIND_WORD = { city: '町なか', town: '町', village: '村', fish: '浜の村', kotan: 'コタン（アイヌの村）' };
  function placeLabel(L) {
    if (L.abroad) return L.abroadPlace;
    var y = L.year, p = L.H.prov[L.prov], pn = L.H.prefNames[L.pref];
    var kw = KIND_WORD[L.kind];
    var cn = cityName(L);
    var muni = L.muniName ? '（今の' + L.muniName + 'のあたり）' : '';
    if (L.status === 'ryukyuShi' && L.kind === 'town') return (y < 1879 ? '琉球王国' : '沖縄県') + ' 首里';
    if (L.pref === '47' && y < 1879) return '琉球王国の村' + muni;
    if (L.pref === '47' && y < 1889) return '沖縄県の' + kw + muni;
    if (y < 1869 && L.prov === '蝦夷・松前') return '蝦夷地の' + (L.kind === 'kotan' ? kw : L.kind === 'town' || L.kind === 'city' ? '松前の町' : '和人の村');
    if (y < 1873) {
      if (L.kind === 'city' && cn) return p.kuni + ' ' + cn;
      if (L.kind === 'town' && (L.status === 'bushi')) return p.kuni + 'の城下町' + muni;
      return p.kuni + 'の' + kw + muni;
    }
    if (y < 1889 && L.pref === '01') return '北海道の' + (L.kind === 'city' ? '函館や札幌の町' : kw) + muni;
    if (y < 1889) return (L.H.prov[L.sub || L.prov] || p).kuni.replace('（明治）', '') + '（' + pn + '）の' + (L.kind === 'city' && cn ? cn + 'の町' : kw) + muni;
    if (L.pref === '13' && y < 1943) pn = '東京府';
    return pn + 'の' + (L.kind === 'city' ? '市街地' : kw) + muni;
  }

  /* ---------- 生まれる ---------- */
  function childDist(H, by) {
    var c = H.nat.children, ks = keys(c), k = ks[0];
    for (var i = 0; i < ks.length; i++) if (ks[i] <= by) k = ks[i];
    return c[k];
  }
  // 子どもの数（0,1,2,3,4人以上の割合と平均から。4人以上は平均に合うよう5人目以降を足す）
  function drawKids(rnd, d, sizeBiased) {
    var base = [0, 1, 2, 3, 4];
    var m4 = d.dist[4] > 0 ? (d.mean - (d.dist[1] + 2 * d.dist[2] + 3 * d.dist[3])) / d.dist[4] : 4;
    var w = d.dist.map(function (p, i) { return sizeBiased ? p * (i === 4 ? m4 : i) : p; });
    var n = pick(rnd, base, function (i) { return w[i]; });
    if (n === 4) { var extra = Math.max(0, m4 - 4); while (rnd() < extra / (extra + 1)) n++; }
    return Math.min(n, 12);
  }
  function marryAge(H, sex, y, rnd) {
    var m = lin(H.nat.marriage[sex], y);
    return Math.round(clamp(m + gauss(rnd) * (sex === 'm' ? 3.6 : 3.0), sex === 'm' ? 17 : 15, 45));
  }

  function newLife(C, H, P, opts) {
    var year = opts.year, seed = (opts.seed >>> 0) || 1;
    var rnd = E.makeRng(seed);
    var b = opts.birth || pickBirth(C, H, year, E.makeRng(seed ^ 0x9e3779b9));
    var L = {
      C: C, H: H, P: P, old: true, rnd: rnd, seed: seed, by: year, year: year, age: 0,
      sex: rnd() < 0.513 ? 'm' : 'f',
      prov: b.prov, sub: b.sub, pref: b.pref,
      members: [], used: {}, cat: {}, catTotal: 0, alive: true, log: [], queue: [],
      edu: null, school: null, job: null, married: false, everMarried: false, abroad: null,
      stats: { school: false, mid: false, to5: false, to60: false, events: 0 },
      earn: { real: 0, years: 0, est: true }
    };
    CATS.forEach(function (c) { L.cat[c] = 0; });
    L.status = drawStatus(L);
    L.kind = drawKind(L);
    var mu = pickMuni(L);
    if (mu) { L.muni = mu.code; L.muniName = mu.name; }
    L.ainu = L.status === 'ainu';
    L.ryukyu = L.pref === '47';
    familyAtBirth(L);
    L.marryAt = marryAge(H, L.sex, year + 20, rnd);
    L.never = rnd() < lin(H.nat.neverMarried[L.sex], year + 45);
    L.adoptU = clamp(rnd() + ({ city: -0.08, town: 0, village: 0.06, fish: 0.06, kotan: 0.1 })[L.kind], 0.002, 0.998);
    L.home = { pref: L.pref, prov: L.prov, sub: L.sub, prefName: H.prefNames[L.pref], muniName: '', label: placeLabel(L) };
    return L;
  }
  function familyAtBirth(L) {
    var H = L.H, rnd = L.rnd, y = L.year;
    var meanM = y < 1950 ? 29.5 : lin({ 1950: 28.7, 1974: 27.0 }, y);
    var mAge = Math.round(clamp(meanM + gauss(rnd) * 6, 17, 44));
    var gap = lin({ 1800: 4.5, 1900: 4.6, 1950: 2.9, 1974: 2.6 }, y);
    var fAge = Math.round(clamp(mAge + gap + gauss(rnd) * 3.5, 17, 60));
    var momBy = y - mAge, dadBy = y - fAge;
    L.dad = addMember(L, '父', 'm', dadBy, { live: true });
    L.mom = addMember(L, '母', 'f', momBy, { live: true });
    [['祖父', 'm', dadBy, '父方'], ['祖母', 'f', dadBy, '父方'], ['祖父', 'm', momBy, '母方'], ['祖母', 'f', momBy, '母方']].forEach(function (g) {
      var by = g[2] - Math.round(24 + rnd() * 10 + (g[1] === 'm' ? 3 : 0));
      var m = addMember(L, g[0], g[1], by, { side: g[3], live: g[3] === '父方' });
      if (!surviveUntil(L, m, y)) { m.alive = false; m.before = true; }
    });
    // きょうだい（母の生まれ年の「妻が産んだ子どもの数」から。自分がいる分だけ多い家に生まれやすい）
    var n = Math.max(1, drawKids(rnd, childDist(H, momBy), true));
    var pos = Math.floor(rnd() * n), offs = [0], i;
    for (i = 1; i < n; i++) offs.push(offs[i - 1] + 2 + Math.floor(rnd() * 2.5));
    var mine = offs[pos];
    L.sibs = 0;
    for (i = 0; i < n; i++) {
      if (i === pos) continue;
      var sby = y + offs[i] - mine, mAt = sby - momBy;
      if (mAt < 16 || mAt > 46) continue;
      var ss = rnd() < 0.513 ? 'm' : 'f', older = sby < y;
      var s = addMember(L, older ? (ss === 'm' ? '兄' : '姉') : (ss === 'm' ? '弟' : '妹'), ss, sby, { sib: true, live: true });
      if (older && !surviveUntil(L, s, y)) { s.alive = false; s.before = true; s.diedYoung = true; }
      L.sibs++;
    }
    L.name = null;
    L.name = nameFor(L, L.sex, y, L.status);
    L.fAge = fAge; L.mAge = mAge;
  }
  function surviveUntil(L, m, year) {
    for (var yy = m.by; yy < year; yy++) if (L.rnd() < dp(L, m.sex, yy - m.by, yy)) { m.dy = yy; return false; }
    return true;
  }

  /* ---------- 1年分 ---------- */
  function worldLine(L, y, a) {
    var C = L.C, H = L.H, items = [];
    if (y >= FUTURE_FROM) return { future: true, items: [{ t: 'この先の世の中は誰にも分からない。ここからは人口と寿命の将来推計だけを使って進む', type: '未来', ev: [ev(L, 'ipss', y, '将来推計人口・将来の寿命', '推計')] }] };
    if (y >= 1975) {
      var rows = C.timeline.filter(function (r) {
        if (r.y !== y) return false;
        if (r.ages && (a < r.ages[0] || a > r.ages[1])) return false;
        if (r.regions && r.regions.length && r.regions.indexOf(L.pref) < 0 && !r.alsoAll) return false;
        return true;
      }).slice(0, 3);
      rows.forEach(function (r) { items.push({ t: r.text, type: r.type, ev: [ev(L, r.src, r.y, r.srcNote || r.type, r.srcVal || '', { verified: !!r.verified })] }); });
    } else {
      var pv = [L.prov, L.sub];
      H.timeline.forEach(function (r) {
        if (r.y !== y || items.length >= 3) return;
        if (r.provs && !(y < 1873 && (r.provs.indexOf(pv[0]) >= 0 || r.provs.indexOf(pv[1]) >= 0)) && !(r.prefs && r.prefs.indexOf(L.pref) >= 0)) return;
        if (!r.provs && r.prefs && r.prefs.indexOf(L.pref) < 0) return;
        items.push({ t: r.t, type: r.type, ev: [ev(L, LIFE_SRC, y, '年表（' + r.type + '）', '', { noYearNote: true })] });
      });
    }
    if (!items.length) {
      var ctxs = H.eraContext.filter(function (c) { return y >= c.from && y <= c.to; });
      var ctx = ctxs.length ? ctxs[(y * 7 + 3) % ctxs.length] : null;
      items.push({ t: ctx ? ctx.t : 'この年は大きな出来事の記録が少ない', type: '時代', ev: [ev(L, LIFE_SRC, y, 'その時代のようす', '', { noYearNote: true })] });
    }
    return { items: items };
  }

  function push(L, rec, cat, text, evs, extra) {
    var e = { cat: cat, t: text, ev: evs || [] };
    if (extra) for (var k in extra) e[k] = extra[k];
    rec.events.push(e);
    L.cat[cat]++; L.catTotal++; L.stats.events++;
    return e;
  }

  function step(L) {
    if (!L.alive) return null;
    var y = L.year, a = L.age;
    var rec = { year: y, age: a, eraLabel: eraLabel(L.H, y), place: placeLabel(L), world: worldLine(L, y, a), events: [], branch: null, future: y >= FUTURE_FROM };
    L.rec = rec;
    if (a === 0) birthEvent(L, rec);
    else {
      familyYear(L, rec);
      historyYear(L, rec);
      lifeYear(L, rec);
    }
    if (L.alive && L.queue.length) { rec.branch = L.queue.shift(); return rec; }
    finishYear(L, rec);
    return rec;
  }

  var ST_WORD = { bushi: '武士の家', hyakusho: '百姓の家', chonin: '町人の家', priest: '寺や神社の家', outcast: '被差別身分とされた家', ainu: 'アイヌの家', ryukyuShi: '琉球の士（さむれー）の家', ryukyuHyakusho: '琉球の百姓の家', shizoku: '士族の家', buraku: '被差別部落の家', heimin: '平民の家' };
  function birthEvent(L, rec) {
    var H = L.H, y = L.year, st = L.status;
    var sibs = L.members.filter(function (m) { return m.sib && m.by < y; });
    var s = rec.place + 'で、' + ST_WORD[st] + 'に' + (L.sex === 'm' ? '男の子' : '女の子') + 'として生まれた。' + (/アイヌ語/.test(L.name) ? '名前はアイヌ語で付けられた。' : '名前は' + L.name + '。');
    s += '父は' + L.fAge + '歳、母は' + L.mAge + '歳。';
    var alive = sibs.filter(function (m) { return !m.before; }), dead = sibs.filter(function (m) { return m.before; });
    if (alive.length) s += alive.map(who).join('、') + 'がいる。';
    else if (!dead.length) s += 'はじめての子どもだった。';
    if (dead.length) s += '上には幼くして亡くなったきょうだいが' + dead.length + '人いた。';
    var evs = [];
    if (y < 1873) {
      var p = H.prov[L.prov];
      evs.push(ev(L, L.prov === '琉球' ? 'ryukyu' : L.prov === '蝦夷・松前' ? 'ezo' : 'edoPop', near(p.w, y), p.kuni + 'の人口（武士などを数えていない幕府の調査を、1873年の人口との比で補った）', Math.round(lin(p.w, y)).toLocaleString('ja-JP') + '人', { est: true }));
    } else {
      evs.push(ev(L, 'ipss', near(H.prefW, y), H.prefNames[L.pref] + 'で生まれた子の割合（全国の出生数のうち。1873年は旧国の人口から）', pct(lin(prefSeries(H, L.pref), y)), { est: y < 1900 }));
    }
    var stShare = statusShare(L);
    if (stShare != null) evs.push(ev(L, st === 'ainu' ? 'ezo' : L.ryukyu ? 'ryukyu' : st === 'outcast' || st === 'buraku' ? 'outcast' : 'jinshin', 1873, ST_WORD[st] + 'に生まれる割合（' + (H.prov[L.prov] ? H.prov[L.prov].kuni : '') + '）', pct(stShare), { est: true }));
    evs.push(ev(L, 'ipss', near(H.nat.children, L.mom.by), '母の生まれ年の「妻が産んだ子どもの数」（1890年より前の生まれは1890年代の値）', '平均' + childDist(H, L.mom.by).mean + '人', { est: L.mom.by < 1890 }));
    push(L, rec, '家庭', s, evs);
  }
  function statusShare(L) {
    var H = L.H, p = H.prov[L.prov], st = L.status;
    if (st === 'ainu') return L.by < 1873 ? lin(H.ainuShare, Math.max(1804, L.by)) : 17000 / popHokkaido(L.by);
    if (st === 'ryukyuShi') return lin(H.ryukyuShi, Math.min(1852, L.by));
    if (st === 'ryukyuHyakusho') return 1 - lin(H.ryukyuShi, Math.min(1852, L.by));
    if (!p || !p.status) return null;
    var k = { shizoku: 'bushi', buraku: 'outcast', heimin: null }[st];
    if (k === null) return 1 - p.status.bushi - p.status.outcast - p.status.priest;
    return p.status[k || st];
  }

  /* 家族の出来事 */
  function familyYear(L, rec) {
    var y = L.year, rnd = L.rnd;
    L.members.forEach(function (m) {
      if (m.gone) return;
      if (m.by === y && m.sib) {
        if (!L.mom.alive) { m.gone = true; m.alive = false; return; }
        push(L, rec, '家庭', who(m) + 'が生まれた。', [ev(L, 'ipss', near(L.H.nat.children, L.mom.by), '母の生まれ年の「妻が産んだ子どもの数」', '平均' + childDist(L.H, L.mom.by).mean + '人')]);
        return;
      }
      if (!m.alive || m.by >= y) return;
      var q = dp(L, m.sex, y - m.by, y);
      if (rnd() < q) {
        m.alive = false; m.dy = y;
        if (m.role === '配偶者') { L.married = false; L.widowed = y; }
        var age = y - m.by;
        push(L, rec, '家庭', who(m) + 'が亡くなった。' + (age === 0 ? '生まれて1年もたたなかった。' : age + '歳だった。'), [ev(L, y < 1975 ? 'ipss' : 'lifetable', y, age + '歳の人が1年のうちに亡くなる確率（平均寿命と乳児死亡率から推計）', (q * 100).toFixed(2) + '%', { est: y < 1975 })]);
      }
    });
    // 自分の子の誕生
    if (L.married && L.kidPlan && L.kidPlan.length && L.kidPlan[0] === y) {
      L.kidPlan.shift();
      var mother = L.sex === 'f' ? L : L.spouse;
      var mAge = L.sex === 'f' ? L.age : y - L.spouse.by;
      if (mother && (mother === L || mother.alive) && mAge <= 46) {
        var sx = rnd() < 0.513 ? 'm' : 'f';
        var k = addMember(L, '子', sx, y, { live: true });
        L.kids = (L.kids || 0) + 1;
        push(L, rec, '家庭', (L.kids === 1 ? 'はじめての子' : L.kids + '人目の子') + (/アイヌ語/.test(k.name) ? '' : 'の' + k.name) + 'が生まれた。', [ev(L, 'ipss', near(L.H.nat.children, (L.sex === 'f' ? L.by : L.spouse.by)), '妻の生まれ年別の「産んだ子どもの数」から決めた子の数', L.kidTotal + '人', { est: (L.sex === 'f' ? L.by : L.spouse.by) < 1890 })]);
      }
    }
    // 孫
    L.members.filter(function (m) { return m.role === '子' && m.alive && y - m.by >= 22 && y - m.by <= 40; }).forEach(function (k) {
      var gk = L.members.filter(function (m) { return m.role === '孫' && m.parentId === k.id; }).length;
      if (gk < 3 && rnd() < (y < 1950 ? 0.15 : 0.08)) {
        var g = addMember(L, '孫', rnd() < 0.513 ? 'm' : 'f', y, { parentId: k.id });
        push(L, rec, '家庭', who(k) + 'に子どもが生まれ、' + (/アイヌ語/.test(g.name) ? '孫ができた。' : '孫の' + g.name + 'ができた。'), [ev(L, 'ipss', y, '出生数', '')]);
      }
    });
  }

  /* 時代の大きな変わり目（身分・名前・国の名前） */
  function historyYear(L, rec) {
    var y = L.year, st = L.status, H = L.H;
    if (y === 1871 && (st === 'bushi')) push(L, rec, '時代', '藩がなくなり県が置かれた。武士の身分は「士族」という呼び名に変わった', [ev(L, 'jinshin', 1872, '士族・卒族の割合（明治5年）', '5.9%')]);
    if (y === 1871 && st === 'outcast') push(L, rec, '時代', 'えた・ひにんの呼び名と身分をなくす布告（解放令）が出た。けれど近くの村からの差別はなくならず、反対する一揆まで起きた', [ev(L, 'outcast', 1871, '解放令の時点の穢多の人数', '28万人あまり')]);
    if (y === 1876 && st === 'ainu' && /アイヌ語/.test(L.name)) {
      var nm = nameFor(L, L.sex, 1868, 'hyakusho');
      push(L, rec, '時代', '戸籍に入れられ、「' + nm + '」という和風の名前を名乗るように言われた', [ev(L, LIFE_SRC, 1876, '開拓使がアイヌの人々に和風の名前を付けた', '')]);
      L.name = nm + '（アイヌ語の名前もある）';
    }
    if (y === 1879 && L.ryukyu) push(L, rec, '時代', '琉球王国がなくなり、沖縄県になった（琉球処分）。首里城には日本の兵が入った', [ev(L, LIFE_SRC, 1879, '琉球処分', '')]);
    if (y === 1922 && (st === 'buraku' || st === 'outcast') && L.age >= 12) push(L, rec, '時代', '「人の世に熱あれ、人間に光あれ」。差別をなくすための全国水平社ができたと聞いた', [ev(L, LIFE_SRC, 1922, '全国水平社の創立', '')]);
    if (y === 1945 && L.abroad === '満洲') {
      var r = H.manchuria.rate;
      if (L.rnd() < r) { dieBy(L, rec, 'war', 'ソ連軍が攻めてきて、開拓団は荒野を逃げ惑った。その逃避行の途中で亡くなった', [ev(L, H.manchuria.src, 1945, '開拓団にいた人のうち亡くなった割合', pct(r), { est: true })]); return; }
      push(L, rec, '時代', 'ソ連軍が攻めてきて、開拓団は荒野を逃げた。飢えと寒さの中を生きのびた', [ev(L, H.manchuria.src, 1945, '開拓団にいた人のうち亡くなった割合', pct(r), { est: true })]);
      L.repat = true;
    }
    if (y === 1946 && L.repat) {
      L.abroad = null; L.repat = false; L.kind = 'village';
      push(L, rec, '地域', '引き揚げ船で日本に帰ってきた。持って帰れたのはわずかな荷物だけだった', [ev(L, LIFE_SRC, 1946, '満洲からの引き揚げ', '')]);
    }
    if (y === 1972 && L.ryukyu && !L.abroad) push(L, rec, '時代', '沖縄が日本に返された。お金がドルから円に変わった', [ev(L, LIFE_SRC, 1972, '沖縄の本土復帰', '')]);
  }

  /* 本人の出来事 */
  function lifeYear(L, rec) {
    var y = L.year, a = L.age;
    schoolYear(L, rec);
    workYear(L, rec);
    moveYear(L, rec);
    marryYear(L, rec);
    warYear(L, rec);
    eventYear(L, rec);
    if (!L.alive) return;
    goodsYear(L, rec);
    if (a === 1 && !rec.events.length) push(L, rec, '健康', L.sex === 'm' ? 'つかまり立ちから、よちよちと歩き始めた' : 'よちよちと歩き始めた', [ev(L, LIFE_SRC, y, '子どもの育ち', '', { noYearNote: true })]);
    if (a === 2 && !rec.events.length) push(L, rec, '家庭', '片言で言葉を話し始め、母を呼ぶようになった', [ev(L, LIFE_SRC, y, '子どもの育ち', '', { noYearNote: true })]);
    if (a >= 2 && (!rec.events.length || L.rnd() < 0.4)) { var s = pickScene(L); if (s) push(L, rec, s.cat, fill(L, s.t), [ev(L, LIFE_SRC, y, 'その時代の暮らしの様子', '', { noYearNote: true, est: true })]); }
    if (L.alive) earnYear(L);
  }

  /* 学校 */
  function wantFrom(answers, id) { return answers && answers[id] ? answers[id] : null; }
  // 選んだ方向に進みやすくする（自動で進めるときは統計の割合のまま）
  function nudge(p, want, good) {
    p = clamp(p, 0.0005, 0.9995);
    if (!want) return p;
    var o = p / (1 - p) * (want === good ? 3 : 1 / 3);
    return o / (1 + o);
  }
  function schoolYear(L, rec) {
    var H = L.H, y = L.year, a = L.age, rnd = L.rnd, sx = L.sex, st = L.status;
    if (L.abroad && a < 15) return;
    // 江戸時代（6歳が1872年まで）
    if (a === 7 && y <= 1873 && !L.school) {
      var t = H.nat.terakoya, p = t[sx][L.kind] != null ? t[sx][L.kind] : t[sx].village;
      var region = (H.prov[L.prov] || {}).region;
      if (t.high.indexOf(region) >= 0 || t.high.indexOf(L.prov) >= 0) p *= 1.3;
      if (t.low.indexOf(L.prov) >= 0) p *= 0.5;
      if (st === 'bushi') p = sx === 'm' ? 1 : 0.7;
      if (st === 'chonin') p = Math.max(p, sx === 'm' ? 0.75 : 0.45);
      if (st === 'outcast') p *= 0.3;
      if (st === 'ainu' || st === 'ryukyuHyakusho') p = 0.02;
      if (st === 'ryukyuShi') p = sx === 'm' ? 0.9 : 0.1;
      p = clamp(p, 0, 1);
      var e1 = ev(L, 'terakoya', 1877, '寺子屋などで字を習った子の割合の目安（' + KIND_WORD[L.kind] + '・' + (sx === 'm' ? '男' : '女') + '）', pct(p), { est: true });
      if (rnd() < p) {
        L.school = st === 'bushi' && sx === 'm' ? '藩校' : st === 'ryukyuShi' ? '村学校' : '寺子屋';
        L.stats.school = true; L.schoolEnd = a + 3 + Math.floor(rnd() * 3);
        push(L, rec, '学歴と仕事', L.school === '藩校' ? '家で字を習い、やがて藩の学校（藩校）に通い始めた' : L.school === '村学校' ? '村学校に通い、字を習い始めた' : '寺子屋に通い始めた。師匠の家で手習いをして、いろはから覚えた', [e1]);
      } else push(L, rec, '学歴と仕事', '字を習いに通うことはなく、家の手伝いをして過ごした', [e1]);
      return;
    }
    // 明治の小学校（6歳）
    if (a === 6 && y >= 1873 && y < 1947 + 6) {
      var pe = lin(H.nat.elem[sx], y);
      if (st === 'ainu' && y < 1900) pe *= 0.5;
      var e2 = ev(L, 'gakusei', near(H.nat.elem[sx], y), '小学校の就学率（' + (sx === 'm' ? '男' : '女') + '）', pct(pe), { est: st === 'ainu' });
      if (rnd() < pe) {
        L.school = '小学校'; L.stats.school = true;
        L.schoolEnd = y < 1886 ? a + 2 + Math.floor(rnd() * 4) : y < 1902 ? 10 : 12;
        push(L, rec, '学歴と仕事', y < 1941 ? '小学校に入った' : '国民学校に入った', [e2]);
      } else push(L, rec, '学歴と仕事', '小学校には通わず、家の仕事や子守りを手伝った', [e2]);
      return;
    }
    if (a === 6 && y >= 1947 + 6) {
      L.school = '小学校'; L.stats.school = true; L.schoolEnd = 12;
      push(L, rec, '学歴と仕事', '小学校に入学した', [ev(L, 'school', y, '義務教育', '全員')]);
      return;
    }
    // 小学校を終えたあと（旧制）
    if (L.school === '小学校' && a === L.schoolEnd && (y - a + 12) < 1947) {
      if (y >= 1890 && a >= 10) {
        L.queue.push(branchPath(L, 'old'));
        return;
      }
      L.school = null; L.edu = '小学校';
      push(L, rec, '学歴と仕事', '小学校に通うのは終わりになった', []);
      return;
    }
    if (L.school === '小学校' && a === 12 && y >= 1947) { L.school = '中学校'; L.schoolEnd = 15; L.edu = '中学'; push(L, rec, '学歴と仕事', '中学校に入学した', [ev(L, 'school', y, '義務教育', '全員')]); return; }
    if (L.school === '中学校' && a === 15) { L.queue.push(branchPath(L, 'hs')); return; }
    if (L.school === '高校' && a === 18) { L.queue.push(branchPath(L, 'univ')); return; }
    if (L.school && a === L.schoolEnd && ['寺子屋', '藩校', '村学校'].indexOf(L.school) >= 0) { L.edu = L.school; L.school = null; return; }
    if (L.school && a >= L.schoolEnd && ['高等小学校', '旧制中学', '高等女学校', '旧制の上の学校', '大学', '短大'].indexOf(L.school) >= 0) {
      if ((L.school === '旧制中学' || L.school === '高等女学校') && !L.higherDone) {
        L.higherDone = true;
        var ph = nudge(H.nat.higherOld[sx], L.wantStudy, 'study');
        if (rnd() < ph) { L.school = '旧制の上の学校'; L.schoolEnd = a + (sx === 'm' ? 5 : 3); L.edu = '旧制の上の学校'; L.stats.higher = true; push(L, rec, '学歴と仕事', sx === 'm' ? '旧制の高等学校や専門学校へ進んだ' : '女子の専門学校（師範学校など）へ進んだ', [ev(L, 'gakusei', y, '中学・高等女学校から上の学校へ進んだ割合の目安', pct(H.nat.higherOld[sx]), { est: true })]); return; }
      }
      push(L, rec, '学歴と仕事', L.school + 'を卒業した', []);
      L.edu = L.school; L.school = null;
    }
  }
  function branchPath(L, kind) {
    var y = L.year, H = L.H, sx = L.sex;
    var title = kind === 'old' ? '小学校のあと' : kind === 'hs' ? '中学校のあと' : '高校のあと';
    var q = kind === 'univ' ? '大学や短大へ進みたい？' : '上の学校へ進みたい？';
    var base = kind === 'old' ? lin(H.nat.mid[sx], y) : kind === 'hs' ? lin(H.nat.hs[sx], y) : lin(H.nat.univ[sx], y) + lin(H.nat.jc[sx], y);
    return {
      title: title, kind: 'path', sub: kind,
      groups: [{ id: 'path', q: q, options: [{ k: 'study', l: '進みたい' }, { k: 'work', l: '働きたい' }] }],
      ev: [ev(L, kind === 'old' ? 'gakusei' : 'ipss', y, kind === 'old' ? (sx === 'm' ? '旧制中学' : '高等女学校') + 'に進んだ割合' : kind === 'hs' ? '高校への進学率' : '大学・短大への進学率', pct(base), { est: kind === 'old' })]
    };
  }
  function resolvePath(L, rec, br, answers) {
    var H = L.H, y = L.year, sx = L.sex, rnd = L.rnd, a = L.age;
    var w = wantFrom(answers, 'path');
    L.wantStudy = w;
    var tilt = ({ city: 1.8, town: 1.3, village: 0.7, fish: 0.6, kotan: 0.3 }[L.kind] || 1) * (L.status === 'shizoku' ? 2.5 : 1);
    if (br.sub === 'old') {
      var p = nudge(lin(H.nat.mid[sx], y) * tilt, w, 'study');
      if (rnd() < p) { L.school = sx === 'm' ? '旧制中学' : '高等女学校'; L.schoolEnd = a + (sx === 'm' ? 5 : 4); L.stats.mid = true; push(L, rec, '学歴と仕事', L.school + 'に合格し、進学した', br.ev); return; }
      var ph = nudge(lin(H.nat.higherPrimary, y), w, 'study');
      if (rnd() < ph) { L.school = '高等小学校'; L.schoolEnd = a + 2; push(L, rec, '学歴と仕事', '高等小学校に進んだ', br.ev.concat([ev(L, 'gakusei', y, '高等小学校まで通った割合の目安', pct(lin(H.nat.higherPrimary, y)), { est: true })])); return; }
      L.school = null; L.edu = '小学校';
      push(L, rec, '学歴と仕事', w === 'study' ? '上の学校へ行きたかったが、家にその余裕はなく、働きに出ることになった' : '小学校を終え、働きに出ることになった', br.ev);
      L.schoolEndOld = true;
      return;
    }
    if (br.sub === 'hs') {
      var p2 = nudge(lin(H.nat.hs[sx], y) * ({ city: 1.05, town: 1, village: 0.97, fish: 0.95, kotan: 0.8 }[L.kind] || 1), w, 'study');
      if (rnd() < p2) { L.school = '高校'; L.schoolEnd = 18; L.stats.mid = true; push(L, rec, '学歴と仕事', '高校に進学した', br.ev); return; }
      L.school = null; L.edu = '中学';
      push(L, rec, '学歴と仕事', w === 'study' ? '高校へ行きたかったが、家の事情で中学を出て働くことになった' : '中学を出て働くことになった', br.ev);
      return;
    }
    // 大学・短大の進学率は18歳人口あたりなので、高校に進んだ人の中の割合に直す
    var hsr = Math.max(0.3, lin(H.nat.hs[sx], y - 3));
    var pAll = nudge(clamp((lin(H.nat.univ[sx], y) + lin(H.nat.jc[sx], y)) / hsr, 0, 0.95), w, 'study');
    var shareU = lin(H.nat.univ[sx], y) / Math.max(0.0001, lin(H.nat.univ[sx], y) + lin(H.nat.jc[sx], y));
    var pu = pAll * shareU, pj = pAll * (1 - shareU);
    var u = rnd();
    if (u < pu) { L.school = '大学'; L.schoolEnd = 22; L.stats.higher = true; push(L, rec, '学歴と仕事', '大学に進学した', br.ev); return; }
    if (u < pu + pj) { L.school = '短大'; L.schoolEnd = 20; L.stats.higher = true; push(L, rec, '学歴と仕事', '短大に進学した', br.ev); return; }
    L.school = null; L.edu = '高校';
    push(L, rec, '学歴と仕事', '高校を出て働くことになった', br.ev);
  }

  /* 仕事 */
  var JOB = {
    farm: '家の田畑の仕事', fish: '漁の仕事', samurai: '藩のお勤め', shop: '商いの仕事', craft: '職人の仕事', temple: '寺や神社の務め', leather: '皮革や草履作りの仕事',
    ainu: '漁や狩りと、和人の漁場での仕事', ryuOff: '王府の役人の見習い', factory: '工場勤め', build: '大工や土木の仕事', silk: '製糸工場の女工', clerk: '会社や役所の勤め', teacher: '学校の先生', maid: '女中奉公', store: '商店の店員', office: '事務員'
  };
  function workYear(L, rec) {
    var y = L.year, a = L.age, rnd = L.rnd, st = L.status, sx = L.sex;
    if (L.job || L.school || a < 11) return;
    if (y < 1873 || st === 'ainu' && y < 1900) {
      if (a < 13) return;
      var k = st === 'bushi' ? (sx === 'm' ? 'samurai' : null) : st === 'hyakusho' ? (L.kind === 'fish' && sx === 'm' ? 'fish' : 'farm') : st === 'chonin' ? (sx === 'm' ? (rnd() < 0.5 ? 'shop' : 'craft') : 'maid') :
        st === 'priest' ? 'temple' : st === 'outcast' ? 'leather' : st === 'ainu' ? 'ainu' : st === 'ryukyuShi' ? (sx === 'm' ? 'ryuOff' : 'farm') : 'farm';
      L.job = k || 'home';
      if (k) push(L, rec, '学歴と仕事', JOB[k] + 'で一人前に働き始めた', [ev(L, 'jinshin', 1873, '明治6年の職業別人口（農79%・工4%・商7%・雑業9%・雇人2%）', '', { est: true })]);
      return;
    }
    if (a < 12) return;
    var sec = H_sectors(L);
    var tiltEdu = L.edu === '旧制中学' || L.edu === '高等女学校' || L.edu === '高校' ? 1.8 : L.edu === '旧制の上の学校' || L.edu === '大学' || L.edu === '短大' ? 3 : 1;
    var w = [sec[0] * ({ village: 1.8, fish: 1.8, kotan: 2, town: 0.6, city: 0.15 }[L.kind] || 1) / tiltEdu, sec[1], sec[2] * tiltEdu];
    var which = pick(rnd, [0, 1, 2], function (i) { return w[i]; });
    var k2;
    if (which === 0) k2 = L.kind === 'fish' && sx === 'm' ? 'fish' : 'farm';
    else if (which === 1) k2 = sx === 'f' && y >= 1886 && y <= 1935 && a <= 20 ? 'silk' : sx === 'm' && rnd() < 0.35 ? 'build' : 'factory';
    else k2 = tiltEdu >= 3 && rnd() < 0.35 ? 'teacher' : tiltEdu > 1 ? 'clerk' : sx === 'f' ? (y < 1950 ? 'maid' : 'office') : 'store';
    L.job = k2;
    var evs = [ev(L, 'ipss', near(L.H.nat.sectors, y), '働く人の産業の割合（農林漁業・工業・商業やサービス）', L.H.nat.sectors[near(L.H.nat.sectors, y)].map(function (v) { return pct(v); }).join('・'), { est: y < 1920 })];
    var txt = {
      farm: '家の田畑の仕事を手伝い、働き手の一人になった', fish: '父の舟に乗り、漁師として働き始めた', silk: '製糸工場の女工になった。寄宿舎に入り、朝から晩まで繭から糸を繰った', build: '大工の親方に弟子入りした', factory: '工場で働き始めた',
      teacher: '学校の先生になった', clerk: '会社勤めを始めた', maid: 'よその家に住み込みで女中奉公に出た', office: '会社の事務員として働き始めた', store: '商店に住み込みで働き始めた'
    }[k2];
    push(L, rec, '学歴と仕事', txt, evs);
  }
  function H_sectors(L) {
    var s = L.H.nat.sectors, ks = keys(s), y = L.year;
    if (y <= ks[0]) return s[ks[0]];
    for (var i = 1; i < ks.length; i++) if (y <= ks[i]) {
      var a = ks[i - 1], b = ks[i], t = (y - a) / (b - a);
      return [0, 1, 2].map(function (j) { return s[a][j] + (s[b][j] - s[a][j]) * t; });
    }
    return s[ks[ks.length - 1]];
  }

  /* 引っ越し・海外へ */
  function moveYear(L, rec) {
    var H = L.H, y = L.year, a = L.age, rnd = L.rnd;
    if (L.abroad || a < 16 || a > 30 || L.school) return;
    for (var i = 0; i < H.moves.length; i++) {
      var mv = H.moves[i];
      if (y < mv.y[0] || y > mv.y[1]) continue;
      if (mv.to === '北海道' && L.pref === '01') continue;
      var r = mv.prefsFrom.indexOf(L.pref) >= 0 ? mv.rate : mv.otherRate;
      if (L.kind === 'city') r *= 0.4;
      if (rnd() < r) {
        var from = placeLabel(L);
        if (mv.to === '北海道') { L.pref = '01'; L.prov = '蝦夷・松前'; L.sub = null; L.kind = 'village'; L.muniName = null; L.movedHokkaido = true; }
        else { L.abroad = mv.to; L.abroadPlace = mv.place; }
        L.stats.abroad = mv.to;
        push(L, rec, '地域', mv.text.replace('{国}', from), [ev(L, mv.src, y, 'この地方から' + mv.to + 'へ渡った人の割合の目安（1年あたり）', pct(r), { est: true })]);
        return;
      }
    }
    // 村から都会へ（18歳）
    if (a === 18 && y >= 1890 && (L.kind === 'village' || L.kind === 'fish' || L.kind === 'kotan') && !L.married) L.queue.push(branchOut(L));
  }
  function outBase(y) { return y < 1920 ? 0.15 : y < 1945 ? 0.22 : y < 1955 ? 0.2 : 0.45; }
  function branchOut(L) {
    return { title: '村を出るか', kind: 'out', groups: [{ id: 'out', q: '都会へ働きに出る？', options: [{ k: 'go', l: '都会へ出たい' }, { k: 'stay', l: '地元に残りたい' }] }],
      ev: [ev(L, 'ipss', near(L.H.urban, L.year), '市部に住む人の割合（全国）', pct(lin(L.H.urban, L.year))), ev(L, LIFE_SRC, L.year, '村から都会へ出た若者の割合の目安（市部人口の伸びから）', pct(outBase(L.year)), { est: true })] };
  }
  function bigCity(pref) {
    if (KANSAI.indexOf(pref) >= 0) return '27';
    if (TOKAI.indexOf(pref) >= 0) return '23';
    if (KYUSHU.indexOf(pref) >= 0) return '40';
    return '13';
  }
  function resolveOut(L, rec, br, answers) {
    var w = wantFrom(answers, 'out');
    var p = nudge(outBase(L.year), w, 'go');
    if (L.rnd() < p) {
      var to = bigCity(L.pref);
      if (L.year >= 1955 && to === '40') to = L.rnd() < 0.5 ? '27' : '13';
      L.pref = to; L.kind = 'city'; L.muniName = null; L.moved = true; L.job = null;
      if (L.year < 1889) { L.prov = { 13: '武蔵', 27: '摂津', 23: '尾張', 40: '筑前' }[to]; L.sub = null; }
      push(L, rec, '地域', '故郷を離れ、' + L.H.prefNames[to] + 'へ働きに出た', br.ev);
    } else push(L, rec, '地域', w === 'go' ? '都会へ出たかったが、家の働き手として残ることになった' : '地元に残って暮らすことにした', br.ev);
  }

  /* 結婚・子ども・離婚 */
  function marryYear(L, rec) {
    var y = L.year, a = L.age, rnd = L.rnd, H = L.H;
    if (L.married) {
      if (L.spouse && L.spouse.alive && rnd() < lin(H.nat.divorce, y)) {
        L.married = false; L.spouse.gone = true; L.divorced = y;
        push(L, rec, '人間関係', who(L.spouse) + 'と別れた（離縁）', [ev(L, 'ipss', near(H.nat.divorce, y), '夫婦1組が1年のうちに離婚する割合（人口千人あたりの離婚率から推計）', pct(lin(H.nat.divorce, y)), { est: true })]);
      }
      return;
    }
    if (L.never || L.school) return;
    var again = L.everMarried && (L.widowed || L.divorced);
    if (again) {
      if (a < 50 && rnd() < (a < 35 ? 0.2 : 0.07)) doMarry(L, rec, true, null);
      return;
    }
    if (a >= L.marryAt && a < 55) L.queue.push({ title: '縁談', kind: 'marry', groups: [{ id: 'marry', q: '縁談が持ち込まれた。受ける？', options: [{ k: 'yes', l: '受ける' }, { k: 'no', l: '断る' }] }],
      ev: [ev(L, 'ipss', near(H.nat.marriage[L.sex], y), '平均初婚年齢（' + (L.sex === 'm' ? '夫' : '妻') + '。1898年以前は村の研究の目安）', lin(H.nat.marriage[L.sex], y).toFixed(1) + '歳', { est: y < 1899 }), ev(L, 'ipss', near(H.nat.neverMarried[L.sex], y), '50歳まで一度も結婚しない人の割合', pct(lin(H.nat.neverMarried[L.sex], y)))] });
  }
  function resolveMarry(L, rec, br, answers) {
    var w = wantFrom(answers, 'marry') || (L.rnd() < 0.85 ? 'yes' : 'no');
    if (w === 'yes') { doMarry(L, rec, false, br.ev); return; }
    L.refused = (L.refused || 0) + 1;
    L.marryAt = L.age + 1 + Math.floor(L.rnd() * 3);
    if (L.refused >= 3 && L.rnd() < 0.5) L.never = true;
    push(L, rec, '人間関係', '縁談を断った', br.ev);
  }
  function doMarry(L, rec, again, evs) {
    var rnd = L.rnd, y = L.year, H = L.H;
    var gap = Math.round(lin({ 1800: 4.5, 1900: 4.2, 1950: 2.9, 1974: 2.6 }, y) + gauss(rnd) * 3);
    var sby = L.sex === 'm' ? L.by + Math.max(-2, gap) : L.by - Math.max(-2, gap);
    var sp = addMember(L, '配偶者', L.sex === 'm' ? 'f' : 'm', sby, { live: true, st: L.status });
    L.spouse = sp; L.married = true; L.everMarried = true; L.widowed = null; L.divorced = null;
    var wifeBy = L.sex === 'f' ? L.by : sby, wifeAge = y - wifeBy;
    var total = drawKids(rnd, childDist(H, wifeBy), false);
    if (again) total = Math.floor(total / 2);
    L.kidTotal = total; L.kidPlan = [];
    var t = y + 1 + Math.floor(rnd() * 2);
    for (var i = 0; i < total; i++) { if (t - wifeBy > 44) break; L.kidPlan.push(t); t += 2 + Math.floor(rnd() * 2); }
    var spn = /アイヌ語/.test(sp.name) ? '同じコタンの相手' : sp.name;
    var txt = again ? '再婚した。相手は' + spn + '。' : (y < 1947 ? '親が決めた縁談で、' : '') + spn + 'と結婚した。' + (L.sex === 'f' && (y < 1947) ? '嫁いで相手の家に入った。' : '');
    if (L.sex === 'f' && L.job && L.job !== 'farm' && y < 1960) L.job = L.kind === 'village' || L.kind === 'fish' ? 'farm' : 'home';
    push(L, rec, '家庭', txt, evs || [ev(L, LIFE_SRC, y, '再婚', '', { est: true })]);
  }

  /* 召集（戦争） */
  function warYear(L, rec) {
    var y = L.year, a = L.age;
    if (L.sex !== 'm' || L.abroad === 'ハワイ' || L.abroad === 'ブラジル') return;
    if (y >= 1937 && y <= 1945 && a >= 20 && a <= 40 && !L.drafted) {
      var p = y <= 1940 ? 0.1 : y <= 1943 ? 0.2 : 0.35;
      if (L.rnd() < p) { L.drafted = y; push(L, rec, '時代', '召集令状（赤紙）が届き、兵隊として出征した。駅で家族や近所の人が見送った', [ev(L, 'ipss', y, '戦没者約310万人（軍人・軍属約230万人）', '', { est: true })]); }
    }
    if ((y === 1945 || y === 1946) && L.drafted && !L.demob && L.alive) {
      if (y === 1946 || L.rnd() < 0.4) { L.demob = true; push(L, rec, '時代', '戦争が終わり、復員して家に帰った', [ev(L, LIFE_SRC, y, '復員', '')]); }
    }
  }

  /* 災害・流行病・戦争で亡くなる */
  function inArea(L, e) {
    if (L.abroad && e.where !== 'all') return false;
    if (L.abroad && (L.abroad === 'ハワイ' || L.abroad === 'ブラジル')) return false;
    if (e.where === 'all') return !e.prefs || e.prefs.indexOf(L.pref) >= 0;
    if (e.where === 'city') return L.year < 1873 && L.kind === 'city' && cityName(L) === e.city;
    var r = e.rates[L.year] || {};
    if (e.where === 'prov') return r[L.prov] != null || r[L.sub] != null;
    if (e.prefs) return e.prefs.indexOf(L.pref) >= 0;
    return r[L.pref] != null;
  }
  function rateFor(L, e, who) {
    var r = e.rates[L.year] || {};
    var v = r.all != null ? r.all : e.where === 'city' ? r[e.city] : e.where === 'prov' ? (r[L.sub] != null ? r[L.sub] : r[L.prov]) : r[L.pref];
    if (v == null) return 0;
    if (e.cityWeight > 1) v = Math.min(0.9, v * (L.kind === 'city' ? e.cityWeight : 0.25));
    if (e.id === 'war-pacific' && who.age > 35) v /= 2;
    return v;
  }
  function whoOk(e, p) {
    var w = e.who;
    if (!w) return true;
    if (w.sex && w.sex !== p.sex) return false;
    if (w.ages && (p.age < w.ages[0] || p.age > w.ages[1])) return false;
    if (w.status && w.status.indexOf(p.st) < 0) return false;
    if (w.notStatus && w.notStatus.indexOf(p.st) >= 0) return false;
    if (w.prefs && w.prefs.indexOf(p.pref) < 0) return false;
    if (w.kind && w.kind.indexOf(p.kind) < 0) return false;
    return true;
  }
  function eventYear(L, rec) {
    var H = L.H, y = L.year;
    for (var i = 0; i < H.events.length; i++) {
      var e = H.events[i];
      if (y < e.y[0] || y > e.y[1] || !inArea(L, e)) continue;
      var me = { sex: L.sex, age: L.age, st: L.status, pref: L.pref, kind: L.kind };
      var evs = [ev(L, e.src, y, e.title + '：亡くなった人の割合' + (e.note ? '（' + e.note + '）' : ''), '', { est: e.est })];
      // 一緒に暮らす家族や、兵隊に取られる年ごろの家族
      L.members.forEach(function (m) {
        if (!m.alive || m.gone || m.by >= y || L.abroad) return;
        var pm = { sex: m.sex, age: y - m.by, st: m.st || L.status, pref: L.pref, kind: L.kind };
        if (!whoOk(e, pm)) return;
        if (e.where !== 'all' && !m.live && m.role !== '配偶者') return;
        var v = rateFor(L, e, pm);
        if (v > 0 && L.rnd() < v) {
          m.alive = false; m.dy = y;
          if (m.role === '配偶者') { L.married = false; L.widowed = y; }
          evs[0].val = pct(v);
          push(L, rec, '家庭', who(m) + 'が、' + e.deadText.replace(/亡くなった$/, '亡くなった。') + (y - m.by) + '歳だった。', evs.slice());
        }
      });
      if (!whoOk(e, me)) continue;
      var v2 = rateFor(L, e, me);
      evs[0].val = pct(v2);
      if (v2 > 0 && L.rnd() < v2) { dieBy(L, rec, e.kind === '戦争' || e.kind === '空襲' || e.kind === '原爆' ? 'war' : 'disaster', e.deadText, evs); return; }
      var show = e.where !== 'all' || (e.who && L.rnd() < 0.35) || (!e.who && L.rnd() < 0.2);
      if (show && !L.used['ev:' + e.id]) { L.used['ev:' + e.id] = 1; push(L, rec, '時代', e.text, evs); }
    }
  }

  /* 物（1957年からの普及率。今の本体と同じ表） */
  function goodsYear(L, rec) {
    var y = L.year, C = L.C;
    if (L.abroad || y < 1957 || y >= FUTURE_FROM || !C.goods) return;
    L.goods = L.goods || {};
    C.goods.forEach(function (g) {
      if (L.goods[g.id]) return;
      var d = E.val(g.diff, y) / 100;
      if (d > 0 && d >= L.adoptU) { L.goods[g.id] = y; push(L, rec, '時代', g.home, [ev(L, g.src, near(g.diff, y), g.name + 'の普及率', Math.round(d * 100) + '%')]); }
    });
  }

  /* 場面 */
  function sceneOk(L, s) {
    var y = L.year, a = L.age;
    if (s.y && (y < s.y[0] || y > s.y[1])) return false;
    if (a < s.a[0] || a > s.a[1]) return false;
    if (s.st) {
      var st = L.status;
      if (L.ryukyu && L.status !== 'ryukyuShi' && L.status !== 'ryukyuHyakusho' && s.st.indexOf('ryukyuHyakusho') >= 0) st = 'ryukyuHyakusho';
      if ((st === 'buraku') && s.st.indexOf('outcast') >= 0 && y >= 1871) st = 'outcast';
      if (s.st.indexOf(st) < 0) return false;
    }
    if (s.k && s.k.indexOf(L.kind) < 0) return false;
    if (s.jp && (L.ainu || L.ryukyu)) return false;
    if (s.wk && s.wk.indexOf(L.job) < 0) return false;
    if (s.edu && s.edu.indexOf(L.edu) < 0) return false;
    if (s.sex && s.sex !== L.sex) return false;
    if (s.prefs && s.prefs.indexOf(L.pref) < 0) return false;
    if (s.abroad && s.abroad !== (L.abroad || (L.movedHokkaido ? '北海道' : null))) return false;
    if (!s.abroad && L.abroad && s.cat === '地域') return false;
    if (s.married === true && !L.married) return false;
    if (s.married === false && L.married) return false;
    if (s.kids && !L.members.some(function (m) { return m.role === '子' && m.alive; })) return false;
    if (s.grand && !L.members.some(function (m) { return m.role === '孫' && m.alive; })) return false;
    if (s.school && !(L.school === '小学校' || L.school === '中学校')) return false;
    if (s.flag === 'hoko' && L.job && L.job !== 'shop' && L.job !== 'maid') return false;
    if (s.flag === 'jokou' && L.job !== 'silk') return false;
    if (s.flag === 'terakoya' && L.school !== '寺子屋') return false;
    var u = L.used['s:' + L.H.scenes.indexOf(s)];
    if (u && (s.once || L.year - u < (L.age >= 88 ? 3 : L.age >= 80 ? 5 : 12))) return false;
    return true;
  }
  function pickScene(L) {
    var cands = L.H.scenes.filter(function (s) { return sceneOk(L, s); });
    if (!cands.length) return null;
    var s = cands[Math.floor(L.rnd() * cands.length)];
    L.used['s:' + L.H.scenes.indexOf(s)] = L.year;
    return s;
  }
  function fill(L, t) {
    return t.replace(/\{(父|母|配偶者|子|国|町)\}/g, function (_, k) {
      if (k === '父') return L.dad.name;
      if (k === '母') return L.mom.name;
      if (k === '配偶者') return L.spouse && !/アイヌ語/.test(L.spouse.name) ? L.spouse.name : '連れ合い';
      if (k === '子') { var c = L.members.filter(function (m) { return m.role === '子' && m.alive && !/アイヌ語/.test(m.name); }); return c.length ? c[Math.floor(L.rnd() * c.length)].name : '子ども'; }
      if (k === '国') return placeLabel(L);
      return L.muniName || '町';
    });
  }

  /* 稼ぎ（推計）：1975年の働く人の平均的な年収を2025年のお金の価値で約450万円とし、
     ほかの年は1人あたりの国内総生産（Maddison）の比で直す。1975年の年齢・男女の差の目安も掛ける */
  function earnYear(L) {
    var y = L.year, a = L.age;
    if (!L.job || L.job === 'home' || L.school || a < 12 || a > 75) return;
    if (y >= FUTURE_FROM) return;
    if (L.sex === 'f' && L.married && L.job !== 'farm' && y < 1985 && L.kids) return;
    var g = L.H.nat.gdp, base = 4500 * (E.val(g, Math.min(y, 2022)) / E.val(g, 1975));
    var ageF = a < 20 ? 0.45 : a < 30 ? 0.75 : a < 50 ? 1.1 : a < 60 ? 1.15 : a < 65 ? 0.7 : 0.4;
    var sexF = L.sex === 'f' ? 0.55 : 1;
    if (L.job === 'farm' || L.job === 'fish') sexF *= 0.75;
    L.earn.real += base * ageF * sexF;
    L.earn.years++;
  }

  /* 年の終わり・亡くなる */
  function dieBy(L, rec, cause, text, evs) {
    L.alive = false; L.cause = cause; L.deathYear = L.year; L.deathAge = L.age;
    push(L, rec, '健康', text, evs || []);
  }
  var CAUSE_TEXT = { '肺炎及び気管支炎': '肺炎で亡くなった', '全結核': '結核で亡くなった', '胃腸炎': '下痢や腸の病気（胃腸炎）で亡くなった', '脳血管疾患': '脳卒中で倒れ、亡くなった', '老衰': '老衰で、静かに息を引き取った', 'インフルエンザ': 'インフルエンザで亡くなった', '悪性新生物': 'がんで亡くなった', '心疾患': '心臓の病気で亡くなった', '不慮の事故': '事故で亡くなった' };
  function causeOf(L) {
    var H = L.H, y = Math.max(1900, Math.min(1970, Math.floor(L.year / 10) * 10)), a = L.age;
    var list = (H.nat.causeRank[y] || H.nat.causeRank[1900] || []).filter(Boolean);
    if (a < 5) return L.year < 1900 && L.rnd() < 0.3 ? { t: '疱瘡やはしかなどの病にかかり、幼くして亡くなった', n: '子どもの病気' } : { t: L.rnd() < 0.5 ? '肺炎で、幼くして亡くなった' : '下痢や腸の病気で、幼くして亡くなった', n: '子どもの病気' };
    if (a >= 80 && L.rnd() < 0.45) return { t: CAUSE_TEXT['老衰'], n: '老衰' };
    if (a < 70) list = list.filter(function (c) { return c.name !== '老衰'; });
    if (a < 45) list = list.filter(function (c) { return c.name !== '脳血管疾患'; });
    var c = pick(L.rnd, list, function (x) { return (x.rate || 1) * (a < 45 && x.name === '全結核' ? 3 : 1); });
    return c ? { t: CAUSE_TEXT[c.name] || c.name + 'で亡くなった', n: c.name } : { t: '病気で亡くなった', n: '病気' };
  }
  function finishYear(L, rec) {
    if (!L.alive) { L.log.push(rec); return; }
    var y = L.year, a = L.age;
    if (a >= 5) L.stats.to5 = true;
    if (a >= 60) L.stats.to60 = true;
    var q = dp(L, L.sex, a, y);
    if (a > 0 && L.rnd() < q || a >= 110) {
      var c = y >= 1975 ? { t: a >= 85 ? CAUSE_TEXT['老衰'] : '病気で亡くなった', n: '病気' } : causeOf(L);
      dieBy(L, rec, 'ill', c.t, [ev(L, y < 1975 ? 'ipss' : 'lifetable', y, a + '歳の人が1年のうちに亡くなる確率（平均寿命と乳児死亡率から推計）', (q * 100).toFixed(2) + '%', { est: y < 1975 }), ev(L, 'ipss', y < 1900 ? 1900 : Math.min(1970, Math.floor(y / 10) * 10), '死因の順位（' + (y < 1900 ? '1900年より前は1900年の順位を使用' : 'その年代') + '）', c.n, { est: y < 1900 })]);
      L.log.push(rec);
      return;
    }
    if (a === 0 && L.rnd() < q) {
      dieBy(L, rec, 'ill', y < 1900 ? '生まれて1年もたたないうちに、病で亡くなった' : '生まれて1年もたたないうちに亡くなった', [ev(L, 'ipss', near(L.H.mort.q0, y), '0歳で亡くなる確率（乳児死亡率。1899年以前は江戸時代の研究の目安から推計）', (q * 100).toFixed(1) + '%', { est: y < 1900 })]);
      L.log.push(rec);
      return;
    }
    L.log.push(rec);
    L.year++; L.age++;
  }

  /* 分かれ道 */
  function resolve(L, answers) {
    var rec = L.rec, br = rec.branch;
    rec.branch = null;
    if (br) {
      if (br.kind === 'path') resolvePath(L, rec, br, answers);
      else if (br.kind === 'out') resolveOut(L, rec, br, answers);
      else if (br.kind === 'marry') resolveMarry(L, rec, br, answers);
    }
    if (L.alive && L.queue.length) { rec.branch = L.queue.shift(); return rec; }
    finishYear(L, rec);
    return rec;
  }
  function autoRun(L) {
    var guard = 0;
    while (L.alive && guard++ < 130) {
      var rec = step(L);
      while (rec && rec.branch) rec = resolve(L, null);
    }
    return L;
  }

  /* 最期の画面 */
  function cohort(C, H, P, L0, n) {
    n = n || 100;
    var r = { n: n, to5: 0, school: 0, to60: 0, earns: [] };
    for (var i = 0; i < n; i++) {
      var L = autoRun(newLife(C, H, P, { year: L0.by, seed: (L0.seed * 7919 + i * 104729 + 13) >>> 0, birth: { prov: L0.home.prov || L0.prov, sub: L0.home.sub || L0.sub, pref: L0.home.pref } }));
      if (L.stats.to5) r.to5++;
      if (L.stats.school) r.school++;
      if (L.stats.to60) r.to60++;
      r.earns.push(L.earn.real);
    }
    r.earns.sort(function (p, q) { return p - q; });
    r.earnMedian = (r.earns[Math.floor((n - 1) / 2)] + r.earns[Math.ceil((n - 1) / 2)]) / 2;
    r.items = [['5歳まで生きた人', r.to5], [L0.by < 1873 ? '寺子屋や学校で字を習った人' : '学校に通った人', r.school], ['60歳まで生きた人', r.to60]];
    return r;
  }
  function majorTimeline(C, H, L) {
    var until = Math.min(L.deathYear, FUTURE_FROM - 1), out = [];
    H.timeline.forEach(function (r) {
      if (r.y < L.by || r.y > until || r.y > 1974) return;
      if (['戦争', '政治', '災害'].indexOf(r.type) < 0) return;
      if (r.provs || r.prefs) { if (!(r.prefs && r.prefs.indexOf(L.home.pref) >= 0) && !(r.provs && r.provs.indexOf(L.home.prov) >= 0)) return; }
      out.push({ y: r.y, t: r.t, type: r.type });
    });
    if (until >= 1975) out = out.concat(E.majorTimeline(C, 1975, until, L.pref));
    return out;
  }
  function familyList(L) {
    return L.members.filter(function (m) { return m.by <= L.year && !m.before; }).map(function (m) {
      return { rel: relWord(m) + (m.side ? '（' + m.side + '）' : ''), name: m.name, by: m.by, alive: m.alive, dy: m.dy, gone: !!m.gone };
    });
  }
  function endText(L) {
    return L.home.label + 'で生まれ、' + placeLabel(L) + 'で亡くなった。';
  }

  return {
    eraLabel: eraLabel, pickBirth: pickBirth, newLife: newLife, step: step, resolve: resolve, autoRun: autoRun,
    cohort: cohort, majorTimeline: majorTimeline, familyList: familyList, endText: endText, placeLabel: placeLabel, deathProb: dp
  };
});
