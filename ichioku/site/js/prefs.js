/* 1000分の1 画面の設定（明るさ）。<head> の中で取り込み、画面が描かれる前に当てる。
   選んだものはこの端末のブラウザにだけ保存する。保存できない環境でも動く（その場合は毎回「自動」）。 */
(function (root) {
  'use strict';
  var doc = document.documentElement;
  function get(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 保存できない環境 */ } }
  function applyTheme(t) {
    if (t === 'light' || t === 'dark') doc.setAttribute('data-theme', t); else doc.removeAttribute('data-theme');
  }
  applyTheme(get('ichioku-theme', 'auto'));

  var THEMES = [['auto', '自動'], ['light', '明るい'], ['dark', '暗い']];
  // 設定の欄を作る（トップと「このサイトについて」で使う）
  function mount(box) {
    if (!box) return;
    while (box.firstChild) box.removeChild(box.firstChild);
    function btn(text, pressed, onclick) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'btn-sub'; b.textContent = text;
      b.setAttribute('aria-pressed', pressed ? 'true' : 'false');
      b.onclick = onclick;
      return b;
    }
    var h1 = document.createElement('p'); h1.className = 'set-k'; h1.textContent = '画面の明るさ'; box.appendChild(h1);
    var row = document.createElement('div'); row.className = 'set-row'; row.setAttribute('role', 'group'); row.setAttribute('aria-label', '画面の明るさ');
    var cur = get('ichioku-theme', 'auto');
    THEMES.forEach(function (t) {
      row.appendChild(btn(t[1], cur === t[0], function () { set('ichioku-theme', t[0]); applyTheme(t[0]); mount(box); }));
    });
    box.appendChild(row);
  }
  root.IchiokuPrefs = { mount: mount, classMode: function () { return false; } };
})(typeof self !== 'undefined' ? self : this);
