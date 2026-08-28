// ==UserScript==
// @name         ASS Subtitle Overlay（多说话人）
// @namespace    CCCMNSB
// @version      1.30
// @description  在网页 <video> 上加载本地 .ass/.srt，多字幕同时显示 + 按 ASS 原色 + 按 ASS 位置渲染。界面语言中/英可切。
// @author       CCCMNSB
// @match        *://*/*
// @run-at       document-idle
// @grant        GM_setValue
// @grant        GM_getValue
// @noframes
// @updateURL    https://raw.githubusercontent.com/CCCMNSB/ASS-subtitles-overlay/main/ass-subtitle-overlay.user.js
// @downloadURL  https://raw.githubusercontent.com/CCCMNSB/ASS-subtitles-overlay/main/ass-subtitle-overlay.user.js
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
    let playResW = 1920, playResH = 1080;   // 脚本播放分辨率，供 \pos 定位
    let uiLang = 'zh';               // 'zh' | 'en'（界面语言）
    let statusEl = null;
    const uiRefs = {};               // 界面上需要随语言切换的文字元素
    const setRefs = {};              // 设置面板控件引用
    let settingsBox = null;
    let settingOpen = false;
    // ---- 在线字幕库（GitHub 仓库）----
    const DEFAULT_REPO = 'https://raw.githubusercontent.com/CCCMNSB/subtitles/main';
    let subtitleRepo = DEFAULT_REPO;                    // 字幕库地址（可在设置里改）
    // 读取上次保存的字幕库地址（GM 存储，跨网站全局）
    try { const s = GM_getValue('assp_repo', ''); if (s) subtitleRepo = s; } catch (e) {}
    let repoCache = { etag: null, data: null, ts: 0, repo: '' };  // 索引缓存 + ETag（按仓库区分）
    let lastRefreshTs = 0;                                 // 上次强制刷新时间（用于 30s 限制）
    const repoThrottle = 30000;                         // 刷新节流(ms)
    let mainBox = null;                                 // 面板主控件容器
    let onlineBox = null;                               // 在线字幕列表容器
    let onlineListEl = null;                            // 列表滚动容器
    let onlineSearch = null;                            // 搜索框
    let currentVideoId = null;                          // 当前视频 id（由 URL 提取）
    let autoLoadedId = null;                            // 已自动加载的 id，防重复
    let onlineOpen = false;
    const onlineRefs = {};                              // 在线字幕界面引用
    let onlineData = [];                                // 拉取的索引列表
    let onlinePage = 0;                                 // 当前已渲染的页
    const ONLINE_PAGE = 10;                             // 每页条数
    let autoLoadTried = false;                          // 是否已尝试自动匹配
    let loadedSubtitleId = null;                        // 当前已加载的在线字幕 id

    // 用户可调设置
    const settings = {
        fontScale: 55,    // 字号（%），默认 55，可手动调
        borderPx: 0,      // 边框粗细（px），0=按 ASS 自动
        font: 'auto',     // 'auto'=跟随字幕字体；否则用指定字体名
        offsetPct: 0,     // 上下偏移（% of video height，负数=上移）
        assBg: true,      // 是否渲染 ASS 不透明背景（BorderStyle=3）
        autoJump: true    // 打开视频时自动跳到字幕开始时间（默认开）
    };
    // 读取上次保存的字体选择（GM 存储，全局）
    try { const f = GM_getValue('assp_font', ''); if (f) settings.font = f; } catch (e) {}
    // 读取其它设置（字号/边框/偏移/ASS背景/自动跳转）
    function saveSetting(k, v) { try { GM_setValue(k, v); } catch (e) {} }
    try { const n = GM_getValue('assp_fontScale', ''); if (n !== '') settings.fontScale = +n || 55; } catch (e) {}
    try { const n = GM_getValue('assp_borderPx', ''); if (n !== '') settings.borderPx = +n || 0; } catch (e) {}
    try { const n = GM_getValue('assp_offsetPct', ''); if (n !== '') settings.offsetPct = +n || 0; } catch (e) {}
    try { const n = GM_getValue('assp_assBg', ''); if (n !== '') settings.assBg = n === '1'; } catch (e) {}
    try { const n = GM_getValue('assp_autoJump', ''); if (n !== '') settings.autoJump = n === '1'; } catch (e) {}
    // 实时生效：任何设置改动后把 lastTime 置回 -1，下一帧就重绘一次字幕
    function invalidate() { lastTime = -1; }
    function resetDefaults() {
        settings.fontScale = 55; settings.borderPx = 0; settings.font = 'auto'; settings.offsetPct = 0; settings.assBg = true; settings.autoJump = true;
        if (setRefs.sizeInput) setRefs.sizeInput.value = '55';
        if (setRefs.sizeVal) setRefs.sizeVal.value = '55%';
        if (setRefs.bdInput) setRefs.bdInput.value = '0';
        if (setRefs.bdVal) setRefs.bdVal.value = '0px';
        if (setRefs.fontSearch) setRefs.fontSearch.value = '';
        if (setRefs.fontUpdate) setRefs.fontUpdate();
        try { GM_setValue('assp_font', 'auto'); } catch (e) {}
        if (setRefs.offInput) setRefs.offInput.value = '0';
        if (setRefs.offVal) setRefs.offVal.textContent = '0%';
        if (setRefs.bgCheck) setRefs.bgCheck.checked = true;
        settings.autoJump = true;
        if (setRefs.autoJumpCheck) setRefs.autoJumpCheck.checked = true;
        // 恢复字幕库默认（你的仓库），并清缓存
        subtitleRepo = DEFAULT_REPO;
        if (setRefs.repoInput) setRefs.repoInput.value = subtitleRepo;
        try { GM_setValue('assp_repo', subtitleRepo); } catch (e) {}
        repoCache = { etag: null, data: null, ts: 0, repo: '' };
        subTextCache = {};
        saveSetting('assp_fontScale', 55); saveSetting('assp_borderPx', 0); saveSetting('assp_offsetPct', 0); saveSetting('assp_assBg', '1'); saveSetting('assp_autoJump', '1');
        invalidate();
    }

    const I18N = {
        zh: { title: '字幕叠加', lang: '语言', cn: '中文', load: '加载本地字幕', toggle: '显示 / 隐藏', rebind: '重新绑定视频', ready: '点击“加载本地字幕”选择 ASS/SRT 文件', settingsBtn: '设置', fontsize: '字号', border: '边框', font: '字体', offset: '上下偏移', assbg: 'ASS 背景', autoJump: '跳过开头', auto: '默认（跟随字幕）', fontCustom: '或自定义字体名…', fontPlaceholder: '输入字体名，或从建议里选', fontSearch: '搜索字体…', reset: '恢复默认', online: '在线字幕', refresh: '刷新', back: '返回', search: '搜索标题/ID', loading: '加载中…', none: '未找到匹配的字幕', loadFail: '加载失败', repo: '字幕库', loaded: '已加载在线字幕：', prev: '上一页', next: '下一页', play: '打开视频', jump: '跳到该字幕开始', openTime: '打开视频并跳到该时间', jumpErr: '无法跳转' },
        en: { title: 'Subtitles', lang: 'Language', cn: '中文', load: 'Load Local Subtitle', toggle: 'Show / Hide', rebind: 'Re-bind Video', ready: 'Click “Load Local Subtitle” to pick an ASS/SRT file', settingsBtn: 'Settings', fontsize: 'Font size', border: 'Border', font: 'Font', offset: 'Up/Down', assbg: 'ASS bg', autoJump: 'Skip intro', auto: 'Auto (follow subtitle)', fontCustom: 'or custom font name…', fontPlaceholder: 'Type a font name, or pick from suggestions', fontSearch: 'Search font…', reset: 'Reset', online: 'Online', refresh: 'Refresh', back: 'Back', search: 'Search title/ID', loading: 'Loading…', none: 'No match', loadFail: 'Load failed', repo: 'Repo', loaded: 'Loaded online: ', prev: '‹ Prev', next: 'Next ›', play: 'Play video', jump: 'Jump to start', openTime: 'Open video at this time', jumpErr: 'Cannot seek' }
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
        if (uiRefs.bOnline) uiRefs.bOnline.textContent = t('online');
        // 设置面板标签
        if (setRefs.sizeLabel) setRefs.sizeLabel.textContent = t('fontsize');
        if (setRefs.borderLabel) setRefs.borderLabel.textContent = t('border');
        if (setRefs.fontLabel) setRefs.fontLabel.textContent = t('font');
        if (setRefs.offsetLabel) setRefs.offsetLabel.textContent = t('offset');
        if (setRefs.assbgLabel) setRefs.assbgLabel.textContent = t('assbg');
        if (setRefs.autoJumpLabel) setRefs.autoJumpLabel.textContent = t('autoJump');
        if (setRefs.repoLabel) setRefs.repoLabel.textContent = t('repo');
        if (setRefs.fontSearch) setRefs.fontSearch.placeholder = t('fontSearch');
        if (setRefs.fontUpdate) setRefs.fontUpdate();
        // 在线字幕界面标签
        if (onlineRefs.bBack) onlineRefs.bBack.textContent = t('back');
        if (onlineRefs.oTitle) onlineRefs.oTitle.textContent = t('online');
        if (onlineRefs.bRefresh) onlineRefs.bRefresh.textContent = t('refresh');
        if (onlineRefs.search) onlineRefs.search.placeholder = t('search');
        if (onlineRefs.bPrev) onlineRefs.bPrev.textContent = t('prev');
        if (onlineRefs.bNext) onlineRefs.bNext.textContent = t('next');
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
    let panelVisible = true;      // 用户希望的面板可见性（≠ 全屏临时的隐藏）
    // 读取上次保存的面板显隐（GM 存储，跨网站全局；未保存默认显示）
    try { panelVisible = GM_getValue('assp_panel', '1') !== '0'; } catch (e) {}
    function persistPanel() { try { GM_setValue('assp_panel', panelVisible ? '1' : '0'); } catch (e) {} }
    let fsState = false;          // 当前是否全屏（用于只响应状态变化）
    function setPanelDisplay(show) { if (panel) panel.style.display = show ? 'block' : 'none'; }
    function hideUi() { panelVisible = false; setPanelDisplay(false); persistPanel(); }
    function showUi() { panelVisible = true; setPanelDisplay(true); persistPanel(); }
    function togglePanel() {
        if (!panel) return;
        panelVisible = !panelVisible;
        setPanelDisplay(panelVisible);
        persistPanel();
    }
    // 全屏：进入→临时隐藏；退出→按用户意图恢复。用事件（fullscreen + resize）驱动，兼容 B站/YouTube。
    function isFullscreen() {
        if (document.fullscreenElement || document.webkitFullscreenElement) return true;
        if (!video) return false;
        if (video.webkitDisplayingFullscreen || video.mozFullScreen || video.msFullscreenElement) return true;
        try {
            // 兜底：视频几乎铺满视口即视为全屏（某些站点不置位 fullscreenElement，如 YouTube）
            const r = video.getBoundingClientRect();
            if (r.width >= window.innerWidth - 4 && r.height >= window.innerHeight - 4) return true;
        } catch (e) {}
        return false;
    }
    function applyFullscreenUi() {
        if (isFullscreen()) setPanelDisplay(false);
        else setPanelDisplay(panelVisible);
    }
    function checkFullscreen() {
        const nowFs = isFullscreen();
        if (nowFs !== fsState) { fsState = nowFs; applyFullscreenUi(); }
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

    // 检测本机已安装的部分常见中/英文字体（canvas 测量宽度，最靠近"你电脑真的有"的清单）
    function detectFonts() {
        const candidates = [
            'Microsoft YaHei', 'SimHei', 'SimSun', 'KaiTi', 'FangSong', 'STHeiti', 'STKaiti',
            'Microsoft JhengHei', 'PingFang SC', 'Hiragino Sans GB', 'Source Han Sans SC',
            'Source Han Sans CN', 'Noto Sans SC', 'Noto Sans CJK SC', 'WenQuanYi Micro Hei',
            'Arial', 'Verdana', 'Tahoma', 'Georgia', 'Consolas'
        ];
        let ctx;
        try { ctx = document.createElement('canvas').getContext('2d'); } catch (e) { return []; }
        if (!ctx) return [];
        const test = '测中文字体Mm';   // 中英混合，测字体差异
        const out = [];
        try {
            ctx.font = '48px "__assp_definitely_missing_font__"';
            const base = ctx.measureText(test).width;
            for (const f of candidates) {
                ctx.font = '48px "' + f + '"';
                if (Math.abs(ctx.measureText(test).width - base) > 0.6) out.push(f);
            }
        } catch (e) {}
        return out;
    }

    function buildSettings() {
        const box = document.createElement('div');
        box.id = 'assp-settings';
        box.style.cssText = 'margin-top:12px;border-top:1px solid #333;padding-top:10px;display:none;';

        // 字号（滑块 + 可输入数字，限制 40-300，非法回退 55）
        let r = mkRow(t('fontsize'));
        const sizeInput = document.createElement('input');
        sizeInput.type = 'range'; sizeInput.min = '40'; sizeInput.max = '300'; sizeInput.step = '1'; sizeInput.value = settings.fontScale;
        sizeInput.style.cssText = 'flex:1;';
        const sizeVal = document.createElement('input');
        sizeVal.type = 'text';
        sizeVal.value = settings.fontScale + '%';
        sizeVal.style.cssText = 'width:50px;background:#2b2b2b;color:#eee;border:0;border-radius:6px;padding:6px;text-align:right;box-sizing:border-box;';
        function applySize(v) {
            let s = String(v || '').replace(/[^0-9]/g, '').trim();
            let n = parseInt(s, 10);
            if (!isFinite(n)) n = 55;
            n = Math.max(40, Math.min(300, n));
            settings.fontScale = n;
            sizeVal.value = n + '%';
            sizeInput.value = n;
            invalidate(); saveSetting('assp_fontScale', n);
        }
        sizeInput.addEventListener('input', function () { applySize(sizeInput.value); });
        sizeVal.addEventListener('change', function () { applySize(sizeVal.value); });
        sizeVal.addEventListener('blur', function () { applySize(sizeVal.value); });
        r.row.appendChild(sizeInput); r.row.appendChild(sizeVal);
        box.appendChild(r.row);
        setRefs.sizeLabel = r.label; setRefs.sizeVal = sizeVal; setRefs.sizeInput = sizeInput;

        // 边框（滑块 + 可输入数字，限制 0-20，非法回退 0）
        r = mkRow(t('border'));
        const bdInput = document.createElement('input');
        bdInput.type = 'range'; bdInput.min = '0'; bdInput.max = '20'; bdInput.step = '1'; bdInput.value = settings.borderPx;
        bdInput.style.cssText = 'flex:1;';
        const bdVal = document.createElement('input');
        bdVal.type = 'text';
        bdVal.value = settings.borderPx + 'px';
        bdVal.style.cssText = 'width:50px;background:#2b2b2b;color:#eee;border:0;border-radius:6px;padding:6px;text-align:right;box-sizing:border-box;';
        function applyBorder(v) {
            let s = String(v || '').replace(/[^0-9]/g, '').trim();
            let n = parseInt(s, 10);
            if (!isFinite(n)) n = 0;
            n = Math.max(0, Math.min(20, n));
            settings.borderPx = n;
            bdVal.value = n + 'px';
            bdInput.value = n;
            invalidate(); saveSetting('assp_borderPx', n);
        }
        bdInput.addEventListener('input', function () { applyBorder(bdInput.value); });
        bdVal.addEventListener('change', function () { applyBorder(bdVal.value); });
        bdVal.addEventListener('blur', function () { applyBorder(bdVal.value); });
        r.row.appendChild(bdInput); r.row.appendChild(bdVal);
        box.appendChild(r.row);
        setRefs.borderLabel = r.label; setRefs.bdVal = bdVal; setRefs.bdInput = bdInput;

        // 字体：下拉触发器 + 下拉内搜索框（点击弹出字体列表，不用手动删文字）
        r = mkRow(t('font'));
        const fcWrap = document.createElement('div');
        fcWrap.style.cssText = 'position:relative;flex:1;';
        const fcTrigger = document.createElement('div');
        fcTrigger.style.cssText = 'display:flex;align-items:center;justify-content:space-between;background:#2b2b2b;color:#eee;border:0;border-radius:6px;padding:6px 8px;cursor:pointer;font-size:12.5px;';
        const fcLabel = document.createElement('span');
        fcLabel.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
        const fcChevron = document.createElement('span');
        fcChevron.textContent = '▾';
        fcChevron.style.cssText = 'color:#888;flex-shrink:0;';
        fcTrigger.appendChild(fcLabel); fcTrigger.appendChild(fcChevron);
        const fcPanel = document.createElement('div');
        fcPanel.style.cssText = 'position:absolute;z-index:2147483601;left:0;right:0;top:calc(100% + 2px);background:#1e1e1e;border:1px solid #444;border-radius:6px;display:none;';
        const fcSearch = document.createElement('input');
        fcSearch.type = 'text';
        fcSearch.placeholder = t('fontSearch');
        fcSearch.style.cssText = 'width:100%;background:#2b2b2b;color:#eee;border:0;border-bottom:1px solid #444;padding:6px 8px;box-sizing:border-box;';
        const fcList = document.createElement('div');
        fcList.style.cssText = 'max-height:160px;overflow-y:auto;';
        fcPanel.appendChild(fcSearch); fcPanel.appendChild(fcList);
        function fcOptions() {
            return [{ v: 'auto', label: t('auto') }]
                .concat(detectFonts().map(function (f) { return { v: f, label: f }; }))
                .concat([{ v: 'sans-serif', label: 'sans-serif' }, { v: 'serif', label: 'serif' }, { v: 'monospace', label: 'monospace' }]);
        }
        const fontOptions = fcOptions();
        function sanitizeFont(v) { return String(v || '').replace(/["',;\n]/g, '').trim().slice(0, 60); }
        function fontLabel(v) { for (const o of fontOptions) if (o.v === v) return o.label; return v; }
        function persistFont() { try { GM_setValue('assp_font', settings.font); } catch (e) {} }
        function fcUpdateLabel() { fcLabel.textContent = (settings.font && settings.font !== 'auto') ? fontLabel(settings.font) : t('auto'); }
        function fcRender(filter) {
            fcList.textContent = '';
            const q = (filter || '').toLowerCase();
            const shown = fontOptions.filter(function (o) { return !q || o.label.toLowerCase().indexOf(q) >= 0; });
            if (shown.length) {
                shown.forEach(function (o) {
                    const it = document.createElement('div');
                    it.style.cssText = 'padding:6px 8px;color:#eee;font-size:12.5px;cursor:pointer;';
                    if ((o.v === settings.font) || (settings.font === 'auto' && o.v === 'auto')) it.style.background = '#0d47a1';
                    it.textContent = o.label;
                    it.addEventListener('click', function (ev) { ev.stopPropagation(); fcSelect(o.v); });
                    fcList.appendChild(it);
                });
            } else {
                const l = document.createElement('div');
                l.style.cssText = 'padding:6px 8px;color:#aaa;font-size:12px;cursor:pointer;';
                l.textContent = '使用 "' + (filter || '') + '"';
                l.addEventListener('click', function (ev) { ev.stopPropagation(); fcSelect(filter); });
                fcList.appendChild(l);
            }
        }
        function fcOpen() { fcSearch.value = ''; fcRender(''); fcPanel.style.display = ''; }
        function fcClose() { fcPanel.style.display = 'none'; }
        function fcSelect(v) {
            settings.font = sanitizeFont(v) || 'auto';
            fcUpdateLabel();
            invalidate(); persistFont(); fcClose();
        }
        fcTrigger.addEventListener('click', function (ev) { ev.stopPropagation(); if (fcPanel.style.display === 'none') fcOpen(); else fcClose(); });
        fcSearch.addEventListener('input', function () { fcRender(fcSearch.value); });
        fcSearch.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); fcSelect(fcSearch.value.trim()); } if (e.key === 'Escape') fcClose(); });
        document.addEventListener('click', function (e) { if (!fcWrap.contains(e.target)) fcClose(); });
        fcWrap.appendChild(fcTrigger); fcWrap.appendChild(fcPanel);
        r.row.appendChild(fcWrap);
        box.appendChild(r.row);
        setRefs.fontLabel = r.label; setRefs.fontSearch = fcSearch; setRefs.fontUpdate = fcUpdateLabel; setRefs.fontCustom = null;
        fcUpdateLabel();
        function persistFont() { try { GM_setValue('assp_font', settings.font); } catch (e) {} }

        // 上下偏移（按视频高度的百分比）
        r = mkRow(t('offset'));
        const offInput = document.createElement('input');
        offInput.type = 'range'; offInput.min = '-120'; offInput.max = '120'; offInput.step = '1'; offInput.value = settings.offsetPct;
        offInput.style.cssText = 'flex:1;';
        const offVal = document.createElement('span');
        offVal.style.cssText = 'color:#eee;width:52px;text-align:right;';
        offVal.textContent = (settings.offsetPct >= 0 ? '+' : '') + settings.offsetPct + '%';
        offInput.addEventListener('input', function () { settings.offsetPct = +offInput.value; offVal.textContent = (settings.offsetPct >= 0 ? '+' : '') + settings.offsetPct + '%'; invalidate(); saveSetting('assp_offsetPct', settings.offsetPct); });
        r.row.appendChild(offInput); r.row.appendChild(offVal);
        box.appendChild(r.row);
        setRefs.offsetLabel = r.label; setRefs.offVal = offVal; setRefs.offInput = offInput;

        // ASS 背景 | 跳过开头（自动跳转）—— 同排
        const chkRow = document.createElement('div');
        chkRow.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:8px;';
        function chk(labelText, checked, onChange) {
            const wrap = document.createElement('div');
            wrap.style.cssText = 'display:flex;align-items:center;gap:4px;flex:1;';
            const lab = document.createElement('span');
            lab.textContent = labelText; lab.style.cssText = 'color:#aaa;';
            const c = document.createElement('input');
            c.type = 'checkbox'; c.checked = checked; c.style.cssText = 'width:16px;height:16px;';
            c.addEventListener('change', function () { onChange(c.checked); });
            wrap.appendChild(lab); wrap.appendChild(c);
            return { wrap: wrap, lab: lab, check: c };
        }
        const bg = chk(t('assbg'), settings.assBg, function (v) { settings.assBg = v; invalidate(); saveSetting('assp_assBg', v ? '1' : '0'); });
        const jp = chk(t('autoJump'), settings.autoJump, function (v) { settings.autoJump = v; saveSetting('assp_autoJump', v ? '1' : '0'); });
        chkRow.appendChild(bg.wrap); chkRow.appendChild(jp.wrap);
        box.appendChild(chkRow);
        setRefs.assbgLabel = bg.lab; setRefs.bgCheck = bg.check; setRefs.autoJumpLabel = jp.lab; setRefs.autoJumpCheck = jp.check;

        // 字幕库地址
        r = mkRow(t('repo'));
        const repoInput = document.createElement('input');
        repoInput.type = 'text'; repoInput.value = subtitleRepo;
        repoInput.style.cssText = 'flex:1;background:#2b2b2b;color:#eee;border:0;border-radius:6px;padding:6px;';
        repoInput.addEventListener('input', function () {
            subtitleRepo = repoInput.value.trim() || DEFAULT_REPO;
            try { GM_setValue('assp_repo', subtitleRepo); } catch (e) {}
            repoCache = { etag: null, data: null, ts: 0 };   // 仓库改了 → 作废旧缓存，下次立即拉新仓库
            subTextCache = {};
        });
        r.row.appendChild(repoInput);
        box.appendChild(r.row);
        setRefs.repoLabel = r.label; setRefs.repoInput = repoInput;

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
        mainBox = document.createElement('div');
        mainBox.style.cssText = '';
        panel.appendChild(mainBox);

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
        mainBox.appendChild(langRow);

        // 加载本地字幕
        const bLoad = mkBtn('', '#1e88e5', function () { file.click(); });
        bLoad.style.width = '100%';
        mainBox.appendChild(bLoad);

        // 在线字幕按钮（放本地字幕正下方）
        const bOnline = mkBtn('', '#0d47a1', function () { openOnline(false); });
        bOnline.style.width = '100%';
        bOnline.style.marginTop = '8px';
        mainBox.appendChild(bOnline);

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
        mainBox.appendChild(rowwrap);

        // 设置按钮 + 设置面板
        const bSettings = mkBtn('', '#8e24aa', function () {
            settingOpen = !settingOpen;
            if (settingsBox) settingsBox.style.display = settingOpen ? '' : 'none';
        });
        bSettings.style.width = '100%';
        bSettings.style.marginTop = '8px';
        mainBox.appendChild(bSettings);
        settingsBox = buildSettings();
        mainBox.appendChild(settingsBox);

        // 状态
        statusEl = document.createElement('div');
        statusEl.style.cssText = 'margin-top:10px;color:#aaa;word-break:break-all;';
        mainBox.appendChild(statusEl);

        // 在线字幕列表容器
        onlineBox = document.createElement('div');
        onlineBox.style.cssText = 'display:none;';
        const oHead = document.createElement('div');
        oHead.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:8px;';
        const bBack = mkBtn(t('back'), '#616161', closeOnline);
        bBack.style.flex = '0 0 52px'; bBack.style.padding = '6px 0';
        const oTitle = document.createElement('div');
        oTitle.style.cssText = 'font-weight:700;flex:1;';
        oTitle.textContent = t('online');
        oHead.appendChild(bBack); oHead.appendChild(oTitle);
        onlineBox.appendChild(oHead);

        const oSearchRow = document.createElement('div');
        oSearchRow.style.cssText = 'display:flex;gap:6px;margin-bottom:8px;';
        onlineSearch = document.createElement('input');
        onlineSearch.type = 'text'; onlineSearch.placeholder = t('search');
        onlineSearch.style.cssText = 'flex:1;background:#2b2b2b;color:#eee;border:0;border-radius:6px;padding:6px;';
        onlineSearch.addEventListener('input', function () { renderOnlineList(false); });
        const bRefresh = mkBtn(t('refresh'), '#0d47a1', function () { openOnline(true); });
        bRefresh.style.flex = '0 0 52px'; bRefresh.style.padding = '6px 0';
        oSearchRow.appendChild(onlineSearch); oSearchRow.appendChild(bRefresh);
        onlineBox.appendChild(oSearchRow);

        onlineListEl = document.createElement('div');
        onlineListEl.style.cssText = 'max-height:200px;overflow-y:auto;';
        onlineBox.appendChild(onlineListEl);

        // 分页导航条
        const pager = document.createElement('div');
        pager.style.cssText = 'display:flex;align-items:center;gap:6px;margin-top:8px;';
        const bPrev = mkBtn(t('prev'), '#616161', function () { onlineMove(-1); });
        bPrev.style.flex = '0 0 52px'; bPrev.style.padding = '6px 0';
        const pageInfo = document.createElement('div');
        pageInfo.style.cssText = 'flex:1;color:#aaa;font-size:11px;text-align:center;';
        const bNext = mkBtn(t('next'), '#616161', function () { onlineMove(1); });
        bNext.style.flex = '0 0 52px'; bNext.style.padding = '6px 0';
        pager.appendChild(bPrev); pager.appendChild(pageInfo); pager.appendChild(bNext);
        onlineBox.appendChild(pager);

        panel.appendChild(onlineBox);

        onlineRefs.bBack = bBack; onlineRefs.oTitle = oTitle; onlineRefs.bRefresh = bRefresh;
        onlineRefs.bPrev = bPrev; onlineRefs.bNext = bNext; onlineRefs.pageInfo = pageInfo;

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
        uiRefs.bSettings = bSettings; uiRefs.bOnline = bOnline;
        onlineRefs.search = onlineSearch;
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

    // ------------------------------ 在线字幕库（GitHub 仓库）
    function repoBase() { return subtitleRepo.replace(/\/+$/, ''); }

    // 从当前 URL 提取视频 id（处理 watch?v=…&t=…、youtu.be、shorts/embed/live、B站 BV）​
    function videoIdFromUrl() {
        let m;
        m = /[?&]v=([A-Za-z0-9_-]{11})/.exec(location.href);          // youtube.com/watch?v=ID 后面带任意参数
        if (m) return m[1];
        m = /\/(?:youtu\.be\/|shorts\/|embed\/|live\/)([A-Za-z0-9_-]{11})/.exec(location.href);
        if (m) return m[1];
        m = /(BV[A-Za-z0-9]{10})/.exec(location.href);               // 哔哩哔哩 BV 号（含 URL 末尾参数）
        if (m) return m[0];
        return null;
    }

    // 拉取 index/index.json，带 ETag 缓存 + 304 条件请求（没变就 304 空回应，低压力）
    async function fetchRepoList(force) {
        const url = repoBase() + '/index/index.json';
        const now = Date.now();
        const sameRepo = repoCache.repo === subtitleRepo;
        const headers = {};
        if (!force && sameRepo && repoCache.etag) headers['If-None-Match'] = repoCache.etag;
        const fetchOpts = { headers, cache: force ? 'reload' : 'no-cache' };   // 平时 no-cache(304 复用)；刷新 reload 强拉
        const res = await fetch(url, fetchOpts);
        if (res.status === 304 && sameRepo && repoCache.data) { repoCache.ts = now; return repoCache.data; }
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        repoCache.etag = res.headers.get('ETag') || null;
        repoCache.repo = subtitleRepo;
        repoCache.data = data;
        repoCache.ts = now;
        return data;
    }

    // 已加载字幕内容的内存缓存（key=仓库|id），避免反复点同一字幕反复下载
    let subTextCache = {};
    // 拉取某个 id 的字幕文本（先试 .ass 再试 .srt）；返回文本或 null
    async function fetchSubtitleText(id) {
        const base = repoBase();
        const key = base + '|' + id;
        if (subTextCache[key]) return subTextCache[key];
        for (const ext of ['ass', 'srt']) {
            const r = await fetch(base + '/subtitles/' + encodeURIComponent(id) + '.' + ext, { cache: 'no-store' });
            if (r.ok) {
                const txt = await r.text();
                subTextCache[key] = txt;
                return txt;
            }
        }
        return null;
    }
    // 拉取并渲染到当前视频（在线字幕切换）
    async function loadSubtitleById(id) {
        const text = await fetchSubtitleText(id);
        if (!text) return false;
        applySubtitleText(text, /\[script info\]/i.test(text) ? 'ASS' : 'SRT');
        loadedSubtitleId = id;
        return true;
    }
    function applySubtitleText(text, kind) {
        events = /\[script info\]/i.test(text) ? parseASS(text) : parseSRT(text);
        currentSource = /\[script info\]/i.test(text) ? 'ASS' : 'SRT';
        active = true; ensureOverlay(); overlay.style.display = '';
        lastTime = -1;
    }

    const SUB_JUMP_BACK = 5;   // 打开视频时跳转到字幕开始前 N 秒

    // 左边点击行：切换/加载该在线字幕到当前视频（仅显示，不跳转）
    async function loadOnlineSubtitle(id, entry) {
        setStatus(t('loading'));
        try {
            const ok = await loadSubtitleById(id);
            if (ok) setStatus(t('loaded') + (entry ? (entry.title || id) : id));
            else setStatus(t('loadFail') + ' ' + id);
        } catch (e) { setStatus(t('loadFail') + ' ' + id); }
    }

    // 右边 ▶：打开该字幕对应的视频（可选：自动跳到该字幕开始时间）
    async function openOnlineVideoAtStart(id) {
        let url;
        if (!settings.autoJump) {
            url = /^BV/i.test(id)
                ? 'https://www.bilibili.com/video/' + encodeURIComponent(id)
                : 'https://www.youtube.com/watch?v=' + encodeURIComponent(id);
        } else {
            let startSec = 0;
            if (loadedSubtitleId === id && events.length) {
                startSec = (events[0].startMs || 0) / 1000;   // 已加载过，直接用第一条
            } else {
                try {
                    const text = await fetchSubtitleText(id);
                    if (text) {
                        const ev = /\[script info\]/i.test(text) ? parseASS(text) : parseSRT(text);
                        if (ev.length) startSec = (ev[0].startMs || 0) / 1000;
                    }
                } catch (e) {}
            }
            let target = Math.floor(startSec - SUB_JUMP_BACK);
            if (!isFinite(target) || target < 0) target = 0;   // 兜底：绝不为负
            url = /^BV/i.test(id)
                ? 'https://www.bilibili.com/video/' + encodeURIComponent(id) + '?t=' + target
                : 'https://www.youtube.com/watch?v=' + encodeURIComponent(id) + '&t=' + target + 's';
        }
        window.open(url, '_blank', 'noopener');
    }

    // ---------- 在线字幕列表渲染（分页）----------
    function clearOnlineList() { while (onlineListEl && onlineListEl.firstChild) onlineListEl.removeChild(onlineListEl.firstChild); }
    function getFilteredList() {
        const q = (onlineSearch ? onlineSearch.value : '').trim().toLowerCase();
        return onlineData.slice()
            .filter(function (e) { return !q || (String(e.id) + ' ' + String(e.title || '')).toLowerCase().indexOf(q) >= 0; })
            .sort(function (a, b) { return String(b.date || '') < String(a.date || '') ? -1 : 1; });
    }
    function pageTotal(list) { return Math.max(1, Math.ceil(list.length / ONLINE_PAGE)); }
    function pageText(p, tp, n) {
        return uiLang === 'zh' ? ('第 ' + p + ' / ' + tp + ' 页 · 共 ' + n + ' 条')
            : ('Page ' + p + ' / ' + tp + ' · ' + n + ' items');
    }
    function updatePager(list) {
        const tp = pageTotal(list);
        if (onlineRefs.bPrev) onlineRefs.bPrev.disabled = onlinePage <= 0;
        if (onlineRefs.bNext) onlineRefs.bNext.disabled = onlinePage >= tp - 1;
        if (onlineRefs.pageInfo) onlineRefs.pageInfo.textContent = pageText(onlinePage + 1, tp, list.length);
    }
    function appendOnlineRow(e) {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:7px 8px;margin-bottom:6px;background:#2b2b2b;border-radius:6px;cursor:pointer;';
        const body = document.createElement('div');
        body.style.cssText = 'flex:1;min-width:0;';
        const title = document.createElement('div');
        title.style.cssText = 'color:#eee;font-size:12.5px;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
        title.textContent = e.title || e.id;
        const meta = document.createElement('div');
        meta.style.cssText = 'color:#888;font-size:11px;margin-top:2px;';
        meta.textContent = e.id + ' · ' + (e.date || '');
        body.appendChild(title); body.appendChild(meta);
        const play = document.createElement('button');
        play.type = 'button';
        play.textContent = '▶';
        play.setAttribute('title', t('openTime'));
        play.style.cssText = 'flex-shrink:0;background:#0d47a1;color:#fff;border:0;border-radius:6px;padding:6px 8px;cursor:pointer;font-size:12px;';
        play.addEventListener('click', function (ev) { ev.stopPropagation(); openOnlineVideoAtStart(e.id); });
        row.appendChild(body); row.appendChild(play);
        row.addEventListener('click', function () { loadOnlineSubtitle(e.id, e); });
        onlineListEl.appendChild(row);
    }
    function renderOnlineList() {
        if (!onlineListEl) return;
        const list = getFilteredList();
        const tp = pageTotal(list);
        if (onlinePage > tp - 1) onlinePage = tp - 1;
        if (onlinePage < 0) onlinePage = 0;
        clearOnlineList();
        if (!list.length) {
            const none = document.createElement('div');
            none.style.cssText = 'color:#888;font-size:12px;padding:8px 0;';
            none.textContent = t('none');
            onlineListEl.appendChild(none);
            updatePager(list);
            return;
        }
        const start = onlinePage * ONLINE_PAGE;
        const end = Math.min(start + ONLINE_PAGE, list.length);
        for (let i = start; i < end; i++) appendOnlineRow(list[i]);
        updatePager(list);
        onlineListEl.scrollTop = 0;
    }
    function onlineMove(delta) {
        const list = getFilteredList();
        const tp = pageTotal(list);
        let p = onlinePage + delta;
        if (p < 0) p = 0;
        if (p > tp - 1) p = tp - 1;
        onlinePage = p;
        renderOnlineList();
    }

    async function openOnline(force) {
        onlineOpen = true;
        if (mainBox) mainBox.style.display = 'none';
        if (onlineBox) onlineBox.style.display = '';
        setStatus(t('loading'));
        try {
            onlineData = await fetchRepoList(force);
            onlinePage = 0;
            renderOnlineList();
            setStatus((uiLang === 'zh' ? '共 ' : 'Total ') + onlineData.length + ' 条');
        } catch (e) {
            clearOnlineList();
            const err = document.createElement('div');
            err.style.cssText = 'color:#e57373;font-size:12px;padding:6px 0;';
            err.textContent = t('loadFail');
            if (onlineListEl) onlineListEl.appendChild(err);
            setStatus(t('loadFail'));
        }
    }

    function closeOnline() {
        onlineOpen = false;
        if (onlineBox) onlineBox.style.display = 'none';
        if (mainBox) mainBox.style.display = '';
    }

    // 打开页面时按视频 id 自动匹配并加载（无匹配则不强求）
    async function autoLoadOnline() {
        if (autoLoadTried) return;
        if (!video) return;
        autoLoadTried = true;
        currentVideoId = videoIdFromUrl();
        if (!currentVideoId) return;
        try {
            const list = await fetchRepoList(false);
            const hit = list.find(function (e) { return String(e.id) === currentVideoId; });
            if (hit) {
                autoLoadedId = currentVideoId;
                await loadSubtitleById(hit.id);
                setStatus(t('loaded') + (hit.title || hit.id));
            }
        } catch (e) {}
    }

    // ------------------------------ ASS
    function parseASS(text) {
        playResW = 1920; playResH = 1080;
        const styles = {};
        let section = '';
        let fmt = null;
        const out = [];
        for (const raw of text.split(/\r?\n/)) {
            const line = raw.trim();
            if (!line) continue;
            if (/^\[.*\]$/.test(line)) { section = line.slice(1, -1); continue; }
            if (line.startsWith('PlayResX:')) { const v = parseInt(line.slice(9)); if (v > 0) playResW = v; }
            else if (line.startsWith('PlayResY:')) { const v = parseInt(line.slice(9)); if (v > 0) playResH = v; }
            else if (section === 'V4+ Styles' && line.startsWith('Style:')) {
                const s = parseStyle(line, playResH);
                if (s) styles[s.name] = s;
            } else if (section === 'Events' && line.startsWith('Format:')) {
                fmt = line.slice(7).split(',').map(function (s) { return s.trim(); });
            } else if (section === 'Events' && line.startsWith('Dialogue:')) {
                const d = parseDialogue(line, fmt, styles, playResW, playResH);
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
    function parseDialogue(line, fmt, styles, playResX, playResY) {
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
        let hasPos = false, posX = 0, posY = 0;
        let text = (iT >= 0 ? parts.slice(iT).join(',') : '').trim() || '';   // Text 是最后字段，需把含逗号的残留片段拼回
        const an = /\\an([1-9])/.exec(text);
        if (an) alignment = +an[1];
        const c1 = /\\1c&H([0-9a-fA-F]+)&/.exec(text);
        if (c1) primary = assColor(c1[1]);
        const c3 = /\\3c&H([0-9a-fA-F]+)&/.exec(text);
        if (c3) outline = assColor(c3[1]);
        const c4 = /\\4c&H([0-9a-fA-F]+)&/.exec(text);
        if (c4) backColour = c4[1];
        const pos = /\\pos\(([\d.]+),([\d.]+)\)/.exec(text);
        if (pos) { hasPos = true; posX = +pos[1]; posY = +pos[2]; }
        text = text.replace(/\\[Nn]/g, '\n').replace(/\{[^}]*\}/g, '').trim();
        return { startMs: startMs, endMs: endMs, text: text, alignment: alignment, yFrac: yFrac,
            primary: primary, outline: outline, fontSize: fontSize, fontname: fontname,
            bold: bold, outlineW: outlineW, backColour: backColour, borderStyle: borderStyle,
            hasPos: hasPos, posX: posX, posY: posY };
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
        const cr = video.getBoundingClientRect();
        const host = overlay.parentElement || document.body;
        const hr = host.getBoundingClientRect();
        // 画面实际区域（排除 letterbox 黑边）：用视频原生宽高比换算
        let l = cr.left, t = cr.top, w = cr.width, hh = cr.height;
        const vw = video.videoWidth || 0, vh = video.videoHeight || 0;
        if (vw > 0 && vh > 0) {
            const vAR = vw / vh, eAR = w / hh;
            if (vAR > eAR) {            // 视频比容器宽 → 上下黑边
                const nh = w / vAR;
                t += (hh - nh) / 2; hh = nh;
            } else if (vAR < eAR) {     // 视频比容器高 → 左右黑边
                const nw = hh * vAR;
                l += (w - nw) / 2; w = nw;
            }
        }
        if (w && hh) {
            overlay.style.left = (l - hr.left) + 'px';
            overlay.style.top = (t - hr.top) + 'px';
            overlay.style.width = w + 'px';
            overlay.style.height = hh + 'px';
        }
        if (active && events.length) render({ width: w, height: hh });
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
            if (e.hasPos) {
                const yA = e.posY / playResH * h;   // \pos：垂直锚点（按对齐方式）
                if (e.alignment <= 3) y = Math.max(0, yA - blockH);
                else if (e.alignment >= 7) y = Math.min(h - blockH, yA);
                else y = yA - blockH / 2;
                y = Math.max(0, Math.min(y, h - blockH));
            } else {
                if (e.alignment <= 3) y = Math.max(0, h * e.yFrac - blockH);
                else if (e.alignment >= 7) y = Math.min(h - blockH, h * e.yFrac);
                else y = h * e.yFrac - blockH / 2;
                y = Math.max(0, Math.min(y, h - blockH));
            }
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
            const padT = bg ? 2 : 0, padX = bg ? 6 : 0;   // 背景框的内边距；补偿到定位上以免文字位移
            let css = 'position:absolute;white-space:pre;color:' + e.primary
                + ';font-size:' + size + 'px;'
                + 'font-family:' + fam + ';'
                + 'font-weight:' + (e.bold ? 700 : 400) + ';'
                + 'line-height:' + lineH + 'px;top:' + (y - padT) + 'px;'
                + '-webkit-text-stroke:' + stroke + 'px ' + e.outline + ';'
                + 'paint-order:stroke fill;';
            if (bg) css += 'background:' + assColorA(e.backColour) + ';padding:2px 6px;border-radius:2px;';
            const offPx = settings.offsetPct / 100 * h;   // 上下偏移（按视频高度）
            let transform;
            if (e.hasPos) {
                const xA = e.posX / playResW * w;   // \pos：水平锚点（按对齐方式）
                if (mod === 2) { css += 'left:' + xA + 'px;width:max-content;'; transform = 'translate(calc(-50%), ' + offPx + 'px)'; }
                else if (mod === 1) { css += 'left:' + (xA - padX) + 'px;'; transform = 'translate(0,' + offPx + 'px)'; }
                else { css += 'right:' + (w - xA - padX) + 'px;'; transform = 'translate(0,' + offPx + 'px)'; }
            } else if (mod === 2) {
                if (bg) { css += 'left:50%;width:max-content;'; transform = 'translate(calc(-50%), ' + offPx + 'px)'; }
                else { css += 'left:0;width:100%;text-align:center;'; transform = 'translate(0,' + offPx + 'px)'; }
            } else if (mod === 1) {
                css += 'left:' + (w * 0.03 - padX) + 'px;';
                transform = 'translate(0,' + offPx + 'px)';
            } else {
                css += 'right:' + (w * 0.03 - padX) + 'px;';
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
        setPanelDisplay(panelVisible);   // 应用上次记住的面板显隐
        video = findVideo();
        ensureOverlay();
        // Alt+A: 显示/隐藏字幕面板
        window.addEventListener('keydown', function (e) {
            if (e.altKey && (e.key === 'a' || e.key === 'A')) { e.preventDefault(); togglePanel(); }
        });
        // 全屏时自动隐藏面板，退出全屏恢复（字幕本身靠父容器跟随，不受影响）
        // 事件驱动：fullscreen 事件 + resize（YouTube 全屏会改视口触发 resize），无轮询。
        function onFullscreenChange() { checkFullscreen(); }
        document.addEventListener('fullscreenchange', onFullscreenChange);
        document.addEventListener('webkitfullscreenchange', onFullscreenChange);
        window.addEventListener('resize', onFullscreenChange);
        setInterval(function () {
            if (!video || !document.body.contains(video)) video = findVideo();
            autoLoadOnline();
        }, 1500);
        requestAnimationFrame(tick);
        setStatus(video ? t('ready') : (uiLang === 'zh' ? '暂未找到 <video>，稍后自动重扫' : 'No <video> yet, re-scanning…'));
    }
    boot();
})();
