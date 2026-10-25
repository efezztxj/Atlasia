import { describe, expect, it } from "vitest";
import {
  REPORT_REASONS,
  REPORT_STATUSES,
  REPORT_TARGET_TYPES,
  blockIdFor,
  normalizeReport,
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

describe("moderatör kuyruğu sözleşmesi", () => {
  it("durum alanı olmayan eski rapor 'open' sayılır", () => {
    const legacy = normalizeReport("r1", {
      reporterUid: "member",
      targetType: "post",
      targetId: "post-1",
      reason: "spam",
      createdAt: 1_700_000_000_000,
    });
    expect(legacy.status).toBe("open");
    expect(legacy.resolution).toBeUndefined();
  });

  it("bilinmeyen durum değeri açık kabul edilir (fail-closed)", () => {
    const odd = normalizeReport("r2", { reporterUid: "m", status: "approved" });
    expect(odd.status).toBe("open");
  });

  it("geçerli durum, not ve inceleme zamanı okunur", () => {
    const report = normalizeReport("r3", {
      reporterUid: "m",
      status: "actioned",
      resolution: "İçerik kaldırıldı.",
      reviewedAt: 1_700_000_000_000,
    });
    expect(report.status).toBe("actioned");
    expect(report.resolution).toBe("İçerik kaldırıldı.");
    expect(report.reviewedAt).toBe(1_700_000_000_000);
  });

  it("durum listesi kapalı ve üç değerden oluşur", () => {
    expect(REPORT_STATUSES).toEqual(["open", "reviewed", "actioned"]);
  });
});
