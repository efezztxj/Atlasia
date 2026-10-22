import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface PackageManifest {
  dependencies?: Record<string, string>;
  overrides?: Record<string, string>;
  engines?: Record<string, string>;
}

interface PackageLock {
  packages?: Record<string, { version?: string }>;
}

const manifest = JSON.parse(readFileSync("package.json", "utf8")) as PackageManifest;
const lock = JSON.parse(readFileSync("package-lock.json", "utf8")) as PackageLock;

// MapLibre XSS açığının ilk düzeltilmiş sürümü: 6.4.1. Bu bir ALTTAN sınırdır;
// eşitlik kilidi değildir. 6.14.0+ gibi bilinçli yükseltmeler serbesttir.
const MAPLIBRE_SECURITY_FLOOR = "6.4.1";

function parseVersion(spec: string): [number, number, number] {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(spec.trim().replace(/^[\^~]/, ""));
  if (!match) throw new Error(`Sürüm çözümlenemedi: ${spec}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function isAtLeast(version: string, floor: string): boolean {
  const a = parseVersion(version);
  const b = parseVersion(floor);
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return true;
}

describe("üretim bağımlılığı güvenlik sabitlemeleri", () => {
  it("MapLibre'ı XSS açığının ilk düzeltilmiş sürümünde veya üstünde tutar", () => {
    const manifestVersion = manifest.dependencies?.["maplibre-gl"];
    const lockVersion = lock.packages?.["node_modules/maplibre-gl"]?.version;
    expect(manifestVersion, "package.json").toBeDefined();
    expect(lockVersion, "package-lock.json").toBeDefined();
    // Bilinçli sürüm kilidi: aralık belirteci (^ ~) kullanılmaz.
    expect(manifestVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(isAtLeast(manifestVersion as string, MAPLIBRE_SECURITY_FLOOR)).toBe(true);
    expect(isAtLeast(lockVersion as string, MAPLIBRE_SECURITY_FLOOR)).toBe(true);
    // Manifest ve lock aynı sürümde buluşmalı.
    expect(parseVersion(manifestVersion as string)).toEqual(parseVersion(lockVersion as string));
  });

  it("MapLibre v6 worker'ını Vite tarafından yayımlanan aynı-origin asset'e bağlar", () => {
    const mapView = readFileSync("src/components/MapView.tsx", "utf8");

    expect(mapView).toContain('from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url"');
    expect(mapView).toContain("maplibregl.setWorkerUrl(maplibreWorkerUrl)");
    expect(mapView).toContain('import * as maplibregl from "maplibre-gl"');
    expect(mapView).not.toContain('import maplibregl from "maplibre-gl"');
  });

  it("MapLibre v6 stil zincirinin motor şartını CI'da karşılar", () => {
    const workflow = readFileSync(".github/workflows/ci.yml", "utf8");

    expect(manifest.engines?.node).toBe("^22.13.0 || >=24.0.0");
    expect(workflow).toContain("name: Use Node.js 22");
    expect(workflow).toMatch(/node-version:\s*22/);
  });

  it("Firebase'in dar gRPC aralığını ilk güvenli 1.x sürümüne override eder", () => {
    expect(manifest.dependencies?.firebase).toBe("^12.19.0");
    expect(manifest.overrides?.["@grpc/grpc-js"]).toBe("1.13.6");
    expect(lock.packages?.["node_modules/@grpc/grpc-js"]?.version).toBe("1.13.6");
    expect(lock.packages?.["node_modules/@firebase/firestore/node_modules/@grpc/grpc-js"]).toBeUndefined();
  });
});
