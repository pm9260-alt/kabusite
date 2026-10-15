# 大きな災害の市区町村ごとの被害（死者・行方不明者・全壊）を、消防庁などの公表資料から取り出して
# data-src/stats/disasters.json に保存する。資料は更新されないか年1回の更新のため、作業する側で動かして結果を保存する。
# 使い方：python3 tools/disasters.py
#   PDF は pdftotext（poppler）で文字と位置を取り出す。取り出した数字は、資料の都道府県の小計・合計と照らし合わせ、
#   合わなければ止まる。
import json, os, re, subprocess, sys, urllib.request, html as H

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, 'raw', 'disasters')
OUT = os.path.join(ROOT, 'data-src', 'stats', 'disasters.json')
os.makedirs(CACHE, exist_ok=True)

PREFS = ['北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県']
PCODE = {p: '%02d' % (i + 1) for i, p in enumerate(PREFS)}
Z2H = str.maketrans('０１２３４５６７８９，', '0123456789,')

def fetch(url, name):
    p = os.path.join(CACHE, name)
    if not os.path.exists(p):
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=60) as r, open(p, 'wb') as f: f.write(r.read())
    return p

def text(pdf):
    return subprocess.run(['pdftotext', '-layout', pdf, '-'], capture_output=True, text=True).stdout.translate(Z2H)

def words(pdf):
    h = subprocess.run(['pdftotext', '-bbox-layout', pdf, '-'], capture_output=True, text=True).stdout
    pages = []
    for body in re.findall(r'<page [^>]*>(.*?)</page>', h, re.S):
        pages.append([(float(a), float(b), float(c), float(d), H.unescape(t).translate(Z2H)) for a, b, c, d, t in re.findall(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">(.*?)</word>', body)])
    return pages

num = lambda t: int(t.replace(',', '')) if re.fullmatch(r'\d[\d,]*', t or '') else None

def table_by_units(pdf, page_filter=None):
    """単位の行（人・棟…）の右端を列の位置にし、見出しの文字から列の名前を付けて、行ごとの数字を取り出す"""
    out = []
    for pi, ws in enumerate(words(pdf)):
        rows = {}
        for w in ws: rows.setdefault(round(w[1]), []).append(w)
        unit = None
        for y in sorted(rows):
            r = sorted(rows[y])
            toks = [w[4] for w in r]
            if len(toks) >= 6 and all(t in ('人', '棟', '件', '世帯') for t in toks): unit = (y, r); break
        if not unit: continue
        if page_filter and not page_filter(''.join(w[4] for w in ws)): continue
        ux = [w[2] for w in unit[1]]
        # 見出し：単位の行より上 120 以内の文字を、いちばん近い列に集める
        labels = [''] * len(ux)
        for w in sorted(ws, key=lambda w: (w[1], w[0])):
            if unit[0] - 140 < w[1] < unit[0] - 1 and num(w[4]) is None:
                cx = (w[0] + w[2]) / 2
                i = min(range(len(ux)), key=lambda k: abs(ux[k] - 8 - cx))
                if abs(ux[i] - 8 - cx) < 45: labels[i] += w[4]
        lines = []
        for w in sorted((w for w in ws if w[1] > unit[0] + 4), key=lambda w: w[1]):
            if lines and abs(w[1] - lines[-1][0]) <= 6: lines[-1][1].append(w)
            else: lines.append([w[1], [w]])
        # 数字が単位より左右どちらにずれて並ぶかは資料ごとに違うため、ページの数字のずれの真ん中の値で直す
        diffs = sorted(min((w[2] - u for u in ux), key=abs) for _, l in lines for w in l if num(w[4]) is not None and w[2] > ux[0] - 30)
        shift = diffs[len(diffs) // 2] if diffs else 0
        tol = 0.45 * min(b - a for a, b in zip(ux, ux[1:]))  # 列の間隔の半分弱まで
        pref = None
        # 表の上に「（新潟県）」のような見出しがあれば、それを最初の都道府県にする
        above = ''.join(w[4] for w in sorted(ws, key=lambda w: (w[1], w[0])) if unit[0] - 200 < w[1] < unit[0])
        mk = re.findall(r'[（(](\S{2,4}?[都道府県])[）)]', above)
        if mk and mk[-1] in PREFS: pref = mk[-1]
        for _, l in lines:
            l.sort()
            names = [w for w in l if w[0] < ux[0] - 20 and num(w[4]) is None]
            nums = [w for w in l if num(w[4]) is not None and w[0] > ux[0] - 40]
            label = ''.join(w[4] for w in names).replace(' ', '').replace('※', '')
            mk = re.fullmatch(r'[（(](\S+?)[）)]', label)
            if mk and mk.group(1) in PREFS: pref = mk.group(1); continue  # 「（長野県）」のような見出し
            for p in PREFS:
                if label.startswith(p): pref = p; label = label[len(p):]
            # 市区町村名・小計の形でない行（表の注記など）は使わない
            if label and label != '__pref__' and not re.fullmatch(r'\S{1,10}(市|町|村|区|小計|計)', label): continue
            if not label and names and ''.join(w[4] for w in names) in PREFS: label = '__pref__'
            if not label or not pref: continue
            rec = {'pref': pref, 'name': label, 'cols': {}}
            for w in nums:
                i = min(range(len(ux)), key=lambda k: abs(ux[k] + shift - w[2]))
                if abs(ux[i] + shift - w[2]) < tol: rec['cols'][labels[i] or str(i)] = num(w[4])
            out.append(rec)
    return out

def col(rec, key):
    for k, v in rec['cols'].items():
        if key in k: return v
    return 0

def pref_table(pdf, page_filter=None):
    """都道府県ごとの表：{都道府県: {dead, missing, zenkai}}"""
    o = {}
    for r in table_by_units(pdf, page_filter):
        if r['name'] != '__pref__' and r['name'] not in ('', ): continue
        o.setdefault(PCODE[r['pref']], {'dead': col(r, '死者'), 'missing': col(r, '不明'), 'zenkai': col(r, '全壊')})  # 最初の表だけを使う
    return o

def breakdown(block):
    """《死者の内訳》の文から {(都道府県, 市町村): 人数} を作る。数字のない市町村は1人"""
    block = block.translate(Z2H)
    block = re.sub(r'【うち[^】]*】|（うち[^）]*）|\(うち[^)]*\)', '', block)
    block = re.sub(r'【災害関連死者】', '', block)
    o = {}
    pref = None
    for part in re.split(r'(【[^】]+】)', block):
        m = re.fullmatch(r'【\s*([^】]+?)\s*】', part)
        if m:
            p = m.group(1).replace(' ', '').replace('　', '')
            pref = p if p in PREFS else None
            continue
        if not pref: continue
        # 「2人（東広島市）」のように、県の人数のあとに市町村名だけが並ぶ書き方では、残りの人数を数字のない市町村に入れる
        total = re.match(r'\s*(\d+)人（', part)
        part = re.sub(r'\d+人（', '（', part)
        items = re.findall(r'([^\s、，,（）()0-9]+?(?:市|町|村|区))\s*(\d+)?\s*(?:人|名)?', part)
        bare = [nm for nm, n in items if not n]
        rest = int(total.group(1)) - sum(int(n) for _, n in items if n) if total else None
        for nm, n in items:
            v = int(n) if n else (rest if (total and len(bare) == 1) else 1)
            o[(pref, nm)] = o.get((pref, nm), 0) + v
    return o

def between(t, start, end_pat):
    i = t.index(start)
    m = re.search(end_pat, t[i + len(start):])
    return t[i + len(start): i + len(start) + (m.start() if m else 2000)]

def check(name, got, want):
    if got != want: sys.exit(f'{name}：取り出した数 {got} が資料の合計 {want} と合わない')

FDMA = 'https://www.fdma.go.jp/disaster/info/'
result = {}

def put(eid, title, sources, census, munis, prefZ=None, notes=None):
    result[eid] = {'title': title, 'sources': sources, 'census': census,
                   'munis': {f'{PCODE[p]}|{n}': v for (p, n), v in munis.items()},
                   'prefZenkai': prefZ or {}, 'notes': notes or []}

# ---------- 東日本大震災（消防庁 第166報、令和8年3月1日現在。市区町村別の表） ----------
pdf = fetch('https://www.fdma.go.jp/disaster/higashinihon/items/166.pdf', 'tohoku166.pdf')
rows = table_by_units(pdf, lambda t: '別紙' in t or '市区町村' in t)
m = {}
sub = {}
for r in rows:
    if r['name'] in ('小計',): sub[r['pref']] = col(r, '死者'); continue
    if r['name'] in ('計', '合計', '__pref__'): continue
    m[(r['pref'], r['name'])] = {'dead': col(r, '死者'), 'missing': col(r, '不明'), 'zenkai': col(r, '全壊')}
for p in sub: check('東日本大震災 ' + p, sum(v['dead'] for (pp, _), v in m.items() if pp == p), sub[p])
check('東日本大震災 全体の死者', sum(v['dead'] for v in m.values()), 19787)
put('quake2011tohoku', '東日本大震災', [{'name': '消防庁 平成23年（2011年）東北地方太平洋沖地震（東日本大震災）の被害状況（第166報、令和8年3月1日現在）', 'url': 'https://www.fdma.go.jp/disaster/higashinihon/items/166.pdf'}], 2010, m,
    notes=['仙台市は市全体の数字だけのため、区には市全体の割合を使う（推計）'])

# ---------- 阪神・淡路大震災（兵庫県 市町被害数値、平成18年5月19日消防庁確定） ----------
p = fetch('https://web.pref.hyogo.lg.jp/kk42/pa20_000000006.html', 'hanshin_hyogo.html')
s = open(p, encoding='utf-8').read()
m = {}
for tr in re.findall(r'<tr.*?</tr>', re.findall(r'<table.*?</table>', s, re.S)[0], re.S):
    c = [H.unescape(re.sub(r'<[^>]+>', '', x)).strip() for x in re.findall(r'<t[dh][^>]*>(.*?)</t[dh]>', tr, re.S)]
    if len(c) == 11 and c[0] not in ('市町名', '合計'):
        n = lambda x: int(x.replace(',', '')) if x else 0
        m[('兵庫県', c[0])] = {'dead': n(c[1]), 'missing': n(c[2]), 'zenkai': n(c[6])}  # 全壊は世帯の数
check('阪神・淡路大震災 死者', sum(v['dead'] for v in m.values()), 6402)
# 神戸市の区ごとの死者（神戸市「阪神・淡路大震災の被害状況」2005年12月22日時点、合計4,571人）。区ごとの全壊は数字待ち
kobe = {'神戸市東灘区': 1470, '神戸市灘区': 934, '神戸市中央区': 243, '神戸市兵庫区': 556, '神戸市長田区': 921, '神戸市須磨区': 399, '神戸市垂水区': 26}
put('quake1995hanshin', '阪神・淡路大震災', [
    {'name': '兵庫県 阪神・淡路大震災の市町被害数値（平成18年5月19日消防庁確定）', 'url': 'https://web.pref.hyogo.lg.jp/kk42/pa20_000000006.html'},
    {'name': '神戸市 阪神・淡路大震災の被害状況（区別の死者、2005年12月22日時点）', 'url': 'https://www.city.kobe.lg.jp/a21572/bosai/shobo/hanshinawaji/higai2.html', 'note': 'この作業環境から神戸市のサイトにつながらないため、検索結果に出た同ページの値を使った。北区・西区は合わせて22人で、区の分け方が確かめられないため、市全体の割合を使う'}],
    1995, m, notes=['神戸市の区の全壊は数字待ち。区の死者は神戸市の資料'])
result['quake1995hanshin']['wards'] = {'28|' + k: {'dead': v} for k, v in kobe.items()}

# ---------- 能登半島地震（消防庁 第123報、令和8年3月31日） ----------
pdf = fetch(FDMA + 'items/b055402cefac7721623c30034b25489118dbec38.pdf', 'noto123.pdf')
t = text(pdf)
bd = breakdown(between(t, '≪死者の内訳≫', r'\(2\)|\n\s*\(\s*2\s*\)|⑵'))
check('能登半島地震 死者', sum(bd.values()), 720)
put('quake2024noto', '能登半島地震', [{'name': '消防庁 令和6年能登半島地震による被害及び消防機関等の対応状況（第123報、令和8年3月31日）', 'url': FDMA + 'items/b055402cefac7721623c30034b25489118dbec38.pdf'}], 2020,
    {k: {'dead': v} for k, v in bd.items()}, pref_table(pdf), ['市町ごとの全壊は資料にないため、県の全壊を死者の割合で分ける（推計）。死者には災害関連死を含む'])

# ---------- 令和8年熊本地震（消防庁 第66報、令和8年10月5日） ----------
pdf = fetch(FDMA + 'items/5995cd83e1266305fb4cf055946ff7b442b3923b.pdf', 'kumamoto2026_66.pdf')
t = text(pdf)
bd = breakdown(between(t, '≪死者の内訳≫', r'災害による負傷|\(2\)|⑵'))
put('quake2026kumamoto', '令和8年熊本地震', [{'name': '消防庁 令和8年熊本地震による被害及び消防機関等の対応状況（第66報、令和8年10月5日）', 'url': FDMA + 'items/5995cd83e1266305fb4cf055946ff7b442b3923b.pdf'}], 2020,
    {k: {'dead': v} for k, v in bd.items()}, pref_table(pdf), ['死者38人のうち市町の分かる36人。市町ごとの全壊は資料にないため、県の全壊を死者の割合で分ける（推計）'])

# ---------- 平成30年7月豪雨（消防庁 第60報） ----------
pdf = fetch(FDMA + 'items/190820nanagatugouu60h.pdf', 'west2018_60.pdf')
t = text(pdf)
bd = breakdown(between(t, '《死者の内訳》', r'《'))
mi = breakdown(between(t, '《行方不明者の内訳》', r'\n\s*\n\s*\n'))
munis = {k: {'dead': v, 'missing': mi.get(k, 0)} for k, v in bd.items()}
for k, v in mi.items(): munis.setdefault(k, {'dead': 0, 'missing': v})
put('flood2018west', '平成30年7月豪雨', [{'name': '消防庁 平成30年7月豪雨及び台風第12号による被害状況及び消防機関等の対応状況（第60報、令和元年8月20日）', 'url': FDMA + 'items/190820nanagatugouu60h.pdf'}], 2015,
    munis, pref_table(pdf), ['市町ごとの全壊は資料にないため、県の全壊を死者の割合で分ける（推計）'])

# ---------- 令和元年東日本台風（消防庁 第67報） ----------
pdf = fetch(FDMA + 'items/taihuu19gou67.pdf', 'hagibis67.pdf')
t = text(pdf)
blk = between(t, '《死者の内訳》', r'《行方不明者の内訳》')
bd = breakdown(blk)
mi = breakdown(between(t, '《行方不明者の内訳》', r'\(2\)|⑵'))
munis = {k: {'dead': v, 'missing': mi.get(k, 0)} for k, v in bd.items()}
put('typhoon2019hagibis', '令和元年東日本台風（台風19号）', [{'name': '消防庁 令和元年東日本台風及び前線による大雨による被害及び消防機関等の対応状況（第67報、令和2年10月13日）', 'url': FDMA + 'items/taihuu19gou67.pdf'}], 2015,
    munis, pref_table(pdf, lambda s: '台風' in s or True), ['市町ごとの全壊は資料にないため、県の全壊を死者の割合で分ける（推計）'])

# ---------- 令和2年7月豪雨（消防庁 第57報） ----------
pdf = fetch(FDMA + 'items/210226_ooame57.pdf', 'kumamoto2020_57.pdf')
t = text(pdf)
bd = breakdown(between(t, '《死者の内訳》', r'《行方不明者の内訳》'))
mi = breakdown(between(t, '《行方不明者の内訳》', r'\n\s*3\s'))
munis = {k: {'dead': v, 'missing': mi.get(k, 0)} for k, v in bd.items()}
put('flood2020kumamoto', '令和2年7月豪雨', [{'name': '消防庁 令和2年7月豪雨による被害及び消防機関等の対応状況（第57報、令和3年11月26日）', 'url': FDMA + 'items/210226_ooame57.pdf'}], 2020,
    munis, pref_table(pdf), ['市町ごとの全壊は資料にないため、県の全壊を死者の割合で分ける（推計）'])

# ---------- 平成30年北海道胆振東部地震（消防庁 第35報） ----------
pdf = fetch(FDMA + 'items/b3ad91b60531fcb1854a444954c7a97a82128a1a.pdf', 'iburi35.pdf')
t = re.sub(r'\s+', '', text(pdf))
d = breakdown('【北海道】' + re.search(r'死者43人（(.*?)）', t).group(1))
z = breakdown('【北海道】' + re.search(r'全壊469棟（(.*?)）', t).group(1).replace('棟', ''))
check('胆振東部地震 死者', sum(d.values()), 43)
check('胆振東部地震 全壊', sum(z.values()), 469)
munis = {k: {'dead': d.get(k, 0), 'zenkai': z.get(k, 0)} for k in set(d) | set(z)}
put('quake2018iburi', '北海道胆振東部地震', [{'name': '消防庁 平成30年北海道胆振東部地震による被害及び消防機関等の対応状況（第35報、令和元年8月20日）', 'url': FDMA + 'items/b3ad91b60531fcb1854a444954c7a97a82128a1a.pdf'}], 2015, munis,
    notes=['札幌市は市全体の数字だけのため、区には市全体の割合を使う（推計）'])

# ---------- 平成26年8月豪雨（広島市の土砂災害、消防庁 第47報） ----------
pdf = fetch(FDMA + 'assets/post755.pdf', 'hiroshima47.pdf')
t = text(pdf)
d = {nm: int(n) for nm, n in re.findall(r'(広島市安佐[南北]区)\s+(\d+)', t.split('物的被害')[0].translate(Z2H))}
z = {nm: int(n) for nm, n in re.findall(r'(広島市安佐[南北]区)\s+(\d+)', t.split('物的被害')[1])}
check('広島市の土砂災害 死者', sum(d.values()), 77)
put('slide2014hiroshima', '広島市の土砂災害', [{'name': '消防庁 8月19日からの大雨等による広島県における被害状況及び消防の活動等について（第47報、平成28年6月24日）', 'url': FDMA + 'assets/post755.pdf'}], 2010,
    {('広島県', k): {'dead': d.get(k, 0), 'zenkai': z.get(k, 0)} for k in d})

# ---------- 平成29年7月九州北部豪雨（消防庁 第77報。死者は《死者の状況》の1件ずつの記録を数えた） ----------
pdf = fetch(FDMA + 'items/b415db68eb0850414c74aca2f164cf3dbda5c43a.pdf', 'kyushu77.pdf')
t = text(pdf)
blk = between(t, '《死者の状況》', r'《行方不明者の状況》')
cnt = {}
cur = None
for line in blk.splitlines():
    mm = re.search(r'<\s*(\S+?(?:市|町|村))\s*>', line)
    if mm: cur = mm.group(1); continue
    mm = re.search(r'・\s*(\d+)名\s*\(\s*([^：:()]+?(?:市|町|村))\s*[：:]', line)
    if mm: cnt[mm.group(2)] = cnt.get(mm.group(2), 0) + int(mm.group(1)); continue
    mm = re.search(r'・\s*(\d+)名', line)
    if mm and cur: cnt[cur] = cnt.get(cur, 0) + int(mm.group(1))
pref_of = {'朝倉市': '福岡県', '東峰村': '福岡県', '日田市': '大分県', '広島市': '広島県', '北広島町': '広島県'}
check('九州北部豪雨 死者', sum(cnt.values()), 42)
munis = {(pref_of[k], k): {'dead': v} for k, v in cnt.items()}
munis[('福岡県', '朝倉市')]['missing'] = 2
put('flood2017kyushu', '平成29年7月九州北部豪雨', [{'name': '消防庁 平成29年6月30日からの梅雨前線に伴う大雨及び台風第3号の被害状況等について（第77報、平成30年10月31日）', 'url': FDMA + 'items/b415db68eb0850414c74aca2f164cf3dbda5c43a.pdf'}], 2015,
    munis, pref_table(pdf), ['市町村ごとの全壊は資料にないため、県の全壊を死者の割合で分ける（推計）'])

# ---------- 平成27年9月関東・東北豪雨（消防庁 台風第18号による大雨等、＜死者の状況＞の記録を数えた） ----------
pdf = fetch(FDMA + 'assets/post793.pdf', 'kinu.pdf')
t = text(pdf)
blk = between(t, '＜死者の状況＞', r'＜重傷者の状況＞')
cnt = {}
pref = None
for line in blk.splitlines():
    mm = re.search(r'【(\S+?)】', line)
    if mm: pref = mm.group(1)
    for nm in re.findall(r'[・･]\s*(\S+?(?:市|町|村))において', line):
        n = 1
        mm2 = re.search(r'災害関連死）\s*(\d+)名', blk) if False else None
        cnt[(pref, nm)] = cnt.get((pref, nm), 0) + n
rel = re.search(r'災害関連死）\s*(\d+)名', blk.translate(Z2H))
if rel: cnt[('茨城県', '常総市')] -= 1; cnt[('茨城県', '常総市')] += int(rel.group(1))
check('関東・東北豪雨 死者', sum(cnt.values()), 20)
put('flood2015kinu', '平成27年9月関東・東北豪雨', [{'name': '消防庁 平成27年台風第18号による大雨等に係る被害状況等について（平成29年10月18日）', 'url': FDMA + 'assets/post793.pdf'}], 2015,
    {k: {'dead': v} for k, v in cnt.items()}, pref_table(pdf), ['市町ごとの全壊は資料にないため、県の全壊を死者の割合で分ける（推計）'])

# ---------- 新潟県中越地震（消防庁 平成21年10月21日更新） ----------
pdf = fetch(FDMA + 'assets/post335.pdf', 'chuetsu.pdf')
t = text(pdf)
d = {}
for nm, n in re.findall(r'^\s*(\S[\s\S]{0,6}?)【死者\s*(\d+)\s*名】', t, re.M):
    nm = nm.replace(' ', '').replace('　', '')
    if nm == '川口町': nm = '長岡市'  # 2010年に長岡市へ編入
    d[nm] = d.get(nm, 0) + int(n)
check('新潟県中越地震 死者', sum(d.values()), 68)
put('quake2004chuetsu', '新潟県中越地震', [{'name': '消防庁 平成16年（2004年）新潟県中越地震（平成21年10月21日更新）', 'url': FDMA + 'assets/post335.pdf'}], 2005,
    {('新潟県', k): {'dead': v} for k, v in d.items()}, {'15': {'zenkai': None}}, ['川口町（今の長岡市）は長岡市に合わせた。全壊は数字待ち'])

# ---------- 新潟県中越沖地震（消防庁 平成25年5月17日更新、被害情報各市町村内訳） ----------
pdf = fetch(FDMA + 'assets/post490.pdf', 'chuetsuoki.pdf')
rows = table_by_units(pdf)
m = {}
for r in rows:
    if r['pref'] != '新潟県' or r['name'].endswith('計') or r['name'] == '__pref__': continue
    m[('新潟県', r['name'])] = {'dead': col(r, '死者'), 'missing': col(r, '不明'), 'zenkai': col(r, '全壊')}
check('新潟県中越沖地震 死者', sum(v['dead'] for v in m.values()), 15)
put('quake2007chuetsuoki', '新潟県中越沖地震', [{'name': '消防庁 平成19年（2007年）新潟県中越沖地震（平成25年5月17日更新）', 'url': FDMA + 'assets/post490.pdf'}], 2005, m)

# ---------- 令和8年8月千葉豪雨（消防庁 第20報、令和8年9月9日） ----------
u = FDMA + 'items/20260813chibagouu20.pdf'
pdf = fetch(u, 'chiba2026_20.pdf')
t = text(pdf)
bd = breakdown(between(t, '＜死者の内訳＞', r'\n\s*\d\s'))
put('flood2026chiba', '令和8年8月千葉豪雨', [{'name': '消防庁 令和8年8月千葉豪雨による被害及び消防機関等の対応状況（第20報、令和8年9月9日）', 'url': u}], 2020,
    {k: {'dead': v} for k, v in bd.items()}, pref_table(pdf), ['市町ごとの全壊は資料にないため、県の全壊を死者の割合で分ける（推計）'])
check('千葉豪雨 死者', sum(bd.values()), result['flood2026chiba']['prefZenkai']['12']['dead'])

# ---------- 令和8年台風第25号・第26号（消防庁 第25報、令和8年10月5日） ----------
u = FDMA + 'items/20260918taihuu25gou25.pdf'
pdf = fetch(u, 'typhoon2026_25.pdf')
t = text(pdf)
bd = breakdown(between(t, '≪死者の内訳≫', r'≪|\n\s*\d\s'))
check('台風25号・26号 死者', sum(bd.values()), 17)
put('typhoon2026', '令和8年台風第25号・第26号', [{'name': '消防庁 令和8年台風第25号、第26号及び前線による大雨被害及び消防機関等の対応状況（第25報、令和8年10月5日）', 'url': u}], 2020,
    {k: {'dead': v} for k, v in bd.items()}, pref_table(pdf), ['市町ごとの全壊は資料にないため、県の全壊を死者の割合で分ける（推計）'])

json.dump(result, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('保存しました：', ', '.join(f"{k}（{len(v['munis'])}市区町村）" for k, v in result.items()))
