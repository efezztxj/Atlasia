import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ writes: [] as Array<Record<string, unknown>>, fail: false }));

vi.mock("./firebase", () => ({ db: {}, firebaseApp: {}, firebaseConfigured: true, isCloudReady: true }));
vi.mock("firebase/firestore", () => ({
  collection: (_db: unknown, name: string) => ({ path: name }),
  addDoc: async (_ref: { path: string }, data: Record<string, unknown>) => {
    if (h.fail) throw Object.assign(new Error("Missing or insufficient permissions."), { code: "permission-denied" });
    // Gerçek Firestore undefined alanı kabul etmez.
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) throw new Error(`undefined alan: ${key}`);
    }
    h.writes.push(data);
    return { id: "f1" };
  },
  serverTimestamp: () => "SERVER_TS",
}));

import {
  FEEDBACK_APP_VERSION,
  FEEDBACK_COOLDOWN_MS,
  FEEDBACK_MESSAGE_MAX,
  feedbackCooldownRemainingMs,
  submitFeedback,
  validateFeedbackDraft,
} from "./feedback";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => { map.set(key, value); },
    removeItem: (key: string) => { map.delete(key); },
    clear: () => map.clear(),
    key: () => null,
    get length() { return map.size; },
  } as Storage;
}

describe("geri bildirim doğrulama ve bekleme", () => {
  beforeEach(() => {
    h.writes.length = 0;
    h.fail = false;
  });

  it("kategori enum dışındaysa ve boş/çok uzun mesajı reddeder", () => {
    expect(validateFeedbackDraft({ category: "spam", message: "x" }).ok).toBe(false);
    expect(validateFeedbackDraft({ category: "bug", message: "   " }).ok).toBe(false);
    expect(validateFeedbackDraft({ category: "bug", message: "a".repeat(FEEDBACK_MESSAGE_MAX + 1) }).ok).toBe(false);
    const ok = validateFeedbackDraft({ category: "idea", message: "  Harika olur.  " });
    expect(ok).toEqual({ ok: true, category: "idea", message: "Harika olur." });
  });

  it("bekleme süresi 5 dakika; süre dolunca 0", () => {
    const sent = 1_000_000;
    expect(feedbackCooldownRemainingMs(null, sent)).toBe(0);
    expect(feedbackCooldownRemainingMs(sent, sent + 1000)).toBe(FEEDBACK_COOLDOWN_MS - 1000);
    expect(feedbackCooldownRemainingMs(sent, sent + FEEDBACK_COOLDOWN_MS)).toBe(0);
  });

  it("uygulama sürümü package.json ile aynı (sessiz ayrışma olmasın)", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { version: string };
    expect(FEEDBACK_APP_VERSION).toBe(pkg.version);
  });
});

describe("geri bildirim yazımı (sahte Firestore)", () => {
  beforeEach(() => {
    h.writes.length = 0;
    h.fail = false;
  });

  it("yalnız izinli alanları yazar; konum/cihaz alanı yok; undefined yok", async () => {
    const storage = memoryStorage();
    const result = await submitFeedback("alice", { category: "bug", message: "Donuyor." }, { now: 10, storage });

    expect(result).toEqual({ ok: true });
    expect(h.writes).toHaveLength(1);
    expect(Object.keys(h.writes[0]).sort()).toEqual(["appVersion", "category", "createdAt", "message", "uid"]);
    expect(h.writes[0]).toMatchObject({ uid: "alice", category: "bug", createdAt: "SERVER_TS" });
  });

  it("5 dakika içindeki ikinci gönderim yazılmadan reddedilir", async () => {
    const storage = memoryStorage();
    await submitFeedback("alice", { category: "idea", message: "Bir." }, { now: 10_000, storage });
    const second = await submitFeedback("alice", { category: "idea", message: "İki." }, { now: 10_000 + 60_000, storage });

    expect(second.ok).toBe(false);
    expect(second.cooldownMs).toBeGreaterThan(0);
    expect(h.writes).toHaveLength(1);

    const third = await submitFeedback("alice", { category: "idea", message: "Üç." }, { now: 10_000 + FEEDBACK_COOLDOWN_MS + 1, storage });
    expect(third.ok).toBe(true);
    expect(h.writes).toHaveLength(2);
  });

  it("Firestore reddederse hata açıkça döner ve son gönderim kaydedilmez", async () => {
    const storage = memoryStorage();
    h.fail = true;
    await expect(submitFeedback("alice", { category: "other", message: "Test." }, { now: 5, storage })).rejects.toMatchObject({
      code: "permission-denied",
    });
    expect(storage.getItem("atlasia.feedback.lastSentAt.alice")).toBeNull();
  });

  it("giriş yoksa yazmaz", async () => {
    const result = await submitFeedback("  ", { category: "bug", message: "x" }, { now: 1, storage: memoryStorage() });
    expect(result.ok).toBe(false);
    expect(h.writes).toHaveLength(0);
  });
});
