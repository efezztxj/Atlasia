/**
 * M-18 kablolama kapısı — Explorer iki kalıcı durumu da şeride bağlar.
 *
 * NEDEN STATİK: `Explorer` harita + Firestore + panellerle 1700 satırlık bir
 * yüzey; burada sınanan şey davranış değil, **hangi durumun hangi yüzeye
 * gittiği**. Denetimde kusur tam olarak buydu: `config` durumu toast'a
 * düşürülmüştü ve 3,2 saniye sonra kayboluyordu. Bir sonraki düzenlemenin bunu
 * sessizce geri getirmesini bu test engeller.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const explorer = readFileSync("src/components/Explorer.tsx", "utf8");
const banner = readFileSync("src/components/DataStatusBanner.tsx", "utf8");

describe("M-18 · veri durumu şeridi kablolaması", () => {
  it("yapılandırma eksikliği de kalıcı şeride gider, toast'a değil", () => {
    expect(explorer).toContain('!isCloudReady\n    ? "config"');
    expect(explorer).not.toContain("Firebase yapılandırması eksik, yerel veri kullanılıyor.");
    expect(explorer).toContain("<DataStatusBanner");
  });

  it("'Yeniden dene' yalnız canlı veri hatasında sunulur", () => {
    expect(explorer).toContain('onRetry={dataIssue === "remote"');
  });

  it("şerit kalıcı durum rolü taşır (alert değil)", () => {
    expect(banner).toContain('role="status"');
    expect(banner).not.toContain('role="alert"');
  });
});
