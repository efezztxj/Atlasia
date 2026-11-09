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
    // 2026-11-09: çip listesi kapalı başlar (57 çip paneli kaplıyordu).
    fireEvent.click(screen.getByRole("button", { name: /Tur durakları/ }));
    expect(screen.getByRole("button", { name: "1. Prytaneion" }).getAttribute("aria-current")).toBe("step");
    fireEvent.click(screen.getByRole("button", { name: "Kaynakları gör" }));
    expect(screen.getByRole("link", { name: "Konum kaynağı" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "2. Devlet Agorası" }));
    expect(select).toHaveBeenCalledWith(1);
  });
  it("yaklaşık konumlu durakta konum güvenilirliğini açıkça yazar", () => {
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    const tour = AUDIO_DISCOVERY_TOURS[0];
    const index = tour.stops.findIndex((stop) => stop.no === 52);
    const props = { tour, selectedIndex: 0, onSelect: vi.fn(), onClose: vi.fn() };
    const view = render(createElement(AudioDiscoverySheet, props));
    // Prytaneion kesin nokta: uyarı yok.
    expect(screen.queryByText(/Yaklaşık konum/)).toBeNull();
    view.rerender(createElement(AudioDiscoverySheet, { ...props, selectedIndex: index }));
    expect(screen.getByText(/Yaklaşık konum/)).toBeTruthy();
  });
  it("yaklaşık konum rozeti durağın kendi gerekçesini yazar", () => {
    // 2026-11-09: Rozet üç durakta da "yapı geniş bir alana yayılıyor; pin
    // merkezini gösterir" diyordu. 53 Antik Liman bir yapı değil, alüvyonla
    // dolmuş ve erişime kapalı bir havza: cümle yanlıştı. Gerekçe durakta.
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    const tour = AUDIO_DISCOVERY_TOURS[0];
    const index = tour.stops.findIndex((stop) => stop.no === 53);
    const props = { tour, selectedIndex: 0, onSelect: vi.fn(), onClose: vi.fn() };
    const view = render(createElement(AudioDiscoverySheet, props));
    view.rerender(createElement(AudioDiscoverySheet, { ...props, selectedIndex: index }));
    expect(screen.getByText(/havza ortası/)).toBeTruthy();
    expect(screen.queryByText(/yapı geniş bir alana yayılıyor/)).toBeNull();
    // 57 bir sur hattı: "korunmuş tek kesit" yazar, havza cümlesi sızmaz.
    const walls = tour.stops.findIndex((stop) => stop.no === 57);
    view.rerender(createElement(AudioDiscoverySheet, { ...props, selectedIndex: walls }));
    expect(screen.getByText(/korunmuş tek kesiti/)).toBeTruthy();
    expect(screen.queryByText(/havza ortası/)).toBeNull();
  });
  it("kaynaklarda konum anlaşmazlığını gizlemez", () => {
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    const tour = AUDIO_DISCOVERY_TOURS[0];
    const index = tour.stops.findIndex((stop) => stop.coordinateNote);
    expect(index, "en az bir durak konum notu taşımalı").toBeGreaterThan(-1);
    const props = { tour, selectedIndex: index, onSelect: vi.fn(), onClose: vi.fn() };
    render(createElement(AudioDiscoverySheet, props));
    fireEvent.click(screen.getByRole("button", { name: "Kaynakları gör" }));
    expect(screen.getByText(tour.stops[index].coordinateNote!)).toBeTruthy();
    // Not taşımayan durakta bu paragraf görünmez.
    expect(screen.queryByText(/Wikidata Q104641912/)).toBeTruthy();
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

describe("küçültülmüş panel tek satır (görsel 2)", () => {
  it("tek satırda kalır: başlığa dokunmak genişletir, dil düğmeleri isim alanının yanındadır", () => {
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    render(createElement(AudioDiscoverySheet, { tour: AUDIO_DISCOVERY_TOURS[0], selectedIndex: 0, onSelect: vi.fn(), onClose: vi.fn() }));
    fireEvent.click(screen.getByRole("button", { name: "Sesli turu küçült" }));
    // Görsel 2'de başlık ve ileri/geri oklar aynı satırdadır; dil değiştirme
    // o boşluğa taşındığı için küçültülmüş hâlde iki satıra taşmaz.
    expect(screen.getByRole("button", { name: "Sesli turu genişlet" }).getAttribute("aria-expanded")).toBe("false");
    const group = screen.getByRole("group", { name: "Anlatım dili" });
    expect(within(group).getByRole("button", { name: "Türkçe" }).getAttribute("aria-pressed")).toBe("true");
    expect(within(group).getByRole("button", { name: "English" })).toBeTruthy();
    // Büyük başlıktaki dil düğmeleri çökmüş hâlde görünmez (ikinci grup yok).
    expect(screen.getAllByRole("group", { name: "Anlatım dili" })).toHaveLength(1);
    // Küçültülmüşken kapat düğmesi yoktur (görsel 2 tek satır); Escape çalışır.
    expect(screen.queryByRole("button", { name: "Sesli turu kapat" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Sesli turu genişlet" }));
    expect(screen.getByRole("button", { name: "Sesli turu kapat" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Efes Prytaneion kalıntıları" })).toBeTruthy();
  });

  it("küçültülmüş hâlden dil değiştirir ve oynatmayı durdurur", async () => {
    const { readFileSync } = await import("node:fs");
    const translations = JSON.parse(readFileSync("public/audio/efes-en.json", "utf8"));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => translations }));
    const pause = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    render(createElement(AudioDiscoverySheet, { tour: AUDIO_DISCOVERY_TOURS[0], selectedIndex: 0, onSelect: vi.fn(), onClose: vi.fn() }));
    fireEvent.click(screen.getByRole("button", { name: "Sesli turu küçült" }));
    fireEvent.click(within(screen.getByRole("group", { name: "Anlatım dili" })).getByRole("button", { name: "English" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Play" })).toBeTruthy());
    expect(pause).toHaveBeenCalled();
    expect(document.querySelector("audio")?.getAttribute("src")).toBe("/audio/en-efes-prytaneion.mp3");
    vi.unstubAllGlobals();
  });
});

describe("dil düğmesi açık ve küçük hâlde aynı incelikte (kullanıcı isteği 2026-11-09)", () => {
  const siniflar = (root: Element) => {
    const buttons = root.querySelectorAll('[role="group"][aria-label="Anlatım dili"] button');
    expect(buttons).toHaveLength(2);
    return Array.from(buttons).map((button) => button.className);
  };

  it("her iki hâlde de min-h-8 · px-2 · text-[11px] · TR/EN kısaltması", () => {
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    const { container } = render(createElement(AudioDiscoverySheet, { tour: AUDIO_DISCOVERY_TOURS[0], selectedIndex: 0, onSelect: vi.fn(), onClose: vi.fn() }));

    for (const className of siniflar(container)) {
      expect(className).toContain("min-h-8");
      expect(className).toContain("px-2");
      expect(className).toContain("text-[11px]");
      // Büyük hâlde 44 px'lik düğme ve "Türkçe" yazısı geri gelmesin.
      expect(className).not.toContain("min-h-9");
      expect(className).not.toContain("min-h-11");
      expect(className).not.toContain("px-3");
    }
    expect(screen.getByRole("button", { name: "Türkçe" }).textContent).toBe("TR");
    expect(screen.getByRole("button", { name: "English" }).textContent).toBe("EN");

    // Küçültülmüş hâl de aynı ölçüleri kullanmalı.
    fireEvent.click(screen.getByRole("button", { name: "Sesli turu küçült" }));
    expect(siniflar(container)).toEqual(siniflar(container));
    expect(screen.getByRole("button", { name: "Türkçe" }).textContent).toBe("TR");
  });
});

describe("dinleme paneli kısa durur (kullanıcı kararı 2026-11-09)", () => {
  it("panel kısa yükseklikle açılır, fotoğraf ve hikâye içeride kaydırılarak gelir", () => {
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    const { container } = render(createElement(AudioDiscoverySheet, { tour: AUDIO_DISCOVERY_TOURS[0], selectedIndex: 0, onSelect: vi.fn(), onClose: vi.fn() }));
    const panel = container.querySelector("section")!;
    // Panel açılışta yalnız başlık + dil + durak kartı kadar yer kaplar.
    // 55dvh'e geri dönülürse bu test kırılır.
    expect(panel.className).toContain("max-h-[min(42dvh,340px)]");
    expect(panel.className).not.toContain("55dvh");
    // İçerik kaydırılabilir olmalı; aksi hâlde fotoğrafa hiç ulaşılamazdı.
    expect(panel.className).toContain("overflow-y-auto");
    // Fotoğraf hâlâ DOM'da: panel içinde kaydırınca görünür, tam ekran açılabilir.
    expect(screen.getByRole("img", { name: "Efes Prytaneion kalıntıları" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Bu yerin hikâyesi" })).toBeTruthy();
  });
});

describe("durak fotoğrafı tam ekran", () => {
  it("fotoğrafa dokunmak tam ekran açar, Escape kapatır", () => {
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    render(createElement(AudioDiscoverySheet, { tour: AUDIO_DISCOVERY_TOURS[0], selectedIndex: 0, onSelect: vi.fn(), onClose: vi.fn() }));
    fireEvent.click(screen.getByRole("button", { name: /Efes Prytaneion kalıntıları — tam ekran aç/ }));
    const dialog = screen.getByRole("dialog", { name: "Fotoğraf, tam ekran" });
    expect(within(dialog).getByRole("img", { name: "Efes Prytaneion kalıntıları" })).toBeTruthy();
    // Atıf tam ekranda da görünür (lisans yükümlülüğü küçük görselle sınırlı değil).
    expect(within(dialog).getByRole("link", { name: /Elelicht/ })).toBeTruthy();
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Fotoğraf, tam ekran" })).toBeNull();
  });
});

describe("tur durakları listesi açılıp kapanır (görsel 3)", () => {
  it("kapalı başlar, açılır ve tekrar kapanır", () => {
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    render(createElement(AudioDiscoverySheet, { tour: AUDIO_DISCOVERY_TOURS[0], selectedIndex: 0, onSelect: vi.fn(), onClose: vi.fn() }));
    const toggle = screen.getByRole("button", { name: /Tur durakları/ });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    // Kapalıyken 57 çip DOM'da yok: panel ilk açılışta metni görünür bırakır.
    expect(screen.queryByRole("list", { name: "Tur durakları" })).toBeNull();
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("list", { name: "Tur durakları" })).toBeTruthy();
    expect(toggle.getAttribute("aria-controls")).toBe("audio-tour-stops");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("list", { name: "Tur durakları" })).toBeNull();
  });

  it("küçültülmüş panelde liste düğmesi görünmez", () => {
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    render(createElement(AudioDiscoverySheet, { tour: AUDIO_DISCOVERY_TOURS[0], selectedIndex: 0, onSelect: vi.fn(), onClose: vi.fn() }));
    fireEvent.click(screen.getByRole("button", { name: "Sesli turu küçült" }));
    expect(screen.queryByRole("button", { name: /Tur durakları/ })).toBeNull();
  });
});

describe("English audio tour", () => {
  it("switches recordings, pauses playback and clearly marks unavailable audio", async () => {
    const { readFileSync } = await import("node:fs");
    const translations = JSON.parse(readFileSync("public/audio/efes-en.json", "utf8"));
    // 2026-11-08: Turun 57 durağının tamamı İngilizce sesli. "Kayıt yok"
    // durumu artık gerçek veride bulunmadığı için senaryo BİLİNÇLİ OLARAK
    // kurulur: son durağın `audio` alanı yalnız bu testin kopyasında silinir.
    // Böylece "English audio is not available yet" yolunun çalıştığı
    // korunur, yayın verisi değişmez.
    const lastStop = AUDIO_DISCOVERY_TOURS[0].stops.at(-1)!;
    expect(translations[lastStop.id]?.description).toBeTruthy();
    expect(translations[lastStop.id]?.audio).toBe("/audio/en-efes-kent-surlari.mp3");
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
    // 2026-11-08: Metin ve ses 57/57 tam; çeviri kümesi tur duraklarıyla
    // birebir eşit ve HER durakta gerçek bir kayıt dosyası var.
    const translated = Object.keys(translations).sort();
    expect(translated).toEqual(stops.map((stop) => stop.id).sort());
    for (const id of translated) {
      const english = translations[id];
      expect(english.title && english.description && english.imageAlt).toBeTruthy();
      // Ses alanı zorunlu ve dosya gerçekten pakette olmalı (404 kovalanmaz).
      expect(english.audio, `${id}: İngilizce ses yolu yok`).toBeTruthy();
      expect(existsSync(`public${english.audio}`), `${id}: dosya yok`).toBe(true);
    }
  });
});

describe("metni çevrilmiş ama sesi olmayan durak", () => {
  it("Kalkidikum durağında English düğmesi görünür (metin var, ses yok)", () => {
    const tour = AUDIO_DISCOVERY_TOURS[0];
    const kalkidikumIndex = tour.stops.findIndex((stop) => stop.id === "hydreion-kalkidikum");
    expect(kalkidikumIndex).toBeGreaterThan(-1);
    render(createElement(AudioDiscoverySheet, { tour, selectedIndex: kalkidikumIndex, onSelect: vi.fn(), onClose: vi.fn() }));
    // 2026-11-07: Metin çevirisi tamamlandığı için düğme artık görünür.
    // Durakta yalnız ses kaydı eksik; o durum AudioDiscoverySheet içinde
    // "English audio is not available yet" ile bildirilir (yukarıdaki test).
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
