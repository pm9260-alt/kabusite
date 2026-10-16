/* 1000分の1 昔の人生の進め方（1000〜1974年生まれ）
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
    else if ((st === 'ainu' || st === 'satsumon') && by < 1876) return 'アイヌ語の名前';
    else if (by < 1600) list = st === 'kuge' ? (sex === 'm' ? N.mKuge : N.fKuge) : sex === 'm' ? (by < 1185 ? N.mHeian : N.mMed) : N.fMed;
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
    var m = { id: L.members.reduce(function (x, o) { return Math.max(x, o.id); }, 0) + 1, role: role, sex: sex, by: by, alive: true, dy: null };
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

  // 中世の身分の割合（時代ごとの全国の目安に、都に近い国の上乗せを掛ける）
  function medStatusW(H, prov, y) {
    var per = null;
    H.medStatus.forEach(function (m) { if (y >= m.from && y <= m.to) per = m; });
    if (!per) return null;
    var w = {}, add = H.medStatusProv[prov] || {};
    Object.keys(per.w).forEach(function (k) { w[k] = per.w[k] * (add[k] || 1); });
    // 貴族（公家）は都のある山城国にだけ住んでいた
    if (prov !== '山城') w.kuge = 0;
    return w;
  }
  function drawStatus(L) {
    var H = L.H, y = L.by, rnd = L.rnd, p = H.prov[L.prov];
    if (L.prov === '蝦夷・松前' || (L.pref === '01' && y < 1900)) {
      var share = y < 1873 ? lin(H.ainuShare, y) : clamp(17000 / popHokkaido(y), 0.005, 0.15);
      if (rnd() < share) return y < 1200 ? 'satsumon' : 'ainu';
    }
    if (L.pref === '47' && y < 1429) return 'gusuku';
    if (L.pref === '47' && y < 1912) return rnd() < lin(H.ryukyuShi, Math.min(1852, y)) ? 'ryukyuShi' : 'ryukyuHyakusho';
    if (y < 1600) {
      var mw = medStatusW(H, L.prov, y);
      if (mw) return pick(rnd, Object.keys(mw), function (k) { return mw[k]; });
    }
    var st = (p && p.status) || { bushi: 0.06, priest: 0.01, hyakusho: 0.8, chonin: 0.12, outcast: 0.009 };
    var w = { bushi: st.bushi, priest: st.priest, hyakusho: st.hyakusho, chonin: st.chonin, outcast: st.outcast };
    // 江戸には武士が多く住んでいた（1873年の数は東京から武士が去ったあとのため、江戸時代は多めにする目安）
    if (L.prov === '武蔵' && y < 1868 && y >= 1603) w.bushi = 0.2;
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
  // その年に大きな町としてあったもの（江戸は1603年から、鎌倉は1185〜1333年など）
  function cityOf(p, y) {
    if (!p) return null;
    if (p.medCity && y >= p.medCity.from && (!p.medCity.to || y <= p.medCity.to)) return p.medCity;
    if (p.city && (!p.city.from || y >= p.city.from)) return p.city;
    return null;
  }
  function drawKind(L) {
    var H = L.H, rnd = L.rnd, y = L.by, st = L.status, p = H.prov[L.prov];
    if (st === 'ainu' || st === 'satsumon') return 'kotan';
    if (st === 'gusuku') return rnd() < 0.15 ? 'fish' : 'village';
    if (st === 'kuge') return cityOf(p, y) ? 'city' : 'town';
    if (st === 'genin') return 'village';
    if (y < 1873) {
      var city = cityOf(p, y);
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
    var c = cityOf(p, L.year);
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
    // 海沿いかどうかの印が市区町村にまだないため、浜の村には今の市区町村名を添えない
    if (L.kind === 'fish') return null;
    // 大東島は1900年に人が住み始めた島
    var skip = L.by < 1900 ? ['北大東村', '南大東村'] : [];
    var want = L.kind === 'city' ? ['大都市', '都市'] : L.kind === 'town' ? ['都市', '町村'] : ['町村'];
    var list = L.P.munis.filter(function (m) { return want.indexOf(m.kind) >= 0 && skip.indexOf(m.name) < 0; });
    if (!list.length) list = L.P.munis;
    return pick(L.rnd, list, function (m) { return Math.sqrt(E.val(m.share, 1995)); });
  }
  // 地図のピンの場所：今の市区町村が分かればその市区町村、分からなければ都道府県（旧国）の中ほど。海外は地図に出さない
  function pinOf(L) {
    if (L.abroad) return { abroad: true };
    var m = L.muniName && L.P && L.P.munis ? L.P.munis.filter(function (x) { return x.name === L.muniName; })[0] : null;
    // 旧国の目安の場所は、その旧国が今の都道府県に入っているときだけ使う（明治のあとに県外へ移ったときは県の中ほど）
    var pv = L.H.prov[L.sub || L.prov] ? (L.sub || L.prov) : L.prov;
    var ok = pv && L.H.prov[pv] && L.H.prov[pv].prefs && L.H.prov[pv].prefs[L.pref];
    return { pref: L.pref, muni: m ? m.code : null, prov: ok ? pv : null };
  }
  var KIND_WORD = { city: '町なか', town: '町', village: '村', fish: '浜の村', kotan: 'コタン（アイヌの村）' };
  function placeLabel(L) {
    if (L.abroad) return L.abroadPlace;
    var y = L.year, p = L.H.prov[L.prov], pn = L.H.prefNames[L.pref];
    var kw = KIND_WORD[L.kind];
    var cn = cityName(L);
    var muni = L.muniName ? '（今の' + L.muniName + 'のあたり）' : '';
    if (L.status === 'ryukyuShi' && L.kind === 'town') return (y < 1879 ? '琉球王国' : '沖縄県') + ' 首里';
    if (L.pref === '47' && y < 1429) return '沖縄の島の' + (L.kind === 'fish' ? '浜の村' : '村') + '（グスク時代）' + muni;
    if (L.pref === '47' && y < 1879) return '琉球王国の村' + muni;
    if (y < 1200 && L.prov === '蝦夷・松前') return '北の島（今の北海道）の川沿いの村';
    if (y < 1600 && L.prov === '蝦夷・松前') return '夷島（今の北海道）の' + (L.kind === 'kotan' ? kw : '和人の館のある浜');
    if (L.pref === '47' && y < 1889) return '沖縄県の' + kw + muni;
    if (y < 1869 && L.prov === '蝦夷・松前') return '蝦夷地の' + (L.kind === 'kotan' ? kw : L.kind === 'town' || L.kind === 'city' ? '松前の町' : '和人の村');
    if (y < 1873) {
      if (L.kind === 'city' && cn) return p.kuni + ' ' + cn;
      if (L.kind === 'town' && L.status === 'bushi' && y >= 1580) return p.kuni + 'の城下町' + muni;
      if (L.kind === 'town' && L.status === 'bushi' && y < 1580) return p.kuni + 'の武士の館のある里' + muni;
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

  /* ---------- きょうだいとして生きる：家の中身を引き継ぐ（作る人の指示書「きょうだいとして生きる」2026-10-17） ----------
     houseOf：亡くなった人の家（両親・祖父母・きょうだい・身分・住まい）を取り出す。
     newLife に opts.house と opts.memberId を渡すと、そのきょうだいとして同じ家に生まれ直す。
     前の人が亡くなった年までは、引き継いだ家族の生死を記録どおりにし（抽選し直さない）、本人も亡くならない。 */
  var FAMILY_ROLES = ['父', '母', '祖父', '祖母'];
  function houseOf(L, chain) {
    var home = L.age < 15 || L.home0 == null ? { prov: L.prov, sub: L.sub, pref: L.pref, kind: L.kind, muni: L.muni, muniName: L.muniName } : L.home0;
    var mem = L.members.filter(function (m) { return m.sib || FAMILY_ROLES.indexOf(m.role) >= 0; }).map(function (m) {
      var o = {}; for (var k in m) if (k !== 'fixDy') o[k] = m[k]; return o;
    });
    return {
      old: true, seed: L.seed0 || L.seed, deathYear: L.deathYear, deathAge: L.deathAge, cause: L.cause,
      prev: { name: L.name, sex: L.sex, by: L.by, heir: !!L.heir, surname: L.surname || null },
      members: mem, status: L.status, ainu: L.ainu, ryukyu: L.ryukyu, home: home, goods: L.goods || {}, incPct: L.incPct, surname: L.surnameOld || L.surname || null,
      chain: (chain || []).slice(), story: L.story ? { toxic: !!L.story.f.toxic, bigwig: !!L.story.f.bigwig, prosper: L.story.f.prosper || L.story.f.prosperHouse || 0 } : null
    };
  }
  function sibRole(sex, by, myBy) { return by < myBy ? (sex === 'm' ? '兄' : '姉') : (sex === 'm' ? '弟' : '妹'); }
  // きょうだいの候補：亡くなった年に生きているきょうだいと、これから生まれる弟や妹
  function heirCandidates(L) {
    var dy = L.deathYear, momAlive = L.mom && L.mom.alive;
    return L.members.filter(function (m) { return m.sib && !m.gone && ((m.by > dy && momAlive) || (m.alive && m.by <= dy)); }).map(function (m) {
      return { id: m.id, role: m.role, name: m.by > dy ? null : m.name, sex: m.sex, by: m.by, age: m.by > dy ? null : dy - m.by, later: m.by > dy ? m.by - dy : 0 };
    });
  }
  // 子として生きる：亡くなった年に生きている子
  function childCandidates(L) {
    var dy = L.deathYear, NUM = ['長', '次', '三', '四', '五', '六', '七', '八', '九'];
    var kids = L.members.filter(function (m) { return m.role === '子'; }).sort(function (a, b) { return a.by - b.by || a.id - b.id; });
    return kids.filter(function (m) { return !m.gone && m.alive && m.by <= dy; }).map(function (m) {
      var n = kids.filter(function (x) { return x.sex === m.sex; }).indexOf(m);
      return { id: m.id, role: (NUM[n] || (n + 1) + '番目の') + (m.sex === 'm' ? '男' : '女'), name: m.name, sex: m.sex, by: m.by, age: dy - m.by, later: 0, child: true };
    });
  }
  // 子の目から見た家：亡くなった人と配偶者が親、ほかの子がきょうだい、亡くなった人の親が祖父母。住む所と身分と名字は亡くなったときの親のもの
  function childHouse(L, memberId, chain) {
    var h = houseOf(L, chain), kid = L.members.filter(function (m) { return m.id === memberId; })[0];
    if (!kid) throw new Error('引き継ぐ子がいない');
    var pRole = L.sex === 'm' ? '父' : '母', oRole = L.sex === 'm' ? '母' : '父', side = L.sex === 'm' ? '父方' : '母方';
    var sp = L.members.filter(function (m) { return m.role === '配偶者'; })[0];
    var mem = [], maxId = 0;
    L.members.forEach(function (m0) {
      maxId = Math.max(maxId, m0.id);
      var role = m0.role === '子' ? 'kid' : m0 === sp ? oRole : m0.role === '父' ? '祖父' : m0.role === '母' ? '祖母' : null;
      if (!role) return;
      var o = {}; for (var k in m0) if (k !== 'fixDy') o[k] = m0[k];
      if (role === 'kid') { o.sib = true; o.role = '子'; }
      else { o.sib = false; o.role = role; o.live = true; if (role === '祖父' || role === '祖母') o.side = side; }
      mem.push(o);
    });
    if (!sp) mem.push({ id: maxId + 2, role: oRole, sex: L.sex === 'm' ? 'f' : 'm', by: L.by + (L.sex === 'm' ? 2 : -2), name: null, alive: true, dy: null, gone: true, live: true });
    h.members = mem;
    h.home = L.abroad ? L.home0 : { prov: L.prov, sub: L.sub, pref: L.pref, kind: L.kind, muni: L.muni, muniName: L.muniName };
    if (L.sex === 'f' && sp && sp.st) h.status = sp.st;
    h.surname = L.surname || null;
    h.prev.surname = L.surname || null;
    h.gen = 'child';
    return h;
  }
  function inheritLife(C, H, P, opts) {
    var h = opts.house, me = h.members.filter(function (m) { return m.id === opts.memberId; })[0];
    if (!me) throw new Error('引き継ぐきょうだいがいない');
    var seed = (opts.seed >>> 0) || 1, rnd = E.makeRng(seed);
    var L = {
      C: C, H: H, P: P, old: true, rnd: rnd, seed: seed, seed0: h.seed, by: me.by, year: me.by, age: 0, sex: me.sex,
      prov: h.home.prov, sub: h.home.sub, pref: h.home.pref, kind: h.home.kind, muni: h.home.muni, muniName: h.home.muniName,
      members: [], used: {}, cat: {}, catTotal: 0, alive: true, log: [], queue: [],
      edu: null, school: null, job: null, married: false, everMarried: false, abroad: null,
      stats: { school: false, mid: false, to5: false, to60: false, events: 0 },
      earn: { real: 0, years: 0, est: true },
      status: h.status, ainu: h.ainu, ryukyu: h.ryukyu, goods: {}, inherited: true
    };
    CATS.forEach(function (c) { L.cat[c] = 0; });
    L.house = { deathYear: h.deathYear, prevName: h.prev.name, prevSex: h.prev.sex, prevBy: h.prev.by, prevAge: h.deathAge, prevHeir: h.prev.heir, chain: h.chain, story: h.gen === 'child' ? (h.story && h.story.prosper ? { prosper: h.story.prosper } : null) : h.story };
    var maxId = 0;
    h.members.forEach(function (m0) {
      maxId = Math.max(maxId, m0.id);
      if (m0.id === me.id) return;
      var m = {}; for (var k in m0) m[k] = m0[k];
      // 前の人生で亡くなった年（記録）。亡くなった年までは、この年に亡くなり、それまでは抽選しない
      m.fixDy = m.dy != null && !m.alive && m.dy <= h.deathYear ? m.dy : null;
      if (m.sib) m.role = sibRole(m.sex, m.by, me.by);
      if (!m.gone) { m.alive = !(m.fixDy != null && m.fixDy < me.by); m.before = !m.alive; if (m.alive) m.dy = null; }
      L.members.push(m);
    });
    // 前の主人公も家族に入れる（きょうだいのときはきょうだい、子のときは親）
    var kidGen = h.gen === 'child';
    var pv = { id: maxId + 1, role: kidGen ? (h.prev.sex === 'm' ? '父' : '母') : sibRole(h.prev.sex, h.prev.by, me.by), sex: h.prev.sex, by: h.prev.by, name: h.prev.name, sib: !kidGen, live: true, alive: true, dy: null, fixDy: h.deathYear, prevLife: true };
    if (pv.fixDy < me.by) { pv.alive = false; pv.before = true; pv.dy = pv.fixDy; }
    L.members.push(pv);
    L.dad = L.members.filter(function (m) { return m.role === '父'; })[0];
    L.mom = L.members.filter(function (m) { return m.role === '母'; })[0];
    L.members.forEach(function (m) { if (!m.name) m.name = nameFor(L, m.sex, m.by, L.status); });
    L.name = me.name || nameFor(L, L.sex, L.by, L.status);
    if (kidGen) L.house.gen = 'child';
    L.fAge = L.by - L.dad.by; L.mAge = L.by - L.mom.by;
    L.sibs = L.members.filter(function (m) { return m.sib && !m.gone; }).length;
    L.protectUntil = h.deathYear;
    L.marryAt = marryAge(H, L.sex, L.by + 20, rnd);
    L.never = rnd() < lin(H.nat.neverMarried[L.sex], L.by + 45);
    L.adoptU = clamp(rnd() + ({ city: -0.08, town: 0, village: 0.06, fish: 0.06, kotan: 0.1 })[L.kind], 0.002, 0.998);
    L.home = { pref: L.pref, prov: L.prov, sub: L.sub, prefName: H.prefNames[L.pref], muniName: '', label: placeLabel(L) };
    L.home0 = { prov: L.prov, sub: L.sub, pref: L.pref, kind: L.kind, muni: L.muni, muniName: L.muniName };
    for (var g in h.goods) if (h.goods[g] <= L.by) L.goods[g] = h.goods[g];
    L.rnd2 = E.makeRng((seed ^ 0x2545f491) >>> 0);
    L.incPct = h.incPct != null ? h.incPct : L.rnd2();
    L.surname = h.surname || pickSurname(L, L.rnd2);
    updateHeir(L, null);
    return L;
  }
  /* ---------- 跡取り（家督）：生きている男子のうちいちばん年上の子。男子がいなければいちばん年上の娘に婿を取る。子がいなければ養子 ----------
     1898〜1947年は明治民法の家督相続、1897年以前は「長男が継ぐことが多かった」を目安にする（推計）。1948年からは家制度がないため決めない */
  function heirOf(L) {
    var kids = L.members.filter(function (m) { return m.sib && !m.gone && m.alive && m.by <= L.year; }).map(function (m) { return { id: m.id, sex: m.sex, by: m.by }; });
    if (L.alive) kids.push({ id: 0, sex: L.sex, by: L.by });
    kids.sort(function (a, b) { return a.by - b.by || a.id - b.id; });
    var sons = kids.filter(function (k) { return k.sex === 'm'; }), girls = kids.filter(function (k) { return k.sex === 'f'; });
    return sons.length ? { id: sons[0].id, how: 'son' } : girls.length ? { id: girls[0].id, how: 'muko' } : { id: null, how: 'adopt' };
  }
  function heirEv(L, y) {
    return y >= 1898 ? ev(L, 'meijiCivil', 1898, '家督を継ぐのは、生きている男子のうちいちばん年上の子', '') : ev(L, 'iePractice', y, '跡取りは長男が多かった（地域によって姉家督・末子相続などの違いがある）', '', { est: true, noYearNote: true });
  }
  function updateHeir(L, rec) {
    if (L.year > 1947 || L.status === 'ainu' || L.status === 'satsumon') { L.heir = false; L.heirF = false; return; }
    var h = heirOf(L), was = !!L.heir;
    L.house = L.house || {};
    L.house.heirId = h.id; L.house.heirHow = h.how;
    // 家督を親類などの養子が継いだ家では、もう跡取りにはならない
    L.heir = h.id === 0 && L.sex === 'm' && !L.passed;
    L.heirF = h.id === 0 && L.sex === 'f' && h.how === 'muko' && !L.passed;
    if (rec && L.heir && !was && (L.age >= 1 || L.inherited)) {
      var dead = L.members.filter(function (m) { return m.sib && m.sex === 'm' && m.dy === L.year && m.by < L.by; })[0];
      if (dead) push(L, rec, '家庭', who(dead) + 'が亡くなり、家を継ぐことになった。', [heirEv(L, L.year)], { house: true });
    }
  }
  // 引き継いだ家族の生死を記録どおりにする年か
  function fixedYear(L, m) { return L.house && L.year <= L.house.deathYear && m.fixDy !== undefined; }
  // 生まれた年に、前の人生で亡くなった家族（ふだんは0歳の年に家族の死を抽選しないため、記録どおりにここで出す）
  function fixedDeathsAtBirth(L, rec) {
    var y = L.year;
    L.members.forEach(function (m) {
      if (!m.alive || m.gone || m.by >= y || !fixedYear(L, m) || m.fixDy !== y) return;
      m.alive = false; m.dy = y;
      var e = push(L, rec, '家庭', who(m) + 'が' + (y - m.by) + '歳で亡くなった。', [ev(L, LIFE_SRC, y, '前の人生で起きた家族の死', '', { noYearNote: true })]);
      if (m.prevLife) e.house = true;
      if (m.prevLife) e.short = who(m) + 'が亡くなった。';
    });
    updateHeir(L, rec);
  }
  function protectedYear(L) { return L.protectUntil != null && L.year <= L.protectUntil; }

  function newLife(C, H, P, opts) {
    if (opts.house) return inheritLife(C, H, P, opts);
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
    L.ainu = L.status === 'ainu' || L.status === 'satsumon';
    L.ryukyu = L.pref === '47';
    familyAtBirth(L);
    L.marryAt = marryAge(H, L.sex, year + 20, rnd);
    L.never = rnd() < lin(H.nat.neverMarried[L.sex], year + 45);
    L.adoptU = clamp(rnd() + ({ city: -0.08, town: 0, village: 0.06, fish: 0.06, kotan: 0.1 })[L.kind], 0.002, 0.998);
    L.home = { pref: L.pref, prov: L.prov, sub: L.sub, prefName: H.prefNames[L.pref], muniName: '', label: placeLabel(L) };
    L.home0 = { prov: L.prov, sub: L.sub, pref: L.pref, kind: L.kind, muni: L.muni, muniName: L.muniName };
    // 家の豊かさ（小作・自作・地主の目安）と家の名字は、ほかの抽選の順番を変えないよう別の乱数で決める
    L.rnd2 = E.makeRng((seed ^ 0x2545f491) >>> 0);
    L.incPct = L.rnd2();
    L.surname = pickSurname(L, L.rnd2);
    updateHeir(L, null);
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
  // 北海道（1599年まで）と沖縄（1608年まで）は、本州の朝廷や幕府の出来事が届かない土地として扱う
  function apart(L, y) { return (L.prov === '蝦夷・松前' && y < 1600) || (L.prov === '琉球' && y < 1609); }
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
        if (!r.provs && apart(L, y)) return;
        items.push({ t: r.t, type: r.type, ev: [ev(L, LIFE_SRC, y, '年表（' + r.type + '）', '', { noYearNote: true })] });
      });
    }
    if (!items.length) {
      var ctxs = H.eraContext.filter(function (c) {
        if (y < c.from || y > c.to) return false;
        if (c.provs && c.provs.indexOf(L.prov) < 0) return false;
        if (c.notFor && c.notFor.indexOf(L.prov) >= 0) return false;
        return true;
      });
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

  /* ---------- 物語の分かれ道（js/story.js）とのつなぎ ---------- */
  var STORY_TO = { tokyo: '13', edo: '13', osaka: '27', kyoto: '26', hokkaido: '01' };
  var STORY_API = {
    makeRng: E.makeRng, gauss: function (r) { var u = 1 - r(), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); },
    push: function (L, rec, cat, t, evs) { return push(L, rec, cat, t, evs); },
    nameFor: function (L, sex, by) { return E.storyName(L, sex, by); },
    move: function (L, where) {
      if (where === 'home') { var h = L.home0; if (!h) return; L.prov = h.prov; L.sub = h.sub; L.pref = h.pref; L.kind = h.kind; L.muni = h.muni; L.muniName = h.muniName; L.abroad = null; L.moved = false; return; }
      var to = STORY_TO[where] || '13';
      if (L.pref === to) return;
      L.pref = to; L.kind = to === '01' ? 'village' : 'city'; L.muniName = null; L.muni = null; L.moved = true;
      if (L.year < 1889) { L.prov = { 13: '武蔵', 27: '摂津', 26: '山城', '01': '蝦夷・松前' }[to]; L.sub = null; }
    },
    job: function (L, label, pay, reg, ind) { L.job = 'story'; L.storyPay = pay; L.lastJob = label; },
    noJob: function (L) { L.job = 'home'; L.storyPay = null; },
    marryBoost: function (L, k) { if (k >= 1) { L.never = false; L.marryAt = Math.min(L.marryAt || 99, L.age + (k >= 3 ? 1 : 2)); } else L.marryAt = (L.marryAt || L.age) + 5; }
  };
  function storyYear(L, rec) { var S = E.storyMod(); if (S && L.alive) S.year(L, rec, STORY_API); }

  function step(L) {
    if (!L.alive) return null;
    var y = L.year, a = L.age;
    var rec = { year: y, age: a, eraLabel: eraLabel(L.H, y), place: placeLabel(L), pin: pinOf(L), world: worldLine(L, y, a), events: [], branch: null, future: y >= FUTURE_FROM };
    L.rec = rec;
    if (a === 0) { birthEvent(L, rec); if (L.house && L.house.deathYear >= y) fixedDeathsAtBirth(L, rec); }
    else {
      familyYear(L, rec);
      historyYear(L, rec);
      lifeYear(L, rec);
      storyYear(L, rec);
    }
    if (L.alive && E.ASK_AGES.indexOf(a) >= 0) L.queue.push(E.askFor(L));
    if (L.alive && L.queue.length) { rec.branch = L.queue.shift(); return rec; }
    finishYear(L, rec);
    return rec;
  }

  var ST_WORD = { kuge: '貴族（公家）の家', genin: '主人に仕える下人の家', satsumon: '擦文文化の人々の家', gusuku: '島の村の家', bushi: '武士の家', hyakusho: '百姓の家', chonin: '町人の家', priest: '寺や神社の家', outcast: '被差別身分とされた家', ainu: 'アイヌの家', ryukyuShi: '琉球の士（さむれー）の家', ryukyuHyakusho: '琉球の百姓の家', shizoku: '士族の家', buraku: '被差別部落の家', heimin: '平民の家' };
  // 時代で呼び方が変わる身分
  function stWord(L) {
    var y = L.year, st = L.status;
    if (y < 1600 && st === 'outcast') return '河原者や非人とされた家';
    if (y < 1600 && st === 'chonin') return '職人や商人の家';
    if (y < 1185 && st === 'hyakusho') return '田を耕す農民の家';
    return ST_WORD[st];
  }
  function birthEvent(L, rec) {
    var H = L.H, y = L.year, st = L.status;
    var sibs = L.members.filter(function (m) { return m.sib && m.by < y; });
    var s = rec.place + 'で、' + stWord(L) + 'に' + (L.sex === 'm' ? '男の子' : '女の子') + 'として生まれた。' + (st === 'satsumon' ? '名前は土地の言葉で付けられた。' : /アイヌ語/.test(L.name) ? '名前はアイヌ語で付けられた。' : '名前は' + L.name + '。');
    s += '父は' + L.fAge + '歳、母は' + L.mAge + '歳。';
    var alive = sibs.filter(function (m) { return !m.before; }), dead = sibs.filter(function (m) { return m.before; });
    if (alive.length) s += alive.map(who).join('、') + 'がいる。';
    else if (!dead.length) s += 'はじめての子どもだった。';
    if (dead.length) s += '上には幼くして亡くなったきょうだいが' + dead.length + '人いた。';
    if (L.house && L.by > L.house.deathYear) {
      var pm = L.members.filter(function (m) { return m.prevLife; })[0];
      if (pm) s += relWord(pm) + 'の' + pm.name + 'が亡くなって' + (L.by - L.house.deathYear) + '年後に生まれた。';
    }
    var evs = [];
    if (y < 1873) {
      var p = H.prov[L.prov];
      var early = y < (L.prov === '琉球' ? 1772 : L.prov === '蝦夷・松前' ? 1798 : 1721);
      var psrc = L.prov === '琉球' ? (early ? 'medRyukyu' : 'ryukyu') : L.prov === '蝦夷・松前' ? (early ? 'medEzo' : 'ezo') : early ? 'kito' : 'edoPop';
      evs.push(ev(L, psrc, near(p.w, y), p.kuni + 'の人口' + (early ? (L.prov === '琉球' || L.prov === '蝦夷・松前' ? '（記録がないため置いた目安）' : '（鬼頭宏の900・1150・1600年の推計の間を直線でつないだ値）') : '（武士などを数えていない幕府の調査を、1873年の人口との比で補った）'), Math.round(lin(p.w, y)).toLocaleString('ja-JP') + '人', { est: true }));
    } else {
      evs.push(ev(L, 'ipss', near(H.prefW, y), H.prefNames[L.pref] + 'で生まれた子の割合（全国の出生数のうち。1873年は旧国の人口から）', pct(lin(prefSeries(H, L.pref), y)), { est: y < 1900 }));
    }
    var stShare = statusShare(L);
    if (stShare != null) evs.push(y < 1600 && !L.ryukyu && st !== 'ainu' && st !== 'satsumon' ? ev(L, 'medStatus', y, stWord(L) + 'に生まれる割合の目安（' + (H.prov[L.prov] ? H.prov[L.prov].kuni : '') + '）', pct(stShare), { est: true }) :
      ev(L, st === 'ainu' || st === 'satsumon' ? (y < 1804 ? 'medEzo' : 'ezo') : L.ryukyu ? (y < 1706 ? 'medRyukyu' : 'ryukyu') : st === 'outcast' || st === 'buraku' ? 'outcast' : 'jinshin', y < 1873 ? Math.max(y, 1000) : 1873, stWord(L) + 'に生まれる割合（' + (H.prov[L.prov] ? H.prov[L.prov].kuni : '') + '）', pct(stShare), { est: true }));
    evs.push(ev(L, 'ipss', near(H.nat.children, L.mom.by), '母の生まれ年の「妻が産んだ子どもの数」（1890年より前の生まれは1890年代の値）', '平均' + childDist(H, L.mom.by).mean + '人', { est: L.mom.by < 1890 }));
    push(L, rec, '家庭', s, evs);
  }
  function statusShare(L) {
    var H = L.H, p = H.prov[L.prov], st = L.status;
    if (st === 'gusuku') return 1;
    if (st === 'ainu' || st === 'satsumon') return L.by < 1873 ? lin(H.ainuShare, L.by) : 17000 / popHokkaido(L.by);
    if (L.by < 1600 && !L.ryukyu) {
      var mw = medStatusW(H, L.prov, L.by);
      if (mw) { var tot = 0; Object.keys(mw).forEach(function (k) { tot += mw[k]; }); return mw[st] != null ? mw[st] / tot : null; }
    }
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
        // 前の人生で、生まれた年のうちに亡くなっていた子
        if (fixedYear(L, m) && m.fixDy === y) {
          m.alive = false; m.dy = y;
          var fe0 = push(L, rec, '家庭', who(m) + 'が、生まれて1年もたたずに亡くなった。', [ev(L, LIFE_SRC, y, '前の人生で起きた家族の死', '', { noYearNote: true })]);
          if (m.prevLife) fe0.house = true;
          fe0.short = relWord(m) + 'の' + m.name + 'が亡くなった。';
        }
        return;
      }
      if (!m.alive || m.by >= y) return;
      if (fixedYear(L, m)) {
        if (m.fixDy !== y) return;
        m.alive = false; m.dy = y;
        var fa = y - m.by;
        var fe = push(L, rec, '家庭', who(m) + 'が' + (fa === 0 ? '生まれて1年もたたずに' : fa + '歳で') + '亡くなった。', [ev(L, LIFE_SRC, y, '前の人生で起きた家族の死', '', { noYearNote: true })]);
        if (m.prevLife) fe.house = true;
        if (m.prevLife) fe.short = relWord(m) + 'の' + m.name + 'が亡くなった。';
        return;
      }
      var q = dp(L, m.sex, y - m.by, y);
      if (rnd() < q) {
        m.alive = false; m.dy = y;
        if (m.role === '配偶者') { L.married = false; L.widowed = y; }
        var age = y - m.by;
        push(L, rec, '家庭', who(m) + 'が亡くなった。' + (age === 0 ? '生まれて1年もたたなかった。' : age + '歳だった。'), [ev(L, y < 1975 ? 'ipss' : 'lifetable', y, age + '歳の人が1年のうちに亡くなる確率（平均寿命と乳児死亡率から推計）', (q * 100).toFixed(2) + '%', { est: y < 1975 })]);
      }
    });
    updateHeir(L, rec);
    // 1948年からの戦後の形（長男と墓・親との同居）。history の人生では場所の種類を今の区分に合わせる
    if (y >= 1948 && !protectedYear(L) && !L.abroad) { var pk = L.place; L.place = { away: false, kind: L.kind === 'city' ? '大都市' : L.kind === 'town' ? '都市' : '町村' }; E.postwarYear(L, rec); L.place = pk; }
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
    if (y === 1429 && st === 'gusuku') { L.status = 'ryukyuHyakusho'; push(L, rec, '時代', '尚巴志が三つの国をまとめ、琉球王国ができた。村は首里の王府に治められることになった', [ev(L, 'medRyukyu', 1429, '琉球王国の成立', '')]); }
    if (y === 1879 && L.ryukyu) push(L, rec, '時代', '琉球王国がなくなり、沖縄県になった（琉球処分）。首里城には日本の兵が入った', [ev(L, LIFE_SRC, 1879, '琉球処分', '')]);
    if (y === 1922 && (st === 'buraku' || st === 'outcast') && L.age >= 12) push(L, rec, '時代', '「人の世に熱あれ、人間に光あれ」。差別をなくすための全国水平社ができたと聞いた', [ev(L, LIFE_SRC, 1922, '全国水平社の創立', '')]);
    if (y === 1945 && L.abroad === '満洲') {
      var r = H.manchuria.rate;
      if (L.rnd() < r) { dieBy(L, rec, 'war', E.deathStory(L, { kind: 'war', head: 'ソ連軍が攻めてきて、開拓団は荒野を逃げ惑った。その逃避行の途中で、飢えと寒さのために亡くなった' }).text, [ev(L, H.manchuria.src, 1945, '開拓団にいた人のうち亡くなった割合', pct(r), { est: true })]); return; }
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
    ieYear(L, rec);
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
    if (L.alive) earnYear(L, rec);
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
      // 寺子屋が広がるのは18世紀から。それより前は寺で手習いをする子は少なかった（目安）
      var eraF = y < 1600 ? 0.12 : y < 1700 ? 0.4 : y < 1750 ? 0.7 : 1;
      p *= eraF;
      var region = (H.prov[L.prov] || {}).region;
      if (t.high.indexOf(region) >= 0 || t.high.indexOf(L.prov) >= 0) p *= 1.3;
      if (t.low.indexOf(L.prov) >= 0) p *= 0.5;
      if (st === 'bushi') p = y < 1700 ? (sx === 'm' ? 0.8 : 0.4) : (sx === 'm' ? 1 : 0.7);
      if (st === 'kuge') p = sx === 'm' ? 1 : 0.9;
      if (st === 'genin' || st === 'satsumon' || st === 'gusuku') p = st === 'genin' ? 0.02 : 0;
      if (st === 'chonin') p = Math.max(p, sx === 'm' ? 0.75 : 0.45);
      if (st === 'outcast') p *= 0.3;
      if (st === 'ainu' || st === 'ryukyuHyakusho') p = 0.02;
      if (st === 'ryukyuShi') p = (sx === 'm' ? 0.9 : 0.1) * (y < 1700 ? 0.6 : 1);
      p = clamp(p, 0, 1);
      var e1 = ev(L, 'terakoya', 1877, (y < 1700 ? '寺や家で字を習った子の割合の目安（寺子屋が広がる前のため少なめにした）' : '寺子屋などで字を習った子の割合の目安') + '（' + KIND_WORD[L.kind] + '・' + (sx === 'm' ? '男' : '女') + '）', pct(p), { est: true });
      if (rnd() < p) {
        L.school = st === 'kuge' ? '家学' : st === 'bushi' && sx === 'm' && y >= 1700 ? '藩校' : st === 'ryukyuShi' && y >= 1800 ? '村学校' : y < 1700 ? '寺での手習い' : '寺子屋';
        L.stats.school = true; L.schoolEnd = a + (L.school === '家学' ? 6 : 3) + Math.floor(rnd() * 3);
        push(L, rec, '学歴と仕事', {
          '藩校': '家で字を習い、やがて藩の学校（藩校）に通い始めた', '村学校': '村学校に通い、字を習い始めた', '家学': '家で漢籍の素読や和歌、書を学び始めた',
          '寺での手習い': '近くの寺に通い、僧から字の書き方を習い始めた', '寺子屋': '寺子屋に通い始めた。師匠の家で手習いをして、いろはから覚えた'
        }[L.school], [e1]);
      } else push(L, rec, '学歴と仕事', st === 'satsumon' || st === 'gusuku' || (st === 'ainu' && y < 1700) ? '文字を使う暮らしではなかった。家の仕事を手伝いながら、暮らしの知恵を身につけていった' : '字を習いに通うことはなく、家の手伝いをして過ごした', [e1]);
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
    if (L.school && a === L.schoolEnd && ['寺子屋', '藩校', '村学校', '家学', '寺での手習い'].indexOf(L.school) >= 0) { L.edu = L.school; L.school = null; return; }
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
    hoko: '奉公', kozo: '商店の小僧', farm: '家の田畑の仕事', fish: '漁の仕事', samurai: '藩のお勤め', shop: '商いの仕事', craft: '職人の仕事', temple: '寺や神社の務め', leather: '皮革や草履作りの仕事',
    ainu: '漁や狩りと、和人の漁場での仕事', ryuOff: '王府の役人の見習い',
    court: '朝廷の役所の務め', genin: '主人の家の田畑や雑用の仕事', hunt: '漁や狩りと、毛皮や干し魚の取り引き', bushiMed: '主君に仕える武士の務め', kawara: '河原での皮作りや井戸掘り、清めの仕事', factory: '工場勤め', build: '大工や土木の仕事', silk: '製糸工場の女工', clerk: '会社や役所の勤め', teacher: '学校の先生', maid: '女中奉公', store: '商店の店員', office: '事務員'
  };
  function workYear(L, rec) {
    var y = L.year, a = L.age, rnd = L.rnd, st = L.status, sx = L.sex;
    if (L.job || L.school || a < 11) return;
    if (y < 1873 || st === 'ainu' && y < 1900) {
      if (a < 13) return;
      var k = st === 'kuge' ? (sx === 'm' ? 'court' : null) : st === 'genin' ? 'genin' : st === 'satsumon' || (st === 'ainu' && y < 1700) ? 'hunt' :
        st === 'gusuku' ? (L.kind === 'fish' && sx === 'm' ? 'fish' : 'farm') : st === 'outcast' && y < 1600 ? 'kawara' :
        st === 'bushi' ? (sx === 'm' ? (y < 1600 ? 'bushiMed' : 'samurai') : null) : st === 'hyakusho' ? (L.kind === 'fish' && sx === 'm' ? 'fish' : 'farm') : st === 'chonin' ? (sx === 'm' ? (rnd() < 0.5 ? 'shop' : 'craft') : 'maid') :
        st === 'priest' ? 'temple' : st === 'outcast' ? 'leather' : st === 'ainu' ? 'ainu' : st === 'ryukyuShi' ? (sx === 'm' ? 'ryuOff' : 'farm') : 'farm';
      L.job = k || 'home';
      if (k) L.lastJob = JOB[k];
      if (k) push(L, rec, '学歴と仕事', JOB[k] + 'で一人前に働き始めた', [y < 1600 ? ev(L, 'medStatus', y, '中世の身分と暮らしの目安', '', { est: true }) : ev(L, 'jinshin', 1873, '明治6年の職業別人口（農79%・工4%・商7%・雑業9%・雇人2%）', '', { est: true })]);
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
    L.lastJob = JOB[k2];
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
    if (L.abroad || a < 16 || a > 30 || L.school || L.hoko) return;
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
    if (L.never || L.school || (L.hoko && !L.hoko.done)) return;
    var again = L.everMarried && (L.widowed || L.divorced);
    if (again) {
      if (a < 50 && rnd() < (a < 35 ? 0.2 : 0.07)) doMarry(L, rec, true, null);
      return;
    }
    if (a >= L.marryAt && a < 55 && L.sex === 'm' && !L.heir && !L.adopted && !L.mukoNo && !L.muko && ieOK(L) && L.status !== 'bushi') {
      var hr = heirlessRates(L), pm = clamp((hr.muko + hr.adopt) / hr.supply, 0, 0.6);
      if (L.rnd2() < pm / 0.8) {
        L.queue.push({ title: '婿養子の話', kind: 'muko', rate: 0.8, groups: [{ id: 'muko', q: '跡取りの男子がいない家から、婿養子に来てほしいという話が来た。受ける？', options: [{ k: 'yes', l: '婿養子に入る' }, { k: 'no', l: '断る' }] }],
          ev: [ev(L, 'ipss', near(H.nat.children, L.mom.by), '跡取りの男子がいない家の割合（妻が産んだ子どもの数と、20歳まで生きる割合から計算した目安）', pct(hr.muko + hr.adopt), { est: true })] });
        return;
      }
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
    L.spouse = sp; L.married = true; L.everMarried = true; L.widowed = null; L.divorced = null; L.marriedY = y;
    var wifeBy = L.sex === 'f' ? L.by : sby, wifeAge = y - wifeBy;
    var total = drawKids(rnd, childDist(H, wifeBy), false);
    if (again) total = Math.floor(total / 2);
    L.kidTotal = total; L.kidPlan = [];
    var t = y + 1 + Math.floor(rnd() * 2);
    for (var i = 0; i < total; i++) { if (t - wifeBy > 44) break; L.kidPlan.push(t); t += 2 + Math.floor(rnd() * 2); }
    var spn = /アイヌ語/.test(sp.name) ? '同じコタンの相手' : sp.name;
    var txt = again ? '再婚した。相手は' + spn + '。' : (y < 1947 ? '親が決めた縁談で、' : '') + spn + 'と結婚した。' + (L.sex === 'f' && (y < 1947) ? (L.heirF ? '跡取りの男子がいない家のため、婿を迎えた（婿養子）。' + spn + 'が家に入り、家の名字を名乗った。' : '嫁いで相手の家に入った。') : '');
    L.heirFAtMarry = !!(L.sex === 'f' && y < 1947 && L.heirF && !again);
    if (L.sex === 'f' && y < 1947 && L.heirF) { L.tookMuko = true; sp.muko = true; }
    if (L.sex === 'f' && L.job && L.job !== 'farm' && y < 1960) L.job = L.kind === 'village' || L.kind === 'fish' ? 'farm' : 'home';
    push(L, rec, '家庭', txt, evs || [ev(L, LIFE_SRC, y, '再婚', '', { est: true })]);
    if (y >= 1948) E.wifeNameYear(L, rec);
  }

  /* ---------- 継がない子の道（奉公・分家・婿養子・養子）1947年まで ----------
     作る人の指示書「きょうだいとして生きる・継がない子の道」6。跡取り（6-1）は updateHeir。 */
  var SURNAMES = ['佐藤', '鈴木', '高橋', '田中', '伊藤', '渡辺', '山本', '中村', '小林', '加藤', '吉田', '山田', '佐々木', '山口', '松本', '井上', '木村', '林', '斎藤', '清水', '山崎', '森', '池田', '橋本', '阿部', '石川', '山下', '中島', '石井', '小川', '前田', '岡田', '長谷川', '藤田', '後藤', '近藤', '村上', '遠藤', '青木', '坂本', '福田', '太田', '西村', '藤井', '岡本', '藤原', '中野', '三浦', '原田', '松田'];
  // 家の名字（江戸時代の百姓・町人は公には名乗れなかったため、家の呼び名として持たせる）。アイヌ・琉球・中世より前の家には持たせない
  function pickSurname(L, r) {
    if (L.status === 'ainu' || L.status === 'satsumon' || L.ryukyu || L.by < 1600) return null;
    return SURNAMES[Math.floor(r() * SURNAMES.length)];
  }
  function otherSurname(L) { var s0 = L.surname; for (var i = 0; i < 20; i++) { var t = SURNAMES[Math.floor(L.rnd2() * SURNAMES.length)]; if (t !== s0) return t; } return '中川'; }
  function tier(L) { return L.incPct < 0.4 ? 0 : L.incPct < 0.8 ? 1 : 2; }
  var TIER_NAME = ['小作（家の豊かさが下の4割）', '自作（中ほどの4割）', '地主（上の2割）'];
  // 奉公に出る割合の目安（美濃国安八郡西条村、1773〜1869年。速水融『歴史人口学の世界』）
  var HOKO = { m: [0.62, 0.30, 0.40], f: [0.72, 0.60, 0.30] };
  // 武士の当主のうち養子の割合（徳島藩の知行取。村越一哲 2001）
  var BUSHI_ADOPT = [[1601, 0.097], [1651, 0.185], [1701, 0.340], [1751, 0.476], [1801, 0.380]];
  function bushiAdoptT(y) { var t = BUSHI_ADOPT[0][1]; BUSHI_ADOPT.forEach(function (b) { if (y >= b[0]) t = b[1]; }); return t; }
  // 生まれた家の世代で、20歳まで生きる子の割合（その年ごとの亡くなる確率から）
  function surv20(L, sex) { var l = 1; for (var a = 0; a < 20; a++) l *= 1 - dp(L, sex, a, L.by + a); return l; }
  // 跡取りの男子がいない家の数と、跡取りでない男子の数（妻の生まれ年別の子どもの数と亡くなる割合から。新しい割合の数字は足さない）
  function heirlessRates(L) {
    var d = childDist(L.H, L.mom.by), m4 = d.dist[4] > 0 ? Math.max(4, (d.mean - (d.dist[1] + 2 * d.dist[2] + 3 * d.dist[3])) / d.dist[4]) : 4;
    var ps = 0.513 * surv20(L, 'm'), pd = 0.487 * surv20(L, 'f');
    var muko = 0, adopt = 0, supply = 0, heirs = 0, sons = 0;
    d.dist.forEach(function (w, n) {
      var k = n === 4 ? m4 : n;
      var p0 = Math.pow(1 - ps, k), none = Math.pow(1 - ps - pd, k);
      muko += w * (p0 - none); adopt += w * none;
      supply += w * (k * ps - (1 - p0)); heirs += w * (1 - p0); sons += w * k * ps;
    });
    return { muko: muko, adopt: adopt, supply: Math.max(0.01, supply), heirShare: sons > 0 ? heirs / sons : 1 };
  }
  function ieOK(L) { return L.year <= 1947 && L.year >= 1600 && !L.abroad && !L.ainu && !L.ryukyu && ['hyakusho', 'chonin', 'bushi', 'heimin', 'shizoku'].indexOf(L.status) >= 0; }
  function hokoEv(L, rate) { return [ev(L, 'hayami', 1869, '奉公に出る割合の目安（' + TIER_NAME[tier(L)] + '・' + (L.sex === 'm' ? '男子' : '女子') + '。江戸後期の1つの村の研究をもとにした目安）', pct(rate), { est: true, noYearNote: true })]; }
  function ieYear(L, rec) {
    var y = L.year, a = L.age, sx = L.sex;
    if (!ieOK(L) || !L.alive) return;
    if (L.hoko && !L.hoko.done) { hokoYear(L, rec); return; }
    // 奉公に出るか（百姓・町人・明治からの平民の子。男子は跡取りでない子、娘は跡取りかどうかにかかわらず）
    var commoner = ['hyakusho', 'chonin', 'heimin'].indexOf(L.status) >= 0;
    var ageOk = sx === 'm' ? a >= 12 && a <= 15 : a >= 13 && a <= 15;
    if (commoner && ageOk && !L.hokoAsked && !L.job && (!L.school || a === 15) && !(sx === 'm' && L.heir)) {
      L.hokoAsked = { y: y, tier: tier(L), sex: sx };
      var rate = HOKO[sx][tier(L)];
      L.queue.push({ title: y < 1872 ? '奉公に出るか' : '働きに出るか', kind: 'hoko', rate: rate,
        groups: [{ id: 'hoko', q: y < 1872 ? (sx === 'm' ? '町の商家へ丁稚奉公に出る？' : 'よその家へ女中奉公に出る？') : '家を出て働きに出る？', options: [{ k: 'go', l: y < 1872 ? '奉公に出る' : '働きに出る' }, { k: 'stay', l: '家に残る' }] }], ev: hokoEv(L, rate) });
      return;
    }
    // 分家（跡取りでない男子・25歳ごろ）
    if (sx === 'm' && !L.heir && !L.bunke && !L.muko && !L.adopted && a === 25 && !L.bunkeAsked) {
      L.bunkeAsked = true;
      var pb = null, why;
      if (L.status === 'hyakusho' && y < 1872) { pb = tier(L) === 2 ? 0.3 : 0; why = tier(L) === 2 ? '分けられる田畑のある家（地主・自作の上位）' : '分地制限令で、田畑の少ない家は分けられない'; }
      else if (L.status === 'bushi' && y < 1872) { pb = 0.03; why = '家禄は分けられないことが多く、藩に認められたときだけ'; }
      if (pb) L.queue.push({ title: '分家するか', kind: 'bunke', rate: pb, groups: [{ id: 'bunke', q: L.status === 'bushi' ? '藩に願い出て、新しく家を立てる？' : '田畑を分けてもらい、分家する？', options: [{ k: 'yes', l: '分家する' }, { k: 'no', l: '家に残る' }] }],
        ev: [ev(L, 'bunchi', 1673, '分家の目安（' + why + '）', pct(pb), { est: true, noYearNote: true })] });
      else if (pb === 0 && L.status === 'hyakusho' && y >= 1673) push(L, rec, '家庭', '分けてもらえる田畑はなく、兄の家で暮らし続けた（部屋住み）', [ev(L, 'bunchi', 1673, '分地制限令（名主は20石、一般の百姓は10石に満たない場合は田畑を分けられない）', '')]);
      return;
    }
    // 武士の次男・三男：他家の養子の話（17〜25歳）
    if (L.status === 'bushi' && y < 1872 && sx === 'm' && !L.heir && !L.adopted && !L.yoshiAsked && a >= 17 && a <= 25 && L.rnd2() < 0.5) {
      L.yoshiAsked = true;
      var t = bushiAdoptT(y), hr = heirlessRates(L), hf = hr.heirShare;
      var py = clamp(t / (1 - t) * hf / Math.max(0.05, 1 - hf), 0, 0.95);
      L.queue.push({ title: '養子の話', kind: 'yoshi', rate: py, groups: [{ id: 'yoshi', q: '跡取りのいない武士の家から、養子に迎えたいという話が来た。受ける？', options: [{ k: 'yes', l: '養子に入る' }, { k: 'no', l: '断る' }] }],
        ev: [ev(L, 'murakoshi', y, '武士の当主のうち養子の人の割合（徳島藩の知行取。ほかの藩にも使う目安）', pct(t), { est: true })] });
      return;
    }
    // 武士の家督の受け継ぎ：父が亡くなるか隠居する（60歳）とき。当主が養子になる家の割合を表に合わせる
    // （作る人の判断 2026-10-17：「当主が養子だった家」で数える。男子がいない家のほか、男子がいても親類や武士でない家から養子を迎えた家を含める）
    if (L.status === 'bushi' && y < 1872 && !L.adopted && !L.succ && a >= 15 && L.dad && (!L.dad.alive || y - L.dad.by >= 60)) {
      var tA = bushiAdoptT(y);
      var sons = L.members.filter(function (m) { return m.sib && m.sex === 'm' && m.alive && !m.gone && m.by <= y; }).length + (sx === 'm' ? 1 : 0);
      var adopted = true;
      if (sons) {
        // 男の主人公の家には必ず男子がいるので、男子のいない家の分（p0）は女の主人公の家だけで見込む
        var p0 = 0;
        if (sx === 'f') { var hr0 = heirlessRates(L); p0 = clamp(hr0.muko + hr0.adopt, 0, 0.9); }
        adopted = L.rnd2() < clamp((tA - p0) / (1 - p0), 0, 0.95);
      }
      L.succ = { y: y, adopted: adopted, t: tA };
      var ws = L.dad.alive ? '父が隠居し、' : '父が亡くなり、', aev = [ev(L, 'murakoshi', y, '武士の当主のうち養子の人の割合（徳島藩の知行取。ほかの藩にも使う目安）', pct(tA), { est: true })];
      if (sx === 'm' && L.heir && !adopted) { L.toshu = 'heir'; push(L, rec, '家庭', ws + '家督を継いだ', [heirEv(L, y)]); }
      else if (sx === 'm' && L.heir) {
        L.passed = true; L.heir = false;
        push(L, rec, '家庭', ws + ['家督は、親類から迎えた養子が継ぐことになった。自分は部屋住みの身となった', '藩の許しを得て、家督は他家から迎えた養子が継ぐことになった。自分は部屋住みとなった'][Math.floor(L.rnd2() * 2)], aev);
      } else if (adopted) push(L, rec, '家庭', ws + (sons ? '家督は、親類から迎えた養子が継いだ' : sx === 'f' && L.heirF ? '家督は、婿を迎えて継ぐことになった' : '跡取りの男子がおらず、家督は養子が継いだ'), aev);
      else push(L, rec, '家庭', ws + (sx === 'm' ? '家督は兄が継いだ' : '家督は兄弟が継いだ'), [heirEv(L, y)]);
    }
    // 明治からの分家（戸籍の上で新しい家を立てる。都市に出た次男・三男が結婚を機に）
    if (y >= 1898 && sx === 'm' && !L.heir && L.married && !L.bunke && L.marriedY === y - 1 && (L.kind === 'city' || L.moved) && L.rnd2() < 0.5) {
      L.bunke = y;
      push(L, rec, '家庭', '結婚を機に、戸籍の上で生まれた家から分家し、新しい家を立てた', [ev(L, 'meijiCivil', 1898, '分家（戸籍の上で新しい家を立てる。都市に出た次男・三男が結婚を機に分家する流れの目安）', '', { est: true })]);
    }
    // 分家したあとの場面
    if (L.bunke && y > L.bunke && L.rnd2() < 0.15) push(L, rec, '家庭', ['本家の法事に呼ばれ、親類が集まった', '正月に本家へあいさつに行った', '田植えの時期に、本家の手伝いに出た', '本家とのあいだで、行き来が続いた'][Math.floor(L.rnd2() * 4)], [ev(L, LIFE_SRC, y, '分家と本家の付き合い', '', { noYearNote: true })]);
    // 婿養子・養子に入ったあとの場面
    if ((L.muko || L.adopted) && y - (L.mukoY || 0) <= 6 && y > (L.mukoY || 0) && L.rnd2() < 0.3) push(L, rec, '家庭', ['妻の家の親と同じ屋根の下で暮らし、気をつかう日々が続いた', '家の決まりや家業を、一から覚えた', '実家との行き来は、だんだん減っていった'][Math.floor(L.rnd2() * 3)], [ev(L, LIFE_SRC, y, '婿養子・養子の暮らし', '', { noYearNote: true })]);
  }
  function resolveHoko(L, rec, br, answers) {
    var w = wantFrom(answers, 'hoko'), y = L.year, sx = L.sex;
    if (L.rnd2() >= nudge(br.rate, w, 'go')) { push(L, rec, '学歴と仕事', w === 'go' ? '奉公に出たかったが、家の働き手として残ることになった' : '家に残り、家の仕事を手伝うことになった', br.ev); return; }
    L.hokoAsked.went = true;
    var home = { prov: L.prov, sub: L.sub, pref: L.pref, kind: L.kind, muni: L.muni, muniName: L.muniName };
    var dur = Math.round(clamp(13.5 + gauss(L.rnd2) * 2.5, 8, 19));
    if (L.status === 'chonin' && sx === 'm') dur = Math.round(clamp(18 + gauss(L.rnd2) * 3, 12, 24));
    // 行き先：江戸後期は大都市より町場が多かった。7割を近くの町場、3割を大都市とする（目安）
    var big = L.rnd2() < 0.3, dest;
    if (big) {
      var to = bigCity(L.pref);
      if (y < 1872 && to === '40') to = '27';
      L.pref = to; L.kind = 'city'; L.muniName = null; L.muni = null;
      if (y < 1889) { L.prov = { 13: '武蔵', 27: '摂津', 23: '尾張', 40: '筑前' }[to]; L.sub = null; }
      dest = 'city';
    } else {
      L.kind = 'town';
      var mu = pickMuni(L); if (mu) { L.muni = mu.code; L.muniName = mu.name; }
      dest = 'town';
    }
    var job = y < 1872 ? 'hoko' : sx === 'f' ? ((['20', '21', '19'].indexOf(home.pref) >= 0 || L.rnd2() < 0.4) && y >= 1886 && y <= 1935 ? 'silk' : 'maid') : (L.rnd2() < 0.5 ? 'kozo' : 'factory');
    L.job = job; L.lastJob = JOB[job] || JOB.hoko;
    L.hoko = { from: y, until: y + dur, home: home, dest: dest, job: job };
    var where = placeLabel(L);
    var txt = y < 1872 ? where + 'の' + (sx === 'm' ? '商家へ丁稚奉公に出た。' : '商家へ女中奉公に出た。') + '年季は' + dur + '年の約束だった' :
      job === 'silk' ? where + 'の製糸工場へ女工として働きに出た。寄宿舎に入り、朝から晩まで繭から糸を繰った' : job === 'kozo' ? where + 'の商店へ小僧として住み込みで働きに出た' : job === 'maid' ? where + 'の家へ住み込みの女中として働きに出た' : where + 'の工場へ働きに出た';
    push(L, rec, '学歴と仕事', txt, br.ev);
  }
  function hokoYear(L, rec) {
    var h = L.hoko, y = L.year, a = L.age, sx = L.sex;
    if (y >= h.until) {
      h.done = true;
      L.queue.push({ title: '年季が明けた', kind: 'hokoEnd', groups: [{ id: 'end', q: '年季が明けた。これからどうする？', options: [{ k: 'home', l: '村に戻る' }, { k: 'stay', l: '町に残る' }] }],
        ev: [ev(L, 'hayami', 1869, '女子の奉公の期間は平均13〜14年。無事に戻って結婚する場合は26〜28歳になっていた（男子は記録がないため同じ幅を目安にした）', '', { est: true, noYearNote: true })] });
      return;
    }
    // 町人の家の男子：丁稚→手代→番頭。のれん分けはごく一部
    if (L.status === 'chonin' && sx === 'm' && y < 1872) {
      if (a === 18 && !h.tedai) { h.tedai = true; push(L, rec, '学歴と仕事', '奉公先で手代になり、帳場や得意先回りを任されるようになった', [ev(L, 'hayami', 1869, '商家の奉公（丁稚→手代→番頭。割合の統計はない）', '', { est: true, noYearNote: true })]); return; }
      if (a === 28 && !h.banto) { h.banto = true; push(L, rec, '学歴と仕事', '番頭になり、店の切り盛りを任された', [ev(L, 'hayami', 1869, '商家の奉公（丁稚→手代→番頭。割合の統計はない）', '', { est: true, noYearNote: true })]); return; }
      if (h.banto && !h.noren && a >= 30 && a <= 36 && L.rnd2() < 0.008) { h.noren = true; h.until = y; L.noren = true; push(L, rec, '学歴と仕事', '長年の働きが認められ、店を分けてもらい、自分の店を持った（のれん分け）', [ev(L, 'hayami', 1869, 'のれん分け（割合の統計はなく、数%の珍しい出来事にとどめた）', '', { est: true, noYearNote: true })]); return; }
    }
    if (L.rnd2() < 0.35) {
      var list = y < 1872 ? (sx === 'm' ? ['盆の藪入りで、久しぶりに家へ帰った', '正月の藪入りに、親へ土産を買って帰った', '使いに走り回り、帳面のつけ方を覚えた', '奉公先で熱を出して寝込み、家のことを思った'] : ['盆の藪入りで、久しぶりに家へ帰った', '台所の仕事と子守りを任されるようになった', '奉公先のおかみさんに裁縫を習った', '奉公先で熱を出して寝込み、家のことを思った']) :
        ['盆と正月に、休みをもらって家へ帰った', '稼いだお金の多くを、家へ送った', '同じ村から来た仲間と、故郷の話をした', '働きすぎて体を壊し、しばらく寝込んだ'];
      push(L, rec, '学歴と仕事', list[Math.floor(L.rnd2() * list.length)], [ev(L, 'hayami', 1869, '奉公先での暮らし', '', { est: true, noYearNote: true })]);
    }
  }
  function resolveHokoEnd(L, rec, br, answers) {
    var w = wantFrom(answers, 'end'), h = L.hoko;
    var stay = L.rnd2() < nudge(0.3, w, 'stay');
    // 奉公先で結婚相手を見つけた人は町に残る
    var met = !L.married && L.rnd2() < 0.15;
    if (stay || met || L.noren) {
      L.job = L.sex === 'm' ? (L.noren ? 'shop' : 'shop') : 'maid';
      push(L, rec, '地域', met ? '年季が明けた。奉公先で知り合った相手と所帯を持つことにし、町に残った' : '年季が明けたが、村には戻らず町に残って働くことにした', br.ev);
      if (met) { L.marryAt = L.age; L.never = false; }
      return;
    }
    L.prov = h.home.prov; L.sub = h.home.sub; L.pref = h.home.pref; L.kind = h.home.kind; L.muni = h.home.muni; L.muniName = h.home.muniName;
    L.job = null;
    if (!L.married) L.marryAt = Math.max(L.marryAt, L.age + Math.floor(L.rnd2() * 2));
    push(L, rec, '地域', '年季が明け、村へ戻った', br.ev);
  }
  function resolveBunke(L, rec, br, answers) {
    var w = wantFrom(answers, 'bunke');
    if (L.rnd2() >= nudge(br.rate, w, 'yes')) { push(L, rec, '家庭', '分家の話はまとまらず、家に残った（部屋住み）', br.ev); return; }
    L.bunke = L.year;
    push(L, rec, '家庭', L.status === 'bushi' ? '藩に願い出て認められ、新しく家を立てた（分家）' : '田畑を分けてもらい、近くに家を建てて分家した', br.ev);
  }
  function resolveMuko(L, rec, br, answers) {
    var w = wantFrom(answers, 'muko');
    if (L.rnd2() >= nudge(br.rate, w, 'yes')) { push(L, rec, '家庭', '婿養子の話を断った', br.ev); L.mukoNo = true; return; }
    var old = L.surname, nw = otherSurname(L);
    L.surnameOld = old; L.surname = nw; L.muko = true; L.mukoY = L.year;
    doMarry(L, rec, false, br.ev);
    L.spouse.mukoWife = true;
    rec.events[rec.events.length - 1].t = nw + '家の婿養子に入り、' + L.spouse.name + 'と結婚した。名字が' + nw + 'に変わった（旧姓 ' + old + '）';
  }
  function resolveYoshi(L, rec, br, answers) {
    var w = wantFrom(answers, 'yoshi');
    if (L.rnd2() >= nudge(br.rate, w, 'yes')) { push(L, rec, '家庭', '養子の話を断り、家に残った（部屋住み）', br.ev); return; }
    var old = L.surname, nw = otherSurname(L);
    L.surnameOld = old; L.surname = nw; L.adopted = true; L.mukoY = L.year; L.toshu = 'adopted';
    push(L, rec, '家庭', nw + '家の養子に入り、家督を継ぐことになった。名字が' + nw + 'に変わった（旧姓 ' + old + '）', br.ev);
  }
  // 名字を添えた名前（婿養子・養子に入った人だけ、旧姓を添える）
  function displayName(L) { return L.surnameOld ? L.surname + L.name + '（旧姓 ' + L.surnameOld + '）' : L.name; }

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
    if (e.notProvs && (e.notProvs.indexOf(L.prov) >= 0 || e.notProvs.indexOf(L.sub) >= 0)) return false;
    if (e.where === 'all' && apart(L, L.year)) return false;
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
        if (!m.alive || m.gone || m.by >= y || L.abroad || fixedYear(L, m)) return;
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
      if (v2 > 0 && L.rnd() < v2) {
        var wk = e.kind === '戦争' || e.kind === '空襲' || e.kind === '原爆' ? 'war' : e.kind === '流行病' || e.kind === '飢饉' ? 'ill' : 'disaster';
        var soldier = e.who && e.who.sex === 'm' && e.kind === '戦争';
        var dst = E.deathStory(L, { kind: wk === 'ill' ? 'disaster' : wk, head: e.deadText.replace(/。$/, ''), withFamily: wk === 'ill' });
        if (soldier) dst.text = dst.text.replace(/。([0-9]+歳だった。)$/, '。家族のもとには、戦死を知らせる紙が届いた。$1');
        dieBy(L, rec, wk, dst.text, evs); return;
      }
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
    // 河原者・非人やえた・ひにんとされた人は、村の祭りに加わることを許されなかった
    if (!s.st && /祭り/.test(s.t) && (L.status === 'outcast' || (L.status === 'buraku' && y < 1946))) return false;
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
  function earnYear(L, rec) {
    var y = L.year, a = L.age;
    if (rec) rec.income = null;
    if (!L.job || L.job === 'home' || L.school || a < 12 || a > 75) return;
    if (y >= FUTURE_FROM) return;
    if (L.sex === 'f' && L.married && L.job !== 'farm' && y < 1985 && L.kids) return;
    var g = L.H.nat.gdp, base = 4500 * (E.val(g, Math.min(y, 2022)) / E.val(g, 1975));
    var ageF = a < 20 ? 0.45 : a < 30 ? 0.75 : a < 50 ? 1.1 : a < 60 ? 1.15 : a < 65 ? 0.7 : 0.4;
    var sexF = L.sex === 'f' ? 0.55 : 1;
    if (L.job === 'farm' || L.job === 'fish') sexF *= 0.75;
    var real = base * ageF * sexF;
    // 物語で就いた仕事は、1975年の働く人の平均（4500）との比で稼ぎを決める（目安）
    if (L.job === 'story' && L.storyPay) real = base * (L.storyPay / 4500) * (a < 20 ? 0.7 : a >= 65 ? 0.6 : 1);
    L.earn.real += real;
    L.earn.years++;
    // その年のお金に直す（1871年の新貨条例で1両＝1円。それより前は両で数える）
    var pr = L.H.price ? E.val(L.H.price, Math.min(y, 2025)) : 1;
    // 1600年より前は銭（貫文）で数える。米1石がおよそ1貫文、江戸時代の1両とほぼ同じ値打ちとみた（推計）
    if (rec) rec.income = { real: real, nominal: real * pr, cur: y < 1600 ? '貫文' : y < 1871 ? '両' : '円', est: true };
  }

  /* 年の終わり・亡くなる */
  function dieBy(L, rec, cause, text, evs) {
    // 引き継いだ人生で、前の人が亡くなった年まで本人は生きていた（記録どおり）
    if (protectedYear(L)) return;
    L.alive = false; L.cause = cause; L.deathYear = L.year; L.deathAge = L.age;
    var e = push(L, rec, '健康', text, evs || []);
    // 授業用の表示で使う短い一行
    if (cause === 'war') e.short = L.age + '歳で、戦争のために亡くなった。';
    else if (cause === 'disaster') e.short = L.age + '歳で、災害に遭って亡くなった。';
  }
  // 1900〜1970年の死因の順位の名前を、亡くなり方の書き方の名前に直す
  var CAUSE_MAP = { '肺炎及び気管支炎': '肺炎', '全結核': '結核', '胃腸炎': '胃腸炎', '脳血管疾患': '脳出血', '老衰': '老衰', 'インフルエンザ': 'インフルエンザ', '悪性新生物': 'がん', '心疾患': '心不全', '不慮の事故': 'その他の事故' };
  function causeOf(L) {
    var H = L.H, y = Math.max(1900, Math.min(1970, Math.floor(L.year / 10) * 10)), a = L.age;
    if (L.year >= 1975) { var cd = E.pickCause(L.C, a, L.sex, L.year, L.rnd, 'ill'); if (cd) return { n: cd.name, cd: cd }; }
    var list = (H.nat.causeRank[y] || H.nat.causeRank[1900] || []).filter(Boolean);
    if (a < 5) return L.year < 1900 && L.rnd() < 0.3 ? { n: '疱瘡・はしか' } : { n: L.rnd() < 0.5 ? '肺炎' : '胃腸炎' };
    if (a >= 80 && L.rnd() < 0.45) return { n: '老衰' };
    if (a < 70) list = list.filter(function (c) { return c.name !== '老衰'; });
    if (a < 45) list = list.filter(function (c) { return c.name !== '脳血管疾患'; });
    var c = pick(L.rnd, list, function (x) { return (x.rate || 1) * (a < 45 && x.name === '全結核' ? 3 : 1); });
    return c ? { n: CAUSE_MAP[c.name] || c.name, rank: c.name } : { n: 'その他の病気' };
  }
  function finishYear(L, rec) {
    finishYear0(L, rec);
    E.moneyYear(L, rec);
    E.statusYear(L, rec);
  }
  function finishYear0(L, rec) {
    if (!L.alive) { L.log.push(rec); return; }
    var y = L.year, a = L.age;
    if (a >= 5) L.stats.to5 = true;
    if (a >= 60) L.stats.to60 = true;
    var q = clamp(dp(L, L.sex, a, y) * E.bodyMult(L, a), 0, 1);
    if (protectedYear(L)) q = 0;
    if (a > 0 && L.rnd() < q || a >= 110) {
      var c = causeOf(L);
      var st = E.deathStory(L, { kind: 'ill', cause: c.n });
      if (L.abroad) st.text = st.text.replace(/(自宅|家|病院|診療所)で亡くなった/, '移り住んだ' + L.abroad + 'の地で亡くなった');
      L.causeName = c.n;
      dieBy(L, rec, 'ill', st.text, [ev(L, y < 1975 ? 'ipss' : 'lifetable', y, a + '歳の人が1年のうちに亡くなる確率（平均寿命と乳児死亡率から推計）', (q * 100).toFixed(2) + '%', { est: y < 1975 }),
        c.cd ? ev(L, 'vital', c.cd.years[c.cd.years.length - 1], 'この年齢の死因のうち「' + c.n + '」の割合（' + c.cd.years[0] + '〜' + c.cd.years[c.cd.years.length - 1] + '年の死亡数から）', pct(c.cd.share)) :
        ev(L, 'ipss', y < 1900 ? 1900 : Math.min(1970, Math.floor(y / 10) * 10), '死因の順位（' + (y < 1900 ? '1900年より前は1900年の順位を使用' : 'その年代') + '）', c.rank || c.n, { est: y < 1900 })].concat(st.evs));
      L.log.push(rec);
      return;
    }
    if (a === 0 && q > 0 && L.rnd() < q) {
      var c0 = y >= 1975 ? (E.pickCause(L.C, 0, L.sex, y, L.rnd, 'ill') || { name: 'その他の病気' }).name : (L.rnd() < 0.5 ? '肺炎' : '胃腸炎');
      dieBy(L, rec, 'ill', E.deathStory(L, { kind: 'ill', cause: c0 }).text, [ev(L, 'ipss', near(L.H.mort.q0, y), '0歳で亡くなる確率（乳児死亡率。1899年以前は江戸時代の研究の目安から推計）', (q * 100).toFixed(1) + '%', { est: y < 1900 })]);
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
      if (br.kind === 'ask') E.answerAsk(L, br, answers);
      else if (br.kind === 'path') resolvePath(L, rec, br, answers);
      else if (br.kind === 'out') resolveOut(L, rec, br, answers);
      else if (br.kind === 'marry') resolveMarry(L, rec, br, answers);
      else if (br.kind === 'hoko') resolveHoko(L, rec, br, answers);
      else if (br.kind === 'hokoEnd') resolveHokoEnd(L, rec, br, answers);
      else if (br.kind === 'bunke') resolveBunke(L, rec, br, answers);
      else if (br.kind === 'muko') resolveMuko(L, rec, br, answers);
      else if (br.kind === 'yoshi') resolveYoshi(L, rec, br, answers);
      else if (br.id === 'story') { var SM = E.storyMod(); if (SM) SM.resolve(L, rec, br, answers, STORY_API); }
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
      E.satAdd(r, L);
    }
    E.satDone(r);
    r.earns.sort(function (p, q) { return p - q; });
    r.earnMedian = (r.earns[Math.floor((n - 1) / 2)] + r.earns[Math.ceil((n - 1) / 2)]) / 2;
    r.items = [['5歳まで生きた人', r.to5], [L0.by < 1700 ? '寺や家で字を習った人' : L0.by < 1873 ? '寺子屋や学校で字を習った人' : '学校に通った人', r.school], ['60歳まで生きた人', r.to60]];
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

  // 共有用の画像に出す「この年この所で生まれた割合」
  function birthShare(L) {
    var H = L.H, y = L.by;
    if (y < 1873) {
      var tot = 0;
      topProvs(H).forEach(function (n) { if (H.prov[n].w) tot += lin(H.prov[n].w, y); });
      return { share: lin(H.prov[L.prov].w, y) / tot, where: H.prov[L.prov].kuni };
    }
    return { share: lin(prefSeries(H, L.pref), y), where: H.prefNames[L.pref] };
  }
  return {
    houseOf: houseOf, heirCandidates: heirCandidates, childCandidates: childCandidates, childHouse: childHouse, heirOf: heirOf, displayName: displayName, heirlessRates: heirlessRates,
    eraLabel: eraLabel, pickBirth: pickBirth, newLife: newLife, step: step, resolve: resolve, autoRun: autoRun,
    cohort: cohort, majorTimeline: majorTimeline, familyList: familyList, endText: endText, placeLabel: placeLabel, deathProb: dp, birthShare: birthShare
  };
});
