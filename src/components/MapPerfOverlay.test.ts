import { describe, expect, it } from "vitest";
import { perfEnabled } from "./MapPerfOverlay";

/*
 * Teşhis paneli üretimde varsayılan olarak hiçbir şey çizmemeli; yalnız
 * `?perf` ile açılır. Bu, kullanıcıya ekran görüntüsüyle veri toplattıran
 * yolun yanlışlıkla herkesin ekranında görünmesini engeller.
 */
describe("harita perf paneli açma koşulu", () => {
  it("parametre yokken kapalı", () => {
    expect(perfEnabled("")).toBe(false);
    expect(perfEnabled("?")).toBe(false);
    expect(perfEnabled("?app=feed")).toBe(false);
  });

  it("?perf ile açılır (değer verilmese de)", () => {
    expect(perfEnabled("?perf")).toBe(true);
    expect(perfEnabled("?perf=1")).toBe(true);
    expect(perfEnabled("?app=feed&perf=1")).toBe(true);
  });

  it("benzer adlarla yanlışlıkla açılmaz", () => {
    expect(perfEnabled("?performance=1")).toBe(false);
    expect(perfEnabled("?myperf=1")).toBe(false);
  });
});
