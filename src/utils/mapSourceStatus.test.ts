import { describe, expect, it } from "vitest";
import { activeBaseSource, isActiveBaseSourceError } from "./mapSourceStatus";

describe("etkin harita altlığı hatası", () => {
  it("Karanlık katmanı OpenFreeMap vektör kaynağıyla eşler", () => {
    expect(activeBaseSource("dark")).toBe("openfreemap-openmaptiles");
    expect(isActiveBaseSourceError({ sourceId: "openfreemap-openmaptiles" }, "dark")).toBe(true);
  });
  it("diğer altlıkların kaynaklarını ayrı takip eder", () => {
    for (const style of ["satellite", "street", "topographic"] as const) {
      expect(isActiveBaseSourceError({ sourceId: style }, style)).toBe(true);
      expect(isActiveBaseSourceError({ sourceId: "terrain" }, style)).toBe(false);
    }
  });
  it("ilgisiz ve kaynak kimliği olmayan hataları altlık hatası diye sunmaz", () => {
    expect(isActiveBaseSourceError(null, "dark")).toBe(false);
    expect(isActiveBaseSourceError({ error: new Error("glyph") }, "dark")).toBe(false);
    expect(isActiveBaseSourceError({ sourceId: "street" }, "dark")).toBe(false);
  });
});
