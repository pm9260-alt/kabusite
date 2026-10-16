/* 1000分の1 主人公のドット絵
   生まれ年・その年の年齢・男女・身分・仕事・学校・住む場所から、時代に合った髪型と服を選んで 24×32 の点で描く。
   乱数は使わず、同じ人なら同じ色になるよう人生の番号（seed）から色を選ぶ。
   くっきり見せるため（2026-10-17）：24×32 で描いたあと、ドット絵向けの拡大（Scale2x）で 48×64 にして斜めの線をなめらかにし、
   まわりに1マスの輪郭線（となりの色を暗くした色）を付ける。画面には、端末の細かさに合わせた整数倍で描く（ぼけを防ぐ）。 */
(function (root) {
  'use strict';
  var W = 24, H = 32;

  var SKIN = '#f0c8a0', SKIN_D = '#d8a47a', CROWN = '#e6c3a6', EYE = '#2a1e18', BLACK = '#1e1b1a', GRAY = '#9b9b9b', WHITE_H = '#dcdcdc';
  var SHOE = '#4a3424', GETA = '#8a6440';

  function pickC(list, seed, k) { return list[(seed >>> 0) % 997 * (k || 1) % list.length]; }

  /* ---------- その年の姿を決める ---------- */
  var STUDY_OLD = ['小学校', '中学校', '高校', '旧制中学', '高等女学校', '旧制の上の学校', '大学', '短大', '高等小学校', '寺子屋', '藩校', '村学校'];
  function lookOf(L) {
    var y = L.year, a = L.age, old = !!L.old;
    var st = old ? L.status : 'heimin';
    var job = null, student = null;
    if (old) {
      job = L.job || null;
      if (L.school && STUDY_OLD.indexOf(L.school) >= 0) student = L.school;
    } else {
      if (L.stage === 'school' || (L.school && ['hs', 'jc', 'voc', 'univ'].indexOf(L.school) >= 0) || (a >= 6 && a <= 15 && !L.job)) student = a < 12 ? '小学校' : a < 15 ? '中学校' : L.school === 'hs' || a < 18 ? '高校' : '大学';
      var ind = L.job && L.job.ind;
      job = ind ? ({ agri: 'farm', fish: 'fish', factory: 'factory', build: 'build', office: 'clerk', pub: 'clerk', care: 'care', shop: 'store', service: 'store' })[ind] : (L.stage === 'home' ? 'home' : null);
    }
    var kind = old ? L.kind : ({ '大都市': 'city', '都市': 'town', '町村': 'village' })[(L.place || {}).kind] || 'town';
    return {
      y: y, a: a, sex: L.sex, st: st, job: job, student: student, kind: kind,
      ainu: !!L.ainu, ryukyu: !!L.ryukyu || (L.home && L.home.pref === '47') || (L.place && L.place.pref === '47'),
      abroad: L.abroad || null, drafted: !!(L.drafted && !L.demob && y >= 1937 && y <= 1945),
      married: !!L.married, seed: L.seed >>> 0, dead: !L.alive
    };
  }

  /* ---------- 描く道具 ---------- */
  function painter(ctx) {
    return function (x, y, w, h, c) { if (!c) return; ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  }

  var W2 = W * 2, H2 = H * 2;
  // Scale2x（EPX）：1マスを2×2に分け、まわりの色がそろっている角だけその色にする
  function scale2x(src) {
    var out = new Array(W2 * H2);
    function at(x, y) { x = Math.max(0, Math.min(W - 1, x)); y = Math.max(0, Math.min(H - 1, y)); return src[y * W + x]; }
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var P = at(x, y), A = at(x, y - 1), B = at(x + 1, y), C = at(x - 1, y), D = at(x, y + 1);
      var e0 = P, e1 = P, e2 = P, e3 = P;
      if (C === A && C !== D && A !== B) e0 = A;
      if (A === B && A !== C && B !== D) e1 = B;
      if (D === C && D !== B && C !== A) e2 = C;
      if (B === D && B !== A && D !== C) e3 = D;
      out[(2 * y) * W2 + 2 * x] = e0; out[(2 * y) * W2 + 2 * x + 1] = e1;
      out[(2 * y + 1) * W2 + 2 * x] = e2; out[(2 * y + 1) * W2 + 2 * x + 1] = e3;
    }
    return out;
  }
  function darker(c) {
    var n = parseInt(c.slice(1), 16), k = 0.42;
    return 'rgb(' + Math.round((n >> 16 & 255) * k) + ',' + Math.round((n >> 8 & 255) * k) + ',' + Math.round((n & 255) * k) + ')';
  }
  function draw(canvas, L) {
    // 1) 24×32 で描く（色は '#rrggbb' の文字で持つ。重ね塗りの半透明は下の色と混ぜる）
    var px = new Array(W * H);
    function hex(n) { return '#' + ('00000' + n.toString(16)).slice(-6); }
    function mix(base, rgba) {
      var m = rgba.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
      if (!m) return base;
      var b = base ? parseInt(base.slice(1), 16) : 0xffffff, a = +m[4];
      var r0 = (b >> 16 & 255) * (1 - a) + (+m[1]) * a, g0 = (b >> 8 & 255) * (1 - a) + (+m[2]) * a, b0 = (b & 255) * (1 - a) + (+m[3]) * a;
      return hex((Math.round(r0) << 16) | (Math.round(g0) << 8) | Math.round(b0));
    }
    var fake = {
      set fillStyle(c) { this._c = c; }, get fillStyle() { return this._c; },
      fillRect: function (x, y, w, h) {
        for (var yy = Math.max(0, y); yy < Math.min(H, y + h); yy++) for (var xx = Math.max(0, x); xx < Math.min(W, x + w); xx++) {
          var c = this._c, i = yy * W + xx;
          if (c.length === 4 && c.charAt(0) === '#') c = '#' + c.charAt(1) + c.charAt(1) + c.charAt(2) + c.charAt(2) + c.charAt(3) + c.charAt(3);
          px[i] = c.charAt(0) === '#' ? c.toLowerCase() : mix(px[i], c);
        }
      },
      clearRect: function () {}
    };
    var desc = drawSmall(fake, L);
    // 2) 48×64 になめらかに拡大し、3) 輪郭線を付ける
    var big = scale2x(px), outl = big.slice();
    for (var y = 0; y < H2; y++) for (var x = 0; x < W2; x++) {
      if (big[y * W2 + x]) continue;
      var nb = null;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { var xx = x + d[0], yy = y + d[1]; if (!nb && xx >= 0 && yy >= 0 && xx < W2 && yy < H2 && big[yy * W2 + xx]) nb = big[yy * W2 + xx]; });
      if (nb) outl[y * W2 + x] = darker(nb);
    }
    // 4) 端末の細かさに合わせた整数倍で描く
    var css = canvas.clientWidth || 96, dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    var N = Math.max(1, Math.round(css * dpr / W2));
    canvas.width = W2 * N; canvas.height = H2 * N;
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (var i = 0; i < outl.length; i++) if (outl[i]) { ctx.fillStyle = outl[i]; ctx.fillRect((i % W2) * N, Math.floor(i / W2) * N, N, N); }
    return desc;
  }
  function drawSmall(ctx, L) {
    var r = painter(ctx), k = lookOf(L);
    var sizeKey = k.a <= 1 ? 'baby' : k.a <= 11 ? 'child' : k.a <= 16 ? 'teen' : 'adult';
    if (sizeKey === 'baby') { drawBaby(r, k); return describe(k); }
    var g = sizeKey === 'child' ? { ht: 11, bt: 19, bh: 6, lt: 25 } : sizeKey === 'teen' ? { ht: 6, bt: 14, bh: 8, lt: 22 } : { ht: 4, bt: 12, bh: 10, lt: 22 };
    if (k.a >= 70) { g.ht += 1; g.bt += 1; g.bh -= 1; }
    var clothes = clothesOf(k), hair = hairOf(k);
    // 後ろ髪（長い髪は体より先に描く）
    if (hair.back) r(7, g.ht + 1, 10, hair.back, hair.color);
    drawBody(r, g, clothes, k);
    drawHead(r, g, hair, k);
    if (clothes.hat) drawHat(r, g, clothes.hat);
    if (clothes.sword) { r(5, g.bt + 5, 1, 1, '#555555'); r(6, g.bt + 6, 1, 1, '#555555'); r(7, g.bt + 7, 1, 1, BLACK); }
    if (k.a >= 78) { r(19, g.bt + 3, 1, H - g.bt - 4, '#7a5432'); r(18, g.bt + 3, 1, 1, '#7a5432'); }
    return describe(k, clothes, hair);
  }

  function drawBaby(r, k) {
    var wrap = k.y < 1950 ? pickC(['#c45c5c', '#d9a441', '#6b8cb8', '#b884b8'], k.seed) : pickC(['#f2c4d0', '#c4dcf2', '#f2e6b8', '#d4f0c8'], k.seed);
    r(7, 16, 10, 13, wrap); r(6, 18, 12, 9, wrap);
    r(8, 27, 8, 2, wrap);
    r(9, 15, 6, 2, wrap);
    r(9, 17, 6, 6, SKIN); r(9, 22, 6, 1, SKIN_D);
    r(10, 19, 1, 1, EYE); r(13, 19, 1, 1, EYE);
    r(9, 17, 6, 1, k.y < 1950 ? '#3a2a20' : '#5a4030');
    r(8, 24, 8, 1, '#ffffff');
  }

  /* ---------- 髪 ---------- */
  function hairOf(k) {
    var y = k.y, a = k.a, m = k.sex === 'm';
    var color = a >= 72 ? WHITE_H : a >= 58 ? GRAY : BLACK;
    if (!m && y >= 1990 && a >= 16 && a < 55 && (k.seed % 3 === 0)) color = '#5a3a24';
    if (m && y >= 1990 && a >= 16 && a < 40 && (k.seed % 4 === 0)) color = '#4a3020';
    var s;
    if (k.ainu && y < 1900) s = m ? (a >= 16 ? 'ainuM' : 'long') : 'ainuF';
    else if (k.ryukyu && y < 1890) s = m ? (a >= 13 ? 'katakashira' : 'okappa') : (a >= 13 ? 'kanpu' : 'okappa');
    else if (y < 1600) {
      // 1600年より前：大人の男は烏帽子、女は長い髪を後ろに垂らした（垂髪）
      if (m) s = k.st === 'priest' && a >= 13 ? 'shaved' : a >= 15 ? 'eboshi' : 'okappa';
      else s = a >= 13 ? 'long' : 'okappa';
    }
    else if (m) {
      if (k.st === 'priest' && a >= 13) s = 'shaved';
      else if (y < 1872 || (y < 1885 && k.kind === 'village' && a >= 30)) s = a >= 15 ? 'chonmage' : a >= 6 ? 'kids-tuft' : 'shaved';
      else if (a <= 15 && y < 1970) s = 'bouzu';
      else if (k.drafted || (y >= 1937 && y <= 1946 && a < 40)) s = 'bouzu';
      else if (a >= 62 && k.seed % 3 === 0) s = 'bald';
      else if (y >= 1968 && y < 1985 && a >= 16 && a < 30) s = 'longish';
      else s = 'short';
    } else {
      if (y < 1890 || (y < 1915 && a >= 30 && k.kind !== 'city')) s = a >= 15 ? 'nihongami' : a >= 6 ? 'chigo' : 'okappa';
      else if (y < 1925) s = a >= 15 ? 'sokuhatsu' : 'okappa';
      else if (y < 1955) s = a >= 15 ? (y >= 1946 || k.kind === 'city' ? 'perm' : 'bun') : 'okappa';
      else if (y < 1975) s = a >= 15 ? (a >= 40 ? 'perm' : 'long') : 'okappa';
      else s = a >= 45 ? 'perm' : a >= 15 ? (k.seed % 2 ? 'long' : 'bob') : (k.seed % 2 ? 'long' : 'bob');
    }
    return { style: s, color: color, back: s === 'long' || s === 'ainuF' || s === 'ainuM' ? (s === 'ainuM' ? 8 : 10) : 0 };
  }

  function drawHead(r, g, hair, k) {
    var t = g.ht, c = hair.color;
    // 顔
    r(8, t + 1, 8, 8, SKIN);
    r(8, t + 8, 8, 1, SKIN_D);
    r(10, t + 5, 1, 1, EYE); r(13, t + 5, 1, 1, EYE);
    if (k.a >= 58) { r(10, t + 4, 1, 1, SKIN_D); r(13, t + 4, 1, 1, SKIN_D); }
    switch (hair.style) {
      case 'chonmage':
        r(9, t + 1, 6, 2, CROWN); r(8, t + 1, 1, 4, c); r(15, t + 1, 1, 4, c);
        r(10, t, 4, 1, c); r(11, t - 1, 2, 1, c); r(13, t - 1, 1, 1, c); break;
      case 'eboshi':
        r(8, t + 1, 1, 3, c); r(15, t + 1, 1, 3, c); r(8, t, 8, 1, '#1a1a1a'); r(9, t - 4, 6, 4, '#1a1a1a'); r(10, t - 5, 4, 1, '#1a1a1a'); break;
      case 'kids-tuft':
        r(8, t + 1, 8, 2, CROWN); r(11, t, 2, 2, c); r(8, t + 3, 1, 2, c); r(15, t + 3, 1, 2, c); break;
      case 'shaved':
        r(8, t + 1, 8, 2, CROWN); break;
      case 'bouzu':
        r(8, t + 1, 8, 2, '#4a4440'); r(8, t + 3, 1, 1, '#4a4440'); r(15, t + 3, 1, 1, '#4a4440'); break;
      case 'bald':
        r(8, t + 1, 8, 2, CROWN); r(8, t + 3, 1, 3, c); r(15, t + 3, 1, 3, c); break;
      case 'short':
        r(8, t, 8, 3, c); r(8, t + 3, 1, 2, c); r(15, t + 3, 1, 2, c); r(13, t + 2, 2, 1, SKIN); break;
      case 'longish':
        r(7, t, 10, 3, c); r(7, t + 3, 2, 5, c); r(15, t + 3, 2, 5, c); r(9, t + 3, 3, 1, c); break;
      case 'okappa':
        r(7, t, 10, 4, c); r(7, t + 4, 2, 4, c); r(15, t + 4, 2, 4, c); break;
      case 'bob':
        r(7, t, 10, 3, c); r(7, t + 3, 2, 6, c); r(15, t + 3, 2, 6, c); r(9, t + 3, 2, 1, c); break;
      case 'long':
        r(7, t, 10, 3, c); r(7, t + 3, 2, 3, c); r(15, t + 3, 2, 3, c); r(9, t + 3, 3, 1, c); break;
      case 'perm':
        r(7, t - 1, 10, 4, c); r(7, t + 3, 2, 4, c); r(15, t + 3, 2, 4, c);
        r(8, t - 1, 1, 1, SKIN_D === c ? c : 'rgba(255,255,255,0.18)'); r(11, t, 1, 1, 'rgba(255,255,255,0.18)'); r(14, t - 1, 1, 1, 'rgba(255,255,255,0.18)'); break;
      case 'nihongami':
        r(8, t, 8, 3, c); r(7, t + 2, 1, 3, c); r(16, t + 2, 1, 3, c);
        r(9, t - 3, 6, 3, c); r(8, t - 2, 1, 1, c); r(15, t - 2, 1, 1, c);
        r(10, t - 1, 4, 1, k.a < 40 ? '#d04040' : '#b08a3c'); r(16, t - 2, 2, 1, '#c8a050'); break;
      case 'chigo':
        r(8, t, 8, 3, c); r(8, t + 3, 1, 2, c); r(15, t + 3, 1, 2, c); r(10, t - 2, 4, 2, c); r(11, t - 1, 2, 1, '#d04040'); break;
      case 'sokuhatsu':
        r(7, t - 2, 10, 4, c); r(7, t + 2, 1, 3, c); r(16, t + 2, 1, 3, c); r(10, t - 3, 4, 1, c); r(11, t + 1, 3, 1, c); break;
      case 'bun':
        r(8, t, 8, 3, c); r(8, t + 3, 1, 2, c); r(15, t + 3, 1, 2, c); r(16, t + 1, 2, 3, c); break;
      case 'kanpu':
        r(8, t, 8, 3, c); r(8, t + 3, 1, 2, c); r(15, t + 3, 1, 2, c); r(10, t - 3, 4, 3, c); r(7, t - 2, 10, 1, '#d0d0d0'); break;
      case 'katakashira':
        r(8, t, 8, 3, c); r(8, t + 3, 1, 2, c); r(15, t + 3, 1, 2, c); r(11, t - 2, 3, 2, c); r(9, t - 2, 2, 1, '#d0d0d0'); break;
      case 'ainuM':
        r(7, t, 10, 3, c); r(7, t + 3, 2, 5, c); r(15, t + 3, 2, 5, c);
        r(9, t + 6, 6, 3, c); r(10, t + 9, 4, 1, c); r(11, t + 6, 2, 1, SKIN); break;
      case 'ainuF':
        r(7, t, 10, 3, c); r(7, t + 3, 2, 5, c); r(15, t + 3, 2, 5, c); r(7, t + 2, 10, 1, '#2a3a6a'); r(9, t + 2, 1, 1, '#c84040'); r(13, t + 2, 1, 1, '#c84040'); break;
    }
  }

  /* ---------- 服 ---------- */
  function clothesOf(k) {
    var y = k.y, a = k.a, m = k.sex === 'm', s = k.seed;
    var o = { type: 'kimono', base: '#2e4a7a', sub: '#e8e0d0', obi: '#7a3a2a', legs: SKIN, feet: GETA };
    var young = a < 30;
    var kimonoM = ['#2e4a7a', '#5a4632', '#4a5a4a', '#3a3a4a'];
    var kimonoF = young ? ['#c0504d', '#b5486b', '#d07a3a', '#7a4a9a'] : ['#4a5a8a', '#6a4a6a', '#5a6a5a', '#7a5a3a'];
    if (k.abroad === 'ハワイ' || k.abroad === 'ブラジル') {
      o = { type: 'western', base: k.abroad === 'ハワイ' ? '#3a6aa0' : '#8a6a40', sub: '#e0d8c0', pants: '#5a4a3a', feet: SHOE, hat: 'straw' };
      if (!m) { o.skirt = '#6a5a4a'; }
      return o;
    }
    if (k.ainu && y < 1200) return { type: 'attush', base: '#7a5a3a', sub: '#4a3a2a', pattern: '#c8b090', legs: SKIN, feet: '#6a4a2a', desc: 'skin' };
    if (k.st === 'kuge' && a >= 13) return m ? { type: 'robe', base: pickC(['#2a3a6a', '#4a2a4a', '#2a4a4a'], s), sub: '#e8e0d0', feet: '#1a1a1a', desc: 'noushi' } :
      { type: 'kimono', long: true, base: pickC(['#a8344a', '#6a3a8a', '#3a6a5a'], s), sub: '#e8c060', obi: '#c87a3a', feet: SKIN, desc: 'uchiki' };
    if (k.ainu && y < 1930) return { type: 'attush', base: '#9a7a52', sub: '#24305a', pattern: '#e8e0d0', legs: SKIN, feet: '#6a4a2a' };
    if (k.ryukyu && y < 1930) return { type: 'ryukyu', base: m ? '#c8b070' : pickC(['#d8c070', '#7aa0c8', '#c88a70'], s), sub: '#3a4a7a', legs: SKIN, feet: SKIN_D, hat: m && k.job === 'farm' && a >= 16 ? 'kasa' : null };
    if (k.drafted) return { type: 'military', base: '#7a7040', sub: '#5a5430', legs: '#6a6438', feet: SHOE, hat: 'army' };
    // 学生
    if (k.student && a >= 6) {
      var lvl = a < 12 ? 'elem' : 'sec';
      if (lvl === 'sec' && y >= 1886 && ['寺子屋', '藩校', '村学校'].indexOf(k.student) < 0) {
        if (m) return { type: 'gakuran', base: '#1e2230', sub: '#d8b040', pants: '#1e2230', feet: SHOE, hat: 'gakubo' };
        if (y >= 1925) return { type: 'sailor', base: '#22305a', sub: '#ffffff', tie: '#c03030', skirt: '#22305a', legs: '#f4f4f4', feet: SHOE };
        return { type: 'hakama', base: pickC(kimonoF, s), sub: '#e8e0d0', hakama: '#7a2a3a', feet: SHOE };
      }
      if (lvl === 'elem' && y >= 1930) {
        if (m) return { type: 'western', base: y < 1960 ? '#4a4a5a' : pickC(['#c04040', '#3a70b0', '#e0a030', '#40904a'], s), sub: '#e8e8e8', pants: '#2a2a3a', shorts: true, legs: SKIN, feet: SHOE };
        return { type: 'western', base: y < 1960 ? '#8a5a6a' : pickC(['#e07090', '#f0c040', '#6aa0e0', '#e08040'], s), sub: '#ffffff', skirt: y < 1960 ? '#3a3a4a' : '#2a3a6a', legs: SKIN, feet: SHOE };
      }
    }
    // 戦争中の暮らし
    if (y >= 1941 && y <= 1946 && a >= 12) {
      if (m) return { type: 'western', base: '#7a6a48', sub: '#6a5a3a', pants: '#6a5a3a', feet: SHOE, hat: y <= 1945 && a < 50 ? 'senjin' : null };
      return { type: 'monpe', base: '#3a4a6a', sub: '#e0d8c8', pants: '#2a3450', dots: '#c8c8d8', feet: GETA };
    }
    // 仕事
    var farm = k.job === 'farm' || (k.st === 'hyakusho' && y < 1873 && a >= 10) || k.job === 'ainu';
    var fish = k.job === 'fish';
    if (y < 1873 && m && k.st === 'bushi' && a >= 15) return { type: 'hakama', base: pickC(['#2a3a5a', '#3a2a2a', '#2a3a2a'], s), sub: '#e8e0d0', hakama: pickC(['#5a5a6a', '#4a3a2a', '#6a6a5a'], s, 3), kami: y < 1868 && y >= 1600, sword: true, feet: '#d8d0c0', desc: y < 1600 ? 'hitatare' : null };
    if (k.st === 'priest' && a >= 15 && m) return { type: 'robe', base: '#1e1e22', sub: '#8a5a2a', feet: GETA };
    if (fish && a >= 12) return { type: 'noragi', base: '#2a4a7a', sub: '#e8e0d0', pants: '#2a3a5a', legs: SKIN, feet: SKIN_D, hat: y < 1960 ? 'hachimaki' : null };
    if (farm && a >= 12 && y < 1975) return { type: 'noragi', base: pickC(['#2e4a7a', '#4a4a3a', '#3a4a6a'], s), sub: '#e8e0d0', pants: m ? '#2a3450' : null, legs: SKIN, feet: '#a08050', hat: m ? 'kasa' : 'tenugui', apronless: true };
    // 洋服の時代
    var western = y >= 1955 || (y >= 1920 && (k.kind === 'city' || ['clerk', 'teacher', 'office', 'factory'].indexOf(k.job) >= 0) && (m || y >= 1935)) || (y >= 1946 && a < 40);
    if (k.job === 'silk' || k.job === 'maid') western = false;
    if (western) {
      if (m) {
        if (['clerk', 'teacher', 'office'].indexOf(k.job) >= 0 && a >= 18 && a < 65) return { type: 'suit', base: pickC(['#2a2e3a', '#3a3a3a', '#2a3a4a'], s), sub: '#f4f4f4', tie: pickC(['#a03030', '#30508a', '#6a4a2a'], s, 7), pants: '#2a2e3a', feet: SHOE };
        if (['factory', 'build'].indexOf(k.job) >= 0 && a >= 16 && a < 65) return { type: 'western', base: k.job === 'build' ? '#6a6a5a' : '#4a5a7a', sub: '#d8d8d8', pants: '#3a3a4a', feet: SHOE, hat: k.job === 'build' ? 'helmet' : null };
        return { type: 'western', base: y < 1970 ? pickC(['#d8d0c0', '#5a6a7a', '#7a6a5a'], s) : a >= 60 ? pickC(['#8a7a6a', '#6a7a8a', '#a09080'], s) : pickC(['#3a70b0', '#c04040', '#40904a', '#e0a030', '#5a5a5a'], s), sub: '#e8e8e8', pants: y < 1970 ? '#3a3a4a' : pickC(['#2a3a6a', '#4a4a4a', '#6a5a4a'], s, 5), feet: SHOE };
      }
      var dress = y < 1970 ? pickC(['#b85a5a', '#5a7ab0', '#8a7aa0', '#7a8a5a'], s) : a >= 60 ? pickC(['#8a6a8a', '#6a7a9a', '#9a8a6a'], s) : pickC(['#e07090', '#f0c040', '#6aa0e0', '#e08040', '#ffffff'], s);
      var o2 = { type: 'western', base: dress, sub: '#ffffff', skirt: y < 1975 || a >= 40 ? (y < 1970 ? '#3a3a4a' : '#4a4a6a') : pickC(['#2a3a6a', '#6a6a6a', '#c0a070'], s, 3), legs: y < 1960 ? SKIN : '#d8b090', feet: SHOE };
      if (k.married && y >= 1950 && y < 1990 && (k.job === 'home' || !k.job) && a >= 25 && a < 70) o2.apron = '#f4f4f0';
      if (y >= 1975 && a < 45 && s % 2) { o2.skirt = null; o2.pants = pickC(['#2a3a6a', '#4a4a4a'], s, 5); }
      return o2;
    }
    // 着物の時代
    if (m) {
      var oM = { type: 'kimono', base: k.st === 'chonin' || k.kind === 'city' || k.kind === 'town' ? pickC(['#5a4632', '#3a3a4a', '#4a5a6a'], s) : pickC(kimonoM, s), sub: '#e8e0d0', obi: '#3a2a1a', legs: SKIN, feet: GETA, stripes: k.st === 'chonin' };
      if (k.st === 'outcast' || k.st === 'buraku') oM.base = '#6a5a42';
      if (y >= 1890 && y < 1940 && a >= 25 && (k.kind === 'city' || k.kind === 'town')) oM.hat = 'boater';
      return oM;
    }
    var oF = { type: 'kimono', long: true, base: pickC(kimonoF, s), sub: '#f0e8d8', obi: young ? pickC(['#e0b040', '#2a3a6a', '#d06060'], s, 5) : '#3a2a2a', feet: GETA };
    if (k.st === 'outcast' || k.st === 'buraku') { oF.base = '#7a6a52'; oF.obi = '#4a3a2a'; }
    if (k.job === 'silk' && a < 30) oF.apron = '#f0f0e8';
    if (k.married && y >= 1900 && a >= 25) oF.apron = y < 1950 ? '#f4f4f0' : null;
    return oF;
  }

  function drawBody(r, g, c, k) {
    var bt = g.bt, bh = g.bh, lt = g.lt, end = H - 2;
    var x0 = 7, bw = 10;
    if (c.type === 'robe') {
      r(6, bt, 12, end - bt, c.base); r(10, bt, 4, 1, '#e8e0d0'); r(11, bt + 1, 2, 1, '#e8e0d0');
      for (var i = 0; i < 6; i++) r(8 + i, bt + 2 + i, 2, 1, c.sub);
      r(9, end, 2, 1, c.feet); r(13, end, 2, 1, c.feet); return;
    }
    // 腕と胴
    var sleeve = c.type === 'kimono' || c.type === 'hakama' || c.type === 'attush' || c.type === 'ryukyu' || c.type === 'monpe' || c.type === 'noragi';
    r(x0, bt, bw, bh, c.base);
    r(x0 - 2, bt + 1, 2, sleeve ? bh - 2 : bh - 3, c.base);
    r(x0 + bw, bt + 1, 2, sleeve ? bh - 2 : bh - 3, c.base);
    // 手
    r(x0 - 2, bt + (sleeve ? bh - 1 : bh - 2), 2, 1, SKIN); r(x0 + bw, bt + (sleeve ? bh - 1 : bh - 2), 2, 1, SKIN);
    // 襟
    if (sleeve) { r(10, bt, 1, 1, c.sub); r(13, bt, 1, 1, c.sub); r(11, bt + 1, 1, 1, c.sub); r(12, bt + 1, 1, 1, c.sub); r(11, bt, 2, 1, SKIN); }
    if (c.type === 'suit') { r(11, bt, 2, 3, c.sub); r(11, bt + 1, 2, 3, c.tie); r(11, bt + 1, 2, 1, c.sub); r(10, bt, 1, 2, c.base); }
    if (c.type === 'gakuran') { r(10, bt, 4, 1, c.base); r(11, bt + 2, 1, 1, c.sub); r(11, bt + 4, 1, 1, c.sub); r(11, bt + 6, 1, 1, c.sub); }
    if (c.type === 'sailor') { r(8, bt, 8, 2, c.sub); r(9, bt, 6, 1, c.base); r(11, bt + 1, 2, 2, c.tie); r(7, bt + 2, 10, 1, c.sub); }
    if (c.type === 'western' || c.type === 'military') { r(11, bt, 2, 2, c.sub); }
    if (c.type === 'military') { r(x0, bt + bh - 3, bw, 1, '#4a4024'); r(11, bt + 2, 1, 1, '#c8b040'); }
    if (c.stripes) for (var sx = x0; sx < x0 + bw; sx += 2) r(sx, bt + 2, 1, bh - 2, 'rgba(255,255,255,0.15)');
    // 帯
    if (c.type === 'kimono' || c.type === 'hakama' || c.type === 'ryukyu' || c.type === 'attush') r(x0, bt + Math.floor(bh / 2), bw, c.long ? 2 : 1, c.obi || c.sub);
    if (c.apron) r(x0 + 1, bt + 2, bw - 2, bh - 1, c.apron);
    // 裃
    if (c.kami) { r(5, bt, 14, 2, c.hakama); r(11, bt, 2, 2, c.sub); }
    // アイヌの文様
    if (c.type === 'attush') {
      r(x0, bt + bh - 2, bw, 2, c.sub);
      for (var px = x0; px < x0 + bw; px += 2) r(px, bt + bh - 2, 1, 1, c.pattern);
      r(x0 - 2, bt + bh - 3, 2, 1, c.sub); r(x0 + bw, bt + bh - 3, 2, 1, c.sub); r(11, bt + 1, 2, 3, c.sub);
    }
    if (c.type === 'monpe') for (var mx = x0 + 1; mx < x0 + bw; mx += 3) r(mx, bt + 3, 1, 1, c.dots);
    // 下半身
    var legTop = bt + bh;
    if (c.long || c.type === 'robe') { r(x0, legTop, bw, end - legTop, c.base); r(x0 + 4, legTop, 1, end - legTop, 'rgba(0,0,0,0.15)'); r(9, end, 2, 1, c.feet); r(13, end, 2, 1, c.feet); return; }
    if (c.type === 'hakama') { r(x0 - 1, legTop - 1, bw + 2, end - legTop + 1, c.hakama); r(10, legTop + 1, 1, end - legTop - 1, 'rgba(0,0,0,0.2)'); r(13, legTop + 1, 1, end - legTop - 1, 'rgba(0,0,0,0.2)'); r(9, end, 2, 1, c.feet); r(13, end, 2, 1, c.feet); return; }
    if (c.type === 'kimono' || c.type === 'ryukyu' || c.type === 'attush') {
      var knee = legTop + Math.max(2, Math.floor((end - legTop) * 0.5));
      r(x0, legTop, bw, knee - legTop, c.base);
      r(9, knee, 2, end - knee, c.legs || SKIN); r(13, knee, 2, end - knee, c.legs || SKIN);
      r(9, end, 2, 1, c.feet); r(13, end, 2, 1, c.feet); return;
    }
    if (c.skirt) {
      var sk = legTop + Math.max(2, Math.floor((end - legTop) * 0.55));
      r(x0, legTop, bw, sk - legTop, c.skirt);
      r(9, sk, 2, end - sk, c.legs || SKIN); r(13, sk, 2, end - sk, c.legs || SKIN);
      r(9, end, 2, 1, c.feet); r(13, end, 2, 1, c.feet); return;
    }
    var pants = c.pants || c.base;
    if (c.shorts) { var sh = legTop + 2; r(8, legTop, 8, 2, pants); r(9, sh, 2, end - sh, SKIN); r(13, sh, 2, end - sh, SKIN); }
    else { r(8, legTop, 3, end - legTop, pants); r(13, legTop, 3, end - legTop, pants); r(11, legTop, 2, 1, pants); }
    if (c.type === 'military') for (var yy = legTop + 3; yy < end; yy += 2) { r(8, yy, 3, 1, '#5a5430'); r(13, yy, 3, 1, '#5a5430'); }
    if (c.type === 'noragi' && c.pants === null) { r(8, legTop, 8, Math.floor((end - legTop) / 2), c.base); }
    r(8, end, 3, 1, c.feet); r(13, end, 3, 1, c.feet);
  }

  function drawHat(r, g, hat) {
    var t = g.ht;
    if (hat === 'kasa') { r(5, t, 14, 1, '#c8a860'); r(7, t - 1, 10, 1, '#c8a860'); r(9, t - 2, 6, 1, '#b89850'); r(11, t - 3, 2, 1, '#b89850'); }
    else if (hat === 'straw') { r(5, t + 1, 14, 1, '#d8c070'); r(8, t - 1, 8, 2, '#d8c070'); r(8, t, 8, 1, '#8a3a2a'); }
    else if (hat === 'tenugui') { r(7, t, 10, 2, '#e8e8f0'); r(7, t + 2, 1, 2, '#e8e8f0'); r(16, t + 2, 1, 2, '#e8e8f0'); r(9, t, 1, 1, '#4a6aa0'); r(13, t + 1, 1, 1, '#4a6aa0'); }
    else if (hat === 'hachimaki') { r(7, t + 2, 10, 1, '#f0f0f0'); r(17, t + 2, 2, 2, '#f0f0f0'); }
    else if (hat === 'army') { r(8, t - 1, 8, 3, '#6a6438'); r(7, t + 2, 3, 1, '#5a5430'); r(11, t, 1, 1, '#d8c040'); }
    else if (hat === 'senjin') { r(8, t - 1, 8, 3, '#6a5a3a'); r(7, t + 2, 10, 1, '#5a4a2a'); }
    else if (hat === 'gakubo') { r(8, t - 1, 8, 3, '#1e2230'); r(7, t + 2, 4, 1, '#0e1018'); r(11, t, 2, 1, '#d8b040'); }
    else if (hat === 'boater') { r(6, t + 1, 12, 1, '#d8c890'); r(8, t - 1, 8, 2, '#d8c890'); r(8, t, 8, 1, '#2a2a3a'); }
    else if (hat === 'helmet') { r(7, t - 1, 10, 3, '#e8d040'); r(6, t + 2, 12, 1, '#c8b030'); }
  }

  /* ---------- 画面を音声で伝えるときの説明 ---------- */
  var DESC = {
    chonmage: 'ちょんまげを結い', nihongami: '日本髪を結い', sokuhatsu: '束髪に結い', kanpu: '髪を頭の上でまとめてかんざしを挿し', katakashira: '髪を頭の上で結い',
    eboshi: '烏帽子をかぶり', bouzu: '坊主頭で', bald: '頭がはげ上がり', okappa: 'おかっぱ頭で', perm: 'パーマをかけ', long: '長い髪で', bob: '短めの髪で', ainuM: '長い髪とひげをたくわえ', ainuF: '長い髪に鉢巻きをし', longish: '髪を長めに伸ばし', short: '短い髪で', chigo: '髪を結い上げ', bun: '髪を後ろでまとめ', 'kids-tuft': '頭のてっぺんに髪を少し残し', shaved: '頭をそり上げ'
  };
  var CDESC = { kimono: '着物を着た', hakama: '袴をはいた', noragi: '野良着の', western: '洋服の', suit: '背広の', gakuran: '学生服の', sailor: 'セーラー服の', military: '軍服の', monpe: 'もんぺをはいた', attush: 'アイヌの着物（アットゥシ）を着た', ryukyu: '琉球の着物を着た', robe: '僧衣の', noushi: '直衣（貴族のふだん着）を着た', uchiki: '何枚も重ねた着物（袿）を着た', skin: '毛皮や木の皮の衣を着た', hitatare: '直垂に袴をはいた' };
  function describe(k, c, h) {
    var who = k.a <= 1 ? '赤ちゃん' : k.a <= 11 ? (k.sex === 'm' ? '男の子' : '女の子') : k.a <= 17 ? (k.sex === 'm' ? '少年' : '少女') : k.a >= 65 ? (k.sex === 'm' ? 'おじいさん' : 'おばあさん') : (k.sex === 'm' ? '男の人' : '女の人');
    if (!c) return '布にくるまれた' + who;
    return (h && DESC[h.style] ? DESC[h.style] + '、' : '') + (CDESC[c.desc || c.type] || '') + who;
  }

  root.IchiokuAvatar = { draw: draw, lookOf: lookOf };
})(typeof self !== 'undefined' ? self : this);
