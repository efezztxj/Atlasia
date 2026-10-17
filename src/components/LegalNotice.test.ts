import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LEGAL_SOURCE, privacyDocument, termsDocument } from "../content/legal";
import LegalNotice from "./LegalNotice";

function render(type: "privacy" | "terms") {
  return renderToStaticMarkup(createElement(LegalNotice, { type, onClose: () => {} }));
}

describe("LegalNotice", () => {
  it.each([
    ["privacy" as const, privacyDocument],
    ["terms" as const, termsDocument],
  ])("%s belgesinin tam bölüm yapısını erişilebilir dialog içinde render eder", (type, document) => {
    const markup = render(type);

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain('aria-labelledby="account-legal-title"');
    expect(markup).toContain('aria-describedby="account-legal-review"');
    expect(markup).toContain(`data-legal-source="${LEGAL_SOURCE}"`);
    expect(markup.match(/<section/g)).toHaveLength(document.sections.length);
    for (const section of document.sections) expect(markup).toContain(section.title);
  });
});
