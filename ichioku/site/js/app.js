/* 1億分の1 画面の動き */
(function () {
  'use strict';
  var E = window.Ichioku, O = window.IchiokuOld, M = E;
  var H = null; // 1975年より前の生まれのための束（data/history.json。必要になったときに取り出す）
  var BASE_MS = 7000;          // 1年あたりの表示時間（1倍のとき）。約80年で約10分
  var SPEEDS = [1, 2, 4, 8, 16];
  var C = null, prefCache = {}, P = null, L = null, cur = null;
  var timer = null, paused = false, speedIdx = 0, sheetPaused = false;

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
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
  var G = null; // { v, seed, year, answers: [], marks: [], shown: 表示している年 }
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
      return L;
    });
  }
  // 記録した答えをたどって、shown の年まで進める。答えが尽きたところの分かれ道はそのまま返す
  function replayTo(g, untilYear) {
    var i = 0, r = null;
    while (L.alive) {
      r = M.step(L);
      while (r && r.branch && i < g.answers.length) r = M.resolve(L, g.answers[i++]);
      if (r && r.branch) break;
      if (untilYear != null && r && r.year >= untilYear) break;
      if (untilYear == null && !L.alive) break;
    }
    return r;
  }
  function saveCurrent() { if (G && L && L.alive) { G.shown = cur ? cur.year : L.by; store('ichioku-current', G); } }
  // 生まれる年は1800〜2000年のどの年も同じ確率（作る人の判断）
  function born() {
    var seed = randomSeed();
    $('born').disabled = true;
    G = { v: 1, seed: seed, year: yearOfSeed(seed), answers: [], marks: [] };
    makeLife(seed).then(function () {
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
    G = g; G.marks = G.marks || [];
    makeLife(g.seed).then(function () {
      (G.marks || []).forEach(function (k) { L.marks[k] = 1; });
      cur = replayTo(G, G.shown);
      paused = true; setPauseLabel();
      show('life');
      render(cur);
      if (cur.branch) showBranch(cur.branch);
    });
  }
  // これまでの人生をもう一度見る（最期の画面を開き直す）
  function reopen(rec) {
    G = { v: 1, seed: rec.seed, year: rec.year, answers: rec.answers || [], marks: rec.marks || [], done: true, farewell: rec.farewell || '' };
    makeLife(rec.seed).then(function () {
      (G.marks || []).forEach(function (k) { L.marks[k] = 1; });
      var g2 = { answers: G.answers }, i = 0, r;
      while (L.alive) { r = M.step(L); while (r && r.branch) r = M.resolve(L, i < g2.answers.length ? g2.answers[i++] : null); }
      cur = r;
      showEnd(true);
    });
  }
  function recordAnswer(a) { if (G && !G.done) { G.answers.push(a); saveCurrent(); } }

  /* ---------- いつも更新される数字 ---------- */
  // 千円単位の額を、その年のお金の単位で書く（1871年より前は両。1両＝1円として数える）
  function money(k, cur) {
    var v = k * 1000;
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
  function renderNums(r) {
    var inc = r.income;
    if (inc && inc.nominal > 0) {
      $('num-income').textContent = money(inc.nominal, inc.cur);
      $('num-income-n').textContent = inc.cur === '両' ? 'その年のお金（両）・推計' : inc.future ? '2025年の水準のまま' : 'その年のお金' + (inc.est ? '・推計' : '');
    } else { $('num-income').textContent = '収入なし'; $('num-income-n').textContent = r.age < 15 ? '子ども' : '働いていない年'; }
    $('num-earn').textContent = L.earn && L.earn.real > 0 ? money(L.earn.real) : '0円';
    var sv = survival(r.age);
    $('num-alive').textContent = (sv * 100 >= 10 ? Math.round(sv * 100) : (sv * 100).toFixed(1)) + '%';
    $('num-alive-n').textContent = '生命表から（' + (L.sex === 'm' ? '男' : '女') + '）';
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
    for (var i = 0; i < lives.length; i++) if (lives[i] && lives[i].seed === (L && L.seed)) { fn(lives[i]); break; }
    store('ichioku-lives', lives);
  }
  function saveLifeMarks() { updateLife(function (x) { x.marks = Object.keys(L.marks || {}); }); }

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
    var M2 = { '寺子屋': '寺子屋で字を習った', '藩校': '藩校で学んだ', '村学校': '村学校で学んだ', '小学校': '小学校を出た', '中学': '中学校を出た', '高等小学校': '高等小学校を出た', '旧制中学': '旧制中学を出た', '高等女学校': '高等女学校を出た', '旧制の上の学校': '旧制の上の学校を出た', '高校': '高校を出た', '短大': '短大を出た', '短大・専門': '短大・専門学校を出た', '大学': '大学を出た' };
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
        var notes = (L.notes || []).filter(function (n) { return n.text; });
        var from = L.old ? L.home.label : L.home.prefName + L.home.muniName;
        var to = L.old ? O.placeLabel(L) : (L.place.away ? L.place.prefName : L.place.prefName + L.place.muniName);
        K.end(cv, { L: L, name: L.name, from: from, to: to, summary: ['学び：' + eduLabel(), '仕事：' + (L.lastJob || '働きに出ることはなかった'), '家族：' + familyLabel()], note: notes.length ? notes[notes.length - 1].text : '' });
        cv.setAttribute('aria-label', L.name + 'さんの最期のカード');
      }
      c.appendChild(cv);
      var b = el('button', 'btn-main', navigator.share ? '共有する' : '画像を保存する');
      b.type = 'button';
      b.onclick = function () { K.share(cv, 'ichioku-' + kind + '-' + L.by + '.png', '1億分の1'); };
      c.appendChild(b);
    });
  }

  /* ---------- 人生の画面 ---------- */
  function nextYear() {
    clearTimeout(timer);
    if (!L) return;
    if (!L.alive) { showEnd(); return; }
    cur = M.step(L);
    render(cur);
    saveCurrent();
    if (cur.branch) showBranch(cur.branch);
    else schedule();
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
  function render(r) {
    drawAvatar('avatar', r.year, r.age);
    renderNums(r);
    $('age').textContent = r.age;
    var era = r.eraLabel || eraOf(r.year);
    $('year-now').textContent = r.year + '年' + (era ? '（' + era + '）' : '');
    $('place').textContent = r.place;
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
      b.appendChild(document.createTextNode(e.t));
      b.onclick = function () { openEvidence(e.t, e.ev, key); };
      li.appendChild(b);
      ev.appendChild(li);
    });
    $('branch').hidden = !r.branch;
    renderHotline($('hotline'), !!r.hotline);
    $('next').disabled = !!r.branch;
    $('card-birth-life').hidden = r.age !== 0;
    renderTree(r.year);
  }

  // 節目の問いかけ：一行だけ書き残せる。答えは人生の進み方に関わらない
  function showAsk(br) {
    var box = $('branch');
    clear(box);
    box.appendChild(el('h2', null, br.title));
    box.appendChild(el('p', 'q', br.q));
    var inp = document.createElement('input');
    inp.type = 'text'; inp.maxLength = 40; inp.id = 'ask-input'; inp.className = 'ask-input';
    inp.setAttribute('aria-label', '一行で書く（40字まで）');
    inp.placeholder = '一行で（40字まで）';
    box.appendChild(inp);
    var row = el('div', 'opts');
    var skip = el('button', 'btn-sub', '書かずに進む'); skip.type = 'button';
    var go = el('button', 'btn-main', '書いて進む'); go.type = 'button'; go.id = 'ask-go';
    function done(text) {
      recordAnswer({ text: text });
      cur = M.resolve(L, { text: text });
      render(cur);
      if (cur.branch) showBranch(cur.branch); else schedule();
    }
    skip.onclick = function () { done(''); };
    go.onclick = function () { done(inp.value); };
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') done(inp.value); });
    row.appendChild(skip);
    box.appendChild(row);
    box.appendChild(go);
    box.appendChild(el('p', 'note', '書いた一行は、最期の画面と「一生をふり返る」に残ります（この端末の中だけ）'));
    box.hidden = false;
    clearTimeout(timer);
  }
  function showBranch(br) {
    if (br.ask) { showAsk(br); return; }
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
  function openSheet(title, build) {
    $('sheet-title').textContent = title;
    var c = $('sheet-content');
    clear(c);
    build(c);
    $('sheet').hidden = false;
    sheetPaused = true;
    clearTimeout(timer);
    $('sheet-close').focus();
  }
  function closeSheetQuiet() { $('sheet').hidden = true; sheetPaused = false; }
  function closeSheet() {
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
          if (G) { G.marks = Object.keys(L.marks); if (G.done) saveLifeMarks(); else saveCurrent(); }
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
        marked.forEach(function (x) { md.appendChild(el('p', null, x.r.year + '年　' + x.r.age + '歳　' + x.e.t)); });
        c.appendChild(md);
      }
      L.log.concat(cur && L.log.indexOf(cur) < 0 ? [cur] : []).forEach(function (r) {
        var d = el('div', 'logyear');
        d.appendChild(el('p', 'ly', r.year + '年　' + r.age + '歳　' + r.place));
        r.events.forEach(function (e) { d.appendChild(el('p', null, e.t)); });
        (L.notes || []).filter(function (n) { return n.year === r.year && n.text; }).forEach(function (n) { d.appendChild(el('p', 'note-line', r.age + '歳の問い「' + n.q + '」　' + n.text)); });
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
  function renderEarn(co) {
    var g = L.earn || { real: 0, years: 0 };
    if (!C.wage) { $('earn-num').textContent = '賃金の統計を取り込むと表示されます'; $('earn-sub').textContent = ''; $('earn-ev').hidden = true; return; }
    $('earn-ev').hidden = false;
    $('earn-num').textContent = g.years ? yen(g.real) : '働いて賃金を得た年はなかった';
    var sub = [];
    if (g.years) sub.push('働いた年 ' + g.years + '年' + (g.nonregYears ? '（うち非正規 ' + g.nonregYears + '年）' : '') + '。2025年のお金の価値に直した額です');
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
    $('earn-num').textContent = g.years ? yen(g.real) : '働いて稼いだ年はなかった';
    var sub = [];
    if (g.years) sub.push('働いた年 ' + g.years + '年。2025年のお金の価値に直した推計です（昔の年は1人あたりの国の豊かさの比で直しました）');
    sub.push('同じ所・同じ年に生まれた100人の真ん中の人は ' + yen(co.earnMedian));
    $('earn-sub').textContent = sub.join('。');
    $('earn-ev').onclick = function () {
      openEvidence('生涯に働いて得た稼ぎ（推計）', [
        { name: H.sources.maddison.name, org: H.sources.maddison.org, y: 2022, what: '1人あたりの国内総生産で、1975年の働く人の平均的な年収（2025年のお金の価値で約450万円）を昔の年に直した', val: '', est: true, noYearNote: true },
        srcEv('cpi', 2025, '消費者物価指数で2025年のお金の価値に直した', '', { prov: false })
      ]);
    };
  }
  function showEnd(again) {
    clearTimeout(timer);
    if (!L) return;
    show('end');
    drawAvatar('avatar-end', L.deathYear, L.deathAge);
    $('end-title').textContent = L.name + 'さんの一生　' + L.by + '年〜' + L.deathYear + '年（' + L.deathAge + '歳）';
    $('end-sub').textContent = L.old ? O.endText(L) : L.home.prefName + L.home.muniName + 'で生まれ、' + (L.place.away ? L.place.prefName : L.place.prefName + L.place.muniName) + 'で亡くなった。';
    renderHotline($('hotline-end'), L.cause === 'sui');
    var notes = (L.notes || []).filter(function (n) { return n.text; });
    $('notes-block').hidden = !notes.length;
    clear($('notes'));
    notes.forEach(function (n) { var li = el('li', 'note-item'); li.appendChild(el('span', 'tag', n.age + '歳')); li.appendChild(document.createTextNode(n.q + '　' + n.text)); $('notes').appendChild(li); });

    var co = L.old ? O.cohort(C, H, P, L, 100) : E.cohort(C, P, L.by, L.home.muni, L.seed, 100);
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
      var lives = (store('ichioku-lives') || []).filter(function (x) { return x && x.seed; });
      lives.unshift({ v: 1, seed: L.seed, year: L.by, answers: G ? G.answers : [], marks: L.marks ? Object.keys(L.marks) : [], name: L.name, place: L.old ? L.home.label : L.home.prefName + L.home.muniName, age: L.deathAge, dy: L.deathYear, farewell: '' });
      store('ichioku-lives', lives.slice(0, 10));
      if (G) G.done = true;
    }
    $('farewell').value = (G && G.farewell) || '';
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
        render(cur);
        saveCurrent();
        if (cur.branch) { showBranch(cur.branch); return; }
        if (!L.alive) { setTimeout(showEnd, 400); return; }
        if (guard++ > 130) return;
        timer = setTimeout(go, 60);
      })();
    };
    $('next').onclick = function () { if (cur && cur.branch) return; if (!L.alive) showEnd(); else nextYear(); };
    $('family').onclick = openFamily;
    $('log').onclick = openLog;
    $('end-log').onclick = openLog;
    $('sheet-close').onclick = closeSheet;
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('sheet').hidden) closeSheet(); });
    $('card-birth-life').onclick = function () { openCard('birth'); };
    $('card-birth').onclick = function () { openCard('birth'); };
    $('card-end').onclick = function () { openCard('end'); };
    $('reborn').onclick = function () { clearTimeout(timer); closeSheetQuiet(); L = null; cur = null; born(); };
    $('resume').onclick = resume;
    $('clear-all').onclick = function () {
      if (!window.confirm('これまでの人生と途中の記録をすべて消します。よろしいですか？')) return;
      try { localStorage.removeItem('ichioku-lives'); localStorage.removeItem('ichioku-current'); } catch (e) { /* 保存できない環境 */ }
      initPast();
    };
    $('farewell').addEventListener('change', function () { var v = $('farewell').value.slice(0, 40); if (G) G.farewell = v; updateLife(function (x) { x.farewell = v; }); });
    $('again').onclick = function () { L = null; cur = null; show('top'); initPast(); };
  }
  function initPast() {
    var past = (store('ichioku-lives') || []).filter(function (x) { return x && x.seed; });
    $('past').textContent = past.length ? 'これまでの人生（最大10件。記録はこの端末のブラウザにだけ残ります）' : '';
    var list = $('past-list');
    clear(list);
    past.forEach(function (x) {
      var li = el('li');
      var b = el('button', 'item', x.year + '年〜' + x.dy + '年　' + x.age + '歳　' + x.name + '（' + x.place + '）');
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
  getJSON('data/common.json').then(function (c) { C = c; initTop(); }).catch(function () {
    $('born').textContent = 'データを取り出せませんでした';
  });
})();
