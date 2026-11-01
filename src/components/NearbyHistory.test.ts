// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import NearbyHistory from "./NearbyHistory";
import type { Place } from "../types";
import { NEARBY_HISTORY_PREVIEW } from "../utils/nearbyHistory";

const origin: Place = {
  id: "origin",
  title: "Başlangıç",
  region: "İzmir",
  category: "history",
  lng: 27.13,
  lat: 38.42,
  note: "",
  author: "Atlasia",
  kind: "guide",
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("NearbyHistory — kaynak çapraz kontrolü", () => {
  it("kullanıcı tıklayınca kaynak durumunu gösterir ve tüm yakın yerleri açar", async () => {
    const elements = Array.from({ length: 7 }, (_, index) => ({
      type: "node",
      id: index + 1,
      lat: 38.42,
      lon: 27.13,
      tags: { historic: "monument", name: `Yer ${index + 1}`, wikidata: `Q${index + 1}` },
    }));
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("https://overpass-api.de/")) {
        return new Response(JSON.stringify({ elements }), { status: 200 });
      }
      if (url.startsWith("https://www.wikidata.org/")) {
        const qid = new URL(url).searchParams.get("ids") ?? "Q1";
        const index = Number(qid.slice(1));
        return new Response(JSON.stringify({
          entities: {
            [qid]: {
              labels: { tr: { value: `Yer ${index}` } },
              claims: { P625: [{ mainsnak: { snaktype: "value", datavalue: { value: { latitude: 38.42, longitude: 27.13 } } } }] },
              sitelinks: { trwiki: { title: `Yer ${index}` } },
            },
          },
        }), { status: 200 });
      }
      if (url.startsWith("https://tr.wikipedia.org/")) {
        const title = decodeURIComponent(url.split("/").at(-1) ?? "Yer").replaceAll("_", " ");
        return new Response(JSON.stringify({
          title,
          extract: `${title}, tarihî bir yapıdır. Kaynaklarda hakkında tarihî bilgiler yer alır.`,
          content_urls: { desktop: { page: `https://tr.wikipedia.org/wiki/${encodeURIComponent(title.replaceAll(" ", "_"))}` } },
        }), { status: 200 });
      }
      return new Response("{}", { status: 404 });
    }));

    render(createElement(NearbyHistory, { place: origin, onOpen: () => {} }));
    fireEvent.click(screen.getByRole("button", { name: "Çevredeki tarihi göster" }));

    expect((await screen.findAllByText("3/3 kayıt · konumlar 2 km içinde")).length).toBe(NEARBY_HISTORY_PREVIEW);
    expect(screen.getByRole("link", { name: "Wikidata · Q1" })).toBeTruthy();
    const showAll = screen.getByRole("button", { name: "Tüm 7 tarihî yeri göster" });
    fireEvent.click(showAll);
    await waitFor(() => expect(screen.getByText("Yer 7")).toBeTruthy());
    expect(screen.getAllByText("3/3 kayıt · konumlar 2 km içinde")).toHaveLength(7);
  });
});
