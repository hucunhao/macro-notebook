// 主题结论的规则。不打开浏览器，也不改 window.QdiiMon。
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
const require = createRequire(import.meta.url);
const L = require(join(fileURLToPath(new URL('.', import.meta.url)), 'js/qdii_logic.js'));
let failed = 0;
function eq(name, cond){ if (!cond){ console.error('FAIL', name); failed++; } else console.log('ok', name); }

const bothRt = {
  nasdaq: { t1: { n: 5, median: 14.92, missing: 0, stale_n: 0 }, rt: { n: 5, median: 18.09, missing: 0, stale_n: 0 }, official: { n: 5, median: 16, missing: 0, stale_n: 0 } },
  spx: { t1: { n: 4, median: 7.445, missing: 0, stale_n: 1 }, rt: { n: 4, median: 9.465, missing: 0, stale_n: 0 }, official: { n: 4, median: 8, missing: 0, stale_n: 0 } },
};
eq('realtime preferred over official', L.estRead(bothRt.nasdaq).key === 'rt' && L.estRead(bothRt.nasdaq).label === '实时EST溢价');
const text = L.conclusion(bothRt);
eq('same-source T-1 sentence', text.includes('qdiilimit 的 T-1') && text.includes('纳指中位数 +14.92%') && (text.includes('标普中位数 +7.45%') || text.includes('标普中位数 +7.44%')));
eq('same-source realtime sentence', text.includes('实时EST溢价') && text.includes('+18.09%'));
eq('does not average EST columns', !text.includes('16.00%') && !text.includes('+16.00%'));
eq('not advice', text.includes('不是投资建议'));

const noRt = { rt: { n: 0, median: null, missing: 4, stale_n: 0 }, official: { n: 4, median: 8.5, missing: 0, stale_n: 2 } };
const fb = L.estRead(noRt);
eq('fallback official label', fb.fallback === true && fb.key === 'official' && fb.label === '官方EST溢价' && fb.block.median === 8.5);
const mixed = L.conclusion({ nasdaq: bothRt.nasdaq, spx: { t1: bothRt.spx.t1, rt: noRt.rt, official: noRt.official } });
eq('different columns are not ranked together', mixed.includes('不放在一起比高低') && mixed.includes('官方EST溢价'));

const none = L.estRead({ rt: { n: 0, median: null }, official: { n: 0, median: null } });
eq('missing both is unknown', none.key === null && none.label === '未知');

const lines = L.historyLines({ t1: 1, rt: 1, official: 40, ref: 0 });
eq('short history phrase', lines.some(s => s === 'T-1本站观察仅 1 日，不是长历史') && lines.some(s => s.includes('实时EST本站观察仅 1 日')));
eq('long series is not called short', !lines.some(s => s.startsWith('官方EST')));
eq('null count is zero days', L.historyLines({}).some(s => s.includes('仅 0 日')));

if (failed){ console.error(failed + ' failed'); process.exit(1); }
console.log('PASS qdii logic');
