import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { sleep } from "./base.mjs";

const run = promisify(execFile);

/**
 * Pencere (masaüstü uygulaması / tarayıcı) adapter'ı.
 * Metni panoya koyar, hedef pencereyi öne alır, yapıştırır ve Enter'a basar.
 * Cevap yakalama yoktur: bu modda devirler varsayılan olarak onay bekler,
 * kullanıcı cevabı "panodan al" ile veya elle onaylar.
 *
 * Gerekli araçlar:
 *   macOS   : yok (osascript + pbcopy yerleşik)
 *   Windows : yok (PowerShell yerleşik)
 *   Linux   : xdotool + xclip (X11)  |  ydotool + wl-clipboard (Wayland)
 */
export function createOsAdapter() {
  return {
    kind: "os",
    async ready(agent) {
      const cfg = agent.os || {};
      const platform = process.platform;
      if (platform === "linux") {
        const x11 = await has("xdotool");
        const wl = await has("ydotool");
        if (!x11 && !wl) return { ok: false, detail: "xdotool (X11) ya da ydotool (Wayland) kurulu değil." };
        if (cfg.window && x11) {
          const found = await run("xdotool", ["search", "--name", cfg.window]).then((r) => r.stdout.trim()).catch(() => "");
          return found ? { ok: true, detail: `pencere bulundu: ${cfg.window}` } : { ok: false, detail: `Pencere bulunamadı: ${cfg.window}` };
        }
        return { ok: true, detail: x11 ? "xdotool hazır" : "ydotool hazır" };
      }
      if (platform === "darwin") return { ok: true, detail: "osascript hazır (Erişilebilirlik izni gerekir)" };
      if (platform === "win32") return { ok: true, detail: "PowerShell hazır" };
      return { ok: false, detail: `Desteklenmeyen platform: ${platform}` };
    },

    async send({ agent, text, onEvent }) {
      const cfg = agent.os || {};
      onEvent({ type: "phase", phase: "typing" });
      await activate(cfg);
      onEvent({ type: "clear" });
      onEvent({ type: "typed", text });
      await setClipboard(text, cfg);
      onEvent({ type: "phase", phase: "submitted" });
      await sendKeys(cfg.paste ?? "paste", cfg);
      await sleep(250);
      if ((cfg.submit ?? "enter") === "enter") await sendKeys("enter", cfg);
      onEvent({ type: "phase", phase: "sent-manual" });
      return { reply: "", captured: false };
    },

    async release() {},

    /** Kullanıcı cevabı kopyalayıp bu butona bastığında panoyu okur. */
    async readClipboard(agent) {
      const cfg = agent?.os || {};
      if (process.platform === "darwin") return (await run("pbpaste")).stdout;
      if (process.platform === "win32") return (await run("powershell", ["-NoProfile", "-Command", "Get-Clipboard -Raw"])).stdout;
      if (await has("wl-paste")) return (await run("wl-paste", ["-n"])).stdout;
      if (await has("xclip")) return (await run("xclip", ["-selection", "clipboard", "-o"])).stdout;
      throw new Error("Pano okunamadı (wl-paste/xclip kurulu değil).");
    },
  };
}

async function has(bin) {
  try {
    await run(process.platform === "win32" ? "where" : "which", [bin]);
    return true;
  } catch {
    return false;
  }
}

async function activate(cfg) {
  const platform = process.platform;
  if (!cfg.window) return; // pencere verilmediyse kullanıcı önce pencereyi seçmiş olmalı
  if (platform === "linux") {
    if (await has("xdotool")) {
      const { stdout } = await run("xdotool", ["search", "--name", cfg.window]);
      const id = stdout.trim().split("\n").pop();
      if (!id) throw new Error(`Pencere bulunamadı: ${cfg.window}`);
      await run("xdotool", ["windowactivate", "--sync", id]);
      await sleep(200);
      return;
    }
    throw new Error("Wayland'de pencere aktivasyonu için pencereyi elle öne al (window ayarını boş bırak).");
  }
  if (platform === "darwin") {
    await run("osascript", ["-e", `tell application "System Events" to set frontmost of (first process whose name contains "${cfg.window}") to true`]);
    await sleep(250);
    return;
  }
  if (platform === "win32") {
    await run("powershell", [
      "-NoProfile",
      "-Command",
      `$p = Get-Process | Where-Object { $_.MainWindowTitle -like '*${cfg.window}*' } | Select-Object -First 1; if ($p) { Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.Interaction]::AppActivate($p.Id) }`,
    ]);
    await sleep(250);
  }
}

async function setClipboard(text, cfg) {
  const platform = process.platform;
  if (platform === "darwin") {
    await pipe("pbcopy", [], text);
    return;
  }
  if (platform === "win32") {
    await pipe("powershell", ["-NoProfile", "-Command", "$input | Set-Clipboard"], text);
    return;
  }
  if (await has("wl-copy")) return pipe("wl-copy", [], text);
  if (await has("xclip")) return pipe("xclip", ["-selection", "clipboard"], text);
  throw new Error("Pano aracı yok (Linux: wl-clipboard ya da xclip kur).");
}

async function sendKeys(action, cfg) {
  const platform = process.platform;
  const map = {
    paste: { darwin: "keystroke \"v\" using command down", win: "^v", linux: "ctrl+v" },
    enter: { darwin: "key code 36", win: "{ENTER}", linux: "Return" },
    tab: { darwin: "key code 48", win: "{TAB}", linux: "Tab" },
  };
  const spec = map[action] || map.enter;
  if (platform === "darwin") {
    await run("osascript", ["-e", `tell application "System Events" to ${spec.darwin}`]);
    return;
  }
  if (platform === "win32") {
    await run("powershell", ["-NoProfile", "-Command", `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${spec.win}')`]);
    return;
  }
  if (await has("xdotool")) {
    await run("xdotool", ["key", "--clearmodifiers", spec.linux]);
    return;
  }
  if (await has("ydotool")) {
    const key = action === "enter" ? "28:1 28:0" : "29:1 47:1 47:0 29:0"; // Enter | Ctrl+V
    for (const token of key.split(" ")) {
      const [code, value] = token.split(":");
      await run("ydotool", ["key", `${code}:${value}`]);
    }
    return;
  }
  throw new Error("Tuş gönderilemedi (xdotool/ydotool yok).");
}

function pipe(cmd, args, input) {
  return new Promise((resolve, reject) => {
    const child = execFile(cmd, args, (err) => (err ? reject(err) : resolve()));
    child.stdin.end(input);
  });
}
