// 标普 / 纳指指数期权的伽马敞口。只读 data/gex.js，不在浏览器里拉期权链。
// 必须挂在 window 上。const 顶层绑定不会变成 window 属性，路由就进不了这一页。
window.Gex = (() => {
  const FORMULA = 'sign × gamma × open_interest × 100 × spot² × 0.01';

  function money(x) {
    if (x == null || !isFinite(+x)) return { short: '—', full: '—' };
    const n = Math.round(+x);
    const sign = n > 0 ? '+' : n < 0 ? '-' : '';
    const a = Math.abs(n);
    const full = sign + a.toLocaleString('zh-CN') + ' 美元';
    let short = full;
    if (a >= 1e12) short = sign + (a / 1e12).toFixed(2) + ' 万亿美元';
    else if (a >= 1e8) short = sign + (a / 1e8).toFixed(2) + ' 亿美元';
    else if (a >= 1e4) short = sign + (a / 1e4).toFixed(2) + ' 万美元';
    return { short, full };
  }

  function strikeText(x) {
    if (x == null || !isFinite(+x)) return '—';
    const n = +x;
    const digits = Math.abs(n - Math.round(n)) < 1e-6 ? 0 : 1;
    return n.toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  function clause(ix) {
    const name = ((ix && ix.name) || '指数') + ' 的指数期权';
    if (!ix || ix.status !== 'ok' || !ix.windows || !ix.windows.all) return name + '暂无可用数据';
    const w = ix.windows.all;
    let where;
    if (w.flip == null || w.flip_status === 'none' || w.flip_status === 'undefined') {
      where = w.flip_status === 'none' ? '在现货的 60%–140% 内没有零伽马翻转点' : '零伽马翻转点算不出';
    } else if (w.spot_vs_flip === 'above') where = '现货在零伽马翻转点之上';
    else if (w.spot_vs_flip === 'below') where = '现货在零伽马翻转点之下';
    else if (w.spot_vs_flip === 'at') where = '现货就在零伽马翻转点上';
    else where = '零伽马翻转点算不出';
    if (w.flip_status === 'multiple') where += '（这个范围内还有别的翻转点，说的是离现货最近的一个）';
    if (w.sign === 'positive') return name + '是正伽马，' + where;
    if (w.sign === 'negative') return name + '是负伽马，' + where;
    if (w.sign === 'zero') return name + '净伽马为零，' + where;
    return name + '伽马算不出，' + where;
  }

  function lead(data) {
    const ix = (data && data.indices) || {};
    return clause(ix.SPX) + '；' + clause(ix.NDX) + '。';
  }

  function win(key, w) {
    if (!w || w.contracts_used === 0) {
      return `<div class="gex-win" data-window="${U.esc(key)}"><div class="gex-k">${w ? U.esc(w.label) : '—'}</div><div class="gex-empty">这个范围没有未到期合约</div></div>`;
    }
    const m = money(w.net_gex);
    const cls = w.sign === 'positive' ? 'pos' : w.sign === 'negative' ? 'neg' : '';
    const flip = w.flip == null ? '算不出' : U.fmtNum(w.flip, 2);
    const call = w.call_wall ? strikeText(w.call_wall.strike) : '没有';
    const put = w.put_wall ? strikeText(w.put_wall.strike) : '没有';
    const extra = w.flip_status === 'multiple' ? `<div class="gex-sub">还有 ${w.flip_roots.length} 个</div>` : '';
    return `<div class="gex-win" data-window="${U.esc(key)}">
      <div class="gex-k">${U.esc(w.label)}</div>
      <div class="gex-num ${cls}" data-field="net" data-net="${w.net_gex == null ? '' : w.net_gex}">${m.short}</div>
      <div class="gex-full">${m.full === m.short ? '' : m.full}</div>
      <div class="gex-sub">每涨跌 1%</div>
      <div class="gex-line"><span>翻转点</span><b data-field="flip" data-flip="${w.flip == null ? '' : w.flip}">${flip}</b></div>
      ${extra}
      <div class="gex-line"><span>看涨墙</span><b>${call}</b></div>
      <div class="gex-line"><span>看跌墙</span><b>${put}</b></div>
    </div>`;
  }

  function panel(ix) {
    if (!ix) return '';
    const proxy = ix.not_proxy ? `不是 ${ix.not_proxy}` : '';
    if (ix.status !== 'ok' || !ix.windows) {
      return `<article class="gex-card" data-symbol="${U.esc(ix.id || '')}" data-stale="${ix.stale ? '1' : '0'}">
        <h2>${U.esc(ix.name || '')} 指数期权</h2>
        <p class="gex-missing">暂无可用的指数期权链。${proxy ? U.esc(proxy) + '，也没有拿它当代理。' : ''}${ix.stale_reason ? ' ' + U.esc(ix.stale_reason) : ''}</p>
      </article>`;
    }
    const kind = ix.stale
      ? '这次没抓到，下面仍是上次的快照，行情时间没有往前拨'
      : (ix.is_daily_close ? '每日收盘' : '盘中快照，不是每日收盘');
    const cov = ix.coverage;
    const covLine = cov ? `计入 ${cov.used} 张，去掉已到期 ${cov.expired} 张` : '';
    const order = ['all', 'd7', 'd30'];
    return `<article class="gex-card" data-symbol="${U.esc(ix.id)}" data-source="${U.esc(ix.source_symbol || '')}" data-stale="${ix.stale ? '1' : '0'}" data-close="${ix.is_daily_close ? '1' : '0'}">
      <header>
        <h2>${U.esc(ix.name)} 指数期权</h2>
        <div class="gex-spot">现货 <b>${ix.spot == null ? '—' : U.fmtNum(ix.spot, 2)}</b> <span class="muted">${U.esc(proxy)}</span></div>
      </header>
      <p class="gex-when">${U.esc(kind)} · 行情 ${U.esc(ix.quote_timestamp_utc || '—')} UTC（美东 ${U.esc(ix.quote_timestamp_et || '—')}）<br>计算 ${U.esc(ix.computed_at || '—')} 台北 · 成交 ${U.esc(ix.last_trade_time || '无')}（按美东）</p>
      <div class="gex-wins">${order.map(k => win(k, ix.windows[k])).join('')}</div>
      <p class="gex-cov muted">${U.esc(covLine)}${ix.stale && ix.stale_reason ? ' · ' + U.esc(ix.stale_reason) : ''}</p>
    </article>`;
  }

  function alerts(data) {
    const lines = [
      '未平仓量在链上没有单独日期，通常比成交价晚一个交易日。这里不编这个日期。',
    ];
    const closes = data.closes || {};
    const nSpx = (closes.SPX || []).length;
    const nNdx = (closes.NDX || []).length;
    if (nSpx < 10 || nNdx < 10) {
      lines.unshift(`收盘历史还很短：标普 ${nSpx} 天，纳指 ${nNdx} 天。没有补造更早的记录。`);
    }
    Object.values(data.indices || {}).forEach(ix => {
      (ix.warnings || []).forEach(w => { if (w && w.level === 'prominent' && w.text) lines.push(w.text); });
      if (ix.stale) lines.push((ix.name || ix.id) + ' 这次抓取失败，仍显示上次成功的数字。' + (ix.stale_reason ? ' ' + ix.stale_reason : ''));
    });
    return `<div class="gex-alert" id="gex-alerts">${lines.map(t => `<p>${U.esc(t)}</p>`).join('')}</div>`;
  }

  function strikeTable(rows) {
    if (!rows || !rows.length) return '<p class="muted">没有可列的行权价。</p>';
    const body = rows.map(r => `<tr><td>${strikeText(r.strike)}</td><td class="num">${money(r.call_gex).short}</td><td class="num">${money(r.put_gex).short}</td><td class="num">${money(r.net_gex).short}</td><td class="num">${r.call_oi == null ? '—' : r.call_oi.toLocaleString('zh-CN')}</td><td class="num">${r.put_oi == null ? '—' : r.put_oi.toLocaleString('zh-CN')}</td></tr>`).join('');
    return `<table class="tbl-compact"><thead><tr><th>行权价</th><th>看涨</th><th>看跌</th><th>净额</th><th>看涨未平仓</th><th>看跌未平仓</th></tr></thead><tbody>${body}</tbody></table>`;
  }

  function strikes(data) {
    const blocks = ['SPX', 'NDX'].map(id => {
      const ix = data.indices[id];
      if (!ix || !ix.windows) return `<section><h3>${U.esc((ix && ix.name) || id)}</h3><p>没有行权价明细。</p></section>`;
      const bits = ['all', 'd7', 'd30'].map(k => {
        const w = ix.windows[k];
        const shown = w ? w.strikes_shown : 0;
        const total = w ? w.strikes_total : 0;
        return `<details><summary>${U.esc(w ? w.label : k)}（列出 ${shown} / ${total} 个行权价）</summary>${strikeTable(w && w.strikes)}</details>`;
      }).join('');
      const roots = ix.coverage && ix.coverage.roots ? Object.entries(ix.coverage.roots).map(([k, n]) => `${k} ${n}`).join('，') : '';
      return `<section data-strikes="${id}"><h3>${U.esc(ix.name)}</h3><p class="muted">前缀：${U.esc(roots || '—')}。表按净额绝对值从大到小取，再按行权价排，不是整条链。</p>${bits}</section>`;
    }).join('');
    return `<details id="gex-strikes"><summary>行权价明细</summary>${blocks}</details>`;
  }

  function history(data) {
    const rows = ['SPX', 'NDX'].map(id => {
      const list = (data.closes && data.closes[id]) || [];
      if (!list.length) return `<p>${id === 'SPX' ? '标普' : '纳指'}还没有每日收盘。</p>`;
      const body = list.map(c => `<tr><td>${U.esc(c.session_date)}</td><td>${U.esc(c.sign === 'positive' ? '正' : c.sign === 'negative' ? '负' : c.sign === 'zero' ? '零' : '算不出')}</td><td class="num">${money(c.net_gex).short}</td><td class="num">${c.flip == null ? '算不出' : U.fmtNum(c.flip, 2)}</td><td>${U.esc(c.spot_vs_flip === 'above' ? '现货在上' : c.spot_vs_flip === 'below' ? '现货在下' : c.spot_vs_flip === 'at' ? '就在点上' : '—')}</td><td class="num">${c.spot == null ? '—' : U.fmtNum(c.spot, 2)}</td></tr>`).join('');
      return `<h3>${id === 'SPX' ? '标普 500' : '纳斯达克 100'}</h3><table class="tbl-compact"><thead><tr><th>收盘日</th><th>符号</th><th>净敞口</th><th>翻转点</th><th>现货位置</th><th>现货</th></tr></thead><tbody>${body}</tbody></table>`;
    }).join('');
    const events = (data.events || []).map(e => {
      if (e.type === 'sign_switch') {
        return `<li>${U.esc(e.symbol)} 符号：${U.esc(e.prior_date)} ${U.esc(e.prior_sign)}（${money(e.prior_net_gex).short}）→ ${U.esc(e.current_date)} ${U.esc(e.current_sign)}（${money(e.current_net_gex).short}）</li>`;
      }
      return `<li>${U.esc(e.symbol)} 穿越翻转点：${U.esc(e.prior_date)} 现货 ${U.fmtNum(e.prior_spot, 2)} 相对 ${U.fmtNum(e.prior_flip, 2)}（${U.esc(e.prior_relation)}）→ ${U.esc(e.current_date)} 现货 ${U.fmtNum(e.current_spot, 2)} 相对 ${U.fmtNum(e.current_flip, 2)}（${U.esc(e.current_relation)}）</li>`;
    }).join('');
    const eventBlock = events ? `<ul>${events}</ul>` : '<p>还没有符号切换或翻转点穿越。要有两个收盘才能比较。</p>';
    return `<details id="gex-history"><summary>每日收盘和切换</summary>${rows}${eventBlock}</details>`;
  }

  function method(data) {
    const m = (data && data.method) || {};
    const rows = Object.values(m).map(t => `<li>${U.esc(t)}</li>`).join('');
    return `<details id="gex-method"><summary>计算规则</summary><ul>${rows}</ul></details>`;
  }

  function render(app) {
    const data = window.GEX;
    if (!data || !data.indices) {
      app.innerHTML = '<div class="nodata" id="gex-mon">还没有指数期权快照。没有用别的品种代替。</div>';
      return;
    }
    const ix = data.indices;
    const fixture = data.fixture ? `<p class="gex-alert" id="gex-fixture">这是测试夹具，不是市场数据。</p>` : '';
    app.innerHTML = `<section id="gex-mon">
      <h1>指数期权伽马</h1>
      <p id="gex-lead" class="gex-lead">${U.esc(lead(data))}</p>
      <p id="gex-note">这是模型，不是交易所的做市商持仓。假设做市商多看涨、空看跌。负伽马只表示在这个假设下，对冲可能放大波动，不表示会涨还是会跌。别的模型美元金额可能差很多，本站只保证自己这套算法前后一致。不构成投资建议。</p>
      ${fixture}
      ${alerts(data)}
      <div class="gex-panels">${panel(ix.SPX)}${panel(ix.NDX)}</div>
      <div class="card gex-formula" id="gex-formula">
        <p>公式：<code>${FORMULA}</code>（看涨为正，看跌为负）。上面这句话用的是全部到期。</p>
        <p>来源是 CBOE 公开延迟行情，大约 15 分钟，不是即时成交。页面不直接向 CBOE 要数据。</p>
      </div>
      ${strikes(data)}
      ${history(data)}
      ${method(data)}
    </section>`;
  }

  return { render, lead, money };
})();
