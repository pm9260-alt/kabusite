// 1000分の1 公開用の版を作る（v19 12 開くまでの時間を短くする）。site/ をもとに dist/ を作る。site/ は手で直す元のまま残す
//   ・スクリプトは1つにまとめて縮め（terser）、defer で読む。トップの画面はスクリプトを読み終える前から見える
//   ・物語・選択・場面・仕事の中身のデータ（paths.js・s6.js・jobdesc.js）は時代ごとのファイルに分け、抽選で生まれ年が決まってから読む
//   ・ファイル名に中身の印（ハッシュ）を付け、_headers で長く覚えておく。HTML は短く覚える
//   ・字体は 400 と 700 を先に、900 は後から読む。サービスワーカーで2回目からすぐ開く（中身は外に送らない）
// 使い方：cd tools && npm install（初回だけ）→ node tools/build-dist.mjs
import fs from 'fs'; import path from 'path'; import crypto from 'crypto'; import vm from 'vm'; import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { minify } = require('./node_modules/terser');
const csso = require('./node_modules/csso');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SITE = path.join(ROOT, 'site'), DIST = path.join(ROOT, 'dist');
const ERAS = [['heian', 1000, 1184], ['kamakura', 1185, 1332], ['muromachi', 1333, 1466], ['sengoku', 1467, 1599], ['edo', 1600, 1867], ['senzen', 1868, 1945], ['sengo', 1946, 1974], ['gendai', 1975, 2120]];
const hash = s => crypto.createHash('sha1').update(s).digest('hex').slice(0, 10);
const rd = f => fs.readFileSync(path.join(SITE, f), 'utf8');
function copyDir(a, b, skip) {
  fs.mkdirSync(b, { recursive: true });
  for (const f of fs.readdirSync(a)) {
    const s = path.join(a, f), d = path.join(b, f);
    if (skip && skip(f, s)) continue;
    if (fs.statSync(s).isDirectory()) copyDir(s, d, skip); else fs.copyFileSync(s, d);
  }
}
async function mini(code, name) {
  const r = await minify(code, { compress: { passes: 1 }, mangle: true, format: { comments: false, ascii_only: false } });
  if (!r.code) throw new Error('縮められない ' + name);
  return r.code;
}
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
const report = { files: {}, chunks: {} };

/* ---------- データを時代ごとに分ける ---------- */
function load(file) { const sb = { self: {}, module: { exports: {} } }; sb.self = sb; vm.runInNewContext(rd('js/' + file), sb); return sb.module.exports; }
const PM = load('paths.js'), S6 = load('s6.js');
const kinds = { paths: PM.list, s6c: S6.choices, s6l: S6.lines || [] };
const manifest = { eras: ERAS, files: {} };
fs.mkdirSync(path.join(DIST, 'js', 'd'), { recursive: true });
for (const [k, list] of Object.entries(kinds)) {
  list.forEach((o, i) => { o._i = i; });
  const groups = { all: [] }; ERAS.forEach(e => { groups[e[0]] = []; });
  for (const o of list) {
    if (!o.y || !Array.isArray(o.y)) { groups.all.push(o); continue; }
    let put = false;
    for (const [n, y0, y1] of ERAS) if (o.y[0] <= y1 && o.y[1] >= y0) { groups[n].push(o); put = true; }
    if (!put) groups.all.push(o);
  }
  for (const [g, items] of Object.entries(groups)) {
    if (!items.length) continue;
    const body = 'IchiokuData.put(' + JSON.stringify(k) + ',' + JSON.stringify(items) + ');';
    const name = 'js/d/' + k + '.' + g + '.' + hash(body) + '.js';
    fs.writeFileSync(path.join(DIST, name), body);
    manifest.files[k + '.' + g] = name;
    report.chunks[k + '.' + g] = { n: items.length, bytes: body.length };
  }
}
{
  const jd = await mini(rd('js/jobdesc.js'), 'jobdesc.js');
  const name = 'js/d/jobdesc.' + hash(jd) + '.js';
  fs.writeFileSync(path.join(DIST, name), jd);
  manifest.files.jobdesc = name; report.chunks.jobdesc = { bytes: jd.length };
}

/* ---------- 読みこみ係（IchiokuData）：分けたデータを、全部を読んだときと同じ順に並べて渡す ---------- */
const LOADER = `(function (root) {
  'use strict';
  var M = ${JSON.stringify(manifest)}, pend = {}, seen = { paths: {}, s6c: {}, s6l: {} };
  root.IchiokuPaths = root.IchiokuPaths || { list: [] };
  root.IchiokuS6 = root.IchiokuS6 || { choices: [], lines: [] };
  function tgt(k) { return k === 'paths' ? root.IchiokuPaths.list : k === 's6c' ? root.IchiokuS6.choices : root.IchiokuS6.lines; }
  function put(k, items) {
    var t = tgt(k), s = seen[k], n = 0;
    items.forEach(function (o) { if (s[o._i]) return; s[o._i] = 1; t.push(o); n++; });
    if (n) t.sort(function (a, b) { return a._i - b._i; });
  }
  function load(src) {
    if (!pend[src]) pend[src] = new Promise(function (ok, ng) {
      var s = document.createElement('script'); s.src = src; s.async = true;
      s.onload = function () { ok(); };
      s.onerror = function () { delete pend[src]; ng(new Error(src)); };
      document.head.appendChild(s);
    });
    return pend[src];
  }
  function need(y0, y1) {
    var fs = [M.files.jobdesc];
    ['paths', 's6c', 's6l'].forEach(function (k) { if (M.files[k + '.all']) fs.push(M.files[k + '.all']); M.eras.forEach(function (e) { if (e[2] >= y0 && e[1] <= y1 && M.files[k + '.' + e[0]]) fs.push(M.files[k + '.' + e[0]]); }); });
    return Promise.all(fs.filter(Boolean).map(load)).then(function () { if (root.IchiokuStory && root.IchiokuStory.dataChanged) root.IchiokuStory.dataChanged(); });
  }
  root.IchiokuData = { put: put, need: need, needAll: function () { return need(0, 9999); }, manifest: M };
})(self);
`;

/* ---------- スクリプトを1つにまとめる ---------- */
let html = rd('index.html');
const tags = [...html.matchAll(/<script src="js\/([a-z0-9]+)\.js"><\/script>\n?/g)];
const later = new Set(['paths', 's6', 'jobdesc']);
const head = 'prefs';
let core = LOADER;
for (const m of tags) {
  const n = m[1];
  if (n === head || later.has(n)) continue;
  core += '\n;' + rd('js/' + n + '.js');
}
// HTML の最後にあった設定の取りつけも、まとめたスクリプトの最後で行う
const inl = html.match(/<script>(window\.IchiokuPrefs[^<]*)<\/script>\n?/);
if (inl) core += '\n;' + inl[1];
core += "\n;if ('serviceWorker' in navigator && location.protocol === 'https:') { window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); }); }";

/* ---------- データの JSON：入れ物の名前に印を付ける ---------- */
const dataFiles = [];
(function walk(d) { for (const f of fs.readdirSync(path.join(SITE, d))) { const p = d + '/' + f; if (fs.statSync(path.join(SITE, p)).isDirectory()) walk(p); else dataFiles.push(p); } })('data');
const dh = hash(dataFiles.map(f => f + fs.readFileSync(path.join(SITE, f))).join('|'));
const DATA = 'data.' + dh;
copyDir(path.join(SITE, 'data'), path.join(DIST, DATA));
core = core.split("'data/").join("'" + DATA + '/');

const coreMin = await mini(core, 'core');
const coreName = 'js/core.' + hash(coreMin) + '.js';
fs.writeFileSync(path.join(DIST, coreName), coreMin);
const prefsMin = await mini(rd('js/prefs.js'), 'prefs.js');
const prefsName = 'js/prefs.' + hash(prefsMin) + '.js';
fs.writeFileSync(path.join(DIST, prefsName), prefsMin);
report.files.core = coreMin.length; report.files.prefs = prefsMin.length;

/* ---------- CSS と字体 ---------- */
const css = csso.minify(rd('css/style.css')).css;
const cssName = 'css/style.' + hash(css) + '.css';
fs.mkdirSync(path.join(DIST, 'css'), { recursive: true });
fs.writeFileSync(path.join(DIST, cssName), css);
copyDir(path.join(SITE, 'fonts'), path.join(DIST, 'fonts'), f => /\.css$/.test(f));
const fcss = rd('fonts/zen-kaku-gothic-new.css');
const faces = fcss.match(/@font-face\s*{[^}]*}/g) || [];
const f47 = csso.minify(faces.filter(f => /font-weight:\s*(400|700)/.test(f)).join('\n')).css;
const f9 = csso.minify(faces.filter(f => /font-weight:\s*900/.test(f)).join('\n')).css;
const f47n = 'fonts/zkgn-400-700.' + hash(f47) + '.css', f9n = 'fonts/zkgn-900.' + hash(f9) + '.css';
fs.writeFileSync(path.join(DIST, f47n), f47); fs.writeFileSync(path.join(DIST, f9n), f9);
report.files.css = css.length; report.files.font47 = f47.length; report.files.font9 = f9.length;

/* ---------- HTML ---------- */
function rewrite(h, isIndex) {
  // 字体：400・700 は先に（表示は止めない）、900 は後から
  // 字体：トップでは「生まれる」が押せるようになってから 400・700 を、そのあとで 900 を読む（それまでは端末の字体で出す）。ほかのページは 400・700 をふつうに読む
  h = h.replace('<link rel="stylesheet" href="fonts/zen-kaku-gothic-new.css">', isIndex
    ? `<link rel="preload" href="${DATA}/common.json" as="fetch" crossorigin="anonymous"><noscript><link rel="stylesheet" href="${f47n}"></noscript>`
    : `<link rel="stylesheet" href="${f47n}">`);
  h = h.replace('<link rel="stylesheet" href="css/style.css">', `<link rel="stylesheet" href="${cssName}">`);
  h = h.replace('<script src="js/prefs.js"></script>', `<script src="${prefsName}"></script>`);
  h = h.split("'data/").join("'" + DATA + '/');
  if (isIndex) {
    h = h.replace(/<script src="js\/[a-z0-9]+\.js"><\/script>\n?/g, '');
    h = h.replace(/<script>window\.IchiokuPrefs[^<]*<\/script>\n?/, '');
    h = h.replace('</head>', `<script defer src="${coreName}"></script>\n<script>(function(){var d=0;function css(u){var l=document.createElement('link');l.rel='stylesheet';l.href=u;document.head.appendChild(l);}function go(){if(d)return;d=1;css('${f47n}');setTimeout(function(){css('${f9n}');},1500);}document.addEventListener('ichioku-ready',go);window.addEventListener('load',function(){setTimeout(go,4000);});})();</script>\n</head>`);
  } else {
    h = h.replace('</head>', `<script>window.addEventListener('load',function(){var l=document.createElement('link');l.rel='stylesheet';l.href='${f9n}';document.head.appendChild(l);});</script>\n</head>`);
  }
  return h;
}
for (const f of fs.readdirSync(SITE).filter(f => /\.html$/.test(f))) fs.writeFileSync(path.join(DIST, f), rewrite(rd(f), f === 'index.html'));
for (const f of ['_redirects', 'manifest.webmanifest']) if (fs.existsSync(path.join(SITE, f))) fs.copyFileSync(path.join(SITE, f), path.join(DIST, f));
copyDir(path.join(SITE, 'icons'), path.join(DIST, 'icons'));

/* ---------- _headers：印付きのファイルは1年覚える。HTML とサービスワーカーは毎回確かめる ---------- */
const base = rd('_headers').replace(/\n\/data\/\*\n  Cache-Control: public, max-age=3600\n?/, '\n');
const imm = '  Cache-Control: public, max-age=31536000, immutable';
fs.writeFileSync(path.join(DIST, '_headers'), base.trimEnd() + `\n/js/*\n${imm}\n/css/*\n${imm}\n/fonts/*\n${imm}\n/${DATA}/*\n${imm}\n/icons/*\n  Cache-Control: public, max-age=86400\n/*.html\n  Cache-Control: public, max-age=0, must-revalidate\n/\n  Cache-Control: public, max-age=0, must-revalidate\n/sw.js\n  Cache-Control: no-cache\n`);

/* ---------- サービスワーカー：同じサイトの中だけを端末に残す（外には何も送らない） ---------- */
const PRE = ['./', 'index.html', coreName, prefsName, cssName, f47n, DATA + '/common.json', DATA + '/map.json'];
const SW = `// 1000分の1 サービスワーカー（v19）。一度取りに行ったファイルを端末に残し、2回目からすぐ開く。外部への通信はしない
var V = 'ichioku-${hash(PRE.join('|') + coreMin.length)}', PRE = ${JSON.stringify(PRE)};
self.addEventListener('install', function (e) { e.waitUntil(caches.open(V).then(function (c) { return c.addAll(PRE); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== V && k.indexOf('ichioku-') === 0; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener('fetch', function (e) {
  var r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  var page = r.mode === 'navigate' || /\\.html$|\\/$/.test(u.pathname);
  if (page) { e.respondWith(fetch(r).then(function (res) { var c = res.clone(); caches.open(V).then(function (ca) { ca.put(r, c); }); return res; }).catch(function () { return caches.match(r).then(function (m) { return m || caches.match('index.html'); }); })); return; }
  e.respondWith(caches.match(r).then(function (m) { return m || fetch(r).then(function (res) { if (res.ok) { var c = res.clone(); caches.open(V).then(function (ca) { ca.put(r, c); }); } return res; }); }));
});
`;
fs.writeFileSync(path.join(DIST, 'sw.js'), SW);

/* ---------- 確かめ ---------- */
const all = []; (function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else all.push(p); } })(DIST);
const text = all.filter(p => /\.(html|js|css|json|txt|webmanifest)$|_headers|_redirects/.test(p)).map(p => fs.readFileSync(p, 'utf8')).join('\n');
const bad = [];
if (/p\.m\.9260/.test(text)) bad.push('使ってはいけないメールアドレス');
if (process.env.ICHIOKU_ESTAT_APPID && text.includes(process.env.ICHIOKU_ESTAT_APPID)) bad.push('e-Stat のアプリID');
if (/@gmail\.com/.test(all.filter(p => /\.html$/.test(p)).map(p => fs.readFileSync(p, 'utf8')).join(''))) bad.push('HTML に @gmail.com');
if (/https?:\/\/(?!localhost)[^"'\s)]*\.(js|css|woff2?)/.test(all.filter(p => /\.html$/.test(p)).map(p => fs.readFileSync(p, 'utf8')).join(''))) bad.push('外部のファイルを読む HTML');
report.manifest = manifest; report.bad = bad; report.total = all.length; report.data = DATA; report.core = coreName;
fs.writeFileSync(path.join(DIST, '..', 'logs', 'build-dist.json'), JSON.stringify(report, null, 1));
console.log('dist：ファイル ' + all.length + '・core ' + Math.round(coreMin.length / 1024) + 'KB・分けたデータ ' + Object.keys(report.chunks).length + '・気になる点 ' + bad.length + (bad.length ? ' ' + bad.join('、') : ''));
if (bad.length) process.exit(1);
