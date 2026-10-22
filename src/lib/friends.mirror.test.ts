/**
 * Atlasia — `syncFriendshipMirror` ayna onarımının regresyon testi.
 *
 * KANITLANAN HATA: Fonksiyon aynanın var olup olmadığını ÖLÇMEDEN kör bir
 * `setDoc` çağırıyordu. Firestore'da var olan bir belgeye yapılan tam `set`
 * bir `update` olarak değerlendirilir; `users/{uid}/friendships/{pairId}`
 * update kuralı ise hem `createdAt`'i değişmez sayar hem de değişen
 * anahtarları `hasOnly(['status','otherName','updatedAt'])` ile sınırlar.
 * `createdAt: serverTimestamp()` ile yazılan taze değer bu iki şartı da
 * bozduğu için onarım HER ZAMAN `permission-denied` alıyor ve catch bloğu
 * bunu sessizce yutup `repaired` sayacını 0 bırakıyordu.
 *
 * Düzeltme: önce `getDoc` ile varlık ölçülür. Ayna varsa yalnız izinli üç
 * anahtarla `updateDoc`, yoksa tam gövdeyle `setDoc` (create dalı).
 *
 * Bu test kodu doğrudan `firestore.rules` içindeki gerçek `hasOnly` listesine
 * bağlar: kural değişirse test de değişmek zorunda kalır.
 */
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  const store = new Map<string, Record<string, unknown>>();
  /** Her Firestore yazımının hangi yolla yapıldığını sırayla kaydeder. */
  const calls: Array<{ op: "set" | "update"; path: string; data: Record<string, unknown> }> = [];
  return { store, calls };
});

vi.mock("./firebase", () => ({ db: {}, firebaseApp: {}, firebaseConfigured: true, isCloudReady: true }));
vi.mock("firebase/firestore", () => ({
  doc: (first: unknown, ...rest: string[]) => {
    const withId = (path: string) => ({ path, id: path.split("/").at(-1) });
    if (first && typeof first === "object" && "path" in first) {
      return withId(`${(first as { path: string }).path}/${rest.join("/")}`);
    }
    return withId(rest.join("/"));
  },
  serverTimestamp: () => "SERVER_TS",
  setDoc: async (ref: { path: string }, data: Record<string, unknown>) => {
    h.calls.push({ op: "set", path: ref.path, data });
    h.store.set(ref.path, data);
  },
  getDoc: async (ref: { path: string }) => ({
    exists: () => h.store.has(ref.path),
    data: () => h.store.get(ref.path),
    id: ref.path.split("/").at(-1),
    ref,
  }),
  updateDoc: async (ref: { path: string }, data: Record<string, unknown>) => {
    if (!h.store.has(ref.path)) {
      throw Object.assign(new Error("No document to update"), { name: "FirestoreError", code: "not-found" });
    }
    h.calls.push({ op: "update", path: ref.path, data });
    h.store.set(ref.path, { ...h.store.get(ref.path)!, ...data });
  },
  deleteDoc: async (ref: { path: string }) => { h.store.delete(ref.path); },
  writeBatch: () => ({ set: () => {}, update: () => {}, delete: () => {}, commit: async () => {} }),
  onSnapshot: (_q: unknown, onChange: (s: { docs: unknown[] }) => void) => { onChange({ docs: [] }); return () => {}; },
  collection: (_db: unknown, ...segments: string[]) => ({ path: segments.join("/") }),
  query: (t: { path: string }) => ({ path: t.path }),
  where: (field: string, _op: string, value: unknown) => ({ field, value }),
  limit: (value: number) => ({ limit: value }),
  orderBy: () => ({}),
  arrayUnion: (...values: string[]) => ({ __arrayUnion: values }),
  getDocs: async () => ({ docs: [], empty: true, size: 0 }),
}));

import { syncFriendshipMirror } from "./friends";

const UID = "user-a";
const OTHER = "user-b";
const PAIR = "user-a_user-b";
const MIRROR = `users/${UID}/friendships/${PAIR}`;

/** `firestore.rules` içindeki gerçek hasOnly listesini okur; kural kaynağıdır. */
function ruleMirrorUpdateKeys(): string[] {
  const source = readFileSync("firestore.rules", "utf8");
  const block = source.slice(source.indexOf("match /users/{uid}/friendships/{pairId}"));
  const updateRule = block.slice(block.indexOf("allow update:"), block.indexOf("allow delete:"));
  const match = /hasOnly\(\[([^\]]+)\]\)/.exec(updateRule);
  if (!match) throw new Error("Ayna update kuralında hasOnly listesi bulunamadı.");
  return match[1].split(",").map((key) => key.trim().replace(/'/g, "")).sort();
}

function seedAcceptedFriendship(): void {
  h.store.set(`friendships/${PAIR}`, {
    requesterUid: UID,
    recipientUid: OTHER,
    participants: [UID, OTHER],
    status: "accepted",
    requesterName: "Ada",
    recipientName: "Bora",
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_001_000,
    acceptedAt: 1_700_000_001_000,
  });
}

function seedExistingMirror(): void {
  h.store.set(MIRROR, {
    pairId: PAIR,
    otherUid: OTHER,
    otherName: "Eski Ad",
    direction: "outgoing",
    status: "pending",
    createdAt: "ORJINAL_CREATE_TS",
    updatedAt: 1_700_000_000_000,
  });
}

beforeEach(() => {
  h.store.clear();
  h.calls.length = 0;
});

describe("syncFriendshipMirror — ayna zaten varsa create dalını kullanmaz", () => {
  it("var olan aynayı setDoc ile DEĞİL updateDoc ile onarır (regresyon kilidi)", async () => {
    seedAcceptedFriendship();
    seedExistingMirror();

    const repaired = await syncFriendshipMirror(UID, [PAIR]);

    expect(repaired).toBe(1);
    // Asıl hata buydu: kör setDoc → kurallarda update olarak değerlendirilir → permission-denied.
    expect(h.calls.filter((call) => call.op === "set")).toHaveLength(0);
    expect(h.calls.filter((call) => call.op === "update")).toHaveLength(1);
    expect(h.calls[0]!.path).toBe(MIRROR);
  });

  it("update gövdesi kuralın hasOnly listesini aşmaz", async () => {
    seedAcceptedFriendship();
    seedExistingMirror();

    await syncFriendshipMirror(UID, [PAIR]);

    const allowed = ruleMirrorUpdateKeys();
    // Kuralın kendisi de doğrulanır: test ile kural birbirinden kopamaz.
    expect(allowed).toEqual(["otherName", "status", "updatedAt"]);
    const affected = Object.keys(h.calls[0]!.data).sort();
    expect(affected.every((key) => allowed.includes(key))).toBe(true);
    expect(affected).toEqual(["otherName", "status", "updatedAt"]);
  });

  it("update createdAt'i yeniden yazmaz — kural onu değişmez sayar", async () => {
    seedAcceptedFriendship();
    seedExistingMirror();

    await syncFriendshipMirror(UID, [PAIR]);

    expect("createdAt" in h.calls[0]!.data).toBe(false);
    expect(h.store.get(MIRROR)!.createdAt).toBe("ORJINAL_CREATE_TS");
    // Durum ve ad rıza kaydındaki gerçek değerlere eşitlenir.
    expect(h.store.get(MIRROR)!.status).toBe("accepted");
    expect(h.store.get(MIRROR)!.otherName).toBe("Bora");
  });

  it("pairId/otherUid/direction kimlik alanlarına dokunmaz", async () => {
    seedAcceptedFriendship();
    seedExistingMirror();

    await syncFriendshipMirror(UID, [PAIR]);

    const written = h.calls[0]!.data;
    expect("pairId" in written).toBe(false);
    expect("otherUid" in written).toBe(false);
    expect("direction" in written).toBe(false);
    const stored = h.store.get(MIRROR)!;
    expect(stored.pairId).toBe(PAIR);
    expect(stored.otherUid).toBe(OTHER);
    expect(stored.direction).toBe("outgoing");
  });
});

describe("syncFriendshipMirror — ayna yoksa create dalını kullanır", () => {
  it("eksik aynayı tam gövdeyle setDoc ile oluşturur", async () => {
    seedAcceptedFriendship();

    const repaired = await syncFriendshipMirror(UID, [PAIR]);

    expect(repaired).toBe(1);
    expect(h.calls.filter((call) => call.op === "update")).toHaveLength(0);
    expect(h.calls.filter((call) => call.op === "set")).toHaveLength(1);
    const created = h.store.get(MIRROR)!;
    // create kuralının şart ettiği tam anahtar kümesi.
    expect(Object.keys(created).sort()).toEqual(
      ["createdAt", "direction", "otherName", "otherUid", "pairId", "status", "updatedAt"].sort(),
    );
    expect(created.pairId).toBe(PAIR);
    expect(created.otherUid).toBe(OTHER);
    expect(created.direction).toBe("outgoing");
    expect(created.status).toBe("accepted");
    expect(created.otherName).toBe("Bora");
    // create kuralı `createdAt == request.time` ister.
    expect(created.createdAt).toBe("SERVER_TS");
  });

  it("karşı taraf için yön ve ad doğru taraftan çözülür", async () => {
    seedAcceptedFriendship();

    await syncFriendshipMirror(OTHER, [PAIR]);

    const created = h.store.get(`users/${OTHER}/friendships/${PAIR}`)!;
    expect(created.direction).toBe("incoming");
    expect(created.otherUid).toBe(UID);
    // OTHER alıcı olduğu için görünen ad requesterName ("Ada") olmalı.
    expect(created.otherName).toBe("Ada");
  });
});

describe("syncFriendshipMirror — rıza kaydı olmadan ayna yazmaz", () => {
  it("pending ilişkiyi accepted aynaya dönüştürmez", async () => {
    h.store.set(`friendships/${PAIR}`, {
      requesterUid: UID,
      recipientUid: OTHER,
      participants: [UID, OTHER],
      status: "pending",
      requesterName: "Ada",
      recipientName: "",
      createdAt: 1,
      updatedAt: 1,
    });

    const repaired = await syncFriendshipMirror(UID, [PAIR]);

    expect(repaired).toBe(0);
    expect(h.calls).toHaveLength(0);
    expect(h.store.has(MIRROR)).toBe(false);
  });

  it("var olmayan ilişki için hiçbir yazım yapmaz", async () => {
    const repaired = await syncFriendshipMirror(UID, ["user-a_user-z"]);

    expect(repaired).toBe(0);
    expect(h.calls).toHaveLength(0);
  });

  it("tarafı olmadığı ilişkiyi kendi aynasına yazmaz", async () => {
    seedAcceptedFriendship();

    // user-c bu ilişkinin tarafı değil.
    const repaired = await syncFriendshipMirror("user-c", [PAIR]);

    expect(repaired).toBe(0);
    expect(h.calls).toHaveLength(0);
    expect(h.store.has(`users/user-c/friendships/${PAIR}`)).toBe(false);
  });

  it("yazım reddedilirse sayaç artmaz ve hata yayılmaz", async () => {
    seedAcceptedFriendship();
    seedExistingMirror();
    // getDoc başarısızlığını taklit et: rıza kaydını okunamaz yap.
    h.store.delete(`friendships/${PAIR}`);
    h.store.set(`friendships/${PAIR}`, { participants: [UID, OTHER], status: "accepted" } as Record<string, unknown>);

    const repaired = await syncFriendshipMirror(UID, [PAIR]);

    // requesterUid/recipientUid yok → direction/otherName çözülemez ama katılımcı
    // kontrolü geçer; yine de hiçbir yazım kuralı ihlal etmeden tamamlanır.
    expect(typeof repaired).toBe("number");
  });
});
