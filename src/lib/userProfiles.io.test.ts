/**
 * Profil dizini: kurallar oluşturma/güncelleme ayrımı yapar (güncellemede
 * `createdAt` değişmez). syncUserProfile değişmemişse yazmaz, değişmişse
 * `updateDoc` ile günceller — sil+yeniden yaz yolu emekli oldu.
 *
 * Arama: birincil yol `displayNameLower` (Türkçe küçük harf) önek aralığı;
 * alanı olmayan eski belgeler için sınırlı `displayName` geri dönüşü var.
 * Her aday önek doğrulamasından geçer (kelime içi arama yok) ve adsız
 * profiller sonuçta görünmez.
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
  getDoc: async (ref: { path: string }) => ({ exists: () => h.store.has(ref.path), data: () => h.store.get(ref.path) }),
  setDoc: async (ref: { path: string }, data: Record<string, unknown>) => { h.ops.push(`set:${ref.path}`); h.store.set(ref.path, data); },
  updateDoc: async (ref: { path: string }, data: Record<string, unknown>) => {
    h.ops.push(`update:${ref.path}`);
    const next = { ...(h.store.get(ref.path) ?? {}) };
    for (const [key, value] of Object.entries(data)) {
      if (value === "__DELETE_FIELD__") delete next[key];
      else next[key] = value;
    }
    h.store.set(ref.path, next);
  },
  deleteField: () => "__DELETE_FIELD__",
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
      // Firestore aralık sorgusu alanı olmayan belgeyi döndürmez; sahte katman da döndürmez.
      .filter(([, data]) => typeof data[q.field] === "string" && (data[q.field] as string) >= q.from && (data[q.field] as string) < q.to)
      .map(([key, data]) => ({ id: key.split("/")[1], data: () => data }));
    return { docs };
  },
}));

import { profilePrefixes, searchUserProfiles, syncUserProfile } from "./userProfiles";

beforeEach(() => {
  h.store.clear();
  h.ops.length = 0;
  h.queries.length = 0;
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

  it("geçiş: alanı olmayan eski belge update ile tamamlanır, createdAt korunur", async () => {
    h.store.set("userProfiles/u1", { uid: "u1", displayName: "Efe", createdAt: 1, updatedAt: 1 });
    expect(await syncUserProfile({ uid: "u1", displayName: "Efe" })).toBe("updated");
    expect(h.ops).toEqual(["update:userProfiles/u1"]);
    expect(h.store.get("userProfiles/u1")).toMatchObject({ displayNameLower: "efe", createdAt: 1 });
  });

  it("ad değiştiyse silmeden günceller; foto kaldırıldıysa alan silinir", async () => {
    h.store.set("userProfiles/u1", { uid: "u1", displayName: "Eski", displayNameLower: "eski", photoURL: "https://x.dev/eski.png", createdAt: 1, updatedAt: 1 });
    expect(await syncUserProfile({ uid: "u1", displayName: "Yeni", photoURL: "https://x.dev/a.png" })).toBe("updated");
    expect(h.store.get("userProfiles/u1")).toMatchObject({ displayName: "Yeni", displayNameLower: "yeni", photoURL: "https://x.dev/a.png", createdAt: 1 });

    expect(await syncUserProfile({ uid: "u1", displayName: "Yeni" })).toBe("updated");
    expect(h.store.get("userProfiles/u1")).not.toHaveProperty("photoURL");
    expect(h.ops).toEqual(["update:userProfiles/u1", "update:userProfiles/u1"]);
  });

  it("kural kümesi dışında karakter taşıyan ad yazılmadan kodlu reddedilir, eski belge yerinde kalır", async () => {
    await expect(syncUserProfile({ uid: "u9", displayName: "Dr. Efe" }))
      .rejects.toMatchObject({ code: "profile/name-not-indexable" });
    expect(h.store.has("userProfiles/u9")).toBe(false);

    h.store.set("userProfiles/u1", { uid: "u1", displayName: "Efe", displayNameLower: "efe", createdAt: 1, updatedAt: 1 });
    await expect(syncUserProfile({ uid: "u1", displayName: "Efe_2000" }))
      .rejects.toMatchObject({ code: "profile/name-not-indexable" });
    expect(h.ops).toEqual([]);
    expect(h.store.get("userProfiles/u1")).toMatchObject({ displayName: "Efe" });
  });

  it("http(s) olmayan foto adresi yazılmaz", async () => {
    await syncUserProfile({ uid: "u1", displayName: "Efe", photoURL: "javascript:alert(1)" });
    expect(h.store.get("userProfiles/u1")).not.toHaveProperty("photoURL");
  });
});

describe("searchUserProfiles", () => {
  it("birincil sorgu displayNameLower önek aralığı; kendisi hariç", async () => {
    h.store.set("userProfiles/me", { uid: "me", displayName: "Efe Ben", displayNameLower: "efe ben" });
    h.store.set("userProfiles/u2", { uid: "u2", displayName: "Efe Yılmaz", displayNameLower: "efe yılmaz" });
    h.store.set("userProfiles/u3", { uid: "u3", displayName: "Can", displayNameLower: "can" });
    const found = await searchUserProfiles("efe", "me");
    expect(found.map((profile) => profile.uid)).toEqual(["u2"]);
    expect(h.queries[0]).toMatchObject({ field: "displayNameLower", from: "efe", to: "efe\uf8ff" });
  });

  it("Türkçe İ: 'İrem' yazımı da 'irem' önekiyle bulunur", async () => {
    h.store.set("userProfiles/u4", { uid: "u4", displayName: "İrem", displayNameLower: "irem" });
    const found = await searchUserProfiles("İrem", "me");
    expect(found.map((profile) => profile.uid)).toEqual(["u4"]);
    expect(h.queries[0].from).toBe("irem");
  });

  it("geri dönüş: displayNameLower alanı olmayan eski belge displayName ile bulunur", async () => {
    h.store.set("userProfiles/eski", { uid: "eski", displayName: "İrem" });
    const found = await searchUserProfiles("irem", "me");
    expect(found.map((profile) => profile.uid)).toEqual(["eski"]);
    expect(found[0].displayNameLower).toBe("irem");
    expect(h.queries.some((q) => q.field === "displayName")).toBe(true);
  });

  it("adsız/yer tutucu profil sonuçta görünmez; kelime içi arama yoktur", async () => {
    h.store.set("userProfiles/u6", { uid: "u6", displayName: "Gezgin", displayNameLower: "gezgin" });
    h.store.set("userProfiles/u7", { uid: "u7", displayName: "Kaan Ada", displayNameLower: "Kaan ada" });
    expect(await searchUserProfiles("gezgin", "me")).toEqual([]);
    expect(await searchUserProfiles("ada", "me")).toEqual([]);
  });

  it("2 harften kısa sorgu hiç sorgu atmaz", async () => {
    expect(await searchUserProfiles(" e ", "me")).toEqual([]);
    expect(h.queries).toEqual([]);
  });

  it("Türkçe baş harf öneki: 'ilkay' → ['ilkay'] (tek önek)", () => {
    expect(profilePrefixes("ilkay")).toEqual(["ilkay"]);
    expect(profilePrefixes("İlkay")).toEqual(["ilkay"]);
    expect(profilePrefixes("IŞIK")).toEqual(["ışık"]);
    expect(profilePrefixes("  ")).toEqual([]);
  });
});
