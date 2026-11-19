import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export function encrypt(key, text) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return ['v1', iv, cipher.getAuthTag(), data].map(part => typeof part === 'string' ? part : part.toString('base64url')).join('.');
}

export function decrypt(key, sealed) {
  const [version, iv, tag, data] = String(sealed).split('.');
  if (version !== 'v1' || !iv || !tag || !data) throw new Error('无法识别的加密格式');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
}
