import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

interface HeaderBlock {
  pattern: string;
  headers: Map<string, string>;
}

const publicDirectory = fileURLToPath(new URL("../../public/", import.meta.url));
const headersPath = fileURLToPath(new URL("../../public/_headers", import.meta.url));
const rawHeaders = readFileSync(headersPath, "utf8");

function parseHeaderBlocks(value: string): HeaderBlock[] {
  const blocks: HeaderBlock[] = [];
  let current: HeaderBlock | null = null;

  for (const rawLine of value.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    if (!/^\s/.test(rawLine)) {
      current = { pattern: trimmed, headers: new Map() };
      blocks.push(current);
      continue;
    }

    if (!current) throw new Error(`Header rule is missing a path: ${trimmed}`);
    const separator = trimmed.indexOf(":");
    if (separator < 1) throw new Error(`Header is missing a value: ${trimmed}`);
    current.headers.set(
      trimmed.slice(0, separator).toLowerCase(),
      trimmed.slice(separator + 1).trim(),
    );
  }

  return blocks;
}

const blocks = parseHeaderBlocks(rawHeaders);
const block = (pattern: string) => {
  const match = blocks.find((entry) => entry.pattern === pattern);
  if (!match) throw new Error(`Missing Cloudflare header block: ${pattern}`);
  return match.headers;
};

describe("Cloudflare Pages security headers", () => {
  it("sets the baseline browser security policy on every static response", () => {
    const global = block("/*");

    expect(global.get("x-content-type-options")).toBe("nosniff");
    expect(global.get("x-frame-options")).toBe("DENY");
    expect(global.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
    expect(global.get("cross-origin-opener-policy")).toBe("same-origin-allow-popups");
    expect(global.get("cross-origin-resource-policy")).toBe("same-origin");
    expect(global.get("strict-transport-security")).toBe("max-age=31536000");
    expect(global.get("permissions-policy")).toContain("geolocation=(self)");
    expect(global.get("permissions-policy")).toContain("camera=()");
    expect(global.get("permissions-policy")).toContain("microphone=()");
  });

  it("uses a restrictive CSP while allowing Atlasia's documented integrations", () => {
    const policy = block("/*").get("content-security-policy") ?? "";

    for (const directive of [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "script-src-attr 'none'",
      "worker-src 'self' blob:",
      "upgrade-insecure-requests",
    ]) {
      expect(policy).toContain(directive);
    }

    for (const source of [
      "https://*.googleapis.com",
      "https://*.firebaseapp.com",
      "wss://*.firebaseio.com",
      "https://www.google.com/recaptcha/",
      "https://server.arcgisonline.com",
      "https://demotiles.maplibre.org",
      "https://photon.komoot.io",
      "https://api.open-meteo.com",
      "https://commons.wikimedia.org",
    ]) {
      expect(policy).toContain(source);
    }

    expect(policy).not.toContain("'unsafe-eval'");
    expect(policy).not.toMatch(/(?:default|connect|frame|script)-src[^;]*\s\*/);
  });

  it("keeps Firebase OAuth, Apple sign-in, phone reCAPTCHA, and map embeds usable", () => {
    const policy = block("/*").get("content-security-policy") ?? "";
    const frameSources = policy.match(/frame-src ([^;]+)/)?.[1] ?? "";

    expect(frameSources).toContain("https://*.firebaseapp.com");
    expect(frameSources).toContain("https://accounts.google.com");
    expect(frameSources).toContain("https://appleid.apple.com");
    expect(frameSources).toContain("https://www.google.com");
    expect(frameSources).toContain("https://www.openstreetmap.org");
  });

  it("separates update-sensitive files from immutable hashed assets", () => {
    expect(block("/index.html").get("cache-control")).toBe("no-cache, no-store, must-revalidate");
    expect(block("/sw.js").get("cache-control")).toBe("no-cache, no-store, must-revalidate");
    expect(block("/sw.js").get("service-worker-allowed")).toBe("/");
    expect(block("/assets/*").get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(block("/manifest.webmanifest").get("cache-control")).toContain("max-age=3600");
    expect(block("https://:version.atlasia.pages.dev/*").get("x-robots-tag")).toBe("noindex, nofollow");
  });

  it("stays within Cloudflare's line limit and relies on its safe SPA fallback", () => {
    for (const line of rawHeaders.split(/\r?\n/)) expect(line.length).toBeLessThanOrEqual(2_000);

    expect(existsSync(`${publicDirectory}404.html`)).toBe(false);
    const redirectsPath = `${publicDirectory}_redirects`;
    if (existsSync(redirectsPath)) {
      const redirects = readFileSync(redirectsPath, "utf8");
      expect(redirects).not.toMatch(/^\/\*\s+\/index\.html\s+200\s*$/m);
    }
  });
});
