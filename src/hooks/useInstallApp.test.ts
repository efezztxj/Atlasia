// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useInstallApp } from "./useInstallApp";

const fetchMock = vi.fn<(input: string | URL, init?: RequestInit) => Promise<Response>>();

function setStandalone(matches: boolean): void {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === "(display-mode: standalone)" ? matches : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function setUserAgent(value: string): void {
  Object.defineProperty(window.navigator, "userAgent", { configurable: true, value });
}

function promptEvent(outcome: "accepted" | "dismissed") {
  const event = new Event("beforeinstallprompt", { cancelable: true });
  const prompt = vi.fn(async () => undefined);
  Object.defineProperties(event, {
    prompt: { value: prompt },
    userChoice: { value: Promise.resolve({ outcome }) },
  });
  return { event, prompt };
}

beforeEach(() => {
  setStandalone(false);
  setUserAgent("Mozilla/5.0 (X11; Linux x86_64) AtlasiaTest");
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
  Reflect.deleteProperty(window.navigator, "standalone");
});

describe("useInstallApp", () => {
  it("standalone değilken kurulum bekliyor durumunda başlar; prompt yoksa install false döner", async () => {
    const { result } = renderHook(() => useInstallApp());

    expect(result.current).toMatchObject({
      installed: false,
      canPrompt: false,
      busy: false,
      ios: false,
    });
    await expect(result.current.install()).resolves.toBe(false);
  });

  it("display-mode standalone ise kurulu kabul eder", () => {
    setStandalone(true);

    const { result } = renderHook(() => useInstallApp());

    expect(result.current.installed).toBe(true);
    expect(result.current.canPrompt).toBe(false);
  });

  it("iOS navigator.standalone değerini ve iPhone UA'sını tanır", () => {
    setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)");
    Object.defineProperty(window.navigator, "standalone", { configurable: true, value: true });

    const { result } = renderHook(() => useInstallApp());

    expect(result.current.installed).toBe(true);
    expect(result.current.ios).toBe(true);
  });

  it("beforeinstallprompt'u yakalar; kabul edilen kurulum durumu kapatır", async () => {
    const { result } = renderHook(() => useInstallApp());
    const { event, prompt } = promptEvent("accepted");
    const preventDefault = vi.spyOn(event, "preventDefault");

    act(() => window.dispatchEvent(event));

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(result.current.canPrompt).toBe(true);

    let installed: boolean | undefined;
    await act(async () => {
      installed = await result.current.install();
    });

    expect(prompt).toHaveBeenCalledTimes(1);
    expect(installed).toBe(true);
    expect(result.current).toMatchObject({ installed: true, canPrompt: false, busy: false });
  });

  it("reddedilen prompt kurulu yapmaz ve yeniden denenebilir halde bırakır", async () => {
    const { result } = renderHook(() => useInstallApp());
    const { event } = promptEvent("dismissed");
    act(() => window.dispatchEvent(event));

    let installed: boolean | undefined;
    await act(async () => {
      installed = await result.current.install();
    });

    expect(installed).toBe(false);
    expect(result.current).toMatchObject({ installed: false, canPrompt: true, busy: false });
  });

  it("prompt hatasını yüzeye çıkarırken busy bayrağını mutlaka indirir", async () => {
    const { result } = renderHook(() => useInstallApp());
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.defineProperties(event, {
      prompt: { value: vi.fn(async () => { throw new Error("prompt açılamadı"); }) },
      userChoice: { value: Promise.resolve({ outcome: "dismissed" }) },
    });
    act(() => window.dispatchEvent(event));

    await expect(result.current.install()).rejects.toThrow("prompt açılamadı");
    expect(result.current.busy).toBe(false);
    expect(result.current.installed).toBe(false);
  });

  it("appinstalled olayı prompt'u temizleyip kurulu işaretler", () => {
    const { result } = renderHook(() => useInstallApp());
    const { event } = promptEvent("accepted");
    act(() => window.dispatchEvent(event));
    expect(result.current.canPrompt).toBe(true);

    act(() => window.dispatchEvent(new Event("appinstalled")));

    expect(result.current).toMatchObject({ installed: true, canPrompt: false });
  });

  it("downloadHtml geçerli sayfayı sorgusuz indirir ve blob URL'sini 20 sn sonra bırakır", async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValue({
      text: async () => "<html>Atlasia ğşıİ</html>",
    } as unknown as Response);
    const createObjectURL = vi.fn((_blob: Blob) => "blob:atlasia-test");
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });
    let clickedDownload = "";
    let clickedHref = "";
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function (this: HTMLAnchorElement) {
        clickedDownload = this.download;
        clickedHref = this.href;
      });
    const { result } = renderHook(() => useInstallApp());

    await act(async () => {
      await result.current.downloadHtml();
    });

    const requested = fetchMock.mock.calls[0][0] as URL;
    expect(requested.search).toBe("");
    expect(requested.hash).toBe("");
    expect(fetchMock.mock.calls[0][1]).toEqual({ cache: "no-store" });
    const blob = createObjectURL.mock.calls[0][0];
    await expect(blob.text()).resolves.toContain("Atlasia ğşıİ");
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(clickedDownload).toBe("Atlasia.html");
    expect(clickedHref).toContain("blob:atlasia-test");

    act(() => vi.advanceTimersByTime(20_000));
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:atlasia-test");
  });
});
