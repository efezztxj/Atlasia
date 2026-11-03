// @vitest-environment jsdom
import { createElement } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SearchBox from "./SearchBox";
import { searchWorld, type SearchResult } from "../utils/geo";

vi.mock("../utils/geo", async (importOriginal) => ({
  ...await importOriginal<typeof import("../utils/geo")>(),
  searchWorld: vi.fn(),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(searchWorld).mockReset();
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Yer arama istekleri", () => {
  it("zaman aşımı AbortError olsa bile yüklemeyi durdurup hata gösterir", async () => {
    const pending = deferred<SearchResult[]>();
    vi.mocked(searchWorld).mockReturnValue(pending.promise);
    render(createElement(SearchBox, { places: [], onPick: vi.fn() }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "izmir" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(750); });
    expect(screen.getByText("Dünya taranıyor…")).toBeTruthy();
    await act(async () => { pending.reject(new DOMException("timeout", "AbortError")); });
    expect(screen.queryByText("Dünya taranıyor…")).toBeNull();
    expect(screen.getByText(/Harita aramasına ulaşılamadı/)).toBeTruthy();
  });

  it("eski istek geç tamamlandığında yeni aramanın sonuçlarını değiştirmez", async () => {
    const first = deferred<SearchResult[]>();
    const second = deferred<SearchResult[]>();
    vi.mocked(searchWorld).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    render(createElement(SearchBox, { places: [], onPick: vi.fn() }));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "izmir" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(750); });
    fireEvent.change(input, { target: { value: "ankara" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(750); });
    await act(async () => { second.resolve([{ id: "new", label: "Ankara", sub: "Türkiye", lat: 40, lng: 33 }]); });
    expect(screen.getByText("Ankara")).toBeTruthy();
    await act(async () => { first.resolve([{ id: "old", label: "İzmir", sub: "Türkiye", lat: 38, lng: 27 }]); });
    expect(screen.getByText("Ankara")).toBeTruthy();
    expect(screen.queryByText("İzmir")).toBeNull();
  });

  it("iptal edilmiş eski hata yeni aramayı hata durumuna sokmaz", async () => {
    const first = deferred<SearchResult[]>();
    const second = deferred<SearchResult[]>();
    vi.mocked(searchWorld).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    render(createElement(SearchBox, { places: [], onPick: vi.fn() }));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "izmir" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(750); });
    fireEvent.change(input, { target: { value: "ankara" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(750); });
    await act(async () => { first.reject(new Error("eski hata")); });
    expect(screen.getByText("Dünya taranıyor…")).toBeTruthy();
    expect(screen.queryByText(/Harita aramasına ulaşılamadı/)).toBeNull();
    await act(async () => { second.resolve([]); });
    expect(screen.getByText(/Sonuç bulunamadı/)).toBeTruthy();
  });
});
