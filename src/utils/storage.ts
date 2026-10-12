type StorageScope = "local" | "session";

const memory = new Map<string, string>();
const memoryKey = (scope: StorageScope, key: string) => `${scope}:${key}`;

function storage(scope: StorageScope) {
  return scope === "local" ? window.localStorage : window.sessionStorage;
}

/** Tarayıcı depolamayı engellese veya kota dolsa bile arayüzün çökmesini önler. */
export function storageGet(key: string, scope: StorageScope = "local") {
  const fallback = memory.get(memoryKey(scope, key)) ?? null;
  try {
    return storage(scope).getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function storageSet(key: string, value: string, scope: StorageScope = "local") {
  memory.set(memoryKey(scope, key), value);
  try {
    storage(scope).setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function storageRemove(key: string, scope: StorageScope = "local") {
  memory.delete(memoryKey(scope, key));
  try {
    storage(scope).removeItem(key);
    return true;
  } catch {
    return false;
  }
}
