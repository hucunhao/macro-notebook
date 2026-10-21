// 笔记：存在本机浏览器里，可以导出 / 导入 JSON
const Notes = (() => {
  const K = 'ms_notes';
  const today = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,10); };
  function render(app){
    const list = U.store.get(K, []);
    let stageHint = '';
    try { const C = Observe.compute(Settings.get()); stageHint = `今天的市场阶段：${C.stage}（${U.lightName(C.overall)}）`; } catch(e){}
    app.innerHTML = `<h1>笔记</h1><p class="muted small">记下每天的观察和想法。只保存在这台设备的浏览器里，换设备或清理浏览器会丢，记得定期导出备份。</p>
      <div class="card noteform">
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:8px"><label>日期 <input type="date" id="n-date" value="${today()}"></label><span class="small muted">${stageHint}</span></div>
        <textarea id="n-text" placeholder="今天看到了什么？你怎么想？打算做什么、不做什么？"></textarea>
        <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" id="n-save">保存</button><button class="btn" id="n-stage">插入今天的阶段判断</button>
        <span style="flex:1"></span><button class="btn" id="n-export">导出 JSON</button><label class="btn">导入 JSON<input type="file" id="n-import" accept=".json,application/json" style="display:none"></label></div>
      </div>
      <h2>记录（${list.length} 条）</h2><div class="card" id="n-list">${list.length ? '' : '<p class="muted">还没有笔记。</p>'}</div>`;
    const draw = () => { const l = U.store.get(K, []).sort((a, b) => b.date.localeCompare(a.date) || b.t - a.t);
      U.$('#n-list').innerHTML = l.length ? l.map(x => `<div class="note-item"><span class="d">${x.date}</span> <button class="btn small" data-del="${x.t}" style="float:right">删除</button><p>${U.esc(x.text)}</p></div>`).join('') : '<p class="muted">还没有笔记。</p>';
      U.$$('[data-del]').forEach(b => b.onclick = () => { if (!confirm('删除这条笔记？')) return; U.store.set(K, U.store.get(K, []).filter(x => String(x.t) !== b.dataset.del)); render(app); }); };
    draw();
    U.$('#n-save').onclick = () => { const text = U.$('#n-text').value.trim(); if (!text) return; const l = U.store.get(K, []); l.push({ date: U.$('#n-date').value || today(), text, t: Date.now() }); U.store.set(K, l); render(app); };
    U.$('#n-stage').onclick = () => { try { const C = Observe.compute(Settings.get()); U.$('#n-text').value += (U.$('#n-text').value ? '\n' : '') + `【阶段】${C.stage}：${C.one} ${C.diagTxt}`; } catch(e){} };
    U.$('#n-export').onclick = () => { const blob = new Blob([JSON.stringify({ notes: U.store.get(K, []), predictions: U.store.get('ms_predict', {}), settings: Settings.get() }, null, 2)], { type:'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Market-Dashboard-笔记-${today()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
    U.$('#n-import').onchange = e => { const f = e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { try { const o = JSON.parse(rd.result); const inc = Array.isArray(o) ? o : o.notes || [];
      const l = U.store.get(K, []), seen = new Set(l.map(x => x.t)); inc.forEach(x => { if (x && x.date && x.text && !seen.has(x.t)) l.push({ date:x.date, text:x.text, t:x.t || Date.now() + Math.random() }); });
      U.store.set(K, l); if (o.predictions) U.store.set('ms_predict', Object.assign(U.store.get('ms_predict', {}), o.predictions)); render(app); } catch(err){ alert('文件格式不对：' + err.message); } }; rd.readAsText(f); };
  }
  return { render };
})();
