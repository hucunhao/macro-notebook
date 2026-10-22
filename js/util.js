// 通用小工具
const U = (() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ts = d => Date.UTC(+d.slice(0,4), +d.slice(5,7)-1, +d.slice(8,10)) / 1000;
  const dstr = t => new Date(t*1000).toISOString().slice(0,10);
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const ser = id => (window.MS && MS.series[id] && MS.series[id].v.length) ? MS.series[id] : null;
  const last = (a) => a[a.length-1];
  // 用“往回数第 n 个观测值”计算变化（5≈1 周，21≈1 月，63≈3 月）
  function stats(s){
    const v = s.v, d = s.d, n = v.length, x = v[n-1];
    const back = k => n > k ? v[n-1-k] : null;
    const oneYrAgo = ts(d[n-1]) - 365*86400;
    let lo = Infinity, hi = -Infinity;
    for (let i = n-1; i >= 0 && ts(d[i]) >= oneYrAgo; i--){ if (v[i] < lo) lo = v[i]; if (v[i] > hi) hi = v[i]; }
    return { last:x, date:d[n-1], prev5:back(5), prev21:back(21), prev63:back(63), lo, hi,
      pos: hi > lo ? (x-lo)/(hi-lo) : null };
  }
  const fmtNum = (x, nd=2) => x == null || isNaN(x) ? '—' : Number(x).toLocaleString('zh-CN', {minimumFractionDigits:nd, maximumFractionDigits:nd});
  const pct = (x, nd=1, sign=true) => x == null || isNaN(x) ? '—' : (sign && x > 0 ? '+' : '') + (x*100).toFixed(nd) + '%';
  const sgn = (x, nd=2, unit='') => x == null || isNaN(x) ? '—' : (x > 0 ? '+' : '') + x.toFixed(nd) + unit;
  const median = a => { const b = [...a].sort((x,y)=>x-y), m = b.length>>1; return b.length ? (b.length%2 ? b[m] : (b[m-1]+b[m])/2) : null; };
  const mean = a => a.length ? a.reduce((s,x)=>s+x,0)/a.length : null;
  const quant = (a, q) => { if(!a.length) return null; const b=[...a].sort((x,y)=>x-y), k=(b.length-1)*q, f=Math.floor(k), c=Math.ceil(k); return f===c?b[f]:b[f]+(b[c]-b[f])*(k-f); };
  const store = {
    get(k, def){ try { const v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch(e){ return def; } },
    set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
  };
  const worst = (...ls) => ls.includes('r') ? 'r' : ls.includes('y') ? 'y' : ls.includes('g') ? 'g' : 'n';
  const lightName = l => ({g:'绿灯', y:'黄灯', r:'红灯', n:'无数据'}[l]);
  // 极简 markdown：# 标题、- 列表、**粗体**、段落
  function md(src){
    const inl = t => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    const out = []; let list = false, para = [];
    const flush = () => { if (para.length){ out.push('<p>' + inl(para.join(' ')) + '</p>'); para = []; } };
    src.split(/\r?\n/).forEach(line => {
      const l = line.trim();
      if (/^#{1,6}\s/.test(l)){ flush(); if (list){ out.push('</ul>'); list = false; } const n = l.match(/^#+/)[0].length; out.push(`<h${Math.min(n+1,4)}>${inl(l.replace(/^#+\s*/, ''))}</h${Math.min(n+1,4)}>`); }
      else if (/^\s*[-*]\s+/.test(line)){ flush(); if (!list){ out.push('<ul>'); list = true; } out.push('<li>' + inl(line.replace(/^\s*[-*]\s+/, '')) + '</li>'); }
      else if (!l){ flush(); if (list){ out.push('</ul>'); list = false; } }
      else { if (list){ out.push('</ul>'); list = false; } para.push(l); }
    });
    flush(); if (list) out.push('</ul>');
    return out.join('');
  }
  // 按需加载大的数据文件（file:// 下也能用 <script>）
  const loading = {};
  function need(...srcs){
    return Promise.all(srcs.map(src => loading[src] || (loading[src] = new Promise((ok, no) => {
      const sc = document.createElement('script'); sc.src = src; sc.onload = ok; sc.onerror = () => { delete loading[src]; no(new Error('加载失败：' + src)); }; document.head.appendChild(sc); }))));
  }
  // 说明小卡片：<span class="ti" tabindex="0">ⓘ<template>…html…</template></span>，鼠标悬停或点击显示
  const info = (html, label='ⓘ') => `<span class="ti" tabindex="0" role="button" aria-label="说明">${label}<template>${html}</template></span>`;
  function initTips(){
    const box = document.createElement('div'); box.id = 'tipbox'; box.setAttribute('role', 'tooltip'); document.body.appendChild(box);
    let cur = null, pinned = false;
    const show = el => { const t = el.querySelector('template'); if (!t) return; cur = el; box.innerHTML = t.innerHTML; box.style.display = 'block';
      const r = el.getBoundingClientRect(), bw = box.offsetWidth, bh = box.offsetHeight;
      let x = r.left + r.width/2 - bw/2, y = r.bottom + 8; x = Math.max(8, Math.min(innerWidth - bw - 8, x)); if (y + bh > innerHeight - 8) y = Math.max(8, r.top - bh - 8);
      box.style.left = x + 'px'; box.style.top = y + 'px'; };
    const hide = () => { box.style.display = 'none'; cur = null; pinned = false; };
    document.addEventListener('mouseover', e => { if (pinned) return; const el = e.target.closest && e.target.closest('.ti'); if (el && el !== cur) show(el); else if (!el && cur && !box.contains(e.target)) hide(); });
    document.addEventListener('click', e => { const el = e.target.closest && e.target.closest('.ti'); if (el){ e.stopPropagation(); e.preventDefault(); if (pinned && cur === el) hide(); else { show(el); pinned = true; } } else if (!box.contains(e.target)) hide(); }, true);
    document.addEventListener('focusin', e => { const el = e.target.closest && e.target.closest('.ti'); if (el) show(el); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') hide(); });
    window.addEventListener('hashchange', hide); window.addEventListener('scroll', () => { if (!pinned) hide(); }, { passive: true });
  }
  // 迷你走势图（canvas）：vals 数组；opts.color、opts.line（参考线数值）、opts.fill
  function spark(cv, vals, opts={}){
    const draw = () => {
      const W = cv.clientWidth || 160, H = cv.clientHeight || 36, dpr = devicePixelRatio || 1; cv.width = W*dpr; cv.height = H*dpr;
      const g = cv.getContext('2d'); g.scale(dpr, dpr); g.clearRect(0, 0, W, H);
      const v = vals.filter(x => x != null && isFinite(x)); if (v.length < 2) return;
      let mn = Math.min(...v), mx = Math.max(...v); (opts.lines || []).forEach(l => { mn = Math.min(mn, l.y); mx = Math.max(mx, l.y); });
      const pad = (mx - mn) * .1 || 1; mn -= pad; mx += pad;
      const X = i => 1 + i / (vals.length - 1) * (W - 6), Y = y => H - 2 - (y - mn) / (mx - mn) * (H - 4);
      (opts.lines || []).forEach(l => { g.strokeStyle = l.color || css('--ink3'); g.lineWidth = 1; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(0, Y(l.y)); g.lineTo(W, Y(l.y)); g.stroke(); g.setLineDash([]); });
      const col = opts.color || css('--accent');
      g.beginPath(); let st = false; vals.forEach((y, i) => { if (y == null) return; st ? g.lineTo(X(i), Y(y)) : g.moveTo(X(i), Y(y)); st = true; });
      g.strokeStyle = col; g.lineWidth = 1.5; g.stroke();
      g.lineTo(X(vals.length - 1), H); g.lineTo(X(0), H); g.closePath(); g.globalAlpha = .12; g.fillStyle = col; g.fill(); g.globalAlpha = 1;
      const li = vals.length - 1; g.fillStyle = col; g.beginPath(); g.arc(X(li), Y(vals[li]), 2.6, 0, 7); g.fill();
    };
    draw(); new ResizeObserver(draw).observe(cv);
  }
  // 数据新鲜度：“数据截至 YYYY-MM-DD”，比核心数据（总览用的美股收盘日 MS.meta.newest）旧就加一个淡淡的“未更新”。
  // o.session = 这块数据最近一次成功抓取时对应的美股交易日（扩展数据才有）；o.partial = 这次没更新、沿用旧数据的条目数
  const STALE_TIP = '这次自动更新没抓到这项数据，显示的是上一次成功抓取的结果';
  const staleTag = (txt='未更新', tip=STALE_TIP) => `<span class="stale-tag" title="${tip}">${txt}</span>`;
  function fresh(asof, o={}){
    const core = window.MS && MS.meta && MS.meta.newest, ref = o.session || asof;
    const old = !!(core && ref && ref < core);
    return `<span class="fresh">数据截至 ${esc(asof || '—')}${old ? staleTag() : o.partial ? staleTag(`${o.partial} 项未更新`, '这几项这次没抓到，沿用上一次的数据（表里标了“未更新”）') : ''}</span>`;
  }
  return { fresh, staleTag, need, info, initTips, spark, md, $, $$, esc, ts, dstr, css, ser, last, stats, fmtNum, pct, sgn, median, mean, quant, store, worst, lightName };
})();
