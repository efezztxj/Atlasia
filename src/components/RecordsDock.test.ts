// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AtlasRoute } from "../types";
import type { PublicRouteRecord } from "../lib/routeData";

const h = vi.hoisted(() => ({
  backend: "device" as string,
  listPublicRoutes: vi.fn(async (): Promise<PublicRouteRecord[]> => []),
  listOwnedTracks: vi.fn(async () => [] as never[]),
}));

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "u1", backend: h.backend } }),
}));
vi.mock("../hooks/useCollections", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../hooks/useCollections")>();
  return {
    // isCloudAccount gerçek haliyle gelir; firebase mock'u yapılandırılmış derleme varsayar.
    ...actual,
    useCollections: () => ({
      savedPlaces: [],
      savedRoutes: [],
      savePlace: () => undefined,
      saveRoute: () => undefined,
      removeRoute: () => undefined,
      loading: false,
      error: null,
    }),
  };
});
vi.mock("../lib/firebase", () => ({ firebaseConfigured: true, isCloudReady: true, db: {}, firebaseApp: {} }));
vi.mock("../lib/routeData", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/routeData")>();
  return {
    ...actual,
    listPublicRoutes: h.listPublicRoutes,
    listOwnedTracks: h.listOwnedTracks,
    deleteTrack: vi.fn(async () => undefined),
  };
});

import RecordsDock from "./RecordsDock";

const publicRecord = (id: string, createdAt: number, saveCount: number): PublicRouteRecord => ({
  route: {
    id,
    routeTitle: `Rota ${id}`,
    routeSummary: "",
    totalDurationHours: 3,
    totalDistanceKm: 5,
    transport: "walking",
    vibe: "sakin",
    days: [],
    weatherNote: null,
    alternatives: [],
    createdAt,
  } satisfies AtlasRoute,
  authorUid: "yazar",
  saveCount,
});

function renderDock() {
  return render(createElement(RecordsDock, {
    onClose: () => undefined,
    onPlace: () => undefined,
    onRoute: () => undefined,
  }));
}

beforeEach(() => {
  h.backend = "device";
  h.listPublicRoutes.mockReset().mockResolvedValue([]);
  h.listOwnedTracks.mockReset().mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
});

describe("RecordsDock yerel/cihaz modu mesajları (Madde 9)", () => {
  it("cihaz hesabında keşif sekmesi bulut ister; sessiz boş liste göstermez", async () => {
    renderDock();
    fireEvent.click(screen.getByRole("button", { name: /Rota keşfi/ }));
    expect(await screen.findByText("Rota keşfi bulut hesabıyla çalışır.")).toBeTruthy();
    expect(screen.queryByText("Bu filtrelerde açık rota yok.")).toBeNull();
    expect(h.listPublicRoutes).not.toHaveBeenCalled();
  });

  it("cihaz hesabında özel izler sekmesi açık mesaj verir", async () => {
    renderDock();
    fireEvent.click(screen.getByRole("button", { name: /Özel izler/ }));
    expect(await screen.findByText("Özel izler bulut hesabına kaydedilir.")).toBeTruthy();
    expect(h.listOwnedTracks).not.toHaveBeenCalled();
  });
});

describe("RecordsDock keşif sıralaması (Madde 10)", () => {
  it("bulut hesabında keşif yüklenir; sıralama seçimi düzeni değiştirir", async () => {
    h.backend = "firebase";
    h.listPublicRoutes.mockResolvedValue([
      publicRecord("cok-kaydedilen-eski", 100, 9),
      publicRecord("az-kaydedilen-yeni", 900, 1),
    ]);
    renderDock();
    fireEvent.click(screen.getByRole("button", { name: /Rota keşfi/ }));

    await waitFor(() => expect(screen.getByText("Rota cok-kaydedilen-eski")).toBeTruthy());
    const titlesBefore = screen.getAllByRole("heading", { level: 3 }).map((node) => node.textContent);
    expect(titlesBefore).toEqual(["Rota cok-kaydedilen-eski", "Rota az-kaydedilen-yeni"]);

    const sortSelect = screen.getByLabelText(/Sıralama/);
    fireEvent.change(sortSelect, { target: { value: "newest" } });
    const titlesAfter = screen.getAllByRole("heading", { level: 3 }).map((node) => node.textContent);
    expect(titlesAfter).toEqual(["Rota az-kaydedilen-yeni", "Rota cok-kaydedilen-eski"]);
  });
});
