/* 1000分の1 身元の書き付け（v18 指示書 11-3）。左の列のいちばん上に置く札の中身を作る（画面の作りは app.js）。
   時代で形を変える：
     宗門人別改（1640〜1871年の百姓・町人などの人別帳）：名前・年齢（数え）・檀那寺・家の主との続柄・家の持ち高
     戸籍（1872年から）：本籍・戸主・続柄・族籍（族籍は1947年まで。1948年からは戸主に代えて筆頭者）
     身元の覚え（それより前と、人別帳の外の身分）
   共通の項目：名前、性別、生まれた年と国、今住む所、宗旨、家の暮らし向き（●の5段階）、学び、仕事、気質、得意なこと。
   L にある値だけを使い、ない項目は出さない（ふりがなの元になる読みのデータはないので、ふりがなは付けない）。
   使い方：IchiokuKakitsuke.build(L, H, C) → { form: '宗門人別改'|'戸籍'|'身元の覚え', title: '宗門人別改帳の写し（寛延3年）', rows: [['名前', 'その'], ...] } */
(function (root) {
  'use strict';
  function oldMod() {
    if (root.IchiokuOld) return root.IchiokuOld;
    if (typeof require === 'function') { try { return require('./history.js'); } catch (e) { return null; } }
    return null;
  }
  var TR_W = { adv: ['思い立ったらすぐ動く', 'こわがりで慎重'], soc: ['誰とでもすぐ仲よくなる', 'ひとり遊びが好き'], grit: ['一度始めたらやめない', '飽きっぽい'], warm: ['人の気持ちに敏感', 'さっぱりしている'], dream: ['空想が好き', '目の前のことに夢中になる'] };
  var TAL_W = { art: '絵を描くこと', music: '歌や音曲', sport: '走ることや体を動かすこと', talk: '話すこと', brain: '数や字を覚えること', looks: '人の目を引く顔立ち', hand: '手先の細かい仕事' };
  var SCHOOL_W = { hs: '高校', univ: '大学', jc: '短大', voc: '専門学校' };
  var INNEN = ['hyakusho', 'chonin', 'genin', 'outcast'];

  function stars(p) { var n = Math.max(1, Math.min(5, Math.ceil((p == null ? 0.5 : p) * 5))); return '●●●●●'.slice(0, n) + '○○○○○'.slice(0, 5 - n); }
  function lastRec(L) { var lg = L.log || []; return lg.length ? lg[lg.length - 1] : null; }
  function cleanPlace(s) { return String(s || '').replace(/（今の(.*?)のあたり）/, '（今の$1）'); }
  function formOf(L, y) {
    if (y >= 1872) return '戸籍';
    if (L.old && y >= 1640 && INNEN.indexOf(L.status) >= 0 && L.pref !== '47' && !L.ainu) return '宗門人別改';
    return '身元の覚え';
  }
  function plainName(L) { return String(L.name || '').replace(/（[^）]*アイヌ語[^）]*）/, '').trim() || '（名は土地の言葉で付けられた）'; }
  function fullName(L, form) {
    var O = oldMod();
    if (!L.old) return (L.surname ? L.surname + ' ' : '') + plainName(L);
    if (form === '戸籍') return (L.surname ? L.surname + ' ' : '') + plainName(L);
    if (O && O.displayName) return O.displayName(L);
    return plainName(L);
  }
  function memberAlive(L, role) { return (L.members || []).filter(function (m) { return m.role === role && m.alive && !m.gone && !m.before; })[0] || null; }
  function birthOrder(L) {
    var same = (L.members || []).filter(function (m) { return m.sib && m.sex === L.sex && m.by < L.by && !m.before; }).length;
    var NUM = ['長', '二', '三', '四', '五', '六', '七', '八'];
    return (NUM[same] || (same + 1)) + (L.sex === 'm' ? '男' : '女');
  }
  function isHead(L) {
    var dad = memberAlive(L, '父');
    if (L.sex === 'm') return !dad && L.age >= 15;
    // 婿を取って家を継いだ娘は、夫が亡くなったあと家の主になる
    return !!(L.heirF && !dad && L.age >= 15 && !(L.married && L.spouse && L.spouse.alive !== false));
  }
  function headName(L, y) {
    if (isHead(L)) return fullName(L, '戸籍');
    if (L.sex === 'f' && L.married && L.spouse && L.spouse.alive !== false) return (L.surname ? L.surname + ' ' : '') + (L.spouse.name || '夫');
    var dad = memberAlive(L, '父');
    if (dad) return (L.surname ? L.surname + ' ' : '') + dad.name;
    var mom = memberAlive(L, '母');
    if (mom && L.age < 15) return (L.surname ? L.surname + ' ' : '') + mom.name;
    return fullName(L, '戸籍');
  }
  function zokugara(L, form) {
    var head = isHead(L), dad = memberAlive(L, '父'), wife = L.sex === 'f' && L.married;
    if (form === '戸籍') return head ? '戸主' : wife ? '妻' : birthOrder(L);
    // 人別帳の書き方
    if (head) return '当主';
    if (wife) return '女房';
    if (L.sex === 'f' && L.widowed && !dad) return '後家';
    return L.sex === 'm' ? '倅' : '娘';
  }
  function mochidaka(L) {
    var p = L.incPct == null ? 0.5 : L.incPct;
    if (L.status === 'hyakusho') return p < 0.4 ? '無高（水呑）' : p < 0.8 ? '高持（本百姓）' : '高持（村の上の家）';
    if (L.status === 'chonin') return p < 0.4 ? '店借' : p < 0.8 ? '地借' : '家持';
    return null;
  }
  function zokuseki(L) {
    var st = L.status;
    if (st === 'kuge' || st === 'kazoku') return '華族';
    if (st === 'shizoku' || st === 'bushi') return '士族';
    return '平民';
  }
  function learnText(L) {
    var s = L.school, e = L.edu;
    if (s && SCHOOL_W[s]) s = SCHOOL_W[s];
    if (s && s !== 'hs-done' && s !== e) return s + 'で学んでいる';
    if (e) return e + (/^(寺での手習い|寺子屋|藩校|村学校|家学)$/.test(e) ? 'で学んだ' : 'を出た');
    if (L.stats && L.stats.school) return '字を習った';
    if (L.old && L.age >= 12) return '字を習いには通わなかった';
    return null;
  }
  function jobText(L) {
    if (L.selfJob && L.selfJob.n) return L.selfJob.n;
    if (L.job && typeof L.job === 'object' && L.job.label) return L.job.label;
    if (L.lastJob) return L.lastJob;
    if (L.age < 13) return null;
    return '家の手伝い';
  }
  function temperText(L) {
    var t = L.story && L.story.tr; if (!t || L.age < 2) return null;
    var ks = Object.keys(TR_W).filter(function (k) { return typeof t[k] === 'number'; }).sort(function (a, b) { return Math.abs(t[b]) - Math.abs(t[a]); }).slice(0, 2);
    return ks.length ? ks.map(function (k) { return TR_W[k][t[k] >= 0 ? 0 : 1]; }).join('・') : null;
  }
  function talentText(L) {
    var t = L.story && L.story.tal; if (!t || L.age < 5) return null;
    var best = null; Object.keys(TAL_W).forEach(function (k) { if (typeof t[k] === 'number' && (!best || t[k] > t[best])) best = k; });
    return best && t[best] > 0.8 ? TAL_W[best] : null;
  }
  function birthText(L, H) {
    var r0 = (L.log || [])[0], era = r0 && r0.eraLabel ? r0.eraLabel : '';
    var y = L.by + '年' + (era && !/^\d/.test(era) ? '（' + era + '）' : '');
    var where;
    if (L.old) {
      var h0 = L.home0 || {}, p = H && H.prov && H.prov[h0.prov];
      where = L.by < 1872 && p && p.kuni ? p.kuni : (H && H.prefNames && H.prefNames[h0.pref || L.pref]) || (r0 && cleanPlace(r0.place)) || '';
    } else where = ((L.home || {}).prefName || '') + ((L.home || {}).muniName || '');
    return y + (where ? '・' + where : '');
  }
  function liveText(L) {
    var r = lastRec(L);
    if (r && r.place) return cleanPlace(r.place);
    if (L.place) return (L.place.prefName || '') + (L.place.muniName || '');
    return L.home && L.home.label ? L.home.label : null;
  }

  function build(L, H, C) {
    if (!L) return null;
    var y = L.year, form = formOf(L, y), r = lastRec(L), era = r && r.eraLabel && !/^\d/.test(r.eraLabel) ? r.eraLabel : '';
    var rows = [], add = function (k, v) { if (v != null && v !== '') rows.push([k, String(v)]); };
    var title = form === '宗門人別改' ? '宗門人別改帳の写し' + (era ? '（' + era + '）' : '') : form === '戸籍' ? '戸籍の写し' : '身元の覚え';
    if (form === '戸籍') {
      var h0 = L.old ? (L.home0 || {}) : (L.home || {});
      add('本籍', L.old ? (H && H.prefNames && H.prefNames[h0.pref || L.pref]) || '' : (h0.prefName || '') + (h0.muniName || ''));
      if (y >= 1948) {
        // 1948年からの戸籍は家ではなく夫婦と子ごと。戸主はなく、筆頭者を書く
        var wed = L.married || L.everMarried, sp = L.spouse;
        var dad = (L.members || []).filter(function (m) { return m.role === '父'; })[0], mom = (L.members || []).filter(function (m) { return m.role === '母'; })[0];
        var pn = wed && L.sex === 'f' && sp ? sp.name : wed ? plainName(L) : dad ? dad.name : mom ? mom.name : plainName(L);
        add('筆頭者', (L.surname ? L.surname + ' ' : '') + pn);
        add('続柄', wed && L.sex === 'f' && sp ? '妻' : birthOrder(L));
      } else {
        add('戸主', headName(L, y));
        add('続柄', zokugara(L, form));
      }
      if (y <= 1947 && L.old) add('族籍', zokuseki(L));
    }
    add('名前', fullName(L, form));
    add('性別', L.sex === 'm' ? '男' : '女');
    if (form === '宗門人別改') add('年齢', (L.age + 1) + '歳（数え）');
    else add('年齢', L.age + '歳');
    add('生まれ', birthText(L, H));
    add('今住む所', liveText(L));
    if (form === '宗門人別改') {
      add('檀那寺', L.templeName || null);
      add('家の主との続柄', zokugara(L, form));
      add('家の持ち高', mochidaka(L));
    }
    add('宗旨', L.templeSect || null);
    add('家の暮らし向き', stars(L.incPct));
    add('学び', learnText(L));
    add('仕事', jobText(L));
    add('気質', temperText(L));
    add('得意なこと', talentText(L));
    return { form: form, title: title, rows: rows };
  }
  var API = { build: build, stars: stars };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.IchiokuKakitsuke = API;
})(typeof self !== 'undefined' ? self : this);
