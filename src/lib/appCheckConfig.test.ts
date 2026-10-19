import { describe, expect, it } from "vitest";
import {
  DEFAULT_APP_CHECK_SITE_KEY,
  resolveAppCheckSiteKey,
} from "./appCheckConfig";

describe("App Check site key configuration", () => {
  it("uses an explicitly configured public key after trimming whitespace", () => {
    expect(resolveAppCheckSiteKey("  site-key-from-build  ")).toBe("site-key-from-build");
  });

  it("preserves Atlasia's registered key when the optional override is absent or blank", () => {
    expect(resolveAppCheckSiteKey(undefined)).toBe(DEFAULT_APP_CHECK_SITE_KEY);
    expect(resolveAppCheckSiteKey("  ")).toBe(DEFAULT_APP_CHECK_SITE_KEY);
  });
});
