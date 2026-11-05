#!/usr/bin/env python3
"""
估值监视器（#/val）的数据。公开免费来源，仓库里不放任何付费密钥。
由 update_data.py 调用；也可以单独跑：
    python3 valuation_data.py            # 联网
    python3 valuation_data.py --offline  # 只用 raw/valuation 里已有文件重算
    python3 valuation_data.py --check    # 只跑加总公式的自测，不联网

产出 data/valuation.json 和 data/valuation.js（file:// 用）。
抓不到的字段写成 null，页面显示「数据暂缺」，不编数字。
失败时如果上一版还能用，就保留上一版，不清空。

口径（和页面页脚同一句）：
  最新权重；亏损公司按权重计入、不剔除；极大市盈率不在 60 封顶；
  前瞻来自公开一致预期。
  指数市盈率 = 1 / Σ(权重 × 1/个股市盈率)，权重在“有数字的公司”里重新归一。
  隐含增长 = 滚动市盈率 / 前瞻市盈率 − 1。
"""
import os, sys, json, time, re, datetime as dt, subprocess, threading
import concurrent.futures as cf
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(ROOT, 'raw', 'valuation')
OUT = os.path.join(ROOT, 'data')
OFFLINE = '--offline' in sys.argv
HUA = 'macro-notebook/1.0 (personal research script)'
CONTACT = os.environ.get('MS_CONTACT', 'hch@mail.grokbot.com')
SEC_UA = f'macro-notebook/1.0 (personal research; {CONTACT})'
TODAY = dt.date.today()
# 只用于页面高亮，计算时不把任何市盈率改成这个数。
EXTREME_FWD_PE = 60
# 有数字的权重占比低于这个值，就不公布加总（页面写数据暂缺）。
MIN_COVERAGE = 0.70
# |市盈率| 低于这个值，多半是把累计净利润当成了每股收益。这只不进加总，也不改成 60。
MIN_ABS_PE = 0.25

MON = {'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
       'Jul': 7, 'Aug': 8, 'Sep': 9, 'Sept': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12}

def norm(t):
    return re.sub(r'[^A-Z0-9]', '', (t or '').upper())

def rnd(x, n):
    if x is None: return None
    try:
        v = float(x)
    except (TypeError, ValueError):
        return None
    if v != v or v in (float('inf'), float('-inf')): return None
    return round(v, n)

def num(s):
    if s is None: return None
    if isinstance(s, (int, float)):
        v = float(s)
        return None if v != v else v
    t = str(s).replace('$', '').replace(',', '').replace('%', '').strip()
    if t in ('', '--', 'N/A', 'n/a', 'None'): return None
    try: return float(t)
    except ValueError: return None

def month_end(year, month):
    if month == 12: nxt = dt.date(year + 1, 1, 1)
    else: nxt = dt.date(year, month + 1, 1)
    return nxt - dt.timedelta(days=1)

def parse_mon_year(s):
    parts = re.sub(r'[,]+', ' ', str(s)).split()
    if len(parts) < 2: raise ValueError(s)
    if parts[0].isdigit():
        year, mon = int(parts[0]), parts[1]
    else:
        mon, year = parts[0], int(parts[1])
    if mon not in MON: raise ValueError(s)
    return int(year), MON[mon]

def us_session(now=None):
    t = (now or dt.datetime.now(dt.timezone.utc)).astimezone(ZoneInfo('America/New_York'))
    d = t.date()
    if d.weekday() >= 5 or (t.hour, t.minute) < (16, 15):
        d -= dt.timedelta(days=1)
        while d.weekday() >= 5: d -= dt.timedelta(days=1)
    return d.isoformat()

def taipei_now():
    return dt.datetime.now(ZoneInfo('Asia/Taipei')).strftime('%Y-%m-%d %H:%M')

# ---------------------------------------------------------------- 下载
def get(url, path, timeout=40, check=None, headers=(), ua=None, fresh_hours=None, binary=False):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    def usable(p):
        if not os.path.exists(p) or os.path.getsize(p) < 50: return False
        if binary: return open(p, 'rb').read(2) == b'PK'
        return True
    if fresh_hours and usable(path) and time.time() - os.path.getmtime(path) < fresh_hours * 3600:
        return True
    if OFFLINE: return usable(path)
    tmp = path + '.tmp'
    for attempt in range(2):
        cmd = ['curl', '-sL', '--compressed', '--connect-timeout', '10', '-m', str(timeout),
               '-A', ua or HUA, '-o', tmp, '-w', '%{http_code}']
        for h in headers: cmd += ['-H', h]
        cmd.append(url)
        try:
            code = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout + 15).stdout.strip()
        except Exception:
            code = '000'
        ok = code == '200' and os.path.exists(tmp) and os.path.getsize(tmp) > 50
        if ok and binary:
            ok = open(tmp, 'rb').read(2) == b'PK'
        if ok and check and not binary:
            try: ok = bool(check(open(tmp, encoding='utf-8', errors='ignore').read()))
            except Exception: ok = False
        if ok:
            os.replace(tmp, path); return True
        if os.path.exists(tmp): os.remove(tmp)
        time.sleep(1.2)
    return usable(path)

# ---------------------------------------------------------------- 加总（自测覆盖：亏损计入、不封顶）
def aggregate(rows, key):
    """rows: {w: 权重(占该篮子), key: 市盈率或 None}。
    负的市盈率留在加总里。绝对值很大的市盈率原样进入 1/PE，不改成 60。
    返回的 pe 已经在“有数字的权重”里归一。covered 是有数字的权重 / 篮子权重合计。"""
    basket = [r for r in rows if (r.get('w') or 0) > 0]
    w_all = sum(r['w'] for r in basket)
    usable, absurd = [], []
    for r in basket:
        pe = r.get(key)
        if pe is None: continue
        try: pe = float(pe)
        except (TypeError, ValueError): continue
        if pe != pe or pe == 0 or pe in (float('inf'), float('-inf')): continue
        if abs(pe) < MIN_ABS_PE:
            absurd.append(r.get('t'))
            continue
        usable.append((r['w'], pe, r.get('t')))
    covered = (sum(w for w, _, _ in usable) / w_all) if w_all else 0.0
    n_loss = sum(1 for _, pe, _ in usable if pe < 0)
    w_loss = sum(w for w, pe, _ in usable if pe < 0)
    base = dict(pe=None, ey=None, covered=rnd(covered, 4), n=len(usable), n_loss=n_loss,
                w_loss=rnd(w_loss, 4), n_absurd=len(absurd), absurd=absurd[:8], ok=False)
    if w_all <= 0 or covered < MIN_COVERAGE or not usable:
        return base
    w_ok = sum(w for w, _, _ in usable)
    ey = sum((w / w_ok) * (1.0 / pe) for w, pe, _ in usable)
    if ey == 0 or ey != ey: return base
    base.update(pe=1.0 / ey, ey=ey, ok=True)
    return base

def test_aggregate():
    rows = [
        dict(t='A', w=0.50, pe=20, fpe=10),
        dict(t='LOSS', w=0.30, pe=-10, fpe=15),   # 亏损必须留在里面
        dict(t='HUGE', w=0.20, pe=100, fpe=80),   # 不许改成 60
    ]
    trail = aggregate(rows, 'pe')
    # 1/PE 加权：0.5/20 + 0.3/(-10) + 0.2/100 = 0.025 - 0.03 + 0.002 = -0.003
    assert trail['ok'] and trail['n_loss'] == 1, trail
    assert abs(trail['ey'] - (-0.003)) < 1e-12, trail
    assert trail['pe'] < 0, trail
    # 如果有人把 100 封顶成 60，EY 会变成 0.025 - 0.03 + 0.2/60
    capped_ey = 0.5 / 20 + 0.3 / (-10) + 0.2 / 60
    assert abs(trail['ey'] - capped_ey) > 1e-6
    fwd = aggregate(rows, 'fpe')
    assert fwd['ok'] and fwd['pe'] > 0
    g = trail['pe'] / fwd['pe'] - 1
    assert g == trail['pe'] / fwd['pe'] - 1
    # 覆盖率不够就空着，不编一个数
    thin = aggregate([dict(t='A', w=0.5, pe=20), dict(t='B', w=0.5, pe=None)], 'pe')
    assert thin['ok'] is False and thin['pe'] is None
    # 离谱的小市盈率剔出加总，但不改写成 60
    odd = aggregate([dict(t='A', w=0.8, pe=20), dict(t='B', w=0.2, pe=0.01)], 'pe')
    assert odd['n_absurd'] == 1 and abs(odd['pe'] - 20) < 1e-9
    print('valuation aggregate self-check ok')

# ---------------------------------------------------------------- 持仓、价格、盈利
def read_xlsx(path):
    import zipfile, xml.etree.ElementTree as ET
    ns = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    z = zipfile.ZipFile(path)
    ss = []
    if 'xl/sharedStrings.xml' in z.namelist():
        root = ET.fromstring(z.read('xl/sharedStrings.xml'))
        for si in root.findall('m:si', ns):
            ss.append(''.join((t.text or '') for t in si.findall('.//m:t', ns)))
    sheet_name = 'xl/worksheets/sheet1.xml'
    root = ET.fromstring(z.read(sheet_name))
    rows = []
    for row in root.findall('.//m:sheetData/m:row', ns):
        vals = []
        for cell in row.findall('m:c', ns):
            ref = cell.get('r') or 'A1'
            col = ''.join(ch for ch in ref if ch.isalpha())
            idx = 0
            for ch in col: idx = idx * 26 + (ord(ch) - 64)
            idx -= 1
            while len(vals) <= idx: vals.append(None)
            v = cell.find('m:v', ns)
            if v is None or v.text is None:
                is_el = cell.find('m:is', ns)
                if is_el is not None:
                    vals[idx] = ''.join((t.text or '') for t in is_el.findall('.//m:t', ns))
                continue
            if cell.get('t') == 's':
                vals[idx] = ss[int(v.text)]
            else:
                try: vals[idx] = float(v.text)
                except ValueError: vals[idx] = v.text
        rows.append(vals)
    return rows

def load_spy():
    path = os.path.join(RAW, 'spy_holdings.xlsx')
    url = 'https://www.ssga.com/us/en/intermediary/etfs/library-content/products/fund-data/etfs/us/holdings-daily-us-en-spy.xlsx'
    ok = get(url, path, timeout=60, binary=True, fresh_hours=12)
    if not ok: return [], None, 'missing'
    rows = read_xlsx(path)
    asof = None
    header = None
    out = []
    for r in rows:
        if not r: continue
        if r[0] and isinstance(r[0], str) and r[0].startswith('Holdings:') and len(r) > 1 and isinstance(r[1], str):
            m = re.search(r'(\d{1,2}-[A-Za-z]{3}-\d{4})', r[1])
            if m:
                asof = dt.datetime.strptime(m.group(1), '%d-%b-%Y').date().isoformat()
        if r[0] == 'Name':
            header = True
            continue
        if not header: continue
        ticker = r[1] if len(r) > 1 else None
        weight = r[4] if len(r) > 4 else None
        name = r[0] if r else None
        if not isinstance(ticker, str): continue
        t = ticker.strip().upper()
        if not re.match(r'^[A-Z][A-Z0-9.]{0,7}$', t): continue
        w = num(weight)
        if w is None or w <= 0: continue
        out.append(dict(t=t, n=str(name or t), w=w / 100.0))
    return out, asof, 'ok' if out else 'missing'

def load_qqq():
    path = os.path.join(RAW, 'qqq_holdings.json')
    url = 'https://dng-api.invesco.com/cache/v1/accounts/en_US/shareclasses/QQQ/holdings/fund?idType=ticker&productType=ETF'
    ok = get(url, path, check=lambda t: '"holdings"' in t, fresh_hours=12)
    if not ok: return [], None, 'missing'
    d = json.load(open(path))
    keep = {'COM', 'ADR', 'DRNY'}
    out = []
    for h in d.get('holdings') or []:
        if (h.get('securityTypeCode') or '').upper() not in keep: continue
        t = (h.get('ticker') or '').strip().upper()
        if not re.match(r'^[A-Z][A-Z0-9.]{0,7}$', t): continue
        w = num(h.get('percentageOfTotalNetAssets'))
        if w is None or w <= 0: continue
        name = h.get('issuerName') or t
        if isinstance(name, str): name = name.replace('&amp;', '&')
        out.append(dict(t=t, n=name, w=w / 100.0))
    return out, d.get('effectiveDate'), 'ok' if out else 'missing'

def load_screener():
    path = os.path.join(RAW, 'screener.json')
    url = 'https://api.nasdaq.com/api/screener/stocks?tableonly=true&download=true'
    ok = get(url, path, timeout=60, headers=['Accept: application/json'],
             check=lambda t: '"rows"' in t and '"symbol"' in t, fresh_hours=12)
    if not ok: return {}, 'missing'
    rows = json.load(open(path))['data']['rows']
    out = {}
    for r in rows:
        sym = (r.get('symbol') or '').strip().upper()
        if not sym: continue
        px = num(r.get('lastsale'))
        chg = num(r.get('netchange'))
        out[norm(sym)] = dict(symbol=sym, px=px, chg=chg, name=r.get('name'))
    return out, 'ok' if out else 'missing'

def market_open():
    path = os.path.join(RAW, 'aapl_info.json')
    url = 'https://api.nasdaq.com/api/quote/AAPL/info?assetclass=stocks'
    ok = get(url, path, headers=['Accept: application/json'], check=lambda t: 'marketStatus' in t, fresh_hours=1)
    if not ok: return None
    try:
        return json.load(open(path))['data'].get('marketStatus') == 'Open'
    except Exception:
        return None

def load_cik():
    path = os.path.join(RAW, 'company_tickers.json')
    url = 'https://www.sec.gov/files/company_tickers.json'
    ok = get(url, path, ua=SEC_UA, headers=['Accept: application/json'], check=lambda t: '"ticker"' in t, fresh_hours=48)
    if not ok: return {}, 'missing'
    data = json.load(open(path))
    out = {}
    rows = data.values() if isinstance(data, dict) else data
    for r in rows:
        try: out[norm(r['ticker'])] = int(r['cik_str'])
        except Exception: pass
    return out, 'ok' if out else 'missing'

def quarter_labels(n=8):
    y, q = TODAY.year, (TODAY.month - 1) // 3 + 1
    labels = []
    for _ in range(n):
        labels.append(f'CY{y}Q{q}')
        q -= 1
        if q == 0:
            q = 4; y -= 1
    return labels

def load_eps_frames(tag, periods, dur_lo, dur_hi):
    """返回 cik -> [(end, start, val), ...]。期间长度须落在 [dur_lo, dur_hi] 天。"""
    by = {}
    status = {}
    for per in periods:
        path = os.path.join(RAW, 'sec', f'{tag}_{per}.json')
        url = f'https://data.sec.gov/api/xbrl/frames/us-gaap/{tag}/USD-per-shares/{per}.json'
        ok = get(url, path, timeout=60, ua=SEC_UA, headers=['Accept: application/json'],
                 check=lambda t: '"data"' in t, fresh_hours=20)
        status[per] = 'ok' if ok else 'missing'
        if not ok: continue
        try: data = json.load(open(path)).get('data') or []
        except Exception:
            status[per] = 'missing'; continue
        best = {}
        for row in data:
            cik, start, end, val = row.get('cik'), row.get('start'), row.get('end'), row.get('val')
            if cik is None or not start or not end or val is None: continue
            try:
                dur = (dt.date.fromisoformat(end) - dt.date.fromisoformat(start)).days
            except Exception:
                continue
            if not (dur_lo <= dur <= dur_hi): continue
            accn = row.get('accn') or ''
            key = (int(cik), start, end)
            if key not in best or accn > best[key][0]:
                best[key] = (accn, float(val))
        for (cik, start, end), (_, val) in best.items():
            by.setdefault(cik, []).append((end, start, val))
        time.sleep(0.12)
    return by, status

def _day(s):
    return dt.date.fromisoformat(s)

def fill_fourth_quarters(quarters, annuals):
    """财年第四季常常没有单独的季度每股收益，只含在全年数里。
    若一个财年里已经有三个不重叠的季度，就把全年减去这三季，补上那个缺口。"""
    extra, seen = [], {(e, s) for e, s, _ in quarters}
    for ae, ast, aval in annuals:
        a0, a1 = _day(ast), _day(ae)
        inside = [q for q in quarters if _day(q[1]) >= a0 - dt.timedelta(days=3) and _day(q[0]) <= a1 + dt.timedelta(days=3)]
        inside.sort(key=lambda q: q[1])
        clean, last_end = [], None
        for e, s, v in inside:
            if last_end and _day(s) < last_end - dt.timedelta(days=3): continue
            clean.append((e, s, v)); last_end = _day(e)
        if len(clean) != 3: continue
        cov = sum((_day(e) - _day(s)).days for e, s, _ in clean)
        if not (240 <= cov <= 310): continue
        cursor, gaps = a0, []
        for e, s, _ in clean:
            if (_day(s) - cursor).days > 5:
                gaps.append((cursor, _day(s) - dt.timedelta(days=1)))
            cursor = _day(e) + dt.timedelta(days=1)
        if (a1 - cursor).days > 5:
            gaps.append((cursor, a1))
        if len(gaps) != 1: continue
        g0, g1 = gaps[0]
        if not (60 <= (g1 - g0).days <= 130): continue
        key = (g1.isoformat(), g0.isoformat())
        if key in seen: continue
        extra.append((key[0], key[1], aval - sum(v for _, _, v in clean)))
        seen.add(key)
    return list(quarters) + extra

def chain_ttm(quarters):
    """从最近一季往回接四个首尾相接的季度。接不上就返回 None，不用更老的季去凑。"""
    qs = sorted(quarters, key=lambda x: x[0], reverse=True)
    if not qs: return None
    if (TODAY - _day(qs[0][0])).days > 150: return None
    picked = [qs[0]]
    for _ in range(3):
        start = _day(picked[-1][1])
        nxt = None
        for end, st, val in qs:
            gap = (start - _day(end)).days
            if 0 <= gap <= 7:
                nxt = (end, st, val); break
        if not nxt: return None
        picked.append(nxt)
    span = (_day(picked[0][0]) - _day(picked[-1][1])).days
    if not (330 <= span <= 430): return None
    return sum(v for _, _, v in picked)

def ttm_eps(quarters, annuals):
    filled = fill_fourth_quarters(quarters or [], annuals or [])
    got = chain_ttm(filled)
    if got is not None: return got
    fresh = [a for a in (annuals or []) if (TODAY - _day(a[0])).days <= 150]
    if fresh: return max(fresh, key=lambda a: a[0])[2]
    return None

def load_gics():
    try:
        import constituents
        rows = constituents.members()
    except Exception as e:
        print('GICS 名单失败：', e)
        return {}, 'missing'
    out = {}
    for m in rows:
        if m.get('t') and m.get('sec'): out[norm(m['t'])] = m['sec']
    return out, 'ok' if out else 'missing'

def nq_symbol(sym):
    """纳斯达克分析师页用点号，不用斜杠（BRK/B → BRK.B）。"""
    return sym.replace('/', '.')

def fetch_forecasts(symbols):
    os.makedirs(os.path.join(RAW, 'fcst'), exist_ok=True)
    state = {'fail': 0}
    lock = threading.Lock()

    def one(sym):
        with lock:
            if state['fail'] >= 12: return sym, False
        path = os.path.join(RAW, 'fcst', nq_symbol(sym).replace('.', '_') + '.json')
        url = 'https://api.nasdaq.com/api/analyst/' + nq_symbol(sym) + '/earnings-forecast'
        ok = get(url, path, headers=['Accept: application/json'],
                 check=lambda t: 'Forecast' in t, fresh_hours=18)
        with lock:
            state['fail'] = 0 if ok else state['fail'] + 1
        time.sleep(0.12)
        return sym, ok

    ok_n = 0
    syms = list(symbols)
    with cf.ThreadPoolExecutor(4) as ex:
        for i, (sym, ok) in enumerate(ex.map(one, syms)):
            ok_n += bool(ok)
            if i and i % 80 == 0: print(f'  一致预期 {i}/{len(syms)}，成功 {ok_n}', flush=True)
    return ok_n, len(syms)

def forward_eps(sym):
    path = os.path.join(RAW, 'fcst', nq_symbol(sym).replace('.', '_') + '.json')
    try: d = json.load(open(path))['data']
    except Exception: return None, None
    quarters = []
    for r in ((d.get('quarterlyForecast') or {}).get('rows') or []):
        c = r.get('consensusEPSForecast')
        if c is None: continue
        try: year, mon = parse_mon_year(r.get('fiscalEnd') or '')
        except Exception: continue
        end = month_end(year, mon)
        if end < TODAY - dt.timedelta(days=45): continue
        quarters.append((end, float(c)))
    quarters.sort(key=lambda x: x[0])
    if len(quarters) >= 4:
        return sum(v for _, v in quarters[:4]), '4q'
    years = []
    for r in ((d.get('yearlyForecast') or {}).get('rows') or []):
        c = r.get('consensusEPSForecast')
        if c is None: continue
        try: year, mon = parse_mon_year(r.get('fiscalEnd') or '')
        except Exception: continue
        end = month_end(year, mon)
        if end < TODAY: continue
        years.append((end, float(c)))
    if not years: return None, None
    years.sort(key=lambda x: x[0])
    return years[0][1], 'fy'

# ---------------------------------------------------------------- 历史分位（另一套公开序列，页面会标明）
def load_spx_history():
    path = os.path.join(RAW, 'multpl_spx_pe.html')
    url = 'https://www.multpl.com/s-p-500-pe-ratio/table/by-month'
    ok = get(url, path, check=lambda t: 'datatable' in t, fresh_hours=20)
    if not ok: return None
    html = open(path, encoding='utf-8', errors='ignore').read()
    pts = []
    for m in re.finditer(r'<td>([A-Z][a-z]{2} \d{1,2}, \d{4})</td>\s*<td>(.*?)</td>', html, re.S):
        cell = m.group(2)
        cell = re.sub(r'&#x[0-9A-Fa-f]+;|&#\d+;|&\w+;', ' ', cell)
        cell = re.sub(r'<[^>]+>', ' ', cell)
        vm = re.search(r'([0-9]+(?:\.[0-9]+)?)', cell)
        if not vm: continue
        try:
            d = dt.datetime.strptime(m.group(1), '%b %d, %Y').date()
        except Exception:
            continue
        est = ('Estimate' in cell) or ('†' in cell)
        pts.append(dict(d=d.isoformat(), v=float(vm.group(1)), est=est))
    pts.sort(key=lambda p: p['d'])
    # 去重（同一天留最后一个）
    dedup = {}
    for p in pts: dedup[p['d']] = p
    pts = [dedup[k] for k in sorted(dedup)]
    return pack_history(pts, 'multpl.com 标普 500 市盈率月表（滚动，近月常标估计）', url, 'M')

def load_ndx_history():
    path = os.path.join(RAW, 'siblis_ndx.html')
    url = 'https://siblisresearch.com/data/nasdaq-100-pe-ratio/'
    ok = get(url, path, check=lambda t: 'NASDAQ 100' in t and 'Ten years' in t, fresh_hours=20)
    if not ok: return None
    html = open(path, encoding='utf-8', errors='ignore').read()
    i = html.find('Ten years of trailing P/E')
    if i < 0: return None
    block = html[i:i + 8000]
    j = block.find('</table>')
    if j > 0: block = block[:j]
    pts = []
    for tr in re.findall(r'<tr[^>]*>(.*?)</tr>', block, re.S):
        th = re.search(r'<th[^>]*>(.*?)</th>', tr, re.S)
        if not th: continue
        label = re.sub(r'<[^>]+>', '', th.group(1)).strip()
        tds = re.findall(r'<td[^>]*>(.*?)</td>', tr, re.S)
        if len(tds) < 2: continue
        raw = re.sub(r'<[^>]+>', '', tds[1]).strip()
        if not re.match(r'^[0-9]+(\.[0-9]+)?$', raw): continue
        try:
            year, mon = parse_mon_year(label)
        except Exception:
            continue
        # 页面写的是月末；“Sept 2026”他们自己标 data through 30 September。
        pts.append(dict(d=month_end(year, mon).isoformat(), v=float(raw), est=False))
    pts.sort(key=lambda p: p['d'])
    note = 'Siblis Research 免费页上的纳指 100 滚动市盈率（年末点，另加页面给出的最近一个月末；不是逐月，也不是付费库）'
    return pack_history(pts, note, url, 'Y')

def pack_history(pts, note, url, freq):
    if len(pts) < 8: return None
    latest = dt.date.fromisoformat(pts[-1]['d'])
    cut = latest - dt.timedelta(days=365 * 10 + 3)
    window = [p for p in pts if dt.date.fromisoformat(p['d']) >= cut]
    if len(window) < 8: return None
    cur = window[-1]['v']
    hist = [p['v'] for p in window[:-1]]
    if len(hist) < 8: return None
    pct = sum(v < cur for v in hist) / len(hist) * 100
    return dict(
        source=note, url=url, freq=freq, approx=True,
        d=[p['d'] for p in window], v=[rnd(p['v'], 2) for p in window],
        est=[bool(p['est']) for p in window],
        latest=rnd(cur, 2), latest_date=window[-1]['d'], latest_est=bool(window[-1]['est']),
        pct10=rnd(pct, 1), n=len(hist),
        window_start=window[0]['d'], window_end=window[-1]['d'],
    )

# ---------------------------------------------------------------- 组装
def build_rows(holds, screener, cik, diluted, basic, diluted_a, basic_a, gics, market_is_open):
    rows = []
    for h in holds:
        key = norm(h['t'])
        q = screener.get(key) or {}
        # 筛选器的 lastsale：盘中等于纳斯达克 summary 的 Previous Close，收盘后等于当日收盘。
        # 同一行的 netchange 和官方涨跌对不上，不能拿来回推前收。
        px = q.get('px')
        sym = q.get('symbol') or h['t']
        c = cik.get(key)
        eps = ttm_eps(diluted.get(c, []), diluted_a.get(c, [])) if c else None
        eps_src = 'diluted' if eps is not None else None
        if eps is None and c:
            eps = ttm_eps(basic.get(c, []), basic_a.get(c, []))
            if eps is not None: eps_src = 'basic'
        pe = (px / eps) if (px and eps not in (None, 0)) else None
        if pe is not None and (pe != pe or abs(pe) == float('inf')): pe = None
        feps, fsrc = forward_eps(sym)
        fpe = (px / feps) if (px and feps not in (None, 0)) else None
        if fpe is not None and (fpe != fpe or abs(fpe) == float('inf')): fpe = None
        rows.append(dict(
            t=h['t'], n=h['n'], w=h['w'], px=rnd(px, 4),
            eps=rnd(eps, 4), pe=rnd(pe, 4), feps=rnd(feps, 4), fpe=rnd(fpe, 4),
            fsrc=fsrc, eps_src=eps_src, sec=gics.get(key),
        ))
    return rows

def index_block(rows, history):
    trail = aggregate(rows, 'pe')
    fwd = aggregate(rows, 'fpe')
    pe, fpe = (rnd(trail['pe'], 2) if trail['ok'] else None), (rnd(fwd['pe'], 2) if fwd['ok'] else None)
    ey = rnd(trail['ey'], 5) if trail['ok'] else None
    fey = rnd(fwd['ey'], 5) if fwd['ok'] else None
    implied = rnd(pe / fpe - 1, 4) if (pe not in (None, 0) and fpe not in (None, 0)) else None
    # 公式自洽：有两个市盈率时，隐含增长必须等于相除减 1
    if implied is not None:
        assert abs((pe / fpe - 1) - implied) < 5e-4
    losses = [r for r in rows if r.get('pe') is not None and r['pe'] < 0 and abs(r['pe']) >= MIN_ABS_PE]
    losses.sort(key=lambda r: -r['w'])
    return dict(
        pe=pe, fpe=fpe, ey=ey, fey=fey, implied_g=implied,
        coverage_pe=trail['covered'], coverage_fpe=fwd['covered'],
        n=len(rows), n_pe=trail['n'], n_fpe=fwd['n'],
        n_loss=trail['n_loss'], w_loss=trail['w_loss'],
        loss_examples=[dict(t=r['t'], n=r['n'], w=rnd(r['w'], 5), pe=rnd(r['pe'], 2)) for r in losses[:8]],
        n_absurd_pe=trail['n_absurd'], n_absurd_fpe=fwd['n_absurd'],
        n_fsrc_4q=sum(1 for r in rows if r.get('fsrc') == '4q' and r.get('fpe') is not None),
        n_fsrc_fy=sum(1 for r in rows if r.get('fsrc') == 'fy' and r.get('fpe') is not None),
        history=history,
    )

def top10(rows):
    xs = sorted(rows, key=lambda r: -(r.get('w') or 0))[:10]
    out = []
    for r in xs:
        out.append(dict(
            t=r['t'], n=r['n'], w=rnd(r['w'], 5),
            pe=rnd(r['pe'], 2) if r.get('pe') is not None and abs(r['pe']) >= MIN_ABS_PE else None,
            fpe=rnd(r['fpe'], 2) if r.get('fpe') is not None and abs(r['fpe']) >= MIN_ABS_PE else None,
            fsrc=r.get('fsrc'),
        ))
    return out

def it_block(rows):
    tagged = [r for r in rows if r.get('sec')]
    it = [r for r in tagged if r['sec'] == 'Information Technology']
    w_all = sum(r['w'] for r in rows)
    w_it = sum(r['w'] for r in it)
    unmapped = sum(r['w'] for r in rows if not r.get('sec'))
    if not it or w_all <= 0:
        return dict(weight=None, pe=None, fpe=None, ey=None, fey=None, implied_g=None,
                    coverage_pe=None, coverage_fpe=None, n=0, unmapped=rnd(unmapped, 4), ok=False)
    # 行业内部再加总一次；权重是占整只 ETF 的比例，不是占行业的比例
    block = index_block(it, None)
    return dict(
        weight=rnd(w_it, 4), n=len(it), unmapped=rnd(unmapped, 4),
        pe=block['pe'], fpe=block['fpe'], ey=block['ey'], fey=block['fey'], implied_g=block['implied_g'],
        coverage_pe=block['coverage_pe'], coverage_fpe=block['coverage_fpe'],
        n_loss=block['n_loss'], ok=block['pe'] is not None,
    )

def assemble(spy, qqq, screener, cik, diluted, basic, diluted_a, basic_a, gics, market_is_open, spy_asof, qqq_asof, status, fcst_note):
    spx_rows = build_rows(spy, screener, cik, diluted, basic, diluted_a, basic_a, gics, market_is_open)
    ndx_rows = build_rows(qqq, screener, cik, diluted, basic, diluted_a, basic_a, gics, market_is_open)
    session = us_session()
    obj = dict(
        asof=session,
        session=session,
        generated=taipei_now(),
        approx=True,
        config=dict(
            extreme_forward_pe=EXTREME_FWD_PE,
            extreme_forward_pe_note='默认 60。只决定前十大表格里“前瞻极高”的高亮，计算时不把任何市盈率改成 60，也不做封顶。',
            min_coverage=MIN_COVERAGE,
            min_abs_pe=MIN_ABS_PE,
        ),
        price_asof=session,
        price_is_prev_close=bool(market_is_open),
        weight_asof=dict(SPX=spy_asof, NDX=qqq_asof),
        indices=dict(
            SPX=index_block(spx_rows, None),
            NDX=index_block(ndx_rows, None),
        ),
        it=it_block(spx_rows),
        top10=dict(SPX=top10(spx_rows), NDX=top10(ndx_rows)),
        status=status,
        fcst=fcst_note,
        method='用最新权重把成分股加总：亏损公司按权重计入、不剔除，极大市盈率不在 60 封顶；前瞻来自公开一致预期（纳斯达克官网分析师预测页，数据商 Zacks）。',
        sources=dict(
            weights_spx=dict(name='State Street SPDR 标普 500 ETF（SPY）每日持仓', url='https://www.ssga.com/us/en/intermediary/etfs/funds/spdr-sp-500-etf-trust-spy'),
            weights_ndx=dict(name='Invesco QQQ 持仓接口', url='https://www.invesco.com/us/financial-products/etfs/holdings?audienceType=Investor&ticker=QQQ'),
            gics=dict(name='维基百科 List of S&P 500 companies（GICS）', url='https://en.wikipedia.org/wiki/List_of_S%26P_500_companies'),
            price=dict(name='纳斯达克官网股票筛选器（收盘或上一笔收盘）', url='https://www.nasdaq.com/market-activity/stocks/screener'),
            trail=dict(name='SEC EDGAR XBRL frames：稀释每股收益（缺则用基本）。最近四个首尾相接的季度相加；财年第四季若没有单独披露，用全年减去另外三季补上', url='https://data.sec.gov/api/xbrl/frames/'),
            forward=dict(name='纳斯达克官网分析师一致预期（Zacks）：未来四个财季相加，凑不齐则用下一个财年', url='https://www.nasdaq.com/market-activity/stocks/aapl/earnings'),
            hist_spx=dict(name='multpl.com 标普 500 市盈率月表', url='https://www.multpl.com/s-p-500-pe-ratio/table/by-month'),
            hist_ndx=dict(name='Siblis Research 纳指 100 公开页（年末点，不是付费全历史）', url='https://siblisresearch.com/data/nasdaq-100-pe-ratio/'),
        ),
    )
    return obj, spx_rows, ndx_rows

def dump(obj):
    # 历史在 assemble 里先占位，调用方填上再写。这里只负责落盘。
    js = json.dumps(obj, ensure_ascii=False, separators=(',', ':'), allow_nan=False)
    os.makedirs(OUT, exist_ok=True)
    open(os.path.join(OUT, 'valuation.json'), 'w').write(js)
    open(os.path.join(OUT, 'valuation.js'), 'w').write('window.VAL=' + js + ';\n')

def score(obj):
    """用来决定要不要覆盖上一版：市盈率、前瞻、10 年分位、信息技术权重各算一分。"""
    n = 0
    for i in ('SPX', 'NDX'):
        b = (obj.get('indices') or {}).get(i) or {}
        if b.get('pe') is not None: n += 1
        if b.get('fpe') is not None: n += 1
        if (b.get('history') or {}).get('pct10') is not None: n += 1
    if (obj.get('it') or {}).get('weight') is not None: n += 1
    return n

def run():
    test_aggregate()
    os.makedirs(RAW, exist_ok=True)
    status = {}
    print('估值监视器：下载持仓和价格…', flush=True)
    spy, spy_asof, st = load_spy(); status['SPY持仓'] = st if spy else 'missing'
    qqq, qqq_asof, st = load_qqq(); status['QQQ持仓'] = st if qqq else 'missing'
    screener, st = load_screener(); status['纳斯达克筛选器'] = st
    opened = market_open(); status['行情状态'] = 'open' if opened else ('closed' if opened is False else 'missing')
    gics, st = load_gics(); status['维基GICS'] = st
    cik, st = load_cik(); status['SEC代码表'] = st
    print('估值监视器：SEC 季度每股收益…', flush=True)
    qpers, apers = quarter_labels(8), ['CY2024', 'CY2025', 'CY2026']
    diluted, st_d = load_eps_frames('EarningsPerShareDiluted', qpers, 60, 130)
    basic, st_b = load_eps_frames('EarningsPerShareBasic', qpers, 60, 130)
    diluted_a, st_ad = load_eps_frames('EarningsPerShareDiluted', apers, 300, 400)
    basic_a, st_ba = load_eps_frames('EarningsPerShareBasic', apers, 300, 400)
    status['SEC稀释EPS'] = 'ok' if any(v == 'ok' for v in st_d.values()) else 'missing'
    status['SEC基本EPS'] = 'ok' if any(v == 'ok' for v in st_b.values()) else 'missing'
    status['SEC全年EPS'] = 'ok' if any(v == 'ok' for v in {**st_ad, **st_ba}.values()) else 'missing'
    symbols = []
    seen = set()
    for h in spy + qqq:
        key = norm(h['t'])
        sym = (screener.get(key) or {}).get('symbol') or h['t']
        if sym not in seen:
            seen.add(sym); symbols.append(sym)
    print(f'估值监视器：一致预期 {len(symbols)} 只…', flush=True)
    if symbols and (screener or not OFFLINE):
        ok_n, n = fetch_forecasts(symbols)
        status['纳斯达克一致预期'] = 'ok' if ok_n >= max(1, int(n * 0.7)) else ('cached' if ok_n else 'missing')
        fcst_note = dict(ok=ok_n, n=n)
    else:
        status['纳斯达克一致预期'] = 'missing'
        fcst_note = dict(ok=0, n=0)
    print('估值监视器：历史分位…', flush=True)
    hist_spx = load_spx_history(); status['multpl标普市盈率'] = 'ok' if hist_spx else 'missing'
    hist_ndx = load_ndx_history(); status['siblis纳指市盈率'] = 'ok' if hist_ndx else 'missing'
    obj, spx_rows, ndx_rows = assemble(spy, qqq, screener, cik, diluted, basic, diluted_a, basic_a, gics, bool(opened), spy_asof, qqq_asof, status, fcst_note)
    obj['indices']['SPX']['history'] = hist_spx
    obj['indices']['NDX']['history'] = hist_ndx
    # 打印对照，方便看有没有把单位弄错。不据此改数字。
    for name, rows, blk in (('SPX', spx_rows, obj['indices']['SPX']), ('NDX', ndx_rows, obj['indices']['NDX'])):
        top = sorted(rows, key=lambda r: -r['w'])[:8]
        print(f"  {name} pe={blk['pe']} fpe={blk['fpe']} ey={blk['ey']} g={blk['implied_g']} "
              f"cov={blk['coverage_pe']}/{blk['coverage_fpe']} loss={blk['n_loss']} absurd={blk['n_absurd_pe']}", flush=True)
        for r in top:
            print(f"    {r['t']:8} w={r['w']*100:6.2f}% px={r['px']} eps={r['eps']} pe={r['pe']} fpe={r['fpe']} {r.get('fsrc') or ''} {r.get('sec') or ''}", flush=True)
    it = obj['it']
    print(f"  IT w={it.get('weight')} pe={it.get('pe')} fpe={it.get('fpe')} unmapped={it.get('unmapped')}", flush=True)
    old = {}
    try: old = json.load(open(os.path.join(OUT, 'valuation.json')))
    except Exception: pass
    if score(old) and score(obj) < score(old):
        print(f'估值监视器：这次只有 {score(obj)} 项，上一版有 {score(old)} 项，保留上一版 data/valuation.*')
        return
    dump(obj)
    print('估值监视器：已写入 data/valuation.js', flush=True)

if __name__ == '__main__':
    if '--check' in sys.argv:
        test_aggregate()
    else:
        run()
