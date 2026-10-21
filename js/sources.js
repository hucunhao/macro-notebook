// 数据来源页
const Sources = (() => {
  function render(app){
    const S = MS.series, st = MS.meta.status || {};
    const rows = Object.entries(S).sort((a, b) => (a[1].group || '').localeCompare(b[1].group || ''));
    const age = s => { const y = (U.ts(s.end) - U.ts(s.start)) / (365.25*86400); return y; };
    app.innerHTML = `<h1>数据来源</h1>
      <p class="muted small">数据由 <code>update_data.py</code> 脚本下载并写进 <code>data/</code> 文件夹（浏览器不能直接从这些网站取数据）。本次生成：${MS.meta.generated}（台北时间）。“长度”少于 5 年的标黄。</p>
      <div class="card tablewrap"><table><thead><tr><th>指标</th><th>来源</th><th>开始</th><th>最新</th><th>长度</th><th>说明</th></tr></thead><tbody>
      ${rows.map(([k, s]) => { const y = age(s); return `<tr><td>${s.name}</td><td style="text-align:left"><a href="${s.url}" target="_blank" rel="noopener">${s.source}</a></td><td>${s.start}</td><td>${s.end}</td><td>${y < 5 ? `<span class="tag warn">${y.toFixed(1)} 年</span>` : y.toFixed(0) + ' 年'}</td><td style="text-align:left;white-space:normal;min-width:220px">${s.note || ''}</td></tr>`; }).join('')}
      </tbody></table></div>
      <h2>网页读数（不是自动序列）</h2>
      <div class="card tablewrap"><table><thead><tr><th>项目</th><th>数值</th><th>日期</th><th>来源</th></tr></thead><tbody>
      ${Object.entries(MS.manual || {}).filter(([k]) => !k.startsWith('_')).map(([k, m]) => `<tr><td>${m.name}</td><td>${U.fmtNum(m.value, 2)} ${m.unit}</td><td>${m.date}</td><td style="text-align:left"><a href="${m.url}" target="_blank" rel="noopener">${m.source}</a></td></tr>`).join('')}
      </tbody></table><p class="small muted">这几项要手动更新：改 <code>manual_values.json</code> 再运行脚本。</p></div>
      <h2>暂无数据的项目</h2>
      <div class="card"><ul style="margin:0;padding-left:20px">
        <li><b>S5TH / S5FI / MMTH（站上均线的股票比例）</b>：没找到能免费下载历史的公开来源，只在 TradingView 上能看。</li>
        <li><b>HY OAS / IG OAS / CCC 的长历史</b>：FRED 从 2026 年 4 月起这些 ICE 序列只给最近 3 年，更早的要向 ICE 购买。长历史用 BAA10Y 代替。</li>
        <li><b>黄金长历史</b>：FRED 已下架伦敦金价序列；这里用 GLD（纳斯达克网站，约 10 年）加一个网页读数。</li>
        <li><b>含分红的总回报指数</b>：没找到免费可靠来源，回撤、加仓线和季节性都用价格指数（不含分红）。</li>
        <li><b>估值和历史比</b>：没有免费、合规的长期市盈率历史，只做了今天的横截面。</li>
        <li><b>涨跌家数比</b>：交易所的涨跌家数没有免费历史；行情条上显示“暂无数据”。</li>
        <li><b>行业权重和对指数的贡献</b>：权重数据要付费，没做。</li>
        <li><b>DXY 美元指数</b>：现在用东方财富的美元指数日线（“商品汇率”页）；“全部指标”页仍保留美联储广义美元指数（FRED DTWEXBGS）。</li>
      </ul></div>
      <h2>新页面的数据来源</h2>
      <div class="card small"><ul style="margin:0;padding-left:20px">
        <li><b>全球股市、商品和汇率</b>：东方财富行情接口（push2his.eastmoney.com）日线收盘，2016 年起；布伦特原油、欧元、美元广义指数来自 FRED。期货是连续合约。</li>
        <li><b>QDII 溢价</b>：场内收盘价来自东方财富行情接口（不复权）；单位净值和规模来自东方财富基金数据（fund.eastmoney.com/pingzhongdata）。溢价 = 同一天收盘价 ÷ 同一天单位净值 − 1，2019 年起。</li>
        <li><b>经济日历</b>：FRED 发布日历（各项数据的发布日期）和美联储官网的议息会议日程，时间换算成台北时间。不含市场预期值（付费数据）。</li>
        <li><b>财报日历</b>：纳斯达克官网财报日历接口，只列标普 500 里市值 300 亿美元以上的公司。不含分析师预期。</li>
        <li><b>季节性</b>：用本站已有的标普 500（Cboe）和纳指 100（FRED）日线计算。</li>
        <li><b>做不到的</b>：实时新闻、分析师一致预期、经济数据的市场预期值都是付费数据，没有做。</li>
      </ul><p style="margin-bottom:0">这些都不需要登录，脚本的请求头写明是“个人研究脚本”，不伪装浏览器。东方财富是国内网站，GitHub 的美国服务器偶尔可能连不上；连不上时这一块沿用上次的数据，不影响其它部分。</p></div>
      <div class="card small" id="src-extra" style="margin-top:8px">正在读取新页面的抓取状态…</div>
      <h2>本次抓取状态</h2>
      <div class="card small">${Object.keys(st).length ? Object.entries(st).map(([k, v]) => `${k}：${v === 'ok' ? '成功' : v === 'skipped' ? '<span class="tag warn">按约定没有抓取，沿用上次的文件</span>' : v === 'cached' ? '<span class="tag warn">失败，沿用上次的文件</span>' : '<span class="tag r">没有数据</span>'}`).join('<br>') : '本次用离线模式重建，没有联网抓取。'}</div>
      <h2>怎么更新数据</h2>
      <div class="card small"><p>在这个文件夹里运行：<code>python3 update_data.py</code>（大约 5 分钟）。只想用已经下载好的文件重建，运行 <code>python3 update_data.py --offline</code>。运行完刷新网页即可。</p>
      <p>请求头：脚本不伪装成浏览器。FRED 用 curl 默认请求头；纳斯达克、美国财政部、Cboe 用写明“个人研究脚本”的请求头。</p>
      <p>CNN 恐惧贪婪只接受浏览器样式的请求头，所以按约定<b>默认不再抓取</b>，页面上的恐惧贪婪停在上次下载的日期（${MS.fg && MS.fg.date ? MS.fg.date : '—'}）。如果你决定接受，可以设置环境变量 <code>MS_CNN_BROWSER_UA=1</code> 再运行。</p>
      <p>收益率曲线：美国财政部每日国债平价收益率；行业：SPDR 行业 ETF（纳斯达克官网日线，约 10 年）。</p>
      <p>标普 500 成分股（HM、BR、涨跌榜、VAL、RV、GP 里的个股）：名单和 GICS 行业来自维基百科；价格、市值、分析师一致预期来自纳斯达克官网；财报来自美国 SEC EDGAR 的 XBRL frames 接口。由 <code>constituents.py</code> 每天生成一次，不是实时。${window.SP ? `本次：${SP.generated}，${SP.n} 家，价格截至 ${SP.asof}。` : '本机还没生成。'}</p>
      <p style="margin-bottom:0">SEC 和维基百科要求请求头里写联系方式，脚本用环境变量 <code>MS_CONTACT</code>（默认是这个机器人的邮箱）。</p></div>`;
    const lab = v => v === 'ok' ? '成功' : v === 'cached' ? '<span class="tag warn">失败，沿用上次的文件</span>' : '<span class="tag r">没有数据</span>';
    U.need('data/calendar.js', 'data/earnings.js', 'data/qdii.js', 'data/world.js').then(() => {
      const el = U.$('#src-extra'); if (!el) return;
      const blocks = [['全球股市 / 商品汇率', WD], ['经济日历', CAL], ['财报日历', ERN], ['QDII 溢价', QD]];
      el.innerHTML = blocks.map(([n, o]) => { const st = Object.entries(o.status || {}); const bad = st.filter(([, v]) => v !== 'ok');
        return `<b>${n}</b>：${st.length} 个请求，${bad.length ? `${bad.length} 个没成功（${bad.slice(0, 6).map(([k, v]) => `${U.esc(k)} ${lab(v)}`).join('；')}${bad.length > 6 ? '…' : ''}）` : '全部成功'}${o.generated ? `，生成于 ${o.generated}` : ''}`; }).join('<br>');
    }).catch(e => { const el = U.$('#src-extra'); if (el) el.textContent = '新页面的数据文件还没生成：' + e.message; });
  }
  return { render };
})();
