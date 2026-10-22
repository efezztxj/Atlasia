import { describe, expect, it, vi } from "vitest";
import { needsProfileSync, syncProfileForUser } from "./profileSync";

describe("needsProfileSync", () => {
  it("yalnız bulut hesabında ve 2–40 karakterlik adla true", () => {
    expect(needsProfileSync({ uid: "u1", displayName: "Ada", backend: "firebase" })).toBe(true);
    expect(needsProfileSync({ uid: "u1", displayName: "  Ada  ", backend: "firebase" })).toBe(true);
    expect(needsProfileSync({ uid: "u1", displayName: "A", backend: "firebase" })).toBe(false);
    expect(needsProfileSync({ uid: "u1", displayName: "   ", backend: "firebase" })).toBe(false);
    expect(needsProfileSync({ uid: "u1", displayName: "x".repeat(41), backend: "firebase" })).toBe(false);
    expect(needsProfileSync({ uid: "u1", displayName: "Ada", backend: "device" })).toBe(false);
    expect(needsProfileSync({ uid: " ", displayName: "Ada", backend: "firebase" })).toBe(false);
    expect(needsProfileSync(null)).toBe(false);
    expect(needsProfileSync(undefined)).toBe(false);
  });
});

describe("syncProfileForUser", () => {
  it("kırpılmış uid/ad ve foto ile tek yazma yapar", async () => {
    const sync = vi.fn(async () => undefined);
    await expect(
      syncProfileForUser({ uid: " u1 ", displayName: " Ada Nur ", photoURL: " https://x.dev/a.png ", backend: "firebase" }, sync),
    ).resolves.toBe(true);
    expect(sync).toHaveBeenCalledWith({ uid: "u1", displayName: "Ada Nur", photoURL: "https://x.dev/a.png" });
  });

  it("gerekmeyen durumda hiç yazmaz", async () => {
    const sync = vi.fn(async () => undefined);
    await expect(syncProfileForUser({ uid: "u1", displayName: "A", backend: "firebase" }, sync)).resolves.toBe(false);
    await expect(syncProfileForUser({ uid: "u1", displayName: "Ada", backend: "device" }, sync)).resolves.toBe(false);
    expect(sync).not.toHaveBeenCalled();
  });

  it("yazma hatası yutulmaz, çağırana taşınır", async () => {
    const failure = Object.assign(new Error("denied"), { code: "permission-denied" });
    await expect(
      syncProfileForUser({ uid: "u1", displayName: "Ada", backend: "firebase" }, async () => {
        throw failure;
      }),
    ).rejects.toBe(failure);
  });
});
