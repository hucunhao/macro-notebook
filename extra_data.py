#!/usr/bin/env python3
"""
Market Dashboard 扩展数据：全球股指、商品汇率、经济日历、财报日历、QDII 溢价。
由 update_data.py 调用（每一块单独 try/except，失败只影响自己，沿用 raw/ 里上次下载的文件）。
也可以单独运行：python3 extra_data.py [--offline]

来源（都不需要登录，也不伪装浏览器；请求头写明是个人研究脚本）：
- 东方财富 行情 K 线接口 push2his.eastmoney.com（全球股指、COMEX 金银铜、美元指数、离岸人民币、场内 ETF 收盘价）
- 东方财富 基金数据 fund.eastmoney.com/pingzhongdata（QDII 基金单位净值历史、规模）
- FRED 发布日历 fred.stlouisfed.org/releases/calendar（CPI、非农、GDP、PCE 等的发布日期，美国中部时间）
- 美联储 FOMC 会议日程 federalreserve.gov
- 纳斯达克 财报日历 api.nasdaq.com/api/calendar/earnings
"""
import json, os, re, sys, time, html, subprocess, datetime as dt

ROOT = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(ROOT, 'raw'); OUT = os.path.join(ROOT, 'data')
OFFLINE = '--offline' in sys.argv
HUA = "macro-notebook/1.0 (personal research script)"
TODAY = dt.date.today()
STATUS = {}

def get(url, path, timeout=40, check=None, headers=()):
    """下载到 path，失败保留旧文件。返回 ok / cached / missing"""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if OFFLINE: return 'cached' if os.path.exists(path) else 'missing'
    tmp = path + '.tmp'
    cmd = ['curl', '-sL', '--compressed', '-m', str(timeout), '-o', tmp, '-w', '%{http_code}', '-A', HUA]
    for h in headers: cmd += ['-H', h]
    cmd.append(url)
    try: code = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout + 10).stdout.strip()
    except Exception: code = '000'
    good = code == '200' and os.path.exists(tmp) and os.path.getsize(tmp) > 50
    if good and check:
        try: good = bool(check(open(tmp, encoding='utf-8', errors='ignore').read()))
        except Exception: good = False
    if good: os.replace(tmp, path); return 'ok'
    if os.path.exists(tmp): os.remove(tmp)
    return 'cached' if os.path.exists(path) else 'missing'

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
    STATUS['东方财富:' + secid] = get(url, p, check=lambda t: '"klines"' in t and json.loads(t).get('data'))
    try: d = json.load(open(p))['data']
    except Exception: return None, []
    rows = []
    for k in d['klines']:
        a = k.split(',')
        try: rows.append((a[0], float(a[1]), float(a[2]) if len(a) > 2 and a[2] not in ('', '-') else 0.0))
        except ValueError: pass
    return d.get('name'), rows

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
    out = {'indices': [], 'cmdty': [], 'src': '东方财富行情接口（push2his.eastmoney.com）日线收盘，不含分红；各市场收盘时间不同。', 'start': '2016-01-01'}
    for key, items in (('indices', WORLD), ('cmdty', CMDTY)):
        for it in items:
            name, rows = em_kline(it[1]); time.sleep(0.3)
            rows = [r for r in rows if r[0] >= '2016-01-01']
            if not rows: continue
            o = dict(id=it[0], name=it[2], group=it[3], d=[r[0] for r in rows], v=[round(r[1], 4) for r in rows])
            if len(it) > 4: o['unit'] = it[4]
            out[key].append(o)
    return out

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
    ev = []
    for rid, (nm, desc, imp) in RELEASES.items():
        p = os.path.join(RAW, 'cal', f'fred_{rid}.html')
        STATUS[f'FRED 日历:{rid}'] = get(f'https://fred.stlouisfed.org/releases/calendar?rid={rid}&vs={vs}&ve={ve}', p, check=lambda t: 'Economic Release Calendar' in t)
        time.sleep(0.4)
        if not os.path.exists(p): continue
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
    STATUS['美联储 FOMC 日程'] = get('https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm', p, check=lambda t: 'FOMC Meetings' in t)
    fomc = []
    if os.path.exists(p):
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
    return dict(events=ev, fomc=fomc, from_=vs.isoformat(), to=ve.isoformat(), generated=dt.datetime.now().strftime('%Y-%m-%d %H:%M'),
                note='时间已换算成台北时间。发布日期来自 FRED 发布日历（美国中部时间）和美联储官网；政府停摆等情况会让日期变动，以官方为准。')

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
    rows = []; days = 0; d = TODAY - dt.timedelta(days=1)
    while days < 12:
        d += dt.timedelta(days=1)
        if d.weekday() >= 5: continue
        days += 1
        p = os.path.join(RAW, 'earnings', f'{d}.json')
        STATUS[f'纳斯达克财报:{d}'] = get(f'https://api.nasdaq.com/api/calendar/earnings?date={d}', p, headers=['Accept: application/json'], check=lambda t: '"data"' in t)
        time.sleep(0.5)
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
    return dict(rows=rows, generated=dt.datetime.now().strftime('%Y-%m-%d %H:%M'),
                note='纳斯达克官网财报日历；只列标普 500 成分股里市值 300 亿美元以上的公司。日期是美国日期：盘前 ≈ 台北当天晚上，盘后 ≈ 台北第二天早上。公司可能改期。')

# ---------------------------------------------------------------- 4. QDII 溢价
QDII = [  # (代码, 跟踪, 类型)
    ('513100', '纳指100', 'ETF'), ('159941', '纳指100', 'ETF'), ('513300', '纳指100', 'ETF'), ('159632', '纳指100', 'ETF'), ('159659', '纳指100', 'ETF'),
    ('159660', '纳指100', 'ETF'), ('159501', '纳指100', 'ETF'), ('513110', '纳指100', 'ETF'), ('513390', '纳指100', 'ETF'), ('159513', '纳指100', 'ETF'),
    ('513870', '纳指100', 'ETF'), ('159696', '纳指100', 'ETF'), ('161130', '纳指100', 'LOF'),
    ('513500', '标普500', 'ETF'), ('159612', '标普500', 'ETF'), ('513650', '标普500', 'ETF'), ('159655', '标普500', 'ETF'), ('161125', '标普500', 'LOF'),
]
def _pz(code):
    p = os.path.join(RAW, 'qdii', f'pz_{code}.js')
    STATUS[f'东方财富净值:{code}'] = get(f'https://fund.eastmoney.com/pingzhongdata/{code}.js', p, check=lambda t: 'Data_netWorthTrend' in t)
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
    return dict(nav=nav, name=name, scale=scale)
def build_qdii():
    funds = []
    for code, idx, typ in QDII:
        secid = ('1.' if code.startswith('5') else '0.') + code
        name, px = em_kline(secid, beg='20180101'); time.sleep(0.3)
        z = _pz(code); time.sleep(0.3)
        if not px or not z or not z['nav']: continue
        nav = z['nav']
        d, c, n, pr, amt = [], [], [], [], []
        for day, close, amount in px:
            if day < '2019-01-01' or day not in nav: continue
            d.append(day); c.append(close); n.append(nav[day]); pr.append(round((close / nav[day] - 1) * 100, 3)); amt.append(round(amount / 1e8, 3))
        if not d: continue
        last_px = px[-1]
        funds.append(dict(code=code, name=z['name'] or name, idx=idx, type=typ, d=d, close=c, nav=n, prem=pr, amt=amt,
                          last_close=last_px[1], last_close_date=last_px[0], last_amt=round(last_px[2] / 1e8, 3),
                          nav_last_date=max(nav), scale=z['scale']))
    return dict(funds=funds, generated=dt.datetime.now().strftime('%Y-%m-%d %H:%M'),
                src='场内收盘价：东方财富行情接口（不复权）；单位净值：东方财富基金数据（pingzhongdata）。溢价 = 同一天的收盘价 ÷ 同一天的单位净值 − 1。')

def run():
    os.makedirs(OUT, exist_ok=True)
    meta = {}
    for name, var, fn in (('world', 'WD', build_world), ('calendar', 'CAL', build_calendar), ('earnings', 'ERN', build_earnings), ('qdii', 'QD', build_qdii)):
        before = set(STATUS)
        try:
            obj = fn()
            obj['status'] = {k: v for k, v in STATUS.items() if k not in before}
            dump(name, var, obj); meta[name] = 'ok'
            if name == 'world':   # 首页行情条用的小文件：每条只留最近 300 个交易日
                dump('snap', 'SNAP', {k: [dict(id=o['id'], name=o['name'], group=o['group'], d=o["d"][-30:], v=o["v"][-30:]) for o in obj[k]] for k in ('indices', 'cmdty')})
        except Exception as e:
            import traceback; traceback.print_exc()
            meta[name] = f'failed: {e}'   # 失败时 data/{name}.js 保持上一版
    bad = {k: v for k, v in STATUS.items() if v != 'ok'}
    print('extra_data:', meta, '| 非 ok 来源', len(bad), dict(list(bad.items())[:12]))
    return meta

if __name__ == '__main__':
    run()
