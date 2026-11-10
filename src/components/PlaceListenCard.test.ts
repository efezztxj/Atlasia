// @vitest-environment jsdom
/**
 * Genel dinleme kartı.
 *
 * NEDEN TEST: kart, ses kaydı olmadığında da metni okutabilmeli ve dil
 * değiştiğinde yanlış dosyayı çalmamalı. Bu iki davranış bozulursa kullanıcı
 * ya sessiz bir düğmeyle ya da yanlış dilde bir kayıtla kalır.
 */
import { createElement } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PlaceListenCard from "./PlaceListenCard";
import { resetPlaceListenCacheForTests } from "../lib/placeListen";

const TR_TEXT = "Efes limandan yukarı doğru kurulmuş bir liman kentiydi ve deniz ticaretiyle büyüdü. Menderes'in alüvyonu limanı doldurunca kent yukarı çekildi. Sabah ilk ışıkta taşın damarları okunur.";
const EN_TEXT = "Ephesus was a harbour city that grew on sea trade and climbed inland as the river filled the port. In the morning light you can read the veins in the marble.";

const payload = {
  version: 1,
  entries: [
    {
      id: "efes",
      title: "Efes Antik Kenti",
      tr: { audio: "/audio/listen/efes.mp3", text: TR_TEXT },
      en: { audio: "/audio/listen/en-efes.mp3", text: EN_TEXT },
    },
  ],
};

const play = vi.fn(() => Promise.resolve());
const pause = vi.fn();

beforeEach(() => {
  resetPlaceListenCacheForTests();
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 })));
  Object.defineProperty(window.HTMLMediaElement.prototype, "play", { configurable: true, value: play });
  Object.defineProperty(window.HTMLMediaElement.prototype, "pause", { configurable: true, value: pause });
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  play.mockClear();
  pause.mockClear();
});

describe("PlaceListenCard", () => {
  it("yerin adını ve süre kestirimini gösterir", async () => {
    render(createElement(PlaceListenCard, { placeId: "efes", placeTitle: "Efes Antik Kenti" }));
    expect(await screen.findByText("Efes Antik Kenti")).toBeTruthy();
    expect(screen.getByText("Genel dinleme")).toBeTruthy();
    expect(screen.getByText(/üstün körü bir bakış/)).toBeTruthy();
  });

  it("oynatma düğmesi sesi başlatır", async () => {
    render(createElement(PlaceListenCard, { placeId: "efes", placeTitle: "Efes Antik Kenti" }));
    fireEvent.click(await screen.findByRole("button", { name: "Genel dinlemeyi başlat" }));
    await waitFor(() => expect(play).toHaveBeenCalledTimes(1));
  });

  it("ses dosyası yoksa metne yönlendirir", async () => {
    const { container } = render(createElement(PlaceListenCard, { placeId: "efes", placeTitle: "Efes Antik Kenti" }));
    await screen.findByTestId("place-listen");
    const audio = container.querySelector("audio");
    expect(audio).toBeTruthy();
    fireEvent.error(audio as HTMLAudioElement);
    expect(await screen.findByRole("status")).toHaveProperty(
      "textContent",
      "Ses kaydı henüz yayında değil. Anlatımın metnini okuyabilirsin.",
    );
  });

  it("metin düğmesi dökümü açar ve kapatır", async () => {
    render(createElement(PlaceListenCard, { placeId: "efes", placeTitle: "Efes Antik Kenti" }));
    const toggle = await screen.findByRole("button", { name: "Metni oku" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    expect(await screen.findByText(TR_TEXT)).toBeTruthy();
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(toggle);
    expect(screen.queryByText(TR_TEXT)).toBeNull();
  });

  it("dil değiştirince İngilizce metne ve dosyaya geçer, tercih saklanır", async () => {
    const { container } = render(createElement(PlaceListenCard, { placeId: "efes", placeTitle: "Efes Antik Kenti" }));
    await screen.findByTestId("place-listen");
    fireEvent.click(screen.getByRole("button", { name: "Metni oku" }));
    expect(await screen.findByText(TR_TEXT)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "İngilizce anlatım" }));

    expect(await screen.findByText(EN_TEXT)).toBeTruthy();
    expect(container.querySelector("audio")?.getAttribute("src")).toBe("/audio/listen/en-efes.mp3");
    expect(screen.getByRole("button", { name: "İngilizce anlatım" }).getAttribute("aria-pressed")).toBe("true");
    expect(window.localStorage.getItem("atlasia.listen.language")).toBe("en");
  });

  it("kaydı olmayan yer için hiçbir şey çizmez", async () => {
    const { container } = render(createElement(PlaceListenCard, { placeId: "kullanici-yeri", placeTitle: "Kendi yerim" }));
    await waitFor(() => expect(container.innerHTML).toBe(""));
  });
});
