// Hat KAPALI (varsayılan): istemci Firebase gönderimini kullanır.
vi.mock("./firebaseConfig", () => ({ firebaseConfigured: true, isCloudReady: true }));

import { describe, expect, it, vi } from "vitest";
import { MAIL_ENDPOINT, mailRelayConfigured, postRelay, resolveMailConfig } from "./mailRelay";

const ENDPOINT = "https://atlasia-eposta.example.workers.dev/";

describe("mailRelay — yapılandırma", () => {
  it("boş ortamda hat kapalı ve varsayılan origin pages.dev", () => {
    expect(resolveMailConfig({})).toEqual({
      endpoint: "",
      appOrigin: "https://atlasia.pages.dev/",
      enabled: false,
    });
    expect(resolveMailConfig({ VITE_MAIL_ENDPOINT: "   " }).enabled).toBe(false);
  });

  it("tanımlı uç noktayı kırpar ve hattı açar", () => {
    expect(resolveMailConfig({ VITE_MAIL_ENDPOINT: `  ${ENDPOINT}  `, VITE_APP_ORIGIN: " https://atlasia.app/ " })).toEqual({
      endpoint: ENDPOINT,
      appOrigin: "https://atlasia.app/",
      enabled: true,
    });
  });

  it("test ortamında uç nokta tanımlı değil", () => {
    expect(MAIL_ENDPOINT).toBe("");
    expect(mailRelayConfigured).toBe(false);
  });
});

describe("mailRelay — istek sözleşmesi", () => {
  it("yalnız tür ve Bearer token gönderir; alıcı adresi gövdeye GİRMEZ", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetchImpl = vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });

    await expect(postRelay({ kind: "verification", idToken: "id-token-1", endpoint: ENDPOINT, fetchImpl: fetchImpl as never })).resolves.toBe(true);

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(ENDPOINT);
    expect(calls[0].init.method).toBe("POST");
    expect((calls[0].init.headers as Record<string, string>).authorization).toBe("Bearer id-token-1");
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ kind: "verification" });
  });

  it("uç nokta yoksa ağa çıkmaz", async () => {
    const fetchImpl = vi.fn();
    await expect(postRelay({ kind: "verification", idToken: "t", fetchImpl: fetchImpl as never })).resolves.toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("token yoksa istek atılmaz", async () => {
    const fetchImpl = vi.fn();
    await expect(postRelay({ kind: "reset", idToken: "", endpoint: ENDPOINT, fetchImpl: fetchImpl as never })).resolves.toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("2xx dışı yanıtta false döner (çağıran Firebase'e düşer)", async () => {
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 503 }));
    await expect(postRelay({ kind: "reset", idToken: "t", endpoint: ENDPOINT, fetchImpl: fetchImpl as never })).resolves.toBe(false);
  });

  it("ağ hatasını yutar", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(postRelay({ kind: "reset", idToken: "t", endpoint: ENDPOINT, fetchImpl: fetchImpl as never })).resolves.toBe(false);
  });
});
