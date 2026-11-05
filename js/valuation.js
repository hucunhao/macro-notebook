// 估值监视器。数字来自 data/valuation.js（update_data.py → valuation_data.py）。
// 缺数字就写「数据暂缺」，不留空、也不用别的数顶上。整页都是公开近似。
window.Valuation = (() => {
  const GAP = '数据暂缺 <span class="badge a">公开近似</span>';
  const APPROX = '<span class="badge a">公开近似</span>';
  const DEF_X = 60;

  function V(){ return window.VAL || null; }
  function finite(x){ return x != null && isFinite(x); }
  function peTxt(x, nd=2){
    if (!finite(x)) return GAP;
    const cls = x < 0 ? 'neg' : '';
    return `<b class="${cls}">${x.toFixed(nd)}</b>`;
  }
  function pctTxt(x){
    if (!finite(x)) return GAP;
    return `<b class="${x < 0 ? 'neg' : ''}">${U.pct(x)}</b>`;
  }
  function thr(){
    const saved = U.store.get('ms_val_xfpe', null);
    const n = typeof saved === 'number' ? saved : parseFloat(saved);
    return n > 0 ? n : ((V() && V().config && V().config.extreme_forward_pe) || DEF_X);
  }
  function growthRead(g, pe, fpe){
    if (!finite(g)) return '数据暂缺。滚动和前瞻缺一个，公式（滚动市盈率 ÷ 前瞻市盈率 − 1）就算不了。加仓仍看领先触发、回撤分档、CAPE 和 TIPS。';
    const n = U.pct(g);
    const tail = '只用来看预期能不能撑住现在的倍数，不是买卖开关。加仓仍看领先触发、回撤分档、CAPE 和 TIPS。';
    if ((finite(pe) && pe < 0) || (finite(fpe) && fpe < 0))
      return `公式结果是 ${n}。但有一边市盈率是负的，负号相除不等于“盈利在增长”，这里只把公式摆出来。${tail}`;
    if (g > 0.02) return `公式结果是 ${n}。在价格和权重大致不动时，前瞻盈利要比刚过去的十二个月高一截，现在的倍数才说得圆。${tail}`;
    if (g < -0.02) return `公式结果是 ${n}。前瞻市盈率高于滚动市盈率，按这个口径是在定价盈利下滑。${tail}`;
    return `公式结果是 ${n}。两个倍数差不多，这套口径里几乎没有给下一年盈利增长留出位置。${tail}`;
  }
  function lossLine(blk){
    if (!blk) return '';
    const n = blk.n_loss || 0;
    if (!n) return '这次没有公司的滚动市盈率为负。规则仍然是：一旦为负就按权重留在加总里，不剔除。';
    const ex = (blk.loss_examples || []).slice(0, 5).map(r => `${r.t} ${r.pe.toFixed(1)}`).join('、');
    const w = finite(blk.w_loss) ? `，权重合计 ${U.pct(blk.w_loss, 1)}` : '';
    return `亏损公司按权重留在加总里（这次 ${n} 家${w}${ex ? '，例如 ' + ex : ''}）。没有因为亏损把它们丢掉，也没有把很大的市盈率改成 60。`;
  }
  function covLine(blk){
    if (!blk) return '';
    const a = finite(blk.coverage_pe) ? `滚动覆盖权重 ${U.pct(blk.coverage_pe, 0)}` : '滚动覆盖权重 数据暂缺';
    const b = finite(blk.coverage_fpe) ? `前瞻覆盖权重 ${U.pct(blk.coverage_fpe, 0)}` : '前瞻覆盖权重 数据暂缺';
    return `${a}，${b}。覆盖不到七成就不公布加总。`;
  }

  function metric(k, html, sub){
    return `<div class="val-metric"><div class="k">${k}</div><div class="v">${html}</div>${sub ? `<div class="s">${sub}</div>` : ''}</div>`;
  }
  function indexPanel(id, name, proxy){
    const blk = V() && V().indices && V().indices[id];
    const body = !blk
      ? `<div class="nodata">${GAP}</div>`
      : `<div class="val-metrics">
          ${metric('滚动市盈率', peTxt(blk.pe), '刚过去约四个季度的稀释每股收益')}
          ${metric('前瞻市盈率', peTxt(blk.fpe), '公开一致预期，大约未来四个季度')}
          ${metric('滚动盈利收益率', pctTxt(blk.ey), '1 ÷ 滚动市盈率')}
          ${metric('前瞻盈利收益率', pctTxt(blk.fey), '1 ÷ 前瞻市盈率')}
        </div>
        <p class="hint">${covLine(blk)} ${lossLine(blk)}</p>`;
    const asof = V() && V().weight_asof && V().weight_asof[id];
    return Markets.panel('', `${name}`, `权重用 ${proxy} 持仓${asof ? '，' + asof : ''} ${APPROX}`, body);
  }

  function growthPanel(){
    const one = (id, name) => {
      const b = V() && V().indices && V().indices[id];
      const g = b && b.implied_g, pe = b && b.pe, fpe = b && b.fpe;
      return `<div class="val-growth"><div class="k">${name}</div><div class="v">${pctTxt(g)}</div><p>${growthRead(g, pe, fpe)}</p></div>`;
    };
    return Markets.panel('', '隐含盈利增长', '价格和权重大致不动时，（滚动市盈率 ÷ 前瞻市盈率）− 1', `<div class="val-growths">${one('NDX', '纳指 100')}${one('SPX', '标普 500')}</div>`, APPROX, 'full');
  }

  function histPanel(id, name){
    const h = V() && V().indices && V().indices[id] && V().indices[id].history;
    if (!h || !h.d || h.d.length < 2){
      return Markets.panel('', `${name} 滚动市盈率的 10 年分位`, APPROX, `<div class="nodata">${GAP}</div><p class="hint">公开序列没抓到，就不画图、也不估一个分位。</p>`);
    }
    const pct = finite(h.pct10) ? `<b>${h.pct10.toFixed(1)}</b>` : GAP;
    const est = h.latest_est ? '最新一点被来源标成估计。' : '';
    const freq = h.freq === 'Y' ? '点很少，是年末（外加最近一个月末），不是每个月。' : '按月。';
    return Markets.panel('', `${name} 滚动市盈率 · 近 10 年分位 ${pct}`, `${h.latest_date} 这条序列自己的最新值 ${finite(h.latest) ? h.latest.toFixed(2) : '数据暂缺'} ${APPROX}`,
      `<div id="val-h-${id}"></div><p class="hint">分位 ${pct}：近窗里有多少个点比最新一点更低（比的是 ${h.n} 个更早的点）。${freq}${est}这是另一套公开序列，不是上面成分股加总的那个数，也不能拿来当新的加仓触发。来源：<a href="${U.esc(h.url)}" target="_blank" rel="noopener">${U.esc(h.source)}</a></p>`);
  }

  function itPanel(){
    const it = V() && V().it;
    if (!it || it.weight == null){
      return Markets.panel('', '信息技术（GICS）', APPROX, `<div class="nodata">${GAP}</div><p class="hint">行业对不上维基百科的 GICS，权重和行业市盈率就空着。</p>`, '', 'full');
    }
    const un = finite(it.unmapped) && it.unmapped > 0.005 ? `有 ${U.pct(it.unmapped, 1)} 的权重在维基名单里对不上行业，没算进信息技术。` : '';
    return Markets.panel('', '标普 500 · 信息技术（GICS IT）', `占 SPY 持仓 ${APPROX}`, `<div class="val-metrics">
        ${metric('行业权重', pctTxt(it.weight), it.n ? `${it.n} 家，GICS 信息技术` : '')}
        ${metric('行业滚动市盈率', peTxt(it.pe), '同一套加总，只取这个行业')}
        ${metric('行业前瞻市盈率', peTxt(it.fpe), '同一套一致预期')}
        ${metric('行业隐含增长', pctTxt(it.implied_g), '滚动 ÷ 前瞻 − 1')}
      </div><p class="hint">${un}纳指 100 官方用的不是这套 GICS 权重，所以这里只算标普。覆盖：滚动 ${finite(it.coverage_pe) ? U.pct(it.coverage_pe, 0) : '数据暂缺'}，前瞻 ${finite(it.coverage_fpe) ? U.pct(it.coverage_fpe, 0) : '数据暂缺'}。</p>`, '', 'full');
  }

  function tagsFor(pe, fpe, line){
    const bits = [];
    if (finite(pe) && finite(fpe) && fpe > pe) bits.push('<span class="badge y">前瞻 &gt; 滚动</span>');
    if (finite(pe) && pe < 0) bits.push('<span class="badge r">滚动为负</span>');
    if (finite(fpe) && fpe > line) bits.push(`<span class="badge r">前瞻极高</span>`);
    return bits.join(' ') || '<span class="muted">—</span>';
  }
  function topTable(id, name){
    const rows = (V() && V().top10 && V().top10[id]) || [];
    if (!rows.length) return `<h3>${name} 前十大</h3><div class="nodata">${GAP}</div>`;
    const line = thr();
    const tr = rows.map(r => {
      const pe = finite(r.pe) ? String(r.pe) : '';
      const fpe = finite(r.fpe) ? String(r.fpe) : '';
      const ey = finite(r.pe) && r.pe !== 0 ? U.pct(1 / r.pe) : GAP;
      const fey = finite(r.fpe) && r.fpe !== 0 ? U.pct(1 / r.fpe) : GAP;
      const fy = r.fsrc === 'fy' ? ' <span class="muted" title="这只凑不齐四个季度的一致预期，前瞻用的是下一个财年">财年</span>' : '';
      return `<tr data-pe="${pe}" data-fpe="${fpe}"><td><b>${U.esc(r.t)}</b></td><td style="text-align:left;white-space:normal;max-width:200px">${U.esc(r.n)}</td><td>${U.pct(r.w, 2)}</td><td>${finite(r.pe) ? `<span class="${r.pe < 0 ? 'neg' : ''}">${r.pe.toFixed(2)}</span>` : GAP}</td><td>${finite(r.fpe) ? `<span class="${r.fpe < 0 ? 'neg' : ''}">${r.fpe.toFixed(2)}</span>` : GAP}${fy}</td><td>${ey} / ${fey}</td><td class="val-tags" style="text-align:left;white-space:normal">${tagsFor(r.pe, r.fpe, line)}</td></tr>`;
    }).join('');
    return `<h3>${name} 前十大</h3><div class="tablewrap"><table class="tbl-compact"><thead><tr><th>代码</th><th style="text-align:left">名称</th><th>权重</th><th>滚动市盈率</th><th>前瞻市盈率</th><th>盈利收益率 滚动/前瞻</th><th style="text-align:left">标记</th></tr></thead><tbody>${tr}</tbody></table></div>`;
  }
  function topPanel(){
    const line = thr();
    const note = (V() && V().config && V().config.extreme_forward_pe_note) || '默认 60。只影响高亮，不改数字，也不封顶。';
    return Markets.panel('', '前十大成分股', `权重最高的 10 只；亏损的留在表里 ${APPROX}`, `<div class="selrow"><label>前瞻极高的高亮线 <input id="val-xfpe" type="number" min="1" step="1" value="${line}" aria-label="极高前瞻市盈率"> </label><span class="hint">默认 ${DEF_X}。${U.esc(note)} 存在这台浏览器里。</span></div>
      <p class="hint">黄标：前瞻市盈率高于滚动市盈率。红标「滚动为负」：这只公司过去一年在亏钱，仍按权重列出。红标「前瞻极高」：前瞻市盈率高于左边的线。三个可以同时出现。线只决定高亮，表格里的数字不会被改成 60。</p>
      ${topTable('NDX', '纳指 100')}
      ${topTable('SPX', '标普 500')}`, '', 'full');
  }

  function footer(){
    const v = V();
    const src = v && v.sources || {};
    const link = (k) => src[k] ? `<a href="${U.esc(src[k].url)}" target="_blank" rel="noopener">${U.esc(src[k].name)}</a>` : '数据暂缺';
    const method = (v && v.method) || '用最新权重把成分股加总：亏损公司按权重计入、不剔除，极大市盈率不在 60 封顶；前瞻来自公开一致预期（纳斯达克官网分析师预测页，数据商 Zacks）。';
    const gen = v && v.generated ? `本文件生成于 ${U.esc(v.generated)}（台北时间）。` : '';
    return Markets.panel('', '口径和限度', '整页都是公开近似，不是付费数据的原样转发', `<p>${U.esc(method)}</p>
      <ul class="val-limits">
        <li>权重是 ETF 持仓，不是指数公司的官方权重文件：标普用 SPY（${link('weights_spx')}），纳指用 QQQ（${link('weights_ndx')}）。差在现金、申赎篮子和期货抵押，所以标成公开近似。现金和期货不放进盈利加总。</li>
        <li>滚动每股收益来自 SEC 财报（${link('trail')}）：优先稀释每股收益，没有再用基本每股收益。取最近四个首尾相接的季度相加。财年第四季经常没有单独的季度数，只在全年里，这时用全年减去另外三个季度把它补上。太久没申报的，权重算进覆盖缺口。一次性损益不剔除，所以这个加总会和“做过正常化”的公开序列差一截，两边不要当成同一个数。</li>
        <li>前瞻来自纳斯达克官网那一页公开的一致预期（${link('forward')}）。优先把未来四个财季加总；凑不齐四个季度的，改用下一个财年，表格里标「财年」。</li>
        <li>单只市盈率的绝对值若小于 0.25，当成每股收益的单位对不上，这只不进加总，也不把它改写成 60。</li>
        <li>10 年分位用的是另一套公开序列：标普 ${link('hist_spx')}；纳指 ${link('hist_ndx')}。和上面的成分股加总不是同一个数，也不能当作新的加仓条件。</li>
        <li>信息技术用维基百科的 GICS（${link('gics')}）去对 SPY 的代码。对不上的权重不算进行业。</li>
        <li>这一页只监视。加仓仍然看领先触发、回撤分档，以及 CAPE 和 10 年期 TIPS。</li>
        <li>更新和仪表盘同一次每日脚本（美股收盘后的定时任务）。仓库里没有付费接口的密钥。某天抓失败就沿用上一版；上一版也没有，就显示数据暂缺。</li>
      </ul>
      <p class="hint">${gen}算法来自公开文章里的监视做法，数字是上面这些免费来源自己算的。不复刻王博雅的付费数据。</p>`, '', 'full');
  }

  function html(){
    const v = V();
    const fresh = v ? U.fresh(v.asof, { session: v.price_asof || v.asof }) : '数据截至 —';
    const priceNote = v && v.price_is_prev_close ? '抓取时美股还在交易，价格用的是上一笔官方收盘。' : '';
    return `<div class="pg-h"><h1>估值监视器</h1><span class="s">${fresh} ${APPROX}</span></div>
      <div class="val-banner">这一页只监视估值。加仓仍按领先触发、回撤分档、CAPE 和 10 年期 TIPS，不把市盈率分位当成新的触发条件。${priceNote}</div>
      <div class="mk-grid">
        ${indexPanel('NDX', '纳指 100', 'QQQ')}
        ${indexPanel('SPX', '标普 500', 'SPY')}
        ${growthPanel()}
        ${histPanel('NDX', '纳指 100')}
        ${histPanel('SPX', '标普 500')}
        ${itPanel()}
        ${topPanel()}
        ${footer()}
      </div>`;
  }

  function paintTags(root){
    const line = thr();
    const inp = U.$('#val-xfpe', root);
    if (inp && document.activeElement !== inp) inp.value = String(line);
    U.$$('tr[data-pe]', root).forEach(tr => {
      const pe = tr.dataset.pe === '' ? null : +tr.dataset.pe;
      const fpe = tr.dataset.fpe === '' ? null : +tr.dataset.fpe;
      const flip = finite(pe) && finite(fpe) && fpe > pe;
      tr.classList.toggle('val-flip', flip);
      const cell = U.$('.val-tags', tr);
      if (cell) cell.innerHTML = tagsFor(pe, fpe, line);
    });
  }
  function mount(root){
    const v = V();
    ['NDX', 'SPX'].forEach(id => {
      const el = U.$('#val-h-' + id, root);
      const h = v && v.indices && v.indices[id] && v.indices[id].history;
      if (!el || !h || !h.d || h.d.length < 2) return;
      Charts.line(el, {
        x: h.d.map(U.ts), ys: [h.v], labels: [id === 'NDX' ? '纳指滚动市盈率' : '标普滚动市盈率'],
        range: 'ALL', ranges: false, height: 220, logToggle: false,
        fmt: x => x == null ? '—' : x.toFixed(2),
      });
    });
    const inp = U.$('#val-xfpe', root);
    if (inp){
      inp.addEventListener('input', () => {
        const n = parseFloat(inp.value);
        if (n > 0) U.store.set('ms_val_xfpe', n);
        paintTags(root);
      });
    }
    paintTags(root);
  }

  function homeStrip(){
    const v = V();
    const bit = (id, name) => {
      const b = v && v.indices && v.indices[id];
      if (!b || !finite(b.pe)) return `${name} 滚动市盈率 数据暂缺`;
      const g = finite(b.implied_g) ? `，隐含增长 ${U.pct(b.implied_g)}` : '';
      const p = b.history && finite(b.history.pct10) ? `，10 年分位 ${b.history.pct10.toFixed(0)}` : '';
      return `${name} 滚动 <b>${b.pe.toFixed(1)}</b>${p}${g}`;
    };
    return `<a class="val-home" href="#/val"><span class="t">估值监视器</span><span>${bit('NDX', '纳指')}</span><span>${bit('SPX', '标普')}</span><span class="muted">只监视，不加仓 · 公开近似</span></a>`;
  }

  return { html, mount, homeStrip };
})();
