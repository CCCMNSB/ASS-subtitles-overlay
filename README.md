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

### 功能

- **加载本地字幕文件**（ASS / SSA / SRT）直接叠加到页面视频上，无需上传。
- **多说话人同时显示** —— 当前时间段内所有活跃的字幕事件一并渲染。
- **保留 ASS 颜色** —— 文字用 ASS 的 `PrimaryColour`，描边用 `OutlineColour`，按说话人区分。
- **保留 ASS 位置** —— 支持 `\pos` 以及各样式的对齐方式 / 垂直边距。
- **保留 ASS 不透明背景** —— 支持使用黑色不透明背景。
- **可拖动面板** —— 按住面板空白处可拖到任意位置，按钮仍可正常点击。


### 安装

1. 安装脚本管理器 —— [Tampermonkey](https://www.tampermonkey.net/)（Chrome / Edge / Firefox）或 [Violentmonkey](https://violentmonkey.github.io/)。
2. 通过下方 **raw** 链接在工具-> 从网址汇入安装本脚本（或新建脚本后粘贴 [`ass-subtitle-overlay.user.js`](./ass-subtitle-overlay.user.js) 的内容或下载至本地进行加载）。

   ```
   https://raw.githubusercontent.com/CCCMNSB/ASS-subtitles-overlay/main/ass-subtitle-overlay.user.js
   ```

3. 装好后即可**自动更新**：脚本内置 `@updateURL`/`@downloadURL`，Tampermonkey 每天自动检查并更新，**以后无需手动复制粘贴**。
   <img width="914" height="676" alt="image" src="https://github.com/user-attachments/assets/d33aab8c-7113-4f04-b974-736560f14405" />


### 使用
<img width="291" height="366" alt="image" src="https://github.com/user-attachments/assets/85f784ca-5907-434d-a60f-7074ac02caec" />


1. 在含 `<video>` 的页面，字幕面板出现在**右下角**。
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

### Usage

1. On a page with a `<video>`, the subtitle panel appears at the **bottom-right corner**.
2. Choose the panel language (**中文 / English**).
3. Click **Load Local Subtitle** and pick your `.ass` / `.ssa` / `.srt` file.
4. Subtitles are drawn directly on the video, following playback.
5. Use **Show / Hide** to toggle, **Re-bind Video** to re-attach to the video, and **×** to hide the panel (or press **Alt+A** to show/hide it).

### Online Subtitles

- Click **Online Subtitles** in the panel to open your GitHub subtitle library (default `raw.githubusercontent.com/CCCMNSB/subtitles/main`).
- Supports **search** (title/ID), **newest-first by date**, **pagination** (Prev / Next), and **refresh**.
- **Click a row** to **switch** that subtitle onto the current video.
- **Click ▶** to **open the video and auto-jump to that subtitle's start time** (via a `t=seconds` link — reliable).
- On a video page it **auto-matches the video ID** to the library and loads the subtitle (silently skips if no match).
- The library URL is configurable in **Settings** (can switch to the **jsDelivr CDN**).
- The index uses **ETag caching** plus a **30s refresh throttle**.

### Shortcut

| Key | Action |
| --- | --- |
| `Alt + A` | Show / hide the subtitle panel |

### Notes

- The overlay avoids the player's floating controls, so the progress bar stays fully clickable.
- Bottom-anchored subtitles are clamped to stay inside the video area.
- A userscript manager is required (allow the script to run when a site asks for permission).

---

## License / 许可

[MIT](./LICENSE) © CCCMNSB
