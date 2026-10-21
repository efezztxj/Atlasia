import { describe, expect, it } from "vitest";
import { strToU8, zlibSync } from "fflate";
import type { AtlasRoute } from "../types";
import { encodePolyline } from "./polyline";
import {
  SHARE_LINK_MAX_CHARS,
  SHARE_LINK_MESSAGES,
  buildRouteShareUrl,
  createRouteShareLink,
  parseRouteShareLink,
  parseShareRoute,
} from "./shareLink";

const CONSENT = { userInitiated: true, shareConsent: true } as const;

function sampleRoute(): AtlasRoute {
  const coords: [number, number][] = [
    [27.14, 38.42],
    [27.145, 38.425],
    [27.15, 38.43],
  ];
  return {
    id: "route-paylasim-1",
    routeTitle: "İzmir Kordon'da akşam yürüyüşü 🌇",
    routeSummary: "Şğüöçıİ harfleri ve emoji 😊 içeren özet.",
    totalDurationHours: 2.5,
    totalDistanceKm: 4.2,
    transport: "walking",
    vibe: "Sakin sahil",
    region: "İzmir · Konak",
    days: [
      {
        dayNumber: 1,
        title: "1. Gün",
        summary: "Sahil hattı",
        stops: [
          {
            order: 1,
            name: "Saat Kulesi 🕰️",
            type: "history",
            lat: 38.42,
            lng: 27.14,
            startTime: "17:00",
            endTime: "17:20",
            durationMinutes: 20,
            description: "Buluşma noktası.",
            aiReason: "Merkezî konum.",
            tips: ["Güvercinleri besleme 🐦"],
            isCommunityPin: false,
            pinId: null,
            category: "Tarih",
            imageUrl: null,
            source: "atlasia",
          },
          {
            order: 2,
            name: "Kordon çimleri",
            type: "viewpoint",
            lat: 38.43,
            lng: 27.15,
            startTime: "17:40",
            endTime: "18:30",
            durationMinutes: 50,
            description: "Gün batımı.",
            aiReason: "Açık ufuk.",
            tips: [],
            isCommunityPin: true,
            pinId: "pin-9",
            category: "Manzara",
            imageUrl: "https://example.org/kordon.jpg",
          },
        ],
        polyline: encodePolyline(coords),
        legs: [
          { id: "leg-1", coords: coords.slice(0, 2), mode: "walking", distanceKm: 0.7, durationMinutes: 10 },
          { id: "leg-2", coords: coords.slice(1), mode: "walking", distanceKm: 0.8, durationMinutes: 12, elevationGain: 3 },
        ],
      },
    ],
    weatherNote: "Akşam serinliği için ince bir kat al.",
    alternatives: [{ label: "Yağmur planı", prompt: "Kapalı mekân ağırlıklı" }],
    dataSources: ["OpenStreetMap contributors"],
    createdAt: 1_760_000_000_000,
    origin: { lat: 38.42, lng: 27.14 },
  };
}

function tokenOf(payload: unknown): string {
  const compressed = zlibSync(strToU8(JSON.stringify(payload)), { level: 9 });
  let binary = "";
  compressed.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  const base64url = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `v1.${base64url}`;
}

describe("P20 link içi paylaşım · gidiş-dönüş", () => {
  it("Türkçe ve emoji içeren rota kayıpsız döner; bacaklar polyline'dan geri açılır", async () => {
    const route = sampleRoute();
    const created = await createRouteShareLink(route, CONSENT);
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.token.startsWith("v1.")).toBe(true);
    expect(created.token.length).toBeLessThanOrEqual(SHARE_LINK_MAX_CHARS);
    expect(created.droppedPhoto).toBe(false);

    const parsed = await parseRouteShareLink(created.token);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.route.routeTitle).toBe("İzmir Kordon'da akşam yürüyüşü 🌇");
    expect(parsed.route.days[0].stops.map((stop) => stop.name)).toEqual(["Saat Kulesi 🕰️", "Kordon çimleri"]);
    expect(parsed.route.days[0].stops[0].tips).toEqual(["Güvercinleri besleme 🐦"]);
    expect(parsed.route.days[0].legs).toHaveLength(2);
    expect(parsed.route.days[0].legs?.[1].elevationGain).toBe(3);
    // Polyline 5 ondalığa yuvarlar: koordinatlar yakınlıkla eşit.
    const legCoords = parsed.route.days[0].legs?.[0].coords ?? [];
    expect(legCoords).toHaveLength(2);
    expect(legCoords[1][0]).toBeCloseTo(27.145, 5);
    expect(legCoords[1][1]).toBeCloseTo(38.425, 5);
    expect(parsed.route.origin).toEqual({ lat: 38.42, lng: 27.14 });
  });

  it("kapak fotoğrafı bağlantıya girmez ve çağırana bildirilir", async () => {
    const route = { ...sampleRoute(), photo: `data:image/jpeg;base64,${"A".repeat(5000)}` };
    const created = await createRouteShareLink(route, CONSENT);
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.droppedPhoto).toBe(true);
    const parsed = await parseRouteShareLink(created.token);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.route.photo).toBeUndefined();
  });

  it("tam URL beklenen biçimde kurulur", () => {
    expect(buildRouteShareUrl("https://atlasia.pages.dev/", "v1.ABC"))
      .toBe("https://atlasia.pages.dev/?r=v1.ABC");
  });
});

describe("P20 gizlilik kapısı", () => {
  it("paylaşım onayı olmadan bağlantı üretilmez", async () => {
    const created = await createRouteShareLink(sampleRoute(), { userInitiated: true, shareConsent: false });
    expect(created.ok).toBe(false);
    if (created.ok) return;
    expect(created.message).toContain("onay ister");
  });

  it("kullanıcı eylemi olmadan bağlantı üretilmez", async () => {
    const created = await createRouteShareLink(sampleRoute(), { userInitiated: false, shareConsent: true });
    expect(created.ok).toBe(false);
  });

  it("ham iz alanı taşıyan nesne bağlantıya giremez", async () => {
    const dirty = sampleRoute();
    // Ham iz sızıntısı simülasyonu: accuracy alanı enjekte edilmiş rota.
    (dirty as unknown as Record<string, unknown>).accuracy = { meanMeters: 9 };
    const created = await createRouteShareLink(dirty, CONSENT);
    expect(created.ok).toBe(false);
    if (created.ok) return;
    expect(created.message).toContain("ham iz");
  });
});

describe("P20 sınırlar ve bozuk bağlantılar", () => {
  it("bağlantıya sığmayan rota açık 'çok büyük' hatası verir", async () => {
    // Sıkıştırılamayan (salınımlı) uzun bir çizgi: token sınırını aşar.
    const noisy: [number, number][] = [];
    for (let index = 0; index < 6000; index += 1) {
      noisy.push([27.14 + Math.sin(index * 12.9898) * 0.4, 38.42 + Math.cos(index * 78.233) * 0.4]);
    }
    const route = sampleRoute();
    route.days = [{ ...route.days[0], polyline: encodePolyline(noisy), legs: undefined }];
    const created = await createRouteShareLink(route, CONSENT);
    expect(created.ok).toBe(false);
    if (created.ok) return;
    expect(created.message).toBe(SHARE_LINK_MESSAGES.tooLarge);
  });

  it("boş token 'empty' nedeni verir", async () => {
    const parsed = await parseRouteShareLink("   ");
    expect(parsed).toEqual({ ok: false, reason: "empty", message: SHARE_LINK_MESSAGES.empty });
  });

  it("bilinmeyen sürüm öneki ayrıştırılır", async () => {
    const created = await createRouteShareLink(sampleRoute(), CONSENT);
    if (!created.ok) throw new Error("token üretilemedi");
    const parsed = await parseRouteShareLink(created.token.replace(/^v1\./, "v2."));
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.reason).toBe("unknown-version");
    expect(parsed.message).toBe(SHARE_LINK_MESSAGES.unknownVersion);
  });

  it("kırpılmış/değiştirilmiş token sessizce açılmaz", async () => {
    const created = await createRouteShareLink(sampleRoute(), CONSENT);
    if (!created.ok) throw new Error("token üretilemedi");
    const truncated = await parseRouteShareLink(created.token.slice(0, created.token.length - 6));
    expect(truncated.ok).toBe(false);
    const middle = Math.floor(created.token.length / 2);
    const flippedChar = created.token[middle] === "A" ? "B" : "A";
    const tampered = created.token.slice(0, middle) + flippedChar + created.token.slice(middle + 1);
    const parsed = await parseRouteShareLink(tampered);
    expect(parsed.ok).toBe(false);
  });

  it("sınırın üstündeki token çözülmeden reddedilir", async () => {
    const parsed = await parseRouteShareLink(`v1.${"A".repeat(SHARE_LINK_MAX_CHARS)}`);
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.reason).toBe("too-large");
  });

  it("biçimsiz metin 'corrupt' sayılır", async () => {
    for (const token of ["merhaba", "v1.", "vX.ABC", "v1.!!!"]) {
      const parsed = await parseRouteShareLink(token);
      expect(parsed.ok).toBe(false);
      if (!parsed.ok) expect(parsed.reason).toBe("corrupt");
    }
  });
});

describe("P20 gelen veri doğrulaması (saldırgan yükü)", () => {
  it("aralık dışı durak koordinatı rotayı reddeder", async () => {
    const route = sampleRoute();
    route.days[0].stops[0] = { ...route.days[0].stops[0], lat: 999 };
    // createRouteShareLink kendi doğrulayıcısından geçemeyeni üretmez;
    // saldırgan token'ı elle kurulur ve açma tarafında reddedilir.
    const parsed = await parseRouteShareLink(tokenOf({ v: 1, route }));
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.reason).toBe("invalid");
  });

  it("yol ayracı taşıyan kimlik reddedilir; sürümsüz yük reddedilir", async () => {
    const route = { ...sampleRoute(), id: "kullanici/belge" };
    expect(parseShareRoute(route)).toBeNull();
    const parsed = await parseRouteShareLink(tokenOf({ route: sampleRoute() }));
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.reason).toBe("invalid");
  });

  it("bilinmeyen alanlar taşınmaz; bilinmeyen durak tipi 'other' olur", async () => {
    const route = sampleRoute();
    const withExtra = {
      ...route,
      bilinmeyenAlan: "sızıntı",
      days: [
        {
          ...route.days[0],
          stops: route.days[0].stops.map((stop, index) =>
            index === 0 ? { ...stop, type: "ufo", ekAlan: 1 } : stop),
          legs: route.days[0].legs?.map(({ coords, ...leg }) => ({
            ...leg,
            coordsPolyline: encodePolyline(coords),
          })),
        },
      ],
    };
    const parsed = await parseRouteShareLink(tokenOf({ v: 1, route: withExtra }));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect((parsed.route as unknown as Record<string, unknown>).bilinmeyenAlan).toBeUndefined();
    expect(parsed.route.days[0].stops[0].type).toBe("other");
    expect((parsed.route.days[0].stops[0] as unknown as Record<string, unknown>).ekAlan).toBeUndefined();
    // Hava tahmini enjekte edilse bile taşınmaz (bayat veri).
    expect(parsed.route.days[0].stops[0].weather).toBeUndefined();
  });
});
