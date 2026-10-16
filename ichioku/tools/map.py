# 日本地図（都道府県の形と、市区町村の地図上の位置）を作り、site/data/map.json に保存する。
# 使い方：python3 -I tools/map.py
#   もとは国土交通省「国土数値情報（行政区域データ）」2025年1月1日時点。都道府県ごとの zip を raw/map に保存し、2回目からは保存したものを使う。
#   市区町村の位置は、その市区町村のいちばん大きな陸地の中の1点（代表点）。沖縄県と小笠原村は、地図の空いている所に移して描く。
import json, math, os, re, sys, urllib.request, zipfile

try:
    from shapely.geometry import shape, Polygon, MultiPolygon
    from shapely.ops import unary_union
except ImportError:
    sys.exit('shapely が必要（pip install shapely）')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, 'raw', 'map')
OUT = os.path.join(ROOT, 'site', 'data', 'map.json')
STATS = os.path.join(ROOT, 'data-src', 'stats', 'stats.json')
os.makedirs(CACHE, exist_ok=True)

# 地図の投影：経度は北緯37度の縮み方に合わせ、1度を S の単位にする
S = 22.0
K = math.cos(math.radians(37))
LON0, LAT0 = 127.6, 45.7
# 移して描く地域：（どの市区町村か, 経度のずれ, 緯度のずれ, 囲みの枠）
OKI_SHIFT = (5.6, 15.0)
OGA_SHIFT = (-1.6, 4.6)


def proj(lon, lat, shift=(0, 0)):
    return ((lon + shift[0] - LON0) * K * S, (LAT0 - lat - shift[1]) * S)


def fetch(pc):
    p = os.path.join(CACHE, 'N03_%s.zip' % pc)
    if not os.path.exists(p):
        url = 'https://nlftp.mlit.go.jp/ksj/gml/data/N03/N03-2025/N03-20250101_%s_GML.zip' % pc
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=300) as r, open(p, 'wb') as f: f.write(r.read())
    with zipfile.ZipFile(p) as z:
        name = next(n for n in z.namelist() if n.endswith('.geojson'))
        return json.loads(z.read(name))


def transform(geom, shift, keep=None):
    def ring(cs):
        return [proj(x, y, shift) for x, y in cs]
    polys = [geom] if geom.geom_type == 'Polygon' else list(geom.geoms)
    out = []
    for pg in polys:
        if keep and not keep(pg): continue
        out.append(Polygon(ring(pg.exterior.coords), [ring(h.coords) for h in pg.interiors]))
    return MultiPolygon(out) if out else None


def path_of(geom, tol, min_area):
    geom = geom.simplify(tol, preserve_topology=True)
    polys = [geom] if geom.geom_type == 'Polygon' else list(getattr(geom, 'geoms', []))
    parts = []
    for pg in polys:
        if pg.is_empty or pg.area < min_area: continue
        cs = list(pg.exterior.coords)[:-1]
        if len(cs) < 3: continue
        d = 'M' + 'L'.join('%.1f %.1f' % c for c in cs) + 'Z'
        parts.append(d.replace('.0 ', ' ').replace('.0L', 'L').replace('.0Z', 'Z'))
    return ''.join(parts)


# 旧国のピンの場所の目安：その旧国にある今の主な市町村（多くは昔の国府や城下町のあたり）。蝦夷地は北海道の中ほどに置く
PROV = {
    '山城': ('26', '京都市中京区'), '大和': ('29', '奈良市'), '河内': ('27', '東大阪市'), '和泉': ('27', '岸和田市'), '摂津': ('27', '大阪市北区'),
    '伊賀': ('24', '伊賀市'), '伊勢': ('24', '津市'), '志摩': ('24', '志摩市'), '尾張': ('23', '名古屋市中区'), '三河': ('23', '岡崎市'),
    '遠江': ('22', '浜松市'), '駿河': ('22', '静岡市葵区'), '甲斐': ('19', '甲府市'), '伊豆': ('22', '伊豆の国市'), '相模': ('14', '小田原市'),
    '武蔵': ('13', '府中市'), '安房': ('12', '館山市'), '上総': ('12', '市原市'), '下総': ('12', '佐倉市'), '常陸': ('08', '水戸市'),
    '近江': ('25', '大津市'), '美濃': ('21', '岐阜市'), '飛騨': ('21', '高山市'), '信濃': ('20', '松本市'), '上野': ('10', '前橋市'),
    '下野': ('09', '宇都宮市'), '陸奥': ('04', '仙台市青葉区'), '磐城': ('07', 'いわき市'), '岩代': ('07', '会津若松市'), '陸前': ('04', '仙台市青葉区'),
    '陸中': ('03', '盛岡市'), '陸奥（明治）': ('02', '青森市'), '出羽': ('06', '山形市'), '羽前': ('06', '山形市'), '羽後': ('05', '秋田市'),
    '若狭': ('18', '小浜市'), '越前': ('18', '福井市'), '加賀': ('17', '金沢市'), '能登': ('17', '七尾市'), '越中': ('16', '富山市'),
    '越後': ('15', '長岡市'), '佐渡': ('15', '佐渡市'), '丹波': ('26', '亀岡市'), '丹後': ('26', '宮津市'), '但馬': ('28', '豊岡市'),
    '因幡': ('31', '鳥取市'), '伯耆': ('31', '倉吉市'), '出雲': ('32', '松江市'), '石見': ('32', '浜田市'), '隠岐': ('32', '隠岐の島町'),
    '播磨': ('28', '姫路市'), '美作': ('33', '津山市'), '備前': ('33', '岡山市北区'), '備中': ('33', '倉敷市'), '備後': ('34', '福山市'),
    '安芸': ('34', '広島市中区'), '周防': ('35', '山口市'), '長門': ('35', '下関市'), '紀伊': ('30', '和歌山市'), '淡路': ('28', '洲本市'),
    '阿波': ('36', '徳島市'), '讃岐': ('37', '高松市'), '伊予': ('38', '松山市'), '土佐': ('39', '高知市'), '筑前': ('40', '福岡市中央区'),
    '筑後': ('40', '久留米市'), '豊前': ('40', '北九州市小倉北区'), '豊後': ('44', '大分市'), '肥前': ('41', '佐賀市'), '肥後': ('43', '熊本市中央区'),
    '日向': ('45', '宮崎市'), '大隅': ('46', '霧島市'), '薩摩': ('46', '鹿児島市'), '壱岐': ('42', '壱岐市'), '対馬': ('42', '対馬市'), '琉球': ('47', '那覇市')
}

with open(STATS) as f: st = json.load(f)
ours = {p['code']: p['munis'] for p in st['prefs']}

def add_prov(out):
    code = {(p['code'], m['name']): m['code'] for p in st['prefs'] for m in p['munis']}
    bad = [k + '（' + v[1] + '）' for k, v in PROV.items() if (v[0], v[1]) not in code]
    if bad: sys.exit('旧国の目安の市町村が一覧にない：' + '、'.join(bad))
    out['prov'] = {k: out['munis'][code[v]] for k, v in PROV.items()}

# 旧国の場所だけ足し直す（地図の形は作り直さない）
if '--prov' in sys.argv:
    with open(OUT) as f: out = json.load(f)
    add_prov(out)
    with open(OUT, 'w') as f: json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
    print('旧国 %d の場所を足した' % len(out['prov'])); sys.exit(0)
out = {'source': '国土交通省「国土数値情報（行政区域データ）」2025年1月1日時点を加工', 'prefs': {}, 'center': {}, 'munis': {}, 'insets': []}
missing = []
xs, ys = [], []
for i in range(1, 48):
    pc = '%02d' % i
    g = fetch(pc)
    by_code, by_name = {}, {}
    for ft in g['features']:
        pr = ft['properties']; code = pr['N03_007']
        if not code or not ft['geometry']: continue
        geo = shape(ft['geometry'])
        # 小笠原村は父島・母島のまわりだけを描く（硫黄島・沖ノ鳥島・南鳥島は地図の外）
        if code == '13421':
            geo = unary_union([p for p in ([geo] if geo.geom_type == 'Polygon' else geo.geoms) if 141.9 < p.centroid.x < 142.4 and 26.4 < p.centroid.y < 27.8])
            shift = OGA_SHIFT
        else:
            shift = OKI_SHIFT if pc == '47' else (0, 0)
        tg = transform(geo, shift)
        if tg is None: continue
        by_code.setdefault(code, []).append(tg)
        nm = (pr.get('N03_004') or '') + (pr.get('N03_005') or '')
        by_name.setdefault(nm, []).append(tg)
        by_name.setdefault(pr.get('N03_004') or '', []).append(tg)
    allg = unary_union([x for v in by_code.values() for x in v])
    tol = 0.35
    out['prefs'][pc] = path_of(allg, tol, 1.2)
    # 都道府県の中心：いちばん大きな陸地の代表点
    big = max(([allg] if allg.geom_type == 'Polygon' else list(allg.geoms)), key=lambda p: p.area)
    c = big.representative_point(); out['center'][pc] = [round(c.x, 1), round(c.y, 1)]
    b = allg.bounds; xs += [b[0], b[2]]; ys += [b[1], b[3]]
    for m in ours.get(pc, []):
        gs = by_code.get(m['code']) or by_name.get(m['name'])
        if not gs: missing.append(pc + ' ' + m['name']); continue
        u = unary_union(gs)
        big = max(([u] if u.geom_type == 'Polygon' else list(u.geoms)), key=lambda p: p.area)
        c = big.representative_point()
        out['munis'][m['code']] = [round(c.x, 1), round(c.y, 1)]
    print(pc, len(out['prefs'][pc]) // 1000, 'k', file=sys.stderr)

if missing: sys.exit('地図に位置がない市区町村：' + '、'.join(missing[:20]))
x0, y0 = math.floor(min(xs)) - 2, math.floor(min(ys)) - 2
w, h = math.ceil(max(xs)) - x0 + 2, math.ceil(max(ys)) - y0 + 2
out['view'] = [x0, y0, w, h]
add_prov(out)
# 移して描いた地域の囲み（沖縄県・小笠原村）
for code, shift, box in (('47', OKI_SHIFT, (122.8, 24.0, 131.4, 28.0)), ('13421', OGA_SHIFT, (141.95, 26.5, 142.35, 27.8))):
    a = proj(box[0], box[3], shift); b2 = proj(box[2], box[1], shift)
    out['insets'].append({'code': code, 'x': round(a[0] - 3, 1), 'y': round(a[1] - 3, 1), 'w': round(b2[0] - a[0] + 6, 1), 'h': round(b2[1] - a[1] + 6, 1), 'label': '沖縄県' if code == '47' else '小笠原村'})
with open(OUT, 'w') as f: json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
print('保存した：site/data/map.json（%d KB、市区町村 %d）' % (os.path.getsize(OUT) // 1024, len(out['munis'])))
