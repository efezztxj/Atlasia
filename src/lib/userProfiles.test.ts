import { describe, expect, it } from "vitest";
import { normalizeUserProfile, validateDisplayName } from "./userProfiles";

describe("userProfiles", () => {
  it("displayName 2-40 siniri", () => {
    expect(validateDisplayName("Ay")).toBeNull();
    expect(validateDisplayName("A")).toBe("profile/name-too-short");
    expect(validateDisplayName("a".repeat(41))).toBe("profile/name-too-long");
    expect(validateDisplayName("   Ayşe   ")).toBeNull();
  });

  it("normalize profile", () => {
    const p = normalizeUserProfile("uid1", { displayName: "Ali", photoURL: "https://example.com/a.jpg", createdAt: 1000, updatedAt: 2000 });
    expect(p.uid).toBe("uid1");
    expect(p.displayName).toBe("Ali");
    expect(p.photoURL).toBe("https://example.com/a.jpg");
    const empty = normalizeUserProfile("uid2", {});
    expect(empty.displayName).toBe("Gezgin");
  });
});
