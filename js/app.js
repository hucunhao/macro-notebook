// 页面路由和初始化
(function(){
  const app = U.$('#app');
  if (!window.MS){ app.innerHTML = '<div class="nodata">没找到数据文件 data/series.js。请先运行 python3 update_data.py。</div>'; return; }
  // 最新的数据日期（用于判断哪条数据更新慢）
  MS.meta.newest = Object.values(MS.series).filter(s => ['SPX','UST10','VIX'].includes(s.id) || true).map(s => s.end).filter(Boolean).sort().pop();
  const core = ['SPX','UST10','VIX'].map(k => MS.series[k] && MS.series[k].end).filter(Boolean).sort();
  if (core.length) MS.meta.newest = core[core.length-1];
  U.$('#foot-data').textContent = `数据截至 ${MS.meta.newest}，生成于 ${MS.meta.generated}（台北时间）。`;
  function route(){
    const h = location.hash.replace(/^#\/?/, '') || 'observe';
    let [r, a] = h.split('/');
    if (r === 'markets') r = 'mkt'; if (r === 'lrn') r = 'learn';
    if (!['learn','notes','sources','mkt','world','fi','cr','cmd','cal','ern','qdii','seas','gp','val','hm','br','rv','all','audit','brief'].includes(r)) r = 'observe';
    U.$$('#nav a').forEach(x => x.classList.toggle('on', x.dataset.r === r));
    U.$('#nav-more>button').classList.toggle('on', !!U.$(`#nav-more a[data-r="${r}"]`)); U.$('#nav-more').classList.remove('open');
    app.innerHTML = '';
    app.classList.toggle('wide', !['learn','notes','sources','brief'].includes(r));
    window.scrollTo(0, 0);
    try {
      if (r === 'learn') app.innerHTML = `<div class="card" style="max-width:640px;margin:40px auto"><h1>学习内容搬家了</h1><p>第 1–3 周的课程和以后的新内容，都放到了单独的学习网站：</p><p><a class="btn primary" href="https://hucunhao.github.io/quant-learning/" target="_blank" rel="noopener">打开 Quant Learning ↗</a></p><p class="muted small">这个网站（Market Dashboard）只保留每天看盘用的面板。</p></div>`;
      else if (r === 'world') Pages3.world(app);
      else if (r === 'cmd') Pages3.cmdty(app);
      else if (r === 'cal') Pages3.cal(app);
      else if (r === 'ern') Pages3.ern(app);
      else if (r === 'qdii') Pages3.qdii(app);
      else if (r === 'seas') Pages3.seas(app);
      else if (r === 'notes') Notes.render(app);
      else if (r === 'sources') Sources.render(app);
      else if (r === 'mkt') Markets.mkt(app);
      else if (r === 'fi') Markets.fi(app);
      else if (r === 'gp') Markets.gp(app);
      else if (r === 'cr') Pages2.cr(app);
      else if (r === 'val') Pages2.val(app);
      else if (r === 'hm') Pages2.hm(app);
      else if (r === 'br') Pages2.br(app);
      else if (r === 'rv') Pages2.rv(app, a);
      else if (r === 'all') Observe.render(app);
      else if (r === 'audit') Audit.render(app);
      else if (r === 'brief') Brief.render(app, a);
      else Home.render(app);
    } catch(e){ console.error(e); app.innerHTML = `<div class="nodata">页面出错：${U.esc(e.message)}</div>`; }
  }
  window.addEventListener('hashchange', route);
  const themeBtn = U.$('#btn-theme');
  // 默认是终端风格深色；“浅色”是原来的纸张配色
  const isLight = () => document.documentElement.getAttribute('data-theme') === 'light';
  const setThemeLabel = () => themeBtn.textContent = isLight() ? '深色' : '浅色';
  themeBtn.onclick = () => { const d = isLight() ? 'dark' : 'light'; document.documentElement.setAttribute('data-theme', d); U.store.set('ms_theme', d); try { localStorage.setItem('ms_theme', d); } catch(e){} setThemeLabel(); const y = scrollY; route(); scrollTo(0, y); };
  setThemeLabel();
  U.$('#btn-settings').onclick = () => Settings.open();
  U.$('#drawer').onclick = e => { if (e.target.id === 'drawer') Settings.close(); };
  // 门槛改动后：观察页立即重算（保持滚动位置）
  Settings.onChange(() => { const h = location.hash; if (!h || h === '#' || h.startsWith('#/observe') || h.startsWith('#/all') || h.startsWith('#/audit')) { const y = scrollY; route(); scrollTo(0, y); } });
  // 跳转菜单：按 / 打开，输入筛选，回车跳转
  const CMDS = [['AUDIT','可审计一页：规则和情绪','#/audit'],['BRIEF','早报','#/brief'],['HOME','总览','#/observe'],['US','美股：行情、行业、涨跌榜','#/mkt'],['WEI','全球股市：美欧日港 A 股','#/world'],['HM','热力图：标普 500 每只股票','#/hm'],
    ['GC','利率曲线：各期限美债收益率、倒挂历史','#/fi'],['CR','信用：企业借钱的额外成本','#/cr'],['CMD','商品和汇率：黄金、原油、美元、人民币','#/cmd'],
    ['ECO','经济日历：CPI、非农、美联储会议','#/cal'],['ERN','财报日历：大公司哪天发财报','#/ern'],['QDII','QDII 溢价：纳指和标普场内基金','#/qdii'],['SEAS','季节性：每个月历史上涨跌','#/seas'],
    ['GP','技术和相对强弱：均线、MACD','#/gp'],['VAL','估值：各行业市盈率','#/val'],['BR','广度：多少股票站上均线','#/br'],['RV','同业比较：一家公司和同行','#/rv'],
    ['ALL','全部指标','#/all'],['NOTE','笔记','#/notes'],['SRC','数据来源','#/sources'],['SET','门槛设置',null]];
  function openCmd(){
    if (U.$('.cmd')) return;
    const m = document.createElement('div'); m.className = 'cmd';
    m.innerHTML = `<div class="box"><input placeholder="输入中文名或缩写（如 日历、QDII），回车跳转；Esc 关闭" aria-label="跳转到"><div class="list"></div></div>`;
    document.body.appendChild(m);
    const inp = U.$('input', m), list = U.$('.list', m); let sel = 0, cur = CMDS;
    const go = c => { m.remove(); if (c[2]) location.hash = c[2]; else Settings.open(); };
    const paint = () => { list.innerHTML = cur.map((c, i) => `<div class="it ${i === sel ? 'on' : ''}" data-i="${i}"><span class="code">${c[0]}</span><span>${c[1]}</span></div>`).join('') || '<div class="it">没有匹配</div>';
      U.$$('.it[data-i]', list).forEach(el => el.onclick = () => go(cur[+el.dataset.i])); };
    inp.oninput = () => { const q = inp.value.trim(); const Q = q.toUpperCase(); cur = CMDS.filter(c => !q || c[0].startsWith(Q) || c[1].includes(q)); cur.sort((a, b) => (b[0] === Q) - (a[0] === Q)); sel = 0; paint(); };
    inp.onkeydown = e => { if (e.key === 'ArrowDown'){ sel = Math.min(cur.length - 1, sel + 1); paint(); e.preventDefault(); } else if (e.key === 'ArrowUp'){ sel = Math.max(0, sel - 1); paint(); e.preventDefault(); } else if (e.key === 'Enter' && cur[sel]) go(cur[sel]); else if (e.key === 'Escape') m.remove(); };
    m.onclick = e => { if (e.target === m) m.remove(); };
    paint(); inp.focus();
  }
  U.$('#btn-cmd').onclick = openCmd;
  // 导航“更多”下拉
  const more = U.$('#nav-more'), mb = U.$('button', more), menu = U.$('.menu', more);
  mb.onclick = e => { e.stopPropagation(); more.classList.toggle('open'); const r = mb.getBoundingClientRect(); menu.style.left = Math.min(r.left, innerWidth - 170) + 'px'; menu.style.top = (r.bottom + 4) + 'px'; };
  document.addEventListener('click', e => { if (!more.contains(e.target)) more.classList.remove('open'); });
  U.initTips();
  document.addEventListener('keydown', e => { if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){ e.preventDefault(); openCmd(); } });
  route();
})();
