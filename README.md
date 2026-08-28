# ASS Subtitles Overlay

> A Tampermonkey userscript that overlays local `.ass` / `.ssa` / `.srt` subtitles on any web `<video>` (Bilibili, YouTube, etc.), rendering multiple speakers at once while keeping the original ASS colors and positions.

一个 Tampermonkey 油猴脚本，在网页 `<video>`（B站、YouTube 等）上叠加本地 `.ass` / `.ssa` / `.srt` 字幕，支持多说话人同时显示，并保留 ASS 原始颜色与位置。

---

## 功能 / Features

- **Load local subtitle files** (ASS / SSA / SRT) directly onto the page video, no upload needed.
  **加载本地字幕**文件（ASS / SSA / SRT）到页面的视频上，无需上传。
- **Multiple speakers rendered simultaneously** — every active event in the current time range is drawn at once.
  **多说话人同时显示** —— 当前时间段内所有活跃的字幕事件一并渲染。
- **Keeps ASS colors** — text uses the ASS `PrimaryColour`, border uses `OutlineColour`, per speaker.
  **保留 ASS 颜色** —— 文字用 ASS 的 `PrimaryColour`，描边用 `OutlineColour`，按说话人区分。
- **Keeps ASS positions** — respect `\pos` and style alignment / vertical margins.
  **保留 ASS 位置** —— 支持 `\pos` 以及样式的对齐方式 / 垂直边距。
- **UI language switch (中文 / English)** — the panel text itself is bilingual, independent of the subtitle content.
  **界面语言切换（中文 / English）** —— 面板文字本身支持中英切换，与字幕内容无关。
- **Draggable panel** — drag the panel anywhere; all buttons still work.
  **可拖动面板** —— 按住面板空白处可拖到任意位置，按钮仍可正常点击。
- **Fullscreen-safe** — subtitles follow the video into fullscreen; they render below the player's own controls, so the progress bar stays clickable.
  **全屏友好** —— 全屏时字幕跟随视频，且渲染在播放器控件之下，进度条不被遮挡。

---

## 安装 / Installation

1. Install a userscript manager — [Tampermonkey](https://www.tampermonkey.net/) (Chrome / Edge / Firefox) or [Violentmonkey](https://violentmonkey.github.io/).
2. Install this script from the **raw** link below (or create a new script and paste the contents of [`ass-subtitle-overlay.user.js`](./ass-subtitle-overlay.user.js)).

   **Raw install link:**
   ```
   https://raw.githubusercontent.com/CCCMNSB/ASS-subtitles-overlay/main/ass-subtitle-overlay.user.js
   ```

1. 安装脚本管理器 —— [Tampermonkey](https://www.tampermonkey.net/)（Chrome / Edge / Firefox）或 [Violentmonkey](https://violentmonkey.github.io/)。
2. 通过下方 **raw** 链接安装本脚本（或新建脚本后粘贴 [`ass-subtitle-overlay.user.js`](./ass-subtitle-overlay.user.js) 的内容）。

---

## 使用 / Usage

1. On a page with a `<video>`, the subtitle panel appears at the bottom-right corner.
2. Choose the interface language (**中文 / English**).
3. Click **加载本地字幕 / Load Local Subtitle** and pick your `.ass` / `.ssa` / `.srt` file.
4. Subtitles are drawn directly on the video, following playback.
5. Use **显示 / 隐藏** to toggle, **重新绑定视频** to re-attach to the video, and **×** to hide the panel (or press **Alt+A** to show/hide it).

1. 在含 `<video>` 的页面，右下角会出现字幕面板。
2. 选择界面语言（**中文 / English**）。
3. 点击 **加载本地字幕 / Load Local Subtitle** 选择 `.ass` / `.ssa` / `.srt` 文件。
4. 字幕直接叠加在视频上，随播放显示。
5. 用 **显示 / 隐藏** 开关，**重新绑定视频** 重新关联视频，**×** 隐藏面板（或按 **Alt+A** 显示/隐藏）。

---

## 快捷键 / Shortcut

| Key | Action |
| --- | --- |
| `Alt + A` | Show / hide the subtitle panel（显示 / 隐藏字幕面板） |

---

## 说明 / Notes

- The overlay avoids the video player's floating controls, so the progress bar remains fully clickable.
  字幕叠加层不遮住播放器控件，进度条仍可正常点击。
- Bottom-anchored subtitles are clamped to stay inside the video area.
  底部对齐的字幕会限制在视频区域内，避免超出边界。
- Requires a userscript manager (allow the script to run when a site asks for permission).
  需要脚本管理器（网站要求权限时请允许该脚本运行）。

---

## License

[MIT](./LICENSE) © CCCMNSB
