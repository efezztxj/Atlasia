// @vitest-environment jsdom
import { createElement } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Place } from "../types";
import NearbyAudioGuide from "./NearbyAudioGuide";

const first: Place = { id: "a", title: "Birinci yer", region: "Test", category: "history", lng: 38.7408, lat: 37.9806, note: "İlk hikâye", author: "Atlasia", kind: "guide" };
const second: Place = { ...first, id: "b", title: "İkinci yer", lat: 37.9826, note: "İkinci hikâye" };
const firstLocation = { lat: first.lat, lng: first.lng, accuracy: 8 };
const secondLocation = { lat: second.lat, lng: second.lng, accuracy: 8 };

class Utterance {
  lang = "";
  rate = 1;
  pitch = 1;
  voice: SpeechSynthesisVoice | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public text: string) {}
}
const synth = { cancel: vi.fn(), getVoices: vi.fn(() => []), speak: vi.fn(), pause: vi.fn(), resume: vi.fn() };

beforeEach(() => {
  sessionStorage.clear();
  vi.clearAllMocks();
  vi.stubGlobal("speechSynthesis", synth);
  vi.stubGlobal("SpeechSynthesisUtterance", Utterance);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Sesli rehber oynatma güvenliği", () => {
  it("yeni yere geçince eski anlatımı durdurur; yeni anlatım kendiliğinden başlamaz", () => {
    const view = render(createElement(NearbyAudioGuide, { location: firstLocation, places: [first, second], onOpenPlace: vi.fn() }));
    fireEvent.click(screen.getByRole("button", { name: "Hikâyeyi dinle" }));
    expect(synth.speak).toHaveBeenCalledTimes(1);
    synth.cancel.mockClear();
    view.rerender(createElement(NearbyAudioGuide, { location: secondLocation, places: [first, second], onOpenPlace: vi.fn() }));
    expect(screen.getByText("İkinci yer")).toBeTruthy();
    expect(synth.cancel).toHaveBeenCalled();
    expect(synth.speak).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Hikâyeyi dinle" })).toBeTruthy();
  });

  it("önceki anlatımın geç gelen bitiş/hata olayları yeni anlatımı durdurmaz", () => {
    render(createElement(NearbyAudioGuide, { location: firstLocation, places: [first], onOpenPlace: vi.fn() }));
    fireEvent.click(screen.getByRole("button", { name: "Hikâyeyi dinle" }));
    const previous = synth.speak.mock.calls[0][0] as Utterance;
    fireEvent.click(screen.getByRole("button", { name: "Sesli anlatımı baştan oynat" }));
    const current = synth.speak.mock.calls[1][0] as Utterance;
    act(() => { previous.onend?.(); previous.onerror?.(); });
    expect(screen.getByRole("button", { name: "Duraklat" })).toBeTruthy();
    act(() => { current.onend?.(); });
    expect(screen.getByRole("button", { name: "Hikâyeyi dinle" })).toBeTruthy();
  });

  it("konum kaldırılınca oynatma iptal edilir", () => {
    const view = render(createElement(NearbyAudioGuide, { location: firstLocation, places: [first], onOpenPlace: vi.fn() }));
    fireEvent.click(screen.getByRole("button", { name: "Hikâyeyi dinle" }));
    synth.cancel.mockClear();
    view.rerender(createElement(NearbyAudioGuide, { location: null, places: [first], onOpenPlace: vi.fn() }));
    expect(synth.cancel).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Duraklat" })).toBeNull();
  });
});
