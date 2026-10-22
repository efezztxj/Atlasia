import { describe, expect, it, vi } from "vitest";

vi.mock("./firebase", () => ({ db: {} }));

import { normalizeFollow, validateFollowPair } from "./follows";

describe("validateFollowPair", () => {
  it("kimlikleri kırpar ve çifti döndürür", () => {
    expect(validateFollowPair("  me ", " you ")).toEqual({ followerUid: "me", targetUid: "you" });
  });

  it("kendini takip kodlu hatayla reddedilir", () => {
    expect(() => validateFollowPair("me", "me")).toThrowError(expect.objectContaining({ code: "follow/self" }));
  });

  it("boş ya da 128 karakterden uzun kimlik reddedilir (kural sınırıyla aynı)", () => {
    expect(() => validateFollowPair("", "you")).toThrowError(expect.objectContaining({ code: "follow/uid-invalid" }));
    expect(() => validateFollowPair("me", "  ")).toThrowError(expect.objectContaining({ code: "follow/uid-invalid" }));
    expect(() => validateFollowPair("me", "x".repeat(129))).toThrowError(expect.objectContaining({ code: "follow/uid-invalid" }));
    expect(validateFollowPair("me", "x".repeat(128)).targetUid).toHaveLength(128);
  });
});

describe("normalizeFollow", () => {
  it("eksik alanlarda güvenli varsayılanlar; zaman damgası çevrilir", () => {
    expect(normalizeFollow("you", {})).toEqual({ followerUid: "", targetUid: "you", createdAt: 0 });
    expect(normalizeFollow("you", { followerUid: "me", targetUid: "you", createdAt: { toMillis: () => 42 } }))
      .toEqual({ followerUid: "me", targetUid: "you", createdAt: 42 });
  });
});
