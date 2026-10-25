import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, CheckCheck, Flag, Loader2, ShieldCheck, X } from "lucide-react";
import { usePanelAccess } from "../hooks/usePanelAccess";
import { cn } from "../utils/cn";
import { relativeTime } from "../utils/time";
import type { Report, ReportStatus } from "../lib/moderation";

/**
 * Raporlar paneli (denetim K-07 / AY-03'ün istemci yüzü).
 *
 * İki görünüm var:
 *  1. **Raporlarım** — her kullanıcı kendi raporlarını ve durumunu görür.
 *     Kural bunu bugün de destekliyor (`reports` list: `reporterUid == uid`).
 *  2. **Kuyruk** — yalnız `moderators/{uid}` belgesi olan hesapta görünür.
 *     Moderatör belgesi istemciden yazılamaz; Firebase Console'da elle
 *     oluşturulur. Kural dağıtılmamışsa erişim sorgusu `false` döner ve bu
 *     sekme hiç görünmez (fail-closed).
 */
const STATUS_LABEL: Record<ReportStatus, string> = {
  open: "İnceleniyor",
  reviewed: "İncelendi",
  actioned: "İşlem yapıldı",
};

const STATUS_CLASS: Record<ReportStatus, string> = {
  open: "border-sun/30 bg-sun/10 text-sun",
  reviewed: "border-white/15 bg-white/[0.06] text-mint/80",
  actioned: "border-leaf/35 bg-leaf/10 text-leaf",
};

const REASON_LABEL: Record<string, string> = {
  spam: "Spam / reklam",
  harassment: "Taciz / zorbalık",
  hate: "Nefret söylemi",
  misinfo: "Yanlış bilgi",
  privacy: "Gizlilik ihlali",
  other: "Diğer",
};

const TARGET_LABEL: Record<string, string> = {
  place: "İz",
  post: "Gönderi",
  story: "Hikâye",
  user: "Kullanıcı",
};

function StatusBadge({ status }: { status: ReportStatus }) {
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", STATUS_CLASS[status])}>
      {STATUS_LABEL[status]}
    </span>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
  uid: string;
  /** Moderatör kuyruğu açılabiliyor mu? */
  moderator: boolean;
  myReports: Report[];
  myReportsError: string | null;
  queue: Report[];
  queueLoading: boolean;
  queueError: string | null;
  onStatus: (reportId: string, status: ReportStatus, note?: string) => Promise<void>;
}

export default function ReportsPanel({
  open,
  onClose,
  uid,
  moderator,
  myReports,
  myReportsError,
  queue,
  queueLoading,
  queueError,
  onStatus,
}: Props) {
  const panelRef = usePanelAccess(open, onClose, true);
  const [tab, setTab] = useState<"mine" | "queue">("mine");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!moderator) setTab("mine");
  }, [moderator]);

  const openCount = useMemo(() => queue.filter((report) => report.status === "open").length, [queue]);
  if (!open) return null;

  const act = async (reportId: string, status: ReportStatus, text?: string) => {
    setBusyId(reportId);
    setActionError(null);
    try {
      await onStatus(reportId, status, text);
      setNoteFor(null);
      setNote("");
    } catch (error) {
      setActionError((error as Error)?.message || "Rapor güncellenemedi.");
    } finally {
      setBusyId(null);
    }
  };

  const reports = tab === "queue" ? queue : myReports;
  const error = tab === "queue" ? queueError : myReportsError;

  return (
    <div className="fixed inset-0 z-[68] flex justify-end bg-black/40">
      <button type="button" className="absolute inset-0" onClick={onClose} aria-label="Raporlar panelini kapat" />
      <aside
        ref={panelRef as React.RefObject<HTMLElement>}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reports-title"
        className="relative flex h-dvh w-full max-w-[440px] flex-col overflow-hidden border-l border-leaf/20 bg-[#041d17] shadow-2xl"
      >
        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <h2 id="reports-title" className="flex items-center gap-2 font-display text-base font-semibold text-mint">
            <Flag className="size-4 text-sun" />Raporlar
          </h2>
          <button type="button" onClick={onClose} aria-label="Kapat" className="grid size-9 place-items-center rounded-full text-mint/70 hover:bg-white/5">
            <X className="size-4" />
          </button>
        </header>

        {moderator && (
          <nav aria-label="Rapor görünümü" className="flex gap-1 border-b border-white/10 px-3 py-2">
            {([
              ["mine", "Raporlarım"],
              ["queue", openCount > 0 ? `Kuyruk · ${openCount}` : "Kuyruk"],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={tab === id}
                onClick={() => setTab(id)}
                className={cn(
                  "min-h-10 rounded-full px-3 text-[13px] font-semibold transition",
                  tab === id ? "bg-sun/15 text-sun" : "text-mint/70 hover:bg-white/5",
                )}
              >
                {label}
              </button>
            ))}
          </nav>
        )}

        {moderator && tab === "queue" && (
          <p className="mx-4 mt-3 rounded-xl border border-leaf/20 bg-leaf/[0.06] px-3 py-2 text-[11px] leading-relaxed text-mint/70">
            <ShieldCheck className="mr-1 inline size-3.5 text-leaf" />
            Kuyruk yalnız moderatör hesabında görünür. İçerik alanları değiştirilemez; yalnız durum ve not yazılır.
          </p>
        )}

        {actionError && <p role="alert" className="mx-4 mt-3 text-[12px] text-red-300">{actionError}</p>}

        <div className="thin-scroll flex-1 overflow-y-auto px-4 py-4">
          {error && <p role="alert" className="rounded-xl border border-red-300/25 bg-red-400/10 px-3 py-2 text-[12px] text-red-200">{error}</p>}
          {!error && reports.length === 0 && (
            <p className="mt-10 text-center text-[13px] leading-relaxed text-mint/65">
              {tab === "queue" ? "Bekleyen rapor yok." : "Henüz rapor göndermedin. Bir gönderideki ⋯ menüsünden “Bildir” seçeneğini kullanabilirsin."}
            </p>
          )}

          <ul className="space-y-3">
            {reports.map((report) => (
              <li key={report.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-semibold text-mint">
                    {TARGET_LABEL[report.targetType] ?? report.targetType} · {REASON_LABEL[report.reason] ?? report.reason}
                  </p>
                  <StatusBadge status={report.status} />
                </div>
                <p className="mt-1 font-mono text-[11px] text-mint/45">
                  #{report.id.slice(0, 10)} · {relativeTime(report.createdAt)}
                  {tab === "queue" && report.reporterUid ? ` · raporlayan: ${report.reporterUid.slice(0, 8)}` : ""}
                </p>
                {report.details && <p className="mt-2 text-[12.5px] leading-relaxed text-mint/75">{report.details}</p>}
                {report.resolution && (
                  <p className="mt-2 rounded-lg bg-leaf/[0.08] px-2.5 py-1.5 text-[12px] leading-relaxed text-leaf/90">
                    Moderatör notu: {report.resolution}
                  </p>
                )}

                {tab === "queue" && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={busyId === report.id || report.status === "reviewed"}
                      onClick={() => void act(report.id, "reviewed")}
                      className="flex min-h-10 items-center gap-1.5 rounded-full border border-white/15 px-3 text-[12px] text-mint/85 disabled:opacity-40"
                    >
                      {busyId === report.id ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}İncelendi
                    </button>
                    <button
                      type="button"
                      disabled={busyId === report.id || report.status === "actioned"}
                      onClick={() => void act(report.id, "actioned")}
                      className="flex min-h-10 items-center gap-1.5 rounded-full border border-leaf/35 px-3 text-[12px] font-semibold text-leaf disabled:opacity-40"
                    >
                      <CheckCheck className="size-3.5" />İşlem yapıldı
                    </button>
                    <button
                      type="button"
                      onClick={() => { setNoteFor(report.id === noteFor ? null : report.id); setNote(report.resolution ?? ""); }}
                      className="flex min-h-10 items-center gap-1.5 rounded-full px-3 text-[12px] text-mint/70 hover:bg-white/5"
                    >
                      <AlertTriangle className="size-3.5" />Not
                    </button>
                  </div>
                )}

                {tab === "queue" && noteFor === report.id && (
                  <form
                    className="mt-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void act(report.id, report.status === "open" ? "reviewed" : report.status, note);
                    }}
                  >
                    <label className="block text-[11px] font-semibold text-mint/60" htmlFor={`note-${report.id}`}>
                      Moderatör notu (en fazla 500 karakter)
                    </label>
                    <textarea
                      id={`note-${report.id}`}
                      value={note}
                      maxLength={500}
                      rows={2}
                      onChange={(event) => setNote(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-white/12 bg-ink px-3 py-2 text-[12.5px] text-mint outline-none focus:border-sun/50"
                    />
                    <div className="mt-2 flex justify-end gap-2">
                      <button type="button" onClick={() => setNoteFor(null)} className="min-h-9 rounded-full px-3 text-[12px] text-mint/60">Vazgeç</button>
                      <button type="submit" disabled={busyId === report.id} className="min-h-9 rounded-full bg-sun px-4 text-[12px] font-semibold text-ink disabled:opacity-50">
                        Kaydet
                      </button>
                    </div>
                  </form>
                )}
              </li>
            ))}
          </ul>

          {moderator && tab === "queue" && queueLoading && (
            <p className="mt-4 flex items-center justify-center gap-2 text-[12px] text-mint/50"><Loader2 className="size-4 animate-spin" />Kuyruk yükleniyor…</p>
          )}
        </div>

        <footer className="border-t border-white/10 px-4 py-3 text-[11px] leading-relaxed text-mint/45">
          Bildirimler inceleme sonrası moderasyon ekibine iletilir. Rapor durumu değişince raporlayan kendi listesinde görür.
          {!moderator && <> Moderatör erişimi Firebase Console'da <span className="font-mono">moderators/{uid.slice(0, 8)}…</span> belgesiyle verilir.</>}
        </footer>
      </aside>
    </div>
  );
}
