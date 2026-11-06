// 首页「美股截至哪一天」。标普和纳指100 日期不一样时，不能写成一个日子。
var EquityBanner = (function () {
  function banner(parts) {
    var rows = (parts || []).filter(function (p) { return p && p.name; });
    if (!rows.length) return '美股收盘日 —';
    var dates = rows.map(function (p) { return p.date || ''; });
    var same = dates.every(function (d) { return d && d === dates[0]; });
    if (same) return '美股收盘 ' + dates[0];
    return rows.map(function (p) { return p.name + '截至 ' + (p.date || '—'); }).join('，');
  }
  return { banner: banner };
})();
if (typeof module === 'object' && module.exports) module.exports = EquityBanner;
