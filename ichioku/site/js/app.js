/* 1000分の1 画面の動き */
(function () {
  'use strict';
  var E = window.Ichioku, O = window.IchiokuOld, M = E;
  var H = null; // 1975年より前の生まれのための束（data/history.json。必要になったときに取り出す）
  var BASE_MS = 7000;          // 1年あたりの表示時間（1倍のとき）。約80年で約10分
  var SPEEDS = [1, 2, 4, 8, 12, 16];
  var C = null, prefCache = {}, P = null, L = null, cur = null;
  var timer = null, paused = false, speedIdx = 0, sheetPaused = false, auto = 0;

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  // 授業用の表示では、つらい出来事を短い一行にする
  // 出来事の文は原作にならって丁寧体（です・ます）で出す
  function pol(t) { return window.IchiokuPolite ? window.IchiokuPolite.polite(t) : t; }
  function evText(e) { return pol(e.t); }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function show(name) {
    ['top', 'birth', 'life', 'end', 'jp'].forEach(function (s) { $('screen-' + s).hidden = s !== name; });
    $('life-top').hidden = name === 'top' || name === 'life';
    var pv = store('ichioku-prev');
    $('back-top').hidden = !(pv && pv.seed);
    Array.prototype.forEach.call(document.querySelectorAll('[data-back-prev]'), function (b) { b.hidden = !(pv && pv.seed); });
    // 画面ごとの幅（v18：パソコンでは人生・生まれ・最期の画面を広く使う）
    document.body.setAttribute('data-screen', name);
    if ($('to-up')) $('to-up').hidden = true;
    if (name === 'life') syncPanes();
    window.scrollTo(0, 0);
  }
  function store(key, value) {
    try { if (value === undefined) return JSON.parse(localStorage.getItem(key) || 'null'); localStorage.setItem(key, JSON.stringify(value)); } catch (e) { return null; }
    return null;
  }
  function randomSeed() {
    try { var a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] || 1; } catch (e) { return (Math.random() * 4294967295) >>> 0 || 1; }
  }

  /* ---------- データの取り出し ---------- */
  function getJSON(url) {
    return fetch(url).then(function (r) { if (!r.ok) throw new Error(url + ' ' + r.status); return r.json(); });
  }
  function getPref(code) {
    if (prefCache[code]) return Promise.resolve(prefCache[code]);
    return getJSON('data/pref/' + code + '.json').then(function (p) { prefCache[code] = p; return p; });
  }

  function getHistory() {
    if (H) return Promise.resolve(H);
    return getJSON('data/history.json').then(function (h) { H = h; return h; });
  }
  // 年号（1975年より前の生まれでは束の一覧、それ以外は昭和からの一覧）
  var ERAS_NEW = [[1926, '昭和'], [1989, '平成'], [2019, '令和']];
  function eraOf(y) {
    var list = H ? H.eras : ERAS_NEW, e = null;
    for (var i = 0; i < list.length; i++) if (list[i][0] <= y) e = list[i];
    if (!e) return '';
    var n = y - e[0] + 1;
    return e[1] + (n === 1 ? '元' : n) + '年';
  }

  /* ---------- トップ ---------- */
  function initTop() {
    // 「生まれる」が押せるようになったら、字体を読み始める（それまでは回線を空けておく。v19 12）
    if (!initTop.ready) { initTop.ready = 1; try { document.dispatchEvent(new Event('ichioku-ready')); } catch (e) { /* 古い端末 */ } }
    $('born').disabled = false;
    $('born').textContent = '生まれる';
    $('born').onclick = born;
    initPast();
  }

  /* ---------- 人生を作る・作り直す ---------- */
  // 記録するのは「種の数・分かれ道で選んだ答え・印」だけ。開き直すときは同じ種で人生を作り直す
  // 記録：{ v: 2, seed, year, answers, marks, focus, auto, shown, house: { chain: [{ memberId, answers, marks, focus }] } }
  // 2人目からの人生は、1人目の種ときょうだいの番号から決まる。新しい乱数は保存しない（作る人の指示書「きょうだいとして生きる」5）
  var G = null;
  var houseLives = []; // この家で終えた人生（いま遊んでいる人より前の人）
  function seg() { return G && G.house && G.house.chain.length ? G.house.chain[G.house.chain.length - 1] : G; }
  function lifeSeedOf(g, memberId) { return ((g.seed ^ Math.imul(memberId, 0x9e3779b1)) >>> 0) || 1; }
  function yearOfSeed(seed) { var r = C.meta.birthRange; return r[0] + Math.floor(E.makeRng(seed ^ 0x51ed270b)() * (r[1] - r[0] + 1)); }
  // 時代ごとに分けたデータ（v19 12）：作った版（dist）では、抽選で生まれ年が決まってから、その時代の分だけ読む。
  // ほかの時代の分は、人生が始まってしばらくしてから読んでおく（続きの人生・たどる・続きからの前に必ずそろえる）
  function dataFor(y0, y1) { return window.IchiokuData ? window.IchiokuData.need(y0, y1) : Promise.resolve(); }
  function dataAll() { return window.IchiokuData ? window.IchiokuData.needAll() : Promise.resolve(); }
  function laterData() { if (window.IchiokuData) setTimeout(function () { dataAll().catch(function () { /* 次に要るときに読み直す */ }); }, 6000); }
  function makeLife(seed) {
    var year = yearOfSeed(seed);
    var ready = year >= 1975 ? Promise.resolve({ pref: E.pickPref(C, year, E.makeRng(seed ^ 0x9e3779b9)) }) :
      getHistory().then(function (h) { return O.pickBirth(C, h, year, E.makeRng(seed ^ 0x9e3779b9)); });
    return ready.then(function (b) { return getPref(b.pref).then(function (p) { return { b: b, p: p }; }); }).then(function (x) {
      P = x.p;
      if (year >= 1975) { M = E; L = E.newLife(C, P, { year: year, seed: seed }); }
      else { M = O; L = O.newLife(C, H, P, { year: year, seed: seed, birth: x.b }); }
      L.marks = {};
      // 試験用：?force=shukke で出家の分かれ道を必ず出す（ブラウザの受け入れ試験で使う）
      try { if (/[?&]force=shukke\b/.test(location.search)) L.testForce = { shukke: 1 }; } catch (e) { /* 読めない環境 */ }
      return makeComps(seed, year).then(function () { return L; });
    });
  }
  // 記録した答えをたどって、shown の年まで進める。答えが尽きたところの分かれ道はそのまま返す
  // 重点の記録（[年, 重点] の並び）から、その年の重点を決める
  function focusAt(g, y) {
    var f = null;
    (g.focus || []).forEach(function (x) { if (x[0] <= y) f = x[1]; });
    return f;
  }
  // 分かれ道に答える。おまかせで選んだ答えには _auto、統計どおりに任せた答えには _none の印が付いている
  function answerBranch(r, a) {
    var br = r.branch, real = a && a._none ? null : a;
    if (real && real._auto) { real = {}; for (var k in a) if (k.charAt(0) !== '_') real[k] = a[k]; }
    var nr = M.resolve(L, real);
    if (a && a._auto) {
      var labels = (br.groups || []).map(function (g) {
        var o = real && g.options.filter(function (x) { return x.k === real[g.id]; })[0];
        return o ? o.l : 'なりゆき';
      });
      (r.autoPicked = r.autoPicked || []).push(br.title + '（' + (labels.length ? labels.join('・') : 'なりゆき') + '）');
    }
    return nr;
  }
  /* ---------- 同じ日に日本で生まれた4人（同じ統計で並べて進める。答えはすべて統計どおり） ---------- */
  var comps = [];
  function compSeed(seed, i) { return ((Math.imul(seed >>> 0, 2654435761) + Math.imul(i + 1, 0x9e3779b9)) >>> 0) || (i + 1); }
  function makeComps(seed, year) {
    comps = [];
    var jobs = [0, 1, 2, 3].map(function (i) {
      var s = compSeed(seed, i);
      var ready = year >= 1975 ? Promise.resolve({ pref: E.pickPref(C, year, E.makeRng(s ^ 0x9e3779b9)) }) :
        getHistory().then(function (h) { return O.pickBirth(C, h, year, E.makeRng(s ^ 0x9e3779b9)); });
      return ready.then(function (b) {
        return getPref(b.pref).then(function (p) {
          var c = year >= 1975 ? E.newLife(C, p, { year: year, seed: s }) : O.newLife(C, H, p, { year: year, seed: s, birth: b });
          c.M = year >= 1975 ? E : O;
          return c;
        });
      });
    });
    return Promise.all(jobs).then(function (list) { comps = list; return list; }).catch(function () { comps = []; return []; });
  }
  // year の年の終わりまで進める（その年がまだ途中でも、4人は1年分まとめて進む）
  function stepComps(year) {
    comps.forEach(function (c) {
      var guard = 0;
      while (c.alive && c.year <= year && guard++ < 130) {
        var r = c.M.step(c);
        while (r && r.branch) r = c.M.resolve(c, null);
      }
    });
  }
  function compState(c) {
    if (!c.alive) return c.deathAge + '歳で亡くなった（' + c.deathYear + '年）';
    var a = c.year - c.by - 1, parts = [];
    if (a < 6) parts.push('幼い子ども');
    else if (c.school) parts.push('学校に通っている');
    else if (c.job && c.job !== 'home' && c.stage !== 'retired') parts.push(c.lastJob || '働いている');
    else if (c.stage === 'retired') parts.push('仕事を退いた');
    else parts.push('家で暮らしている');
    if (c.married) parts.push('結婚している');
    var k = c.members.filter(function (m) { return m.role === '子' && m.by < c.year; }).length;
    if (k) parts.push('子ども' + k + '人');
    return parts.join('・');
  }
  function renderComps(listId, showAge) {
    var ul = $(listId);
    if (!ul) return;
    clear(ul);
    comps.forEach(function (c) {
      var last = c.log[c.log.length - 1];
      var li = el('li', c.alive ? '' : 'gone');
      var age = c.alive ? (c.year - c.by - 1) + '歳' : c.deathAge + '歳';
      li.appendChild(el('span', 'ca', showAge ? age : (c.sex === 'm' ? '男' : '女')));
      li.appendChild(el('span', 'cp', (c.name || '') + '　' + (last ? last.place : '')));
      li.appendChild(el('span', 'cs', compState(c)));
      ul.appendChild(li);
    });
  }

  function replayTo(g, untilYear) {
    var i = 0, r = null;
    while (L.alive) {
      L.focus = focusAt(g, L.year);
      r = M.step(L);
      while (r && r.branch && i < g.answers.length) { L.focus = focusAt(g, L.year); r = answerBranch(r, g.answers[i++]); }
      if (r && r.branch) break;
      if (untilYear != null && r && r.year >= untilYear) break;
      if (untilYear == null && !L.alive) break;
    }
    return r;
  }
  function saveCurrent() { if (G && L && L.alive && !G.done) { G.shown = cur ? cur.year : L.by; store('ichioku-current', G); } }

  /* ---------- きょうだいとして生きる：家の人生を順にたどる ---------- */
  // 前の人が亡くなるまでの年は、画面に出さずに統計どおりに進める（分かれ道は統計どおり・節目の問いかけは空の答え）
  function preRun(start) {
    var guard = 0;
    while (L.alive && L.year < start && guard++ < 130) {
      var r = M.step(L);
      while (r && r.branch) r = M.resolve(L, r.branch.ask ? { text: '' } : null);
      if (r) r.pre = true;
    }
  }
  function playFull(g) {
    var i = 0, r = null;
    while (L.alive) { L.focus = focusAt(g, L.year); r = M.step(L); while (r && r.branch) { L.focus = focusAt(g, L.year); r = answerBranch(r, i < g.answers.length ? g.answers[i++] : null); } }
    return r;
  }
  // 婿養子・養子に入った人は新しい名字と旧姓を添える
  function dispName(Lx) { Lx = Lx || L; return Lx && Lx.old && O.displayName ? O.displayName(Lx) : Lx && Lx.surname && !/アイヌ語/.test(Lx.name || '') ? Lx.surname + ' ' + Lx.name : Lx.name; }
  // 画面に出す名前は名字と名前だけ（氏は書き付けにだけ。v19 3）
  function heroName(Lx) { return String(dispName(Lx) || '').replace(/（[^（）]*氏）$/, ''); }
  function lifeSummary(Lx, k, first) {
    var rel = '';
    if (k > 0) { var sg = G.house.chain[k - 1]; rel = sg.rel || ''; if (!rel && first) { var m = first.members.filter(function (x) { return x.id === sg.memberId; })[0]; if (m) rel = m.role; } }
    var jb = Lx.jobN || (Lx.job && (Lx.job.n || Lx.job.name)) || (Lx.posts && Lx.posts.length ? Lx.posts[Lx.posts.length - 1].t : '') || '';
    return { name: dispName(Lx), by: Lx.by, age: Lx.deathAge, heir: !!(Lx.heir || Lx.toshu), rel: rel, multi: Lx.multi ? { n: Lx.multi.n, kind: Lx.multi.kind } : null, job: typeof jb === 'string' ? jb : '', married: !!Lx.everMarried, cause: Lx.causeName || Lx.causeLabel || '' };
  }
  // 亡くなった人から、きょうだい（memberId）へ引き継ぐ
  function inheritFrom(Lp, memberId, gen, sg) {
    if (gen === 'desc') return descendFrom(Lp, sg);
    var fromBirth = gen === 'multiB';
    if (gen === 'multi' || gen === 'multiB') gen = null;
    if (gen === 'member') return memberFrom(Lp, sg);
    if (gen === 'rechild') return rechildFrom(Lp, sg);
    if (gen === 'trace') return traceFrom(sg);
    var MM = Lp.old ? O : E, h = gen === 'child' ? MM.childHouse(Lp, memberId, []) : MM.houseOf(Lp, []);
    return getPref(Lp.old ? h.home.pref : (h.pref || Lp.P.code)).then(function (p) {
      P = p; M = MM;
      var opt = { house: h, memberId: memberId, seed: lifeSeedOf(G, memberId) };
      L = Lp.old ? O.newLife(C, H, P, opt) : E.newLife(C, P, opt);
      L.marks = {};
      comps = [];
      // 先に亡くなった同じ日に生まれたきょうだいは、生まれた年から生きる（v18 8）
      if (!fromBirth) preRun(Math.max(h.deathYear, L.by));
      return L;
    });
  }
  // 何代か後の子孫として生まれる（spec6 2-6）。家の記録（名字・格・土地・家宝・家訓）を受け継ぐ。種は家の種と代の数から決める
  function descendFrom(Lp, sg) {
    var S = window.IchiokuStory, rec = S.houseRec(Lp), by = Lp.deathYear + sg.gap, seed = lifeSeedOf(G, 900 + sg.gap);
    // あなたにつながる子孫（v19 10）：家の住む所をあなたの都道府県へ寄せ、あなたまでの代と年と道のりを書き留める
    var T = TG(), mv = null, toMe = null;
    if (sg.me && T && T.drift) {
      var n = T.gensTo(by, sg.me.y), k = 1 / Math.max(1, n);
      var rnd = E.makeRng((seed ^ 0x5bd1e995) >>> 0);
      mv = T.drift(H, rec.pref, by, sg.me, Math.min(1, 1.5 * k + (by >= sg.me.y - 160 ? 0.3 : 0)), rnd);
      if (mv) { rec = Object.assign({}, rec, { pref: mv.pref, prov: mv.prov || rec.prov, sub: mv.prov ? mv.sub : rec.sub }); mv.why = T.moveWhy(by - 20, Lp.sex, rnd); }
      toMe = { gens: n, years: sg.me.y - by, km: T.kmPref(rec.pref, sg.me.pref), adopt: !T.kidsOf(Lp).length };
    }
    return getPref(rec.pref).then(function (p) {
      P = p;
      if (by >= 1975) { M = E; L = E.newLife(C, P, { year: by, seed: seed }); }
      else { M = O; L = O.newLife(C, H, P, { year: by, seed: seed, birth: { prov: rec.prov || O.pickBirth(C, H, by, E.makeRng(seed)).prov, sub: rec.sub || null, pref: rec.pref, kuge: rec.status === 'kuge' && by <= 1946 } }); }
      S.applyDescend(L, rec);
      if (toMe) {
        L.toMe = toMe;
        var nm = (C.prefs.filter(function (x) { return x.code === String(rec.pref); })[0] || {}).name || '';
        if (mv && nm) L.descendLine = (L.descendLine || '') + '親の代に、' + mv.why + nm + 'へ移り住みました。';
        if (toMe.adopt) L.descendLine = (L.descendLine || '') + '先の代で子がなかったときは、きょうだいの子を養子に迎えて家をつなぎました。';
      }
      L.marks = {};
      comps = [];
      return L;
    });
  }
  // 記録から家の人生を作り直す。最後の人は untilYear まで（null なら最期まで）
  var firstLife = null;
  function buildHouse(g, untilYear) {
    houseLives = [];
    return makeLife(g.seed).then(function () {
      firstLife = L;
      var segs = [g].concat(g.house && g.house.chain ? g.house.chain : []), k = 0;
      function next() {
        var sg = segs[k];
        (sg.marks || []).forEach(function (key) { L.marks[key] = 1; });
        if (k < segs.length - 1) {
          // 生まれの画面で「同じ日に生まれたきょうだいの人生から生きる」を選んだときは、最初の子の一生は進めない（v18 8）
          if (segs[k + 1].gen !== 'multi') {
            playFull(sg);
            houseLives.push(lifeSummary(L, k, firstLife));
          }
          k++;
          return inheritFrom(L, segs[k].memberId, segs[k].gen, segs[k]).then(next);
        }
        return untilYear == null ? playFull(sg) : replayTo(sg, untilYear);
      }
      return next();
    });
  }
  // 生まれ変わる前の人生を「一つ前の人生」として残す（途中なら、その年から続きを遊べる）
  function snapshotG() {
    if (!G || !L) return null;
    var g = JSON.parse(JSON.stringify(G));
    g.shown = G.done ? null : (cur ? cur.year : G.shown);
    return g;
  }
  function rebornNow() { var sn = snapshotG(); if (sn) store('ichioku-prev', sn); clearTimeout(timer); closeSheetQuiet(); L = null; cur = null; houseLives = []; window.scrollTo(0, 0); born(); }
  function backToPrev() {
    var g = store('ichioku-prev');
    if (!g || !g.seed) return;
    var sn = snapshotG(); store('ichioku-prev', sn);
    clearTimeout(timer); closeSheetQuiet(); L = null; cur = null; houseLives = []; window.scrollTo(0, 0);
    if (g.done || g.shown == null) { reopen(g); return; }
    G = g; G.marks = G.marks || []; G.focus = G.focus || []; G.done = false;
    buildHouse(G, G.shown).then(function (r) {
      cur = r; autoResolve();
      paused = true; setPauseLabel();
      show('life'); render(cur); saveCurrent();
      if (cur.branch) showBranch(cur.branch);
    });
  }
  // 地図を大きく開く
  function openBigMap() {
    if (!L) return;
    openSheet('生きた場所', function (c) {
      var sv = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      sv.setAttribute('class', 'jmap'); sv.setAttribute('role', 'img'); sv.setAttribute('aria-label', '生きた場所の地図');
      c.appendChild(sv);
      renderMap(sv, L.log.concat(cur && L.log.indexOf(cur) < 0 ? [cur] : []), { end: true });
      c.appendChild(el('p', 'map-note', '地名はその年の呼び方、境目の線は今の都道府県です。形は国土数値情報（国土交通省）を加工'));
    });
  }
  // この端末で生まれた年（トップの盤を埋める）
  function rememberBornYear(y) {
    var ys = store('ichioku-born-years') || [];
    if (ys.indexOf(y) < 0) { ys.push(y); store('ichioku-born-years', ys); }
    if (window.IchiokuTop && window.IchiokuTop.refresh) window.IchiokuTop.refresh();
  }
  // 生まれる年は1000〜2000年のどの年も同じ確率（作る人の判断 2026-10-16）
  // 同じ年に、同じ国（1974年までは旧国、1975年からは都道府県）でもう一度生まれる（v11の直し 6）。
  // 人生は種の数だけで作り直せるので、その年・その場所に生まれる種を探す。見つからなければ同じ年だけそろえる
  function sameAgain() {
    if (!L) return;
    var year = L.by, key = L.old ? L.prov : L.home.pref, s0 = randomSeed();
    (year >= 1975 ? Promise.resolve(null) : getHistory()).then(function (h) {
      var first = null;
      for (var i = 0; i < 600000; i++) {
        var sd = ((s0 + Math.imul(i, 2654435761)) >>> 0) || 1;
        if (yearOfSeed(sd) !== year) continue;
        if (first == null) first = sd;
        var b = year >= 1975 ? E.pickPref(C, year, E.makeRng(sd ^ 0x9e3779b9)) : O.pickBirth(C, h, year, E.makeRng(sd ^ 0x9e3779b9));
        if ((year >= 1975 ? b : b.prov) === key) { first = sd; break; }
      }
      var sn = snapshotG(); if (sn) store('ichioku-prev', sn);
      clearTimeout(timer); closeSheetQuiet(); L = null; cur = null; houseLives = []; window.scrollTo(0, 0);
      born(first || undefined);
    });
  }
  // 20歳までに亡くなる人生が3回続かないようにする（作る人の指示 2026-10-19）。直前の2回が20歳までに終わっていたら、
  // おまかせ（統計どおりの答え）で進めて21歳を迎える生まれを探す。選んだ答えしだいで早く亡くなることはある
  function survivesTo21(sd) {
    var year = yearOfSeed(sd);
    var ready = dataFor(year, year + 25).then(function () { return year >= 1975 ? { pref: E.pickPref(C, year, E.makeRng(sd ^ 0x9e3779b9)) } : getHistory().then(function (h) { return O.pickBirth(C, h, year, E.makeRng(sd ^ 0x9e3779b9)); }); });
    return ready.then(function (b) { return getPref(b.pref).then(function (p) {
      var T = year >= 1975 ? E.newLife(C, p, { year: year, seed: sd }) : O.newLife(C, H, p, { year: year, seed: sd, birth: b }), MM = year >= 1975 ? E : O, g = 0;
      while (T.alive && T.age <= 20 && g++ < 40) { var r = MM.step(T); while (r && r.branch) r = MM.resolve(T, r.branch.ask ? { text: '' } : null); }
      return T.alive || T.deathAge > 20;
    }); });
  }
  function pickSeed() {
    var streak = store('ichioku-short') || 0, first = randomSeed();
    if (streak < 2) return Promise.resolve(first);
    var tries = 0;
    function next(sd) { return survivesTo21(sd).then(function (ok) { return ok || ++tries >= 30 ? sd : next(randomSeed()); }); }
    return next(first).catch(function () { return first; });
  }
  function born(fixedSeed) {
    // 試験用：?seed=数 で最初の人生の種を決める（ブラウザの受け入れ試験で、決まった人生を開くのに使う）
    if (typeof fixedSeed !== 'number' && !born.qs) { born.qs = 1; try { var qs = (location.search.match(/[?&]seed=(\d+)/) || [])[1]; if (qs) fixedSeed = +qs >>> 0 || 1; } catch (e) { /* 読めない環境 */ } }
    if (typeof fixedSeed !== 'number') { $('born').disabled = true; pickSeed().then(function (sd) { born(sd); }); return; }
    var seed = fixedSeed;
    $('born').disabled = true;
    G = { v: 2, seed: seed, year: yearOfSeed(seed), answers: [], marks: [], focus: [], auto: auto === 2, mode: auto };
    houseLives = [];
    dataFor(G.year, G.year + 115).then(function () { return makeLife(seed); }).then(function () {
      firstLife = L;
      laterData();
      return (meInfo() ? getHistory() : Promise.resolve()).then(lottery);
    }).then(function () {
      $('born').disabled = false;
      rememberBornYear(L.by);
      showBirth();
    }).catch(function () {
      $('born').disabled = false;
      alert('データを取り出せませんでした。通信の状態を確かめて、もう一度押してください。');
    });
  }
  // 遊んでいる途中でもトップへ戻る（v18 10）：進み具合を止めて今の人生を保存し、トップの「続きから」で同じ年から（分かれ道もそのまま）
  function goTop() {
    clearTimeout(timer); ybar(0);
    closeSheetQuiet();
    if (G && L && L.alive && !G.done) saveCurrent();
    paused = true; setPauseLabel();
    show('top');
    initTop();
  }
  // 次の人生へ入るときは、どの道からでも生まれの画面を出す（v19 2）
  function enterLife() {
    cur = null; paused = false; setPauseLabel(); saveCurrent();
    try { showBirth(); } catch (e) { startLife(); }
  }
  var birthTimer = null;
  function startLife() {
    clearTimeout(birthTimer); birthTimer = null;
    var ba = $('bt-auto'); if (ba) ba.hidden = true;
    paused = false; setPauseLabel();
    show('life');
    if (!store('ichioku-tip') && auto !== 2) $('speed-tip').hidden = false;
    window.scrollTo(0, 0);
    nextYear();
  }
  /* ---------- 遊ぶ人自身と比べる（第3弾の8） ---------- */
  function meInfo() { var m = store('ichioku-me'); return m && m.y ? m : null; }
  function meFull() { var m = store('ichioku-me'); return m && m.y && m.pref ? m : null; }
  function thisYear() { return new Date().getFullYear(); }
  function TG() { return window.IchiokuTsunagari || null; }
  function cmpLine(kind) {
    var K = window.IchiokuCompare, m = meInfo();
    if (!K || !m || !L || !H) return null;
    return K.line(C, H, L, m, kind);
  }
  // 初めて開いたときの窓（v18 9）。まだ入れていない人に1回だけ。閉じたら「入れずに始める」と同じ扱い（次からは出さない）
  function meModal() {
    var mm = $('me-modal');
    if (!mm || meInfo() || store('ichioku-seen-me') || auto === 2) return;
    var ys = $('mm-year'), ps = $('mm-pref'), now = new Date().getFullYear();
    if (!ys.options.length) {
      ys.appendChild(new Option('選ぶ', ''));
      for (var y = now; y >= 1920; y--) ys.appendChild(new Option(y + '年', String(y)));
      ps.appendChild(new Option('選ぶ', ''));
      (C.prefs || []).forEach(function (p) { ps.appendChild(new Option(p.name, p.code)); });
    }
    function close() { store('ichioku-seen-me', 1); mm.hidden = true; document.removeEventListener('keydown', esc); }
    function esc(e) { if (e.key === 'Escape') close(); }
    mm.hidden = false;
    document.addEventListener('keydown', esc);
    $('mm-x').onclick = close; $('mm-back').onclick = close;
    $('mm-skip').onclick = function () { close(); born(); };
    $('mm-go').onclick = function () {
      var v = { y: ys.value ? +ys.value : null, pref: ps.value || null };
      if (v.y || v.pref) store('ichioku-me', v);
      var my = $('me-year'), mp = $('me-pref'); if (my) my.value = v.y ? String(v.y) : ''; if (mp) mp.value = v.pref || '';
      if (v.y && $('me-box')) $('me-box').open = false;
      close(); born();
    };
    try { ys.focus({ preventScroll: true }); } catch (e) { /* 古い端末 */ }
  }
  function mountMe() {
    var ys = $('me-year'), ps = $('me-pref');
    if (!ys || !ps || ys.options.length) return;
    var now = new Date().getFullYear(), m = store('ichioku-me') || {};
    ys.appendChild(new Option('入れない', ''));
    for (var y = now; y >= 1920; y--) ys.appendChild(new Option(y + '年', String(y)));
    ps.appendChild(new Option('入れない', ''));
    (C.prefs || []).forEach(function (p) { ps.appendChild(new Option(p.name, p.code)); });
    ys.value = m.y ? String(m.y) : ''; ps.value = m.pref || '';
    function save() {
      var v = { y: ys.value ? +ys.value : null, pref: ps.value || null };
      if (!v.y && !v.pref) { try { localStorage.removeItem('ichioku-me'); } catch (e) { /* 保存できない環境 */ } } else store('ichioku-me', v);
      $('me-note').textContent = v.y ? '保存しました。主人公の一生と、' + v.y + '年生まれのあなたの数字を並べて出します（この端末にだけ保存）' : '入れると、主人公の一生とあなたの生まれ年の数字を並べて出します。この端末にだけ保存します';
    }
    ys.onchange = save; ps.onchange = save;
    if (m.y) $('me-box').open = false;
  }
  /* ---------- 生まれる年と場所の抽選（第3弾の9）：2秒以内。動きを減らす設定では結果だけ ---------- */
  function birthShareOf() { return window.IchiokuCompare.birthShare(C, L); }
  function pctTxt(v) { return v >= 0.1 ? (v * 100).toFixed(1) + '%' : (v * 100).toFixed(2) + '%'; }
  function lottery() {
    return new Promise(function (resolve) {
      var box = $('lottery'), bs = birthShareOf(), era = L.old ? O.eraLabel(L.H, L.by) : eraOf(L.by);
      var yearTxt = L.by + '年' + (era ? '（' + era + '）' : ''), placeTxt = bs.where + '　確率' + pctTxt(bs.share);
      var lb = $('lt-board'); clear(lb);
      var src = document.querySelector('#board svg');
      var cells = [];
      if (src) { var cp = src.cloneNode(true); cp.removeAttribute('id'); lb.appendChild(cp); cells = Array.prototype.slice.call(cp.querySelectorAll('.bd-cell')); }
      // 前の人生やトップで付いた印（選んだ年・生まれた年の色）を消してから始める
      cells.forEach(function (c) { c.classList.remove('on', 'got', 'hit', 'sel'); });
      var target = cells.filter(function (c) { return +c.getAttribute('data-y') === L.by; })[0];
      box.hidden = false;
      $('lt-k').textContent = '生まれる年を決めています'; $('lt-v').textContent = ''; $('lt-p').textContent = '';
      box.classList.remove('done'); $('lt-st').hidden = true; $('lt-mapbox').hidden = true; $('lt-go').hidden = true;
      if (lessMotion()) {
        if (target) target.classList.add('hit');
        $('lt-v').textContent = yearTxt; $('lt-k').textContent = '生まれる年と場所'; $('lt-p').textContent = placeTxt;
        lotteryDone(box, resolve);
        return;
      }
      var t0 = Date.now(), prev = null, names = L.old ? Object.keys(L.H.prov || {}).map(function (n) { return (L.H.prov[n] || {}).kuni || n; }) : (C.prefs || []).map(function (p) { return p.name; });
      (function stepYear() {
        var t = Date.now() - t0;
        if (prev) prev.classList.remove('hit');
        if (t < 900 && cells.length) { prev = cells[Math.floor(Math.random() * cells.length)]; prev.classList.add('hit'); setTimeout(stepYear, 55); return; }
        if (target) target.classList.add('hit');
        $('lt-v').textContent = yearTxt;
        setTimeout(function () {
          $('lt-k').textContent = '生まれる場所を決めています';
          var t1 = Date.now();
          (function stepPlace() {
            if (Date.now() - t1 < 550 && names.length) { $('lt-p').textContent = names[Math.floor(Math.random() * names.length)]; setTimeout(stepPlace, 60); return; }
            $('lt-p').textContent = placeTxt;
            setTimeout(function () { lotteryDone(box, resolve); }, 350);
          })();
        }, 200);
      })();
    });
  }
  // 生まれが決まったあと：身分と、生まれる都道府県を紅で塗った地図（spec6 2-22）。地図は data/map.json だけを使い、外部から読みこまない
  function birthStatusText(Lx) {
    if (Lx.old) return O.houseWord(Lx) || '';
    return Lx.dadJobD ? '父が' + Lx.dadJobD.n + 'の家' : '';
  }
  function lotteryDone(box, resolve) {
    box.classList.add('done');
    $('lt-k').textContent = '生まれる年と場所';
    var st = birthStatusText(L);
    $('lt-st').textContent = st ? '身分　' + st : ''; $('lt-st').hidden = !st;
    // 生まれる年と場所が決まったら、そのまま生まれの画面（1枚）へ移る。押すボタンは「人生を始める」の1つだけ（v18 3）
    var go = $('lt-go'), fin = function () { go.onclick = null; box.hidden = true; box.classList.remove('done'); resolve(); };
    go.hidden = true;
    setTimeout(fin, lessMotion() ? 0 : 700);
  }
  function drawBirthMap() {
    var box = $('lt-map'); if (!box || !MAP) return;
    while (box.firstChild) box.removeChild(box.firstChild);
    var pc = String(L.old ? L.pref : L.home.pref), mu = L.old ? L.muni : L.home.muni;
    var xy = (mu && MAP.munis[mu]) || (L.old && MAP.prov && MAP.prov[L.prov]) || MAP.center[pc];
    var v = MAP.view; box.setAttribute('viewBox', v.join(' '));
    var u = v[2] / 340, land = cssVar('--map-land') || '#dfe6e2', line = cssVar('--map-line') || '#b9b2a6', beni = cssVar('--beni') || '#8c1d3c', bg = cssVar('--bg') || '#fff', text = cssVar('--text') || '#222';
    Object.keys(MAP.prefs).forEach(function (k) { box.appendChild(svg('path', { d: MAP.prefs[k], fill: k === pc ? beni : land, stroke: line, 'stroke-width': (0.8 * u).toFixed(2), 'stroke-linejoin': 'round', 'data-pref': k, 'class': k === pc ? 'lt-hit' : null })); });
    if (xy) {
      box.appendChild(svg('circle', { cx: xy[0], cy: xy[1], r: (5.5 * u).toFixed(2), fill: beni, stroke: bg, 'stroke-width': (2 * u).toFixed(2), 'class': 'lt-dot' }));
      // 1871年までの生まれは、旧国の名前を地図の上に添える（線は今の都道府県のまま）
      var kuni = L.old && L.by < 1872 && L.H.prov[L.prov] ? (L.H.prov[L.prov].kuni || L.prov) : '';
      if (kuni) { var tx = svg('text', { x: xy[0] + 8 * u, y: xy[1] - 6 * u, 'font-size': (14 * u).toFixed(1), fill: text, stroke: bg, 'stroke-width': (3 * u).toFixed(1), 'paint-order': 'stroke', 'font-weight': '700' }); tx.textContent = kuni; box.appendChild(tx); }
    }
    $('lt-mapnote').textContent = (L.by < 1872 ? '旧国の名前を添えています。境目の線は今の都道府県です。' : '') + '形は国土数値情報（国土交通省）を加工';
    $('lt-mapbox').hidden = false;
  }
  // 双子・三つ子・四つ子・五つ子（v18 8）：誰の人生から生きるかを選べる（選ばなければ抽選で出た子から）
  function renderBirthMulti() {
    var bx = $('bt-multi'); clear(bx);
    bx.hidden = !L.multi;
    if (!L.multi) return;
    var sibs = L.members.filter(function (m) { return L.multi.sibIds.indexOf(m.id) >= 0; });
    bx.appendChild(el('p', 'bm-k', L.multi.kind + 'です'));
    bx.appendChild(el('p', 'bm-t', '同じ日に生まれたきょうだい：' + sibs.map(function (m) { return m.role.replace(L.multi.kind + 'の', '') + ' ' + m.name; }).join('、') + '。誰の人生から生きるかを選べます。亡くなったあとに、ほかの子の人生も生きられます。'));
    if (G && G.house && G.house.chain && G.house.chain.length) return; // すでに選び直した後
    sibs.forEach(function (m) {
      var b = el('button', 'btn-sub bm-btn', m.role.replace(L.multi.kind + 'の', '') + ' ' + m.name + 'の人生から生きる'); b.type = 'button';
      b.onclick = function () {
        G.house = G.house || { chain: [] };
        G.house.chain.push({ memberId: m.id, gen: 'multi', rel: m.role, answers: [], marks: [], focus: [] });
        var L0 = L;
        inheritFrom(L0, m.id, 'multi', G.house.chain[0]).then(function () { saveCurrent(); showBirth(); });
      };
      bx.appendChild(b);
    });
  }
  /* ---------- 生まれの画面の右の列（v18 3）：点の日本地図・生まれる割合・同じ年に生まれていたら ---------- */
  var DOTS = null;
  function getDots() { return DOTS ? Promise.resolve(DOTS) : getJSON('data/dots.json').then(function (d) { DOTS = d; return d; }).catch(function () { return null; }); }
  function renderBirthMore() {
    var bs = birthShareOf(), sh = bs.share || 0;
    $('bt-share').textContent = L.by + '年に日本で生まれる子のうち、約' + (sh * 100 >= 1 ? (sh * 100).toFixed(1) : (sh * 100).toFixed(2)) + '%が' + bs.where + 'で生まれます。' + (sh > 0 ? Math.max(1, Math.round(1 / sh)).toLocaleString('ja-JP') + '人に1人の割合です。' : '');
    getDots().then(function (D) { if (D && L) drawDots(D); });
    renderBirthTable();
  }
  function drawDots(D) {
    var sv = $('bt-dots');
    while (sv.firstChild) sv.removeChild(sv.firstChild);
    sv.setAttribute('viewBox', D.view.join(' '));
    var pc = String(L.old ? L.pref : L.home.pref), hot = {};
    var kuni = L.old && L.by < 1872 && L.H.prov[L.prov] ? L.H.prov[L.prov] : null;
    if (kuni && kuni.prefs) Object.keys(kuni.prefs).forEach(function (k) { hot[k] = 1; }); else hot[pc] = 1;
    if (kuni && kuni.subs) kuni.subs.forEach(function (sb) { var o = L.H.prov[sb]; if (o && o.prefs) Object.keys(o.prefs).forEach(function (k) { hot[k] = 1; }); });
    var r = D.step * 0.36, sx = 0, sy = 0, n = 0;
    D.dots.forEach(function (d) {
      var on = !!hot[d[2]];
      sv.appendChild(svg('circle', { cx: d[0], cy: d[1], r: r.toFixed(2), 'class': on ? 'dm-on' : 'dm', 'data-pref': d[2] }));
      if (d[2] === pc) { sx += d[0]; sy += d[1]; n++; }
    });
    var xy = (L.old && D.prov && D.prov[L.prov]) || (n ? [sx / n, sy / n] : D.center[pc]);
    if (xy) sv.appendChild(svg('circle', { cx: xy[0], cy: xy[1], r: (D.step * 2.6).toFixed(2), 'class': 'dm-ring', 'data-ring': pc }));
    var pn = (C.prefs.filter(function (p) { return p.code === pc; })[0] || {}).name || '';
    $('bt-where').textContent = (kuni ? kuni.kuni + '（今の' + pn + (Object.keys(hot).length > 1 ? 'など' : '') + '）' : pn) + 'は、日本のここにあります。';
    $('bt-mapnote').textContent = '点は今の都道府県の形から並べています。形は国土数値情報（国土交通省）を加工';
  }
  // 同じ年に生まれていたら：あなたが生まれた年と都道府県（入れていなければ今の日本）と、この子の生まれ年を並べる
  function renderBirthTable() {
    var K = window.IchiokuCompare, tb = $('bt-tab');
    clear(tb);
    if (!K) return;
    var me = meInfo(), my = me ? +me.y : 2025, sex = L.sex;
    var mpn = me && me.pref ? ((C.prefs.filter(function (p) { return p.code === String(me.pref); })[0] || {}).name || '') : '';
    $('bt-th-me').textContent = me ? 'あなたが生まれた' + (mpn || '日本') + '（' + my + '年）' : '今の日本（2025年）';
    $('bt-th-hero').textContent = 'この子の' + birthShareOf().where + '（' + L.by + '年）';
    function e0(y) { var s0 = 0; for (var a = 1; a <= 110; a++) s0 += K.surv(C, H, y, sex, a); return s0 + 0.5; }
    function lit(y, kind) {
      if (y + 7 >= 1948) return 'ほぼ全員（義務教育）';
      if (y + 7 >= 1873 && H && H.nat.elem) return '約' + Math.round(E.val(H.nat.elem[sex], Math.min(y + 7, 1920)) * 100) + '%';
      if (y >= 1700 && H && H.nat.terakoya) return '約' + Math.round((H.nat.terakoya[sex][kind] || H.nat.terakoya[sex].village) * 100) + '%（推計）';
      return '記録なし';
    }
    function ma(y) { var v = K.marryAge(H, sex, y + 25); return v != null ? v.toFixed(1) + '歳' : '記録なし'; }
    var kind = L.old ? ((L.home0 || {}).kind || L.kind || 'village') : 'city';
    var rows = [
      ['平均寿命', '約' + Math.round(e0(my)) + '歳', '約' + Math.round(e0(L.by)) + '歳' + (L.by < 1891 ? '（推計）' : '')],
      ['5歳になる前に亡くなる確率', '約' + ((1 - K.surv(C, H, my, sex, 5)) * 100).toFixed(1) + '%', '約' + Math.round((1 - K.surv(C, H, L.by, sex, 5)) * 100) + '%'],
      ['1歳を迎えられない子', K.per(1 - K.surv(C, H, my, sex, 1)), K.per(1 - K.surv(C, H, L.by, sex, 1))],
      ['字を習う子（学校に通う子）の割合', lit(my, 'city'), lit(L.by, kind)],
      ['はじめて結婚する年齢の平均', ma(my), ma(L.by)]
    ];
    rows.forEach(function (r) { var tr = el('tr'); tr.appendChild(el('th', null, r[0])); tr.appendChild(el('td', null, r[1])); tr.appendChild(el('td', null, r[2])); tb.appendChild(tr); });
    $('bt-tabnote').textContent = (me ? '' : '生まれた年を入れると、あなたの生まれ年と比べます。') + '生命表と、進学・結婚の記録から（' + (sex === 'm' ? '男' : '女') + '）。1899年より前は研究からの推計です。';
  }
  /* ---------- 生まれの記録（第3弾の9） ---------- */
  var RICH = [[0.2, '苦しい'], [0.4, 'やや苦しい'], [0.6, 'ふつう'], [0.8, 'ややゆとりがある'], [1.01, 'ゆとりがある']];
  function showBirth() {
    show('birth');
    window.scrollTo(0, 0);
    var era = L.old ? O.eraLabel(L.H, L.by) : eraOf(L.by), K = window.IchiokuCompare;
    var style = L.by < 1872 ? (L.by >= 1640 ? '宗門人別改帳にならった' : '') : '戸籍にならった';
    $('bt-k').textContent = (style ? style : '') + '生まれの記録';
    $('bt-name').textContent = heroName();
    $('bt-sub').textContent = L.by + '年' + (era ? '（' + era + '）' : '') + ' · ' + (L.sex === 'm' ? '男' : '女') + ' · ' + String(birthPlace()).replace(/（今の(.*?)）/, ' $1');
    drawAvatar('avatar-birth', L.by, 0);
    var g = $('bt-grid'); clear(g);
    function item(k, v) { var d = el('div', 'rc-item'); d.appendChild(el('dt', null, k)); d.appendChild(el('dd', null, v)); g.appendChild(d); }
    var inc = typeof L.incPct === 'number' ? L.incPct : 0.5, rich = RICH.filter(function (r) { return inc < r[0]; })[0][1];
    if (L.old) item('身分と家', O.houseWord(L) || '—');
    item('暮らし向き', rich);
    var dad = L.members.filter(function (m) { return m.role === '父'; })[0], mom = L.members.filter(function (m) { return m.role === '母'; })[0];
    if (dad) item('父', (dad.name ? dad.name + ' · ' : '') + L.fAge + '歳' + (L.old ? (L.parentJob ? ' · ' + L.parentJob.n : '') : (L.dadJobD ? ' · ' + L.dadJobD.n : '')));
    if (mom) item('母', (mom.name ? mom.name + ' · ' : '') + L.mAge + '歳' + (!L.old && L.momJobD ? ' · ' + L.momJobD.n : ''));
    var sibs = L.members.filter(function (m) { return m.sib && m.by < L.by && m.alive && !m.gone && !m.before; });
    item('きょうだい', sibs.length ? sibs.map(function (m) { return m.role + ' ' + m.name; }).join('、') : 'はじめての子');
    var e0 = L.H && L.H.nat.e0 && L.by <= 1970 ? E.val(L.H.nat.e0[L.sex], L.by) : null;
    if (e0 == null && K) { var sum = 0; for (var a = 1; a <= 110; a++) sum += K.surv(C, H, L.by, L.sex, a); e0 = sum + 0.5; }
    if (e0 != null) item('その年の平均寿命', '約' + Math.round(e0) + '歳');
    // あなたにつながる子孫（v19 10）
    if (L.toMe) {
      item('あなたまで', 'あと' + L.toMe.gens + '代・' + L.toMe.years + '年');
      item('あなたの都道府県まで', L.toMe.km ? 'あと約' + L.toMe.km.toLocaleString('ja-JP') + 'km' : '同じ都道府県');
    }
    if (K) item('5歳までに亡くなる確率', '約' + Math.round((1 - K.surv(C, H, L.by, L.sex, 5)) * 100) + '%');
    // 1歳を迎えられない子の割合（v11の直し 6）：始める前に分かっていれば、0歳で終わっても「そういう時代だった」と受け止めやすい
    if (K) { var q0 = 1 - K.surv(C, H, L.by, L.sex, 1); if (q0 > 0) item('1歳を迎えられない子', Math.max(2, Math.round(1 / q0)).toLocaleString('ja-JP') + '人に1人'); }
    $('bt-cmp').hidden = true;
    renderBirthMulti();
    renderBirthMore();
    var ul = $('bt-comps'); clear(ul);
    comps.forEach(function (c) {
      var li = el('li');
      var pl = c.old ? O.placeLabel(c) : c.home.prefName + c.home.muniName;
      li.appendChild(el('span', 'cn', (c.sex === 'm' ? '男の子' : '女の子') + ' · ' + String(pl).replace(/（今の(.*?)）/, ' $1')));
      li.appendChild(el('span', 'cs', c.old ? (O.houseWord(c) || '') : (c.dadJobD ? '父は' + c.dadJobD.n : '')));
      ul.appendChild(li);
    });
    $('bt-comps-box').hidden = !comps.length;
    $('bt-start').onclick = startLife;
    // すべておまかせのときは5秒後に始める。画面を押すと止まる（v19 2・11）
    var ba = $('bt-auto'), sb = $('screen-birth');
    clearTimeout(birthTimer); birthTimer = null; sb.onclick = null;
    if (ba) ba.hidden = auto !== 2;
    if (auto === 2) {
      ba.textContent = '5秒後に人生を始めます・画面を押すと止まります';
      birthTimer = setTimeout(function () { if (!$('screen-birth').hidden) startLife(); }, 5000);
      sb.onclick = function (e) { if (e.target.closest && e.target.closest('#bt-start')) return; if (birthTimer) { clearTimeout(birthTimer); birthTimer = null; ba.textContent = '止めました。「人生を始める」を押すと進みます'; } };
    }
  }
  // 続きから
  function resume() {
    var g = store('ichioku-current');
    if (!g || !g.seed) return;
    G = g; G.marks = G.marks || []; G.focus = G.focus || []; auto = G.mode != null ? modeOf(G.mode) : (G.auto ? 2 : 0); G.done = false;
    buildHouse(G, G.shown).then(function (r) {
      cur = r;
      autoResolve();
      paused = true; setPauseLabel();
      show('life');
      render(cur);
      if (cur.branch) showBranch(cur.branch);
    });
  }
  // これまでの人生をもう一度見る（最期の画面を開き直す）
  function reopen(rec) {
    G = { v: 2, seed: rec.seed, year: rec.year, answers: rec.answers || [], marks: rec.marks || [], focus: rec.focus || [], house: rec.house || null, done: true };
    buildHouse(G, null).then(function (r) {
      cur = r;
      showEnd(true);
    });
  }
  function recordAnswer(a) { if (G && !G.done) { seg().answers.push(a); saveCurrent(); } }

  /* ---------- いつも更新される数字 ---------- */
  // 千円単位の額を、その年のお金の単位で書く（1600年より前は貫文、1871年より前は両。1両＝1円として数える）
  function money(k, cur) {
    var v = k * 1000;
    // 1600年より前は銭で数える（1貫文＝1000文）
    if (cur === '貫文') {
      if (v >= 10) return '約' + Math.round(v) + '貫文';
      if (v >= 1) return '約' + (Math.round(v * 10) / 10) + '貫文';
      return '約' + Math.max(10, Math.round(v * 100) * 10) + '文';
    }
    if (cur === '両') {
      if (v >= 10) return '約' + Math.round(v) + '両';
      if (v >= 1) return '約' + (Math.round(v * 2) / 2) + '両';
      return '約' + Math.max(1, Math.round(v * 4)) + '分';
    }
    if (v >= 1e8) return '約' + (v / 1e8).toFixed(1).replace(/\.0$/, '') + '億円';
    if (v >= 1e5) return '約' + Math.round(v / 1e4).toLocaleString('ja-JP') + '万円';
    if (v >= 1e4) return '約' + (v / 1e4).toFixed(1).replace(/\.0$/, '') + '万円';
    return '約' + Math.round(v).toLocaleString('ja-JP') + '円';
  }
  // 同じ年・同じ性別に生まれた人のうち、その年齢まで生きている割合（生命表から。災害や戦争は含まない）
  function survival(age) {
    var l = 1, v = Object.create(L);
    for (var a = 0; a < age; a++) {
      var q = L.old ? O.deathProb(v, L.sex, a, L.by + a) : E.deathProb(C, P, L.sex, a, L.by + a);
      l *= 1 - q;
    }
    return l;
  }
  function lastMoney(r) {
    if (r && r.money) return r.money;
    for (var i = L.log.length - 1; i >= 0; i--) if (L.log[i].money && L.log[i].year <= r.year) return L.log[i].money;
    return null;
  }
  function curOf(y) { return y < 1600 ? '貫文' : y < 1871 ? '両' : '円'; }
  function koku(k) { var v = k * 1000; return v >= 10 ? '約' + Math.round(v) + '石' : '約' + (Math.round(v * 10) / 10) + '石'; }
  // その年の締めくくり（分かれ道のあと）の前は、去年の値を出す
  function settled(r) {
    if (r.income !== undefined) return { r: r, last: false };
    for (var i = L.log.length - 1; i >= 0; i--) if (L.log[i].year < r.year) return { r: L.log[i], last: true };
    return { r: r, last: false };
  }
  function renderNums(r0) {
    var sd = settled(r0), r = sd.r;
    var inc = r.income, m = lastMoney(r);
    $('num-income-box').querySelector('.k').textContent = sd.last ? '去年の年収' : 'その年の年収';
    if (inc && inc.nominal > 0) {
      $('num-income').textContent = money(inc.nominal, inc.cur);
      var sub = [];
      if (r.money && r.money.koku != null) sub.push('米に直すと' + koku(r.money.koku));
      if (r.money && r.money.take != null) sub.push('手取り' + money(r.money.take));
      if (r.money && r.money.real && r.money.perNow > 1.05) sub.push('今の物価で' + money(r.money.real));
      if (inc.future) sub.push('2025年の水準のまま');
      if (inc.est || r.year < 1975) sub.push('推計');
      $('num-income-n').textContent = sub.join('・') || 'その年のお金';
    } else if (r.income === undefined) { $('num-income').textContent = '—'; $('num-income-n').textContent = 'この年の終わりに決まる'; }
    else { $('num-income').textContent = '収入なし'; $('num-income-n').textContent = r.age < 15 ? '子ども' : '働いていない年'; }
    if (m && m.sav != null) {
      $('num-sav').textContent = money(m.sav);
      $('num-sav-n').textContent = '今の物価' + (m.perNow > 1.5 ? '・その年のお金で' + money(m.savNominal, curOf(r.year)) : '') + (r.year < 2007 ? '・推計' : '');
    } else { $('num-sav').textContent = '—'; $('num-sav-n').textContent = '18歳までは家の家計'; }
    $('num-earn').textContent = L.earn && L.earn.real > 0 ? money(L.earn.real) : '0円';
    var sv = survival(r0.age);
    $('num-alive').textContent = (sv * 100 >= 10 ? Math.round(sv * 100) : (sv * 100).toFixed(1)) + '%';
    $('num-alive-n').textContent = '生命表から（' + (L.sex === 'm' ? '男' : '女') + '）';
  }
  // お金のくわしい内訳と、もとになった統計
  function openMoney() {
    if (!L || !cur) return;
    var sd = settled(cur), r = sd.r, m = r.money || null, inc = r.income;
    openSheet('お金', function (c) {
      function row(k, v) { var d = el('div', 'money-row'); d.appendChild(el('span', null, k)); d.appendChild(el('span', 'mv', v)); c.appendChild(d); }
      if (sd.last) c.appendChild(el('p', 'note', cur.year + '年の分は、この年の終わりに決まります。ここでは去年の値を出しています'));
      c.appendChild(el('p', 'note', r.year + '年・' + r.age + '歳。金額はその年のお金と、2025年の物価に直した目安の両方で出します' + (r.year < 1975 ? '。1975年より前は推計です' : '')));
      if (inc && inc.nominal > 0) {
        row('その年の年収', money(inc.nominal, inc.cur));
        if (r.money && r.money.koku != null) row('米に直すと', koku(r.money.koku));
        if (r.money && r.money.take != null) row('手取り（税金と社会保険料を引いた額）', money(r.money.take));
        if (r.money && r.money.real) row('今の物価に直すと', money(r.money.real));
        if (r.money && r.money.takeReal != null) row('手取りを今の物価に直すと', money(r.money.takeReal));
      } else row('その年の年収', '収入なし');
      if (m && m.sav != null) { row('貯金（今の物価）', money(m.sav)); row('貯金（その年のお金）', money(m.savNominal, curOf(r.year))); }
      if (m && m.why && m.why.length) {
        c.appendChild(el('h3', null, 'この年の貯金の動き'));
        m.why.forEach(function (w) {
          c.appendChild(el('p', 'item', (w.d >= 0 ? '+' : '-') + money(Math.abs(w.d)) + '　' + w.t));
        });
      }
    });
  }

  /* ---------- 4つの数値（からだ・暮らしの満足・学び・つながり） ---------- */
  var ST_LABEL = { body: 'からだ', sat: '暮らしの満足', learn: '学び', tie: 'つながり' };
  function lastSt(r) {
    if (r && r.st) return r.st;
    for (var i = L.log.length - 1; i >= 0; i--) if (L.log[i].st && L.log[i].year <= r.year) return L.log[i].st;
    return null;
  }
  function renderSt(r) {
    var st = lastSt(r);
    ['body', 'sat', 'learn', 'tie'].forEach(function (k) {
      $('st-' + k).style.width = st ? st[k] + '%' : '0';
      $('st-' + k + '-v').textContent = st ? String(st[k]) : '—';
    });
    $('st4').setAttribute('aria-label', st ? '4つの数値：' + ['body', 'sat', 'learn', 'tie'].map(function (k) { return ST_LABEL[k] + ' ' + st[k]; }).join('、') + '。押すと今年の理由が出ます' : '4つの数値');
    $('st-note').textContent = st && st.est ? '1975年より前は推計です。押すと今年の理由が出ます' : '押すと今年の理由が出ます';
  }
  // 年齢の下の細い横棒4本（いつも出す）
  function renderMini(r) {
    var st = lastSt(r);
    ['body', 'sat', 'learn', 'tie'].forEach(function (k) { var f = $('mini-' + k), v = $('mini-' + k + '-v'); if (f) f.style.width = st ? st[k] + '%' : '0'; if (v) v.textContent = st ? st[k] : '—'; });
  }
  function openSt() {
    if (!L || !cur) return;
    var st = lastSt(cur);
    openSheet('4つの数値', function (c) {
      c.appendChild(el('p', 'note', '0から100の目安です。からだの数値だけが、亡くなる確率を少し上下させます。ほかの3つは画面で見るための数値で、出来事の起こり方は変えません' + (st && st.est ? '。1975年より前は推計です' : '')));
      if (!st) { c.appendChild(el('p', null, 'この年の数値はまだ決まっていません')); return; }
      var box = el('div', 'st-why');
      ['body', 'sat', 'learn', 'tie'].forEach(function (k) {
        var d = st.prev ? st[k] - st.prev[k] : 0;
        box.appendChild(el('h3', null, ST_LABEL[k] + '　' + st[k] + (st.prev ? '（去年から' + (d > 0 ? '+' + d : d === 0 ? '変わらず' : d) + '）' : '')));
        var ws = (st.why || []).filter(function (w) { return w.k === k; });
        if (!ws.length) box.appendChild(el('p', 'note', st.prev ? '大きく動く出来事はなかった' : '生まれたときの目安'));
        ws.forEach(function (w) {
          box.appendChild(el('p', 'item', (w.d > 0 ? '+' : '') + w.d + '　' + w.t));
        });
      });
      c.appendChild(box);
    });
  }

  /* ---------- 家系図（3親等まで。これまでに出てきた人だけ） ---------- */
  var SVGNS = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs, text) {
    var e = document.createElementNS(SVGNS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }
  function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  function renderTree(year, boxId) {
    var box = $(boxId || 'tree');
    clear(box);
    if (!L) return;
    var ms = L.members.filter(function (m) { return m.by <= year && !m.before; });
    function rel(m) {
      if (m.role === '配偶者') return m.sex === 'm' ? '夫' : '妻';
      if (m.role === '子') return m.sex === 'm' ? '息子' : '娘';
      return m.role;
    }
    function node(m, self) {
      var dead = self ? false : (!m.alive && m.dy != null && m.dy <= year);
      var age = self ? year - L.by : (dead ? m.dy - m.by : year - m.by);
      var selfName = L.surnameOld ? L.surname + L.name : L.name;
      var hero = !self && m && heroOf(m);
      return { hero: !!hero, label: self ? '自分' : rel(m) + (hero ? '・主人公' : ''), name: (self ? selfName : m.name) || '', sub: self && L.surnameOld ? '旧姓 ' + L.surnameOld + '・' + age + '歳' : dead ? m.dy + '年没・' + age + '歳' : (m && m.gone ? '別れた' : age + '歳'), dead: dead, self: !!self, gone: !!(m && m.gone), by: self ? L.by : m.by, id: self ? 0 : m.id, m: m };
    }
    // この家で主人公だった人（家系図に必ず出す）
    function heroOf(m) { return houseLives.filter(function (h) { return h.by === m.by && h.name && h.name.indexOf(m.name) >= 0; })[0]; }
    var NW = 88, NH = 46, GX = 8, GY = 26;
    var rows = [[], [], [], [], []];
    // 0：祖父母　1：父母　2：自分ときょうだい・配偶者　3：子　4：孫
    var gpF = ms.filter(function (m) { return m.side === '父方'; }), gpM = ms.filter(function (m) { return m.side === '母方'; });
    var dad = ms.filter(function (m) { return m.role === '父'; })[0], mom = ms.filter(function (m) { return m.role === '母'; })[0];
    var sibs = ms.filter(function (m) { return m.sib; }).concat([{ selfMark: true, by: L.by }]).sort(function (a, b) { return a.by - b.by; });
    var spouses = ms.filter(function (m) { return m.role === '配偶者' || m.role === 'パートナー'; });
    var kids = ms.filter(function (m) { return m.role === '子'; }).sort(function (a, b) { return a.by - b.by; });
    var grands = ms.filter(function (m) { return m.role === '孫'; });
    var r2 = [];
    sibs.forEach(function (m) { if (m.selfMark) { r2.push(node(null, true)); spouses.forEach(function (sp) { r2.push(node(sp)); }); } else r2.push(node(m)); });
    var pos = {};
    // 自分の列を基準に横の位置を決める
    r2.forEach(function (n, i) { n.x = i * (NW + GX); n.y = 2 * (NH + GY); });
    var selfN = r2.filter(function (n) { return n.self; })[0];
    var sibsN = r2.filter(function (n) { return !n.m || n.m.sib || n.self; });
    var cx = sibsN.length ? (sibsN[0].x + sibsN[sibsN.length - 1].x) / 2 : selfN.x;
    var r1 = [];
    if (dad) r1.push(node(dad)); if (mom) r1.push(node(mom));
    r1.forEach(function (n, i) { n.x = cx - (r1.length * (NW + GX) - GX) / 2 + i * (NW + GX) + NW / 2 - NW / 2; n.y = NH + GY; });
    var r0 = [];
    function placeGp(list, under) {
      var nodes = list.map(function (m) { return node(m); });
      var w = nodes.length * (NW + GX) - GX;
      var base = (under ? under.x + NW / 2 : cx) - w / 2;
      nodes.forEach(function (n, i) { n.x = base + i * (NW + GX); n.y = 0; n.under = under; });
      return nodes;
    }
    var dadN = r1.filter(function (n) { return n.m === dad; })[0], momN = r1.filter(function (n) { return n.m === mom; })[0];
    var gF = placeGp(gpF, dadN), gM = placeGp(gpM, momN);
    if (gF.length && gM.length) { var over = gF[gF.length - 1].x + NW + GX - gM[0].x; if (over > 0) gM.forEach(function (n) { n.x += over; }); }
    r0 = gF.concat(gM);
    var kidX0 = selfN.x + (spouses.length ? (NW + GX) / 2 : 0);
    var r3 = kids.map(function (m) { return node(m); });
    var kw = r3.length * (NW + GX) - GX;
    r3.forEach(function (n, i) { n.x = kidX0 + NW / 2 - kw / 2 + i * (NW + GX); n.y = 3 * (NH + GY); });
    var r4 = [];
    r3.forEach(function (kn) {
      var gs = grands.filter(function (g) { return g.parentId === kn.m.id; }).map(function (g) { return node(g); });
      gs.forEach(function (g) { g.parent = kn; r4.push(g); });
    });
    var cur = -Infinity;
    r3.forEach(function (kn) {
      var gs = r4.filter(function (g) { return g.parent === kn; });
      var w = gs.length * (NW + GX) - GX, x0 = Math.max(cur, kn.x + NW / 2 - w / 2);
      gs.forEach(function (g, i) { g.x = x0 + i * (NW + GX); g.y = 4 * (NH + GY); });
      if (gs.length) cur = x0 + w + GX;
    });
    // 3親等より上の代の主人公（曾祖父母など）は、いちばん上の段に並べる
    var shown = r0.concat(r1, r2, r3, r4).filter(function (n) { return n.hero; }).map(function (n) { return n.m.by + ':' + n.m.name; });
    var rTop = houseLives.filter(function (h) { return !shown.some(function (k) { var b = +k.split(':')[0], nm = k.split(':')[1]; return b === h.by && h.name.indexOf(nm) >= 0; }) && h.by < L.by; }).map(function (h, i) {
      return { hero: true, label: '先代の主人公', name: h.name, sub: h.by + '年生まれ・' + h.age + '歳没', dead: true, self: false, by: h.by, x: cx - NW / 2 + i * (NW + GX), y: 0 };
    });
    // 人がいない段は詰める
    var rowsAll = [rTop, r0, r1, r2, r3, r4], k2 = 0;
    rowsAll.forEach(function (row) { if (!row.length) return; row.forEach(function (n) { n.y = k2 * (NH + GY); }); k2++; });
    var all = rTop.concat(r0, r1, r2, r3, r4);
    var minX = Math.min.apply(null, all.map(function (n) { return n.x; })), maxX = Math.max.apply(null, all.map(function (n) { return n.x + NW; }));
    var maxY = Math.max.apply(null, all.map(function (n) { return n.y + NH; }));
    var W = maxX - minX + 4, Hh = maxY + 4;
    var g = svg('svg', { width: W, height: Hh, viewBox: (minX - 2) + ' -2 ' + W + ' ' + Hh, role: 'img', 'aria-label': '家系図（' + all.length + '人）' });
    var line = cssVar('--line') || '#999', text = cssVar('--text') || '#111', sub = cssVar('--sub') || '#555', bg = cssVar('--bg') || '#fff', acc = cssVar('--accent') || '#06c', onAcc = cssVar('--on-accent') || '#fff', dead = cssVar('--dead') || '#888';
    function link(a, b) { if (!a || !b) return; var y1 = a.y + NH, y2 = b.y, mid = (y1 + y2) / 2; g.appendChild(svg('path', { d: 'M' + (a.x + NW / 2) + ' ' + y1 + 'V' + mid + 'H' + (b.x + NW / 2) + 'V' + y2, fill: 'none', stroke: line, 'stroke-width': 1 })); }
    function pair(a, b, dashed) { if (!a || !b) return; g.appendChild(svg('line', { x1: a.x + NW, y1: a.y + NH / 2, x2: b.x, y2: b.y + NH / 2, stroke: line, 'stroke-width': 1, 'stroke-dasharray': dashed ? '3 3' : '' })); }
    // 線
    if (gF.length === 2) pair(gF[0], gF[1]); if (gM.length === 2) pair(gM[0], gM[1]);
    gF.forEach(function (n) { link(n, dadN); }); gM.forEach(function (n) { link(n, momN); });
    if (dadN && momN) pair(dadN, momN);
    var parentAnchor = dadN || momN;
    r2.forEach(function (n) { if ((n.self || (n.m && n.m.sib)) && parentAnchor) link(parentAnchor, n); });
    r2.forEach(function (n) { if (n.m && (n.m.role === '配偶者' || n.m.role === 'パートナー')) pair(selfN, n, n.gone); });
    r3.forEach(function (n) { link(selfN, n); });
    r4.forEach(function (n) { link(n.parent, n); });
    // 人
    all.forEach(function (n) {
      var fill = n.self ? acc : bg, fg = n.self ? onAcc : n.dead ? dead : text, fg2 = n.self ? onAcc : n.dead ? dead : sub;
      // 家系図の人を押すと、その人の札を出す（spec6 2-21）。四角は縦46・横88で、指で押しやすい大きさ
      if (n.m && !n.self) {
        var hit = svg('rect', { x: n.x, y: n.y, width: NW, height: NH, fill: 'transparent', role: 'button', tabindex: '0', 'aria-label': n.label + ' ' + (n.name || '') + 'の札を開く', 'class': 'tree-hit' });
        (function (nn) { hit.onclick = function () { openPersonCard(nn); }; hit.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPersonCard(nn); } }; })(n);
        g.appendChild(svg('rect', { x: n.x, y: n.y, width: NW, height: NH, fill: fill }));
        g._hits = (g._hits || []).concat([hit]);
      } else g.appendChild(svg('rect', { x: n.x, y: n.y, width: NW, height: NH, fill: fill }));
      if (n.hero) g.appendChild(svg('rect', { x: n.x + 0.5, y: n.y + 0.5, width: NW - 1, height: NH - 1, fill: 'none', stroke: acc, 'stroke-width': 1 }));
      treeText(g, n.x + NW / 2, n.y + 13, n.label, 10, 8, NW - 8, fg2);
      treeText(g, n.x + NW / 2, n.y + 27, String(n.name || '（名前なし）').replace(/（.*?）/g, ''), 12, 9, NW - 8, fg, 700);
      treeText(g, n.x + NW / 2, n.y + 40, n.sub, 10, 8, NW - 6, fg2);
    });
    (g._hits || []).forEach(function (h) { g.appendChild(h); });
    box.appendChild(g);
    // 自分が見える位置へ
    box.scrollLeft = Math.max(0, selfN.x - minX - box.clientWidth / 2 + NW / 2);
  }


  // 家系図の四角に収まるように、文字を小さくし、それでも入らなければ切る
  function textW(t, fs) { var w = 0; for (var i = 0; i < t.length; i++) w += /[\x20-\x7e]/.test(t[i]) ? fs * 0.58 : fs; return w; }
  function treeText(g, x, y, t, fs, min, avail, fill, weight) {
    t = String(t || '');
    var f = fs;
    while (f > min && textW(t, f) > avail) f -= 0.5;
    if (textW(t, f) > avail) { while (t.length > 1 && textW(t + '…', f) > avail) t = t.slice(0, -1); t += '…'; }
    var a = { x: x, y: y, 'text-anchor': 'middle', 'font-size': f, fill: fill };
    if (weight) a['font-weight'] = weight;
    g.appendChild(svg('text', a, t));
  }
  function updateLife(fn) {
    var lives = store('ichioku-lives') || [];
    for (var i = 0; i < lives.length; i++) if (lives[i] && G && lives[i].seed === G.seed) { fn(lives[i]); break; }
    store('ichioku-lives', lives);
  }
  function saveLifeMarks() { updateLife(function (x) { x.marks = G.marks || []; x.house = G.house || null; }); }

  /* ---------- 共有用の画像 ---------- */
  function openCard(kind) {
    if (!L || !window.IchiokuCard) return;
    var K = window.IchiokuCard;
    openSheet('最期のカード', function (c) {
      var cv = document.createElement('canvas');
      cv.className = 'card-preview'; cv.setAttribute('role', 'img');
      var from = L.old ? L.home.label : L.home.prefName + L.home.muniName;
      var to = L.old ? O.placeLabel(L) : (L.place.away ? L.place.prefName : L.place.prefName + L.place.muniName);
      var sat = L.log.map(function (r) { return r.st ? r.st.sat : null; });
      // ひとこと：いちばん満足が高かった年の出来事
      var best = null;
      lifeCurveData().pts.forEach(function (p) { if (p.label && (!best || p.sat > best.sat)) best = p; });
      var co = { L: L, name: dispName(), from: from, to: to, line: best ? 'いちばん良かった年　' + best.age + '歳　' + best.label : '', sat: sat };
      // あなたまで約○代（生まれた年を入れている人だけ。v17 5）
      var tc = TG() && meInfo() ? TG().connect(H, L, meInfo(), thisYear()) : null;
      if (tc && tc.kind === 'anc') co.gens = tc.gens;
      K.end(cv, co);
      // 字体（Zen Kaku Gothic New）が読み込まれてから描き直す
      if (K.ready) K.ready(co).then(function () { K.end(cv, co); });
      cv.setAttribute('aria-label', L.name + 'さんの最期のカード');
      c.appendChild(cv);
      var b = el('button', 'btn-main', navigator.share ? '共有する' : '画像を保存する');
      b.type = 'button';
      b.onclick = function () { K.share(cv, 'ichioku-' + kind + '-' + L.by + '.png', '1000分の1'); };
      c.appendChild(b);
    });
  }

  /* ---------- 人生の画面 ---------- */
  function nextYear() {
    clearTimeout(timer);
    if (!L) return;
    if (!L.alive) { endWithMoment(); return; }
    cur = M.step(L);
    autoResolve();
    render(cur);
    saveCurrent();
    // あなたの今の年齢になった年は、1年の進みを一度だけ止める（v17 4）
    var mi = meInfo();
    if (mi && auto !== 2 && cur.age === thisYear() - mi.y && L.sameAgeStop !== cur.year && !cur.branch) { L.sameAgeStop = cur.year; paused = true; setPauseLabel(); ybar(0); return; }
    if (cur.branch) showBranch(cur.branch, auto === 2);
    else if (HITO_AGES.indexOf(cur.age) >= 0 && L.hitoiki !== cur.year) showHitoiki(cur);
    else schedule();
  }
  /* ---------- ひと息（v18 11-2・v19 1）：5・15・30・50・70歳。比べの数字と同じ年に生まれた4人の今だけ（問いと書く欄は出さない） ---------- */
  var HITO_AGES = [5, 15, 30, 50, 70];
  function showHitoiki(r) {
    L.hitoiki = r.year;
    var box = $('branch');
    clear(box); clearTimeout(graceTimer);
    box.classList.remove('br-folded');
    box.appendChild(el('p', 'br-kind', 'ひと息　' + r.age + '歳・' + eraYear(r.year)));
    var K = window.IchiokuCompare, sv = survival(r.age), p1 = function (x) { return x * 100 >= 10 ? Math.round(x * 100) + '%' : (x * 100).toFixed(1) + '%'; };
    box.appendChild(el('p', 'hi-num', '同じ' + L.by + '年に生まれた' + (L.sex === 'm' ? '男' : '女') + 'のうち、' + r.age + '歳を迎えられなかったのは' + p1(1 - sv) + 'です。' + (meInfo() && K ? 'あなたの生まれた' + meInfo().y + '年では' + p1(1 - K.surv(C, H, +meInfo().y, L.sex, r.age)) + 'です。' : '')));
    if (comps.length) {
      box.appendChild(el('p', 'q', '同じ年に生まれた4人の今'));
      var ul = el('ul', 'comps hi-comps');
      comps.forEach(function (c) { var li = el('li'); li.appendChild(el('span', 'cn', (c.sex === 'm' ? '男' : '女') + '・' + String(c.old ? O.placeLabel(c) : c.home.prefName + c.home.muniName).replace(/（今の(.*?)）/, ' $1'))); li.appendChild(el('span', 'cs', compState(c))); ul.appendChild(li); });
      box.appendChild(ul);
    }
    var go = el('button', 'btn-main', '続ける'); go.type = 'button';
    var fin = function () { clearTimeout(graceTimer); box.hidden = true; box.onclick = null; schedule(); };
    go.onclick = fin;
    box.appendChild(go);
    box.hidden = false;
    clearTimeout(timer);
    if (auto === 2) { var gp = el('p', 'br-grace', 'まもなく続きに進みます・札を押すと止まります'); box.appendChild(gp); box.onclick = function (e) { if (e.target === go) return; clearTimeout(graceTimer); gp.hidden = true; }; graceTimer = setTimeout(fin, 4000); }
  }
  // 節目の問いかけは画面に出さずにそのまま進む（書き残す欄はなくした 2026-10-17）。
  // おまかせが入っているときは、ほかの分かれ道も重点に沿って選ぶ
  // 遊び方（spec6 2-14）：0 自分で選ぶ／1 大事なときだけ選ぶ／2 おまかせ
  // 大事な分かれ道：進路・奉公・出家・旅・移住など暮らしの場所や身分が変わるもの、縁談・結婚・離縁・家督・養子、人生の筋の入り口と途中、選挙・借金・家や田を売る
  var KEY_RE = /縁談|見合い|結婚|婿|養子|家督|跡を継|跡取り|移り住|引っ越|借金|家を売|田を売|田畑を売|屋敷を|選挙|奉公|出家|離縁|離婚|再婚|進学|上の学校|店を継|家業/;
  function isKey(br) { return br.id !== 'story' || br.sid !== 'choice' || KEY_RE.test(((br.groups || [])[0] || {}).q || ''); }
  function modeOf(v) { return v === 2 || v === '2' || v === true ? 2 : v === 1 || v === 'k' ? 1 : 0; }
  // おまかせでも、大きな決断は札を出して数秒待つ（動きを減らす設定と、続きからの作り直しの途中では待たない）
  function graceOk(br) { return !!(br && !br.ask && br.sid !== 'choice' && isKey(br) && !lessMotion() && !graceOff); }
  var graceOff = false;
  function autoResolve() {
    while (cur && cur.branch && (cur.branch.ask || auto === 2 && !graceOk(cur.branch) || (auto === 1 && !isKey(cur.branch)))) {
      if (cur.branch.ask) { recordAnswer({ text: '' }); cur = M.resolve(L, { text: '' }); continue; }
      var a = E.autoAnswer(cur.branch, L.focus) || { _none: 1 };
      a._auto = 1;
      recordAnswer(a);
      cur = answerBranch(cur, a);
    }
  }
  function setFocus(f) {
    L && (L.focus = f);
    if (G && !G.done) { var sg = seg(); sg.focus = sg.focus || []; sg.focus.push([L ? L.year : 0, f]); saveCurrent(); }
    renderFocus();
  }
  function renderFocus() {
    var f = L ? L.focus : null;
    Array.prototype.forEach.call(document.querySelectorAll('.focus-opts .btn-sub'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-f') === f ? 'true' : 'false'); });
    $('auto').setAttribute('aria-pressed', auto ? 'true' : 'false');
    $('auto').textContent = ['おまかせ：入れていない', 'おまかせ：大事なときだけ選ぶ', 'おまかせ：入れている'][auto];
    $('auto-top').setAttribute('aria-pressed', auto ? 'true' : 'false');
    $('auto-top').textContent = ['すべておまかせ', '大事なときだけ選ぶ', 'すべておまかせ'][auto];
    Array.prototype.forEach.call(document.querySelectorAll('[data-mode]'), function (b) { b.setAttribute('aria-pressed', String(auto) === b.getAttribute('data-mode') ? 'true' : 'false'); });
    $('auto-born').setAttribute('aria-pressed', auto ? 'true' : 'false');
    $('auto-born').textContent = '遊び方：' + ['自分で選ぶ', '大事なときだけ選ぶ', 'すべておまかせ'][auto];
  }
  function schedule() {
    clearTimeout(timer);
    if (paused || sheetPaused || !L) { ybar(0); return; }
    ybar(BASE_MS / SPEEDS[speedIdx]);
    timer = setTimeout(function () {
      if (!L.alive) endWithMoment();
      else nextYear();
    }, BASE_MS / SPEEDS[speedIdx]);
  }

  // 主人公のドット絵（その年の年齢と時代の姿）
  function drawAvatar(id, year, age) {
    var A = window.IchiokuAvatar, cv = $(id);
    if (!A || !cv || !L) return;
    var v = Object.create(L);
    v.year = year; v.age = age;
    cv.setAttribute('aria-label', year + '年、' + age + '歳の' + L.name + 'さん。' + A.draw(cv, v));
  }
  // その年のいちばん大きな出来事（人生地図の種類の強い順 → 時代以外 → 世の中の出来事）
  var KIND_RANK = { 6: 0, 5: 1, 3: 2, 4: 3, 1: 4, 2: 5, 7: 6 };
  function mainEvent(r) {
    var best = null, rank = 99;
    var dead = L && !L.alive && L.log[L.log.length - 1] === r;
    if (dead && r.events.length) return { t: evText(r.events[r.events.length - 1]), ev: r.events[r.events.length - 1].ev, i: r.events.length - 1 };
    // 引き継いだ年は、前の人が亡くなったことと家を継ぐことを先に出す
    var hs = r.events.map(function (e, i) { return { e: e, i: i }; }).filter(function (x) { return x.e.house; });
    if (hs.length) return { t: hs.map(function (x) { return evText(x.e); }).join(''), ev: hs[0].e.ev, i: hs[0].i };
    r.events.forEach(function (e, i) {
      var k = E.yearKind({ events: [e] }, null, false), rk = k ? KIND_RANK[k] : e.cat !== '時代' ? 7 : 8;
      if (rk < rank) { rank = rk; best = { t: evText(e), ev: e.ev, i: i }; }
    });
    if (!best && r.world.items.length) best = { t: r.world.items[0].t, ev: r.world.items[0].ev, world: true };
    return best;
  }
  // 4つの数値が去年から10以上動いたときだけ、短く出す
  function bigChange(r) {
    var st = r.st;
    if (!st || !st.prev) return '';
    var parts = [];
    ['body', 'sat', 'learn', 'tie'].forEach(function (k) { var d = st[k] - st.prev[k]; if (Math.abs(d) >= 10) parts.push(ST_LABEL[k] + (d > 0 ? ' ＋' : ' －') + Math.abs(d)); });
    return parts.join('　');
  }
  // 人生の記録：今の年は出来事をすべて（いちばん大きいものを上に）、前の年は時代の出来事を除いて新しい順。多くて6行
  var FEED_MAX = 6;
  // 行を押すと◆の印（v18 11-6）。印は今の人生の記録に残し、最期の画面に「印を付けた出来事」として並べる
  function starOn(k) { return !!(G && G.stars && G.stars[k]); }
  function toggleStar(k, rr, e) {
    if (!G) return;
    G.stars = G.stars || {};
    if (G.stars[k]) delete G.stars[k]; else G.stars[k] = { y: rr.year, a: rr.age, t: pol(e.t) };
    saveCurrent();
    if (cur) renderFeed(cur);
  }
  function feedRow(ol, age, text, cls, onclick, ev) {
    var li = el('li'), b = el('button', 'feed-row' + (cls ? ' ' + cls : ''));
    b.type = 'button';
    b.appendChild(el('span', 'fa', age + '歳'));
    var t = el('span', 'ft', text);
    if (!ol.firstChild) t.id = 'now-ev';
    // 出来事のもとになった数字と出典（パソコンで小さく出す。v18 2-3）
    if (ev && ev.pick) t.insertBefore(el('span', 'pick-l', '▸ ' + String(ev.pick.t).replace(/[？?。]$/, '').slice(0, 18) + '・決めたこと：' + ev.pick.l), t.firstChild);
    var sv = ((ev && ev.ev) || []).filter(function (x) { return x && x.what && x.val; })[0];
    if (sv) t.appendChild(el('span', 'ev-note', '資料　' + sv.what + '：' + sv.val + '（' + (sv.org || sv.name || '') + (sv.est ? '・推計' : '') + '）'));
    b.appendChild(t);
    if (onclick) b.onclick = onclick; else b.disabled = true;
    li.appendChild(b);
    ol.appendChild(li);
  }
  function renderFeed(r) {
    var ol = $('feed');
    clear(ol);
    var at = L.log.indexOf(r), logs = at < 0 ? L.log.concat([r]) : L.log.slice(0, at + 1);
    for (var j = logs.length - 1; j >= 0 && ol.childNodes.length < FEED_MAX; j--) {
      var rr = logs[j], idx = rr.events.map(function (e, i) { return i; }).reverse();
      if (rr === r) {
        var me = mainEvent(r);
        if (me && !me.world) idx = [me.i].concat(idx.filter(function (i) { return i !== me.i; }));
        if (!r.events.length) {
          var w = r.world.items[0];
          if (w) feedRow(ol, r.age, pol(w.t), 'w', null);
          else feedRow(ol, r.age, 'この年は大きな出来事のない一年でした。', 'quiet', null);
          continue;
        }
      } else idx = idx.filter(function (i) { return rr.events[i].cat !== '時代'; });
      idx.forEach(function (i) {
        if (ol.childNodes.length >= FEED_MAX) return;
        var e = rr.events[i], key = rr.year + ':' + i;
        var sk = rr.year + ':' + i, on = starOn(sk);
        feedRow(ol, rr.age, (on ? '◆ ' : '') + evText(e), (rr === r ? 'cur' : '') + (on ? ' starred' : ''), function () { toggleStar(sk, rr, e); }, e);
      });
    }
    var K = window.IchiokuCompare;
    if (K && (r.age === 0 || K.AGES.indexOf(r.age) >= 0) && meInfo()) {
      var cl = cmpLine(r.age === 0 ? 'birth' : r.age);
      if (cl) { var li0 = el('li'), b0 = el('button', 'feed-row cmp'); b0.type = 'button'; b0.disabled = true; b0.appendChild(el('span', 'fa', 'あなた')); b0.appendChild(el('span', 'ft', pol(cl))); li0.appendChild(b0); if (ol.firstChild) ol.insertBefore(li0, ol.firstChild.nextSibling); else ol.appendChild(li0); }
    }
    // あなたの今の年齢になった年（v17 4）：同じ形の行を一回り大きく
    var sa = TG() && TG().sameAgeRow(L, r, meInfo(), thisYear(), pol);
    if (sa) { var li1 = el('li'), b1 = el('button', 'feed-row cmp same-age'); b1.type = 'button'; b1.disabled = true; b1.appendChild(el('span', 'fa', 'あなた')); b1.appendChild(el('span', 'ft', sa)); li1.appendChild(b1); if (ol.firstChild) ol.insertBefore(li1, ol.firstChild.nextSibling); else ol.appendChild(li1); }
    $('now-more').hidden = logs.length < 2 && r.events.length + r.world.items.length < 2;
    $('now-more').onclick = function () { if (logs.length < 2) openYear(r, true); else openLog(); };
    $('now-more').textContent = logs.length < 2 ? 'この年の出来事をすべて見る' : 'これまでをすべて見る';
  }
  // 1年の進み具合の細い棒（原作の上の棒にならう）。止めている間は止まる
  function ybar(ms) {
    var f = $('ybar-fill');
    if (!f) return;
    if (!ms) { var w = getComputedStyle(f).width; f.style.transition = 'none'; f.style.width = w; return; }
    f.style.transition = 'none'; f.style.width = '0';
    void f.offsetWidth;
    f.style.transition = 'width ' + ms + 'ms linear'; f.style.width = '100%';
  }
  /* ---------- パソコンの左右の列・スマホの折りたたみ（v18 2-2・2-4・5-1） ---------- */
  function wide() { try { return window.matchMedia('(min-width: 960px)').matches; } catch (e) { return false; } }
  // パソコンでは列の中身をいつも開いておく。スマホでは開いたかどうかをこの端末に覚えておく
  function syncPanes() {
    var st = store('ichioku-panes') || {}, w = wide();
    Array.prototype.forEach.call(document.querySelectorAll('details.pane[data-pane]'), function (d) {
      d.open = w ? true : !!st[d.getAttribute('data-pane')];
    });
  }
  function stageWord(a) { return a < 7 ? '幼いころ' : a < 15 ? '子どものころ' : a < 30 ? '若いころ' : a < 60 ? '働き盛り' : a < 75 ? '隠居のころ' : '老いのころ'; }
  function dots(v) { var n = Math.max(1, Math.min(5, Math.ceil((v || 0) * 5))); return '●●●●●'.slice(0, n) + '○○○○○'.slice(0, 5 - n); }
  var paneYear = null;
  function renderPanes(r) {
    if (!L || !r) return;
    var w = wide(), Jd = window.IchiokuJidai;
    // お金と暮らし向き
    var pm = $('pm-grid');
    if (pm && w) {
      clear(pm);
      var sd = settled(r), rr = sd.r, inc = rr.income, m = lastMoney(rr);
      var item = function (k, v, n) { var d = el('div', 'pm-item'); d.appendChild(el('dt', null, k)); d.appendChild(el('dd', null, v)); if (n) d.appendChild(el('dd', 'pm-n', n)); pm.appendChild(d); };
      item(sd.last ? '去年の稼ぎ' : 'その年の稼ぎ', inc && inc.nominal > 0 ? money(inc.nominal, inc.cur) : rr.income === undefined ? '—' : '収入なし', inc && inc.nominal > 0 && rr.money && rr.money.real ? '今の物価で' + money(rr.money.real) : null);
      item('貯え', m && m.sav != null ? money(m.sav) : '—', m && m.sav != null ? '今の物価に直した目安' : '18歳までは家の家計');
      item('家の暮らし向き', dots(L.incPct), '5段階');
      item('ここまでの稼ぎ', L.earn && L.earn.real > 0 ? money(L.earn.real) : '0円', '今の物価');
    }
    // 家族とまわりの人
    var pf = $('pf-list');
    if (pf && (w || $('pane-family').open)) {
      clear(pf);
      M.familyList(L).filter(function (m) { return !m.before; }).forEach(function (m) {
        var dead = !m.alive && m.dy != null && m.dy <= r.year, li = el('li', dead || m.gone ? 'pf-gone' : null);
        var age = (dead ? m.dy : r.year) - m.by;
        li.appendChild(el('span', 'pf-rel', m.rel));
        li.appendChild(el('span', 'pf-name', String(m.name || '').replace(/（.*?）/g, '')));
        li.appendChild(el('span', 'pf-st', m.gone ? '別れた' : dead ? age + '歳で死去' : age + '歳・' + stageWord(age)));
        pf.appendChild(li);
      });
      // 飼っている動物（v19 5）：名前と年齢。亡くなった動物は取り消し線で残す
      var KP = window.IchiokuKurashi;
      (KP && KP.pets ? KP.pets(L, r.year) : []).forEach(function (p) {
        var li = el('li', 'pf-pet' + (p.alive ? '' : ' pf-gone'));
        li.appendChild(el('span', 'pf-rel', p.a));
        li.appendChild(el('span', 'pf-name', p.name || p.a));
        li.appendChild(el('span', 'pf-st', p.alive ? (p.years ? p.years + '年目' : '迎えた年') : p.years + '年をともに暮らした'));
        pf.appendChild(li);
      });
      var K = window.IchiokuKurashi, more = $('pf-more');
      clear(more);
      if (K) {
        var hb = K.hobbies ? K.hobbies(L, r.year) : [], gd = K.goods ? K.goods(L, r.year) : [];
        if (hb.length) more.appendChild(el('p', 'pf-extra', '趣味　' + hb.map(function (h) { return h.name + (h.lv ? ' Lv.' + h.lv : ''); }).join('・')));
        if (gd.length) more.appendChild(el('p', 'pf-extra', '持ち物　' + gd.join('・')));
      }
    }
    // 身元の書き付け
    var KK = window.IchiokuKakitsuke, kb = $('kaki-box');
    $('pane-kaki').hidden = !KK;
    if (KK && kb && (w || $('pane-kaki').open)) {
      clear(kb);
      var kt = KK.build(L, H, C);
      if (kt) {
        kb.appendChild(el('p', 'kk-form', kt.title || kt.form));
        var dl = el('dl', 'kk-grid');
        (kt.rows || []).forEach(function (x) { var d = el('div'); d.appendChild(el('dt', null, x[0])); d.appendChild(el('dd', null, x[1])); dl.appendChild(d); });
        kb.appendChild(dl);
      }
    }
    // 人生地図（1マス＝1年・10列。色の濃さ＝その年の満足。枠＝その年に生まれた人の平均寿命。今の年に紅の枠）
    if (w || $('pane-map').open) renderLiveMap(r);
    if (w || $('pane-surv').open) renderLiveSurv(r);
    if (w || $('pane-comps').open) renderComps('comps-pane', true);
    // その年の日本の数字（年が変わったときだけ作り直す）
    if (Jd && (w || $('pane-era').open) && paneYear !== r.year) {
      paneYear = r.year;
      var t = Jd.rows({ C: C, H: H, E: E, O: O, P: P }, L, r.year), tb = $('era-tab');
      clear(tb);
      $('era-h').textContent = t.title;
      t.rows.forEach(function (x) { var tr = el('tr'); tr.appendChild(el('th', null, x.k)); tr.appendChild(el('td', null, x.v + (x.est ? '（推計）' : ''))); tb.appendChild(tr); });
      $('era-src').textContent = t.srcs.length ? '出典：' + t.srcs.join('、') + '。推計の数字は、研究や記録から見積もった目安です。' : '';
    }
    // 記録の上の一行（その年に生まれた子の数。出典のある年だけ）
    var bl = Jd ? Jd.birthLine({ C: C }, L, r.year) : null;
    $('birth-line').hidden = !bl;
    $('birth-line').textContent = bl || '';
  }
  // 平均寿命（その年に生まれた人）：生命表から
  var e0Cache = {};
  function e0Of() {
    var k = L.by + L.sex;
    if (e0Cache[k] != null) return e0Cache[k];
    var l = 1, s0 = 0, v = Object.create(L);
    for (var a = 0; a < 110; a++) { l *= 1 - (L.old ? O.deathProb(v, L.sex, a, L.by + a) : E.deathProb(C, P, L.sex, a, L.by + a)); s0 += l; }
    return (e0Cache[k] = Math.round(s0 + 0.5));
  }
  function renderLiveMap(r) {
    var g = $('lm-grid');
    if (!g) return;
    clear(g);
    var e0 = e0Of(), recs = L.log.concat(L.log.indexOf(r) < 0 ? [r] : []), n = Math.max(recs.length, e0 + 1);
    n = Math.ceil(n / 10) * 10;
    for (var a = 0; a < n; a++) {
      var rr = recs[a], c = el('span', 'lm-c' + (a === e0 ? ' lm-e0' : '') + (rr === r ? ' lm-now' : '') + (rr ? '' : ' lm-fut'));
      if (rr) {
        var st = rr.st || lastSt(rr), v = st ? st.sat : 50;
        c.style.setProperty('--lv', String(Math.max(0.12, Math.min(1, v / 100))));
        c.title = rr.year + '年 ' + rr.age + '歳・満足 ' + (st ? st.sat : '—');
      }
      g.appendChild(c);
    }
    $('lm-note').textContent = '1マス＝1年・色が濃いほど満ち足りた年。枠のマス＝この時代の平均寿命 ' + e0 + '歳（推計）。紅の枠は今の年';
  }
  // 生存曲線：同じ年に生まれた人のうち、各年齢まで生きている人の割合
  var svCache = {};
  function survLine(by, sex, oldLife) {
    var k = by + sex + (oldLife ? 'o' : 'n');
    if (svCache[k]) return svCache[k];
    var K = window.IchiokuCompare, l = 1, pts = [1];
    for (var a = 0; a < 100; a++) { l *= 1 - K.q(C, H, sex, a, by + a); pts.push(l); }
    return (svCache[k] = pts);
  }
  function renderLiveSurv(r) {
    var sv = $('sv-svg'), K = window.IchiokuCompare;
    if (!sv || !K) return;
    while (sv.firstChild) sv.removeChild(sv.firstChild);
    var NS = 'http://www.w3.org/2000/svg', X0 = 30, Y0 = 10, W0 = 280, H0 = 130;
    function mk(tag, at) { var e = document.createElementNS(NS, tag); Object.keys(at).forEach(function (k) { e.setAttribute(k, at[k]); }); sv.appendChild(e); return e; }
    function path(pts, cls) { var d = pts.map(function (v, a) { return (a ? 'L' : 'M') + (X0 + W0 * a / 100).toFixed(1) + ' ' + (Y0 + H0 * (1 - v)).toFixed(1); }).join(' '); mk('path', { d: d, 'class': cls }); }
    [0, 0.5, 1].forEach(function (v) { mk('line', { x1: X0, x2: X0 + W0, y1: Y0 + H0 * (1 - v), y2: Y0 + H0 * (1 - v), 'class': 'sv-rule' }); var t = mk('text', { x: X0 - 4, y: Y0 + H0 * (1 - v) + 4, 'class': 'sv-t', 'text-anchor': 'end' }); t.textContent = Math.round(v * 100) + '%'; });
    [0, 50, 100].forEach(function (a) { var t = mk('text', { x: X0 + W0 * a / 100, y: Y0 + H0 + 16, 'class': 'sv-t', 'text-anchor': 'middle' }); t.textContent = a + '歳'; });
    var mine = survLine(L.by, L.sex), me = meInfo();
    if (me) path(survLine(+me.y, L.sex), 'sv-me');
    path(mine, 'sv-line');
    var a0 = Math.min(100, r.age);
    mk('circle', { cx: X0 + W0 * a0 / 100, cy: Y0 + H0 * (1 - mine[a0]), r: 4, 'class': 'sv-dot' });
    var p1 = function (x) { return x * 100 >= 10 ? Math.round(x * 100) + '%' : (x * 100).toFixed(1) + '%'; };
    $('sv-note').textContent = '同じ' + L.by + '年に生まれた' + (L.sex === 'm' ? '男' : '女') + 'のうち、' + a0 + '歳まで生きているのは' + p1(mine[a0]) + '（生命表から。戦や災害は含まない）。' + (me ? '薄い線は、あなたが生まれた' + me.y + '年の線です。' : '');
  }
  function render(r) {
    renderNums(r);
    try { renderPanes(r); } catch (e) { if (window.console) console.error(e); }
    $('age').textContent = r.age;
    var era = r.eraLabel || eraOf(r.year);
    $('year-now').textContent = r.year + '年' + (era ? '（' + era + '）' : '');
    $('o-name').textContent = heroName().replace(/（.*?）/g, '');
    if ($('o-place')) $('o-place').textContent = String(r.place || '').replace(/（今の(.*?)）/, '').split(' ')[0];
    $('o-sec').textContent = secLabel();
    $('place').textContent = String(r.place || '').replace(/（今の(.*?)）/, ' $1');
    renderScene(r);
    renderFeed(r);
    var ch = bigChange(r);
    $('change').hidden = !ch;
    $('change').textContent = ch;
    $('change').onclick = openSt;
    if ($('map')) renderMap($('map'), L.log.concat(L.log.indexOf(r) < 0 ? [r] : []), { live: true, mini: true });
    var w = $('world');
    clear(w);
    r.world.items.forEach(function (it) {
      var li = el('li');
      var b = el('button', 'item world-item');
      b.type = 'button';
      b.appendChild(el('span', 'tag', it.type));
      b.appendChild(document.createTextNode(it.t));
      b.disabled = true;
      li.appendChild(b);
      w.appendChild(li);
    });
    var ev = $('events');
    clear(ev);
    r.events.forEach(function (e, i) {
      var li = el('li');
      var b = el('button', 'item');
      b.type = 'button';
      var key = r.year + ':' + i;
      b.appendChild(el('span', 'tag', e.cat));
      b.appendChild(document.createTextNode(evText(e)));
      b.disabled = true;
      li.appendChild(b);
      ev.appendChild(li);
    });
    $('branch').hidden = !r.branch;
    renderHotline($('hotline'), !!r.hotline);
    $('next').disabled = !!r.branch;
    if (!$('details').hidden || detailsOpen()) renderTree(r.year);
    renderSt(r);
    renderMini(r);
    renderFocus();
    stepComps(r.year);
    if (detailsOpen()) renderComps('comps', true);
  }

  // 分かれ道の種類（大きな決断・小さな選択・親の選択・節目）
  function branchKind(br) { return br.ra === '__choice' ? br.title : '大きな決断'; }
  // 分かれ道の札（v18 11-1）：種類・年齢・年（和暦）の帯、いったん下ろす、家族の年齢の一行、資料の箱、番号付きの答え、
  // おまかせの猶予（数秒待ってから進み、札を押すと止まる）、これからの決断をおまかせにする、数字キー
  var graceTimer = null;
  function eraYear(y) { var e = L.old ? O.eraLabel(L.H, y) : eraOf(y); return y + '年' + (e ? '（' + e + '）' : ''); }
  function showBranch(br, grace) {
    if (br.ask) { autoResolve(); render(cur); if (cur.branch) showBranch(cur.branch); else schedule(); return; }
    var box = $('branch'), S = window.IchiokuStory, SH = window.IchiokuShiryo;
    clear(box); clearTimeout(graceTimer);
    box.classList.remove('br-folded');
    var top = el('div', 'br-top');
    top.appendChild(el('p', 'br-kind', branchKind(br) + '　' + cur.age + '歳・' + eraYear(cur.year)));
    var fold = el('button', 'link-btn br-fold', 'いったん下ろす ▾'); fold.type = 'button';
    fold.onclick = function (e) { e.stopPropagation(); var f = box.classList.toggle('br-folded'); fold.textContent = f ? '札を戻す ▴' : 'いったん下ろす ▾'; };
    top.appendChild(fold);
    box.appendChild(top);
    var body = el('div', 'br-body');
    box.appendChild(body);
    if (br.ra !== '__choice') body.appendChild(el('h2', null, br.title));
    var fam = SH && SH.familyAges ? SH.familyAges(br, L) : '';
    if (fam) body.appendChild(el('p', 'br-fam', fam));
    var sh = SH && SH.forBranch ? SH.forBranch(br, L, H, C) : null;
    if (sh && sh.text) { var sb = el('div', 'br-shiryo'); sb.appendChild(el('span', 'br-sk', '資料')); var sn = sh.srcName || (function (k) { var o = (H && H.sources && H.sources[k]) || (C.sources && C.sources[k]); return o ? o.name : ''; })(sh.src); sb.appendChild(el('span', null, sh.text + (sn && sh.text.indexOf(sn) < 0 ? '（' + sn + '）' : ''))); body.appendChild(sb); }
    var answers = {}, multi = br.groups.length > 1, keyed = [];
    var done = el('button', 'btn-main', '決める');
    done.type = 'button';
    done.disabled = true;
    var petIn = null;
    function decide() {
      clearTimeout(graceTimer); document.removeEventListener('keydown', onKey);
      if (petIn && petIn.value.trim()) answers.petName = petIn.value.trim().slice(0, 10);
      recordAnswer(answers);
      cur = M.resolve(L, answers);
      render(cur);
      flashDelta(cur.storyFx);
      if (cur.branch) { autoResolve(); render(cur); }
      if (cur.branch) showBranch(cur.branch, auto === 2);
      else schedule();
    }
    var n = 0;
    br.groups.forEach(function (g) {
      body.appendChild(el('p', 'q', g.q));
      var opts = el('div', 'opts');
      g.options.forEach(function (o) {
        var b = el('button', 'btn-sub opt-btn');
        b.type = 'button';
        n++;
        var lab = el('span', 'opt-l'); lab.appendChild(el('span', 'opt-n', String(n))); lab.appendChild(document.createTextNode(o.l)); b.appendChild(lab);
        b.appendChild(el('span', 'opt-h', S ? S.hintFor(br, o) : (o.h || '')));
        b.setAttribute('aria-pressed', 'false');
        b.onclick = function () {
          clearTimeout(graceTimer); $('br-grace') && ($('br-grace').hidden = true);
          answers[g.id] = o.k;
          if (!multi) { decide(); return; }
          Array.prototype.forEach.call(opts.children, function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
          done.disabled = br.groups.some(function (gg) { return !answers[gg.id]; });
        };
        if (n <= 9) keyed.push(b);
        opts.appendChild(b);
      });
      body.appendChild(opts);
    });
    // 動物を迎えるときは名前を付けられる（v19 5。空なら時代に合う候補から付ける。名前は文ではないので残す欄）
    if (br.d && br.d.cid === '_pet') {
      var pl = el('label', 'pet-name'); pl.appendChild(el('span', null, '名前（空なら候補から付けます）'));
      petIn = document.createElement('input'); petIn.type = 'text'; petIn.maxLength = 10; petIn.id = 'pet-name'; petIn.autocomplete = 'off';
      petIn.onclick = function (e) { e.stopPropagation(); };
      pl.appendChild(petIn); body.appendChild(pl);
    }
    done.onclick = decide;
    if (multi) body.appendChild(done);
    // おまかせのときは、数秒待ってから進む（札を押すと止まる）
    if (grace) {
      var a = E.autoAnswer(br, L.focus) || { _none: 1 }, first = br.groups[0], pickO = first && first.options.filter(function (o) { return o.k === a[first.id]; })[0];
      var gp = el('p', 'br-grace', 'まもなく「' + (pickO ? pickO.l : 'その時代にいちばんありえた答え') + '」に進みます・札を押すと止まります'); gp.id = 'br-grace';
      body.appendChild(gp);
      box.onclick = function () { clearTimeout(graceTimer); gp.hidden = true; box.onclick = null; };
      graceTimer = setTimeout(function () { a._auto = 1; answers = a; decide(); }, SPEEDS[speedIdx] >= 8 ? 1500 : 3000);
    } else box.onclick = null;
    if (auto !== 2) {
      var ab = el('button', 'link-btn br-auto', 'これからの決断をおまかせにする'); ab.type = 'button';
      ab.onclick = function (e) { e.stopPropagation(); auto = 1; $('auto').onclick(); };
      body.appendChild(ab);
    }
    function onKey(e) {
      if (box.hidden || !wide() || e.ctrlKey || e.metaKey || e.altKey) return;
      var t = e.target && e.target.tagName; if (t === 'INPUT' || t === 'SELECT' || t === 'TEXTAREA') return;
      var k = +e.key; if (k >= 1 && k <= keyed.length) { e.preventDefault(); keyed[k - 1].click(); }
    }
    document.removeEventListener('keydown', showBranch._key || function () {});
    showBranch._key = onKey;
    document.addEventListener('keydown', onKey);
    box.hidden = false;
    clearTimeout(timer);
  }
  // 決めた直後、4つの数値の横に動いた分を2秒だけ出す
  function flashDelta(fx) {
    if (!fx) return;
    ['body', 'sat', 'learn', 'tie'].forEach(function (k) {
      var d = fx[k], t = $('mini-' + k + '-d');
      if (!t || !d) return;
      t.textContent = (d > 0 ? '＋' : '−') + Math.abs(d);
      t.className = 'mini-d ' + (d > 0 ? 'up' : 'down');
      clearTimeout(t._tm);
      t._tm = setTimeout(function () { t.textContent = ''; t.className = 'mini-d'; }, 2000);
    });
  }

  function renderHotline(box, on) {
    clear(box);
    box.hidden = !on;
    if (!on) return;
    box.appendChild(el('p', 'hl-title', 'つらい気持ちを抱えているときは、ひとりで抱え込まずに相談してください'));
    C.hotline.forEach(function (h) {
      var p = el('p');
      p.appendChild(document.createTextNode(h.name + '　'));
      p.appendChild(el('span', 'tel', h.tel));
      box.appendChild(p);
    });
    if (C.hotline.some(function (h) { return !h.verified; })) box.appendChild(el('p', 'note', '相談先の名前と番号は、公開前に最新のものを確かめます'));
  }

  // 1年あたりの秒数（原作の「1年 ≈ 45秒」にならう）
  function secLabel() { var sec = BASE_MS / 1000 / SPEEDS[speedIdx]; return '1年 ≈ ' + (sec >= 1 ? Math.round(sec) : sec.toFixed(1)) + '秒'; }
  // その年の情景と、下の1行（家の形・誰と暮らすか）
  function renderScene(r) {
    var cv = $('scene'), S = window.IchiokuScene;
    if (!cv || !S || !L) return;
    var out = S.draw(cv, L, r);
    $('scene-cap').textContent = out.caption;
    cv.setAttribute('aria-label', r.year + '年の情景。' + out.caption);
  }
  // 速さの切り替え（1× 2× 4× 8× 12× 16×）
  function renderSpeeds() {
    var box = $('speed');
    clear(box);
    SPEEDS.forEach(function (v, i) {
      var b = el('button', 'o-sp' + (i === speedIdx ? ' on' : ''), v + '×');
      b.type = 'button'; b.setAttribute('aria-pressed', i === speedIdx ? 'true' : 'false'); b.setAttribute('aria-label', '速さ ' + v + '倍');
      b.onclick = function () { speedIdx = i; store('ichioku-speed', i); renderSpeeds(); $('o-sec').textContent = secLabel(); if (cur && !cur.branch && !paused) schedule(); };
      box.appendChild(b);
    });
  }
  function speedLabel() { var sec = BASE_MS / 1000 / SPEEDS[speedIdx]; return '速さ ' + SPEEDS[speedIdx] + '倍（1年 約' + (sec >= 1 ? Math.round(sec) : sec.toFixed(1)) + '秒）'; }
  function setPauseLabel() { $('pause').querySelector('.sr').textContent = paused ? '再開' : '一時停止'; $('pause').setAttribute('aria-pressed', paused ? 'true' : 'false'); $('pause').classList.toggle('on', paused); }

  /* ---------- 根拠・家族・これまで ---------- */
  // くわしく：隠してある #details をシートの中へ移して見せ、閉じたら元の場所へ戻す
  var detailsHome = null;
  function detailsOpen() { return !!(detailsHome && $('details').parentNode === $('sheet-content')); }
  function putBackDetails() {
    var d = $('details');
    if (detailsHome && d.parentNode !== detailsHome) { d.hidden = true; detailsHome.appendChild(d); }
  }
  function openDetails() {
    if (!L || !cur) return;
    openSheet('くわしく　' + cur.year + '年・' + cur.age + '歳', function (c) {
      var d = $('details');
      detailsHome = detailsHome || d.parentNode;
      c.appendChild(d); d.hidden = false;
      renderTree(cur.year); renderComps('comps', true);
    });
  }
  function openSheet(title, build) {
    $('sheet-title').textContent = title;
    var c = $('sheet-content');
    putBackDetails();
    clear(c);
    build(c);
    $('sheet').hidden = false;
    sheetPaused = true;
    clearTimeout(timer);
    $('sheet-close').focus();
  }
  function closeSheetQuiet() { putBackDetails(); $('sheet').hidden = true; sheetPaused = false; }
  function closeSheet() {
    putBackDetails();
    $('sheet').hidden = true;
    sheetPaused = false;
    if (L && L.alive && cur && !cur.branch && !$('screen-life').hidden) schedule();
  }
  function openFamily() {
    if (!L) return;
    openSheet('家族', function (c) {
      var t = el('table', 'fam');
      var hr = el('tr');
      ['続柄', '名前', '生まれた年', ''].forEach(function (h) { hr.appendChild(el('th', null, h)); });
      t.appendChild(hr);
      var me = el('tr');
      [ '自分', L.name, L.by + '年', '' ].forEach(function (v) { me.appendChild(el('td', null, v)); });
      t.appendChild(me);
      M.familyList(L).forEach(function (m) {
        var tr = el('tr');
        var state = m.gone ? '別れた' : m.alive ? '' : m.dy + '年に亡くなった';
        [m.rel, m.name, m.by + '年', state].forEach(function (v) { tr.appendChild(el('td', null, v)); });
        t.appendChild(tr);
      });
      c.appendChild(t);
    });
  }
  function openLog() {
    if (!L) return;
    openSheet('これまでの出来事', function (c) {
      var recs = L.log.concat(cur && L.log.indexOf(cur) < 0 ? [cur] : []);
      var preDone = false;
      L.log.concat(cur && L.log.indexOf(cur) < 0 ? [cur] : []).forEach(function (r, ix) {
        if (r.pre && !preDone && L.house && L.house.prevName) { preDone = true; c.appendChild(el('p', 'ly pre-h', L.house.prevName + 'が亡くなるまで（画面に出さずに進めた年）')); }
        if (!r.pre && preDone === true) { preDone = 'end'; c.appendChild(el('p', 'ly pre-h', 'ここから' + L.name + 'として生きた年')); }
        var d = el('div', 'logyear');
        d.appendChild(el('p', 'ly', r.year + '年　' + r.age + '歳　' + r.place));
        r.events.forEach(function (e) { d.appendChild(el('p', null, evText(e))); });
        (r.autoPicked || []).forEach(function (t) { d.appendChild(el('p', 'auto-line', 'おまかせで選んだ：' + t)); });
        c.appendChild(d);
      });
    });
  }

  /* ---------- 最期の画面 ---------- */
  // 金額（千円）を「約1億2,340万円」の形にする
  function yen(k) {
    var man = Math.round(k / 100) * 10; // 10万円単位
    if (man <= 0) return '0円';
    var oku = Math.floor(man / 10000), rest = man % 10000;
    return '約' + (oku ? oku + '億' : '') + (rest ? rest.toLocaleString('ja-JP') + '万' : '') + '円';
  }
  function srcEv(src, y, what, val, extra) {
    var s = C.sources[src] || {};
    var e = { src: src, name: s.name || src, org: s.org || '', y: y, what: what, val: val, prov: !!C.meta.provisional, noYearNote: true };
    if (extra) for (var k in extra) e[k] = extra[k];
    return e;
  }
  // 生涯の稼ぎを、その時代のお金（貫文・両・円）で足し上げる。一生のうちに単位が変わった人は単位ごとに並べる
  function eraEarnText() {
    var sum = {}, order = [];
    L.log.forEach(function (r) {
      var inc = r.income;
      if (!inc || !(inc.nominal > 0)) return;
      if (sum[inc.cur] == null) { sum[inc.cur] = 0; order.push(inc.cur); }
      sum[inc.cur] += inc.nominal;
    });
    if (!order.length) return '';
    return order.map(function (cu) { return money(sum[cu], cu); }).join('と');
  }
  function renderEarnTop(g, label) {
    var era = eraEarnText();
    $('earn-era').textContent = era ? 'その時代のお金で ' + era : label;
    $('earn-num').textContent = era ? '今のお金の価値に直すと ' + yen(g.real) : '';
  }
  function renderEarn(co) {
    var g = L.earn || { real: 0, years: 0 };
    if (!C.wage) { $('earn-num').textContent = ''; $('earn-sub').textContent = ''; return; }
    renderEarnTop(g, '働いて賃金を得た年はなかった');
    var sub = [];
    if (g.years) sub.push('働いた年 ' + g.years + '年');
    sub.push(co.earnMedian > 0 ? '同じ町の100人の真ん中は ' + yen(co.earnMedian) : '同じ町の100人の半分より多くは、賃金を得る仕事に就かなかった');
    $('earn-sub').textContent = sub.join('。');
  }
  // 1975年より前の生まれの稼ぎ（推計）
  function renderEarnOld(co) {
    var g = L.earn;
    renderEarnTop(g, '働いて稼いだ年はなかった');
    var sub = [];
    if (g.years) sub.push('働いた年 ' + g.years + '年（推計）');
    sub.push(co.earnMedian > 0 ? '同じ所の100人の真ん中は ' + yen(co.earnMedian) : '同じ所の100人の半分より多くは、賃金を得る仕事に就かなかった');
    $('earn-sub').textContent = sub.join('。');
  }
  /* ---------- 日本地図：生まれた場所・移り住んだ場所・亡くなった場所 ----------
     形は国土数値情報（行政区域、2025年）の都道府県。ピンは今の市区町村の位置で、名前はその年の呼び方（旧国名や当時の府県名）で出す */
  var MAP = null;
  function getMap() {
    if (MAP) return Promise.resolve(MAP);
    return getJSON('data/map.json').then(function (m) { MAP = m; return m; }).catch(function () { return null; });
  }
  function pinXY(pin) {
    if (!MAP || !pin || pin.abroad) return null;
    if (pin.muni && MAP.munis[pin.muni]) return MAP.munis[pin.muni];
    if (pin.prov && MAP.prov && MAP.prov[pin.prov]) return MAP.prov[pin.prov];
    return pin.pref && MAP.center[pin.pref] ? MAP.center[pin.pref] : null;
  }
  // 住んだ場所を、続けて同じ所にいた年ごとにまとめる
  function stopsOf(recs) {
    var out = [];
    recs.forEach(function (r) {
      var xy = pinXY(r.pin), last = out[out.length - 1];
      if (!xy) { if (r.pin && r.pin.abroad && (!last || !last.abroad)) out.push({ abroad: true, from: r.year, to: r.year, label: r.place }); else if (last) last.to = r.year; return; }
      if (last && !last.abroad && last.xy[0] === xy[0] && last.xy[1] === xy[1]) { last.to = r.year; last.label = r.place; return; }
      out.push({ xy: xy, from: r.year, to: r.year, label: r.place, age: r.age });
    });
    return out;
  }
  function renderMap(box, recs, opt) {
    if (!box) return;
    if (!MAP) { getMap().then(function (m) { if (m) renderMap(box, recs, opt); }); return; }
    while (box.firstChild) box.removeChild(box.firstChild);
    var stops = stopsOf(recs), pts = stops.filter(function (x) { return !x.abroad; });
    var v = MAP.view, x0 = v[0], y0 = v[1], w = v[2], h = v[3];
    // ピンのまわりを大きく見せる（日本全体より狭く、横130・縦100より狭くはしない）
    if (pts.length) {
      var minX = Math.min.apply(null, pts.map(function (p) { return p.xy[0]; })), maxX = Math.max.apply(null, pts.map(function (p) { return p.xy[0]; }));
      var minY = Math.min.apply(null, pts.map(function (p) { return p.xy[1]; })), maxY = Math.max.apply(null, pts.map(function (p) { return p.xy[1]; }));
      var cw = Math.max(130, (maxX - minX) * 1.35 + 40), ch = Math.max(100, (maxY - minY) * 1.35 + 40);
      if (cw / ch > 1.3) ch = cw / 1.3; else cw = ch * 1.3;
      if (cw < w) { x0 = Math.max(v[0], Math.min(v[0] + w - cw, (minX + maxX) / 2 - cw / 2)); w = cw; }
      if (ch < h) { y0 = Math.max(v[1], Math.min(v[1] + h - ch, (minY + maxY) / 2 - ch / 2)); h = ch; }
    }
    box.setAttribute('viewBox', x0.toFixed(1) + ' ' + y0.toFixed(1) + ' ' + w.toFixed(1) + ' ' + h.toFixed(1));
    var u = w / (opt.mini ? 130 : 340); // 画面の1ピクセルに近い太さ（小さい地図は線と点を太めに）
    var land = cssVar('--map-land') || '#e8e4dc', line = cssVar('--map-line') || '#b9b2a6', acc = cssVar('--accent') || '#0a58a8', text = cssVar('--text') || '#222', bg = cssVar('--bg') || '#fff';
    Object.keys(MAP.prefs).forEach(function (pc) { box.appendChild(svg('path', { d: MAP.prefs[pc], fill: land, stroke: line, 'stroke-width': (0.8 * u).toFixed(2), 'stroke-linejoin': 'round' })); });
    if (!opt.mini) (MAP.insets || []).forEach(function (b) { box.appendChild(svg('rect', { x: b.x, y: b.y, width: b.w, height: b.h, fill: 'none', stroke: line, 'stroke-width': (0.8 * u).toFixed(2), 'stroke-dasharray': (3 * u).toFixed(1) })); });
    if (pts.length > 1) box.appendChild(svg('polyline', { points: pts.map(function (p) { return p.xy.join(','); }).join(' '), fill: 'none', stroke: acc, 'stroke-width': (2 * u).toFixed(2), 'stroke-linejoin': 'round', 'stroke-linecap': 'round', opacity: 0.8 }));
    var dead = opt.end || (L && !L.alive);
    pts.forEach(function (p, i) {
      var first = i === 0, lastP = i === pts.length - 1;
      var g = opt.mini ? svg('g', {}) : svg('g', { role: 'button', tabindex: '0', 'aria-label': p.from + (p.to > p.from ? '〜' + p.to : '') + '年　' + p.label });
      g.appendChild(svg('circle', { cx: p.xy[0], cy: p.xy[1], r: (11 * u).toFixed(2), fill: 'transparent' }));
      if (lastP && dead) {
        var d = 5 * u;
        g.appendChild(svg('path', { d: 'M' + (p.xy[0] - d) + ' ' + (p.xy[1] - d) + 'L' + (p.xy[0] + d) + ' ' + (p.xy[1] + d) + 'M' + (p.xy[0] + d) + ' ' + (p.xy[1] - d) + 'L' + (p.xy[0] - d) + ' ' + (p.xy[1] + d), stroke: text, 'stroke-width': (2.6 * u).toFixed(2), 'stroke-linecap': 'round' }));
      } else {
        g.appendChild(svg('circle', { cx: p.xy[0], cy: p.xy[1], r: ((first || lastP ? 5 : 3.5) * u).toFixed(2), fill: lastP && !dead ? acc : first ? bg : acc, stroke: first ? acc : bg, 'stroke-width': ((first ? 2.4 : 1.2) * u).toFixed(2) }));
      }
      if (!opt.mini) g.onclick = function () { openSheet(p.from + (p.to > p.from ? '〜' + p.to : '') + '年', function (c) { c.appendChild(el('p', null, p.label)); c.appendChild(el('p', 'note', (first ? '生まれた場所。' : '') + (lastP && dead ? '亡くなった場所。' : '') + '地図の点は今の市区町村（分からないときは都道府県や旧国の中ほど）の位置です')); }); };
      box.appendChild(g);
    });
    var abroad = stops.filter(function (x) { return x.abroad; });
    var old = recs.length && recs[0].year < 1871;
    var note = (old ? '地名はその年の呼び方、境目の線は今の都道府県です。' : '') + (abroad.length ? '海外にいた年は地図に出していません。' : '') + '形は国土数値情報（国土交通省）を加工';
    var nn = box.parentNode && box.parentNode.querySelector('.map-note');
    if (nn) nn.textContent = note;
    if (opt.end) {
      var ol = $('stops'); clear(ol);
      stops.forEach(function (p, i) {
        var li = el('li');
        li.appendChild(el('span', 'y', p.from + (p.to > p.from ? '〜' + p.to : '') + '年'));
        li.appendChild(el('span', null, (i === 0 && stops.length === 1 ? '生まれ、亡くなった　' : i === 0 ? '生まれた　' : i === stops.length - 1 ? '亡くなった　' : '') + p.label));
        ol.appendChild(li);
      });
    }
  }

  /* ---------- 人生地図と生き残りの曲線（最期の画面） ---------- */
  function openYear(r, withWorld) {
    openSheet(r.year + '年　' + r.age + '歳', function (c) {
      c.appendChild(el('p', 'note', r.place));
      if (withWorld && r.world && r.world.items.length) {
        c.appendChild(el('h3', null, 'その年の世の中'));
        r.world.items.forEach(function (it) {
          var b = el('button', 'item', it.t);
          b.type = 'button';
          b.disabled = true;
          c.appendChild(b);
        });
        c.appendChild(el('h3', null, '自分の出来事'));
      }
      if (!r.events.length) c.appendChild(el('p', null, 'この年の記録はありません'));
      r.events.forEach(function (e, i) {
        var b = el('button', 'item', evText(e));
        b.type = 'button';
        b.disabled = true;
        c.appendChild(b);
      });
      (r.autoPicked || []).forEach(function (t) { c.appendChild(el('p', 'auto-line', 'おまかせで選んだ：' + t)); });
    });
  }
  function renderLifeMap() {
    var box = $('lifemap'), lg = $('legend');
    clear(box); clear(lg);
    var used = {};
    L.log.forEach(function (r, i) {
      if (i % 10 === 0) box.appendChild(el('span', 'row-age', r.age + '歳'));
      var isDeath = !L.alive && i === L.log.length - 1;
      var k = E.yearKind(r, L, isDeath);
      used[k] = 1;
      var b = el('button');
      b.type = 'button';
      if (k) b.style.background = 'var(--m' + k + ')';
      if (isDeath) b.className = 'on-death';
      b.setAttribute('aria-label', r.year + '年 ' + r.age + '歳' + (k ? ' ' + E.MAP_KINDS[k] : '') + (isDeath ? ' 亡くなった年' : ''));
      b.title = r.year + '年 ' + r.age + '歳' + (k ? '・' + E.MAP_KINDS[k] : '');
      b.onclick = function () { openYear(r); };
      box.appendChild(b);
    });
    for (var k = 1; k <= 7; k++) {
      var sp = el('span');
      var sw = el('i'); sw.style.background = 'var(--m' + k + ')';
      sp.appendChild(sw); sp.appendChild(document.createTextNode(E.MAP_KINDS[k] + (used[k] ? '' : '（なし）')));
      lg.appendChild(sp);
    }
    var sp0 = el('span'); var sw0 = el('i'); sw0.style.background = 'var(--bg)'; sp0.appendChild(sw0); sp0.appendChild(document.createTextNode('大きな出来事のない年')); lg.appendChild(sp0);
    var sp1 = el('span'); var sw1 = el('i'); sw1.style.outline = '2px solid var(--text)'; sw1.style.outlineOffset = '-2px'; sp1.appendChild(sw1); sp1.appendChild(document.createTextNode('亡くなった年')); lg.appendChild(sp1);
  }
  // 同じ年に生まれた人のうち、この人が亡くなった年齢まで生きた人の割合（曲線は描かず、％だけ出す）
  function renderSurv() {
    var sv = survival(L.deathAge), p1 = function (x) { return (x * 100 >= 1 ? Math.round(x * 100) : (x * 100).toFixed(1)) + '%'; };
    var who = '同じ' + L.by + '年に生まれた' + (L.sex === 'm' ? '男' : '女') + (L.deathAge < 15 ? 'の子' : 'の人') + 'のうち、';
    // 「同じ年に生まれた人の○％より長生きした」の数字を大きく出す
    var box = $('surv-pct');
    clear(box);
    if (L.deathAge === 0) { box.appendChild(el('span', 'big-pct', p1(1 - survival(1)))); box.appendChild(el('span', 'big-cap', who + '1歳を迎えられなかった子の割合')); return; }
    box.appendChild(el('span', 'big-pct', p1(1 - sv)));
    box.appendChild(el('span', 'big-cap', '同じ年に生まれた' + (L.sex === 'm' ? '男' : '女') + (L.deathAge < 15 ? 'の子' : 'の人') + 'の' + p1(1 - sv) + 'より長生きした'));
  }
  // 生涯の移動距離：住む場所が変わるたびの直線距離（km）を足す。地図の描き方を元の経度・緯度に戻して測る
  var PJ = { S: 22, K: Math.cos(37 * Math.PI / 180), LON0: 127.6, LAT0: 45.7, OKI: [5.6, 15.0], OGA: [-1.6, 4.6] };
  function lonLat(xy, pin) {
    var sh = [0, 0], code = pin && pin.muni ? String(pin.muni) : '';
    if (code === '13421') sh = PJ.OGA;
    else if ((pin && String(pin.pref) === '47') || code.slice(0, 2) === '47' || (pin && pin.prov === '琉球')) sh = PJ.OKI;
    return [xy[0] / (PJ.K * PJ.S) + PJ.LON0 - sh[0], PJ.LAT0 - xy[1] / PJ.S - sh[1]];
  }
  function kmBetween(a, b) {
    var R = 6371, t = Math.PI / 180, dLa = (b[1] - a[1]) * t, dLo = (b[0] - a[0]) * t;
    var h = Math.sin(dLa / 2) * Math.sin(dLa / 2) + Math.cos(a[1] * t) * Math.cos(b[1] * t) * Math.sin(dLo / 2) * Math.sin(dLo / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  function lifeDistance(recs) {
    var km = 0, moves = 0, abroad = 0, last = null;
    recs.forEach(function (r) {
      if (r.pin && r.pin.abroad) { if (last && !last.abroad) abroad++; last = { abroad: true }; return; }
      var xy = pinXY(r.pin);
      if (!xy) return;
      var ll = lonLat(xy, r.pin), key = [r.pin.pref || '', r.pin.muni || '', r.pin.prov || ''].join('|');
      // 呼び名だけが変わった（旧国から県へ など）ときは、場所のコードが同じなので移ったと数えない
      if (last && !last.abroad && last.key !== key && (last.ll[0] !== ll[0] || last.ll[1] !== ll[1])) { km += kmBetween(last.ll, ll); moves++; }
      last = { ll: ll, key: key };
    });
    return { km: Math.round(km), moves: moves, abroad: abroad };
  }
  function renderDistance() {
    function put() {
      var d = lifeDistance(L.log);
      $('dist-num').textContent = d.moves ? '約' + d.km.toLocaleString('ja-JP') + 'km' : '生まれた土地から一度も移り住まなかった';
      // 答えが数字でないときは、文字を一回り小さくする（v8の直し 7）
      $('dist-num').classList.toggle('num-text', !d.moves);
      $('dist-sub').textContent = d.moves ? '引っ越し ' + d.moves + '回' : '';
    }
    if (MAP) put(); else getMap().then(function () { if (MAP) put(); });
  }

  /* ---------- 一生の浮き沈み（js/curve.js で描く） ---------- */
  var endCohort = null;
  function lifeCurveData() {
    var pts = L.log.filter(function (r) { return r.st && r.st.sat != null; }).map(function (r) { var me = mainEvent(r); return { age: r.age, year: r.year, sat: r.st.sat, label: r.age === 0 ? '生まれた' : me ? me.t.replace(/。$/, '') : '' }; });
    var marks = [], firstOf = function (k) { for (var i = 0; i < L.log.length; i++) if (E.yearKind(L.log[i], L, false) === k) return L.log[i].age; return null; };
    var ma = firstOf(3), ch = firstOf(4);
    if (ma != null) marks.push({ age: ma, kind: 'marry' });
    if (ch != null) marks.push({ age: ch, kind: 'child' });
    return { pts: pts, compare: endCohort ? endCohort.satAvg : null, marks: marks };
  }
  function renderLifeCurve() {
    var box = $('life-curve');
    if (!box || !window.IchiokuCurve || !L) return;
    var d = lifeCurveData();
    if (!d.pts.length) { clear(box); return; }
    window.IchiokuCurve.render(box, d, function (age) {
      var r = L.log.filter(function (x) { return x.age === age; })[0];
      if (r) openYear(r, true);
    }, function (age) {
      var p = d.pts.filter(function (x) { return x.age === age; })[0];
      var lb = p.label.length > 14 ? p.label.slice(0, 14) + '…' : p.label;
      return age + '歳（' + p.year + '年）　暮らしの満足 ' + p.sat + (lb ? '　' + lb : '');
    });
    var hasCmp = !!(d.compare && d.compare[0] != null) && d.pts.length > 1;
    $('lg-avg').hidden = !hasCmp; if ($('curve-cmp-note')) $('curve-cmp-note').hidden = !hasCmp;
    $('curve-legend').hidden = d.pts.length < 2;
  }
  var curveRT = null;
  window.addEventListener('resize', function () { clearTimeout(curveRT); curveRT = setTimeout(function () { if (!$('screen-end').hidden) renderLifeCurve(); }, 150); });
  // 亡くなった瞬間の1画面（第2弾の7）：暗い画面に「最後の年、33歳」。押すか2秒で次へ。動きを減らす設定では出さない
  function lessMotion() { return !!(window.IchiokuPrefs && window.IchiokuPrefs.lessMotion && window.IchiokuPrefs.lessMotion()); }
  var deathTimer = null;
  function showDeath(next) {
    var box = $('death');
    if (!box || !L) { next(); return; }
    var R = window.IchiokuRecord;
    $('death-h').textContent = '最後の年、' + L.deathAge + '歳';
    $('death-t').textContent = pol(String(deathPlace()).replace(/（今の.*?）/, '') + 'で息を引き取った。');
    $('death-c').textContent = '死因 · ' + (R ? R.causeText(L) : '');
    box.hidden = false;
    var done = false;
    function go() { if (done) return; done = true; clearTimeout(deathTimer); box.hidden = true; next(); }
    box.onclick = go; $('death-skip').onclick = go;
    deathTimer = setTimeout(go, 2000);
  }
  function endWithMoment() {
    clearTimeout(timer);
    if (!L) return;
    // 1歳にならずに亡くなった人生は、亡くなった瞬間の画面を挟まず、死亡記録と1画面にまとめる（v11の直し 6）
    if (lessMotion() || L.deathAge === 0) { showEnd(); return; }
    showDeath(function () { showEnd(); });
  }
  function deathPlace() { return L.old ? O.placeLabel(L) : (L.place.away ? L.place.prefName : L.place.prefName + L.place.muniName); }
  function birthPlace() { return L.old ? L.home.label : L.home.prefName + L.home.muniName; }
  // 死亡の記録を書く
  function renderRecord() {
    var R = window.IchiokuRecord;
    if (!R) return;
    var houseW = L.old ? O.houseWord(L) : (L.dadJobD ? '父が' + L.dadJobD.n + 'の家' : null);
    var r = R.build(L, { birthPlace: String(birthPlace()).replace(/（今の(.*?)）/, '（$1）'), deathPlace: String(deathPlace()).replace(/（今の(.*?)）/, '（$1）'), house: houseW, houseShort: L.old ? (L.parentJob ? L.parentJob.n + 'の家' : (O.houseWord(L) || '').replace(/（.*?）/, '')) : (L.dadJobD ? '父が' + L.dadJobD.n + 'の家' : null), code: L.old ? L.pref : (L.home.pref || '') });
    $('rc-no').textContent = r.no;
    $('rc-where').textContent = String(L.old ? (L.home.label || '').replace(/（.*?）/g, '') : L.home.prefName) + ' · ' + (L.sex === 'm' ? '男性' : '女性');
    $('rc-line').textContent = pol(r.line + 'だった。');
    $('rc-sum').textContent = r.summary.map(pol).join('');
    $('rc-cause').textContent = r.cause;
    $('rc-cnote').textContent = causeNote();
    var g = $('rc-grid');
    clear(g);
    function item(k, v, sub) {
      var d = el('div', 'rc-item');
      d.appendChild(el('dt', null, k));
      d.appendChild(el('dd', null, v));
      if (sub) d.appendChild(el('dd', 'rc-subv', sub));
      g.appendChild(d);
    }
    // 項目の並びは原作の死亡記録と同じ：最終学歴・最後の仕事・ともに生きた人・最期を見送った人・いちばん幸せだった年・暮らした土地・遺した財産・大人になってから時間を注いだこと
    var baby = L.deathAge === 0;
    $('screen-end').classList.toggle('infant', baby);
    if (baby) {
      // 1歳にならずに亡くなった人生も、あなたの今の年齢まで生きられなかった一文は出す（v17 4）
      var slb = TG() && TG().shortLived(C, H, L, meInfo(), thisYear(), window.IchiokuCompare);
      if (slb) { var db = el('div', 'rc-item rc-wide'); db.appendChild(el('dt', null, 'あなたと比べると')); db.appendChild(el('dd', null, slb)); g.appendChild(db); }
      $('rc-reflect-box').hidden = true; $('rc-again').onclick = null; return;
    }
    item('最終学歴', r.edu || (L.deathAge < 6 ? '—' : '学校には通わなかった'));
    var JD = window.IchiokuJobDesc, jn = (L.selfJob && L.selfJob.n) || (L.pathJob && L.pathJob.n) || '', jl = JD && jn ? JD.recordLine(jn, L.deathYear) : '';
    item('最後の仕事', r.job || '—', jl ? pol(jl) + (JD.cite(jn, L.deathYear) ? '（' + JD.cite(jn, L.deathYear) + '）' : '') : null);
    // 位階・勲章（spec6 2-10）：受けた人生だけ
    var S0 = window.IchiokuStory, hs0 = S0 && S0.finalHonors ? S0.finalHonors(L) : [];
    if (hs0.length) item('位階・勲章', hs0.map(function (h) { return S0.honorText(h); }).join('、'));
    if (L.old && O.surnameNote) { var sn0 = O.surnameNote(L); if (sn0 && /公には|苗字帯刀|氏/.test(sn0)) item('家', sn0); }
    var sp = L.members.filter(function (m) { return m.role === '配偶者' || m.role === 'パートナー'; }).slice(-1)[0];
    var kids = L.members.filter(function (m) { return m.role === '子' && !m.gone && m.by <= L.deathYear; }).length;
    var gk = L.members.filter(function (m) { return m.role === '孫' && !m.gone && m.by <= L.deathYear; }).length;
    if ((sp && L.everMarried) || kids) {
      var tw = el('div', 'rc-item'); tw.appendChild(el('dt', null, 'ともに生きた人'));
      if (sp && L.everMarried) { var end = sp.dy != null && !sp.alive ? Math.min(sp.dy, L.deathYear) : L.deathYear; if (L.shukkeY && L.shukkeY < end) end = L.shukkeY; tw.appendChild(el('dd', null, (sp.role === 'パートナー' ? 'パートナー ' : sp.sex === 'm' ? '夫 ' : '妻 ') + sp.name)); if (L.marriedY) tw.appendChild(el('dd', 'rc-subv', Math.max(1, end - L.marriedY) + '年をともに' + (L.shukkeY === end ? '（出家するまで）' : ''))); }
      if (kids) { tw.appendChild(el('dd', null, '子ども ' + kids + '人')); if (gk) tw.appendChild(el('dd', 'rc-subv', '孫' + gk + '人')); }
      g.appendChild(tw);
    }
    item('最期を見送った人', pol(r.seeOff));
    if (r.best) { var br = L.log.filter(function (x) { return x.year === r.best.year; })[0], me = br ? mainEvent(br) : null; item('いちばん幸せだった年', r.best.age + '歳（' + r.best.year + '年）', me && me.t ? (me.t.length > 30 ? me.t.slice(0, 30) + '…' : me.t) : null); }
    item('暮らした土地', r.places.slice(0, 3).join('、') + (r.places.length > 3 ? 'など' + r.places.length + 'か所' : ''));
    // 遺した財産（第2弾の7・第4弾の11）：亡くなったときの貯金（今の物価）と、買った家
    var sav = L.money && L.money.sav != null ? L.money.sav : null;
    if (sav != null || L.boughtHome) item('遺した財産', (sav != null ? money(sav) : '') + (L.boughtHome ? (sav != null ? '・' : '') + L.boughtHome + '年に買った家' : ''), sav != null ? '今の物価に直した貯金（推計）' : null);
    var tf = timeGiven();
    if (tf) item('大人になってから時間を注いだこと', tf);
    // 印を付けた出来事（v18 11-6）・趣味・旅した土地（v18 11-8）
    var stv = G && G.stars ? Object.keys(G.stars).map(function (k) { return G.stars[k]; }).sort(function (a, b) { return a.y - b.y; }) : [];
    if (stv.length) { var sd0 = el('div', 'rc-item rc-wide'); sd0.appendChild(el('dt', null, '印を付けた出来事')); stv.forEach(function (x) { sd0.appendChild(el('dd', null, '◆ ' + x.a + '歳（' + x.y + '年）　' + x.t)); }); g.appendChild(sd0); }
    var KU = window.IchiokuKurashi;
    if (KU && KU.hobbies) { var hbs = KU.hobbies(L, L.deathYear); if (hbs.length) item('趣味', hbs.map(function (h) { return h.name + (h.lv ? ' Lv.' + h.lv : ''); }).join('・')); }
    // 10歳の夢と実際の仕事（v19 17）
    var YU = window.IchiokuYume, dl = YU && YU.dreamLine ? YU.dreamLine(L) : null;
    if (dl && dl.text) { var dv0 = el('div', 'rc-item rc-wide'); dv0.appendChild(el('dt', null, '10歳の夢')); dv0.appendChild(el('dd', null, '「' + dl.dream10.name + '」' + (dl.dream15 ? '（15歳で「' + dl.dream15.name + '」に）' : ''))); dv0.appendChild(el('dd', 'rc-subv', pol(dl.text))); g.appendChild(dv0); }
    if (KU && KU.pets) { var pts = KU.pets(L, L.deathYear); if (pts.length) item('ともに暮らした動物', pts.map(function (p) { return p.a + 'の' + (p.name || p.a) + '（' + Math.max(1, p.years) + '年）'; }).join('、')); }
    var trips = travelPlaces();
    if (trips.length > 1) item('旅した土地・住んだ土地', trips.slice(0, 6).join('、') + (trips.length > 6 ? 'など' + trips.length + 'か所' : ''));
    var TE = window.IchiokuTegotae;
    if (TE && L.deathAge >= 15) { var tg0 = TE.typeOf(L); if (tg0) { var td = el('div', 'rc-item rc-wide'); td.appendChild(el('dt', null, 'この人生の手ざわり')); td.appendChild(el('dd', null, tg0.name)); if (tg0.line) td.appendChild(el('dd', 'rc-subv', tg0.line)); td.appendChild(el('dd', 'rc-subv', tg0.axes.map(function (x) { return x.a + '・' + x.b + '：' + (x.v > 0.15 ? x.b + 'より' : x.v < -0.15 ? x.a + 'より' : 'まん中'); }).join('　'))); g.appendChild(td); } }
    var dc = cmpLine('death'), mi0 = meInfo(), T0 = TG();
    if (dc || (mi0 && T0)) {
      var dv = el('div', 'rc-item rc-wide'); dv.appendChild(el('dt', null, 'あなたと比べると')); if (dc) dv.appendChild(el('dd', null, pol(dc)));
      // あなたの今の年齢のとき（v17 4）
      var meA = mi0 ? thisYear() - mi0.y : -1, ra = meA > 0 ? L.log.filter(function (x) { return x.age === meA; })[0] : null;
      if (ra) { var ev0 = mainEvent(ra); dv.appendChild(el('dd', null, 'あなたの今の年齢のとき、この人は' + ra.year + '年、' + String(ra.place || birthPlace()).replace(/（今の(.*?)）/, '（$1）') + 'で暮らしていました。' + (ev0 && ev0.t ? 'この年、' + ev0.t : ''))); }
      var sl = T0 && T0.shortLived(C, H, L, mi0, thisYear(), window.IchiokuCompare);
      if (sl) dv.appendChild(el('dd', null, sl));
      if (dv.childNodes.length > 1) g.appendChild(dv);
    }
    $('rc-reflect-box').hidden = !r.reflect;
    $('rc-reflect').textContent = r.reflect ? pol(r.reflect) : '';
    $('rc-again').onclick = function () { showDeath(function () { window.scrollTo(0, 0); }); };
  }
  // 旅した土地の点の地図（v18 11-8）：生まれた所・住んだ所・旅した所を打ち、移った道を点線でつなぐ
  function renderTrip() {
    var box = $('trip-box'); box.hidden = true;
    Promise.all([getDots(), MAP ? Promise.resolve(MAP) : getMap()]).then(function () {
      var D = DOTS; if (!D || !MAP || !L) return;
      var sv = $('trip-dots'); while (sv.firstChild) sv.removeChild(sv.firstChild);
      sv.setAttribute('viewBox', D.view.join(' '));
      var r0 = D.step * 0.32;
      D.dots.forEach(function (d) { sv.appendChild(svg('circle', { cx: d[0], cy: d[1], r: r0.toFixed(2), 'class': 'dm' })); });
      var pts = [], last = null;
      L.log.forEach(function (r) { var xy = r.pin && !r.pin.abroad ? pinXY(r.pin) : null; if (!xy) return; var k = xy[0].toFixed(1) + ',' + xy[1].toFixed(1); if (k !== last) { pts.push(xy); last = k; } });
      if (!pts.length) return;
      if (pts.length > 1) sv.appendChild(svg('polyline', { points: pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' '), 'class': 'trip-line' }));
      pts.forEach(function (p, i) { sv.appendChild(svg('circle', { cx: p[0], cy: p[1], r: (D.step * (i === 0 ? 1.3 : 1)).toFixed(2), 'class': i === 0 ? 'trip-born' : 'trip-pt' })); });
      $('trip-note').textContent = pts.length > 1 ? '紅の丸が生まれた所、ほかの丸が住んだ所と旅した所です。点線は移った順につないでいます。' : '生まれた土地から一度も移り住みませんでした。';
      box.hidden = false;
    });
  }
  // 生まれた所・住んだ所・旅した所（記録の場所の呼び名を、出てきた順に）
  function travelPlaces() {
    var out = [], seen = {};
    L.log.forEach(function (r) { var p = String(r.place || '').replace(/（今の(.*?)）/, '').split(' ')[0]; if (p && !seen[p]) { seen[p] = 1; out.push(p); } });
    return out;
  }
  // 死因の下の数字（原作にならう）：同じ死因の割合・同じ年に生まれた人のうち長く生きた割合・平均の寿命との差
  function pctW(v) { var p = v * 100; if (p < 0.05) return '0.1%未満'; return '約' + (p >= 99.5 || p < 0.5 ? p.toFixed(1) : Math.round(p)) + '%'; }
  var BANDS_OLD = [[0, 0, '0歳'], [1, 4, '1〜4歳'], [5, 14, '5〜14歳'], [15, 39, '15〜39歳'], [40, 64, '40〜64歳'], [65, 200, '65歳以上']];
  function bandWord(bands, a) { var w = ''; bands.forEach(function (b) { if (a >= b[0] && a <= b[1]) w = b[2] || (b[1] >= 200 ? b[0] + '歳以上' : b[0] === b[1] ? b[0] + '歳' : b[0] + '〜' + b[1] + '歳'); }); return w; }
  function causeNote() {
    var out = [], a = L.deathAge, cs = L.causeShare, sx = L.sex === 'm' ? (a < 15 ? '男の子' : '男性') : (a < 15 ? '女の子' : '女性');
    if (cs && cs.v > 0 && L.cause !== 'sui') {
      if (cs.old) out.push('この時代に' + bandWord(BANDS_OLD, a) + 'で亡くなった人のうち、' + pctW(cs.v) + 'が同じ死因によるものでした（' + (L.deathYear < 1900 ? '寺の過去帳の研究や流行病の記録からの推計' : '人口動態調査の死因別の死亡率からの推計') + '）。');
      else out.push(cs.y0 + '〜' + cs.y1 + '年に' + bandWord((C.nat.causeDetail && C.nat.causeDetail.bands) || [], a) + 'で亡くなった人のうち、' + pctW(cs.v) + 'が同じ死因によるものです（人口動態調査' + (cs.est ? '。細かい病名の割合は推計' : '') + '）。');
    }
    var l = 1, e0 = 0, longer = null;
    for (var k = 0; k <= 110; k++) {
      if (k === a + 1) longer = l;
      if (k > 0) e0 += l;
      l *= 1 - (L.old ? O.deathProb(Object.create(L), L.sex, k, L.by + k) : E.deathProb(C, P, L.sex, k, L.by + k));
    }
    e0 += 0.5;
    if (longer != null) out.push('同じ' + L.by + '年に生まれた' + sx + 'のうち、' + pctW(longer) + 'がこの人より長く生きます。');
    var d = Math.round((a + 0.5 - e0) * 10) / 10;
    out.push('同じ年に生まれた' + (L.sex === 'm' ? '男性' : '女性') + 'の平均の寿命' + e0.toFixed(1) + '歳（推計）より、' + Math.abs(d).toFixed(1) + '年' + (d >= 0 ? '長く' : '短く') + '生きました。');
    return out.join('');
  }
  // 大人になってから時間を注いだこと：20歳からの毎年、今年の重点か、その年のいちばん大きな出来事の種類で数える
  var GIVE = { study: '学び', earn: '仕事', family: '家族', body: 'からだ', save: '貯え', '学歴と仕事': '仕事', '家庭': '家族', '人間関係': '家族・友人', '健康': 'からだ', '地域': '地域のつとめ' };
  function timeGiven() {
    var cnt = {}, n = 0;
    L.log.forEach(function (r) {
      if (r.age < 20) return;
      var f = G ? focusAt(G, r.year) : null, me = f ? null : mainEvent(r), k = GIVE[f] || (me && me.i != null && r.events[me.i] && GIVE[r.events[me.i].cat]);
      if (k) { cnt[k] = (cnt[k] || 0) + 1; n++; }
    });
    if (n < 5) return null;
    var top = Object.keys(cnt).sort(function (x, y) { return cnt[y] - cnt[x]; })[0];
    return top + ' ' + cnt[top] + '年';
  }
  function showEnd(again) {
    clearTimeout(timer);
    if (!L) return;
    show('end');
    drawAvatar('avatar-end', L.deathYear, L.deathAge);
    $('end-title').textContent = heroName();
    $('end-sub').textContent = L.by + ' – ' + L.deathYear + ' · ' + L.deathAge + '歳没 · ' + String(deathPlace()).replace(/（今の(.*?)）/, ' $1');
    renderRecord();
    renderTsunagari();
    renderParentDiff();
    var JP = window.IchiokuJapapedia;
    $('end-jp').hidden = !(JP && JP.eligible(L));
    // 続きを生きるボタンの位置は CSS で決める（スマホ：ひとことのすぐ後。5歳までに亡くなった人生は記録の前。パソコン：右の列のいちばん上）
    $('screen-end').classList.toggle('end-baby', L.deathAge < 5);
    if (wide()) $('end-more').open = true;
    window.scrollTo(0, 0);
    renderHotline($('hotline-end'), L.cause === 'sui');
    renderLifeMap();
    renderSurv();
    renderDistance();
    stepComps(9999);
    renderComps('comps-end', false);
    $('comps-end').parentNode.hidden = !comps.length;
    renderMap($('map-end'), L.log, { end: true });
    renderTrip();

    renderHouse();
    renderTree(L.deathYear, 'tree-end');
    var co = L.old ? O.cohort(C, H, P, L, 100) : E.cohort(C, P, L.by, L.home.muni, L.seed, 100);
    endCohort = co;
    renderLifeCurve();
    if (L.old) renderEarnOld(co); else renderEarn(co);
    var list = $('cohort');
    clear(list);
    (co.items || [['地元に残った人', co.stayed], ['大学へ進んだ人', co.univ], ['80歳まで生きた人', co.to80]]).forEach(function (x) {
      var li = el('li');
      li.appendChild(el('span', 'num', x[1] + '人'));
      li.appendChild(el('span', 'cap', x[0]));
      list.appendChild(li);
    });
    $('cohort-title').textContent = L.old ? '同じ所（' + L.home.label + '）・同じ年に生まれた100人のその後' : '同じ町（' + L.home.muniName + '）・同じ年に生まれた100人のその後';
    var era = $('era');
    clear(era);
    (L.old ? O.majorTimeline(C, H, L) : E.majorTimeline(C, L.by, Math.min(L.deathYear, E.FUTURE_FROM - 1), L.home.pref)).forEach(function (r) {
      var li = el('li');
      li.appendChild(el('span', 'y', r.y + '年'));
      li.appendChild(el('span', null, r.t));
      era.appendChild(li);
    });
    if (L.deathYear >= E.FUTURE_FROM) {
      var li = el('li');
      li.appendChild(el('span', 'y', E.FUTURE_FROM + '年〜'));
      li.appendChild(el('span', null, 'この先の世の中は誰にも分からない'));
      era.appendChild(li);
    }
    if (!again) {
      try { localStorage.removeItem('ichioku-current'); } catch (e) { /* 保存できない環境 */ }
      // 同じ家の人生は1件にまとめる（1人目の種で見分ける）
      var lives = (store('ichioku-lives') || []).filter(function (x) { return x && x.seed && (!G || x.seed !== G.seed); });
      var names = houseLives.map(function (h) { return h.name; }).concat([L.name]);
      if (G) lives.unshift({ v: 2, seed: G.seed, year: G.year, answers: G.answers || [], focus: G.focus || [], marks: G.marks || [], house: G.house || null, names: names, name: L.name, by: L.by, place: L.old ? L.home.label : L.home.prefName + L.home.muniName, age: L.deathAge, dy: L.deathYear });
      store('ichioku-lives', lives.slice(0, 10));
      store('ichioku-short', L.deathAge <= 20 ? (store('ichioku-short') || 0) + 1 : 0);
      if (G) G.done = true;
    }
  }

  /* ---------- きょうだいとして生きる（最期の画面） ---------- */
  function lifeLine(h) {
    return h.by + '年生まれ　' + (h.rel ? h.rel + ' ' : '') + h.name + '　' + (h.heir ? '家を継ぎ、' : '') + (h.age === 0 ? '1歳にならずに' : h.age + '歳で') + '亡くなる';
  }
  function renderHouse() {
    var hl = $('house-lives'), cl = $('kyodai-list');
    clear(hl); clear(cl);
    var all = houseLives.concat([lifeSummary(L, houseLives.length, firstLife)]);
    $('house-block').hidden = all.length < 2;
    // 同じ日に生まれたきょうだい全員の一生を生き終えたら、横に並べて比べる（v18 8）
    var mb = $('multi-block'), mlives = all.filter(function (h) { return h.multi && h.by === L.by; });
    if (mb) {
      mb.hidden = !(L.multi && mlives.length >= L.multi.n);
      if (!mb.hidden) {
        $('multi-h').textContent = (L.surname ? L.surname + '家の' : 'この家の') + L.multi.kind;
        var tb = $('multi-tab'); clear(tb);
        var rows = [['名前', function (h) { return h.name; }], ['生きた年数', function (h) { return h.age + '年'; }], ['仕事', function (h) { return h.job || '—'; }], ['結婚', function (h) { return h.married ? 'した' : 'しなかった'; }], ['死因', function (h) { return h.cause || '—'; }]];
        rows.forEach(function (r) { var tr = el('tr'); tr.appendChild(el('th', null, r[0])); mlives.forEach(function (h) { tr.appendChild(el('td', null, String(r[1](h)))); }); tb.appendChild(tr); });
      }
    }
    all.forEach(function (h) { hl.appendChild(el('li', null, lifeLine(h))); });
    var MM = L.old ? O : E, cands = MM.childCandidates(L).concat(MM.heirCandidates(L));
    // 1歳にならずに亡くなった人生は1画面にまとめるので、続きの候補は2人まで（v11の直し 6）
    if (L.deathAge === 0) cands = cands.slice(0, 2);
    $('kyodai-block').hidden = !cands.length;
    // 1歳にならずに亡くなり、きょうだいもいないときは、同じ時代を続けて遊べるボタンを出す（v11の直し 6）
    var sa = $('same-again');
    sa.hidden = !(L.deathAge === 0 && !cands.length);
    sa.textContent = '同じ年に、同じ' + (L.old ? '国' : '都道府県') + 'でもう一度生まれる';
    $('again').className = sa.hidden ? 'btn-main' : 'btn-sub';
    // 続きの人生は3人だけ（v19 6）：子（跡取り、いなければいちばん上）・きょうだい（同じ日に生まれた子を先に）・2代あとの子孫。
    // いない区分は、ほかの区分の次の人で埋める。ほかの人は家系図から選ぶ
    var kids = cands.filter(function (c) { return c.child; }), sibs = cands.filter(function (c) { return !c.child; });
    if (L.old && kids.length) { var son = kids.filter(function (c) { return c.sex === 'm'; })[0]; if (son) kids = [son].concat(kids.filter(function (c) { return c !== son; })); }
    var lived = houseLives.map(function (h) { return h.name; }).concat([dispName(L)]);
    var multiOpts = [];
    if (L.multi) {
      sibs.sort(function (a, b) { return (L.multi.sibIds.indexOf(b.id) >= 0) - (L.multi.sibIds.indexOf(a.id) >= 0); });
      L.members.filter(function (m) { return L.multi.sibIds.indexOf(m.id) >= 0 && !cands.some(function (c) { return c.id === m.id; }); }).forEach(function (m) {
        if (lived.some(function (n) { return String(n).indexOf(m.name) >= 0; })) return;
        multiOpts.push({ cls: 'multi-b', t: m.role + ' ' + m.name + '（' + m.by + '年に生まれる）として、生まれから生きる', fn: function () { liveAsMultiBirth(m); } });
      });
    }
    function candOpt(c) { return { cls: c.child ? 'kid' : 'sib', t: c.later ? c.role + '（' + c.later + '年後に生まれる）として生きる' : (c.child ? '子の' : '') + c.role + ' ' + c.name + '（' + c.age + '歳・' + doing(c) + '）として生きる', fn: function () { liveAsSibling(c); } }; }
    function descOpt(gN) {
      var d = descPlan(gN);
      if (!d) return null;
      return { cls: 'desc' + (d.me ? ' to-me' : ''), t: (d.me ? 'あなたにつながる子孫（' + d.g + '代あと）' : gN + '代あとの子孫') + 'として生きる（' + d.by + '年に生まれる）', fn: function () { liveAsDescendant(d.g || gN, d.gap, d); } };
    }
    var kidQ = kids.map(candOpt), sibQ = multiOpts.concat(sibs.map(candOpt)), d2 = descOpt(2), descQ = [d2, descOpt(3)].filter(Boolean);
    var picks = [kidQ.shift(), sibQ.shift(), descQ.shift()];
    var rest = kidQ.concat(sibQ, descQ);
    for (var pi = 0; pi < 3; pi++) if (!picks[pi] && rest.length) picks[pi] = rest.shift();
    picks.filter(Boolean).forEach(function (o) {
      var b = el('button', 'btn-sub kyodai-btn ' + o.cls, o.t);
      b.type = 'button';
      b.onclick = o.fn;
      cl.appendChild(b);
    });
    var tl = $('tree-link'); if (tl) tl.hidden = !L || L.deathAge < 0;
    $('kyodai-block').hidden = !cl.childNodes.length && !cands.length;
    var td = $('tree-desc'); if (td) { td.hidden = !(descPlan(3) || descPlan(5)); td.onclick = openDescSheet; }
  }
  // 何代あとの子孫か（spec6 2-6・v19 10）：1代を約27年とみた目安。あなたの生まれ年と都道府県を入れた人は、あなたの生まれ年にちょうど届く間隔にする
  function descPlan(gN) {
    if (!L || L.deathAge < 15) return null;
    var T = TG(), mf = meFull();
    if (T && T.descPlan && mf) { var d = T.descPlan(L, gN, { y: +mf.y, pref: String(mf.pref) }); if (d) return d; }
    var gap = gN * 27, by = L.deathYear + gap;
    return by > 2000 ? null : { gap: gap, by: by, me: false };
  }
  // 家系図の「子孫をたどる」：3代・5代あとの子孫を選ぶ（v19 6）
  function openDescSheet() {
    openSheet('子孫をたどる', function (c) {
      [2, 3, 5].forEach(function (gN) {
        var d = descPlan(gN);
        var b = el('button', 'btn-sub kyodai-btn desc', d ? (d.g || gN) + '代あとの子孫として生きる（' + d.by + '年に生まれる）' : gN + '代あとの子孫は選べません（2000年より後に生まれる）');
        b.type = 'button';
        if (d) b.onclick = function () { closeSheetQuiet(); liveAsDescendant(d.g || gN, d.gap, d); }; else b.disabled = true;
        c.appendChild(b);
      });
    });
  }
  // きょうだいや子が、今していること（年齢と時代から）
  function doing(c) {
    var a = c.age, y = L.deathYear, old = y < 1873, f = c.sex === 'f';
    if (a < 6) return 'まだ幼い';
    if (a < 13) return old ? (f ? '子守りと家の手伝い' : '子守りと田の手伝い') : y < 1947 ? '尋常小学校に通う' : '小学校に通う';
    if (a < 16) return old ? (f ? '機織りと家の手伝い' : '田の仕事を覚えている') : y < 1947 ? '働きに出ている' : '中学校に通う';
    if (a < 19) return old ? '一人前に働いている' : y < 1950 ? '働いている' : '高校に通うか働いている';
    if (a < 60) return '働き盛り';
    return '隠居の身';
  }
  /* ---------- 家系図の人の札と「この人の人生を送る」（spec6 2-21）・親の人生をさかのぼる（spec6 2-16） ---------- */
  function openPersonCard(n) {
    var m = n.m;
    openSheet(n.label + '　' + String(n.name || '').replace(/（.*?）/g, ''), function (c) {
      var by = m.by, dy = !m.alive && m.dy != null ? m.dy : null;
      c.appendChild(el('p', null, '続柄：' + n.label));
      c.appendChild(el('p', null, (by != null ? by + '年生まれ' : '') + (dy != null ? '・' + dy + '年没' : '')));
      if (m.job || m.jobN) c.appendChild(el('p', null, '仕事：' + (m.jobN || m.job)));
      var b = el('button', 'btn-main person-live');
      b.type = 'button';
      if (n.hero) { b.textContent = 'この人の記録を見る'; b.onclick = function () { closeSheet(); var hb = $('house-block'); if (hb && !hb.hidden) hb.scrollIntoView({ block: 'start' }); }; }
      else if (L && L.alive) { b.textContent = 'この人の人生を送る（この人生が終わったら選べます）'; b.disabled = true; }
      else if (m.by > 2000 || m.by < 1000) { b.textContent = 'この人の人生は選べません（生まれ年が1000〜2000年の外）'; b.disabled = true; }
      else { b.textContent = 'この人の人生を送る'; b.onclick = function () { closeSheetQuiet(); liveAsMember(m); }; }
      c.appendChild(b);
    });
  }
  var PARENT_ROLES = { '父': 1, '母': 1, '祖父': 1, '祖母': 1 };
  function liveAsMember(m) {
    if (!G || !L) return;
    G.house = G.house || { chain: [] };
    houseLives.push(lifeSummary(L, houseLives.length, firstLife));
    var sg = { memberId: m.id, gen: 'member', rel: m.role, member: { id: m.id, by: m.by, sex: m.sex, name: m.name, role: m.role, st: m.st || null }, answers: [], marks: [], focus: [] };
    // 親や祖父母を選んだときは、今の人（子）が生まれる年の親の暮らしを書き留め、あとで比べる
    if (PARENT_ROLES[m.role]) sg.parentOf = { name: L.name, sex: L.sex, by: L.by, seed: L.seed, orig: childCond(L) };
    G.house.chain.push(sg);
    G.done = false;
    memberFrom(L, sg).then(enterLife);
  }
  function childCond(Lx) {
    var pv = Lx.old && Lx.H && Lx.H.prov[Lx.prov] ? Lx.H.prov[Lx.prov].kuni : '';
    return { place: String(birthPlace ? (Lx === L ? birthPlace() : '') : '') || pv, pref: String(Lx.old ? Lx.pref : Lx.home.pref), status: birthStatusText(Lx), inc: Lx.incPct, sibs: (Lx.members || []).filter(function (x) { return x.sib && x.by < Lx.by; }).length, job: Lx.old ? (Lx.parentJob ? Lx.parentJob.n : '') : (Lx.dadJobD ? Lx.dadJobD.n : '') };
  }
  // 家の人の生まれから生きる。種は家の種と家族の番号から決める
  function memberFrom(Lp, sg) {
    var S = window.IchiokuStory, rec = S.houseRec(Lp), mm = sg.member, by = mm.by, seed = lifeSeedOf(G, 300 + mm.id);
    var pc = rec.pref;
    return getPref(pc).then(function (p) {
      P = p;
      if (by >= 1975) { M = E; L = E.newLife(C, P, { year: by, seed: seed }); }
      else { M = O; L = O.newLife(C, H, P, { year: by, seed: seed, birth: { prov: rec.prov || O.pickBirth(C, H, by, E.makeRng(seed)).prov, sub: rec.sub || null, pref: pc, kuge: rec.status === 'kuge' && by <= 1946 } }); }
      if (mm.role !== '配偶者' && mm.role !== 'パートナー') S.applyDescend(L, rec);
      L.descendLine = '';
      L.sex = mm.sex; if (mm.name) L.name = mm.name;
      if (sg.parentOf) L.watchYear = sg.parentOf.by;
      L.marks = {};
      comps = [];
      return L;
    });
  }
  // 親の人生のあとで、もとの子をもう一度生きる。子の運（病気や出会いの乱数）は前と同じ種にする
  function rechildFrom(Lp, sg) {
    var po = sg.po, snap = po.snap;
    return getPref(snap.pref).then(function (p) {
      P = p;
      if (po.by >= 1975) { M = E; L = E.newLife(C, P, { year: po.by, seed: po.seed }); }
      else { M = O; L = O.newLife(C, H, P, { year: po.by, seed: po.seed, birth: { prov: snap.prov || O.pickBirth(C, H, po.by, E.makeRng(po.seed)).prov, sub: snap.sub || null, pref: snap.pref } }); if (snap.status) L.status = snap.status; if (snap.kakaku) L.kakaku = snap.kakaku; }
      L.sex = po.sex; L.name = po.name; L.incPct = snap.incPct;
      L.marks = {};
      comps = [];
      return L;
    });
  }
  // 親の人生が終わったら「前の人生とのちがい」を出す
  function renderParentDiff() {
    var box = $('pdiff-block'); if (!box) return;
    var segs = G && G.house && G.house.chain || [], sg = segs[segs.length - 1];
    box.hidden = !(sg && sg.parentOf && L && !L.alive);
    if (box.hidden) return;
    var po = sg.parentOf, snap = L.snapAt, born = !!(snap && snap.married && !(snap.mode === 'shukke'));
    var t = $('pdiff-table'); clear(t);
    var alt = (L.members || []).filter(function (m) { return m.role === '子' && !m.before; }).map(function (m) { return m.name + '（' + m.by + '年生まれ）'; });
    $('pdiff-note').textContent = born ? '' : 'この人生では、' + po.name + 'は生まれませんでした。' + (alt.length ? '代わりに生まれた子：' + alt.join('、') + '。下の「この家の続きを生きる」から、その子の人生を生きられます。' : '子は生まれませんでした。');
    if (snap) {
      var now = { place: snap.place || '', pref: snap.pref, status: '', inc: snap.incPct, sibs: snap.kids, job: snap.job || '' };
      var L2 = { old: true, status: snap.status, kakaku: snap.kakaku, by: po.by, year: po.by, rank: null, parentJob: null, H: H, prov: snap.prov };
      try { now.status = O.houseWord ? O.houseWord(L2) || '' : ''; } catch (e) { now.status = ''; }
      var rich = function (v) { return v == null ? '—' : RICH.filter(function (r) { return v < r[0]; })[0][1]; };
      [['生まれた土地', po.orig.place || po.orig.pref, now.place || now.pref], ['家の身分', po.orig.status, now.status], ['暮らし向き', rich(po.orig.inc), rich(now.inc)], ['きょうだいの数', po.orig.sibs + '人', now.sibs + '人'], ['親の仕事', po.orig.job || '—', now.job || '—']].forEach(function (r) {
        var tr = el('tr'); tr.appendChild(el('th', null, r[0])); tr.appendChild(el('td', null, r[1] || '—')); tr.appendChild(el('td', null, r[2] || '—')); t.appendChild(tr);
      });
    }
    var b = $('pdiff-go');
    b.hidden = !born;
    b.textContent = po.name + 'の人生をもう一度生きる';
    b.onclick = function () {
      houseLives.push(lifeSummary(L, houseLives.length, firstLife));
      var ns = { memberId: 0, gen: 'rechild', rel: '子（' + po.name + '）', po: { name: po.name, sex: po.sex, by: po.by, seed: po.seed, snap: snap }, answers: [], marks: [], focus: [] };
      G.house.chain.push(ns); G.done = false;
      rechildFrom(L, ns).then(enterLife);
    };
  }
  // Japapedia の画面（spec6 2-12・2-24）
  var jpArt = null;
  function openJapapedia() {
    var JP = window.IchiokuJapapedia; if (!JP || !L) return;
    jpArt = JP.build(L, { name: heroName(), houseWord: L.old ? O.houseWord(L) : birthStatusText(L), place: String(birthPlace()).replace(/（今の(.*?)）/, ' $1'), deathPlace: String(deathPlace()).replace(/（今の(.*?)）/, ' $1') });
    show('jp');
    JP.render($('jp-art'), jpArt, drawAvatar);
    clear($('jp-imgs')); $('jp-imgs').hidden = true;
  }
  function jpImages() {
    var JP = window.IchiokuJapapedia; if (!JP || !jpArt) return;
    $('jp-img').disabled = true;
    var avs = [0, 1, 2].map(function (i) { return $('jp-av-' + i); });
    JP.toImages(jpArt, avs).then(function (urls) {
      var box = $('jp-imgs'); clear(box); box.hidden = false;
      urls.forEach(function (u, i) {
        var a = el('a'); a.href = u; a.download = 'japapedia-' + jpArt.title + '-' + (i + 1) + '.png';
        var im = el('img'); im.src = u; im.alt = 'Japapedia の画像 ' + (i + 1) + '/' + urls.length;
        a.appendChild(im); box.appendChild(a);
      });
      box.appendChild(el('p', 'note', '画像を押すと保存できます（長押しでも保存できます）'));
      $('jp-img').disabled = false;
      box.scrollIntoView({ block: 'start' });
    });
  }
  /* ---------- あなたとのつながり・今に残るもの・この家をあなたまでたどる（v17） ---------- */
  function tgCtx() { return { C: C, H: H, E: E, O: O, S: window.IchiokuStory, P: function (c) { return prefCache[c] || null; }, pol: pol }; }
  function renderTsunagari() {
    var T = TG(), box = $('tg-box');
    if (!T || !box) return;
    var me = meInfo(), c = T.connect(H, L, me, thisYear());
    box.hidden = false;
    $('tg-big').hidden = !c.lines.length;
    $('tg-big').textContent = c.lines[0] || '';
    var tl = $('tg-lines'); clear(tl);
    c.lines.slice(1).forEach(function (t) { tl.appendChild(el('p', null, t)); });
    $('tg-close').textContent = c.close;
    $('tg-more').hidden = c.kind !== 'anc';
    $('tg-explain').textContent = T.EXPLAIN;
    $('tg-guide').hidden = !!me;
    $('tg-guide').onclick = goMeBox;
    // 今に残るもの
    var muni = L.old ? (String(birthPlace()).match(/（今の(.*?)）/) || [])[1] : (L.home.prefName + L.home.muniName);
    if (muni) muni = muni.replace(/のあたり$/, '');
    var im = c.kind === 'near' ? [] : T.imani(H, L, muni || null);
    $('im-wrap').hidden = !im.length;
    var il = $('im-lines'); clear(il);
    im.forEach(function (t) { il.appendChild(el('p', null, t)); });
    $('im-note').textContent = H && H.imani ? '一宮・国分寺・街道・祭りは、出典のある表から引いています（出典は「このサイトについて」の一覧に）。この人が参ったか、見たかは記録にありません。' : '';
    // この家をあなたまでたどる：生まれた年と都道府県を入れた人だけ。60年より前の生まれ（親や祖父母の世代より前）の人
    var full = meFull(), can = L.old && L.deathAge >= 0 && c.kind === 'anc';
    $('tr-wrap').hidden = !can;
    clear($('tr-list')); $('tr-born').hidden = true; $('tr-years-box').hidden = true; $('tr-prog').hidden = true;
    $('tr-go').hidden = !full;
    $('tr-go').disabled = false;
    $('tr-note').textContent = full ? (T.kidsOf(L).length ? '主人公の子' : '主人公のきょうだいの子') + 'から1代ずつ、名字・家の格・家宝・家訓を受け継いで下り、' + full.y + '年に' + ((H && H.prefNames && H.prefNames[full.pref]) || '') + 'で生まれる子までたどります。各代の行を押すと、その代の一生を遊び直せます。' : '生まれた年と都道府県を入れると、この家をあなたの生まれ年までたどれます。';
    if (!full) { var gb = el('button', 'btn-sub tg-guide', '生まれた年と都道府県を入れる'); gb.type = 'button'; gb.onclick = goMeBox; clear($('tr-list')); $('tr-list').appendChild(el('li', null)).appendChild(gb); }
    $('tr-go').onclick = function () { runTrace(full); };
    if (L.tracePrefix && full) runTrace(full); // 遊び直した代のあとは、続きをそのまま作り直して見せる
  }
  // トップの「あなたが生まれた年と都道府県」へ
  function goMeBox() {
    clearTimeout(timer);
    show('top');
    var b = $('me-box'); if (b) { b.open = true; b.scrollIntoView({ block: 'start' }); var y = $('me-year'); if (y) y.focus(); }
  }
  var traceRun = 0;
  function runTrace(me) {
    var T = TG(); if (!T || !G) return;
    var run = ++traceRun, Lstart = L, k0 = (L.tracePrefix && L.tracePrefix.gens || []).length;
    $('tr-go').disabled = true; $('tr-go').hidden = true;
    $('tr-prog').hidden = false; $('tr-prog').textContent = 'たどっています…';
    var codes = [String(L.old ? (L.home0 || {}).pref || L.pref : L.home.pref), String(me.pref)];
    Promise.all(codes.map(function (c) { return getPref(c); }).concat([dataAll()])).then(function () {
      var ctx = tgCtx(), st = T.traceStart(ctx, Lstart, me, G.seed ^ 0x7a3c, Lstart.tracePrefix || null);
      if (Lstart.tracePrefix) T.addSelf(ctx, st, Lstart);
      (function step() {
        if (run !== traceRun || L !== Lstart) return;
        try { T.traceStep(ctx, st); } catch (e) { $('tr-prog').textContent = 'たどる途中で止まりました'; return; }
        $('tr-prog').textContent = 'たどっています（' + st.gens.length + '代目・' + (st.L ? st.L.by : '') + '年生まれまで）';
        if (!st.done) { setTimeout(step, 0); return; }
        showTrace(st, me);
      })();
    });
  }
  function showTrace(st, me) {
    var T = TG(), ol = $('tr-list');
    clear(ol);
    $('tr-prog').hidden = true;
    if (st.headNote) ol.appendChild(el('li', 'tr-head', st.head.by + '年 ' + st.head.name + '（この人）　' + st.headNote));
    st.gens.forEach(function (g, i) {
      var li = el('li'), b = el('button', 'feed-row tr-row'); b.type = 'button';
      b.appendChild(el('span', 'fa', g.k + '代目'));
      b.appendChild(el('span', 'ft', g.lines.join('')));
      b.onclick = function () { liveAsTraceGen(st, i); };
      li.appendChild(b); ol.appendChild(li);
    });
    var bt = $('tr-born');
    bt.hidden = false;
    bt.textContent = T.endText(H, st);
    var yb = $('tr-years'); clear(yb);
    $('tr-years-box').hidden = !st.end || st.end.kind !== 'born';
    if (st.end && st.end.kind === 'born') {
      $('tr-years-h').textContent = 'この家の' + st.end.years + '年';
      yb.appendChild(el('li', null, st.head.by + '年　' + st.head.name));
      st.gens.forEach(function (g) { yb.appendChild(el('li', null, g.by + '年　' + g.name)); });
      yb.appendChild(el('li', null, st.end.y + '年　一人の子（あなたと同じ年に生まれた子）'));
    }
  }
  // たどった代の一生を、自分で選んで遊び直す（後の代は作り直す）
  function liveAsTraceGen(st, i) {
    if (!G || !L) return;
    var g = st.gens[i];
    G.house = G.house || { chain: [] };
    houseLives.push(lifeSummary(L, houseLives.length, firstLife));
    G.house.chain.push({ memberId: 0, gen: 'trace', tr: g.p, prefix: { head: st.head, keep: st.keep, headNote: st.headNote || '', gens: st.gens.slice(0, i) }, rel: g.k + '代目の子孫', answers: [], marks: [], focus: [] });
    G.done = false;
    traceFrom(G.house.chain[G.house.chain.length - 1]).then(enterLife);
  }
  function traceFrom(sg) {
    var T = TG();
    return Promise.all([getPref(sg.tr.pref), getHistory()]).then(function (a) {
      P = a[0];
      L = T.makeGen(tgCtx(), sg.tr);
      M = L.old ? O : E;
      L.tracePrefix = sg.prefix;
      L.marks = {};
      comps = [];
      return L;
    });
  }
  function liveAsDescendant(gN, gap, d) {
    if (!G || !L) return;
    G.house = G.house || { chain: [] };
    houseLives.push(lifeSummary(L, houseLives.length, firstLife));
    var mf = d && d.me ? meFull() : null;
    var sg = { memberId: 0, gen: 'desc', gap: gap, me: mf ? { y: +mf.y, pref: String(mf.pref) } : null, rel: (mf ? 'あなたにつながる' : '') + gN + '代あとの子孫', answers: [], marks: [], focus: [] };
    G.house.chain.push(sg);
    G.done = false;
    descendFrom(L, sg).then(enterLife);
  }
  function liveAsMultiBirth(m) {
    if (!G || !L) return;
    G.house = G.house || { chain: [] };
    houseLives.push(lifeSummary(L, houseLives.length, firstLife));
    G.house.chain.push({ memberId: m.id, gen: 'multiB', rel: m.role, answers: [], marks: [], focus: [] });
    G.done = false;
    inheritFrom(L, m.id, 'multiB').then(enterLife);
  }
  function liveAsSibling(c) {
    if (!G || !L) return;
    G.house = G.house || { chain: [] };
    houseLives.push(lifeSummary(L, houseLives.length, firstLife));
    G.house.chain.push(c.child ? { memberId: c.id, gen: 'child', rel: '子（' + c.role + '）', answers: [], marks: [], focus: [] } : { memberId: c.id, rel: c.role, answers: [], marks: [], focus: [] });
    G.done = false;
    inheritFrom(L, c.id, c.child ? 'child' : null).then(enterLife);
  }

  /* ---------- 操作 ---------- */
  function bind() {
    $('pause').onclick = function () { paused = !paused; setPauseLabel(); if (paused) { clearTimeout(timer); ybar(0); } else if (cur && !cur.branch) schedule(); };
    renderSpeeds();
    $('o-money').onclick = openMoney;
    // すべておまかせの途中で画面を押すと、今の年で一時停止にする（v19 11。原作の「カードを押すと止まります」）
    $('screen-life').addEventListener('click', function (e) {
      if (auto !== 2 || paused || !L || !L.alive || (cur && cur.branch)) return;
      if (e.target.closest && e.target.closest('button, a, summary, select, #branch, .o-head')) return;
      paused = true; setPauseLabel(); clearTimeout(timer); ybar(0);
    });
    $('tree-go').onclick = function () { var h = $('tree-end-h'); if (h) h.scrollIntoView({ block: 'start', behavior: lessMotion() ? 'auto' : 'smooth' }); };
    // 次の分かれ道まで：分かれ道・節目の問いかけ・最期のどれかまで、年を続けて進める（1年ずつ画面に出してから次へ）
    $('skip').onclick = function () {
      if (!L || (cur && cur.branch)) return;
      clearTimeout(timer);
      var guard = 0;
      (function go() {
        if (!L || !L.alive) { if (L) endWithMoment(); return; }
        cur = M.step(L);
        autoResolve();
        render(cur);
        saveCurrent();
        if (cur.branch) { showBranch(cur.branch); return; }
        if (!L.alive) { setTimeout(showEnd, 400); return; }
        if (guard++ > 130) return;
        timer = setTimeout(go, 60);
      })();
    };
    $('next').onclick = function () { if (cur && cur.branch) return; closeSheetQuiet(); if (!L.alive) showEnd(); else nextYear(); };
    $('family').onclick = openFamily;
    $('log').onclick = openLog;
    $('st4').onclick = openSt;
    $('detail').onclick = openDetails;
    Array.prototype.forEach.call(document.querySelectorAll('.focus-opts .btn-sub'), function (b) {
      b.onclick = function () { var f = b.getAttribute('data-f'); setFocus(L && L.focus === f ? null : f); };
    });
    $('auto-top').onclick = function () { $('auto').onclick(); };
    // 浮き沈みのグラフは「ほかの記録を開く」の中にあるので、開いたときに幅に合わせて描き直す
    $('end-more').addEventListener('toggle', function () { if ($('end-more').open && L && !L.alive) renderLifeCurve(); });
    $('auto-born').onclick = function () { auto = (auto + 1) % 3; try { localStorage.setItem('ichioku-auto', ['0', 'k', '2'][auto]); } catch (e) { /* 保存できない環境 */ } renderFocus(); };
    $('back-top').onclick = backToPrev;
    $('auto').onclick = function () {
      auto = (auto + 1) % 3;
      try { localStorage.setItem('ichioku-auto', ['0', 'k', '2'][auto]); } catch (e) { /* 保存できない環境 */ }
      if (G) { G.auto = auto === 2; G.mode = auto; if (!G.done) saveCurrent(); }
      renderFocus();
      // 分かれ道で止まっているときに入れたら、そのまま選んで進む
      if (auto && cur && cur.branch && L && L.alive) {
        closeSheet();
        autoResolve(); render(cur); saveCurrent();
        if (cur.branch) showBranch(cur.branch); else { $('branch').hidden = true; schedule(); }
      }
    };
    $('end-jp').onclick = openJapapedia;
    $('jp-back').onclick = function () { show('end'); };
    $('jp-img').onclick = jpImages;
    $('num-income-box').onclick = openMoney;
    $('num-sav-box').onclick = openMoney;
    $('end-log').onclick = openLog;
    $('sheet-close').onclick = closeSheet;
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('sheet').hidden) closeSheet(); });
    $('card-end').onclick = function () { openCard('end'); };
    $('resume').onclick = resume;
    $('clear-all').onclick = function () {
      if (!window.confirm('これまでの人生と途中の記録をすべて消します。よろしいですか？')) return;
      try { localStorage.removeItem('ichioku-lives'); localStorage.removeItem('ichioku-current'); } catch (e) { /* 保存できない環境 */ }
      initPast();
    };
    // 別の時代に生まれる・生まれ変わる：トップに戻らず、すぐ次の人生を始める
    $('again').onclick = rebornNow;
    $('same-again').onclick = sameAgain;
    // 同じ人生をもう一度（作る人の指示 2026-10-19）：同じ種で、同じ年・同じ場所・同じ家族に生まれ直す
    $('same-life').onclick = function () { if (!G) return; var sd = G.seed, sn = snapshotG(); if (sn) store('ichioku-prev', sn); clearTimeout(timer); closeSheetQuiet(); L = null; cur = null; houseLives = []; window.scrollTo(0, 0); born(sd); };
    $('reborn-top').onclick = rebornNow;
    // v18：上の帯のボタン（トップへ・明るさ・遊び方・生まれ変わる）と、いちばん上へ・速さの吹き出し
    Array.prototype.forEach.call(document.querySelectorAll('[data-go-top]'), function (b) { b.onclick = goTop; });
    Array.prototype.forEach.call(document.querySelectorAll('[data-theme-toggle]'), function (b) { b.onclick = function () { if (window.IchiokuPrefs && window.IchiokuPrefs.toggleTheme) window.IchiokuPrefs.toggleTheme(); }; });
    Array.prototype.forEach.call(document.querySelectorAll('[data-reborn]'), function (b) { b.onclick = function () { closeSheetQuiet(); rebornNow(); }; });
    Array.prototype.forEach.call(document.querySelectorAll('[data-back-prev]'), function (b) { b.onclick = function () { closeSheetQuiet(); backToPrev(); }; });
    Array.prototype.forEach.call(document.querySelectorAll('[data-mode]'), function (b) {
      b.onclick = function () { var want = +b.getAttribute('data-mode'); auto = (want + 2) % 3; $('auto').onclick(); };
    });
    Array.prototype.forEach.call(document.querySelectorAll('details.pane[data-pane]'), function (d) {
      d.addEventListener('toggle', function () {
        if (wide()) return;
        var st = store('ichioku-panes') || {}; st[d.getAttribute('data-pane')] = d.open; store('ichioku-panes', st);
        if (d.open && L && cur) { paneYear = null; renderPanes(cur); }
      });
    });
    $('pm-more').onclick = openMoney;
    $('speed-tip-x').onclick = function () { $('speed-tip').hidden = true; store('ichioku-tip', 1); };
    $('to-up').onclick = function () { window.scrollTo(0, 0); };
    window.addEventListener('scroll', function () { var sc = document.body.getAttribute('data-screen'); $('to-up').hidden = !(sc === 'life' || sc === 'end' || sc === 'birth') || window.scrollY < 500; }, { passive: true });
    var mqw = window.matchMedia ? window.matchMedia('(min-width: 960px)') : null;
    if (mqw && mqw.addEventListener) mqw.addEventListener('change', function () { syncPanes(); if (L && cur) { paneYear = null; renderPanes(cur); } });
    $('map-open').onclick = openBigMap;
    $('mini4').onclick = openSt;
  }
  function initPast() {
    // これまでの人生の生まれ年も、トップの盤に入れる（盤を埋める仕組みより前の記録）
    var ys = store('ichioku-born-years') || [], add = false;
    (store('ichioku-lives') || []).forEach(function (x) { var y = x && (x.year || x.by); if (y && ys.indexOf(y) < 0) { ys.push(y); add = true; } });
    if (add) { store('ichioku-born-years', ys); if (window.IchiokuTop) window.IchiokuTop.refresh(); }
    var past = (store('ichioku-lives') || []).filter(function (x) { return x && x.seed; });
    $('past').textContent = past.length ? 'これまでの人生（最大10件。記録はこの端末のブラウザにだけ残ります）' : '';
    var list = $('past-list');
    clear(list);
    past.forEach(function (x) {
      var li = el('li');
      var who = x.names && x.names.length > 1 ? x.names.join(' → ') + '（' + x.names.length + '人）' : x.name;
      var b = el('button', 'item', (x.by || x.year) + '年〜' + x.dy + '年　' + x.age + '歳　' + who + '（' + x.place + '）');
      b.type = 'button';
      b.onclick = function () { reopen(x); };
      li.appendChild(b);
      list.appendChild(li);
    });
    var curRec = store('ichioku-current');
    $('resume').hidden = !(curRec && curRec.seed);
    if (curRec && curRec.seed) $('resume').textContent = '続きから（' + curRec.year + '年生まれ・' + (curRec.shown - curRec.year) + '歳から）';
    $('clear-all').hidden = !(past.length || (curRec && curRec.seed));
  }

  bind();
  // 続きの人生・家の作り直しの前に、どの時代のデータもそろえる（v19 12。そろう前に作ると、全部を読んだときと違う人生になる）
  var inheritFrom0 = inheritFrom, descendFrom0 = descendFrom, memberFrom0 = memberFrom, rechildFrom0 = rechildFrom, traceFrom0 = traceFrom, buildHouse0 = buildHouse;
  inheritFrom = function () { var a = arguments; return dataAll().then(function () { return inheritFrom0.apply(null, a); }); };
  descendFrom = function () { var a = arguments; return dataAll().then(function () { return descendFrom0.apply(null, a); }); };
  memberFrom = function () { var a = arguments; return dataAll().then(function () { return memberFrom0.apply(null, a); }); };
  rechildFrom = function () { var a = arguments; return dataAll().then(function () { return rechildFrom0.apply(null, a); }); };
  traceFrom = function () { var a = arguments; return dataAll().then(function () { return traceFrom0.apply(null, a); }); };
  buildHouse = function () { var a = arguments; return dataAll().then(function () { return buildHouse0.apply(null, a); }); };
  // 速さは前に選んだものを覚えておく（v19）
  var sp0 = store('ichioku-speed'); if (typeof sp0 === 'number' && sp0 >= 0 && sp0 < SPEEDS.length) speedIdx = sp0;
  try { var av = localStorage.getItem('ichioku-auto'); auto = av === '1' || av === '2' ? 2 : av === 'k' ? 1 : 0; } catch (e) { /* 保存できない環境 */ }
  renderFocus();
  var commonP = getJSON('data/common.json'); window.IchiokuCommonP = commonP.catch(function () { return null; });
  commonP.then(function (c) { C = c; getMap(); initTop(); mountMe(); meModal(); }).catch(function () {
    $('born').textContent = 'データを取り出せませんでした';
  });
})();
