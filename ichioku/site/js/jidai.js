/* 1000分の1 「この時代の日本」の数字の表（v18 指示書 ui-spec2 の 2-5）
   今あるデータ（history.json・common.json・県のデータ）にある数字だけを使い、新しく数字を作らない。推計の数字には「推計」と付ける。
   その年に数字がない項目は、行ごと出さない。 rows(ctx, L, year) → { title, rows: [{ k, v, est, src }], srcs: [出典の文] } */
(function (root) {
  'use strict';
  function keysOf(s) { return Object.keys(s).map(Number).sort(function (a, b) { return a - b; }); }
  function inR(s, y, pad) { var ks = keysOf(s); return ks.length && y >= ks[0] && y <= ks[ks.length - 1] + (pad || 0); }
  function lin(s, y) {
    var ks = keysOf(s);
    if (y <= ks[0]) return s[ks[0]];
    for (var i = 1; i < ks.length; i++) if (y <= ks[i]) { var a = ks[i - 1], b = ks[i]; return s[a] + (s[b] - s[a]) * (y - a) / (b - a); }
    return s[ks[ks.length - 1]];
  }
  function comma(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function man(n) { // 人数を「約660万人」「約1億2,600万人」に
    var m = Math.round(n / 1e4);
    if (m >= 10000) { var o = Math.floor(m / 10000), r = Math.round((m - o * 10000) / 100) * 100; return '約' + o + '億' + (r ? comma(r) + '万' : '') + '人'; }
    if (m >= 100) return '約' + comma(Math.round(m / 10) * 10) + '万人';
    if (m >= 1) return '約' + m + '万人';
    return '約' + comma(n) + '人';
  }
  function pct(v, d) { var p = v * 100; return (p >= 10 || d === 0 ? Math.round(p) : Math.round(p * 10) / 10) + '%'; }
  // 政をする所（年号と同じく、年で決まる呼び名）
  var GOV = [[1000, '朝廷（摂関の政治）'], [1086, '朝廷（院政）'], [1185, '朝廷と鎌倉幕府'], [1333, '朝廷（建武の新政）'], [1336, '室町幕府'], [1573, '織田・豊臣の政権'], [1603, '江戸幕府'], [1868, '明治政府'], [1890, '帝国議会と内閣（大日本帝国憲法）'], [1947, '国会と内閣（日本国憲法）']];
  function govOf(y) { var g = GOV[0][1]; GOV.forEach(function (x) { if (y >= x[0]) g = x[1]; }); return g; }
  function eraOf(H, y) { var e = null; (H.eras || []).forEach(function (x) { if (x[0] <= y) e = x[1]; }); return e; }
  var ST_WORD = { kuge: '公家', bushi: '武士', priest: '僧・神職', hyakusho: '百姓', chonin: '町人', outcast: '被差別身分とされた人々' };

  // ctx = { C, H, E, O, P（県のデータ）}
  function rows(ctx, L, year) {
    var C = ctx.C, H = ctx.H, E = ctx.E, O = ctx.O, out = [], used = {};
    function add(k, v, est, src) { if (v == null || v === '' || (typeof v === 'number' && !isFinite(v))) return; out.push({ k: k, v: v, est: !!est, src: src || null }); if (src) used[src] = 1; }
    var y = year, old = y < 1975, prov = L && L.old ? (L.home0 || {}).prov || L.prov : null, pref = L ? String(L.old ? (L.home0 || {}).pref || L.pref : L.home.pref) : null;
    var place = L && L.old && y < 1872 && H && H.prov[prov] ? H.prov[prov].kuni : (C.prefs.filter(function (p) { return p.code === pref; })[0] || {}).name || '';
    // 人口
    if (H && H.nat && H.nat.popNat && y < 2021) add('日本の人口', man(lin(H.nat.popNat.pop, y)), y < 1873, H.nat.popNat.src[keysOf(H.nat.popNat.pop).reduce(function (a, b) { return Math.abs(b - y) < Math.abs(a - y) ? b : a; })]);
    if (H && prov && H.prov[prov] && H.prov[prov].w && y < 1874) add(H.prov[prov].kuni + 'の人口の目安', man(lin(H.prov[prov].w, y)), true, 'kito');
    // 平均寿命と5歳までに亡くなる割合
    if (H && H.nat.e0 && y < 1975) add('平均寿命（男・女）', Math.round(lin(H.nat.e0.m, y)) + '歳・' + Math.round(lin(H.nat.e0.f, y)) + '歳', y < 1891, y < 1865 ? (y < 1600 ? 'bones' : 'edoLife') : 'owid');
    var dpf = function (sex, a, yy) { return yy >= 1975 ? E.deathProb(C, ctx.P, sex, a, yy) : O.deathProb({ C: C, H: H, pref: pref, kind: 'town', P: ctx.P }, sex, a, yy); };
    var l5 = 1; for (var a = 0; a < 5; a++) l5 *= 1 - (dpf('m', a, y + a) + dpf('f', a, y + a)) / 2;
    if (y >= 1975) { var e0 = function (sex) { var l = 1, s0 = 0; for (var k = 0; k < 110; k++) { l *= 1 - dpf(sex, k, y); s0 += l; } return s0 + 0.5; }; add('平均寿命（男・女。その年の生命表から）', e0('m').toFixed(1) + '歳・' + e0('f').toFixed(1) + '歳', false, 'lifetable'); }
    add('5歳までに亡くなる割合', pct(1 - l5), y < 1899, y < 1865 ? 'edoLife' : y < 1975 ? 'owid' : 'lifetable');
    if (y >= 1872) add('1歳を迎えられない子の割合', pct((dpf('m', 0, y) + dpf('f', 0, y)) / 2), y < 1899, y < 1975 ? 'owid' : 'vital');
    // 町に住む人・身分
    if (H && H.urban && inR(H.urban, y)) add('町に住む人の割合', pct(lin(H.urban, y), 0), y < 1920, 'census');
    if (H && prov && H.prov[prov] && H.prov[prov].status && y >= 1600 && y < 1872) {
      var s = H.prov[prov].status, ks = Object.keys(s).filter(function (k) { return s[k] >= 0.01 && ST_WORD[k]; }).sort(function (a, b) { return s[b] - s[a]; });
      add('身分の割合（' + H.prov[prov].kuni + '）', ks.map(function (k) { return ST_WORD[k] + ' ' + pct(s[k], 0); }).join('・'), true, 'jinshin');
    }
    // 学び
    if (H && H.nat.terakoya && y >= 1700 && y < 1873) add('字を習う子の割合（町の男の子・村の男の子）', pct(H.nat.terakoya.m.town, 0) + '・' + pct(H.nat.terakoya.m.village, 0), true, 'terakoya');
    if (H && H.nat.elem && inR(H.nat.elem.m, y) && y < 1975) add('小学校に通う子の割合（男・女）', pct(lin(H.nat.elem.m, y), 0) + '・' + pct(lin(H.nat.elem.f, y), 0), false, 'gakusei');
    if (H && H.nat.hs && inR(H.nat.hs.m, y) && y >= 1948 && y < 1975) add('高校へ進む人の割合（男・女）', pct(lin(H.nat.hs.m, y), 0) + '・' + pct(lin(H.nat.hs.f, y), 0), false, 'school');
    if (H && H.nat.marriage && inR(H.nat.marriage.m, y) && y >= 1872 && y < 1975) add('はじめて結婚する年齢の平均（男・女）', lin(H.nat.marriage.m, y).toFixed(1) + '歳・' + lin(H.nat.marriage.f, y).toFixed(1) + '歳', y < 1899, 'ipss');
    if (H && H.nat.causeRank && y >= 1900 && y < 1975) { var cr = null; keysOf(H.nat.causeRank).forEach(function (k) { if (k <= y) cr = H.nat.causeRank[k]; }); if (cr) add('主な死因', cr.slice(0, 3).map(function (x) { return x.name; }).join('・'), false, 'vital'); }
    if (H && H.nat.gdp && y < 1975) add('1人あたりの国内総生産（1990年の国際ドル）', comma(lin(H.nat.gdp, y)) + 'ドル', true, 'maddison');
    // 1975年から：県のデータ
    if (!old && ctx.P && ctx.P.s) {
      var S = ctx.P.s, pn = ctx.P.name || place;
      var pb = (C.prefs.filter(function (p) { return p.code === pref; })[0] || {}).births;
      if (pb && pb[y] != null) add(pn + 'の出生数', comma(pb[y]) + '人', false, 'vital');
      if (S.jobs && S.jobs[y] != null) add(pn + 'の有効求人倍率', S.jobs[y].toFixed(2) + '倍', false, 'jobs');
      if (S.hs && S.hs[y] != null) add(pn + 'の高校進学率', pct(S.hs[y]), false, 'school');
      if (S.univ && S.univ[y] != null) add(pn + 'の大学・短大進学率', pct(S.univ[y] + (S.jc && S.jc[y] || 0)), false, 'school');
      if (C.nat && C.nat.unemp && C.nat.unemp[y] != null) add('完全失業率（全国）', C.nat.unemp[y] + '%', false, 'labor');
      (C.goods || []).forEach(function (g) { if (g.diff && g.diff[y] != null && g.diff[y] >= 5 && g.diff[y] <= 95 && out.length < 16) add(g.name + 'のある家の割合', Math.round(g.diff[y]) + '%', false, g.src); });
    }
    var era = eraOf(H || {}, y);
    if (era) add('年号', era, false, 'gengo');
    add('政をする所', govOf(y), false, null);
    var srcs = Object.keys(used).map(function (k) { var s = (H && H.sources && H.sources[k]) || (C.sources && C.sources[k]); return s ? s.name + '（' + s.org + '）' : null; }).filter(Boolean);
    return { title: y + '年の' + (y < 1872 && place ? 'このころの日本と' + place : '日本' + (old ? '' : 'と' + place)), rows: out, srcs: srcs };
  }
  // 記録の上の一行：その年に生まれた子の数（出典のある年だけ）
  function birthLine(ctx, L, year) {
    var C = ctx.C, pref = L ? String(L.old ? (L.home0 || {}).pref || L.pref : L.home.pref) : null, tot = 0, mine = null, all = true;
    (C.prefs || []).forEach(function (p) { var v = p.births && p.births[year]; if (v == null) all = false; else { tot += v; if (p.code === pref) mine = v; } });
    if (!all || !tot || mine == null) return null;
    var pn = (C.prefs.filter(function (p) { return p.code === pref; })[0] || {}).name;
    return year + '年、日本では約' + comma(Math.round(tot / 1e4)) + '万人の子が生まれました。' + pn + 'に生まれたのは、そのうち約' + comma(Math.round(mine / 100) * 100) + '人です（人口動態統計）。';
  }
  var API = { rows: rows, birthLine: birthLine, govOf: govOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.IchiokuJidai = API;
})(typeof self !== 'undefined' ? self : this);
