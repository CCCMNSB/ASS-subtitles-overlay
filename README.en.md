# ASS Subtitles Overlay

> Load local `.ass` / `.ssa` / `.srt` subtitles on any web `<video>`, rendering multiple speakers at once while keeping the original ASS colors and positions.

[English](README.en.md) · [简体中文](README.md)

---

## Features

- **Load local subtitle files** (ASS / SSA / SRT) directly onto the page video — no upload needed.
- **Multiple speakers rendered simultaneously** — every active event in the current time range is drawn at once.
- **Keeps ASS colors** — text uses the ASS `PrimaryColour`, the border uses `OutlineColour`, per speaker.
- **Keeps ASS positions** — respects `\pos` and each style's alignment / vertical margins.
- **Bilingual panel (中文 / English)** — the panel's own text switches language; this is independent of the subtitle content.
- **Draggable panel** — drag it anywhere; all buttons still work.
- **Fullscreen-safe** — subtitles follow the video into fullscreen and render below the player's controls, so the progress bar stays clickable.

## Installation

1. Install a userscript manager — [Tampermonkey](https://www.tampermonkey.net/) (Chrome / Edge / Firefox) or [Violentmonkey](https://violentmonkey.github.io/).
2. Install the script from the raw link below (or create a new script and paste the contents of [`ass-subtitle-overlay.user.js`](./ass-subtitle-overlay.user.js)).

   ```
   https://raw.githubusercontent.com/CCCMNSB/ASS-subtitles-overlay/main/ass-subtitle-overlay.user.js
   ```

## Usage

1. On a page with a `<video>`, the subtitle panel appears at the **bottom-right corner**.
2. Choose the panel language (**中文 / English**).
3. Click **Load Local Subtitle** and pick your `.ass` / `.ssa` / `.srt` file.
4. Subtitles are drawn directly on the video, following playback.
5. Use **Show / Hide** to toggle, **Re-bind Video** to re-attach to the video, and **×** to hide the panel (or press **Alt+A** to show/hide it).

## Shortcut

| Key | Action |
| --- | --- |
| `Alt + A` | Show / hide the subtitle panel |

## Notes

- The overlay avoids the player's floating controls, so the progress bar stays fully clickable.
- Bottom-anchored subtitles are clamped to stay inside the video area.
- A userscript manager is required (allow the script to run when a site asks for permission).

---

## License

[MIT](./LICENSE) © CCCMNSB
