/**
 * Atlasia — Firestore hata sınıflandırma katmanı.
 *
 * Neden ayrı modül?
 * Kullanıcı "Missing or insufficient permissions" metnini hem rota kaydederken hem
 * de Kayıtlarım'ın dört sekmesinde görüyordu. Firestore'un `permission-denied`
 * kodu EN AZ üç farklı gerçek durumu gizler:
 *
 *   1. Belge **hiç yok** — `get` kuralı `resource.data`'ya dokunduğu için var
 *      olmayan bir belgeyi okumak "not found" değil "permission-denied" döner.
 *      Bu, yeni rota oluştururken yaşanan hatanın kök nedenidir.
 *   2. Belge var ama **okuma hakkımız yok** (başkasının private rotası).
 *   3. Belge var, okunabilir ama **yazma kuralı** reddetti (gerçek yetki sorunu).
 *
 * (1) ile (2)/(3) aynı koda sahiptir; ayrımı istemci yapamaz. Bu yüzden doğru
 * davranış: ön-okumayı "reddedildi = yok say" olarak ele al, **nihai kararı
 * Firestore kurallarına bırak** (yazma denemesi zaten kuraldan geçer).
 *
 * Bu modül kuralları GEVŞETMEZ; yalnızca hatanın hangi aşamada oluştuğunu
 * kullanıcıya anlaşılır biçimde taşır.
 */

/** Firestore SDK'sının attığı hatalarda `code` alanı `FirestoreErrorCode` biçimindedir. */
export type FirestoreFailureCode =
  | "permission-denied"
  | "not-found"
  | "already-exists"
  | "aborted"
  | "unavailable"
  | "unauthenticated"
  | "failed-precondition"
  | "resource-exhausted"
  | "cancelled"
  | "invalid-argument"
  | "data-loss"
  | "deadline-exceeded"
  | "internal"
  | "unimplemented"
  | "ok"
  | "unknown";

/** Bilinmeyen bir değeri güvenli biçimde hata kodu metnine indirger. */
export function firestoreErrorCode(failure: unknown): string {
  if (!failure || typeof failure !== "object") return "";
  const candidate = failure as { code?: unknown };
  if (typeof candidate.code === "string") {
    // SDK bazen "firebase/firestore/permission-denied" gibi önekli yollar da üretir.
    const trimmed = candidate.code.trim();
    const separator = trimmed.lastIndexOf("/");
    return separator >= 0 ? trimmed.slice(separator + 1) : trimmed;
  }
  return "";
}

/** `name` alanı `FirestoreError` sınıflarında "FirestoreError" değerini taşır. */
export function isFirestoreFailure(failure: unknown): boolean {
  if (!failure || typeof failure !== "object") return false;
  const candidate = failure as { name?: unknown; code?: unknown };
  return candidate.name === "FirestoreError" || typeof candidate.code === "string";
}

export function isPermissionDenied(failure: unknown): boolean {
  return firestoreErrorCode(failure) === "permission-denied";
}

export function isNotFound(failure: unknown): boolean {
  return firestoreErrorCode(failure) === "not-found";
}

export function isUnavailable(failure: unknown): boolean {
  const code = firestoreErrorCode(failure);
  return code === "unavailable" || code === "deadline-exceeded";
}

export function isUnauthenticated(failure: unknown): boolean {
  const code = firestoreErrorCode(failure);
  return code === "unauthenticated" || code === "permission-denied";
}

/**
 * İşlem aşamaları. Hata mesajı hangi adımın başarısız olduğunu söylemeli ki
 * kullanıcı (ve destek) "rota mı kaydedilemedi, sayaç mı güncellenemedi"
 * ayrımını görebilsin.
 */
export type RouteStage =
  | "route/probe"
  | "route/create"
  | "route/update"
  | "route/save-reference"
  | "route/remove-reference"
  | "route/counter"
  | "route/list-public"
  | "saved-places/probe"
  | "saved-places/write"
  | "track/list"
  | "track/create"
  | "track/delete"
  | "saved-places/subscribe"
  | "saved-routes/subscribe";

const STAGE_LABELS: Record<RouteStage, string> = {
  "route/probe": "rota kaydı okunurken",
  "route/create": "rota oluşturulurken",
  "route/update": "rota güncellenirken",
  "route/save-reference": "rota kütüphanene eklenirken",
  "route/remove-reference": "rota kütüphanenden kaldırılırken",
  "route/counter": "rota kayıt sayacı güncellenirken",
  "route/list-public": "açık rotalar listelenirken",
  "saved-places/probe": "kayıtlı yer okunurken",
  "saved-places/write": "yer kaydı güncellenirken",
  "track/list": "özel izler listelenirken",
  "track/create": "özel iz kaydedilirken",
  "track/delete": "özel iz silinirken",
  "saved-places/subscribe": "kayıtlı yerler dinlenirken",
  "saved-routes/subscribe": "kayıtlı rotalar dinlenirken",
};

/** Aşamanın kullanıcıya gösterilen Türkçe adı. */
export function stageLabel(stage: RouteStage): string {
  return STAGE_LABELS[stage];
}

export interface ClassifiedFailure {
  stage: RouteStage;
  code: string;
  /** Kullanıcıya gösterilebilir, aşamayı adıyla anan mesaj. */
  message: string;
  /** Gerçek bir yetki sorunu mu, yoksa "belge yok" yan etkisi mi? */
  genuinePermissionProblem: boolean;
  /** Ağ/oturum gibi geçici durum; kullanıcı "tekrar dene" ile çözebilir. */
  retryable: boolean;
}

/**
 * Ham Firestore hatasını aşamaya bağlı, kullanıcıya gösterilebilir bir kayda
 * çevirir. `genuinePermissionProblem=false` olduğunda çağıran taraf hatayı
 * yutabilir (ör. var olmayan belgeyi okuma denemesi) ama mesajı saklamaz.
 *
 * @param failure   yakalanan hata
 * @param stage     başarısız olan işlem aşaması
 * @param owned     işlem kullanıcının kendi belgesi üzerinde mi? (mesaj tonunu belirler)
 */
export function classifyFailure(
  failure: unknown,
  stage: RouteStage,
  owned = true,
): ClassifiedFailure {
  const code = firestoreErrorCode(failure) || "unknown";
  const label = stageLabel(stage);
  const retryable = isUnavailable(failure);

  if (code === "permission-denied") {
    // Ön-okuma aşamasında permission-denied "belge yok olabilir" demektir; bu
    // gerçek bir yetki sorunu değildir ve çağıran taraf yazmayla devam eder.
    if (stage === "route/probe") {
      return {
        stage,
        code,
        message: `Rota kaydı okunamadı (${label}). Belge henüz oluşmamış olabilir; oluşturma denenecek.`,
        genuinePermissionProblem: false,
        retryable: false,
      };
    }
    return {
      stage,
      code,
      message: owned
        ? `İzin verilmedi: ${label}. Bu kayıt sana ait olmayabilir veya oturumun eski olabilir.`
        : `İzin verilmedi: ${label}. Bu kayıt başka bir kullanıcıya ait.`,
      genuinePermissionProblem: true,
      retryable: false,
    };
  }

  if (code === "unauthenticated") {
    return {
      stage,
      code,
      message: `Oturum doğrulanamadı (${label}). Yeniden giriş yapman gerekebilir.`,
      genuinePermissionProblem: false,
      retryable: true,
    };
  }

  if (retryable) {
    return {
      stage,
      code,
      message: `Bağlantı sorunu: ${label}. Biraz sonra yeniden dene.`,
      genuinePermissionProblem: false,
      retryable: true,
    };
  }

  if (code === "not-found") {
    return {
      stage,
      code,
      message: `Kayıt bulunamadı: ${label}.`,
      genuinePermissionProblem: false,
      retryable: false,
    };
  }

  if (code === "failed-precondition") {
    return {
      stage,
      code,
      message: `İşlem çakıştı: ${label}. Sayfayı yenileyip yeniden dene.`,
      genuinePermissionProblem: false,
      retryable: true,
    };
  }

  const raw = failure instanceof Error && failure.message ? failure.message : "";
  return {
    stage,
    code,
    message: raw ? `${label} başarısız: ${raw}` : `Beklenmeyen hata: ${label}.`,
    genuinePermissionProblem: false,
    retryable: false,
  };
}

/**
 * Sınıflandırılmış hatayı, kodu kaybolmadan ama mesajı korunarak yeniden fırlatılabilir
 * bir `Error` nesnesine sarar. Böylece üst katmanlar hem `code` hem `stage` görebilir.
 *
 * @param messageOverride verilirse kullanıcının göreceği metin budur. `Object.assign`
 *   ile `classified.message`'ın Error'ün kendi `message` alanını ezmesini önlemek
 *   için alanlar tek tek atanır.
 */
export function stagedError(
  failure: unknown,
  stage: RouteStage,
  owned = true,
  messageOverride?: string,
): Error & ClassifiedFailure & { originalMessage: string; cause?: unknown } {
  const classified = classifyFailure(failure, stage, owned);
  const original = failure instanceof Error && failure.message ? failure.message : classified.message;
  const message = messageOverride ?? classified.message;
  const error = new Error(message) as Error & ClassifiedFailure & { cause?: unknown; originalMessage: string };
  error.name = "AtlasiaStagedError";
  error.cause = failure;
  // `message` bilinçli olarak spread edilmez: Error'ün own property'sidir ve
  // üzerine yazılırsa kullanıcıya giden metin kaybolur.
  error.stage = classified.stage;
  error.code = classified.code;
  error.genuinePermissionProblem = classified.genuinePermissionProblem;
  error.retryable = classified.retryable;
  error.originalMessage = original;
  return error;
}
