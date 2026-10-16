/* 1億分の1 共有用の画像（誕生カード・最期のカード）
   1200×630 の横長。ゴシック体・1pxの線だけ・グラデーションや影なし・絵文字なし。
   画面の明るさの設定にかかわらず、いつも明るい色で描く（共有先で見やすいように）。 */
(function (root) {
  'use strict';
  var W = 1200, H = 630;
  var BG = '#ffffff', TEXT = '#1a1a1a', SUB = '#555555', RULE = '#c9c9c6', ACCENT = '#0a58a8', SURF = '#f3f3f1';
  var FONT = '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic", Meiryo, sans-serif';

  function font(ctx, size, bold) { ctx.font = (bold ? '700 ' : '400 ') + size + 'px ' + FONT; }
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
      if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = text[i]; } else line = t;
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
  // ドット絵を大きく描く（ぼかさない）
  function figure(ctx, L, year, age) {
    var A = root.IchiokuAvatar;
    ctx.fillStyle = SURF; ctx.fillRect(40, 40, 336, 550);
    if (!A) return;
    var c = document.createElement('canvas');
    var v = Object.create(L); v.year = year; v.age = age;
    A.draw(c, v);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(c, 64, 99, 288, 384);
  }
  function title(ctx) {
    font(ctx, 26, true); ctx.fillStyle = ACCENT; ctx.fillText('1億分の1', 420, 92);
    ctx.strokeStyle = RULE; ctx.beginPath(); ctx.moveTo(420, 112.5); ctx.lineTo(W - 48, 112.5); ctx.stroke();
  }

  // 誕生カード：生まれた年（和暦つき）・場所・性別・名前・この年この所で生まれた割合
  function birth(canvas, o) {
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext('2d'), L = o.L, mw = W - 420 - 48;
    base(ctx); figure(ctx, L, L.by, 0); title(ctx);
    fit(ctx, L.by + '年' + (o.era ? '（' + o.era + '）' : '') + 'に生まれた', 420, 172, mw, 40, true);
    fit(ctx, o.place, 420, 236, mw, 34, false, TEXT, 18);
    fit(ctx, (L.sex === 'm' ? '男の子' : '女の子') + '　' + (o.name || ''), 420, 300, mw, 46, true);
    ctx.fillStyle = SURF; ctx.fillRect(420, 350, mw, 150);
    fit(ctx, o.shareWhat, 444, 396, mw - 48, 22, false, SUB, 14);
    fit(ctx, o.shareText, 444, 462, mw - 48, 52, true, TEXT, 24);
    fit(ctx, 'この年に日本で生まれた子のうち', 420, 560, mw, 20, false, SUB, 14);
  }

  // 最期のカード：名前・生年〜没年・享年・生まれた所と亡くなった所・要約3行・節目の一行
  function end(canvas, o) {
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext('2d'), L = o.L, mw = W - 420 - 48;
    base(ctx); figure(ctx, L, L.deathYear, L.deathAge); title(ctx);
    fit(ctx, (o.name || '') + 'さんの一生', 420, 168, mw, 44, true);
    fit(ctx, L.by + '年〜' + L.deathYear + '年　' + L.deathAge + '歳', 420, 220, mw, 30, false);
    fit(ctx, o.from + 'で生まれ', 420, 270, mw, 24, false, SUB, 16);
    fit(ctx, o.to + 'で亡くなった', 420, 306, mw, 24, false, SUB, 16);
    var y = 360;
    o.summary.slice(0, 3).forEach(function (s) {
      ctx.fillStyle = SURF; ctx.fillRect(420, y - 30, mw, 44);
      fit(ctx, s, 436, y, mw - 32, 24, false, TEXT, 16);
      y += 54;
    });
    if (o.note) wrap(ctx, '「' + o.note + '」', 420, y + 22, mw, 24, ACCENT, 34);
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

  root.IchiokuCard = { birth: birth, end: end, share: share, W: W, H: H };
})(typeof self !== 'undefined' ? self : this);
