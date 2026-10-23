#!/usr/bin/env python3
"""
Market Dashboard 数据更新脚本
用法:  python3 update_data.py            # 联网抓取最新数据, 失败的源沿用 raw/ 里的旧文件
       python3 update_data.py --offline  # 不联网, 只用 raw/ 里已有文件重建 data/
产出:  data/series.json + data/series.js   (观察页用的所有序列)
       data/week1.json/js, data/week2.json/js  (学习页)
       /workspace/quant_course/week1_results.md, week2_results.md
浏览器从 file:// 打开时不能 fetch JSON, 所以每个 JSON 同时写一份 .js (window.XXX = {...})。
"""
import csv, json, os, sys, time, math, random, datetime as dt, statistics as st, subprocess, bisect
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

ROOT = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(ROOT, 'raw'); OUT = os.path.join(ROOT, 'data')
OFFLINE = '--offline' in sys.argv
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36"
# 诚实的请求头：说明这是个人研究脚本，不伪装成浏览器
HUA = "macro-notebook/1.0 (personal research script)"
# CNN 对非浏览器 UA 直接回 418（I'm a teapot）。按“不伪装浏览器绕过拦截”的约定，默认不抓 CNN，沿用上次文件；
# 只有手动设置环境变量 MS_CNN_BROWSER_UA=1 才会按旧方式抓取（工作流默认不设）。
CNN_BROWSER_UA = os.environ.get('MS_CNN_BROWSER_UA') == '1'
TODAY = dt.date.today()
# 课程结果 markdown 写到哪里：本机是 /workspace/quant_course；在 GitHub Actions 等别的机器上写到 content/results
QC = os.environ.get('MS_QC_DIR', '/workspace/quant_course')
try: os.makedirs(QC, exist_ok=True)
except OSError: QC = os.path.join(ROOT, 'content', 'results'); os.makedirs(QC, exist_ok=True)
STATUS = {}   # source -> ok / cached / missing

TRIES = max(1, int(os.environ.get('MS_RETRIES', '3')))
BACKOFF = (2, 6, 12)
# 测试用：MS_SIMULATE_FAIL=fred,treasury,cboe,nasdaq 让这些来源“连不上”（不发请求，直接按失败处理）
SIM_FAIL = {x.strip() for x in os.environ.get('MS_SIMULATE_FAIL', '').split(',') if x.strip()}
_HOST_FAILS = {}   # 同一主机连续 3 个请求彻底失败后，后面只试 1 次、超时缩短

def fetch(url, path, headers=(), timeout=60, check=None, ua=UA, src=None, tries=None):
    """下载到 path; 失败（重试后仍失败）则保留旧文件。返回 'ok' / 'cached' / 'missing'"""
    fallback = lambda: 'cached' if os.path.exists(path) else 'missing'
    if OFFLINE or (src and src in SIM_FAIL):
        return fallback()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    host = url.split('/')[2]; dead = _HOST_FAILS.get(host, 0) >= 3
    n, tmo = (1, min(timeout, 15)) if dead else (tries or TRIES, timeout)
    tmp = path + '.tmp'
    for i in range(n):
        if i: time.sleep(BACKOFF[min(i - 1, len(BACKOFF) - 1)] + random.random())
        cmd = ['curl', '-sL', '--connect-timeout', '10', '-m', str(tmo), '-o', tmp, '-w', '%{http_code}'] + (['-A', ua] if ua else [])
        for h in headers: cmd += ['-H', h]
        cmd.append(url)
        try:
            code = subprocess.run(cmd, capture_output=True, text=True, timeout=tmo + 10).stdout.strip()
        except Exception:
            code = '000'
        good = code == '200' and os.path.exists(tmp) and os.path.getsize(tmp) > 100
        if good and check:
            try: good = check(open(tmp, encoding='utf-8', errors='ignore').read())
            except Exception: good = False
        if good:
            os.replace(tmp, path); _HOST_FAILS[host] = 0; return 'ok'
        if os.path.exists(tmp): os.remove(tmp)
    _HOST_FAILS[host] = _HOST_FAILS.get(host, 0) + 1
    return fallback()

# 核心来源：总览页（利率、信用、标普/纳指回撤、VIX、收益率曲线）要用的序列。只有它们“缺失”（抓不到且没有任何旧文件）才阻止发布。
# 其余来源（其它 FRED/纳斯达克序列、CNN、东方财富、FRED 日历、财报日历、成分股）都只记录、不阻止。
CORE_SOURCES = ['FRED:DGS10', 'FRED:DGS2', 'FRED:BAA10Y', 'FRED:BAMLH0A0HYM2', 'FRED:NASDAQ100', 'Cboe:SPX', 'Cboe:VIX']
CORE_SERIES = ['UST10', 'UST2', 'T10Y2Y', 'BAA10Y', 'HY_OAS', 'SPX', 'NDX', 'VIX']

def us_session(now=None):
    """最近一个已经收盘的美股交易日（美东 16:15 之后算当天；不考虑节假日）"""
    from zoneinfo import ZoneInfo
    t = (now or dt.datetime.now(dt.timezone.utc)).astimezone(ZoneInfo('America/New_York'))
    d = t.date()
    if d.weekday() >= 5 or (t.hour, t.minute) < (16, 15):
        d -= dt.timedelta(days=1)
        while d.weekday() >= 5: d -= dt.timedelta(days=1)
    return d.isoformat()

# ---------------------------------------------------------------- 1. 抓取
FRED = ['BAA10Y','AAA10Y','BAMLH0A0HYM2','BAMLH0A3HYC','BAMLH0A1HYBB','BAMLH0A2HYB','BAMLC0A0CM','BAMLC0A4CBBB',
        'DGS10','DGS2','DGS30','DGS3MO','T10Y2Y','T10Y3M','DFII10','T10YIE','VIXCLS','NASDAQCOM','NASDAQ100','SP500',
        'DTWEXBGS','DCOILWTICO','DCOILBRENTEU','CPILFESL','CPILFENS','DTB3','PCEPILFE','DFEDTARU','DFEDTARL','DEXCHUS','DEXUSEU','DEXJPUS']
ETFS = ['SPY','QQQ','RSP','IWM','HYG','JNK','LQD','GLD','TLT','UUP','USO','EEM','FXI','VGK']
# 标普 11 个行业 SPDR ETF（市场页用）
SECTORS = [('XLK','信息技术'),('XLC','通信服务'),('XLY','可选消费'),('XLF','金融'),('XLV','医疗保健'),('XLI','工业'),
           ('XLP','必需消费'),('XLE','能源'),('XLB','材料'),('XLU','公用事业'),('XLRE','房地产')]

def fetch_all():
    os.makedirs(os.path.join(RAW,'fred'), exist_ok=True)
    for s in FRED:
        # 注意: FRED 会拦截“浏览器样式”的 User-Agent, 用 curl 默认 UA 才能下载; 失败再试 ALFRED (同一机构的历史版本库)
        p = os.path.join(RAW,'fred',s+'.csv')
        r = fetch(f'https://fred.stlouisfed.org/graph/fredgraph.csv?id={s}', p, timeout=30, check=lambda t: t.startswith('observation_date'), ua=None, src='fred', tries=2)
        if r != 'ok':
            r = fetch(f'https://alfred.stlouisfed.org/graph/alfredgraph.csv?id={s}', p, timeout=40, check=lambda t: t.startswith('observation_date'), ua=None, src='fred', tries=2)
        STATUS['FRED:'+s] = r
    y = TODAY.year
    for yr in (y-1, y):
        for typ, nm in (('daily_treasury_yield_curve','par'),('daily_treasury_real_yield_curve','real')):
            p = os.path.join(RAW,'treasury',f'treasury_{nm}_yields_{yr}.csv')
            STATUS[f'Treasury:{nm}{yr}'] = fetch(f'https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/{yr}/all?type={typ}&field_tdr_date_value={yr}&page&_format=csv', p, check=lambda t: t.startswith('Date'), ua=HUA, src='treasury')
    # 直接打 cdn-api.cboe.com（cdn.cboe.com 会 307 跳转）；官方日线有时比收盘晚几个小时才挂上
    STATUS['Cboe:SPX'] = fetch('https://cdn-api.cboe.com/api/global/us_indices/daily_prices/SPX_History.csv', os.path.join(RAW,'other','cboe_SPX.csv'), check=lambda t: t.startswith('DATE'), ua=HUA, src='cboe')
    STATUS['Cboe:VVIX'] = fetch('https://cdn-api.cboe.com/api/global/us_indices/daily_prices/VVIX_History.csv', os.path.join(RAW,'other','cboe_VVIX.csv'), check=lambda t: t.startswith('DATE'), ua=HUA, src='cboe')
    STATUS['Cboe:VIX'] = fetch('https://cdn-api.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv', os.path.join(RAW,'other','cboe_VIX.csv'), check=lambda t: t.startswith('DATE'), ua=HUA, src='cboe')
    frm = (TODAY - dt.timedelta(days=3700)).isoformat()
    for t in ETFS + [x for x,_ in SECTORS]:
        STATUS['Nasdaq:'+t] = fetch(f'https://api.nasdaq.com/api/quote/{t}/historical?assetclass=etf&fromdate={frm}&todate={TODAY}&limit=99999',
              os.path.join(RAW,'nasdaq',t+'.json'), headers=['Accept: application/json'], check=lambda s: '"rows"' in s, ua=HUA, src='nasdaq')
        time.sleep(0.5)
    if not CNN_BROWSER_UA:
        for k, f in (('CNN:F&G 1y','cnn_fear_greed.json'), ('CNN:F&G 2020+','cnn_fear_greed_since2020.json')):
            STATUS[k] = 'skipped' if os.path.exists(os.path.join(RAW,'cnn',f)) else 'missing'
        return
    hd = ['Referer: https://www.cnn.com/', 'Origin: https://www.cnn.com']
    STATUS['CNN:F&G 1y'] = fetch('https://production.dataviz.cnn.io/index/fearandgreed/graphdata', os.path.join(RAW,'cnn','cnn_fear_greed.json'), headers=hd, check=lambda s: 'fear_and_greed' in s)
    STATUS['CNN:F&G 2020+'] = fetch('https://production.dataviz.cnn.io/index/fearandgreed/graphdata/2020-07-15', os.path.join(RAW,'cnn','cnn_fear_greed_since2020.json'), headers=hd, check=lambda s: 'fear_and_greed' in s)

# ---------------------------------------------------------------- 2. 解析
def iso(d): return d.isoformat()
def read_fred(s):
    p = os.path.join(RAW,'fred',s+'.csv')
    if not os.path.exists(p): return []
    out = []
    for i,row in enumerate(csv.reader(open(p))):
        if i == 0 or len(row) < 2 or row[1] in ('', '.'): continue
        out.append((row[0], float(row[1])))
    return out
def read_mdY(p, col):
    if not os.path.exists(p): return []
    out = []
    for r in csv.DictReader(open(p)):
        try: out.append((dt.datetime.strptime(r['DATE'] if 'DATE' in r else r['Date'],'%m/%d/%Y').date().isoformat(), float(r[col])))
        except Exception: pass
    return sorted(out)
def read_nasdaq(t):
    p = os.path.join(RAW,'nasdaq',t+'.json')
    try: rows = json.load(open(p))['data']['tradesTable']['rows']
    except Exception: return []
    return sorted((dt.datetime.strptime(r['date'],'%m/%d/%Y').date().isoformat(), float(r['close'].replace(',','').replace('$',''))) for r in rows)
def read_treasury(kind, col):
    out = {}
    for f in sorted(os.listdir(os.path.join(RAW,'treasury'))):
        if f.startswith(f'treasury_{kind}_yields_'):
            for r in csv.DictReader(open(os.path.join(RAW,'treasury',f))):
                if r.get(col): out[dt.datetime.strptime(r['Date'],'%m/%d/%Y').date().isoformat()] = float(r[col])
    return out
def merge(base, extra):
    d = dict(base); 
    for k,v in extra.items():
        if k not in d: d[k] = v
    return sorted(d.items())
def merge_series(*series_list):
    """多来源日线按日期合并：同一天以后出现的值为准（用来补 Cboe / FRED 谁先挂上收盘价）。"""
    d = {}
    for ser in series_list:
        for day, val in ser:
            d[day] = val
    return sorted(d.items())
def ratio(a, b):
    db = dict(b); return [(d, x/db[d]) for d,x in a if d in db]
def yoy(ser, lag_days=365):
    ds = [d for d,_ in ser]; out = []
    for d,v in ser:
        target = (dt.date.fromisoformat(d) - dt.timedelta(days=lag_days)).isoformat()
        i = bisect.bisect_right(ds, target) - 1
        if i >= 0 and (dt.date.fromisoformat(d) - dt.date.fromisoformat(ds[i])).days < lag_days + 10:
            out.append((d, (v/ser[i][1]-1)*100))
    return out

def build_series():
    S = {}
    def add(id, name, unit, data, source, url, note='', group='', bp=False, start_cut='1990-01-01', nd=4):
        data = [(d,v) for d,v in data if d >= start_cut]
        if bp: data = [(d, round(v*100, 1)) for d,v in data]
        S[id] = dict(name=name, unit=unit, source=source, url=url, note=note, group=group,
                     start=data[0][0] if data else None, end=data[-1][0] if data else None,
                     d=[d for d,_ in data], v=[round(v,nd) for _,v in data])
    F = 'FRED（圣路易斯联储）'
    fu = lambda s: f'https://fred.stlouisfed.org/series/{s}'
    short3 = 'FRED 自 2026 年 4 月起只提供这条序列最近 3 年的数据，所以历史很短。'
    # credit
    add('HY_OAS','高收益债利差（HY OAS）','bp',read_fred('BAMLH0A0HYM2'),F,fu('BAMLH0A0HYM2'),short3,'credit',bp=True)
    add('CCC_OAS','CCC 级债利差（最弱一层）','bp',read_fred('BAMLH0A3HYC'),F,fu('BAMLH0A3HYC'),short3,'credit',bp=True)
    add('BB_OAS','BB 级债利差','bp',read_fred('BAMLH0A1HYBB'),F,fu('BAMLH0A1HYBB'),short3,'credit',bp=True)
    add('IG_OAS','投资级债利差（IG OAS）','bp',read_fred('BAMLC0A0CM'),F,fu('BAMLC0A0CM'),short3,'credit',bp=True)
    add('BAA10Y','Baa 公司债减 10 年美债','bp',read_fred('BAA10Y'),F,fu('BAA10Y'),'穆迪 Baa 级公司债收益率减 10 年美债，1986 年起有数据。它是 HY OAS 的“表亲”，不是同一条序列。','credit',bp=True,start_cut='1986-01-01')
    # rates: FRED + Treasury 官方最新几天
    for fid, col, nm in (('DGS10','10 Yr','10 年美债收益率'),('DGS2','2 Yr','2 年美债收益率'),('DGS30','30 Yr','30 年美债收益率'),('DGS3MO','3 Mo','3 个月美债收益率')):
        add('UST'+fid[3:], nm, '%', merge(read_fred(fid), read_treasury('par', col)), 'FRED + 美国财政部', fu(fid), '最近几天用财政部官网数据补齐。', 'rates')
    s10 = dict(S['UST10']['d'] and zip(S['UST10']['d'], S['UST10']['v']))
    s2 = dict(zip(S['UST2']['d'], S['UST2']['v'])); s3m = dict(zip(S['UST3MO']['d'], S['UST3MO']['v']))
    add('T10Y2Y','10 年减 2 年（曲线斜率）','%', [(d, s10[d]-s2[d]) for d in sorted(s10) if d in s2], 'FRED + 美国财政部', fu('T10Y2Y'), '由 10 年和 2 年收益率相减得到。', 'rates')
    add('T10Y3M','10 年减 3 个月','%', [(d, s10[d]-s3m[d]) for d in sorted(s10) if d in s3m], 'FRED + 美国财政部', fu('T10Y3M'), '', 'rates')
    real = merge(read_fred('DFII10'), read_treasury('real','10 YR'))
    add('REAL10','10 年实际利率（扣通胀）','%', real, 'FRED + 美国财政部', fu('DFII10'), '2003 年起。', 'rates')
    dr = dict(real)
    add('BE10','10 年通胀预期（盈亏平衡）','%', [(d, s10[d]-dr[d]) for d in sorted(s10) if d in dr], '由 10 年名义减实际利率计算', fu('T10YIE'), '', 'rates')
    add('FEDU','联邦基金利率目标上限','%', read_fred('DFEDTARU'), F, fu('DFEDTARU'), '2008 年 12 月起。', 'rates')
    cpi = read_fred('CPILFESL')
    # 先行条件② 用：BLS 口径的核心 CPI 同比 = 未季调指数(CPILFENS) 本月 / 去年同月 − 1（网页端再四舍五入到 1 位小数）
    nsa = dict(read_fred('CPILFENS'))
    nyoy = []
    for d, v in sorted(nsa.items()):
        p = f'{int(d[:4])-1}{d[4:]}'
        if p in nsa: nyoy.append((d, (v/nsa[p]-1)*100))
    add('CORECPI_NSA_YOY','核心 CPI 同比（BLS 口径，未季调）','%', nyoy, F, fu('CPILFENS'), '用未季调指数计算，和 BLS 公布口径一致。', 'macro', nd=6)
    sa = dict(cpi); ks = sorted(sa); ann = []
    for i, d in enumerate(ks):
        y, m = int(d[:4]), int(d[5:7]); m3 = m - 3; y3 = y + (m3 - 1)//12; m3 = (m3 - 1) % 12 + 1
        p = f'{y3:04d}-{m3:02d}-01'
        if p in sa: ann.append((d, ((sa[d]/sa[p])**4 - 1)*100))
    add('CORECPI_3M_ANN','核心 CPI 3 个月年化（季调）','%', ann, F, fu('CPILFESL'), '季调指数 3 个月变化的 4 次方年化，只做展示。', 'macro', nd=6)
    add('CORECPI_YOY','核心 CPI 同比','%', [(d, v) for d,v in yoy(cpi, 365)], F, fu('CPILFESL'), '月度数据，按同比计算（保留 6 位小数，先行条件②要比大小）。', 'macro', nd=6)
    # equities：Cboe 与 FRED 谁先挂上当日收盘就用谁（早间定时常见 Cboe/FRED 还差一天）
    spx = merge_series(read_mdY(os.path.join(RAW,'other','cboe_SPX.csv'), 'SPX'), read_fred('SP500'))
    add('SPX','标普 500 指数','点', spx, 'Cboe 官方历史 + FRED SP500', 'https://cdn-api.cboe.com/api/global/us_indices/daily_prices/SPX_History.csv', '价格指数，不含分红。优先用 Cboe；FRED SP500 用来补晚挂的那天。', 'equity', start_cut='1975-01-01')
    add('NDX','纳斯达克 100 指数','点', read_fred('NASDAQ100'), F, fu('NASDAQ100'), '价格指数，不含分红。1986 年起。FRED 有时比收盘晚几个小时才更新。', 'equity', start_cut='1986-01-01')
    add('COMP','纳斯达克综合指数','点', read_fred('NASDAQCOM'), F, fu('NASDAQCOM'), '', 'equity')
    vix = merge_series(read_mdY(os.path.join(RAW,'other','cboe_VIX.csv'), 'CLOSE'), read_fred('VIXCLS'))
    add('VIX','VIX 恐慌指数','点', vix, 'Cboe 官方历史 + FRED VIXCLS', 'https://www.cboe.com/tradable_products/vix/vix_historical_data/', '优先用 Cboe；FRED VIXCLS 用来补晚挂的那天。', 'equity')
    vv = read_mdY(os.path.join(RAW,'other','cboe_VVIX.csv'), 'VVIX')
    if vv: add('VVIX','VVIX（VIX 的波动）','点', vv, 'Cboe 官方历史', 'https://www.cboe.com/us/indices/dashboard/vvix/', '2006 年起。', 'equity')
    E = {t: read_nasdaq(t) for t in ETFS}
    nq = lambda t: f'https://www.nasdaq.com/market-activity/etf/{t.lower()}/historical'
    short10 = '纳斯达克网站只给最近约 10 年的日线。'
    for t, nm in (('SPY','SPY 标普 ETF'),('QQQ','QQQ 纳指 ETF'),('RSP','RSP 等权重标普 ETF'),('IWM','IWM 罗素 2000 小盘 ETF'),('HYG','HYG 高收益债 ETF'),('JNK','JNK 垃圾债 ETF'),('LQD','LQD 投资级债 ETF'),
                  ('GLD','GLD 黄金 ETF'),('TLT','TLT 20 年以上美债 ETF'),('UUP','UUP 美元指数 ETF'),('USO','USO 原油 ETF'),('EEM','EEM 新兴市场 ETF'),('FXI','FXI 中国大盘 ETF'),('VGK','VGK 欧洲 ETF')):
        add(t, nm, '美元', E[t], '纳斯达克官网', nq(t), short10 + ' 价格不含分红。', 'etf')
    add('RSP_SPY','等权 / 市值权重（RSP÷SPY）','比值', ratio(E['RSP'],E['SPY']), '由纳斯达克数据计算', nq('rsp'), '数值下降 = 涨幅越来越集中在少数巨头。'+short10, 'equity')
    add('HYG_LQD','高收益 / 投资级（HYG÷LQD）','比值', ratio(E['HYG'],E['LQD']), '由纳斯达克数据计算', nq('hyg'), '下降 = 风险偏好收缩、信用走弱。'+short10, 'credit')
    add('IWM_SPY','小盘 / 大盘（IWM÷SPY）','比值', ratio(E['IWM'],E['SPY']), '由纳斯达克数据计算', nq('iwm'), '数值下降 = 小盘股跑输。'+short10, 'equity')
    # dollar & global
    add('USD_BROAD','美元广义指数（美联储）','指数', read_fred('DTWEXBGS'), F, fu('DTWEXBGS'), '2006 年起。', 'global')
    add('USDCNY','美元兑人民币','元', read_fred('DEXCHUS'), F, fu('DEXCHUS'), '', 'global')
    add('EURUSD','欧元兑美元','美元', read_fred('DEXUSEU'), F, fu('DEXUSEU'), '', 'global')
    wti = read_fred('DCOILWTICO')
    add('WTI','WTI 原油','美元/桶', wti, F, fu('DCOILWTICO'), 'FRED 原油数据通常晚几天。', 'global')
    add('BRENT','布伦特原油','美元/桶', read_fred('DCOILBRENTEU'), F, fu('DCOILBRENTEU'), 'FRED 原油数据通常晚几天。', 'global')
    add('WTI_YOY','WTI 原油同比','%', yoy(wti), F, fu('DCOILWTICO'), '', 'global')
    # CNN
    fg = {}
    try:
        c = json.load(open(os.path.join(RAW,'cnn','cnn_fear_greed.json')))
        c2 = json.load(open(os.path.join(RAW,'cnn','cnn_fear_greed_since2020.json')))
        ddate = lambda p: dt.datetime.fromtimestamp(p['x']/1000, dt.timezone.utc).date().isoformat()
        hist = {ddate(p): p['y'] for p in c2['fear_and_greed_historical']['data']}
        hist.update({ddate(p): p['y'] for p in c['fear_and_greed_historical']['data']})
        add('FG','CNN 恐惧贪婪指数','分', sorted(hist.items()), 'CNN', 'https://www.cnn.com/markets/fear-and-greed', '2020 年 7 月起。', 'equity')
        names = {'market_momentum_sp500':('标普相对 125 日均线（动能）','标普 500 和它 125 日均线的距离'),
                 'stock_price_strength':('股价强度','创 52 周新高与新低股票数之差'),
                 'stock_price_breadth':('股价广度','上涨与下跌股票的成交量对比（麦克莱伦成交量求和）'),
                 'put_call_options':('看跌/看涨期权比','5 日平均，越高越怕'),
                 'market_volatility_vix':('波动率','VIX 和它 50 日均线的对比'),
                 'safe_haven_demand':('避险需求','近 20 日股票回报减国债回报'),
                 'junk_bond_demand':('垃圾债需求','垃圾债和投资级债的收益率差')}
        subs = []
        for k,(nm,desc) in names.items():
            if k in c:
                subs.append(dict(key=k, name=nm, desc=desc, score=round(c[k]['score'],1), rating=c[k]['rating'],
                                 raw=round(c[k]['data'][-1]['y'],3), raw_date=ddate(c[k]['data'][-1])))
        f = c['fear_and_greed']
        fg = dict(score=round(f['score'],1), rating=f['rating'], date=f['timestamp'][:10], previous_close=round(f['previous_close'],1),
                  previous_1_week=round(f['previous_1_week'],1), previous_1_month=round(f['previous_1_month'],1), previous_1_year=round(f['previous_1_year'],1), subs=subs)
    except Exception as e:
        print('CNN parse failed', e)
    manual = json.load(open(os.path.join(ROOT,'manual_values.json'))) if os.path.exists(os.path.join(ROOT,'manual_values.json')) else {}
    core_status = {k: STATUS.get(k, 'cached' if OFFLINE else 'missing') for k in CORE_SOURCES}
    session = us_session()
    # 文件抓到了、但日线还停在上一交易日（来源晚挂收盘价）→ 不算“核心齐全”。
    # 这样 already_updated 不会跳过后面的备用定时，等 Cboe/FRED 挂上后再跑一次。
    lag = []
    for sid, src_key in (('SPX','Cboe:SPX'), ('NDX','FRED:NASDAQ100'), ('VIX','Cboe:VIX')):
        ser = S.get(sid) or {}
        end = (ser.get('d') or [None])[-1]
        if end and end < session:
            lag.append(f'{sid}={end}')
            if core_status.get(src_key) == 'ok':
                core_status[src_key] = 'lagging'   # 抓成功但缺最近收盘
    if lag:
        STATUS['core_equity_lag'] = ','.join(lag)
        print(f'警告：核心股指日线落后于最近已收盘交易日 {session}：' + ', '.join(lag))
    meta = dict(generated=dt.datetime.now().strftime('%Y-%m-%d %H:%M'), tz='台北时间', status=STATUS,
                session=session,                       # 这次运行时最近一个已收盘的美股交易日
                core=core_status, core_series=CORE_SERIES,
                core_ok=all(v == 'ok' for v in core_status.values()),   # 全部新抓且日线不落后
                core_lag=lag)
    return dict(meta=meta, series=S, fg=fg, manual=manual)

# ---------------------------------------------------------------- 2b. 市场页：收益率曲线 + 行业 ETF
MATS = [('1 Mo',1,'1月'),('2 Mo',2,'2月'),('3 Mo',3,'3月'),('4 Mo',4,'4月'),('6 Mo',6,'6月'),('1 Yr',12,'1年'),('2 Yr',24,'2年'),('3 Yr',36,'3年'),
        ('5 Yr',60,'5年'),('7 Yr',84,'7年'),('10 Yr',120,'10年'),('20 Yr',240,'20年'),('30 Yr',360,'30年')]
def build_markets():
    rows = {}
    for f in sorted(os.listdir(os.path.join(RAW,'treasury'))):
        if f.startswith('treasury_par_yields_'):
            for r in csv.DictReader(open(os.path.join(RAW,'treasury',f))):
                d = dt.datetime.strptime(r['Date'],'%m/%d/%Y').date()
                rows[d] = [float(r[c]) if r.get(c) else None for c,_,_ in MATS]
    curve = None
    if rows:
        ds = sorted(rows); last = ds[-1]
        def on_or_before(t):
            c = [d for d in ds if d <= t]; return c[-1] if c else None
        pts = [('最新', last), ('1 周前', on_or_before(last - dt.timedelta(days=7))), ('1 个月前', on_or_before(last - dt.timedelta(days=30))),
               ('1 年前', on_or_before(last - dt.timedelta(days=365)))]
        curve = dict(mats=[m for _,m,_ in MATS], labels=[l for _,_,l in MATS],
                     lines=[dict(name=n, date=d.isoformat(), y=rows[d]) for n,d in pts if d],
                     source='美国财政部 每日国债平价收益率曲线', url='https://home.treasury.gov/resource-center/data-chart-center/interest-rates/TextView?type=daily_treasury_yield_curve')
    sec = []
    for t, nm in SECTORS:
        x = read_nasdaq(t)
        if x: sec.append(dict(id=t, name=nm, d=[d for d,_ in x], v=[round(v,2) for _,v in x]))
    spy = read_nasdaq('SPY')
    return dict(curve=curve, sectors=sec, spy=dict(id='SPY', name='标普 500（SPY）', d=[d for d,_ in spy], v=[round(v,2) for _,v in spy]),
                sector_source='纳斯达克官网（SPDR 行业 ETF 日收盘价，约 10 年，不含分红）')

# ---------------------------------------------------------------- 3. Week 1: 回撤与分档
def drawdown_analysis(dates, px, tiers, start='1990-01-01'):
    """与 js/analysis.js 同一算法。tiers 为正数百分比, 如 [10,20,30]"""
    n = len(px); hi = []; hix = []; m = -1; mi = 0
    for k,p in enumerate(px):
        if p > m: m = p; mi = k
        hi.append(m); hix.append(mi)
    dd = [px[i]/hi[i]-1 for i in range(n)]
    i0 = next(i for i,d in enumerate(dates) if d >= start)
    # 事件: 从回撤首次越过某档开始, 到再创新高结束; 每档每个事件最多计一次
    events = []; cur = None
    for i in range(i0, n):
        if px[i] >= hi[i] and (i == 0 or px[i] > hi[i-1] - 1e-12):   # 新高 -> 结束当前事件
            if cur: cur['end'] = i; events.append(cur); cur = None
            continue
        for t in tiers:
            if dd[i] <= -t/100:
                if cur is None: cur = dict(start=i, peak=hi[i], peak_i=hix[i], trig={}, end=None)
                if t not in cur['trig']: cur['trig'][t] = i
    if cur: events.append(cur)
    rows = []
    for e in events:
        if not e['trig']: continue
        for t in tiers:
            if t not in e['trig']: continue
            i = e['trig'][t]
            row = dict(tier=t, date=dates[i], price=px[i], dd=dd[i], ep_start=dates[e['start']], peak_date=dates[e['peak_i']], peak=e['peak'])
            if i + 252 < n:
                row['ret12'] = px[i+252]/px[i]-1
                row['worse12'] = min(px[i:i+253])/px[i]-1
            else:
                row['ret12'] = None; row['worse12'] = None
            # 回到前高的交易日数
            row['recover_days'] = (e['end'] - i) if e['end'] is not None else None
            rows.append(row)
    return dd, hi, rows

def pct(xs, q):
    xs = sorted(xs); k = (len(xs)-1)*q; f = math.floor(k); c = math.ceil(k)
    return xs[f] if f == c else xs[f] + (xs[c]-xs[f])*(k-f)

def baseline(dates, px, start='1990-01-01'):
    n = len(px); i0 = next(i for i,d in enumerate(dates) if d >= start)
    r = [px[i+252]/px[i]-1 for i in range(i0, n-252)]
    w = [min(px[i:i+253])/px[i]-1 for i in range(i0, n-252)]
    return dict(n=len(r), ret_med=st.median(r), ret_p10=pct(r,.1), ret_p90=pct(r,.9), ret_mean=st.mean(r),
                w_med=st.median(w), w_p10=pct(w,.1), w_p90=pct(w,.9), share_w10=sum(x<=-0.10 for x in w)/len(w))

def summarize(rows, tiers):
    out = []
    for t in tiers:
        rs = [r for r in rows if r['tier']==t]; done = [r for r in rs if r['ret12'] is not None]
        o = dict(tier=t, episodes=len(rs), complete=len(done))
        if done:
            R = [r['ret12'] for r in done]; W = [r['worse12'] for r in done]
            o.update(ret_med=st.median(R), ret_mean=st.mean(R), ret_min=min(R), ret_p10=pct(R,.1), ret_p90=pct(R,.9),
                     w_med=st.median(W), share_w10=sum(x<=-0.10 for x in W)/len(W))
        out.append(o)
    return out

def build_week1(S):
    res = {}
    for key, tiers in (('SPX',[10,20,30]),('NDX',[15,25,35])):
        s = S['series'][key]; d, p = s['d'], s['v']
        dd, hi, rows = drawdown_analysis(d, p, tiers)
        res[key] = dict(tiers=tiers, rows=rows, summary=summarize(rows, tiers), baseline=baseline(d, p), last=d[-1], first=d[0])
    # 手工核对案例: 2022 年
    spx = S['series']['SPX']; d, p = spx['d'], spx['v']
    i_hi = max((i for i,x in enumerate(d) if '2021-12-01'<=x<='2022-02-01'), key=lambda i:p[i])
    i_lo = min((i for i,x in enumerate(d) if '2022-01-01'<=x<='2022-12-31'), key=lambda i:p[i])
    res['check2022'] = dict(high_date=d[i_hi], high=p[i_hi], low_date=d[i_lo], low=p[i_lo], dd=p[i_lo]/p[i_hi]-1,
        tiers_hit=[r['tier'] for r in res['SPX']['rows'] if r['ep_start'] >= '2022-01-01' and r['ep_start'] <= '2022-12-31'])
    assert res['check2022']['high_date'] == '2022-01-03', res['check2022']
    assert res['check2022']['tiers_hit'] == [10, 20], res['check2022']
    return res

# ---------------------------------------------------------------- 4. Week 2: 利差 z 分数
def weekly_friday(d, v):
    """每周取最后一个交易日(通常是周五)的值, 日期记为该周周五"""
    out = {}
    for x, y in zip(d, v):
        D = dt.date.fromisoformat(x); fri = D + dt.timedelta(days=(4 - D.weekday()) % 7 if D.weekday() <= 4 else -(D.weekday()-4))
        out[fri.isoformat()] = y
    return sorted(out.items())

def rolling_z(vals, window):
    """window=None 表示扩展窗口; 窗口只含过去的周, 不含当周"""
    z = []; pr = []
    for i in range(len(vals)):
        lo = 0 if window is None else i - window
        if lo < 0 or i - lo < 52:  # 至少 52 周才算
            z.append(None); pr.append(None); continue
        past = vals[lo:i]
        assert len(past) == i - lo and i not in range(lo, i)   # 当周不在窗口里
        m = sum(past)/len(past); sd = math.sqrt(sum((x-m)**2 for x in past)/len(past))
        z.append((vals[i]-m)/sd if sd > 0 else None)
        pr.append(sum(x < vals[i] for x in past)/len(past)*100)
    return z, pr

def build_week2(S):
    res = {}
    for key in ('BAA10Y','HY_OAS','IG_OAS','CCC_OAS'):
        s = S['series'][key]; w = weekly_friday(s['d'], s['v'])
        dates = [a for a,_ in w]; vals = [b for _,b in w]
        z3, p3 = rolling_z(vals, 156); z10, p10 = rolling_z(vals, 520); ze, pe = rolling_z(vals, None)
        m = st.mean(vals); sd = st.pstdev(vals); zla = [(x-m)/sd for x in vals]
        ch = [vals[i]-vals[i-1] for i in range(1,len(vals))]
        cm = st.mean(ch); csd = st.pstdev(ch)
        beyond3 = sum(abs(x-cm) > 3*csd for x in ch)
        expected3 = len(ch) * 0.0026998
        res[key] = dict(d=dates, v=vals, z3=z3, z10=z10, ze=ze, p3=p3, p10=p10, pe=pe, zla=zla, full_mean=m, full_sd=sd,
                        changes_mean=cm, changes_sd=csd, n_changes=len(ch), beyond3=beyond3, expected3=expected3,
                        beyond4=sum(abs(x-cm) > 4*csd for x in ch), expected4=len(ch)*6.334e-5)
    # 手工核对: 取 BAA10Y 某一周, 用 3 年窗口重算
    b = res['BAA10Y']; i = len(b['v'])-1
    past = b['v'][i-156:i]; m = sum(past)/156; sd = math.sqrt(sum((x-m)**2 for x in past)/156)
    assert abs((b['v'][i]-m)/sd - b['z3'][i]) < 1e-9
    res['handcheck'] = dict(series='BAA10Y', week=b['d'][i], today=b['v'][i], window_weeks=156, first5=past[:5], last5=past[-5:], mean=m, sd=sd, z=(b['v'][i]-m)/sd)
    # 诚实 vs 偷看
    cmp = []
    for ym in ('2007-06','2008-11','2020-03','2022-10'):
        idx = [k for k,x in enumerate(b['d']) if x.startswith(ym)]
        k = idx[-1]
        cmp.append(dict(month=ym, week=b['d'][k], spread=b['v'][k], ze=b['ze'][k], pe=b['pe'][k], z10=b['z10'][k], z3=b['z3'][k], zla=b['zla'][k]))
    res['compare'] = cmp
    return res

# ---------------------------------------------------------------- 5. 写文件
def dump(name, var, obj):
    js = json.dumps(obj, ensure_ascii=False, separators=(',',':'), allow_nan=False)
    open(os.path.join(OUT, name+'.json'),'w').write(js)
    open(os.path.join(OUT, name+'.js'),'w').write(f'window.{var}=' + js + ';\n')

def f1(x, pctv=True, nd=1):
    if x is None: return '未完成'
    return f'{x*100:+.{nd}f}%' if pctv else f'{x:.{nd}f}'

def write_md(w1, w2, S):
    qc = QC
    L = [f'# Week 1 结果：回撤与分档加仓（价格指数，不含分红）', '',
         f'生成时间：{S["meta"]["generated"]}（台北时间）。数据：标普 500 = Cboe SPX 官方历史（{w1["SPX"]["first"]} 起，统计从 1990-01-01 开始，前高包含 1990 年以前的收盘）；纳指 100 = FRED NASDAQ100（{w1["NDX"]["first"]} 起，统计从 1990-01-01 开始）。最后日期：SPX {w1["SPX"]["last"]}，NDX {w1["NDX"]["last"]}。',
         '', '定义：回撤 = 收盘 / 截至当日最高收盘 − 1。事件 = 回撤首次越过某档开始，到再创新高结束；同一事件中每档最多计一次。12 个月 = 252 个交易日；“后续最深再跌” = 触发后 252 个交易日内最低收盘 / 触发价 − 1。不足 252 天的标“未完成”，不计入统计。', '',
         f'手工核对（2022）：SPX 高点 {w1["check2022"]["high_date"]} {w1["check2022"]["high"]:.2f}，低点 {w1["check2022"]["low_date"]} {w1["check2022"]["low"]:.2f}，回撤 {w1["check2022"]["dd"]*100:.1f}%；触发档位 {w1["check2022"]["tiers_hit"]}（−30% 未触发）。代码断言已通过。', '']
    for key, nm in (('SPX','标普 500'),('NDX','纳斯达克 100')):
        r = w1[key]; b = r['baseline']
        L += [f'## {nm}', '', '### 汇总（对比基准）', '',
              '| 档位 | 事件数 | 已满 12 个月 | 12 月回报中位数 | 平均 | 10% 分位 | 90% 分位 | 最差 | 后续最深再跌中位数 | 后续再跌 ≥10% 的比例 |', '|---|---|---|---|---|---|---|---|---|---|']
        for s in r['summary']:
            if s['complete']:
                L.append(f"| −{s['tier']}% | {s['episodes']} | {s['complete']} | {f1(s['ret_med'])} | {f1(s['ret_mean'])} | {f1(s['ret_p10'])} | {f1(s['ret_p90'])} | {f1(s['ret_min'])} | {f1(s['w_med'])} | {s['share_w10']*100:.0f}% |")
            else:
                L.append(f"| −{s['tier']}% | {s['episodes']} | 0 | — | — | — | — | — | — | — |")
        L.append(f"| 基准：所有交易日（{b['n']} 天） | — | — | {f1(b['ret_med'])} | {f1(b['ret_mean'])} | {f1(b['ret_p10'])} | {f1(b['ret_p90'])} | — | {f1(b['w_med'])} | {b['share_w10']*100:.0f}% |")
        L += ['', '### 明细（每个事件每档一行）', '', '| 档位 | 前高日期 | 触发日 | 触发价 | 12 月回报 | 后续最深再跌 | 从触发到回到前高（交易日） |', '|---|---|---|---|---|---|---|']
        for x in r['rows']:
            L.append(f"| −{x['tier']}% | {x['peak_date']} | {x['date']} | {x['price']:.2f} | {f1(x['ret12'])} | {f1(x['worse12'])} | {x['recover_days'] if x['recover_days'] is not None else '还没回到'} |")
        L.append('')
    L += ['说明：前高指历史最高收盘。所以 2010、2011 年那种从局部高点跌 15–19% 的回调，因为当时还没回到 2007 年的历史高点，被算进 2007 年那一个事件里。\n\n注意：深档位的独立事件只有个位数，由 3–4 个案例算出的百分比只是故事，不是统计。', '']
    open(os.path.join(qc,'week1_results.md'),'w').write('\n'.join(L))
    b = w2['BAA10Y']; h = w2['HY_OAS']; ig = w2['IG_OAS']
    fz = lambda x: '—' if x is None else f'{x:+.2f}'
    fp = lambda x: '—' if x is None else f'{x:.0f}%'
    L = ['# Week 2 结果：信用利差 z 分数（周度，取每周最后一个交易日）', '', f'生成时间：{S["meta"]["generated"]}（台北时间）。', '',
         f'数据长度核对：FRED 上 HY OAS（BAMLH0A0HYM2）只有 {S["series"]["HY_OAS"]["start"]} 到 {S["series"]["HY_OAS"]["end"]}（FRED 自 2026 年 4 月起只给 3 年）；IG OAS 同样 {S["series"]["IG_OAS"]["start"]} 起。长历史用 BAA10Y（{S["series"]["BAA10Y"]["start"]} 到 {S["series"]["BAA10Y"]["end"]}），它是 HY OAS 的表亲，不是同一条序列。', '',
         'z = (本周利差 − 过去窗口均值) / 过去窗口标准差；窗口截止到上一周，不含本周（代码中有断言）。少于 52 周不计算。百分位 = 窗口内比本周低的周数占比。', '',
         '## 今天的读数', '', '| 序列 | 周 | 利差(bp) | z 3年 | z 10年 | z 扩展 | 百分位 3年 | 百分位 10年 | 百分位 扩展 |', '|---|---|---|---|---|---|---|---|---|']
    for key, nm in (('HY_OAS','HY OAS'),('IG_OAS','IG OAS'),('CCC_OAS','CCC OAS'),('BAA10Y','BAA10Y')):
        r = w2[key]; i = -1
        L.append(f"| {nm} | {r['d'][i]} | {r['v'][i]:.0f} | {fz(r['z3'][i])} | {fz(r['z10'][i])} | {fz(r['ze'][i])} | {fp(r['p3'][i])} | {fp(r['p10'][i])} | {fp(r['pe'][i])} |")
    hy = S['series']['HY_OAS']; igs = S['series']['IG_OAS']
    ig_ch = igs['v'][-1] - igs['v'][-64] if len(igs['v'])>64 else None
    L += ['', f"触发条件 ①：HY OAS {hy['v'][-1]:.0f}bp（{hy['end']}），离 350bp 还差 {350-hy['v'][-1]:.0f}bp；IG OAS 近 63 个交易日变化 {ig_ch:+.0f}bp（条件是 > +20bp）。", '',
          '## 诚实 z vs 偷看 z（BAA10Y）', '', '| 月份 | 周 | 利差(bp) | 诚实扩展 z | 诚实扩展百分位 | 10 年 z | 3 年 z | 偷看全样本 z（含未来） |', '|---|---|---|---|---|---|---|---|']
    for c in w2['compare']:
        L.append(f"| {c['month']} | {c['week']} | {c['spread']:.0f} | {fz(c['ze'])} | {fp(c['pe'])} | {fz(c['z10'])} | {fz(c['z3'])} | {fz(c['zla'])} |")
    L += ['', f"全样本均值 {b['full_mean']:.0f}bp，标准差 {b['full_sd']:.0f}bp。", '', '## 肥尾（周变化）', '', '| 序列 | 周数 | 周变化标准差(bp) | 超过 3 个标准差的周 | 正态分布预期 | 超过 4 个标准差 | 正态预期 |', '|---|---|---|---|---|---|---|']
    for key, nm in (('BAA10Y','BAA10Y'),('HY_OAS','HY OAS')):
        r = w2[key]
        L.append(f"| {nm} | {r['n_changes']} | {r['changes_sd']:.1f} | {r['beyond3']} | {r['expected3']:.1f} | {r['beyond4']} | {r['expected4']:.2f} |")
    hc = w2['handcheck']
    L += ['', '## 手工核对', '', f"{hc['series']} 周 {hc['week']}，本周 {hc['today']:.0f}bp，3 年窗口（156 周，不含本周）前 5 个值 {[round(x) for x in hc['first5']]}，后 5 个值 {[round(x) for x in hc['last5']]}，均值 {hc['mean']:.1f}，标准差 {hc['sd']:.1f}，z = ({hc['today']:.0f} − {hc['mean']:.1f}) / {hc['sd']:.1f} = {hc['z']:+.2f}。与代码一致（断言通过）。", '',
          '区间（预先登记，只做描述，不是交易规则）：z < −1 偏紧/自满；−1 到 +1 正常；> +1 有压力；> +2 接近危机。', '']
    open(os.path.join(qc,'week2_results.md'),'w').write('\n'.join(L))

def main():
    if not OFFLINE: fetch_all()
    os.makedirs(OUT, exist_ok=True)
    S = build_series()
    w1 = build_week1(S); w2 = build_week2(S)
    dump('series','MS',S)
    dump('week2','W2',{k:v for k,v in w2.items()})
    dump('week1','W1',w1)
    import week3_backtest
    w3 = week3_backtest.build(read_fred, S, RAW, QC)
    dump('week3','W3',w3)
    dump('markets','MK',build_markets())
    write_md(w1, w2, S)
    # 投资助手写的解读（markdown 原文），优先用 /workspace/quant_course 的最新版，否则用 content/ 里的副本
    interp = {}
    for wk in ('week1', 'week2', 'week3'):
        src = os.path.join(QC, f'{wk}_interpretation.md'); loc = os.path.join(ROOT, 'content', f'{wk}_interpretation.md')
        if os.path.exists(src):
            os.makedirs(os.path.dirname(loc), exist_ok=True); open(loc, 'w').write(open(src).read())
        if os.path.exists(loc): interp[wk] = open(loc).read()
    dump('interp', 'INTERP', interp)
    # 扩展数据（全球股指、商品汇率、经济日历、财报日历、QDII 溢价）：任何一块失败都不影响上面的核心数据
    try:
        import extra_data
        extra_data.run()
    except Exception as e:
        print('extra_data 失败（不影响核心数据）：', e)
    for k,v in S['series'].items(): print(f"{k:12s} {v['start']} → {v['end']}  n={len(v['d'])}")
    print('status:', {k:v for k,v in STATUS.items() if v!='ok'} or 'all ok')
if __name__ == '__main__': main()
