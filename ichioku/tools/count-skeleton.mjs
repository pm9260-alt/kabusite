// 一生の骨組み（v18 指示書 11-7）：遊びの中で出せる分かれ道を、一生の節目の区分と時代ごとに数える。
// 数えるもの
//   1. 小さな選択・親の選択（choices.js と s6.js）：出せる年の範囲（y と when.y）で、その時代に出せるものを数える
//   2. 人生の筋（paths.js）：出せる年の範囲で数える
//   3. 物語の分かれ道（story.js）と進め方の本体の分かれ道（engine.js・history.js）：年の条件がコードの中にあるので、人生を回して、実際に出た時代で数える
// 区分は、題・問いの文・答え・id の言葉で決める（下の RULES。上から順に、最初に当てはまった区分）。
// 使い方：node tools/count-skeleton.mjs [--lives 1200] [--quiet]
//   logs/skeleton.md（表）と logs/skeleton.json（数と例）に書く。どの時代も各区分3以上なら「よし」
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.join(ROOT, 'site');
globalThis.self = globalThis;
const E = require(path.join(SITE, 'js', 'engine.js'));
const O = require(path.join(SITE, 'js', 'history.js'));
require(path.join(SITE, 'js', 'story.js'));
const CH = require(path.join(SITE, 'js', 'choices.js'));
const S6 = require(path.join(SITE, 'js', 's6.js'));
const PM = require(path.join(SITE, 'js', 'paths.js'));
const C = JSON.parse(fs.readFileSync(path.join(SITE, 'data', 'common.json'), 'utf8'));
const H = JSON.parse(fs.readFileSync(path.join(SITE, 'data', 'history.json'), 'utf8'));
const P = {};
for (const p of C.prefs) P[p.code] = JSON.parse(fs.readFileSync(path.join(SITE, 'data', 'pref', p.code + '.json'), 'utf8'));

const args = process.argv.slice(2);
const NL = args.includes('--lives') ? +args[args.indexOf('--lives') + 1] : 1200;
const QUIET = args.includes('--quiet');

export const ERAS = [['平安〜1184', 1000, 1184], ['鎌倉', 1185, 1332], ['室町', 1333, 1466], ['戦国', 1467, 1599], ['江戸', 1600, 1867], ['明治〜戦前', 1868, 1945], ['戦後', 1946, 2120]];
export const CATS = ['2歳の気質', '好きなことと趣味', '学ぶ', '働く', '恋と結婚', '子', '住まいと乗り物', 'お金', '体と病', '嗜好', '人とのかかわり', '家族の世話', '飼う動物', '信仰', '引退と老後', '大きな災い'];

// 区分の決まり：[区分, id の決まり, 文の決まり]。上から順に見る
const RULES = [
  ['2歳の気質', /^(_temp|s6\.kishitsu\.)/, null],
  ['飼う動物', /^s6\.sk\.pet\./, /(子犬|子猫|飼い犬|飼い猫|犬を飼|猫を飼|金魚|鈴虫|小鳥を|文鳥|インコ|保護犬|ペット|鶏を飼|飼っている(犬|猫|馬|牛|鶏)|若い鷹|鷹の世話)/],
  ['嗜好', /^s6\.sk\.shiko\./, /(たばこ|煙草|煙管|晩酌|酒盛り|酒を(飲|控|やめ|断)|深酒|酒好き|飲みすぎ|博打|賭場|賭け事|花札|競馬|パチンコ|酔っ)/],
  ['体と病', /^s6\.sk\.yamai\./, /(病|熱|咳|痛|医者|医師|薬|湯治|祈祷|療治|けが|怪我|病院|診て|寝こ|寝込|体の具合|目がかす|腫れ|按摩|鍼|灸)/],
  ['大きな災い', /^s6\.sk\.wazawai\./, /(飢饉|凶作|大水|洪水|大火|火事|地震|津波|噴火|嵐|台風|日照り|干ばつ|戦火|空襲|焼け出|失業|倒産|職を失|首にな|解雇|不作|一揆|打ちこわし|疫病)/],
  ['信仰', /^s6\.sk\.shinko\./, /(参り|詣|巡礼|出家|檀那寺|檀家|寺の役|神社|社の|氏神|講|経を|念仏|題目|仏|神仏|祭り|お札|遍路|教会|宮司|僧|尼)/],
  ['引退と老後', /^s6\.sk\.inkyo\./, /(隠居|家督を譲|家督を継が|定年|引退|退職|老後|余生|年金|身を引)/],
  ['家族の世話', /^s6\.sk\.sewa\./, /(看病|介護|親の世話|面倒を見|寝たきり|親を引き取|実家の|家の修繕|屋根|雨漏り|壁|戸のたてつけ|老いた親|年老いた|看取)/],
  ['子', /^s6\.sk\.ko\./, /(子を|子が|子に|子の|養子|跡取り|里子|授か|身ごも|生まれ|産|孫|息子|娘|\{child\})/],
  ['恋と結婚', /^s6\.sk\.koi\./, /(縁談|見合い|恋|想い|好きにな|祝言|結婚|婿|嫁|離縁|離婚|後添え|再婚|連れ子|夫婦|\{spouse\}|\{en\}|\{enName\})/],
  ['学ぶ', /^s6\.sk\.manabu\./, /(手習い|寺子屋|藩校|私塾|塾|遊学|学校|夜学|大学|勉強|学問|字を|書を|算盤|算術|漢籍|稽古|習う|習い|進学|受験|留学|本を)/],
  ['住まいと乗り物', /^s6\.sk\.sumai\./, /(家を建|建て直|普請|分家|移り住|引っ越|住まい|長屋|借家|家を買|家を借|馬に|馬で|駕籠|舟を|自転車|車を|自動車|バイク|免許|マンション|団地)/],
  ['お金', /^s6\.sk\.kane\./, /(頼母子|無尽|質入|質に|富くじ|宝くじ|借金|金を貸|貸した|借り|請人|保証人|援助|貯え|貯金|蓄え|銭|両|円|株|田を買|田畑を買|売り上げ|仕入れ|値)/],
  ['好きなことと趣味', /^s6\.sk\.shumi\./, /(趣味|好きなこと|和歌|歌合|連歌|俳諧|俳句|囲碁|碁|将棋|釣り|園芸|盆栽|野球|映画|芝居|見物|笛|琴|三味線|踊り|絵|写真|蹴鞠|双六|貝合|花見|月見|相撲|ラジオ|テレビ|歌|楽器|読書|物語)/],
  ['働く', /^s6\.sk\.hataraku\./, /(奉公|弟子入|弟子|家業|暖簾|出世|独立|仕事|勤め|働|職|商い|店|田植|稲刈|漁|網|畑|年貢|役目|主人|番頭|親方|昇進|転職|内職|\{job\})/],
  ['人とのかかわり', /^s6\.sk\.hito\./, /(行き倒れ|旅人|隣|近所|村八分|仲間|恩人|礼|友|\{friend\}|喧嘩|けんか|噂|嘘|約束|頼まれ|助け|見舞|寄り合い|同窓|きょうだい|\{sibOlder\}|\{sibYounger\})/]
];
export function classify(id, text) {
  for (const [cat, idRe] of RULES) if (idRe && idRe.test(id || '')) return cat;
  for (const [cat, , re] of RULES) if (re && re.test(text || '')) return cat;
  return 'その他';
}
const eraIdx = y => ERAS.findIndex(e => y >= e[1] && y <= e[2]);
function erasOf(y0, y1) { const out = []; ERAS.forEach((e, i) => { if (y0 <= e[2] && y1 >= e[1]) out.push(i); }); return out; }

export function countSkeleton(nLives = NL, log = () => {}) {
  const items = new Map(); // key -> { cat, eras:Set, src, ex }
  const add = (key, cat, eras, src, ex) => {
    if (!items.has(key)) items.set(key, { cat, eras: new Set(), src, ex });
    for (const e of eras) items.get(key).eras.add(e);
  };
  // 1 小さな選択・親の選択
  const seen = new Set();
  const all = CH.list.concat(S6.choices.filter(o => !CH.list.some(x => x.id === o.id)));
  for (const o of all) {
    if (seen.has(o.id) || /^s6\.fb\./.test(o.id)) continue; seen.add(o.id);
    const w = o.when || {}, y0 = Math.max(o.y[0], (w.y || [0])[0]), y1 = Math.min(o.y[1], (w.y || [0, 9999])[1]);
    // 2歳の気質は2歳の子にだけ出る（親の選択の a に2を含むもの）
    const t = [].concat(o.text).join('') + o.options.map(p => p.l).join('');
    add('c:' + o.id, classify(o.id, t), erasOf(y0, y1), o.s6 || /^s6\./.test(o.id) ? 's6' : 'choices', [].concat(o.text)[0]);
  }
  // 2 人生の筋
  for (const p of PM.list) add('p:' + p.id, classify('path:' + p.id, p.title + p.text + (p.opts || []).map(x => x.l).join('')), erasOf(p.y[0], p.y[1]), 'paths', p.title);
  // 3 物語と本体の分かれ道（人生を回して実際に出た時代）
  const PID = new Set(PM.list.map(p => p.id));
  for (let i = 0; i < nLives; i++) {
    const by = 1000 + (i * 37) % 1001, seed = ((i + 1) * 7919 + 11) >>> 0;
    let L;
    if (by >= 1975) L = E.newLife(C, P[E.pickPref(C, by, E.makeRng(seed ^ 0x9e3779b9))], { year: by, seed });
    else { const b0 = O.pickBirth(C, H, by, E.makeRng(seed ^ 0x9e3779b9)); L = O.newLife(C, H, P[b0.pref] || null, { year: by, seed, birth: b0 }); }
    const M = L.old ? O : E; let g = 0;
    while (L.alive && g++ < 130) {
      let r = M.step(L);
      while (r && r.branch) {
        const br = r.branch;
        if (!br.ask) {
          const cid = (br.d || {}).cid;
          let key = null;
          if (br.sid === 'choice') { if (cid && /^_/.test(cid)) key = 'c:' + cid; }
          else if (br.sid && PID.has(br.sid)) key = null;
          else key = (br.id === 'story' ? 's:' + (br.sid || br.title) : 'e:' + (br.id || br.title));
          if (key) {
            const t = (br.title || '') + (br.groups || []).map(gr => (gr.q || '') + (gr.options || []).map(o => o.l).join('')).join('');
            add(key, classify(key.slice(2), t), [eraIdx(L.year)], key[0] === 's' ? 'story' : key[0] === 'c' ? 'choices' : 'engine', br.title + '：' + ((br.groups || [])[0] || {}).q);
          }
        }
        r = M.resolve(L, br.ask ? { text: '' } : null);
      }
    }
    if (i % 200 === 199) log((i + 1) + '人');
  }
  const table = CATS.map(cat => ERAS.map((e, ei) => [...items.values()].filter(x => x.cat === cat && x.eras.has(ei)).length));
  const other = ERAS.map((e, ei) => [...items.values()].filter(x => x.cat === 'その他' && x.eras.has(ei)).length);
  const low = [];
  CATS.forEach((cat, ci) => ERAS.forEach((e, ei) => { if (table[ci][ei] < 3) low.push(e[0] + '・' + cat + '（' + table[ci][ei] + '）'); }));
  return { eras: ERAS.map(e => e[0]), cats: CATS, table, other, low, total: items.size, lives: nLives, items };
}

function toMd(r) {
  let s = '# 一生の骨組み（区分ごと・時代ごとの分かれ道の数）\n\n';
  s += '作った日：' + new Date().toISOString().slice(0, 10) + '。数えたもの：小さな選択・親の選択（choices.js・s6.js）と人生の筋（paths.js）は出せる年の範囲から、物語と本体の分かれ道は ' + r.lives + ' 人の人生を回して実際に出た時代から。分かれ道は全部で ' + r.total + '。\n\n';
  s += '| 区分 | ' + r.eras.join(' | ') + ' |\n|' + '---|'.repeat(r.eras.length + 1) + '\n';
  r.cats.forEach((c, ci) => { s += '| ' + c + ' | ' + r.table[ci].map(v => v < 3 ? '**' + v + '**' : String(v)).join(' | ') + ' |\n'; });
  s += '| （どの区分にも入らない） | ' + r.other.join(' | ') + ' |\n\n';
  s += r.low.length ? '3に満たない所：' + r.low.join('、') + '\n' : 'どの時代も、各区分3以上。\n';
  return s;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = countSkeleton(NL, QUIET ? () => {} : m => console.error(m));
  fs.mkdirSync(path.join(ROOT, 'logs'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'logs', 'skeleton.md'), toMd(r));
  const ex = {};
  for (const [k, v] of r.items) { const kk = v.cat; (ex[kk] = ex[kk] || []).length < 400 && ex[kk].push({ key: k, src: v.src, eras: [...v.eras].map(i => ERAS[i][0]), ex: String(v.ex || '').slice(0, 60) }); }
  fs.writeFileSync(path.join(ROOT, 'logs', 'skeleton.json'), JSON.stringify({ eras: r.eras, cats: r.cats, table: r.table, other: r.other, low: r.low, total: r.total, lives: r.lives, items: ex }, null, 1));
  console.log(toMd(r));
}
