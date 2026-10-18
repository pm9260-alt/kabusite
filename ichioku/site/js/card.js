/* 1000分の1 共有用の画像（最期のカードだけ）
   1200×630 の横長。字体は Zen Kaku Gothic New（題字「1000分の1」だけ今までのゴシック体）・1pxの線だけ・グラデーションや影なし・絵文字なし。
   画面の明るさの設定にかかわらず、いつも明るい色で描く（共有先で見やすいように）。 */
(function (root) {
  'use strict';
  var W = 1200, H = 630;
  var BG = '#ffffff', TEXT = '#1a1a1a', SUB = '#555555', RULE = '#c9c9c6', ACCENT = '#0a58a8', SURF = '#f3f3f1', BENI = '#a3132f', ON_BENI = '#ffffff';
  var FONT = '"Zen Kaku Gothic New", "Hiragino Kaku Gothic ProN", "Hiragino Sans", "Noto Sans JP", "Yu Gothic", Meiryo, sans-serif';
  var TITLE_FONT = '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic", Meiryo, sans-serif';
  var FIXED = '1000分の1–…さんで亡くなったで生まれ、一生の浮き沈み一生の記録　原作「80億分の1」（1in8b.life）の作者の許可を得て制作年〜歳0123456789';

  function font(ctx, size, bold) { ctx.font = (bold ? '700 ' : '400 ') + size + 'px ' + FONT; }
  // 字体の読み込みを待つ（待たないと予備の字体で描かれる）。カードに出る文字の分だけ読み込む
  function ready(o) {
    var d = root.document;
    if (!d || !d.fonts || !d.fonts.load) return Promise.resolve();
    var t = FIXED + [o && o.name, o && o.from, o && o.to, o && o.line].join('');
    return Promise.all(['400', '700'].map(function (w) { return d.fonts.load(w + ' 20px "Zen Kaku Gothic New"', t); })).catch(function () { /* 読み込めないときは予備の字体で描く */ });
  }
  // 幅に収まるまで文字を小さくする（最小 minSize）。それでも入らなければ末尾を「…」にする
  function fit(ctx, text, x, y, maxW, size, bold, color, minSize) {
    var s = size;
    font(ctx, s, bold);
    while (ctx.measureText(text).width > maxW && s > (minSize || 18)) { s -= 2; font(ctx, s, bold); }
    var t = text;
    while (ctx.measureText(t).width > maxW && t.length > 1) t = t.slice(0, -2) + '…';
    ctx.fillStyle = color || TEXT;
    ctx.fillText(t, x, y);
    return s;
  }
  // 2行まで折り返す
  function wrap(ctx, text, x, y, maxW, size, color, lh) {
    font(ctx, size, false);
    ctx.fillStyle = color || TEXT;
    var line = '', lines = [];
    for (var i = 0; i < text.length; i++) {
      var t = line + text[i];
      // 行の頭に句読点や閉じかっこを置かない（前の行へぶら下げる）
      if (ctx.measureText(t).width > maxW && line && '、。」）・'.indexOf(text[i]) < 0) { lines.push(line); line = text[i]; } else line = t;
    }
    if (line) lines.push(line);
    if (lines.length > 2) { lines = lines.slice(0, 2); lines[1] = lines[1].slice(0, -1) + '…'; }
    lines.forEach(function (l, i) { ctx.fillText(l, x, y + i * (lh || size * 1.5)); });
    return lines.length;
  }
  function base(ctx) {
    ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = RULE; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
    ctx.textBaseline = 'alphabetic';
  }
  // 最期のカード：上に紅の帯（原作の届け出の帯にならう）、左に名前・生年〜没年・生まれた所と亡くなった所・ひとこと、右にドット絵、下に一生の浮き沈みの線
  function end(canvas, o) {
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext('2d'), L = o.L, mw = 760;
    base(ctx);
    ctx.fillStyle = BENI; ctx.fillRect(0, 0, W, 88);
    ctx.font = '700 34px ' + TITLE_FONT; ctx.fillStyle = ON_BENI; ctx.fillText('1000分の1', 48, 58);
    font(ctx, 22, false); ctx.textAlign = 'right'; ctx.fillText('一生の記録　' + L.by + '–' + L.deathYear, W - 48, 56); ctx.textAlign = 'left';
    // ドット絵
    ctx.fillStyle = SURF; ctx.fillRect(W - 48 - 280, 124, 280, 380);
    var A = root.IchiokuAvatar;
    if (A) {
      var c = document.createElement('canvas'), v = Object.create(L);
      v.year = L.deathYear; v.age = L.deathAge;
      A.draw(c, v);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(c, W - 48 - 280 + 20, 134, 240, 320);
    }
    fit(ctx, (o.name || '') + 'さん', 48, 192, mw, 64, true, TEXT, 30);
    fit(ctx, L.by + '年〜' + L.deathYear + '年　' + L.deathAge + '歳', 48, 248, mw, 32, false, TEXT, 18);
    fit(ctx, o.from + 'で生まれ、' + o.to + 'で亡くなった', 48, 296, mw, 24, false, SUB, 14);
    if (o.line) wrap(ctx, o.line, 48, 356, mw, 28, TEXT, 42);
    // 一生の浮き沈み（0〜100。印や文字は付けない）
    var sat = (o.sat || []).filter(function (x) { return x != null; });
    var gx = 48, gy = 436, gw = mw, gh = 96;
    ctx.strokeStyle = RULE; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(gx, gy + gh / 2 + 0.5); ctx.lineTo(gx + gw, gy + gh / 2 + 0.5); ctx.stroke();
    if (sat.length > 1) {
      ctx.strokeStyle = TEXT; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath();
      sat.forEach(function (s, i) { var x = gx + gw * i / (sat.length - 1), y = gy + gh * (1 - s / 100); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
      ctx.stroke();
    }
    font(ctx, 16, false); ctx.fillStyle = SUB; ctx.fillText('一生の浮き沈み', gx, gy + gh + 26);
    fit(ctx, '原作「80億分の1」（1in8b.life）の作者の許可を得て制作', 48, 604, W - 96, 16, false, SUB, 12);
  }

  // 共有：使える端末では共有の画面、使えない端末では画像を保存する
  function share(canvas, name, title) {
    return new Promise(function (resolve) {
      canvas.toBlob(function (blob) {
        if (!blob) { resolve('error'); return; }
        var file = null;
        try { file = new File([blob], name, { type: 'image/png' }); } catch (e) { file = null; }
        if (file && navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
          navigator.share({ files: [file], title: title }).then(function () { resolve('shared'); }).catch(function () { resolve('cancel'); });
          return;
        }
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = name;
        document.body.appendChild(a); a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
        resolve('saved');
      }, 'image/png');
    });
  }

  root.IchiokuCard = { end: end, ready: ready, share: share, W: W, H: H };
})(typeof self !== 'undefined' ? self : this);
