/* 1000分の1 資料の箱と家族の年齢の一行（v18 指示書 11-1）。大きな決断の札に添える。
   forBranch(br, L, H, C) → { text: '1文（数字入り・です／ます）', src: '出典の鍵', srcName: '出典の名前（発行元）' } か null（数字のない分かれ道）
   familyAges(br, L) → '母 38歳・父 43歳'（その分かれ道に関わる、その年に生きている家族の年齢）
   isBig(br) → 大きな決断（小さな選択・親の選択・節目の問いではない分かれ道）なら true
   数字は data-src/shiryo.json の決まりで、history.json・common.json の数字だけから出す（tools/build-kurashi.mjs で下の BEGIN〜END に書き込む） */
(function (root) {
  'use strict';
  // BEGIN DATA（tools/build-kurashi.mjs が書き込む）
  var LIST = [{"id":"kobyo","keys":["s:kobyo","s:drama.ekibyo","s:c_chigo"],"y":[1000,1945],"calc":"q0","text":"この時代、生まれた子のうち0歳のうちに亡くなる子は約{v}%と見られています（推計）。","src":"auto"},{"id":"kobyo2","keys":["s:kobyo"],"y":[1946,2120],"calc":"q0","text":"{y}年ごろ、生まれた子のうち0歳で亡くなる子は約{v}%でした。","src":"auto"},{"id":"kodomo","re":"子を授か|身ごも|子が生まれ|跡取りの子|養子を迎","y":[1000,1945],"calc":"q0","text":"この時代、生まれた子のうち0歳のうちに亡くなる子は約{v}%と見られています（推計）。","src":"auto"},{"id":"kids","keys":["s:koendan","s:kotsugi","e:kids","e:child"],"y":[1893,1975],"calc":"children","text":"{by}年ごろに生まれた女性が産んだ子の数は、平均{v}人でした。","src":"ipss"},{"id":"marry","keys":["e:marry","s:koi","s:koendan","s:drama.hitome","s:atozoe","e:muko","s:shoya","e:partner"],"y":[1800,1975],"calc":"marriageAge","text":"{y}年ごろ、初めて結婚する年齢は平均で男性{m}歳・女性{f}歳でした。","src":"ipss"},{"id":"marry2","keys":["e:marry","s:koi","s:atozoe","e:partner"],"y":[1976,2120],"calc":"neverMarried","text":"{by}年ごろに生まれた{sexw}のうち、50歳までに一度は結婚する人は約{v}%と見込まれています。","src":"hhproj"},{"id":"bushiyoshi","keys":["s:c_bushi_yoshi","e:muko","e:yoshi"],"y":[1601,1867],"st":["bushi"],"calc":"bushiAdopt","text":"徳島藩の研究では、{y0}年ごろの武士の当主のうち養子の人は約{v}%でした。","src":"murakoshi"},{"id":"marryOld","keys":["e:marry","s:koi","s:koendan","s:drama.hitome","s:atozoe","e:muko","s:shoya","s:c_bushi_yoshi","s:shuto"],"y":[1000,1799],"calc":"stShare","text":"この時代の{kuni}では、{stw}の家の人が約{v}%を占めていたと見られています（推計）。","src":"auto"},{"id":"hoko","keys":["e:hoko","e:hokoEnd","s:kohoko","s:c_kuchiberashi","s:c_komori_edo","s:drama.enzai"],"y":[1650,1872],"calc":"hoko","text":"江戸後期の美濃のある村の研究では、暮らし向きが{tierw}の家の子のうち、男子の{m}%・女子の{f}%が奉公に出ていました。","src":"hayami"},{"id":"hokoEndF","keys":["e:hokoEnd"],"y":[1650,1872],"sex":"f","text":"江戸後期の美濃のある村の研究では、女子の奉公は平均13〜14年続き、無事に戻って結婚するのは26〜28歳でした。","src":"hayami"},{"id":"bunke","keys":["e:bunke"],"y":[1673,1872],"text":"1673年の分地制限令では、名主は20石、ふつうの百姓は10石に満たないと、田畑を分けて分家させられませんでした。","src":"bunchi"},{"id":"terakoya","keys":["s:e_kakizome","s:e_tax_arith","s:b_honzo","s:rangaku","s:shogiOld","s:e_sengoku_chouzuke"],"re":"寺子屋|手習い|字を習","y":[1700,1872],"calc":"terakoya","text":"{kindw}では、寺子屋などで字を習った子は男子の約{m}%・女子の約{f}%と見られています（目安）。","src":"terakoya"},{"id":"elem","re":"小学校|学校へ|学校に","y":[1873,1920],"calc":"elem","text":"{y}年ごろ、学校に通う年の子のうち小学校に通っていたのは、男子の約{m}%・女子の約{f}%でした。","src":"gakusei"},{"id":"mid","keys":["e:path","e:school","s:b_botany","s:e_kakizome"],"y":[1890,1947],"calc":"mid","text":"{y}年ごろ、中学校や高等女学校に進んだのは、男子の約{m}%・女子の約{f}%でした。","src":"gakusei"},{"id":"hs","keys":["e:middle","e:high","e:hs"],"y":[1948,1995],"calc":"hs","text":"{y}年ごろの高校への進学率は、男子が約{m}%・女子が約{f}%でした。","src":"school"},{"id":"univ","keys":["e:path","s:e_sengo_yakan","s:doctor"],"y":[1955,1995],"calc":"univ","text":"{y}年ごろの大学への進学率は、男子が約{m}%・女子が約{f}%でした。","src":"school"},{"id":"jobs","keys":["e:job","e:path","s:biz","s:e_modern","s:kokuhatsu","s:drama.gyakuten","s:sk_","s:e_sengo","s:jk4_corona"],"y":[1963,2025],"calc":"jobs","text":"{y}年の有効求人倍率は{v}倍でした。","src":"jobs"},{"id":"unemp","re":"失業|仕事を失|会社が傾|倒産|希望退職|リストラ","y":[1953,2025],"calc":"unemp","text":"{y}年の失業率は{v}%でした。","src":"labor"},{"id":"cpi","keys":["s:kabu","s:bubble","s:jk4_oil","s:yucho","s:tanomoshi","s:kasu","s:myhome"],"y":[1971,2025],"calc":"cpi","text":"{y}年の消費者物価は、前の年より{v}%上がっていました。","src":"cpi"},{"id":"ownHome","keys":["s:myhome"],"re":"家を買|マンション","y":[1978,2025],"calc":"ownHome","text":"{y}年ごろ、{kindw}で持ち家に住む世帯は約{v}%でした。","src":"census"},{"id":"threeGen","keys":["s:rogo","s:care","s:shuto","s:teinen"],"y":[1980,2025],"calc":"threeGen","text":"{y}年ごろ、{kindw}で三世代がいっしょに暮らす世帯は約{v}%でした。","src":"census"},{"id":"sectors","keys":["e:out","s:kotsugi","s:biz","e:job","s:ashigaru","s:yamiichi"],"y":[1873,1975],"calc":"sectors","text":"{y}年ごろ、働く人のうち農林漁業の人は約{v}%でした。","src":"ipss"},{"id":"urban","keys":["e:out","s:myhome","s:dream","s:joukyo"],"re":"都会|上京|町へ出","y":[1873,1975],"calc":"urban","text":"{y}年ごろ、市部に住む人は約{v}%でした。","src":"ipss"},{"id":"divorce","keys":["s:houtou","s:shuto","s:rikon","e:divorce"],"re":"離縁|離婚|別れる","y":[1800,1975],"calc":"divorce","text":"この時代、夫婦1組が1年のうちに離縁する割合は約{v}%と見られています（推計）。","src":"ipss"},{"id":"jinshin","keys":["s:kotsugi","e:out","s:biz","s:shizoku"],"y":[1868,1885],"text":"明治6年の職業別の人口では、農業が79%、工業が4%、商業が7%でした。","src":"jinshin"},{"id":"e0modern","keys":["s:teinen","s:late","s:rogo","s:katari","s:care","s:atozoe","s:inkyo"],"y":[1947,1970],"calc":"e0","text":"{y}年ごろの平均寿命は、男性が約{m}歳・女性が約{f}歳でした。","src":"ipss"},{"id":"e0edo","keys":["s:katari","s:rogo","s:atozoe","s:shukke","s:inkyo","s:late","e:inkyo","s:care"],"y":[1700,1867],"text":"江戸時代後期の村の研究では、生まれた子が生きる年数の平均は男性35.8年・女性37.0年と推計されています。","src":"edoLife"},{"id":"e0med","keys":["s:katari","s:rogo","s:atozoe","s:shukke","s:inkyo","s:late","e:inkyo"],"y":[1185,1599],"text":"鎌倉の由比ヶ浜南遺跡の人骨からは、この時代の平均寿命は24.0年と推計されています。","src":"bones"},{"id":"pop1280","keys":["s:kumano","s:ise","s:geino","s:kg_jishu","s:jk3_sansaiichi"],"y":[1250,1330],"text":"1280年ごろの日本の人口は、570万〜620万人と推計されています。","src":"farris"},{"id":"provPop","both":true,"keys":["s:","e:"],"re":"村|国|郷|里|町|祭|参|旅|年貢|一揆|戦|飢|田|山|浜|寺|社|家|荘","y":[1000,1872],"calc":"provPop","text":"{y}年ごろの{kuni}の人口は、約{v}人と見られています（推計）。","src":"auto"}];
  var SOURCES = {};
  // END DATA

  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function keys(o) { return Object.keys(o).map(Number).sort(function (a, b) { return a - b; }); }
  // 年の表を直線でつなぐ（表の外は端の値。範囲の外を許さないときは within で確かめる）
  function lin(t, y) {
    var ks = keys(t); if (!ks.length) return null;
    if (y <= ks[0]) return t[ks[0]];
    if (y >= ks[ks.length - 1]) return t[ks[ks.length - 1]];
    for (var i = 1; i < ks.length; i++) if (y <= ks[i]) { var a = ks[i - 1], b = ks[i]; return t[a] + (t[b] - t[a]) * (y - a) / (b - a); }
    return null;
  }
  function near(t, y) { var ks = keys(t), b = ks[0]; ks.forEach(function (k) { if (Math.abs(k - y) < Math.abs(b - y)) b = k; }); return b; }
  // その年より前でいちばん近い年（分かれ道の年より先の調査の年を出さない）
  function floorKey(t, y) { var ks = keys(t), b = ks[0]; ks.forEach(function (k) { if (k <= y) b = k; }); return b; }
  function within(t, y, slack) { var ks = keys(t); return ks.length && y >= ks[0] - (slack || 0) && y <= ks[ks.length - 1] + (slack || 0); }
  function pct(x, d) { var v = x * 100; return d ? (Math.round(v * 10) / 10).toFixed(1) : String(Math.round(v)); }
  function stOf(L) { return L.old ? L.status : 'modern'; }
  function kindKey(L) { return L.old ? null : ((L.place || {}).kind || null); }
  var KIND_W = { city: '城下や大きな町', town: '町', village: '村', fish: '浜の村', kotan: '村' };
  var TIER_W = ['下の4割', '中ほどの4割', '上の2割'];
  // 奉公に出る割合（美濃国安八郡西条村、1773〜1869年。速水融『歴史人口学の世界』。history.js の HOKO と同じ数）
  var HOKO = { m: [62, 30, 40], f: [72, 60, 30] };
  // 武士の当主のうち養子の割合（徳島藩の知行取。村越一哲 2001。history.js の BUSHI_ADOPT と同じ数）
  var BUSHI_ADOPT = [[1601, 9.7], [1651, 18.5], [1701, 34.0], [1751, 47.6], [1801, 38.0]];

  var CALC = {
    q0: function (o) { var q = lin(o.H.mort.q0, o.y); if (q == null) return null; return { v: pct(q, q < 0.1), y: o.y, src: o.y < 1900 ? 'edoLife' : 'ipss' }; },
    children: function (o) {
      var by = o.L.sex === 'f' ? o.L.by : (o.L.spouse && o.L.spouse.by) || o.L.by, t = o.H.nat.children;
      if (!within(t, by, 3)) return null; var k = near(t, by); return { by: k, v: t[k].mean.toFixed(1) };
    },
    marriageAge: function (o) { var m = o.H.nat.marriage; if (!within(m.m, o.y)) return null; return { y: o.y, m: lin(m.m, o.y).toFixed(1), f: lin(m.f, o.y).toFixed(1) }; },
    neverMarried: function (o) {
      var t = o.C && o.C.nat.everMarried && o.C.nat.everMarried[o.L.sex]; if (!t || !within(t, o.L.by, 2)) return null;
      return { by: near(t, o.L.by), v: pct(lin(t, o.L.by)), sexw: o.L.sex === 'm' ? '男性' : '女性' };
    },
    bushiAdopt: function (o) { var r = null; BUSHI_ADOPT.forEach(function (b) { if (o.y >= b[0]) r = b; }); return r ? { y0: r[0], v: r[1].toFixed(1) } : null; },
    stShare: function (o) {
      var L = o.L, st = L.status, H = o.H, p = H.prov && H.prov[L.prov];
      if (!p || !L.old || !(H.status && H.status[st])) return null;
      var v = null, src;
      if (o.y < 1600) { (H.medStatus || []).forEach(function (m) { if (o.y >= m.from && o.y <= m.to && m.w[st] != null) v = m.w[st]; }); src = 'medStatus'; }
      else if (p.status) { v = st === 'hyakusho' || st === 'chonin' || st === 'bushi' || st === 'priest' || st === 'outcast' ? p.status[st] : null; src = 'jinshin'; }
      if (v == null || v <= 0) return null;
      return { kuni: o.y < 1600 ? '日本' : p.kuni, stw: H.status[st].name, v: v < 0.01 ? pct(v, true) : pct(v), src: src };
    },
    hoko: function (o) { var p = o.L.incPct == null ? 0.5 : o.L.incPct, t = p < 0.4 ? 0 : p < 0.8 ? 1 : 2; return { tierw: TIER_W[t], m: HOKO.m[t], f: HOKO.f[t] }; },
    terakoya: function (o) { var k = o.L.kind === 'kotan' ? 'village' : o.L.kind, T = o.H.nat.terakoya; if (!T || !T.m[k]) return null; return { kindw: KIND_W[k] || '村', m: pct(T.m[k]), f: pct(T.f[k]) }; },
    elem: function (o) { var t = o.H.nat.elem; if (!within(t.m, o.y)) return null; return { y: o.y, m: pct(lin(t.m, o.y)), f: pct(lin(t.f, o.y)) }; },
    mid: function (o) { var t = o.H.nat.mid; if (!within(t.m, o.y, 4) || !within(t.f, o.y, 4)) return null; return { y: o.y, m: pct(lin(t.m, o.y), true), f: pct(lin(t.f, o.y), true) }; },
    hs: function (o) { var t = o.H.nat.hs; if (!within(t.m, o.y)) return null; return { y: o.y, m: pct(lin(t.m, o.y)), f: pct(lin(t.f, o.y)) }; },
    univ: function (o) { var t = o.H.nat.univ; if (!within(t.m, o.y)) return null; return { y: o.y, m: pct(lin(t.m, o.y)), f: pct(lin(t.f, o.y)) }; },
    jobs: function (o) { var t = o.C && o.C.nat.jobs; if (!t || t[o.y] == null) return null; return { y: o.y, v: Number(t[o.y]).toFixed(2) }; },
    unemp: function (o) { var t = o.C && o.C.nat.unemp; if (!t || t[o.y] == null) return null; return { y: o.y, v: Number(t[o.y]).toFixed(1) }; },
    cpi: function (o) { var t = o.C && o.C.nat.cpi; if (!t || t[o.y] == null || t[o.y - 1] == null) return null; var d = (t[o.y] / t[o.y - 1] - 1) * 100; if (d <= 0) return null; return { y: o.y, v: d.toFixed(1) }; },
    ownHome: function (o) { var k = kindKey(o.L), t = k && o.C && o.C.nat.ownHome[k]; if (!t || !within(t, o.y, 2)) return null; var ky = floorKey(t, o.y); return { y: ky, kindw: k, v: pct(t[ky]) }; },
    threeGen: function (o) { var k = kindKey(o.L), t = k && o.C && o.C.nat.threeGen[k]; if (!t || !within(t, o.y, 2)) return null; var ky = floorKey(t, o.y); return { y: ky, kindw: k, v: pct(t[ky]) }; },
    sectors: function (o) { var t = o.H.nat.sectors; if (!within(t, o.y)) return null; var k = floorKey(t, o.y); return { y: k, v: pct(t[k][0]) }; },
    urban: function (o) { var t = o.H.urban; if (!within(t, o.y)) return null; var k = floorKey(t, o.y); return { y: k, v: pct(t[k]) }; },
    divorce: function (o) { var t = o.H.nat.divorce; if (!within(t, o.y)) return null; return { v: pct(lin(t, o.y), true) }; },
    e0: function (o) { var t = o.H.nat.e0; if (!within(t.m, o.y)) return null; var k = floorKey(t.m, o.y); return { y: k, m: Math.round(t.m[k]), f: Math.round(t.f[k]) }; },
    provPop: function (o) {
      var L = o.L, p = o.H.prov && o.H.prov[L.prov]; if (!L.old || !p || !p.w || o.y >= 1873) return null;
      var early = o.y < (L.prov === '琉球' ? 1772 : L.prov === '蝦夷・松前' ? 1798 : 1721);
      var src = L.prov === '琉球' ? (early ? 'medRyukyu' : 'ryukyu') : L.prov === '蝦夷・松前' ? (early ? 'medEzo' : 'ezo') : early ? 'kito' : 'edoPop';
      var v = lin(p.w, o.y); if (!v) return null;
      return { y: o.y, kuni: p.kuni, v: Math.round(v).toLocaleString('ja-JP'), src: src };
    }
  };

  function keyOf(br) {
    if (!br) return '';
    if (br.id === 'story') return 's:' + (br.sid || '');
    return 'e:' + (br.kind || br.id || '');
  }
  function isBig(br) { return !!br && !br.ask && br.id !== 'ask' && br.sid !== 'choice'; }
  function textOf(br) { return (br.title || '') + ((br.groups || []).map(function (g) { return g.q || ''; }).join('')); }
  function fill(t, v) { var bad = false; var s = t.replace(/\{(\w+)\}/g, function (m, k) { if (v[k] == null) { bad = true; return ''; } return String(v[k]); }); return bad ? null : s; }
  function srcName(k, H, C) {
    var s = (H && H.sources && H.sources[k]) || (C && C.sources && C.sources[k]) || SOURCES[k];
    return s ? s.name + (s.org ? '（' + s.org + '）' : '') : null;
  }
  function forBranch(br, L, H, C) {
    if (!isBig(br) || !L || !H) return null;
    var key = keyOf(br), txt = textOf(br), y = L.year;
    for (var i = 0; i < LIST.length; i++) {
      var r = LIST[i];
      if (y < r.y[0] || y > r.y[1]) continue;
      if (r.st && r.st.indexOf(stOf(L)) < 0) continue;
      if (r.sex && r.sex !== L.sex) continue;
      var hitK = (r.keys || []).some(function (k) { return key.indexOf(k) === 0; }), hitR = r.re ? new RegExp(r.re).test(txt) : false;
      if (r.both ? !(hitK && hitR) : !(hitK || hitR)) continue; // both：鍵と言葉の両方が当てはまるときだけ
      var v = r.calc ? (CALC[r.calc] ? CALC[r.calc]({ L: L, H: H, C: C, y: y, br: br }) : null) : {};
      if (!v) continue;
      var text = fill(r.text, v), src = r.src === 'auto' ? v.src : r.src;
      if (!text || !src || !/\d/.test(text) || !srcName(src, H, C)) continue;
      return { text: text, src: src, srcName: srcName(src, H, C), rule: r.id };
    }
    return null;
  }

  /* ---------- 家族の年齢の一行 ---------- */
  var ROLE_W = { '父': '父', '母': '母', '祖父': '祖父', '祖母': '祖母' };
  function famWord(L, m) {
    if (m.role === '配偶者' || m.role === 'パートナー') return m.sex === 'm' ? '夫' : '妻';
    if (m.role === '子') return (m.sex === 'm' ? '息子' : '娘') + (m.name && !/アイヌ語/.test(m.name) ? 'の' + m.name : '');
    if (m.sib) return m.by < L.by ? (m.sex === 'm' ? '兄' : '姉') : m.by > L.by ? (m.sex === 'm' ? '弟' : '妹') : (m.sex === 'm' ? '兄弟' : '姉妹');
    return ROLE_W[m.role] || m.role;
  }
  var CHILD_RE = /子の|子に|息子|娘|跡取り|奉公先|縁談|孫/, SPOUSE_RE = /夫|妻|連れ合い|後添え|姑|嫁/, OLD_RE = /老後|介護|看病|定年|隠居|語り|孫/;
  function familyAges(br, L) {
    var y = L.year, ms = (L.members || []).filter(function (m) { return m.alive !== false && !m.gone && !m.before && m.by <= y && (m.dy == null || m.dy > y); });
    var t = textOf(br || {}), key = keyOf(br), pick = [];
    var par = ms.filter(function (m) { return m.role === '母' || m.role === '父'; }).sort(function (a, b) { return a.role === '母' ? -1 : 1; });
    var sp = ms.filter(function (m) { return m.role === '配偶者' || m.role === 'パートナー'; });
    var kids = ms.filter(function (m) { return m.role === '子'; }).sort(function (a, b) { return a.by - b.by; });
    var sibs = ms.filter(function (m) { return m.sib; }).sort(function (a, b) { return a.by - b.by; });
    if (OLD_RE.test(t) || /teinen|rogo|care|katari|late|inkyo/.test(key)) pick = sp.concat(kids.slice(0, 3), par);
    else if (CHILD_RE.test(t) || /kobyo|koendan|kohoko|kotsugi|c_/.test(key)) pick = sp.concat(kids.slice(0, 3));
    else if (SPOUSE_RE.test(t) || /houtou|shuto|atozoe/.test(key)) pick = sp.concat(par);
    else pick = par.concat(sp, kids.slice(0, 2));
    if (!pick.length) pick = par.concat(sp, kids.slice(0, 2), sibs.slice(0, 2));
    var seen = {}, out = [];
    pick.forEach(function (m) { if (seen[m.id]) return; seen[m.id] = 1; if (out.length < 4) out.push(famWord(L, m) + ' ' + (y - m.by) + '歳'); });
    return out.length ? out.join('・') : '本人 ' + (y - L.by) + '歳・身寄りなし';
  }

  var API = { forBranch: forBranch, familyAges: familyAges, isBig: isBig, keyOf: keyOf, LIST: LIST, SOURCES: SOURCES };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.IchiokuShiryo = API;
})(typeof self !== 'undefined' ? self : this);
