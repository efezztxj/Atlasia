import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Ban as BanIcon, Check, Flag, History, Loader2, Megaphone, ShieldCheck, Trash2, X } from "lucide-react";
import { usePanelAccess } from "../hooks/usePanelAccess";
import { cn } from "../utils/cn";
import { relativeTime } from "../utils/time";
import {
  BAN_DURATIONS, BAN_REASON_MAX, BAN_REASON_MIN, REPORT_TARGET_TYPES, WARNING_REASON_MAX, WARNING_REASON_MIN, isBanActive,
  type Announcement, type Appeal, type AppealStatus, type Ban, type BanDuration, type ModAction,
  type Report, type ReportStatus, type TargetHistory,
} from "../lib/moderation";

const STATUS_LABEL: Record<ReportStatus, string> = { open: "İnceleniyor", reviewed: "İncelendi", actioned: "İşlem yapıldı" };
const RED_BADGE = "border-red-300/30 bg-red-400/10 text-red-200";
const STATUS_CLASS: Record<ReportStatus, string> = {
  open: "border-sun/30 bg-sun/10 text-sun",
  reviewed: "border-white/15 bg-white/[0.06] text-mint/80",
  actioned: "border-leaf/35 bg-leaf/10 text-leaf",
};
const REASON_LABEL: Record<string, string> = {
  spam: "Spam / reklam", harassment: "Taciz / zorbalık", hate: "Nefret söylemi",
  misinfo: "Yanlış bilgi", privacy: "Gizlilik ihlali", other: "Diğer",
};
const DURATION_LABEL: Record<BanDuration, string> = { 7: "7 gün", 30: "30 gün", 90: "90 gün", 0: "Kalıcı" };
const ACTION_LABEL: Record<string, string> = {
  report_status: "Durum değişikliği", warn: "Uyarı gönderildi", takedown: "İçerik kalıcı silindi",
  ban: "Askıya alma", lift_ban: "Ban kaldırıldı", announcement: "Duyuru yayınlandı",
};
const APPEAL_STATUS_LABEL: Record<AppealStatus, string> = { open: "Yeni", seen: "Görüldü", accepted: "Kabul edildi", rejected: "Reddedildi" };
const TARGET_LABEL: Record<string, string> = { place: "İz", post: "Gönderi", story: "Hikâye", user: "Kullanıcı" };

export type ReviewedKind = "takedown" | "ban" | "warn" | "reviewed";
const REVIEWED_KIND_ORDER: readonly ReviewedKind[] = ["takedown", "ban", "warn", "reviewed"];
const REVIEWED_KIND_META: Record<ReviewedKind, { title: string; badge: string; badgeClass: string }> = {
  takedown: { title: "Kalıcı Silinenler", badge: "Kalıcı silindi", badgeClass: RED_BADGE },
  ban: { title: "Askıya Alınanlar", badge: "Askıya alındı", badgeClass: RED_BADGE },
  warn: { title: "Uyarı Verilenler", badge: "Uyarı gönderildi", badgeClass: STATUS_CLASS.open },
  reviewed: { title: "İncelenip Kapatılanlar", badge: "İncelendi", badgeClass: STATUS_CLASS.reviewed },
};

function targetOwnerOf(report: Report): string | undefined {
  return report.targetOwnerUid ?? (report.targetType === "user" ? report.targetId : undefined);
}

function matchesReportFilter(report: Report, targetFilter: "all" | Report["targetType"], needle: string): boolean {
  return (targetFilter === "all" || report.targetType === targetFilter) && (!needle || [
    report.id, report.targetId, report.reporterUid, report.details, report.resolution,
    REASON_LABEL[report.reason], TARGET_LABEL[report.targetType],
  ].join(" ").toLocaleLowerCase("tr-TR").includes(needle));
}

function classifyResolvedReport(
  report: Report, modActions: ModAction[], bans: Ban[],
): { primary: ReviewedKind; badges: ReviewedKind[] } {
  const res = (report.resolution ?? "").toLocaleLowerCase("tr-TR");
  const acts = new Set(modActions.filter((m) => m.reportId === report.id).map((m) => m.action));
  const takedown = acts.has("takedown") || res.includes("kalıcı olarak kaldırıldı");
  const ban = acts.has("ban") || bans.some((b) => b.reportId === report.id) || res.includes("askıya alındı");
  const warn = acts.has("warn") || res.includes("uyarı gönderildi");
  const badges: ReviewedKind[] = [];
  if (takedown) badges.push("takedown");
  if (ban) badges.push("ban");
  if (warn) badges.push("warn");
  if (!badges.length) badges.push("reviewed");
  return { primary: ban ? "ban" : takedown ? "takedown" : warn ? "warn" : "reviewed", badges };
}

type Tab = "mine" | "queue" | "reviewed" | "appeals" | "log" | "announce" | "dash" | "users";
const NAV_ICON: Record<Tab, string> = { dash: "📊", queue: "🚩", reviewed: "✅", appeals: "✉️", users: "👥", log: "🧾", announce: "📣", mine: "🙋" };
const PILL_BTN = "min-h-9 rounded-full border border-white/15 px-3 text-[12px] text-mint/85 disabled:opacity-40";
const CARD_CLS = "rounded-2xl border border-white/10 bg-white/[0.03] p-3";
const INPUT_CLS = "w-full rounded-xl border border-white/12 bg-ink px-3 py-2 text-[13px] text-mint outline-none";
const LABEL_CLS = "block text-[11px] font-semibold text-mint/60";
const BADGE_CLS = "rounded-full border px-2 py-0.5 text-[11px] font-semibold";
const RED_BOX = "rounded-xl border border-red-300/20 bg-red-400/10 p-2.5";

function formatBanEnd(ban: Ban): string {
  return ban.expiresAt ? new Date(ban.expiresAt).toLocaleDateString("tr-TR") : "kalıcı";
}

interface Props {
  open: boolean;
  onClose: () => void;
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
  open, onClose, admin = false, uid, moderator, myReports, myReportsError,
  queue, queueLoading, queueError, onStatus, bans, onBan, onLiftBan, onWarn, onTakedown,
  appeals, onResolveAppeal, modActions, announcements, onCreateAnnouncement, onDeleteAnnouncement, onFetchHistory,
}: Props) {
  const panelRef = usePanelAccess(open, onClose, true);
  const [tab, setTab] = useState<Tab>("mine");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ id: string; kind: "note" | "warn" | "takedown" | "ban"; text: string } | null>(null);
  const [banDays, setBanDays] = useState<BanDuration>(30);
  const [banAlsoTakedown, setBanAlsoTakedown] = useState(true);
  const [targetFilter, setTargetFilter] = useState<"all" | Report["targetType"]>("all");
  const [reviewedKindFilter, setReviewedKindFilter] = useState<"all" | ReviewedKind>("all");
  const [search, setSearch] = useState("");
  const [hist, setHist] = useState<{ uid: string; data: TargetHistory | null; busy: boolean } | null>(null);
  const [ann, setAnn] = useState({ title: "", body: "" });

  useEffect(() => { setTab(admin && moderator ? "dash" : "mine"); }, [admin, moderator]);

  const userRows = useMemo(() => {
    const map = new Map<string, { uid: string; reportCount: number; ban?: Ban }>();
    const get = (u: string) => { const r = map.get(u) ?? { uid: u, reportCount: 0 }; map.set(u, r); return r; };
    for (const r of queue) { const u = targetOwnerOf(r); if (u) get(u).reportCount += 1; }
    for (const b of bans) get(b.uid).ban = b;
    return [...map.values()].sort((a, b) => b.reportCount - a.reportCount);
  }, [queue, bans]);

  const pendingQueue = useMemo(() => queue.filter((r) => r.status === "open"), [queue]);
  const resolvedQueue = useMemo(
    () => queue.filter((r) => r.status !== "open").map((report) => ({ report, ...classifyResolvedReport(report, modActions, bans) })),
    [queue, modActions, bans],
  );

  const openCount = pendingQueue.length;
  const resolvedCount = resolvedQueue.length;
  const openAppeals = useMemo(() => appeals.filter((a) => a.status === "open").length, [appeals]);
  const needle = search.trim().toLocaleLowerCase("tr-TR");
  const visiblePending = useMemo(() => pendingQueue.filter((r) => matchesReportFilter(r, targetFilter, needle)), [pendingQueue, targetFilter, needle]);
  const filteredResolved = useMemo(
    () => resolvedQueue.filter((e) => (reviewedKindFilter === "all" || e.primary === reviewedKindFilter) && matchesReportFilter(e.report, targetFilter, needle)),
    [resolvedQueue, reviewedKindFilter, targetFilter, needle],
  );
  const kindCounts = useMemo(() => {
    const counts: Record<ReviewedKind, number> = { takedown: 0, ban: 0, warn: 0, reviewed: 0 };
    for (const item of resolvedQueue) counts[item.primary] += 1;
    return counts;
  }, [resolvedQueue]);

  if (!open) return null;

  const run = async (key: string, fn: () => Promise<void>, fallback: string) => {
    setBusyId(key);
    setActionError(null);
    try { await fn(); } catch (error) { setActionError((error as Error)?.message || fallback); } finally { setBusyId(null); }
  };

  const toggleDraft = (id: string, kind: "note" | "warn" | "takedown" | "ban", text = "") =>
    setDraft(draft?.id === id && draft.kind === kind ? null : { id, kind, text });

  const act = (reportId: string, status: ReportStatus, text?: string) =>
    run(reportId, async () => { await onStatus(reportId, status, text); setDraft(null); }, "Rapor güncellenemedi.");

  const toggleHistory = async (ownerUid: string) => {
    if (hist?.uid === ownerUid) { setHist(null); return; }
    setHist({ uid: ownerUid, data: null, busy: true });
    try { setHist({ uid: ownerUid, data: await onFetchHistory(ownerUid), busy: false }); } catch (error) { setHist(null); setActionError((error as Error)?.message || "Geçmiş okunamadı."); }
  };

  const renderHistory = (ownerUid: string) =>
    hist?.uid === ownerUid ? (
      <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[12px] leading-relaxed text-mint/75">
        {hist.busy ? (
          <span className="flex items-center gap-2"><Loader2 className="size-3.5 animate-spin" />Geçmiş okunuyor…</span>
        ) : hist.data ? (
          <p>
            Bu kullanıcı aleyhinde <strong className="text-mint">{hist.data.reports.length}</strong> rapor,{" "}
            <strong className="text-mint">{hist.data.warningCount}</strong> uyarı var.{" "}
            {hist.data.ban
              ? `Ban kaydı: ${!isBanActive(hist.data.ban) ? "süresi dolmuş" : hist.data.ban.expiresAt ? `${formatBanEnd(hist.data.ban)} tarihine kadar etkin` : "kalıcı"} — ${hist.data.ban.reason}`
              : "Ban kaydı yok."}
          </p>
        ) : null}
      </div>
    ) : null;

  const renderActionItem = (action: ModAction, showActors: boolean) => (
    <li key={action.id} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
      <p className="text-[13px] font-semibold text-mint">
        {ACTION_LABEL[action.action] ?? action.action}
        {!showActors && <span className="ml-2 font-mono text-[11px] font-normal text-mint/45">{relativeTime(action.createdAt)}</span>}
      </p>
      {showActors && (
        <p className="mt-0.5 font-mono text-[11px] text-mint/45">
          {relativeTime(action.createdAt)} · yapan: {action.actorUid.slice(0, 8)}…
          {action.targetOwnerUid ? ` · hedef: ${action.targetOwnerUid.slice(0, 8)}…` : ""}
        </p>
      )}
      {action.detail && <p className="mt-1 text-[12px] leading-relaxed text-mint/70">{action.detail}</p>}
    </li>
  );

  const emptyNote = (text: string) => <p className="mt-10 text-center text-[13px] leading-relaxed text-mint/65">{text}</p>;
  const historyBtn = (ownerUid: string) => (
    <button type="button" onClick={() => void toggleHistory(ownerUid)} className="flex min-h-9 items-center gap-1.5 rounded-full px-3 text-[12px] text-mint/70 hover:bg-white/5">
      <History className="size-3.5" />Geçmiş
    </button>
  );

  const renderReportCard = (report: Report, mode: "mine" | "queue" | "reviewed", badges?: ReviewedKind[]) => {
    const ownerUid = targetOwnerOf(report);
    const activeBan = ownerUid ? bans.find((ban) => ban.uid === ownerUid) : undefined;
    const activeBanBlock = activeBan && ownerUid ? (
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[12px] text-red-200">
          Askıda: {formatBanEnd(activeBan)}{mode === "queue" ? ` · ${activeBan.reason}` : ""}
        </span>
        <button type="button" disabled={busyId === report.id} onClick={() => void run(report.id, () => onLiftBan(ownerUid), "Askı kaldırılamadı.")} className={PILL_BTN}>
          Banı kaldır
        </button>
      </div>
    ) : null;

    return (
      <li key={report.id} className={CARD_CLS}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[13px] font-semibold text-mint">
            {TARGET_LABEL[report.targetType] ?? report.targetType} · {REASON_LABEL[report.reason] ?? report.reason}
          </p>
          {mode === "reviewed" && badges ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {badges.map((k) => <span key={k} className={cn(BADGE_CLS, REVIEWED_KIND_META[k].badgeClass)}>{REVIEWED_KIND_META[k].badge}</span>)}
            </div>
          ) : (
            <span className={cn(BADGE_CLS, STATUS_CLASS[report.status])}>{STATUS_LABEL[report.status]}</span>
          )}
        </div>
        <p className="mt-1 font-mono text-[11px] text-mint/45">
          #{report.id.slice(0, 10)} · {relativeTime(mode === "reviewed" ? (report.reviewedAt ?? report.createdAt) : report.createdAt)}
          {mode !== "mine" && report.reporterUid ? ` · raporlayan: ${report.reporterUid.slice(0, 8)}` : ""}
        </p>
        {report.details && <p className="mt-2 text-[13px] leading-relaxed text-mint/75">{report.details}</p>}
        {report.resolution && <p className="mt-2 rounded-lg bg-leaf/10 px-2.5 py-1.5 text-[12px] leading-relaxed text-leaf/90">Moderatör notu: {report.resolution}</p>}

        {mode === "reviewed" && ownerUid && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            {ownerUid !== uid && historyBtn(ownerUid)}
            {activeBanBlock}
          </div>
        )}

        {mode === "queue" && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" disabled={busyId === report.id} onClick={() => void act(report.id, "reviewed")} className={cn("flex min-h-10 items-center gap-1.5", PILL_BTN)}>
              {busyId === report.id ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}İncelendi (Kapat)
            </button>
            <button type="button" onClick={() => toggleDraft(report.id, "note", report.resolution ?? "")} className="flex min-h-9 items-center gap-1.5 rounded-full px-3 text-[12px] text-mint/70 hover:bg-white/5">
              <AlertTriangle className="size-3.5" />Not
            </button>
            {ownerUid && ownerUid !== uid && historyBtn(ownerUid)}
          </div>
        )}

        {mode !== "mine" && ownerUid && renderHistory(ownerUid)}

        {mode === "queue" && ownerUid && ownerUid !== uid && (
          <div className="mt-3 space-y-2">
            <div className="rounded-xl border border-sun/25 bg-sun/10 p-2.5">
              <button type="button" onClick={() => toggleDraft(report.id, "warn")} className="text-[12px] font-semibold text-sun">
                {draft?.id === report.id && draft.kind === "warn" ? "Vazgeç" : "Uyarı gönder"}
              </button>
              {draft?.id === report.id && draft.kind === "warn" && (
                <div className="mt-2 space-y-2">
                  <label className={LABEL_CLS} htmlFor={`warn-${report.id}`}>
                    Uyarı gerekçesi ({WARNING_REASON_MIN}–{WARNING_REASON_MAX} karakter)
                  </label>
                  <textarea id={`warn-${report.id}`} value={draft.text} maxLength={WARNING_REASON_MAX} rows={2} onChange={(e) => setDraft({ ...draft, text: e.target.value })} className={cn(INPUT_CLS, "focus:border-sun/50")} />
                  <button
                    type="button"
                    disabled={busyId === report.id || draft.text.trim().length < WARNING_REASON_MIN}
                    onClick={() =>
                      void run(report.id, async () => {
                        await onStatus(report.id, "actioned", `Uyarı gönderildi: ${draft.text.trim()}`.slice(0, 480));
                        await onWarn(report, draft.text);
                        setDraft(null);
                      }, "Uyarı gönderilemedi.")
                    }
                    className="min-h-9 w-full rounded-full bg-sun px-4 text-[12px] font-semibold text-ink disabled:opacity-40"
                  >
                    Uyarıyı gönder
                  </button>
                </div>
              )}
            </div>

            {report.targetType !== "user" && (
              <div className={RED_BOX}>
                {draft?.id === report.id && draft.kind === "takedown" ? (
                  <>
                    <p className="text-[12px] leading-relaxed text-red-200">İçerik <strong>kalıcı olarak silinecek</strong> ve rapor İncelenenler bölümüne geçecek.</p>
                    <div className="mt-2 flex gap-2">
                      <button type="button" onClick={() => setDraft(null)} className={cn("flex-1", PILL_BTN)}>Vazgeç</button>
                      <button
                        type="button"
                        disabled={busyId === report.id}
                        onClick={() => void run(report.id, async () => { await onTakedown(report); setDraft(null); }, "İçerik silinemedi.")}
                        className="flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-red-300/90 px-3 text-[12px] font-semibold text-ink disabled:opacity-40"
                      >
                        <Trash2 className="size-3.5" />Kalıcı sil
                      </button>
                    </div>
                  </>
                ) : (
                  <button type="button" onClick={() => toggleDraft(report.id, "takedown")} className="flex items-center gap-1.5 text-[12px] font-semibold text-red-200">
                    <Trash2 className="size-3.5" />İçeriği kalıcı sil
                  </button>
                )}
              </div>
            )}

            <div className={RED_BOX}>
              {activeBanBlock ?? (
                <>
                  <button
                    type="button"
                    onClick={() => { toggleDraft(report.id, "ban"); setBanAlsoTakedown(report.targetType !== "user"); }}
                    className="flex items-center gap-1.5 text-[12px] font-semibold text-red-200"
                  >
                    <BanIcon className="size-3.5" />{draft?.id === report.id && draft.kind === "ban" ? "Vazgeç" : "Hesabı askıya al"}
                  </button>
                  {draft?.id === report.id && draft.kind === "ban" && (
                    <div className="mt-2 space-y-2">
                      <label className={LABEL_CLS} htmlFor={`dur-${report.id}`}>Süre</label>
                      <select id={`dur-${report.id}`} value={banDays} onChange={(e) => setBanDays(Number(e.target.value) as BanDuration)} className="min-h-9 w-full rounded-xl border border-white/12 bg-ink px-2 text-[12px] text-mint">
                        {BAN_DURATIONS.map((d) => <option key={d} value={d}>{DURATION_LABEL[d]}</option>)}
                      </select>
                      <label className={LABEL_CLS} htmlFor={`ban-${report.id}`}>
                        Gerekçe ({BAN_REASON_MIN}–{BAN_REASON_MAX} karakter)
                      </label>
                      <textarea id={`ban-${report.id}`} value={draft.text} maxLength={BAN_REASON_MAX} rows={2} onChange={(e) => setDraft({ ...draft, text: e.target.value })} className={cn(INPUT_CLS, "focus:border-red-300/50")} />
                      {report.targetType !== "user" && (
                        <label className="flex items-center gap-2 text-[12px] text-mint/80">
                          <input type="checkbox" checked={banAlsoTakedown} onChange={(e) => setBanAlsoTakedown(e.target.checked)} />
                          İçeriği de kalıcı sil
                        </label>
                      )}
                      <button
                        type="button"
                        disabled={busyId === report.id || draft.text.trim().length < BAN_REASON_MIN}
                        onClick={() =>
                          void run(report.id, async () => {
                            const withTakedown = report.targetType !== "user" && banAlsoTakedown;
                            if (withTakedown) await onTakedown(report);
                            await onStatus(
                              report.id,
                              "actioned",
                              `${withTakedown ? "İçerik kalıcı olarak kaldırıldı · " : ""}Hesap askıya alındı (${DURATION_LABEL[banDays]}): ${draft.text.trim()}`.slice(0, 480),
                            );
                            await onBan(report, banDays, draft.text);
                            setDraft(null);
                          }, "Askıya alma kaydedilemedi.")
                        }
                        className="min-h-9 w-full rounded-full bg-red-300/90 px-4 text-[12px] font-semibold text-ink disabled:opacity-40"
                      >
                        Askıya al
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {mode === "queue" && draft?.id === report.id && draft.kind === "note" && (
          <form className="mt-2" onSubmit={(e) => { e.preventDefault(); void act(report.id, "reviewed", draft.text); }}>
            <label className={LABEL_CLS} htmlFor={`note-${report.id}`}>Moderatör notu (en fazla 500 karakter)</label>
            <textarea id={`note-${report.id}`} value={draft.text} maxLength={500} rows={2} onChange={(e) => setDraft({ ...draft, text: e.target.value })} className={cn(INPUT_CLS, "mt-1 focus:border-sun/50")} />
            <div className="mt-2 flex justify-end gap-2">
              <button type="button" onClick={() => setDraft(null)} className="min-h-9 rounded-full px-3 text-[12px] text-mint/60">Vazgeç</button>
              <button type="submit" disabled={busyId === report.id} className="min-h-9 rounded-full bg-sun px-4 text-[12px] font-semibold text-ink disabled:opacity-50">Kaydet</button>
            </div>
          </form>
        )}
      </li>
    );
  };

  const tabs: Array<[Tab, string]> = admin && moderator
    ? [
        ["dash", "Kontrol Paneli"],
        ["queue", openCount > 0 ? `Kuyruk · ${openCount}` : "Kuyruk"],
        ["reviewed", resolvedCount > 0 ? `İncelenenler · ${resolvedCount}` : "İncelenenler"],
        ["appeals", openAppeals > 0 ? `İtirazlar · ${openAppeals}` : "İtirazlar"],
        ["users", "Kullanıcılar"],
        ["log", "Kayıtlar"],
        ["announce", "Duyurular"],
        ["mine", "Raporlarım"],
      ]
    : [["mine", "Raporlarım"]];

  return (
    <div className={admin ? "fixed inset-0 z-[68] flex bg-[#041d17]" : "fixed inset-0 z-[68] flex justify-end bg-black/40"}>
      {!admin && <button type="button" className="absolute inset-0" onClick={onClose} aria-label="Raporlar panelini kapat" />}
      {admin && moderator && (
        <nav aria-label="Yönetim menüsü" className="flex w-14 shrink-0 flex-col border-r border-white/10 bg-ink py-3 md:w-[220px]">
          <p className="px-3 pb-3 text-center font-display text-[13px] font-bold tracking-wide text-mint md:px-4 md:text-left">
            🌍<span className="hidden md:inline"> ATLASİA</span>
            <span className="mt-0.5 hidden text-[10px] font-semibold tracking-[0.2em] text-mint/45 md:block">YÖNETİM</span>
          </p>
          {tabs.map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={tab === id}
              onClick={() => setTab(id)}
              className={cn("flex min-h-11 items-center justify-center gap-2 px-2 text-[13px] font-semibold transition md:justify-start md:px-4", tab === id ? "bg-sun/15 text-sun" : "text-mint/65 hover:bg-white/5")}
            >
              <span aria-hidden="true">{NAV_ICON[id]}</span><span className="hidden md:inline">{label}</span>
            </button>
          ))}
          <p className="mt-auto hidden px-4 pt-4 text-[10px] leading-relaxed text-mint/40 md:block">Yetki sunucu kurallarındadır; bu ekran yalnız arayüzdür.</p>
        </nav>
      )}
      <aside
        ref={panelRef as React.RefObject<HTMLElement>}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reports-title"
        className={admin ? "relative flex h-dvh min-w-0 flex-1 flex-col overflow-hidden bg-[#041d17]" : "relative flex h-dvh w-full max-w-[440px] flex-col overflow-hidden border-l border-leaf/20 bg-[#041d17] shadow-2xl"}
      >
        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <h2 id="reports-title" className="flex items-center gap-2 font-display text-base font-semibold text-mint">
            <Flag className="size-4 text-sun" />{admin && moderator ? "Yönetim Paneli" : "Raporlar"}
          </h2>
          <button type="button" onClick={onClose} aria-label="Kapat" className="grid size-9 place-items-center rounded-full text-mint/70 hover:bg-white/5">
            <X className="size-4" />
          </button>
        </header>

        {moderator && tab === "queue" && (
          <p className="mx-4 mt-3 rounded-xl border border-leaf/20 bg-leaf/[0.06] px-3 py-2 text-[11px] leading-relaxed text-mint/70">
            <ShieldCheck className="mr-1 inline size-3.5 text-leaf" />
            Bekleyen raporlar buradadır. İşlem tamamlandığında rapor <strong>İncelenenler</strong> bölümüne taşınır.
          </p>
        )}

        {actionError && <p role="alert" className="mx-4 mt-3 text-[12px] text-red-300">{actionError}</p>}

        <div className="thin-scroll flex-1 overflow-y-auto px-4 py-4">
          {tab === "dash" && moderator ? (
            <div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {[
                  { label: "Bekleyen Rapor", value: openCount, target: "queue" as Tab, tone: STATUS_CLASS.open },
                  { label: "İncelenen Rapor", value: resolvedCount, target: "reviewed" as Tab, tone: "border-white/15 bg-white/[0.05] text-mint" },
                  { label: "Aktif Ban", value: bans.length, target: "users" as Tab, tone: RED_BADGE },
                  { label: "Bekleyen İtiraz", value: openAppeals, target: "appeals" as Tab, tone: "border-white/15 bg-white/[0.05] text-mint" },
                  { label: "Duyuru", value: announcements.length, target: "announce" as Tab, tone: "border-leaf/30 bg-leaf/10 text-leaf" },
                  { label: "İşlem Kaydı", value: modActions.length, target: "log" as Tab, tone: "border-white/15 bg-white/[0.05] text-mint" },
                ].map((c) => (
                  <button key={c.label} type="button" onClick={() => setTab(c.target)} className={cn("rounded-2xl border p-4 text-left transition", c.tone)}>
                    <span className="block font-display text-3xl font-bold">{c.value}</span>
                    <span className="mt-1 block text-[12px] font-semibold opacity-80">{c.label} →</span>
                  </button>
                ))}
              </div>
              <h3 className="mt-5 mb-2 text-[13px] font-semibold text-mint">Son işlemler</h3>
              {modActions.length === 0 ? <p className="text-[13px] text-mint/60">Henüz işlem kaydı yok.</p> : <ul className="space-y-2">{modActions.slice(0, 5).map((a) => renderActionItem(a, false))}</ul>}
            </div>
          ) : tab === "users" && moderator ? (
            userRows.length === 0 ? emptyNote("Kuyrukta hedef kullanıcı yok.") : (
              <ul className="space-y-2">
                {userRows.map((row) => (
                  <li key={row.uid} className={CARD_CLS}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-mono text-[12px] text-mint">{row.uid.slice(0, 12)}…</p>
                      {row.ban
                        ? <span className={cn(BADGE_CLS, RED_BADGE)}>Askıda · {formatBanEnd(row.ban)}</span>
                        : <span className={cn(BADGE_CLS, "border-white/15 text-mint/70")}>Ban yok</span>}
                    </div>
                    <p className="mt-1 text-[12px] text-mint/70">Aleyhinde <strong className="text-mint">{row.reportCount}</strong> rapor (kuyruk penceresi içinde)</p>
                    <button type="button" onClick={() => void toggleHistory(row.uid)} className={cn("mt-2 flex items-center gap-1.5", PILL_BTN)}>
                      <History className="size-3.5" />Geçmişi göster
                    </button>
                    {renderHistory(row.uid)}
                  </li>
                ))}
              </ul>
            )
          ) : tab === "appeals" && moderator ? (
            appeals.length === 0 ? emptyNote("Bekleyen itiraz yok.") : (
              <ul className="space-y-3">
                {appeals.map((appeal) => {
                  const activeBan = bans.find((ban) => ban.uid === appeal.uid);
                  return (
                    <li key={appeal.id} className={CARD_CLS}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-mono text-[11px] text-mint/45">kullanıcı: {appeal.uid.slice(0, 8)}… · {relativeTime(appeal.createdAt)}</p>
                        <span className={cn(BADGE_CLS, "border-white/15 text-mint/80")}>{APPEAL_STATUS_LABEL[appeal.status]}</span>
                      </div>
                      <p className="mt-2 text-[13px] leading-relaxed text-mint/80">{appeal.message}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(["seen", "accepted", "rejected"] as const).map((status) => (
                          <button key={status} type="button" disabled={busyId === appeal.id || appeal.status === status} onClick={() => void run(appeal.id, () => onResolveAppeal(appeal.id, status), "İtiraz güncellenemedi.")} className={PILL_BTN}>
                            {status === "seen" ? "Görüldü" : status === "accepted" ? "Kabul et" : "Reddet"}
                          </button>
                        ))}
                        {activeBan && (
                          <button type="button" disabled={busyId === appeal.id} onClick={() => void run(appeal.id, () => onLiftBan(appeal.uid), "Askı kaldırılamadı.")} className="min-h-9 rounded-full border border-red-300/30 px-3 text-[12px] font-semibold text-red-200 disabled:opacity-40">
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
            modActions.length === 0 ? emptyNote("Henüz işlem kaydı yok.") : <ul className="space-y-2">{modActions.map((a) => renderActionItem(a, true))}</ul>
          ) : tab === "announce" && moderator ? (
            <div>
              <form
                onSubmit={(e) => { e.preventDefault(); void run("announce-new", async () => { await onCreateAnnouncement(ann.title, ann.body); setAnn({ title: "", body: "" }); }, "Duyuru yayınlanamadı."); }}
                className={CARD_CLS}
              >
                <p className="flex items-center gap-2 text-[13px] font-semibold text-mint"><Megaphone className="size-4 text-leaf" />Yeni duyuru</p>
                <label className={cn("mt-3", LABEL_CLS)} htmlFor="ann-title">Başlık</label>
                <input id="ann-title" value={ann.title} maxLength={120} onChange={(e) => setAnn({ ...ann, title: e.target.value })} className="mt-1 min-h-10 w-full rounded-xl border border-white/12 bg-ink px-3 text-[13px] text-mint outline-none focus:border-leaf/50" />
                <label className={cn("mt-3", LABEL_CLS)} htmlFor="ann-body">Metin</label>
                <textarea id="ann-body" value={ann.body} maxLength={1000} rows={3} onChange={(e) => setAnn({ ...ann, body: e.target.value })} className={cn(INPUT_CLS, "mt-1 focus:border-leaf/50")} />
                <button type="submit" disabled={busyId === "announce-new" || !ann.title.trim() || !ann.body.trim()} className="mt-3 min-h-10 w-full rounded-full bg-leaf px-4 text-[13px] font-semibold text-ink disabled:opacity-40">
                  {busyId === "announce-new" ? "Yayınlanıyor…" : "Yayınla"}
                </button>
              </form>
              <ul className="mt-3 space-y-2">
                {announcements.map((a) => (
                  <li key={a.id} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[13px] font-semibold text-mint">{a.title}</p>
                        <p className="mt-0.5 text-[12px] leading-relaxed text-mint/70">{a.body}</p>
                        <p className="mt-1 font-mono text-[11px] text-mint/45">{relativeTime(a.createdAt)}</p>
                      </div>
                      <button type="button" disabled={busyId === a.id} onClick={() => void run(a.id, () => onDeleteAnnouncement(a.id), "Duyuru silinemedi.")} className={cn("shrink-0", PILL_BTN)}>Sil</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <>
              {tab === "reviewed" && moderator && (
                <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="İşlem türüne göre ayır">
                  {([["all", `Tümü · ${resolvedCount}`] as const, ...REVIEWED_KIND_ORDER.map((k) => [k, `${REVIEWED_KIND_META[k].title} · ${kindCounts[k]}`] as const)]).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={reviewedKindFilter === id}
                      onClick={() => setReviewedKindFilter(id)}
                      className={cn("min-h-9 rounded-full border px-3 text-[12px] font-semibold transition", reviewedKindFilter === id ? "border-sun/30 bg-sun/15 text-sun" : "border-white/15 text-mint/75 hover:bg-white/5")}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {(tab === "queue" || tab === "reviewed") && moderator && (
                <div className="mb-3 flex gap-2">
                  <label className="sr-only" htmlFor="report-target-filter">İçerik türüne göre süz</label>
                  <select id="report-target-filter" value={targetFilter} onChange={(e) => setTargetFilter(e.target.value as "all" | Report["targetType"])} className="min-h-10 rounded-xl border border-white/12 bg-ink px-2 text-[12px] text-mint">
                    <option value="all">Tüm içerik türleri</option>
                    {REPORT_TARGET_TYPES.map((t) => <option key={t} value={t}>{TARGET_LABEL[t]}</option>)}
                  </select>
                  <label className="sr-only" htmlFor="queue-search">Kuyrukta ara</label>
                  <input id="queue-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ara: kimlik, neden, not…" className="min-h-10 min-w-0 flex-1 rounded-xl border border-white/12 bg-ink px-3 text-[12px] text-mint outline-none focus:border-sun/50" />
                </div>
              )}

              {(tab === "mine" ? myReportsError : queueError) && (
                <p role="alert" className="rounded-xl border border-red-300/25 bg-red-400/10 px-3 py-2 text-[12px] text-red-200">
                  {tab === "mine" ? myReportsError : queueError}
                </p>
              )}

              {tab === "reviewed" && moderator ? (
                !queueError && filteredResolved.length === 0 ? (
                  emptyNote("Bu türde henüz incelenmiş rapor yok.")
                ) : (
                  <div className="space-y-5">
                    {(reviewedKindFilter === "all" ? REVIEWED_KIND_ORDER : [reviewedKindFilter]).map((kind) => {
                      const items = filteredResolved.filter((e) => e.primary === kind);
                      return items.length === 0 ? null : (
                        <section key={kind} aria-label={REVIEWED_KIND_META[kind].title}>
                          <h3 className="mb-2 flex items-center justify-between text-[12px] font-semibold text-mint/80">
                            <span>{REVIEWED_KIND_META[kind].title}</span>
                            <span className="font-mono text-[11px] text-mint/50">{items.length}</span>
                          </h3>
                          <ul className="space-y-3">{items.map((e) => renderReportCard(e.report, "reviewed", e.badges))}</ul>
                        </section>
                      );
                    })}
                  </div>
                )
              ) : (
                <>
                  {!(tab === "queue" ? queueError : myReportsError) && (tab === "queue" ? visiblePending : myReports).length === 0 &&
                    emptyNote(tab === "queue"
                      ? resolvedCount > 0 ? "Bekleyen açık rapor kalmadı. Tamamlanan işlemleri “İncelenenler” bölümünde görebilirsin." : "Bekleyen rapor yok."
                      : "Henüz rapor göndermedin. Bir gönderideki ⋯ menüsünden “Bildir” seçeneğini kullanabilirsin.")}
                  <ul className="space-y-3">{(tab === "queue" ? visiblePending : myReports).map((r) => renderReportCard(r, tab === "queue" ? "queue" : "mine"))}</ul>
                  {moderator && tab === "queue" && queueLoading && (
                    <p className="mt-4 flex items-center justify-center gap-2 text-[12px] text-mint/50"><Loader2 className="size-4 animate-spin" />Kuyruk yükleniyor…</p>
                  )}
                </>
              )}
            </>
          )}
        </div>

        <footer className="border-t border-white/10 px-4 py-3 text-[11px] leading-relaxed text-mint/45">
          Sonuç raporlayana bildirim olarak gider; tüm işlemler kayıt altına alınır.
          {!moderator && <> Moderatör erişimi Firebase Console'da <span className="font-mono">moderators/{uid.slice(0, 8)}…</span> belgesiyle verilir.</>}
        </footer>
      </aside>
    </div>
  );
}
