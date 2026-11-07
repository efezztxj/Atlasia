/**
 * Atlasia e-posta şablonları (Resend hattı).
 *
 * NEDEN AYRI DOSYA: şablonlar kullanıcı verisi taşır (ad, bağlantı). Burada
 * üretilen her metin `escapeHtml`/`escapeAttr` süzgecinden geçer; worker'ın
 * başka hiçbir yeri HTML birleştirmez. Böylece "kullanıcı adı şablona kaçtı"
 * sınıfı hata tek dosyada kapanır.
 *
 * Marka renkleri `src/index.css` ile aynıdır: ink #021512, ink-3 #072b24,
 * mint #e4f5ea, leaf #5be0a6, gold #eab54f.
 */

const INK = "#021512";
const INK_3 = "#072b24";
const MINT = "#e4f5ea";
const LEAF = "#5be0a6";
const GOLD = "#eab54f";

/** HTML metni için kaçış. */
export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** `href` içine girecek adres için kaçış (sorgu dizesi korunur). */
export function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

/** Yalnız http(s) adresleri bağlantı olabilir; başka şema boş döner. */
export function safeUrl(value, fallback = "") {
  try {
    const url = new URL(String(value));
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Ortak kabuk. Tablo tabanlı, satır içi stil: Gmail/Outlook karanlık modda da
 * bozulmasın. Görsel yok — uzak görsel spam skorunu yükseltir ve bazı
 * istemcilerde engellenir; logo yerine tipografi ve renk kullanılır.
 */
function layout({ preheader, title, bodyHtml, footerNote, appUrl, brand }) {
  const host = escapeHtml(brand || "Atlasia");
  const home = escapeAttr(safeUrl(appUrl));
  return `<!doctype html>
<html lang="tr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:${INK};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${INK};padding:28px 12px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:${INK_3};border:1px solid rgba(91,224,166,0.28);border-radius:18px;">
      <tr><td style="padding:26px 26px 8px 26px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
        <div style="font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:${LEAF};font-weight:700;">${host}</div>
        <h1 style="margin:14px 0 0 0;font-size:22px;line-height:1.3;color:${MINT};font-weight:700;">${escapeHtml(title)}</h1>
      </td></tr>
      <tr><td style="padding:12px 26px 0 26px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.62;color:#cfe0d6;">
        ${bodyHtml}
      </td></tr>
      <tr><td style="padding:26px 26px 28px 26px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
        ${footerNote ? `<p style="margin:0 0 14px 0;font-size:12px;line-height:1.6;color:#8fa79b;">${footerNote}</p>` : ""}
        <p style="margin:0;font-size:12px;line-height:1.6;color:#8fa79b;">
          ${escapeHtml(brand || "Atlasia")} · <a href="${home}" style="color:${LEAF};text-decoration:none;">${escapeHtml(home.replace(/^https?:\/\//, ""))}</a>
        </p>
      </td></tr>
    </table>
    <div style="max-width:520px;margin:14px auto 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#6f867c;text-align:center;">
      Bu e-posta ${host} hesabındaki bir işlem için gönderildi. İşlemi sen başlatmadıysan bu iletiyi yok say.
    </div>
  </td></tr>
</table>
</body></html>`;
}

function button(label, href) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 8px 0;">
  <tr><td style="background:${LEAF};border-radius:12px;">
    <a href="${escapeAttr(href)}" style="display:inline-block;padding:14px 26px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:${INK};text-decoration:none;">${escapeHtml(label)}</a>
  </td></tr></table>`;
}

function fallbackLink(href) {
  return `<p style="margin:18px 0 0 0;font-size:12px;line-height:1.6;color:#8fa79b;word-break:break-all;">
    Düğme çalışmazsa bağlantıyı kopyala:<br><a href="${escapeAttr(href)}" style="color:${LEAF};text-decoration:none;">${escapeHtml(href)}</a>
  </p>`;
}

/** "Merhaba Efe," satırı; ad yoksa nötr karşılama. */
function greeting(displayName) {
  const name = typeof displayName === "string" ? displayName.trim().slice(0, 40) : "";
  return name ? `<p style="margin:0 0 14px 0;">Merhaba ${escapeHtml(name)},</p>` : "<p style=\"margin:0 0 14px 0;\">Merhaba,</p>";
}

const SIGN_OFF = `<p style="margin:20px 0 0 0;color:#8fa79b;font-size:13px;">Keşfetmeye hazır olduğunda harita seni bekliyor.</p>`;

export function verificationEmail({ link, displayName, appUrl, brand } = {}) {
  const url = safeUrl(link);
  if (!url) throw new Error("sablon/link-gecersiz");
  const body = `${greeting(displayName)}
<p style="margin:0 0 14px 0;">Atlasia hesabını açtığın için teşekkürler. Aşağıdaki düğme e-posta adresinin sana ait olduğunu doğrular; doğrulama tamamlanınca harita ve rotalar açılır.</p>
${button("E-postamı doğrula", url)}
<p style="margin:14px 0 0 0;font-size:13px;color:#8fa79b;">Bağlantı 1 saat içinde geçerlidir ve yalnız bir kez kullanılabilir.</p>
${SIGN_OFF}`;

  return {
    subject: "Atlasia · E-posta adresini doğrula",
    html: layout({
      preheader: "Tek tıkla doğrula, keşfetmeye başla.",
      title: "E-posta adresini doğrula",
      bodyHtml: `${body}${fallbackLink(url)}`,
      footerNote: "Doğrulamayı sen başlatmadıysan hesabına erişen biri olabilir; bu e-postayı yok say ve şifreni değiştir.",
      appUrl,
      brand,
    }),
    text: textOf([
      displayName ? `Merhaba ${String(displayName).trim().slice(0, 40)},` : "Merhaba,",
      "",
      "Atlasia hesabını doğrulamak için bu bağlantıyı aç:",
      url,
      "",
      "Bağlantı 1 saat içinde geçerlidir. Doğrulamayı sen başlatmadıysan bu e-postayı yok say.",
      "",
      `— ${brand || "Atlasia"} · ${safeUrl(appUrl)}`,
    ]),
  };
}

export function resetEmail({ link, displayName, appUrl, brand } = {}) {
  const url = safeUrl(link);
  if (!url) throw new Error("sablon/link-gecersiz");
  const body = `${greeting(displayName)}
<p style="margin:0 0 14px 0;">Atlasia hesabın için şifre yenileme isteği geldi. Yeni şifreni belirlemek için aşağıdaki düğmeyi kullan.</p>
${button("Şifremi yenile", url)}
<p style="margin:14px 0 0 0;font-size:13px;color:#8fa79b;">Bağlantı 1 saat içinde geçerlidir. Şifren bu bağlantıya tıklanana kadar değişmez.</p>
${SIGN_OFF}`;

  return {
    subject: "Atlasia · Şifre yenileme bağlantısı",
    html: layout({
      preheader: "Şifreni yenilemek için tek tık yeter.",
      title: "Şifreni yenile",
      bodyHtml: `${body}${fallbackLink(url)}`,
      footerNote: "Bu isteği sen yapmadıysan hiçbir şey yapmana gerek yok: şifren değişmez. Endişeleniyorsan uygulamadan şifreni yenile.",
      appUrl,
      brand,
    }),
    text: textOf([
      displayName ? `Merhaba ${String(displayName).trim().slice(0, 40)},` : "Merhaba,",
      "",
      "Atlasia şifreni yenilemek için bu bağlantıyı aç:",
      url,
      "",
      "Bağlantı 1 saat içinde geçerlidir. İsteği sen yapmadıysan şifren değişmez.",
      "",
      `— ${brand || "Atlasia"} · ${safeUrl(appUrl)}`,
    ]),
  };
}

/**
 * Geri bildirim bildirimi — kullanıcıdan ekibe giden iç e-posta.
 * Kullanıcı metni burada da kaçıştan geçer; satır sonları <br> olur.
 */
export function feedbackEmail({ message, fromEmail, category, path, appUrl, brand } = {}) {
  const safeMessage = escapeHtml(String(message ?? "").slice(0, 2000)).replace(/\r?\n/g, "<br>");
  const rows = [
    ["Kategori", category],
    ["Kullanıcı e-postası", fromEmail],
    ["Sayfa", path],
  ].filter(([, value]) => value);

  const body = `<p style="margin:0 0 14px 0;">Yeni bir geri bildirim geldi.</p>
<div style="background:${INK};border-radius:12px;padding:16px;border-left:3px solid ${GOLD};">
  <div style="font-size:14px;line-height:1.65;color:${MINT};">${safeMessage || "(boş)"}</div>
</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0 0 0;font-size:13px;color:#8fa79b;">
${rows
  .map(
    ([label, value]) =>
      `<tr><td style="padding:2px 14px 2px 0;color:#8fa79b;">${escapeHtml(label)}</td><td style="padding:2px 0;color:#cfe0d6;">${escapeHtml(value)}</td></tr>`,
  )
  .join("\n")}
</table>`;

  return {
    subject: `Atlasia · Geri bildirim${category ? ` (${String(category).slice(0, 24)})` : ""}`,
    html: layout({
      preheader: "Kullanıcıdan yeni geri bildirim.",
      title: "Yeni geri bildirim",
      bodyHtml: body,
      footerNote: "Yanıtlamak için bu e-postayı yanıtla; kullanıcı adresi varsa doğrudan ona gider.",
      appUrl,
      brand,
    }),
    text: textOf([
      "Yeni bir geri bildirim geldi.",
      "",
      String(message ?? "").slice(0, 2000),
      "",
      ...rows.map(([label, value]) => `${label}: ${value}`),
    ]),
  };
}

function textOf(lines) {
  return lines.filter((line) => line !== undefined).join("\n");
}
