// 标普 500 成分股均线宽度。
// 用 data/sp500_hist.js 里每只股票自己的收盘（和 constituents.py 的 50/200 日同一套算法）。
// 只描述涨跌有多广。不进领先触发，不改概率桶。
const Breadth = (() => {
  const WINS = [20, 50, 100, 200];
  const GLOSS = {
    20: '最近 20 个交易日收盘的平均。很短，一天的涨跌就能把它带过去。',
    50: '大约两个半月。看这一波还在不在。',
    100: '大约半年。',
    200: '大约一年。常用来看大趋势还在不在。',
  };

  function avg(pts, k, w){
    let s = 0;
    for (let j = k - w + 1; j <= k; j++) s += pts[j][1];
    return s / w;
  }

  function compute(SP, SPH){
    if (!SP || !SP.rows || !SPH || !SPH.dates || !SPH.h) return null;
    const dates = SPH.dates;
    if (!dates.length) return null;
    const si = dates.length - 1;
    const session = dates[si];
    const prevI = si - 1;
    const prev = prevI >= 0 ? dates[prevI] : null;
    const names = {};
    SP.rows.forEach(r => { names[r.t] = r; });
    const windows = {};
    WINS.forEach(w => { windows[w] = { above: [], below: [], flat: [], short: [], crossUp: [], crossDn: [], noPrev: [] }; });
    const missing = [];
    const dups = [];
    let onSession = 0;
    let staleLast = [];
    SP.rows.forEach(r => {
      if (r.dup) dups.push(r.t);
      const arr = SPH.h[r.t];
      if (!arr){ missing.push(r.t); return; }
      const pts = [];
      for (let i = 0; i < arr.length; i++) if (arr[i] != null) pts.push([i, arr[i]]);
      if (!pts.length || pts[pts.length - 1][0] !== si){
        staleLast.push(r.t);
        return;
      }
      onSession++;
      const k = pts.length - 1;
      WINS.forEach(w => {
        const bucket = windows[w];
        if (k + 1 < w){ bucket.short.push(r.t); return; }
        const ma = avg(pts, k, w);
        const c = pts[k][1];
        if (c > ma) bucket.above.push(r.t);
        else if (c < ma) bucket.below.push(r.t);
        else bucket.flat.push(r.t);
        if (prevI < 0 || arr[prevI] == null || pts[k - 1][0] !== prevI || k < w){
          bucket.noPrev.push(r.t);
          return;
        }
        const ma2 = avg(pts, k - 1, w);
        const c2 = pts[k - 1][1];
        const prevSide = c2 > ma2 ? 1 : c2 < ma2 ? -1 : 0;
        const nowSide = c > ma ? 1 : c < ma ? -1 : 0;
        if (nowSide === 1 && prevSide <= 0) bucket.crossUp.push(r.t);
        else if (nowSide === -1 && prevSide >= 0) bucket.crossDn.push(r.t);
      });
    });
    WINS.forEach(w => Object.values(windows[w]).forEach(a => { if (Array.isArray(a)) a.sort(); }));
    return {
      session, prev, nConst: SP.rows.length, onSession, missing: missing.sort(), staleLast: staleLast.sort(),
      dups: dups.sort(), windows, names, asof: SP.asof, generated: SP.generated,
    };
  }

  function load(){
    if (!window.SP || !SP.rows) return Promise.resolve({ error: '成分股名单还没加载' });
    return U.need('data/sp500_hist.js').then(() => {
      if (!window.SPH) return { error: '个股日线文件是空的' };
      const data = compute(SP, SPH);
      return data ? { data } : { error: '个股日线没有日期' };
    }).catch(() => ({ error: '个股日线加载失败（data/sp500_hist.js）' }));
  }

  function who(names, t){
    const r = names[t];
    const nm = r && r.n ? r.n : '';
    return `<span class="br-name"><b>${U.esc(t)}</b>${nm ? ' ' + U.esc(nm) : ''}</span>`;
  }
  function list(names, arr){
    if (!arr.length) return '<span class="muted">这一天没有</span>';
    return arr.map(t => who(names, t)).join('');
  }
  function pct(n, d){
    if (!d) return '—';
    return (n / d * 100).toFixed(1) + '%';
  }

  function html(B){
    const rows = WINS.map(w => {
      const b = B.windows[w];
      const denom = b.above.length + b.below.length + b.flat.length;
      return `<tr>
        <td>${w} 日<br><span class="muted small">${GLOSS[w]}</span></td>
        <td><b>${b.above.length}</b><br><span class="muted small">${pct(b.above.length, denom)}</span></td>
        <td><b>${b.below.length}</b><br><span class="muted small">${pct(b.below.length, denom)}</span></td>
        <td>${b.flat.length}</td>
        <td>${b.short.length ? b.short.map(t => U.esc(t)).join('、') : '0'}</td>
        <td>${b.crossDn.length}</td>
        <td>${b.crossUp.length}</td>
      </tr>`;
    }).join('');
    const lists = WINS.map(w => {
      const b = B.windows[w];
      const gap = b.noPrev.length ? `<p class="hint">另有 ${b.noPrev.length} 只缺前一交易日或历史刚好不够，不放进「首次」名单。</p>` : '';
      return `<div class="card" style="padding:8px 10px">
        <div class="small"><b>${w} 日均线</b></div>
        <p class="small" style="margin:6px 0 2px">首次跌破（${b.crossDn.length}）</p>
        <div class="br-list">${list(B.names, b.crossDn)}</div>
        <p class="small" style="margin:8px 0 2px">首次突破（${b.crossUp.length}）</p>
        <div class="br-list">${list(B.names, b.crossUp)}</div>
        ${gap}
      </div>`;
    }).join('');
    const miss = B.missing.length ? `没有日线、所以整只没算：${B.missing.map(t => who(B.names, t)).join('、')}。` : '名单里的股票都有日线。';
    const stale = B.staleLast.length ? `最新交易日没有收盘、没有放进上面的只数：${B.staleLast.map(t => U.esc(t)).join('、')}。` : '';
    const dup = B.dups.length ? `两类股票各算一只（${B.dups.map(U.esc).join('、')}），和广度页原来的算法一样。` : '';
    return `<section class="panel" id="audit-breadth">
      <div class="ph"><span class="t">成分股均线</span><span class="s">次要。不改概率桶</span><span class="r"><span class="badge n">不进①–④</span></span></div>
      <div class="pb">
        <p class="small" style="margin-top:0">数的是标普 500 成分股：收盘价在自己的 20 / 50 / 100 / 200 日均线上面，还是下面。均线用这只股票自己的收盘，不是指数的均线。只描述涨跌有多广，不决定概率。</p>
        <p class="hint" style="margin-top:0">名单 ${B.nConst} 只。最新交易日 ${B.session} 有收盘、能拿来数的 ${B.onSession} 只。${miss}${stale}${dup}成分股价格截至 ${U.esc(B.asof || B.session)}（${U.esc(B.generated || '—')}）。<a href="#/br">广度页</a>用的是同一套日线。</p>
        <div class="tablewrap"><table class="tbl-compact">
          <thead><tr><th>均线</th><th>高于</th><th>低于</th><th>正好压线</th><th>历史不够</th><th>首次跌破</th><th>首次突破</th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>
        <p class="hint">高于、低于的百分比，分母是这一天历史够长的股票（高于 + 低于 + 压线），历史不够的不编进去。50 日和 200 日的百分比应和广度页上一条线对得上。</p>
        <p class="small"><b>首次跌破</b>：上一个交易日（${B.prev || '—'}）收盘还在这条均线上，或正好压着，今天收到了线下。<b>首次突破</b>反过来。只列最新这一天新发生的；已经在线下很多天的不在这里。</p>
        <div class="breadth-lists">${lists}</div>
      </div>
    </section>`;
  }

  return { load, compute, html, WINS };
})();
