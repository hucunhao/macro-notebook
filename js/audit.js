// 可审计一页。
// 成立句、是/否句、脚注、概率读法、情绪读法：只使用 rules/ui_copy_audit_page.md 的原文。
// 规则正文：rules/bear_dashboard_definitions.md。
// 开关用 Observe.compute()（门槛数字只读 Settings，不在这里另写一套阈值）。
const Audit = (() => {
  const RULES = 'rules/bear_dashboard_definitions.md';
  // 页上正式文案（investor 2026-10-24）。冲突时以书面定义与该文案为准。
  const COPY = {
    names: ['① 信用利差', '② 核心通胀再加速', '③ 油价冲击', '④ AI 信用扩散'],
    def: [
      '成立：HY OAS（FRED BAMLH0A0HYM2）> 350bp，并且 IG OAS（FRED BAMLC0A0CM）过去 63 个交易日变化 > +20bp。',
      '成立（两句同时）：1) 美联储最近一次调整是加息，且在过去 9 个月内；2) 未季调核心 CPI 同比（官方一位小数）比 3 个月前高 ≥ 0.1 个百分点。',
      '成立（两句同时）：1) WTI 现货（FRED DCOILWTICO）月均价同比，对最近 2 个完整日历月均 > +50%（当月 MTD 可展示，不计入）；2) 过去 20 个交易日内，WTI 现货日收盘创 52 周新高。',
      '含义：AI 相关信用压力已从 CoreWeave 等扩散到更多发债主体。',
    ],
    foot2: '2026-10-20 修订：不用相邻月比较。9月2.6% vs 6月2.6% → 否。11/10 若10月核心同比≥2.6%（对7月2.5%）且仍在加息9个月窗内 → ②重新成立。3个月年化仅展示、不进判断。',
    rev23: '最后修订：2026-10-20（触发②③精确定义）',
    exit4: '改为否须同时：甲骨文 5 年 CDS < 200bp（来源+时间戳），且数据中心项目债回到面值附近。',
    side4: 'Meta 等融资行为（如负 FCF、新股融资）仅作旁证，不能单独翻转④。',
    prob: '这是规则概率，不是预测准星；只有①–④状态变化才换桶。确认信号（200日线/盈利下修/Sahm/初请）只能提示风险↑，不能把概率往下调。',
    tiers: '档位：标普 −10/−20/−30，纳指 −15/−25/−35，每档用货币基金 1/3。拆两半：≥2 条触发时每档拆两半隔 4 周；当前≤1 条则规则暂停（建议区可另写「自愿拆半至 11/10」，勿与规则混写）。',
    mood: '情绪块描述拥挤与恐慌，不决定概率；与股指背离时优先信信用与宽度。',
    on4: '是 — 见证据栏（CDS / 项目债 / 日期）',
    suggest: '自愿拆半至 11/10',
  };
  // 书面句子里的数字。与 Settings 默认值一致；用户改了门槛就单独标出来。
  const COPY_NUM = { hy_line: 350, ig_widen: 20, fed_months: 9, oil_yoy: 50, spx_t1: 10, spx_t2: 20, spx_t3: 30, ndx_t1: 15, ndx_t2: 25, ndx_t3: 35 };

  const fred = (code, id) => { const s = U.ser(id); const href = s && s.url ? s.url : 'https://fred.stlouisfed.org/series/' + code; return `<a href="${U.esc(href)}" target="_blank" rel="noopener">FRED ${code}</a>`; };
  const bp = x => x == null || isNaN(x) ? '—' : String(Math.round(x));
  const signed = x => x == null || isNaN(x) ? '—' : (x > 0 ? '+' : '') + Math.round(x);
  const pct1 = y => y == null || isNaN(y) ? '—' : (y * 100 > 0 ? '+' : '') + (y * 100).toFixed(1) + '%';

  function sent1(d, live){
    const hyR = Math.round(d.hy), dlt = Math.round(d.ig3m);
    const gapHy = d.hyLine - hyR, gapIg = d.igWiden - dlt;
    return `${live ? '是' : '否'} — HY ${hyR}bp（距 ${d.hyLine} 还差 ${gapHy}）；IG 63日变化 ${signed(dlt)}bp（距 +${d.igWiden} 还差 ${gapIg}）`;
  }
  function sent2(d, live){
    const cpi = `核心CPI同比 ${d.cNow == null ? '—' : d.cNow.toFixed(1)}% vs 3个月前 ${d.cPrev == null ? '—' : d.cPrev.toFixed(1)}%（差值 ${d.diff == null ? '—' : d.diff.toFixed(1)}pt，需≥0.1）`;
    if (d.hiking) return `${live ? '是' : '否'} — 加息窗内成立；${cpi}`;
    return `否 — 第1句不成立（美联储最近一次调整是加息，且在过去 9 个月内）；${cpi}`;
  }
  function sent3(d, live){
    const months = (d.last2 || []).map(x => `${x.m} ${pct1(x.y)}`).join(' / ') || '—';
    const head = `完整月同比：${months}`;
    if (d.newHigh) return `${live ? '是' : '否'} — ${head}；过去 20 个交易日内，WTI 现货日收盘创 52 周新高`;
    const p = (d.max252 && d.last != null) ? ((d.max252 - d.last) / d.max252 * 100) : null;
    return `否 — ${head}；距52周收盘高点还差约 ${p == null ? '—' : p.toFixed(1)}%（近20日未创新高）`;
  }
  function sent4(live, T){
    if (live) return COPY.on4;
    const z = T.ai_cds === '' || T.ai_cds == null || isNaN(+T.ai_cds) ? '—' : Math.round(+T.ai_cds);
    return `否 — CDS ${z}bp（退出线 200）且项目债近面值`;
  }

  function bucket(n){
    if (n === 3) return { row: '=3', dd: '40%', ndx: '约52%', dist: '桶内如何再切由 investor 下次书面改定；UI 先显示 40% 合计即可。' };
    if (n >= 2) return { row: '≥2', dd: '35%', ndx: '约52%', dist: '<10% 41%；10–20% 24%；20–35% 27%；>35% 8%。' };
    return { row: '0或1', dd: '25%', ndx: '约45%', dist: '<10% 47%；10–20% 28%；20–35% 20%；>35% 5%。' };
  }

  function isoWeek(d){
    const dt = new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)));
    const day = dt.getUTCDay() || 7;
    dt.setUTCDate(dt.getUTCDate() + 4 - day);
    const y = dt.getUTCFullYear();
    const ys = new Date(Date.UTC(y, 0, 1));
    const w = Math.ceil((((dt - ys) / 86400000) + 1) / 7);
    return y + '-W' + String(w).padStart(2, '0');
  }
  function weekEnds(s, minI){
    const out = []; let key = null;
    s.d.forEach((d, i) => {
      if (i < minI) return;
      const k = isoWeek(d);
      if (k !== key){ out.push(i); key = k; } else out[out.length - 1] = i;
    });
    return out;
  }

  // 确认信号：只标注压力↑。没有序列就写暂缺，不编一个“更安全”的读数。
  function trend(){
    const s = U.ser('SPX');
    if (!s || s.v.length < 200) return { kind: 'miss' };
    const maAt = i => { let a = 0; for (let k = i - 199; k <= i; k++) a += s.v[k]; return a / 200; };
    const weeks = weekEnds(s, 199);
    let streak = 0;
    for (let n = weeks.length - 1; n >= 0; n--){
      const i = weeks[n];
      if (s.v[i] < maAt(i)) streak++; else break;
    }
    const i = weeks[weeks.length - 1];
    const wd = new Date(U.ts(s.d[i]) * 1000).getUTCDay();
    return { kind: streak >= 2 ? 'up' : 'off', streak, d: s.d[i], v: s.v[i], ma: maAt(i), partial: wd !== 5 };
  }

  function qqq20(){
    const s = U.ser('QQQ');
    if (!s || s.v.length < 20) return null;
    const weeks = []; let key = null;
    s.d.forEach((d, i) => {
      const k = isoWeek(d);
      if (k !== key){ weeks.push({ d, v: s.v[i] }); key = k; }
      else weeks[weeks.length - 1] = { d, v: s.v[i] };
    });
    if (weeks.length < 20) return null;
    const last = weeks[weeks.length - 1];
    const ma = weeks.slice(-20).reduce((a, x) => a + x.v, 0) / 20;
    const reclaim = weeks.slice(-20, -1).reduce((a, x) => a + x.v, 0) / 19;
    let streak = 0;
    for (let i = weeks.length - 1; i >= 19; i--){
      const m = weeks.slice(i - 19, i + 1).reduce((a, x) => a + x.v, 0) / 20;
      if (weeks[i].v < m) streak++; else break;
    }
    let hi = -Infinity, hd = null;
    s.v.forEach((v, i) => { if (v > hi){ hi = v; hd = s.d[i]; } });
    const wd = new Date(U.ts(last.d) * 1000).getUTCDay();
    return { last, ma, reclaim, streak, below: last.v < ma, hi, hd, dd: s.v[s.v.length - 1] / hi - 1, partial: wd !== 5, px: s.v[s.v.length - 1], date: s.d[s.d.length - 1] };
  }

  function breadth(){
    const S = window.SP;
    if (!S) return null;
    const B = S.breadth;
    let p200 = null, p50 = null, asof = S.asof;
    if (B && B.d && B.d.length){ const n = B.d.length - 1; p200 = B.p200[n]; p50 = B.p50[n]; asof = B.d[n]; }
    const rows = (S.rows || []).filter(r => !r.dup);
    return { p200, p50, asof, hi: rows.filter(r => r.hi52).length, lo: rows.filter(r => r.lo52).length, n: rows.length };
  }

  function mismatch(T){
    return Object.entries(COPY_NUM).filter(([k, v]) => Number(T[k]) !== v).map(([k, v]) => `${k} 书面 ${v} / 门槛 ${T[k]}`);
  }

  function badge(live){
    if (live == null) return '<span class="badge n">无数据</span>';
    return live ? '<span class="badge r">是</span>' : '<span class="badge g">否</span>';
  }

  function trigCards(C, T){
    const t = C.trig;
    const blocks = [];
    const d1 = t[0].detail;
    blocks.push(`<section class="panel"><div class="ph"><span class="t">${COPY.names[0]}</span><span class="r">${badge(t[0].live)}</span></div><div class="pb">
      <p class="small" style="margin:0">${COPY.def[0]}</p>
      <p class="audit-sent">${d1 ? U.esc(sent1(d1, t[0].live)) : '无数据'}</p>
      <p class="hint">${d1 ? `HY ${bp(d1.hy)}bp（${d1.hyDate}）；IG ${bp(d1.ig)}bp，63 个交易日前 ${bp(d1.igFromV)}bp（${d1.igFrom} → ${d1.igDate}）。` : ''}来源 ${fred('BAMLH0A0HYM2', 'HY_OAS')}、${fred('BAMLC0A0CM', 'IG_OAS')}</p>
    </div></section>`);

    const d2 = t[1].detail;
    const chg = d2 && d2.lastChg ? `${d2.lastChg.date} 从 ${d2.lastChg.from.toFixed(2)}% ${d2.lastChg.to > d2.lastChg.from ? '加息' : '降息'}到 ${d2.lastChg.to.toFixed(2)}%` : '无';
    blocks.push(`<section class="panel"><div class="ph"><span class="t">${COPY.names[1]}</span><span class="r">${badge(t[1].live)}</span></div><div class="pb">
      <p class="small" style="margin:0">${COPY.def[1]}</p>
      <p class="audit-sent">${d2 ? U.esc(sent2(d2, t[1].live)) : '无数据'}</p>
      <p class="hint">${d2 ? `目标上限 ${d2.fedNow.toFixed(2)}%（${d2.fedDate}）。最近一次调整：${chg}。核心 CPI 同比 ${d2.cDate ? d2.cDate.slice(0, 7) : '—'} vs ${d2.pDate ? d2.pDate.slice(0, 7) : '—'}。3 个月年化（季调）${d2.ann == null ? '—' : d2.ann.toFixed(2) + '%'}（${d2.annDate ? d2.annDate.slice(0, 7) : '—'}）。` : ''}来源 ${fred('DFEDTARU', 'FEDU')}、${fred('CPILFENS', 'CORECPI_NSA_YOY')}</p>
      <div class="audit-fn">${COPY.foot2}</div>
    </div></section>`);

    const d3 = t[2].detail;
    blocks.push(`<section class="panel"><div class="ph"><span class="t">${COPY.names[2]}</span><span class="r">${badge(t[2].live)}</span></div><div class="pb">
      <p class="small" style="margin:0">${COPY.def[2]}</p>
      <p class="audit-sent">${d3 ? U.esc(sent3(d3, t[2].live)) : '无数据'}</p>
      <p class="hint">${d3 ? `${d3.curM} 月初至今 ${pct1(d3.mtd)}（${d3.mtdDays} 个交易日，不计入）。52 周收盘高点 ${d3.max252.toFixed(2)}（${d3.hiDate}）；近 20 日最高 ${d3.max20.toFixed(2)}；最新 ${d3.last.toFixed(2)}（${d3.lastDate}）。` : ''}来源 ${fred('DCOILWTICO', 'WTI')}</p>
      <div class="audit-fn">${COPY.rev23}。11/10 若10月核心同比≥2.6%（对7月2.5%）且仍在加息9个月窗内 → ②重新成立。</div>
    </div></section>`);

    blocks.push(`<section class="panel" id="audit-ev"><div class="ph"><span class="t">${COPY.names[3]}</span><span class="r">${badge(t[3].live)}</span></div><div class="pb">
      <p class="small" style="margin:0">${COPY.def[3]}</p>
      <p class="audit-sent">${U.esc(sent4(t[3].live, T))}</p>
      <p class="small">${COPY.exit4}</p>
      <div class="audit-ev">
        <p class="hint" style="margin-top:0">证据栏。保存在本机门槛设置，和阈值同一处。二手盘中高点不得单独当作收盘事实。</p>
        <p class="hint">${COPY.side4}</p>
        <div class="setrow"><span>手动：我认为正在扩散</span><input type="checkbox" id="audit-ai" ${T.ai_stress ? 'checked' : ''}></div>
        <div class="setrow" style="display:block"><span>依据</span><br><input type="text" id="audit-note" style="width:100%" value="${U.esc(T.ai_note || '')}"></div>
        <div class="setrow"><span>CDS（bp）</span><input type="number" step="any" id="audit-cds" value="${T.ai_cds === '' || T.ai_cds == null ? '' : T.ai_cds}"></div>
        <div class="setrow"><span>CDS 日期</span><input type="text" id="audit-cds-date" value="${U.esc(T.ai_cds_date || '')}"></div>
        <div class="setrow"><span>CDS 来源</span><input type="text" id="audit-cds-src" value="${U.esc(T.ai_cds_src || '')}"></div>
        <div class="setrow"><span>项目债价格或利差</span><input type="text" id="audit-bond" value="${U.esc(T.ai_bond || '')}"></div>
        <div class="setrow"><span>项目债日期</span><input type="text" id="audit-bond-date" value="${U.esc(T.ai_bond_date || '')}"></div>
        <div class="setrow"><span>项目债来源</span><input type="text" id="audit-bond-src" value="${U.esc(T.ai_bond_src || '')}"></div>
        <div class="setrow" style="display:block"><span>旁证（不能单独翻转④）</span><br><input type="text" id="audit-side" style="width:100%" value="${U.esc(T.ai_side || '')}"></div>
      </div>
      <p class="hint">来源：手动记录，无自动序列。日期和来源填在上面。</p>
    </div></section>`);
    return blocks.join('');
  }

  function tierCell(t, x){
    const hit = -t.dd * 100 >= x - 1e-9;
    if (hit) return `<td>−${x}%：<b>已到</b></td>`;
    const fall = t.high * (1 - x / 100) / t.last - 1;
    const px = t.high * (1 - x / 100);
    return `<td>−${x}%：再跌 ${Math.abs(fall * 100).toFixed(1)}%（约 ${U.fmtNum(px, 0)}）</td>`;
  }
  function tierRow(name, note, t){
    if (!t) return `<tr><td>${name}</td><td colspan="5">暂无数据</td></tr>`;
    return `<tr><td>${name}<br><span class="muted small">${note}<br>${U.fmtNum(t.last, 2)}（${t.date}）</span></td><td>${U.fmtNum(t.high, 2)}<br><span class="muted small">${t.highDate}</span></td><td>${U.pct(t.dd)}</td>${t.tiers.map(x => tierCell(t, x)).join('')}</tr>`;
  }

  function confirmHTML(){
    const tr = trend();
    const trendCell = tr.kind === 'miss' ? '暂缺' : `${tr.d} 周收盘 ${U.fmtNum(tr.v, 2)}，200 日均线 ${U.fmtNum(tr.ma, 2)}，连续在线下 ${tr.streak} 周${tr.partial ? '（最近日期不是周五，当周可能未结束）' : ''}`;
    const trendBadge = tr.kind === 'up' ? '<span class="badge r">确认压力↑</span>' : tr.kind === 'miss' ? '<span class="badge n">暂缺</span>' : '<span class="badge g">未成立</span>';
    const rows = [
      ['趋势', '标普周线收盘跌破 200 日均线，且持续 ≥ 2 周', trendBadge, trendCell],
      ['盈利', '盈利预期（FactSet 等）连续 4 周下修', '<span class="badge n">暂缺</span>', '暂缺。本站没有 FactSet 盈利预期序列。'],
      ['就业 Sahm', 'Sahm Rule 实时指标 > 0.3', '<span class="badge n">暂缺</span>', '暂缺。本站没有这条序列。'],
      ['初请', '初请失业金 4 周均值 > 23 万', '<span class="badge n">暂缺</span>', '暂缺。本站没有这条序列。'],
    ];
    return `<section class="panel"><div class="ph"><span class="t">确认信号</span><span class="s">只读；只可上调风险认知，不可压低概率</span></div><div class="pb tablewrap"><table><thead><tr><th>信号</th><th>成立条件</th><th>读数</th><th>现在</th></tr></thead><tbody>
      ${rows.map(r => `<tr><td>${r[0]}</td><td style="text-align:left;white-space:normal">${r[1]}</td><td>${r[2]}</td><td style="text-align:left;white-space:normal">${r[3]}</td></tr>`).join('')}
    </tbody></table><p class="hint">未成立或暂缺时，概率桶保持不动。</p></div></section>`;
  }

  function moodHTML(T){
    const br = breadth();
    const vx = U.ser('VIX'), hy = U.ser('HY_OAS'), ig = U.ser('IG_OAS');
    const vxL = vx ? U.last(vx.v) : null, vxD = vx ? U.last(vx.d) : null;
    const brLine = br ? `站上 200 日线 ${br.p200 == null ? '—' : br.p200 + '%'}，站上 50 日线 ${br.p50 == null ? '—' : br.p50 + '%'}（${br.asof}，${br.n} 家）。52 周新高 ${br.hi}、新低 ${br.lo}。<a href="#/br">广度页</a>` : '宽度暂缺（标普成分股数据还没加载）。';
    const fg = window.MS && MS.fg && MS.fg.score != null ? `<p class="hint">可选参考（权重低于宽度，不进概率）：CNN 恐惧贪婪 ${Number(MS.fg.score).toFixed(0)}（${MS.fg.date || '—'}）。本页不依赖它；没有这列时上面三行仍然成立。</p>` : '';
    return `<section class="panel" id="audit-mood"><div class="ph"><span class="t">自建情绪（非 CNN）</span><span class="s">同页次要，不改概率</span></div><div class="pb">
      <p class="audit-sent">${COPY.mood}</p>
      <p class="small">宽度（优先）：${brLine}</p>
      <p class="small">VIX ${vxL == null ? '—' : vxL.toFixed(2)}（${vxD || '—'}）。只作旁注。门槛设置里的自满线 ${T.vix_calm}、恐慌线 ${T.vix_panic}，不进概率桶。</p>
      <p class="small">HY ${hy ? Math.round(U.last(hy.v)) + 'bp（' + U.last(hy.d) + '）' : '—'} / IG ${ig ? Math.round(U.last(ig.v)) + 'bp（' + U.last(ig.d) + '）' : '—'}，只展示。</p>
      ${fg}
    </div></section>`;
  }

  function qqqHTML(){
    const q = qqq20();
    if (!q) return `<section class="panel"><div class="ph"><span class="t">QQQ 20 周线</span><span class="s">辅助，不改概率</span></div><div class="pb"><p>暂无数据</p></div></section>`;
    return `<section class="panel"><div class="ph"><span class="t">QQQ 20 周线</span><span class="s">辅助，不改概率。未复权。</span></div><div class="pb">
      <div class="kv"><span>现价 <b>${U.fmtNum(q.px, 2)}</b>（${q.date}）</span><span>20 周均线 <b>${U.fmtNum(q.ma, 2)}</b></span><span>周收盘在线下 <b>${q.below ? '是' : '否'}</b></span><span>连续 <b>${q.streak}</b> 周</span></div>
      <p class="small">收回所需价位（当周收盘要回到均线上）：约 ${U.fmtNum(q.reclaim, 2)}。距高点回撤 ${U.pct(q.dd)}（高点 ${U.fmtNum(q.hi, 2)}，${q.hd}）。</p>
      <p class="hint">实体（开高低）暂缺，不能判断实体是否在线下；上面用的是周收盘。${q.partial ? '最近日期不是周五，当周可能未结束。' : ''}收回 20 周线 ≠ 降低熊市概率。不作为加仓触发。</p>
    </div></section>`;
  }

  function bindEvidence(){
    const set = (k, v) => Settings.set(k, v);
    const on = (id, fn) => { const el = U.$('#' + id); if (el) el.onchange = fn; };
    on('audit-ai', e => set('ai_stress', e.target.checked));
    on('audit-note', e => set('ai_note', e.target.value));
    on('audit-cds', e => { const v = e.target.value.trim(); set('ai_cds', v === '' || isNaN(+v) ? '' : +v); });
    [['audit-cds-date', 'ai_cds_date'], ['audit-cds-src', 'ai_cds_src'], ['audit-bond', 'ai_bond'], ['audit-bond-date', 'ai_bond_date'], ['audit-bond-src', 'ai_bond_src'], ['audit-side', 'ai_side']].forEach(([id, k]) => on(id, e => set(k, e.target.value)));
  }

  function fillQdii(){
    const el = U.$('#audit-qdii'); if (!el) return;
    U.need('data/qdii.js').then(() => {
      if (!el.isConnected || !window.QD || !QD.funds) return;
      const prem = f => (f.prem && f.prem.length) ? U.last(f.prem) : null;
      const dt = f => (f.d && f.d.length) ? U.last(f.d) : null;
      const med = idx => { const xs = QD.funds.filter(f => f.idx === idx).map(prem).filter(x => x != null); return xs.length ? U.median(xs) : null; };
      const fp = x => x == null ? '—' : (x > 0 ? '+' : '') + x.toFixed(1) + '%';
      const dates = QD.funds.map(dt).filter(Boolean).sort();
      const one = code => { const f = QD.funds.find(x => x.code === code); return f ? `${f.code} ${fp(prem(f))}` : ''; };
      const sp = med('标普500'), nq = med('纳指100');
      const missing = sp == null && nq == null;
      el.innerHTML = missing
        ? '<p>溢价暂缺。无溢价数据，这里不暗示该加仓。隐形损耗：暂缺。</p>'
        : `<div class="kv"><span>标普 500 场内中位溢价 <b>${fp(sp)}</b></span><span>纳指 100 场内中位溢价 <b>${fp(nq)}</b></span><span>净值日 <b>${dates.length ? dates[dates.length - 1] : '—'}</b></span><span>${one('513500')} ${one('513100')}</span></div>
          <p class="hint">目标是场外 QDII（按净值申购，没有场内溢价）。场内溢价只展示，不暗示该加仓。跟踪或隐形损耗：暂缺。指数距档位见上表。货币基金余额暂缺，每档仍是余额的 1/3。<a href="#/qdii">QDII 溢价页</a></p>`;
    }).catch(() => { if (el.isConnected) el.innerHTML = '<p>溢价暂缺。无溢价数据，这里不暗示该加仓。隐形损耗：暂缺。</p>'; });
  }

  function render(app){
    const T = Settings.get();
    const C = Observe.compute(T);
    const n = C.nLive;
    const B = bucket(n);
    const bad = mismatch(T);
    const rows = [['0或1', '25%', '约45%'], ['≥2', '35%', '约52%'], ['=3', '40%', '约52%']];
    const taipei = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
    app.innerHTML = `
      <div class="pg-h"><h1>可审计一页</h1><span class="s">规则和情绪放在同一页。数据截至美股 ${MS.meta.newest}</span>
        ${U.info(`<b>这一页怎么用</b><br>四条领先触发决定概率桶。确认信号和下面的情绪块都不能把概率往下调。<br>书面定义：<a href="${RULES}">${RULES}</a><br>页上句式：rules/ui_copy_audit_page.md（2026-10-24）。<br>数字门槛在右上角「门槛设置」，默认与书面定义一致。`, 'ⓘ 怎么读')}</div>
      ${bad.length ? `<div class="weak">门槛设置与书面数字不一致：${bad.map(U.esc).join('；')}。本页「是/否」按门槛设置计算；「成立」句仍是书面原文。</div>` : ''}
      <p class="hint" style="margin-top:0">${COPY.rev23}。定义源 <a href="${RULES}">${RULES}</a></p>
      <div class="grid g2">${trigCards(C, T)}</div>
      <div class="grid g2" style="margin-top:8px">
        <section class="panel" id="audit-prob"><div class="ph"><span class="t">概率桶</span><span class="s">只由「是」的条数驱动</span><span class="r"><span class="badge ${n >= 2 ? 'r' : 'a'}">${n} / 4 为是</span></span></div><div class="pb">
          <div class="kv"><span>合计跌超 20% <b class="big">${B.dd}</b></span><span>纳指100 技术性熊市 <b class="big">${B.ndx}</b></span><span>当前行 <b>${B.row}</b></span></div>
          <p class="small">${COPY.prob}</p>
          <p class="small">${COPY.tiers}</p>
          <div class="tablewrap"><table><thead><tr><th>条数</th><th>合计&gt;20%</th><th>纳指技术性熊市</th></tr></thead><tbody>
            ${rows.map(([a, b, c]) => `<tr class="${a === B.row ? 'audit-on' : ''}"><td>${a}</td><td>${b}</td><td>${c}</td></tr>`).join('')}
          </tbody></table></div>
          <p class="hint">书面分布（${B.row}）：${B.dist} 价格涨跌本身不是领先触发。</p>
        </div></section>
        <section class="panel"><div class="ph"><span class="t">拆两半</span><span class="s">规则和建议分开</span></div><div class="pb">
          <div class="${n >= 2 ? 'split-alert' : 'split-note'}"><div class="muted small">规则</div><div class="big">${n >= 2 ? '规则=启用' : '规则=暂停'}</div>
            <p style="margin:4px 0 0">领先触发为「是」${n} 条。≥ 2 条同时为「是」才启用：每一档拆成两半，间隔 4 周。</p></div>
          <div class="suggest-box" style="margin-top:8px;padding:8px 12px"><div class="muted small">建议（非正式规则）</div><div class="big">${taipei < '2026-11-10' ? COPY.suggest : '建议区：至 11/10 的自愿提示已过日历'}</div>
            <p class="small" style="margin:4px 0 0">${taipei < '2026-11-10' ? '在 11/10 核心 CPI 公布前，即使按规则应暂停，仍可自愿按拆两半执行。' : ''}与规则分开，不改写上面的启用或暂停。</p></div>
        </div></section>
      </div>
      <section class="panel" style="margin-top:8px"><div class="ph"><span class="t">距加仓档位</span><span class="s">标普用标普 500；纳指用纳指 100（FRED NASDAQ100），不是 QQQ</span></div><div class="pb tablewrap">
        <table><thead><tr><th>指数</th><th>收盘高点</th><th>现价回撤</th><th>档位 1</th><th>档位 2</th><th>档位 3</th></tr></thead><tbody>
          ${tierRow('标普', 'Cboe 价格指数', C.tiers.SPX)}
          ${tierRow('纳指 100', 'FRED NASDAQ100', C.tiers.NDX)}
        </tbody></table>
        <p class="hint">每档资金 = 货币基金余额的 1/3。货币基金余额暂缺，这里不编一个金额。常规定投和档位加仓是两套动作；未到档位只做定投。黄金：若组合中黄金权重跌破 12%，再平衡回 15%（组合权重暂缺，与档位无关）。不要把 SOX / 单主题回撤当成正式加仓档位。</p>
      </div></section>
      <div style="margin-top:8px">${confirmHTML()}</div>
      <div class="grid g2" style="margin-top:8px">${moodHTML(T)}${qqqHTML()}</div>
      <section class="panel" style="margin-top:8px"><div class="ph"><span class="t">QDII 执行</span><span class="s">溢价对照，不是加仓条件</span></div><div class="pb" id="audit-qdii"><p class="hint">正在读场内溢价…</p></div></section>`;
    bindEvidence();
    fillQdii();
  }

  return { render, COPY, sent1, sent2, sent3, sent4, bucket };
})();
