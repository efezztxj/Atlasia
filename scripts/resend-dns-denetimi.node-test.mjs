import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  evaluateDomain,
  formatReport,
  inspectDomain,
  isDomain,
  joinTxt,
  parseArgs,
} from "./resend-dns-denetimi.mjs";

const DOMAIN = "mail.atlasia.app";
const SEND = `send.${DOMAIN}`;
const DKIM = `resend._domainkey.${DOMAIN}`;

/** Doğru kurulmuş bir alan adının DNS yanıtları (Resend'in TXT DKIM biçimi). */
function goodZone() {
  return {
    domain: DOMAIN,
    txt: {
      [SEND]: [["v=spf1 include:amazonses.com ~all"]],
      [DKIM]: [["p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQD"]],
    },
    mx: { [SEND]: [{ exchange: "feedback-smtp.us-east-1.amazonses.com", priority: 10 }] },
    dmarcTxt: [["v=DMARC1; p=none; rua=mailto:dmarc@atlasia.app"]],
  };
}

function ids(result) {
  return result.findings.map((finding) => finding.id);
}

describe("resend-dns-denetimi", () => {
  it("doğru yapılandırmayı hatasız geçirir", () => {
    const result = evaluateDomain(goodZone());
    assert.equal(result.ok, true);
    assert.equal(result.errorCount, 0);
    assert.deepEqual(result.findings, []);
  });

  it("SPF yoksa hata verir", () => {
    const zone = goodZone();
    zone.txt[SEND] = [];
    const result = evaluateDomain(zone);
    assert.equal(result.ok, false);
    assert.ok(ids(result).includes("spf"));
  });

  it("SPF Resend altyapısını yetkilendirmiyorsa hata verir", () => {
    const zone = goodZone();
    zone.txt[SEND] = [["v=spf1 include:_spf.google.com ~all"]];
    const result = evaluateDomain(zone);
    assert.equal(result.findings.find((f) => f.id === "spf").level, "error");
  });

  it("birden fazla SPF kaydını hata sayar", () => {
    const zone = goodZone();
    zone.txt[SEND] = [["v=spf1 include:amazonses.com ~all"], ["v=spf1 include:sendgrid.net ~all"]];
    assert.equal(evaluateDomain(zone).findings.find((f) => f.id === "spf").level, "error");
  });

  it("send.resend.com gibi gerçek bir kaydı kabul eder", () => {
    const result = evaluateDomain({
      domain: "resend.com",
      txt: { "send.resend.com": [["v=spf1 include:amazonses.com ~all"]], "resend._domainkey.resend.com": [["p=MIGfMA0GCSq"]] },
      mx: { "send.resend.com": [{ exchange: "feedback-smtp.us-east-1.amazonses.com", priority: 10 }] },
      dmarcTxt: [["v=DMARC1; p=reject; rua=mailto:d@resend.com"]],
    });
    assert.equal(result.ok, true);
  });

  it("DKIM CNAME (SES Easy DKIM) biçimini kabul eder", () => {
    const selectors = ["abc123"];
    const result = evaluateDomain({
      domain: DOMAIN,
      txt: { [SEND]: [["v=spf1 include:amazonses.com ~all"]] },
      mx: { [SEND]: [{ exchange: "feedback-smtp.eu-west-1.amazonses.com", priority: 10 }] },
      cname: { [`abc123._domainkey.${DOMAIN}`]: ["abc123.dkim.amazonses.com."] },
      dmarcTxt: [["v=DMARC1; p=none; rua=mailto:d@atlasia.app"]],
      dkimSelectors: selectors,
    });
    assert.equal(result.ok, true);
  });

  it("DKIM seçicisi yanlışsa anlaşılır bir hata verir", () => {
    const result = evaluateDomain({ ...goodZone(), dkimSelectors: ["baskasecici"] });
    assert.equal(result.ok, false);
    const dkim = result.findings.find((finding) => finding.id === "dkim");
    assert.equal(dkim.level, "error");
    assert.match(dkim.message, /--dkim-selector/);
  });

  it("return-path MX yokluğu yalnız uyarıdır", () => {
    const zone = goodZone();
    zone.mx = {};
    const result = evaluateDomain(zone);
    assert.equal(result.ok, true);
    assert.equal(result.findings.find((f) => f.id === "mx").level, "warn");
  });

  it("beklenmeyen return-path hedefini uyarı olarak işaretler", () => {
    const zone = goodZone();
    zone.mx[SEND] = [{ exchange: "mx.example.invalid", priority: 5 }];
    assert.equal(evaluateDomain(zone).findings.find((f) => f.id === "mx").level, "warn");
  });

  it("DMARC yokluğu uyarıdır, gönderimi engellemez", () => {
    const zone = goodZone();
    zone.dmarcTxt = [];
    const result = evaluateDomain(zone);
    assert.equal(result.ok, true);
    assert.equal(result.findings.find((f) => f.id === "dmarc").level, "warn");
  });

  it("DMARC'ta rua yoksa uyarır", () => {
    const zone = goodZone();
    zone.dmarcTxt = [["v=DMARC1; p=none;"]];
    assert.match(evaluateDomain(zone).findings.find((f) => f.id === "dmarc").message, /rua/);
  });

  it("TXT kaydı parçalarını birleştirir", () => {
    assert.equal(joinTxt(["v=spf1 ", "include:amazonses.com ", "~all"]), "v=spf1 include:amazonses.com ~all");
    assert.equal(joinTxt("tek"), "tek");
    assert.equal(joinTxt(undefined), "");
  });

  it("DNS'e çıkmadan sahte çözümleyiciyle uçtan uca okur", async () => {
    const zone = {
      [`send.${DOMAIN}`]: [["v=spf1 include:amazonses.com ~all"]],
      [`resend._domainkey.${DOMAIN}`]: [["p=MIGf"]],
    };
    const resolver = {
      resolveTxt: async (host) => zone[host] ?? Promise.reject(Object.assign(new Error("ENODATA"), { code: "ENODATA" })),
      resolveMx: async (host) => (host === `send.${DOMAIN}` ? [{ exchange: "feedback-smtp.us-east-1.amazonses.com", priority: 10 }] : []),
      resolveCname: async () => [],
      resolve4: async () => ["203.0.113.10"],
    };
    const result = await inspectDomain(DOMAIN, ["resend"], resolver);
    assert.equal(result.ok, true);
    assert.equal(result.apexResolves, true);
  });

  it("alan adı çözülmüyorsa bunu ayrı raporlar", async () => {
    const resolver = {
      resolveTxt: async () => [],
      resolveMx: async () => [],
      resolveCname: async () => [],
      resolve4: async () => {
        throw Object.assign(new Error("ENOTFOUND"), { code: "ENOTFOUND" });
      },
    };
    const result = await inspectDomain(DOMAIN, ["resend"], resolver);
    assert.equal(result.apexResolves, false);
    assert.equal(result.ok, false);
    assert.match(formatReport(result), /A kaydı çözülmüyor/);
  });

  it("CLI argümanlarını okur", () => {
    assert.deepEqual(parseArgs(["--domain", "Mail.Atlasia.App"]), { domain: "mail.atlasia.app", selectors: ["resend"], json: false });
    assert.deepEqual(parseArgs(["--domain", "a.b", "--dkim-selector", "s1,s2", "--json"]).selectors, ["s1", "s2"]);
    assert.equal(parseArgs([]).domain, "");
  });

  it("alan adı biçimini doğrular", () => {
    assert.equal(isDomain("mail.atlasia.app"), true);
    assert.equal(isDomain("atlasia"), false);
    assert.equal(isDomain("https://atlasia.app"), false);
    assert.equal(isDomain("-kotu.app"), false);
  });

  it("rapor hatayı uyarıdan önce yazar", () => {
    const result = evaluateDomain({ domain: DOMAIN, txt: {}, mx: {}, cname: {}, dmarcTxt: [] });
    const report = formatReport(result);
    assert.ok(report.indexOf("[HATA] spf") < report.indexOf("[UYARI] dmarc"));
  });
});
