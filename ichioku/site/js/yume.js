/* 1000分の1 素養と夢（v19 の 15・16・17）
   15 音楽・運動・勉強の素養を親から子へ：人はそれぞれ見えない素養 { music, sport, study }（0〜100、平均50・ばらつき15）を持つ。
      子の素養 ＝ 50 ＋ 遺伝の割合 ×（父母の平均 − 50）＋ その子だけの偶然（きょうだいでも違う）。
      遺伝の割合は資料の範囲から選ぶ：音楽 0.5・運動 0.5（Vinkhuyzen ほか 2009 の素養 0.32〜0.71、Polderman ほか 2015 の平均 0.49）、勉強 0.6（Krapohl ほか 2014 の 0.62）。
      親の素養と子の素養の回帰の傾きが、この遺伝の割合になる（父母の平均のばらつきは 15²/2 なので、偶然の部分のばらつきを 15²×(1 − h²/2) にする）。
      遺伝の割合は環境しだいで変わる（Turkheimer ほか 2003）。ここでは、生まれ持った素養は変えず、伸びるのは習い事・部活・進路の分かれ道を選んだときだけにする。
      分かれ道に出会えるかは、家の暮らし向き・時代・身分で変わる。
   16 プロのスポーツ選手：1925年からの生まれで、20歳まで生きた男性の1.5%・女性の0.8%（実際より多くして、出会いやすくしている）。
      14歳の年に、素養と夢からなるかどうかと競技を決め、その競技の筋（data-src/paths/s7_sport_*.json）を決めた年齢で始める。
   17 10歳で将来の夢：1926年からの生まれで、10歳の年に「将来の夢」の分かれ道。15歳で「夢は変わったか」。30歳ごろに、夢がかなったかを1文書く。
      夢の候補は、1989年からは第一生命「大人になったらなりたいもの」の上位の顔ぶれに沿い、それより前はその時代にあった仕事から選ぶ（割合は作らない）。
   乱数はこの仕組みだけの別のもの（種から作る）を使う。 */
(function (root) {
  'use strict';

  var DOM = ['music', 'sport', 'study'];
  var H2 = { music: 0.5, sport: 0.5, study: 0.6 };
  var MEAN = 50, SD = 15;
  var WORD = { music: '音楽', sport: '運動', study: '学問' };

  function clamp(x, lo, hi) { return x < lo ? lo : x > hi ? hi : x; }
  function rng(seed) { var a = (seed >>> 0) || 1; return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function gauss(r) { var u = 1 - r(), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function rFor(L, salt) { return rng((((L.seed0 || L.seed || 1) >>> 0) ^ Math.imul(salt >>> 0, 0x9E3779B1)) >>> 0); }
  function one(r, a) { return a[Math.floor(r() * a.length)]; }
  function nm(L) { return String(L.name || '').replace(/（.*?）/g, ''); }

  /* ---------- 15 素養 ---------- */
  // 親のいない（記録のない）人：その時代の人々のばらつきから引く。子孫の家では、家の得意な分野の方へ少し寄せる（推計）
  function popApt(r, shift) {
    var o = {};
    DOM.forEach(function (d) { var m = MEAN + (shift && shift[d] != null ? 0.5 * (shift[d] - MEAN) : 0); o[d] = Math.round(clamp(m + SD * gauss(r), 0, 100)); });
    return o;
  }
  // 父母の素養から子の素養を作る（どちらかが無いときは、人々の平均とみなす）
  function childApt(pa, pb, r) {
    var o = {};
    DOM.forEach(function (d) {
      var a = pa ? pa[d] : MEAN, b = pb ? pb[d] : MEAN, mid = (a + b) / 2, h = H2[d];
      o[d] = Math.round(clamp(MEAN + h * (mid - MEAN) + SD * Math.sqrt(1 - h * h / 2) * gauss(r), 0, 100));
    });
    return o;
  }
  function role(L, r0) { return (L.members || []).filter(function (m) { return m.role === r0; })[0] || null; }
  function spouse(L) { var s = (L.members || []).filter(function (m) { return m.role === '配偶者' || m.role === 'パートナー'; }); return s[s.length - 1] || null; }
  function ensure(L) {
    if (!L) return null;
    var dad = role(L, '父'), mom = role(L, '母'), sh = L.houseApt || null;
    [dad, mom].forEach(function (m) { if (m && !m.apt) m.apt = popApt(rFor(L, 0x100 + m.id), sh); });
    if (!L.apt) L.apt = childApt(dad && dad.apt, mom && mom.apt, rFor(L, 0x200));
    L.aptG = L.aptG || { music: 0, sport: 0, study: 0 };
    // きょうだい（同じ父母の子）と、自分の子（自分と配偶者の子）にも、先に素養を決めておく（その人として生き直したときに同じになる）
    (L.members || []).forEach(function (m) {
      if (m.apt) return;
      if (m.sib) m.apt = childApt(dad && dad.apt, mom && mom.apt, rFor(L, 0x300 + m.id));
      else if (m.role === '子') {
        var sp = spouse(L);
        if (sp && !sp.apt) sp.apt = popApt(rFor(L, 0x400 + sp.id));
        m.apt = childApt(L.apt, sp ? sp.apt : popApt(rFor(L, 0x500 + m.id)), rFor(L, 0x600 + m.id));
      }
    });
    return L.apt;
  }
  // 今の素養（生まれ持ったもの＋習い事や練習で伸びた分）
  function eff(L, d) { ensure(L); return clamp(L.apt[d] + ((L.aptG || {})[d] || 0), 0, 100); }
  function z(L, d) { return (eff(L, d) - MEAN) / SD; }
  function grow(L, d, v) { ensure(L); L.aptG[d] = (L.aptG[d] || 0) + v; }

  // 6〜8歳ごろ：親に似ているか（似ていないか）の1文
  var LIKE = { music: '耳がいい', sport: '足が速い', study: '物覚えが早い' };
  function likeLine(c) {
    var L = c.L, s = c.s, Y = s.yume;
    if (Y.like || c.a < 6 || c.a > 8) return;
    Y.like = c.y;
    var dad = role(L, '父'), mom = role(L, '母'), best = null;
    DOM.forEach(function (d) { if (L.apt[d] >= 63 && (!best || L.apt[d] > L.apt[best])) best = d; });
    if (!best) return;
    var pa = [dad, mom].filter(function (m) { return m && m.apt; });
    var top = pa.slice().sort(function (a, b) { return b.apt[best] - a.apt[best]; })[0];
    var t;
    if (top && top.apt[best] >= 58) {
      var who = top.role === '父' ? '父' : '母';
      t = best === 'sport' ? who + 'のように足が速いと評判になった。' : best === 'music' ? who + 'に似て、耳がいいと言われた。' : who + 'に似て、物覚えが早いと言われた。';
    } else if (pa.length === 2 && pa.every(function (m) { return m.apt[best] < 47; })) {
      var like = best === 'study' ? (c.y < 1872 ? '字を覚えるのが何より好きな' : '本を読むのが何より好きな') : best === 'music' ? '一度聞いた歌をすぐに覚えてしまう' : '駆けっこで誰にも負けない';
      t = '親はどちらも' + WORD[best] + 'とは縁がなかったが、' + like + '子だった。';
    } else return;
    c.say(t, { sat: 1 }, '家庭');
  }

  // 家の記録（子孫へ）：家の人の素養の平均。60を超える分野があれば「この家には○○の得意な人が多い」
  function houseApt(L) {
    ensure(L);
    var ms = [L].concat((L.members || []).filter(function (m) { return m.apt && (m.role === '父' || m.role === '母' || m.role === '子' || m.sib); }));
    var o = {}, top = null;
    DOM.forEach(function (d) { var t = 0, n = 0; ms.forEach(function (m) { if (m.apt) { t += m.apt[d]; n++; } }); o[d] = n ? Math.round(t / n) : MEAN; if (o[d] >= 56 && (!top || o[d] > o[top])) top = d; });
    o.top = top;
    return o;
  }
  function houseLine(rec) { return rec && rec.apt && rec.apt.top ? 'この家には、' + WORD[rec.apt.top] + 'の得意な人が多いと言われていた。' : ''; }

  /* ---------- 16 プロのスポーツ選手 ---------- */
  // [競技の鍵, プロの仕事の名前, 男性の年 [始め, 終わり], 女性の年 [[始め, 終わり], ...], 入る年齢 [若い方, 上の方]]（data-src/paths/sources-s7_sport.json）
  var SPORT = [
    ['sumo', '力士', [1925, 2045], [], [15, 18]], ['yakyu0', '職業野球の選手', [1936, 1949], [], [17, 21]], ['yakyu1', 'プロ野球選手', [1950, 1964], [], [18, 22]],
    ['yakyu', 'プロ野球選手', [1965, 2045], [], [18, 22]], ['yakyuw', '女子プロ野球の選手', null, [[2010, 2021]], [18, 22]], ['kishu', '競馬の騎手', [1936, 2045], [[1996, 2045]], [16, 19]],
    ['boxing', 'プロボクサー', [1925, 2045], [[2008, 2045]], [17, 22]], ['golf', 'プロゴルファー', [1926, 2045], [[1967, 2045]], [18, 23]],
    ['keirin', '競輪選手', [1948, 2045], [[1949, 1964], [2012, 2045]], [18, 23]], ['kyotei', '競艇選手', [1952, 2045], [[1952, 2045]], [18, 23]], ['auto', 'オートレース選手', [1950, 2045], [], [18, 23]],
    ['puroresu', 'プロレスラー', [1953, 2045], [[1968, 2045]], [17, 22]], ['soccer', 'プロサッカー選手', [1993, 2045], [], [18, 22]], ['soccerw', '女子サッカーの選手', null, [[1989, 2045]], [18, 22]],
    ['basket', 'プロバスケットボール選手', [2016, 2045], [], [18, 22]], ['rugby', 'ラグビーの選手', [2022, 2045], [], [18, 22]], ['esports', 'プロゲーマー', [2018, 2045], [[2018, 2045]], [16, 22]],
    ['tennis', 'テニスの選手', [1972, 2045], [[1972, 2045]], [18, 22]], ['volley', '実業団のバレーボール選手', [1967, 2045], [[1967, 2045]], [18, 22]],
    ['rikujo', '実業団の陸上選手', [1957, 2045], [[1981, 2045]], [18, 22]], ['suiei', '実業団の水泳選手', [1964, 2045], [[1964, 2045]], [18, 22]],
    ['ski', '実業団のスキー選手', [1964, 2045], [[1964, 2045]], [18, 22]], ['skate', '実業団のスケート選手', [1964, 2045], [[1964, 2045]], [18, 22]]
  ].map(function (a) { return { k: a[0], job: a[1], m: a[2], f: a[3], a: a[4], id: 's7sp_' + a[0] }; });
  var SPORT_BY = {}; SPORT.forEach(function (o) { SPORT_BY[o.id] = o; });
  var SNOW = ['01', '02', '03', '05', '06', '07', '15', '16', '17', '18', '20'];
  // 20歳まで生きた人のうち、プロかトップの選手になる割合（作る人の指示：男性1.5%・女性0.8%。実際より多い）
  var PRO_RATE = { m: 0.015, f: 0.008 };
  // 14歳で決めた人のうち、スカウトの答え・戦時・出会えなかった年の分を見こんで多めに引く（tools/check6.mjs 10-16 で確かめた倍率）
  var PRO_X = { m: 0.94, f: 1.36 };
  function sportOk(o, sex, y) {
    if (y >= 1944 && y <= 1945 && o.k !== 'sumo') return false; // 戦争の終わりの2年は、職業野球などの試合が止まっていた
    if (sex === 'm') return !!o.m && y >= o.m[0] && y <= o.m[1];
    return o.f.some(function (r) { return y >= r[0] && y <= r[1]; });
  }
  function curPref(L) { return String(L.old ? L.pref : (L.place || {}).pref); }
  function proPlan(L) {
    var Y = yumeOf(L);
    if (Y.proDone || L.age !== 14 || L.by < 1925) return;
    Y.proDone = true;
    var r = rFor(L, 0x700), sex = L.sex === 'f' ? 'f' : 'm';
    var dr = curDream(L), dsp = dr && DREAM[dr.id] && DREAM[dr.id].dom === 'sport';
    var p = PRO_RATE[sex] * PRO_X[sex] * Math.exp(0.8 * z(L, 'sport')) / Math.exp(0.32) * (dsp ? 1.5 : 1) / 1.1;
    if (r() >= p) return;
    var cand = [];
    SPORT.forEach(function (o) {
      var age = o.a[0] + Math.floor(r() * (o.a[1] - o.a[0] + 1)), y = L.by + age;
      if (!sportOk(o, sex, y)) return;
      if (o.k === 'ski' && SNOW.indexOf(curPref(L)) < 0) return;
      var w = dr && DREAM[dr.id] && (DREAM[dr.id].pro || []).indexOf(o.k) >= 0 ? 3 : 1;
      cand.push({ o: o, age: age, w: w });
    });
    if (!cand.length) return;
    var t = 0; cand.forEach(function (x) { t += x.w; }); var u = r() * t, pk = cand[0];
    for (var i = 0; i < cand.length; i++) { u -= cand[i].w; if (u < 0) { pk = cand[i]; break; } }
    Y.pro = { k: pk.o.k, id: pk.o.id, age: pk.age };
  }
  // 筋の始まりの関門（story.js の pathGate）
  var MUSIC_RE = /楽|琴|三味線|歌の師|奏|音楽|能役者|囃子/, STUDY_RE = /学者|研究|博士|教授|医|塾|師範|訓導|教師/;
  var PDOM = {};
  function pathDom(path) {
    if (PDOM[path.id] !== undefined) return PDOM[path.id];
    var js = [];
    var walk = function (o) { if (o && o.job && o.job.n) js.push(o.job.n); };
    (path.opts || []).forEach(walk);
    Object.keys(path.nodes || {}).forEach(function (k) { var n = path.nodes[k]; walk(n); if (n.ask) n.ask.opts.forEach(walk); });
    var s = js.join('・');
    return (PDOM[path.id] = path.id === 's7_ongaku' || MUSIC_RE.test(s) ? 'music' : path.id === 's7_gakumon' || STUDY_RE.test(s) ? 'study' : null);
  }
  function univ(L) { return /大学/.test(L.edu || '') || L.school === 'univ' || L.school === '大学'; }
  function pathGate(c, path) {
    var L = c.L, sp = SPORT_BY[path.id];
    if (sp) {
      var Y = yumeOf(L), pl = Y.pro;
      if (!pl || pl.id !== path.id || Y.proStarted || c.a < pl.age || c.s.asked === c.y) return 0;
      if (L.mode && L.mode !== 'away') return 0;
      if (!sportOk(sp, L.sex === 'f' ? 'f' : 'm', c.y)) return 0;
      Y.proStarted = c.y;
      return true;
    }
    if (path.id === 's7_gakumon' && !univ(L)) return 0;
    var d = pathDom(path);
    if (!d) return 1;
    var dr = curDream(L), dm = dr && DREAM[dr.id] && DREAM[dr.id].dom === d ? 1.8 : 1;
    return Math.exp(0.9 * z(L, d)) / Math.exp(0.405) * dm;
  }
  // プロになったかを記録に残す（筋で就いた仕事がその競技の選手の仕事になった年）
  function proCheck(L, rec) {
    var Y = L.yume;
    if (!Y || Y.proSport || !L.pathJob) return;
    var sp = SPORT_BY[L.pathJob.path];
    if (!sp || L.pathJob.n !== sp.job) return;
    L.proSport = { k: sp.k, job: sp.job, y: L.year, age: L.age };
    Y.proSport = true;
    var ev = rec && rec.events && rec.events[rec.events.length - 1];
    if (ev) (ev.ev = ev.ev || []).push({ src: 's7_prorate', name: 'この人生の作り（推計）', org: '', y: L.year, what: 'プロかトップの選手になる割合（1925年からの生まれで20歳まで生きた人）', val: '男性1.5%・女性0.8%（実際より多くして、出会いやすくしています）', est: true });
  }

  /* ---------- 17 将来の夢 ---------- */
  // dom：素養の分野（music sport study）か、仕事の種類。re：その夢がかなったとみなす仕事の名前。sv：第一生命の調査の上位にある（1989年から）
  var DREAM = {
    heitai: { n: '兵隊さん', sx: 'm', y: [1936, 1944], dom: 'other', re: /兵|軍|士官|将校/ },
    kangofu: { n: '看護婦さん', sx: 'f', y: [1936, 2001], dom: 'care', re: /看護/ },
    kangoshi: { n: '看護師さん', y: [2002, 2045], dom: 'care', re: /看護/, sv: 1 },
    sensei: { n: '学校の先生', y: [1936, 2045], dom: 'study', re: /教師|教員|訓導|教諭|校長|学校の先生/, sv: 1 },
    isha: { n: 'お医者さん', y: [1936, 2045], dom: 'study', re: /医者|医師|医院|開業医|町医者|女医/, sv: 1 },
    hakase: { n: '学者・博士', y: [1936, 2045], dom: 'study', re: /学者|研究|博士|教授/, sv: 1 },
    yakyu: { n: '野球選手', sx: 'm', y: [1936, 2045], dom: 'sport', pro: ['yakyu0', 'yakyu1', 'yakyu', 'yakyuw'], sv: 1 },
    sumo: { n: 'お相撲さん', sx: 'm', y: [1936, 1988], dom: 'sport', pro: ['sumo'] },
    soccer: { n: 'サッカー選手', y: [1975, 2045], fy: 2012, dom: 'sport', pro: ['soccer', 'soccerw'], sv: 1 },
    kashu: { n: '歌手', y: [1936, 2045], dom: 'music', re: /歌手|歌い手|演奏|音楽|楽団|バンド/, sv: 1 },
    piano: { n: 'ピアノの先生', sx: 'f', y: [1955, 2045], dom: 'music', re: /ピアノ|音楽|演奏/, sv: 1 },
    daiku: { n: '大工さん', sx: 'm', y: [1936, 2045], dom: 'craft', re: /大工|工務|建築|とび/, sv: 1 },
    untenshu: { n: '運転手さん', sx: 'm', y: [1936, 2045], dom: 'ride', re: /運転|ドライバー|運送|車掌/ },
    pilot: { n: 'パイロット', sx: 'm', y: [1955, 2045], dom: 'ride', re: /パイロット|操縦/ },
    uchu: { n: '宇宙飛行士', y: [1962, 2045], dom: 'study', re: /宇宙/ },
    manga: { n: '漫画家', y: [1955, 2045], dom: 'other', re: /漫画/ },
    oyome: { n: 'お嫁さん', sx: 'f', y: [1936, 1988], dom: 'home' },
    hanaya: { n: '花屋さん', sx: 'f', y: [1950, 2045], dom: 'shop', re: /花/, sv: 1 },
    tabemono: { n: '食べ物屋さん', y: [1989, 2045], dom: 'food', re: /料理|調理|飲食|食堂|パン|菓子|ケーキ|パティシエ|すし|そば|うどん|ラーメン|喫茶|ちゃんこ/, sv: 1 },
    patissier: { n: 'パティシエ', sx: 'f', y: [2005, 2045], dom: 'food', re: /パティシエ|菓子|ケーキ|パン/, sv: 1 },
    hobo: { n: '保母さん', sx: 'f', y: [1950, 1988], dom: 'care', re: /保母|保育|幼稚園/ },
    hoiku: { n: '保育園・幼稚園の先生', sx: 'f', y: [1989, 2045], dom: 'care', re: /保母|保育|幼稚園/, sv: 1 },
    keisatsu: { n: '警察官', sx: 'm', y: [1936, 2045], dom: 'other', re: /警察|巡査|刑事/, sv: 1 },
    stew: { n: 'スチュワーデス', sx: 'f', y: [1955, 1995], dom: 'ride', re: /客室|スチュワーデス/ },
    ca: { n: '客室乗務員', sx: 'f', y: [1996, 2045], dom: 'ride', re: /客室|スチュワーデス/ },
    kaishain: { n: '会社員', y: [2017, 2045], dom: 'office', re: /会社員|事務|営業|社員/, sv: 1 },
    douga: { n: '動画投稿者', y: [2017, 2045], dom: 'other', re: /動画|配信/, sv: 1 },
    iegyo: { n: '家の仕事を継ぐこと', y: [1936, 2045], dom: 'biz' },
    // 15歳で現実に寄せるときの夢
    tsutome: { n: '勤め人', y: [1936, 2045], dom: 'office', re: /会社員|事務|職員|公務|役場|銀行|社員|工員/, late: 1 }
  };
  function bizOf(L) {
    if (!L.old) return ['agri', 'fish', 'shop'].indexOf(L.dadJob) >= 0 ? L.dadJob : null;
    if (L.status === 'chonin') return 'shop';
    if (L.status === 'hyakusho' || (L.status === 'heimin' && (L.kind === 'village' || L.kind === 'fish'))) return L.kind === 'fish' ? 'fish' : 'agri';
    return L.parentJob && /農|漁|店|屋|商/.test(L.parentJob.n || '') ? 'shop' : null;
  }
  function dreamOk(id, L, y) {
    var D = DREAM[id];
    if (!D || D.late || y < D.y[0] || y > D.y[1]) return false;
    if (D.sx && D.sx !== L.sex) return false;
    if (D.fy && L.sex === 'f' && y < D.fy) return false;
    if (id === 'iegyo' && !bizOf(L)) return false;
    return true;
  }
  // おまかせの重み：素養・家の仕事・時代（1989年からは調査の上位の顔ぶれを少し多めに）。重みは作りの目安で、統計の割合ではない
  function dreamW(id, L, y) {
    var D = DREAM[id], w = 1;
    if (DOM.indexOf(D.dom) >= 0) w *= Math.exp(0.9 * z(L, D.dom));
    if (id === 'iegyo') w *= 1.5;
    if (y >= 1989 && D.sv) w *= 1.4;
    var pj = (L.parentJob && L.parentJob.n) || (L.dadJobD && L.dadJobD.n) || '';
    if (D.re && pj && D.re.test(pj)) w *= 2.5; // 親の仕事と同じ夢
    return w;
  }
  function drawDreams(L, y, r, n, not) {
    var ids = Object.keys(DREAM).filter(function (k) { return dreamOk(k, L, y) && k !== not; }), out = [];
    while (out.length < n && ids.length) {
      var t = 0; ids.forEach(function (k) { t += dreamW(k, L, y); });
      var u = r() * t, pk = ids[ids.length - 1];
      for (var i = 0; i < ids.length; i++) { u -= dreamW(ids[i], L, y); if (u < 0) { pk = ids[i]; break; } }
      out.push(pk); ids.splice(ids.indexOf(pk), 1);
    }
    return out;
  }
  function yumeOf(L) { return (L.yume = L.yume || {}); }
  function curDream(L) { return L.dream15 || L.dream10 || null; }
  function dreamName(L, id) { if (id === 'iegyo') { var b = bizOf(L); return b === 'agri' ? '家の田畑を継ぐこと' : b === 'fish' ? '家の漁を継ぐこと' : '家の店を継ぐこと'; } return DREAM[id].n; }
  function quoted(n) { return '「' + n + '」'; }
  function phrase(id, n) { return id === 'iegyo' ? n.replace(/こと$/, '') : n + 'になる'; }
  function setDream10(c, id, auto) {
    var L = c.L;
    L.dream10 = { id: id, name: dreamName(L, id), y: c.y, dom: DREAM[id].dom };
    var n = L.dream10.name, D = DREAM[id];
    var t = auto ? nm(L) + 'は、大きくなったら' + phrase(id, n) + 'のだと話していた。'
      : one(c.r, [nm(L) + 'は、学校の作文の「将来の夢」に' + quoted(n) + 'と書いた。', nm(L) + 'は、10歳の誕生日に「大きくなったら' + phrase(id, n) + '」と家族に宣言した。']);
    c.say(t, D.dom === 'sport' ? { sat: 2, body: 1 } : D.dom === 'study' ? { sat: 2, learn: 1 } : D.dom === 'music' ? { sat: 3 } : { sat: 2, tie: 1 }, '家庭');
  }
  function dream10(c) {
    var L = c.L, Y = c.s.yume;
    if (Y.d10 || L.by < 1926 || c.a < 10) return;
    Y.d10 = c.y;
    var r = rFor(L, 0x800), ids = drawDreams(L, c.y, r, 3);
    if (!ids.length) return;
    if (c.a > 10 || c.s.asked === c.y || (L.mode && L.mode !== 'away')) { setDream10(c, ids[0], true); return; }
    c.ask('yume10', '将来の夢', nm(L) + 'は10歳になった。学校で「大きくなったら何になりたいか」と聞かれた。何と答える？', ids.map(function (id) {
      return { k: id, l: dreamName(L, id).replace(/こと$/, '') + (id === 'iegyo' ? '' : 'になりたい'), w: dreamW(id, L, c.y), f: DREAM[id].dom === 'study' ? ['study'] : DREAM[id].dom === 'sport' ? ['body'] : id === 'iegyo' ? ['family'] : ['earn'], h: '夢に合わせて、習い事や進路の道が変わる' };
    }), { ids: ids });
    // 答えが出るまでのあいだも夢を持たせておく（選ばれたら書きかえる）
    L.dream10 = { id: ids[0], name: dreamName(L, ids[0]), y: c.y, dom: DREAM[ids[0]].dom, pending: true };
  }
  function dream15(c) {
    var L = c.L, Y = c.s.yume;
    if (Y.d15 || !L.dream10 || c.a < 15 || c.a > 16) return;
    if (c.s.asked === c.y && c.a === 15) return; // 翌年に回す
    Y.d15 = c.y;
    var r = rFor(L, 0x900), d0 = L.dream10, alt = drawDreams(L, c.y, r, 1, d0.id)[0];
    var real = bizOf(L) && d0.id !== 'iegyo' ? 'iegyo' : 'tsutome';
    var fit = DOM.indexOf(d0.dom) >= 0 ? Math.exp(0.9 * z(L, d0.dom)) : 1;
    var opts = [{ k: 'keep', l: '同じ夢を追う', w: 1.2 * fit, f: ['study'], h: '夢は変わらない' }];
    if (alt) opts.push({ k: 'alt', l: alt === 'iegyo' ? '家を継ぐ道に進む' : dreamName(L, alt) + 'を目指す', w: dreamW(alt, L, c.y), f: ['earn'], h: '新しい夢に向かう' });
    opts.push({ k: 'real', l: '身近な仕事を考える', w: 0.8, f: ['family', 'save'], h: '夢をしまい、地に足をつける' });
    var data = { alt: alt, real: real };
    if (c.s.asked === c.y || (L.mode && L.mode !== 'away')) { pick15(c, 'keep', data, true); return; }
    c.ask('yume15', '夢は変わったか', '15歳になった' + nm(L) + 'は、10歳のころの夢' + quoted(d0.name) + 'を思い出した。今の夢は？', opts, data);
  }
  function pick15(c, k, d, auto) {
    var L = c.L, d0 = L.dream10;
    if (k === 'keep') {
      c.say('15歳になっても、' + phrase(d0.id, d0.name) + 'という夢は変わらなかった。', auto ? { sat: 1 } : { sat: 2, learn: 1, tie: -1 }, '人間関係');
      if (DOM.indexOf(d0.dom) >= 0) grow(L, d0.dom, 3);
      return;
    }
    var id = k === 'alt' && d.alt ? d.alt : d.real;
    L.dream15 = { id: id, name: dreamName(L, id), y: c.y, dom: DREAM[id].dom, why: k };
    if (k === 'alt') c.say('15歳の' + nm(L) + 'の夢は、' + quoted(d0.name) + 'から' + quoted(L.dream15.name) + 'に変わった。', { sat: 2, learn: 1, tie: -1 }, '人間関係');
    else c.say(nm(L) + 'は' + quoted(d0.name) + 'という夢を胸にしまい、' + (id === 'iegyo' ? '家の仕事を継ぐことを' : '堅い勤め口を') + '考えるようになった。', { tie: 2, sat: -1 }, '人間関係');
  }

  /* 習い事・部活・高校・その先：夢に合う道を必ず1つ入れ、ほかの道を1つ、何もしない答えを1つ */
  // [鍵, 答えの文, 分野, 年 [始め, 終わり], 性別, 選んだあとの文]
  var LESSON = [
    ['piano', 'ピアノを習う', 'music', [1950, 2045], null, '{n}は週に一度、近所のピアノ教室に通い始めた。'],
    ['koto', '琴を習う', 'music', [1936, 1965], 'f', '{n}は近所のお師匠さんのもとで、琴を習い始めた。'],
    ['swim', 'スイミングに通う', 'sport', [1970, 2045], null, '{n}は週に二度、スイミングスクールに通い始めた。'],
    ['yakyudan', '野球の少年団に入る', 'sport', [1955, 2045], 'm', '{n}は野球の少年団に入り、日曜日はグラウンドで過ごした。'],
    ['soccerdan', 'サッカーの少年団に入る', 'sport', [1970, 2045], null, '{n}はサッカーの少年団に入り、泥だらけで帰ってくるようになった。'],
    ['kendo', '剣道の道場に通う', 'sport', [1953, 2045], null, '{n}は剣道の道場に通い、大きな声で素振りをした。'],
    ['soroban', 'そろばん塾に通う', 'study', [1936, 2045], null, '{n}はそろばん塾に通い、珠をはじく音に夢中になった。'],
    ['shuji', '習字を習う', 'study', [1936, 2045], null, '{n}は習字の教室に通い、墨のにおいに包まれて筆を動かした。'],
    ['juku', '学習塾に通う', 'study', [1965, 2045], null, '{n}は学校帰りに学習塾へ通うようになった。'],
    ['eikaiwa', '英会話を習う', 'study', [1970, 2045], null, '{n}は英会話の教室に通い、外国の先生と話すようになった。']
  ];
  var CLUB = [
    ['yakyubu', '野球部に入る', 'sport', [1948, 2045], 'm', '{n}は野球部に入り、日が暮れるまで球を追った。'],
    ['soccerbu', 'サッカー部に入る', 'sport', [1965, 2045], null, '{n}はサッカー部に入り、朝練に通った。'],
    ['rikujobu', '陸上部に入る', 'sport', [1948, 2045], null, '{n}は陸上部に入り、毎日グラウンドを走った。'],
    ['volleybu', 'バレー部に入る', 'sport', [1948, 2045], null, '{n}はバレー部に入り、体育館で声を張り上げた。'],
    ['suisogaku', '吹奏楽部に入る', 'music', [1950, 2045], null, '{n}は吹奏楽部に入り、楽器の音を合わせる楽しさを知った。'],
    ['gassho', '合唱部に入る', 'music', [1948, 2045], null, '{n}は合唱部に入り、放課後の音楽室で歌った。'],
    ['kagaku', '科学部に入る', 'study', [1948, 2045], null, '{n}は科学部に入り、放課後は理科室で実験をした。'],
    ['kateika', '家庭科部に入る', 'food', [1948, 2045], null, '{n}は家庭科部に入り、料理やお菓子を作った。']
  ];
  var KOKO = [
    ['futsu', '普通科で学ぶ', 'study', [1948, 2045], null, '{n}は高校の普通科で、大学を目指して勉強した。'],
    ['shogyo', '商業科で学ぶ', 'office', [1948, 2045], null, '{n}は商業科で、簿記やそろばんを学んだ。'],
    ['kogyo', '工業科で学ぶ', 'craft', [1948, 2045], null, '{n}は工業科で、機械や電気の実習に打ちこんだ。'],
    ['sports', 'スポーツの強い高校に行く', 'sport', [1960, 2045], null, '{n}はスポーツの強い高校に進み、寮で練習漬けの日々を送った。'],
    ['ongaku', '音楽科で学ぶ', 'music', [1950, 2045], null, '{n}は音楽科のある高校に進み、毎日楽器の練習をした。'],
    ['eisei', '衛生看護科で学ぶ', 'care', [1964, 2045], 'f', '{n}は衛生看護科に進み、看護の基本を学んだ。'],
    ['kasei', '家政科で学ぶ', 'food', [1948, 2045], 'f', '{n}は家政科で、料理や裁縫を学んだ。']
  ];
  var DAIGAKU = [
    ['kyoiku', '教育学部に進む', 'study', [1949, 2045], null, '{n}は教育学部で、先生になるための勉強を始めた。'],
    ['rigaku', '理学部に進む', 'study', [1949, 2045], null, '{n}は理学部に進み、実験とレポートに追われた。'],
    ['igaku', '医学部を目指す', 'study', [1949, 2045], null, '{n}は医学部に進み、長い勉強の日々が始まった。'],
    ['taiiku', '体育学部に進む', 'sport', [1949, 2045], null, '{n}は体育学部に進み、競技と勉強を両立した。'],
    ['ondai', '音楽大学に進む', 'music', [1949, 2045], null, '{n}は音楽大学に進み、一日じゅう練習室にこもった。'],
    ['keizai', '経済学部に進む', 'office', [1949, 2045], null, '{n}は経済学部に進み、ゼミの仲間と議論を重ねた。'],
    ['kango', '看護学部に進む', 'care', [1990, 2045], null, '{n}は看護学部に進み、病院での実習に通った。'],
    ['kasei2', '家政学部に進む', 'food', [1949, 2045], null, '{n}は家政学部に進み、栄養や調理を学んだ。']
  ];
  var SENMON = [
    ['chori', '調理や製菓の学校に行く', 'food', [1976, 2045], null, '{n}は調理と製菓の専門学校に通い、包丁さばきを覚えた。'],
    ['kango2', '看護の学校に行く', 'care', [1976, 2045], null, '{n}は看護の専門学校に通い、実習で病棟を回った。'],
    ['hoiku', '保育の学校に行く', 'care', [1976, 2045], null, '{n}は保育の専門学校に通い、ピアノと手遊びを練習した。'],
    ['ongaku2', '音楽の学校に行く', 'music', [1976, 2045], null, '{n}は音楽の専門学校に通い、仲間と演奏を重ねた。'],
    ['sports2', 'スポーツの学校に行く', 'sport', [1990, 2045], null, '{n}はスポーツの専門学校に通い、トレーナーの勉強をした。'],
    ['joho', '情報処理の学校に行く', 'study', [1980, 2045], null, '{n}は情報処理の専門学校に通い、プログラムを書く練習をした。']
  ];
  var KIND_ITEMS = { narai: LESSON, bukatsu: CLUB, koko: KOKO, daigaku: DAIGAKU, senmon: SENMON };
  // 夢の仕事の種類と道の分野が合うか（care には看護・保育、study には先生・医者・学者 など）
  function dreamDom(L) { var d = curDream(L); return d ? (d.dom === 'biz' ? 'office' : d.dom) : null; }
  function itemsOk(list, L, y) { return list.filter(function (o) { return y >= o[3][0] && y <= o[3][1] && (!o[4] || o[4] === L.sex); }); }
  // 習い事に通えるか（家の暮らし向き・時代・身分。目安で、統計の割合ではない）
  function chance(L, y) {
    var inc = L.incPct == null ? 0.5 : L.incPct;
    var p = 0.15 + 0.6 * inc + (y >= 1965 ? 0.2 : 0) - (y < 1950 ? 0.1 : 0);
    if (L.old && (L.status === 'kuge' || L.status === 'shizoku')) p += 0.15;
    if (L.old && L.kind === 'village' && y < 1960) p -= 0.1;
    return clamp(p, 0.05, 0.9);
  }
  var NONE = { narai: ['習い事はしない', '{n}は習い事はせず、日が暮れるまで外で遊んだ。'], bukatsu: ['部活に入らず家を手伝う', '{n}は部活には入らず、放課後は家の手伝いをした。'],
    koko: null, daigaku: null, senmon: null };
  var TITLE = { narai: '習い事', bukatsu: '中学の部活', koko: '高校の学科', daigaku: '大学の学部', senmon: '専門学校' };
  var Q = { narai: '{n}に、何か習い事をさせようかと家で話が出た。どうする？', bukatsu: '中学校に入った{n}は、部活を決めることになった。どうする？', koko: '高校に入る{n}は、どの学科に進むか決めることになった。どうする？',
    daigaku: '{n}は、大学で何を学ぶか決めることになった。どうする？', senmon: '{n}は、専門学校で何を学ぶか決めることになった。どうする？' };
  var FXK = { music: { sat: 3, learn: 1, body: -1, tie: -1 }, sport: { body: 3, sat: 1, learn: -1, tie: -1 }, study: { learn: 3, sat: -1, tie: -1 }, none: { tie: 2, body: 1, learn: -1 } };
  function fxOf(dom, i) { return FXK[dom] || [{ tie: 2, learn: 1, sat: -1, body: -1 }, { sat: 2, tie: 1, learn: -1, body: -1 }][i % 2]; }
  function branch(c, kind) {
    var L = c.L, Y = c.s.yume, r = rFor(L, 0xA00 + kind.length * 31 + c.y);
    var items = itemsOk(KIND_ITEMS[kind], L, c.y);
    if (!items.length) return false;
    var dd = dreamDom(L), match = items.filter(function (o) { return o[2] === dd; }), others = items.filter(function (o) { return o[2] !== dd; });
    var shown = [];
    if (match.length) shown.push(one(r, match));
    // 夢に合う道が無いときは、素養の高い分野の道を先に出す
    else { var bd = DOM.slice().sort(function (a, b) { return eff(L, b) - eff(L, a); })[0], bm = items.filter(function (o) { return o[2] === bd; }); if (bm.length) shown.push(one(r, bm)); }
    var rest = others.filter(function (o) { return shown.indexOf(o) < 0; });
    if (rest.length) shown.push(one(r, rest));
    if (!NONE[kind]) { var rest2 = rest.filter(function (o) { return shown.indexOf(o) < 0; }); if (rest2.length && shown.length < 3) shown.push(one(r, rest2)); }
    if (shown.length < 2 && !NONE[kind]) return false;
    var opts = shown.map(function (o, i) {
      var w = (o[2] === dd ? 2 : 1) * (DOM.indexOf(o[2]) >= 0 ? Math.exp(0.6 * z(L, o[2])) : 1);
      return { k: o[0], l: o[1], w: w, f: o[2] === 'study' ? ['study'] : o[2] === 'sport' ? ['body'] : ['earn'], h: o[2] === dd ? '夢に近づく道' : 'ほかの道を試す' };
    });
    if (NONE[kind]) opts.push({ k: 'none', l: NONE[kind][0], w: 1, f: ['family', 'save'], h: 'お金はかからないが、腕は伸びない' });
    (Y.shown = Y.shown || []).push({ kind: kind, y: c.y, dream: dd, doms: shown.map(function (o) { return o[2]; }) });
    c.ask('yume_' + kind, TITLE[kind], Q[kind].replace('{n}', nm(L)), opts, { kind: kind });
    return true;
  }
  function pickBranch(c, k) {
    var L = c.L, kind = c.d.kind, o = KIND_ITEMS[kind].filter(function (x) { return x[0] === k; })[0];
    if (k === 'none' || !o) { c.say(NONE[kind][1].replace('{n}', nm(L)), FXK.none, '家庭'); return; }
    var dom = o[2], fx = fxOf(dom, k.length);
    var inc = L.incPct == null ? 0.5 : L.incPct;
    if (DOM.indexOf(dom) >= 0) grow(L, dom, kind === 'narai' ? Math.round(5 + 5 * inc) : 5);
    if (kind === 'narai') c.money({ f: -0.02 });
    var say = o[5].replace('{n}', nm(L));
    (c.s.yume.took = c.s.yume.took || []).push({ kind: kind, k: k, dom: dom, y: c.y });
    c.say(say, fx, kind === 'narai' || kind === 'bukatsu' ? '家庭' : '学歴と仕事');
  }
  function lessonsYear(c) {
    var L = c.L, Y = c.s.yume;
    if (c.y < 1936 || L.by < 1926 || (L.mode && L.mode !== 'away') || c.s.asked === c.y) return;
    if (L.dream10 && !Y.narai && c.a >= 11 && c.a <= 12) { if (rFor(L, 0xB00)() < chance(L, c.y)) { if (branch(c, 'narai')) Y.narai = c.y; } else Y.narai = -1; if (c.s.asked === c.y) return; }
    if (!Y.bukatsu && c.y >= 1948 && c.a >= 12 && c.a <= 13 && (!L.old || L.school === '中学校' || /中学/.test(L.edu || '') || L.school === '旧制中学')) { if (branch(c, 'bukatsu')) Y.bukatsu = c.y; if (c.s.asked === c.y) return; }
    if (!Y.koko && c.y >= 1948 && c.a >= 15 && c.a <= 16 && (L.school === '高校' || L.school === 'hs')) { if (branch(c, 'koko')) Y.koko = c.y; if (c.s.asked === c.y) return; }
    if (!Y.shinro && c.y >= 1949 && c.a >= 18 && c.a <= 19) {
      if (L.school === '大学' || L.school === 'univ') { if (branch(c, 'daigaku')) Y.shinro = c.y; }
      else if ((L.school === 'voc' || L.school === '短大' || L.school === 'jc') && c.y >= 1976) { if (branch(c, 'senmon')) Y.shinro = c.y; }
    }
  }

  // 30歳ごろ：夢がかなったか
  function jobOf(L) {
    if (L.proSport && L.pathJob && L.pathJob.n === L.proSport.job) return L.proSport.job;
    if (L.selfJob && L.selfJob.n) return L.selfJob.n;
    if (L.job && L.job.label) return L.job.label;
    if (L.lastJob) return L.lastJob;
    if (L.old && L.parentJob && L.parentJob.n) return L.parentJob.n;
    return null;
  }
  function jobsEver(L) { return [L.selfJob && L.selfJob.n, L.job && L.job.label, L.lastJob, L.pathJob && L.pathJob.n, L.proSport && L.proSport.job].filter(Boolean).join('・'); }
  function came(L, d) {
    if (!d) return null;
    var D = DREAM[d.id];
    if (!D) return null;
    if (D.pro) return !!(L.proSport && D.pro.indexOf(L.proSport.k) >= 0);
    if (d.id === 'oyome') return !!(L.everMarried || L.married);
    if (d.id === 'iegyo') { var j = jobsEver(L); return /継/.test(j) || (L.old && !L.selfJob && !L.lastJob) || (!L.old && L.job && L.job.ind === L.dadJob); }
    return !!(D.re && D.re.test(jobsEver(L)));
  }
  function kanauLine(c) {
    var L = c.L, Y = c.s.yume;
    if (Y.kanau || !L.dream10 || c.a < 30 || c.a > 34) return;
    Y.kanau = c.y;
    var d = curDream(L), ok = came(L, d), ok10 = came(L, L.dream10), n = d.name;
    var t;
    if (ok) t = one(c.r, ['子どものころの夢だった' + quoted(n) + 'を、本当にかなえていた。', '作文に書いた' + quoted(n) + 'という夢を、気がつけばかなえていた。']);
    else if (L.dream15 && ok10) t = '15歳で一度は別の夢を選んだが、結局は10歳のころの夢' + quoted(L.dream10.name) + 'の道を歩んでいた。';
    else t = one(c.r, ['10歳のころの夢は' + quoted(n) + 'だった。夢とは違う道だったが、今の暮らしにも誇りを持てるようになった。', quoted(n) + 'という夢はかなわなかった。ときどき、あのころの自分を思い出した。', '子どものころの夢' + quoted(n) + 'は、心の中にしまったままだった。']);
    L.dreamCame = !!(ok || ok10);
    c.say(t, ok ? { sat: 4 } : { sat: 1, learn: 1 }, '人間関係');
  }

  /* ---------- 物語へのつなぎこみ ---------- */
  function register(S) {
    if (!S || !S.addArc || (S.ext && S.ext.yume)) return;
    if (S.ext) S.ext.yume = true;
    var n0 = S.arcs.length;
    // 毎年いちばん先に確かめる（once の筋として、ほかの出来事の筋より前）。始めても false を返し、ほかの出来事の筋は翌年に回る形にする
    S.addArc({ id: 'yume', once: true, modeOk: true, start: function (c) {
      var s = c.s;
      if (!c.L.alive || c.a < 1) return false;
      s.yume = s.yume || {};
      if (s.yume.t === c.y) return false;
      s.yume.t = c.y;
      ensure(c.L);
      likeLine(c);
      if (c.L.by >= 1926) {
        if (c.a >= 10 && c.a <= 11) dream10(c);
        if (c.a >= 15 && c.a <= 16) dream15(c);
        if (c.a >= 11 && c.a <= 19) lessonsYear(c);
        if (c.a >= 30 && c.a <= 34) kanauLine(c);
      }
      return false;
    } });
    var res10 = {}, res15 = {}, resB = {};
    Object.keys(DREAM).forEach(function (id) { res10[id] = function (c) { setDream10(c, id, false); }; });
    ['keep', 'alt', 'real'].forEach(function (k) { res15[k] = function (c) { pick15(c, k, c.d || {}, false); }; });
    Object.keys(KIND_ITEMS).forEach(function (kind) { KIND_ITEMS[kind].forEach(function (o) { resB[o[0]] = function (c) { pickBranch(c, o[0]); }; }); });
    resB.none = function (c) { pickBranch(c, 'none'); };
    S.addArc({ id: 'yume10', res: res10 });
    S.addArc({ id: 'yume15', res: res15 });
    Object.keys(KIND_ITEMS).forEach(function (kind) { S.addArc({ id: 'yume_' + kind, res: resB }); });
    // つないだ筋を先頭へ
    var mine = S.arcs.splice(n0, S.arcs.length - n0);
    for (var i = mine.length - 1; i >= 0; i--) S.arcs.unshift(mine[i]);
    S.pathGate = pathGate;
    // 毎年のあと・分かれ道の答えのあと：素養を決め、14歳でプロの選手になるかを決め、プロになった年を記録する
    var year0 = S.year, res0 = S.resolve, rec0 = S.houseRec, desc0 = S.applyDescend;
    S.year = function (L, rec, api) {
      var out = year0(L, rec, api);
      if (L && L.alive) {
        ensure(L);
        var st = L.story;
        if (st && !st.aptTal) { st.aptTal = 1; st.tal.music = (L.apt.music - MEAN) / SD; st.tal.sport = (L.apt.sport - MEAN) / SD; st.tal.brain = (L.apt.study - MEAN) / SD; }
        proPlan(L);
        proCheck(L, rec);
      }
      return out;
    };
    S.resolve = function (L, rec, br, answers, api) {
      var k = res0(L, rec, br, answers, api);
      if (br && br.ra === 'yume10' && L.dream10) delete L.dream10.pending;
      proCheck(L, rec);
      return k;
    };
    S.houseRec = function (L) { var r = rec0(L); r.apt = houseApt(L); return r; };
    S.applyDescend = function (L, rec) { var o = desc0(L, rec); if (rec && rec.apt) { L.houseApt = rec.apt; var hl = houseLine(rec); if (hl) L.descendLine = (L.descendLine || '') + hl; } return o; };
  }

  /* ---------- 画面のための一行 ---------- */
  // 終わりの画面・Japapedia：{ dream10: {name, y}, dream15: {name, y} | null, job: 実際の仕事 | null, came: かなったか（30歳まで生きていなければ null）, text: 1文 }
  function dreamLine(L) {
    if (!L || !L.dream10) return null;
    var d10 = { name: L.dream10.name, y: L.dream10.y }, d15 = L.dream15 ? { name: L.dream15.name, y: L.dream15.y } : null;
    var job = jobOf(L), ok = L.dreamCame != null ? L.dreamCame : (L.deathAge != null && L.deathAge >= 22 ? !!(came(L, L.dream10) || came(L, L.dream15)) : null);
    var t = '10歳の夢は' + quoted(d10.name) + (d15 ? '（15歳で' + quoted(d15.name) + 'に）' : '') + '。' + (job ? '実際の仕事は' + quoted(job) + 'でした。' : '');
    return { dream10: d10, dream15: d15, job: job, came: ok, text: t };
  }
  // 素養の数（終わりの画面などで使うとき）：{ music, sport, study } 生まれ持ったもの、grown は練習で伸びた分
  function aptOf(L) { if (!L || !L.apt) return null; return { music: L.apt.music, sport: L.apt.sport, study: L.apt.study, grown: L.aptG || null }; }

  var API = { register: register, dreamLine: dreamLine, aptOf: aptOf, childApt: childApt, popApt: popApt, H2: H2, SPORT: SPORT, DREAM: DREAM, came: came, eff: eff, ensure: ensure, houseApt: houseApt, houseLine: houseLine };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.IchiokuYume = API;
  if (root.IchiokuStory) register(root.IchiokuStory);
})(typeof self !== 'undefined' ? self : this);
