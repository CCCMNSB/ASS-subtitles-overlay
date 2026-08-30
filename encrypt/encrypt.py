#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
会员字幕加密脚本（仅字符版）
key = SHA-256(该视频自动字幕的"真实文本"字符序列)

与 ass-subtitle-overlay 插件 / PipePipe app 端保持一致：
key 源 = 自动字幕的真实文本（protobuf 的 events[].segs[].utf8，或 srt3 的 <p> 内容）。
三方都用同一份真实文本 -> 算出同一把 key，互相可解密。

用法：
  命令行:  python encrypt.py <caption_body.json|txt> <input.ass> <output.ass.enc>
  (也可双击打开 GUI)

依赖：pip install cryptography
"""
import sys, re, os, json, hashlib, secrets, tkinter as tk
from tkinter import filedialog, messagebox
from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def canon_caption(text: str) -> str:
    """提取字幕的'真实文本'字符（每段一行，\\n 连接），与插件端/app 端一致。

    ① protobuf：events[].segs[].utf8 拼成一段，所有段 join('\\n')
    ② srt3 TTML：>内容< 段
    ③ 兼容旧文件 get_transcript："text":"..." 段（解码 \\uXXXX）
    """
    # ① protobuf（YouTube timedtext json）
    if '"wireMagic"' in text:
        try:
            data = json.loads(text)
        except Exception:
            pass
        else:
            segs = []
            for ev in data.get("events", []) or []:
                s = "".join((seg.get("utf8", "") for seg in (ev.get("segs") or [])))
                if s.strip():
                    segs.append(s)
            if segs:
                return "\n".join(segs)
    # ② srt3 TTML：>内容<
    found_ttml = re.findall(r">([^<>]{1,})<", text)
    ttml_segs = [x.strip() for x in found_ttml if x.strip()]
    if ttml_segs:
        return "\n".join(ttml_segs)
    # ③ 兼容旧 get_transcript："text":"..."
    found = re.findall(r'"text":"((?:[^"\\]|\\.)*)"', text)
    if found:
        dec = []
        for s in found:
            try:
                dec.append(json.loads('"' + s + '"'))
            except Exception:
                dec.append(s)
        return "\n".join(dec)
    return text


def derive_key(caption_text: str) -> bytes:
    return hashlib.sha256(canon_caption(caption_text).encode("utf-8")).digest()  # 32B


def encrypt(caption_text: str, plain: bytes) -> bytes:
    key = derive_key(caption_text)
    nonce = secrets.token_bytes(12)
    ct = AESGCM(key).encrypt(nonce, plain, None)   # ciphertext||tag(16)
    return nonce + ct


def run_cli(cap_path: str, in_path: str, out_path: str):
    cap_text = open(cap_path, "r", encoding="utf-8", errors="replace").read()
    plain = open(in_path, "rb").read()
    data = encrypt(cap_text, plain)
    open(out_path, "wb").write(data)
    print("OK: %s  (%d bytes -> %d bytes)" % (out_path, len(plain), len(data)))
    canon = canon_caption(cap_text)
    print("canon_len=%d" % len(canon))
    print("SHA-256=%s" % derive_key(cap_text).hex())


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("会员字幕加密工具")
        self.minsize(680, 280)
        self.columnconfigure(0, weight=1)
        tk.Label(self, text="① 自动字幕文件 = 钥匙 (caption_body_*.json / 文本 / srt3)").grid(row=0, sticky="w", padx=10, pady=(12, 2))
        self.cap = self._row(1, "自动字幕文件", self._ask_open)
        tk.Label(self, text="② 要加密的字幕 (.ass / .srt)").grid(row=2, sticky="w", padx=10, pady=2)
        self.ass = self._row(3, "原始字幕文件", self._pick_ass)
        tk.Label(self, text="③ 输出 .enc 文件（选原字幕后自动填好，可改）").grid(row=4, sticky="w", padx=10, pady=2)
        self.out = self._row(5, ".ass.enc", self._ask_save)
        self.btn = tk.Button(self, text="加密并导出", command=self.do, bg="#4c8")
        self.btn.grid(row=6, column=0, columnspan=2, pady=14, ipadx=30, ipady=4)
        self.status = tk.Label(self, text="", fg="#049", anchor="w", justify="left")
        self.status.grid(row=7, column=0, columnspan=2, sticky="ew", padx=10)

    def _row(self, row, text, handler):
        f = tk.Frame(self); f.grid(row=row, column=0, sticky="ew", padx=10, pady=3)
        f.columnconfigure(0, weight=1)
        e = tk.Entry(f, width=54); e.grid(row=0, column=0, sticky="ew")
        tk.Button(f, text=text, command=lambda: handler(e)).grid(row=0, column=1, padx=(6, 0))
        return e

    def _ask_open(self, entry, title="选择字幕源文件"):
        p = filedialog.askopenfilename(title=title)
        if p: entry.delete(0, tk.END); entry.insert(0, p)

    def _pick_ass(self, entry):
        p = filedialog.askopenfilename(title="选择要加密的字幕", filetypes=[("字幕", "*.ass *.srt")])
        if not p: return
        entry.delete(0, tk.END); entry.insert(0, p)
        self.out.delete(0, tk.END)
        self.out.insert(0, os.path.splitext(p)[0] + ".enc")

    def _ask_save(self, entry):
        p = filedialog.asksaveasfilename(defaultextension=".enc", title="保存为")
        if p: entry.delete(0, tk.END); entry.insert(0, p)

    def do(self):
        cap, a, o = self.cap.get().strip(), self.ass.get().strip(), self.out.get().strip()
        if not cap or not os.path.isfile(cap):
            return self.status.config(text="错误：字幕源文件不存在，请先选（第1框）", fg="#c00")
        if not a or not os.path.isfile(a):
            return self.status.config(text="错误：字幕文件不存在，请先选（第2框）", fg="#c00")
        if not o:
            o = os.path.splitext(a)[0] + ".enc"
        try:
            cap_text = open(cap, "r", encoding="utf-8", errors="replace").read()
            plain = open(a, "rb").read()
            data = encrypt(cap_text, plain)
            open(o, "wb").write(data)
            canon = canon_caption(cap_text)
            k = derive_key(cap_text).hex()
            self.status.config(
                text="成功：已写出 %s（%d -> %d 字节）\ncanon_len=%d  SHA-256=%s"
                     % (os.path.basename(o), len(plain), len(data), len(canon), k), fg="#049")
            messagebox.showinfo("完成", "已生成加密字幕：\n%s\n\nkey(SHA-256)=%s" % (o, k))
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
            _t.messagebox.showerror("出错", "加密工具启动失败：\n%s" % ex)
        except Exception:
            import traceback; traceback.print_exc()
