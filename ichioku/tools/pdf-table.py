# 消防庁などの被害報（PDF）の市区町村別の表を、文字の位置から列に分けて取り出す（作業用。結果は data-src/stats/ に保存する）
# 使い方：python3 tools/pdf-table.py 被害報.pdf 出力.json
#   pdftotext -bbox-layout で文字の位置を取り、単位の行（人・棟・件）の右端を列の位置として、数字を一番近い列に入れる
import re, json, subprocess, sys
src, out = sys.argv[1], sys.argv[2]
html = subprocess.run(['pdftotext', '-bbox-layout', src, '-'], capture_output=True, text=True).stdout
COLS = ['dead', 'missing', 'injured', 'injured_heavy', 'injured_light', 'injured_unknown', 'zenkai', 'hankai', 'ichibu', 'yukaue', 'yukashita', 'public', 'other', 'fire']
PREFS = ['北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県']
num = lambda t: int(t.replace(',', '')) if re.fullmatch(r'[\d,]+', t) else None
result = []
for body in re.findall(r'<page [^>]*>(.*?)</page>', html, re.S):
    words = [(float(a), float(b), float(c), float(d), t) for a, b, c, d, t in re.findall(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">(.*?)</word>', body)]
    rows = {}
    for w in words: rows.setdefault(round(w[1]), []).append(w)
    unit = None
    for y in sorted(rows):
        r = sorted(rows[y])
        if [w[4] for w in r] == ['人'] * 6 + ['棟'] * 7 + ['件']: unit = (y, [w[2] for w in r]); break
    if not unit: continue
    # 行を y でまとめる（市区町村名と数字は少しずれることがある）
    lines = []
    for w in sorted((w for w in words if w[1] > unit[0] + 5), key=lambda w: w[1]):
        if lines and abs(w[1] - lines[-1][0]) <= 6: lines[-1][1].append(w)
        else: lines.append([w[1], [w]])
    pref = None
    for _, ws in lines:
        ws.sort()
        names = [w for w in ws if w[2] < unit[1][0] - 40 and num(w[4]) is None]
        nums = [w for w in ws if num(w[4]) is not None and w[2] > unit[1][0] - 40]
        for n in names:
            if n[4] in PREFS: pref = n[4]
        muni = ''.join(n[4] for n in names if n[4] not in PREFS).replace('※', '')
        if not muni or not pref: continue
        rec = {'pref': pref, 'muni': muni}
        for w in nums:
            i = min(range(len(unit[1])), key=lambda k: abs(unit[1][k] - w[2]))
            if abs(unit[1][i] - w[2]) < 30: rec[COLS[i]] = num(w[4])
        unknown = [w[4] for w in ws if w[4] == '不明']
        if unknown: rec['unknownCells'] = len(unknown)
        result.append(rec)
json.dump(result, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print(len(result), 'rows')
