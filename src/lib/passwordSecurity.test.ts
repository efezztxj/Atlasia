import { describe, expect, it, vi } from "vitest";
import {
  checkPwnedPassword,
  estimatePasswordStrength,
  parsePwnedRangeResponse,
  passwordRangeParts,
} from "./passwordSecurity";

const PASSWORD_SUFFIX = "1E4C9B93F3F0682250B6CF8331B7EE68FD8";

describe("password strength guidance", () => {
  it("scores empty and short passwords conservatively", () => {
    expect(estimatePasswordStrength("")).toMatchObject({ score: 0, label: "Çok zayıf" });
    expect(estimatePasswordStrength("abc123").score).toBe(0);
    expect(estimatePasswordStrength("abc12345").score).toBe(1);
  });

  it("rewards length and character variety", () => {
    expect(estimatePasswordStrength("Kutup-rotasi-2026").score).toBe(4);
    expect(estimatePasswordStrength("uzun bir rota parolası 47").score).toBe(4);
  });

  it("does not present predictable or repeated patterns as strong", () => {
    expect(estimatePasswordStrength("Atlasia-123456789!").score).toBeLessThanOrEqual(2);
    expect(estimatePasswordStrength("AAaaAAaaAAaa-8844").score).toBeLessThanOrEqual(2);
  });
});

describe("Pwned Passwords k-anonymity", () => {
  it("computes the SHA-1 range prefix locally", async () => {
    await expect(passwordRangeParts("password")).resolves.toEqual({
      prefix: "5BAA6",
      suffix: PASSWORD_SUFFIX,
    });
  });

  it("parses real matches while treating zero-count padding as no exposure", () => {
    expect(parsePwnedRangeResponse(`${PASSWORD_SUFFIX}:3303003\n${"A".repeat(35)}:0`, PASSWORD_SUFFIX)).toBe(3_303_003);
    expect(parsePwnedRangeResponse(`${PASSWORD_SUFFIX}:0\n${"A".repeat(35)}:12`, PASSWORD_SUFFIX)).toBe(0);
    expect(parsePwnedRangeResponse("not-a-range-response", PASSWORD_SUFFIX)).toBeNull();
  });

  it("sends only the five-character prefix with privacy-preserving request options", async () => {
    let requestedUrl = "";
    let requestedInit: RequestInit | undefined;
    const fetcher: typeof fetch = vi.fn(async (input, init) => {
      requestedUrl = String(input);
      requestedInit = init;
      return new Response(`${PASSWORD_SUFFIX}:42`, { status: 200 });
    });

    await expect(checkPwnedPassword("password", { fetcher })).resolves.toEqual({ status: "exposed", count: 42 });
    expect(fetcher).toHaveBeenCalledOnce();
    expect(requestedUrl).toBe("https://api.pwnedpasswords.com/range/5BAA6");
    expect(requestedUrl).not.toContain(PASSWORD_SUFFIX);
    expect(requestedInit).toMatchObject({
      method: "GET",
      headers: { Accept: "text/plain", "Add-Padding": "true" },
      credentials: "omit",
      cache: "no-store",
      referrerPolicy: "no-referrer",
      mode: "cors",
    });
    expect(requestedInit?.body).toBeUndefined();
  });

  it("reports safe only after a valid range response without a positive match", async () => {
    const fetcher = vi.fn(async () => new Response(`${"A".repeat(35)}:0\n${"B".repeat(35)}:5`, { status: 200 }));
    await expect(checkPwnedPassword("password", { fetcher })).resolves.toEqual({ status: "safe" });
  });

  it("fails open with an explicit unavailable result for network, HTTP, or malformed responses", async () => {
    const networkFailure = vi.fn(async () => { throw new Error("offline"); });
    const httpFailure = vi.fn(async () => new Response("unavailable", { status: 503 }));
    const malformed = vi.fn(async () => new Response("unexpected body", { status: 200 }));

    await expect(checkPwnedPassword("password", { fetcher: networkFailure })).resolves.toEqual({ status: "unavailable" });
    await expect(checkPwnedPassword("password", { fetcher: httpFailure })).resolves.toEqual({ status: "unavailable" });
    await expect(checkPwnedPassword("password", { fetcher: malformed })).resolves.toEqual({ status: "unavailable" });
  });
});
