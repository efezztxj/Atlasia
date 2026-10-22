/**
 * Profil dizini: kural `createdAt == request.time` istediği için var olan
 * belge güncellenemez. syncUserProfile değişmemişse yazmaz, değişmişse
 * sil + yeniden oluştur yapar. Arama iki önekle (yazıldığı gibi + baş harf büyük).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  store: new Map<string, Record<string, unknown>>(),
  ops: [] as string[],
  queries: [] as Array<{ path: string; from: string; to: string }>,
}));

vi.mock("./firebase", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  collection: (_db: unknown, path: string) => ({ path }),
  doc: (_db: unknown, ...segments: string[]) => ({ path: segments.join("/") }),
  getDoc: async (ref: { path: string }) => ({ exists: () => h.store.has(ref.path), data: () => h.store.get(ref.path) }),
  setDoc: async (ref: { path: string }, data: Record<string, unknown>) => { h.ops.push(`set:${ref.path}`); h.store.set(ref.path, data); },
  deleteDoc: async (ref: { path: string }) => { h.ops.push(`delete:${ref.path}`); h.store.delete(ref.path); },
  serverTimestamp: () => "TS",
  orderBy: () => ({}),
  limit: () => ({}),
  onSnapshot: () => () => {},
  where: (field: string, op: string, value: string) => ({ field, op, value }),
  query: (target: { path: string }, ...parts: Array<{ op?: string; value?: string }>) => {
    const from = parts.find((part) => part.op === ">=")?.value ?? "";
    const to = parts.find((part) => part.op === "<")?.value ?? "";
    return { path: target.path, from, to };
  },
  getDocs: async (q: { path: string; from: string; to: string }) => {
    h.queries.push(q);
    const docs = [...h.store.entries()]
      .filter(([key]) => key.startsWith(`${q.path}/`))
      .filter(([, data]) => String(data.displayName) >= q.from && String(data.displayName) < q.to)
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
  it("ilk kez oluşturur", async () => {
    expect(await syncUserProfile({ uid: "u1", displayName: " Efe " })).toBe("created");
    expect(h.store.get("userProfiles/u1")).toEqual({ uid: "u1", displayName: "Efe", createdAt: "TS", updatedAt: "TS" });
  });

  it("ad ve foto aynıysa hiç yazmaz", async () => {
    h.store.set("userProfiles/u1", { uid: "u1", displayName: "Efe", createdAt: 1, updatedAt: 1 });
    expect(await syncUserProfile({ uid: "u1", displayName: "Efe" })).toBe("unchanged");
    expect(h.ops).toEqual([]);
  });

  it("ad değiştiyse siler ve yeniden oluşturur (kural güncellemeye izin vermez)", async () => {
    h.store.set("userProfiles/u1", { uid: "u1", displayName: "Eski", createdAt: 1, updatedAt: 1 });
    expect(await syncUserProfile({ uid: "u1", displayName: "Yeni", photoURL: "https://x.dev/a.png" })).toBe("replaced");
    expect(h.ops).toEqual(["delete:userProfiles/u1", "set:userProfiles/u1"]);
    expect(h.store.get("userProfiles/u1")).toMatchObject({ displayName: "Yeni", photoURL: "https://x.dev/a.png", createdAt: "TS" });
  });

  it("http(s) olmayan foto adresi yazılmaz", async () => {
    await syncUserProfile({ uid: "u1", displayName: "Efe", photoURL: "javascript:alert(1)" });
    expect(h.store.get("userProfiles/u1")).not.toHaveProperty("photoURL");
  });
});

describe("searchUserProfiles", () => {
  it("küçük harfle yazılsa da baş harfi büyük adı bulur; kendisi sonuçta yok", async () => {
    h.store.set("userProfiles/me", { uid: "me", displayName: "Efe Ben" });
    h.store.set("userProfiles/u2", { uid: "u2", displayName: "Efe Yılmaz" });
    h.store.set("userProfiles/u3", { uid: "u3", displayName: "Can" });
    const found = await searchUserProfiles("efe", "me");
    expect(found.map((profile) => profile.uid)).toEqual(["u2"]);
    expect(h.queries.map((q) => q.from)).toEqual(["efe", "Efe"]);
  });

  it("Türkçe baş harf: 'ilkay' → 'İlkay'", () => {
    expect(profilePrefixes("ilkay")).toEqual(["ilkay", "İlkay"]);
    expect(profilePrefixes("Can")).toEqual(["Can"]);
    expect(profilePrefixes("  ")).toEqual([]);
  });
});
