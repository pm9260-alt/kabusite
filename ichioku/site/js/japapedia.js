/* 1000分の1 Japapedia（spec6 2-12・2-24）
   貴族・将軍家・大名家に生まれた人生と、すぐれた功績を残した人生だけを、事典の項目の形で振り返る。
   文はすべて人生の記録（出来事と選択）から組み立て、記録にない出来事は書かない。
   見た目はサイトと同じ字体・1pxの線だけ。ウィキペディアのロゴ・配色・字体は使わず、項目の並べ方だけにならう。外部への通信はしない。 */
(function (root) {
  'use strict';
  var POST_RE = /議員|村長|町長|市長|知事|大臣|名主|乙名|庄屋|貴族院/;
  function honorsOf(L) { var S = root.IchiokuStory; return S && S.finalHonors ? S.finalHonors(L) : (L.honors || []); }
  // 出す条件
  function eligible(L) {
    if (!L || L.alive) return false;
    if (L.status === 'kuge' || L.kakaku || L.rank === 'shogun' || L.rank === 'daimyo') return true;
    if (honorsOf(L).length) return true;
    if ((L.posts || []).some(function (p) { return POST_RE.test(p.t); })) return true;
    if (/^(sakan|shokan)$/.test(L.grade) || (L.honors || []).some(function (h) { return /金鵄/.test(h.t); })) return true;
    if ((L.feats || []).length) return true;
    return false;
  }
  function eraName(y) { return y < 1185 ? '平安時代' : y < 1333 ? '鎌倉時代' : y < 1392 ? '南北朝時代' : y < 1467 ? '室町時代' : y < 1600 ? '戦国時代' : y < 1868 ? '江戸時代' : y < 1912 ? '明治時代' : y < 1926 ? '大正時代' : y < 1989 ? '昭和時代' : y < 2019 ? '平成時代' : '令和時代'; }
  var ERA_B = [[1000, 1184], [1185, 1332], [1333, 1391], [1392, 1466], [1467, 1599], [1600, 1867], [1868, 1911], [1912, 1925], [1926, 1988], [1989, 2018], [2019, 2100]];
  // 時代の中での位置（前期・中期・後期）
  function part(y) { var b = ERA_B.filter(function (x) { return y >= x[0] && y <= x[1]; })[0] || [y, y + 1]; var t = (y - b[0]) / (b[1] - b[0] + 1); return t < 1 / 3 ? '前期' : t < 2 / 3 ? '中期' : '後期'; }
  function clean(t) { return String(t || '').replace(/\s+/g, ''); }
  // 事典の項目を組み立てる。ctx：{ name, houseWord, place, deathPlace, cause }
  function build(L, ctx) {
    var hs = honorsOf(L), evs = [], y0 = L.by, y1 = L.deathYear;
    (L.log || []).forEach(function (r) { (r.events || []).forEach(function (e) { if (e.cat !== '時代' || e.story) evs.push({ y: r.year, a: r.age, t: clean(e.t), cat: e.cat, ev: e.ev || [], story: !!e.story }); }); });
    var name = ctx.name, plain = String(name).replace(/（.*?）/g, '').replace(/\s/g, '');
    var job = (L.selfJob && L.selfJob.n) || (L.pathJob && L.pathJob.n) || L.lastJob || '';
    var lastPost = (L.posts || []).length ? L.posts[L.posts.length - 1].t : '';
    var hw = ctx.houseWord || '';
    var lead = plain + 'は、' + eraName(y1) + part(y1) + 'の' + (L.rank === 'shogun' ? '将軍家の人' : L.rank === 'daimyo' ? '大名' : L.status === 'kuge' ? (y1 >= 1869 && y1 <= 1947 ? '華族' : '公家') : job || '人物') + '。' + (hw ? hw.replace(/の家$/, '') + 'の家に生まれ、' : '') + (lastPost ? lastPost + 'を務めた。' : job ? job + 'として生きた。' : '') + ((L.feats || []).length ? L.feats[L.feats.length - 1].t + 'で名を残した。' : '');
    var bands = [['生い立ち', 0, 14], ['青年期', 15, 29], ['壮年期', 30, 59], ['晩年', 60, 200]];
    var life = bands.map(function (b) {
      var es = evs.filter(function (e) { return e.a >= b[1] && e.a <= b[2] && e.cat !== '健康'; });
      // 物語の分かれ道と、本人の選択を先に。1つの見出しに6文まで
      es.sort(function (p, q) { return (q.story ? 1 : 0) - (p.story ? 1 : 0) || p.y - q.y; });
      es = es.slice(0, 6).sort(function (p, q) { return p.y - q.y; });
      return { h: b[0], ps: es.map(function (e) { return e.y + '年（' + e.a + '歳）、' + e.t; }) };
    }).filter(function (s) { return s.ps.length; });
    var anec = evs.filter(function (e) { return e.cat === '人間関係'; }).slice(0, 5).map(function (e) { return e.t; });
    var fam = (L.members || []).filter(function (m) { return !m.before && /父|母|配偶者|子|パートナー/.test(m.role); }).map(function (m) { return { role: m.role === '配偶者' ? (m.sex === 'm' ? '夫' : '妻') : m.role, name: m.name, by: m.by, dy: m.alive ? null : m.dy, house: m.house || null }; });
    var spouse = fam.filter(function (f) { return f.role === '夫' || f.role === '妻'; }).map(function (f) { return f.name; }).join('、');
    var kids = fam.filter(function (f) { return f.role === '子'; }).map(function (f) { return f.name; }).join('、');
    var timeline = [];
    var seenY = {};
    evs.forEach(function (e) { if (e.story && !seenY[e.y] && timeline.length < 16) { seenY[e.y] = 1; timeline.push({ y: e.y, t: e.t }); } });
    timeline.push({ y: y1, t: L.deathAge + '歳で亡くなった。' });
    var srcs = {};
    (L.log || []).forEach(function (r) { (r.events || []).forEach(function (e) { (e.ev || []).forEach(function (v) { if (v.name) srcs[v.name + (v.org ? '（' + v.org + '）' : '')] = 1; }); }); });
    var info = [
      ['生年', y0 + '年'], ['生地', ctx.place || ''], ['没年', y1 + '年（享年' + L.deathAge + '）'], ['没地', ctx.deathPlace || ''],
      ['身分・家格', hw], ['職業', job], ['最終の位・役職', lastPost || (L.grade ? ctx.gradeName || '' : '')],
      ['位階', hs.filter(function (h) { return h.k === 'ikai' || h.k === 'zoui'; }).map(function (h) { return h.t; }).join('、')],
      ['勲章・褒章', hs.filter(function (h) { return h.k === 'kunsho' || h.k === 'hosho' || h.k === 'hobi'; }).map(function (h) { return h.t; }).join('、')],
      ['配偶者', spouse], ['子', kids], ['出身校', L.edu || '']
    ].filter(function (x) { return x[1]; });
    return {
      title: String(name).replace(/（.*?）/g, ''), years: '（' + y0 + '年 - ' + y1 + '年）', lead: lead, info: info, life: life, anec: anec, fam: fam,
      honors: hs.map(function (h) { return { y: h.y, t: h.k === 'zoui' ? h.t + '（明治以後の贈位）' : h.t + (h.posthumous ? '（没時）' : '') }; }),
      timeline: timeline, srcs: Object.keys(srcs).slice(0, 30), by: y0, dy: y1, ages: [Math.min(10, L.deathAge), Math.min(35, L.deathAge), L.deathAge]
    };
  }
  /* ---------- 画面に出す ---------- */
  function el(tag, cls, text) { var e = root.document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function render(box, A, drawAvatar) {
    while (box.firstChild) box.removeChild(box.firstChild);
    box.appendChild(el('p', 'jp-note', '1000分の1で生まれた架空の人の項目です'));
    var h = el('h1', 'jp-title'); h.appendChild(el('span', null, A.title)); h.appendChild(el('span', 'jp-years', A.years)); box.appendChild(h);
    var ib = el('table', 'jp-info'), cap = el('caption', null, A.title); ib.appendChild(cap);
    var pr = el('tr'), pc = el('td'); pc.colSpan = 2; pc.className = 'jp-portraits';
    A.ages.forEach(function (a, i) { var cv = el('canvas', 'avatar jp-av'); cv.width = 48; cv.height = 64; cv.id = 'jp-av-' + i; pc.appendChild(cv); });
    pr.appendChild(pc); ib.appendChild(pr);
    A.info.forEach(function (r) { var tr = el('tr'); tr.appendChild(el('th', null, r[0])); tr.appendChild(el('td', null, r[1])); ib.appendChild(tr); });
    box.appendChild(ib);
    box.appendChild(el('p', 'jp-lead', A.lead));
    var toc = el('nav', 'jp-toc'); toc.appendChild(el('p', 'jp-toc-h', '目次'));
    var ol = el('ol'); var secs = ['生涯', '人物・逸話', '家族と系譜', '栄典', '年表', '脚注と参考文献'];
    secs.forEach(function (s, i) { var li = el('li'); var a = el('a', null, s); a.href = '#jp-s' + i; li.appendChild(a); ol.appendChild(li); });
    toc.appendChild(ol); box.appendChild(toc);
    function sec(i) { var h2 = el('h2', 'jp-h2', secs[i]); h2.id = 'jp-s' + i; box.appendChild(h2); }
    sec(0); A.life.forEach(function (s) { box.appendChild(el('h3', 'jp-h3', s.h)); s.ps.forEach(function (p) { box.appendChild(el('p', null, p)); }); });
    sec(1); var ul = el('ul'); (A.anec.length ? A.anec : ['記録に残る逸話はない。']).forEach(function (t) { ul.appendChild(el('li', null, t)); }); box.appendChild(ul);
    sec(2); var fl = el('ul'); A.fam.forEach(function (f) { fl.appendChild(el('li', null, f.role + '：' + f.name + '（' + f.by + '年 - ' + (f.dy != null ? f.dy + '年' : '') + '）' + (f.house ? '　' + f.house : ''))); }); box.appendChild(fl);
    sec(3); var hl = el('ul'); (A.honors.length ? A.honors : [{ y: '', t: '記録に残る栄典はない' }]).forEach(function (h) { hl.appendChild(el('li', null, (h.y ? h.y + '年　' : '') + h.t)); }); box.appendChild(hl);
    sec(4); var tl = el('ul', 'jp-tl'); A.timeline.forEach(function (t) { tl.appendChild(el('li', null, t.y + '年　' + t.t)); }); box.appendChild(tl);
    sec(5); var sl = el('ol', 'jp-src'); A.srcs.forEach(function (t) { sl.appendChild(el('li', null, t)); }); box.appendChild(sl);
    if (drawAvatar) A.ages.forEach(function (a, i) { try { drawAvatar('jp-av-' + i, A.by + a, a); } catch (e) { /* 肖像なし */ } });
  }
  /* ---------- 画像（spec6 2-24）：幅1080、1枚の縦は1920まで。最後の1枚に出典の数だけ書く ---------- */
  var FONT = '"Zen Kaku Gothic New", "Hiragino Kaku Gothic ProN", "Hiragino Sans", "Noto Sans JP", sans-serif';
  var TITLE_FONT = '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif';
  var W = 1080, HMAX = 1920, PAD = 64, TEXT = '#1a1a1a', SUB = '#555555', RULE = '#c9c9c6', BG = '#ffffff';
  function lines(ctx, t, maxW) {
    var out = [], line = '';
    for (var i = 0; i < t.length; i++) { var nt = line + t[i]; if (ctx.measureText(nt).width > maxW && line && '、。」）・'.indexOf(t[i]) < 0) { out.push(line); line = t[i]; } else line = nt; }
    if (line) out.push(line);
    return out;
  }
  function toImages(A, avatarCanvases) {
    var d = root.document;
    var wait = d && d.fonts && d.fonts.load ? Promise.all(['400', '700'].map(function (w) { return d.fonts.load(w + ' 28px "Zen Kaku Gothic New"', A.title + A.lead); })).catch(function () { }) : Promise.resolve();
    return wait.then(function () {
      // まず並べる行を作る（[種類, 文]）
      var rows = [['h1', A.title + ' ' + A.years], ['p', A.lead], ['img', ''], ['rule', '']];
      A.info.forEach(function (r) { rows.push(['kv', r[0] + '　' + r[1]]); });
      rows.push(['h2', '生涯']);
      A.life.forEach(function (s) { rows.push(['h3', s.h]); s.ps.forEach(function (p) { rows.push(['p', p]); }); });
      rows.push(['h2', '栄典']); (A.honors.length ? A.honors : [{ y: '', t: '記録に残る栄典はない' }]).forEach(function (h) { rows.push(['p', (h.y ? h.y + '年　' : '') + h.t]); });
      rows.push(['h2', '家族と系譜']); A.fam.forEach(function (f) { rows.push(['p', f.role + '：' + f.name]); });
      rows.push(['h2', '年表']); A.timeline.forEach(function (t) { rows.push(['p', t.y + '年　' + t.t]); });
      var meas = d.createElement('canvas').getContext('2d');
      var SZ = { h1: 48, h2: 34, h3: 28, p: 26, kv: 26 }, LH = 1.55, maxW = W - PAD * 2;
      var blocks = rows.map(function (r) {
        if (r[0] === 'img') return { k: 'img', h: 150 };
        if (r[0] === 'rule') return { k: 'rule', h: 24 };
        meas.font = (r[0] === 'h1' || r[0] === 'h2' || r[0] === 'h3' ? '700 ' : '400 ') + SZ[r[0]] + 'px ' + FONT;
        var ls = lines(meas, r[1], maxW);
        return { k: r[0], ls: ls, h: ls.length * SZ[r[0]] * LH + (r[0] === 'h2' ? 28 : r[0] === 'h3' ? 12 : 8) };
      });
      // 1枚ずつに分ける（下に番号と題字の場所を残す）
      var pages = [[]], used = PAD, foot = 110;
      blocks.forEach(function (b) { if (used + b.h > HMAX - foot && pages[pages.length - 1].length) { pages.push([]); used = PAD; } pages[pages.length - 1].push(b); used += b.h; });
      var urls = pages.map(function (pg, pi) {
        var cv = d.createElement('canvas'), last = pi === pages.length - 1;
        var hh = PAD + pg.reduce(function (s, b) { return s + b.h; }, 0) + foot + (last ? 40 : 0);
        cv.width = W; cv.height = Math.min(HMAX, Math.max(600, hh));
        var c = cv.getContext('2d');
        c.fillStyle = BG; c.fillRect(0, 0, W, cv.height);
        var y = PAD;
        pg.forEach(function (b) {
          if (b.k === 'img') { (avatarCanvases || []).forEach(function (av, i) { if (av) { c.imageSmoothingEnabled = false; c.drawImage(av, PAD + i * 130, y, 96, 128); } }); y += b.h; return; }
          if (b.k === 'rule') { c.fillStyle = RULE; c.fillRect(PAD, y + 10, maxW, 1); y += b.h; return; }
          var sz = SZ[b.k];
          c.font = (b.k === 'p' || b.k === 'kv' ? '400 ' : '700 ') + sz + 'px ' + FONT; c.fillStyle = b.k === 'kv' ? SUB : TEXT; c.textBaseline = 'top';
          if (b.k === 'h2') { y += 16; }
          b.ls.forEach(function (ln, i) { c.fillText(ln, PAD, y + i * sz * LH); });
          y += b.ls.length * sz * LH + (b.k === 'h3' ? 12 : 8);
          if (b.k === 'h2') { c.fillStyle = RULE; c.fillRect(PAD, y - 4, maxW, 1); y += 12; }
        });
        c.fillStyle = SUB; c.font = '400 22px ' + FONT; c.textBaseline = 'alphabetic';
        c.fillText((pi + 1) + '/' + pages.length, PAD, cv.height - 40);
        if (last) c.fillText('出典：' + A.srcs.length + '件（画面の脚注を見てください）', PAD + 90, cv.height - 40);
        c.font = '700 26px ' + TITLE_FONT; c.fillStyle = TEXT; c.textAlign = 'right';
        c.fillText('1000分の1', W - PAD, cv.height - 38); c.textAlign = 'left';
        return cv.toDataURL('image/png');
      });
      return urls;
    });
  }
  var API = { eligible: eligible, build: build, render: render, toImages: toImages };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.IchiokuJapapedia = API;
})(typeof self !== 'undefined' ? self : this);
