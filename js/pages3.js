// 新页面：全球股市、商品和汇率、经济日历、财报日历、季节性、QDII 溢价
const Pages3 = (() => {
  const { panel, fmtP, heat, perf } = Markets;
  const loadingHTML = '<div class="nodata">正在加载数据…</div>';
  const fail = (app, e, what) => { app.innerHTML = `<div class="nodata">数据暂不可得：${U.esc(what)}（${U.esc(e && e.message || e)}）。可能是这项数据还没生成，见“来源”页。</div>`; };
  const head = (t, s, tip) => `<div class="pg-h"><h1>${t}</h1><span class="s">${s}</span>${tip ? U.info(tip) : ''}</div>`;
  const backIdx = (d, target) => { let lo = 0, hi = d.length - 1; if (!d.length || d[0] > target) return -1; while (lo < hi){ const m = (lo + hi + 1) >> 1; if (d[m] <= target) lo = m; else hi = m - 1; } return lo; };
  const shift = (iso, days) => U.dstr(U.ts(iso) - days*86400);
  const PAL = ['#ff8a1f', '#4ea4ff', '#3cc46e', '#c792ea', '#f0b93a', '#ff5a4c', '#2ec4b6', '#e07aa8', '#a3a86b', '#8a9bb0', '#b5835a', '#e7e5e0', '#7fd1ff', '#ffb3a7', '#9be37f', '#d4a5ff', '#ffd27f', '#7f9cff'];
  const RG = [['1M','1月',31],['3M','3月',91],['6M','6月',182],['YTD','今年','ytd'],['1Y','1年',365],['3Y','3年',1096],['5Y','5年',1826],['ALL','全部',null]];

  // 表现表：list = [{id,name,group,d,v,note?,unit?}]；点一行回调 onSel(id)
  function perfTable(el, list, opts){
    const P = list.map(s => ({ s, p: perf(s), hi1: (() => { const i = backIdx(s.d, shift(U.last(s.d), 365)); const w = s.v.slice(Math.max(0, i)); return Math.max(...w); })() }));
    let sortK = opts.sort || null;
    const keys = [['d1','1 日',2],['w1','1 周',4],['m1','1 月',8],['ytd','今年',25],['y1','1 年',30]];
    function draw(){
      const rows = sortK ? [...P].sort((a, b) => (b.p[sortK] ?? -9) - (a.p[sortK] ?? -9)) : P;
      let lastG = null;
      el.innerHTML = `<table class="tbl-compact heat"><thead><tr><th>${opts.groupLabel || '地区'}</th><th>名称</th>${opts.note ? '<th style="text-align:left">是什么</th>' : ''}<th>最新</th><th>日期</th>${keys.map(([k, n]) => `<th style="cursor:pointer" data-s="${k}" title="点击按这一列排序">${n}${sortK === k ? ' ▼' : ''}</th>`).join('')}<th>距 1 年高点</th></tr></thead><tbody>
        ${rows.map(({ s, p, hi1 }) => { const g = !sortK && s.group !== lastG ? s.group : (sortK ? s.group : ''); lastG = s.group;
          const stale = (U.ts(opts.newest || p.date) - U.ts(p.date)) > 5*86400;
          return `<tr class="click ${opts.sel && opts.sel() === s.id ? 'sel' : ''}" data-id="${s.id}"><td class="muted">${g}</td><td style="text-align:left"><b>${s.name}</b>${s.stale ? U.staleTag() : ''}</td>${opts.note ? `<td style="text-align:left;color:var(--ink3);font-family:var(--font)">${s.note || ''}</td>` : ''}
            <td>${U.fmtNum(p.last, s.nd ?? 2)}${s.unit ? `<span class="muted small"> ${s.unit}</span>` : ''}</td><td class="${stale ? 'muted' : ''}">${p.date.slice(5)}</td>
            ${keys.map(([k, , sc]) => `<td class="hc" style="${heat(p[k], sc/100)}">${fmtP(p[k])}</td>`).join('')}<td class="${p.last/hi1 - 1 < -0.1 ? 'neg' : ''}">${fmtP(p.last/hi1 - 1)}</td></tr>`; }).join('')}
        </tbody></table>${sortK ? '<div class="hint"><a href="javascript:void 0" data-unsort>恢复按地区排列</a></div>' : ''}`;
      U.$$('th[data-s]', el).forEach(th => th.onclick = () => { sortK = th.dataset.s; draw(); });
      const us = U.$('[data-unsort]', el); if (us) us.onclick = () => { sortK = null; draw(); };
      U.$$('tr[data-id]', el).forEach(tr => tr.onclick = () => { opts.onSel(tr.dataset.id); draw(); });
    }
    draw(); return { redraw: draw };
  }
  // 归一化走势（起点 = 0%）
  function normChart(el, list, selId, state){
    const base = list.reduce((a, s) => s.d.length > a.length ? s.d : a, []);
    const allD = [...new Set(list.flatMap(s => s.d))].sort();
    const ld = U.last(allD), d = RG.find(r => r[0] === state.rng)[2];
    const start = d === 'ytd' ? `${+ld.slice(0, 4) - 1}-12-31` : d ? shift(ld, d) : allD[0];
    const dates = allD.filter(x => x >= start);
    const ys = list.map(s => { const m = new Map(s.d.map((x, i) => [x, s.v[i]])); let b0 = null, lastv = null; return dates.map(x => { const v = m.get(x); if (v == null) return null; if (b0 == null) b0 = v; return (v / b0 - 1) * 100; }); });
    el.innerHTML = `<div class="selrow"><span class="ranges" style="margin:0">${RG.map(([k, n]) => `<button data-r="${k}" class="${k === state.rng ? 'on' : ''}">${n}</button>`).join('')}</span><span class="hint">点表格里的一行，加粗那条线。不同市场休市日不同，曲线会有小断点。</span></div><div class="nc"></div>`;
    U.$$('button[data-r]', el).forEach(b => b.onclick = () => { state.rng = b.dataset.r; normChart(el, list, selId, state); });
    Charts.line(U.$('.nc', el), { x: dates.map(U.ts), ys, labels: list.map(s => s.name), ranges: false, height: state.h || 300, colors: PAL,
      widths: list.map(s => selId ? (s.id === selId ? 3 : .9) : 1.4), hlines: [{ y:0, color:U.css('--ink3'), dash:false }], axisFmt: v => v.toFixed(0) + '%', fmt: v => v == null ? '—' : U.sgn(v, 1, '%'), logToggle: false });
  }

  // ---------- 全球股市 ----------
  async function world(app){
    app.innerHTML = loadingHTML;
    try { await U.need('data/world.js'); } catch(e){ return fail(app, e, '全球股指'); }
    const L = WD.indices; let sel = 'SPX'; const st = { rng: 'YTD', h: 300 };
    const newest = L.map(s => U.last(s.d)).sort().pop();
    app.innerHTML = head('全球股市', `${L.length} 个主要指数，日线收盘（本地货币，不含分红） · ${U.fresh(WD.indices_asof || newest, { session: WD.session, partial: L.filter(s => s.stale).length })}`, `数据来自东方财富行情接口，各市场收盘时间不同：亚洲先收，美国最后。表里“日期”是这个指数最近一个收盘日；如果抓取时某个市场还在交易，最后一天会是盘中价。<br><br>“距 1 年高点”：现价比过去一年最高收盘低多少，超过 10% 标红。颜色越深，涨跌越大。`) +
      `<div class="mk-grid">${panel('', '主要指数表现', '点表头排序，点一行在下图加粗', '<div id="w-t" class="tablewrap"></div>', '', 'full')}${panel('', '走势对比', '起点 = 0%', '<div id="w-c"></div>', '', 'full')}</div>`;
    const t = perfTable(U.$('#w-t'), L, { newest, sel: () => sel, onSel: id => { sel = id; normChart(U.$('#w-c'), L, sel, st); } });
    normChart(U.$('#w-c'), L, sel, st);
  }

  // ---------- 商品和汇率 ----------
  async function cmdty(app){
    app.innerHTML = loadingHTML;
    try { await U.need('data/world.js'); } catch(e){ return fail(app, e, '商品和汇率'); }
    const NOTE = { GOLD:'避险、抗通胀；实际利率越低越涨', SILVER:'一半贵金属一半工业品', COPPER:'工业需求的温度计', CL:'美国原油；推高通胀', BRENT:'国际原油基准', DXY:'美元对 6 种主要货币；涨 = 美元强', USDCNH:'香港等地交易的人民币；涨 = 人民币弱', USDCNYC:'央行每天公布的基准价', EURUSD:'1 欧元换多少美元', USD_BROAD:'美元对 26 种货币（美联储）' };
    const fromMS = (id, name, group, unit, nd) => { const s = U.ser(id); return s ? { id, name, group, unit, nd, d: s.d, v: s.v } : null; };
    const L = [...WD.cmdty.filter(s => s.group === '商品'), fromMS('BRENT', '布伦特原油（现货）', '商品', '美元/桶'),
      ...WD.cmdty.filter(s => s.group === '汇率').map(s => ({ ...s, nd: s.id === 'DXY' ? 2 : 4 })), fromMS('EURUSD', '欧元兑美元', '汇率', '美元', 4), fromMS('USD_BROAD', '美元广义指数', '汇率', '点', 2)]
      .filter(Boolean).map(s => ({ ...s, note: NOTE[s.id] || '', nd: s.nd ?? 2 }));
    let sel = 'GOLD';
    const newest = L.map(s => U.last(s.d)).sort().pop();
    app.innerHTML = head('商品和汇率', `黄金、白银、铜、原油、美元、人民币 · ${U.fresh(WD.cmdty_asof || newest, { session: WD.session, partial: WD.cmdty.filter(s => s.stale).length })}`, `期货用“连续合约”（东方财富，自动换到下一个主力月份，换月时会有小跳空）；布伦特原油、欧元、美元广义指数来自 FRED（通常晚几天）。<br><br>人民币汇率对你买的 QDII 基金有直接影响：美元兑人民币涨，用人民币计的美股基金净值也跟着涨。`) +
      `<div class="mk-grid">${panel('', '最新价格和涨跌', '点一行看下面的走势图', '<div id="c-t" class="tablewrap"></div>', '', 'full')}${panel('', '走势', '', '<div class="selrow" id="c-n"></div><div id="c-c"></div>', '', 'full')}</div>`;
    const draw = () => { const s = L.find(x => x.id === sel); U.$('#c-n').innerHTML = `<b>${s.name}</b><span class="hint">${s.note}${s.unit ? '；单位：' + s.unit : ''}</span>`;
      Charts.line(U.$('#c-c'), { x: s.d.map(U.ts), ys: [s.v], labels: [s.name], range: '3Y', height: 300, fmt: v => v == null ? '—' : U.fmtNum(v, s.nd) }); };
    perfTable(U.$('#c-t'), L, { note: true, groupLabel: '类别', newest, sel: () => sel, onSel: id => { sel = id; draw(); } });
    draw();
  }

  // ---------- 经济日历 ----------
  const WD_ZH = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const twNow = () => { const d = new Date(Date.now() + 8*3600e3); return d.toISOString().slice(0, 16).replace('T', ' '); };
  async function cal(app){
    app.innerHTML = loadingHTML;
    try { await U.need('data/calendar.js'); } catch(e){ return fail(app, e, '经济日历'); }
    const E = CAL.events, now = twNow(), today = now.slice(0, 10);
    const st = U.store.get('ms_cal', { imp: false, all: false });
    const nextOf = re => E.find(e => re.test(e.name) && (e.tw || e.date) >= now);
    const days = t => Math.ceil((U.ts(t.slice(0, 10)) - U.ts(today)) / 86400);
    const chip = (k, e) => e ? `<div class="chip"><div class="k">${k}</div><div class="v">${days(e.tw || e.date) === 0 ? '今天' : days(e.tw || e.date) + ' 天后'}</div><div class="hint">${(e.tw || e.date).slice(5)}（台北）</div></div>` : `<div class="chip"><div class="k">${k}</div><div class="v">—</div><div class="hint">窗口内没有</div></div>`;
    const IMP = { 3: '●●●', 2: '●●', 1: '●' };
    function draw(){
      const end = U.dstr(U.ts(today) + (st.all ? 60 : 21)*86400);
      const ev = E.filter(e => (!st.imp || e.imp >= 2) && (e.tw || e.date).slice(0, 10) <= end);
      const by = {}; ev.forEach(e => { const k = (e.tw || e.date).slice(0, 10); (by[k] = by[k] || []).push(e); });
      const wk = d => { const t = new Date(U.ts(d)*1000); return WD_ZH[t.getUTCDay()]; };
      const thisWeekEnd = U.dstr(U.ts(today) + (7 - (new Date(U.ts(today)*1000).getUTCDay() || 7))*86400);
      U.$('#cal-l').innerHTML = Object.keys(by).sort().map(d => `<div class="cal-day ${d < today ? 'past' : ''} ${d === today ? 'today' : ''}"><div class="d">${d.slice(5)} ${wk(d)}<small>${d === today ? '今天' : d <= thisWeekEnd && d > today ? '本周' : d < today ? '已发布' : ''}</small></div><div>
        ${by[d].map(e => `<div class="cal-ev i${e.imp}"><span class="tm">${e.tw ? e.tw.slice(11) : '—'}</span><span class="imp" title="重要程度">${IMP[e.imp]}</span><span><span class="nm">${e.name}</span>　<span class="ds">${e.desc}</span></span></div>`).join('')}</div></div>`).join('') || '<div class="nodata">这段时间没有事件</div>';
    }
    app.innerHTML = head('经济日历', '美国重要经济数据和美联储议息会议，时间都是台北时间', `<b>怎么用</b>：重要数据公布前后市场波动通常变大。●●● 最重要（CPI 通胀、非农就业、PCE 通胀、美联储决议）。<br><br>${CAL.note}<br>美国夏令时（3 月到 11 月初）期间，数据一般在台北时间晚上 20:30 公布，冬令时 21:30。<br>只列发布日期，不含市场预期值（那是付费数据）。`) +
      `<div class="chips">${chip('下次美联储决议', nextOf(/FOMC/))}${chip('下次 CPI 通胀', nextOf(/CPI/))}${chip('下次非农就业', nextOf(/非农/))}${chip('下次 PCE 通胀', nextOf(/PCE/))}</div>
      ${panel('', '日程', `${U.fresh(CAL.asof || CAL.generated.slice(0, 10), { session: CAL.session, partial: CAL.stale_n })} · 生成于 ${CAL.generated}（台北时间）`, `<div class="selrow" style="margin-bottom:4px"><label><input type="checkbox" id="cal-imp" ${st.imp ? 'checked' : ''}> 只看重要的（●● 以上）</label><label><input type="checkbox" id="cal-all" ${st.all ? 'checked' : ''}> 显示未来 6 周（默认 3 周）</label><a href="#/ern">看财报日历 →</a></div><div id="cal-l"></div>`)}`;
    U.$('#cal-imp').onchange = e => { st.imp = e.target.checked; U.store.set('ms_cal', st); draw(); };
    U.$('#cal-all').onchange = e => { st.all = e.target.checked; U.store.set('ms_cal', st); draw(); };
    draw();
  }

  // ---------- 财报日历 ----------
  async function ern(app){
    app.innerHTML = loadingHTML;
    try { await U.need('data/earnings.js'); } catch(e){ return fail(app, e, '财报日历'); }
    const R = ERN.rows; const st = U.store.get('ms_ern', { big: true });
    const fcap = x => x >= 1e12 ? (x/1e12).toFixed(2) + ' 万亿' : (x/1e9).toFixed(0) + ' 十亿';
    const twWhen = (d, w) => { if (w === '盘前') return `${d.slice(5)} 晚上`; if (w === '盘后') return `${U.dstr(U.ts(d) + 86400).slice(5)} 清晨`; return '未定'; };
    function draw(){
      const rows = R.filter(r => !st.big || r.mcap >= 1e11);
      const by = {}; rows.forEach(r => (by[r.date] = by[r.date] || []).push(r));
      U.$('#e-l').innerHTML = Object.keys(by).sort().map(d => `<tr class="base"><td colspan="6">${d}（美国，${WD_ZH[new Date(U.ts(d)*1000).getUTCDay()]}）　${by[d].length} 家</td></tr>` +
        by[d].map(r => `<tr class="click" data-t="${r.t}"><td><b>${r.t}</b></td><td style="text-align:left;max-width:260px;overflow:hidden;text-overflow:ellipsis">${U.esc(r.n)}</td><td style="text-align:left">${U.esc(r.sec || '')}</td><td>${fcap(r.mcap)}</td><td>${r.when}</td><td>${twWhen(r.date, r.when)}</td></tr>`).join('')).join('') || '<tr><td colspan="6">没有</td></tr>';
      U.$$('tr[data-t]', app).forEach(tr => tr.onclick = () => { location.hash = '#/rv/' + tr.dataset.t; });
    }
    const top = [...R].sort((a, b) => b.mcap - a.mcap).slice(0, 6);
    app.innerHTML = head('财报日历', `未来 2 周标普 500 大公司的财报日期`, `${ERN.note}<br><br>不含分析师预期（那是付费数据）。点一行去“同业比较”看这家公司和同行的估值。`) +
      `<div class="chips">${top.map(r => `<div class="chip"><div class="k">${U.esc(r.n)}</div><div class="v" style="font-size:18px">${r.t}</div><div class="hint">${r.date.slice(5)} ${r.when} · 台北 ${twWhen(r.date, r.when)}</div></div>`).join('')}</div>` +
      panel('', '日程', `${U.fresh(ERN.asof || ERN.generated.slice(0, 10), { session: ERN.session, partial: ERN.stale_n })} · 生成于 ${ERN.generated}（台北时间）`, `<div class="selrow" style="margin-bottom:4px"><label><input type="checkbox" id="e-big" ${st.big ? 'checked' : ''}> 只看市值 1000 亿美元以上</label></div>
        <div class="tablewrap"><table class="tbl-compact"><thead><tr><th>代码</th><th style="text-align:left">公司</th><th style="text-align:left">行业</th><th>市值（美元）</th><th>美国时间</th><th>台北时间（约）</th></tr></thead><tbody id="e-l"></tbody></table></div>`);
    U.$('#e-big').onchange = e => { st.big = e.target.checked; U.store.set('ms_ern', st); draw(); };
    draw();
  }

  // ---------- 季节性 ----------
  function monthly(s){
    const m = {}; s.d.forEach((d, i) => { m[d.slice(0, 7)] = s.v[i]; });
    const ks = Object.keys(m).sort(), cur = U.last(s.d).slice(0, 7), out = [];
    for (let i = 1; i < ks.length; i++){ out.push({ ym: ks[i], r: m[ks[i]] / m[ks[i-1]] - 1, done: ks[i] < cur }); }
    return out;
  }
  function seas(app){
    const st = U.store.get('ms_seas', { id: 'SPX', yrs: 0 });
    app.innerHTML = head('季节性', '每个月历史上平均涨多少、上涨的概率多大', `<b>怎么算</b>：每个月最后一个收盘价 ÷ 上个月最后一个收盘价 − 1（价格指数，不含分红）。柱子 = 这个月的平均涨跌，柱子上方的数字 = 上涨的年份占比。橙色框是当前月份；小圆点是今年每个月的实际涨跌。<br><br><b>注意</b>：每个月只有几十个样本，大部分月份之间的差别在统计上分不开，属于“历史上碰巧这样”。不要只因为月份去买卖。`) +
      panel('', '月度表现', '', `<div class="selrow"><select id="s-id"><option value="SPX">标普 500（1975 年起）</option><option value="NDX">纳指 100（1986 年起）</option></select>
        <span class="ranges" style="margin:0" id="s-y">${[[0, '全部'], [30, '近 30 年'], [20, '近 20 年'], [10, '近 10 年']].map(([y, n]) => `<button data-y="${y}" class="${st.yrs === y ? 'on' : ''}">${n}</button>`).join('')}</span></div>
        <canvas class="bars" id="s-c"></canvas><div class="tablewrap" id="s-t" style="margin-top:6px"></div>`);
    U.$('#s-id').value = st.id;
    U.$('#s-id').onchange = e => { st.id = e.target.value; U.store.set('ms_seas', st); draw(); };
    U.$$('#s-y button').forEach(b => b.onclick = () => { st.yrs = +b.dataset.y; U.store.set('ms_seas', st); U.$$('#s-y button').forEach(x => x.classList.toggle('on', x === b)); draw(); });
    const cv = U.$('#s-c');
    function draw(){
      if (!cv.isConnected) return;
      const s = U.ser(st.id); if (!s) return;
      const M = monthly(s), lastY = +U.last(s.d).slice(0, 4), curM = +U.last(s.d).slice(5, 7);
      const done = M.filter(x => x.done && (!st.yrs || +x.ym.slice(0, 4) > lastY - st.yrs - (x.ym.slice(5) >= String(curM).padStart(2, '0') ? 1 : 0)));
      const S = Array.from({ length: 12 }, (_, k) => { const r = done.filter(x => +x.ym.slice(5) === k + 1).map(x => x.r); return { n: r.length, mean: U.mean(r), med: U.median(r), win: r.length ? r.filter(x => x > 0).length / r.length : null, best: r.length ? Math.max(...r) : null, worst: r.length ? Math.min(...r) : null, sd: r.length > 1 ? Math.sqrt(r.reduce((a, x) => a + (x - U.mean(r))**2, 0) / (r.length - 1)) : null }; });
      const thisY = M.filter(x => +x.ym.slice(0, 4) === lastY);
      const W = cv.parentElement.clientWidth, H = 300, dpr = devicePixelRatio || 1; cv.width = W*dpr; cv.height = H*dpr; cv.style.height = H + 'px';
      const g = cv.getContext('2d'); g.scale(dpr, dpr); g.clearRect(0, 0, W, H);
      const mx = Math.max(0.02, ...S.map(x => Math.abs(x.mean || 0))) * 1.9; const clamp = v => Math.max(-mx*.97, Math.min(mx*.97, v));
      const L = 46, R = W - 10, T0 = 26, B = H - 30, Y = v => T0 + (B - T0) / 2 - v / mx * (B - T0) / 2, bw = (R - L) / 12;
      g.font = `11px ${U.css('--mono')}`; g.fillStyle = U.css('--ink3'); g.strokeStyle = U.css('--grid'); g.textAlign = 'right';
      [-mx*.8, -mx*.4, 0, mx*.4, mx*.8].forEach(v => { const y = Math.round(Y(v)) + .5; g.beginPath(); g.moveTo(L, y); g.lineTo(R, y); g.stroke(); g.fillText((v*100).toFixed(1) + '%', L - 4, y + 4); });
      g.strokeStyle = U.css('--ink3'); g.beginPath(); g.moveTo(L, Math.round(Y(0)) + .5); g.lineTo(R, Math.round(Y(0)) + .5); g.stroke();
      S.forEach((x, k) => { const cx = L + bw*k + bw/2, v = x.mean || 0;
        if (k + 1 === curM){ g.strokeStyle = U.css('--accent'); g.lineWidth = 1.5; g.strokeRect(L + bw*k + 2, T0 - 22, bw - 4, B - T0 + 46); g.lineWidth = 1; }
        g.fillStyle = v >= 0 ? U.css('--g') : U.css('--r'); g.globalAlpha = .85; g.fillRect(cx - bw*.3, Math.min(Y(0), Y(v)), bw*.6, Math.abs(Y(v) - Y(0))); g.globalAlpha = 1;
        g.fillStyle = U.css('--ink'); g.textAlign = 'center'; g.font = `600 12px ${U.css('--font')}`; g.fillText(`${k+1}月`, cx, B + 18);
        g.font = `11px ${U.css('--mono')}`; g.fillStyle = U.css('--ink2'); g.fillText(x.win == null ? '' : `${Math.round(x.win*100)}%涨`, cx, T0 - 8);
        g.fillStyle = v >= 0 ? U.css('--g') : U.css('--r'); g.fillText(U.sgn(v*100, 1, '%'), cx, v >= 0 ? Y(v) - 4 : Y(v) + 13); });
      thisY.forEach(x => { const k = +x.ym.slice(5) - 1, cx = L + bw*k + bw/2 + bw*.22; g.fillStyle = U.css('--chart2'); g.beginPath(); g.arc(cx, Y(clamp(x.r)), 4, 0, 7); g.fill(); if (Math.abs(x.r) > mx*.97){ g.font = `10px ${U.css('--mono')}`; g.textAlign = 'left'; g.fillText(U.sgn(x.r*100, 0, '%'), cx + 6, Y(clamp(x.r)) + 4); } });
      const fp = x => x == null ? '—' : U.sgn(x*100, 1, '%');
      U.$('#s-t').innerHTML = `<table class="tbl-compact"><thead><tr><th>月份</th>${S.map((_, k) => `<th>${k+1}月</th>`).join('')}</tr></thead><tbody>
        <tr><td>平均</td>${S.map(x => `<td class="${x.mean > 0 ? 'pos' : 'neg'}">${fp(x.mean)}</td>`).join('')}</tr>
        <tr><td>中位数</td>${S.map(x => `<td>${fp(x.med)}</td>`).join('')}</tr>
        <tr><td>上涨概率</td>${S.map(x => `<td>${x.win == null ? '—' : Math.round(x.win*100) + '%'}</td>`).join('')}</tr>
        <tr><td>最好</td>${S.map(x => `<td class="pos">${fp(x.best)}</td>`).join('')}</tr><tr><td>最差</td>${S.map(x => `<td class="neg">${fp(x.worst)}</td>`).join('')}</tr>
        <tr><td>年数</td>${S.map(x => `<td>${x.n}</td>`).join('')}</tr>
        <tr><td>${lastY} 年</td>${S.map((_, k) => { const t = thisY.find(x => +x.ym.slice(5) === k + 1); return `<td style="color:var(--chart2)">${t ? fp(t.r) + (t.done ? '' : '*') : ''}</td>`; }).join('')}</tr></tbody></table>
        <div class="hint"><span style="color:var(--chart2)">●</span> 蓝点 = 今年每个月的实际涨跌（超出图框的画在边上并标出数值）。* 本月还没结束。统计期：${done.length ? done[0].ym + ' 到 ' + U.last(done).ym : '—'}。平均值容易被个别大涨大跌带偏，可以对照中位数看。</div>`;
    }
    new ResizeObserver(draw).observe(cv.parentElement); draw();
  }

  // ---------- QDII 溢价 ----------
  const lvl = p => p == null ? '' : p > 10 ? 'rr' : p > 5 ? 'r' : p > 3 ? 'y' : 'g';
  async function qdii(app){
    app.innerHTML = loadingHTML;
    try { await U.need('data/qdii.js'); } catch(e){ return fail(app, e, 'QDII 溢价'); }
    const F = QD.funds; if (!F.length) return fail(app, '没有基金数据', 'QDII 溢价');
    const st = U.store.get('ms_qdii', { sel: ['513100', '159941', '513500', '161130'], rng: '1Y', sort: 'prem' });
    const avg = (a, n) => { const x = a.slice(-n); return x.length ? x.reduce((s, v) => s + v, 0) / x.length : null; };
    const R = F.map(f => ({ f, prem: U.last(f.prem), date: U.last(f.d), a20: avg(f.prem, 20), hi60: Math.max(...f.prem.slice(-60)), lo60: Math.min(...f.prem.slice(-60)) }));
    const grp = g => R.filter(r => r.f.idx === g).map(r => r.prem);
    const navDate = R.map(r => r.date).sort().pop();
    const fp = (x, nd=2) => x == null ? '—' : `${x > 0 ? '+' : ''}${x.toFixed(nd)}%`;
    const PTIP = `<b>溢价是什么</b>：场内价格比基金实际值（单位净值）贵多少。溢价 10% = 你花 110 元买到 100 元的美股；以后溢价回落，这 10 元就亏掉了，和美股涨跌无关。<br><br><b>怎么算</b>：同一个交易日的收盘价 ÷ 同一天的单位净值 − 1。<br><br><b>为什么总比今天晚</b>：QDII 买的是美股，美股收盘比 A 股晚，基金公司通常在 T+1（有时 T+2）晚上才公布 T 日净值。所以这里的“最新溢价”是净值已经公布的最近一天（现在是 ${navDate}），今天的收盘价要等净值出来才能算。盘中实时溢价要看行情软件的 IOPV（参考净值）。<br><br>颜色：3% 以下绿，3–5% 黄，5–10% 红，10% 以上深红。<span class="warnt">这几条线是常用经验值，不是检验过的规则。</span><br>LOF 用 A 类人民币份额的净值；ETF 和 LOF 的收盘价不复权。`;
    app.innerHTML = head('QDII 溢价', `国内上市的纳指 100、标普 500 场内基金，每天的收盘溢价 · ${U.fresh(QD.asof || navDate, { session: QD.session, partial: F.filter(f => f.stale).length })}`, PTIP) +
      `<div class="chips"><div class="chip"><div class="k">纳指 100 · 中位溢价（${grp('纳指100').length} 只）</div><div class="v ${lvl(U.median(grp('纳指100'))).replace('rr', 'r')}">${fp(U.median(grp('纳指100')), 1)}</div><div class="hint">最低 ${fp(Math.min(...grp('纳指100')), 1)} · 最高 ${fp(Math.max(...grp('纳指100')), 1)}</div></div>
        <div class="chip"><div class="k">标普 500 · 中位溢价（${grp('标普500').length} 只）</div><div class="v ${lvl(U.median(grp('标普500'))).replace('rr', 'r')}">${fp(U.median(grp('标普500')), 1)}</div><div class="hint">最低 ${fp(Math.min(...grp('标普500')), 1)} · 最高 ${fp(Math.max(...grp('标普500')), 1)}</div></div>
        <div class="chip"><div class="k">净值日期</div><div class="v" style="font-size:18px">${navDate}</div><div class="hint">溢价按这一天的收盘价和净值算 ${U.info(PTIP)}</div></div>
        <div class="chip" style="flex:1;min-width:260px"><div class="k">一句话</div><div style="font-size:14px;margin-top:4px">溢价越高，买场内基金越吃亏。高溢价时可以考虑同一指数的<b>场外联接基金</b>（按净值申购，没有溢价，但可能限额）。</div></div></div>
      <div id="qdii-exec-slot" style="margin:8px 0"></div>
      <div class="mk-grid">${panel('', '溢价一览', '点表头排序；勾选的基金画在下面左图', '<div id="q-t" class="tablewrap"></div>', '', 'full')}
        ${panel('', '溢价走势', '每天收盘溢价（%）', '<div class="fundsel" id="q-s"></div><div id="q-c"></div>')}
        ${panel('', '两组的中位溢价', '纳指 100 组 vs 标普 500 组（至少 3 只有数据的日子）', '<div id="q-g"></div>')}</div>`;
    const cols = [['prem', '最新溢价'], ['a20', '20 日平均'], ['hi60', '60 日最高'], ['lo60', '60 日最低'], ['amt', '成交额（亿元）'], ['scale', '规模（亿元）']];
    const val = (r, k) => k === 'amt' ? r.f.last_amt : k === 'scale' ? (r.f.scale ? r.f.scale.v : null) : r[k];
    function table(){
      const rows = [...R].sort((a, b) => (val(b, st.sort) ?? -99) - (val(a, st.sort) ?? -99));
      U.$('#q-t').innerHTML = `<table class="tbl-compact"><thead><tr><th>勾选</th><th>代码</th><th style="text-align:left">名称</th><th>跟踪</th>${cols.map(([k, n]) => `<th data-s="${k}" style="cursor:pointer">${n}${st.sort === k ? ' ▼' : ''}</th>`).join('')}<th>收盘价</th><th>净值</th></tr></thead><tbody>
        ${rows.map(r => `<tr class="${st.sel.includes(r.f.code) ? 'sel' : ''}"><td><input type="checkbox" data-c="${r.f.code}" ${st.sel.includes(r.f.code) ? 'checked' : ''} aria-label="画出 ${r.f.code}"></td><td><b>${r.f.code}</b>${r.f.stale ? U.staleTag() : ''}</td><td style="text-align:left;max-width:170px;overflow:hidden;text-overflow:ellipsis" title="${U.esc(r.f.name)}">${U.esc(r.f.name.replace(/[(（]QDII.*$/, ''))}</td><td>${r.f.idx}${r.f.type === 'LOF' ? ' LOF' : ''}</td>
          <td><span class="prem ${lvl(r.prem)}">${fp(r.prem)}</span></td><td><span class="prem ${lvl(r.a20)}">${fp(r.a20)}</span></td><td>${fp(r.hi60, 1)}</td><td>${fp(r.lo60, 1)}</td><td>${r.f.last_amt == null ? '—' : r.f.last_amt.toFixed(2)}</td><td>${r.f.scale ? r.f.scale.v.toFixed(0) : '—'}</td>
          <td>${U.last(r.f.close).toFixed(3)}</td><td>${U.last(r.f.nav).toFixed(4)}</td></tr>`).join('')}</tbody></table>
        <div class="hint">溢价、收盘价、净值都是各自溢价日的（最新能配对的一天是 ${navDate}）。成交额是最近一个有成交额的交易日（${F[0].last_amt_date || F[0].last_close_date}）；备用收盘没有成交额时不填 0。规模是季报数据（${F[0].scale ? F[0].scale.date : '—'}）。成交额太小的基金买卖价差大。执行层（溢价和指数档位）在上面，没有溢价时不暗示该加仓。</div>`;
      U.$$('#q-t th[data-s]').forEach(th => th.onclick = () => { st.sort = th.dataset.s; U.store.set('ms_qdii', st); table(); });
      U.$$('#q-t input[data-c]').forEach(c => c.onchange = () => { const k = c.dataset.c; st.sel = c.checked ? [...st.sel, k] : st.sel.filter(x => x !== k); U.store.set('ms_qdii', st); table(); chart(); });
    }
    function chart(){
      const sel = F.filter(f => st.sel.includes(f.code));
      U.$('#q-s').innerHTML = sel.length ? sel.map((f, i) => `<span style="color:${PAL[i % PAL.length]}">■ ${f.code} ${U.esc(f.name.slice(0, 10))}</span>`).join('') : '<span class="hint">在左表勾选基金</span>';
      if (!sel.length){ U.$('#q-c').innerHTML = ''; return; }
      const dates = [...new Set(sel.flatMap(f => f.d))].sort();
      const ys = sel.map(f => { const m = new Map(f.d.map((d, i) => [d, f.prem[i]])); return dates.map(d => m.get(d) ?? null); });
      Charts.line(U.$('#q-c'), { x: dates.map(U.ts), ys, labels: sel.map(f => f.code), colors: PAL, range: st.rng, height: 300, logToggle: false,
        hlines: [{ y:3, color:U.css('--y'), label:'3%' }, { y:5, label:'5%' }, { y:10, label:'10%' }, { y:0, color:U.css('--ink3'), dash:false }], axisFmt: v => v.toFixed(0) + '%', fmt: v => v == null ? '—' : fp(v) });
    }
    function groups(){
      const all = [...new Set(F.flatMap(f => f.d))].sort();
      const maps = F.map(f => ({ g: f.idx, m: new Map(f.d.map((d, i) => [d, f.prem[i]])) }));
      const med = g => all.map(d => { const v = maps.filter(x => x.g === g).map(x => x.m.get(d)).filter(v => v != null); return v.length >= 3 ? U.median(v) : null; });
      Charts.line(U.$('#q-g'), { x: all.map(U.ts), ys: [med('纳指100'), med('标普500')], labels: ['纳指 100 组', '标普 500 组'], range: '3Y', height: 300, logToggle: false,
        hlines: [{ y:3, color:U.css('--y') }, { y:5 }, { y:10 }, { y:0, color:U.css('--ink3'), dash:false }], axisFmt: v => v.toFixed(0) + '%', fmt: v => v == null ? '—' : fp(v) });
    }
    table(); chart(); groups();
    const slot = U.$('#qdii-exec-slot');
    if (slot) QdiiExec.mount(slot, Observe.compute(Settings.get()).tiers);
  }
  return { world, cmdty, cal, ern, seas, qdii };
})();
