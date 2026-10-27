/* 1000分の1 昭和以降の賭けごと（指示書 14章）
   公営競技の始まり：競馬法 1923年（戦争で1944年から開催が止まり、1946年秋に再開）・競輪 1948年・オートレース 1950年・競艇 1952年。
   中央競馬の G1 の格付けは1984年から（それより前は「八大競走」などの大きなレースと呼ぶ）。馬券・車券・舟券は20歳未満は買えない（2022年に成年が18歳になった後も20歳のまま）。
   ほかの賭けごと：パチンコ（1948年の風俗営業取締法のころから、戦後に広まる）・職場の麻雀（金を賭ければ賭博罪）・宝くじ（1945年10月から。ジャンボは1979年から）・サッカーくじ（2001年から全国で）。
   ギャンブル等依存症対策基本法は2018年（7月成立・10月施行）。出典は data-src/sources-deai-kake.json（tools/add-deai-kake.mjs で出典の一覧に入れる）
   結果は、選んだ券の倍率と、払戻率から決めた当たる確率（当たる確率＝払戻率÷倍率）で決める。だから賭けた額の見こみの戻りは、いつも払戻率の分だけになる。
   払戻率：中央競馬の単勝は2014年6月から80%、それまでは75%（日本中央競馬会の2014年3月3日の知らせ）。競輪75.0%・競艇74.8%・オートレース74.8%・宝くじ45.7%・サッカーくじ49.6%（総務省の資料。平成20年度の実績）。
   パチンコは公表された払戻率がないため、公営競技の払戻率（74.8%）をあてた推計。麻雀は仲間うちの取り合いで、見こみの収支は0とした推計。
   1950年より前の競馬の払戻率は、1948年からの決まり（75%）をあてた推計。倍率と、宝くじの等ごとの分け方は、払戻率に合うようにした作りの数（推計）。
   額は今の物価の千円で数え（L.money.sav と同じ）、その年のお金に直して答えの文に書く。結果は貯金に足し引きする（c.money の abs）。
   賭けるほど「やめられなくなる」度合い（L.kake.add）が増え、高くなると、借金・家族とのもめごと・仕事の失敗・罪の道につながる。やめる道（家族に打ち明ける・相談する）もある。 */
(function (root) {
  'use strict';

  var START = { keiba: 1923, keirin: 1948, auto: 1950, kyotei: 1952, takara: 1945, toto: 2001, pachinko: 1948, mahjong: 1950 };
  var KNAME = { keiba: '競馬', keirin: '競輪', auto: 'オートレース', kyotei: '競艇', takara: '宝くじ', toto: 'サッカーくじ', pachinko: 'パチンコ', mahjong: '麻雀' };
  function keibaOk(y) { return y >= START.keiba && !(y >= 1944 && y <= 1946); }
  function open(kind, y) { return kind === 'keiba' ? keibaOk(y) : y >= START[kind]; }
  // 払戻率（src は出典の鍵、est は推計）
  function payout(kind, y) {
    if (kind === 'keiba') return y >= 2015 ? { r: 0.80, src: 'jra2014', est: false } : { r: 0.75, src: 'jra2014', est: y < 1950 };
    if (kind === 'keirin') return { r: 0.750, src: 'soumu_kanpu', est: y !== 2008 };
    if (kind === 'kyotei' || kind === 'auto') return { r: 0.748, src: 'soumu_kanpu', est: y !== 2008 };
    if (kind === 'takara') return { r: 0.457, src: 'soumu_kanpu', est: y !== 2008 };
    if (kind === 'toto') return { r: 0.496, src: 'soumu_kanpu', est: y !== 2008 };
    if (kind === 'pachinko') return { r: 0.748, src: 'soumu_kanpu', est: true };
    return { r: 1, src: 'keiho185', est: true };
  }

  function eng() {
    if (root.Ichioku && root.Ichioku.priceOf) return root.Ichioku;
    if (typeof require === 'function') { try { return require('./engine.js'); } catch (e) { return null; } }
    return null;
  }
  // 今の物価の千円 → その年のお金の言い方（「1,000円」「1万円」「50銭」）。きりのよい数に丸める
  function nice(v) {
    if (v <= 0) return 0;
    var e = Math.pow(10, Math.floor(Math.log(v) / Math.LN10)), m = v / e;
    return (m < 1.5 ? 1 : m < 2.5 ? 2 : m < 4 ? 3 : m < 7.5 ? 5 : 10) * e;
  }
  function comma(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function yen(L, real, y) {
    var E = eng(), p = E && E.priceOf ? E.priceOf(L, y).p : 1;
    var n = nice(real * 1000 * p);
    if (n < 1) return Math.max(1, Math.round(n * 100)) + '銭';
    if (n >= 1e8) return comma(Math.round(n / 1e8)) + '億円';
    if (n >= 1e4) return comma(Math.round(n / 1e4)) + '万円';
    return comma(Math.round(n)) + '円';
  }

  function K(L) { return L.kake || (L.kake = { met: 0, metY: [], log: [], add: 0, net: 0, stake: 0, ret: 0, debt: 0, trouble: [] }); }
  function sav(L) { return L.money && L.money.sav > 0 ? L.money.sav : 0; }
  // 1回の賭け。当たる確率＝払戻率÷倍率。返すのは {win, ret, net}
  function bet(c, kind, stake, odds, addInc, t) {
    var L = c.L, k = K(L), po = payout(kind, c.y);
    if (!open(kind, c.y) || c.a < 20) return { win: false, ret: 0, net: 0, none: true };
    var win = c.r() < po.r / odds, ret = win ? stake * odds : 0, net = ret - stake;
    k.log.push({ y: c.y, a: c.a, kind: kind, stake: stake, odds: odds, ret: ret, net: net });
    k.stake += stake; k.ret += ret; k.net += net; k.add += addInc || 0;
    c.money({ abs: net, t: t || (KNAME[kind] + (net >= 0 ? 'で勝った' : 'で負けた')) });
    return { win: win, ret: ret, net: net };
  }
  // 宝くじ・サッカーくじ：1枚ごとに、末等（券の値段が戻る）・中くらいの当たり・大当たりを引く（各等の割合は払戻率に合わせた推計）
  function lottery(c, kind, n, unit, addInc) {
    var L = c.L, k = K(L), po = payout(kind, c.y), r = c.r, ret = 0, top = 0;
    // [倍率, 1枚あたりの確率]。いちばん上の等と下の等を決め、払戻率に合うよう真ん中の等の確率をととのえる
    var tiers = kind === 'takara' ? [[1e5, 0.000001], [100, 0], [1, 0.1]] : [[1e4, 0.000006], [30, 0], [3, 0.1]];
    tiers[1][1] = (po.r - tiers[0][0] * tiers[0][1] - tiers[2][0] * tiers[2][1]) / tiers[1][0];
    for (var i = 0; i < n; i++) {
      var u = r(), acc = 0;
      for (var j = 0; j < tiers.length; j++) { acc += tiers[j][1]; if (u < acc) { ret += unit * tiers[j][0]; if (j < 2) top = Math.max(top, tiers[j][0]); break; } }
    }
    var stake = unit * n, net = ret - stake;
    k.log.push({ y: c.y, a: c.a, kind: kind, stake: stake, odds: null, ret: ret, net: net });
    k.stake += stake; k.ret += ret; k.net += net; k.add += addInc || 0;
    c.money({ abs: net, t: KNAME[kind] + (net >= 0 ? 'が当たった' : 'を買った') });
    return { ret: ret, net: net, top: top };
  }
  // 賭けの後：大勝ちなら使い道、やめられなくなる度合いが高ければ、その場面へ
  function after(c, res) {
    var L = c.L, k = K(L);
    if (res && res.net >= Math.max(50, sav(L) * 0.5) && !k.winAt) { k.winAt = c.y; k.lastWin = res.net; c.later(1, 'kakeN.tsukau', {}); }
    if (k.add >= 6 && !k.hamaruAt) { k.hamaruAt = c.y; c.later(1 + Math.floor(c.r() * 2), 'kakeN.hamaru', { n: 1 }); }
  }
  function friend(c) { var s = c.s; return (s.wpal && s.wpal.n) || (s.pal && s.pal.n) || s.friend || '友人'; }
  function famWord(L) { return L.married ? '連れ合い' : (L.members || []).some(function (m) { return (m.role === '母' || m.role === '父') && m.alive && !m.gone; }) ? '親' : 'きょうだい'; }
  function busy(c, id) { if (c.s.asked === c.y) { c.later(1, id, c.d); return true; } return false; }
  function noted(c, id) { var L = c.L, q = L.queue[L.queue.length - 1]; if (q && q.sid === id && c.s.asked === c.y) { var k = K(L); k.met++; k.metY.push({ y: c.y, a: c.a, id: id }); return q; } return null; }
  function adult(c) { return c.a >= 20 && c.a <= 80 && !c.L.mode && c.y >= 1923; }
  function raceName(y) { return y >= 1984 ? 'G1' : y >= 1956 ? '八大競走' : y >= 1932 ? '大きなレース' : '大きな競馬'; }
  var EST = '（額は今の物価に直した目安）';

  function register(S) {
    if (!S || !S.addArc || (S.ext && S.ext.kake)) return;
    if (S.ext) S.ext.kake = true;
    var arc = S.addArc;
    var N = S.nodes;

    // はじめての G1（1984年より前は八大競走などの大きなレース）
    arc({ id: 'kake_g1', start: function (c) {
      if (!adult(c) || c.a > 70 || !keibaOk(c.y) || !c.p(0.0065)) return false;
      var L = c.L, rn = raceName(c.y), all = sav(L);
      c.s.kakeG1 = { small: 1, mid: 10, all: Math.max(5, all) };
      c.ask('kake_g1', 'はじめての' + rn, friend(c) + 'に誘われて、はじめて競馬場へ行った。' + (c.y >= 1956 ? rn + 'の日で' : rn + 'のある日で') + '、スタンドは人で埋まっていた。いくら賭ける？', [
        { k: 'small', l: yen(L, 1, c.y) + 'だけ', w: 1.2, f: ['save'], h: '負けても痛くないが、勝っても小さい' },
        { k: 'mid', l: yen(L, 10, c.y), w: 0.8, f: ['earn'], h: '当たれば大きいが、外れれば1日分の稼ぎが消える' },
        { k: 'all', l: 'なけなしの全貯金', w: 0.08 + Math.max(0, c.tr('adv')) * 0.06, f: ['earn'], h: 'まれに大きく増えるが、たいていは全部なくす' }
      ]);
      var q = noted(c, 'kake_g1');
      if (q) q.groups.push({ id: 'u', q: 'どの馬の' + (c.y >= 1948 ? '単勝の' : '') + '馬券を買う？', options: [
        { k: 'ninki', l: '人気の馬', f: [], h: '当たりやすいが戻りは少ない' },
        { k: 'ana', l: '大穴の馬', f: [], h: 'めったに当たらないが当たれば大きい' }
      ] });
      return true;
    }, res: {} });
    var g1 = S.arcs.filter(function (a) { return a.id === 'kake_g1'; })[0];
    ['small', 'mid', 'all'].forEach(function (k) {
      g1.res[k] = function (c) {
        var L = c.L, st = (c.s.kakeG1 || { small: 1, mid: 10, all: 5 })[k], ans = c.s.ans && c.s.ans.u;
        var horse = ans === 'ana' || ans === 'ninki' ? ans : (c.r() < 0.65 ? 'ninki' : 'ana');
        var odds = horse === 'ninki' ? Math.round((1.8 + c.r() * 1.7) * 10) / 10 : Math.round(20 + c.r() * 40);
        var res = bet(c, 'keiba', st, odds, k === 'all' ? 4 : k === 'mid' ? 2 : 1, '競馬の' + (res0(k)));
        var amt = k === 'all' ? '貯金のすべて' : yen(L, st, c.y);
        var hw = horse === 'ninki' ? '人気の馬' : '大穴の馬';
        if (res.win) c.say(hw + 'に' + amt + 'を賭けると、その馬が先頭でゴールした。倍率は' + odds + '倍で、' + yen(L, res.ret, c.y) + 'が戻ってきた' + (k === 'all' || horse === 'ana' ? '。手が震えた' : '') + '。', k === 'all' ? { sat: 8, learn: -3, tie: -1 } : { sat: 4, learn: -1 }, '人間関係');
        else c.say(hw + 'に' + amt + 'を賭けたが、その馬は' + (horse === 'ninki' ? '最後の直線で抜かれた' : '後ろのまま終わった') + '。' + (k === 'all' ? '帰りの電車賃にも困るほどだった。' : '外れた馬券を、しばらく手の中で握っていた。'), k === 'all' ? { sat: -8, tie: -3, learn: 2 } : k === 'mid' ? { sat: -3, learn: 1 } : { sat: 1, learn: 1, tie: 1 }, '人間関係');
        after(c, res);
      };
    });
    function res0(k) { return k === 'all' ? '大勝負' : '馬券'; }

    // 競輪場（競艇場・オートレース場）の最終レース：負けを取り返そうとするか、帰るか
    arc({ id: 'kake_keirin', start: function (c) {
      if (!adult(c) || c.a > 75 || c.y < 1948 || !c.p(0.0045)) return false;
      var opts = ['keirin'].concat(open('kyotei', c.y) ? ['kyotei'] : []).concat(open('auto', c.y) ? ['auto'] : []);
      var kind = opts[Math.floor(c.r() * opts.length)], place = { keirin: '競輪場', kyotei: '競艇場', auto: 'オートレース場' }[kind], ken = { keirin: '車券', kyotei: '舟券', auto: '車券' }[kind];
      // 朝からのレース：1レースに今の千円ほどを6回（結果は確率で決める）
      var day = 0, k0 = K(c.L);
      for (var i = 0; i < 6; i++) day += bet(c, kind, 1, 6, 0, KNAME[kind] + 'のレース').net;
      k0.add += 1;
      c.s.kakeKr = { kind: kind, place: place, ken: ken };
      var lose = day < 0;
      c.ask('kake_keirin', place + 'の最終レース', '仕事仲間と' + place + 'へ行き、朝から' + ken + 'を買い続けた。' + (lose ? '負けがかさみ、財布には' + yen(c.L, 5, c.y) + 'ほどが残るだけだった。' : '少し浮いていた。') + '最終レースが近づいた。', [
        { k: 'kaesu', l: lose ? '残りの金で取り返す' : '浮いた分も賭ける', w: 0.6 + Math.max(0, c.tr('adv')) * 0.3, f: ['earn'], h: '取り返せることもあるが、たいていは全部なくす' },
        { k: 'kaeru', l: 'あきらめて帰る', w: 1, f: ['save'], h: 'これ以上は減らないが、悔しさは残る' }
      ]);
      noted(c, 'kake_keirin');
      return true;
    }, res: {
      kaesu: function (c) {
        var d = c.s.kakeKr || { kind: 'keirin', place: '競輪場', ken: '車券' }, odds = Math.round(6 + c.r() * 10);
        var res = bet(c, d.kind, 5, odds, 3, '最終レースの' + d.ken);
        if (res.win) c.say('最終レースで、残りの金を' + odds + '倍の' + d.ken + 'に賭けると当たった。その日の負けを取り返し、また来ようと思った。', { sat: 4, learn: -2 }, '人間関係');
        else c.say('最終レースに残りの金を賭けたが外れた。歩いて駅まで帰る道のりが長く感じた。', { sat: -4, body: -1, learn: 1 }, '人間関係');
        after(c, res);
      },
      kaeru: function (c) { c.say('最終レースは見ずに帰った。負けた分は、勉強代と思うことにした。', { sat: -1, learn: 2, body: 1 }, '人間関係'); }
    } });

    // パチンコ店の新台
    arc({ id: 'kake_pachi', start: function (c) {
      if (!adult(c) || c.a > 80 || c.y < 1948 || !c.p(0.0045)) return false;
      c.ask('kake_pachi', 'パチンコ店の新台', '近所のパチンコ店の前に、新台入れ替えののぼりが立っていた。店の中から玉の音が聞こえてくる。', [
        { k: 'sukoshi', l: yen(c.L, 1, c.y) + '分だけ打つ', w: 1, f: ['body'], h: '気晴らしになるが、たいていは消える' },
        { k: 'atari', l: '当たるまで打つ', w: 0.5 + Math.max(0, c.tr('grit')) * 0.3, f: ['earn'], h: '大当たりもあるが、気づけば財布が空になる' },
        { k: 'hairanai', l: '店に入らない', w: 1, f: ['save'], h: 'お金は減らないが、話の輪に入れない' }
      ]);
      noted(c, 'kake_pachi');
      return true;
    }, res: {
      sukoshi: function (c) { var res = bet(c, 'pachinko', 1, 3, 1, 'パチンコ'); c.say(res.win ? '少しだけのつもりで打つと玉が出て、景品を抱えて店を出た。' : '少しだけ打ってみたが、玉はすぐに消えた。それ以上は打たずに帰った。', res.win ? { sat: 3, body: -1 } : { sat: -1, learn: 1, body: 1 }, '人間関係'); after(c, res); },
      atari: function (c) { var res = bet(c, 'pachinko', 12, 3, 3, 'パチンコ'); c.say(res.win ? '閉店まで粘ると大当たりが続き、' + yen(c.L, res.ret, c.y) + '分の玉が出た。次の休みも行こうと決めた。' : '当たるまでと粘ったが、閉店の音楽が流れるまで当たらなかった。' + yen(c.L, 12, c.y) + 'ほどが消えた。', res.win ? { sat: 5, learn: -2, body: -1 } : { sat: -5, body: -2, learn: 1 }, '人間関係'); after(c, res); },
      hairanai: function (c) { c.say('のぼりを横目に通り過ぎた。翌日、職場で新台の話が出たが、話には加われなかった。', { learn: 1, tie: -1 }, '人間関係'); }
    } });

    // 職場の麻雀（金を賭ければ賭博罪。見こみの収支は0。推計）
    arc({ id: 'kake_mahjong', start: function (c) {
      var L = c.L, work = L.old ? !!(L.job && L.job !== 'home' && L.job !== 'farm') : !!(L.job && L.job.ind);
      if (!adult(c) || c.a > 65 || c.y < 1950 || !work || !c.p(0.006)) return false;
      c.ask('kake_mahjong', '職場の麻雀', '職場の仲間に、仕事帰りの麻雀に誘われた。点数に応じて金をやりとりする決まりだという。', [
        { k: 'sukoshi', l: '少しの賭けで付き合う', w: 1, f: ['family'], h: '仲間と打ち解けるが、帰りは遅くなる' },
        { k: 'takai', l: '高い賭けで朝まで打つ', w: 0.3 + Math.max(0, c.tr('adv')) * 0.3, f: ['earn'], h: '大きく勝つこともあるが、法にふれ、からだも削る' },
        { k: 'kotowaru', l: '金を賭けないならと断る', w: 0.8, f: ['study'], h: '筋は通るが、付き合いが悪いと言われる' }
      ]);
      noted(c, 'kake_mahjong');
      return true;
    }, res: {
      sukoshi: function (c) { var res = mahjong(c, 2, 1); c.say(res.net >= 0 ? '仕事帰りの麻雀に付き合った。少し勝って、帰りにみんなでラーメンを食べた。' : '仕事帰りの麻雀に付き合った。少し負けたが、上司の意外な一面を知った。', { tie: 3, sat: res.net >= 0 ? 2 : -1, body: -1 }, '人間関係'); },
      takai: function (c) { var res = mahjong(c, 15, 2); c.say(res.net >= 0 ? '高い賭けで朝まで打ち、' + yen(c.L, res.net, c.y) + 'ほど勝った。眠らずに職場へ向かった。' : '高い賭けで朝まで打ち、' + yen(c.L, -res.net, c.y) + 'ほど負けた。払いは月末まで待ってもらった。', { tie: 1, sat: res.net >= 0 ? 3 : -4, body: -3, learn: -1 }, '人間関係'); after(c, res); },
      kotowaru: function (c) { c.say('金を賭けないならと断ると、その夜の麻雀は流れた。翌日、付き合いが悪いと言われた。', { tie: -2, learn: 1, body: 1 }, '人間関係'); }
    } });
    function mahjong(c, st, addInc) {
      // 4人の取り合い：1位 +2倍・2位 +0.5倍・3位 −0.5倍・4位 −2倍（合わせて0）
      var L = c.L, k = K(L), rank = Math.floor(c.r() * 4), net = [2, 0.5, -0.5, -2][rank] * st;
      k.log.push({ y: c.y, a: c.a, kind: 'mahjong', stake: st, odds: null, ret: st + net, net: net });
      k.stake += st; k.ret += st + net; k.net += net; k.add += addInc;
      c.money({ abs: net, t: '麻雀の' + (net >= 0 ? '勝ち' : '負け') });
      return { net: net, win: net > 0, ret: st + net };
    }

    // 年末の宝くじ（1979年からは年末ジャンボ）
    arc({ id: 'kake_jumbo', start: function (c) {
      if (!adult(c) || c.a > 85 || c.y < 1945 || !c.p(0.006)) return false;
      var nm = c.y >= 1979 ? '年末ジャンボ' : '年末の宝くじ';
      c.ask('kake_jumbo', nm + 'を何枚買うか', '年の暮れ、売り場に' + nm + 'を買う人の列ができていた。何枚買う？', [
        { k: 'ichi', l: '1枚だけ', w: 1, f: ['save'], h: 'ほとんど減らないが、夢も小さい' },
        { k: 'juu', l: '10枚', w: 1, f: ['family'], h: '家族で当たりを待つ楽しみがあるが、半分以上は戻らない' },
        { k: 'sanju', l: '30枚まとめて', w: 0.4, f: ['earn'], h: '当たる券は増えるが、使った分の半分以上は消える' }
      ]);
      noted(c, 'kake_jumbo');
      return true;
    }, res: {
      ichi: function (c) { jumbo(c, 1, 0); },
      juu: function (c) { jumbo(c, 10, 0); },
      sanju: function (c) { jumbo(c, 30, 1); }
    } });
    function jumbo(c, n, addInc) {
      var nm = c.y >= 1979 ? '年末ジャンボ' : '宝くじ', res = lottery(c, 'takara', n, 0.3, addInc);
      if (res.top >= 1e5) c.say('買った' + nm + 'が一等に当たった。新聞の番号を、何度も見直した。', { sat: 9, tie: -2, learn: -1 }, '家庭');
      else if (res.top >= 100) c.say('買った' + nm + 'の一枚が、思わぬ額に当たった。家族で小さなお祝いをした。', { sat: 5, tie: 2, learn: -1 }, '家庭');
      else if (res.ret > 0) c.say(nm + 'は' + n + '枚のうち、いちばん下の当たりだけだった。また来年と笑った。', { sat: 1, tie: 1, learn: -1 }, '家庭');
      else c.say(nm + 'は一枚も当たらなかった。番号を確かめる時間だけが楽しかった。', { sat: -1, learn: 1, tie: 1 }, '家庭');
      after(c, res);
    }

    // サッカーくじ（2001年から全国で）
    arc({ id: 'kake_toto', start: function (c) {
      if (!adult(c) || c.a > 75 || c.y < START.toto || !c.p(0.004)) return false;
      c.ask('kake_toto', 'サッカーくじ', 'コンビニのレジ横で、サッカーくじの案内が目に入った。試合の勝ち負けを当てるくじだという。', [
        { k: 'ichi', l: '1口だけ買う', w: 1, f: ['body'], h: '試合を見る楽しみは増えるが、まず当たらない' },
        { k: 'maishu', l: '毎週買い続ける', w: 0.4, f: ['earn'], h: '当たる見こみは増えるが、1年で使う額はかさむ' },
        { k: 'kawanai', l: '買わない', w: 1, f: ['save'], h: 'お金は減らないが、話の種もない' }
      ]);
      noted(c, 'kake_toto');
      return true;
    }, res: {
      ichi: function (c) { var r = lottery(c, 'toto', 1, 0.3, 0); c.say(r.ret > 0 ? '1口だけ買ったサッカーくじが、下の等に当たった。週末の試合を見るのが楽しみになった。' : '1口だけ買ったサッカーくじは外れた。それでも週末の試合を最後まで見た。', r.ret > 0 ? { sat: 3, learn: -1 } : { sat: 1, learn: -1, tie: 1 }, '人間関係'); after(c, r); },
      maishu: function (c) { var r = lottery(c, 'toto', 50, 0.3, 2); c.say('1年のあいだ、毎週サッカーくじを買い続けた。' + (r.net >= 0 ? '当たりが重なり、使った分より多く戻った。' : '戻ったのは使った額の一部だった。'), r.net >= 0 ? { sat: 4, learn: -2 } : { sat: -3, learn: 1 }, '人間関係'); after(c, r); },
      kawanai: function (c) { c.say('くじは買わずに店を出た。週末の試合の結果も、知らないままだった。', { learn: 1, tie: -1 }, '人間関係'); }
    } });

    /* ---------- 大勝ちの使い道 ---------- */
    N['kakeN.tsukau'] = function (c) {
      var L = c.L, k = K(L);
      if (!L.alive || busy(c, 'kakeN.tsukau')) return;
      var w = yen(L, k.lastWin || 50, c.y), fam = famWord(L);
      c.ask('kakeN.tsukau', '大勝ちした金', '賭けごとで大勝ちした' + w + 'ほどが、まだ手元にあった。この金をどうする？', [
        { k: 'tsukau__watasu', l: fam + 'に渡す', w: 1, f: ['family'], h: '家族は喜ぶが、自分の手元には残らない' },
        { k: 'tsukau__tameru', l: '貯めておく', w: 1, f: ['save'], h: 'いざというときに使えるが、ぜいたくはできない' },
        { k: 'tsukau__mata', l: 'また賭ける', w: 0.5 + Math.max(0, c.tr('adv')) * 0.4, f: ['earn'], h: 'もっと増えることもあるが、たいていは消える' }
      ], null, 'kakeN');
    };
    var kn = { id: 'kakeN', res: {
      tsukau__watasu: function (c) { var L = c.L, k = K(L), d = (k.lastWin || 0) * 0.5; c.money({ abs: -d, t: '大勝ちした金を家族に渡した' }); k.gave = (k.gave || 0) + d; c.say('勝った金の半分を' + famWord(L) + 'に渡した。家の古くなった物を買い替えることができた。', { tie: 5, sat: 2, learn: -1 }, '家庭'); },
      tsukau__tameru: function (c) { c.say('勝った金には手をつけず、貯金に回した。賭けごとからは、少し足が遠のいた。', { sat: 1, learn: 2, tie: -1 }, '家庭'); K(c.L).add = Math.max(0, K(c.L).add - 2); },
      tsukau__mata: function (c) {
        var L = c.L, k = K(L), kind = keibaOk(c.y) ? 'keiba' : 'keirin', st = k.lastWin || 50, odds = Math.round(3 + c.r() * 5);
        var res = bet(c, kind, st, odds, 3, '勝った金をまた賭けた');
        c.say(res.win ? '勝った金をそのまま次の' + (kind === 'keiba' ? '馬券' : '車券') + 'に賭けると、また当たった。自分には運があると思いこむようになった。' : '勝った金をそのまま次の' + (kind === 'keiba' ? '馬券' : '車券') + 'に賭け、すべてなくした。勝つ前より、取り返したい気持ちが強くなった。', res.win ? { sat: 5, learn: -3, tie: -1 } : { sat: -6, learn: 1, tie: -1 }, '人間関係');
        k.winAt = k.winAt || c.y;
        if (k.add >= 6 && !k.hamaruAt) { k.hamaruAt = c.y; c.later(1 + Math.floor(c.r() * 2), 'kakeN.hamaru', { n: 1 }); }
      }
    } };

    /* ---------- やめられなくなる ---------- */
    N['kakeN.hamaru'] = function (c) {
      var L = c.L, k = K(L), n = (c.d && c.d.n) || 1;
      if (!L.alive || busy(c, 'kakeN.hamaru')) return;
      // 気づかないうちに、休みのたびに賭けて負けが重なる（同じ払戻率で、今の千円5つを10回）
      var kind = keibaOk(c.y) ? 'keiba' : open('keirin', c.y) ? 'keirin' : 'pachinko', lost = 0;
      for (var i = 0; i < 10; i++) lost += bet(c, kind, 5, 4, 0.3, '休みのたびの' + KNAME[kind]).net;
      c.s.kakeKind = kind;
      var soudan = c.y >= 2018 ? '依存症の相談窓口に相談する' : c.y >= 1965 ? '保健所に相談する' : '寺の住職に相談する';
      c.ask('kakeN.hamaru', 'やめられない', (n >= 2 ? 'あのあとも、' : '気がつくと、') + '休みのたびに' + KNAME[kind] + 'に通っていた。この一年で' + (lost < 0 ? yen(L, -lost, c.y) + 'ほど負けた' : '勝ったり負けたりをくり返した') + '。やめようと思っても、次の休みには足が向いた。', [
        { k: 'hamaru__uchiakeru', l: famWord(L) + 'に打ち明ける', w: 1, f: ['family'], h: '支えを得られるが、責められもする' },
        { k: 'hamaru__sodan', l: soudan, w: c.y >= 2018 ? 0.9 : 0.5, f: ['body'], h: 'やめ方を教わるが、自分の弱さと向き合うことになる' },
        { k: 'hamaru__kakusu', l: '隠して続ける', w: 0.7 + Math.max(0, c.tr('adv')) * 0.3, f: ['earn'], h: '今は誰にも知られないが、負けは重なっていく' }
      ], { n: n }, 'kakeN');
    };
    kn.res.hamaru__uchiakeru = function (c) {
      var L = c.L, k = K(L); k.add = 0; k.quit = c.y;
      c.money({ mul: 1.03, until: c.y + 5, t: '家族と家計を見直した' });
      c.say('思いきって' + famWord(L) + 'に、賭けごとがやめられないと打ち明けた。強く責められたが、それから財布は家族に預けることにした。', { tie: -2, sat: -2, body: 2, learn: 2 }, '家庭');
    };
    kn.res.hamaru__sodan = function (c) {
      var L = c.L, k = K(L); k.add = 0; k.quit = c.y;
      c.say(c.y >= 2018 ? '依存症の相談窓口に電話をかけた。同じ悩みを持つ人の集まりを教わり、月に一度通うようになった。' : c.y >= 1965 ? '保健所に相談すると、賭けごとをやめられない人の話を聞いてくれた。少しずつ、賭けに行かない休みが増えた。' : '寺の住職に悩みを打ち明けた。話を聞いてもらううちに、賭場から足が遠のいた。', { body: 2, learn: 2, sat: -1, tie: 1 }, '人間関係');
    };
    kn.res.hamaru__kakusu = function (c) {
      var L = c.L, k = K(L), kind = c.s.kakeKind || 'keirin';
      var res = bet(c, kind, Math.max(20, sav(L) * 0.4), 4, 3, '取り返そうと賭け続けた');
      c.say('誰にも言わずに賭け続けた。負けを取り返そうと、賭ける額が少しずつ大きくなった。', res.win ? { sat: 1, learn: -2, tie: -2 } : { sat: -4, tie: -2, learn: -1 }, '人間関係');
      c.later(1 + Math.floor(c.r() * 2), 'kakeN.kuzure', { n: (c.d && c.d.n) || 1 });
    };
    // 隠して続けた先：借金・家族とのもめごと・仕事の失敗・罪（どれか1つ）
    N['kakeN.kuzure'] = function (c) {
      var L = c.L, k = K(L), n = (c.d && c.d.n) || 1;
      if (!L.alive) return;
      var used = k.trouble.map(function (t) { return t.k; });
      var cand = ['shakkin', 'mome', 'shigoto', 'tsumi'].filter(function (x) { return used.indexOf(x) < 0; });
      var w = { shakkin: 4, mome: 3, shigoto: 2, tsumi: 1 }, tot = 0, u, pick = cand[0];
      cand.forEach(function (x) { tot += w[x]; }); u = c.r() * tot;
      for (var i = 0; i < cand.length; i++) { u -= w[cand[i]]; if (u < 0) { pick = cand[i]; break; } }
      k.trouble.push({ y: c.y, k: pick });
      var debt = 30 + Math.round(c.r() * 70);
      if (pick === 'shakkin') {
        k.debt += debt; k.stake += debt; k.net -= debt; k.log.push({ y: c.y, a: c.a, kind: c.s.kakeKind || 'keirin', stake: debt, odds: null, ret: 0, net: -debt, debt: true });
        c.money({ abs: -debt, t: '賭けごとの借金を返した' }); c.money({ mul: 0.9, until: c.y + 5, t: '賭けごとの借金の返済' });
        c.say('負けを埋めるために金を借り、借金は' + yen(L, debt, c.y) + 'ほどにふくらんだ。返すあてのない督促の手紙が届くようになった。', { sat: -6, tie: -3, body: -2 }, '家庭');
      } else if (pick === 'mome') {
        c.money({ f: -0.2, t: '賭けごとで家の金を使いこんだ' });
        c.say('家の金に手をつけていたことが' + famWord(L) + 'に知れ、激しい言い合いになった。家の中の会話がめっきり減った。', { tie: -8, sat: -5 }, '家庭');
      } else if (pick === 'shigoto') {
        c.say('賭けごとのことで頭がいっぱいになり、仕事でしくじりが続いた。上司に呼ばれ、厳しく注意された。', { sat: -5, learn: -2, tie: -2 }, '学歴と仕事');
      } else {
        var emb = 20 + Math.round(c.r() * 60);
        (L.crimes = L.crimes || []).push({ y: c.y, t: '横領', pun: c.y < 1947 ? '懲役' : '懲役（執行猶予つき）', path: 'kake' });
        k.net -= emb; k.stake += emb; k.log.push({ y: c.y, a: c.a, kind: c.s.kakeKind || 'keirin', stake: emb, odds: null, ret: 0, net: -emb, crime: true });
        c.money({ abs: -emb, t: '使いこんだ金を弁償した' });
        c.say('負けを取り返そうと、勤め先の金に手をつけた。すぐに知れて職を失い、横領の罪に問われた。', { sat: -9, tie: -6, learn: -2 }, '学歴と仕事');
      }
      if (n < 2) c.later(1, 'kakeN.hamaru', { n: 2 });
    };
    arc(kn);
  }

  var API = { register: register, START: START, KNAME: KNAME, payout: payout, open: open, keibaOk: keibaOk, yen: yen, summary: function (L) { return L.kake || null; } };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.IchiokuKake = API;
  if (root.IchiokuStory) register(root.IchiokuStory);
})(typeof self !== 'undefined' ? self : this);
