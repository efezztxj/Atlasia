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

describe("üretim bağımlılığı güvenlik sabitlemeleri", () => {
  it("MapLibre'ı XSS açığının ilk düzeltilmiş sürümüne sabitler", () => {
    expect(manifest.dependencies?.["maplibre-gl"]).toBe("6.4.1");
    expect(lock.packages?.["node_modules/maplibre-gl"]?.version).toBe("6.4.1");
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
