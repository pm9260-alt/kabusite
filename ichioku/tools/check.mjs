// 公開前の検査（15章の5、2章の表、作る人の追加の決まり）
// どれか1つでも不合格なら、終了コード1で止まる。結果は logs/check-report.txt にも書く。
// 使い方：node tools/check.mjs [--test] [--n 10000]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.join(ROOT, 'site');
const E = require(path.join(SITE, 'js', 'engine.js'));
const O = require(path.join(SITE, 'js', 'history.js'));

const args = process.argv.slice(2);
const TEST = args.includes('--test');
const N = +(args[args.indexOf('--n') + 1] || 0) || (TEST ? 2000 : 10000);
const YEARS = TEST ? [1975, 1990, 2000] : Array.from({ length: 26 }, (_, i) => 1975 + i);
// 1000〜1974年生まれ（昔の人生の進め方）。本番は5年おき、試験モードは9つの年。1799年以前は1年あたり400人（時間を抑えるため）
const OLD_YEARS = TEST ? [1000, 1300, 1550, 1700, 1800, 1850, 1900, 1940, 1970] : Array.from({ length: 195 }, (_, i) => 1000 + i * 5);
const OLD_N0 = TEST ? 200 : 600;
const oldN = by => (by < 1800 && !TEST ? 400 : OLD_N0);
const LAST_YEAR = 2026;

const results = [];
const CATS_OK = ['家庭', '地域', '時代', '健康', '人間関係', '学歴と仕事'];
function rec(name, ok, detail, kind) { results.push({ name, ok, detail: detail || '', kind: kind || '' }); }

const C = JSON.parse(fs.readFileSync(path.join(SITE, 'data', 'common.json'), 'utf8'));
const H = JSON.parse(fs.readFileSync(path.join(SITE, 'data', 'history.json'), 'utf8'));
const P = {};
for (const p of C.prefs) P[p.code] = JSON.parse(fs.readFileSync(path.join(SITE, 'data', 'pref', p.code + '.json'), 'utf8'));

/* ---------- 1. データそのもの ---------- */
rec('数字が仮の値ではないか', !C.meta.provisional && Object.values(P).every(p => !p.provisional),
  C.meta.provisional ? 'データの束が「仮」のまま。統計の取り込みが終わるまで公開できない' : '');

// 年表：空いている年、出典、確認済みか
{
  const years = new Set(C.timeline.map(r => r.y));
  const missing = [];
  for (let y = 1975; y <= LAST_YEAR; y++) if (!years.has(y)) missing.push(y);
  rec('年表に空いている年がないか（1975〜' + LAST_YEAR + '年）', missing.length === 0, missing.length ? '空いている年：' + missing.join('、') : '');
  const noSrc = C.timeline.filter(r => !r.src || !C.sources[r.src]);
  rec('年表の全行に根拠の統計があるか', noSrc.length === 0, noSrc.length ? noSrc.length + '行に根拠がない：' + noSrc.slice(0, 5).map(r => r.y + ' ' + r.text.slice(0, 15)).join(' / ') : '');
  const unver = C.timeline.filter(r => !r.verified);
  rec('年表の全行の出典を確かめたか', unver.length === 0, unver.length ? unver.length + '行が未確認（出典を確かめたら verified: true にする）' : '');
  const types = {};
  for (const r of C.timeline) { types[r.y] = types[r.y] || new Set(); types[r.y].add(r.type); }
  const thin = Object.entries(types).filter(([, s]) => s.size < 5).length;
  rec('1年あたり5種類そろっているか（目標）', thin === 0, thin + '年が5種類に満たない', '目標');
}

// 場面
{
  const noSrc = C.scenes.filter(s => !s.src || !C.sources[s.src] || !s.what);
  rec('場面の「根拠の統計」欄が空でないか', noSrc.length === 0, noSrc.length ? noSrc.map(s => s.id).join('、') : '');
  rec('場面の数が600以上か（第1段階）', C.scenes.length >= 600, '今 ' + C.scenes.length + ' 場面');
  const badY = C.scenes.filter(s => s.y && (s.y[0] > s.y[1] || s.y[0] < 1900 || s.y[1] > LAST_YEAR));
  rec('場面の「使える年の範囲」が正しく入っているか', badY.length === 0, badY.map(s => s.id).join('、'));
  const ids = C.scenes.map(s => s.id);
  const dupId = ids.filter((x, i) => ids.indexOf(x) !== i);
  rec('場面の番号が重なっていないか', dupId.length === 0, dupId.join('、'));
  const extra = Object.entries(C.sources).filter(([k, v]) => v.extra && !v.approved && C.scenes.some(s => s.src === k)).map(([, v]) => v.name);
  rec('8章の一覧にない統計を使っていないか', extra.length === 0, extra.length ? '作る人の判断待ち：' + extra.join('、') : '');
}

// 市区町村が全部選ばれうるか
{
  const zero = [];
  for (const p of Object.values(P)) for (const m of p.munis) {
    for (const y of YEARS) if (!(E.val(m.share, y) > 0)) { zero.push(p.name + m.name + '（' + y + '年）'); break; }
  }
  rec('全市区町村が生まれ先として選ばれうるか', zero.length === 0, zero.join('、'));
  const noBirth = C.prefs.filter(p => YEARS.some(y => !(E.val(p.births, y) > 0)));
  rec('全都道府県に出生数があるか', noBirth.length === 0, noBirth.map(p => p.name).join('、'));
}

// 相談先
rec('相談先の名前と番号を公開前に確かめたか', C.hotline.every(h => h.verified), C.hotline.filter(h => !h.verified).map(h => h.name).join('、'));

/* ---------- 2. 文章の検査（禁止語・実名・文字） ---------- */
const BANNED = ['勝ち組', '負け組', '底辺', 'Fラン', '高学歴', '低学歴', 'エリート', '上級国民', '国立+5', '地方国立', 'MARCH', '早慶', '旧帝'];
// 作る人の決まり：画面のどこにも使わない言葉（文字コードで書いてある）
const BANNED_OWNER = ['\u52b9\u304f', '\u52b9\u3044\u3066', '\u52b9\u304d', '\u91cd\u3044', '\u91cd\u304f', '\u8aad\u307f'];
// 本家の要素を取り入れる指示書（2026-10-16）で足した言葉
BANNED_OWNER.push('\u91cd\u304b\u3063', '\u91cd\u3051\u308c', '見ます', '判定', '一方で', '結論から言うと', '示唆', 'わけです', '極めて', '興味深い', '齟齬', '——');
const REAL = fs.readFileSync(path.join(ROOT, 'tools', 'realnames.txt'), 'utf8').split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith('#'));
// 日本語では使わない簡体字の一部と、文字化けでよく出る字
// （体・写・机・黄・乱・辞・長・場 などは日本語でも使うので入れない）
const SIMPLIFIED = '话说时们这个对为发门见问车东书开关让还过么吗边动经济运进产业样钱银线头报类图丽严两乡买亲优传伤闻员题请谁调贝负贵费资赛软轻较辆辑输达远连选适递邮钟铁铃链锁错镜韩页项须顾领频风飞饭饮馆驾验鱼鸟齐龙';
const MOJIBAKE = /[�縺繧繝譁蜈荳蛻螟]/;
const HANGUL = /[ᄀ-ᇿ㄰-㆏가-힯]/;
const CYRILLIC = /[Ѐ-ӿ]/;
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}]/u;

function texts() {
  const out = [];
  for (const s of C.scenes) out.push(['場面 ' + s.id, s.t]);
  for (const r of C.timeline) { out.push(['年表 ' + r.y, r.text]); if (r.hit) out.push(['年表 ' + r.y + '（自分）', r.hit.text]); if (r.short) out.push(['年表 ' + r.y + '（短）', r.short]); }
  for (const g of C.goods) { out.push(['物 ' + g.id, g.home]); out.push(['物 ' + g.id, g.own]); }
  for (const e of C.events || []) {
    out.push(['出来事 ' + e.id, e.title + ' ' + e.srcNote]);
    for (const a of e.areas || []) out.push(['出来事 ' + e.id, a.text]);
    for (const a of e.all || []) out.push(['出来事 ' + e.id, a.text]);
  }
  // 1000〜1974年生まれの文（2026-10-16 に検査の対象から漏れていたため追加）
  for (const s of H.scenes) out.push(['昔の場面', s.t]);
  for (const r of H.timeline) out.push(['昔の年表 ' + r.y, r.t]);
  for (const c of H.eraContext) out.push(['時代のようす', c.t]);
  for (const e of H.events) out.push(['昔の出来事 ' + e.id, [e.title, e.text, e.deadText, e.note, e.src.name].join(' ')]);
  for (const m of H.moves) out.push(['移り住む ' + m.id, m.text + ' ' + m.place]);
  for (const k of Object.keys(H.status)) out.push(['身分 ' + k, H.status[k].name + ' ' + H.status[k].note]);
  for (const f of ['index.html', 'about.html', 'privacy.html', 'contact.html', 'changelog.html', 'js/app.js', 'js/engine.js', 'js/history.js', 'js/avatar.js', 'js/card.js', 'js/prefs.js']) {
    const p = path.join(SITE, f);
    if (fs.existsSync(p)) out.push([f, stripCode(fs.readFileSync(p, 'utf8'))]);
  }
  return out;
}
// プログラムの文字列とHTMLの本文だけを対象にする（コメントの中の説明は除く）
function stripCode(src) { return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/<!--[\s\S]*?-->/g, ''); }

{
  const T = texts();
  const hit = (list) => { const f = []; for (const [where, t] of T) for (const w of list) if (t.includes(w)) f.push(where + '「' + w + '」'); return f; };
  const b1 = hit(BANNED); rec('禁止語（11章）が入っていないか', b1.length === 0, b1.slice(0, 10).join('、'));
  const b2 = hit(BANNED_OWNER);
  // 「まず」は副詞のときだけ（「抱え込まずに」のような動詞の形は除く）
  for (const [where, t] of T) if (/(^|[、。「（\s'"])まず/.test(t)) b2.push(where + '「まず」'); rec('作る人が使わないと決めた言葉が入っていないか', b2.length === 0, b2.slice(0, 10).join('、'));
  // 実名の一覧の言葉を含むだけの別の言葉（「関東大震災」の「東大」など）はよける
  const REAL_OK = ['関東大震災', '東京大空襲', '東大寺', '安倍氏'];
  // 昔の公家の氏（うじ）の一覧にある「安倍」は、土御門家の本姓としての氏の名前（安倍氏）で、人の実名ではない。history.js の氏の一覧の書き方だけをよける
  const REAL_OK_IN = { 'js/history.js': ["'安倍'"] };
  const T0 = T.map(([w, t]) => [w, REAL_OK.concat(REAL_OK_IN[w] || []).reduce((x, k) => x.split(k).join(''), t)]);
  const b3 = ((list) => { const f = []; for (const [where, t] of T0) for (const w of list) if (t.includes(w)) f.push(where + '「' + w + '」'); return f; })(REAL); rec('実名の一覧に当たる名前が入っていないか', b3.length === 0, b3.slice(0, 10).join('、'));
  const chars = [];
  for (const [where, t] of T) {
    if (HANGUL.test(t)) chars.push(where + '（ハングル）');
    if (CYRILLIC.test(t)) chars.push(where + '（キリル文字）');
    if (MOJIBAKE.test(t)) chars.push(where + '（文字化け）');
    if (EMOJI.test(t)) chars.push(where + '（絵文字）');
    for (const ch of SIMPLIFIED) if (t.includes(ch)) { chars.push(where + '（簡体字「' + ch + '」）'); break; }
  }
  rec('文字化け・ハングル・キリル文字・簡体字・絵文字の混入がないか', chars.length === 0, chars.slice(0, 10).join('、'));
}

/* ---------- 3. 画面のファイル ---------- */
function tagBalance(html) {
  const voids = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
  const body = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<script[\s\S]*?<\/script>/gi, '<script></script>').replace(/<style[\s\S]*?<\/style>/gi, '<style></style>');
  const stack = [], errs = [];
  const re = /<\/?([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*?(\/?)>/g;
  let m;
  while ((m = re.exec(body))) {
    const tag = m[1].toLowerCase();
    if (m[0].startsWith('<!')) continue;
    if (voids.has(tag) || m[2] === '/') continue;
    if (m[0].startsWith('</')) {
      const top = stack.pop();
      if (top !== tag) { errs.push('</' + tag + '> の前に <' + top + '> が閉じていない'); break; }
    } else stack.push(tag);
  }
  if (!errs.length && stack.length) errs.push('閉じていないタグ：' + stack.join(', '));
  return errs;
}
{
  const errs = [];
  for (const f of fs.readdirSync(SITE).filter(f => f.endsWith('.html'))) {
    const e = tagBalance(fs.readFileSync(path.join(SITE, f), 'utf8'));
    if (e.length) errs.push(f + '：' + e.join(' / '));
  }
  rec('HTMLのタグの開閉がそろっているか', errs.length === 0, errs.join('、'));
}
// 公開用フォルダーに台帳やスクリプトが混ざっていないか
{
  const bad = [];
  (function walk(d) {
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (/\.(ps1|py|tsv|mjs|csv|log|env)$/i.test(f) || /keys?\.json$/i.test(f)) bad.push(path.relative(SITE, p));
    }
  })(SITE);
  rec('公開用フォルダーにスクリプトや台帳が混ざっていないか', bad.length === 0, bad.join('、'));
  const red = fs.existsSync(path.join(SITE, '_redirects')) ? fs.readFileSync(path.join(SITE, '_redirects'), 'utf8') : '';
  const need = ['.ps1', '.py', '.tsv'].filter(x => !red.includes('*' + x));
  rec('_redirects で .ps1 .py .tsv を塞いでいるか', need.length === 0, need.length ? '塞いでいない：' + need.join(' ') : '');
}
// 画面の決まり（13章）とコントラスト比
function lum(hex) {
  const n = hex.replace('#', '');
  const v = [0, 2, 4].map(i => parseInt(n.length === 3 ? n[i / 2] + n[i / 2] : n.substr(i, 2), 16) / 255).map(c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}
function ratio(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
function vars(block) { const o = {}; block.replace(/(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,6})/g, (_, k, v) => { o[k] = v; }); return o; }
{
  const cssPath = path.join(SITE, 'css', 'style.css');
  const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';
  const forbid = [
    [/gradient\s*\(/i, 'グラデーション'], [/box-shadow\s*:\s*(?!none)/i, '影'], [/text-shadow\s*:\s*(?!none)/i, '文字の影'],
    [/backdrop-filter|filter\s*:\s*blur/i, 'ぼかし'], [/text-decoration[^;]*underline/i, '下線'],
    [/border-left\s*:/i, '枠の左側だけの色付け']
  ];
  const f = forbid.filter(([re]) => re.test(css.replace(/sans-serif/gi, ''))).map(([, n]) => n);
  rec('使わないもの（グラデーション・影・ぼかし・下線・左側だけの色）がないか（明朝体は原作に合わせて大きな数字と見出しにだけ使う。2026-10-17 作る人の指示）', f.length === 0, f.join('、'));
  const light = vars((css.match(/:root\s*\{([\s\S]*?)\}/) || [])[1] || '');
  const dark = vars((css.match(/:root\[data-theme="dark"\]\s*\{([\s\S]*?)\}/) || [])[1] || '');
  const pairs = [['--text', '--bg'], ['--text', '--surface'], ['--sub', '--bg'], ['--sub', '--surface'], ['--accent', '--bg'], ['--accent', '--surface'], ['--on-accent', '--accent'], ['--world', '--bg'], ['--world', '--surface'], ['--warn', '--bg'], ['--warn', '--surface'], ['--prov-text', '--prov-bg'], ['--reborn-text', '--reborn-bg']];
  const low = [];
  for (const [name, set] of [['明るい画面', light], ['暗い画面', dark]]) {
    for (const [fg, bg] of pairs) {
      if (!set[fg] || !set[bg]) { low.push(name + ' ' + fg + '/' + bg + ' の色が見つからない'); continue; }
      const r = ratio(set[fg], set[bg]);
      if (r < 4.5) low.push(name + ' ' + fg + '/' + bg + ' = ' + r.toFixed(2));
    }
  }
  rec('文字と背景のコントラスト比が全組み合わせで4.5以上か', low.length === 0, low.join('、'));
}

/* ---------- 4. 人生を自動で回す ---------- */
const expCache = {};
const sim = { lives: 0, catAll: {}, catPre: {}, empty: 0, dupe: 0, contra: [], yearOut: [], univ: { s: 0, n: 0, t: 0 }, life: { s: 0, n: 0, t: 0 }, marr: { s: 0, n: 0, t: 0 }, nonreg: { s: 0, n: 0, t: 0 }, dual: { s: 0, n: 0, t: 0 }, sib: { s: 0, n: 0, t: 0 }, muniHit: {} };
const sceneById = Object.fromEntries(C.scenes.map(s => [s.id, s]));
const t0 = Date.now();
for (const by of YEARS) {
  const rnd = E.makeRng(by * 31 + 7);
  // 平均寿命の期待値（同じ生命表から、生まれた年の人が何歳まで生きるかを計算）
  for (let i = 0; i < N; i++) {
    const code = E.pickPref(C, by, rnd);
    const L = E.autoRun(E.newLife(C, P[code], { year: by, seed: (by * 100003 + i * 7 + 1) >>> 0 }));
    sim.lives++;
    sim.muniHit[L.home.muni] = 1;
    sim.empty += L.stats.emptyYears;
    const used = {};
    for (const r of L.log) {
      for (const e of r.events) {
        if (e.flavor || e.story) continue; // 名前の入った小さな出来事（第2弾の6）と、物語の分かれ道・まわりの人の出来事（別に数える）は場面の割合に数えない
        sim.catAll[e.cat] = (sim.catAll[e.cat] || 0) + 1;
        if (r.year <= LAST_YEAR) sim.catPre[e.cat] = (sim.catPre[e.cat] || 0) + 1;
        if (e.sid) {
          if (used[e.sid]) sim.dupe++;
          used[e.sid] = 1;
          const s = sceneById[e.sid];
          if (s.y && (r.year < s.y[0] || r.year > s.y[1])) sim.yearOut.push(e.sid + '@' + r.year);
          if (s.since && r.year < s.since) sim.yearOut.push(e.sid + '@' + r.year);
          for (const id of e.mem || []) {
            const m = L.members.find(x => x.id === id);
            if (!m || (m.dy && m.dy < r.year) || m.by > r.year) sim.contra.push('亡くなった・生まれていない家族が登場 ' + e.sid);
          }
        }
      }
    }
    // 家族の矛盾
    const mom = L.members.find(m => m.role === '母'), dad = L.members.find(m => m.role === '父');
    for (const p of [mom, dad]) { const d = by - p.by; if (d < 15 || d > 50) sim.contra.push('親と子の年齢差 ' + d); }
    for (const k of L.members.filter(m => m.role === '子')) { const d = k.by - by; if (d < 15 || d > 50) sim.contra.push('自分と子の年齢差 ' + d); }
    const names = L.members.filter(m => !m.gone || m.role !== '配偶者').map(m => m.name).concat([L.name]);
    if (new Set(names).size !== names.length) sim.contra.push('家族の中で同じ名前');
    for (const g of L.members.filter(m => m.role === '孫')) if (!L.members.some(m => m.id === g.parentId && m.role === '子')) sim.contra.push('子のいない孫');
    // 統計との比較
    const P0 = P[code];
    if (L.deathAge === undefined || L.deathAge >= 18) { sim.univ.n++; sim.univ.s += L.stats.univ ? 1 : 0; sim.univ.t += E.val(P0.s.univ, by + 18); }
    if (L.deathAge === undefined || L.deathAge >= 50) { sim.marr.n++; sim.marr.s += L.everMarried ? 1 : 0; sim.marr.t += E.val(C.nat.everMarried[L.sex], by); }
    sim.life.n++; sim.life.s += L.deathAge; sim.life.t += expectedLife(P0, L.sex, by);
    // 母が働いている割合（共働きの割合）と、家の子どもの人数（母の世代の子どもの数の割合を、子どもの側から見た平均）
    sim.dual.n++; sim.dual.s += L.momJob ? 1 : 0; sim.dual.t += E.val(C.nat.dualIncome, by);
    if (L.sibK) { const sd = sibAt(C.nat.sibDist, L.members.find(m => m.role === '母').by); const w = sd.map((x, i) => x * (i + 1)); const tw = w.reduce((a, b) => a + b, 0); sim.sib.n++; sim.sib.s += L.sibK; sim.sib.t += w.reduce((a, x, i) => a + x * (i + 1), 0) / tw; }
    for (const [y, nr] of Object.entries(L.stats.nonreg)) if (+y <= 2025) { sim.nonreg.n++; sim.nonreg.s += nr ? 1 : 0; sim.nonreg.t += E.val(C.nat.nonreg, +y) / 100; }
  }
}
function sibAt(t, by) {
  if (Array.isArray(t)) return t;
  const ks = Object.keys(t).map(Number).sort((a, b) => a - b);
  if (by <= ks[0]) return t[ks[0]];
  if (by >= ks[ks.length - 1]) return t[ks[ks.length - 1]];
  const i = ks.findIndex(k => k >= by), a = ks[i - 1], b = ks[i], w = (by - a) / (b - a);
  return t[a].map((x, j) => x * (1 - w) + t[b][j] * w);
}
function expectedLife(P0, sex, by) {
  const k = P0.code + sex + by;
  if (expCache[k] !== undefined) return expCache[k];
  let l = 1, e = 0;
  for (let a = 0; a <= 110; a++) {
    const q = a >= 110 ? 1 : E.deathProb(C, P0, sex, a, by + a);
    e += l * q * a; // その年齢で亡くなる人の割合 × 年齢
    l *= 1 - q;
  }
  return (expCache[k] = e);
}
const secs = ((Date.now() - t0) / 1000).toFixed(0);
const share = (o, k) => { const t = Object.values(o).reduce((a, b) => a + b, 0); return t ? (o[k] || 0) / t : 0; };
rec('学歴と仕事の場面が全体の25%以下か', share(sim.catAll, '学歴と仕事') <= 0.25, (share(sim.catAll, '学歴と仕事') * 100).toFixed(1) + '%');
rec('時代の場面が15%以上か（' + LAST_YEAR + '年までの年で数える。物語の分かれ道とまわりの人の出来事は除く）', share(sim.catPre, '時代') >= 0.15, (share(sim.catPre, '時代') * 100).toFixed(1) + '%（2027年以降も含めると ' + (share(sim.catAll, '時代') * 100).toFixed(1) + '%）');
rec('場面が空の年がないか', sim.empty === 0, sim.empty + '年');
rec('同じ人生の中で同じ場面が2回出ていないか', sim.dupe === 0, sim.dupe + '回');
rec('能力・家族・時代の矛盾がないか', sim.contra.length === 0, [...new Set(sim.contra)].slice(0, 8).join('、'));
rec('使える年の範囲の外で出た場面がないか', sim.yearOut.length === 0, [...new Set(sim.yearOut)].slice(0, 8).join('、'));
// 統計どおりの割合で回すと、出生数がごく少ない村は選ばれないことがある（作る人の判断 E-1、2026-10-16）。
// 選ばれなかった市区町村は、生まれる町を指定して1人ずつ人生を最後まで回し、止まらずに動くかを確かめる
const missMuni = Object.values(P).flatMap(p => p.munis.filter(m => !sim.muniHit[m.code]).map(m => ({ p, m })));
const forcedBad = [];
missMuni.forEach(({ p, m }, i) => {
  const by = YEARS[i % YEARS.length];
  try {
    const L = E.autoRun(E.newLife(C, p, { year: by, muniCode: m.code, seed: (by * 7919 + i * 104729 + 17) >>> 0 }));
    if (L.home.muni !== m.code) forcedBad.push(p.name + m.name + '（別の町で生まれた）');
    else if (L.alive) forcedBad.push(p.name + m.name + '（人生が最後まで進まなかった）');
    else if (L.stats.emptyYears) forcedBad.push(p.name + m.name + '（場面が空の年がある）');
  } catch (e) { forcedBad.push(p.name + m.name + '（止まった：' + e.message + '）'); }
});
rec('全市区町村で人生が最後まで動くか', forcedBad.length === 0,
  forcedBad.length ? forcedBad.slice(0, 20).join('、') : '自動で回した人生で選ばれた ' + (Object.values(P).reduce((t, p) => t + p.munis.length, 0) - missMuni.length) + '、選ばれなかった ' + missMuni.length + ' は町を指定して1人ずつ回した');
function cmp(name, o, scale, unit) {
  if (!o.n) { rec(name, false, '数えられる人がいない'); return; }
  const a = o.s / o.n * scale, b = o.t / o.n * scale;
  rec(name, Math.abs(a - b) <= 3, '回した結果 ' + a.toFixed(1) + unit + '／元の統計 ' + b.toFixed(1) + unit + '（差 ' + (a - b).toFixed(1) + '）');
}
cmp('大学進学率が元の統計から±3ポイント以内か', sim.univ, 100, '%');
cmp('平均寿命が元の統計から±3年以内か', sim.life, 1, '歳');
cmp('婚姻率（50歳までに結婚）が元の統計から±3ポイント以内か', sim.marr, 100, '%');
cmp('非正規の割合（25〜34歳）が元の統計から±3ポイント以内か', sim.nonreg, 100, '%');
cmp('母が働いている家の割合が共働きの割合（労働力調査）から±3ポイント以内か', sim.dual, 100, '%');
{
  const o = sim.sib, a = o.n ? o.s / o.n : 0, b = o.n ? o.t / o.n : 0;
  rec('家の子どもの人数の平均が、母の世代の子どもの数の割合（出生動向基本調査）から±0.1人以内か', o.n > 0 && Math.abs(a - b) <= 0.1, '回した結果 ' + a.toFixed(2) + '人／元の統計 ' + b.toFixed(2) + '人');
}
// tools/extra.py で取り出した数字：資料との照らし合わせで残った問題がないか、印が全国に付いているか
{
  const X = fs.existsSync(path.join(ROOT, 'data-src', 'stats', 'extra.json')) ? JSON.parse(fs.readFileSync(path.join(ROOT, 'data-src', 'stats', 'extra.json'), 'utf8')) : null;
  rec('報告書などから取り出した数字（extra.json）に、合わなかった名前が残っていないか', !!X && X.problems.length === 0, X ? X.problems.slice(0, 8).join('、') : 'extra.json がない（python3 -I tools/extra.py で作る）');
  const all = Object.values(P).flatMap(p => p.munis);
  const sn = all.filter(m => m.snow).length, co = all.filter(m => m.coast).length;
  rec('雪と海沿いの印が全国の市区町村に付いているか（試験用の12市区町村だけでないか）', sn > 300 && co > 300, '雪 ' + sn + '・海沿い ' + co + ' 市区町村（全 ' + all.length + '）');
  const noOld = all.filter(m => !(Math.min(...Object.keys(m.share).map(Number)) <= 1975)).length;
  rec('1975〜1994年生まれの市区町村の割合が全市区町村にあるか', noOld === 0, noOld ? noOld + ' 市区町村で1995年の割合を代用' : '1995年より前は推計の印付き');
}

/* ---------- 5. 1000〜1974年生まれ ---------- */
{
  const noSrc = H.events.filter(e => !e.src || !e.src.name);
  rec('昔の出来事の全件に根拠があるか', noSrc.length === 0, noSrc.map(e => e.id).join('、'));
  const badRate = H.events.flatMap(e => Object.entries(e.rates).flatMap(([y, r]) => Object.entries(r).filter(([, v]) => !(v >= 0 && v < 0.6)).map(([k, v]) => e.id + ' ' + y + ' ' + k + '=' + v)));
  rec('昔の出来事の亡くなる割合が0〜60%の中か', badRate.length === 0, badRate.slice(0, 5).join('、'));
  const badScene = H.scenes.filter(s => !s.t || !s.cat || !s.a || (s.y && s.y[0] > s.y[1]) || CATS_OK.indexOf(s.cat) < 0);
  rec('昔の場面の書き方が正しいか', badScene.length === 0, badScene.slice(0, 5).map(s => (s.t || '').slice(0, 15)).join('、'));
  const tlY = new Set(H.timeline.map(r => r.y));
  const ctxMiss = [];
  for (let y = 1000; y <= 1974; y++) if (!tlY.has(y) && !H.eraContext.some(c => y >= c.from && y <= c.to && !c.provs)) ctxMiss.push(y);
  for (const pv of ['蝦夷・松前', '琉球']) for (let y = 1000; y <= 1608; y++) if (!H.eraContext.some(c => y >= c.from && y <= c.to && c.provs && c.provs.includes(pv))) ctxMiss.push(pv + y);
  rec('1000〜1974年の「その年の世の中」が空の年がないか', ctxMiss.length === 0, ctxMiss.join('、'));
}
const old = { lives: 0, err: [], badText: [], contra: [], jp: [], empty: 0, years: 0, q0: { s: 0, n: 0, t: 0 }, elem: { s: 0, n: 0, t: 0 }, hs: { s: 0, n: 0, t: 0 }, marr: { s: 0, n: 0, t: 0 }, prov: {}, pref: {} };
const t1 = Date.now();
const JP_SCENES = new Set(H.scenes.filter(s => s.jp).map(s => s.t));
const med = { e0: { s: 0, n: 0, t: 0 }, bad: [], world: [] };
const MAIN_TL = new Set(H.timeline.filter(r => !r.provs && !r.prefs).map(r => r.t));
for (const by of OLD_YEARS) {
  for (let i = 0; i < oldN(by); i++) {
    const seed = (by * 100003 + i * 7 + 1) >>> 0;
    try {
      const b = O.pickBirth(C, H, by, E.makeRng(seed ^ 0x9e3779b9));
      const L = O.autoRun(O.newLife(C, H, P[b.pref] || null, { year: by, seed, birth: b }));
      old.lives++;
      old.prov[b.prov] = 1; old.pref[b.pref] = 1;
      if (L.kind === 'fish' && ['09', '10', '11', '19', '20', '21', '29'].includes(L.pref)) old.contra.push('海のない県で浜の村に生まれた');
      if (L.kind === 'fish' && L.muniName) old.contra.push('浜の村に海沿いか分からない市区町村名を添えた');
      if (L.alive) old.err.push(by + '年生まれの人生が最後まで進まなかった');
      for (const r of L.log) {
        old.years++;
        if (!r.events.length && r.age < 95) old.empty++;
        if (!r.world.items.length) old.err.push(r.year + '年の世の中が空');
        for (const e of r.events) {
          if (/undefined|NaN|null|\{|\}|アイヌ語の名前/.test(e.t)) old.badText.push(r.year + ' ' + e.t.slice(0, 30));
          if ((L.ainu || L.ryukyu) && JP_SCENES.has(e.t)) old.jp.push(e.t.slice(0, 20));
          for (const v of e.ev) if (/undefined|NaN/.test(String(v.val) + v.what + v.name)) old.badText.push('根拠 ' + r.year + ' ' + v.what);
        }
      }
      const mom = L.members.find(m => m.role === '母'), dad = L.members.find(m => m.role === '父');
      for (const p of [mom, dad]) { const d = by - p.by; if (d < 15 || d > 62) old.contra.push('親と子の年齢差 ' + d); }
      for (const k of L.members.filter(m => m.role === '子')) { const d = k.by - by; if (d < 14 || d > 62) old.contra.push('自分と子の年齢差 ' + d); }
      // 統計との比較
      old.q0.n++; old.q0.s += L.deathAge === 0 ? 1 : 0; old.q0.t += O.deathProb(L, L.sex, 0, by);
      // 1000〜1599年生まれ：身分と場所の組み合わせ、北海道と沖縄に本州の出来事が出ないか、平均寿命
      if (by < 1600) {
        const st = L.status;
        if (st === 'satsumon' && !(by < 1200 && b.prov === '蝦夷・松前')) med.bad.push('擦文文化の人が' + by + '年・' + b.prov + 'に');
        if (st === 'gusuku' && !(by < 1429 && b.pref === '47')) med.bad.push('グスク時代の人が' + by + '年・' + b.pref + 'に');
        if (st === 'kuge' && b.prov !== '山城') med.bad.push('貴族が' + b.prov + 'に');
        for (const r of L.log) {
          if (/江戸/.test(r.place) && r.year < 1603) med.bad.push(r.year + '年に江戸の町');
          if (((b.prov === '蝦夷・松前' && r.year < 1600) || (b.prov === '琉球' && r.year < 1609)) && r.world.items.some(it => MAIN_TL.has(it.t))) med.world.push(b.prov + ' ' + r.year);
          if (r.income && r.income.cur !== (r.year < 1600 ? '貫文' : '両')) med.bad.push(r.year + '年のお金の単位 ' + r.income.cur);
        }
        med.e0.n++; med.e0.s += L.deathAge;
        let l = 1, e = 0; for (let a = 0; a < 110; a++) { const q = O.deathProb(L, L.sex, a, by + a); e += l * q * a; l *= 1 - q; } med.e0.t += e + l * 110;
      }
      if (by + 6 >= 1873 && by + 6 <= 1920 && L.deathAge >= 7) { old.elem.n++; old.elem.s += L.stats.school ? 1 : 0; old.elem.t += lerp(H.nat.elem[L.sex], by + 6); }
      if (by + 15 >= 1950 && by + 15 <= 1974 && L.deathAge >= 16 && !L.stats.abroad) { old.hs.n++; old.hs.s += L.stats.mid ? 1 : 0; old.hs.t += lerp(H.nat.hs[L.sex], by + 15); }
      if (L.deathAge >= 50 && by >= 1870) { old.marr.n++; old.marr.s += L.everMarried ? 1 : 0; old.marr.t += 1 - lerp(H.nat.neverMarried[L.sex], by + 45); }
    } catch (e) { old.err.push(by + '年 ' + e.message); }
  }
}
function lerp(s, y) { const ks = Object.keys(s).map(Number).sort((a, b) => a - b); if (y <= ks[0]) return s[ks[0]]; if (y >= ks[ks.length - 1]) return s[ks[ks.length - 1]]; for (let i = 1; i < ks.length; i++) if (y <= ks[i]) { const a = ks[i - 1], b = ks[i]; return s[a] + (s[b] - s[a]) * (y - a) / (b - a); } return 0; }
// 抽選で選ばれなかった旧国・都道府県も、生まれる場所を指定して1人ずつ回す
const forcedOld = [];
for (const n of Object.keys(H.prov).filter(n => !H.prov[n].parent)) {
  if (old.prov[n]) continue;
  const p = H.prov[n], src = p.subs ? H.prov[p.subs[0]] : p, pref = Object.keys(src.prefs)[0];
  for (const fy of [1020, 1500, 1820]) try { const L = O.autoRun(O.newLife(C, H, P[pref], { year: fy, seed: 12345 + fy, birth: { prov: n, sub: p.subs ? p.subs[0] : null, pref } })); if (L.alive) forcedOld.push(n + fy); } catch (e) { forcedOld.push(n + fy + '（' + e.message + '）'); }
}
for (const c of Object.keys(P)) {
  if (old.pref[c]) continue;
  try { const b = { prov: null, sub: null, pref: c }; const cand = Object.keys(H.prov).find(n => !H.prov[n].subs && H.prov[n].prefs && H.prov[n].prefs[c]); b.prov = H.prov[cand].parent || cand; b.sub = H.prov[cand].parent ? cand : null; const L = O.autoRun(O.newLife(C, H, P[c], { year: 1930, seed: 54321, birth: b })); if (L.alive) forcedOld.push(c); } catch (e) { forcedOld.push(c + '（' + e.message + '）'); }
}
const oldSecs = ((Date.now() - t1) / 1000).toFixed(0);
rec('1000〜1974年生まれの人生が止まらずに最後まで動くか', old.err.length === 0 && forcedOld.length === 0, old.err.slice(0, 5).concat(forcedOld.slice(0, 5)).join('、') || old.lives + '人分（' + oldSecs + '秒）。抽選で選ばれなかった旧国・都道府県も1人ずつ回した');
rec('昔の人生の文に、名前の置き換え漏れや表示できない値がないか', old.badText.length === 0, [...new Set(old.badText)].slice(0, 5).join('、'));
rec('アイヌと琉球の人に本土の風習の場面が出ていないか', old.jp.length === 0, [...new Set(old.jp)].slice(0, 5).join('、'));
rec('昔の人生の家族の年齢に矛盾がないか', old.contra.length === 0, [...new Set(old.contra)].slice(0, 5).join('、'));
rec('昔の人生で自分の出来事が空の年が2%以下か（95歳以上を除く）', old.empty / old.years <= 0.02, (old.empty / old.years * 100).toFixed(1) + '%', '目標');
function cmpOld(name, o, unit, tol) {
  if (!o.n) { rec(name, false, '数えられる人がいない'); return; }
  const a = o.s / o.n * 100, b = o.t / o.n * 100;
  rec(name, Math.abs(a - b) <= tol, '回した結果 ' + a.toFixed(1) + unit + '／元の統計 ' + b.toFixed(1) + unit + '（差 ' + (a - b).toFixed(1) + '）');
}
cmpOld('昔の人生：0歳で亡くなる割合が元の数字から±3ポイント以内か', old.q0, '%', 3);
cmpOld('昔の人生：小学校に通った割合（1873〜1920年に6歳）が元の統計から±3ポイント以内か', old.elem, '%', 3);
cmpOld('昔の人生：高校進学率（1950〜1974年に15歳）が元の統計から±3ポイント以内か', old.hs, '%', 3);
cmpOld('昔の人生：50歳までに結婚した割合が元の統計から±3ポイント以内か', old.marr, '%', 3);

/* ---------- 1000〜1599年生まれ ---------- */
{
  rec('1000〜1599年生まれ：身分と生まれた場所・時代が合っているか（擦文文化・グスク時代・貴族・江戸の町・お金の単位）', med.bad.length === 0, [...new Set(med.bad)].slice(0, 8).join('、') || med.e0.n + '人分');
  rec('1600年より前の北海道と沖縄の人に、本州の年表が出ていないか', med.world.length === 0, [...new Set(med.world)].slice(0, 8).join('、'));
  const d = med.e0.n ? med.e0.s / med.e0.n - med.e0.t / med.e0.n : 99;
  rec('1000〜1599年生まれの平均寿命が、目安の寿命の表から±3年以内か（飢饉や戦の分だけ短くなる）', Math.abs(d) <= 3, '回した結果 ' + (med.e0.s / med.e0.n).toFixed(1) + '歳／寿命の表 ' + (med.e0.t / med.e0.n).toFixed(1) + '歳（差 ' + d.toFixed(1) + '）');
  const want = [[1000, '長保2年'], [1185, '文治元年'], [1306, '徳治元年'], [1467, '応仁元年'], [1600, '慶長5年'], [1688, '元禄元年'], [1868, '明治元年']];
  const eraBad = want.filter(([y, t]) => { const b = O.pickBirth(C, H, y, E.makeRng(7)); const L = O.newLife(C, H, P[b.pref] || null, { year: y, seed: 7, birth: b }); return O.step(L).eraLabel !== t; }).map(([y, t]) => y + '年は' + t);
  rec('元号が年表と合っているか（1000・1185・1306・1467・1600・1688・1868年）', eraBad.length === 0, eraBad.join('、'));
}

/* ---------- 年ごとの平均寿命の流れ（2026-10-16 の失敗から追加） ----------
   今の本体の係数の意味を変えたとき、昔の本体が1975年の係数をそのまま借りていて、1970〜1974年の死亡率が跳ね上がった。
   回した人生と同じ式どうしの比べ方では見つからないため、その年の死亡率のままの平均寿命が、
   毎年、15〜95歳の中にあり、5年で6年より大きく動かないこと（戦争の年を除く）を確かめる */
{
  const bad = [], seq = [];
  const v = Object.create({ C, H, P: P['13'], old: true, pref: '13', kind: 'village' });
  for (let y = 1000; y <= 2020; y++) {
    for (const sex of ['m', 'f']) {
      let l = 1, e = 0;
      for (let a = 0; a < 111; a++) { const q = a >= 110 ? 1 : O.deathProb(v, sex, a, y); e += l * (1 - q / 2); l *= 1 - q; if (l < 1e-9) break; }
      seq.push([y, sex, e]);
      if (!(e >= 15 && e <= 95)) bad.push(y + '年' + sex + ' ' + e.toFixed(1) + '歳');
    }
  }
  for (let i = 10; i < seq.length; i++) {
    const [y, sex, e] = seq[i], p0 = seq[i - 10][2];
    // 1920〜1960年は戦争と戦後の急な延びがあるため10年まで（1940〜1950年は数えない）
    if (Math.abs(e - p0) > (y >= 1920 && y <= 1960 ? 10 : 6) && !(y >= 1940 && y <= 1950)) bad.push(sex + ' ' + (y - 5) + '→' + y + '年 ' + p0.toFixed(1) + '→' + e.toFixed(1) + '歳');
  }
  rec('その年の死亡率のままの平均寿命が、1000〜2020年のどの年も15〜95歳の中で、5年で6年より大きく跳ねないか', bad.length === 0, bad.slice(0, 8).join('、') || '1000年 男' + seq[0][2].toFixed(1) + '歳 → 2020年 女' + seq[seq.length - 1][2].toFixed(1) + '歳');
}

/* ---------- 6. 本家から取り入れた仕組み ---------- */
// A：入力欄はなくした（作る人の指示 2026-10-17）。節目の問いかけは画面では止まらずに空の答えで進み、人生の中身は変わらない
{
  const bad = [];
  const run = (M, L) => {
    const asked = [];
    let g = 0;
    while (L.alive && g++ < 130) {
      let r = M.step(L);
      while (r && r.branch) { if (r.branch.ask) asked.push(r.age); r = M.resolve(L, r.branch.ask ? { text: '' } : null); }
    }
    // 亡くなった年の節目は、その年に亡くなる前か後かで出るときと出ないときがある（v19：戦死などで30歳の年に亡くなった人）
    const want = E.ASK_AGES.filter(x => x < L.deathAge), wantMax = E.ASK_AGES.filter(x => x <= L.deathAge);
    if (asked.join(',') !== want.join(',') && asked.join(',') !== wantMax.join(',')) bad.push(L.by + '年生まれ（' + L.deathAge + '歳）：' + asked.join(',') + ' / 期待 ' + want.join(','));
    if ((L.notes || []).some(n => n.text)) bad.push('空の答えなのに書き残しがある');
  };
  for (let i = 0; i < 60; i++) {
    const by = [1980, 1990, 2000][i % 3];
    run(E, E.newLife(C, P[E.pickPref(C, by, E.makeRng(i + 1))], { year: by, seed: i * 97 + 3 }));
    const oy = 1000 + (i * 83) % 975, b = O.pickBirth(C, H, oy, E.makeRng(i + 5));
    run(O, O.newLife(C, H, P[b.pref] || null, { year: oy, seed: i * 89 + 7, birth: b }));
  }
  // 画面に文字を入力する欄がないか（index.html と app.js）
  const html = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8'), app = fs.readFileSync(path.join(SITE, 'js', 'app.js'), 'utf8');
  if (/<input|<textarea/.test(html)) bad.push('index.html に入力欄がある');
  // v19 1：残してよいのは動物の名前の欄（pet-name）だけ。文を書かせる欄はない
  const inputs = (app.match(/createElement\('input'\)[^\n]*/g) || []).filter(l => !/pet-name/.test(l));
  if (inputs.length || /ask-input|farewell/.test(app)) bad.push('app.js に入力欄が残っている');
  if (!/cur\.branch\.ask \|\| auto/.test(app)) bad.push('節目の問いかけを画面で止めずに進める処理がない');
  rec('A 入力欄がなく、節目の問いかけは画面で止まらずに進むか（120人分の人生と画面のファイル）', bad.length === 0, bad.slice(0, 5).join('、'));
  const qs = new Set();
  for (let i = 0; i < 400; i++) for (const a of E.ASK_AGES) {
    const by = 1000 + (i * 7) % 1001;
    const fake = { year: by + a, age: a, by, seed: i, members: [], married: i % 2 === 0, ainu: i % 13 === 0, ryukyu: i % 17 === 0, rnd: Math.random };
    qs.add(E.askFor(fake).q);
  }
  const tq = [...qs].join(' ');
  const bw = BANNED_OWNER.filter(w => tq.includes(w));
  rec('A 問いの文章が禁止語の検査を通るか', bw.length === 0, bw.join('、') || qs.size + '通りの問い');
}

// B：共有用の画像の文字と背景のコントラスト比
{
  const src = fs.readFileSync(path.join(SITE, 'js', 'card.js'), 'utf8');
  const col = k => (src.match(new RegExp(k + " = '(#[0-9a-f]{6})'")) || [])[1];
  const pairs = [['TEXT', 'BG'], ['SUB', 'BG'], ['TEXT', 'SURF'], ['ON_BENI', 'BENI']];
  const low = pairs.filter(([f, b]) => !col(f) || !col(b) || ratio(col(f), col(b)) < 4.5).map(([f, b]) => f + '/' + b + (col(f) && col(b) ? ' = ' + ratio(col(f), col(b)).toFixed(2) : ' 色が見つからない'));
  rec('B 共有用の画像の文字と背景のコントラスト比が4.5以上か', low.length === 0, low.join('、'));
  const forbid = /shadow|Gradient|filter\s*=|blur/i.test(src.replace(/\/\*[\s\S]*?\*\//g, ''));
  rec('B 共有用の画像に影・グラデーション・ぼかしを使っていないか', !forbid);
}

// C：同じ種と同じ答えで作り直した人生が、出来事・死因・享年まで一致するか（10件ずつ）
{
  const bad = [];
  const answer = (br, rnd) => {
    if (br.ask) return { text: rnd() < 0.5 ? '' : 'ためし' };
    const o = {};
    for (const g of br.groups) o[g.id] = g.options[Math.floor(rnd() * g.options.length)].k;
    return o;
  };
  const play = (mk, answers, rnd) => {
    const L = mk(); let g = 0, i = 0;
    const rec = answers ? null : [];
    while (L.alive && g++ < 130) {
      let r = mk.M.step(L);
      while (r && r.branch) {
        const a = answers ? answers[i++] : answer(r.branch, rnd);
        if (rec) rec.push(a);
        r = mk.M.resolve(L, a);
      }
    }
    return { L, rec, sig: L.log.map(r => r.year + ':' + r.events.map(e => e.t).join('|')).join('\n') + '#' + L.cause + '#' + L.deathAge };
  };
  for (let i = 0; i < 10; i++) {
    const by = 1975 + (i * 3) % 26, seed = i * 7919 + 11;
    const mkE = () => E.newLife(C, P[E.pickPref(C, by, E.makeRng(seed ^ 0x9e3779b9))], { year: by, seed });
    mkE.M = E;
    const a = play(mkE, null, E.makeRng(i + 100));
    const b = play(mkE, a.rec);
    if (a.sig !== b.sig) bad.push(by + '年（今の本体）');
    const oy = 1000 + (i * 97) % 975, os = i * 104729 + 3, ob = O.pickBirth(C, H, oy, E.makeRng(os ^ 0x9e3779b9));
    const mkO = () => O.newLife(C, H, P[ob.pref] || null, { year: oy, seed: os, birth: ob });
    mkO.M = O;
    const c = play(mkO, null, E.makeRng(i + 200));
    const d = play(mkO, c.rec);
    if (c.sig !== d.sig) bad.push(oy + '年（昔の本体）');
  }
  rec('C 同じ種と同じ答えで作り直した人生が元と一致するか', bad.length === 0, bad.join('、') || '20件');
}

/* ---------- E 4つの数値 ---------- */
{
  const bad = [];
  let n = 0;
  const run = (L, M) => { M.autoRun(L); return L; };
  for (let i = 0; i < 200; i++) {
    let L;
    if (i % 2) { const by = 1975 + i % 26, seed = i * 6151 + 5; L = run(E.newLife(C, P[E.pickPref(C, by, E.makeRng(seed ^ 0x9e3779b9))], { year: by, seed }), E); }
    else { const oy = 1000 + (i * 89) % 975, os = i * 3571 + 9, ob = O.pickBirth(C, H, oy, E.makeRng(os ^ 0x9e3779b9)); L = run(O.newLife(C, H, P[ob.pref] || null, { year: oy, seed: os, birth: ob }), O); }
    n++;
    let prev = null;
    for (const r of L.log) {
      const st = r.st;
      if (!st) { bad.push(L.by + '年生まれ ' + r.age + '歳：数値がない'); break; }
      for (const k of ['body', 'sat', 'learn', 'tie']) {
        if (!Number.isInteger(st[k]) || st[k] < 0 || st[k] > 100) bad.push(L.by + '年生まれ ' + r.age + '歳：' + k + ' が0〜100の外（' + st[k] + '）');
        if (prev && st[k] !== prev[k] && !st.why.some(w => w.k === k)) bad.push(L.by + '年生まれ ' + r.age + '歳：' + k + ' が動いたのに理由がない');
      }
      if (st.est !== (r.year < 1975)) bad.push(L.by + '年生まれ ' + r.age + '歳：推計の印がずれている');
      for (const w of st.why) if (!w.t) bad.push(L.by + '年生まれ ' + r.age + '歳：理由の文が空');
      prev = st;
    }
  }
  rec('E 4つの数値が0〜100の中で、動いた年には理由があるか（1975年より前は推計の印）', bad.length === 0, bad.slice(0, 8).join('、') || n + '人分');
}

/* ---------- F お金の見える化 ---------- */
{
  const bad = []; let n = 0, shown = 0;
  for (const by of [1000, 1300, 1550, 1700, 1800, 1830, 1860, 1900, 1930, 1950, 1975, 2000]) {
    for (let i = 0; i < 12; i++) {
      const seed = by * 13 + i * 7919 + 3;
      let L;
      if (by >= 1975) L = E.autoRun(E.newLife(C, P[E.pickPref(C, by, E.makeRng(seed ^ 0x9e3779b9))], { year: by, seed }));
      else { const ob = O.pickBirth(C, H, by, E.makeRng(seed ^ 0x9e3779b9)); L = O.autoRun(O.newLife(C, H, P[ob.pref] || null, { year: by, seed, birth: ob })); }
      n++;
      for (const r of L.log) {
        const m = r.money, tag = by + '年生まれ ' + r.year + '年';
        if (!m) { bad.push(tag + '：お金の記録がない'); break; }
        if (r.income && r.income.nominal > 0) {
          shown++;
          if (r.income.cur !== (r.year < 1600 ? '貫文' : r.year < 1871 ? '両' : '円')) bad.push(tag + '：単位が時代に合わない（' + r.income.cur + '）');
          if ((m.koku != null) !== (r.year < 1871)) bad.push(tag + '：米に直した目安の有無が時代に合わない');
          if (r.year >= 1871 && m.take == null) bad.push(tag + '：手取りがない');
          if (!m.priceEv || !m.priceEv.name || !m.priceEv.org) bad.push(tag + '：物価の根拠がない');
          if (m.take != null && (!m.takeEv || !m.takeEv.name)) bad.push(tag + '：手取りの根拠がない');
          if (!(m.real > 0) || !isFinite(m.real)) bad.push(tag + '：今の物価に直した額がおかしい');
        }
        if (m.sav != null) {
          if (!(m.sav >= 0) || !isFinite(m.sav) || !isFinite(m.savNominal)) bad.push(tag + '：貯金の額がおかしい（' + m.sav + '）');
          if (!m.savEv || !m.savEv.name) bad.push(tag + '：貯金の根拠がない');
        }
        if (r.age < 18 && m.sav != null) bad.push(tag + '：18歳より前に貯金がある');
      }
    }
  }
  rec('F 金額の単位が時代に合い（1599年までは貫文と石、1870年までは両と石、1871年からは円と手取り）、どの金額にも出典が付くか', bad.length === 0 && shown > 0, bad.slice(0, 8).join('、') || n + '人分・' + shown + '年分の年収');
}

/* ---------- G 今年の重点とおまかせ ---------- */
{
  const bad = []; let n = 0;
  const FOCI = [null, 'study', 'earn', 'family', 'body', 'save'];
  const play = (mk, M, focusOf) => {
    const L = mk(); let g = 0; const ans = [];
    while (L.alive && g++ < 130) {
      L.focus = focusOf(L.year);
      let r = M.step(L);
      while (r && r.branch) {
        if (r.branch.ask) { ans.push({ text: '' }); r = M.resolve(L, { text: '' }); continue; }
        const a = E.autoAnswer(r.branch, L.focus);
        if (a) for (const gr of r.branch.groups) if (!(gr !== r.branch.groups[0] && a[gr.id] === undefined) && !gr.options.some(o => o.k === a[gr.id]))  /* v19 14：2つ目の問い（はじめてのG1 のどの馬か）は、答えなしなら重みで選ぶ */ bad.push(L.by + '年生まれ：' + r.branch.title + ' の答え ' + a[gr.id] + ' が選択肢にない');
        ans.push(a); r = M.resolve(L, a);
      }
    }
    return { L, sig: L.log.map(r => r.year + ':' + r.events.map(e => e.t).join('|') + ':' + (r.st ? r.st.body : '')).join('\n') + '#' + L.deathAge };
  };
  for (let i = 0; i < 60; i++) {
    const f1 = FOCI[i % 6], f2 = FOCI[(i + 2) % 6];
    let mk, M;
    if (i % 2) { const by = 1975 + (i * 5) % 26, seed = i * 4241 + 1; mk = () => E.newLife(C, P[E.pickPref(C, by, E.makeRng(seed ^ 0x9e3779b9))], { year: by, seed }); M = E; }
    else { const oy = 1000 + (i * 83) % 975, os = i * 1013 + 7, ob = O.pickBirth(C, H, oy, E.makeRng(os ^ 0x9e3779b9)); mk = () => O.newLife(C, H, P[ob.pref] || null, { year: oy, seed: os, birth: ob }); M = O; }
    const fo = y => (y % 40 < 20 ? f1 : f2);
    const a = play(mk, M, fo), b = play(mk, M, fo);
    n++;
    if (a.L.alive) bad.push(a.L.by + '年生まれ：おまかせで最期まで進まなかった');
    if (a.sig !== b.sig) bad.push(a.L.by + '年生まれ：同じ重点とおまかせで作り直すと違う人生になった');
  }
  rec('G おまかせを入れたまま最期まで止まらずに進み、重点を変えても作り直しが一致するか', bad.length === 0, bad.slice(0, 8).join('、') || n + '人分');
}

/* ---------- 生命表との照らし合わせ（その年の死亡率のままで何%が90歳・100歳まで生きるか） ---------- */
{
  const ST = JSON.parse(fs.readFileSync(path.join(ROOT, 'data-src', 'stats', 'stats.json'), 'utf8'));
  const LQ = (ST.nat || {}).lifeQx || {};
  const bad = [], notes = [];
  for (const y of [2010, 2020, 2024]) {
    if (!LQ[y]) continue;
    for (const sex of ['m', 'f']) {
      let lr = 1, lm = 1;
      const real = {}, model = {};
      for (let a = 0; a <= 100; a++) {
        if (a === 90 || a === 100) { real[a] = lr; model[a] = lm; }
        lr *= 1 - LQ[y][sex][a]; lm *= 1 - E.deathProb(C, null, sex, a, y);
      }
      for (const a of [90, 100]) {
        const d = (model[a] - real[a]) * 100;
        notes.push(y + '年' + (sex === 'm' ? '男' : '女') + a + '歳 ' + (model[a] * 100).toFixed(1) + '%／' + (real[a] * 100).toFixed(1) + '%');
        if (Math.abs(d) > 3) bad.push(y + '年' + (sex === 'm' ? '男' : '女') + a + '歳の差 ' + d.toFixed(1));
      }
    }
  }
  rec('90歳・100歳まで生きる割合が簡易生命表から±3ポイント以内か（その年の死亡率のまま）', bad.length === 0 && notes.length > 0, bad.join('、') || notes.filter(x => /2024/.test(x)).join('、'));
}

/* ---------- H 人生地図と生き残りの曲線 ---------- */
{
  const bad = []; const kinds = new Set(); let n = 0, zero = 0, old110 = 0;
  for (let i = 0; i < 80; i++) {
    let L;
    if (i % 2) { const by = 1975 + (i * 7) % 26, seed = i * 2207 + 5; L = E.autoRun(E.newLife(C, P[E.pickPref(C, by, E.makeRng(seed ^ 0x9e3779b9))], { year: by, seed })); }
    else { const oy = 1000 + (i * 79) % 975, os = i * 977 + 3, ob = O.pickBirth(C, H, oy, E.makeRng(os ^ 0x9e3779b9)); L = O.autoRun(O.newLife(C, H, P[ob.pref] || null, { year: oy, seed: os, birth: ob })); }
    n++;
    if (L.deathAge === 0) zero++;
    L.log.forEach((r, j) => { const k = E.yearKind(r, L, j === L.log.length - 1); if (!(k >= 0 && k <= 7)) bad.push('種類の番号がおかしい ' + k); kinds.add(k); });
    if (L.log.length !== L.deathAge + 1) bad.push(L.by + '年生まれ：マスの数（' + L.log.length + '）が年齢と合わない');
  }
  if (E.MAP_KINDS.length - 1 > 7) bad.push('色が7色より多い');
  // 生き残りの曲線：0歳と110歳でも描けるか（生命表の値が0〜1の中で減っていくか）
  for (const [by, sex] of [[1800, 'm'], [1900, 'f'], [1975, 'm'], [2000, 'f']]) {
    let l = 1;
    for (let a = 0; a <= 110; a++) {
      const v = Object.create({ C, H, P: P['13'], old: by < 1975, pref: '13', kind: 'town', sex });
      const q = a >= 110 ? 1 : (by < 1975 ? O.deathProb(v, sex, a, by + a) : E.deathProb(C, P['13'], sex, a, by + a));
      if (!(q >= 0 && q <= 1)) { bad.push(by + '年生まれ ' + a + '歳：亡くなる確率が0〜1の外'); break; }
      l *= 1 - q;
    }
    if (l !== 0) bad.push(by + '年生まれ：110歳で曲線が0にならない');
  }
  rec('H 人生地図が1年1マスで7色までに収まり、生き残りの曲線が0歳から110歳まで描けるか', bad.length === 0, bad.slice(0, 6).join('、') || n + '人分（0歳で亡くなった ' + zero + '人を含む）・使った種類 ' + [...kinds].filter(Boolean).length);
}
// 人生地図の7色が、明るい画面と暗い画面の背景から見分けられるか（図形なので3以上）
{
  const css = fs.readFileSync(path.join(SITE, 'css', 'style.css'), 'utf8');
  const light = vars((css.match(/:root\s*\{([\s\S]*?)\}/) || [])[1] || '');
  const dark = vars((css.match(/:root\[data-theme="dark"\]\s*\{([\s\S]*?)\}/) || [])[1] || '');
  const low = [];
  for (const [name, set] of [['明るい画面', light], ['暗い画面', dark]]) for (let k = 1; k <= 7; k++) {
    const c = set['--m' + k];
    if (!c) { low.push(name + ' --m' + k + ' がない'); continue; }
    const r = ratio(c, set['--bg']);
    if (r < 3) low.push(name + ' --m' + k + ' = ' + r.toFixed(2));
  }
  rec('H 人生地図の色が背景から見分けられるか（コントラスト比3以上）', low.length === 0, low.join('、'));
}

/* ---------- I 同じ日に生まれた4人 ---------- */
{
  const bad = []; let worst = 0, total = 0, years = 0;
  const compSeed = (seed, i) => ((Math.imul(seed >>> 0, 2654435761) + Math.imul(i + 1, 0x9e3779b9)) >>> 0) || (i + 1);
  for (const by of [1000, 1500, 1800, 1900, 1945, 1975, 2000]) {
    for (let k = 0; k < 6; k++) {
      const seed = by * 7 + k * 104729 + 1;
      const cs = [0, 1, 2, 3].map(i => {
        const s = compSeed(seed, i);
        if (by >= 1975) { const c = E.newLife(C, P[E.pickPref(C, by, E.makeRng(s ^ 0x9e3779b9))], { year: by, seed: s }); c.M = E; return c; }
        const b = O.pickBirth(C, H, by, E.makeRng(s ^ 0x9e3779b9)); const c = O.newLife(C, H, P[b.pref] || null, { year: by, seed: s, birth: b }); c.M = O; return c;
      });
      if (new Set(cs.map(c => c.seed)).size !== 4 || cs.some(c => c.seed === seed)) bad.push(by + '年：4人の種が重なった');
      for (let y = by; y <= by + 111 && cs.some(c => c.alive); y++) {
        const t0 = process.hrtime.bigint();
        for (const c of cs) { let g = 0; while (c.alive && c.year <= y && g++ < 130) { let r = c.M.step(c); while (r && r.branch) r = c.M.resolve(c, null); } }
        const ms = Number(process.hrtime.bigint() - t0) / 1e6;
        total += ms; years++; if (ms > worst) worst = ms;
      }
      if (cs.some(c => c.alive)) bad.push(by + '年：4人のうち最期まで進まなかった人がいる');
    }
  }
  // 古いスマホはこのパソコンの数倍遅いとみて、平均の10倍でも50ミリ秒に収まるかで確かめる
  const avg = total / years;
  if (avg * 10 > 50) bad.push('1年あたりの計算が長い（平均 ' + avg.toFixed(2) + 'ミリ秒）');
  rec('I 同じ日に生まれた4人を毎年進めても、1年の計算が50ミリ秒以内か（古いスマホは10倍遅いとみる）', bad.length === 0, bad.join('、') || '平均 ' + avg.toFixed(2) + 'ミリ秒・いちばん長い年 ' + worst.toFixed(1) + 'ミリ秒（' + years + '年分）');
}

/* ---------- K 画面の整理・日本地図・ドット絵・原作の表記（作る人の指示 2026-10-17） ---------- */
{
  const bad = [];
  // 日本地図：47都道府県の形と、全市区町村の位置があるか。人生の毎年の場所が地図に置けるか
  let MAPJ = null;
  try { MAPJ = JSON.parse(fs.readFileSync(path.join(SITE, 'data', 'map.json'), 'utf8')); } catch (e) { bad.push('data/map.json がない（python3 -I tools/map.py で作る）'); }
  if (MAPJ) {
    const kb = fs.statSync(path.join(SITE, 'data', 'map.json')).size / 1024;
    if (kb > 900) bad.push('map.json が大きい（' + Math.round(kb) + 'KB）');
    for (let i = 1; i <= 47; i++) { const pc = String(i).padStart(2, '0'); if (!MAPJ.prefs[pc] || !MAPJ.center[pc]) bad.push(pc + ' の形がない'); }
    const noPos = Object.values(P).flatMap(p => p.munis.filter(m => !MAPJ.munis[m.code]).map(m => p.name + m.name));
    if (noPos.length) bad.push('地図に位置がない市区町村 ' + noPos.length + '（' + noPos.slice(0, 5).join('、') + '）');
    const xy = pin => !pin || pin.abroad ? 'abroad' : (pin.muni && MAPJ.munis[pin.muni]) || (pin.prov && MAPJ.prov[pin.prov]) || (pin.pref && MAPJ.center[pin.pref]);
    const noProv = Object.keys(H.prov).filter(k => k !== '蝦夷・松前' && !(MAPJ.prov || {})[k]);
    if (noProv.length) bad.push('地図に場所がない旧国（' + noProv.join('、') + '）');
    for (let i = 0; i < 60; i++) {
      let L;
      if (i % 2) { const by = 1975 + (i * 7) % 26, seed = i * 331 + 9; L = E.autoRun(E.newLife(C, P[E.pickPref(C, by, E.makeRng(seed ^ 0x9e3779b9))], { year: by, seed })); }
      else { const oy = 1000 + (i * 89) % 975, os = i * 557 + 1, ob = O.pickBirth(C, H, oy, E.makeRng(os ^ 0x9e3779b9)); L = O.autoRun(O.newLife(C, H, P[ob.pref] || null, { year: oy, seed: os, birth: ob })); }
      const miss = L.log.filter(r => !r.pin || !xy(r.pin));
      if (miss.length) bad.push(L.by + '年生まれ：地図に置けない年 ' + miss.length + '（' + miss[0].year + '年 ' + miss[0].place + '）');
    }
  }
  // いつも見える画面：ドット絵・年齢・年・場所・地図・人生の記録（新しい順・多くて6行）・進め方だけ。ほかは「くわしく」の中
  const html = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8');
  const life = html.slice(html.indexOf('id="screen-life"'), html.indexOf('id="details"'));
  for (const id of ['world', 'events', 'st4', 'nums', 'tree', 'comps', 'focus-box']) if (life.includes('id="' + id + '"')) bad.push('「' + id + '」がいつも見える所にある');
  if (!/id="details" hidden/.test(html)) bad.push('くわしくの中身がふだん隠れていない');
  if (!life.includes('id="feed"') || !/FEED_MAX = [1-6];/.test(fs.readFileSync(path.join(SITE, 'js', 'app.js'), 'utf8'))) bad.push('人生の記録がないか、6行より多い');
  // 原作の表記：トップ・このサイトについて・共有用の画像に、原作の名前と場所と許可を得たことがあるか
  for (const f of ['index.html', 'about.html']) {
    const h = fs.readFileSync(path.join(SITE, f), 'utf8');
    if (!h.includes('https://1in8b.life/ja/') || !h.includes('80億分の1') || !h.includes('許可を得て制作') || !h.includes('2026年10月16日')) bad.push(f + '：原作の表記が足りない');
  }
  if (!fs.readFileSync(path.join(SITE, 'js', 'card.js'), 'utf8').includes('80億分の1')) bad.push('共有用の画像に原作の表記がない');
  // ドット絵：48×64 の整数倍で描き、輪郭線が付いているか
  global.window = { devicePixelRatio: 3 }; global.self = global;
  require(path.join(SITE, 'js', 'avatar.js'));
  const cols = new Set(); let calls = 0;
  const cv = { clientWidth: 96, width: 0, height: 0, getContext: () => ({ clearRect() {}, fillRect() { calls++; }, set fillStyle(v) { cols.add(v); } }) };
  global.self.IchiokuAvatar.draw(cv, { year: 1990, age: 30, sex: 'f', seed: 3, alive: true, place: { kind: '都市' } });
  if (cv.width % 48 || cv.height % 64 || cv.width / 48 !== cv.height / 64) bad.push('ドット絵の大きさが 48×64 の整数倍でない（' + cv.width + '×' + cv.height + '）');
  if (![...cols].some(c => /^rgb\(/.test(c))) bad.push('ドット絵に輪郭線がない');
  rec('K 画面を絞り（地図・人生の記録6行まで）、全市区町村が地図に置け、原作の表記があり、ドット絵がくっきり描けるか', bad.length === 0, bad.slice(0, 8).join('、'));
}

/* ---------- L 一生の浮き沈みの曲線（作る人の指示書 2026-10-17） ---------- */
{
  require(path.join(SITE, 'js', 'curve.js'));
  const CV = global.self.IchiokuCurve;
  const bad = [], WIDTHS = [[320, 200], [390, 200], [768, 240], [1366, 240]];
  let n = 0, zero = 0, cmpCut = 0;
  const ptsOf = L => L.log.filter(r => r.st && r.st.sat != null).map(r => ({ age: r.age, year: r.year, sat: r.st.sat, label: r.age === 0 ? '生まれた' : (r.events[0] ? r.events[0].t.replace(/。$/, '') : '') }));
  for (let i = 0; i < 200; i++) {
    let L, co = null;
    const by = 1000 + (i * 101) % 1001, seed = i * 7121 + 17;
    if (by >= 1975) { const p0 = P[E.pickPref(C, by, E.makeRng(seed ^ 0x9e3779b9))]; L = E.autoRun(E.newLife(C, p0, { year: by, seed })); if (i < 12) co = E.cohort(C, p0, by, L.home.muni, seed, 100); }
    else { const b0 = O.pickBirth(C, H, by, E.makeRng(seed ^ 0x9e3779b9)); L = O.autoRun(O.newLife(C, H, P[b0.pref] || null, { year: by, seed, birth: b0 })); if (i < 12) co = O.cohort(C, H, P[b0.pref] || null, L, 100); }
    const pts = ptsOf(L);
    n++;
    if (pts.length !== L.log.length) { bad.push(by + '年生まれ：暮らしの満足がない年がある（' + pts.length + '/' + L.log.length + '）'); continue; }
    for (const [vw, hh] of WIDTHS) {
      const W = Math.min(480, vw) - 32;
      let m;
      try { m = CV.layout({ width: W, height: hh, pts, compare: co ? co.satAvg : null, marks: [] }); } catch (e) { bad.push(by + '年生まれ：曲線が描けない（' + e.message + '）'); break; }
      if (L.deathAge === 0) { if (!m.single || m.note !== '1年に満たない一生でした') bad.push(by + '年生まれ：0歳で亡くなったのに曲線を描いた'); else zero++; break; }
      if (m.curve.length !== pts.length) bad.push(by + '年生まれ：点の数が生きた年数と違う');
      const hiAge = pts.reduce((a, p) => p.sat > a.sat ? p : a, pts[0]).age, loAge = pts.reduce((a, p) => p.sat < a.sat ? p : a, pts[0]).age;
      const mh = m.marks.find(k => k.kind === 'high'), ml = m.marks.find(k => k.kind === 'low');
      if (pts.length > 5 && (!mh || mh.age !== hiAge)) bad.push(by + '年生まれ：いちばん高い年の印の位置が違う');
      if (!ml || ml.age !== loAge) bad.push(by + '年生まれ：いちばん低い年の印の位置が違う');
      const bx = m.boxes || [];
      for (let a = 0; a < bx.length; a++) {
        const b1 = bx[a];
        if (b1.x < 0 || b1.x + b1.w > m.W + 0.5) bad.push(by + '年生まれ・幅' + vw + '：文字がはみ出す');
        for (let c2 = a + 1; c2 < bx.length; c2++) { const b2 = bx[c2]; if (b1.x < b2.x + b2.w && b2.x < b1.x + b1.w && b1.y < b2.y + b2.h && b2.y < b1.y + b1.h) bad.push(by + '年生まれ・幅' + vw + '：文字が重なる'); }
      }
      if (co) {
        const firstNull = co.satAvg.findIndex(v => v == null);
        const cutAt = firstNull < 0 ? co.satAvg.length : firstNull;
        if (m.compare.length > Math.min(cutAt, L.deathAge + 1)) bad.push(by + '年生まれ：比べる線が10人未満の年齢まで描かれた');
        if (firstNull >= 0) cmpCut++;
        for (let a = 0; a < co.satAvg.length; a++) if (co.satAvg[a] != null && !(co.satN[a] >= 10)) bad.push(by + '年生まれ：10人未満の平均がある');
      }
    }
  }
  // コントラスト（明るい画面・暗い画面）：文字は4.5以上、線と印は3以上
  const cssT = fs.readFileSync(path.join(SITE, 'css', 'style.css'), 'utf8');
  const blocks = [cssT.slice(cssT.indexOf(':root {'), cssT.indexOf('}', cssT.indexOf(':root {'))), cssT.slice(cssT.indexOf(':root[data-theme="dark"]'), cssT.indexOf('}', cssT.indexOf(':root[data-theme="dark"]')))];
  const lum = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }).reduce((s, v, k) => s + v * [0.2126, 0.7152, 0.0722][k], 0); };
  const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  ['明るい', '暗い'].forEach((nm, k) => {
    const tok = n2 => (blocks[k].match(new RegExp('--' + n2 + ':\\s*(#[0-9a-fA-F]{6})')) || [])[1];
    const bg = tok('bg'), area = tok('area');
    for (const [t, need] of [['text', 4.5], ['sub', 4.5], ['bar', 3], ['beni', 3]]) {
      for (const [bn, bv] of [['背景', bg], ['塗り', area]]) {
        const v = tok(t);
        if (!v || !bv) { bad.push(nm + '画面：色 --' + t + ' か背景がない'); continue; }
        if (cr(v, bv) < need) bad.push(nm + '画面：--' + t + ' と' + bn + 'のコントラスト ' + cr(v, bv).toFixed(2));
      }
    }
  });
  rec('L 一生の浮き沈みの曲線が200人分すべてで描け、点の数・いちばん高い年と低い年の印・0歳の一生・比べる線の途切れ・文字の重なりとはみ出し（幅320・390・768・1366）・コントラストが合っているか', bad.length === 0, [...new Set(bad)].slice(0, 8).join('、') || n + '人分（0歳で亡くなった ' + zero + '人・比べる線が途切れた ' + cmpCut + '件）');
}

/* ---------- 改善の指示書 第1弾（選ぶ回数・結果を返す・状態・幼い人生） ---------- */
{
  const CHx = require(path.join(SITE, 'js', 'choices.js')), Sx = require(path.join(SITE, 'js', 'story.js'));
  const NP = TEST ? 200 : 500;
  const KSC = new Set(H.scenes.filter(sc => sc.k).map(sc => sc.t.split('{')[0]));
  let adult = 0, sumR = 0, young = 0, youngW = 0;
  const dup = [], noHint = [], badDir = [], modeBad = [], brace = [];
  const sgn = h => { const o = {}; [['暮らしの満足', 'sat'], ['つながり', 'tie'], ['学び', 'learn'], ['からだ', 'body']].forEach(([w, k]) => { if (h.includes(w + '＋')) o[k] = 1; if (h.includes(w + '−')) o[k] = -1; }); return o; };
  for (let i = 0; i < NP; i++) {
    const by = 1000 + Math.floor((i * 2.003) % 1001), seed = i * 7919 + 101;
    let L;
    if (by >= 1975) L = E.newLife(C, P[E.pickPref(C, by, E.makeRng(seed ^ 0x9e3779b9))], { year: by, seed });
    else { const b0 = O.pickBirth(C, H, by, E.makeRng(seed ^ 0x9e3779b9)); L = O.newLife(C, H, P[b0.pref] || null, { year: by, seed, birth: b0 }); }
    const M = L.old ? O : E; let g = 0, n = 0; const seen = new Set();
    while (L.alive && g++ < 130) {
      let r = M.step(L);
      while (r && r.branch) {
        const br = r.branch;
        if (br.ask || br.id === 'ask') { r = M.resolve(L, { text: '' }); continue; }
        n++;
        for (const gr of br.groups) {
          if (/\{\w+\}/.test(gr.q)) brace.push(gr.q.slice(0, 20));
          for (const o of gr.options) if (!Sx.hintFor(br, o)) noHint.push((br.title || '') + ':' + o.l);
        }
        if (br.ra === '__choice') { const q = br.groups[0].q; if (seen.has(q)) dup.push(q.slice(0, 20)); seen.add(q); }
        // おまかせ（今年の重点なし）で答える
        const auto = E.autoAnswer(br, null);
        r = M.resolve(L, auto);
        if (br.id === 'story') {
          const opt = br.groups[0].options.filter(o => o.l === r.storyPick)[0];
          if (opt) {
            const h = Sx.hintFor(br, opt);
            if (!/しだい/.test(h)) {
              const want = sgn(h), got = r.storyFx || {};
              const ok = ['sat', 'tie', 'learn', 'body'].every(k => (want[k] || 0) === Math.sign(got[k] || 0));
              if (!ok) badDir.push((br.title || '') + '「' + opt.l + '」' + h + ' / ' + JSON.stringify(got));
            }
          }
        }
      }
      if (r.mode) for (const e of r.events) { if (/一人前に働き始めた/.test(e.t) || KSC.has(e.t.split('{')[0]) && !e.story) modeBad.push(L.by + '年生まれ ' + r.year + '年：' + e.t.slice(0, 20)); }
      for (const e of r.events) if (/\{\w+\}/.test(e.t)) brace.push(e.t.slice(0, 20));
    }
    if (L.deathAge >= 20) { adult++; sumR += n / (L.deathAge + 1); }
    if (L.deathAge <= 5) { young++; if (n) youngW++; }
  }
  rec('第1弾1 20歳以上まで生きた人生の選択回数の平均が、生きた年数×0.5以上か', adult > 0 && sumR / adult >= 0.5, adult + '人の平均 ' + (sumR / adult).toFixed(2) + '回／年');
  rec('第1弾2 5歳までに亡くなった人生の90%以上で選択が1回以上あるか', young > 0 && youngW / young >= 0.9, young + '人のうち ' + Math.round(youngW / young * 100) + '%');
  rec('第1弾3 1つの人生の中で、同じ文の選択が2回以上出ないか', dup.length === 0, dup.slice(0, 4).join('、'));
  rec('第1弾4 すべての選択肢にヒントがあり、ヒントの向きと実際に動いた数値の向きが一致するか', noHint.length === 0 && badDir.length === 0, noHint.slice(0, 3).concat(badDir.slice(0, 4)).join('、'));
  rec('第1弾5 家を出ている年（旅・奉公・出征など）に、生まれた土地の場面と家の仕事を始める出来事が出ないか', modeBad.length === 0, [...new Set(modeBad)].slice(0, 4).join('、'));
  // 6 小さな選択が25の枠すべてに4つ以上
  const ER = [[1000, 1332], [1333, 1602], [1603, 1867], [1868, 1945], [1946, 2120]], AG = [[0, 5], [6, 14], [15, 29], [30, 59], [60, 110]], slot = [];
  ER.forEach((er, e) => AG.forEach((ag, b) => { const n2 = CHx.list.filter(o => !(o.y[1] < er[0] || o.y[0] > er[1]) && !(o.a[1] < ag[0] || o.a[0] > ag[1]) && (b === 0) === (o.kind === 'parent')).length; if (n2 < 4) slot.push(e + '-' + b + ':' + n2); }));
  const univ = CHx.list.filter(o => o.y[0] <= 1000 && o.y[1] >= 2100).length;
  rec('第1弾6 小さな選択が時代×年齢の25の枠すべてに4つ以上、時代を問わない選択が20以上あるか', slot.length === 0 && univ >= 20, slot.join('、') || CHx.list.length + 'の選択・時代を問わないもの ' + univ);
  rec('第1弾7 差し込み（{sibOlder} など）が埋まらないまま画面に出ないか', brace.length === 0, brace.slice(0, 4).join('、'));
}

/* ---------- 改善の指示書 第2弾（情景・名前の入った出来事・死亡の記録・コントラスト） ---------- */
{
  const Sc = require(path.join(SITE, 'js', 'scene.js')), Rc = require(path.join(SITE, 'js', 'record.js'));
  const NP = TEST ? 200 : 500;
  const sceneBad = [], nameLow = [], noCause = [], noPick = [];
  let named = 0, scLives = 0;
  for (let i = 0; i < NP; i++) {
    const by = 1000 + Math.floor((i * 2.003 + 0.5) % 1001), seed = i * 104729 + 7;
    let L;
    if (by >= 1975) L = E.newLife(C, P[E.pickPref(C, by, E.makeRng(seed ^ 0x9e3779b9))], { year: by, seed });
    else { const b0 = O.pickBirth(C, H, by, E.makeRng(seed ^ 0x9e3779b9)); L = O.newLife(C, H, P[b0.pref] || null, { year: by, seed, birth: b0 }); }
    const M = L.old ? O : E; let g = 0;
    const checkScene = i < 20;
    while (L.alive && g++ < 130) {
      let r = M.step(L);
      while (r && r.branch) r = M.resolve(L, r.branch.ask || r.branch.id === 'ask' ? { text: '' } : E.autoAnswer(r.branch, null));
      if (checkScene && L.alive) {
        const pl = Sc.plan(L, r), hh = Sc.household(L);
        if (pl.count !== 1 + hh.length || pl.people.length !== pl.count) sceneBad.push(L.by + '年生まれ ' + r.year + '年：家族' + (1 + hh.length) + '人・情景' + pl.people.length + '人');
      }
    }
    if (checkScene) scLives++;
    if (L.deathAge >= 5) {
      const names = [L.name, ...(L.members || []).map(m => m.name), L.story && L.story.friend].filter(x => x && !/アイヌ語/.test(x)).map(x => String(x).replace(/（.*?）/g, ''));
      const hit = L.log.filter(r => r.events.some(e => names.some(nm => nm && e.t.includes(nm)))).length;
      named++;
      if (hit / L.log.length < 0.3) nameLow.push(L.by + '年生まれ ' + Math.round(hit / L.log.length * 100) + '%');
    }
    const rr = Rc.build(L, { birthPlace: 'どこか', deathPlace: 'どこか' });
    if (!rr.cause) noCause.push(L.by + '年生まれ');
    // v8の直し5で、ひとことは人生を決めた大きな選択から作る（小さな選択・親の選択・節目と、5歳までの人生は除く）
    const picked = (L.choices || []).filter(c => c.l && Rc.rankOf(c) > 0);
    if (L.deathAge >= 5 && picked.length && !picked.some(c => rr.line.includes(String(c.l).replace(/[「」『』]/g, '').replace(/。$/, '')))) noPick.push(rr.line.slice(0, 24));
  }
  rec('第2弾2 家族の人数と、情景に描く人数が一致するか（' + scLives + '人の各年）', sceneBad.length === 0, sceneBad.slice(0, 4).join('、'));
  rec('第2弾3 5歳以上まで生きた人生で、名前の入った出来事が生きた年数の3割以上あるか', nameLow.length === 0, nameLow.slice(0, 5).join('、') || named + '人を確かめた');
  rec('第2弾4 ' + NP + '件の人生の死亡の記録すべてに死因が出るか', noCause.length === 0, noCause.slice(0, 4).join('、'));
  rec('第2弾5 大きな選択が1回以上ある人生（5歳以上）で、ひとことの1行に選んだ分かれ道の結果が入っているか', noPick.length === 0, noPick.slice(0, 4).join('、'));
  // 6 コントラスト比（文字4.5以上、線と印3以上）を明るい画面と暗い画面で
  const css = fs.readFileSync(path.join(SITE, 'css', 'style.css'), 'utf8');
  const blockOf = (start, end) => { const i0 = css.indexOf(start), i1 = css.indexOf(end, i0 + 1); return css.slice(i0, i1); };
  const tokens = b => { const o = {}; for (const m of b.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})/g)) o[m[1]] = m[2]; return o; };
  const light = tokens(blockOf(':root {', '@media (prefers-color-scheme: dark)')), dark = tokens(blockOf(':root[data-theme="dark"]', '* { box-sizing'));
  const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const TXT = [['--text', '--bg'], ['--sub', '--bg'], ['--text', '--surface'], ['--sub', '--surface'], ['--accent', '--bg'], ['--accent', '--surface'], ['--on-accent', '--accent'], ['--world', '--bg']];
  const GFX = [['--c-body', '--track'], ['--c-sat', '--track'], ['--c-learn', '--track'], ['--c-tie', '--track'], ['--accent', '--track'], ['--bar', '--surface']];
  const low = [];
  [['明るい', light], ['暗い', dark]].forEach(([nm, t]) => {
    TXT.forEach(([a, b]) => { if (t[a] && t[b] && ratio(t[a], t[b]) < 4.5) low.push(nm + ' ' + a + '/' + b + ' ' + ratio(t[a], t[b]).toFixed(2)); else if (!t[a] || !t[b]) low.push(nm + ' ' + a + ' か ' + b + ' がない'); });
    GFX.forEach(([a, b]) => { if (t[a] && t[b] && ratio(t[a], t[b]) < 3) low.push(nm + ' ' + a + '/' + b + ' ' + ratio(t[a], t[b]).toFixed(2)); else if (!t[a] || !t[b]) low.push(nm + ' ' + a + ' か ' + b + ' がない'); });
  });
  [['#ece6dc', '#0d1316'], ['#b9c4c1', '#0d1316'], ['#a3b2af', '#0d1316']].forEach(([a, b]) => { if (ratio(a, b) < 4.5) low.push('亡くなった瞬間の画面 ' + a + ' ' + ratio(a, b).toFixed(2)); });
  rec('第2弾6 文字のコントラスト比4.5以上・線と印3以上（明るい画面と暗い画面）', low.length === 0, low.slice(0, 6).join('、'));
}

/* ---------- 改善の指示書 第3弾（遊ぶ人自身と比べる・生まれる瞬間） ---------- */
{
  const K = require(path.join(SITE, 'js', 'compare.js'));
  const KINDS = ['birth', 5, 15, 30, 50, 70, 'death'];
  const leak = [], mism = [], share = [];
  // v19 7：99.5%以上と0.5%未満は小数1けた（compare.js の pc と同じ決まり）
  const pc = v => { const p = v * 100; if (v > 0 && p < 0.05) return '0.1%未満'; if (p >= 99.95 && v < 1) return '99.9%以上'; return '約' + (p >= 99.5 || (p > 0 && p < 0.5) ? p.toFixed(1) : Math.round(p)) + '%'; };
  const lin = (s, y) => { const ks = Object.keys(s).map(Number).sort((a, b) => a - b); if (y <= ks[0]) return s[ks[0]]; for (let i = 1; i < ks.length; i++) if (y <= ks[i]) { const a = ks[i - 1], b = ks[i]; return s[a] + (s[b] - s[a]) * (y - a) / (b - a); } return s[ks[ks.length - 1]]; };
  const qOf = (sex, age, y) => y >= 1975 ? E.deathProb(C, null, sex, age, y) : O.deathProb({ C, H, pref: null, kind: 'town', P: null }, sex, age, y);
  const survOf = (by, sex, a) => { let s = 1; for (let k = 0; k < a; k++) s *= 1 - qOf(sex, k, by + k); return s; };
  for (let i = 0; i < 60; i++) {
    const by = 1000 + (i * 167) % 1001, seed = i * 31 + 5, py = 1925 + (i * 7) % 100;
    let L;
    if (by >= 1975) L = E.newLife(C, P[E.pickPref(C, by, E.makeRng(seed ^ 0x9e3779b9))], { year: by, seed });
    else { const b0 = O.pickBirth(C, H, by, E.makeRng(seed ^ 0x9e3779b9)); L = O.newLife(C, H, P[b0.pref] || null, { year: by, seed, birth: b0 }); }
    L.deathAge = 20 + (i * 13) % 70;
    // 1 生まれ年を入れていなければ、比べの文は出ない
    for (const k of KINDS) if (K.line(C, H, L, null, k) != null || K.line(C, H, L, {}, k) != null) leak.push(by + ':' + k);
    // 2 比べの数字が生命表・進学率・初婚年齢の値と一致する
    const me = { y: py }, sex = L.sex;
    const b = K.line(C, H, L, me, 'birth');
    if (!b.includes(K.per(qOf(sex, 0, by))) || !b.includes(K.per(qOf(sex, 0, py)))) mism.push(by + ' 0歳');
    const d = K.line(C, H, L, me, 'death');
    if (!d.includes(pc(survOf(by, sex, L.deathAge))) || !d.includes(pc(survOf(py, sex, L.deathAge)))) mism.push(by + ' 最期');
    const t15 = K.line(C, H, L, me, 15);
    if (/高校へ進んだ人は/.test(t15)) { const h1 = lin(H.nat.hs[sex], by + 15), h2 = lin(H.nat.hs[sex], py + 15); if (!t15.includes(pc(h1)) || !t15.includes(pc(h2))) mism.push(by + ' 15歳'); }
    const t30 = K.line(C, H, L, me, 30);
    if (/結婚する年齢/.test(t30)) { const m1 = lin(H.nat.marriage[sex], by + 25), m2 = lin(H.nat.marriage[sex], py + 25); if (!t30.includes(m1.toFixed(1)) || !t30.includes(m2.toFixed(1))) mism.push(by + ' 30歳'); }
    // 3 抽選で出す確率が、その年の統計の値と一致する
    const bs = K.birthShare(C, L);
    let want;
    if (L.old) { const bb = O.birthShare(L); want = bb.share; }
    else { let tot = 0, mine = 0; C.prefs.forEach(p => { const v = E.val(p.births, by); tot += v; if (p.code === L.home.pref) mine = v; }); want = mine / tot; }
    if (!(bs.share > 0) || Math.abs(bs.share - want) > 1e-12) share.push(by + ' ' + bs.where);
  }
  rec('第3弾1 生まれ年を入れていないとき、比べの文が1か所も出ないか', leak.length === 0, leak.slice(0, 4).join('、'));
  rec('第3弾2 比べに出る数字が、同じ年の生命表・進学率・初婚年齢の値と一致するか', mism.length === 0, mism.slice(0, 4).join('、'));
  rec('第3弾3 抽選で出る確率が、その年の人口・出生数の割合と一致するか', share.length === 0, share.slice(0, 4).join('、'));
  // 4 動きを減らす設定で、切り替えの動きを出さないか（ブラウザの検査で確かめる。ここでは仕組みがあるかを見る）
  const aj = fs.readFileSync(path.join(SITE, 'js', 'app.js'), 'utf8'), pj = fs.readFileSync(path.join(SITE, 'js', 'prefs.js'), 'utf8');
  const ok4 = /if \(lessMotion\(\)\) \{[\s\S]{0,300}lt-v/.test(aj) && /if \(lessMotion\(\)( \|\| L\.deathAge === 0)?\) \{ showEnd\(\); return; \}/.test(aj) && /ichioku-motion/.test(pj) && /prefers-reduced-motion/.test(pj);
  rec('第3弾4 動きを減らす設定で、抽選と亡くなった瞬間の切り替えの動きを出さないか', ok4, ok4 ? '' : '動きを減らす分かれがない');
}

/* ---------- 改善の指示書 第4弾（まわりの人・お金の選択） ---------- */
{
  const NP = TEST ? 200 : 500;
  let adult = 0, adultOk = 0, adj = 0, adjOk = 0, choices = 0;
  const missing = [], kinds = {};
  for (let i = 0; i < NP; i++) {
    const by = 1000 + Math.floor((i * 2.003 + 0.25) % 1001), seed = i * 15485863 + 11;
    let L;
    if (by >= 1975) L = E.newLife(C, P[E.pickPref(C, by, E.makeRng(seed ^ 0x9e3779b9))], { year: by, seed });
    else { const b0 = O.pickBirth(C, H, by, E.makeRng(seed ^ 0x9e3779b9)); L = O.newLife(C, H, P[b0.pref] || null, { year: by, seed, birth: b0 }); }
    const M = L.old ? O : E; let g = 0;
    while (L.alive && g++ < 130) { let r = M.step(L); while (r && r.branch) r = M.resolve(L, r.branch.ask || r.branch.id === 'ask' ? { text: '' } : E.autoAnswer(r.branch, null)); }
    const s = L.story || {};
    // 1 家族以外の名前のある人が2回以上
    if (L.deathAge >= 20) {
      adult++;
      const fam = new Set([L.name, ...(L.members || []).map(m => m.name)].filter(Boolean));
      const others = [s.pal && s.pal.n, s.wpal && s.wpal.n, s.friend, s.tomo, s.koi, s.koiName, s.loverName, s.classmate, s.helpName].filter(n => n && !fam.has(n));
      const cnt = {};
      for (const r of L.log) for (const e of r.events) for (const n of others) if (e.t.includes(n)) cnt[n] = (cnt[n] || 0) + 1;
      if (Object.values(cnt).some(v => v >= 2)) adultOk++;
    }
    // 2 お金の選択の結果が、その年の貯金に入っている
    for (const m of L.moneyAdj || []) {
      if (!(m.f || m.inc)) continue;
      const r = L.log.filter(x => x.year === m.y)[0];
      if (!r || r.age < 18) continue;
      adj++;
      const ok = r.money && (r.money.why || []).some(w => w.choice && w.t === m.t);
      if (ok) adjOk++; else missing.push(L.by + '年生まれ ' + m.y + '年：' + m.t);
    }
    for (const c of L.choices || []) if (/nengu|tanomoshi|yucho|myhome|kabu|rogo/.test(c.kind || '') || /年貢|頼母子講|無尽|郵便貯金|マイホーム|株|老後/.test(c.title || '')) { choices++; kinds[c.title] = (kinds[c.title] || 0) + 1; }
  }
  rec('第4弾1 20歳以上まで生きた人生の8割以上で、家族以外の名前のある人が2回以上出てくるか', adult > 0 && adultOk / adult >= 0.8, adult + '人のうち ' + Math.round(adultOk / adult * 100) + '%');
  rec('第4弾2 お金の選択の結果が、その年の貯金の数字に入っているか', adj > 0 && missing.length === 0, missing.slice(0, 4).join('、') || adj + '件（お金の分かれ道 ' + choices + '回：' + Object.entries(kinds).map(([k, v]) => k + ' ' + v).join('・') + '）');
}

/* ---------- v8 の直し（ichioku1000-v8-fix-spec1：1・4・5・10・11・12） ---------- */
{
  const Rc = require(path.join(SITE, 'js', 'record.js')), NM = require(path.join(SITE, 'js', 'names.js')), J = require(path.join(SITE, 'js', 'jobs.js'));
  const NP = TEST ? 200 : 500;
  const modeBad = [], shoya = [], oldName = [], badLine = [], moved = [], elite = [], gender = [];
  const MODERN = new Set(['1912', '1926', '1946', '1971', '1991', '2011'].flatMap(k => (NM.P['m' + k] || []).concat(NM.P['f' + k] || [])));
  const OLDN = new Set(['mHeian', 'mMed', 'fMed', 'mKuge', 'fKuge', 'm', 'mBushi', 'f', 'mMeiji', 'fMeiji'].flatMap(k => NM.P[k] || []).concat(Object.values(H.names || {}).flat()));
  const runOne = (by, seed) => {
    let L;
    if (by >= 1975) L = E.newLife(C, P[E.pickPref(C, by, E.makeRng(seed ^ 0x9e3779b9))], { year: by, seed });
    else { const b0 = O.pickBirth(C, H, by, E.makeRng(seed ^ 0x9e3779b9)); L = O.newLife(C, H, P[b0.pref] || null, { year: by, seed, birth: b0 }); }
    const M = L.old ? O : E; let g = 0; const qs = [];
    while (L.alive && g++ < 130) { let r = M.step(L); while (r && r.branch) { qs.push((r.branch.groups || []).map(x => x.q).join('')); r = M.resolve(L, r.branch.ask || r.branch.id === 'ask' ? { text: '' } : E.autoAnswer(r.branch, null)); } }
    return { L, qs };
  };
  for (let i = 0; i < NP; i++) {
    const by = 1000 + Math.floor((i * 2.003 + 0.6) % 1001), seed = i * 2654435 + 3;
    const { L, qs } = runOne(by, seed);
    // 1 家を離れている年に、家の出来事（妻・夫・子の誕生）を出さない
    for (const r of L.log) if (r.mode) for (const e of r.events) if (e.cat === '家庭' && /妻の|夫の|子が生まれた|人目の子/.test(e.t) && !/知らせ|便り|手紙/.test(e.t)) modeBad.push(L.by + '年生まれ ' + r.year + '年（' + r.mode + '）：' + e.t.slice(0, 18));
    // 4 1600年より前に「庄屋」が出ない。配偶者の名前が生まれ年の一覧から
    if (L.by < 1560) { const all = L.log.flatMap(r => r.events.map(e => e.t)).concat(qs); for (const t of all) if (/庄屋/.test(t) && !/^\d/.test(t)) { shoya.push(L.by + '年生まれ：' + t.slice(0, 20)); break; } }
    for (const m of L.members || []) if ((m.role === '配偶者') && m.by < 1868 && m.name && MODERN.has(m.name) && !OLDN.has(m.name)) oldName.push(m.by + '年生まれの配偶者「' + m.name + '」');
    // 5 ひとことに、小さな選択・親の選択・節目の答えを使わない
    const rr = Rc.build(L, { birthPlace: 'どこか', deathPlace: 'どこか' });
    const big = new Set((L.choices || []).filter(c => Rc.rankOf(c) > 0).map(c => c.l));
    for (const c of L.choices || []) if (c.l && Rc.rankOf(c) === 0 && !big.has(c.l) && rr.line.includes('「' + String(c.l).replace(/[「」『』]/g, '') + '」')) { badLine.push(rr.line.slice(0, 30)); break; }
    // 11 下位40%の家に生まれた人が、地主・豪商の仕事にならない
    if (L.incPct < 0.4 && L.selfJob && J.ELITE.test(L.selfJob.n)) elite.push(L.by + '年生まれ（' + L.sex + '）：' + L.selfJob.n);
    if (L.sex === 'f' && L.selfJob && J.ELITE.test(L.selfJob.n)) elite.push(L.by + '年生まれの女性：' + L.selfJob.n);
    // 12 女性の人生に、藩校・寄り合いに出る・若者組・兵役の選択が出ない
    if (L.sex === 'f') for (const q of qs) if (/藩校|寄り合いに出て|若者組|兵役/.test(q)) { gender.push(L.by + '年生まれ：' + q.slice(0, 20)); break; }
  }
  // 10 1850〜1871年生まれで一度も引っ越していない人生：「移り住んだ」が出ず、移動距離0
  let still = 0;
  for (let i = 0; still < (TEST ? 40 : 100) && i < 3000; i++) {
    const { L } = runOne(1850 + i % 22, i * 7 + 1);
    const keys = new Set(L.log.map(r => JSON.stringify([r.pin && r.pin.pref, r.pin && r.pin.muni, r.pin && r.pin.prov])));
    if (L.moved || L.abroad || L.movedHokkaido || keys.size > 1) continue;
    still++;
    const rr = Rc.build(L, { birthPlace: L.home.label, deathPlace: O.placeLabel(L) });
    if (rr.summary.some(t => /移り住/.test(t)) || rr.places.length !== 1) moved.push(L.by + '年生まれ：' + rr.places.join('、'));
  }
  rec('v8直し1 家を離れている年（出家・旅・奉公・出征）に、妻・夫・子の誕生などの家の出来事が出ないか', modeBad.length === 0, modeBad.slice(0, 4).join('、'));
  rec('v8直し4 1600年より前の人生に「庄屋」が出ず、昔の配偶者の名前が今の時代の一覧から引かれていないか', shoya.length === 0 && oldName.length === 0, shoya.slice(0, 3).concat(oldName.slice(0, 3)).join('、'));
  rec('v8直し5 一生のひとことに、小さな選択・親の選択・節目の答えを使っていないか', badLine.length === 0, badLine.slice(0, 4).join('、'));
  rec('v8直し10 一度も引っ越していない1850〜1871年生まれ（' + still + '人）で、「移り住んだ」が出ず、暮らした土地が1つか', still > 0 && moved.length === 0, moved.slice(0, 3).join('、'));
  rec('v8直し11 下位40%の暮らし向きの家に生まれた人と女性が、地主・豪商などの仕事にならないか', elite.length === 0, elite.slice(0, 4).join('、'));
  rec('v8直し12 女性の人生に、藩校・寄り合いに出る・若者組・兵役の選択が出ないか', gender.length === 0, gender.slice(0, 4).join('、'));
}

/* ---------- v8 の直し（ichioku1000-v8-fix-spec1：2・3・13） ---------- */
{
  const CHx = require(path.join(SITE, 'js', 'choices.js'));
  const NP = TEST ? 200 : 500;
  // 2 すべての小さな選択に土地の種類（kind）と仕事の種類（ind）の条件があるか。時代の言葉が出せる年に収まっているか
  const noCond = CHx.list.filter(o => !(o.when && Array.isArray(o.when.kind) && Array.isArray(o.when.ind))).map(o => o.id);
  const eraBad = [];
  CHx.list.forEach(o => { const all = o.texts.join('') + o.options.map(p => p.l + (p.after || '')).join(''); const elite = (o.when.status || []).every(st => ['bushi', 'kuge', 'priest'].includes(st)) && (o.when.status || []).length > 0;
    for (const e of CHx.ERA_WORDS) if (e[0].test(all) && (o.y[0] < e[1] || o.y[1] > e[2]) && !(e[3] && elite) && !(o.when.y && o.when.y[0] >= e[1] && o.when.y[1] <= e[2])) eraBad.push(o.id + '（' + String(e[0]).slice(1, 6) + '）'); });
  let tot = 0, uni = 0, overLife = 0;
  const cityBad = [], offBad = [], tri = [];
  for (let i = 0; i < NP; i++) {
    const by = 1000 + Math.floor((i * 2.003 + 0.8) % 1001), seed = i * 40503 + 9;
    let L;
    if (by >= 1975) L = E.newLife(C, P[E.pickPref(C, by, E.makeRng(seed ^ 0x9e3779b9))], { year: by, seed });
    else { const b0 = O.pickBirth(C, H, by, E.makeRng(seed ^ 0x9e3779b9)); L = O.newLife(C, H, P[b0.pref] || null, { year: by, seed, birth: b0 }); }
    const M = L.old ? O : E; let g = 0; const lab = {};
    while (L.alive && g++ < 130) { let r = M.step(L); while (r && r.branch) { const br = r.branch; (br.groups || []).forEach(gr => (gr.options || []).forEach(o => { lab[o.l] = (lab[o.l] || 0) + 1; })); r = M.resolve(L, br.ask || br.id === 'ask' ? { text: '' } : E.autoAnswer(br, null)); } }
    const sm = (L.choices || []).filter(c => c.kind === 'small');
    tot += sm.length; const nu = sm.filter(c => c.u).length; uni += nu;
    if (sm.length >= 5 && nu / sm.length > 0.3) overLife++;
    for (const c of sm) {
      if (c.place === 'city' && /村|畑|田んぼ|田植|稲/.test(c.q || '')) cityBad.push(L.by + '年生まれ：' + (c.q || '').slice(0, 18));
      if (c.ind === 'office' && /仕入れ|客が|売り上げ|商い/.test((c.q || '') + c.l)) offBad.push(L.by + '年生まれ：' + (c.q || '').slice(0, 18));
    }
    const t3 = Object.entries(lab).filter(([k, v]) => v >= 3 && !/^「/.test(k));
    if (t3.length) tri.push(L.by + '年生まれ：' + t3.slice(0, 2).map(x => x[0] + '×' + x[1]).join('・'));
  }
  rec('v8直し2 すべての小さな選択に、土地の種類と仕事の種類の条件があり、時代に合わない言葉がないか', noCond.length === 0 && eraBad.length === 0, noCond.slice(0, 4).concat(eraBad.slice(0, 4)).join('、') || CHx.list.length + 'の選択');
  rec('v8直し2 時代を問わない選択が3割以下か（' + NP + '人）', tot > 0 && uni / tot <= 0.3 && overLife === 0, '全体 ' + Math.round(uni / tot * 100) + '%・3割を超えた人生 ' + overLife);
  rec('v8直し2 市街地の人生に村・畑・田の選択が出ず、勤め人に商いの選択が出ないか', cityBad.length === 0 && offBad.length === 0, cityBad.slice(0, 3).concat(offBad.slice(0, 3)).join('、'));
  rec('v8直し13 同じ答えの文が、1つの人生に3回以上出ないか', tri.length === 0, tri.slice(0, 4).join('、'));
  // 3 1935〜1938年生まれの町の子：1944〜1945年に疎開か空襲の出来事・選択が出る
  let n3 = 0, ok3 = 0; const miss3 = [];
  for (let i = 0; n3 < (TEST ? 40 : 100) && i < 5000; i++) {
    const by = 1935 + i % 4, seed = i * 31 + 7, b0 = O.pickBirth(C, H, by, E.makeRng(seed ^ 0x9e3779b9));
    const L = O.newLife(C, H, P[b0.pref] || null, { year: by, seed, birth: b0 });
    if (L.kind !== 'city' && L.kind !== 'town') continue;
    let g = 0; const qs = [];
    while (L.alive && g++ < 130) { let r = O.step(L); while (r && r.branch) { qs.push([L.year, (r.branch.groups || []).map(x => x.q).join('')]); r = O.resolve(L, r.branch.ask ? { text: '' } : E.autoAnswer(r.branch, null)); } }
    if (L.deathYear < 1945) continue;
    n3++;
    const ok = L.log.some(r => (r.year === 1944 || r.year === 1945) && r.events.some(e => /疎開|空襲/.test(e.t))) || qs.some(([y, q]) => (y === 1944 || y === 1945) && /疎開|空襲/.test(q));
    if (ok) ok3++; else miss3.push(L.by + '年生まれ');
  }
  rec('v8直し3 1935〜1938年生まれの町の子（' + n3 + '人）で、1944〜1945年に疎開か空襲の出来事・選択が出るか', n3 > 0 && ok3 === n3, miss3.slice(0, 4).join('、'));
}

/* ---------- 作る人の指示 2026-10-20（貴族5%・40代からの単調さ） ---------- */
{
  const oldLife = (by, seed) => { const b0 = O.pickBirth(C, H, by, E.makeRng(seed ^ 0x9e3779b9)); return O.newLife(C, H, P[b0.pref] || null, { year: by, seed, birth: b0 }); };
  const newLife = (by, seed) => E.newLife(C, P[E.pickPref(C, by, E.makeRng(seed ^ 0x9e3779b9))], { year: by, seed });
  let nk = 0, kk = 0; const kugeBad = [];
  for (let s0 = 1; s0 <= (TEST ? 6000 : 20000); s0++) { const by = 1000 + s0 % 947, L = oldLife(by, s0); nk++; if (L.status === 'kuge') { kk++; if (!((by < 1869 && L.pref === '26') || (by >= 1869 && L.pref === '13'))) kugeBad.push(by + ' ' + L.pref); } }
  // spec6 2-18（身分の割合）で、貴族の生まれは5%から2%（KUGE_SHARE 0.0202）に改めた。目安を2%前後（±0.5ポイント）に合わせる
  rec('貴族（公家・明治からは華族）の生まれが1946年までの2%前後（spec6 2-18）で、都（京・東京）に生まれるか', Math.abs(kk / nk - 0.02) <= 0.005 && kugeBad.length === 0, (kk / nk * 100).toFixed(1) + '%（' + nk + '人）' + (kugeBad.length ? '・都でない ' + kugeBad.slice(0, 3).join('、') : ''));
  // 40代からの単調さ：同じ人生の中で同じ出来事の文（先頭14字）が2回出ないか（孫の誕生・勤め先・家族の死など、本当に何度も起きることは除く）
  const REAL = /生まれ、孫|が生まれた|勤め先|亡くなった|知らせが届|便り/;
  let ny = 0, nl = 0, dup = 0, empty = 0, nlife = 0; const dups = {};
  for (let s0 = 1; nlife < (TEST ? 150 : 400) && s0 < 6000; s0++) {
    const by = s0 % 4 === 0 ? 1975 + s0 % 26 : 1000 + (s0 * 1.668 | 0) % 975;
    const L = by >= 1975 ? E.autoRun(newLife(by, s0)) : O.autoRun(oldLife(by, s0));
    if (L.deathAge < 65) continue; nlife++;
    const seen = {};
    for (const r of L.log) { if (r.age < 40 || r.dead) continue; ny++; const own = r.events.filter(e => e.cat !== '時代' && !/亡くなった。?$/.test(e.t)); if (!own.length) empty++;
      for (const e of own) { nl++; const k = e.t.slice(0, 14); if (seen[k] && !REAL.test(e.t) && L.mode !== 'shukke') { dup++; dups[k] = (dups[k] || 0) + 1; } seen[k] = 1; } }
  }
  rec('40歳からの人生（' + nlife + '人）で、同じ出来事の文が1つの人生に2回出ないか', dup === 0, Object.entries(dups).slice(0, 4).map(x => x.join('×')).join('、') || nl + '行');
  rec('40歳からの人生で、自分の出来事が1つもない年が5%以下か', empty / ny <= 0.05, (empty / ny * 100).toFixed(1) + '%（' + ny + '年）');
  const nLate = C.scenes.filter(s => s.late).length + H.scenes.filter(s => s.late).length, CHx = require(path.join(SITE, 'js', 'choices.js'));
  rec('40代からの場面と選択を足したか（場面' + nLate + '・選択' + CHx.list.filter(o => /^late\./.test(o.id)).length + '）', nLate >= 300 && CHx.list.filter(o => /^late\./.test(o.id)).length >= 80, '');
}

/* ---------- 作る人の指示 2026-10-19（A〜H） ---------- */
{
  const K = require(path.join(SITE, 'js', 'causes.js')), PM = require(path.join(SITE, 'js', 'paths.js')), Rc = require(path.join(SITE, 'js', 'record.js'));
  const rareSrc = JSON.parse(fs.readFileSync(path.join(ROOT, 'data-src', 'causes-rare.json'), 'utf8')), RN = rareSrc.map(r => r.n);
  const oldLife = (by, seed) => { const b0 = O.pickBirth(C, H, by, E.makeRng(seed ^ 0x9e3779b9)); return O.newLife(C, H, P[b0.pref] || null, { year: by, seed, birth: b0 }); };
  const newLife = (by, seed) => E.newLife(C, P[E.pickPref(C, by, E.makeRng(seed ^ 0x9e3779b9))], { year: by, seed });
  // A まれな死因：どれにも亡くなり方の文があり、たくさんの人生の中で実際に出る
  const noLine = RN.filter(n => !K.rareLine(n));
  const rareSeen = {}, pathLives = { all: 0, adult: 0, hit: 0 }, moved = []; let stayOk = 0, stayAll = 0;
  for (let s0 = 1; s0 <= (TEST ? 800 : 2000); s0++) {
    const by = s0 % 4 === 0 ? 1975 + s0 % 26 : 1000 + (s0 * 1.668 | 0) % 975;
    const L = by >= 1975 ? E.autoRun(newLife(by, s0)) : O.autoRun(oldLife(by, s0)), ct = Rc.causeText(L);
    if (RN.includes(ct)) rareSeen[ct] = (rareSeen[ct] || 0) + 1;
    if (L.deathAge >= 20) { pathLives.adult++; if ((L.choices || []).some(c => /^[bcer]_/.test(c.sid || ''))) pathLives.hit++; }
  }
  rec('A まれな死因（毒キノコ・クラゲ・雷など' + RN.length + '種類）に亡くなり方の文があり、人生の中で出るか', noLine.length === 0 && Object.keys(rareSeen).length >= 3, noLine.slice(0, 3).join('、') || Object.entries(rareSeen).map(x => x.join(' ')).join('、'));
  // B・C・E 人生の筋：どの分かれ道にも、家を出ない・身分の変わらない答えがあり、その答えにも続きがあるか
  const noStay = [];
  for (const p of PM.list) {
    const asks = [{ at: 'start', opts: p.opts }].concat(Object.entries(p.nodes || {}).filter(([, n]) => n.ask).map(([k, n]) => ({ at: k, opts: n.ask.opts })));
    for (const a of asks) { stayAll++; const st = a.opts.filter(o => !o.move || o.move === 'home').filter(o => !o.away && !o.status); if (st.length) stayOk++; else noStay.push(p.id + '.' + a.at); }
  }
  const kinds = { b: 0, c: 0, e: 0, r: 0 }; PM.list.forEach(p => kinds[p.id[0]]++);
  rec('B・C・E 人生の筋（珍しい仕事' + kinds.b + '・売られた子や預けられた子' + kinds.c + '・都や幕府や国で働く道' + kinds.e + '・将軍家と大名家' + kinds.r + '）のどの分かれ道にも、地元に残る答えがあるか', noStay.length === 0 && kinds.b >= 20 && kinds.c >= 20 && kinds.e >= 20, noStay.slice(0, 4).join('、') || stayOk + 'の分かれ道');
  rec('B・C・E 20歳以上まで生きた人生の2割以上が、人生の筋に出会うか（' + pathLives.adult + '人）', pathLives.hit / pathLives.adult >= 0.2, Math.round(pathLives.hit / pathLives.adult * 100) + '%');
  // D 武士・士族の生まれと、将軍家・大名家の生まれ
  // spec6 2-18（身分の割合）で「統計の3倍」（STATUS_MULT）から、時代ごとの掛け算（BUSHI_X）で全国の合計を合わせるやり方に改めた：
  // 平安（1184年まで）の武士3.5%、1185〜1871年の武士7%（将軍家・大名家を含む）、1872〜1947年の士族7%。生まれ年ごとの目安の平均から±1ポイントで確かめる
  let nb = 0, bu = 0, want = 0; const rk = {};
  for (let s0 = 1; s0 <= (TEST ? 6000 : 20000); s0++) { const by = 1000 + s0 % 975, L = oldLife(by, s0); nb++; want += by < 1185 ? 0.035 : by <= 1947 ? 0.07 : 0; if (L.status === 'bushi' || L.status === 'shizoku') bu++; if (L.rank) rk[L.rank] = (rk[L.rank] || 0) + 1; }
  const hj = fs.readFileSync(path.join(SITE, 'js', 'history.js'), 'utf8');
  rec('D 武士・士族の生まれが spec6 2-18 の割合（時代ごとの掛け算 BUSHI_X）に合い、将軍家・大名家の生まれがあるか', /var BUSHI_X = \[/.test(hj) && Math.abs(bu / nb - want / nb) <= 0.01 && (rk.daimyo || 0) > 0 && (rk.shogun || 0) > 0, '武士・士族 ' + (bu / nb * 100).toFixed(1) + '%（目安 ' + (want / nb * 100).toFixed(1) + '%）・' + Object.entries(rk).map(x => x.join(' ')).join('・') + '（' + nb + '人）');
  // H 名前の候補が、どの一覧も前の版より3割以上多いか（2026-10-19 の版と比べる）
  try {
    const cur = require(path.join(SITE, 'js', 'names.js')), base = JSON.parse(fs.readFileSync(path.join(ROOT, 'data-src', 'names-count-20261019.json'), 'utf8'));
    const cnt = {}; (function walk(o, k) { if (Array.isArray(o)) { if (o.every(x => typeof x === 'string' || (Array.isArray(x) && typeof x[0] === 'string'))) cnt[k] = o.length; else o.forEach((x, i) => walk(x, k + '[' + i + ']')); } else if (o && typeof o === 'object') for (const kk in o) walk(o[kk], k ? k + '.' + kk : kk); })(cur, '');
    const low = Object.keys(base).filter(k => cnt[k] != null && cnt[k] < base[k] * 1.3);
    rec('H 名前の候補が、どの一覧も前の版より3割以上多いか', low.length === 0, low.slice(0, 4).map(k => k + ' ' + base[k] + '→' + cnt[k]).join('、') || Object.keys(base).length + 'の一覧');
  } catch (e) { rec('H 名前の候補が、どの一覧も前の版より3割以上多いか', false, String(e.message).slice(0, 60)); }
  // F・G 画面の仕組み（ブラウザの試験でも確かめる）
  const aj = fs.readFileSync(path.join(SITE, 'js', 'app.js'), 'utf8');
  rec('F・G 20歳までに亡くなる人生が3回続かない仕組みと、同じ人生をもう一度生きるボタンがあるか', /ichioku-short/.test(aj) && /survivesTo21/.test(aj) && /'same-life'/.test(aj) && /id="same-life"/.test(fs.readFileSync(path.join(SITE, 'index.html'), 'utf8')), '');
}

/* ---------- v11の直し（指示書 ichioku1000-v11-fix-spec2） ---------- */
{
  const K = require(path.join(SITE, 'js', 'causes.js')), Rc = require(path.join(SITE, 'js', 'record.js')), CHx = require(path.join(SITE, 'js', 'choices.js'));
  globalThis.self = globalThis.self || globalThis;
  const Pz = require(path.join(SITE, 'js', 'polite.js'));
  const oldLife = (by, seed) => { const b0 = O.pickBirth(C, H, by, E.makeRng(seed ^ 0x9e3779b9)); return O.newLife(C, H, P[b0.pref] || null, { year: by, seed, birth: b0 }); };
  const newLife = (by, seed) => E.newLife(C, P[E.pickPref(C, by, E.makeRng(seed ^ 0x9e3779b9))], { year: by, seed });
  // 1〜3 出家した人生（出家の分かれ道を必ず出し、「出家する」を選ぶ）
  const NS = TEST ? 120 : 200, BAD = /再婚|縁談|後添え|祝言|嫁を迎|婿を迎|年貢|田植え|稲刈り|夜なべ|屋根を葺|用水|隣の田|同じ村の|言い争い|一晩じゅう看病|連れ添/;
  let ns = 0, yrs = 0, empty = 0; const leak = [], temples = new Set();
  for (let s0 = 1; ns < NS && s0 < 20000; s0++) {
    const L = oldLife(1000 + (s0 * 37) % 820, s0); L.testForce = { shukke: 1 }; let g = 0;
    while (L.alive && g++ < 130) { let r = O.step(L); while (r && r.branch) { const br = r.branch, ans = E.autoAnswer(br, null) || {}; for (const gr of br.groups || []) if (gr.id === 'shukke') ans[gr.id] = 'go'; r = O.resolve(L, br.ask ? { text: '' } : ans); } }
    const i0 = L.log.findIndex(r => r.mode === 'shukke');
    if (i0 < 0) continue; ns++; temples.add(L.templeName);
    // 出家していた年だけを見る（時衆の旅の筋などで寺を出て里に戻った後は、里の暮らしの出来事が出てよい。v19）
    for (const r of L.log.slice(i0 + 1)) { yrs++; if (!r.events.length) empty++; if (r.mode !== 'shukke') continue; for (const e of r.events) if (BAD.test(e.t) && !/知らせ|便り/.test(e.t) && !(e.cat === '健康' && /亡くなった/.test(e.t))) leak.push(L.by + '年生まれ ' + r.year + '年：' + e.t.slice(0, 30)); }
  }
  rec('v11直し1 出家した人生（' + ns + '人）で、出家の年より後に再婚・縁談・家族の名前の入った家の出来事・年貢や田の仕事の場面が出ないか', ns >= NS && leak.length === 0, leak.slice(0, 4).join('、'));
  rec('v11直し2 出家した人生で、出来事が0件の年が1割以下か', yrs > 0 && empty / yrs <= 0.1, (empty / Math.max(1, yrs) * 100).toFixed(1) + '%（' + yrs + '年）');
  rec('v11直し3 出家した人生で、寺の名前が10種類以上出るか', temples.size >= 10, temples.size + '種類');
  // 4 20歳以上まで生きた人生の、1年あたりの選択の回数
  let n4 = 0, ch4 = 0, y4 = 0;
  for (let s0 = 1; n4 < (TEST ? 200 : 500) && s0 < 6000; s0++) {
    const by = s0 % 4 === 0 ? 1975 + s0 % 26 : 1000 + (s0 * 1.668 | 0) % 975, L = by >= 1975 ? newLife(by, s0) : oldLife(by, s0), M = L.old ? O : E; let g = 0, cnt = 0;
    while (L.alive && g++ < 130) { let r = M.step(L); while (r && r.branch) { if (!r.branch.ask) cnt++; r = M.resolve(L, r.branch.ask ? { text: '' } : E.autoAnswer(r.branch, null)); } }
    if (L.deathAge < 20) continue; n4++; ch4 += cnt; y4 += L.deathAge + 1;
  }
  rec('v11直し4 20歳以上まで生きた人生（' + n4 + '人）で、1年あたりの選択の回数が0.5回以上か', ch4 / y4 >= 0.5, (ch4 / y4).toFixed(3) + '回');
  // 5-1 1948年からの生まれに族籍を出さない
  const zoku = [];
  for (let s0 = 1; s0 <= 300; s0++) { const L = oldLife(1948 + s0 % 27, s0), r = O.step(L); const t = r.events.map(e => e.t + (e.ev || []).map(v => v.what || '').join('')).join('') + O.houseWord(L); if (/士族|平民|華族/.test(t)) zoku.push(L.by + '年生まれ'); }
  rec('v11直し5-1 1948年からの生まれ（300人）の生まれの文に「士族」「平民」「華族」が出ないか', zoku.length === 0, zoku.slice(0, 4).join('、'));
  // 5-2 進路で選んだ方向と最初の仕事
  const DIRX = { office: ['office', 'pub'], tech: ['factory', 'build'], care: ['care'], service: ['service', 'shop'] }, DK = Object.keys(DIRX);
  let n52 = 0, ok52 = 0, ex52 = 0;
  for (let s0 = 1; n52 < (TEST ? 200 : 500) && s0 < 5000; s0++) {
    const L = newLife(1975 + s0 % 26, s0); let g = 0, dir = null, first = null;
    while (L.alive && g++ < 130 && !first) { let r = E.step(L); while (r && r.branch) { const br = r.branch; let ans = br.ask ? { text: '' } : null; if (br.id === 'job') { dir = DK[s0 % 4]; ans = Object.fromEntries(br.groups.map(gr => [gr.id, gr.options[0].k])); ans.dir = dir; } r = E.resolve(L, ans); if (dir && L.job && L.job.ind && !first) first = { k: L.job.ind, miss: L.jobMiss }; } }
    if (!dir || !first) continue; n52++; if (DIRX[dir].includes(first.k)) ok52++; else if (first.miss) ex52++;
  }
  rec('v11直し5-2 就職で選んだ方向と最初の仕事が合う割合が9割以上で、合わないときは文で説明しているか（' + n52 + '人）', ok52 / n52 >= 0.9 && ok52 + ex52 === n52, Math.round(ok52 / n52 * 100) + '%が合う・説明あり ' + ex52 + '人');
  // 5-3 寄席は1800年から、千歳飴・七五三は1700年から
  const early = CHx.list.filter(o => o.texts.concat(o.options.map(p => p.l + (p.after || ''))).some(t => (/寄席/.test(t) && o.y[0] < 1800) || (/千歳飴|七五三/.test(t) && o.y[0] < 1700))).map(o => o.id)
    .concat(H.scenes.filter(sc => (/寄席/.test(sc.t) && (!sc.y || sc.y[0] < 1800)) || (/千歳飴|七五三/.test(sc.t) && (!sc.y || sc.y[0] < 1700))).map(sc => sc.t.slice(0, 15)));
  rec('v11直し5-3 1800年より前に寄席、1700年より前に千歳飴・七五三の選択や場面が出ないか', early.length === 0, early.join('、'));
  // 5-4・7・8・9 たくさんの人生の文を見る
  const half = [], geshi = [], shortL = [], noDot = [], young = [], kidCause = [], sameMove = [];
  const ADULT = /癪|中風|卒中|難産|産後|^脚気$|労咳|老衰|胃の病|^梅毒$|いくさ|けんか|自害|肝硬変|がん|妊娠・出産|自殺/;
  for (let s0 = 1; s0 <= (TEST ? 400 : 1000); s0++) {
    const by = s0 % 3 === 0 ? 1975 + s0 % 26 : 1000 + (s0 * 1.668 | 0) % 975;
    const L = by >= 1975 ? E.autoRun(newLife(by, s0)) : O.autoRun(oldLife(by, s0));
    for (const r of L.log) for (const e of r.events) {
      const t = e.t, pt = Pz.polite(t);
      if (/[()]/.test(t)) half.push(t.slice(0, 30));
      if (/百姓（下司）/.test(t)) geshi.push(t.slice(0, 30));
      if (pt.length <= 20 && /ことにしました。$/.test(pt)) shortL.push(pt);
      if (!/。$/.test(t)) noDot.push(t.slice(0, 30));
      if (r.age >= 9 && /手を引かれて|背負われて|抱かれて/.test(t) && !/引いて|背負って|抱いて/.test(t.split(/手を引かれて|背負われて|抱かれて/)[0])) young.push(r.age + '歳：' + t.slice(0, 30));
    }
    if (L.deathAge < 5 && ADULT.test(Rc.causeText(L))) kidCause.push(L.deathAge + '歳：' + Rc.causeText(L));
    if (L.old) { const bp = L.home.label, dp = O.placeLabel(L), sm = Rc.build(L, { birthPlace: bp, deathPlace: dp }).summary.join(''); const m = sm.match(/、?([^、。]+)に移り住んだ。/); if (m && m[1].replace(/（.*?）/g, '') === String(bp).replace(/（.*?）/g, '') && m[1] === bp) sameMove.push(m[1]); }
  }
  rec('v11直し5-4 画面に出る文に半角の「(」「)」と「百姓（下司）」が出ないか', half.length === 0 && geshi.length === 0, half.concat(geshi).slice(0, 3).join('、'));
  // 7 5歳未満の死因（子どもの呼び方）
  const kidW = [];
  for (let y = 1000; y <= 1974; y += 3) for (let a = 0; a < 5; a++) for (const sx of ['m', 'f']) for (const fam of [true, false]) for (const x of K.weights(y, a, sx, { place: 'village', famine: fam })) { const n = K.show(x.n, a); if (ADULT.test(n)) kidW.push(y + '年' + a + '歳：' + n); }
  rec('v11直し7 5歳未満で亡くなる人の死因に、癪・中風・難産など大人の死因が出ないか', kidCause.length === 0 && kidW.length === 0, kidCause.concat([...new Set(kidW)]).slice(0, 4).join('、'));
  rec('v11直し8 「○○に移り住んだ」の○○が、生まれた土地と同じ呼び名にならないか', sameMove.length === 0, sameMove.slice(0, 3).join('、'));
  const noAfter = CHx.list.flatMap(o => o.options.filter(p => !p.after).map(p => o.id + '|' + p.k));
  rec('v11直し9 すべての選択肢に、何について決めたかが分かる「選んだあとの1文」があるか', noAfter.length === 0, noAfter.slice(0, 4).join('、') || CHx.list.length + 'の選択');
  rec('v11直し9 20字以下の「〜ことにしました。」だけの行が出ないか', shortL.length === 0, [...new Set(shortL)].slice(0, 4).join('、'));
  rec('v11直し9 9歳以上の人生の記録に「手を引かれて」「背負われて」「抱かれて」が出ないか', young.length === 0, young.slice(0, 3).join('、'));
  rec('v11直し9 人生の記録のすべての行が「。」で終わるか', noDot.length === 0, noDot.slice(0, 3).join('、'));
  const noAge = H.scenes.filter(sc => !sc.a).length + C.scenes.filter(sc => !sc.a).length;
  rec('v11直し9 すべての場面に年齢の範囲があるか', noAge === 0, noAge + '件');
  // 10 字体（Zen Kaku Gothic New をサイトの中から読み込む）
  const fdir = path.join(SITE, 'fonts'), fcss = fs.existsSync(path.join(fdir, 'zen-kaku-gothic-new.css')) ? fs.readFileSync(path.join(fdir, 'zen-kaku-gothic-new.css'), 'utf8') : '';
  const urls = [...fcss.matchAll(/url\(\.\/([^)]+)\)/g)].map(m => m[1]), missing = urls.filter(u => !fs.existsSync(path.join(fdir, u)));
  const big = fs.readdirSync(fdir).filter(f => fs.statSync(path.join(fdir, f)).size > 25 * 1024 * 1024);
  const htmls = fs.readdirSync(SITE).filter(f => f.endsWith('.html')), noLink = htmls.filter(f => !/fonts\/zen-kaku-gothic-new\.css/.test(fs.readFileSync(path.join(SITE, f), 'utf8')));
  const css = fs.readFileSync(path.join(SITE, 'css', 'style.css'), 'utf8'), ext = htmls.concat(['css/style.css']).filter(f => /fonts\.googleapis|fonts\.gstatic/.test(fs.readFileSync(path.join(SITE, f), 'utf8')));
  const weights = ['400', '700', '900'].filter(wt => !new RegExp('font-weight: ' + wt).test(fcss));
  rec('v11直し10 字体 Zen Kaku Gothic New（400・700・900）をサイトの中に置き、すべてのページで読み込み、外部の字体サーバーを使わないか', fcss && urls.length > 0 && !missing.length && !big.length && !noLink.length && !ext.length && !weights.length && fs.existsSync(path.join(fdir, 'OFL.txt')) && /--f-zen/.test(css) && /\.top-title \{ font-family: var\(--f-title\)/.test(css),
    missing.concat(big, noLink, ext, weights).slice(0, 4).join('、') || urls.length + 'ファイル');
}

/* ---------- 死因を多種多様に（作る人の指示 2026-10-18） ---------- */
{
  const K = require(path.join(SITE, 'js', 'causes.js')), Rc = require(path.join(SITE, 'js', 'record.js'));
  // 1 どの死因にも亡くなり方の文がある（1974年までの死因・細かく分けた病名・2015年からの死因）
  const names = new Set();
  for (const e of K.eras) for (const c of e.causes) if (c.kind !== 'sui') names.add(K.show(c.n));
  for (const n of ['その他の病気', 'がん', 'その他の事故']) for (const a of [0, 20, 60]) for (let u = 0; u < 1; u += 0.01) names.add(K.refine(n, a, 'f', 2000, u));
  for (const d of C.nat.causeDetail.dist) for (const k of Object.keys(d)) if (k !== '自殺') names.add(k);
  for (const r of JSON.parse(fs.readFileSync(path.join(ROOT, 'data-src', 'causes-rare.json'), 'utf8'))) names.add(r.n);
  const noText = [...names].filter(n => !E.COURSE[n] && !K.rareLine(n));
  rec('死因1 どの死因にも、その病気やけがの亡くなり方の文があるか', noText.length === 0, noText.slice(0, 6).join('、') || names.size + '種類');
  // 2 1000〜2000年生まれの人生で、死因が多種多様か（「病気」「その他の病気」だけの死因がほぼない）
  const cnt = {}; let nL = 0;
  for (let s0 = 1; s0 <= (TEST ? 400 : 1200); s0++) {
    const by = s0 % 2 ? 1000 + (s0 * 1.668 | 0) % 975 : 1930 + (s0 * 7) % 71; let L;
    if (by >= 1975) L = E.autoRun(E.newLife(C, P[E.pickPref(C, by, E.makeRng(s0 ^ 0x9e3779b9))], { year: by, seed: s0 }));
    else { const b0 = O.pickBirth(C, H, by, E.makeRng(s0 ^ 0x9e3779b9)); L = O.autoRun(O.newLife(C, H, P[b0.pref] || null, { year: by, seed: s0, birth: b0 })); }
    const k = Rc.causeText(L); cnt[k] = (cnt[k] || 0) + 1; nL++;
  }
  const vague = (cnt['病気'] || 0) + (cnt['その他の病気'] || 0) + (cnt['がん'] || 0) + (cnt['その他の事故'] || 0);
  const kinds = Object.keys(cnt).length, top = Object.entries(cnt).sort((a, b) => b[1] - a[1]);
  rec('死因2 死因が多種多様か（' + nL + '人で40種類以上・ひとまとめの死因が2%以下・いちばん多い死因が2割以下）', kinds >= 40 && vague / nL <= 0.02 && top[0][1] / nL <= 0.2, kinds + '種類・ひとまとめ ' + vague + '人・多い順 ' + top.slice(0, 5).map(a => a[0] + ' ' + a[1]).join('、'));
  // 3 交通事故・脳梗塞・糖尿病・栄養失調が、その時代の死因として選ばれるか
  const want = { '交通事故': [1970, 60, 'm'], '脳梗塞': [1970, 75, 'm'], '糖尿病': [1965, 70, 'f'], '栄養失調': [1946, 2, 'f'] }, miss = [];
  for (const [n, [y, a, sx]] of Object.entries(want)) { const w = K.weights(y, a, sx, { place: 'town', famine: y === 1946 }); if (!w.some(x => x.n === n)) miss.push(n); }
  let modern = 0; for (let s = 1; s <= 300; s++) { const c = E.pickCause(C, 60, 'm', 2010, E.makeRng(s), null); if (c && /交通事故|脳梗塞|糖尿病/.test(c.name)) modern++; }
  // 4 亡くなり方の文が、画面で丁寧体（です・ます）に直るか
  globalThis.self = globalThis.self || globalThis;
  const Pz = require(path.join(SITE, 'js', 'polite.js')), plain = [];
  for (const [k, v] of Object.entries(E.COURSE)) for (const t of v) { const r = Pz.polite(t + '。'); if (!/(ます|ました|です|でした|ません)。$/.test(r)) plain.push(k + '：' + r); }
  rec('死因4 亡くなり方の文が、画面で丁寧体（です・ます）に直るか', plain.length === 0, plain.slice(0, 4).join('、'));
  rec('死因3 交通事故・脳梗塞・糖尿病・栄養失調が、その時代の死因の候補に入っているか', miss.length === 0 && modern > 0, miss.join('、') || '2010年の60歳男性300人中 ' + modern + '人が交通事故・脳梗塞・糖尿病');
}

/* ---------- S 物語の分かれ道（作る人の指示 2026-10-17） ---------- */
{
  const Sx = require(path.join(SITE, 'js', 'story.js'));
  const BAN_S = ['効く', '効いて', '効き', '重い', '重く', '重か', '重さ', '読み', 'まず', '見ます', '判定', '一方で', '結論から言うと', '示唆', 'わけです', '極めて', '興味深い', '齟齬', '——', '統計'];
  const ERAS_S = [['平安〜戦国', 1000, 1599], ['江戸', 1600, 1867], ['明治〜昭和', 1868, 1974], ['平成から', 1975, 2000]];
  const bad = [], cov = [], picks = {}, arcsSeen = new Set(), echo = {}, advPicks = [];
  const ADV_SID = ['koi', 'ise', 'kumano', 'ashigaru', 'dream.go', 'imin', 'geino', 'shishi', 'rangaku', 'sumoOld', 'narrow', 'cafe', 'manshu'];
  const NS = TEST ? 240 : 800;
  for (const [nm, y0, y1] of ERAS_S) {
    let adult = 0, withB = 0, nb = 0;
    for (let i = 0; i < NS; i++) {
      const by = y0 + (i * 13) % (y1 - y0 + 1), seed = i * 104729 + 11;
      let L;
      try {
        if (by >= 1975) L = E.newLife(C, P[E.pickPref(C, by, E.makeRng(seed ^ 0x9e3779b9))], { year: by, seed });
        else { const b0 = O.pickBirth(C, H, by, E.makeRng(seed ^ 0x9e3779b9)); L = O.newLife(C, H, P[b0.pref] || null, { year: by, seed, birth: b0 }); }
        const M = L.old ? O : E; let g = 0, n = 0;
        while (L.alive && g++ < 130) {
          let r = M.step(L);
          while (r && r.branch) {
            const br = r.branch;
            if (br.id === 'story') {
              n++;
              const t = [br.title, ...br.groups.flatMap(gr => [gr.q, ...gr.options.map(o => o.l)])].join(' ');
              const hit = BAN_S.filter(w => t.includes(w)); if (hit.length) bad.push('分かれ道「' + br.title + '」に ' + hit.join('・'));
              if (br.groups[0].options.length < 2 || br.groups[0].options.length > 3) bad.push('分かれ道「' + br.title + '」の答えの数');
              r = M.resolve(L, null);
              if (ADV_SID.includes(br.sid)) advPicks.push([L.story.tr.adv, r.storyPick === br.groups[0].options[0].l]);
              const pk = br.sid + ':' + (r.storyPick || ''); picks[pk] = (picks[pk] || 0) + 1;
            } else r = M.resolve(L, br.ask ? { text: '' } : null);
          }
        }
        if (L.deathAge >= 20) { adult++; if (n) withB++; nb += n; }
        if (L.story) { Object.keys(L.story.done).forEach(k => arcsSeen.add(k)); }
        for (const r of L.log) for (const e of r.events) if (e.story) {
          const hit = BAN_S.filter(w => e.t.includes(w)); if (hit.length) bad.push('文「' + e.t.slice(0, 20) + '」に ' + hit.join('・'));
          if (!CATS_OK.includes(e.cat)) bad.push('文の種類 ' + e.cat);
          if (/思い出|笑って言えた|便りが来た|聞かせた|頭を下げられた|子どもたちに|胸がいっぱい|とんとん拍子/.test(e.t) && r.age >= 30) echo[nm] = (echo[nm] || 0) + 1;
        }
      } catch (e) { bad.push(by + '年生まれ：' + e.message); }
    }
    cov.push(nm + ' ' + (adult ? Math.round(withB / adult * 100) : 0) + '%・平均' + (adult ? (nb / adult).toFixed(1) : 0) + '回');
    if (!adult || withB / adult < 0.8) bad.push(nm + '：20歳まで生きた人のうち分かれ道に出会った人が8割に届かない（' + (adult ? Math.round(withB / adult * 100) : 0) + '%）');
  }
  rec('S 物語の分かれ道が、どの時代でも20歳まで生きた人の8割以上に出て、文と答えが禁止語・統計の文言を含まず、エラーなく最期まで進むか', bad.length === 0, [...new Set(bad)].slice(0, 6).join('、') || cov.join('、') + '・使われた筋 ' + arcsSeen.size);
  // 気質で答えが変わるか：挑戦する気質が強い人ほど、踏み出す方（最初の答え）を選ぶ
  {
    const g = { hi: [0, 0], lo: [0, 0] };
    for (const x of advPicks) { const k = x[0] > 0.7 ? 'hi' : x[0] < -0.7 ? 'lo' : null; if (!k) continue; g[k][1]++; if (x[1]) g[k][0]++; }
    const a1 = g.hi[1] ? g.hi[0] / g.hi[1] : 0, a2 = g.lo[1] ? g.lo[0] / g.lo[1] : 0;
    rec('S 気質で分かれ道の答えが変わるか（挑戦する気質の強い人ほど踏み出す方を選ぶ）', g.hi[1] >= 30 && g.lo[1] >= 30 && a1 - a2 >= 0.1, '強い人 ' + Math.round(a1 * 100) + '%（' + g.hi[1] + '回）・弱い人 ' + Math.round(a2 * 100) + '%（' + g.lo[1] + '回）');
  }
  rec('S あのときの選択があとで返ってくる場面（何十年もあとの出来事）が、どの時代にも出るか', ERAS_S.every(([nm]) => echo[nm] > 0), ERAS_S.map(([nm]) => nm + ' ' + (echo[nm] || 0) + '件').join('、'));
}

/* ---------- M きょうだいとして生きる・継がない子の道（作る人の指示書 第2版 2026-10-17） ---------- */
{
  const res = {};
  const seedOf = (s0, id) => ((s0 ^ Math.imul(id, 0x9e3779b1)) >>> 0) || 1;
  const firstLife = (by, seed) => {
    if (by >= 1975) { const p0 = P[E.pickPref(C, by, E.makeRng(seed ^ 0x9e3779b9))]; return E.newLife(C, p0, { year: by, seed }); }
    const b0 = O.pickBirth(C, H, by, E.makeRng(seed ^ 0x9e3779b9)); return O.newLife(C, H, P[b0.pref] || null, { year: by, seed, birth: b0 });
  };
  const inherit = (Lp, id, s0) => { const MM = Lp.old ? O : E, h = MM.houseOf(Lp); return Lp.old ? O.newLife(C, H, P[h.home.pref], { house: h, memberId: id, seed: seedOf(s0, id) }) : E.newLife(C, Lp.P, { house: h, memberId: id, seed: seedOf(s0, id) }); };
  const playTo = (M, L, until) => { while (L.alive && L.year < until) { let r = M.step(L); while (r && r.branch) r = M.resolve(L, r.branch.ask ? { text: '' } : null); } return L; };
  const run = (M, L) => M.autoRun(L);
  // 子として生きる（作る人の指示 2026-10-17）：親が亡くなった年・ほかの家族の生き死にが前の人生と食い違わないか
  { const bad = []; let n = 0, tried = 0;
    const NK = TEST ? 60 : 200;
    for (let s0 = 1; n < NK && s0 < 40000; s0++) {
      const by = s0 % 2 ? 1000 + (s0 * 53) % 975 : 1950 + (s0 * 7) % 51, L = run(by >= 1975 ? E : O, firstLife(by, s0));
      const MM = L.old ? O : E, cs = MM.childCandidates(L);
      if (!cs.length) continue;
      const c = cs[s0 % cs.length], kid = L.members.find(m => m.id === c.id);
      tried++;
      let L2;
      try {
        const h = MM.childHouse(L, c.id, []);
        L2 = L.old ? O.newLife(C, H, P[h.home.pref], { house: h, memberId: c.id, seed: seedOf(s0, c.id) }) : E.newLife(C, P[h.pref] || L.P, { house: h, memberId: c.id, seed: seedOf(s0, c.id) });
        L2 = run(MM, L2);
      } catch (e) { bad.push(by + '年：' + e.message); continue; }
      n++;
      if (L2.by !== kid.by || L2.sex !== kid.sex || L2.name !== kid.name) bad.push(by + '年：子の生まれ年・性別・名前が違う');
      const pv = L2.members.find(m => m.prevLife);
      if (!pv || pv.role !== (L.sex === 'm' ? '父' : '母')) bad.push(by + '年：亡くなった人が親になっていない');
      else if (pv.dy !== L.deathYear && L2.deathYear >= L.deathYear) bad.push(by + '年：親の亡くなった年が違う（' + pv.dy + '／' + L.deathYear + '）');
      for (const m0 of L.members.filter(m => m.role === '子' && m.id !== c.id && !m.alive && m.dy != null && m.dy <= L.deathYear && m.dy >= kid.by)) {
        const m2 = L2.members.find(m => m.id === m0.id);
        if (!m2 || m2.dy !== m0.dy) bad.push(by + '年：きょうだいの亡くなった年が違う');
      }
    }
    res['子として生きる：' + n + '件（親の亡くなった年・子の名前と生まれ年・きょうだいの生き死にが前の人生と合うか）'] = n >= NK * 0.8 ? bad : bad.concat(['試せた件数が少ない ' + n + '／' + tried]);
  }
  // 1〜4
  { const bad = []; let n = 0, withC = 0;
    for (let s0 = 1; n < 100 && s0 < 20000; s0++) {
      const by = 1700 + (s0 * 37) % 275, L = run(O, firstLife(by, s0));
      if (L.deathAge > 5) continue; n++;
      const cs = O.heirCandidates(L), alive = L.members.some(m => m.sib && !m.gone && ((m.alive && m.by <= L.deathYear) || (m.by > L.deathYear && L.mom.alive)));
      if (!!cs.length !== alive) bad.push(by + '年：候補の有無が生きているきょうだいと合わない');
      if (!cs.length) continue; withC++;
      const c = cs[s0 % cs.length], L2 = run(O, inherit(L, c.id, s0));
      for (const m of L.members.filter(m => ['父', '母', '祖父', '祖母'].includes(m.role))) {
        const m2 = L2.members.find(x => x.id === m.id);
        const d1 = m.dy != null && m.dy <= L.deathYear ? m.dy : null, d2 = m2 && m2.dy != null && m2.dy <= L.deathYear ? m2.dy : null;
        if (!m2 || m2.name !== m.name || m2.by !== m.by || d1 !== d2) bad.push(by + '年：' + m.role + 'が前の人生と違う');
      }
      for (const r of L2.log.filter(r => r.year <= L.deathYear)) for (const e of r.events) if (e.cat === '家庭' && /亡くなった/.test(e.t) && !/前の人生/.test(JSON.stringify(e.ev)) && !/幼くして/.test(e.t)) bad.push(by + '年：前の人生にない家族の死 ' + e.t.slice(0, 20));
      const pv = L2.members.find(m => m.prevLife);
      if (!pv || pv.alive || pv.dy !== L.deathYear) bad.push(by + '年：前の主人公が亡くなった家族として出ない');
    }
    res['1〜4 候補・家族の一致・前の人生にない死・家系図（0〜5歳で亡くなった' + n + '件、候補あり' + withC + '件）'] = bad; }
  // 5 家督：1898〜1947年に跡取りの長男が亡くなったら、次に年長の生きている男子が跡取り。1948年からは跡取りの場面が出ない
  { const bad = []; let n = 0;
    for (let s0 = 1; n < 40 && s0 < 60000; s0++) {
      const by = 1890 + s0 % 50, L = run(O, firstLife(by, s0));
      if (L.sex !== 'm' || !L.heir || L.deathYear > 1946 || L.deathYear < 1898) continue;
      const bro = L.members.filter(m => m.sib && m.sex === 'm' && !m.gone && m.alive && m.by <= L.deathYear && m.by > L.by).sort((a, b) => a.by - b.by)[0];
      if (!bro) continue; n++;
      const L2 = playTo(O, inherit(L, bro.id, s0), L.deathYear + 1);
      if (!L2.heir) bad.push(by + '年：次に年長の男子が跡取りにならない');
      if (!L2.log.some(r => r.year === L.deathYear && r.events.some(e => /家を継ぐことになった/.test(e.t)))) bad.push(by + '年：「家を継ぐことになった」が出ない');
    }
    for (let s0 = 1; s0 < 200; s0++) { const L = run(O, firstLife(1940 + s0 % 35, s0)); if (L.log.some(r => r.year >= 1948 && r.events.some(e => /家を継ぐことになった|家督を継いだ/.test(e.t)))) bad.push('1948年より後に跡取りの場面が出た'); }
    res['5 家督（1898〜1947年の長男が亡くなった' + n + '件）と1948年からの家督の場面'] = bad; }
  // 6 3人続けた家を作り直すと一致する（10家）
  { const bad = []; let n = 0;
    const build = s0 => { const by = 1700 + (s0 * 13) % 270; let L = run(O, firstLife(by, s0)); const sig = []; for (let k = 0; k < 3; k++) { sig.push(L.name + ':' + L.deathAge + ':' + L.cause + ':' + L.log.map(r => r.events.map(e => e.t).join('|')).join('/')); if (k === 2) break; const cs = O.heirCandidates(L); if (!cs.length) return null; L = run(O, inherit(L, cs[0].id, s0)); } return sig.join('#'); };
    for (let s0 = 1; n < 10 && s0 < 3000; s0++) { const a1 = build(s0); if (!a1) continue; n++; if (build(s0) !== a1) bad.push('種 ' + s0 + '：作り直すと違う'); }
    res['6 3人続けた家の作り直し（' + n + '家）'] = bad; }
  // 10〜13 奉公・跡取り・武士の養子・分家
  { const bad = [], hk = {}, bushi = { a: 0, t: 0, e: 0 }; let n = 0, kosaku = 0;
    const N10 = TEST ? 8000 : 20000; // 指示書は3,000件。1つの区分が数百人になり偶然のぶれで±5を超えるため、人数を増やして確かめる
    for (let s0 = 1; n < N10 && s0 < 2000000; s0++) {
      const by = 1700 + s0 % 161, L = firstLife(by, s0);
      if (L.status !== 'hyakusho' && L.status !== 'bushi') continue;
      if (L.status === 'hyakusho') n++;
      run(O, L);
      if (L.status === 'hyakusho' && L.hokoAsked) { const k = L.hokoAsked.sex + L.hokoAsked.tier; (hk[k] = hk[k] || [0, 0])[1]++; if (L.hokoAsked.went) hk[k][0]++; }
      if (L.status === 'bushi' && L.succ && L.succ.y >= 1701 && L.succ.y <= 1800) { bushi.t++; bushi.e += L.succ.t; if (L.succ.adopted) bushi.a++; }
      if (L.status === 'hyakusho' && L.bunke && L.incPct < 0.4 && L.bunke >= 1673) kosaku++;
      // 11 跡取りは1人。男子がいる家で娘が跡取りにならない
      const h = O.heirOf(L);
      if (h.how === 'muko' && L.members.some(m => m.sib && m.sex === 'm' && m.alive && !m.gone && m.by <= L.year)) bad.push('男子がいるのに娘が跡取り');
      if (L.heirFAtMarry && !L.tookMuko) bad.push('男子がいない家の娘が婿を取らずに嫁いだ');
    }
    const T = { m: [0.62, 0.30, 0.40], f: [0.72, 0.60, 0.30] }, rows = [];
    // 奉公に出るかは種と年から作る乱数で表の割合のまま引くので、ずれは人数の少なさから来る偶然のぶれだけ。試験モードでは1つの区分が150〜800人で、
    // ぶれの大きさ（標準誤差）が2〜4ポイントになるため、±5ポイントか標準誤差の3倍の広い方まで認める（2026-10-22）
    for (const k of Object.keys(hk).sort()) { const v = hk[k][0] / hk[k][1], t = T[k[0]][+k[1]], tol = Math.max(0.05, 3 * Math.sqrt(t * (1 - t) / hk[k][1])); rows.push(k + ' ' + (v * 100).toFixed(1) + '%/' + t * 100 + '%'); if (Math.abs(v - t) > tol) bad.push('奉公の割合 ' + k + ' ' + (v * 100).toFixed(1) + '%（表 ' + t * 100 + '%）'); }
    // 当主が養子だった家の割合（作る人の判断 2026-10-17）：生まれた家で家督が受け継がれたとき（1701〜1800年）に、継いだのが養子だった割合と、その年の表の値の平均を比べる
    const tA = bushi.t ? bushi.e / bushi.t : 0, vA = bushi.t ? bushi.a / bushi.t : 0;
    if (bushi.t < 100 || Math.abs(vA - tA) > 0.05) bad.push('当主が養子だった家 ' + (vA * 100).toFixed(1) + '%（表の値の平均 ' + (tA * 100).toFixed(1) + '%・' + bushi.t + '家）');
    if (kosaku) bad.push('小作の家で分家が起きた ' + kosaku + '件');
    res['10〜13 奉公の割合（百姓' + n + '人：' + rows.join('、') + '）・跡取り・当主が養子だった家（' + bushi.t + '家 ' + (bushi.t ? (bushi.a / bushi.t * 100).toFixed(1) : '0') + '%）・小作の分家'] = bad; }
  // 14 名字と旧姓
  { const bad = []; let n = 0;
    for (let s0 = 1; n < 30 && s0 < 80000; s0++) { const L = firstLife(1700 + s0 % 200, s0); if (L.status !== 'hyakusho' || L.sex !== 'm') continue; run(O, L); if (!L.muko && !L.adopted) continue; n++; if (!L.surnameOld || O.displayName(L) !== L.surname + L.name + '（旧姓 ' + L.surnameOld + '）') bad.push('名字の出し方'); }
    const app = fs.readFileSync(path.join(SITE, 'js', 'app.js'), 'utf8');
    if (!/\$\('end-title'\)\.textContent = (dispName|heroName)\(\)/.test(app) || !/function heroName\(Lx\) \{ return String\(dispName\(Lx\)/.test(app) || !/name: dispName\(\)/.test(app) || !/'旧姓 ' \+ L\.surnameOld/.test(app)) bad.push('最期の画面・共有用の画像・家系図に新しい名字と旧姓が出ない');
    res['14 婿養子・養子に入った人の名字と旧姓（' + n + '人）'] = bad; }
  // 15 1948年からの生まれに奉公・分家・婿養子・養子の分かれ道が出ない
  { const bad = [];
    for (let s0 = 1; s0 < 300; s0++) {
      const by = 1948 + s0 % 53, L = firstLife(by, s0), M = by >= 1975 ? E : O, kinds = new Set();
      while (L.alive) { let r = M.step(L); while (r && r.branch) { kinds.add(r.branch.kind || r.branch.id); r = M.resolve(L, r.branch.ask ? { text: '' } : null); } }
      for (const k of ['hoko', 'hokoEnd', 'bunke', 'muko', 'yoshi']) if (kinds.has(k)) bad.push(by + '年生まれに ' + k);
    }
    res['15 1948年からの生まれ（300人）に奉公・分家・婿養子・養子の分かれ道が出ない'] = bad; }
  for (const [k, b] of Object.entries(res)) rec('M ' + k, b.length === 0, [...new Set(b)].slice(0, 6).join('、'));
}

/* ---------- J サイトとしての周りの機能 ---------- */
{
  const bad = [];
  const pages = ['index.html', 'about.html', 'privacy.html', 'contact.html', 'changelog.html'];
  let man = null;
  try { man = JSON.parse(fs.readFileSync(path.join(SITE, 'manifest.webmanifest'), 'utf8')); } catch (e) { bad.push('manifest.webmanifest が読めない'); }
  if (man) {
    for (const ic of man.icons || []) if (!fs.existsSync(path.join(SITE, ic.src))) bad.push('アイコンがない：' + ic.src);
    if (!(man.icons || []).some(i => i.sizes === '512x512') || !(man.icons || []).some(i => i.sizes === '192x192')) bad.push('192と512の大きさのアイコンがそろっていない');
    if (!man.start_url || man.display !== 'standalone') bad.push('ホーム画面から開く設定が足りない');
  }
  for (const f of pages) {
    const p = path.join(SITE, f);
    if (!fs.existsSync(p)) { bad.push(f + ' がない'); continue; }
    const h = fs.readFileSync(p, 'utf8');
    if (!h.includes('rel="manifest"')) bad.push(f + '：manifest を取り込んでいない');
    if (!h.includes('js/prefs.js')) bad.push(f + '：明るさの設定を取り込んでいない');
    for (const q of pages) if (q !== 'index.html' && !h.includes('href="' + q + '"') && f !== q) bad.push(f + '：' + q + ' への案内がない');
  }
  for (const f of ['index.html', 'about.html']) if (!fs.readFileSync(path.join(SITE, f), 'utf8').includes('id="settings"')) bad.push(f + '：明るさの切り替えがない');
  const pr = fs.readFileSync(path.join(SITE, 'js', 'prefs.js'), 'utf8');
  for (const k of ["'auto'", "'light'", "'dark'", 'ichioku-theme']) if (!pr.includes(k)) bad.push('prefs.js に ' + k + ' がない');
  rec('J ホーム画面に追加（manifest とアイコン）・明るさの切り替え・ページ（プライバシー・問い合わせ先・更新履歴）がそろっているか', bad.length === 0, bad.slice(0, 8).join('、'));

  // 画面の部品の取りちがえ（app.js が探す部品が index.html にない。2026-10-17 最期の画面が途中で止まったミスから）
  {
    const aj = fs.readFileSync(path.join(SITE, 'js', 'app.js'), 'utf8'), ih = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8');
    const ids = [...new Set([...aj.matchAll(/\$\('([\w-]+)'\)/g)].map(m => m[1]))];
    const miss = ids.filter(i => !ih.includes('id="' + i + '"') && !aj.includes("if ($('" + i + "'))") && !new RegExp("\\.id = '" + i + "'").test(aj));
    rec('J2 人生・最期の画面の部品（app.js が探すもの）が index.html にそろっているか', miss.length === 0, miss.length ? 'ない部品：' + miss.join('、') : ids.length + 'の部品を確かめた');
  }

  // 遊ぶ画面に「統計」の文言を出さない（作る人の指示 2026-10-17。出どころは「このサイトについて」だけ）
  {
    const bad2 = [], strip = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '').split('\n').map(l => l.replace(/(^|[^:'"])\/\/.*$/, '$1')).join('\n');
    const html = strip(fs.readFileSync(path.join(SITE, 'index.html'), 'utf8')).replace(/<script[\s\S]*?<\/script>/g, '');
    if (/統計/.test(html.replace(/<[^>]+>/g, ' ').replace(/content="[^"]*"/g, ''))) bad2.push('index.html の文に「統計」');
    if (/統計/.test((html.match(/content="[^"]*"/g) || []).join(' '))) bad2.push('index.html の説明（description）に「統計」');
    for (const f of ['app.js', 'top.js', 'curve.js', 'card.js', 'prefs.js']) {
      const m = strip(fs.readFileSync(path.join(SITE, 'js', f), 'utf8')).match(/'[^'\n]*統計[^'\n]*'/g);
      if (m) bad2.push(f + '：' + m[0]);
    }
    let n = 0;
    for (let i = 0; i < 60; i++) {
      let L;
      if (i % 2) { const by = 1975 + (i * 3) % 26, seed = i * 4441 + 3; L = E.newLife(C, P[E.pickPref(C, by, E.makeRng(seed ^ 0x9e3779b9))], { year: by, seed }); }
      else { const oy = 1000 + (i * 97) % 975, os = i * 3301 + 5, ob = O.pickBirth(C, H, oy, E.makeRng(os ^ 0x9e3779b9)); L = O.newLife(C, H, P[ob.pref] || null, { year: oy, seed: os, birth: ob }); }
      const M = L.old ? O : E; let g = 0;
      while (L.alive && g++ < 130) {
        let r = M.step(L);
        const texts = [];
        while (r && r.branch) { const br = r.branch; texts.push(br.title || '', ...(br.groups || []).flatMap(gr => [gr.q || '', ...gr.options.map(o => o.l)])); r = M.resolve(L, br.ask ? { text: '' } : Object.fromEntries((br.groups || []).map(gr => [gr.id, gr.options[0].k]))); }
        for (const e of r.events) texts.push(e.t);
        for (const it of (r.world && r.world.items) || []) texts.push(it.t);
        const hit = texts.find(t => /統計/.test(t));
        if (hit) bad2.push(L.by + '年生まれ ' + r.year + '年：' + hit.slice(0, 40));
        n++;
      }
    }
    rec('N 遊ぶ画面（トップ・人生・最期・出来事・分かれ道）に「統計」の文言を出していないか', bad2.length === 0, [...new Set(bad2)].slice(0, 6).join('、') || n + '年分の出来事を確かめた');
  }
  const contact = fs.readFileSync(path.join(SITE, 'contact.html'), 'utf8');
  rec('問い合わせ先が載っているか', !/決めしだい/.test(contact), '運営者が問い合わせ先を決めたら contact.html に書く', '目標');
}

/* ---------- 結果 ---------- */
const lines = [];
lines.push('公開前の検査　' + new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }) + '（日本時間）');
lines.push((TEST ? '試験モード' : '本番') + '：生まれ年 ' + YEARS.length + '年分 × ' + N + '人 = ' + sim.lives + '人分の人生（' + secs + '秒）。1000〜1974年生まれは ' + OLD_YEARS.length + '年分（1799年以前は' + oldN(1000) + '人、1800年からは' + OLD_N0 + '人ずつ）で計 ' + old.lives + '人分（' + oldSecs + '秒）');
lines.push('');
for (const r of results) lines.push((r.ok ? '合格　' : (r.kind === '目標' ? '未達　' : '不合格')) + '　' + r.name + (r.detail ? '　…　' + r.detail : ''));
const fails = results.filter(r => !r.ok && r.kind !== '目標');
lines.push('');
lines.push(fails.length ? '不合格が ' + fails.length + ' 件あるため、公開できません。' : 'すべて合格。公開できます。');
const out = lines.join('\n');
console.log(out);
fs.mkdirSync(path.join(ROOT, 'logs'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'logs', 'check-report.txt'), '﻿' + out + '\n');
process.exit(fails.length ? 1 : 0);
