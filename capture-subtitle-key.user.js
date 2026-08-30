// ==UserScript==
// @name         抓取会员视频自动字幕钥匙（面板版）
// @namespace    CCCMNSB
// @version      1.2
// @description  会员视频页浮动面板：点"下载钥匙"把播放器抓到的自动字幕(get_transcript)存成 caption_body_<id>.json（供 encrypt-member 加密工具用）。需在会员登录的浏览器里有效。不自动下载、无 yt-dlp 逻辑。
// @author       CCCMNSB
// @match        https://www.youtube.com/*
// @run-at       document-idle
// @grant        unsafeWindow
// @connect      youtube.com
// @connect      www.youtube.com
// ==/UserScript==

(function () {
    'use strict';

    function videoId() {
        const m = location.href.match(/[?&]v=([A-Za-z0-9_-]{11})/);
        return m ? m[1] : 'video';
    }
    function toast(msg) {
        let t = document.getElementById('subkey-toast');
        if (!t) {
            t = document.createElement('div');
            t.id = 'subkey-toast';
            t.style.cssText = 'position:fixed;top:70px;left:50%;transform:translateX(-50%);z-index:99999;background:rgba(0,0,0,.85);color:#fff;padding:8px 14px;border-radius:8px;font:13px/1.4 sans-serif;';
            document.documentElement.appendChild(t);
        }
        t.textContent = msg; t.style.display = 'block';
        clearTimeout(t.__h);
        t.__h = setTimeout(() => { t.style.display = 'none'; }, 4200);
    }

    let captured = false, capturedText = '';

    function markCaptured(t) {
        if (!t || !t.length) return;
        captured = true; capturedText = t;
        const st = document.getElementById('subkey-status');
        if (st) st.textContent = '已抓到自动字幕：' + t.length + ' 字节';
    }

    // ---- hook fetch + XHR（只记录，不自动下载）----
    const match = u => /\/api\/timedtext|\/youtubei\/v1\/get_transcript|timedtext|get_transcript/i.test(String(u));
    const ufw = unsafeWindow;
    const of = ufw.fetch;
    ufw.fetch = function (...a) {
        const url = (a[0] && a[0].url) || String(a[0] || '');
        if (match(url)) return of.apply(this, a).then(r => r.clone().text().then(t => { markCaptured(t); return r; }));
        return of.apply(this, a);
    };
    const OX = ufw.XMLHttpRequest;
    if (OX && OX.prototype) {
        const oOpen = OX.prototype.open;
        OX.prototype.open = function (mmm, u) { this.__u = u; return oOpen.apply(this, arguments); };
        const oSend = OX.prototype.send;
        OX.prototype.send = function (...a) {
            this.addEventListener('load', () => {
                try { if (match(String(this.__u || ''))) markCaptured(this.responseText || ''); } catch (e) { /* ignore */ }
            });
            return oSend.apply(this, a);
        };
    }

    // ---- 浮动面板 ----
    function mkBtn(label, fn, color) {
        const b = document.createElement('button');
        b.textContent = label;
        b.style.cssText = 'display:block;width:100%;margin-top:6px;padding:7px 8px;border:0;border-radius:7px;'
            + 'background:' + (color || '#3a86ff') + ';color:#fff;cursor:pointer;font-size:12px;text-align:left;';
        b.onclick = fn;
        return b;
    }

    function buildPanel() {
        const p = document.createElement('div');
        p.style.cssText = 'position:fixed;top:12px;right:12px;z-index:99999;background:#20263a;color:#fff;border-radius:10px;'
            + 'padding:10px 12px;font:13px/1.5 sans-serif;width:236px;box-shadow:0 4px 14px rgba(0,0,0,.35);';
        const title = document.createElement('div');
        title.style.cssText = 'font-weight:700;margin-bottom:6px;';
        title.textContent = '会员字幕助手';
        const hide = mkBtn('×', () => { p.style.display = 'none'; }, '#555');
        hide.style.cssText += ';width:auto;float:right;padding:2px 8px;margin-top:0;';
        title.appendChild(hide);
        const status = document.createElement('div');
        status.id = 'subkey-status';
        status.style.cssText = 'font-size:12px;color:#9fe;margin-bottom:8px;word-break:break-all;';
        status.textContent = '播放视频后自动抓到字幕（点下方"下载钥匙"保存）';
        p.appendChild(title); p.appendChild(status);
        p.appendChild(mkBtn('下载钥匙 → caption_body_' + videoId() + '.json', () => {
            if (!captured) return toast('还没抓到自动字幕，先播放视频');
            const blob = new Blob([capturedText], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob); a.download = 'caption_body_' + videoId() + '.json'; a.click();
            URL.revokeObjectURL(a.href);
            toast('已下载钥匙 caption_body_' + videoId() + '.json');
        }));
        (document.body || document.documentElement).appendChild(p);
    }

    buildPanel();
})();
