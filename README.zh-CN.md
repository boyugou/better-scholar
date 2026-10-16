<div align="center">

<img src="assets/icon.svg" alt="Better Scholar" width="128" height="128">

# Better Scholar

**谷歌学术学者主页增强。作者角色、CCF 与 CORE 等级、获奖论文、引用统计与带运算符的搜索 — 零依赖。**

[![License](https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square)](LICENSE)
[![Chrome MV3](https://img.shields.io/badge/Chrome-MV3-4285F4?style=flat-square&logo=googlechrome&logoColor=white)](https://github.com/boyugou/better-scholar)
[![Tests](https://img.shields.io/github/actions/workflow/status/boyugou/better-scholar/test.yml?branch=main&style=flat-square&label=tests&logo=githubactions&logoColor=white)](https://github.com/boyugou/better-scholar/actions)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-success?style=flat-square)](package.json)
[![Languages](https://img.shields.io/badge/languages-30%20locales-6B57D2?style=flat-square)](src/_locales)
[![Privacy](https://img.shields.io/badge/privacy-local--first%20·%20no%20tracking-008080?style=flat-square)](PRIVACY.md)

[官方网站（30 种语言）](https://boyugou.github.io/better-scholar/) · [English](README.md) · [安装使用](#安装使用) · [核心功能](#核心功能) · [搜索运算符](#搜索运算符) · [工作原理](#工作原理) · [复制与导出](#复制与导出) · [面向 AI 智能体](#面向-ai-智能体) · [隐私政策](PRIVACY.md)

<br>

<img src="store/chrome/images/screenshot-1.jpg" alt="Better Scholar 在谷歌学术作者主页上的展示" width="920">

<br><br>

<table>
  <tr>
    <td align="center" width="50%"><img src="store/chrome/images/screenshot-2.jpg" alt="侧栏面板：角色 × 等级表、复制与导出按钮、奖项与报告、筛选" width="460"></td>
    <td align="center" width="50%"><img src="store/chrome/images/screenshot-3.jpg" alt="用 role:first ccf:a cites:>100 搜索，列表与总计随之收窄" width="460"></td>
  </tr>
  <tr>
    <td align="center"><sub>面板：角色 × 等级表、复制 / 导出、奖项与报告、筛选</sub></td>
    <td align="center"><sub>搜索：<code>role:first ccf:a cites:&gt;100</code>，列表与总计随之收窄</sub></td>
  </tr>
  <tr>
    <td align="center" width="50%"><img src="store/chrome/images/screenshot-4.jpg" alt="设置页：每个部分都有开关，带实时预览" width="460"></td>
    <td align="center" width="50%"><img src="store/chrome/images/screenshot-5.jpg" alt="工具栏弹窗：当前主页的表格与复制 / 导出按钮" width="460"></td>
  </tr>
  <tr>
    <td align="center"><sub>设置页：每个部分都有开关，实时预览</sub></td>
    <td align="center"><sub>工具栏弹窗：表格与复制 / 导出按钮</sub></td>
  </tr>
</table>

</div>

---

Better Scholar 是一款面向 [Google Scholar](https://scholar.google.com) 学者主页的 Chrome（Manifest V3）扩展。它判断主页主人在每篇论文中的作者角色（一作、共一、二作、末位作者），把每个发表场所与 **CCF**（2026 第七版）和 **CORE**（ICORE 2026）名录对照，标出获奖论文和作者自己写明的报告形式（Oral、Spotlight、Highlight），并在一个面板中汇总：角色 × 等级表、引用统计、按年份分布、带运算符的搜索框，以及复制 / 导出按钮。

- **零依赖，无构建步骤。** 直接以“加载已解压的扩展程序”方式加载 `src/`。
- **查准率优先。** 场所匹配没有任何模糊或子串回退。无法确定的场所不给徽章，而是列在面板里；每个徽章的悬停提示都写明匹配到的场所、所用规则和名录版本。
- **作者角色。** 一作、共一（开头几位作者共享 `*`、`†` 等标记）、二作、末位作者。作者行中会标出你的名字，悬停可见你的位次。
- **获奖与报告形式。** 内置 7,830 项取自官方获奖页面的论文奖项名单，并识别作者自己写明的 Oral / Spotlight / Highlight。
- **引用统计。** 高亮论文的论文数、引用数、h 指数与 i10 指数，与全部论文并列显示。点击 h 指数、i10 指数按钮，可列出构成该数字的高亮论文。
- **带运算符的搜索。** 按 `/` 聚焦搜索框；可输入普通词以及 `cites:`、`year:`、`age:`、`ccf:`、`core:`、`role:`、`type:`、`has:`，输入时给出建议。表格、奖项与报告的计数和“复制摘要”随筛选（年份范围、搜索、快捷按钮…）收窄；设置页里可关闭。
- **复制与导出。** 摘要、表格、论文列表、APA、BibTeX、Markdown、JSON 复制到剪贴板，CSV 保存为文件；设置里每种格式各有一个开关，工具栏弹窗中也有同样的按钮。
- **一个设置页。** 实时预览、预设、配色主题与 JSON 配置。面板本身不保存任何设置。
- **面向 AI 智能体。** *Copy guide for agents* 把全部设置、你当前的取值、页面调用与搜索语法交给 AI 助手；页面事件让浏览器智能体读取面板的数字并设置筛选。
- **30 种界面语言**，另有 *以此语言打开 Scholar*，让 Scholar 本身以你选的语言打开。
- **隐私。** 无账号、无统计分析、无追踪。唯一发往 Scholar 以外网站的请求是可选的 Semantic Scholar 标题查询，默认关闭。详见 [`PRIVACY.md`](PRIVACY.md)。

## 数字一览

扩展由多少东西构成，全部从代码和数据统计，没有一个是手写的（`npm run numbers`）：

<!-- numbers:begin -->
| 数字 | 含义 | 统计自 |
|---:|---|---|
| **153** | 项可调整的设置，分在 18 张卡片里——86 个开关、48 处可以改成自己的叫法、19 项颜色、选项、顺序和语言 | 设置树的各行（`src/lib/prefs.js`） |
| **171** | 个节点，共 4 层：卡片、某个部分的开关、其中的一项、它的名字 | 卡片和各行；每一行挂在所属部分的开关下 |
| **9 · 8 · 10 · 6 · 4** | 个面板部分、复制格式和快捷筛选——每一项都有自己的开关，多数还能排顺序——以及可选的标签样式和预设 | `SECTIONS`、`COPY_BUTTONS`、`PILLS`、`CHIP_THEMES`、`PRESETS` |
| **30** | 种界面语言——每种 350 条文案，共 10,150 条译文 | `src/_locales/*/messages.json` |
| **1,179** | 个有等级的发表场所，分在两个内置榜单的 1,481 行里（386 个 CCF 会议、295 个 CCF 期刊、800 个 CORE 会议）：其中 298 个在两个榜单里各有一行 | `src/data/ccf.js` 和 `src/data/core.js` 的各行，由 `idx.partners` 关联 |
| **350+** | 个 Scholar 会写、榜单里却没有的名字，收在 240+ 条人工整理的条目里（旧名与改名、别的拼写、榜单自己的错字、不给标签的同名会议） | `src/data/aliases.js` |
| **2,400+** · **1,100+** | 个名称写法和缩写，匹配器逐一查找 | 各索引的键 |
| **150+** | 个两个榜单叫法不同、匹配器知道是同一个的发表场所：其中一个榜单的写法认出来，另一个榜单的等级也一并给出 | `idx.partners` |
| **5 · 13** | 道识别步骤（全名、期刊词袋、缩写、被截断名称的可见开头、全名加副标题）和防止较弱判断压过较强判断的防护 | `src/lib/venues.js` 中标注的步骤与 `docs/ARCHITECTURE.md` 的检查表 |
| **7,724** | 篇获奖论文（共 7,830 项奖项），来自 194 个会议和系列，1990–2026 年 | `src/data/awards.js` |
| **22,744** | 行真实的 Scholar 发表场所文本，每一行的标签都逐一看过并记录在案 | `test/fixtures/venues.expected.json` |
| **500+ · 80+ · 15** | 个单元测试、在加载了扩展的真实 Chromium 里运行的端到端检查、网页演示的检查 | `test/*.test.js`、`test/e2e/` |
| **0** | 个依赖，也没有构建步骤 | `package.json` |

这些数字由 `npm run numbers` 从代码和数据里统计，并有测试保证与实际一致；随每次修复增长的数目只写成向下取整的“N+”。
<!-- numbers:end -->

## 工作原理

```
Scholar 学者主页 ──► content/scholar.js   (读取论文行；按下 Scholar 的“显示更多”)
                         │ 标题、作者行、场所行、引用数、年份
                         ▼
                    lib/analysis.js ──► lib/names.js    主页主人与角色（一作、共一、二作、末位 …）
                         │          ├─► lib/venues.js   CCF / CORE 等级  ◄── data/ccf.js, data/core.js, data/aliases.js
                         │          ├─► lib/marks.js    作者写明的获奖与报告形式
                         │          └─► lib/awards.js   获奖论文名单  ◄── data/awards.js
                         ▼
                    content/main.js   (状态、筛选、论文行装饰；设置来自 lib/prefs.js)
                         │
    ┌────────────────────┼───────────────────────┬─────────────────────────────┐
    ▼                    ▼                       ▼                             ▼
content/panel.js     论文行：角色着色、       lib/formats.js              content/bridge.js
表格、搜索            等级与获奖徽章、         复制与导出的文本            页面事件与弹窗的调用
(lib/query.js)、     标出的名字               (BibTeX、APA、CSV …)        (lib/agent.js)
统计、年份
```

`src/lib/` 中的代码全部是纯函数（不碰 DOM，不用 `chrome.*`）：在扩展里每个文件挂到 `globalThis.RolesRanks` 上，在 Node 中则用 `require` 加载，所以单元测试无需构建即可直接运行真实代码。设置页与工具栏弹窗是独立页面；弹窗向学者主页的标签页索取数字。细节见 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)。

## 核心功能

### 1. 作者角色与你的名字
- **角色：** 一作；共一（你位于开头至少两位共享同一标记的作者之中，如 `A*, B*, C`）；二作；末位作者（仅当作者列表完整时；两位作者的论文中二作即末位）；其他位次不高亮。
- **你的名字** 会在作者行中标出（*在作者行里标出我的名字*），悬停提示为“一作 · 第 1 位 / 共 8 位”。
- **被截断的作者列表：** 当 Scholar 用“…”在你的名字之前截断列表时，你的角色是看不到的。面板中的 *补全*（Read full lists）会读取每篇这样的论文在 Scholar 上的单独页面（约每秒一篇，仅在点击之后；可选先问 Semantic Scholar），从而找出角色。
- **名字写法：** 能匹配 Scholar 印出的首字母缩写（`GE Hinton` 即 Geoffrey Hinton）。主页姓名的另一种语序（`Tang Jie` 即 Jie Tang）只有在主页自己的论文行能证明时才会自动使用；在你论文中发现的其他写法会作为一键建议给出，你也可以自己添加（*名字没匹配上？添加一种写法*，每个主页最多八种）。

### 2. 场所等级（CCF 与 CORE）
- **查准率优先于查全率：** 场所只通过全称或人工整理的别名、强缩写信号（`(ICML)`、`ISCA 2014`），或在 Scholar 截断名称时通过只有一个场所具备的开头来匹配。有歧义就不给徽章。
- **会议与期刊分别检索；** 由字符串本身的用词决定查哪一份名录。
- **非主会轨道** —— Findings、Workshop、Demo、Poster、Tutorial、扩展摘要、短文与工业论文、Shared Task —— 不给徽章，除非该场所的官方名称本身含有这个词。
- **来源可查：** 徽章的悬停提示写明匹配到的场所、规则和名录版本。等级取自当前名录，而非论文发表时的等级；面板和每条提示都会说明这一点。
- **一个标签，不是两个：** CCF 与 CORE 收录的会议大同小异，所以默认一篇论文只显示 CCF 的标签，只有 CCF 没有收录该场所时才用 CORE 的标签补上（CCF 标签的悬停提示里仍会写出 CORE 的等级）。“CORE 优先”反过来，“两者都显示”两个都画。常发表的会议列表、Markdown 与 BibTeX 的注释跟随这个选择；角色×等级表（两个榜单各有一个页签）、搜索和其他复制格式仍保留两个榜单。
- **两个榜单互相关联：** CCF 与 CORE 对同一个会议常有不同的叫法（*ACM SIGCHI Conference on Designing Interactive Systems* / *Designing Interactive Systems*），所以其中一个榜单的名称认出了某个字符串，另一个榜单里同一个会议的那一行也会一并给出。

### 3. 获奖与报告形式
- **获奖名单：** 7,830 项论文奖项（最佳论文、最佳学生论文、杰出与卓越论文、荣誉提名、分类奖项、时间检验奖），均取自官方页面 —— ACL Anthology 的获奖数据、计算机视觉基金会（CVF），以及各会议和学会自己的获奖页面（NeurIPS、ICML、ICLR、CVPR、ICCV、ECCV、ACL、EMNLP、NAACL、AAAI、IJCAI、SIGCOMM、S&P、CCS、USENIX Security、SIGMOD、VLDB、OSDI、SOSP、CHI 等）。只有标题完全一致、且获奖记录的第一作者在该论文作者之中，才算匹配。
- **作者自己写明的内容：** 获奖用语（Best Paper、Outstanding Paper、Test of Time、最佳论文候选）以及报告形式 Oral、Spotlight、Highlight，从标题或场所文本中读出，规则会避开普通词汇（如 *Oral Oncology*）。

### 4. 面板与工具栏弹窗
- **角色 × 等级表**（CCF 或 CORE）：点击单元格、角色或等级，即列出对应论文。
- **复制行：** 设置中每开启一种格式，就有一个按钮（见[复制与导出](#复制与导出)）。
- **获奖与报告形式计数：** 点击即列出对应论文。
- **由你来安排：** 每个部分和其中每样东西都有独立开关，各部分（以及复制按钮和快捷筛选）可以任意调整顺序，标题、列名和按钮可以换成你自己的叫法（见[设置页](#5-设置页)）。
- **搜索框与筛选：** 普通词与[运算符](#搜索运算符)、快捷按钮（CCF A、>100 次引用、一作、获奖）、*只显示高亮*，以及由两个下拉框选择的年份区间。
- **引用统计：** 高亮论文的论文数、引用数、h 指数与 i10 指数，各自与全部论文的数字并列。**h 指数按钮** 列出引用不少于 *h* 次的高亮论文（*h* 按其他筛选放行的高亮论文计算）；**i10 指数按钮** 列出引用不少于 10 次的高亮论文。
- **按年份：** 高亮论文每年一根柱，按角色分色堆叠，最多显示最近 50 年；点击某根柱即筛选该年。
- **常见发表场所**（默认关闭）：高亮论文所在的有等级场所，按论文数排序；点击即列出该场所的论文。
- **状态：** 已加载的论文数与 *全部加载*；被截断列表隐藏的角色与 *补全*；重复的条目；位于无等级场所的论文，附 *复制列表*、*反馈*，以及每个场所后的 *检查* 链接（打开设置页的 *检查场所*，并填入该场所的文字）。
- **名字写法：** *名字没匹配上？添加一种写法*，以及建议。
- 顶部的提示条显示筛选后可见多少篇论文，并可一键清除；在页面上按 `Escape` 也会清除。面板的每个部分在设置页中都有自己的开关。
- **完整论文列表：** Scholar 起初只显示主页的前若干篇论文，按下它自己的“显示更多”（Show more）按钮才加载更多。扩展默认替你按这个按钮直到列表完整 —— 一次只按一下，约每秒一次，只在你正在看的标签页中 —— 并在第一次按下却没有新论文时停止。关闭 *自动加载全部论文* 后，面板会提供 *全部加载*。
- **工具栏弹窗：** 针对当前标签页中的主页，显示同样的表格、获奖与报告形式计数和复制按钮，受同样的开关控制。

### 5. 设置页
每项更改立即保存，已打开的 Scholar 标签页随之重绘。右侧的预览是真实的面板加示例论文行，而且**它是编辑器，不只是一张图**：左侧的卡片与预览自上而下的顺序一致，把鼠标放在某个设置上会圈出它所绘制的内容，把鼠标放在预览的某个部分上则可点 ✕ 隐藏、拖动 ⠿ 移动、点 ✎（或双击名称）改名、点 ⚙ 跳到左侧对应的设置（双击其他任何内容也一样）；预览上方的托盘会列出被隐藏的东西，一键即可恢复。两边改的是同一份设置。

- **每个元素都有开关。** 面板的每个部分（表格、复制行、获奖与报告、筛选、引用总计、年份图、场所列表、状态行、名字辅助）以及其中的每一样东西（标题、表格的某一列或某一行、某个按钮、某个快捷筛选、某个数字）都有各自的开关。开关只决定*画不画*；所见即所搜、所复制。
- **顺序。** 面板的各部分、复制按钮和快捷筛选都可以任意调整顺序：在预览上拖动，或用左侧的按钮。
- **你自己的名字。** 48 处标题、列名、按钮和徽章文字可以换成你自己的叫法。自定义名称在所有语言里都会取代翻译；导出内容、搜索运算符和页面调用仍用标准用词。
- **徽章外观。** 描边、柔和、实心或纯文字；圆角或方角；带列表名或只显示等级；CCF、CORE、获奖、报告各一种颜色；另有六套现成外观。

各卡片依次为（与预览的顺序一致）：

| 卡片 | 内容 |
|---|---|
| 语言 | 扩展语言（或跟随浏览器）；*以此语言打开 Scholar* |
| 高亮我的论文 | 每种角色一个开关；*在作者行里标出我的名字* |
| 颜色 | 五套配色主题（Default、Cool、Warm、High contrast、Soft）；每种角色一个颜色，附对比度标记；行的高亮样式：底色加色条、只要色条、只要底色、无 |
| 每篇论文上的徽章 | CCF、CORE、获奖和报告徽章；获奖徽章的名称；徽章外观（六套现成外观、样式、形状、文字、颜色） |
| 摘要面板 | 面板本身；各部分的顺序；标题栏的各个部分；提示“列表已被筛选”的那一条；*精简* |
| 角色 × 等级表、复制与导出、获奖与报告、筛选、引用总计、年份图、主要场所、已加载论文与无等级场所、名字拼写辅助 | 面板每个部分一张卡片：它的开关、其中每样东西的开关（和名称），有顺序的还有顺序 |
| Scholar 自带的区块 | 隐藏 *被引用次数*（或只隐藏其表格或图表）、*合著者*、*公开访问* |
| 重复条目 | *合并重复论文* |
| 论文列表 | *自动加载全部论文* |
| Semantic Scholar | *优先用 Semantic Scholar 补全作者列表*（默认关闭）；可选的 API 密钥 |
| 检查场所 | 一个文本框：粘贴 Scholar 印出的场所文字，看 CCF 与 CORE 给它什么等级、匹配到哪个条目、依据哪条规则（名称、缩写、被截断名称的可见部分），CCF 场所还有其研究领域和指向 DBLP 页面的链接（点击才会打开）——或者它为什么没有等级（研讨会等次要类别；名录无法确定它） |
| AI agents | *Copy guide for agents* |
| 配置与预设 | 预设 *全功能开启*、*Last author focus*、*第一作者偏好*、*极简风格*；*复制配置 (JSON)*、*导出文件*、*导入文件*，以及一个 JSON 编辑器 |
| 已保存的数据 | *查看已保存详情*、*清除已保存的论文详情*、*恢复默认设置*、*复制问题报告所需的信息* |

- **配置只用 JSON。** 编辑器和 *导入文件* 接受与导出记录同形的补丁，如 `{ "panel": { "years": { "show": false }, "copy": { "order": ["bibtex", "summary"] } }, "rows": { "style": "bar" }, "labels": { "metricsTitle": "我的论文" } }`；页面会说明应用了什么、忽略了什么及原因。预设只改它列出的设置，没有任何预设会打开 Semantic Scholar。
- **旧版本的设置不做迁移。** 存储的记录逐项读取：名称和类型仍与某项设置相符的值予以保留，其余一律回到默认值。
- **对比度标记：** 每种角色颜色都显示它与 Scholar 白色页面的对比度，低于 3:1（WCAG 对图形的最低要求，也是行首色条保持可见所需）时给出提醒。
- 卡片上方有一个搜索框可筛选设置项；按 `/` 聚焦。
- Chrome 对同步设置每分钟只接受 120 次写入；设置页最多写约 100 次，并在 Chrome 拒绝写入时给出提示。

### 6. 界面语言
扩展支持 30 种语言：English、简体中文、繁體中文、日本語、한국어、Español、Français、Deutsch、Italiano、Português (Brasil)、Português (Portugal)、Русский、Українська、Polski、Čeština、Nederlands、Svenska、Dansk、Suomi、Norsk、Türkçe、العربية、עברית、हिन्दी、Bahasa Indonesia、Tiếng Việt、ไทย、Ελληνικά、Magyar、Română。默认跟随浏览器，也可自选。*以此语言打开 Scholar* 通过设置 Scholar 的 `hl=`，让 Scholar 的搜索页与作者页（`/scholar`、`/citations`）以你选的语言打开。

---

## 搜索运算符

在学者主页上按 `/` 即可聚焦搜索框（面板及其筛选部分须为显示状态）。论文必须匹配所有普通词和所有运算符。普通词会在标题、作者、场所、场所在名录中的名称、年份、角色和获奖标记中查找，不区分大小写。

| 运算符 | 示例 | 匹配 |
|---|---|---|
| `cites:` | `cites:>100`、`cites:>=50`、`cites:<10`、`cites:25` | 引用数与一个数比较：`>` `>=` `<` `<=` `=`（只写数字即 `=`） |
| `year:` | `year:>=2020`、`year:<2015`、`year:2023` | 发表年份，比较方式同上 |
| `age:` | `age:<5`、`age:<=10`、`age:0` | 论文发表至今的年数，比较方式同上；今年为 0，所以 `age:<5` 即最近五年，并随年份自动更新（“最近 5 年”快捷按钮会加入它） |
| `ccf:` | `ccf:a`、`ccf:b`、`ccf:c` | 场所的 CCF 等级 |
| `core:` | `core:a*`、`core:a`、`core:b`、`core:c` | 场所的 CORE 等级 |
| `role:` | `role:first`、`role:cofirst`、`role:second`、`role:last`、`role:middle` | 你在作者列表中的位次（`middle`：不属于前四种） |
| `type:` | `type:conference`、`type:journal` | 名录所记的发表场所类型：会议或期刊（没有等级的场所没有类型） |
| `has:` | `has:award`、`has:talk` | 最佳论文奖或候选标记；Oral、Spotlight 或 Highlight 标记 |
| 普通词 | `ccf:a role:first cites:>100 detection` | 组合使用：所有条件都须满足 |

`ccf:`、`core:`、`role:`、`type:`、`has:` 的值可以用逗号列出：`role:first,last` 表示“一作或末位”（任一），`ccf:a,b` 表示 CCF A 或 B 类场所；不同的词必须同时成立。同一运算符的快捷按钮会合并成一个词（同时按“一作”和“末位”得到 `role:first,last`），而不是要求不可能的“既是一作又是末位”。

- 运算符取了它不接受的值（如 `ccf:x`）时不匹配任何论文，搜索框会被标出，悬停可见原因。冒号前不是运算符的词（如 `http://…`）按普通词处理。早期版本的裸比较式（`>100`、`>2020`）以及别名 `c:`、`y:`、`tier:`、`rank:` 已取消。
- 输入运算符的冒号（如 `role:`）会列出它的取值；按 `↓` 或点击 `/` 提示会列出常用项。用 `↑` / `↓` 选择，`Enter` 或 `Tab` 采用所选项。没有选中建议时，`Enter` 跳到下一条匹配的论文行，`Shift`+`Enter` 跳到上一条。
- `Escape` 先关闭建议列表，再清空搜索框；在页面上按 `Escape` 会清除全部筛选。
- 搜索框下方的快捷按钮默认可切换 `ccf:a`、`cites:>100`、`role:first` 和 `has:award`；设置里还可再加 `core:a*`、`role:cofirst`、`role:second`、`role:last`、`has:talk`；页面上没有任何东西画出的那类论文，对应的按钮不显示。
- 搜索框最多接受 500 个字符。

---

## 复制与导出

每种格式在面板的复制行和工具栏弹窗中各是一个按钮，并在 *设置 → Copy & export* 中各有一个开关（默认全部开启；全部关闭时不显示复制行）。论文类格式取页面当前显示的论文（即筛选之后），并使用 *补全* 保存的完整作者列表；摘要和表格统计所有已加载的论文。

| 按钮 | 输出 |
|---|---|
| *复制摘要* | 纯文本的角色 × 等级表，附获奖与报告形式一行和名录版本 |
| *复制为表格* | 制表符分隔的角色 × 等级表，便于粘贴进电子表格（同时附带一份真正的表格，供文字处理软件粘贴） |
| *复制论文列表* | 制表符分隔的论文：年份、标题、作者、角色、场所、CCF、CORE、获奖、引用数（表头用界面语言）；同时附带一份真正的表格，供文字处理软件粘贴（页面标出你的名字时，作者栏里你的名字是粗体） |
| *复制 APA* | APA 第 7 版参考文献：`Authors (Year). Title. *Venue*. URL`；同时附带真正的斜体，供文字处理软件粘贴 |
| *复制 BibTeX* | BibTeX 条目 |
| *复制 Markdown* | 带编号的 Markdown 列表：带链接的标题、作者、场所与年份、等级、获奖、引用数 |
| *复制 JSON* | `{ owner, source, total, papers }`，每篇论文一条记录，含角色、等级与获奖标记 |
| *导出 CSV* | 论文表格保存为文件 `<主页姓名>-papers.csv` |

- **BibTeX：** 引用键由第一作者的姓、年份和标题中第一个至少三个字母、且不是 `the`、`for`、`with`、`towards` 这类常见词的单词组成，全部为小写 ASCII：`vaswani2017attention`、`he2016deep`。没有年份时写 `nodate`；重复的键依次加 `b`、`c` …（`he2016deepb`）。条目类型按名录或场所用词定为 `@inproceedings`（booktitle）或 `@article`（journal），否则为 `@misc`。字段：title、author（用 `and` 连接，Scholar 截断处以 `and others` 结尾）、booktitle 或 journal、year、url（论文的 Scholar 页面）、note（CCF / CORE 等级与获奖）。TeX 会解读的每个字符（`\ { } $ & # ^ _ ~ %`）都被转义，标题无法夹带命令。
- **APA 第 7 版：** `I Stoica` → `Stoica, I.`，`MF Kaashoek` → `Kaashoek, M. F.`，`L van der Maaten` → `van der Maaten, L.`；两位作者用 `&` 连接；超过 20 位作者时列出前 19 位、`…` 和最后一位；被截断的列表以 `…` 结尾；没有年份时写 `(n.d.)`。星号表示斜体。
- **Markdown：** Markdown 会解读的每个字符都被转义，标题无法变成链接或标记。
- **CSV：** 遵循 RFC 4180，带 UTF-8 字节顺序标记（让 Excel 正确显示中文等非拉丁文字），行尾为 CRLF；含逗号、引号、分号或换行的字段加引号。
- **Word、Docs、Pages：** 表格、论文列表和 APA 三个按钮在文本之外还把 HTML 放进剪贴板：文字处理软件粘贴出真正的表格（带边框），或带真正斜体、链接和悬挂缩进的参考文献；电子表格和文本框仍取文本。HTML 中的所有文字都经过转义，像公式的单元格与制表符格式一样被当作文本。其他格式只有文本。工具栏弹窗和 `export` 调用（`html: true`）给出同样的内容。
- **电子表格公式：** 在 CSV 和制表符分隔的格式中，以 `=`、`+`、`-` 或 `@` 开头（且不是纯数字）的单元格前会加一个撇号，电子表格会把它当作文本显示。
- 筛选后没有论文时不复制任何内容，按钮显示 *Nothing to copy*。

---

## 面向 AI 智能体

### 让 AI 助手帮你配置
*设置 → AI agents → Copy guide for agents* 会把一份 Markdown 指南放到剪贴板：每项设置（路径、取值、默认值、作用）、你当前的设置、预设、页面调用与搜索语法。它由代码实际使用的表格生成（`lib/prefs.js` 中的 `SETTINGS` 与 `PRESETS`、`lib/agent.js` 中的 `METHODS`、`lib/query.js` 中的 `OPERATORS`），因此不会与代码脱节。把它和你的需求一起交给 AI 助手，再把它的回答（一个 JSON 对象）粘贴到 *配置与预设 → Paste or edit a configuration (JSON)*，然后按 *应用配置*。

### 页面事件
在学者主页上，扩展运行后会在 `<html>` 上设置属性 `data-rr-ready`（值为 `"true"`），并以 `better-scholar:response` 事件回答在 `document` 上派发的 `better-scholar:request` 事件：

```javascript
const id = crypto.randomUUID();
const answer = new Promise((resolve) => {
  const on = (e) => { if (e.detail.id === id) { document.removeEventListener("better-scholar:response", on); resolve(e.detail); } };
  document.addEventListener("better-scholar:response", on);
});
document.dispatchEvent(new CustomEvent("better-scholar:request", { detail: { id, method: "export", params: { format: "bibtex" } } }));
const { ok, result, error } = await answer;   // result.text 即 BibTeX
```

请求的 `detail` 为 `{ id, method, params }`；字符串或数字类型的 `id` 原样返回（其他类型返回 `null`）。回答为 `{ id, ok: true, result }` 或 `{ id, ok: false, error }`。

| 调用 | 参数 | 结果 |
|---|---|---|
| `ping` | 无 | `{ version, owner, loaded, complete }` |
| `summary` | `filtered`（`true`：表格与获奖、报告形式计数按筛选后剩下的论文统计，同面板；默认 `false`：所有已加载的论文） | 角色 × 等级表（CCF、CORE、仅按角色）、获奖与报告形式计数、引用统计、`counted`（表格统计的论文数） |
| `papers` | `filtered`（默认 `true`：页面当前显示的论文；`false`：所有已加载的论文） | `{ owner, total, papers: [{ id, title, authors, me, venue, year, citations, role, status, highlighted, type, rank, marks, url }] }` |
| `export` | `format`（必填：`summary`、`table`、`papers`、`apa`、`bibtex`、`markdown`、`json`、`csv`）；`source`（`ccf`、`core`、`none`；用于摘要和表格）；`html`（`true`：对 `table`、`papers`、`apa` 另返回 `html`）；`filtered`（`true`：摘要和表格按筛选后剩下的论文统计） | `{ format, text, html? }` |
| `filter` | `query`、`onlyHighlighted`、`yearStart`、`yearEnd`、`minCitations`、`impact`（`h` 或 `i10`）；`null` 清除一个数值 | `{ shown, total, filters, errors, ignored }`（`ignored`：设置里没有对应控件而被忽略的筛选） |
| `clearFilters` | 无 | `{ shown, total, filters, errors }` |

- 参数在执行任何操作之前先经检查；不合规的参数得到 `ok: false` 及原因。面板关闭时 `filter` 会被拒绝，因为页面上没有任何控件能撤销它。
- 这些调用读取面板显示的内容并设置页面的筛选；它们不能读取或修改设置，也不发出任何网络请求。页面上的任何脚本都可以调用它们，详见 [`SECURITY.md`](SECURITY.md)。
- 工具栏弹窗通过扩展自己的消息（`{ type: "rr:call", method, params }`）发出同样的调用，网页和其他扩展无法使用这个通道。

---

## 安装使用

### Chrome 与其他 Chromium 内核浏览器（Edge、Brave、Arc、Opera）

1. 克隆或下载本仓库。
2. 打开 `chrome://extensions`。
3. 打开右上角的 **开发者模式**（Developer mode）。
4. 点击 **加载已解压的扩展程序**（Load unpacked），选择 [`src/`](src/) 文件夹。
5. 打开任意 Google Scholar 学者主页（`scholar.google.com/citations?user=…`）。

> [!TIP]
> 执行 `git pull` 之后，在 `chrome://extensions` 的 Better Scholar 卡片上点击刷新图标，并刷新已打开的 Scholar 标签页。

### 打包

```bash
scripts/package-chrome.sh      # 先检查内置数据，再生成 dist/better-scholar-chrome-<version>.zip
```

---

## 代码库结构

```
better-scholar/
├── src/                    扩展本身（从这里加载已解压的扩展程序）
│   ├── manifest.json       Manifest V3；只有一个权限（storage）；在 Scholar 页面上运行的脚本
│   ├── background.js       为面板打开设置页；提供所选语言的界面文字
│   ├── content/            Scholar 页面上的部分：页面读取、面板、徽章、存储、页面事件、论文页、语言跳转、样式
│   ├── lib/                纯逻辑：names、venues、marks、awards、metrics、query、formats、prefs、agent、analysis、duplicates、i18n
│   ├── data/               内置 CCF / CORE 名录、获奖名单、人工整理的场所别名
│   ├── options/            带实时预览的设置页
│   ├── popup/              工具栏弹窗：汇总表与复制按钮
│   └── _locales/           30 种界面语言的文字
├── data/                   源数据集（CCF PDF 抽取、ICORE 导出、获奖名单）及其来源说明
├── scripts/                数据构建、CCF 抽取、获奖页面读取、各项检查、打包、无障碍审查
├── test/                   单元测试；e2e/ 在 Chromium 中对仿真 Scholar 页面运行端到端检查
├── docs/                   架构与路线图
├── store/                  Chrome 应用商店提交素材：上架文案、每条说法的依据、安装包记录、图片
└── contrib/safari/         尽力而为的 Safari 封装生成脚本
```

---

## 开发与测试

单元测试在 Node.js（20 或更高）上运行，无任何依赖；端到端检查和审查脚本需要 Playwright 与一个 Chromium 版本。

```bash
npm test                              # 单元测试
npm run test:e2e                      # 端到端检查：真实扩展在 Chromium 中对本地仿真 Scholar 页面运行
npm run test:update                   # 审阅差异之后，重写场所匹配快照
npm run data                          # 由 data/*.json 重新生成 src/data/{ccf,core,awards}.js
npm run check:profile -- page.html    # 在一个真实保存的 Scholar 学者主页上运行扩展
node scripts/axe-audit.mjs            # 用 axe-core 做无障碍审查
```

### 无障碍检查
下面是实际检查的内容与方式，并不代表符合任何 WCAG 等级：

- `node scripts/axe-audit.mjs` 在本地仿真 Scholar 页面上用 axe-core 4.10 的默认规则检查面板（浅色；系统为深色模式时；筛选后并展开无等级场所列表；所有部分开启；窄窗口布局；阿拉伯语、日语、泰语和德语），以及设置页（浅色与深色，以及人们会把它置于的各种状态：悬停某个部分、正在改名、托盘展开、检查了一个场所）和工具栏弹窗（未打开学者主页时，以及打开主页后的浅色、深色与四种语言；也包括每个名称取最长时）。出现任何违规即以退出码 1 结束。它需手动运行，不在 CI 中。
- 一个单元测试确保面板、设置页和弹窗中的浅色辅助文字、末位作者名字在其底色上、以及 Scholar 的灰色文字在各行底色上的对比度不低于 4.5:1。
- 设置页中每种角色颜色都有对比度标记（见[设置页](#5-设置页)）。

---

## 文档

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)：模块、匹配规则、存储、面板、测试。
- [`ROADMAP.md`](ROADMAP.md) 与 [`docs/ROADMAP.md`](docs/ROADMAP.md)：后续计划、已知缺口，以及搁置的事项和原因。
- [`CONTRIBUTING.md`](CONTRIBUTING.md)：命令、用真实字符串修正匹配器、添加设置项、添加获奖来源。
- [`SECURITY.md`](SECURITY.md)：网页能接触到什么、该报告什么、如何报告。
- [`PRIVACY.md`](PRIVACY.md)：存储了什么、存在哪里、发送了什么。
- [`AGENTS.md`](AGENTS.md)：面向 AI 智能体与自动化的说明。
- [`CHANGELOG.md`](CHANGELOG.md)：每个版本的变化。

---

## 数据来源

| 数据集 | 版本 | 范围 | 来源 |
|---|---|---|---|
| **中国计算机学会（CCF）推荐目录** | 2026 年（第七版） | 386 个会议 + 295 种期刊（A 95、B 245、C 341） | [ccf.org.cn](https://www.ccf.org.cn/Academic_Evaluation/By_category/)，从官方 PDF 可复现地抽取 |
| **CORE 会议等级** | ICORE 2026 | 800 个有等级的会议（A* 62、A 108、B 249、C 381） | [portal.core.edu.au](https://portal.core.edu.au/conf-ranks/)，官方导出 |
| **论文奖项** | 2026-10，人工整理 | 7830 项论文奖项 | 官方获奖页面：[ACL Anthology](https://aclanthology.org)、计算机视觉基金会（CVF）、各会议及其学会（ACM 各 SIG、IEEE 各技术委员会 …）；每条记录都保留其来源页面和一段引文 |

等级取自当前名录，而非论文发表时场所所处的等级。一个 GitHub 工作流每周一检查内置的 CCF 与 ICORE 文件是否仍与官方来源一致（`.github/workflows/data-fresh.yml`）。名录归各发布机构所有，收录仅供参考，详见 [`NOTICE`](NOTICE)。

---

## 平台策略

Chrome 是首要支持的平台：功能、API 与界面都为 Chrome Manifest V3 设计，不为其他浏览器接受任何垫片或降级。其他 Chromium 内核浏览器（Edge、Brave …）运行同一个扩展包。Safari 仅尽力支持，位于 [`contrib/safari/`](contrib/safari/README.md)，是由 `src/` 生成的封装。

---

## 开源协议

本项目采用 [Apache License 2.0](LICENSE) 开源协议。
名录数据集的版权归各相关机构所有（参见 [`NOTICE`](NOTICE)）。
