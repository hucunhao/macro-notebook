# 早报

`#/brief` 永远打开**最新一期全文**。某一天是 `#/brief/YYYY-MM-DD`。

发布后的固定地址：<https://hucunhao.github.io/macro-notebook/#/brief>

页面从这三处读取，都是仓库里的静态文件：

- `content/briefs/YYYY-MM-DD.md` — 当天全文（Markdown）
- `content/briefs/latest.json` — 最新一天，形如 `{ "date": "YYYY-MM-DD" }`
- `content/briefs/index.json` — 往期列表。每项 `{ "date": "YYYY-MM-DD", "summary": "一句话" }`。按日期从旧到新排列，新的一天加在**末尾**。页面自己按日期倒序显示。

直接双击 `index.html` 时浏览器不让读取这些文件。用上面的 Pages 地址，或在仓库目录运行 `python3 -m http.server`。

## 每天怎么更新

没有自动同步。三步都要做，缺一步页面就会停在旧的一天或往期里没有新日期。

1. 把当天的 Markdown 复制为 `content/briefs/YYYY-MM-DD.md`（文件名就是日期，不要保留 `morning_brief_` 前缀）。
2. 把 `content/briefs/latest.json` 改成 `{ "date": "YYYY-MM-DD" }`。
3. 在 `content/briefs/index.json` 末尾追加一项：`{ "date": "YYYY-MM-DD", "summary": "……" }`。

`summary` 是往期列表里的那一行，取自正文，不要改写。

- 找到 `**今日结论` 或「今日结论」。
- 从标题后面的正文起，取**第一个完整句子**，一直到第一个中文句号 `。`，或第一个作为句号的英文句点 `.`。
- 数字里的小数点不算句号。`1.0`、`0.25%` 这种两边都是数字的 `.` 要留在句子里，继续往后找真正的句尾。
- 句子本身保留，连同结尾的 `。` 或 `.`。去掉成对的 `**`、`__`，换行收成空格。
- 找不到这个标题，或找不到句尾，`summary` 用空字符串 `""`。不要编一句。

例：`道指 +1.0% …… 下方 0.25%。信用市场……` 的摘要停在 `0.25%。`，不会停在 `1.0` 的小数点上。

只有 `title`、没有 `summary` 时，页面用 `title` 当这一行。已经写了 `"summary": ""` 就不会再拿标题顶上。
