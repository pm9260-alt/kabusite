import { MED_SOURCES } from './history-medieval.mjs';
// 1800〜1974年生まれのための決まりごと（旧国と今の都道府県の対応・身分・大きな町）
// 数字の出どころは HISTORY_SOURCES に書く。確かめきれない部分は est: true にして画面に「推計」の印を出す。

// 旧国 → 今の都道府県（重みは旧国の中で今の県に入る人の割合の目安。2つ以上の県にまたがる国だけ分ける）
// subs は明治元年（1868年）に分かれた国。1868年より前の生まれは親の国（陸奥・出羽）で抽選し、県は分かれた後の国の人口で決める
export const PROVINCES = [
  { name: '山城', region: '畿内', prefs: { 26: 1 }, city: { name: '京都', share: 0.62 } },
  { name: '大和', region: '畿内', prefs: { 29: 1 }, one: true },
  { name: '河内', region: '畿内', prefs: { 27: 1 } },
  { name: '和泉', region: '畿内', prefs: { 27: 1 } },
  { name: '摂津', region: '畿内', prefs: { 27: 0.7, 28: 0.3 }, city: { name: '大坂', share: 0.45 } },
  { name: '伊賀', region: '東海道', prefs: { 24: 1 } },
  { name: '伊勢', region: '東海道', prefs: { 24: 1 } },
  { name: '志摩', region: '東海道', prefs: { 24: 1 } },
  { name: '尾張', region: '東海道', prefs: { 23: 1 }, city: { name: '名古屋', share: 0.15 } },
  { name: '三河', region: '東海道', prefs: { 23: 1 } },
  { name: '遠江', region: '東海道', prefs: { 22: 1 } },
  { name: '駿河', region: '東海道', prefs: { 22: 1 } },
  { name: '甲斐', region: '東海道', prefs: { 19: 1 }, one: true },
  { name: '伊豆', region: '東海道', prefs: { 22: 0.88, 13: 0.12 } },
  { name: '相模', region: '東海道', prefs: { 14: 1 } },
  { name: '武蔵', region: '東海道', prefs: { 13: 0.55, 11: 0.35, 14: 0.1 }, city: { name: '江戸', share: 0.45, after1868: '東京' } },
  { name: '安房', region: '東海道', prefs: { 12: 1 } },
  { name: '上総', region: '東海道', prefs: { 12: 1 } },
  { name: '下総', region: '東海道', prefs: { 12: 0.7, '08': 0.3 } },
  { name: '常陸', region: '東海道', prefs: { '08': 1 } },
  { name: '近江', region: '東山道', prefs: { 25: 1 }, one: true },
  { name: '美濃', region: '東山道', prefs: { 21: 1 } },
  { name: '飛騨', region: '東山道', prefs: { 21: 1 } },
  { name: '信濃', region: '東山道', prefs: { 20: 1 }, one: true },
  { name: '上野', region: '東山道', prefs: { 10: 1 }, one: true },
  { name: '下野', region: '東山道', prefs: { '09': 1 }, one: true },
  { name: '陸奥', region: '東山道', subs: ['磐城', '岩代', '陸前', '陸中', '陸奥（明治）'] },
  { name: '磐城', region: '東山道', parent: '陸奥', prefs: { '07': 0.75, '04': 0.25 } },
  { name: '岩代', region: '東山道', parent: '陸奥', prefs: { '07': 1 } },
  { name: '陸前', region: '東山道', parent: '陸奥', prefs: { '04': 0.9, '03': 0.1 }, city: { name: '仙台', share: 0.1 } },
  { name: '陸中', region: '東山道', parent: '陸奥', prefs: { '03': 0.9, '05': 0.1 } },
  { name: '陸奥（明治）', kuni: '陸奥', region: '東山道', parent: '陸奥', statusKey: '陸奥', prefs: { '02': 1 } },
  { name: '出羽', region: '東山道', subs: ['羽前', '羽後'] },
  { name: '羽前', region: '東山道', parent: '出羽', prefs: { '06': 1 }, one: true },
  { name: '羽後', region: '東山道', parent: '出羽', prefs: { '05': 0.9, '06': 0.1 } },
  { name: '若狭', region: '北陸道', prefs: { 18: 1 } },
  { name: '越前', region: '北陸道', prefs: { 18: 1 } },
  { name: '加賀', region: '北陸道', prefs: { 17: 1 }, city: { name: '金沢', share: 0.3 } },
  { name: '能登', region: '北陸道', prefs: { 17: 1 } },
  { name: '越中', region: '北陸道', prefs: { 16: 1 }, one: true },
  { name: '越後', region: '北陸道', prefs: { 15: 1 } },
  { name: '佐渡', region: '北陸道', prefs: { 15: 1 } },
  { name: '丹波', region: '山陰道', prefs: { 26: 0.6, 28: 0.4 } },
  { name: '丹後', region: '山陰道', prefs: { 26: 1 } },
  { name: '但馬', region: '山陰道', prefs: { 28: 1 } },
  { name: '因幡', region: '山陰道', prefs: { 31: 1 } },
  { name: '伯耆', region: '山陰道', prefs: { 31: 1 } },
  { name: '出雲', region: '山陰道', prefs: { 32: 1 } },
  { name: '石見', region: '山陰道', prefs: { 32: 1 } },
  { name: '隠岐', region: '山陰道', prefs: { 32: 1 } },
  { name: '播磨', region: '山陽道', prefs: { 28: 1 } },
  { name: '美作', region: '山陽道', prefs: { 33: 1 } },
  { name: '備前', region: '山陽道', prefs: { 33: 1 } },
  { name: '備中', region: '山陽道', prefs: { 33: 1 } },
  { name: '備後', region: '山陽道', prefs: { 34: 1 } },
  { name: '安芸', region: '山陽道', prefs: { 34: 1 } },
  { name: '周防', region: '山陽道', prefs: { 35: 1 } },
  { name: '長門', region: '山陽道', prefs: { 35: 1 } },
  { name: '紀伊', region: '南海道', prefs: { 30: 0.8, 24: 0.2 } },
  { name: '淡路', region: '南海道', prefs: { 28: 1 } },
  { name: '阿波', region: '南海道', prefs: { 36: 1 }, one: true },
  { name: '讃岐', region: '南海道', prefs: { 37: 1 }, one: true },
  { name: '伊予', region: '南海道', prefs: { 38: 1 }, one: true },
  { name: '土佐', region: '南海道', prefs: { 39: 1 }, one: true },
  { name: '筑前', region: '西海道', prefs: { 40: 1 } },
  { name: '筑後', region: '西海道', prefs: { 40: 1 } },
  { name: '豊前', region: '西海道', prefs: { 40: 0.6, 44: 0.4 } },
  { name: '豊後', region: '西海道', prefs: { 44: 1 } },
  { name: '肥前', region: '西海道', prefs: { 41: 0.5, 42: 0.5 } },
  { name: '肥後', region: '西海道', prefs: { 43: 1 }, one: true },
  { name: '日向', region: '西海道', prefs: { 45: 0.85, 46: 0.15 } },
  { name: '大隅', region: '西海道', prefs: { 46: 1 } },
  { name: '薩摩', region: '西海道', prefs: { 46: 1 } },
  { name: '壱岐', region: '西海道', prefs: { 42: 1 } },
  { name: '対馬', region: '西海道', prefs: { 42: 1 } },
  { name: '蝦夷・松前', kuni: '蝦夷地', region: '蝦夷地', prefs: { '01': 1 }, statusKey: '渡島' }
];

// 1872年より前の身分の割合（全国の目安）。
// 士族・卒族・僧・旧神官は明治5年の壬申戸籍（1872年）の割合。平民の中の百姓と町人は明治6年の職業別人口（農79%・工4%・商7%・雑業9%・雇人2%）から、
// 農は百姓、工・商・雇人は町人、雑業は半分ずつに分けた（推計）。
// 被差別身分（えた・ひにん）は1871年の解放令の時点で28万人あまり（Wikipedia「穢多」）で、総人口3,300万人の約0.9%。地域の差は数字がないため全国同じ割合にした（推計）
export const STATUS = {
  bushi: { name: '武士', note: '武士の家（足軽などを含む）' },
  hyakusho: { name: '百姓', note: '村に住む百姓の家（田畑のほか漁業や山の仕事も含む）' },
  chonin: { name: '町人', note: '町に住む職人や商人の家' },
  priest: { name: '寺や神社', note: '寺の僧や神社の神職の家' },
  outcast: { name: '被差別身分', note: 'えた・ひにんとされ、住む場所や仕事、つき合いを厳しく制限された人々の家' },
  ainu: { name: 'アイヌ', note: '蝦夷地に古くから暮らすアイヌの人々' },
  ryukyuShi: { name: '琉球の士', note: '琉球王国の士（さむれー）の家' },
  ryukyuHyakusho: { name: '琉球の百姓', note: '琉球王国の村に住む百姓の家' },
  // 1000〜1599年だけに出る身分（1600年からは江戸時代の身分に入れる）
  kuge: { name: '貴族', note: '朝廷に仕える公家（貴族）の家' },
  genin: { name: '下人', note: '主人の家に仕え、譲られたり売り買いされたりすることもあった下人・所従の家' },
  satsumon: { name: '擦文文化の人々', note: '1199年までの北海道で擦文文化を営んだ人々（アイヌの人々の祖先にあたる）' },
  gusuku: { name: 'グスク時代の島の人々', note: '琉球王国ができる（1429年）より前の沖縄の島々の人々' }
};
// 中世の大きな町（その年に町としてあったものだけ）。江戸・大坂などは from の年から
export const MED_CITIES = {
  相模: { name: '鎌倉', from: 1185, to: 1333, share: 0.2 },
  筑前: { name: '博多', from: 1000, share: 0.1 },
  和泉: { name: '堺', from: 1400, to: 1615, share: 0.25 },
  大和: { name: '奈良', from: 1000, share: 0.1 }
};
export const CITY_FROM = { 江戸: 1603, 大坂: 1583, 名古屋: 1610, 金沢: 1583, 仙台: 1601 };
export const OUTCAST_SHARE = 0.009;

// 1846年の幕府の調査は武士などを数えていないため、旧国ごとに「1873年の本籍人口 ÷ 1846年の調査人口」で補う（推計）
// 江戸・大坂・京都などの大きな町の割合（旧国の中で）は、江戸およそ100万人などの一般に知られた目安（推計）

export const HISTORY_SOURCES = {
  edoPop: { name: '江戸時代の全国国別人口（幕府の人口調査、速水融「江戸時代全国国別人口表」による）', org: 'Wikipedia「江戸時代の日本の人口統計」より' },
  jinshin: { name: '壬申戸籍と明治6年の族籍・職業別人口', org: 'Wikipedia「壬申戸籍」より（『国勢調査以前日本人口統計集成』）' },
  edoLife: { name: '宗門改帳などから推計した江戸時代の村の平均余命と乳児死亡率', org: 'Wikipedia「江戸時代の日本の人口統計」より（鬼頭宏、長澤克重、木下太志ほか）' },
  ezo: { name: '蝦夷地・松前藩の和人とアイヌの人口', org: 'Wikipedia「江戸時代の日本の人口統計」より（葭田光三ほか）' },
  ryukyu: { name: '鹿児島藩・琉球の人口と身分の構成', org: 'Wikipedia「江戸時代の日本の人口統計」より' },
  ipss: { name: '人口統計資料集（2025年版）', org: '国立社会保障・人口問題研究所' },
  gakusei: { name: '学制百年史 資料編（学齢児童数および就学児童数・中学校・高等女学校）', org: '文部科学省' },
  terakoya: { name: '寺子屋と識字（1877年の滋賀県の自署率 男89%・女39%）', org: 'Wikipedia「寺子屋」より' },
  owid: { name: '日本の平均寿命（1865年〜）と5歳までに亡くなる割合', org: 'Our World in Data' },
  clio: { name: '日本の物価の上がり幅（Zwart 2015）', org: 'Clio Infra' },
  maddison: { name: '1人あたりの国内総生産（Maddison Project Database）', org: 'Our World in Data' },
  outcast: { name: '解放令（1871年）の時点の穢多の人数', org: 'Wikipedia「穢多」より' },
  ...MED_SOURCES
};
