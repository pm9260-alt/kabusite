/* 1000分の1 1974年までに亡くなる人の死因（作る人の指示 2026-10-18「死因は多種多様にする」）
   1900〜1974年は人口動態統計の死因別の死亡率（人口10万対、年代ごとの平均。一部は概数）、
   それより前は寺の過去帳の研究や流行病の記録からの推計の割合（data-src/causes.json の src と note）。
   亡くなるかどうかは生命表のまま。ここでは「何で亡くなったか」だけを、年代・年齢・男女・土地・飢饉の年で選ぶ。 */
(function (root) {
  'use strict';
  var D = __DATA__;
  function band(a) { return a === 0 ? '0' : a <= 4 ? '1-4' : a <= 14 ? '5-14' : a <= 39 ? '15-39' : a <= 64 ? '40-64' : '65+'; }
  function eraOf(y) { for (var i = 0; i < D.eras.length; i++) if (y >= D.eras[i].from && y <= D.eras[i].to) return D.eras[i]; return null; }
  // years：2つで間が開いていれば「その間」、それ以外は「その年だけ」
  function inYears(ys, y) { if (!ys) return true; if (ys.length === 2 && ys[1] - ys[0] > 1) return y >= ys[0] && y <= ys[1]; return ys.indexOf(y) >= 0; }
  // c = { place: 'village'|'fish'|'town'|'city', famine: true/false }
  function weights(y, a, sex, c) {
    var e = eraOf(y), out = [];
    if (!e) return out;
    e.causes.forEach(function (x) {
      if (x.sex && x.sex !== sex) return;
      if (x.age && (a < x.age[0] || a > x.age[1])) return;
      if (!inYears(x.years, y)) return;
      if (x.place && !(c && c.place && x.place.indexOf(c.place) >= 0)) return; // まれな死因：起きる土地の種類
      if (x.pref && !(c && c.pref && x.pref.indexOf(String(c.pref)) >= 0)) return; // まれな死因：起きる都道府県（ハブは沖縄・奄美など）
      var w = x.w * ((D.ageMult[x.n] || {})[band(a)] || 1);
      if (Array.isArray(x.kind) && c && c.place && x.kind.indexOf(c.place) < 0) w *= 0.15; // 脚気は町に多い
      if (x.peak && x.peak.years.indexOf(y) >= 0) { var pw = Array.isArray(x.peak.w) ? x.peak.w[x.peak.years.indexOf(y)] : x.peak.w; w = pw * ((D.ageMult[x.n] || {})[band(a)] || 1); }
      if (x.famine) w *= c && c.famine ? 4 : 0.5; // 飢えと栄養失調は、飢饉や凶作の年に多い
      if (w > 0) out.push({ n: x.n, w: w, kind: Array.isArray(x.kind) ? 'ill' : (x.kind || 'ill') });
    });
    return out;
  }
  function pick(y, a, sex, c, rnd) {
    var ws = weights(y, a, sex, c), t = ws.reduce(function (s, x) { return s + x.w; }, 0);
    if (!t) return null;
    var r = rnd() * t, x = ws[ws.length - 1], u = 0.5;
    for (var i = 0; i < ws.length; i++) { if (r < ws[i].w) { x = ws[i]; u = r / ws[i].w; break; } r -= ws[i].w; }
    // 選ばれた幅の中の位置で細かい病名を選ぶ（乱数を余分に引かない）
    var d = refine(x.n, a, sex, y, u), sh = x.w / t;
    return d === x.n ? { n: x.n, w: x.w, kind: x.kind, share: sh } : { n: d, w: x.w, kind: x.kind, from: x.n, share: sh * subShare(x.n, a, sex, y, d) };
  }
  // 統計で「その他の病気」「ほかのがん」「その他の事故」とまとめられた死因を、細かい病名に分ける（推計）。
  // 割合は人口動態統計の死因簡単分類（2023年ごろの死亡数）をもとにした目安。子どもと若い人は、その年齢で多い病名から選ぶ
  var SPLIT = {
    'その他の病気': [
      [0, 14, { '脳炎・脳症': 3, '心筋症': 2, 'てんかん': 2, '神経や筋肉の難病': 2, '腸閉塞': 1, 'ぜんそく': 1 }],
      [15, 39, { '心筋症': 3, 'てんかん': 3, '不整脈': 3, '神経や筋肉の難病': 2, '膠原病': 1, 'ぜんそく': 1, '脳炎・脳症': 1 }],
      [40, 200, { '間質性肺炎': 23, 'パーキンソン病': 21, '高血圧の病気': 11, '不整脈': 9, '腸閉塞': 8, '尿路の感染症': 6, '胆のう・胆管の病気': 6, '胃や腸からの出血': 4, 'すい炎': 3, '血液の病気': 3, 'ALS（筋萎縮性側索硬化症）': 2, '膠原病': 2, 'ぜんそく': 1 }]
    ],
    'がん': [
      [0, 14, { '脳腫瘍': 4, '神経芽腫': 2, '骨肉腫': 1, '悪性リンパ腫': 1 }],
      [15, 200, { '胆のうがん': 18, '悪性リンパ腫': 14, '食道がん': 11, '膀胱がん': 9, '口とのどのがん': 8, '腎臓がん': 6, '卵巣がん': 5, '多発性骨髄腫': 4, '脳腫瘍': 3, '皮膚がん': 2 }]
    ],
    'その他の事故': [
      [0, 200, { '熱中症': 2, '寒さによる事故': 2, '機械に挟まれる事故': 2, '山や雪の事故': 1.5, '感電': 0.5 }]
    ]
  };
  SPLIT['ほかのがん'] = SPLIT['がん'];
  function refine(n, a, sex, y, u) {
    var t = SPLIT[n];
    if (!t) return n;
    var row = null;
    t.forEach(function (r) { if (a >= r[0] && a <= r[1]) row = r[2]; });
    if (!row) return n;
    var ks = Object.keys(row).filter(function (k) { return !(k === '卵巣がん' && sex !== 'f') && !(k === '熱中症' && y < 1960); });
    var tot = ks.reduce(function (s, k) { return s + row[k]; }, 0), x = u * tot;
    for (var i = 0; i < ks.length; i++) { x -= row[ks[i]]; if (x < 0) return ks[i]; }
    return ks[ks.length - 1];
  }
  // 細かく分けた病名が、まとめられた死因の中で占める割合
  function subShare(n, a, sex, y, d) {
    var t = SPLIT[n], row = null;
    if (!t) return 1;
    t.forEach(function (r) { if (a >= r[0] && a <= r[1]) row = r[2]; });
    if (!row || row[d] == null) return 1;
    var tot = Object.keys(row).filter(function (k) { return !(k === '卵巣がん' && sex !== 'f') && !(k === '熱中症' && y < 1960); }).reduce(function (s, k) { return s + row[k]; }, 0);
    return row[d] / tot;
  }
  // 1975年からの人生のまれな死因（毒キノコ・スズメバチ・落雷など）：統計の「その他の事故」の中から、年・年齢・土地で選ぶ（u は選ばれた幅の中の位置）
  function rareModern(y, a, sex, place, pref, u) {
    var ks = (D.rare || []).filter(function (r) { return y >= r.y[0] && y <= r.y[1] && a >= r.age[0] && a <= r.age[1] && (!r.sex || r.sex === sex) && (!r.place || r.place.indexOf(place) >= 0) && (!r.pref || r.pref.indexOf(String(pref)) >= 0); });
    var tot = ks.reduce(function (s, r) { return s + r.w; }, 0), x = u * 60; // その他の事故（人口10万あたりおよそ60）のうち、まれな死因の分
    for (var i = 0; i < ks.length; i++) { x -= ks[i].w; if (x < 0) return ks[i].n; }
    return null;
  }
  // 画面に出す呼び名
  var SHOW = { '胃腸炎（下痢腸炎）': '胃腸炎', 'ほかのがん': 'がん', '肺炎・気管支炎': '肺炎', '肺炎・かぜ': '肺炎', '心臓の病気': '心臓の病気', '自害': '自害', '赤痢・疫痢': '赤痢' };
  // 5歳未満は子どもの呼び方にする（v11の直し 7）。乳児脚気・先天梅毒は当時の赤ちゃんの死因として記録がある
  var CHILD = { '脚気': '乳児脚気', '梅毒': '生まれつきの梅毒' };
  function show(n, a) { return (a != null && a < 5 && CHILD[n]) || SHOW[n] || n; }
  var API = { pick: pick, weights: weights, show: show, refine: refine, subShare: subShare, rareModern: rareModern, rareLine: function (n) { return (D.rareLines || {})[n] || null; }, eras: D.eras, est: function (y) { var e = eraOf(y); return !!(e && e.est); } };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.IchiokuCauses = API;
})(typeof self !== 'undefined' ? self : this);
