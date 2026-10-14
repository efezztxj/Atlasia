import { CHUNK, sleep } from "./base.mjs";

/**
 * Tarayıcı sekmesi adapter'ı — Chrome DevTools Protocol (sıfır bağımlılık).
 *
 * Agent'ı tarayıcıda açık bir sekmeymiş gibi sürer: yazı kutusunu bulur,
 * gerçekten yazar (Input.insertText), gönderir (Enter ya da gönder butonu),
 * cevabın bitmesini bekler ve son cevabı okur.
 *
 * Ön koşul: Chrome/Edge/Brave'i uzaktan hata ayıklama ile açmak:
 *   macOS   : "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --remote-debugging-port=9222 --profile-directory=Default
 *   Windows : "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
 *   Linux   : google-chrome --remote-debugging-port=9222
 * Agent sekmeleri bu tarayıcıda açık olmalı.
 */
export function createCdpAdapter() {
  return {
    kind: "cdp",
    async ready(agent) {
      const cdp = agent.cdp || {};
      try {
        const target = await findTarget(cdp);
        if (!target) return { ok: false, detail: `Sekme bulunamadı (${cdp.match?.url || cdp.match?.title || "?"}). Chrome --remote-debugging-port=${port(cdp)} ile açık mı?` };
        return { ok: true, detail: `sekme: ${target.title.slice(0, 60)}` };
      } catch (err) {
        return { ok: false, detail: `CDP bağlantısı yok: ${err.message}` };
      }
    },

    async send({ agent, text, onEvent, shouldStop }) {
      const cdp = agent.cdp || {};
      const idleMs = cdp.idleMs ?? 3000;
      const target = await findTarget(cdp);
      if (!target) throw new Error("Hedef sekme bulunamadı. Chrome'u --remote-debugging-port ile açtın mı?");

      const client = await CDPClient.connect(target.webSocketDebuggerUrl);
      try {
        await client.cmd("Runtime.enable");
        const inputSel = cdp.input || 'textarea, [contenteditable="true"], div[role="textbox"], input[type="text"]';

        // 1) Yazı kutusunu bul + odakla
        const found = await evalValue(client, `(() => {
          const sels = ${JSON.stringify(inputSel)}.split(',').map(s => s.trim());
          const nodes = sels.flatMap(s => Array.from(document.querySelectorAll(s)));
          const el = nodes.filter(n => n.offsetParent !== null || n.getClientRects().length).pop();
          if (!el) return { ok: false };
          el.scrollIntoView({ block: 'center' });
          el.focus();
          return { ok: true, tag: el.tagName.toLowerCase(), editable: el.isContentEditable };
        })()`);
        if (!found?.ok) throw new Error("Yazı kutusu bulunamadı (cdp.input seçicisini ayarla).");

        // 2) Kutuyu temizle (Ctrl/Cmd+A) ve yaz
        onEvent({ type: "phase", phase: "typing" });
        await client.cmd("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "a", code: "KeyA", windowsVirtualKeyCode: 65, modifiers: process.platform === "darwin" ? 4 : 2 });
        await client.cmd("Input.dispatchKeyEvent", { type: "keyUp", key: "a", code: "KeyA", windowsVirtualKeyCode: 65, modifiers: process.platform === "darwin" ? 4 : 2 });
        onEvent({ type: "clear" });

        let typed = "";
        for (const piece of CHUNK(text, 900)) {
          if (shouldStop?.()) break;
          await client.cmd("Input.insertText", { text: piece });
          typed += piece;
          onEvent({ type: "typed", text: typed });
          await sleep(agent.typing?.delayMs ?? 40);
        }

        const written = await evalValue(client, `(() => {
          const sels = ${JSON.stringify(inputSel)}.split(',').map(s => s.trim());
          const nodes = sels.flatMap(s => Array.from(document.querySelectorAll(s)));
          const el = nodes.filter(n => n.offsetParent !== null || n.getClientRects().length).pop();
          if (!el) return "";
          return (el.value ?? el.innerText ?? "").slice(0, 4000);
        })()`);
        if (!written || written.trim().length < Math.min(20, text.trim().length)) {
          throw new Error("Metin yazı kutusuna girmedi. Seçiciyi (cdp.input) kontrol et.");
        }

        // 3) Gönder
        const before = await readReply(client, cdp);
        if (cdp.submit === "button" && cdp.send) {
          await evalValue(client, `(() => {
            const el = document.querySelector(${JSON.stringify(cdp.send)});
            if (!el) return false; el.click(); return true;
          })()`);
        } else {
          for (const type of ["rawKeyDown", "char", "keyUp"]) {
            await client.cmd("Input.dispatchKeyEvent", { type, key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: type === "char" ? "\r" : undefined });
          }
        }
        onEvent({ type: "phase", phase: "submitted" });

        // 4) Cevabın bitmesini bekle
        let last = before;
        let lastChange = Date.now();
        const started = Date.now();
        const timeoutMs = cdp.timeoutMs ?? 600000;
        while (true) {
          if (shouldStop?.()) throw new Error("Kullanıcı tarafından durduruldu.");
          if (Date.now() - started > timeoutMs) throw new Error("Agent zaman aşımına uğradı.");
          await sleep(700);

          const busy = cdp.busy ? await evalValue(client, `document.querySelectorAll(${JSON.stringify(cdp.busy)}).length`) : null;
          const now = await readReply(client, cdp);

          if (now !== last) { last = now; lastChange = Date.now(); onEvent({ type: "reply", text: now }); continue; }
          const still = Date.now() - lastChange >= idleMs;
          const busyNow = busy !== null ? busy > 0 : false;
          const changedSinceSend = now && now !== before;
          if (still && !busyNow && changedSinceSend) break;
          if (still && cdp.reply && !changedSinceSend && Date.now() - started > 15000) {
            onEvent({ type: "phase", phase: "no-capture" });
            break;
          }
        }
        onEvent({ type: "phase", phase: "idle" });
        return { reply: last || "", captured: Boolean(last) };
      } finally {
        client.close();
      }
    },

    async release() {},
  };
}

async function readReply(client, cdp) {
  const sel = cdp.reply;
  if (!sel) {
    return evalValue(client, `(() => {
      const t = document.body.innerText || "";
      return t.slice(-4000);
    })()`);
  }
  return evalValue(client, `(() => {
    const all = Array.from(document.querySelectorAll(${JSON.stringify(sel)}));
    const el = all[all.length - 1];
    if (!el) return "";
    return (el.innerText || el.textContent || "").slice(-6000);
  })()`);
}

async function evalValue(client, expression) {
  const res = await client.cmd("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (res.exceptionDetails) throw new Error(res.exceptionDetails.text || "Runtime.evaluate hatası");
  return res.result?.value;
}

const port = (cdp) => {
  try {
    return new URL(cdp.endpoint || "http://127.0.0.1:9222").port || 9222;
  } catch {
    return 9222;
  }
};

export async function listTabs(endpointUrl = "http://127.0.0.1:9222") {
  const endpoint = endpointUrl.replace(/\/$/, "");
  const res = await fetch(`${endpoint}/json/list`, { signal: AbortSignal.timeout(4000) });
  if (!res.ok) throw new Error(`CDP ${res.status}`);
  const targets = await res.json();
  return targets
    .filter((t) => t.type === "page" && t.webSocketDebuggerUrl)
    .map((t) => ({ id: t.id, title: (t.title || "").slice(0, 90), url: (t.url || "").slice(0, 160) }));
}

async function findTarget(cdp) {
  const endpoint = (cdp.endpoint || "http://127.0.0.1:9222").replace(/\/$/, "");
  const res = await fetch(`${endpoint}/json/list`, { signal: AbortSignal.timeout(4000) });
  if (!res.ok) throw new Error(`CDP ${res.status}`);
  const targets = await res.json();
  const pages = targets.filter((t) => t.type === "page" && t.webSocketDebuggerUrl);
  const match = cdp.match || {};
  const score = (t) => {
    if (match.url && t.url.includes(match.url)) return 3;
    if (match.title && t.title.includes(match.title)) return 3;
    if (match.id && t.id === match.id) return 4;
    if (!match.url && !match.title && !match.id) return 1;
    return 0;
  };
  const ranked = pages.map((t) => ({ t, s: score(t) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s);
  if (match.index != null) return ranked[Number(match.index)]?.t || null;
  return ranked[0]?.t || null;
}

class CDPClient {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
  }

  static async connect(url, timeoutMs = 8000) {
    if (typeof WebSocket === "undefined") throw new Error("Bu Node sürümü WebSocket desteklemiyor (Node 22+ gerekir).");
    const ws = new WebSocket(url);
    const client = new CDPClient(ws);
    ws.addEventListener("message", (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      const p = client.pending.get(msg.id);
      if (!p) return;
      client.pending.delete(msg.id);
      if (msg.error) p.reject(new Error(msg.error.message));
      else p.resolve(msg.result ?? {});
    });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("CDP soketi zaman aşımı")), timeoutMs);
      ws.addEventListener("open", () => {
        clearTimeout(timer);
        resolve();
      });
      ws.addEventListener("error", () => {
        clearTimeout(timer);
        reject(new Error("CDP soketine bağlanılamadı"));
      });
    });
    return client;
  }

  cmd(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${method} zaman aşımı`));
      }, 30000);
      this.pending.set(id, {
        resolve: (r) => {
          clearTimeout(timer);
          resolve(r);
        },
        reject: (e) => {
          clearTimeout(timer);
          reject(e);
        },
      });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    try {
      this.ws.close();
    } catch {
      /* yut */
    }
  }
}
