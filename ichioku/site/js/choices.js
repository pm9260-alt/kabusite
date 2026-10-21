/* 1000分の1 小さな選択・親の選択（改善の指示書 第1弾の1・5）
   時代5つ（平安鎌倉・室町戦国・江戸・明治〜戦中・戦後）×年齢5つ（幼い・子ども・若いころ・働き盛り・老い）の枠ごとに並べる。
   1つの選択：id・kind（small／parent）・y（年の範囲）・a（年齢の範囲）・when（性別・身分・土地・状態）・text（差し込みつき）・options（k・l・fx）・after（選んだあとの1文）。
   fx は4つの数値（body からだ・sat 暮らしの満足・learn 学び・tie つながり）の動き。選択肢の下に出す hint は fx から作るので、向きはいつも一致する。
   差し込み：{place} {mom} {dad} {sibOlder} {sibYounger} {friend} {spouse} {child} {name}。埋められない選択は、その年は出さない。 */
(function (root) {
  'use strict';
  var L1 = [1000, 1332], L2 = [1333, 1602], L3 = [1603, 1867], L4 = [1868, 1945], L5 = [1946, 2120], ALL = [1000, 2120];
  var A0 = [0, 5], A1 = [6, 14], A2 = [15, 29], A3 = [30, 59], A4 = [60, 110];
  var COMMON = ['hyakusho', 'chonin', 'genin', 'heimin', 'gusuku', 'ryukyuHyakusho', 'modern', 'outcast', 'buraku', 'priest'];
  var VIL = ['village', 'fish'];
  var X = [];
  // c(id, kind, years, ages, when, text, options[[k, label, fx, after]])
  function c(id, kind, y, a, w, t, opts) { X.push({ id: id, kind: kind, y: y, a: a, when: w || {}, text: t, texts: Array.isArray(t) ? t : [t], options: opts.map(function (o) { return { k: o[0], l: o[1], fx: o[2] || {}, after: o[3] || null }; }) }); }
  var F = {}; // when の短縮
  function w(o) { return o; }

  /* ===== 幼い（0〜5歳）：親の選択 ===== */
  // 名付け（0歳。どの時代も必ず出す）は story.js で作る（名前の候補が時代で違うため）
  c('p.miyamairi.1', 'parent', L1, [1, 2], w({ kind: ['village', 'fish'], ind: ['home'] }), '{mom}は、{name}を連れて村の社にお参りに行こうか迷っている。道は遠く、冬の風が冷たい。', [
    ['go', '寒さをこらえて社へ連れて行く', { tie: 2, body: -1 }, '社の神主が、{name}の頭にそっと手を置いた。'], ['home', '春まで待つ', { body: 1 }]]);
  c('p.uba.1', 'parent', L1, [0, 1], w({ status: ['kuge'], kind: ['village', 'fish', 'town', 'city'], ind: ['office'] }), '{name}の乳母を、どの家から迎えるか決めることになった。', [
    ['kin', '親戚筋の家から迎える', { tie: 2 }, '親戚筋の乳母は、{name}を孫のようにかわいがった。'], ['skill', '子育ての上手と評判の家から迎える', { body: 2 }]]);
  c('p.kitou.1', 'parent', L1, [1, 4], w({ kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '{name}が高い熱を出した。{dad}は、祈祷の僧を呼ぶと言う。{mom}は、薬草に詳しい近所の老女に頼みたいと言う。', [
    ['pray', '祈祷を頼む', { tie: 1, sat: -1 }, '僧の読経が、夜通し続いた。'], ['herb', '薬草に詳しい老女に頼む', { body: 1 }, '苦い煎じ薬を、{mom}がひと匙ずつ飲ませた。']]);
  c('p.satogo.1', 'parent', L1, [1, 3], w({ status: COMMON, poor: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '凶作の冬。食べるものが足りず、{name}を遠い親戚の家に預けるかどうか、{dad}と{mom}が話しこんでいる。', [
    ['keep', '手もとで育てる', { tie: 3, body: -2 }, '粥を薄めて分け合い、冬を越した。'], ['send', '春まで親戚に預ける', { body: 2, tie: -3 }, '春に迎えに行くと、{name}は少し人見知りをした。']]);
  c('p.hairdown.1', 'parent', L1, [3, 5], w({ status: ['kuge'], kind: ['village', 'fish', 'town', 'city'], ind: ['office'] }), '{name}の髪置き（髪をのばし始める祝い）を、どれほど盛大にするか。', [
    ['big', '親戚を招いて盛大に祝う', { tie: 3, sat: 1 }], ['small', '家の者だけで祝う', { sat: 1 }]]);
  c('p.mamori.2', 'parent', L2, [1, 3], w({ kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '{name}がよく夜泣きをする。{mom}は、寺のお守りをもらいに行くか、隣の家の年寄りに相談するか迷っている。', [
    ['temple', '寺でお守りをもらう', { tie: 1 }], ['old', '隣の年寄りに相談する', { tie: 2 }, '隣の年寄りは、背中をとんとんたたく寝かし方を教えてくれた。']]);
  c('p.nige.2', 'parent', L2, [1, 5], w({ kind: VIL, ind: ['home'] }), '近くで戦があるという噂が立った。{dad}は、{name}を連れて山の寺に身を寄せるか迷っている。', [
    ['go', '山の寺に身を寄せる', { body: 1, tie: -1 }, '寺の縁の下で、ひと月を過ごした。'], ['stay', '村に残る', { tie: 2, body: -1 }]]);
  c('p.moraichi.2', 'parent', L2, [0, 1], w({ kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '{mom}の乳の出が細い。隣の家の嫁にもらい乳を頼むか。', [
    ['ask', '頭を下げて頼む', { body: 2, tie: 2 }, '隣の家とは、それから行き来が増えた。'], ['gruel', '米の汁で育てる', { body: -2 }]]);
  c('p.toshi.2', 'parent', L2, [2, 5], w({ status: ['bushi'], kind: ['village', 'fish', 'town', 'city'], ind: ['bushi'] }), '{name}に、木刀を持たせる年を決めることになった。', [
    ['early', '早めに持たせる', { body: 2, sat: -1 }], ['late', 'もう少し遊ばせる', { sat: 2 }]]);
  c('p.toku.2', 'parent', L2, [3, 5], w({ status: COMMON, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '旅の僧が、{name}の顔を見て「この子は寺に入れれば出世する」と言った。', [
    ['laugh', '笑って聞き流す', { tie: 1 }], ['keep', '心にとめておく', { learn: 1 }, '{dad}は、ときどきその話を持ち出した。']]);
  c('p.tera.3', 'parent', L3, [0, 1], w({ kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '{name}のお宮参り。{mom}は晴れ着を借りるか、ふだん着のままで行くか迷っている。', [
    ['kiru', '晴れ着を借りる', { sat: 2, tie: 1 }], ['fudan', 'ふだん着で行く', { sat: 0, tie: 1 }]]);
  c('p.hoso.3', 'parent', L3, [1, 4], w({ kind: ['village', 'fish'], ind: ['home'] }), '村で疱瘡がはやり始めた。{dad}は、赤い紙の疱瘡よけを貼るか、町の医者に相談するか迷っている。', [
    ['red', '赤い疱瘡よけを貼り、祈る', { tie: 1 }, '戸口に貼った赤い紙が、風に揺れていた。'], ['doc', '町の医者に相談する', { learn: 1, sat: -1 }]]);
  c('p.shichigo.3', 'parent', [1700, 1867], [3, 5], w({ kind: ['city', 'town'], ind: ['home'] }), '{name}の七五三。{mom}は千歳飴を買ってやりたいが、家計は苦しい。', [
    ['buy', '飴を買ってやる', { sat: 2, tie: 1 }, '{name}は、長い飴の袋を大事そうに抱えて歩いた。'], ['skip', 'お参りだけにする', { tie: 1 }]]);
  c('p.komori.3', 'parent', L3, [1, 3], w({ status: ['hyakusho', 'heimin'], kind: VIL, ind: ['home'] }), '田植えの時期。{name}を背負って田に出るか、{sibOlder}に子守りを任せるか。', [
    ['back', '背負って田に出る', { tie: 2, body: -1 }], ['sib', '{sibOlder}に任せる', { tie: 1 }, '{sibOlder}は、{name}を背負ってあぜ道を行ったり来たりした。']]);
  c('p.yose.3', 'parent', [1800, 1867], [3, 5], w({ kind: ['city', 'town'], ind: ['home'] }), '{dad}が、{name}を初めて寄席に連れて行くかどうか迷っている。', [
    ['go', '寄席の高座を見せに連れて行く', { sat: 3 }, '{name}は、落とし話の意味は分からないまま、まわりの笑い声につられて笑った。'], ['no', 'まだ早い', { body: 1 }]]);
  c('p.shuto.4', 'parent', L4, [0, 1], w({ kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '出生届を役場に出しに行く。{dad}は、名前の字を、画数のいい字に変えるか迷っている。', [
    ['keep', '決めた字のままにする', { tie: 1 }], ['kaku', '画数のいい字に変える', { sat: 1 }]]);
  c('p.shutou.4', 'parent', L4, [0, 2], w({ kind: ['village', 'fish'], ind: ['home'] }), '村に種痘の医者が来た。腕に傷をつけて牛の痘を植えると聞いて、{mom}はこわがっている。', [
    ['yes', '種痘を受けさせる', { body: 2, sat: -1 }, '{name}は大声で泣いたが、翌日にはけろりとしていた。'], ['wait', 'まわりの様子を見る', { sat: 1 }]]);
  c('p.shashin.4', 'parent', L4, [2, 5], w({ y: [1890, 1945], kind: ['town', 'city'], ind: ['home'] }), '町に写真館ができた。{dad}は、家族そろって写真を撮るかどうか迷っている。', [
    ['take', '撮りに行く', { sat: 3, tie: 2 }, 'その一枚は、のちのちまで仏壇の横に飾られた。'], ['no', 'もったいないのでやめる', {}]]);
  c('p.sokai.4', 'parent', [1943, 1945], [1, 5], w({ kind: ['city'], ind: ['home'] }), '空襲がはげしくなってきた。{mom}は{name}を連れて田舎の実家に身を寄せるか迷っている。', [
    ['go', '田舎へ行く', { body: 2, tie: -1 }], ['stay', '町に残る', { tie: 2, body: -2 }]]);
  c('p.kodomo.4', 'parent', L4, [3, 5], w({ kind: VIL, ind: ['home'] }), '{dad}が、{name}に小さな鍬を作ってやると言い出した。', [
    ['yes', '作ってもらう', { body: 1, tie: 2 }, '{name}は、その鍬で毎日あぜを掘り返した。'], ['no', 'まだ遊ばせておく', { sat: 1 }]]);
  c('p.hoikuen.5', 'parent', L5, [1, 3], w({ kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '{mom}は、仕事に戻るか、もう少し家で{name}を見るか迷っている。', [
    ['work', '仕事に戻り、保育園に預ける', { tie: 1, learn: 1 }], ['home', 'もう少し家で見る', { tie: 2 }]]);
  c('p.yobou.5', 'parent', L5, [0, 2], w({ kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '{name}の予防接種の日。{dad}が仕事を休んで一緒に行くかどうか。', [
    ['go', '休んで一緒に行く', { tie: 2 }], ['mom', '{mom}にまかせる', { sat: 0, tie: 1 }]]);
  c('p.ehon.5', 'parent', L5, [2, 5], w({ y: [1953, 2120], kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '寝る前の時間。{mom}は、絵本を読んで聞かせるか、テレビを見せて休むか迷っている。', [
    ['book', '絵本を声に出して聞かせる', { learn: 2, tie: 1 }], ['tv', 'テレビを見せる', { sat: 1 }]]);
  c('p.shichigo.5', 'parent', L5, [3, 5], w({ kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), ['七五三の写真。写真館で撮るか、家族でスマートフォンで撮るか。', '七五三の写真。写真館で撮るか、父のカメラで撮るか。', '七五三の祝い。写真館で記念に撮るか、家の前で父のカメラで撮るか。'], [
    ['studio', '写真館で撮る', { sat: 2, tie: 1 }], ['home', '家族で撮る', { tie: 2 }]]);
  c('p.naraigoto.5', 'parent', L5, [4, 5], w({ kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '近所の子が水泳教室に通い始めた。{mom}は、{name}も通わせるか迷っている。', [
    ['go', '通わせる', { body: 2, sat: -1 }], ['no', '外で遊ばせる', { sat: 2 }]]);

  /* ===== 子ども（6〜14歳） ===== */
  c('k.tenarai.1', 'small', L1, A1, w({ status: COMMON, kind: ['village', 'fish'], ind: ['home'] }), '寺の僧が、村の子に字を教えてくれるという。{dad}は田の仕事が忙しいと渋い顔をしている。', [
    ['ask', '習いに行きたいとせがむ', { learn: 3, tie: -1 }, '寺の縁側で、砂の上に指で字を書いた。'], ['help', '田を手伝う', { tie: 2, body: 1 }]]);
  c('k.kawa.1', 'small', L1, A1, w({ kind: VIL, ind: ['home'] }), '{friend}が川の深みにはまって溺れかけた。', [
    ['jump', '飛びこんで助けに行く', { body: -2, tie: 4 }, '水をたくさん飲んだが、{friend}の手を離さなかった。'], ['run', '大人を呼びに走る', { tie: 2 }]]);
  c('k.kakure.1', 'small', L1, A1, w({ kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '干し柿を盗み食いしたのを、{mom}に見つかった。', [
    ['sorry', '正直に謝る', { tie: 2, sat: -1 }], ['sib', '{sibYounger}のせいにする', { sat: 1, tie: -3 }, '{sibYounger}は泣きながら、何も言わなかった。']]);
  c('k.dengaku.1', 'small', L1, A1, w({ kind: ['village', 'fish'], ind: ['home'] }), '村の祭りで、田楽の一行が笛と太鼓を鳴らしている。', [
    ['dance', '輪に入って踊る', { sat: 3, tie: 1 }], ['watch', '{sibYounger}の手を引いて見物する', { tie: 2 }]]);
  c('k.kuge.1', 'small', L1, A1, w({ status: ['kuge'], kind: ['village', 'fish', 'town', 'city'], ind: ['office'] }), '和歌の師から、季節の歌を一首詠むように言われた。', [
    ['try', '自分の言葉で詠む', { learn: 3, sat: -1 }, '師は、一か所だけ直して「よい」と言った。'], ['copy', '古い歌をまねて詠む', { learn: 1 }]]);
  c('k.ushi.1', 'small', L1, A1, w({ kind: VIL, ind: ['home'] }), '家の牛の世話を任された。朝早く起きて草を刈るか、{sibOlder}に代わってもらうか。', [
    ['self', '自分で刈る', { body: 2, tie: 1 }], ['sib', '{sibOlder}に頼む', { sat: 1, tie: -1 }]]);
  c('k.ikusa.2', 'small', L2, A1, w({ kind: VIL, ind: ['home'] }), '村の大人たちが、落ち武者狩りの話をしている。{friend}は見に行こうと言う。', [
    ['go', 'こっそりついて行く', { sat: -2, learn: 1 }, '山道で見たものは、誰にも話せなかった。'], ['no', '家にいる', { tie: 1 }]]);
  c('k.tera.2', 'small', L2, A1, w({ status: COMMON, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '寺の住職が、利発な子を小僧として預かりたいと言ってきた。{dad}は{name}を見ている。', [
    ['go', '寺に入りたいと言う', { learn: 4, tie: -3 }, '寺の朝は、日の出前の鐘で始まった。'], ['stay', '家にいたいと言う', { tie: 2 }]]);
  c('k.sumo.2', 'small', L2, A1, w({ sex: 'm', kind: ['village', 'fish'], ind: ['home'] }), '村の子どもたちが、相撲の勝ち抜き戦をしている。', [
    ['join', '飛び入りで加わる', { body: 2, sat: 1 }], ['ref', '行司役を買って出る', { tie: 2 }]]);
  c('k.ito.2', 'small', L2, A1, w({ sex: 'f', kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '{mom}が、糸車の回し方を教えると言う。外では{friend}が呼んでいる。', [
    ['learn', '糸車を習う', { learn: 2, tie: 1 }], ['play', '遊びに行く', { sat: 2 }]]);
  c('k.bushi.2', 'small', L2, A1, w({ status: ['bushi'], kind: ['village', 'fish', 'town', 'city'], ind: ['bushi'] }), '元服の前に、{dad}が初めて弓を引かせてくれるという。', [
    ['pull', '思いきり引く', { body: 2, sat: 1 }, '矢は的をそれたが、{dad}は笑っていた。'], ['ask', '引き方を先に教わる', { learn: 2 }]]);
  c('k.nakama.2', 'small', L2, A1, w({ kind: ['village', 'fish'], ind: ['home'] }), '{friend}が、山の向こうの市へ行ってみようと誘ってきた。', [
    ['go', '一緒に行く', { sat: 3, tie: 2, body: -1 }, '市には、見たこともない南の国の焼き物が並んでいた。'], ['no', '親に黙っては行かない', { tie: 1 }]]);
  c('k.terakoya.3', 'small', L3, A1, w({ status: ['hyakusho', 'chonin'], kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '近所の子が寺子屋に通い始めた。家では{sibYounger}の子守りが待っている。', [
    ['go', '寺子屋に行きたいとせがむ', { learn: 3, tie: -1 }, '師匠からもらった手本を、何度もなぞった。'], ['komori', '子守りを続ける', { tie: 3 }]]);
  c('k.kenka.3', 'small', L3, A1, w({ kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '{friend}と大げんかをした。次の日、道でばったり出くわした。', [
    ['first', '自分から声をかける', { tie: 3 }], ['ignore', '知らんぷりをする', { sat: -1, tie: -2 }]]);
  c('k.misemono.3', 'small', L3, A1, w({ kind: ['city', 'town'], ind: ['home'] }), '両国の盛り場に見世物小屋が来ている。{sibOlder}がこっそり行こうと誘う。', [
    ['go', 'ついて行く', { sat: 4, tie: 2 }, '見世物小屋で見た大きな蛇の話を、冬じゅう{sibYounger}に聞かせた。'], ['home', '家で母を手伝う', { tie: 1, learn: 1 }]]);
  c('k.hanko.3', 'small', L3, A1, w({ status: ['bushi'], sex: 'm', kind: ['village', 'fish', 'town', 'city'], ind: ['bushi'] }), '藩校の素読で、師に指名された。一か所、まちがえそうな字がある。', [
    ['say', '分からないと正直に言う', { learn: 3, sat: -1 }], ['guess', 'あてずっぽうで続ける', { sat: 1 }]]);
  c('k.kusa.3', 'small', L3, A1, w({ kind: VIL, ind: ['home'] }), '村の子どもたちで、牛馬の草を刈りに山へ入る。年下の{sibYounger}がついて来たがっている。', [
    ['bring', '弟妹の手を引いて連れて行く', { tie: 3, body: -1 }], ['leave', '家に置いていく', { body: 1 }]]);
  c('k.ama.3', 'small', L3, A1, w({ kind: ['fish'], ind: ['home'] }), '浜の大人たちが、沖の潮の見分け方を教えてやると言う。', [
    ['learn', '舟に乗せてもらう', { learn: 2, body: 1 }], ['shore', '浜で網の繕いを手伝う', { tie: 2 }]]);
  c('k.shogakko.4', 'small', [1873, 1945], A1, w({ kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '小学校の運動会。かけっこの前の晩、{mom}が新しい足袋をこしらえてくれた。', [
    ['run', '足袋で走る', { sat: 3, tie: 2 }], ['save', 'もったいないので裸足で走る', { tie: 1, body: 1 }]]);
  c('k.komori.4', 'small', [1873, 1945], A1, w({ sex: 'f', status: ['heimin', 'hyakusho'], kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '子守り奉公の口がある。学校には通えなくなるが、家は少し楽になる。', [
    ['go', '子守り奉公に出る', { tie: -2, sat: -1 }, '背中の赤ん坊をあやしながら、校庭の歌声を聞いた。'], ['school', '学校に通い続けたいと言う', { learn: 3, sat: 1 }]]);
  c('k.menko.4', 'small', [1900, 1945], A1, w({ sex: 'm', kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), 'めんこで{friend}に全部取られた。', [
    ['again', 'もう一度勝負を挑む', { sat: 1, tie: 1 }], ['quit', 'きっぱりやめる', { learn: 1 }]]);
  c('k.gakudo.4', 'small', [1944, 1945], A1, w({ kind: ['city'], ind: ['home'] }), '疎開先の寺で、家から届いた小包を開けた。中には炒り豆がひと袋。', [
    ['share', '同じ部屋の子と分ける', { tie: 4, body: -1 }], ['hide', 'こっそり少しずつ食べる', { body: 2, tie: -2 }]]);
  c('k.chiyo.4', 'small', L4, A1, w({ y: [1872, 1945], kind: VIL, ind: ['home'] }), '学校の帰り道、{friend}が「あの家の柿は甘い」と言う。', [
    ['take', 'ひとつだけもらう', { sat: 2, tie: -1 }, '見つかって、その家のおばあさんに叱られた。'], ['no', 'やめておく', { tie: 1 }]]);
  c('k.kakizome.4', 'small', L4, A1, w({ y: [1872, 1945], kind: ['town', 'city'], ind: ['home'] }), '正月の書き初め。先生から、学校の代表として町の展覧会に出さないかと言われた。', [
    ['yes', '出す', { learn: 2, sat: 2 }], ['no', '恥ずかしいので断る', { sat: -1 }]]);
  c('k.tv.5', 'small', [1955, 2120], A1, w({ kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '夕飯どき。{sibOlder}と見たい番組がちがう。', [
    ['yield', 'ゆずる', { tie: 2, sat: -1 }], ['fight', 'リモコン（チャンネル）を取り合う', { sat: 1, tie: -2 }]]);
  c('k.ijime.5', 'small', L5, A1, w({ kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), 'クラスで、{friend}の悪口を書いた紙が回ってきた。', [
    ['stop', '回さずに破る', { tie: 3, sat: -1 }], ['pass', '黙って次に回す', { tie: -3 }]]);
  c('k.juku.5', 'small', [1970, 2120], A1, w({ kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '友だちの多くが塾に通い始めた。{mom}が「行く？」と聞いてきた。', [
    ['go', '塾に通う', { learn: 3, sat: -1 }], ['no', 'サッカー（部活）を続ける', { body: 2, sat: 1 }]]);
  c('k.game.5', 'small', [1983, 2120], A1, w({ kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '新しいゲーム機が出た。お年玉を全部使えば買える。', [
    ['buy', '買う', { sat: 3, learn: -1 }], ['save', '貯めておく', { learn: 1 }]]);
  c('k.ryoko.5', 'small', L5, A1, w({ kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '修学旅行の自由行動。班の中で行き先の意見が割れた。', [
    ['own', '自分の行きたい所を押す', { sat: 2, tie: -1 }], ['match', 'みんなに合わせる', { tie: 2 }]]);
  c('k.kanji.5', 'small', L5, A1, w({ kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '夏休みの宿題が手つかずのまま、最後の3日になった。', [
    ['night', '徹夜で片づける', { learn: 2, body: -2 }], ['copy', '{friend}に見せてもらう', { tie: 1, learn: -1 }]]);
  c('k.ame.0', 'small', ALL, A1, w({ kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '帰り道、雨の中で子犬が震えていた。', [
    ['take', '家に連れて帰る', { tie: 2, sat: 2 }, '{dad}はしぶい顔をしたが、軒下に小屋を作ってくれた。'], ['leave', '見なかったことにする', { sat: -2 }]]);
  c('k.yume.0', 'small', ALL, [8, 14], w({ kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '大人になったら何になりたいかと、{dad}に聞かれた。', [
    ['big', '誰もなったことのないものになると答える', { sat: 2 }], ['same', '{dad}と同じ仕事と答える', { tie: 3 }]]);

  /* ===== 若いころ（15〜29歳） ===== */
  c('y.fumi.1', 'small', L1, A2, w({ kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '{friend}の家で見かけた人のことが、忘れられない。', [
    ['write', '歌を書いた文を出す', { sat: 2, tie: 1 }, '返事の歌は来なかったが、扇がひとつ届いた。'], ['wait', '次に会える日を待つ', { sat: -1 }]]);
  c('y.kyo.1', 'small', L1, A2, w({ status: COMMON, sex: 'm', kind: ['village', 'fish'], ind: ['home'] }), '荘園の年貢を都へ運ぶ人足が足りないという。', [
    ['go', '人足に加わって都へ上る', { body: -2, learn: 3, sat: 2 }, '都の大路の広さに、口があいたままになった。'], ['stay', '村の田を守る', { tie: 2 }]]);
  c('y.ennichi.1', 'small', L1, A2, w({ sex: 'f', kind: ['town', 'city'], ind: ['home'] }), '市の日に、旅の傀儡の一座が来ている。{friend}が見に行こうと誘う。', [
    ['go', '見に行く', { sat: 3 }], ['work', '機を織る', { learn: 1, tie: 1 }]]);
  c('y.kojin.1', 'small', L1, A2, w({ status: ['kuge'], kind: ['village', 'fish', 'town', 'city'], ind: ['office'] }), '宮中の歌合で、相手方の歌に難をつけるよう頼まれた。', [
    ['do', '頼まれたとおり難をつける', { tie: 1, sat: -1 }], ['fair', '思ったとおりに評する', { learn: 2, tie: -1 }]]);
  c('y.yumi.1', 'small', L1, A2, w({ status: ['bushi'], kind: ['village', 'fish'], ind: ['bushi'] }), '主の館で流鏑馬の稽古がある。前の晩に足をひねった。', [
    ['ride', '痛みをこらえて出る', { body: -3, tie: 2, sat: 1 }], ['rest', '休んで治す', { body: 2, tie: -1 }]]);
  c('y.wakamono.2', 'small', L2, A2, w({ sex: 'm', kind: VIL, ind: ['home'] }), '村の若者組の夜の集まりがある。{dad}は早く寝ろと言う。', [
    ['go', '集まりに出る', { tie: 3, body: -1 }], ['sleep', '家で寝る', { body: 1 }]]);
  c('y.so.2', 'small', L2, A2, w({ sex: 'm', kind: VIL, heirOnly: true, ind: ['home'] }), '惣の寄り合いで、用水の分け方を話し合っている。年寄りたちが若い者の意見も聞きたいという。', [
    ['speak', '思いきって意見を言う', { tie: 2, learn: 2 }], ['quiet', '黙って聞く', { learn: 1 }]]);
  c('y.so.2f', 'small', L2, A2, w({ sex: 'f', kind: VIL, ind: ['home'] }), '寄り合いから帰った{dad}が、用水の決まりを話している。{mom}は納得がいかない顔だ。', [
    ['ask', 'わけを聞いてみる', { learn: 2, tie: 1 }], ['let', '口をはさまない', { tie: 1 }]]);
  c('y.ichi.2', 'small', L2, A2, w({ kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '定期の市で、手持ちの麻布が思ったより高く売れそうだ。', [
    ['sell', '全部売る', { sat: 2 }], ['keep', '半分は家に残す', { tie: 1, sat: 1 }]]);
  c('y.koi.2', 'small', L2, A2, w({ unmarried: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '祭りの夜、{friend}にひそかに想う人がいると打ち明けられた。', [
    ['help', '仲を取りもつ', { tie: 3 }], ['tease', 'からかう', { sat: 1, tie: -2 }]]);
  c('y.bushi.2', 'small', L2, A2, w({ status: ['bushi'], kind: ['village', 'fish', 'town', 'city'], ind: ['bushi'] }), '初陣を前に、{dad}が古い鎧を譲ると言う。', [
    ['wear', '譲られた鎧を着る', { tie: 3 }], ['new', '新しい胴丸を求める', { body: 1, sat: 1 }]]);
  c('y.yabuiri.3', 'small', L3, A2, w({ hoko: true, kind: ['town', 'city'], ind: ['home'] }), '藪入りの日。家に帰るか、奉公先の町で芝居を見るか。', [
    ['home', '家に帰る', { tie: 3 }, '{mom}が炊いた小豆飯を、腹いっぱい食べた。'], ['town', '町で芝居を見る', { sat: 3 }]]);
  c('y.shikarare.3', 'small', L3, A2, w({ hoko: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '奉公先の番頭に、身に覚えのないことで叱られた。', [
    ['sorry', 'その場は謝る', { tie: 1, sat: -2 }], ['say', '違うと言い返す', { sat: 1, tie: -2 }]]);
  c('y.fumi.3', 'small', L3, A2, w({ unmarried: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '気になる人がいる。{friend}が、文を届けてやろうかと言う。', [
    ['write', '文を書いて頼む', { sat: 2, tie: 1 }], ['no', '自分で話しかける機会を待つ', { learn: 1 }]]);
  c('y.edo.3', 'small', L3, A2, w({ kind: VIL, ind: ['home'] }), '江戸から帰ってきた{friend}が、町の暮らしをしきりにほめる。', [
    ['dream', '自分も行きたいと思う', { sat: 1, tie: -1 }], ['here', '村がいちばんだと言い返す', { tie: 2 }]]);
  c('y.kenjutsu.3', 'small', L3, A2, w({ status: ['bushi'], sex: 'm', kind: ['village', 'fish', 'town', 'city'], ind: ['bushi'] }), '道場で、師範代から試合を申しこまれた。勝てる見込みは薄い。', [
    ['fight', '受ける', { body: -2, learn: 3 }], ['no', '稽古を積んでからと断る', { learn: 1 }]]);
  c('y.machi.3', 'small', L3, A2, w({ status: ['chonin'], kind: ['town', 'city'], ind: ['shop'] }), '店の主人から、帳場を少し任せてみると言われた。', [
    ['yes', '引き受ける', { learn: 3, sat: 1, body: -1 }], ['no', 'まだ早いと辞退する', { tie: 1 }]]);
  c('y.chohei.4', 'small', [1873, 1945], [19, 21], w({ sex: 'm', kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '徴兵検査が近い。{friend}は、少しでも体を鍛えておけと言う。', [
    ['train', '毎朝走って鍛える', { body: 3 }], ['usual', 'ふだんどおり働く', { tie: 1 }]]);
  c('y.miokuri.4', 'small', [1937, 1945], A2, w({ kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '{friend}の出征の見送りの日。何を渡すか迷っている。', [
    ['senninbari', '千人針の腹巻きを渡す', { tie: 4, sat: -2 }], ['photo', '一緒に撮った写真を渡す', { tie: 3, sat: -1 }]]);
  c('y.haikyu.4', 'small', [1940, 1949], A2, w({ kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '配給の列。うしろに、赤ん坊を背負った知り合いが並んでいる。', [
    ['yield', '順番を譲る', { tie: 3, body: -1 }], ['keep', 'そのまま並ぶ', { body: 1 }]]);
  c('y.jokyu.4', 'small', [1900, 1945], A2, w({ sex: 'f', kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '女学校の友だちが、タイピストの養成所に通うという。', [
    ['go', '一緒に通う', { learn: 3, sat: 1 }], ['home', '家の手伝いを続ける', { tie: 2 }]]);
  c('y.katsudo.4', 'small', [1910, 1945], A2, w({ kind: ['city', 'town'], ind: ['home'] }), '町の活動写真館に、評判の作品がかかっている。', [
    ['go', '給金をはたいて見に行く', { sat: 3 }], ['save', '給金は手もとに貯めておく', { learn: 1 }]]);
  c('y.shudan.5', 'small', [1955, 1975], [15, 18], w({ kind: VIL, ind: ['home'] }), '中学を出たら、集団就職で都会の工場に行く話がある。', [
    ['go', '都会に行くつもりでいる', { sat: 1, tie: -2 }], ['stay', '村で働くつもりでいる', { tie: 2 }]]);
  c('y.tenkin.5', 'small', L5, A2, w({ job: true, kind: ['town', 'city'], ind: ['home'] }), '入社3年目、上司から「地方の支店に行ってみないか」と打診された。', [
    ['go', '転勤の話を受ける', { learn: 3, tie: -2 }], ['no', '今の部署に残りたいと答える', { tie: 1 }]]);
  c('y.dousou.5', 'small', L5, A2, w({ kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '成人式のあと、中学の同窓会がある。会いたくない人も来る。', [
    ['go', '出る', { tie: 3, sat: 1 }], ['skip', '行かない', { sat: -1 }]]);
  c('y.kekkon.5', 'small', L5, [24, 29], w({ unmarried: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '{mom}が、知り合いの紹介で会ってみないかと写真を持ってきた。', [
    ['meet', '会ってみる', { tie: 2 }], ['no', '自分で探すと断る', { sat: 1, tie: -1 }]]);
  c('y.shikaku.5', 'small', [1970, 2120], A2, w({ job: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '仕事のあと、資格の勉強をするか、同期と飲みに行くか。', [
    ['study', '資格の勉強をする', { learn: 3, sat: -1 }], ['drink', '同期と飲みに行く', { tie: 3, body: -1 }]]);
  c('y.hitori.5', 'small', [1975, 2120], A2, w({ kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '実家を出て、ひとり暮らしをするかどうか。', [
    ['go', '部屋を借りる', { sat: 2, learn: 1, tie: -1 }], ['stay', '実家にいてお金を貯める', { tie: 2 }]]);
  c('y.matsuri.0', 'small', ALL, A2, w({ kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '祭りの準備で、{friend}と役目の取り合いになった。', [
    ['yield', '{friend}に譲る', { tie: 3 }], ['take', '自分がやると言いはる', { sat: 2, tie: -2 }]]);

  /* ===== 働き盛り（30〜59歳） ===== */
  c('m.nengu.1', 'small', L1, A3, w({ status: COMMON, kind: VIL, ind: ['home'] }), '日照りで稲の実りが半分しかない。荘園の役人に年貢を減らしてもらえるよう頼みに行くか。', [
    ['ask', '村の衆と頼みに行く', { tie: 3, sat: -1 }, '役人は渋い顔をしたが、三分の一を翌年に回してくれた。'], ['pay', '蓄えを出して納める', { sat: -3 }]]);
  c('m.kyoudai.1', 'small', L1, A3, w({ kind: ['village', 'fish'], ind: ['home'] }), '{sibOlder}が、田の境を少しずつこちらへずらしているらしい。', [
    ['talk', '面と向かって話す', { tie: -1, sat: 1 }], ['let', '黙っておく', { sat: -2, tie: 1 }]]);
  c('m.kuge.1', 'small', L1, A3, w({ status: ['kuge'], kind: ['village', 'fish', 'town', 'city'], ind: ['office'] }), '受領として地方へ下る話が来た。都を離れれば出世の道は遠くなるが、実入りは多い。', [
    ['go', '地方へ下る', { sat: 2, tie: -2 }], ['stay', '都に残る', { learn: 1, tie: 1 }]]);
  c('m.kiki.1', 'small', L1, A3, w({ kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '{child}が、遠くの寺に修行に出たいと言い出した。', [
    ['ok', '許す', { tie: -1, sat: 1 }], ['no', '家にいてほしいと頼む', { tie: 2 }]]);
  c('m.bushi.1', 'small', L1, A3, w({ status: ['bushi'], kind: ['village', 'fish', 'town', 'city'], ind: ['bushi'] }), '主から、隣の荘との境の争いで、館に詰めるよう言われた。', [
    ['go', '詰める', { tie: 2, body: -2 }], ['send', '家の郎党を出す', { sat: 1 }]]);
  c('m.koshi.2', 'small', L2, A3, w({ kind: VIL, ind: ['home'] }), '村八分にされそうな家がある。訳を聞けば、気の毒な事情だった。', [
    ['help', 'かばう', { tie: 2, sat: -1 }], ['follow', '村の決まりに従う', { tie: 1 }]]);
  c('m.sakaba.2', 'small', L2, A3, w({ sex: 'm', kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '隣家との境の杭が抜かれていた。', [
    ['yoriai', '寄り合いに持ちこむ', { tie: 1, sat: 1 }], ['direct', '隣家に直接言いに行く', { tie: -2, sat: 2 }]]);
  c('m.toso.2', 'small', L2, A3, w({ status: ['chonin', 'hyakusho'], kind: ['village', 'fish'], ind: ['home'] }), '土倉から借りた銭の返済の期日が来た。', [
    ['sell', '牛を売って返す', { sat: -3, body: -1 }], ['wait', '待ってもらうよう頼む', { tie: -1, sat: -1 }]]);
  c('m.ikki.2', 'small', L2, A3, w({ sex: 'm', kind: VIL, ind: ['home'] }), '隣村の衆が、領主の新しい関所に抗議しに行くので加われと言う。', [
    ['join', '加わる', { tie: 2, body: -1 }], ['no', '加わらない', { sat: 0, tie: -1 }]]);
  c('m.child.2', 'small', L2, A3, w({ kind: ['town', 'city'], ind: ['home'] }), '{child}を、町の商家に見習いに出すか、家で育てるか。', [
    ['out', '見習いに出す', { tie: -2, sat: 1 }], ['home', '家で育てる', { tie: 2 }]]);
  c('m.kenchi.2', 'small', [1582, 1602], A3, w({ kind: VIL, sex: 'm', ind: ['home'] }), '検地の役人が来て、田の広さを測っている。', [
    ['true', 'ありのまま申告する', { tie: 1, sat: -2 }], ['small', '少しでも小さく見せようとする', { sat: 1, tie: -1 }]]);
  c('m.nengu.3', 'small', L3, A3, w({ status: ['hyakusho'], kind: VIL, ind: ['home'] }), '凶作の年。年貢をどう工面するか。', [
    ['shichi', '着物を質に入れる', { sat: -2 }], ['karimai', '庄屋から米を借りる', { tie: -1, sat: -1 }], ['musume', '娘の奉公の前借りをする', { tie: -3, sat: 1 }]]);
  c('m.tanomoshi.3', 'small', L3, A3, w({ kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '近所で頼母子講を始めるので加わらないかと誘われた。', [
    ['join', '講の仲間に加わる', { tie: 2, sat: 1 }], ['no', '講には入らずにおく', { sat: 0, learn: 1 }]]);
  c('m.ko.3', 'small', L3, A3, w({ kind: ['town', 'city'], ind: ['home'] }), '{child}の奉公先を決めることになった。', [
    ['near', '近くの店にする', { tie: 2 }], ['edo', '遠い江戸の大店にする', { sat: 1, tie: -2 }]]);
  c('m.kinjo.3', 'small', L3, A3, w({ kind: ['city', 'town'], ind: ['home'] }), '長屋の隣の家の亭主が病で寝ついた。おかみさんは内職で手いっぱいだ。', [
    ['help', '子どもを預かってやる', { tie: 3, body: -1 }], ['no', '自分の家のことで手いっぱいだ', { sat: 0 }]]);
  c('m.tokkuri.3', 'small', L3, A3, w({ sex: 'm', kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '仕事の帰りに、仲間が一杯やろうと誘う。', [
    ['go', '付き合う', { tie: 2, body: -1 }], ['home', 'まっすぐ帰る', { tie: 1, body: 1 }]]);
  c('m.bushi.3', 'small', L3, A3, w({ status: ['bushi'], kind: ['village', 'fish', 'town', 'city'], ind: ['bushi'] }), '上役の不正に気づいた。訴え出れば、自分の家も無事ではすまないかもしれない。', [
    ['tell', '目付に申し出る', { sat: 2, tie: -2 }], ['quiet', '上役の不正には目をつぶる', { sat: -2 }]]);
  c('m.inkyo.3', 'small', L3, [50, 59], w({ kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '{dad}が、そろそろ隠居したいと言い出した。', [
    ['ok', '家を継ぐ用意をする', { tie: 2, sat: 1 }], ['wait', 'まだ早いと引き止める', { tie: 1 }]]);
  c('m.yuubin.4', 'small', [1875, 1945], A3, w({ kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '郵便局の人が、郵便貯金を勧めに来た。', [
    ['save', '毎月少しずつ預ける', { sat: 1, learn: 1 }], ['no', 'たんすにしまっておく', { sat: 0 }]]);
  c('m.shussei.4', 'small', [1937, 1945], A3, w({ hasChild: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '{child}に召集令状が届いた。出征の朝、何と声をかけるか。', [
    ['live', '「必ず生きて帰れ」と言う', { tie: 4, sat: -3 }], ['brave', '「お国のために」と送り出す', { tie: 1, sat: -2 }]]);
  c('m.sokai.4', 'small', [1944, 1945], A3, w({ kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '疎開してきた家族が、同じ屋根の下で暮らすことになった。荷物の置き場をどうするか。', [
    ['share', '奥の部屋を空けて分ける', { tie: 3, sat: -1 }], ['shed', '納屋を使ってもらう', { sat: 1 }]]);
  c('m.gekka.4', 'small', L4, A3, w({ y: [1890, 1945], kind: VIL, ind: ['home'] }), '村に電灯がつくことになった。月々の電灯料がかかる。', [
    ['yes', '引く', { sat: 3 }], ['no', 'しばらくはランプで暮らす', { sat: -1 }]]);
  c('m.kumiai.4', 'small', [1900, 1945], A3, w({ job: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '職場の仲間が、待遇を良くしてほしいと会社に掛け合うという。', [
    ['join', 'その集まりに名を連ねる', { tie: 2, sat: 1 }], ['no', '集まりには顔を出さない', { sat: -1 }]]);
  c('m.tv.5', 'small', [1955, 1975], A3, w({ kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '近所でテレビを買う家が増えてきた。月賦で買うか。', [
    ['buy', '月賦で買う', { sat: 3, tie: 1 }], ['wait', '現金で買えるまで待つ', { sat: -1 }]]);
  c('m.tenkin.5', 'small', L5, A3, w({ job: true, married: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '転勤の内示が出た。家族を連れて行くか、ひとりで行くか。', [
    ['family', '家族で引っ越す', { tie: 2, sat: -1 }], ['alone', '単身赴任にする', { tie: -3, sat: 1 }]]);
  c('m.kaigo.5', 'small', L5, [45, 59], w({ parentOld: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '{mom}の物忘れがひどくなってきた。', [
    ['visit', '週末ごとに実家に通う', { tie: 3, body: -2 }], ['service', '介護の相談窓口に連絡する', { learn: 2, tie: 1 }]]);
  c('m.house.5', 'small', [1960, 2120], A3, w({ married: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '住宅ローンを組んで家を買うか、借家のままでいるか。', [
    ['buy', '家を買う', { sat: 2, tie: 1 }], ['rent', '借家のままでいる', { sat: 0, learn: 0, tie: 0 }]]);
  c('m.kodomo.5', 'small', L5, A3, w({ hasChild: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '{child}が、大学に行かずに働きたいと言い出した。', [
    ['ok', '本人の思うようにさせる', { tie: 2 }], ['no', '大学には行けと説く', { tie: -2, learn: 1 }]]);
  c('m.byouki.0', 'small', ALL, A3, w({ kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), 'このところ、胸のあたりが苦しい日がある。', [
    ['doc', (null), { body: 2, sat: -1 }], ['work', '気のせいだと働き続ける', { body: -3, sat: 1 }]]);
  c('m.shakkin.0', 'small', ALL, A3, w({ kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '{sibOlder}が、金を貸してほしいと頭を下げに来た。', [
    ['lend', '貸す', { tie: 3, sat: -2 }], ['no', '貸すのは断る', { tie: -3 }]]);

  /* ===== 老い（60歳〜） ===== */
  c('o.inkyo.1', 'small', L1, A4, w({ kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '家のことを{child}に任せて、髪を下ろそうかと考えている。', [
    ['shukke', '髪を下ろして仏道に入る', { sat: 2, tie: -1 }], ['stay', 'もう少し家を見守る', { tie: 2 }]]);
  c('o.mago.1', 'small', L1, A4, w({ hasChild: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '孫の名付けに、口を出すかどうか。', [
    ['say', '昔の家の名をつけてほしいと言う', { tie: 1, sat: 1 }], ['no', '若い者に任せる', { tie: 2 }]]);
  c('o.mukashi.1', 'small', L1, A4, w({ kind: ['village', 'fish'], ind: ['home'] }), '村の若い者が、昔の大飢饉の話を聞かせてほしいと言う。', [
    ['tell', '夜更けまで話して聞かせる', { tie: 3, sat: 1 }], ['no', '思い出したくないと断る', { sat: -1 }]]);
  c('o.miyako.1', 'small', L1, A4, w({ status: ['kuge'], kind: ['village', 'fish', 'town', 'city'], ind: ['office'] }), '若い女房たちが、昔の宮中の話を聞きたいと集まってきた。', [
    ['tell', '話して聞かせる', { tie: 3, sat: 2 }], ['write', '書き留めて残す', { learn: 3 }]]);
  c('o.inkyo.2', 'small', L2, A4, w({ hasChild: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '家督を{child}に譲るかどうか。', [
    ['give', '譲って隠居する', { tie: 2, sat: 1 }], ['keep', 'まだ譲らない', { sat: 1, tie: -1 }]]);
  c('o.junrei.2', 'small', L2, A4, w({ kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '若いころ果たせなかった寺参りの旅に、今から出られるだろうか。', [
    ['go', '杖をついて出かける', { sat: 4, body: -3 }], ['near', '近くの寺に参るだけにする', { sat: 1 }]]);
  c('o.yoriai.2', 'small', L2, A4, w({ sex: 'm', kind: VIL, ind: ['home'] }), '寄り合いで、若い者たちが年寄りの意見を聞かずに決めようとしている。', [
    ['speak', '昔のいきさつを話す', { tie: 1, sat: 1 }], ['let', '口をはさまず見守る', { tie: 2 }]]);
  c('o.sakazuki.2', 'small', L2, A4, w({ kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '古い友が訪ねてきた。もう会えるのは最後かもしれない。', [
    ['drink', '朝まで酒をくみかわす', { tie: 4, body: -2 }], ['short', '短く話して見送る', { body: 1 }]]);
  c('o.ise.3', 'small', L3, A4, w({ status: ['hyakusho', 'chonin'], kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '孫が、伊勢参りに連れて行ってほしいとせがむ。足腰は心もとない。', [
    ['go', '無理を押して自分も参る', { sat: 5, body: -3, tie: 2 }], ['no', '孫に代参を頼む', { tie: 2 }]]);
  c('o.inkyo.3', 'small', L3, A4, w({ hasChild: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '隠居して家を{child}に譲るかどうか。', [
    ['give', '譲る', { tie: 2, sat: 1 }], ['keep', 'もう少し自分で切り盛りする', { sat: 1, tie: -2 }]]);
  c('o.haiku.3', 'small', L3, A4, w({ kind: ['village', 'fish'], ind: ['home'] }), '村の句会に誘われた。', [
    ['go', '出てみる', { learn: 2, tie: 2 }], ['no', '畑の手入れをする', { body: 1 }]]);
  c('o.mago.3', 'small', L3, A4, w({ hasChild: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '孫の名付けに口を出すかどうか。', [
    ['say', '家の通り名を継がせたいと言う', { tie: 1, sat: 1 }], ['no', '名づけは若夫婦に任せる', { tie: 2 }]]);
  c('o.ishi.4', 'small', L4, A4, w({ kind: ['town', 'city'], ind: ['home'] }), '最近、物忘れが増えた。{child}が町の医者に診てもらえと言う。', [
    ['go', '医者に行く', { body: 1, sat: -1 }], ['no', '年のせいだと笑う', { sat: 1 }]]);
  c('o.shashin.4', 'small', L4, A4, w({ hasChild: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '{child}が、家族写真を撮ろうと写真屋を呼んだ。', [
    ['take', '一番いい着物で写る', { sat: 3, tie: 2 }], ['no', '年寄りは写らなくていいと言う', { tie: -1 }]]);
  c('o.senso.4', 'small', [1937, 1945], A4, w({ kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '孫が戦地へ行く。何を持たせるか。', [
    ['omamori', '氏神のお守りを持たせる', { tie: 3, sat: -2 }], ['letter', '手紙を書いて持たせる', { tie: 3, learn: 1 }]]);
  c('o.mukashi.4', 'small', L4, A4, w({ kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '若い者が、ちょんまげのころの話を聞きたいと言う。', [
    ['tell', '孫に昔の暮らしを語る', { tie: 3, sat: 1 }], ['no', '昔のことは忘れたと笑う', { sat: 0, tie: 0 }]]);
  c('o.doukyo.5', 'small', [1960, 2120], A4, w({ hasChild: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '{child}が、一緒に住まないかと言ってきた。', [
    ['yes', '同居する', { tie: 3, sat: -1 }], ['no', '住み慣れた家で暮らす', { sat: 2, tie: -1 }]]);
  c('o.smart.5', 'small', [2010, 2120], A4, w({ kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '孫がスマートフォンの使い方を教えると言う。', [
    ['learn', '教わる', { learn: 3, tie: 2 }], ['no', '電話で十分だと断る', { sat: 0 }]]);
  c('o.shuushoku.5', 'small', L5, A4, w({ kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '定年のあと、シルバー人材センターの仕事に誘われた。', [
    ['yes', '働きに出る', { body: 1, tie: 2 }], ['no', '趣味の時間にする', { sat: 2 }]]);
  c('o.menkyo.5', 'small', [1990, 2120], [72, 110], w({ kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '{child}から、車の運転免許を返したらどうかと言われた。', [
    ['give', '返納する', { body: 1, sat: -2 }], ['keep', 'まだ運転できると言う', { sat: 1, tie: -2 }]]);
  c('o.yuigon.0', 'small', ALL, [65, 110], w({ hasChild: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '自分の亡きあと、家や物をどう分けるか書き残しておくか。', [
    ['write', '書き残す', { tie: 2, learn: 1 }], ['no', 'そのときに任せる', { sat: 1, tie: -1 }]]);
  c('o.niwa.0', 'small', ALL, A4, w({ kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '庭の木を植え替えるかどうか。実がなるのは何年も先だ。', [
    ['plant', '孫のために植える', { sat: 2, tie: 1 }], ['no', '今ある木を大事にする', { sat: 1 }]]);

  /* ===== 時代を問わない選択（言い回しを3つずつ持ち、同じ文は1つの人生で1回だけ） ===== */

  /* ===== 時代と土地で絞った選択・大きな出来事の年の選択（v8の直し 2・3。補助の下書きを確かめて入れた） ===== */
// 平安・鎌倉 [1000,1332] 村
c('h1.v.mizuban', 'small', [1000, 1332], [6, 14], w({ kind: ['village'], ind: ['farm'] }), '日照りの夏、{dad}が夜の水番に出ることになった。', [
  ['go', '{dad}について田の水口へ行く', { body: -1, tie: 1 }, '星の下で水の音を聞きながら朝まで起きていた。'],
  ['fire', '家に残って囲炉裏の火の番をする', { body: 1, sat: -1 }, '火を絶やさずに{dad}の帰りを待った。']]);
c('h1.v.buyaku', 'small', [1000, 1332], [15, 29], w({ kind: ['village'], ind: ['farm'], sex: 'm' }), '荘園の年貢米を都まで運ぶ夫役の番が回ってきた。', [
  ['carry', '米俵を担いで都まで夫役に出る', { body: -2, learn: 2 }, '都の大路を初めて目にした。'],
  ['cloth', '代わりに麻布を納めて村に残る', { sat: -1, tie: 1 }, '{mom}の機織りを手伝って冬を越した。']]);
c('h1.v.uttae', 'small', [1190, 1332], [30, 59], w({ kind: ['village'], ind: ['farm'], sex: 'm' }), '地頭が荘園の取り立てとは別に、材木の切り出しまで言いつけてきた。', [
  ['sign', '百姓の連名の訴え状に名を連ねる', { tie: 2, sat: -1 }, '寄り合いの皆と同じ側に立った。'],
  ['obey', '地頭の言いつけどおり山へ入る', { body: -2, sat: 1 }, '争いは起きず、冬までに材木を納めた。']]);
c('h1.v.mugi', 'small', [1250, 1332], [30, 59], w({ kind: ['village'], ind: ['farm'] }), '稲を刈ったあとの田に、麦をまく家が出てきた。', [
  ['ura', '田に麦をまいて裏作を試す', { sat: 2, body: -1 }, '春に麦の穂が揺れるのを目にした。'],
  ['rest', '冬は田を休ませて草刈りに回る', { body: 1, learn: -1 }, '例年どおりの冬を過ごした。']]);
c('h1.v.dengaku', 'small', [1000, 1332], [60, 110], w({ kind: ['village'], ind: ['home'] }), '鎮守の祭りが近づき、若い者たちが田楽の稽古を始めた。', [
  ['teach', '田楽の笛を孫たちに教える', { tie: 2, body: -1 }, '笛の音が夜ごとに上手になっていった。'],
  ['watch', '社の端に座って見物にまわる', { sat: 1, body: 1 }, '若い者の舞を目を細めて眺めた。']]);
// 浜の村
c('h1.f.shio', 'small', [1000, 1332], [6, 14], w({ kind: ['fish'], ind: ['fish'] }), '{mom}が塩浜に海の水をまく季節になった。', [
  ['oke', '桶を運んで塩浜を手伝う', { body: -1, tie: 1 }, '日暮れには腕がぱんぱんになった。'],
  ['iso', '磯で貝を拾って夕餉に足す', { sat: 1, learn: 1 }, '岩の陰に貝が多いことを覚えた。']]);
c('h1.f.oki', 'small', [1000, 1332], [15, 29], w({ kind: ['fish'], ind: ['fish'], sex: 'm' }), '雲の様子が怪しい朝、仲間が鯛を釣りに沖へ出ようと言う。', [
  ['oki', '仲間と櫓をこいで沖へ出る', { sat: 2, body: -2 }, '波にもまれながら鯛を何尾か揚げた。'],
  ['sora', '空模様を案じる年寄りに従って浜に残る', { body: 1, sat: -1 }, '昼すぎに風が強まり、浜で網を繕った。']]);
c('h1.f.ama', 'small', [1000, 1332], [15, 29], w({ kind: ['fish'], ind: ['fish'], sex: 'f' }), '浜の女たちが鮑を採りに潜る季節が来た。', [
  ['dive', '女たちに混じって海へ潜る', { body: -1, sat: 2 }, '息の続くかぎり潜って鮑をはがした。'],
  ['hosu', '浜で鮑を干す仕事にまわる', { body: 1, tie: 1 }, '干し場で年上の女たちと話し込んだ。']]);
c('h1.f.himono', 'small', [1000, 1332], [30, 59], w({ kind: ['fish'], ind: ['fish'] }), '干し魚がいつになく多くできた。', [
  ['ichi', '国府の市へ運んで米と換える', { sat: 2, tie: -1 }, '米を背負って浜へ戻った。'],
  ['wake', '浜の家々に分けて回る', { tie: 2, sat: -1 }, 'あちこちの家から礼を言われた。']]);
c('h1.f.dou', 'small', [1000, 1332], [60, 110], w({ kind: ['fish'], ind: ['home'] }), '嵐の続いた春、浜の年寄りとして何かしたいと思った。', [
  ['ami', '浜辺で網の繕い方を若い者に教える', { tie: 1, learn: 1 }, '若い者の指が少しずつ速くなった。'],
  ['inori', '浜の小さな堂へ海の無事を祈りに通う', { sat: 1, body: -1 }, '毎朝、坂道を上って手を合わせた。']]);
// 町（国府・港町）
c('h1.t.ichi', 'small', [1000, 1332], [6, 14], w({ kind: ['town'], ind: ['shop', 'craft'] }), '市の立つ日、{dad}が筵を広げて品を並べている。', [
  ['uru', '筵の上の品を通る人に勧める', { learn: 1, tie: 1 }, '声を張るこつが少しわかった。'],
  ['kugutsu', '市の隅で傀儡の芸に見入る', { sat: 2, learn: -1 }, '人形の動きが夢にまで出てきた。']]);
c('h1.t.kaji', 'small', [1000, 1332], [15, 29], w({ kind: ['town'], ind: ['craft'] }), '鍬や鎌を打つ鍛冶の親方が、弟子にならないかと声をかけてきた。', [
  ['deshi', '鍛冶場に住み込んで槌を振る', { learn: 2, body: -1 }, '火の色で鉄の具合を見分けられるようになった。'],
  ['ie', '誘いを断って家の仕事を続ける', { tie: 1, learn: -1 }, '{mom}のそばで変わらない日々を送った。']]);
c('h1.t.kokushi', 'small', [1000, 1250], [30, 59], w({ kind: ['town'], ind: ['office'] }), '新しい国司が都から下ってきた。国府に勤める身として何に力を入れるか。', [
  ['kenden', '検田の帳面を細かく改める', { learn: 1, sat: -1 }, '帳面の誤りをいくつも見つけた。'],
  ['utage', '国司を迎える宴の支度を引き受ける', { tie: 2, body: -1 }, '宴が終わるころには国司に名を覚えられていた。']]);
c('h1.t.toimaru', 'small', [1200, 1332], [30, 59], w({ kind: ['town'], ind: ['shop'] }), '港の問丸が、年貢米を預かって運ぶ商いに加わらないかと誘ってきた。', [
  ['kura', '問丸と組んで蔵を借りる', { sat: 2, tie: -1 }, '蔵に米俵が積み上がっていった。'],
  ['mise', '店先の小商いのまま続ける', { body: 1, sat: -1 }, '朝から夕まで同じ店先に立ち続けた。']]);
c('h1.t.zeni', 'small', [1150, 1332], [60, 110], w({ kind: ['town'], ind: ['home'] }), '長年ためてきた宋銭の使い道を考えた。', [
  ['kane', '寺の鐘を鋳る勧進に宋銭を寄せる', { sat: 2 }, '鐘の音を聞くたびに胸が温かくなった。'],
  ['yome', '孫の嫁入り支度に回す', { tie: 2, sat: -1 }, '孫が何度も礼を言いに来た。']]);
// 大きな町（京・鎌倉）
c('h1.c.goryo', 'small', [1000, 1332], [6, 14], w({ kind: ['city'], ind: ['home'] }), '疫病よけの御霊会の日、大路に神輿の行列がやってきた。', [
  ['follow', '大路で神輿の行列を追いかける', { sat: 2, body: -1 }, '人波にもまれて足が棒になった。'],
  ['yane', '{mom}と築地のそばから見物する', { tie: 1, body: 1 }, '{mom}が行列の名前を一つずつ教えてくれた。']]);
c('h1.c.kasagake', 'small', [1192, 1332], [15, 29], w({ kind: ['city'], ind: ['bushi'], sex: 'm' }), '鎌倉で主に仕える身となり、笠懸の稽古に誘われた。', [
  ['yumi', '弓を手に朝から馬場へ通う', { body: 1, learn: 1 }, '的を射抜く音が少しずつ増えた。'],
  ['uta', '和歌の集まりに顔を出す', { learn: 2, body: -1 }, '歌を一首ほめられた。']]);
c('h1.c.nyobo', 'small', [1000, 1200], [15, 29], w({ kind: ['city'], ind: ['office'], sex: 'f' }), '女房として仕える姫君から、物語の書き写しを頼まれた。', [
  ['shosha', '夜ふけまで物語を書き写す', { learn: 2, body: -1 }, '灯の下で物語の続きに夢中になった。'],
  ['utaawase', '同輩の女房たちと歌合の支度をする', { tie: 2, learn: -1 }, '同輩と笑い合いながら几帳を整えた。']]);
c('h1.c.ougi', 'small', [1000, 1332], [30, 59], w({ kind: ['city'], ind: ['craft'] }), '扇の注文が一度にたくさん入った。', [
  ['yonabe', '弟子と夜なべで扇を折る', { sat: 1, body: -2 }, '目をこすりながら期日に間に合わせた。'],
  ['nakama', '腕の確かな職人仲間に半分頼む', { tie: 1, sat: -1 }, '仲間との行き来が前より増えた。']]);
c('h1.c.shukke', 'small', [1000, 1332], [60, 110], w({ kind: ['city'], ind: ['home'] }), '老いを感じ、出家して仏の道に入る者が身の回りにも増えてきた。', [
  ['nenbutsu', '髪を下ろして念仏に励む', { sat: 2, tie: -1 }, '朝夕の念仏が日々の支えになった。'],
  ['mago', '家にとどまり孫の世話を続ける', { tie: 2, body: -1 }, '孫に昔の都の話を聞かせた。']]);
// 大きな出来事
// 寛喜の飢饉
c('h1.e.kanki', 'small', [1230, 1232], [30, 59], w({ kind: ['village'], ind: ['farm'], ev: 'famine' }), '夏が冷えて稲が実らず、家の米が尽きかけている。', [
  ['kuzu', '山に入って葛やわらびの根を掘る', { body: -2, sat: 1 }, '泥だらけの根で何日かをしのいだ。'],
  ['tane', '名主に頭を下げて種籾を借りる', { tie: -2, body: 1 }, '借りを抱えて春を迎えた。']]);
// 源平の争乱
c('h1.e.genpei', 'small', [1180, 1185], [15, 29], w({ kind: ['village', 'town'], ind: ['farm', 'shop', 'craft', 'home'], ev: 'war' }), '戦のための兵糧米を集めに、武者たちがやってきた。', [
  ['dasu', '蓄えの米を武者に差し出す', { sat: -2, body: 1 }, '武者たちは何事もなく去っていった。'],
  ['kakusu', '米俵を裏山の洞に隠す', { sat: 1, body: -1, tie: -1 }, '夜のうちに俵を運び、息をひそめて過ごした。']]);
// 疱瘡の流行（寛仁四年）
c('h1.e.hoso', 'small', [1020, 1021], [6, 14], w({ kind: ['town', 'city'], ind: ['home'], ev: 'epidemic' }), '近所の家で疱瘡が出たと聞いた。', [
  ['komoru', '{mom}に言われて家にこもる', { body: 1, sat: -1 }, '戸の内でひと月を過ごした。'],
  ['harae', '疫病よけのお祓いに連れて行ってもらう', { tie: 1, body: -1 }, '人込みの中で手を合わせた。']]);
// 安元の大火・治承の大火
c('h1.e.taika', 'small', [1177, 1178], [60, 110], w({ kind: ['city'], ind: ['shop', 'craft', 'office', 'home'], pref: ['26', '25', '27', '29'], ev: 'fire' }), '京の東南から出た火が、強い風にあおられて燃え広がってきた。', [
  ['nigeru', '孫の手を引いて大路へ逃れる', { body: 1, sat: -1 }, '振り返ると家のあたりが赤く染まっていた。'],
  ['mizu', '隣の者と屋根に水をかけて火の粉を払う', { tie: 2, body: -2 }, '煙にむせながら夜明けまで桶を回した。']]);
// 室町・戦国 [1333,1602] の小さな選択
// --- 村 ---
c('h2.v.nae', 'small', [1333, 1602], [6, 14], w({ kind: ['village'], ind: ['farm'] }), '田植えの日、子どもも苗を運ぶ役を言いつけられた。', [
  ['carry', '苗の束を抱えて畦を何度も往復する', { body: 1, tie: 1 }, '泥だらけになったが、大人たちにほめられた。'],
  ['frog', '畦のカエルを追いかけて遊ぶ', { sat: 2, tie: -1 }, '楽しかったが、あとで{dad}に叱られた。']]);
c('h2.v.yoriai', 'small', [1333, 1602], [15, 29], w({ kind: ['village'], ind: ['farm'], sex: 'm' }), '村の寄り合いに初めて呼ばれた。用水の分け方で年寄りたちがもめている。', [
  ['listen', '末席で年寄りの言い分を聞き覚える', { learn: 2, sat: -1 }, '村の掟がどう決まるのか、少しわかった。'],
  ['speak', '下の田の者として水が足りないと声を上げる', { sat: 1, tie: -1 }, '若いのに出しゃばると言われたが、水は少し回ってきた。']]);
c('h2.v.saotome', 'small', [1333, 1602], [15, 29], w({ kind: ['village'], ind: ['farm'], sex: 'f' }), '田植えの早乙女に選ばれた。笛や太鼓に合わせて歌いながら植えるという。', [
  ['sing', '声を張って田植え歌を先導する', { tie: 2, body: -1 }, '歌が評判になり、ほかの家の娘とも親しくなった。'],
  ['plant', '歌は皆に任せて、苗をまっすぐ植えることに励む', { body: 1, learn: 1 }, '列のそろった田を見て、年寄りがうなずいた。']]);
c('h2.v.ikki', 'small', [1428, 1530], [30, 59], w({ kind: ['village'], ind: ['farm'] }), '借銭の帳消しを求めて、近くの村々が一揆を結ぶという。{place}からも人が出る。', [
  ['join', '鍬を持って一揆の列に加わる', { tie: 2, body: -2 }, '土倉に押しかけ、借銭の証文が破られた。'],
  ['stay', '家に残って田の水を見張る', { body: 1, tie: -1 }, '戻った者たちから、腰抜けと陰口をたたかれた。'],
  ['food', '出ていく者たちに握り飯を持たせる', { tie: 1, sat: -1 }, '蓄えは減ったが、皆に感謝された。']]);
c('h2.v.irori', 'small', [1333, 1602], [60, 110], w({ kind: ['village'], ind: ['home'] }), '囲炉裏端で、孫が昔のいくさの話をせがんできた。', [
  ['tell', '村が焼かれた年のことを話して聞かせる', { tie: 1, sat: -1 }, '話すうちに胸が詰まったが、孫は黙って聞いていた。'],
  ['straw', '話はせずに、わらじの編み方を教える', { learn: 1, tie: 1 }, '孫は小さな手で、不格好なわらじを一足編み上げた。']]);
// --- 浜の村 ---
c('h2.f.ami', 'small', [1333, 1602], [6, 14], w({ kind: ['fish'], ind: ['fish'] }), '浜で大人たちが破れた網を繕っている。', [
  ['mend', '網の目の結び方を習う', { learn: 2, sat: -1 }, '指が痛くなったが、結び目を一つ覚えた。'],
  ['shell', '岩場で貝を拾って夕飯の足しにする', { body: 1, sat: 1 }, '籠いっぱいの貝を持ち帰り、{mom}が喜んだ。']]);
c('h2.f.oki', 'small', [1333, 1602], [15, 29], w({ kind: ['fish'], ind: ['fish'], sex: 'm' }), '初めて沖の漁に連れて行かれた。波が高く、舟が大きく揺れる。', [
  ['oar', '吐き気をこらえて櫓をこぎ続ける', { body: 1, tie: 1 }, '浜に戻ると、船頭に一人前の顔になったと言われた。'],
  ['lie', '舟底に伏せて揺れが収まるのを待つ', { body: -1, sat: -1 }, 'しばらく仲間にからかわれた。']]);
c('h2.f.ura', 'small', [1333, 1602], [30, 59], w({ kind: ['fish'], ind: ['fish'] }), '隣の浦の舟が、こちらの漁場に入って網を入れていた。', [
  ['argue', '浦の者を集めて談判に行く', { tie: 1, body: -1 }, '言い合いの末、境の岩を決め直すことになった。'],
  ['share', '魚の多い年だからと黙って分け合う', { sat: 1, tie: -1 }, '浦の若い者たちは不満そうだった。']]);
c('h2.f.himono', 'small', [1333, 1602], [30, 59], w({ kind: ['fish'], ind: ['fish'], sex: 'f' }), '干した魚がたくさんできた。山の村の市まで売りに行けば米と換えられる。', [
  ['walk', '干物を背負って峠を越える', { sat: 2, body: -1 }, '米と布を手に入れて、日暮れに浜へ帰り着いた。'],
  ['keep', '冬の蓄えとして家に置いておく', { body: 1, sat: -1 }, '冬のあいだ、干物で食いつないだ。']]);
c('h2.f.sora', 'small', [1333, 1602], [60, 110], w({ kind: ['fish'], ind: ['fish'] }), '夜明け前、若い者たちが漁に出ようとしている。西の空の雲が気になる。', [
  ['warn', '今日は出るなと引き止める', { tie: 1, sat: 1 }, '昼過ぎに海が荒れ、若い者たちに頭を下げられた。'],
  ['quiet', '年寄りの口出しは控えて見送る', { tie: -1, sat: -1 }, '舟は無事に戻ったが、気が気ではなかった。']]);
// --- 町 ---
c('h2.t.fuigo', 'small', [1333, 1602], [6, 14], w({ kind: ['town'], ind: ['craft'] }), '鍛冶をしている家で、ふいごを押す手伝いを頼まれた。', [
  ['push', '息を合わせて火を絶やさぬよう押し続ける', { learn: 1, body: 1 }, '親方に、筋がいいと言われた。'],
  ['sparks', '飛び散る火花に見とれて手を止める', { sat: 1, learn: -1 }, '火が弱まり、親方にどなられた。']]);
c('h2.t.rakuichi', 'small', [1549, 1602], [15, 29], w({ kind: ['town'], ind: ['shop'] }), '城下に楽市が立ち、座に入っていない者でも商えるようになった。', [
  ['open', '新しい市に小さな店を出す', { sat: 2, tie: -1 }, '客がつき、古い座の商人ににらまれた。'],
  ['za', '昔から世話になった座の商人のもとで働き続ける', { tie: 1, sat: -1 }, '儲けは少ないが、座の仲間に信頼された。']]);
c('h2.t.monzen', 'small', [1333, 1602], [30, 59], w({ kind: ['town'], ind: ['priest'] }), '門前町の寺で大きな法会があり、参詣の人が大勢やってくる。', [
  ['guide', '遠くから来た参詣人を宿坊へ案内する', { tie: 2, body: -1 }, '足は棒になったが、寄進が多く集まった。'],
  ['sutra', '本堂にこもって経をあげ続ける', { learn: 1, sat: 1 }, '声がかれるまで読経して、気持ちが澄んだ。']]);
c('h2.t.yashiki', 'small', [1568, 1602], [30, 59], w({ kind: ['town'], ind: ['bushi'], sex: 'm' }), '殿の命で、村の屋敷を出て城下に住むよう言い渡された。', [
  ['move', '家族を連れて城下の屋敷に移る', { tie: 1, sat: -1 }, '城に近くなったが、先祖の土地とは離れた。'],
  ['delay', '田の取り入れが済むまで移るのを延ばしてもらう', { sat: 1, tie: -1 }, '願いは通ったが、上役の機嫌を損ねた。']]);
c('h2.t.yuzuru', 'small', [1333, 1602], [60, 110], w({ kind: ['town'], ind: ['shop'], sex: 'm' }), '店の切り盛りを{child}に任せる時が来たように思う。', [
  ['hand', '帳面も鍵もすべて{child}に渡す', { sat: 1, tie: 1 }, '肩の荷が下り、縁側で過ごす日が増えた。'],
  ['watch', '店先に座って客の相手だけは続ける', { tie: 1, body: -1 }, '古いなじみの客が、会いに来てくれた。']]);
// --- 大きな町 ---
c('h2.c.yamahoko', 'small', [1500, 1602], [6, 14], w({ kind: ['city'], ind: ['home'], pref: ['26', '25', '27', '29'] }), '祇園会が戻り、町内で山鉾を出すことになった。子どもも綱を引けるという。', [
  ['rope', '大人に混じって山鉾の綱を引く', { tie: 2, body: -1 }, '人波にもまれて、町の一員になった気がした。'],
  ['roof', '屋根に上がって行列を眺める', { sat: 2, body: -1 }, '降りるときにすべって、ひざをすりむいた。']]);
c('h2.c.nishijin', 'small', [1480, 1602], [15, 29], w({ kind: ['city'], ind: ['craft'], pref: ['26', '25', '27', '29'] }), '西陣の織屋で、新しい織り方を覚えないかと言われた。', [
  ['weave', '夜遅くまで機の前に座って練習する', { learn: 2, body: -1 }, '細かな文様が、少しずつ織れるようになった。'],
  ['plain', '慣れた無地の織物を手早く仕上げる', { sat: 1, learn: -1 }, '手間賃は確かに入ったが、腕は伸びなかった。']]);
c('h2.c.dosou', 'small', [1333, 1573], [30, 59], w({ kind: ['city'], ind: ['shop'] }), '仕入れの銭が足りない。土倉に行けば品物を質に銭を借りられる。', [
  ['pawn', '着物を質に入れて銭を借りる', { sat: 1, body: -1 }, '品は仕入れられたが、利息の支払いに追われた。'],
  ['small', '仕入れを減らして手持ちの銭でやりくりする', { sat: -1, learn: 1 }, '売り上げは減ったが、借りのない身は気楽だった。']]);
c('h2.c.bugyo', 'small', [1338, 1573], [15, 29], w({ kind: ['city'], ind: ['office'], sex: 'm' }), '幕府の奉行人のもとで、訴えの書類を清書する役についた。', [
  ['copy', '一字も誤らぬよう夜まで清書を重ねる', { learn: 2, body: -1 }, '文字が上達し、奉行人に名を覚えられた。'],
  ['ask', '先輩の書役に古い訴えの例を教わる', { tie: 2, learn: -1 }, '先輩と親しくなり、酒席にも呼ばれるようになった。']]);
c('h2.c.furyu', 'small', [1333, 1602], [60, 110], w({ kind: ['city'], ind: ['home'] }), '盆の夜、町の辻で若い者たちが風流踊りを踊っている。', [
  ['dance', '輪に加わって昔覚えた踊りを踊る', { sat: 2, body: -1 }, '若い者たちが手をたたいて、輪が大きくなった。'],
  ['sit', '軒先に腰かけて手拍子だけ打つ', { tie: 1, body: 1 }, '隣の家の年寄りと、昔の盆の話をした。']]);
// --- 大きな出来事 ---
c('h2.e.kassen', 'small', [1467, 1590], [15, 29], w({ kind: ['village'], ind: ['farm'], ev: 'war', sex: 'm' }), '近くで合戦があり、領主から足軽として出るよう触れが回ってきた。', [
  ['go', '槍を担いで陣に加わる', { tie: 1, body: -2 }, '傷を負ったが、生きて村に帰った。'],
  ['hide', '山の小屋に身を隠して戦が過ぎるのを待つ', { body: 1, tie: -2 }, '戦は終わったが、村での立場は悪くなった。']]);
c('h2.e.kansho', 'small', [1460, 1461], [60, 110], w({ kind: ['village'], ind: ['farm'], ev: 'famine' }), '日照りと長雨で米がとれず、村に食べる物がなくなってきた。', [
  ['roots', '山に入って葛や蕨の根を掘る', { body: 1, sat: -1 }, '少しの根で、家の者を食いつながせた。'],
  ['give', '自分の分を減らして孫に食べさせる', { tie: 2, body: -2 }, 'やせ細ったが、孫は冬を越した。']]);
c('h2.e.ekibyo', 'small', [1420, 1421], [6, 14], w({ kind: ['town', 'city'], ind: ['home'], ev: 'epidemic' }), '飢えに続いて疫病がはやり、町の通りに病人があふれた。', [
  ['inside', '家の奥にこもって外に出ない', { body: 1, sat: -1 }, '退屈だったが、病にはかからなかった。'],
  ['water', '寝込んだ{mom}の枕元で水を運ぶ', { tie: 2, body: -1 }, '{mom}は持ち直し、そのあと自分も熱を出した。']]);
c('h2.e.hokke', 'small', [1536, 1536], [15, 29], w({ kind: ['city'], ind: ['shop', 'craft', 'home'], ev: 'fire', pref: ['26', '25', '27', '29'] }), '寺どうしの争いから下京に火がつき、町が燃え広がっている。', [
  ['goods', '店の品を担げるだけ担いで逃げる', { sat: 1, body: -1 }, '品の一部は残ったが、煙で喉を痛めた。'],
  ['neighbor', '逃げ遅れた隣の年寄りの手を引いて走る', { tie: 2, sat: -1 }, '家財は失ったが、隣の家に深く感謝された。']]);
// 江戸 [1603,1867] 村
c('h3.v.kid1', 'small', [1603, 1867], [6, 14], w({ kind: ['village'], ind: ['farm'] }), '夏の田で、{dad}に草取りを手伝えと言われた。', [
  ['pull', '泥に入って草を抜く', { body: 1, tie: 1 }, '日暮れまで{dad}と並んで草を抜いた。'],
  ['nap', 'あぜの木陰で昼寝をする', { body: 1, tie: -1 }, 'こっそり木陰で眠り、あとで叱られた。']]);
c('h3.v.kid2', 'small', [1750, 1867], [6, 14], w({ kind: ['village'], ind: ['farm', 'home'] }), '庄屋の家で開かれる手習いに通わないかと誘われた。', [
  ['go', '筆と紙を持って通う', { learn: 2, sat: -1 }, 'いろはを覚え、自分の名を書けるようになった。'],
  ['work', '{sibYounger}の子守りを続ける', { tie: 1, learn: -1 }, '{sibYounger}を背負って、家の手伝いを続けた。']]);
c('h3.v.young', 'small', [1603, 1867], [15, 29], w({ kind: ['village'], ind: ['farm'], sex: 'm' }), '若者組に入る年になり、祭りの支度を任された。', [
  ['drum', '太鼓の稽古に励む', { tie: 2, body: -1 }, '夜ごと稽古を重ね、祭りの日に太鼓を打った。'],
  ['skip', '田の仕事を理由に断る', { sat: 1, tie: -2 }, '仲間から少し距離を置かれるようになった。']]);
c('h3.v.mid', 'small', [1603, 1867], [30, 59], w({ kind: ['village'], ind: ['farm'] }), '不作の年で、年貢の米がそろわない。', [
  ['delay', '庄屋に頼んで納めるのを待ってもらう', { tie: -1, sat: 1 }, '頭を下げ、秋の終わりまで待ってもらった。'],
  ['sell', '蓄えていた着物を売って米を買う', { sat: -2, tie: 1 }, '着物を手放し、どうにか年貢を納めた。']]);
c('h3.v.old', 'small', [1603, 1867], [60, 110], w({ kind: ['village'], ind: ['farm'], sex: 'm' }), '家督を{child}に譲る頃合いではないかと言われた。', [
  ['retire', '家督を譲って隠居する', { sat: 1, tie: 1 }, '{child}に家を任せ、縄をないながら暮らした。'],
  ['lead', 'まだ田に出て指図を続ける', { body: -1, sat: 2 }, '腰を痛めながらも、田の仕事を指図し続けた。']]);
// 浜の村
c('h3.f.kid', 'small', [1603, 1867], [6, 14], w({ kind: ['fish'], ind: ['fish'] }), '浜で、ほつれた網を繕う{dad}のそばに座った。', [
  ['mend', '網針の使い方を教わる', { learn: 2, tie: 1 }, '小さな手で、網の目を一つずつ結んでみた。'],
  ['dive', '磯に潜って貝を探す', { body: 2, learn: -1 }, '岩の間で貝を拾い、日焼けして帰った。']]);
c('h3.f.young.m', 'small', [1603, 1867], [15, 29], w({ kind: ['fish'], ind: ['fish'], sex: 'm' }), '初めて沖の漁の舟に乗らないかと声をかけられた。', [
  ['board', '櫓をこぐ役で舟に乗る', { body: -1, tie: 2 }, '波に揺られながら、仲間と網を引いた。'],
  ['shore', '浜で魚を干す仕事にとどまる', { body: 1, tie: -1 }, '浜に残り、干物作りを手伝った。']]);
c('h3.f.young.f', 'small', [1603, 1867], [15, 29], w({ kind: ['fish'], ind: ['fish'], sex: 'f' }), 'とれた魚を籠に入れ、近くの村へ売りに行くことになった。', [
  ['carry', '籠を頭にのせて売り歩く', { body: -1, sat: 2 }, '峠を越えて、魚を米や野菜に換えてきた。'],
  ['dry', '浜で干物にしてから売る', { learn: 1, sat: -1 }, '日持ちする干物を作り、少しずつ売った。']]);
c('h3.f.mid', 'small', [1603, 1867], [30, 59], w({ kind: ['fish'], ind: ['fish'] }), '時化が続き、何日も舟を出せない。', [
  ['net', 'この間に新しい網を編む', { learn: 1, sat: 1 }, '時化のあいだに、丈夫な網を編み上げた。'],
  ['out', '雲の切れ間に舟を出す', { body: -2, sat: 2 }, '荒れた海から、わずかな魚を持ち帰った。'],
  ['pray', '浜の祠にお参りする', { tie: 1, sat: -1 }, '{spouse}と祠に手を合わせ、海が静まるのを待った。']]);
c('h3.f.old', 'small', [1603, 1867], [60, 110], w({ kind: ['fish'], ind: ['fish', 'home'] }), '孫たちに、海の話をしてほしいとせがまれた。', [
  ['tell', '若いころの大漁の話をする', { tie: 2 }, '夜更けまで、大漁の日の話をした。'],
  ['teach', '潮と風の見分け方を教える', { learn: 1, sat: 1 }, '雲と風の様子から天気を知るこつを、孫に教えた。']]);
// 町
c('h3.t.kid', 'small', [1700, 1867], [6, 14], w({ kind: ['town'], ind: ['shop', 'craft'] }), '{mom}に連れられて、町の寺子屋に入ることになった。', [
  ['brush', '毎日欠かさず手習いに通う', { learn: 2, sat: -1 }, '師匠の手本をなぞり、字がきれいになった。'],
  ['play', '{friend}と抜け出して川で遊ぶ', { sat: 2, learn: -1 }, '{friend}と川で遊び、師匠に叱られた。']]);
c('h3.t.young.shop', 'small', [1603, 1867], [15, 29], w({ kind: ['town'], ind: ['shop'], sex: 'm' }), '商家での丁稚奉公がつらく、家に帰りたくなった。', [
  ['stay', '番頭に叱られても店に残る', { learn: 2, sat: -1 }, '算盤を覚え、手代に上がる道が見えてきた。'],
  ['home', '藪入りで家に帰り、{mom}に泣きつく', { tie: 2, learn: -1 }, '{mom}に励まされ、また店へ戻った。']]);
c('h3.t.young.craft', 'small', [1603, 1867], [15, 29], w({ kind: ['town'], ind: ['craft'], sex: 'm' }), '大工の親方のもとで、ようやく鉋を持たせてもらえた。', [
  ['plane', '夜遅くまで鉋がけを練習する', { learn: 2, body: -1 }, '薄く長い削りくずが出せるようになった。'],
  ['drink', '兄弟子に誘われて飲みに行く', { tie: 2, learn: -1 }, '兄弟子たちと酒を飲み、打ち解けた。']]);
c('h3.t.mid', 'small', [1603, 1867], [30, 59], w({ kind: ['town'], ind: ['shop'] }), '盆の掛け取りで、今は払えないという客がいた。', [
  ['wait', '暮れまで待つことにする', { tie: 2, sat: -1 }, 'その客は暮れに、礼を言って払いに来た。'],
  ['press', '今日中に払ってもらう', { sat: 1, tie: -2 }, '代金は取れたが、その客は店に来なくなった。']]);
c('h3.t.old', 'small', [1650, 1867], [60, 110], w({ kind: ['town'], ind: ['home'] }), '隠居したところ、町内の俳諧の会に誘われた。', [
  ['haikai', '句を作って会に出る', { learn: 1, tie: 2 }, '季語を探して町を歩き、句を出した。'],
  ['flower', '家で朝顔の鉢を育てる', { sat: 2, tie: -1 }, '朝顔の鉢を並べ、静かに暮らした。']]);
// 大きな町
c('h3.ci.kid', 'small', [1603, 1867], [6, 14], w({ kind: ['city'], ind: ['home'] }), '町内の祭りで、山車を引く子どもが集められていた。', [
  ['float', '綱を握って山車を引く', { tie: 2, body: -1 }, '大人に混じり、声を張り上げて綱を引いた。'],
  ['candy', '飴を買って道ばたで眺める', { sat: 2, tie: -1 }, '飴をなめながら、通り過ぎる山車を眺めた。']]);
c('h3.ci.young.f', 'small', [1603, 1867], [15, 29], w({ kind: ['city'], ind: ['home', 'shop', 'craft'], sex: 'f' }), '大きな商家へ女中奉公に出る話が来た。', [
  ['serve', '行儀見習いを兼ねて奉公に出る', { learn: 2, tie: -1 }, '台所仕事や取り次ぎを覚え、言葉づかいが変わった。'],
  ['sewhome', '家で仕立ての内職を続ける', { tie: 1, sat: 1 }, '家で針を動かし、{mom}を助けた。']]);
c('h3.ci.mid.office', 'small', [1603, 1867], [30, 59], w({ kind: ['city'], ind: ['office'], sex: 'm' }), '町名主の下で書役を務め、人別帳の書き直しを頼まれた。', [
  ['night', '夜まで残って書き上げる', { learn: 1, body: -1 }, '灯りの下で、一軒ずつ名を写した。'],
  ['share', '若い手伝いに一部を任せる', { tie: 1, sat: 1 }, '手伝いの若者に書き方を教えながら仕上げた。']]);
c('h3.ci.mid.craft', 'small', [1603, 1867], [30, 59], w({ kind: ['city'], ind: ['craft'] }), '注文が増え、弟子をとるかどうか考えた。', [
  ['take', '近所の子を弟子にとる', { tie: 2, sat: -1 }, '手のかかる弟子だったが、少しずつ育った。'],
  ['alone', '一人で仕事を続ける', { sat: 1, body: -1 }, '夜なべをして、注文をこなした。']]);
c('h3.ci.old', 'small', [1603, 1867], [60, 110], w({ kind: ['city'], ind: ['home'] }), '長屋の井戸端で、若いおかみさんたちに声をかけられた。', [
  ['chat', '昔の町の様子を話して聞かせる', { tie: 2 }, 'すっかり町の物知りとして頼られるようになった。'],
  ['fair', '寺の縁日に一人で出かける', { sat: 1, body: 1 }, '縁日の人ごみを歩き、植木を一鉢買った。']]);
// 大きな出来事
c('h3.ev.famine', 'small', [1782, 1787], [30, 59], w({ kind: ['village'], ind: ['farm'], ev: 'famine' }), '天明の飢饉で、蔵の米が尽きかけた。', [
  ['share', '残りの米を隣の家と分け合う', { tie: 2, body: -1 }, '粥を薄くして、隣の家にも分けた。'],
  ['roots', '山へ葛の根を掘りに行く', { body: 1, sat: -1 }, '葛の根を掘り、粉にして食べた。'],
  ['leave', '町へ出稼ぎに出る', { sat: 1, tie: -2 }, '家族を残して町へ出て、日雇いの仕事についた。']]);
c('h3.ev.fire', 'small', [1657, 1657], [15, 29], w({ kind: ['city'], ind: ['shop', 'craft', 'home'], pref: ['13'], ev: 'fire' }), '明暦の大火で、火の粉がこちらの町へ飛んできた。', [
  ['run', '家財をあきらめて身一つで逃げる', { body: 1, sat: -2 }, '着の身着のまま逃げ、命は助かった。'],
  ['cart', '荷車に家財を積んで逃げる', { sat: 1, body: -2 }, '混み合う道で荷車が動かず、やけどを負った。']]);
c('h3.ev.quake', 'small', [1854, 1855], [6, 14], w({ kind: ['town', 'city'], ind: ['home'], ev: 'quake' }), '夜、大きな地震で家が揺れ、壁が崩れた。', [
  ['outside', '{sibYounger}の手を引いて外へ出る', { body: 1, tie: 1 }, '{sibYounger}と通りへ飛び出し、無事だった。'],
  ['pillar', '柱のそばで身を伏せる', { body: -1, learn: 1 }, '揺れがおさまるまで、柱にしがみついた。']]);
c('h3.ev.epidemic', 'small', [1858, 1858], [60, 110], w({ kind: ['town', 'city'], ind: ['home'], ev: 'epidemic' }), 'ころりという病がはやり、近所でも倒れる人が出た。', [
  ['shut', '戸を閉めて家にこもる', { body: 1, tie: -1 }, '人と会わずに過ごし、病をまぬかれた。'],
  ['nurse', '倒れた隣人の世話に通う', { tie: 2, body: -2 }, '看病を続けるうち、自分も腹をこわした。'],
  ['charm', '寺社のお札を戸口に貼る', { sat: 1 }, '戸口にお札を貼り、少し気持ちが落ち着いた。']]);
// 武士の娘
c('h3.b.kid1', 'small', [1603, 1867], [6, 14], w({ kind: ['town', 'city'], ind: ['bushi'], sex: 'f', status: ['bushi'] }), '{mom}から、家で手習いの手本を写すように言われた。', [
  ['copy', '歌の手本を丁寧に書き写す', { learn: 2, sat: -1 }, '百人一首の歌を、一首ずつ清書した。'],
  ['yard', '庭に出て{sibYounger}と遊ぶ', { sat: 1, tie: 1 }, '庭で遊んでいたところを、{mom}に見つかった。']]);
c('h3.b.kid2', 'small', [1603, 1867], [6, 14], w({ kind: ['town', 'city'], ind: ['bushi'], sex: 'f', status: ['bushi'] }), '初めて針を持たされ、雑巾を縫うことになった。', [
  ['sew', '針目をそろえて一人で縫い上げる', { learn: 1, sat: 1 }, '指を刺しながらも、雑巾を一枚縫い上げた。'],
  ['ask', '{sibOlder}に手を添えてもらう', { tie: 2 }, '{sibOlder}に手を添えてもらい、運針を覚えた。']]);
c('h3.b.young1', 'small', [1603, 1867], [15, 29], w({ kind: ['town', 'city'], ind: ['bushi'], sex: 'f', status: ['bushi'] }), '嫁入りの前に、茶の湯と礼法を身につけることになった。', [
  ['tea', '師匠の家へ茶の湯の稽古に通う', { learn: 2, sat: -1 }, '袱紗のさばき方を、何度も繰り返した。'],
  ['manner', '{mom}から家の作法を習う', { tie: 2, learn: 1 }, '客の迎え方や手紙の書き方を、{mom}から教わった。']]);
c('h3.b.young2', 'small', [1603, 1867], [15, 29], w({ kind: ['town', 'city'], ind: ['bushi'], sex: 'f', status: ['bushi'] }), '藩の奥向きへ奉公に上がらないかという話が来た。', [
  ['oku', '奥女中として御殿に上がる', { learn: 2, tie: -2 }, '厳しい御殿の暮らしで、行儀と言葉を身につけた。'],
  ['house', '家に残って家事を手伝う', { tie: 1, sat: 1 }, '{mom}を助けて、家の切り盛りを覚えた。']]);
// 明治〜戦中 [1868,1945] の小さな選択
// --- 村 ---
c('h4.v1', 'small', [1872, 1945], [6, 14], w({ kind: ['village'], ind: ['farm'] }), '田植えの日、{mom}から学校を休んで弟の子守りをしてほしいと言われた。', [
  ['school', '教科書を抱えて学校へ走る', { learn: 2, tie: -1 }, '先生に褒められたが、帰ると{mom}は黙っていた。'],
  ['sitter', '弟を背負ってあぜ道に立つ', { tie: 2, learn: -1 }, '泥だらけの手で、{mom}が頭をなでてくれた。']]);
c('h4.v2', 'small', [1880, 1930], [15, 29], w({ kind: ['village'], ind: ['farm'], sex: 'f' }), '町の製糸工場から、娘を女工に出さないかと人が来た。', [
  ['mill', '工場の寮へ入ると決める', { sat: 1, body: -2, tie: -1 }, '糸を繰る湯気の中で、指先が赤くふやけた。'],
  ['silk', '家に残って蚕の世話を続ける', { tie: 1, sat: -1 }, '桑を摘む手が、年ごとに速くなった。']]);
c('h4.v3', 'small', [1873, 1945], [30, 59], w({ kind: ['village'], ind: ['farm'] }), '金肥の大豆かすを買うか、草を刈って堆肥を作るかで迷った。', [
  ['buy', '借金をして大豆かすを買い入れる', { sat: 1, tie: -1 }, '秋の実りは良かったが、利息の払いに追われた。'],
  ['compost', '近所と山へ入って下草を刈り、堆肥を積む', { body: -2, tie: 1 }, '刈った草の山の前で、背中の痛みをこらえた。']]);
c('h4.v4', 'small', [1880, 1930], [60, 110], w({ kind: ['village'], ind: ['home'] }), '囲炉裏ばたで、孫が御一新の前の話をせがんだ。', [
  ['tell', '年貢を納めた頃の苦労を語って聞かせる', { tie: 2 }, '孫は目を丸くして聞き入った。'],
  ['bed', '炉の火を落として早めに床に就く', { body: 1, tie: -1 }, '夜明けまでぐっすりと眠った。']]);
c('h4.v5', 'small', [1889, 1945], [30, 59], w({ kind: ['village'], ind: ['farm'], sex: 'm' }), '寄り合いで、用水路の普請に出す人足の割り当てが話し合われた。', [
  ['offer', '自分の家から二人出すと申し出る', { tie: 2, body: -1 }, '寄り合いのあと、村長が肩をたたいた。'],
  ['less', '人手が足りないと言って一人で済ませてもらう', { sat: 1, tie: -1 }, '帰り道、誰とも口をきかなかった。']]);
// --- 浜の村 ---
c('h4.f1', 'small', [1868, 1945], [6, 14], w({ kind: ['fish'], ind: ['fish'] }), '浜に網が上がると、子どもも魚を運ぶように言われた。', [
  ['carry', '籠を抱えて浜を何度も往復する', { body: 1, tie: 1 }, '日が落ちるころ、{dad}が小魚を一匹持たせてくれた。'],
  ['shells', '岩場へ抜け出して貝を拾う', { sat: 1, tie: -1 }, '潮だまりで小さな蟹を何匹も見つけた。']]);
c('h4.f2', 'small', [1905, 1945], [15, 29], w({ kind: ['fish'], ind: ['fish'], sex: 'm' }), '網元が、発動機をつけた船に乗る若い衆を集めていた。', [
  ['engine', '発動機船の乗り子に名乗り出る', { sat: 2, body: -1 }, '沖へ出る距離がぐんと延び、油の匂いが体に染みた。'],
  ['oar', '櫓をこぐ親方の舟に残る', { tie: 2, sat: -1 }, '親方は何も言わず、櫓の握り方を教えてくれた。']]);
c('h4.f3', 'small', [1868, 1945], [30, 59], w({ kind: ['fish'], ind: ['fish'] }), '空が鉛色になったのに、沖の仲間の舟がまだ戻らない。', [
  ['rescue', '浜の者と舟を出して迎えに行く', { tie: 2, body: -2 }, '波をかぶりながら、仲間の舟を引いて戻った。'],
  ['beacon', '浜で火を焚いて目印にする', { tie: 1, sat: -1 }, '夜通し火を守り、明け方に帆が見えた。']]);
c('h4.f4', 'small', [1868, 1945], [15, 29], w({ kind: ['fish'], ind: ['fish', 'home'], sex: 'f' }), '朝に揚がった魚を、桶に入れて町へ売り歩かないかと誘われた。', [
  ['peddle', '桶を頭に載せて町の家々を回る', { sat: 2, body: -1 }, '帰りの桶は軽く、懐に銭が残った。'],
  ['mend', '浜に残って網のつくろいを手伝う', { tie: 1, learn: 1 }, '網目の結び方を、年寄りから教わった。']]);
c('h4.f5', 'small', [1868, 1945], [60, 110], w({ kind: ['fish'], ind: ['fish'] }), '目が弱り、沖へ出るのがつらくなってきた。', [
  ['teach', '孫に潮の具合と魚の寄る場所を教える', { tie: 2, sat: 1 }, '孫は雲の形で風を言い当てるようになった。'],
  ['onemore', 'もう一度だけ舟を出して沖の風に当たる', { sat: 2, body: -2 }, '櫓を置くと、手のひらが震えていた。']]);
// --- 町 ---
c('h4.t1', 'small', [1872, 1937], [6, 14], w({ kind: ['town'], ind: ['shop'] }), '店先で{dad}が、算盤の稽古をつけてやると言った。', [
  ['abacus', '帳場に座って珠をはじく', { learn: 2, sat: -1 }, '夕方には、足し算の珠が指に馴染んだ。'],
  ['koma', '路地の子らと独楽回しに出かける', { tie: 2, learn: -1 }, '日が暮れるまで独楽をぶつけ合った。']]);
c('h4.t2', 'small', [1872, 1945], [15, 29], w({ kind: ['town'], ind: ['craft'] }), '親方から、年季が明けたら独り立ちしてもよいと言われた。', [
  ['own', '小さな仕事場を借りて看板を出す', { sat: 2, tie: -1 }, '初めての注文の品を、夜なべして仕上げた。'],
  ['remain', '親方のもとでもう数年腕を磨く', { learn: 2, sat: -1 }, '親方の鉋さばきを、間近で盗み続けた。']]);
c('h4.t3', 'small', [1928, 1937], [30, 59], w({ kind: ['town'], ind: ['shop'] }), '向かいの店がラジオを置き、客がそちらに集まるようになった。', [
  ['radio', '借金をしてでも店にラジオを据える', { tie: 2, sat: -1 }, '相撲の中継の日には、店先に人垣ができた。'],
  ['price', '品の値を少し下げて客を呼び戻す', { sat: -2, tie: 1 }, '常連は戻ったが、帳面の残りは細った。']]);
c('h4.t4', 'small', [1868, 1945], [60, 110], w({ kind: ['town'], ind: ['shop', 'craft'] }), '隠居して、家業は{child}に任せることになった。', [
  ['advise', '毎朝帳場をのぞいて口を出す', { sat: 1, tie: -1 }, '{child}は苦い顔をしたが、言い返さなかった。'],
  ['bonsai', '裏の小さな庭で盆栽をいじって過ごす', { body: 1, tie: 1 }, '松の枝ぶりが少しずつ整った。']]);
c('h4.t5', 'small', [1872, 1945], [30, 59], w({ kind: ['town'], ind: ['office'] }), '町役場で、戸籍の帳簿を今夜のうちに書き写すよう言いつけられた。', [
  ['overtime', 'ランプをともして最後の一枚まで写す', { body: -1, tie: 1 }, '翌朝、上役が帳簿を黙って受け取った。'],
  ['gohome', '明日の朝に回して家へ帰る', { sat: 1, tie: -1 }, '{child}と夕飯を囲みながら、叱られる覚悟を決めた。']]);
// --- 大きな町 ---
c('h4.ci1', 'small', [1930, 1937], [6, 14], w({ kind: ['city'], ind: ['home'] }), '路地の角に、拍子木を鳴らして紙芝居屋が来た。', [
  ['ame', '一銭で水飴を買って前の列に座る', { sat: 2 }, '話の続きが気になって、なかなか寝つけなかった。'],
  ['tofu', '{mom}に頼まれた豆腐を買いに急ぐ', { tie: 1, sat: -1 }, '豆腐を崩さずに持ち帰り、褒められた。']]);
c('h4.ci2', 'small', [1900, 1937], [15, 29], w({ kind: ['city'], ind: ['office'] }), '勤め先の同僚に、休みの日に活動写真へ行こうと誘われた。', [
  ['movie', '誘いに乗って弁士の語りを聞きに行く', { sat: 2, tie: 1 }, '暗い小屋の中で、弁士の声に笑い転げた。'],
  ['night', '下宿で夜学の教科書を開く', { learn: 2, tie: -1 }, '灯の下で、英語の綴りを何度も書き写した。']]);
c('h4.ci3', 'small', [1912, 1937], [30, 59], w({ kind: ['city'], ind: ['craft'] }), '工場で、賃下げに反対する者たちから集まりに来ないかと声がかかった。', [
  ['join', '仕事のあとに集まりへ顔を出す', { tie: 2, sat: -1 }, '帰り道、知らない顔の男が後をつけてきた。'],
  ['refuse', '家族の暮らしを考えて誘いを断る', { sat: 1, tie: -1 }, '翌日から、その仲間とは目を合わせなくなった。']]);
c('h4.ci4', 'small', [1868, 1945], [60, 110], w({ kind: ['city'], ind: ['home'] }), '{child}から、近くに越してこないかと言われた。', [
  ['move', '荷をまとめて{child}の近くの長屋へ移る', { tie: 2, sat: -1 }, '孫が毎日のように顔を出した。'],
  ['stayhouse', '住み慣れた借家に残る', { sat: 1, tie: -1 }, '近所の顔なじみと縁側で茶を飲んだ。']]);
c('h4.ci5', 'small', [1910, 1937], [15, 29], w({ kind: ['city'], ind: ['shop', 'home'], sex: 'f' }), '百貨店の売り子を募る張り紙を見つけた。', [
  ['apply', '着物を整えて面接に行く', { sat: 2, body: -1 }, '立ち通しの売り場で、客に頭を下げ続けた。'],
  ['sew', '針仕事の腕をみがく', { learn: 1, sat: -1 }, '針目が細かくなり、頼まれる仕立てが増えた。']]);
// --- 関東大震災 1923 ---
c('h4.q1', 'small', [1923, 1923], [15, 59], w({ kind: ['city', 'town'], ind: ['home'], pref: ['13', '14', '11', '12', '22'], ev: 'quake' }), '昼どき、大きな揺れのあと、あちこちから火の手が上がった。', [
  ['flee', '家財を捨てて広い場所へ逃げる', { body: 1, sat: -2 }, '振り返ると、住んでいた町が煙に包まれていた。'],
  ['cart', '布団と行李を大八車に積んで逃げる', { sat: 1, body: -2 }, '人波に揉まれ、車を途中で手放した。']]);
c('h4.q2', 'small', [1923, 1923], [6, 14], w({ kind: ['city', 'town'], ind: ['home'], pref: ['13', '14', '11', '12', '22'], ev: 'quake' }), '焼け出されて、{mom}と小学校の校庭で夜を明かすことになった。', [
  ['search', '尋ね人の張り紙を一枚ずつ確かめて{dad}を探す', { tie: 2, body: -1 }, '夕方、人混みの向こうに{dad}の姿を見つけた。'],
  ['onigiri', '{mom}のそばで配られた握り飯を分け合う', { body: 1, sat: -1 }, '冷えた握り飯を、半分ずつ食べた。']]);
// --- スペインかぜ 1918-1920 ---
c('h4.e1', 'small', [1918, 1920], [30, 59], w({ kind: ['village', 'fish', 'town', 'city'], ind: ['home'], ev: 'epidemic' }), '流行り風邪で、隣の家の者が次々と寝込んだ。', [
  ['gruel', '粥を炊いて隣へ運ぶ', { tie: 2, body: -2 }, '三日目から、自分も熱を出して寝込んだ。'],
  ['mask', 'マスクをして戸を閉め、家の者を外へ出さない', { body: 1, tie: -1 }, '隣とは、窓越しに声をかけ合うだけになった。']]);
// --- 昭和の東北の凶作 1931-1934 ---
c('h4.fa1', 'small', [1931, 1934], [30, 59], w({ kind: ['village'], ind: ['farm'], pref: ['02', '03', '04', '05', '06', '07'], ev: 'famine' }), '冷たい夏で稲が実らず、娘を奉公に出さないかと口入れ屋が来た。', [
  ['keepdaughter', '大根葉と木の実でしのぐと決めて断る', { tie: 2, body: -2 }, '家族そろって、薄い雑炊をすすった。'],
  ['senddaughter', '前借りの金を受け取り、娘を町の奉公先へ出す', { sat: -2, body: 1 }, '汽車の窓で手を振る娘が、すぐに見えなくなった。']]);
// --- 戦時 1938-1945 ---
c('h4.s1', 'small', [1944, 1945], [6, 12], w({ kind: ['city', 'town'], ind: ['home'], ev: 'war' }), '国民学校で、田舎の親戚へ縁故疎開するか、学校ごとの集団疎開に加わるかを決めることになった。', [
  ['kin', '遠い親戚の家へ縁故疎開する', { body: 1, tie: -1 }, '知らない台所で、親戚のおばさんに頭を下げた。'],
  ['group', '級友と一緒に集団疎開の列に並ぶ', { tie: 1, sat: -1 }, '駅で、{mom}の顔が人波に隠れた。'],
  ['cling', '家に残って{mom}のそばにいたいと泣きつく', { tie: 2, body: -2 }, '{mom}は困った顔で、しばらく黙っていた。']]);
c('h4.s2', 'small', [1944, 1945], [6, 12], w({ kind: ['city', 'town'], ind: ['home'], ev: 'war' }), '疎開先の寺で{mom}に返事を書く。手紙は先生が中を確かめてから出すことになっている。', [
  ['brave', '「元気です」とだけ書いて出す', { tie: 1, sat: -1 }, '書き終えたあと、布団の中で少し泣いた。'],
  ['hungry', 'おなかがすいたと隅に小さく書き添える', { tie: 2, body: -1 }, '書き添えた一行は、先生に消されて戻ってきた。']]);
c('h4.s3', 'small', [1944, 1945], [6, 12], w({ kind: ['city', 'town'], ind: ['home'], ev: 'war' }), '疎開先で、地元の子に「疎開っ子」とはやされ、配られた芋を取られた。', [
  ['grab', '言い返して芋を取り返そうとする', { sat: 1, body: -1 }, '取っ組み合いになり、二人とも先生に叱られた。'],
  ['tell', '付き添いの先生に芋のことを伝える', { tie: 1, sat: -1 }, '次の日から、先生が芋を配る場に立ってくれた。'],
  ['beans', '家から届いた炒り豆を、その子に分けてやる', { tie: 2, body: -1 }, 'それからは、川で一緒に小魚を追うようになった。']]);
c('h4.s4', 'small', [1944, 1945], [6, 12], w({ kind: ['city', 'town'], ind: ['home'], ev: 'war' }), '疎開先のラジオで、自分の町が空襲で焼けたと知らされた。', [
  ['postcard', 'すぐにはがきを書いて家族の無事を尋ねる', { tie: 1, sat: -2 }, '返事が来るまで、毎日郵便の届く時刻を待った。'],
  ['hold', '同じ町から来た{friend}と手を握り合う', { tie: 2, sat: -1 }, '{friend}の手も、冷たく震えていた。'],
  ['faces', '布団の中で家族の顔を一人ずつ思い浮かべる', { sat: -1, body: -1 }, '眠れないまま、窓の外が白んだ。']]);
c('h4.w1', 'small', [1944, 1945], [15, 29], w({ kind: ['city', 'town'], ind: ['craft', 'home'], ev: 'war' }), '勤労動員で軍需工場に通う。灯火管制で、窓には黒い紙が張られている。', [
  ['lathe', '旋盤の前に立ち、部品を削り続ける', { learn: 1, body: -2 }, '油まみれの手で、夜の交代まで働いた。'],
  ['textbook', '休憩の合間に、隠し持った教科書を開く', { learn: 2, tie: -1 }, '監督に見つかり、きつく叱られた。']]);
c('h4.w2', 'small', [1942, 1945], [60, 110], w({ kind: ['city', 'town'], ind: ['home'], ev: 'war' }), '夜、空襲警報が鳴った。台所には配給の米がまだ一袋残っている。', [
  ['shelter', '米袋を抱えて庭の防空壕へ下りる', { body: 1, sat: -1 }, '壕の中で、近所の子が震えながら身を寄せてきた。'],
  ['stayhome', '足が弱いので家に残り、電灯に黒い布をかぶせる', { sat: 1, body: -1 }, '暗い部屋で、遠くの爆音を数えた。']]);
// ===== 戦後〜 [1946,2120] 小さな選択 =====
// --- village ---
c('h5.vil.nohanki', 'small', [1946, 1965], [6, 14], w({ kind: ['village'], ind: ['farm'] }), '田植えの季節になり、学校が農繁期の休みに入った。', [
  ['nae', '田んぼへ苗を運ぶ', { body: 1, tie: 1 }, '泥だらけになって苗の束を運び、{dad}にほめられた。'],
  ['komori', '家で{sibYounger}の子守りを引き受ける', { tie: 2, sat: -1 }, '一日じゅう背中に{sibYounger}をおぶって過ごした。'],
  ['kawa', '川へ小ブナを捕りに行く', { sat: 2, tie: -1 }, '{friend}とバケツいっぱいに魚を捕り、夕方に叱られた。']]);
c('h5.vil.shudan', 'small', [1955, 1975], [15, 29], w({ kind: ['village'], ind: ['farm', 'home'] }), '中学を出る春、都会の工場から集団就職の求人が届いた。', [
  ['ressha', '集団就職の列車に乗って都会へ出る', { learn: 2, tie: -2 }, '駅で{mom}に見送られ、知らない町の寮へ入った。'],
  ['nokoru', '村に残って家の田畑を継ぐ', { tie: 2, sat: -1 }, '同級生を見送り、{dad}と並んで畑を耕した。']]);
c('h5.vil.dekasegi', 'small', [1960, 1980], [30, 59], w({ kind: ['village'], ind: ['farm'], sex: 'm' }), '稲刈りが済むと、村の男たちが冬の出稼ぎの話を始めた。', [
  ['genba', '都会の工事現場へ冬だけ出稼ぎに行く', { sat: 1, body: -1, tie: -1 }, '春まで飯場で働き、まとまった金を家に送った。'],
  ['waraji', '村に残って冬は縄ない仕事をする', { tie: 1, sat: -1 }, '囲炉裏端で{child}と過ごす冬になった。']]);
c('h5.vil.bunko', 'small', [1970, 2010], [6, 14], w({ kind: ['village'], ind: ['home'] }), '通っていた分校が閉じ、遠くの学校へバスで通うことになった。', [
  ['bus', '新しい学校で友だちを作る', { learn: 1, tie: 1 }, 'バスの中で隣の集落の子と仲良くなった。'],
  ['kinen', '分校の最後の日に木に名前を刻む', { tie: 1, sat: -1 }, '古い校舎の前で、{friend}と並んで泣いた。']]);
c('h5.vil.kaso', 'small', [1990, 2120], [60, 110], w({ kind: ['village'], ind: ['farm', 'home'] }), '村を通るバスの便が一日二本に減った。', [
  ['hikkoshi', '町に住む{child}の家へ移る', { body: 1, tie: -1 }, '畑を手放し、町の暮らしに慣れようとした。'],
  ['nokosu', '村に残って小さな畑を続ける', { sat: 2, body: -1 }, '腰をかがめながらも、自分の畑で野菜を育て続けた。'],
  ['noriai', '近所と車の乗り合わせを決める', { tie: 2, sat: -1 }, '病院へ行く日を合わせ、隣の家の車に乗せてもらった。']]);
// --- fish ---
c('h5.fish.jibiki', 'small', [1946, 1990], [6, 14], w({ kind: ['fish'], ind: ['fish'] }), '朝早く、浜で地引き網を引く声がかかった。', [
  ['hiku', '大人に混じって網の綱を引く', { body: 1, tie: 1 }, '網が上がると、跳ねる魚を籠に拾い集めた。'],
  ['nebou', '布団にくるまって寝ている', { body: 1, tie: -1 }, '起きたときには浜の仕事は片付いていた。']]);
c('h5.fish.tsugu', 'small', [1955, 2120], [15, 29], w({ kind: ['fish'], ind: ['fish'] }), '{dad}が、そろそろ船に乗らないかと声をかけてきた。', [
  ['fune', '{dad}の船に乗って漁を覚える', { body: 1, tie: 1, learn: -1 }, '船酔いに耐えながら、網の上げ方を覚えた。'],
  ['koukou', '町の高校へ進んで勉強を続ける', { learn: 2, tie: -1 }, '朝の連絡船で町の学校へ通った。']]);
c('h5.fish.umetate', 'small', [1960, 1985], [30, 59], w({ kind: ['fish'], ind: ['fish', 'home'] }), '浜を埋め立てて工場を建てる話が持ち上がった。', [
  ['hosho', '補償金を受け取って漁をやめる', { sat: 1, tie: -1 }, '船を売り、工場の勤めに移った。'],
  ['shomei', '埋め立て反対の署名を集めて回る', { tie: 2, sat: -1 }, '浜の家を一軒ずつ回り、署名の束を作った。']]);
c('h5.fish.yoshoku', 'small', [1977, 1995], [30, 59], w({ kind: ['fish'], ind: ['fish'] }), '二百海里の線が引かれ、遠い海での漁がしにくくなった。', [
  ['ikada', '湾に養殖のいかだを浮かべる', { learn: 2, sat: -1 }, '慣れない仕事に戸惑いながら、稚貝を吊るした。'],
  ['engan', '小さな船で近くの海の漁に移る', { sat: 1, learn: -1 }, '朝に出て昼に戻る漁で、家族と夕飯を囲めるようになった。']]);
c('h5.fish.oshieru', 'small', [1946, 2120], [60, 110], w({ kind: ['fish'], ind: ['fish'] }), '若い漁師が、潮の流れのことを聞きに来た。', [
  ['shio', '岬の潮の癖を細かく教える', { tie: 2, body: -1 }, '浜に座りこみ、日が暮れるまで話した。'],
  ['amitsukuroi', '網の繕い方を手本に見せる', { learn: 1, sat: 1 }, '針を動かす手もとを、若者がじっと覚えていった。']]);
// --- town ---
c('h5.town.olympic', 'small', [1964, 1964], [6, 14], w({ kind: ['town'], ind: ['home'] }), '東京オリンピックの開会式の日、近所でテレビのある家は一軒だけだった。', [
  ['tonari', 'テレビのある家に上がらせてもらう', { tie: 2, sat: 1 }, '畳に大勢でひしめき、入場行進に拍手した。'],
  ['radio', '家のラジオで実況を聞く', { learn: 1, tie: -1 }, '{dad}と並んで、アナウンサーの声に耳を澄ませた。']]);
c('h5.town.hyogaki', 'small', [1993, 2005], [15, 29], w({ kind: ['town'], ind: ['office', 'home'] }), '就職先がなかなか決まらず、届くのは断りの手紙ばかりだった。', [
  ['haken', '派遣の仕事をしながら次を探す', { sat: 1, body: -1 }, '工場の夜勤に通いながら、履歴書を書き続けた。'],
  ['shiken', '公務員試験の勉強に一年かける', { learn: 2, sat: -1 }, '図書館に通いつめ、問題集をすり切れるまで解いた。'],
  ['jikka', '実家の手伝いをして食いつなぐ', { tie: 1, learn: -1 }, '{mom}の手伝いをしながら、行く先を考えた。']]);
c('h5.town.bubble', 'small', [1986, 1991], [15, 29], w({ kind: ['town'], ind: ['office'] }), '景気がよく、大きな町の会社から転職の誘いが来た。', [
  ['tenshoku', '誘いに乗って大きな会社へ移る', { sat: 2, tie: -1 }, '給料は上がったが、終電で帰る日が続いた。'],
  ['yakuba', '地元の役場に勤め続ける', { tie: 1, sat: -1 }, '同窓会で羽振りのよい話を聞き、少し悔しくなった。']]);
c('h5.town.shotengai', 'small', [1975, 2010], [30, 59], w({ kind: ['town'], ind: ['shop'] }), '郊外に大きな店ができ、商店街の客がめっきり減った。', [
  ['tatamu', '店をたたんで勤めに出る', { body: 1, sat: -1 }, 'シャッターを下ろし、翌月から倉庫で働いた。'],
  ['haitatsu', '常連の家へ品物を届けて回る', { tie: 2, body: -1 }, '自転車で坂を上り、年寄りの家に品を届けた。'],
  ['matsuri', '商店街で夏の夜市を企てる', { tie: 1, learn: 1, sat: -1 }, '提灯を吊るし、久しぶりに通りがにぎわった。']]);
c('h5.town.dayservice', 'small', [2000, 2120], [60, 110], w({ kind: ['town'], ind: ['home'] }), '町の福祉の人から、デイサービスに通わないかと勧められた。', [
  ['kayou', '週に二回、送迎の車で通う', { tie: 2, sat: -1 }, '同じ年ごろの仲間と、歌や体操をして過ごした。'],
  ['niwa', '家で庭の手入れを続ける', { sat: 1, tie: -1 }, '朝顔の世話をしながら、一人の時間をのんびり過ごした。']]);
// --- city ---
c('h5.city.juku', 'small', [1970, 2005], [6, 14], w({ kind: ['city'], ind: ['office', 'home'] }), 'クラスの半分が、駅前の進学塾に通い始めた。', [
  ['juku', '{mom}に頼んで塾に通わせてもらう', { learn: 2, sat: -1 }, '夜遅くまで問題を解き、帰りの電車で眠った。'],
  ['yakyu', '空き地で{friend}と野球を続ける', { body: 1, sat: 1, learn: -1 }, '日が暮れるまでボールを追いかけた。']]);
c('h5.city.sumaho', 'small', [2010, 2120], [15, 29], w({ kind: ['city'], ind: ['office', 'shop', 'home'] }), '満員の通勤電車で、みなスマホの画面を見つめていた。', [
  ['shikaku', 'スマホで資格の勉強を進める', { learn: 2, body: -1 }, '片道四十分を勉強に使い、一年で試験に受かった。'],
  ['douga', '好きな動画を流して気を休める', { sat: 1, learn: -1 }, '笑える動画で、朝の憂うつがいくらか晴れた。'],
  ['hon', 'スマホをしまって紙の本を開く', { learn: 1, tie: -1 }, '周りの視線が気にならないほど、物語に夢中になった。']]);
c('h5.city.machikoba', 'small', [1955, 1973], [30, 59], w({ kind: ['city'], ind: ['craft'] }), '高度成長で、町工場に注文が次々と舞いこんだ。', [
  ['kikai', '借金をして旋盤をもう一台入れる', { sat: 2, body: -1 }, '工場の灯りは夜中まで消えなかった。'],
  ['ude', '今の規模のまま仕上げの腕を磨く', { learn: 2, sat: -1 }, '数は少ないが、難しい部品は必ずうちに回ってくるようになった。']]);
c('h5.city.tanshin', 'small', [1975, 2015], [30, 59], w({ kind: ['city'], ind: ['office'] }), '遠い支店への転勤の辞令が出た。', [
  ['tanshin', '家族を残して単身で赴任する', { learn: 1, tie: -2 }, '週末ごとに夜行バスで家へ帰った。'],
  ['kazoku', '家族そろって引っ越す', { tie: 1, sat: -1 }, '{child}は転校先の学校になかなか慣れなかった。']]);
c('h5.city.videocall', 'small', [2015, 2120], [60, 110], w({ kind: ['city'], ind: ['home'] }), '遠くに住む孫から、スマホで顔を見ながら話そうと誘われた。', [
  ['narau', '近所の教室でスマホの使い方を習う', { learn: 2, tie: 1 }, '画面に孫の顔が映り、思わず手を振った。'],
  ['denwa', 'いつもの固定電話で声だけ聞く', { sat: 1, learn: -1 }, '受話器ごしの声だけでも、十分にうれしかった。']]);
// --- 大きな出来事 ---
c('h5.ev.hanshin.kid', 'small', [1995, 1995], [6, 14], w({ kind: ['town', 'city'], ind: ['home'], pref: ['28', '27'], ev: 'quake' }), '大きな地震で家が傾き、家族で小学校の体育館に身を寄せた。', [
  ['mizu', '給水車の列に並んで水を運ぶ', { tie: 2, body: -1 }, 'ポリタンクを両手に提げ、何度も往復した。'],
  ['asobu', '避難所の小さい子と遊んであげる', { tie: 1, sat: 1 }, 'しりとりをして、泣いていた子が笑った。']]);
c('h5.ev.hanshin.mid', 'small', [1995, 1995], [30, 59], w({ kind: ['town', 'city'], ind: ['office', 'shop', 'craft', 'home'], pref: ['28', '27'], ev: 'quake' }), '地震で線路が途切れ、勤め先へ行く手立てがなくなった。', [
  ['aruku', '何時間も歩いて職場へ向かう', { tie: 1, body: -2 }, 'がれきの道を歩き、昼過ぎにやっと着いた。'],
  ['kinjo', '近所の家の片付けを手伝う', { tie: 2, sat: -1 }, '倒れた箪笥を起こし、隣の人と炊き出しを分けた。']]);
c('h5.ev.tohoku.young', 'small', [2011, 2011], [15, 29], w({ kind: ['fish', 'town', 'city'], ind: ['home'], pref: ['04', '03', '07', '08', '12', '13'], ev: 'quake' }), '大きな地震と津波の知らせが続き、泥かきの手伝いを募る声がかかった。', [
  ['doro', '泥かきの手伝いに加わる', { tie: 2, body: -1 }, 'スコップで家の中の泥を運び出し、礼を言われた。'],
  ['bokin', '駅前で募金箱を持って立つ', { tie: 1, learn: 1 }, '寒い中、足を止めてくれる人の多さに驚いた。']]);
c('h5.ev.tohoku.old', 'small', [2011, 2011], [60, 110], w({ kind: ['village', 'fish', 'town'], ind: ['home'], pref: ['04', '03', '07', '08', '12', '13'], ev: 'quake' }), '揺れが収まると、防災無線が高台へ逃げるよう呼びかけた。', [
  ['takadai', '近所の人と声をかけあって高台へ上る', { tie: 2, body: -1 }, '息を切らして坂を上り、みなの無事を確かめた。'],
  ['ihai', '仏壇の位牌を抱えてから家を出る', { sat: 1, body: -2 }, '遅れて逃げ、途中で消防団の人に手を引かれた。']]);
c('h5.ev.corona.kid', 'small', [2020, 2022], [6, 14], w({ kind: ['village', 'fish', 'town', 'city'], ind: ['home'], ev: 'epidemic' }), '新型コロナの流行で学校が休みになり、家にこもる日が続いた。', [
  ['online', 'タブレットで授業を受ける', { learn: 2, body: -1 }, '画面ごしに先生の声を聞き、課題を出した。'],
  ['ryori', '{mom}と昼ごはんを作る', { tie: 2, learn: -1 }, '初めて一人で卵焼きを焼き上げた。']]);
c('h5.ev.corona.mid', 'small', [2020, 2022], [30, 59], w({ kind: ['town', 'city'], ind: ['office'], ev: 'epidemic' }), '新型コロナの流行で、会社から家で働くよう言われた。', [
  ['zaitaku', '台所の机で在宅勤務を続ける', { tie: 1, body: -1 }, '{child}の声を聞きながら、画面の会議に出た。'],
  ['shussha', '人の少ない時間を選んで出社する', { learn: 1, tie: -1 }, 'がらんとした事務所で、黙々と書類を片付けた。']]);

  /* ===== 時代を問わない選択（u: true。1つの人生で選択の3割まで。問いごとに答えを書き分ける。v8の直し 2・13） ===== */
  /* ===== 時代を問わない選択（もとの u(...) を問いの文ごとに分けたもの。when に u: true） ===== */
  // 旅人
  c('u.tabibito.1', 'small', [1000, 1937], [10, 80], w({ u: true, kind: ['village', 'fish', 'town'], ind: ['home'] }), '夕暮れ、道に迷った旅人が一夜の宿を頼んできた。', [
    ['help', '土間に泊めてやる', { tie: 2, sat: 1 }, '旅人は、遠い国の話をして礼にした。'], ['no', '戸を閉めて宿は貸さない', { sat: -1 }, '夜更けまで、戸の外の足音が気になった。']]);
  c('u.tabibito.2', 'small', [1000, 2120], [10, 80], w({ u: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '雨の中、見知らぬ人が軒先で困った顔をしている。', [
    ['help', '家に上げて白湯を出す', { tie: 2, sat: 1 }, '雨がやむと、その人は何度も頭を下げて帰っていった。'], ['no', '戸口から様子をうかがうだけにする', { sat: -1 }, 'いつの間にか、軒先の人影は消えていた。']]);
  c('u.tabibito.3', 'small', [1000, 1937], [10, 80], w({ u: true, kind: ['village', 'fish'], ind: ['home'] }), '村はずれで、足をくじいた旅人がうずくまっていた。', [
    ['help', '肩を貸して家まで連れ帰る', { tie: 2, sat: 1 }, '旅人は、足が治るまでの三日、薪割りを手伝ってくれた。'], ['no', '急ぎの用を理由に通り過ぎる', { sat: -1 }, '帰り道、うずくまる姿が何度も思い出された。']]);
  // きょうだいの仲裁
  c('u.chuusai.1', 'small', [1000, 2120], [12, 90], w({ u: true, hasSib: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '{sibOlder}と{sibYounger}が、つまらないことで口をきかなくなった。', [
    ['mediate', '二人を呼んで仲直りさせる', { tie: 3, sat: -1 }, '二人は照れくさそうに、同時に口を開いた。'], ['away', '二人が折れるまで放っておく', { sat: 1 }, '十日ほどして、二人はいつの間にか話すようになっていた。']]);
  c('u.chuusai.2', 'small', [1000, 2120], [12, 90], w({ u: true, hasSib: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), 'きょうだいの言い争いが、夕飯の席まで続いている。', [
    ['mediate', '話をそらして場を和ませる', { tie: 3, sat: -1 }, '冗談に、言い争っていた二人も吹き出した。'], ['away', '黙って箸を進める', { sat: 1 }, '自分の分を食べ終えて、早めに席を立った。']]);
  c('u.chuusai.3', 'small', [1000, 2120], [12, 90], w({ u: true, hasSib: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '{sibOlder}が、{sibYounger}の悪口を言いに来た。', [
    ['mediate', '{sibYounger}にもいいところがあると言う', { tie: 3, sat: -1 }, '{sibOlder}は、ふくれっ面のまま少し考える顔をした。'], ['away', '相づちだけ打って聞き流す', { sat: 1 }, '言うだけ言うと、{sibOlder}は気がすんだように帰っていった。']]);
  // 見舞い
  c('u.mimai.1', 'small', [1000, 2120], [10, 90], w({ u: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '{friend}が寝こんでいると聞いた。', [
    ['go', '見舞いの品を持って訪ねる', { tie: 3, body: -1 }, '{friend}は、床の上で起き上がって笑った。'], ['later', '治ったころに顔を出す', { sat: 0, tie: -1 }, '元気になった{friend}は、少しよそよそしかった。']]);
  c('u.mimai.2', 'small', [1000, 2120], [10, 90], w({ u: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '{friend}の家に不幸があったと知らせが来た。', [
    ['go', 'すぐに弔いの手伝いに行く', { tie: 3, body: -1 }, '弔いのあいだ、{friend}のそばで湯をわかし続けた。'], ['later', '弔いが済んでから訪ねる', { sat: 0, tie: -1 }, '訪ねたときには、家の中はもう静かになっていた。']]);
  c('u.mimai.3', 'small', [1000, 2120], [10, 90], w({ u: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '{friend}が、しばらく顔を見せない。', [
    ['go', '家まで様子を見に行く', { tie: 3, body: -1 }, '{friend}は、家のことで手が離せずにいたのだった。'], ['later', 'そのうち来るだろうと待つ', { sat: 0, tie: -1 }, 'ひと月たっても、{friend}は顔を見せなかった。']]);
  // 拾いもの
  c('u.hiroimono.1', 'small', [1600, 2120], [8, 90], w({ u: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '道で、財布のようなものを拾った。', [
    ['return', '中を確かめて持ち主を探す', { tie: 2, sat: 1 }, '青い顔で探していた人に返すと、深々と頭を下げられた。'], ['keep', '中身ごと懐に入れる', { sat: 2, tie: -2 }, 'その晩は、外を通る足音のたびに胸がどきりとした。']]);
  c('u.hiroimono.2', 'small', [1000, 2120], [8, 90], w({ u: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '川原で、きれいな細工の櫛を拾った。', [
    ['return', '近くの家に落とし主を尋ねて回る', { tie: 2, sat: 1 }, '三軒目で、櫛の持ち主の娘が見つかった。'], ['keep', 'こっそり持ち帰ってしまっておく', { sat: 2, tie: -2 }, 'ときどき取り出しては、細工の模様を眺めた。']]);
  c('u.hiroimono.3', 'small', [1000, 2120], [8, 90], w({ u: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '市の帰り、落とし物の包みを見つけた。', [
    ['return', '市の世話役に包みを預ける', { tie: 2, sat: 1 }, '次の市で、落とし主から礼の干し柿をもらった。'], ['keep', '包みを抱えて家に帰る', { sat: 2, tie: -2 }, '包みの中身のことは、家の者にも言わなかった。']]);
  // 嘘
  c('u.uso.1', 'small', [1000, 2120], [8, 70], w({ u: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '{mom}に、ついた嘘がばれそうだ。', [
    ['admit', '叱られる前に自分から言う', { tie: 2, sat: -1 }, '{mom}は少し怒ったあと、言いに来たことをほめた。'], ['hide', '話をそらしてやり過ごす', { sat: 1, tie: -2 }, '嘘はばれなかったが、{mom}の顔をまともに見られなかった。']]);
  c('u.uso.2', 'small', [1000, 2120], [8, 70], w({ u: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '{friend}に、小さな嘘をついたのを思い出した。', [
    ['admit', '{friend}に会って嘘を詫びる', { tie: 2, sat: -1 }, '{friend}は「そんなこと忘れていた」と笑った。'], ['hide', 'もう済んだことだと忘れる', { sat: 1, tie: -2 }, 'その嘘は、ときどき思い出されて胸にひっかかった。']]);
  c('u.uso.3', 'small', [1000, 2120], [8, 70], w({ u: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '仕事の失敗を、ごまかしたくなった。', [
    ['admit', '失敗を上の者に申し出る', { tie: 2, sat: -1 }, '叱られはしたが、直し方を一緒に考えてもらえた。'], ['hide', '失敗をこっそり取り繕う', { sat: 1, tie: -2 }, '取り繕った跡が見つからないか、しばらく落ち着かなかった。']]);
  // 約束
  c('u.yakusoku.1', 'small', [1000, 2120], [10, 80], w({ u: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '{friend}と会う約束の日、急な用事が入った。', [
    ['keep', '用事を断って{friend}に会いに行く', { tie: 3, sat: -1 }, '{friend}は、待ちわびた顔で手を振った。'], ['break', '{friend}に日延べを頼む', { sat: 1, tie: -2 }, '{friend}は「またか」と言って、少しむくれた。']]);
  c('u.yakusoku.2', 'small', [1000, 2120], [10, 80], w({ u: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '前から頼まれていた手伝いの日と、別の用事が重なった。', [
    ['keep', '先に頼まれた手伝いに出る', { tie: 3, sat: -1 }, '頼んだ家の者は、来てくれて助かったと何度も言った。'], ['break', '手伝いを断って別の用を済ませる', { sat: 1, tie: -2 }, '用は片づいたが、手伝いの家とは少し行き来が減った。']]);
  c('u.yakusoku.3', 'small', [1000, 2120], [10, 80], w({ u: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '人に貸すと約束した道具を、自分も使いたくなった。', [
    ['keep', '約束どおり道具を貸す', { tie: 3, sat: -1 }, '道具は、手入れされてきれいになって戻ってきた。'], ['break', '貸すのを何日か待ってもらう', { sat: 1, tie: -2 }, '相手は、ほかの家に道具を借りに行った。']]);
  // 噂
  c('u.uwasa.1', 'small', [1000, 2120], [12, 90], w({ u: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '近所で、ある家の悪い噂が広まっている。', [
    ['stop', '聞いた噂をよそへ広めない', { tie: 1, sat: 0 }, 'その家の人は、変わらずあいさつしてくれた。'], ['join', '噂を家で話の種にする', { tie: 1, sat: 1 }, '夕飯の席は、その噂でひとしきりにぎわった。']]);
  c('u.uwasa.2', 'small', [1000, 2120], [12, 90], w({ u: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '{friend}が、聞いたばかりの噂話を始めた。', [
    ['stop', '噂話の腰を折って別の話をする', { tie: 1, sat: 0 }, '{friend}は肩をすくめて、別の話を始めた。'], ['join', '身を乗り出して続きを聞く', { tie: 1, sat: 1 }, '二人で、日が暮れるまで話しこんでいた。']]);
  c('u.uwasa.3', 'small', [1000, 2120], [12, 90], w({ u: true, sex: 'm', kind: ['village', 'fish'], ind: ['home'] }), '寄り合いのあと、ひとりの陰口で盛り上がっている。', [
    ['stop', '陰口の輪を抜けて先に帰る', { tie: 1, sat: 0 }, '帰り道、星がよく見えた。'], ['join', '一緒になって笑う', { tie: 1, sat: 1 }, 'その晩は、皆と少し打ち解けた気がした。']]);
  // 仕事ぶり
  c('u.shigoto.1', 'small', [1000, 2120], [15, 75], w({ u: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '今日の仕事を、少し手を抜いても誰も気づかない。', [
    ['do', '誰も見ていなくても手を抜かない', { learn: 2, body: -1 }, '仕上がりを見て、自分で小さくうなずいた。'], ['rest', '手を抜いて早めに切り上げる', { body: 2, sat: 1 }, '浮いた時間で、日の高いうちにのんびりできた。']]);
  c('u.shigoto.2', 'small', [1000, 2120], [15, 75], w({ u: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '雨で、仕事を休みたい朝だ。', [
    ['do', '雨具をつけて仕事に出る', { learn: 2, body: -1 }, 'ずぶぬれになったが、その日の分は片づいた。'], ['rest', '雨を理由に一日休む', { body: 2, sat: 1 }, '雨音を聞きながら、昼過ぎまで横になっていた。']]);
  c('u.shigoto.3', 'small', [1000, 2120], [15, 75], w({ u: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '頼まれた仕事が、思ったより手間がかかる。', [
    ['do', '手間をいとわず仕上げる', { learn: 2, body: -1 }, '手間をかけたぶん、こつがひとつ身についた。'], ['rest', 'できたところまでで渡す', { body: 2, sat: 1 }, '頼んだ人は、残りは自分でやると言った。']]);
  // 分ける
  c('u.wakeru.1', 'small', [1603, 2120], [10, 90], w({ u: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), 'もらいものの菓子が、家族の数より一つ足りない。', [
    ['share', '自分の分を家族に譲る', { tie: 3, sat: -1 }, '菓子をほおばる家族の顔を、横で眺めた。'], ['self', '早い者勝ちにして一つ食べる', { sat: 2 }, '甘さが口いっぱいに広がった。']]);
  c('u.wakeru.2', 'small', [1000, 2120], [10, 90], w({ u: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '思いがけず手に入ったごちそうを、誰と分けるか。', [
    ['share', '近所の家にもおすそ分けする', { tie: 3, sat: -1 }, '数日して、隣の家から煮物が返ってきた。'], ['self', '家族だけで囲んで食べる', { sat: 2 }, 'その晩の食卓は、いつになくにぎやかだった。']]);
  c('u.wakeru.3', 'small', [1000, 2120], [10, 90], w({ u: true, kind: ['village', 'fish', 'town'], ind: ['farm'] }), '畑でよくできた瓜を、近所に配るかどうか。', [
    ['share', '近所の家々に瓜を配って回る', { tie: 3, sat: -1 }, 'あちこちの家で、瓜の出来をほめられた。'], ['self', '瓜を井戸で冷やして家で食べる', { sat: 2 }, '冷えた瓜を、家の者みんなで縁側でかじった。']]);
  // 恩返し
  c('u.ongaeshi.1', 'small', [1000, 2120], [15, 90], w({ u: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '昔世話になった人が、困っていると聞いた。', [
    ['help', '恩人の家へ手伝いに出向く', { tie: 3, body: -1 }, '恩人は、よく来てくれたと目を細めた。'], ['send', '見舞いの品を人に託して届ける', { tie: 2 }, '品を届けた人から、恩人が喜んでいたと聞いた。']]);
  c('u.ongaeshi.2', 'small', [1000, 2120], [15, 90], w({ u: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '子どものころ助けてくれた人が、年をとって寂しく暮らしている。', [
    ['help', 'ときどき顔を出して話し相手になる', { tie: 3, body: -1 }, '行くたびに、同じ昔話を楽しそうに聞かされた。'], ['send', '季節ごとに品物を届けさせる', { tie: 2 }, '届けた先から、丁寧な礼の言づてが返ってきた。']]);
  c('u.ongaeshi.3', 'small', [1000, 2120], [15, 90], w({ u: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '恩人の家の屋根が、嵐で傷んだらしい。', [
    ['help', '屋根の修理を手伝いに行く', { tie: 3, body: -1 }, '日暮れまでに、屋根の穴はすっかりふさがった。'], ['send', '修理の足しに米を届ける', { tie: 2 }, '恩人の家から、ありがたくいただくと返事があった。']]);
  // 習う
  c('u.narau.1', 'small', [1000, 2120], [12, 80], w({ u: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '新しい技を覚えれば、仕事が楽になるらしい。', [
    ['learn', '新しい技を教わりに通う', { learn: 3, sat: -1 }, '慣れるまでは、かえって手間がかかった。'], ['no', '慣れたやり方を続ける', { sat: 1 }, 'いつもの手順で、いつもどおりに仕事が片づいた。']]);
  c('u.narau.2', 'small', [1570, 2120], [12, 80], w({ u: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '{friend}が、字や算盤の勉強に誘ってきた。', [
    ['learn', '{friend}と一緒に勉強を始める', { learn: 3, sat: -1 }, '二人で競うように、夜遅くまで珠をはじいた。'], ['no', '勉強の誘いを断る', { sat: 1 }, '{friend}は、ひとりで通い始めた。']]);
  c('u.narau.3', 'small', [1603, 2120], [12, 80], w({ u: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '昔からやってみたかった手習いを、今から始められるだろうか。', [
    ['learn', '筆と紙をそろえて稽古を始める', { learn: 3, sat: -1 }, '最初の字は、ひどくゆがんでいた。'], ['no', '今さら遅いとあきらめる', { sat: 1 }, '筆を持つ代わりに、人の書いた字を眺めて楽しむようになった。']]);
  // 家の手入れ
  c('u.ie.1', 'small', [1000, 2120], [25, 90], w({ u: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '家の壁にひびが入ってきた。', [
    ['fix', '壁塗りの職人に頼む', { sat: 1, body: 1 }, '塗り直した壁は、見違えるようにきれいになった。'], ['self', '自分で土をこねて塗り込む', { learn: 1, body: -1 }, '少しまだらだが、ひびはふさがった。']]);
  c('u.ie.2', 'small', [1000, 2120], [25, 90], w({ u: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '雨漏りがひどくなった。', [
    ['fix', '屋根屋に葺き直してもらう', { sat: 1, body: 1 }, '次の大雨の晩、家の中は静かだった。'], ['self', '自分で屋根に上って穴をふさぐ', { learn: 1, body: -1 }, '屋根から下りると、膝が震えていた。']]);
  c('u.ie.3', 'small', [1000, 2120], [25, 90], w({ u: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '戸のたてつけが悪くなってきた。', [
    ['fix', '大工に戸を直してもらう', { sat: 1, body: 1 }, '戸は、指一本ですっと開くようになった。'], ['self', '自分で戸の底を削る', { learn: 1, body: -1 }, '削りすぎて、戸の下にすき間ができた。']]);
  // 夫婦げんか
  c('u.kenka.1', 'small', [1000, 2120], [15, 80], w({ u: true, married: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '{spouse}と、ささいなことで言い争いになった。', [
    ['sorry', '自分から謝って話を収める', { tie: 3, sat: -1 }, '{spouse}は、ほっとした顔で茶をいれてくれた。'], ['stand', '言い分を最後まで言い張る', { sat: 1, tie: -2 }, 'その晩は、互いに背を向けて寝た。']]);
  c('u.kenka.2', 'small', [1000, 2120], [15, 80], w({ u: true, married: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '{spouse}の小言が、今日は妙に気にさわる。', [
    ['sorry', '小言を黙って聞き入れる', { tie: 3, sat: -1 }, '言うだけ言うと、{spouse}の機嫌は直った。'], ['stand', '小言にひとつずつ言い返す', { sat: 1, tie: -2 }, '言い返すうちに、話は昔のことまでさかのぼった。']]);
  c('u.kenka.3', 'small', [1000, 2120], [15, 80], w({ u: true, married: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '{spouse}が、黙って家を出ていった。', [
    ['sorry', '迎えに行って頭を下げる', { tie: 3, sat: -1 }, '{spouse}は、実家の縁先でぼんやり座っていた。'], ['stand', '帰ってくるまで放っておく', { sat: 1, tie: -2 }, '{spouse}が戻ったのは、二日後の夕方だった。']]);
  // 子を叱る
  c('u.kodomo.1', 'small', [1000, 2120], [20, 70], w({ u: true, hasChild: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '{child}が、近所の子とけんかして帰ってきた。', [
    ['scold', 'けんかをしたことをきつく叱る', { tie: -1, learn: 1 }, '{child}は、涙をこらえて黙ってしまった。'], ['listen', 'けんかのわけを最後まで聞く', { tie: 3 }, '{child}は、小さい子をかばったのだと話した。']]);
  c('u.kodomo.2', 'small', [1000, 2120], [20, 70], w({ u: true, hasChild: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '{child}が、大事な物を壊して隠していた。', [
    ['scold', '隠したことを厳しくとがめる', { tie: -1, learn: 1 }, '{child}は、二度と隠しごとはしないと泣いて言った。'], ['listen', '壊れた物を一緒に見ながら話を聞く', { tie: 3 }, '{child}は、言い出せなかったわけをぽつぽつ話した。']]);
  c('u.kodomo.3', 'small', [1000, 2120], [20, 70], w({ u: true, hasChild: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '{child}が、夜になっても帰ってこない。', [
    ['scold', '帰ってきたところを叱りつける', { tie: -1, learn: 1 }, '{child}は、それからは日のあるうちに帰るようになった。'], ['listen', 'どこにいたのか静かに尋ねる', { tie: 3 }, '{child}は、迷子の子を家まで送っていたのだと話した。']]);
  // 贈りもの
  c('u.okurimono.1', 'small', [1000, 2120], [12, 90], w({ u: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '世話になった人に、何か贈りたい。', [
    ['big', '値の張る品を選んで贈る', { tie: 3, sat: -2 }, '相手は、こんな立派な物をと恐縮した。'], ['hand', '心をこめて手作りの品を贈る', { tie: 2, learn: 1 }, '手作りの品は、相手の家の目立つところに置かれた。']]);
  c('u.okurimono.2', 'small', [1000, 2120], [12, 90], w({ u: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '{friend}の祝いごとに、何を持っていくか。', [
    ['big', '上等な祝いの品を買って持っていく', { tie: 3, sat: -2 }, '{friend}の家の者が、品を見て声をあげた。'], ['hand', '自分でこしらえた品を持っていく', { tie: 2, learn: 1 }, '{friend}は、こしらえた手間を思ってか、長いこと品を眺めていた。']]);
  c('u.okurimono.3', 'small', [1946, 2120], [12, 90], w({ u: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '{mom}の誕生日（年祝い）に、何かしてやりたい。', [
    ['big', '{mom}を料理屋に連れていく', { tie: 3, sat: -2 }, '{mom}は、こんなぜいたくはもったいないと言いながら箸を進めた。'], ['hand', '{mom}に手料理をふるまう', { tie: 2, learn: 1 }, '{mom}は、少し焦げた煮物をおいしいと言って食べた。']]);
  // 夜
  c('u.yoru.1', 'small', [1000, 2120], [12, 60], w({ u: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '眠れない夜。外は満月だ。', [
    ['up', '月を眺めて夜更かしする', { sat: 2, body: -2 }, '月が西の空に傾くまで、外に座っていた。'], ['sleep', '目を閉じて横になる', { body: 2 }, '数をかぞえるうちに、いつの間にか眠っていた。']]);
  c('u.yoru.2', 'small', [1000, 2120], [12, 60], w({ u: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '夜なべ仕事が、あと少しで片づく。', [
    ['up', '片づくまで手を動かす', { sat: 2, body: -2 }, '仕上げたころ、遠くで一番鶏が鳴いた。'], ['sleep', '続きは明日にして寝床に入る', { body: 2 }, '翌朝、すっきりした頭で残りを片づけた。']]);
  c('u.yoru.3', 'small', [1000, 2120], [12, 60], w({ u: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '{friend}が、夜明けまで語り明かそうと言う。', [
    ['up', '朝まで{friend}と語り合う', { sat: 2, body: -2 }, '空が白むころ、二人とも声がかれていた。'], ['sleep', '話の途中で先に寝る', { body: 2 }, '{friend}は、寝顔に向かってしばらく話し続けていた。']]);
  // 商い
  c('u.akinai.1', 'small', [1000, 2120], [20, 75], w({ u: true, kind: ['village', 'fish', 'town', 'city'], ind: ['shop'] }), 'いつもの倍の値で買いたいという客が来た。', [
    ['try', '客の言い値で売ってしまう', { sat: 2, body: -1 }, '思わぬ儲けに、その晩はなかなか寝つけなかった。'], ['safe', 'いつもの値で売ると答える', { sat: 0, learn: 1 }, '客は首をかしげながらも、いつもの値で買っていった。']]);
  c('u.akinai.2', 'small', [1333, 2120], [20, 75], w({ u: true, kind: ['village', 'fish', 'town', 'city'], ind: ['shop'] }), '仕入れ先から、量を倍にしないかと持ちかけられた。', [
    ['try', '仕入れを倍に増やす', { sat: 2, body: -1 }, '売り切るまで、朝から晩まで声をからした。'], ['safe', '仕入れの量は今までどおりにする', { sat: 0, learn: 1 }, '品物は、いつもどおりの日数で売り切れた。']]);
  c('u.akinai.3', 'small', [1000, 2120], [20, 75], w({ u: true, kind: ['village', 'fish', 'town', 'city'], ind: ['shop'] }), '人の分まで物を売れば、ひと儲けできそうだ。', [
    ['try', '人の分まで引き受けて売りさばく', { sat: 2, body: -1 }, '売り歩く道のりは、いつもの倍になった。'], ['safe', '自分の受け持ちの分だけ売る', { sat: 0, learn: 1 }, '無理をしなかったぶん、客との話に時間をかけられた。']]);
  // 体の不調
  c('u.kaze.1', 'small', [1000, 2120], [10, 90], w({ u: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '朝から体がだるく、熱っぽい。', [
    ['rest', '一日寝床で汗をかく', { body: 3, sat: -1 }, '夕方には、熱がすっと引いていた。'], ['push', '熱をこらえていつもどおり働く', { body: -2, sat: 1 }, '仕事は片づいたが、夜になって熱が上がった。']]);
  c('u.kaze.2', 'small', [1000, 2120], [10, 90], w({ u: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), 'このところ、咳が止まらない。', [
    ['rest', '生姜湯を飲んで早く床につく', { body: 3, sat: -1 }, '幾晩か早く寝るうちに、咳はおさまった。'], ['push', '咳をこらえて用事を続ける', { body: -2, sat: 1 }, '咳は、それからひと月も長引いた。']]);
  c('u.kaze.3', 'small', [1000, 2120], [10, 90], w({ u: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '腰が痛んで、立ち上がるのがつらい。', [
    ['rest', '腰を温めて横になる', { body: 3, sat: -1 }, '三日ほどで、腰はだいぶ楽になった。'], ['push', '腰をかばいながら動き回る', { body: -2, sat: 1 }, 'かばううちに、今度は膝まで痛みだした。']]);
  // 昔をふりかえる
  c('u.mukashi.1', 'small', [1000, 2120], [40, 100], w({ u: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '昔の知り合いに、ばったり出会った。', [
    ['talk', '立ち話で昔をなつかしむ', { tie: 2, sat: 2 }, '気づけば、日が傾くまで話しこんでいた。'], ['pass', '会釈だけして別れる', { learn: 1 }, '別れたあと、その人と過ごしたころのことを思い返した。']]);
  c('u.mukashi.2', 'small', [1000, 2120], [40, 100], w({ u: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '若いころに住んでいた家の前を通りかかった。', [
    ['talk', '今の住人に声をかけて昔の話をする', { tie: 2, sat: 2 }, '住人は、柱に残った古い傷のわけを聞いて笑った。'], ['pass', '門の前を黙って通り過ぎる', { learn: 1 }, '振り返ると、昔と同じ木が枝を広げていた。']]);
  c('u.mukashi.3', 'small', [1600, 2120], [40, 100], w({ u: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '古い手紙の束が出てきた。', [
    ['talk', '家の者に手紙を見せて昔話をする', { tie: 2, sat: 2 }, '家の者は、若いころの話に目を丸くした。'], ['pass', '束のまま元の場所にしまう', { learn: 1 }, 'しまう前に、差出人の名だけをひとつずつ確かめた。']]);
  // 目をひくもの
  c('u.hana.1', 'small', [1000, 2120], [6, 100], w({ u: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '道ばたに、見たこともない花が咲いていた。', [
    ['stop', 'しゃがみこんで花を眺める', { sat: 2 }, '花の色は、その日いちにち目に残っていた。'], ['tell', '家族を連れてきて花を見せる', { tie: 2 }, '家族は、こんな花は初めてだと言った。']]);
  c('u.hana.2', 'small', [1000, 2120], [6, 100], w({ u: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '空に大きな虹がかかった。', [
    ['stop', '虹が消えるまで見上げる', { sat: 2 }, '虹は、ゆっくりと薄れて空に溶けた。'], ['tell', '家の者に虹を知らせに走る', { tie: 2 }, '皆で外に出たときには、虹はまだ半分残っていた。']]);
  c('u.hana.3', 'small', [1000, 2120], [6, 100], w({ u: true, kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '夜空に、ほうき星のような光が見えた。', [
    ['stop', '光が消えるまで夜空を見上げる', { sat: 2 }, '光は、尾を引いて山の向こうへ消えた。'], ['tell', '寝ている家族を起こして外へ呼ぶ', { tie: 2 }, '寝ぼけまなこの家族と、並んで空を見上げた。']]);

  // 「（null）」の選択肢の文を時代に合わせる
  X.forEach(function (o) { o.options.forEach(function (p) { if (p.l == null) p.l = '医者に診てもらう'; }); });

  var FXN = { body: 'からだ', sat: '暮らしの満足', learn: '学び', tie: 'つながり' };
  // 選択肢の下に出す1行（4つの数値が動く向き）
  function hint(fx) {
    var p = [];
    ['sat', 'tie', 'learn', 'body'].forEach(function (k) { if (fx[k] > 0) p.push(FXN[k] + '＋'); else if (fx[k] < 0) p.push(FXN[k] + '−'); });
    return p.length ? p.join('　') : '大きくは変わらない';
  }
  function era(y) { return y <= 1332 ? 0 : y <= 1602 ? 1 : y <= 1867 ? 2 : y <= 1945 ? 3 : 4; }
  function ageBand(a) { return a <= 5 ? 0 : a <= 14 ? 1 : a <= 29 ? 2 : a <= 59 ? 3 : 4; }
  // 出せる年の範囲がある品物と言葉（v8の直し 2）。[言葉, 始まり, 終わり, 庶民でないならいつでもよい]
  var ERA_WORDS = [[/財布/, 1600, 9999], [/手紙/, 1600, 9999, true], [/算盤|そろばん/, 1570, 9999], [/時計/, 1872, 9999], [/新聞/, 1872, 9999], [/鉄道|汽車|駅/, 1872, 9999], [/郵便/, 1871, 9999],
    [/学校/, 1872, 9999], [/写真/, 1860, 9999], [/電話|電灯|自転車/, 1890, 9999], [/ラジオ/, 1925, 9999], [/テレビ/, 1953, 9999], [/携帯/, 1995, 9999], [/スマホ|スマートフォン/, 2008, 9999], [/貸本/, 1600, 1970], [/電子レンジ/, 1965, 9999], [/パソコン/, 1980, 9999], [/インターネット|メール/, 1995, 9999], [/自家用車|マイカー/, 1955, 9999], [/冷蔵庫|洗濯機/, 1953, 9999], [/ゲーム機/, 1983, 9999], [/コンビニ/, 1974, 9999],
    [/庄屋/, 1600, 1871], [/村長/, 1889, 9999], [/円(?!満|く|陣|座|形)/, 1871, 9999], [/[0-9０-９]+両|小判/, 1601, 1871]];
  // 地名を出す選択は、その町か近くの国に住んでいる人だけ（都道府県の番号）
  var PLACE_WORDS = [[/両国|浅草|吉原|日本橋|深川|江戸|銀座|新宿|渋谷/, ['13', '11', '12', '14']], [/道頓堀|心斎橋|天満|大坂/, ['27', '28', '29', '26']], [/祇園|鴨川|西陣|京の/, ['26', '25', '27', '29']]];
  function eraOk(t, y, elite) {
    for (var i = 0; i < ERA_WORDS.length; i++) { var e = ERA_WORDS[i]; if (e[0].test(t) && (y < e[1] || y > e[2]) && !(e[3] && elite)) return false; }
    return true;
  }
  function placeOk(t, pref) {
    for (var i = 0; i < PLACE_WORDS.length; i++) if (PLACE_WORDS[i][0].test(t) && PLACE_WORDS[i][1].indexOf(String(pref)) < 0) return false;
    return true;
  }
  /* ===== 家を離れている間の選択（v11の直し 4）：出家・奉公・旅の一座・出征の年にも選べるように ===== */
  var ANYK = ['village', 'fish', 'town', 'city'];
  c('s.tera.takuhatsu', 'small', [1000, 1872], [30, 110], w({ mode: ['shukke'], kind: ANYK, ind: ['priest'] }), '托鉢の道で、病の子を抱えた母親に呼び止められた。寺に連れて行ってほしいと言う。', [
    ['take', '寺に連れて帰り、手当てをする', { tie: 3, sat: -1 }, '病の子と母親を寺に連れて帰り、夜通し手当てをした。'], ['pray', 'その場で経を唱えて励ます', { sat: 1 }, '病の子のために、道ばたで経を唱えて母親を励ました。']]);
  c('s.tera.deshi', 'small', [1000, 1872], [40, 110], w({ mode: ['shukke'], kind: ANYK, ind: ['priest'] }), '村の貧しい家から、子を寺の弟子にしてほしいと頼まれた。', [
    ['yes', '弟子として引き取る', { tie: 3, sat: -1 }, '貧しい家の子を、寺の弟子として引き取った。'], ['no', '寺も苦しいと断る', { sat: 1, tie: -2 }, '寺の暮らしも苦しく、弟子入りの頼みは断った。']]);
  c('s.tera.honzan', 'small', [1000, 1872], [30, 70], w({ mode: ['shukke'], kind: ANYK, ind: ['priest'] }), '本山で、しばらく修行を積まないかと声がかかった。', [
    ['go', '本山へ上る', { learn: 4, body: -2 }, '本山へ上り、厳しい修行の日々を送った。'], ['stay', '今の寺を守る', { tie: 2 }, '本山での修行の話は断り、今の寺と檀家を守ることにした。']]);
  c('s.tera.fushin', 'small', [1000, 1872], [35, 110], w({ mode: ['shukke'], kind: ANYK, ind: ['priest'] }), '本堂の屋根が傷んできた。檀家に寄付を頼むか、寺の蓄えでしのぐか。', [
    ['ask', '檀家に寄付を頼んで回る', { tie: 2, sat: -1 }, '檀家を一軒ずつ回って寄付を頼み、本堂の屋根を直した。'], ['self', '寺の蓄えで少しずつ直す', { sat: -1 }, '寺の蓄えを切り崩して、本堂の屋根を少しずつ直した。']]);
  c('s.tera.kikin', 'small', [1000, 1872], [30, 110], w({ mode: ['shukke'], kind: ANYK, ind: ['priest'], ev: 'famine' }), '飢饉で、寺の門前に食べものを求める人が集まってきた。', [
    ['give', '寺の蔵を開けて炊き出しをする', { tie: 4, body: -1 }, '寺の蔵を開け、門前に集まった人たちに粥を炊いて配った。'], ['keep', '寺の者の分を残し、少しだけ分ける', { body: 1 }, '寺の者が食べる分を残して、門前の人たちに少しだけ米を分けた。']]);
  c('s.tera.atotsugi', 'small', [1000, 1872], [55, 110], w({ mode: ['shukke'], kind: ANYK, ind: ['priest'] }), '年をとり、寺の跡を誰に任せるか考える時が来た。', [
    ['deshi', '長く仕えた弟子に任せる', { tie: 3 }, '寺の跡は、長く仕えてくれた弟子に任せると決めた。'], ['honzan', '本山に人を送ってもらう', { learn: 1 }, '寺の跡は、本山から送られてくる僧に任せることにした。']]);
  c('s.tera.terakoya', 'small', [1700, 1872], [30, 110], w({ mode: ['shukke'], kind: ANYK, ind: ['priest'] }), '近所の親たちから、寺で子どもに字と算盤を教えてほしいと頼まれた。', [
    ['yes', '寺子屋を開く', { tie: 3, learn: 2 }, '寺の一間で寺子屋を開き、近所の子に字と算盤を教えた。'], ['no', '修行のさまたげになると断る', { learn: 1 }, '寺子屋の頼みは、修行のさまたげになると断った。']]);
  c('s.tera.kito', 'small', [1000, 1872], [30, 110], w({ mode: ['shukke'], kind: ANYK, ind: ['priest'] }), '村の有力者から、病の平癒の祈祷を頼まれた。お礼ははずむと言う。', [
    ['do', '祈祷を引き受ける', { sat: 2 }, '村の有力者の頼みで、病の平癒を祈る祈祷を務めた。'], ['refuse', '医者に診てもらうよう勧める', { tie: 1, learn: 1 }, '祈祷の頼みには、医者に診てもらうよう勧めた。']]);
  c('s.hoko.yabuiri', 'small', [1600, 1945], [10, 29], w({ mode: ['hoko'], kind: ANYK, ind: ['shop', 'craft', 'farm', 'home'] }), '藪入りの日が来た。ふるさとの家に帰るか、奉公先にとどまって用を片付けるか。', [
    ['home', 'ふるさとの家に帰る', { tie: 3 }, '藪入りの日に、ふるさとの家に帰って家族と過ごした。'], ['stay', '奉公先に残って仕事を覚える', { learn: 2, tie: -1 }, '藪入りの日も奉公先に残り、仕事の段取りを覚えた。']]);
  c('s.hoko.shikujiri', 'small', [1600, 1945], [10, 29], w({ mode: ['hoko'], kind: ANYK, ind: ['shop', 'craft', 'farm', 'home'] }), '仲間の奉公人が店の品を壊した。自分がやったことにしてくれと頼まれた。', [
    ['cover', 'かばってやる', { tie: 3, sat: -2 }, '品を壊した奉公仲間をかばい、自分が番頭に叱られた。'], ['truth', '正直に話すよう言う', { sat: 1, tie: -1 }, '品を壊した奉公仲間に、番頭へ正直に話すよう言った。']]);
  c('s.tabi.osa', 'small', [1000, 1900], [15, 60], w({ mode: ['tabi'], kind: ANYK, ind: ['shop', 'craft', 'farm', 'office', 'home'] }), '一座の長が旅の途中で病に倒れた。しばらく一座をまとめてくれないかと頼まれた。', [
    ['take', 'まとめ役を引き受ける', { learn: 2, tie: 2, body: -1 }, '病に倒れた一座の長に代わって、しばらく一座をまとめた。'], ['wait', '長が治るまで宿で待とうと言う', { tie: 1 }, '一座の長の病が治るまで、皆で宿にとどまって待った。']]);
  c('s.hei.tegami', 'small', [1868, 1945], [17, 45], w({ mode: ['hei'], kind: ANYK, ind: ['shop', 'craft', 'farm', 'office', 'fish', 'home'] }), '国元へ便りを書く日。戦地のつらさを正直に書くか、元気だと書くか。', [
    ['true', 'つらさも正直に書く', { tie: 1, sat: 1 }, '国元への便りに、戦地のつらさも正直に書いた。'], ['fine', '心配させないよう元気だと書く', { tie: 2, sat: -1 }, '国元への便りには、心配させないよう元気だと書いた。']]);
  // BEGIN LATE（40代からの小さな選択。data-src/choices-late.json から tools/build-choices-late.mjs で書き込む。手で直さない）
  var LATE = [{"id":"late.atotsugi.1","kind":"small","y":[1000,1332],"a":[45,65],"when":{"kind":["village","fish"],"ind":["farm"],"hasChild":true},"text":"田植えの段取りを決める時期が来た。今年から{child}に田の指図を任せてはどうかと、村の年寄りが言う。","options":[{"k":"yuzuru","l":"田の指図を{child}に任せる","fx":{"tie":2,"sat":1,"body":1},"after":"田の指図は、この年から{child}に任せることにした。"},{"k":"mada","l":"まだ自分で田の指図をとる","fx":{"sat":1,"learn":1,"body":-1},"after":"田の指図は、もうしばらく自分でとることにした。"}]},{"id":"late.nenbutsu.1","kind":"small","y":[1000,1332],"a":[55,90],"when":{"kind":["village","fish","town"],"ind":["home"]},"text":"村に念仏の講ができた。月に一度、堂に集まって夜通し念仏を唱えるという。","options":[{"k":"ko","l":"講に加わって念仏を唱える","fx":{"tie":2,"sat":1,"body":-1},"after":"念仏の講に加わり、月に一度夜通し念仏を唱えた。"},{"k":"hitori","l":"家でひとり念仏を唱える","fx":{"sat":1,"learn":1},"after":"念仏の講には加わらず、家でひとり念仏を唱えた。"}]},{"id":"late.kumano.1","kind":"small","y":[1000,1332],"a":[45,75],"when":{"kind":["village","fish","town"],"ind":["home"]},"text":"熊野詣の一行が村を通りかかった。先達が、一緒に来ないかと声をかけてきた。","options":[{"k":"go","l":"熊野詣の一行に加わる","fx":{"sat":3,"learn":1,"body":-2},"after":"先達に連れられて、熊野詣の長い山道を歩き通した。"},{"k":"rusu","l":"熊野へは行かず留守を守る","fx":{"tie":1,"body":1},"after":"熊野詣の誘いは断り、家の留守を守ることにした。"}]},{"id":"late.engumi.1","kind":"small","y":[1000,1332],"a":[40,60],"when":{"kind":["village","fish","town","city"],"ind":["home"],"hasChild":true},"text":"{child}に縁談が来た。相手は隣の荘の、田の多い家だという。","options":[{"k":"susumu","l":"隣の荘との縁談を進める","fx":{"tie":3,"sat":-1},"after":"{child}の縁談は、隣の荘の家と進めることにした。"},{"k":"kiku","l":"{child}の気持ちを聞いてから決める","fx":{"tie":1,"learn":1,"sat":1},"after":"{child}の縁談は、本人の気持ちを聞いてから決めることにした。"}]},{"id":"late.yakusou.1","kind":"small","y":[1000,1332],"a":[50,90],"when":{"kind":["village","fish"],"ind":["home"]},"text":"このところ、朝になると膝が痛んで歩きにくい。山あいに、よく温まる湯が湧いていると聞いた。","options":[{"k":"yu","l":"山あいの湯に浸かりに行く","fx":{"body":3,"sat":1,"tie":-1},"after":"膝の痛みを癒やしに、山あいの湯に何日か浸かった。"},{"k":"kusa","l":"薬草を煎じて家で養生する","fx":{"body":1,"learn":1},"after":"膝の痛みには、薬草を煎じて家で養生することにした。"}]},{"id":"late.funado.1","kind":"small","y":[1000,1332],"a":[45,70],"when":{"kind":["fish"],"ind":["fish"]},"text":"長年乗ってきた舟の底が、あちこち傷んできた。","options":[{"k":"new","l":"蓄えをはたいて新しい舟を造らせる","fx":{"sat":2,"body":1,"tie":-1},"after":"蓄えをはたいて、新しい舟を浜の舟大工に造らせた。"},{"k":"fix","l":"古い舟を繕って使い続ける","fx":{"learn":1,"tie":1,"sat":-1},"after":"古い舟は自分で繕って、もうしばらく使うことにした。"}]},{"id":"late.ichi.1","kind":"small","y":[1000,1332],"a":[40,65],"when":{"kind":["town","city"],"ind":["shop"]},"text":"市の座の長が、座の取りまとめ役を引き受けてくれないかと言ってきた。","options":[{"k":"yes","l":"座の取りまとめ役を引き受ける","fx":{"tie":3,"body":-1},"after":"市の座の取りまとめ役を引き受け、商いの決まりをまとめた。"},{"k":"no","l":"商いが忙しいと断る","fx":{"sat":1,"tie":-1},"after":"市の座の取りまとめ役は、商いが忙しいと言って断った。"}]},{"id":"late.kuge.1","kind":"small","y":[1000,1332],"a":[45,80],"when":{"kind":["village","fish","town","city"],"ind":["office"]},"text":"若い公達が、宮中の行事のしきたりを教えてほしいと通ってくるようになった。","options":[{"k":"oshieru","l":"しきたりを書き留めて教える","fx":{"learn":2,"tie":2,"body":-1},"after":"若い公達のために、宮中のしきたりを書き留めて教えた。"},{"k":"kasu","l":"家に伝わる古い記録を貸す","fx":{"sat":1,"learn":1},"after":"若い公達には、宮中のしきたりを記した古い記録を貸した。"}]},{"id":"late.bushi.1","kind":"small","y":[1000,1332],"a":[50,75],"when":{"kind":["village","fish","town","city"],"ind":["bushi"],"hasChild":true},"text":"主の館の番役が回ってきた。夜通しの見張りが、近ごろは体にこたえる。","options":[{"k":"yuzuru","l":"館の番役を{child}に譲る","fx":{"tie":2,"body":2,"sat":-1},"after":"主の館の番役は、この年から{child}に譲ることにした。"},{"k":"tsutomeru","l":"老いても番役を務める","fx":{"tie":1,"sat":1,"body":-2},"after":"老いた身でも、主の館の番役を自分で務め続けた。"}]},{"id":"late.wakeru.1","kind":"small","y":[1000,1332],"a":[60,95],"when":{"kind":["village","fish","town","city"],"ind":["home"],"hasChild":true},"text":"田や家財を、亡きあと子らにどう分けるか、そろそろ決めておかねばならない。","options":[{"k":"matome","l":"家を継ぐ子にまとめて譲る","fx":{"sat":1,"tie":-1},"after":"田や家財は、家を継ぐ子にまとめて譲ると決めた。"},{"k":"hitoshiku","l":"子らに等しく分ける","fx":{"tie":2,"sat":-1},"after":"田や家財は、子らに等しく分けると決めて言い渡した。"}]},{"id":"late.ubuyashinai.1","kind":"small","y":[1000,1332],"a":[50,85],"when":{"kind":["village","fish","town","city"],"ind":["home"],"hasChild":true},"text":"{child}に子が生まれた。産養の祝いに、何を贈ろうか。","options":[{"k":"ubugi","l":"産着を手ずから縫って贈る","fx":{"tie":3,"body":-1},"after":"孫の産養の祝いに、手ずから縫った産着を贈った。"},{"k":"mochi","l":"米と餅をたっぷり届ける","fx":{"sat":1,"tie":1},"after":"孫の産養の祝いに、米と餅をたっぷり届けた。"}]},{"id":"late.seki.1","kind":"small","y":[1000,1332],"a":[45,70],"when":{"kind":["village"],"ind":["farm"]},"text":"大雨で用水の堰が崩れた。村の年寄りたちが、修理の差配をしてほしいと言う。","options":[{"k":"sahai","l":"堰の修理を取り仕切る","fx":{"tie":3,"learn":1,"body":-2},"after":"崩れた堰の修理を取り仕切り、村の者を集めて直した。"},{"k":"makaseru","l":"若い者に任せて見守る","fx":{"sat":1,"tie":-1},"after":"堰の修理は若い者に任せて、口を出さずに見守った。"}]},{"id":"late.haka.1","kind":"small","y":[1000,1332],"a":[65,100],"when":{"kind":["village","fish","town","city"],"ind":["home"]},"text":"近ごろ、亡きあとのことをよく考える。どこに葬られたいか、家の者に伝えておこうか。","options":[{"k":"yama","l":"先祖の眠る山に葬ってほしいと言う","fx":{"tie":2,"sat":1},"after":"亡きあとは先祖の眠る山に葬ってほしいと、家の者に伝えた。"},{"k":"tera","l":"寺に亡きあとの供養を頼む","fx":{"learn":1,"sat":1,"tie":-1},"after":"自分の亡きあとの供養を、寺に頼んでおくことにした。"}]},{"id":"late.hata.1","kind":"small","y":[1000,1332],"a":[45,80],"when":{"sex":"f","kind":["village","fish","town","city"],"ind":["home"]},"text":"家に来た若い嫁が、機の織り方を教えてほしいと言う。","options":[{"k":"oshieru","l":"機の織り方を一から教える","fx":{"tie":3,"body":-1},"after":"若い嫁に、機の織り方を一から手を取って教えた。"},{"k":"miru","l":"見て覚えなさいと言う","fx":{"sat":1,"learn":1,"tie":-1},"after":"機の織り方は、そばで見て覚えなさいと嫁に言った。"}]},{"id":"late.oomizu.1","kind":"small","y":[1000,1332],"a":[55,95],"when":{"kind":["village","fish"],"ind":["home"]},"text":"川があふれた年のことを思い出す。今年も雨が多い。米俵を高いところへ移しておくか。","options":[{"k":"utsusu","l":"米俵を高台の小屋に移す","fx":{"tie":1,"sat":1,"body":-1},"after":"大水に備えて、米俵を高台の小屋に移しておいた。"},{"k":"oku","l":"米俵はいつもの場所に置く","fx":{"body":1},"after":"大水の備えはせず、米俵はいつもの場所に置いたままにした。"}]},{"id":"late.imayou.1","kind":"small","y":[1000,1332],"a":[50,90],"when":{"kind":["town","city"],"ind":["home"]},"text":"近所に住む白拍子あがりの女が、今様の節回しを教えてくれるという。","options":[{"k":"narau","l":"今様を習いはじめる","fx":{"sat":2,"learn":2,"body":-1},"after":"今様を習いはじめ、仕事の合間に節回しを口ずさんだ。"},{"k":"kiku","l":"聞いて楽しむだけにする","fx":{"sat":1},"after":"今様の手ほどきは断り、聞いて楽しむだけにした。"}]},{"id":"late.oya.1","kind":"small","y":[1000,1332],"a":[40,62],"when":{"parentOld":true,"kind":["village","fish","town","city"],"ind":["home"]},"text":"{mom}が寝つくことが多くなった。食も細くなっている。","options":[{"k":"kanbyo","l":"{mom}のそばで看病する","fx":{"tie":3,"sat":-1,"body":-1},"after":"寝つきがちな{mom}のそばで、夜も看病を続けた。"},{"k":"kaji","l":"僧を呼んで加持を頼む","fx":{"tie":1,"learn":1,"sat":-1},"after":"寝つきがちな{mom}のために、僧を呼んで加持を頼んだ。"}]},{"id":"late.ie.1","kind":"small","y":[1000,1332],"a":[40,60],"when":{"kind":["village","fish","town","city"],"ind":["home"]},"text":"家の柱が傷んで、屋根が少し傾いてきた。","options":[{"k":"tatenaosu","l":"家を建て直す","fx":{"sat":2,"body":-1,"tie":-1},"after":"傷んだ家を、思いきって建て直すことにした。"},{"k":"hashira","l":"柱だけ取り替える","fx":{"learn":1,"sat":-1},"after":"傷んだ家は建て直さず、柱だけを取り替えてしのいだ。"}]},{"id":"late.sakai.1","kind":"small","y":[1000,1332],"a":[80,100],"when":{"kind":["village","fish"],"ind":["home"]},"text":"村の若い者が、隣村との古い境の由来を聞きに来た。覚えているのは、もう自分くらいだという。","options":[{"k":"kataru","l":"覚えている限りを語る","fx":{"tie":2,"learn":1},"after":"村の古い境の由来を、覚えている限り語って聞かせた。"},{"k":"tashikame","l":"寺の僧にも確かめるよう勧める","fx":{"learn":2},"after":"村の古い境の由来は、寺の僧にも確かめるよう勧めた。"}]},{"id":"late.ha.1","kind":"small","y":[1000,1332],"a":[80,100],"when":{"kind":["village","fish","town","city"],"ind":["home"]},"text":"歯がほとんど抜けて、固いものが噛めなくなった。","options":[{"k":"kayu","l":"粥ばかりの膳にしてもらう","fx":{"body":1,"sat":-1},"after":"歯が抜けてからは、粥ばかりの膳にしてもらった。"},{"k":"kizamu","l":"固い物を細かく刻んで食べる","fx":{"sat":2,"body":-1},"after":"歯が抜けても、固い物を細かく刻んで食べ続けた。"}]},{"id":"late.uijin.2","kind":"small","y":[1333,1602],"a":[45,70],"when":{"kind":["village","fish","town","city"],"ind":["bushi"],"hasChild":true},"text":"戦が続いている。{child}が、次の戦で初陣に出たいと言い出した。","options":[{"k":"yurusu","l":"{child}の初陣を許す","fx":{"tie":1,"sat":1,"body":-1},"after":"{child}の初陣を許し、自分の古い具足を着せて送り出した。"},{"k":"matase","l":"初陣はもう一年待たせる","fx":{"tie":2,"sat":-1},"after":"{child}の初陣は、もう一年待たせることにした。"}]},{"id":"late.dojo.2","kind":"small","y":[1333,1602],"a":[50,85],"when":{"kind":["village","fish","town"],"ind":["home"]},"text":"村に一向宗の道場ができ、近所の衆から講に来ないかと誘われた。","options":[{"k":"kayou","l":"道場の講に通う","fx":{"tie":3,"sat":1,"body":-1},"after":"道場の講に通い、念仏仲間と語り合うようになった。"},{"k":"giri","l":"先祖の寺への義理を通す","fx":{"tie":1,"learn":1},"after":"道場の誘いは断り、先祖代々の寺への義理を通した。"}]},{"id":"late.otona.2","kind":"small","y":[1333,1602],"a":[50,75],"when":{"kind":["village"],"ind":["farm"]},"text":"惣の寄り合いで、乙名のひとりに選ばれた。","options":[{"k":"ukeru","l":"乙名の役目を受ける","fx":{"tie":3,"learn":1,"body":-1},"after":"惣の乙名の役目を受け、寄り合いを取りまとめた。"},{"k":"jitai","l":"年を理由に乙名を辞退する","fx":{"body":1,"tie":-1},"after":"惣の乙名の役目は、年を理由に丁重に辞退した。"}]},{"id":"late.fushin.2","kind":"small","y":[1333,1602],"a":[40,65],"when":{"sex":"m","kind":["village","fish"],"ind":["home"],"hasChild":true},"text":"領主から、城の普請に家ごとに一人出せとのお達しが来た。","options":[{"k":"jibun","l":"自分が普請に出る","fx":{"tie":1,"sat":1,"body":-2},"after":"城の普請には、{child}を家に残して自分が出た。"},{"k":"ko","l":"{child}を普請に出す","fx":{"body":1,"tie":-1},"after":"城の普請には、{child}を代わりに出すことにした。"}]},{"id":"late.tedai.2","kind":"small","y":[1333,1602],"a":[45,70],"when":{"kind":["town","city"],"ind":["shop"]},"text":"長年よく働いてくれた手代が、独り立ちして店を持ちたいと言ってきた。","options":[{"k":"wakeru","l":"得意先を少し分けてやる","fx":{"tie":3,"sat":-2},"after":"独り立ちする手代に、店の得意先を少し分けてやった。"},{"k":"hikitome","l":"引き止めて店に残ってもらう","fx":{"sat":1,"tie":-1},"after":"独り立ちしたいという手代を引き止め、店に残ってもらった。"}]},{"id":"late.teppo.2","kind":"small","y":[1550,1602],"a":[45,70],"when":{"kind":["town","city"],"ind":["craft"]},"text":"港町から来た商人が、鉄砲の筒を打ってみないかと持ちかけてきた。","options":[{"k":"utsu","l":"鉄砲の筒を打ってみる","fx":{"learn":3,"sat":1,"body":-2},"after":"新しい鉄砲の筒を、見よう見まねで打ってみた。"},{"k":"kuwa","l":"慣れた鍬や鎌を打ち続ける","fx":{"sat":1,"tie":1},"after":"鉄砲の筒の話は断り、慣れた鍬や鎌を打ち続けた。"}]},{"id":"late.seisatsu.2","kind":"small","y":[1333,1602],"a":[55,90],"when":{"kind":["village","fish"],"ind":["home"]},"text":"隣の国の軍勢が近づいているという噂が流れた。村の衆が、年寄りの考えを聞きに来た。","options":[{"k":"kakure","l":"山の隠れ場に米を運ばせる","fx":{"body":1,"tie":1,"sat":-1},"after":"戦に備えて、村の衆と山の隠れ場に米を運んだ。"},{"k":"reisen","l":"礼銭を払って制札をもらう","fx":{"tie":2,"sat":-2},"after":"村の衆と礼銭を出し合い、軍勢から乱暴をしない約束の制札をもらった。"}]},{"id":"late.cha.2","kind":"small","y":[1333,1602],"a":[45,80],"when":{"kind":["town","city"],"ind":["home"]},"text":"町の衆の間で茶の湯がはやっている。知り合いが、茶会に来ないかと誘ってくれた。","options":[{"k":"narau","l":"茶の湯を習いはじめる","fx":{"learn":2,"tie":2,"sat":-1},"after":"茶の湯を習いはじめ、茶道具を少しずつ揃えた。"},{"k":"kotowaru","l":"茶は飲めれば十分と断る","fx":{"sat":1},"after":"茶の湯の誘いは、茶は飲めれば十分と断った。"}]},{"id":"late.engumi.2","kind":"small","y":[1333,1602],"a":[40,60],"when":{"kind":["village","fish","town","city"],"ind":["home"],"hasChild":true},"text":"{child}に縁談が来た。相手は人柄はよいが、家の格がこちらより低い。","options":[{"k":"hitogara","l":"家柄より人柄で縁談を受ける","fx":{"tie":2,"sat":1},"after":"{child}の縁談は、家柄より人柄を見て受けることにした。"},{"k":"sagasu","l":"釣り合う家を探し直す","fx":{"learn":1,"tie":-1},"after":"{child}の縁談は断り、釣り合う家を探し直すことにした。"}]},{"id":"late.koya.2","kind":"small","y":[1333,1602],"a":[60,95],"when":{"kind":["village","fish","town"],"ind":["home"]},"text":"高野聖が村を回ってきた。亡きあと、骨の一部を高野山に納めてやると言う。","options":[{"k":"azukeru","l":"高野聖に納骨を頼んでおく","fx":{"sat":2,"tie":-1},"after":"高野聖に銭を渡し、亡きあとの高野山への納骨を頼んだ。"},{"k":"mura","l":"村の墓に家族と眠ると決める","fx":{"tie":2},"after":"高野山への納骨は断って、村の墓に家族と眠ると決めた。"}]},{"id":"late.ami.2","kind":"small","y":[1333,1602],"a":[45,75],"when":{"kind":["fish"],"ind":["fish"],"hasChild":true},"text":"浜の網の頭を、そろそろ{child}に任せてはどうかと仲間が言う。","options":[{"k":"makaseru","l":"網の頭を{child}に任せる","fx":{"tie":2,"body":1},"after":"浜の網の頭を、この年から{child}に任せることにした。"},{"k":"shikiru","l":"まだ自分が網を仕切る","fx":{"sat":1,"learn":1,"body":-1},"after":"浜の網は、もうしばらく自分が仕切ることにした。"}]},{"id":"late.shio.2","kind":"small","y":[1333,1602],"a":[40,70],"when":{"kind":["fish"],"ind":["home"]},"text":"浜で塩を焼いている仲間から、釜の番に加わらないかと誘われた。","options":[{"k":"kuwawaru","l":"塩焼きの仲間に入る","fx":{"sat":2,"tie":1,"body":-2},"after":"浜の塩焼きの仲間に入り、釜の火の番を覚えた。"},{"k":"ryo","l":"漁ひとすじを通す","fx":{"learn":1,"body":1},"after":"塩焼きの誘いは断り、これまでどおり漁ひとすじを通した。"}]},{"id":"late.megusuri.2","kind":"small","y":[1333,1602],"a":[50,90],"when":{"kind":["village","fish","town"],"ind":["home"]},"text":"目がかすむようになった。村に来た薬売りが、よく治るという目薬を勧めてくる。","options":[{"k":"kau","l":"薬売りの目薬を買う","fx":{"body":2,"sat":-1},"after":"旅の薬売りから目薬を買い、毎晩目にさしてみた。"},{"k":"yasumu","l":"目を休めて夜の手仕事を減らす","fx":{"body":1,"tie":1,"sat":-1},"after":"目のかすみをいたわり、夜の手仕事を減らすことにした。"}]},{"id":"late.oboegaki.2","kind":"small","y":[1333,1602],"a":[55,85],"when":{"kind":["village","fish","town","city"],"ind":["bushi"]},"text":"隠居の身になり、若いころの戦の手柄を書き残してはどうかと勧められた。","options":[{"k":"kaku","l":"戦の覚え書きを書き残す","fx":{"learn":3,"sat":1,"body":-1},"after":"若いころの戦の覚え書きを、子孫のために書き残した。"},{"k":"kataranu","l":"昔の手柄は語らずにおく","fx":{"tie":1,"sat":1},"after":"昔の戦の手柄は、誰にも語らずにおくことにした。"}]},{"id":"late.kishin.2","kind":"small","y":[1333,1602],"a":[50,85],"when":{"kind":["village","fish","town","city"],"ind":["home"]},"text":"寺が本堂を建て直すという。隠居のためにためてきた銭がいくらかある。","options":[{"k":"kishin","l":"蓄えの半分を寺に寄進する","fx":{"tie":3,"sat":-2},"after":"隠居のための蓄えの半分を、寺の本堂の普請に寄進した。"},{"k":"nokosu","l":"蓄えは家の者に残す","fx":{"sat":1,"tie":1},"after":"寺への寄進は少しにして、隠居の蓄えは家の者に残した。"}]},{"id":"late.ryukotsu.2","kind":"small","y":[1333,1602],"a":[40,65],"when":{"kind":["village"],"ind":["farm"]},"text":"村の寄り合いで、川の水を田に揚げる竜骨車を買わないかという話が出た。","options":[{"k":"kau","l":"銭を出し合って竜骨車を買う","fx":{"tie":2,"body":1,"sat":-1},"after":"村の衆と銭を出し合い、水を揚げる竜骨車を買った。"},{"k":"oke","l":"桶で水を汲むやり方を続ける","fx":{"sat":1,"body":-1},"after":"竜骨車は買わず、桶で田に水を汲むやり方を続けた。"}]},{"id":"late.renga.2","kind":"small","y":[1333,1602],"a":[40,60],"when":{"kind":["town","city"],"ind":["home"],"hasChild":true},"text":"{child}が、町の連歌の会に通いたいと言い出した。師への礼もいる。","options":[{"k":"dasu","l":"連歌の師への礼を出してやる","fx":{"tie":2,"learn":1,"sat":-1},"after":"{child}のために、連歌の師への礼を出してやった。"},{"k":"kagyo","l":"家業が先だと言い聞かせる","fx":{"sat":1,"tie":-1},"after":"連歌の会より家業が先だと、{child}に言い聞かせた。"}]},{"id":"late.inkyosho.2","kind":"small","y":[1333,1602],"a":[40,62],"when":{"parentOld":true,"kind":["village","fish","town","city"],"ind":["home"]},"text":"{dad}が、敷地の隅に小さな隠居所を建ててほしいと言い出した。","options":[{"k":"tateru","l":"敷地の隅に隠居所を建てる","fx":{"tie":3,"sat":-2},"after":"{dad}のために、敷地の隅に小さな隠居所を建てた。"},{"k":"onaji","l":"同じ屋根の下で暮らしてもらう","fx":{"tie":1,"sat":1},"after":"隠居所は建てず、{dad}には同じ屋根の下で暮らしてもらった。"}]},{"id":"late.tsue.2","kind":"small","y":[1333,1602],"a":[80,100],"when":{"kind":["village","fish","town"],"ind":["home"]},"text":"足が弱って、村の坂道を上るのがつらくなってきた。","options":[{"k":"tsue","l":"竹の杖を作ってもらう","fx":{"body":2,"sat":-1},"after":"家の者に竹の杖を作ってもらい、また坂道を歩くようになった。"},{"k":"iji","l":"杖はいらぬと意地を張る","fx":{"sat":1,"body":-2},"after":"杖はいらぬと意地を張り、坂道を杖なしで歩き続けた。"}]},{"id":"late.noren.3","kind":"small","y":[1603,1867],"a":[50,75],"when":{"kind":["town","city"],"ind":["shop"]},"text":"長年仕えてくれた番頭も、もう四十を過ぎた。そろそろ暖簾を分けてやる頃合いだ。","options":[{"k":"wakeru","l":"番頭に暖簾分けをする","fx":{"tie":3,"sat":-1},"after":"長年仕えた番頭に、店の暖簾を分けてやった。"},{"k":"nobasu","l":"もう数年、店に残ってもらう","fx":{"sat":1,"tie":-1},"after":"暖簾分けは先に延ばし、番頭にもう数年残ってもらった。"}]},{"id":"late.yoshi.3","kind":"small","y":[1603,1867],"a":[45,70],"when":{"kind":["town","city"],"ind":["shop","craft"],"hasChild":true},"text":"{child}は家業を継ぐ気がないらしい。親戚が、腕のいい職人を養子に迎えてはどうかと言う。","options":[{"k":"mukaeru","l":"腕のいい職人を養子に迎える","fx":{"sat":2,"learn":1,"tie":-1},"after":"家業の跡継ぎに、腕のいい職人を養子として迎えた。"},{"k":"matsu","l":"{child}の気が変わるのを待つ","fx":{"tie":2,"sat":-1},"after":"家業の跡継ぎは、{child}の気が変わるのを待つことにした。"}]},{"id":"late.kompira.3","kind":"small","y":[1603,1867],"a":[45,75],"when":{"kind":["village","fish","town","city"],"ind":["home"]},"text":"講の仲間が、そろって金毘羅参りに出るという。積み立ての番が回ってきた。","options":[{"k":"go","l":"講の仲間と金毘羅参りに出る","fx":{"sat":3,"tie":2,"body":-2},"after":"講の仲間と連れ立って、金毘羅参りの旅に出た。"},{"k":"daisan","l":"代参を頼んでお札をもらう","fx":{"sat":1},"after":"金毘羅参りは代参を頼み、お札だけ受けてきてもらった。"}]},{"id":"late.kumigashira.3","kind":"small","y":[1603,1867],"a":[45,70],"when":{"kind":["village"],"ind":["farm"]},"text":"庄屋から、村の組頭を引き受けてくれないかと頼まれた。","options":[{"k":"ukeru","l":"組頭を引き受ける","fx":{"tie":3,"learn":1,"body":-2},"after":"庄屋の頼みで、村の組頭の役を引き受けた。"},{"k":"yuzuru","l":"組頭は若い者に譲る","fx":{"body":1,"tie":-1},"after":"村の組頭の役は、若い者に譲って辞退した。"}]},{"id":"late.senba.3","kind":"small","y":[1700,1867],"a":[40,65],"when":{"kind":["village"],"ind":["farm"]},"text":"隣村で、千歯扱きという新しい稲こきの道具が使われはじめた。","options":[{"k":"kau","l":"千歯扱きを買い入れる","fx":{"body":2,"sat":1,"tie":-1},"after":"新しい千歯扱きを買い入れ、稲こきが早く済むようになった。"},{"k":"hashi","l":"扱き箸での稲こきを続ける","fx":{"tie":1,"body":-1},"after":"千歯扱きは買わず、扱き箸での稲こきを続けた。"}]},{"id":"late.asagao.3","kind":"small","y":[1800,1867],"a":[55,90],"when":{"kind":["city"],"ind":["home"]},"text":"町では、変わり咲きの朝顔作りがはやっている。隣の隠居が、種を分けてくれるという。","options":[{"k":"sodateru","l":"変わり朝顔の鉢を育ててみる","fx":{"sat":2,"learn":2,"tie":-1},"after":"変わり朝顔の鉢を並べ、咲き具合を毎朝書き留めた。"},{"k":"kenbutsu","l":"人の鉢を見物するだけにする","fx":{"tie":1,"sat":1},"after":"朝顔作りはせず、縁台で人の鉢を見物して楽しんだ。"}]},{"id":"late.dozo.3","kind":"small","y":[1603,1867],"a":[50,90],"when":{"kind":["town","city"],"ind":["home"]},"text":"冬になって火事が続いている。大事な帳面と着物を、どうしておこうか。","options":[{"k":"dozo","l":"大事な物を土蔵に預ける","fx":{"sat":1,"tie":1},"after":"火事に備えて、大事な帳面と着物を知り合いの土蔵に預けた。"},{"k":"hikeshi","l":"町の火消しに寄付をする","fx":{"tie":2,"sat":-1},"after":"火事に備えて、町の火消しの組にまとまった寄付をした。"}]},{"id":"late.engumi.3","kind":"small","y":[1603,1867],"a":[40,60],"when":{"kind":["village","fish","town","city"],"ind":["home"],"hasChild":true},"text":"{child}の縁組がまとまりかけている。相手方から、それなりの支度を整えてほしいと言われた。","options":[{"k":"totonoeru","l":"借りてでも縁組の支度を整える","fx":{"tie":3,"sat":-3},"after":"{child}の縁組のため、借りてでも支度を整えた。"},{"k":"minotake","l":"身の丈に合った支度で頼み込む","fx":{"sat":1,"tie":-1},"after":"{child}の縁組の支度は、身の丈に合う分だけにしてもらった。"}]},{"id":"late.kaimyo.3","kind":"small","y":[1603,1867],"a":[60,95],"when":{"kind":["village","fish","town","city"],"ind":["home"]},"text":"菩提寺の住職が、生きているうちに戒名を授けようと言ってくれた。","options":[{"k":"sazukaru","l":"寄進をして生前に戒名を授かる","fx":{"tie":2,"sat":1,"learn":-1},"after":"住職に寄進をして、生きているうちに戒名を授かった。"},{"k":"ato","l":"戒名は死んでからでよいと断る","fx":{"sat":1,"learn":1},"after":"戒名は死んでからでよいと、住職の勧めを断った。"}]},{"id":"late.toji.3","kind":"small","y":[1603,1867],"a":[50,90],"when":{"married":true,"kind":["village","fish","town","city"],"ind":["home"]},"text":"{spouse}と、ひと月ほど湯治に出ようかと話している。","options":[{"k":"go","l":"{spouse}と湯治に出る","fx":{"body":3,"tie":2,"sat":-2},"after":"{spouse}と二人で、ひと月ほど湯治の旅に出かけた。"},{"k":"yame","l":"湯治はやめて家業を見る","fx":{"sat":1,"body":-1},"after":"湯治はとりやめて、家業の様子を見ていることにした。"}]},{"id":"late.minarai.3","kind":"small","y":[1603,1867],"a":[50,75],"when":{"kind":["village","fish","town","city"],"ind":["bushi"],"hasChild":true},"text":"上役から、{child}を役目の見習いとして城に上げてはどうかと言われた。","options":[{"k":"ageru","l":"{child}を見習いとして城に上げる","fx":{"tie":2,"sat":1,"learn":-1},"after":"{child}を、自分の役目の見習いとして城に上げた。"},{"k":"gakumon","l":"先に学問を積ませる","fx":{"learn":2,"tie":-1},"after":"{child}の城勤めは急がず、先に学問を積ませることにした。"}]},{"id":"late.ooami.3","kind":"small","y":[1603,1867],"a":[45,70],"when":{"kind":["fish"],"ind":["fish"]},"text":"網元が、新しい大網を仕立てるので仲間に入れという。","options":[{"k":"hairu","l":"大網の仲間に入る","fx":{"sat":2,"tie":2,"body":-2},"after":"網元の大網の仲間に入り、浜の衆と網を引いた。"},{"k":"ipponzuri","l":"一本釣りを続ける","fx":{"sat":1,"learn":1},"after":"大網には加わらず、昔ながらの一本釣りを続けた。"}]},{"id":"late.tenarai.3","kind":"small","y":[1603,1867],"a":[55,85],"when":{"kind":["town","city"],"ind":["home"]},"text":"近所の親たちが、隠居の身なら子どもたちの手習いを見てやってほしいと言う。","options":[{"k":"miru","l":"縁側で手習いを見てやる","fx":{"tie":3,"learn":1,"body":-1},"after":"近所の子らを縁側に集め、手習いを見てやった。"},{"k":"niga","l":"年寄りには荷が勝つと断る","fx":{"body":1,"tie":-1},"after":"子らの手習いの世話は、年寄りには荷が勝つと断った。"}]},{"id":"late.oya.3","kind":"small","y":[1603,1867],"a":[40,62],"when":{"parentOld":true,"kind":["village","fish","town","city"],"ind":["home"]},"text":"{mom}の足腰が弱って、ひとりでは厠へも行けなくなった。","options":[{"k":"sewa","l":"仕事を減らして{mom}の世話をする","fx":{"tie":3,"sat":-2},"after":"仕事を減らして、足腰の弱った{mom}の世話をした。"},{"k":"tanomu","l":"近所の後家に世話を頼む","fx":{"sat":1,"tie":-1},"after":"足腰の弱った{mom}の世話を、近所の後家に頼んだ。"}]},{"id":"late.hikkoshi.3","kind":"small","y":[1603,1867],"a":[55,85],"when":{"kind":["city"],"ind":["home"]},"text":"隠居したら、町はずれの静かな家に移らないかと知り合いが勧めてくれた。","options":[{"k":"utsuru","l":"町はずれの隠居家に移る","fx":{"body":2,"sat":1,"tie":-2},"after":"隠居して、町はずれの静かな家に移り住んだ。"},{"k":"nagaya","l":"なじみの長屋に住み続ける","fx":{"tie":2},"after":"隠居しても町はずれへは移らず、なじみの長屋に住み続けた。"}]},{"id":"late.deshi.3","kind":"small","y":[1603,1867],"a":[45,75],"when":{"kind":["town","city"],"ind":["craft"]},"text":"弟子のひとりが、年季が明けたので独り立ちしたいと言ってきた。","options":[{"k":"dogu","l":"弟子に道具を譲って送り出す","fx":{"tie":3,"sat":-1},"after":"独り立ちする弟子に、愛用の道具を譲って送り出した。"},{"k":"oreibouko","l":"お礼奉公をあと一年させる","fx":{"sat":1,"learn":1,"tie":-1},"after":"独り立ちしたいという弟子に、お礼奉公をあと一年させた。"}]},{"id":"late.kakioki.3","kind":"small","y":[1603,1867],"a":[65,100],"when":{"kind":["village","fish","town","city"],"ind":["home"],"hasChild":true},"text":"家の財産の分け方を、書き置きにしておくかどうか迷っている。","options":[{"k":"kaku","l":"財産の分け方を書き置きにする","fx":{"tie":1,"learn":1,"sat":1},"after":"家の財産の分け方を、書き置きにして残した。"},{"k":"hanashiai","l":"子らの話し合いに任せる","fx":{"tie":2,"sat":-1},"after":"家の財産の分け方は、子らの話し合いに任せることにした。"}]},{"id":"late.matsuri.3","kind":"small","y":[1603,1867],"a":[60,95],"when":{"kind":["village"],"ind":["home"]},"text":"秋祭りの世話役の長老として、凶作続きの年の祭りをどうするか決めることになった。","options":[{"k":"kiritsumeru","l":"祭りの費えを切り詰める","fx":{"tie":1,"learn":1,"sat":-1},"after":"凶作続きなので、秋祭りの費えを切り詰めることにした。"},{"k":"seidai","l":"例年どおり祭りを盛大にする","fx":{"sat":2,"tie":1,"body":-1},"after":"秋祭りは例年どおり、にぎやかに執り行うことにした。"}]},{"id":"late.ranpo.3","kind":"small","y":[1780,1867],"a":[50,90],"when":{"kind":["town","city"],"ind":["home"]},"text":"このところ胃の具合が悪い。町に、評判の蘭方医がいると聞いた。","options":[{"k":"ranpo","l":"評判の蘭方医に診てもらう","fx":{"body":2,"learn":1,"sat":-2},"after":"胃の具合を、町で評判の蘭方医に診てもらった。"},{"k":"kanpo","l":"昔なじみの漢方医にかかる","fx":{"body":1,"tie":1},"after":"胃の具合は、昔なじみの漢方医に診てもらった。"}]},{"id":"late.chouju.3","kind":"small","y":[1603,1867],"a":[80,100],"when":{"kind":["village","fish","town","city"],"ind":["home"]},"text":"長生きの者に、お上から褒美が下されると知らせが来た。","options":[{"k":"deru","l":"杖をついて褒美を受けに出る","fx":{"sat":2,"tie":1,"body":-1},"after":"長寿の褒美を受けに、杖をついて役所へ出向いた。"},{"k":"kawari","l":"家の者に代わりに受け取らせる","fx":{"body":1,"tie":1},"after":"長寿の褒美は、家の者に代わりに受け取ってもらった。"}]},{"id":"late.himago.3","kind":"small","y":[1603,1867],"a":[80,100],"when":{"kind":["village","fish","town","city"],"ind":["home"],"hasChild":true},"text":"ひ孫が生まれた。抱いてやってほしいと、孫が連れてきた。","options":[{"k":"daku","l":"ひ孫を抱いて子守唄を歌う","fx":{"tie":3,"sat":2,"body":-1},"after":"ひ孫を抱き、昔覚えた子守唄を歌ってやった。"},{"k":"nagameru","l":"落とすといけないと眺めるだけにする","fx":{"sat":1,"tie":1},"after":"ひ孫は、落とすといけないと眺めるだけにした。"}]},{"id":"late.kagura.3","kind":"small","y":[1603,1867],"a":[50,80],"when":{"kind":["village","fish","town","city"],"ind":["priest"]},"text":"社の神楽を舞える者が減ってきた。若い者に一から教え直すか。","options":[{"k":"oshieru","l":"神楽を一から教え直す","fx":{"tie":3,"learn":1,"body":-2},"after":"社の神楽の舞を、若い者に一から教え直した。"},{"k":"kakitomeru","l":"古い舞の手順を書き留める","fx":{"learn":2,"sat":1},"after":"社の神楽の舞の手順を、帳面に書き留めて残した。"}]},{"id":"late.songikai.4","kind":"small","y":[1889,1945],"a":[45,70],"when":{"kind":["village","fish"],"ind":["home"]},"text":"村の人たちから、村会議員に出てくれないかと推された。","options":[{"k":"deru","l":"村会議員に出る","fx":{"tie":3,"learn":1,"body":-2},"after":"推されて村会議員に出て、村の道普請に骨を折った。"},{"k":"jitai","l":"家の仕事を理由に辞退する","fx":{"body":1,"tie":-1},"after":"村会議員の話は、家の仕事を理由に辞退した。"}]},{"id":"late.denwa.4","kind":"small","y":[1900,1945],"a":[45,70],"when":{"kind":["town","city"],"ind":["shop"]},"text":"電話を引いた店が、遠くの問屋とじかに取り引きを始めたと聞いた。","options":[{"k":"hiku","l":"店に電話を引く","fx":{"learn":2,"tie":1,"sat":-1},"after":"店に電話を引き、遠くの問屋とも話せるようになった。"},{"k":"miokuru","l":"電話はまだ早いと見送る","fx":{"sat":1},"after":"店の電話は、まだ早いと見送ることにした。"}]},{"id":"late.gakko.4","kind":"small","y":[1880,1945],"a":[40,60],"when":{"kind":["village","fish","town","city"],"ind":["home"],"hasChild":true},"text":"{child}の担任の先生が、上の学校へ進ませてはどうかと言いに来た。","options":[{"k":"susumu","l":"家計を切り詰めて上の学校へやる","fx":{"tie":2,"learn":1,"sat":-2},"after":"家計を切り詰めて、{child}を上の学校へ進ませた。"},{"k":"kagyo","l":"家業を手伝わせる","fx":{"sat":1,"tie":-1},"after":"{child}は上の学校へはやらず、家業を手伝わせた。"}]},{"id":"late.jitensha.4","kind":"small","y":[1905,1945],"a":[45,70],"when":{"kind":["village","fish"],"ind":["home"]},"text":"隣町まで用足しに歩くのが骨になってきた。村でも自転車に乗る人が増えている。","options":[{"k":"kau","l":"思いきって自転車を買う","fx":{"sat":2,"learn":1,"body":-1},"after":"思いきって自転車を買い、隣町まで乗って行くようになった。"},{"k":"aruku","l":"歩いて通うほうが体によいと言う","fx":{"body":2},"after":"自転車は買わず、隣町まで歩いて通い続けた。"}]},{"id":"late.kanreki.4","kind":"small","y":[1868,1945],"a":[60,61],"when":{"kind":["village","fish","town","city"],"ind":["home"],"hasChild":true},"text":"還暦を迎えた。子らが、祝いの席を設けたいと言ってくれた。","options":[{"k":"iwau","l":"赤いちゃんちゃんこを着て祝ってもらう","fx":{"tie":3,"sat":1},"after":"還暦の祝いに、赤いちゃんちゃんこを着て皆に囲まれた。"},{"k":"shisso","l":"祝いは質素にと頼む","fx":{"sat":1,"tie":1},"after":"還暦の祝いは、家の者だけで質素にしてもらった。"}]},{"id":"late.goshi.4","kind":"small","y":[1906,1920],"a":[55,95],"when":{"kind":["village","fish"],"ind":["home"]},"text":"お上の決まりで、村の小さな祠を大きな神社にまとめることになったという。","options":[{"k":"tangan","l":"祠を残してほしいと嘆願する","fx":{"tie":2,"learn":1,"sat":-1},"after":"神社の合祀に反対し、村の祠を残してほしいと嘆願した。"},{"k":"shitagau","l":"お上の決めたことに従う","fx":{"sat":1,"tie":-1},"after":"神社の合祀には、お上の決めたことだと従った。"}]},{"id":"late.kisha.4","kind":"small","y":[1895,1945],"a":[50,80],"when":{"married":true,"kind":["town","city"],"ind":["home"]},"text":"{spouse}が、一度でいいから汽車に乗って温泉へ行ってみたいと言う。","options":[{"k":"go","l":"{spouse}と汽車で温泉へ行く","fx":{"sat":2,"tie":3,"body":-1},"after":"{spouse}と二人で、汽車に乗って温泉へ出かけた。"},{"k":"mago","l":"旅の費えを孫の着物に回す","fx":{"tie":2,"sat":-1},"after":"温泉旅行はやめ、旅の費えを孫の着物に回した。"}]},{"id":"late.kokusai.4","kind":"small","y":[1904,1945],"a":[50,80],"when":{"kind":["village","fish","town","city"],"ind":["home"]},"text":"町内の寄り合いで、お国のために国債を買ってほしいと勧められた。","options":[{"k":"kau","l":"勧められた国債を買う","fx":{"tie":1,"sat":-1},"after":"町内の勧めに応じて、蓄えから国債を買った。"},{"k":"temoto","l":"蓄えは手もとに置いておく","fx":{"sat":1,"tie":-1},"after":"国債は買わず、蓄えは手もとに置いておくことにした。"}]},{"id":"late.nyuin.4","kind":"small","y":[1890,1945],"a":[55,90],"when":{"kind":["town","city"],"ind":["home"]},"text":"胸を患って、咳と微熱が抜けない。医者は町の病院に入れと言う。","options":[{"k":"nyuin","l":"町の病院に入院する","fx":{"body":3,"sat":-2,"tie":-1},"after":"胸の病を治すため、町の病院にしばらく入院した。"},{"k":"ie","l":"家で家族に見守られて養生する","fx":{"body":1,"tie":1},"after":"胸の病は、家で家族に見守られて養生した。"}]},{"id":"late.kaiko.4","kind":"small","y":[1880,1940],"a":[40,65],"when":{"kind":["village"],"ind":["farm"]},"text":"繭の値が上がっている。桑畑を広げて、蚕を増やさないかと仲買人が言う。","options":[{"k":"fuyasu","l":"桑畑を広げて蚕を増やす","fx":{"sat":2,"learn":1,"body":-2},"after":"桑畑を広げ、蚕をこれまでの倍に増やした。"},{"k":"kome","l":"米作りを大事にする","fx":{"body":1,"tie":1},"after":"養蚕は増やさず、これまでどおり米作りを大事にした。"}]},{"id":"late.hatsudoki.4","kind":"small","y":[1910,1945],"a":[45,70],"when":{"kind":["fish"],"ind":["fish"]},"text":"浜にも、発動機つきの漁船が入ってきた。遠くの漁場まで行けるという。","options":[{"k":"kau","l":"借金をして発動機船を買う","fx":{"learn":2,"body":1,"sat":-1},"after":"借金をして、発動機つきの漁船を買い入れた。"},{"k":"ro","l":"櫓をこぐ舟で漁を続ける","fx":{"tie":1,"sat":1,"body":-1},"after":"発動機船は買わず、櫓をこぐ舟で漁を続けた。"}]},{"id":"late.shokutaku.4","kind":"small","y":[1900,1945],"a":[53,60],"when":{"job":true,"kind":["town","city"],"ind":["office"]},"text":"勤め先の決まりで、もうすぐ勤めを退く年になる。上役が、嘱託で残らないかと言ってくれた。","options":[{"k":"nokoru","l":"嘱託として勤めを続ける","fx":{"sat":1,"learn":1,"body":-1},"after":"勤めを退く年のあとも、嘱託として勤めを続けることにした。"},{"k":"hikkomu","l":"勤めを辞めて田舎に引っこむ","fx":{"body":2,"tie":1,"sat":-1},"after":"勤めを退く年に辞め、田舎に引っこむことにした。"}]},{"id":"late.nazuke.4","kind":"small","y":[1868,1945],"a":[50,85],"when":{"kind":["village","fish","town","city"],"ind":["home"],"hasChild":true},"text":"{child}から、生まれた子の名を考えてほしいと頼まれた。","options":[{"k":"senzo","l":"先祖の名から一字とる","fx":{"tie":2,"learn":1},"after":"孫の名に、先祖代々の名から一字をとって贈った。"},{"k":"hayari","l":"近ごろ流行りの名を選ぶ","fx":{"sat":2},"after":"孫の名には、近ごろ流行りの響きのよい名を選んだ。"}]},{"id":"late.tonarigumi.4","kind":"small","y":[1940,1945],"a":[45,70],"when":{"kind":["village","fish","town","city"],"ind":["home"]},"text":"隣組の組長を引き受けてくれないかと言われた。配給の割り振りもする役だ。","options":[{"k":"ukeru","l":"隣組の組長を引き受ける","fx":{"tie":2,"body":-2,"sat":-1},"after":"隣組の組長を引き受け、配給の割り振りに走り回った。"},{"k":"kotowaru","l":"体が弱いと組長を断る","fx":{"body":1,"tie":-2},"after":"隣組の組長の話は、体が弱いと言って断った。"}]},{"id":"late.sekito.4","kind":"small","y":[1868,1945],"a":[60,95],"when":{"kind":["village","fish"],"ind":["home"]},"text":"先祖の墓が土を盛っただけのままになっている。石塔を建てる家が増えてきた。","options":[{"k":"tateru","l":"先祖の墓に石塔を建てる","fx":{"tie":3,"sat":-2},"after":"先祖の墓に、名を刻んだ立派な石塔を建てた。"},{"k":"mamoru","l":"昔ながらの墓を守り続ける","fx":{"sat":1,"learn":1},"after":"先祖の墓は建て替えず、昔ながらの形で守り続けた。"}]},{"id":"late.radio.4","kind":"small","y":[1926,1945],"a":[50,90],"when":{"kind":["town","city"],"ind":["home"]},"text":"近所の家がラジオを買った。浪曲や相撲の中継が家にいて聞けるという。","options":[{"k":"kau","l":"ラジオを買って家族で聴く","fx":{"tie":2,"learn":2,"sat":-1},"after":"ラジオを買い、毎晩家族でラジオに耳を傾けた。"},{"k":"kinjo","l":"近所の家で聴かせてもらう","fx":{"tie":1,"sat":1},"after":"ラジオは買わず、近所の家でラジオを聴かせてもらった。"}]},{"id":"late.oya.4","kind":"small","y":[1868,1945],"a":[40,62],"when":{"parentOld":true,"kind":["village","fish"],"ind":["home"]},"text":"もう休んでいてくれと言っても、{dad}は鍬を持って畑に出ようとする。","options":[{"k":"sasero","l":"{dad}の好きにさせる","fx":{"tie":2,"body":-1},"after":"畑に出たがる{dad}の好きにさせ、そばで見守った。"},{"k":"yasumase","l":"強く言って家で休ませる","fx":{"sat":1,"tie":-1},"after":"畑に出たがる{dad}に強く言い、家で休ませた。"}]},{"id":"late.shokki.4","kind":"small","y":[1905,1945],"a":[45,70],"when":{"kind":["town","city"],"ind":["craft"]},"text":"問屋から、手機をやめて力織機を入れないかと勧められた。","options":[{"k":"ireru","l":"借金して力織機を入れる","fx":{"learn":2,"body":1,"sat":-1},"after":"借金をして、仕事場に力織機を入れることにした。"},{"k":"tebata","l":"手機の技を守る","fx":{"sat":1,"tie":1},"after":"力織機は入れず、昔ながらの手機の技を守り続けた。"}]},{"id":"late.mimi.4","kind":"small","y":[1868,1945],"a":[80,100],"when":{"kind":["village","fish","town","city"],"ind":["home"]},"text":"耳が遠くなって、家の者の話がよく聞き取れない。","options":[{"k":"kikikaesu","l":"耳に手を当てて聞き返す","fx":{"tie":1,"sat":-1},"after":"耳が遠くなっても、手を当てて家の者の話を聞き返した。"},{"k":"warau","l":"聞こえぬふりで笑っている","fx":{"sat":1,"tie":-1},"after":"耳が遠いのをいいことに、聞こえぬふりで笑っていた。"}]},{"id":"late.zaisho.4","kind":"small","y":[1868,1945],"a":[80,100],"when":{"kind":["village","fish","town","city"],"ind":["home"],"hasChild":true},"text":"生まれ在所を、もう一度見ておきたくなった。","options":[{"k":"tazuneru","l":"{child}に付き添ってもらい在所を訪ねる","fx":{"tie":2,"sat":2,"body":-2},"after":"{child}に付き添われ、生まれ在所をもう一度訪ねた。"},{"k":"omoide","l":"在所は思い出の中だけにしておく","fx":{"learn":1},"after":"生まれ在所へは行かず、思い出の中だけにしておいた。"}]},{"id":"late.saikoyo.5","kind":"small","y":[1960,2120],"a":[58,65],"when":{"job":true,"kind":["village","fish","town","city"],"ind":["office","shop","craft"]},"text":"定年が近づいた。勤め先から、再雇用で残らないかと言われた。","options":[{"k":"nokoru","l":"再雇用で勤め続ける","fx":{"sat":1,"learn":1,"body":-1},"after":"定年のあとも、再雇用で同じ職場に通うことにした。"},{"k":"yameru","l":"定年できっぱり退職する","fx":{"body":2,"sat":1,"tie":-1},"after":"定年できっぱり退職し、勤めから離れることにした。"}]},{"id":"late.henro.5","kind":"small","y":[1960,2120],"a":[55,85],"when":{"kind":["village","fish","town","city"],"ind":["home"]},"text":"前から気になっていた四国遍路。歩いて回るか、バスで回るか。","options":[{"k":"aruku","l":"歩いて遍路の札所を回る","fx":{"sat":3,"learn":1,"body":-2},"after":"何十日もかけて、歩いて遍路の札所を回った。"},{"k":"bus","l":"バスの巡拝ツアーで回る","fx":{"sat":2,"tie":1},"after":"遍路の札所は、バスの巡拝ツアーで回った。"}]},{"id":"late.kenshin.5","kind":"small","y":[1975,2120],"a":[45,70],"when":{"kind":["village","fish","town","city"],"ind":["home"]},"text":"健康診断の結果に、要精密検査と書かれていた。","options":[{"k":"ukeru","l":"仕事を休んで精密検査を受ける","fx":{"body":3,"sat":-1},"after":"仕事を休んで、健康診断のあとの精密検査を受けた。"},{"k":"enki","l":"忙しいので検査を来年に延ばす","fx":{"sat":1,"body":-2},"after":"精密検査は、忙しさを理由に来年へ延ばした。"}]},{"id":"late.kaigo.5","kind":"small","y":[1990,2120],"a":[45,70],"when":{"parentOld":true,"kind":["village","fish","town","city"],"ind":["home"]},"text":"{mom}の介護が、家族だけでは手に余るようになってきた。","options":[{"k":"shisetsu","l":"{mom}を施設に預ける","fx":{"sat":1,"body":1,"tie":-1},"after":"{mom}の介護は、近くの施設に預けることにした。"},{"k":"zaitaku","l":"家で{mom}を介護する","fx":{"tie":3,"body":-2,"sat":-1},"after":"{mom}の介護は、家で家族が交代でみることにした。"}]},{"id":"late.jichikai.5","kind":"small","y":[1946,2120],"a":[55,80],"when":{"kind":["town","city"],"ind":["home"]},"text":"町内の自治会の会長を、次はお願いしたいと頼まれた。","options":[{"k":"kaicho","l":"自治会長を引き受ける","fx":{"tie":3,"learn":1,"body":-1},"after":"自治会の会長を引き受け、ごみ当番の割り振りを決めた。"},{"k":"fuku","l":"副会長ならと引き受ける","fx":{"tie":1,"sat":1},"after":"自治会の会長は断り、副会長だけを引き受けた。"}]},{"id":"late.bosai.5","kind":"small","y":[1996,2120],"a":[50,90],"when":{"kind":["village","fish","town","city"],"ind":["home"]},"text":"大きな地震の報道を見て、家の備えが気になってきた。","options":[{"k":"kagu","l":"家具を留めて非常袋を用意する","fx":{"body":1,"learn":1,"sat":-1},"after":"地震に備えて、家具を壁に留め、非常袋を用意した。"},{"k":"kunren","l":"町内の防災訓練に出る","fx":{"tie":2,"learn":1,"body":-1},"after":"町内の防災訓練に出て、地震のときの避難場所を確かめた。"}]},{"id":"late.koza.5","kind":"small","y":[1965,2120],"a":[60,90],"when":{"kind":["village","fish","town","city"],"ind":["home"]},"text":"公民館の講座の案内が届いた。前から何か始めてみたかった。","options":[{"k":"togei","l":"公民館の陶芸講座に通う","fx":{"learn":2,"sat":1,"tie":1},"after":"公民館の陶芸講座に通い、自分で使う湯のみを焼いた。"},{"k":"shodo","l":"書道講座に申し込む","fx":{"learn":2,"sat":1,"tie":-1},"after":"公民館の書道講座に申し込み、毎週筆をとった。"},{"k":"sanpo","l":"講座はやめて朝の散歩を続ける","fx":{"body":2},"after":"公民館の講座は見送って、毎朝の散歩を続けることにした。"}]},{"id":"late.kaishu.5","kind":"small","y":[1985,2120],"a":[65,90],"when":{"kind":["village","fish","town","city"],"ind":["home"],"hasChild":true},"text":"家の段差に足をとられることが増えた。{child}が、住まいをどうするか考えようと言う。","options":[{"k":"kaishu","l":"段差をなくすよう家を改修する","fx":{"body":2,"sat":-1},"after":"家の段差をなくし、手すりをつける改修をした。"},{"k":"sumikae","l":"駅に近いマンションに住み替える","fx":{"sat":1,"body":1,"tie":-2},"after":"古い家を売って、駅に近いマンションに住み替えた。"}]},{"id":"late.hakajimai.5","kind":"small","y":[1995,2120],"a":[65,95],"when":{"kind":["village","fish","town","city"],"ind":["home"]},"text":"遠い故郷の墓を、この先誰が守るのかが気にかかる。","options":[{"k":"shimau","l":"故郷の墓をしまって近くに移す","fx":{"sat":1,"learn":1,"tie":-1},"after":"故郷の墓をしまって、近くの霊園に移すことにした。"},{"k":"mamoru","l":"故郷の墓を年に一度守りに帰る","fx":{"tie":2,"body":-1},"after":"故郷の墓は動かさず、年に一度帰って守ることにした。"}]},{"id":"late.menkyo.5","kind":"small","y":[1998,2120],"a":[75,95],"when":{"kind":["village","fish","town","city"],"ind":["home"]},"text":"車庫入れで車をこすった。家族が、運転免許の返納を考えてはどうかと言う。","options":[{"k":"hennou","l":"運転免許を返納する","fx":{"tie":1,"body":1,"sat":-2},"after":"家族とよく話し合い、運転免許を返納した。"},{"k":"tsuzukeru","l":"近所の買い物だけ運転を続ける","fx":{"sat":2,"body":-1,"tie":-1},"after":"運転免許は返納せず、近所の買い物だけ運転を続けた。"}]},{"id":"late.nokyo.5","kind":"small","y":[1965,2120],"a":[55,80],"when":{"kind":["village"],"ind":["farm"]},"text":"田植えと稲刈りが、年々体にこたえるようになってきた。","options":[{"k":"itaku","l":"田の作業を農協に頼む","fx":{"body":2,"sat":-1},"after":"田植えと稲刈りを、農協に頼んですませることにした。"},{"k":"taueki","l":"中古の田植え機を買う","fx":{"sat":1,"learn":1,"body":-1},"after":"中古の田植え機を買い、自分の手で田を続けた。"}]},{"id":"late.fune.5","kind":"small","y":[1946,2120],"a":[60,85],"when":{"kind":["fish"],"ind":["fish"]},"text":"浜の若い漁師が、船を譲ってもらえないかと頼みに来た。","options":[{"k":"yuzuru","l":"漁船を若い漁師に譲る","fx":{"tie":2,"body":2,"sat":-1},"after":"長年乗った漁船を、浜の若い漁師に譲った。"},{"k":"chikaba","l":"近場の漁だけ続ける","fx":{"sat":2,"body":-1},"after":"漁船は手放さず、近場の漁だけを続けることにした。"}]},{"id":"late.shoten.5","kind":"small","y":[1980,2120],"a":[60,85],"when":{"kind":["town","city"],"ind":["shop"]},"text":"商店街のシャッターが目立ってきた。店をいつまで続けるか考えている。","options":[{"k":"shimeru","l":"店を閉めて隠居する","fx":{"body":2,"sat":-1,"tie":-1},"after":"長年続けた店を閉め、隠居することにした。"},{"k":"akeru","l":"客が来る限り店を開ける","fx":{"tie":2,"body":-1},"after":"客が来てくれる限り、店を開け続けることにした。"}]},{"id":"late.kokusaikekkon.5","kind":"small","y":[1975,2120],"a":[45,65],"when":{"kind":["village","fish","town","city"],"ind":["home"],"hasChild":true},"text":"{child}が、外国の人と結婚したいと言って相手を連れてきた。","options":[{"k":"shukufuku","l":"{child}の結婚を祝福する","fx":{"tie":3,"learn":1},"after":"外国の人との{child}の結婚を、心から祝福した。"},{"k":"jikkuri","l":"相手とよく話してから決める","fx":{"learn":1,"tie":1,"sat":-1},"after":"{child}の結婚は、相手とよく話してから決めると伝えた。"}]},{"id":"late.mimamori.5","kind":"small","y":[1946,2120],"a":[60,85],"when":{"kind":["village","fish","town","city"],"ind":["home"]},"text":"近くの小学校から、登下校の見守り役を頼まれた。","options":[{"k":"tatsu","l":"通学路の見守りに立つ","fx":{"tie":3,"sat":-1},"after":"朝の通学路に立ち、子どもたちの見守りを続けた。"},{"k":"kotowaru","l":"朝がつらいと見守り役を断る","fx":{"sat":1},"after":"通学路の見守り役は、朝がつらいと断った。"}]},{"id":"late.pasokon.5","kind":"small","y":[1995,2015],"a":[55,80],"when":{"kind":["village","fish","town","city"],"ind":["home"]},"text":"近所の公民館で、年配向けのパソコン教室が始まる。","options":[{"k":"kayou","l":"パソコン教室に通う","fx":{"learn":3,"sat":-1},"after":"パソコン教室に通い、孫にメールを送れるようになった。"},{"k":"mago","l":"機械のことは孫に任せる","fx":{"tie":1,"sat":1},"after":"パソコンは覚えず、機械のことは孫に任せた。"}]},{"id":"late.ending.5","kind":"small","y":[2010,2120],"a":[70,95],"when":{"kind":["village","fish","town","city"],"ind":["home"]},"text":"本屋で、エンディングノートという帳面を見かけた。","options":[{"k":"kaku","l":"エンディングノートを書く","fx":{"learn":1,"tie":1,"sat":1},"after":"葬儀の希望や財産のことを、エンディングノートに書いた。"},{"k":"makaseru","l":"その時のことは家族に任せる","fx":{"sat":1},"after":"自分の葬儀や財産のことは、家族に任せることにした。"}]},{"id":"late.kaigai.5","kind":"small","y":[1970,2120],"a":[55,80],"when":{"married":true,"kind":["village","fish","town","city"],"ind":["home"]},"text":"{spouse}が、一度は海外旅行に行ってみたいと言い出した。","options":[{"k":"go","l":"{spouse}と海外旅行に出る","fx":{"sat":3,"tie":2,"body":-1},"after":"{spouse}と二人で、初めての海外旅行に出かけた。"},{"k":"onsen","l":"国内の温泉でゆっくりする","fx":{"body":2,"tie":1},"after":"海外旅行はやめて、{spouse}と国内の温泉でゆっくりした。"}]},{"id":"late.ijuu.5","kind":"small","y":[1970,2120],"a":[55,75],"when":{"kind":["village"],"ind":["home"]},"text":"定年を前に、田舎に移り住んで畑をやってみたいと思うようになった。","options":[{"k":"utsuru","l":"田舎に移り住んで畑を借りる","fx":{"body":2,"sat":2,"tie":-2},"after":"定年を機に田舎へ移り住み、小さな畑を借りた。"},{"k":"nokoru","l":"住み慣れた町に残る","fx":{"tie":2},"after":"田舎への移住はやめ、住み慣れた町に残ることにした。"}]},{"id":"late.senso.5","kind":"small","y":[1980,2025],"a":[80,100],"when":{"kind":["village","fish","town","city"],"ind":["home"]},"text":"近くの小学校から、子どもたちに戦争のころの話をしてほしいと頼まれた。","options":[{"k":"hanasu","l":"子どもたちに戦争の話をする","fx":{"tie":3,"learn":1,"body":-1},"after":"小学校に招かれ、子どもたちに戦争のころの話をした。"},{"k":"kotowaru","l":"つらいことは思い出したくないと断る","fx":{"sat":1,"tie":-1},"after":"戦争の話をしてほしいという頼みは、思い出したくないと断った。"}]},{"id":"late.hyakusai.5","kind":"small","y":[1946,2120],"a":[99,100],"when":{"kind":["village","fish","town","city"],"ind":["home"]},"text":"百歳を迎えることになった。町から祝いの品が届くという。","options":[{"k":"kai","l":"祝いの会を開いてもらう","fx":{"tie":3,"body":-1},"after":"百歳の祝いに、家族や近所の人が集まってくれた。"},{"k":"shizuka","l":"静かに迎えたいと伝える","fx":{"sat":1,"body":1},"after":"百歳の祝いは、静かに迎えたいと家族に伝えた。"}]},{"id":"late.haishoku.5","kind":"small","y":[2000,2120],"a":[80,100],"when":{"kind":["village","fish","town","city"],"ind":["home"]},"text":"台所に立つのがおっくうになってきた。町の福祉の人が、配食サービスを勧めてくれた。","options":[{"k":"tanomu","l":"配食サービスを頼む","fx":{"body":2,"sat":-1},"after":"毎日の食事は、配食サービスを頼むことにした。"},{"k":"jibun","l":"自分で台所に立つ","fx":{"sat":1,"learn":1,"body":-1},"after":"配食サービスは断って、毎日自分で台所に立った。"}]},{"id":"late.wakate.5","kind":"small","y":[1946,2120],"a":[50,60],"when":{"job":true,"kind":["town","city"],"ind":["office"]},"text":"大きな仕事の責任者を決めることになった。部下の若手が、やらせてほしいと言ってきた。","options":[{"k":"osu","l":"若手を責任者に推す","fx":{"tie":2,"learn":1,"sat":-1},"after":"大きな仕事の責任者に、部下の若手を推した。"},{"k":"jibun","l":"自分が責任者を務める","fx":{"sat":2,"body":-2},"after":"大きな仕事の責任者は、自分が務めることにした。"}]}];
  LATE.forEach(function (o) { c(o.id, o.kind, o.y, o.a, w(o.when), o.text, o.options.map(function (p) { return [p.k, p.l, p.fx, p.after]; })); });
  // END LATE
  // 選んだあとの1文（v11の直し 9）：何について決めたかが分かる文。c() の4つ目に書いていない選択肢の分をここに置く。キーは「選択のid|答えのk」
  var AFTER = {"p.miyamairi.1|home":"{mom}は、{name}の社へのお参りを春まで待つことにした。","p.uba.1|skill":"{name}の乳母は、子育ての上手と評判の家から迎えた。","p.hairdown.1|big":"{name}の髪置きの祝いには親戚を招き、にぎやかに祝った。","p.hairdown.1|small":"{name}の髪置きの祝いは、家の者だけでささやかにすませた。","p.mamori.2|temple":"{mom}は寺へ行き、{name}の夜泣きよけのお守りをもらってきた。","p.nige.2|stay":"{dad}は、戦の噂があっても{name}を連れて村に残ることにした。","p.moraichi.2|gruel":"{mom}は、隣の家にもらい乳を頼むのはやめ、米の汁で育てた。","p.toshi.2|early":"{name}には、早めに木刀を持たせることになった。","p.toshi.2|late":"{name}に木刀を持たせるのは先にして、もう少し遊ばせることにした。","p.toku.2|laugh":"旅の僧の、{name}を寺に入れよという話は、笑って聞き流した。","p.tera.3|kiru":"{mom}は晴れ着を借りて、{name}のお宮参りに出かけた。","p.tera.3|fudan":"{mom}は、{name}のお宮参りにふだん着のまま出かけた。","p.hoso.3|doc":"{dad}は疱瘡を案じて、町の医者に子どものことを相談した。","p.shichigo.3|skip":"{mom}は千歳飴をあきらめ、{name}の七五三はお参りだけにした。","p.komori.3|back":"田植えのあいだ、{name}を背負って田に出ることにした。","p.yose.3|no":"{dad}は、{name}を寄席に連れて行くのはまだ早いと見送った。","p.shuto.4|keep":"{dad}は、子の名前を決めた字のまま役場に届けた。","p.shuto.4|kaku":"{dad}は、子の名前を画数のいい字に変えて役場に届けた。","p.shutou.4|wait":"{mom}は、子の種痘をしばらく見合わせ、まわりの様子を見た。","p.shashin.4|no":"{dad}は、写真館で家族写真を撮るのはもったいないとやめた。","p.sokai.4|go":"{mom}は空襲をさけて、{name}を連れて田舎の実家に身を寄せた。","p.sokai.4|stay":"{mom}は空襲の中でも、{name}と町に残ることにした。","p.kodomo.4|no":"{dad}の小さな鍬の話は先に延ばし、{name}をまだ遊ばせておいた。","p.hoikuen.5|work":"{mom}は仕事に戻り、{name}を保育園に預けることにした。","p.hoikuen.5|home":"{mom}は仕事に戻るのを延ばし、もう少し家で{name}を見ることにした。","p.yobou.5|go":"{dad}は仕事を休んで、{name}の予防接種に一緒に行った。","p.yobou.5|mom":"{dad}は、{name}の予防接種を{mom}にまかせた。","p.ehon.5|book":"{mom}は寝る前に、子どもに絵本を声に出して聞かせた。","p.ehon.5|tv":"{mom}は寝る前の時間、子どもにテレビを見せてひと休みした。","p.shichigo.5|studio":"七五三の写真は、写真館でちゃんと撮ってもらった。","p.shichigo.5|home":"七五三の写真は、写真館へは行かず家族で撮った。","p.naraigoto.5|go":"{mom}は、{name}を水泳教室に通わせることにした。","p.naraigoto.5|no":"{mom}は水泳教室には通わせず、{name}を外で遊ばせた。","k.tenarai.1|help":"寺で字を習うのはあきらめ、{dad}と田の仕事を手伝った。","k.kawa.1|run":"溺れかけた{friend}を助けようと、大人を呼びに走った。","k.kakure.1|sorry":"干し柿を盗み食いしたことを、{mom}に正直に謝った。","k.dengaku.1|dance":"祭りの田楽の輪に入って、笛と太鼓に合わせて踊った。","k.dengaku.1|watch":"{sibYounger}の手を引いて、祭りの田楽を見物した。","k.kuge.1|copy":"和歌の師に言われた季節の歌は、古い歌をまねて詠んだ。","k.ushi.1|self":"朝早く起きて、家の牛のための草を自分で刈った。","k.ushi.1|sib":"牛の草刈りは、{sibOlder}に頼んで代わってもらった。","k.ikusa.2|no":"{friend}に誘われたが、落ち武者狩りは見に行かず家にいた。","k.tera.2|stay":"寺の小僧になる話は断り、家にいたいと{dad}に言った。","k.sumo.2|join":"子どもたちの相撲の勝ち抜き戦に、飛び入りで加わった。","k.sumo.2|ref":"子どもたちの相撲の勝ち抜き戦で、行司役を買って出た。","k.ito.2|learn":"{friend}の誘いを断って、{mom}に糸車の回し方を習った。","k.ito.2|play":"糸車を習うのは後にして、{friend}と遊びに行った。","k.bushi.2|ask":"弓を引く前に、{dad}に引き方を先に教わった。","k.nakama.2|no":"山の向こうの市へは、親に黙っては行かないと{friend}に断った。","k.terakoya.3|komori":"寺子屋には行かず、{sibYounger}の子守りを続けた。","k.kenka.3|first":"大げんかした{friend}に、自分から声をかけた。","k.kenka.3|ignore":"大げんかした{friend}と道で会ったが、知らんぷりをした。","k.misemono.3|home":"{sibOlder}の見世物小屋の誘いを断り、家で母を手伝った。","k.hanko.3|say":"藩校の素読で、分からない字を正直に師に告げた。","k.hanko.3|guess":"藩校の素読で、分からない字をあてずっぽうで続けた。","k.kusa.3|bring":"{sibYounger}の手を引いて、山の草刈りに連れて行った。","k.kusa.3|leave":"山の草刈りには、{sibYounger}を家に置いて出かけた。","k.ama.3|learn":"舟に乗せてもらい、沖の潮の見分け方を教わった。","k.ama.3|shore":"沖へは出ず、浜で網の繕いを手伝った。","k.shogakko.4|run":"運動会のかけっこを、{mom}がこしらえた新しい足袋で走った。","k.shogakko.4|save":"{mom}の足袋はもったいなくて、運動会は裸足で走った。","k.komori.4|school":"子守り奉公には出ず、学校に通い続けたいと言った。","k.menko.4|again":"めんこを全部取られた{friend}に、もう一度勝負を挑んだ。","k.menko.4|quit":"{friend}にめんこを全部取られて、きっぱりやめた。","k.gakudo.4|share":"家から届いた炒り豆を、同じ部屋の子と分けて食べた。","k.gakudo.4|hide":"家から届いた炒り豆を、こっそり少しずつ食べた。","k.chiyo.4|no":"{friend}が言う甘い柿は、取らずにやめておいた。","k.kakizome.4|yes":"書き初めを、学校の代表として町の展覧会に出した。","k.kakizome.4|no":"書き初めを展覧会に出す話は、恥ずかしくて断った。","k.tv.5|yield":"夕飯どきに見たい番組は、{sibOlder}にゆずった。","k.tv.5|fight":"見たい番組をめぐって、{sibOlder}とチャンネルを取り合った。","k.ijime.5|stop":"{friend}の悪口を書いた紙は、回さずに破った。","k.ijime.5|pass":"{friend}の悪口を書いた紙を、黙って次に回した。","k.juku.5|go":"{mom}にこたえて、友だちと同じ塾に通い始めた。","k.juku.5|no":"塾には行かず、サッカーの部活を続けることにした。","k.game.5|buy":"お年玉を全部使って、新しいゲーム機を買った。","k.game.5|save":"新しいゲーム機は買わず、お年玉を貯めておいた。","k.ryoko.5|own":"修学旅行の自由行動で、自分の行きたい所を押しとおした。","k.ryoko.5|match":"修学旅行の自由行動は、班のみんなの行き先に合わせた。","k.kanji.5|night":"残った夏休みの宿題を、徹夜で片づけた。","k.kanji.5|copy":"残った夏休みの宿題は、{friend}に見せてもらって写した。","k.ame.0|leave":"雨の中で震えていた子犬を、見なかったことにして帰った。","k.yume.0|big":"将来の夢を聞かれ、誰もなったことのないものになると答えた。","k.yume.0|same":"将来の夢を聞かれ、{dad}と同じ仕事をすると答えた。","y.fumi.1|wait":"{friend}の家で見かけた人には文を出さず、次に会える日を待った。","y.kyo.1|stay":"都へ年貢を運ぶ人足には加わらず、村の田を守った。","y.ennichi.1|go":"{friend}と一緒に、市に来た傀儡の一座を見に行った。","y.ennichi.1|work":"傀儡の一座は見に行かず、家で機を織った。","y.kojin.1|do":"宮中の歌合で、頼まれたとおり相手方の歌に難をつけた。","y.kojin.1|fair":"宮中の歌合で、相手方の歌を思ったとおりに評した。","y.yumi.1|ride":"足の痛みをこらえて、流鏑馬の稽古に出た。","y.yumi.1|rest":"流鏑馬の稽古は休んで、ひねった足を治した。","y.wakamono.2|go":"{dad}にかまわず、若者組の夜の集まりに出た。","y.wakamono.2|sleep":"若者組の夜の集まりには出ず、家で早く寝た。","y.so.2|speak":"惣の寄り合いで、用水の分け方について思いきって意見を言った。","y.so.2|quiet":"惣の寄り合いでは、用水の話を黙って聞いた。","y.so.2f|ask":"{dad}に、用水の決まりがそうなったわけを聞いてみた。","y.so.2f|let":"{dad}と{mom}の用水の話には、口をはさまなかった。","y.ichi.2|sell":"市で高く売れそうな麻布を、全部売った。","y.ichi.2|keep":"市で麻布を売ったが、半分は家に残しておいた。","y.koi.2|help":"{friend}が想う人との仲を、そっと取りもった。","y.koi.2|tease":"想う人がいると打ち明けた{friend}を、からかった。","y.bushi.2|wear":"初陣には、{dad}から譲られた古い鎧を着て出た。","y.bushi.2|new":"初陣のために、{dad}の古い鎧ではなく新しい胴丸を求めた。","y.yabuiri.3|town":"藪入りの日は家に帰らず、町で芝居を見た。","y.shikarare.3|sorry":"身に覚えのないことで番頭に叱られたが、その場は謝った。","y.shikarare.3|say":"身に覚えのないことで叱られ、番頭に違うと言い返した。","y.fumi.3|write":"気になる人への文を書いて、{friend}に届けてもらうよう頼んだ。","y.fumi.3|no":"{friend}に文は頼まないで、気になる人に自分で話しかける機会を待った。","y.edo.3|dream":"江戸の話を聞いて、自分もいつか江戸へ行きたいと思うようになった。","y.edo.3|here":"江戸をほめる{friend}に、村の暮らしがいちばんだと言い返した。","y.kenjutsu.3|fight":"道場で師範代からの試合の申しこみを受けて立った。","y.kenjutsu.3|no":"師範代との試合は、稽古を積んでからと言って断った。","y.machi.3|yes":"店の主人に言われて、帳場の仕事を引き受けた。","y.machi.3|no":"帳場を任せる話は、まだ早いと言って辞退した。","y.chohei.4|train":"徴兵検査に向けて、毎朝走って体を鍛えた。","y.chohei.4|usual":"徴兵検査が近くても、特に鍛えずふだんどおり働いた。","y.miokuri.4|senninbari":"出征する{friend}の見送りに、千人針の腹巻きを渡した。","y.miokuri.4|photo":"出征する{friend}の見送りに、一緒に撮った写真を渡した。","y.haikyu.4|yield":"配給の列で、赤ん坊を背負った知り合いに順番を譲った。","y.haikyu.4|keep":"配給の列では、順番を譲らずにそのまま並んだ。","y.jokyu.4|go":"女学校の友だちと一緒に、タイピストの養成所に通いはじめた。","y.jokyu.4|home":"タイピストの養成所には通わず、家の手伝いを続けた。","y.katsudo.4|go":"給金をはたいて、評判の活動写真を見に行った。","y.katsudo.4|save":"評判の活動写真は見に行かず、給金を手もとに貯めた。","y.shudan.5|go":"中学を出たら、集団就職で都会の工場に行くつもりでいた。","y.shudan.5|stay":"集団就職の話には乗らず、村で働くつもりでいた。","y.tenkin.5|go":"上司に打診された地方の支店への転勤を受けた。","y.tenkin.5|no":"地方の支店への転勤は断り、今の部署に残りたいと答えた。","y.dousou.5|go":"会いたくない人が来るのを承知で、中学の同窓会に出た。","y.dousou.5|skip":"成人式のあとの中学の同窓会には行かなかった。","y.kekkon.5|meet":"{mom}が持ってきた写真の相手に、会ってみることにした。","y.kekkon.5|no":"{mom}が持ってきた紹介の話は、自分で探すと言って断った。","y.shikaku.5|study":"仕事のあとは同期と飲みに行かず、資格の勉強をした。","y.shikaku.5|drink":"仕事のあと、資格の勉強はやめて同期と飲みに行った。","y.hitori.5|go":"実家を出て、部屋を借りてひとり暮らしを始めた。","y.hitori.5|stay":"ひとり暮らしはせず、実家にいてお金を貯めた。","y.matsuri.0|yield":"祭りの準備で取り合いになった役目を、{friend}に譲った。","y.matsuri.0|take":"祭りの準備の役目は、{friend}に譲らず自分がやると言いはった。","m.nengu.1|pay":"役人には頼みに行かず、蓄えを出して年貢を納めた。","m.kyoudai.1|talk":"田の境をずらしている件で、{sibOlder}と面と向かって話した。","m.kyoudai.1|let":"{sibOlder}が田の境をずらしているらしいことは、黙っておいた。","m.kuge.1|go":"受領の話を受けて、都を離れて地方へ下った。","m.kuge.1|stay":"受領として下る話は受けず、都に残って出世の道を選んだ。","m.kiki.1|ok":"遠くの寺に修行に出たいという{child}の願いを許した。","m.kiki.1|no":"寺へ修行に出たいという{child}に、家にいてほしいと頼んだ。","m.bushi.1|go":"隣の荘との境の争いで、主の言いつけどおり館に詰めた。","m.bushi.1|send":"隣の荘との境の争いには、自分の代わりに家の郎党を出した。","m.koshi.2|help":"村八分にされそうな家の事情を聞いて、その家をかばった。","m.koshi.2|follow":"気の毒な事情は知りながら、村八分の件は村の決まりに従った。","m.sakaba.2|yoriai":"隣家との境の杭が抜かれていた件を、寄り合いに持ちこんだ。","m.sakaba.2|direct":"境の杭が抜かれていた件で、隣家に直接言いに行った。","m.toso.2|sell":"土倉から借りた銭を、牛を売って期日までに返した。","m.toso.2|wait":"土倉に、借りた銭の返済を待ってもらうよう頼んだ。","m.ikki.2|join":"隣村の衆に加わって、領主の新しい関所に抗議しに行った。","m.ikki.2|no":"領主の関所への抗議には、加わらなかった。","m.child.2|out":"{child}を、町の商家に見習いに出した。","m.child.2|home":"{child}は見習いに出さず、家で育てることにした。","m.kenchi.2|true":"検地の役人に、田の広さをありのまま申告した。","m.kenchi.2|small":"検地の役人に、田を少しでも小さく見せようとした。","m.nengu.3|shichi":"凶作の年の年貢は、着物を質に入れて工面した。","m.nengu.3|karimai":"凶作の年の年貢は、庄屋から米を借りて工面した。","m.nengu.3|musume":"凶作の年の年貢は、娘の奉公の前借りをして工面した。","m.tanomoshi.3|join":"近所で始まる頼母子講の仲間に加わった。","m.tanomoshi.3|no":"近所の頼母子講には誘われたが、入らずにおいた。","m.ko.3|near":"{child}の奉公先は、近くの店に決めた。","m.ko.3|edo":"{child}の奉公先は、遠い江戸の大店に決めた。","m.kinjo.3|help":"亭主が寝ついた長屋の隣の家の子どもを預かってやった。","m.kinjo.3|no":"長屋の隣の家は気の毒だったが、自分の家のことで手いっぱいだった。","m.tokkuri.3|go":"仕事の帰りに、仲間の一杯の誘いに付き合った。","m.tokkuri.3|home":"仕事の帰りの仲間の誘いは断って、まっすぐ帰った。","m.bushi.3|tell":"家に累が及ぶのを覚悟で、上役の不正を目付に申し出た。","m.bushi.3|quiet":"家を守るため、上役の不正には目をつぶった。","m.inkyo.3|ok":"隠居したいという{dad}の言葉を受けて、家を継ぐ用意をした。","m.inkyo.3|wait":"隠居したいという{dad}を、まだ早いと引き止めた。","m.yuubin.4|save":"郵便局の人に勧められて、毎月少しずつ郵便貯金をした。","m.yuubin.4|no":"郵便貯金はせず、お金はたんすにしまっておいた。","m.shussei.4|live":"出征の朝、{child}に「必ず生きて帰れ」と声をかけた。","m.shussei.4|brave":"出征の朝、{child}を「お国のために」と送り出した。","m.sokai.4|share":"疎開してきた家族のために、奥の部屋を空けて分けた。","m.sokai.4|shed":"疎開してきた家族には、納屋を使ってもらった。","m.gekka.4|yes":"電灯料はかかるが、家に電灯を引いた。","m.gekka.4|no":"電灯は引かず、しばらくはランプで暮らした。","m.kumiai.4|join":"待遇を良くしてほしいと会社に掛け合う集まりに、名を連ねた。","m.kumiai.4|no":"会社に待遇を掛け合う職場の集まりには、顔を出さなかった。","m.tv.5|buy":"近所にならって、テレビを月賦で買った。","m.tv.5|wait":"テレビは月賦では買わず、現金で買えるまで待った。","m.tenkin.5|family":"転勤の内示を受けて、家族で引っ越した。","m.tenkin.5|alone":"転勤の内示を受けて、家族を残して単身赴任した。","m.kaigo.5|visit":"物忘れがひどくなった{mom}のもとへ、週末ごとに通った。","m.kaigo.5|service":"{mom}の物忘れのことで、介護の相談窓口に連絡した。","m.house.5|buy":"住宅ローンを組んで、家を買った。","m.house.5|rent":"家は買わず、借家のままで暮らした。","m.kodomo.5|ok":"大学に行かず働きたいという{child}の思うようにさせた。","m.kodomo.5|no":"働きたいという{child}に、大学には行けと説いた。","m.byouki.0|doc":"胸が苦しい日が続くので、医者に診てもらった。","m.byouki.0|work":"胸の苦しさは気のせいだと思って、働き続けた。","m.shakkin.0|lend":"頭を下げに来た{sibOlder}に、金を貸した。","m.shakkin.0|no":"金を貸してほしいという{sibOlder}の頼みを断った。","o.inkyo.1|shukke":"家のことを{child}に任せて隠居し、頭を丸めて家にいながら仏道に励む入道となった。","o.inkyo.1|stay":"髪を下ろすのはやめて、もう少し家を見守ることにした。","o.mago.1|say":"孫の名付けで、昔の家の名をつけてほしいと言った。","o.mago.1|no":"孫の名付けには口を出さず、若い者に任せた。","o.mukashi.1|tell":"村の若い者に、昔の大飢饉の話を夜更けまで話して聞かせた。","o.mukashi.1|no":"昔の大飢饉の話は、思い出したくないと言って断った。","o.miyako.1|tell":"集まってきた若い女房たちに、昔の宮中の話をして聞かせた。","o.miyako.1|write":"昔の宮中の話を、若い女房たちのために書き留めて残した。","o.inkyo.2|give":"家督を{child}に譲って、隠居した。","o.inkyo.2|keep":"家督は、まだ{child}に譲らなかった。","o.junrei.2|go":"若いころ果たせなかった寺参りの旅に、杖をついて出かけた。","o.junrei.2|near":"遠い寺参りの旅はあきらめ、近くの寺に参るだけにした。","o.yoriai.2|speak":"寄り合いで、若い者たちに昔のいきさつを話した。","o.yoriai.2|let":"寄り合いでは口をはさまないで、若い者たちの決めるのを見守った。","o.sakazuki.2|drink":"訪ねてきた古い友と、朝まで酒をくみかわした。","o.sakazuki.2|short":"訪ねてきた古い友とは短く話して、見送った。","o.ise.3|go":"足腰は心もとないが、孫と一緒に伊勢参りに出かけた。","o.ise.3|no":"伊勢参りには自分は行かず、孫に代参を頼んだ。","o.inkyo.3|give":"隠居して、家を{child}に譲った。","o.inkyo.3|keep":"家は{child}に譲らず、もう少し自分で切り盛りすることにした。","o.haiku.3|go":"誘われて、村の句会に出てみた。","o.haiku.3|no":"村の句会には出ず、畑の手入れをした。","o.mago.3|say":"孫の名付けで、家の通り名を継がせたいと言った。","o.mago.3|no":"孫の名付けには口を出さず、若夫婦に任せた。","o.ishi.4|go":"物忘れが増えたので、{child}の言うとおり町の医者に行った。","o.ishi.4|no":"物忘れのことで医者に行けと言う{child}に、年のせいだと笑った。","o.shashin.4|take":"{child}が呼んだ写真屋で、一番いい着物を着て家族写真に写った。","o.shashin.4|no":"家族写真には、年寄りは写らなくていいと言った。","o.senso.4|omamori":"戦地へ行く孫に、氏神のお守りを持たせた。","o.senso.4|letter":"戦地へ行く孫に、手紙を書いて持たせた。","o.mukashi.4|tell":"ちょんまげのころの昔の暮らしを、孫に語って聞かせた。","o.mukashi.4|no":"ちょんまげのころの話をせがまれたが、昔のことは忘れたと笑った。","o.doukyo.5|yes":"{child}に誘われて、老後は{child}の家で一緒に住むことにした。","o.doukyo.5|no":"{child}との同居は断り、住み慣れた家で暮らした。","o.smart.5|learn":"孫に、スマートフォンの使い方を教わった。","o.smart.5|no":"スマートフォンは、電話で十分だと言って断った。","o.shuushoku.5|yes":"定年のあと、シルバー人材センターの仕事で働きに出た。","o.shuushoku.5|no":"シルバー人材センターの誘いは断り、趣味の時間にあてた。","o.menkyo.5|give":"{child}に言われて、車の運転免許を返納した。","o.menkyo.5|keep":"免許を返したらと言う{child}に、まだ運転できると言った。","o.yuigon.0|write":"自分の亡きあとの家や物の分け方を、書き残しておいた。","o.yuigon.0|no":"亡きあとの家や物の分け方は、そのときに任せることにした。","o.niwa.0|plant":"実がなるのは何年も先だが、孫のために庭に木を植えた。","o.niwa.0|no":"庭の木は植え替えず、今ある木を大事にした。"};
  X.forEach(function (o) { o.options.forEach(function (op) { if (!op.after && AFTER[o.id + '|' + op.k]) op.after = AFTER[o.id + '|' + op.k]; }); });
  /* どちらの答えにも魅力がある分かれ道にする（spec6 2-15）。
     どの答えにも、得るもの（4つの数のどれかが＋、または貯金が増える）と失うもの（どれかが−、または貯金が減る）を1つ以上持たせ、
     ほかの答えより、どの数でも同じか上になる答えをなくす。数を足し引きするだけで、文は変えない */
  var FXK = ['sat', 'learn', 'tie', 'body'];
  function bvec(o) { var f = o.fx || {}; return FXK.map(function (k) { return f[k] || 0; }).concat([(o.money && o.money.f) || 0, -(o.debt || 0), o.die ? -99 : 0]); }
  function balance(opts) {
    if (!opts || opts.length < 2) return opts;
    for (var round = 0; round < 6; round++) { sides(opts); if (!undom(opts)) break; }
    sides(opts);
    // まだ負けている答えがあれば、お金で差をつける（負けている方は少し貯金が増え、勝っている方は少し減る）
    for (var i = 0; i < opts.length; i++) for (var j = 0; j < opts.length; j++) {
      if (i === j) continue;
      var a = bvec(opts[i]), b = bvec(opts[j]);
      if (a.every(function (x, n) { return x >= b[n]; })) {
        opts[i].money = { f: ((opts[i].money && opts[i].money.f) || 0) - 0.02 };
        opts[j].money = { f: ((opts[j].money && opts[j].money.f) || 0) + 0.02 };
      }
    }
    return opts;
  }
  function sides(opts) {
    opts.forEach(function (o, i) {
      o.fx = o.fx || {};
      var v = bvec(o);
      if (!v.some(function (x) { return x > 0; })) o.fx[FXK[i % 4]] = (o.fx[FXK[i % 4]] || 0) + 1;
      v = bvec(o);
      if (!v.some(function (x) { return x < 0; })) { var z = FXK.filter(function (k) { return !o.fx[k]; }); var kk = z.length ? z[(i + 1) % z.length] : FXK.filter(function (k) { return o.fx[k] > 0; }).sort(function (a, b) { return o.fx[a] - o.fx[b]; })[0] || FXK[(i + 2) % 4]; if (o.fx[kk] > 0 && FXK.filter(function (k) { return o.fx[k] > 0; }).length < 2) { var z2 = FXK.filter(function (k) { return k !== kk; }); kk = z2[i % z2.length]; } o.fx[kk] = (o.fx[kk] || 0) - 1; if (o.fx[kk] === 0) o.fx[kk] = -1; }
    });
  }
  // 負けている答えがあれば直して true（直すものがなければ false）
  function undom(opts) {
    var fixed = false;
    for (var g = 0; g < 12; g++) {
      var hit = null;
      for (var i = 0; i < opts.length && !hit; i++) for (var j = 0; j < opts.length && !hit; j++) {
        if (i === j) continue;
        var a = bvec(opts[i]), b = bvec(opts[j]);
        if (a.every(function (x, n) { return x >= b[n]; })) hit = [i, j, a, b];
      }
      if (!hit) break;
      // 負けている答え j に、勝っている答え i より上の数を1つ作る（差がいちばん小さい数）
      var jj = opts[hit[1]], best = 0, bd = 1e9;
      for (var k = 0; k < 4; k++) { var d = hit[2][k] - hit[3][k]; if (d < bd) { bd = d; best = k; } }
      jj.fx[FXK[best]] = hit[2][best] + 1; fixed = true;
    }
    return fixed;
  }
  X.forEach(function (o) { balance(o.options); });
  var API = { list: X, balance: balance, hint: hint, FXN: FXN, era: era, ageBand: ageBand, ERA_WORDS: ERA_WORDS, PLACE_WORDS: PLACE_WORDS, eraOk: eraOk, placeOk: placeOk };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.IchiokuChoices = API;
})(typeof self !== 'undefined' ? self : this);
