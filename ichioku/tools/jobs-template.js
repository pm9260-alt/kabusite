/* 1000分の1 細かい仕事（作る人の指示 2026-10-17「身分（くわしい仕事）の形で書く」）
   平安〜戦国・江戸・明治〜戦前・戦後の4つの下調べ（data-src/jobs.json、出典は各行の src）から、
   親の仕事と自分の仕事を、時代・身分・土地の種類・都道府県・男女で選ぶ。重み w は「その分類の中でどれくらい多かったか」の目安。
   乱数は人生ごとの別の乱数を使い、ほかの抽選の順番は変えない。収入や統計の割合は変えない（呼び名と説明だけ）。 */
(function (root) {
  'use strict';
  var ROWS = __ROWS__;
  // 1行 = [分類, 名前, 説明, 始まりの年, 終わりの年, 土地の種類, 都道府県, 男女, 重み]
  function mix(h) { h = h >>> 0; h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b) >>> 0; h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35) >>> 0; h ^= h >>> 16; return h >>> 0; }
  function rng(seed) { var s = mix(seed) || 1; return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  // 合う度合い（0なら選ばない）。土地の種類が違えば少なめ、都道府県が違えば、4つ以上の県で見られる仕事だけごく少なめに残す（それより限られた土地の名物は出さない）
  function fits(row, c) {
    if (c.y < row[3] || c.y > row[4]) return 0;
    if (row[7] && c.sex && row[7] !== c.sex) return 0;
    var m = 1;
    if (row[5] && c.kind && row[5].indexOf(c.kind) < 0) { if (c.kind === 'kotan' || row[5].length === 1 && (row[5][0] === 'fish' || row[5][0] === 'kotan')) return 0; m *= 0.4; }
    if (row[6] && c.pref && row[6].indexOf(String(c.pref)) < 0) { if (row[6].length < 4) return 0; m *= 0.15; }
    return m;
  }
  // 分類ごとの重み（{farm: 0.85, yama: 0.15}）から1つ選ぶ。分類の中は w の割合で選ぶ
  function pick(cats, c, r) {
    var keys = Object.keys(cats).filter(function (k) { return cats[k] > 0; });
    var tot = keys.reduce(function (s, k) { return s + cats[k]; }, 0), x = r() * tot, cat = keys[keys.length - 1];
    for (var i = 0; i < keys.length; i++) { x -= cats[keys[i]]; if (x <= 0) { cat = keys[i]; break; } }
    var list = ROWS.filter(function (row) { return row[0] === cat && fits(row, c) > 0; });
    // 産業に合う名前だけにしぼる（しぼって残らなければ、しぼらない）
    if (c.only || c.not) { var f = list.filter(function (row) { return (!c.only || c.only.test(row[1])) && (!c.not || !c.not.test(row[1])); }); if (f.length) list = f; }
    if (!list.length) list = ROWS.filter(function (row) { return row[0] === cat && c.y >= row[3] && c.y <= row[4] && (!row[7] || !c.sex || row[7] === c.sex); });
    if (!list.length) return null;
    var wt = function (row) { return row[8] * (fits(row, c) || 0.05); };
    var sw = list.reduce(function (s, row) { return s + wt(row); }, 0), z = r() * sw;
    for (var j = 0; j < list.length; j++) { z -= wt(list[j]); if (z <= 0) return { cat: cat, n: list[j][1], d: list[j][2] }; }
    return { cat: cat, n: list[0][1], d: list[0][2] };
  }
  // 身分・時代・土地から、親（家）の仕事の分類を決める
  function catsForHouse(c) {
    var y = c.y, st = c.status, k = c.kind;
    var village = k === 'village' || k === 'kotan', fish = k === 'fish', town = k === 'town' || k === 'city';
    if (y < 1600) {
      if (st === 'kuge') return { court: 1 };
      if (st === 'bushi') return { bushiMed: 1 };
      if (st === 'priest') return { temple: 1 };
      if (st === 'outcast') return { kawara: 1 };
      if (st === 'genin') return { genin: 1 };
      if (st === 'satsumon' || st === 'ainu') return { hunt: 1 };
      if (st === 'gusuku' || st === 'ryukyuShi' || st === 'ryukyuHyakusho') return { ryukyu: 1 };
      if (st === 'chonin') return { craft: 0.5, shop: 0.5 };
      return fish ? { fish: 0.85, farm: 0.15 } : town ? { craft: 0.4, shop: 0.4, farm: 0.2 } : { farm: 0.86, yama: 0.14 };
    }
    if (y < 1868) {
      if (st === 'kuge') return { kuge: 1 };
      if (st === 'bushi') return { samurai: 1 };
      if (st === 'priest') return { temple: 1 };
      if (st === 'outcast') return { leather: 1 };
      if (st === 'ainu') return { ainu: 1 };
      if (st === 'ryukyuShi') return { ryuOff: 1 };
      if (st === 'ryukyuHyakusho' || st === 'gusuku') return { ryuFarm: 1 };
      if (st === 'chonin') return { craft: 0.5, shop: 0.5 };
      return fish ? { fish: 0.85, farm: 0.15 } : town ? { craft: 0.45, shop: 0.45, farm: 0.1 } : { farm: 0.86, yama: 0.14 };
    }
    if (y < 1946) {
      if (st === 'ainu') return { ainu: 1 };
      if (c.pref === '47') return { ryukyu: 1 };
      if (st === 'buraku') return { leather: 1 };
      if (st === 'shizoku' && y < 1900) return { shizoku: 1 };
      if (st === 'shizoku') return { clerk: 0.5, teacher: 0.3, store: 0.2 };
      if (fish) return { fish: 0.85, farm: 0.15 };
      if (village) return { farm: 0.85, yama: 0.1, craft: 0.05 };
      return k === 'city' ? { factory: 0.25, build: 0.1, craft: 0.15, store: 0.3, clerk: 0.15, teacher: 0.05 } : { farm: 0.2, factory: 0.15, build: 0.1, craft: 0.15, store: 0.3, clerk: 0.07, teacher: 0.03 };
    }
    if (fish) return { fish: 0.6, factory: 0.15, store: 0.15, build: 0.1 };
    if (village) return y < 1975 ? { farm: 0.55, factory: 0.15, build: 0.15, store: 0.1, clerk: 0.05 } : { farm: 0.2, factory: 0.25, build: 0.15, store: 0.2, clerk: 0.1, office: 0.05, teacher: 0.05 };
    return { factory: 0.18, build: 0.1, craft: 0.03, store: 0.27, office: 0.12, clerk: 0.18, teacher: 0.11, rare: 0.01 };
  }
  // 自分の仕事の分類：エンジンの仕事の種類（k）を、下調べの分類に読みかえる
  var SELF = {
    farm: { farm: 0.88, yama: 0.12 }, fish: { fish: 1 }, craft: { craft: 1 }, shop: { shop: 1 }, maid: { maid: 1 }, court: { court: 1 }, genin: { genin: 1 },
    hunt: { hunt: 1 }, bushiMed: { bushiMed: 1 }, samurai: { samurai: 1 }, temple: { temple: 1 }, kawara: { kawara: 1 }, leather: { leather: 1 },
    ainu: { ainu: 1 }, ryuOff: { ryuOff: 1 }, silk: { factory: 1 }, factory: { factory: 1 }, build: { build: 1 }, teacher: { teacher: 1 },
    clerk: { clerk: 1 }, office: { office: 1, clerk: 0.3 }, store: { store: 1 },
    agri: { farm: 1 }, pub: { clerk: 1 }, care: { teacher: 0.6, store: 0.4 }, service: { store: 1 }
  };
  function selfCats(k, c) {
    var y = c.y, cats = SELF[k];
    if (!cats) return null;
    if (y < 1600) { if (k === 'court' && c.sex === 'f') return { kugeF: 1 }; if (k === 'ryuOff' || k === 'farm' && c.pref === '47') return { ryukyu: 1 }; if (k === 'samurai') return { bushiMed: 1 }; if (k === 'leather') return { kawara: 1 }; if (k === 'ainu') return { hunt: 1 }; if (k === 'store') return { shop: 1 }; }
    else if (y < 1868) { if (k === 'court') return { kuge: 1 }; if (k === 'farm' && c.pref === '47') return { ryuFarm: 1 }; if (k === 'bushiMed') return { samurai: 1 }; if (k === 'kawara') return { leather: 1 }; if (k === 'hunt') return { ainu: 1 }; if (k === 'store') return { shop: 1 }; }
    else if (y < 1946) { if (k === 'shop') return { store: 1 }; if (k === 'office') return { clerk: 1 }; if (k === 'maid' && c.sex === 'f' && y >= 1900) return { maid: 1 }; if (c.pref === '47' && (k === 'farm' || k === 'fish')) return { ryukyu: 1 }; }
    else { if (k === 'maid') return { store: 1 }; if (k === 'shop') return { store: 1 }; if (k === 'silk') return { factory: 1 }; }
    return cats;
  }
  function parentJob(c, seed) { return pick(catsForHouse(c), c, rng((seed ^ 0x2545f491) >>> 0)); }
  // 家の仕事を継ぐときは親と同じ仕事にする（同じ分類のときだけ）
  // 今の産業の分類と、細かい仕事の名前の合わせ方
  var SHOP_RE = /店|販売|売|レジ|スーパー|コンビニ|商|鮮魚|精肉|青果|屋$|呉服/;
  var NARROW = {
    care: { only: /医|看護|薬|介護|保育|教|療法|福祉|歯科|助産|保健|栄養|ヘルパー|ケア|校|学童|塾|司書/ },
    shop: { only: SHOP_RE },
    service: { not: SHOP_RE },
    pub: { only: /公務|役所|役場|警察|消防|自衛|郵便|刑務|裁判|税|市|県|国|官|職員/ }
  };
  function selfJob(k, c, seed, parent, inherit) {
    if (NARROW[k]) c = Object.assign({}, c, NARROW[k]);
    var cats = selfCats(k, c);
    if (!cats) return null;
    if (parent && cats[parent.cat] && inherit) return { cat: parent.cat, n: parent.n, d: parent.d, same: true };
    return pick(cats, c, rng((seed ^ 0x6c8e9cf5 ^ (c.y * 2654435761)) >>> 0));
  }
  // 説明を1文にする（「〜する仕事」「〜の店」は「だ」で、動詞で終わる説明はそのまま）
  function descSentence(d) { d = String(d || '').replace(/。$/, ''); return d + (/[るすうくぐつぬぶむ]$/.test(d) ? '。' : 'だ。'); }
  var API = { pick: pick, parentJob: parentJob, selfJob: selfJob, catsForHouse: catsForHouse, descSentence: descSentence, rows: ROWS };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.IchiokuJobs = API;
})(typeof self !== 'undefined' ? self : this);
