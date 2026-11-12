# Chrome Web Store 填写手册：Better Scholar 2.41.0

**用法：** 控制台左侧有 5 个页签：Package → Store listing → Privacy → Distribution → Test instructions。
下面按这个顺序，**每个小标题就是页面上的字段名**，标题下面的代码块是要粘贴的内容（原样复制，不要改）。
没有代码块的字段，按文字说明操作。每页填完点页面上的 **Save draft**。

事实依据在 `claims.md`（`node store/chrome/check-claims.mjs` 会逐条核对）。代码改动后先看那里。
安装包用 `bash scripts/package-chrome.sh` 构建，数据（如获奖名单）变了就要重新构建。

---

## 页签 1：Package

- 点 **Add new item**，上传 `dist/better-scholar-chrome-2.41.0.zip`。
- 标题（Better Scholar）、摘要、版本都来自安装包，页面上是只读的，不用填。
- 摘要（只读，供核对，130 字符，上限 132）：

```text
On Google Scholar profiles: the profile owner's author role and the venue's CCF and CORE rank on each paper, counted in one table.
```

---

## 页签 2：Store listing

### Description（必填，3210 字符，纯文本，原样粘贴）

```text
Better Scholar adds two things to Google Scholar profile pages: the profile owner's authorship role in each paper, and the rank of the venue it appeared in. A panel counts them in one table.

• Roles: rows where the owner is first, co-first, second or last author are tinted in that role's colour, and the owner's name is marked.
• Ranks: venues on the China Computer Federation list (7th edition, 2026) or the ICORE 2026 conference ranking get a rank chip whose tooltip says how it was matched. Venues it cannot match get no chip, and the panel lists them (preprints and secondary tracks aside); you can tie such a venue to a listed one yourself, and its chip then says it is your own mapping.
• Summary: a role × rank table (click a cell to list those papers), citation totals and h-index of the highlighted papers, and a chart by year.
• Awards and talks: chips for awards on a bundled list (11,278 paper awards, nearly all at major conferences) and for the Oral, Spotlight and Highlight labels authors write in the title or venue.
• Search: press / and type, for example role:first ccf:a cites:>100; up to three searches of your own can be buttons under the box.
• Copy and export: the summary or the papers shown, as plain text, a table, APA, BibTeX, Markdown, JSON or CSV, and, when switched on, IEEE, ACM, GB/T 7714 or the table as a picture; the table and the papers also paste into Word or Docs as a real table, APA, IEEE and ACM with real italics, and the papers, APA, IEEE, ACM and GB/T 7714 with the profile owner's name in bold. The toolbar button and page events for scripts or AI agents give the same data.
• Settings: a switch for each role and for every part of the panel and every thing in it, in any order, with your own names for titles and buttons; the look and colours of the chips; a live preview that you edit by hovering it (hide, move, rename); a box that checks a venue against the lists; merging duplicate entries, hiding parts of the profile page, 30 languages, and reopening search and profile pages in a chosen language.

The ranks come from today's CCF and CORE lists, not the rank a venue had when the paper was published. CCF states that its list is not a basis for academic evaluation.

• By default it presses the page's own "Show more" button about once a second, only while the tab is in front, until the whole list is loaded. It stops if no more rows arrive; a setting turns it off.
• When a long author list is cut off, "Read full lists" reads each paper's own page on the same site, only when you click it, about once a second, and stops at the first CAPTCHA.
• An option, off by default, asks Semantic Scholar's public API for those lists first. Each request's only content is the paper's title (and your API key, if you add one); no cookies are sent.

Everything else runs in your browser: no account, no analytics, no ads. Settings, and the name spellings and venue mappings you add, are kept in Chrome's storage; author lists it has read stay on this device for 90 days. Its one permission is storage, and it runs only on Scholar's pages.

Free and open source (Apache 2.0). Better Scholar is an independent project and is not affiliated with or endorsed by Google.
```

### Category

选 **Education**（下拉里没有就选 Tools）。

### Language

选 **English**。

### Store icon

上传 `store/chrome/images/icon-128.png`（128×128）。

### Global promo video

**留空。** 框下面灰色的 YouTube 链接只是示例，不用填。

### Localized screenshots（必填，至少 1 张，最多 5 张，1280×800，不要透明通道）

按顺序上传 `store/chrome/images/screenshot-1.jpg` 到 `screenshot-5.jpg`：

1. 主页面：按角色着色的论文行、CCF/CORE 芯片和右侧面板。
2. 面板特写：角色×等级表、复制与导出按钮、年份图。
3. 过滤：搜索 `role:first ccf:a cites:>100` 后剩下 5 篇。
4. 设置页：开关、颜色和实时预览。
5. 工具栏弹窗。

（说明文字已画在图片里，商店没有单独的说明字段。）

### Small promo tile（必填，440×280）

上传 `store/chrome/images/promo-small.jpg`。

### Marquee promo tile（可选，1400×560）

上传 `store/chrome/images/promo-marquee.jpg`。

### Official URL

**留空。**

### Homepage URL

```text
https://boyugou.github.io/better-scholar/
```

### Support URL

```text
https://github.com/boyugou/better-scholar/issues
```

### Mature content

**不勾。**

---

## 页签 3：Privacy

页面上每个文本框上限 1,000 字符，下面的内容都已在限制内。

### Single purpose description（必填，535 字符）

```text
Better Scholar shows, on Google Scholar profile pages, the profile owner's authorship role in each paper (first, co-first, second or last author) and the CCF and CORE rank of the paper's venue, and counts the papers by role and rank in one table. Everything else serves that view: loading the whole paper list so that the count is complete, reading author lists that Scholar cuts off so that a hidden role can be found, filters, citation totals and copy or export of the same data, and settings for what is shown and in which language.
```

### storage justification（必填，860 字符）

```text
storage keeps the user's settings and the extension's working data; nothing in it is sent to the developer. chrome.storage.sync: the settings (what to show, order, colours, chip looks, the user's own names for titles and buttons, language), extra spellings of a profile owner's name that the user adds, and the user's own venue mappings, so they follow the user's Chrome profile. chrome.storage.local, on this device only: whether the panel is folded and which ranking it shows; the author lists, venue text and page ranges read with "Read full lists" (at most 3,000 papers, kept 90 days, viewable and clearable on the settings page); an optional Semantic Scholar API key the user may enter; a venue text (at most 300 characters) that the user asked the settings page to check; and a flag that lets the popup say an open profile needs a reload after an update.
```

### Host permission justification（必填，964 字符）

页面上方的橙色提示（“可能需要深入审核”）是正常的，不用处理。

```text
Site access comes only from two content scripts, both limited to Google Scholar. (1) The main script matches https://scholar.google.<domain>/citations*, the path of Scholar's author pages, and draws only on a profile page (it checks for the profile's name and paper table and leaves other pages alone). (2) A small script, content/lang-redirect.js (with lib/i18n.js, the list of languages it checks), matches https://scholar.google.<domain>/* at document start. It acts only on /scholar and /citations, and only if the user chose a language under "Open Scholar in" (off by default): it reopens the page with that hl= value. It reads no page content. Both list the same 187 domains because Scholar is served under Google's country domains (scholar.google.co.uk, scholar.google.com.sg and so on) and a match pattern cannot wildcard a top-level domain. The list is generated from Google's own list (https://www.google.com/supported_domains). No other site is matched.
```

### Are you using remote code?（如果页面有这一项）

选 **No, I am not using remote code.** 如果它要求填写理由，粘贴：

```text
All code is in the package. The content scripts, toolbar popup, settings page and service worker load only files from the zip; there is no eval, new Function, dynamic import or remotely hosted script. The extension fetches data, never code: Scholar's own paper pages (parsed with DOMParser; only text is read), JSON from api.semanticscholar.org when the user switches that on, its own _locales files, and (for the popup's Copy as image) the picture the page drew, from a data: address. The rank and award lists are bundled; the settings page also loads the CCF and CORE lists from the zip, for its "Check a venue" box, and makes no request. The page-event listener for scripts on the page answers six fixed calls (ping, summary, papers, export, filter, clearFilters), checks their parameters, and runs nothing it receives.
```

### Data usage — What user data do you plan to collect…

只勾 3 项，其余 6 项**不勾**：

| 勾选 | 项目 | 原因 |
|---|---|---|
| ✅ | Personally identifiable information | 会读取并保存用户自己添加的姓名写法（保守读法；也可以不勾，见下） |
| ✅ | Authentication information | 用户可选填的 Semantic Scholar API 密钥，只存本机，只发给 api.semanticscholar.org |
| ✅ | Website content | 读取 Scholar 页面上的标题、作者、期刊、年份、引用数；仅在用户开启后把论文标题发给 Semantic Scholar |
| 不勾 | Health information、Financial and payment information、Personal communications、Location、Web history、User activity | 代码里没有读取或保存这些 |

关于 Personally identifiable information：勾上是对 Google 用户数据 FAQ 的保守读法（姓名被处理和保存）。
不勾的理由是姓名只是公开页面上印出的内容，属于 Website content。勾了会在商店页上显示这一项，隐私政策里写明它不会离开浏览器。你来决定。

### I certify that the following disclosures are true — 三条**全部勾选**

- ✅ I do not sell or transfer user data to third parties, outside of the approved use cases
- ✅ I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- ✅ I do not use or transfer user data to determine creditworthiness or for lending purposes

（唯一的一次传输是：用户自己打开 Semantic Scholar 选项后，把论文标题发给它。该选项默认关闭，属于提供用户要的功能。）

### Privacy policy URL（必填）

```text
https://boyugou.github.io/better-scholar/privacy/
```

---

## 页签 4：Distribution

| 页面字段 | 选什么 |
|---|---|
| Payments | Free |
| Visibility | Public |
| Regions | All regions（欧盟上架需要先在账号页完成“交易者声明”） |

---

## 页签 5：Test instructions（可选，建议填）

Scholar 有时会对自动化流量出验证码，这段说明能帮审核员复现。粘贴：

```text
No account, login or payment is needed. Everything works on a public Google Scholar profile.

1. Open https://scholar.google.com/citations?user=JicYPdAAAAAJ&hl=en
2. A "Better Scholar" panel appears at the top of the right-hand column (above the paper list in a narrow window). Rows where the profile owner is first, second or last author are tinted blue, amber or green; venues on the CCF or CORE list get chips. Scholar's order may change, but for example:
   - "Imagenet classification with deep convolutional neural networks": last author (green), a CCF A chip (NeurIPS; its tooltip also gives CORE A*) and a "Test of time" award chip.
   - "Dropout: a simple way to prevent neural networks from overfitting": second author (amber), CCF A (JMLR).
   - "Visualizing data using t-SNE": last author, CCF A (JMLR).
   - "Deep learning" (Nature): last author and no rank chip. Nature is on neither list; that is by design.
3. While the panel shows "Loading… N", the extension is pressing Scholar's own "Show more" button about once a second, only while the tab is in front. "Cancel" stops it; Settings > Paper list > "Load all papers automatically" turns it off.
4. Click a cell of the "Papers by role and rank" table to list those papers. Press / and type role:first ccf:a cites:>100 to filter (type:journal, type:conference and age:<5, the last five years, also work); the table and the awards counts then count the papers the filters leave. "Copy summary" copies the table as text (and says what it counted). "Copy as table", "Copy papers" and "Copy APA" put the text and an HTML version of the same data on the clipboard (a word processor pastes a real table); "Export CSV" saves a file. The extension writes to the clipboard only when you click, and never reads it.
5. Click the toolbar button: the popup shows the same table and copy buttons for the open profile.
6. Click the settings button of the panel or of the popup (or Details > Extension options on chrome://extensions). The settings page opens in a tab and makes no network request. Its preview on the right is the real panel over sample rows: hover a part of it to hide it (✕), move it (⠿) or rename it (✎); the tray "Hidden: N" shows what was hidden and puts it back. Every switch for what the panel and the rows show changes the preview at once.
7. On the settings page, the card "Check a venue" (after "Semantic Scholar"): paste a venue as Scholar prints it. "Proceedings of the IEEE conference on computer vision and pattern recognition" gives CCF A and CORE A* ("Matched by name"). "Findings of the Association for Computational Linguistics: ACL 2023" gets no rank: it is a secondary track, and the extension never guesses.
8. Network features, both started only by the user: "Read full lists" (offered when Scholar cut off author lists) reads each paper's Scholar page in the background (no tab opens), about once a second. The Semantic Scholar lookup is off by default (Settings > Semantic Scholar).

Note: Google Scholar sometimes answers automated or data-center traffic with a CAPTCHA, or with "The system can't perform the operation now. Try again later." Both come from Scholar. The extension adds no CAPTCHA and does not try to get around one: it stops loading the list as soon as Scholar sends no more rows, and stops reading paper pages at the first CAPTCHA. When loading stops early, the panel says "Scholar sent no more papers (N loaded). Try “Load all” again in a moment." The table and the chips still cover the papers that did load; the example rows above are among the first 20 (Scholar lists the most cited first), so they show even then. Solving the CAPTCHA in the tab, or waiting and reloading, lets the rest load.
```

---

## 其他页面和常见问题（按 Google 开发者文档整理，2026-11-11 读取；以你看到的实际页面为准）

### 左侧 Account（账号）页：提交前要先完成

- **Publisher name / Contact email：** 填发布者名称和联系邮箱，审核通知都发到这个邮箱。邮箱可在控制台里直接改。
- **Trader status（EU 交易者声明）：** 所有开发者都必须声明自己是 Trader 还是 Non-Trader。这是你自己的法律判断，Google 不替你判。
  - 本扩展免费、无广告、不收费，没有任何商业行为。个人开发者常见选法是 **Non-Trader**。
  - 选 Trader 要填法定姓名、电话（短信验证）、地址，并且电话会显示在商店页上，还需要 Google Payments 资料。
  - 如果不声明，欧盟地区的上架会受影响（Regions 页提示过）。
  - 声明后想改，要重新走验证流程。
- **注册费：** 首次一次性 5 美元。

### Distribution 页（官方文档确认的选项）

- **Visibility：** Public（所有人可搜到）、Unlisted（只有链接可装）、Private（只有测试者或群组可装）。三种的审核标准一样。
  - 想先试水可以选 **Unlisted**：能用链接给同事装，审核通过后随时改成 Public。
- **Regions：** All regions，或只选部分国家；改完发布后立即生效。
- 文档里没有价格 / 付款字段，免费不用设置。

### 审核（官方说明）

- 一般几天，新开发者或敏感权限可能更久；超过三周没消息，联系开发者支持。
- 页面里的橙色提示“Due to the Host Permission…”是因为我们声明了 187 个 Scholar 域名的访问，会触发更深入的审核，**会拖慢发布，但不是错误**。
  - 我们的权限理由（Host permission justification）已经写明：只在 Scholar 的 /citations 页面运行，域名清单来自 Google 官方的 supported_domains。
- 通知只发邮件，没有状态页。
- 被拒：邮件会写明违反的政策。可以在 Item 详情页点 **Appeal** 申诉，或改正后重新提交；被拒不会通知用户，已有的版本不变。
- 不允许混淆代码；压缩过的可以。本扩展的源码没有混淆，也没有构建步骤。

### 其他

- **Store listing 的本地化（可选）：** 页面左上有语言下拉，对应安装包里的 30 种语言（`_locales`）。商店会自动显示各语言自己的标题和摘要，详细描述需要逐个语言另填，**可以先不做**。
- **Official URL（可选）：** 只列出在 Google Search Console 里验证过的网站。不验证的话，页面上显示的是你的发布者名称，不影响上架。
- **试用版：** 如果以后想并行发布测试版，名称末尾要加 “BETA”，描述里说明，否则两个版本可能因重复内容被下架。

## 提交前

- 每个页签的红色提示都消失。
- 点 **Submit for review**（由你来点）。审核通常几天；被拒会给出意见，发给我来改。
