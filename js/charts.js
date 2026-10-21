// 基于 uPlot 的小图表。全部本地绘制，鼠标悬停显示数值。
const Charts = (() => {
  // 区间按钮（终端风格）：1月 3月 6月 今年 1年 3年 5年 10年 全部；另有“对数”开关（数据全为正时才出现）
  const RANGES = [['1M','1月',31],['3M','3月',91],['6M','6月',182],['YTD','今年','ytd'],['1Y','1年',365],['3Y','3年',1096],['5Y','5年',1826],['10Y','10年',3653],['ALL','全部',null]];
  const live = new Set();
  function colors(){ return { c1:U.css('--chart1'), c2:U.css('--chart2'), c3:U.css('--chart3'), c4:U.css('--chart4'), grid:U.css('--grid'), ink:U.css('--ink3'), r:U.css('--r'), y:U.css('--y'), g:U.css('--g'), bg:U.css('--paper') }; }

  // opts: { x:[ts], ys:[[...]], labels:[], colors:[], range:'1Y', ranges:true, height, hlines:[{y,color,label,dash}], bands:[{from,to,color}], points:[{t,y,color}], fmt:(v)=>str, log:false, minY, maxY }
  function line(el, opts){
    el.innerHTML = '';
    const C = colors();
    const holder = document.createElement('div'); el.appendChild(holder);
    let range = opts.range || '1Y', u = null, logOn = !!opts.log;
    let rbar = null;
    if (opts.ranges !== false){
      rbar = document.createElement('div'); rbar.className = 'ranges';
      const x = opts.x, spanD = x.length ? (x[x.length-1] - x[0]) / 86400 : 0;
      RANGES.filter(([k, , d]) => d == null || d === 'ytd' || d <= spanD * 1.02 || k === range).forEach(([k, lbl]) => { const b = document.createElement('button'); b.textContent = lbl; b.dataset.k = k; if (k === range) b.classList.add('on');
        b.onclick = () => { range = k; U.$$('button[data-k]', rbar).forEach(x => x.classList.toggle('on', x.dataset.k === k)); draw(); }; rbar.appendChild(b); });
      const allPos = opts.ys.every(y => y.every(v => v == null || v > 0));
      if (allPos && opts.logToggle !== false){
        const b = document.createElement('button'); b.textContent = '对数'; b.dataset.log = '1'; b.title = '对数刻度：同样的百分比涨跌，在图上一样高'; if (logOn) b.classList.add('on');
        b.style.marginLeft = '6px'; b.onclick = () => { logOn = !logOn; b.classList.toggle('on', logOn); draw(); }; rbar.appendChild(b);
      }
      el.appendChild(rbar);
    }
    const fmt = opts.fmt || (v => v == null ? '—' : U.fmtNum(v, 2));
    function slice(){
      const x = opts.x, n = x.length; const days = (RANGES.find(r => r[0] === range) || [])[2];
      let i0 = 0;
      if (days === 'ytd'){ const y = new Date(x[n-1]*1000).getUTCFullYear(), t0 = Date.UTC(y, 0, 1)/1000; while (i0 < n && x[i0] < t0) i0++; i0 = Math.max(0, i0 - 1); }
      else if (days){ const t0 = x[n-1] - days*86400; while (i0 < n && x[i0] < t0) i0++; }
      return [x.slice(i0), ...opts.ys.map(y => y.slice(i0))];
    }
    function draw(){
      if (u){ u.destroy(); live.delete(u); }
      const data = slice();
      const w = Math.max(240, holder.clientWidth || el.clientWidth || 300);
      const cols = opts.colors || [C.c1, C.c2, C.c3, C.c4];
      const span = data[0].length ? data[0][data[0].length-1] - data[0][0] : 0;
      const H = typeof opts.height === 'function' ? opts.height() : (opts.height || 180);
      u = new uPlot({
        width: w, height: H,
        cursor: { y:false, points:{ size:6 }, drag:{ x:false, y:false } },
        legend: { show: opts.legend !== false, live: true },
        scales: { x:{ time:true }, y:{ distr: logOn ? 3 : 1, log: 2, range: (u, mn, mx) => {
          let a = opts.minY != null ? Math.min(opts.minY, mn) : mn, b = opts.maxY != null ? Math.max(opts.maxY, mx) : mx;
          (opts.hlines||[]).forEach(h => { if (h.include){ a = Math.min(a, h.y); b = Math.max(b, h.y); } });
          if (logOn) return [a*0.95, b*1.05];
          const pad = (b-a)*0.08 || 1; return [a-pad, b+pad]; } } },
        axes: [
          { stroke: C.ink, grid:{ stroke:C.grid, width:1 }, ticks:{ stroke:C.grid }, font:'11px sans-serif',
            values: (u, vals) => vals.map(v => { if (v == null) return ""; const d = new Date(v*1000); return span > 3*365*86400 ? d.getUTCFullYear()+'' : span > 200*86400 ? `${String(d.getUTCFullYear()).slice(2)}/${d.getUTCMonth()+1}` : `${d.getUTCMonth()+1}/${d.getUTCDate()}`; }) },
          { stroke: C.ink, grid:{ stroke:C.grid, width:1 }, ticks:{ stroke:C.grid }, font:'11px sans-serif', size: opts.axisSize || 52,
            values: (u, vals) => vals.map(v => v == null ? "" : opts.axisFmt ? opts.axisFmt(v) : (Math.abs(v) >= 1000 ? Math.round(v).toLocaleString() : +v.toFixed(2))) }
        ],
        series: [
          { label: '日期', value: (u, v) => v == null ? '—' : U.dstr(v) },
          ...opts.ys.map((y, i) => ({ label: (opts.labels||[])[i] || '数值', stroke: cols[i % cols.length], width: (opts.widths||[])[i] || 1.6, spanGaps: true, points:{ show:false },
            value: (u, v) => fmt(v, i) }))
        ],
        hooks: { drawAxes: [u => {
          const ctx = u.ctx; ctx.save(); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
          (opts.xbands||[]).forEach(b => {
            const a = Math.max(b[0], u.scales.x.min), c = Math.min(b[1], u.scales.x.max); if (c <= a) return;
            const x0 = u.valToPos(a, 'x', true), x1 = u.valToPos(c, 'x', true);
            ctx.fillStyle = opts.xbandColor || U.css('--y-soft'); ctx.fillRect(x0, u.bbox.top, Math.max(1, x1 - x0), u.bbox.height);
          });
          (opts.xlines||[]).forEach(l => {
            if (l.t < u.scales.x.min || l.t > u.scales.x.max) return;
            const x = Math.round(u.valToPos(l.t, 'x', true)) + .5;
            ctx.strokeStyle = U.css('--ink3'); ctx.lineWidth = devicePixelRatio; ctx.setLineDash([4*devicePixelRatio, 3*devicePixelRatio]);
            ctx.beginPath(); ctx.moveTo(x, u.bbox.top); ctx.lineTo(x, u.bbox.top + u.bbox.height); ctx.stroke(); ctx.setLineDash([]);
            if (l.label){ ctx.fillStyle = U.css('--ink3'); ctx.font = `${11*devicePixelRatio}px sans-serif`; ctx.fillText(l.label, x + 4*devicePixelRatio, u.bbox.top + 12*devicePixelRatio); }
          });
          (opts.bands||[]).forEach(b => {
            const y1 = u.valToPos(Math.min(b.to, u.scales.y.max), 'y', true), y0 = u.valToPos(Math.max(b.from, u.scales.y.min), 'y', true);
            if (y0 > y1){ ctx.fillStyle = b.color; ctx.fillRect(u.bbox.left, y1, u.bbox.width, y0 - y1); }
          });
          ctx.restore();
        }], draw: [u => {
          const ctx = u.ctx; ctx.save(); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
          (opts.hlines||[]).forEach(h => {
            if (h.y < u.scales.y.min || h.y > u.scales.y.max) return;
            const y = Math.round(u.valToPos(h.y, 'y', true)) + .5;
            ctx.strokeStyle = h.color || C.r; ctx.lineWidth = 1.2 * devicePixelRatio; ctx.setLineDash(h.dash === false ? [] : [5*devicePixelRatio, 4*devicePixelRatio]);
            ctx.beginPath(); ctx.moveTo(u.bbox.left, y); ctx.lineTo(u.bbox.left + u.bbox.width, y); ctx.stroke();
            if (h.label){ ctx.setLineDash([]); ctx.fillStyle = h.color || C.r; ctx.font = `${11*devicePixelRatio}px sans-serif`; ctx.fillText(h.label, u.bbox.left + 4*devicePixelRatio, y - 4*devicePixelRatio); }
          });
          ctx.setLineDash([]);
          (opts.points||[]).forEach(p => {
            if (p.t < u.scales.x.min || p.t > u.scales.x.max) return;
            const x = u.valToPos(p.t, 'x', true), y = u.valToPos(p.y, 'y', true);
            ctx.fillStyle = p.color || C.r; ctx.beginPath(); ctx.arc(x, y, 4*devicePixelRatio, 0, 2*Math.PI); ctx.fill();
            ctx.strokeStyle = C.bg; ctx.lineWidth = 1.5*devicePixelRatio; ctx.stroke();
          });
          ctx.restore();
        }] }
      }, data, holder);
      live.add(u);
      if (opts.onDraw) opts.onDraw(u);
    }
    draw();
    const ro = new ResizeObserver(() => { if (u && Math.abs(u.width - holder.clientWidth) > 8 && holder.clientWidth > 0) u.setSize({ width: Math.max(240, holder.clientWidth), height: typeof opts.height === 'function' ? opts.height() : (opts.height || 180) }); });
    ro.observe(holder);
    return { redraw: draw, setRange: k => { range = k; draw(); }, get u(){ return u; } };
  }
  function fromSeries(s){ return { x: s.d.map(U.ts), y: s.v }; }
  // 进入视野时才画，减少首页一次性绘制几十张图的卡顿
  function lazy(el, fn){
    if (!('IntersectionObserver' in window)) return fn();
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)){ io.disconnect(); fn(); } }, { rootMargin: '300px' });
    io.observe(el);
  }
  return { line, fromSeries, lazy, RANGES };
})();
