/**
 * C4 — yer detayı galerisi: küçük görseller anlamlı `alt` taşır.
 *
 * NEDEN: Denetimde galeri şeridindeki `img` etiketlerinin `alt=""` olduğu
 * görüldü. Boş `alt` "bu görsel dekoratif" demektir; oysa bu görseller
 * kullanıcının seçtiği fotoğrafın kendisi. Ekran okuyucu kullanıcısı hangi
 * fotoğrafın ne olduğunu bilemiyordu.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/components/PlaceDetails.tsx", "utf8");

describe("C4 — galeri alt metinleri", () => {
  it("galeri şeridinde boş alt kalmadı", () => {
    const gallery = source.slice(source.indexOf('aria-label="Yer fotoğrafları"'));
    const strip = gallery.slice(0, gallery.indexOf("</nav>"));
    expect(strip).toContain("<img");
    expect(strip).not.toContain('alt=""');
  });

  it("alt metni yeri ve sırayı söyler", () => {
    const gallery = source.slice(source.indexOf('aria-label="Yer fotoğrafları"'));
    const strip = gallery.slice(0, gallery.indexOf("</nav>"));
    expect(strip).toContain("${place.title} fotoğrafı ${photoIndex + 1}");
  });
});
