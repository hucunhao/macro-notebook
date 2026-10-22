#!/usr/bin/env python3
"""
标普 500 成分股数据（热力图 HM、广度 BR、涨跌榜、估值 VAL、同业比较 RV 用）
来源（全部免费、公开、不需要登录；请求头写明身份，不伪装浏览器）：
  - 成分股名单和 GICS 行业：维基百科 “List of S&P 500 companies”（CC BY-SA）
  - 当日收盘、涨跌、市值：纳斯达克官网 股票筛选器（一次请求拿全部美股）
  - 每只股票约 2 年日线：纳斯达克官网 历史行情
  - 下一财年一致预期 EPS：纳斯达克官网 分析师预测页
  - 财报数字：美国 SEC EDGAR XBRL frames 接口（按会计科目一次取全部公司）
用法：python3 constituents.py            # 联网抓取（约 10–20 分钟），失败的沿用 raw/sp500 里的旧文件
      python3 constituents.py --offline  # 只用已有文件重建 data/sp500.js
"""
import os, sys, json, time, re, html, datetime as dt, subprocess, concurrent.futures as cf, statistics as st, bisect
ROOT = os.path.dirname(os.path.abspath(__file__)); RAW = os.path.join(ROOT, 'raw', 'sp500'); OUT = os.path.join(ROOT, 'data')
OFFLINE = '--offline' in sys.argv
CONTACT = os.environ.get('MS_CONTACT', 'hch@mail.grokbot.com')
UA = f'macro-notebook/1.0 (personal research; {CONTACT})'   # SEC 和维基百科要求写联系方式
NQ_UA = 'macro-notebook/1.0 (personal research script)'       # 纳斯达克会拒绝带邮箱的请求头，所以单独一个（同样不伪装浏览器）
TODAY = dt.date.today()
os.makedirs(os.path.join(RAW, 'hist'), exist_ok=True); os.makedirs(os.path.join(RAW, 'fcst'), exist_ok=True); os.makedirs(os.path.join(RAW, 'sec'), exist_ok=True)
STATUS = {}

def get(url, path, accept='application/json', timeout=40, check=None, fresh_hours=None, ua=None):
    """下载到 path；失败保留旧文件。fresh_hours：旧文件够新就不重新下载（方便中断后续跑）"""
    if OFFLINE: return os.path.exists(path)
    if fresh_hours and os.path.exists(path) and time.time() - os.path.getmtime(path) < fresh_hours*3600: return True
    tmp = path + '.tmp'
    for attempt in range(2):
        try:
            code = subprocess.run(['curl', '-sL', '-m', str(timeout), '-A', ua or (NQ_UA if 'nasdaq.com' in url else UA), '-H', f'Accept: {accept}', '-o', tmp, '-w', '%{http_code}', url], capture_output=True, text=True, timeout=timeout+10).stdout.strip()
        except Exception: code = '000'
        ok = code == '200' and os.path.exists(tmp) and os.path.getsize(tmp) > 50
        if ok and check:
            try: ok = check(open(tmp, encoding='utf-8', errors='ignore').read())
            except Exception: ok = False
        if ok: os.replace(tmp, path); return True
        time.sleep(1.5)
    if os.path.exists(tmp): os.remove(tmp)
    return os.path.exists(path)

# ---------- 1. 成分股名单 ----------
def members():
    p = os.path.join(RAW, 'wiki_sp500.json')
    STATUS['维基百科 成分股名单'] = get('https://en.wikipedia.org/w/api.php?action=parse&page=List_of_S%26P_500_companies&prop=text&format=json&formatversion=2', p, check=lambda t: 'constituents' in t)
    h = json.load(open(p))['parse']['text']
    tb = h[h.index('id="constituents"'):]; tb = tb[:tb.index('</table>')]
    rows = []
    for tr in re.findall(r'<tr>(.*?)</tr>', tb, re.S)[1:]:
        cells = [html.unescape(re.sub(r'<[^>]+>', '', c)).strip() for c in re.findall(r'<td[^>]*>(.*?)</td>', tr, re.S)]
        if len(cells) >= 7: rows.append(dict(t=cells[0], n=cells[1], sec=cells[2], sub=cells[3], cik=int(cells[6]) if cells[6].isdigit() else None))
    return rows

SEC_ZH = {'Information Technology':'信息技术','Communication Services':'通信服务','Consumer Discretionary':'可选消费','Financials':'金融','Health Care':'医疗保健',
          'Industrials':'工业','Consumer Staples':'必需消费','Energy':'能源','Materials':'材料','Utilities':'公用事业','Real Estate':'房地产'}

# ---------- 2. 纳斯达克 ----------
def nq_sym(t): return t.replace('.', '/')
def screener():
    p = os.path.join(RAW, 'nasdaq_screener.json')
    STATUS['纳斯达克 股票筛选器'] = get('https://api.nasdaq.com/api/screener/stocks?tableonly=true&download=true', p, check=lambda t: '"rows"' in t)
    out = {}
    for r in json.load(open(p))['data']['rows']:
        try: out[r['symbol']] = dict(px=float(r['lastsale'].replace('$', '').replace(',', '')), mcap=float(r['marketCap'] or 0) or None, d1=float(r['pctchange'].replace('%', '') or 0)/100)
        except Exception: pass
    return out
def per_ticker(tickers):
    frm = (TODAY - dt.timedelta(days=760)).isoformat()
    def one(t):
        s = t.replace('.', '_')
        a = get(f'https://api.nasdaq.com/api/quote/{t}/historical?assetclass=stocks&fromdate={frm}&todate={TODAY}&limit=9999', os.path.join(RAW, 'hist', s + '.json'), check=lambda x: '"rows"' in x, fresh_hours=18)
        b = get(f'https://api.nasdaq.com/api/analyst/{t}/earnings-forecast', os.path.join(RAW, 'fcst', s + '.json'), check=lambda x: 'yearlyForecast' in x, fresh_hours=18)
        return t, a, b
    res = {}
    with cf.ThreadPoolExecutor(4) as ex:
        for i, (t, a, b) in enumerate(ex.map(one, tickers)):
            res[t] = (a, b)
            if i % 50 == 0: print(f'  {i}/{len(tickers)}', flush=True)
    STATUS['纳斯达克 个股日线'] = f'{sum(1 for a, b in res.values() if a)}/{len(tickers)}'
    STATUS['纳斯达克 分析师预测'] = f'{sum(1 for a, b in res.values() if b)}/{len(tickers)}'
def read_hist(t):
    p = os.path.join(RAW, 'hist', t.replace('.', '_') + '.json')
    try: rows = json.load(open(p))['data']['tradesTable']['rows']
    except Exception: return [], []
    xs = sorted((dt.datetime.strptime(r['date'], '%m/%d/%Y').date().isoformat(), float(r['close'].replace('$', '').replace(',', ''))) for r in rows)
    return [d for d, _ in xs], [v for _, v in xs]
def read_fwd_eps(t, fy_end=None):
    p = os.path.join(RAW, 'fcst', t.replace('.', '_') + '.json')
    try: rows = json.load(open(p))['data']['yearlyForecast']['rows']
    except Exception: return None, None
    for r in rows:
        try: end = dt.datetime.strptime(r['fiscalEnd'], '%b %Y').date()
        except Exception: continue
        # 前瞻 = 最近已申报财年之后的下一个财年（隐含增长就是一年的增长）；不知道财年时取 90 天以后结束的第一个财年
        ok = end > dt.date.fromisoformat(fy_end) + dt.timedelta(days=300) if fy_end else end >= TODAY + dt.timedelta(days=90)
        if ok and r.get('consensusEPSForecast') is not None:
            return float(r['consensusEPSForecast']), r['fiscalEnd']
    return None, None

# ---------- 3. SEC frames ----------
DUR = {'rev': ['Revenues', 'RevenueFromContractWithCustomerExcludingAssessedTax', 'RevenueFromContractWithCustomerIncludingAssessedTax', 'SalesRevenueNet'],
       'gp': ['GrossProfit'], 'cor': ['CostOfRevenue', 'CostOfGoodsAndServicesSold'], 'oi': ['OperatingIncomeLoss'], 'ni': ['NetIncomeLoss', 'NetIncomeLossAvailableToCommonStockholdersBasic', 'ProfitLoss'], 'da': ['DepreciationDepletionAndAmortization', 'DepreciationAndAmortization', 'DepreciationAmortizationAndAccretionNet']}
INST = {'eq': ['StockholdersEquity'], 'ltd': ['LongTermDebt', 'LongTermDebtNoncurrent'], 'std': ['LongTermDebtCurrent', 'DebtCurrent'], 'cash': ['CashAndCashEquivalentsAtCarryingValue']}
def sec_frames():
    def frame(tax, tag, unit, per):
        p = os.path.join(RAW, 'sec', f'{tag}_{per}.json')
        ok = get(f'https://data.sec.gov/api/xbrl/frames/{tax}/{tag}/{unit}/{per}.json', p, check=lambda t: '"data"' in t, fresh_hours=20); time.sleep(0.15)
        if not ok: return {}
        return {r['cik']: (r['val'], r.get('end')) for r in json.load(open(p))['data']}
    F = {}
    yr = TODAY.year - 1
    for k, tags in DUR.items():
        F[k] = {}
        for per in (f'CY{yr-1}', f'CY{yr}', f'CY{yr+1}'):  # 取截止日最新的那个财年；CY{yr+1} 里只有财年已经结束并申报的公司
            for tag in reversed(tags):           # 同一截止日：列表前面的科目优先（营收取较大值）
                for cik, v in frame('us-gaap', tag, 'USD', per).items():
                    old = F[k].get(cik)
                    if old is None or old[1] < v[1] or (old[1] == v[1] and (k != 'rev' or v[0] > old[0])): F[k][cik] = v
    for k, tags in INST.items():
        F[k] = {}
        for per in (f'CY{yr}Q2I', f'CY{yr}Q4I', f'CY{yr+1}Q2I'):
            for tag in reversed(tags):
                F[k].update(frame('us-gaap', tag, 'USD', per))
    STATUS['SEC EDGAR frames'] = f"{len(F['rev'])} 家公司有营收"
    return F

def build():
    M = members(); scr = screener()
    if not OFFLINE: per_ticker([m['t'] for m in M])
    F = sec_frames()
    rows, H = [], {}
    for m in M:
        t = m['t']; q = scr.get(nq_sym(t), {}); d, v = read_hist(t)
        if v: H[t] = (d, v)
        px = q.get('px') or (v[-1] if v else None); mcap = q.get('mcap')
        def ret(days):
            if not v: return None
            i = bisect.bisect_right(d, (dt.date.fromisoformat(d[-1]) - dt.timedelta(days=days)).isoformat()) - 1
            return v[-1]/v[i] - 1 if i >= 0 else None
        ytd = None
        if v:
            i = bisect.bisect_right(d, f'{int(d[-1][:4])-1}-12-31') - 1; ytd = v[-1]/v[i] - 1 if i >= 0 else None
        ma = lambda k: sum(v[-k:])/k if len(v) >= k else None
        y1 = v[-252:] if v else []
        c = m['cik']; g = lambda k: F[k].get(c, (None, None))[0] if c else None
        fy_end = F['ni'].get(c, (None, None))[1] if c else None
        # 损益表科目只用和净利润同一个财年的数，避免把不同年份混在一起
        same = lambda k: F[k][c][0] if c and c in F[k] and F[k][c][1] == fy_end else None
        rev, gp, cor, oi, ni, da, eq = same('rev'), same('gp'), same('cor'), same('oi'), g('ni'), same('da'), g('eq')
        if gp is None and rev is not None and cor is not None: gp = rev - cor
        debt = (g('ltd') or 0) + (g('std') or 0); cash = g('cash') or 0
        pe = mcap/ni if mcap and ni and ni > 0 else None
        feps, fyl = read_fwd_eps(t, fy_end)
        fpe = px/feps if px and feps and feps > 0 else None
        gimp = (pe/fpe - 1) if pe and fpe else None
        ev = mcap + debt - cash if mcap else None
        ebitda = (oi + (da or 0)) if oi is not None else None
        sd = lambda a, b: a/b if a is not None and b not in (None, 0) else None
        rows.append(dict(t=t, n=m['n'], sec=SEC_ZH.get(m['sec'], m['sec']), sec_en=m['sec'], sub=m['sub'], mcap=mcap, px=px,
            d1=q.get('d1') if q else (v[-1]/v[-2]-1 if len(v) > 1 else None), w1=ret(7), m1=ret(30), ytd=ytd, y1=ret(365),
            a50=(v[-1] > ma(50)) if ma(50) else None, a200=(v[-1] > ma(200)) if ma(200) else None,
            hi52=(v[-1] >= max(y1)*0.999) if y1 else None, lo52=(v[-1] <= min(y1)*1.001) if y1 else None,
            pe=pe, fpe=fpe, fpe_fy=fyl, peg=(pe/(gimp*100)) if pe and gimp and gimp > 0 else None,
            ev_ebitda=sd(ev, ebitda) if ebitda and ebitda > 0 else None, ev_sales=sd(ev, rev), ps=sd(mcap, rev), pb=sd(mcap, eq) if eq and eq > 0 else None,
            gm=sd(gp, rev), om=sd(oi, rev), nm=sd(ni, rev), roe=sd(ni, eq) if eq and eq > 0 else None, g=gimp, fy_end=fy_end, hist=bool(v)))
    # 同一家公司有两类股票（如 GOOGL/GOOG）时，纳斯达克给的市值都是整家公司的；热力图和合计估值只算市值较大的那一类
    seen = {}
    for r, m in sorted(zip(rows, M), key=lambda x: -(x[0]['mcap'] or 0)):
        if m['cik'] and m['cik'] in seen: r['dup'] = seen[m['cik']]
        elif m['cik']: seen[m['cik']] = r['t']
    # 广度时间序列：每天有多少成分股站上 50 / 200 日线（用现在的成分股名单回算，有幸存者偏差）
    days = sorted({x for d, _ in H.values() for x in d})[-320:]
    br = {'d': [], 'p200': [], 'p50': [], 'n': []}
    idx = {t: {x: i for i, x in enumerate(d)} for t, (d, v) in H.items()}
    for day in days:
        a2 = a5 = n2 = n5 = 0
        for t, (d, v) in H.items():
            i = idx[t].get(day)
            if i is None: continue
            if i >= 199: n2 += 1; a2 += v[i] > sum(v[i-199:i+1])/200
            if i >= 49: n5 += 1; a5 += v[i] > sum(v[i-49:i+1])/50
        if n2 >= 300: br['d'].append(day); br['p200'].append(round(a2/n2*100, 1)); br['p50'].append(round(a5/n5*100, 1)); br['n'].append(n2)
    asof = max((d[-1] for d, _ in H.values()), default=None)
    rnd = lambda x: round(x, 4) if isinstance(x, float) else x
    out = dict(asof=asof, generated=dt.datetime.now().strftime('%Y-%m-%d %H:%M'), status=STATUS, n=len(rows),
               rows=[{k: rnd(v) for k, v in r.items()} for r in rows], breadth=br,
               notes=dict(src='维基百科（成分股和 GICS 行业）、纳斯达克官网（价格、市值、分析师一致预期）、SEC EDGAR（财报）',
                          fund='财报数字取 SEC XBRL frames 里最近一个已申报的完整财年（表里“财年截至”那一列）；资产负债表取最近一个季末。不是“过去 12 个月”。少数公司（例如换了 SEC 编号的）财报缺失，显示“—”。',
                          pe='市盈率 = 市值 ÷ 最近财年净利润；前瞻市盈率 = 股价 ÷ 紧接着的下一个财年的一致预期 EPS（纳斯达克页面，数据商 Zacks）；隐含增长 = 市盈率 ÷ 前瞻市盈率 − 1（市场预期的下一年利润增长，粗略）；PEG = 市盈率 ÷（隐含增长 × 100）。',
                          surv='广度用的是现在的成分股名单往回算，过去被剔除的公司不在里面（幸存者偏差）。'))
    # 保险：这次有日线的公司比上一版少很多（来源大面积连不上），就保留上一版，不覆盖
    try:
        old = json.load(open(os.path.join(OUT, 'sp500.json'))); old_h = sum(1 for r in old.get('rows', []) if r.get('hist'))
    except Exception: old_h = 0
    if old_h and len(H) < 0.8 * old_h:
        print(f'sp500: 这次只有 {len(H)} 家有日线（上一版 {old_h} 家），保留上一版 data/sp500*，不覆盖'); return
    for ext, pre in (('json', ''), ('js', 'window.SP = ')):
        with open(os.path.join(OUT, f'sp500.{ext}'), 'w') as f: f.write(pre + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + (';' if pre else ''))
    # GP 页用的个股日线（按需加载）：共用日期轴，缺的天写 null
    allD = sorted({x for d, _ in H.values() for x in d}); pos = {x: i for i, x in enumerate(allD)}
    hh = {}
    for t, (d, v) in H.items():
        arr = [None]*len(allD)
        for x, y in zip(d, v): arr[pos[x]] = round(y, 2)
        hh[t] = arr
    with open(os.path.join(OUT, 'sp500_hist.js'), 'w') as f: f.write('window.SPH = ' + json.dumps(dict(dates=allD, h=hh), separators=(',', ':')) + ';')
    print('sp500 rows', len(rows), 'with hist', len(H), 'breadth days', len(br['d']), 'status', STATUS)

if __name__ == '__main__': build()
