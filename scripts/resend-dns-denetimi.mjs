/**
 * Atlasia — Resend alan adı DNS denetimi
 *
 * NEDEN VAR: Resend'in gerçek kullanıcıya mail gönderebilmesi için
 * **doğrulanmış** bir alan adı şart. Doğrulama "panelde yeşil yanıyor" değil,
 * DNS'te duran kayıtların gerçekten yayınlanmış olmasıdır. Bu betik kayıtları
 * yayından okur ve panele girmeden eksikleri gösterir.
 *
 * GÜVENLİK: yalnız genel DNS okunur. Resend jetonu, API anahtarı veya hesap
 * bilgisi kullanılmaz; çıktı sır taşımaz.
 *
 * Kullanım:
 *   node scripts/resend-dns-denetimi.mjs --domain mail.atlasia.app
 *   node scripts/resend-dns-denetimi.mjs --domain mail.atlasia.app --dkim-selector resend
 *   node scripts/resend-dns-denetimi.mjs --domain mail.atlasia.app --json
 *
 * DKIM seçicisi Resend panelindeki kayıt satırında yazar (çoğunlukla `resend`;
 * SES Easy DKIM kuran hesaplarda rastgele üç adet olur). Yanlış seçici
 * verirsen DKIM "bulunamadı" görünür — bu bir yapılandırma hatası değil,
 * seçicinin bilinmediği anlamına gelebilir.
 *
 * Çıkış kodu:
 *   0 → zorunlu kayıtlar yerinde
 *   1 → zorunlu kayıt eksik/yanlış
 *   2 → alan adı hiç çözülmüyor (alan adı alınmamış veya DNS taşınmamış)
 */

import { resolve4, resolveCname, resolveMx, resolveTxt } from "node:dns/promises";

/* ── saf değerlendirme ──────────────────────────────────────────────── */

/** SPF metni Amazon SES (= Resend altyapısı) gönderimini yetkilendirir. */
export const SPF_INCLUDE = /include:(amazonses\.com|send\.resend\.com|_spf\.resend\.com)/i;

/** Bounce/şikâyet hedefi bölgeye göre değişir: feedback-smtp.<region>.amazonses.com */
export const RETURN_PATH = /^feedback-smtp\.[a-z0-9-]+\.amazonses\.com$/i;

export const DKIM_TARGET = /\.dkim\.amazonses\.com$/i;

/** `resolveTxt` kaydı parçalara böler; SPF/DKIM metni birleştirilerek okunur. */
export function joinTxt(chunks) {
  return Array.isArray(chunks) ? chunks.join("") : String(chunks ?? "");
}

function txtRecords(map, host) {
  return toStrings(map?.[host]).map(joinTxt).filter(Boolean);
}

function toStrings(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

/**
 * DNS yanıtlarını Resend kurallarına göre değerlendirir. Saf fonksiyon:
 * testler ağa çıkmadan doğrudan çağırır.
 *
 * @param {object} input
 * @param {string} input.domain  Resend'e eklenen gönderen alan adı
 * @param {Record<string, string[][]>} [input.txt]   host → TXT kayıtları
 * @param {Record<string, (string|{exchange:string})[]>} [input.mx] host → MX
 * @param {Record<string, string[]>} [input.cname]   host → CNAME hedefleri
 * @param {string[][]} [input.dmarcTxt]              `_dmarc.<domain>` TXT
 * @param {string[]} [input.dkimSelectors]           denenecek seçiciler
 */
export function evaluateDomain({
  domain = "",
  txt = {},
  mx = {},
  cname = {},
  dmarcTxt = [],
  dkimSelectors = ["resend"],
} = {}) {
  const findings = [];
  const sendHost = `send.${domain}`;

  /* 1) SPF — send alt alanında tam olarak bir SPF kaydı. */
  const spfRecords = txtRecords(txt, sendHost).filter((value) => /^v=spf1\b/i.test(value));
  if (!spfRecords.length) {
    findings.push({ id: "spf", level: "error", host: sendHost, message: "send alt alanında SPF TXT kaydı yok." });
  } else if (spfRecords.length > 1) {
    findings.push({
      id: "spf",
      level: "error",
      host: sendHost,
      message: `${spfRecords.length} SPF kaydı var; SPF'de tek kayıt geçerlidir. Diğerlerini tek satırda birleştir.`,
    });
  } else if (!SPF_INCLUDE.test(spfRecords[0])) {
    findings.push({
      id: "spf",
      level: "error",
      host: sendHost,
      message: "SPF kaydı Resend altyapısını (include:amazonses.com) yetkilendirmiyor.",
    });
  } else if (!/~all\s*$/i.test(spfRecords[0].trim())) {
    findings.push({ id: "spf", level: "warn", host: sendHost, message: "SPF kaydı `~all` ile bitmiyor." });
  }

  /* 2) Return-path MX — bounce ve şikâyetlerin geri dönmesi için. */
  const sendMx = toStrings(mx[sendHost]).map((record) =>
    String(typeof record === "object" && record ? record.exchange ?? "" : record).replace(/\.$/, ""),
  );
  if (!sendMx.filter(Boolean).length) {
    findings.push({
      id: "mx",
      level: "warn",
      host: sendHost,
      message: "Return-path MX yok. Gönderim çalışabilir ama bounce/şikâyet kaydı geri dönmez.",
    });
  } else if (!sendMx.filter(Boolean).every((exchange) => RETURN_PATH.test(exchange))) {
    findings.push({
      id: "mx",
      level: "warn",
      host: sendHost,
      message: `Return-path hedefi beklenen biçimde değil: ${sendMx.filter(Boolean).join(", ")}`,
    });
  }

  /* 3) DKIM — TXT (tek anahtar) veya CNAME (SES Easy DKIM, 3 kayıt) biçimi. */
  const checkedSelectors = [];
  let dkimOk = false;
  for (const selector of dkimSelectors) {
    for (const host of [`${selector}._domainkey.${domain}`, `${selector}._domainkey.${sendHost}`]) {
      checkedSelectors.push(host);
      const txtValues = txtRecords(txt, host);
      const cnames = toStrings(cname[host]).map((value) => String(value).replace(/\.$/, ""));
      if (txtValues.some((value) => /^(v=DKIM1|p=)/i.test(value))) dkimOk = true;
      if (cnames.length && cnames.every((target) => DKIM_TARGET.test(target))) dkimOk = true;
    }
  }
  if (!dkimOk) {
    findings.push({
      id: "dkim",
      level: "error",
      host: checkedSelectors.join(" · "),
      message:
        "DKIM kaydı bulunamadı. Paneldeki seçici adını `--dkim-selector <ad>` ile ver; kayıt yoksa Resend doğrulaması geçmez ve mail spam'e düşer.",
    });
  }

  /* 4) DMARC — doğrulama için zorunlu değil, teslim edilebilirlik için kritik. */
  const dmarc = toStrings(dmarcTxt).map(joinTxt).filter((value) => /^v=DMARC1\s*;/i.test(value));
  if (!dmarc.length) {
    findings.push({
      id: "dmarc",
      level: "warn",
      host: `_dmarc.${domain}`,
      message: "DMARC kaydı yok. `v=DMARC1; p=none; rua=mailto:dmarc@<domain>` ile gözlem modunda başla.",
    });
  } else if (!/rua=/i.test(dmarc[0])) {
    findings.push({
      id: "dmarc",
      level: "warn",
      host: `_dmarc.${domain}`,
      message: "DMARC kaydında rapor adresi (rua=) yok; ihlalleri göremezsin.",
    });
  }

  const errors = findings.filter((item) => item.level === "error");
  return { domain, ok: errors.length === 0, errorCount: errors.length, findings };
}

/* ── DNS ─────────────────────────────────────────────────────────────── */

async function safeResolve(fn, ...args) {
  try {
    return await fn(...args);
  } catch {
    // ENOTFOUND / ENODATA / SERVFAIL → "kayıt yok" kabul edilir.
    return [];
  }
}

/** Gerçek DNS'ten yayın durumunu toplar (varsayılan: sistem çözümleyicisi). */
export async function inspectDomain(domain, selectors = ["resend"], resolver = { resolveTxt, resolveMx, resolveCname, resolve4 }) {
  const sendHost = `send.${domain}`;
  const dkimHosts = selectors.flatMap((selector) => [
    `${selector}._domainkey.${domain}`,
    `${selector}._domainkey.${sendHost}`,
  ]);

  const [sendTxt, sendMx, dmarcTxt, apexA, ...dkimAnswers] = await Promise.all([
    safeResolve(resolver.resolveTxt, sendHost),
    safeResolve(resolver.resolveMx, sendHost),
    safeResolve(resolver.resolveTxt, `_dmarc.${domain}`),
    safeResolve(resolver.resolve4, domain),
    ...dkimHosts.flatMap((host) => [safeResolve(resolver.resolveTxt, host), safeResolve(resolver.resolveCname, host)]),
  ]);

  const txt = { [sendHost]: sendTxt };
  const cname = {};
  dkimHosts.forEach((host, index) => {
    txt[host] = dkimAnswers[index * 2];
    cname[host] = dkimAnswers[index * 2 + 1];
  });

  const evaluation = evaluateDomain({ domain, txt, mx: { [sendHost]: sendMx }, cname, dmarcTxt, dkimSelectors: selectors });
  return { ...evaluation, apexResolves: apexA.length > 0, selectors };
}

/* ── CLI ─────────────────────────────────────────────────────────────── */

export function parseArgs(argv) {
  const args = { domain: "", selectors: [], json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--domain") args.domain = String(argv[(index += 1)] ?? "").trim().toLowerCase();
    else if (arg === "--dkim-selector") {
      args.selectors.push(...String(argv[(index += 1)] ?? "").split(",").map((value) => value.trim()).filter(Boolean));
    } else if (arg === "--json") args.json = true;
  }
  if (!args.selectors.length) args.selectors = ["resend"];
  return args;
}

export function isDomain(value) {
  return /^(?!-)[a-z0-9-]{1,63}(\.(?!-)[a-z0-9-]{1,63})+$/i.test(value);
}

export function formatReport(result) {
  const lines = [`Resend DNS denetimi · ${result.domain}`, ""];
  if (result.apexResolves === false) {
    lines.push("· Alan adı A kaydı çözülmüyor: alan adı satın alınmamış veya DNS taşınmamış olabilir.", "");
  }
  for (const finding of [...result.findings].sort((a, b) => (a.level === b.level ? 0 : a.level === "error" ? -1 : 1))) {
    lines.push(`[${finding.level === "error" ? "HATA" : "UYARI"}] ${finding.id} · ${finding.host}`);
    lines.push(`        ${finding.message}`);
  }
  if (!result.findings.length) lines.push("Tüm zorunlu kayıtlar yerinde.");
  lines.push("");
  lines.push(
    result.errorCount === 0
      ? "Sonuç: zorunlu kayıtlar tamam. Resend panelinde Verify'a bas."
      : `Sonuç: ${result.errorCount} zorunlu kayıt eksik; Resend doğrulaması geçmez.`,
  );
  return lines.join("\n");
}

const invokedDirectly = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (invokedDirectly) {
  const args = parseArgs(process.argv.slice(2));
  if (!isDomain(args.domain)) {
    console.error(
      "Geçerli bir alan adı ver.\n  Örnek: node scripts/resend-dns-denetimi.mjs --domain mail.atlasia.app\n  (Bu, Resend paneline eklediğin GÖNDEREN alan adıdır; pages.dev olamaz.)",
    );
    process.exit(1);
  }

  const result = await inspectDomain(args.domain, args.selectors);
  console.log(args.json ? JSON.stringify(result, null, 2) : formatReport(result));
  if (!result.apexResolves) process.exit(2);
  process.exit(result.errorCount === 0 ? 0 : 1);
}
