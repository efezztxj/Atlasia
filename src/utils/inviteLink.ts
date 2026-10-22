/**
 * Davet bağlantıları (Instagram tarzı sosyal akış, 2026-10-22).
 *
 * - Grup: `https://…/#grup=<grupKimliği>.<katılmaKodu>` → açan kişi koda sahip
 *   olduğu için kurallar (joinCode + joinAttempts sayacı) aynen geçerli.
 * - Arkadaş: `https://…/#arkadas=<uid>` → açan kişi bağlantı sahibine istek atar;
 *   arkadaşlık yine karşı tarafın kabulüyle kurulur.
 *
 * Kod fragment'ta taşınır (P20 ile aynı gerekçe): sunucu günlüklerine gitmez.
 * Bağlantı giriş/kayıt sırasında kaybolmasın diye sessionStorage'a alınır ve
 * adres çubuğundan silinir.
 */

export type ParsedInvite =
  | { kind: "group"; groupId: string; code: string }
  | { kind: "friend"; uid: string };

const ID_RE = /^[A-Za-z0-9]{6,128}$/;
const CODE_RE = /^\d{6,8}$/;
const PENDING_KEY = "atlasia.pendingInvite";

export function buildGroupInviteLink(origin: string, groupId: string, code: string): string {
  return `${origin.replace(/\/+$/, "")}/#grup=${encodeURIComponent(groupId)}.${encodeURIComponent(code)}`;
}

export function buildFriendInviteLink(origin: string, uid: string): string {
  return `${origin.replace(/\/+$/, "")}/#arkadas=${encodeURIComponent(uid)}`;
}

function parseGroupValue(value: string): ParsedInvite | null {
  const match = /^([A-Za-z0-9]+)[.\-\s]+(\d+)$/.exec(value.trim());
  if (!match || !ID_RE.test(match[1]) || !CODE_RE.test(match[2])) return null;
  return { kind: "group", groupId: match[1], code: match[2] };
}

function parseParams(raw: string): ParsedInvite | null {
  const params = new URLSearchParams(raw);
  const group = params.get("grup");
  if (group) return parseGroupValue(group);
  const friend = params.get("arkadas")?.trim();
  if (friend && ID_RE.test(friend)) return { kind: "friend", uid: friend };
  return null;
}

/**
 * Yapıştırılan bağlantıyı ya da `GRUPKİMLİĞİ.KOD` biçimini çözer. Fragment
 * önceliklidir; `?grup=` biçimi de kabul edilir. Tanınmayan girdi null döner.
 */
export function parseInvite(input: string): ParsedInvite | null {
  const text = input.trim();
  if (!text) return null;
  const hashAt = text.indexOf("#");
  if (hashAt >= 0) {
    const fromHash = parseParams(text.slice(hashAt + 1));
    if (fromHash) return fromHash;
  }
  const queryAt = text.indexOf("?");
  if (queryAt >= 0) {
    const fromQuery = parseParams(text.slice(queryAt + 1, hashAt > queryAt ? hashAt : undefined));
    if (fromQuery) return fromQuery;
  }
  if (/^[a-z]+:\/\//i.test(text)) return null;
  return parseGroupValue(text);
}

/** Fragment'tan yalnız davet anahtarlarını çıkarır; diğerlerine (ör. #r=) dokunmaz. */
export function stripInviteFromHash(hash: string): string {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  params.delete("grup");
  params.delete("arkadas");
  const rest = params.toString();
  return rest ? `#${rest}` : "";
}

interface InviteWindow {
  location: { hash: string; pathname: string; search: string };
  history: { replaceState: (data: unknown, unused: string, url?: string) => void };
  sessionStorage: Pick<Storage, "getItem" | "setItem" | "removeItem">;
}

/** Açılışta bir kez çağrılır: davet varsa saklar ve adresten siler. */
export function captureInviteFromLocation(win: InviteWindow = window): ParsedInvite | null {
  const invite = parseParams(win.location.hash.replace(/^#/, ""));
  if (!invite) return null;
  try {
    win.sessionStorage.setItem(PENDING_KEY, JSON.stringify(invite));
  } catch {
    // Gizli sekmede depolama kapalı olabilir; davet yalnız bu oturumda kaybolur.
  }
  win.history.replaceState(null, "", `${win.location.pathname}${win.location.search}${stripInviteFromHash(win.location.hash)}`);
  return invite;
}

/** Saklanan daveti bir kez verir ve siler. */
export function takePendingInvite(storage: Pick<Storage, "getItem" | "removeItem"> = window.sessionStorage): ParsedInvite | null {
  let raw: string | null = null;
  try {
    raw = storage.getItem(PENDING_KEY);
    if (raw) storage.removeItem(PENDING_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<ParsedInvite> & Record<string, unknown>;
    if (value.kind === "group" && typeof value.groupId === "string" && typeof value.code === "string") {
      return parseGroupValue(`${value.groupId}.${value.code}`);
    }
    if (value.kind === "friend" && typeof value.uid === "string" && ID_RE.test(value.uid)) {
      return { kind: "friend", uid: value.uid };
    }
  } catch {
    // Bozuk kayıt yok sayılır.
  }
  return null;
}

/** Sosyal paneli belirli bir yerde açma isteği (bildirim veya davet bağlantısı). */
export type SocialTarget =
  | { kind: "group"; groupId: string }
  | { kind: "friends" }
  | { kind: "invite"; invite: ParsedInvite };

/** Paylaşım sayfası varsa onu açar, yoksa panoya kopyalar. */
export async function shareOrCopy(url: string, title: string): Promise<"shared" | "copied" | "failed"> {
  const nav = typeof navigator === "undefined" ? undefined : navigator;
  if (nav && typeof nav.share === "function") {
    try {
      await nav.share({ title, text: title, url });
      return "shared";
    } catch (failure) {
      // Kullanıcı paylaşımı iptal ettiyse kopyalamaya düşme.
      if ((failure as { name?: string })?.name === "AbortError") return "failed";
    }
  }
  try {
    await nav?.clipboard?.writeText(url);
    return nav?.clipboard ? "copied" : "failed";
  } catch {
    return "failed";
  }
}
