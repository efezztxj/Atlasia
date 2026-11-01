import { describe, expect, it } from "vitest";
import { analyticsConsentGranted, startTelemetry } from "./telemetryBootstrap";
import { telemetryDiagnostics } from "./telemetryDiagnostics";
import { createTelemetry, type TelemetryRecord } from "./telemetry";
import { COOKIE_CONSENT_MAX_AGE_SECONDS, COOKIE_CONSENT_VERSION } from "./cookieConsent";

function fakeWindow() {
  const handlers = new Map<string, Set<(event: Event) => void>>();
  return {
    handlers,
    addEventListener(type: string, handler: (event: Event) => void) {
      if (!handlers.has(type)) handlers.set(type, new Set());
      handlers.get(type)!.add(handler);
    },
    removeEventListener(type: string, handler: (event: Event) => void) {
      handlers.get(type)?.delete(handler);
    },
    fire(type: string, event: unknown) {
      for (const handler of handlers.get(type) ?? []) handler(event as Event);
    },
    count() {
      let total = 0;
      for (const set of handlers.values()) total += set.size;
      return total;
    },
  };
}

function buildTelemetry(canSend: boolean, endpoint: string | null = "https://ornek.test/t") {
  const records: TelemetryRecord[] = [];
  const telemetry = createTelemetry({
    endpoint,
    canSend: () => canSend,
    send: (batch) => records.push(...batch),
    now: (() => {
      let stamp = 0;
      return () => (stamp += 10_000);
    })(),
    path: () => "/uygulama/",
    sessionId: "s1",
  });
  return { telemetry, records };
}

describe("telemetryBootstrap", () => {
  it("uç nokta yoksa ağ kapalı, açılış olayları yine de bellekte", () => {
    const fake = fakeWindow();
    const { telemetry, records } = buildTelemetry(true, null);
    const handle = startTelemetry({ telemetry, target: fake as unknown as Window });
    expect(records).toHaveLength(0);
    expect(handle.telemetry.drainBuffer().map((r) => r.name)).toEqual(["app_open", "session_start"]);
  });

  it("rıza yoksa ağa çıkmaz, rıza verilince sonraki olaylar akar", () => {
    let consent = false;
    const records: TelemetryRecord[] = [];
    const telemetry = createTelemetry({
      endpoint: "https://ornek.test/t",
      canSend: () => consent,
      send: (batch) => records.push(...batch),
      now: (() => {
        let stamp = 0;
        return () => (stamp += 10_000);
      })(),
      path: () => "/",
      sessionId: "s1",
    });
    const fake = fakeWindow();
    startTelemetry({ telemetry, target: fake as unknown as Window });

    telemetry.track("sign_in", { account: "cloud" });
    expect(records).toHaveLength(0);

    consent = true;
    telemetry.track("place_created", { account: "cloud" });
    // Rıza öncesi kayıt geriye dönük gönderilmez; yalnız yeni olay çıkar.
    expect(records.flat().every((r) => r.name === "place_created")).toBe(true);
  });

  it("global hata dinleyicileri kurulur ve stop ile temizlenir", () => {
    const fake = fakeWindow();
    const { telemetry } = buildTelemetry(false);
    const handle = startTelemetry({ telemetry, target: fake as unknown as Window });
    expect(fake.handlers.get("error")?.size).toBe(1);
    expect(fake.handlers.get("unhandledrejection")?.size).toBe(1);

    fake.fire("error", { error: new Error("patladı"), filename: "https://a/b.js", lineno: 2 });
    expect(telemetry.drainBuffer().some((r) => r.level === "error")).toBe(true);

    handle.stop();
    expect(fake.count()).toBe(0);
  });

  it("açılış olayları kapatılabilir (ikinci kez sayılmasın)", () => {
    const fake = fakeWindow();
    const { telemetry } = buildTelemetry(false);
    startTelemetry({ telemetry, target: fake as unknown as Window, sendOpenEvents: false });
    expect(telemetry.drainBuffer()).toHaveLength(0);
  });

  it("rıza yokken analytics kapısı kapalıdır", () => {
    expect(analyticsConsentGranted()).toBe(false);
  });

  it("geçerli çerez kaydı çözümlenip kapıyı açar", async () => {
    const { parseCookieConsent, hasCookieConsent } = await import("./cookieConsent");
    const record = parseCookieConsent(
      JSON.stringify({
        version: COOKIE_CONSENT_VERSION,
        analytics: true,
        marketing: false,
        updatedAt: new Date().toISOString(),
      }),
    );
    expect(hasCookieConsent(record, "analytics")).toBe(true);
    expect(COOKIE_CONSENT_MAX_AGE_SECONDS).toBeGreaterThan(0);
  });
});

describe("telemetryDiagnostics (uç nokta/rıza teşhisi)", () => {
  it("uç nokta yoksa `endpoint-missing`: kayıt cihazdan çıkmıyor, bellekte duruyor", () => {
    const { telemetry } = buildTelemetry(true, null);
    telemetry.captureError(new Error("çökme"));
    const snapshot = telemetryDiagnostics(telemetry, null, true);

    expect(snapshot.status).toBe("endpoint-missing");
    expect(snapshot.endpointConfigured).toBe(false);
    expect(snapshot.hint).toContain("VITE_TELEMETRY_ENDPOINT");
    // Kayıt yine de görünür: destek "hiç kayıt yok" demesin.
    expect(snapshot.records.map((r) => r.name)).toContain("error");
  });

  it("uç nokta var ama rıza yoksa `consent-off`", () => {
    const { telemetry } = buildTelemetry(false, "https://ornek.test/t");
    const snapshot = telemetryDiagnostics(telemetry, "https://ornek.test/t", false);
    expect(snapshot.status).toBe("consent-off");
    expect(snapshot.endpointConfigured).toBe(true);
    expect(snapshot.hint).toContain("izni yok");
  });

  it("rıza + uç nokta varsa `ready` ve PII temizliği korunur", () => {
    const { telemetry } = buildTelemetry(true, "https://ornek.test/t");
    telemetry.captureError(new Error("e-posta: kisi@ornek.com adresinden geldi"));
    const snapshot = telemetryDiagnostics(telemetry, "https://ornek.test/t", true);

    expect(snapshot.status).toBe("ready");
    expect(snapshot.sessionId).toBe("s1");
    expect(JSON.stringify(snapshot.records)).not.toContain("kisi@ornek.com");
  });

  it("pencereye bağlanır: `await window.atlasiaErrorLog()` teşhisi döndürür", async () => {
    const fake = fakeWindow() as unknown as Window & {
      atlasiaErrorLog?: () => Promise<{ status: string; records: unknown[] }>;
    };
    const { telemetry } = buildTelemetry(true, null);
    startTelemetry({ telemetry, target: fake });
    expect(typeof fake.atlasiaErrorLog).toBe("function");
    // Tembel yükleme: teşhis kodu ayrı parçada, entry bütçesine girmez.
    const snapshot = await fake.atlasiaErrorLog?.();
    expect(snapshot?.status).toBe("endpoint-missing");
  });
});
