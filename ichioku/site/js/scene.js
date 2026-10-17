/* 1000分の1 その年の情景（改善の指示書 第2弾の6）
   生まれた時代・身分・土地の種類から家の形を選び、同じ家に暮らす家族をドット絵で並べる。
   その年の出来事から天気と景色を変える（凶作は日照り、洪水は雨、雪の多い土地の冬は雪、戦や災害は煙）。
   家を離れている年（旅・奉公・出家・兵役）は、その場所の景色にする。
   乱数は使わず、人生の番号と年から決める。描く前の「plan」は検査からも呼べる（家族の人数と描く人数を確かめる）。 */
(function (root) {
  'use strict';
  var SW = 192, SH = 72, GROUND = 62;
  var SNOWY = ['01', '02', '03', '05', '06', '07', '15', '16', '17', '18', '20', '21'];
  var KINKI = ['24', '25', '26', '27', '28', '29', '30'];

  function hash(a, b) { var h = (a * 2654435761 ^ b * 40503) >>> 0; h ^= h >>> 13; h = Math.imul(h, 1274126177) >>> 0; return (h ^ h >>> 16) >>> 0; }

  /* ---------- 同じ家に暮らす人 ---------- */
  // 子どものうちは親ときょうだい（と同居の祖父母）、結婚してからは配偶者と18歳未満の子。
  // 江戸までと戦前の家を継いだ人（跡取り・婿）は、結婚してからも親と暮らす。家を離れている年はひとり
  function household(L) {
    var y = L.year;
    if (L.mode || L.hoko || L.school === '寄宿') return [];
    var away = L.old ? (L.moved && !L.married) : !!(L.place && L.place.away);
    var ms = (L.members || []).filter(function (m) { return m.alive && !m.gone && m.by <= y && !m.before; });
    if (L.married) {
      var stem = L.old && y < 1948 && !L.moved && (L.heir || L.muko || (L.sex === 'm' && !L.bunke));
      return ms.filter(function (m) {
        if (m.role === '配偶者' || m.role === 'パートナー') return true;
        if (m.role === '子') return y - m.by < 18;
        if (stem && (m.role === '父' || m.role === '母')) return true;
        return false;
      });
    }
    if (away) return [];
    var limit = L.old && y < 1948 ? 99 : 22;
    if (L.age >= limit) return [];
    return ms.filter(function (m) {
      if (m.role === '父' || m.role === '母') return true;
      if (m.sib) return y - m.by < 22;
      return !!m.live;
    });
  }

  /* ---------- 家の形 ---------- */
  var HOUSE_NAME = {
    pit: '竪穴の家', post: '掘立柱の家', thatch: '茅葺きの家', gassho: '合掌造りの家', machiya: '町家', nagaya: '長屋', buke: '武家屋敷',
    shinden: '寝殿造りの屋敷', temple: '寺', redtile: '赤瓦の家', chise: 'チセ（アイヌの家）', yokan: '洋館', wood2: '木造の家', danchi: '団地',
    mansion: 'マンション', kodate: '一戸建て', farm: '瓦屋根の農家', camp: '兵営', road: '街道', shop: '奉公先の店'
  };
  function houseOf(L) {
    var y = L.year, st = L.old ? L.status : 'heimin', kind = kindOf(L), pref = prefOf(L), rich = typeof L.incPct === 'number' ? L.incPct : 0.5;
    if (L.mode === 'tabi') return 'road';
    if (L.mode === 'hoko' || L.hoko) return 'shop';
    if (L.mode === 'shukke') return 'temple';
    if (L.mode === 'hei') return 'camp';
    if (st === 'ainu' || L.ainu) return y < 1900 ? 'chise' : 'wood2';
    if (st === 'satsumon') return 'pit';
    if (pref === '47') { if (st === 'ryukyuShi' || y >= 1880) return y >= 1960 ? 'kodate' : 'redtile'; return 'thatch'; }
    if (st === 'kuge' && y < 1870) return 'shinden';
    if (st === 'priest') return 'temple';
    if ((st === 'bushi' && y < 1872) || (st === 'shizoku' && y < 1900)) return 'buke';
    if (y < 1150 && (kind === 'village' || kind === 'fish') && KINKI.indexOf(pref) < 0) return 'pit';
    if (y < 1300 && (kind === 'village' || kind === 'fish')) return 'post';
    if (y < 1868) {
      if (kind === 'town' || kind === 'city') return rich < 0.3 ? 'nagaya' : 'machiya';
      if ((pref === '21' || pref === '16') && y >= 1700 && kind === 'village') return 'gassho';
      return 'thatch';
    }
    if (y < 1946) {
      if (kind === 'city') return rich > 0.88 && y >= 1890 ? 'yokan' : rich < 0.3 ? 'nagaya' : 'wood2';
      if (kind === 'town') return rich < 0.25 ? 'nagaya' : 'wood2';
      if ((pref === '21' || pref === '16') && kind === 'village') return 'gassho';
      return 'thatch';
    }
    if (kind === 'city') return y < 1958 ? 'wood2' : y < 1990 ? (rich < 0.7 ? 'danchi' : 'kodate') : (rich < 0.75 ? 'mansion' : 'kodate');
    if (kind === 'town') return y < 1960 ? 'wood2' : y >= 1990 && rich < 0.5 ? 'mansion' : 'kodate';
    return y < 1965 ? 'thatch' : 'farm';
  }
  function kindOf(L) {
    if (L.old) return L.kind || 'village';
    return ({ '大都市': 'city', '都市': 'town', '町村': 'village' })[(L.place || {}).kind] || 'town';
  }
  function prefOf(L) { return String(L.old ? L.pref : (L.place || {}).pref || ''); }

  /* ---------- 天気と季節 ---------- */
  function weatherOf(L, rec) {
    var t = ((rec && rec.events) || []).map(function (e) { return e.t || ''; }).join(' ') + ' ' + ((rec && rec.world && rec.world.items) || []).map(function (i) { return i.t || ''; }).join(' ');
    if (/空襲|焼け野原|焼夷弾|大火|火事|焼け出され|原爆/.test(t)) return 'fire';
    if (/合戦|戦に|戦場|落城|一揆|打ちこわし|出征|戦死|兵に/.test(t)) return 'smoke';
    if (/洪水|大水|水害|大雨|台風|津波|堤が切れ/.test(t)) return 'rain';
    if (/凶作|飢饉|日照り|干ばつ|不作/.test(t)) return 'dry';
    var pref = prefOf(L), h = hash(L.seed >>> 0, L.year);
    if (/大雪|雪が/.test(t) || (SNOWY.indexOf(pref) >= 0 && h % 4 === 0)) return 'snow';
    return ['spring', 'summer', 'autumn', 'summer'][h % 4];
  }

  /* ---------- 描く前の計画（検査からも使う） ---------- */
  function memberLook(L, m) {
    var v = Object.create(L);
    v.year = L.year; v.age = Math.max(0, L.year - m.by); v.sex = m.sex; v.seed = (hash(L.seed >>> 0, m.id + 1) >>> 0); v.alive = true;
    v.married = v.age >= 20 && (m.role === '父' || m.role === '母' || m.role === '配偶者' || m.role === 'パートナー');
    v.school = null; v.drafted = false; v.demob = false; v.abroad = null; v.hoko = null; v.mode = null;
    if (!L.old) { v.stage = v.age < 6 ? 'pre' : v.age <= 15 ? 'school' : 'work'; v.job = v.age >= 18 && (m.role === '父' || m.role === '配偶者' || m.role === 'パートナー') ? { ind: 'office' } : null; v.place = L.place; }
    else v.job = v.age >= 15 ? (L.parentJob || L.job || null) : null;
    return v;
  }
  function plan(L, rec) {
    var hh = household(L);
    var people = [L].concat(hh);
    var order = people.slice().sort(function (a, b) {
      var ra = rankOf(L, a), rb = rankOf(L, b);
      return ra - rb;
    });
    return { house: houseOf(L), weather: weatherOf(L, rec), kind: kindOf(L), year: L.year, people: order, count: people.length, members: hh };
  }
  function rankOf(L, m) {
    if (m === L) return 3;
    var r = { 父: 1, 母: 2, 配偶者: 4, パートナー: 4 }[m.role];
    if (r) return r;
    if (m.role === '子') return 10 + (L.year - m.by < 0 ? 0 : 100 - (L.year - m.by));
    if (m.sib) return 5 + (m.by - L.by) / 100;
    return 0;
  }
  // 情景の下に出す1行（「大和国 明日香村のあたり・茅葺きの家・両親と弟と」）
  function caption(L, p) {
    var who = p.members, parts = [];
    var fa = who.some(function (m) { return m.role === '父'; }), mo = who.some(function (m) { return m.role === '母'; });
    if (fa && mo) parts.push('両親'); else if (fa) parts.push('父'); else if (mo) parts.push('母');
    var sp = who.filter(function (m) { return m.role === '配偶者' || m.role === 'パートナー'; })[0];
    if (sp) parts.push(sp.role === 'パートナー' ? 'パートナー' : sp.sex === 'm' ? '夫' : '妻');
    var sibs = who.filter(function (m) { return m.sib; }).length;
    if (sibs) parts.push(sibs === 1 ? 'きょうだい' : 'きょうだい' + sibs + '人');
    var kids = who.filter(function (m) { return m.role === '子'; }).length;
    if (kids) parts.push(kids === 1 ? '子ども' : '子ども' + kids + '人');
    var gp = who.filter(function (m) { return m.live && !m.sib && m.role !== '父' && m.role !== '母'; }).length;
    if (gp) parts.push(gp === 1 ? '祖父母' : '祖父母' + gp + '人');
    var withs = parts.length ? parts.join('と') + 'と暮らす' : (L.mode === 'tabi' ? '旅の途中' : L.mode === 'hei' ? '兵営で暮らす' : L.mode === 'shukke' ? '寺で修行の日々' : 'ひとりで暮らす');
    return HOUSE_NAME[p.house] + '・' + withs;
  }

  /* ---------- 描く ---------- */
  var PAL = {
    sky: { spring: '#bfe0ef', summer: '#9fd3ec', autumn: '#c9dfe6', snow: '#d9e2e8', rain: '#8d9ba3', dry: '#e8d9a8', smoke: '#a99f95', fire: '#c98a6a' },
    ground: { spring: '#7fb069', summer: '#5f9e4f', autumn: '#b79a52', snow: '#f2f5f7', rain: '#5d7d55', dry: '#c7ad6e', smoke: '#7d7a5c', fire: '#6d5a48' }
  };
  function draw(canvas, L, rec) {
    var p = plan(L, rec), w = p.weather;
    var css = canvas.clientWidth || 358, dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    var N = Math.max(1, Math.round(css * dpr / SW));
    canvas.width = SW * N; canvas.height = SH * N;
    var ctx = canvas.getContext('2d');
    function r(x, y, ww, hh, c) { if (!c || ww <= 0 || hh <= 0) return; ctx.fillStyle = c; ctx.fillRect(Math.round(x) * N, Math.round(y) * N, Math.round(ww) * N, Math.round(hh) * N); }
    var seed = hash(L.seed >>> 0, 7);
    // 空
    r(0, 0, SW, GROUND, PAL.sky[w] || PAL.sky.summer);
    if (w === 'fire') { r(0, 30, SW, GROUND - 30, '#d9a07a'); r(0, 44, SW, GROUND - 44, '#e3b48a'); }
    if (w === 'dry') r(150, 6, 10, 10, '#f6e7a0');
    if (w === 'spring' || w === 'summer' || w === 'autumn') { cloud(r, 20 + seed % 40, 8); cloud(r, 110 + seed % 50, 14); }
    if (w === 'rain' || w === 'smoke' || w === 'snow') { cloud(r, 10, 6, '#c3cbd0'); cloud(r, 70, 4, '#c3cbd0'); cloud(r, 140, 8, '#c3cbd0'); }
    // 遠くの景色
    backdrop(r, p, L, w, seed);
    // 地面
    r(0, GROUND, SW, SH - GROUND, PAL.ground[w] || PAL.ground.summer);
    if (p.house === 'road') { r(0, GROUND + 2, SW, 5, '#c8b48a'); }
    else if (p.year >= 1930 && (p.kind === 'city' || p.kind === 'town')) { r(0, GROUND + 3, SW, 7, '#6f7478'); for (var dx = 4; dx < SW; dx += 14) r(dx, GROUND + 6, 6, 1, '#e6e6e6'); }
    // 家
    house(r, p.house, 6, L, w);
    // 人
    var startX = p.house === 'road' || p.house === 'camp' ? 40 : 66, room = SW - startX - 4, n = p.people.length;
    var step = Math.min(18, Math.floor((room - 24) / Math.max(1, n - 1)));
    var A = root.IchiokuAvatar;
    p.people.forEach(function (m, i) {
      if (!A || !A.sprite) return;
      var v = m === L ? L : memberLook(L, m);
      var sp = A.sprite(v);
      var x0 = startX + i * step, y0 = GROUND + 4 - sp.h;
      for (var k = 0; k < sp.px.length; k++) if (sp.px[k]) r(x0 + k % sp.w, y0 + Math.floor(k / sp.w), 1, 1, sp.px[k]);
    });
    // 天気の重ね
    if (w === 'rain') for (var i2 = 0; i2 < 70; i2++) { var hx = hash(seed, i2); r(hx % SW, (hx >>> 8) % SH, 1, 3, '#dfe8ee'); }
    if (w === 'snow') for (var i3 = 0; i3 < 60; i3++) { var hs = hash(seed, i3 + 99); r(hs % SW, (hs >>> 8) % GROUND, 1, 1, '#ffffff'); }
    if (w === 'smoke' || w === 'fire') for (var i4 = 0; i4 < 5; i4++) { var hm = hash(seed, i4 + 7); var sx = 20 + hm % 150; r(sx, 10, 6, 18, '#6e6660'); r(sx + 2, 4, 6, 8, '#857c75'); if (w === 'fire') r(sx - 1, 28, 8, 6, '#e0602c'); }
    if (w === 'dry') for (var i5 = 0; i5 < 12; i5++) { var hd = hash(seed, i5 + 50); r(hd % SW, GROUND + 2 + (hd >>> 8) % 8, 4, 1, '#9c8452'); }
    return { count: p.count, house: p.house, weather: w, caption: caption(L, p) };
  }
  function cloud(r, x, y, c) { c = c || '#ffffff'; r(x, y + 2, 18, 4, c); r(x + 4, y, 10, 3, c); }
  function backdrop(r, p, L, w, seed) {
    var k = p.kind, y = p.year, pref = prefOf(L);
    var mtn = w === 'snow' ? '#e6ecef' : w === 'autumn' ? '#a8865a' : '#7d9c88', mtn2 = w === 'snow' ? '#cfd8dd' : '#9cb5a5';
    if (p.house === 'camp') { r(0, 50, SW, 12, '#8c8466'); for (var t = 0; t < 4; t++) { r(110 + t * 20, 48, 14, 14, '#6b6a50'); r(114 + t * 20, 44, 6, 4, '#6b6a50'); } return; }
    if (p.house === 'road') { hills(r, mtn, mtn2); for (var pt = 0; pt < 6; pt++) pine(r, 8 + pt * 34, 40); return; }
    if (k === 'fish' || pref === '47' && k !== 'city') {
      r(0, 46, SW, 16, w === 'rain' ? '#5f7c8c' : '#4f8fb3'); r(0, 46, SW, 1, '#d7eef7');
      r(150, 42, 16, 3, '#6b4a2b'); r(157, 34, 1, 8, '#4a3424'); r(158, 34, 6, 6, '#efe9d8');
      return;
    }
    if (k === 'kotan' || p.house === 'chise') { for (var tr = 0; tr < 9; tr++) pine(r, 70 + tr * 14, 38, '#3f6b4a'); return; }
    if (k === 'village') {
      hills(r, mtn, mtn2);
      var paddy = w === 'dry' ? '#b8a46a' : w === 'snow' ? '#eef2f4' : w === 'autumn' ? '#d9b44a' : w === 'spring' ? '#9cc7d6' : '#6fae5a';
      r(0, 54, SW, 8, paddy); for (var px2 = 0; px2 < SW; px2 += 24) r(px2, 54, 1, 8, '#7c6a48');
      if (w === 'spring') { r(170, 36, 14, 10, '#f1c4d0'); r(176, 46, 2, 8, '#6b4a2b'); }
      return;
    }
    // 町と都会
    if (y < 1868) { for (var i = 0; i < 7; i++) { var bx = 60 + i * 20; r(bx, 40, 18, 22, '#8a7a66'); r(bx - 1, 38, 20, 3, '#4c4a48'); } if (k === 'city') { r(150, 20, 22, 6, '#4c4a48'); r(154, 26, 14, 10, '#efece4'); r(146, 36, 30, 4, '#4c4a48'); r(152, 40, 18, 10, '#efece4'); } return; }
    if (y < 1955) { for (var j = 0; j < 7; j++) { var b2 = 60 + j * 20; r(b2, 36 - (j % 2) * 4, 18, 26 + (j % 2) * 4, j % 3 ? '#9a8c78' : '#b0a28c'); } if (y >= 1890) { r(100, 20, 1, 42, '#4a3a2a'); r(96, 22, 9, 1, '#4a3a2a'); r(0, 24, SW, 1, '#555555'); } return; }
    for (var q = 0; q < 8; q++) { var hgt = k === 'city' ? 22 + hash(seed, q) % 30 : 12 + hash(seed, q) % 14; r(58 + q * 17, GROUND - hgt, 15, hgt, q % 2 ? '#a9b8c2' : '#b9c6ce'); for (var wy = GROUND - hgt + 3; wy < GROUND - 3; wy += 5) r(61 + q * 17, wy, 9, 2, '#e3ebf0'); }
    r(0, 24, SW, 1, '#5a5a5a'); r(120, 18, 1, 44, '#7a7a7a');
  }
  function hills(r, c1, c2) { for (var x = 0; x < SW; x += 2) { var h1 = 14 + Math.round(8 * Math.sin(x / 23)), h2 = 8 + Math.round(6 * Math.sin(x / 13 + 2)); r(x, 54 - h1, 2, h1, c2); r(x, 54 - h2, 2, h2, c1); } }
  function pine(r, x, y, c) { c = c || '#3f6b4a'; r(x + 3, y + 10, 2, 12, '#5a3e28'); r(x, y + 6, 8, 5, c); r(x + 1, y + 2, 6, 5, c); r(x + 2, y, 4, 3, c); }
  // 家の形（左端に描く）
  function house(r, t, x, L, w) {
    var g = GROUND, snow = w === 'snow';
    var thatchC = '#a8894f', thatchD = '#7d6436', wall = '#d9cbb0', wood = '#6b4a2b', tile = '#4c4f55', white = '#efece4';
    function snowCap(x0, y0, ww) { if (snow) r(x0, y0, ww, 2, '#ffffff'); }
    switch (t) {
      case 'pit': r(x + 4, g - 14, 44, 14, thatchC); r(x + 10, g - 22, 32, 8, thatchC); r(x + 18, g - 27, 16, 5, thatchD); r(x + 22, g - 8, 8, 8, '#3a2a1a'); snowCap(x + 10, g - 22, 32); break;
      case 'post': r(x + 6, g - 14, 40, 14, wood); r(x + 8, g - 12, 36, 10, wall); r(x + 2, g - 24, 48, 10, thatchC); r(x + 8, g - 30, 36, 6, thatchD); r(x + 22, g - 10, 8, 10, '#3a2a1a'); snowCap(x + 2, g - 24, 48); break;
      case 'thatch': r(x + 4, g - 16, 46, 16, wall); r(x, g - 30, 54, 14, thatchC); r(x + 8, g - 38, 38, 8, thatchC); r(x + 16, g - 41, 22, 3, thatchD); r(x + 10, g - 12, 10, 12, wood); r(x + 30, g - 12, 12, 6, '#8a6a44'); snowCap(x + 8, g - 38, 38); break;
      case 'gassho': r(x + 6, g - 14, 42, 14, wall); for (var i = 0; i < 18; i++) r(x + 27 - i * 1.4, g - 14 - (18 - i) * 2, 2.8 * i + 2, 2, thatchC); r(x + 22, g - 30, 10, 6, '#5a4630'); r(x + 12, g - 12, 8, 12, wood); snowCap(x + 14, g - 44, 26); break;
      case 'machiya': case 'shop': r(x + 2, g - 26, 50, 26, '#8b6a46'); r(x, g - 30, 54, 5, tile); r(x + 4, g - 22, 46, 8, '#5d4630'); for (var k2 = 0; k2 < 10; k2++) r(x + 5 + k2 * 4.6, g - 22, 1, 8, '#a98a62'); r(x + 4, g - 12, 46, 12, '#3a2c20'); if (t === 'shop') { r(x + 10, g - 12, 34, 7, '#24406b'); r(x + 26, g - 12, 1, 7, '#e8e4da'); } snowCap(x, g - 30, 54); break;
      case 'nagaya': r(x, g - 20, 56, 20, '#a08766'); r(x - 2, g - 23, 60, 4, tile); for (var d = 0; d < 4; d++) { r(x + 3 + d * 14, g - 14, 8, 14, '#5d4630'); r(x + 3 + d * 14, g - 18, 8, 2, '#d9cbb0'); } snowCap(x - 2, g - 23, 60); break;
      case 'buke': r(x, g - 18, 58, 18, white); r(x - 2, g - 21, 62, 4, tile); r(x + 18, g - 26, 22, 26, '#6b4a2b'); r(x + 15, g - 30, 28, 5, tile); r(x + 22, g - 18, 14, 18, '#3a2a1a'); r(x, g - 4, 58, 4, '#8a8a8a'); snowCap(x + 15, g - 30, 28); break;
      case 'shinden': r(x, g - 16, 58, 16, '#c9a77a'); r(x - 3, g - 26, 64, 10, '#7a5a3a'); r(x + 4, g - 31, 50, 5, '#5c4128'); for (var c = 0; c < 6; c++) r(x + 4 + c * 10, g - 16, 2, 16, '#a3312b'); r(x, g - 3, 58, 3, '#d8d2c2'); break;
      case 'temple': r(x + 4, g - 18, 50, 18, '#c9a77a'); for (var c2 = 0; c2 < 5; c2++) r(x + 8 + c2 * 10, g - 18, 2, 18, '#7a2a20'); r(x - 4, g - 26, 66, 8, tile); r(x + 2, g - 34, 54, 8, tile); r(x + 10, g - 37, 38, 3, '#3a3d42'); snowCap(x + 2, g - 34, 54); break;
      case 'redtile': r(x + 4, g - 16, 48, 16, '#d9c9a8'); r(x, g - 28, 56, 12, '#c4543a'); r(x + 6, g - 32, 44, 4, '#a8402c'); r(x + 26, g - 34, 4, 3, '#e8e2d0'); r(x + 10, g - 12, 12, 12, wood); r(x, g - 6, 6, 6, '#8a8a7a'); break;
      case 'chise': r(x + 6, g - 16, 42, 16, '#b49a62'); r(x + 2, g - 28, 50, 12, '#9c8450'); r(x + 10, g - 33, 34, 5, '#87703f'); r(x + 10, g - 12, 8, 12, '#4a3a24'); snowCap(x + 2, g - 28, 50); break;
      case 'yokan': r(x + 2, g - 34, 50, 34, '#efe6d2'); r(x, g - 38, 54, 5, '#5a6a7a'); for (var wn = 0; wn < 3; wn++) { r(x + 8 + wn * 15, g - 30, 8, 10, '#6a8aa8'); r(x + 8 + wn * 15, g - 16, 8, 10, '#6a8aa8'); } r(x + 22, g - 10, 10, 10, wood); snowCap(x, g - 38, 54); break;
      case 'wood2': r(x + 2, g - 34, 48, 34, '#8f7656'); r(x, g - 37, 52, 4, tile); r(x - 1, g - 19, 54, 3, tile); r(x + 8, g - 31, 12, 8, '#d9cbb0'); r(x + 28, g - 31, 12, 8, '#d9cbb0'); r(x + 8, g - 14, 30, 14, '#5d4630'); snowCap(x, g - 37, 52); break;
      case 'danchi': r(x, g - 46, 56, 46, '#dfe2df'); for (var fl = 0; fl < 5; fl++) for (var u = 0; u < 4; u++) r(x + 4 + u * 13, g - 42 + fl * 8, 9, 5, '#8fa8b8'); r(x, g - 46, 56, 2, '#a9aeb0'); break;
      case 'mansion': r(x, g - 58, 54, 58, '#e9ebe8'); for (var fl2 = 0; fl2 < 7; fl2++) for (var u2 = 0; u2 < 3; u2++) r(x + 5 + u2 * 16, g - 54 + fl2 * 8, 12, 5, '#7fa3bd'); r(x + 20, g - 8, 14, 8, '#5a6a72'); break;
      case 'kodate': r(x + 4, g - 26, 46, 26, '#f1ece2'); r(x, g - 34, 54, 9, '#5b5e66'); r(x + 10, g - 22, 12, 9, '#7fa3bd'); r(x + 30, g - 22, 12, 9, '#7fa3bd'); r(x + 22, g - 12, 10, 12, '#8a6a4a'); snowCap(x, g - 34, 54); break;
      case 'farm': r(x + 2, g - 22, 52, 22, '#e8dfcc'); r(x - 2, g - 30, 60, 9, tile); r(x + 6, g - 34, 46, 4, '#3e4147'); r(x + 10, g - 16, 14, 16, '#8a6a4a'); r(x + 32, g - 18, 14, 8, '#7fa3bd'); snowCap(x - 2, g - 30, 60); break;
      case 'camp': r(x, g - 14, 30, 14, '#6b6a50'); r(x + 4, g - 20, 22, 6, '#6b6a50'); r(x + 14, g - 30, 1, 16, '#4a4a3a'); r(x + 15, g - 30, 8, 5, '#e8e4da'); break;
      case 'road': pine(r, x + 6, g - 26); r(x + 24, g - 20, 2, 20, '#5a3e28'); r(x + 20, g - 22, 10, 3, '#5a3e28'); break;
    }
  }

  var API = { draw: draw, plan: plan, household: household, houseOf: houseOf, weatherOf: weatherOf, caption: function (L, rec) { return caption(L, plan(L, rec)); }, HOUSE_NAME: HOUSE_NAME };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.IchiokuScene = API;
})(typeof self !== 'undefined' ? self : this);
