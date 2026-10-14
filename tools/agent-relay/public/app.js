const $ = (sel) => document.querySelector(sel);

/** @type {{jobs:any[], logs:any[], stats:any, currentJobId:string|null}} */
const state = { jobs: [], logs: [], stats: { created: 0, finished: 0 }, currentJobId: null };
let config = { turns: [], agents: [], requireApproval: true };
let openJobId = null;

const STATUS_TR = {
  queued: "sırada",
  running: "çalışıyor",
  waiting_approval: "onay bekliyor",
  paused: "duraklatıldı",
  done: "bitti",
  stopped: "durduruldu",
  error: "hata",
  typing: "yazıyor",
  waiting: "cevap bekleniyor",
  answering: "cevap yazıyor",
  skipped: "atlandı",
  retry: "yeniden",
};

const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const time = (ms) => new Date(ms).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const secs = (ms) => (ms == null ? "" : `${(ms / 1000).toFixed(1)} sn`);

async function api(path, options = {}) {
  const res = await fetch(path, {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json" },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `İstek başarısız (${res.status})`);
  return data;
}

function control(id, action, payload) {
  return api(`/api/jobs/${id}/${action}`, { method: "POST", body: payload || {} }).catch((err) => alert(err.message));
}

// ---------------- gönderim ----------------

function buildTurns() {
  const rounds = Number($("#rounds")?.value || 1);
  const order = config.agents.map((a) => a.id);
  if (!order.length) return undefined;
  const turns = [];
  for (let i = 0; i < rounds; i++) for (const id of order) turns.push(id);
  return turns;
}

async function send() {
  const text = $("#request").value.trim();
  if (!text) return;
  $("#send").disabled = true;
  try {
    await api("/api/jobs", { method: "POST", body: { request: text, turns: buildTurns() } });
    $("#request").value = "";
  } catch (err) {
    alert(err.message);
  } finally {
    $("#send").disabled = false;
    $("#request").focus();
  }
}

// ---------------- iş kartları ----------------

function stageChips(job) {
  return job.turns
    .map((agentId, index) => {
      const stage = job.stages[index];
      const agent = config.agents.find((a) => a.id === agentId);
      const status = stage?.status || (job.status === "queued" ? "queued" : "queued");
      const label = `${index + 1}. ${agent?.name || agentId}`;
      const suffix = status === "done" && stage?.ms ? ` · ${secs(stage.ms)}` : "";
      return `<span class="stage-chip ${status}"><i></i>${esc(label)}${esc(suffix)}</span>`;
    })
    .join('<span class="muted" style="align-self:center">→</span>');
}

function jobActions(job) {
  const btn = (action, label, cls = "small", payload) =>
    `<button class="btn ${cls}" data-job="${job.id}" data-action="${action}"${payload ? ` data-payload='${esc(JSON.stringify(payload))}'` : ""}>${label}</button>`;
  const out = [];
  if (job.status === "waiting_approval") {
    out.push(btn("approve", "✔ Onayla ve gönder", "primary small"));
    out.push(btn("clipboard", "📋 Panodan cevabı al", "small"));
    out.push(btn("skip", "⤼ Bu sırayı atla", "ghost small"));
  }
  if (job.status === "paused") out.push(btn("resume", "▶ Devam", "primary small"));
  if (job.status === "running") out.push(btn("pause", "⏸ Duraklat", "warn small"));
  if (job.status === "queued") out.push(btn("start", "▶ Başlat", "primary small"));
  if (job.status === "error") out.push(btn("retry", "↻ Yeniden dene", "warn small"));
  if (["paused", "running", "waiting_approval", "queued"].includes(job.status)) out.push(btn("takeover", "✋ Devral", "small"));
  if (!["done", "stopped"].includes(job.status)) out.push(btn("stop", "⏹ Durdur", "danger small"));
  out.push(btn("delete", "🗑", "ghost small"));
  return out.join("");
}

function jobCard(job) {
  const active = job.id === state.currentJobId ? " active" : "";
  const stages = job.stages.filter((s) => s.output);
  const details = stages
    .map(
      (s) => `<details class="out"><summary>${esc(s.agentName)} · çıktı (${secs(s.ms) || "—"})${s.captured === false ? " · yakalanamadı" : ""}</summary>
        <pre>${esc(s.output || "")}</pre></details>`,
    )
    .join("");
  return `<div class="job${active}" data-job-id="${job.id}">
    <div class="job-top">
      <div style="min-width:0">
        <p class="job-req">${esc(job.request)}</p>
        <div class="job-meta"><span>${time(job.createdAt)}</span><span>${job.turn}/${job.turns.length}. sıra</span><span>${esc(job.requireApproval ? "onaylı" : "otomatik")}</span></div>
      </div>
      <span class="pill ${job.status}">${STATUS_TR[job.status] || job.status}</span>
    </div>
    <div class="stages">${stageChips(job)}</div>
    ${job.status === "waiting_approval" && job.stages[job.turn - 1] ? approvalBox(job) : ""}
    ${job.note ? `<div class="job-note">${esc(job.note)}</div>` : ""}
    <div class="job-actions">${jobActions(job)}</div>
    ${details}
  </div>`;
}

function approvalBox(job) {
  const stage = job.stages[job.turn - 1];
  const nextTurn = job.turn;
  const nextAgent = config.agents.find((a) => a.id === job.turns[nextTurn]);
  return `<details class="out" ${openJobId === job.id ? "open" : ""}>
    <summary>Devir onayı — birazdan ${esc(nextAgent?.name || "sıradaki ajan")} tarafından okunacak metin</summary>
    <textarea data-output-for="${job.id}" rows="5">${esc(stage.output || "")}</textarea>
    <div style="margin-top:7px;display:flex;gap:7px;flex-wrap:wrap">
      <button class="btn primary small" data-job="${job.id}" data-action="approve-edited">✔ Bu metinle gönder</button>
    </div>
  </details>`;
}

// ---------------- şu an + canlı ekran ----------------

function renderNow() {
  const job = state.jobs.find((j) => j.id === state.currentJobId) || state.jobs.find((j) => ["running", "waiting_approval", "paused"].includes(j.status));
  if (!job) {
    $("#now-sub").textContent = "boşta";
    $("#now-body").innerHTML = `<p class="muted">Kuyruk boş. Bir istek yaz, sıra Agent 1'e gelsin.</p>`;
    return;
  }
  $("#now-sub").textContent = `${STATUS_TR[job.status] || job.status} · ${job.request.slice(0, 60)}`;
  const stages = job.stages.map((s) => {
    const agent = config.agents.find((a) => a.id === s.agentId);
    const status = s.status;
    return `<div class="stage">
      <div class="stage-head">
        <span class="who">${esc(agent?.name || s.agentName)}</span>
        <span class="pill ${status}">${STATUS_TR[status] || status}</span>
        ${s.ms ? `<span class="muted">${secs(s.ms)}${s.captured === false ? " · cevap yakalanamadı" : ""}</span>` : ""}
      </div>
      ${s.liveTyped ? `<div class="agent-label">yazdığı metin</div><pre class="live-typed">${esc(s.liveTyped)}</pre>` : ""}
      ${s.liveReply ? `<div class="agent-label">gelen cevap</div><pre class="live-reply">${esc(s.liveReply)}</pre>` : ""}
      ${s.error ? `<div class="job-note">${esc(s.error)}</div>` : ""}
    </div>`;
  }).join("");
  $("#now-body").innerHTML = stages || `<p class="muted">Sıra bekleniyor…</p>`;
}

function renderAgents() {
  const job = state.jobs.find((j) => ["running", "waiting_approval", "paused"].includes(j.status));
  const box = $("#agents");
  box.innerHTML = "";
  for (const agent of config.agents) {
    const stage = job?.stages.filter((s) => s.agentId === agent.id).pop();
    const node = document.importNode($("#tpl-agent").content, true);
    node.querySelector(".name").textContent = `${agent.name}`;
    const setupBtn = node.querySelector(".setup-agent");
    setupBtn.dataset.agent = agent.id;
    setupBtn.addEventListener("click", () => openSetup(agent.id));
    node.querySelector(".agent-label").textContent = `yazdığı metin · ${agent.adapter === "mock" ? "demo" : agent.adapter === "cdp" ? "tarayıcı sekmesi" : "masaüstü penceresi"}`;
    const pill = node.querySelector(".pill");
    const status = stage?.status || "queued";
    pill.className = `pill ${status}`;
    pill.textContent = `${STATUS_TR[status] || status}${stage?.ms ? ` · ${secs(stage.ms)}` : ""}`;
    node.querySelector(".typed").textContent = stage?.liveTyped || stage?.prompt?.slice(0, 400) || "—";
    node.querySelector(".reply").textContent = stage?.liveReply || stage?.output || "—";
    box.appendChild(node);
  }
}

function renderLogs() {
  const box = $("#logs");
  const atBottom = box.scrollTop + box.clientHeight >= box.scrollHeight - 30;
  box.innerHTML = state.logs
    .slice(-120)
    .map((l) => `<div class="row ${l.level}"><time>${time(l.at)}</time><span>${esc(l.text)}</span></div>`)
    .join("");
  if (atBottom) box.scrollTop = box.scrollHeight;
}

function render() {
  $("#queue").innerHTML = state.jobs.map(jobCard).join("") || `<p class="muted">Henüz istek yok.</p>`;
  renderNow();
  renderAgents();
  renderLogs();
  $("#order").textContent = `Sıra: ${config.agents.map((a) => a.name).join("  →  ")}  ·  ${config.requireApproval ? "her devirde onay" : "tam otomatik"}`;
}

async function loadHealth() {
  try {
    const health = await api("/api/health");
    $("#health").innerHTML = health.checks
      .map((c) => `<span class="chip ${c.ok ? "ok" : "bad"}" title="${esc(c.detail || "")}"><i></i>${esc(c.name)}</span>`)
      .join("");
  } catch {
    $("#health").innerHTML = `<span class="chip bad"><i></i>sunucu yok</span>`;
  }
}

// ---------------- olaylar ----------------

function applyState(payload) {
  if (payload.jobs) state.jobs = payload.jobs;
  if (payload.logs) state.logs = payload.logs;
  if ("currentJobId" in payload) state.currentJobId = payload.currentJobId;
  render();
}

function connect() {
  const es = new EventSource("/api/events");
  es.addEventListener("state", (e) => applyState(JSON.parse(e.data)));
  es.addEventListener("agent", (e) => {
    const { jobId, stage } = JSON.parse(e.data);
    const job = state.jobs.find((j) => j.id === jobId);
    if (!job) return;
    const target = job.stages[job.stages.length - 1];
    if (!target || target.agentId !== stage.agentId) job.stages.push(stage);
    else Object.assign(target, stage);
    renderNow();
    renderAgents();
  });
  es.addEventListener("log", (e) => {
    state.logs.push(JSON.parse(e.data));
    if (state.logs.length > 400) state.logs.shift();
    renderLogs();
  });
  es.onerror = () => {
    es.close();
    setTimeout(async () => {
      await bootstrap();
      connect();
    }, 1500);
  };
}

document.addEventListener("click", async (event) => {
  const btn = event.target.closest("[data-action]");
  if (!btn) return;
  const id = btn.dataset.job;
  const action = btn.dataset.action;
  if (action === "clipboard") {
    const res = await api(`/api/jobs/${id}/clipboard`, { method: "POST" }).catch((err) => ({ error: err.message }));
    if (res.error) alert(res.error);
    return;
  }
  if (action === "approve-edited") {
    const textarea = document.querySelector(`[data-output-for="${id}"]`);
    openJobId = id;
    return control(id, "approve", { output: textarea?.value || "" });
  }
  if (action === "delete") openJobId = null;
  return control(id, action);
});

$("#send").addEventListener("click", send);
$("#request").addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") send();
});
$("#clear").addEventListener("click", () => api("/api/jobs/clear", { method: "POST" }));
$("#approval").addEventListener("change", async (e) => {
  const on = e.target.checked;
  const jobs = state.jobs.filter((j) => !["done", "stopped"].includes(j.status));
  await Promise.all(jobs.map((j) => api(`/api/jobs/${j.id}/${on ? "need-approval" : "auto"}`, { method: "POST" }).catch(() => {})));
  render();
});

async function bootstrap() {
  config = await api("/api/config").catch(() => config);
  $("#approval").checked = Boolean(config.requireApproval);
  applyState(await api("/api/state").catch(() => ({})));
  await loadHealth();
}

// ---------------- agent bağlama ----------------

let setupAgentId = null;

function shelfKey(id) {
  return `relay.agent.${id}`;
}

function openSetup(agentId) {
  setupAgentId = agentId;
  const agent = config.agents.find((a) => a.id === agentId) || {};
  const memory = JSON.parse(localStorage.getItem(shelfKey(agentId)) || "{}");
  const cdp = agent.cdp || memory.cdp || {};
  const os = agent.os || memory.os || {};
  $("#modal-title").textContent = `${agent.name} · bağla`;
  $("#m-adapter").value = agent.adapter || "mock";
  $("#m-endpoint").value = cdp.endpoint || memory.endpoint || "http://127.0.0.1:9222";
  $("#m-input").value = cdp.input || "";
  $("#m-reply").value = cdp.reply || "";
  $("#m-busy").value = cdp.busy || "";
  $("#m-submit").value = cdp.submit || "enter";
  $("#m-send").value = cdp.send || "";
  $("#m-idle").value = cdp.idleMs || 3000;
  $("#m-index").value = cdp.match?.index ?? "";
  $("#m-window").value = os.window || "";
  $("#m-tabs").innerHTML = "";
  $("#m-tabs-note").textContent = "Chrome --remote-debugging-port=9222 ile açık olmalı";
  syncAdapterFields();
  $("#modal").classList.remove("hidden");
}

function syncAdapterFields() {
  const adapter = $("#m-adapter").value;
  $("#m-browser").style.display = adapter === "cdp" ? "" : "none";
  $("#m-desktop").style.display = adapter === "os" ? "" : "none";
}

async function refreshTabs() {
  $("#m-tabs-note").textContent = "aranıyor…";
  const endpoint = $("#m-endpoint").value.trim();
  const data = await api(`/api/tabs?endpoint=${encodeURIComponent(endpoint)}`).catch((err) => ({ ok: false, error: err.message, tabs: [] }));
  $("#m-tabs-note").textContent = data.ok ? `${data.tabs.length} sekme bulundu` : data.error || "sekme bulunamadı";
  $("#m-tabs").innerHTML = (data.tabs || [])
    .map(
      (t, i) => `<label><input type="radio" name="tab" value="${esc(t.id)}" data-url="${esc(t.url)}" data-title="${esc(t.title)}" ${i === 0 ? "checked" : ""} />
        <span><strong>${esc(t.title || "(başlıksız)")}</strong><small>${esc(t.url)}</small></span></label>`,
    )
    .join("");
}

async function saveSetup() {
  const adapter = $("#m-adapter").value;
  const endpoint = $("#m-endpoint").value.trim() || "http://127.0.0.1:9222";
  const picked = document.querySelector('input[name="tab"]:checked');
  const body = { adapter };
  if (adapter === "cdp") {
    const cdp = {
      endpoint,
      input: $("#m-input").value.trim() || undefined,
      reply: $("#m-reply").value.trim() || undefined,
      busy: $("#m-busy").value.trim() || undefined,
      submit: $("#m-submit").value,
      send: $("#m-send").value.trim() || undefined,
      idleMs: Number($("#m-idle").value || 3000),
    };
    const index = $("#m-index").value;
    if (index !== "") cdp.match = { index: Number(index) };
    else if (picked) cdp.match = { id: picked.value, url: picked.dataset.url, title: picked.dataset.title };
    body.cdp = cdp;
  }
  if (adapter === "os") body.os = { window: $("#m-window").value.trim(), submit: "enter" };
  if (adapter === "mock") body.os = {};
  await api(`/api/agents/${setupAgentId}/setup`, { method: "POST", body }).catch((err) => alert(err.message));
  // Seçilenleri tarayıcıda da hatırla (sunucu config'i ezilirse diye)
  localStorage.setItem(shelfKey(setupAgentId), JSON.stringify({ cdp: body.cdp, os: body.os, endpoint }));
  config = await api("/api/config").catch(() => config);
  $("#modal").classList.add("hidden");
  render();
  loadHealth();
}

document.addEventListener("click", (event) => {
  if (event.target.closest("#setup")) openSetup(config.agents[0]?.id);
  if (event.target.closest("#modal-close") || event.target.closest("#modal-cancel") || event.target === $("#modal")) $("#modal").classList.add("hidden");
  if (event.target.closest("#modal-save")) saveSetup();
  if (event.target.closest("#m-refresh")) refreshTabs();
});
document.addEventListener("change", (event) => {
  if (event.target.id === "m-adapter") syncAdapterFields();
});

bootstrap();
connect();
setInterval(loadHealth, 20000);
