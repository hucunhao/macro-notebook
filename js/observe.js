// 观察页：市场阶段判断 + 四大块指标
const Observe = (() => {
  const TV = s => `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(s)}`;
  const RATING = { 'extreme fear':'极度恐惧', 'fear':'恐惧', 'neutral':'中性', 'greed':'贪婪', 'extreme greed':'极度贪婪' };

  // ---------- 计算 ----------
  function chg(id, k, mode){ // mode: 'abs' 或 'pct'
    const s = U.ser(id); if (!s) return null; const n = s.v.length; if (n <= k) return null;
    const a = s.v[n-1], b = s.v[n-1-k]; return mode === 'pct' ? a/b - 1 : a - b;
  }
  const lastv = id => { const s = U.ser(id); return s ? U.last(s.v) : null; };
  const lastd = id => { const s = U.ser(id); return s ? U.last(s.d) : null; };

  function compute(T){
    const R = {}; // 各区块的灯和规则
    const rules = [];
    const add = (area, l, text, heur = true) => rules.push({ area, l, text, heur });
    // 信用
    const hy = lastv('HY_OAS'), hy1m = chg('HY_OAS', 21, 'abs'), ccc = lastv('CCC_OAS'), ccc1m = chg('CCC_OAS', 21, 'abs'), ig3m = chg('IG_OAS', 63, 'abs');
    let lc = 'n';
    if (hy != null){
      const lv = hy > T.hy_red ? 'r' : hy > T.hy_line ? 'y' : 'g';
      add('信用', lv, `HY 利差 ${hy.toFixed(0)}bp（${lastd('HY_OAS')}）：${lv==='r' ? `高于红线 ${T.hy_red}bp` : lv==='y' ? `高于 ${T.hy_line}bp（和先行条件①同一条线）` : `低于 ${T.hy_line}bp（和先行条件①同一条线）`}。红线 ${T.hy_red}bp 是临时经验值`, false);
      const sp = hy1m >= T.hy_speed_r ? 'r' : hy1m >= T.hy_speed_y ? 'y' : 'g';
      add('信用', sp, `HY 利差 1 个月变化 ${U.sgn(hy1m,0,'bp')}：${sp==='g' ? `没超过 +${T.hy_speed_y}bp` : `超过 +${sp==='r'?T.hy_speed_r:T.hy_speed_y}bp，在快速走阔`}`);
      lc = U.worst(lv, sp);
    }
    if (ccc != null){
      const sp = ccc1m >= T.ccc_speed_r ? 'r' : ccc1m >= T.ccc_speed_y ? 'y' : 'g';
      add('信用', sp, `最弱一层 CCC 利差 ${ccc.toFixed(0)}bp，1 个月变化 ${U.sgn(ccc1m,0,'bp')}：${sp==='g' ? `没超过 +${T.ccc_speed_y}bp` : `超过 +${sp==='r'?T.ccc_speed_r:T.ccc_speed_y}bp，最弱的公司先出问题`}`);
      lc = U.worst(lc, sp);
    }
    R.credit = lc;
    // 利率
    const r10 = lastv('UST10');
    R.rates = r10 == null ? 'n' : r10 > T.r10_red ? 'r' : r10 > T.r10_line ? 'y' : 'g';
    if (r10 != null) add('利率', R.rates, `10 年美债 ${r10.toFixed(2)}%（${lastd('UST10')}）：${R.rates==='g' ? `低于参考线 ${T.r10_line}%` : R.rates==='y' ? `高于参考线 ${T.r10_line}%，估值受压` : `高于红线 ${T.r10_red}%，估值压力很大`}`);
    // 广度
    const rsp3 = chg('RSP_SPY', 63, 'pct'), iwm = U.ser('IWM_SPY') ? U.stats(U.ser('IWM_SPY')).pos : null;
    let lb = 'n';
    if (rsp3 != null){ const l = rsp3 < -T.rsp_drop/100 ? 'y' : 'g'; add('广度', l, `等权÷市值权重（RSP÷SPY）3 个月 ${U.pct(rsp3)}：${l==='y' ? '涨势集中在巨头' : '没有明显变窄'}`); lb = l; }
    if (iwm != null){ const l = iwm*100 < T.iwm_pos ? 'y' : 'g'; add('广度', l, `小盘÷大盘（IWM÷SPY）处在一年区间的 ${(iwm*100).toFixed(0)}% 位置：${l==='y' ? '小盘接近一年最弱' : '小盘没有特别弱'}`); lb = U.worst(lb, l); }
    R.breadth = lb;
    // 波动和情绪
    const vix = lastv('VIX'); const fg = MS.fg && MS.fg.score;
    let lv = 'n';
    if (vix != null){ lv = vix > T.vix_panic ? 'r' : vix < T.vix_calm ? 'y' : 'g'; add('波动', lv, `VIX ${vix.toFixed(1)}：${lv==='r' ? `高于 ${T.vix_panic}，恐慌` : lv==='y' ? `低于 ${T.vix_calm}，自满` : `在 ${T.vix_calm}–${T.vix_panic} 之间，正常`}`); }
    if (fg != null){ const l = fg < T.fg_fear || fg > T.fg_greed ? 'y' : 'g'; add('波动', l, `CNN 恐惧贪婪 ${fg.toFixed(0)}（${RATING[MS.fg.rating]||MS.fg.rating}）：${fg < T.fg_fear ? '极度恐惧' : fg > T.fg_greed ? '极度贪婪' : '不在极端'}`); lv = U.worst(lv, l); }
    R.vol = lv;
    // 跨资产诊断
    const dy = chg('UST10', 21, 'abs'), ds = chg('SPX', 21, 'pct'), du = chg('USD_BROAD', 21, 'pct'), dg = chg('GLD', 21, 'pct');
    const yUp = dy != null && dy > T.diag_yield, sDown = ds != null && ds < -T.diag_stock/100, uUp = du != null && du > T.diag_usd/100, gUp = dg != null && dg > T.diag_gold/100;
    const diag = { dy, ds, du, dg, rows: [yUp && sDown, uUp && sDown, gUp && yUp] };
    // 阶段
    const fear = (vix != null && vix > T.vix_panic) || (fg != null && fg < T.fg_fear);
    const greed = (vix != null && vix < T.vix_calm) && (fg != null && fg > T.fg_greed);
    let stage, one, overall;
    if (R.credit === 'r'){ overall = 'r'; stage = '信用断裂'; one = 'VIX、情绪、广度这些“抄底信号”此时是陷阱，先看信用什么时候止血。'; }
    else if (R.credit === 'y'){ overall = 'y'; stage = '信用松动'; one = '利差在走阔（尤其最弱的一层），逆向信号要打折扣，等信用企稳再相信它们。' + (R.rates !== 'g' ? '同时利率偏高，估值也在受压。' : ''); }
    else if (R.credit === 'g' && fear){ overall = 'g'; stage = '信用平静中的恐慌'; one = '信用没出问题，情绪却很怕。按你的框架，这是逆向信号可信的时候。'; }
    else if (R.credit === 'g' && R.rates !== 'g'){ overall = 'y'; stage = '利率压估值'; one = '信用平静，但利率高于参考线，压的是估值倍数，长久期和小盘更受伤。'; }
    else if (R.credit === 'g' && greed){ overall = 'y'; stage = '平静但自满'; one = '信用平静、市场乐观，赔率在变差，不适合追高。'; }
    else if (R.credit === 'g'){ overall = 'g'; stage = '平稳'; one = '信用平静，其他信号也没有极端。'; }
    else { overall = 'n'; stage = '数据不足'; one = '缺少信用数据，无法判断总开关。'; }
    const diagTxt = diag.rows[2] ? '跨资产：黄金和收益率同涨，最接近危险，盯紧信用。' : diag.rows[1] ? '跨资产：美元大涨同时股票下跌，像全球流动性收缩。' : diag.rows[0] ? '跨资产：收益率升、股票跌，属于纯杀估值，可逆。' : '跨资产：过去 1 个月没有对上诊断表里的任何一种病因。';
    // 先行条件
    const igv = lastv('IG_OAS');
    const t1 = hy != null && ig3m != null ? { live: hy > T.hy_line && ig3m > T.ig_widen, text: `HY OAS ${hy.toFixed(0)}bp（${lastd('HY_OAS')}，要 >${T.hy_line}bp）；IG OAS 63 个交易日变化 ${U.sgn(ig3m,0,'bp')}（${U.ser('IG_OAS').d[U.ser('IG_OAS').d.length-64]} → ${lastd('IG_OAS')}，要 >+${T.ig_widen}bp）` } : { live: null, text: '暂无数据' };
    const fs = U.ser('FEDU'), cs = U.ser('CORECPI_YOY');
    let t2 = { live: null, text: '暂无数据' };
    if (fs && cs){
      // 最近一次调整是加息，并且发生在最近 fed_months 个月内（加息后暂停仍算加息周期）
      const n = fs.v.length, fedNow = fs.v[n-1]; let k = n-1; while (k > 0 && fs.v[k-1] === fs.v[k]) k--;
      const lastChg = k > 0 ? { date: fs.d[k], from: fs.v[k-1], to: fs.v[k] } : null;
      const cut = new Date(U.ts(fs.d[n-1])*1000); cut.setUTCMonth(cut.getUTCMonth() - T.fed_months);
      const recent = lastChg && U.ts(lastChg.date)*1000 >= cut.getTime();
      const hiking = !!(lastChg && lastChg.to > lastChg.from && recent);
      const m = cs.v.length, cpiNow = cs.v[m-1], cpi3 = cs.v[m-4];
      t2 = { live: hiking && cpiNow > cpi3, text: `联储目标上限 ${fedNow.toFixed(2)}%；最近一次调整：${lastChg ? `${lastChg.date} 从 ${lastChg.from.toFixed(2)}% ${lastChg.to > lastChg.from ? '加息' : '降息'}到 ${lastChg.to.toFixed(2)}%` : '无'}（${hiking ? `是加息，且在最近 ${T.fed_months} 个月内` : `不满足“最近 ${T.fed_months} 个月内的加息”`}）；核心 CPI 同比 ${cpiNow.toFixed(3)}%（${cs.d[m-1].slice(0,7)}），3 个月前 ${cpi3.toFixed(3)}%（${cs.d[m-4].slice(0,7)}）：${cpiNow > cpi3 ? (cpiNow - cpi3 < 0.01 ? `只高 ${(cpiNow - cpi3).toFixed(5)} 个百分点，几乎持平，按字面规则算“上升”` : '在上升') : '没上升'}` };
    }
    const ws = U.ser('WTI');
    let t3 = { live: null, text: '暂无数据' };
    if (ws){
      // 月末值：每个已结束月份的最后一个交易日
      const me = {}; ws.d.forEach((d, i) => me[d.slice(0,7)] = [d, ws.v[i]]);
      const curM = U.last(ws.d).slice(0,7); const months = Object.keys(me).filter(m => m < curM).sort();
      const yoyOf = m => { const p = (+m.slice(0,4) - 1) + m.slice(4); return me[p] ? me[m][1]/me[p][1] - 1 : null; };
      const last2 = months.slice(-2).map(m => ({ m, d: me[m][0], v: me[m][1], y: yoyOf(m) }));
      const both = last2.length === 2 && last2.every(x => x.y != null && x.y*100 > T.oil_yoy);
      const n = ws.v.length, w252 = ws.v.slice(n-252), max252 = Math.max(...w252), max20 = Math.max(...ws.v.slice(n-20));
      const hiDate = ws.d[n-252 + w252.indexOf(max252)];
      const newHigh = max20 >= max252;
      t3 = { live: both && newHigh, text: `WTI 月末同比：${last2.map(x => `${x.m} ${U.sgn(x.y*100,1,'%')}`).join('，')}（两个都要 >+${T.oil_yoy}%：${both ? '是' : '否'}）；52 周最高收盘 ${max252.toFixed(2)}（${hiDate}），最近 20 个交易日最高 ${max20.toFixed(2)}（${newHigh ? '创了新高' : '没创新高'}）。数据是 FRED 的 WTI 现货价（库欣），最新 ${U.last(ws.d)}，用来近似近月期货` };
    }
    const t4 = { live: !!T.ai_stress, text: (T.ai_stress ? `手动判断：正在扩散。${T.ai_note ? '依据：' + T.ai_note + '。' : ''}` : '手动判断：没有扩散。') + `关掉的条件：${AI_OFF}（在门槛设置里切换）`, manual: true };
    const trig = [t1, t2, t3, t4]; const nLive = trig.filter(t => t.live).length;
    // 分档
    function tier(id, ts){
      const s = U.ser(id); if (!s) return null; let m = -Infinity, md = null; s.v.forEach((v, i) => { if (v > m){ m = v; md = s.d[i]; } });
      const x = U.last(s.v); return { last: x, date: U.last(s.d), high: m, highDate: md, dd: x/m - 1, tiers: ts };
    }
    const tiers = { SPX: tier('SPX', [T.spx_t1, T.spx_t2, T.spx_t3]), NDX: tier('NDX', [T.ndx_t1, T.ndx_t2, T.ndx_t3]) };
    return { R, rules, stage, one, overall, diag, diagTxt, trig, nLive, tiers };
  }

  // ---------- 指标卡配置 ----------
  // kind: bp=基点, pp=百分点, pct=价格类按百分比, pt=点数
  const B = {};
  B.credit = [
    { id:'HY_OAS', kind:'bp', nd:0, upBad:true, tv:'FRED:BAMLH0A0HYM2', hl: T => [{ y:T.hy_line, label:`警戒线 ${T.hy_line}`, include:true }],
      read:'整体高收益债利差贴近 2007 历史低位（≈2.41%）。<b>关键看走阔速度</b>：快速上行 = 融资链报警。CCC 是最弱一层、最先裂。',
      readNote:'这句是你当初写的。现在的读数见上面。',
      rule: (s, T) => { const c = s.last - s.prev21; return s.last > T.hy_red ? ['r', `高于红线 ${T.hy_red}bp`] : c >= T.hy_speed_r ? ['r', `1 个月走阔 ${c.toFixed(0)}bp，超过 ${T.hy_speed_r}`] : c >= T.hy_speed_y ? ['y', `1 个月走阔 ${c.toFixed(0)}bp，超过 ${T.hy_speed_y}`] : s.last > T.hy_line ? ['y', `高于警戒线 ${T.hy_line}bp`] : ['g', `低于 ${T.hy_line}bp，1 个月变化 ${U.sgn(c,0,'bp')}`]; } },
    { id:'CCC_OAS', kind:'bp', nd:0, upBad:true, tv:'FRED:BAMLH0A3HYC', read:'CCC 是最弱一层、最先裂。盯最弱的一层，看速度不看水平。',
      rule: (s, T) => { const c = s.last - s.prev21; return c >= T.ccc_speed_r ? ['r', `1 个月走阔 ${c.toFixed(0)}bp，超过 ${T.ccc_speed_r}`] : c >= T.ccc_speed_y ? ['y', `1 个月走阔 ${c.toFixed(0)}bp，超过 ${T.ccc_speed_y}`] : ['g', `1 个月变化 ${U.sgn(c,0,'bp')}`]; } },
    { id:'IG_OAS', kind:'bp', nd:0, upBad:true, trig:true, tv:'FRED:BAMLC0A0CM', read:'投资级很少违约；它也开始走阔，说明压力已蔓延到优质层。',
      rule: (s, T) => { const c = s.last - s.prev63; return c > T.ig_widen ? ['y', `63 个交易日走阔 ${c.toFixed(0)}bp，超过 ${T.ig_widen}`] : ['g', `63 个交易日变化 ${U.sgn(c,0,'bp')}，没超过 +${T.ig_widen}`]; } },
    { id:'BAA10Y', kind:'bp', nd:0, upBad:true, tv:'FRED:BAA10Y', range:'5Y', read:'更慢、更结构性的信用压力背景读数。' },
    { id:'HYG', kind:'pct', nd:2, tv:'AMEX:HYG', read:'垃圾债价格。股跌但 HYG 不跌 = 普通回调；HYG 跟跌 + 加速 = 危险。' },
    { id:'HYG_LQD', kind:'pct', nd:4, tv:'AMEX:HYG/AMEX:LQD', read:'高收益 ÷ 投资级。下行 = 风险偏好收缩、信用走弱的快速代理。',
      rule: (s) => { const c = s.last/s.prev21 - 1; return c < -0.01 ? ['y', `1 个月 ${U.pct(c)}，在走弱`] : ['g', `1 个月 ${U.pct(c)}`]; } },
    { id:'JNK', kind:'pct', nd:2, tv:'AMEX:JNK', read:'第二个垃圾债价格读数，与 HYG 交叉验证。' },
    { id:'LQD', kind:'pct', nd:2, tv:'AMEX:LQD', read:'投资级很少违约；它也开始崩，说明压力已蔓延到优质层。' },
  ];
  B.gold = [
    { id:'GLD', kind:'pct', nd:2, tv:'TVC:GOLD', read:'与收益率同涨 = 贬值 / 信用担忧的“病因”线索。',
      rule: (s, T) => { const dg = s.last/s.prev21 - 1, dy = chg('UST10', 21, 'abs'); return (dg > T.diag_gold/100 && dy > T.diag_yield) ? ['r', '黄金和收益率同涨'] : ['g', `1 个月 ${U.pct(dg)}，收益率 1 个月 ${U.sgn(dy,2,' 个百分点')}，不是同涨`]; } },
    { manual:'gold_spot' },
    { id:'REAL10', kind:'pp', nd:2, upBad:true, tv:'FRED:DFII10', read:'实际利率越高，持有不生息的黄金越“亏机会成本”，通常压金价。（这条是工程师补的说明）' },
  ];
  B.rates = [
    { id:'UST10', kind:'pp', nd:2, upBad:true, tv:'TVC:US10Y', hl: T => [{ y:T.r10_line, label:`参考线 ${T.r10_line}%`, include:true }],
      read:'估值贴现率主锚。约 4.75% 是战术谨慎 → 结构轮动的参考线。',
      rule: (s, T) => s.last > T.r10_red ? ['r', `高于红线 ${T.r10_red}%`] : s.last > T.r10_line ? ['y', `高于参考线 ${T.r10_line}%`] : ['g', `低于参考线 ${T.r10_line}%`] },
    { id:'UST2', kind:'pp', nd:2, upBad:true, tv:'TVC:US02Y', read:'更贴近政策预期；与 10Y 之差看曲线形态。' },
    { id:'UST30', kind:'pp', nd:2, upBad:true, tv:'TVC:US30Y', read:'对财政 / 期限溢价最敏感；长端飙升 = 财政担忧而非增长。' },
    { id:'T10Y2Y', kind:'pp', nd:2, tv:'FRED:T10Y2Y', hl: () => [{ y:0, label:'0（倒挂线）' }], read:'10 年减 2 年。小于 0 叫“倒挂”，历史上常出现在衰退之前。（工程师补充）',
      rule: s => s.last < 0 ? ['y', '倒挂中'] : ['g', '没有倒挂'] },
    { id:'UST3MO', kind:'pp', nd:2, tv:'TVC:US03MY', read:'基本跟着联储政策利率走。（工程师补充）' },
    { id:'BE10', kind:'pp', nd:2, upBad:true, tv:'FRED:T10YIE', read:'市场预期的未来 10 年平均通胀 = 名义利率 − 实际利率。（工程师补充）' },
    { id:'FEDU', kind:'pp', nd:2, tv:'FRED:DFEDTARU', range:'5Y', read:'联储政策利率区间的上限。（工程师补充）' },
    { id:'CORECPI_YOY', kind:'pp', nd:2, upBad:true, tv:'FRED:CPILFESL', range:'5Y', read:'扣掉食品和能源的通胀，同比。月度数据。（工程师补充）' },
  ];
  B.equity = [
    { id:'SPX', kind:'pct', nd:2, tv:'SP:SPX', read:'大盘基准；长期看盈利、靠成分股新陈代谢修复。' },
    { id:'NDX', kind:'pct', nd:2, tv:'NASDAQ:NDX', read:'你的定投核心。预期年化按 7–10% 设，别按近十年的 21%。' },
    { id:'RSP_SPY', kind:'pct', nd:4, tv:'AMEX:RSP/AMEX:SPY', read:'等权 ÷ 市值加权。下行 = 只靠巨头死撑；上行 = 雨露均沾。',
      rule: (s, T) => { const c = s.last/s.prev63 - 1; return c < -T.rsp_drop/100 ? ['y', `3 个月 ${U.pct(c)}，涨势变窄`] : ['g', `3 个月 ${U.pct(c)}`]; } },
    { id:'IWM', kind:'pct', nd:2, tv:'AMEX:IWM', read:'小盘相对强弱 = 风险偏好；它本身就是“那段信用”。' },
    { id:'IWM_SPY', kind:'pct', nd:4, tv:'AMEX:IWM/AMEX:SPY', read:'小盘 ÷ 大盘。高利率对小盘伤害最大。（工程师补充）',
      rule: (s, T) => (s.pos*100 < T.iwm_pos) ? ['y', `处在一年区间 ${(s.pos*100).toFixed(0)}% 位置，接近最弱`] : ['g', `处在一年区间 ${(s.pos*100).toFixed(0)}% 位置`] },
    { nodata:true, name:'S5TH · 标普成分股站上 200 日线的比例', reason:'没有找到能免费下载历史的公开来源（只在 TradingView 上有）。', tv:'INDEX:S5TH', read:'&gt;70% 过热易回调；极低 washout 后常见大底。' },
    { nodata:true, name:'S5FI · 站上 50 日线的比例', reason:'同上，只在 TradingView 上有。', tv:'INDEX:S5FI', read:'中期广度，比 200 日更快反应。' },
    { nodata:true, name:'MMTH · 全市场站上 200 日线的比例', reason:'同上，只在 TradingView 上有。', tv:'INDEX:MMTH', read:'NYSE 全口径广度，比标普口径更广。' },
    { id:'VIX', kind:'pt', nd:2, upBad:true, tv:'TVC:VIX', hl: T => [{ y:T.vix_panic, label:`恐慌 ${T.vix_panic}` }, { y:T.vix_calm, label:`自满 ${T.vix_calm}`, color:U.css('--y') }],
      read:'&gt;30 恐慌（信用平静时常是买点）；&lt;15 自满。危机里可冲 80+ 维持数月，别机械破 30 抄底。',
      rule: (s, T) => s.last > T.vix_panic ? ['r', `高于 ${T.vix_panic}，恐慌`] : s.last < T.vix_calm ? ['y', `低于 ${T.vix_calm}，自满`] : ['g', `在 ${T.vix_calm}–${T.vix_panic} 之间`] },
    { id:'VVIX', kind:'pt', nd:2, upBad:true, tv:'CBOE:VVIX', read:'VIX 的二阶波动；尾部对冲需求的温度。' },
  ];
  B.global = [
    { id:'USD_BROAD', kind:'pct', nd:2, tv:'FRED:DTWEXBGS', read:'美元暴涨 + 股跌 = 全球流动性收缩。（这里用美联储的广义美元指数，覆盖面比 DXY 更广）',
      rule: (s, T) => { const c = s.last/s.prev21 - 1; return c > T.diag_usd/100 ? ['y', `1 个月 ${U.pct(c)}，美元大涨`] : ['g', `1 个月 ${U.pct(c)}`]; } },
    { manual:'dxy' },
    { id:'WTI', kind:'pct', nd:2, tv:'TVC:USOIL', read:'油价推高通胀，通胀让利率降不下来。（工程师补充）' },
    { id:'WTI_YOY', kind:'pp', nd:1, trig:true, tv:'TVC:USOIL', hl: T => [{ y:T.oil_yoy, label:`${T.oil_yoy}%` }], read:'原油日度同比。你的先行条件 ③ 用的是月末值，要连续 2 个月末都超过，并且创 52 周新高。',
      rule: (s, T) => s.last > T.oil_yoy ? ['y', `日度同比超过 ${T.oil_yoy}%（先行条件③看的是连续 2 个月末，见上方）`] : ['g', `日度同比没超过 ${T.oil_yoy}%`] },
    { id:'BRENT', kind:'pct', nd:2, tv:'TVC:UKOIL', read:'全球油价基准。' },
    { id:'USDCNY', kind:'pct', nd:4, tv:'FX_IDC:USDCNY', read:'人民币汇率。你的 QDII 基金净值会受它影响：美元涨，人民币计的净值也跟着涨。（工程师补充）' },
    { id:'EURUSD', kind:'pct', nd:4, tv:'FX:EURUSD', read:'欧元兑美元。' },
    { id:'EEM', kind:'pct', nd:2, tv:'AMEX:EEM', read:'新兴市场。美元强、全球流动性紧时通常先受伤。（工程师补充）' },
    { id:'FXI', kind:'pct', nd:2, tv:'AMEX:FXI', read:'中国大盘股。' },
    { id:'VGK', kind:'pct', nd:2, tv:'AMEX:VGK', read:'欧洲股票。' },
  ];

  function fmtVal(x, cfg){ return cfg.kind === 'bp' ? U.fmtNum(x, 0) : U.fmtNum(x, cfg.nd ?? 2); }
  function fmtChg(a, b, cfg){
    if (a == null || b == null) return '—';
    if (cfg.kind === 'bp') return U.sgn(a-b, 0, 'bp');
    if (cfg.kind === 'pp') return U.sgn(a-b, 2, '');
    if (cfg.kind === 'pt') return U.sgn(a-b, 2, '');
    return U.pct(a/b - 1);
  }
  function chgCls(a, b, cfg){ if (a == null || b == null || cfg.upBad == null) return 'neutral'; const d = a - b; if (Math.abs(d) < 1e-9) return 'neutral'; return (d > 0) === cfg.upBad ? 'up' : 'down'; }
  const unitOf = (s, cfg) => cfg.kind === 'pp' ? '%' : s.unit === '比值' ? '' : s.unit;

  function indCard(cfg, T){
    const el = document.createElement('div'); el.className = 'card ind';
    if (cfg.nodata){
      el.innerHTML = `<div class="head"><div class="name">${cfg.name}</div></div><div class="nodata">暂无数据<br><span class="small">${cfg.reason}</span></div>
        <div class="read">${cfg.read}</div><div class="foot"><span></span><a href="${TV(cfg.tv)}" target="_blank" rel="noopener">打开 TradingView 实时图</a></div>`;
      return el;
    }
    if (cfg.manual){
      const m = MS.manual && MS.manual[cfg.manual];
      if (!m){ el.innerHTML = `<div class="nodata">暂无数据</div>`; return el; }
      el.innerHTML = `<div class="head"><div><div class="name">${m.name}</div><div class="asof">${m.date}</div></div><span class="tag warn">网页读数，非自动序列</span></div>
        <div class="val">${U.fmtNum(m.value, 2)}<span class="unit">${m.unit}</span></div>
        <div class="read">这个数是从网页上读到的单个读数，没有历史曲线，也不会自动更新。来源：<a href="${m.url}" target="_blank" rel="noopener">${m.source}</a>${cfg.manual==='gold_spot' && MS.manual.gold_52w_high ? `。52 周高点 ${U.fmtNum(MS.manual.gold_52w_high.value,2)}，现在比高点低 ${U.pct(m.value/MS.manual.gold_52w_high.value-1)}` : ''}</div>`;
      return el;
    }
    const s = U.ser(cfg.id);
    if (!s){ el.innerHTML = `<div class="name">${cfg.id}</div><div class="nodata">暂无数据：抓取失败，见“数据来源”页</div>`; return el; }
    const st = U.stats(s);
    const rule = cfg.rule ? cfg.rule(st, T) : null;
    const newest = MS.meta.newest;
    const stale = (U.ts(newest) - U.ts(st.date)) > 6*86400;
    const short = /3 年|10 年|2020 年/.test(s.note) ? s.note.match(/[^。]*(3 年|10 年|2020 年)[^。]*。/)?.[0] : '';
    el.innerHTML = `
      <div class="head"><div><div class="name">${s.name}</div><div class="asof">截至 ${st.date}${stale ? '（这条数据更新较慢）' : ''}</div></div>${rule ? `<span class="tag ${rule[0]}">${U.lightName(rule[0])}</span>` : '<span class="tag">参考</span>'}</div>
      <div class="val">${fmtVal(st.last, cfg)}<span class="unit">${cfg.kind==='bp' ? 'bp' : unitOf(s, cfg)}</span></div>
      <div class="chg"><span>1 周 <b class="${chgCls(st.last, st.prev5, cfg)}">${fmtChg(st.last, st.prev5, cfg)}</b></span><span>1 月 <b class="${chgCls(st.last, st.prev21, cfg)}">${fmtChg(st.last, st.prev21, cfg)}</b></span><span>3 月 <b class="${chgCls(st.last, st.prev63, cfg)}">${fmtChg(st.last, st.prev63, cfg)}</b></span></div>
      ${st.pos != null ? `<div class="rangebar" title="在过去一年最低到最高之间的位置"><i style="left:calc(${(st.pos*100).toFixed(1)}% - 1px)"></i></div>
      <div class="rangelbl"><span>一年最低 ${fmtVal(st.lo, cfg)}</span><span>位置 ${(st.pos*100).toFixed(0)}%</span><span>一年最高 ${fmtVal(st.hi, cfg)}</span></div>` : ''}
      ${rule ? `<div class="rule"><span class="light ${rule[0]}"></span><span>${rule[1]}${cfg.trig ? '<span class="muted small">（你的先行条件）</span>' : `<br><span class="muted small">门槛：${HEUR}</span>`}</span></div>` : ''}
      <div class="chartbox"></div>
      <div class="read">${cfg.read}${cfg.readNote ? `<br><span class="muted small">${cfg.readNote}</span>` : ''}</div>
      ${short ? `<div class="note">注意：${short}</div>` : ''}
      <div class="foot"><span class="muted">${s.source}</span><a href="${TV(cfg.tv)}" target="_blank" rel="noopener">打开 TradingView 实时图</a></div>`;
    const box = U.$('.chartbox', el);
    Charts.lazy(box, () => {
      const f = Charts.fromSeries(s);
      Charts.line(box, { x: f.x, ys: [f.y], labels: [s.name.replace(/（.*?）/, '')], range: cfg.range || '1Y', height: 160,
        hlines: cfg.hl ? cfg.hl(T) : [], fmt: v => v == null ? '—' : fmtVal(v, cfg), log: false });
    });
    return el;
  }

  function fgCard(T){
    const el = document.createElement('div'); el.className = 'card ind'; el.style.gridColumn = '1 / -1';
    const f = MS.fg; const s = U.ser('FG');
    if (!f || !s){ el.innerHTML = '<div class="name">CNN 恐惧贪婪指数</div><div class="nodata">暂无数据：CNN 接口抓取失败</div>'; return el; }
    const l = f.score < T.fg_fear || f.score > T.fg_greed ? 'y' : 'g';
    el.innerHTML = `<div class="head"><div><div class="name">CNN 恐惧贪婪指数</div><div class="asof">截至 ${f.date}</div></div><span class="tag ${l}">${RATING[f.rating]||f.rating}</span></div>
      <div class="grid g2" style="margin-top:6px">
        <div>
          <div class="val">${f.score.toFixed(0)}<span class="unit">/ 100</span></div>
          <div class="chg"><span>前一日 <b>${f.previous_close.toFixed(0)}</b></span><span>1 周前 <b>${f.previous_1_week.toFixed(0)}</b></span><span>1 月前 <b>${f.previous_1_month.toFixed(0)}</b></span><span>1 年前 <b>${f.previous_1_year.toFixed(0)}</b></span></div>
          <div class="chartbox"></div>
        </div>
        <div class="tablewrap"><table><thead><tr><th>7 个分项</th><th>分数</th><th>档位</th><th>原始值</th></tr></thead><tbody>
          ${f.subs.map(x => `<tr><td title="${U.esc(x.desc)}">${x.name}<br><span class="muted small">${x.desc}</span></td><td>${x.score.toFixed(0)}</td><td><span class="tag ${x.score<25||x.score>75?'y':''}">${RATING[x.rating]||x.rating}</span></td><td>${U.fmtNum(x.raw, x.raw>100?0:2)}</td></tr>`).join('')}
        </tbody></table></div>
      </div>
      <div class="read">黄金组合：VIX &gt; 30 且 F&amp;G &lt; 25 = 罕见优质加仓机会（前提信用平静）；长期 F&amp;G &gt; 75 且 VIX &lt; 15 = 极度 FOMO。<br>
      <span class="muted small">它由 7 个市场价格指标平均而来，不是问卷，更像“最近市场走得怎样”的温度计。历史数据从 2020 年 7 月开始。</span></div>
      <div class="foot"><span class="muted">CNN</span><a href="https://www.cnn.com/markets/fear-and-greed" target="_blank" rel="noopener">打开 CNN 原页面</a></div>`;
    const box = U.$('.chartbox', el); const fs = Charts.fromSeries(s);
    Charts.lazy(box, () => Charts.line(box, { x: fs.x, ys: [fs.y], labels: ['恐惧贪婪'], range: '1Y', height: 170, minY: 0, maxY: 100,
      hlines: [{ y:T.fg_fear, label:`极度恐惧 ${T.fg_fear}`, color:U.css('--g') }, { y:T.fg_greed, label:`极度贪婪 ${T.fg_greed}` }], fmt: v => v == null ? '—' : v.toFixed(0) }));
    return el;
  }

  function block(title, desc, cfgs, T, extra){
    const sec = document.createElement('section');
    sec.innerHTML = `<div class="block-title"><h2>${title}</h2><p class="muted small">${desc}</p></div>`;
    const g = document.createElement('div'); g.className = 'grid g3';
    cfgs.forEach(c => g.appendChild(indCard(c, T)));
    if (extra) g.appendChild(extra);
    sec.appendChild(g); return sec;
  }

  function render(app){
    const T = Settings.get(); const C = compute(T);
    const lights = [['信用（总开关）', C.R.credit], ['利率', C.R.rates], ['广度', C.R.breadth], ['波动和情绪', C.R.vol]];
    app.innerHTML = '';
    const top = document.createElement('div');
    top.innerHTML = `
      <h1>观察</h1>
      <p class="muted small">数据截至美股 ${MS.meta.newest} 收盘（数据生成于 ${MS.meta.generated} 台北时间）。先看信用这个总开关，再读其他。</p>
      <div class="card verdict ${C.overall}" id="verdict">
        <div class="muted small">市场阶段</div>
        <div class="stage"><span class="light ${C.overall}"></span>${C.stage}</div>
        <div>${C.one}</div>
        <div class="muted" style="margin-top:4px">${C.diagTxt}</div>
        <div class="lights">${lights.map(([n, l]) => `<span><span class="light ${l}"></span>${n}：${U.lightName(l)}</span>`).join('')}</div>
        <details><summary>为什么这样判断（每条规则和它的结果）</summary>
          <ul class="rules">${C.rules.map(r => `<li><span class="light ${r.l}"></span><span><b>${r.area}</b>　${r.text}${r.heur ? `　<span class="tag warn">${HEUR}</span>` : ''}</span></li>`).join('')}</ul>
          <p class="small"><span class="tag warn">${HEUR}</span> 这些门槛是工程师先定的经验值（包括 10 年美债 4.75% / 5.25%、VIX 30 / 15、HY 走阔速度、CCC 走阔速度、广度门槛），第 3 周起逐个用历史数据检验。HY 350bp 来自你的先行条件①。</p>
          <p class="small muted">判断顺序：信用红灯 → “信用断裂”；信用黄灯 → “信用松动”；信用绿灯时，若 VIX 高于恐慌线或恐惧贪婪低于极度恐惧线 → “信用平静中的恐慌”；否则利率高于参考线 → “利率压估值”；VIX 低于自满线且恐惧贪婪高于极度贪婪线 → “平静但自满”；都没有 → “平稳”。所有门槛都能在右上角“门槛设置”里改。</p>
        </details>
      </div>
      <div class="grid g2" style="margin-top:14px">
        <div class="card"><h3 style="margin-top:0">你的 4 个先行条件 <span class="tag ${C.nLive>=2?'r':C.nLive?'y':'g'}">${C.nLive} / 4 成立</span></h3>
          ${['① 信用：HY OAS > 350bp，且 IG OAS 63 个交易日走阔 > 20bp', '② 联储处在加息周期，且核心通胀在上升', '③ 原油连续 2 个月末同比 > 50%，且创 52 周新高', '④ AI 信用压力在扩散'].map((t, i) => { const x = C.trig[i]; const l = x.live == null ? 'n' : x.live ? 'r' : 'g';
            return `<div class="trig"><span class="light ${l}"></span><div><b>${t}</b>　${x.live == null ? '暂无数据' : x.live ? '成立' : '不成立'}${x.manual ? ' <span class="tag">手动</span>' : ''}<br><span class="small muted">${x.text}</span></div></div>`; }).join('')}
          <p class="small" style="margin-bottom:0">${C.nLive >= 2 ? '<b>已有 2 条或以上成立</b>：按你的规则，每一档加仓拆成两半，间隔 4 周买入。' : '成立的不到 2 条：按你的规则，触发某一档时一次买完这一档。'}</p>
        </div>
        <div class="card"><h3 style="margin-top:0">你的分档加仓：现在离触发还有多远</h3>
          ${C.nLive >= 2 ? `<div class="split-alert">先行条件已有 ${C.nLive} 条成立：<b>加仓每档拆成两半，间隔 4 周</b></div>` : `<div class="split-note">先行条件成立 ${C.nLive} 条（不到 2 条）：触发某一档时一次买完这一档。</div>`}
          ${['SPX', 'NDX'].map(k => { const t = C.tiers[k]; if (!t) return '<div class="nodata">暂无数据</div>'; const nm = k === 'SPX' ? '标普 500' : '纳指 100'; const maxT = Math.max(...t.tiers) + 5;
            return `<div><b>${nm}</b>　${U.fmtNum(t.last, 2)}（${t.date}），历史最高 ${U.fmtNum(t.high, 2)}（${t.highDate}），现在回撤 <b>${U.pct(t.dd)}</b>
              <div class="ddbar"><div class="fill" style="width:${Math.min(100, -t.dd*100/maxT*100)}%"></div>
                ${t.tiers.map((x, i) => `<div class="mark" style="left:${x/maxT*100}%"><span>−${x}%</span></div>`).join('')}
                <div class="now" style="left:${Math.min(100, -t.dd*100/maxT*100)}%"></div></div>
              <div class="small">${t.tiers.map((x, i) => `第 ${i+1} 档 −${x}%：${-t.dd*100 >= x ? '<b>已触发</b>' : `还差 ${(x + t.dd*100).toFixed(1)} 个百分点`}`).join('；')}</div></div>`; }).join('<hr style="border:none;border-top:1px dashed var(--line);margin:12px 0">')}
          <p class="small muted" style="margin-bottom:0">每一档用掉货币基金的 1/3（按目标配置 15% 货币基金算，每档约等于总仓位的 5%）。这里看的是美国指数本身；你买的场外 QDII 基金净值会晚一天，还受汇率影响。</p>
        </div>
      </div>`;
    app.appendChild(top);
    app.appendChild(block('信用 · 总开关', '看速度不看水平：利差快速走阔，才是把“杀估值”升级成“杀盈利”的那段水管。盯最弱的一层。', B.credit, T));
    app.appendChild(block('黄金', '黄金本身不生息，主要看实际利率、美元，以及它和收益率是不是同涨。', B.gold, T));
    app.appendChild(block('美债 · 利率和曲线', '利率打的是估值倍数，对长久期和小盘更狠。约 4.75% 的 10 年期是“战术谨慎 → 结构轮动”的参考线。', B.rates, T));
    const eq = block('美股大盘 · 广度 · 波动和情绪', '反直觉：广度太好（>70%）反而危险；washout 极低之后常跟着大底。VIX > 30 恐慌，< 15 自满。情绪要和信用合看，单独看会骗人。', B.equity, T, fgCard(T));
    app.appendChild(eq);
    app.appendChild(block('美元与全球', '美元大涨同时股票下跌，像全球流动性收缩。油价是这轮通胀的主要来源。', B.global, T));
    // 诊断表
    const d = C.diag; const diag = document.createElement('section');
    const rowsTxt = [['收益率↑ + 股↓', '纯杀估值', '可逆：等利率企稳，逆向信号可信'], ['美元↑↑ + 股↓', '全球流动性收缩', '偏谨慎：等美元冲高回落'], ['黄金↑ + 收益率↑（股债双杀）', '通胀 / 信用担忧', '最接近危险：尤其盯紧信用']];
    diag.innerHTML = `<h2>跨资产 · 找病因</h2><p class="muted small">下跌时先诊断病因落在“杀估值”还是“杀盈利”哪一边。下面用过去 1 个月的变化自动对照：10 年美债 ${U.sgn(d.dy,2,' 个百分点')}，标普 ${U.pct(d.ds)}，美元广义指数 ${U.pct(d.du)}，黄金 GLD ${U.pct(d.dg)}。</p>
      <div class="card tablewrap"><table><thead><tr><th>现象</th><th>病因</th><th>落点 / 应对</th><th>现在对得上吗</th></tr></thead><tbody>
      ${rowsTxt.map((r, i) => `<tr><td>${r[0]}</td><td style="text-align:left">${r[1]}</td><td style="text-align:left">${r[2]}</td><td>${d.rows[i] ? '<span class="tag r">对得上</span>' : '<span class="tag">没有</span>'}</td></tr>`).join('')}
      </tbody></table></div>
      <div class="card" style="margin-top:14px"><h3 style="margin-top:0">我的核心原则</h3>
      <p>利率打的是<b>估值倍数</b>（短期、对长久期更狠）；<b>盈利复利</b>决定长期回报；利差极低是“<b>赔率很差</b>”的状态信号，不是“何时爆”的择时信号；股、金、债同涨是“<b>财政主导 + 货币贬值</b>”的统一签名，不是“美国还不起债”；而<b>信用市场是判断一切下跌性质的总开关</b>。</p>
      <p class="muted" style="margin-bottom:0">这套东西用来调整仓位倾斜、判断“该不该出手”，不是用来掐秒表的。能精准择时的东西早被量化套利到失效。</p></div>`;
    app.appendChild(diag);
  }
  return { render, compute };
})();
