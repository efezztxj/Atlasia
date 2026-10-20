import { describe, expect, it } from "vitest";
import {
  REPORT_REASONS,
  REPORT_TARGET_TYPES,
  blockIdFor,
  validateReportInput,
} from "./moderation";

const base = {
  targetType: "post" as const,
  targetId: "post-1",
  reason: "spam" as const,
};

describe("moderasyon sözleşmesi", () => {
  it("rapor nedenleri ve hedef türleri kapalı listelerdir", () => {
    expect(REPORT_REASONS).toEqual(["spam", "harassment", "hate", "misinfo", "privacy", "other"]);
    expect(REPORT_TARGET_TYPES).toEqual(["place", "post", "story", "user"]);
  });

  it("geçerli raporu kabul eder, sahibi ve ayrıntısı isteğe bağlıdır", () => {
    expect(validateReportInput(base, "member-a")).toBeNull();
    expect(validateReportInput({ ...base, targetOwnerUid: "owner", details: "Kural ihlali" }, "member-a")).toBeNull();
  });

  it("oturumsuz, bilinmeyen neden ve bilinmeyen hedefi reddeder", () => {
    expect(validateReportInput(base, "   ")).toBe("auth/required");
    expect(validateReportInput({ ...base, reason: "begenmedim" }, "member-a")).toBe("report/reason-invalid");
    expect(validateReportInput({ ...base, targetType: "comment" }, "member-a")).toBe("report/target-type-invalid");
  });

  it("boş veya aşırı uzun hedef ve ayrıntıyı reddeder", () => {
    expect(validateReportInput({ ...base, targetId: "  " }, "member-a")).toBe("report/target-invalid");
    expect(validateReportInput({ ...base, targetId: "x".repeat(201) }, "member-a")).toBe("report/target-invalid");
    expect(validateReportInput({ ...base, details: "x".repeat(1001) }, "member-a")).toBe("report/details-too-long");
  });

  it("engelleme kimliği çift için deterministik ve kendini engelleme ayrı denetlenir", () => {
    expect(blockIdFor("member-a", "member-b")).toBe("member-a_member-b");
    expect(blockIdFor(" member-a ", "member-b")).toBe(blockIdFor("member-a", "member-b"));
    expect(blockIdFor("member-a", "member-a")).toBe("member-a_member-a");
  });
});
