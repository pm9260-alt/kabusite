/* 1000分の1 トップの部品（1年を1マスにした千年の盤・生まれる時代の割合・生まれた人と亡くなった人の数）
   外部へは何も送らない。生まれる年の範囲は data/common.json の meta.birthRange に合わせて描き直す。 */
(function () {
  'use strict';

  // 2025年の人口動態統計（月報年計・概数、厚生労働省 2026年6月3日公表）
  var BIRTHS = 671236, DEATHS = 1589489, YEAR_SEC = 365 * 24 * 60 * 60;

  // 日本の人口。1000年はこのサイトの旧国別の推計の合計、1150〜1872年は鬼頭宏の推計、1920〜2000年は国勢調査
  var POP = [
    [1000, 6644700], [1150, 6836900], [1600, 12273000], [1650, 17497900], [1700, 28287200],
    [1721, 31278500], [1750, 31010800], [1786, 30103800], [1804, 30746400], [1846, 32297200],
    [1872, 34806000], [1920, 55963053], [1930, 64450005], [1940, 73114308], [1950, 84114574],
    [1960, 94301623], [1970, 104665171], [1980, 117060396], [1990, 123611167], [2000, 126925843]
  ];

  // 時代（どの年も同じ確率なので、長く続いた時代ほど生まれやすい）
  var ERAS = [
    ['平安', 1000, 1184], ['鎌倉', 1185, 1332], ['南北朝・室町', 1333, 1466], ['戦国', 1467, 1572],
    ['安土桃山', 1573, 1602], ['江戸', 1603, 1867], ['明治', 1868, 1911], ['大正', 1912, 1925],
    ['昭和', 1926, 1988], ['平成', 1989, 2000]
  ];
  var R0 = 1000, R1 = 2000; // 生まれる年の範囲（common.json を読んだら置き換える）
  var COLS = 50;            // 1行50年

  var reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* 古いブラウザ */ }

  function $(id) { return document.getElementById(id); }
  function man(n) { // 人数を「1億2693万人」「664万人」の形にする
    var m = Math.round(n / 10000), oku = Math.floor(m / 10000), rest = m % 10000;
    return (oku ? oku + '億' : '') + (rest ? rest + '万' : '') + '人';
  }
  function popAt(y) {
    for (var i = 1; i < POP.length; i++) {
      if (y <= POP[i][0]) {
        var a = POP[i - 1], b = POP[i];
        return a[1] + (b[1] - a[1]) * (y - a[0]) / (b[0] - a[0]);
      }
    }
    return POP[POP.length - 1][1];
  }
  function eraIndex(y) {
    for (var i = 0; i < ERAS.length; i++) if (y >= ERAS[i][1] && y <= ERAS[i][2]) return i;
    return ERAS.length - 1;
  }
  function span() { return R1 - R0 + 1; }
  function eraYears(e) { return Math.max(0, Math.min(e[2], R1) - Math.max(e[1], R0) + 1); }

  /* ---------- 生まれた人と亡くなった人の数（ページを開いてから） ---------- */
  function counters() {
    var bN = $('cnt-birth'), dN = $('cnt-death'), bF = $('cnt-birth-fill'), dF = $('cnt-death-fill');
    if (!bN || !dN) return;
    var t0 = Date.now(), rb = BIRTHS / YEAR_SEC, rd = DEATHS / YEAR_SEC;
    function tick() {
      var s = (Date.now() - t0) / 1000, b = s * rb, d = s * rd;
      var bi = String(Math.floor(b)), di = String(Math.floor(d));
      if (bN.textContent !== bi) bN.textContent = bi;
      if (dN.textContent !== di) dN.textContent = di;
      if (bF) bF.style.width = ((b % 1) * 100).toFixed(1) + '%';
      if (dF) dF.style.width = ((d % 1) * 100).toFixed(1) + '%';
    }
    tick();
    setInterval(tick, reduce ? 1000 : 200);
  }

  /* ---------- 範囲の文言 ---------- */
  function rangeText() {
    ['r0', 'r0b'].forEach(function (id) { if ($(id)) $(id).textContent = R0; });
    ['r1', 'r1b'].forEach(function (id) { if ($(id)) $(id).textContent = R1; });
    if ($('rn')) $('rn').textContent = span().toLocaleString('ja-JP');
  }

  /* ---------- 生まれる時代の割合 ---------- */
  function eraList() {
    var ul = $('era-share');
    if (!ul) return;
    while (ul.firstChild) ul.removeChild(ul.firstChild);
    var max = 0;
    ERAS.forEach(function (e) { max = Math.max(max, eraYears(e)); });
    ERAS.forEach(function (e, i) {
      var n = eraYears(e);
      if (!n) return;
      var a = Math.max(e[1], R0), b = Math.min(e[2], R1);
      var li = document.createElement('li');
      li.setAttribute('data-era', i);
      var head = document.createElement('span'); head.className = 'es-head';
      var name = document.createElement('span'); name.className = 'es-name'; name.textContent = e[0];
      var yrs = document.createElement('span'); yrs.className = 'es-years'; yrs.textContent = a + '〜' + b + '年';
      head.appendChild(name); head.appendChild(yrs);
      var bar = document.createElement('span'); bar.className = 'es-bar';
      var fill = document.createElement('span'); fill.className = 'es-fill e' + i;
      fill.style.width = (n / max * 100).toFixed(1) + '%';
      bar.appendChild(fill);
      var pct = document.createElement('span'); pct.className = 'es-pct'; pct.textContent = (n / span() * 100).toFixed(1) + '%';
      li.appendChild(head); li.appendChild(bar); li.appendChild(pct);
      li.setAttribute('aria-label', e[0] + '（' + a + '〜' + b + '年）に生まれる確率 ' + pct.textContent);
      ul.appendChild(li);
    });
  }

  /* ---------- 千年の盤（1年＝1マス、横50年で折り返す）。この端末で生まれた年のマスを時代の色で埋める ---------- */
  function bornYears() {
    var o = {};
    try { (JSON.parse(localStorage.getItem('ichioku-born-years') || '[]') || []).forEach(function (y) { o[y] = 1; }); } catch (e) { /* 保存できない環境 */ }
    return o;
  }
  var NS = 'http://www.w3.org/2000/svg', cells = [], picked = null, played = false, hopTimer = null;
  function svgEl(tag, attrs, text) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }
  function caption(y, lead) {
    var c = $('board-cap');
    if (!c) return;
    var e = ERAS[eraIndex(y)];
    var how = y < 1920 ? '推計' : '国勢調査';
    while (c.firstChild) c.removeChild(c.firstChild);
    [[(lead || '') + y + '年', 'bc-y'], [e[0], 'bc-e'], ['人口 約' + man(popAt(y)) + '（' + how + '）', 'bc-p']].forEach(function (p) {
      var sp = document.createElement('span'); sp.className = p[1]; sp.textContent = p[0]; c.appendChild(sp);
    });
  }
  function mark(y) {
    if (picked != null && cells[picked - R0]) cells[picked - R0].classList.remove('on');
    picked = y;
    if (cells[y - R0]) cells[y - R0].classList.add('on');
  }
  function board() {
    var box = $('board');
    if (!box) return;
    var W = Math.max(260, Math.round(box.clientWidth || 320));
    var LAB = 40, gap = W < 420 ? 1 : 1.5, TOP = 6;
    var cw = (W - LAB - gap * (COLS - 1)) / COLS;
    var every = cw < 9 ? 200 : 100; // 年の文字が重ならない間隔
    var rows = Math.ceil(span() / COLS), H = Math.ceil(TOP + rows * (cw + gap) + 8);
    var svg = svgEl('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, role: 'img',
      'aria-label': R0 + '年から' + R1 + '年までの' + span() + '年を、1年1マスで並べた盤。この端末で生まれた年のマスが、時代ごとの色で埋まります' });
    cells = [];
    var got = bornYears(), nGot = 0;
    for (var y = R0; y <= R1; y++) {
      var k = y - R0, r = Math.floor(k / COLS), c = k % COLS, ei = eraIndex(y);
      var rect = svgEl('rect', { x: (LAB + c * (cw + gap)).toFixed(2), y: (TOP + r * (cw + gap)).toFixed(2), width: cw.toFixed(2), height: cw.toFixed(2),
        'class': 'bd-cell e' + ei + (got[y] ? ' got' : ''), 'data-y': y });
      if (got[y]) nGot++;
      if (!played && !reduce) rect.style.animationDelay = (r * 45) + 'ms';
      svg.appendChild(rect);
      cells.push(rect);
      if (c === 0 && (y % every === 0 || y === R0)) {
        svg.appendChild(svgEl('text', { x: 0, y: (TOP + r * (cw + gap) + cw / 2 + 4).toFixed(2), 'class': 'bd-label' }, y + '年'));
      }
    }
    if (!played && !reduce) svg.classList.add('bd-enter');
    var bf = $('board-fill');
    if (bf) bf.textContent = nGot ? 'この端末で生まれた年 ' + nGot.toLocaleString('ja-JP') + '／' + span().toLocaleString('ja-JP') + 'マス' : 'まだこの端末で生まれた年はありません';
    while (box.firstChild) box.removeChild(box.firstChild);
    box.appendChild(svg);
    if (picked != null) mark(picked);

    // 押した（触れた）マスの年を出す
    function at(ev) {
      var t = ev.target;
      if (t && t.getAttribute && t.getAttribute('data-y')) {
        if (hopTimer) { clearTimeout(hopTimer); hopTimer = null; }
        var yy = +t.getAttribute('data-y');
        mark(yy); caption(yy);
      }
    }
    svg.addEventListener('pointerover', at);
    svg.addEventListener('pointerdown', at);
  }

  // ページを開いたときに一度だけ、紅いマスが盤の上を跳ねて1つの年に止まる（「たとえば」の例）
  function hop() {
    var start = Date.now(), dur = 1700;
    function next() {
      var t = (Date.now() - start) / dur;
      var y = R0 + Math.floor(Math.random() * span());
      mark(y);
      if (t >= 1) { caption(y, 'たとえば　'); hopTimer = null; return; }
      caption(y, 'たとえば　');
      hopTimer = setTimeout(next, 40 + 260 * t * t);
    }
    hopTimer = setTimeout(next, 1100);
  }

  function drawAll() { rangeText(); eraList(); board(); }

  counters();
  drawAll();
  if (reduce) { var y0 = R0 + Math.floor(Math.random() * span()); mark(y0); caption(y0, 'たとえば　'); }
  else hop();
  played = true;

  // 生まれる年の範囲を common.json に合わせる（違っていたら描き直す）
  try {
    fetch('data/common.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (c) {
      var br = c && c.meta && c.meta.birthRange;
      if (br && (br[0] !== R0 || br[1] !== R1)) {
        R0 = br[0]; R1 = br[1];
        if (picked != null && (picked < R0 || picked > R1)) picked = null;
        drawAll();
        if (picked == null) { var y1 = R0 + Math.floor(Math.random() * span()); mark(y1); caption(y1, 'たとえば　'); }
      }
    }).catch(function () { /* 読めないときは初めの範囲のまま */ });
  } catch (e) { /* fetch のない環境 */ }

  window.IchiokuTop = { refresh: function () { board(); } };
  var rt = null, lastW = $('board') ? $('board').clientWidth : 0;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      var w = $('board') ? $('board').clientWidth : 0;
      if (w && Math.abs(w - lastW) > 4) { lastW = w; board(); }
    }, 150);
  });
})();
