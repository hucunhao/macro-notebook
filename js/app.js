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
    const [r, a] = h.split('/');
    U.$$('#nav a').forEach(x => x.classList.toggle('on', x.dataset.r === r));
    app.innerHTML = '';
    window.scrollTo(0, 0);
    try {
      if (r === 'learn') Learn.render(app, a);
      else if (r === 'notes') Notes.render(app);
      else if (r === 'sources') Sources.render(app);
      else Observe.render(app);
    } catch(e){ console.error(e); app.innerHTML = `<div class="nodata">页面出错：${U.esc(e.message)}</div>`; }
  }
  window.addEventListener('hashchange', route);
  const themeBtn = U.$('#btn-theme');
  const setThemeLabel = () => themeBtn.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? '浅色' : '深色';
  themeBtn.onclick = () => { const d = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'; document.documentElement.setAttribute('data-theme', d); U.store.set('ms_theme', d); try { localStorage.setItem('ms_theme', d); } catch(e){} setThemeLabel(); const y = scrollY; route(); scrollTo(0, y); };
  setThemeLabel();
  U.$('#btn-settings').onclick = () => Settings.open();
  U.$('#drawer').onclick = e => { if (e.target.id === 'drawer') Settings.close(); };
  // 门槛改动后：观察页立即重算（保持滚动位置）
  Settings.onChange(() => { const h = location.hash; if (!h || h.startsWith('#/observe') || h === '#') { const y = scrollY; route(); scrollTo(0, y); } });
  route();
})();
