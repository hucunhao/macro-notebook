// 用仓库里的 index.html 和真实脚本顺序打开 #/qdii。
// 测试自己不给 window.QdiiMon 赋值。
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const pw = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const chromium = pw.chromium || pw.default.chromium;
const root = fileURLToPath(new URL('.', import.meta.url));
const shot = process.env.QDII_SHOT || '';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.md': 'text/plain' };

function fail(msg) { console.error('FAIL', msg); process.exitCode = 1; }

const html = readFileSync(join(root, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
const need = ['data/qdii_monitor.js', 'js/qdii_monitor.js', 'js/pages3.js', 'js/app.js'];
let at = -1;
for (const src of need) {
  const i = scripts.indexOf(src);
  if (i < 0 || i <= at) fail(`index.html 脚本顺序不对，缺或乱了 ${src}。实际：${scripts.join(' ')}`);
  at = i;
}

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

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push('pageerror ' + e.message));
page.on('console', msg => { if (msg.type() === 'error') errors.push('console ' + msg.text()); });

async function onQdii() {
  await page.waitForSelector('#qdii-mon h2, #qdii-mon .t, #app', { timeout: 15000 });
  await page.waitForFunction(() => document.body.innerText.includes('QDII 溢价监视'), null, { timeout: 15000 });
  const heading = await page.locator('#qdii-mon .t').innerText();
  if (heading.trim() !== 'QDII 溢价监视') fail(`标题是「${heading}」`);
  const rows = page.locator('#qdii-mon tbody tr');
  const n = await rows.count();
  if (n < 9) fail(`监视表只有 ${n} 行`);
  for (const code of ['513100', '159659', '513500']) {
    const cells = await page.locator(`#qdii-mon tbody tr`, { hasText: code }).first().locator('td').allInnerTexts();
    const picked = [cells[2], cells[5], cells[8], cells[10]].map(s => (s || '').trim());
    if (picked.some(s => !s || s === '—' || s === '暂缺')) fail(`${code} 有空的溢价列 ${picked.join(' | ')}`);
    if (new Set(picked).size !== 4) fail(`${code} 的 T-1/官方/参考/实时溢价不是四个不同的数：${picked.join(' | ')}`);
  }
  const chips = await page.locator('#qdii-mon .chip .k').allInnerTexts();
  if (!chips.some(t => t.includes('纳指') && t.includes('中位数'))) fail('没有纳指主题中位数');
  if (!chips.some(t => t.includes('标普') && t.includes('中位数'))) fail('没有标普主题中位数');
  const before = await page.locator('#qdm-drag').innerText();
  if (!before.includes('71.1')) fail(`计算器默认结果不是例子里的 71.1%：${before}`);
  await page.locator('#qdm-buy').fill('0');
  await page.waitForFunction(() => !document.querySelector('#qdm-drag').innerText.includes('71.1'));
  const after = await page.locator('#qdm-drag').innerText();
  if (after === before) fail('改买入溢价后计算器没有重算');
  await page.locator('#qdm-buy').fill('15');
  const mon = await page.locator('#qdii-mon').boundingBox();
  const old = await page.locator('#q-t').boundingBox();
  if (!old || !mon || !(mon.y < old.y)) fail('收盘/净值表不在监视表下面');
  const note = await page.locator('#app').innerText();
  if (!note.includes('收盘价 ÷ 公布净值') || !note.includes('不是同一列')) fail('下面旧表没有单独的算法说明');
  const probe = await page.evaluate(() => ({
    prop: Object.prototype.hasOwnProperty.call(window, 'QdiiMon'),
    type: typeof window.QdiiMon,
  }));
  if (!probe.prop || probe.type !== 'object') fail(`页面脚本没有把 QdiiMon 挂到 window 上：${JSON.stringify(probe)}`);
}

try {
  await page.goto(base + '#/qdii', { waitUntil: 'load' });
  await onQdii();
  await page.click('a[href="#/observe"]');
  await page.waitForFunction(() => !document.querySelector('#qdii-mon'));
  await page.click('a[href="#/qdii"]');
  await onQdii();
  const bad = errors.filter(t => /QdiiMon|QDM|is not defined|is not a function/i.test(t));
  if (bad.length) fail('控制台：\n' + bad.join('\n'));
  if (errors.length) console.log('其它控制台错误（未当成失败）：\n' + errors.join('\n'));
  if (shot) await page.screenshot({ path: shot, fullPage: true });
  if (!process.exitCode) console.log('PASS #/qdii 监视表已渲染，离开再回来仍在');
} catch (e) {
  if (shot) await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
  fail(e && e.message ? e.message : String(e));
} finally {
  await browser.close();
  server.close();
}
