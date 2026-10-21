import {
  AccountError,
  isValidEmail,
  normalizeEmail,
  validPassword,
  type AtlasAccount,
  type SignupDetails,
} from "./accountTypes";

interface PasswordHash {
  salt: string;
  hash: string;
  iterations: number;
}

interface DeviceAccount {
  uid: string;
  email: string;
  displayName: string;
  country: string;
  password: PasswordHash;
  recoveryHash: string;
  createdAt: number;
}

interface DeviceSession {
  id: string;
  uid: string;
  expiresAt: number;
}

const DATABASE = "atlasia-device-accounts-v1";
const SESSION_KEY = "atlasia.device-session.v1";
const ITERATIONS = 600_000;
const SESSION_DURATION = 12 * 60 * 60 * 1000;
let databasePromise: Promise<IDBDatabase> | null = null;
const attempts = new Map<string, { count: number; blockedUntil: number }>();

function requireBrowserSecurity() {
  if (!globalThis.crypto?.subtle) throw new AccountError("device/secure-context-required");
  if (!globalThis.indexedDB) throw new AccountError("device/storage-unavailable");
}

function randomHex(length: number) {
  return Array.from(crypto.getRandomValues(new Uint8Array(length)), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> {
  if (!/^(?:[a-f\d]{2})+$/i.test(hex)) throw new AccountError("device/storage-invalid");
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

function hexOf(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function digest(text: string) {
  return hexOf(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
}

async function derivePassword(password: string, salt: string, iterations: number) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: fromHex(salt), iterations }, key, 256);
  return hexOf(bits);
}

async function makePasswordHash(password: string): Promise<PasswordHash> {
  const salt = randomHex(16);
  return { salt, iterations: ITERATIONS, hash: await derivePassword(password, salt, ITERATIONS) };
}

function equalHash(a: string, b: string) {
  let mismatch = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) mismatch |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return mismatch === 0;
}

function openDatabase(): Promise<IDBDatabase> {
  requireBrowserSecurity();
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      const accounts = db.createObjectStore("accounts", { keyPath: "uid" });
      accounts.createIndex("email", "email", { unique: true });
      const sessions = db.createObjectStore("sessions", { keyPath: "id" });
      sessions.createIndex("uid", "uid");
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => { db.close(); databasePromise = null; };
      resolve(db);
    };
    request.onerror = () => reject(new AccountError("device/storage-unavailable"));
    request.onblocked = () => reject(new AccountError("device/storage-blocked"));
  });
  databasePromise.catch(() => { databasePromise = null; });
  return databasePromise;
}

async function read<T>(store: "accounts" | "sessions", key: string, index?: string): Promise<T | undefined> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, "readonly");
    const objectStore = transaction.objectStore(store);
    const request = index ? objectStore.index(index).get(key) : objectStore.get(key);
    let result: T | undefined;
    request.onsuccess = () => { result = request.result as T | undefined; };
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(new AccountError("device/storage-unavailable"));
    transaction.onabort = () => reject(new AccountError("device/storage-unavailable"));
  });
}

async function write(store: "accounts" | "sessions", value: DeviceAccount | DeviceSession, add = false) {
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(store, "readwrite");
    const objectStore = transaction.objectStore(store);
    if (add) objectStore.add(value);
    else objectStore.put(value);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(new AccountError(transaction.error?.name === "ConstraintError" ? "auth/email-already-in-use" : "device/storage-unavailable"));
    transaction.onabort = () => reject(new AccountError(transaction.error?.name === "ConstraintError" ? "auth/email-already-in-use" : "device/storage-unavailable"));
  });
}

function toAccount(account: DeviceAccount): AtlasAccount {
  return { uid: account.uid, email: account.email, displayName: account.displayName, phoneNumber: null, photoURL: null, emailVerified: false, requiresEmailVerification: false, backend: "device" };
}

async function startSession(account: DeviceAccount): Promise<AtlasAccount> {
  const token = randomHex(32);
  const expiresAt = Date.now() + SESSION_DURATION;
  const id = await digest(token);
  await write("sessions", { id, uid: account.uid, expiresAt });
  try { sessionStorage.setItem(SESSION_KEY, token); }
  catch { throw new AccountError("device/storage-unavailable"); }
  return toAccount(account);
}

function checkAttempts(email: string) {
  if ((attempts.get(email)?.blockedUntil ?? 0) > Date.now()) throw new AccountError("auth/too-many-requests");
}

function recordFailure(email: string) {
  const previous = attempts.get(email);
  const count = (previous?.count ?? 0) + 1;
  attempts.set(email, { count: count >= 5 ? 0 : count, blockedUntil: count >= 5 ? Date.now() + 30_000 : 0 });
}

// This is a device-only account store, not a simulated OAuth or email provider.
export async function registerDeviceAccount(details: SignupDetails) {
  requireBrowserSecurity();
  const email = normalizeEmail(details.email);
  if (!isValidEmail(email)) throw new AccountError("auth/invalid-email");
  if (!validPassword(details.password)) throw new AccountError("auth/weak-password");
  if (details.displayName.trim().length < 2) throw new AccountError("auth/invalid-profile-name");
  if (await read<DeviceAccount>("accounts", email, "email")) throw new AccountError("auth/email-already-in-use");
  const recoveryCode = randomHex(16).toUpperCase().match(/.{4}/g)!.join("-");
  const account: DeviceAccount = {
    uid: `device-${randomHex(16)}`,
    email,
    displayName: details.displayName.trim().slice(0, 40),
    country: details.country,
    password: await makePasswordHash(details.password),
    recoveryHash: await digest(recoveryCode.replace(/-/g, "")),
    createdAt: Date.now(),
  };
  await write("accounts", account, true);
  return { recoveryCode, finish: () => startSession(account) };
}

export async function signInDeviceAccount(inputEmail: string, password: string) {
  requireBrowserSecurity();
  const email = normalizeEmail(inputEmail);
  if (!isValidEmail(email)) throw new AccountError("auth/invalid-email");
  if (!password || password.length > 128) throw new AccountError("auth/invalid-credential");
  checkAttempts(email);
  const account = await read<DeviceAccount>("accounts", email, "email");
  const stored = account?.password ?? { salt: "0".repeat(32), iterations: ITERATIONS, hash: "0".repeat(64) };
  if (!Number.isInteger(stored.iterations) || stored.iterations < 100_000 || stored.iterations > 2_000_000 || !/^[a-f\d]{64}$/.test(stored.hash)) {
    throw new AccountError("device/storage-invalid");
  }
  const hash = await derivePassword(password, stored.salt, stored.iterations);
  if (!account || !equalHash(hash, stored.hash)) {
    recordFailure(email);
    throw new AccountError("auth/invalid-credential");
  }
  attempts.delete(email);
  await signOutDeviceAccount();
  return startSession(account);
}

export async function restoreDeviceSession() {
  let token: string | null = null;
  try { token = sessionStorage.getItem(SESSION_KEY); } catch { return null; }
  if (!token) return null;
  requireBrowserSecurity();
  if (!/^[a-f\d]{64}$/.test(token)) { sessionStorage.removeItem(SESSION_KEY); return null; }
  const session = await read<DeviceSession>("sessions", await digest(token));
  if (!session || session.expiresAt <= Date.now()) {
    await signOutDeviceAccount();
    return null;
  }
  const account = await read<DeviceAccount>("accounts", session.uid);
  return account ? toAccount(account) : null;
}

export async function signOutDeviceAccount() {
  let token: string | null = null;
  try { token = sessionStorage.getItem(SESSION_KEY); sessionStorage.removeItem(SESSION_KEY); } catch { return; }
  if (!token || !crypto.subtle) return;
  const db = await openDatabase();
  const id = await digest(token);
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction("sessions", "readwrite");
    transaction.objectStore("sessions").delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(new AccountError("device/storage-unavailable"));
    transaction.onabort = () => reject(new AccountError("device/storage-unavailable"));
  });
}

export async function updateDeviceProfile(displayName: string) {
  const current = await restoreDeviceSession();
  if (!current) throw new AccountError("auth/session-expired");
  const account = await read<DeviceAccount>("accounts", current.uid);
  if (!account) throw new AccountError("auth/session-expired");
  account.displayName = displayName.trim().slice(0, 40);
  if (account.displayName.length < 2) throw new AccountError("auth/invalid-profile-name");
  await write("accounts", account);
  return toAccount(account);
}

export async function resetDevicePassword(inputEmail: string, recoveryCode: string, password: string) {
  requireBrowserSecurity();
  if (!validPassword(password)) throw new AccountError("auth/weak-password");
  const email = normalizeEmail(inputEmail);
  checkAttempts(email);
  const code = recoveryCode.replace(/[\s-]/g, "").toUpperCase();
  const account = await read<DeviceAccount>("accounts", email, "email");
  if (!account || !/^[A-F\d]{32}$/.test(code) || !equalHash(await digest(code), account.recoveryHash)) {
    recordFailure(email);
    throw new AccountError("device/invalid-recovery-code");
  }
  const nextPassword = await makePasswordHash(password);
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(["accounts", "sessions"], "readwrite");
    transaction.objectStore("accounts").put({ ...account, password: nextPassword });
    const cursor = transaction.objectStore("sessions").index("uid").openCursor(IDBKeyRange.only(account.uid));
    cursor.onsuccess = () => {
      const entry = cursor.result;
      if (entry) { entry.delete(); entry.continue(); }
    };
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(new AccountError("device/storage-unavailable"));
    transaction.onabort = () => reject(new AccountError("device/storage-unavailable"));
  });
  attempts.delete(email);
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* The existing session has already been revoked. */ }
}
/**
 * Cihaz modundaki hesabı ve oturumlarını kalıcı olarak siler.
 * Adım 13: hesap silme, verinin gerçekten kalkması demektir; yalnız çıkış yetmez.
 */
export async function deleteDeviceAccount(uid: string) {
  requireBrowserSecurity();
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(["accounts", "sessions"], "readwrite");
    transaction.objectStore("accounts").delete(uid);
    const cursor = transaction.objectStore("sessions").index("uid").openCursor(IDBKeyRange.only(uid));
    cursor.onsuccess = () => {
      const entry = cursor.result;
      if (entry) { entry.delete(); entry.continue(); }
    };
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(new AccountError("device/storage-unavailable"));
    transaction.onabort = () => reject(new AccountError("device/storage-unavailable"));
  });
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* Session token is already unreachable when storage is blocked. */ }
}
