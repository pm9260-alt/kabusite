// 開くまでの時間を測る（v19 12）。node tools/load-time.cjs [回数] [フォルダ]
// 公開先（Cloudflare Pages）と同じく、文字のファイルは gzip で縮めて送るサーバーを立て、2つの条件で測る
//   遅い：回線 1.6Mbps・遅れ 150ms・処理の速さ 4分の1　目標：トップが見えるまで 3秒以内、「生まれる」が押せるまで 8秒以内
//   ふつう：回線 20Mbps・遅れ 20ms・処理の速さそのまま　目標：「生まれる」が押せるまで 1.5秒以内
// 毎回、何も覚えていないブラウザで開く（初めて来た人と同じ）。中央の値を logs/load-time.json と画面に出す
const http = require('http'), fs = require('fs'), path = require('path'), zlib = require('zlib');
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const N = +(process.argv[2] || 5), DIR = path.resolve(process.argv[3] || path.join(__dirname, '..', 'dist')), PORT = 8124;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const gzCache = {};
const srv = http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(DIR, p);
  if (!f.startsWith(DIR) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; }
  const ext = path.extname(f), t = TYPES[ext] || 'application/octet-stream';
  const zip = /text|json|javascript|svg|manifest/.test(t) && /gzip/.test(q.headers['accept-encoding'] || '');
  let body = fs.readFileSync(f);
  if (zip) body = gzCache[f] || (gzCache[f] = zlib.gzipSync(body, { level: 9 }));
  r.writeHead(200, Object.assign({ 'Content-Type': t, 'Content-Length': body.length }, zip ? { 'Content-Encoding': 'gzip' } : {}));
  r.end(body);
}).listen(PORT);
const PROFILES = [
  { name: '遅い', down: 1.6e6 / 8, up: 0.75e6 / 8, lat: 150, cpu: 4, goalTop: 3000, goalBorn: 8000 },
  { name: 'ふつう', down: 20e6 / 8, up: 5e6 / 8, lat: 20, cpu: 1, goalTop: null, goalBorn: 1500 }
];
const med = a => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
(async () => {
  const b = await chromium.launch(); const out = { dir: path.basename(DIR), at: new Date().toISOString(), runs: N, profiles: [] };
  for (const pf of PROFILES) {
    const tops = [], borns = [], bytes = [];
    for (let i = 0; i < N; i++) {
      const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
      const p = await ctx.newPage(), cdp = await ctx.newCDPSession(p);
      await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: pf.lat, downloadThroughput: pf.down, uploadThroughput: pf.up });
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: pf.cpu });
      let got = 0; cdp.on('Network.loadingFinished', e => { got += e.encodedDataLength || 0; });
      // 「生まれる」が押せるようになった時を、ページの中で正しく書き留める（待つ側の確かめの間隔に左右されない）
      await p.addInitScript(() => { const mo = new MutationObserver(() => { const b = document.getElementById('born'); if (b && !b.disabled && !window.__bornAt) { window.__bornAt = Math.round(performance.now()); mo.disconnect(); } }); mo.observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['disabled'] }); });
      const t0 = Date.now();
      await p.goto('http://localhost:' + PORT + '/index.html', { waitUntil: 'commit' });
      // トップが見える：題字と「生まれる」の場所が、CSS の当たった状態で描かれた時
      await p.waitForFunction(() => { const e = document.getElementById('born'), t = document.querySelector('.top-title'); if (!e || !t) return false; const r = e.getBoundingClientRect(), cs = getComputedStyle(t); return r.height > 0 && cs.fontSize !== '16px' && performance.getEntriesByType('paint').some(x => x.name === 'first-contentful-paint'); }, null, { polling: 50, timeout: 60000 });
      const fcp = await p.evaluate(() => { const x = performance.getEntriesByType('paint').find(x => x.name === 'first-contentful-paint'); return x ? Math.round(x.startTime) : null; });
      await p.waitForSelector('#born:not([disabled])', { timeout: 120000 });
      const tb = await p.evaluate(() => window.__bornAt || Math.round(performance.now()));
      tops.push(fcp); borns.push(tb); bytes.push(got);
      await ctx.close();
    }
    const r = { name: pf.name, top: med(tops), born: med(borns), tops, borns, kb: Math.round(med(bytes) / 1024), goalTop: pf.goalTop, goalBorn: pf.goalBorn };
    r.ok = (pf.goalTop == null || r.top <= pf.goalTop) && r.born <= pf.goalBorn;
    out.profiles.push(r);
    console.log(pf.name + '：トップが見えるまで ' + r.top + 'ms（' + tops.join('・') + '）・生まれるが押せるまで ' + r.born + 'ms（' + borns.join('・') + '）・読んだ量 約' + r.kb + 'KB・' + (r.ok ? '目標内' : '目標外'));
  }
  out.ok = out.profiles.every(x => x.ok);
  fs.mkdirSync(path.join(__dirname, '..', 'logs'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, '..', 'logs', 'load-time' + (out.dir === 'dist' ? '' : '-' + out.dir) + '.json'), JSON.stringify(out, null, 1));
  await b.close(); srv.close();
})();
