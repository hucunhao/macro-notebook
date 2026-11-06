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
const shotOpen = process.env.QDII_SHOT_OPEN || '';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.md': 'text/plain' };

function fail(msg) { console.error('FAIL', msg); process.exitCode = 1; }

const html = readFileSync(join(root, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
const need = ['data/qdii_monitor.js', 'js/qdii_logic.js', 'js/qdii_monitor.js', 'js/pages3.js', 'js/app.js'];
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

async function onQdii(shots) {
  await page.waitForSelector('#qdii-mon', { timeout: 15000 });
  await page.waitForFunction(() => document.body.innerText.includes('QDII 溢价监视'), null, { timeout: 15000 });
  const heading = await page.locator('#qdii-mon .t').innerText();
  if (heading.trim() !== 'QDII 溢价监视') fail(`标题是「${heading}」`);
  const lead = await page.locator('#qdm-lead').innerText();
  if (!lead.includes('qdiilimit 的 T-1') || !lead.includes('实时EST溢价') || !lead.includes('不是投资建议')) fail('结论没有按同一列对照：' + lead);
  if (!lead.includes('纳指') || !lead.includes('标普')) fail('结论没有两个主题');
  const nq = await page.locator('#qdm-nasdaq').innerText();
  const sp = await page.locator('#qdm-spx').innerText();
  if (!nq.includes('T-1') || !nq.includes('实时EST溢价') || !sp.includes('T-1') || !sp.includes('实时EST溢价')) fail('主题卡片没有同时标出 T-1 和实时EST');
  const warn = await page.locator('.qdm-warn').innerText();
  if (!warn.includes('本站观察仅') || !warn.includes('不是长历史')) fail('短历史警告不在：' + warn);
  if (await page.locator('#qdm-c, #qdii-mon canvas').count()) fail('观察不足 30 日却画了历史线');
  const details = page.locator('#qdm-funds');
  if (await details.evaluate(el => el.open)) fail('九只基金分项默认展开了');
  if (shots && shot){ await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: shot, fullPage: false }); }
  await page.locator('#qdm-funds > summary').click();
  await page.waitForFunction(() => document.querySelector('#qdm-funds').open);
  const snap = JSON.parse(readFileSync(join(root, 'data/qdii_monitor.json'), 'utf8'));
  const by = Object.fromEntries(snap.funds.map(f => [f.code, f]));
  if (snap.funds.length < 9) fail('快照不足 9 只');
  for (const code of ['513100', '159659', '513500']) {
    const f = by[code];
    const box = await page.locator(`#qdm-funds [data-code="${code}"]`).evaluate(el => el.textContent);
    for (const v of [f.t1_premium, f.official_premium, f.ref_premium, f.rt_premium]) {
      if (v == null) fail(`${code} 快照里有空溢价`);
      if (!box.includes(Number(v).toFixed(2))) fail(`${code} 页面没有 ${v}：${box.slice(0, 180)}`);
    }
    const vals = [f.t1_premium, f.official_premium, f.ref_premium, f.rt_premium];
    if (new Set(vals).size !== 4) fail(`${code} 四列溢价不是互不相同`);
  }
  const metrics = await page.evaluate(() => {
    const cs = el => getComputedStyle(el);
    const box = el => el.getBoundingClientRect();
    const oldTd = document.querySelector('#q-t tbody td');
    const oldPrem = document.querySelector('#q-t .prem');
    const oldTr = document.querySelector('#q-t tbody tr');
    const row = document.querySelector('#qdm-funds tr.qdm-row:not(.qdm-spot)');
    const spot = document.querySelector('#qdm-funds tr.qdm-spot');
    const td = row.querySelector('td');
    const badge = row.querySelector('.qdm-t1 .qdm-badge');
    const rt = row.querySelector('.qdm-est .qdm-badge');
    const name = row.querySelector('.qdm-name');
    const code = row.querySelector('.qdm-code');
    const swatchT1 = document.querySelector('#qdii-mon .qdm-swatch.t1');
    const swatchEst = document.querySelector('#qdii-mon .qdm-swatch.est');
    const fits = el => el.scrollWidth <= el.clientWidth + 1 && box(el).height > 8 && box(el).width > 8;
    return {
      oldTdFont: cs(oldTd).fontSize, oldTdPad: cs(oldTd).padding, oldTdLh: cs(oldTd).lineHeight,
      oldPremFont: cs(oldPrem).fontSize, oldPremWeight: cs(oldPrem).fontWeight, oldPremPad: cs(oldPrem).padding,
      oldRowH: box(oldTr).height,
      oldInputH: box(document.querySelector('#q-t input')).height,
      tdFont: cs(td).fontSize, tdPad: cs(td).padding, tdLh: cs(td).lineHeight,
      badgeFont: cs(badge).fontSize, badgeWeight: cs(badge).fontWeight, badgePad: cs(badge).padding,
      rowH: box(row).height, spotH: box(spot).height, spotOutline: cs(spot).outlineWidth,
      heroFont: cs(document.querySelector('#qdm-nasdaq .qdm-t1 .qdm-num')).fontSize,
      heroRtFont: cs(document.querySelector('#qdm-nasdaq .qdm-rt .qdm-num')).fontSize,
      leadFont: cs(document.querySelector('#qdm-lead')).fontSize,
      t1Color: cs(badge).color, rtColor: cs(rt).color,
      swatchT1: cs(swatchT1).backgroundColor, swatchEst: cs(swatchEst).backgroundColor,
      labelT1: row.querySelector('.qdm-t1 .qdm-k').textContent,
      labelRt: row.querySelector('.qdm-est .qdm-k').textContent,
      fits: fits(badge) && fits(rt) && fits(name) && fits(code),
      spotText: spot.textContent,
    };
  });
  console.log('MEASURED ' + JSON.stringify(metrics));
  if (metrics.tdFont !== metrics.oldTdFont || metrics.tdPad !== metrics.oldTdPad || metrics.tdLh !== metrics.oldTdLh) {
    fail(`分项行字号或内边距和旧表不一致：${metrics.tdFont}/${metrics.tdPad}/${metrics.tdLh} vs ${metrics.oldTdFont}/${metrics.oldTdPad}/${metrics.oldTdLh}`);
  }
  if (metrics.badgeFont !== metrics.oldPremFont || metrics.badgeWeight !== metrics.oldPremWeight || metrics.badgePad !== metrics.oldPremPad) {
    fail(`溢价徽章和旧表 .prem 不一致：${metrics.badgeFont} ${metrics.badgeWeight} ${metrics.badgePad} vs ${metrics.oldPremFont} ${metrics.oldPremWeight} ${metrics.oldPremPad}`);
  }
  if (Math.abs(metrics.rowH - metrics.oldRowH) > 4) fail(`分项行高 ${metrics.rowH}px，旧表行高 ${metrics.oldRowH}px`);
  if (Math.abs(metrics.spotH - metrics.rowH) > 2) fail(`159659 行高 ${metrics.spotH}px，被边框撑高了`);
  if (metrics.spotOutline !== '2px') fail(`159659 边框不是 2px：${metrics.spotOutline}`);
  if (metrics.spotText.includes('不是持仓') || metrics.spotText.includes('关注代码')) fail('159659 多了说明文字');
  if (metrics.heroFont !== '40px' || metrics.heroRtFont !== '48px' || metrics.leadFont !== '18px') fail(`上半部字号被改了：${metrics.heroFont} ${metrics.heroRtFont} ${metrics.leadFont}`);
  if (metrics.labelT1 !== 'T-1' || metrics.labelRt !== '实时EST') fail(`标签不对：${metrics.labelT1} / ${metrics.labelRt}`);
  if (metrics.t1Color !== metrics.swatchT1 || metrics.rtColor !== metrics.swatchEst) fail(`颜色和色块不一致：${metrics.t1Color} ${metrics.rtColor}`);
  if (!metrics.fits) fail('展开后的代码、名称或溢价被裁切');
  if (shots && shotOpen) {
    await page.locator('#qdm-funds').screenshot({ path: shotOpen });
    const tableShot = shotOpen.replace(/\.png$/, '') + '-old-table.png';
    await page.locator('#q-t table').screenshot({ path: tableShot });
    console.log('SHOT_TABLE ' + tableShot);
  }
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
  if (!note.includes('不重算')) fail('没有写明本站不重算 EST');
  const probe = await page.evaluate(() => ({
    prop: Object.prototype.hasOwnProperty.call(window, 'QdiiMon'),
    type: typeof window.QdiiMon,
  }));
  if (!probe.prop || probe.type !== 'object') fail(`页面脚本没有把 QdiiMon 挂到 window 上：${JSON.stringify(probe)}`);
}

try {
  await page.goto(base + '#/qdii', { waitUntil: 'load' });
  await onQdii(true);
  await page.click('a[href="#/observe"]');
  await page.waitForFunction(() => !document.querySelector('#qdii-mon'));
  await page.click('a[href="#/qdii"]');
  await onQdii(false);
  const bad = errors.filter(t => /QdiiMon|QDM|is not defined|is not a function/i.test(t));
  if (bad.length) fail('控制台：\n' + bad.join('\n'));
  if (errors.length) console.log('其它控制台错误（未当成失败）：\n' + errors.join('\n'));
  if (!process.exitCode) console.log('PASS #/qdii 监视表已渲染，离开再回来仍在');
} catch (e) {
  fail(e && e.message ? e.message : String(e));
} finally {
  await browser.close();
  server.close();
}
