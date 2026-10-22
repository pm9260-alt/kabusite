/* 1000分の1 遊ぶ人自身と比べる（改善の指示書 第3弾の8）
   遊ぶ人が入れた「生まれた年と都道府県」（この端末にだけ保存）と、主人公の生まれ年の数字を並べる。
   数字は今ある生命表・進学率・初婚年齢のデータから出し、新しく作らない。比べる性別は主人公と同じにする。
   生まれ年を入れていないときは、比べの文を1つも出さない。 */
(function (root) {
  'use strict';
  var E = null, O = null;
  function mods() {
    if (!E) E = root.Ichioku || (typeof require === 'function' ? require('./engine.js') : null);
    if (!O) O = root.IchiokuOld || (typeof require === 'function' ? require('./history.js') : null);
  }
  function keysOf(s) { return Object.keys(s).map(Number).sort(function (a, b) { return a - b; }); }
  function lin(s, y) {
    var ks = keysOf(s);
    if (y <= ks[0]) return s[ks[0]];
    for (var i = 1; i < ks.length; i++) if (y <= ks[i]) { var a = ks[i - 1], b = ks[i]; return s[a] + (s[b] - s[a]) * (y - a) / (b - a); }
    return s[ks[ks.length - 1]];
  }
  function inRange(s, y) { var ks = keysOf(s); return y >= ks[0] && y <= ks[ks.length - 1] + 30; }
  // その年・その年齢で1年のうちに亡くなる確率（全国の目安。家の身分や土地の違いは入れない）
  function q(C, H, sex, age, y) {
    mods();
    if (y >= 1975) return E.deathProb(C, null, sex, age, y);
    return O.deathProb({ C: C, H: H, pref: null, kind: 'town', P: null }, sex, age, y);
  }
  // 生まれ年 by の人が a 歳まで生きている割合
  function surv(C, H, by, sex, a) {
    var s = 1;
    for (var k = 0; k < a; k++) s *= 1 - q(C, H, sex, k, by + k);
    return s;
  }
  function hsRate(H, sex, y) { var s = H.nat.hs && H.nat.hs[sex]; return s && inRange(s, y) && y >= 1948 ? lin(s, y) : null; }
  function marryAge(H, sex, y) { var s = H.nat.marriage && H.nat.marriage[sex]; if (!s) return null; var ks = keysOf(s); return y >= ks[0] && y <= ks[ks.length - 1] ? lin(s, y) : null; }
  function per(qv) {
    if (qv >= 0.045) return Math.max(2, Math.round(1 / qv)) + '人に1人';
    var n = Math.round(qv * 1000);
    return n >= 1 ? '1,000人に' + n + '人' : '1,000人に1人より少ない';
  }
  function pc(v) { return v > 0 && v < 0.01 ? '1%未満' : '約' + Math.round(v * 100) + '%'; }
  // 比べの文（です・ます）。me = { y: 生まれ年, pref: '13' }。入れていなければ null
  function line(C, H, L, me, kind) {
    if (!me || !me.y) return null;
    var sex = L.sex, by = L.by, py = +me.y;
    if (kind === 'birth') return 'この子が生まれた' + by + '年、0歳で亡くなる子は' + per(q(C, H, sex, 0, by)) + 'でした。あなたが生まれた' + py + '年は' + per(q(C, H, sex, 0, py)) + 'です。';
    if (kind === 'death') { var a = L.deathAge; return '同じ年に生まれた人のうち、' + a + '歳まで生きたのは' + pc(surv(C, H, by, sex, a)) + 'でした。あなたの生まれ年では' + pc(surv(C, H, py, sex, a)) + 'です。'; }
    var age = kind;
    if (age === 15) {
      var h1 = hsRate(H, sex, by + 15), h2 = hsRate(H, sex, py + 15);
      if (h2 != null && h1 != null) return '15歳の春に高校へ進んだ人は、この子の年は' + pc(h1) + '、あなたの年は' + pc(h2) + 'です。';
      if (h2 != null && by + 15 < 1948) return '15歳になった' + (by + 15) + '年、上の学校へ進む人はわずかでした。あなたが15歳の年は、' + pc(h2) + 'が高校へ進みました。';
    }
    if (age === 30) {
      var m1 = marryAge(H, sex, by + 25), m2 = marryAge(H, sex, py + 25);
      if (m1 != null && m2 != null) return 'はじめて結婚する年齢の平均は、この子の時代で' + m1.toFixed(1) + '歳、あなたの時代で' + m2.toFixed(1) + '歳です。';
    }
    return '同じ年に生まれた人のうち、' + age + '歳まで生きているのは' + pc(surv(C, H, by, sex, age)) + 'でした。あなたの生まれ年では' + pc(surv(C, H, py, sex, age)) + 'です。';
  }
  // 抽選で出す「その年にその国・都道府県で生まれる確率」（その年の人口・出生数の割合）
  function birthShare(C, L) {
    mods();
    if (L.old) { var b = O.birthShare(L); return { where: b.where, share: b.share }; }
    var tot = 0, mine = 0;
    (C.prefs || []).forEach(function (p) { var v = E.val(p.births, L.by); tot += v; if (p.code === L.home.pref) mine = v; });
    return { where: L.home.prefName, share: tot ? mine / tot : 0 };
  }
  var AGES = [5, 15, 30, 50, 70];
  var API = { line: line, birthShare: birthShare, surv: surv, q: q, per: per, hsRate: hsRate, marryAge: marryAge, AGES: AGES };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.IchiokuCompare = API;
})(typeof self !== 'undefined' ? self : this);
