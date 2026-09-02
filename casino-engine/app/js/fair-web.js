// Проверяемая честность в браузере: тот же HMAC-SHA256, что и в src/fair.js, но на WebCrypto.
// Нужна демо-режиму без сервера и странице проверки.
const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

export const newServerSeed = () => hex(crypto.getRandomValues(new Uint8Array(32)));
export const newClientSeed = () => hex(crypto.getRandomValues(new Uint8Array(8)));
export const hashSeed = async (seed) => hex(await crypto.subtle.digest('SHA-256', enc.encode(seed)));

export async function rollFloats(serverSeed, clientSeed, nonce, count = 1) {
  const key = await crypto.subtle.importKey('raw', enc.encode(serverSeed), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const out = [];
  let cursor = 0;
  while (out.length < count) {
    const buf = new DataView(await crypto.subtle.sign('HMAC', key, enc.encode(`${clientSeed}:${nonce}:${cursor}`)));
    for (let i = 0; i + 4 <= buf.byteLength && out.length < count; i += 4) out.push(buf.getUint32(i) / 2 ** 32);
    cursor += 1;
  }
  return out;
}
