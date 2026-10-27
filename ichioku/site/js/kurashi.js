/* 1000分の1 暮らしの細部（v18 指示書 11-4・11-7）：時代の趣味と熟練（Lv）、時代の持ち物、飼っている動物と名前の候補。
   データは data-src/hobbies.json・goods.json・pets.json から tools/build-kurashi.mjs で下の BEGIN〜END に書き込む（そこは手で直さない）。
   使い方：
     IchiokuKurashi.hobbies(L, year) → [{ name: '囲碁', years: 12, lv: 18, from: 1712 }]（続けた年数の多い順）
     IchiokuKurashi.goods(L, year)   → ['鍬', '笠と蓑', '提灯']
     IchiokuKurashi.pets(L, year)    → [{ a: '犬', name: 'しろ', from: 1720, to: null, alive: true, years: 3 }]
     IchiokuKurashi.petNames(a, year) → 名前の候補の配列（名前を付けない動物は []）。petName(a, year, r) → 1つ（r は乱数の関数か数）
   どれも L（人生の記録）を読むだけで、書きかえない。同じ人生・同じ年なら、いつも同じ答えになる */
(function (root) {
  'use strict';
  // BEGIN DATA（tools/build-kurashi.mjs が書き込む）
  var HOB = [{"id":"waka","name":"和歌","y":[1000,2120],"st":["kuge","bushi","priest"],"a":10,"tal":"talk","kw":"和歌|歌合|歌を詠"},{"id":"waka2","name":"和歌","y":[1700,2120],"st":["chonin","hyakusho","heimin","shizoku","modern"],"rich":true,"a":15,"tal":"talk","kw":"和歌|歌を詠|短歌"},{"id":"kemari","name":"蹴鞠","y":[1000,1867],"st":["kuge","bushi"],"sex":"m","a":10,"tal":"sport","kw":"蹴鞠|鞠を蹴"},{"id":"sugoroku","name":"双六","y":[1000,1700],"a":8,"tal":"brain","kw":"双六"},{"id":"kaiawase","name":"貝合わせ","y":[1000,1700],"st":["kuge","bushi"],"sex":"f","a":6,"tal":"art","kw":"貝合"},{"id":"fue","name":"笛","y":[1000,2120],"st":["kuge","bushi","priest","hyakusho","chonin","heimin"],"sex":"m","a":8,"tal":"music","kw":"笛を"},{"id":"koto","name":"琴","y":[1000,2120],"st":["kuge","bushi","shizoku"],"sex":"f","a":8,"tal":"music","kw":"琴"},{"id":"koto2","name":"琴","y":[1700,2120],"st":["chonin","heimin","modern"],"sex":"f","rich":true,"a":8,"tal":"music","kw":"琴"},{"id":"go","name":"囲碁","y":[1000,1599],"st":["kuge","bushi","priest"],"a":10,"tal":"brain","kw":"碁"},{"id":"go2","name":"囲碁","y":[1600,2120],"a":10,"tal":"brain","kw":"碁"},{"id":"shogi","name":"将棋","y":[1200,1599],"st":["kuge","bushi","priest"],"sex":"m","a":8,"tal":"brain","kw":"将棋"},{"id":"shogi2","name":"将棋","y":[1600,2120],"sex":"m","a":8,"tal":"brain","kw":"将棋"},{"id":"renga","name":"連歌","y":[1250,1700],"st":["kuge","bushi","priest","chonin"],"a":15,"tal":"talk","kw":"連歌"},{"id":"chanoyu","name":"茶の湯","y":[1500,2120],"st":["bushi","kuge","priest","chonin","shizoku","modern"],"rich":true,"a":15,"tal":"hand","kw":"茶の湯|茶会|闘茶"},{"id":"ikebana","name":"生け花","y":[1550,2120],"st":["kuge","bushi","priest","chonin","heimin","shizoku","modern"],"a":12,"tal":"art","kw":"生け花|立花"},{"id":"haikai","name":"俳諧","y":[1650,1899],"a":15,"tal":"talk","kw":"俳諧|句会|発句"},{"id":"haiku","name":"俳句","y":[1900,2120],"a":15,"tal":"talk","kw":"俳句|句会"},{"id":"tsuri","name":"釣り","y":[1000,2120],"sex":"m","a":7,"tal":"hand","kw":"釣り|釣り竿"},{"id":"engei","name":"園芸（朝顔・菊・盆栽）","y":[1700,1945],"kind":["town","city"],"a":20,"tal":"hand","kw":"朝顔|盆栽|菊づくり|菊作り"},{"id":"engei2","name":"園芸","y":[1946,2120],"a":20,"tal":"hand","kw":"園芸|盆栽|庭いじり|家庭菜園"},{"id":"shamisen","name":"三味線","y":[1620,2120],"st":["chonin","heimin","modern","hyakusho"],"a":8,"tal":"music","kw":"三味線|長唄|小唄"},{"id":"shibai","name":"芝居見物","y":[1660,1945],"kind":["town","city"],"a":10,"kw":"芝居|歌舞伎|浄瑠璃"},{"id":"kabuki","name":"歌舞伎見物","y":[1946,2120],"kind":["city"],"a":15,"kw":"歌舞伎"},{"id":"sumo","name":"相撲","y":[1000,2120],"sex":"m","a":7,"tal":"sport","kw":"相撲"},{"id":"kendo","name":"剣術","y":[1550,1876],"st":["bushi"],"sex":"m","a":8,"tal":"sport","kw":"剣術|稽古場"},{"id":"kendo2","name":"剣道","y":[1877,2120],"sex":"m","a":10,"tal":"sport","kw":"剣道"},{"id":"yokyoku","name":"謡","y":[1450,1945],"st":["bushi","chonin","kuge","priest","shizoku"],"a":15,"tal":"music","kw":"謡|能を|能楽"},{"id":"shodo","name":"書","y":[1000,2120],"st":["kuge","bushi","priest","shizoku","modern"],"a":8,"tal":"art","kw":"書を|書道"},{"id":"kashihon","name":"貸本の物語","y":[1700,1970],"kind":["town","city"],"a":10,"tal":"brain","kw":"貸本|読本|草双紙"},{"id":"dokusho","name":"読書","y":[1900,2120],"a":10,"tal":"brain","kw":"読書|本を"},{"id":"shashin","name":"写真","y":[1900,1945],"st":["heimin","shizoku","kazoku","modern"],"rich":true,"a":15,"tal":"art","kw":"写真"},{"id":"shashin2","name":"写真","y":[1946,2120],"a":15,"tal":"art","kw":"写真|カメラ"},{"id":"yakyu","name":"野球","y":[1890,1945],"kind":["town","city"],"sex":"m","a":10,"tal":"sport","kw":"野球"},{"id":"yakyu2","name":"野球","y":[1946,2120],"sex":"m","a":8,"tal":"sport","kw":"野球"},{"id":"eiga","name":"映画","y":[1910,1945],"kind":["town","city"],"a":10,"kw":"映画|活動写真"},{"id":"eiga2","name":"映画","y":[1946,2120],"a":10,"kw":"映画"},{"id":"radio","name":"ラジオを聞くこと","y":[1925,1960],"a":10,"kw":"ラジオ"},{"id":"tozan","name":"山歩き","y":[1905,2120],"a":15,"tal":"sport","kw":"山歩き|登山"},{"id":"shuge","name":"手芸","y":[1900,2120],"sex":"f","a":10,"tal":"hand","kw":"編み物|刺繍|手芸"},{"id":"ryoko","name":"旅","y":[1955,2120],"a":18,"kw":"旅行"},{"id":"karaoke","name":"カラオケ","y":[1975,2120],"a":15,"tal":"music","kw":"カラオケ"},{"id":"game","name":"テレビゲーム","y":[1983,2120],"a":6,"tal":"brain","kw":"ゲーム"},{"id":"soccer","name":"サッカー","y":[1965,2120],"a":6,"tal":"sport","kw":"サッカー"},{"id":"piano","name":"ピアノ","y":[1955,2120],"a":5,"tal":"music","kw":"ピアノ"}];
  var GOODS = [{"id":"kuwa","name":"鍬","y":[1000,2120],"ind":["farm"],"a":8},{"id":"kama","name":"鎌","y":[1000,1960],"ind":["farm"],"a":8},{"id":"ami","name":"網","y":[1000,2120],"ind":["fish"],"a":10},{"id":"tachi","name":"太刀","y":[1000,1599],"st":["bushi"],"sex":"m","a":15},{"id":"katana","name":"刀","y":[1600,1875],"st":["bushi"],"sex":"m","a":15},{"id":"yumi","name":"弓","y":[1000,1599],"st":["bushi"],"sex":"m","a":12},{"id":"eboshi","name":"烏帽子","y":[1000,1600],"sex":"m","a":15},{"id":"ogi","name":"扇","y":[1000,2120],"st":["kuge","bushi","priest"],"a":10},{"id":"suzuri","name":"硯と筆","y":[1000,1945],"st":["kuge","bushi","priest"],"a":7},{"id":"suzuri2","name":"硯と筆","y":[1700,1945],"st":["chonin","hyakusho","heimin","shizoku"],"a":7,"learned":true},{"id":"juzu","name":"数珠","y":[1000,2120],"a":40},{"id":"kasa_mino","name":"笠と蓑","y":[1000,1945],"ind":["farm","fish"],"a":8},{"id":"soroban","name":"算盤","y":[1570,2120],"ind":["shop","office"],"a":10},{"id":"chochin","name":"提灯","y":[1600,1945],"a":12},{"id":"andon","name":"行灯","y":[1600,1920],"a":0},{"id":"kiseru","name":"煙管","y":[1600,1945],"a":20,"smoker":true},{"id":"kaichu","name":"懐中時計","y":[1872,1960],"spread":[1872,1930],"a":18,"sex":"m"},{"id":"kasa","name":"洋傘","y":[1880,2120],"spread":[1880,1925],"a":12},{"id":"jitensha","name":"自転車","y":[1890,2120],"spread":[1890,1950],"a":10},{"id":"mannen","name":"万年筆","y":[1910,2000],"spread":[1910,1960],"a":15},{"id":"radio","name":"ラジオ","y":[1925,2120],"spread":[1925,1950],"a":0},{"id":"chikuonki","name":"蓄音機","y":[1910,1960],"spread":[1910,1990],"a":10,"rich":true},{"id":"udedokei","name":"腕時計","y":[1930,2120],"spread":[1930,1965],"a":15},{"id":"camera","name":"写真機","y":[1930,1975],"spread":[1930,1975],"a":15},{"id":"tv","name":"テレビ","y":[1953,2120],"spread":[1953,1965],"a":0},{"id":"sentakuki","name":"洗濯機","y":[1953,2120],"spread":[1953,1970],"a":0},{"id":"reizoko","name":"冷蔵庫","y":[1953,2120],"spread":[1953,1972],"a":0},{"id":"car","name":"自動車","y":[1960,2120],"spread":[1960,1995],"a":20},{"id":"denwa","name":"電話","y":[1960,2120],"spread":[1960,1980],"a":0},{"id":"microwave","name":"電子レンジ","y":[1965,2120],"spread":[1970,1995],"a":0,"eng":"microwave"},{"id":"aircon","name":"エアコン","y":[1961,2120],"spread":[1965,2005],"a":0,"eng":"aircon"},{"id":"vcr","name":"ビデオデッキ","y":[1978,2015],"spread":[1978,1995],"a":0,"eng":"vcr"},{"id":"pc","name":"パソコン","y":[1980,2120],"spread":[1985,2010],"a":10,"eng":"pc"},{"id":"mobile","name":"携帯電話","y":[1995,2015],"spread":[1995,2002],"a":12,"eng":"mobile"},{"id":"smart","name":"スマートフォン","y":[2008,2120],"spread":[2009,2018],"a":10,"eng":"smart"}];
  var PETS = {"犬":[{"y":[1000,1867],"n":["しろ","くろ","あか","ぶち","とら","まる","こま","はやて"]},{"y":[1868,1945],"n":["ポチ","シロ","クロ","アカ","ブチ","タロウ","コロ","マル"]},{"y":[1946,1989],"n":["ポチ","コロ","チビ","タロウ","シロ","クロ","ジロウ","ハチ"]},{"y":[1990,2120],"n":["モモ","ココ","ハナ","ソラ","マロン","コタロウ","ムギ","チョコ"]}],"猫":[{"y":[1000,1867],"n":["たま","こま","みけ","とら","くろ","しろ","ちょび","ねね"]},{"y":[1868,1989],"n":["タマ","ミケ","トラ","クロ","シロ","チビ","ミー","ブチ"]},{"y":[1990,2120],"n":["モモ","ソラ","レオ","ミー","チャチャ","キナコ","ルル","ムギ"]}],"馬":[{"y":[1000,1867],"n":["青","栗毛","鹿毛","月影","春風","疾風","黒雲","白波"]},{"y":[1868,2120],"n":["アオ","クリ","ハヤテ","ハルカゼ","キンタ","ツキカゲ"]}],"牛":[{"y":[1000,1867],"n":["くろ","まだら","はな","こぶ","あか","ふく"]},{"y":[1868,2120],"n":["ハナ","クロ","マダラ","フク","モモ","ベニ"]}],"鶏":[{"y":[1000,1867],"n":["とさか","こがね","しろ","あか"]},{"y":[1868,2120],"n":["コッコ","トサカ","シロ","ピヨ"]}],"鷹":[{"y":[1000,1867],"n":["白妙","疾風","雪丸","黒丸"]}],"金魚":[{"y":[1700,1945],"n":["あか","ひれなが","まだら","でめ"]},{"y":[1946,2120],"n":["アカ","デメ","キンちゃん","ヒレナガ"]}],"小鳥":[{"y":[1600,1867],"n":["ちい","鈴","ひよ","うめ"]},{"y":[1868,2120],"n":["ピーコ","チュン","ピー","スズ"]}],"鈴虫":[{"y":[1000,2120],"n":[]}]};
  // END DATA

  function hash(seed, s) { var h = (seed >>> 0) ^ 0x9e3779b9; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d) >>> 0; h ^= h >>> 12; return h >>> 0; }
  function unit(seed, s) { return hash(seed, s) / 4294967296; }
  function stOf(L) { return L.old ? L.status : 'modern'; }
  function kindOf(L) { return L.old ? (L.kind === 'kotan' ? 'village' : L.kind) : ({ '町村': 'village', '都市': 'town', '大都市': 'city' })[(L.place || {}).kind] || 'town'; }
  function rich(L) { return (L.incPct == null ? 0.5 : L.incPct) >= 0.6; }
  // 仕事の種類（story.js の indOf と同じ分け方。子どものうちは家の仕事）
  var IND_OLD = { farm: 'farm', fish: 'fish', shop: 'shop', store: 'shop', maid: 'shop', kozo: 'shop', hoko: 'shop', craft: 'craft', factory: 'craft', silk: 'craft', build: 'craft', leather: 'craft', kawara: 'craft',
    samurai: 'bushi', bushiMed: 'bushi', court: 'office', temple: 'priest', clerk: 'office', office: 'office', teacher: 'office', genin: 'farm', hunt: 'fish', ainu: 'fish', ryuOff: 'office' };
  var IND_NEW = { agri: 'farm', fish: 'fish', shop: 'shop', service: 'shop', factory: 'craft', build: 'craft', office: 'office', pub: 'office', care: 'office' };
  var CAT_IND = { farm: 'farm', yama: 'farm', ryuFarm: 'farm', ryukyu: 'farm', fish: 'fish', hunt: 'fish', ainu: 'fish', craft: 'craft', factory: 'craft', build: 'craft', leather: 'craft', kawara: 'craft', shop: 'shop', store: 'shop', maid: 'shop',
    samurai: 'bushi', bushiMed: 'bushi', kuge: 'office', court: 'office', clerk: 'office', office: 'office', teacher: 'office', shizoku: 'office', temple: 'priest', genin: 'farm', ryuOff: 'office', rare: 'shop' };
  function indOf(L, age) {
    if (L.selfJob && L.selfJob.cat && CAT_IND[L.selfJob.cat] && age >= 13) return CAT_IND[L.selfJob.cat];
    if (L.old) {
      if (age >= 13 && L.job && L.job !== 'home' && IND_OLD[L.job]) return IND_OLD[L.job];
      if (L.parentJob && CAT_IND[L.parentJob.cat]) return CAT_IND[L.parentJob.cat];
      return { bushi: 'bushi', shizoku: 'office', kuge: 'office', priest: 'priest', chonin: 'shop' }[L.status] || (L.kind === 'fish' ? 'fish' : L.kind === 'city' || L.kind === 'town' ? 'shop' : 'farm');
    }
    if (age >= 15 && L.job && L.job.ind) return IND_NEW[L.job.ind] || 'office';
    return IND_NEW[L.dadJob] || 'office';
  }
  function fits(row, L, year) {
    var age = year - L.by;
    if (year < row.y[0] || year > row.y[1]) return false;
    if (row.a != null && age < row.a) return false;
    if (row.st && row.st.indexOf(stOf(L)) < 0) return false;
    if (row.sex && row.sex !== L.sex) return false;
    if (row.kind && row.kind.indexOf(kindOf(L)) < 0) return false;
    if (row.rich && !rich(L)) return false;
    if (row.ind && row.ind.indexOf(indOf(L, age)) < 0) return false;
    return true;
  }
  // 記録の文（その年まで）から、言葉が最初に出た年
  function firstYear(L, re, year) {
    var log = L.log || [];
    for (var i = 0; i < log.length; i++) {
      var r = log[i]; if (r.year > year) break;
      var ev = r.events || [];
      for (var j = 0; j < ev.length; j++) if (re.test(ev[j].t || '')) return r.year;
    }
    var ch = L.choices || [];
    for (var k = 0; k < ch.length; k++) if (ch[k].y <= year && re.test((ch[k].l || ''))) return ch[k].y;
    return null;
  }

  /* ---------- 趣味 ---------- */
  function hobbies(L, year) {
    if (!L || year == null) return [];
    var seed = L.seed >>> 0, tal = (L.story && L.story.tal) || {}, out = {}, list = [];
    HOB.forEach(function (row) {
      if (!fits(row, L, year)) return;
      var kwY = row.kw ? firstYear(L, new RegExp(row.kw), year) : null;
      var from, quit;
      if (kwY != null && kwY >= row.y[0] && kwY - L.by >= Math.min(row.a || 0, 6)) { from = kwY; quit = 999; }
      else {
        // 記録にない趣味：人ごとの種で、ひとつの趣味を選ぶ割合はおよそ1割（素質があれば多め）
        var t = tal[row.tal] || 0, u = unit(seed, 'h:' + row.id);
        if (u > 0.1 + Math.max(0, t) * 0.08) return;
        from = Math.max(row.y[0], L.by + (row.a || 0) + Math.floor(unit(seed, 'a:' + row.id) * 20));
        quit = 6 + Math.floor(unit(seed, 'q:' + row.id) * 55);
      }
      var yrs = year - from + 1;
      if (yrs < 1 || yrs > quit) return;
      var tv = tal[row.tal] || 0, lv = Math.max(1, Math.min(99, Math.round(1 + yrs * (1.3 + 0.35 * Math.max(-1.5, Math.min(2.5, tv))))));
      if (out[row.name] && out[row.name].years >= yrs) return;
      out[row.name] = { name: row.name, years: yrs, lv: lv, from: from };
    });
    for (var k in out) list.push(out[k]);
    list.sort(function (a, b) { return b.years - a.years || (a.name < b.name ? -1 : 1); });
    return list.slice(0, 4);
  }

  /* ---------- 持ち物 ---------- */
  function smoker(L, year) { return firstYear(L, /たばこを(吸|覚|始)|煙管を(買|手に|くわえ)|たばこ好き/, year) != null; }
  function learned(L) { return !!(L.edu || L.school || (L.stats && L.stats.school)); }
  function goods(L, year) {
    if (!L || year == null) return [];
    var seed = L.seed >>> 0, u0 = typeof L.adoptU === 'number' ? L.adoptU : unit(seed, 'adopt'), out = [];
    GOODS.forEach(function (row) {
      if (!fits(row, L, year)) return;
      if (row.learned && !learned(L)) return;
      if (row.smoker && !smoker(L, year)) return;
      if (row.eng && L.goods && L.goods[row.eng] != null) { if (L.goods[row.eng] <= year) out.push(row.name); return; }
      if (row.eng && !L.old) return; // 今の進め方の人生では、本体で持った物だけ
      if (row.spread) {
        var u = Math.min(1, u0 * (rich(L) ? 0.6 : 1) + (unit(seed, 'g:' + row.id) - 0.5) * 0.2);
        if (year < row.spread[0] + (row.spread[1] - row.spread[0]) * Math.max(0, u)) return;
      }
      if (out.indexOf(row.name) < 0) out.push(row.name);
    });
    return out.slice(-8);
  }

  /* ---------- 飼う動物 ---------- */
  function petNames(a, year) {
    var rows = PETS[a] || [];
    for (var i = 0; i < rows.length; i++) if (year >= rows[i].y[0] && year <= rows[i].y[1]) return rows[i].n.slice();
    return [];
  }
  function petName(a, year, r) {
    var n = petNames(a, year); if (!n.length) return null;
    var x = typeof r === 'function' ? r() : typeof r === 'number' ? r : 0;
    return n[Math.floor(Math.abs(x) * n.length) % n.length];
  }
  // 飼える年数の目安（story.js の PET_LIFE と同じ）。別れの選択が出なかった動物も、この年数で別れたことにする
  var PET_LIFE = { '鈴虫': 1, '鶏': 8, '小鳥': 8, '金魚': 10, '犬': 14, '猫': 16, '牛': 16, '鷹': 15, '馬': 22 };
  function pets(L, year) {
    return (L && L.pets || []).filter(function (p) { return p.y <= year; }).map(function (p) {
      var to = p.dy != null ? p.dy : p.y + (PET_LIFE[p.a] || 15) < (L.deathYear || 9999) ? p.y + (PET_LIFE[p.a] || 15) : null;
      var alive = to == null || to > year;
      return { a: p.a, name: p.name, from: p.y, to: to, alive: alive, years: (alive ? year : to) - p.y };
    });
  }

  var API = { hobbies: hobbies, goods: goods, pets: pets, petNames: petNames, petName: petName, HOBBIES: HOB, GOODS: GOODS, PETS: PETS };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.IchiokuKurashi = API;
})(typeof self !== 'undefined' ? self : this);
