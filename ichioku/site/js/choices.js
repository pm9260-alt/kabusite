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
  c('p.shichigo.3', 'parent', L3, [3, 5], w({ kind: ['city', 'town'], ind: ['home'] }), '{name}の七五三。{mom}は千歳飴を買ってやりたいが、家計は苦しい。', [
    ['buy', '飴を買ってやる', { sat: 2, tie: 1 }, '{name}は、長い飴の袋を大事そうに抱えて歩いた。'], ['skip', 'お参りだけにする', { tie: 1 }]]);
  c('p.komori.3', 'parent', L3, [1, 3], w({ status: ['hyakusho', 'heimin'], kind: VIL, ind: ['home'] }), '田植えの時期。{name}を背負って田に出るか、{sibOlder}に子守りを任せるか。', [
    ['back', '背負って田に出る', { tie: 2, body: -1 }], ['sib', '{sibOlder}に任せる', { tie: 1 }, '{sibOlder}は、{name}を背負ってあぜ道を行ったり来たりした。']]);
  c('p.yose.3', 'parent', L3, [3, 5], w({ kind: ['city', 'town'], ind: ['home'] }), '{dad}が、{name}を初めて寄席に連れて行くかどうか迷っている。', [
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
  c('p.shichigo.5', 'parent', L5, [3, 5], w({ kind: ['village', 'fish', 'town', 'city'], ind: ['home'] }), '七五三の写真。写真館で撮るか、家族でスマートフォンや家のカメラで撮るか。', [
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
    ['lend', '貸す', { tie: 3, sat: -2 }], ['no', '断る', { tie: -3 }]]);

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
    [/学校/, 1872, 9999], [/写真/, 1860, 9999], [/電話|電灯|自転車/, 1890, 9999], [/ラジオ/, 1925, 9999], [/テレビ/, 1953, 9999], [/携帯/, 1995, 9999], [/スマホ/, 2010, 9999],
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
  var API = { list: X, hint: hint, FXN: FXN, era: era, ageBand: ageBand, ERA_WORDS: ERA_WORDS, PLACE_WORDS: PLACE_WORDS, eraOk: eraOk, placeOk: placeOk };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.IchiokuChoices = API;
})(typeof self !== 'undefined' ? self : this);
