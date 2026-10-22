// 美股页、利率曲线页、技术页：行业 ETF、收益率曲线、相对强弱工具；做不到的面板写明原因
const Markets = (() => {
  const fmtP = (x, nd=1) => x == null || isNaN(x) ? '—' : (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x*100).toFixed(nd) + '%';
  const hex2rgb = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  function heat(x, scale){ if (x == null || isNaN(x)) return ''; const c = hex2rgb(U.css(x >= 0 ? '--g' : '--r')); const a = Math.min(.55, Math.abs(x) / scale * .55); return `background:rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(2)})`; }
  // 往回找：最后一个 <= 目标日期的位置
  const backIdx = (d, target) => { let lo = 0, hi = d.length - 1; if (d[0] > target) return -1; while (lo < hi){ const m = (lo + hi + 1) >> 1; if (d[m] <= target) lo = m; else hi = m - 1; } return lo; };
  const shift = (iso, days) => U.dstr(U.ts(iso) - days*86400);
  function perf(s){
    const n = s.v.length - 1, ld = s.d[n], x = s.v[n];
    const r = days => { const i = backIdx(s.d, shift(ld, days)); return i >= 0 ? x / s.v[i] - 1 : null; };
    const ytdI = backIdx(s.d, `${+ld.slice(0, 4) - 1}-12-31`);
    const ma = (k, end) => { if (end + 1 < k) return null; let t = 0; for (let i = end - k + 1; i <= end; i++) t += s.v[i]; return t / k; };
    const m200 = ma(200, n), m200b = ma(200, n - 21), m50 = ma(50, n);
    return { last: x, date: ld, d1: x / s.v[n-1] - 1, w1: r(7), m1: r(30), m3: r(91), ytd: ytdI >= 0 ? x / s.v[ytdI] - 1 : null, y1: r(365),
      above200: m200 != null ? x > m200 : null, slope200: m200 != null && m200b != null ? m200 / m200b - 1 : null, above50: m50 != null ? x > m50 : null };
  }
  // ---------- 收益率曲线（canvas，悬停看数） ----------
  function curve(el, K){
    const cols = [U.css('--accent'), U.css('--chart2'), U.css('--chart3'), U.css('--chart4')];
    const on = K.lines.map(() => true);
    el.innerHTML = `<div class="selrow">${K.lines.map((l, i) => `<label><input type="checkbox" data-i="${i}" checked> <span style="color:${cols[i]}">■</span> ${l.name}（${l.date}）</label>`).join('')}</div>
      <canvas class="curve"></canvas><div class="hint">横轴是到期期限（等距排列，不是按时间比例）。悬停看每条线的数值和与最新的差。</div>`;
    const cv = U.$('canvas', el); let hover = null;
    U.$$('input', el).forEach(c => c.onchange = () => { on[+c.dataset.i] = c.checked; draw(); });
    cv.onmousemove = e => { const r = cv.getBoundingClientRect(); hover = e.clientX - r.left; draw(); };
    cv.onmouseleave = () => { hover = null; draw(); };
    function draw(){
      const W = el.clientWidth, H = 290, dpr = devicePixelRatio || 1; cv.width = W*dpr; cv.height = H*dpr; cv.style.height = H + 'px';
      const g = cv.getContext('2d'); g.scale(dpr, dpr);
      const L = 44, R = W - 12, T0 = 10, B = H - 26, n = K.mats.length;
      const vals = K.lines.flatMap((l, i) => on[i] ? l.y.filter(v => v != null) : []);
      let mn = Math.min(...vals), mx = Math.max(...vals); const pad = (mx - mn) * .12 || .2; mn -= pad; mx += pad;
      const X = i => L + i / (n - 1) * (R - L), Y = v => B - (v - mn) / (mx - mn) * (B - T0);
      g.font = `11px ${U.css('--mono')}`; g.fillStyle = U.css('--ink3'); g.strokeStyle = U.css('--grid'); g.lineWidth = 1;
      const step = (mx - mn) > 1.5 ? .5 : .25;
      for (let v = Math.ceil(mn / step) * step; v <= mx; v += step){ const y = Math.round(Y(v)) + .5; g.beginPath(); g.moveTo(L, y); g.lineTo(R, y); g.stroke(); g.textAlign = 'right'; g.fillText(v.toFixed(2), L - 4, y + 4); }
      g.textAlign = 'center'; K.labels.forEach((l, i) => g.fillText(l, X(i), B + 16));
      K.lines.forEach((l, k) => { if (!on[k]) return; g.strokeStyle = cols[k]; g.lineWidth = k === 0 ? 2.4 : 1.5; g.setLineDash(k === 3 ? [5, 4] : []);
        g.beginPath(); let st = false; l.y.forEach((v, i) => { if (v == null) return; st ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v)); st = true; }); g.stroke(); g.setLineDash([]);
        l.y.forEach((v, i) => { if (v == null) return; g.fillStyle = cols[k]; g.beginPath(); g.arc(X(i), Y(v), k === 0 ? 3 : 2, 0, 7); g.fill(); }); });
      if (hover != null){
        const i = Math.max(0, Math.min(n - 1, Math.round((hover - L) / (R - L) * (n - 1)))), x = X(i);
        g.strokeStyle = U.css('--ink3'); g.beginPath(); g.moveTo(x, T0); g.lineTo(x, B); g.stroke();
        const rows = K.lines.map((l, k) => on[k] && l.y[i] != null ? [k, `${l.name} ${l.y[i].toFixed(2)}%${k && K.lines[0].y[i] != null ? `　最新−它 ${U.sgn((K.lines[0].y[i] - l.y[i]) * 100, 0, 'bp')}` : ''}`] : null).filter(Boolean);
        g.font = `12px ${U.css('--font')}`; const bw = Math.max(...rows.map(r => g.measureText(r[1]).width)) + 20, bh = rows.length * 17 + 24;
        let bx = x + 10; if (bx + bw > R) bx = x - 10 - bw;
        g.fillStyle = U.css('--panel2'); g.strokeStyle = U.css('--accent'); g.fillRect(bx, T0, bw, bh); g.strokeRect(bx + .5, T0 + .5, bw, bh);
        g.fillStyle = U.css('--ink'); g.textAlign = 'left'; g.fillText(`${K.labels[i]} 期`, bx + 8, T0 + 16);
        rows.forEach(([k, t], j) => { g.fillStyle = cols[k]; g.fillText(t, bx + 8, T0 + 34 + j * 17); });
      }
    }
    new ResizeObserver(draw).observe(el); draw();
  }
  function yieldTable(K){
    const [now, w, m, y] = K.lines; const bp = (a, b) => a == null || b == null ? '—' : U.sgn((a - b) * 100, 0);
    const cls = (a, b) => a == null || b == null ? '' : a > b ? 'neg' : a < b ? 'pos' : '';
    const rows = K.labels.map((l, i) => `<tr><td>${l}</td><td>${now.y[i] == null ? '—' : now.y[i].toFixed(2)}</td>${[w, m, y].map(o => `<td class="${o ? cls(now.y[i], o.y[i]) : ''}">${o ? bp(now.y[i], o.y[i]) : '—'}</td>`).join('')}</tr>`);
    const sp = (a, b, nm) => { const ia = K.labels.indexOf(a), ib = K.labels.indexOf(b); const f = o => o && o.y[ia] != null && o.y[ib] != null ? o.y[ia] - o.y[ib] : null;
      return `<tr class="base"><td>${nm}</td><td>${f(now) == null ? '—' : U.sgn(f(now) * 100, 0)}bp</td>${[w, m, y].map(o => `<td>${f(now) == null || f(o) == null ? '—' : U.sgn((f(now) - f(o)) * 100, 0)}</td>`).join('')}</tr>`; };
    return `<table class="tbl-compact"><thead><tr><th>期限</th><th>最新 %</th><th>1 周变化</th><th>1 个月变化</th><th>1 年变化</th></tr></thead><tbody>${rows.join('')}${sp('10年', '2年', '10 年 − 2 年')}${sp('10年', '3月', '10 年 − 3 个月')}</tbody></table>
      <div class="hint">变化的单位是 bp（基点，1bp = 0.01 个百分点）。收益率上升标红（对股票估值是压力），下降标绿。最后两行是期限利差，小于 0 叫“倒挂”。</div>`;
  }
  // ---------- 行业 ----------
  function sectors(el, K){
    const list = [K.spy, ...K.sectors].filter(s => s.v.length);
    const P = list.map(s => ({ s, p: perf(s) }));
    let sel = null, rng = '1Y';
    const keys = [['d1','1 日',2],['w1','1 周',4],['m1','1 月',8],['m3','3 月',15],['ytd','今年',25],['y1','1 年',30]];
    let sortK = 'ytd';
    el.innerHTML = `<div class="tablewrap" id="sec-t"></div>
      <div class="selrow" style="margin-top:8px"><span>行业走势（起点 = 0%）</span><span class="ranges" id="sec-r" style="margin:0"></span><span class="hint">点表格里的一行，加粗那条线</span></div><div id="sec-c"></div>`;
    function table(){
      const rows = [...P].sort((a, b) => a.s.id === 'SPY' ? -1 : b.s.id === 'SPY' ? 1 : (b.p[sortK] ?? -9) - (a.p[sortK] ?? -9));
      U.$('#sec-t', el).innerHTML = `<table class="tbl-compact heat"><thead><tr><th>行业</th><th>代码</th><th>收盘</th>${keys.map(([k, n]) => `<th style="cursor:pointer" data-s="${k}">${n}${sortK === k ? ' ▼' : ''}</th>`).join('')}<th>站上 200 日线</th><th>200 日线 1 月斜率</th><th>站上 50 日线</th></tr></thead><tbody>
        ${rows.map(({ s, p }) => `<tr class="click ${s.id === 'SPY' ? 'base' : ''} ${sel === s.id ? 'sel' : ''}" data-id="${s.id}"><td>${s.name}</td><td>${s.id}</td><td>${p.last.toFixed(2)}</td>
          ${keys.map(([k, , sc]) => `<td class="hc" style="${heat(p[k], sc/100)}">${fmtP(p[k])}</td>`).join('')}
          <td>${p.above200 == null ? '—' : p.above200 ? '<span class="pos">是</span>' : '<span class="neg">否</span>'}</td><td class="${p.slope200 > 0 ? 'pos' : p.slope200 < 0 ? 'neg' : ''}">${fmtP(p.slope200, 2)}</td><td>${p.above50 == null ? '—' : p.above50 ? '<span class="pos">是</span>' : '<span class="neg">否</span>'}</td></tr>`).join('')}
        </tbody></table><div class="hint">数据截至 ${P[0].p.date}（${K.sector_source}）。“站上 200 日线”数的是 11 个行业 ETF，不是 500 只成分股，所以只是很粗的广度。通信服务 XLC 2018 年才上市。</div>`;
      U.$$('th[data-s]', el).forEach(th => th.onclick = () => { sortK = th.dataset.s; table(); });
      U.$$('tr[data-id]', el).forEach(tr => tr.onclick = () => { sel = sel === tr.dataset.id ? null : tr.dataset.id; table(); chart(); });
    }
    const RG = [['1M','1月',31],['3M','3月',91],['6M','6月',182],['YTD','今年','ytd'],['1Y','1年',365],['3Y','3年',1096],['5Y','5年',1826],['ALL','全部',null]];
    U.$('#sec-r', el).innerHTML = RG.map(([k, n]) => `<button data-r="${k}" class="${k === rng ? 'on' : ''}">${n}</button>`).join('');
    U.$$('#sec-r button', el).forEach(b => b.onclick = () => { rng = b.dataset.r; U.$$('#sec-r button', el).forEach(x => x.classList.toggle('on', x === b)); chart(); });
    function chart(){
      const base = K.spy.d, ld = U.last(base), d = RG.find(r => r[0] === rng)[2];
      const start = d === 'ytd' ? `${+ld.slice(0, 4) - 1}-12-31` : d ? shift(ld, d) : base[0];
      const i0 = Math.max(0, backIdx(base, start)); const dates = base.slice(i0);
      const ys = list.map(s => { const m = new Map(s.d.map((x, i) => [x, s.v[i]])); let b0 = null; return dates.map(x => { const v = m.get(x); if (v == null) return null; if (b0 == null) b0 = v; return (v / b0 - 1) * 100; }); });
      const pal = ['#e7e5e0', '#ff8a1f', '#4ea4ff', '#3cc46e', '#c792ea', '#f0b93a', '#ff5a4c', '#2ec4b6', '#a3a86b', '#e07aa8', '#8a9bb0', '#b5835a'];
      const light = document.documentElement.getAttribute('data-theme') === 'light';
      Charts.line(U.$('#sec-c', el), { x: dates.map(U.ts), ys, labels: list.map(s => s.id), ranges: false, height: 250,
        colors: pal.map((c, i) => i === 0 && light ? '#2a2824' : c), widths: list.map(s => sel ? (s.id === sel ? 3 : s.id === 'SPY' ? 1.8 : .8) : (s.id === 'SPY' ? 2.2 : 1.2)),
        hlines: [{ y:0, color:U.css('--ink3'), dash:false }], axisFmt: v => v.toFixed(0) + '%', fmt: v => v == null ? '—' : U.sgn(v, 1, '%') });
    }
    table(); chart();
  }
  // ---------- 相对强弱工具 ----------
  function ema(a, k){ const out = new Array(a.length).fill(null), al = 2 / (k + 1); let e = null; a.forEach((v, i) => { if (v == null) return; e = e == null ? v : e + al * (v - e); out[i] = e; }); return out; }
  function sma(a, k){ const out = new Array(a.length).fill(null); let t = 0; a.forEach((v, i) => { t += v; if (i >= k) t -= a[i-k]; if (i >= k - 1) out[i] = t / k; }); return out; }
  function rsTool(el, K){
    const P = pool(K).filter(([id]) => getSer(id));
    const stocks = window.SP ? SP.rows.filter(r => r.hist).map(r => [r.t, r.n]) : [];
    const st = U.store.get('ms_rs2', { a: 'IWM', b: 'SPY' });
    el.innerHTML = `<div class="selrow"><input id="rs-a" list="rs-l" value="${st.a}" size="8" aria-label="代码 A"><span>÷</span><input id="rs-b" list="rs-l" value="${st.b}" size="8" aria-label="代码 B（可留“无”）">
      <datalist id="rs-l"><option value="无">单看价格</option>${P.map(([id, n]) => `<option value="${id}">${n}</option>`).join('')}${stocks.map(([t, n]) => `<option value="${t}">${U.esc(n)}</option>`).join('')}</datalist>
      <button class="btn small primary" id="rs-go">载入</button><button class="btn small" id="rs-sw">交换</button>
      <span class="hint">可以输入指数、ETF、行业 ETF${stocks.length ? '，或标普 500 成分股代码（约 2 年日线）' : ''}。比值上升 = 前者跑赢后者。均线 60 日、200 日；下图 MACD（12, 26, 9）。</span></div>
      <div id="rs-c"></div><div id="rs-m"></div><div class="hint" id="rs-note"></div>`;
    async function ensure(id){ if (getSer(id) || !stocks.some(s => s[0] === id)) return; if (!window.SPH) await new Promise((ok, no) => { const sc = document.createElement('script'); sc.src = 'data/sp500_hist.js'; sc.onload = ok; sc.onerror = no; document.head.appendChild(sc); }); }
    async function draw(){
      st.a = U.$('#rs-a', el).value.trim().toUpperCase(); st.b = U.$('#rs-b', el).value.trim().toUpperCase() || '无'; if (st.b === '无' || st.b === 'NONE') st.b = '无';
      try { await ensure(st.a); if (st.b !== '无') await ensure(st.b); } catch(e){}
      const a = getSer(st.a), b = st.b === '无' ? null : getSer(st.b);
      if (!a || (st.b !== '无' && !b)){ U.$('#rs-c', el).innerHTML = `<div class="nodata">没有这个代码的数据：${U.esc(!a ? st.a : st.b)}。只能用列表里的代码。</div>`; U.$('#rs-m', el).innerHTML = ''; U.$('#rs-note', el).textContent = ''; return; }
      U.store.set('ms_rs2', st);
      const d = [], r = [];
      if (b){ const mb = new Map(b.d.map((x, i) => [x, b.v[i]])); a.d.forEach((x, i) => { const y = mb.get(x); if (y){ d.push(x); r.push(a.v[i] / y); } }); }
      else a.d.forEach((x, i) => { d.push(x); r.push(a.v[i]); });
      if (r.length < 60){ U.$('#rs-c', el).innerHTML = '<div class="nodata">两条序列重叠的日子太少</div>'; U.$('#rs-m', el).innerHTML = ''; return; }
      const m60 = sma(r, 60), m200 = sma(r, 200), e12 = ema(r, 12), e26 = ema(r, 26), macd = r.map((_, i) => (e12[i] - e26[i]) / r[i] * 100), sig = ema(macd, 9), hist = macd.map((v, i) => v - sig[i]);
      const x = d.map(U.ts), n = r.length - 1, nm = b ? `${st.a}÷${st.b}` : st.a;
      Charts.line(U.$('#rs-c', el), { x, ys: [r, m60, m200], labels: [nm, '60 日均线', '200 日均线'], colors: [U.css('--accent'), U.css('--chart2'), U.css('--chart4')], widths: [1.8, 1.2, 1.2], range: '1Y', height: 260, fmt: v => v == null ? '—' : (b ? v.toFixed(4) : U.fmtNum(v, 2)) });
      Charts.line(U.$('#rs-m', el), { x, ys: [macd, sig, hist], labels: ['MACD', '信号线', '柱（差值）'], colors: [U.css('--accent'), U.css('--chart2'), U.css('--ink3')], widths: [1.4, 1.2, 1], range: '1Y', height: 130, logToggle: false,
        hlines: [{ y:0, color:U.css('--ink3'), dash:false }], fmt: v => v == null ? '—' : v.toFixed(3) });
      U.$('#rs-note', el).innerHTML = `最新 ${d[n]}：${b ? '比值' : '价格'} ${b ? r[n].toFixed(4) : U.fmtNum(r[n], 2)}，${m200[n] == null ? '数据不够 200 天' : r[n] > m200[n] ? '在 200 日均线上方' : '在 200 日均线下方'}；1 年变化 ${fmtP(r[n] / r[Math.max(0, backIdx(d, shift(d[n], 365)))] - 1)}。MACD 用百分比形式，方便不同组合对比。两张图的区间按钮各自独立。这只是看图工具，没有检验过任何买卖规则。`;
    }
    U.$('#rs-go', el).onclick = draw;
    U.$$('input', el).forEach(i => i.onkeydown = e => { if (e.key === 'Enter') draw(); });
    U.$('#rs-sw', el).onclick = () => { const a = U.$('#rs-a', el), b = U.$('#rs-b', el); if (b.value === '无') return; [a.value, b.value] = [b.value, a.value]; draw(); };
    draw();
  }
  const panel = (id, t, sub, body, extra='', cls='') => `<section class="panel ${cls}" ${id ? `id="${id}"` : ''}><div class="ph"><span class="t">${t}</span><span class="s">${sub}</span>${extra ? `<span class="r">${extra}</span>` : ''}</div><div class="pb">${body}</div></section>`;
  // 可用序列：指数、ETF、行业 ETF
  function pool(K){
    const base = [['SPX', '标普 500 指数'], ['NDX', '纳指 100 指数'], ['SPY', '标普 500 ETF'], ['QQQ', '纳指 100 ETF'], ['IWM', '小盘 罗素 2000'], ['RSP', '等权标普'], ['GLD', '黄金'], ['TLT', '20 年以上美债'], ['HYG', '高收益债'], ['LQD', '投资级债'], ['EEM', '新兴市场'], ['VGK', '欧洲'], ['FXI', '中国大盘'], ['UUP', '美元'], ['USO', '原油']];
    const sec = (K && K.sectors || []).map(s => [s.id, s.name]);
    return [...base.slice(0, 6), ...sec, ...base.slice(6)];
  }
  function getSer(id){ const K = window.MK; const s = K && (K.sectors.find(x => x.id === id) || (id === 'SPY' ? null : null)); if (s && s.v.length) return s; const m = U.ser(id); if (m) return m; const h = window.SPH && SPH.h[id]; if (!h) return null; const d = [], v = []; h.forEach((x, i) => { if (x != null){ d.push(SPH.dates[i]); v.push(x); } }); return { id, name: id, d, v }; }
  // ---------- MKT ----------
  function mkt(app){
    const K = window.MK;
    app.innerHTML = Home.tickerHTML() + `<div class="mk-grid">
      ${panel('', '价格走势', '选一个看', `<div class="selrow"><select id="px-s">${pool(K).filter(([id]) => getSer(id)).map(([id, n]) => `<option value="${id}">${id} ${n}</option>`).join('')}</select><span class="hint">区间按钮在图下方；“对数”让同样的百分比涨跌一样高。</span></div><div id="px-c"></div>`)}
      ${panel('', '今日涨跌榜', '标普 500 成分股', '<div id="movers"></div>')}
      ${panel('', '行业表现', '标普 11 个行业 SPDR ETF，点表头排序', K && K.sectors.length ? '<div id="mk-sec"></div>' : '<div class="nodata">暂无数据</div>', '', 'full')}
    </div>`;
    const draw = id => { const s = getSer(id); Charts.line(U.$('#px-c'), { x: s.d.map(U.ts), ys: [s.v], labels: [id], range: '1Y', height: 260, fmt: v => v == null ? '—' : U.fmtNum(v, 2) }); };
    U.$('#px-s').onchange = e => draw(e.target.value); draw('SPX');
    movers(U.$('#movers'));
    if (K && K.sectors.length) sectors(U.$('#mk-sec'), K);
  }
  function movers(el){
    const S = window.SP;
    if (!S || !S.rows.length){ el.innerHTML = '<div class="nodata">数据暂不可得：成分股数据还没生成（运行 constituents.py）</div>'; return; }
    let k = 'd1';
    const draw = () => {
      const r = S.rows.filter(x => x[k] != null).sort((a, b) => b[k] - a[k]);
      const tb = (xs) => `<table class="tbl-compact"><tbody>${xs.map(x => `<tr class="click" data-t="${x.t}"><td>${x.t}</td><td style="text-align:left;max-width:140px;overflow:hidden;text-overflow:ellipsis">${U.esc(x.n)}</td><td>${x.px == null ? '—' : x.px.toFixed(2)}</td><td class="${x[k] >= 0 ? 'pos' : 'neg'}">${fmtP(x[k])}</td></tr>`).join('')}</tbody></table>`;
      el.innerHTML = `<div class="selrow">${[['d1', '1 日'], ['w1', '1 周'], ['m1', '1 月'], ['ytd', '今年']].map(([kk, n]) => `<button class="btn small ${kk === k ? 'primary' : ''}" data-mv="${kk}">${n}</button>`).join('')}<span class="hint">${U.fresh(S.asof)}，共 ${S.n} 只</span></div>
        <div class="grid g2" style="margin-top:6px"><div><div class="hint">涨幅最大</div>${tb(r.slice(0, 10))}</div><div><div class="hint">跌幅最大</div>${tb(r.slice(-10).reverse())}</div></div><div class="hint">点一行去“同业比较”。</div>`;
      U.$$('[data-mv]', el).forEach(b => b.onclick = () => { k = b.dataset.mv; draw(); });
      U.$$('tr[data-t]', el).forEach(tr => tr.onclick = () => { location.hash = '#/rv/' + tr.dataset.t; });
    };
    draw();
  }
  // ---------- FI ----------
  function fi(app){
    const K = window.MK;
    const tip = `<b>收益率曲线</b>：把 1 个月到 30 年各种期限的美国国债利率连成一条线。<br>· 正常形态：期限越长利率越高（向右上倾斜），因为钱借得越久风险越大。<br>· 倒挂：短期利率比长期还高，说明市场预计未来要降息、经济会变差。历史上 10 年减 2 年倒挂后 6–24 个月常有衰退，但 2022–2024 年倒挂两年多并没有衰退，所以只能当背景参考。<br>· 短端（3 个月、2 年）主要跟美联储政策走，长端（10 年、30 年）还反映通胀和财政担忧。`;
    app.innerHTML = `<div class="pg-h"><h1>利率曲线</h1><span class="s">美国国债各期限收益率：现在 vs 1 周 / 1 个月 / 1 年前</span>${U.info(tip)}</div><div class="mk-grid">
      ${panel('', '收益率曲线', '勾选要比较的日期', K && K.curve ? '<div id="mk-curve"></div>' : '<div class="nodata">暂无数据</div>')}
      ${panel('', '各期限收益率和变化', K && K.curve ? `最新 ${K.curve.lines[0].date}` : '', K && K.curve ? yieldTable(K.curve) : '<div class="nodata">暂无数据</div>', K && K.curve ? `<a class="s" href="${K.curve.url}" target="_blank" rel="noopener">美国财政部</a>` : '')}
      ${panel('', '倒挂历史', '10 年减 2 年、10 年减 3 个月；红色底 = 10 年减 2 年小于 0（倒挂）的时期', '<div id="fi-s"></div>', '', 'full')}
      ${panel('', '各期限历史走势', '3 个月、2 年、10 年、30 年', '<div id="fi-h"></div>', '', 'full')}
    </div>`;
    if (K && K.curve) curve(U.$('#mk-curve'), K.curve);
    const ids = ['UST3MO', 'UST2', 'UST10', 'UST30'].filter(id => U.ser(id)); const b = U.ser('UST10');
    const al = id => { const m = new Map(U.ser(id).d.map((d, i) => [d, U.ser(id).v[i]])); return b.d.map(d => m.get(d) ?? null); };
    Charts.line(U.$('#fi-h'), { x: b.d.map(U.ts), ys: ids.map(al), labels: ['3 个月', '2 年', '10 年', '30 年'], range: '5Y', height: 230, logToggle: false, fmt: v => v == null ? '—' : v.toFixed(2) + '%' });
    const sp = ['T10Y2Y', 'T10Y3M'].filter(id => U.ser(id)); const s0 = U.ser(sp[0]);
    const al2 = id => { const m = new Map(U.ser(id).d.map((d, i) => [d, U.ser(id).v[i]])); return s0.d.map(d => m.get(d) ?? null); };
    const bands = []; let b0 = null; s0.v.forEach((v, i) => { if (v < 0 && b0 == null) b0 = U.ts(s0.d[i]); if (v >= 0 && b0 != null){ bands.push([b0, U.ts(s0.d[i])]); b0 = null; } }); if (b0 != null) bands.push([b0, U.ts(U.last(s0.d))]);
    Charts.line(U.$('#fi-s'), { x: s0.d.map(U.ts), ys: sp.map(al2), labels: ['10 年 − 2 年', '10 年 − 3 个月'], range: 'ALL', height: 240, xbands: bands, xbandColor: U.css('--r-soft'), hlines: [{ y:0, label:'0（倒挂线）' }], fmt: v => v == null ? '—' : v.toFixed(2) + '%' });
  }
  // ---------- GP 技术 / 相对强弱 ----------
  function gp(app){
    const K = window.MK;
    app.innerHTML = panel('', '技术和相对强弱', '任选两个代码做比值；第二个选“无”就是单看价格', '<div id="mk-rs"></div>');
    rsTool(U.$('#mk-rs'), K);
  }
  return { mkt, fi, gp, perf, panel, pool, getSer, fmtP, heat };
})();
