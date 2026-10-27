/* 1000分の1 主人公とあなたのつながり（v17 指示書 tsunagari-spec1）
   1 あなたとのつながり：代の数（1代27年）・計算上の先祖の数（2の代の数乗）・その年の日本の人口の目安（history.json の nat.popNat。出典つき）
   2 この家をあなたまでたどる：主人公の子から1代ずつ、家の記録（名字・格・家宝・家訓）を受け継いで下り、あなたの生まれ年と都道府県で生まれる子で終える
   3 今に残るもの：旧国ごとの表（一宮・国分寺の跡・街道・祭り。出典つき）から引けるものだけを出す
   遊ぶ人の生まれ年と都道府県は、この端末にだけ保存したものを使い、外に送らない。 */
(function (root) {
  'use strict';
  var GEN = 27;
  function keysOf(s) { return Object.keys(s).map(Number).sort(function (a, b) { return a - b; }); }
  function lin(s, y) {
    var ks = keysOf(s);
    if (y <= ks[0]) return s[ks[0]];
    for (var i = 1; i < ks.length; i++) if (y <= ks[i]) { var a = ks[i - 1], b = ks[i]; return s[a] + (s[b] - s[a]) * (y - a) / (b - a); }
    return s[ks[ks.length - 1]];
  }
  function comma(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  // 大きな数を「1,370億」の形に（上から3けた）
  function big(n) {
    var U = [[1e16, '京'], [1e12, '兆'], [1e8, '億'], [1e4, '万']];
    for (var i = 0; i < U.length; i++) if (n >= U[i][0]) {
      var v = n / U[i][0];
      return (v >= 1000 ? comma(Math.round(v / 10) * 10) : v >= 100 ? comma(Math.round(v)) : v >= 10 ? String(Math.round(v * 10) / 10) : String(Math.round(v * 100) / 100)) + U[i][1];
    }
    return comma(Math.round(n));
  }
  // 人口は10万人の位で丸める（1億をこえたら「1億2,600万」）
  function popWord(n) {
    var m = Math.round(n / 1e5) / 10; // 百万の位まで（万の単位で表す数）
    var man = Math.round(n / 1e5) * 10;
    if (man >= 10000) { var oku = Math.floor(man / 10000), rest = man - oku * 10000; return oku + '億' + (rest ? comma(rest) + '万' : ''); }
    return comma(man) + '万';
  }
  var SRC_WORD = { kito: '鬼頭宏の推計', farris: 'W.W.ファリスの推計', census: '国の人口の統計' };
  // その年の日本の人口の目安。出典は近い方の年の推計
  function popAt(H, y) {
    var pn = H && H.nat && H.nat.popNat;
    if (!pn) return null;
    var ks = keysOf(pn.pop), near = ks[0];
    ks.forEach(function (k) { if (Math.abs(k - y) < Math.abs(near - y)) near = k; });
    return { v: lin(pn.pop, y), src: pn.src[near], srcWord: SRC_WORD[pn.src[near]] || '' };
  }
  function gens(by, meBy) { return Math.max(1, Math.round((meBy - by) / GEN)); }
  function kidsOf(L) { return (L.members || []).filter(function (m) { return m.role === '子' && m.by != null && m.by <= L.deathYear; }); }
  function kuniOf(L) {
    if (!L.old) return L.home && L.home.prefName || '';
    var p = (L.home0 || {}).prov || L.prov, o = L.H && L.H.prov[p];
    return o ? o.kuni : '';
  }
  function placeWord(L) {
    if (!L.old) return (L.home.prefName || '') + (L.home.muniName || '');
    if (L.by >= 1873 && L.H && L.H.prefNames) return L.H.prefNames[String((L.home0 || {}).pref || L.pref)] || kuniOf(L);
    var k = (L.home0 || {}).kind || L.kind;
    return kuniOf(L) + (k === 'town' || k === 'city' ? 'の町' : 'の村');
  }
  // 1 あなたとのつながり。me = { y, pref }（入れていなければ null）。nowY は今年
  // 返す形：{ kind: 'near'|'parent'|'anc'|'none', gens, anc, pop, lines: [...], close, guide }
  function connect(H, L, me, nowY) {
    var hasKids = kidsOf(L).length > 0, town = /town|city/.test((L.home0 || {}).kind || L.kind || '');
    var py = me && me.y ? +me.y : null, d = (py || nowY) - L.by;
    var out = { kind: 'anc', lines: [], close: '', guide: !py };
    if (py && d < 15) { out.kind = 'near'; out.close = 'あなたと同じ時代を、' + (L.old ? kuniOf(L) : L.home.prefName || '') + 'で生きた人です。'; return out; }
    if (d <= 60) { out.kind = 'parent'; out.close = py ? 'あなたの親や祖父母と同じ世代の人です。' : '今を生きる人の親や祖父母と同じ世代の人です。'; return out; }
    var g = gens(L.by, py || nowY), anc = Math.pow(2, g), pop = popAt(H, L.by), many = pop && anc >= pop.v;
    out.gens = g; out.anc = anc; out.pop = pop;
    var who = py ? 'あなた' : '今の日本に住む人';
    out.lines.push((py ? 'あなたまで約' : '今年まで約') + g + '代');
    out.lines.push(g + '代さかのぼると、' + (py ? 'あなたの' : '一人の人の') + '先祖の数は計算上およそ' + big(anc) + '人になります。');
    if (pop) out.lines.push(Math.round(L.by / 10) * 10 + '年ごろの日本の人口は、およそ' + popWord(pop.v) + '人と考えられています（' + pop.srcWord + '）。');
    if (!py) out.close = hasKids ? (many ? '今の日本に住む人の多くにとって、先祖の一人であった見こみが高い人です。' : '今の日本に住む人の中に、この人の子孫がいる見こみのある人です。')
      : 'この人自身は子を残しませんでした。それでも、ともに暮らしたきょうだいや' + (town ? '町' : '村') + 'の人の中に、' + (many ? '今の日本に住む人の多くの先祖がいた見こみは高いです。' : '今の日本に住む人の先祖がいたかもしれません。');
    else if (hasKids) out.close = many ? 'この人は、あなたの先祖の一人であった見こみが高い人です。' : '先祖の数がまだ当時の人口より少ないので、この人があなたの先祖の一人であった見こみは、高いとまでは言えません。それでも、先祖の一人であった見こみはある人です。';
    else out.close = 'この人自身は子を残しませんでした。それでも、ともに暮らしたきょうだいや' + (town ? '町' : '村') + 'の人の中に、あなたの先祖がいた見こみは' + (many ? '高いです。' : 'あります。');
    out.many = many;
    return out;
  }
  var EXPLAIN = '親は2人、祖父母は4人、曽祖父母は8人と、系図の上の先祖の数は1代さかのぼるごとに倍になります。30代あまりさかのぼると計算上は百億人をこえ、当時の日本の人口をはるかに上回ります。実際には同じ人が何度も系図に出てくるので、先祖の多くは重なっていて、子孫を今に残した昔の人は、今の日本に住む多くの人にとって系図の上の先祖の一人であった見こみが高くなります。ただし、系図の上の先祖であっても、その人から体の中に受け継いだもの（遺伝子）があるとは限りません。代をさかのぼるほど、一人の先祖から受け継ぐ分は小さくなり、まったく受け継いでいない先祖も多くいます。';

  // 4 同じ年齢のあなた：この年の主人公の出来事から2つまで
  function sameAgeRow(L, r, me, nowY, pol) {
    if (!me || !me.y) return null;
    var a = nowY - (+me.y);
    if (a < 0 || r.age !== a) return null;
    var evs = (r.events || []).filter(function (e) { return e.cat !== '時代' && e.t; }).slice(0, 2).map(function (e) { return pol(String(e.t).split('。')[0] + '。'); });
    return 'この人は今、あなたと同じ' + a + '歳です。' + (evs.length ? 'この年、' + evs.join('') : 'この年は、大きな出来事のない一年でした。');
  }
  // 主人公があなたの今の年齢まで生きられなかったとき（最期の画面）。K は compare.js
  function shortLived(C, H, L, me, nowY, K) {
    if (!me || !me.y || !K) return null;
    var a = nowY - (+me.y);
    if (a <= 0 || L.deathAge >= a) return null;
    var s = K.surv(C, H, L.by, L.sex, a);
    return 'あなたの今の年齢、' + a + '歳まで、この人は生きられませんでした。同じ年に生まれた人のうち、' + a + '歳まで生きたのは' + (s * 100 >= 99.5 || (s > 0 && s < 0.005) ? '約' + (s * 100).toFixed(1) + '%' : '約' + Math.round(s * 100) + '%') + 'です。';
  }

  /* ---------- 2 この家をあなたまでたどる ---------- */
  // ctx = { C, H, E, O, S, P: function (prefCode) { 県のデータ }, pol }
  function playAuto(ctx, L) {
    var M = L.old ? ctx.O : ctx.E, g = 0;
    while (L.alive && g++ < 130) {
      var r = M.step(L);
      while (r && r.branch) r = M.resolve(L, r.branch.ask ? { text: '' } : null);
    }
    return L;
  }
  // 1代の人を作る（遊び直しでも同じ形で作る）。p = { by, seed, pref, prov, sub, rec, name, sex }
  function makeGen(ctx, p) {
    var L;
    if (p.by >= 1975) L = ctx.E.newLife(ctx.C, ctx.P(p.pref), { year: p.by, seed: p.seed });
    else L = ctx.O.newLife(ctx.C, ctx.H, ctx.P(p.pref), { year: p.by, seed: p.seed, birth: { prov: p.prov, sub: p.sub || null, pref: p.pref, kuge: p.rec.status === 'kuge' && p.by <= 1946 } });
    ctx.S.applyDescend(L, p.rec);
    if (p.name) L.name = p.name;
    if (p.sex) L.sex = p.sex;
    L.traceGen = p.k;
    L.traceP = p;
    return L;
  }
  // 遊ぶ人の都道府県に入る旧国を選ぶ（人の多い国ほど選ばれやすい）
  function provIn(H, pref, rnd) {
    var c = Object.keys(H.prov).filter(function (n) { var o = H.prov[n]; return !o.subs && o.prefs && o.prefs[pref]; });
    if (!c.length) return { prov: null, sub: null };
    var tot = 0; c.forEach(function (n) { tot += (H.prov[n].pop1873 || 1) * H.prov[n].prefs[pref]; });
    var x = rnd() * tot, k = c[0];
    for (var i = 0; i < c.length; i++) { x -= (H.prov[c[i]].pop1873 || 1) * H.prov[c[i]].prefs[pref]; if (x <= 0) { k = c[i]; break; } }
    return H.prov[k].parent ? { prov: H.prov[k].parent, sub: k } : { prov: k, sub: null };
  }
  // 時代に合う、移り住む理由
  function moveWhy(y, sex, rnd) {
    var c = y < 1600 ? ['奉公に出た先で縁づいて', sex === 'f' ? '嫁入りして' : '婿入りして']
      : y < 1868 ? ['新田への入植で', '奉公に出た先で縁づいて', sex === 'f' ? '嫁入りして' : '婿入りして']
      : y < 1920 ? ['明治の出稼ぎに出た先で根づいて', '鉄道の仕事で', sex === 'f' ? '嫁入りして' : '婿入りして']
      : y < 1946 ? ['工場勤めで', '出稼ぎに出た先で根づいて', sex === 'f' ? '嫁入りして' : '婿入りして']
      : y < 1975 ? ['集団就職で', '工場勤めで', '結婚して']
      : ['転勤で', '仕事を変えて', '結婚して'];
    return c[Math.floor(rnd() * c.length)];
  }
  /* ---------- v19 10：子孫へ続けるほど、あなたの生まれ年と都道府県に近づける ---------- */
  // 都道府県庁のおおよその緯度・経度と、陸で接する都道府県（北海道と青森、鹿児島と沖縄は海をはさんだ隣とみる）
  var PREF_LL = { '01': [43.06, 141.35], '02': [40.82, 140.74], '03': [39.70, 141.15], '04': [38.27, 140.87], '05': [39.72, 140.10], '06': [38.24, 140.36], '07': [37.75, 140.47], '08': [36.34, 140.45], '09': [36.57, 139.88], '10': [36.39, 139.06], '11': [35.86, 139.65], '12': [35.61, 140.12], '13': [35.69, 139.69], '14': [35.45, 139.64], '15': [37.90, 139.02], '16': [36.70, 137.21], '17': [36.59, 136.63], '18': [36.07, 136.22], '19': [35.66, 138.57], '20': [36.65, 138.18], '21': [35.39, 136.72], '22': [34.98, 138.38], '23': [35.18, 136.91], '24': [34.73, 136.51], '25': [35.00, 135.87], '26': [35.02, 135.76], '27': [34.69, 135.52], '28': [34.69, 135.18], '29': [34.69, 135.83], '30': [34.23, 135.17], '31': [35.50, 134.24], '32': [35.47, 133.05], '33': [34.66, 133.93], '34': [34.40, 132.46], '35': [34.19, 131.47], '36': [34.07, 134.56], '37': [34.34, 134.04], '38': [33.84, 132.77], '39': [33.56, 133.53], '40': [33.61, 130.42], '41': [33.25, 130.30], '42': [32.74, 129.87], '43': [32.79, 130.74], '44': [33.24, 131.61], '45': [31.91, 131.42], '46': [31.56, 130.56], '47': [26.21, 127.68] };
  var ADJ = { '01': '02', '02': '01 03 05', '03': '02 04 05', '04': '03 05 06 07', '05': '02 03 04 06', '06': '04 05 07 15', '07': '04 06 08 09 10 15', '08': '07 09 11 12', '09': '07 08 10 11', '10': '07 09 11 15 20', '11': '08 09 10 12 13 19 20', '12': '08 11 13', '13': '11 12 14 19', '14': '13 19 22', '15': '06 07 10 16 20', '16': '15 17 20 21', '17': '16 18 21', '18': '17 21 25 26', '19': '11 13 14 20 22', '20': '10 11 15 16 19 21 22 23', '21': '16 17 18 20 23 24 25', '22': '14 19 20 23', '23': '20 21 22 24', '24': '21 23 25 26 29 30', '25': '18 21 24 26', '26': '18 24 25 27 28 29', '27': '26 28 29 30', '28': '26 27 31 33', '29': '24 26 27 30', '30': '24 27 29', '31': '28 32 33 34', '32': '31 34 35', '33': '28 31 34', '34': '31 32 33 35', '35': '32 34 40', '36': '37 38 39', '37': '36 38', '38': '36 37 39', '39': '36 38', '40': '35 41 43 44', '41': '40 42', '42': '41', '43': '40 44 45 46', '44': '40 43 45', '45': '43 44 46', '46': '43 45 47', '47': '46' };
  function pc(x) { x = String(x); return x.length === 1 ? '0' + x : x; }
  function kmPref(a, b) {
    var p = PREF_LL[pc(a)], q = PREF_LL[pc(b)];
    if (!p || !q || pc(a) === pc(b)) return 0;
    var R = 6371, t = Math.PI / 180, dLa = (q[0] - p[0]) * t, dLo = (q[1] - p[1]) * t;
    var h = Math.sin(dLa / 2) * Math.sin(dLa / 2) + Math.cos(p[0] * t) * Math.cos(q[0] * t) * Math.sin(dLo / 2) * Math.sin(dLo / 2);
    return Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(h))));
  }
  function nearMe(pref, mePref) { pref = pc(pref); mePref = pc(mePref); return pref === mePref || (ADJ[mePref] || '').split(' ').indexOf(pref) >= 0; }
  // あなたまでの代の数（1代は16〜45年）
  function gensTo(by, meY) { var n = Math.max(1, Math.round((meY - by) / GEN)); while (n > 1 && (meY - by) / n < 16) n--; while ((meY - by) / n > 45) n++; return n; }
  // gN 代あとの子孫の生まれ年。あなたの生まれ年にちょうど届くように、あなたまでの年を代の数で等しく分ける。
  // 亡くなった年より後に生まれる代のうち、gN 代あと以上でいちばん近い代を選ぶ（あなたの代そのものは「たどる」で出す）
  function descPlan(L, gN, me) {
    if (!me || !me.y || !me.pref || !L || L.deathYear == null || me.y <= L.by + 32) return null;
    var n = gensTo(L.by, me.y);
    for (var g = gN; g < n; g++) {
      var by = L.by + Math.round((me.y - L.by) * g / n);
      if (by <= L.deathYear) continue;
      if (by > 2000) return null;
      return { gap: by - L.deathYear, by: by, me: true, g: g, toGo: n - g, years: me.y - by };
    }
    return null;
  }
  // 子孫の住む都道府県：代を重ねるほど、あなたの都道府県へ寄せる。あなたの生まれ年の100年前より後は、あなたの都道府県か隣
  function drift(H, from, by, me, k, rnd) {
    from = pc(from); var to = pc(me.pref), d0 = kmPref(from, to);
    if (from === to) return null;
    var pick = null;
    if (by >= me.y - 100) {
      var adj = (ADJ[to] || '').split(' ').filter(Boolean);
      pick = rnd() < 0.6 || !adj.length ? to : adj[Math.floor(rnd() * adj.length)];
      if (nearMe(from, to) && rnd() < 0.5) return null;
    } else {
      // 寄せる強さ：あなたまでの残りの代が少ないほど強く（k = 0〜1）
      if (rnd() > 0.35 + 0.6 * k) return null;
      var goal = d0 * (1 - Math.min(0.9, 0.3 + 0.6 * k));
      var c = Object.keys(PREF_LL).filter(function (p) { return p !== from && kmPref(p, to) <= Math.max(goal, 1) + 60 && kmPref(p, to) < d0; });
      if (!c.length) return null;
      c.sort(function (a, b) { return Math.abs(kmPref(a, to) - goal) - Math.abs(kmPref(b, to) - goal); });
      pick = c[Math.floor(rnd() * Math.min(3, c.length))];
    }
    if (!pick || pick === from) return null;
    var pv = by < 1872 && H ? provIn(H, pick, rnd) : { prov: null, sub: null };
    if (by < 1872 && !pv.prov) return null;
    return { pref: pick, prov: pv.prov, sub: pv.sub };
  }
  // この代の大きな出来事（history.json の出来事から、その人の土地と年に合うもの1つ）
  function bigEvent(ctx, L, used) {
    used = used || {};
    var H = ctx.H, y0 = L.by, y1 = Math.min(L.deathYear, 2024), prov = (L.home0 || {}).prov || L.prov, pref = String(L.old ? (L.home0 || {}).pref || L.pref : L.home.pref), best = null;
    (H.events || []).forEach(function (e) {
      if (e.y[1] < y0 || e.y[0] > y1 || used[e.title] || /足軽|政府軍|東北の外/.test(e.title)) return;
      var ks = {}; Object.keys(e.rates || {}).forEach(function (yy) { Object.keys(e.rates[yy]).forEach(function (k) { ks[k] = 1; }); });
      var local = ks[prov] || ks[pref] || (e.where === 'city' && ks.all && L.home && (L.home.kind === 'city'));
      var all = e.where === 'all' || (e.where === 'pref' && ks.all);
      if (!local && !all) return;
      var sc = (local ? 2 : 1);
      if (!best || sc > best.sc) best = { sc: sc, y: Math.max(e.y[0], y0), t: e.title };
    });
    if (!best) (H.timeline || []).forEach(function (r) {
      if (best || r.y < y0 || r.y > y1 || used[r.t] || ['戦争', '災害'].indexOf(r.type) < 0) return;
      if ((r.provs || r.prefs) && !(r.provs && r.provs.indexOf(prov) >= 0) && !(r.prefs && r.prefs.indexOf(pref) >= 0)) return;
      best = { y: r.y, t: r.t, long: true };
    });
    if (!best && y1 >= 1975 && ctx.E.majorTimeline) { var m = ctx.E.majorTimeline(ctx.C, Math.max(1975, y0), y1, pref).filter(function (r) { return /災害|戦争|景気/.test(r.type); })[0]; if (m) best = { y: m.y, t: m.t, noun: true }; }
    if (!best && y1 >= 1975 && ctx.E.majorTimeline) { var m2 = ctx.E.majorTimeline(ctx.C, Math.max(1975, y0), y1, pref).filter(function (r) { return !used[r.t]; })[0]; if (m2) best = { y: m2.y, t: m2.t, noun: true }; }
    if (!best) return '';
    used[best.t] = 1;
    var t = String(best.t).replace(/。.*$/, ''), paren = '';
    var pm = t.match(/（[^）]*）$/); if (pm) { paren = pm[0]; t = t.slice(0, -paren.length); }
    if (!best.long || best.noun || !/[たるいだ]$/.test(t)) t += 'があった';
    var pt = ctx.pol(best.y + '年、' + t + '。');
    return paren ? pt.replace(/。$/, paren + '。') : pt;
  }
  // 1代の一生のあらまし（3〜5行）
  var MILE = /結婚|継い|継ぎ|奉公|商い|勤め|役に|役を|移り住|出家|学問|弟子|職人|店を|家督|婿|嫁|名主|庄屋|兵|戦|普請|開い|建て|選ばれ|任され|働き|工場|会社/;
  function genLines(ctx, L, note, used) {
    var pol = ctx.pol, out = [];
    var nm = ctx.O.displayName && L.old ? ctx.O.displayName(L) : (L.surname ? L.surname + ' ' : '') + L.name;
    out.push(pol(L.by + '年、' + placeWord(L) + 'で、' + String(nm).replace(/（.*?）/g, '') + 'として生まれた。'));
    // その人の一生の節目の文を1つ（前の文がなくても分かるもの）
    var ev = null, best = -1;
    L.log.forEach(function (r) { r.events.forEach(function (e) {
      if (r.age < 12 || e.cat === '時代' || !e.t) return;
      var t = String(e.t).split('。')[0];
      if (t.length < 14 || t.length > 60 || /亡くな|生まれ|「|^(それ|でも|けれど|しかし|ただ|返事|想い|甘さ|親に知られ)|気のせい/.test(t) || /も同じ気持ち/.test(t)) return;
      var sc = (MILE.test(t) ? 3 : 0) + (e.story ? 1 : 0) + (r.age >= 18 && r.age <= 50 ? 1 : 0);
      if (sc > best) { best = sc; ev = t; }
    }); });
    if (ev) out.push(pol(ev + '。'));
    var be = bigEvent(ctx, L, used);
    if (be) out.push(be);
    if (note) out.push(note);
    var n = kidsOf(L).length;
    out.push(pol((n ? n + '人の子を育て、' : '') + (L.deathAge === 0 ? '1歳にならずに' : L.deathAge + '歳で') + '亡くなった。'));
    return out;
  }
  // 家の記録を次の代へ。名字・家宝・家訓は、たどる家のものをそのまま渡す
  function nextRec(ctx, L, keep) {
    var rec = ctx.S.houseRec(L);
    if (keep) { rec.surname = keep.surname || rec.surname; rec.treasure = keep.treasure; rec.motto = keep.motto; rec.since = keep.since; rec.ancestor = keep.ancestor; }
    return rec;
  }
  // 次の代を継ぐ子を選ぶ。gap の幅は16〜45年。残りの年数が、後で16年以上に分けられるようにする
  function pickHeir(L, meBy, lastBy) {
    var r = meBy - L.by, n = Math.max(1, Math.round(r / GEN)), target = L.by + r / n;
    var ok = kidsOf(L).filter(function (m) {
      var g = m.by - L.by, rest = meBy - m.by;
      if (g < 16 || g > 45 || rest < 16 || m.by > lastBy) return false;
      if (!m.alive && m.dy != null && m.dy - m.by < 16) return false; // 幼くして亡くなった子は継がない
      return true;
    });
    ok.sort(function (a, b) { return (a.sex === 'm' ? 0 : 6) + Math.abs(a.by - target) - ((b.sex === 'm' ? 0 : 6) + Math.abs(b.by - target)); });
    return ok[0] || null;
  }
  // 家をたどる。start は主人公（亡くなった L）、me = { y, pref }、seed は家の種
  // prefix は遊び直した代より前のあらまし（遊び直したときに使う）
  function traceStart(ctx, start, me, seed, prefix) {
    var head = prefix && prefix.head ? prefix.head : { name: String(ctx.O.displayName && start.old ? ctx.O.displayName(start) : start.name).replace(/（.*?）/g, ''), by: start.by, place: placeWord(start), kuni: kuniOf(start), old: !!start.old, surname0: start.surname || null };
    var keep = prefix && prefix.keep ? prefix.keep : (function () { var r = ctx.S.houseRec(start); return { surname: r.surname, treasure: r.treasure, motto: r.motto, since: r.since, ancestor: r.ancestor }; })();
    return { me: { y: +me.y, pref: String(me.pref) }, seed: seed >>> 0, head: head, keep: keep, headNote: prefix && prefix.headNote || '', gens: prefix && prefix.gens ? prefix.gens.slice() : [], used: {}, L: start, k: prefix && prefix.gens ? prefix.gens.length : 0, done: false, end: null };
  }
  function mix(x) { x >>>= 0; x = Math.imul(x ^ (x >>> 16), 0x85ebca6b); x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35); return ((x ^ (x >>> 16)) >>> 0) || 1; }
  function rng(seed) { var s = seed >>> 0 || 1; return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  // 1代ぶん進める。終わったら st.done = true（st.end に最後の場面）
  function traceStep(ctx, st) {
    if (st.done) return st;
    var L = st.L, meBy = st.me.y, mePref = st.me.pref, rest = meBy - L.by, rnd = rng(st.seed ^ Math.imul(st.k + 1, 0x9e3779b1));
    var rec = nextRec(ctx, L, st.keep), lastBy = 2000;
    var curPref = String(rec.pref), moved = null;
    // 最後の子：あなたの生まれ年に、あなたの都道府県で生まれる
    if (rest <= 45) {
      var finalNote = '';
      if (curPref !== mePref) finalNote = moveWhy(meBy - 1, L.sex, rnd); // 念のため（ふつうは手前の代で移っている）
      st.end = { kind: 'born', y: meBy, pref: mePref, from: st.head, n: st.k + 1, years: meBy - st.head.by, moveWhy: finalNote };
      st.done = true;
      return st;
    }
    var heir = pickHeir(L, meBy, lastBy), note = '', sex = null, name = null, by;
    var r = meBy - L.by, n = Math.max(2, Math.round(r / GEN)), gap = Math.round(r / n);
    gap = Math.max(16, Math.min(45, gap, r - 16));
    if (heir) { by = heir.by; sex = heir.sex; name = heir.name; }
    else {
      var sibs = (L.members || []).filter(function (m) { return m.sib; });
      if (!sibs.length) { st.end = { kind: 'gone', y: L.deathYear, town: /town|city/.test((L.home0 || {}).kind || L.kind || '') }; st.done = true; return st; }
      by = Math.min(L.by + gap, lastBy);
      if (meBy - by < 16) by = meBy - 16;
      sex = null;
      note = 'adopt';
    }
    // 移り住む：あと2代ほどで遊ぶ人の生まれ年に届く代で、遊ぶ人の都道府県へ
    var p = { k: st.k + 1, by: by, seed: mix(st.seed ^ Math.imul(by * 31 + st.k + 7, 0x85ebca6b)), pref: curPref, prov: rec.prov, sub: rec.sub, rec: rec, name: name, sex: sex };
    if (curPref !== mePref && meBy - by <= 60) {
      var pv = provIn(ctx.H, mePref, rnd);
      moved = { y: by, why: moveWhy(by, L.sex, rnd), pref: mePref };
      p.pref = mePref; p.prov = pv.prov; p.sub = pv.sub; rec.pref = mePref; rec.prov = pv.prov; rec.sub = pv.sub;
    }
    if (by >= 1873 || !p.prov) { if (!p.prov && by < 1975) { var pv2 = provIn(ctx.H, p.pref, rnd); p.prov = pv2.prov; p.sub = pv2.sub; } }
    // 継ぐ人が幼くして亡くならない人生を選ぶ（家を継いだのは大人まで育った子）
    var NL = null;
    for (var t = 0; t < 16; t++) {
      var pp = Object.assign({}, p, { seed: mix(p.seed + Math.imul(t, 0x6d2b79f5)) }); // 近い種は同じような人生になるので混ぜる
      var X = playAuto(ctx, makeGen(ctx, pp));
      if (X.deathAge >= 16 && (!NL || (kidsOf(X).length && !kidsOf(NL).length))) { NL = X; p = pp; }
      if (NL && kidsOf(NL).length) break;
    }
    if (!NL) { NL = playAuto(ctx, makeGen(ctx, p)); }
    var prevNote = '';
    if (note === 'adopt' && L.deathAge < 16) prevNote = ctx.pol('幼くして亡くなったので、家はきょうだいの子の' + NL.name + 'が継いだ。');
    else if (note === 'adopt') prevNote = ctx.pol('子がなく、' + (NL.sex === 'f' ? '姪' : '甥') + 'の' + NL.name + 'を養子に迎えて家を継がせた。');
    else if (sex === 'f' && NL.surname) prevNote = ctx.pol(NL.by < 1948 ? '娘の' + NL.name + 'に婿を迎えて、家を継がせた。' : '娘の' + NL.name + 'が、夫が妻の名字を名乗る形で結婚し、家の名字を受け継いだ。');
    if (moved) prevNote += ctx.pol(moved.y + '年ごろ、家は' + moved.why + (ctx.H.prefNames && ctx.H.prefNames[moved.pref] ? '、今の' + ctx.H.prefNames[moved.pref] + 'へ' : '') + '移り住んだ。');
    // 前の代の行に、継がせ方と移り住みの文を足す
    if (st.gens.length && prevNote) st.gens[st.gens.length - 1].lines.splice(-1, 0, prevNote);
    else if (prevNote) st.headNote = (st.headNote || '') + prevNote;
    var g = genEntry(ctx, st, NL, p, note === 'adopt' ? '養子' : sex === 'f' && NL.surname ? (NL.by < 1948 ? '婿' : '妻の名字') : moved ? '移り住み' : '');
    // 名字が変わったとき（初めて名字を名乗る・婿養子や養子で家の名字が変わる）は、理由の文を付けて、次の代へはその名字を渡す
    var sn = NL.surname || null;
    if (sn && sn !== st.keep.surname) {
      var line = st.keep.surname ? NL.name + 'は' + (NL.sex === 'f' ? '嫁ぎ先' : '婿入り先') + 'の名字の' + sn + 'を名乗り、家の名字も' + sn + 'に変わった。' : (NL.by >= 1870 ? '明治の決まりで、この代から' : 'この代から') + sn + 'の名字を名乗るようになった。';
      g.lines.splice(-1, 0, ctx.pol(line));
      g.why = g.why || '名字';
      st.keep.surname = sn;
    }
    g.surnameEnd = st.keep.surname;
    st.gens.push(g);
    st.L = NL; st.k++;
    return st;
  }
  function genEntry(ctx, st, NL, p, why) {
    var nm = String(ctx.O.displayName && NL.old ? ctx.O.displayName(NL) : NL.name).replace(/（.*?）/g, '');
    return { k: p.k, by: NL.by, name: nm, given: NL.name, sex: NL.sex, dy: NL.deathYear, age: NL.deathAge, pref: String(NL.old ? (NL.home0 || {}).pref || NL.pref : NL.home.pref), surname: NL.surname || null, status: NL.status || null, treasure: (NL.house6 || {}).treasure || null, kids: kidsOf(NL).length,
      why: why, p: { k: p.k, by: p.by, seed: p.seed, pref: p.pref, prov: p.prov, sub: p.sub, rec: p.rec, name: p.name, sex: p.sex }, lines: genLines(ctx, NL, '', st.used) };
  }
  // 遊び直した代（亡くなった L）を、たどる列に足してから続きを作る
  function addSelf(ctx, st, L) {
    if (!L.traceP) return st;
    st.gens.push(genEntry(ctx, st, L, L.traceP, ''));
    st.k = st.gens.length;
    return st;
  }
  function traceAll(ctx, st) { var guard = 0; while (!st.done && guard++ < 60) traceStep(ctx, st); return st; }
  // 最後の場面の文
  function endText(H, st) {
    var e = st.end;
    if (!e) return null;
    if (e.kind === 'gone') return 'この家は' + e.y + '年に絶えました。けれど、同じ' + (e.town ? '町' : '村') + 'の人々の中に、あなたにつながる人がいた見こみは高いです。';
    var pn = H.prefNames && H.prefNames[e.pref] || '';
    return e.y + '年、' + pn + 'で、一人の子が生まれました。' + e.years + '年前に' + e.from.place + 'で生まれた' + e.from.name + 'から、' + e.n + '代目の子です。';
  }

  /* ---------- 3 今に残るもの ---------- */
  // IM は旧国ごとの表（history.json の imani）。表の項目だけで文を作る
  function imani(H, L, muni) {
    var IM = H && H.imani, out = [];
    if (!L) return out;
    var kuni = kuniOf(L), p = L.old ? (L.home0 || {}).prov || L.prov : null, row = IM && p ? IM.prov[p] : null;
    if (muni) out.push((L.old ? kuni + 'の' + ((L.home0 || {}).kind === 'town' || (L.home0 || {}).kind === 'city' ? '町' : '村') + 'は、' : '生まれた土地は、') + '今の' + muni + 'のあたりです。');
    if (!row) return out;
    var by = L.by, dy = L.deathYear;
    if (row.ichinomiya && row.ichinomiya.length) { var ic = row.ichinomiya[0]; out.push('この人も参ったかもしれない' + kuni + '一宮の' + ic.name + 'は、今も' + ic.place + 'にあります。'); }
    if (row.kokubunji) { var kb = row.kokubunji; out.push(kuni + 'の国分寺' + (kb.now ? 'の流れをくむ寺は、今も' + kb.place + 'にあり' : 'の跡は、今の' + kb.place + 'にあり') + (kb.shiseki ? '、国の史跡になっています。' : 'ます。')); }
    var kd = (row.kaido || []).filter(function (k) { return k.from == null || k.from <= dy; }).map(function (k) { return k.name; });
    if (kd.length) out.push('この国を通っていた' + kd.slice(0, 3).join('・') + 'は、' + (kd.length > 1 ? 'どれも' : '') + '今も道の名前として残っています。');
    (row.matsuri || []).forEach(function (m) { if (m.since != null && m.since <= dy && out.length < 7) out.push('この人も見たかもしれない' + m.name + 'は、' + m.since + '年ごろから続き、今も' + m.place + 'で行われています。'); });
    var sn = L.surname || '', sr = IM.surname && IM.surname[sn];
    if (sr) out.push('名字の' + sn + 'は、' + sr.place + 'の地名から来たといわれています。');
    return out;
  }

  var API = { GEN: GEN, big: big, popWord: popWord, popAt: popAt, gens: gens, connect: connect, EXPLAIN: EXPLAIN, sameAgeRow: sameAgeRow, shortLived: shortLived,
    makeGen: makeGen, playAuto: playAuto, traceStart: traceStart, traceStep: traceStep, traceAll: traceAll, addSelf: addSelf, endText: endText, imani: imani, kidsOf: kidsOf, kuniOf: kuniOf, placeWord: placeWord,
    descPlan: descPlan, drift: drift, kmPref: kmPref, nearMe: nearMe, gensTo: gensTo, moveWhy: moveWhy, ADJ: ADJ };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.IchiokuTsunagari = API;
})(typeof self !== 'undefined' ? self : this);
