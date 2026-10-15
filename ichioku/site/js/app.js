/* 1億分の1 画面の動き */
(function () {
  'use strict';
  var E = window.Ichioku, O = window.IchiokuOld, M = E;
  var H = null; // 1975年より前の生まれのための束（data/history.json。必要になったときに取り出す）
  var BASE_MS = 7000;          // 1年あたりの表示時間（1倍のとき）。約80年で約10分
  var SPEEDS = [1, 2, 4];
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
    $('prov-top').hidden = !C.meta.provisional;
    var past = store('ichioku-lives') || [];
    $('past').textContent = past.length ? 'これまでに ' + past.length + ' 回の人生を送りました（記録はこの端末のブラウザにだけ残ります）' : '';
  }

  // 生まれる年は1800〜2000年のどの年も同じ確率（作る人の判断）
  function born() {
    var r = C.meta.birthRange, seed = randomSeed();
    var year = r[0] + Math.floor(E.makeRng(seed ^ 0x51ed270b)() * (r[1] - r[0] + 1));
    $('born').disabled = true;
    var ready = year >= 1975 ? Promise.resolve({ pref: E.pickPref(C, year, E.makeRng(seed ^ 0x9e3779b9)) }) :
      getHistory().then(function (h) { return O.pickBirth(C, h, year, E.makeRng(seed ^ 0x9e3779b9)); });
    ready.then(function (b) { return getPref(b.pref).then(function (p) { return { b: b, p: p }; }); }).then(function (x) {
      P = x.p;
      if (year >= 1975) { M = E; L = E.newLife(C, P, { year: year, seed: seed }); }
      else { M = O; L = O.newLife(C, H, P, { year: year, seed: seed, birth: x.b }); }
      paused = false; setPauseLabel();
      show('life');
      $('born').disabled = false;
      nextYear();
    }).catch(function () {
      $('born').disabled = false;
      alert('データを取り出せませんでした。通信の状態を確かめて、もう一度押してください。');
    });
  }

  /* ---------- 人生の画面 ---------- */
  function nextYear() {
    clearTimeout(timer);
    if (!L) return;
    if (!L.alive) { showEnd(); return; }
    cur = M.step(L);
    render(cur);
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

  function render(r) {
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
    r.events.forEach(function (e) {
      var li = el('li');
      var b = el('button', 'item');
      b.type = 'button';
      b.appendChild(el('span', 'tag', e.cat));
      b.appendChild(document.createTextNode(e.t));
      b.onclick = function () { openEvidence(e.t, e.ev); };
      li.appendChild(b);
      ev.appendChild(li);
    });
    $('branch').hidden = !r.branch;
    renderHotline($('hotline'), !!r.hotline);
    $('next').disabled = !!r.branch;
  }

  function showBranch(br) {
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
  function closeSheet() {
    $('sheet').hidden = true;
    sheetPaused = false;
    if (L && L.alive && cur && !cur.branch && !$('screen-life').hidden) schedule();
  }
  function openEvidence(title, evs) {
    openSheet('もとになった統計', function (c) {
      c.appendChild(el('p', null, title));
      if (!evs || !evs.length) { c.appendChild(el('p', 'note', 'この出来事に結びついた統計はありません')); return; }
      evs.forEach(function (e) {
        var d = el('div', 'evi');
        d.appendChild(el('p', 'src', e.name + (e.org ? '（' + e.org + '）' : '')));
        if (e.y) d.appendChild(el('p', 'note', e.y + '年の値' + (!e.noYearNote && cur && e.y !== cur.year ? '（' + cur.year + '年の値がないため、いちばん近い年を使用）' : '')));
        if (e.what) d.appendChild(el('p', 'what', e.what));
        if (e.val) d.appendChild(el('p', 'val', e.val));
        var marks = [];
        if (e.est) marks.push('推計');
        if (e.prov) marks.push('仮の値');
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
      L.log.concat(cur && L.log.indexOf(cur) < 0 ? [cur] : []).forEach(function (r) {
        var d = el('div', 'logyear');
        d.appendChild(el('p', 'ly', r.year + '年　' + r.age + '歳　' + r.place));
        r.events.forEach(function (e) { d.appendChild(el('p', null, e.t)); });
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
  function showEnd() {
    clearTimeout(timer);
    if (!L) return;
    show('end');
    $('end-title').textContent = L.name + 'さんの一生　' + L.by + '年〜' + L.deathYear + '年（' + L.deathAge + '歳）';
    $('end-sub').textContent = L.old ? O.endText(L) : L.home.prefName + L.home.muniName + 'で生まれ、' + (L.place.away ? L.place.prefName : L.place.prefName + L.place.muniName) + 'で亡くなった。';
    renderHotline($('hotline-end'), L.cause === 'sui');
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
    var lives = store('ichioku-lives') || [];
    lives.unshift({ by: L.by, place: L.old ? L.home.label : L.home.prefName + L.home.muniName, age: L.deathAge });
    store('ichioku-lives', lives.slice(0, 50));
  }

  /* ---------- 操作 ---------- */
  function bind() {
    $('pause').onclick = function () { paused = !paused; setPauseLabel(); if (paused) clearTimeout(timer); else if (cur && !cur.branch) schedule(); };
    $('speed').onclick = function () { speedIdx = (speedIdx + 1) % SPEEDS.length; $('speed').textContent = '速さ ' + SPEEDS[speedIdx] + '倍'; if (cur && !cur.branch) schedule(); };
    $('next').onclick = function () { if (cur && cur.branch) return; if (!L.alive) showEnd(); else nextYear(); };
    $('family').onclick = openFamily;
    $('log').onclick = openLog;
    $('end-log').onclick = openLog;
    $('sheet-close').onclick = closeSheet;
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('sheet').hidden) closeSheet(); });
    $('again').onclick = function () { L = null; cur = null; show('top'); initPast(); };
  }
  function initPast() {
    var past = store('ichioku-lives') || [];
    $('past').textContent = past.length ? 'これまでに ' + past.length + ' 回の人生を送りました（記録はこの端末のブラウザにだけ残ります）' : '';
  }

  bind();
  getJSON('data/common.json').then(function (c) { C = c; initTop(); }).catch(function () {
    $('born').textContent = 'データを取り出せませんでした';
  });
})();
