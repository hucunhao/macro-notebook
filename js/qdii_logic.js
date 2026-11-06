// 主题结论只用同一列的中位数。实时 EST 没有数时，明确改看官方 EST；两列都没有就是未知。
// 不把官方、参考、实时三列加在一起再平均。
var QdiiLogic = (function () {
  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function pct(x) {
    if (!isNum(x)) return '未知';
    return (x > 0 ? '+' : '') + x.toFixed(2) + '%';
  }
  function estRead(theme) {
    var rt = theme && theme.rt;
    var off = theme && theme.official;
    if (rt && rt.n > 0 && isNum(rt.median)) return { key: 'rt', label: '实时EST溢价', block: rt, fallback: false };
    if (off && off.n > 0 && isNum(off.median)) return { key: 'official', label: '官方EST溢价', block: off, fallback: true };
    return { key: null, label: '未知', block: null, fallback: false };
  }
  function side(name, read) {
    if (!read.key) return name + '的实时EST和官方EST都没有数，记为未知。';
    var extra = read.fallback ? '（实时EST没有数，所以改看官方EST这一列）' : '';
    return name + '的' + read.label + '中位数 ' + pct(read.block.median) + '（' + read.block.n + ' 只有数）' + extra + '。';
  }
  function conclusion(themes) {
    themes = themes || {};
    var nq = themes.nasdaq || {}, sp = themes.spx || {};
    var a = nq.t1, b = sp.t1;
    var t1 = (!a || !a.n || !b || !b.n)
      ? 'T-1（qdiilimit）有一边没有有数的基金，不把两边放在一起比。'
      : '按 qdiilimit 的 T-1，纳指中位数 ' + pct(a.median) + '（' + a.n + ' 只有数），标普中位数 ' + pct(b.median) + '（' + b.n + ' 只有数）。';
    var A = estRead(nq), B = estRead(sp);
    var est;
    if (A.key && B.key && A.key === B.key) {
      est = '按 palmmicro 的' + A.label + '，纳指中位数 ' + pct(A.block.median) + '（' + A.block.n + ' 只有数），标普中位数 ' + pct(B.block.median) + '（' + B.block.n + ' 只有数）。';
      if (A.fallback) est += '两边用的都是官方EST，因为实时EST没有数。';
    } else {
      est = side('纳指', A) + side('标普', B) + '两列不是同一列，不放在一起比高低。';
    }
    return t1 + est + '这是溢价读数，不是投资建议。';
  }
  function historyLines(days) {
    days = days || {};
    var spec = [['T-1', days.t1], ['实时EST', days.rt], ['官方EST', days.official], ['参考EST', days.ref]];
    var out = [];
    spec.forEach(function (pair) {
      var n = pair[1];
      if (n == null || n < 30) out.push(pair[0] + '本站观察仅 ' + (n == null ? 0 : n) + ' 日，不是长历史');
    });
    return out;
  }
  return { isNum: isNum, pct: pct, estRead: estRead, conclusion: conclusion, historyLines: historyLines };
})();
if (typeof module === 'object' && module.exports) module.exports = QdiiLogic;
