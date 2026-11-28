// 实际日历渲染函数在固定时钟下的行为；不联网、不启动浏览器。
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const NOW = Date.parse('2026-11-13T16:00:00+08:00');
class FixedDate extends Date { static now() { return NOW; } }
const current = '2026-11-13 15:00';
const fred = 'FRED 日历:10';
const source = (status='ok', last_success=current) => ({status, last_success});
const event = (date, extra={}) => ({date, tw: date+' 21:30', name:'CPI 消费者物价', desc:'通胀', imp:3,
  src:'FRED', source_key:fred, url:'https://fred.stlouisfed.org/release?rid=10', last_verified:current, ...extra});
async function render(data) {
  const nodes = new Map();
  const node = s => { if (!nodes.has(s)) nodes.set(s, {innerHTML:''}); return nodes.get(s); };
  const ctx = vm.createContext({ Date:FixedDate, CAL:data, console,
    document:{querySelector:node}, localStorage:{getItem:()=>null,setItem:()=>{}},
    Markets:{panel:(_id,title,subtitle,body)=>`<h2>${title}</h2><p>${subtitle}</p>${body}`}});
  ctx.window=ctx;
  vm.runInContext(readFileSync(new URL('js/util.js',import.meta.url),'utf8'),ctx);
  vm.runInContext('U.need = async () => {};',ctx);
  vm.runInContext(readFileSync(new URL('js/pages3.js',import.meta.url),'utf8'),ctx);
  const app={innerHTML:''}; ctx.app=app;
  await vm.runInContext('Pages3.cal(app)',ctx);
  return {app,node,text:()=>app.innerHTML+node('#cal-l').innerHTML};
}
const data = events => ({events,sources:{[fred]:source()},status:{[fred]:'ok'},last_attempt:current});

let r = await render(data([event('2026-11-13',{stale:true,last_verified:'2026-11-01 10:00'})]));
assert.match(r.text(), /旧计划/);
assert.match(r.node('#cal-l').innerHTML, /待核实/);
assert.match(r.text(), /2026-11-01 10:00/);
assert.doesNotMatch(r.text(), /已发布/);

r = await render({events:[],status:{[fred]:'missing'},generated:current});
assert.match(r.text(), /日程未更新，暂无法判断/);
assert.doesNotMatch(r.text(), /窗口内暂无安排/);

r = await render(data([event('2026-11-13',{tw:null})]));
assert.match(r.app.innerHTML, /今天/); // 日期未知时分仍包含今天，不能与完整时间字符串直接比较而漏掉
assert.match(r.text(), /时间待定/);

r = await render(data([event('2026-11-12'),event('2026-11-13',{tw:'2026-11-13 08:00'}),event('2026-10-22')]));
assert.doesNotMatch(r.node('#cal-l').innerHTML, /11-12|10-22/);
assert.match(r.node('#cal-l').innerHTML, /计划时间已过，发布结果未核实/);
r.node('#cal-past').onchange({target:{checked:true}});
assert.match(r.node('#cal-l').innerHTML, /11-12/);
assert.doesNotMatch(r.node('#cal-l').innerHTML, /10-22|已发布/);

const day = n => new Date(Date.parse('2026-11-13T00:00:00Z')+n*86400e3).toISOString().slice(0,10);
r = await render(data([event(day(20),{name:'window20'}),event(day(21),{name:'window21'}),event(day(41),{name:'window41'}),event(day(42),{name:'window42'})]));
assert.match(r.node('#cal-l').innerHTML,/window20/);
assert.doesNotMatch(r.node('#cal-l').innerHTML,/window21|window41|window42/);
r.node('#cal-all').onchange({target:{checked:true}});
assert.match(r.node('#cal-l').innerHTML,/window21|window41/);
assert.doesNotMatch(r.node('#cal-l').innerHTML,/window42/);

r = await render(data([event('2026-11-14',{name:'<img src=x onerror=alert(1)>',desc:'<script>bad()</script>',imp:1})]));
assert.match(r.node('#cal-l').innerHTML,/&lt;img/);
assert.doesNotMatch(r.node('#cal-l').innerHTML,/<script>|<img/);
r.node('#cal-imp').onchange({target:{checked:true}});
assert.match(r.node('#cal-l').innerHTML,/筛选条件内暂无计划事件/);

r = await render({events:[event('2026-11-14',{last_verified:null})],status:{[fred]:'ok'},generated:current});
assert.match(r.text(),/最近核验：未记录/);
assert.match(r.text(),/待核实/); // 旧版全局生成时间不能冒充逐来源核验时间

r = await render({ ...data([event('2026-11-14',{last_verified:'2026-11-10 15:00'})]), sources:{[fred]:source('ok','2026-11-10 15:00')} });
assert.match(r.text(),/待核实/); // 定时任务停止后旧的 ok 不能一直当成新鲜

const snapshot = JSON.parse(readFileSync(new URL('data/calendar.json',import.meta.url),'utf8'));
r = await render(snapshot);
assert.doesNotMatch(r.text(),/已发布/);
assert.match(r.text(),/经济日历/);
console.log('PASS calendar view: stale, missing, unknown time, elapsed plans, 3/6-week filters, escaping, legacy snapshot');
