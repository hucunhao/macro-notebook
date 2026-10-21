# Market Dashboard

每天看盘用的市场面板（学习内容已搬到 https://hucunhao.github.io/quant-learning/ ）。纯静态（HTML/CSS/JS），不需要编译。

页面：总览、美股、全球股市、热力图、利率曲线、信用、商品汇率、经济日历、财报日历、QDII 溢价、季节性，以及“更多”里的技术、估值、广度、同业比较、全部指标、笔记、数据来源。

- 打开：双击 `index.html`（file:// 可以用），或者放到 GitHub Pages。
- 更新数据：`python3 update_data.py`（约 8 分钟，联网；会顺带运行 `extra_data.py` 抓全球股指、商品汇率、经济日历、财报日历、QDII 溢价，这部分失败不影响核心数据）；只用已下载文件重建：`python3 update_data.py --offline`。
- 数据：`data/*.js` 给网页用（file:// 下浏览器不能 fetch JSON），`data/*.json` 内容相同；原始下载在 `raw/`。
- 手动读数：`manual_values.json`（现货金价、DXY 等网页读数）。
- 图表库：uPlot 1.6.30（`vendor/`，MIT 许可）。
- 你的门槛设置、猜测答案、笔记都只保存在浏览器 localStorage 里；笔记页可以导出 / 导入 JSON。
