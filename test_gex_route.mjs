// 用仓库里的 index.html 和真实脚本顺序打开 #/gex。
// 测试自己不给 window.Gex 赋值。合成夹具只在断言后注入，不写进 data/。
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const pw = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const chromium = pw.chromium || pw.default.chromium;
const root = fileURLToPath(new URL('.', import.meta.url));
const shot = process.env.GEX_SHOT || '';
const shotStrikes = process.env.GEX_SHOT_STRIKES || '';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.md': 'text/plain' };

function fail(msg) { console.error('FAIL', msg); process.exitCode = 1; }

const html = readFileSync(join(root, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
const need = ['data/gex.js', 'js/gex.js', 'js/app.js'];
let at = -1;
for (const src of need) {
  const i = scripts.indexOf(src);
  if (i < 0 || i <= at) fail(`index.html 脚本顺序不对，缺或乱了 ${src}。实际：${scripts.join(' ')}`);
  at = i;
}
if (scripts.indexOf('js/gex.js') > scripts.indexOf('js/app.js')) fail('gex.js 排在 app.js 后面');

const snap = JSON.parse(readFileSync(join(root, 'data/gex.json'), 'utf8'));
const server = createServer((req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname)).replace(/^(\.\.[/\\])+/, '');
  const file = join(root, path === '/' ? 'index.html' : path);
  try {
    const body = readFileSync(file);
    res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404); res.end('missing');
  }
});
await new Promise(ok => server.listen(0, '127.0.0.1', ok));
const port = server.address().port;
const base = `http://127.0.0.1:${port}/index.html`;

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push('pageerror ' + e.message));
page.on('console', msg => { if (msg.type() === 'error') errors.push('console ' + msg.text()); });

async function onGex(shots) {
  await page.waitForSelector('#gex-mon', { timeout: 15000 });
  const probe = await page.evaluate(() => ({
    prop: Object.prototype.hasOwnProperty.call(window, 'Gex'),
    type: typeof window.Gex,
    leadFn: typeof (window.Gex && window.Gex.lead),
  }));
  if (!probe.prop || probe.type !== 'object') fail(`页面脚本没有把 Gex 挂到 window 上：${JSON.stringify(probe)}`);
  const lead = await page.locator('#gex-lead').innerText();
  const expected = await page.evaluate(() => window.Gex.lead(window.GEX));
  if (lead.trim() !== expected.trim()) fail(`结论和 Gex.lead 不一致：${lead} / ${expected}`);
  if (!lead.includes('标普 500') || !lead.includes('纳斯达克 100') || !lead.includes('指数期权')) fail('结论没有两只指数期权：' + lead);
  if (lead.includes('代理')) fail('结论把代理写进来了');
  for (const id of ['SPX', 'NDX']) {
    const ix = snap.indices[id];
    const card = page.locator(`[data-symbol="${id}"]`);
    const source = await card.getAttribute('data-source');
    if (source !== ix.source_symbol) fail(`${id} 来源代码是 ${source}`);
    const net = await card.locator('[data-window="all"] [data-field="net"], .gex-wins .gex-win:first-child [data-field="net"]').first().getAttribute('data-net');
    if (String(ix.windows.all.net_gex) !== net) fail(`${id} 净敞口显示 ${net}，快照是 ${ix.windows.all.net_gex}`);
    const text = await card.innerText();
    if (!text.includes(ix.quote_timestamp_utc)) fail(`${id} 没有行情时间 ${ix.quote_timestamp_utc}`);
    if (!text.includes(ix.computed_at)) fail(`${id} 没有计算时间`);
    if (ix.sign === 'positive' && !lead.includes('正伽马')) {}
    if (id === 'SPX' && text.includes('QQQ')) fail('标普卡片写了 QQQ');
    if (id === 'NDX' && text.includes('SPY')) fail('纳指卡片写了 SPY');
  }
  const signWord = { positive: '正伽马', negative: '负伽马', zero: '净伽马为零' };
  for (const id of ['SPX', 'NDX']) {
    const word = signWord[snap.indices[id].windows.all.sign];
    if (word && !lead.includes(word)) fail(`结论没有${id}的${word}：${lead}`);
    const rel = snap.indices[id].windows.all.spot_vs_flip;
    if (rel === 'above' && !lead.includes('之上')) fail('现货在翻转点之上但结论没写');
    if (rel === 'below' && !lead.includes('之下')) fail('现货在翻转点之下但结论没写');
    if (snap.indices[id].windows.all.flip == null && !lead.includes('算不出') && !lead.includes('没有零伽马翻转点')) {
      fail('翻转点缺失却没有明说：' + lead);
    }
  }
  const visible = await page.locator('#gex-mon').innerText();
  if (!visible.includes('sign × gamma × open_interest × 100 × spot² × 0.01')) fail('页面上没有公式');
  if (!visible.includes('做市商多看涨、空看跌')) fail('页面上没有假设');
  if (!visible.includes('大约 15 分钟')) fail('页面上没有延迟说明');
  if (!visible.includes('不构成投资建议')) fail('页面上没有不构成投资建议');
  if (!visible.includes('收盘历史还很短')) fail('短历史警告不醒目');
  if (!visible.includes('未平仓')) fail('没有未平仓新鲜度说明');
  if (visible.includes('代理')) fail('页面把代理当成了数据来源');
  if (visible.includes('测试夹具')) fail('正式快照被标成测试夹具');
  const strikesOpen = await page.locator('#gex-strikes').evaluate(el => el.open);
  const histOpen = await page.locator('#gex-history').evaluate(el => el.open);
  const methodOpen = await page.locator('#gex-method').evaluate(el => el.open);
  if (strikesOpen || histOpen || methodOpen) fail('明细或规则默认展开了');
  if (shots && shot) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: shot });
  }
  await page.locator('#gex-strikes > summary').click();
  await page.waitForFunction(() => document.querySelector('#gex-strikes').open);
  if (shots && shotStrikes) await page.locator('#gex-strikes').screenshot({ path: shotStrikes });
  await page.locator('#gex-strikes > summary').click();
}

try {
  await page.goto(base + '#/gex', { waitUntil: 'load' });
  await onGex(true);
  await page.click('a[href="#/observe"]');
  await page.waitForFunction(() => !document.querySelector('#gex-mon'));
  await page.click('a[href="#/gex"]');
  await onGex(false);
  const hm = await page.evaluate(() => {
    location.hash = '#/hm';
    return location.hash;
  });
  if (hm !== '#/hm') fail('没能切到热力图');
  await page.waitForTimeout(300);
  const hmText = await page.locator('#app').innerText();
  if (hmText.includes('伽马页脚本没有挂到')) fail('热力图被伽马页的失败文案盖住了');
  await page.evaluate(() => { location.hash = '#/gex'; });
  await page.waitForSelector('#gex-mon');
  await page.evaluate(() => {
    window.GEX = {
      version: 1,
      fixture: 'synthetic-test-not-market-data',
      formula: 'sign × gamma × open_interest × 100 × spot² × 0.01',
      assumption: '做市商多看涨、空看跌',
      method: { formula: '测试用规则，不是行情' },
      indices: {
        SPX: {
          id: 'SPX', name: '标普 500', status: 'ok', stale: true, stale_reason: 'HTTP 500',
          proxy: false, not_proxy: 'SPY', source_symbol: '^SPX', security_type: 'index',
          last_success: '2026-11-09 18:00', computed_at: '2026-11-09 18:00',
          quote_timestamp_utc: '2026-11-10 02:58:42', quote_timestamp_et: '2026-11-09 21:58:42',
          last_trade_time: '2026-11-09T16:14:59', session_date: '2026-11-09', is_daily_close: true,
          spot: 100, warnings: [{ level: 'prominent', code: 'flip_missing', text: '全部到期这一列没有可用的零伽马翻转点。' }],
          coverage: { used: 1, expired: 0, roots: { SPXW: 1 } },
          windows: {
            all: { label: '全部到期', sign: 'positive', net_gex: 1000, flip: null, flip_status: 'none', spot_vs_flip: null, call_wall: { strike: 110, gex: 800 }, put_wall: null, contracts_used: 1, strikes: [{ strike: 110, call_gex: 800, put_gex: 0, net_gex: 800, call_oi: 1, put_oi: 0 }], strikes_shown: 1, strikes_total: 1 },
            d7: { label: '0–7 个日历日', sign: 'undefined', net_gex: null, flip: null, flip_status: 'undefined', spot_vs_flip: null, call_wall: null, put_wall: null, contracts_used: 0, strikes: [], strikes_shown: 0, strikes_total: 0 },
            d30: { label: '0–30 个日历日', sign: 'positive', net_gex: 1000, flip: null, flip_status: 'none', spot_vs_flip: null, call_wall: { strike: 110, gex: 800 }, put_wall: null, contracts_used: 1, strikes: [], strikes_shown: 0, strikes_total: 1 },
          },
        },
        NDX: { id: 'NDX', name: '纳斯达克 100', status: 'unavailable', stale: true, stale_reason: '空链', not_proxy: 'QQQ', source_symbol: '^NDX', windows: null, spot: null, warnings: [] },
      },
      closes: { SPX: [{ session_date: '2026-11-09', net_gex: 1000, sign: 'positive', flip: null, spot_vs_flip: null, spot: 100 }], NDX: [] },
      events: [],
    };
    window.Gex.render(document.querySelector('#app'));
  });
  const synthetic = await page.locator('#gex-mon').innerText();
  if (!synthetic.includes('测试夹具')) fail('注入的测试数据没有标明是夹具');
  if (!synthetic.includes('HTTP 500') || !synthetic.includes('没有往前拨')) fail('失败后没有陈旧提示：' + synthetic.slice(0, 400));
  if (!synthetic.includes('暂无可用的指数期权链') || !synthetic.includes('没有拿它当代理')) fail('纳指失败时没有明说，或拿代理填上了');
  const spxNet = await page.locator('[data-symbol="SPX"] [data-field="net"]').first().getAttribute('data-net');
  if (spxNet !== '1000') fail(`标普在纳指失败后数字变了：${spxNet}`);
  const lead2 = await page.locator('#gex-lead').innerText();
  if (!lead2.includes('没有零伽马翻转点') || !lead2.includes('暂无可用数据')) fail('缺失翻转点或缺失指数没有写明：' + lead2);
  const bad = errors.filter(t => /Gex|GEX|is not defined|is not a function/i.test(t));
  if (bad.length) fail('控制台：\n' + bad.join('\n'));
  if (!process.exitCode) console.log('PASS #/gex 已按真实脚本顺序渲染，离开再回来仍在');
} catch (e) {
  fail(e && e.stack ? e.stack : String(e));
} finally {
  await browser.close();
  server.close();
}
