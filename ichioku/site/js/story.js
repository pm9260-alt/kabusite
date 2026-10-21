/* 1000分の1 物語の分かれ道（現代の暮らし・昭和・明治・江戸。どちらの進め方（engine.js・history.js）からも呼ぶ）
   その人の気質（性格）と得意なこと、家の事情から、人生ごとに違う分かれ道を、違う年齢で出す。
   選んだことは「印（フラグ）」として残り、何年もあとに別の出来事や分かれ道を呼ぶ（あのときの選択がここで生きる形）。
   参考にした物語の型は、どれも2つ以上の作品の流れを重ねて抽象化したもの（固有の名前や設定は使わない）。各筋の頭に型の出どころを書く。
   乱数はこの仕組みだけの別のもの（種から作る）を使うので、ほかの抽選の順番は変わらない。
   数字の出どころ（年収など）は js の各所の注に書き、画面には出さない。 */
(function (root) {
  'use strict';

  function clamp(x, lo, hi) { return x < lo ? lo : x > hi ? hi : x; }
  function pickW(r, w) {
    var t = 0, k;
    for (k in w) t += Math.max(0, w[k]);
    if (t <= 0) for (k in w) return k;
    var u = r() * t;
    for (k in w) { u -= Math.max(0, w[k]); if (u < 0) return k; }
    return k;
  }
  function one(r, list) { return list[Math.floor(r() * list.length)]; }
  var TR = ['adv', 'soc', 'grit', 'warm', 'dream'];          // 挑戦・人づきあい・根気・情の深さ・憧れ
  var TAL = ['art', 'music', 'sport', 'talk', 'brain', 'looks', 'hand']; // 絵・音楽・運動・話す・頭・見た目・手先

  /* ---------- 気質と家の事情（生まれたときに決める） ---------- */
  function init(L, api) {
    var r = api.makeRng((((L.seed >>> 0) ^ 0x51f15e7d) >>> 0) || 1);
    var s = { r: r, tr: {}, tal: {}, f: {}, done: {}, at: [], base: { body: 0, sat: 0, learn: 0, tie: 0 }, sui: 1, last: -99 };
    TR.forEach(function (k) { s.tr[k] = api.gauss(r); });
    TAL.forEach(function (k) { s.tal[k] = api.gauss(r); });
    // 親が子を支配したり傷つけたりする家（児童虐待の相談件数や子ども期の逆境の調査から、目安として1割弱。暮らしの苦しい家でやや多い）
    s.f.toxic = r() < clamp(0.07 + (0.5 - (L.incPct || 0.5)) * 0.06, 0.03, 0.12);
    // 地元の有力者（議員など）の家：所得のいちばん上の0.5%のうち3割を目安にした、まれな家
    s.f.bigwig = (L.incPct || 0) > 0.995 && r() < 0.3;
    // きょうだい・子として引き継いだ人生では、家の事情を前の人と同じにする
    if (L.house && L.house.story) { s.f.toxic = !!L.house.story.toxic; s.f.bigwig = !!L.house.story.bigwig; if (L.house.story.prosper) { s.f.prosperHouse = L.house.story.prosper; L.incPct = Math.max(L.incPct || 0, 0.85); } }
    L.story = s;
    return s;
  }
  function best(s) { var b = null; TAL.forEach(function (k) { if (!b || s.tal[k] > s.tal[b]) b = k; }); return b; }
  function gifted(s, k) { return s.tal[k] > 1.4; }

  /* ---------- 文を出す・印を残す・あとで呼ぶ ---------- */
  function ctxOf(L, rec, api, d) {
    var s = L.story;
    var c = {
      L: L, s: s, y: L.year, a: L.age, d: d || {}, r: s.r, api: api, E: !L.old, O: !!L.old, place: rec && rec.place, rec: rec,
      // お金の選択（第4弾の11）：その年の貯金に足し引きする（f はその時の貯金に、inc はふだんの年収に対する割合。mul は until の年まで貯まり方を何倍にするか）
      money: function (o) { (L.moneyAdj = L.moneyAdj || []).push(Object.assign({ y: L.year }, o)); },
      st: L.old ? L.status : 'modern',
      // 土地の種類：村・浜の村・町・市街地（今の進め方は 町村・都市・大都市 を読みかえる）
      kind: L.old ? (L.kind === 'kotan' ? 'village' : L.kind) : ({ '町村': 'village', '都市': 'town', '大都市': 'city' })[(L.place || {}).kind] || 'town',
      say: function (t, st, cat) {
        // 同じ文は1つの人生で1回だけ。2回目からは回数で書き分ける（spec6 1-4）
        var sn = s.saidN = s.saidN || {}; sn[t] = (sn[t] || 0) + 1;
        if (sn[t] === 2) t = 'また、' + t; else if (sn[t] > 2) t = 'これで' + (KAZU[sn[t]] || sn[t]) + '度目だった。' + t;
        var e = api.push(L, rec, cat || '人間関係', t, []); e.story = true; if (st) e.st = st; return e;
      },
      later: function (dy, id, data) { s.at.push({ y: L.year + dy, id: id, d: data || {} }); },
      ask: function (id, title, q, opts, data, resArc) {
        // 1年に出す物語の分かれ道は1つまで。すでに出した年は、この場面を翌年に回す
        if (s.asked === L.year) { if (s.cur) s.at.push({ y: L.year + 1, id: s.cur, d: d || {} }); return; }
        // 戦時中は、縁日や旅人などの場面の分かれ道を出さない
        if (L.year >= 1938 && L.year <= 1945 && api.WAR_BAN && api.WAR_BAN.test(q + opts.map(function (o) { return o.l; }).join(''))) return;
        var ew = function (t) { return api.eraWords ? api.eraWords(t, L.year, L) : t; };
        q = ew(q); opts.forEach(function (o) { o.l = ew(o.l); });
        var br = { id: 'story', kind: 'story', big: true, sid: id, ra: resArc || id.split('.')[0], title: title, groups: [{ id: 's', q: q, options: opts.map(function (o) { return { k: o.k, l: o.l, f: o.f || [], h: o.h || HINTS[id + ':' + o.k] || '結果しだい' }; }) }], ev: [], w: {}, d: data || {} };
        opts.forEach(function (o) { br.w[o.k] = typeof o.w === 'number' ? o.w : 1; });
        L.queue.push(br);
        s.asked = L.year; s.nBig = (s.nBig || 0) + 1;
        var dk2 = Math.floor(L.age / 10) * 10; (s.decC = s.decC || {})[dk2] = (s.decC[dk2] || 0) + 1;
      },
      job: function (label, pay, reg, ind) { api.job(L, label, pay, reg, ind); },
      noJob: function () { api.noJob(L); },
      marry: function (k) { api.marryBoost(L, k); },
      move: function (where) { api.move(L, where); if (where === 'home') L.mode = null; },
      mode: function (m) { L.mode = m; L.modeSince = L.year; },
      base: function (k, v) { s.base[k] += v; },
      p: function (x) { return s.r() < x; },
      tr: function (k) { return s.tr[k]; },
      tal: function (k) { return s.tal[k]; },
      // アイヌ語の名前は書き表さない（村の人として呼ぶ）
      name: function (sex) { var n = api.nameFor(L, sex, L.by + Math.round((s.r() - 0.5) * 2)); return /アイヌ語/.test(n || '') ? (sex === 'm' ? '村の若者' : '村の娘') : n; },
      marryPending: function () { return L.queue.some(function (b) { return b.kind === 'marry' || b.id === 'marry' || b.id === 'partner' || b.kind === 'muko'; }); },
      tokyoBorn: function () { return String((L.home || {}).pref) === '13'; },
      away: function () { return L.old ? !!L.moved : !!(L.place && L.place.away); },
      univ: function () { return /大学/.test(L.edu || '') || L.school === 'univ' || L.school === '大学'; },
      poor: function () { return (L.incPct == null ? 0.5 : L.incPct) < 0.3; },
      common: function () { return !L.old || ['hyakusho', 'chonin', 'heimin', 'genin'].indexOf(L.status) >= 0; }
    };
    return c;
  }

  /* ---------- 筋（アーク） ----------
     start(c)：その年に始まるかどうかを決めて、始まったら true。nodes：あとで呼ばれる出来事や分かれ道。res：分かれ道の答えごとの続き */
  var A = [], N = {};
  function arc(o) { A.push(o); for (var k in (o.nodes || {})) N[o.id + '.' + k] = o.nodes[k]; }
  function modern(c) { return c.y >= 1975; }
  function single(L) { return !L.married && !L.everMarried; }
  function hasParentOld(L, age) { return (L.members || []).some(function (m) { return (m.role === '父' || m.role === '母') && m.alive && !m.gone && L.year - m.by >= age; }); }
  function parentOld(L, age) { return (L.members || []).filter(function (m) { return (m.role === '父' || m.role === '母') && m.alive && !m.gone && L.year - m.by >= age; })[0]; }
  // 家業：今の進め方は父の仕事、昔の進め方は家の身分と土地から
  function bizKey(L) {
    if (!L.old) return ['agri', 'fish', 'shop'].indexOf(L.dadJob) >= 0 ? L.dadJob : null;
    if (L.status === 'chonin') return 'shop';
    if (L.status === 'hyakusho' || (L.status === 'heimin' && (L.kind === 'village' || L.kind === 'fish'))) return L.kind === 'fish' ? 'fish' : 'agri';
    return null;
  }
  function famBiz(L) { return !!bizKey(L); }
  var BIZ = { agri: '家の田畑', fish: '家の漁船', shop: '家の店' };
  var BIZJOB = { agri: '家の農業を継いだ', fish: '家の漁業を継いだ', shop: '家の店を継いだ' }, BIZPAY = { agri: 2500, fish: 2230, shop: 3000 };

  // 0 気質：5歳ごろ、まわりから言われる性格（原作の「5歳ごろに気質が定まる」にならう）
  arc({ id: 'temper', start: function (c) {
    if (c.a !== 5 || c.s.done.temper) return false;
    var t = c.s.tr, k = TR.slice().sort(function (a, b) { return Math.abs(t[b]) - Math.abs(t[a]); }).slice(0, 2);
    var W = { adv: ['思い立ったらすぐ動く', 'こわがりで慎重な'], soc: ['誰とでもすぐ仲よくなる', 'ひとり遊びが好きな'], grit: ['一度始めたらやめない', '飽きっぽい'], warm: ['人の気持ちに敏感な', 'さっぱりした'], dream: ['空想が好きな', '目の前のことに夢中な'] };
    var w = k.map(function (x) { return W[x][t[x] >= 0 ? 0 : 1]; });
    var tl = { art: '絵を描くのが上手だ', music: '歌や音にすぐ反応する', sport: '走るのが速い', talk: '口が達者だ', brain: '数や字を覚えるのが早い', looks: '目を引く顔立ちだ', hand: '手先が器用だ' }[best(c.s)];
    c.say(w[0] + '、' + w[1] + '子だと言われるようになった。' + (c.s.tal[best(c.s)] > 0.8 ? 'まわりからは「' + tl + '」と言われる。' : ''), null, '家庭');
    return true;
  } });

  // 1 毒親：支配・暴言・過干渉の家。18歳で家を出るか、残るか
  //   型：毒親から離れる（本屋大賞『52ヘルツのクジラたち』『星を掬う』／ドラマ『凪のお暇』『過保護のカホコ』）
  arc({ id: 'toxic', start: function (c) {
    if (!c.s.f.toxic || c.s.done.toxic || c.y < 1960 || c.a < 7 || c.a > 13 || !c.p(0.25)) return false;
    var L = c.L, p = (L.members || []).filter(function (m) { return (m.role === '母' || m.role === '父') && m.alive; })[c.r() < 0.6 ? 1 : 0] || L.mom || L.dad;
    if (!p) return false;
    c.s.toxicWho = p.role;
    c.say(one(c.r, [p.role + 'の機嫌ひとつで家の空気が変わる。テストの点が悪いと、夜まで責め続けられた。', p.role + 'は「あなたのために言っている」と、友だちも服も決めてしまう。', p.role + 'に怒鳴られた日は、押し入れの中で息をひそめて過ごした。']), { sat: -6, tie: -4 }, '家庭');
    c.later(4 + Math.floor(c.r() * 3), 'toxic.mid');
    c.later(18 - c.a, 'toxic.leave');
    return true;
  }, nodes: {
    mid: function (c) { if (c.a < 18) c.say(one(c.r, ['家に帰りたくなくて、閉館まで図書館で過ごす日が増えた。', '学校で笑っていても、玄関の前で足が止まる。', '「早く大人になって、この家を出たい」と、日記に書いた。']), { sat: -4 }, '家庭'); },
    leave: function (c) {
      if (c.L.age < 17) return;
      c.ask('toxic.leave', '家を出るか', (c.s.toxicWho || '親') + 'の支配から離れたい。進学や就職をきっかけに、遠くへ出る？', [
        { k: 'go', l: '家を出て、遠くで暮らす', w: 1 + Math.max(0, c.tr('adv')), f: ['study', 'earn'] },
        { k: 'stay', l: '家に残る', w: 1 + Math.max(0, c.tr('warm')), f: ['family'] }
      ]);
    }
  }, res: {
    go: function (c) {
      c.s.f.leftHome = true;
      if (!c.away() && !c.tokyoBorn() && c.p(0.6)) c.move('tokyo');
      c.say('荷物ひとつで家を出た。連絡先は教えなかった。最初の夜、知らない天井を見て少し泣いた。', { sat: 6, tie: -6 });
      c.base('sat', 3);
      c.later(12 + Math.floor(c.r() * 10), 'toxic.call');
    },
    stay: function (c) {
      c.s.f.stayedToxic = true;
      c.say('家に残った。親の顔色をうかがう暮らしは、大人になっても続いた。', { sat: -5 });
      c.base('sat', -3);
    }
  } });
  N['toxic.call'] = function (c) {
    var p = parentOld(c.L, 0);
    if (!p) return;
    c.ask('toxic.call', '親からの連絡', '何年も連絡を絶っていた' + p.role + 'から、「体を悪くした」と知らせが来た。会いに行く？', [
      { k: 'meet', l: '会いに行く', w: 1 + c.tr('warm'), f: ['family'] },
      { k: 'no', l: '会わない', w: 1 - c.tr('warm') * 0.5, f: ['earn', 'study'] }
    ], null, 'toxic2');
  };
  arc({ id: 'toxic2', nodes: {}, res: {
    meet: function (c) { c.say(one(c.r, ['久しぶりに会った親は小さく見えた。謝られることはなかったが、昔ほど怖くはなかった。', '病室で向き合うと、言いたかったことの半分も言えなかった。それでも、行ってよかったと思えた。']), { tie: 4, sat: 2 }); c.s.f.reconciled = true; },
    no: function (c) { c.say('会わないと決めた。自分の暮らしを守ることを選んだ。', { sat: 1 }); }
  } });

  // 2 夢を追って上京する：音楽・漫画・お笑い・アイドル・声優・落語
  //   型：夢を追って上京するか地元に残るか（本屋大賞『汝、星のごとく』『東京タワー』／ドラマ『半分、青い。』『あまちゃん』）
  //       夢に期限を決めるか（芥川賞『火花』／ドラマ『カルテット』）・挫折と転身（ドラマ『重版出来！』『オールドルーキー』）
  var DREAMS = {
    music: { name: 'バンド', hook: 'ギターを手にして、毎日弾くようになった', go: 'バンドで売れることを目指して', act: 'ライブハウスに出ながらアルバイトで暮らした', win: 'バンドがメジャーデビューし、大きな会場に立った', from: 1975 },
    art: { name: '漫画', hook: 'テレビアニメに夢中になり、ノートに漫画を描くようになった', go: '漫画家を目指して', act: '出版社に原稿を持ち込みながら、アシスタントで暮らした', win: '新人賞を取り、雑誌で連載が始まった', from: 1975 },
    talk: { name: 'お笑い', hook: '友だちを笑わせることに夢中になり、テレビのネタ番組を録画して研究した', go: '芸人を目指して', act: '養成所を出て、小さな劇場に立ちながらアルバイトで暮らした', win: '賞レースで決勝に残り、テレビに呼ばれるようになった', from: 1980 },
    looks: { name: 'アイドル', hook: 'テレビの中のアイドルにあこがれ、鏡の前で振り付けをまねた', go: 'アイドルを目指して', act: '小さなグループに入り、ライブとチェキ撮影で暮らした', win: 'グループの人気が出て、テレビの歌番組に出た', from: 1980 },
    voice: { name: '声優', hook: 'アニメの声に心をつかまれ、セリフをまねて録音するようになった', go: '声優を目指して', act: '養成所に通い、事務所に所属しながらアルバイトで暮らした', win: '人気作の主役の声に選ばれた', from: 1990 }
  };
  // 年収の目安（千円・2025年の物価）。アルバイト中心は月15万円ほど、売れた年は分野ごとの目安（いずれも推計）
  var DREAM_PAY = { low: 1800, win: { music: 9000, art: 10000, talk: 8000, looks: 6000, voice: 6000 } };
  arc({ id: 'dream', start: function (c) {
    if (c.s.done.dream || c.a < 12 || c.a > 16 || c.y < 1950) return false;
    var k = best(c.s), key = k === 'music' ? 'music' : k === 'art' ? 'art' : k === 'talk' ? 'talk' : k === 'looks' ? (c.r() < 0.5 ? 'looks' : 'voice') : null;
    if (!key || DREAMS[key].from > c.y + 6) return false;
    if (c.s.tal[k] + c.s.tr.dream * 0.7 < 1.5 || !c.p(0.15)) return false;
    c.s.dream = key;
    c.say(DREAMS[key].hook + '。', { sat: 3 }, '人間関係');
    c.later(Math.max(1, 18 - c.a) + Math.floor(c.r() * 3), 'dream.go');
    return true;
  }, nodes: {
    go: function (c) {
      var D = DREAMS[c.s.dream], L = c.L;
      if (!D || L.married) return;
      if (L.school && L.school !== '小学校') { c.later(1, 'dream.go'); return; }
      var where = c.tokyoBorn() ? '本気で' : '東京に出て';
      c.ask('dream.go', '夢を追うか', D.go + '、' + where + '挑戦する？', [
        { k: 'go', l: c.tokyoBorn() ? '本気で挑戦する' : '上京して挑戦する', w: 0.6 + Math.max(0, c.tr('dream')) + Math.max(0, c.tr('adv')) * 0.5, f: ['study'] },
        { k: 'side', l: '地元で働きながら続ける', w: 1, f: ['earn', 'save'] },
        { k: 'drop', l: '夢はしまっておく', w: 1 - c.tr('dream') * 0.4, f: ['family', 'body'] }
      ]);
    },
    year: function (c) {
      var D = DREAMS[c.s.dream], L = c.L, s = c.s;
      if (!s.f.chasing || !L.alive) return;
      var n = c.y - s.f.chasing;
      // 売れる確率：その道の得意と根気。1年に数%ほど（新人賞・メジャー契約・プロになれる人の少なさから置いた目安）
      var pw = clamp(0.012 + 0.025 * Math.max(0, s.tal[{ music: 'music', art: 'art', talk: 'talk', looks: 'looks', voice: 'looks' }[s.dream]] - 0.8) + 0.008 * s.tr.grit, 0.004, 0.08);
      if (c.p(pw)) {
        s.f.made = c.y; s.f.chasing = 0;
        c.job(D.name === '漫画' ? '漫画家' : D.name === 'バンド' ? 'ミュージシャン' : D.name === 'お笑い' ? 'お笑い芸人' : D.name, DREAM_PAY.win[s.dream], false, 'service');
        c.say(D.win + '。' + n + '年目のことだった。', { sat: 15, tie: 5 }, '学歴と仕事');
        c.base('sat', 6);
        if (c.p(0.5)) c.later(3 + Math.floor(c.r() * 6), 'dream.after');
        return;
      }
      if (s.dream === 'art' && n >= 2 && !s.f.rejected && c.p(0.4)) {
        s.f.rejected = true;
        c.say('描きためた原稿を出版社に持ち込んだが、どこでも首を振られた。「線はきれいだけど、話が弱い」と言われた。', { sat: -8 }, '学歴と仕事');
        if (s.tr.grit < -0.3) c.later(1, 'dream.dark');
      } else if (n >= 1 && c.p(0.35)) c.say(one(c.r, ['客席に知り合いしかいない夜もあった。', '家賃の支払いが遅れ、電気を止められかけた。', '同じ夢を追う仲間が、ひとり、またひとりとやめていった。', '小さな会場で、初めて知らない人から声をかけられた。']), null, '学歴と仕事');
      if (n >= 6 && (!s.f.quitAt || c.y >= s.f.quitAt)) { s.f.quitAt = c.y + 4; N['dream.quit'](c); }
      c.later(1, 'dream.year');
    },
    quit: function (c) {
      var L = c.L, biz = famBiz(L);
      c.ask('dream.quit', '続けるか、帰るか', (L.age) + '歳。同級生は家を建て始めた。' + (biz ? '実家からは「そろそろ' + BIZ[bizKey(L)] + 'を継いでくれないか」と言われている。' : '') + 'まだ続ける？', [
        { k: 'keep', l: 'まだ続ける', w: 0.5 + Math.max(0, c.tr('grit')) + Math.max(0, c.tr('dream')) * 0.5, f: ['study'] },
        { k: 'home', l: biz ? '地元に帰って家業を継ぐ' : '地元に帰って働く', w: 1 + Math.max(0, c.tr('warm')) * 0.5, f: ['family', 'earn', 'save'] }
      ]);
    },
    dark: function (c) {
      var L = c.L;
      if (!L.alive) return;
      c.s.f.depressed = c.y;
      c.say('自分には才能がないと思い詰め、朝起きられなくなった。心療内科で、うつ病と診断された。', { sat: -12, body: -8 }, '健康');
      c.s.sui *= 1.6;
      c.later(1, 'dep.welfare');
    },
    after: function (c) {
      c.say(one(c.r, ['人気は長く続かなかった。それでも、あの舞台に立った日のことは、何度も思い出した。', '仕事の波はあったが、好きなことで暮らせることを大切にした。', '若い人から「あなたを見てこの道に入った」と言われた。']), { sat: 3 });
    }
  }, res: {
    go: function (c) {
      var D = DREAMS[c.s.dream];
      c.s.f.chasing = c.y; c.s.f.dreamGo = true;
      if (!c.tokyoBorn() && !c.away()) c.move('tokyo');
      c.job(D.name + 'を続けながらアルバイト', DREAM_PAY.low, false, 'service');
      c.say(D.go + '、' + (c.tokyoBorn() ? '' : '東京に出た。') + D.act + '。', { sat: 6, tie: -4 }, '学歴と仕事');
      c.later(1, 'dream.year');
    },
    side: function (c) { c.s.f.dreamSide = true; c.say('地元で働きながら、休みの日に続けることにした。', { sat: 2 }); c.later(15 + Math.floor(c.r() * 15), 'dream.echo'); },
    drop: function (c) { c.s.f.dreamDrop = true; c.say('夢は胸の奥にしまった。ときどき、あのころの道具を取り出して眺めた。', { sat: -3 }); c.later(20 + Math.floor(c.r() * 15), 'dream.echo'); },
    keep: function (c) { c.say('もう少しだけ、と自分に言い聞かせて続けた。', { sat: -2 }); c.later(1, 'dream.year'); },
    home: function (c) {
      var L = c.L, biz = famBiz(L);
      c.s.f.chasing = 0; c.s.f.cameHome = c.y;
      c.move('home');
      if (biz) c.job(BIZJOB[bizKey(L)], BIZPAY[bizKey(L)], false, bizKey(L));
      else c.job('地元の会社に勤める', 3300, true, 'office');
      c.say('東京の部屋を引き払い、地元に帰った。' + (biz ? BIZ[bizKey(L)] + 'を継いだ。' : '地元の会社に入った。') + '駅に迎えに来た親の背中が、少し小さく見えた。', { sat: 4, tie: 8 }, '学歴と仕事');
      c.base('sat', 2);
      c.later(8 + Math.floor(c.r() * 15), 'dream.echo');
    }
  } });
  // 夢の名残り：あのときの経験が、何十年もあとに別の形で生きる
  N['dream.echo'] = function (c) {
    var D = DREAMS[c.s.dream];
    if (!D || !c.L.alive) return;
    var t = { music: '地元の祭りでバンドを組み直し、昔の曲を演奏した。客席で子どもたちが手をたたいていた。', art: '子ども会で漫画の描き方を教えることになった。描いた絵を見て、子どもが目を輝かせた。', talk: '会社の宴会の司会を任され、会場を笑いでいっぱいにした。', looks: '地元のイベントで、昔の振り付けを子どもたちに教えた。', voice: '地域の図書館で、子どもたちに絵本を声に出して聞かせる係を始めた。' }[c.s.dream];
    c.say(t, { sat: 5, tie: 4 });
  };

  // 3 うつ・生活保護・回復
  //   型：心が折れて全部捨てて休む（ドラマ『凪のお暇』『わたし、定時で帰ります。』）・やりがいの搾取から「助けて」と言う（本屋大賞『夜が明ける』『カフネ』）
  //   生活保護の目安：単身・東京23区で生活扶助と住宅扶助を合わせて月約13万円（年およそ155万円）
  N['dep.welfare'] = function (c) {
    var L = c.L;
    if (!L.alive) return;
    c.ask('dep.welfare', '暮らしが立ち行かない', '働けない日が続き、家賃が払えなくなった。生活保護を申請する？', [
      { k: 'apply', l: '申請する', w: 1 + Math.max(0, -c.tr('grit')), f: ['body', 'family'] },
      { k: 'push', l: '無理をして働き続ける', w: 1 + Math.max(0, c.tr('grit')), f: ['earn', 'save'] }
    ], null, 'dep');
  };
  arc({ id: 'dep', nodes: {}, res: {
    apply: function (c) {
      c.s.f.welfare = c.y; c.s.f.chasing = 0;
      c.job('生活保護を受けながら療養', 1550, false, 'service');
      c.say('福祉事務所に相談し、生活保護を受けることになった。窓口の人は、思っていたより親身だった。', { sat: -3, body: 4 }, '家庭');
      c.later(2 + Math.floor(c.r() * 3), 'dep.recover');
    },
    push: function (c) {
      c.say('アルバイトを掛け持ちして、なんとか家賃を払い続けた。体はいつも限界だった。', { body: -10, sat: -5 }, '健康');
      c.later(2, 'dep.recover');
    }
  } });
  N['dep.recover'] = function (c) {
    var L = c.L;
    if (!L.alive) return;
    if (c.p(0.65 + 0.1 * c.tr('soc'))) {
      var helped = c.s.f.helpedName;
      c.s.sui = Math.max(1, c.s.sui / 1.6);
      c.job(helped ? helped + 'の紹介で入った会社に勤める' : '就労支援を受けて入った職場で働く', 2800, false, 'service');
      c.say(helped ? '中学のころに声をかけた同級生の' + helped + 'が、事情を聞いて自分の会社に誘ってくれた。少しずつ、また働けるようになった。' : '就労支援の窓口に通い、短い時間から働き始めた。少しずつ、朝起きられる日が増えた。', { sat: 10, body: 6, tie: 5 }, '学歴と仕事');
      c.s.f.welfare = 0;
    } else c.say('調子のいい日と悪い日をくり返しながら、療養を続けた。', { sat: -2 }, '健康');
  };

  // 4 いじめられている同級生に声をかけるか（何十年もあとに、その人に助けられる）
  //   型：小さな親切が何十年も後に回収される（本屋大賞『水車小屋のネネ』『横道世之介』）・預かったものを果たす（直木賞『小さいおうち』）
  arc({ id: 'help', start: function (c) {
    if (c.s.done.help || c.y < 1950 || c.a < 11 || c.a > 14 || !c.p(0.18)) return false;
    var sex = c.r() < 0.5 ? 'm' : 'f';
    c.s.helpName = c.name(sex);
    c.ask('help', 'クラスのこと', 'クラスで' + c.s.helpName + 'がひとりぼっちにされている。声をかける？', [
      { k: 'help', l: '声をかける', w: 0.6 + Math.max(0, c.tr('warm')) + Math.max(0, c.tr('adv')) * 0.5, f: ['family'] },
      { k: 'pass', l: '見て見ぬふりをする', w: 1 - c.tr('warm') * 0.4, f: ['study', 'earn'] }
    ]);
    return true;
  }, res: {
    help: function (c) { c.s.f.helpedName = c.s.helpName; c.say('昼休みに' + c.s.helpName + 'を誘った。最初はぎこちなかったが、帰り道を一緒に歩くようになった。', { tie: 5, sat: 2 }); c.later(15 + Math.floor(c.r() * 25), 'help.back'); },
    pass: function (c) { c.say('何もできなかった。' + c.s.helpName + 'は、春になって転校していった。', { sat: -2 }); c.s.f.regret = c.s.helpName; }
  } });
  N['help.back'] = function (c) {
    if (!c.L.alive || c.s.f.welfare) return;
    c.say(one(c.r, ['同窓会で' + c.s.f.helpedName + 'に会った。「あのとき声をかけてくれたから、学校に行けた」と言われ、胸がいっぱいになった。', '仕事で困っていたとき、取引先の担当として現れたのが' + c.s.f.helpedName + 'だった。話はとんとん拍子にまとまった。']), { sat: 6, tie: 6 });
  };

  // 5 医者を目指す：家にお金がなく国立の薬学部へ。40歳ごろにもう一度受験するか
  //   型：一度降りた舞台にもう一度挑む（本屋大賞『蜜蜂と遠雷』『風が強く吹いている』）・遅咲きの挑戦（ドラマ『カーネーション』『GIFT』）
  //   年収の目安：薬剤師 約599万円、医師 約1429万円（賃金構造基本統計調査。job tag 経由）
  arc({ id: 'doctor', start: function (c) {
    var L = c.L;
    if (c.s.done.doctor || c.y < 1955 || c.a !== 16 || c.s.tal.brain < 1 || c.s.tr.warm < -0.3 || !c.p(0.5)) return false;
    c.say('祖母の入院に付き添ったとき、主治医の姿を見て、医者になりたいと思うようになった。', { learn: 4 }, '学歴と仕事');
    c.later(2, 'doctor.exam');
    return true;
  }, nodes: {
    exam: function (c) {
      var L = c.L;
      if (!c.univ()) return;
      var poor = (L.incPct || 0.5) < 0.6;
      c.ask('doctor.exam', '医学部か、薬学部か', poor ? '私立の医学部に行かせるお金は家にない。国立の医学部は合格ラインに届いていない。どうする？' : '医学部の合格ラインまで、あと少し届いていない。どうする？', [
        { k: 'ronin', l: '浪人して医学部を目指す', w: 0.7 + Math.max(0, c.tr('grit')), f: ['study'] },
        { k: 'pharm', l: '国立の薬学部に進む', w: 1 + Math.max(0, -c.tr('adv')) * 0.5, f: ['earn', 'save', 'family'] }
      ]);
    },
    again: function (c) {
      var L = c.L;
      if (!L.alive || !c.s.f.pharm) return;
      c.ask('doctor.again', 'もう一度、医学部へ', L.age + '歳。薬局で働きながらも、医者になりたい気持ちは消えなかった。仕事を辞めて、医学部を受け直す？', [
        { k: 'retry', l: '仕事を辞めて受け直す', w: 0.4 + Math.max(0, c.tr('dream')) + Math.max(0, c.tr('adv')) * 0.5, f: ['study'] },
        { k: 'stay', l: '薬剤師として生きる', w: 1.2, f: ['earn', 'save', 'family'] }
      ]);
    }
  }, res: {
    ronin: function (c) {
      if (c.p(0.35 + 0.1 * c.tal('brain'))) { c.s.f.md = c.y; c.say('1年浪人し、国立大学の医学部に合格した。', { sat: 8, learn: 6 }, '学歴と仕事'); c.later(6, 'doctor.md'); }
      else { c.s.f.pharm = true; c.say('1年浪人したが、医学部には届かなかった。翌年、国立の薬学部に進んだ。', { sat: -6 }, '学歴と仕事'); c.later(6, 'doctor.ph'); c.later(18 + Math.floor(c.r() * 5), 'doctor.again'); }
    },
    pharm: function (c) { c.s.f.pharm = true; c.say('医学部はあきらめ、国立大学の薬学部に進んだ。白衣を着る仕事だと、自分に言い聞かせた。', { sat: -3 }, '学歴と仕事'); c.later(6, 'doctor.ph'); c.later(18 + Math.floor(c.r() * 5), 'doctor.again'); },
    retry: function (c) {
      c.s.f.retry = c.y;
      c.noJob();
      if (c.p(0.15 + 0.05 * c.tal('brain'))) { c.say('仕事を辞め、予備校に通った。2年目の春、医学部の合格通知が届いた。同級生は20歳近く年下だった。', { sat: 12, learn: 8 }, '学歴と仕事'); c.s.f.md = c.y; c.later(6, 'doctor.md'); }
      else { c.say('仕事を辞めて受け直したが、合格には届かなかった。貯金が尽き、薬局に戻った。それでも、やりきったと思えた。', { sat: -4 }, '学歴と仕事'); c.later(2, 'doctor.ph'); }
    },
    stay: function (c) { c.say('薬剤師として生きると決めた。患者に薬の飲み方を説明する時間を、前より大切にするようになった。', { sat: 3 }); }
  } });
  N['doctor.ph'] = function (c) { if (c.L.alive && c.L.age < 64) { c.job('薬剤師', 5990, true, 'care'); c.say('薬剤師の国家試験に受かり、調剤薬局で働き始めた。', { sat: 4 }, '学歴と仕事'); } };
  N['doctor.md'] = function (c) { if (c.L.alive && c.L.age < 70) { c.job('医師', 14290, true, 'care'); c.say('医師の国家試験に合格し、病院で研修医として働き始めた。', { sat: 10, learn: 6 }, '学歴と仕事'); } };

  // 6 5年付き合った恋人の浮気、30歳の同窓会での再会
  //   型：元恋人や旧友との再会で過去が動く（ドラマ『silent』『最愛』『A LIFE』）・恋人の裏切りのあと（本屋大賞『恋とか愛とかやさしさなら』）
  arc({ id: 'love5', start: function (c) {
    var L = c.L;
    if (c.marryPending() || c.s.done.love5 || c.y < 1965 || c.a < 22 || c.a > 26 || !single(L) || L.sm || !c.p(0.08)) return false;
    c.s.loverName = c.name(L.sex === 'm' ? 'f' : 'm');
    c.say(c.s.loverName + 'と付き合い始めた。', { sat: 4, tie: 4 });
    c.later(4 + Math.floor(c.r() * 2), 'love5.cheat');
    return true;
  }, nodes: {
    cheat: function (c) {
      var L = c.L;
      if (!single(L)) return;
      if (c.p(0.5)) {
        c.s.f.jilted = c.y;
        c.say('5年付き合った' + c.s.loverName + 'に、ほかに好きな人がいると打ち明けられた。結婚の話もしていたのだった。部屋の荷物を片づけるのに、1か月かかった。', { sat: -12, tie: -8 });
        if (L.age <= 30) c.later(Math.max(1, 30 - L.age), 'love5.reunion');
        // 別れたあと連絡をやめられないか（まれ）
        if (c.s.tr.warm > 1 && c.s.tr.grit > 0.8 && c.s.tr.soc < -0.5 && c.p(0.25)) c.later(1, 'stalk.start');
      } else c.say(c.s.loverName + 'とは、どちらからともなく会わなくなった。', { sat: -3 });
    },
    reunion: function (c) {
      if (!single(c.L)) return;
      c.s.classmate = c.name(c.L.sex === 'm' ? 'f' : 'm');
      c.ask('love5.reunion', '同窓会', '気の進まないまま出た同窓会で、中学の同級生の' + c.s.classmate + 'と隣の席になった。話が止まらない。連絡先を聞く？', [
        { k: 'ask', l: '連絡先を聞く', w: 0.6 + Math.max(0, c.tr('soc')) + Math.max(0, c.tr('adv')) * 0.5, f: ['family'] },
        { k: 'no', l: '聞かずに帰る', w: 1, f: ['earn', 'study'] }
      ]);
    }
  }, res: {
    ask: function (c) { c.s.f.reunion = c.y; c.marry(1.6); c.say(c.s.classmate + 'と毎晩のように電話で話すようになった。', { sat: 6, tie: 5 }); },
    no: function (c) { c.say('連絡先は聞かずに帰った。電車の窓に映る自分の顔を、しばらく見ていた。'); }
  } });
  // 結婚が決まった年に、同窓会の相手なら一言そえる（結婚するかどうかは結婚の割合のまま）
  function weddingNote(c, rec) {
    if (!c.s.f.reunion || c.s.f.reunionWed || !c.L.married) return;
    if (!rec.events.some(function (e) { return /結婚した/.test(e.t); })) return;
    c.s.f.reunionWed = true;
    if (c.y - c.s.f.reunion <= 1) c.say('相手は同窓会で再会した' + c.s.classmate + 'だった。会って3か月で結婚を決めた。', { sat: 4 });
  }

  // 7 別れたあと連絡をやめられず、ストーカー容疑で捕まる（まれ）
  //   型：一瞬の過ちの直後に引き返すか（本屋大賞『悪人』『熟柿』）・一時の感情で人生が変わる（芥川賞『ブラックボックス』『共喰い』）
  N['stalk.start'] = function (c) {
    c.ask('stalk', '別れた人', '別れた' + c.s.loverName + 'のことが頭から離れない。SNSを見て、住んでいる場所まで分かってしまった。', [
      { k: 'stop', l: '連絡先を消して、もう見ない', w: 2, f: ['family', 'body', 'study', 'earn', 'save'] },
      { k: 'go', l: '会いに行く', w: 0.4 }
    ]);
  };
  arc({ id: 'stalk', nodes: {}, res: {
    stop: function (c) { c.say('連絡先を消した。友だちに話を聞いてもらい、少しずつ眠れるようになった。', { sat: 2 }); },
    go: function (c) {
      var L = c.L;
      c.s.f.record = c.y;
      c.noJob();
      c.say('何度も家の前で待ち伏せし、警察から警告を受けた。それでもやめられず、ストーカー規制法違反の疑いで逮捕された。勤め先は辞めることになった。', { sat: -18, tie: -12 }, '人間関係');
      c.marry(0.3);
      c.s.sui *= 2;
      c.later(1, 'stalk.after');
    }
  } });
  N['stalk.after'] = function (c) {
    var L = c.L;
    if (!L.alive) return;
    c.job('前科を隠さずに雇ってくれた会社で働く', 2600, false, 'build');
    c.say('面接では前科のことを聞かれ、何社も断られた。最後に拾ってくれたのは、事情を聞いたうえで「うちは過去を問わない」と言った小さな会社だった。', { sat: 2 }, '学歴と仕事');
    if (c.p(0.5)) c.later(3 + Math.floor(c.r() * 5), 'stalk.lonely');
  };
  N['stalk.lonely'] = function (c) {
    if (!c.L.alive || c.L.married) return;
    c.say('結婚相談所に登録したが、事情を話すと話はそこで止まった。夜、ひとりの部屋で考えこむ日が増えた。', { sat: -8, tie: -6 });
    c.s.sui *= 1.5;
  };

  // 8 商社の恋人が海外駐在に。ついていくか、別れるか（仕事を続けたい女性）
  //   型：海外に行くか恋人と残るか（ドラマ『A LIFE』『カムカムエヴリバディ』）・キャリアを中断するか（本屋大賞『自転しながら公転する』）
  arc({ id: 'abroad', start: function (c) {
    var L = c.L;
    if (c.s.done.abroad || L.sex !== 'f' || c.a < 26 || c.a > 32 || !single(L) || !c.E || !L.job || !L.job.reg || L.edu !== '大学' || c.y < 1985 || !c.p(0.06)) return false;
    c.s.partner = c.name('m');
    c.ask('abroad', '海外駐在', '付き合って3年になる商社勤めの' + c.s.partner + 'に、海外駐在が決まった。「一緒に来てほしい」と言われた。', [
      { k: 'follow', l: '仕事を辞めてついていく', w: 0.6 + Math.max(0, c.tr('warm')), f: ['family'] },
      { k: 'long', l: '遠距離で続ける', w: 0.8, f: ['earn'] },
      { k: 'part', l: '仕事を選び、別れる', w: 0.6 + Math.max(0, c.tr('grit')), f: ['earn', 'study', 'save'] }
    ]);
    return true;
  }, res: {
    follow: function (c) { c.marry(1.8); c.noJob(); c.s.f.followed = c.y; c.say('会社を辞め、' + c.s.partner + 'と海を渡ることにした。送別会で、同期がそっと肩をたたいてくれた。', { sat: 2, tie: 6 }, '学歴と仕事'); c.later(5, 'abroad.back'); },
    long: function (c) { if (c.p(0.4)) { c.marry(1.4); c.say('時差のある電話を2年続けた。' + c.s.partner + 'の帰国の日、空港で待った。', { tie: 4 }); } else c.say('最初は毎晩だった電話が週に1度になり、やがて途切れた。', { sat: -8 }); },
    part: function (c) { c.s.f.career = c.y; c.say('悩んだすえ、仕事を選んだ。空港で見送ったあと、ひとりで泣いた。その年、大きな仕事を任された。', { sat: -6, learn: 3 }, '学歴と仕事'); c.later(10 + Math.floor(c.r() * 8), 'abroad.echo'); }
  } });
  N['abroad.back'] = function (c) { if (c.L.alive && c.s.f.followed) c.say('帰国して、もう一度働き始めた。前の会社の同期は管理職になっていた。', { sat: -2 }, '学歴と仕事'); };
  N['abroad.echo'] = function (c) { if (c.L.alive) c.say('昔の恋人が海外で家庭を持ったと、人づてに聞いた。自分の選んだ道を、静かに誇りに思った。', { sat: 3 }); };

  // 9 コネで受付の仕事の誘いが来る
  //   型：お金か愛か・形から入る（ドラマ『やまとなでしこ』『逃げるは恥だが役に立つ』）・親の力に頼るか（ドラマ『半沢直樹』、芥川賞『GO』）
  //   年収の目安：受付事務 約354万円（job tag）
  arc({ id: 'conne', start: function (c) {
    var L = c.L;
    if (c.s.done.conne || c.y < 1965 || L.sex !== 'f' || c.a < 20 || c.a > 23 || (L.incPct || 0) < 0.85 || c.y < 1980 || !c.p(0.25)) return false;
    c.ask('conne', '父の知り合いの会社', '父の取引先の社長から、「うちの受付に来ないか」と声がかかった。', [
      { k: 'take', l: '受付の仕事を受ける', w: 1 + Math.max(0, -c.tr('adv')), f: ['earn', 'family'] },
      { k: 'own', l: '自分で就職先を探す', w: 0.8 + Math.max(0, c.tr('adv')), f: ['study'] }
    ]);
    return true;
  }, res: {
    take: function (c) { c.job('知り合いの会社の受付', 3540, true, 'office'); c.s.f.conne = true; c.say('知り合いの紹介で、大きな会社の受付に座ることになった。毎朝、同じ笑顔であいさつをした。', { sat: 3 }, '学歴と仕事'); if (single(c.L)) c.marry(1.1); },
    own: function (c) { c.say('紹介の話は断った。自分で選んだ会社の面接に、何十社も通った。', { learn: 3, sat: 2 }, '学歴と仕事'); }
  } });

  // 10 口座を売る（特殊詐欺の受け皿）。人生が詰みかけてから、家業で立ち直る
  //   型：困窮のなかで一線を越える（芥川賞『ブラックボックス』、本屋大賞『黄色い家』）・家業を継ぐ（ドラマ『俺の家の話』『下町ロケット』）
  arc({ id: 'account', start: function (c) {
    var L = c.L;
    if (!c.E || c.s.done.account || c.a < 18 || c.a > 25 || c.y < 2005 || (L.incPct || 0.5) > 0.5 || c.s.tr.adv < 0 || !c.p(0.03)) return false;
    c.ask('account', 'もうかる話', '借金の返済に追われていたとき、SNSで「口座を売れば5万円」という話が来た。', [
      { k: 'sell', l: '口座を売る', w: 0.3 + Math.max(0, c.tr('adv')) * 0.4 },
      { k: 'no', l: '怪しい話だと相手にしない', w: 2, f: ['family', 'body', 'study', 'earn', 'save'] }
    ]);
    return true;
  }, res: {
    sell: function (c) {
      c.s.f.account = c.y;
      c.say('通帳とカードを渡した。数か月後、その口座が詐欺に使われていたと警察から連絡が来た。口座は凍結され、新しい口座も作れなくなった。犯罪収益移転防止法違反で罰金を払った。', { sat: -14, tie: -6 }, '人間関係');
      c.noJob();
      c.later(1 + Math.floor(c.r() * 2), 'account.home');
    },
    no: function (c) { c.say('「うまい話には裏がある」と、祖母の口ぐせを思い出して断った。', { sat: 1 }); }
  } });
  N['account.home'] = function (c) {
    var L = c.L, biz = famBiz(L);
    if (!L.alive) return;
    c.ask('account.home', 'これから', '給料の振り込み先さえ作れず、仕事も続かない。' + (biz ? '地元の親が「帰ってきて' + BIZ[bizKey(L)] + 'を手伝え」と言っている。' : '地元に帰れば、親せきの仕事を手伝える。') + '帰る？', [
      { k: 'home', l: '地元に帰る', w: 1.5, f: ['family', 'earn', 'save', 'body'] },
      { k: 'stay', l: 'このまま都会に残る', w: 0.6 + Math.max(0, c.tr('adv')) }
    ], null, 'account2');
  };
  arc({ id: 'account2', nodes: {}, res: {
    home: function (c) {
      var L = c.L, biz = famBiz(L);
      c.move('home');
      c.job(biz ? BIZJOB[bizKey(L)] : '親せきの仕事を手伝う', biz ? BIZPAY[bizKey(L)] : 2400, false, biz ? bizKey(L) : 'agri');
      c.say('頭を下げて地元に帰った。' + (biz ? BIZ[bizKey(L)] : '親せきの仕事場') + 'で朝から晩まで働くうちに、近所の人と笑って話せるようになった。', { sat: 8, tie: 8 }, '学歴と仕事');
      c.base('sat', 4);
    },
    stay: function (c) { c.job('日払いのアルバイト', 1900, false, 'service'); c.say('日払いの仕事を転々とした。', { sat: -4 }, '学歴と仕事'); }
  } });

  // 11 有力者の家の子の事故が、表に出ないまま終わる（まれ）
  //   型：親・家の力と汚名（芥川賞『共喰い』、ドラマ『99.9』『半沢直樹』）
  arc({ id: 'bigwig', start: function (c) {
    if (!c.s.f.bigwig || c.s.done.bigwig || c.a < 18 || c.a > 26 || !c.p(0.12)) return false;
    c.say('酒に酔って車を運転し、人をはねてけがをさせた。地元の議員である父が動き、示談とあちこちへの根回しで、事件は表に出なかった。', { sat: -2, tie: -5 }, '人間関係');
    c.s.f.covered = c.y;
    c.later(15 + Math.floor(c.r() * 15), 'bigwig.echo');
    return true;
  } });
  N['bigwig.echo'] = function (c) { if (c.L.alive) c.say(one(c.r, ['あの夜のことを知る人は、もうほとんどいない。それでも、ふとした拍子に思い出して眠れなくなる。', '事故のけがで足を悪くしたという人の噂を聞いた。会いに行く勇気は出なかった。']), { sat: -4 }); };

  // 12 宝くじで高額が当たる。その後に結婚詐欺
  //   型：成功のあとの転落（芥川賞『サラバ！』、直木賞『邂逅の森』）・怪しい儲け話に巻き込まれる（ドラマ『いつかこの恋を思い出してきっと泣いてしまう』『ちむどんどん』）
  //   1億円以上の当せんは年に約283件（全国自治宝くじ事務協議会の発表の報道、2019年度）。大人1人あたり年に約270万分の1
  arc({ id: 'lotto', start: function (c) {
    if (c.s.done.lotto || c.a < 20 || c.y < 1975 || !c.p(1 / 2700000)) return false;
    c.s.f.lotto = c.y;
    c.say('なんとなく買った宝くじが当たった。1億円だった。売り場の前で、しばらく足が震えた。', { sat: 15 }, '家庭');
    if (single(c.L) && c.p(0.3)) c.later(1 + Math.floor(c.r() * 3), 'lotto.scam');
    return true;
  } });
  N['lotto.scam'] = function (c) {
    if (!c.L.alive || !single(c.L)) return;
    c.say('結婚を約束した相手に「事業の資金に」と頼まれるまま、お金を渡し続けた。ある日、相手とは連絡が取れなくなった。通帳の残りは数万円だった。', { sat: -20, tie: -10 }, '家庭');
    c.s.sui *= 1.3;
  };

  // 13 恋愛リアリティ番組からタレントへ。事故で芸能界を干され、夜の仕事へ
  //   型：芸能界の光と影（ドラマ『あまちゃん』『ブギウギ』）・承認に人生を注ぐ（本屋大賞『推し、燃ゆ』『イン・ザ・メガチャーチ』）・成功の後の転落と再起（芥川賞『サラバ！』）
  arc({ id: 'reality', start: function (c) {
    var L = c.L;
    if (c.s.done.reality || c.a < 19 || c.a > 26 || c.y < 2012 || !gifted(c.s, 'looks') || !single(L) || !c.p(0.15)) return false;
    c.ask('reality', '番組の誘い', 'SNSに載せた写真が目に留まり、恋愛リアリティ番組から出演の誘いが来た。', [
      { k: 'yes', l: '出る', w: 0.5 + Math.max(0, c.tr('adv')) + Math.max(0, c.tr('soc')) * 0.5, f: ['earn'] },
      { k: 'no', l: '人前に出るのはやめておく', w: 1, f: ['family', 'body', 'study', 'save'] }
    ]);
    return true;
  }, res: {
    yes: function (c) {
      c.s.f.tv = c.y;
      c.say('番組に出た。放送のたびに、見知らぬ人から何千ものコメントが届いた。うれしい言葉と同じくらい、ひどい言葉もあった。', { sat: 2, tie: 2 });
      if (c.p(0.35)) { c.later(1, 'reality.cm'); } else c.later(1, 'reality.fade');
    },
    no: function (c) { c.say('出演の話は断った。今の暮らしを大事にしたかった。'); }
  } });
  N['reality.cm'] = function (c) {
    c.job('タレント', 8000, false, 'service');
    c.say('番組の人気が出て、化粧品のCMに起用された。街を歩くと声をかけられるようになった。', { sat: 12 }, '学歴と仕事');
    if (c.p(0.12)) c.later(1 + Math.floor(c.r() * 3), 'reality.crash');
    else c.later(4 + Math.floor(c.r() * 4), 'reality.fade');
  };
  N['reality.crash'] = function (c) {
    c.s.f.crash = c.y;
    c.say('夜道で車を運転していて人をはね、その場から逃げてしまった。翌日、出頭した。番組とCMは打ち切られ、事務所からは違約金を求められた。', { sat: -25, tie: -12 }, '人間関係');
    c.job('夜の店で働く', 3000, false, 'service');
    c.later(1, 'reality.night');
    c.s.sui *= 1.5;
  };
  N['reality.night'] = function (c) { if (c.L.alive) c.say('違約金を返すため、夜の店で働き始めた。昔の自分を知る客に気づかれないよう、名前を変えた。', { sat: -6 }, '学歴と仕事'); };
  N['reality.fade'] = function (c) { if (c.L.alive) { c.say('しばらくすると、声をかけられることも減った。会社勤めに戻り、あの日々を思い出話にできるようになった。', { sat: 1 }, '学歴と仕事'); } };

  // 14 親の介護：施設に入れるか、自分で看るか
  //   型：親の介護で人生を変える（本屋大賞『自転しながら公転する』、ドラマ『俺の家の話』、芥川賞『介護入門』『スクラップ・アンド・ビルド』）
  //   介護・看護を理由に仕事を辞めた人は年に約10万人（就業構造基本調査）
  arc({ id: 'care', start: function (c) {
    var L = c.L, p = parentOld(L, 80);
    if (c.s.done.care || !p || c.a < 40 || c.a > 66 || c.y < 1990 || !c.p(0.045)) return false;
    c.s.careWho = p.role;
    var tox = c.s.f.toxic;
    c.ask('care', p.role + 'の介護', p.role + 'が転んで骨を折り、ひとりで暮らせなくなった。' + (tox ? '子どものころ自分を傷つけた' + p.role + 'だ。' : '') + 'どうする？', [
      { k: 'home', l: '仕事を辞めて自分で看る', w: 0.5 + Math.max(0, c.tr('warm')) * (tox ? 0.3 : 1), f: ['family'] },
      { k: 'work', l: '仕事を続けながら、家で看る', w: 1, f: ['earn', 'family'] },
      { k: 'home2', l: '老人ホームに入ってもらう', w: 0.8 + (tox ? 1 : 0) + Math.max(0, -c.tr('warm')) * 0.5, f: ['body', 'save', 'study'] }
    ]);
    return true;
  }, res: {
    home: function (c) { c.s.f.carer = c.y; c.noJob(); c.say('仕事を辞めて' + c.s.careWho + 'を看ることにした。夜中に何度も起こされ、自分の体も悲鳴をあげた。それでも、' + c.s.careWho + 'が「ありがとう」と言う日もあった。', { body: -10, sat: -6, tie: 6 }, '家庭'); c.later(3 + Math.floor(c.r() * 4), 'care.end'); },
    work: function (c) { c.say('朝に食事を作り、昼はヘルパーに頼み、夜に仕事から帰って' + c.s.careWho + 'を看た。休みの日はほとんどなくなった。', { body: -8, sat: -4 }, '家庭'); if (c.p(0.2)) c.later(2, 'care.quit'); c.later(4, 'care.end'); },
    home2: function (c) { c.say(c.s.careWho + 'に老人ホームに入ってもらった。面会の帰り道、これでよかったのかと何度も考えた。', { sat: -2 }, '家庭'); c.later(4, 'care.end'); }
  } });
  N['care.quit'] = function (c) { if (c.L.job && c.L.alive) { c.noJob(); c.say('両立に限界を感じ、仕事を辞めた。', { sat: -6 }, '学歴と仕事'); } };
  N['care.end'] = function (c) { if (c.L.alive && c.s.f.carer && c.L.age < 62 && !c.L.job) { c.job('介護の経験を生かして介護の仕事', 3500, false, 'care'); c.say(c.s.careWho + 'を看た経験を生かして、介護の仕事に就いた。', { sat: 4 }, '学歴と仕事'); } };

  // 15 家業を継ぐか（夢の筋に入らなかった人）
  //   型：家業を継ぐか外へ出るか（ドラマ『下町ロケット』『俺の家の話』、直木賞『銀河鉄道の父』『等伯』）
  arc({ id: 'biz', start: function (c) {
    var L = c.L;
    if (c.s.done.biz || c.y < 1955 || c.s.done.dream || !famBiz(L) || c.a < 24 || c.a > 34 || !L.dad || !L.dad.alive || bizKey(L) === L.lastInd || !c.p(0.12)) return false;
    c.ask('biz', '家業', '父から「' + BIZ[bizKey(L)] + 'を継いでくれないか」と言われた。', [
      { k: 'yes', l: '継ぐ', w: 0.6 + Math.max(0, c.tr('warm')), f: ['family'] },
      { k: 'no', l: '今の仕事を続ける', w: 1 + Math.max(0, c.tr('adv')) * 0.5, f: ['earn', 'study'] }
    ]);
    return true;
  }, res: {
    yes: function (c) { var L = c.L; c.move('home'); c.job(BIZJOB[bizKey(L)], BIZPAY[bizKey(L)], false, bizKey(L)); c.say('勤めを辞めて、' + BIZ[bizKey(L)] + 'を継いだ。父のやり方とぶつかりながら、少しずつ自分のやり方を見つけた。', { sat: 3, tie: 6 }, '学歴と仕事'); },
    no: function (c) { c.say('「自分の道を行かせてほしい」と伝えた。父はしばらく黙っていた。', { tie: -3 }); c.s.f.bizNo = true; if (c.p(0.5)) c.later(15 + Math.floor(c.r() * 10), 'biz.close'); }
  } });
  N['biz.close'] = function (c) { if (c.L.alive) c.say('父が' + BIZ[bizKey(c.L)] + 'をたたんだ。最後の日、手伝いに帰った。', { sat: -3, tie: 3 }); };

  // 16 あまり知られていない仕事（最初の仕事のときに、まれに選ばれる）。年収は千円・2025年の物価
  //   出どころ：job tag（賃金構造基本統計調査）と各団体・報道。分からないものは使わない
  var RARE = [
    { l: 'テレビ番組の音声スタッフ', pay: 4709, ind: 'service', from: 1975, t: 'テレビの技術会社に入り、音声スタッフになった。ロケでは大きなマイクを抱えて走った。' },
    { l: 'テレビ番組のアシスタントディレクター', pay: 3500, ind: 'service', from: 1975, t: '番組制作会社に入り、アシスタントディレクターになった。徹夜の編集明けに見る朝日が、まぶしかった。' },
    { l: 'テレビカメラマン', pay: 4922, ind: 'service', from: 1975, t: '技術会社に入り、テレビカメラマンの見習いになった。' },
    { l: 'ゴルフ場のキャディ', pay: 1950, ind: 'service', from: 1975, t: 'ゴルフ場でキャディとして働き始めた。夏の芝の照り返しで、毎日真っ黒に日焼けした。', nonreg: true },
    { l: 'セキュリティ技術者（ホワイトハッカー）', pay: 7000, ind: 'office', from: 2005, brain: true, t: 'セキュリティ会社に入り、企業のシステムの弱いところを探す仕事に就いた。' },
    { l: '航空管制官', pay: 5833, ind: 'pub', from: 1975, brain: true, t: '航空管制官の試験に受かり、空港の管制塔で働き始めた。' },
    { l: '動物園の飼育員', pay: 3608, ind: 'pub', from: 1975, t: '動物園の飼育員になった。担当の動物が初めて手から餌を食べた日を、ずっと覚えている。' },
    { l: '特殊清掃・遺品整理', pay: 3600, ind: 'service', from: 2005, t: '特殊清掃と遺品整理の会社で働き始めた。ひとりで亡くなった人の部屋を、手を合わせてから片づける。' },
    { l: '市場のせり人', pay: 6645, ind: 'shop', from: 1975, t: '卸売市場の会社に入り、せり人になった。夜明け前の市場に、威勢のいい声が響く。' },
    { l: '潜水士', pay: 4669, ind: 'build', from: 1975, sport: true, t: '潜水士の資格を取り、港の工事で海に潜る仕事に就いた。' },
    { l: '手話通訳者', pay: 5833, ind: 'care', from: 1985, t: '手話通訳士の試験に受かり、手話通訳の仕事に就いた。' },
    { l: '通訳ガイド', pay: 4027, ind: 'service', from: 1985, t: '通訳ガイドの資格を取り、外国からの旅行者を案内する仕事に就いた。' },
    { l: '鉄道の運転士', pay: 7192, ind: 'pub', from: 1975, t: '鉄道会社で駅員と車掌を経て、運転士の免許を取った。初めて運転席に座った朝、手が少し震えた。' },
    { l: '航空整備士', pay: 5980, ind: 'factory', from: 1975, hand: true, t: '航空整備士の資格を取り、空港で飛行機の整備をする仕事に就いた。' },
    { l: '杜氏を目指す蔵人', pay: 3500, ind: 'factory', from: 1975, hand: true, t: '酒蔵に入り、蔵人として酒造りを覚え始めた。冬の蔵は、吐く息まで白かった。' },
    { l: '宮大工の見習い', pay: 3000, ind: 'build', from: 1975, hand: true, t: '宮大工の棟梁に弟子入りした。最初の3年は、道具の手入れと掃除ばかりだった。' },
    { l: '林業の作業員', pay: 3608, ind: 'agri', from: 1975, t: '森林組合に入り、山で木を切る仕事に就いた。' },
    { l: 'ネイリスト', pay: 3539, ind: 'service', from: 1990, hand: true, t: 'ネイルの専門学校を出て、ネイルサロンで働き始めた。' },
    { l: '商業カメラマンのアシスタント', pay: 3000, ind: 'service', from: 1975, art: true, t: '写真スタジオでカメラマンのアシスタントになった。' }
  ];
  arc({ id: 'rare', start: function (c) {
    var L = c.L;
    if (c.s.done.rare || !c.E || !L.job || L.job.pay != null || L.job.since !== c.y || c.a > 30 || !c.p(0.18)) return false;
    var ok = RARE.filter(function (j) { return c.y >= j.from && (!j.brain || c.s.tal.brain > 0.5) && (!j.hand || c.s.tal.hand > 0) && (!j.sport || c.s.tal.sport > 0) && (!j.art || c.s.tal.art > 0); });
    if (!ok.length) return false;
    var j = one(c.r, ok);
    c.job(j.l, j.pay, !j.nonreg && L.job.reg, j.ind);
    c.say(j.t, { sat: 3 }, '学歴と仕事');
    return true;
  } });

  // 17 狭き門の道（中学・高校のころに得意がずば抜けている子）
  //   ボートレーサー：応募から修了まで約2%、平均年収約1900万円／力士：関取（十両）で月給120万円（2027年から）、幕下以下は場所手当のみ
  //   将棋：奨励会は26歳までに四段（年4人）／騎手：競馬学校は20倍超。年収は上位と下位の差がとても大きい
  //   型：師匠への弟子入り（ドラマ『ちりとてちん』『スカーレット』）・夢に期限を決める（芥川賞『火花』、本屋大賞『羊と鋼の森』）
  arc({ id: 'narrow', start: function (c) {
    var L = c.L;
    if (c.s.done.narrow || c.y < 1955 || c.a < 14 || c.a > 16 || L.married) return false;
    var opt = null;
    if (gifted(c.s, 'sport') && L.sex === 'm' && c.r() < 0.3) opt = 'sumo';
    else if (gifted(c.s, 'sport') && c.r() < 0.5) opt = 'boat';
    else if (gifted(c.s, 'brain') && c.s.tr.grit > 0.5 && c.r() < 0.3) opt = 'shogi';
    if (!opt || !c.p(0.3)) return false;
    c.s.narrow = opt;
    var q = { sumo: '体の大きさを見込まれ、相撲部屋の親方から「うちに来ないか」と声がかかった。', boat: 'ボートレーサー養成所の試験を受けてみないかと、部活の顧問に言われた。', shogi: '将棋の大会で勝ち進み、プロ棋士の養成機関「奨励会」を受けないかと勧められた。' }[opt];
    c.ask('narrow', '狭き門', q + '挑戦する？', [
      { k: 'go', l: '挑戦する', w: 0.5 + Math.max(0, c.tr('adv')) + Math.max(0, c.tr('dream')) * 0.5, f: ['study', 'body'] },
      { k: 'no', l: '普通に進学する', w: 1, f: ['family', 'save', 'earn'] }
    ]);
    return true;
  }, res: {
    go: function (c) {
      var o = c.s.narrow;
      if (o === 'sumo') { c.job('力士（幕下以下）', 900, false, 'service'); c.s.f.sumo = c.y; c.say('中学を出て相撲部屋に入った。ちゃんこ番と稽古の毎日が始まった。', { body: 6, tie: 4 }, '学歴と仕事'); c.later(5 + Math.floor(c.r() * 3), 'narrow.sumo'); }
      else if (o === 'boat') { if (c.p(0.12)) { c.job('ボートレーサー', 19000, false, 'service'); c.say('倍率20倍を超える試験に受かり、1年の訓練を経てボートレーサーとしてデビューした。', { sat: 14 }, '学歴と仕事'); } else c.say('養成所の試験を受けたが、落ちた。悔しくて、その夜は眠れなかった。', { sat: -5 }, '学歴と仕事'); }
      else { c.s.f.shogi = c.y; c.say('奨励会に入った。26歳までに四段に上がれなければ、プロにはなれない。', { learn: 6 }, '学歴と仕事'); c.later(10 - Math.floor(c.r() * 3), 'narrow.shogi'); }
    },
    no: function (c) { c.say(({ sumo: '相撲部屋', boat: 'ボートレーサーの養成所', shogi: '将棋の奨励会' }[c.s.narrow] || 'その道') + 'に進むのはやめ、迷ったすえ、普通に進学することにした。', { sat: -1 }); c.s.f.narrowNo = true; }
  } });
  N['narrow.sumo'] = function (c) {
    if (!c.L.alive) return;
    if (c.p(0.1)) { c.job('力士（関取）', 14400, false, 'service'); c.say('十両に上がり、関取になった。初めて大銀杏を結った日、親方が黙ってうなずいた。', { sat: 15 }, '学歴と仕事'); }
    else { c.job('ちゃんこ店で働く', 3000, false, 'service'); c.say('幕下から上がれないまま、まわしを外した。部屋の先輩の紹介で、ちゃんこ店で働き始めた。', { sat: -4 }, '学歴と仕事'); }
  };
  N['narrow.shogi'] = function (c) {
    if (!c.L.alive) return;
    if (c.p(0.2)) { c.job('プロ棋士', 6000, false, 'service'); c.say('三段リーグを抜け、四段に上がった。プロ棋士になった。', { sat: 15, learn: 6 }, '学歴と仕事'); }
    else { c.say('26歳の誕生日を迎え、奨励会を退会した。将棋だけの青春だった。何をすればいいのか分からないまま、アルバイトを始めた。', { sat: -10 }, '学歴と仕事'); c.job('アルバイト', 1900, false, 'service'); c.later(3, 'narrow.after'); }
  };
  N['narrow.after'] = function (c) { if (c.L.alive) { c.job('将棋教室の講師', 2800, false, 'service'); c.say('子ども向けの将棋教室で教えることになった。負けて泣く子に、自分の昔を重ねた。', { sat: 6 }, '学歴と仕事'); } };

  // 18 職場で自分の性のあり方を打ち明けるか（性的少数者の人）
  //   型：自分の秘密を明かすか（本屋大賞『正欲』『52ヘルツのクジラたち』、ドラマ『隣の家族は青く見える』『虎に翼』）
  arc({ id: 'outwork', start: function (c) {
    var L = c.L;
    if (c.s.done.outwork || !c.E || !L.sm || c.a < 25 || c.a > 45 || !L.job || c.y < 2000 || !c.p(0.08)) return false;
    c.ask('outwork', '職場で', '職場の飲み会で、「結婚はまだ？」と聞かれた。本当のことを話す？', [
      { k: 'tell', l: '打ち明ける', w: 0.5 + Math.max(0, c.tr('adv')) + (c.y >= 2015 ? 0.4 : 0), f: ['family'] },
      { k: 'hide', l: 'はぐらかす', w: 1, f: ['earn', 'save'] }
    ]);
    return true;
  }, res: {
    tell: function (c) { if (c.p(c.y >= 2015 ? 0.7 : 0.45)) c.say('打ち明けた。隣の席の同僚が「話してくれてありがとう」と言った。翌日から、職場の空気が少し軽くなった。', { sat: 8, tie: 6 }); else c.say('打ち明けた。その日から、陰で噂されるようになった。', { sat: -8, tie: -6 }); },
    hide: function (c) { c.say('笑ってはぐらかした。帰り道、少しだけ胸が痛んだ。', { sat: -2 }); }
  } });

  // 19 出向・左遷の打診
  //   型：左遷・出向を受け入れて再起（ドラマ『半沢直樹』『集団左遷!!』『ノーサイド・ゲーム』）
  arc({ id: 'shukko', start: function (c) {
    var L = c.L;
    if (c.s.done.shukko || !c.E || !L.job || !L.job.reg || L.job.pay != null || c.a < 38 || c.a > 52 || L.job.ind !== 'office' || !c.p(0.05)) return false;
    c.ask('shukko', '出向', '上司のミスの責任を負わされ、地方の子会社への出向を言い渡された。', [
      { k: 'go', l: '受け入れて出向する', w: 1 + Math.max(0, c.tr('grit')), f: ['family', 'save'] },
      { k: 'quit', l: '会社を辞める', w: 0.5 + Math.max(0, c.tr('adv')), f: ['study', 'earn'] }
    ]);
    return true;
  }, res: {
    go: function (c) { c.say('地方の子会社に移った。慣れない現場で頭を下げるうちに、工場の人たちと酒を飲む仲になった。', { sat: -4, tie: 4 }, '学歴と仕事'); if (c.p(0.3)) c.later(3, 'shukko.back'); },
    quit: function (c) { c.noJob(); c.say('会社を辞めた。家族には、しばらく言い出せなかった。', { sat: -8 }, '学歴と仕事'); c.later(1, 'shukko.next'); }
  } });
  N['shukko.back'] = function (c) { if (c.L.alive && c.L.job) c.say('子会社で立て直した事業が評価され、本社に呼び戻された。', { sat: 10 }, '学歴と仕事'); };
  N['shukko.next'] = function (c) { if (c.L.alive && !c.L.job && c.L.age < 64) { c.job('中小企業に転職', 4000, true, 'office'); c.say('取引先だった小さな会社に誘われ、転職した。給料は下がったが、自分の名前で仕事ができるようになった。', { sat: 6 }, '学歴と仕事'); } };

  // 20 定年のあとの挑戦
  //   型：遅咲き・晩年の挑戦（ドラマ『カーネーション』『あんぱん』、芥川賞『おらおらでひとりいぐも』）
  arc({ id: 'late', start: function (c) {
    var L = c.L;
    if (c.s.done.late || c.y < 1960 || c.a < 62 || c.a > 70 || (c.E ? L.stage !== 'retired' : c.a < 65) || !c.p(0.12)) return false;
    var what = c.s.dream ? { music: 'ギター教室', art: '絵画教室', talk: '落語教室', looks: '社交ダンス', voice: '朗読の会' }[c.s.dream] : one(c.r, ['大学の公開講座', '蕎麦打ち教室', '俳句の会', '地域の歴史を調べる会']);
    c.ask('late', 'これからの時間', '定年を迎え、時間ができた。前から気になっていた' + what + 'に通ってみる？', [
      { k: 'go', l: '通ってみる', w: 0.8 + Math.max(0, c.tr('adv')) + Math.max(0, c.tr('soc')) * 0.5, f: ['study', 'body'] },
      { k: 'no', l: '家でのんびり過ごす', w: 1, f: ['save', 'family'] }
    ]);
    c.s.lateWhat = what;
    return true;
  }, res: {
    go: function (c) { c.say(c.s.lateWhat + 'に通い始めた。' + (c.s.f.dreamDrop || c.s.f.dreamSide ? '若いころにしまった夢の続きを、ようやく始められた気がした。' : '新しい仲間ができた。'), { sat: 8, tie: 6, learn: 4 }); c.base('sat', 3); },
    no: function (c) { c.say((c.s.lateWhat || '習いごと') + 'に通うのはやめ、家で過ごす時間を楽しむことにした。', { sat: 1 }); }
  } });

  /* ========== 昔の暮らし（江戸・幕末明治・大正昭和） ========== */
  function edo(c) { return c.y >= 1603 && c.y <= 1867; }
  function heian(c) { return c.y < 1185; }

  // 21 お伊勢参り（江戸の庶民の一生に一度の旅。伊勢講の代参・抜け参り・おかげ参りの年）
  //   型：お伊勢参りに行けるか・抜け参り（『東海道中膝栗毛』、大河『べらぼう』）・物詣での旅（『源氏物語』、大河『光る君へ』）
  //   おかげ参り：1705年に約362万人、1771年に約207万人、1830年に430万〜500万人（研究の推計）。伊勢講で積み立て、くじで代参を決めた
  var OKAGE = { 1650: 1, 1705: 1, 1771: 1, 1830: 1 };
  arc({ id: 'ise', start: function (c) {
    var L = c.L;
    if (c.s.done.ise || !c.O || c.y < 1640 || c.y > 1890 || !c.common() || L.abroad || L.pref === '47' || L.pref === '01' || c.a < 12 || c.a > 65) return false;
    var okage = !!OKAGE[c.y];
    var p = okage ? 0.35 : (c.a >= 18 ? 0.022 : 0.004) * (L.prov === '伊勢' ? 0.3 : 1) * (c.s.persona === 'iseFan' ? 4 : 1);
    if (!c.p(p)) return false;
    c.s.iseOkage = okage;
    var young = c.a < 20 || (L.hoko && !L.hoko.done);
    var q = okage ? (young ? '国じゅうで「おかげ参り」が始まった。奉公先や親に黙って、伊勢へ抜け参りに出る？' : '国じゅうで「おかげ参り」が始まった。村の人たちと伊勢へ向かう？')
      : (young ? '村の若者たちが、親に黙って伊勢へ抜け参りに出ると言っている。一緒に行く？' : '村の伊勢講のくじで、伊勢参りの代参に選ばれた。行く？');
    c.ask('ise', 'お伊勢参り', q, [
      { k: 'go', l: '伊勢へ行く', w: 2 + Math.max(0, c.tr('adv')) + Math.max(0, c.tr('dream')) * 0.5, f: ['family', 'study', 'body', 'earn', 'save'] },
      { k: 'no', l: young ? '行かない' : 'ほかの人に譲る', w: 0.5 + Math.max(0, -c.tr('adv')) * 0.5 }
    ]);
    return true;
  }, res: {
    go: function (c) {
      var L = c.L, from = L.prov === '伊勢' ? '' : '何日も歩いて';
      c.s.f.ise = c.y;
      c.say((c.s.iseOkage ? '道の両側で村人が握り飯や草鞋をふるまう中、' : '') + from + '伊勢に着いた。御師の家で神楽を見て、大きな鳥居をくぐった。' + (c.poor() ? '貧しい暮らしの中で、一生に一度の夢がかなった。' : '一生の思い出になった。'), { sat: c.poor() ? 22 : 15, tie: 4 }, '地域');
      c.say(one(c.r, ['宿で相部屋になった旅人と夜通し話しこみ、翌朝には兄弟のように別れを惜しんだ。', '茶屋の名物の餅を食べすぎて、連れに笑われた。', '道中で路銀を入れた巾着を落としかけ、通りがかりの人に拾ってもらった。', '帰り道、土産の伊勢暦とお札を大事に抱えて歩いた。']), null, '地域');
      c.base('sat', c.poor() ? 4 : 2);
      if (c.p(0.04)) c.later(0, 'ise.ill');
      c.later(20 + Math.floor(c.r() * 15), 'ise.echo');
    },
    no: function (c) { c.say('伊勢行きはあきらめた。旅立つ人たちの背中を、村の外れで見送った。', { sat: -2 }, '地域'); c.s.f.iseMissed = true; }
  } });
  N['ise.ill'] = function (c) { c.say('旅の途中で熱を出し、宿で十日ほど寝込んだ。宿の人に看病され、なんとか村へ帰り着いた。', { body: -8 }, '健康'); };
  N['ise.echo'] = function (c) { if (c.L.alive && c.s.f.ise) c.say('孫たちに、若いころの伊勢参りの話を何度も聞かせた。話すたびに、道中の出来事が少しずつ大きくなった。', { sat: 3, tie: 3 }, '家庭'); };

  // 22 大名行列で見初められ、屋敷奉公から側室へ。生まれた家が栄える（まれ）
  //   型：大名の目に留まり側室に（大河『葵 徳川三代』『篤姫』、『源氏物語』）・女中奉公・行儀見習い（大河『篤姫』『べらぼう』）
  arc({ id: 'gyoretsu', start: function (c) {
    var L = c.L;
    if (c.marryPending() || c.s.done.gyoretsu || !c.O || L.sex !== 'f' || c.y < 1635 || c.y > 1862 || ['hyakusho', 'chonin'].indexOf(L.status) < 0 || c.a < 13 || c.a > 18 || L.married || c.s.tal.looks < 1.3 || !c.p(0.05)) return false;
    c.ask('gyoretsu', '大名行列', '街道を通る大名行列に、道ばたで伏せていた。駕籠の脇の侍がこちらを見て、あとで村役人を通して「屋敷に奉公に上がらないか」と言ってきた。', [
      { k: 'go', l: '屋敷奉公に上がる', w: 1 + Math.max(0, c.tr('adv')), f: ['earn', 'study'] },
      { k: 'no', l: '断って村に残る', w: 0.8 + Math.max(0, c.tr('warm')) * 0.5, f: ['family'] }
    ]);
    return true;
  }, res: {
    go: function (c) {
      c.s.f.yashiki = c.y;
      c.move('edo');
      c.job('大名屋敷の奥女中', 2000, false, 'maid'); c.mode('hoko');
      c.say('江戸の大名屋敷に奥女中として上がった。言葉づかいから歩き方まで、一から仕込まれた。', { sat: 4, tie: -4, learn: 4 }, '学歴と仕事');
      c.later(2 + Math.floor(c.r() * 3), 'gyoretsu.next');
    },
    no: function (c) { c.say('屋敷奉公の話は断った。村の暮らしを選んだ。', { sat: -1 }); }
  } });
  N['gyoretsu.next'] = function (c) {
    var L = c.L;
    if (!L.alive || L.married) return;
    if (c.p(0.3)) {
      c.s.f.sokushitsu = c.y; c.s.f.prosper = c.y;
      c.job('大名の側室', 9000, false, 'maid');
      c.say('殿の目に留まり、側室に迎えられた。実家には扶持が与えられ、田畑を買い足して村一番の家になった。', { sat: 12, tie: -2 }, '家庭');
      c.base('sat', 3);
      c.later(20 + Math.floor(c.r() * 10), 'gyoretsu.echo');
    } else {
      c.move('home');
      c.job('家の田畑の仕事', 1800, false, 'farm');
      c.say('奉公の年季が明けて村へ帰った。屋敷で身につけた作法が評判になり、よい縁談がいくつも舞い込んだ。', { sat: 4 }, '学歴と仕事');
      c.marry(2);
    }
  };
  N['gyoretsu.echo'] = function (c) { if (c.L.alive) c.say('実家の甥から便りが来た。家は庄屋を務めるまでになり、村の人から「お屋敷さまのご実家」と呼ばれているという。', { sat: 4 }, '家庭'); };

  // 23 庄屋の跡取りの失恋。引きこもり、田畑が荒れ、村全体が年貢の肩代わりをする
  //   型：身分違いの恋（直木賞『恋歌』『邂逅の森』、『曽根崎心中』）・跡取りの挫折が家と村に及ぶ（大河『西郷どん』、芥川賞『共喰い』）
  //   村請制：年貢は村全体で納めるため、1軒の未納は村の負担になった
  arc({ id: 'shoya', start: function (c) {
    var L = c.L;
    if (c.marryPending() || c.s.done.shoya || !c.O || L.sex !== 'm' || L.status !== 'hyakusho' || !edo(c) || (L.incPct || 0) < 0.85 || c.a < 17 || c.a > 23 || L.married || !c.p(0.06)) return false;
    c.s.koi = c.name('f');
    c.ask('shoya', '想い人', '小作の家の娘、' + c.s.koi + 'を好きになった。庄屋の跡取りとして、親は別の家との縁談を進めている。', [
      { k: 'tell', l: '想いを打ち明け、親に頼みこむ', w: 0.6 + Math.max(0, c.tr('warm')) + Math.max(0, c.tr('adv')) * 0.5, f: ['family'] },
      { k: 'give', l: 'あきらめて親の決めた縁談を受ける', w: 1, f: ['earn', 'save', 'study'] }
    ]);
    return true;
  }, res: {
    tell: function (c) {
      if (c.p(0.25)) { c.say('三日三晩頼みこみ、ついに親が折れた。' + c.s.koi + 'を嫁に迎えることが決まった。村では「庄屋の若旦那が」としばらく噂になった。', { sat: 12, tie: 6 }); c.marry(5); return; }
      c.s.f.heartbreak = c.y;
      c.say('親は首を縦にふらなかった。' + c.s.koi + 'は、まもなく隣村へ嫁いでいった。', { sat: -14, tie: -6 });
      if (c.s.tr.grit < 0.3) c.later(1, 'shoya.hide');
    },
    give: function (c) { c.say('想いは胸にしまい、親の決めた縁談を受けた。', { sat: -6 }); c.marry(3); }
  } });
  N['shoya.hide'] = function (c) {
    if (!c.L.alive) return;
    c.s.f.hikikomori = c.y;
    c.say('部屋にこもり、田畑にも出なくなった。心配した母も寝込み、家の田は草に覆われた。', { sat: -12, body: -6, tie: -8 }, '家庭');
    c.later(1, 'shoya.village');
  };
  N['shoya.village'] = function (c) {
    if (!c.L.alive) return;
    c.say('その年、家の分の年貢を納められなかった。村請のため、足りない分は村の家々が少しずつ出し合った。藩の役人が村に来て、名主の家が厳しく叱られた。', { sat: -6, tie: -6 }, '地域');
    c.ask('shoya.up', '立ち直るか', '寄り合いで、村の年寄りに「このままでは村がもたない」と言われた。田に戻る？', [
      { k: 'up', l: '田に戻る', w: 1 + Math.max(0, c.tr('warm')), f: ['family', 'earn', 'body'] },
      { k: 'down', l: 'まだ部屋から出られない', w: 0.6 + Math.max(0, -c.tr('grit')) }
    ], null, 'shoya2');
  };
  arc({ id: 'shoya2', nodes: {}, res: {
    up: function (c) { c.say('鍬を握り直した。村の若い衆が手伝いに来てくれた。秋、実った稲を見て、久しぶりに声を出して笑った。', { sat: 10, tie: 8, body: 4 }, '家庭'); c.base('sat', 2); },
    down: function (c) { c.say('部屋から出られない日が続いた。家の田は親戚が預かることになり、庄屋の役は別の家に移った。', { sat: -8, tie: -6 }, '家庭'); c.base('sat', -3); }
  } });

  // 24 貧しい家の子が力士を志す（勧進相撲）
  //   型：村を出て一旗あげる（大河『秀吉』『豊臣兄弟!』）・師匠への弟子入り（ドラマ『ちりとてちん』『スカーレット』）
  //   大名のお抱え力士は扶持をもらい、武士に準じる扱いを受けた（研究の目安。給金の額は分からない）
  arc({ id: 'sumoOld', start: function (c) {
    var L = c.L;
    if (c.s.done.sumoOld || !c.O || L.sex !== 'm' || c.y < 1700 || c.y > 1920 || !c.common() || !c.poor() || c.a < 14 || c.a > 18 || c.s.tal.sport < 1.2 || !c.p(0.2)) return false;
    c.ask('sumoOld', '相撲', '村の祭りの草相撲で大人を次々に投げ飛ばした。見物に来ていた相撲取りに「江戸に出て相撲取りにならないか」と誘われた。', [
      { k: 'go', l: '江戸に出て相撲取りになる', w: 0.8 + Math.max(0, c.tr('adv')) + Math.max(0, c.tr('dream')) * 0.5, f: ['body', 'earn'] },
      { k: 'no', l: '村に残る', w: 1 + Math.max(0, c.tr('warm')) * 0.5, f: ['family', 'save'] }
    ]);
    return true;
  }, res: {
    go: function (c) {
      c.move('edo');
      c.job('相撲取りの見習い', 1200, false, 'craft'); c.mode('away');
      c.say('親方の部屋に入り、相撲取りの見習いになった。腹いっぱい食べられることが、何よりうれしかった。', { body: 6, sat: 6, tie: -4 }, '学歴と仕事');
      c.later(5 + Math.floor(c.r() * 4), 'sumoOld.next');
    },
    no: function (c) { c.say('村に残った。それからも、祭りの草相撲では毎年大関を張った。', { sat: 2, tie: 3 }); }
  } });
  N['sumoOld.next'] = function (c) {
    if (!c.L.alive) return;
    if (c.p(0.12)) { c.job('大名のお抱え力士', 7000, false, 'craft'); c.say('番付を上げ、大名のお抱え力士になった。扶持をもらい、刀を差して歩くことを許された。故郷の親に、米俵を送った。', { sat: 15, tie: 4 }, '学歴と仕事'); c.base('sat', 3); }
    else { c.move('home'); c.job('家の田畑の仕事', 1500, false, 'farm'); c.say('けがで番付が上がらず、相撲をやめて村へ帰った。村の子どもたちに相撲を教えるのが楽しみになった。', { sat: -3, tie: 4 }, '学歴と仕事'); }
  };

  // 25 将棋の家元の内弟子。才能はあるが、遊びに溺れる
  //   型：芸の家の才ある放蕩息子・何かにのめり込む（芥川賞『推し、燃ゆ』『火花』、『徒然草』の芸の道の段）・師匠を継ぐか独立か（直木賞『渦』『等伯』）
  //   将棋の家元（大橋家・伊藤家）は幕府から扶持を受けた（大橋家50石5人扶持など）
  arc({ id: 'shogiOld', start: function (c) {
    var L = c.L;
    if (c.s.done.shogiOld || !c.O || L.sex !== 'm' || !edo(c) || c.y < 1650 || ['chonin', 'bushi'].indexOf(L.status) < 0 || L.kind !== 'city' || c.a < 9 || c.a > 13 || c.s.tal.brain < 1.4 || !c.p(0.25)) return false;
    c.ask('shogiOld', '将棋', '町の将棋会所で大人を負かしてばかりいると、将棋の家元の目に留まった。「内弟子に来ないか」と言われた。', [
      { k: 'go', l: '内弟子に入る', w: 1 + Math.max(0, c.tr('adv')), f: ['study'] },
      { k: 'no', l: '家の仕事を継ぐ', w: 0.8, f: ['family', 'earn'] }
    ]);
    return true;
  }, res: {
    go: function (c) {
      c.s.f.shogi = c.y;
      c.say('家元の屋敷に住みこみ、内弟子になった。朝から晩まで盤に向かった。', { learn: 8, tie: -3 }, '学歴と仕事');
      if (c.s.tr.adv > 0.5 && c.s.tr.grit < 0.3) c.later(5 + Math.floor(c.r() * 3), 'shogiOld.bad');
      else c.later(8 + Math.floor(c.r() * 5), 'shogiOld.good');
    },
    no: function (c) { c.say('家元の誘いは断り、家の仕事を継ぐことにした。将棋は夜の楽しみになった。', { sat: -1 }); }
  } });
  N['shogiOld.bad'] = function (c) {
    if (!c.L.alive) return;
    c.ask('shogiOld.bad', '夜の町', '腕は兄弟子をしのぐほどになったが、賭け将棋と吉原通いがやめられない。師匠に呼ばれ、「次はない」と言われた。', [
      { k: 'mend', l: '行いを改める', w: 0.6 + Math.max(0, c.tr('grit')) + Math.max(0, c.tr('warm')) * 0.5, f: ['study', 'family', 'save'] },
      { k: 'keep', l: 'やめられない', w: 1 + Math.max(0, c.tr('adv')) * 0.5 }
    ], null, 'shogiOld2');
  };
  arc({ id: 'shogiOld2', nodes: {}, res: {
    mend: function (c) { c.say('賭け将棋から足を洗い、師匠の前で頭を下げた。その年の御城将棋で、初めて大名の前に座った。', { sat: 8, learn: 6 }, '学歴と仕事'); c.later(4, 'shogiOld.good'); },
    keep: function (c) { c.job('賭け将棋で暮らす', 1500, false, 'craft'); c.say('破門された。腕一本で賭け将棋をして暮らしたが、借金はふくらむばかりだった。', { sat: -10, tie: -8 }, '学歴と仕事'); }
  } });
  N['shogiOld.good'] = function (c) { if (c.L.alive) { c.job('将棋の家元の門下で指す', 4000, false, 'craft'); c.say('家元の門下として、段を許された。御城将棋に出る日の朝は、身が引きしまった。', { sat: 10, learn: 4 }, '学歴と仕事'); } };

  // 26 遊郭に売られた娘。身請けか、年季明けか
  //   型：身請けか足抜けか（大河『べらぼう』、『曽根崎心中』、直木賞『吉原手引草』『漂砂のうたう』）
  //   年季は「10年・27歳まで」が原則とされた（研究の目安）
  arc({ id: 'yukaku', start: function (c) {
    var L = c.L;
    if (c.s.done.yukaku || !c.O || L.sex !== 'f' || c.y < 1620 || c.y > 1956 || ['hyakusho', 'genin', 'heimin', 'chonin'].indexOf(L.status) < 0 || (L.incPct || 0.5) > 0.12 || c.a < 12 || c.a > 16 || L.married || !c.p(0.04)) return false;
    c.s.f.yukaku = c.y;
    c.move(c.y < 1868 ? 'edo' : 'tokyo');
    c.job('遊郭の女郎', 2500, false, 'maid'); c.mode('away');
    c.say('凶作の年、借金を返すために、遊郭へ年季奉公に出されることになった。親は泣いていた。年季は10年と決められた。', { sat: -20, tie: -10 }, '家庭');
    c.later(5 + Math.floor(c.r() * 4), 'yukaku.next');
    return true;
  } });
  N['yukaku.next'] = function (c) {
    if (!c.L.alive) return;
    var rich = c.s.tal.looks > 0.8 && c.p(0.35);
    c.ask('yukaku.next', rich ? '身請けの話' : '年季', rich ? 'なじみの客の商家の主人が、身請けしたいと言ってきた。後添えとして迎えるという。' : '年季明けまで、あと数年。逃げ出す女もいる。どうする？', rich ? [
      { k: 'ukeru', l: '身請けを受ける', w: 1.5, f: ['family', 'save', 'body'] },
      { k: 'stay', l: '断って年季明けを待つ', w: 0.5 + Math.max(0, c.tr('grit')) }
    ] : [
      { k: 'stay', l: '年季明けまで勤める', w: 1.5 + Math.max(0, c.tr('grit')), f: ['save', 'body', 'family'] },
      { k: 'run', l: '足抜けする', w: 0.3 + Math.max(0, c.tr('adv')) * 0.5 }
    ], null, 'yukaku2');
  };
  arc({ id: 'yukaku2', nodes: {}, res: {
    ukeru: function (c) { c.job('商家のおかみ', 3000, false, 'shop'); c.say('身請けされ、商家に後添えとして入った。店の帳場に座る毎日は、夢のようだった。', { sat: 14, tie: 6 }, '家庭'); c.marry(10); },
    stay: function (c) { c.later(3, 'yukaku.out'); c.say('年季明けの日を指折り数えながら、勤めを続けた。', { sat: -3 }, '学歴と仕事'); },
    run: function (c) { if (c.p(0.3)) { c.move('home'); c.job('家の手伝い', 1200, false, 'farm'); c.say('夜明け前に塀を越えて逃げ、山道を伝って故郷へたどり着いた。名前を変えて、遠い親戚の家に身を寄せた。', { sat: 6, body: -6 }, '家庭'); } else { c.say('足抜けは見つかり、連れ戻された。年季は延ばされた。', { sat: -14, body: -8 }, '家庭'); c.later(4, 'yukaku.out'); } }
  } });
  N['yukaku.out'] = function (c) { if (c.L.alive) { c.move('home'); c.job('茶屋で働く', 1500, false, 'shop'); c.say('年季が明けた。故郷には戻りにくく、街道の茶屋で働き始めた。', { sat: 6 }, '学歴と仕事'); c.marry(2); } };

  // 27 飢饉の年の一揆・打ちこわし
  //   型：飢饉と打ちこわし（大河『べらぼう』『西郷どん』）・土一揆・徳政（大河『おんな城主 直虎』『北条時宗』）
  //   享保（1732年）・天明（1782〜1788年）・天保（1833〜1839年）の飢饉、1866年の打ちこわし
  var IKKI = { 1732: 1, 1733: 1, 1783: 1, 1784: 1, 1786: 1, 1787: 1, 1833: 1, 1836: 1, 1837: 1, 1866: 1 };
  arc({ id: 'ikki', start: function (c) {
    var L = c.L;
    if (c.s.done.ikki || !c.O || !IKKI[c.y] || ['hyakusho', 'chonin'].indexOf(L.status) < 0 || L.sex !== 'm' || c.a < 18 || c.a > 55 || !c.p(0.3)) return false;
    var city = L.kind === 'city' || L.status === 'chonin';
    c.s.ikkiCity = city;
    c.ask('ikki', city ? '打ちこわし' : '一揆', city ? '米の値が上がり続け、町の人たちが米屋を打ちこわしに行くと集まっている。加わる？' : '年貢を減らしてほしいと、村々の百姓が城下へ押しかける相談をしている。加わる？', [
      { k: 'join', l: '加わる', w: 0.6 + Math.max(0, c.tr('adv')) + (c.poor() ? 0.6 : 0), f: ['family'] },
      { k: 'no', l: '家を守る', w: 1 + Math.max(0, -c.tr('adv')) * 0.5, f: ['save', 'body', 'earn'] }
    ]);
    return true;
  }, res: {
    join: function (c) {
      if (c.p(0.08)) { c.say('首謀者のひとりとして捕らえられ、牢に入れられた。半年後に放されたが、村での立場は変わってしまった。', { sat: -14, body: -10, tie: -4 }, '地域'); }
      else c.say(c.s.ikkiCity ? '群衆に加わった。翌日、米の安売りのお触れが出た。' : '村々の百姓と城下へ向かった。訴えの一部が聞き入れられ、その年の年貢が少し減った。', { sat: 4, tie: 6 }, '地域');
    },
    no: function (c) { c.say('戸を閉ざし、家族と米びつを守った。', { sat: -2 }, '地域'); }
  } });

  // 28 蘭学を学びに出る（医者になる）
  //   型：身分を問わない私塾で学ぶ（大河『花燃ゆ』『八重の桜』）・家業か外か（大河『青天を衝け』）
  arc({ id: 'rangaku', start: function (c) {
    var L = c.L;
    if (c.s.done.rangaku || !c.O || L.sex !== 'm' || c.y < 1774 || c.y > 1868 || c.a < 15 || c.a > 22 || c.s.tal.brain < 1.2 || !c.p(0.15)) return false;
    c.ask('rangaku', '蘭学', '村に来た医者に西洋の医学の話を聞き、胸が高鳴った。長崎や大坂の塾へ、蘭学を学びに出る？', [
      { k: 'go', l: '学びに出る', w: 0.8 + Math.max(0, c.tr('adv')) + Math.max(0, c.tr('dream')) * 0.5, f: ['study'] },
      { k: 'no', l: '家に残る', w: 1, f: ['family', 'earn', 'save'] }
    ]);
    return true;
  }, res: {
    go: function (c) { c.move('osaka'); c.mode('away'); c.say('大坂の蘭学の塾に入った。夜は辞書を写して、言葉を覚えた。', { learn: 10, tie: -4 }, '学歴と仕事'); c.later(5, 'rangaku.doc'); },
    no: function (c) { c.say('家に残った。ときどき、塾に行った友の手紙を開いた。', { sat: -2 }); }
  } });
  N['rangaku.doc'] = function (c) { if (c.L.alive) { c.move('home'); c.job('医者', 5000, false, 'craft'); c.say('故郷に戻って医者を開いた。' + (c.y >= 1849 ? '牛痘の種痘を広め、村の子どもたちを疱瘡から守った。' : '遠くの村からも患者が訪ねてきた。'), { sat: 10, tie: 6 }, '学歴と仕事'); c.base('sat', 2); } };

  // 29 幕末：志士になるか、家を守るか
  //   型：志士になるか家業か（大河『龍馬伝』『青天を衝け』『花燃ゆ』）・脱藩（大河『龍馬伝』『西郷どん』）
  arc({ id: 'shishi', start: function (c) {
    var L = c.L;
    if (c.s.done.shishi || !c.O || L.sex !== 'm' || c.y < 1858 || c.y > 1867 || c.a < 16 || c.a > 28 || ['bushi', 'hyakusho', 'chonin'].indexOf(L.status) < 0 || c.s.tr.adv < 0.3 || !c.p(0.15)) return false;
    c.ask('shishi', '世の中が動く', '黒船が来てから、世の中が騒がしい。仲間から、国のために立とうと誘われた。' + (L.status === 'bushi' ? '藩を抜ければ、家は咎めを受ける。' : ''), [
      { k: 'go', l: L.status === 'bushi' ? '藩を抜けて仲間に加わる' : '仲間に加わる', w: 0.6 + Math.max(0, c.tr('adv')) + Math.max(0, c.tr('dream')) * 0.5, f: ['study'] },
      { k: 'no', l: '家を守る', w: 1 + Math.max(0, c.tr('warm')) * 0.5, f: ['family', 'save', 'earn'] }
    ]);
    return true;
  }, res: {
    go: function (c) {
      c.move('kyoto'); c.mode('away');
      c.s.f.shishi = c.y;
      if (c.p(0.25)) c.say('京で斬り合いに巻き込まれ、深い傷を負った。仲間の多くが命を落とした。', { body: -16, sat: -8, tie: -6 }, '時代');
      else c.say('京に上り、身を隠しながら仲間と走り回った。家には手紙も出せなかった。', { sat: 4, tie: -6 }, '時代');
      c.later(2 + Math.floor(c.r() * 4), 'shishi.after');
    },
    no: function (c) { c.say('家に残った。仲間が京へ発った朝、見送りには行かなかった。', { sat: -2 }); }
  } });
  N['shishi.after'] = function (c) {
    if (!c.L.alive) return;
    if (c.y >= 1868 && c.p(0.2)) { c.job('新政府の役人', 6000, true, 'clerk'); c.say('世の中が変わり、昔の仲間の口ききで新しい政府の役人になった。', { sat: 10 }, '学歴と仕事'); }
    else { c.move('home'); c.say('志は果たせないまま、故郷に戻った。家の者は何も聞かずに迎えてくれた。', { sat: -2, tie: 6 }, '家庭'); }
  };

  // 30 士族の転身（秩禄処分ののち）
  //   型：士族の転身（大河『西郷どん』『徳川慶喜』『八重の桜』）・時代の変わり目で古い身分を捨てる（直木賞『漂砂のうたう』『星落ちて、なお』）
  arc({ id: 'shizoku', start: function (c) {
    var L = c.L;
    if (c.s.done.shizoku || !c.O || L.status !== 'shizoku' || c.y < 1876 || c.y > 1895 || L.sex !== 'm' || c.a < 25 || c.a > 55 || !c.p(0.3)) return false;
    c.ask('shizoku', '家禄がなくなる', '家禄が打ち切られ、わずかな公債だけが残った。これからどう食べていく？', [
      { k: 'shop', l: '公債を元手に商売を始める', w: 0.6 + Math.max(0, c.tr('adv')), f: ['earn'] },
      { k: 'teach', l: '学校の先生や役所に勤める', w: 0.8 + Math.max(0, c.tal('brain')), f: ['study', 'save'] },
      { k: 'north', l: '北海道へ渡り、開拓に加わる', w: 0.3 + Math.max(0, c.tr('adv')) * 0.6, f: ['body', 'family'] }
    ]);
    return true;
  }, res: {
    shop: function (c) { if (c.p(0.3)) { c.job('商いの仕事', 4500, false, 'shop'); c.say('慣れない商売だったが、昔の家来筋の商人に助けられ、店は軌道に乗った。', { sat: 8 }, '学歴と仕事'); } else { c.job('日雇いの仕事', 1500, false, 'build'); c.say('「士族の商法」と笑われるとおり、店は1年でつぶれた。公債は人手に渡った。', { sat: -12 }, '学歴と仕事'); } },
    teach: function (c) { c.job('学校の先生', 3500, true, 'teacher'); c.say('漢学の素養を買われ、小学校の先生になった。', { sat: 4, learn: 4 }, '学歴と仕事'); },
    north: function (c) { c.move('hokkaido'); c.job('北海道の開拓', 1800, false, 'farm'); c.say('家族を連れて北海道へ渡った。木の根を一本ずつ掘り起こす毎日が始まった。', { sat: -4, body: -6, tie: 4 }, '地域'); }
  } });

  // 31 製糸工場の工女に出る
  //   型：女性の新しい職（大河『八重の桜』『いだてん』）・故郷を出て働く（ドラマ『ひよっこ』『あまちゃん』）
  arc({ id: 'kojo', start: function (c) {
    var L = c.L;
    if (c.s.done.kojo || !c.O || L.sex !== 'f' || c.y < 1880 || c.y > 1935 || !c.common() || c.kind !== 'village' || c.a < 13 || c.a > 18 || L.married || L.job === 'silk' || !c.p(0.12)) return false;
    c.ask('kojo', '製糸工場', '村に工女を集める人がやって来た。前借りの金で、家の借金が返せるという。', [
      { k: 'go', l: '工女になる', w: 1 + (c.poor() ? 1 : 0), f: ['earn', 'save'] },
      { k: 'no', l: '村に残る', w: 1, f: ['family', 'body'] }
    ]);
    return true;
  }, res: {
    go: function (c) { c.job('製糸工場の工女', 1200, false, 'silk'); c.mode('away'); c.say('峠を越えて製糸工場の寮に入った。朝から晩まで湯の中の繭から糸を引いた。仕送りの金で、家の借金が減った。', { sat: -2, body: -6, tie: -4 }, '学歴と仕事'); if (c.p(0.08)) c.later(2, 'kojo.tb'); },
    no: function (c) { c.say('村に残り、家の田畑を手伝った。', { sat: 1 }); }
  } });
  N['kojo.tb'] = function (c) { if (c.L.alive) { c.move('home'); c.say('咳が止まらなくなり、工場を出されて村へ帰された。結核だった。', { body: -14, sat: -8 }, '健康'); } };

  // 32 カフェーの女給
  //   型：色街・水商売に入る（芥川賞『カフェーの帰り道』、直木賞『漂砂のうたう』）・都会へ出る夢（直木賞『小さいおうち』、芥川賞『おらおらでひとりいぐも』）
  arc({ id: 'cafe', start: function (c) {
    var L = c.L;
    if (c.s.done.cafe || !c.O || L.sex !== 'f' || c.y < 1920 || c.y > 1940 || c.a < 16 || c.a > 24 || L.married || c.s.tr.adv < 0 || !c.p(0.06)) return false;
    c.ask('cafe', '銀座のカフェー', '都会のカフェーで女給を募っていると聞いた。洋装で働き、チップで稼げるという。', [
      { k: 'go', l: '都会へ出て女給になる', w: 0.7 + Math.max(0, c.tr('adv')) + Math.max(0, c.tr('dream')) * 0.5, f: ['earn'] },
      { k: 'no', l: '家に残る', w: 1, f: ['family', 'save'] }
    ]);
    return true;
  }, res: {
    go: function (c) { c.move('tokyo'); c.mode('away'); c.job('カフェーの女給', 2000, false, 'store'); c.say('都会に出て、カフェーの女給になった。洋装で蓄音機の音楽が流れる店に立つと、自分が別の人になった気がした。', { sat: 8, tie: -2 }, '学歴と仕事'); c.marry(1.5); },
    no: function (c) { c.say('家に残った。雑誌のカフェーの写真を、こっそり切り抜いて持っていた。'); }
  } });

  // 33 満州の開拓団に加わるか
  //   型：異国で生きる（直木賞『熱源』、芥川賞『時が滲む朝』）・戦乱で家族を失い誰かに拾われる（直木賞『塞王の楯』『しろがねの葉』、ドラマ『カムカムエヴリバディ』）
  arc({ id: 'manshu', start: function (c) {
    var L = c.L;
    if (c.s.done.manshu || !c.O || c.y < 1936 || c.y > 1943 || c.kind !== 'village' || c.a < 18 || c.a > 40 || !c.p(0.06)) return false;
    c.ask('manshu', '満州の開拓団', '村に「満州へ行けば20町歩の土地がもらえる」と、開拓団の募集が来た。', [
      { k: 'go', l: '開拓団に加わる', w: 0.5 + Math.max(0, c.tr('adv')) + (c.poor() ? 0.6 : 0), f: ['earn'] },
      { k: 'no', l: '村に残る', w: 1.2, f: ['family', 'body', 'save'] }
    ]);
    return true;
  }, res: {
    go: function (c) { c.s.f.manshu = c.y; c.mode('away'); c.say('家族と海を渡り、満州の開拓村に入った。見渡すかぎりの平原だった。', { sat: 4, tie: -4 }, '地域'); c.later(Math.max(1, 1945 - c.y), 'manshu.45'); },
    no: function (c) { c.say('村に残った。開拓団で発った家の田畑を、村で分けて耕した。'); }
  } });
  N['manshu.45'] = function (c) {
    if (!c.L.alive || c.y !== 1945) return;
    c.say('ソ連軍が攻めこみ、開拓村を捨てて逃げた。何百キロも歩き、途中で多くの人が倒れた。翌年、やっとの思いで引揚げ船に乗った。', { body: -18, sat: -20, tie: -10 }, '時代');
    c.move('home');
    c.base('sat', -3);
  };

  // 34 戦災孤児を引き取る
  //   型：他人の子を育てる（ドラマ『Mother』『この世界の片隅に』、本屋大賞『朝が来る』『そして、バトンは渡された』）
  arc({ id: 'orphan', start: function (c) {
    var L = c.L;
    if (c.s.done.orphan || !c.O || c.y < 1945 || c.y > 1950 || c.a < 24 || c.a > 45 || !L.married || !c.p(0.06)) return false;
    c.s.orphanName = c.name(c.r() < 0.5 ? 'm' : 'f');
    c.ask('orphan', '駅の子', '焼け跡の駅で、親を亡くした子が靴みがきをしていた。名前は' + c.s.orphanName + 'という。家で引き取る？', [
      { k: 'take', l: '引き取る', w: 0.5 + Math.max(0, c.tr('warm')) * 1.2, f: ['family'] },
      { k: 'no', l: '引き取れない', w: 1 + (c.poor() ? 0.8 : 0), f: ['save', 'earn', 'body'] }
    ]);
    return true;
  }, res: {
    take: function (c) { c.s.f.orphan = c.y; c.say(c.s.orphanName + 'を家に連れて帰った。食べ物は足りなかったが、ひとり分を分け合った。' + c.s.orphanName + 'は、しばらくしてから初めて笑った。', { tie: 8, sat: 2 }, '家庭'); c.later(25 + Math.floor(c.r() * 10), 'orphan.echo'); },
    no: function (c) { c.say('自分の家族を食べさせるので精一杯だった。持っていたふかし芋を渡して、その場を離れた。', { sat: -4 }, '家庭'); }
  } });
  N['orphan.echo'] = function (c) { if (c.L.alive) c.say('引き取った' + c.s.orphanName + 'が、所帯を持って孫を見せに来た。「お父さん、お母さんのおかげです」と頭を下げられた。', { sat: 8, tie: 8 }, '家庭'); };

  // 35 町工場を立ち上げる（高度成長期）
  //   型：家業か独立か・晩年の挑戦（ドラマ『下町ロケット』『陸王』、芥川賞・直木賞の「成功の後の転落と再起」『サラバ！』）
  arc({ id: 'machi', start: function (c) {
    var L = c.L;
    if (c.s.done.machi || c.y < 1956 || c.y > 1990 || L.sex !== 'm' || c.a < 28 || c.a > 45 || c.s.tal.hand < 0.5 || !c.p(0.04)) return false;
    c.ask('machi', '独立', '勤め先の工場で腕を磨いてきた。親方から「独立してみないか」と背中を押された。', [
      { k: 'go', l: '自分の町工場を始める', w: 0.5 + Math.max(0, c.tr('adv')) + Math.max(0, c.tr('grit')) * 0.5, f: ['earn'] },
      { k: 'no', l: '勤めを続ける', w: 1.2, f: ['save', 'family'] }
    ]);
    return true;
  }, res: {
    go: function (c) {
      if (c.p(0.45)) { c.job('町工場の社長', 6000, false, 'factory'); c.say('借金をして旋盤を2台買い、町工場を始めた。大手の下請けの仕事が途切れず、職人を5人雇うまでになった。', { sat: 10 }, '学歴と仕事'); c.base('sat', 2); }
      else { c.job('町工場の社長', 2000, false, 'factory'); c.say('町工場を始めたが、取引先が倒れて手形が不渡りになった。借金を返すため、夜も働いた。', { sat: -12, body: -6 }, '学歴と仕事'); }
    },
    no: function (c) { c.say('勤めを続けた。休みの日に、自分の工場を持つ夢を図面に描いた。'); }
  } });

  // 36 バブルの儲け話
  //   型：怪しい儲け話に巻き込まれる（ドラマ『ちむどんどん』『半沢直樹』）・成功の後の転落（芥川賞『サラバ！』）
  arc({ id: 'bubble', start: function (c) {
    if (c.s.done.bubble || c.y < 1987 || c.y > 1989 || c.a < 30 || c.a > 60 || (c.L.incPct || 0.5) < 0.4 || !c.p(0.25)) return false;
    c.ask('bubble', '土地と株', '会社の同僚が、借金をしてでも土地や株を買えば必ず値上がりすると言っている。', [
      { k: 'buy', l: '借金をして買う', w: 0.5 + Math.max(0, c.tr('adv')), f: ['earn'] },
      { k: 'no', l: '手を出さない', w: 1.2, f: ['save', 'family'] }
    ]);
    return true;
  }, res: {
    buy: function (c) { c.say('借金をして、郊外のマンションと株を買った。値上がりの知らせに、毎日がうきうきした。', { sat: 6 }, '家庭'); c.later(1992 - c.y, 'bubble.crash'); },
    no: function (c) { c.say('手を出さなかった。「堅いね」と笑われた。', null, '家庭'); c.s.f.bubbleNo = true; c.later(1993 - c.y, 'bubble.safe'); }
  } });
  N['bubble.crash'] = function (c) { if (c.L.alive) c.say('土地も株も値が半分以下になった。借金だけが残り、返済は定年近くまで続いた。', { sat: -14 }, '家庭'); };
  N['bubble.safe'] = function (c) { if (c.L.alive) c.say('同僚の何人かが、土地や株の借金に苦しんでいると聞いた。あのとき手を出さなくてよかったと、しみじみ思った。', { sat: 3 }, '家庭'); };

  /* ========== 平安から戦国（1000〜1600年） ========== */
  function med(c) { return c.y < 1600; }
  var LOW = ['hyakusho', 'genin', 'chonin', 'outcast'];

  // 40 物詣で・熊野詣（平安〜室町の旅）
  //   型：物詣での旅（『源氏物語』、大河『光る君へ』）・先達なしの旅（『徒然草』、『東海道中膝栗毛』）
  arc({ id: 'kumano', start: function (c) {
    var L = c.L;
    if (c.s.done.kumano || !c.O || c.y >= 1640 || ['kuge', 'bushi', 'hyakusho', 'chonin', 'priest'].indexOf(L.status) < 0 || L.pref === '47' || L.pref === '01' || c.a < 14 || c.a > 60 || !c.p(c.y < 1350 ? 0.035 : 0.025)) return false;
    var where = c.y < 1350 ? '熊野' : c.y < 1500 ? one(c.r, ['熊野', '伊勢', '長谷寺']) : one(c.r, ['伊勢', '善光寺', '熊野']);
    c.s.mode = where;
    c.ask('kumano', where + 'への参詣', (L.status === 'kuge' ? '一家で' : '村の人たちと連れ立って') + where + 'へ参詣の旅に出る話が持ち上がった。行く？', [
      { k: 'go', l: '参詣に行く', w: 1.6 + Math.max(0, c.tr('adv')), f: ['family', 'study', 'body'] },
      { k: 'no', l: '残る', w: 0.6 }
    ]);
    return true;
  }, res: {
    go: function (c) {
      c.s.f.pilgrim = c.y;
      c.say((c.s.mode === '熊野' ? '険しい山道を、白装束の人々の列にまじって歩き、熊野の社にたどり着いた。' : c.s.mode + 'に詣でた。') + one(c.r, ['一生に一度の旅だった。', '道中の宿で、遠い国の人の話を聞いた。', '帰り道、足の豆がつぶれても、胸は晴れやかだった。']), { sat: 12, tie: 3 }, '地域');
      c.base('sat', 1);
    },
    no: function (c) { c.say('参詣の一行を見送り、留守を守った。', null, '地域'); }
  } });

  // 41 宮仕えの誘い（平安の都の娘）
  //   型：宮仕えの誘い（『源氏物語』、大河『光る君へ』）・子を高い家に託す（『源氏物語』、大河『篤姫』）
  arc({ id: 'miyazukae', start: function (c) {
    var L = c.L;
    if (c.s.done.miyazukae || !c.O || L.sex !== 'f' || c.y > 1300 || (L.prov !== '山城' && L.status !== 'kuge') || ['kuge', 'chonin', 'hyakusho'].indexOf(L.status) < 0 || c.a < 13 || c.a > 18 || L.married || !c.p(L.status === 'kuge' ? 0.3 : 0.04)) return false;
    var hi = L.status === 'kuge';
    c.ask('miyazukae', '宮仕え', hi ? '親の縁で、后に仕える女房として宮中に上がらないかと話が来た。' : '貴族の屋敷の下働きに、口がかかった。', [
      { k: 'go', l: hi ? '宮中に上がる' : '屋敷で働く', w: 1 + Math.max(0, c.tr('adv')) + Math.max(0, c.tal('talk')) * 0.5, f: ['study', 'earn'] },
      { k: 'no', l: '家に残る', w: 0.8, f: ['family'] }
    ]);
    return true;
  }, res: {
    go: function (c) {
      var hi = c.L.status === 'kuge';
      c.job(hi ? '宮中の女房' : '貴族の屋敷の下働き', hi ? 5000 : 1500, false, 'court');
      c.say(hi ? '宮中に上がった。歌の才をほめられた日もあれば、ほかの女房の陰口に泣いた夜もあった。' : '屋敷の下働きに上がった。御簾の向こうから聞こえる管弦の音を、掃除の手を止めて聞いた。', { sat: 6, learn: 6, tie: -2 }, '学歴と仕事');
      if (hi && c.tal('talk') > 1 && c.p(0.3)) c.later(4, 'miyazukae.uta');
    },
    no: function (c) { c.say('家に残ることにした。', null, '家庭'); }
  } });
  N['miyazukae.uta'] = function (c) { if (c.L.alive) c.say('詠んだ歌が評判になり、宴に呼ばれるようになった。仕えている方から、扇をたまわった。', { sat: 8 }, '学歴と仕事'); };

  // 42 芸で生きる（白拍子・猿楽・田楽・琵琶法師）
  //   型：芸で生きる（『平家物語』、大河『義経』『平清盛』）・芸の道と下手な時期（『徒然草』）
  arc({ id: 'geino', start: function (c) {
    var L = c.L;
    if (c.s.done.geino || !c.O || c.y < 1100 || c.y > 1600 || LOW.indexOf(L.status) < 0 || c.a < 13 || c.a > 20 || L.married || Math.max(c.s.tal.music, c.s.tal.looks, c.s.tal.talk) < 1.3 || !c.p(0.15)) return false;
    var f = L.sex === 'f', what = f ? (c.y < 1300 ? '白拍子' : '曲舞の舞い手') : (c.y < 1350 ? '田楽の一座' : '猿楽の一座');
    c.s.mode = what;
    c.ask('geino', '旅の一座', '村に来た' + what + 'の芸に心を奪われた。一座の長に「うちに来ないか」と言われた。', [
      { k: 'go', l: '一座に加わる', w: 0.6 + Math.max(0, c.tr('adv')) + Math.max(0, c.tr('dream')), f: ['study', 'earn'] },
      { k: 'no', l: '村に残る', w: 1, f: ['family', 'save'] }
    ]);
    return true;
  }, res: {
    go: function (c) {
      c.job(c.s.mode, 1600, false, 'craft');
      c.mode('tabi'); c.s.troupe = c.s.mode;
      c.say(c.s.mode + 'に加わり、国々を渡り歩いた。社の祭りで舞うと、見物の人垣ができた。', { sat: 8, tie: -4, learn: 4 }, '学歴と仕事');
      if (c.p(0.15)) c.later(3 + Math.floor(c.r() * 4), 'geino.big');
      c.later(3 + Math.floor(c.r() * 6), 'geino.ret');
    },
    no: function (c) { c.say('一座が去った翌朝、村はいつもより静かに感じられた。', { sat: -1 }); }
  } });
  // 何度も聞かれるので、答えの言い回しを変える（同じ答えの文は1つの人生で2回まで）
  var GEINO_L = [['村に戻る', '一座に残って旅を続ける'], ['故郷へ帰ると座頭に告げる', 'もう一年だけ舞台に立つ'], ['親の顔を見に村へ帰る', '次の国まで一座についていく'], ['芸をやめて田畑に戻る', '芸の道を選び続ける']];
  N['geino.ret'] = function (c) {
    if (!c.L.alive || c.L.mode !== 'tabi') return;
    c.ask('geino.ret', '一座か、村か', '旅暮らしも' + (c.y - (c.s.done.geino || c.y)) + '年になる。故郷の村から、' + (c.s.tr.warm > 0 ? '親が会いたがっている' : '戻ってこいという') + '便りが届いた。', [
      { k: 'home', l: GEINO_L[(c.s.geinoN = (c.s.geinoN || 0) + 1) % GEINO_L.length][0], w: 1 + Math.max(0, c.tr('warm')), f: ['family', 'save'] },
      { k: 'stay', l: GEINO_L[c.s.geinoN % GEINO_L.length][1], w: 1 + Math.max(0, c.tr('adv')) + Math.max(0, c.tr('dream')) * 0.5, f: ['study', 'earn'] }
    ], null, 'geino3');
  };
  arc({ id: 'geino3', nodes: {}, res: {
    home: function (c) { c.move('home'); c.job('家の田畑の仕事', 1500, false, 'farm'); c.say('一座に別れを告げ、故郷の村に戻った。祭りの日には、村の子どもたちに舞を教えた。', { tie: 8, sat: 2 }, '家庭'); },
    stay: function (c) { c.say('一座に残ることにした。次の国へ向かう道で、仲間と新しい演目を考えた。', { sat: 4, tie: -2, learn: 2 }, '学歴と仕事'); c.later(5 + Math.floor(c.r() * 5), 'geino.ret'); }
  } });
  N['geino.big'] = function (c) { if (c.L.alive) { c.job(c.s.mode + '（名の知れた芸人）', 4000, false, 'craft'); c.say('都の有力者の目に留まり、屋敷の宴に呼ばれるほどになった。', { sat: 10 }, '学歴と仕事'); } };

  // 寺の名前（v11の直し 3）：その時代にあった宗派と、よくある寺の名前から選ぶ。国ごとに選び方をずらし、同じ国で続けて同じ名前になりにくくする
  var TEMPLES = [
    { sect: '天台宗', from: 1000, n: ['観音寺', '薬王寺', '延命寺', '安楽寺', '普門寺', '常楽寺', '円通寺', '宝積寺'] },
    { sect: '真言宗', from: 1000, n: ['地蔵院', '金剛院', '不動院', '福寿院', '宝泉寺', '大日寺', '遍照院', '観音院'] },
    { sect: '浄土宗', from: 1175, n: ['阿弥陀寺', '浄土寺', '西方寺', '来迎寺', '称名寺', '極楽寺', '浄福寺', '光明寺'] },
    { sect: '浄土真宗', from: 1224, n: ['願行寺', '西念寺', '光照寺', '専称寺', '西光寺', '正覚寺', '明福寺', '教行寺'] },
    { sect: '臨済宗', from: 1191, n: ['瑞雲寺', '竜興寺', '長松寺', '宝林寺', '慈眼寺', '興禅寺', '大林寺', '龍泉寺'] },
    { sect: '曹洞宗', from: 1227, n: ['永昌寺', '雲龍寺', '長福寺', '洞雲寺', '大雄寺', '清涼寺', '桂林寺', '泉竜寺'] },
    { sect: '日蓮宗', from: 1253, n: ['妙法寺', '本覚寺', '妙蓮寺', '妙覚寺', '本立寺', '法華寺', '妙伝寺', '本行寺'] }
  ];
  function templeOf(c) {
    var y = c.y, ok = TEMPLES.filter(function (t) { return y >= t.from; });
    var t = ok[Math.floor(c.r() * ok.length)];
    var k = (String(c.L.prov || c.L.pref || '').split('').reduce(function (h, ch) { return h * 31 + ch.charCodeAt(0) >>> 0; }, 7) + c.L.by) % t.n.length;
    return { sect: t.sect, n: t.n[(k + Math.floor(c.r() * t.n.length)) % t.n.length] };
  }
  // 寺での暮らし（v11の直し 2）：宗派と時代と飢饉の年で選ぶ。1年に1つ以上出せるだけ用意する
  function templeLines(c, famine) {
    var L = c.L, y = c.y, sect = L.templeSect || '', tn = L.templeName || '寺', out = [
      '朝の勤行のあと、寺の庭を掃き清めた。', '経を写す手が、少しずつ速くなった。', '檀家の人たちから「' + L.name.replace(/（.*?）/g, '') + 'さま」と呼ばれるようになった。', '寺を訪ねてきた人の話を、黙って聞いた。',
      '檀家の葬儀を務め、夜遅くまで経を読んだ。', '檀家の法事に呼ばれ、遠くの村まで歩いた。', '托鉢に出て、家々の門口で経を唱えた。',
      '大風で傷んだ本堂の普請に、檀家の人たちが集まった。', '冬の朝、冷たい水で身を清めてから勤行に立った。', '盆の施餓鬼の法要で、大勢の人が寺に集まった。',
      '春の彼岸の法要を務めた。', '夜明け前に鐘をつき、一日が始まった。', '寺の畑で、自分たちの食べる菜を育てた。',
      '新しく入った若い僧に、経の唱え方を教えた。', '弟子をとった。' + (c.s.deshi = c.s.deshi || c.name('m')) + 'という、まだ十にもならない子だった。', '師の僧が病に伏し、そばで看取りの支度をした。',
      tn + 'の古い仏像の前で、長い時間を過ごした。', '寺の蔵の経典に、虫干しのため風を通した。', '山の上の奥の院まで、一日がかりで歩いた。',
      '亡くなった人の名を、一人ずつ過去帳に書き入れた。', '寺の門前で、行き倒れの旅人を介抱した。'];
    if (/天台|真言/.test(sect)) out.push('病の平癒を願う人に頼まれ、加持祈祷を行った。', '本山の' + (sect === '天台宗' ? '比叡山' : '高野山') + 'へ上り、しばらく修行を重ねた。', '護摩をたき、村の五穀豊穣を祈った。');
    if (/浄土/.test(sect)) out.push('集まった人たちと、声をそろえて念仏を唱えた。', '念仏の教えを聞きに、遠くの村からも人が来た。');
    if (/臨済|曹洞/.test(sect)) out.push('夜更けまで坐禅を組んだ。', '師から公案を与えられ、何日も考え続けた。', '雲水として、よその寺を訪ねて修行した。');
    if (sect === '日蓮宗') out.push('太鼓を打ちながら、題目を唱えて歩いた。', '辻に立ち、通る人に教えを説いた。');
    if (y >= 1640 && y <= 1871) out.push('宗門改めの時期になり、檀家の寺請証文を書いた。', '人別帳に載せるため、檀家の家の者を一人ずつ確かめた。');
    if (y >= 1700 && y <= 1872) out.push('寺子屋を開き、近所の子どもたちに字と算盤を教えた。');
    if (y >= 1868 && y <= 1872) out.push('神仏分離の触れが出て、寺の仏像や経典を壊す騒ぎが近くの村にまで及んだ。');
    if (famine) out.push('飢饉で食べるものがなく、寺の蔵の米で炊き出しをした。');
    if (c.a >= 50) out.push('寺の跡を誰に継がせるか、考えるようになった。', '若い僧たちに、自分の知る作法を残らず伝えた。');
    return out;
  }

  // 43 出家・遁世（すべての時代）
  //   型：出家・遁世（『源氏物語』『平家物語』、『徒然草』）
  arc({ id: 'shukke', start: function (c) {
    var L = c.L;
    if (c.s.done.shukke || !c.O || c.y > 1870 || L.status === 'priest' || L.status === 'ainu' || c.a < 30 || c.a > 65) return false;
    var why = L.married && L.spouse && !L.spouse.alive ? '連れ合いを亡くし、' : (L.members || []).some(function (m) { return m.role === '子' && !m.alive && m.dy >= c.y - 1; }) ? '子を亡くし、' : null;
    if (!(L.testForce && L.testForce.shukke) && !c.p(why ? 0.12 : 0.006)) return false;
    c.ask('shukke', '出家', (why || '世の中の無常を感じ、') + '髪を下ろして仏の道に入ろうかと考えるようになった。', [
      { k: 'go', l: '出家する', w: 0.4 + Math.max(0, -c.tr('soc')) * 0.5 + (why ? 0.6 : 0), f: ['study', 'body'] },
      { k: 'no', l: '俗世にとどまる', w: 1.2, f: ['family', 'earn', 'save'] }
    ]);
    return true;
  }, res: {
    go: function (c) {
      var L = c.L, tp = templeOf(c), tn = tp.n;
      L.templeSect = tp.sect;
      var sp = spouseOf(L), kids = (L.members || []).some(function (m) { return m.role === '子' && m.alive && !m.gone && c.y - m.by < 18; });
      var bz = L.sex === 'f' ? '尼' : '僧';
      c.job(bz + '（' + tn + '）', 800, false, 'temple'); c.mode('shukke');
      L.selfJob = { cat: 'temple', n: bz + '（' + tn + '）', d: '寺で経を読み、修行と勤行に励む' }; L.lastJob = L.selfJob.n; L.templeName = tn; L.shukkeY = c.y;
      if (c.api.move && L.old) c.api.move(L, { prov: L.prov });
      if (sp || kids) c.say(c.p(0.5) ? (L.sex === 'm' ? '妻' : '夫') + (kids ? 'と子' : '') + 'を' + (L.sex === 'm' ? '妻の実家に' : '夫の家に') + '預け、' + tn + 'に入ることにした。' : (L.sex === 'm' ? '妻' : '夫') + (kids ? 'と子' : '') + 'は' + tn + 'の近くの村に住まわせ、ときおり様子を聞くことにした。', { tie: -3 }, '人間関係'); c.say('髪を下ろし、' + tp.sect + 'の' + tn + 'に入った。朝夕の勤行の鐘の音が、少しずつ心を静めてくれた。', { sat: 4, tie: -6, learn: 4 }, '家庭'); },
    no: function (c) { c.say('家族の顔を思い浮かべ、俗世にとどまった。', { tie: 2 }); }
  } });

  // 44 どちらにつくか（源平・承久・南北朝の武士）
  //   型：どちらにつくか（大河『鎌倉殿の13人』、『平家物語』）・落ちぶれた主に従う（大河『義経』、『平家物語』）
  var SIDE = [[1180, 1185, '源氏', '平家'], [1221, 1221, '鎌倉方', '京方'], [1333, 1392, '南朝', '北朝']];
  arc({ id: 'side', start: function (c) {
    var L = c.L, w = SIDE.filter(function (x) { return c.y >= x[0] && c.y <= x[1]; })[0];
    if (c.s.done.side || !c.O || !w || L.status !== 'bushi' || L.sex !== 'm' || c.a < 18 || c.a > 45 || !c.p(0.35)) return false;
    c.s.sideW = w;
    c.ask('side', 'どちらにつくか', '国じゅうが' + w[2] + 'と' + w[3] + 'に分かれて争っている。主君は迷っている。どちらにつくべきだと進言する？', [
      { k: 'a', l: w[2] + 'につく', w: 1 + c.tr('adv') * 0.3 },
      { k: 'b', l: w[3] + 'につく', w: 1 - c.tr('adv') * 0.3 }
    ]);
    return true;
  }, res: {
    a: function (c) { sideOut(c, 0); }, b: function (c) { sideOut(c, 1); }
  } });
  function sideOut(c, k) {
    var w = c.s.sideW, win = w[0] === 1333 ? (k === 1 ? 0.6 : 0.4) : (k === 0 ? 0.8 : 0.2);
    if (c.p(win)) { c.say(w[2 + k] + 'について戦った。勝ち方についた主君は恩賞の土地を得て、自分も新しい田をもらった。', { sat: 10 }, '時代'); c.base('sat', 2); }
    else { c.say(w[2 + k] + 'について戦ったが、敗れた。所領を失い、主君とともに山あいへ落ちのびた。', { sat: -14, body: -8, tie: -6 }, '時代'); c.base('sat', -2); }
  }

  // 45 足軽になる（戦国の村の若者）
  //   型：村を出て足軽になる（大河『秀吉』『豊臣兄弟!』『武蔵』）・出世した身内に呼ばれる（大河『豊臣兄弟!』『秀吉』）
  arc({ id: 'ashigaru', start: function (c) {
    var L = c.L;
    if (c.s.done.ashigaru || !c.O || c.y < 1467 || c.y > 1600 || L.sex !== 'm' || ['hyakusho', 'genin'].indexOf(L.status) < 0 || L.heir || c.a < 15 || c.a > 24 || !c.p(0.2)) return false;
    c.ask('ashigaru', '足軽', '領主が足軽を集めている。手柄を立てれば侍に取り立てられることもあるという。村を出る？', [
      { k: 'go', l: '足軽になる', w: 0.6 + Math.max(0, c.tr('adv')) + Math.max(0, c.tal('sport')) * 0.5, f: ['earn', 'body'] },
      { k: 'no', l: '村で田を耕す', w: 1 + Math.max(0, c.tr('warm')) * 0.5, f: ['family', 'save'] }
    ]);
    return true;
  }, res: {
    go: function (c) {
      c.job('足軽', 1500, false, 'bushiMed'); c.mode('hei');
      c.say('槍一本を渡され、足軽の列に加わった。初めての戦で、膝が震えて止まらなかった。', { sat: 2, body: -4, tie: -4 }, '時代');
      c.later(2 + Math.floor(c.r() * 4), 'ashigaru.next');
    },
    no: function (c) { c.say('村に残った。戦から帰らなかった幼なじみの家に、収穫した米を届けた。', { tie: 3 }); }
  } });
  N['ashigaru.next'] = function (c) {
    if (!c.L.alive) return;
    var r = c.r();
    if (r < 0.12) { c.mode('away'); c.job('取り立てられた侍', 4500, false, 'bushiMed'); c.say('戦で手柄を立て、侍に取り立てられた。村の親に、初めて腹いっぱいの米を食べさせることができた。', { sat: 15 }, '時代'); c.base('sat', 3); }
    else if (r < 0.45) { c.say('戦で腕に矢を受け、槍を握れなくなった。村へ帰って田を耕した。', { body: -14, sat: -6 }, '健康'); c.move('home'); c.job('家の田畑の仕事', 1500, false, 'farm'); }
    else { c.say('いくつもの戦を生きのびた。仲間の数は、戦のたびに減っていった。やがて戦が収まり、村に戻った。', { sat: -3, tie: -3 }, '時代'); c.move('home'); }
  };

  // 46 戦国の村：乱取りから村を守る
  //   型：乱取りと村の自衛（大河『豊臣兄弟!』『麒麟がくる』『おんな城主 直虎』）
  arc({ id: 'randori', start: function (c) {
    var L = c.L;
    if (c.s.done.randori || !c.O || c.y < 1467 || c.y > 1590 || ['hyakusho', 'genin'].indexOf(L.status) < 0 || c.kind !== 'village' || c.a < 16 || c.a > 55 || !c.p(0.08)) return false;
    c.ask('randori', '軍勢が来る', '近くで戦があり、敗れた兵や野伏せりが村を襲うという噂が流れた。どうする？', [
      { k: 'fort', l: '村の衆と砦にこもって守る', w: 1 + Math.max(0, c.tr('adv')) + Math.max(0, c.tr('soc')) * 0.5, f: ['family'] },
      { k: 'hide', l: '家族を連れて山に隠れる', w: 1 + Math.max(0, -c.tr('adv')), f: ['body', 'save'] }
    ]);
    return true;
  }, res: {
    fort: function (c) { if (c.p(0.7)) c.say('村の衆と竹槍を持って砦にこもった。三日目、兵たちは村を避けて去っていった。', { tie: 8, sat: 4 }, '地域'); else c.say('砦は破られ、米と牛を奪われた。家は焼かれなかったのが救いだった。', { sat: -12, body: -6 }, '地域'); },
    hide: function (c) { c.say('家族を連れて山の洞穴に隠れた。村に戻ると、家の中は荒らされ、蓄えの米はなくなっていた。', { sat: -8 }, '地域'); }
  } });

  // 47 落城と侍女（戦国の城下の女性）
  //   型：落城と侍女（大河『江』『麒麟がくる』『軍師官兵衛』）
  arc({ id: 'rakujo', start: function (c) {
    var L = c.L;
    if (c.s.done.rakujo || !c.O || c.y < 1500 || c.y > 1615 || L.sex !== 'f' || (L.status !== 'bushi' && c.kind !== 'town') || c.a < 15 || c.a > 35 || !c.p(0.04)) return false;
    c.ask('rakujo', '落城', '城が囲まれ、もう持たないと言われている。仕える奥方さまは城に残るという。どうする？', [
      { k: 'stay', l: '奥方さまのそばに残る', w: 0.6 + Math.max(0, c.tr('warm')), f: ['family'] },
      { k: 'flee', l: '夜のうちに城を抜け出す', w: 1 + Math.max(0, c.tr('adv')) * 0.5, f: ['body', 'save'] }
    ]);
    return true;
  }, res: {
    stay: function (c) { c.say('奥方さまのそばに残った。城が開け渡される日、奥方さまと幼い姫を守って敵の陣を抜けた。のちに、そのことで新しい主君から扶持を賜った。', { sat: 6, tie: 8 }, '時代'); },
    flee: function (c) { c.move('home'); c.say('夜の闇にまぎれて城を抜け出し、実家の村へ逃げ帰った。燃える城の明かりが、山の向こうに見えた。', { sat: -8, tie: -4 }, '時代'); }
  } });

  // 48 盗賊に加わるか（乱れた世の貧しい若者）
  //   型：義賊・盗賊への道（大河『光る君へ』『平清盛』）・盗賊から足を洗う（大河『おんな城主 直虎』『豊臣兄弟!』）
  arc({ id: 'tozoku', start: function (c) {
    var L = c.L;
    if (c.s.done.tozoku || !c.O || c.y > 1600 || L.sex !== 'm' || LOW.indexOf(L.status) < 0 || !c.poor() || c.a < 15 || c.a > 25 || c.s.tr.adv < 0.5 || !c.p(0.06)) return false;
    c.ask('tozoku', '盗賊の誘い', '飢えに苦しんでいたとき、山に住む盗賊の一味に誘われた。「金持ちの蔵から取るだけだ」と言う。', [
      { k: 'join', l: '一味に加わる', w: 0.4 + Math.max(0, c.tr('adv')) * 0.6 },
      { k: 'no', l: '飢えても盗みはしない', w: 1.4, f: ['family', 'body', 'save', 'study', 'earn'] }
    ]);
    return true;
  }, res: {
    join: function (c) { c.s.f.tozoku = c.y; c.mode('away'); c.job('盗賊の一味', 1200, false, 'genin'); c.say('盗賊の一味に加わった。夜の都の屋敷に忍びこむたび、心臓が破れそうだった。', { sat: -4, tie: -6 }, '人間関係'); c.later(2 + Math.floor(c.r() * 3), 'tozoku.end'); },
    no: function (c) { c.say('誘いを断り、飢えをしのいで春を待った。', { sat: -2 }); }
  } });
  N['tozoku.end'] = function (c) {
    if (!c.L.alive) return;
    if (c.p(0.5)) { c.move('home'); c.job('家の田畑の仕事', 1200, false, 'farm'); c.say('一味が捕らえられた夜、ひとりだけ逃げのびた。故郷に戻り、名を変えて田を耕した。あの夜のことは、誰にも話さなかった。', { sat: 2 }, '人間関係'); }
    else c.say('検非違使に捕らえられ、遠い国へ流された。', { sat: -16, tie: -10, body: -6 }, '人間関係');
  };

  // 49 高い年貢から逃げる（逃散）
  //   型：重税と逃亡（『万葉集』の貧窮問答歌、大河『平清盛』）・逃散と借金（大河『おんな城主 直虎』『鎌倉殿の13人』）
  arc({ id: 'chosan', start: function (c) {
    var L = c.L;
    if (c.s.done.chosan || !c.O || c.y > 1600 || ['hyakusho', 'genin'].indexOf(L.status) < 0 || !c.poor() || c.a < 20 || c.a > 50 || !c.p(0.03)) return false;
    c.ask('chosan', '年貢', '不作の年なのに、荘園の役人は年貢を減らしてくれない。村の衆は、田を捨てて隣の国へ逃げる相談をしている。', [
      { k: 'go', l: '村の衆と逃げる', w: 0.5 + Math.max(0, c.tr('adv')), f: ['body'] },
      { k: 'stay', l: '残って納める', w: 1 + Math.max(0, c.tr('grit')) * 0.5, f: ['family', 'save'] }
    ]);
    return true;
  }, res: {
    go: function (c) { if (c.p(0.6)) c.say('村じゅうで田を捨てて山を越えた。困った領主が年貢を減らすと約束し、秋には村へ戻った。', { sat: 6, tie: 6 }, '地域'); else c.say('逃げた先でも暮らしは楽にならなかった。知らない土地で、日雇いの仕事を探した。', { sat: -8, tie: -6 }, '地域'); },
    stay: function (c) { c.say('残って年貢を納めた。冬のあいだ、家族で一日一食をしのいだ。', { sat: -6, body: -6 }, '地域'); }
  } });

  // 50 土一揆・徳政（室町）
  //   型：土一揆・徳政（大河『おんな城主 直虎』『北条時宗』）
  var DOIKKI = { 1428: 1, 1441: 1, 1454: 1, 1457: 1, 1462: 1, 1485: 1, 1488: 1 };
  arc({ id: 'doikki', start: function (c) {
    var L = c.L;
    if (c.s.done.doikki || !c.O || !DOIKKI[c.y] || ['hyakusho', 'genin', 'chonin'].indexOf(L.status) < 0 || L.sex !== 'm' || c.a < 16 || c.a > 55 || !c.p(0.4)) return false;
    c.ask('doikki', '土一揆', '借金の帳消し（徳政）を求めて、近くの村々が一揆を起こすという。加わる？', [
      { k: 'join', l: '加わる', w: 0.6 + Math.max(0, c.tr('adv')) + (c.poor() ? 0.8 : 0), f: ['family'] },
      { k: 'no', l: '加わらない', w: 1, f: ['save', 'body'] }
    ]);
    return true;
  }, res: {
    join: function (c) { c.say('鐘を合図に、村々の衆と土倉や酒屋に押しかけた。借金の証文が焼かれ、家の借りがなくなった。', { sat: 8, tie: 4 }, '地域'); },
    no: function (c) { c.say('戸を閉ざして家にいた。一揆のあと、隣の家の借金は消えたと聞いた。', { sat: -1 }, '地域'); }
  } });

  // 51 キリシタン
  //   型：キリシタン（大河『軍師官兵衛』『葵 徳川三代』）・主家と信仰の板挟み（大河『どうする家康』『利家とまつ』）
  arc({ id: 'kirishitan', start: function (c) {
    var L = c.L, kyushu = ['40', '41', '42', '43', '44', '45', '46'].indexOf(String(L.pref)) >= 0, kinai = ['26', '27', '28'].indexOf(String(L.pref)) >= 0;
    if (c.s.done.kirishitan || !c.O || c.y < 1555 || c.y > 1612 || !(kyushu || kinai) || c.a < 12 || c.a > 50 || !c.p(kyushu ? 0.08 : 0.03)) return false;
    c.ask('kirishitan', '南蛮の教え', '村に宣教師がやって来て、病人の手当てをしながらデウスの教えを説いている。洗礼を受ける？', [
      { k: 'yes', l: '洗礼を受ける', w: 0.7 + Math.max(0, c.tr('warm')) + Math.max(0, c.tr('adv')) * 0.5, f: ['family', 'study'] },
      { k: 'no', l: '受けない', w: 1, f: ['save', 'earn'] }
    ]);
    return true;
  }, res: {
    yes: function (c) { c.s.f.kiri = c.y; c.say('洗礼を受け、新しい名をもらった。教会の歌を、仲間と声を合わせて歌った。', { sat: 6, tie: 6 }, '人間関係'); c.later(Math.max(1, 1614 - c.y), 'kirishitan.ban'); },
    no: function (c) { c.say('洗礼は受けなかった。それでも、宣教師の手当てで助かった近所の子の話は、ずっと覚えていた。'); }
  } });
  N['kirishitan.ban'] = function (c) {
    if (!c.L.alive) return;
    c.ask('kirishitan.ban', '禁教', 'キリシタンが禁じられ、役人が村を回って信仰を捨てるよう迫っている。どうする？', [
      { k: 'drop', l: '信仰を捨てたと届け出る', w: 1.2, f: ['family', 'body', 'save'] },
      { k: 'hide', l: '表向きは寺の檀家になり、ひそかに祈り続ける', w: 0.6 + Math.max(0, c.tr('grit')), f: ['study'] }
    ], null, 'kirishitan2');
  };
  arc({ id: 'kirishitan2', nodes: {}, res: {
    drop: function (c) { c.say('信仰を捨てたと届け出て、寺の檀家になった。夜、ひとりで小さく十字を切った。', { sat: -8 }, '人間関係'); },
    hide: function (c) { c.s.f.senpuku = c.y; c.say('表向きは寺の檀家として暮らし、納戸に隠した像に、家族でひそかに祈り続けた。', { sat: -2, tie: 6 }, '人間関係'); }
  } });

  // 52 国替えについていく（戦国末〜江戸初めの武士）
  //   型：国替えについていく（大河『天地人』『真田丸』『功名が辻』）
  arc({ id: 'kunigae', start: function (c) {
    var L = c.L;
    if (c.s.done.kunigae || !c.O || c.y < 1580 || c.y > 1640 || L.status !== 'bushi' || c.a < 20 || c.a > 50 || !c.p(0.06)) return false;
    c.ask('kunigae', '国替え', '主君に遠い国への国替えが命じられた。禄は大きく減るという。ついていく？', [
      { k: 'go', l: '主君についていく', w: 1 + Math.max(0, c.tr('warm')), f: ['family'] },
      { k: 'stay', l: '刀を置き、この土地で百姓になる', w: 0.5 + Math.max(0, -c.tr('adv')) * 0.5, f: ['save', 'body'] }
    ]);
    return true;
  }, res: {
    go: function (c) { c.say('家財をまとめ、主君について遠い国へ移った。禄は半分になったが、主従の縁は切れなかった。', { sat: -4, tie: 4 }, '時代'); },
    stay: function (c) { c.job('帰農した百姓', 1500, false, 'farm'); c.say('刀を置き、この土地に残って百姓になった。慣れない鍬を握る手に、豆ができた。', { sat: -4, tie: 2 }, '時代'); }
  } });

  // 53 職人の弟子入り（すべての時代）
  //   型：職人の技（『徒然草』、大河『天地人』）・師匠について修業し継ぐか独立か（直木賞『塞王の楯』『等伯』『渦』）
  arc({ id: 'shokunin', start: function (c) {
    var L = c.L;
    if (c.s.done.shokunin || !c.O || c.y > 1900 || L.sex !== 'm' || LOW.indexOf(L.status) < 0 || L.heir || c.a < 11 || c.a > 15 || c.s.tal.hand < 0.9 || !c.p(0.15)) return false;
    var what = c.y < 1600 ? one(c.r, ['仏師', '刀鍛冶', '番匠（大工）']) : one(c.r, ['宮大工', '刀鍛冶', '浮世絵の彫師', '瓦職人']);
    if (what === '浮世絵の彫師' && c.y < 1700) what = '瓦職人';
    c.s.mode = what;
    c.ask('shokunin', '弟子入り', '手先の器用さを見込まれ、' + what + 'の親方に弟子入りの話が来た。', [
      { k: 'go', l: '弟子入りする', w: 1 + Math.max(0, c.tr('grit')), f: ['study', 'earn'] },
      { k: 'no', l: '家の仕事を手伝う', w: 0.8, f: ['family'] }
    ]);
    return true;
  }, res: {
    go: function (c) {
      c.job(c.s.mode + 'の弟子', 1200, false, 'craft'); c.mode('hoko');
      c.say(c.s.mode + 'の親方に弟子入りした。最初の数年は掃除と道具の手入ればかりで、仕事に触らせてもらえなかった。', { learn: 6, tie: -2 }, '学歴と仕事');
      c.later(8 + Math.floor(c.r() * 4), 'shokunin.next');
    },
    no: function (c) { c.say((c.s.mode || '職人') + 'の親方への弟子入りは断り、家の仕事を手伝うことにした。', null); }
  } });
  N['shokunin.next'] = function (c) {
    if (!c.L.alive) return;
    if (c.p(0.4 + 0.1 * c.tr('grit'))) { c.mode('away'); c.job(c.s.mode, 4500, false, 'craft'); c.say('親方に腕を認められ、一人前の' + c.s.mode + 'になった。初めて自分の名で請けた仕事を納めた日、親方が黙って酒をついでくれた。', { sat: 10, learn: 4 }, '学歴と仕事'); c.base('sat', 2); }
    else { c.job(c.s.mode + 'の職人', 3000, false, 'craft'); c.say('一人前と認められるまで、まだ何年もかかりそうだった。それでも、毎日少しずつ手が覚えていった。', { sat: 1 }, '学歴と仕事'); }
  };

  // 54 博打（すべての時代）
  //   型：博打と酒（『徒然草』、大河『鎌倉殿の13人』）・何かにのめり込む（芥川賞『推し、燃ゆ』、本屋大賞『推し、燃ゆ』）
  arc({ id: 'bakuchi', start: function (c) {
    var L = c.L;
    if (c.s.done.bakuchi || !c.O || c.y > 1945 || L.sex !== 'm' || c.a < 18 || c.a > 40 || c.s.tr.adv < 0.3 || c.s.tr.grit > 0.5 || !c.p(0.03)) return false;
    c.ask('bakuchi', '博打', '仲間に誘われて行った賭場で、一晩で米何俵分も勝った。次の晩も誘われている。', [
      { k: 'go', l: 'また行く', w: 0.6 + Math.max(0, c.tr('adv')), f: [] },
      { k: 'no', l: 'もう行かない', w: 1 + Math.max(0, c.tr('grit')), f: ['family', 'save', 'body', 'study', 'earn'] }
    ]);
    return true;
  }, res: {
    go: function (c) { c.say('毎晩のように賭場に通った。勝った分はすぐに消え、借金がかさんだ。家の田を一枚、かたに取られた。', { sat: -10, tie: -6 }, '人間関係'); c.base('sat', -1); },
    no: function (c) { c.say('二度と賭場には行かなかった。勝った分で、家族に着物を買った。', { sat: 4, tie: 3 }, '人間関係'); }
  } });

  /* ========== 江戸・明治・昭和をもう少し ========== */

  // 60 江戸の大火で焼け出される
  //   型：災害で家族や家を失い、生き直す（ドラマ『おかえりモネ』『カムカムエヴリバディ』、直木賞『しろがねの葉』）
  var TAIKA = { 1657: '明暦', 1682: '天和', 1772: '明和', 1806: '文化', 1829: '文政' };
  arc({ id: 'taika', start: function (c) {
    var L = c.L;
    if (c.s.done.taika || !c.O || !TAIKA[c.y] || L.pref !== '13' || L.kind !== 'city' || c.a < 8 || !c.p(0.35)) return false;
    c.ask('taika', '大火', TAIKA[c.y] + 'の大火で、住んでいた長屋が焼けた。これからどうする？', [
      { k: 'stay', l: '江戸に残って建て直す', w: 1 + Math.max(0, c.tr('grit')), f: ['earn', 'study'] },
      { k: 'go', l: '田舎の親戚を頼る', w: 0.8 + Math.max(0, c.tr('warm')) * 0.5, f: ['family', 'body', 'save'] }
    ]);
    return true;
  }, res: {
    stay: function (c) { c.say('焼け跡に小屋を建てて暮らした。復興の普請で大工や鳶の仕事が増え、町はひと月で息を吹き返した。', { sat: -6, tie: 4 }, '地域'); },
    go: function (c) { c.say('田舎の親戚の家に身を寄せた。慣れない畑仕事を手伝いながら、江戸の空を思った。', { sat: -8, tie: 2 }, '地域'); }
  } });

  // 61 遍路・巡礼の旅（江戸の晩年）
  //   型：旅に逃げる・遁世（『東海道中膝栗毛』、『徒然草』）
  arc({ id: 'henro', start: function (c) {
    var L = c.L;
    if (c.s.done.henro || !c.O || c.y < 1690 || c.y > 1930 || !c.common() || c.a < 50 || c.a > 70 || !c.p(0.02)) return false;
    var where = String(L.pref) >= '36' && String(L.pref) <= '39' ? '四国の八十八か所' : one(c.r, ['四国の八十八か所', '西国三十三所', '善光寺']);
    c.s.mode = where;
    c.ask('henro', '巡礼', '家のことを子に任せられるようになった。' + where + 'を巡る旅に出る？', [
      { k: 'go', l: '巡礼に出る', w: 1 + Math.max(0, c.tr('adv')), f: ['body', 'study'] },
      { k: 'no', l: '家で孫の面倒を見る', w: 1 + Math.max(0, c.tr('warm')) * 0.5, f: ['family', 'save'] }
    ]);
    return true;
  }, res: {
    go: function (c) { c.say(c.s.mode + 'を巡った。道ばたの家でお接待の団子をもらい、見知らぬ人の親切が身にしみた。', { sat: 10, body: -4, tie: 2 }, '地域'); c.base('sat', 1); },
    no: function (c) { c.say('孫の手を引いて、近くの寺に参った。', { tie: 3 }); }
  } });

  // 62 海を渡る移民（ハワイ・アメリカ・ブラジル）
  //   型：異国・異文化のなかで生きる（直木賞『熱源』、芥川賞『時が滲む朝』）・閉じた土地を出るか（ドラマ『海に眠るダイヤモンド』『ちゅらさん』）
  arc({ id: 'imin', start: function (c) {
    var L = c.L, sw = ['34', '35', '43', '47', '40', '42', '46'].indexOf(String(L.pref)) >= 0;
    if (c.s.done.imin || !c.O || c.y < 1885 || c.y > 1934 || c.kind !== 'village' || L.heir || c.a < 18 || c.a > 35 || !c.p(sw ? 0.05 : 0.012)) return false;
    var to = c.y < 1908 ? 'ハワイ' : c.y < 1924 ? one(c.r, ['ハワイ', 'アメリカ', 'ブラジル']) : 'ブラジル';
    c.s.mode = to;
    c.ask('imin', '海の向こう', to + 'へ渡れば、日本の何倍も稼げると移民の募集が来た。行く？', [
      { k: 'go', l: to + 'へ渡る', w: 0.5 + Math.max(0, c.tr('adv')) + (c.poor() ? 0.6 : 0), f: ['earn'] },
      { k: 'no', l: '村に残る', w: 1.3, f: ['family', 'save', 'body'] }
    ]);
    return true;
  }, res: {
    go: function (c) { c.s.f.imin = c.y; c.mode('away'); c.say('船で' + c.s.mode + 'へ渡った。' + (c.s.mode === 'ブラジル' ? 'コーヒー農園で、朝から晩まで実を摘んだ。' : 'さとうきび畑で、照りつける日差しの下で働いた。') + '故郷への仕送りの手紙に、つらいことは書かなかった。', { sat: -2, tie: -10, body: -4 }, '地域'); c.later(8 + Math.floor(c.r() * 10), 'imin.next'); },
    no: function (c) { c.say('村に残った。海を渡った幼なじみからの手紙を、何度も開いた。'); }
  } });
  N['imin.next'] = function (c) { if (c.L.alive) { if (c.p(0.4)) c.say('異国で小さな店を持ち、家族を呼び寄せた。故郷へは戻らないと決めた。', { sat: 8, tie: 6 }, '地域'); else c.say('稼いだ金を持って故郷へ帰り、田を買った。村の人たちは「' + c.s.mode + '帰り」と呼んだ。', { sat: 6, tie: 4 }, '地域'); } };

  // 63 戦後の闇市
  //   型：戦争で家族を失い生き直す（ドラマ『カムカムエヴリバディ』『この世界の片隅に』）・法と暮らしの板挟み（ドラマ『虎に翼』、直木賞『宝島』）
  arc({ id: 'yamiichi', start: function (c) {
    var L = c.L;
    if (c.s.done.yamiichi || c.y < 1945 || c.y > 1948 || c.a < 15 || c.a > 60 || !c.p(0.3)) return false;
    c.ask('yamiichi', '闇市', '配給だけでは家族が食べていけない。駅前の闇市では、高い値で米が売られている。', [
      { k: 'buy', l: '着物を売って闇米を買う', w: 1.5, f: ['family', 'body'] },
      { k: 'sell', l: '自分も闇市で商売をする', w: 0.4 + Math.max(0, c.tr('adv')), f: ['earn'] },
      { k: 'no', l: '配給だけでしのぐ', w: 0.4 + Math.max(0, c.tr('grit')) * 0.5, f: ['save'] }
    ]);
    return true;
  }, res: {
    buy: function (c) { c.say('母の形見の着物を売って、闇米を買った。久しぶりの白い飯に、子どもたちが歓声を上げた。', { sat: 2, body: 4 }, '時代'); },
    sell: function (c) { if (c.p(0.6)) { c.job('闇市の露店', 3500, false, 'shop'); c.say('闇市に露店を出した。焼け跡のバラックから始めた店は、数年後には小さな商店になった。', { sat: 6 }, '学歴と仕事'); } else c.say('闇市に露店を出したが、警察の取り締まりで品物を取り上げられた。', { sat: -8 }, '学歴と仕事'); },
    no: function (c) { c.say('配給だけでしのいだ。家族はみるみる痩せていった。', { body: -10, sat: -6 }, '健康'); }
  } });

  // 64 学童疎開
  //   型：戦乱で家族と離れる（ドラマ『この世界の片隅に』『カムカムエヴリバディ』、直木賞『塞王の楯』）
  arc({ id: 'sokai', start: function (c) {
    var L = c.L;
    if (c.s.done.sokai || c.y !== 1944 || c.a < 8 || c.a > 12 || (c.O ? L.kind !== 'city' : c.kind !== 'city') || !c.p(0.6)) return false;
    c.say('学童疎開で、学校の友だちと山あいの寺に移った。夜になると、布団の中で家族を思って泣く子がいた。食べ物はいつも足りなかった。', { sat: -8, tie: -4, body: -4 }, '時代');
    c.later(1, 'sokai.back');
    return true;
  } });
  N['sokai.back'] = function (c) { if (c.L.alive) c.say('戦争が終わり、疎開先から家に戻った。' + (c.p(0.3) ? '町は焼け野原になっていた。' : '家族の顔を見て、声を上げて泣いた。'), { tie: 6 }, '時代'); };

  // 65 見合いで遠くへ嫁ぐ（戦前〜昭和）
  //   型：見合いで短期間に結婚し、遠い土地へ移る（ドラマ『ゲゲゲの女房』『この世界の片隅に』『カーネーション』）
  arc({ id: 'miai', start: function (c) {
    var L = c.L;
    if (c.marryPending() || c.s.done.miai || !c.O || c.y < 1900 || c.y > 1970 || L.sex !== 'f' || L.married || c.a < 18 || c.a > 26 || !c.p(0.05)) return false;
    c.s.miaiName = c.name('m');
    c.ask('miai', '見合い', '遠い町の' + c.s.miaiName + 'という人との見合いの話が来た。写真を一枚見ただけで、会ったのは一度きり。受ける？', [
      { k: 'yes', l: '見合いの席に出る', w: 1.2 + Math.max(0, c.tr('adv')) * 0.5, f: ['family'] },
      { k: 'no', l: '写真だけで決めるのは嫌だと断る', w: 0.8, f: ['study', 'earn'] }
    ]);
    return true;
  }, res: {
    yes: function (c) { c.s.f.miai = c.y; c.marry(5); c.say('話を受けることにした。嫁入り道具を積んだ汽車の窓から、生まれた町が遠ざかっていった。', { sat: 2, tie: 2 }, '家庭'); },
    no: function (c) { c.say('話は断った。「贅沢を言って」と、親戚にため息をつかれた。', { sat: -1 }, '家庭'); }
  } });

  /* ========== どの時代にもある暮らしの分かれ道 ========== */

  // 70 恋（昔の暮らし）：幼なじみや身分違いの相手への想い
  //   型：身分違い・反対される恋（直木賞『恋歌』『邂逅の森』、『曽根崎心中』）・一人で生きるか所帯を持つか（直木賞『つまをめとらば』、芥川賞『おらおらでひとりいぐも』）
  arc({ id: 'koi', start: function (c) {
    var L = c.L;
    if (c.marryPending() || c.s.done.koi || !c.O || L.married || c.a < 15 || c.a > 24 || L.status === 'priest' || !c.p(0.08 + 0.04 * Math.max(0, c.tr('warm')))) return false;
    c.s.koiName = c.name(L.sex === 'm' ? 'f' : 'm');
    var gap = c.r() < 0.35;
    c.s.koiGap = gap;
    c.ask('koi', '想い', (gap ? '家の格の違う' : '幼なじみの') + c.s.koiName + 'のことが、いつも気になっている。' + (gap ? '親はきっと許さない。' : '') + '想いを伝える？', [
      { k: 'tell', l: '想いを伝える', w: 0.6 + Math.max(0, c.tr('adv')) + Math.max(0, c.tr('warm')) * 0.5, f: ['family'] },
      { k: 'keep', l: '胸にしまう', w: 1 + Math.max(0, -c.tr('adv')) * 0.5, f: ['study', 'earn', 'save'] }
    ]);
    return true;
  }, res: {
    tell: function (c) {
      var ok = c.p(c.s.koiGap ? 0.3 : 0.55);
      if (ok) { c.s.f.koiWed = c.y; c.marry(4); c.say(c.s.koiName + 'も同じ気持ちだった。' + (c.s.koiGap ? '親たちを説き伏せるのに、一年かかった。' : '祭りの夜、ふたりで夜店を歩いた。'), { sat: 10, tie: 6 }); }
      else c.say((c.s.koiGap ? '親に知られ、二度と会うなと言われた。' : c.s.koiName + 'には、もう決まった相手がいた。') + 'その年の夏は、長く感じた。', { sat: -10, tie: -3 });
    },
    keep: function (c) { c.say('想いは胸にしまった。' + c.s.koiName + 'が嫁入りの行列で村を出る日、遠くから見送った。', { sat: -4 }); c.s.f.koiLost = c.s.koiName; c.later(25 + Math.floor(c.r() * 15), 'koi.echo'); }
  } });
  N['koi.echo'] = function (c) { if (c.L.alive && c.s.f.koiLost) c.say('年を取ってから、法事の席で' + c.s.f.koiLost + 'と言葉を交わした。「あのころ、好きでした」と、笑って言えた。', { sat: 4 }); };

  // 71 田畑や家財の分け方で、きょうだいがもめる
  //   型：兄弟姉妹の確執・家督争い（直木賞『極楽征夷大将軍』『あかね空』『星落ちて、なお』、ドラマ『俺の家の話』）
  arc({ id: 'isan', start: function (c) {
    var L = c.L, sibs = (L.members || []).filter(function (m) { return m.sib && m.alive && !m.gone; });
    if (c.s.done.isan || !L.dad || L.dad.alive || L.dad.dy !== c.y && L.dad.dy !== c.y - 1 || !sibs.length || c.a < 20 || !c.p(0.3)) return false;
    c.s.sibName = /アイヌ語/.test(sibs[0].name || '') ? sibs[0].role : sibs[0].name; c.s.sibRole = sibs[0].role;
    c.ask('isan', '父の遺したもの', '父が遺した' + (c.O && c.y < 1950 ? '田畑と家財' : '家と預金') + 'の分け方で、' + (c.s.sibName === c.s.sibRole ? c.s.sibRole : c.s.sibRole + 'の' + c.s.sibName) + 'と言い争いになった。', [
      { k: 'give', l: '譲る', w: 0.6 + Math.max(0, c.tr('warm')), f: ['family'] },
      { k: 'fight', l: '自分の取り分を主張する', w: 0.6 + Math.max(0, c.tr('adv')) * 0.5 + Math.max(0, -c.tr('warm')) * 0.5, f: ['earn', 'save'] }
    ]);
    return true;
  }, res: {
    give: function (c) { c.say(c.s.sibRole + 'に譲った。取り分は減ったが、正月にはきょうだいがそろって集まれた。', { tie: 6, sat: -1 }, '家庭'); },
    fight: function (c) { if (c.p(0.5)) c.say('話し合いはこじれ、' + c.s.sibRole + 'とはそれきり口をきかなくなった。', { tie: -10, sat: -4 }, '家庭'); else c.say('互いに言いたいことを言い尽くしたあと、半分ずつ分けることで落ち着いた。', { tie: -2 }, '家庭'); c.s.f.isanFight = c.y; c.later(20 + Math.floor(c.r() * 10), 'isan.echo'); }
  } });
  N['isan.echo'] = function (c) { if (c.L.alive) c.say('年老いた' + c.s.sibRole + 'から便りが来た。「あのときは悪かった」とだけ書いてあった。', { tie: 6, sat: 4 }, '家庭'); };

  // 72 友に金を貸すか（請け人・保証人）
  //   型：友に金を貸す（『曽根崎心中』、『東海道中膝栗毛』）・預かったもの・約束を果たすか（直木賞『小さいおうち』、芥川賞『沖で待つ』）
  arc({ id: 'kasu', start: function (c) {
    var L = c.L;
    if (c.s.done.kasu || c.y < 1300 || c.a < 22 || c.a > 55 || c.poor() || !c.p(0.025)) return false;
    c.s.tomo = c.name(L.sex);
    c.ask('kasu', '友の頼み', '古くからの友の' + c.s.tomo + 'に、「商いの元手が足りない。必ず返すから」と' + (c.y < 1950 ? '金の請け人（保証人）になってほしい' : '借金の保証人になってほしい') + 'と頼まれた。', [
      { k: 'yes', l: '請け人を引き受ける', w: 0.6 + Math.max(0, c.tr('warm')), f: ['family'] },
      { k: 'no', l: '請け人だけは断る', w: 1 + Math.max(0, -c.tr('warm')) * 0.5, f: ['save', 'earn'] }
    ]);
    return true;
  }, res: {
    yes: function (c) { c.s.f.kasu = c.y; c.later(2 + Math.floor(c.r() * 3), 'kasu.next'); c.say(c.s.tomo + 'の頼みを引き受けた。', { tie: 3 }); },
    no: function (c) { c.say('断った。' + c.s.tomo + 'はそれ以上何も言わずに帰っていった。', { tie: -4 }); }
  } });
  N['kasu.next'] = function (c) {
    if (!c.L.alive) return;
    if (c.p(0.45)) c.say(c.s.tomo + 'の商いはうまくいかず、行方が分からなくなった。借金の取り立てが自分のところに来た。', { sat: -14, tie: -6 }, '家庭');
    else c.say(c.s.tomo + 'の商いが軌道に乗り、借りた金は利息をつけて返された。「あのとき信じてくれたから」と頭を下げられた。', { sat: 6, tie: 8 }, '家庭');
  };

  // 73 子が熱を出したとき（祈るか、医者を呼ぶか）
  //   型：病・障害とともに生きる（芥川賞『ハンチバック』、直木賞『銀河鉄道の父』『しろがねの葉』）
  //   亡くなるかどうかは生命表のまま。ここでは親の選び方と気持ちだけを書く
  arc({ id: 'kobyo', start: function (c) {
    var L = c.L, kid = (L.members || []).filter(function (m) { return m.role === '子' && m.alive && !m.gone && c.y - m.by <= 6 && c.y - m.by >= 1; })[0];
    if (c.s.done.kobyo || !c.O || c.y > 1945 || !kid || !c.p(0.06)) return false;
    c.s.kidName = /アイヌ語/.test(kid.name || '') ? (kid.sex === 'm' ? '息子' : '娘') : kid.name;
    c.ask('kobyo', '子の熱', (/アイヌ語/.test(kid.name || '') ? '' : '子の') + c.s.kidName + 'が高い熱を出し、三日も下がらない。', [
      { k: 'pray', l: c.y < 1868 ? '寺社に祈祷を頼む' : '神社にお百度を踏む', w: 1, f: ['family'] },
      { k: 'doc', l: c.y < 1868 ? '町の医者を呼ぶ（高くつく）' : '医者に診せる（高くつく）', w: 0.6 + (c.poor() ? -0.3 : 0.5), f: ['body'] }
    ]);
    return true;
  }, res: {
    pray: function (c) { c.say('夜通し祈った。明け方、' + c.s.kidName + 'の額に触れると、熱が少し下がっていた。', { tie: 4 }, '家庭'); },
    doc: function (c) { c.say('なけなしの金で医者を呼んだ。苦い薬を嫌がる' + c.s.kidName + 'に、なんとか飲ませた。', { tie: 4, sat: -2 }, '家庭'); }
  } });

  // 74 隣村との水争い
  //   型：乱取りと村の自衛（大河『麒麟がくる』『おんな城主 直虎』）・村のために一歩出る（本屋大賞『水車小屋のネネ』『みかづき』）
  arc({ id: 'mizu', start: function (c) {
    var L = c.L;
    if (c.s.done.mizu || !c.O || c.y > 1950 || ['hyakusho', 'heimin'].indexOf(L.status) < 0 || c.kind !== 'village' || L.sex !== 'm' || c.a < 25 || c.a > 55 || !c.p(0.03)) return false;
    c.ask('mizu', '水争い', '日照りの夏、上流の村が用水の堰を勝手に閉めた。村の寄り合いで、談判の使いを誰が務めるかでもめている。', [
      { k: 'go', l: '自分が使いに立つ', w: 0.5 + Math.max(0, c.tr('adv')) + Math.max(0, c.tal('talk')) * 0.5, f: ['family'] },
      { k: 'no', l: '黙っている', w: 1, f: ['save', 'body'] }
    ]);
    return true;
  }, res: {
    go: function (c) { if (c.p(0.55 + 0.1 * c.tal('talk'))) { c.say('上流の村の庄屋の家に三日通い、堰を半分開けさせる約束を取りつけた。村の年寄りに肩をたたかれた。', { tie: 10, sat: 6 }, '地域'); c.s.f.mizu = c.y; } else c.say('談判はもの別れに終わり、夜中に村の若い衆どうしが殴り合いになった。', { tie: -2, body: -4 }, '地域'); },
    no: function (c) { c.say('黙って成り行きを見守った。', null, '地域'); }
  } });

  // 75 祭りの役
  //   型：何かにのめり込む・仲間（本屋大賞『風が強く吹いている』、ドラマ『あまちゃん』）
  arc({ id: 'matsuri', start: function (c) {
    var L = c.L;
    if (c.s.done.matsuri || !c.O || c.a < 16 || c.a > 26 || !c.p(0.04 + 0.03 * Math.max(0, c.tr('soc')))) return false;
    c.ask('matsuri', '祭り', (L.sex === 'm' ? '村の若者組で、秋祭りの神輿の先頭' : '村の娘組で、秋祭りの踊りの手本') + 'を任せたいと言われた。', [
      { k: 'yes', l: '先頭に立つと引き受ける', w: 0.8 + Math.max(0, c.tr('soc')), f: ['family', 'body'] },
      { k: 'no', l: '裏方に回りたいと言う', w: 0.8 + Math.max(0, -c.tr('soc')), f: ['study', 'save'] }
    ]);
    return true;
  }, res: {
    yes: function (c) { c.say('ひと月、毎晩稽古した。祭りの日、村じゅうの拍手を浴びた。' + (c.L.married ? '' : 'それから、村の娘たちや若者たちに顔を覚えられた。'), { tie: 8, sat: 6 }, '地域'); if (!c.L.married) c.marry(1.5); },
    no: function (c) { c.say('役は断り、見物の側で祭りを楽しんだ。', null, '地域'); }
  } });

  // 76 連れ合いを亡くしたあと、後添えをもらうか
  //   型：配偶者を亡くしたあと、留まるか進むか（本屋大賞『昨夜のカレー、明日のパン』『永い言い訳』、芥川賞『おらおらでひとりいぐも』）
  arc({ id: 'atozoe', start: function (c) {
    var L = c.L, sp = L.spouse || (L.members || []).filter(function (m) { return m.role === '配偶者'; })[0];
    if (c.marryPending() || c.s.done.atozoe || L.married || !sp || sp.alive || sp.dy == null || c.y - sp.dy > 2 || c.a < 25 || c.a > 55 || !c.p(0.5)) return false;
    c.ask('atozoe', '後添え', '連れ合いを亡くして' + (c.y - sp.dy || 1) + '年。親戚が、後添えの話を持ってきた。', [
      { k: 'yes', l: '会ってみる', w: 0.8 + Math.max(0, c.tr('soc')) * 0.5 + ((L.members || []).some(function (m) { return m.role === '子' && m.alive && c.y - m.by < 12; }) ? 0.8 : 0), f: ['family'] },
      { k: 'no', l: '亡き連れ合いを思い、断る', w: 0.8 + Math.max(0, c.tr('warm')) * 0.5, f: ['study', 'save'] }
    ]);
    return true;
  }, res: {
    yes: function (c) { c.marry(4); c.say('会ってみることにした。仏壇に手を合わせてから、出かけた。', { sat: 2 }); },
    no: function (c) { c.marry(0.3); c.say('話は断った。命日には、ふたりで植えた木の下に座った。', { sat: -2, tie: 2 }); }
  } });

  // 77 晩年、子や孫に語り残す
  //   型：晩年に人生を振り返る（直木賞『小さいおうち』、芥川賞『おらおらでひとりいぐも』、直木賞『海の見える理髪店』）
  arc({ id: 'katari', start: function (c) {
    var L = c.L, kids = (L.members || []).filter(function (m) { return (m.role === '子' || m.role === '孫') && m.alive && !m.gone; });
    if (c.s.done.katari || c.a < 60 || !kids.length || !c.p(0.04)) return false;
    var big = c.s.f.ise ? '伊勢参りの旅' : c.s.f.manshu ? '満州から逃げてきた日々' : c.s.f.dreamGo ? '夢を追って都会に出たころ' : c.s.f.shishi ? '京で仲間と走り回った日々' : c.s.f.yashiki ? '江戸の屋敷で奉公した日々' : c.s.f.orphan ? '焼け跡で子を引き取った日のこと' : null;
    c.ask('katari', '語り残す', '孫に「昔の話をして」とせがまれた。' + (big ? big + 'のことを話す？' : '若いころの話をする？'), [
      { k: 'tell', l: '話して聞かせる', w: 1 + Math.max(0, c.tr('soc')), f: ['family'] },
      { k: 'no', l: '「昔のことは忘れた」と笑う', w: 0.6 + Math.max(0, -c.tr('soc')), f: ['body'] }
    ]);
    c.s.kataBig = big;
    return true;
  }, res: {
    tell: function (c) { c.say((c.s.kataBig || '若いころのこと') + 'を、夜が更けるまで話した。孫は途中で眠ってしまったが、ひとつ残らず話せた気がした。', { sat: 6, tie: 6 }, '家庭'); },
    no: function (c) { c.say('「昔のことは忘れたよ」と笑ってごまかした。本当は、ひとつも忘れていなかった。', { sat: 1 }, '家庭'); }
  } });

  function sumFx(evs) { var o = {}; evs.forEach(function (e) { if (e.st) for (var k in e.st) o[k] = (o[k] || 0) + e.st[k]; }); return o; }
  // 分かれ道の答えごとに動く数値の向き（何千回も回して、いつも同じ向きに動くものだけ向きを書く。向きが毎回ちがうものは「結果しだい」）
  var HINTS = {"kobyo:doc": "暮らしの満足−　つながり＋", "matsuri:yes": "暮らしの満足＋　つながり＋", "mizu:no": "大きくは変わらない", "kumano:go": "暮らしの満足＋　つながり＋", "koi:keep": "暮らしの満足−", "tozoku:join": "暮らしの満足−　つながり−", "atozoe:yes": "暮らしの満足＋", "kumano:no": "大きくは変わらない", "chosan:stay": "暮らしの満足−　からだ−", "koi:tell": "結果しだい", "matsuri:no": "大きくは変わらない", "kobyo:pray": "つながり＋", "shukke:no": "つながり＋", "shukke:go": "暮らしの満足＋　つながり−　学び＋", "atozoe:no": "暮らしの満足−　つながり＋", "geino:no": "暮らしの満足−", "isan:fight": "結果しだい", "chosan:go": "結果しだい", "geino:go": "暮らしの満足＋　つながり−　学び＋", "mizu:go": "結果しだい", "kasu:yes": "つながり＋", "randori:hide": "暮らしの満足−", "randori:fort": "結果しだい", "kasu:no": "つながり−", "kunigae:stay": "暮らしの満足−　つながり＋", "ise:go": "暮らしの満足＋　つながり＋", "yukaku.next:run": "結果しだい", "isan:give": "暮らしの満足−　つながり＋", "henro:no": "つながり＋", "ise:no": "暮らしの満足−", "bakuchi:go": "暮らしの満足−　つながり−", "ikki:no": "暮らしの満足−", "katari:tell": "暮らしの満足＋　つながり＋", "rangaku:go": "つながり−　学び＋", "henro:go": "暮らしの満足＋　つながり＋　からだ−", "bakuchi:no": "暮らしの満足＋　つながり＋", "yamiichi:no": "暮らしの満足−　からだ−", "miai:yes": "暮らしの満足＋　つながり＋", "yamiichi:sell": "結果しだい", "yamiichi:buy": "暮らしの満足＋　からだ＋", "help:help": "暮らしの満足＋　つながり＋", "care:home": "暮らしの満足−　つながり＋　からだ−", "help:pass": "暮らしの満足−", "late:no": "暮らしの満足＋", "biz:no": "つながり−", "care:home2": "暮らしの満足−", "toxic.leave:stay": "暮らしの満足−", "conne:take": "暮らしの満足＋", "katari:no": "暮らしの満足＋", "toxic.leave:go": "暮らしの満足＋　つながり−", "toxic.call:no": "結果しだい", "late:go": "暮らしの満足＋　つながり＋　学び＋", "doikki:no": "暮らしの満足−", "kirishitan:yes": "暮らしの満足＋　つながり＋", "kirishitan:no": "大きくは変わらない", "kunigae:go": "暮らしの満足−　つながり＋", "ikki:join": "結果しだい", "rangaku:no": "暮らしの満足−", "shoya:tell": "結果しだい", "shokunin:go": "つながり−　学び＋", "imin:no": "大きくは変わらない", "imin:go": "暮らしの満足−　つながり−　からだ−", "manshu:go": "暮らしの満足＋　つながり−", "bubble:buy": "暮らしの満足＋", "shokunin:no": "大きくは変わらない", "doikki:join": "暮らしの満足＋　つながり＋", "ashigaru:go": "暮らしの満足＋　つながり−　からだ−", "rakujo:flee": "暮らしの満足−　つながり−", "kojo:go": "暮らしの満足−　つながり−　からだ−", "cafe:go": "結果しだい", "bubble:no": "大きくは変わらない", "biz:yes": "暮らしの満足＋　つながり＋", "dream.go:go": "暮らしの満足＋　つながり−", "dream.quit:keep": "暮らしの満足−", "dream.quit:home": "結果しだい", "shukko:go": "暮らしの満足−　つながり＋", "care:work": "暮らしの満足−　からだ−", "rakujo:stay": "暮らしの満足＋　つながり＋", "shoya:give": "暮らしの満足−", "cafe:no": "大きくは変わらない", "yukaku.next:ukeru": "結果しだい", "orphan:take": "暮らしの満足＋　つながり＋", "machi:no": "大きくは変わらない", "dream.go:drop": "結果しだい", "orphan:no": "暮らしの満足−", "love5.reunion:ask": "結果しだい", "account:sell": "結果しだい", "account.home:stay": "結果しだい", "ashigaru:no": "つながり＋", "narrow:no": "暮らしの満足−", "side:a": "結果しだい", "gyoretsu:no": "暮らしの満足−", "miai:no": "暮らしの満足−", "toxic.call:meet": "暮らしの満足＋　つながり＋", "shishi:no": "暮らしの満足−", "conne:own": "結果しだい", "shishi:go": "結果しだい", "kojo:no": "暮らしの満足＋", "manshu:no": "結果しだい", "machi:go": "結果しだい", "shukko:quit": "暮らしの満足−", "abroad:follow": "結果しだい", "tozoku:no": "暮らしの満足−", "shoya.up:down": "結果しだい", "taika:stay": "結果しだい", "sumoOld:go": "結果しだい", "dream.go:side": "暮らしの満足＋", "reality:yes": "結果しだい", "miyazukae:go": "結果しだい", "love5.reunion:no": "結果しだい", "kirishitan.ban:hide": "結果しだい", "yukaku.next:stay": "暮らしの満足−", "taika:go": "結果しだい", "gyoretsu:go": "結果しだい", "kirishitan.ban:drop": "結果しだい", "side:b": "結果しだい", "miyazukae:no": "結果しだい"};
  // 進め方の本体（engine.js・history.js）の分かれ道の答え。結果は統計の割合で決まるので「しだい」と書く
  var ENGINE_HINT = {
    take: '学び＋になりやすい（受かるかしだい）', no: '大きくは変わらない', gen: '学び＋になりやすい（結果しだい）', voc: '仕事に就くのが早くなりやすい（結果しだい）',
    study: '学び＋になりやすい（受かるかしだい）', work: '暮らしの満足＋になりやすい（結果しだい）', go: '暮らしが変わる（結果しだい）', stay: 'つながり＋になりやすい（結果しだい）',
    yes: 'つながり＋になりやすい（相手しだい）', family: 'つながり＋になりやすい（家族しだい）', friend: 'つながり＋になりやすい（相手しだい）', none: '大きくは変わらない',
    pledge: 'つながり＋になりやすい（相手しだい）', live: 'つながり＋になりやすい（相手しだい）', alone: '大きくは変わらない', maybe: '縁しだい',
    office: '暮らしの満足＋になりやすい（結果しだい）', tech: '暮らしの満足＋になりやすい（結果しだい）', care: '暮らしの満足＋になりやすい（結果しだい）', service: '暮らしの満足＋になりやすい（結果しだい）'
  };
  function hintFor(br, o) {
    if (o.h) return o.h;
    if (br.sid && HINTS[br.sid + ':' + o.k]) return HINTS[br.sid + ':' + o.k];
    if (br.id === 'story') return '結果しだい';
    return ENGINE_HINT[o.k] || '結果しだい';
  }
  /* ========== 小さな選択・親の選択（js/choices.js） ========== */
  function choicesMod() {
    var CH = root.IchiokuChoices || null;
    if (!CH && typeof require === 'function') { try { CH = require('./choices.js'); } catch (e) { CH = null; } }
    // 第6版の選択（js/s6.js）を一度だけ足す
    if (CH && !CH._s6) {
      CH._s6 = true;
      var S6 = s6Mod();
      if (S6 && S6.choices) S6.choices.forEach(function (o) {
        CH.list.push({ id: o.id, kind: o.kind, y: o.y, a: o.a, when: o.when || {}, text: o.text, texts: [].concat(o.text), s6: true,
          options: CH.balance ? CH.balance(o.options.map(function (p) { return { k: p.k, l: p.l, fx: Object.assign({}, p.fx || {}), after: p.after || null, money: p.money || null }; })) : o.options.map(function (p) { return { k: p.k, l: p.l, fx: p.fx || {}, after: p.after || null, money: p.money || null }; }) });
      });
    }
    // どちらの答えにも得るものと失うものを（spec6 2-15）。全部そろったあとに一度だけ
    if (CH && CH.balance && !CH._bal) { CH._bal = true; CH.list.forEach(function (o) { CH.balance(o.options); }); }
    return CH;
  }
  function s6Mod() {
    if (root.IchiokuS6) return root.IchiokuS6;
    if (typeof require === 'function') { try { return require('./s6.js'); } catch (e) { return null; } }
    return null;
  }
  // 選択肢と重点（おまかせ）の対応
  function focusOf(fx) { var f = []; if (fx.learn > 0) f.push('study'); if (fx.tie > 0) f.push('family'); if (fx.body > 0) f.push('body'); if (fx.sat > 0) f.push('earn', 'save'); return f; }
  // 差し込み：家族と幼なじみの名前。埋められないときは null
  function people(c) {
    var L = c.L, y = c.y, ms = (L.members || []).filter(function (m) { return m.alive && !m.gone && m.by <= y && !m.before; });
    var one1 = function (f) { return ms.filter(f)[0]; };
    var older = ms.filter(function (m) { return m.sib && m.by < L.by; }), younger = ms.filter(function (m) { return m.sib && m.by > L.by; });
    var sp = one1(function (m) { return m.role === '配偶者' || m.role === 'パートナー'; });
    var kids = ms.filter(function (m) { return m.role === '子'; });
    if (!c.s.friend && c.a >= 5) { c.s.friend = c.name(c.r() < 0.5 ? 'm' : 'f'); }
    // アイヌ語の名前は書き表さず、続き柄で呼ぶ
    var ainu = function (n) { return !n || /アイヌ語/.test(n); };
    var nm = function (m) { if (!m) return null; return ainu(m.name) ? (m.role === '子' ? (m.sex === 'm' ? '息子' : '娘') : m.role === '配偶者' ? (m.sex === 'm' ? '夫' : '妻') : m.role) : m.name; };
    return {
      name: ainu(L.name) ? (c.a < 15 ? 'この子' : null) : L.name, mom: nm(one1(function (m) { return m.role === '母'; })), dad: nm(one1(function (m) { return m.role === '父'; })),
      sibOlder: older.length ? nm(older[older.length - 1]) : null, sibYounger: younger.length ? nm(younger[0]) : null,
      spouse: nm(sp), child: kids.length ? nm(kids[kids.length - 1]) : null, friend: ainu(c.s.friend) ? null : c.s.friend,
      place: String(c.place || '').replace(/（今の.*?）/, '')
    };
  }
  function fillT(t, P) {
    if (t == null) return null;
    var bad = false;
    var out = t.replace(/\{(\w+)\}/g, function (m0, k) { var v = P[k]; if (!v) { bad = true; return ''; } return v; });
    return bad ? null : out;
  }
  // その人の仕事の種類（子どものうちは家の仕事）：農・漁・商・職人・勤め人・武士・寺社（v8の直し 2）
  var IND_OLD = { farm: 'farm', fish: 'fish', shop: 'shop', store: 'shop', maid: 'shop', kozo: 'shop', hoko: 'shop', craft: 'craft', factory: 'craft', silk: 'craft', build: 'craft', leather: 'craft', kawara: 'craft',
    samurai: 'bushi', bushiMed: 'bushi', court: 'office', temple: 'priest', clerk: 'office', office: 'office', teacher: 'office', genin: 'farm', hunt: 'fish', ainu: 'fish', ryuOff: 'office' };
  var IND_NEW = { agri: 'farm', fish: 'fish', shop: 'shop', service: 'shop', factory: 'craft', build: 'craft', office: 'office', pub: 'office', care: 'office' };
  var CAT_IND = { farm: 'farm', yama: 'farm', ryuFarm: 'farm', ryukyu: 'farm', fish: 'fish', hunt: 'fish', ainu: 'fish', craft: 'craft', factory: 'craft', build: 'craft', leather: 'craft', kawara: 'craft', shop: 'shop', store: 'shop', maid: 'shop',
    samurai: 'bushi', bushiMed: 'bushi', kuge: 'office', court: 'office', clerk: 'office', office: 'office', teacher: 'office', shizoku: 'office', temple: 'priest', genin: 'farm', ryuOff: 'office', rare: 'shop' };
  var PATH_CAT_IND = { farm: 'farm', fish: 'fish', shop: 'shop', craft: 'craft', office: 'office', samurai: 'bushi', temple: 'priest', teacher: 'office', clerk: 'office', service: 'shop' };
  function indOf(c) {
    var L = c.L;
    if (L.pathJob && PATH_CAT_IND[L.pathJob.cat]) return PATH_CAT_IND[L.pathJob.cat];
    if (L.old) {
      if (c.a >= 13 && L.job && L.job !== 'home' && IND_OLD[L.job]) return IND_OLD[L.job];
      if (L.parentJob && CAT_IND[L.parentJob.cat]) return CAT_IND[L.parentJob.cat];
      return { bushi: 'bushi', shizoku: 'office', kuge: 'office', priest: 'priest', chonin: 'shop' }[L.status] || (L.kind === 'fish' ? 'fish' : L.kind === 'city' || L.kind === 'town' ? 'shop' : 'farm');
    }
    if (c.a >= 15 && L.job && L.job.ind) return IND_NEW[L.job.ind] || 'office';
    return IND_NEW[L.dadJob] || 'office';
  }
  // 大きな出来事の年（その年と前の年の出来事、戦時中）：その出来事に関わる選択を先に出し、時代を問わない選択は出さない（v8の直し 3）
  function bigEv(c) {
    var y = c.y, L = c.L, recs = [c.rec].concat((L.log || []).slice(-2));
    var t = recs.map(function (r) { return r ? (r.events || []).map(function (e) { return e.t; }).join('') + ((r.world && r.world.items) || []).map(function (i) { return i.t; }).join('') : ''; }).join('');
    if (y >= 1937 && y <= 1945) return 'war';
    if (/空襲|出征|合戦|戦に|落城|戦が/.test(t)) return 'war';
    if (/大きな地震|大地震|地震で|揺れ/.test(t)) return 'quake';
    if (/飢饉|凶作/.test(t)) return 'famine';
    if (/大火|焼け出され/.test(t)) return 'fire';
    if (/疫病|コレラ|はやり病|疱瘡がはやり|かぜが流行|スペインかぜ|新型コロナ/.test(t)) return 'epidemic';
    return null;
  }
  var AWAY_WORDS = /町の暮らしに|同じ長屋の人と|ふるさとからの便り|故郷からの便り/;
  var AWAY_ONLY = /町の暮らし|長屋|ふるさと|故郷|便り|訛り|町の人|町の祭り|町の灯|都会/, TOWN_ONLY = /長屋|路地|表通り/;
  var AWAY_BAN = /年貢|田植|稲刈|麦刈|用水|隣の田|同じ村|五人組|寄り合い|寄合|村の|村人|家の田|田畑|代官所|名主|庄屋|囲炉裏|家業/;
  // 家を出て落ち着いた人（spec6 1-1）：出家・旅・出征は除く
  // 家を出たことになっていても、生まれた土地に住んだままの人（筋で「家を出る」答えのあと土地を移っていない人）
  function awayHome(L) { return L.mode === 'away' && !(L.old ? (L.moved || L.abroad) : (L.place && L.place.away)); }
  function settled(L) {
    if (awayHome(L)) return true;
    if (L.mode === 'away') return L.year - (L.modeSince || L.year) >= 2;
    if (L.mode === 'hoko') return L.age >= 30;
    return false;
  }
  // 今の仕事の名前（記録の「仕事」と同じ決め方）
  function curJob(L) {
    if (L.selfJob && L.selfJob.n) return L.selfJob.n;
    if (L.job && L.job.label) return L.job.label;
    return L.lastJob || null;
  }
  function eligible(c, o) {
    var L = c.L, w = o.when || {}, y = c.y, a = c.a;
    if (w.ind && w.ind.indexOf('home') < 0 && w.ind.indexOf(c.ind || (c.ind = indOf(c))) < 0) return false;
    if (w.pref && w.pref.indexOf(String(L.old ? L.pref : (L.place || {}).pref)) < 0) return false;
    if (w.ev && w.ev !== c.ev) return false;
    if (w.u && c.ev) return false;
    if (y < o.y[0] || y > o.y[1] || a < o.a[0] || a > o.a[1]) return false;
    if (w.y && (y < w.y[0] || y > w.y[1])) return false;
    if (w.sex && w.sex !== L.sex) return false;
    if (w.status && w.status.indexOf(c.st) < 0) return false;
    if (w.kind && w.kind.indexOf(c.kind) < 0) return false;
    // 家を離れている年（出家・旅・奉公・出征）は、その状態のための選択だけ出す（家の中の選択は出さない）
    // ただし、家を出て2年たった人（筋で町や都に出た人）と、30歳を過ぎて奉公を続ける人は、今住む土地の暮らしの選択を出す（spec6 1-1）
    if (L.mode && !(w.mode && w.mode.indexOf(L.mode) >= 0) && !(settled(L) && !w.mode)) return false;
    if (w.mode && (w.mode.indexOf(L.mode) < 0 || L.modeSince === y)) return false; // その状態にいる人だけ。家を離れたその年は、まだその場での選択を出さない
    if (w.poor && !c.poor()) return false;
    if (w.heirOnly && !(L.heir || (!L.old && L.sex === 'm'))) return false;
    if (w.unmarried && L.married) return false;
    if (w.married && !L.married) return false;
    if (w.job && !(L.job && L.job !== 'home')) return false;
    if (w.hoko && !((L.hoko && !L.hoko.done) || L.mode === 'hoko')) return false;
    if (w.hasChild && !(L.members || []).some(function (m) { return m.role === '子' && m.alive && !m.gone && m.by <= y; })) return false;
    if (w.hasSib && !(L.members || []).some(function (m) { return m.sib && m.alive && !m.gone && m.by <= y; })) return false;
    if (w.parentOld && !parentOld(L, 70)) return false;
    if (w.divorced && !L.everDivorced) return false;
    if (w.childless && (L.members || []).some(function (m) { return m.role === '子' && !m.before; })) return false;
    if (w.rich && !((L.incPct == null ? 0.5 : L.incPct) > 0.7)) return false;
    if (w.kakaku && w.kakaku.indexOf(L.kakaku) < 0) return false;
    if (w.grade && w.grade.indexOf(L.grade) < 0) return false;
    if (w.jobIs && w.jobIs.indexOf(curJob(L)) < 0) return false;
    if (w.rank && w.rank.indexOf(L.rank) < 0) return false;
    if (w.crime && !(L.crimes && L.crimes.length)) return false;
    if (o.kind === 'parent' && a > 5) return false;
    if (o.kind !== 'parent' && a < 6) return false;
    return true;
  }
  function makeChoiceBranch(c, title, text, options, data) {
    if (c.api && c.api.eraWords) { text = c.api.eraWords(text, c.y, c.L); options.forEach(function (p) { p.l = c.api.eraWords(p.l, c.y, c.L); }); }
    var br = { id: 'story', kind: 'story', sid: 'choice', ra: '__choice', title: title, groups: [{ id: 's', q: text, options: options.map(function (p) { return { k: p.k, l: p.l, f: focusOf(p.fx || {}), h: p.h || CHint(p.fx || {}) }; }) }], w: {}, d: data };
    options.forEach(function (p, i) { br.w[p.k] = 1 + (i === 0 ? 0.3 : -0.3) * (c.s.tr.adv || 0) + (p.fx && p.fx.tie > 0 ? 0.3 * (c.s.tr.warm || 0) : 0); });
    c.L.queue.push(br);
    c.s.asked = c.y; c.s.nChoice = (c.s.nChoice || 0) + 1;
    var dk = Math.floor(c.a / 10) * 10; (c.s.decC = c.s.decC || {})[dk] = (c.s.decC[dk] || 0) + 1;
  }
  function CHint(fx) { var CHm = choicesMod(); return CHm ? CHm.hint(fx) : ''; }
  // 毎年の小さな選択（出る年はおよそ6割強。大きな決断が出る年は出さない）
  function choiceYear(c, P) {
    var CHm = choicesMod(), s = c.s;
    if (!CHm) return;
    s.seen = s.seen || {}; s.cool = s.cool || {};
    var a = c.a;
    // 0歳：名付け／2歳：気質／5歳：節目（必ず出す）
    if (a === 0) return nameChoice(c, P);
    if (a === 2) return tempChoice(c, P);
    if (a === 5) return fiveChoice(c, P);
    if ((c.L.refused || 0) >= 3 && !s.pressured && !c.L.married && a >= 18) {
      s.pressured = c.y;
      return makeChoiceBranch(c, '小さな選択', '縁談を断るのも' + c.L.refused + '度目になった。' + (P.dad ? P.dad : '親') + 'と' + (c.kind === 'city' || c.y >= 1946 ? '親戚' : '村の年寄り') + 'に、「いつまで選り好みをするのか」と囲まれた。', [
        { k: 'promise', l: '次の話は受けると約束する', fx: { tie: 2, sat: -1 } }, { k: 'own', l: '自分の考えを通す', fx: { sat: 1, tie: -2 } }], { cid: '_press', kind: 'small' });
    }
    // 1944〜1945年の町の国民学校の子には、学童疎開の選択を必ず出す（v8の直し 3）
    var sokaiKid = c.y >= 1944 && c.y <= 1945 && a >= 6 && a <= 12 && (c.kind === 'city' || c.kind === 'town') && !s.sokaiSeen;
    var DBG = typeof globalThis !== 'undefined' && globalThis.__ICH_DBG;
    // 40歳から先は、どの10年にも3回以上の選択を出す（spec6 1-1）：その10年の残りの年が足りなくなったら必ず出す
    var dec = Math.floor(a / 10) * 10, decN = (s.decC = s.decC || {})[dec] || 0, must = a >= 40 && dec + 10 - a <= 4 - decN;
    if (!sokaiKid && !must && !c.p(a <= 5 ? 0.5 : a >= 40 ? 0.9 : 0.75)) { if (DBG) DBG('p', c); return; } // 大人の年の選択を1年に0.5回以上に（v11の直し 4）
    c.ev = bigEv(c); c.ind = indOf(c);
    s.labUse = s.labUse || {}; s.nC = s.nC || 0; s.nU = s.nU || 0;
    var pref = String(c.L.old ? c.L.pref : (c.L.place || {}).pref), elite = ['bushi', 'kuge', 'priest'].indexOf(c.st) >= 0;
    var CHk = CHm;
    var list = CHm.list.filter(function (o) { return !/^s6\.fb\./.test(o.id) && eligible(c, o) && !(s.cool[o.id] && c.y - s.cool[o.id] < (o.cool || 8)); });
    // 同じ答えの文は、1つの人生で2回まで（v8の直し 13）
    list = list.filter(function (o) { return !o.options.some(function (p) { return (s.labUse[p.l] || 0) >= 2; }); });
    // 時代を問わない選択は、選択の3割まで（v8の直し 2）
    if ((s.nU + 1) / (s.nC + 1) > 0.3) list = list.filter(function (o) { return !(o.when || {}).u; });
    // 文の候補（同じ文は1回だけ。時代に合わない品物・言葉、住んでいない土地の地名、戦時中に出せない場面は出さない）
    var cand = [];
    list.forEach(function (o) { o.texts.forEach(function (t, i) {
      var ft = fillT(t, P), all = ft + o.options.map(function (p) { return p.l + (p.after || ''); }).join('');
      if (!ft || s.seen[ft]) return;
      if (CHk.eraOk && (!CHk.eraOk(all, c.y, elite) || !CHk.placeOk(all, pref))) return;
      if (c.y >= 1938 && c.y <= 1945 && c.api.WAR_BAN && c.api.WAR_BAN.test(all)) return;
      // 家を出て落ち着いた人には村の暮らしの文を出さない。市街地の人生に「村」を出さない（spec6 1-1・1-7）
      if (c.L.mode && !awayHome(c.L) && AWAY_BAN.test(all)) return;
      if (c.kind === 'city' && /村/.test(all)) return;
      if (c.kind !== 'town' && c.kind !== 'city' && TOWN_ONLY.test(all)) return;
      if (!c.away() && AWAY_WORDS.test(all)) return;
      cand.push({ o: o, t: ft, i: i });
    }); });
    // 40歳から先で候補を使い切ったときは、どこでも出せる選択の書き分け（5通りずつ）から引く（spec6 1-1）
    if (!cand.length && a >= 40) CHm.list.forEach(function (o) { if (!/^s6\.fb\./.test(o.id) || c.y < o.y[0] || c.y > o.y[1] || a < o.a[0]) return; o.texts.forEach(function (t, i) { var ft = fillT(t, P); if (ft && !s.seen[ft]) cand.push({ o: o, t: ft, i: i }); }); });
    if (!cand.length) { if (DBG) DBG('empty', c, list.length); return; }
    // 大きな出来事の年は、その出来事の選択を先に。ふだんは時代と土地で絞った選択を多めに
    var evc = cand.filter(function (x) { return (x.o.when || {}).ev; }), loc = cand.filter(function (x) { return !(x.o.when || {}).u; });
    var pool = evc.length ? evc : loc.length && c.r() < 0.8 ? loc : cand;
    if (sokaiKid) { var sk = cand.filter(function (x) { return /疎開/.test(x.t); }); if (sk.length) pool = sk; }
    var pk = pool[Math.floor(c.r() * pool.length)], o = pk.o;
    if (/疎開/.test(pk.t)) s.sokaiSeen = c.y;
    var opts = [];
    for (var i = 0; i < o.options.length; i++) { var p = o.options[i], l = fillT(p.l, P); if (!l) return; opts.push({ k: p.k, l: l, fx: p.fx }); }
    s.seen[pk.t] = 1; s.cool[o.id] = c.y;
    if (o.kind !== 'parent') { s.nC++; if ((o.when || {}).u) s.nU++; }
    o.options.forEach(function (p) { s.labUse[p.l] = (s.labUse[p.l] || 0) + 1; });
    makeChoiceBranch(c, o.kind === 'parent' ? '親の選択' : '小さな選択', pk.t, opts, { cid: o.id, ti: pk.i, kind: o.kind, u: !!(o.when || {}).u, ev: (o.when || {}).ev || null, ind: c.ind, k: c.kind });
  }
  function nameChoice(c, P) {
    var L = c.L;
    if (L.inherited || !L.name || /アイヌ語/.test(L.name)) return;
    var alt = c.name(L.sex);
    if (!alt || alt === L.name) return;
    c.s.altName = alt;
    var who = P.dad ? P.dad : '父';
    makeChoiceBranch(c, '親の選択', '名前を決める。' + who + 'は「' + L.name + '」、' + (P.mom || '母') + 'は「' + alt + '」がいいと言う。', [
      { k: 'a', l: '「' + L.name + '」にする', fx: { tie: 1 } }, { k: 'b', l: '「' + alt + '」にする', fx: { sat: 1 } }], { cid: '_name', kind: 'parent' });
  }
  function tempChoice(c, P) {
    makeChoiceBranch(c, '親の選択', '2歳。' + P.name + 'は、目を離すとすぐどこかへ行ってしまう。どう育てる？', [
      { k: 'out', l: '外で思いきり遊ばせる', fx: { body: 1, sat: 1 } }, { k: 'near', l: 'そばで見守り、話しかける', fx: { tie: 2 } }, { k: 'self', l: '何でも自分でやらせてみる', fx: { learn: 1, body: 1 } }], { cid: '_temp', kind: 'parent' });
  }
  function fiveChoice(c, P) {
    var sv = c.api.surv5 ? c.api.surv5(c.L) : null;
    var line = sv != null ? '同じ年に生まれた子のうち、5歳を迎えられたのは約' + Math.round(sv * 10) + '割。' : '';
    makeChoiceBranch(c, '節目', '5歳になった。' + line + P.name + 'は、このごろ何に夢中だろう。', [
      { k: 'play', l: '近所の子と遊び回る', fx: { tie: 2, body: 1 } }, { k: 'help', l: '家の手伝いを覚える', fx: { learn: 1, tie: 1 } }, { k: 'dream', l: 'ひとりで空想にふける', fx: { sat: 2 } }], { cid: '_five', kind: 'small' });
  }
  function resolveChoice(L, rec, br, k, api) {
    var c = ctxOf(L, rec, api, br.d), d = br.d || {}, CHm = choicesMod();
    var opt = br.groups[0].options.filter(function (o) { return o.k === k; })[0] || br.groups[0].options[0];
    var o = CHm ? CHm.list.filter(function (x) { return x.id === d.cid; })[0] : null;
    var fx = o ? (o.options.filter(function (x) { return x.k === opt.k; })[0] || {}).fx : null;
    if (d.cid === '_name') {
      fx = opt.k === 'a' ? { tie: 1 } : { sat: 1 };
      if (opt.k === 'b' && c.s.altName) { var old = L.name; L.name = c.s.altName; rec.events.forEach(function (e) { e.t = e.t.split(old).join(L.name); }); }
      c.say('名前は「' + L.name + '」に決まった。', fx, '家庭');
      return;
    }
    if (d.cid === '_press') {
      fx = opt.k === 'promise' ? { tie: 2, sat: -1 } : { sat: 1, tie: -2 };
      if (opt.k === 'promise') { L.never = false; L.marryAt = Math.min(L.marryAt || 99, L.age + 1); L.promised = L.year; }
      c.say(opt.k === 'promise' ? '次の縁談は受けると、父に頭を下げた。' : '「自分の相手は自分で決める」と言い切った。座敷が静まり返った。', fx, '家庭');
      return;
    }
    if (d.cid === '_temp') {
      fx = { out: { body: 1, sat: 1 }, near: { tie: 2 }, self: { learn: 1, body: 1 } }[opt.k];
      var tr = c.s.tr; if (opt.k === 'out') tr.adv += 0.4; else if (opt.k === 'near') tr.warm += 0.4; else tr.grit += 0.4;
      c.say({ out: '泥だらけになって帰ってくる日が増えた。', near: '何でも話してくれる子になった。', self: '転んでも、自分で起き上がるようになった。' }[opt.k], fx, '家庭');
      return;
    }
    if (d.cid === '_five') {
      fx = { play: { tie: 2, body: 1 }, help: { learn: 1, tie: 1 }, dream: { sat: 2 } }[opt.k];
      c.say({ play: '日が暮れるまで、近所の子と駆け回った。', help: '小さな手で、家の手伝いを覚えた。', dream: '雲の形を眺めては、ひとりで物語をこしらえた。' }[opt.k], fx, '家庭');
      return;
    }
    var P = people(c);
    var op0 = o ? o.options.filter(function (x) { return x.k === opt.k; })[0] : null;
    if (op0 && op0.money) c.money(op0.money);
    var after = o ? fillT((op0 || {}).after, P) : null;
    // 答えだけの「〜ことにした。」は出さない（v11の直し 9）。after がない選択肢は、問いの最初の文を添えて、何について決めたかが分かる文にする
    var q1 = (fillT(String((o && (o.texts || [o.text])[d.ti || 0]) || '').split('。')[0], P) || '').replace(/(かどうか|か)?(迷っている|考えている|悩んでいる)$/, '').replace(/[？?]$/, '');
    var t = after || (q1 ? q1 + '。' + (d.kind === 'parent' ? '親は考えた末、' : '考えた末、') + opt.l + 'ことにした。' : (d.kind === 'parent' ? '親は、' : '') + opt.l + 'ことにした。');
    // 同じ選んだ中身の文は、回数で書き分ける（spec6 1-4：「また」「これで三度目だった」）
    var an = c.s.afterN = c.s.afterN || {}; an[t] = (an[t] || 0) + 1;
    if (an[t] === 2) t = 'また、' + t; else if (an[t] > 2) t = 'これで' + (KAZU[an[t]] || an[t]) + '度目だった。' + t;
    c.say(t, fx || {}, d.kind === 'parent' ? '家庭' : '人間関係');
  }

  /* ========== 親の人物像（作る人の指示 2026-10-17。下調べの「親や家の人物像」の型から） ========== */
  // 身分ごとに、父か母の人物像を1つ引き、生まれた年に1行で出す。暮らし向きと、のちの筋の起こりやすさに少し効かせる
  var PERSONA = {
    bushi: [
      ['父は藩の家老のひとりで、表は穏やかだが、裏で藩の政を動かしている。', 0.25, 'karo'], ['父は下城の太鼓とともにまっすぐ家に帰り、病がちな母の看病をする平侍だ。剣の腕は立つらしい。', -0.05, 'heishi'],
      ['父は借金で首が回らず、算盤をはじいては家の立て直しに頭を抱えている。', -0.15, 'debt'], ['父は主家を失った浪人で、傘張りの内職で食いつないでいる。', -0.3, 'ronin'],
      ['父は家督を継げなかった次男で、婿に入った家で肩身のせまい思いをしている。', 0, 'muko'], ['父は藩の勘定方で、帳面の数字にうるさい。', 0.05, 'kanjo']],
    kuge: [
      ['父は受領として地方の国を治め、任国から戻るたびに珍しい品を持ち帰る。', 0.2, 'zuryo'], ['父は権門に取り入るのに忙しく、家にいることは少ない。', 0.1, 'kenmon'],
      ['母は物語好きで、夜ごと古い物語を語って聞かせる。', 0, 'monogatari'], ['父は和歌の家の当主で、歌合の勝ち負けに一喜一憂する。', 0.05, 'uta']],
    hyakusho: [
      ['父は村の庄屋に信頼されている平百姓で、寄り合いではいつも意見を求められる。', 0.05, 'trusted'], ['父は伊勢参りのためなら何でも犠牲にする人で、毎年の講の積み立てで家計はいつも苦しい。', -0.15, 'iseFan'],
      ['父は田を耕すかたわら炭を焼き、冬は町へ売りに出る。', 0, 'sumi'], ['母は口数が少ないが、村一番の機織りの名手だ。', 0.05, 'hata'],
      ['父は酒が好きで、年貢の前になると決まって機嫌が悪くなる。', -0.1, 'drink'], ['父は小作で、地主の家に頭が上がらない。', -0.2, 'kosaku'],
      ['母は教育熱心で、字の読めない自分の代わりに子に手習いをさせたいと願っている。', 0, 'kyoiku']],
    chonin: [
      ['父は倹約と才覚で一代で店を大きくした商人だ。', 0.2, 'self'], ['母は夫亡きあとの店を女手ひとつで切り盛りしている後家だ。', 0.05, 'goke'],
      ['父は腕はいいが気が短い職人で、喧嘩で仕事をしくじることがある。', -0.1, 'tanki'], ['父は上方から下ってきた職人で、江戸の流儀になじめずにいる。', -0.05, 'kamigata'],
      ['父は大晦日になると借金取りに居留守を使う。', -0.2, 'shakkin'], ['父は宿場で旅籠を営み、人の出入りが絶えない。', 0.1, 'hatago']],
    heimin: [
      ['父は小作で、口減らしの話が出るほど家は苦しい。', -0.2, 'kuchi'], ['父は炭鉱で働く荒くれ者で、町の誰もが一目置いている。', -0.05, 'tanko'],
      ['母は教育熱心で、子だけは上の学校へやりたいと内職を増やした。', 0, 'kyoiku'], ['父は頑固だが情に厚い職人で、近所の子にも慕われている。', 0, 'shokunin'],
      ['父は網元で、浜では顔がきく。', 0.2, 'amimoto'], ['父は鉄道に勤め、仕事一筋で家にいることは少ない。', 0.1, 'rail']],
    shizoku: [
      ['父は没落した士族で、昔の誇りを捨てきれず家計を顧みない。', -0.15, 'botsuraku'], ['父は士族の出だが、学校の先生として新しい世を生きている。', 0.05, 'sensei']],
    modern: [
      ['父は単身赴任が多く、家族そろう日は年に数回だ。', 0.05, 'tanshin'], ['母は女手ひとつで子を育てている。', -0.2, 'single'],
      ['父は商店街で店を営み、近所の誰とでも顔なじみだ。', 0, 'shotengai'], ['父は仕事一筋の会社員で、休みの日もほとんど家にいない。', 0.1, 'kaisha'],
      ['母は教育熱心で、習い事の送り迎えに走り回っている。', 0.05, 'kyoiku'], ['父は頑固だが情に厚い職人だ。', 0, 'shokunin'], ['両親は共働きで、祖母が家のことを見てくれている。', 0.05, 'sobo']]
  };
  function personaYear(c) {
    var L = c.L, s = c.s;
    if (s.persona || L.inherited) return;
    var key = c.E ? 'modern' : (L.status === 'genin' || L.status === 'outcast' || L.status === 'buraku' ? 'hyakusho' : L.status);
    if ((key === 'heimin' || key === 'shizoku' || key === 'kazoku') && c.y >= 1946) key = 'modern'; // 戦後の生まれに族籍の人物像を出さない（v11の直し 5-1）
    var list = PERSONA[key];
    if (!list) { s.persona = '-'; return; }
    var p = one(c.r, list);
    s.persona = p[2];
    if (typeof L.incPct === 'number') L.incPct = clamp(L.incPct + p[1], 0.01, 0.99);
    c.say(p[0], null, '家庭');
  }

  /* ========== 人生の山場（どの人生にも1つは作る） ==========
     ほかの大きな決断がまだない人に、10・20・30・42・55歳ごろ、時代に合った山場を1つ出す。型は下調べの「人生の山場」から */
  var DRAMA = [
    { id: 'hitokai', y: [1000, 1650], a: [9, 14], t: '人買い', q: '山道で見知らぬ男に「都へ行けば腹いっぱい食える」と手を引かれた。', o: [['run', '手を振りほどいて逃げる', { body: -2, sat: 2 }, '必死に走って村へ逃げ帰った。あとで、隣村の子がさらわれたと聞いた。'], ['cry', '大声で助けを呼ぶ', { tie: 3 }, '畑にいた大人たちが駆けつけ、男は逃げていった。']] },
    { id: 'kamikakushi', y: [1000, 1900], a: [8, 13], t: '神隠し', q: '祭りの夜、気づくと見知らぬ山の中にいた。遠くで、自分の名を呼ぶ声がする。', o: [['voice', '声のする方へ歩く', { tie: 3, sat: 2 }, '三日目の朝、村の衆に見つけられた。「神隠しから戻った子」と、しばらく噂になった。'], ['stay', '夜が明けるまで動かない', { body: -3, learn: 2 }, '夜明けに沢を下り、自分の足で村へたどり着いた。']] },
    { id: 'ochimusha', y: [1180, 1600], a: [16, 50], k: ['village', 'fish'], t: '落武者', q: '戦に負けた武者が、傷を負って家の納屋に隠れていた。「かくまってくれ」と言う。', o: [['hide', 'かくまう', { tie: 3, sat: -2 }, '十日のあいだ粥を運んだ。武者は礼に、古い刀の鍔を置いて夜に去った。'], ['tell', '村の衆に知らせる', { tie: 1, sat: -3 }, '武者は村の衆に引き渡された。その夜の叫び声が、長く耳に残った。']] },
    { id: 'katami', y: [1000, 1700], a: [25, 60], t: '形見の再会', q: '旅の途中、宿の女が、幼いころに生き別れた姉の形見と同じ守り袋を下げていた。', o: [['ask', '声をかける', { tie: 6, sat: 6 }, '女は、生き別れた姉の娘だった。ふたりで夜が明けるまで泣いた。'], ['pass', '見間違いだと思い直す', { sat: -2 }, '翌朝、女の姿はもうなかった。']] },
    { id: 'ekibyo', y: [1000, 1880], a: [20, 60], t: '疫病', q: '疫病が村に入り、隣の家が次々に倒れた。看病の手が足りない。', o: [['help', '看病に通う', { tie: 5, body: -5 }, '隣の家の子どもが、ひとり助かった。'], ['shut', '戸を閉ざして家族を守る', { body: 2, tie: -4 }, '疫病が去ったあと、隣の家の者と目を合わせづらくなった。']] },
    { id: 'hitome', y: [1000, 1700], a: [16, 25], unm: true, t: '一目惚れ', q: '辻ですれ違った人の横顔が忘れられない。人づてに、その人の家が分かった。', o: [['write', '文を届けさせる', { sat: 4, tie: 2 }, '三通目の文に、返事が来た。'], ['forget', '忘れることにする', { sat: -3 }, '春が来るたびに、あの辻を思い出した。']] },
    { id: 'taika2', y: [1600, 1945], a: [20, 60], k: ['city', 'town'], t: '大火', q: '夜半、町が火に包まれた。家財を持ち出す時間はわずかしかない。', o: [['people', '近所の年寄りを背負って逃げる', { tie: 6, sat: -6 }, '家は焼けたが、背負った隣の婆さんは助かった。焼け跡で、その家族に手を合わされた。'], ['goods', '家の金と帳面を持ち出す', { sat: -2, tie: -2 }, '家は焼けたが、持ち出した金で翌月には小屋を建て直した。']] },
    { id: 'enzai', y: [1600, 1945], a: [18, 50], t: '濡れ衣', q: '奉公先の金がなくなり、疑いをかけられた。', o: [['fight', '身の潔白を訴え続ける', { sat: -4, tie: 2 }, 'ひと月後、本当の盗人が捕まった。主人は手をついて詫びた。'], ['leave', '黙って店を去る', { sat: -6, tie: -4 }, '町を出た。あとで疑いが晴れたと風の便りに聞いた。']] },
    { id: 'kandou', y: [1600, 1960], a: [17, 28], t: '勘当', q: '親の決めた道を蹴ったことで、「勘当だ」と言い渡された。', o: [['go', '家を出る', { sat: 2, tie: -6 }, '風呂敷包みひとつで家を出た。十年後、父の葬儀で久しぶりに敷居をまたいだ。'], ['bow', '頭を下げて許しを請う', { tie: 2, sat: -4 }, '父は何も言わずに背を向けたが、翌朝の膳には好物が並んでいた。']] },
    { id: 'kakushigo', y: [1600, 2100], a: [35, 65], t: '隠し子', q: '親の葬儀の席に、見知らぬ若者が現れた。親の隠し子だという。', o: [['accept', '家に迎え入れる', { tie: 4, sat: -2 }, '戸惑いながらも、きょうだいとして付き合うことにした。'], ['refuse', '関わりを断る', { sat: -1, tie: -3 }, '若者は黙って頭を下げ、二度と来なかった。']] },
    { id: 'saikai', y: [1600, 2100], a: [45, 75], t: '再会', q: '若いころ約束を交わしたまま別れた人から、何十年ぶりかに便りが届いた。', o: [['meet', '会いに行く', { sat: 6, tie: 4 }, '昔の橋のたもとで会った。互いの白髪を見て、声をあげて笑った。'], ['letter', '手紙だけ返す', { sat: 2 }, '長い手紙を書いた。それきりだったが、胸のつかえが取れた。']] },
    { id: 'hyoryu', y: [1600, 1870], a: [18, 45], k: ['fish'], sex: 'm', t: '漂流', q: '嵐で舟が流され、何日も漂った末に見知らぬ島に流れ着いた。', o: [['wait', '島で助けを待つ', { body: -6, learn: 4 }, '半年後に通りかかった船に救われ、村に戻った。死んだと思われ、墓が建っていた。'], ['raft', 'いかだを組んで海に出る', { body: -8, sat: 4 }, '十日かけて隣の島にたどり着いた。村では大騒ぎになった。']] },
    { id: 'shusei', y: [1868, 2100], a: [14, 30], t: '出生の秘密', q: '戸籍を取り寄せて、自分が養子だったと知った。', o: [['ask', '親に問いただす', { tie: -2, sat: 2 }, '母は泣きながら、本当の母のことを話してくれた。それでも、育ててくれた親は親だと思えた。'], ['keep', '知らないふりを続ける', { sat: -4 }, '何も言わないまま、胸の奥にしまった。']] },
    { id: 'shinsai', y: [1868, 2100], a: [15, 70], t: '大きな揺れ', q: '大きな地震で家が傾いた。家族は無事だが、近所に下敷きになった人がいる。', o: [['dig', '素手で瓦を掘り起こす', { tie: 6, body: -4 }, '夜明けまで掘り続け、隣の家の子を助け出した。'], ['family', '家族を連れて広い場所へ逃げる', { body: 2, tie: -2 }, '火の手が上がる前に逃げのびた。']] },
    { id: 'kako', y: [1900, 2100], a: [35, 65], t: '過去を知る人', q: '仕事がうまくいき始めたころ、昔の自分を知る人が訪ねてきた。誰にも話していない過去だ。', o: [['face', '向き合って話を聞く', { sat: -2, tie: 3 }, '相手は、昔の詫びを言いに来ただけだった。'], ['shut', '門前払いにする', { sat: 1, tie: -3 }, 'その夜は眠れなかった。']] },
    { id: 'gyakuten', y: [1868, 2100], a: [28, 55], t: 'どん底から', q: '仕事を失い、借金だけが残った。昔書きためたものを本にしないかと、知り合いが言う。', o: [['try', '最後の望みをかける', { sat: 6, learn: 3 }, '出した本が思いがけず売れた。どん底からの一発逆転だった。'], ['work', '日雇いで地道に返す', { body: -4, tie: 2 }, '十年かけて借金を返し終えた。']] },
    { id: 'jiko', y: [1950, 2100], a: [18, 60], t: '事故', q: '帰り道、目の前で人が車にはねられた。運転手は逃げようとしている。', o: [['help', '倒れた人に駆け寄る', { tie: 4, sat: 2 }, '救急車が来るまで手を握っていた。のちに、その人から礼状が届いた。'], ['chase', 'ナンバーを覚えて通報する', { learn: 2, sat: 2 }, '運転手はその日のうちに捕まった。']] },
    { id: 'kokuhatsu', y: [1960, 2100], a: [30, 58], job: true, t: '告発', q: '会社の帳簿のごまかしに気づいた。黙っていれば昇進は目の前だ。', o: [['tell', '告発する', { sat: -4, tie: -2, learn: 2 }, '会社は大騒ぎになり、居場所を失った。それでも後悔はしなかった。'], ['quiet', '黙っている', { sat: -3 }, '昇進したが、帳簿を見るたびに胸が痛んだ。']] }
  ];
  function dramaEligible(c, d) {
    var L = c.L;
    if (c.y < d.y[0] || c.y > d.y[1] || c.a < d.a[0] || c.a > d.a[1]) return false;
    if (d.k && d.k.indexOf(c.kind) < 0) return false;
    if (d.sex && d.sex !== L.sex) return false;
    if (d.unm && L.married) return false;
    if (d.job && !(L.job && L.job !== 'home')) return false;
    return true;
  }
  var DRAMA_AGES = [11, 20, 30, 42, 55];
  arc({ id: 'drama', start: function (c) {
    var s = c.s;
    if ((s.nBig || 0) > 0 || DRAMA_AGES.indexOf(c.a) < 0 && !(c.a > 11 && DRAMA_AGES.indexOf(c.a - 1) >= 0)) return false;
    var list = DRAMA.filter(function (d) { return dramaEligible(c, d) && !(s.dramaSeen || {})[d.id]; });
    if (!list.length) return false;
    var d = one(c.r, list);
    (s.dramaSeen = s.dramaSeen || {})[d.id] = 1;
    c.ask('drama.' + d.id, d.t, d.q, d.o.map(function (o) { return { k: o[0], l: o[1], w: 1, f: focusOf(o[2]), h: CHint(o[2]) }; }), { id: d.id }, 'dramaR');
    return true;
  } });
  arc({ id: 'dramaR', nodes: {}, res: {} });
  // 山場の答え（どの山場も、答えの名前で続きを引く）
  (function () {
    var R = A.filter(function (o) { return o.id === 'dramaR'; })[0].res;
    DRAMA.forEach(function (d) { d.o.forEach(function (o) { if (!R[o[0]]) R[o[0]] = function (c) { var dd = DRAMA.filter(function (x) { return x.id === c.d.id; })[0], oo = dd && dd.o.filter(function (x) { return x[0] === o[0]; })[0]; if (oo) c.say(oo[3], oo[2]); }; }); });
  })();

  /* ---------- 家を出ている間の暮らし（L.mode） ---------- */
  var MODE_LINES = {
    tabi: ['{prov}の社の祭りに呼ばれ、夜通し舞台に立った。', '{prov}の宿場で、雨が上がるのを待って三日を過ごした。', '新しい演目を覚え、一座の長にほめられた。', '{prov}の峠道で、草鞋を何足もはきつぶした。', '{prov}の村の子どもたちが、一座のあとをどこまでもついてきた。', '故郷の村の方角の空を、ときどき眺めた。'],
    hoko: ['藪入りの日を指折り数えて待った。', '奉公先の仕事に、少しずつ慣れてきた。', '奉公先の朝は早く、夜は誰よりも遅くまで働いた。', '奉公仲間と、ふるさとの話をして夜を過ごした。', '主人から、仕事ぶりをほめられた。'],
    away: ['町の暮らしに、少しずつ慣れてきた。', 'ふるさとからの便りを、何度も開いた。', '町の人ごみの中で、ふと故郷の山を思い出した。', '仕事の帰りに、同じ国の出の人と知り合った。'],
    hei: ['陣中で、粥をすすりながら夜を明かした。', '国元の家族に宛てて、短い便りを書いた。', '仲間が戦で傷つき、肩を貸して陣に戻った。'],
    shukke: ['朝の勤行のあと、寺の庭を掃き清めた。', '経を写す手が、少しずつ速くなった。', '寺を訪ねてきた人の話を、黙って聞いた。']
  };
  // 戦後に家を離れて暮らす年（長屋・国の出などの古い言い方を使わない）
  var AWAY_NEW = ['都会の暮らしに、少しずつ慣れてきた。', 'ふるさとの家族からの電話を、心待ちにした。', '同じ県の出身の人と知り合い、話がはずんだ。', '休みの日に、ふるさとの山を思い出して少し寂しくなった。', '盆と正月には、なるべくふるさとへ帰るようにした。', '近所の店の人と、顔なじみになった。'];
  var MODE_MORE = {
    tabi: ['一座の長に「{me}、今日の舞はよかった」とほめられた。', '{prov}の見物人から、「{me}」と名を呼ばれるようになった。', '{prov}の城下で、大きな芝居小屋に呼ばれた。', '一座の荷車の車輪が外れ、皆で直した。', '{prov}の茶屋の娘に、舞をほめられた。', '雪で道がふさがり、{prov}の寺の軒先で夜を明かした。', '一座の若い者に、口上の言い方を教えた。', '祭りの客が少なく、その日は粥だけで過ごした。'],
    hoko: ['番頭に「{me}、よく気がつくな」と言われた。', '店の帳面のつけ方を、番頭から教わった。', '使いに出され、町の道をひとつずつ覚えた。', '主人の家の子の子守りを任された。', '盆と正月の藪入りに、ふるさとの家へ帰った。', '仕事でしくじり、夜遅くまで叱られた。', '新しく入った小僧に、仕事を教える番になった。', '奉公先の祭りの支度を手伝った。'],
    hei: ['点呼で「{me}」と名を呼ばれ、大きな声で返事をした。', '長い行軍で、足の豆がつぶれた。', '夜の見張りに立ち、寒さに震えた。', '同じ国の出の兵と、ふるさとの話をした。', '陣の外で、炊き出しの煙を見つめた。', '刀や槍の手入れを、毎晩欠かさなかった。'],
    away: ['町の祭りを、遠くから眺めた。', '同じ長屋の人と、少しずつ言葉を交わすようになった。', '故郷の訛りを、町の人に笑われた。']
  };
  function modeYear(c, rec) {
    var L = c.L;
    rec.mode = L.mode || null;
    if (L.old) {
      if (L.hoko && !L.hoko.done && !L.mode) { L.mode = 'hoko'; c.s.modeEngine = true; }
      if (c.s.modeEngine && L.mode === 'hoko' && (!L.hoko || L.hoko.done)) { L.mode = null; c.s.modeEngine = false; }
      if (L.mode === 'tabi' && c.api.provs && c.p(0.6)) { var ps = c.api.provs(L); c.api.move(L, { prov: ps[Math.floor(c.r() * ps.length)] }); }
    }
    if (!L.mode || !MODE_LINES[L.mode] || rec.events.some(function (e) { return e.story; })) return;
    // 家を離れている年を空にしない（v11の直し 2）：ほかに自分の出来事がない年は必ず、ある年もときどき、その場での出来事を出す
    var own = rec.events.some(function (e) { return e.cat !== '時代'; });
    if (own && !c.p(0.3)) return;
    var prov = L.old && L.H && L.H.prov[L.prov] ? L.H.prov[L.prov].kuni : '旅先';
    var famine = /飢饉|凶作|飢え/.test(rec.events.map(function (e) { return e.t; }).join('') + ((rec.world && rec.world.items) || []).map(function (i) { return i.t; }).join(''));
    var base = L.mode === 'shukke' ? templeLines(c, famine) : L.mode === 'away' && c.y >= 1946 ? AWAY_NEW : MODE_LINES[L.mode].concat(MODE_MORE[L.mode] || []);
    // 生まれた土地を離れていない人に、離れた人向けの文（町の暮らし・長屋・ふるさとの便り）を出さない。長屋・路地・表通りは町と市街地だけ（spec6 1-3）
    if (L.mode === 'away') { var movedAw = c.away(); base = base.filter(function (t) { return (movedAw || !AWAY_ONLY.test(t)) && (c.kind === 'town' || c.kind === 'city' || !TOWN_ONLY.test(t)); }); }
    var me = String(L.name || '').replace(/（.*?）/g, '');
    // 同じ型の文は、国の名前が違っても1回だけ（出しきるまで）
    var tm = {}, all = base.filter(function (t) { return me || t.indexOf('{me}') < 0; }).map(function (t) { var f = t.replace('{prov}', prov).replace('{me}', me); tm[f] = t; return f; }), seen = c.s.seen = c.s.seen || {};
    var cand = all.filter(function (t) { return !seen[t] && !seen['tm:' + tm[t]]; });
    // 出しきったら、直近に出したもの以外からまた選ぶ
    // 出しきったら、寺の暮らしのほかは繰り返さない（同じ文は1つの人生で1回だけ）
    // （同じ文は1つの人生で1回だけ。spec6 1-4：寺の暮らしも繰り返さない）
    if (!cand.length) return;
    // 名前の入った出来事が少ない人生では、名前を呼ばれる場面を先に選ぶ（第2弾の6）
    var logs = L.log || [], named = logs.filter(function (r) { return (r.events || []).some(function (e) { return me && e.t.indexOf(me) >= 0; }); }).length;
    var withMe = me ? cand.filter(function (t) { return t.indexOf(me) >= 0; }) : [];
    if (withMe.length && logs.length && named / logs.length < 0.3) cand = withMe;
    var t = cand[Math.floor(c.r() * cand.length)];
    seen[t] = 1; seen['tm:' + tm[t]] = 1; c.s.lastMode = (c.s.lastMode || []).concat([t]).slice(-6);
    c.say(t, null, L.mode === 'tabi' || L.mode === 'away' ? '地域' : '学歴と仕事');
  }

  /* ---------- 毎年の処理 ---------- */
  function year(L, rec, api) {
    if (!L.alive) return;
    var s = L.story || init(L, api), y = L.year;
    // 親の人生を生きているとき：もとの子が生まれる年の親の暮らしを書き留める（spec6 2-16）
    if (L.watchYear === y && !L.snapAt) L.snapAt = { y: y, pref: curPref(L), prov: L.prov || null, sub: L.sub || null, kind: L.kind || null, status: L.status || null, kakaku: L.kakaku || null, incPct: L.incPct, married: !!L.married,
      spouse: (spouseOf(L) || {}).name || null, mode: L.mode || null, kids: (L.members || []).filter(function (m) { return m.role === '子' && m.by < y; }).length, job: curJob(L), place: rec && rec.place };
    // 1年に出す選択は、大きな決断も含めて1つまで
    if (L.queue.some(function (b) { return !b.ask && b.id !== 'ask' && b.kind !== 'ask'; })) { s.asked = y; var dk0 = Math.floor(L.age / 10) * 10; (s.decC = s.decC || {})[dk0] = (s.decC[dk0] || 0) + 1; }
    if (L.age < 1) { personaYear(ctxOf(L, rec, api)); if (s.asked !== y) choiceYear(ctxOf(L, rec, api), people(ctxOf(L, rec, api))); return; }
    // 決めてあった出来事（その年の分）
    var due = s.at.filter(function (x) { return x.y <= y; });
    s.at = s.at.filter(function (x) { return x.y > y; });
    due.forEach(function (x) {
      var fn = N[x.id];
      if (!fn || !L.alive) return;
      s.cur = x.id;
      fn(ctxOf(L, rec, api, x.d));
      s.cur = null;
    });
    var c = ctxOf(L, rec, api);
    // 出来事の年と土地に結びついた筋（spec6 2-13・2-17）は、ほかの筋より先に確かめる
    for (var j = 0; j < A.length; j++) { var oj = A[j]; if (oj.once && !s.done[oj.id] && oj.start(c)) { s.done[oj.id] = y; s.last = y; break; } }
    // 出世の筋（spec6 2-3）も、ほかの筋より先に確かめる（ちょっとしたきっかけは、出会えなければ意味がない）
    if (s.asked !== y && !(L.mode && !awayHome(L))) for (var j2 = 0; j2 < A.length; j2++) { var o2 = A[j2]; if (o2.pri && !s.done[o2.id] && o2.start(c)) { s.done[o2.id] = y; s.last = y; break; } }
    weddingNote(c, rec);
    modeYear(c, rec);
    palYear(c);
    // 新しい筋は1年に1つまで。分かれ道を出した年は、ほかの筋を始めない
    if (s.asked === y) return;
    for (var i = 0; i < A.length; i++) {
      var o = A[i];
      if (!o.start || s.done[o.id]) continue;
      // 家を離れている年は、新しい筋（家族・家の場面）を始めない
      if (L.mode && !o.modeOk) continue;
      if (o.start(c)) { s.done[o.id] = y; s.last = y; break; }
    }
    if (s.asked !== y) choiceYear(c, people(c));
    lineYear(c);
  }
  // 第6版の場面の一文（js/s6.js の lines）：格・位・仕事・罪など、その人だけに出る場面を、1年に1つまで、1つの人生で同じ文は1回だけ
  function lineYear(c) {
    var S6 = s6Mod(), L = c.L, s = c.s;
    if (!S6 || !S6.lines || !S6.lines.length || !c.p(0.35)) return;
    s.seen = s.seen || {};
    var P = people(c), pref = String(L.old ? L.pref : (L.place || {}).pref), cand = [];
    S6.lines.forEach(function (o) {
      if (!eligible(c, o)) return;
      [].concat(o.t).forEach(function (t) {
        var ft = fillT(t, P);
        if (!ft || s.seen[ft]) return;
        var CHk = choicesMod();
        if (CHk && CHk.eraOk && (!CHk.eraOk(ft, c.y, false) || !CHk.placeOk(ft, pref))) return;
        if (L.mode && !awayHome(L) && AWAY_BAN.test(ft)) return;
        if (c.kind !== 'town' && c.kind !== 'city' && TOWN_ONLY.test(ft)) return;
        if (!c.away() && AWAY_WORDS.test(ft)) return;
        if (c.kind === 'city' && /村/.test(ft)) return;
        cand.push({ o: o, t: ft });
      });
    });
    if (!cand.length) return;
    var pk = cand[Math.floor(c.r() * cand.length)];
    s.seen[pk.t] = 1;
    c.say(pk.t, null, pk.o.cat || '人間関係');
  }
  // 分かれ道の答え。answers が null のときは、その人の気質で選ぶ
  function resolve(L, rec, br, answers, api) {
    var s = L.story, k = answers && answers.s;
    if (!k || !br.w.hasOwnProperty(k)) k = pickW(s.r, br.w);
    if (br.ra === '__choice') {
      var pk0 = br.groups[0].options.filter(function (o) { return o.k === k; })[0];
      rec.storyPick = pk0 ? pk0.l : k;
      noteChoice(L, br, rec.storyPick, false);
      var m0 = rec.events.length;
      resolveChoice(L, rec, br, k, api);
      rec.storyFx = sumFx(rec.events.slice(m0));
      return k;
    }
    var target = null;
    A.forEach(function (o) { if (o.id === br.ra && o.res && o.res[k]) target = o.res[k]; });
    var picked = br.groups[0].options.filter(function (o) { return o.k === k; })[0];
    rec.storyPick = picked ? picked.l : k;
    noteChoice(L, br, rec.storyPick, true);
    var n0 = rec.events.length;
    if (target) target(ctxOf(L, rec, api, br.d));
    rec.storyFx = sumFx(rec.events.slice(n0));
    return k;
  }
  // 選んだ分かれ道を覚えておく（死亡の記録の「ひとこと」に使う。第2弾の7）
  function noteChoice(L, br, label, big) {
    (L.choices = L.choices || []).push({ age: L.age, y: L.year, title: br.title || '', q: (br.groups[0] || {}).q || '', l: label, big: !!big, sid: br.sid, place: (br.d && br.d.k) || (L.old ? L.kind : ({ '町村': 'village', '都市': 'town', '大都市': 'city' })[(L.place || {}).kind]), u: !!(br.d && br.d.u), ind: br.d && br.d.ind, kind: (br.d && br.d.kind) || (big ? 'big' : 'small') });
  }
  // おまかせ：今年の重点に合う答え（なければ null で、気質のまま）
  function autoAnswer(br, focus) {
    if (!focus) return null;
    var o = br.groups[0].options.filter(function (x) { return (x.f || []).indexOf(focus) >= 0; })[0];
    return o ? { s: o.k } : null;
  }

  /* ---------- 結婚相手の人となり（結婚するたびに出す） ---------- */
  var SP_ADJ = ['よく笑う', '口数の少ない', '働き者の', '気の強い', 'おっとりした', '世話好きの', '負けず嫌いの', '涙もろい', 'まじめな', 'ひょうきんな', '手先の器用な', '読書好きの', '朝の早い', '歌のうまい', '料理の上手な', '人見知りの'];
  var SP_OLD = {
    hyakusho: ['隣村の百姓の家', '庄屋の遠縁の家', '小作の家', '村一番の働き者と評判の家', '馬を飼う家', '機織りの上手な家'],
    chonin: ['呉服屋の家', '大工の家', '豆腐屋の家', '船宿の家', '薬種問屋の奉公人の家', '長屋の髪結いの家'],
    bushi: ['藩の勘定方の家', '足軽の家', '城の番方の家', '家老の家の分家', '浪人の家', '藩の剣術指南の家'],
    kuge: ['中流の貴族の家', '受領を務める家', '学問の家', '雅楽を伝える家'],
    heimin: ['農家', '商家', '職人の家', '漁師の家', '役場勤めの家', '小学校の先生の家'],
    shizoku: ['旧藩士の家', '元足軽の家', '巡査の家', '学校の先生の家'],
    other: ['隣の村の家', '同じ村の家', '遠い親戚の家']
  };
  var SP_NEW = ['会社員', '公務員', '看護師', '工場勤め', '店の店員', '自営業の家の跡取り', '保育士', 'エンジニア', '教員', '美容師', '営業職', '介護の仕事', '料理人', '銀行員', '建設の仕事', '農家', '研究者', '事務職'];
  var SP_DAD = ['会社勤め', '市役所勤め', '商店を営む人', '農家', '工場勤め', '学校の先生', '大工', '漁師', '銀行勤め', '運転手', '郵便局勤め', '医者'];
  // 縁談・見合いの相手の書き方：「とら（21歳・隣村の百姓の家の次女）」（spec6 2-29）
  function enLabel(L, o, name) {
    return (name || '相手') + '（' + o.age + '歳・' + o.house + 'の' + o.order + '）';
  }
  // 縁談を断った文：相手の名前を入れ、回数と約束で書き分ける（spec6 1-4）
  var KAZU = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  function refuseText(L, o) {
    var n = L.refused || 1, lab = o ? enLabel(L, o, o.name) : null, P0 = (L.members || []).filter(function (m) { return m.role === '父' && m.alive; })[0];
    var dad = P0 && P0.name ? P0.name : '父';
    if (!lab) return n >= 2 ? 'また縁談を断った。これで' + (KAZU[n] || n) + '度目だった。' : '縁談を断った。';
    if (L.promised && L.year - L.promised <= 6) { L.promised = null; return '約束を破って' + lab + 'との縁談を断ると、' + dad + 'は三日のあいだ口をきいてくれなかった。'; }
    if (n === 1) return lab + 'との縁談を断った。';
    if (n === 2) return 'また縁談を断った。今度の相手は' + lab + 'だった。';
    if (n === 3) return 'これで三度目だった。' + lab + 'との縁談も断った。';
    return lab + 'との話も断り、縁談を断るのは' + (KAZU[n] || n) + '度目になった。';
  }
  function spouseDesc(L, sp, y) {
    var r = (L.story && L.story.r) || Math.random, age = y - sp.by, adj = one(r, SP_ADJ);
    var order = sp.sex === 'f' ? one(r, ['長女', '次女', '三女', '末娘', 'ひとり娘']) : one(r, ['長男', '次男', '三男', '末っ子']);
    if (!L.old || y >= 1948) { var jb = one(r, SP_NEW); sp.house = '父が' + one(r, SP_DAD) + 'の家の' + order; return age + '歳、' + sp.house + 'で、' + jb + 'として働く' + adj + '人だった。'; }
    var st = sp.st || L.status, list = SP_OLD[st] || SP_OLD.other;
    sp.house = one(r, list) + 'の' + order;
    return age + '歳、' + sp.house + 'で、' + adj + '人だった。';
  }

  /* ---------- 縁談・婿養子・養子・奉公の相手と行き先（毎回作り直す。改善の指示書 第1弾の1） ---------- */
  var SUIT_TRAIT = ['まじめだが口数の少ない', 'よく笑う', '気が短いが情に厚い', '見栄っぱりな', '世話焼きの', 'おっとりした', '働き者で評判の'];
  var SUIT_JOB = {
    hyakusho: ['田を耕す', '馬を引いて荷を運ぶ', '炭を焼く', '機を織る', '蚕を飼う'], chonin: ['豆腐屋を営む', '大工の', '呉服屋に勤める', '船宿の', '桶屋の'],
    bushi: ['勘定方を務める', '城の番方の', '藩校で教える', '剣術の腕で知られた'], heimin: ['役場に勤める', '鉄道に勤める', '小学校の先生の', '工場に勤める', '商店を営む'],
    shizoku: ['巡査の', '役場に勤める', '学校の先生の'], kuge: ['歌の家の', '受領の家の'], other: ['同じ村の', '隣村の']
  };
  function suitor(L, kind) {
    var S = L.story; if (!S) return null;
    var r = S.r, y = L.year, osex = L.sex === 'm' ? 'f' : 'm';
    var g = Math.max(-2, Math.round(3 + (r() - 0.5) * 6));
    var by = L.sex === 'm' ? L.by + g : L.by - g;
    var nm = null;
    try { nm = L.old ? null : null; } catch (e) { nm = null; }
    var st = L.status || 'heimin', jobs = SUIT_JOB[st] || SUIT_JOB.other, house = y >= 1948 ? SP_DAD.map(function (d) { return '父が' + d + 'の家'; }) : (SP_OLD[st] || SP_OLD.other);
    var o = { y: y, by: by, age: y - by, house: one(r, house), job: one(r, jobs), trait: one(r, SUIT_TRAIT), order: osex === 'f' ? one(r, ['長女', '次女', '三女', '末娘']) : one(r, ['長男', '次男', '三男']) };
    return o;
  }
  function suitorText(L, o, name) {
    var prev = (L.suitors || []).filter(function (x) { return x !== o; });
    var cityNew = L.year >= 1980 && (L.kind === 'city' || L.kind === 'town'), viaWork = cityNew && prev.length >= 2;
    var head = viaWork ? one(L.story.r, ['職場の先輩から、会ってほしい人がいると言われた。', '友人の紹介で、ある人と食事をすることになった。', '上司の奥さんから、紹介したい人がいると声をかけられた。'])
      : prev.length ? 'また縁談が持ち込まれた。前の話を断ってから' + Math.max(1, o.y - prev[prev.length - 1].y) + '年になる。' : '縁談が持ち込まれた。';
    var gap = o.age - L.age, gp = gap > 0 ? gap + 'つ年上' : gap < 0 ? -gap + 'つ年下' : '同い年';
    return head + '相手は' + enLabel(L, o, name) + '、' + gp + '。' + o.job + '、' + o.trait + '人だという。受ける？';
  }
  var HOKO_TO = { m: ['城下の呉服屋', '江戸の油問屋', '大坂の薬種問屋', '町の酒屋', '宿場の旅籠'], f: ['城下の商家', '庄屋の家', '江戸の武家屋敷', '町の料理屋', '隣村の大百姓の家'] };
  var HOKO_TO_NEW = { m: ['町の工場', '都会の商店', '製材所', '鉄工所'], f: ['町の紡績工場', '都会の商家の女中', '製糸工場', '旅館'] };
  function hokoTo(L) { var r = L.story ? L.story.r : Math.random; return one(r, (L.year < 1872 ? HOKO_TO : HOKO_TO_NEW)[L.sex]); }
  function mukoHouse(L) { var r = L.story ? L.story.r : Math.random; return one(r, ['隣村の大百姓の家', '同じ村の庄屋の分家', '町の商家', '峠向こうの村の家']); }
  function yoshiHouse(L) { var r = L.story ? L.story.r : Math.random; return one(r, ['勘定方を務める家', '城の番方の家', '藩校の師範の家', '馬廻りの家']); }

  /* ========== まわりの人（改善の指示書 第4弾の10） ==========
     幼なじみ（6歳ごろ）と、仕事の仲間（働き始めたとき）に、名前と性格を付ける。何年かおきに出来事や分かれ道に出てくる。
     配偶者にも性格を付け、時代ごとの夫婦の場面と、子との場面を出す */
  var PTR = [
    ['sewa', '世話焼き', '何かと世話を焼いてくれる', '相変わらず、こちらの暮らしの心配ばかりしていた。'],
    ['quiet', '口数が少ない', '口数は少ないが、約束は必ず守る', '多くは語らなかったが、帰りぎわに「また来い」とだけ言った。'],
    ['mie', '見栄っぱり', '人前では見栄を張りたがる', '羽振りのよさを話してばかりいたが、目は笑っていなかった。'],
    ['yoki', '陽気', 'いつも大声で笑っている', '会うなり大声で笑い、まわりまで明るくなった。'],
    ['tanki', '気が短い', 'すぐかっとなるが、根に持たない', '昔と同じように、ささいなことで声を荒らげ、すぐに笑った。']
  ];
  function ptr(k) { return PTR.filter(function (t) { return t[0] === k; })[0] || PTR[0]; }
  // 人柄の一文を、出来事の種類（会う・言い合う・助けてもらう・病気）ごとに書き分ける。同じ一文は1つの人生で1回まで（spec6 1-5）
  var PTR_T = {
    sewa: { meet: '相変わらず、こちらの暮らしの心配ばかりしていた。', fight: 'それでも別れぎわには、風邪をひくなと言い添えた。', help: '頼んでもいないのに、あれこれと段取りまで整えてくれた。', sick: '毎日のように顔を出しては、粥を置いていった。' },
    quiet: { meet: '多くは語らなかったが、帰りぎわに「また来い」とだけ言った。', fight: '黙りこんだまま、最後まで目を合わせなかった。', help: '黙って手を貸し、礼を言う前に帰っていった。', sick: '何も言わずに枕元に座り、しばらくして帰っていった。' },
    mie: { meet: '羽振りのよさを話してばかりいたが、目は笑っていなかった。', fight: '人前で言い負かされたのが、よほど悔しかったらしい。', help: '手伝ったことを、あとで村じゅうに言いふらした。', sick: '見舞いの品だけは、誰よりも立派なものを届けてきた。' },
    yoki: { meet: '会うなり大声で笑い、まわりまで明るくなった。', fight: '翌日には、何もなかったような顔で声をかけてきた。', help: '笑いながら手を動かし、仕事はすぐに片づいた。', sick: '見舞いに来ては冗談を言い、少し気が晴れた。' },
    tanki: { meet: '昔と同じように、ささいなことで声を荒らげ、すぐに笑った。', fight: '顔を真っ赤にして怒鳴り、戸を強く閉めて帰っていった。', help: '文句を言いながらも、最後まで手を貸してくれた。', sick: 'じっとしていられない様子で、薬を探しに走り回った。' }
  };
  function ptrLine(c, k, t) {
    var type = /言い合い|けんか|喧嘩|口論|もめ|ぶつか/.test(t) ? 'fight' : /助け|手伝|手を貸|貸して|世話|教えて/.test(t) ? 'help' : /病|寝込|見舞/.test(t) ? 'sick' : 'meet';
    var line = (PTR_T[k] || PTR_T.sewa)[type], used = c.s.ptrUsed = c.s.ptrUsed || {};
    if (used[line]) return '';
    used[line] = 1;
    return line;
  }
  function fillPtr(c, t, k) { var l = ptrLine(c, k, t); return t.replace('{t}', l).replace(/。\s*$/, '。'); }
  function workRole(c) {
    var L = c.L, y = c.y, j = L.old ? L.job : (L.job && L.job.ind);
    if (y < 1868) return j === 'shop' ? '奉公先の番頭の' : j === 'craft' ? '兄弟子の' : j === 'samurai' || j === 'bushiMed' ? '同じ役目の' : j === 'fish' ? '同じ網の' : j === 'temple' ? '同じ寺の' : '隣の田の';
    if (y < 1946) return j === 'farm' || j === 'agri' ? '隣の家の' : j === 'factory' || j === 'silk' ? '同じ工場の' : '職場の先輩の';
    return j === 'agri' || j === 'farm' ? '農協の仲間の' : '職場の同僚の';
  }
  function working(L) { return L.old ? !!(L.job && L.job !== 'home') : !!(L.job && L.job.ind); }
  var PAL_EV = {
    child: ['{n}と、川で泳いで日が暮れるまで遊んだ。', '{n}と、大人に内緒で山の奥まで行き、こっぴどく叱られた。', '{n}と、祭りの夜店をのぞいて回った。', '{n}とけんかをしたが、次の日には何事もなかったように遊んだ。'],
    childOld: ['{n}が、遠くの町へ奉公に出ることになった。村はずれまで見送った。'],
    childNew: ['{n}が、親の仕事の都合で引っ越していった。手紙を書くと約束した。'],
    young: ['{n}と、これからのことを夜通し語り合った。', '久しぶりに{n}と会った。{t}', '{n}の祝言に呼ばれた。', '{n}に、悩みを打ち明けた。'],
    mid: ['{n}が病に倒れたと聞き、見舞いに行った。', '{n}に、暮らしの相談を持ちかけられた。', '久しぶりに{n}と会った。{t}', '{n}の子と、自分の子が仲よくなった。'],
    old: ['{n}と、縁側で昔話をした。{t}', '{n}が訪ねてきて、幼いころの思い出話で笑い合った。']
  };
  var WORK_EV = ['{r}{n}に、仕事のこつを教わった。', '{r}{n}と、仕事のやり方で言い合いになった。{t}', '{r}{n}が、自分のしくじりをかばってくれた。', '{r}{n}と、忙しい時期を乗り切った。', '{r}{n}の家に招かれ、夕飯をごちそうになった。'];
  function palYear(c) {
    var L = c.L, s = c.s, a = c.a, y = c.y;
    if (!L.alive || a < 6) return;
    // 出家・旅・奉公・出征の間は、家にいる前提のまわりの人（幼なじみ・隣の田の仲間）の出来事を出さない（v11の直し 1）
    if (c.api.homeLife && !c.api.homeLife(L)) return;
    // 幼なじみ
    if (!s.pal && a <= 9) {
      var sx = c.p(0.7) ? L.sex : (L.sex === 'm' ? 'f' : 'm'), tr = PTR[Math.floor(c.r() * PTR.length)];
      s.pal = { n: s.friend || c.name(sx), sex: sx, tr: tr[0], next: y + 2 + Math.floor(c.r() * 3) };
      if (!s.friend) s.friend = s.pal.n;
      c.say('近所の' + s.pal.n + 'と仲よくなった。' + tr[2] + '子だ。', { tie: 2 }, '人間関係');
      return;
    }
    // 仕事の仲間
    if (!s.wpal && working(L) && a >= 12 && !L.mode) {
      var tw = PTR[Math.floor(c.r() * PTR.length)], sw = c.p(0.75) ? L.sex : (L.sex === 'm' ? 'f' : 'm');
      s.wpal = { n: c.name(sw), sex: sw, tr: tw[0], r: workRole(c), next: y + 2 + Math.floor(c.r() * 4) };
      c.say(s.wpal.r + s.wpal.n + 'と知り合った。' + tw[2] + '人だ。', { tie: 2 }, '人間関係');
      return;
    }
    var pal = s.pal;
    if (pal && !pal.gone && y >= pal.next) {
      pal.next = y + 3 + Math.floor(c.r() * 5);
      if (a >= 62 && c.p(0.18)) { pal.gone = y; c.say('幼なじみの' + pal.n + 'が亡くなった。幼いころからの付き合いだった。', { tie: -4, sat: -4 }, '人間関係'); return; }
      var pool0 = a <= 14 ? PAL_EV.child.concat(c.y < 1900 && !pal.away ? PAL_EV.childOld : c.y >= 1950 && !pal.away ? PAL_EV.childNew : []) : a <= 30 ? PAL_EV.young : a <= 60 ? PAL_EV.mid : PAL_EV.old;
      var ps = s.palSeen = s.palSeen || {};
      var pool = pool0.filter(function (x) { return !ps[x] && !(L.mode && /自分の子/.test(x)) && !(y >= 1938 && y <= 1945 && c.api.WAR_BAN && c.api.WAR_BAN.test(x)); });
      if (!pool.length) return; // 同じ文は1つの人生で1回だけ
      var t = pool[Math.floor(c.r() * pool.length)];
      ps[t] = 1;
      if (/奉公に出る|引っ越して/.test(t)) pal.away = y;
      c.say(fillPtr(c, t.replace('{n}', pal.n), pal.tr), { tie: 2 }, '人間関係');
      return;
    }
    var w = s.wpal;
    if (w && !w.gone && working(L) && y >= w.next) {
      w.next = y + 3 + Math.floor(c.r() * 5);
      var ws = s.palSeen = s.palSeen || {}, wp = WORK_EV.filter(function (x) { return !ws[x]; });
      if (!wp.length) return;
      var t2 = wp[Math.floor(c.r() * wp.length)];
      ws[t2] = 1;
      c.say(fillPtr(c, t2.replace('{r}', w.r).replace('{n}', w.n), w.tr), /言い合い/.test(t2) ? { tie: -1 } : { tie: 2 }, '人間関係');
    }
  }
  function spouseOf(L) { return (L.members || []).filter(function (m) { return (m.role === '配偶者' || m.role === 'パートナー') && m.alive && !m.gone; })[0]; }
  function kidOf(L, y, a0, a1, f) { return (L.members || []).filter(function (m) { return m.role === '子' && m.alive && !m.gone && y - m.by >= a0 && y - m.by <= a1 && (!f || f(m)); })[0]; }
  function nm(m) { return m && m.name && !/アイヌ語/.test(m.name) ? m.name : null; }

  // 夫婦の場面：舅姑との同居（江戸〜戦前の嫁）
  arc({ id: 'shuto', start: function (c) {
    var L = c.L, sp = spouseOf(L);
    if (!L.married || !sp || L.sex !== 'f' || L.muko || c.y >= 1946 || c.a < 18 || c.a > 35 || !c.p(0.06)) return false;
    c.s.spTr = c.s.spTr || PTR[Math.floor(c.r() * PTR.length)][0];
    c.ask('shuto', '姑との暮らし', '嫁いだ家で、姑に家のしきたりのことで毎日のように小言を言われる。夫の' + (nm(sp) || '夫') + 'は' + ptr(c.s.spTr)[1] + 'だ。', [
      { k: 'bear', l: '黙って従う', w: 1, f: ['family'] },
      { k: 'talk', l: '夫に相談する', w: 0.8 + Math.max(0, c.tr('soc')) * 0.5, f: ['family'] },
      { k: 'home', l: '実家にしばらく帰る', w: 0.3 + Math.max(0, c.tr('adv')) * 0.5, f: ['body'] }
    ]);
    return true;
  }, res: {
    bear: function (c) { c.say('黙って従った。何年か経つと、姑は台所を任せてくれるようになった。', { sat: -3, tie: 2 }, '家庭'); },
    talk: function (c) { var ok = c.s.spTr === 'sewa' || c.s.spTr === 'quiet' || c.p(0.4); c.say(ok ? '夫が母親に話をしてくれ、小言は少しずつ減った。' : '夫は「母のことは我慢してくれ」と言うばかりだった。', ok ? { tie: 4, sat: 2 } : { tie: -3, sat: -3 }, '家庭'); },
    home: function (c) { c.say('実家にしばらく帰った。迎えに来た夫と話し合い、ひと月後に戻った。', { tie: -2, sat: 2 }, '家庭'); }
  } });
  // 夫の放蕩（江戸〜戦前）。江戸では縁切寺に駆け込む道もある
  arc({ id: 'houtou', start: function (c) {
    var L = c.L, sp = spouseOf(L);
    if (!L.married || !sp || L.sex !== 'f' || c.y < 1600 || c.y >= 1946 || c.a < 22 || c.a > 45 || !c.p(0.03)) return false;
    var opts = [{ k: 'bear', l: '耐える', w: 1, f: ['family'] }, { k: 'oya', l: '実家の親に相談する', w: 0.8, f: ['family'] }];
    if (c.y >= 1700 && c.y < 1872) opts.push({ k: 'tera', l: '縁切寺に駆け込む', w: 0.2 + Math.max(0, c.tr('adv')) * 0.4, f: ['body'] });
    c.ask('houtou', '夫の放蕩', '夫の' + (nm(sp) || '夫') + 'が' + (c.y < 1868 ? '遊郭' : '酒場') + 'に入り浸り、家の金を持ち出すようになった。', opts);
    return true;
  }, res: {
    bear: function (c) { c.money({ f: -0.2, t: '夫が家の金を持ち出した' }); c.say('耐えた。夫の遊びは何年か続き、蓄えはずいぶん減った。', { sat: -6 }, '家庭'); },
    oya: function (c) { c.say('実家の親が夫を呼びつけて意見してくれた。夫はしばらく神妙にしていた。', { tie: 2, sat: 1 }, '家庭'); },
    tera: function (c) { c.say('縁切寺に駆け込んだ。寺の取りなしで夫は詫びを入れ、二度としないと誓った。三行半の話まで出たが、家に戻った。', { sat: 3, tie: -3 }, '家庭'); }
  } });
  // 出征の見送り（戦中）
  arc({ id: 'shussei', start: function (c) {
    var L = c.L, sp = spouseOf(L);
    if (!L.married || !sp || sp.sex !== 'm' || c.y < 1937 || c.y > 1945 || c.y - sp.by < 20 || c.y - sp.by > 42 || !c.p(0.25)) return false;
    c.ask('shussei', '召集令状', '夫の' + (nm(sp) || '夫') + 'に召集令状が届いた。出発は三日後だ。', [
      { k: 'harinuki', l: '千人針を縫って持たせる', w: 1, f: ['family'] },
      { k: 'eki', l: '駅で万歳の声に混じって見送る', w: 0.8, f: ['family'] }
    ]);
    return true;
  }, res: {
    harinuki: function (c) { c.say('町角に立って、道行く女の人に一針ずつ縫ってもらった千人針を、夫の腹に巻いて送り出した。', { tie: 4, sat: -4 }, '家庭'); },
    eki: function (c) { c.say('駅は日の丸の小旗でいっぱいだった。万歳の声の中で、夫の顔をただ見ていた。', { tie: 3, sat: -5 }, '家庭'); }
  } });
  // 定年後の夫婦の時間（戦後）
  arc({ id: 'teinen', start: function (c) {
    var L = c.L, sp = spouseOf(L);
    if (!L.married || !sp || c.y < 1955 || c.a < 60 || c.a > 66 || !c.p(0.2)) return false;
    c.ask('teinen', '定年のあと', (L.sex === 'm' ? '定年を迎え' : '夫が定年を迎え') + '、夫婦で家にいる時間が急に増えた。', [
      { k: 'tabi', l: '二人で旅に出る', w: 1, f: ['family'] },
      { k: 'shumi', l: 'それぞれの趣味を持つ', w: 1, f: ['study'] },
      { k: 'kaji', l: '家のことを分け合う', w: 0.8, f: ['family'] }
    ]);
    return true;
  }, res: {
    tabi: function (c) { c.money({ inc: -0.1, t: '夫婦で旅に出た' }); c.say('二人で旅に出た。若いころに行けなかった土地を、少しずつ回った。', { sat: 6, tie: 5 }, '家庭'); },
    shumi: function (c) { c.say('それぞれに趣味を持った。夕飯のときに、その日のことを話すのが楽しみになった。', { sat: 4, learn: 3 }, '家庭'); },
    kaji: function (c) { c.say('家のことを分け合うことにした。最初はぎこちなかったが、いつの間にか慣れた。', { tie: 6 }, '家庭'); }
  } });
  // 子の奉公先を決める（江戸〜明治）
  arc({ id: 'kohoko', start: function (c) {
    var L = c.L, kid = kidOf(L, c.y, 10, 13);
    if (!kid || c.y >= 1900 || ['kuge', 'bushi', 'priest', 'ainu'].indexOf(c.st) >= 0 || c.poor() === false && c.p(0.5) || !c.p(0.06)) return false;
    c.s.kohoko = nm(kid) || (kid.sex === 'm' ? '息子' : '娘');
    c.ask('kohoko', '子の奉公先', '子の' + c.s.kohoko + 'を、どこへ奉公に出すか決める時が来た。', [
      { k: 'shoka', l: '町の商家へ出す', w: 1, f: ['earn'] },
      { k: 'oyakata', l: '職人の親方に預ける', w: 0.8, f: ['study'] },
      { k: 'home', l: '手元に置いて家の仕事をさせる', w: 0.8, f: ['family'] }
    ]);
    return true;
  }, res: {
    shoka: function (c) { c.money({ inc: 0.1, t: '子の奉公の前借り' }); c.say(c.s.kohoko + 'を町の商家へ出した。見送ったあと、しばらく夕飯がのどを通らなかった。', { tie: -3, sat: -1 }, '家庭'); },
    oyakata: function (c) { c.say(c.s.kohoko + 'を職人の親方に預けた。十年経って、一人前の腕になって帰ってきた。', { tie: 2, sat: 2 }, '家庭'); },
    home: function (c) { c.say(c.s.kohoko + 'を手元に置いた。家の働き手が一人増えた。', { tie: 4 }, '家庭'); }
  } });
  // 子の縁談に口を出すか
  arc({ id: 'koendan', start: function (c) {
    var L = c.L, kid = kidOf(L, c.y, 18, 26);
    if (!kid || c.a < 40 || !c.p(0.08)) return false;
    c.s.koen = nm(kid) || (kid.sex === 'm' ? '息子' : '娘');
    c.ask('koendan', '子の縁談', '子の' + c.s.koen + 'に、' + (c.y < 1950 ? '縁談が持ち込まれた。相手の家は申し分ない' : '結婚したい相手がいると打ち明けられた') + '。', [
      { k: 'kuchi', l: '口を出す', w: c.y < 1950 ? 1.2 : 0.6, f: ['family'] },
      { k: 'makaseru', l: '本人に任せる', w: c.y < 1950 ? 0.6 : 1.2, f: ['family'] }
    ]);
    return true;
  }, res: {
    kuchi: function (c) { var ok = c.p(0.5); c.say(ok ? c.s.koen + 'は親の言うことを聞き入れた。祝言の日、ほっとした顔をしていた。' : c.s.koen + 'は「自分のことは自分で決める」と言い返し、しばらく家に寄りつかなくなった。', ok ? { tie: 3 } : { tie: -6, sat: -3 }, '家庭'); },
    makaseru: function (c) { c.say(c.s.koen + 'に任せた。選んだ相手を連れてきた日、少し照れくさそうだった。', { tie: 5, sat: 2 }, '家庭'); }
  } });
  // 子が家を継がないと言い出す（家制度の跡取りとつなげる）
  arc({ id: 'kotsugi', start: function (c) {
    var L = c.L, kid = kidOf(L, c.y, 17, 25, function (m) { return m.sex === 'm'; });
    if (!kid || !famBiz(L) || c.y < 1880 || c.a < 40 || !c.p(0.1)) return false;
    c.s.kotsugi = nm(kid) || '息子';
    c.ask('kotsugi', '跡を継がない', '跡を継ぐはずの' + c.s.kotsugi + 'が、「' + BIZ[bizKey(L)] + 'は継がない。町へ出て働きたい」と言い出した。', [
      { k: 'settoku', l: '説得する', w: 1, f: ['family'] },
      { k: 'yurusu', l: '好きにさせる', w: 0.8 + Math.max(0, c.tr('warm')) * 0.5, f: ['family'] }
    ]);
    return true;
  }, res: {
    settoku: function (c) { var ok = c.p(0.5); c.say(ok ? '夜通し話し合い、' + c.s.kotsugi + 'は家に残ることになった。' : c.s.kotsugi + 'は説得を振り切って町へ出ていった。', ok ? { tie: 2, sat: 2 } : { tie: -6, sat: -4 }, '家庭'); },
    yurusu: function (c) { c.say(c.s.kotsugi + 'の好きにさせた。家の仕事をどうするかは、また考えることにした。', { tie: 4, sat: -2 }, '家庭'); }
  } });

  /* ========== お金の選択（改善の指示書 第4弾の11） ==========
     選んだ結果は、その年の貯金に足し引きし（c.money）、死亡の記録の「遺した財産」につながる。
     額はその人のふだんの年収や貯金に対する割合で決め、新しい金額は作らない（利息や物価の目安は推計） */
  // 凶作の年の年貢（江戸までの百姓）
  arc({ id: 'nengu', start: function (c) {
    var L = c.L, t = ((c.rec && c.rec.events) || []).map(function (e) { return e.t; }).join('') + ((c.rec && c.rec.world && c.rec.world.items) || []).map(function (i) { return i.t; }).join('');
    var bad = /凶作|飢饉|不作|日照り|冷害/.test(t);
    if (c.y >= 1873 || ['hyakusho', 'genin', 'ryukyuHyakusho', 'gusuku'].indexOf(c.st) < 0 || c.a < 20 || c.a > 60 || !(bad ? c.p(0.6) : c.p(0.012))) return false;
    var dau = kidOf(L, c.y, 10, 16, function (m) { return m.sex === 'f'; });
    var opts = [{ k: 'shichi', l: '田畑を質に入れる', w: 1, f: ['save'] }, { k: 'shakumai', l: '地主から米を借りる', w: 1, f: ['family'] }];
    // 答えは3つまで：年ごろの娘がいる家は前借り、いない家は減免の願い
    if (dau) { c.s.nenguDau = nm(dau) || '娘'; opts.push({ k: 'mae', l: '娘を奉公に出して給金を前借りする', w: 0.6, f: ['earn'] }); }
    else opts.push({ k: 'genmen', l: '年貢を減らしてほしいと願い出る', w: 0.4 + Math.max(0, c.tr('adv')) * 0.5, f: ['study'] });
    c.ask('nengu', '年貢が納められない', (bad ? 'この年は不作で、' : '') + '年貢の米が足りない。納めの日は近い。', opts);
    return true;
  }, res: {
    shichi: function (c) { c.money({ f: -0.4, t: '田畑を質に入れた（推計）' }); c.say('田畑の一部を質に入れて、年貢を納めた。', { sat: -6 }, '家庭'); c.later(5, 'nengu.back'); },
    shakumai: function (c) { c.money({ f: -0.15, t: '借りた米の返済（推計）' }); c.say('地主から米を借りて納めた。利息の分まで、何年もかけて返すことになった。', { sat: -4, tie: -1 }, '家庭'); },
    genmen: function (c) { if (c.p(0.4)) c.say('村の名主を通じて願い出ると、年貢の一部が免じられた。', { sat: 4, tie: 2 }, '家庭'); else { c.money({ f: -0.25, t: '願いは聞き入れられず、蓄えで年貢を納めた' }); c.say('願いは聞き入れられなかった。蓄えをはたいて納めた。', { sat: -5 }, '家庭'); } },
    mae: function (c) { c.money({ inc: 0.25, t: '娘の奉公の給金を前借りした' }); c.say(c.s.nenguDau + 'を奉公に出し、給金を前借りして年貢を納めた。', { tie: -8, sat: -3 }, '家庭'); }
  } });
  N['nengu.back'] = function (c) { if (!c.L.alive) return; if (c.p(0.5)) { c.money({ f: -0.2, t: '質に入れた田畑を請け戻した' }); c.say('五年かけて、質に入れた田畑を請け戻した。', { sat: 6 }, '家庭'); } else c.say('質に入れた田畑は流れてしまい、その分は小作として耕すことになった。', { sat: -6 }, '家庭'); };
  // 頼母子講・無尽に入るか
  arc({ id: 'tanomoshi', start: function (c) {
    if (c.y < 1300 || c.y > 1960 || c.a < 25 || c.a > 55 || !c.p(0.03)) return false;
    c.ask('tanomoshi', c.y < 1700 ? '頼母子講' : c.y < 1900 ? '頼母子講' : '無尽', '近所の人たちが掛け金を出し合い、順番にまとまった金を受け取る' + (c.y < 1900 ? '頼母子講' : '無尽') + 'に誘われた。', [
      { k: 'iru', l: '講に入る', w: 1 + Math.max(0, c.tr('soc')) * 0.3, f: ['save', 'family'] },
      { k: 'iranai', l: '入らない', w: 0.8, f: ['save'] }
    ]);
    return true;
  }, res: {
    iru: function (c) { c.money({ mul: 0.95, until: c.y + 3, t: '講の掛け金' }); c.say('講に入った。毎月の掛け金は苦しかったが、寄り合いで顔を合わせる人が増えた。', { tie: 4 }, '人間関係'); c.later(2 + Math.floor(c.r() * 3), 'tanomoshi.get'); },
    iranai: function (c) { c.say('誘いは断った。', { tie: -1 }, '人間関係'); }
  } });
  N['tanomoshi.get'] = function (c) { if (!c.L.alive) return; if (c.p(0.12)) { c.money({ inc: -0.3, t: '講が潰れ、掛け金が戻らなかった' }); c.say('講の世話役が金を持って逃げ、掛け金は戻らなかった。', { sat: -6, tie: -4 }, '人間関係'); } else { c.money({ inc: 0.6, t: '講の金が回ってきた' }); c.say('講の順番が回ってきて、まとまった金を受け取った。', { sat: 6 }, '家庭'); } };
  // 郵便貯金（明治〜）
  arc({ id: 'yucho', start: function (c) {
    if (c.y < 1875 || c.y > 1995 || c.a < 20 || c.a > 50 || !c.p(0.03)) return false;
    c.ask('yucho', '郵便貯金', '郵便局の窓口で、「毎月少しずつでも積み立てませんか」と勧められた。', [
      { k: 'tsumu', l: '毎月積み立てる', w: 1 + Math.max(0, c.tr('grit')) * 0.4, f: ['save'] },
      { k: 'tsukau', l: '今の暮らしに使う', w: 0.8, f: ['family'] }
    ]);
    return true;
  }, res: {
    tsumu: function (c) { c.money({ mul: 1.12, until: c.y + 25, t: '郵便貯金を積み立てた（利息は推計）' }); c.say('毎月の給金から少しずつ郵便貯金に回すことにした。', { sat: 1 }, '家庭'); },
    tsukau: function (c) { c.money({ mul: 0.95, until: c.y + 10, t: '貯めずに暮らしに使った' }); c.say('積み立てはやめておき、今の暮らしに使うことにした。', { sat: 2 }, '家庭'); }
  } });
  // マイホームと住宅ローン（戦後）
  arc({ id: 'myhome', start: function (c) {
    var L = c.L;
    if (c.y < 1960 || !L.married || c.a < 28 || c.a > 45 || c.poor() || c.s.done.myhome || !c.p(0.1)) return false;
    c.ask('myhome', 'マイホーム', '郊外に新しい住宅地ができた。' + (c.y < 1990 ? '「一国一城の主に」という広告が目に入る' : '子どもの学区も悪くない') + '。家を買うか。', [
      { k: 'kau', l: '住宅ローンを組んで家を買う', w: 1, f: ['family'] },
      { k: 'chintai', l: '借家のままにする', w: 0.8, f: ['save'] }
    ]);
    return true;
  }, res: {
    kau: function (c) { c.L.boughtHome = c.y; c.money({ f: -0.6, t: '家の頭金を払った' }); c.money({ mul: 0.8, until: c.y + 30, t: '住宅ローンの返済' }); c.say('三十年の住宅ローンを組んで家を買った。引っ越しの日、子どもが庭を走り回った。', { sat: 6, tie: 3 }, '家庭'); },
    chintai: function (c) { c.money({ mul: 1.05, until: c.y + 30, t: '借家のまま貯金を続けた' }); c.say('借家のままにした。身軽な暮らしも悪くない。', { sat: 1 }, '家庭'); }
  } });
  // 株を買うか（戦後）。上がるか下がるかは、その年の相場の大きな流れに合わせる（推計）
  arc({ id: 'kabu', start: function (c) {
    if (c.y < 1950 || c.a < 30 || c.a > 60 || c.poor() || !c.p(0.025)) return false;
    c.ask('kabu', '株', (c.y >= 1985 && c.y <= 1989 ? '世の中は株の話でもちきりだ。' : '勤め先の同僚が株で儲けたらしい。') + '貯金の一部で株を買ってみるか。', [
      { k: 'kau', l: '株を買う', w: 0.6 + Math.max(0, c.tr('adv')) * 0.6, f: ['earn'] },
      { k: 'kawanai', l: '買わない', w: 1, f: ['save'] }
    ]);
    return true;
  }, res: {
    kau: function (c) { c.say('貯金の一部で株を買った。', { sat: 1 }, '家庭'); c.later(2, 'kabu.res'); },
    kawanai: function (c) { c.say('株には手を出さなかった。', null, '家庭'); }
  } });
  N['kabu.res'] = function (c) {
    if (!c.L.alive) return;
    var y = c.y, down = (y >= 1990 && y <= 1992) || (y >= 2000 && y <= 2002) || (y >= 2008 && y <= 2009), up = (y >= 1986 && y <= 1989) || (y >= 2013 && y <= 2017);
    var win = up ? c.p(0.8) : down ? c.p(0.15) : c.p(0.5);
    if (win) { c.money({ f: 0.15, t: '株が値上がりした' }); c.say('買った株が値上がりした。少しだけ売って、家族で食事に出かけた。', { sat: 4 }, '家庭'); }
    else { c.money({ f: -0.2, t: '株が値下がりした' }); c.say('買った株が値下がりした。新聞の株価の欄を見なくなった。', { sat: -4 }, '家庭'); }
  };
  // 老後に子と同居するか
  arc({ id: 'rogo', start: function (c) {
    var L = c.L, kid = kidOf(L, c.y, 25, 60);
    if (!kid || c.a < 65 || c.a > 75 || c.y < 1900 || !c.p(0.15)) return false;
    c.s.rogo = nm(kid) || (kid.sex === 'm' ? '息子' : '娘');
    c.ask('rogo', '老後の暮らし', '子の' + c.s.rogo + 'に、「そろそろ一緒に暮らさないか」と言われた。', [
      { k: 'issho', l: '子の家族と一緒に暮らす', w: c.y < 1980 ? 1.2 : 0.7, f: ['family'] },
      { k: 'betsu', l: (L.married ? '夫婦で' : 'ひとりで') + '暮らし続ける', w: c.y < 1980 ? 0.6 : 1.1, f: ['body'] }
    ]);
    return true;
  }, res: {
    issho: function (c) { c.money({ mul: 1.1, t: '子の家族と暮らし、出費が減った' }); c.say(c.s.rogo + 'の家族と暮らし始めた。孫の声で家がにぎやかになった。', { tie: 6, sat: 2 }, '家庭'); },
    betsu: function (c) { c.money({ mul: 0.95, t: '暮らしの費用を自分でまかなった' }); c.say('住み慣れた家で暮らし続けることにした。' + c.s.rogo + 'は週に一度、顔を見に来てくれる。', { sat: 3, tie: 1 }, '家庭'); }
  } });

  /* ========== 名前の入った出来事（第2弾の6「出来事の文に人を入れる」） ==========
     名前の入った出来事がまだない年に、同じ家の人やまわりの人との小さな出来事を1つ足す。
     生きた年の3割を超えたら足さない。数値やお金は動かさない（年の終わりの計算のあとに足す）。乱数は人生の番号と年から作る */
  var FAM = {
    parentKid: [
      '{w}の背中で、夕焼けの田んぼを見た。', '{w}に、草履の鼻緒のすげ方を教わった。', '{w}が、寝る前に昔話をしてくれた。', '熱を出した夜、{w}が朝まで額を冷やしてくれた。',
      '{w}に手を引かれて、隣の村の市へ行った。', '{w}に叱られて、物置の陰で泣いた。', '{w}が、ふかした芋を半分に割ってくれた。', '{w}の仕事を、そばでじっと見ていた。',
      '{w}と、川で小さな魚をすくった。', '{w}に、数の数え方を教わった。'
    ],
    parentKidNew: [
      '{w}と、自転車の練習をした。', '{w}が、運動会で一番大きな声を出していた。', '{w}に、夏休みの宿題を手伝ってもらった。', '{w}と、夜店で金魚すくいをした。',
      '{w}が、誕生日にケーキを買ってきてくれた。', '{w}に、テストの点数のことで叱られた。'
    ],
    sib: [
      '{w}と、残った最後の団子を取り合った。', '{w}と並んで、軒下で雨宿りをした。', '{w}が、こっそり自分の分の干し柿を分けてくれた。', '{w}と、夜遅くまで小声で話した。',
      '{w}とけんかをして、三日口をきかなかった。', '{w}が転んで泣くのを、おぶって家まで帰った。', '{w}と、祭りの夜に田楽を見に行った。', '{w}の髪を結ってやった。'
    ],
    sibNew: ['{w}と、テレビのチャンネルを取り合った。', '{w}と、こたつで同じ漫画を読みふけった。', '{w}の受験を、家族みんなで見守った。', '{w}と、久しぶりに二人で飲みに行った。'],
    spouse: [
      '{w}と、縁側で月を見た。', '{w}が、黙って温かい汁をよそってくれた。', '{w}と、家のこれからのことを夜遅くまで話した。', '{w}とささいなことで言い合いになり、翌朝そっと謝った。',
      '{w}と二人で、冬支度の薪を割った。', '{w}の具合が悪く、一日そばについていた。', '{w}と、若いころの思い出話をして笑った。', '{w}と、初物の野菜を分け合った。'
    ],
    spouseNew: ['{w}と、久しぶりに二人で旅行に出かけた。', '{w}と、家計簿を前に頭を抱えた。', '{w}の誕生日に、花を買って帰った。'],
    kid: [
      '{w}が、はじめて自分の足で立った。', '{w}が、はじめて「おとう」「おかあ」と呼んだ。', '{w}に、仕事のこつを教えた。', '{w}が、手習いの字をうれしそうに見せに来た。',
      '{w}が熱を出し、一晩じゅう看病した。', '{w}と、川で魚を釣った。', '{w}のけんかの仲裁に入った。', '{w}が、はじめて一人で使いに出た。', '{w}の成長を、柱の傷で測った。'
    ],
    kidNew: ['{w}の運動会で、声をからして応援した。', '{w}の受験に、夜食を作って付き合った。', '{w}が、はじめての給料でごちそうしてくれた。', '{w}の結婚相手が、あいさつに来た。'],
    grand: ['孫の{n}を膝に乗せて、昔話をした。', '孫の{n}が、遊びに来てくれた。', '孫の{n}に、お手玉を教えた。'],
    gp: ['{w}の昔話を、いろりのそばで聞いた。', '{w}に、薬草の見分け方を教わった。', '{w}の肩をたたいてあげた。'],
    away: ['{w}から便りが届いた。', '{w}に宛てて、近ごろの様子を便りに書いた。', '{w}が元気にしていると、便りで知った。', '{w}からの便りを、大事にしまっておいた。'],
    friend: ['幼なじみの{n}と、日が暮れるまで遊んだ。', '近所の{n}と、山へ栗を拾いに行った。', '{n}に、悩みを打ち明けた。', '久しぶりに{n}と会い、昔の話で笑った。', '{n}の家の手伝いに行った。']
  };
  // 名前の入った出来事の年齢の範囲（v11の直し 9）：幼い子の場面は0〜8歳、子どものころの場面は14歳まで
  var FAM_AGE = [[/背中で|手を引かれ|背負われ|抱かれ|昔話をしてくれた|数の数え方|額を冷やして|自転車の練習/, 0, 8], [/物置の陰で泣いた|ふかした芋|小さな魚をすくった|鼻緒|運動会|宿題|金魚すくい|誕生日にケーキ/, 0, 14]];
  function famAgeOk(t, a) { for (var i = 0; i < FAM_AGE.length; i++) if (FAM_AGE[i][0].test(t)) return a >= FAM_AGE[i][1] && a <= FAM_AGE[i][2]; return true; }
  function h32(a, b) { var h = (Math.imul(a >>> 0, 2654435761) ^ Math.imul(b + 1, 40503)) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13; return h >>> 0; }
  function famWho(m, L) {
    var r = m.role === '配偶者' ? (m.sex === 'm' ? '夫' : '妻') : m.role === 'パートナー' ? 'パートナー' : m.role === '子' ? (m.sex === 'm' ? '息子' : '娘') : m.role;
    return r + 'の' + m.name;
  }
  function familyLine(L, rec, api) {
    if (!L.alive || !rec || rec.dead || rec.age < 2) return;
    var away = api.homeLife && !api.homeLife(L); // 出家・旅・奉公・出征の間は、家族とは便りと訪ねてくることだけ（v11の直し 1）
    var y = rec.year, a = rec.age, ms = (L.members || []).filter(function (m) { return m.alive && !m.gone && !m.before && m.by <= y && m.name && !/アイヌ語/.test(m.name); });
    var names = ms.map(function (m) { return m.name; }).concat([L.name, L.story && L.story.friend]).filter(Boolean);
    var has = function (r) { return (r.events || []).some(function (e) { return names.some(function (n) { return e.t && e.t.indexOf(n) >= 0; }); }); };
    if (has(rec)) return;
    var logs = (L.log || []).filter(function (r) { return r !== rec; }), yrs = logs.length + 1, hit = logs.filter(has).length;
    if (hit / yrs >= 0.34) return;
    var hh = h32(L.seed, y), newEra = y >= 1955, cands = [];
    function add(list, m, w) { list.forEach(function (t) { cands.push({ t: t, m: m, w: w }); }); }
    if (away) ms.forEach(function (m) { if (m.role !== '友' && y - m.by >= 12) add(FAM.away, m, 1); });
    ms.forEach(function (m) {
      var ma = y - m.by;
      if (L.mode) return; // 家を離れている年は、家族との場面を出さない
      if ((m.role === '父' || m.role === '母') && a <= 20) { add(FAM.parentKid, m, 1); if (newEra) add(FAM.parentKidNew, m, 1); }
      else if ((m.role === '祖父' || m.role === '祖母') && a <= 15 && m.live) add(FAM.gp, m, 1);
      else if (m.sib && Math.abs(m.by - L.by) < 15 && (a <= 30 || newEra)) { add(FAM.sib, m, 1); if (newEra) add(FAM.sibNew, m, 1); }
      else if ((m.role === '配偶者' || m.role === 'パートナー') && L.married) { add(FAM.spouse, m, 1.4); if (newEra) add(FAM.spouseNew, m, 1); }
      else if (m.role === '子' && ma <= 25) { add(FAM.kid.filter(function (t) { return ma <= 1 ? /はじめて/.test(t) : !/自分の足|「おとう」/.test(t); }), m, 1.2); if (newEra && ma >= 6) add(FAM.kidNew, m, 1); }
      else if (m.role === '孫') add(FAM.grand, m, 1);
    });
    if (!cands.length && !away && L.story && L.story.friend && a >= 5) add(FAM.friend, { name: L.story.friend, role: '友' }, 1);
    if (y >= 1938 && y <= 1945 && api.WAR_BAN) cands = cands.filter(function (x) { return !api.WAR_BAN.test(x.t); });
    cands = cands.filter(function (x) { return famAgeOk(x.t, a); });
    if (!cands.length) return;
    var used = L.famUsed = L.famUsed || {};
    var free = cands.filter(function (c) { return !used[c.t + c.m.name] && !used['t:' + c.t]; });
    if (!free.length) return; // 同じ型の文は、相手が違っても1つの人生で1回だけ
    var c = free[hh % free.length];
    used[c.t + c.m.name] = 1; used['t:' + c.t] = 1;
    var t = c.t.replace('{w}', c.m.role === '友' ? c.m.name : famWho(c.m, L)).replace('{n}', c.m.name);
    var e = api.push(L, rec, '家庭', t, []);
    if (e) e.flavor = true;
  }
  /* ---------- 戦後の財産と貴族院（spec6 2-7） ----------
     農地改革：GHQ の指令（1945年12月）を受け、1946年の自作農創設特別措置法で、不在地主の小作地と、在村地主の小作地のうち決まった広さを超える分を国が買い上げ、小作人に売り渡した。
     買い上げの値段は戦前の賃貸価格をもとにしたため、物価の上がった戦後には、受け取ったお金の値打ちはすぐに小さくなった（「わずかな代金で買い上げられた」と書く）。
     山林・宅地・町の土地は買い上げの外。財産税（1946年）は、財産の大きい家ほど高い割合で納めた */
  function landlord(L) { var k = (L.home0 || {}).kind || L.kind; return L.old && (L.incPct || 0) > 0.8 && (k === 'village' || k === 'fish' || L.status === 'kuge') && !L.abroad; }
  arc({ id: 'nochi', once: true, start: function (c) {
    var L = c.L;
    if (c.s.done.nochi || !landlord(L) || c.y < 1947 || c.y > 1950) return false;
    if (c.s.asked === c.y && c.y < 1950 && c.a >= 18) return false; // ほかの分かれ道が出た年は翌年に回す
    L.landReform = c.y; (L.houseLand = L.houseLand || {}).nochi = c.y;
    if (c.a < 18 || c.s.asked === c.y || L.mode) { c.say('農地改革で、家が小作に出していた田畑が、わずかな代金で国に買い上げられた。' + (c.a < 18 ? '大人たちが夜遅くまで話しこんでいた。' : ''), { sat: -2 }, '時代'); return true; }
    c.ask('nochi', '農地改革', '農地改革の買い上げの令書が届いた。家が小作に出していた田畑は、戦前の値段をもとにした代金で国に買い上げられ、耕していた家に売り渡される。どうする？', [
      { k: 'ukeru', l: '受け入れる', w: 1.2, f: ['family'] },
      { k: 'igi', l: '農地委員会に異議を申し立てる', w: 0.6, f: ['save'] }
    ]);
    return true;
  }, res: {
    ukeru: function (c) {
      c.say('農地改革の令書を受け入れた。田を耕していた家の主が頭を下げに来て、長い付き合いの礼を言った。', { tie: 3, sat: -3 }, '時代');
      c.ask('nochi2', '買い上げの代金', '国から買い上げの代金が届いた。物の値段は日ごとに上がっている。代金をどうする？', [
        { k: 'mono', l: 'すぐに品物や道具に替える', w: 1, f: ['earn'] }, { k: 'azuke', l: 'ひとまず預けておく', w: 1, f: ['save'] }], null, 'nochi');
    },
    igi: function (c) { c.money({ f: -0.03 }); c.say('農地改革の買い上げに、農地委員会へ異議を申し立てたが、決まりは変わらず、田畑は買い上げられた。村に気まずさが残った。', { tie: -4, sat: -2, learn: 1 }, '時代'); },
    mono: function (c) { c.money({ f: 0.02 }); c.say('代金はすぐに農具や家財に替えた。手元に物が残ったことに、少しほっとした。', { sat: 1, tie: -1 }, '時代'); },
    azuke: function (c) { c.money({ f: -0.05 }); c.say('代金を預けておいたが、物の値段が上がるにつれ、その値打ちはみるみる小さくなった。', { sat: -2, learn: 1 }, '時代'); }
  } });
  arc({ id: 'zaisanzei', start: function (c) {
    var L = c.L;
    if (c.s.done.zaisanzei || !c.O || c.y < 1946 || c.y > 1947 || c.a < 20 || !((L.incPct || 0) > 0.95 || L.status === 'kuge')) return false;
    c.ask('zaisanzei', '財産税', '財産税で、家の財産の大きな部分を税として納めることになった。屋敷・美術品・株のどれを手放すか、決めなければならない。', [
      { k: 'yashiki', l: '屋敷を売る', w: 1, f: ['save'] }, { k: 'bijutsu', l: '美術品と株を売る', w: 1, f: ['family'] }, { k: 'mise', l: '屋敷の一部で商売を始める', w: 0.7, f: ['earn'] }]);
    return true;
  }, res: {
    yashiki: function (c) { c.money({ f: -0.4 }); (c.L.houseLand = c.L.houseLand || {}).yashiki = 'sold'; c.say('先祖から受け継いだ屋敷を売った。屋敷はのちにホテルになり、家族は小さな家に移った。', { sat: -4, tie: 1 }, '時代'); },
    bijutsu: function (c) { c.money({ f: -0.35 }); c.say('掛け軸や茶道具、株を売って税を納めた。屋敷だけは手元に残した。', { sat: -2, tie: 2, learn: -1 }, '時代'); },
    mise: function (c) { c.money({ f: -0.25 }); c.say('屋敷の表の間を貸し、そこで商売を始めた。家の体面より、暮らしを選んだ。', { sat: 1, tie: -2, learn: 2 }, '時代'); }
  } });
  arc({ id: 'tsuiho', start: function (c) {
    var L = c.L;
    if (c.s.done.tsuiho || c.y < 1946 || c.y > 1948 || c.a < 25 || !(/^(sakan|shokan)$/.test(L.grade) || (L.posts || []).length)) return false;
    c.ask('tsuiho', '公職追放', '戦前に軍や政府の要職にあった者として、公職から退かされることになった。軍人の恩給も止まった。', [
      { k: 'matsu', l: '追放が解かれるのを待つ', w: 1, f: ['save'] }, { k: 'betsu', l: '別の道を探す', w: 1, f: ['earn'] }]);
    return true;
  }, res: {
    matsu: function (c) { c.say('畑を耕しながら、追放が解かれる日を待った。1950年代のはじめ、ようやく追放が解かれた。', { sat: -2, body: 1 }, '時代'); },
    betsu: function (c) { c.money({ f: -0.05 }); c.say('昔の肩書きを捨て、知り合いの小さな会社で帳簿をつける仕事に就いた。', { sat: 1, tie: -1, learn: 2 }, '時代'); }
  } });
  // 貴族院（1890〜1947年）：公爵・侯爵は満30歳で自動で議員（spec のとおり30歳より前は議員にしない）。伯爵・子爵・男爵は同じ爵位どうしの選挙。
  // 平民は、勅選（国に功績のあった人）と、多額納税者議員（その府県の多額の直接国税を納める人どうしの選挙）だけ
  arc({ id: 'kizokuin', start: function (c) {
    var L = c.L, y = c.y, a = c.a;
    if (c.s.done.kizokuin || !c.O || L.sex !== 'm' || y < 1890 || y > 1946) return false;
    if (L.status === 'kuge' && /^koshaku2?$/.test(L.kakaku) && a === 30) {
      (L.posts = L.posts || []).push({ y: y, t: '貴族院議員', how: '爵位' });
      c.say('満30歳になり、貴族院の議員になった。議場の前の方の席に座った。', { sat: 2, learn: 2, tie: -1 }, '時代');
      return true;
    }
    var kind = L.status === 'kuge' && /^(hakushaku|shishaku|danshaku)$/.test(L.kakaku) && a >= 30 && a <= 65 && c.p(0.06) ? 'goshi'
      : (L.feats || []).length && a >= 40 && c.p(0.25) ? 'chokusen'
      : L.status !== 'kuge' && (L.incPct || 0) > 0.97 && a >= 40 && a <= 70 && c.p(0.015) ? 'tagaku' : null;
    if (!kind) return false;
    c.s.kizoku = kind;
    c.ask('kizokuin', '貴族院', kind === 'goshi' ? '同じ爵位の者どうしの選挙で、貴族院の議員に推そうという話が出た。会派の根回しもいる。どうする？' : kind === 'chokusen' ? 'これまでの功績が認められ、貴族院の勅選議員に推されることになった。受けるか？' : '県で多額の直接国税を納める者どうしの選挙で、貴族院の議員に推された。どうする？', [
      { k: 'deru', l: '受けて議員になる', w: 1, f: ['earn'] }, { k: 'jitai', l: '辞退する', w: 1, f: ['family'] }]);
    return true;
  }, res: {
    deru: function (c) { var k = c.s.kizoku; (c.L.posts = c.L.posts || []).push({ y: c.y, t: '貴族院議員', how: k }); c.money({ f: -0.05 }); c.say(k === 'goshi' ? '会派の根回しを重ね、同じ爵位の者どうしの選挙で貴族院の議員に選ばれた。' : k === 'chokusen' ? '勅選議員として貴族院に入った。終身の務めだった。' : '多額納税者議員として貴族院に入った。地元の頼みごとが増えた。', { sat: 3, learn: 2, tie: -2 }, '時代'); },
    jitai: function (c) { c.say('議員の話は辞退し、家と地元のことに力を注いだ。', { tie: 2, sat: -1 }, '時代'); }
  } });

  /* ---------- 人生の筋（js/paths.js。作る人の指示 2026-10-19）----------
     珍しい仕事への道・売られた子や預けられた子の人生・ちょっとしたきっかけで都や幕府・国の役所で働く道・将軍家や大名家の人生。
     どの分かれ道にも地元に残る答えがあり、その答えにも地元で幸せに暮らす続きがある（誘導しない） */
  function pathsMod() {
    if (root.IchiokuPaths) return root.IchiokuPaths;
    if (typeof require === 'function') { try { return require('./paths.js'); } catch (e) { return null; } }
    return null;
  }
  // 筋に出会う割合（作る人の指示 2026-10-19「大幅に増やす」）。書いた p の何倍で始めるか
  var PATH_X = 3;
  var PATH_IND = { farm: 'agri', fish: 'fish', shop: 'shop', craft: 'factory', office: 'office', samurai: 'pub', temple: 'service', teacher: 'pub', clerk: 'office', service: 'service' };
  function pFill(c, t, path) {
    var P = people(c), L = c.L;
    return String(t || '').replace(/\{(\w+)\}/g, function (m0, k) {
      if (k === 'name') return String(L.name || '').replace(/（.*?）/g, '');
      if (k === 'dad') return P.dad || '父';
      if (k === 'mom') return P.mom || '母';
      if (k === 'place') return P.place || 'ふるさと';
      if (k === 'en' || k === 'enName') { var o = pathEn(c, path); return k === 'en' ? enLabel(L, o, o.name) : o.name; }
      return P[k] || '';
    });
  }
  // 筋の中の縁談・恋の相手（筋ごとに1人。spec6 2-29）
  function pathEn(c, path) {
    var s = c.s, id = path ? path.id : '_';
    s.pathEn = s.pathEn || {};
    if (!s.pathEn[id]) { var o = suitor(c.L, 'marry') || { age: c.a, house: '隣の家', order: '長女' }; o.name = c.name(c.L.sex === 'm' ? 'f' : 'm') || (c.L.sex === 'm' ? 'その娘' : 'その若者'); s.pathEn[id] = o; }
    return s.pathEn[id];
  }
  // 今住んでいる都道府県
  function curPref(L) { return String(L.old ? L.pref : (L.place || {}).pref); }
  function pathDo(c, path, o, nodeKey) {
    var L = c.L, s = c.s;
    if (!o) return;
    s.pathEnd = s.pathEnd || {}; s.pathNode = s.pathNode || {};
    // 1つの筋で、同じ場面を2回出さない。結末を出した筋の続きは出さない（spec6 1-6）
    if (nodeKey) { if (s.pathEnd[path.id] || s.pathNode[path.id + '.' + nodeKey]) return false; s.pathNode[path.id + '.' + nodeKey] = c.y; }
    if (o.move) c.move(o.move);
    if (o.away) c.mode('away');
    if (o.abroad) { L.abroad = o.abroad; L.abroadPlace = o.abroad; c.mode('away'); (L.abroadLog = L.abroadLog || []).push({ y: c.y, to: o.abroad }); }
    if (o.status && L.old && !L.rank) L.status = o.status;
    if (o.kakakuSet) L.kakaku = o.kakakuSet;
    if (o.gradeSet) { L.grade = o.gradeSet; (L.gradeLog = L.gradeLog || []).push({ y: c.y, g: o.gradeSet }); }
    if (o.job) {
      c.job(o.job.n, o.job.pay || 1500, o.job.reg !== false, c.O ? o.job.cat : (PATH_IND[o.job.cat] || 'service')); // 筋で就く仕事は、書いていなければ正規の勤め（非正規の割合の統計を崩さない）
      L.selfJob = { cat: o.job.cat || 'craft', n: o.job.n, d: o.job.d || '' }; L.lastJob = o.job.n;
      L.pathJob = { n: o.job.n, cat: o.job.cat || 'craft', pay: o.job.pay || 1500, y: c.y, path: path.id }; // 筋で就いた仕事は、辞める場面を経ない限り家の仕事に戻さない
      if (/議員|村長|町長|市長|知事|大臣|名主|乙名|庄屋/.test(o.job.n)) (L.posts = L.posts || []).push({ y: c.y, t: o.job.n, path: path.id });
    }
    if (o.quit) { L.pathJob = null; }
    if (o.money) c.money(o.money);
    if (o.debt) L.debt = Math.max(0, (L.debt || 0) + o.debt);
    if (o.honor) { var hh = { y: c.y, age: c.a, t: o.honor.t, k: o.honor.k, path: path.id }; if (honorOk(hh)) (L.honors = L.honors || []).push(hh); else if (o.honor.k === 'kunsho') (L.honors = L.honors || []).push({ y: c.y, age: c.a, t: '従五位', k: 'ikai', posthumous: true, path: path.id }); }
    if (o.crime) (L.crimes = L.crimes || []).push({ y: c.y, t: o.crime.t, pun: o.crime.pun, path: path.id });
    if (o.free) L.crimeFree = c.y;
    if (o.feat) (L.feats = L.feats || []).push({ y: c.y, path: path.id, group: path.group || null, t: path.title });
    if (o.say) c.say(pFill(c, o.say, path), o.fx || {}, o.job ? '学歴と仕事' : (o.cat || '人間関係'));
    s.f[path.id] = c.y;
    if (o.die) { L.storyDeath = { n: o.die.n, t: pFill(c, o.die.t, path), kind: o.die.kind || 'acc', path: path.id }; s.pathEnd[path.id] = c.y; return true; }
    if (o.next && o.next.node) { var lo = o.next['in'] ? o.next['in'][0] : 2, hi = o.next['in'] ? o.next['in'][1] : lo; c.later(lo + Math.floor(c.r() * (hi - lo + 1)), path.id + '.' + o.next.node); }
    else if (!o.ask && nodeKey) s.pathEnd[path.id] = c.y; // 続きも分かれ道もない場面は結末
    return true;
  }
  // 答えを選んだら、その筋の予約（選ばなかった答えの続き）を消す（spec6 1-6）
  function pathClear(c, path) {
    var pre = path.id + '.';
    c.s.at = c.s.at.filter(function (x) { return String(x.id).indexOf(pre) !== 0; });
  }
  function pathAsk(c, path, key, title, text, opts) {
    c.ask(key === 'start' ? path.id : path.id + '.' + key, title || path.title, pFill(c, text, path), opts.map(function (o) {
      return { k: key + '__' + o.k, l: o.l, w: typeof o.w === 'number' ? o.w : 1, f: o.f || [] };
    }), null, path.id);
  }
  // 筋の種類ごとの数の決まり：出来事・仕事・格・位の筋は「1つの人生に2本まで」の数に入れない。出世の筋は2本まで（spec6 2-3）
  var PATH_FREE = { jiken: 1, shoku: 1, kakaku: 1, kurai: 1 };
  // 筋の種類ごとの出会いやすさ（spec6 の「確かめ方」の割合に合わせる）
  var PATH_GX = { kaigai: 1.3, shusse: 2, gun: 12 }, PATH_CAP = { shusse: 0.06, gun: 0.12 };
  function pathOk(c, path) {
    var L = c.L, y = c.y, a = c.a, df = c.s.pathDefer && c.s.pathDefer[path.id];
    if (y < path.y[0] || y > (df ? Math.max(path.y[1], df + 2) : path.y[1]) || a < path.a[0] || a > path.a[1] + (df ? 2 : 0)) return false;
    if (path.sex && path.sex !== L.sex) return false;
    if (path.st && path.st.indexOf(c.st) < 0) return false;
    if (path.kind && path.kind.indexOf(c.kind) < 0) return false;
    if (path.rank ? path.rank.indexOf(L.rank) < 0 : !!L.rank && !path.anyRank && !path.group) return false;
    if (path.married === false && L.married) return false;
    if (path.married === true && !L.married) return false;
    if (path.pref && path.pref.indexOf(curPref(L)) < 0) return false;
    if (path.kakaku && path.kakaku.indexOf(L.kakaku) < 0) return false;
    if (path.grade && path.grade.indexOf(L.grade) < 0) return false;
    if (path.jobIs && path.jobIs.indexOf(curJob(L)) < 0) return false;
    if (path.group && L.mode && !path.modeOk && path.group !== 'kaigai' && path.group !== 'shoku') return false;
    return true;
  }
  (function () {
    var PM = pathsMod();
    if (!PM || !PM.list) return;
    var CHb = choicesMod();
    PM.list.forEach(function (path) {
      if (CHb && CHb.balance) { CHb.balance(path.opts); Object.keys(path.nodes || {}).forEach(function (nk) { if (path.nodes[nk].ask) CHb.balance(path.nodes[nk].ask.opts); }); }
      var res = {};
      path.opts.forEach(function (o) { res['start__' + o.k] = function (c) { pathClear(c, path); pathDo(c, path, o); }; });
      var nodes = {};
      Object.keys(path.nodes || {}).forEach(function (nk) {
        var nd = path.nodes[nk];
        nodes[nk] = function (c) {
          if (!c.L.alive) return;
          if (pathDo(c, path, nd, nk) === false) return;
          if (nd.ask && !c.L.storyDeath) pathAsk(c, path, nk, nd.ask.title, nd.ask.text, nd.ask.opts);
        };
        if (nd.ask) nd.ask.opts.forEach(function (o) { res[nk + '__' + o.k] = function (c) { pathClear(c, path); pathDo(c, path, o); }; });
      });
      arc({ id: path.id, path: true, group: path.group || null, once: !!path.once, pri: path.group === 'shusse', modeOk: path.group === 'kaigai' || path.group === 'shoku' || !!path.modeOk, start: function (c) {
        var s = c.s, free = PATH_FREE[path.group];
        // 出来事の筋は、ほかの分かれ道が出た年なら翌年に回す（出来事の年から2年まで）
        if (path.once && s.asked === c.y) { if (pathOk(c, path)) { s.pathDefer = s.pathDefer || {}; s.pathDefer[path.id] = s.pathDefer[path.id] || c.y; } return false; }
        if (!free && (s.pathN || 0) >= 3) return false;
        if (path.group === 'shusse' && (s.shusseN || 0) >= 2) return false;
        if (!pathOk(c, path)) return false;
        if (path.once) { s.pathOnce = s.pathOnce || {}; if (s.pathOnce[path.id]) return false; s.pathOnce[path.id] = c.y; if (!c.p(path.p || 0.4)) return false; }
        else if (!c.p(Math.min(free ? 0.4 : PATH_CAP[path.group] || 0.06, (path.p || 0.01) * (PATH_GX[path.group] || PATH_X)))) return false;
        if (!free) s.pathN = (s.pathN || 0) + 1;
        if (path.group === 'shusse') s.shusseN = (s.shusseN || 0) + 1;
        pathAsk(c, path, 'start', path.title, path.text, path.opts);
        return true;
      }, res: res, nodes: nodes });
    });
  })();

  /* ---------- 位階と勲章（spec6 2-10・2-25） ----------
     一定以上の役職に就いた人と、偉業を成しとげた人には、必ず位階か勲章を付ける。時代の制度に合わせる：
     明治より前は朝廷の位（官位相当）と、明治以後の贈位。1946〜1963年は生きている人への勲章を出さない（文化勲章は除く）。
     春秋の叙勲は1964年から、原則70歳以上。2002年からは「勲一等」などの数字の呼び方をやめた */
  var POST_RANK = [
    [/摂政|関白/, '従一位'], [/太政大臣|左大臣|右大臣|内大臣/, '正二位'], [/大納言/, '正三位'], [/中納言/, '従三位'], [/参議|近衛大将/, '正四位下'],
    [/蔵人頭/, '正四位下'], [/弁官|国司|受領|国守/, '従五位下'], [/将軍/, '従一位'], [/執権|管領/, '従四位下'], [/大名|藩主|老中|若年寄/, '従五位下']
  ];
  var POST_MODERN = /大臣|次官|知事|将官|少将|中将|大将|帝国大学の教授|貴族院|衆議院議員|国会議員|市長|最高裁|大学の学長|学長/;
  function honorOk(h) {
    if (h.k === 'kunsho' && h.y >= 1946 && h.y <= 1963 && !/文化勲章/.test(h.t) && !h.posthumous) return false;
    if (h.y >= 2002 && /勲[一二三四五六七八]等/.test(h.t)) return false;
    if (h.y < 1937 && /文化勲章/.test(h.t)) return false;
    if (h.y < 1955 && /紫綬褒章/.test(h.t)) return false;
    if (h.y < 1977 && /国民栄誉賞/.test(h.t)) return false;
    if (h.y < 1890 && /金鵄勲章/.test(h.t) || h.y > 1947 && /金鵄勲章/.test(h.t)) return false;
    if (h.y < 1875 && (h.k === 'kunsho' || h.k === 'hosho')) return false;
    return true;
  }
  function jobsOf(L) {
    var js = [];
    if (L.selfJob && L.selfJob.n) js.push(L.selfJob.n);
    if (L.lastJob) js.push(L.lastJob);
    if (L.pathJob && L.pathJob.n) js.push(L.pathJob.n);
    if (L.rank === 'shogun') js.push('将軍'); if (L.rank === 'daimyo') js.push('大名');
    if (L.grade === 'shokan') js.push('将官');
    return js.join('・');
  }
  // 亡くなったときに一度だけ呼ぶ（何度呼んでも同じ）。足りない栄典を、時代の制度に合わせて付ける
  function finalHonors(L) {
    if (!L || L.alive || L.honorsFinal) return L && L.honors || [];
    L.honorsFinal = true;
    var hs = (L.honors || []).filter(honorOk), dy = L.deathYear, jb = jobsOf(L), age = L.deathAge;
    var has = function () { return hs.length > 0; };
    if (dy < 1868) {
      for (var i = 0; i < POST_RANK.length; i++) if (POST_RANK[i][0].test(jb)) { if (!has()) hs.push({ y: dy, age: age, t: POST_RANK[i][1], k: 'ikai', why: '役職' }); break; }
    } else if (POST_MODERN.test(jb) && !has()) {
      if (dy < 1946) hs.push({ y: dy, age: age, t: '正四位', k: 'ikai', posthumous: true, why: '役職' }, { y: dy, age: age, t: '勲三等瑞宝章', k: 'kunsho', posthumous: true, why: '役職' });
      else if (dy >= 1964 && age >= 70) hs.push({ y: Math.max(1964, dy - 1), age: age - 1, t: dy >= 2003 ? '旭日中綬章' : '勲三等旭日中綬章', k: 'kunsho', why: '役職' }, { y: dy, age: age, t: '従四位', k: 'ikai', posthumous: true, why: '役職' });
      else hs.push({ y: dy, age: age, t: '従四位', k: 'ikai', posthumous: true, why: '役職' });
    }
    // 偉業の人：時代に合う栄典（明治より前は明治以後の贈位）
    if ((L.feats || []).some(function (f) { return f.group === 'ijou'; }) && !hs.some(function (h) { return h.k !== 'hobi'; })) {
      if (dy < 1868) hs.push({ y: dy, age: age, t: '従四位', k: 'zoui', note: '明治以後、その功により贈られた', why: '偉業' });
      else hs.push({ y: dy, age: age, t: '正五位', k: 'ikai', posthumous: true, why: '偉業' });
    }
    L.honors = hs;
    return hs;
  }
  // 記録に出す言い方：「1980年　勲三等旭日中綬章」「明治以後、従四位を贈られた」
  function honorText(h) {
    if (h.k === 'zoui') return '明治以後、その功により' + h.t + 'を贈られた';
    return h.y + '年　' + h.t + (h.posthumous ? '（亡くなったときに）' : '');
  }
  /* ---------- 家の記録と、何代か後の子孫（spec6 2-6） ----------
     家ごとに、名字・氏・家の格・土地・家業・家宝・家訓・地元での立場を持たせ、子孫へ受け継ぐ。
     土地：農地改革（1946年〜）で、小作に出していた田畑は買い上げられた。山林・宅地・町の土地は買い上げの外だったので、その家は今も地元の大地主でいられる */
  var TREASURE = { kuge: ['先祖の書き継いだ家の日記', '家に伝わる琵琶', '古い和歌の巻物'], bushi: ['先祖の刀', '戦で受けた感状', '家紋の入った鎧'], shizoku: ['先祖の刀', '藩から受けた感状'],
    hyakusho: ['村の古い絵図', '先祖の書いた日記', '名主の家の古文書'], chonin: ['先祖の大福帳', '色あせたのれん', '家に伝わる茶道具'], priest: ['寺の古い過去帳'], heimin: ['古い帳面', '先祖の写真'], other: ['先祖の書いた日記'] };
  var MOTTO = ['分を守り、家を守れ', '人の恩を忘れるな', '質素を旨とせよ', '学びを怠るな', '土地を手放すな', '約束は命より重く守れ'];
  var ERA_NAME = function (y) { return y < 1185 ? '平安' : y < 1333 ? '鎌倉' : y < 1467 ? '室町' : y < 1600 ? '戦国' : y < 1868 ? '江戸' : y < 1912 ? '明治' : y < 1926 ? '大正' : y < 1989 ? '昭和' : '平成'; };
  var POS_WORD = { kuge: '公家の', bushi: '武士の', shizoku: '士族の', hyakusho: '百姓の', chonin: '町人の', priest: '寺の' };
  function houseRec(L) {
    var h = L.house6 || {}, r = (L.story && L.story.r) || Math.random, st = L.status || 'heimin';
    var landBig = (L.incPct || 0) > 0.8, kind = (L.home0 || {}).kind || L.kind || ((L.place || {}).kind === '町村' ? 'village' : 'town');
    var land = h.land || { ta: landBig && (kind === 'village' || kind === 'fish') ? '大' : (L.incPct || 0) > 0.4 ? '中' : '小', yama: landBig && kind === 'village' && r() < 0.5, machi: landBig && (kind === 'town' || kind === 'city') };
    if (L.landReform || (L.houseLand || {}).nochi) land.nochi = L.landReform || L.houseLand.nochi;
    var tr = h.treasure || (TREASURE[st] || TREASURE.other)[Math.floor(r() * (TREASURE[st] || TREASURE.other).length)];
    return {
      surname: L.surname || h.surname || null, uji: L.uji || h.uji || null, status: st, kakaku: L.kakaku || null, grade: L.grade || null, rank: L.rank || null,
      prov: L.old ? (L.home0 || {}).prov || L.prov : null, sub: L.old ? (L.home0 || {}).sub || L.sub : null, pref: String(L.old ? (L.home0 || {}).pref || L.pref : L.home.pref), kind: kind,
      land: land, biz: h.biz || (L.parentJob && L.parentJob.n) || (L.dadJobD && L.dadJobD.n) || null, treasure: tr, motto: h.motto || MOTTO[Math.floor(r() * MOTTO.length)],
      pos: h.pos || ((L.posts || []).length ? L.posts[L.posts.length - 1].t : null), since: h.since || L.by, ancestor: h.ancestor || L.name, gens: (h.gens || 0) + 1,
      incPct: L.incPct, lastDy: L.deathYear
    };
  }
  // 子孫の人生に家の記録を受け継がせる（生まれた直後に呼ぶ）
  function applyDescend(L, rec) {
    var by = L.by, st = rec.status;
    if (L.old) {
      if (rec.rank === 'shogun' || rec.rank === 'daimyo') st = by < 1869 ? 'bushi' : by <= 1947 ? 'kuge' : 'heimin';
      if (st === 'bushi' && by >= 1872) st = by <= 1947 ? 'shizoku' : 'heimin';
      if (st === 'shizoku' && by >= 1948) st = 'heimin';
      if ((st === 'hyakusho' || st === 'chonin') && by >= 1872) st = 'heimin';
      if (st === 'kuge' && by >= 1948) st = 'heimin';
      L.status = st;
      if (rec.rank && by < 1869) L.rank = rec.rank;
      if (st === 'kuge') L.kakaku = rec.rank === 'shogun' ? 'koshaku' : rec.rank === 'daimyo' ? 'shishaku' : rec.kakaku;
    }
    L.surname = rec.surname || L.surname; if (rec.uji) L.uji = rec.uji;
    if (by >= 1870) L.surnameShow = true;
    // 暮らし向き：家の豊かさを受け継ぐ。農地改革の前に小作地を貸していた家は、1950年からの生まれでは田畑の多くを手放している
    var inc = rec.incPct == null ? 0.5 : rec.incPct, note = '';
    if (rec.land && rec.land.ta === '大' && by >= 1950) {
      if (rec.land.yama || rec.land.machi) { inc = Math.max(0.75, inc - 0.1); note = '農地改革で田畑の多くを手放したが、' + (rec.land.yama ? '山林' : '町の土地') + 'は残り、今も地元では大地主の家と呼ばれていた。'; }
      else { inc = Math.min(inc, 0.55); note = '農地改革で、小作に出していた田畑の多くを手放していた。'; }
      L.houseLand = { nochi: rec.land.nochi || 1947, before: by };
    }
    L.incPct = inc;
    L.house6 = rec;
    var place = L.old ? (L.H.prov[rec.prov] ? L.H.prov[rec.prov].kuni : '') : '';
    L.descendLine = '家は' + ERA_NAME(rec.since) + 'のころから' + (place ? place + 'の' : 'この土地の') + (rec.pos ? rec.pos + 'を出した' : (POS_WORD[rec.status] || '') ) + '家で、' + (rec.treasure ? '蔵には' + rec.treasure + 'が残っていた。' : '') + (rec.motto ? '家訓は「' + rec.motto + '」だった。' : '') + note;
    return L;
  }
  var API = { init: init, year: year, houseRec: houseRec, applyDescend: applyDescend, finalHonors: finalHonors, honorText: honorText, honorOk: honorOk, familyLine: familyLine, resolve: resolve, autoAnswer: autoAnswer, spouseDesc: spouseDesc, refuseText: refuseText, enLabel: enLabel, hintFor: hintFor, suitor: suitor, suitorText: suitorText, hokoTo: hokoTo, mukoHouse: mukoHouse, yoshiHouse: yoshiHouse, arcs: A, nodes: N };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.IchiokuStory = API;
})(typeof self !== 'undefined' ? self : this);
