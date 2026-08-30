#!/usr/bin/env node
// encrypt-member.js  — 把 .ass 加密成 .enc（供 ass-subtitle-overlay 会员字幕用）
// 密钥 = SHA-256(该视频自动字幕的原始 timedtext 响应体字节)
// .enc = nonce(12) + ciphertext + tag(16)   （与 WebCrypto AES-GCM 一致）
// 用法: node encrypt-member.js <captionBody> <input.ass> <output.enc>
'use strict';
const fs = require('fs');
const crypto = require('crypto');

const [, , capPath, inPath, outPath] = process.argv;
if (!capPath || !inPath || !outPath) {
  console.error('usage: node encrypt-member.js <captionBody> <input.ass> <output.enc>');
  process.exit(2);
}

const key = makeKey(fs.readFileSync(capPath));
const plain = fs.readFileSync(inPath);
const nonce = crypto.randomBytes(12);
const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce);
const ct = Buffer.concat([cipher.update(plain), cipher.final()]);
const tag = cipher.getAuthTag(); // 16B

fs.writeFileSync(outPath, Buffer.concat([nonce, ct, tag]));
console.log('OK: ' + outPath + '  (' + plain.length + 'B -> ' + (nonce.length + ct.length + tag.length) + 'B)');
console.log('SHA-256(canon caption) = ' + key.toString('hex'));

// 与插件 canonCaptionText 一致：只取 get_transcript 里的 "text":"..." 拼接，避免元数据差异导致 key 不稳。
function makeKey(capBytes) {
  const s = capBytes.toString('utf8');
  const m = s.match(/"text":"((?:[^"\\]|\\.)*)"/g);
  const canon = (m && m.length) ? m.map(x => x.replace(/^"text":"/, '').replace(/"$/, '').replace(/\\"/g, '"')).join('\n') : s;
  return crypto.createHash('sha256').update(canon, 'utf8').digest();
}
