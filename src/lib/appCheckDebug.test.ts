import { describe, expect, it } from "vitest";
import { installAppCheckDebugToken, type DebugTokenTarget } from "./appCheckDebug";

describe("installAppCheckDebugToken", () => {
  it("boş veya tanımsız token'da hedefe dokunmaz", () => {
    const target: DebugTokenTarget = {};
    expect(installAppCheckDebugToken(undefined, target)).toBe(false);
    expect(installAppCheckDebugToken("   ", target)).toBe(false);
    expect(target.FIREBASE_APPCHECK_DEBUG_TOKEN).toBeUndefined();
  });

  it("token'ı kenar boşluklarından arındırıp yazar", () => {
    const target: DebugTokenTarget = {};
    expect(installAppCheckDebugToken("  00000000-0000-4000-A000-000000000000 ", target)).toBe(true);
    expect(target.FIREBASE_APPCHECK_DEBUG_TOKEN).toBe("00000000-0000-4000-A000-000000000000");
  });
});
