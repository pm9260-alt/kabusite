/* 1000分の1 画面の設定（明るさ・授業用の表示）。<head> の中で取り込み、画面が描かれる前に当てる。
   選んだものはこの端末のブラウザにだけ保存する。保存できない環境でも動く（その場合は毎回「自動」）。 */
(function (root) {
  'use strict';
  var doc = document.documentElement;
  function get(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 保存できない環境 */ } }
  function applyTheme(t) {
    if (t === 'light' || t === 'dark') doc.setAttribute('data-theme', t); else doc.removeAttribute('data-theme');
  }
  function applyClass(on) { if (on) doc.setAttribute('data-class', '1'); else doc.removeAttribute('data-class'); }
  applyTheme(get('ichioku-theme', 'auto'));
  applyClass(!!get('ichioku-class', false));

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
    var h2 = document.createElement('p'); h2.className = 'set-k'; h2.textContent = '授業用の表示'; box.appendChild(h2);
    var on = !!get('ichioku-class', false);
    var row2 = document.createElement('div'); row2.className = 'set-row';
    row2.appendChild(btn(on ? '入れている' : '入れていない', on, function () { set('ichioku-class', !on); applyClass(!on); mount(box); }));
    box.appendChild(row2);
    var n = document.createElement('p'); n.className = 'note';
    n.textContent = '授業用の表示を入れると、自ら命を絶つ・事件・事故で亡くなる場面などを、短い一行に置き換えて出します。相談先はそのまま出します';
    box.appendChild(n);
  }
  root.IchiokuPrefs = { mount: mount, classMode: function () { return doc.getAttribute('data-class') === '1'; } };
})(typeof self !== 'undefined' ? self : this);
