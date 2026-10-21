# 手伝いの人への共通の注意（1000分の1 第6版）

あなたは、日本の1000〜2000年生まれの人生を体験するブラウザの遊び「1000分の1」の中身（物語・選択・場面・仕事）を、JSON のデータとして書く係です。
プログラムのコードは書きません。決められたファイルだけを新しく作ります。

## 場所
- 作品：/home/user/kabusite/ichioku
- 指示書（作る人の注文）：/root/.claude/uploads/e39cb0fc-1519-55be-9170-ab98f3d8f7da/98d04da9-ichioku1000-v15-fix-spec6.md
  - 第2部の冒頭（「ここからは足す仕事」の4つの決まり）と、あなたの担当の節を必ず全部読む
- 書き方
  - 人生の筋（分かれ道のある物語）：data-src/paths/README.md（第6版で足した項目まで全部）。手本：data-src/paths/e.json
  - 選択・場面の一文：data-src/s6/README.md
  - 仕事の行：data-src/jobs.json の rows と同じ形 [分類, 名前, 説明, 始まりの年, 終わりの年, 土地の種類の配列か0, 都道府県の番号の配列か0, 性別"m"/"f"か0, 重み]
    - 分類は今ある分類から選ぶ：farm fish craft shop maid court kugeF bushiMed temple kawara genin hunt ryukyu yama samurai bushiF leather kuge ainu ryuOff ryuFarm factory build store clerk teacher shizoku office rare
    - 名前が今の jobs.json（と data-src/jobs-add/*.json）にないことを確かめる：
      node -e "const n=process.argv[1];const fs=require('fs');let r=require('/home/user/kabusite/ichioku/data-src/jobs.json').rows;for(const f of fs.readdirSync('/home/user/kabusite/ichioku/data-src/jobs-add'))r=r.concat(require('/home/user/kabusite/ichioku/data-src/jobs-add/'+f));console.log(r.filter(x=>x[1]===n).length)" 名前
    - 重みは、その分類の中でどれくらい多かったかの目安（珍しい仕事は 2〜10）
- 出典：data-src/paths/sources-<あなたのファイル名>.json に {"鍵": {"name": "著者『書名』出版社、年", "note": "何の根拠か"}} の形で書く。実在が確かな本・公的な資料だけ（指示書の最後の「出典の候補」や、国史大辞典・各自治体の史誌・内閣府や気象庁の資料など）。わからなければ WebSearch で確かめてよい。人数や割合などの数字は、出典にあるものだけを使い、作らない

## 確かめ方（エラーが0件になるまで直す）
- 筋：node /home/user/kabusite/ichioku/tools/build-paths.mjs --only <ファイル名>.json
- 選択・場面：node /home/user/kabusite/ichioku/tools/build-s6.mjs --only <ファイル名>.json
- 仕事の行は、JSON として読めて、9つの項目がそろっていること

## してはいけないこと
- 決められたファイル以外を書きかえない（ほかの人も同時に別のファイルを書いている）。git は使わない
- paths.js・s6.js・jobs.js を作らない（--only で確かめるだけ）

## 文の決まり（すべての文）
- 普通体・過去形で「。」で終える（「〜した。」）。問いの文は「どうする？」で終えてよい
- 地名・役職・品物・言葉はその時代の呼び方。今の言い方を添えるときは全角の（　）。品物の年を守る（鉄砲1543年〜、たばこ1590年〜、さつまいも1605年〜、テレビ1953年〜、家庭の携帯電話1995年〜、スマートフォン2008年〜、貸本屋は1970年まで、など）
- 1946年からは「祝言」でなく「結婚式」、「縁談」でなく「見合いの話」「紹介」。市街地に「村」を出さない
- 実在の人は背景にだけ（「〜という僧が宋から戻ったと聞いた」）。主人公と家族は架空。帝は「帝」「主上」、皇子は「東宮」「皇子」と書き、名前を出さない
- 実在の会社名は出さない
- うまくいく道だけにしない（遭難・異国で死ぬ・失脚・家族と疎遠）。その場に残る・地元に残る答えを必ず入れ、その答えにも地元で幸せに暮らす続きを用意する（誘導しない）
- どの答えにも「その答えだけが得られるもの」と「失うもの」を両方持たせる（fx の4つの数で、1つ以上を＋、1つ以上を−）
- つらい出来事は事実を短く書き、むごい描写を重ねない。罪のやり方の細かい手順は書かない
- 使わない言葉：まず／見ます／効く／効いて／重い・重く・重さ・重かった／読み（「読み書き」「読み方」「読み上げ」も不可）／判定／一方で／結論から言うと／示唆／わけです／極めて／興味深い／齟齬／——。半角のかっこ () は使わない
- 同じ言い回しの文を何度も使わない。1つ1つ、その時代・その土地・その仕事でなければ起きない中身にする（「仕事で失敗した」「上司にほめられた」のような、どの仕事にも出る文にしない）

## 終わったら
作ったファイルの名前と、本数・件数、確かめたコマンドの結果（よし）を短く報告する。出典の鍵の一覧も添える。
