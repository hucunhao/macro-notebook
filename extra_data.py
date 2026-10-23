#!/usr/bin/env python3
"""
Market Dashboard 扩展数据：全球股指、商品汇率、经济日历、财报日历、QDII 溢价。
由 update_data.py 调用（每一块单独 try/except，失败只影响自己）。
容错：每个请求最多试 3 次；还是失败就用 raw/ 里上次下载的文件；连缓存都没有，就沿用上一版 data/*.json 里的那一条
（标记 stale=True），绝不因为某个来源连不上就把已发布的数据清空。这些来源都不会阻止发布。
也可以单独运行：python3 extra_data.py [--offline]

来源（都不需要登录，也不伪装浏览器；请求头写明是个人研究脚本）：
- 东方财富 行情 K 线接口 push2his.eastmoney.com（全球股指、COMEX 金银铜、美元指数、离岸人民币、场内 ETF 收盘价）
- 东方财富 基金数据 fund.eastmoney.com/pingzhongdata（QDII 基金单位净值历史、规模）
- FRED 发布日历 fred.stlouisfed.org/releases/calendar（CPI、非农、GDP、PCE 等的发布日期，美国中部时间）
- 美联储 FOMC 会议日程 federalreserve.gov
- 纳斯达克 财报日历 api.nasdaq.com/api/calendar/earnings
"""
import json, os, re, sys, time, html, random, subprocess, datetime as dt

ROOT = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(ROOT, 'raw'); OUT = os.path.join(ROOT, 'data')
OFFLINE = '--offline' in sys.argv
HUA = "macro-notebook/1.0 (personal research script)"
TODAY = dt.date.today()
STATUS = {}

# 重试：每个请求最多试 TRIES 次，中间等 2 秒、6 秒（加一点随机抖动）。请求头不变，不伪装浏览器。
TRIES = max(1, int(os.environ.get('MS_RETRIES', '3')))
BACKOFF = (2, 6, 12)
# 测试用：MS_SIMULATE_FAIL=eastmoney,fredcal,fomc,nasdaq 让这些来源“连不上”（不发请求，直接按失败处理）
SIM_FAIL = {x.strip() for x in os.environ.get('MS_SIMULATE_FAIL', '').split(',') if x.strip()}
# 同一个主机连续 3 个请求都彻底失败，就认定它今天连不上：后面的请求只试 1 次、超时缩短，免得整个任务被拖到超时。
# 说明：GitHub Actions 跑在美国机房时，东方财富（push2his / fund.eastmoney）经常 403 或断连，几乎总会走进这条短路；
# 这时沿用 raw/ 缓存和上一版 data/*.json（标 stale），不阻止发布。本机/非 GH 网络有时能抓到。
_HOST_FAILS = {}

def _host(url): return url.split('/')[2]

def get(url, path, timeout=40, check=None, headers=(), src=None):
    """下载到 path，失败保留旧文件。返回 ok / cached / missing。
    src：来源标签（eastmoney / fredcal / fomc / nasdaq），只用于模拟故障。"""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    fallback = lambda: 'cached' if os.path.exists(path) else 'missing'
    if OFFLINE or (src and src in SIM_FAIL): return fallback()
    host = _host(url); dead = _HOST_FAILS.get(host, 0) >= 3
    tries, tmo = (1, min(timeout, 15)) if dead else (TRIES, timeout)
    tmp = path + '.tmp'
    for i in range(tries):
        if i: time.sleep(BACKOFF[min(i - 1, len(BACKOFF) - 1)] + random.random())
        cmd = ['curl', '-sL', '--compressed', '--connect-timeout', '10', '-m', str(tmo), '-o', tmp, '-w', '%{http_code}', '-A', HUA]
        # FRED 发布日历页在部分网络上 HTTP/2 会 INTERNAL_ERROR；fredcal 额外带 --http1.1
        if src == 'fredcal': cmd[1:1] = ['--http1.1']
        for h in headers: cmd += ['-H', h]
        cmd.append(url)
        try: code = subprocess.run(cmd, capture_output=True, text=True, timeout=tmo + 10).stdout.strip()
        except Exception: code = '000'
        good = code == '200' and os.path.exists(tmp) and os.path.getsize(tmp) > 50
        if good and check:
            try: good = bool(check(open(tmp, encoding='utf-8', errors='ignore').read()))
            except Exception: good = False
        if good:
            os.replace(tmp, path); _HOST_FAILS[host] = 0; return 'ok'
        if os.path.exists(tmp): os.remove(tmp)
    _HOST_FAILS[host] = _HOST_FAILS.get(host, 0) + 1
    return fallback()

def prev(name):
    """上一版已提交的 data/{name}.json（抓取失败时沿用里面的内容）；没有就返回 {}"""
    try: return json.load(open(os.path.join(OUT, name + '.json')))
    except Exception: return {}

def us_session(now=None):
    """最近一个已经收盘的美股交易日（美东 16:15 之后算当天；不考虑节假日）"""
    from zoneinfo import ZoneInfo
    t = (now or dt.datetime.now(dt.timezone.utc)).astimezone(ZoneInfo('America/New_York'))
    d = t.date()
    if d.weekday() >= 5 or (t.hour, t.minute) < (16, 15):
        d -= dt.timedelta(days=1)
        while d.weekday() >= 5: d -= dt.timedelta(days=1)
    return d.isoformat()
SESSION = us_session()

def _src_stale(st, path, hours=20):
    """日程类来源（发布日历、财报日历）：这次没抓到，并且缓存文件不存在或超过 20 小时 → 算“未更新”"""
    if st == 'ok': return False
    return not os.path.exists(path) or time.time() - os.path.getmtime(path) > hours * 3600

def stamp(obj, old, fresh_any, n_stale, asof):
    """给扩展数据块加新鲜度字段：
    asof    = 页面上显示的“数据截至”日期
    session = 这块数据最近一次成功抓取时对应的美股交易日（这次没抓到就沿用上一版的）
    stale_n = 这次没更新、沿用旧数据的条目数"""
    obj['asof'] = asof
    obj['session'] = SESSION if fresh_any else old.get('session') or old.get('asof') or None
    obj['stale_n'] = n_stale
    obj['fetched'] = dt.datetime.now().strftime('%Y-%m-%d %H:%M') if fresh_any else old.get('fetched')
    return obj

def dump(name, var, obj):
    js = json.dumps(obj, ensure_ascii=False, separators=(',', ':'), allow_nan=False)
    open(os.path.join(OUT, name + '.json'), 'w').write(js)
    open(os.path.join(OUT, name + '.js'), 'w').write(f'window.{var}=' + js + ';\n')

# ---------------------------------------------------------------- 东方财富 K 线
def em_kline(secid, beg='20100101'):
    """返回 [(date, close, amount)]；amount = 成交额（元，指数/期货可能为 0）"""
    p = os.path.join(RAW, 'em', secid.replace('.', '_') + '.json')
    url = (f'https://push2his.eastmoney.com/api/qt/stock/kline/get?secid={secid}&fields1=f1,f2,f3'
           f'&fields2=f51,f53,f57&klt=101&fqt=0&beg={beg}&end=20500101&lmt=100000')
    st = STATUS['东方财富:' + secid] = get(url, p, check=lambda t: '"klines"' in t and json.loads(t).get('data'), src='eastmoney')
    try: d = json.load(open(p))['data']
    except Exception: return None, [], st
    rows = []
    for k in d['klines']:
        a = k.split(',')
        try: rows.append((a[0], float(a[1]), float(a[2]) if len(a) > 2 and a[2] not in ('', '-') else 0.0))
        except ValueError: pass
    return d.get('name'), rows, st

# ---------------------------------------------------------------- 1. 全球股指 + 商品汇率
WORLD = [  # (id, secid, 中文名, 地区, 时区标签)
    ('SPX', '100.SPX', '标普 500', '美国'), ('NDX', '100.NDX', '纳斯达克 100', '美国'), ('DJIA', '100.DJIA', '道琼斯工业', '美国'),
    ('SX5E', '100.SX5E', '欧洲斯托克 50', '欧洲'), ('GDAXI', '100.GDAXI', '德国 DAX', '欧洲'), ('FTSE', '100.FTSE', '英国富时 100', '欧洲'), ('FCHI', '100.FCHI', '法国 CAC 40', '欧洲'),
    ('N225', '100.N225', '日经 225', '亚太'), ('KS11', '100.KS11', '韩国 KOSPI', '亚太'), ('TWII', '100.TWII', '台湾加权', '亚太'), ('SENSEX', '100.SENSEX', '印度 SENSEX', '亚太'),
    ('HSI', '100.HSI', '恒生指数', '中国'), ('SSE', '1.000001', '上证指数', '中国'), ('CSI300', '1.000300', '沪深 300', '中国'), ('CYB', '0.399006', '创业板指', '中国'),
]
CMDTY = [  # (id, secid, 名称, 组, 单位)
    ('GOLD', '101.GC00Y', 'COMEX 黄金（连续）', '商品', '美元/盎司'), ('SILVER', '101.SI00Y', 'COMEX 白银（连续）', '商品', '美元/盎司'),
    ('COPPER', '101.HG00Y', 'COMEX 铜（连续）', '商品', '美元/磅'), ('CL', '102.CL00Y', 'NYMEX 原油（连续）', '商品', '美元/桶'),
    ('DXY', '100.UDI', '美元指数', '汇率', '点'), ('USDCNH', '133.USDCNH', '美元兑离岸人民币', '汇率', '元'), ('USDCNYC', '120.USDCNYC', '美元兑人民币中间价', '汇率', '元'),
]
def build_world():
    old = prev('world'); fresh = 0; stale = 0
    out = {'indices': [], 'cmdty': [], 'src': '东方财富行情接口（push2his.eastmoney.com）日线收盘，不含分红；各市场收盘时间不同。', 'start': '2016-01-01'}
    for key, items in (('indices', WORLD), ('cmdty', CMDTY)):
        olds = {o['id']: o for o in old.get(key, [])}
        for it in items:
            name, rows, st = em_kline(it[1]); time.sleep(0.3)
            rows = [r for r in rows if r[0] >= '2016-01-01']
            if rows:
                o = dict(id=it[0], name=it[2], group=it[3], d=[r[0] for r in rows], v=[round(r[1], 4) for r in rows])
                if len(it) > 4: o['unit'] = it[4]
            elif it[0] in olds:                               # 没有缓存文件：沿用上一版 data/world.json 里的这一条
                o = {k: v for k, v in olds[it[0]].items() if k != 'stale'}
            else: continue
            # 这次没抓到（用的是缓存或上一版），而且最后一天早于最近一个美股交易日 → 标“未更新”
            if st != 'ok' and o['d'][-1] < SESSION: o['stale'] = True; stale += 1
            else: fresh += 1
            out[key].append(o)
    for key in ('indices', 'cmdty'):   # 两张表各自的“数据截至”
        ds = [o['d'][-1] for o in out[key] if o['d']]
        out[key + '_asof'] = max(ds) if ds else None
    return stamp(out, old, fresh > 0, stale, max(filter(None, (out['indices_asof'], out['cmdty_asof'])), default=None))

# ---------------------------------------------------------------- 2. 经济日历
# FRED release id → (中文名, 一句话说明, 重要程度 1–3)
RELEASES = {
    10: ('CPI 消费者物价', '通胀最重要的数据，偏高会让降息推迟、利率上升', 3),
    50: ('非农就业报告', '每月新增就业和失业率，看经济冷热', 3),
    53: ('GDP 国内生产总值', '经济整体增速（季度）', 2),
    54: ('PCE 个人收入和支出', '美联储最看重的通胀口径（核心 PCE）', 3),
    46: ('PPI 生产者物价', '企业端的通胀，常领先 CPI', 2),
    9: ('零售销售', '美国人花钱的力度', 2),
    192: ('JOLTS 职位空缺', '企业招人意愿', 1),
    180: ('首次申领失业金', '每周裁员的温度计', 1),
    91: ('密歇根消费者信心', '消费者情绪和通胀预期', 1),
    13: ('工业生产', '工厂产出', 1),
    11: ('就业成本指数 ECI', '工资成本，季度', 1),
}
MONTHS = {m: i for i, m in enumerate(['January','February','March','April','May','June','July','August','September','October','November','December'], 1)}
def _ct_to_taipei(day, tm):
    """FRED 日历的时间是美国中部时间；转成台北时间（考虑夏令时）"""
    if not tm or tm == 'N/A': return None
    m = re.match(r'(\d+):(\d+)\s*(am|pm)', tm)
    if not m: return None
    h = int(m.group(1)) % 12 + (12 if m.group(3) == 'pm' else 0)
    try:
        from zoneinfo import ZoneInfo
        local = dt.datetime(day.year, day.month, day.day, h, int(m.group(2)), tzinfo=ZoneInfo('America/Chicago'))
        return local.astimezone(ZoneInfo('Asia/Taipei')).strftime('%Y-%m-%d %H:%M')
    except Exception:
        return None
def build_calendar():
    vs, ve = TODAY - dt.timedelta(days=3), TODAY + dt.timedelta(days=45)
    ev = []; old = prev('calendar'); fresh = 0; stale = 0
    for rid, (nm, desc, imp) in RELEASES.items():
        p = os.path.join(RAW, 'cal', f'fred_{rid}.html')
        st = STATUS[f'FRED 日历:{rid}'] = get(f'https://fred.stlouisfed.org/releases/calendar?rid={rid}&vs={vs}&ve={ve}', p, check=lambda t: 'Economic Release Calendar' in t, src='fredcal')
        time.sleep(0.4)
        if _src_stale(st, p): stale += 1
        else: fresh += 1
        if not os.path.exists(p):   # 没有缓存文件：沿用上一版 data/calendar.json 里这一项的日程
            ev += [dict(e, stale=True) for e in old.get('events', []) if e.get('src') == 'FRED' and e.get('url', '').endswith(f'rid={rid}')]
            continue
        t = open(p, encoding='utf-8', errors='ignore').read(); tb = t[t.find('<tbody>'):]
        day = None; tm = ''
        for row in re.findall(r'<tr[^>]*>(.*?)</tr>', tb, flags=re.S):
            m = re.search(r'font-weight: bold;">[A-Za-z]+ ([A-Za-z]+) (\d+), (\d{4})</span>', row)
            if m: day = dt.date(int(m.group(3)), MONTHS[m.group(1)], int(m.group(2))); tm = ''; continue
            tds = re.findall(r'<td[^>]*>(.*?)</td>', row, flags=re.S)
            if len(tds) < 2 or not day: continue
            tt = re.sub(r'\s+', ' ', re.sub('<[^>]+>', '', tds[0])).strip()
            if tt: tm = tt
            a = re.search(r'rid=(\d+)"', tds[1])
            if a and int(a.group(1)) == rid:
                ev.append(dict(date=day.isoformat(), tw=_ct_to_taipei(day, tm), name=nm, desc=desc, imp=imp, src='FRED', url=f'https://fred.stlouisfed.org/release?rid={rid}'))
    # FOMC：美联储官网会议日程；决议在第二天美东 14:00 公布
    p = os.path.join(RAW, 'cal', 'fomc.html')
    st = STATUS['美联储 FOMC 日程'] = get('https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm', p, check=lambda t: 'FOMC Meetings' in t, src='fomc')
    if _src_stale(st, p): stale += 1
    else: fresh += 1
    fomc = []
    if not os.path.exists(p):
        fomc = list(old.get('fomc', []))
        ev += [dict(e, stale=True) for e in old.get('events', []) if e.get('src') == '美联储']
    else:
        t = open(p, encoding='utf-8', errors='ignore').read()
        for y in (TODAY.year, TODAY.year + 1):
            i = t.find(f'{y} FOMC Meetings')
            if i < 0: continue
            seg = t[i:]; j = seg.find('FOMC Meetings', 30); seg = seg[:j] if j > 0 else seg
            for mon, dd in re.findall(r'fomc-meeting__month[^>]*>\s*<strong>([^<]+)</strong>.*?fomc-meeting__date[^>]*>([^<]+)<', seg, flags=re.S):
                mon = mon.split('/')[-1].strip(); nums = re.findall(r'\d+', dd)
                if mon not in MONTHS or not nums: continue
                m2 = MONTHS[mon]; d2 = int(nums[-1])
                if len(nums) > 1 and int(nums[-1]) < int(nums[0]): m2 = m2 % 12 + 1   # 跨月会议，如 Apr/May 30-1
                try: last = dt.date(y, m2, d2)
                except ValueError: continue
                sep = '*' in dd
                fomc.append(last.isoformat())
                if vs <= last <= ve:
                    try:
                        from zoneinfo import ZoneInfo
                        tw = dt.datetime(last.year, last.month, last.day, 14, 0, tzinfo=ZoneInfo('America/New_York')).astimezone(ZoneInfo('Asia/Taipei')).strftime('%Y-%m-%d %H:%M')
                    except Exception: tw = None
                    ev.append(dict(date=last.isoformat(), tw=tw, name='美联储议息会议（FOMC）决议', desc='决定联邦基金利率' + ('；这次会公布经济预测和点阵图' if sep else ''), imp=3, src='美联储', url='https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm'))
    ev.sort(key=lambda e: (e['tw'] or e['date'] + ' 99', -e['imp']))
    out = dict(events=ev, fomc=fomc, from_=vs.isoformat(), to=ve.isoformat(), generated=dt.datetime.now().strftime('%Y-%m-%d %H:%M'),
                note='时间已换算成台北时间。发布日期来自 FRED 发布日历（美国中部时间）和美联储官网；政府停摆等情况会让日期变动，以官方为准。')
    if not fresh: out['generated'] = old.get('generated', out['generated'])
    return stamp(out, old, fresh > 0, stale, TODAY.isoformat() if fresh else (old.get('asof') or (old.get('generated') or '')[:10] or None))

# ---------------------------------------------------------------- 3. 财报日历（纳斯达克公开接口）
def _money(s):
    try: return float(re.sub(r'[^\d.]', '', s or '')) or None
    except ValueError: return None
def build_earnings():
    sp = {}
    try:
        S = json.load(open(os.path.join(OUT, 'sp500.json')))
        sp = {r['t']: r for r in S['rows']}
    except Exception: pass
    rows = []; days = 0; d = TODAY - dt.timedelta(days=1); old = prev('earnings'); fresh = 0; stale = 0
    while days < 12:
        d += dt.timedelta(days=1)
        if d.weekday() >= 5: continue
        days += 1
        p = os.path.join(RAW, 'earnings', f'{d}.json')
        st = STATUS[f'纳斯达克财报:{d}'] = get(f'https://api.nasdaq.com/api/calendar/earnings?date={d}', p, headers=['Accept: application/json'], check=lambda t: '"data"' in t, src='nasdaq')
        time.sleep(0.5)
        if _src_stale(st, p): stale += 1
        else: fresh += 1
        if not os.path.exists(p):   # 没有缓存文件：沿用上一版 data/earnings.json 里这一天的公司
            rows += [dict(r, stale=True) for r in old.get('rows', []) if r.get('date') == d.isoformat()]
            continue
        try: rs = (json.load(open(p))['data'] or {}).get('rows') or []
        except Exception: rs = []
        for r in rs:
            t = (r.get('symbol') or '').upper(); mc = _money(r.get('marketCap'))
            insp = t in sp or t.replace('.', '-') in sp
            if not insp or not mc or mc < 30e9: continue
            s = sp.get(t) or sp.get(t.replace('.', '-')) or {}
            if s.get('dup'): continue   # 同一公司的第二类股票（如 GOOG）只列一次
            rows.append(dict(date=d.isoformat(), t=t, n=s.get('n') or r.get('name'), sec=s.get('sec'), mcap=mc,
                             when={'time-pre-market': '盘前', 'time-after-hours': '盘后'}.get(r.get('time'), '未定'),
                             fq=r.get('fiscalQuarterEnding'), last=r.get('lastYearRptDt')))
    # 清理旧缓存（只保留 30 天）
    try:
        for f in os.listdir(os.path.join(RAW, 'earnings')):
            if f[:10] < (TODAY - dt.timedelta(days=30)).isoformat(): os.remove(os.path.join(RAW, 'earnings', f))
    except Exception: pass
    rows.sort(key=lambda r: (r['date'], -r['mcap']))
    out = dict(rows=rows, generated=dt.datetime.now().strftime('%Y-%m-%d %H:%M'),
                note='纳斯达克官网财报日历；只列标普 500 成分股里市值 300 亿美元以上的公司。日期是美国日期：盘前 ≈ 台北当天晚上，盘后 ≈ 台北第二天早上。公司可能改期。')
    if not fresh: out['generated'] = old.get('generated', out['generated'])
    return stamp(out, old, fresh > 0, stale, TODAY.isoformat() if fresh else (old.get('asof') or (old.get('generated') or '')[:10] or None))

# ---------------------------------------------------------------- 4. QDII 溢价
QDII = [  # (代码, 跟踪, 类型)
    ('513100', '纳指100', 'ETF'), ('159941', '纳指100', 'ETF'), ('513300', '纳指100', 'ETF'), ('159632', '纳指100', 'ETF'), ('159659', '纳指100', 'ETF'),
    ('159660', '纳指100', 'ETF'), ('159501', '纳指100', 'ETF'), ('513110', '纳指100', 'ETF'), ('513390', '纳指100', 'ETF'), ('159513', '纳指100', 'ETF'),
    ('513870', '纳指100', 'ETF'), ('159696', '纳指100', 'ETF'), ('161130', '纳指100', 'LOF'),
    ('513500', '标普500', 'ETF'), ('159612', '标普500', 'ETF'), ('513650', '标普500', 'ETF'), ('159655', '标普500', 'ETF'), ('161125', '标普500', 'LOF'),
]
def _pz(code):
    p = os.path.join(RAW, 'qdii', f'pz_{code}.js')
    st = STATUS[f'东方财富净值:{code}'] = get(f'https://fund.eastmoney.com/pingzhongdata/{code}.js', p, check=lambda t: 'Data_netWorthTrend' in t, src='eastmoney')
    if not os.path.exists(p): return None
    t = open(p, encoding='utf-8', errors='ignore').read()
    m = re.search(r'var Data_netWorthTrend\s*=\s*(\[.*?\]);', t, flags=re.S)
    if not m: return None
    tz8 = dt.timezone(dt.timedelta(hours=8))
    nav = {dt.datetime.fromtimestamp(x['x'] / 1000, tz8).date().isoformat(): x['y'] for x in json.loads(m.group(1)) if x.get('y')}
    name = (re.search(r'var fS_name\s*=\s*"([^"]*)"', t) or [None, None])[1]
    scale = None
    m = re.search(r'var Data_fluctuationScale\s*=\s*(\{.*?\});', t, flags=re.S)
    if m:
        try:
            sc = json.loads(m.group(1)); scale = dict(v=sc['series'][-1]['y'], date=sc['categories'][-1])
        except Exception: pass
    return dict(nav=nav, name=name, scale=scale, st=st)
def build_qdii():
    funds = []; old = prev('qdii'); olds = {f['code']: f for f in old.get('funds', [])}; fresh = 0; stale = 0
    for code, idx, typ in QDII:
        secid = ('1.' if code.startswith('5') else '0.') + code
        name, px, st = em_kline(secid, beg='20180101'); time.sleep(0.3)
        z = _pz(code); time.sleep(0.3)
        f = None
        if px and z and z['nav']:
            nav = z['nav']
            d, c, n, pr, amt = [], [], [], [], []
            for day, close, amount in px:
                if day < '2019-01-01' or day not in nav: continue
                d.append(day); c.append(close); n.append(nav[day]); pr.append(round((close / nav[day] - 1) * 100, 3)); amt.append(round(amount / 1e8, 3))
            if d:
                last_px = px[-1]
                f = dict(code=code, name=z['name'] or name, idx=idx, type=typ, d=d, close=c, nav=n, prem=pr, amt=amt,
                         last_close=last_px[1], last_close_date=last_px[0], last_amt=round(last_px[2] / 1e8, 3),
                         nav_last_date=max(nav), scale=z['scale'])
        got = st == 'ok' and z and z['st'] == 'ok'
        if f is None and code in olds:   # 这只基金这次没抓到、也没有缓存：沿用上一版 data/qdii.json
            f = {k: v for k, v in olds[code].items() if k != 'stale'}
        if not f: continue
        # 这次没抓到（用的是缓存或上一版），而且场内收盘日早于最近一个美股交易日 → 标“未更新”
        if not got and f['last_close_date'] < SESSION: f['stale'] = True; stale += 1
        else: fresh += 1
        funds.append(f)
    out = dict(funds=funds, generated=dt.datetime.now().strftime('%Y-%m-%d %H:%M'),
               src='场内收盘价：东方财富行情接口（不复权）；单位净值：东方财富基金数据（pingzhongdata）。溢价 = 同一天的收盘价 ÷ 同一天的单位净值 − 1。')
    if not fresh: out['generated'] = old.get('generated', out['generated'])
    return stamp(out, old, fresh > 0, stale, max((f['d'][-1] for f in funds), default=None))   # 数据截至 = 最新一个能算溢价的日子（净值日期）

def _count(name, obj):
    if name == 'world': return len(obj.get('indices', [])) + len(obj.get('cmdty', []))
    return len(obj.get({'calendar': 'events', 'earnings': 'rows', 'qdii': 'funds'}[name], []))

def run():
    os.makedirs(OUT, exist_ok=True)
    meta = {}
    for name, var, fn in (('world', 'WD', build_world), ('calendar', 'CAL', build_calendar), ('earnings', 'ERN', build_earnings), ('qdii', 'QD', build_qdii)):
        before = set(STATUS)
        try:
            obj = fn()
            obj['status'] = {k: v for k, v in STATUS.items() if k not in before}
            n_new, n_old = _count(name, obj), _count(name, prev(name))
            if n_new == 0 and n_old > 0:   # 保险：这次一条都没有，就不覆盖上一版
                meta[name] = 'kept previous (0 items)'; continue
            dump(name, var, obj)
            meta[name] = f"ok {n_new} 条，沿用旧数据 {obj.get('stale_n', 0)} 条，数据截至 {obj.get('asof')}"
            if name == 'world':   # 首页行情条用的小文件：每条只留最近 30 个交易日
                dump('snap', 'SNAP', {k: [dict(id=o['id'], name=o['name'], group=o['group'], d=o["d"][-30:], v=o["v"][-30:], **({'stale': True} if o.get('stale') else {})) for o in obj[k]] for k in ('indices', 'cmdty')})
        except Exception as e:
            import traceback; traceback.print_exc()
            meta[name] = f'failed: {e}'   # 失败时 data/{name}.js 保持上一版
    bad = {k: v for k, v in STATUS.items() if v != 'ok'}
    print('extra_data（扩展数据，失败不阻止发布）：')
    for k, v in meta.items(): print(f'  {k}: {v}')
    print(f'  非 ok 请求 {len(bad)} / {len(STATUS)}：', dict(list(bad.items())[:20]))
    return meta

if __name__ == '__main__':
    run()
