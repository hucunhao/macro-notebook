// QDII 监视。上半部只突出两套溢价。不是投资建议。
// 必须挂在 window 上。const 顶层绑定不会变成 window 属性。
window.QdiiMon = (() => {
  const L = window.QdiiLogic;
  const fp = x => L.pct(x);
  const num = x => x == null || !isFinite(+x) ? '—' : (+x).toFixed(3);
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
  function shared(funds, pick){
    const vals = [...new Set(funds.map(pick).filter(Boolean))];
    if (!vals.length) return '时间未记录';
    if (vals.length === 1) return vals[0];
    return '各只不完全相同（' + vals.slice(0, 3).join('、') + (vals.length > 3 ? '…' : '') + '）';
  }
  function countLine(block){
    if (!block) return '0 只有数';
    const stale = block.stale_n ? `，其中 ${block.stale_n} 只沿用上次，不当成刚更新` : '';
    return `${block.n} 只有数，${block.missing} 只没有${stale}`;
  }
  function hero(key, th, funds){
    const read = L.estRead(th);
    const t1funds = funds.filter(f => L.isNum(f.t1_premium));
    const estField = read.key === 'rt' ? 'rt_premium' : read.key === 'official' ? 'official_premium' : null;
    const estFunds = estField ? funds.filter(f => L.isNum(f[estField])) : [];
    const t1Time = '净值日 ' + shared(t1funds, f => f.t1_nav_date);
    const snap = shared(estFunds, f => [f.price_date, f.price_time].filter(Boolean).join(' '));
    const estDate = shared(estFunds, f => f.est_date);
    const estWhen = read.key ? `快照 ${snap}，EST日期 ${estDate}` : '没有可用的 EST 列';
    const estNum = read.block ? fp(read.block.median) : '未知';
    const estClass = read.key === 'rt' ? 'qdm-est qdm-rt' : 'qdm-est';
    return `<article class="qdm-hero" id="qdm-${key}">
      <h2>${U.esc(th.name || key)}</h2>
      <div class="qdm-metric qdm-t1"><div class="qdm-lab">T-1 · qdiilimit</div><div class="qdm-num">${fp(th.t1 && th.t1.median)}</div><div class="qdm-meta">${countLine(th.t1)}。${U.esc(t1Time)}</div></div>
      <div class="qdm-metric ${estClass}"><div class="qdm-lab">${U.esc(read.label)} · palmmicro${read.fallback ? '（实时列没有数，改看这一列）' : ''}</div><div class="qdm-num">${estNum}</div><div class="qdm-meta">${read.block ? countLine(read.block) : '实时和官方都没有数'}。${U.esc(estWhen)}</div></div>
    </article>`;
  }
  function fundBlock(f){
    const read = L.estRead({
      rt: L.isNum(f.rt_premium) ? { n: 1, median: f.rt_premium, stale_n: f.stale ? 1 : 0, missing: 0 } : { n: 0, median: null },
      official: L.isNum(f.official_premium) ? { n: 1, median: f.official_premium, stale_n: f.stale ? 1 : 0, missing: 0 } : { n: 0, median: null },
    });
    const when = f.stale ? `沿用上次 ${U.esc(f.last_success || '时间未记录')}，不当成刚更新` : (f.last_success ? `本次 ${U.esc(f.last_success)}` : '');
    const spot = f.code === '159659' ? ' qdm-spot' : '';
    return `<article class="qdm-fund${spot}" data-code="${U.esc(f.code)}">
      <div class="qdm-fund-h"><b>${U.esc(f.code)}</b> ${U.esc(f.name || '')} <span class="qdm-lab">${U.esc(f.theme_name || '')}</span>${f.code === '159659' ? ' <span class="qdm-lab">只把这只代码框出来，不是持仓</span>' : ''}</div>
      <div class="qdm-pair">
        <div class="qdm-metric qdm-t1"><div class="qdm-lab">T-1</div><div class="qdm-num">${fp(f.t1_premium)}</div><div class="qdm-meta">净值日 ${U.esc(f.t1_nav_date || '—')}。${when}</div></div>
        <div class="qdm-metric ${read.key === 'rt' ? 'qdm-est qdm-rt' : 'qdm-est'}"><div class="qdm-lab">${U.esc(read.label)}</div><div class="qdm-num">${read.block ? fp(read.block.median) : '未知'}</div><div class="qdm-meta">快照 ${U.esc([f.price_date, f.price_time].filter(Boolean).join(' ') || '—')}</div></div>
      </div>
      <details class="qdm-more"><summary>官方EST、参考EST 和申购</summary>
        <p class="qdm-est qdm-sub">官方EST ${num(f.official_est)}，官方溢价 ${fp(f.official_premium)}，EST日期 ${U.esc(f.est_date || '—')}</p>
        <p class="qdm-est qdm-sub">参考EST ${num(f.ref_est)}，参考溢价 ${fp(f.ref_premium)}</p>
        <p class="qdm-meta">申购 ${U.esc(({ unknown: '未知', suspended: '暂停', limited: '限额', normal: '正常' })[f.subscription] || '未知')}。${U.esc(f.subscription_detail || '')}</p>
      </details>
    </article>`;
  }
  function html(){
    const D = window.QDM;
    if (!D || !D.funds || !D.funds.length){
      const err = D && D.update_error ? U.esc(D.update_error) : '还没有成功抓取过';
      const when = D && D.last_success ? `上次成功 ${U.esc(D.last_success)}` : '没有上次成功的时间';
      return `<section class="panel" id="qdii-mon"><div class="ph"><span class="t">QDII 溢价监视</span><span class="s">不是投资建议</span></div><div class="pb"><p>表是空的，不是零溢价。${when}。${err}</p></div></section>`;
    }
    const themes = D.themes || {};
    const lead = L.conclusion(themes);
    const lines = L.historyLines(D.history_days);
    const warn = lines.length ? `<div class="qdm-warn" role="status">${lines.map(s => `<p>${U.esc(s)}</p>`).join('')}<p>不满 30 日，这里不画历史线。</p></div>` : '';
    const err = D.update_error ? `<p class="qdm-meta">${U.esc(D.update_error)}</p>` : '';
    const headWhen = D.partial
      ? `整表上次全部成功 ${U.esc(D.last_success || '—')}，有代码沿用旧数，成功时间不往前拨`
      : `九只目标都是这次的数字 · ${U.esc(D.last_success || '—')}`;
    const funds = D.funds || [];
    return `<section class="panel" id="qdii-mon"><div class="ph"><span class="t">QDII 溢价监视</span><span class="s">不是投资建议 · ${headWhen}（台北时间）</span></div><div class="pb">
      ${err}
      <p class="qdm-lead" id="qdm-lead">${U.esc(lead)}</p>
      <div class="qdm-heroes">${hero('nasdaq', themes.nasdaq || { name: '纳指', t1: { n: 0, missing: 0 } }, funds.filter(f => f.theme === 'nasdaq'))}${hero('spx', themes.spx || { name: '标普', t1: { n: 0, missing: 0 } }, funds.filter(f => f.theme === 'spx'))}</div>
      <p class="qdm-legend"><span class="qdm-swatch t1"></span><span class="qdm-lab">T-1 · qdiilimit · 蓝色</span> <span class="qdm-swatch est"></span><span class="qdm-lab">EST · palmmicro · 橙色</span>。官方、参考、实时同属 EST，实时这一列最大。</p>
      ${warn}
      <p class="qdm-src">T-1 来自 qdiilimit 场内表，原列名是 T-1日溢价率。EST 来自 palmmicro 页面上的官方、参考、实时三列，按原列读出。本站不重算「前净值 ×（1+指数涨跌）×（1+汇率涨跌）」。列名「实时」是对方表格的列名，不是本站在盘中刷新；上面写的是抓取时那一页的快照时间。</p>
      <div class="qdm-calc"><div class="qdm-lab">溢价拖累（算术，不是建议）</div>
        <div class="selrow">
          <label>买入溢价 % <input id="qdm-buy" type="number" step="0.1" value="15" style="width:5em"></label>
          <label>净值年化 % <input id="qdm-nav" type="number" step="0.1" value="7" style="width:5em"></label>
          <label>年数 <input id="qdm-yrs" type="number" step="1" value="10" style="width:4em"></label>
          <label>卖出溢价 % <input id="qdm-exit" type="number" step="0.1" value="0" style="width:5em"></label>
        </div>
        <p id="qdm-drag"></p>
        <p class="qdm-meta">期末财富倍数 = (1+净值年化)^年数 × (1+卖出溢价) / (1+买入溢价)。相对按净值买入的期末财富缺口 = 1 − (1+卖出溢价)/(1+买入溢价)。净值年化填的是这只基金净值的年化假设，不是指数的年化收益。15%、7%、10 年、0%：累计 +71.1%，年化 5.5%，期末倍数约 1.711，缺口 13.0%。</p>
      </div>
      <details id="qdm-funds"><summary>九只基金的分项（默认收起）</summary>${funds.map(fundBlock).join('')}</details>
    </div></section>`;
  }
  function drawDrag(){
    const g = id => +U.$('#' + id).value;
    const r = drag(g('qdm-buy'), g('qdm-nav'), g('qdm-yrs'), g('qdm-exit'));
    const el = U.$('#qdm-drag');
    if (!el) return;
    if (!r){ el.textContent = '年数要大于 0。'; return; }
    const sign = x => (x > 0 ? '+' : '') + x.toFixed(1) + '%';
    el.innerHTML = `累计收益 <b>${sign(r.cum)}</b>，年化 <b>${sign(r.ann)}</b>。期末财富倍数 <b>${r.multiple.toFixed(3)}</b>（按净值买的期末倍数 ${r.navMultiple.toFixed(3)}）。相对按净值买入的期末财富缺口 <b>${r.shortfall.toFixed(1)}%</b>。`;
  }
  function bind(root){
    if (!root.querySelector('#qdii-mon')) return;
    ['qdm-buy', 'qdm-nav', 'qdm-yrs', 'qdm-exit'].forEach(id => { const n = U.$('#' + id); if (n) n.oninput = drawDrag; });
    drawDrag();
  }
  return { html, bind, drag, estRead: L.estRead, conclusion: L.conclusion, historyLines: L.historyLines };
})();
