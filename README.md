# ASS Subtitles Overlay

> 在网页 `<video>` 上叠加本地 `.ass` / `.ssa` / `.srt` 字幕，多说话人同时显示，并保留 ASS 原始颜色与位置。

[English](README.en.md) · [简体中文](README.md)

---

## 功能

- **加载本地字幕文件**（ASS / SSA / SRT）直接叠加到页面视频上，无需上传。
- **多说话人同时显示** —— 当前时间段内所有活跃的字幕事件一并渲染。
- **保留 ASS 颜色** —— 文字用 ASS 的 `PrimaryColour`，描边用 `OutlineColour`，按说话人区分。
- **保留 ASS 位置** —— 支持 `\pos` 以及各样式的对齐方式 / 垂直边距。
- **面板双语（中文 / English）** —— 面板自身文字可切换语言；这与字幕内容无关。
- **可拖动面板** —— 按住面板空白处可拖到任意位置，按钮仍可正常点击。
- **全屏友好** —— 全屏时字幕跟随视频，并渲染在播放器控件之下，进度条不被遮挡。

## 安装

1. 安装脚本管理器 —— [Tampermonkey](https://www.tampermonkey.net/)（Chrome / Edge / Firefox）或 [Violentmonkey](https://violentmonkey.github.io/)。
2. 通过下方 **raw** 链接安装本脚本（或新建脚本后粘贴 [`ass-subtitle-overlay.user.js`](./ass-subtitle-overlay.user.js) 的内容）。

   ```
   https://raw.githubusercontent.com/CCCMNSB/ASS-subtitles-overlay/main/ass-subtitle-overlay.user.js
   ```

## 使用

1. 在含 `<video>` 的页面，字幕面板出现在**右下角**。
2. 选择面板语言（**中文 / English**）。
3. 点击 **加载本地字幕** 选择 `.ass` / `.ssa` / `.srt` 文件。
4. 字幕直接叠加在视频上，随播放显示。
5. 用 **显示 / 隐藏** 开关，**重新绑定视频** 重新关联视频，**×** 隐藏面板（或按 **Alt+A** 显示/隐藏）。

## 快捷键

| 按键 | 作用 |
| --- | --- |
| `Alt + A` | 显示 / 隐藏字幕面板 |

## 说明

- 字幕叠加层避让播放器控件，进度条仍可正常点击。
- 底部对齐的字幕会限制在视频区域内，避免超出边界。
- 需要脚本管理器（网站要求权限时请允许该脚本运行）。

---

## 许可

[MIT](./LICENSE) © CCCMNSB
