"""
第 3 周：信用开关 + VIX 规则回测（规则在 /workspace/quant_course/week3_spec.md 里预先登记，不调参）
由 update_data.py 调用：build(read_fred, S, raw_dir) -> dict（写进 data/week3.js），并写 week3_results.md
"""
import math, datetime as dt, statistics as st, os, bisect

RULES = ['L', 'C', 'V', 'LC']
RULE_NAME = {'L':'L 利差水平（扩展 z > +1 离场，< +0.5 回来）', 'C':'C 利差变化（63 日变化 > +0.50 离场，< 0 回来）',
             'V':'V 恐慌（VIX 20 日均值 > 30 离场，< 25 回来）', 'LC':'L+C 组合（两个都离场才离场，任一解除就回来）'}
RUNS = {'base': dict(lag=0, cost=0.001, name='基础：晚 1 周执行，每次切换 0.1%'),
        'real': dict(lag=5, cost=0.005, name='现实：再晚 5 个交易日，来回 1%（每次切换 0.5%）')}
IS_END = '2005-12-31'; OOS_START = '2006-01-01'
START = '1986-01-01'

def ffill_on(cal, ser):
    """把 (date, value) 序列对齐到交易日历，缺的用前值"""
    ds = [d for d,_ in ser]; out = []
    for d in cal:
        i = bisect.bisect_right(ds, d) - 1
        out.append(ser[i][1] if i >= 0 else None)
    return out

def week_ends(cal):
    idx = []
    for i, d in enumerate(cal):
        if i == len(cal)-1: idx.append(i); break
        a = dt.date.fromisoformat(d).isocalendar()[:2]; b = dt.date.fromisoformat(cal[i+1]).isocalendar()[:2]
        if a != b: idx.append(i)
    return idx

def signals(cal, baa, vix, wk):
    """每周最后一个交易日计算信号；返回 {rule: [1=持股/0=离场/None=还不能算]}，与 wk 对齐"""
    n = len(wk); out = {r: [None]*n for r in RULES}
    wbaa = [baa[i] for i in wk]
    stL = stC = stV = 1
    for k, i in enumerate(wk):
        # L：扩展窗口 z，只用过去的周（不含本周），前 260 周（5 年）做预热
        if k >= 260 and wbaa[k] is not None:
            past = [x for x in wbaa[:k] if x is not None]
            m = sum(past)/len(past); sd = math.sqrt(sum((x-m)**2 for x in past)/len(past))
            z = (wbaa[k]-m)/sd
            assert len(past) <= k   # 当周不在窗口里
            if z > 1.0: stL = 0
            elif z < 0.5: stL = 1
            out['L'][k] = stL
        # C：63 个交易日变化
        if i >= 63 and baa[i] is not None and baa[i-63] is not None:
            c = baa[i] - baa[i-63]
            if c > 0.50: stC = 0
            elif c < 0: stC = 1
            out['C'][k] = stC
        # V：VIX 20 日均值（VIXCLS 1990 年起）
        w = [x for x in vix[max(0, i-19):i+1] if x is not None]
        if len(w) == 20 and all(vix[j] is not None for j in range(i-19, i+1)):
            a = sum(w)/20
            if a > 30: stV = 0
            elif a < 25: stV = 1
            out['V'][k] = stV
        if out['L'][k] is not None and out['C'][k] is not None:
            out['LC'][k] = 0 if (out['L'][k] == 0 and out['C'][k] == 0) else 1
    return out

def simulate(cal, px, cash_d, wk, sig, lag, cost):
    """信号在第 k 周末算出，在第 k+1 周末收盘执行（再加 lag 个交易日）；执行日扣成本，次日起生效"""
    n = len(cal); execs = {}
    for k in range(len(wk)-1):
        s = sig[k]
        if s is None: continue
        e = wk[k+1] + lag
        if e < n: execs[e] = s
    pos = [1]*n; cur = 1; switches = []; first = None
    eq = [1.0]*n
    for d in range(1, n):
        r = cur*(px[d]/px[d-1]-1) + (1-cur)*cash_d[d]
        eq[d] = eq[d-1]*(1+r)
        if d in execs:
            if first is None: first = d
            if execs[d] != cur:
                eq[d] *= (1-cost); cur = execs[d]; switches.append(d)
        pos[d] = cur
    return eq, pos, switches, first

def metrics(cal, eq, pos, cash_d, switches, i0, i1):
    seg = eq[i0:i1+1]; days = (dt.date.fromisoformat(cal[i1]) - dt.date.fromisoformat(cal[i0])).days; yrs = days/365.25
    cagr = (seg[-1]/seg[0])**(1/yrs) - 1
    rets = [seg[j]/seg[j-1]-1 for j in range(1, len(seg))]
    ex = [rets[j-1] - cash_d[i0+j] for j in range(1, len(seg))]
    vol = st.pstdev(rets)*math.sqrt(252)
    sharpe = (st.mean(ex)*252)/vol if vol > 0 else None
    pk = seg[0]; mdd = 0
    for x in seg:
        pk = max(pk, x); mdd = min(mdd, x/pk-1)
    sw = [s for s in switches if i0 < s <= i1]
    whip = 0
    for a, b in zip(sw, sw[1:]):
        if (dt.date.fromisoformat(cal[b]) - dt.date.fromisoformat(cal[a])).days <= 56: whip += 1
    off = sum(1 for j in range(i0+1, i1+1) if pos[j-1] == 0)/(i1-i0)
    return dict(start=cal[i0], end=cal[i1], years=yrs, cagr=cagr, vol=vol, sharpe=sharpe, mdd=mdd, off=off,
                switches=len(sw), sw_yr=len(sw)/yrs, whip=whip, whip_yr=whip/yrs)

def episodes(cal_full, px_full, start='1986-01-01', thr=0.15):
    hi = -1; hi_i = 0; eps = []; cur = None
    for i, p in enumerate(px_full):
        if p > hi:
            if cur and cur['dd'] <= -thr and cal_full[cur['peak_i']] >= start: cur['end_i'] = i; eps.append(cur)
            cur = None; hi = p; hi_i = i; continue
        dd = p/hi - 1
        if cur is None: cur = dict(peak_i=hi_i, trough_i=i, dd=dd, end_i=None)
        if dd < cur['dd']: cur['dd'] = dd; cur['trough_i'] = i
    if cur and cur['dd'] <= -thr and cal_full[cur['peak_i']] >= start: eps.append(cur)
    return [dict(peak=cal_full[e['peak_i']], trough=cal_full[e['trough_i']], dd=e['dd'], recovered=cal_full[e['end_i']] if e['end_i'] else None) for e in eps]

def episode_row(cal, px, eq, pos, switches, wk, sig, ep):
    ci = {d:i for i,d in enumerate(cal)}
    pi = bisect.bisect_left(cal, ep['peak']); ti = bisect.bisect_left(cal, ep['trough'])
    # 信号首次离场：高点前 26 周到谷底之间的周末信号
    w0 = (dt.date.fromisoformat(ep['peak']) - dt.timedelta(days=182)).isoformat()
    kk = [k for k, i in enumerate(wk) if w0 <= cal[i] <= ep['trough']]
    avail = [k for k in kk if sig[k] is not None]
    if not avail: return dict(status='不评估', note='这段时间信号还不能计算')
    pre_off = sig[avail[0]] == 0 and cal[wk[avail[0]]] <= ep['peak']
    fired = [k for k in avail if sig[k] == 0]
    if not fired: return dict(status='没触发', fired=None, avoided=0.0, reentry=None, missed=None)
    fd = cal[wk[fired[0]]]
    rel_peak = (dt.date.fromisoformat(fd) - dt.date.fromisoformat(ep['peak'])).days/7
    rel_trough = (dt.date.fromisoformat(ep['trough']) - dt.date.fromisoformat(fd)).days/7
    idx_loss = px[ti]/px[pi] - 1; strat = eq[ti]/eq[pi] - 1
    avoided = 1 - strat/idx_loss if idx_loss < 0 else None
    # 离场执行日：信号之后第一次真正切到场外的日期
    w0i = bisect.bisect_left(cal, w0)
    off_ex = next((x for x in switches if x >= w0i and pos[x] == 0 and x <= ti + 260), None)
    exec_d = cal[off_ex] if off_ex is not None else None
    after_trough = off_ex is not None and off_ex > ti
    # 回到场内：在“谷底”和“离场执行日”中较晚的那天之后，第一次切回持股；错过的涨幅 = 指数从谷底到回场日的涨幅（按规格定义）
    base_i = max(ti, off_ex) if off_ex is not None else ti
    re = next((x for x in switches if x > base_i and pos[x] == 1), None)
    back_before_trough = off_ex is not None and off_ex <= ti and pos[ti] == 1
    if back_before_trough: re_d, missed = None, None
    else: re_d = cal[re] if re else None; missed = (px[re]/px[ti]-1) if re else None
    return dict(status='触发', fired=fd, exec=exec_d, exec_after_trough=after_trough, wk_after_peak=rel_peak, wk_before_trough=rel_trough, pre_off=pre_off,
                back_before_trough=back_before_trough, avoided=avoided, reentry=re_d, missed=missed)

def build(read_fred, S, raw_dir, qc_dir='/workspace/quant_course'):
    spx = list(zip(S['series']['SPX']['d'], S['series']['SPX']['v']))
    ndx = list(zip(S['series']['NDX']['d'], S['series']['NDX']['v']))
    baa_raw = read_fred('BAA10Y'); vix_raw = read_fred('VIXCLS'); tb = read_fred('DTB3')
    res = dict(rules=RULE_NAME, runs={k:v['name'] for k,v in RUNS.items()}, idx={}, data_note={})
    for key, ser, nm in (('SPX', spx, '标普 500 价格指数'), ('NDX', ndx, '纳斯达克 100 价格指数')):
        full_cal = [d for d,_ in ser]; full_px = [v for _,v in ser]
        cal = [d for d in full_cal if d >= START]; i_s = full_cal.index(cal[0]); px = full_px[i_s:]
        baa = ffill_on(cal, baa_raw)
        # VIX：只在 VIXCLS 有数据的日期对齐（1990 年以前为 None）
        vd = dict(vix_raw); vix = []; lastv = None
        for d in cal:
            if d in vd: lastv = vd[d]
            vix.append(lastv if d >= vix_raw[0][0] else None)
        tbv = ffill_on(cal, tb); cash_d = [((1+(x or 0)/100)**(1/252) - 1) for x in tbv]
        wk = week_ends(cal); sig = signals(cal, baa, vix, wk)
        bh_eq, bh_pos, bh_sw, _ = simulate(cal, px, cash_d, wk, [1]*len(wk), 0, 0)
        R = dict(name=nm, wk_dates=[cal[i] for i in wk], bh=[round(bh_eq[i], 5) for i in wk], rules={})
        is_end = max(i for i,d in enumerate(cal) if d <= IS_END); oos0 = min(i for i,d in enumerate(cal) if d >= OOS_START); last = len(cal)-1
        eps = episodes(full_cal, full_px) if key == 'SPX' else []
        for r in RULES:
            first_k = next(k for k, s in enumerate(sig[r]) if s is not None)
            R['rules'][r] = dict(first_signal=cal[wk[first_k]], runs={})
            for run, cfg in RUNS.items():
                eq, pos, sw, first_exec = simulate(cal, px, cash_d, wk, sig[r], cfg['lag'], cfg['cost'])
                i0 = first_exec - 1 if first_exec else 0
                m_is = metrics(cal, eq, pos, cash_d, sw, i0, is_end); b_is = metrics(cal, bh_eq, bh_pos, cash_d, [], i0, is_end)
                m_oos = metrics(cal, eq, pos, cash_d, sw, oos0, last); b_oos = metrics(cal, bh_eq, bh_pos, cash_d, [], oos0, last)
                def verdict(m, b):
                    a = (1 - m['mdd']/b['mdd']) >= 1/3; c = (b['cagr'] - m['cagr']) <= 0.01; w = m['whip_yr'] <= 1.0
                    return dict(mdd_cut=1 - m['mdd']/b['mdd'], cagr_cost=b['cagr'] - m['cagr'], pass_mdd=a, pass_cagr=c, pass_whip=w, useful=a and c and w)
                rr = dict(IS=m_is, IS_bh=b_is, OOS=m_oos, OOS_bh=b_oos, v_IS=verdict(m_is, b_is), v_OOS=verdict(m_oos, b_oos),
                          eq=[round(eq[i], 5) for i in wk], pos=[pos[i] for i in wk], eps=[])
                for ep in eps:
                    rr['eps'].append(dict(ep, **episode_row(cal, px, eq, pos, sw, wk, sig[r], ep)))
                R['rules'][r]['runs'][run] = rr
        R['episodes'] = eps
        res['idx'][key] = R
    res['data_note'] = dict(spx='标普 500 价格指数（Cboe），不含分红；没拿到 SP500TR 日线（雅虎限流，Cboe 和纳斯达克都没有）。',
        baa='FRED BAA10Y 日线，1986-01 起，缺失日用前值。', vix='FRED VIXCLS，1990-01 起；1986–1989 年 V 规则不评估，没有拼接 VXO。',
        cash='FRED DTB3（3 个月国库券），按 252 个交易日折算成日收益。', ndx='纳指 100 价格指数（FRED NASDAQ100），作为第二组。')
    res['tr_check'] = tr_check(read_fred, S, raw_dir)
    write_md(res, qc_dir)
    return res

def tr_check(read_fred, S, raw_dir):
    """探索性：用 Shiller 月度股息给标普价格补上分红（近似总回报），只覆盖到 Shiller 数据最后一个月"""
    try:
        import xlrd
        b = xlrd.open_workbook(os.path.join(raw_dir, 'other', 'shiller_ie_data.xls')); sh = b.sheet_by_name('Data')
        dy = {}
        for r in range(8, sh.nrows):
            row = sh.row_values(r)
            if isinstance(row[0], float) and isinstance(row[2], float) and row[1]:
                y = int(row[0]); m = int(round((row[0]-y)*100)); dy[f'{y:04d}-{m:02d}'] = row[2]/row[1]
        lastm = max(dy)
        spx = [(d,v) for d,v in zip(S['series']['SPX']['d'], S['series']['SPX']['v']) if d >= START and d[:7] <= lastm]
        cal = [d for d,_ in spx]; px = [v for _,v in spx]
        tr = [px[0]]
        for i in range(1, len(px)): tr.append(tr[-1]*(px[i]/px[i-1] + dy[cal[i][:7]]/252))
        baa = ffill_on(cal, read_fred('BAA10Y')); vd = dict(read_fred('VIXCLS')); vix = []; lv = None
        for d in cal:
            if d in vd: lv = vd[d]
            vix.append(lv if d >= '1990-01-02' else None)
        cash_d = [((1+(x or 0)/100)**(1/252) - 1) for x in ffill_on(cal, read_fred('DTB3'))]
        wk = week_ends(cal); sig = signals(cal, baa, vix, wk)
        bh_eq, bh_pos, _, _ = simulate(cal, tr, cash_d, wk, [1]*len(wk), 0, 0)
        oos0 = min(i for i,d in enumerate(cal) if d >= OOS_START); last = len(cal)-1
        out = dict(end=cal[-1], rows={})
        b = metrics(cal, bh_eq, bh_pos, cash_d, [], oos0, last)
        for r in RULES:
            eq, pos, sw, _ = simulate(cal, tr, cash_d, wk, sig[r], 5, 0.005)
            m = metrics(cal, eq, pos, cash_d, sw, oos0, last)
            out['rows'][r] = dict(cagr=m['cagr'], bh_cagr=b['cagr'], mdd=m['mdd'], bh_mdd=b['mdd'], whip_yr=m['whip_yr'],
                                  mdd_cut=1-m['mdd']/b['mdd'], cagr_cost=b['cagr']-m['cagr'])
        return out
    except Exception as e:
        return dict(error=str(e))

def P(x, nd=1): return '—' if x is None else f'{x*100:+.{nd}f}%'
def Q(x, nd=1): return '—' if x is None else f'{x*100:.{nd}f}%'
def yn(b): return '✅ 通过' if b else '❌ 不通过'

def write_md(res, qc):
    L = ['# 第 3 周结果：信用开关 + VIX 规则回测', '', '规则和判定标准在 `week3_spec.md` 里预先登记，没有调参。', '',
         '## 数据', ''] + [f'- {v}' for v in res['data_note'].values()] + ['',
         '## 时间安排', '', '- 每周最后一个交易日收盘算信号，下一周最后一个交易日收盘执行（晚 1 周）。执行日扣成本，次日起生效。',
         '- 基础版：每次切换 0.1%。现实版（模拟场外 QDII）：再晚 5 个交易日，来回 1%（每次切换 0.5%）。',
         '- 离场 = 100% 国库券（DTB3），持股 = 100% 指数。基准 = 一直持有。',
         '- 样本内：从各规则第一次能算出信号开始到 2005-12-30；样本外：2006-01-03 到最新。基准在同一时间段计算。',
         '- 来回打脸（whipsaw）：一次切换在 8 周（56 天）内被反向切换。', '']
    for key in ('SPX', 'NDX'):
        R = res['idx'][key]
        L += [f'## {R["name"]}', '']
        L += ['### 判定（样本外、现实版成本）', '', '| 规则 | 最大回撤减少 ≥ 1/3 | 年化收益少 ≤ 1 个百分点 | 来回打脸 ≤ 1 次/年 | 结论 |', '|---|---|---|---|---|']
        for r in RULES:
            v = R['rules'][r]['runs']['real']['v_OOS']
            L.append(f"| {RULE_NAME[r]} | {Q(v['mdd_cut'],0)}，{yn(v['pass_mdd'])} | {v['cagr_cost']*100:+.2f}，{yn(v['pass_cagr'])} | {R['rules'][r]['runs']['real']['OOS']['whip_yr']:.2f}，{yn(v['pass_whip'])} | {'**有用**' if v['useful'] else '只做看板指标'} |")
        L.append('')
        L += ['### 样本内的同样三条（现实版，仅供参考）', '', '| 规则 | 回撤减少 | 年化少多少（百分点） | 打脸/年 | 三条都过？ |', '|---|---|---|---|---|']
        for r in RULES:
            rr = R['rules'][r]['runs']['real']; v = rr['v_IS']
            L.append(f"| {r} | {Q(v['mdd_cut'],0)} {('✅' if v['pass_mdd'] else '❌')} | {v['cagr_cost']*100:+.2f} {('✅' if v['pass_cagr'] else '❌')} | {rr['IS']['whip_yr']:.2f} {('✅' if v['pass_whip'] else '❌')} | {'是' if v['useful'] else '否'} |")
        L.append('')
        for run in ('base', 'real'):
            L += [f'### 全部指标：{res["runs"][run]}', '', '| 规则 | 区间 | 时间段 | 年化 | 波动 | 夏普 | 最大回撤 | 离场时间 | 切换/年 | 打脸/年 |', '|---|---|---|---|---|---|---|---|---|---|']
            for r in RULES:
                rr = R['rules'][r]['runs'][run]
                for seg in ('IS', 'OOS'):
                    m = rr[seg]; b = rr[seg + '_bh']
                    L.append(f"| {r} | {'样本内' if seg=='IS' else '样本外'} | {m['start']} → {m['end']} | {P(m['cagr'])} | {Q(m['vol'])} | {m['sharpe']:.2f} | {P(m['mdd'])} | {Q(m['off'],0)} | {m['sw_yr']:.2f} | {m['whip_yr']:.2f} |")
                    L.append(f"| 一直持有 | {'样本内' if seg=='IS' else '样本外'} | 同上 | {P(b['cagr'])} | {Q(b['vol'])} | {b['sharpe']:.2f} | {P(b['mdd'])} | 0% | 0 | 0 |")
            L.append('')
        if key == 'SPX':
            L += ['### 每次熊市（标普价格从历史高点跌 ≥ 15%；≥ 20% 的是主表）', '']
            for run in ('real', 'base'):
                L += [f'#### {res["runs"][run]}', '', '| 熊市 | 高点 → 谷底 | 跌幅 | 规则 | 首次离场信号 | 相对高点 | 距谷底 | 离场执行日 | 躲过的跌幅 | 回到场内 | 谷底到回场的指数涨幅（错过） |', '|---|---|---|---|---|---|---|---|---|---|---|']
                for j, ep in enumerate(R['episodes']):
                    tag = '主表' if ep['dd'] <= -0.20 else '15–20%'
                    for r in RULES:
                        e = R['rules'][r]['runs'][run]['eps'][j]
                        if e['status'] != '触发':
                            L.append(f"| {ep['peak'][:4]}（{tag}） | {ep['peak']} → {ep['trough']} | {P(ep['dd'])} | {r} | {e['status']} | — | — | — | {'—' if e['status']=='不评估' else '0%'} | — | — |"); continue
                        L.append(f"| {ep['peak'][:4]}（{tag}） | {ep['peak']} → {ep['trough']} | {P(ep['dd'])} | {r} | {e['fired']}{'（高点前已在场外）' if e['pre_off'] else ''} | {e['wk_after_peak']:+.0f} 周 | {e['wk_before_trough']:.0f} 周前 | {(e['exec'] or '—') + ('（谷底之后）' if e['exec_after_trough'] else '')} | {Q(e['avoided'],0)} | {e['reentry'] or ('谷底前已回场' if e['back_before_trough'] else '还没回来')} | {P(e['missed']) if e['missed'] is not None else '—'} |")
                L.append('')
            # 2022
            L += ['### 2022 年单独看', '']
            j = next(i for i, ep in enumerate(R['episodes']) if ep['peak'].startswith('2022'))
            for r in RULES:
                e = R['rules'][r]['runs']['real']['eps'][j]
                L.append(f"- {r}：{e['status']}" + (f"，{e['fired']} 首次离场，躲过 {Q(e['avoided'],0)}" if e['status'] == '触发' else ''))
            L.append('')
    t = res.get('tr_check', {})
    L += ['## 探索性检查：近似总回报（不是预先登记的结果）', '']
    if 'error' in t: L.append(f'没做成：{t["error"]}')
    else:
        L += [f'用 Shiller 的月度股息给标普价格补上分红，样本外 2006-01 到 {t["end"]}（Shiller 数据只到这里），现实版成本。', '',
              '| 规则 | 年化 | 一直持有年化 | 年化少多少 | 回撤减少 | 打脸/年 |', '|---|---|---|---|---|---|']
        for r, x in t['rows'].items():
            L.append(f"| {r} | {P(x['cagr'])} | {P(x['bh_cagr'])} | {x['cagr_cost']*100:+.2f} | {Q(x['mdd_cut'],0)} | {x['whip_yr']:.2f} |")
    L += ['', '## 局限', '', '- 价格指数没算分红：持股时少了约 1.5–2%/年，离场时却拿着国库券利息，这对规则有利；上面的近似总回报检查给出了影响大小。',
          '- 周度决策、日度记账；最大回撤按日收盘计算。', '- 熊市只有个位数，每条规则在每次熊市的表现都是一个故事。', '- 规则没有调参，样本内外用同一套；调参和过度拟合是第 6 周的话题。']
    open(os.path.join(qc, 'week3_results.md'), 'w').write('\n'.join(L) + '\n')
