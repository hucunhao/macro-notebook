#!/usr/bin/env python3
"""
标普 500 成分股数据（热力图 HM、广度 BR、涨跌榜、估值 VAL、同业比较 RV 用）
来源（全部免费、公开、不需要登录；请求头写明身份，不伪装浏览器）：
  - 成分股名单和 GICS 行业：维基百科 “List of S&P 500 companies”（CC BY-SA）
  - 收盘和涨跌：纳斯达克官网历史日线的收盘价（1 日涨跌 = 价格日收盘 ÷ 前一收盘 − 1）
  - 市值：纳斯达克官网股票筛选器。筛选器的最新价常常还停在上一交易日，不用它当收盘
  - 每只股票约 2 年日线：纳斯达克官网历史行情
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
def per_ticker(tickers, session=None, hist_only=False):
    frm = (TODAY - dt.timedelta(days=760)).isoformat()
    session = session or us_session()
    def one(t):
        s = t.replace('.', '_')
        hp = os.path.join(RAW, 'hist', s + '.json')
        # 18 小时内的文件如果最后一根还早于最近收盘日，必须重下。否则早间抓到的周三收盘会挡住周四的日线。
        hours = 18 if _hist_reached(hp, session) else None
        a = get(f'https://api.nasdaq.com/api/quote/{t}/historical?assetclass=stocks&fromdate={frm}&todate={TODAY}&limit=9999', hp, check=lambda x: '"rows"' in x, fresh_hours=hours)
        b = True if hist_only else get(f'https://api.nasdaq.com/api/analyst/{t}/earnings-forecast', os.path.join(RAW, 'fcst', s + '.json'), check=lambda x: 'yearlyForecast' in x, fresh_hours=18)
        return t, a, b
    res = {}
    with cf.ThreadPoolExecutor(4) as ex:
        for i, (t, a, b) in enumerate(ex.map(one, tickers)):
            res[t] = (a, b)
            if i % 50 == 0: print(f'  {i}/{len(tickers)}', flush=True)
    STATUS['纳斯达克 个股日线'] = f'{sum(1 for a, b in res.values() if a)}/{len(tickers)}'
    if not hist_only: STATUS['纳斯达克 分析师预测'] = f'{sum(1 for a, b in res.values() if b)}/{len(tickers)}'
def read_hist_file(path):
    try: rows = json.load(open(path))['data']['tradesTable']['rows']
    except Exception: return [], []
    xs = sorted((dt.datetime.strptime(r['date'], '%m/%d/%Y').date().isoformat(), float(r['close'].replace('$', '').replace(',', ''))) for r in rows)
    return [d for d, _ in xs], [v for _, v in xs]
def read_hist(t):
    return read_hist_file(os.path.join(RAW, 'hist', t.replace('.', '_') + '.json'))
def _hist_reached(path, session):
    """文件够新，而且最后一根日线已经到了这个收盘日，才跳过下载。"""
    if not session or not os.path.exists(path): return False
    if time.time() - os.path.getmtime(path) >= 18 * 3600: return False
    d, v = read_hist_file(path)
    return bool(d) and d[-1] >= session
def us_session(now=None):
    """最近一个已收盘的美股交易日（美东 16:15 之后算当天；不含节假日）。与 quality_gate.py 一致。"""
    from zoneinfo import ZoneInfo
    t = (now or dt.datetime.now(dt.timezone.utc)).astimezone(ZoneInfo('America/New_York'))
    d = t.date()
    if d.weekday() >= 5 or (t.hour, t.minute) < (16, 15):
        d -= dt.timedelta(days=1)
        while d.weekday() >= 5: d -= dt.timedelta(days=1)
    return d.isoformat()
def taipei_now():
    from zoneinfo import ZoneInfo
    return dt.datetime.now(ZoneInfo('Asia/Taipei')).strftime('%Y-%m-%d %H:%M')
def choose_price_session(last_dates, target=None, min_share=0.5):
    """画面用哪一个收盘日。

    优先用 target（最近一个已收盘交易日），只要至少一半股票的日线已经到了那一天。
    没到一半，就用大多数股票已经到达的最近一天，而不是全体里最晚的一根，也不是文件生成时间。
    没到这一天的股票不放进涨跌（见 price_fields），所以标题日期和颜色是同一天。
    返回 (日期或 None, 日线已到这一天或更晚的只数)。
    """
    dates = [d for d in last_dates if d]
    if not dates: return None, 0
    n = len(dates)
    def reached(day): return sum(d >= day for d in dates)
    if target and reached(target) / n >= min_share:
        return target, reached(target)
    best = None
    for day in sorted(set(dates)):
        if reached(day) / n >= min_share: best = day
    return best, (reached(best) if best else 0)
def session_bar(dates, values, session):
    """这一天的官方收盘；没有这一天就退到不晚于它的最后一根。

    d1 只用两笔收盘：这一根，和它前面那一根。不使用筛选器的涨跌幅。
    """
    if not dates or not values: return None
    i = bisect.bisect_right(dates, session) - 1 if session else len(values) - 1
    if i < 0: return None
    px = values[i]
    d1 = (px / values[i - 1] - 1) if i >= 1 else None
    return dict(px=px, px_date=dates[i], d1=d1, on_session=bool(session) and dates[i] == session, i=i)
def keep_prior_close(old, session):
    """下载失败时留下一版收盘。没有记录过价格日的旧数字不用（说不清是哪一天）。"""
    if not old or old.get('px') is None or not old.get('px_date'): return None
    on = bool(session) and old.get('px_date') == session
    return dict(px=old['px'], px_date=old['px_date'], d1=old.get('d1') if on else None, on_session=on, i=None, kept=True)
def price_fields(dates, values, session, old=None):
    bar = session_bar(dates, values, session) if dates and values else None
    if bar is None: return keep_prior_close(old, session) or dict(px=None, px_date=None, d1=None, on_session=False, i=None, kept=False)
    bar['kept'] = False
    if not bar['on_session']: bar['d1'] = None   # 不是这一天的涨跌，不放进热力图
    return bar
def returns_at(dates, values, i):
    """窗口都结束在下标 i 这一根收盘，不混进更晚或更早的另一天。"""
    empty = dict(w1=None, m1=None, ytd=None, y1=None, a50=None, a200=None, hi52=None, lo52=None)
    if i is None or i < 0 or not values: return empty
    def back(days):
        j = bisect.bisect_right(dates, (dt.date.fromisoformat(dates[i]) - dt.timedelta(days=days)).isoformat()) - 1
        return values[i] / values[j] - 1 if j >= 0 else None
    j = bisect.bisect_right(dates, f'{int(dates[i][:4]) - 1}-12-31') - 1
    ytd = values[i] / values[j] - 1 if j >= 0 else None
    def ma(k):
        if i + 1 < k: return None
        return sum(values[i - k + 1:i + 1]) / k
    y1 = values[max(0, i - 251):i + 1]
    m50, m200 = ma(50), ma(200)
    return dict(w1=back(7), m1=back(30), ytd=ytd, y1=back(365),
                a50=(values[i] > m50) if m50 else None, a200=(values[i] > m200) if m200 else None,
                hi52=(values[i] >= max(y1) * 0.999) if y1 else None, lo52=(values[i] <= min(y1) * 1.001) if y1 else None)
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

def price_note(price_session, on_n, lag_n, generated, mismatch, target, sample=None):
    day = price_session or '—'
    parts = [f'1 日涨跌 = {day} 的收盘价 ÷ 前一个交易日的收盘价 − 1。两笔都是纳斯达克历史日线里的收盘，不是筛选器上的最新价。']
    parts.append(f'{on_n} 只有 {day} 的收盘。')
    if lag_n:
        who = ''
        if sample:
            shown = list(sample)[:8]
            who = '（' + '、'.join(shown) + ('…' if lag_n > len(shown) else '') + '）'
        parts.append(f'{lag_n} 只没有这一天的日线{who}，不放进这一天的涨跌。')
    if target and price_session and price_session < target:
        parts.append(f'最近一个已收盘交易日是 {target}，但还没有足够多的日线，所以画面停在 {day}。')
    parts.append(f'文件生成于 {generated}（台北时间）。生成时间不是价格日期。市值来自纳斯达克筛选器，可能不是同一个交易日。')
    if mismatch: parts.append(f'筛选器最新价和 {day} 收盘相差超过 0.5% 的有 {mismatch} 只，画面没有采用筛选器的涨跌。')
    return ''.join(parts)
def breadth_of(H):
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
    return br
def pack_sp500(rows, H, price_session, session, mismatch, br=None):
    generated = taipei_now()
    on_n = sum(1 for r in rows if r.get('on_session'))
    lag_syms = [r['t'] for r in rows if not r.get('on_session')]
    rnd = lambda x: round(x, 4) if isinstance(x, float) else x
    return dict(asof=price_session, price_session=price_session, target_session=session,
                price_session_n=on_n, lagging_n=len(lag_syms), lagging_sample=lag_syms[:12],
                screener_mismatch_n=mismatch, generated=generated, status=dict(STATUS), n=len(rows),
                price_note=price_note(price_session, on_n, len(lag_syms), generated, mismatch, session, lag_syms),
                rows=[{k: rnd(v) for k, v in r.items()} for r in rows], breadth=br if br is not None else breadth_of(H),
                notes=dict(src='维基百科（成分股和 GICS 行业）、纳斯达克官网历史日线的收盘价（涨跌）、纳斯达克筛选器（市值，可能不是同一个交易日）、SEC EDGAR（财报）',
                           fund='财报数字取 SEC XBRL frames 里最近一个已申报的完整财年（表里“财年截至”那一列）；资产负债表取最近一个季末。不是“过去 12 个月”。少数公司（例如换了 SEC 编号的）财报缺失，显示“—”。',
                           pe='市盈率 = 市值 ÷ 最近财年净利润；前瞻市盈率 = 股价 ÷ 紧接着的下一个财年的一致预期 EPS（纳斯达克页面，数据商 Zacks）；隐含增长 = 市盈率 ÷ 前瞻市盈率 − 1（市场预期的下一年利润增长，粗略）；PEG = 市盈率 ÷（隐含增长 × 100）。',
                           surv='广度用的是现在的成分股名单往回算，过去被剔除的公司不在里面（幸存者偏差）。'))
def write_sp500(out, H):
    try:
        old = json.load(open(os.path.join(OUT, 'sp500.json'))); old_h = sum(1 for r in old.get('rows', []) if r.get('hist'))
    except Exception: old_h = 0
    have = sum(1 for r in out['rows'] if r.get('hist'))
    if old_h and have < 0.8 * old_h:
        print(f'sp500: 这次只有 {have} 家有日线（上一版 {old_h} 家），保留上一版 data/sp500*，不覆盖'); return False
    for ext, pre in (('json', ''), ('js', 'window.SP = ')):
        with open(os.path.join(OUT, f'sp500.{ext}'), 'w') as f: f.write(pre + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + (';' if pre else ''))
    allD = sorted({x for d, _ in H.values() for x in d}); pos = {x: i for i, x in enumerate(allD)}
    hh = {}
    for t, (d, v) in H.items():
        arr = [None] * len(allD)
        for x, y in zip(d, v): arr[pos[x]] = round(y, 2)
        hh[t] = arr
    with open(os.path.join(OUT, 'sp500_hist.js'), 'w') as f: f.write('window.SPH = ' + json.dumps(dict(dates=allD, h=hh), separators=(',', ':')) + ';')
    print('sp500 rows', len(out['rows']), 'on', out.get('price_session'), out.get('price_session_n'), 'lagging', out.get('lagging_n'), 'generated', out.get('generated'))
    return True
def load_published_hist():
    p = os.path.join(OUT, 'sp500_hist.js')
    if not os.path.exists(p): return {}
    raw = open(p, encoding='utf-8').read()
    obj = json.loads(raw[raw.find('{'):].rstrip().rstrip(';'))
    H = {}
    for t, arr in obj['h'].items():
        d, v = [], []
        for i, x in enumerate(arr):
            if x is not None: d.append(obj['dates'][i]); v.append(float(x))
        if d: H[t] = (d, v)
    return H
def reprice():
    """用已发布的日线重算热力图价格；日线还没到最近收盘日的，只补下这几只。不重下财报和名单。"""
    session = us_session()
    old = json.load(open(os.path.join(OUT, 'sp500.json')))
    H = load_published_hist()
    for t in list(H):
        d, v = read_hist(t)
        if d: H[t] = (d, v)
    symbols = [r['t'] for r in old['rows']]
    behind = [t for t in symbols if t not in H or H[t][0][-1] < session]
    print(f'reprice 目标收盘日 {session}：{len(symbols) - len(behind)} 只日线已到，{len(behind)} 只要补')
    if behind and not OFFLINE:
        per_ticker(behind, session=session, hist_only=True)
        for t in behind:
            d, v = read_hist(t)
            if d: H[t] = (d, v)
    ps, _reached = choose_price_session([H[t][0][-1] for t in symbols if t in H], target=session)
    scr = {}
    sp = os.path.join(RAW, 'nasdaq_screener.json')
    if os.path.exists(sp):
        try:
            for r in json.load(open(sp))['data']['rows']:
                scr[r['symbol']] = float(r['lastsale'].replace('$', '').replace(',', ''))
        except Exception: scr = {}
    rows, mismatch = [], 0
    blank = dict(w1=None, m1=None, ytd=None, y1=None, a50=None, a200=None, hi52=None, lo52=None)
    for r in old['rows']:
        t = r['t']; d, v = H.get(t, ([], []))
        prior = r if r.get('px_date') else None
        bar = price_fields(d, v, ps, prior)
        rets = returns_at(d, v, bar.get('i')) if bar.get('on_session') else blank
        ref = scr.get(nq_sym(t), r.get('px'))
        if ref and bar.get('on_session') and bar.get('px') and abs(ref / bar['px'] - 1) > 0.005: mismatch += 1
        nr = dict(r)
        if bar.get('px') and r.get('px') and r.get('fpe') and r['px'] != bar['px']:
            feps = r['px'] / r['fpe']
            if feps > 0:
                fpe = bar['px'] / feps
                pe = r.get('pe')
                gimp = (pe / fpe - 1) if pe and fpe else None
                nr['fpe'] = fpe; nr['g'] = gimp; nr['peg'] = (pe / (gimp * 100)) if pe and gimp and gimp > 0 else None
        nr.update(px=bar['px'], px_date=bar['px_date'], on_session=bool(bar.get('on_session')), d1=bar['d1'], hist=bool(v), **rets)
        rows.append(nr)
    out = pack_sp500(rows, H, ps, session, mismatch)
    out['status'] = dict(old.get('status') or {})
    out['status'].update(STATUS)
    write_sp500(out, H)
def build():
    M = members(); scr = screener()
    session = us_session()
    if not OFFLINE: per_ticker([m['t'] for m in M], session=session)
    F = sec_frames()
    try: prev = {r['t']: r for r in json.load(open(os.path.join(OUT, 'sp500.json'))).get('rows', [])}
    except Exception: prev = {}
    H = {}
    for m in M:
        d, v = read_hist(m['t'])
        if v: H[m['t']] = (d, v)
    price_session, _reached = choose_price_session([d[-1] for d, _ in H.values()], target=session)
    rows = []
    mismatch = 0
    for m in M:
        t = m['t']; q = scr.get(nq_sym(t), {}); d, v = H.get(t, ([], []))
        bar = price_fields(d, v, price_session, prev.get(t))
        px, px_date, on_session = bar['px'], bar['px_date'], bar['on_session']
        mcap = q.get('mcap') or (prev.get(t) or {}).get('mcap')
        rets = returns_at(d, v, bar.get('i')) if on_session else dict(w1=None, m1=None, ytd=None, y1=None, a50=None, a200=None, hi52=None, lo52=None)
        if q.get('px') and on_session and px and abs(q['px'] / px - 1) > 0.005: mismatch += 1
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
            px_date=px_date, on_session=on_session,
            d1=bar['d1'], w1=rets['w1'], m1=rets['m1'], ytd=rets['ytd'], y1=rets['y1'],
            a50=rets['a50'], a200=rets['a200'], hi52=rets['hi52'], lo52=rets['lo52'],
            pe=pe, fpe=fpe, fpe_fy=fyl, peg=(pe/(gimp*100)) if pe and gimp and gimp > 0 else None,
            ev_ebitda=sd(ev, ebitda) if ebitda and ebitda > 0 else None, ev_sales=sd(ev, rev), ps=sd(mcap, rev), pb=sd(mcap, eq) if eq and eq > 0 else None,
            gm=sd(gp, rev), om=sd(oi, rev), nm=sd(ni, rev), roe=sd(ni, eq) if eq and eq > 0 else None, g=gimp, fy_end=fy_end, hist=bool(v)))
    # 同一家公司有两类股票（如 GOOGL/GOOG）时，纳斯达克给的市值都是整家公司的；热力图和合计估值只算市值较大的那一类
    seen = {}
    for r, m in sorted(zip(rows, M), key=lambda x: -(x[0]['mcap'] or 0)):
        if m['cik'] and m['cik'] in seen: r['dup'] = seen[m['cik']]
        elif m['cik']: seen[m['cik']] = r['t']
    out = pack_sp500(rows, H, price_session, session, mismatch)
    write_sp500(out, H)

if __name__ == '__main__':
    reprice() if '--reprice' in sys.argv else build()
