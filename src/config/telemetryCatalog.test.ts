/**
 * Olay kataloğu sözleşmesi.
 *
 * NEDEN VAR: 2026-10-27 denetiminde üç olay (`share`, `offline_pack`,
 * `report_created`) tanımlı ama hiçbir akışta çağrılmıyordu; yani "ölçüyoruz"
 * sanılan üç metrik aslında sıfırdı. Bu test üç şeyi birbirine bağlar:
 *   1) `analytics.ts` içindeki olay adı ve alan adları,
 *   2) olayın gerçekten bir kullanıcı akışında tetiklenmesi,
 *   3) `docs/olcum-ve-hata-izleme.md` §4b tablosundaki satır.
 * Üçünden biri eksikse test kırılır; yani "tanımlı ama ölü olay" geri gelemez.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { ANALYTICS_EVENTS } from "../lib/analytics";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

const analyticsSource = read("../lib/analytics.ts");
const docSource = read("../../docs/olcum-ve-hata-izleme.md");

/** `appOpen: (props: { standalone?: boolean }) => void;` satırlarından alan adlarını çıkarır. */
function payloadKeys(methodName: string): string[] {
  const line = analyticsSource
    .split("\n")
    .find((candidate) => new RegExp(`^\\s+${methodName}:\\s*\\(`).test(candidate));
  if (!line) return [];
  const propsMatch = line.match(/props\??:\s*\{([^}]*)\}/);
  if (!propsMatch) return [];
  return propsMatch[1]
    .split(";")
    .map((entry) => entry.split(":")[0].replace("?", "").trim())
    .filter(Boolean);
}

/** camelCase olay metodu → snake_case olay adı (`reportCreated` → `report_created`). */
function eventNameOf(methodName: string): string {
  return methodName.replace(/([A-Z])/g, (letter) => `_${letter.toLowerCase()}`);
}

const docRow = (event: string): string | undefined =>
  docSource
    .split("\n")
    .find((line) => line.startsWith(`| \`${event}\``));

describe("olay kataloğu: kod, tetikleyici ve belge aynı şeyi söyler", () => {
  it("her olay için belgede bir satır var", () => {
    for (const event of ANALYTICS_EVENTS) {
      expect(docRow(event), `${event} için §4b tablosunda satır yok`).toBeTruthy();
    }
  });

  it("belgede uydurma (kodda olmayan) olay yok", () => {
    const documented = [...docSource.matchAll(/^\| `([a-z_]+)`/gm)].map((match) => match[1]);
    for (const event of documented) {
      expect(ANALYTICS_EVENTS as readonly string[]).toContain(event);
    }
  });

  it("her olayın yük alanları belgede adıyla geçer", () => {
    const methodByEvent: Record<string, string> = {
      app_open: "appOpen",
      session_start: "sessionStart",
      // T2 huni olayları (2026-10-28): `sign_up` adı `signup_complete` oldu.
      cta_click: "ctaClick",
      map_open: "mapOpen",
      // T8 karşılama seçimi (2026-10-28).
      onboarding_choice: "onboardingChoice",
      signup_start: "signupStart",
      signup_complete: "signupComplete",
      sign_in: "signIn",
      place_created: "placeCreated",
      route_published: "routePublished",
      first_route_created: "firstRouteCreated",
      audio_guide_start: "audioGuideStart",
      post_created: "postCreated",
      share: "share",
      offline_pack: "offlinePack",
      report_created: "reportCreated",
      consent_choice: "consentChoice",
    };

    for (const event of ANALYTICS_EVENTS) {
      const row = docRow(event)!;
      const method = methodByEvent[event];
      // Eşleme eksikse test sessizce geçmesin: katalog kuralı gereği her olayın
      // metodu burada tanımlı olmalı.
      expect(method, `${event} için metot eşlemesi yok`).toBeTruthy();
      for (const key of payloadKeys(method)) {
        expect(row, `${event} satırında "${key}" alanı yazmıyor`).toContain(`\`${key}\``);
      }
    }
  });

  it("belgedeki her satır depoda var olan bir kaynak dosyayı tetikleyici gösterir", () => {
    const srcNames = new Set(
      readdirSync(new URL("../", import.meta.url), { recursive: true, encoding: "utf8" })
        .map((entry) => path.basename(entry))
        .filter((entry) => /\.tsx?$/.test(entry)),
    );

    for (const event of ANALYTICS_EVENTS) {
      const row = docRow(event)!;
      const fileName = [...row.matchAll(/`([\w.-]+\.tsx?)`/g)]
        .map((match) => match[1])
        .find((candidate) => !candidate.includes(event));
      expect(fileName, `${event} satırında kaynak dosya yok`).toBeTruthy();
      expect(srcNames.has(fileName!), `${fileName} depoda yok — belge bayat`).toBe(true);
    }
  });

  it("olay adı dönüşümü snake_case ile tutarlı", () => {
    expect(eventNameOf("reportCreated")).toBe("report_created");
    expect(eventNameOf("appOpen")).toBe("app_open");
    expect(eventNameOf("share")).toBe("share");
  });
});
