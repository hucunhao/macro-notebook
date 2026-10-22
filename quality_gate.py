#!/usr/bin/env python3
"""
发布前的质量检查（GitHub Actions 在提交前运行；本机也可以直接跑：python3 quality_gate.py）。

规则：
- 只有“核心来源”能阻止发布：总览页用的利率、信用利差、标普/纳指、VIX（FRED / 美国财政部 / Cboe）。
  核心来源“缺失”（这次没抓到、也没有任何旧文件）或核心序列为空 → 退出码 1，不提交。
  核心来源“沿用旧文件”（cached）→ 只给警告，照常发布（其它数据照样更新）。
- 扩展来源（东方财富全球股指/商品汇率/QDII、FRED 发布日历、美联储日程、纳斯达克财报、成分股、CNN、其它纳斯达克 ETF）
  永远不阻止发布，只打印警告。它们抓不到时脚本已经沿用了上一版数据。
"""
import json, os, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
D = os.path.join(ROOT, 'data')
GH = os.environ.get('GITHUB_ACTIONS') == 'true'
def warn(msg): print(('::warning::' if GH else '警告：') + msg)
def err(msg): print(('::error::' if GH else '错误：') + msg)

def main():
    S = json.load(open(os.path.join(D, 'series.json')))
    m = S['meta']; st = m.get('status', {})
    core = m.get('core') or {}
    core_series = m.get('core_series') or []
    print('核心来源：', core)
    bad = []
    for k, v in core.items():
        if v == 'missing': bad.append(f'{k} 缺失')
        elif v != 'ok': warn(f'核心来源 {k} 这次没抓到新数据，沿用上次的文件（{v}）')
    for k in core_series:
        s = S['series'].get(k)
        if not s or len(s.get('v', [])) < 100: bad.append(f'核心序列 {k} 为空或太短')
    others = {k: v for k, v in st.items() if k not in core and v not in ('ok', 'skipped')}
    if others: warn(f'非核心来源有 {len(others)} 个没抓到新数据（不阻止发布）：' + ', '.join(f'{k}={v}' for k, v in list(others.items())[:15]))
    for name in ('world', 'calendar', 'earnings', 'qdii', 'sp500'):
        try: o = json.load(open(os.path.join(D, name + '.json')))
        except Exception as e: warn(f'扩展数据 {name} 读不到（{e}），网页会显示“暂不可得”'); continue
        sn = o.get('stale_n')
        ex = [k for k, v in (o.get('status') or {}).items() if v in (False, 'missing', 'cached')]
        print(f'扩展数据 {name}: 数据截至 {o.get("asof")}，对应美股交易日 {o.get("session")}，沿用旧数据 {sn if sn is not None else "—"} 条')
        if ex: warn(f'扩展数据 {name}: {len(ex)} 个请求没成功（不阻止发布）：' + ', '.join(ex[:10]))
    if bad:
        err('核心数据有问题，这次不发布：' + '；'.join(bad)); return 1
    print('质量检查通过：核心数据完整' + ('（全部是新抓的）' if m.get('core_ok') else '（部分沿用旧文件，见上面的警告）'))
    return 0

def us_session(now=None):
    """最近一个已经收盘的美股交易日（美东 16:15 之后算当天；不考虑节假日）。和 update_data.py 里的同名函数一致。"""
    import datetime as dt
    from zoneinfo import ZoneInfo
    t = (now or dt.datetime.now(dt.timezone.utc)).astimezone(ZoneInfo('America/New_York'))
    d = t.date()
    if d.weekday() >= 5 or (t.hour, t.minute) < (16, 15):
        d -= dt.timedelta(days=1)
        while d.weekday() >= 5: d -= dt.timedelta(days=1)
    return d.isoformat()

def already_updated():
    """定时任务开跑前用：已发布的数据如果已经对应最近一个美股交易日、并且核心来源当时全部抓到新数据，就不用再跑。
    结果写到 $GITHUB_OUTPUT 的 skip=true/false；退出码总是 0。"""
    want = us_session()
    try: m = json.load(open(os.path.join(D, 'series.json')))['meta']
    except Exception: m = {}
    have, core_ok = m.get('session'), m.get('core_ok')
    skip = bool(have and have >= want and core_ok)
    print(f'最近一个已收盘的美股交易日：{want}；已发布数据对应：{have or "未知"}，核心来源全部新抓：{core_ok}。'
          + ('已经是最新，这次跳过。' if skip else '需要更新。'))
    out = os.environ.get('GITHUB_OUTPUT')
    if out:
        with open(out, 'a') as f: f.write(f'skip={"true" if skip else "false"}\n')
    return 0

if __name__ == '__main__':
    sys.exit(already_updated() if '--already-updated' in sys.argv else main())
