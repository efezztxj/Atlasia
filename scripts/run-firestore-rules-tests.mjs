import { createHash } from "node:crypto";
import {
  closeSync,
  createReadStream,
  createWriteStream,
  openSync,
  readFileSync,
} from "node:fs";
import { mkdir, rename, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { connect } from "node:net";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const emulatorVersion = "1.22.0";
const emulatorFile = `cloud-firestore-emulator-v${emulatorVersion}.jar`;
const emulatorUrl = `https://storage.googleapis.com/firebase-preview-drop/emulator/${emulatorFile}`;
const expectedSha256 = "9b6498b7f62714d67f48f59b3818883cd682dbcd46b9f59511de81c97bb5166c";
const cacheDirectory = join(homedir(), ".cache", "atlasia", "firebase-emulators");
const emulatorPath = join(cacheDirectory, emulatorFile);
const emulatorLogPath = join(cacheDirectory, "firestore-emulator.log");
const temporaryPath = `${emulatorPath}.part`;
const host = "127.0.0.1";
const port = 8080;
const projectId = "demo-atlasia-rules";

async function sha256(path) {
  const hash = createHash("sha256");
  await pipeline(createReadStream(path), hash);
  return hash.digest("hex");
}

async function ensureEmulator() {
  await mkdir(cacheDirectory, { recursive: true });
  try {
    if ((await sha256(emulatorPath)) === expectedSha256) return;
    await rm(emulatorPath, { force: true });
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  console.log(`Firestore Emulator ${emulatorVersion} indiriliyor…`);
  const response = await fetch(emulatorUrl);
  if (!response.ok || !response.body) {
    throw new Error(`Emulator indirilemedi: HTTP ${response.status}`);
  }
  await rm(temporaryPath, { force: true });
  await pipeline(Readable.fromWeb(response.body), createWriteStream(temporaryPath));
  const downloadedHash = await sha256(temporaryPath);
  if (downloadedHash !== expectedSha256) {
    await rm(temporaryPath, { force: true });
    throw new Error(`Emulator SHA-256 eşleşmedi: ${downloadedHash}`);
  }
  await rename(temporaryPath, emulatorPath);
}

function requireJava21() {
  const result = spawnSync("java", ["-version"], { encoding: "utf8" });
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  const match = output.match(/version "(?:1\.)?(\d+)/);
  const major = match ? Number(match[1]) : 0;
  if (result.error || result.status !== 0 || major < 21) {
    throw new Error("Firestore güvenlik kuralı testleri Java 21 veya üzerini gerektirir.");
  }
}

function ensurePortAvailable() {
  return new Promise((resolve, reject) => {
    const socket = connect({ host, port });
    socket.once("connect", () => {
      socket.destroy();
      reject(new Error(`Firestore Emulator portu kullanımda: ${host}:${port}`));
    });
    socket.once("error", () => {
      socket.destroy();
      resolve();
    });
  });
}

function waitForPort(child, timeoutMs = 30_000) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const tryConnect = () => {
      if (child.exitCode !== null) {
        reject(new Error(`Firestore Emulator erken kapandı: ${child.exitCode}`));
        return;
      }
      const socket = connect({ host, port });
      socket.once("connect", () => {
        socket.destroy();
        resolve();
      });
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error("Firestore Emulator 30 saniye içinde başlamadı."));
        } else {
          setTimeout(tryConnect, 150);
        }
      });
    };
    tryConnect();
  });
}

function runRulesTests() {
  // npm's Windows shim is a .cmd file, which Node cannot spawn directly with
  // shell:false (EINVAL). npm exposes its JS CLI path in npm_execpath, so invoke
  // that through the current Node executable; retain a cmd.exe fallback for
  // direct script execution outside an npm lifecycle.
  const npmCliPath = process.env.npm_execpath;
  const command = npmCliPath
    ? process.execPath
    : process.platform === "win32"
      ? (process.env.ComSpec ?? "cmd.exe")
      : "npm";
  const args = npmCliPath
    ? [npmCliPath, "run", "test:rules"]
    : process.platform === "win32"
      ? ["/d", "/s", "/c", "npm.cmd run test:rules"]
      : ["run", "test:rules"];
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      env: {
        ...process.env,
        FIRESTORE_EMULATOR_HOST: `${host}:${port}`,
        GCLOUD_PROJECT: projectId,
      },
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) reject(new Error(`Rules testleri ${signal} sinyaliyle kapandı.`));
      else resolve(code ?? 1);
    });
  });
}

function stopProcess(child) {
  if (child.exitCode !== null) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"]);
  } else {
    child.kill("SIGTERM");
  }
}

function printEmulatorLogTail() {
  try {
    const lines = readFileSync(emulatorLogPath, "utf8").trim().split("\n");
    console.error("\nFirestore Emulator log sonu:\n", lines.slice(-80).join("\n"));
  } catch {
    // Emulator logu oluşmadan kapanmış olabilir.
  }
}

requireJava21();
await ensureEmulator();
await ensurePortAvailable();

const emulatorLog = openSync(emulatorLogPath, "w");
const emulator = spawn(
  "java",
  [
    "-jar",
    emulatorPath,
    "--host",
    host,
    "--port",
    String(port),
    "--rules",
    "firestore.rules",
    "--project_id",
    projectId,
    "--single_project_mode",
    "true",
  ],
  { stdio: ["ignore", emulatorLog, emulatorLog] },
);
closeSync(emulatorLog);

const stop = () => stopProcess(emulator);
process.once("SIGINT", stop);
process.once("SIGTERM", stop);

try {
  await waitForPort(emulator);
  console.log(`Firestore Emulator ${emulatorVersion} hazır (${host}:${port}).`);
  const code = await runRulesTests();
  if (code !== 0) printEmulatorLogTail();
  process.exitCode = code;
} catch (error) {
  printEmulatorLogTail();
  throw error;
} finally {
  stop();
}
