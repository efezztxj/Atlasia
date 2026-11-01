/**
 * Atlasia — moderasyon eylemleri (F2-1a).
 *
 * NEDEN VAR: `Explorer.tsx` içinde on adet `useCallback` (rapor durumu, ban,
 * ban kaldırma, uyarı, içerik kaldırma, itiraz kararı, duyuru oluştur/sil,
 * itiraz gönder, hedef geçmişi) tek bir blokta duruyordu. Hepsi aynı sözleşmeyi
 * paylaşır: **yetki istemcide değil, Firestore kurallarında**; bu kanca yalnız
 * çağrıyı yapar ve denetim kaydı için `logModAction` bırakır.
 *
 * KORUNAN DAVRANIŞ (birebir):
 *  · Oturum yoksa `handleReportStatus` hata atar (sessizce geçmez).
 *  · "actioned" olmayan raporda raporlayana **tek** bildirim gider; bildirim
 *    hatası akışı kesmez, yalnız konsola yazılır.
 *  · Ban/uyarı hedefi: `targetOwnerUid` → yoksa `targetType === "user"` ise
 *    `targetId`; hiçbiri yoksa eylem reddedilir (Türkçe gerekçeyle).
 *  · `logModAction` yalnız durum/ban/kaldırma için yazılır — uyarı kitaplığı
 *    kendi kaydını tutar.
 */
import { useCallback } from "react";
import {
  banUser,
  createAnnouncement,
  createAppeal,
  deleteAnnouncement,
  fetchTargetHistory,
  liftBan,
  logModAction,
  notifyReportActioned,
  resolveAppeal,
  setReportStatus,
  takedownReportTarget,
  warnUser,
  type AppealStatus,
  type BanDuration,
  type Report,
  type ReportStatus,
  type TargetHistory,
} from "../lib/moderation";

export interface ModerationActionsArgs {
  /** Oturum sahibi; yoksa rapor durumu değiştirilemez. */
  uid: string | undefined;
  /** Yönetim panelinin eldeki kuyruğu (raporlayana bildirim için). */
  queue: Report[];
}

/** Raporun sahibini bulur: önce `targetOwnerUid`, sonra "user" raporlarında `targetId`. */
function reportTarget(report: Report): string | undefined {
  return report.targetOwnerUid ?? (report.targetType === "user" ? report.targetId : undefined);
}

export interface ModerationActions {
  handleReportStatus: (reportId: string, status: ReportStatus, note?: string) => Promise<void>;
  handleBan: (report: Report, days: BanDuration, reason: string) => Promise<void>;
  handleLiftBan: (uid: string) => Promise<void>;
  handleWarn: (report: Report, reason: string) => Promise<void>;
  handleTakedown: (report: Report) => Promise<void>;
  handleResolveAppeal: (appealId: string, status: Exclude<AppealStatus, "open">) => Promise<void>;
  handleCreateAnnouncement: (title: string, body: string) => Promise<void>;
  handleDeleteAnnouncement: (announcementId: string) => Promise<void>;
  handleAppeal: (message: string) => Promise<void>;
  handleFetchHistory: (uid: string) => Promise<TargetHistory>;
}

export function useModerationActions({ uid, queue }: ModerationActionsArgs): ModerationActions {
  const handleReportStatus = useCallback(async (reportId: string, status: ReportStatus, note?: string) => {
    if (!uid) throw new Error("Oturum bulunamadı.");
    await setReportStatus(reportId, status, uid, note);
    void logModAction({ action: "report_status", reportId, detail: status });
    if (status === "actioned") {
      const report = queue.find((item) => item.id === reportId);
      if (report && report.status !== "actioned") {
        void notifyReportActioned(report, uid).catch((error) => {
          console.warn("[Atlasia] Rapor sonucu bildirimi gönderilemedi:", error);
        });
      }
    }
  }, [uid, queue]);

  const handleBan = useCallback(async (report: Report, days: BanDuration, reason: string) => {
    const target = reportTarget(report);
    if (!target) throw new Error("Bu raporun sahibi belirlenemedi; ban atılamaz.");
    await banUser({ uid: target, reason, reportId: report.id, days });
    void logModAction({ action: "ban", targetType: report.targetType, targetId: report.targetId, targetOwnerUid: target, reportId: report.id, detail: reason });
  }, []);

  const handleLiftBan = useCallback(async (targetUid: string) => {
    await liftBan(targetUid);
    void logModAction({ action: "lift_ban", targetOwnerUid: targetUid });
  }, []);

  const handleWarn = useCallback(async (report: Report, reason: string) => {
    const target = reportTarget(report);
    if (!target) throw new Error("Bu raporun sahibi belirlenemedi; uyarı gönderilemez.");
    await warnUser({ uid: target, reason, reportId: report.id });
  }, []);

  const handleTakedown = useCallback(async (report: Report) => {
    await takedownReportTarget(report);
    // İçerik gittiyse rapor da kapanır: durum + raporlayana bildirim.
    await handleReportStatus(report.id, "actioned", "İçerik kalıcı olarak kaldırıldı.");
  }, [handleReportStatus]);

  const handleResolveAppeal = useCallback(async (appealId: string, status: Exclude<AppealStatus, "open">) => {
    await resolveAppeal(appealId, status);
  }, []);

  const handleCreateAnnouncement = useCallback(async (title: string, body: string) => {
    await createAnnouncement(title, body);
  }, []);

  const handleDeleteAnnouncement = useCallback(async (announcementId: string) => {
    await deleteAnnouncement(announcementId);
  }, []);

  const handleAppeal = useCallback(async (message: string) => {
    await createAppeal(message);
  }, []);

  const handleFetchHistory = useCallback((targetUid: string) => fetchTargetHistory(targetUid), []);

  return {
    handleReportStatus,
    handleBan,
    handleLiftBan,
    handleWarn,
    handleTakedown,
    handleResolveAppeal,
    handleCreateAnnouncement,
    handleDeleteAnnouncement,
    handleAppeal,
    handleFetchHistory,
  };
}
