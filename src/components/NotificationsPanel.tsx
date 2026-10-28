import { Bell, Check, X } from "lucide-react";
import { relativeTime } from "../utils/time";
import type { AppNotification } from "../lib/notifications";
import { usePanelAccess } from "../hooks/usePanelAccess";

/** Denetim K-06: panelde ham şema anahtarı değil Türkçe etiket görünür. */
const TYPE_LABELS: Record<AppNotification["type"], string> = {
  report_received: "Rapor alındı",
  report_actioned: "Rapor sonucu",
  blocked: "Engelleme",
  group_invite: "Grup daveti",
  group_message: "Grup mesajı",
  friend_request: "Arkadaşlık isteği",
  friend_accepted: "Arkadaşlık kabulü",
  friend_declined: "Arkadaşlık reddi",
  system: "Sistem",
};

interface Props {
  notifications: AppNotification[];
  unreadCount: number;
  onClose: () => void;
  onMarkAllRead: () => void;
  onMarkRead: (id: string) => void;
  onOpenGroup?: (groupId: string) => void;
  onOpenFriends?: () => void;
}

export default function NotificationsPanel({ notifications, unreadCount, onClose, onMarkAllRead, onMarkRead, onOpenGroup, onOpenFriends }: Props) {
  const panelRef = usePanelAccess(true, onClose);
  return (
    <aside ref={panelRef} aria-label="Bildirimler" className="mobile-notifications fixed inset-0 z-[60] flex justify-end bg-black/35 md:inset-auto md:right-4 md:top-[88px] md:bg-transparent">
      <button type="button" aria-label="Bildirimleri kapat" onClick={onClose} className="absolute inset-0 md:hidden" />
      <div className="mobile-fullscreen-bleed relative flex h-dvh w-full max-w-[360px] flex-col overflow-hidden border border-leaf/20 bg-[#041d17] md:h-[min(70dvh,520px)] md:rounded-[22px] md:shadow-2xl">
        <header className="mobile-safe-top flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <h2 className="flex items-center gap-2 font-display text-base font-semibold"><Bell className="size-4 text-sun" />Bildirimler {unreadCount > 0 && <span className="rounded-full bg-sun px-2 py-0.5 text-[11px] text-ink">{unreadCount} yeni</span>}</h2>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && <button type="button" onClick={onMarkAllRead} className="flex min-h-8 items-center gap-1 rounded-full border border-white/10 px-3 text-[11px] text-mint/80"><Check size={12} />Okundu</button>}
            <button type="button" onClick={onClose} aria-label="Kapat" className="grid size-9 place-items-center rounded-full hover:bg-white/5"><X size={16} /></button>
          </div>
        </header>
        <div className="mobile-safe-bottom thin-scroll flex-1 overflow-y-auto p-2">
          {notifications.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-[14px] font-medium">Şimdilik yeni bildirimin yok.</p>
              <p className="mt-1 text-[13px] leading-relaxed text-mint/75">Kaydettiğin yerler ve rotalar, sağ üstteki menüdeki “Kayıtlarım” bölümünde seni bekler.</p>
              <p className="mt-3 text-[11px] text-mint/50">Rapor sonucu bildirimi bu sürümde gönderilmiyor.</p>
            </div>
          ) : notifications.map((n) => (
            <article key={n.id} className={`rounded-xl border p-3 ${n.read ? "border-white/5 bg-white/[0.02]" : "border-sun/20 bg-sun/10"}`}>
              <h3 className="text-[13px] font-semibold">{n.title}</h3>
              <p className="mt-1 text-[12px] leading-relaxed text-mint/75">{n.body}</p>
              <p className="mt-2 text-[11px] text-mint/50">{relativeTime(n.createdAt)} · {TYPE_LABELS[n.type] ?? "Bildirim"}</p>
              <div className="mt-2 flex items-center gap-3">
                {!n.read && <button type="button" onClick={() => onMarkRead(n.id)} className="text-[11px] text-sun">Okundu işaretle</button>}
                {(n.type === "group_invite" || n.type === "group_message") && n.targetId && onOpenGroup && (
                  <button type="button" onClick={() => onOpenGroup(n.targetId as string)} className="text-[11px] text-leaf">{n.type === "group_invite" ? "Daveti gör" : "Grubu aç"}</button>
                )}
                {(n.type === "friend_request" || n.type === "friend_accepted") && onOpenFriends && (
                  <button type="button" onClick={onOpenFriends} className="text-[11px] text-leaf">{n.type === "friend_request" ? "İsteği gör" : "Arkadaşlar"}</button>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </aside>
  );
}
