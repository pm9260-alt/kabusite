// 文末の普通体を丁寧体に直す表（site/js/polite.js の T）を作る。作るときだけ形態素解析 kuromoji を使う（npm i kuromoji@0.1.2）。
// 使い方：node tools/polite-build.js 文の一覧.json  （文の一覧は、たくさんの人生の出来事の文を集めたもの）
const kuromoji = require('kuromoji'), fs = require('fs');
const SP = require('path').join(__dirname, '..', 'data-src') + '/';
const corpus = JSON.parse(fs.readFileSync(process.argv[2] || SP + 'corpus.json'));
const ROW = { 'カ': 'き', 'ガ': 'ぎ', 'サ': 'し', 'タ': 'ち', 'ナ': 'に', 'バ': 'び', 'マ': 'み', 'ラ': 'り', 'ワ': 'い' };
function renyo(t) {
  // 動詞の連用形（ます形の前）
  const b = t.basic_form, ty = t.conjugated_type || '';
  if (b === 'する') return 'し'; if (b === '来る' || b === 'くる') return b === 'くる' ? 'き' : '来';
  if (/^一段/.test(ty)) return b.slice(0, -1);
  if (/^サ変/.test(ty)) return b.slice(0, -2) + 'し';
  if (/^カ変/.test(ty)) return b.slice(0, -2) + '来';
  const m = ty.match(/^五段・(.)行/);
  if (m) { if (b === '行く' || b === 'いく') return b.slice(0, -1) + 'き'; const r = ROW[m[1]]; if (r) return b.slice(0, -1) + r; }
  if (/^五段・ラ行特殊/.test(ty)) return b.slice(0, -1) + 'い'; // なさる・くださる
  return null;
}
kuromoji.builder({ dicPath: require.resolve('kuromoji').replace(/src\/kuromoji\.js$/, 'dict') }).build((err, tk) => {
  if (err) throw err;
  const rules = new Map(), conflict = new Set(); let conv = 0, plainLeft = [];
  for (const s0 of corpus) {
    const body = s0.replace(/。+$/, ''); if (!body || /[」』）)]$/.test(body)) continue;
    const toks = tk.tokenize(body); const n = toks.length; if (n < 2) continue;
    let polite = null, cut = 0; const L = toks[n - 1], P = toks[n - 2], PP = toks[n - 3];
    // 〜た / 〜だ（音便）
    if (L.pos === '助動詞' && (L.basic_form === 'た' || (L.surface_form === 'だ' && P.pos === '動詞' && /連用タ接続/.test(P.conjugated_form || '')))) {
      if (P.pos === '動詞') { const r = renyo(P); if (r) { polite = r + 'ました'; cut = P.surface_form.length + L.surface_form.length; } }
      else if (P.pos === '助動詞' && P.basic_form === 'ない' && PP && PP.pos === '動詞') { const r = renyo(PP); if (r) { polite = r + 'ませんでした'; cut = PP.surface_form.length + P.surface_form.length + L.surface_form.length; } }
      else if (P.pos === '助動詞' && P.basic_form === 'だ') { polite = 'でした'; cut = P.surface_form.length + L.surface_form.length; }
      else if (P.pos === '形容詞' || (P.pos === '助動詞' && (P.basic_form === 'ない' || P.basic_form === 'たい'))) { polite = P.surface_form + L.surface_form + 'です'; cut = P.surface_form.length + L.surface_form.length; }
      else if (P.pos === '助動詞' && (P.basic_form === 'れる' || P.basic_form === 'られる' || P.basic_form === 'せる' || P.basic_form === 'させる')) { polite = P.surface_form.replace(/.$/, '') + (P.surface_form.slice(-1) === 'れ' || P.surface_form.slice(-1) === 'せ' ? P.surface_form.slice(-1) : '') + 'ました'; polite = P.basic_form.slice(0, -1) + 'ました'; cut = P.surface_form.length + L.surface_form.length; }
    }
    // 〜いる（〜ている）・動詞の言い切り
    else if (L.pos === '動詞' && L.conjugated_form === '基本形') { const r = renyo(L); if (r) { polite = r + 'ます'; cut = L.surface_form.length; } }
    else if (L.pos === '助動詞' && L.basic_form === 'ない' && P.pos === '動詞') { const r = renyo(P); if (r) { polite = r + 'ません'; cut = P.surface_form.length + L.surface_form.length; } }
    else if (L.pos === '助動詞' && L.basic_form === 'だ' && L.surface_form === 'だ') { polite = 'です'; cut = 1; }
    else if (L.pos === '形容詞' && L.conjugated_form === '基本形') { polite = L.surface_form + 'です'; cut = L.surface_form.length; }
    if (!polite) { if (/た$/.test(body)) plainLeft.push(body.slice(-12)); continue; }
    // 表のキー：言い換える部分（足りなければ前の1〜2字を足して一意にする）
    const from = body.slice(body.length - cut);
    const k = from;
    if (rules.has(k) && rules.get(k) !== polite) conflict.add(k); else rules.set(k, polite);
    conv++;
  }
  for (const k of conflict) rules.delete(k);
  const obj = {}; [...rules.keys()].sort().forEach(k => obj[k] = rules.get(k));
  fs.writeFileSync(SP + 'polite.json', JSON.stringify(obj));
  console.log('converted', conv, 'rules', rules.size, 'conflicts', [...conflict].slice(0, 30), 'plainLeft', plainLeft.length, plainLeft.slice(0, 30));
});
