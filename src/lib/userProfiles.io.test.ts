/**
 * Profil dizini: kural `createdAt == request.time` istediği için var olan
 * belge güncellenemez. syncUserProfile değişmemişse yazmaz, değişmişse
 * sil + yeniden oluştur yapar.
 *
 * Aşama 2: arama artık `displayNameLower` (Türkçe küçük harf) üzerinden tek
 * aralık sorgusu; patch 7'deki "baş harfi büyüt" ikinci sorgusu kaldırıldı.
 * Eski belgelerde alan yoksa ilk senkronda bir kez yeniden yazılır (geçiş).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  store: new Map<string, Record<string, unknown>>(),
  ops: [] as string[],
  queries: [] as Array<{ path: string; field: string; from: string; to: string }>,
}));

vi.mock("./firebase", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  collection: (_db: unknown, path: string) => ({ path }),
  doc: (_db: unknown, ...segments: string[]) => ({ path: segments.join("/") }),
  getDoc: async (ref: { path: string }) => ({ exists: () => h.store.has(ref.path), id: ref.path.split("/")[1], data: () => h.store.get(ref.path) }),
  setDoc: async (ref: { path: string }, data: Record<string, unknown>) => { h.ops.push(`set:${ref.path}`); h.store.set(ref.path, data); },
  deleteDoc: async (ref: { path: string }) => { h.ops.push(`delete:${ref.path}`); h.store.delete(ref.path); },
  serverTimestamp: () => "TS",
  orderBy: (field: string) => ({ field }),
  limit: () => ({}),
  onSnapshot: () => () => {},
  where: (field: string, op: string, value: string) => ({ field, op, value }),
  query: (target: { path: string }, ...parts: Array<{ field?: string; op?: string; value?: string }>) => {
    const from = parts.find((part) => part.op === ">=")?.value ?? "";
    const to = parts.find((part) => part.op === "<")?.value ?? "";
    const field = parts.find((part) => part.op === ">=")?.field ?? "";
    return { path: target.path, field, from, to };
  },
  getDocs: async (q: { path: string; field: string; from: string; to: string }) => {
    h.queries.push(q);
    const docs = [...h.store.entries()]
      .filter(([key]) => key.startsWith(`${q.path}/`))
      .filter(([, data]) => String(data[q.field]) >= q.from && String(data[q.field]) < q.to)
      .map(([key, data]) => ({ id: key.split("/")[1], data: () => data }));
    return { docs };
  },
}));

import { fetchUserProfile, profilePrefixes, resetKnownProfiles, searchUserProfiles, syncUserProfile } from "./userProfiles";

beforeEach(() => {
  h.store.clear();
  h.ops.length = 0;
  h.queries.length = 0;
  resetKnownProfiles();
});

describe("syncUserProfile", () => {
  it("ilk kez oluşturur ve displayNameLower'ı Türkçe küçük harfle yazar", async () => {
    expect(await syncUserProfile({ uid: "u1", displayName: " Efe " })).toBe("created");
    expect(h.store.get("userProfiles/u1")).toEqual({
      uid: "u1",
      displayName: "Efe",
      displayNameLower: "efe",
      createdAt: "TS",
      updatedAt: "TS",
    });
    expect(await syncUserProfile({ uid: "u2", displayName: "İrem" })).toBe("created");
    expect(h.store.get("userProfiles/u2")).toMatchObject({ displayNameLower: "irem" });
  });

  it("ad, foto ve displayNameLower aynıysa hiç yazmaz", async () => {
    h.store.set("userProfiles/u1", { uid: "u1", displayName: "Efe", displayNameLower: "efe", createdAt: 1, updatedAt: 1 });
    expect(await syncUserProfile({ uid: "u1", displayName: "Efe" })).toBe("unchanged");
    expect(h.ops).toEqual([]);
  });

  it("geçiş: alanı olmayan eski belgeyi bir kez yeniden yazar", async () => {
    h.store.set("userProfiles/u1", { uid: "u1", displayName: "Efe", createdAt: 1, updatedAt: 1 });
    expect(await syncUserProfile({ uid: "u1", displayName: "Efe" })).toBe("replaced");
    expect(h.ops).toEqual(["delete:userProfiles/u1", "set:userProfiles/u1"]);
    expect(h.store.get("userProfiles/u1")).toMatchObject({ displayNameLower: "efe" });
  });

  it("ad değiştiyse siler ve yeniden oluşturur (kural güncellemeye izin vermez)", async () => {
    h.store.set("userProfiles/u1", { uid: "u1", displayName: "Eski", displayNameLower: "eski", createdAt: 1, updatedAt: 1 });
    expect(await syncUserProfile({ uid: "u1", displayName: "Yeni", photoURL: "https://x.dev/a.png" })).toBe("replaced");
    expect(h.ops).toEqual(["delete:userProfiles/u1", "set:userProfiles/u1"]);
    expect(h.store.get("userProfiles/u1")).toMatchObject({ displayName: "Yeni", displayNameLower: "yeni", photoURL: "https://x.dev/a.png", createdAt: "TS" });
  });

  it("http(s) olmayan foto adresi yazılmaz", async () => {
    await syncUserProfile({ uid: "u1", displayName: "Efe", photoURL: "javascript:alert(1)" });
    expect(h.store.get("userProfiles/u1")).not.toHaveProperty("photoURL");
  });
});

describe("searchUserProfiles", () => {
  it("tek aralık sorgusu displayNameLower üzerinde; büyük harf ikinci sorgu yok", async () => {
    h.store.set("userProfiles/me", { uid: "me", displayName: "Efe Ben", displayNameLower: "efe ben" });
    h.store.set("userProfiles/u2", { uid: "u2", displayName: "Efe Yılmaz", displayNameLower: "efe yılmaz" });
    h.store.set("userProfiles/u3", { uid: "u3", displayName: "Can", displayNameLower: "can" });
    const found = await searchUserProfiles("efe", "me");
    expect(found.map((profile) => profile.uid)).toEqual(["u2"]);
    expect(h.queries).toHaveLength(1);
    expect(h.queries[0]).toMatchObject({ field: "displayNameLower", from: "efe", to: "efe\uf8ff" });
  });

  it("Türkçe İ: 'İrem' yazımı da 'irem' önekiyle bulunur", async () => {
    h.store.set("userProfiles/u4", { uid: "u4", displayName: "İrem", displayNameLower: "irem" });
    const found = await searchUserProfiles("İrem", "me");
    expect(found.map((profile) => profile.uid)).toEqual(["u4"]);
    expect(h.queries[0].from).toBe("irem");
  });

  it("Türkçe baş harf öneki: 'ilkay' → ['ilkay'] (tek önek)", () => {
    expect(profilePrefixes("ilkay")).toEqual(["ilkay"]);
    expect(profilePrefixes("İlkay")).toEqual(["ilkay"]);
    expect(profilePrefixes("IŞIK")).toEqual(["ışık"]);
    expect(profilePrefixes("  ")).toEqual([]);
  });
});

describe("arama sözleşmesi (İŞ 1b/1c)", () => {
  it("adsız/\"Gezgin\" profiller sonuçta görünmez", async () => {
    h.store.set("userProfiles/u1", { uid: "u1", displayName: "Gezgin", displayNameLower: "gezgin" });
    h.store.set("userProfiles/u2", { uid: "u2", displayName: "Gezgin Deniz", displayNameLower: "gezgin deniz" });
    h.store.set("userProfiles/u3", { uid: "u3", displayName: "", displayNameLower: "" });
    const found = await searchUserProfiles("gez", "me");
    expect(found.map((profile) => profile.uid)).toEqual(["u2"]);
  });

  it("kelime içi arama yok: önek dışındaki eşleşme dönmez", async () => {
    h.store.set("userProfiles/u1", { uid: "u1", displayName: "Mustafa Efe", displayNameLower: "mustafa efe" });
    h.store.set("userProfiles/u2", { uid: "u2", displayName: "Efe Yılmaz", displayNameLower: "efe yılmaz" });
    const found = await searchUserProfiles("efe", "me");
    expect(found.map((profile) => profile.uid)).toEqual(["u2"]);
  });

  it("eski (displayNameLower'sız) profil, okunduysa önek aramasında geri döner", async () => {
    // 1) Eski belge aralık sorgusunda görünmez (alan yok).
    h.store.set("userProfiles/legacy", { uid: "legacy", displayName: "İrem Eski", createdAt: 1, updatedAt: 1 });
    expect((await searchUserProfiles("irem", "me")).map((profile) => profile.uid)).toEqual([]);

    // 2) Profil bir kez okununca (arkadaş listesi/davet) oturum belleğine girer.
    await fetchUserProfile("legacy");
    const found = await searchUserProfiles("irem", "me");
    expect(found.map((profile) => profile.uid)).toEqual(["legacy"]);
    // Türetilmiş anahtar Türkçe küçük harf: İ → i
    expect(found[0].displayNameLower).toBe("irem eski");
    // 3) Belgeye yazma yapılmadı (yalnız okuma).
    expect(h.ops).toEqual([]);
  });
});
