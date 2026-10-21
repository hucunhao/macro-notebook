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
    if (!['learn','notes','sources','mkt','fi','cr','gp','val','hm','br','rv','all'].includes(r)) r = 'observe';
    U.$$('#nav a').forEach(x => x.classList.toggle('on', x.dataset.r === r));
    app.innerHTML = '';
    app.classList.toggle('wide', !['learn','notes','sources'].includes(r));
    window.scrollTo(0, 0);
    try {
      if (r === 'learn') Learn.render(app, a);
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
  Settings.onChange(() => { const h = location.hash; if (!h || h === '#' || h.startsWith('#/observe') || h.startsWith('#/all')) { const y = scrollY; route(); scrollTo(0, y); } });
  // 跳转菜单：按 / 打开，输入筛选，回车跳转
  const CMDS = [['HOME','总览','#/observe'],['MKT','市场：行情、行业、涨跌榜','#/mkt'],['FI','债券：收益率曲线','#/fi'],['CR','信用：利差和 C 规则','#/cr'],['GP','技术：相对强弱、均线、MACD','#/gp'],['VAL','估值','#/val'],['HM','热力图','#/hm'],['BR','广度','#/br'],['RV','同业比较','#/rv'],
    ['LRN','学习：第 1 周 回撤和分档','#/learn/1'],['LRN2','学习：第 2 周 信用利差 z 分数','#/learn/2'],['LRN3','学习：第 3 周 信用和 VIX 规则检验','#/learn/3'],['ALL','全部指标（原观察页）','#/all'],['NOTE','笔记','#/notes'],['SRC','数据来源','#/sources'],['SET','门槛设置',null]];
  function openCmd(){
    if (U.$('.cmd')) return;
    const m = document.createElement('div'); m.className = 'cmd';
    m.innerHTML = `<div class="box"><input placeholder="输入功能代码（如 FI、HM）或中文名，回车跳转；Esc 关闭" aria-label="跳转到"><div class="list"></div></div>`;
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
  document.addEventListener('keydown', e => { if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){ e.preventDefault(); openCmd(); } });
  route();
})();
