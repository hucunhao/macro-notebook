#!/usr/bin/env python3
"""
标普 500 / 纳斯达克 100 指数期权的经销商伽马（GEX）快照。

只读 CBOE 公开延迟链：
  https://cdn.cboe.com/api/global/delayed_quotes/options/_SPX.json
  https://cdn.cboe.com/api/global/delayed_quotes/options/_NDX.json
SPY、QQQ 不是指数期权，不代入，也不做代理。

单张合约（现货涨跌 1% 的美元敞口）：
  sign × gamma × open_interest × 100 × spot² × 0.01
看涨 sign = +1，看跌 sign = −1。假设是「做市商多看涨、空看跌」。
这是模型，不是交易所的真实做市商持仓。

当前敞口用链上的 gamma。零伽马翻转点不用这份 gamma 平移，
而是用每张合约的隐含波动率，按 Black-Scholes（利率 0、股息 0）在别的现货价上重算。

每日收盘只在美东 16:00 之后、且成交日对得上时追加。同一交易日重试不改已记下的收盘。
抓取失败只把这一只标成陈旧，不抹掉另一只，也不把行情时间往前拨。

python3 gex_monitor.py
"""
import json, math, os, re, subprocess, datetime as dt
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA_JSON = os.path.join(ROOT, 'data', 'gex.json')
DATA_JS = os.path.join(ROOT, 'data', 'gex.js')
ET = ZoneInfo('America/New_York')
TP = ZoneInfo('Asia/Taipei')
UTC = dt.timezone.utc
UA = 'macro-notebook/1.0 (personal research; hch@mail.grokbot.com)'

FORMULA = 'sign × gamma × open_interest × 100 × spot² × 0.01'
ASSUMPTION = '做市商多看涨、空看跌'
IV_MAX = 3.0
FLIP_LO = 0.6
FLIP_HI = 1.4
STRIKE_CAP = 40
INV_SQRT_2PI = 1.0 / math.sqrt(2.0 * math.pi)
_SYMBOL = re.compile(r'^([A-Z][A-Z0-9]{0,5})(\d{6})([CP])(\d{8})$')

INDEXES = {
    'SPX': {
        'id': 'SPX', 'name': '标普 500',
        'url': 'https://cdn.cboe.com/api/global/delayed_quotes/options/_SPX.json',
        'chain_symbol': '_SPX', 'source_symbol': '^SPX',
        'roots': ('SPX', 'SPXW', 'SPXO'), 'not_proxy': 'SPY',
    },
    'NDX': {
        'id': 'NDX', 'name': '纳斯达克 100',
        'url': 'https://cdn.cboe.com/api/global/delayed_quotes/options/_NDX.json',
        'chain_symbol': '_NDX', 'source_symbol': '^NDX',
        'roots': ('NDX', 'NDXP'), 'not_proxy': 'QQQ',
    },
}
WINDOWS = (
    ('all', '全部到期', None),
    ('d7', '0–7 个日历日', 7),
    ('d30', '0–30 个日历日', 30),
)
METHOD = {
    'formula': FORMULA,
    'sign': '看涨 +1，看跌 −1',
    'assumption': ASSUMPTION,
    'spot_gex': '当前净敞口用链上给出的 gamma，不改写。',
    't': '到期日减行情所属交易日，按日历日。时间 = 日历日 / 365。利率和股息都按 0。',
    'expired': '每日收盘快照里，到期日早于交易日、或到期日就是当天的合约，视为已到期，不计入。盘中同一天到期的合约仍计入，剩余时间按到美东 16:00，最少按 15 分钟。',
    'windows': '三列都含当天（若未到期）：全部到期、0–7 个日历日、0–30 个日历日。按日历日，不是交易日。',
    'flip': '翻转点不用当前 gamma 平移。隐含波动率有效的合约，按 Black-Scholes 在现货的 60%–140% 上重算 gamma，再套同一条公式。取离现货最近的根。没有根、有多根、或整段接近 0，都写明，不编一个价。',
    'iv': '隐含波动率须为有限正数且不超过 300%。否则不参与翻转点，链上 gamma 仍可计入当前敞口。不填一个替代波动率。',
    'walls': '看涨墙是该列里看涨 GEX 合计最大的行权价；看跌墙是看跌 GEX 合计最负的行权价。打平时取更低的行权价。没有正的看涨或负的看跌就空着。',
    'roots': '标普指数期权只收 SPX、SPXW、SPXO。纳指指数期权只收 NDX、NDXP。SPY 和 QQQ 不是指数，不代入，也不做代理。',
    'close': '美东 16:00 及之后，且成交时间的日期就是这个交易日，才追加每日收盘。America/New_York 自带夏令时。同一交易日再次抓到，不改已记下的收盘和当时的切换记录。不补造更早的日子。',
    'oi': '链上没有未平仓的截止日期。未平仓通常比成交价晚一个交易日。本站不编这个日期。',
    'delay': '来源是 CBOE 公开延迟行情，大约 15 分钟，不是即时成交。',
    'model': '美元金额换一套模型可能差很多。本站只保证自己这套算法前后一致。负伽马只表示在上述假设下，做市商对冲可能放大波动，不表示涨跌方向。不构成投资建议。',
    'duplicate': '同一合约代码出现两次时只留最后一条，不重复加总。',
    'timestamp': '文件里的 timestamp 无时区。能对上 HTTP Last-Modified（GMT）时按 UTC。成交时间无时区时按美东，因为它对着现金收盘。',
}


class ChainError(Exception):
    pass


def taipei_stamp(now):
    t = now if now.tzinfo else now.replace(tzinfo=UTC)
    return t.astimezone(TP).strftime('%Y-%m-%d %H:%M')


def previous_weekday(day):
    day = day - dt.timedelta(days=1)
    while day.weekday() >= 5:
        day -= dt.timedelta(days=1)
    return day


def iround(x):
    if isinstance(x, bool) or not isinstance(x, (int, float)) or not math.isfinite(x):
        return None
    return int(math.copysign(math.floor(abs(x) + 0.5), x))


def r2(x):
    if isinstance(x, bool) or not isinstance(x, (int, float)) or not math.isfinite(x):
        return None
    return math.copysign(math.floor(abs(x) * 100 + 0.5) / 100.0, x)


def finite(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool) and math.isfinite(x)


def iv_ok(iv):
    return finite(iv) and 0 < iv <= IV_MAX


def contract_gex(sign, gamma, oi, spot):
    """单张合约。输入无效时返回 None，不当成 0。"""
    if sign not in (1, -1):
        return None
    if not finite(gamma) or not finite(oi) or not finite(spot):
        return None
    if gamma < 0 or oi < 0 or spot <= 0:
        return None
    return sign * gamma * oi * 100.0 * (spot ** 2) * 0.01


def parse_symbol(symbol):
    m = _SYMBOL.match(symbol or '')
    if not m:
        return None
    root, ymd, cp, strike = m.groups()
    try:
        expiry = dt.date(2000 + int(ymd[:2]), int(ymd[2:4]), int(ymd[4:]))
    except ValueError:
        return None
    px = int(strike) / 1000.0
    if px <= 0:
        return None
    return {'root': root, 'expiry': expiry, 'cp': cp, 'sign': 1 if cp == 'C' else -1, 'strike': px}


def parse_quote_timestamp(value, last_modified=None):
    """文件 timestamp 没有时区。优先用 Last-Modified 判断是 UTC 还是美东。"""
    if not isinstance(value, str) or len(value.strip()) < 19:
        raise ChainError('行情时间缺失')
    raw = value.strip().replace('T', ' ')
    zulu = raw.endswith('Z')
    naive = dt.datetime.strptime(raw[:19], '%Y-%m-%d %H:%M:%S')
    if zulu:
        stamped = naive.replace(tzinfo=UTC)
        return stamped, 'UTC', True, '时间带 Z，按 UTC'
    as_utc = naive.replace(tzinfo=UTC)
    as_et = naive.replace(tzinfo=ET).astimezone(UTC)
    if last_modified is None:
        return as_utc, 'UTC', False, '没有 Last-Modified，行情时间按 UTC 理解'
    d_utc = abs((as_utc - last_modified).total_seconds())
    d_et = abs((as_et - last_modified).total_seconds())
    if d_utc <= 180 and d_utc <= d_et:
        return as_utc, 'UTC', True, '与 HTTP Last-Modified（GMT）一致，按 UTC'
    if d_et <= 180 and d_et < d_utc:
        return naive.replace(tzinfo=ET), 'America/New_York', True, '与 Last-Modified 对齐的是美东时间'
    return as_utc, 'UTC', False, '和 Last-Modified 对不上（按 UTC 相差 %d 秒），仍按 UTC 理解' % int(d_utc)


def parse_last_trade(value):
    if not value or not isinstance(value, str):
        return None
    raw = value.strip()
    zulu = raw.endswith('Z')
    naive = dt.datetime.strptime(raw[:19].replace(' ', 'T'), '%Y-%m-%dT%H:%M:%S')
    if zulu:
        return naive.replace(tzinfo=UTC).astimezone(ET)
    return naive.replace(tzinfo=ET)


def clock_session(quote_utc):
    et = quote_utc.astimezone(ET)
    minutes = et.hour * 60 + et.minute
    if et.weekday() < 5 and minutes >= 16 * 60:
        return et.date(), True, et
    if et.weekday() < 5 and minutes >= 9 * 60 + 30:
        return et.date(), False, et
    return previous_weekday(et.date()), True, et


def expected_closed_session(now):
    """运行时刻已经收盘的最近一个工作日（美东 16:00 起算当天）。不处理节假日。"""
    t = now if now.tzinfo else now.replace(tzinfo=UTC)
    et = t.astimezone(ET)
    day = et.date()
    if day.weekday() >= 5 or (et.hour, et.minute) < (16, 0):
        day = previous_weekday(day)
    return day.isoformat()


def resolve_session(quote_utc, last_trade_et):
    clock_date, after_close, et = clock_session(quote_utc)
    trade_date = last_trade_et.date() if last_trade_et else None
    stale_chain = False
    session = clock_date
    if trade_date is None:
        is_close = False
    elif trade_date == clock_date:
        is_close = after_close and trade_date.weekday() < 5
    elif trade_date < clock_date:
        stale_chain = True
        session = trade_date
        close_at = dt.datetime.combine(trade_date, dt.time(16, 0), tzinfo=ET)
        is_close = et >= close_at and trade_date.weekday() < 5
    else:
        stale_chain = True
        is_close = False
    return {
        'session_date': session.isoformat(),
        'after_close': after_close,
        'is_daily_close': bool(is_close),
        'stale_chain': stale_chain,
        'quote_et': et.strftime('%Y-%m-%d %H:%M:%S'),
        'last_trade_date': trade_date.isoformat() if trade_date else None,
    }


def relation(spot, flip):
    if flip is None or not finite(spot):
        return None
    if abs(spot - flip) <= 0.01:
        return 'at'
    return 'above' if spot > flip else 'below'


def sign_of(net):
    if net is None:
        return 'undefined'
    if net > 0:
        return 'positive'
    if net < 0:
        return 'negative'
    return 'zero'


def prepare_flip(rows):
    prep = []
    iv_bad = 0
    for c in rows:
        if c['oi'] <= 0:
            continue
        if not iv_ok(c['iv']) or not finite(c['t_years']) or c['t_years'] <= 0 or c['strike'] <= 0:
            iv_bad += 1
            continue
        vol = c['iv'] * math.sqrt(c['t_years'])
        if vol < 1e-8:
            iv_bad += 1
            continue
        coef = c['sign'] * c['oi'] * 100.0 * 0.01 / vol
        half = 0.5 * c['iv'] * c['iv'] * c['t_years']
        prep.append((coef, c['strike'], half, vol))
    return prep, iv_bad


def reprice_gex(prep, spot):
    if not prep or not finite(spot) or spot <= 0:
        return None
    total = 0.0
    log, exp = math.log, math.exp
    for coef, strike, half, vol in prep:
        d1 = (log(spot / strike) + half) / vol
        if d1 > 12 or d1 < -12:
            continue
        total += coef * spot * exp(-0.5 * d1 * d1) * INV_SQRT_2PI
    return total


def _bisect(prep, a, b, fa, fb):
    for _ in range(40):
        mid = (a + b) / 2.0
        fm = reprice_gex(prep, mid)
        if fm is None or not math.isfinite(fm):
            return None
        if abs(b - a) < 0.01 or fm == 0:
            return mid
        if fa * fm <= 0:
            b, fb = mid, fm
        else:
            a, fa = mid, fm
    return (a + b) / 2.0


def _merge_roots(roots):
    if not roots:
        return []
    roots = sorted(roots)
    clusters = [[roots[0]]]
    for r in roots[1:]:
        if r - clusters[-1][-1] <= 0.5:
            clusters[-1].append(r)
        else:
            clusters.append([r])
    return [sum(c) / len(c) for c in clusters]


def find_zero_flips(prep, spot):
    search = {'low_ratio': FLIP_LO, 'high_ratio': FLIP_HI, 'repricing': 'black_scholes_r0_q0'}
    empty = {'flip': None, 'flip_status': 'undefined', 'flip_reason': 'no_contracts',
             'flip_roots': [], 'spot_vs_flip': None, 'flip_search': search}
    if not prep or not finite(spot) or spot <= 0:
        return empty
    lo, hi = spot * FLIP_LO, spot * FLIP_HI
    n = 161
    xs = [lo + (hi - lo) * i / (n - 1) for i in range(n)]
    ys = [reprice_gex(prep, x) for x in xs]
    if any(y is None or not math.isfinite(y) for y in ys):
        empty['flip_reason'] = 'numerical'
        return empty
    absmax = max(abs(y) for y in ys)
    if absmax < 1.0:
        empty['flip_reason'] = 'flat'
        return empty
    # 远离行权价时 gamma 下溢成 0，那不是翻号。只认明显正负之间的变号。
    tol = max(absmax * 1e-4, 1.0)
    signs = [0 if abs(y) <= tol else (1 if y > 0 else -1) for y in ys]
    roots = []
    i = 0
    while i < n:
        if signs[i] == 0:
            i += 1
            continue
        j = i + 1
        while j < n and signs[j] == 0:
            j += 1
        if j >= n:
            break
        if signs[j] != signs[i]:
            root = _bisect(prep, xs[i], xs[j], ys[i], ys[j])
            if root is not None:
                roots.append(root)
        i = j
    roots = _merge_roots(roots)
    if not roots:
        return {'flip': None, 'flip_status': 'none', 'flip_reason': 'no_root',
                'flip_roots': [], 'spot_vs_flip': None, 'flip_search': search}
    nearest = min(roots, key=lambda r: (abs(r - spot), r))
    shown = r2(nearest)
    return {
        'flip': shown,
        'flip_status': 'ok' if len(roots) == 1 else 'multiple',
        'flip_reason': None,
        'flip_roots': [r2(r) for r in roots],
        'spot_vs_flip': relation(spot, shown),
        'flip_search': search,
    }


def _t_years(dte, quote_et, keep_zero_dte):
    if dte > 0:
        return dte / 365.0
    if dte == 0 and keep_zero_dte:
        close_at = quote_et.replace(hour=16, minute=0, second=0, microsecond=0)
        seconds = max((close_at - quote_et).total_seconds(), 15 * 60)
        return seconds / (365.0 * 24 * 3600)
    return None


def _walls(by_strike):
    call_wall = put_wall = None
    for strike, row in by_strike.items():
        if row['call_gex'] > 0 and (call_wall is None or row['call_gex'] > call_wall[0] or (row['call_gex'] == call_wall[0] and strike < call_wall[1])):
            call_wall = (row['call_gex'], strike)
        if row['put_gex'] < 0 and (put_wall is None or row['put_gex'] < put_wall[0] or (row['put_gex'] == put_wall[0] and strike < put_wall[1])):
            put_wall = (row['put_gex'], strike)
    def pack(wall):
        if not wall:
            return None
        return {'strike': wall[1], 'gex': iround(wall[0])}
    return pack(call_wall), pack(put_wall)


def _strike_rows(by_strike, call_wall, put_wall):
    ranked = sorted(by_strike.items(), key=lambda kv: abs(kv[1]['call_gex'] + kv[1]['put_gex']), reverse=True)
    chosen = {strike for strike, _ in ranked[:STRIKE_CAP]}
    for wall in (call_wall, put_wall):
        if wall:
            chosen.add(wall['strike'])
    rows = []
    for strike in sorted(chosen):
        row = by_strike.get(strike)
        if not row:
            continue
        rows.append({
            'strike': strike,
            'call_gex': iround(row['call_gex']),
            'put_gex': iround(row['put_gex']),
            'net_gex': iround(row['call_gex'] + row['put_gex']),
            'call_oi': iround(row['call_oi']),
            'put_oi': iround(row['put_oi']),
        })
    return rows


def _window(rows, spot, label, cap):
    chosen = [c for c in rows if cap is None or c['dte'] <= cap]
    by_strike = {}
    call = put = 0.0
    oi = 0.0
    expiries = set()
    for c in chosen:
        g = c['gex']
        if c['sign'] > 0:
            call += g
        else:
            put += g
        oi += c['oi']
        expiries.add(c['expiry'])
        cell = by_strike.setdefault(c['strike'], {'call_gex': 0.0, 'put_gex': 0.0, 'call_oi': 0.0, 'put_oi': 0.0})
        if c['sign'] > 0:
            cell['call_gex'] += g
            cell['call_oi'] += c['oi']
        else:
            cell['put_gex'] += g
            cell['put_oi'] += c['oi']
    net = call + put
    call_wall, put_wall = _walls(by_strike)
    shown = _strike_rows(by_strike, call_wall, put_wall)
    net_r = iround(net) if chosen else None
    return {
        'label': label,
        'dte_max': cap,
        'net_gex': net_r,
        'call_gex': iround(call) if chosen else None,
        'put_gex': iround(put) if chosen else None,
        'sign': sign_of(net_r),
        'call_wall': call_wall,
        'put_wall': put_wall,
        'contracts_used': len(chosen),
        'expiries': len(expiries),
        'oi_used': iround(oi) if chosen else 0,
        'strikes_total': len(by_strike),
        'strikes_shown': len(shown),
        'strikes': shown,
    }


def compute_index(index_id, payload, http_meta=None, now=None):
    meta = INDEXES[index_id]
    now = now or dt.datetime.now(UTC)
    if not isinstance(payload, dict):
        raise ChainError('返回的不是 JSON 对象')
    data = payload.get('data')
    if not isinstance(data, dict):
        raise ChainError('链上没有 data')
    if data.get('symbol') != meta['source_symbol'] or payload.get('symbol') != meta['chain_symbol']:
        raise ChainError('返回的是 %s / %s，不是 %s 指数期权' % (payload.get('symbol'), data.get('symbol'), meta['source_symbol']))
    if str(data.get('security_type') or '').lower() != 'index':
        raise ChainError('security_type 是 %s，不是 index' % data.get('security_type'))
    spot = data.get('current_price')
    if not finite(spot) or spot <= 0:
        raise ChainError('现货价格无效')
    http_meta = http_meta or {}
    last_mod = http_meta.get('last_modified')
    quote_utc, zone_name, zone_ok, zone_basis = parse_quote_timestamp(payload.get('timestamp'), last_mod)
    try:
        last_trade = parse_last_trade(data.get('last_trade_time'))
    except ValueError as e:
        raise ChainError('成交时间无法解析') from e
    session = resolve_session(quote_utc, last_trade)
    session_day = dt.date.fromisoformat(session['session_date'])
    quote_et = quote_utc.astimezone(ET)
    keep_zero = not session['is_daily_close'] and not session['stale_chain']
    options = data.get('options')
    if not isinstance(options, list) or not options:
        raise ChainError('期权列表是空的')

    seen = {}
    duplicates = 0
    unparsed = 0
    rejected = {}
    invalid = 0
    expired = 0
    for raw in options:
        if not isinstance(raw, dict):
            unparsed += 1
            continue
        parsed = parse_symbol(raw.get('option'))
        if not parsed:
            unparsed += 1
            continue
        if parsed['root'] not in meta['roots']:
            rejected[parsed['root']] = rejected.get(parsed['root'], 0) + 1
            continue
        sym = raw.get('option')
        if sym in seen:
            duplicates += 1
        seen[sym] = (parsed, raw)

    rows = []
    for parsed, raw in seen.values():
        dte = (parsed['expiry'] - session_day).days
        t_years = _t_years(dte, quote_et, keep_zero)
        if t_years is None:
            expired += 1
            continue
        gex = contract_gex(parsed['sign'], raw.get('gamma'), raw.get('open_interest'), spot)
        if gex is None:
            invalid += 1
            continue
        rows.append({
            'expiry': parsed['expiry'].isoformat(),
            'dte': dte,
            'sign': parsed['sign'],
            'strike': parsed['strike'],
            'oi': raw.get('open_interest'),
            'iv': raw.get('iv'),
            't_years': t_years,
            'gex': gex,
        })
    if not rows:
        raise ChainError('没有可计算的未到期合约（过期 %d，无效 %d，认不出的前缀 %d）' % (expired, invalid, sum(rejected.values())))

    prep_rows = []
    iv_bad = 0
    for c in rows:
        if c['oi'] <= 0:
            continue
        if not iv_ok(c['iv']) or c['t_years'] <= 0:
            iv_bad += 1
            continue
        vol = c['iv'] * math.sqrt(c['t_years'])
        if vol < 1e-8:
            iv_bad += 1
            continue
        coef = c['sign'] * c['oi'] * 100.0 * 0.01 / vol
        half = 0.5 * c['iv'] * c['iv'] * c['t_years']
        prep_rows.append({'dte': c['dte'], 'coef': (coef, c['strike'], half, vol)})

    def prep_for(cap):
        return [p['coef'] for p in prep_rows if cap is None or p['dte'] <= cap]

    windows = {}
    for key, label, cap in WINDOWS:
        # 翻转点只用这一列里波动率有效的合约，不用当前 gamma 平移。
        built = _window(rows, spot, label, cap)
        flip = find_zero_flips(prep_for(cap), spot) if built['contracts_used'] else find_zero_flips([], spot)
        built.update({k: flip[k] for k in ('flip', 'flip_status', 'flip_reason', 'flip_roots', 'spot_vs_flip', 'flip_search')})
        windows[key] = built

    oi_used = sum(c['oi'] for c in rows)
    iv_bad_oi = sum(c['oi'] for c in rows if c['oi'] > 0 and not iv_ok(c['iv']))
    expiries = sorted({c['expiry'] for c in rows})
    expected = expected_closed_session(now)
    behind = session['session_date'] < expected
    warnings = []
    if session['stale_chain']:
        warnings.append({'level': 'prominent', 'code': 'stale_chain',
                         'text': '成交日 %s 早于行情时钟对应的交易日，这条链偏旧。' % (session['last_trade_date'] or '未知')})
    if behind:
        warnings.append({'level': 'prominent', 'code': 'chain_behind',
                         'text': '链上交易日是 %s，这次运行对应的最近收盘是 %s。没有把缺的那一天编出来。' % (session['session_date'], expected)})
    if http_meta.get('last_modified') is not None and not zone_ok:
        warnings.append({'level': 'prominent', 'code': 'timestamp_unverified', 'text': zone_basis})
    if not last_trade:
        warnings.append({'level': 'prominent', 'code': 'no_last_trade', 'text': '没有成交时间，不能当成每日收盘。'})
    if rejected:
        level = 'prominent' if sum(rejected.values()) * 20 >= len(options) else 'info'
        warnings.append({'level': level, 'code': 'rejected_roots',
                         'text': '这些前缀不是 %s 指数期权，没有计入：%s。' % (meta['name'], '、'.join('%s %d' % (k, rejected[k]) for k in sorted(rejected)))})
    if invalid and invalid * 5 >= len(rows) + invalid:
        warnings.append({'level': 'prominent', 'code': 'partial_invalid',
                         'text': '有 %d 张未到期合约的 gamma 或未平仓无效，没有算进合计。' % invalid})
    if oi_used and iv_bad_oi / oi_used > 0.25:
        warnings.append({'level': 'prominent', 'code': 'iv_gap',
                         'text': '超过四分之一的未平仓缺少可用隐含波动率。翻转点不含这些合约，当前敞口仍用链上 gamma。'})
    if windows['all']['flip_status'] in ('none', 'undefined'):
        warnings.append({'level': 'prominent', 'code': 'flip_missing',
                         'text': '全部到期这一列没有可用的零伽马翻转点。'})
    elif windows['all']['flip_status'] == 'multiple':
        warnings.append({'level': 'info', 'code': 'flip_multiple',
                         'text': '现货 60% 到 140% 范围内有 %d 个翻转点，页面上的是离现货最近的一个。' % len(windows['all']['flip_roots'])})

    roots = {}
    for parsed, _raw in seen.values():
        roots[parsed['root']] = roots.get(parsed['root'], 0) + 1
    return {
        'id': meta['id'],
        'name': meta['name'],
        'status': 'ok',
        'stale': False,
        'stale_reason': None,
        'proxy': False,
        'not_proxy': meta['not_proxy'],
        'last_attempt': taipei_stamp(now),
        'last_success': taipei_stamp(now),
        'computed_at': taipei_stamp(now),
        'quote_timestamp_utc': quote_utc.astimezone(UTC).strftime('%Y-%m-%d %H:%M:%S'),
        'quote_timestamp_zone': zone_name,
        'quote_timestamp_basis': zone_basis,
        'quote_timestamp_checked': zone_ok,
        'quote_timestamp_et': session['quote_et'],
        'last_trade_time': data.get('last_trade_time'),
        'last_trade_zone': 'America/New_York',
        'session_date': session['session_date'],
        'is_daily_close': session['is_daily_close'],
        'expected_session': expected,
        'chain_behind': behind,
        'spot': spot,
        'security_type': 'index',
        'source_symbol': meta['source_symbol'],
        'chain_symbol': meta['chain_symbol'],
        'source_url': meta['url'],
        'http_status': http_meta.get('status'),
        'content_length': http_meta.get('content_length'),
        'last_modified': http_meta.get('last_modified_text'),
        'final_url': http_meta.get('final_url'),
        'delay_note': METHOD['delay'],
        'assumption': ASSUMPTION,
        'formula': FORMULA,
        'windows': windows,
        'warnings': warnings,
        'coverage': {
            'options_in_file': len(options),
            'unique_kept': len(seen),
            'duplicates': duplicates,
            'unparsed': unparsed,
            'expired': expired,
            'invalid_gamma_or_oi': invalid,
            'used': len(rows),
            'roots': roots,
            'rejected_roots': rejected,
            'iv_invalid_for_flip': iv_bad,
            'expiry_min': expiries[0],
            'expiry_max': expiries[-1],
            'expiries_used': len(expiries),
            'keep_zero_dte': keep_zero,
        },
    }


def blank_index(meta):
    return {
        'id': meta['id'], 'name': meta['name'], 'status': 'unavailable', 'stale': False,
        'stale_reason': None, 'proxy': False, 'not_proxy': meta['not_proxy'],
        'last_attempt': None, 'last_success': None, 'computed_at': None,
        'quote_timestamp_utc': None, 'quote_timestamp_et': None, 'last_trade_time': None,
        'session_date': None, 'is_daily_close': False, 'spot': None,
        'security_type': None, 'source_symbol': meta['source_symbol'], 'chain_symbol': meta['chain_symbol'],
        'source_url': meta['url'], 'windows': None,
        'warnings': [{'level': 'prominent', 'code': 'missing', 'text': '还没有成功抓到这条指数期权链。'}],
        'coverage': None, 'assumption': ASSUMPTION, 'formula': FORMULA, 'delay_note': METHOD['delay'],
    }


def initial_state():
    return {
        'version': 1,
        'kind': 'index_option_gex',
        'advice': False,
        'proxy': False,
        'formula': FORMULA,
        'assumption': ASSUMPTION,
        'method': METHOD,
        'indices': {i: blank_index(m) for i, m in INDEXES.items()},
        'closes': {i: [] for i in INDEXES},
        'events': [],
    }


def clone(obj):
    return json.loads(json.dumps(obj))


def close_row(snap):
    w, d7, d30 = snap['windows']['all'], snap['windows']['d7'], snap['windows']['d30']
    return {
        'session_date': snap['session_date'],
        'recorded_at': snap['computed_at'],
        'quote_timestamp_utc': snap['quote_timestamp_utc'],
        'spot': snap['spot'],
        'net_gex': w['net_gex'],
        'sign': w['sign'],
        'flip': w['flip'],
        'flip_status': w['flip_status'],
        'spot_vs_flip': w['spot_vs_flip'],
        'call_wall': None if not w['call_wall'] else w['call_wall']['strike'],
        'put_wall': None if not w['put_wall'] else w['put_wall']['strike'],
        'net_gex_d7': d7['net_gex'],
        'net_gex_d30': d30['net_gex'],
    }


def detect_events(prior, current, symbol):
    if not prior:
        return []
    out = []
    known = ('positive', 'negative', 'zero')
    if prior.get('sign') in known and current.get('sign') in known and prior['sign'] != current['sign']:
        out.append({
            'type': 'sign_switch', 'symbol': symbol, 'scope': 'all',
            'prior_date': prior['session_date'], 'current_date': current['session_date'],
            'prior_sign': prior['sign'], 'current_sign': current['sign'],
            'prior_net_gex': prior['net_gex'], 'current_net_gex': current['net_gex'],
            'prior_spot': prior['spot'], 'current_spot': current['spot'],
        })
    rels = ('above', 'below', 'at')
    if (prior.get('spot_vs_flip') in rels and current.get('spot_vs_flip') in rels
            and prior.get('flip') is not None and current.get('flip') is not None
            and prior['spot_vs_flip'] != current['spot_vs_flip']):
        out.append({
            'type': 'flip_cross', 'symbol': symbol, 'scope': 'all',
            'prior_date': prior['session_date'], 'current_date': current['session_date'],
            'prior_spot': prior['spot'], 'current_spot': current['spot'],
            'prior_flip': prior['flip'], 'current_flip': current['flip'],
            'prior_relation': prior['spot_vs_flip'], 'current_relation': current['spot_vs_flip'],
        })
    return out


def accept_snapshot(state, snap):
    """追加新的收盘或更新盘中快照。已有的收盘不改写。无变化时返回原对象。"""
    idx = snap['id']
    prev = state['indices'][idx]
    closes = state['closes'][idx]
    prev_ok = prev.get('status') == 'ok'
    prev_session = prev.get('session_date') if prev_ok else None
    prev_quote = prev.get('quote_timestamp_utc') if prev_ok else None
    if prev_quote and snap['quote_timestamp_utc'] < prev_quote:
        return state, 'older_quote'
    if prev_session and snap['session_date'] < prev_session:
        return state, 'older_than_latest'
    if snap['is_daily_close']:
        if any(c['session_date'] == snap['session_date'] for c in closes):
            return state, 'duplicate_close'
        if closes and snap['session_date'] < closes[-1]['session_date']:
            return state, 'older_than_history'
        state = clone(state)
        row = close_row(snap)
        prior = state['closes'][idx][-1] if state['closes'][idx] else None
        state['closes'][idx].append(row)
        state['events'].extend(detect_events(prior, row, idx))
        state['indices'][idx] = snap
        return state, 'appended_close'
    if prev_ok and prev.get('is_daily_close') and prev_session == snap['session_date']:
        return state, 'intraday_after_close'
    if prev_quote and snap['quote_timestamp_utc'] == prev_quote:
        return state, 'same_quote'
    state = clone(state)
    state['indices'][idx] = snap
    return state, 'updated_intraday'


def mark_fetch_failure(state, index_id, reason, now):
    """保留这一只上一次的数字和行情时间。同一天同一原因不反复改文件。"""
    attempt = taipei_stamp(now)
    reason = str(reason)[:300]
    prev = state['indices'][index_id]
    if (prev.get('stale') and prev.get('stale_reason') == reason
            and (prev.get('last_attempt') or '')[:10] == attempt[:10]):
        return state, 'failure_unchanged'
    state = clone(state)
    ix = state['indices'][index_id]
    ix['stale'] = True
    ix['stale_reason'] = reason
    ix['last_attempt'] = attempt
    if ix.get('status') != 'ok':
        ix['status'] = 'unavailable'
    return state, 'failed'


def load_state(path):
    if not os.path.exists(path):
        return initial_state()
    with open(path, encoding='utf-8') as f:
        data = json.load(f)
    if not isinstance(data, dict) or data.get('version') != 1 or data.get('kind') != 'index_option_gex':
        raise ChainError('已有的 gex 快照版本对不上，没有覆盖')
    data.setdefault('events', [])
    data.setdefault('closes', {})
    data.setdefault('indices', {})
    data.setdefault('method', METHOD)
    data['formula'] = FORMULA
    data['assumption'] = ASSUMPTION
    data['proxy'] = False
    for idx, meta in INDEXES.items():
        data['closes'].setdefault(idx, [])
        data['indices'].setdefault(idx, blank_index(meta))
    return data


def atomic_write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        f.write(text)
    os.replace(tmp, path)


def save_state(state, json_path, js_path):
    text = json.dumps(state, ensure_ascii=False, indent=2)
    atomic_write(json_path, text + '\n')
    atomic_write(js_path, 'window.GEX=' + text + ';\n')


def _parse_http_date(value):
    if not value:
        return None
    try:
        return dt.datetime.strptime(value.strip(), '%a, %d %b %Y %H:%M:%S GMT').replace(tzinfo=UTC)
    except ValueError:
        return None


def _last_header_block(text):
    blocks, cur = [], {}
    for line in text.splitlines():
        if line.startswith('HTTP/'):
            if cur:
                blocks.append(cur)
            cur = {}
            continue
        if ':' in line:
            k, v = line.split(':', 1)
            cur[k.strip().lower()] = v.strip()
    if cur:
        blocks.append(cur)
    return blocks[-1] if blocks else {}


def fetch_cboe(index_id, url):
    hdr = DATA_JSON + '.%s.hdr' % index_id
    body = DATA_JSON + '.%s.body' % index_id
    try:
        proc = subprocess.run(
            ['curl', '-sL', '--max-redirs', '5', '-m', '120', '-A', UA,
             '-D', hdr, '-o', body, '-w', '%{http_code} %{url_effective}', url],
            capture_output=True, timeout=150)
        if proc.returncode != 0:
            err = proc.stderr.decode('utf-8', 'replace')[:200]
            raise ChainError('下载失败 %s' % err)
        meta_line = proc.stdout.decode('utf-8', 'replace').strip().split(' ', 1)
        code = meta_line[0] if meta_line else ''
        final = meta_line[1] if len(meta_line) > 1 else ''
        headers = _last_header_block(open(hdr, encoding='utf-8', errors='replace').read()) if os.path.exists(hdr) else {}
        size = os.path.getsize(body) if os.path.exists(body) else 0
        if code != '200' or size < 1000:
            raise ChainError('HTTP %s，长度 %s' % (code or '无', size))
        with open(body, encoding='utf-8') as f:
            payload = json.load(f)
        if not isinstance(payload, dict) or 'data' not in payload:
            raise ChainError('JSON 里没有 data')
        modified = headers.get('last-modified')
        return payload, {
            'status': 200,
            'content_length': int(headers.get('content-length') or size),
            'last_modified_text': modified,
            'last_modified': _parse_http_date(modified),
            'final_url': final,
        }
    finally:
        for p in (hdr, body):
            try:
                os.remove(p)
            except OSError:
                pass


def run(now=None, fetch=None, json_path=None, js_path=None):
    now = now or dt.datetime.now(UTC)
    json_path = json_path or DATA_JSON
    js_path = js_path or DATA_JS
    fetch = fetch or fetch_cboe
    state = load_state(json_path)
    changed = False
    notes = []
    for idx, meta in INDEXES.items():
        before = state
        try:
            payload, http_meta = fetch(idx, meta['url'])
            snap = compute_index(idx, payload, http_meta, now)
            state, status = accept_snapshot(state, snap)
            notes.append('%s %s' % (idx, status))
        except Exception as e:
            state, status = mark_fetch_failure(state, idx, e, now)
            notes.append('%s %s: %s' % (idx, status, e))
        if state is not before:
            changed = True
    if changed:
        save_state(state, json_path, js_path)
    print('；'.join(notes) + ('；已写入' if changed else '；没有改文件'))
    return state


if __name__ == '__main__':
    run()
