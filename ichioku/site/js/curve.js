/* 1000分の1 一生の浮き沈みの曲線（最期の画面）
   横は年齢、縦は毎年の「暮らしの満足」（rec.st.sat、0〜100）。いちばん良かった年・つらかった年・大きく下がった年・結婚・最初の子に印と短い説明を付ける。
   配置の計算（layout）と描画（render）を分け、検査（tools/check.mjs）でも同じ配置の計算で文字の重なりとはみ出しを確かめる。 */
(function (root) {
  'use strict';
  var FONT = 11;            // 説明と目盛りの文字の大きさ（画面幅で変えない）
  var ERAS = [['平安', 1000], ['鎌倉', 1185], ['南北朝・室町', 1333], ['戦国', 1467], ['安土桃山', 1573], ['江戸', 1603], ['明治', 1868], ['大正', 1912], ['昭和', 1926], ['平成', 1989], ['令和', 2019]];
  function eraOf(y) { var e = ERAS[0][0]; for (var i = 0; i < ERAS.length; i++) if (ERAS[i][1] <= y) e = ERAS[i][0]; return e; }
  // 文字の幅の目安（全角は1字、半角は0.6字）
  function textW(t, size) { var w = 0; for (var i = 0; i < t.length; i++) w += t.charCodeAt(i) < 0x2000 ? 0.6 : 1; return w * (size || FONT); }
  function clip(t, n) { var w = 0, out = ''; for (var i = 0; i < t.length; i++) { w += t.charCodeAt(i) < 0x2000 ? 0.5 : 1; if (w > n) return out + '…'; out += t[i]; } return out; }
  function hit(a, b) { return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h; }

  // pts：[{ age, year, sat, label }]（label はその年のいちばん大きな出来事の文）。compare：年齢ごとの100人の平均（null は描かない）
  // marks：[{ age, kind }]（kind：high・low・drop・marry・child）
  function layout(o) {
    var W = Math.max(240, Math.round(o.width)), Hh = o.height || (W >= 768 ? 240 : 200);
    var L0 = 30, R0 = 12, T0 = 22, B0 = 22;
    var pw = W - L0 - R0, ph = Hh - T0 - B0, pts = o.pts, n = pts.length, dA = Math.max(1, pts[n - 1].age);
    var X = function (a) { return L0 + pw * a / dA; }, Y = function (v) { return T0 + ph * (1 - v / 100); };
    var m = { W: W, H: Hh, plot: { x: L0, y: T0, w: pw, h: ph }, curve: [], compare: [], ticks: [], eras: [], marks: [], labels: [], single: false, note: '' };
    if (n === 1) {
      m.single = true; m.note = '1年に満たない一生でした';
      m.dot = { x: X(0), y: Y(pts[0].sat) };
      m.ticks.push({ x: X(0), t: '0歳', anchor: 'start' });
      return m;
    }
    var smooth = n >= 5;
    var vs = pts.map(function (p, i) {
      if (!smooth) return p.sat;
      var s = 0, c = 0;
      for (var k = Math.max(0, i - 1); k <= Math.min(n - 1, i + 1); k++) { s += pts[k].sat; c++; }
      return s / c;
    });
    m.curve = pts.map(function (p, i) { return { x: X(p.age), y: Y(vs[i]), age: p.age, year: p.year, sat: p.sat }; });
    m.mid = Y(50);
    // 比べる線（生きている人が10人を下回った年齢から先は描かない）
    var cmp = [];
    for (var a = 0; a <= dA && o.compare; a++) { var v = o.compare[a]; if (v == null) break; cmp.push({ x: X(a), y: Y(v) }); }
    m.compare = cmp;
    // 横の目盛り：0歳・亡くなった年齢と、その間の10歳ごと（狭いときは20歳ごと）
    // 目盛りの文字が重ならない間隔（10歳ごと、狭いときは20歳ごと、さらに狭ければ間を出さない）
    var step = pw < 300 ? 20 : 10;
    if (pw * step / dA < textW('100歳') + 6) step = 20;
    if (pw * step / dA < textW('100歳') + 6) step = 1e9;
    var wEnd = textW(dA + '歳'), w0 = textW('0歳');
    m.ticks.push({ x: X(0), t: '0歳', anchor: 'start' });
    for (var t = step; t < dA; t += step) { var wt = textW(t + '歳'); if (X(dA) - X(t) > wEnd + wt / 2 + 6 && X(t) - X(0) > w0 + wt / 2 + 6) m.ticks.push({ x: X(t), t: t + '歳', anchor: 'middle' }); }
    if (X(dA) - X(0) > w0 + wEnd + 6) m.ticks.push({ x: X(dA), t: dA + '歳', anchor: 'end' });
    var boxes = m.ticks.map(function (tk) { var w = textW(tk.t); return { x: tk.anchor === 'start' ? tk.x : tk.anchor === 'end' ? tk.x - w : tk.x - w / 2, y: Hh - B0 + 4, w: w, h: FONT + 4 }; });
    boxes.push({ x: 0, y: m.mid - FONT / 2 - 1, w: L0 - 4, h: FONT + 2 }); // 「50」の目盛り
    // 時代が変わった年：縦線と時代名（名前が重なるときは出さない）
    var lastX = -1e9;
    for (var i2 = 1; i2 < n; i2++) {
      var e0 = eraOf(pts[i2 - 1].year), e1 = eraOf(pts[i2].year);
      if (e0 === e1) continue;
      var ex = X(pts[i2].age), nb = { x: ex + 2, y: 2, w: textW(e1), h: FONT + 4 };
      var line = { x: ex, name: e1 };
      if (nb.x + nb.w <= W && ex - lastX > 4 && !boxes.some(function (b) { return hit(b, nb); })) { line.label = { x: ex + 2, y: 2 + FONT, t: e1 }; boxes.push(nb); lastX = nb.x + nb.w; }
      m.eras.push(line);
    }
    // 印（優先の順：いちばん高い・いちばん低い・最も大きく下がった・結婚・最初の子）
    var byAge = {};
    pts.forEach(function (p, i) { byAge[p.age] = i; });
    var cand = [];
    function add(age, kind) { if (byAge[age] == null) return; if (cand.some(function (c) { return c.age === age; })) return; cand.push({ age: age, kind: kind }); }
    var hi = 0, lo = 0, dropI = -1, dropV = 0;
    pts.forEach(function (p, i) { if (p.sat > pts[hi].sat) hi = i; if (p.sat < pts[lo].sat) lo = i; if (i && pts[i - 1].sat - p.sat > dropV) { dropV = pts[i - 1].sat - p.sat; dropI = i; } });
    var short = n <= 5;
    if (!short) add(pts[hi].age, 'high');
    add(pts[lo].age, 'low');
    if (!short) {
      if (dropI >= 0 && dropV >= 10) add(pts[dropI].age, 'drop');
      (o.marks || []).forEach(function (mk) { add(mk.age, mk.kind); });
    }
    cand.slice(0, 5).forEach(function (c) {
      var i = byAge[c.age], pt = m.curve[i];
      var mk = { age: c.age, kind: c.kind, x: pt.x, y: pt.y };
      var txt = clip(c.age + '歳　' + (pts[i].label || ''), 20);
      var w = textW(txt) + 4, h = FONT + 4;
      var tries = [pt.y - 10 - h, pt.y + 8, pt.y - 26 - h, pt.y + 24];
      var bx = Math.max(L0, Math.min(W - w - 2, pt.x - w / 2));
      for (var k = 0; k < tries.length; k++) {
        var b = { x: bx, y: tries[k], w: w, h: h };
        if (b.y < T0 - 2 || b.y + b.h > Hh - B0 + 2) continue;
        if (boxes.some(function (o2) { return hit(o2, b); })) continue;
        boxes.push(b);
        mk.label = { x: b.x, y: b.y + FONT, t: txt, box: b };
        break;
      }
      m.marks.push(mk);
    });
    m.boxes = boxes;
    return m;
  }

  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, text) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (text != null) e.textContent = text; return e; }
  function css(n, d) { try { return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || d; } catch (e) { return d; } }
  // box に描く。onPick(age) は印や曲線を押したとき（その年の記録を開く）
  function render(box, o, onPick, tipOf) {
    while (box.firstChild) box.removeChild(box.firstChild);
    var m = layout({ width: box.clientWidth || 340, height: (typeof window !== 'undefined' && window.innerWidth >= 768) ? 240 : 200, pts: o.pts, compare: o.compare, marks: o.marks });
    var text = css('--text', '#1a1a1a'), sub = css('--sub', '#555'), area = css('--area', '#e9efed'), rule = css('--rule', '#dfe3e1'), bar = css('--bar', '#2c6a66'), beni = css('--beni', '#a3132f'), bg = css('--bg', '#fff');
    var s = el('svg', { width: m.W, height: m.H, viewBox: '0 0 ' + m.W + ' ' + m.H, role: 'img', 'aria-label': o.label || '一生の暮らしの満足の移り変わり' });
    s.style.display = 'block';
    var fs = { 'font-size': FONT, 'font-family': 'inherit' };
    function tx(x, y, t, fill, anchor, bold) { var a = { x: x, y: y, fill: fill, 'text-anchor': anchor || 'start' }; for (var k in fs) a[k] = fs[k]; if (bold) a['font-weight'] = 700; s.appendChild(el('text', a, t)); }
    if (m.single) {
      s.appendChild(el('circle', { cx: m.dot.x, cy: m.dot.y, r: 4, fill: text }));
      tx(m.dot.x + 10, m.dot.y + 4, m.note, text);
      box.appendChild(s);
      return m;
    }
    var p = m.plot;
    s.appendChild(el('line', { x1: p.x, x2: p.x + p.w, y1: m.mid, y2: m.mid, stroke: rule, 'stroke-width': 1 }));
    tx(p.x - 6, m.mid + 4, '50', sub, 'end');
    m.eras.forEach(function (e) {
      s.appendChild(el('line', { x1: e.x, x2: e.x, y1: p.y - 4, y2: p.y + p.h, stroke: rule, 'stroke-width': 1 }));
      if (e.label) tx(e.label.x, e.label.y, e.label.t, sub);
    });
    var d = m.curve.map(function (c, i) { return (i ? 'L' : 'M') + c.x.toFixed(1) + ' ' + c.y.toFixed(1); }).join('');
    var base = p.y + p.h;
    s.appendChild(el('path', { d: d + 'L' + m.curve[m.curve.length - 1].x.toFixed(1) + ' ' + base + 'L' + m.curve[0].x.toFixed(1) + ' ' + base + 'Z', fill: area, stroke: 'none' }));
    if (m.compare.length > 1) s.appendChild(el('path', { d: m.compare.map(function (c, i) { return (i ? 'L' : 'M') + c.x.toFixed(1) + ' ' + c.y.toFixed(1); }).join(''), fill: 'none', stroke: sub, 'stroke-width': 1, 'stroke-linejoin': 'round' }));
    s.appendChild(el('path', { d: d, fill: 'none', stroke: text, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
    m.ticks.forEach(function (t) { tx(t.x, m.H - 6, t.t, sub, t.anchor); });
    var last = m.curve[m.curve.length - 1];
    s.appendChild(el('circle', { cx: last.x, cy: last.y, r: 3.5, fill: text }));
    var COL = { high: bar, low: beni, drop: beni, marry: text, child: text };
    m.marks.forEach(function (mk) {
      var g = el('g', { role: 'button', tabindex: '0', 'aria-label': mk.label ? mk.label.t : mk.age + '歳' });
      g.appendChild(el('circle', { cx: mk.x, cy: mk.y, r: 4.5, fill: COL[mk.kind] || text, stroke: bg, 'stroke-width': 1.5 }));
      if (mk.label) { var lb = mk.label.box; g.appendChild(el('rect', { x: lb.x - 2, y: lb.y, width: lb.w + 4, height: lb.h, fill: bg, stroke: rule, 'stroke-width': 1 })); var a = { x: mk.label.x, y: mk.label.y + 1, fill: text }; for (var k in fs) a[k] = fs[k]; g.appendChild(el('text', a, mk.label.t)); }
      g.style.cursor = 'pointer';
      g.addEventListener('click', function (ev) { ev.stopPropagation(); if (onPick) onPick(mk.age); });
      s.appendChild(g);
    });
    // 指やマウスで年齢をたどる
    var guide = el('line', { x1: 0, x2: 0, y1: p.y, y2: base, stroke: sub, 'stroke-width': 1, visibility: 'hidden' });
    var tipBg = el('rect', { x: 0, y: 0, width: 0, height: FONT + 8, fill: bg, stroke: rule, 'stroke-width': 1, visibility: 'hidden' });
    var tipT = el('text', { x: 0, y: 0, fill: text, 'font-size': FONT, visibility: 'hidden' });
    s.appendChild(guide); s.appendChild(tipBg); s.appendChild(tipT);
    var hot = el('rect', { x: p.x, y: 0, width: p.w, height: m.H, fill: 'transparent' });
    s.insertBefore(hot, s.firstChild);
    function near(ev) {
      var r = s.getBoundingClientRect(), x = (ev.clientX - r.left) * m.W / r.width, best = m.curve[0];
      m.curve.forEach(function (c) { if (Math.abs(c.x - x) < Math.abs(best.x - x)) best = c; });
      return best;
    }
    function show(ev) {
      var c = near(ev), t = tipOf ? tipOf(c.age) : c.age + '歳';
      guide.setAttribute('x1', c.x); guide.setAttribute('x2', c.x); guide.setAttribute('visibility', 'visible');
      tipT.textContent = t;
      var w = textW(t) + 10, x = Math.max(2, Math.min(m.W - w - 2, c.x - w / 2));
      tipBg.setAttribute('x', x); tipBg.setAttribute('y', 0); tipBg.setAttribute('width', w); tipBg.setAttribute('visibility', 'visible');
      tipT.setAttribute('x', x + 5); tipT.setAttribute('y', FONT + 3); tipT.setAttribute('visibility', 'visible');
    }
    function hide() { [guide, tipBg, tipT].forEach(function (e) { e.setAttribute('visibility', 'hidden'); }); }
    s.addEventListener('pointermove', show);
    s.addEventListener('pointerdown', show);
    s.addEventListener('pointerleave', hide);
    s.addEventListener('click', function (ev) { if (onPick) onPick(near(ev).age); });
    box.appendChild(s);
    return m;
  }
  root.IchiokuCurve = { layout: layout, render: render, eraOf: eraOf, textW: textW };
})(typeof self !== 'undefined' ? self : this);
