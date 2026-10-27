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
    // 動きを減らす（亡くなった瞬間の画面と、生まれる年と場所の抽選の動きを出さない）
    var h2 = document.createElement('p'); h2.className = 'set-k'; h2.textContent = '画面の動き'; box.appendChild(h2);
    var row2 = document.createElement('div'); row2.className = 'set-row'; row2.setAttribute('role', 'group'); row2.setAttribute('aria-label', '画面の動き');
    var mv = get('ichioku-motion', 'auto');
    [['auto', 'ふつう'], ['less', '減らす']].forEach(function (t) {
      row2.appendChild(btn(t[1], mv === t[0], function () { set('ichioku-motion', t[0]); mount(box); }));
    });
    box.appendChild(row2);
  }
  function lessMotion() {
    if (get('ichioku-motion', 'auto') === 'less') return true;
    try { return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  }
  // 明るい表示と暗い表示を入れ替える（v18 7。今の見え方から反対へ。この端末に覚えておく）
  function toggleTheme() {
    var t = doc.getAttribute('data-theme'), dark = t ? t === 'dark' : !!(root.matchMedia && root.matchMedia('(prefers-color-scheme: dark)').matches);
    var nt = dark ? 'light' : 'dark';
    set('ichioku-theme', nt); applyTheme(nt);
    var box = document.getElementById('settings'); if (box) mount(box);
    return nt;
  }
  root.IchiokuPrefs = { mount: mount, classMode: function () { return false; }, lessMotion: lessMotion, toggleTheme: toggleTheme };
})(typeof self !== 'undefined' ? self : this);
