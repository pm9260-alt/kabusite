/* 1000分の1 この人生の手ざわり（v18 指示書 11-8）。最期の画面に出す、一生の4組の傾きと16の型。
   4組（日本版で独自に作った言葉）：
     家・外      … 家の中の出来事が多かったか、仕事や村・町の外の出来事が多かったか（記録の区分の数と、家を離れていた年）
     土・旅      … 一つの土地で暮らしたか、移り住み・旅が多かったか（住んだ所の数と、旅・参詣・上京などの出来事）
     穏やか・波乱 … 暮らしの満足の上下の幅と、大きな決断・災いの多さ
     今・先      … その時を楽しむほうへ選んだか、学びや蓄えなど先のほうへ選んだか（選んだ答えの言葉・学び・蓄え）
   v は −1（左のことば）〜 +1（右のことば）。0 より上なら右、0 以下なら左の型。
   使い方：IchiokuTegotae.typeOf(L) → { axes: [{ a: '家', b: '外', v: -0.3 }, ...], code: '家土穏先', name: '蔵守り', line: '…一生でした。' } */
(function (root) {
  'use strict';
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function round2(x) { return Math.round(x * 100) / 100; }
  var TRAVEL = /旅|参り|詣で|巡礼|遍路|上京|上洛|遊学|留学|出稼ぎ|移り住|引っ越|転勤|奉公に出|江戸へ|京へ|大坂へ|東京へ|海を渡|赴任|出征|疎開/;
  var STORM = /飢饉|大水|洪水|大火|焼け|地震|津波|戦|空襲|失|倒産|離縁|離婚|亡くな|病に倒|大けが|借金|罪|牢/;
  var NOW = /遊|楽しむ|楽しみ|見物|祭り|飲む|酒|買う|使う|ごちそう|休む|行ってみる|思いきり|好きな/;
  var FUTURE = /貯|蓄|学|習|稽古|覚える|備え|残す|続ける|継ぐ|励む|積み立て|勉強|修行|植える/;
  // 目安（いろいろな時代の人生 600人で、まん中が0になるように合わせた値。tools/check6.mjs 9-4 で確かめる）
  var MID = { home: 0.21, place: 1.05, storm: 1.1, fut: 0.27 }, SCALE = { home: 0.25, place: 1.5, storm: 0.3, fut: 0.42 };
  function placeKey(p) { return String(p || '').replace(/（.*?）/g, '').replace(/の(村|浜の村|町|城下|市街地)$/, ''); }
  function raw(L) {
    var log = L.log || [], cat = L.cat || {}, years = Math.max(1, log.length);
    // 家・外
    var home = (cat['家庭'] || 0), out = (cat['学歴と仕事'] || 0) + (cat['地域'] || 0) + (cat['人間関係'] || 0) * 0.5;
    var awayY = 0, places = {}, travel = 0, storm = 0, sats = [];
    log.forEach(function (r) {
      if (r.place) places[placeKey(r.place)] = 1;
      if (r.st && typeof r.st.sat === 'number') sats.push(r.st.sat);
      (r.events || []).forEach(function (e) { var t = e.t || ''; if (TRAVEL.test(t)) travel++; if (STORM.test(t)) storm++; });
      if (r.place && log[0] && placeKey(r.place) !== placeKey(log[0].place)) awayY++;
    });
    var homeV = (out - home) / Math.max(1, out + home) + (awayY / years) * 0.5;
    // 土・旅
    var nPlace = Object.keys(places).length, placeV = (nPlace - 1) + Math.min(6, travel) * 0.35;
    // 穏やか・波乱
    var mean = sats.reduce(function (a, b) { return a + b; }, 0) / Math.max(1, sats.length), sd = 0;
    sats.forEach(function (x) { sd += (x - mean) * (x - mean); }); sd = Math.sqrt(sd / Math.max(1, sats.length));
    var big = (L.choices || []).filter(function (c) { return c.big; }).length;
    var stormV = sd / 10 + (storm / years) * 2 + (big / years) * 1.5;
    // 今・先
    var now = 0, fut = 0;
    (L.choices || []).forEach(function (c) { var l = c.l || ''; if (FUTURE.test(l)) fut++; else if (NOW.test(l)) now++; });
    var futV = (fut - now) / Math.max(1, fut + now) * 0.5 + ((L.st4 && L.st4.v && typeof L.st4.v.learn === 'number' ? L.st4.v.learn : 40) - 40) / 100;
    return { home: homeV, place: placeV, storm: stormV, fut: futV };
  }
  var AX = [['家', '外', 'home'], ['土', '旅', 'place'], ['穏やか', '波乱', 'storm'], ['今', '先', 'fut']];
  var CODE = [['家', '外'], ['土', '旅'], ['穏', '乱'], ['今', '先']];
  // 16の型（家/外・土/旅・穏/乱・今/先 の順の4文字）
  var TYPES = {
    '家土穏今': ['縁側のひと', '生まれた土地で、家の者と穏やかな日々を味わいつくした一生でした。'],
    '家土穏先': ['蔵守り', '生まれた土地で家を守り、あとの代へ蓄えと知恵を残した一生でした。'],
    '家土乱今': ['炉端の語り部', '土地を離れず、浮き沈みの多い年々を、家族とその日その日で乗りきった一生でした。'],
    '家土乱先': ['大黒柱', '荒れる年にも家を支え、あとの者のために踏みとどまった一生でした。'],
    '家旅穏今': ['里帰りのひと', '住む所を移っても家族のそばを離れず、穏やかな日々を楽しんだ一生でした。'],
    '家旅穏先': ['巣をかける鳥', '土地を移りながら、家族の行く先を一つずつ整えていった一生でした。'],
    '家旅乱今': ['流れ舟', '家族とともにあちこちへ流れ、そのつど目の前の日を生きた一生でした。'],
    '家旅乱先': ['荷を担ぐひと', '家族を連れて険しい道を進み、先の暮らしを切り開いた一生でした。'],
    '外土穏今': ['辻の顔なじみ', '土地に腰を据えて外で人と交わり、穏やかな日々を楽しんだ一生でした。'],
    '外土穏先': ['田を拓くひと', '生まれた土地で外の仕事に励み、先のために一つずつ積み上げた一生でした。'],
    '外土乱今': ['祭りの太鼓', '土地を離れず、外で人とぶつかり合いながら、その時その時を楽しんだ一生でした。'],
    '外土乱先': ['堤を築くひと', '浮き沈みの中でも土地のために働き、あとの世に残るものを築いた一生でした。'],
    '外旅穏今': ['街道の旅人', '外へ外へと出かけ、行く先々の日々を穏やかに味わった一生でした。'],
    '外旅穏先': ['道しるべ', '土地を渡り歩いて学び、あとから来る人のために道を残した一生でした。'],
    '外旅乱今': ['浮き草', '土地を転々とし、激しい年々をその時かぎりに生ききった一生でした。'],
    '外旅乱先': ['帆を張るひと', '荒れる世の中で遠くへ出て、先を見すえて進み続けた一生でした。']
  };
  function typeOf(L) {
    if (!L) return null;
    var r = raw(L), axes = [], code = '';
    AX.forEach(function (ax, i) {
      var v = round2(clamp((r[ax[2]] - MID[ax[2]]) / SCALE[ax[2]], -1, 1));
      axes.push({ a: ax[0], b: ax[1], v: v });
      code += CODE[i][v > 0 ? 1 : 0];
    });
    var t = TYPES[code];
    return { axes: axes, code: code, name: t[0], line: t[1] };
  }
  var API = { typeOf: typeOf, raw: raw, TYPES: TYPES, MID: MID, SCALE: SCALE };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.IchiokuTegotae = API;
})(typeof self !== 'undefined' ? self : this);
