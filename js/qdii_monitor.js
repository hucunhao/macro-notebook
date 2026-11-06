// QDII 监视。T-1（qdiilimit）和 EST（palmmicro）分列，不合成区间。不是投资建议。
// 必须挂在 window 上。const 顶层绑定不会变成 window 属性，pages3 用 window.QdiiMon 判断时会当成没加载。
window.QdiiMon = (() => {
  const fp = (x, nd=2) => x == null || !isFinite(+x) ? '—' : (x > 0 ? '+' : '') + (+x).toFixed(nd) + '%';
  const num = x => x == null || !isFinite(+x) ? '—' : (+x).toFixed(3);
  const SUB = { unknown: '未知', suspended: '暂停', limited: '限额', normal: '正常' };
  // 和 qdii_monitor.format_drag 同一套四舍五入：百分数保留 1 位。
  function drag(buy, nav, years, exitP){
    const b = buy / 100, r = nav / 100, e = exitP / 100, n = +years;
    if (!(n > 0) || [b, r, e].some(x => !isFinite(x))) return null;
    const navMult = Math.pow(1 + r, n);
    const mult = navMult * (1 + e) / (1 + b);
    const vs = (1 + e) / (1 + b) - 1;
    const one = x => Math.round(x * 1000) / 10;
    return { cum: one(mult - 1), ann: one(Math.pow(mult, 1 / n) - 1), vs: one(vs),
      multiple: Math.round(mult * 1000) / 1000, navMultiple: Math.round(navMult * 1000) / 1000, shortfall: one(-vs) };
  }
  function themeLine(block, label){
    if (!block) return '';
    const spread = block.n >= 2 ? `极差 ${fp(block.spread, 2)}（最高 ${fp(block.max, 2)}，最低 ${fp(block.min, 2)}）` : '不足 2 只，不算极差';
    const stale = block.stale_n ? ` ${block.stale_n} 只沿用上次，不把这格当成刚更新。` : '';
    return `<div class="chip"><div class="k">${label}</div><div class="v">${fp(block.median, 2)}</div><div class="hint">${block.n} 只有数，${block.missing} 只没有。${spread}${stale}</div></div>`;
  }
  function html(){
    const D = window.QDM;
    if (!D || !D.funds || !D.funds.length){
      const err = D && D.update_error ? U.esc(D.update_error) : '还没有成功抓取过';
      const when = D && D.last_success ? `上次成功 ${U.esc(D.last_success)}` : '没有上次成功的时间';
      return `<section class="panel"><div class="ph"><span class="t">QDII 溢价监视</span><span class="s">不是投资建议</span></div><div class="pb"><p>表是空的，不是零溢价。${when}。${err}</p></div></section>`;
    }
    const err = D.update_error ? `<p class="hint">${U.esc(D.update_error)}</p>` : '';
    const headWhen = D.partial
      ? `整表上次全部成功 ${U.esc(D.last_success || '—')}，这次有代码沿用旧数，成功时间不往前拨`
      : `九只目标都是这次的数字 · ${U.esc(D.last_success || '—')}`;
    const src = D.sources || {};
    const days = D.history_days || {};
    const gap = ['t1', 'official', 'ref', 'rt'].map(k => `${{t1:'T-1', official:'官方EST', ref:'参考EST', rt:'实时EST'}[k]} ${days[k] || 0} 个不同日期`).join('，');
    const chips = ['nasdaq', 'spx'].map(k => {
      const th = (D.themes || {})[k]; if (!th) return '';
      return themeLine(th.t1, `${th.name} · T-1 中位数`) + themeLine(th.rt, `${th.name} · 实时EST溢价中位数`) + themeLine(th.official, `${th.name} · 官方EST溢价中位数`);
    }).join('');
    const rows = D.funds.map(f => `<tr>
      <td><b>${U.esc(f.code)}</b>${f.stale ? `<div class="hint">沿用上次 ${U.esc(f.last_success || D.last_success || '时间未记录')}</div>` : (f.last_success ? `<div class="hint">本次 ${U.esc(f.last_success)}</div>` : '')}</td>
      <td style="text-align:left">${U.esc(f.name || '')}<div class="hint">${U.esc(f.theme_name || '')}</div></td>
      <td>${fp(f.t1_premium)}</td><td>${U.esc(f.t1_nav_date || '—')}</td>
      <td>${num(f.official_est)}</td><td>${fp(f.official_premium)}</td><td>${U.esc(f.est_date || '—')}</td>
      <td>${num(f.ref_est)}</td><td>${fp(f.ref_premium)}</td>
      <td>${f.rt_est == null ? '暂缺' : num(f.rt_est)}</td><td>${f.rt_premium == null ? '暂缺' : fp(f.rt_premium)}</td>
      <td>${num(f.price)}</td><td>${U.esc([f.price_date, f.price_time].filter(Boolean).join(' ') || '—')}</td>
      <td>${U.esc(SUB[f.subscription] || '未知')}<div class="hint">${U.esc(f.subscription_detail || '')}</div></td>
    </tr>`).join('');
    return `<section class="panel" id="qdii-mon"><div class="ph"><span class="t">QDII 溢价监视</span><span class="s">不是投资建议 · ${headWhen}（台北时间）</span></div><div class="pb">
      ${err}
      <p class="small" style="margin-top:0">T-1 和 EST 各看各的，不写成「从高到低」的一个区间。${U.esc((src.t1 || {}).definition || '')}</p>
      <p class="small">${U.esc((src.est || {}).definition || '')}</p>
      <p class="hint">来源：<a href="${U.esc((src.t1 || {}).url || '#')}" target="_blank" rel="noopener">qdiilimit.com</a>（${U.esc((src.t1 || {}).page_title || '')}，页面上写 ${U.esc((src.t1 || {}).generated_on_page || '—')}）。<a href="${U.esc((src.est || {}).url || '#')}" target="_blank" rel="noopener">palmmicro</a>。qdiilens.com 这页没有拿来填数字。</p>
      <div class="chips">${chips}</div>
      <div class="tablewrap"><table class="tbl-compact"><thead><tr>
        <th>代码</th><th style="text-align:left">名称</th>
        <th>T-1 溢价</th><th>T-1 净值日</th>
        <th>官方EST</th><th>官方溢价</th><th>EST日期</th>
        <th>参考EST</th><th>参考溢价</th>
        <th>实时EST</th><th>实时溢价</th>
        <th>价格快照</th><th>快照时间</th>
        <th>申购</th>
      </tr></thead><tbody>${rows}</tbody></table></div>
      <p class="hint">${U.esc(D.history_gap || '')} 目前：${gap}。满 30 个不同日期之前，不把这几列说成已经有 30–60 个交易日的历史。</p>
      <div class="selrow"><label>历史序列 <select id="qdm-field"><option value="t1">T-1（qdiilimit）</option><option value="official">官方EST溢价</option><option value="ref">参考EST溢价</option><option value="rt">实时EST溢价（快照）</option><option value="close">收盘价/公布净值（另一套定义）</option></select></label>
        <label>范围 <select id="qdm-who"></select></label></div>
      <div id="qdm-hist"></div>
      <div class="setrow" style="margin-top:10px"><span>溢价拖累（算术，不是建议）</span></div>
      <div class="selrow">
        <label>买入溢价 % <input id="qdm-buy" type="number" step="0.1" value="15" style="width:5em"></label>
        <label>净值年化 % <input id="qdm-nav" type="number" step="0.1" value="7" style="width:5em"></label>
        <label>年数 <input id="qdm-yrs" type="number" step="1" value="10" style="width:4em"></label>
        <label>卖出溢价 % <input id="qdm-exit" type="number" step="0.1" value="0" style="width:5em"></label>
      </div>
      <p id="qdm-drag" class="small"></p>
      <p class="hint">期末财富倍数 = (1+净值年化)^年数 × (1+卖出溢价) / (1+买入溢价)。相对按净值买入的期末财富缺口 = 1 − (1+卖出溢价)/(1+买入溢价)。净值年化填的是这只基金净值的年化假设，不是指数的年化收益。15%、7%、10 年、0% 的例子：累计 +71.1%，年化 5.5%，期末倍数约 1.711，相对按净值买入的期末财富缺口 13.0%。</p>
    </div></section>`;
  }
  function histPoints(field, who){
    const D = window.QDM || {};
    if (field === 'close' && window.QD && QD.funds){
      const want = who === 'nasdaq' || who === 'spx'
        ? D.funds.filter(f => f.theme === who).map(f => f.code)
        : [who];
      const funds = QD.funds.filter(f => want.includes(f.code));
      const days = [...new Set(funds.flatMap(f => f.d))].sort();
      return days.map(d => {
        const xs = funds.map(f => { const i = f.d.indexOf(d); return i >= 0 ? f.prem[i] : null; }).filter(x => x != null);
        return { asof: d, v: xs.length ? U.median(xs) : null, n: xs.length };
      }).filter(p => p.v != null);
    }
    const obs = (D.history || []).filter(o => o.field === field && (who === 'nasdaq' || who === 'spx' ? o.theme === who : o.code === who));
    const by = new Map();
    obs.forEach(o => {
      const k = o.asof || o.fetched;
      const g = by.get(k) || []; g.push(o.value); by.set(k, g);
    });
    return [...by.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0]))).map(([asof, xs]) => ({ asof, v: U.median(xs), n: xs.length }));
  }
  function drawHist(){
    const field = U.$('#qdm-field').value, who = U.$('#qdm-who').value;
    const pts = histPoints(field, who);
    const el = U.$('#qdm-hist');
    const need = field === 'close' ? 30 : 30;
    if (pts.length < 2){
      el.innerHTML = `<p class="hint">${field === 'close' ? '这套收盘/净值序列' : '这一列'}目前 ${pts.length} 个点，画不成线。${field === 'close' ? '' : '不足 30 个交易日，缺口留着，不补假历史。'}</p>`;
      return;
    }
    const note = pts.length < need && field !== 'close' ? `<p class="hint">只有 ${pts.length} 个观察日，不到 30 个交易日。</p>` : '';
    el.innerHTML = note + '<div id="qdm-c"></div>';
    const plot = pts.filter(p => /^\d{4}-\d{2}-\d{2}/.test(String(p.asof)));
    if (plot.length < 2){ el.innerHTML = `<p class="hint">有 ${pts.length} 条观察，但能放上日期轴的不足 2 个。</p>`; return; }
    Charts.line(U.$('#qdm-c'), { x: plot.map(p => U.ts(String(p.asof).slice(0, 10))), ys: [plot.map(p => p.v)], labels: [field], range: 'ALL', height: 240, logToggle: false,
      axisFmt: v => v.toFixed(0) + '%', fmt: v => v == null ? '—' : fp(v) });
  }
  function drawDrag(){
    const g = id => +U.$('#' + id).value;
    const r = drag(g('qdm-buy'), g('qdm-nav'), g('qdm-yrs'), g('qdm-exit'));
    const el = U.$('#qdm-drag');
    if (!r){ el.textContent = '年数要大于 0。'; return; }
    const sign = x => (x > 0 ? '+' : '') + x.toFixed(1) + '%';
    el.innerHTML = `累计收益 <b>${sign(r.cum)}</b>，年化 <b>${sign(r.ann)}</b>。期末财富倍数 <b>${r.multiple.toFixed(3)}</b>（按净值买的期末倍数 ${r.navMultiple.toFixed(3)}）。相对按净值买入的期末财富缺口 <b>${r.shortfall.toFixed(1)}%</b>。`;
  }
  function bind(root){
    if (!root.querySelector('#qdii-mon')) return;
    const D = window.QDM || { funds: [] };
    const who = U.$('#qdm-who');
    who.innerHTML = `<option value="nasdaq">纳指主题中位数</option><option value="spx">标普主题中位数</option>` +
      (D.funds || []).map(f => `<option value="${U.esc(f.code)}">${U.esc(f.code)} ${U.esc(f.name || '')}</option>`).join('');
    U.$('#qdm-field').onchange = drawHist;
    who.onchange = drawHist;
    ['qdm-buy', 'qdm-nav', 'qdm-yrs', 'qdm-exit'].forEach(id => { const n = U.$('#' + id); n.oninput = drawDrag; });
    drawHist(); drawDrag();
  }
  return { html, bind, drag };
})();
