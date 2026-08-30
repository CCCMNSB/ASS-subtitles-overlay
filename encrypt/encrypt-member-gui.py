#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
encrypt-member-gui.py  — 会员字幕加密工具（可视化 + 命令行两用）
把 .ass 加密成 .enc，key = SHA-256(该视频自动字幕文本)（与 ass-subtitle-overlay 插件完全一致）。
解密的插件端会自动钩住播放器的 /get_transcript，用同一部视频的自动字幕算同一把 key 去 AES-256-GCM 解。

用法：
  GUI:    python encrypt-member-gui.py
  命令行: python encrypt-member-gui.py <caption_body.json|txt> <input.ass> <output.ass.enc>

依赖：pip install cryptography     （tkinter 通常 Python 自带）
"""
import sys, re, os, hashlib, secrets, tkinter as tk
from tkinter import filedialog, messagebox
from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def _set_dpi_awareness():
    """Windows 高 DPI 下让 tkinter 不模糊、不裁剪。"""
    try:
        import ctypes
        if hasattr(ctypes, "windll"):
            ctypes.windll.shcore.SetProcessDpiAwareness(1)
    except Exception:
        try:
            import ctypes
            ctypes.windll.user32.SetProcessDPIAware()
        except Exception:
            pass


_set_dpi_awareness()


def canon_caption(text: str) -> str:
    """与插件 canonCaptionText 一致：只取 get_transcript 里的 "text":"..." 拼接，避免元数据差异导致 key 不稳。"""
    found = re.findall(r'"text":"((?:[^"\\]|\\.)*)"', text)
    if found:
        return "\n".join(found)
    return text


def derive_key(caption_text: str) -> bytes:
    return hashlib.sha256(canon_caption(caption_text).encode("utf-8")).digest()  # 32B


def encrypt(caption_text: str, plain: bytes) -> bytes:
    key = derive_key(caption_text)
    nonce = secrets.token_bytes(12)
    # AESGCM.encrypt 返回 ciphertext||tag(16)，与插件 .enc = nonce(12)+ciphertext||tag 一致
    ct = AESGCM(key).encrypt(nonce, plain, None)
    return nonce + ct


def run_cli(cap_path: str, in_path: str, out_path: str):
    cap_text = open(cap_path, "r", encoding="utf-8", errors="replace").read()
    plain = open(in_path, "rb").read()
    data = encrypt(cap_text, plain)
    open(out_path, "wb").write(data)
    print("OK: %s  (%d bytes -> %d bytes)" % (out_path, len(plain), len(data)))
    print("SHA-256(canon caption) = %s" % derive_key(cap_text).hex())


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("会员字幕加密工具")
        self.minsize(640, 260)
        self.columnconfigure(0, weight=1)
        tk.Label(self, text="① 自动字幕文件 = 钥匙 (caption_body_*.json / 文本)").grid(row=0, sticky="w", padx=10, pady=(12, 2))
        self.cap = self._row(1, "保存的自动字幕文件", self._ask_open)
        tk.Label(self, text="要加密的字幕 (.ass / .srt)").grid(row=2, sticky="w", padx=10, pady=2)
        self.ass = self._row(3, "原始字幕文件", self._pick_ass)
        tk.Label(self, text="输出 .enc 文件（选原字幕后自动填好，可改）").grid(row=4, sticky="w", padx=10, pady=2)
        self.out = self._row(5, ".ass.enc", self._ask_save)
        self.btn = tk.Button(self, text="加密并导出", command=self.do, bg="#4c8")
        self.btn.grid(row=6, column=0, columnspan=2, pady=14, ipadx=30, ipady=4)
        self.status = tk.Label(self, text="", fg="#049", anchor="w", justify="left")
        self.status.grid(row=7, column=0, columnspan=2, sticky="ew", padx=10)

    def _row(self, row, text, handler):
        f = tk.Frame(self); f.grid(row=row, column=0, sticky="ew", padx=10, pady=3)
        f.columnconfigure(0, weight=1)
        e = tk.Entry(f, width=52); e.grid(row=0, column=0, sticky="ew")
        tk.Button(f, text=text, command=lambda: handler(e)).grid(row=0, column=1, padx=(6, 0))
        return e

    def _ask_open(self, entry, title="选择文件"):
        p = filedialog.askopenfilename(title=title)
        if p: entry.delete(0, tk.END); entry.insert(0, p)

    def _pick_ass(self, entry):
        p = filedialog.askopenfilename(title="选择要加密的字幕", filetypes=[("字幕", "*.ass *.srt")])
        if not p: return
        entry.delete(0, tk.END); entry.insert(0, p)
        # 自动填好输出路径：同目录 + .enc
        self.out.delete(0, tk.END)
        self.out.insert(0, os.path.splitext(p)[0] + ".enc")

    def _ask_save(self, entry):
        p = filedialog.asksaveasfilename(defaultextension=".enc", title="保存为")
        if p: entry.delete(0, tk.END); entry.insert(0, p)

    def do(self):
        cap, a, o = self.cap.get().strip(), self.ass.get().strip(), self.out.get().strip()
        if not cap or not os.path.isfile(cap):
            return self.status.config(text="错误：自动字幕文件不存在，请先选（第1框）", fg="#c00")
        if not a or not os.path.isfile(a):
            return self.status.config(text="错误：字幕文件不存在，请先选（第2框）", fg="#c00")
        if not o:
            o = os.path.splitext(a)[0] + ".enc"
        try:
            cap_text = open(cap, "r", encoding="utf-8", errors="replace").read()
            plain = open(a, "rb").read()
            data = encrypt(cap_text, plain)
            open(o, "wb").write(data)
            self.status.config(text="成功：已写出 %s（%d -> %d 字节）" % (os.path.basename(o), len(plain), len(data)), fg="#049")
            messagebox.showinfo("完成", "已生成加密字幕：\n" + o)
        except Exception as ex:
            self.status.config(text="出错：" + str(ex), fg="#c00")


if __name__ == "__main__":
    try:
        if len(sys.argv) == 4:
            run_cli(sys.argv[1], sys.argv[2], sys.argv[3])
        else:
            App().mainloop()
    except Exception as ex:
        try:
            import tkinter as _t
            _t.messagebox.showerror("出错", "会员字幕加密工具启动失败：\n%s" % ex)
        except Exception:
            import traceback; traceback.print_exc()
