// QDII 执行层。书面定义 §7：溢价/折价、指数距档位 1/2/3、跟踪损耗、货币基金 1/3。
// 档位数字用 Observe.compute 已经算好的 tiers，这里不再定义一套门槛。
// 没有溢价时只写「暂缺」，不写该不该加。
const QdiiExec = (() => {
  const CASH_KEY = 'ms_cash_sleeve';
  const GROUPS = [
    { idx: '标普500', title: '标普 500', tierKey: 'SPX', note: '指数是 Cboe 标普 500 价格指数，不是场内基金的价格。' },
    { idx: '纳指100', title: '纳指 100', tierKey: 'NDX', note: '指数是 FRED NASDAQ100，不是 QQQ，也不是场内基金的价格。' },
  ];

  function cash(){
    const v = U.store.get(CASH_KEY, null);
    if (v == null || v === '' || isNaN(+v) || +v < 0) return null;
    return +v;
  }
  const yuan = x => Number(x).toLocaleString('zh-CN', { maximumFractionDigits: 2 });
  function ammoHTML(){
    const b = cash();
    if (b == null) return '每一档弹药：<b>暂缺</b>。还没记货币基金余额，不算 1/3，也不估能买多少。';
    return `货币基金余额 <b>${yuan(b)}</b> 元。每一档用掉 1/3，约 <b>${yuan(b / 3)}</b> 元。这只是记在这台浏览器里的账，不是下单。`;
  }
  const fp = x => x == null || isNaN(x) ? null : (x > 0 ? '+' : '') + x.toFixed(2) + '%';
  const premClass = p => p == null ? '' : p > 10 ? 'rr' : p > 5 ? 'r' : p > 3 ? 'y' : 'g';
  const premOf = f => (f.prem && f.prem.length) ? U.last(f.prem) : null;
  const premDate = f => (f.d && f.d.length) ? U.last(f.d) : null;

  function tierLine(t, x){
    if (!t) return `−${x}%：指数暂缺`;
    const hit = -t.dd * 100 >= x - 1e-9;
    if (hit) return `−${x}%：<b>已到</b>（指数现价已经在这条书面档位上或更深）`;
    const fall = t.high * (1 - x / 100) / t.last - 1;
    const px = t.high * (1 - x / 100);
    return `−${x}%：指数还要再跌 ${Math.abs(fall * 100).toFixed(1)}%（约 ${U.fmtNum(px, 0)}）`;
  }
  function indexBlock(meta, t){
    if (!t) return `<p>指数暂缺。没有指数收盘，就不写距档位还差多少。</p>`;
    return `<p class="small" style="margin:0">${U.esc(meta.note)}</p>
      <p class="small">现价 <b>${U.fmtNum(t.last, 2)}</b>（${U.esc(t.date)}），收盘高点 ${U.fmtNum(t.high, 2)}（${U.esc(t.highDate)}），回撤 ${U.pct(t.dd)}。</p>
      <ol class="qdii-tiers">${t.tiers.map(x => `<li>${tierLine(t, x)}</li>`).join('')}</ol>
      <p class="hint">这是指数离书面档位还有多远，不是「该加仓」。加仓仍只看档位规则本身；溢价只说明场内贵不贵。</p>`;
  }

  function srcBits(f){
    const bits = [];
    if (f.stale || f.px_src === 'cache') bits.push('收盘沿用上次');
    else if (f.px_src === 'tencent') bits.push('收盘用腾讯备用');
    else if (f.px_src === 'eastmoney') bits.push('收盘·东财');
    if (f.nav_src === 'sina') bits.push('净值·新浪');
    else if (f.nav_src === 'eastmoney_lsjz') bits.push('净值·东财接口');
    else if (f.nav_src === 'cache') bits.push('净值沿用上次');
    return bits.join('，') || '收盘·东财';
  }
  function badge(f){
    if (f.stale) return U.staleTag('未更新', '东方财富行情和腾讯备用都没有更新的收盘。表上的溢价是上次同一天的收盘和净值算的，不是新编的价格。');
    if (f.px_src === 'tencent') return U.staleTag('备用源', '东方财富行情没抓到。这天的收盘用腾讯未复权日线补上，只补原来没有的日期。溢价仍要同一天有单位净值。');
    return '';
  }

  function groupHTML(meta, tiers){
    const funds = (window.QD && QD.funds) ? QD.funds.filter(f => f.idx === meta.idx) : [];
    const t = tiers && tiers[meta.tierKey];
    const known = funds.map(f => ({ f, p: premOf(f), d: premDate(f) })).filter(x => x.p != null && isFinite(x.p));
    const med = known.length ? U.median(known.map(x => x.p)) : null;
    let premHead;
    if (!funds.length) premHead = `<p class="audit-sent">溢价暂缺。没有这组基金的溢价，这里不暗示该加仓。</p>`;
    else if (!known.length) premHead = `<p class="audit-sent">溢价暂缺。${funds.length} 只都没有能算的溢价，这里不暗示该加仓。</p>`;
    else {
      const miss = funds.length - known.length;
      premHead = `<p class="small" style="margin-top:0">场内中位溢价 <b class="prem ${premClass(med)}">${fp(med)}</b>（${known.length} 只有数${miss ? `，${miss} 只暂缺` : ''}）。${miss ? '缺溢价的那几只不能拿来判断场内贵不贵。' : '溢价只说明场内比净值贵还是便宜，不触发加仓。'}</p>`;
    }
    const rows = funds.map(f => {
      const p = premOf(f), d = premDate(f);
      const gap = f.last_close_date && d && f.last_close_date > d;
      const premCell = p == null ? '<b>暂缺</b>' : `<span class="prem ${premClass(p)}">${fp(p)}</span>`;
      return `<tr>
        <td><b>${U.esc(f.code)}</b>${badge(f)}</td>
        <td style="text-align:left">${U.esc((f.name || '').replace(/[(（]QDII.*$/, ''))}${f.type === 'LOF' ? ' LOF' : ''}</td>
        <td>${premCell}</td>
        <td>${d || '—'}</td>
        <td>${f.last_close == null ? '—' : Number(f.last_close).toFixed(3)}</td>
        <td>${U.esc(f.last_close_date || '—')}${gap ? '<br><span class="muted small">净值未到，不算新溢价</span>' : ''}</td>
        <td style="text-align:left" class="small">${U.esc(srcBits(f))}</td>
      </tr>`;
    }).join('');
    const table = funds.length ? `<div class="tablewrap"><table class="tbl-compact"><thead><tr><th>代码</th><th style="text-align:left">名称</th><th>溢价/折价</th><th>溢价日</th><th>收盘</th><th>收盘日</th><th style="text-align:left">来源</th></tr></thead><tbody>${rows}</tbody></table></div>` : '';
    return `<div class="card" style="padding:8px 10px">
      <div class="small"><b>${meta.title} 相关场内基金</b></div>
      ${indexBlock(meta, t)}
      ${premHead}
      ${table}
    </div>`;
  }

  function banner(){
    if (!window.QD || !QD.funds) return '';
    const F = QD.funds;
    const backup = F.filter(f => f.px_src === 'tencent').length;
    const stale = F.filter(f => f.stale).length;
    const navAlt = F.filter(f => f.nav_src === 'sina' || f.nav_src === 'eastmoney_lsjz').length;
    const bits = [];
    if (backup) bits.push(`收盘：${backup} 只里，东方财富行情没抓到的日期用腾讯未复权日线补上了（只补原来没有的日子，旧收盘不改）。`);
    if (stale) bits.push(`${stale} 只仍标「未更新」：备用源也没拿到更新的收盘，数字是上次的，不是新编的价格。`);
    if (navAlt) bits.push(`净值：${navAlt} 只用了备用接口（东财净值表或新浪），因为 pingzhong 那份没更新。`);
    if (QD.session && window.MS && MS.meta && MS.meta.newest && QD.session < MS.meta.newest && !backup) bits.push(`这批溢价对应的抓取日 ${QD.session}，早于美股数据 ${MS.meta.newest}。`);
    if (!bits.length) return '';
    return `<div class="weak">${bits.join('')}</div>`;
  }

  function html(tiers){
    const loaded = !!(window.QD && QD.funds);
    const asof = loaded ? (QD.asof || '—') : '—';
    const fresh = loaded ? U.fresh(QD.asof, { session: QD.session, partial: QD.funds.filter(f => f.stale).length }) : '';
    const body = loaded ? `<div class="breadth-lists">${GROUPS.map(g => groupHTML(g, tiers)).join('')}</div>` : `<p class="audit-sent">溢价暂缺。溢价文件没加载到，这里不暗示该加仓。指数距档位仍写在下面（那是指数，不是买入指令）。</p>
      <div class="breadth-lists">${GROUPS.map(g => `<div class="card" style="padding:8px 10px"><div class="small"><b>${g.title}</b></div>${indexBlock(g, tiers && tiers[g.tierKey])}</div>`).join('')}</div>`;
    const saved = cash();
    return `<section class="panel" id="qdii-exec">
      <div class="ph"><span class="t">QDII 执行</span><span class="s">溢价，以及指数离书面档位还有多远</span><span class="r">${fresh}</span></div>
      <div class="pb">
        <p class="small" style="margin-top:0">看的是标普、纳指相关的场内 QDII。溢价 = 同一天收盘价 ÷ 同一天单位净值 − 1。没有同一天的两边，就不算溢价，也不编一个价格。目标配置里的标普/纳指是场外 QDII（按净值申购，没有这层溢价）。数据截至 ${U.esc(asof)}。<a href="#/qdii">溢价走势页</a></p>
        ${banner()}
        ${body}
        <p class="small">跟踪损耗：<b>暂缺</b>。没有基金净值相对指数的偏差序列，这里不估算隐形损耗。</p>
        <div class="setrow"><span>货币基金余额（元，只存在这台浏览器）</span><input type="number" min="0" step="any" data-cash placeholder="留空就是暂缺" value="${saved == null ? '' : saved}" aria-label="货币基金余额"></div>
        <p class="small" data-ammo>${ammoHTML()}</p>
        <p class="hint">书面档位：标普 −10/−20/−30，纳指 −15/−25/−35，每档用货币基金余额的 1/3。上面的「还要再跌」和「距加仓档位」表是同一套指数、同一套门槛。</p>
      </div>
    </section>`;
  }

  function bind(el){
    const inp = el.querySelector('[data-cash]');
    if (!inp) return;
    inp.onchange = () => {
      const raw = inp.value.trim();
      if (raw === '') U.store.set(CASH_KEY, null);
      else if (!isNaN(+raw) && +raw >= 0) U.store.set(CASH_KEY, +raw);
      else return;
      const out = el.querySelector('[data-ammo]');
      if (out) out.innerHTML = ammoHTML();
    };
  }

  function mount(el, tiers){
    const draw = () => { if (!el.isConnected) return; el.innerHTML = html(tiers); bind(el); };
    if (window.QD && QD.funds){ draw(); return; }
    el.innerHTML = '<p class="hint">正在读场内溢价…</p>';
    U.need('data/qdii.js').then(draw).catch(() => { if (el.isConnected) draw(); });
  }

  return { mount, html, CASH_KEY };
})();
