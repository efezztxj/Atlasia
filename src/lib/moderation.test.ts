import { describe, expect, it } from "vitest";
import {
  REPORT_REASONS,
  REPORT_STATUSES,
  REPORT_TARGET_TYPES,
  blockIdFor,
  isBanActive,
  normalizeBan,
  normalizeReport,
  validateBanInput,
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

describe("askıya alma (ban) sözleşmesi", () => {
  const input = { uid: "spammer", reason: "Tekrarlanan spam ve hakaret.", reportId: "report-9", days: 30 as const };

  it("geçerli banı kabul eder", () => {
    expect(validateBanInput(input, "mod-1")).toBeNull();
    expect(validateBanInput({ ...input, days: 0 }, "mod-1")).toBeNull();
  });

  it("oturumsuz, kendini askıya alma ve boş kullanıcıyı reddeder", () => {
    expect(validateBanInput(input, "   ")).toBe("auth/required");
    expect(validateBanInput({ ...input, uid: "mod-1" }, "mod-1")).toBe("ban/self");
    expect(validateBanInput({ ...input, uid: "  " }, "mod-1")).toBe("ban/user-invalid");
  });

  it("gerekçe sınırlarını ve raporsuz banı reddeder", () => {
    expect(validateBanInput({ ...input, reason: "spam" }, "mod-1")).toBe("ban/reason-too-short");
    expect(validateBanInput({ ...input, reason: "x".repeat(501) }, "mod-1")).toBe("ban/reason-too-long");
    expect(validateBanInput({ ...input, reportId: "  " }, "mod-1")).toBe("ban/report-invalid");
  });

  it("bilinmeyen süreyi reddeder", () => {
    expect(validateBanInput({ ...input, days: 5 as never }, "mod-1")).toBe("ban/duration-invalid");
  });

  it("süresi dolmuş ban etkin sayılmaz, alan yoksa kalıcıdır", () => {
    const now = 1_700_000_000_000;
    expect(isBanActive({ ...baseBan(), expiresAt: now - 1 }, now)).toBe(false);
    expect(isBanActive({ ...baseBan(), expiresAt: now + 1 }, now)).toBe(true);
    expect(isBanActive(baseBan(), now)).toBe(true);
  });

  it("ban belgesi eksik alanlarla da güvenle normalleşir", () => {
    const ban = normalizeBan("u1", { reason: "Sebep", createdAt: 5 });
    expect(ban.uid).toBe("u1");
    expect(ban.reportId).toBe("");
    expect(ban.expiresAt).toBeUndefined();
    expect(ban.createdAt).toBe(5);
  });
});

function baseBan() {
  return {
    uid: "spammer",
    reason: "Tekrarlanan spam.",
    reportId: "report-9",
    createdAt: 1_700_000_000_000,
    createdBy: "mod-1",
  };
}
