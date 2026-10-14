import fs from "node:fs";
import path from "node:path";
import { EventEmitter } from "node:events";

/**
 * Basit JSON durum deposu + olay yolu (SSE için).
 */
export class Store extends EventEmitter {
  constructor(file, { maxLogs = 400 } = {}) {
    super();
    this.file = file;
    this.maxLogs = maxLogs;
    this.state = { jobs: [], logs: [], stats: { created: 0, finished: 0 } };
    this._saveTimer = null;
  }

  load() {
    try {
      if (fs.existsSync(this.file)) {
        const raw = JSON.parse(fs.readFileSync(this.file, "utf8"));
        this.state = { ...this.state, ...raw };
        this.state.jobs = Array.isArray(raw.jobs) ? raw.jobs : [];
        this.state.logs = Array.isArray(raw.logs) ? raw.logs : [];
      }
    } catch (err) {
      this.state.logs = [{ at: Date.now(), level: "warn", text: `Durum dosyası okunamadı, sıfırlandı: ${err.message}` }];
    }
    // Yeniden başlatmada yarım kalan işler duraklatılır (kullanıcı devam ettirir).
    for (const job of this.state.jobs) {
      if (job.status === "running" || job.status === "typing" || job.status === "waiting") {
        job.status = "paused";
        job.pauseReason = "Relay yeniden başladı";
        for (const stage of job.stages) if (stage.status === "typing" || stage.status === "waiting") stage.status = "paused";
      }
    }
    return this;
  }

  save() {
    if (this._saveTimer) return;
    this._saveTimer = setTimeout(() => {
      this._saveTimer = null;
      try {
        fs.mkdirSync(path.dirname(this.file), { recursive: true });
        const tmp = `${this.file}.tmp`;
        fs.writeFileSync(tmp, JSON.stringify(this.state, null, 2));
        fs.renameSync(tmp, this.file);
      } catch (err) {
        this.emit("log", { level: "error", text: `Durum kaydedilemedi: ${err.message}` });
      }
    }, 120);
  }

  log(level, text) {
    const entry = { at: Date.now(), level, text };
    this.state.logs.push(entry);
    if (this.state.logs.length > this.maxLogs) this.state.logs.splice(0, this.state.logs.length - this.maxLogs);
    this.emit("log", entry);
    this.save();
    return entry;
  }

  /** SSE/istemci için hafif anlık görüntü. */
  snapshot() {
    return { jobs: this.state.jobs, logs: this.state.logs, stats: this.state.stats };
  }
}
