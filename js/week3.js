// 第 3 周：信用开关 + VIX 规则回测（数据和结果由 week3_backtest.py 预先算好）
const Week3 = (() => {
  const RN = { L:'L 利差水平', C:'C 利差变化', V:'V 恐慌（VIX）', LC:'L+C 组合' };
  const RD = { L:'BAA10Y 的扩展 z 分数 > +1.0 就离场，< +0.5 才回来（前 5 年只做预热，1991 年起才有信号）',
               C:'BAA10Y 63 个交易日内上升超过 0.50 个百分点就离场，63 日变化 < 0 才回来',
               V:'VIX 20 日平均 > 30 就离场，< 25 才回来（VIX 1990 年起才有）',
               LC:'L 和 C 都处在离场状态才离场，任何一个解除就回来' };
  const P = (x, nd=1) => x == null ? '—' : (x > 0 ? '+' : '') + (x*100).toFixed(nd) + '%';
  const Q = (x, nd=0) => x == null ? '—' : (x*100).toFixed(nd) + '%';
  const ok = b => b ? '<span class="tag g">通过</span>' : '<span class="tag r">不通过</span>';

  const Qs = [
    { id:'w3q1', q:'2008 年金融危机（标普从 2007-10 高点跌了 57%），你觉得哪条规则躲得最多？信用规则会在股市高点之前还是之后发出离场信号？',
      ans: () => { const R = W3.idx.SPX, j = R.episodes.findIndex(e => e.peak.startsWith('2007'));
        const rows = ['L','C','V','LC'].map(r => { const e = R.rules[r].runs.real.eps[j]; return { r, e }; });
        const best = rows.filter(x => x.e.status === '触发').sort((a, b) => b.e.avoided - a.e.avoided)[0];
        return rows.map(({ r, e }) => `${RN[r]}：${e.status === '触发' ? `${e.fired} 发出信号（高点${e.wk_after_peak < 0 ? '前 ' + (-e.wk_after_peak).toFixed(0) : '后 ' + e.wk_after_peak.toFixed(0)} 周），躲过 ${Q(e.avoided)} 的跌幅` : e.status}`).join('；') +
          `。躲得最多的是 <b>${RN[best.r]}</b>。但要看下面的表：躲得多的，往往回来得也晚，错过了谷底之后的大反弹。`; } },
    { id:'w3q2', q:'加上现实成本（再晚 5 个交易日执行，来回 1% 费用）之后，4 条规则里你觉得有几条能在样本外（2006 年以后）同时通过三条标准？',
      ans: () => { const f = k => ['L','C','V','LC'].filter(r => W3.idx[k].rules[r].runs.real.v_OOS.useful).map(r => RN[r]);
        const a = f('SPX'), b = f('NDX');
        return `标普 500：<b>${a.length} 条</b>${a.length ? '（' + a.join('、') + '）' : ''}；纳指 100：<b>${b.length} 条</b>${b.length ? '（' + b.join('、') + '）' : ''}。但同样的规则在样本内（1986–2005）全都没通过“回撤减少 1/3”，或者年化少太多，只有 L 例外。一段时间行、另一段不行，说明结论很依赖少数几次危机。`; } },
  ];

  let st = { key:'SPX', rule:'LC', run:'real' };
  function render(app){
    const N = W3.data_note;
    app.insertAdjacentHTML('beforeend', `
      <h1>第 3 周　信用 + VIX 规则：真的能躲开熊市吗</h1>
      <div class="card"><b>这周要回答的问题</b>：如果完全照着几条事先写好的规则，信用利差一变坏就把股票全换成国库券、好了再买回来，从 1986 年到现在会比一直拿着更好吗？加上你买 QDII 基金的真实成本和延迟之后呢？
      <p class="small muted" style="margin-bottom:0">规则在看结果之前就定好了（投资助手 2026-10-21 登记），这里一个参数都没调。<br>
      数据：${N.spx} ${N.baa} ${N.vix} 现金收益：${N.cash} 第二组：${N.ndx}</p></div>`);
    const lock = document.createElement('div');
    app.appendChild(Week1.predict(Qs, ok2 => { lock.dataset.ok = ok2 ? '1' : ''; draw(); }));
    app.insertAdjacentHTML('beforeend', `
      <div class="grid g2" style="margin-top:14px">
        <div class="card concept"><h3>概念：样本内和样本外</h3>
          <p>样本内 = 考试前做过的练习题（1986–2005）；样本外 = 从没见过的新题（2006–2026）。规则在练习题上表现好不稀奇，在新题上还好才算数。</p>
          <p style="margin-bottom:0">这周两段用的是<b>同一套</b>规则，没有根据样本内的结果去改。</p></div>
        <div class="card concept"><h3>概念：延迟和来回成本</h3>
          <p>周五收盘看到信号，下周五才执行，这叫晚 1 周。你的场外 QDII 赎回还要再等几天，所以“现实版”再晚 5 个交易日。</p>
          <p style="margin-bottom:0">来回 1% = 卖出一次、买回一次合计 1%，也就是每次切换 0.5%。一年切换 0.8 次，大约每年少赚 0.4%。</p></div>
        <div class="card concept"><h3>概念：三条及格线（样本外、现实版）</h3>
          <p>① 最大回撤至少减少 1/3：一直持有最多跌 57%，规则最多只能跌到约 38%。<br>② 年化收益最多少 1 个百分点：一直持有每年 9.1%，规则至少要 8.1%。<br>③ 来回打脸每年不超过 1 次。</p>
          <p style="margin-bottom:0">三条都过才算“能当交易规则用”，否则只留在看板上当参考。</p></div>
        <div class="card concept"><h3>概念：来回打脸（whipsaw）</h3>
          <p style="margin-bottom:0">卖出之后不到 8 周又买回来（或者反过来），叫一次打脸。每次都付了成本，往往还卖在低处、买在高处。</p></div>
      </div>
      <h2>结果</h2>`);
    app.appendChild(lock);
    app.insertAdjacentHTML('beforeend', `
      <div class="card pitfall" style="margin-top:14px"><h3>要小心的坑</h3>
      <ul style="margin:0;padding-left:20px">
        <li><b>样本外的“通过”主要靠 2008 年一次。</b>熊市只有个位数，一次危机躲得好不好，就能决定整段结果。</li>
        <li><b>没算分红。</b>用的是价格指数：持股时少算了每年约 1.5–2% 的分红，离场时却算了国库券利息，这对规则有利。下面有一个近似总回报的检查。</li>
        <li><b>信号来得晚。</b>2020 年这种快速暴跌，信号出来、再加上执行延迟，已经过了谷底，反而卖在底部附近。</li>
        <li><b>只看了美国。</b>样本很小，换个市场、换个年代，结论可能不同。</li>
        <li><b>不改规则。</b>这周只是检验，你的定投和分档加仓不因为这周的结果改变。</li>
      </ul></div>
      <div class="card interp" style="margin-top:14px" id="w3-interp"></div>`);

    function draw(){
      const ip = U.$('#w3-interp');
      if (ip) ip.innerHTML = !lock.dataset.ok ? '<h3 style="margin-top:0">解读</h3><p class="muted" style="margin:0">投资助手写的解读会揭晓上面两道题的答案，所以要等你提交猜测之后才显示。</p>'
        : (window.INTERP && INTERP.week3 ? U.md(INTERP.week3) : '<h3 style="margin-top:0">解读</h3><p class="muted" style="margin:0">这一部分由投资助手根据结果来写，还没写好。按约定，这周的结果<b>不改变</b>你现在的规则。</p>');
      if (!lock.dataset.ok){ lock.innerHTML = '<div class="lockmsg">先在上面写下你对两个问题的猜测并提交，图表和结果才会出现。</div>'; return; }
      if (lock.dataset.drawn) return; lock.dataset.drawn = '1';
      lock.innerHTML = `
        <div class="card">
          <div class="slider" style="gap:6px"><span>指数</span>${['SPX','NDX'].map(k => `<button class="btn small" data-k="${k}">${k === 'SPX' ? '标普 500' : '纳指 100'}</button>`).join('')}</div>
          <div class="slider" style="gap:6px"><span>规则</span>${['L','C','V','LC'].map(r => `<button class="btn small" data-r="${r}">${RN[r]}</button>`).join('')}</div>
          <div class="slider" style="gap:6px"><span>成本和延迟</span><button class="btn small" data-run="base">基础：晚 1 周，每次 0.1%</button><button class="btn small" data-run="real">现实（QDII）：再晚 5 天，来回 1%</button></div>
          <p class="small" id="w3-desc"></p>
          <div id="w3-verdict"></div>
          <h3>资金曲线（对数刻度，起点 = 1）　<span class="small muted">黄色底 = 规则在场外（拿国库券）；虚线 = 样本内和样本外的分界</span></h3><div id="w3-eq"></div>
          <h3>从最高点算的回撤（周度）</h3><div id="w3-dd"></div>
          <div class="tablewrap" id="w3-metrics"></div>
        </div>
        <h3>每次熊市（标普价格从历史高点跌 ≥ 15%）</h3>
        <div class="card tablewrap" id="w3-eps"></div>
        <div class="card" style="margin-top:14px" id="w3-2022"></div>
        <h3>4 条规则一起看（样本外、现实版）</h3>
        <div class="card tablewrap" id="w3-all"></div>
        <h3>探索性检查：补上分红以后</h3>
        <div class="card tablewrap" id="w3-tr"></div>`;
      U.$$('[data-k]', lock).forEach(b => b.onclick = () => { st.key = b.dataset.k; update(); });
      U.$$('[data-r]', lock).forEach(b => b.onclick = () => { st.rule = b.dataset.r; update(); });
      U.$$('[data-run]', lock).forEach(b => b.onclick = () => { st.run = b.dataset.run; update(); });
      update();
    }
    function bandsFrom(dates, pos){
      const out = []; let s = null;
      pos.forEach((p, i) => { if (p === 0 && s == null) s = U.ts(dates[i]); if (p !== 0 && s != null){ out.push([s, U.ts(dates[i])]); s = null; } });
      if (s != null) out.push([s, U.ts(U.last(dates))]); return out;
    }
    function update(){
      const R = W3.idx[st.key], rr = R.rules[st.rule].runs[st.run];
      U.$$('[data-k]', lock).forEach(b => b.classList.toggle('primary', b.dataset.k === st.key));
      U.$$('[data-r]', lock).forEach(b => b.classList.toggle('primary', b.dataset.r === st.rule));
      U.$$('[data-run]', lock).forEach(b => b.classList.toggle('primary', b.dataset.run === st.run));
      U.$('#w3-desc').innerHTML = `<b>${RN[st.rule]}</b>：${RD[st.rule]}。离场时 100% 拿 3 个月国库券，在场时 100% 拿${R.name}。`;
      const v = rr.v_OOS, vi = rr.v_IS;
      U.$('#w3-verdict').innerHTML = `<div class="tablewrap"><table><thead><tr><th>三条及格线</th><th>样本内（${rr.IS.start.slice(0,4)}–2005）</th><th>样本外（2006–${rr.OOS.end.slice(0,4)}）</th></tr></thead><tbody>
        <tr><td>最大回撤减少 ≥ 1/3</td><td>${Q(vi.mdd_cut)}（${P(rr.IS.mdd)} 对 ${P(rr.IS_bh.mdd)}） ${ok(vi.pass_mdd)}</td><td>${Q(v.mdd_cut)}（${P(rr.OOS.mdd)} 对 ${P(rr.OOS_bh.mdd)}） ${ok(v.pass_mdd)}</td></tr>
        <tr><td>年化最多少 1 个百分点</td><td>${(vi.cagr_cost*100).toFixed(2)}（${P(rr.IS.cagr)} 对 ${P(rr.IS_bh.cagr)}） ${ok(vi.pass_cagr)}</td><td>${(v.cagr_cost*100).toFixed(2)}（${P(rr.OOS.cagr)} 对 ${P(rr.OOS_bh.cagr)}） ${ok(v.pass_cagr)}</td></tr>
        <tr><td>来回打脸 ≤ 1 次/年</td><td>${rr.IS.whip_yr.toFixed(2)} ${ok(vi.pass_whip)}</td><td>${rr.OOS.whip_yr.toFixed(2)} ${ok(v.pass_whip)}</td></tr>
        <tr class="base"><td>结论</td><td>${vi.useful ? '三条都过' : '没有全过'}</td><td>${v.useful ? '三条都过（按预先登记的标准算“有用”）' : '没有全过：只做看板指标'}</td></tr></tbody></table></div>
        <p class="small muted">“年化少多少”是负数表示规则反而多赚。正式判定只看样本外、现实版；样本内和基础版仅供对照。</p>`;
      const x = R.wk_dates.map(U.ts), xb = bandsFrom(R.wk_dates, rr.pos), xl = [{ t:U.ts('2006-01-02'), label:'样本外 →' }];
      Charts.line(U.$('#w3-eq'), { x, ys:[rr.eq, R.bh], labels:[RN[st.rule], '一直持有'], colors:[U.css('--chart2'), U.css('--chart1')], range:'ALL', height:240, log:true, xbands:xb, xlines:xl, fmt: v => v == null ? '—' : v.toFixed(2) });
      const ddOf = a => { let m = -Infinity; return a.map(v => { m = Math.max(m, v); return (v/m - 1)*100; }); };
      Charts.line(U.$('#w3-dd'), { x, ys:[ddOf(rr.eq), ddOf(R.bh)], labels:[RN[st.rule], '一直持有'], colors:[U.css('--chart2'), U.css('--chart1')], range:'ALL', height:180, maxY:0, xbands:xb, xlines:xl, axisFmt: v => v.toFixed(0) + '%', fmt: v => v == null ? '—' : v.toFixed(1) + '%' });
      const row = (lbl, m) => `<tr><td>${lbl}</td><td>${m.start} → ${m.end}</td><td>${P(m.cagr)}</td><td>${Q(m.vol,1)}</td><td>${m.sharpe == null ? '—' : m.sharpe.toFixed(2)}</td><td>${P(m.mdd)}</td><td>${Q(m.off)}</td><td>${m.sw_yr.toFixed(2)}</td><td>${m.whip_yr.toFixed(2)}</td></tr>`;
      U.$('#w3-metrics').innerHTML = `<h3>全部指标</h3><table><thead><tr><th></th><th>时间段</th><th>年化</th><th>波动</th><th>夏普</th><th>最大回撤（日）</th><th>离场时间</th><th>切换/年</th><th>打脸/年</th></tr></thead><tbody>
        ${row('规则 · 样本内', rr.IS)}${row('一直持有 · 样本内', rr.IS_bh)}${row('规则 · 样本外', rr.OOS)}${row('一直持有 · 样本外', rr.OOS_bh)}</tbody></table>
        <p class="small muted">夏普 = 每承担 1 份波动，比国库券多赚多少，越高越好。规则第一次能算出信号是 ${R.rules[st.rule].first_signal}，样本内从那之后开始算，“一直持有”用同一段时间。</p>`;
      const S = W3.idx.SPX, sr = S.rules[st.rule].runs[st.run];
      U.$('#w3-eps').innerHTML = (st.key === 'NDX' ? '<p class="small muted">熊市表固定用标普 500。</p>' : '') + `<table><thead><tr><th>熊市</th><th>跌幅</th><th>首次离场信号</th><th>相对高点</th><th>离场执行日</th><th>躲过的跌幅</th><th>回到场内</th><th>谷底到回场，指数涨了（错过的）</th></tr></thead><tbody>
        ${S.episodes.map((ep, j) => { const e = sr.eps[j]; const big = ep.dd <= -0.2;
          const head = `<td>${ep.peak} → ${ep.trough}${big ? '' : ' <span class="tag">15–20%</span>'}</td><td>${P(ep.dd)}</td>`;
          if (e.status !== '触发') return `<tr>${head}<td>${e.status}</td><td>—</td><td>—</td><td>${e.status === '不评估' ? '—' : '0%'}</td><td>—</td><td>—</td></tr>`;
          return `<tr${ep.peak.startsWith('2022') ? ' class="base"' : ''}>${head}<td>${e.fired}${e.pre_off ? '（高点前已在场外）' : ''}</td><td>${e.wk_after_peak < 0 ? '高点前 ' + (-e.wk_after_peak).toFixed(0) : '高点后 ' + e.wk_after_peak.toFixed(0)} 周</td><td>${e.exec || '—'}${e.exec_after_trough ? '（已过谷底）' : ''}</td><td>${Q(e.avoided)}</td><td>${e.reentry || (e.back_before_trough ? '谷底前已回场' : '还没回来')}</td><td>${e.missed == null ? '—' : P(e.missed)}</td></tr>`; }).join('')}
        </tbody></table><p class="small muted">“躲过的跌幅”= 1 − 规则在高点到谷底之间的亏损 ÷ 指数的亏损。1987 年 L 和 V 还算不出信号（L 要 5 年预热，VIX 1990 年才有），所以不评估。</p>`;
      const j22 = S.episodes.findIndex(e => e.peak.startsWith('2022'));
      U.$('#w3-2022').innerHTML = `<h3 style="margin-top:0">2022 年单独看（${st.run === 'real' ? '现实版' : '基础版'}）</h3><p style="margin:0">${['L','C','V','LC'].map(r => { const e = S.rules[r].runs[st.run].eps[j22]; return `<b>${RN[r]}</b>：${e.status === '触发' ? `${e.fired} 发出离场信号，躲过 ${Q(e.avoided)} 的跌幅，${e.reentry ? e.reentry + ' 回场' : e.back_before_trough ? '谷底前已经回场' : ''}` : e.status}`; }).join('<br>')}</p>
        <p class="small muted" style="margin-bottom:0">2022 年是加息推动的熊市，信用市场几乎没报警：信用水平规则 L 没触发，变化规则 C 只是短暂离场，在谷底前就回来了。</p>`;
      U.$('#w3-all').innerHTML = `<table><thead><tr><th>规则</th><th>回撤减少 ≥ 1/3</th><th>年化最多少 1 个百分点</th><th>打脸 ≤ 1 次/年</th><th>结论</th></tr></thead><tbody>
        ${['L','C','V','LC'].map(r => { const a = R.rules[r].runs.real, v = a.v_OOS; return `<tr><td>${RN[r]}</td><td>${Q(v.mdd_cut)} ${ok(v.pass_mdd)}</td><td>${(v.cagr_cost*100).toFixed(2)} ${ok(v.pass_cagr)}</td><td>${a.OOS.whip_yr.toFixed(2)} ${ok(v.pass_whip)}</td><td>${v.useful ? '<b>有用</b>' : '只做看板指标'}</td></tr>`; }).join('')}
        </tbody></table><p class="small muted">当前指数：${R.name}。</p>`;
      const t = W3.tr_check;
      U.$('#w3-tr').innerHTML = t && t.rows ? `<p class="small">这不是预先登记的结果。用 Shiller 教授公开的月度股息给标普价格补上分红，近似成“总回报”，样本外 2006-01 到 ${t.end}（他的股息数据只到这里），现实版成本。</p>
        <table><thead><tr><th>规则</th><th>年化</th><th>一直持有年化</th><th>年化少多少（百分点）</th><th>回撤减少</th><th>打脸/年</th></tr></thead><tbody>
        ${Object.entries(t.rows).map(([r, x]) => `<tr><td>${RN[r]}</td><td>${P(x.cagr)}</td><td>${P(x.bh_cagr)}</td><td>${(x.cagr_cost*100).toFixed(2)}</td><td>${Q(x.mdd_cut)}</td><td>${x.whip_yr.toFixed(2)}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">没有做成。</p>';
    }
    draw();
  }
  return { render };
})();
