/**
 * Hesap silme yolu testleri (P4 Tur 5, görev 1–2).
 * Firebase ve Auth SDK'ları sahte. Amaç: backend'e göre doğru yol, yeniden doğrulama
 * veri silmeden ÖNCE, hata varsa hiçbir şey silinmemesi.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  const state = {
    log: [] as string[],
    reauthFail: null as null | { code: string },
    deleteFail: false,
    current: null as null | {
      uid: string;
      email: string | null;
      providerData: Array<{ providerId: string }>;
    },
  };
  return { state };
});

vi.mock("./firebase", () => ({ db: {}, firebaseApp: {}, firebaseConfigured: true, isCloudReady: true }));
vi.mock("./auth", () => ({ getAtlasAuth: async () => ({ currentUser: h.state.current }) }));
vi.mock("./notifications", () => ({ createNotification: async () => "nt-mock" }));
vi.mock("./deviceAccounts", () => ({
  deleteDeviceAccount: async (uid: string) => { h.state.log.push(`device:${uid}`); },
}));
vi.mock("firebase/auth", () => ({
  EmailAuthProvider: { credential: (email: string, password: string) => ({ email, password }) },
  GoogleAuthProvider: class {},
  OAuthProvider: class { constructor(public providerId: string) { void providerId; } },
  reauthenticateWithCredential: async () => {
    h.state.log.push("reauth:password");
    if (h.state.reauthFail) throw Object.assign(new Error("fail"), h.state.reauthFail);
  },
  reauthenticateWithPopup: async () => {
    h.state.log.push("reauth:popup");
    if (h.state.reauthFail) throw Object.assign(new Error("fail"), h.state.reauthFail);
  },
  deleteUser: async () => { h.state.log.push("authDelete"); },
}));
// Firestore: her okuma "data" olarak kaydedilir; boş sonuç döner. Hata enjekte edilebilir.
vi.mock("firebase/firestore", () => {
  const empty = { size: 0, docs: [], exists: () => false, data: () => undefined };
  const record = () => {
    h.state.log.push("data");
    if (h.state.deleteFail) throw Object.assign(new Error("denied"), { code: "permission-denied" });
  };
  return {
    collection: (_db: unknown, ...segments: string[]) => ({ path: segments.join("/") }),
    collectionGroup: (_db: unknown, name: string) => ({ path: name }),
    doc: (_db: unknown, ...segments: string[]) => ({ path: segments.join("/") }),
    query: (target: unknown) => target,
    where: () => ({}),
    limit: () => ({}),
    orderBy: () => ({}),
    documentId: () => "__name__",
    startAfter: () => ({}),
    serverTimestamp: () => "SERVER_TS",
    getDoc: async () => { record(); return empty; },
    getDocs: async () => { record(); return empty; },
    deleteDoc: async () => {},
    updateDoc: async () => {},
    setDoc: async () => {},
    addDoc: async () => ({ id: "x" }),
    writeBatch: () => ({ delete: () => {}, update: () => {}, set: () => {}, commit: async () => {} }),
    onSnapshot: () => () => {},
  };
});

import { deleteAccount, reauthenticateForAccountDeletion } from "./moderation";

vi.stubGlobal("localStorage", { length: 0, key: () => null, removeItem: () => {} });

const passwordUser = { uid: "u1", email: "ada@example.com", providerData: [{ providerId: "password" }] };

describe("hesap silme yolu (backend'e göre)", () => {
  beforeEach(() => {
    h.state.log.length = 0;
    h.state.reauthFail = null;
    h.state.deleteFail = false;
    h.state.current = passwordUser;
  });

  it("cihaz hesabı: yalnız cihaz hesabı silinir; Firestore'a ve Auth'a hiç dokunulmaz", async () => {
    h.state.current = null; // cihaz hesabında Firebase oturumu yoktur
    await deleteAccount({ uid: "d1", backend: "device" });

    expect(h.state.log).toEqual(["device:d1"]);
  });

  it("firebase hesabı: yeniden doğrulama → veri → Auth sırasıyla çalışır", async () => {
    await deleteAccount({ uid: "u1", backend: "firebase", password: "gizli-sifre" });

    expect(h.state.log[0]).toBe("reauth:password");
    expect(h.state.log.indexOf("data")).toBeGreaterThan(0);
    expect(h.state.log.at(-1)).toBe("authDelete");
  });

  it("yeniden doğrulama başarısızsa hiçbir veri silinmez ve Auth hesabı kalır", async () => {
    h.state.reauthFail = { code: "auth/invalid-credential" };

    await expect(deleteAccount({ uid: "u1", backend: "firebase", password: "yanlis" })).rejects.toMatchObject({
      code: "auth/reauth-failed",
      message: expect.stringContaining("Şifre yanlış"),
    });
    expect(h.state.log).toEqual(["reauth:password"]);
  });

  it("veri silme kısmen başarısızsa Auth hesabı silinmez", async () => {
    h.state.deleteFail = true;

    await expect(deleteAccount({ uid: "u1", backend: "firebase", password: "gizli-sifre" })).rejects.toMatchObject({
      code: "data/delete-incomplete",
    });
    expect(h.state.log).not.toContain("authDelete");
  });
});

describe("reauthenticateForAccountDeletion", () => {
  const deps = () => ({
    credential: vi.fn((email: string, password: string) => ({ email, password })),
    withCredential: vi.fn(async () => undefined),
    withPopup: vi.fn(async () => undefined),
  });

  it("e-posta hesabında şifre yoksa reddedilir, hiçbir yeniden doğrulama denenmez", async () => {
    const d = deps();
    await expect(reauthenticateForAccountDeletion(passwordUser, undefined, d)).rejects.toMatchObject({ code: "auth/password-required" });
    expect(d.withCredential).not.toHaveBeenCalled();
  });

  it("Google hesabı popup ile doğrulanır, şifre istenmez", async () => {
    const d = deps();
    await reauthenticateForAccountDeletion({ email: "g@x.com", providerData: [{ providerId: "google.com" }] }, undefined, d);
    expect(d.withPopup).toHaveBeenCalledWith("google.com");
  });

  it("desteklenmeyen sağlayıcıda hiçbir şey denenmeden reddedilir", async () => {
    const d = deps();
    await expect(
      reauthenticateForAccountDeletion({ email: null, providerData: [{ providerId: "phone" }] }, undefined, d),
    ).rejects.toMatchObject({ code: "auth/reauth-unsupported" });
    expect(d.withPopup).not.toHaveBeenCalled();
    expect(d.withCredential).not.toHaveBeenCalled();
  });
});
