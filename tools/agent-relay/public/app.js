const $ = (sel) => document.querySelector(sel);

const state = { jobs: [], logs: [], stats: {}, currentJobId: null };
let config = { turns: [], agents: [], requireApproval: true };
let picked = new Set(); // istek gönderirken seçili ajanlar
let modalAgentId = null;
let modalIsNew = false;

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

const ROLE_TR = { implementer: "kodcu", reviewer: "denetçi", custom: "özel" };
const ADAPTER_TR = { mock: "demo", cdp: "tarayıcı sekmesi", os: "masaüstü penceresi" };

const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const time = (ms) => new Date(ms).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const secs = (ms) => (ms == null ? "" : `${(ms / 1000).toFixed(1)} sn`);
const agentById = (id) => config.agents.find((a) => a.id === id);

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

const control = (id, action, payload) =>
  api(`/api/jobs/${id}/${action}`, { method: "POST", body: payload || {} }).catch((err) => alert(err.message));

// ---------------- istek gönderme ----------------

function selectedAgents() {
  const list = config.agents.filter((a) => picked.has(a.id));
  return list.length ? list : config.agents;
}

function buildTurns() {
  const chosen = selectedAgents();
  const mode = $("#loop").value;
  if (mode === "loop") {
    const [first, second] = chosen;
    const seq = second ? [first.id, second.id, first.id, second.id] : [first.id, first.id];
    return seq;
  }
  const rounds = Number(mode) || 1;
  const turns = [];
  for (let i = 0; i < rounds; i++) for (const a of chosen) turns.push(a.id);
  return turns;
}

function renderPreview() {
  const names = buildTurns().map((id) => agentById(id)?.name.replace(/^Agent \d+ · /, "") || id);
  $("#preview").innerHTML = `Sıra: ${names.map((n) => `<b>${esc(n)}</b>`).join(' <span class="muted">→</span> ')}`;
}

function renderPick() {
  $("#pick").innerHTML = config.agents
    .map(
      (a) => `<button class="chip ${picked.has(a.id) ? "on" : ""}" data-pick="${a.id}">
        <i class="role-${a.role || "implementer"}"></i>${esc(a.name.replace(/^Agent \d+ · /, ""))}
      </button>`,
    )
    .join("");
  renderPreview();
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

// ---------------- kuyruk ----------------

function stageChips(job) {
  return job.turns
    .map((agentId, index) => {
      const stage = job.stages[index];
      const agent = agentById(agentId);
      const status = stage?.status || "queued";
      const suffix = status === "done" && stage?.ms ? ` · ${secs(stage.ms)}` : "";
      const mark = stage?.approved ? " ✔" : "";
      return `<span class="stage-chip ${status}"><i></i>${esc(agent?.name.replace(/^Agent \d+ · /, "") || agentId)}${esc(suffix)}${mark}</span>`;
    })
    .join('<span class="muted" style="align-self:center">→</span>');
}

function jobActions(job) {
  const btn = (action, label, cls = "small") => `<button class="btn ${cls}" data-job="${job.id}" data-action="${action}">${label}</button>`;
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

function approvalBox(job) {
  const stage = job.stages[job.turn - 1];
  const nextAgent = agentById(job.turns[job.turn]);
  return `<details class="out" open>
    <summary>Devir onayı — birazdan ${esc(nextAgent?.name || "sıradaki ajan")} tarafından okunacak metin</summary>
    <textarea data-output-for="${job.id}" rows="5">${esc(stage.output || "")}</textarea>
    <div style="margin-top:7px"><button class="btn primary small" data-job="${job.id}" data-action="approve-edited">✔ Bu metinle gönder</button></div>
  </details>`;
}

function jobCard(job) {
  const active = job.id === state.currentJobId ? " active" : "";
  const details = job.stages
    .filter((s) => s.output || s.error)
    .map(
      (s) => `<details class="out"><summary>${esc(s.agentName)} · çıktı (${secs(s.ms) || "—"})${s.captured === false ? " · yakalanamadı" : ""}${s.approved ? " · ✔ onay" : ""}</summary>
        <pre>${esc(s.output || s.error || "")}</pre></details>`,
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

// ---------------- şu an / ekip ----------------

function activeJob() {
  return state.jobs.find((j) => j.id === state.currentJobId) || state.jobs.find((j) => ["running", "waiting_approval", "paused"].includes(j.status));
}

function renderNow() {
  const job = activeJob();
  if (!job) {
    $("#now-sub").textContent = "boşta";
    $("#now-body").innerHTML = `<p class="muted">Kuyruk boş. Bir istek yaz, sıra ilk ajana gelsin.</p>`;
    return;
  }
  $("#now-sub").textContent = `${STATUS_TR[job.status] || job.status} · ${job.request.slice(0, 60)}`;
  $("#now-body").innerHTML =
    job.stages
      .map((s) => {
        const agent = agentById(s.agentId);
        return `<div class="stage">
        <div class="stage-head">
          <span class="who">${esc(agent?.name || s.agentName)}</span>
          <span class="pill ${s.status}">${STATUS_TR[s.status] || s.status}</span>
          ${agent?.role === "reviewer" ? '<span class="pill">denetçi</span>' : ""}
          ${s.ms ? `<span class="muted">${secs(s.ms)}${s.captured === false ? " · cevap yakalanamadı" : ""}${s.approved ? " · ✔ onay" : ""}</span>` : ""}
        </div>
        ${s.liveTyped ? `<div class="agent-label">yazdığı metin</div><pre class="live-typed">${esc(s.liveTyped)}</pre>` : ""}
        ${s.liveReply ? `<div class="agent-label">gelen cevap</div><pre class="live-reply">${esc(s.liveReply)}</pre>` : ""}
        ${s.error ? `<div class="job-note">${esc(s.error)}</div>` : ""}
      </div>`;
      })
      .join("") || `<p class="muted">Sıra bekleniyor…</p>`;
}

function renderAgents() {
  const job = activeJob();
  const box = $("#agents");
  box.innerHTML = "";
  config.agents.forEach((agent, index) => {
    const stage = job?.stages.filter((s) => s.agentId === agent.id).pop();
    const status = stage?.status || "queued";
    const node = document.importNode($("#tpl-agent").content, true);
    node.querySelector(".name").textContent = agent.name;
    const pill = node.querySelector(".pill");
    pill.className = `pill ${status}`;
    pill.textContent = STATUS_TR[status] || status;
    node.querySelector(".agent-sub").textContent =
      `${ROLE_TR[agent.role || "implementer"]} · ${ADAPTER_TR[agent.adapter] || agent.adapter}${agent.stopPattern ? " · onayda erken bitirir" : ""}`;
    node.querySelector(".typed").textContent = stage?.liveTyped || stage?.prompt?.slice(0, 400) || "—";
    node.querySelector(".reply").textContent = stage?.liveReply || stage?.output || "—";
    node.querySelectorAll(".act").forEach((btn) => {
      btn.dataset.agent = agent.id;
      if (btn.dataset.act === "up") btn.disabled = index === 0;
      if (btn.dataset.act === "down") btn.disabled = index === config.agents.length - 1;
    });
    box.appendChild(node);
  });
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

function renderHeader() {
  $("#order").textContent = config.agents.length
    ? `Ekip: ${config.agents.map((a) => `${a.name.replace(/^Agent \d+ · /, "")} (${ROLE_TR[a.role || "implementer"]})`).join("  →  ")}  ·  ${config.requireApproval ? "her devirde onay" : "tam otomatik"}`
    : "Ajan yok — ekle.";
}

function render() {
  renderHeader();
  renderPick();
  $("#queue").innerHTML = state.jobs.map(jobCard).join("") || `<p class="muted">Henüz istek yok.</p>`;
  renderNow();
  renderAgents();
  renderLogs();
}

async function loadHealth() {
  try {
    const health = await api("/api/health");
    $("#health").innerHTML = health.checks
      .map((c) => `<span class="chip ${c.ok ? "ok" : "bad"}" title="${esc(c.detail || "")}"><i></i>${esc(c.name.replace(/^Agent \d+ · /, ""))}</span>`)
      .join("");
  } catch {
    $("#health").innerHTML = `<span class="chip bad"><i></i>sunucu yok</span>`;
  }
}

// ---------------- ajan düzenleme ----------------

function syncAdapterFields() {
  const adapter = $("#m-adapter").value;
  $("#m-browser").style.display = adapter === "cdp" ? "" : "none";
  $("#m-desktop").style.display = adapter === "os" ? "" : "none";
}

function openModal(agentId) {
  const isNew = !agentId;
  modalIsNew = isNew;
  modalAgentId = agentId || null;
  const agent = isNew ? { adapter: "mock", role: "implementer" } : agentById(agentId) || {};
  const cdp = agent.cdp || {};
  const os = agent.os || {};
  $("#modal-title").textContent = isNew ? "Yeni ajan" : `${agent.name} · düzenle`;
  $("#modal-delete").style.display = isNew ? "none" : "";
  $("#m-name").value = agent.name || "";
  $("#m-role").value = agent.role || "implementer";
  $("#m-context").value = agent.context || "";
  $("#m-stop").value = agent.stopPattern || "";
  $("#m-adapter").value = agent.adapter || "mock";
  $("#m-endpoint").value = cdp.endpoint || "http://127.0.0.1:9222";
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

async function saveAgent() {
  const adapter = $("#m-adapter").value;
  const body = {
    name: $("#m-name").value.trim(),
    role: $("#m-role").value,
    context: $("#m-context").value.trim(),
    stopPattern: $("#m-stop").value.trim(),
    adapter,
  };
  if (!body.name) return alert("Ajan adı gerekli.");
  if (adapter === "cdp") {
    const cdp = {
      endpoint: $("#m-endpoint").value.trim() || "http://127.0.0.1:9222",
      input: $("#m-input").value.trim() || undefined,
      reply: $("#m-reply").value.trim() || undefined,
      busy: $("#m-busy").value.trim() || undefined,
      submit: $("#m-submit").value,
      send: $("#m-send").value.trim() || undefined,
      idleMs: Number($("#m-idle").value || 3000),
    };
    const index = $("#m-index").value;
    const tab = document.querySelector('input[name="tab"]:checked');
    if (index !== "") cdp.match = { index: Number(index) };
    else if (tab) cdp.match = { id: tab.value, url: tab.dataset.url, title: tab.dataset.title };
    else if (agentById(modalAgentId)?.cdp?.match) cdp.match = agentById(modalAgentId).cdp.match;
    body.cdp = cdp;
  }
  if (adapter === "os") body.os = { window: $("#m-window").value.trim(), submit: "enter" };

  try {
    if (modalIsNew) await api("/api/agents", { method: "POST", body });
    else await api(`/api/agents/${modalAgentId}/setup`, { method: "POST", body });
  } catch (err) {
    return alert(err.message);
  }
  $("#modal").classList.add("hidden");
  await bootstrap();
}

async function deleteAgent(id) {
  const agent = agentById(id);
  if (!confirm(`${agent?.name || id} silinsin mi?`)) return;
  await api(`/api/agents/${id}/delete`, { method: "POST" }).catch((err) => alert(err.message));
  $("#modal").classList.add("hidden");
  picked.delete(id);
  await bootstrap();
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
  const pick = event.target.closest("[data-pick]");
  if (pick) {
    const id = pick.dataset.pick;
    if (picked.has(id)) picked.delete(id);
    else picked.add(id);
    renderPick();
    return;
  }

  const actBtn = event.target.closest(".act");
  if (actBtn) {
    const id = actBtn.dataset.agent;
    if (actBtn.dataset.act === "edit") return openModal(id);
    await api(`/api/agents/${id}/move`, { method: "POST", body: { dir: actBtn.dataset.act === "up" ? -1 : 1 } }).catch((err) => alert(err.message));
    return bootstrap();
  }

  const btn = event.target.closest("[data-action]");
  if (btn) {
    const id = btn.dataset.job;
    const action = btn.dataset.action;
    if (action === "clipboard") {
      const res = await api(`/api/jobs/${id}/clipboard`, { method: "POST" }).catch((err) => ({ error: err.message }));
      if (res.error) alert(res.error);
      return;
    }
    if (action === "approve-edited") {
      const textarea = document.querySelector(`[data-output-for="${id}"]`);
      return control(id, "approve", { output: textarea?.value || "" });
    }
    return control(id, action);
  }

  if (event.target.closest("#add-agent")) return openModal(null);
  if (event.target.closest("#modal-close") || event.target.closest("#modal-cancel") || event.target === $("#modal")) return $("#modal").classList.add("hidden");
  if (event.target.closest("#modal-save")) return saveAgent();
  if (event.target.closest("#modal-delete")) return deleteAgent(modalAgentId);
  if (event.target.closest("#m-refresh")) return refreshTabs();
});

document.addEventListener("change", (event) => {
  if (event.target.id === "m-adapter") syncAdapterFields();
  if (event.target.id === "loop") renderPreview();
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
  const ids = new Set(config.agents.map((a) => a.id));
  picked = new Set([...picked].filter((id) => ids.has(id)));
  if (!picked.size) config.agents.forEach((a) => picked.add(a.id));
  $("#approval").checked = Boolean(config.requireApproval);
  applyState(await api("/api/state").catch(() => ({})));
  await loadHealth();
}

bootstrap();
connect();
setInterval(loadHealth, 20000);
