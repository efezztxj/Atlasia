/**
 * Doğrulama IO sözleşmesi: deterministik belge kimliği, tazelik okuyucusunun
 * hesap türüne göre kapanması ve yazma öncesi doğrulama.
 *
 * Kural bağı: `verifications` belge kimliği `{placeId}_{uid}` olmak zorunda.
 * Rastgele kimlik yazılırsa aynı kişi ikinci kez doğrulayamaz (kural reddeder)
 * ve tazelik sayacı şişer — bu test o sözleşmeyi kilitler.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  const store = new Map<string, Record<string, unknown>>();
  const stats = { unsubs: 0, countQueries: [] as Array<{ path: string; where?: unknown }> };
  return { store, stats };
});

vi.mock("./firebase", () => ({ db: {}, firebaseConfigured: true, isCloudReady: true }));

vi.mock("firebase/firestore", () => ({
  collection: (_db: unknown, path: string) => ({ path }),
  doc: (_db: unknown, ...segments: string[]) => ({ path: segments.join("/") }),
  query: (target: { path: string }, ...constraints: unknown[]) => ({ path: target.path, constraints }),
  orderBy: (field: string, direction: string) => ({ field, direction }),
  limit: (value: number) => ({ limit: value }),
  where: (field: string, op: string, value: unknown) => ({ field, op, value }),
  serverTimestamp: () => "SERVER_TS",
  getCountFromServer: async (q: { path: string; constraints?: unknown[] }) => {
    h.stats.countQueries.push({ path: q.path, where: q.constraints });
    return { data: () => ({ count: 3 }) };
  },
  setDoc: async (ref: { path: string }, data: Record<string, unknown>) => { h.store.set(ref.path, data); },
  onSnapshot: (
    q: { path: string; constraints?: Array<{ limit?: number }> },
    onChange: (snapshot: { docs: Array<{ id: string; data: () => Record<string, unknown> }> }) => void,
  ) => {
    const docs = [...h.store.entries()]
      .filter(([key]) => key.startsWith(`${q.path}/`))
      .map(([key, data]) => ({ id: key.slice(q.path.length + 1), data: () => data }));
    const lim = q.constraints?.find((item) => typeof item.limit === "number")?.limit;
    onChange({ docs: typeof lim === "number" ? docs.slice(0, lim) : docs });
    return () => { h.stats.unsubs += 1; };
  },
}));

import type { VerificationStatus } from "../utils/freshness";
import {
  VERIFICATIONS_LIMIT,
  addPlaceVerification,
  countPlaceVerifications,
  freshnessReaderUid,
  normalizeVerification,
  subscribeRecentVerifications,
  verificationIdFor,
} from "./verifications";

beforeEach(() => {
  h.store.clear();
  h.stats.unsubs = 0;
  h.stats.countQueries = [];
});

describe("verificationIdFor", () => {
  it("deterministik kimlik üretir: {placeId}_{uid}", () => {
    expect(verificationIdFor("efes", "u1")).toBe("efes_u1");
    expect(verificationIdFor(" efes ", " u1 ")).toBe("efes_u1");
    expect(verificationIdFor("efes", "u1")).toBe(verificationIdFor("efes", "u1"));
  });
});

describe("normalizeVerification", () => {
  it("bilinmeyen durumu güvenli varsayılana çeker", () => {
    expect(normalizeVerification("x", { placeId: "p", uid: "u", status: "saçma" }).status).toBe("still_open");
  });

  it("geçerli durumu korur ve eksik alanları boşaltır", () => {
    const normalized = normalizeVerification("x", { placeId: "p", uid: "u", status: "closed", note: "kapanmış" });

    expect(normalized).toMatchObject({ id: "x", placeId: "p", uid: "u", status: "closed", note: "kapanmış", createdAt: 0 });
    expect(normalizeVerification("y", {}).note).toBeUndefined();
  });
});

describe("freshnessReaderUid", () => {
  it("yalnız bulut (firebase) hesabında uid döner", () => {
    expect(freshnessReaderUid({ uid: "u1", backend: "firebase" })).toBe("u1");
  });

  it("cihaz hesabında undefined (kural signedIn ister; istek atılmaz)", () => {
    expect(freshnessReaderUid({ uid: "u1", backend: "device" })).toBeUndefined();
  });

  it("boş uid veya hesap yoksa undefined", () => {
    expect(freshnessReaderUid({ uid: "  ", backend: "firebase" })).toBeUndefined();
    expect(freshnessReaderUid(null)).toBeUndefined();
    expect(freshnessReaderUid(undefined)).toBeUndefined();
  });
});

describe("subscribeRecentVerifications", () => {
  it("50 kayıt tavanıyla okur ve aboneliği kapatır", () => {
    for (let index = 0; index < 60; index += 1) {
      h.store.set(`verifications/p${index}_u`, { placeId: `p${index}`, uid: "u", status: "still_open", createdAt: index });
    }
    let received: unknown[] = [];

    const unsubscribe = subscribeRecentVerifications((items) => { received = items; });
    expect(received).toHaveLength(VERIFICATIONS_LIMIT);

    unsubscribe();
    expect(h.stats.unsubs).toBe(1);
  });
});

describe("addPlaceVerification", () => {
  it("deterministik kimliğe, kapalı alan kümesiyle yazar", async () => {
    const result = await addPlaceVerification({ placeId: "efes", uid: "u1", status: "still_open", note: " açık " });

    expect([...h.store.keys()]).toEqual(["verifications/efes_u1"]);
    expect(h.store.get("verifications/efes_u1")).toMatchObject({
      placeId: "efes",
      uid: "u1",
      status: "still_open",
      note: "açık",
      createdAt: "SERVER_TS",
    });
    expect(result.id).toBe("efes_u1");
    expect(result.note).toBe("açık");
  });

  it("boş not alanı hiç yazılmaz", async () => {
    await addPlaceVerification({ placeId: "efes", uid: "u1", status: "closed", note: "   " });

    expect(h.store.get("verifications/efes_u1")).not.toHaveProperty("note");
  });

  it("280 karakterden uzun notu kırpmaz, kural koduyla reddeder", async () => {
    // Kural katmanı da reddeder; istemci sessizce kırpsaydı kullanıcı notunun
    // kesildiğini görmezdi. Davranış: açık ret.
    await expect(addPlaceVerification({
      placeId: "efes",
      uid: "u1",
      status: "closed",
      note: "n".repeat(400),
    })).rejects.toMatchObject({ code: "verification/note-too-long" });
    expect(h.store.size).toBe(0);
  });

  it("giriş yoksa auth/required koduyla reddeder, hiç yazmaz", async () => {
    await expect(addPlaceVerification({ placeId: "efes", uid: "  ", status: "still_open" }))
      .rejects.toMatchObject({ code: "auth/required" });
    expect(h.store.size).toBe(0);
  });

  it("geçersiz durumu kural koduyla reddeder", async () => {
    await expect(addPlaceVerification({
      placeId: "efes",
      uid: "u1",
      status: "olmayan" as unknown as VerificationStatus,
    })).rejects.toMatchObject({ code: "verification/status-invalid" });
    expect(h.store.size).toBe(0);
  });

  it("kimliği bölecek eğik çizgiyi erken reddeder", async () => {
    await expect(addPlaceVerification({ placeId: "a/b", uid: "u1", status: "still_open" }))
      .rejects.toMatchObject({ code: "verification/place-invalid" });
    await expect(addPlaceVerification({ placeId: "efes", uid: "u/1", status: "still_open" }))
      .rejects.toMatchObject({ code: "verification/place-invalid" });
    expect(h.store.size).toBe(0);
  });
});

describe("countPlaceVerifications", () => {
  it("placeId eşitliği ve 50 tavanıyla toplama sorgusu yapar", async () => {
    await expect(countPlaceVerifications(" efes ")).resolves.toBe(3);

    const query = h.stats.countQueries[0];
    expect(query.path).toBe("verifications");
    expect(JSON.stringify(query.where)).toContain("efes");
    expect(JSON.stringify(query.where)).toContain(String(VERIFICATIONS_LIMIT));
  });

  it("boş placeId'de ağa çıkmaz", async () => {
    await expect(countPlaceVerifications("   ")).resolves.toBe(0);
    expect(h.stats.countQueries).toHaveLength(0);
  });
});
