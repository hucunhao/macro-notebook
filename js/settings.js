// 门槛设置：保存在本机浏览器 localStorage，改了以后观察页的判断会立刻重算
const HEUR = '临时经验值，尚未用数据检验';
const AI_OFF = 'Oracle 5 年 CDS 低于 200bp，且数据中心项目债价格回到接近面值。';
const Settings = (() => {
  const GROUPS = [
    ['信用（总开关）', [
      ['hy_line', 'HY 利差警戒线（bp）', 350, '先行条件①：HY > 350bp；超过也会让信用亮黄灯', 't'],
      ['hy_red', 'HY 利差红线（bp）', 500, '超过就算信用断裂'],
      ['hy_speed_y', 'HY 1 个月走阔超过（bp）→ 黄灯', 50, '看速度不看水平'],
      ['hy_speed_r', 'HY 1 个月走阔超过（bp）→ 红灯', 100, ''],
      ['ccc_speed_y', 'CCC 1 个月走阔超过（bp）→ 黄灯', 150, '盯最弱的一层'],
      ['ccc_speed_r', 'CCC 1 个月走阔超过（bp）→ 红灯', 300, ''],
      ['ig_widen', 'IG 利差 63 个交易日走阔超过（bp）', 20, '先行条件①的第二半', 't'],
    ]],
    ['利率', [
      ['r10_line', '10 年美债参考线（%）', 4.75, '战术谨慎 → 结构轮动'],
      ['r10_red', '10 年美债红线（%）', 5.25, ''],
    ]],
    ['波动和情绪', [
      ['vix_panic', 'VIX 恐慌线', 30, ''],
      ['vix_calm', 'VIX 自满线', 15, ''],
      ['fg_fear', '恐惧贪婪：极度恐惧低于', 25, ''],
      ['fg_greed', '恐惧贪婪：极度贪婪高于', 75, ''],
    ]],
    ['广度', [
      ['rsp_drop', 'RSP÷SPY 3 个月跌超过（%）→ 黄灯', 3, '只靠巨头撑'],
      ['iwm_pos', 'IWM÷SPY 处在一年区间底部（%）以下 → 黄灯', 15, ''],
    ]],
    ['跨资产诊断（看 1 个月变化）', [
      ['diag_yield', '收益率算“上升”：10 年 1 个月升超过（百分点）', 0.15, ''],
      ['diag_stock', '股票算“下跌”：标普 1 个月跌超过（%）', 3, ''],
      ['diag_usd', '美元算“大涨”：美元广义指数 1 个月涨超过（%）', 2, ''],
      ['diag_gold', '黄金算“上涨”：GLD 1 个月涨超过（%）', 3, ''],
    ]],
    ['先行条件 ② 联储', [
      ['fed_months', '最近一次调整是加息，且发生在最近几个月内', 9, '加息后暂停仍算加息周期', 't'],
    ]],
    ['先行条件 ③ 油价', [
      ['oil_yoy', 'WTI 月末同比超过（%），连续 2 个月末', 50, '', 't'],
    ]],
    ['你的分档加仓（距历史高点的跌幅 %）', [
      ['spx_t1', '标普 第 1 档', 10, '', 'r'], ['spx_t2', '标普 第 2 档', 20, '', 'r'], ['spx_t3', '标普 第 3 档', 30, '', 'r'],
      ['ndx_t1', '纳指100 第 1 档', 15, '', 'r'], ['ndx_t2', '纳指100 第 2 档', 25, '', 'r'], ['ndx_t3', '纳指100 第 3 档', 35, '', 'r'],
    ]],
  ];
  const DEF = {}; GROUPS.forEach(g => g[1].forEach(r => DEF[r[0]] = r[2]));
  DEF.ai_stress = true; DEF.ai_note = '';
  // 设置版本号：默认值改了就升级版本，旧版本保存的设置作废，避免覆盖新默认值
  const KEY = 'ms_settings_v2';
  try { localStorage.removeItem('ms_settings'); } catch(e){}
  let cur = Object.assign({}, DEF, U.store.get(KEY, {}));
  const listeners = [];
  function get(){ return cur; }
  function save(){ U.store.set(KEY, cur); listeners.forEach(f => f(cur)); }
  function onChange(f){ listeners.push(f); }
  function render(){
    const p = U.$('#settings-panel');
    p.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><h2 style="margin:0">门槛设置</h2><button class="btn" id="set-close">关闭</button></div>
      <p class="muted small">改动会立刻生效，并保存在这台设备的浏览器里（不会上传）。灰色小字是这条门槛的来由。</p>
      <p class="small"><span class="tag warn">${HEUR}</span> 标这个的门槛是我先定的经验值，第 3 周起会逐个用历史数据检验。没标的是你自己的规则（先行条件 ①–④ 和分档）。</p>
      ${GROUPS.map(([t, rows]) => `<h3>${t}</h3>` + rows.map(([k, lbl, d, hint, kind]) => `<div class="setrow"><span>${lbl}${hint ? `<br><span class="muted small">${hint}</span>` : ''}<br>${kind === 't' ? '<span class="tag">你的先行条件</span>' : kind === 'r' ? '<span class="tag">你的分档规则</span>' : `<span class="tag warn">${HEUR}</span>`}</span><input type="number" step="any" data-k="${k}" value="${cur[k]}"></div>`).join('')).join('')}
      <h3>先行条件 ④ AI 信用压力扩散（手动判断）</h3>
      <p class="muted small">这一条没有现成的数据，只能你自己根据新闻判断（比如 AI 公司借债出问题、相关债券和贷款大跌）。<br><b>关掉的条件：</b>${AI_OFF}</p>
      <div class="setrow"><span>我认为正在扩散</span><input type="checkbox" id="ai-stress" ${cur.ai_stress ? 'checked' : ''}></div>
      <div class="setrow" style="display:block"><span>依据（写给自己看）</span><br><input type="text" id="ai-note" style="width:100%" value="${U.esc(cur.ai_note)}"></div>
      <p style="margin-top:16px"><button class="btn" id="set-reset">恢复默认</button></p>`;
    U.$$('input[data-k]', p).forEach(inp => inp.addEventListener('change', () => { const v = parseFloat(inp.value); if (!isNaN(v)){ cur[inp.dataset.k] = v; save(); } }));
    U.$('#ai-stress', p).onchange = e => { cur.ai_stress = e.target.checked; save(); };
    U.$('#ai-note', p).onchange = e => { cur.ai_note = e.target.value; save(); };
    U.$('#set-close', p).onclick = close;
    U.$('#set-reset', p).onclick = () => { cur = Object.assign({}, DEF); save(); render(); };
  }
  function open(){ render(); U.$('#drawer').classList.add('open'); }
  function close(){ U.$('#drawer').classList.remove('open'); }
  return { get, open, close, onChange, DEF, set(k, v){ cur[k] = v; save(); } };
})();
