// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AudioDiscoverySheet from "./AudioDiscoverySheet";
import { AUDIO_DISCOVERY_TOURS } from "../data/audioDiscoveryFixtures";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("sesli keşif", () => {
  it("durakları sıralar, fotoğrafı ve kaynakları gösterir", () => {
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    const select = vi.fn();
    render(createElement(AudioDiscoverySheet, { tour: AUDIO_DISCOVERY_TOURS[0], selectedIndex: 0, onSelect: select, onClose: vi.fn() }));
    expect(screen.getByRole("img", { name: "Efes Prytaneion kalıntıları" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "CC BY-SA 3.0" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "1. Prytaneion" }).getAttribute("aria-current")).toBe("step");
    fireEvent.click(screen.getByRole("button", { name: "Kaynakları gör" }));
    expect(screen.getByRole("link", { name: "Konum kaynağı" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "2. Devlet Agorası" }));
    expect(select).toHaveBeenCalledWith(1);
  });
  it("kaydı çalar, durak değişiminde ve kapanışta durdurur", async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    const pause = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    const props = { tour: AUDIO_DISCOVERY_TOURS[0], selectedIndex: 0, onSelect: vi.fn(), onClose: vi.fn() };
    const view = render(createElement(AudioDiscoverySheet, props));
    fireEvent.click(screen.getByRole("button", { name: "Dinle" }));
    expect(play).toHaveBeenCalledOnce();
    view.rerender(createElement(AudioDiscoverySheet, { ...props, selectedIndex: 1 }));
    expect(pause).toHaveBeenCalled();
    expect(screen.getByRole("img", { name: "Devlet Agorası üzerinden Odeion görünümü" })).toBeTruthy();
    view.unmount();
    expect(pause.mock.calls.length).toBeGreaterThan(1);
  });
  it("küçültülür, ses durmaz ve tekrar açılır", () => {
    const pause = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    render(createElement(AudioDiscoverySheet, { tour: AUDIO_DISCOVERY_TOURS[0], selectedIndex: 0, onSelect: vi.fn(), onClose: vi.fn() }));
    const audio = document.querySelector("audio");
    fireEvent.click(screen.getByRole("button", { name: "Sesli turu küçült" }));
    expect(screen.getByRole("button", { name: "Sesli turu genişlet" }).getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByRole("button", { name: "Dinle" })).toBeTruthy();
    expect(document.querySelector("audio")).toBe(audio);
    expect(pause).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Sesli turu genişlet" }));
    expect(screen.getByRole("img", { name: "Efes Prytaneion kalıntıları" })).toBeTruthy();
  });
  it("küçük panelde duraklar arasında gezinir ve sınırları korur", () => {
    const pause = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    const onSelect = vi.fn();
    const tour = AUDIO_DISCOVERY_TOURS[0];
    const props = { tour, selectedIndex: 0, onSelect, onClose: vi.fn() };
    const view = render(createElement(AudioDiscoverySheet, props));
    fireEvent.click(screen.getByRole("button", { name: "Sesli turu küçült" }));
    expect((screen.getByRole("button", { name: "Önceki durak" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Sonraki durak" }));
    expect(onSelect).toHaveBeenCalledWith(1);
    expect(pause).toHaveBeenCalled();
    view.rerender(createElement(AudioDiscoverySheet, { ...props, selectedIndex: 1 }));
    expect(screen.getByText("Devlet Agorası")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Önceki durak" }));
    expect(onSelect).toHaveBeenCalledWith(0);
    view.rerender(createElement(AudioDiscoverySheet, { ...props, selectedIndex: tour.stops.length - 1 }));
    expect((screen.getByRole("button", { name: "Sonraki durak" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Sesli turu genişlet" })).toBeTruthy();
  });
  it("ses yüklenemezse metin alternatifi sunar", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, "play").mockRejectedValue(new Error("network"));
    render(createElement(AudioDiscoverySheet, { tour: AUDIO_DISCOVERY_TOURS[0], selectedIndex: 0, onSelect: vi.fn(), onClose: vi.fn() }));
    fireEvent.click(screen.getByRole("button", { name: "Dinle" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Ses kaydı açılamadı"));
  });
});

describe("English audio tour", () => {
  it("switches recordings, pauses playback and clearly marks unavailable audio", async () => {
    const { readFileSync } = await import("node:fs");
    const diskTranslations = JSON.parse(readFileSync("public/audio/efes-en.json", "utf8"));
    // "Kayıt yok" senaryosu: 2026-11-08'de İngilizce SES 1–55 üretildi, aynı
    // gün #56 chalcidicum ve #57 domitian-cesmesi de eklendi; diskteki her
    // durakta `audio` var. "Ses yok" yolu hâlâ desteklense de (gelecekteki
    // turlar/kesintiler için) ana hat artık gerçek veriyle ölçülemez;
    // senaryo sentetik kopyayla kurulur.
    const lastStop = AUDIO_DISCOVERY_TOURS[0].stops.at(-1)!;
    expect(lastStop.id).toBe("domitian-cesmesi");
    expect(diskTranslations[lastStop.id]?.audio).toBe("/audio/en-efes-domitian-cesmesi.mp3");
    const translations = { ...diskTranslations, [lastStop.id]: { ...diskTranslations[lastStop.id] } };
    delete translations[lastStop.id].audio;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => translations }));
    const pause = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    const tour = AUDIO_DISCOVERY_TOURS[0];
    const props = { tour, selectedIndex: 0, onSelect: vi.fn(), onClose: vi.fn() };
    const view = render(createElement(AudioDiscoverySheet, props));
    fireEvent.click(screen.getByRole("button", { name: "Dinle" }));
    const turkishAudio = document.querySelector("audio");
    fireEvent.click(screen.getByRole("button", { name: "English" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Play" })).toBeTruthy());
    expect(pause).toHaveBeenCalled();
    expect(document.querySelector("audio")).not.toBe(turkishAudio);
    expect(document.querySelector("audio")?.getAttribute("src")).toBe("/audio/en-efes-prytaneion.mp3");
    expect(screen.getByText(/North of the State Agora stands/)).toBeTruthy();
    expect((screen.getByRole("button", { name: "Previous stop" }) as HTMLButtonElement).disabled).toBe(true);
    view.rerender(createElement(AudioDiscoverySheet, { ...props, selectedIndex: AUDIO_DISCOVERY_TOURS[0].stops.length - 1 }));
    expect((screen.getByRole("button", { name: "Next stop" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Play" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("status").textContent).toContain("English audio is not available yet");
    expect(document.querySelector("audio")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Türkçe" }));
    expect(document.querySelector("audio")?.getAttribute("src")).toBe(lastStop.audio);
    vi.unstubAllGlobals();
  });
  it("keeps Turkish available if the translations cannot be loaded", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    render(createElement(AudioDiscoverySheet, { tour: AUDIO_DISCOVERY_TOURS[0], selectedIndex: 0, onSelect: vi.fn(), onClose: vi.fn() }));
    fireEvent.click(screen.getByRole("button", { name: "English" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("English could not be loaded"));
    expect(screen.getByRole("button", { name: "Dinle" })).toBeTruthy();
    vi.unstubAllGlobals();
  });
  it("covers all tour stops and points only to existing recordings", async () => {
    const { readFileSync, existsSync } = await import("node:fs");
    const translations = JSON.parse(readFileSync("public/audio/efes-en.json", "utf8"));
    const stops = AUDIO_DISCOVERY_TOURS[0].stops;
    // 2026-11-08: metin ve SES çevirisi tam (57/57). Ses alanı varsa dosya
    // diskte olmalı; art arda gelen "merhaba" testleri gerçek dosyayı ölçer.
    const translated = Object.keys(translations).sort();
    expect(translated).toEqual(stops.map((stop) => stop.id).sort());
    for (const id of translated) {
      const english = translations[id];
      expect(english.title && english.description && english.imageAlt).toBeTruthy();
      // Ses alanı olmayan kayıt kalmamalı: her durakta kayıt vardır.
      expect(english.audio, `${id}: ses kaydı yok`).toBeTruthy();
      expect(existsSync(`public${english.audio}`)).toBe(true);
    }
  });
});

describe("metni çevrilmiş ama sesi olmayan durak", () => {
  it("Kalkidikum durağında English düğmesi görünür (metin var, ses yok)", () => {
    const tour = AUDIO_DISCOVERY_TOURS[0];
    const kalkidikumIndex = tour.stops.findIndex((stop) => stop.id === "hydreion-kalkidikum");
    expect(kalkidikumIndex).toBeGreaterThan(-1);
    render(createElement(AudioDiscoverySheet, { tour, selectedIndex: kalkidikumIndex, onSelect: vi.fn(), onClose: vi.fn() }));
    // 2026-11-08: Metin ve ses çevirisi tamamlandığı için düğme görünür ve
    // son durakta da Play etkindir; "ses yok" yolu sentetik senaryoyla üstteki
    // testte sınanmaya devam eder.
    expect(screen.getByRole("button", { name: "English" })).toBeTruthy();
  });
});

describe("sesli anlatım kategorileri", () => {
  it("çalınan yeri hem kategorisinde hem kartında işaretler ve sesi kesmeden geri döner", () => {
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    const tour = AUDIO_DISCOVERY_TOURS[0];
    const onSelect = vi.fn();
    render(createElement(AudioDiscoverySheet, { tour, selectedIndex: 0, onSelect, onClose: vi.fn() }));
    fireEvent.play(document.querySelector("audio")!);
    fireEvent.click(screen.getByRole("button", { name: /Diğer yerler/ }));
    expect(screen.getByRole("dialog", { name: "Sesli anlatım kategorileri" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Üst kent ve Devlet Agorası.*Şu an çalıyor/ }).className).toContain("border-sun");
    fireEvent.click(screen.getByRole("button", { name: /Üst kent ve Devlet Agorası/ }));
    const current = screen.getByRole("button", { name: /Prytaneion.*Şu an çalıyor/ });
    expect(current.closest("li")?.className).toContain("border-sun");
    fireEvent.click(current);
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Duraklat" })).toBeTruthy();
  });
  it("başlangıçta kategorileri açabilir ve başka yer seçildiğinde ilgili durağa gider", () => {
    const pause = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    const onSelect = vi.fn();
    render(createElement(AudioDiscoverySheet, { tour: AUDIO_DISCOVERY_TOURS[0], selectedIndex: 0, onSelect, onClose: vi.fn(), initialCategoriesOpen: true }));
    fireEvent.click(screen.getByRole("button", { name: /Kütüphane, agora ve tiyatro/ }));
    // Kartta hem başlık hem açıklama aynı adı içerir; ilk eşleşme durak kartıdır.
    fireEvent.click(within(screen.getByRole("dialog")).getAllByRole("button", { name: /Celsus Kütüphanesi/ })[0]);
    expect(onSelect).toHaveBeenCalledWith(3);
    expect(pause).toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("Escape yalnızca kategori panelini kapatır", () => {
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    const onClose = vi.fn();
    render(createElement(AudioDiscoverySheet, { tour: AUDIO_DISCOVERY_TOURS[0], selectedIndex: 0, onSelect: vi.fn(), onClose, initialCategoriesOpen: true }));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });
});
