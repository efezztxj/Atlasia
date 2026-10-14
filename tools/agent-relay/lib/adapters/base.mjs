/**
 * Adapter sözleşmesi:
 *   ready()                      -> { ok, detail }      (bağlantı/araç kontrolü)
 *   send({ agent, text, onEvent }) -> { reply, captured }  (yazı kutusuna yazar + gönderir + cevabı yakalar)
 *   release({ agent })           -> void                (devral/iptal)
 */
export const CHUNK = (text, size) => {
  const out = [];
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
  return out;
};

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
