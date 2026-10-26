import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Ban as BanIcon, Check, CheckCheck, Flag, History, Loader2, Megaphone, ShieldCheck, Trash2, X } from "lucide-react";
import { usePanelAccess } from "../hooks/usePanelAccess";
import { cn } from "../utils/cn";
import { relativeTime } from "../utils/time";
import {
  BAN_DURATIONS, BAN_REASON_MAX, BAN_REASON_MIN, WARNING_REASON_MAX, WARNING_REASON_MIN, isBanActive,
  type Announcement, type Appeal, type AppealStatus, type Ban, type BanDuration, type ModAction,
  type Report, type ReportStatus, type TargetHistory,
} from "../lib/moderation";

/**
 * Raporlar + moderasyon paneli — ayrıcalıklı yönetim yüzeyi.
 *
 * Görünümler:
 *  1. **Raporlarım** — herkes kendi raporlarının durumunu görür.
 *  2. **Kuyruk** — yalnız moderatör (`moderators/{uid}`, Console'da elle).
 *     Kademeli yaptırım: uyarı → içerik kaldırma (kalıcı) → askıya alma.
 *     Kuyruk filtrelenebilir/aranabilir; hedef geçmişi karttan açılır.
 *  3. **İtirazlar** — ban itirazları; kabul ayrı, ban kaldırma ayrı yazılır.
 *  4. **Kayıtlar** — moderatör işlem günlüğü (`modActions`, değiştirilemez).
 *  5. **Duyurular** — moderatör duyurusu yaz/sil.
 *
 * Yetki istemcide değil `firestore.rules`'tadır; bu panel yalnız arayüzdür.
 * Kural dağıtılmamışsa kuyruk sekmesi hiç görünmez (fail-closed).
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

const DURATION_LABEL: Record<BanDuration, string> = {
  7: "7 gün",
  30: "30 gün",
  90: "90 gün",
  0: "Kalıcı",
};

const ACTION_LABEL: Record<string, string> = {
  report_status: "Durum değişikliği",
  warn: "Uyarı gönderildi",
  takedown: "İçerik kalıcı silindi",
  ban: "Askıya alma",
  lift_ban: "Ban kaldırıldı",
  announcement: "Duyuru yayınlandı",
};

const APPEAL_STATUS_LABEL: Record<AppealStatus, string> = {
  open: "Yeni",
  seen: "Görüldü",
  accepted: "Kabul edildi",
  rejected: "Reddedildi",
};

/** Raporun sahibi: içerik raporlarında `targetOwnerUid`, kullanıcı raporunda hedef kimliği. */
function targetOwnerOf(report: Report): string | undefined {
  if (report.targetOwnerUid) return report.targetOwnerUid;
  return report.targetType === "user" ? report.targetId : undefined;
}

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

type Tab = "mine" | "queue" | "appeals" | "log" | "announce" | "dash" | "users";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Tam ekran Yönetim Paneli düzeni (sol menü + gösterge paneli). Yalnız moderatörde anlamlı. */
  admin?: boolean;
  uid: string;
  moderator: boolean;
  myReports: Report[];
  myReportsError: string | null;
  queue: Report[];
  queueLoading: boolean;
  queueError: string | null;
  onStatus: (reportId: string, status: ReportStatus, note?: string) => Promise<void>;
  bans: Ban[];
  onBan: (report: Report, days: BanDuration, reason: string) => Promise<void>;
  onLiftBan: (uid: string) => Promise<void>;
  onWarn: (report: Report, reason: string) => Promise<void>;
  onTakedown: (report: Report) => Promise<void>;
  appeals: Appeal[];
  onResolveAppeal: (appealId: string, status: Exclude<AppealStatus, "open">) => Promise<void>;
  modActions: ModAction[];
  announcements: Announcement[];
  onCreateAnnouncement: (title: string, body: string) => Promise<void>;
  onDeleteAnnouncement: (announcementId: string) => Promise<void>;
  onFetchHistory: (uid: string) => Promise<TargetHistory>;
}

export default function ReportsPanel({
  open,
  onClose,
  admin = false,
  uid,
  moderator,
  myReports,
  myReportsError,
  queue,
  queueLoading,
  queueError,
  onStatus,
  bans,
  onBan,
  onLiftBan,
  onWarn,
  onTakedown,
  appeals,
  onResolveAppeal,
  modActions,
  announcements,
  onCreateAnnouncement,
  onDeleteAnnouncement,
  onFetchHistory,
}: Props) {
  const panelRef = usePanelAccess(open, onClose, true);
  const [tab, setTab] = useState<Tab>("mine");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [banFor, setBanFor] = useState<string | null>(null);
  const [banDays, setBanDays] = useState<BanDuration>(30);
  const [banReason, setBanReason] = useState("");
  const [warnFor, setWarnFor] = useState<string | null>(null);
  const [warnReason, setWarnReason] = useState("");
  const [takedownFor, setTakedownFor] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | ReportStatus>("all");
  const [search, setSearch] = useState("");
  const [historyFor, setHistoryFor] = useState<string | null>(null);
  const [history, setHistory] = useState<TargetHistory | null>(null);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [annTitle, setAnnTitle] = useState("");
  const [annBody, setAnnBody] = useState("");

  useEffect(() => {
    if (!moderator && tab !== "mine") setTab("mine");
  }, [moderator, tab]);

  useEffect(() => {
    if (admin && moderator) setTab("dash");
  }, [admin, moderator]);

  // Kullanıcılar görünümü: kuyruktaki rapor sahipleri + ban kayıtları.
  const userRows = useMemo(() => {
    const map = new Map<string, { uid: string; reportCount: number; ban?: Ban }>();
    for (const report of queue) {
      const owner = targetOwnerOf(report);
      if (!owner) continue;
      const row = map.get(owner) ?? { uid: owner, reportCount: 0 };
      row.reportCount += 1;
      map.set(owner, row);
    }
    for (const ban of bans) {
      const row = map.get(ban.uid) ?? { uid: ban.uid, reportCount: 0 };
      row.ban = ban;
      map.set(ban.uid, row);
    }
    return [...map.values()].sort((a, b) => b.reportCount - a.reportCount);
  }, [queue, bans]);

  const openCount = useMemo(() => queue.filter((report) => report.status === "open").length, [queue]);
  const openAppeals = useMemo(() => appeals.filter((appeal) => appeal.status === "open").length, [appeals]);
  const visibleQueue = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("tr-TR");
    return queue.filter((report) => {
      if (statusFilter !== "all" && report.status !== statusFilter) return false;
      if (!needle) return true;
      return [report.targetId, report.reporterUid, report.details ?? "", REASON_LABEL[report.reason] ?? ""]
        .some((value) => value.toLocaleLowerCase("tr-TR").includes(needle));
    });
  }, [queue, statusFilter, search]);

  if (!open) return null;

  const run = async (key: string, fn: () => Promise<void>, fallback: string) => {
    setBusyId(key);
    setActionError(null);
    try {
      await fn();
    } catch (error) {
      setActionError((error as Error)?.message || fallback);
    } finally {
      setBusyId(null);
    }
  };

  const act = (reportId: string, status: ReportStatus, text?: string) =>
    run(reportId, async () => {
      await onStatus(reportId, status, text);
      setNoteFor(null);
      setNote("");
    }, "Rapor güncellenemedi.");

  const toggleHistory = async (ownerUid: string) => {
    if (historyFor === ownerUid) {
      setHistoryFor(null);
      setHistory(null);
      return;
    }
    setHistoryFor(ownerUid);
    setHistory(null);
    setHistoryBusy(true);
    try {
      setHistory(await onFetchHistory(ownerUid));
    } catch (error) {
      setActionError((error as Error)?.message || "Geçmiş okunamadı.");
    } finally {
      setHistoryBusy(false);
    }
  };

  const reports = tab === "queue" ? visibleQueue : myReports;
  const error = tab === "queue" ? queueError : myReportsError;

  const tabs: Array<[Tab, string]> = moderator
    ? admin
      ? [
          ["dash", "Kontrol Paneli"],
          ["queue", openCount > 0 ? `Kuyruk · ${openCount}` : "Kuyruk"],
          ["appeals", openAppeals > 0 ? `İtirazlar · ${openAppeals}` : "İtirazlar"],
          ["users", "Kullanıcılar"],
          ["log", "Kayıtlar"],
          ["announce", "Duyurular"],
          ["mine", "Raporlarım"],
        ]
      : [
          ["mine", "Raporlarım"],
          ["queue", openCount > 0 ? `Kuyruk · ${openCount}` : "Kuyruk"],
          ["appeals", openAppeals > 0 ? `İtirazlar · ${openAppeals}` : "İtirazlar"],
          ["log", "Kayıtlar"],
          ["announce", "Duyurular"],
        ]
    : [["mine", "Raporlarım"]];

  return (
    <div className={admin ? "fixed inset-0 z-[68] flex bg-[#041d17]" : "fixed inset-0 z-[68] flex justify-end bg-black/40"}>
      {!admin && <button type="button" className="absolute inset-0" onClick={onClose} aria-label="Raporlar panelini kapat" />}
      {admin && moderator && (
        <nav aria-label="Yönetim menüsü" className="flex w-14 shrink-0 flex-col border-r border-white/10 bg-[#03130e] py-3 md:w-[220px]">
          <p className="px-3 pb-3 text-center font-display text-[13px] font-bold tracking-wide text-mint md:px-4 md:text-left">
            🌍<span className="hidden md:inline"> ATLASİA</span>
            <span className="mt-0.5 hidden text-[9px] font-semibold tracking-[0.2em] text-mint/45 md:block">YÖNETİM</span>
          </p>
          {tabs.map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={tab === id}
              onClick={() => setTab(id)}
              className={cn(
                "flex min-h-11 items-center justify-center gap-2 px-2 text-[13px] font-semibold transition md:justify-start md:px-4",
                tab === id ? "bg-sun/15 text-sun" : "text-mint/65 hover:bg-white/5",
              )}
            >
              <span aria-hidden="true">{id === "dash" ? "📊" : id === "queue" ? "🚩" : id === "appeals" ? "✉️" : id === "users" ? "👥" : id === "log" ? "🧾" : id === "announce" ? "📣" : "🙋"}</span>
              <span className="hidden md:inline">{label}</span>
            </button>
          ))}
          <p className="mt-auto hidden px-4 pt-4 text-[10.5px] leading-relaxed text-mint/40 md:block">
            Yetki sunucu kurallarındadır; bu ekran yalnız arayüzdür.
          </p>
        </nav>
      )}
      <aside
        ref={panelRef as React.RefObject<HTMLElement>}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reports-title"
        className={admin
          ? "relative flex h-dvh min-w-0 flex-1 flex-col overflow-hidden bg-[#041d17]"
          : "relative flex h-dvh w-full max-w-[440px] flex-col overflow-hidden border-l border-leaf/20 bg-[#041d17] shadow-2xl"}
      >
        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <h2 id="reports-title" className="flex items-center gap-2 font-display text-base font-semibold text-mint">
            <Flag className="size-4 text-sun" />{admin ? "Yönetim Paneli" : moderator ? "Moderasyon" : "Raporlar"}
          </h2>
          <button type="button" onClick={onClose} aria-label="Kapat" className="grid size-9 place-items-center rounded-full text-mint/70 hover:bg-white/5">
            <X className="size-4" />
          </button>
        </header>

        {moderator && !admin && (
          <nav aria-label="Moderasyon görünümü" className="flex flex-wrap gap-1 border-b border-white/10 px-3 py-2">
            {tabs.map(([id, label]) => (
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
            Yaptırım sırası: uyarı → içerik kaldırma → askıya alma. Bütün işlemler sunucu kurallarına ve işlem kaydına bağlıdır.
          </p>
        )}

        {actionError && <p role="alert" className="mx-4 mt-3 text-[12px] text-red-300">{actionError}</p>}

        <div className="thin-scroll flex-1 overflow-y-auto px-4 py-4">
          {tab === "dash" && moderator ? (
            <div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                {[
                  { label: "Bekleyen Rapor", value: openCount, target: "queue" as Tab, tone: "border-sun/30 bg-sun/10 text-sun" },
                  { label: "Kuyruktaki Rapor", value: queue.length, target: "queue" as Tab, tone: "border-white/15 bg-white/[0.05] text-mint" },
                  { label: "Aktif Ban", value: bans.length, target: "users" as Tab, tone: "border-red-300/30 bg-red-400/10 text-red-200" },
                  { label: "Bekleyen İtiraz", value: openAppeals, target: "appeals" as Tab, tone: "border-white/15 bg-white/[0.05] text-mint" },
                  { label: "Duyuru", value: announcements.length, target: "announce" as Tab, tone: "border-leaf/30 bg-leaf/10 text-leaf" },
                  { label: "İşlem Kaydı", value: modActions.length, target: "log" as Tab, tone: "border-white/15 bg-white/[0.05] text-mint" },
                ].map((card) => (
                  <button
                    key={card.label}
                    type="button"
                    onClick={() => setTab(card.target)}
                    className={cn("rounded-2xl border p-4 text-left transition hover:brightness-125", card.tone)}
                  >
                    <span className="block font-display text-3xl font-bold">{card.value}</span>
                    <span className="mt-1 block text-[12px] font-semibold opacity-85">{card.label} →</span>
                  </button>
                ))}
              </div>

              <h3 className="mt-5 mb-2 text-[13px] font-semibold text-mint">Son işlemler</h3>
              {modActions.length === 0 ? (
                <p className="text-[12.5px] text-mint/60">Henüz işlem kaydı yok.</p>
              ) : (
                <ul className="space-y-2">
                  {modActions.slice(0, 5).map((action) => (
                    <li key={action.id} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                      <p className="text-[12.5px] font-semibold text-mint">{ACTION_LABEL[action.action] ?? action.action}
                        <span className="ml-2 font-mono text-[11px] font-normal text-mint/45">{relativeTime(action.createdAt)}</span>
                      </p>
                      {action.detail && <p className="mt-0.5 text-[12px] leading-relaxed text-mint/70">{action.detail}</p>}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-4 text-[11.5px] leading-relaxed text-mint/50">
                Yaptırım merdiveni: uyarı → içerik kaldırma → askıya alma. Karar öncesi hedefin geçmişini Kuyruk kartındaki “Geçmiş” ile gör.
              </p>
            </div>
          ) : tab === "users" && moderator ? (
            userRows.length === 0 ? (
              <p className="mt-10 text-center text-[13px] text-mint/65">Kuyrukta hedef kullanıcı yok.</p>
            ) : (
              <ul className="space-y-2">
                {userRows.map((row) => (
                  <li key={row.uid} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-mono text-[12px] text-mint">{row.uid.slice(0, 12)}…</p>
                      {row.ban
                        ? <span className="rounded-full border border-red-300/30 bg-red-400/10 px-2 py-0.5 text-[11px] font-semibold text-red-200">Askıda{row.ban.expiresAt ? ` · ${new Date(row.ban.expiresAt).toLocaleDateString("tr-TR")}` : " · kalıcı"}</span>
                        : <span className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] font-semibold text-mint/70">Ban yok</span>}
                    </div>
                    <p className="mt-1 text-[12px] text-mint/70">Aleyhinde <strong className="text-mint">{row.reportCount}</strong> rapor (kuyruk penceresi içinde)</p>
                    <button
                      type="button"
                      onClick={() => void toggleHistory(row.uid)}
                      className="mt-2 flex min-h-9 items-center gap-1.5 rounded-full border border-white/15 px-3 text-[11.5px] text-mint/85"
                    >
                      <History className="size-3.5" />Geçmişi göster
                    </button>
                    {historyFor === row.uid && (
                      <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[12px] leading-relaxed text-mint/75">
                        {historyBusy ? (
                          <span className="flex items-center gap-2"><Loader2 className="size-3.5 animate-spin" />Geçmiş okunuyor…</span>
                        ) : history ? (
                          <p>Toplam <strong className="text-mint">{history.reports.length}</strong> rapor, <strong className="text-mint">{history.warningCount}</strong> uyarı. {history.ban ? `Ban kaydı var: ${history.ban.reason}` : "Ban kaydı yok."}</p>
                        ) : null}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )
          ) : tab === "appeals" && moderator ? (
            appeals.length === 0 ? (
              <p className="mt-10 text-center text-[13px] text-mint/65">Bekleyen itiraz yok.</p>
            ) : (
              <ul className="space-y-3">
                {appeals.map((appeal) => {
                  const activeBan = bans.find((ban) => ban.uid === appeal.uid);
                  return (
                    <li key={appeal.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-mono text-[11px] text-mint/45">kullanıcı: {appeal.uid.slice(0, 8)}… · {relativeTime(appeal.createdAt)}</p>
                        <span className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] font-semibold text-mint/80">{APPEAL_STATUS_LABEL[appeal.status]}</span>
                      </div>
                      <p className="mt-2 text-[12.5px] leading-relaxed text-mint/80">{appeal.message}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(["seen", "accepted", "rejected"] as const).map((status) => (
                          <button
                            key={status}
                            type="button"
                            disabled={busyId === appeal.id || appeal.status === status}
                            onClick={() => void run(appeal.id, () => onResolveAppeal(appeal.id, status), "İtiraz güncellenemedi.")}
                            className="min-h-9 rounded-full border border-white/15 px-3 text-[11.5px] text-mint/85 disabled:opacity-40"
                          >
                            {status === "seen" ? "Görüldü" : status === "accepted" ? "Kabul et" : "Reddet"}
                          </button>
                        ))}
                        {activeBan && (
                          <button
                            type="button"
                            disabled={busyId === appeal.id}
                            onClick={() => void run(appeal.id, () => onLiftBan(appeal.uid), "Askı kaldırılamadı.")}
                            className="min-h-9 rounded-full border border-red-300/30 px-3 text-[11.5px] font-semibold text-red-200 disabled:opacity-40"
                          >
                            Banı kaldır
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )
          ) : tab === "log" && moderator ? (
            modActions.length === 0 ? (
              <p className="mt-10 text-center text-[13px] text-mint/65">Henüz işlem kaydı yok.</p>
            ) : (
              <ul className="space-y-2">
                {modActions.map((action) => (
                  <li key={action.id} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                    <p className="text-[12.5px] font-semibold text-mint">{ACTION_LABEL[action.action] ?? action.action}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-mint/45">
                      {relativeTime(action.createdAt)} · yapan: {action.actorUid.slice(0, 8)}…
                      {action.targetOwnerUid ? ` · hedef: ${action.targetOwnerUid.slice(0, 8)}…` : ""}
                    </p>
                    {action.detail && <p className="mt-1 text-[12px] leading-relaxed text-mint/70">{action.detail}</p>}
                  </li>
                ))}
              </ul>
            )
          ) : tab === "announce" && moderator ? (
            <div>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void run("announce-new", async () => {
                    await onCreateAnnouncement(annTitle, annBody);
                    setAnnTitle("");
                    setAnnBody("");
                  }, "Duyuru yayınlanamadı.");
                }}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"
              >
                <p className="flex items-center gap-2 text-[13px] font-semibold text-mint"><Megaphone className="size-4 text-leaf" />Yeni duyuru</p>
                <label className="mt-3 block text-[11px] font-semibold text-mint/60" htmlFor="ann-title">Başlık</label>
                <input
                  id="ann-title"
                  value={annTitle}
                  maxLength={120}
                  onChange={(event) => setAnnTitle(event.target.value)}
                  className="mt-1 min-h-10 w-full rounded-xl border border-white/12 bg-ink px-3 text-[13px] text-mint outline-none focus:border-leaf/50"
                />
                <label className="mt-3 block text-[11px] font-semibold text-mint/60" htmlFor="ann-body">Metin</label>
                <textarea
                  id="ann-body"
                  value={annBody}
                  maxLength={1000}
                  rows={3}
                  onChange={(event) => setAnnBody(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/12 bg-ink px-3 py-2 text-[13px] text-mint outline-none focus:border-leaf/50"
                />
                <button
                  type="submit"
                  disabled={busyId === "announce-new" || !annTitle.trim() || !annBody.trim()}
                  className="mt-3 min-h-10 w-full rounded-full bg-leaf px-4 text-[12.5px] font-semibold text-ink disabled:opacity-40"
                >
                  {busyId === "announce-new" ? "Yayınlanıyor…" : "Yayınla"}
                </button>
              </form>
              <ul className="mt-3 space-y-2">
                {announcements.map((announcement) => (
                  <li key={announcement.id} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[12.5px] font-semibold text-mint">{announcement.title}</p>
                        <p className="mt-0.5 text-[12px] leading-relaxed text-mint/70">{announcement.body}</p>
                        <p className="mt-1 font-mono text-[11px] text-mint/45">{relativeTime(announcement.createdAt)}</p>
                      </div>
                      <button
                        type="button"
                        disabled={busyId === announcement.id}
                        onClick={() => void run(announcement.id, () => onDeleteAnnouncement(announcement.id), "Duyuru silinemedi.")}
                        className="min-h-9 shrink-0 rounded-full border border-white/15 px-3 text-[11.5px] text-mint/85 disabled:opacity-40"
                      >
                        Sil
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <>
              {tab === "queue" && moderator && (
                <div className="mb-3 flex gap-2">
                  <label className="sr-only" htmlFor="queue-filter">Duruma göre süz</label>
                  <select
                    id="queue-filter"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as "all" | ReportStatus)}
                    className="min-h-10 rounded-xl border border-white/12 bg-ink px-2 text-[12px] text-mint"
                  >
                    <option value="all">Tüm durumlar</option>
                    <option value="open">İnceleniyor</option>
                    <option value="reviewed">İncelendi</option>
                    <option value="actioned">İşlem yapıldı</option>
                  </select>
                  <label className="sr-only" htmlFor="queue-search">Kuyrukta ara</label>
                  <input
                    id="queue-search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Ara: kimlik, neden, açıklama…"
                    className="min-h-10 min-w-0 flex-1 rounded-xl border border-white/12 bg-ink px-3 text-[12px] text-mint outline-none focus:border-sun/50"
                  />
                </div>
              )}

              {error && <p role="alert" className="rounded-xl border border-red-300/25 bg-red-400/10 px-3 py-2 text-[12px] text-red-200">{error}</p>}
              {!error && reports.length === 0 && (
                <p className="mt-10 text-center text-[13px] leading-relaxed text-mint/65">
                  {tab === "queue" ? "Bu süzgeçte rapor yok." : "Henüz rapor göndermedin. Bir gönderideki ⋯ menüsünden “Bildir” seçeneğini kullanabilirsin."}
                </p>
              )}

              <ul className="space-y-3">
                {reports.map((report) => {
                  const ownerUid = targetOwnerOf(report);
                  const activeBan = ownerUid ? bans.find((ban) => ban.uid === ownerUid) : undefined;
                  const warnEligible = report.status === "reviewed" || report.status === "actioned";
                  const banEligible = report.status === "actioned";
                  return (
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
                          {ownerUid && ownerUid !== uid && (
                            <button
                              type="button"
                              onClick={() => void toggleHistory(ownerUid)}
                              className="flex min-h-10 items-center gap-1.5 rounded-full px-3 text-[12px] text-mint/70 hover:bg-white/5"
                            >
                              <History className="size-3.5" />Geçmiş
                            </button>
                          )}
                        </div>
                      )}

                      {tab === "queue" && ownerUid && historyFor === ownerUid && (
                        <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[12px] leading-relaxed text-mint/75">
                          {historyBusy ? (
                            <span className="flex items-center gap-2"><Loader2 className="size-3.5 animate-spin" />Geçmiş okunuyor…</span>
                          ) : history ? (
                            <>
                              <p>Bu kullanıcı aleyhinde <strong className="text-mint">{history.reports.length}</strong> rapor, <strong className="text-mint">{history.warningCount}</strong> uyarı var.</p>
                              <p className="mt-0.5">
                                {history.ban
                                  ? `Ban kaydı: ${!isBanActive(history.ban) ? "süresi dolmuş" : history.ban.expiresAt ? `${new Date(history.ban.expiresAt).toLocaleDateString("tr-TR")} tarihine kadar etkin` : "kalıcı"} — ${history.ban.reason}`
                                  : "Ban kaydı yok."}
                              </p>
                            </>
                          ) : null}
                        </div>
                      )}

                      {tab === "queue" && ownerUid && ownerUid !== uid && (
                        <div className="mt-3 space-y-2">
                          <div className="rounded-xl border border-sun/25 bg-sun/[0.05] p-2.5">
                            {warnEligible ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => { setWarnFor(warnFor === report.id ? null : report.id); setWarnReason(""); }}
                                  className="text-[11.5px] font-semibold text-sun"
                                >
                                  {warnFor === report.id ? "Vazgeç" : "Uyarı gönder"}
                                </button>
                                {warnFor === report.id && (
                                  <div className="mt-2 space-y-2">
                                    <label className="block text-[11px] font-semibold text-mint/60" htmlFor={`warn-${report.id}`}>
                                      Uyarı gerekçesi ({WARNING_REASON_MIN}–{WARNING_REASON_MAX} karakter, kullanıcıya gösterilir)
                                    </label>
                                    <textarea
                                      id={`warn-${report.id}`}
                                      value={warnReason}
                                      maxLength={WARNING_REASON_MAX}
                                      rows={2}
                                      onChange={(event) => setWarnReason(event.target.value)}
                                      className="w-full rounded-xl border border-white/12 bg-ink px-3 py-2 text-[12.5px] text-mint outline-none focus:border-sun/50"
                                    />
                                    <button
                                      type="button"
                                      disabled={busyId === report.id || warnReason.trim().length < WARNING_REASON_MIN}
                                      onClick={() => void run(report.id, async () => { await onWarn(report, warnReason); setWarnFor(null); setWarnReason(""); }, "Uyarı gönderilemedi.")}
                                      className="min-h-9 w-full rounded-full bg-sun px-4 text-[12px] font-semibold text-ink disabled:opacity-40"
                                    >
                                      {busyId === report.id ? "Gönderiliyor…" : "Uyarıyı gönder"}
                                    </button>
                                  </div>
                                )}
                              </>
                            ) : (
                              <p className="text-[11px] leading-relaxed text-mint/50">Uyarı için önce raporu “İncelendi” olarak işaretle.</p>
                            )}
                          </div>

                          {report.targetType !== "user" && (
                            <div className="rounded-xl border border-red-300/20 bg-red-400/[0.04] p-2.5">
                              {takedownFor === report.id ? (
                                <>
                                  <p className="text-[11.5px] leading-relaxed text-red-200">Bu içerik <strong>kalıcı olarak silinecek</strong>. Geri alınamaz; kanıt yalnız işlem kaydında kalır.</p>
                                  <div className="mt-2 flex gap-2">
                                    <button type="button" onClick={() => setTakedownFor(null)} className="min-h-9 flex-1 rounded-full border border-white/15 px-3 text-[11.5px] text-mint/85">Vazgeç</button>
                                    <button
                                      type="button"
                                      disabled={busyId === report.id}
                                      onClick={() => void run(report.id, async () => { await onTakedown(report); setTakedownFor(null); }, "İçerik silinemedi.")}
                                      className="flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-red-300/90 px-3 text-[11.5px] font-semibold text-ink disabled:opacity-40"
                                    >
                                      <Trash2 className="size-3.5" />Kalıcı sil
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setTakedownFor(report.id)}
                                  className="flex items-center gap-1.5 text-[11.5px] font-semibold text-red-200"
                                >
                                  <Trash2 className="size-3.5" />İçeriği kalıcı sil
                                </button>
                              )}
                            </div>
                          )}

                          <div className="rounded-xl border border-red-300/20 bg-red-400/[0.06] p-2.5">
                            {activeBan ? (
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-[11.5px] leading-relaxed text-red-200">
                                  Askıda: {activeBan.expiresAt ? new Date(activeBan.expiresAt).toLocaleDateString("tr-TR") : "kalıcı"} · {activeBan.reason}
                                </p>
                                <button
                                  type="button"
                                  disabled={busyId === report.id}
                                  onClick={() => void run(report.id, () => onLiftBan(ownerUid), "Askı kaldırılamadı.")}
                                  className="min-h-9 rounded-full border border-white/15 px-3 text-[11.5px] text-mint/85 disabled:opacity-40"
                                >
                                  Banı kaldır
                                </button>
                              </div>
                            ) : banEligible ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => { setBanFor(banFor === report.id ? null : report.id); setBanReason(""); }}
                                  className="flex items-center gap-1.5 text-[11.5px] font-semibold text-red-200"
                                >
                                  <BanIcon className="size-3.5" />{banFor === report.id ? "Vazgeç" : "Hesabı askıya al"}
                                </button>
                                {banFor === report.id && (
                                  <div className="mt-2 space-y-2">
                                    <label className="block text-[11px] font-semibold text-mint/60" htmlFor={`dur-${report.id}`}>Süre</label>
                                    <select
                                      id={`dur-${report.id}`}
                                      value={banDays}
                                      onChange={(event) => setBanDays(Number(event.target.value) as BanDuration)}
                                      className="min-h-9 w-full rounded-xl border border-white/12 bg-ink px-2 text-[12px] text-mint"
                                    >
                                      {BAN_DURATIONS.map((days) => (
                                        <option key={days} value={days}>{DURATION_LABEL[days]}</option>
                                      ))}
                                    </select>
                                    <label className="block text-[11px] font-semibold text-mint/60" htmlFor={`ban-${report.id}`}>
                                      Gerekçe ({BAN_REASON_MIN}–{BAN_REASON_MAX} karakter, kullanıcıya gösterilir)
                                    </label>
                                    <textarea
                                      id={`ban-${report.id}`}
                                      value={banReason}
                                      maxLength={BAN_REASON_MAX}
                                      rows={2}
                                      onChange={(event) => setBanReason(event.target.value)}
                                      className="w-full rounded-xl border border-white/12 bg-ink px-3 py-2 text-[12.5px] text-mint outline-none focus:border-red-300/50"
                                    />
                                    <button
                                      type="button"
                                      disabled={busyId === report.id || banReason.trim().length < BAN_REASON_MIN}
                                      onClick={() => void run(report.id, async () => { await onBan(report, banDays, banReason); setBanFor(null); setBanReason(""); }, "Askıya alma kaydedilemedi.")}
                                      className="min-h-9 w-full rounded-full bg-red-300/90 px-4 text-[12px] font-semibold text-ink disabled:opacity-40"
                                    >
                                      {busyId === report.id ? "Kaydediliyor…" : "Askıya al"}
                                    </button>
                                  </div>
                                )}
                              </>
                            ) : (
                              <p className="text-[11px] leading-relaxed text-mint/50">
                                Askıya alma için önce raporu “İşlem yapıldı” olarak işaretle. Kural, banı bu işarete bağlar.
                              </p>
                            )}
                          </div>
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
                  );
                })}
              </ul>

              {moderator && tab === "queue" && queueLoading && (
                <p className="mt-4 flex items-center justify-center gap-2 text-[12px] text-mint/50"><Loader2 className="size-4 animate-spin" />Kuyruk yükleniyor…</p>
              )}
            </>
          )}
        </div>

        <footer className="border-t border-white/10 px-4 py-3 text-[11px] leading-relaxed text-mint/45">
          Yaptırım sırası: uyarı → içerik kaldırma → askıya alma. Sonuç, raporlayana bildirim olarak gider; bütün işlemler kayıt altına alınır.
          {!moderator && <> Moderatör erişimi Firebase Console'da <span className="font-mono">moderators/{uid.slice(0, 8)}…</span> belgesiyle verilir.</>}
        </footer>
      </aside>
    </div>
  );
}
