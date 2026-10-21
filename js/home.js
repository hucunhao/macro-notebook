// 总览（首页）：一句话结论 → 6 张大卡片 → 传导示意 + 加仓标尺。解释都收在 ⓘ 里。
const Home = (() => {
  const C3 = { off: 50, on: 0 }; // 信用利差（BAA−10 年美债）3 个月上升超过 0.5 个百分点 = 快速变紧；回到 3 个月不升 = 结束
  const col = l => U.css({ g:'--g', y:'--y', r:'--r', n:'--n', a:'--accent' }[l] || '--n');
  const fmtP = (x, nd=1) => x == null ? '—' : (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x*100).toFixed(nd) + '%';
  const daysBetween = (a, b) => Math.round((U.ts(b) - U.ts(a)) / 86400);
  const LEVELS = { g:'正常', y:'注意', r:'警报', n:'无数据' };

  // 回撤：用全部历史的最高收盘
  function ddSeries(id){
    const s = U.ser(id); if (!s) return null;
    const dd = new Array(s.v.length), hiIdx = new Array(s.v.length); let m = -Infinity, mi = 0;
    s.v.forEach((v, i) => { if (v > m){ m = v; mi = i; } dd[i] = v/m - 1; hiIdx[i] = mi; });
    const n = s.v.length - 1;
    return { s, dd, hiIdx, last: s.v[n], date: s.d[n], cur: dd[n], high: s.v[hiIdx[n]], highDate: s.d[hiIdx[n]], days: daysBetween(s.d[hiIdx[n]], s.d[n]) };
  }
  // 信用利差 3 个月变化（BAA−10 年美债，bp）；每周最后一个交易日判断是否处在“快速变紧”时期（带回差）
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
  // 再跌多少到某一档：高点×(1−档位) ÷ 现价 − 1
  const needFall = (x, t) => x.high * (1 - t/100) / x.last - 1;
  function nextTier(x){ if (!x) return null; const i = x.tiers.findIndex(t => -x.cur*100 < t); return i < 0 ? { all: true, hit: 3 } : { i, t: x.tiers[i], fall: needFall(x, x.tiers[i]), price: x.high*(1 - x.tiers[i]/100), hit: i }; }
  const TIERW = ['第一档', '第二档', '第三档'];

  // ---------- 顶部行情条 ----------
  function snapItem(id){ const all = window.SNAP ? [...SNAP.indices, ...SNAP.cmdty] : []; return all.find(x => x.id === id); }
  function ticker(){
    const cell = (k, s, nd=2, tip='') => { if (!s || s.v.length < 2) return '';
      const n = s.v.length - 1, c = s.v[n]/s.v[n-1] - 1;
      return `<div class="tk" title="${tip || k}，截至 ${s.d[n]}"><div class="k">${k}</div><div class="v">${U.fmtNum(s.v[n], nd)}<span class="c ${c >= 0 ? 'pos' : 'neg'}">${fmtP(c, 2)}</span></div></div>`; };
    const lv = (k, id, f, tip) => { const s = U.ser(id); if (!s) return ''; const n = s.v.length - 1, d = s.v[n] - s.v[n-1];
      return `<div class="tk" title="${tip}，截至 ${s.d[n]}"><div class="k">${k}</div><div class="v">${f(s.v[n])}<span class="c ${d > 0 ? 'neg' : d < 0 ? 'pos' : ''}">${U.sgn(d*100, 0)}bp</span></div></div>`; };
    const cells = `${cell('标普 500', U.ser('SPX'))}${cell('纳指 100', U.ser('NDX'))}${cell('道琼斯', snapItem('DJIA'))}${cell('恒生', snapItem('HSI'))}${cell('上证', snapItem('SSE'))}${cell('日经 225', snapItem('N225'))}
      ${cell('黄金', snapItem('GOLD'), 1, 'COMEX 黄金期货连续合约')}${cell('原油', snapItem('CL'), 2, 'NYMEX WTI 原油期货连续合约')}${cell('美元指数', snapItem('DXY'), 2)}${cell('美元/人民币', snapItem('USDCNH'), 4, '美元兑离岸人民币')}
      ${lv('10 年美债', 'UST10', v => v.toFixed(2) + '%', '10 年期美国国债收益率；右边是 1 日变化，1bp = 0.01 个百分点')}
      <div class="tk"><div class="k">美股数据截至</div><div class="v" style="font-size:12.5px">${MS.meta.newest}</div></div>`;
    return `<div class="ticker"><div class="track">${cells}<div class="dup" aria-hidden="true">${cells}</div></div></div>`;
  }

  // ---------- 6 张卡片 ----------
  function cards(C, D, T){
    const out = [];
    const ser = U.ser, st = id => ser(id) ? U.stats(ser(id)) : null;
    const tail = (id, n=252, f=v => v) => { const s = ser(id); return s ? s.v.slice(-n).map(f) : []; };
    // 1 利率
    const r = st('UST10');
    out.push({ key:'rates', t:'10 年美债利率', g:'借钱的基准价格', l: C.R.rates, w: { g:'正常', y:'偏高', r:'很高', n:'无数据' }[C.R.rates],
      v: r ? r.last.toFixed(2) + '%' : '—', sub: r ? `1 个月 ${U.sgn(r.last - r.prev21, 2)}` : '',
      say: { g:'对股价压力不大', y:'股票估值受压', r:'估值压力很大', n:'' }[C.R.rates], spark: tail('UST10'), lines: [{ y:T.r10_line, color:U.css('--y') }],
      tip: `<b>10 年期美国国债收益率</b>：美国政府借 10 年钱要付的年利率，几乎所有资产都拿它当“无风险回报”的基准。<br><br>为什么影响股票：股票值多少钱 = 未来利润折算到今天。利率越高，折算得越狠，同样的利润就值得越少；离今天越远的利润（成长股）受伤越大。2022 年美股下跌主要就是这个原因。<br><br>颜色：低于 ${T.r10_line}% 正常，${T.r10_line}–${T.r10_red}% 偏高，高于 ${T.r10_red}% 很高。<span class="warnt">这两条线是经验值，还没用数据检验。</span><br>图：过去 1 年，虚线是 ${T.r10_line}%。` });
    // 2 信用
    const h = st('HY_OAS');
    out.push({ key:'credit', t:'信用利差', g:'企业借钱的额外成本', l: C.R.credit, w: { g:'正常', y:'偏紧', r:'警报', n:'无数据' }[C.R.credit],
      v: h ? (h.last/100).toFixed(2) + '%' : '—', sub: h ? `1 个月 ${U.sgn((h.last - h.prev21)/100, 2)}` : '',
      say: { g:'企业借钱顺畅', y:'利差在变大，留意', r:'利差急升，信用出问题', n:'' }[C.R.credit], spark: tail('HY_OAS', 252, v => v/100),
      tip: `<b>高收益债利差（HY OAS）</b>：信用评级较低的美国公司借钱，比同期限国债每年多付的利息。数字越大，说明借钱的人越难、越贵。<br><br>为什么看它：公司借不到钱，就得砍投资、裁员，最后盈利下滑。利差常常比经济数据更早变坏（Gilchrist 和 Zakrajšek 2012 年的研究）。<b>看速度比看高低更重要</b>：一个月内快速变大才是警报。<br><br>颜色：高于 ${(T.hy_line/100).toFixed(2)}% 或 1 个月上升超过 ${(T.hy_speed_y/100).toFixed(2)} 个百分点为“偏紧”，高于 ${(T.hy_red/100).toFixed(2)}% 或 1 个月上升超过 ${(T.hy_speed_r/100).toFixed(2)} 个百分点为“警报”；最弱的 CCC 级也一起看。<span class="warnt">速度门槛是经验值，还没用数据检验。</span><br>注意：免费数据只有最近 3 年。` });
    // 3 股市距高点
    const ns = nextTier(D.spx), nn = nextTier(D.ndx), hit = Math.max(ns ? ns.hit : 0, nn ? nn.hit : 0);
    const closest = [['标普', ns], ['纳指', nn]].filter(x => x[1] && !x[1].all).sort((a, b) => b[1].fall - a[1].fall)[0];
    out.push({ key:'equity', t:'股市距历史高点', g:'从最高点跌了多少', l: hit >= 2 ? 'r' : hit ? 'y' : 'g', w: hit ? `到${TIERW[hit-1]}` : '未到加仓线',
      v: fmtP(D.spx && D.spx.cur), vsub: `纳指 ${fmtP(D.ndx && D.ndx.cur)}`, sub: '标普 500',
      say: closest ? `${closest[0]}再跌 ${fmtP(-closest[1].fall).replace('+', '')} 到${TIERW[closest[1].i]}` : '三档都已触发', spark: D.spx ? D.spx.dd.slice(-252).map(v => v*100) : [], lines: [{ y:-T.spx_t1, color:U.css('--accent') }],
      tip: `<b>回撤</b>：现在的收盘价比历史最高收盘低了多少（价格指数，不含分红）。<br><br>你的加仓线：标普 500 跌 ${T.spx_t1}% / ${T.spx_t2}% / ${T.spx_t3}%，纳指 100 跌 ${T.ndx_t1}% / ${T.ndx_t2}% / ${T.ndx_t3}%，各加一档。<span class="warnt">档位是经验值，还没用数据检验。</span><br><br>“再跌 X% 到第一档”是按现在的价格算的：从现价再跌这么多，就碰到加仓线。<br>标普高点 ${D.spx ? U.fmtNum(D.spx.high, 0) + '（' + D.spx.highDate + '）' : '—'}；纳指高点 ${D.ndx ? U.fmtNum(D.ndx.high, 0) + '（' + D.ndx.highDate + '）' : '—'}。<br>图：标普过去 1 年的回撤，虚线是第一档。` });
    // 4 VIX
    const vx = st('VIX'), vl = !vx ? 'n' : vx.last > T.vix_panic ? 'r' : vx.last > 20 ? 'y' : vx.last < T.vix_calm ? 'y' : 'g';
    out.push({ key:'vix', t:'VIX 波动率指数', g:'市场的紧张程度', l: vl, w: !vx ? '无数据' : vx.last > T.vix_panic ? '恐慌' : vx.last > 20 ? '紧张' : vx.last < T.vix_calm ? '过于放松' : '平静',
      v: vx ? vx.last.toFixed(1) : '—', sub: vx ? `1 个月前 ${vx.prev21.toFixed(1)}` : '',
      say: !vx ? '' : vx.last > T.vix_panic ? '大家在花钱买保险' : vx.last > 20 ? '波动比平时大' : vx.last < T.vix_calm ? '大家很放心，容易麻痹' : '波动在正常范围', spark: tail('VIX'), lines: [{ y:T.vix_panic, color:U.css('--r') }],
      tip: `<b>VIX</b>：用标普 500 期权价格算出的“市场预计未来 30 天会晃多大”，常被叫作恐慌指数。长期平均大约 19–20。<br><br>颜色：低于 ${T.vix_calm} 过于放松（黄），${T.vix_calm}–20 平静，20–${T.vix_panic} 紧张，高于 ${T.vix_panic} 恐慌。<span class="warnt">分界线是经验值，还没用数据检验。</span><br><br>注意：恐慌时常是好买点，但前提是信用没出问题；2008 年 VIX 冲到 80，在 30 以上待了好几个月。<br>图：过去 1 年，虚线是 ${T.vix_panic}。` });
    // 5 恐惧贪婪
    const f = MS.fg, RATING = { 'extreme fear':'极度恐惧', 'fear':'恐惧', 'neutral':'中性', 'greed':'贪婪', 'extreme greed':'极度贪婪' };
    const fl = !f ? 'n' : f.score < T.fg_fear || f.score > T.fg_greed ? 'y' : 'g';
    out.push({ key:'fg', t:'恐惧贪婪指数', g:'大家是怕还是贪', l: fl, w: f ? (RATING[f.rating] || f.rating) : '无数据',
      v: f ? f.score.toFixed(0) : '—', sub: f ? `${f.date} · 1 周前 ${f.previous_1_week.toFixed(0)}` : '',
      say: !f ? '' : f.score < T.fg_fear ? '极度恐惧，单看它不能当买点' : f.score > T.fg_greed ? '极度贪婪，别追高' : f.score < 45 ? '偏谨慎' : f.score > 55 ? '偏乐观' : '不冷不热', spark: U.ser('FG') ? U.ser('FG').v.slice(-252) : [], lines: [{ y:25, color:U.css('--g') }, { y:75, color:U.css('--r') }],
      tip: `<b>CNN 恐惧贪婪指数</b>（0–100）：把 7 个市场指标（动能、新高新低、成交量广度、期权多空比、VIX、避险需求、垃圾债需求）合成一个分数。它不是问卷，更像“最近市场走得怎样”的温度计。<br><br>低于 ${T.fg_fear} 极度恐惧，高于 ${T.fg_greed} 极度贪婪。<br><br>注意：历史只从 2020 年开始，简单的“恐惧时买”检验没有看出明显比随便哪天买更好。CNN 只接受浏览器请求，所以这里<b>不自动更新</b>，数值停在 ${f ? f.date : '—'}。` });
    // 6 收益率曲线
    const cv = st('T10Y2Y'), cl = !cv ? 'n' : cv.last < 0 ? 'y' : 'g';
    out.push({ key:'curve', t:'收益率曲线', g:'长短期利率差', l: cl, w: !cv ? '无数据' : cv.last < 0 ? '倒挂' : cv.last < 0.25 ? '很平' : '正常',
      v: cv ? U.sgn(cv.last, 2, '%') : '—', sub: '10 年减 2 年',
      say: !cv ? '' : cv.last < 0 ? '短期利率比长期还高' : '长期利率高于短期，正常形态', spark: tail('T10Y2Y', 504), lines: [{ y:0, color:U.css('--ink3') }],
      tip: `<b>10 年减 2 年国债利率</b>：正常时借得越久利息越高，所以是正数。变成负数叫“倒挂”，意思是市场预计未来要降息、经济会变差。<br><br>历史上倒挂常出现在衰退前 6–24 个月，但 2022–2024 年倒挂了两年多，衰退并没有来，所以只能当背景参考。<br>图：过去 2 年，虚线是 0。<br><a href="#/fi">看完整收益率曲线 →</a>` });
    return out;
  }
  function cardHTML(c){
    return `<section class="hcard ${c.l}" data-k="${c.key}"><div class="hc-h"><span class="hc-t">${c.t}</span>${U.info(c.tip)}</div><div class="hc-g">${c.g}</div>
      <div class="hc-m"><span class="hc-v">${c.v}</span><span class="hc-w ${c.l}">${c.w}</span></div>
      <div class="hc-s">${c.vsub ? `<b>${c.vsub}</b>　` : ''}${c.sub}</div><div class="hc-say">${c.say}</div><canvas class="hc-sp"></canvas></section>`;
  }

  // ---------- 一句话结论 ----------
  function verdict(C, D, T){
    const vx = U.ser('VIX') ? U.last(U.ser('VIX').v) : null;
    const mood = vx == null ? '' : vx > T.vix_panic ? '恐慌' : vx > 20 ? '有些紧张' : vx < T.vix_calm ? '很平静（偏乐观）' : '平静';
    const rate = { g:'利率正常', y:'利率偏高', r:'利率很高', n:'' }[C.R.rates];
    const cred = { g:'企业借钱顺畅', y:'信用开始变紧', r:'信用出现压力', n:'' }[C.R.credit];
    const ns = nextTier(D.spx), nn = nextTier(D.ndx);
    let tier = '';
    const hits = [['标普', ns], ['纳指', nn]].filter(x => x[1] && x[1].hit > 0);
    if (hits.length) tier = hits.map(([n, x]) => `${n}已到${TIERW[x.hit-1]}加仓线`).join('，');
    else { const c = [['标普', ns], ['纳指', nn]].filter(x => x[1] && !x[1].all).sort((a, b) => b[1].fall - a[1].fall)[0]; if (c) tier = `距第一档加仓：${c[0]}还要再跌 <b>${Math.abs(c[1].fall*100).toFixed(1)}%</b>`; }
    const l = U.worst(C.R.credit, C.R.rates, vx > T.vix_panic ? 'r' : 'g');
    return { l, html: `今天市场：<b>${mood}</b>，${rate}，${cred}；${tier}` };
  }

  // ---------- 传导示意 ----------
  function flowSVG(N){
    // U 形布局：利率 → 信用 ↓ 股市 → 你的加仓线；另有一条虚线：利率直接压股市（2022 年）
    const W = 600, H = 340, nw = 210, nh = 100, P = { rates:[16,36], credit:[374,36], equity:[374,214], tiers:[16,214] };
    const node = k => { const [x, y] = P[k], n = N[k]; return `<g class="node" data-node="${k}" tabindex="0" role="button" aria-label="${n.t}：点开看图">
        ${n.l === 'y' || n.l === 'r' ? `<rect class="pulse" x="${x-4}" y="${y-4}" width="${nw+8}" height="${nh+8}" rx="7" fill="none" stroke="${col(n.l)}" stroke-width="5"/>` : ''}
        <rect class="box" x="${x}" y="${y}" width="${nw}" height="${nh}" rx="5" stroke="${col(n.l)}"/>
        <text class="nt" x="${x+14}" y="${y+25}">${n.t}</text>
        <text class="nv" x="${x+14}" y="${y+60}">${n.v}</text>
        <text class="nw" x="${x+14}" y="${y+86}" fill="${col(n.l)}">● ${n.w}</text></g>`; };
    const cls = l => l === 'r' ? 'fast' : l === 'g' ? 'slow' : '';
    const arrow = (x, y, dir, c) => { const d = { r:[[-9,-6],[-9,6]], l:[[9,-6],[9,6]], d:[[-6,-9],[6,-9]] }[dir]; return `<path d="M${x+d[0][0]},${y+d[0][1]} L${x},${y} L${x+d[1][0]},${y+d[1][1]}" fill="${c}"/>`; };
    const r = N.rates.l, c = N.credit.l, e = N.equity.l;
    const y1 = 36 + nh/2, y2 = 214 + nh/2, xc = 374 + nw/2;
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="利率、信用、股市跌幅、加仓线之间的简化关系图">
      <path class="edge ${cls(r)}" d="M${16+nw},${y1} L${374-2},${y1}" stroke="${col(r)}"/>${arrow(373, y1, 'r', col(r))}
      <text class="elabel" x="${(16+nw+374)/2}" y="${y1-10}" text-anchor="middle">利率高</text><text class="elabel" x="${(16+nw+374)/2}" y="${y1+18}" text-anchor="middle">估值受压</text>
      <path class="edge ${cls(c)}" d="M${xc},${36+nh} L${xc},${214-2}" stroke="${col(c)}"/>${arrow(xc, 213, 'd', col(c))}
      <text class="elabel" x="${xc+12}" y="${(36+nh+214)/2-4}">借钱变难</text><text class="elabel" x="${xc+12}" y="${(36+nh+214)/2+14}">盈利变差</text>
      <path class="edge ${cls(e)}" d="M${374},${y2} L${16+nw+2},${y2}" stroke="${col(e)}"/>${arrow(16+nw+1, y2, 'l', col(e))}
      <text class="elabel" x="${(16+nw+374)/2}" y="${y2-10}" text-anchor="middle">跌到加仓线</text><text class="elabel" x="${(16+nw+374)/2}" y="${y2+18}" text-anchor="middle">按计划买</text>
      <path class="edge ${cls(r)}" d="M${16+nw/2+30},${36+nh} C${16+nw/2+30},${190} ${300},${150} ${374-2},${214+18}" stroke="${col(r)}" style="opacity:.6"/>
      <text class="elabel" x="24" y="${(36+nh+214)/2-4}">也可能跳过信用</text><text class="elabel" x="24" y="${(36+nh+214)/2+14}">（2022 年）</text>
      ${['rates','credit','equity','tiers'].map(node).join('')}
    </svg>`;
  }
  function nodes(C, D, cs){
    const by = Object.fromEntries(cs.map(c => [c.key, c]));
    const ns = nextTier(D.spx), nn = nextTier(D.ndx), hit = Math.max(ns ? ns.hit : 0, nn ? nn.hit : 0);
    return {
      rates: { t:'利率 · 10 年美债', l: by.rates.l, v: by.rates.v, w: by.rates.w },
      credit: { t:'信用 · 高收益债利差', l: by.credit.l, v: by.credit.v, w: by.credit.w },
      equity: { t:'股市 · 距高点', l: by.equity.l, v: `${fmtP(D.spx && D.spx.cur)} / ${fmtP(D.ndx && D.ndx.cur)}`, w: '标普 / 纳指' },
      tiers: { t:'你的加仓线', l: hit >= 2 ? 'r' : hit ? 'y' : 'g', v: hit ? `${TIERW[hit-1]}` : '未触发', w: hit ? '按计划加仓' : '继续定投' },
    };
  }
  const FLOWTIP = `<b>这是简化示意，不是定律。</b><br><br>有依据的部分：<br>· 利率 → 估值：股票价值 = 未来利润按利率折算到今天，利率越高越不值钱。这是教科书里的贴现原理，2022 年美股下跌主要就是它。<br>· 信用利差常常领先：企业借钱成本上升，往往早于经济和盈利变差（Gilchrist 和 Zakrajšek，2012 年《美国经济评论》）。<br><br>没那么整齐的部分：<br>· 顺序不固定：几样经常同时动，或者跳过某一步（2022 年信用就没报警）。<br>· 我们自己用 1986 年以来的数据检验过“信用利差 3 个月快速上升就减仓”：只在 2006 年以后有效，优势几乎全来自 2008 年一次，证据偏弱。<br><br>颜色：绿 = 正常，黄 = 注意，红 = 警报；箭头流得越快，上游越紧张。点方块看历史图。`;

  // ---------- 加仓标尺（canvas） ----------
  const EPIS = [['today','今天'], ['2000-01-01|2003-06-30','2000–02 科网泡沫'], ['2007-07-01|2010-03-31','2007–09 金融危机'], ['2020-01-15|2020-09-30','2020 疫情'],
    ['2021-12-01|2023-12-31','2022 加息'], ['2025-01-15|2025-08-31','2025 年春季下跌'], ['2018-09-01|2019-04-30','2018 年底'], ['1998-06-01|1998-12-31','1998 长期资本危机'], ['1990-06-01|1991-03-31','1990 海湾战争']];
  function ruler(el, D, T){
    const cv = document.createElement('canvas'); cv.className = 'ruler'; el.appendChild(cv);
    const ctl = document.createElement('div'); ctl.className = 'scrub';
    ctl.innerHTML = `<span>历史回放</span><select aria-label="选一段历史">${EPIS.map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select>
      <button class="btn small" data-play>▶ 播放</button><input type="range" min="0" max="0" value="0" disabled aria-label="回放进度"><span class="num" data-date style="min-width:86px">${D.spx ? D.spx.date : ''}</span>`;
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
      timer = setInterval(() => { if (!cv.isConnected){ stop(); return; } idx = Math.min(win.i1, idx + step); sl.value = idx; draw(); if (idx >= win.i1) stop(); }, 30);
    };
    sel.onchange = () => setEp(sel.value);
    sl.oninput = () => { stop(); idx = +sl.value; draw(); };
    function draw(){
      if (!cv.isConnected) return;
      const W = el.clientWidth, H = Math.max(170, Math.min(360, (el.clientHeight || 260) - ctl.offsetHeight - 8));
      const dpr = devicePixelRatio || 1; cv.width = W*dpr; cv.height = H*dpr; cv.style.height = H + 'px';
      const g = cv.getContext('2d'); g.scale(dpr, dpr); g.clearRect(0, 0, W, H);
      const ink = U.css('--ink'), ink2 = U.css('--ink2'), ink3 = U.css('--ink3'), line = U.css('--line2'), acc = U.css('--accent'), mono = U.css('--mono') || 'monospace', font = U.css('--font');
      const L = 84, R = W - 14, MAXD = 0.5, X = d => L + Math.min(1, -d/MAXD) * (R - L);
      const date = win ? S.s.d[idx] : S.date;
      dl.textContent = date + (win ? '（回放）' : '');
      const rows = [['标普 500', S, [T.spx_t1, T.spx_t2, T.spx_t3]], ['纳指 100', Nn, [T.ndx_t1, T.ndx_t2, T.ndx_t3]]];
      const rowH = win ? (H - 74) / 2 : H / 2;
      rows.forEach(([nm, x, tiers], r) => {
        if (!x) return;
        const y0 = r*rowH + Math.min(30, rowH*.22), ty = y0 + 18;
        const i = win ? findIdx(x, date) : x.s.v.length - 1, d = x.dd[i];
        g.font = `700 14px ${font}`; g.fillStyle = ink; g.textAlign = 'left'; g.fillText(nm, 4, ty + 4);
        g.fillStyle = U.css('--panel2'); g.fillRect(L, ty - 8, R - L, 16);
        g.strokeStyle = line; g.lineWidth = 1; g.strokeRect(L + .5, ty - 7.5, R - L - 1, 15);
        g.font = `11px ${mono}`; g.fillStyle = ink3; g.textAlign = 'center';
        for (let p = 0; p <= 50; p += 5){ const xx = X(-p/100); g.fillRect(Math.round(xx), ty + 8, 1, p % 10 ? 3 : 5); if (p % 10 === 0) g.fillText(p ? `−${p}%` : '0', xx, ty + 22); }
        g.fillStyle = U.css('--r-soft'); g.fillRect(L + 1, ty - 7, Math.max(0, X(d) - L - 1), 14);
        tiers.forEach((t, k) => { const xx = X(-t/100), hitT = -d*100 >= t; g.strokeStyle = hitT ? U.css('--r') : acc; g.lineWidth = 2; g.beginPath(); g.moveTo(xx, ty - 14); g.lineTo(xx, ty + 10); g.stroke();
          g.fillStyle = hitT ? U.css('--r') : acc; g.font = `12px ${font}`; g.fillText((R - L) < 420 ? `−${t}%` : `${TIERW[k]} −${t}%`, xx, ty - 18); });
        if (win){ const xt = X(x.cur); g.strokeStyle = ink3; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(xt, ty - 8); g.lineTo(xt, ty + 8); g.stroke(); g.setLineDash([]); }
        const xx = X(d), hit = tiers.filter(t => -d*100 >= t).length, cl = hit >= 2 ? U.css('--r') : hit ? U.css('--y') : U.css('--g');
        g.fillStyle = cl; g.beginPath(); g.moveTo(xx, ty - 9); g.lineTo(xx - 6, ty - 18); g.lineTo(xx + 6, ty - 18); g.closePath(); g.fill();
        g.fillRect(xx - 1.5, ty - 9, 3, 18);
        if (-d > MAXD){ g.fillStyle = U.css('--r'); g.font = `12px ${font}`; g.textAlign = 'right'; g.fillText(`超出标尺：${fmtP(d)}`, R, ty - 20); }
        const hiI = x.hiIdx[i], hiD = x.s.d[hiI], hiV = x.s.v[hiI], days = daysBetween(hiD, x.s.d[i]);
        const ki = tiers.findIndex(t => -d*100 < t);
        g.textAlign = 'left'; g.font = `700 17px ${mono}`; g.fillStyle = cl; g.fillText(fmtP(d), 4, ty + 28);
        g.font = `13px ${font}`; g.fillStyle = ink2;
        const fall = ki < 0 ? null : hiV*(1 - tiers[ki]/100) / x.s.v[i] - 1;
        const txt = `高点 ${U.fmtNum(hiV, 0)}（${hiD}），已过 ${days} 天　｜　` + (ki < 0 ? '三档都已触发' : `再跌 ${Math.abs(fall*100).toFixed(1)}% 到${TIERW[ki]}（约 ${U.fmtNum(hiV*(1 - tiers[ki]/100), 0)} 点）`);
        g.fillText(txt, L, ty + 40);
      });
      if (win){
        const top = H - 62, h = 50, n = win.i1 - win.i0; let mn = 0; for (let i = win.i0; i <= win.i1; i++) mn = Math.min(mn, S.dd[i]);
        const px = i => L + (i - win.i0) / n * (R - L), py = v => top + (-v / (-mn || 1)) * h;
        g.strokeStyle = U.css('--line'); g.strokeRect(L + .5, top + .5, R - L, h);
        g.fillStyle = ink3; g.font = `11px ${font}`; g.textAlign = 'left'; g.fillText('标普回撤路径', 4, top + 12); g.fillText(`最深 ${fmtP(mn)}`, 4, top + 26);
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

  // ---------- 点开：放大图 ----------
  const WARN_NAMES = ['① 信用：高收益债利差高于 3.5%，而且投资级债利差 3 个月上升超过 0.2 个百分点', '② 美联储还在加息周期，而且核心通胀比 3 个月前更高', '③ 油价连续 2 个月比去年同期涨 50% 以上，而且创 52 周新高', '④ AI 相关公司的借债压力在扩散（你手动判断）'];
  function warnHTML(C){
    return `<div class="${C.nLive >= 2 ? 'split-alert' : 'split-note'}">成立 ${C.nLive} 条：${C.nLive >= 2 ? '<b>每档加仓拆成两半，间隔 4 周买</b>' : '不到 2 条，碰到某一档时一次买完这一档'}</div>
      ${WARN_NAMES.map((t, i) => { const x = C.trig[i]; const l = x.live == null ? 'n' : x.live ? 'r' : 'g'; return `<div class="trig"><span class="light ${l}"></span><div><b>${t}</b>　${x.live == null ? '暂无数据' : x.live ? '成立' : '不成立'}<br><span class="small muted">${x.text}</span></div></div>`; }).join('')}`;
  }
  function openModal(key, C, D, CR, T){
    const m = document.createElement('div'); m.className = 'modal';
    const titles = { rates:'利率 · 10 年和 2 年美债收益率', credit:'信用 · 企业借钱的额外成本', equity:'股市 · 距历史高点的回撤', tiers:'你的加仓线和放慢加仓的预警', vix:'VIX 波动率指数', fg:'恐惧贪婪指数', curve:'收益率曲线 · 10 年减 2 年' };
    m.innerHTML = `<div class="box" role="dialog" aria-label="${titles[key]}"><div class="panel" style="border:none"><div class="ph"><span class="t">${titles[key]}</span><span class="r"><button class="btn small" data-x>关闭（Esc）</button></span></div><div class="pb" id="m-body"></div></div></div>`;
    document.body.appendChild(m);
    const close = () => { m.remove(); document.removeEventListener('keydown', esc); };
    const esc = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', esc);
    m.onclick = e => { if (e.target === m || e.target.dataset.x != null) close(); };
    const b = U.$('#m-body', m);
    const al = (base, id) => { const s = U.ser(id); if (!s) return base.d.map(() => null); const mm = new Map(s.d.map((d, i) => [d, s.v[i]])); return base.d.map(d => mm.get(d) ?? null); };
    if (key === 'rates'){
      b.innerHTML = `<div class="hint">同样的利润，折算利率越高，今天值得越少；成长股和小盘股受伤更大。虚线：${T.r10_line}% 和 ${T.r10_red}%（经验值，还没检验）。</div><div id="m-c1"></div>`;
      const a = U.ser('UST10');
      Charts.line(U.$('#m-c1', b), { x: a.d.map(U.ts), ys: [a.v, al(a, 'UST2')], labels: ['10 年', '2 年'], range: '5Y', height: 360,
        hlines: [{ y:T.r10_line, label:`${T.r10_line}%`, color:U.css('--y') }, { y:T.r10_red, label:`${T.r10_red}%` }], fmt: v => v == null ? '—' : v.toFixed(2) + '%' });
    } else if (key === 'credit'){
      b.innerHTML = `<div class="hint">上图：高收益债、投资级、最弱的 CCC 级利差（%，免费数据只有最近 3 年）。下图：更长的历史，用穆迪 Baa 级公司债减 10 年美债（1986 年起）；黄色底 = 3 个月内上升超过 0.5 个百分点的时期。</div><div id="m-c1"></div><div id="m-c2" style="margin-top:6px"></div>`;
      const hy = U.ser('HY_OAS');
      if (hy) Charts.line(U.$('#m-c1', b), { x: hy.d.map(U.ts), ys: [hy.v.map(v => v/100), al(hy, 'IG_OAS').map(v => v == null ? null : v/100), al(hy, 'CCC_OAS').map(v => v == null ? null : v/100)], labels: ['高收益', '投资级', 'CCC 级'], range: 'ALL', height: 220, fmt: v => v == null ? '—' : v.toFixed(2) + '%' });
      if (CR) Charts.line(U.$('#m-c2', b), { x: CR.s.d.map(U.ts), ys: [CR.s.v.map(v => v/100)], labels: ['Baa − 10 年美债'], range: '10Y', height: 200, xbands: CR.bands, fmt: v => v == null ? '—' : v.toFixed(2) + '%' });
    } else if (key === 'equity'){
      b.innerHTML = `<div class="hint">从历史最高收盘算起跌了多少（价格指数，不含分红）。虚线是标普的三档加仓线 −${T.spx_t1}/−${T.spx_t2}/−${T.spx_t3}%。</div><div id="m-c1"></div>`;
      const x = D.spx.s.d.map(U.ts), mN = new Map(D.ndx.s.d.map((d, i) => [d, D.ndx.dd[i]]));
      Charts.line(U.$('#m-c1', b), { x, ys: [D.spx.dd.map(v => v*100), D.spx.s.d.map(d => mN.has(d) ? mN.get(d)*100 : null)], labels: ['标普 500', '纳指 100'], range: '10Y', height: 360, maxY: 0,
        hlines: [T.spx_t1, T.spx_t2, T.spx_t3].map(t => ({ y:-t, color:U.css('--accent') })), axisFmt: v => v.toFixed(0) + '%', fmt: v => v == null ? '—' : v.toFixed(1) + '%' });
    } else if (key === 'vix' || key === 'fg' || key === 'curve'){
      const id = { vix:'VIX', fg:'FG', curve:'T10Y2Y' }[key], s = U.ser(id);
      const hl = { vix: [{ y:T.vix_panic, label:`${T.vix_panic}` }, { y:20, color:U.css('--y') }], fg: [{ y:25, color:U.css('--g'), label:'25' }, { y:75, label:'75' }], curve: [{ y:0, label:'0（倒挂线）' }] }[key];
      b.innerHTML = `<div id="m-c1"></div>`;
      let bands = [];
      if (key === 'curve'){ let b0 = null; s.v.forEach((v, i) => { if (v < 0 && b0 == null) b0 = U.ts(s.d[i]); if (v >= 0 && b0 != null){ bands.push([b0, U.ts(s.d[i])]); b0 = null; } }); if (b0 != null) bands.push([b0, U.ts(U.last(s.d))]); }
      if (s) Charts.line(U.$('#m-c1', b), { x: s.d.map(U.ts), ys: [s.v], labels: [titles[key]], range: key === 'fg' ? 'ALL' : '10Y', height: 360, hlines: hl, xbands: bands, xbandColor: U.css('--r-soft'), fmt: v => v == null ? '—' : v.toFixed(key === 'curve' ? 2 : 1) });
    } else {
      b.innerHTML = `${warnHTML(C)}<h3>加仓线</h3><table class="tbl-compact"><thead><tr><th>指数</th><th>现在</th><th>第一档</th><th>第二档</th><th>第三档</th></tr></thead><tbody>
        ${[['标普 500', D.spx, [T.spx_t1, T.spx_t2, T.spx_t3]], ['纳指 100', D.ndx, [T.ndx_t1, T.ndx_t2, T.ndx_t3]]].map(([n, x, ts]) => `<tr><td>${n}</td><td>${fmtP(x.cur)}</td>${ts.map(t => `<td>−${t}%：${-x.cur*100 >= t ? '<b style="color:var(--r)">已到</b>' : `再跌 ${Math.abs(needFall(x, t)*100).toFixed(1)}%（${U.fmtNum(x.high*(1 - t/100), 0)}）`}</td>`).join('')}</tr>`).join('')}
        </tbody></table><p class="hint">每一档用掉货币基金的 1/3。你买的 QDII 基金净值会晚一两天，还受汇率和溢价影响。档位和预警条件都能在“门槛设置”里改；这些档位是经验值，还没用数据检验。</p>`;
    }
  }

  function render(app){
    const T = Settings.get(), C = Observe.compute(T);
    const D = { spx: ddSeries('SPX'), ndx: ddSeries('NDX') };
    if (D.spx) D.spx.tiers = [T.spx_t1, T.spx_t2, T.spx_t3]; if (D.ndx) D.ndx.tiers = [T.ndx_t1, T.ndx_t2, T.ndx_t3];
    const CR = creditC(), cs = cards(C, D, T), N = nodes(C, D, cs), V = verdict(C, D, T);
    app.innerHTML = `${ticker()}
      <div class="verdict2 ${V.l}"><span class="light ${V.l}"></span><div class="vt">${V.html}</div>
        <div class="vm">${U.info(`<b>怎么读这一页</b><br>· 最上面一句话是根据下面 6 张卡片自动写的。<br>· 每张卡片：标题是正式名称，旁边小字是它的意思；大数字是最新值；彩色字是状态（绿 = 正常，黄 = 注意，红 = 警报）。<br>· 鼠标放在 ⓘ 上看定义、门槛和注意事项；点卡片看长期历史图。<br>· 所有门槛都能在右上角“门槛设置”里改。<br><br>数据截至美股 ${MS.meta.newest} 收盘，生成于 ${MS.meta.generated}（台北时间）。本页只用于学习和观察，不构成投资建议。`, 'ⓘ 怎么读')}</div></div>
      <div class="hcards">${cs.map(cardHTML).join('')}</div>
      <div class="home-low">
        <section class="panel flow" id="p-flow"><div class="ph"><span class="t">它们怎么互相影响</span><span class="s">点方块看历史图</span>
          <span class="r"><span class="badge y">简化示意，不是定律 ${U.info(FLOWTIP)}</span></span></div>
          <div class="pb">${flowSVG(N)}</div></section>
        <section class="panel" id="p-ruler"><div class="ph"><span class="t">你的加仓线</span><span class="s">离历史高点多远、离下一档多远</span>
          <span class="r"><button class="badge ${C.nLive >= 2 ? 'r' : C.nLive ? 'y' : 'g'} linkish" id="warn-btn">放慢加仓的预警：${C.nLive}/4 条成立</button>${U.info(`<b>放慢加仓的预警</b>：你定的 4 个条件，用来判断这次下跌是不是“慢慢跌很久”的那种。<br>· 不到 2 条成立：碰到某一档时，一次买完这一档。<br>· 2 条或以上成立：每档拆成两半，间隔 4 周买。<br><br>点左边按钮看每一条现在的情况。<span class="warnt">档位和这些条件都是经验值，还没用数据检验。</span>`)}</span></div>
          <div class="pb" id="ruler"></div></section>
      </div>`;
    U.$$('.hcards .hcard', app).forEach((el, i) => { U.spark(U.$('canvas', el), cs[i].spark, { color: col(cs[i].l === 'n' ? 'a' : cs[i].l), lines: cs[i].lines });
      el.onclick = e => { if (e.target.closest('.ti')) return; openModal(cs[i].key, C, D, CR, T); }; el.title = '点开看历史图'; });
    U.$$('.flow .node', app).forEach(g => { const f = () => openModal(g.dataset.node, C, D, CR, T); g.addEventListener('click', f); g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); f(); } }); });
    U.$('#warn-btn').onclick = () => openModal('tiers', C, D, CR, T);
    if (D.spx && D.ndx) ruler(U.$('#ruler'), D, T); else U.$('#ruler').innerHTML = '<div class="nodata">暂无数据</div>';
  }
  function tickerHTML(){ return ticker(); }
  return { render, ddSeries, creditC, tickerHTML, C3, warnHTML, WARN_NAMES };
})();
