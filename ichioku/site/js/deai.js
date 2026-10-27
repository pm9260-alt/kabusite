/* 1000分の1 2020年代の出会い（指示書 9章）
   1 出会いのきっかけ（metBy）：2015年からの結婚に、夫婦が知り合ったきっかけを付け、結婚の文に書く。
     割合は調べた調査の数字だけを使う（出典は data-src/sources-deai-kake.json。tools/add-deai-kake.mjs で common.json・history.json の出典に入れる）
     ・2015〜2017年の結婚：国立社会保障・人口問題研究所「第16回出生動向基本調査」図表5-3（2021年a：2015年7月〜2018年6月の結婚）
     ・2018〜2019年の結婚：同（2021年b：2018年7月〜2021年6月の結婚）
     ・2020年からの結婚：明治安田生命「いい夫婦の日」に関するアンケート調査（2023年11月16日発表。2023年10月に調べた、1年以内に結婚した夫婦の出会いのきっかけ）
       マッチングアプリ25.0%・職場25.0%・友人知人の紹介13.5%・学校9.4%・婚活パーティーや婚活イベント7.3%・インターネットやSNS6.3%・趣味や習い事4.2%・合コン4.2%・お見合い1.0%・ナンパ1.0%・その他3.1%
       2023年以外の年は、この割合をあてた推計
   2 恋と結婚の入り口の分かれ道（2014年からの相席屋・2015年からのアプリ・婚活パーティー・街コン・結婚相談所）。だまされる道と、見抜いて離れる答えもある
   選んだ道は story.js の印（L.story.f.deaiHint）に残し、何年か以内に結婚したときのきっかけになる
   乱数は本体とも物語とも別のもの（種から作る）を使う。 */
(function (root) {
  'use strict';

  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // 出会いのきっかけの割合（%）。鍵ごとの結婚の文は TXT
  var IPSS_A = { work: 28.2, friend: 27.0, school: 14.2, town: 4.9, circle: 4.7, arbeit: 4.1, miai: 8.6, net: 6.0, osana: 1.2, other: 1.0 };
  var IPSS_B = { work: 21.4, friend: 25.9, school: 14.1, town: 5.8, circle: 4.5, arbeit: 4.0, miai: 9.0, net: 13.6, osana: 1.3, other: 0.6 };
  var MY2023 = { app: 25.0, work: 25.0, friend: 13.5, school: 9.4, party: 7.3, sns: 6.3, hobby: 4.2, goukon: 4.2, miai: 1.0, street: 1.0, other: 3.1 };
  var NAME = {
    app: 'マッチングアプリ', work: '職場', friend: '友人・知人の紹介', school: '学校', party: '婚活パーティー・婚活イベント', sns: 'インターネット・SNS', hobby: '趣味・習い事', goukon: '合コン',
    miai: '見合い・結婚相談所', street: 'ナンパ（街なかや相席屋）', town: '街なかや旅先', circle: 'サークル・クラブ・習いごと', arbeit: 'アルバイト', net: 'ネット（SNS・アプリなど）', osana: '幼なじみ・隣人', other: 'その他'
  };
  var TXT = {
    app: ['二人はマッチングアプリで知り合った。', 'きっかけは、マッチングアプリでのやりとりだった。'],
    work: ['二人は職場で知り合った。', '同じ職場で働くうちに親しくなった。'],
    friend: ['友人の紹介で知り合った。', '共通の友人に引き合わされたのがきっかけだった。'],
    school: ['二人は学校の同級生だった。', '学生のころからの付き合いだった。'],
    party: ['婚活パーティーで知り合った。', '街コンで同じ席になったのがきっかけだった。'],
    sns: ['SNSでのやりとりがきっかけで知り合った。'],
    net: ['インターネットでのやりとりがきっかけで知り合った。'],
    hobby: ['趣味の集まりで知り合った。'],
    circle: ['学校の外のサークルで知り合った。'],
    goukon: ['友人に誘われた合コンで知り合った。'],
    miai: ['結婚相談所の紹介で見合いをした相手だった。'],
    street: ['相席屋で隣の席になったのがきっかけだった。'],
    town: ['旅先で声をかけ合ったのがきっかけだった。'],
    arbeit: ['アルバイト先で知り合った。'],
    osana: ['二人は幼なじみだった。'],
    other: ['思いがけない縁で知り合った。']
  };
  function table(y) {
    if (y < 2015) return null;
    if (y <= 2017) return { t: IPSS_A, src: 'ipss16', sy: 2018, what: '2015年7月〜2018年6月に結婚した初婚どうしの夫婦が知り合ったきっかけ（第16回出生動向基本調査）', est: false };
    if (y <= 2019) return { t: IPSS_B, src: 'ipss16', sy: 2021, what: '2018年7月〜2021年6月に結婚した初婚どうしの夫婦が知り合ったきっかけ（第16回出生動向基本調査）', est: false };
    return { t: MY2023, src: 'meijiyasuda2023', sy: 2023, what: '1年以内に結婚した夫婦の出会いのきっかけ（2023年10月の調査' + (y === 2023 ? '' : '。この年の数字ではなく、2023年の調査の割合をあてた推計') + '）', est: y !== 2023 };
  }
  function draw(r, t) {
    var tot = 0, k;
    for (k in t) tot += t[k];
    var u = r() * tot;
    for (k in t) { u -= t[k]; if (u < 0) return k; }
    return k;
  }
  // 結婚した年に1回呼ぶ。2015年より前は null（文を変えない）
  function metBy(L, y) {
    var T = table(y);
    if (!T) return null;
    var r = rng((((L.seed >>> 0) ^ 0x2545f491) + y * 2654435761) >>> 0);
    var k = draw(r, T.t);
    // 物語の分かれ道で選んだ出会い（4年以内）は、そのきっかけになりやすい
    var h = L.story && L.story.f && L.story.f.deaiHint;
    if (h && y - h.y <= 4 && h.y <= y && r() < 0.5 && (T.t[h.k] != null || h.k === 'app')) k = T.t[h.k] != null ? h.k : (T.t.net != null ? 'net' : k);
    if (k === 'street' && y < 2014) k = 'town';
    L.metBy = k; L.metByY = y;
    var list = TXT[k] || TXT.other, t = list[Math.floor(r() * list.length)];
    if (k === 'party' && y < 2012) t = TXT.party[0];
    return { k: k, t: t, src: T.src, sy: T.sy, what: T.what, val: NAME[k] + ' ' + T.t[k].toFixed(1) + '%', est: T.est };
  }

  /* ---------- 恋と結婚の入り口の分かれ道 ---------- */
  function single(L) { return !L.married && !L.partner; }
  function hint(c, k) { c.s.f.deaiHint = { k: k, y: c.y }; }
  function nameO(c) { var L = c.L; return c.name(L.sex === 'm' ? 'f' : 'm') || '相手'; }
  // その年にほかの分かれ道が出ていたら、場面ごと翌年に回す（文が2回出ないように）
  function busy(c, id) { if (c.s.asked === c.y) { c.later(1, id, c.d); return true; } return false; }

  function register(S) {
    if (!S || !S.addArc || (S.ext && S.ext.deai)) return;
    if (S.ext) S.ext.deai = true;
    var arc = S.addArc;

    // アプリを始めてみようか？（2015年から。アプリは2010年代の後半から広がった）
    arc({ id: 'deai_app', start: function (c) {
      var L = c.L;
      if (c.y < 2015 || c.a < 20 || c.a > 44 || !single(L) || L.mode || !c.p(0.05)) return false;
      c.ask('deai_app', 'アプリを始めてみようか？', 'まわりで、マッチングアプリで相手を探す人が増えてきた。友人には「登録するだけでも」とすすめられた。アプリを始めてみる？', [
        { k: 'yuryo', l: '有料の会員になる', w: 0.8 + Math.max(0, c.tr('adv')) * 0.4, f: ['family'], h: '会費はかかるが、会える人は増える' },
        { k: 'muryo', l: '無料のまま使う', w: 1, f: ['save'], h: 'お金はかからないが、やりとりは手さぐり' },
        { k: 'yameru', l: 'やめておく', w: 0.9 + Math.max(0, -c.tr('soc')) * 0.4, f: ['study'], h: '気は楽だが、出会いは今のまま' }
      ]);
      return true;
    }, res: {
      yuryo: function (c) { c.money({ inc: -0.02, t: '出会いのアプリの会費' }); c.marry(1.15); c.say('月ごとの会費を払い、アプリの有料の会員になった。プロフィールの写真は、友人と相談して選んだ。', { tie: 2, sat: 1, learn: -1 }, '人間関係'); c.later(1, 'deai_app.meet', { paid: 1 }); },
      muryo: function (c) { c.say('無料のままアプリに登録した。何人と同時にやりとりするか決めかね、返事が追いつかなくなった。', { tie: 1, sat: -1 }, '人間関係'); c.later(1, 'deai_app.meet', { paid: 0 }); },
      yameru: function (c) { c.say('アプリは入れずにおいた。知らない人と画面ごしに知り合う気には、まだなれなかった。', { sat: 1, tie: -1 }, '人間関係'); }
    }, nodes: {
      meet: function (c) {
        if (!c.L.alive || !single(c.L) || busy(c, 'deai_app.meet')) return;
        var paid = c.d && c.d.paid, u = c.r();
        if (u < (paid ? 0.12 : 0.22)) { c.later(0, 'deai_app.sagi', {}); c.say('アプリで知り合った相手と、毎晩のようにメッセージを送り合うようになった。まだ一度も会ったことはなかった。', { sat: 2, tie: 1 }, '人間関係'); return; }
        if (u < (paid ? 0.4 : 0.55)) { c.say('初めて会う店を駅前の喫茶店に決めた。会ってみると、相手は写真とずいぶん違い、話もかみ合わなかった。', { sat: -2, learn: 1 }, '人間関係'); return; }
        if (u < (paid ? 0.5 : 0.62)) { c.later(1, 'deai_app.isogu', {}); c.say('アプリで知り合った人と食事をした。相手は、二度目に会ったときから結婚の話をしきりにした。', { sat: 1, tie: 1, learn: -1 }, '人間関係'); return; }
        var en = nameO(c); c.s.deaiEn = en;
        c.say('初めて会う店は、落ち着いて話せる小さな店に決めた。会ってみると、' + en + 'とは思っていたより話が合った。', { sat: 3, tie: 2 }, '人間関係');
        c.later(1, 'deai_app.third', {});
      },
      third: function (c) {
        if (!c.L.alive || !single(c.L) || busy(c, 'deai_app.third')) return;
        c.ask('deai_app.third', '3回目の食事のあと', (c.s.deaiEn || '相手') + 'と3回目の食事をした。駅までの帰り道、この先どうしたいかを考えた。', [
          { k: 'tsukiau', l: '付き合う', w: 1.2, f: ['family'], h: '二人の時間が増えるが、ほかの出会いは手放す' },
          { k: 'motto', l: 'もう少し会ってみる', w: 1, f: ['study'], h: '急がずにすむが、相手が待つとは限らない' },
          { k: 'yameru', l: 'これきりにする', w: 0.5, f: ['earn'], h: '気持ちはすっきりするが、また一から探す' }
        ], null, 'deai_app');
      },
      isogu: function (c) {
        if (!c.L.alive || !single(c.L) || busy(c, 'deai_app.isogu')) return;
        c.ask('deai_app.isogu', '結婚の話を急ぐ相手', 'アプリで知り合った相手が、会うたびに「早く親に会ってほしい」と結婚の話を急いだ。', [
          { k: 'noru', l: '話を進める', w: 0.7, f: ['family'], h: '早く家庭を持てるが、相手をよく知らないまま' },
          { k: 'yukkuri', l: 'ゆっくり決めたいと話す', w: 1.2, f: ['study'], h: '納得して決められるが、相手は離れるかもしれない' },
          { k: 'hanareru', l: '会うのをやめる', w: 0.6, f: ['body'], h: '気持ちは軽くなるが、出会いは振り出しに戻る' }
        ], null, 'deai_app');
      },
      sagi: function (c) {
        if (!c.L.alive || busy(c, 'deai_app.sagi')) return;
        var toshi = c.r() < 0.5;
        c.s.deaiSagi = toshi ? 'toshi' : 'kane';
        c.ask('deai_app.sagi', toshi ? '投資のすすめ' : 'お金の相談', toshi ? 'メッセージを送り合っていた相手が、「二人の将来のために」と、かならずもうかるという投資をすすめてきた。見たことのない取引の画面も送られてきた。' : 'メッセージを送り合っていた相手から、「結婚したら一緒に暮らすための家のお金が足りない。少しだけ貸してほしい」と頼まれた。', [
          { k: 'okuru', l: toshi ? 'すすめられた投資をする' : '頼まれたお金を送る', w: 0.5, f: ['family'], h: '相手を信じられるが、お金は戻らないかもしれない' },
          { k: 'miyaburu', l: '話がうますぎると離れる', w: 1, f: ['study'], h: 'お金は守れるが、楽しかったやりとりも終わる' },
          { k: 'sodan', l: '家族に相談する', w: 0.9, f: ['family'], h: '一人で抱えずにすむが、恥ずかしい思いもする' }
        ], null, 'deai_app');
      }
    } });
    var app = S.arcs.filter(function (a) { return a.id === 'deai_app'; })[0];
    app.res.third__tsukiau = function (c) { hint(c, 'app'); c.marry(1.6); c.say('付き合うことにした。週末ごとに会うようになり、アプリは消した。', { tie: 4, sat: 3, learn: -1 }, '人間関係'); };
    app.res.third__motto = function (c) { c.marry(1.1); if (c.p(0.5)) { hint(c, 'app'); c.say('もう少し会ってから決めることにした。何度か会ううちに、自然と付き合うようになった。', { tie: 2, sat: 1, body: -1 }, '人間関係'); } else c.say('もう少し会ってから決めることにしたが、相手からの返事は少しずつ遅くなり、やがて途絶えた。', { sat: -2, learn: 1 }, '人間関係'); };
    app.res.third__yameru = function (c) { c.say('会うのはこれきりにした。いい人だったが、一緒にいる先が思い浮かばなかった。', { sat: -1, learn: 2 }, '人間関係'); };
    app.res.isogu__noru = function (c) { hint(c, 'app'); c.marry(1.8); c.say('相手に合わせて話を進め、お互いの親にあいさつに行った。知らないことの多いまま、日取りの話が始まった。', { tie: 3, sat: 1, learn: -2 }, '家庭'); };
    app.res.isogu__yukkuri = function (c) { if (c.p(0.5)) { hint(c, 'app'); c.marry(1.3); c.say('ゆっくり決めたいと正直に話すと、相手は待つと言ってくれた。少しずつ互いのことを知っていった。', { tie: 3, sat: 1, body: -1 }, '人間関係'); } else c.say('ゆっくり決めたいと話すと、相手は「それなら別の人を探す」と言い、連絡は途絶えた。', { sat: -3, learn: 2 }, '人間関係'); };
    app.res.isogu__hanareru = function (c) { c.say('急ぐ話についていけず、会うのをやめた。しばらくはアプリを開く気になれなかった。', { sat: -1, body: 1, tie: -1 }, '人間関係'); };
    app.res.sagi__okuru = function (c) {
      var toshi = c.s.deaiSagi === 'toshi';
      c.money({ f: toshi ? -0.4 : -0.25, t: toshi ? 'うその投資でだまし取られた' : '結婚をちらつかせた相手にだまし取られた' });
      c.say(toshi ? 'すすめられるままに貯金を投資に回した。画面の上の数字は増えたが、引き出そうとすると相手と連絡が取れなくなった。' : '頼まれたお金を送った。そのあとも何度か頼まれて送ったが、ある日、相手と連絡が取れなくなった。', { sat: -6, tie: -2, learn: 2 }, '人間関係');
      (c.L.scams = c.L.scams || []).push({ y: c.y, k: toshi ? 'toshi' : 'romance' });
      c.later(1, 'deai_app.todoke', {});
    };
    app.res.sagi__miyaburu = function (c) { c.say('会ったこともない相手がお金の話をするのはおかしいと考え、やりとりをやめた。あとで、同じ手口のだましがあると知った。', { learn: 3, sat: -1, tie: -1 }, '人間関係'); };
    app.res.sagi__sodan = function (c) { c.say('思いきって家族に話すと、よくあるだましの手口だと止められた。相手とのやりとりはやめた。', { tie: 2, learn: 1, sat: -2 }, '家庭'); };
    S.nodes['deai_app.todoke'] = function (c) { if (!c.L.alive) return; c.say('だまされたと分かり、警察に届けを出した。お金はほとんど戻らなかったが、同じ目にあった人の集まりを知った。', { tie: 1, sat: -2, learn: 1 }, '人間関係'); };

    // 相席屋（2014年ごろから広まった）
    arc({ id: 'deai_aiseki', start: function (c) {
      var L = c.L;
      if (c.y < 2014 || c.a < 20 || c.a > 39 || !single(L) || L.mode || (c.kind !== 'town' && c.kind !== 'city') || !c.p(0.025)) return false;
      c.ask('deai_aiseki', '相席屋で', '友人に誘われて、知らない人と同じ席で飲む相席屋に入った。隣になった人と話がはずんだ。連絡先を交換する？', [
        { k: 'kokan', l: '連絡先を交換する', w: 1, f: ['family'], h: '縁が広がるが、相手のことはまだ何も知らない' },
        { k: 'shinai', l: '交換せずに帰る', w: 1, f: ['save'], h: '気楽に帰れるが、その場かぎりの縁になる' }
      ]);
      return true;
    }, res: {
      kokan: function (c) { c.money({ inc: -0.003, t: '相席屋の飲み代' }); c.say('相席屋で隣になった人と、連絡先を交換した。帰りの電車で、さっそくメッセージが届いた。', { tie: 2, sat: 1, body: -1 }, '人間関係'); c.later(1, 'deai_aiseki.go', {}); },
      shinai: function (c) { c.say('楽しく話したが、連絡先は聞かずに店を出た。友人には、もったいないと笑われた。', { sat: -1, body: 1 }, '人間関係'); }
    }, nodes: {
      go: function (c) {
        if (!c.L.alive || !single(c.L)) return;
        if (c.p(0.35)) { hint(c, 'street'); c.marry(1.3); c.say('相席屋で知り合った人と何度か食事をするうちに、付き合うようになった。', { tie: 3, sat: 2 }, '人間関係'); }
        else c.say('相席屋で知り合った人とは二、三度やりとりをしたが、いつのまにか連絡は途絶えた。', { sat: -1 }, '人間関係');
      }
    } });

    // 婚活：街コン・婚活パーティー・結婚相談所（2015年から）
    arc({ id: 'deai_konkatsu', start: function (c) {
      var L = c.L;
      if (c.y < 2015 || c.a < 27 || c.a > 49 || !single(L) || L.mode || !c.p(0.035)) return false;
      var city = c.kind === 'town' || c.kind === 'city';
      c.ask('deai_konkatsu', '婚活をしてみる？', 'まわりの友人が次々に結婚していった。' + (city ? '駅の広告で街コンや婚活パーティーの案内をよく見かける。' : '町の役場が、独身の人の出会いの催しを開くという。') + '婚活をしてみる？', [
        { k: 'party', l: city ? '街コンに出てみる' : '出会いの催しに出る', w: 1, f: ['family'], h: '一度に多くの人と会えるが、話せる時間は短い' },
        { k: 'sodanjo', l: '結婚相談所に入る', w: 0.6, f: ['family'], h: '本気の相手に会えるが、入会金と会費がかかる' },
        { k: 'shinai', l: '今は考えない', w: 1, f: ['earn'], h: '自分の時間は守れるが、出会いは今のまま' }
      ]);
      return true;
    }, res: {
      party: function (c) { c.money({ inc: -0.01, t: '婚活の催しの参加費' }); c.marry(1.15); if (c.p(0.3)) { hint(c, 'party'); c.say('婚活の催しで話の合う人に出会い、連絡を取り合うようになった。', { tie: 3, sat: 2, body: -1 }, '人間関係'); } else c.say('婚活の催しに出てみたが、一人と話せるのは数分ずつで、名前を覚えるだけで精いっぱいだった。', { sat: -1, learn: 1, tie: 1 }, '人間関係'); },
      sodanjo: function (c) { c.money({ inc: -0.06, t: '結婚相談所の入会金と会費' }); c.marry(1.3); c.say('結婚相談所に入会した。担当の人に、仕事や家族のことまでくわしく話した。', { tie: 1, learn: 1, sat: -1 }, '人間関係'); c.later(1, 'deai_konkatsu.isogu', {}); },
      shinai: function (c) { c.say('婚活は今はしないと決めた。休みの日は、自分の好きなことに使った。', { sat: 2, tie: -1 }, '人間関係'); }
    }, nodes: {
      isogu: function (c) {
        if (!c.L.alive || !single(c.L) || busy(c, 'deai_konkatsu.isogu')) return;
        c.ask('deai_konkatsu.isogu', '話を急ぐ相手', '相談所で紹介された相手と見合いをした。相手は三度目に会った日、式をいつにするかの話を始めた。', [
          { k: 'susumu', l: 'その流れに乗る', w: 0.9, f: ['family'], h: '早く結婚できるが、迷いは残る' },
          { k: 'yukkuri', l: '少し待ってほしいと話す', w: 1, f: ['study'], h: '落ち着いて決められるが、話が流れることもある' },
          { k: 'kotowaru', l: 'お断りする', w: 0.5, f: ['body'], h: '気は楽になるが、また紹介を待つことになる' }
        ], null, 'deai_konkatsu');
      }
    } });
    var kk = S.arcs.filter(function (a) { return a.id === 'deai_konkatsu'; })[0];
    kk.res.isogu__susumu = function (c) { hint(c, 'miai'); c.marry(1.8); c.say('相手に合わせて話を進めた。何度か会ううちに、互いの家族にもあいさつをすませた。', { tie: 3, sat: 1, learn: -1 }, '家庭'); };
    kk.res.isogu__yukkuri = function (c) { if (c.p(0.5)) { hint(c, 'miai'); c.marry(1.3); c.say('少し待ってほしいと話すと、相手はうなずいた。月に何度か会い、ゆっくり互いを知っていった。', { tie: 2, sat: 1, body: -1 }, '人間関係'); } else c.say('少し待ってほしいと伝えると、相談所を通して、相手からお断りの連絡が来た。', { sat: -2, learn: 2 }, '人間関係'); };
    kk.res.isogu__kotowaru = function (c) { c.say('相談所を通して、お断りの返事をした。紹介を待つあいだ、少し肩の力が抜けた。', { body: 1, sat: -1 }, '人間関係'); };
  }

  var API = { metBy: metBy, table: table, register: register, IPSS_A: IPSS_A, IPSS_B: IPSS_B, MY2023: MY2023, NAME: NAME };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.IchiokuDeai = API;
  if (root.IchiokuStory) register(root.IchiokuStory);
})(typeof self !== 'undefined' ? self : this);
