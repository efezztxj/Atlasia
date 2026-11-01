/**
 * Atlasia — moderasyon gelen kutusu (F1-3).
 *
 * NEDEN VAR: `Explorer.tsx` içinde moderasyonla ilgili **14 `useState`** ve
 * **8 abonelik efekti** vardı; hepsi aynı koşullara bağlıydı ama dosyanın dört
 * ayrı yerine dağılmıştı. Bu kanca kümeyi bir arada tutar: kuyruk, ban, uyarı,
 * itiraz, işlem kaydı, duyuru ve "raporlarım".
 *
 * KORUNAN DAVRANIŞ (birebir):
 *  · `moderators/{uid}` yoksa `moderator=false` (kural fail-closed).
 *  · Kuyruk **yalnız** Yönetim Paneli (`adminOpen`) açıkken dinlenir; "Raporlarım"
 *    çekmecesi moderatörde bile moderasyon verisi çekmez (kota + gizlilik).
 *  · Ban/uyarı/itiraz/işlem/duyuru abonelikleri oturum + bulut hesabı ister;
 *    cihaz hesabında hiçbiri bağlanmaz.
 *  · Her abonelikte `active` bayrağı: sökümden sonra gelen snapshot yazmaz.
 */
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import {
  fetchModeratorAccess,
  subscribeActiveBans,
  subscribeAnnouncements,
  subscribeAppeals,
  subscribeModActions,
  subscribeModerationQueue,
  subscribeMyAppeals,
  subscribeMyBan,
  subscribeMyReports,
  subscribeMyWarnings,
  type Announcement,
  type Appeal,
  type Ban,
  type ModAction,
  type Report,
  type Warning,
} from "../lib/moderation";
import { storageGet } from "../utils/storage";

/**
 * "Moderatör müyüm?" sorusu tek başına bir kanca: `Explorer`, bu bayrağı
 * Firestore veri kancasına parametre olarak verdiği için kümelerin en başında
 * bilinmesi gerekir (moderasyon gelen kutusundan ÖNCE).
 */
export function useModeratorAccess(uid: string | undefined, cloudEnabled: boolean) {
  const [moderator, setModerator] = useState(false);
  useEffect(() => {
    if (!cloudEnabled || !uid) { setModerator(false); return; }
    let active = true;
    void fetchModeratorAccess(uid).then((allowed) => {
      if (active) setModerator(allowed);
    });
    return () => { active = false; };
  }, [cloudEnabled, uid]);
  return { moderator, setModerator };
}

export interface ModerationInboxArgs {
  /** Oturum sahibi; yoksa hiçbir abonelik bağlanmaz. */
  uid: string | undefined;
  /** Bulut hesabı mı (cihaz hesabı Firestore'a giremez). */
  cloudEnabled: boolean;
  /** "Raporlarım" çekmecesi açık mı. */
  reportsOpen: boolean;
  /** Yönetim paneli açık mı. */
  adminOpen: boolean;
  /** `useModeratorAccess` sonucu (paylaşılan bayrak). */
  moderator: boolean;
  setModerator: Dispatch<SetStateAction<boolean>>;
}

export interface ModerationInbox {
  myReports: Report[];
  setMyReports: Dispatch<SetStateAction<Report[]>>;
  myReportsError: string | null;
  setMyReportsError: Dispatch<SetStateAction<string | null>>;
  queue: Report[];
  setQueue: Dispatch<SetStateAction<Report[]>>;
  queueLoading: boolean;
  queueError: string | null;
  bans: Ban[];
  myBan: Ban | null;
  myWarnings: Warning[];
  myAppeals: Appeal[];
  appeals: Appeal[];
  modActions: ModAction[];
  announcements: Announcement[];
  dismissedAnnouncement: string | null;
  setDismissedAnnouncement: Dispatch<SetStateAction<string | null>>;
}

export function useModerationInbox({ uid, cloudEnabled, reportsOpen, adminOpen, moderator, setModerator }: ModerationInboxArgs): ModerationInbox {
  const [myReports, setMyReports] = useState<Report[]>([]);
  const [myReportsError, setMyReportsError] = useState<string | null>(null);
  const [queue, setQueue] = useState<Report[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [bans, setBans] = useState<Ban[]>([]);
  const [myBan, setMyBan] = useState<Ban | null>(null);
  const [myWarnings, setMyWarnings] = useState<Warning[]>([]);
  const [myAppeals, setMyAppeals] = useState<Appeal[]>([]);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [modActions, setModActions] = useState<ModAction[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedAnnouncement, setDismissedAnnouncement] = useState<string | null>(() => storageGet("atlasia.announcement.dismissed"));

  useEffect(() => {
    if ((!reportsOpen && !adminOpen) || !cloudEnabled || !uid) return;
    let active = true;
    setMyReportsError(null);
    const unsub = subscribeMyReports(uid, (items) => {
      if (active) setMyReports(items);
    }, (error) => {
      if (active) setMyReportsError(error.message);
    });
    void fetchModeratorAccess(uid).then((allowed) => {
      if (active) setModerator(allowed);
    });
    return () => {
      active = false;
      unsub();
    };
  }, [reportsOpen, adminOpen, cloudEnabled, uid, setModerator]);

  // Kuyruk yalnız Yönetim Paneli açıkken dinlenir; çekmece ("Raporlarım")
  // moderatör hesabında bile moderasyon verisi çekmez.
  useEffect(() => {
    if (!adminOpen || !moderator || !cloudEnabled) return;
    let active = true;
    setQueueLoading(true);
    setQueueError(null);
    const unsub = subscribeModerationQueue((items) => {
      if (!active) return;
      setQueue(items);
      setQueueLoading(false);
    }, (error) => {
      if (!active) return;
      setQueueError(error.message);
      setQueueLoading(false);
    });
    return () => {
      active = false;
      unsub();
    };
  }, [adminOpen, moderator, cloudEnabled]);

  // Etkin askıya almalar: yalnız moderatörde dinlenir (kural listeyi ona açar).
  useEffect(() => {
    if (!moderator || !cloudEnabled) { setBans([]); return; }
    const unsub = subscribeActiveBans(setBans, (error) => {
      console.warn("[Atlasia] Askıya alma listesi okunamadı:", error);
    });
    return () => unsub();
  }, [moderator, cloudEnabled]);

  /**
   * Kendi askı durumum. Kural kullanıcıya yalnız kendi `bans/{uid}` belgesini
   * açar; süresi dolan ban istemcide de etkisiz sayılır (sunucu da öyle).
   */
  useEffect(() => {
    if (!uid || !cloudEnabled) { setMyBan(null); return; }
    const unsub = subscribeMyBan(uid, setMyBan, (error) => {
      console.warn("[Atlasia] Askı durumu okunamadı:", error);
    });
    return () => unsub();
  }, [uid, cloudEnabled]);

  // Kendi uyarılarım + itirazlarım (kademeli yaptırımın kullanıcı yüzü).
  useEffect(() => {
    if (!uid || !cloudEnabled) { setMyWarnings([]); setMyAppeals([]); return; }
    const unsubWarnings = subscribeMyWarnings(uid, setMyWarnings, (error) => {
      console.warn("[Atlasia] Uyarılar okunamadı:", error);
    });
    const unsubAppeals = subscribeMyAppeals(uid, setMyAppeals, (error) => {
      console.warn("[Atlasia] İtirazlar okunamadı:", error);
    });
    return () => { unsubWarnings(); unsubAppeals(); };
  }, [uid, cloudEnabled]);

  // Moderatör akışları: itiraz kuyruğu + işlem kaydı.
  useEffect(() => {
    if (!moderator || !cloudEnabled) { setAppeals([]); setModActions([]); return; }
    const unsubAppeals = subscribeAppeals(setAppeals, (error) => {
      console.warn("[Atlasia] İtiraz kuyruğu okunamadı:", error);
    });
    const unsubActions = subscribeModActions(setModActions, (error) => {
      console.warn("[Atlasia] İşlem kaydı okunamadı:", error);
    });
    return () => { unsubAppeals(); unsubActions(); };
  }, [moderator, cloudEnabled]);

  // Duyurular: giriş yapmış herkese açık okuma (kural da öyle).
  useEffect(() => {
    if (!uid || !cloudEnabled) { setAnnouncements([]); return; }
    const unsub = subscribeAnnouncements(setAnnouncements, (error) => {
      console.warn("[Atlasia] Duyurular okunamadı:", error);
    });
    return () => unsub();
  }, [uid, cloudEnabled]);

  return {
    myReports, setMyReports,
    myReportsError, setMyReportsError,
    queue, setQueue,
    queueLoading, queueError,
    bans,
    myBan,
    myWarnings,
    myAppeals,
    appeals,
    modActions,
    announcements,
    dismissedAnnouncement, setDismissedAnnouncement,
  };
}
