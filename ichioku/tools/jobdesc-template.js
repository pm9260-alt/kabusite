/* 1000分の1 仕事の中身（spec 13「各職業の生活と仕事の中身について文献に当たり、詳細で正確な仕事の記述を心がける」）
   記録によく出る仕事の上位300（data-src/jobdesc-top.json）ごとに、1日の流れ・道具と身なり・誰に雇われ誰に売るか・季節ごとの違い・稼ぎの目安・多いけがや病気と苦労の6つを、
   時代の文献（出典は data-src/paths/sources-jobdesc.json）から書いた。元の表は data-src/jobdesc.json。このファイルは node tools/build-jobdesc.mjs で作る（手で直さない）。
   文は普通体（過去形）で、画面では polite.js で丁寧体に直す。 */
(function (root) {
  'use strict';
  var D = /*DATA*/{};
  var SRC = /*SRC*/{};
  var TOP = /*TOP*/[];
  var KEYS = ['day', 'tools', 'trade', 'season', 'pay', 'risk'];
  // 仕事の名前から表の見出しを探す（「尼（金剛院）」「僧（大日寺）」のように寺の名を添えた名前は、寺の名を外して探す）
  function key(n) {
    n = String(n || '').replace(/（非正規）$/, '');
    if (D[n]) return n;
    var m = n.replace(/（[^（）]*(寺|院|庵|坊|社)）$/, '');
    return D[m] ? m : null;
  }
  // その年に合う書き方を1つ選ぶ（年の範囲に入るもの、なければいちばん近いもの）
  function get(n, y) {
    var k = key(n);
    if (!k) return null;
    var v = D[k];
    if (v && v.same) v = D[v.same];
    if (!v) return null;
    var list = [].concat(v), best = list[0], bd = Infinity;
    if (y != null) for (var i = 0; i < list.length; i++) {
      var e = list[i], d = y < e.y[0] ? e.y[0] - y : y > e.y[1] ? y - e.y[1] : 0;
      if (d < bd) { bd = d; best = e; }
    }
    var out = { name: k };
    for (var j in best) out[j] = best[j];
    out.srcNames = (best.src || []).map(function (s) { return SRC[s] || s; });
    return out;
  }
  // 人生の記録に出す場面（6つの項目それぞれから1つずつ。普通体の文）
  function scenes(n, y) {
    var e = get(n, y);
    if (!e) return [];
    return KEYS.map(function (k) { return e[k]; }).filter(Boolean);
  }
  function first(t) { var m = String(t || '').match(/^[^。]*。/); return m ? m[0] : String(t || ''); }
  // 死亡の記録の「最後の仕事」に添える1〜2文（1日の流れと、多い苦労。普通体）
  function recordLine(n, y) {
    var e = get(n, y);
    if (!e) return '';
    return first(e.day) + first(e.risk);
  }
  // 出典の短い名前（『』の中）を並べる（画面の注に使う）
  function cite(n, y) {
    var e = get(n, y);
    if (!e) return '';
    return e.srcNames.map(function (s) { var m = s.match(/『[^』]+』/); return m ? m[0] : s.split('（')[0]; }).filter(function (s, i, a) { return a.indexOf(s) === i; }).join('・');
  }
  function has(n) { return !!key(n); }
  var API = { get: get, scenes: scenes, recordLine: recordLine, cite: cite, has: has, key: key, KEYS: KEYS, TOP: TOP, SRC: SRC };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.IchiokuJobDesc = API;
})(typeof self !== 'undefined' ? self : this);
