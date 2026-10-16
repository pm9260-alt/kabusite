/* 1000分の1 画面の動き */
(function () {
  'use strict';
  var E = window.Ichioku, O = window.IchiokuOld, M = E;
  var H = null; // 1975年より前の生まれのための束（data/history.json。必要になったときに取り出す）
  var BASE_MS = 7000;          // 1年あたりの表示時間（1倍のとき）。約80年で約10分
  var SPEEDS = [1, 2, 4, 8, 16];
  var C = null, prefCache = {}, P = null, L = null, cur = null;
  var timer = null, paused = false, speedIdx = 0, sheetPaused = false, auto = false;

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  // 授業用の表示では、つらい出来事を短い一行にする
  function evText(e) { return e.short && window.IchiokuPrefs && window.IchiokuPrefs.classMode() ? e.short : e.t; }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function show(name) {
    ['top', 'life', 'end'].forEach(function (s) { $('screen-' + s).hidden = s !== name; });
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
  function makeLife(seed) {
    var year = yearOfSeed(seed);
    var ready = year >= 1975 ? Promise.resolve({ pref: E.pickPref(C, year, E.makeRng(seed ^ 0x9e3779b9)) }) :
      getHistory().then(function (h) { return O.pickBirth(C, h, year, E.makeRng(seed ^ 0x9e3779b9)); });
    return ready.then(function (b) { return getPref(b.pref).then(function (p) { return { b: b, p: p }; }); }).then(function (x) {
      P = x.p;
      if (year >= 1975) { M = E; L = E.newLife(C, P, { year: year, seed: seed }); }
      else { M = O; L = O.newLife(C, H, P, { year: year, seed: seed, birth: x.b }); }
      L.marks = {};
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
        return o ? o.l : '統計どおり';
      });
      (r.autoPicked = r.autoPicked || []).push(br.title + '（' + (labels.length ? labels.join('・') : '統計どおり') + '）');
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
  function lifeSummary(Lx, k, first) {
    var rel = '';
    if (k > 0 && first) { var id = G.house.chain[k - 1].memberId, m = first.members.filter(function (x) { return x.id === id; })[0]; if (m) rel = m.role; }
    return { name: Lx.name, by: Lx.by, age: Lx.deathAge, heir: !!Lx.heir, rel: rel };
  }
  // 亡くなった人から、きょうだい（memberId）へ引き継ぐ
  function inheritFrom(Lp, memberId) {
    var MM = Lp.old ? O : E, h = MM.houseOf(Lp, []);
    return getPref(Lp.old ? h.home.pref : Lp.P.code).then(function (p) {
      P = p; M = MM;
      var opt = { house: h, memberId: memberId, seed: lifeSeedOf(G, memberId) };
      L = Lp.old ? O.newLife(C, H, P, opt) : E.newLife(C, P, opt);
      L.marks = {};
      comps = [];
      preRun(Math.max(h.deathYear, L.by));
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
          playFull(sg);
          houseLives.push(lifeSummary(L, k, firstLife));
          k++;
          return inheritFrom(L, segs[k].memberId).then(next);
        }
        return untilYear == null ? playFull(sg) : replayTo(sg, untilYear);
      }
      return next();
    });
  }
  // 生まれる年は1000〜2000年のどの年も同じ確率（作る人の判断 2026-10-16）
  function born() {
    var seed = randomSeed();
    $('born').disabled = true;
    G = { v: 2, seed: seed, year: yearOfSeed(seed), answers: [], marks: [], focus: [], auto: auto };
    houseLives = [];
    makeLife(seed).then(function () {
      firstLife = L;
      paused = false; setPauseLabel();
      show('life');
      $('born').disabled = false;
      nextYear();
    }).catch(function () {
      $('born').disabled = false;
      alert('データを取り出せませんでした。通信の状態を確かめて、もう一度押してください。');
    });
  }
  // 続きから
  function resume() {
    var g = store('ichioku-current');
    if (!g || !g.seed) return;
    G = g; G.marks = G.marks || []; G.focus = G.focus || []; auto = !!G.auto; G.done = false;
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
      function evBtn(label, evs) { var b = el('button', 'ev-link', label); b.type = 'button'; b.onclick = function () { openEvidence(label, evs); }; c.appendChild(b); }
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
          var b = el('button', 'item', (w.d >= 0 ? '+' : '-') + money(Math.abs(w.d)) + '　' + w.t);
          b.type = 'button';
          b.onclick = function () { openEvidence(w.t, w.ev); };
          c.appendChild(b);
        });
      }
      c.appendChild(el('h3', null, 'もとになった統計'));
      var evw = el('div', 'ev-list'); c.appendChild(evw);
      c = evw;
      if (r.money && r.money.priceEv) evBtn('今の物価に直す方法', [r.money.priceEv]);
      if (r.money && r.money.takeEv) evBtn('手取りの割合', [r.money.takeEv]);
      if (m && m.savEv) evBtn('貯金の目安', [m.savEv]);
      if (r.money && r.money.koku != null) evBtn('米に直す方法', [{ name: '米の値段の目安', org: '', what: '1830年ごろの米1石（約150kg）をおよそ1両とし、物価の動きに合わせて米の値段を動かした', val: '', est: true }]);
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
          var b = el('button', 'item', (w.d > 0 ? '+' : '') + w.d + '　' + w.t);
          b.type = 'button';
          b.onclick = function () { openEvidence(w.t, w.ev); };
          box.appendChild(b);
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
  function renderTree(year) {
    var box = $('tree');
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
      return { label: self ? '自分' : rel(m), name: (self ? L.name : m.name) || '', sub: dead ? m.dy + '年没・' + age + '歳' : (m && m.gone ? '別れた' : age + '歳'), dead: dead, self: !!self, gone: !!(m && m.gone), by: self ? L.by : m.by, id: self ? 0 : m.id, m: m };
    }
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
    // 人がいない段は詰める
    var rowsAll = [r0, r1, r2, r3, r4], k2 = 0;
    rowsAll.forEach(function (row) { if (!row.length) return; row.forEach(function (n) { n.y = k2 * (NH + GY); }); k2++; });
    var all = r0.concat(r1, r2, r3, r4);
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
      g.appendChild(svg('rect', { x: n.x, y: n.y, width: NW, height: NH, fill: fill }));
      g.appendChild(svg('text', { x: n.x + NW / 2, y: n.y + 13, 'text-anchor': 'middle', 'font-size': 10, fill: fg2 }, n.label));
      var nm = n.name.length > 7 ? n.name.slice(0, 7) + '…' : n.name;
      g.appendChild(svg('text', { x: n.x + NW / 2, y: n.y + 27, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: fg }, nm || '（名前なし）'));
      g.appendChild(svg('text', { x: n.x + NW / 2, y: n.y + 40, 'text-anchor': 'middle', 'font-size': 10, fill: fg2 }, n.sub));
    });
    box.appendChild(g);
    // 自分が見える位置へ
    box.scrollLeft = Math.max(0, selfN.x - minX - box.clientWidth / 2 + NW / 2);
  }


  function updateLife(fn) {
    var lives = store('ichioku-lives') || [];
    for (var i = 0; i < lives.length; i++) if (lives[i] && G && lives[i].seed === G.seed) { fn(lives[i]); break; }
    store('ichioku-lives', lives);
  }
  function saveLifeMarks() { updateLife(function (x) { x.marks = G.marks || []; x.house = G.house || null; }); }

  /* ---------- 共有用の画像 ---------- */
  function shareLabel(v) {
    var pctx = v * 100, p = pctx >= 1 ? pctx.toFixed(1) : pctx >= 0.01 ? pctx.toFixed(3) : pctx.toFixed(4);
    var n = Math.round(1 / v);
    var nTxt = n >= 10000 ? (n / 10000 >= 10 ? Math.round(n / 10000) : (n / 10000).toFixed(1)) + '万' : n.toLocaleString('ja-JP');
    return p + '%（約' + nTxt + '人に1人）';
  }
  function birthInfo() {
    if (L.old) {
      var b = O.birthShare(L);
      return { place: L.home.label, share: b.share, what: b.where + 'で生まれた割合' + (L.by < 1873 ? '（旧国の人口から推計）' : '') };
    }
    var tot = 0, mine = 0;
    C.prefs.forEach(function (p) { var v = E.val(p.births, L.by); tot += v; if (p.code === L.home.pref) mine = v; });
    var mu = P.munis.filter(function (m) { return m.code === L.home.muni; })[0];
    var ms = mu ? E.val(mu.share, L.by) : 1;
    return { place: L.home.prefName + L.home.muniName, share: (mine / tot) * ms, what: L.home.prefName + L.home.muniName + 'で生まれた割合' };
  }
  function eduLabel() {
    var e = L.edu || (L.old ? null : null);
    var M2 = { '家学': '家で漢籍や和歌を学んだ', '寺での手習い': '寺で字を習った', '寺子屋': '寺子屋で字を習った', '藩校': '藩校で学んだ', '村学校': '村学校で学んだ', '小学校': '小学校を出た', '中学': '中学校を出た', '高等小学校': '高等小学校を出た', '旧制中学': '旧制中学を出た', '高等女学校': '高等女学校を出た', '旧制の上の学校': '旧制の上の学校を出た', '高校': '高校を出た', '短大': '短大を出た', '短大・専門': '短大・専門学校を出た', '大学': '大学を出た' };
    return e ? (M2[e] || e) : (L.deathAge < 6 ? '学校に通う年まで生きられなかった' : '学校には通わなかった');
  }
  function familyLabel() {
    var ms = L.members, sp = ms.filter(function (m) { return m.role === '配偶者' || m.role === 'パートナー'; }).length;
    var k = ms.filter(function (m) { return m.role === '子'; }).length, g = ms.filter(function (m) { return m.role === '孫'; }).length;
    if (L.deathAge < 15) return 'きょうだい ' + ms.filter(function (m) { return m.sib && !m.before; }).length + '人';
    return (sp ? (L.everMarried ? '結婚した' : 'パートナーと暮らした') : '結婚はしなかった') + (k ? '・子ども ' + k + '人' : '') + (g ? '・孫 ' + g + '人' : '');
  }
  function openCard(kind) {
    if (!L || !window.IchiokuCard) return;
    var K = window.IchiokuCard;
    openSheet(kind === 'birth' ? '誕生カード' : '最期のカード', function (c) {
      var cv = document.createElement('canvas');
      cv.className = 'card-preview'; cv.setAttribute('role', 'img');
      if (kind === 'birth') {
        var bi = birthInfo();
        K.birth(cv, { L: L, era: eraOf(L.by), place: bi.place, name: L.name, shareWhat: bi.what, shareText: shareLabel(bi.share) });
        cv.setAttribute('aria-label', L.by + '年に' + bi.place + 'で生まれた' + L.name + 'さんの誕生カード');
      } else {
        var from = L.old ? L.home.label : L.home.prefName + L.home.muniName;
        var to = L.old ? O.placeLabel(L) : (L.place.away ? L.place.prefName : L.place.prefName + L.place.muniName);
        K.end(cv, { L: L, name: L.name, from: from, to: to, summary: ['学び：' + eduLabel(), '仕事：' + (L.lastJob || '働きに出ることはなかった'), '家族：' + familyLabel()], note: '' });
        cv.setAttribute('aria-label', L.name + 'さんの最期のカード');
      }
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
    if (!L.alive) { showEnd(); return; }
    cur = M.step(L);
    autoResolve();
    render(cur);
    saveCurrent();
    if (cur.branch) showBranch(cur.branch);
    else schedule();
  }
  // 節目の問いかけは画面に出さずにそのまま進む（書き残す欄はなくした 2026-10-17）。
  // おまかせが入っているときは、ほかの分かれ道も重点に沿って選ぶ
  function autoResolve() {
    while (cur && cur.branch && (cur.branch.ask || auto)) {
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
    $('auto').textContent = auto ? 'おまかせ：入れている' : 'おまかせ：入れていない';
  }
  function schedule() {
    clearTimeout(timer);
    if (paused || sheetPaused || !L) return;
    timer = setTimeout(function () {
      if (!L.alive) showEnd();
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
  function render(r) {
    drawAvatar('avatar', r.year, r.age);
    renderNums(r);
    $('age').textContent = r.age;
    var era = r.eraLabel || eraOf(r.year);
    $('year-now').textContent = r.year + '年' + (era ? '（' + era + '）' : '');
    $('place').textContent = r.place;
    var me = mainEvent(r);
    $('now-ev').textContent = me ? me.t : 'この年は大きな出来事のない一年だった。';
    $('now-why').hidden = !(me && me.ev && me.ev.length);
    $('now-why').onclick = function () { if (me) openEvidence(me.t, me.ev, me.world ? null : r.year + ':' + me.i); };
    var rest = r.events.length + r.world.items.length - (me ? 1 : 0);
    $('now-more').hidden = rest <= 0;
    $('now-more').textContent = 'この年のほかの出来事（' + rest + '件）';
    $('now-more').onclick = function () { openYear(r, true); };
    var ch = bigChange(r);
    $('change').hidden = !ch;
    $('change').textContent = ch;
    $('change').onclick = openSt;
    renderMap($('map'), L.log.concat(L.log.indexOf(r) < 0 ? [r] : []), { live: true });
    var w = $('world');
    clear(w);
    r.world.items.forEach(function (it) {
      var li = el('li');
      var b = el('button', 'item world-item');
      b.type = 'button';
      b.appendChild(el('span', 'tag', it.type));
      b.appendChild(document.createTextNode(it.t));
      if (it.ev && it.ev.length) b.onclick = function () { openEvidence(it.t, it.ev); };
      else b.disabled = true;
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
      b.appendChild(el('span', 'tag', (L.marks && L.marks[key] ? '印・' : '') + e.cat));
      b.appendChild(document.createTextNode(evText(e)));
      b.onclick = function () { openEvidence(evText(e), e.ev, key); };
      li.appendChild(b);
      ev.appendChild(li);
    });
    $('branch').hidden = !r.branch;
    renderHotline($('hotline'), !!r.hotline);
    $('next').disabled = !!r.branch;
    $('card-birth-life').hidden = r.age !== 0;
    if (!$('details').hidden || detailsOpen()) renderTree(r.year);
    renderSt(r);
    renderFocus();
    stepComps(r.year);
    if (detailsOpen()) renderComps('comps', true);
  }

  function showBranch(br) {
    if (br.ask) { autoResolve(); render(cur); if (cur.branch) showBranch(cur.branch); else schedule(); return; }
    var box = $('branch');
    clear(box);
    box.appendChild(el('h2', null, '分かれ道：' + br.title));
    var answers = {};
    var done = el('button', 'btn-main', '決める');
    done.type = 'button';
    done.disabled = true;
    br.groups.forEach(function (g) {
      box.appendChild(el('p', 'q', g.q));
      var opts = el('div', 'opts');
      g.options.forEach(function (o) {
        var b = el('button', 'btn-sub', o.l);
        b.type = 'button';
        b.setAttribute('aria-pressed', 'false');
        b.onclick = function () {
          answers[g.id] = o.k;
          Array.prototype.forEach.call(opts.children, function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
          done.disabled = br.groups.some(function (gg) { return !answers[gg.id]; });
        };
        opts.appendChild(b);
      });
      box.appendChild(opts);
    });
    box.appendChild(el('p', 'note', '選んだ方向に進みやすくなりますが、結果は統計の割合で決まります'));
    var evb = el('button', 'ev-link', 'この分かれ道のもとになった統計');
    evb.type = 'button';
    evb.onclick = function () { openEvidence(br.title, br.ev); };
    box.appendChild(evb);
    done.onclick = function () {
      recordAnswer(answers);
      cur = M.resolve(L, answers);
      render(cur);
      if (cur.branch) showBranch(cur.branch);
      else schedule();
    };
    box.appendChild(done);
    box.hidden = false;
    clearTimeout(timer);
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

  function setPauseLabel() { $('pause').textContent = paused ? '再開' : '一時停止'; $('pause').setAttribute('aria-pressed', paused ? 'true' : 'false'); }

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
  function openEvidence(title, evs, key) {
    openSheet('もとになった統計', function (c) {
      c.appendChild(el('p', null, title));
      if (key && L) {
        var mb = el('button', 'btn-sub', L.marks[key] ? '印を外す' : '印を付ける');
        mb.type = 'button';
        mb.onclick = function () {
          if (L.marks[key]) delete L.marks[key]; else L.marks[key] = 1;
          if (G) { seg().marks = Object.keys(L.marks); if (G.done) saveLifeMarks(); else saveCurrent(); }
          mb.textContent = L.marks[key] ? '印を外す' : '印を付ける';
          if (cur && !$('screen-life').hidden) render(cur);
        };
        c.appendChild(mb);
      }
      if (!evs || !evs.length) { c.appendChild(el('p', 'note', 'この出来事に結びついた統計はありません')); return; }
      evs.forEach(function (e) {
        var d = el('div', 'evi');
        d.appendChild(el('p', 'src', e.name + (e.org ? '（' + e.org + '）' : '')));
        if (e.y) d.appendChild(el('p', 'note', e.y + '年の値' + (!e.noYearNote && cur && e.y !== cur.year ? '（' + cur.year + '年の値がないため、いちばん近い年を使用）' : '')));
        if (e.what) d.appendChild(el('p', 'what', e.what));
        if (e.val) d.appendChild(el('p', 'val', e.val));
        var marks = [];
        if (e.est) marks.push('推計');
        if (e.verified === false) marks.push('出典を確認中');
        if (marks.length) d.appendChild(el('p', 'marks', marks.join('・')));
        c.appendChild(d);
      });
    });
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
      var marked = [];
      recs.forEach(function (r) { r.events.forEach(function (e, i) { if (L.marks && L.marks[r.year + ':' + i]) marked.push({ r: r, e: e }); }); });
      if (marked.length) {
        var md = el('div', 'logyear marked');
        md.appendChild(el('p', 'ly', '印を付けた出来事'));
        marked.forEach(function (x) { md.appendChild(el('p', null, x.r.year + '年　' + x.r.age + '歳　' + evText(x.e))); });
        c.appendChild(md);
      }
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
    if (!C.wage) { $('earn-num').textContent = '賃金の統計を取り込むと表示されます'; $('earn-sub').textContent = ''; $('earn-ev').hidden = true; return; }
    $('earn-ev').hidden = false;
    renderEarnTop(g, '働いて賃金を得た年はなかった');
    var sub = [];
    if (g.years) sub.push('働いた年 ' + g.years + '年' + (g.nonregYears ? '（うち非正規 ' + g.nonregYears + '年）' : '') + '。その年の額面の合計と、2025年のお金の価値に直した額です');
    if (g.futureYears) sub.push('2026年以降の' + g.futureYears + '年分は、2025年の賃金の水準のままで数えています');
    sub.push('同じ町・同じ年に生まれた100人の真ん中の人は ' + yen(co.earnMedian));
    $('earn-sub').textContent = sub.join('。');
    var by = (C.wage.baseYears || []);
    $('earn-ev').onclick = function () {
      openEvidence('生涯に働いて得た賃金', [
        srcEv('wage', by[by.length - 1], '年齢・男女・学歴・正規か非正規か別の年収（きまって支給する現金給与額の12か月分と年間賞与。' + by[0] + '〜' + by[by.length - 1] + '年の平均）', '', { est: true }),
        srcEv('wage', 2024, '男女別の所定内給与額の動き（全国と都道府県、1975年から）。昔の年の賃金の水準に直すのに使用', ''),
        srcEv('cpi', 2025, '消費者物価指数で2025年のお金の価値に直した', '')
      ]);
    };
  }
  // 1975年より前の生まれの稼ぎ（推計）
  function renderEarnOld(co) {
    var g = L.earn;
    $('earn-ev').hidden = false;
    renderEarnTop(g, '働いて稼いだ年はなかった');
    var sub = [];
    if (g.years) sub.push('働いた年 ' + g.years + '年。どちらも推計です（1599年までは貫文、1870年までは両、1871年からは円で数え、今のお金の価値には1人あたりの国の豊かさの比で直しました）');
    sub.push('同じ所・同じ年に生まれた100人の真ん中の人は ' + yen(co.earnMedian));
    $('earn-sub').textContent = sub.join('。');
    $('earn-ev').onclick = function () {
      openEvidence('生涯に働いて得た稼ぎ（推計）', [
        { name: H.sources.maddison.name, org: H.sources.maddison.org, y: 2022, what: '1人あたりの国内総生産で、1975年の働く人の平均的な年収（2025年のお金の価値で約450万円）を昔の年に直した', val: '', est: true, noYearNote: true },
        srcEv('cpi', 2025, '消費者物価指数で2025年のお金の価値に直した', '', { prov: false })
      ]);
    };
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
    var u = w / 340; // 画面の1ピクセルに近い太さ
    var land = cssVar('--map-land') || '#e8e4dc', line = cssVar('--map-line') || '#b9b2a6', acc = cssVar('--accent') || '#0a58a8', text = cssVar('--text') || '#222', bg = cssVar('--bg') || '#fff';
    Object.keys(MAP.prefs).forEach(function (pc) { box.appendChild(svg('path', { d: MAP.prefs[pc], fill: land, stroke: line, 'stroke-width': (0.8 * u).toFixed(2), 'stroke-linejoin': 'round' })); });
    (MAP.insets || []).forEach(function (b) { box.appendChild(svg('rect', { x: b.x, y: b.y, width: b.w, height: b.h, fill: 'none', stroke: line, 'stroke-width': (0.8 * u).toFixed(2), 'stroke-dasharray': (3 * u).toFixed(1) })); });
    if (pts.length > 1) box.appendChild(svg('polyline', { points: pts.map(function (p) { return p.xy.join(','); }).join(' '), fill: 'none', stroke: acc, 'stroke-width': (2 * u).toFixed(2), 'stroke-linejoin': 'round', 'stroke-linecap': 'round', opacity: 0.8 }));
    var dead = opt.end || (L && !L.alive);
    pts.forEach(function (p, i) {
      var first = i === 0, lastP = i === pts.length - 1;
      var g = svg('g', { role: 'button', tabindex: '0', 'aria-label': p.from + (p.to > p.from ? '〜' + p.to : '') + '年　' + p.label });
      g.appendChild(svg('circle', { cx: p.xy[0], cy: p.xy[1], r: (11 * u).toFixed(2), fill: 'transparent' }));
      if (lastP && dead) {
        var d = 5 * u;
        g.appendChild(svg('path', { d: 'M' + (p.xy[0] - d) + ' ' + (p.xy[1] - d) + 'L' + (p.xy[0] + d) + ' ' + (p.xy[1] + d) + 'M' + (p.xy[0] + d) + ' ' + (p.xy[1] - d) + 'L' + (p.xy[0] - d) + ' ' + (p.xy[1] + d), stroke: text, 'stroke-width': (2.6 * u).toFixed(2), 'stroke-linecap': 'round' }));
      } else {
        g.appendChild(svg('circle', { cx: p.xy[0], cy: p.xy[1], r: ((first || lastP ? 5 : 3.5) * u).toFixed(2), fill: lastP && !dead ? acc : first ? bg : acc, stroke: first ? acc : bg, 'stroke-width': ((first ? 2.4 : 1.2) * u).toFixed(2) }));
      }
      g.onclick = function () { openSheet(p.from + (p.to > p.from ? '〜' + p.to : '') + '年', function (c) { c.appendChild(el('p', null, p.label)); c.appendChild(el('p', 'note', (first ? '生まれた場所。' : '') + (lastP && dead ? '亡くなった場所。' : '') + '地図の点は今の市区町村（分からないときは都道府県や旧国の中ほど）の位置です')); }); };
      box.appendChild(g);
    });
    var abroad = stops.filter(function (x) { return x.abroad; });
    var old = recs.length && recs[0].year < 1871;
    var note = (old ? '地名はその年の呼び方、境目の線は今の都道府県です。' : '') + (abroad.length ? '海外にいた年は地図に出していません。' : '') + '形は国土数値情報（国土交通省）を加工';
    var nn = box.parentNode.querySelector('.map-note');
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
          if (it.ev && it.ev.length) b.onclick = function () { openEvidence(it.t, it.ev); }; else b.disabled = true;
          c.appendChild(b);
        });
        c.appendChild(el('h3', null, '自分の出来事'));
      }
      if (!r.events.length) c.appendChild(el('p', null, 'この年の記録はありません'));
      r.events.forEach(function (e, i) {
        var b = el('button', 'item', evText(e));
        b.type = 'button';
        b.onclick = function () { openEvidence(evText(e), e.ev, r.year + ':' + i); };
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
  function renderCurve() {
    var box = $('curve');
    clear(box);
    var W = 340, Hh = 200, x0 = 34, y0 = 10, pw = W - x0 - 10, ph = Hh - y0 - 28, MAXA = 110;
    var l = 1, pts = [], v = Object.create(L);
    for (var a = 0; a <= MAXA; a++) {
      pts.push([x0 + pw * a / MAXA, y0 + ph * (1 - l)]);
      var q = a >= MAXA ? 1 : (L.old ? O.deathProb(v, L.sex, a, L.by + a) : E.deathProb(C, P, L.sex, a, L.by + a));
      l *= 1 - q;
    }
    var line = cssVar('--line'), text = cssVar('--text'), sub = cssVar('--sub'), acc = cssVar('--accent');
    var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + Hh, role: 'img', 'aria-label': L.by + '年生まれの' + (L.sex === 'm' ? '男' : '女') + 'の人が各年齢で生きている割合と、' + L.name + 'さんが亡くなった' + L.deathAge + '歳の位置' });
    [0, 0.5, 1].forEach(function (f) {
      var yy = y0 + ph * (1 - f);
      s.appendChild(svg('line', { x1: x0, y1: yy, x2: x0 + pw, y2: yy, stroke: line, 'stroke-width': 1 }));
      s.appendChild(svg('text', { x: x0 - 4, y: yy + 4, 'text-anchor': 'end', 'font-size': 10, fill: sub }, Math.round(f * 100) + '%'));
    });
    [0, 20, 40, 60, 80, 100].forEach(function (a) {
      var xx = x0 + pw * a / MAXA;
      s.appendChild(svg('text', { x: xx, y: y0 + ph + 14, 'text-anchor': 'middle', 'font-size': 10, fill: sub }, a + '歳'));
    });
    s.appendChild(svg('path', { d: 'M' + pts.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join('L'), fill: 'none', stroke: acc, 'stroke-width': 2 }));
    var dx = x0 + pw * Math.min(L.deathAge, MAXA) / MAXA;
    s.appendChild(svg('line', { x1: dx, y1: y0, x2: dx, y2: y0 + ph, stroke: text, 'stroke-width': 1 }));
    var lab = L.deathAge + '歳で亡くなった';
    s.appendChild(svg('text', { x: dx > W / 2 ? dx - 4 : dx + 4, y: y0 + 12, 'text-anchor': dx > W / 2 ? 'end' : 'start', 'font-size': 11, fill: text }, lab));
    box.appendChild(s);
    var sv = survival(L.deathAge), p1 = function (x) { return (x * 100 >= 1 ? Math.round(x * 100) : (x * 100).toFixed(1)) + '%'; };
    var who = '同じ' + L.by + '年に生まれた' + (L.sex === 'm' ? '男' : '女') + (L.deathAge < 15 ? 'の子' : 'の人') + 'のうち、';
    $('curve-note').textContent = (L.deathAge === 0 ? who + '1歳の誕生日を迎えられなかった子はおよそ' + p1(1 - survival(1)) : who + L.deathAge + '歳まで生きた人はおよそ' + p1(sv)) + '。生命表から計算しました' + (L.by < 1975 ? '（1975年より前の生まれは、平均寿命と乳児死亡率から作った推計の生命表です）' : '');
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
    $('lg-avg').hidden = !hasCmp; $('curve-cmp-note').hidden = !hasCmp;
    $('curve-legend').hidden = d.pts.length < 2;
  }
  var curveRT = null;
  window.addEventListener('resize', function () { clearTimeout(curveRT); curveRT = setTimeout(function () { if (!$('screen-end').hidden) renderLifeCurve(); }, 150); });
  function showEnd(again) {
    clearTimeout(timer);
    if (!L) return;
    show('end');
    drawAvatar('avatar-end', L.deathYear, L.deathAge);
    $('end-title').textContent = L.name + 'さんの一生　' + L.by + '年〜' + L.deathYear + '年（' + L.deathAge + '歳）';
    $('end-sub').textContent = L.old ? O.endText(L) : L.home.prefName + L.home.muniName + 'で生まれ、' + (L.place.away ? L.place.prefName : L.place.prefName + L.place.muniName) + 'で亡くなった。';
    renderHotline($('hotline-end'), L.cause === 'sui');
    renderLifeMap();
    renderCurve();
    stepComps(9999);
    renderComps('comps-end', false);
    $('comps-end').parentNode.hidden = !comps.length;
    renderMap($('map-end'), L.log, { end: true });

    renderHouse();
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
    all.forEach(function (h) { hl.appendChild(el('li', null, lifeLine(h))); });
    var cands = (L.old ? O : E).heirCandidates(L);
    $('kyodai-block').hidden = !cands.length;
    cands.forEach(function (c) {
      var b = el('button', 'btn-sub kyodai-btn', c.later ? c.role + '（' + c.later + '年後に生まれる）として生きる' : c.role + ' ' + c.name + '（' + c.age + '歳）として生きる');
      b.type = 'button';
      b.onclick = function () { liveAsSibling(c); };
      cl.appendChild(b);
    });
  }
  function liveAsSibling(c) {
    if (!G || !L) return;
    G.house = G.house || { chain: [] };
    houseLives.push(lifeSummary(L, houseLives.length, firstLife));
    G.house.chain.push({ memberId: c.id, answers: [], marks: [], focus: [] });
    G.done = false;
    inheritFrom(L, c.id).then(function () {
      cur = null;
      paused = false; setPauseLabel();
      show('life');
      saveCurrent();
      nextYear();
    });
  }

  /* ---------- 操作 ---------- */
  function bind() {
    $('pause').onclick = function () { paused = !paused; setPauseLabel(); if (paused) clearTimeout(timer); else if (cur && !cur.branch) schedule(); };
    $('speed').onclick = function () { speedIdx = (speedIdx + 1) % SPEEDS.length; $('speed').textContent = '速さ ' + SPEEDS[speedIdx] + '倍'; if (cur && !cur.branch) schedule(); };
    // 次の分かれ道まで：分かれ道・節目の問いかけ・最期のどれかまで、年を続けて進める（1年ずつ画面に出してから次へ）
    $('skip').onclick = function () {
      if (!L || (cur && cur.branch)) return;
      clearTimeout(timer);
      var guard = 0;
      (function go() {
        if (!L || !L.alive) { if (L) showEnd(); return; }
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
    $('auto').onclick = function () {
      auto = !auto;
      if (G) { G.auto = auto; if (!G.done) saveCurrent(); }
      renderFocus();
      // 分かれ道で止まっているときに入れたら、そのまま選んで進む
      if (auto && cur && cur.branch && L && L.alive) {
        closeSheet();
        autoResolve(); render(cur); saveCurrent();
        if (cur.branch) showBranch(cur.branch); else { $('branch').hidden = true; schedule(); }
      }
    };
    $('num-income-box').onclick = openMoney;
    $('num-sav-box').onclick = openMoney;
    $('end-log').onclick = openLog;
    $('sheet-close').onclick = closeSheet;
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('sheet').hidden) closeSheet(); });
    $('card-birth-life').onclick = function () { openCard('birth'); };
    $('card-birth').onclick = function () { openCard('birth'); };
    $('card-end').onclick = function () { openCard('end'); };
    $('reborn').onclick = function () { clearTimeout(timer); closeSheetQuiet(); L = null; cur = null; houseLives = []; born(); };
    $('resume').onclick = resume;
    $('clear-all').onclick = function () {
      if (!window.confirm('これまでの人生と途中の記録をすべて消します。よろしいですか？')) return;
      try { localStorage.removeItem('ichioku-lives'); localStorage.removeItem('ichioku-current'); } catch (e) { /* 保存できない環境 */ }
      initPast();
    };
    $('again').onclick = function () { L = null; cur = null; show('top'); initPast(); };
  }
  function initPast() {
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
  getJSON('data/common.json').then(function (c) { C = c; getMap(); initTop(); }).catch(function () {
    $('born').textContent = 'データを取り出せませんでした';
  });
})();
