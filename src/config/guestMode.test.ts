/**
 * T4 — misafir modu kilidi.
 *
 * Kural: kayıt duvarı kalkar, **güvenlik duvarı kalkmaz**.
 *
 *   1. Landing CTA'sı haritayı açar, giriş ekranını değil (misafir oturumu).
 *   2. Misafir `places`/`posts`/`stories` gibi zaten herkese açık kayıtları
 *      okuyabilir; yazma yolları istemcide kapıya yönlenir.
 *   3. `firestore.rules` DEĞİŞMEZ: misafirin `request.auth` değeri boştur,
 *      yani her yazma kuralı sunucuda reddedilir (fail-closed). Bu test, ileride
 *      birinin "misafir de yazsın" diye kuralı gevşetmesini engeller.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const app = read("src/App.tsx");
const explorer = read("src/components/Explorer.tsx");
const firestoreHook = read("src/hooks/useFirestoreAtlasData.ts");
const localHook = read("src/hooks/useAtlasData.ts");
const rules = read("firestore.rules");

describe("T4 · landing → misafir haritası", () => {
  it("landing CTA'sı giriş ekranını değil misafir oturumunu başlatır", () => {
    expect(app).toContain("startGuest()");
    expect(app).toContain("if (guest)");
    // Eski davranış (CTA → setAccessOpen(true)) geri gelmemeli.
    const handleStart = app.slice(app.indexOf("const handleStart"), app.indexOf("if (checking)"));
    expect(handleStart).not.toContain("setAccessOpen(true)");
  });

  it("giriş ekranı misafire geri dönüş yolu verir", () => {
    expect(app).toContain("<AccountAccess onClose={closeAccess} />");
    expect(read("src/components/AccountAccess.tsx")).toContain("Misafir olarak devam et");
  });

  it("harita açılışı misafir bayrağını taşır (huni kırılımı)", () => {
    expect(explorer).toContain("analytics.mapOpen({ guest })");
    expect(explorer).not.toContain("analytics.mapOpen({ guest: false })");
  });
});

describe("T4 · misafir yazamaz (istemci kapısı)", () => {
  it("Explorer misafiri tanır ve yazma eylemlerini hesap kapısına yönlendirir", () => {
    expect(explorer).toContain("const guest = !user");
    expect(explorer).toContain("const askAccount = useCallback");
    // Kapıya bağlı eylemler: iz ekleme, topluluk yazıları, rota, profil, bildirim.
    for (const intent of [
      "İz eklemek için bir hesap aç",
      "Paylaşmak için bir hesap aç",
      "Yanıt yazmak için bir hesap aç",
      "Beğenmek için bir hesap aç",
      "Hikâye paylaşmak için bir hesap aç",
      "Rota oluşturmak için bir hesap aç",
      "Yürüyüş kaydı için bir hesap aç",
      "Profil ve kayıtlar için bir hesap aç",
      "Bildirimler için bir hesap aç",
    ]) {
      expect(explorer, `${intent} kapısı eksik`).toContain(intent);
    }
  });

  it("veri katmanı misafirde yazmayı reddeder", () => {
    const guardCount = (firestoreHook.match(/if \(guest\) throw new Error\(/g) ?? []).length;
    expect(guardCount).toBeGreaterThanOrEqual(9);
  });

  it("misafir okuması kurallarla uyumlu: sahip sorgusu kurulmaz, genel okuma sürer", () => {
    expect(firestoreHook).toContain("if (!enabled || !isCloudReady || !uid || guest) return;");
    expect(firestoreHook).toContain("(!uid && !guest)");
  });

  it("misafir yerel depoya yazmaz (anahtarlar hesaba karışmaz)", () => {
    expect(localHook).toContain("persist = true");
    expect(explorer).toContain('useAtlasData(user?.uid ?? "", { persist: Boolean(user) })');
  });
});

describe("T4 · güvenlik duvarı: firestore.rules gevşetilmedi", () => {
  it("hiçbir koleksiyonda herkese açık yazma yok", () => {
    expect(rules).not.toMatch(/allow\s+(write|create|update|delete)[^;]*:\s*if\s+true\s*;/);
    expect(rules).not.toContain("allow write: if true");
  });

  it("misafirin okuyabildiği koleksiyonlarda yazma hâlâ oturum şartına bağlı", () => {
    for (const collection of ["places/{placeId}", "posts/{postId}", "stories/{storyId}", "routes/{routeId}"]) {
      const start = rules.indexOf(`match /${collection}`);
      expect(start, `${collection} bulunamadı`).toBeGreaterThan(-1);
      const block = rules.slice(start, start + 2_000);
      expect(block, `${collection} yazması signedIn() istemeli`).toMatch(/allow create: if signedIn\(\)/);
    }
  });

  it("misafir okuması zaten var olan public okuma kuralıyla sınırlı", () => {
    // places/posts/stories: `allow get: if true` + sayfalı `list` — T4 öncesiyle aynı.
    expect(rules).toContain("allow get: if true;");
    expect(rules).toContain("allow list: if boundedList(50);");
  });
});
