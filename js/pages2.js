// 第二层页面：CR 信用、VAL 估值、HM 热力图、BR 广度、RV 同业比较
const Pages2 = (() => {
  const { panel, fmtP, heat } = Markets;
  const noSP = '<div class="nodata">数据暂不可得：标普 500 成分股数据还没生成（运行 constituents.py）。</div>';
  const fx = (x, nd=1) => x == null || !isFinite(x) ? '—' : x.toFixed(nd);
  const fpct = (x, nd=1) => x == null || !isFinite(x) ? '—' : (x*100).toFixed(nd) + '%';
  const fcap = x => x == null ? '—' : x >= 1e12 ? (x/1e12).toFixed(2) + ' 万亿' : (x/1e9).toFixed(1) + ' 十亿';
  const med = a => { const b = a.filter(x => x != null && isFinite(x)); return b.length ? U.median(b) : null; };

  // ---------- CR ----------
  function cr(app){
    const CR = Home.creditC(), T = Settings.get();
    const ids = [['HY_OAS', '高收益债 HY'], ['BB_OAS', 'BB 级'], ['CCC_OAS', 'CCC 级（最弱）'], ['IG_OAS', '投资级 IG'], ['BAA10Y', 'BAA − 10 年美债']];
    const row = ([id, n]) => { const s = U.ser(id); if (!s) return `<tr><td>${n}</td><td colspan="5">暂无数据</td></tr>`; const t = U.stats(s); const c = (b) => b == null ? '—' : `<span class="${t.last - b > 0 ? 'neg' : t.last - b < 0 ? 'pos' : ''}">${U.sgn(t.last - b, 0)}</span>`;
      return `<tr><td>${n}</td><td>${t.last.toFixed(0)}</td><td>${c(t.prev5)}</td><td>${c(t.prev21)}</td><td>${c(t.prev63)}</td><td>${s.start}</td></tr>`; };
    app.innerHTML = `<div class="mk-grid">
      ${panel('', 'C 规则：BAA10Y 63 个交易日变化', '黄色底 = 规则处在离场期', CR ? `<div class="kv"><span class="big ${CR.now > 0 ? 'neg' : 'pos'}">${U.sgn(CR.now, 0, 'bp')}</span><span>现在：<b>${CR.state === 'off' ? '离场' : '在场'}</b></span><span>上次切换 <b>${CR.since}</b></span><span>离场线 +${Home.C3.off}bp，回来线 ${Home.C3.on}</span></div>
        <div class="weak">第 3 周：C 和 L+C 是唯一在 2006 年以后（含 QDII 真实成本）三条标准都过的规则，但证据弱：1986–2005 年比一直持有差，2006 年以后的优势几乎全来自 2008 年。</div><div id="cr-c"></div>` : '<div class="nodata">暂无数据</div>', '', 'full')}
      ${panel('', '信用利差一览', '单位 bp；走阔（变大）标红', `<table class="tbl-compact"><thead><tr><th>利差</th><th>最新</th><th>1 周</th><th>1 月</th><th>3 月</th><th>数据起点</th></tr></thead><tbody>${ids.map(row).join('')}</tbody></table>
        <div class="hint">HY、IG、CCC、BB 来自 ICE（FRED），FRED 现在只给最近 3 年；长历史只能看 BAA10Y。现有门槛：HY 警戒 ${T.hy_line}bp（你的先行条件①），HY 1 月走阔 ${T.hy_speed_y}/${T.hy_speed_r}bp（${HEUR}）。</div>`)}
      ${panel('', '分层利差走势', '2023 年起', '<div id="cr-oas"></div>')}
      ${panel('', '高收益 ÷ 投资级（HYG÷LQD）', '下降 = 风险偏好收缩', '<div id="cr-r"></div>')}
      ${panel('', 'BAA10Y 水平', '1986 年起', '<div id="cr-l"></div>')}
    </div>`;
    if (CR){
      const x = CR.s.d.map(U.ts);
      Charts.line(U.$('#cr-c'), { x, ys: [CR.ch], labels: ['63 日变化'], range: '10Y', height: 230, xbands: CR.bands, hlines: [{ y:Home.C3.off, label:`+${Home.C3.off}bp 离场线` }, { y:0, label:'0 回来线', color:U.css('--g') }], fmt: v => v == null ? '—' : U.sgn(v, 0, 'bp') });
      Charts.line(U.$('#cr-l'), { x, ys: [CR.s.v], labels: ['BAA10Y'], range: 'ALL', height: 200, xbands: CR.bands, fmt: v => v == null ? '—' : v.toFixed(0) + 'bp' });
    }
    const hy = U.ser('HY_OAS');
    if (hy){ const al = id => { const s = U.ser(id); if (!s) return hy.d.map(() => null); const m = new Map(s.d.map((d, i) => [d, s.v[i]])); return hy.d.map(d => m.get(d) ?? null); };
      Charts.line(U.$('#cr-oas'), { x: hy.d.map(U.ts), ys: ['HY_OAS', 'IG_OAS', 'CCC_OAS'].map(al), labels: ['HY', 'IG', 'CCC'], range: 'ALL', height: 200, fmt: v => v == null ? '—' : v.toFixed(0) + 'bp' }); }
    const r = U.ser('HYG_LQD'); if (r) Charts.line(U.$('#cr-r'), { x: r.d.map(U.ts), ys: [r.v], labels: ['HYG÷LQD'], range: '3Y', height: 200, fmt: v => v == null ? '—' : v.toFixed(4) });
  }

  // ---------- VAL ----------
  function val(app){
    const S = window.SP;
    const sigma = `<div class="nodata" style="text-align:left;padding:12px">数据暂不可得：纳指 100 / 标普 500 市盈率的长期历史（算 1–20 年均值和 ±1σ/2σ 要 20 年以上的月度数据）没有免费、合规的来源。
      Shiller 教授公开的标普周期调整市盈率只更新到 2024 年 6 月；用现在的成分股和 SEC 财报往回拼会有幸存者偏差，而且 SEC 结构化财报 2009 年才开始。所以不做 σ 表，下面只给“今天”的横截面。</div>`;
    if (!S){ app.innerHTML = panel('', 'VAL 估值', '', sigma + noSP); return; }
    const secs = [...new Set(S.rows.map(r => r.sec))];
    const agg = rows => { const ok = rows.filter(r => r.mcap && !r.dup); const sm = ok.reduce((a, r) => a + r.mcap, 0);
      const e = ok.filter(r => r.pe != null || r.nm != null); // 有净利润数据的
      const ni = ok.reduce((a, r) => a + (r.pe ? r.mcap / r.pe : 0), 0);
      const rev = ok.reduce((a, r) => a + (r.ps ? r.mcap / r.ps : 0), 0), mcRev = ok.filter(r => r.ps).reduce((a, r) => a + r.mcap, 0);
      return { n: rows.length, mcap: sm, pe: ni ? ok.filter(r => r.pe).reduce((a, r) => a + r.mcap, 0) / ni : null, fpe: med(rows.map(r => r.fpe)), pem: med(rows.map(r => r.pe)), ps: rev ? mcRev / rev : null, pb: med(rows.map(r => r.pb)), g: med(rows.map(r => r.g)) }; };
    const all = agg(S.rows), tr = (n, a, cls='') => `<tr class="${cls}"><td>${n}</td><td>${a.n}</td><td>${fcap(a.mcap)}</td><td>${fx(a.pe)}</td><td>${fx(a.pem)}</td><td>${fx(a.fpe)}</td><td>${fx(a.ps, 2)}</td><td>${fx(a.pb, 2)}</td><td>${fpct(a.g)}</td></tr>`;
    app.innerHTML = `<div class="mk-grid">
      ${panel('', '估值 σ 表', '历史均值 ±1σ / 2σ（1–20 年窗口）', sigma, '<span class="badge n">数据暂不可得</span>', 'full')}
      ${panel('', '今天的估值横截面', `标普 500 成分股，按 GICS 行业，截至 ${S.asof}（同一公司的两类股票只算一次）`, `<table class="tbl-compact"><thead><tr><th>行业</th><th>公司数</th><th>合计市值（美元）</th><th>合计市盈率</th><th>市盈率中位数</th><th>前瞻市盈率中位数</th><th>合计市销率</th><th>市净率中位数</th><th>隐含增长中位数</th></tr></thead><tbody>
        ${tr('标普 500 全部', all, 'base')}${secs.map(s => [s, agg(S.rows.filter(r => r.sec === s))]).sort((a, b) => b[1].mcap - a[1].mcap).map(([s, a]) => tr(s, a)).join('')}</tbody></table>
        <div class="hint">合计市盈率 = 合计市值 ÷ 合计净利润（只算净利润为正的公司）。${S.notes.fund} ${S.notes.pe} 这些数是“今天一个时点”，不能说明现在比历史贵还是便宜。</div>`, '', 'full')}
    </div>`;
  }

  // ---------- HM 热力图（方块面积 = 市值，颜色 = 涨跌） ----------
  function squarify(items, x, y, w, h){
    const out = []; const total = items.reduce((a, b) => a + b.v, 0); if (!total) return out;
    const scale = w*h/total; let rest = items.filter(i => i.v > 0).map(i => ({ ...i, a: i.v*scale }));
    while (rest.length){
      const short = Math.min(w, h); let row = [], best = Infinity;
      for (const it of rest){ const r2 = [...row, it], s = r2.reduce((a, b) => a + b.a, 0), mx = Math.max(...r2.map(r => r.a)), mn = Math.min(...r2.map(r => r.a));
        const worst = Math.max(short*short*mx/(s*s), s*s/(short*short*mn)); if (!row.length || worst <= best){ best = worst; row = r2; } else break; }
      const s = row.reduce((a, b) => a + b.a, 0), thick = s / short; let off = 0;
      row.forEach(r => { const len = r.a / thick; if (w >= h) out.push({ ...r, x, y: y + off, w: thick, h: len }); else out.push({ ...r, x: x + off, y, w: len, h: thick }); off += len; });
      if (w >= h){ x += thick; w -= thick; } else { y += thick; h -= thick; }
      rest = rest.slice(row.length);
    }
    return out;
  }
  function hm(app){
    const S = window.SP; if (!S){ app.innerHTML = panel('', 'HM 热力图', '', noSP); return; }
    let k = 'd1';
    app.innerHTML = panel('', '标普 500 热力图', `方块大小 = 市值，颜色 = 涨跌；截至 ${S.asof}`, `<div class="selrow">${[['d1', '1 日', .03], ['w1', '1 周', .06], ['m1', '1 月', .1], ['ytd', '今年', .3]].map(([kk, n]) => `<button class="btn small ${kk === k ? 'primary' : ''}" data-k="${kk}">${n}</button>`).join('')}<span class="hint">悬停看数，点方块去 RV 同业比较。</span></div><canvas id="hm-c" style="width:100%;display:block;margin-top:6px"></canvas><div class="hint">${S.notes.src}。没有市值或价格的公司不画；同一家公司的第二类股票（如 GOOG、FOX、NWS）不重复画。</div>`);
    const cv = U.$('#hm-c'); let rects = [], hover = null;
    const scaleOf = { d1: .03, w1: .06, m1: .1, ytd: .3 };
    function draw(){
      if (!cv.isConnected) return;
      const W = cv.parentElement.clientWidth, H = Math.max(420, Math.min(720, innerHeight - 190)), dpr = devicePixelRatio || 1;
      cv.width = W*dpr; cv.height = H*dpr; cv.style.height = H + 'px'; const g = cv.getContext('2d'); g.scale(dpr, dpr); g.clearRect(0, 0, W, H);
      const rows = S.rows.filter(r => r.mcap && r[k] != null && !r.dup);
      const secs = Object.entries(rows.reduce((a, r) => { (a[r.sec] = a[r.sec] || []).push(r); return a; }, {})).map(([s, rs]) => ({ s, rs: rs.sort((a, b) => b.mcap - a.mcap), v: rs.reduce((a, r) => a + r.mcap, 0) })).sort((a, b) => b.v - a.v);
      rects = [];
      const G = U.css('--g'), R = U.css('--r');
      squarify(secs, 0, 0, W, H).forEach(sr => {
        const pad = 1, top = 15;
        g.fillStyle = U.css('--panel2'); g.fillRect(sr.x, sr.y, sr.w, sr.h);
        g.fillStyle = U.css('--accent'); g.font = `600 11px ${U.css('--font')}`; g.textAlign = 'left'; if (sr.w > 40) g.fillText(sr.s, sr.x + 3, sr.y + 11);
        squarify(sr.rs.map(r => ({ ...r, v: r.mcap })), sr.x + pad, sr.y + top, Math.max(1, sr.w - 2*pad), Math.max(1, sr.h - top - pad)).forEach(c => {
          const x = c[k], a = Math.min(1, Math.abs(x) / scaleOf[k]); const base = x >= 0 ? G : R; const rgb = base.match(/\w\w/g).map(h => parseInt(h, 16)); const bg = U.css('--paper').match(/\w\w/g).map(h => parseInt(h, 16));
          const mix = rgb.map((v, i) => Math.round(bg[i] + (v - bg[i]) * (.25 + .75*a)));
          g.fillStyle = `rgb(${mix.join(',')})`; g.fillRect(c.x + .5, c.y + .5, Math.max(0, c.w - 1), Math.max(0, c.h - 1));
          if (hover && hover.t === c.t){ g.strokeStyle = U.css('--accent'); g.lineWidth = 2; g.strokeRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2); }
          if (c.w > 34 && c.h > 22){ g.fillStyle = '#fff'; g.textAlign = 'center'; const fs = Math.max(9, Math.min(16, Math.sqrt(c.w*c.h)/6)); g.font = `700 ${fs}px ${U.css('--mono')}`; g.fillText(c.t, c.x + c.w/2, c.y + c.h/2); if (c.h > fs*2.4){ g.font = `${fs*.75}px ${U.css('--mono')}`; g.fillText(fmtP(x), c.x + c.w/2, c.y + c.h/2 + fs*.95); } }
          rects.push(c);
        });
      });
      if (hover){
        const c = hover, lines = [`${c.t}  ${c.n}`, `${c.sec} · ${c.sub}`, `市值 ${fcap(c.mcap)} 美元`, `涨跌 ${fmtP(c[k])}　收盘 ${c.px == null ? '—' : c.px.toFixed(2)}`];
        g.font = `12px ${U.css('--font')}`; const bw = Math.max(...lines.map(l => g.measureText(l).width)) + 16, bh = lines.length*17 + 8;
        let bx = hover.mx + 12, by = hover.my + 12; if (bx + bw > W) bx = hover.mx - bw - 12; if (by + bh > H) by = hover.my - bh - 12;
        g.fillStyle = U.css('--panel2'); g.strokeStyle = U.css('--accent'); g.lineWidth = 1; g.fillRect(bx, by, bw, bh); g.strokeRect(bx + .5, by + .5, bw, bh);
        g.fillStyle = U.css('--ink'); g.textAlign = 'left'; lines.forEach((l, i) => g.fillText(l, bx + 8, by + 18 + i*17));
      }
    }
    const at = e => { const r = cv.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top; const c = rects.find(c => mx >= c.x && mx <= c.x + c.w && my >= c.y && my <= c.y + c.h); return c ? { ...c, mx, my } : null; };
    cv.onmousemove = e => { hover = at(e); draw(); }; cv.onmouseleave = () => { hover = null; draw(); };
    cv.onclick = e => { const c = at(e); if (c) location.hash = '#/rv/' + c.t; };
    U.$$('[data-k]').forEach(b => b.onclick = () => { k = b.dataset.k; U.$$('[data-k]').forEach(x => x.classList.toggle('primary', x === b)); draw(); });
    new ResizeObserver(() => draw()).observe(cv.parentElement); draw();
  }

  // ---------- BR 广度 ----------
  function br(app){
    const S = window.SP; if (!S || !S.breadth.d.length){ app.innerHTML = panel('', 'BR 广度', '', noSP); return; }
    const B = S.breadth, n = B.d.length - 1;
    const secs = Object.entries(S.rows.reduce((a, r) => { (a[r.sec] = a[r.sec] || []).push(r); return a; }, {}));
    const pc = (rs, f) => { const ok = rs.filter(r => r[f] != null); return ok.length ? ok.filter(r => r[f]).length / ok.length : null; };
    const row = (nm, rs, cls='') => `<tr class="${cls}"><td>${nm}</td><td>${rs.length}</td><td style="${heat(pc(rs, 'a200') - .5, .5)}">${fpct(pc(rs, 'a200'), 0)}</td><td style="${heat(pc(rs, 'a50') - .5, .5)}">${fpct(pc(rs, 'a50'), 0)}</td><td>${rs.filter(r => r.hi52).length}</td><td>${rs.filter(r => r.lo52).length}</td></tr>`;
    app.innerHTML = `<div class="mk-grid">
      ${panel('', '标普 500 站上均线的比例', `截至 ${B.d[n]}：200 日线 ${B.p200[n]}%，50 日线 ${B.p50[n]}%`, `<div id="br-c"></div><div class="hint">${S.notes.surv} 只有约 ${Math.round(B.d.length/21)} 个月的历史（每只股票下载约 2 年日线，前 200 天用来算均线）。原来常说的“>70% 过热、极低时常见大底”是经验说法，这里没有检验。</div>`, '', 'full')}
      ${panel('', '各行业广度', '颜色：比例高于 50% 偏绿、低于 50% 偏红', `<table class="tbl-compact"><thead><tr><th>行业</th><th>公司数</th><th>站上 200 日线</th><th>站上 50 日线</th><th>52 周新高</th><th>52 周新低</th></tr></thead><tbody>${row('标普 500 全部', S.rows, 'base')}${secs.sort((a, b) => b[1].length - a[1].length).map(([s, rs]) => row(s, rs)).join('')}</tbody></table>`, '', 'full')}
    </div>`;
    Charts.line(U.$('#br-c'), { x: B.d.map(U.ts), ys: [B.p200, B.p50], labels: ['站上 200 日线 %', '站上 50 日线 %'], range: 'ALL', height: 260, minY: 0, maxY: 100, logToggle: false,
      hlines: [{ y:70, label:'70%', color:U.css('--y') }, { y:30, label:'30%', color:U.css('--y') }], fmt: v => v == null ? '—' : v.toFixed(1) + '%' });
  }

  // ---------- RV 同业比较 ----------
  function rv(app, t0){
    const S = window.SP; if (!S){ app.innerHTML = panel('', 'RV 同业比较', '', noSP); return; }
    const by = Object.fromEntries(S.rows.map(r => [r.t, r]));
    app.innerHTML = panel('', '同业比较', `同一 GICS 子行业的标普 500 公司；财报来自 SEC，价格截至 ${S.asof}`,
      `<div class="selrow"><input id="rv-t" list="rv-l" value="${U.esc(t0 || U.store.get('ms_rv', 'AAPL'))}" size="8" aria-label="股票代码"><datalist id="rv-l">${S.rows.map(r => `<option value="${r.t}">${U.esc(r.n)}</option>`).join('')}</datalist>
        <button class="btn small primary" id="rv-go">载入</button><span class="hint">只能查标普 500 成分股（预先下载好的，不是实时）。</span></div><div id="rv-out" class="tablewrap" style="margin-top:6px"></div>
        <div class="hint">${S.notes.fund} ${S.notes.pe} EV（企业价值）= 市值 + 有息负债 − 现金；EBITDA = 营业利润 + 折旧摊销。银行、保险的毛利率、EV 类指标通常没有意义，显示为“—”。</div>`);
    const cols = [['mcap', '市值', fcap], ['pe', '市盈率', fx], ['fpe', '前瞻市盈率', fx], ['peg', 'PEG', x => fx(x, 2)], ['ev_ebitda', 'EV/EBITDA', fx], ['ev_sales', 'EV/销售额', x => fx(x, 2)], ['ps', '市销率', x => fx(x, 2)], ['pb', '市净率', x => fx(x, 2)],
      ['gm', '毛利率', fpct], ['om', '营业利润率', fpct], ['nm', '净利率', fpct], ['roe', 'ROE', fpct], ['g', '隐含增长', fpct]];
    function load(){
      const t = U.$('#rv-t').value.trim().toUpperCase(), me = by[t], out = U.$('#rv-out');
      if (!me){ out.innerHTML = `<div class="nodata">数据暂不可得：${U.esc(t)} 不在预先下载的标普 500 名单里。</div>`; return; }
      U.store.set('ms_rv', t); if (location.hash !== '#/rv/' + t) history.replaceState(null, '', '#/rv/' + t);
      let peers = S.rows.filter(r => r.sub === me.sub), scope = `GICS 子行业：${me.sub}（${me.sec}）`;
      if (peers.length < 4){ peers = S.rows.filter(r => r.sec === me.sec).sort((a, b) => (b.mcap || 0) - (a.mcap || 0)).slice(0, 12); if (!peers.includes(me)) peers.push(me); scope = `子行业 ${me.sub} 只有 ${S.rows.filter(r => r.sub === me.sub).length} 家，改用同一行业（${me.sec}）市值最大的 12 家`; }
      peers.sort((a, b) => (b.mcap || 0) - (a.mcap || 0));
      out.innerHTML = `<div class="hint" style="margin-bottom:4px">${scope}，共 ${peers.length} 家</div><table class="tbl-compact"><thead><tr><th>代码</th><th style="text-align:left">名称</th>${cols.map(c => `<th>${c[1]}</th>`).join('')}<th>财年截至</th></tr></thead><tbody>
        ${peers.map(r => `<tr class="click ${r.t === t ? 'sel' : ''}" data-t="${r.t}"><td><b>${r.t}</b></td><td style="text-align:left;max-width:180px;overflow:hidden;text-overflow:ellipsis">${U.esc(r.n)}</td>${cols.map(([k, , f]) => `<td>${f(r[k])}</td>`).join('')}<td>${r.fy_end || '—'}</td></tr>`).join('')}
        <tr class="base"><td>中位数</td><td></td>${cols.map(([k, , f]) => `<td>${f(med(peers.map(r => r[k])))}</td>`).join('')}<td></td></tr></tbody></table>`;
      U.$$('tr[data-t]', out).forEach(tr => tr.onclick = () => { U.$('#rv-t').value = tr.dataset.t; load(); });
    }
    U.$('#rv-go').onclick = load; U.$('#rv-t').onkeydown = e => { if (e.key === 'Enter') load(); };
    load();
  }
  return { cr, val, hm, br, rv };
})();
