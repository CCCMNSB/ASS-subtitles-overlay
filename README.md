# ASS Subtitles Overlay

> 在网页 `<video>` 上叠加本地 `.ass` / `.ssa` / `.srt` 字幕，多说话人同时显示，并保留 ASS 原始颜色与位置。

[简体中文](#中文) · [English](#english)

---

## 中文

> [!IMPORTANT]
> **如果字幕没有出现（Chrome / Edge）：** 请先检查脚本管理器的「允许使用者指令码」是否已打开。
>
> 打开方式：地址栏输入 `chrome://extensions` → 找到你的脚本管理器（Tampermonkey / Violentmonkey）→ 打开 **「允许使用者指令码」**。
>
> - 只需打开 **一次**，它下面的 **所有** 脚本就都能运行，不用逐个设。
> - 打开后**刷新视频页面**即可。


### 安装

1. 安装脚本管理器 —— [Tampermonkey](https://www.tampermonkey.net/)（Chrome / Edge / Firefox）或 [Violentmonkey](https://violentmonkey.github.io/)，可通过chrome插件商店等方式自行安装。
2. 点击篡改猴->新增脚本->工具->从网址汇入 通过下方 **raw** 链接安装本脚本（或新建脚本后粘贴 [`ass-subtitle-overlay.user.js`](./ass-subtitle-overlay.user.js) 的内容或下载至本地进行加载）。

   ```
   https://raw.githubusercontent.com/CCCMNSB/ASS-subtitles-overlay/main/ass-subtitle-overlay.user.js
   ```
<img width="914" height="676" alt="image" src="https://github.com/user-attachments/assets/d33aab8c-7113-4f04-b974-736560f14405" />

3. 装好后刷新页面即可出现，可通过Alt+A快捷键快速呼出或隐藏。可随时通过篡改猴激活或者关闭该插件。
   
<img width="409" height="328" alt="image" src="https://github.com/user-attachments/assets/006d7d87-a6d8-4469-a416-a0bce1c5fbbd" />

4.地址栏输入 `chrome://extensions` → 找到你的脚本管理器（Tampermonkey / Violentmonkey）→ 在详情页打开 **「允许使用者指令码」**。


### 功能

- **加载本地字幕文件**（ASS / SSA / SRT）直接叠加到页面视频上，无需上传。
- **多说话人同时显示** —— 当前时间段内所有活跃的字幕事件一并渲染。
- **保留 ASS 颜色** —— 文字用 ASS 的 `PrimaryColour`，描边用 `OutlineColour`，按说话人区分。
- **保留 ASS 位置** —— 支持 `\pos` 以及各样式的对齐方式 / 垂直边距。
- **保留 ASS 不透明背景** —— 支持使用黑色不透明背景。
- **可拖动面板** —— 按住面板空白处可拖到任意位置，按钮仍可正常点击。


### 使用
<img width="291" height="366" alt="image" src="https://github.com/user-attachments/assets/85f784ca-5907-434d-a60f-7074ac02caec" />


1. 在含 `<video>` 的页面，字幕面板会出现在**右下角**，可通过alt+A键呼出。
2. 选择面板语言（**中文 / English**）。
3. 点击 **加载本地字幕** 选择 `.ass` / `.ssa` / `.srt` 文件。
4. 字幕直接叠加在视频上，随播放显示。
5. 用 **显示 / 隐藏** 开关，**重新绑定视频** 重新关联视频，**×** 隐藏面板（或按 **Alt+A** 显示/隐藏）。
6. 跳过开头功能指在线字幕跳转时，会自动跳转至第一条字幕附近。

### 在线字幕

- 面板点「**在线字幕**」→ 打开你 GitHub 字幕库的列表（默认 `raw.githubusercontent.com/CCCMNSB/subtitles/main`）。
- 支持 **搜索**（标题/ID）、**日期倒序**、**分页**（上一页/下一页）、**刷新**。
- **点整行** = 把这条字幕**切换**到当前视频上显示。
- **点 ▶** = **打开该视频并自动跳到该字幕开始时间**（用 `t=秒数` 链接，稳）。
- 打开视频页时会**按视频 ID 自动匹配**字幕库并加载（匹配不到就静静跳过）。
- 字幕库地址可在「设置」里改（也可换 **jsDelivr CDN**）。


### 快捷键

| 按键 | 作用 |
| --- | --- |
| `Alt + A` | 显示 / 隐藏字幕面板 |

### 说明

- 字幕叠加层避让播放器控件，进度条仍可正常点击。
- 底部对齐的字幕会限制在视频区域内，避免超出边界。
- 需要脚本管理器（网站要求权限时请允许该脚本运行）。

### 限制 / 暂不支持

- **复杂 ASS 特效**：暂不支持 `\k`（卡拉OK）、`\move`、`\fad`、`\t()`、`\fr`（旋转）、`\clip` 等。这类字幕的**文字/颜色/位置仍基本正确**，但动画/填充/裁剪等效果会与 Aegisub 有出入。
- **在线字幕 / 自动匹配**：主要面向 **YouTube（11 位 ID）** 和 **B站（BV 号）**。其它平台不自动匹配，需手动加载本地文件，或把「字幕库」指向你自己的（同结构）仓库。
- **视频环境**：视频须为页面内的**真实 `<video>` 元素**；内嵌 iframe、DRM 受保护、或非 `<video>` 的自定义播放器可能**用不了**。
- **字体**：检测的是常见字体；未检测到的可**输入字体名**手动使用。

### 会员视频字幕（加密 `.enc`，防公开分发）

给 YouTube **会员专属视频**做字幕后，若不想把字幕公开（版权考虑），可**加密储存**，只有**能播放该会员视频的人**才能解密显示。

**「钥匙」是什么**：**不是单独的一个文件**。它 = **该视频自动字幕文本的 SHA-256**（从视频自动字幕算出来）。做字幕时你拿一次"该视频自动字幕文本"作钥匙加密；观众播放时插件自动拿"同一视频自动字幕文本"算出同一把钥匙解密。**一个视频一把钥匙**。

**只有会员能解**：只有会员浏览器能拿到该视频自动字幕 → 才能算出钥匙 → 才能解。非会员/非浏览器拿不到自动字幕 → 解不开。这是**访问控制 + 编码**，不是 DRM（拿到钥匙的人仍可能复制文本）。

**下载**
- **观众**（只装主脚本）：`ass-subtitle-overlay.user.js`
  👉 https://raw.githubusercontent.com/CCCMNSB/ASS-subtitles-overlay/main/ass-subtitle-overlay.user.js
- **作者工具**（抓钥匙 + 加密，给字幕作者，不发布给观众）：打包在 GitHub Release
  👉 https://github.com/CCCMNSB/ASS-subtitles-overlay/releases/download/v1.40-tools/member-subtitle-tools.zip
  内含：`capture-subtitle-key.user.js`（抓钥匙）、`encrypt-member-gui.py`（图形界面加密）、`encrypt-member.js`（命令行）、`加密字幕-双击打开.bat`（双击启动图形界面）。

**加密（作者，本地一次性）**
1. 装 `capture-subtitle-key.user.js` → 打开会员视频页 → 点面板**「下载钥匙」**→ 得到 `caption_body_<视频ID>.json`（该视频自动字幕文本，即钥匙）。
2. 双击 `加密字幕-双击打开.bat`（或 `python encrypt-member-gui.py`）：选 `caption_body_*.json` + 你的 `.ass` → 输出 `<视频ID>.ass.enc`（AES-256-GCM，`nonce(12)+ciphertext+tag(16)`）。
3. 把 `<视频ID>.ass.enc` 上传到字幕仓库 `subtitles/`。可加进 `index.json`（公开列表）或**不加**（隐藏）。

**解密（观众/播放，全自动，不碰 CC）**
- 插件碰到会员视频：自动抓该视频自动字幕（**自动点一下 CC 触发抓取、抓到立即关回**，用户几乎无感）→ 算同把密钥 → AES-GCM 解密 `.ass.enc` → 渲染。
- 自动识别 `.ass.enc` / `.srt.enc` / `.enc`；切到另一个会员视频会自动换对应钥匙。
- 非会员/非浏览器拿不到自动字幕 → 解不开；单独泄露 `.enc` 无效。

**注意**：抓自动字幕需**会员登录态**；本方案会**短暂自动开关一次 CC**（抓到即关）。

[English](#english) · [简体中文](#中文)

---

## English

> [!IMPORTANT]
> **If subtitles don't appear (Chrome / Edge):** First check that the "Allow user scripts" toggle is enabled for your userscript manager.
>
> How: open `chrome://extensions` → find your manager (Tampermonkey / Violentmonkey) → enable **"Allow user scripts"**.
>
> - It only needs to be enabled **once**; it applies to **all** scripts in the manager.
> - This toggle is required only on **Chrome / Edge**; **Firefox doesn't need it**.
> - After enabling, **refresh the video page**.

### Features

- **Load local subtitle files** (ASS / SSA / SRT) directly onto the page video — no upload needed.
- **Multiple speakers rendered simultaneously** — every active event in the current time range is drawn at once.
- **Keeps ASS colors** — text uses the ASS `PrimaryColour`, the border uses `OutlineColour`, per speaker.
- **Keeps ASS positions** — respects `\pos` and each style's alignment / vertical margins.
- **Keeps ASS opaque background** — supports a black opaque background box.
- **Draggable panel** — drag it anywhere; all buttons still work.

### Installation

1. Install a userscript manager — [Tampermonkey](https://www.tampermonkey.net/) (Chrome / Edge / Firefox) or [Violentmonkey](https://violentmonkey.github.io/).
2. Install the script from the **raw** link below (via the manager's **Install from URL** — `Tools → Install from URL` — or create a new script and paste the contents of [`ass-subtitle-overlay.user.js`](./ass-subtitle-overlay.user.js), or download it to load locally).

   ```
   https://raw.githubusercontent.com/CCCMNSB/ASS-subtitles-overlay/main/ass-subtitle-overlay.user.js
   ```

3. **Auto-update** is built in (`@updateURL`/`@downloadURL`): Tampermonkey checks for updates daily and applies them automatically — **no manual copy-paste needed**.
   <img width="914" height="676" alt="image" src="https://github.com/user-attachments/assets/d33aab8c-7113-4f04-b974-736560f14405" />

### Usage
<img width="291" height="366" alt="image" src="https://github.com/user-attachments/assets/85f784ca-5907-434d-a60f-7074ac02caec" />

1. On a page with a `<video>`, the subtitle panel appears at the **bottom-right corner**.
2. Choose the panel language (**中文 / English**).
3. Click **Load Local Subtitle** and pick your `.ass` / `.ssa` / `.srt` file.
4. Subtitles are drawn directly on the video, following playback.
5. Use **Show / Hide** to toggle, **Re-bind Video** to re-attach to the video, and **×** to hide the panel (or press **Alt+A** to show/hide it).
6. **Skip intro** — when you jump via the online subtitles, it auto-jumps to **near the first subtitle** line.

### Online Subtitles

- Click **Online Subtitles** in the panel to open your GitHub subtitle library (default `raw.githubusercontent.com/CCCMNSB/subtitles/main`).
- Supports **search** (title/ID), **newest-first by date**, **pagination** (Prev / Next), and **refresh**.
- **Click a row** to **switch** that subtitle onto the current video.
- **Click ▶** to **open the video and auto-jump to that subtitle's start time** (via a `t=seconds` link — reliable).
- On a video page it **auto-matches the video ID** to the library and loads the subtitle (silently skips if no match).
- The library URL is configurable in **Settings** (can switch to the **jsDelivr CDN**).
- Click **Refresh** to get the latest list.

### Shortcut

| Key | Action |
| --- | --- |
| `Alt + A` | Show / hide the subtitle panel |

### Notes

- The overlay avoids the player's floating controls, so the progress bar stays fully clickable.
- Bottom-anchored subtitles are clamped to stay inside the video area.
- A userscript manager is required (allow the script to run when a site asks for permission).

### Limitations / Not supported yet

- **Advanced ASS effects**: `\k` (karaoke), `\move`, `\fad`, `\t()`, `\fr` (rotation), `\clip`, etc. are **not supported**. The **text / color / position still render correctly**, but animations, karaoke fills and clipping may differ from Aegisub.
- **Online subtitles / auto-match**: mainly for **YouTube (11-char ID)** and **Bilibili (BV id)**. Other sites won't auto-match; load a local file, or point the **Subtitle Library** to your own (same-structured) repo.
- **Video environment**: the video must be a real `<video>` element in the page. Embedded iframes, DRM-protected content, or custom non-`<video>` players may **not work**.
- **Fonts**: it detects common fonts; for others, **type the font name** to use it.

---

## License / 许可

[MIT](./LICENSE) © CCCMNSB
