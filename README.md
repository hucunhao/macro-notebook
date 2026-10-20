# 宏观观察本

个人的学习 + 观察网站。纯静态（HTML/CSS/JS），不需要编译。

- 打开：双击 `index.html`（file:// 可以用），或者放到 GitHub Pages。
- 更新数据：`python3 update_data.py`（约 5 分钟，联网）；只用已下载文件重建：`python3 update_data.py --offline`。
- 数据：`data/*.js` 给网页用（file:// 下浏览器不能 fetch JSON），`data/*.json` 内容相同；原始下载在 `raw/`。
- 手动读数：`manual_values.json`（现货金价、DXY 等网页读数）。
- 图表库：uPlot 1.6.30（`vendor/`，MIT 许可）。
- 你的门槛设置、猜测答案、笔记都只保存在浏览器 localStorage 里；笔记页可以导出 / 导入 JSON。
