#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRelay, locateAssets } from "../server.mjs";

const HERE = (() => {
  if (typeof __dirname !== "undefined") return __dirname;
  try {
    return path.dirname(fileURLToPath(import.meta.url));
  } catch {
    return process.cwd();
  }
})();

const ROOT = path.resolve(HERE, "..");
const [cmd, ...rest] = process.argv.slice(2);

const BASE = process.env.RELAY_URL || "http://127.0.0.1:8787";
const NO_BROWSER = process.env.RELAY_NO_BROWSER === "1" || rest.includes("--no-browser");

const help = `
Agent Relay — tek yerden yaz, ekibin sırayla çalışsın

Kullanım:
  agent-relay [up]             Panel + motoru başlat (http://localhost:8787)
  agent-relay send "<istek>"   Çalışan relay'e istek gönder ve bitmesini bekle
  agent-relay add  "<istek>"   İsteği kuyruğa ekle, beklemeden çık
  agent-relay status           Kuyruğu ve ajan sağlığını göster
  agent-relay watch <jobId>    Bir işi bitene kadar izle
  agent-relay ctl <jobId> <komut>   pause|resume|stop|skip|takeover|approve|retry|start|delete
  agent-relay health           Ajan bağlantılarını kontrol et
  agent-relay diag             Kurulum teşhisi (panel yolu, sürüm, klasörler)
  agent-relay version          Sürüm

Seçenekler:
  --no-browser                 Panel açılırken tarayıcıyı açma
Ortam: RELAY_URL, RELAY_CONFIG, RELAY_NO_BROWSER=1
`;

function openBrowser(url) {
  if (NO_BROWSER) return;
  const platform = process.platform;
  const [bin, args] =
    platform === "darwin" ? ["open", [url]] : platform === "win32" ? ["cmd", ["/c", "start", "", url]] : ["xdg-open", [url]];
  try {
    const child = spawn(bin, args, { detached: true, stdio: "ignore" });
    child.on("error", () => {});
    child.unref();
  } catch {
    /* tarayıcı yoksa kullanıcı adresi elle açar */
  }
}

/** Hata olursa: exe'nin yanına (yazılamıyorsa eve) log yaz, pencere kapanmasın. */
function reportCrash(err, { pause = false } = {}) {
  const text = `[${new Date().toISOString()}] Agent Relay başlatılamadı\n${err?.stack || err?.message || String(err)}\n` +
    `platform: ${process.platform} ${process.arch} · node: ${process.version} · pkg: ${process.pkg ? "evet" : "hayır"} · cwd: ${process.cwd()}\n` +
    `exe: ${process.execPath}\n`;
  const targets = [];
  try {
    targets.push(path.join(path.dirname(process.execPath), "agent-relay-error.log"));
  } catch {
    /* yok */
  }
  targets.push(path.join(os.homedir(), ".agent-relay", "agent-relay-error.log"));
  let written = null;
  for (const target of targets) {
    try {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, text, { flag: "a" });
      written = target;
      break;
    } catch {
      /* sonrakini dene */
    }
  }

  console.error("\n  ═══════════════════════════════════════════════════");
  console.error("  Agent Relay başlatılamadı:");
  console.error(`  ${err?.message || err}`);
  if (err?.stack) console.error(String(err.stack).split("\n").slice(1, 4).join("\n"));
  console.error(`\n  Hata kaydı: ${written || "(yazılamadı)"}`);
  console.error("  Bunu bana gönderirsen sebebini kesin bulurum.");
  console.error("  ═══════════════════════════════════════════════════\n");

  if (pause) {
    console.error("  Kapatmak için Enter'a bas…");
    try {
      process.stdin.resume();
      process.stdin.once("data", () => process.exit(1));
      setTimeout(() => process.exit(1), 120000).unref();
    } catch {
      process.exit(1);
    }
  }
}

async function up() {
  const relay = await createRelay({ configPath: process.env.RELAY_CONFIG });
  const address = await relay.listen();
  const url = `http://localhost:${address.port}`;
  console.log(`\n  Agent Relay → ${url}`);
  console.log(`  Sıra: ${relay.config.agents.map((a) => `${a.name} (${a.role || "implementer"})`).join("  →  ")}`);
  console.log(`  Mod: ${relay.config.requireApproval ? "her devirde onay" : "tam otomatik"}`);
  console.log(`  Ayar: ${relay.configPath}`);
  console.log(`  Kayıtlar: ${relay.dataDir}`);
  console.log(`\n  Kapatmak için bu pencereyi kapat ya da Ctrl+C.\n`);
  openBrowser(url);
  return relay;
}

const statusTr = {
  queued: "sırada", running: "çalışıyor", waiting_approval: "onay bekliyor", paused: "duraklatıldı",
  done: "bitti", stopped: "durduruldu", error: "hata",
};

function printJob(job, { verbose = false } = {}) {
  console.log(`\n  ${job.request}`);
  console.log(`  durum: ${statusTr[job.status] || job.status}  ·  sıra ${job.turn}/${job.turns.length}`);
  job.stages.forEach((s, i) => {
    const mark = { done: "✔", error: "✖", typing: "…", waiting: "…", answering: "…", skipped: "↷" }[s.status] || "·";
    console.log(`   ${mark} ${i + 1}. ${s.agentName}${s.ms ? ` (${(s.ms / 1000).toFixed(1)} sn)` : ""}${s.captured === false ? " [cevap yakalanamadı]" : ""}`);
    if (verbose && s.output) console.log(indent(s.output, "      "));
    else if (s.error) console.log(indent(s.error, "      "));
  });
  if (job.note) console.log(`  not: ${job.note}`);
}

const indent = (text, pad) => text.split("\n").map((l) => pad + l).join("\n");

async function http(pathname, options = {}) {
  const res = await fetch(`${BASE}${pathname}`, {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json" },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `${res.status} ${res.statusText}`);
  return data;
}

async function ensureServer() {
  try {
    await http("/api/state");
  } catch {
    console.log("  Relay çalışmıyor gibi görünüyor. Önce programı başlat ya da RELAY_URL ayarla.");
    process.exit(1);
  }
}

async function main() {
  switch (cmd) {
    case undefined:
    case "up":
      await up();
      break;

    case "help":
    case "-h":
    case "--help":
      console.log(help);
      break;

    case "version":
    case "-v":
    case "--version":
      console.log("agent-relay 0.1.2");
      break;

    case "send":
    case "add": {
      await ensureServer();
      const request = rest.filter((a) => a !== "--no-browser").join(" ").trim();
      if (!request) {
        console.error("İstek metni gerekli.");
        process.exit(1);
      }
      if (cmd === "add") {
        const { job } = await http("/api/jobs", { method: "POST", body: { request } });
        console.log(`Kuyruğa eklendi: ${job.id}`);
        break;
      }
      const { job } = await http("/api/run", { method: "POST", body: { request } });
      printJob(job, { verbose: true });
      break;
    }

    case "status": {
      await ensureServer();
      const state = await http("/api/state");
      const health = await http("/api/health");
      console.log("\n  Ajanlar:");
      for (const c of health.checks) console.log(`   ${c.ok ? "✔" : "✖"} ${c.name} [${c.adapter}] — ${c.detail}`);
      if (!state.jobs.length) console.log("\n  Kuyruk boş.\n");
      for (const job of [...state.jobs].reverse().slice(-8)) printJob(job);
      console.log();
      break;
    }

    case "watch": {
      await ensureServer();
      const id = rest[0];
      if (!id) {
        console.error("jobId gerekli.");
        process.exit(1);
      }
      let last = "";
      process.stdout.write("  izleniyor");
      for (;;) {
        const job = await http(`/api/jobs/${id}`);
        const line = `${job.status}/${job.turn}`;
        if (line !== last) {
          last = line;
          process.stdout.write(`\n  · ${statusTr[job.status] || job.status} (${job.turn}/${job.turns.length}) `);
        } else process.stdout.write(".");
        if (["done", "stopped", "error"].includes(job.status)) {
          printJob(job, { verbose: true });
          process.exit(job.status === "done" ? 0 : 1);
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
      break;
    }

    case "ctl": {
      await ensureServer();
      const [id, action, ...text] = rest;
      const payload = {};
      if (action === "approve" && text.length) payload.output = text.join(" ");
      const res = await http(`/api/jobs/${id}/${action}`, { method: "POST", body: payload });
      console.log(res.ok ? "tamam" : res.error || "olmadı");
      break;
    }

    case "diag":
    case "diagnose": {
      const listing = (dir) => {
        try {
          return fs.readdirSync(dir).join(", ") || "(boş)";
        } catch (err) {
          return `(${err.code || err.message})`;
        }
      };
      console.log("platform      :", `${process.platform} ${process.arch}`);
      console.log("node          :", process.version);
      console.log("paketli (pkg) :", Boolean(process.pkg));
      console.log("execPath      :", process.execPath);
      console.log("cwd           :", process.cwd());
      console.log("HERE          :", HERE);
      console.log("HERE içeriği  :", listing(HERE));
      console.log("HERE/.. içeriği:", listing(path.join(HERE, "..")));
      if (process.pkg) console.log("/snapshot     :", listing("/snapshot"));
      const located = locateAssets(HERE);
      console.log("panel klasörü :", located.dir, located.found ? "(bulundu)" : "(BULUNAMADI)");
      console.log("aranan yerler :");
      for (const candidate of located.probed) {
        console.log(`   - ${candidate}${fs.existsSync(path.join(candidate, "public", "index.html")) ? "  ✔" : ""}`);
      }
      console.log("home          :", os.homedir());
      console.log("log dosyası   :", path.join(path.dirname(process.execPath), "agent-relay-error.log"));
      break;
    }

    case "health": {
      await ensureServer();
      const health = await http("/api/health");
      for (const c of health.checks) console.log(`  ${c.ok ? "✔" : "✖"} ${c.name} [${c.adapter}] — ${c.detail}`);
      process.exit(health.ok ? 0 : 1);
      break;
    }

    default:
      console.log(help);
      process.exit(1);
  }
}

// Ne olursa olsun pencere sessizce kapanmasın: hata loglanır ve görünür kalır.
process.on("uncaughtException", (err) => reportCrash(err, { pause: true }));
process.on("unhandledRejection", (err) => reportCrash(err, { pause: true }));

main().catch((err) => reportCrash(err, { pause: true }));
