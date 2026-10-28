import { beforeEach, describe, expect, it } from "vitest";
import { ANALYTICS_EVENTS, createAnalytics, isStandaloneDisplay, resetAnalyticsSessionForTests } from "./analytics";
import { createTelemetry, type TelemetryRecord } from "./telemetry";

function setup(canSend = true) {
  const records: TelemetryRecord[] = [];
  const telemetry = createTelemetry({
    endpoint: "https://ornek.test/t",
    canSend: () => canSend,
    send: (batch) => records.push(...batch),
    now: (() => {
      let stamp = 0;
      return () => (stamp += 10_000);
    })(),
    path: () => "/uygulama/",
    sessionId: "s1",
  });
  return { telemetry, analytics: createAnalytics(telemetry), records };
}

describe("analytics · olay sözleşmesi", () => {
  beforeEach(() => resetAnalyticsSessionForTests());

  it("tanımlı olay kümesi sabit, tekrarsız ve T2 huni adımlarını içerir", () => {
    expect(ANALYTICS_EVENTS).toHaveLength(16);
    expect(new Set(ANALYTICS_EVENTS).size).toBe(ANALYTICS_EVENTS.length);
    for (const event of ["cta_click", "map_open", "signup_start", "signup_complete", "first_route_created", "audio_guide_start", "consent_choice"]) {
      expect(ANALYTICS_EVENTS).toContain(event);
    }
  });

  it("app_open oturumda yalnız bir kez sayılır", () => {
    const { analytics, records } = setup();
    analytics.appOpen({ standalone: false });
    analytics.appOpen({ standalone: true });
    expect(records.filter((r) => r.name === "app_open")).toHaveLength(1);
    expect(records[0].props.screen).toBe("browser");
  });

  it("session_start hesap türünü taşır, anonim varsayılanı vardır", () => {
    const { analytics, records } = setup();
    analytics.sessionStart({ account: null });
    expect(records[0].props.account).toBe("anonymous");
  });

  it("içerik olayları yalnız sabit/sayısal alan taşır", () => {
    const { analytics, records } = setup();
    analytics.placeCreated({ account: "cloud", category: "history", hasPhoto: true });
    analytics.routePublished({ account: "device", visibility: "public", stops: 4 });
    analytics.postCreated({ hasPhoto: false, kind: "post" });
    expect(records.map((r) => r.name)).toEqual(["place_created", "route_published", "post_created"]);
    expect(records[1].props).toMatchObject({ visibility: "public", stops: 4 });
  });

  it("paylaşım olayı başarısızlığı da sayar (sessiz hata kalmaz)", () => {
    const { analytics, records } = setup();
    analytics.share({ channel: "clipboard", target: "route", ok: false });
    expect(records[0].props).toMatchObject({ channel: "clipboard", target: "route", ok: false });
  });

  it("rıza yoksa hiçbir olay ağa çıkmaz", () => {
    const { analytics, records } = setup(false);
    analytics.signIn({ account: "cloud" });
    analytics.placeCreated({ account: "cloud", category: "nature", hasPhoto: false });
    expect(records).toHaveLength(0);
  });

  it("huni olayları yalnız sabit enum ve boolean taşır", () => {
    const { analytics, records } = setup();
    analytics.ctaClick({ placement: "hero", signedIn: false });
    analytics.mapOpen({ guest: false });
    analytics.signupStart();
    analytics.signupComplete({ method: "email", account: "cloud" });
    analytics.firstRouteCreated({ account: "device", stops: 3 });
    analytics.audioGuideStart({ source: "manual" });
    analytics.consentChoice({ analytics: true });
    expect(records.map((r) => r.name)).toEqual([
      "cta_click",
      "map_open",
      "signup_start",
      "signup_complete",
      "first_route_created",
      "audio_guide_start",
      "consent_choice",
    ]);
    expect(records[0].props).toEqual({ placement: "hero", signed_in: false });
    expect(records[3].props).toEqual({ method: "email", account: "cloud" });
    expect(records[6].props).toEqual({ analytics: true });
  });

  it("harita açılışı ve kayıt başlangıcı oturumda bir kez sayılır", () => {
    const { analytics, records } = setup();
    analytics.mapOpen({ guest: false });
    analytics.mapOpen({ guest: true });
    analytics.signupStart();
    analytics.signupStart();
    expect(records.filter((r) => r.name === "map_open")).toHaveLength(1);
    expect(records.filter((r) => r.name === "signup_start")).toHaveLength(1);
  });

  it("e-posta/uid gibi alanlar olay gövdesinde asla yer almaz", () => {
    const { analytics, records } = setup();
    analytics.signupComplete({ method: "google", account: "cloud" });
    analytics.reportCreated({ targetType: "post" });
    const serialized = JSON.stringify(records);
    expect(serialized).not.toContain("@");
    expect(serialized).not.toContain("uid");
  });
});

describe("analytics · görünüm", () => {
  it("tarayıcıda standalone false, matchMedia yoksa çökmez", () => {
    expect(isStandaloneDisplay()).toBe(false);
  });
});
