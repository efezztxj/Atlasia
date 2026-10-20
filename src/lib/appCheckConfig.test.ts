import { describe, expect, it } from "vitest";
import { appCheckConfig, DEFAULT_APP_CHECK_SITE_KEY } from "./appCheckConfig";

describe("App Check yapılandırması", () => {
  it("mevcut public site key ve otomatik yenilemeyi korur", () => {
    expect(appCheckConfig()).toEqual({
      siteKey: DEFAULT_APP_CHECK_SITE_KEY,
      isTokenAutoRefreshEnabled: true,
    });
  });

  it("açıkça verilen anahtarı başındaki ve sonundaki boşluklardan arındırır", () => {
    expect(appCheckConfig("  test-site-key  ")).toEqual({
      siteKey: "test-site-key",
      isTokenAutoRefreshEnabled: true,
    });
  });

  it("boş anahtarda mevcut public anahtara geri döner", () => {
    expect(appCheckConfig("   ").siteKey).toBe(DEFAULT_APP_CHECK_SITE_KEY);
  });
});
