/**
 * Ayarlar sayfasının içerik sözleşmesi (F1-6, adım 6).
 *
 * NEDEN VAR: `Explorer.tsx` içinde 23 satırlık bir nesne sabiti duruyordu —
 * tema, konum durumu, kurulum denetleyicisi ve iki koşullu yönetici girişi.
 * Hepsi **saf aktarım**; hiçbir karar üretmiyor. Burada tek bir işlev olarak
 * durur, böylece koşullu alanlar (raporlar/denetim yalnız bulut hesabında)
 * tek yerde okunur ve test edilir.
 *
 * SÖZLEŞME: Bu modül durum tutmaz; `SettingsContentProps` alanlarını birebir
 * doldurur. Koşul `undefined` ile ifade edilir (panel bağlantıyı çizmez).
 */
import type { SettingsContentProps } from "../SettingsPanel";

export interface SettingsContentInput {
  theme: SettingsContentProps["theme"];
  setTheme: NonNullable<SettingsContentProps["onTheme"]>;
  installApp: SettingsContentProps["installApp"];
  mapBounds: SettingsContentProps["mapBounds"];
  /** `useGeolocation` + ters ad etiketi. */
  geo: {
    supported: boolean;
    secure: boolean;
    permission: string;
    status: string;
    fix: unknown;
  };
  preciseLabel: string | null;
  onAllowLocation: SettingsContentProps["onAllowLocation"];
  onClearLocation: SettingsContentProps["onClearLocation"];
  onShowLocation: SettingsContentProps["onShowLocation"];
  /** Bulut hesabı mı? (cihaz hesabı Firestore'a yazmaz) */
  cloudAccount: boolean;
  moderator: boolean;
  openReports: () => void;
  openAdmin: () => void;
}

export function buildSettingsContent(input: SettingsContentInput): SettingsContentProps {
  return {
    theme: input.theme,
    onTheme: input.setTheme,
    installApp: input.installApp,
    mapBounds: input.mapBounds,
    location: {
      supported: input.geo.supported,
      secure: input.geo.secure,
      permission: input.geo.permission,
      status: input.geo.status,
      fix: input.geo.fix,
      label: input.preciseLabel,
    },
    onAllowLocation: input.onAllowLocation,
    onClearLocation: input.onClearLocation,
    onShowLocation: input.onShowLocation,
    // Raporlar yalnız bulut hesabında anlamlı (cihaz hesabı Firestore'a yazmaz).
    onOpenReports: input.cloudAccount ? input.openReports : undefined,
    onOpenAdmin: input.cloudAccount && input.moderator ? input.openAdmin : undefined,
  } as SettingsContentProps;
}
