#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRelay } from "../server.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [cmd, ...rest] = process.argv.slice(2);

const BASE = process.env.RELAY_URL || "http://127.0.0.1:8787";

const help = `
Agent Relay — tek yerden iki agent, sıralı devir teslim

Kullanım:
  relay.mjs up                 Panel + motoru başlat (http://localhost:8787)
  relay.mjs send "<istek>"     Çalışan relay'e istek gönder ve bitmesini bekle
  relay.mjs add  "<istek>"     İsteği kuyruğa ekle, beklemeden çık
  relay.mjs status             Kuyruğu ve ajan sağlığını göster
  relay.mjs watch <jobId>      Bir işi bitene kadar izle
  relay.mjs ctl <jobId> <komut> <komut>: pause|resume|stop|skip|takeover|approve|retry|start|delete
  relay.mjs health             Ajan bağlantılarını kontrol et

Ortam: RELAY_URL (varsayılan http://127.0.0.1:8787), RELAY_CONFIG (ayar dosyası)
`;

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

async function http(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
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
    console.log("  Relay çalışmıyor gibi görünüyor. Önce 'relay.mjs up' çalıştır ya da RELAY_URL ayarla.");
    process.exit(1);
  }
}

switch (cmd) {
  case undefined:
  case "help":
  case "-h":
  case "--help":
    console.log(help);
    break;

  case "up": {
    const relay = await createRelay({ configPath: process.env.RELAY_CONFIG });
    const address = await relay.listen();
    console.log(`\n  Agent Relay → http://localhost:${address.port}`);
    console.log(`  Sıra: ${relay.config.agents.map((a) => a.name).join("  →  ")}`);
    console.log(`  Mod: ${relay.config.requireApproval ? "her devirde onay" : "tam otomatik"}\n`);
    break;
  }

  case "send":
  case "add": {
    await ensureServer();
    const request = rest.join(" ").trim();
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

  case "health": {
    await ensureServer();
    const health = await http("/api/health");
    for (const c of health.checks) console.log(`  ${c.ok ? "✔" : "✖"} ${c.name} [${c.adapter}] — ${c.detail}`);
    process.exit(health.ok ? 0 : 1);
  }

  default:
    console.log(help);
    process.exit(1);
}
