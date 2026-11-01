/**
 * Atlasia — alt çubuk ve mobil çubuğun kromu (F1-6, adım 1).
 *
 * NEDEN VAR: mobil sekme çubuğu (4 sekme + ortada taşan "ekle" düğmesi) ve
 * yürüyüş kaydı FAB'ı `Explorer.tsx` içinde gömülüydü. İkisi de yalnız
 * "hangi sekme aktif" ve "tıklanınca ne olacak" bilgisine ihtiyaç duyar; karar
 * `Explorer`'da kalır, çizim burada durur.
 *
 * Sekme sırası ve etiketleri ürün kararıdır (2026-10-25): "Kaydet" sekmesi
 * kaldırıldı, kayıtlara üstteki üç çizgi menüsünden girilir; böylece çubuk beş
 * eşit sekmeye sıkışmaz. Bu dosya o kararı taşır — değiştirmek için önce
 * `docs/` içindeki ürün notuna bakılmalı.
 */
import { Activity, Compass, MapPin, Plus, UserRound, UsersRound } from "lucide-react";

export interface MobileTabBarProps {
  /** Etkin sekme etiketi: "Keşfet" | "Topluluk" | "Profil" | "İzlerim" | "Kaydet". */
  mobileTab: string;
  addMode: boolean;
  onExplore: () => void;
  onCommunity: () => void;
  onAdd: () => void;
  onProfile: () => void;
  onMyPlaces: () => void;
}

export function MobileTabBar({ mobileTab, addMode, onExplore, onCommunity, onAdd, onProfile, onMyPlaces }: MobileTabBarProps) {
  return (
    <nav aria-label="Mobil ana menü" className="mobile-tab-bar fixed inset-x-0 bottom-0 z-40 flex h-[calc(58px+env(safe-area-inset-bottom))] items-start justify-around border-t border-leaf/20 bg-[#041d17] pb-[env(safe-area-inset-bottom)] md:hidden">
      {[
        { label: "Keşfet", icon: Compass, action: onExplore },
        { label: "Topluluk", icon: UsersRound, action: onCommunity },
      ].map(({ label, icon: Icon, action }) => {
        const isActive = mobileTab === label;
        return (
          <button key={label} type="button" onClick={action} aria-current={isActive ? "page" : undefined} className="mobile-tab-item flex min-h-[54px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] text-mint">
            <span className="mobile-tab-icon">
              <Icon size={19} strokeWidth={isActive ? 2.3 : 1.8} />
            </span>
            {label}
          </button>
        );
      })}

      <button
        type="button"
        onClick={onAdd}
        aria-label={addMode ? "Ekleme modundan çık" : "Haritaya yeni keşif ekle"}
        aria-pressed={addMode}
        title={addMode ? "Ekleme modundan çık" : "Yeni keşif"}
        className="mobile-tab-add"
      >
        <span className="btn-gold-round">
          <Plus className="size-[24px]" strokeWidth={2.4} />
        </span>
      </button>

      {[
        { label: "Profil", icon: UserRound, action: onProfile },
        { label: "İzlerim", icon: MapPin, action: onMyPlaces },
      ].map(({ label, icon: Icon, action }) => {
        const isActive = mobileTab === label;
        return (
          <button key={label} type="button" onClick={action} aria-current={isActive ? "page" : undefined} className="mobile-tab-item flex min-h-[54px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] text-mint">
            <span className="mobile-tab-icon">
              <Icon size={19} strokeWidth={isActive ? 2.3 : 1.8} fill={isActive && label === "İzlerim" ? "currentColor" : "none"} />
            </span>
            {label}
          </button>
        );
      })}
    </nav>
  );
}

export interface WalkFabProps {
  /** Panel açıkken telefonda gizlenir (çakışma yok). */
  panelOpen: boolean;
  onClick: () => void;
}

export function WalkFab({ panelOpen, onClick }: WalkFabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Yürüyüş kaydını aç"
      title="Yürüyüş kaydı"
      className={`mobile-walk-fab glass-panel gold-frame pressable grid place-items-center rounded-full md:hidden${panelOpen ? " max-md:hidden" : ""}`}
    >
      <Activity size={19} strokeWidth={2} />
    </button>
  );
}
