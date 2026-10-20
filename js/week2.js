// 第 2 周：信用利差 z 分数（周度）
const Week2 = (() => {
  // 只用过去的数据：窗口 = 第 i 周之前的 w 周，不含第 i 周
  function rollingZ(v, w){
    const n = v.length, z = new Array(n).fill(null), pr = new Array(n).fill(null);
    for (let i = 0; i < n; i++){
      const lo = w == null ? 0 : i - w; if (lo < 0 || i - lo < 52) continue;
      let s = 0, s2 = 0; for (let k = lo; k < i; k++){ s += v[k]; s2 += v[k]*v[k]; }
      const m = s/(i-lo), sd = Math.sqrt(Math.max(0, s2/(i-lo) - m*m));
      z[i] = sd > 0 ? (v[i]-m)/sd : null;
      let c = 0; for (let k = lo; k < i; k++) if (v[k] < v[i]) c++; pr[i] = c/(i-lo)*100;
    }
    return { z, pr };
  }
  const NAMES = { BAA10Y:'Baa 公司债 − 10 年美债（BAA10Y）', HY_OAS:'高收益债利差 HY OAS', IG_OAS:'投资级利差 IG OAS', CCC_OAS:'CCC 级利差' };
  const fz = x => x == null ? '—' : (x > 0 ? '+' : '') + x.toFixed(2);
  const fp = x => x == null ? '—' : x.toFixed(0) + '%';
  const zone = z => z == null ? '—' : z > 2 ? '接近危机' : z > 1 ? '有压力' : z < -1 ? '偏紧 / 自满' : '正常';

  const Q = [
    { id:'w2q1', q:'现在高收益债利差大约 331bp。你觉得它和过去 3 年比，算偏紧、正常还是偏宽？和过去几十年比呢？',
      ans: () => { const h = W2.HY_OAS, b = W2.BAA10Y, i = h.d.length-1, j = b.d.length-1;
        return `HY OAS ${h.v[i].toFixed(0)}bp（${h.d[i]}），对比过去 3 年：z = <b>${fz(h.z3[i])}</b>，比过去 3 年里 ${fp(h.p3[i])} 的周都高，算“${zone(h.z3[i])}”偏宽一点。HY OAS 在 FRED 上只有 3 年数据，没法跟几十年比，所以用它的表亲 BAA10Y：现在 ${b.v[j].toFixed(0)}bp，对比 1986 年以来的全部过去：z = <b>${fz(b.ze[j])}</b>，只比 ${fp(b.pe[j])} 的周高，属于“${zone(b.ze[j])}”。<b>同一个“今天”，换个窗口结论就变了</b>，这正是这周要学的。`; } },
    { id:'w2q2', q:'如果算平均值时把整段历史（包括“未来”的数据）都用上，2007 年那时的读数，会比当时真实看到的更吓人，还是更不吓人？',
      ans: () => { const c = W2.compare, a = c.find(x => x.month === '2007-06'), b = c.find(x => x.month === '2008-11');
        const diff = a.zla - a.ze; const word = Math.abs(diff) < 0.2 ? '<b>差不多</b>' : diff > 0 ? '<b>更吓人</b>' : '<b>更不吓人</b>';
        return `2007 年 6 月：当时能算出的诚实 z = ${fz(a.ze)}，偷看全历史的 z = ${fz(a.zla)}，两者${word}（都显示利差偏紧，没有报警）。差别大的是 2008 年 11 月：诚实 z = ${fz(b.ze)}，偷看 z = ${fz(b.zla)}。偷看版本把 2008 年以后的高利差也算进平均数和标准差，标准差被撑大，危机就显得“没那么极端”。所以结论不是固定的“更吓人”或“更不吓人”，而是<b>偷看会悄悄改变读数</b>，你没法提前知道往哪边改。`; } },
  ];

  let state = { key:'BAA10Y', win:260 };
  function render(app){
    const T = Settings.get();
    const hy = U.ser('HY_OAS'), baa = U.ser('BAA10Y');
    app.insertAdjacentHTML('beforeend', `
      <h1>第 2 周　信用利差 z 分数：你的“总开关”现在算紧还是松</h1>
      <div class="card"><b>这周要回答的问题</b>：今天的信用利差，跟它自己的过去比，算不算特别紧或特别宽？换不同的比较窗口、或者偷偷用了未来数据，读数会怎么变？
      <p class="small muted" style="margin-bottom:0">数据：HY OAS 和 IG OAS 来自 FRED，<b>只有 ${hy ? hy.start : '—'} 到 ${hy ? hy.end : '—'}</b>（FRED 从 2026 年 4 月起只提供最近 3 年）。长历史用 BAA10Y（穆迪 Baa 级公司债收益率 − 10 年美债，${baa.start} 到 ${baa.end}），它是 HY OAS 的“表亲”，不是同一条序列。全部用每周最后一个交易日的值。</p></div>`);
    const lockArea = document.createElement('div');
    app.appendChild(Week1.predict(Q, ok => { lockArea.dataset.ok = ok ? '1' : ''; drawLocked(); }));
    app.insertAdjacentHTML('beforeend', `
      <div class="grid g2" style="margin-top:14px">
        <div class="card concept"><h3>概念：标准差 = 通常离平均有多远</h3>
          <p>5 周的利差：300、350、400、450、500。平均 = 400。</p>
          <p>每个离平均的距离：100、50、0、50、100。把距离平方后求平均：(10000 + 2500 + 0 + 2500 + 10000) ÷ 5 = 5000，再开根号 ≈ <b>71</b>。这就是标准差：一周的利差通常离平均 71 左右。</p>
          <div class="calc"><label>改成你的数字 <input type="text" id="sd-in" value="300,350,400,450,500" style="width:200px;border:1px solid var(--line2);border-radius:6px;padding:3px 6px;background:var(--bg)"></label></div>
          <p id="sd-out" style="margin:6px 0 0"></p>
        </div>
        <div class="card concept"><h3>概念：z 分数 = 离平均几个标准差</h3>
          <p>z = （今天 − 平均）÷ 标准差。</p>
          <p>例子：平均 400bp，标准差 100bp，今天 331bp。z = (331 − 400) ÷ 100 = <b>−0.69</b>，意思是比平均低了 0.69 个“通常距离”。</p>
          <div class="calc"><label>平均 <input type="number" id="z-m" value="400"></label><label>标准差 <input type="number" id="z-s" value="100"></label><label>今天 <input type="number" id="z-x" value="331"></label><span>z = <span class="out" id="z-out">−0.69</span></span></div>
          <p class="small muted" style="margin:8px 0 0">区间（预先定好，只用来描述，不是买卖规则）：z &lt; −1 偏紧 / 自满；−1 到 +1 正常；&gt; +1 有压力；&gt; +2 接近危机。</p>
        </div>
      </div>
      <div class="card concept" style="margin-top:14px"><h3>概念：百分位</h3><p style="margin:0">百分位 = 窗口里有多少比例的周，利差比今天低。比如 78% 表示过去这段时间里 78% 的周比今天低，今天算偏高。它不需要假设数据是“钟形”的，所以和 z 放在一起看更稳。</p></div>
      <h2>你的结果</h2>`);
    app.appendChild(lockArea);
    app.insertAdjacentHTML('beforeend', `
      <div class="card pitfall" style="margin-top:14px"><h3>要小心的坑</h3>
      <ul style="margin:0;padding-left:20px">
        <li><b>偷看未来。</b>用全历史算平均数，会悄悄用上当时还不存在的数据。这一页所有诚实的 z 都只用“上一周及以前”的数据。</li>
        <li><b>窗口会漂移。</b>在长期平静的时期，3 年窗口会把一点点走阔看得很吓人；窗口太长，又可能把真正的变化看成正常。没有哪个窗口是“对的”，所以放在一起看。</li>
        <li><b>肥尾。</b>利差的大跳动比钟形曲线预计的多得多，z = 3 对利差来说绝不是“千分之三才发生一次”。</li>
        <li><b>这一周只做描述。</b>某个 z 门槛能不能预测股市，要到第 3 周用预先定好的规则去检验。</li>
      </ul></div>
      <div class="card interp" style="margin-top:14px" id="w2-interp"></div>`);
    const sdUpd = () => { const a = U.$('#sd-in').value.split(/[,，\s]+/).map(Number).filter(x => !isNaN(x) && x !== 0 || x === 0); if (a.length < 2){ U.$('#sd-out').textContent = '至少输入 2 个数'; return; }
      const m = U.mean(a), d = a.map(x => Math.abs(x - m)), sd = Math.sqrt(U.mean(a.map(x => (x-m)**2)));
      U.$('#sd-out').innerHTML = `平均 ${+m.toFixed(2)}；距离 ${d.map(x => +x.toFixed(1)).join('、')}；标准差 ≈ <b>${sd.toFixed(1)}</b>`; };
    U.$('#sd-in').oninput = sdUpd; sdUpd();
    const zUpd = () => { const m = +U.$('#z-m').value, s = +U.$('#z-s').value, x = +U.$('#z-x').value; U.$('#z-out').textContent = s > 0 ? ((x-m)/s).toFixed(2).replace('-', '−') : '—'; };
    ['#z-m','#z-s','#z-x'].forEach(k => U.$(k).oninput = zUpd);

    function drawLocked(){
      const ip = U.$('#w2-interp');
      if (ip) ip.innerHTML = !lockArea.dataset.ok ? '<h3 style="margin-top:0">解读</h3><p class="muted" style="margin:0">投资助手写的解读会揭晓上面两道题的答案，所以要等你提交猜测之后才显示。</p>'
        : (window.INTERP && INTERP['week2'] ? U.md(INTERP['week2']) : '<h3 style="margin-top:0">解读</h3><p class="muted" style="margin:0">暂无解读。</p>');
      if (!lockArea.dataset.ok){ lockArea.innerHTML = `<div class="lockmsg">先在上面写下你对两个问题的猜测并提交，图表和结果才会出现。</div>`; return; }
      if (lockArea.dataset.drawn) return; lockArea.dataset.drawn = '1';
      const h = W2.HY_OAS, ig = U.ser('IG_OAS'), i = h.d.length-1;
      const igch = ig && ig.v.length > 63 ? U.last(ig.v) - ig.v[ig.v.length-64] : null;
      const hc = W2.handcheck;
      lockArea.innerHTML = `
        <div class="card"><h3 style="margin-top:0">今天的读数（${h.d[i]} 这一周）</h3>
          <div class="tablewrap"><table><thead><tr><th>序列</th><th>利差</th><th>z（3 年）</th><th>z（10 年）</th><th>z（全部过去）</th><th>百分位（3 年）</th><th>百分位（全部过去）</th><th>区间</th></tr></thead><tbody>
          ${['HY_OAS','IG_OAS','CCC_OAS','BAA10Y'].map(k => { const r = W2[k], j = r.d.length-1; return `<tr><td>${NAMES[k]}</td><td>${r.v[j].toFixed(0)}bp</td><td>${fz(r.z3[j])}</td><td>${fz(r.z10[j])}</td><td>${fz(r.ze[j])}</td><td>${fp(r.p3[j])}</td><td>${fp(r.pe[j])}</td><td>${zone(r.ze[j] ?? r.z3[j])}</td></tr>`; }).join('')}
          </tbody></table></div>
          <p class="small">先行条件 ①：HY OAS ${h.v[i].toFixed(0)}bp，离你的 ${T.hy_line}bp 线还差 <b>${(T.hy_line - h.v[i]).toFixed(0)}bp</b>；IG OAS 近 3 个月（63 个交易日）变化 <b>${igch == null ? '—' : U.sgn(igch, 0, 'bp')}</b>（条件是超过 +${T.ig_widen}bp）。${h.v[i] > T.hy_line && igch > T.ig_widen ? '<b>两半都成立。</b>' : '目前不成立。'}</p>
          <p class="small muted" style="margin-bottom:0">HY、IG、CCC 只有 3 年数据：3 年窗口只够算最后一周，10 年窗口算不了（显示 —），“全部过去”也就是这 3 年。</p>
        </div>
        <div class="card" style="margin-top:14px">
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><span>看哪条序列：</span>${['BAA10Y','HY_OAS','IG_OAS','CCC_OAS'].map(k => `<button class="btn small" data-s="${k}">${k === 'BAA10Y' ? 'BAA10Y（长，1986 起）' : NAMES[k].replace(/利差 ?/, '') + '（短，3 年）'}</button>`).join('')}</div>
          <h3 id="w2-t1"></h3><div id="w2-spread"></div>
          <h3>z 分数（只用过去的数据）　<span class="small muted">底色：浅蓝 = 偏紧；黄 = 有压力；红 = 接近危机</span></h3><div id="w2-z"></div>
          <div class="slider"><span>自定义窗口</span><input type="range" min="52" max="1040" step="26" id="w2-win"><span class="v" id="w2-winv"></span></div>
          <p class="small" id="w2-winout"></p>
        </div>
        <h3>诚实 z 和 <span class="lookahead">偷看未来的 z</span>（BAA10Y）</h3>
        <div class="card tablewrap"><table><thead><tr><th>月份</th><th>那一周</th><th>利差</th><th>诚实：全部过去 z</th><th>诚实：百分位</th><th>诚实：10 年 z</th><th>诚实：3 年 z</th><th class="lookahead">偷看：全历史 z（含未来）</th></tr></thead><tbody>
          ${W2.compare.map(c => `<tr><td>${c.month}</td><td>${c.week}</td><td>${c.spread.toFixed(0)}bp</td><td>${fz(c.ze)}</td><td>${fp(c.pe)}</td><td>${fz(c.z10)}</td><td>${fz(c.z3)}</td><td class="lookahead">${fz(c.zla)}</td></tr>`).join('')}
          </tbody></table>
          <p class="small muted">偷看版本用的是 ${W2.BAA10Y.d[0]} 到 ${U.last(W2.BAA10Y.d)} 全部数据的平均 ${W2.BAA10Y.full_mean.toFixed(0)}bp 和标准差 ${W2.BAA10Y.full_sd.toFixed(0)}bp。红色这一列只用来对比，现实中当时不可能知道。注意 2020 年 3 月：3 年窗口给出很高的 z，因为之前 3 年非常平静（窗口漂移）。</p></div>
        <h3>肥尾：每周变化的分布</h3>
        <div class="card"><canvas class="hist" id="w2-hist"></canvas><p class="small" id="w2-histtxt"></p></div>
        <h3>手算核对一周</h3>
        <div class="card"><p class="small">${hc.series}，${hc.week} 这一周，本周 ${hc.today.toFixed(0)}bp。窗口 = 之前 ${hc.window_weeks} 周（不含本周）。</p>
          <div class="tablewrap"><table><tbody>
          <tr><td>窗口里最早的 5 周</td><td>${hc.first5.map(x => x.toFixed(0)).join('、')}</td></tr>
          <tr><td>窗口里最近的 5 周</td><td>${hc.last5.map(x => x.toFixed(0)).join('、')}</td></tr>
          <tr><td>156 周的平均</td><td>${hc.mean.toFixed(1)}bp</td></tr>
          <tr><td>156 周的标准差</td><td>${hc.sd.toFixed(1)}bp</td></tr>
          <tr><td>z = (本周 − 平均) ÷ 标准差</td><td>(${hc.today.toFixed(0)} − ${hc.mean.toFixed(1)}) ÷ ${hc.sd.toFixed(1)} = <b>${fz(hc.z)}</b></td></tr>
          </tbody></table></div><p class="small muted" style="margin-bottom:0">和图上 3 年 z 的最后一个点一致（数据脚本里有自动核对）。</p></div>`;
      U.$$('[data-s]', lockArea).forEach(b => b.onclick = () => { state.key = b.dataset.s; update(); });
      U.$('#w2-win').oninput = () => { state.win = +U.$('#w2-win').value; clearTimeout(drawLocked._t); drawLocked._t = setTimeout(update, 80); };
      update();
    }
    function update(){
      const k = state.key, r = W2[k]; U.$$('[data-s]', lockArea).forEach(b => b.classList.toggle('primary', b.dataset.s === k));
      const x = r.d.map(U.ts);
      U.$('#w2-t1').innerHTML = `${NAMES[k]}（周度，bp）`;
      Charts.line(U.$('#w2-spread'), { x, ys:[r.v], labels:['利差'], range:'ALL', height:200, fmt: v => v == null ? '—' : v.toFixed(0) + 'bp',
        hlines: k === 'HY_OAS' ? [{ y:T.hy_line, label:`你的线 ${T.hy_line}bp` }] : [] });
      U.$('#w2-win').value = state.win; U.$('#w2-winv').textContent = `${state.win} 周（约 ${(state.win/52).toFixed(1)} 年）`;
      const cz = rollingZ(r.v, state.win);
      const bands = [{ from:-99, to:-1, color:U.css('--accent-soft') }, { from:1, to:2, color:U.css('--y-soft') }, { from:2, to:99, color:U.css('--r-soft') }];
      Charts.line(U.$('#w2-z'), { x, ys:[r.z3, r.z10, r.ze, cz.z], labels:['3 年窗口', '10 年窗口', '全部过去', `自定义 ${state.win} 周`], range:'ALL', height:230, bands,
        colors:[U.css('--chart1'), U.css('--chart3'), U.css('--chart4'), U.css('--chart2')], widths:[1.4, 1.4, 1.4, 2], fmt: v => fz(v),
        hlines:[{ y:0, color:U.css('--ink3'), dash:false }] });
      const j = r.d.length-1;
      U.$('#w2-winout').innerHTML = cz.z[j] == null ? `数据不够：这条序列只有 ${r.d.length} 周，${state.win} 周的窗口在最新一周算不出来。` :
        `用过去 ${state.win} 周比较，最新一周（${r.d[j]}，${r.v[j].toFixed(0)}bp）的 z = <b>${fz(cz.z[j])}</b>，百分位 <b>${fp(cz.pr[j])}</b>，属于“${zone(cz.z[j])}”。`;
      hist(r, k);
    }
    function hist(r, k){
      const cv = U.$('#w2-hist'), dpr = devicePixelRatio || 1, W = cv.clientWidth || 600, H = 260; cv.width = W*dpr; cv.height = H*dpr;
      const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr); ctx.clearRect(0, 0, W, H);
      const ch = []; for (let i = 1; i < r.v.length; i++) ch.push(r.v[i] - r.v[i-1]);
      const m = U.mean(ch), sd = Math.sqrt(U.mean(ch.map(x => (x-m)**2)));
      const lo = -5, hi = 5, nb = 40, bw = (hi-lo)/nb, cnt = new Array(nb).fill(0); let outL = 0, outR = 0;
      ch.forEach(x => { const z = (x-m)/sd; if (z < lo) outL++; else if (z >= hi) outR++; else cnt[Math.floor((z-lo)/bw)]++; });
      const pad = { l:36, r:10, t:10, b:28 }, pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
      const pdf = z => Math.exp(-z*z/2)/Math.sqrt(2*Math.PI) * ch.length * bw;
      const ymax = Math.max(...cnt, pdf(0)) * 1.1;
      const X = z => pad.l + (z-lo)/(hi-lo)*pw, Y = c => pad.t + ph - c/ymax*ph;
      ctx.fillStyle = U.css('--chart1'); cnt.forEach((c, i) => { if (c) ctx.fillRect(X(lo + i*bw)+1, Y(c), pw/nb - 2, pad.t + ph - Y(c)); });
      ctx.strokeStyle = U.css('--r'); ctx.lineWidth = 2; ctx.beginPath(); for (let z = lo; z <= hi; z += 0.05){ const px = X(z), py = Y(pdf(z)); z === lo ? ctx.moveTo(px, py) : ctx.lineTo(px, py); } ctx.stroke();
      ctx.fillStyle = U.css('--ink3'); ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
      for (let z = -4; z <= 4; z += 2) ctx.fillText((z > 0 ? '+' : '') + z + ' 个标准差', X(z), H - 8);
      ctx.strokeStyle = U.css('--grid'); ctx.beginPath(); ctx.moveTo(pad.l, pad.t + ph + .5); ctx.lineTo(pad.l + pw, pad.t + ph + .5); ctx.stroke();
      const b3 = ch.filter(x => Math.abs(x-m) > 3*sd).length, e3 = ch.length * 0.0026998, b4 = ch.filter(x => Math.abs(x-m) > 4*sd).length, e4 = ch.length * 6.334e-5;
      U.$('#w2-histtxt').innerHTML = `蓝色柱子 = ${NAMES[k]} 每周变化的实际分布（${ch.length} 周，周变化标准差 ${sd.toFixed(1)}bp）；红线 = 如果是标准钟形曲线（正态分布）应该长什么样。<br>
        超过 3 个标准差的周：实际 <b>${b3}</b> 周，钟形曲线预计约 <b>${e3.toFixed(1)}</b> 周；超过 4 个标准差：实际 <b>${b4}</b> 周，预计约 <b>${e4.toFixed(2)}</b> 周。${outL + outR ? `（另有 ${outL + outR} 周超过 5 个标准差，图上画不下）` : ''}${k !== 'BAA10Y' ? '<br><span class="muted">这条序列只有 3 年，样本少，肥尾的结论主要看 BAA10Y。</span>' : ''}`;
    }
    drawLocked();
  }
  return { render, rollingZ };
})();
