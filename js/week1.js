// 第 1 周：回撤与分档加仓。算法与 update_data.py 中 drawdown_analysis 完全一致。
const Week1 = (() => {
  const START = '1990-01-01';
  function analyze(d, p, tiers){
    const n = p.length, hi = new Array(n), hix = new Array(n); let m = -Infinity, mi = 0;
    for (let i = 0; i < n; i++){ if (p[i] > m){ m = p[i]; mi = i; } hi[i] = m; hix[i] = mi; }
    const dd = p.map((x, i) => x/hi[i] - 1);
    let i0 = d.findIndex(x => x >= START);
    const events = []; let cur = null;
    for (let i = i0; i < n; i++){
      if (p[i] >= hi[i] && (i === 0 || p[i] > hi[i-1] - 1e-12)){ if (cur){ cur.end = i; events.push(cur); cur = null; } continue; }
      for (const t of tiers){ if (dd[i] <= -t/100){ if (!cur) cur = { start:i, peak:hi[i], peak_i:hix[i], trig:{}, end:null }; if (!(t in cur.trig)) cur.trig[t] = i; } }
    }
    if (cur) events.push(cur);
    const rows = [];
    events.forEach(e => tiers.forEach(t => { if (!(t in e.trig)) return; const i = e.trig[t];
      let r12 = null, w12 = null;
      if (i + 252 < n){ r12 = p[i+252]/p[i] - 1; let mn = Infinity; for (let k = i; k <= i+252; k++) if (p[k] < mn) mn = p[k]; w12 = mn/p[i] - 1; }
      rows.push({ tier:t, date:d[i], price:p[i], peak_date:d[e.peak_i], peak:e.peak, ret12:r12, worse12:w12, recover: e.end != null ? e.end - i : null, i });
    }));
    return { dd, hi, rows };
  }
  const baseCache = {};
  function baseline(key, d, p){
    if (baseCache[key]) return baseCache[key];
    const n = p.length, i0 = d.findIndex(x => x >= START), R = [], W = [];
    for (let i = i0; i < n-252; i++){ R.push(p[i+252]/p[i] - 1); let mn = Infinity; for (let k = i; k <= i+252; k++) if (p[k] < mn) mn = p[k]; W.push(mn/p[i] - 1); }
    return baseCache[key] = { n:R.length, ret_med:U.median(R), ret_mean:U.mean(R), ret_p10:U.quant(R,.1), ret_p90:U.quant(R,.9), w_med:U.median(W), share_w10: W.filter(x => x <= -0.10).length / W.length };
  }
  function summarize(rows, tiers){
    return tiers.map(t => { const rs = rows.filter(r => r.tier === t), done = rs.filter(r => r.ret12 != null);
      const R = done.map(r => r.ret12), W = done.map(r => r.worse12);
      return { tier:t, episodes:rs.length, complete:done.length, ret_med:U.median(R), ret_mean:U.mean(R), ret_min:R.length ? Math.min(...R) : null, ret_p10:U.quant(R,.1), ret_p90:U.quant(R,.9), w_med:U.median(W), share_w10: W.length ? W.filter(x => x <= -0.10).length / W.length : null }; });
  }

  const Q = [
    { id:'w1q1', q:'从 1990 年到现在，你觉得标普 500 从历史高点下跌 20% 以上，分开算一共发生过几次？纳指 100 下跌 25% 以上呢？',
      ans: () => { const a = W1.SPX.summary.find(s => s.tier === 20), b = W1.NDX.summary.find(s => s.tier === 25);
        return `标普 −20%：<b>${a.episodes} 次</b>（${W1.SPX.rows.filter(r => r.tier === 20).map(r => r.date.slice(0,4)).join('、')}）；纳指 100 −25%：<b>${b.episodes} 次</b>（${W1.NDX.rows.filter(r => r.tier === 25).map(r => r.date.slice(0,4)).join('、')}）。比很多人想的少：深跌是罕见事件。`; } },
    { id:'w1q2', q:'标普第一次跌到 −10% 之后的 12 个月，你觉得通常比“随便哪一天买入”更好还是更差？大概差多少？',
      ans: () => { const a = W1.SPX.summary.find(s => s.tier === 10), b = W1.SPX.baseline;
        return `−10% 首次触发后 12 个月回报的<b>中位数 ${U.pct(a.ret_med)}</b>（共 ${a.complete} 次），随便哪一天买入的中位数 <b>${U.pct(b.ret_med)}</b>。只有 ${a.complete} 次。其中一年后还在亏的：${W1.SPX.rows.filter(r => r.tier === 10 && r.ret12 != null && r.ret12 < 0).map(r => r.date.slice(0,4) + ' 年 ' + U.pct(r.ret12)).join('，') || '没有'}。平均数是 ${U.pct(a.ret_mean)}（基准平均 ${U.pct(b.ret_mean)}），和中位数差很多，就是被这几次拖的。`; } },
  ];

  function predictBlock(qs, onAll){
    const saved = U.store.get('ms_predict', {});
    const el = document.createElement('div'); el.className = 'card predict';
    el.innerHTML = `<h3 style="margin-top:0">先猜一猜（写下来再看结果）</h3><p class="small muted">凭直觉写就行，猜错正好说明这周值得学。答案和下面的图表要等你写完所有问题才会出现。你的答案只存在这台设备上。</p>` +
      qs.map((x, i) => `<div data-q="${x.id}"><div class="q">${i+1}. ${x.q}</div>
        <textarea placeholder="写下你的猜测…">${U.esc(saved[x.id] || '')}</textarea>
        <div style="margin-top:6px"><button class="btn primary small">提交我的猜测</button> <span class="small muted saved">${saved[x.id] ? '已提交' : ''}</span></div>
        <div class="answer" style="display:${saved[x.id] ? 'block' : 'none'}"></div></div>`).join('');
    function refresh(){
      const s = U.store.get('ms_predict', {});
      qs.forEach(x => { const box = U.$(`[data-q="${x.id}"]`, el), a = U.$('.answer', box);
        if (s[x.id]){ a.style.display = 'block'; a.innerHTML = `<b>实际数据：</b>${x.ans()}`; U.$('.saved', box).textContent = '已提交（可以改了再提交）'; } else { a.style.display = 'none'; a.innerHTML = ''; } });
      onAll(qs.every(x => s[x.id]));
    }
    qs.forEach(x => { const box = U.$(`[data-q="${x.id}"]`, el);
      U.$('button', box).onclick = () => { const v = U.$('textarea', box).value.trim(); if (!v){ U.$('textarea', box).focus(); return; } const s = U.store.get('ms_predict', {}); s[x.id] = v; s[x.id + '_t'] = new Date().toISOString(); U.store.set('ms_predict', s); refresh(); }; });
    setTimeout(refresh, 0);
    return el;
  }

  let state = { key:'SPX', tiers:{ SPX:null, NDX:null }, explore:{ SPX:20, NDX:25 } };
  function render(app){
    const T = Settings.get();
    if (!state.tiers.SPX) state.tiers.SPX = [T.spx_t1, T.spx_t2, T.spx_t3];
    if (!state.tiers.NDX) state.tiers.NDX = [T.ndx_t1, T.ndx_t2, T.ndx_t3];
    const spx = U.ser('SPX'), ndx = U.ser('NDX');
    app.insertAdjacentHTML('beforeend', `
      <h1>第 1 周　回撤：你的分档加仓到底多久触发一次</h1>
      <div class="card"><b>这周要回答的问题</b>：从 1990 年到现在，你的每一档加仓各触发过几次？第一次触发之后的 12 个月，和随便哪一天买入相比，结果怎么样？
      <p class="small muted" style="margin-bottom:0">数据：标普 500 用 Cboe 官方历史（${spx.start} 起，到 ${spx.end}）；纳指 100 用 FRED（${ndx.start} 起，到 ${ndx.end}）。都是<b>价格指数，不含分红</b>（含分红的总回报数据没找到免费可靠来源）。统计从 1990-01-01 开始，但“历史高点”会算上 1990 年以前的收盘。</p></div>`);
    const lockArea = document.createElement('div');
    app.appendChild(predictBlock(Q, ok => { lockArea.dataset.ok = ok ? '1' : ''; drawLocked(); }));
    app.insertAdjacentHTML('beforeend', `
      <div class="grid g2" style="margin-top:14px">
        <div class="card concept"><h3>概念：回撤是什么</h3>
          <p>回撤 = 今天的价格 ÷ 到今天为止的最高价 − 1。</p>
          <p>例子：最高到过 100，今天 85，回撤 = 85 ÷ 100 − 1 = <b>−15%</b>。再涨回 100 以上，就叫“创新高”，这一轮回撤结束。</p>
          <div class="calc"><label>最高价 <input type="number" id="c-hi" value="100"></label><label>今天 <input type="number" id="c-now" value="85"></label><span>回撤 = <span class="out" id="c-out">−15.0%</span></span></div>
        </div>
        <div class="card concept"><h3>概念：平均数和中位数</h3>
          <p>5 个结果：+20%、+15%、+12%、+10%、−40%。</p>
          <p>平均数 = 加起来 ÷ 5 = (20 + 15 + 12 + 10 − 40) ÷ 5 = <b>+3.4%</b>。<br>中位数 = 从小到大排好后正中间那个 = <b>+12%</b>。</p>
          <p style="margin-bottom:0">一次大灾难就能把平均数拖下来；中位数反映“通常情况”。所以下面两个都给你看。</p>
        </div>
      </div>
      <h2>你的结果</h2>`);
    app.appendChild(lockArea);
    app.insertAdjacentHTML('beforeend', `
      <div class="card pitfall" style="margin-top:14px"><h3>要小心的坑</h3>
      <ul style="margin:0;padding-left:20px">
        <li><b>次数太少。</b>深的档位只有个位数的独立事件。用 3、4 个例子算出来的百分比只是故事，不是统计。</li>
        <li><b>按“事件”数，不按“天”数。</b>2008 年标普在 −10% 以下待了几百天，如果按天数算，一次危机就会被当成几百个样本。</li>
        <li><b>“历史高点”的定义会吃掉一些回调。</b>2010、2011 年标普从局部高点跌了 16–19%，但那时还没回到 2007 年的历史高点，所以都算在 2007 年那一个事件里。</li>
        <li><b>只看价格，没算分红。</b>标普每年大约 1.5–2% 的分红没算进去，所以长期回报会被低估。</li>
        <li><b>你买的是 QDII 基金，不是指数本身。</b>还有汇率、费用、溢价和申购限额。</li>
      </ul></div>
      <div class="card interp" style="margin-top:14px" id="w1-interp"></div>`);

    U.$('#c-hi').oninput = U.$('#c-now').oninput = () => { const a = +U.$('#c-hi').value, b = +U.$('#c-now').value; U.$('#c-out').textContent = a > 0 ? U.pct(b/a - 1).replace('-', '−') : '—'; };

    function drawLocked(){
      const ip = U.$('#w1-interp');
      if (ip) ip.innerHTML = !lockArea.dataset.ok ? '<h3 style="margin-top:0">解读</h3><p class="muted" style="margin:0">投资助手写的解读会揭晓上面两道题的答案，所以要等你提交猜测之后才显示。</p>'
        : (window.INTERP && INTERP['week1'] ? U.md(INTERP['week1']) : '<h3 style="margin-top:0">解读</h3><p class="muted" style="margin:0">暂无解读。</p>');
      if (!lockArea.dataset.ok){ lockArea.innerHTML = `<div class="lockmsg">先在上面写下你对两个问题的猜测并提交，图表和结果才会出现。</div>`; return; }
      if (lockArea.dataset.drawn) return; lockArea.dataset.drawn = '1';
      lockArea.innerHTML = `
        <div class="card">
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><span>看哪个指数：</span><button class="btn small" data-k="SPX">标普 500</button><button class="btn small" data-k="NDX">纳指 100</button></div>
          <h3>指数（对数刻度）</h3><div id="w1-price"></div>
          <h3>回撤曲线　<span class="small muted">虚线 = 你的档位；圆点 = 每个事件里每档第一次触发</span></h3><div id="w1-dd"></div>
          <div id="w1-tiers"></div>
        </div>
        <h3>汇总：每一档 vs 随便哪一天买入（基准）</h3>
        <div class="card tablewrap" id="w1-sum"></div>
        <h3>明细：每个事件每档一行</h3>
        <div class="card tablewrap" id="w1-rows"></div>
        <div class="card explore" style="margin-top:14px"><h3 style="margin-top:0">探索区 <span class="badge">探索，不是新规则</span></h3>
          <p class="small">拖动看看：如果把某一档放在别的位置，触发次数和之后的结果怎么变。<b>别根据这里挑一个“最好看”的数字改规则。</b>只有几次样本时，挑出来的“最优档位”大多是碰巧，第 6 周会专门讲这个（过度拟合）。</p>
          <div class="slider"><span>档位</span><input type="range" min="8" max="40" step="1" id="w1-ex"><span class="v" id="w1-exv"></span></div>
          <div class="stat" id="w1-exout"></div>
        </div>`;
      U.$$('[data-k]', lockArea).forEach(b => b.onclick = () => { state.key = b.dataset.k; update(true); });
      U.$('#w1-ex').oninput = () => { state.explore[state.key] = +U.$('#w1-ex').value; explore(); };
      update(true);
    }
    let priceChart, ddChart;
    function update(full){
      const key = state.key, s = U.ser(key), tiers = state.tiers[key];
      U.$$('[data-k]', lockArea).forEach(b => b.classList.toggle('primary', b.dataset.k === key));
      const A = analyze(s.d, s.v, tiers), base = baseline(key, s.d, s.v);
      const i0 = s.d.findIndex(x => x >= START);
      const x = s.d.slice(i0).map(U.ts), px = s.v.slice(i0), dd = A.dd.slice(i0).map(v => v*100);
      const cols = [U.css('--chart4'), U.css('--y'), U.css('--r')];
      const pts = A.rows.map(r => ({ t:U.ts(r.date), y:A.dd[r.i]*100, color: cols[tiers.indexOf(r.tier)] }));
      const ppts = A.rows.map(r => ({ t:U.ts(r.date), y:r.price, color: cols[tiers.indexOf(r.tier)] }));
      if (full){
        priceChart = Charts.line(U.$('#w1-price'), { x, ys:[px], labels:[key === 'SPX' ? '标普 500' : '纳指 100'], range:'ALL', height:220, log:true, points:ppts, fmt: v => v == null ? '—' : U.fmtNum(v, 2) });
      }
      ddChart = Charts.line(U.$('#w1-dd'), { x, ys:[dd], labels:['回撤'], range:'ALL', height:200, maxY:0, points:pts, axisFmt: v => v.toFixed(0) + '%',
        hlines: tiers.map((t, i) => ({ y:-t, label:`−${t}%`, color: cols[i] })), fmt: v => v == null ? '—' : v.toFixed(1) + '%' });
      if (!full){ priceChart = Charts.line(U.$('#w1-price'), { x, ys:[px], labels:[key === 'SPX' ? '标普 500' : '纳指 100'], range:'ALL', height:220, log:true, points:ppts, fmt: v => v == null ? '—' : U.fmtNum(v, 2) }); }
      // 档位滑块
      const def = key === 'SPX' ? [T.spx_t1, T.spx_t2, T.spx_t3] : [T.ndx_t1, T.ndx_t2, T.ndx_t3];
      U.$('#w1-tiers').innerHTML = `<h3>改一改档位看看 <span class="small muted">（只影响这一页，不改你的设置；你的规则是 ${def.map(t => '−' + t + '%').join(' / ')}）</span></h3>` +
        tiers.map((t, i) => `<div class="slider"><span>第 ${i+1} 档</span><input type="range" min="5" max="60" step="1" value="${t}" data-i="${i}"><span class="v">−${t}%</span></div>`).join('') +
        `<button class="btn small" id="w1-reset">恢复成你的档位</button>`;
      U.$$('#w1-tiers input').forEach(inp => inp.oninput = () => { const arr = [...state.tiers[key]]; arr[+inp.dataset.i] = +inp.value; inp.nextElementSibling.textContent = '−' + inp.value + '%';
        clearTimeout(inp._t); inp._t = setTimeout(() => { state.tiers[key] = arr; update(false); }, 120); });
      U.$('#w1-reset').onclick = () => { state.tiers[key] = def; update(false); };
      // 表格
      const sum = summarize(A.rows, tiers);
      U.$('#w1-sum').innerHTML = `<table><thead><tr><th>档位</th><th>独立事件</th><th>满 12 个月的</th><th>12 月回报中位数</th><th>平均</th><th>10% 分位</th><th>90% 分位</th><th>最差</th><th>之后最深再跌（中位数）</th><th>之后又跌 ≥10% 的比例</th></tr></thead><tbody>
        ${sum.map(s => `<tr><td>−${s.tier}%</td><td>${s.episodes}</td><td>${s.complete}</td><td>${U.pct(s.ret_med)}</td><td>${U.pct(s.ret_mean)}</td><td>${U.pct(s.ret_p10)}</td><td>${U.pct(s.ret_p90)}</td><td>${U.pct(s.ret_min)}</td><td>${U.pct(s.w_med)}</td><td>${s.share_w10 == null ? '—' : (s.share_w10*100).toFixed(0) + '%'}</td></tr>`).join('')}
        <tr class="base"><td>基准：每一个交易日（${base.n.toLocaleString()} 天）</td><td>—</td><td>—</td><td>${U.pct(base.ret_med)}</td><td>${U.pct(base.ret_mean)}</td><td>${U.pct(base.ret_p10)}</td><td>${U.pct(base.ret_p90)}</td><td>—</td><td>${U.pct(base.w_med)}</td><td>${(base.share_w10*100).toFixed(0)}%</td></tr></tbody></table>
        <p class="small muted">“之后最深再跌”= 触发后 12 个月内最低收盘相对触发价的跌幅。基准那一行是“如果每天都买，12 个月后怎样”，它是用来比较的尺子：一档的数字只有明显好于基准，才说明“跌了再买”有额外的好处。不足 12 个月的触发不计入统计。</p>`;
      U.$('#w1-rows').innerHTML = `<table><thead><tr><th>档位</th><th>前高日期</th><th>触发日</th><th>触发价</th><th>12 月回报</th><th>之后最深再跌</th><th>从触发到回到前高</th></tr></thead><tbody>
        ${A.rows.map(r => `<tr><td>−${r.tier}%</td><td>${r.peak_date}</td><td>${r.date}</td><td>${U.fmtNum(r.price, 2)}</td><td>${r.ret12 == null ? '还不满 12 个月' : U.pct(r.ret12)}</td><td>${r.worse12 == null ? '—' : U.pct(r.worse12)}</td><td>${r.recover == null ? '还没回到' : r.recover + ' 个交易日（约 ' + (r.recover/252).toFixed(1) + ' 年）'}</td></tr>`).join('')}</tbody></table>`;
      U.$('#w1-ex').value = state.explore[key]; explore();
    }
    function explore(){
      const key = state.key, s = U.ser(key), t = state.explore[key];
      U.$('#w1-exv').textContent = '−' + t + '%';
      const A = analyze(s.d, s.v, [t]), sm = summarize(A.rows, [t])[0], b = baseline(key, s.d, s.v);
      U.$('#w1-exout').innerHTML = `<div>独立事件<b>${sm.episodes} 次</b></div><div>满 12 个月的<b>${sm.complete} 次</b></div><div>12 月回报中位数<b>${U.pct(sm.ret_med)}</b></div><div>之后又跌 ≥10%<b>${sm.share_w10 == null ? '—' : (sm.share_w10*100).toFixed(0) + '%'}</b></div><div class="muted">基准中位数<b>${U.pct(b.ret_med)}</b></div>`;
    }
    drawLocked();
  }
  return { render, analyze, baseline, predict: predictBlock };
})();
