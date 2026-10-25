// 早报：#/brief 永远打开最新一期全文，#/brief/YYYY-MM-DD 打开那一天
const Brief = (() => {
  const BASE = 'content/briefs/';
  const DATE = /^\d{4}-\d{2}-\d{2}$/;
  let token = 0;

  function alive(my){
    if (my !== token) return false;
    const r = (location.hash || '').replace(/^#\/?/, '').split('/')[0];
    return r === 'brief';
  }

  function fileHint(){
    return '早报是单独的文件。直接双击打开网页时，浏览器不让读取。请用发布后的地址，或在仓库目录运行 python3 -m http.server 后再打开。';
  }

  async function get(url){
    let res;
    try { res = await fetch(url, { cache: 'no-cache' }); }
    catch (e) {
      const err = new Error(location.protocol === 'file:' ? fileHint() : '早报加载失败。');
      err.cause = e;
      throw err;
    }
    if (!res.ok) {
      const err = new Error(res.status === 404 ? 'notfound' : '早报加载失败（' + res.status + '）。');
      err.status = res.status;
      throw err;
    }
    return res;
  }

  function oneLiner(x){
    if (!x) return '';
    if (typeof x.summary === 'string') return x.summary.trim();
    if (typeof x.title === 'string') return x.title.trim();
    return '';
  }

  async function renderMd(src){
    if (!window.marked || typeof marked.parse !== 'function' || !window.DOMPurify || typeof DOMPurify.sanitize !== 'function') {
      throw new Error('Markdown 组件没有加载。');
    }
    let raw = marked.parse(src, { gfm: true, breaks: false });
    if (raw && typeof raw.then === 'function') raw = await raw;
    const clean = DOMPurify.sanitize(String(raw), { USE_PROFILES: { html: true } });
    return clean.replace(/<table\b/gi, '<div class="tablewrap"><table').replace(/<\/table>/gi, '</table></div>');
  }

  function layout(o){
    const items = (o.items || []).filter(x => x && DATE.test(x.date)).slice().sort((a, b) => b.date.localeCompare(a.date));
    const rows = items.map(x => {
      const sum = oneLiner(x);
      const on = x.date === o.day;
      const current = on && !o.isLatestRoute;
      return `<a class="brief-item${on ? ' on' : ''}" href="#/brief/${x.date}"${current ? ' aria-current="page"' : ''}><span class="d">${U.esc(x.date)}</span>${sum ? `<span class="s">${U.esc(sum)}</span>` : ''}</a>`;
    }).join('');
    const latestOn = o.isLatestRoute ? ' on' : '';
    const latestRow = `<a class="brief-item${latestOn}" href="#/brief"${o.isLatestRoute ? ' aria-current="page"' : ''}><span class="d">最新</span>${o.latestDate ? `<span class="s">${U.esc(o.latestDate)}</span>` : ''}</a>`;
    const archive = latestRow + (rows || '<p class="muted small">还没有往期。</p>');
    const dayBit = o.day ? `<span class="s">${U.esc(o.day)}${o.day === o.latestDate ? ' · 最新一期' : ''}</span>` : '';
    const back = !o.isLatestRoute ? '<a href="#/brief">打开最新</a>' : '';
    const article = o.error
      ? `<div class="nodata">${U.esc(o.error)}</div>`
      : `<article class="brief-body">${o.body || ''}</article>`;
    return `<div class="brief-kicker"><h1>早报</h1>${dayBit}${back}</div><div class="brief-page">${article}<aside class="brief-side"><h2>往期</h2>${archive}</aside></div>`;
  }

  async function build(want){
    let items = [];
    let latestDate = '';
    let indexErr = null;
    let latestErr = null;
    await Promise.all([
      get(BASE + 'index.json').then(r => r.json()).then(j => { items = Array.isArray(j) ? j : []; }).catch(e => { indexErr = e; }),
      get(BASE + 'latest.json').then(r => r.json()).then(j => { if (j && typeof j.date === 'string') latestDate = j.date.trim(); }).catch(e => { latestErr = e; })
    ]);
    if (!items.length && !latestDate && (indexErr || latestErr)) {
      const err = [indexErr, latestErr].find(e => e && e.message && e.message !== 'notfound') || indexErr || latestErr;
      throw new Error(err && err.message && err.message !== 'notfound' ? err.message : '读不到早报文件（content/briefs）。');
    }
    if (!DATE.test(latestDate)) {
      const dates = items.map(x => x && x.date).filter(d => DATE.test(d)).sort();
      latestDate = dates.length ? dates[dates.length - 1] : '';
    }
    const isLatestRoute = !want;
    const day = want || latestDate;
    if (!DATE.test(day || '')) {
      return layout({ day: '', items, latestDate, isLatestRoute, error: want ? '日期应为 YYYY-MM-DD。' : 'latest.json 里没有可用的日期。' });
    }
    let md;
    try { md = await (await get(BASE + day + '.md')).text(); }
    catch (e) {
      const missing = e.status === 404 || e.message === 'notfound';
      return layout({ day, items, latestDate, isLatestRoute, error: missing ? ('没有 ' + day + ' 的早报。') : (e.message || '早报加载失败。') });
    }
    let body;
    try { body = await renderMd(md); }
    catch (e) { return layout({ day, items, latestDate, isLatestRoute, error: e.message || '早报排版失败。' }); }
    return layout({ day, items, latestDate, isLatestRoute, body });
  }

  function render(app, date){
    const my = ++token;
    const want = (date || '').trim();
    app.innerHTML = '<p class="muted">正在加载早报…</p>';
    build(want).then(html => { if (alive(my)) app.innerHTML = html; }).catch(e => {
      if (!alive(my)) return;
      app.innerHTML = `<div class="nodata">${U.esc(e && e.message ? e.message : '早报加载失败')}</div>`;
    });
  }

  return { render };
})();
