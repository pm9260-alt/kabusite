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
// 1800〜1974年生まれ（昔の人生の進め方）。本番は5年おき、試験モードは5つの年
const OLD_YEARS = TEST ? [1800, 1850, 1900, 1940, 1970] : Array.from({ length: 35 }, (_, i) => 1800 + i * 5);
const OLD_N = TEST ? 200 : 600;
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
  // 1800〜1974年生まれの文（2026-10-16 に検査の対象から漏れていたため追加）
  for (const s of H.scenes) out.push(['昔の場面', s.t]);
  for (const r of H.timeline) out.push(['昔の年表 ' + r.y, r.t]);
  for (const c of H.eraContext) out.push(['時代のようす', c.t]);
  for (const e of H.events) out.push(['昔の出来事 ' + e.id, [e.title, e.text, e.deadText, e.note, e.src.name].join(' ')]);
  for (const m of H.moves) out.push(['移り住む ' + m.id, m.text + ' ' + m.place]);
  for (const k of Object.keys(H.status)) out.push(['身分 ' + k, H.status[k].name + ' ' + H.status[k].note]);
  for (const f of ['index.html', 'about.html', 'js/app.js', 'js/engine.js', 'js/history.js', 'js/avatar.js']) {
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
  const REAL_OK = ['関東大震災', '東京大空襲'];
  const T0 = T.map(([w, t]) => [w, REAL_OK.reduce((x, k) => x.split(k).join(''), t)]);
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
    [/border-left\s*:/i, '枠の左側だけの色付け'], [/serif|mincho|明朝/i, '明朝体']
  ];
  const f = forbid.filter(([re]) => re.test(css.replace(/sans-serif/gi, ''))).map(([, n]) => n);
  rec('使わないもの（グラデーション・影・ぼかし・下線・左側だけの色・明朝）がないか', f.length === 0, f.join('、'));
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
const sim = { lives: 0, catAll: {}, catPre: {}, empty: 0, dupe: 0, contra: [], yearOut: [], univ: { s: 0, n: 0, t: 0 }, life: { s: 0, n: 0, t: 0 }, marr: { s: 0, n: 0, t: 0 }, nonreg: { s: 0, n: 0, t: 0 }, muniHit: {} };
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
    for (const [y, nr] of Object.entries(L.stats.nonreg)) if (+y <= 2025) { sim.nonreg.n++; sim.nonreg.s += nr ? 1 : 0; sim.nonreg.t += E.val(C.nat.nonreg, +y) / 100; }
  }
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
rec('時代の場面が15%以上か（' + LAST_YEAR + '年までの年で数える）', share(sim.catPre, '時代') >= 0.15, (share(sim.catPre, '時代') * 100).toFixed(1) + '%（2027年以降も含めると ' + (share(sim.catAll, '時代') * 100).toFixed(1) + '%）');
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

/* ---------- 5. 1800〜1974年生まれ ---------- */
{
  const noSrc = H.events.filter(e => !e.src || !e.src.name);
  rec('昔の出来事の全件に根拠があるか', noSrc.length === 0, noSrc.map(e => e.id).join('、'));
  const badRate = H.events.flatMap(e => Object.entries(e.rates).flatMap(([y, r]) => Object.entries(r).filter(([, v]) => !(v >= 0 && v < 0.6)).map(([k, v]) => e.id + ' ' + y + ' ' + k + '=' + v)));
  rec('昔の出来事の亡くなる割合が0〜60%の中か', badRate.length === 0, badRate.slice(0, 5).join('、'));
  const badScene = H.scenes.filter(s => !s.t || !s.cat || !s.a || (s.y && s.y[0] > s.y[1]) || CATS_OK.indexOf(s.cat) < 0);
  rec('昔の場面の書き方が正しいか', badScene.length === 0, badScene.slice(0, 5).map(s => (s.t || '').slice(0, 15)).join('、'));
  const tlY = new Set(H.timeline.map(r => r.y));
  const ctxMiss = [];
  for (let y = 1800; y <= 1974; y++) if (!tlY.has(y) && !H.eraContext.some(c => y >= c.from && y <= c.to)) ctxMiss.push(y);
  rec('1800〜1974年の「その年の世の中」が空の年がないか', ctxMiss.length === 0, ctxMiss.join('、'));
}
const old = { lives: 0, err: [], badText: [], contra: [], jp: [], empty: 0, years: 0, q0: { s: 0, n: 0, t: 0 }, elem: { s: 0, n: 0, t: 0 }, hs: { s: 0, n: 0, t: 0 }, marr: { s: 0, n: 0, t: 0 }, prov: {}, pref: {} };
const t1 = Date.now();
const JP_SCENES = new Set(H.scenes.filter(s => s.jp).map(s => s.t));
for (const by of OLD_YEARS) {
  for (let i = 0; i < OLD_N; i++) {
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
  try { const L = O.autoRun(O.newLife(C, H, P[pref], { year: 1820, seed: 12345, birth: { prov: n, sub: p.subs ? p.subs[0] : null, pref } })); if (L.alive) forcedOld.push(n); } catch (e) { forcedOld.push(n + '（' + e.message + '）'); }
}
for (const c of Object.keys(P)) {
  if (old.pref[c]) continue;
  try { const b = { prov: null, sub: null, pref: c }; const cand = Object.keys(H.prov).find(n => !H.prov[n].subs && H.prov[n].prefs && H.prov[n].prefs[c]); b.prov = H.prov[cand].parent || cand; b.sub = H.prov[cand].parent ? cand : null; const L = O.autoRun(O.newLife(C, H, P[c], { year: 1930, seed: 54321, birth: b })); if (L.alive) forcedOld.push(c); } catch (e) { forcedOld.push(c + '（' + e.message + '）'); }
}
const oldSecs = ((Date.now() - t1) / 1000).toFixed(0);
rec('1800〜1974年生まれの人生が止まらずに最後まで動くか', old.err.length === 0 && forcedOld.length === 0, old.err.slice(0, 5).concat(forcedOld.slice(0, 5)).join('、') || old.lives + '人分（' + oldSecs + '秒）。抽選で選ばれなかった旧国・都道府県も1人ずつ回した');
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

/* ---------- 6. 本家から取り入れた仕組み ---------- */
// A：節目の問いかけ（5・15・30・50・70歳）。その年齢まで生きた人生ではすべて止まり、それより前に亡くなれば出ない
{
  const bad = [];
  const run = (M, L) => {
    const asked = [];
    let g = 0;
    while (L.alive && g++ < 130) {
      let r = M.step(L);
      while (r && r.branch) { if (r.branch.ask) { asked.push(r.age); if (!r.branch.q) bad.push('問いの文がない'); } r = M.resolve(L, r.branch.ask ? { text: 'テスト' } : null); }
    }
    const want = E.ASK_AGES.filter(x => x <= L.deathAge);
    if (asked.join(',') !== want.join(',')) bad.push(L.by + '年生まれ（' + L.deathAge + '歳）：' + asked.join(',') + ' / 期待 ' + want.join(','));
    if ((L.notes || []).filter(n => n.text).length !== want.length) bad.push('書いた一行が残っていない');
  };
  for (let i = 0; i < 60; i++) {
    const by = [1980, 1990, 2000][i % 3];
    run(E, E.newLife(C, P[E.pickPref(C, by, E.makeRng(i + 1))], { year: by, seed: i * 97 + 3 }));
    const oy = 1800 + (i * 29) % 175, b = O.pickBirth(C, H, oy, E.makeRng(i + 5));
    run(O, O.newLife(C, H, P[b.pref] || null, { year: oy, seed: i * 89 + 7, birth: b }));
  }
  rec('A 節目の問いかけが5・15・30・50・70歳で止まり、書いた一行が残るか', bad.length === 0, bad.slice(0, 5).join('、') || '120人分');
  const qs = new Set();
  for (let i = 0; i < 400; i++) for (const a of E.ASK_AGES) {
    const by = 1800 + (i * 7) % 201;
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
  const pairs = [['TEXT', 'BG'], ['SUB', 'BG'], ['ACCENT', 'BG'], ['TEXT', 'SURF'], ['SUB', 'SURF']];
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
    const oy = 1800 + (i * 17) % 175, os = i * 104729 + 3, ob = O.pickBirth(C, H, oy, E.makeRng(os ^ 0x9e3779b9));
    const mkO = () => O.newLife(C, H, P[ob.pref] || null, { year: oy, seed: os, birth: ob });
    mkO.M = O;
    const c = play(mkO, null, E.makeRng(i + 200));
    const d = play(mkO, c.rec);
    if (c.sig !== d.sig) bad.push(oy + '年（昔の本体）');
  }
  rec('C 同じ種と同じ答えで作り直した人生が元と一致するか', bad.length === 0, bad.join('、') || '20件');
}

/* ---------- 結果 ---------- */
const lines = [];
lines.push('公開前の検査　' + new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }) + '（日本時間）');
lines.push((TEST ? '試験モード' : '本番') + '：生まれ年 ' + YEARS.length + '年分 × ' + N + '人 = ' + sim.lives + '人分の人生（' + secs + '秒）。1800〜1974年生まれは ' + OLD_YEARS.length + '年分 × ' + OLD_N + '人 = ' + old.lives + '人分（' + oldSecs + '秒）');
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
