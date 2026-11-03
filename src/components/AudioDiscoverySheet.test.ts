// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AudioDiscoverySheet from "./AudioDiscoverySheet";
import { AUDIO_DISCOVERY_TOURS } from "../data/audioDiscovery";

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
  it("ses yüklenemezse metin alternatifi sunar", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, "play").mockRejectedValue(new Error("network"));
    render(createElement(AudioDiscoverySheet, { tour: AUDIO_DISCOVERY_TOURS[0], selectedIndex: 0, onSelect: vi.fn(), onClose: vi.fn() }));
    fireEvent.click(screen.getByRole("button", { name: "Dinle" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Ses kaydı açılamadı"));
  });
});
