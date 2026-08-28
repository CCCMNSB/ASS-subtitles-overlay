// ==UserScript==
// @name         ASS Subtitle Overlay（多说话人）
// @namespace    CCCMNSB
// @version      1.6
// @description  在网页 <video> 上加载本地 .ass/.srt，多字幕同时显示 + 按 ASS 原色 + 按 ASS 位置渲染。界面语言中/英可切。
// @author       CCCMNSB
// @match        *://*/*
// @run-at       document-idle
// @grant        none
// @noframes
// ==/UserScript==

(function () {
    'use strict';

    let events = [];
    let overlay = null;
    let panel = null;
    let video = null;
    let active = false;
    let rafId = 0;
    let lastTime = -1;
    let currentSource = '';
    let uiLang = 'zh';               // 'zh' | 'en'（界面语言）
    let statusEl = null;
    const uiRefs = {};               // 界面上需要随语言切换的文字元素
    const setRefs = {};              // 设置面板控件引用
    let settingsBox = null;
    let settingOpen = false;

    // 用户可调设置
    const settings = {
        fontScale: 100,   // 字号（%），100=按 ASS 原样
        borderPx: 0,      // 边框粗细（px），0=按 ASS 自动
        font: 'auto',     // 'auto'=跟随字幕字体；否则用指定字体名
        offsetPct: 0,     // 上下偏移（% of video height，负数=上移）
        assBg: true       // 是否渲染 ASS 不透明背景（BorderStyle=3）
    };
    // 实时生效：任何设置改动后把 lastTime 置回 -1，下一帧就重绘一次字幕
    function invalidate() { lastTime = -1; }
    function resetDefaults() {
        settings.fontScale = 100; settings.borderPx = 0; settings.font = 'auto'; settings.offsetPct = 0; settings.assBg = true;
        if (setRefs.sizeInput) setRefs.sizeInput.value = '100';
        if (setRefs.sizeVal) setRefs.sizeVal.textContent = '100%';
        if (setRefs.bdInput) setRefs.bdInput.value = '0';
        if (setRefs.bdVal) setRefs.bdVal.textContent = '0px';
        if (setRefs.fontSel) setRefs.fontSel.value = 'auto';
        if (setRefs.offInput) setRefs.offInput.value = '0';
        if (setRefs.offVal) setRefs.offVal.textContent = '0%';
        if (setRefs.bgCheck) setRefs.bgCheck.checked = true;
        invalidate();
    }

    const I18N = {
        zh: { title: '字幕叠加', lang: '语言', cn: '中文', load: '加载本地字幕', toggle: '显示 / 隐藏', rebind: '重新绑定视频', ready: '点击“加载本地字幕”选择 ASS/SRT 文件', settingsBtn: '设置', fontsize: '字号', border: '边框', font: '字体', offset: '上下偏移', assbg: 'ASS 背景', auto: '默认（跟随字幕）', fontCustom: '或自定义字体名…', reset: '恢复默认' },
        en: { title: 'Subtitles', lang: 'Language', cn: '中文', load: 'Load Local Subtitle', toggle: 'Show / Hide', rebind: 'Re-bind Video', ready: 'Click “Load Local Subtitle” to pick an ASS/SRT file', settingsBtn: 'Settings', fontsize: 'Font size', border: 'Border', font: 'Font', offset: 'Up/Down', assbg: 'ASS bg', auto: 'Auto (follow subtitle)', fontCustom: 'or custom font name…', reset: 'Reset' }
    };
    function t(key) { return I18N[uiLang][key]; }
    function applyLang() {
        uiRefs.title.textContent = t('title');
        uiRefs.langLabel.textContent = t('lang');
        uiRefs.segZh.textContent = '中文';
        uiRefs.segEn.textContent = 'English';
        uiRefs.bLoad.textContent = t('load');
        uiRefs.bToggle.textContent = t('toggle');
        uiRefs.bRebind.textContent = t('rebind');
        if (uiRefs.bSettings) uiRefs.bSettings.textContent = t('settingsBtn');
        // 设置面板标签
        if (setRefs.sizeLabel) setRefs.sizeLabel.textContent = t('fontsize');
        if (setRefs.borderLabel) setRefs.borderLabel.textContent = t('border');
        if (setRefs.fontLabel) setRefs.fontLabel.textContent = t('font');
        if (setRefs.offsetLabel) setRefs.offsetLabel.textContent = t('offset');
        if (setRefs.assbgLabel) setRefs.assbgLabel.textContent = t('assbg');
        if (setRefs.fontSel) setRefs.fontSel.options[0].textContent = t('auto');
        if (setRefs.fontCustom) setRefs.fontCustom.placeholder = t('fontCustom');
        // 高亮当前语言
        uiRefs.segZh.style.background = uiLang === 'zh' ? '#1e88e5' : 'transparent';
        uiRefs.segEn.style.background = uiLang === 'en' ? '#1e88e5' : 'transparent';
    }

    function findVideo() {
        const vids = Array.from(document.querySelectorAll('video'));
        if (!vids.length) return null;
        vids.sort((a, b) => area(b) - area(a));
        return vids[0];
    }
    function area(el) { const r = el.getBoundingClientRect(); return r.width * r.height; }

    function setStatus(msg) { if (statusEl) statusEl.textContent = msg; }
    function hideUi() { if (panel) panel.style.display = 'none'; }
    function showUi() { if (panel) panel.style.display = 'block'; }
    function togglePanel() {
        if (!panel) return;
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }

    function mkBtn(text, color, cb) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = text;
        b.style.cssText = 'background:' + color + ';color:#fff;border:0;border-radius:6px;'
            + 'padding:9px 0;cursor:pointer;font-size:13px;font-family:inherit;';
        b.addEventListener('click', cb);
        return b;
    }

    function mkRow(labelText) {
        const r = document.createElement('div');
        r.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:8px;';
        const l = document.createElement('span');
        l.style.cssText = 'color:#aaa;width:58px;flex-shrink:0;';
        l.textContent = labelText;
        r.appendChild(l);
        return { row: r, label: l };
    }

    function buildSettings() {
        const box = document.createElement('div');
        box.id = 'assp-settings';
        box.style.cssText = 'margin-top:12px;border-top:1px solid #333;padding-top:10px;display:none;';

        // 字号
        let r = mkRow(t('fontsize'));
        const sizeInput = document.createElement('input');
        sizeInput.type = 'range'; sizeInput.min = '40'; sizeInput.max = '300'; sizeInput.step = '5'; sizeInput.value = settings.fontScale;
        sizeInput.style.cssText = 'flex:1;';
        const sizeVal = document.createElement('span');
        sizeVal.style.cssText = 'color:#eee;width:46px;text-align:right;';
        sizeVal.textContent = settings.fontScale + '%';
        sizeInput.addEventListener('input', function () { settings.fontScale = +sizeInput.value; sizeVal.textContent = settings.fontScale + '%'; invalidate(); });
        r.row.appendChild(sizeInput); r.row.appendChild(sizeVal);
        box.appendChild(r.row);
        setRefs.sizeLabel = r.label; setRefs.sizeVal = sizeVal; setRefs.sizeInput = sizeInput;

        // 边框
        r = mkRow(t('border'));
        const bdInput = document.createElement('input');
        bdInput.type = 'range'; bdInput.min = '0'; bdInput.max = '20'; bdInput.step = '1'; bdInput.value = settings.borderPx;
        bdInput.style.cssText = 'flex:1;';
        const bdVal = document.createElement('span');
        bdVal.style.cssText = 'color:#eee;width:46px;text-align:right;';
        bdVal.textContent = settings.borderPx + 'px';
        bdInput.addEventListener('input', function () { settings.borderPx = +bdInput.value; bdVal.textContent = settings.borderPx + 'px'; invalidate(); });
        r.row.appendChild(bdInput); r.row.appendChild(bdVal);
        box.appendChild(r.row);
        setRefs.borderLabel = r.label; setRefs.bdVal = bdVal; setRefs.bdInput = bdInput;

        // 字体
        r = mkRow(t('font'));
        const fontSel = document.createElement('select');
        fontSel.style.cssText = 'flex:1;background:#2b2b2b;color:#eee;border:0;border-radius:6px;padding:6px;';
        [['auto', t('auto')], ['Noto Sans SC', 'Noto Sans SC'], ['Microsoft YaHei', 'Microsoft YaHei'], ['SimHei', 'SimHei'], ['sans-serif', 'sans-serif']].forEach(function (o) {
            const op = document.createElement('option'); op.value = o[0]; op.textContent = o[1]; fontSel.appendChild(op);
        });
        fontSel.value = settings.font;
        fontSel.addEventListener('change', function () { settings.font = fontSel.value; invalidate(); });
        r.row.appendChild(fontSel);
        box.appendChild(r.row);
        setRefs.fontLabel = r.label; setRefs.fontSel = fontSel;

        // 上下偏移（按视频高度的百分比）
        r = mkRow(t('offset'));
        const offInput = document.createElement('input');
        offInput.type = 'range'; offInput.min = '-120'; offInput.max = '120'; offInput.step = '1'; offInput.value = settings.offsetPct;
        offInput.style.cssText = 'flex:1;';
        const offVal = document.createElement('span');
        offVal.style.cssText = 'color:#eee;width:52px;text-align:right;';
        offVal.textContent = (settings.offsetPct >= 0 ? '+' : '') + settings.offsetPct + '%';
        offInput.addEventListener('input', function () { settings.offsetPct = +offInput.value; offVal.textContent = (settings.offsetPct >= 0 ? '+' : '') + settings.offsetPct + '%'; invalidate(); });
        r.row.appendChild(offInput); r.row.appendChild(offVal);
        box.appendChild(r.row);
        setRefs.offsetLabel = r.label; setRefs.offVal = offVal; setRefs.offInput = offInput;

        // ASS 背景
        r = mkRow(t('assbg'));
        const bgCheck = document.createElement('input');
        bgCheck.type = 'checkbox'; bgCheck.checked = settings.assBg;
        bgCheck.style.cssText = 'width:16px;height:16px;';
        bgCheck.addEventListener('change', function () { settings.assBg = bgCheck.checked; invalidate(); });
        r.row.appendChild(bgCheck);
        box.appendChild(r.row);
        setRefs.assbgLabel = r.label; setRefs.bgCheck = bgCheck;

        // 恢复默认
        const bReset = mkBtn(t('reset'), '#e53935', resetDefaults);
        bReset.style.width = '100%';
        bReset.style.marginTop = '8px';
        box.appendChild(bReset);

        return box;
    }

    function buildUI() {
        panel = document.createElement('div');
        panel.id = 'assp-panel';
        panel.style.cssText = 'position:fixed;z-index:2147483600;right:16px;bottom:16px;'
            + 'background:rgba(22,22,22,.97);color:#eee;border-radius:12px;padding:14px 14px 12px;'
            + 'width:240px;font:13px/1.4 system-ui,"Segoe UI",sans-serif;'
            + 'box-shadow:0 6px 24px rgba(0,0,0,.45);';

        // 标题行
        const titleRow = document.createElement('div');
        titleRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;';
        const title = document.createElement('div');
        title.style.cssText = 'font-weight:700;font-size:14px;';
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.textContent = '×';
        closeBtn.setAttribute('title', '隐藏面板（Alt+A 可再打开）');
        closeBtn.style.cssText = 'background:none;color:#aaa;border:0;font-size:20px;cursor:pointer;line-height:1;padding:0 4px;';
        closeBtn.addEventListener('click', hideUi);
        titleRow.appendChild(title);
        titleRow.appendChild(closeBtn);
        panel.appendChild(titleRow);

        // 语言行
        const langRow = document.createElement('div');
        langRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:12px;';
        const langLabel = document.createElement('span');
        langLabel.style.cssText = 'color:#aaa;';
        const langSeg = document.createElement('div');
        langSeg.style.cssText = 'flex:1;display:flex;background:#2b2b2b;border-radius:8px;overflow:hidden;padding:2px;';
        const segZh = document.createElement('button');
        const segEn = document.createElement('button');
        [segZh, segEn].forEach(function (b) {
            b.type = 'button';
            b.style.cssText = 'flex:1;color:#fff;border:0;padding:6px 0;cursor:pointer;font-size:12px;border-radius:6px;';
        });
        segZh.addEventListener('click', function () { uiLang = 'zh'; applyLang(); });
        segEn.addEventListener('click', function () { uiLang = 'en'; applyLang(); });
        langSeg.appendChild(segZh);
        langSeg.appendChild(segEn);
        langRow.appendChild(langLabel);
        langRow.appendChild(langSeg);
        panel.appendChild(langRow);

        // 加载本地字幕
        const bLoad = mkBtn('', '#1e88e5', function () { file.click(); });
        bLoad.style.width = '100%';
        panel.appendChild(bLoad);

        // 两个按钮并排
        const rowwrap = document.createElement('div');
        rowwrap.style.cssText = 'display:flex;gap:8px;margin-top:8px;';
        const bToggle = mkBtn('', '#43a047', function () {
            active = !active; ensureOverlay();
            overlay.style.display = active ? '' : 'none';
            setStatus(active ? (uiLang === 'zh' ? '已开启，正在跟随播放…' : 'On, following playback…') : (uiLang === 'zh' ? '已隐藏' : 'Hidden'));
        });
        const bRebind = mkBtn('', '#616161', function () {
            video = findVideo();
            setStatus(video ? (uiLang === 'zh' ? '已绑定视频。上次加载：' + currentSource : 'Bound. Last loaded: ' + currentSource) : (uiLang === 'zh' ? '未找到 <video> 元素' : 'No <video> found'));
        });
        bToggle.style.flex = '1';
        bRebind.style.flex = '1';
        rowwrap.appendChild(bToggle);
        rowwrap.appendChild(bRebind);
        panel.appendChild(rowwrap);

        // 设置按钮 + 设置面板
        const bSettings = mkBtn('', '#8e24aa', function () {
            settingOpen = !settingOpen;
            if (settingsBox) settingsBox.style.display = settingOpen ? '' : 'none';
        });
        bSettings.style.width = '100%';
        bSettings.style.marginTop = '8px';
        panel.appendChild(bSettings);
        settingsBox = buildSettings();
        panel.appendChild(settingsBox);

        // 状态
        statusEl = document.createElement('div');
        statusEl.style.cssText = 'margin-top:10px;color:#aaa;word-break:break-all;';
        panel.appendChild(statusEl);

        document.body.appendChild(panel);

        // 拖动：按住面板空白处可移动（按钮/关闭仍能点击）
        let drag = null;
        panel.addEventListener('pointerdown', function (e) {
            if (e.target.closest('button, input, select')) return;
            const rect = panel.getBoundingClientRect();
            drag = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
            e.preventDefault();
        });
        document.addEventListener('pointermove', function (e) {
            if (!drag) return;
            panel.style.left = (e.clientX - drag.dx) + 'px';
            panel.style.top = (e.clientY - drag.dy) + 'px';
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
        });
        document.addEventListener('pointerup', function () { drag = null; });

        // 保存引用
        uiRefs.title = title; uiRefs.langLabel = langLabel; uiRefs.segZh = segZh; uiRefs.segEn = segEn;
        uiRefs.bLoad = bLoad; uiRefs.bToggle = bToggle; uiRefs.bRebind = bRebind;
        uiRefs.bSettings = bSettings;
        applyLang();
        setStatus(t('ready'));
    }

    // 文件选择（挂在 body，面板隐藏后还能用）
    const file = document.createElement('input');
    file.type = 'file';
    file.accept = '.ass,.ssa,.srt';
    file.style.display = 'none';
    document.body.appendChild(file);
    file.addEventListener('change', function () { if (file.files && file.files[0]) loadFile(file.files[0]); });

    function loadFile(file) {
        const r = new FileReader();
        r.onload = function () {
            const txt = String(r.result || '');
            events = /\[script info\]/i.test(txt) ? parseASS(txt) : parseSRT(txt);
            currentSource = /\[script info\]/i.test(txt) ? 'ASS' : 'SRT';
            active = true; ensureOverlay(); overlay.style.display = '';
            lastTime = -1;
            setStatus((uiLang === 'zh' ? '已加载 ' + currentSource + '，共 ' + events.length + ' 条' : 'Loaded ' + currentSource + ', ' + events.length + ' events'));
        };
        r.onerror = function () { setStatus(uiLang === 'zh' ? '读取文件失败' : 'Failed to read file'); };
        r.readAsText(file);
    }

    // ------------------------------ ASS
    function parseASS(text) {
        let playResY = 1080;
        const styles = {};
        let section = '';
        let fmt = null;
        const out = [];
        for (const raw of text.split(/\r?\n/)) {
            const line = raw.trim();
            if (!line) continue;
            if (/^\[.*\]$/.test(line)) { section = line.slice(1, -1); continue; }
            if (line.startsWith('PlayResY:')) { const v = parseInt(line.slice(9)); if (v > 0) playResY = v; }
            else if (section === 'V4+ Styles' && line.startsWith('Style:')) {
                const s = parseStyle(line, playResY);
                if (s) styles[s.name] = s;
            } else if (section === 'Events' && line.startsWith('Format:')) {
                fmt = line.slice(7).split(',').map(function (s) { return s.trim(); });
            } else if (section === 'Events' && line.startsWith('Dialogue:')) {
                const d = parseDialogue(line, fmt, styles, playResY);
                if (d) out.push(d);
            }
        }
        return out;
    }
    function parseStyle(line, playResY) {
        const p = line.slice(6).split(',');
        if (p.length < 22) return null;
        return {
            name: p[0].trim(),
            fontname: (p[1] || '').trim(),
            fontSize: (parseFloat(p[2]) || 40) / playResY,
            primary: assColor(p[3]),
            outline: assColor(p[5]),
            backColour: (p[6] || '').trim(),      // &HAABBGGRR 背景色
            bold: parseInt(p[7]) === -1,
            borderStyle: (parseInt(p[15]) === 3) ? 3 : 1,   // 3 = 不透明背景框
            outlineW: (parseInt(p[16]) || 2) / playResY,
            alignment: parseInt(p[18]) || 2,
            marginV: parseInt(p[21]) || 10
        };
    }
    function parseDialogue(line, fmt, styles, playResY) {
        if (!fmt) return null;
        const iS = fmt.indexOf('Start'), iE = fmt.indexOf('End'), iSt = fmt.indexOf('Style'), iT = fmt.indexOf('Text');
        const parts = line.slice(line.indexOf(':') + 1).split(',');
        function g(i) { return (i >= 0 && i < parts.length) ? parts[i] : ''; }
        const startMs = tASS(g(iS)), endMs = tASS(g(iE));
        if (!(endMs > startMs)) return null;
        const styleName = g(iSt).trim() || 'Default';
        const st = styles[styleName];
        let alignment = st ? st.alignment : 2;
        let primary = st ? st.primary : '#ffffff';
        let outline = st ? st.outline : '#000000';
        let backColour = st ? st.backColour : '';
        let borderStyle = st ? st.borderStyle : 1;
        let yFrac = st ? yFromMargin(st.alignment, st.marginV, playResY) : 0.9;
        let fontSize = st ? st.fontSize : 0.074;
        let fontname = st ? st.fontname : '';
        let bold = st ? st.bold : true;
        let outlineW = st ? st.outlineW : 0.002;
        let text = g(iT).trim() || '';
        const an = /\\an([1-9])/.exec(text);
        if (an) alignment = +an[1];
        const c1 = /\\1c&H([0-9a-fA-F]+)&/.exec(text);
        if (c1) primary = assColor(c1[1]);
        const c3 = /\\3c&H([0-9a-fA-F]+)&/.exec(text);
        if (c3) outline = assColor(c3[1]);
        const c4 = /\\4c&H([0-9a-fA-F]+)&/.exec(text);
        if (c4) backColour = c4[1];
        const pos = /\\pos\(([\d.]+),([\d.]+)\)/.exec(text);
        if (pos) yFrac = +pos[2] / playResY;
        text = text.replace(/\\[Nn]/g, '\n').replace(/\{[^}]*\}/g, '').trim();
        return { startMs: startMs, endMs: endMs, text: text, alignment: alignment, yFrac: yFrac,
            primary: primary, outline: outline, fontSize: fontSize, fontname: fontname,
            bold: bold, outlineW: outlineW, backColour: backColour, borderStyle: borderStyle };
    }
    function tASS(t) {
        const m = /^(\d+):(\d\d):(\d\d)(?:\.(\d+))?$/.exec(t.trim());
        if (!m) return 0;
        return (m[1] * 3600 + m[2] * 60 + (+m[3])) * 1000 + (+('0.' + (m[4] || '0')) * 1000);
    }
    function yFromMargin(alignment, marginV, playResY) {
        const mar = marginV / playResY;
        if (alignment >= 7) return Math.min(1, mar);
        if (alignment <= 3) return Math.max(0.05, 1 - mar);
        return 0.5;
    }
    function assColor(h) { // &HAABBGGRR -> 'rgb(rr,gg,bb)'
        let hex = String(h || '').replace(/^&H/i, '').replace(/&$/, '');
        hex = ('00' + hex).slice(-8);
        while (hex.length < 8) hex = '00' + hex;
        const b = parseInt(hex.slice(2, 4), 16);
        const g = parseInt(hex.slice(4, 6), 16);
        const r = parseInt(hex.slice(6, 8), 16);
        return 'rgb(' + r + ',' + g + ',' + b + ')';
    }
    function assColorA(h) { // &HAABBGGRR -> 'rgba(r,g,b,a)'，含透明度
        let hex = String(h || '').replace(/^&H/i, '').replace(/&$/, '');
        hex = ('00' + hex).slice(-8);
        while (hex.length < 8) hex = '00' + hex;
        const a = parseInt(hex.slice(0, 2), 16);
        const b = parseInt(hex.slice(2, 4), 16);
        const g = parseInt(hex.slice(4, 6), 16);
        const r = parseInt(hex.slice(6, 8), 16);
        const alpha = Math.min(1, Math.max(0, Math.round((1 - a / 255) * 100) / 100));
        return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
    }

    // ------------------------------ SRT
    function parseSRT(text) {
        const out = [];
        for (const b of text.split(/\r?\n\s*\r?\n/)) {
            const ls = b.split(/\r?\n/);
            let ti = -1;
            for (let i = 0; i < ls.length; i++) if (ls[i].indexOf('-->') >= 0) { ti = i; break; }
            if (ti < 0) continue;
            const tm = ls[ti].split('-->');
            const startMs = tSRT(tm[0].trim()), endMs = tSRT(tm[1].trim());
            let t = '';
            for (let i = ti + 1; i < ls.length; i++) if (ls[i].trim()) t += (t ? '\n' : '') + ls[i];
            if (!t) continue;
            out.push({ startMs: startMs, endMs: endMs, text: t, alignment: 2, yFrac: 0.9, primary: '#fff', outline: '#000', fontSize: 0.074, fontname: '', bold: true, outlineW: 0.002 });
        }
        return out;
    }
    function tSRT(t) {
        const m = /^(\d+):(\d{2}):(\d{2})[,.](?:(\d{1,3}))$/.exec(t);
        if (!m) return 0;
        const x = m[4] || '0';
        const frac = x.length === 3 ? +x : x.length === 2 ? +x * 10 : +x * 100;
        return (m[1] * 3600 + m[2] * 60 + (+m[3])) * 1000 + frac;
    }

    // ------------------------------ overlay（挂在视频父容器，低 z-index，避免盖住进度条）
    // 每帧强制把 overlay 放到 video 的当前父元素，并跟随坐标；这样 B站 全屏把 video 移进全屏容器时也能跟上。
    function ensureOverlay() {
        if (overlay) { attachOverlay(); return; }
        overlay = document.createElement('div');
        overlay.id = 'assp-overlay';
        overlay.style.cssText = 'position:absolute;pointer-events:none;z-index:2;overflow:hidden;display:none;';
        attachOverlay();
    }
    function attachOverlay() {
        if (!overlay) return;
        let host = (video && video.parentElement) ? video.parentElement : document.body;
        if (host !== document.body && window.getComputedStyle(host).position === 'static') {
            host.style.position = 'relative';
        }
        if (overlay.parentElement !== host) host.appendChild(overlay);
    }

    function tick() {
        if (!video) { rafId = requestAnimationFrame(tick); return; }
        attachOverlay();
        const v = video.getBoundingClientRect();
        const host = overlay.parentElement || document.body;
        const hr = host.getBoundingClientRect();
        if (v.width && v.height) {
            overlay.style.left = (v.left - hr.left) + 'px';
            overlay.style.top = (v.top - hr.top) + 'px';
            overlay.style.width = v.width + 'px';
            overlay.style.height = v.height + 'px';
        }
        if (active && events.length) render({ width: v.width, height: v.height });
        rafId = requestAnimationFrame(tick);
    }

    function render(rect) {
        const now = (video.currentTime !== undefined) ? video.currentTime * 1000 : 0;
        if (now === lastTime) return;
        lastTime = now;
        overlay.textContent = '';
        const h = rect.height, w = rect.width;
        if (!h || !w) return;
        for (const e of events) {
            if (now < e.startMs || now >= e.endMs) continue;
            const size = Math.max(12, h * e.fontSize * (settings.fontScale / 100));
            const lineH = size * 1.25;
            const lines = e.text.split('\n');
            const blockH = lines.length * lineH;
            const mod = e.alignment % 3;
            let y;
            if (e.alignment <= 3) y = Math.max(0, h * e.yFrac - blockH);
            else if (e.alignment >= 7) y = Math.min(h - blockH, h * e.yFrac);
            else y = h * e.yFrac - blockH / 2;
            y = Math.max(0, Math.min(y, h - blockH));
            const el = document.createElement('div');
            let stroke = Math.max(1.5, e.outlineW * h * 2);
            if (settings.borderPx > 0) stroke = Math.max(1.5, settings.borderPx);
            let fam;
            if (settings.font && settings.font !== 'auto') {
                fam = "'" + settings.font.replace(/'/g, '') + "','Noto Sans CJK SC','Noto Sans SC','Microsoft YaHei',sans-serif";
            } else {
                fam = (e.fontname ? "'" + e.fontname + "'," : '') + "'Noto Sans CJK SC','Noto Sans SC','Microsoft YaHei',sans-serif";
            }
            const bg = settings.assBg && e.borderStyle === 3 && e.backColour;
            let css = 'position:absolute;white-space:pre;color:' + e.primary
                + ';font-size:' + size + 'px;'
                + 'font-family:' + fam + ';'
                + 'font-weight:' + (e.bold ? 700 : 400) + ';'
                + 'line-height:' + lineH + 'px;top:' + y + 'px;'
                + '-webkit-text-stroke:' + stroke + 'px ' + e.outline + ';'
                + 'paint-order:stroke fill;';
            if (bg) css += 'background:' + assColorA(e.backColour) + ';padding:2px 6px;border-radius:2px;';
            const offPx = settings.offsetPct / 100 * h;   // 上下偏移（按视频高度）
            // 对齐 + 上下偏移（用 transform 统一偏移）
            let transform;
            if (mod === 2) {
                if (bg) {
                    css += 'left:50%;width:max-content;';
                    transform = 'translate(calc(-50%), ' + offPx + 'px)';
                } else {
                    css += 'left:0;width:100%;text-align:center;';
                    transform = 'translate(0,' + offPx + 'px)';
                }
            } else if (mod === 1) {
                css += 'left:' + (w * 0.03) + 'px;';
                transform = 'translate(0,' + offPx + 'px)';
            } else {
                css += 'right:' + (w * 0.03) + 'px;';
                transform = 'translate(0,' + offPx + 'px)';
            }
            css += 'transform:' + transform + ';';
            el.style.cssText = css;
            el.textContent = lines.join('\n');
            overlay.appendChild(el);
        }
    }

    function boot() {
        if (!document.body) { setTimeout(boot, 200); return; }
        buildUI();
        video = findVideo();
        ensureOverlay();
        // Alt+A: 显示/隐藏字幕面板
        window.addEventListener('keydown', function (e) {
            if (e.altKey && (e.key === 'a' || e.key === 'A')) { e.preventDefault(); togglePanel(); }
        });
        setInterval(function () { if (!video || !document.body.contains(video)) video = findVideo(); }, 1500);
        requestAnimationFrame(tick);
        setStatus(video ? t('ready') : (uiLang === 'zh' ? '暂未找到 <video>，稍后自动重扫' : 'No <video> yet, re-scanning…'));
    }
    boot();
})();
