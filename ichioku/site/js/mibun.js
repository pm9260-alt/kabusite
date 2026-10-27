/* 1000分の1 身分と家の呼び方（v18 指示書 6-1・6-2）。
   statusLine(L)：生まれの画面などに出す「身分」の1行。かっこを二重にせず「平民の家（自作農・米作）」の形にする。
     昔の進め方（L.old）は history.js の houseWord（stWordJob）と同じ中身で、今の進め方は「父が○○の家」。
   farmWord(t, y)：家の事情の文の田畑の呼び方を、jobs.js の時代の表に合わせる（作人・名主は1599年まで、小作人は1650年から、庄屋は1600年から）。
     story.js の同じ名前の関数と同じ決まり。 */
(function (root) {
  'use strict';
  function oldMod() {
    if (root.IchiokuOld) return root.IchiokuOld;
    if (typeof require === 'function') { try { return require('./history.js'); } catch (e) { return null; } }
    return null;
  }
  // 「A（B（C））の家」→「Aの家（B・C）」、「A（B（C））」→「A（B・C）」
  function flatParen(s) {
    s = String(s || '');
    var m = s.match(/^(.*?)（([^（）]*)（([^（）]*)）([^（）]*)）の家$/);
    if (m) return m[1] + 'の家（' + m[2] + '・' + m[3] + m[4] + '）';
    var prev;
    do { prev = s; s = s.replace(/（([^（）]*)（([^（）]*)）([^（）]*)）/g, '（$1・$2$3）'); } while (s !== prev);
    return s;
  }
  function jobName(n) { return String(n || '').replace(/（([^）]*)）/g, '・$1'); }
  function statusLine(L) {
    if (!L) return '';
    if (L.old) { var O = oldMod(); return flatParen(O && O.houseWord ? O.houseWord(L) || '' : ''); }
    var j = L.dadJobD;
    return j && j.n ? '父が' + jobName(j.n) + 'の家' : '';
  }
  function farmWord(t, y) {
    t = String(t || '');
    if (y >= 1650) return t;
    if (y < 1600) return t.replace(/小作人|小作/g, '作人').replace(/大地主|地主|庄屋/g, '名主');
    return t.replace(/小作人|小作/g, '水呑百姓').replace(/大地主|地主/g, '庄屋');
  }
  var API = { statusLine: statusLine, farmWord: farmWord, flatParen: flatParen };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.IchiokuMibun = API;
})(typeof self !== 'undefined' ? self : this);
