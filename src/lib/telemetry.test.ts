import { describe, expect, it } from "vitest";
import {
  MAX_BATCH,
  MAX_EVENTS_PER_SESSION,
  MAX_VALUE_CHARS,
  MIN_SEND_INTERVAL_MS,
  createSessionId,
  createTelemetry,
  describeError,
  installGlobalErrorHandlers,
  safePath,
  scrubProps,
  scrubString,
  type TelemetryRecord,
} from "./telemetry";

function setup(overrides: {
  canSend?: boolean;
  endpoint?: string | null;
  now?: () => number;
} = {}) {
  const batches: TelemetryRecord[][] = [];
  const telemetry = createTelemetry({
    endpoint: overrides.endpoint === undefined ? "https://ornek.test/t" : overrides.endpoint,
    canSend: () => overrides.canSend ?? true,
    send: (batch) => batches.push(batch),
    now: overrides.now ?? (() => 1_000),
    path: () => "/uygulama/",
    sessionId: "s1",
  });
  return { telemetry, batches };
}

describe("telemetry · PII temizliği", () => {
  it("PII anahtarlarını tamamen atar", () => {
    const clean = scrubProps({
      email: "a@b.com",
      userEmail: "a@b.com",
      phone: "+90 555 111 22 33",
      uid: "abc",
      lat: 38.4,
      lng: 27.1,
      note: "gizli",
      message: "gizli",
      konum: "İzmir",
    });
    expect(clean).toEqual({});
  });

  it("güvenli alanları korur, nesne/dizileri atar", () => {
    const clean = scrubProps({ category: "history", hasPhoto: true, count: 3, nested: { a: 1 }, list: [1] });
    expect(clean).toEqual({ category: "history", hasPhoto: true, count: 3 });
  });

  it("değer içindeki e-posta ve telefonu maskeler", () => {
    expect(scrubString("hata: ali@ornek.com adresinde")).toBe("hata: [gizli] adresinde");
    expect(scrubString("numara +90 555 111 22 33 hatalı")).toContain("[gizli]");
  });

  it("base64 görsel gövdelerini maskeler", () => {
    const dirty = `resim data:image/jpeg;base64,${"A".repeat(60)} bitti`;
    expect(scrubString(dirty)).toBe("resim [gizli] bitti");
  });

  it("uzun dizgeleri sınırlar", () => {
    const long = "x".repeat(MAX_VALUE_CHARS + 50);
    expect(scrubString(long).length).toBe(MAX_VALUE_CHARS + 1);
  });

  it("geçersiz anahtar adlarını ve sonsuz sayıları atar", () => {
    expect(scrubProps({ "kötü anahtar": 1, ok: Number.POSITIVE_INFINITY, good: 1 })).toEqual({ good: 1 });
  });

  it("URL'den sorgu ve hash atar (davet jetonu sızmasın)", () => {
    expect(safePath("https://atlasia.pages.dev/uygulama/?q=gizli#r=JETON")).toBe("/uygulama/");
    expect(safePath("bozuk url")).toBe("/");
  });
});

describe("telemetry · rıza kapısı", () => {
  it("rıza yoksa ağa hiçbir şey gitmez ama kayıt bellekte kalır", () => {
    const { telemetry, batches } = setup({ canSend: false });
    telemetry.track("app_open", { screen: "browser" });
    telemetry.captureError(new Error("patladı"));
    expect(batches).toHaveLength(0);
    expect(telemetry.drainBuffer()).toHaveLength(2);
  });

  it("rıza varsa ilk kayıt hemen gönderilir", () => {
    const { telemetry, batches } = setup({ canSend: true });
    telemetry.track("place_created", { category: "history" });
    expect(batches).toHaveLength(1);
    expect(batches[0][0].name).toBe("place_created");
  });

  it("uç nokta tanımlı değilse ağ kapalıdır", () => {
    const { telemetry, batches } = setup({ canSend: true, endpoint: null });
    telemetry.track("app_open");
    expect(batches).toHaveLength(0);
    expect(telemetry.drainBuffer()).toHaveLength(1);
  });

  it("canSend fırlatırsa sessizce kapanır", () => {
    const batches: TelemetryRecord[][] = [];
    const telemetry = createTelemetry({
      endpoint: "https://ornek.test/t",
      canSend: () => {
        throw new Error("bozuk");
      },
      send: (batch) => batches.push(batch),
      now: () => 1,
      path: () => "/",
    });
    expect(() => telemetry.track("app_open")).not.toThrow();
    expect(batches).toHaveLength(0);
  });
});

describe("telemetry · gönderim sınırları", () => {
  it("art arda gelen kayıtları toplar ve aralık dolunca gönderir", () => {
    let stamp = 0;
    const { telemetry, batches } = setup({ now: () => stamp });
    telemetry.track("a");
    expect(batches).toHaveLength(1);
    telemetry.track("b");
    telemetry.track("c");
    expect(batches).toHaveLength(1); // aralık dolmadı, kuyrukta
    stamp = MIN_SEND_INTERVAL_MS;
    telemetry.flush();
    expect(batches).toHaveLength(2);
    expect(batches[1].map((r) => r.name)).toEqual(["b", "c"]);
  });

  it("kuyruk MAX_BATCH'i aşınca beklemeden gönderir", () => {
    let stamp = 0;
    const { telemetry, batches } = setup({ now: () => stamp });
    telemetry.track("first");
    for (let i = 0; i < MAX_BATCH; i += 1) telemetry.track(`e${i}`);
    expect(batches.flat().length).toBeGreaterThanOrEqual(MAX_BATCH);
    stamp += MIN_SEND_INTERVAL_MS;
    telemetry.track("son");
    expect(batches.at(-1)?.length).toBeLessThanOrEqual(MAX_BATCH);
  });

  it("oturum tavanına ulaşınca yeni kayıt üretmez", () => {
    const { telemetry } = setup({ canSend: false, now: () => 1 });
    for (let i = 0; i < MAX_EVENTS_PER_SESSION + 25; i += 1) telemetry.track("spam");
    expect(telemetry.drainBuffer().length).toBeLessThanOrEqual(50); // halka tamponu
  });

  it("gönderici fırlatsa bile uygulama akışı bozulmaz", () => {
    const telemetry = createTelemetry({
      endpoint: "https://ornek.test/t",
      canSend: () => true,
      send: () => {
        throw new Error("ağ yok");
      },
      now: () => 1,
      path: () => "/",
    });
    expect(() => telemetry.track("x")).not.toThrow();
  });
});

describe("telemetry · hata kaydı", () => {
  it("hata adı ve mesajı PII'den arındırılmış gider", () => {
    const { telemetry, batches } = setup();
    telemetry.captureError(new Error("kullanıcı ali@ornek.com bulunamadı"), { source: "test", uid: "gizli" });
    const record = batches[0][0];
    expect(record.level).toBe("error");
    expect(record.props.errorDetail).toContain("[gizli]");
    expect(record.props).not.toHaveProperty("uid");
  });

  it("bilinmeyen değerler için güvenli varsayılan", () => {
    expect(describeError(undefined)).toEqual({ name: "Unknown", message: "" });
    expect(describeError("düz metin")).toEqual({ name: "Error", message: "düz metin" });
  });
});

describe("telemetry · global dinleyiciler", () => {
  it("window error ve unhandledrejection yakalar, temizlenebilir", () => {
    const calls: string[] = [];
    const fakeWindow = {
      handlers: new Map<string, (event: Event) => void>(),
      addEventListener(type: string, handler: (event: Event) => void) {
        fakeWindow.handlers.set(type, handler);
      },
      removeEventListener(type: string) {
        fakeWindow.handlers.delete(type);
      },
    };
    const telemetry = createTelemetry({
      canSend: () => false,
      now: () => 1,
      path: () => "/",
    });
    const off = installGlobalErrorHandlers(telemetry, fakeWindow as unknown as Window);

    fakeWindow.handlers.get("error")?.({ error: new Error("x"), filename: "https://a/b.js", lineno: 3 } as unknown as Event);
    fakeWindow.handlers.get("unhandledrejection")?.({ reason: new Error("y") } as unknown as Event);
    calls.push(...telemetry.drainBuffer().map((r) => String(r.props.source)));

    expect(calls).toEqual(["window.error", "unhandledrejection"]);
    off();
    expect(fakeWindow.handlers.size).toBe(0);
  });
});

describe("telemetry · kimlik", () => {
  it("oturum kimliği rastgele ve kişi tanımlamaz", () => {
    const a = createSessionId(() => 0.5);
    const b = createSessionId(() => 0.25);
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{8}$/);
    expect(a).not.toBe(b);
  });
});
