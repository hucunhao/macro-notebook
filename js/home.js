// 总览（首页）：只放 3 个核心 —— 回撤标尺、信用 63 日变化、10 年美债；上面是传导链
const Home = (() => {
  const C3 = { off: 50, on: 0 }; // 第 3 周预先登记的 C 规则：63 日变化 > +50bp 离场，< 0 回来
  const col = l => U.css({ g:'--g', y:'--y', r:'--r', n:'--n', a:'--accent' }[l] || '--n');
  const fmtP = (x, nd=1) => x == null ? '—' : (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x*100).toFixed(nd) + '%';
  const daysBetween = (a, b) => Math.round((U.ts(b) - U.ts(a)) / 86400);

  // 回撤：用全部历史的最高收盘
  function ddSeries(id){
    const s = U.ser(id); if (!s) return null;
    const dd = new Array(s.v.length), hiIdx = new Array(s.v.length); let m = -Infinity, mi = 0;
    s.v.forEach((v, i) => { if (v > m){ m = v; mi = i; } dd[i] = v/m - 1; hiIdx[i] = mi; });
    const n = s.v.length - 1;
    return { s, dd, hiIdx, last: s.v[n], date: s.d[n], cur: dd[n], high: s.v[hiIdx[n]], highDate: s.d[hiIdx[n]], days: daysBetween(s.d[hiIdx[n]], s.d[n]) };
  }
  // 信用：BAA10Y 的 63 个交易日变化（bp），按周末收盘判断 C 规则的开关（带回差）
  function creditC(){
    const s = U.ser('BAA10Y'); if (!s) return null;
    const ch = s.v.map((v, i) => i >= 63 ? +(v - s.v[i-63]).toFixed(1) : null);
    const wd = d => new Date(U.ts(d)*1000).getUTCDay() || 7;
    let state = 'on', since = null; const bands = []; let b0 = null;
    for (let i = 63; i < s.v.length; i++){
      const end = i === s.v.length - 1 || wd(s.d[i+1]) <= wd(s.d[i]) || daysBetween(s.d[i], s.d[i+1]) >= 7;
      if (!end) continue;
      if (state === 'on' && ch[i] > C3.off){ state = 'off'; since = s.d[i]; b0 = U.ts(s.d[i]); }
      else if (state === 'off' && ch[i] < C3.on){ state = 'on'; since = s.d[i]; bands.push([b0, U.ts(s.d[i])]); b0 = null; }
    }
    if (b0 != null) bands.push([b0, U.ts(U.last(s.d))]);
    const n = s.v.length - 1;
    return { s, ch, state, since, bands, now: ch[n], level: s.v[n], date: s.d[n] };
  }
  function hyChange(){ const s = U.ser('HY_OAS'); if (!s || s.v.length < 22) return null; const n = s.v.length - 1; return { v: s.v[n] - s.v[n-21], level: s.v[n], date: s.d[n] }; }

  // ---------- 顶部行情条 ----------
  function ticker(D){
    const one = id => { const s = U.ser(id); if (!s) return `<div class="tk"><div class="k">${id}</div><div class="v">暂无数据</div></div>`;
      const n = s.v.length - 1, c = s.v[n]/s.v[n-1] - 1; return `<div class="tk" title="${s.name}，截至 ${s.d[n]}"><div class="k">${id}</div><div class="v">${U.fmtNum(s.v[n], 2)}<span class="c ${c >= 0 ? 'pos' : 'neg'}">${fmtP(c, 2)}</span></div></div>`; };
    const dd = (nm, x) => x ? `<div class="tk" title="高点 ${U.fmtNum(x.high,2)}（${x.highDate}）"><div class="k">${nm} 距高点</div><div class="v"><span class="${x.cur < -0.0005 ? 'neg' : ''}">${fmtP(x.cur)}</span><span class="c" style="color:var(--ink3)">${x.days} 天 · 高点 ${x.highDate}</span></div></div>` : '';
    const lv = (k, id, f) => { const s = U.ser(id); if (!s) return ''; const n = s.v.length - 1; return `<div class="tk" title="${s.name}，截至 ${s.d[n]}"><div class="k">${k}</div><div class="v">${f(s.v[n])}</div></div>`; };
    return `<div class="ticker">${one('SPY')}${one('QQQ')}${one('IWM')}${dd('标普', D.spx)}${dd('纳指100', D.ndx)}
      ${lv('10 年美债', 'UST10', v => v.toFixed(2) + '%')}${lv('BAA 利差', 'BAA10Y', v => v.toFixed(0) + 'bp')}${lv('VIX', 'VIX', v => v.toFixed(1))}
      <div class="tk" title="涨跌家数需要全市场每只股票的数据，没有免费可靠的历史来源"><div class="k">涨跌家数比</div><div class="v" style="color:var(--ink3);font-size:12px">暂无数据</div></div>
      <div class="tk"><div class="k">数据截至</div><div class="v" style="font-size:12.5px">${MS.meta.newest}</div></div></div>`;
  }

  // ---------- 传导链 ----------
  function flowSVG(N){
    const W = 800, nodeY = 112, nh = 96, nw = 168, xs = [8, 214, 420, 624];
    const node = (k, x, y, w, h, n) => `<g class="node" data-node="${k}" tabindex="0" role="button" aria-label="${n.t}：点开看图">
        ${n.l === 'y' || n.l === 'r' ? `<rect class="pulse" x="${x-4}" y="${y-4}" width="${w+8}" height="${h+8}" rx="6" fill="none" stroke="${col(n.l)}" stroke-width="5"/>` : ''}
        <rect class="box" x="${x}" y="${y}" width="${w}" height="${h}" rx="4" stroke="${col(n.l)}"/>
        <circle cx="${x+w-12}" cy="${y+13}" r="5" fill="${col(n.l)}"/>
        <text class="nt" x="${x+10}" y="${y+19}">${n.t}</text>
        <text class="nv" x="${x+10}" y="${y+46}" ${n.small ? 'style="font-size:15px"' : ''}>${n.v}</text>
        ${n.s.map((t, i) => `<text class="ns" x="${x+10}" y="${y+64+i*14}">${t}</text>`).join('')}
      </g>`;
    const edge = (x1, x2, l, lab) => `<path class="edge ${l === 'r' ? 'fast' : l === 'g' ? 'slow' : ''}" d="M${x1},${nodeY+nh/2} L${x2-8},${nodeY+nh/2}" stroke="${col(l)}"/>
        <path d="M${x2-9},${nodeY+nh/2-5} L${x2-1},${nodeY+nh/2} L${x2-9},${nodeY+nh/2+5}" fill="${col(l)}"/>
        <text class="elabel" x="${(x1+x2)/2}" y="${nodeY+nh+22}" text-anchor="middle">${lab}</text>`;
    const k = ['rates','credit','equity','tiers'];
    return `<svg viewBox="0 0 ${W} 250" role="img" aria-label="利率到信用到股市跌幅到加仓档位的传导链">
      <path class="edge ${N.rates.l === 'r' ? 'fast' : N.rates.l === 'g' ? 'slow' : ''}" d="M${xs[0]+nw/2},${nodeY} C${xs[0]+nw/2},40 ${xs[2]+nw/2},40 ${xs[2]+nw/2},${nodeY-8}" stroke="${col(N.rates.l)}"/>
      <path d="M${xs[2]+nw/2-5},${nodeY-9} L${xs[2]+nw/2},${nodeY-1} L${xs[2]+nw/2+5},${nodeY-9}" fill="${col(N.rates.l)}"/>
      <text class="elabel" x="${(xs[0]+xs[2]+nw)/2}" y="52" text-anchor="middle">2022 式：利率直接压估值，信用没有报警</text>
      ${edge(xs[0]+nw, xs[1], N.rates.l, '利率高 → 估值受压、融资变贵')}
      ${edge(xs[1]+nw, xs[2], N.credit.l, '利差快速走阔 → 盈利预期变差')}
      ${edge(xs[2]+nw, xs[3], N.equity.l, '跌到档位 → 按规则加仓')}
      <path class="edge ${N.pre.l === 'r' ? 'fast' : N.pre.l === 'g' ? 'slow' : ''}" d="M${xs[3]+nw/2},${4+72} L${xs[3]+nw/2},${nodeY-8}" stroke="${col(N.pre.l)}"/>
      <path d="M${xs[3]+nw/2-5},${nodeY-9} L${xs[3]+nw/2},${nodeY-1} L${xs[3]+nw/2+5},${nodeY-9}" fill="${col(N.pre.l)}"/>
      ${node('pre', xs[3], 4, nw, 72, N.pre).replace(`y="${4+46}"`, `y="${4+42}"`).replace(`y="${4+64}"`, `y="${4+62}"`)}
      ${k.map((key, i) => node(key, xs[i], nodeY, nw, nh, N[key])).join('')}
    </svg>`;
  }
  function nodes(C, D, CR, T){
    const r10 = U.ser('UST10'), r10v = r10 ? U.last(r10.v) : null;
    const hy = hyChange();
    const creditL = CR ? U.worst(C.R.credit, CR.state === 'off' ? 'r' : 'g') : C.R.credit;
    const tierHit = x => x ? x.tiers.filter(t => -x.cur*100 >= t).length : 0;
    const hs = tierHit(D.spx), hn = tierHit(D.ndx), hit = Math.max(hs, hn);
    const eqL = hit >= 2 ? 'r' : hit === 1 ? 'y' : 'g';
    const next = (x, nm) => { if (!x) return `${nm} 暂无数据`; const t = x.tiers.find(t => -x.cur*100 < t); return t == null ? `${nm} 三档都已触发` : `${nm} 距第 ${x.tiers.indexOf(t)+1} 档 ${(t + x.cur*100).toFixed(1)} 点`; };
    return {
      rates: { t:'利率 · 10 年美债', l: C.R.rates, v: r10v == null ? '暂无数据' : r10v.toFixed(2) + '%', s: [`参考线 ${T.r10_line}% / 红线 ${T.r10_red}%`, HEUR] },
      credit: { t:'信用 · BAA 利差', l: creditL, v: CR ? `${U.sgn(CR.now, 0, 'bp')}` : '暂无数据', s: [CR ? `63 日变化；C 规则：${CR.state === 'off' ? '离场' : '在场'}` : '', hy ? `HY 利差 1 月 ${U.sgn(hy.v, 0, 'bp')}（近期补充）` : 'HY 利差：暂无数据'] },
      equity: { t:'股市 · 距历史高点', l: eqL, small: true, v: `${fmtP(D.spx && D.spx.cur)} / ${fmtP(D.ndx && D.ndx.cur)}`, s: ['标普 500 / 纳指 100', D.spx ? `标普已 ${D.spx.days} 天没创新高` : ''] },
      tiers: { t:'你的加仓档位', l: hit ? (hit >= 2 ? 'r' : 'y') : 'g', v: hit ? `已到第 ${hit} 档` : '未触发', s: [next(D.spx, '标普'), next(D.ndx, '纳指')] },
      pre: { t:'先行条件', l: C.nLive >= 2 ? 'r' : C.nLive ? 'y' : 'g', v: `${C.nLive} / 4 成立`, s: [C.nLive >= 2 ? '≥ 2 条：每档拆两半、隔 4 周' : '不到 2 条：触发时一次买完'] },
    };
  }

  // ---------- 回撤标尺（canvas） ----------
  const EPIS = [['today','今天'], ['2000-01-01|2003-06-30','2000–02 科网泡沫'], ['2007-07-01|2010-03-31','2007–09 金融危机'], ['2020-01-15|2020-09-30','2020 疫情'],
    ['2021-12-01|2023-12-31','2022 加息'], ['2025-01-15|2025-08-31','2025 年春季下跌'], ['2018-09-01|2019-04-30','2018 年底'], ['1998-06-01|1998-12-31','1998 长期资本'], ['1990-06-01|1991-03-31','1990 海湾战争']];
  function ruler(el, D, T){
    const cv = document.createElement('canvas'); cv.className = 'ruler'; el.appendChild(cv);
    const ctl = document.createElement('div'); ctl.className = 'scrub';
    ctl.innerHTML = `<span>回放</span><select>${EPIS.map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select>
      <button class="btn small" data-play>▶ 播放</button><input type="range" min="0" max="0" value="0" disabled><span class="num" data-date style="min-width:86px">${D.spx ? D.spx.date : ''}</span>`;
    el.appendChild(ctl);
    const sel = U.$('select', ctl), sl = U.$('input', ctl), pb = U.$('[data-play]', ctl), dl = U.$('[data-date]', ctl);
    let win = null, idx = 0, timer = null;
    const S = D.spx, Nn = D.ndx;
    const findIdx = (x, d) => { const a = x.s.d; let lo = 0, hi = a.length - 1; while (lo < hi){ const m = (lo + hi + 1) >> 1; if (a[m] <= d) lo = m; else hi = m - 1; } return lo; };
    function setEp(k){
      stop();
      if (k === 'today'){ win = null; sl.disabled = true; sl.max = 0; dl.textContent = S.date; draw(); return; }
      const [a, b] = k.split('|'); const i0 = findIdx(S, a), i1 = findIdx(S, b);
      win = { i0, i1 }; sl.disabled = false; sl.min = i0; sl.max = i1; idx = i0; sl.value = i0; draw();
    }
    function stop(){ if (timer){ clearInterval(timer); timer = null; pb.textContent = '▶ 播放'; } }
    pb.onclick = () => {
      if (timer){ stop(); return; }
      if (!win){ sel.value = EPIS[2][0]; setEp(sel.value); }
      if (idx >= win.i1) idx = win.i0;
      pb.textContent = '❚❚ 暂停';
      const step = Math.max(1, Math.round((win.i1 - win.i0) / 240));
      timer = setInterval(() => { idx = Math.min(win.i1, idx + step); sl.value = idx; draw(); if (idx >= win.i1) stop(); }, 30);
    };
    sel.onchange = () => setEp(sel.value);
    sl.oninput = () => { stop(); idx = +sl.value; draw(); };
    function draw(){
      const W = el.clientWidth, H = Math.max(180, Math.min(300, (el.clientHeight || 260) - ctl.offsetHeight - 6));
      const dpr = devicePixelRatio || 1; cv.width = W*dpr; cv.height = H*dpr; cv.style.height = H + 'px';
      const g = cv.getContext('2d'); g.scale(dpr, dpr); g.clearRect(0, 0, W, H);
      const ink = U.css('--ink'), ink2 = U.css('--ink2'), ink3 = U.css('--ink3'), line = U.css('--line2'), acc = U.css('--accent'), mono = U.css('--mono') || 'monospace';
      const L = 78, R = W - 14, MAXD = 0.5, X = d => L + Math.min(1, -d/MAXD) * (R - L);
      const date = win ? S.s.d[idx] : S.date;
      dl.textContent = date + (win ? '（回放）' : '');
      const rows = [['标普 500', S, [T.spx_t1, T.spx_t2, T.spx_t3]], ['纳指 100', Nn, [T.ndx_t1, T.ndx_t2, T.ndx_t3]]];
      const rowH = win ? (H - 70) / 2 : H / 2;
      rows.forEach(([nm, x, tiers], r) => {
        if (!x) return;
        const y0 = r*rowH + 22, ty = y0 + 18;
        const i = win ? findIdx(x, date) : x.s.v.length - 1, d = x.dd[i];
        g.font = `600 13px ${U.css('--font')}`; g.fillStyle = ink; g.textAlign = 'left'; g.fillText(nm, 4, ty + 4);
        // 轨道 + 刻度
        g.fillStyle = U.css('--panel2'); g.fillRect(L, ty - 7, R - L, 14);
        g.strokeStyle = line; g.lineWidth = 1; g.strokeRect(L + .5, ty - 6.5, R - L - 1, 13);
        g.font = `10.5px ${mono}`; g.fillStyle = ink3; g.textAlign = 'center';
        for (let p = 0; p <= 50; p += 5){ const xx = X(-p/100); g.fillRect(Math.round(xx), ty + 7, 1, p % 10 ? 3 : 5); if (p % 10 === 0) g.fillText(p ? `−${p}%` : '0', xx, ty + 20); }
        // 已跌部分
        g.fillStyle = U.css('--r-soft'); g.fillRect(L + 1, ty - 6, Math.max(0, X(d) - L - 1), 12);
        // 档位线
        tiers.forEach((t, k) => { const xx = X(-t/100), hitT = -d*100 >= t; g.strokeStyle = hitT ? U.css('--r') : acc; g.lineWidth = 2; g.beginPath(); g.moveTo(xx, ty - 13); g.lineTo(xx, ty + 9); g.stroke();
          g.fillStyle = hitT ? U.css('--r') : acc; g.font = `11px ${U.css('--font')}`; g.fillText(`第${k+1}档 −${t}%`, xx, ty - 16); });
        // 今天的位置（回放时变成虚影）
        if (win){ const xt = X(x.cur); g.strokeStyle = ink3; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(xt, ty - 8); g.lineTo(xt, ty + 8); g.stroke(); g.setLineDash([]); }
        // 当前点
        const xx = X(d), hit = tiers.filter(t => -d*100 >= t).length, cl = hit >= 2 ? U.css('--r') : hit ? U.css('--y') : U.css('--g');
        g.fillStyle = cl; g.beginPath(); g.moveTo(xx, ty - 8); g.lineTo(xx - 6, ty - 17); g.lineTo(xx + 6, ty - 17); g.closePath(); g.fill();
        g.fillRect(xx - 1.5, ty - 8, 3, 16);
        if (-d > MAXD){ g.fillStyle = U.css('--r'); g.font = `11px ${U.css('--font')}`; g.textAlign = 'right'; g.fillText(`超出标尺：${fmtP(d)}`, R, ty - 18); }
        // 文字：回撤、高点、天数、距下一档
        const hiI = x.hiIdx[i], hiD = x.s.d[hiI], hiV = x.s.v[hiI], days = daysBetween(hiD, x.s.d[i]);
        const nt = tiers.find(t => -d*100 < t);
        g.textAlign = 'left'; g.font = `700 15px ${mono}`; g.fillStyle = cl; g.fillText(fmtP(d), 4, ty + 26);
        g.font = `12px ${U.css('--font')}`; g.fillStyle = ink2;
        const txt = `高点 ${U.fmtNum(hiV, 0)}（${hiD}），已 ${days} 天　｜　` + (nt == null ? '三档都已触发' : `距第 ${tiers.indexOf(nt)+1} 档还差 ${(nt + d*100).toFixed(1)} 个百分点（约 ${U.fmtNum(hiV*(1 - nt/100), 0)} 点）`);
        g.fillText(txt, L, ty + 36);
      });
      // 回放：标普回撤小图
      if (win){
        const top = H - 62, h = 52, n = win.i1 - win.i0; let mn = 0; for (let i = win.i0; i <= win.i1; i++) mn = Math.min(mn, S.dd[i]);
        const px = i => L + (i - win.i0) / n * (R - L), py = v => top + (-v / (-mn || 1)) * h;
        g.strokeStyle = U.css('--line'); g.strokeRect(L + .5, top + .5, R - L, h);
        g.fillStyle = ink3; g.font = `11px ${U.css('--font')}`; g.textAlign = 'left'; g.fillText('标普回撤路径', 4, top + 12); g.fillText(`最深 ${fmtP(mn)}`, 4, top + 26);
        [T.spx_t1, T.spx_t2, T.spx_t3].forEach(t => { if (t/100 <= -mn){ g.strokeStyle = acc; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(L, py(-t/100)); g.lineTo(R, py(-t/100)); g.stroke(); g.setLineDash([]); } });
        g.strokeStyle = U.css('--chart2'); g.lineWidth = 1.4; g.beginPath(); for (let i = win.i0; i <= win.i1; i++){ const xx = px(i), yy = py(S.dd[i]); i === win.i0 ? g.moveTo(xx, yy) : g.lineTo(xx, yy); } g.stroke();
        g.strokeStyle = acc; g.lineWidth = 1.5; g.beginPath(); g.moveTo(px(idx), top); g.lineTo(px(idx), top + h); g.stroke();
        g.textAlign = 'left'; g.fillStyle = ink3; g.fillText(S.s.d[win.i0], L + 2, top + h + 11); g.textAlign = 'right'; g.fillText(S.s.d[win.i1], R, top + h + 11);
      }
    }
    new ResizeObserver(() => draw()).observe(el);
    draw();
    return { stop };
  }

  // ---------- 点开节点：放大图 ----------
  function openModal(key, C, D, CR, T){
    const m = document.createElement('div'); m.className = 'modal';
    const titles = { rates:'利率 · 10 年和 2 年美债', credit:'信用 · BAA10Y 63 个交易日变化（C 规则）', equity:'股市 · 距历史高点的回撤', tiers:'你的加仓档位和先行条件', pre:'你的加仓档位和先行条件' };
    m.innerHTML = `<div class="box" role="dialog" aria-label="${titles[key]}"><div class="panel" style="border:none"><div class="ph"><span class="t">${titles[key]}</span><span class="r"><button class="btn small" data-x>关闭（Esc）</button></span></div><div class="pb" id="m-body"></div></div></div>`;
    document.body.appendChild(m);
    const close = () => { m.remove(); document.removeEventListener('keydown', esc); };
    const esc = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', esc);
    m.onclick = e => { if (e.target === m || e.target.dataset.x != null) close(); };
    const b = U.$('#m-body', m);
    if (key === 'rates'){
      b.innerHTML = `<div class="hint">利率打的是估值倍数：同样的盈利，贴现率越高，股票值得越少，长久期的成长股和小盘更受伤。<span class="badge y">${HEUR}</span>：参考线 ${T.r10_line}%、红线 ${T.r10_red}%。</div><div id="m-c1"></div>`;
      const a = U.ser('UST10'), c = U.ser('UST2'); const x = a.d.map(U.ts), m2 = new Map(c.d.map((d, i) => [d, c.v[i]]));
      Charts.line(U.$('#m-c1', b), { x, ys: [a.v, a.d.map(d => m2.get(d) ?? null)], labels: ['10 年', '2 年'], range: '5Y', height: 360,
        hlines: [{ y:T.r10_line, label:`参考线 ${T.r10_line}%`, color:U.css('--y') }, { y:T.r10_red, label:`红线 ${T.r10_red}%` }], fmt: v => v == null ? '—' : v.toFixed(2) + '%' });
    } else if (key === 'credit'){
      b.innerHTML = `<div class="weak">第 3 周结果：C 规则在 2006 年以后（加上 QDII 真实成本）三条标准都过了，但证据弱 —— 1986–2005 年它比一直持有更差，2006 年以后的优势几乎全来自 2008 年一次，2020 和 2022 年都没帮上忙。</div>
        <div class="hint">黄色底 = 按 C 规则处在“离场”的时期（每周五看一次：63 日变化 > +${C3.off}bp 离场，< ${C3.on} 回来）。这是检验用的规则，不是操作指令。</div><div id="m-c1"></div><div class="hint" style="margin-top:6px">BAA10Y 水平（bp）</div><div id="m-c2"></div>`;
      const x = CR.s.d.map(U.ts);
      Charts.line(U.$('#m-c1', b), { x, ys: [CR.ch], labels: ['63 日变化'], range: '10Y', height: 230, xbands: CR.bands,
        hlines: [{ y:C3.off, label:`+${C3.off}bp 离场线` }, { y:0, label:'0 回来线', color:U.css('--g') }], fmt: v => v == null ? '—' : U.sgn(v, 0, 'bp') });
      Charts.line(U.$('#m-c2', b), { x, ys: [CR.s.v], labels: ['BAA10Y'], range: '10Y', height: 150, xbands: CR.bands, fmt: v => v == null ? '—' : v.toFixed(0) + 'bp' });
    } else if (key === 'equity'){
      b.innerHTML = `<div class="hint">从历史最高收盘算起跌了多少。虚线是你的档位（标普 −${T.spx_t1}/−${T.spx_t2}/−${T.spx_t3}%，纳指 −${T.ndx_t1}/−${T.ndx_t2}/−${T.ndx_t3}%）。价格指数，不含分红。</div><div id="m-c1"></div>`;
      const x = D.spx.s.d.map(U.ts), mN = new Map(D.ndx.s.d.map((d, i) => [d, D.ndx.dd[i]]));
      Charts.line(U.$('#m-c1', b), { x, ys: [D.spx.dd.map(v => v*100), D.spx.s.d.map(d => mN.has(d) ? mN.get(d)*100 : null)], labels: ['标普 500', '纳指 100'], range: '10Y', height: 360, maxY: 0,
        hlines: [T.spx_t1, T.spx_t2, T.spx_t3].map(t => ({ y:-t, color:U.css('--accent') })), axisFmt: v => v.toFixed(0) + '%', fmt: v => v == null ? '—' : v.toFixed(1) + '%' });
    } else {
      const names = ['① 信用：HY OAS > 350bp，且 IG OAS 63 个交易日走阔 > 20bp', '② 联储处在加息周期，且核心 CPI 同比比 3 个月前高至少 0.1 个百分点', '③ 原油月均价连续 2 个月同比 > 50%，且最近 20 个交易日创 52 周收盘新高', '④ AI 信用压力在扩散'];
      b.innerHTML = `<div class="${C.nLive >= 2 ? 'split-alert' : 'split-note'}">先行条件成立 ${C.nLive} 条：${C.nLive >= 2 ? '<b>加仓每档拆成两半，间隔 4 周</b>' : '不到 2 条，触发某一档时一次买完这一档'}</div>
        ${names.map((t, i) => { const x = C.trig[i]; const l = x.live == null ? 'n' : x.live ? 'r' : 'g'; return `<div class="trig"><span class="light ${l}"></span><div><b>${t}</b>　${x.live == null ? '暂无数据' : x.live ? '成立' : '不成立'}${x.manual ? ' <span class="tag">手动</span>' : ''}<br><span class="small muted">${x.text}</span></div></div>`; }).join('')}
        <h3>档位</h3><table class="tbl-compact"><thead><tr><th>指数</th><th>现在</th><th>第 1 档</th><th>第 2 档</th><th>第 3 档</th></tr></thead><tbody>
        ${[['标普 500', D.spx, [T.spx_t1, T.spx_t2, T.spx_t3]], ['纳指 100', D.ndx, [T.ndx_t1, T.ndx_t2, T.ndx_t3]]].map(([n, x, ts]) => `<tr><td>${n}</td><td>${fmtP(x.cur)}</td>${ts.map(t => `<td>−${t}%：${-x.cur*100 >= t ? '<b style="color:var(--r)">已触发</b>' : `差 ${(t + x.cur*100).toFixed(1)} 点（${U.fmtNum(x.high*(1 - t/100), 0)}）`}</td>`).join('')}</tr>`).join('')}
        </tbody></table><p class="hint">每一档用掉货币基金的 1/3。你买的场外 QDII 净值会晚一天，还受汇率影响。档位和先行条件都能在“门槛设置”里改。</p>`;
    }
  }

  function render(app){
    const T = Settings.get(), C = Observe.compute(T);
    const D = { spx: ddSeries('SPX'), ndx: ddSeries('NDX') };
    if (D.spx) D.spx.tiers = [T.spx_t1, T.spx_t2, T.spx_t3]; if (D.ndx) D.ndx.tiers = [T.ndx_t1, T.ndx_t2, T.ndx_t3];
    const CR = creditC(), N = nodes(C, D, CR, T), hy = hyChange();
    const vix = U.ser('VIX'), fg = MS.fg;
    app.innerHTML = `${ticker(D)}
      <div class="home-grid">
        <section class="panel flow" id="p-flow"><div class="ph"><span class="t">传导链</span><span class="s">利率 → 信用 → 股市跌幅 → 你的加仓档位　点任意方块看图</span>
          <span class="r"><span class="badge ${C.overall}">市场阶段：${C.stage}</span><span class="badge ${N.pre.l}">先行条件 ${C.nLive}/4</span></span></div>
          <div class="pb">${flowSVG(N)}<div class="hint">颜色用现有门槛：绿 = 平静，黄 = 注意，红 = 警报。箭头流得越快，上游越紧张。${C.one}</div></div></section>
        <section class="panel" id="p-credit"><div class="ph"><span class="t">信用</span><span class="s">BAA10Y 63 个交易日变化</span><span class="r"><span class="badge ${CR && CR.state === 'off' ? 'r' : 'g'}">C 规则：${CR ? (CR.state === 'off' ? '离场' : '在场') : '暂无数据'}</span></span></div>
          <div class="pb">${CR ? `<div class="kv"><span class="big ${CR.now > 0 ? 'neg' : 'pos'}">${U.sgn(CR.now, 0, 'bp')}</span><span>水平 <b>${CR.level.toFixed(0)}bp</b></span><span>离场线 <b>+${C3.off}bp</b></span><span>上次切换 <b>${CR.since || '—'}</b></span>${hy ? `<span>HY 利差 1 月 <b>${U.sgn(hy.v, 0, 'bp')}</b>（${hy.date}，2023 年起才有）</span>` : ''}</div>
            <div class="weak">第 3 周唯一通过的一类规则（C 和 L+C），而且证据弱：只在 2006 年以后过关，优势主要来自 2008 年；2020、2022 年没帮上忙。</div><div id="c-credit"></div>` : '<div class="nodata">暂无数据：BAA10Y 抓取失败</div>'}</div></section>
        <section class="panel" id="p-ruler"><div class="ph"><span class="t">回撤标尺</span><span class="s">离历史高点多远、离你的下一档多远</span><span class="r"><span class="s">可选一段历史行情回放</span></span></div><div class="pb" id="ruler"></div></section>
        <section class="panel" id="p-rates"><div class="ph"><span class="t">利率</span><span class="s">10 年美债</span><span class="r"><span class="badge ${C.R.rates}">${U.lightName(C.R.rates)}</span><span class="badge y">${HEUR}</span></span></div>
          <div class="pb">${(() => { const s = U.ser('UST10'); if (!s) return '<div class="nodata">暂无数据</div>'; const st = U.stats(s); return `<div class="kv"><span class="big">${st.last.toFixed(2)}%</span><span>1 月 <b>${U.sgn(st.last - st.prev21, 2)}</b></span><span>3 月 <b>${U.sgn(st.last - st.prev63, 2)}</b></span><span>参考线 <b>${T.r10_line}%</b> 红线 <b>${T.r10_red}%</b></span><span>截至 ${st.date}</span></div>
            <div class="hint">放在首页是因为 2022 年那种加息熊市，信用规则没报警，只有利率在动。</div><div id="c-rates"></div>`; })()}</div></section>
      </div>
      <div class="layer2">
        <div class="l2"><span class="t">VIX</span><b>${vix ? U.last(vix.v).toFixed(1) : '—'}</b>　第二层：单独当规则用（20 日均值 > 30 离场），第 3 周三条标准没过。</div>
        <div class="l2"><span class="t">恐惧贪婪</span><b>${fg ? fg.score.toFixed(0) : '—'}</b>${fg ? `（${fg.date}）` : ''}　第二层：只有 2020 年起的历史，简单逆向检验没看出比随便哪天买更好。</div>
        <a href="#/cr"><span class="t">CR 信用 →</span>BAA、HY、IG、CCC 利差和 C 规则的全部历史。</a>
        <a href="#/mkt"><span class="t">MKT 市场 →</span>行情、行业、涨跌榜；更多面板在顶部菜单（按 / 键跳转）。</a>
      </div>`;
    U.$$('.flow .node', app).forEach(g => { const f = () => openModal(g.dataset.node, C, D, CR, T); g.addEventListener('click', f); g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); f(); } }); });
    if (D.spx && D.ndx) ruler(U.$('#ruler'), D, T); else U.$('#ruler').innerHTML = '<div class="nodata">暂无数据</div>';
    if (CR) Charts.line(U.$('#c-credit'), { x: CR.s.d.map(U.ts), ys: [CR.ch], labels: ['63 日变化'], range: '3Y', height: 122, xbands: CR.bands,
      hlines: [{ y:C3.off, label:`+${C3.off}bp 离场线` }, { y:0, label:'0 回来线', color:U.css('--g') }], fmt: v => v == null ? '—' : U.sgn(v, 0, 'bp') });
    const s10 = U.ser('UST10');
    if (s10) Charts.line(U.$('#c-rates'), { x: s10.d.map(U.ts), ys: [s10.v], labels: ['10 年美债'], range: '3Y', height: 122,
      hlines: [{ y:T.r10_line, label:`参考线 ${T.r10_line}%`, color:U.css('--y'), include:true }, { y:T.r10_red, label:`红线 ${T.r10_red}%`, include:true }], fmt: v => v == null ? '—' : v.toFixed(2) + '%' });
  }
  function tickerHTML(){ return ticker({ spx: ddSeries('SPX'), ndx: ddSeries('NDX') }); }
  return { render, ddSeries, creditC, tickerHTML, C3 };
})();
