import { adapterFor } from "./adapters/index.mjs";
import { sleep } from "./adapters/base.mjs";

const TERMINAL = new Set(["done", "stopped", "error"]);

/**
 * Sıralı relay motoru:
 *   Tek istek -> Kuyruk -> Agent 1 yazar/çalışır -> (onay) -> devir notu Agent 2'ye
 *   -> Agent 2 doğrular/düzeltir -> ... -> bitti.
 * Kullanıcı her an: duraklat, devam, atla, devral, onayla, durdur.
 */
export class Orchestrator {
  constructor({ store, config }) {
    this.store = store;
    this.config = config;
    this.waiters = new Map(); // jobId -> { kind, resolve }
    this.cancels = new Map(); // jobId -> boolean (send iptali)
    this.running = false;
    this.currentJobId = null;
  }

  agent(id) {
    return this.config.agents.find((a) => a.id === id);
  }

  // ---------- kuyruk yönetimi ----------

  addJob(request, opts = {}) {
    const job = {
      id: `job_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      request: String(request).trim(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: "queued",
      turn: 0,
      turns: opts.turns || this.config.turns,
      requireApproval: opts.requireApproval ?? this.config.requireApproval,
      stages: [],
      control: "run",
      note: "",
    };
    this.store.state.jobs.unshift(job);
    this.store.state.stats.created++;
    this.store.log("info", `İstek kuyruğa alındı: ${job.request.slice(0, 80)}`);
    this.emitState();
    return job;
  }

  job(id) {
    return this.store.state.jobs.find((j) => j.id === id);
  }

  control(id, action, payload = {}) {
    const job = this.job(id);
    if (!job) return { ok: false, error: "İş bulunamadı" };
    switch (action) {
      case "pause":
        job.control = "pause";
        job.note = "Kullanıcı duraklattı";
        this.store.log("warn", "Duraklatıldı");
        break;
      case "resume":
        job.control = "run";
        job.note = "";
        if (this.currentJobId !== id) job.status = "running"; // kuyruğa geri al
        this.release(job.id, { approved: true });
        this.store.log("info", "Devam ediyor");
        break;
      case "stop":
        job.control = "stop";
        job.status = "stopped";
        this.cancels.set(job.id, true);
        this.release(job.id);
        this.store.log("warn", `Durduruldu: ${job.request.slice(0, 40)}`);
        break;
      case "need-approval":
        job.requireApproval = true;
        break;
      case "auto":
        job.requireApproval = false;
        break;
      case "takeover":
        job.control = "takeover";
        job.status = "paused";
        job.note = "Sen devraldın — relay bu ajana dokunmuyor";
        this.cancels.set(job.id, true);
        this.store.log("warn", "Devralındı (relay bekliyor)");
        break;
      case "skip":
        job.skipTurn = true;
        this.release(job.id);
        this.store.log("warn", "Bu sıra atlanıyor");
        break;
      case "retry":
        job.control = "run";
        job.status = "running";
        if (job.turn > 0 && job.stages[job.turn - 1]?.status !== "done") job.turn -= 1;
        for (const stage of job.stages) if (stage.status === "error") stage.status = "retry";
        job.note = "";
        this.release(job.id);
        this.store.log("info", "Yeniden denenecek");
        break;
      case "approve": {
        const stage = job.stages[job.turn - 1];
        if (payload.output != null && payload.output.trim()) {
          if (stage) stage.output = payload.output.trim();
        }

        job.status = "running";
        job.note = "";
        this.release(job.id, { approved: true, editPrompt: payload.editPrompt });
        this.store.log("info", "Onaylandı, sıradaki ajana geçiliyor");
        break;
      }
      case "start": {
        if (job.status === "queued") {
          job.control = "run";
          this.store.log("info", "Elle başlatıldı");
        }
        break;
      }
      case "delete":
        this.store.state.jobs = this.store.state.jobs.filter((j) => j.id !== id);
        this.release(job.id);
        break;
      default:
        return { ok: false, error: `Bilinmeyen komut: ${action}` };
    }
    job.updatedAt = Date.now();
    this.emitState();
    return { ok: true, job };
  }

  /** Biten/durdurulan/hatalı işleri kuyruktan düşürür. */
  clearFinished() {
    const before = this.store.state.jobs.length;
    this.store.state.jobs = this.store.state.jobs.filter((j) => !TERMINAL.has(j.status));
    const removed = before - this.store.state.jobs.length;
    if (removed) this.store.log("info", `${removed} bitmiş iş temizlendi`);
    this.emitState();
    return { ok: true, removed };
  }

  release(jobId, value) {
    const waiter = this.waiters.get(jobId);
    if (!waiter) return false;
    this.waiters.delete(jobId);
    waiter.resolve(value);
    return true;
  }

  wait(jobId, kind) {
    return new Promise((resolve) => this.waiters.set(jobId, { kind, resolve }));
  }

  // ---------- ana döngü ----------

  start() {
    if (this.running) return;
    this.running = true;
    this.loop().catch((err) => this.store.log("error", `Motorda hata: ${err.message}`));
  }

  async loop() {
    while (this.running) {
      const job = this.next();
      if (!job) {
        await sleep(400);
        continue;
      }
      this.currentJobId = job.id;
      await this.runJob(job).catch((err) => {
        job.status = "error";
        job.note = err.message;
        this.store.log("error", `İş hatası: ${err.message}`);
        this.emitState();
      });
      this.currentJobId = null;
    }
  }

  next() {
    return [...this.store.state.jobs]
      .reverse()
      .find((j) => j.id !== this.currentJobId && (j.status === "queued" || (j.status === "running" && j.control === "run")));
  }

  async runJob(job) {
    job.status = "running";
    job.control = "run";
    this.emitState();

    while (job.turn < job.turns.length) {
      if (job.control === "stop") break;

      const agentId = job.turns[job.turn];
      const agent = this.agent(agentId);
      if (!agent) throw new Error(`Ajan tanımsız: ${agentId}`);

      // 0. Duraklama / devralma
      if (job.control === "pause" || job.control === "takeover") {
        job.status = "paused";
        this.emitState();
        await this.wait(job.id, "resume");
        if (job.control === "stop") break;
        job.status = "running";
        if (job.control === "takeover") {
          // Devralma sonrası kullanıcı "devam" dediyse sıradaki ajana geçer.
          job.turn++;
          continue;
        }
      }

      // 1. Devir öncesi onay
      const isFirst = job.turn === 0;
      const prevStage = job.stages[job.turn - 1];
      const needsApproval = !isFirst && (job.requireApproval || (this.config.handoffNeedsOutput && !prevStage?.output));
      const prompt = this.buildPrompt(job, agent, prevStage);

      const stage = {
        agentId,
        agentName: agent.name,
        prompt,
        status: "typing",
        startedAt: Date.now(),
        liveTyped: "",
        liveReply: "",
      };
      job.stages.push(stage);
      job.updatedAt = Date.now();

      if (needsApproval) {
        job.status = "waiting_approval";
        job.note = prevStage?.output ? "Devir onayı bekliyor" : "Önceki ajanın cevabı okunamadı — cevabı yapıştır ya da boş geç";
        this.emitState();
        const res = await this.wait(job.id, "approval");
        if (job.control === "stop") break;
        if (job.skipTurn) {
          job.skipTurn = false;
          stage.status = "skipped";
          job.turn++;
          this.emitState();
          continue;
        }
        // Onaydan sonra metni yeniden kur: kullanıcı devir notunu düzenlemiş olabilir.
        stage.prompt = res?.editPrompt || this.buildPrompt(job, agent, prevStage);
        stage.status = "typing";
      }

      // 2. Yaz + gönder + cevabı bekle
      this.cancels.set(job.id, false);
      const adapter = adapterFor(agent);
      this.store.log("info", `${agent.name} → yazıyor (${job.request.slice(0, 40)}…)`);
      this.emitState();

      const started = Date.now();
      let result = { reply: "", captured: false };
      try {
        result = await adapter.send({
          agent: { ...agent, typing: this.config.typing },
          text: stage.prompt,
          shouldStop: () => this.cancels.get(job.id) === true || job.control === "stop",
          onEvent: (event) => this.onAgentEvent(job, stage, agent, event),
        });
        stage.status = "done";
      } catch (err) {
        stage.status = "error";
        stage.error = err.message;
        job.status = "error";
        job.note = err.message;
        this.store.log("error", `${agent.name}: ${err.message}`);
        this.emitState();
        return;
      }
      stage.endedAt = Date.now();
      stage.ms = stage.endedAt - started;
      stage.output = (result.reply || stage.liveReply || "").trim();
      stage.captured = result.captured && Boolean(stage.output);
      job.updatedAt = Date.now();
      this.store.log("info", `${agent.name} → bitti (${(stage.ms / 1000).toFixed(1)} sn${stage.captured ? "" : ", cevap yakalanamadı"})`);
      this.emitState();

      job.turn++;
    }

    if (job.status !== "stopped" && job.status !== "error") {
      job.status = "done";
      job.note = "Tüm sıralar tamamlandı";
      this.store.state.stats.finished++;
      this.store.log("info", `İş bitti: ${job.request.slice(0, 60)}`);
    }
    this.emitState();
  }

  buildPrompt(job, agent, prevStage) {
    const isFirst = job.turn === 0;
    const template = isFirst ? this.config.prompts.build : this.config.prompts.handoff;
    const prevAgent = prevStage?.agentName || "Önceki ajan";
    return template
      .replaceAll("{{request}}", job.request)
      .replaceAll("{{agent}}", agent.name)
      .replaceAll("{{prevAgent}}", prevAgent)
      .replaceAll("{{output}}", (prevStage?.output || "").trim() || "(önceki ajanın cevabı yakalanamadı)")
      .replaceAll("{{turn}}", String(job.turn + 1))
      .trim();
  }

  onAgentEvent(job, stage, agent, event) {
    job.updatedAt = Date.now();
    switch (event.type) {
      case "typed":
        stage.liveTyped = event.text;
        break;
      case "reply":
        stage.liveReply = event.text;
        break;
      case "phase":
        stage.phase = event.phase;
        if (event.phase === "typing") stage.status = "typing";
        if (event.phase === "submitted") stage.status = "waiting";
        if (event.phase === "answering") stage.status = "answering";
        break;
      case "clear":
        stage.liveTyped = "";
        break;
      default:
        break;
    }
    this.store.emit("agent", { jobId: job.id, agentId: agent.id, agentName: agent.name, stage: publicStage(stage) });
    this.emitState({ light: true });
  }

  emitState(opts = {}) {
    this.store.emit("state", { ...this.store.snapshot(), currentJobId: this.currentJobId, light: Boolean(opts.light) });
    this.store.save();
  }

  stopAll() {
    this.running = false;
    for (const job of this.store.state.jobs) if (!TERMINAL.has(job.status)) job.control = "pause";
    this.emitState();
  }
}

export function publicStage(stage) {
  if (!stage) return null;
  return {
    agentId: stage.agentId,
    agentName: stage.agentName,
    status: stage.status,
    phase: stage.phase,
    liveTyped: stage.liveTyped,
    liveReply: stage.liveReply,
    startedAt: stage.startedAt,
    endedAt: stage.endedAt,
    ms: stage.ms,
    error: stage.error,
    captured: stage.captured,
  };
}
