<div align="center">

<img src="assets/icon.svg" alt="Better Scholar" width="128" height="128">

# Better Scholar

**谷歌学术学者主页全面增强。作者角色识别、CCF 与 CORE 会议期刊等级、顶会奖项、影响力指标与即时搜索 — 零依赖。**

[![License](https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square)](LICENSE)
[![Chrome MV3](https://img.shields.io/badge/Chrome-MV3-4285F4?style=flat-square&logo=googlechrome&logoColor=white)](https://github.com/boyugou/better-scholar)
[![Tests](https://img.shields.io/badge/tests-416%20passed%20·%2076%20e2e-34A853?style=flat-square&logo=githubactions&logoColor=white)](https://github.com/boyugou/better-scholar/actions)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-success?style=flat-square)](package.json)
[![Languages](https://img.shields.io/badge/languages-30%20locales-6B57D2?style=flat-square)](src/_locales)
[![Privacy](https://img.shields.io/badge/privacy-local--first%20·%20no%20tracking-008080?style=flat-square)](PRIVACY.md)

[官方网站（30 种语言）](https://boyugou.github.io/better-scholar/) · [English](README.md) · [安装使用](#安装使用) · [核心功能](#核心功能) · [搜索操作符](#即时搜索与高级查询运算符) · [工作原理](#工作原理) · [多格式导出](#多格式一键导出) · [AI 与智能体接口](#ai-与网页智能体-dom-事件桥梁) · [隐私政策](PRIVACY.md)

<br>

<img src="docs/screenshot.png" alt="Better Scholar 在谷歌学术作者主页上的展示" width="920">

<br><br>

<table>
  <tr>
    <td align="center" width="50%"><img src="docs/store/shot-1.png" alt="Google Scholar 作者主页：按角色着色的行、场所旁的 CCF / CORE 徽章、右侧的角色 × 等级汇总面板" width="460"></td>
    <td align="center" width="50%"><img src="docs/settings.png" alt="设置工作台：实时预览、作者位次开关、学术调色板预设与无障碍对比度检测" width="460"></td>
  </tr>
  <tr>
    <td align="center"><sub>主页增强：作者位次着色、CCF 与 CORE 徽章、交互式汇总面板与多维筛选</sub></td>
    <td align="center"><sub>设置工作台：所见即所得实时预览、学术主题调色板、WCAG 对比度核验、位次开关</sub></td>
  </tr>
</table>

</div>

---

Better Scholar 是一款遵循 Manifest V3 规范的浏览器扩展程序，专为 [Google Scholar](https://scholar.google.com) 学者主页打造。它能自动解析作者位次（一作、共一、二作、末位/通讯作者），对照 **CCF**（2026 第七版）与 **CORE**（ICORE 2026）权威名录精准标示发表场所等级，匹配顶会最佳论文等学术奖项，呈现 H-core 等交互式学术影响力指标，并提供支持复合学术操作符的快捷键即时检索。

- **本地优先与零外部依赖**：代码库完全自成一体，无 npm runtime 依赖，无打包构建步骤，直接以源码模式加载即可运行。
- **查准率绝对优先**：期刊与会议采用分立的多阶段 Token 规范化匹配，杜绝模糊拼串或猜词归类。无法精准匹配的场所列入面板，绝不标注错误徽章。
- **细致的作者角色识别**：精准区分一作、共一（共同第一作者标记 `*`、`†`）、二作与末位通讯作者；在作者行中智能高亮学者姓名并提示位次。
- **内置 7,830+ 篇官方权威获奖论文**：收录来自各顶会官网及 ACL Anthology 的最佳论文、杰出论文、时间检验奖，并结合解析作者自述的 Oral / Spotlight / Highlight 报告形式。
- **交互式影响力过滤**：点击角色 × 等级矩阵中的任意单元格，或点击 **h-index** / **i10-index** 指标行，一键过滤出核心高引论文列表。
- **即时检索与操作符自动补全**：在主页按 `/` 键即可聚焦搜索框。当输入操作符前缀（如 `role:`、`ccf:`、`core:`、`>`、`has:`）或按下方向键 <kbd>↓</kbd> 时，自动弹出精美分类建议菜单，按 <kbd>Enter</kbd> 或 <kbd>Tab</kbd> 自动补全。按 <kbd>Escape</kbd> 随时一键清空复位。
- **一键多格式学术导出**：支持一键复制标准且严谨的 BibTeX（含 LaTeX 特殊字符转义与 Scholar 直链）、APA 第 7 版、JSON、Markdown、RFC-4180 CSV、纯文本列表与表格。可在学者主页侧边面板或扩展工具栏弹出页中随时一键导出。
- **学术主题工作台与设计系统**：内置 5 套精选学术配色预设（`Classic Scholar`、`Ocean Sapphire`、`Sunset Orchid`、`High Contrast Pro`、`Nordic Slate`），支持每个角色独立取色并实时计算 WCAG 2.1 AA 对比度，采用全宽分段选择器（Segmented Controls）及支持快速检索的语言选择器。
- **AI 与 Web 智能体 DOM 事件桥梁**：在页面 `document` 上提供原生 CustomEvent 事件总线与 Chrome runtime 消息，便于大模型自动化程序、抓取脚本和开发者控制台直接调用。
- **30 种国际化语言**：提供 30 种语言的完整本地化翻译，并支持与 Scholar 界面的语言参数（`hl=`）双向智能同步。
- **严苛的隐私保护**：无账号体系、无追踪器、无数据统计、无多余网络请求。所有用户偏好仅通过浏览器原生 `chrome.storage.sync` 安全同步。详见 [`PRIVACY.md`](PRIVACY.md)。

## 工作原理

```
Google Scholar 学者主页 DOM ──► content/scholar.js (页面 DOM 读取与平滑自动翻页)
                                     │ 原始数据行：标题、作者列表、场所文本、引用数、年份
                                     ▼
                                lib/analysis.js
                                     │
        ┌────────────────────────────┼────────────────────────────┐
        ▼                            ▼                            ▼
  lib/names.js                 lib/venues.js                lib/marks.js
学者与作者角色推断             CCF / CORE 场所精准匹配        奖项与报告等级识别
(一作、共一、二作、末位...)     ◄── ccf.js, core.js, aliases   ◄── 内置 awards.js (7,830+)
        │                            │                            │
        └────────────────────────────┼────────────────────────────┘
                                     ▼
                               content/main.js
                     (响应式状态流、多重查询筛选、DOM 观察器)
                        │                       │
                        ▼                       ▼
                content/panel.js         论文行视觉增强
             (角色 × 等级矩阵面板、       (位次行着色、场所等级徽章、
              H-core 过滤与年份图谱)       学者姓名高亮标注)
                        │
                        ├─► 1-Click 一键导出 (BibTeX, APA, JSON, Markdown, CSV)
                        ├─► 操作符自动建议补全 (`role:`, `ccf:`, `>100`)
                        └─► 智能体 DOM 事件桥梁 (`better-scholar:*` CustomEvents)
```

`src/lib/` 目录下的所有解析核心代码均保持 **Pure**（纯函数式，不依赖任何 DOM 或 `chrome.*` API），在浏览器环境下挂载至 `globalThis.RolesRanks`，在 Node.js 环境下作为 CommonJS 模块导出，使得 416 个单元测试无需任何构建编译即可瞬间全绿运行。

## 核心功能

### 1. 作者位次判定与姓名智能标注
- **覆盖角色**：第一作者（First）、共同第一作者（Co-first，带 `*`、`†` 等标记）、第二作者（Second）、末位作者（Last，通常为资深指导教师/通讯作者）。
- **姓名高亮标注**：在论文作者列表中直接标出学者本人姓名，悬停可查看位次详情（如 `"一作 · 第 1 位 / 共 8 位"`）。
- **末位作者截断补全**：针对 Scholar 用 `…` 省略长作者列表导致看不到末位作者的情况，提供 **补全** 功能，逐篇异步请求详情页获取完整作者列表。
- **缩写聚合与中文语序自适应**：智能处理姓名缩写聚合（如 `GE Hinton` 匹配 `Geoffrey Hinton`）以及中文姓名首尾互换问题（如 `Zhang Wei` 对应 `W Zhang`）。

### 2. 可解释的发表场所匹配（CCF 与 CORE）
- **查准率绝对优先**：通过全词 Token 规范化、强缩写括号及前缀判定，不进行任何猜测性模糊匹配。
- **期刊与会议独立索引**：彻底解决同名会议与期刊混淆问题（例如 IEEE Transactions 与年度 Symposium 的区分）。
- **非主会轨道过滤**：自动排除 Findings、Workshop、Demo、Poster 等非正式主录用论文，避免虚标等级。
- **来源透明可查**：鼠标悬停在任意徽章上，均可查看匹配规则、官方刊物会议全称及对应的名录版本。

### 3. 内置顶会学术荣誉与奖项
- **7,830+ 篇官方权威获奖记录**：全面采纳 ACL Anthology、计算机视觉基金会（CVF）、ACM SIG 与 IEEE 官方获奖名单，涵盖 NeurIPS、ICML、ICLR、CVPR、ICCV、ECCV、ACL、EMNLP、NAACL、AAAI、IJCAI、SIGCOMM、S&P、CCS、USENIX Security、SIGMOD、VLDB 等数十个核心领域的最佳论文（Best Paper）、杰出论文（Distinguished/Outstanding）及时间检验奖（Test of Time）。
- **报告形式提取**：精准提取作者在发表信息中自述的 *Oral*、*Spotlight*、*Highlight*，并设有专用反误报规则。

### 4. 交互式汇总面板与学术影响力指标
- **角色 × 等级矩阵**：一键切换查看 CCF 与 CORE 分级统计，点击任一单元格即可只显示对应的论文子集。
- **H-Core 与高引论文交互过滤**：面板中的 **h 指数** 与 **i10 指数** 行为可点击按钮，点击即可秒级圈定您的核心论文集（$\ge h$ 次引用）或高影响力论文（$\ge 10$ 次引用）。
- **年份分布条形图**：展示多达 50 年的论文发表趋势，支持通过年份滑块或条形图点击即时过滤。
- **礼貌且优雅的列表自动加载**：自动替您点击 Scholar 的“显示更多”直至加载完毕，频率克制，遭遇网络卡顿时优雅容错降级。

---

## 即时搜索与高级查询运算符

在 Scholar 学者主页上随时按下键盘的 `/` 键或点击 `/` 徽章即可聚焦搜索栏。当您输入操作符前缀（如 `role:`、`ccf:`、`core:`、`>`、`has:`）或按下键盘方向键 <kbd>↓</kbd> 时，搜索框将自动弹出色彩分明的交互式操作符建议补全菜单。支持方向键选择，按 <kbd>Enter</kbd> 或 <kbd>Tab</kbd> 快速自动补全。

| 运算符类别 | 语法示例 | 说明 |
|---|---|---|
| **引用阈值** | `>100`、`>=50`、`<10` | 筛选满足引用数条件的论文 |
| **发表年份** | `>2020`、`<=2015`、`year:>=2021` | 按发表年份区间过滤 |
| **场所等级** | `ccf:a`、`ccf:b`、`core:a*`、`core:a` | 筛选特定 CCF 或 CORE 评级的论文 |
| **作者角色** | `role:first`、`role:last`、`role:second`、`r:cofirst` | 筛选学者处于特定位次的论文 |
| **荣誉荣誉** | `has:award`、`is:award`、`has:talk` | 筛选获得顶会奖项或口头报告的论文 |
| **复合检索** | `ccf:a role:first >100 >2020 CVPR` | 跨所有字段的高级组合检索 |
| **重置筛选** | 按 <kbd>Escape</kbd> 键或点击 *清空* | 随时清空当前所有搜索词与过滤状态 |

---

## 多格式一键导出

无论是在完整列表还是当前筛选视图下，均可一键完成多格式导出：

- **复制 BibTeX**：生成标准的 BibTeX 条目，自动生成 `AuthorYear` 引用键，严格转义 LaTeX 特殊字符（`&`、`%`、`_` 等），并附带 Scholar 原生论文直链。
- **复制 APA**：自动生成符合 APA 第 7 版规范的标准学术参考文献列表（`Authors (Year). Title. *Venue*. URL`），适用于个人简历（CV）、基金申报、职称评审及论文引用。
- **复制 JSON**：导出富结构化学术对象数组，包含论文标题、完整作者、发表场所、年份、引用数、作者角色、CCF/CORE 等级与获奖信息。
- **复制 Markdown**：生成符合 GitHub 规范的精美 Markdown 发表清单，标题自动带链接，等级加粗高亮。
- **导出 CSV**：一键下载符合 RFC-4180 标准并带有 UTF-8 BOM 编码的 CSV 文件，在 Excel / Numbers 中打开完全杜绝中文乱码。
- **复制摘要 / 表格**：以纯文本格式或制表符分隔（TSV）格式复制角色 × 等级矩阵，方便直接贴入个人简历或项目申请书。

---

## AI 与网页智能体 DOM 事件桥梁

Better Scholar 为外部网页智能体、自动化无头脚本与浏览器控制台提供了原生的页面级 CustomEvent 事件总线：

```javascript
// 1. 检查扩展就绪状态并获取学者概要
document.addEventListener("better-scholar:pong", (e) => console.log("学者主页信息:", e.detail));
document.dispatchEvent(new CustomEvent("better-scholar:ping", { detail: { requestId: "req-1" } }));

// 2. 获取当前结构化论文数据对象
document.addEventListener("better-scholar:response-papers", (e) => console.log("论文列表:", e.detail.papers));
document.dispatchEvent(new CustomEvent("better-scholar:request-papers", { detail: { requestId: "req-2" } }));

// 3. 直接导出格式化的 BibTeX 或 JSON 字符串
document.addEventListener("better-scholar:response-export", (e) => console.log("导出文本:", e.detail.text));
document.dispatchEvent(new CustomEvent("better-scholar:request-export", { detail: { format: "bibtex", requestId: "req-3" } }));

// 4. 程序化执行复合检索过滤
document.dispatchEvent(new CustomEvent("better-scholar:query", { detail: { query: "ccf:a role:first >100", requestId: "req-4" } }));
```

此外，扩展内部与外部扩展间亦支持通过标准 Chrome runtime 消息（如 `{ type: "rr:papers" }`、`{ type: "rr:export", format: "json" }`、`{ type: "rr:filter" }`）进行直接交互通信。

---

## 安装使用

### Chrome 与 Chromium 内核浏览器（Edge, Brave, Arc, Opera 等）

1. 下载或克隆本仓库到本地。
2. 在浏览器地址栏访问 `chrome://extensions`。
3. 打开右上角的 **开发者模式**（Developer mode）开关。
4. 点击左上角的 **加载已解压的扩展程序**（Load unpacked），选择本仓库的 [`src/`](src/) 文件夹。
5. 打开任意 Google Scholar 学者主页（如 `scholar.google.com/citations?user=...`）。

> [!TIP]
> 仓库代码更新（`git pull`）后，只需在 `chrome://extensions` 页面找到 Better Scholar 卡片，点击“刷新”图标，并刷新已打开的 Scholar 标签页即可立即生效。

### 打包分发文件

如需生成供分享或上传的应用商店 zip 包：

```bash
scripts/package-chrome.sh      # 自动生成 dist/better-scholar-chrome-<version>.zip
```

---

## 代码库目录结构

```
better-scholar/
├── src/                    Chrome Manifest V3 扩展源码（开发者模式从此目录加载）
│   ├── manifest.json       权限配置：仅需 storage；匹配 Google Scholar 主页
│   ├── background.js       后台服务脚本：中继打开设置页请求
│   ├── content/            页面交互：Scholar DOM 适配、面板 UI、徽章渲染、详情解析、样式
│   ├── lib/                纯函数核心：姓名推断、场所匹配、指标统计、奖项解析、偏好设置
│   ├── data/               内置 CCF/CORE 名录数据及精选场所别名映射
│   ├── options/            设置页面：实时所见即所得面板预览与偏好配置管理
│   ├── popup/              工具栏弹出浮层：快速展示当前主页的学术矩阵概要
│   └── _locales/           30 种界面语言的多语言国际化翻译字典
├── data/                   权威名录原始数据集（CCF 官方 PDF 解析脚本与 ICORE 导出数据）
├── scripts/                数据提取、自动化测试、图标生成与打包脚本
├── test/                   完备测试体系（416 项单元测试 + 76 项端到端真实交互测试）
│   ├── fixtures/           真实 Google Scholar 学者主页与发表场所测试语料
│   └── e2e/                Chromium 端到端自动化测试与本地仿真服务器
├── docs/                   架构设计文档、应用商店物料与路线规划
└── contrib/safari/         实验性 Safari 原生扩展转换脚本
```

---

## 开发与测试

全部测试均在 Node.js 环境下免依赖原生运行：

```bash
npm test            # 运行全部 416 项单元测试（姓名解析、场所匹配、指标、多语言及完整性）
npm run test:e2e    # 运行全部 76 项 Chromium 端到端真实交互测试
npm run test:update # 当有意改进场所匹配规则时，审查并更新测试快照
npm run data        # 基于 data/*.json 重新生成 src/data/{ccf,core}.js 产物
```

---

## 文档与工程规范

- [**AI 与自动化 Agent 接入指南（`AGENTS.md`）**](AGENTS.md)：页面 DOM 事件总线、扩展通信协议及无头自动化规格。
- [**技术路线图（`ROADMAP.md`）**](ROADMAP.md)：架构基石、近期里程碑与后续演进方向。
- [**贡献指南（`CONTRIBUTING.md`）**](CONTRIBUTING.md)：代码规范、测试准则与代码审查标准。
- [**安全政策（`SECURITY.md`）**](SECURITY.md)：私密安全漏洞提报机制与版本支持策略。
- [**隐私协议（`PRIVACY.md`）**](PRIVACY.md)：纯本地计算与无数据上传隐私承诺。

---

## 数据来源与说明

| 名录 / 数据集 | 版本 | 覆盖范围 | 官方权威来源 |
|---|---|---|---|
| **中国计算机学会（CCF）推荐目录** | 2026 年（第七版） | 386 个学术会议 + 295 本学术期刊 | [ccf.org.cn](https://www.ccf.org.cn/Academic_Evaluation/By_category/)（从官方发布 PDF 中无损抽取） |
| **CORE Conference Ranks** | ICORE 2026 | 800 个评级学术会议 | [portal.core.edu.au](https://portal.core.edu.au/conf-ranks/)（官方权威导出） |
| **顶会学术荣誉与奖项库** | 官方汇编语料 | 7,830+ 篇经过严格核实的获奖论文 | [ACL Anthology](https://aclanthology.org)、CVF 基金会、ACM 各专业委员会、IEEE 专委会官方奖项总表 |

名录与榜单数据版权归各发布机构所有，本扩展收录仅供学术参考，详见 [`NOTICE`](NOTICE)。

---

## 平台策略

Chrome 为项目首要且核心支持的目标平台。所有架构选型、扩展 API 及 UI/UX 体验均面向 Chrome Manifest V3 最佳实践构建，绝不因兼容其他非 Chromium 浏览器而对核心功能做任何妥协或降级。基于 Chromium 的 Edge、Brave 等浏览器均可直接无缝运行同一套扩展。Safari 实验性支持位于 [`contrib/safari/`](contrib/safari/README.md)。

---

## 开源协议

本项目采用 [Apache License 2.0](LICENSE) 开源协议。
收录的学术评级名录与奖项数据版权归属各相关委员会所有（参见 [`NOTICE`](NOTICE)）。
