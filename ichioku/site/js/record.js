/* 1000分の1 死亡の記録（改善の指示書 第2弾の7。原作の「死亡記録」の並べ方にならう）
   一生をひとことで表す1行（選んだ分かれ道と仕事から）・死因・一生の要約・学び・仕事・ともに生きた人・最期を見送った人・
   いちばん満足が高かった年・暮らした土地・振り返っての1行を、人生の記録（L）から作る。文は普通体で作り、画面で丁寧体に直す。 */
(function (root) {
  'use strict';
  var CAUSE_WORD = { war: '戦争', disaster: '災害', sui: '自殺', acc: '不慮の事故', ill: '病気' };
  function causeText(L) {
    if (L.cause === 'sui') return '自殺';
    return L.causeName || CAUSE_WORD[L.cause] || '病気';
  }
  function members(L) { return (L.members || []).filter(function (m) { return !m.gone && !m.before; }); }
  function jobOf(L) {
    if (L.selfJob && L.selfJob.n) return L.selfJob.n;
    if (L.job && L.job.label) return L.job.label;
    if (L.lastJob && !/出家|身$/.test(L.lastJob)) return L.lastJob;
    return null;
  }
  function clean(t) { return String(t || '').replace(/[「」『』]/g, '').replace(/。$/, ''); }
  // 一生をひとことで（選んだ分かれ道の結果を入れる）
  // 一生をひとことで（v8の直し 5）：人生を決めた選択から作る。
  // 優先：暮らしの状態が変わった選択（出家・奉公・一座・出征・移民など）→ 結婚・家を継ぐ・勘当 → 進路 → ほかの大きな決断。
  // 小さな選択・親の選択・節目の問いかけからは作らない。5歳までに亡くなった人生は、家と土地から作る
  var P1 = /^(gyoretsu|sumoOld|yukaku|rangaku|shishi|kojo|cafe|manshu|geino|shukke|ashigaru|tozoku|shokunin|imin|toxic|dream|abroad|outwork|shukko)$/;
  var P1K = /^(hoko|out|bunke)$/;
  var P2 = /^(miai|koi|love5|shoya|kandou|reunion|marry|muko|yoshi|partner|kotsugi|houtou)$/;
  var P3 = /^(path|hs|univ|school|juken|job|doctor|reality)$/;
  function rankOf(c) {
    var k = c.sid || c.kind || '';
    if (!c.big || !c.l || c.kind === 'parent' || c.kind === 'small' || c.kind === 'ask') return 0;
    if (P1.test(k) || P1K.test(c.kind || '')) return 4;
    if (P2.test(k) || P2.test(c.kind || '')) return 3;
    if (P3.test(k) || P3.test(c.kind || '')) return 2;
    return 1;
  }
  function oneLine(L, o) {
    o = o || {};
    var a = L.deathAge, job = jobOf(L);
    if (a < 5) {
      var pl = String(o.birthPlace || '').replace(/（.*?）/g, '');
      return (pl ? pl + 'の' : '') + (o.houseShort ? o.houseShort + 'に' : '家に') + '生まれ、' + (a === 0 ? '1年に満たない時を生きた一生' : a + '年を生きた一生');
    }
    var best = null, br = 0;
    (L.choices || []).forEach(function (c) { var r = rankOf(c); if (r > br || (r === br && r > 0)) { best = c; br = r; } });
    var head = '';
    if (best) {
      var about = best.title && !/^(小さな選択|親の選択|節目|大きな決断)$/.test(best.title) ? clean(best.title).replace(/[？?]$/, '') : '';
      head = best.age + '歳' + (about ? 'の分かれ道（' + about + '）で' : 'で') + '「' + clean(best.l) + '」を選び、';
    }
    var tail = job ? job + 'として生きた' + a + '年の一生' : L.everMarried ? '家族とともに生きた' + a + '年の一生' : a + '年の一生';
    return head + tail;
  }
  // 一生の要約（3〜6文）
  function summary(L, o) {
    var s = [], a = L.deathAge, ms = (L.members || []);
    s.push(o.birthPlace + 'で、' + (o.house ? o.house + 'に' : '') + (L.sex === 'm' ? '男の子' : '女の子') + 'として生まれた。');
    if (L.edu && a >= 12) s.push(L.edu + 'まで学んだ。');
    var job = jobOf(L);
    if (job && a >= 13) s.push(job + 'として働いた。');
    if (L.everMarried) {
      var sp = ms.filter(function (m) { return m.role === '配偶者' || m.role === 'パートナー'; }).slice(-1)[0];
      var end = sp && !sp.alive && sp.dy != null ? Math.min(sp.dy, L.deathYear) : L.deathYear;
      var yrs = L.marriedY ? Math.max(0, end - L.marriedY) : null;
      if (sp && sp.name && yrs != null) s.push((sp.sex === 'm' ? '夫' : sp.sex === 'f' ? '妻' : '相手') + 'の' + sp.name + 'と' + (yrs || 1) + '年連れ添った' + (sp.dy != null && sp.dy <= L.deathYear && !sp.alive ? 'のち、先に見送った。' : '。'));
      else s.push('結婚した。');
    }
    var kids = ms.filter(function (m) { return m.role === '子' && !m.gone && m.by <= L.deathYear; });
    if (kids.length) {
      var lost = kids.filter(function (m) { return m.dy != null && m.dy <= L.deathYear; }).length;
      s.push(kids.length + '人の子を育て' + (lost ? '、そのうち' + lost + '人を先に見送った。' : 'た。'));
    }
    var gk = ms.filter(function (m) { return m.role === '孫' && !m.gone && m.by <= L.deathYear; }).length;
    if (gk) s.push('孫' + gk + '人に恵まれた。');
    if (o.deathPlace && movedOf(L)) s.push(o.deathPlace + 'に移り住んだ。');
    s.push(a + '歳のとき、' + (L.cause === 'sui' ? '自ら命を絶った。' : causeText(L) + 'で亡くなった。'));
    return s;
  }
  // 最期を見送った人
  function seeOff(L) {
    var ms = (L.members || []).filter(function (m) { return !m.gone && m.alive && m.by <= L.deathYear; }), parts = [];
    var sp = ms.filter(function (m) { return m.role === '配偶者' || m.role === 'パートナー'; })[0];
    if (sp) parts.push((sp.role === 'パートナー' ? 'パートナー' : sp.sex === 'm' ? '夫' : '妻') + 'の' + sp.name);
    var par = ms.filter(function (m) { return m.role === '父' || m.role === '母'; });
    if (par.length === 2) parts.push('両親'); else if (par.length) parts.push(par[0].role);
    var kids = ms.filter(function (m) { return m.role === '子'; }).length; if (kids) parts.push('子ども' + kids + '人');
    var gk = ms.filter(function (m) { return m.role === '孫'; }).length; if (gk) parts.push('孫' + gk + '人');
    var sib = ms.filter(function (m) { return m.sib; }).length; if (sib) parts.push('きょうだい' + (sib > 1 ? sib + '人' : ''));
    return parts.length ? parts.join('、') : '見送る家族はいなかった';
  }
  function bestYear(L) {
    var best = null;
    (L.log || []).forEach(function (r) { if (r.st && r.st.sat != null && (!best || r.st.sat > best.st.sat)) best = r; });
    return best;
  }
  function reflect(L) {
    var pts = (L.log || []).filter(function (r) { return r.st && r.st.sat != null; });
    if (L.deathAge < 15 || pts.length < 20) return L.deathAge < 15 ? '短い一生だった。それでも、家族の記憶に残った。' : null;
    var last = pts.slice(-10), before = pts.slice(0, -10);
    var avg = function (a) { return a.reduce(function (s, r) { return s + r.st.sat; }, 0) / a.length; };
    var d = avg(last) - avg(before);
    if (d > 5) return '最後の10年は、それまでより穏やかな日々だった。';
    if (d < -5) return '最後の10年は、それまでより苦しい日々だった。';
    return '暮らしの満足は、生涯を通じておだやかなままだった。';
  }
  // 暮らした土地（v8の直し 10）：場所のコード（都道府県・市区町村・旧国）で比べ、呼び名が変わっただけなら1つにまとめる
  function pinKey(r) { var p = r.pin || {}; return p.abroad ? 'abroad:' + (r.place || '') : [p.pref || '', p.muni || '', p.prov || ''].join('|'); }
  function short(t) { return String(t || '').replace(/（今の(.*?)）/, '').replace(/（.*?）/g, ''); }
  function places(L) {
    var groups = [], idx = {};
    (L.log || []).forEach(function (r) {
      var k = pinKey(r), lb = short(r.place);
      if (!lb) return;
      if (idx[k] == null) { idx[k] = groups.length; groups.push({ k: k, first: lb, later: null }); }
      else { var g = groups[idx[k]]; if (lb !== g.first && !g.later) g.later = lb; }
    });
    return groups.map(function (g) {
      if (!g.later) return g.first;
      var pf = (g.later.match(/^(.+?[都道府県])/) || [])[1];
      return g.first + '（のちの' + (pf || g.later) + '）';
    });
  }
  // 生まれた土地から移り住んだか（呼び名ではなく場所のコードで比べる）
  function movedOf(L) {
    var ks = {};
    (L.log || []).forEach(function (r) { ks[pinKey(r)] = 1; });
    return Object.keys(ks).length > 1;
  }
  function build(L, o) {
    o = o || {};
    var b = bestYear(L), pl = places(L);
    return {
      no: 'No. ' + (o.code || '') + '-' + L.by + '-' + L.deathAge,
      cause: causeText(L), line: oneLine(L, o), summary: summary(L, o), seeOff: seeOff(L), reflect: reflect(L),
      best: b ? { age: b.age, year: b.year, sat: b.st.sat } : null, places: pl, job: jobOf(L), edu: L.edu || null
    };
  }
  var API = { build: build, causeText: causeText, oneLine: oneLine, rankOf: rankOf, places: places, movedOf: movedOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.IchiokuRecord = API;
})(typeof self !== 'undefined' ? self : this);
