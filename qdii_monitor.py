#!/usr/bin/env python3
"""
QDII 监视：公开网页上的 T-1 溢价和 EST 溢价，各算各的，不合成一个区间。

- T-1：https://qdiilimit.com/ 场内表。「前一日收盘价 / 最新净值 − 1」，净值日期写在格子的 title 里。
- EST：https://palmmicro.com/woody/res/qdiicn.php 同一行的官方 / 参考 / 实时三列。
  页面没有写出「前净值 × (1+指数) × (1+汇率)」。本站不重算，也不再乘汇率。
  列名里的「实时」是来源页面的列名。这里保存的是抓取那一刻的快照，价格时间是表上的 A 股时点。
- 申购：只在来源写了「暂停」或给出限额时才标。没写就是未知，不当成正常。
  这几只场内 ETF 的场内表没有申购列；场外联接基金的限额不拿来推断场内。

失败时保留上一份 content/qdii/latest.json 和 data/qdii_monitor.js，并写上一次成功的时间。
历史只追加真正抓到的观察，不补造 30 天。

python3 qdii_monitor.py
python3 qdii_monitor.py --offline   # 不联网；没有旧文件就写明缺口
"""
import json, os, re, subprocess, sys, datetime as dt
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.abspath(__file__))
CONTENT = os.path.join(ROOT, 'content', 'qdii')
DATA_JS = os.path.join(ROOT, 'data', 'qdii_monitor.js')
DATA_JSON = os.path.join(ROOT, 'data', 'qdii_monitor.json')
LATEST = os.path.join(CONTENT, 'latest.json')
HISTORY = os.path.join(CONTENT, 'history.json')
UA = 'macro-notebook/1.0 (personal research; hch@mail.grokbot.com)'
URL_T1 = 'https://qdiilimit.com/'
URL_EST = 'https://palmmicro.com/woody/res/qdiicn.php'
OFFLINE = '--offline' in sys.argv

# 至少要覆盖的场内代码。主题按 qdiilimit 场内表的「跟踪指数」，抓不到表时用这里的分组。
WATCH = [
    ('513100', 'nasdaq', '纳指ETF国泰'),
    ('159941', 'nasdaq', '纳指ETF广发'),
    ('513300', 'nasdaq', '纳斯达克ETF华夏'),
    ('159501', 'nasdaq', '纳指ETF嘉实'),
    ('159659', 'nasdaq', '纳斯达克100ETF招商'),
    ('513500', 'spx', '标普500ETF博时'),
    ('513650', 'spx', '标普500ETF南方'),
    ('159655', 'spx', '标普500ETF华夏'),
    ('159612', 'spx', '标普500ETF国泰'),
]
THEME_NAME = {'nasdaq': '纳指', 'spx': '标普'}

def taipei_now(now=None):
    t = now or dt.datetime.now(dt.timezone.utc)
    if t.tzinfo is None: t = t.replace(tzinfo=dt.timezone.utc)
    return t.astimezone(ZoneInfo('Asia/Taipei')).strftime('%Y-%m-%d %H:%M')

def _cells(row_html):
    out = []
    for m in re.finditer(r'<td([^>]*)>([\s\S]*?)</td>', row_html):
        attrs, inner = m.group(1), m.group(2)
        title = re.search(r'title="([^"]*)"', attrs) or re.search(r'title="([^"]*)"', inner)
        text = re.sub(r'<[^>]+>', '', inner)
        text = re.sub(r'\s+', ' ', text).strip()
        out.append((text, title.group(1) if title else ''))
    return out

def rows(html):
    return [_cells(m.group(1)) for m in re.finditer(r'<tr[^>]*>([\s\S]*?)</tr>', html)]

def parse_pct(text):
    if not text: return None
    s = text.replace('+', '').replace('％', '%').strip()
    if not s.endswith('%'): return None
    try: return round(float(s[:-1]), 4)
    except ValueError: return None

def parse_qdiilimit(html):
    """场内 T-1。返回 {code: {...}}。申购状态不在这张表里，调用方保持未知。"""
    title = (re.search(r'<title[^>]*>(.*?)</title>', html, re.S) or [None, ''])[1]
    title = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', title)).strip()
    gen = (re.search(r'class="gen-time"[^>]*>(.*?)<', html) or [None, ''])[1]
    gen = re.sub(r'<[^>]+>', '', gen).strip()
    out = {}
    for cells in rows(html):
        if len(cells) < 9: continue
        code = cells[2][0]
        if not re.fullmatch(r'\d{6}', code): continue
        # 场内表第 5 格是成立日期；场外表第 5 格是代销限额。只取场内溢价。
        if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', cells[4][0]): continue
        prem = parse_pct(cells[7][0])
        nav = re.search(r'净值(\d{4}-\d{2}-\d{2})', cells[7][1] or '')
        out[code] = dict(
            name=cells[3][0], theme_label=cells[0][0],
            t1_premium=prem, t1_nav_date=nav.group(1) if nav else None,
            t1_title=cells[7][1] or '前一日收盘价/最新净值-1',
            scale_yi=cells[5][0] or None, amount_yi=cells[6][0] or None,
        )
    return dict(page_title=title, generated_on_page=gen, funds=out)

def _code(cell):
    m = re.search(r'(\d{6})', cell or '')
    return m.group(1) if m else None

def parse_palmmicro(html):
    """价格快照和三列 EST。单元格不够的列留空，不当成 0，也不叫实时。"""
    prices, est = {}, {}
    for cells in rows(html):
        texts = [c[0] for c in cells]
        if len(texts) >= 6 and _code(texts[0]) and re.fullmatch(r'\d{4}-\d{2}-\d{2}', texts[3] or ''):
            code = _code(texts[0])
            try: px = float(texts[1])
            except ValueError: px = None
            prices[code] = dict(price=px, price_chg=parse_pct(texts[2]), price_date=texts[3], price_time=texts[4], name=texts[5])
        elif len(texts) >= 6 and _code(texts[0]) and re.fullmatch(r'\d{4}-\d{2}-\d{2}', texts[2] or ''):
            code = _code(texts[0])
            def num(i):
                if i >= len(texts) or texts[i] in ('', '-', '—'): return None
                try: return float(texts[i])
                except ValueError: return None
            est[code] = dict(
                name=cells[0][1] or None,
                official_est=num(1), est_date=texts[2], official_premium=parse_pct(texts[3]) if len(texts) > 3 else None,
                ref_est=num(4), ref_premium=parse_pct(texts[5]) if len(texts) > 5 else None,
                rt_est=num(6), rt_premium=parse_pct(texts[7]) if len(texts) > 7 else None,
            )
    return dict(prices=prices, est=est)

def subscription_state(dist, direct):
    """paused / limited / unknown。来源没写「正常」或「不限」时，不返回 normal。"""
    if dist is None and direct is None:
        return 'unknown', '来源没有这只的申购或限额'
    def kind(x):
        if x is None or x == '': return 'missing'
        if '暂停' in x: return 'suspended'
        if x.startswith('无'): return 'none'
        try: float(x); return 'limited'
        except ValueError: return 'other'
    ks = {kind(dist), kind(direct)}
    detail = f'代销 {dist or "—"}；直销 {direct or "—"}（qdiilimit 列名是元/日，本站不改单位）'
    if 'limited' in ks: return 'limited', detail
    if 'suspended' in ks: return 'suspended', detail
    return 'unknown', detail

def _median(xs):
    xs = sorted(x for x in xs if x is not None)
    if not xs: return None
    n = len(xs); m = n // 2
    return xs[m] if n % 2 else round((xs[m - 1] + xs[m]) / 2, 4)

def theme_block(funds, key):
    xs = [f.get(key) for f in funds]
    known = [x for x in xs if x is not None]
    if not known:
        return dict(median=None, min=None, max=None, spread=None, n=0, missing=len(xs))
    lo, hi = min(known), max(known)
    return dict(median=_median(known), min=lo, max=hi, spread=round(hi - lo, 4) if len(known) >= 2 else None,
                n=len(known), missing=len(xs) - len(known))

def build_snapshot(t1, est, fetched):
    funds = []
    for code, theme, fallback in WATCH:
        a = t1['funds'].get(code) or {}
        px = (est.get('prices') or {}).get(code) or {}
        e = (est.get('est') or {}).get(code) or {}
        label = a.get('theme_label') or ''
        if '标普' in label: theme = 'spx'
        elif '纳斯达克' in label or '纳指' in label: theme = 'nasdaq'
        funds.append(dict(
            code=code, theme=theme, theme_name=THEME_NAME[theme],
            name=a.get('name') or e.get('name') or px.get('name') or fallback,
            t1_premium=a.get('t1_premium'), t1_nav_date=a.get('t1_nav_date'), t1_title=a.get('t1_title'),
            official_est=e.get('official_est'), est_date=e.get('est_date'), official_premium=e.get('official_premium'),
            ref_est=e.get('ref_est'), ref_premium=e.get('ref_premium'),
            rt_est=e.get('rt_est'), rt_premium=e.get('rt_premium'),
            price=px.get('price'), price_date=px.get('price_date'), price_time=px.get('price_time'),
            subscription='unknown',
            subscription_detail='qdiilimit 场内表没有申购或限额列。未知，不当成正常。场外联接基金的暂停或限额不拿来推断这只 ETF。',
        ))
    themes = {}
    for key, name in THEME_NAME.items():
        group = [f for f in funds if f['theme'] == key]
        themes[key] = dict(name=name, n_listed=len(group),
                           t1=theme_block(group, 't1_premium'),
                           official=theme_block(group, 'official_premium'),
                           ref=theme_block(group, 'ref_premium'),
                           rt=theme_block(group, 'rt_premium'))
    return dict(
        version=1, generated=fetched, tz='Asia/Taipei', last_success=fetched, update_error=None,
        advice=False,
        note='监视工具，不是买卖建议。T-1 和 EST 分列，不写成一个区间。',
        sources=dict(
            t1=dict(name='qdiilimit.com 场内表', url=URL_T1, page_title=t1.get('page_title'),
                    generated_on_page=t1.get('generated_on_page'),
                    definition='T-1 日溢价率 = 前一日收盘价 / 最新公布净值 − 1。净值日期以格子 title 里的「净值YYYY-MM-DD」为准。'),
            est=dict(name='palmmicro qdiicn.php', url=URL_EST,
                     definition='同一行三列：官方EST、参考EST、实时EST，各自有溢价。溢价用的价格见同一页「参考数据」里的价格、日期和时间，是 A 股时点的快照。页面没有公布「前净值×(1+指数涨跌)×(1+汇率涨跌)」，本站不重算，也不把汇率再乘一次。列名「实时」不是本站在持续刷新。'),
        ),
        funds=funds, themes=themes,
        history_gap='T-1 和 EST 只积累本站抓到的观察。不足 30 个交易日时，图下面写明还差多少。收盘价÷公布净值的较长历史在原来的溢价图里，定义不同，不能当成这两列的过去。',
    )

def observation_key(ob):
    return (ob['source'], ob['code'], ob['field'], ob.get('asof'), ob.get('value'))

def new_observations(snapshot):
    out = []
    fetched = snapshot['generated']
    for f in snapshot['funds']:
        if f.get('t1_premium') is not None:
            out.append(dict(source='qdiilimit', code=f['code'], theme=f['theme'], field='t1',
                            value=f['t1_premium'], asof=f.get('t1_nav_date'), fetched=fetched))
        for field, prem in (('official', f.get('official_premium')), ('ref', f.get('ref_premium')), ('rt', f.get('rt_premium'))):
            if prem is None: continue
            out.append(dict(source='palmmicro', code=f['code'], theme=f['theme'], field=field,
                            value=prem, asof=f.get('price_date') or f.get('est_date'),
                            est_date=f.get('est_date'), price_time=f.get('price_time'), fetched=fetched))
    return out

def merge_history(old, fresh):
    prev = list((old or {}).get('observations') or [])
    have = {observation_key(o) for o in prev}
    added = 0
    for ob in fresh:
        k = observation_key(ob)
        if k in have: continue
        prev.append(ob); have.add(k); added += 1
    return dict(version=1, observations=prev), added

def history_days(history, field):
    return len({o.get('asof') for o in (history or {}).get('observations') or [] if o.get('field') == field and o.get('asof')})

def drag(buy_premium, nav_annual, years, exit_premium):
    """买入溢价、卖出溢价、净值年化都是小数（15% = 0.15）。

    到期价格倍数 = (1+净值年化)^年数 × (1+卖出溢价) / (1+买入溢价)。
    相对「按净值买、按净值卖」少掉的比例 = (1+卖出溢价)/(1+买入溢价) − 1，和年化无关。
    """
    b, r, e, n = float(buy_premium), float(nav_annual), float(exit_premium), float(years)
    if n <= 0: raise ValueError('years')
    mult = (1 + r) ** n * (1 + e) / (1 + b)
    return dict(cumulative=mult - 1, annualized=mult ** (1 / n) - 1, wealth_vs_nav=(1 + e) / (1 + b) - 1)

def format_drag(result):
    """给页面用的四舍五入：累计和相对净值各 1 位百分数，年化 1 位。"""
    def one(x):
        return round(x * 1000) / 10   # 一位小数的百分数，避开二进制尾数
    return dict(cumulative_pct=one(result['cumulative']), annualized_pct=one(result['annualized']),
                wealth_vs_nav_pct=one(result['wealth_vs_nav']))

def load_json(path):
    try:
        with open(path, encoding='utf-8') as f: return json.loads(f.read())
    except Exception: return None

def fetch(url):
    r = subprocess.run(['curl', '-sL', '-m', '25', '-A', UA, '-w', '\n%{http_code}', url], capture_output=True, timeout=40)
    raw = r.stdout
    if not raw: raise RuntimeError(f'{url} 没有返回')
    body, _, code = raw.rpartition(b'\n')
    if code.strip() != b'200' or len(body) < 1000: raise RuntimeError(f'{url} HTTP {code.decode()} 长度 {len(body)}')
    return body.decode('utf-8', 'replace')

def write_outputs(snapshot, history):
    os.makedirs(CONTENT, exist_ok=True)
    os.makedirs(os.path.dirname(DATA_JS), exist_ok=True)
    snapshot = dict(snapshot)
    snapshot['history_days'] = {k: history_days(history, k) for k in ('t1', 'official', 'ref', 'rt')}
    blob = dict(snapshot, history=history.get('observations') or [])
    text = json.dumps(blob, ensure_ascii=False, separators=(',', ':'))
    with open(LATEST, 'w', encoding='utf-8') as f: f.write(json.dumps(snapshot, ensure_ascii=False, indent=2))
    with open(HISTORY, 'w', encoding='utf-8') as f: f.write(json.dumps(history, ensure_ascii=False, separators=(',', ':')))
    with open(DATA_JSON, 'w', encoding='utf-8') as f: f.write(text)
    with open(DATA_JS, 'w', encoding='utf-8') as f: f.write('window.QDM=' + text + ';\n')

def keep_failure(message, fetched):
    old = load_json(LATEST)
    hist = load_json(HISTORY) or dict(version=1, observations=[])
    if not old:
        old = dict(version=1, generated=None, tz='Asia/Taipei', last_success=None, funds=[], themes={},
                   update_error=message, last_attempt=fetched, advice=False,
                   note='这次没有抓到。没有上一份成功的数据，所以表是空的，不是零溢价。',
                   history_gap='还没有 T-1 或 EST 的观察。')
    else:
        old = dict(old)
        old['update_error'] = message
        old['last_attempt'] = fetched
    write_outputs(old, hist)
    return f'kept previous: {message}'

def run(fetch_html=None):
    fetched = taipei_now()
    try:
        if fetch_html:
            t1_html, est_html = fetch_html()
        elif OFFLINE:
            raise RuntimeError('offline')
        else:
            t1_html = fetch(URL_T1)
            est_html = fetch(URL_EST)
        t1, est = parse_qdiilimit(t1_html), parse_palmmicro(est_html)
        if len(t1['funds']) < 5 or len(est['est']) < 5:
            raise RuntimeError(f'解析太少：T-1 {len(t1["funds"])} 只，EST {len(est["est"])} 只')
        snap = build_snapshot(t1, est, fetched)
        hist, added = merge_history(load_json(HISTORY), new_observations(snap))
        write_outputs(snap, hist)
        return f'ok T-1 {sum(f["t1_premium"] is not None for f in snap["funds"])}/9，EST实时 {sum(f["rt_premium"] is not None for f in snap["funds"])}/9，历史新增 {added}'
    except Exception as e:
        return keep_failure(str(e), fetched)

if __name__ == '__main__':
    print(run())
