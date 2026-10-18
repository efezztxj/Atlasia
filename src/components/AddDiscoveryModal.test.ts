import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import AddDiscoveryModal from "./AddDiscoveryModal";

describe("pin ekleme formu", () => {
  it("300 kelime sınırını ve aynı anda çoklu fotoğraf seçimini gösterir", () => {
    const markup = renderToStaticMarkup(createElement(AddDiscoveryModal, {
      draft: { lng: 27.15, lat: 38.45 },
      uploadPhoto: async () => "data:image/jpeg;base64,AQ==",
      onClose: () => {},
      onSave: async () => {},
    }));

    expect(markup).toContain("en fazla 300 kelime");
    expect(markup).toContain("0/300 kelime");
    expect(markup).toContain('maxLength="5000"');
    expect(markup).toContain('rows="6"');
    expect(markup).toContain("birden fazla seçebilirsin");
    expect(markup).toContain('type="file"');
    expect(markup).toMatch(/type="file"[^>]*multiple=""/u);
  });
});
