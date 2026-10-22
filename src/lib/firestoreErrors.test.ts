import { describe, expect, it } from "vitest";
import {
  classifyFailure,
  firestoreErrorCode,
  isNotFound,
  isPermissionDenied,
  isUnavailable,
  stagedError,
  stageLabel,
} from "./firestoreErrors";

/** Firestore SDK'sının gerçek hata biçimi: `name: "FirestoreError"` + `code`. */
function firestoreError(code: string, message = "Missing or insufficient permissions.") {
  return Object.assign(new Error(message), { name: "FirestoreError", code });
}

describe("Firestore hata sınıflandırma", () => {
  it("kod alanını düz ve önekli biçimlerden çözer", () => {
    expect(firestoreErrorCode(firestoreError("permission-denied"))).toBe("permission-denied");
    // SDK bazı sürümlerde tam yol üretir; son segment koddur.
    expect(firestoreErrorCode({ code: "firebase/firestore/permission-denied" })).toBe("permission-denied");
    expect(firestoreErrorCode(null)).toBe("");
    expect(firestoreErrorCode("düz metin")).toBe("");
    expect(firestoreErrorCode({})).toBe("");
  });

  it("permission-denied ve not-found ayrımını yapar", () => {
    expect(isPermissionDenied(firestoreError("permission-denied"))).toBe(true);
    expect(isPermissionDenied(firestoreError("not-found"))).toBe(false);
    expect(isNotFound(firestoreError("not-found"))).toBe(true);
    expect(isNotFound(new Error("not-found"))).toBe(false);
  });

  it("ağ/oturum hatalarını yeniden denenebilir işaretler", () => {
    expect(isUnavailable(firestoreError("unavailable"))).toBe(true);
    expect(isUnavailable(firestoreError("deadline-exceeded"))).toBe(true);
    expect(isUnavailable(firestoreError("permission-denied"))).toBe(false);
    expect(classifyFailure(firestoreError("unavailable"), "route/list-public").retryable).toBe(true);
  });

  it("route/probe aşamasındaki izin hatası GERÇEK yetki sorunu değildir (belge yok olabilir)", () => {
    // Kök neden: var olmayan routes/{id} belgesini okumak permission-denied döner,
    // çünkü kural resource.data'ya dokunur. Bu bir yetki ihlali değildir.
    const classified = classifyFailure(firestoreError("permission-denied"), "route/probe");
    expect(classified.genuinePermissionProblem).toBe(false);
    expect(classified.stage).toBe("route/probe");
    expect(classified.message).toContain("oluşturma denenecek");
  });

  it("yazma aşamasındaki izin hatası GERÇEK yetki sorunu olarak işaretlenir", () => {
    for (const stage of ["route/create", "route/save-reference", "route/counter", "track/create"] as const) {
      const classified = classifyFailure(firestoreError("permission-denied"), stage);
      expect(classified.genuinePermissionProblem).toBe(true);
      expect(classified.message).toContain(stageLabel(stage));
    }
  });

  it("sahiplik tonu mesajı değiştirir ama kodu gizlemez", () => {
    const own = classifyFailure(firestoreError("permission-denied"), "route/save-reference", true);
    const foreign = classifyFailure(firestoreError("permission-denied"), "route/save-reference", false);
    expect(own.message).toContain("sana ait olmayabilir");
    expect(foreign.message).toContain("başka bir kullanıcıya ait");
    expect(own.code).toBe("permission-denied");
    expect(foreign.code).toBe("permission-denied");
  });

  it("stagedError hem kodu hem aşamayı hem özgün mesajı taşır", () => {
    const original = firestoreError("permission-denied", "Missing or insufficient permissions.");
    const error = stagedError(original, "route/create");
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("AtlasiaStagedError");
    expect(error.stage).toBe("route/create");
    expect(error.code).toBe("permission-denied");
    expect(error.genuinePermissionProblem).toBe(true);
    expect(error.cause).toBe(original);
    expect((error as unknown as { originalMessage: string }).originalMessage)
      .toBe("Missing or insufficient permissions.");
  });

  it("Firestore dışı hatalar da aşama etiketiyle sarılır", () => {
    const error = stagedError(new Error("Rota kayıt sayacı geçersiz."), "route/counter");
    expect(error.stage).toBe("route/counter");
    expect(error.code).toBe("unknown");
    expect(error.message).toContain("rota kayıt sayacı güncellenirken");
  });
});
