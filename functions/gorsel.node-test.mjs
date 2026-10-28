import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isAllowedTarget, onRequest } from "../functions/gorsel.js";

/**
 * E7 — Pexels köprüsü güvenlik kapısı.
 *
 * NEDEN: `/gorsel?u=...` bir açık proxy'ye dönüşürse sitenin alan adı üzerinden
 * herhangi bir adrese istek atılabilir (SSRF) ve kota tüketilir. Bu testler
 * allowlist'in dar kaldığını kilitler.
 */

describe("gorsel köprüsü — hedef doğrulama", () => {
  it("yalnız Pexels fotoğraf yollarına izin verir", () => {
    assert.equal(
      isAllowedTarget("https://images.pexels.com/photos/123/pexels-photo-123.jpeg?w=560"),
      true,
    );
    assert.equal(isAllowedTarget("https://images.pexels.com/photos/9/a_b-c.jpg"), true);
  });

  it("başka host'ları reddeder (SSRF)", () => {
    for (const target of [
      "https://example.com/photos/1/x.jpg",
      "https://images.pexels.com.evil.test/photos/1/x.jpg",
      "http://images.pexels.com/photos/1/x.jpg",
      "https://169.254.169.254/photos/1/x.jpg",
      "https://images.pexels.com/videos/1/x.mp4",
      "https://images.pexels.com/photos/1/../../etc/passwd",
    ]) {
      assert.equal(isAllowedTarget(target), false, target);
    }
  });

  it("bozuk ve aşırı uzun sorguları reddeder", () => {
    assert.equal(isAllowedTarget("bozuk-adres"), false);
    assert.equal(isAllowedTarget(""), false);
    assert.equal(
      isAllowedTarget(`https://images.pexels.com/photos/1/x.jpg?${"a".repeat(400)}`),
      false,
    );
  });
});

describe("gorsel köprüsü — istek davranışı", () => {
  const call = (init) => onRequest({ request: new Request("https://atlasia.test/gorsel", init) });

  it("parametre yoksa 400, izin verilmeyen hedefte 403 döner", async () => {
    assert.equal((await call({ method: "GET" })).status, 400);
    const forbidden = await call({ method: "GET" });
    assert.equal(forbidden.status, 400);
    const bad = await onRequest({
      request: new Request("https://atlasia.test/gorsel?u=https%3A%2F%2Fexample.com%2Fphotos%2F1%2Fx.jpg"),
    });
    assert.equal(bad.status, 403);
  });

  it("POST reddedilir, OPTIONS 204 döner", async () => {
    assert.equal((await call({ method: "POST" })).status, 405);
    assert.equal((await call({ method: "OPTIONS" })).status, 204);
  });
});
