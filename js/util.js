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
  return { $, $$, esc, ts, dstr, css, ser, last, stats, fmtNum, pct, sgn, median, mean, quant, store, worst, lightName };
})();
