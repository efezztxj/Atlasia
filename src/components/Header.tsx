import { Bell, Bookmark, Compass, MapPin, Menu, Plus, Search, UserRound } from "lucide-react";
import { cn } from "../utils/cn";

interface Props {
  onOpenDrawer: () => void;
  onAdd: () => void;
  addMode: boolean;
  placeCount: number;
  locationReady: boolean;
  onOpenSettings: () => void;
  onOpenRecords: () => void;
  onOpenProfile: () => void;
  onOpenNotifications: () => void;
  onOpenSearch: () => void;
  notificationsOpen: boolean;
  profileName: string;
  unreadCount: number;
}

export default function Header({
  onOpenDrawer,
  onAdd,
  addMode,
  placeCount,
  locationReady,
  onOpenSettings,
  onOpenRecords,
  onOpenProfile,
  onOpenNotifications,
  onOpenSearch,
  notificationsOpen,
  profileName,
  unreadCount,
}: Props) {
  return (
    <header className="mobile-explorer-header absolute inset-x-0 top-0 z-30 flex h-[68px] items-center justify-between border-b border-white/[0.08] bg-ink/90 px-3 backdrop-blur-xl md:h-[72px] md:px-6">
      <div className="flex min-w-0 items-center gap-4">
        <a href="#" className="font-display text-[26px] leading-none font-bold tracking-tight text-mint" aria-label="Atlasia ana sayfa">
          Atlasia<span className="text-sun">.</span>
        </a>
        <span className="hidden h-5 w-px bg-white/15 lg:block" />
        <p className="hidden truncate text-[12px] tracking-wide text-mint/65 lg:block">
          Gezginlerin gözünden, dünyanın her köşesi
        </p>
      </div>

      <nav aria-label="Mobil ana işlemler" className="mobile-header-actions flex items-center gap-1 md:hidden">
        <button
          type="button"
          onClick={onOpenSearch}
          aria-label="Yer ara"
          className="mobile-icon-btn grid place-items-center rounded-full text-mint"
        >
          <Search className="size-[19px]" strokeWidth={1.9} />
        </button>
        <button
          type="button"
          onClick={onOpenNotifications}
          aria-label="Bildirimleri aç"
          aria-expanded={notificationsOpen}
          className="mobile-icon-btn grid place-items-center rounded-full text-mint"
        >
          <Bell className="size-[19px]" strokeWidth={1.9} />
        </button>
        <button
          type="button"
          onClick={onOpenDrawer}
          aria-label="Keşif menüsünü aç"
          className="mobile-icon-btn grid place-items-center rounded-full text-sun"
        >
          <Menu className="size-[21px]" strokeWidth={2} />
        </button>
      </nav>

      <nav aria-label="Ana menü" className="hidden items-center gap-1 md:flex md:gap-4">
        <button
          onClick={onOpenSettings}
          aria-label="Konum ayarlarını aç"
          title="Konum"
          className={cn(
            "relative hidden min-h-11 items-center gap-2 rounded-full border p-2.5 text-[12px] transition md:flex sm:px-3 sm:py-2",
            locationReady
              ? "border-leaf/40 bg-leaf/10 text-leaf hover:bg-leaf/20"
              : "border-white/12 text-mint/60 hover:border-sun/50 hover:text-sun",
          )}
        >
          <MapPin className="size-3.5" />
          <span className="hidden md:inline">Konum</span>
          {locationReady && <span aria-hidden className="size-1.5 rounded-full bg-leaf" />}
        </button>

        <button
          onClick={onOpenDrawer}
          className="group flex items-center gap-2 rounded-full px-2 py-2 text-[13px] text-mint/80 transition hover:bg-white/5 hover:text-mint md:px-3"
        >
          <Compass className="size-4 transition group-hover:rotate-45" />
          Keşfet
          <span className="hidden rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] leading-none text-mint/70 min-[390px]:inline">
            {placeCount}
          </span>
        </button>
        <button type="button" onClick={onOpenRecords} aria-label="Kayıtlarımı aç" className="hidden min-h-11 items-center gap-2 px-2 text-[13px] text-mint md:flex"><Bookmark className="size-4" />Kayıtlarım</button>
        <button
          onClick={onAdd}
          className={
            "flex min-h-[44px] items-center gap-2 rounded-lg px-3.5 text-[14px] font-bold text-[#10241A] transition active:scale-95 md:px-4 " +
            (addMode ? "bg-leaf" : "bg-sun hover:bg-sun-2")
          }
        >
          <Plus className="size-4" strokeWidth={2.6} />
          İz bırak
        </button>
        <button type="button" onClick={onOpenNotifications} aria-label={`Bildirimler${unreadCount > 0 ? `: ${unreadCount} yeni` : ""}`} aria-expanded={notificationsOpen} className="relative hidden size-11 place-items-center rounded-full text-mint/80 transition hover:bg-white/5 hover:text-mint md:grid">
          <Bell className="size-[18px] stroke-[1.9]" />
          {unreadCount > 0 && <span aria-hidden className="absolute right-2 top-2 size-2 rounded-full bg-sun" />}
        </button>
        <button type="button" onClick={onOpenProfile} aria-label={`${profileName}: profili aç`} title="Profilim" className="hidden size-11 place-items-center rounded-full border border-leaf/25 bg-white/[0.04] font-semibold text-sun md:grid">{profileName?.[0]?.toLocaleUpperCase("tr") ?? <UserRound size={18} />}</button>
      </nav>
    </header>
  );
}
