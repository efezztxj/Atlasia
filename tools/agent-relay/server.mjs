import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { Store } from "./lib/store.mjs";
import { Orchestrator } from "./lib/orchestrator.mjs";
import { adapterFor } from "./lib/adapters/index.mjs";
import { listTabs } from "./lib/adapters/cdp.mjs";

// Hem ESM (geliştirme) hem CommonJS (paketlenmiş exe) altında çalışır.
const HERE = (() => {
  if (typeof __dirname !== "undefined") return __dirname;
  try {
    return path.dirname(fileURLToPath(import.meta.url));
  } catch {
    return process.cwd();
  }
})();

export async function createRelay({ configPath, rootDir } = {}) {
  // Paketlenmiş (exe) modda yazılabilir alan exe'nin yanıdır; geliştirmede kaynak klasör.
  const packaged = Boolean(process.pkg);
  const assetsDir = findAssetsRoot(rootDir || HERE); // panel + varsayılan ayar buradan okunur
  const writableDir = packaged ? resolveWritableDir(path.dirname(process.execPath)) : HERE;

  const bundledConfig = path.join(assetsDir, "relay.config.json");
  const localConfig = path.join(writableDir, "relay.config.json");
  const resolvedConfigPath = configPath || process.env.RELAY_CONFIG || (packaged && fs.existsSync(localConfig) ? localConfig : bundledConfig);
  const canWriteConfig = !packaged || path.dirname(resolvedConfigPath) === writableDir;

  const config = JSON.parse(fs.readFileSync(resolvedConfigPath, "utf8"));
  const saveConfig = () => {
    const target = canWriteConfig ? resolvedConfigPath : localConfig;
    try {
      fs.writeFileSync(target, `${JSON.stringify(config, null, 2)}\n`);
    } catch (err) {
      store.log("error", `Ayar dosyası yazılamadı (${target}): ${err.message}`);
    }
  };

  const dataDir = path.isAbsolute(config.dataDir) ? config.dataDir : path.join(writableDir, config.dataDir);
  fs.mkdirSync(dataDir, { recursive: true });

  const store = new Store(path.join(dataDir, "state.json"));
  store.load();
  const orchestrator = new Orchestrator({ store, config });
  orchestrator.start();

  const clients = new Set();
  const broadcast = (event, payload) => {
    const chunk = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const res of clients) {
      try {
        res.write(chunk);
      } catch {
        clients.delete(res);
      }
    }
  };

  let pendingState = null;
  store.on("state", (payload) => {
    if (payload.light) {
      if (pendingState) return;
      pendingState = setTimeout(() => {
        pendingState = null;
        broadcast("state", store.snapshot());
      }, 200);
      return;
    }
    broadcast("state", payload);
  });
  store.on("agent", (payload) => broadcast("agent", payload));
  store.on("log", (entry) => broadcast("log", entry));

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    try {
      if (url.pathname.startsWith("/api/")) return await handleApi(req, res, url);
      return serveStatic(req, res, url);
    } catch (err) {
      json(res, 500, { ok: false, error: err.message });
    }
  });

  async function handleApi(req, res, url) {
    const parts = url.pathname.split("/").filter(Boolean); // ["api", ...]
    const method = req.method.toUpperCase();

    if (parts[1] === "state" && method === "GET") return json(res, 200, { ...store.snapshot(), currentJobId: orchestrator.currentJobId });

    if (parts[1] === "events" && method === "GET") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });
      res.write(`event: state\ndata: ${JSON.stringify(store.snapshot())}\n\n`);
      clients.add(res);
      const ping = setInterval(() => res.write(": ping\n\n"), 20000);
      req.on("close", () => {
        clearInterval(ping);
        clients.delete(res);
      });
      return;
    }

    if (parts[1] === "health" && method === "GET") {
      const checks = [];
      for (const agent of config.agents) {
        const adapter = adapterFor(agent);
        let result;
        try {
          result = await adapter.ready(agent);
        } catch (err) {
          result = { ok: false, detail: err.message };
        }
        checks.push({ id: agent.id, name: agent.name, adapter: adapter.kind, ...result });
      }
      return json(res, 200, { ok: checks.every((c) => c.ok), checks, currentJobId: orchestrator.currentJobId });
    }

    // Tarayıcı sekmelerini listele (agent'ı bir sekmeye bağlamak için)
    if (parts[1] === "tabs" && method === "GET") {
      const firstCdp = config.agents.find((a) => a.adapter === "cdp");
      const endpoint = url.searchParams.get("endpoint") || firstCdp?.cdp?.endpoint || "http://127.0.0.1:9222";
      try {
        const tabs = await listTabs(endpoint);
        return json(res, 200, { ok: true, endpoint, tabs });
      } catch (err) {
        return json(res, 200, { ok: false, endpoint, error: `Tarayıcıya bağlanılamadı: ${err.message}. Chrome'u --remote-debugging-port=9222 ile açtın mı?`, tabs: [] });
      }
    }

    // Agent ayarlarını kaydet (bağlantı + isim + rol + bağlam + durdurma kalıbı)
    if (parts[1] === "agents" && parts[2] && parts[3] === "setup" && method === "POST") {
      const payload = await readJson(req);
      const agent = config.agents.find((a) => a.id === parts[2]);
      if (!agent) return json(res, 404, { ok: false, error: "Ajan bulunamadı" });
      applyAgentPayload(agent, payload);
      saveConfig();
      store.log("info", `${agent.name} ayarları kaydedildi (${agent.adapter}, rol: ${agent.role || "implementer"})`);
      return json(res, 200, { ok: true, agent: publicAgent(agent) });
    }

    // Yeni ajan ekle
    if (parts[1] === "agents" && !parts[2] && method === "POST") {
      const payload = await readJson(req);
      if (!payload.name || !String(payload.name).trim()) return json(res, 400, { ok: false, error: "Ajan adı gerekli" });
      const agent = { id: uniqueAgentId(payload.name, config.agents), name: String(payload.name).trim(), role: "implementer", adapter: "mock", mock: { tone: "build" } };
      applyAgentPayload(agent, payload);
      if (agent.role === "reviewer") agent.mock = { tone: "review" };
      config.agents.push(agent);
      config.turns = config.agents.map((a) => a.id);
      saveConfig();
      store.log("info", `Yeni ajan eklendi: ${agent.name} (${agent.role})`);
      return json(res, 200, { ok: true, agent: publicAgent(agent) });
    }

    // Agent sil
    if (parts[1] === "agents" && parts[2] && parts[3] === "delete" && method === "POST") {
      if (config.agents.length <= 1) return json(res, 400, { ok: false, error: "En az bir ajan kalmalı" });
      const agent = config.agents.find((a) => a.id === parts[2]);
      if (!agent) return json(res, 404, { ok: false, error: "Ajan bulunamadı" });
      config.agents = config.agents.filter((a) => a.id !== agent.id);
      config.turns = config.agents.map((a) => a.id);
      saveConfig();
      store.log("warn", `Ajan silindi: ${agent.name}`);
      return json(res, 200, { ok: true });
    }

    // Agent sırasını değiştir (yukarı/aşağı)
    if (parts[1] === "agents" && parts[2] && parts[3] === "move" && method === "POST") {
      const payload = await readJson(req);
      const dir = payload.dir === -1 ? -1 : 1;
      const index = config.agents.findIndex((a) => a.id === parts[2]);
      if (index < 0) return json(res, 404, { ok: false, error: "Ajan bulunamadı" });
      const target = index + dir;
      if (target < 0 || target >= config.agents.length) return json(res, 200, { ok: true, agent: publicAgent(config.agents[index]) });
      const [moved] = config.agents.splice(index, 1);
      config.agents.splice(target, 0, moved);
      config.turns = config.agents.map((a) => a.id);
      saveConfig();
      return json(res, 200, { ok: true });
    }

    if (parts[1] === "config" && method === "GET") {
      return json(res, 200, {
        turns: config.turns,
        requireApproval: config.requireApproval,
        agents: config.agents.map(publicAgent),
      });
    }

    if (parts[1] === "jobs" && parts[2] === "clear" && method === "POST") {
      return json(res, 200, orchestrator.clearFinished());
    }

    // Kullanıcı cevabı panoya kopyaladıysa panele aktarır (os adapter modu)
    if (parts[1] === "jobs" && parts[2] && parts[3] === "clipboard" && method === "POST") {
      const job = orchestrator.job(parts[2]);
      if (!job) return json(res, 404, { ok: false, error: "İş bulunamadı" });
      const stage = job.stages[job.turn - 1];
      const agent = orchestrator.agent(stage?.agentId) || config.agents.find((a) => a.adapter === "os");
      const adapter = adapterFor(agent || { adapter: "os" });
      if (!adapter.readClipboard) return json(res, 400, { ok: false, error: "Bu adapter pano okumuyor" });
      const text = await adapter.readClipboard(agent);
      if (stage && text.trim()) stage.output = text.trim();
      orchestrator.emitState();
      return json(res, 200, { ok: true, text: text.trim().slice(0, 20000) });
    }

    if (parts[1] === "jobs" && parts[2] && !parts[3] && method === "GET") {
      const job = orchestrator.job(parts[2]);
      return job ? json(res, 200, job) : json(res, 404, { ok: false, error: "İş bulunamadı" });
    }

    if (parts[1] === "jobs" && parts[2] && parts[3] && method === "POST") {
      const payload = await readJson(req);
      const result = orchestrator.control(parts[2], parts[3], payload);
      return json(res, result.ok ? 200 : 400, result);
    }

    if (parts[1] === "jobs" && !parts[2] && method === "POST") {
      const payload = await readJson(req);
      if (!payload.request || !String(payload.request).trim()) return json(res, 400, { ok: false, error: "Boş istek" });
      const job = orchestrator.addJob(payload.request, payload);
      return json(res, 200, { ok: true, job });
    }

    // CLI yardımcı: isteği ekle ve bitene kadar bekle
    if (parts[1] === "run" && method === "POST") {
      const payload = await readJson(req);
      if (!payload.request) return json(res, 400, { ok: false, error: "Boş istek" });
      const job = orchestrator.addJob(payload.request, payload);
      const timeoutMs = payload.timeoutMs ?? 30 * 60 * 1000;
      const done = await waitForTerminal(orchestrator, job.id, timeoutMs);
      return json(res, 200, { ok: done.status === "done", job: done });
    }

    return json(res, 404, { ok: false, error: `Yol yok: ${url.pathname}` });
  }

  function serveStatic(req, res, url) {
    const publicDir = path.join(assetsDir, "public");
    let rel = decodeURIComponent(url.pathname);
    if (rel === "/" || rel === "") rel = "/index.html";
    const filePath = path.normalize(path.join(publicDir, rel));
    if (!filePath.startsWith(publicDir)) return json(res, 403, { ok: false, error: "Yasak" });
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) return json(res, 404, { ok: false, error: "Bulunamadı" });
    const ext = path.extname(filePath);
    const types = {
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".svg": "image/svg+xml",
      ".json": "application/json; charset=utf-8",
    };
    res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream", "Cache-Control": "no-store" });
    fs.createReadStream(filePath).pipe(res);
  }

  return {
    server,
    store,
    orchestrator,
    config,
    configPath: resolvedConfigPath,
    dataDir,
    packaged,
    listen(port = config.port, host = config.host || "0.0.0.0") {
      return new Promise((resolve) => server.listen(port, host, () => resolve(server.address())));
    },
    close() {
      orchestrator.stopAll();
      server.close();
    },
  };
}

function publicAgent(agent) {
  return { id: agent.id, name: agent.name, role: agent.role || "implementer", adapter: agent.adapter, context: agent.context, stopPattern: agent.stopPattern, cdp: agent.cdp, os: agent.os };
}

function slug(text) {
  const map = { ç: "c", Ç: "c", ğ: "g", Ğ: "g", ı: "i", İ: "i", ö: "o", Ö: "o", ş: "s", Ş: "s", ü: "u", Ü: "u" };
  return (
    String(text)
      .replace(/^\s*agent\s*\d+\s*[·:.\-–]*\s*/i, "") // "Agent 3 · Testçi" → "Testçi"
      .replace(/[çÇğĞıİöÖşŞüÜ]/g, (ch) => map[ch])
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 24) || "agent"
  );
}

function applyAgentPayload(agent, payload) {
  if (payload.name) agent.name = String(payload.name).trim();
  if (payload.role) agent.role = payload.role === "reviewer" ? "reviewer" : payload.role === "custom" ? "custom" : "implementer";
  if ("context" in payload) agent.context = payload.context ? String(payload.context) : undefined;
  if ("stopPattern" in payload) agent.stopPattern = payload.stopPattern ? String(payload.stopPattern) : undefined;
  if (payload.adapter) agent.adapter = payload.adapter;
  if (payload.cdp) agent.cdp = { ...(agent.cdp || {}), ...payload.cdp };
  if (payload.os) agent.os = { ...(agent.os || {}), ...payload.os };
  if (agent.adapter === "os" && !agent.os?.window) agent.os = { ...(agent.os || {}), submit: "enter" };
}

function uniqueAgentId(name, agents = []) {
  const base = slug(name);
  let id = base;
  let counter = 2;
  while (agents.some((a) => a.id === id)) id = `${base}-${counter++}`;
  return id;
}

/**
 * Panel dosyalarının (public/) ve gömülü varsayılan ayarın bulunduğu klasör.
 * Paketlenmiş exe'de bundle dist/ altında durur, dosyalar ise paket kökünde —
 * bu yüzden yukarı doğru "public/index.html" aranır.
 */
export function findAssetsRoot(start) {
  let dir = start;
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(dir, "public", "index.html"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return start;
}

/**
 * Paketli (exe) modda yazılabilir klasör: önce exe'nin yanı (taşınabilir kullanım),
 * yazılamıyorsa (örn. Program Files) kullanıcı ev dizinindeki .agent-relay.
 */
export function resolveWritableDir(preferred) {
  for (const candidate of [preferred, path.join(os.homedir(), ".agent-relay")]) {
    try {
      fs.mkdirSync(candidate, { recursive: true });
      fs.accessSync(candidate, fs.constants.W_OK);
      return candidate;
    } catch {
      /* sonrakini dene */
    }
  }
  return os.tmpdir();
}

function json(res, code, body) {
  const text = JSON.stringify(body);
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(text);
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return {};
  }
}

async function waitForTerminal(orchestrator, jobId, timeoutMs) {
  const started = Date.now();
  const terminal = new Set(["done", "stopped", "error"]);
  while (Date.now() - started < timeoutMs) {
    const job = orchestrator.job(jobId);
    if (!job) throw new Error("İş kayboldu");
    if (terminal.has(job.status)) return job;
    await new Promise((r) => setTimeout(r, 600));
  }
  const job = orchestrator.job(jobId);
  job.note = "CLI bekleme zaman aşımı (iş arka planda sürüyor)";
  return job;
}

/** Doğrudan çalıştırıldığında sunucuyu kaldırır (top-level await yok: pkg/CJS uyumu). */
export async function boot() {
  const relay = await createRelay();
  const address = await relay.listen();
  const host = address.address === "::" || address.address === "0.0.0.0" ? "localhost" : address.address;
  console.log(`\n  Agent Relay çalışıyor → http://${host}:${address.port}\n`);
  console.log(`  Sıra: ${relay.config.agents.map((a) => a.name).join("  →  ")}`);
  console.log(`  Mod: ${relay.config.requireApproval ? "her devirde onay" : "tam otomatik"}\n`);
  return relay;
}

const invoked = process.argv[1] && (() => {
  try {
    return fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (invoked || process.pkg) {
  boot().catch((err) => {
    console.error("\n  Başlatılamadı:", err?.stack || err?.message || err);
    process.exitCode = 1;
  });
}
