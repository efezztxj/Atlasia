import { X } from "lucide-react";
import { usePanelAccess } from "../hooks/usePanelAccess";
import {
  getLegalDocument,
  getLegalReviewNotice,
  LEGAL_SOURCE,
  LEGAL_VERSION,
  type LegalDocumentType,
  type LegalSection,
} from "../content/legal";

interface LegalNoticeProps {
  type: LegalDocumentType;
  onClose: () => void;
}

function LegalSectionContent({ section }: { section: LegalSection }) {
  return <section className="border-t border-white/10 pt-5 first:border-t-0 first:pt-0">
    <h3 className="text-[13px] font-bold leading-relaxed tracking-[0.08em] text-sun uppercase">{section.title}</h3>
    <div className="mt-2 space-y-3">
      {section.paragraphs.map((paragraph) => <p key={paragraph} className="text-[14px] leading-7 text-mint/85">{paragraph}</p>)}
    </div>
  </section>;
}

export default function LegalNotice({ type, onClose }: LegalNoticeProps) {
  const document = getLegalDocument(type);
  const reviewNotice = getLegalReviewNotice();
  const ref = usePanelAccess(true, onClose, true);
  const sections = document.sections.map((section) => document.ordered
    ? <li key={section.title}><LegalSectionContent section={section} /></li>
    : <LegalSectionContent key={section.title} section={section} />);

  return <div className="mobile-fullscreen-wrap fixed inset-0 z-[100] grid place-items-center bg-black/75 p-4">
    <button type="button" className="absolute inset-0" onClick={onClose} aria-label={`${document.shortTitle} penceresini kapat`} />
    <aside
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-legal-title"
      aria-describedby={reviewNotice ? "account-legal-review" : undefined}
      data-legal-source={LEGAL_SOURCE}
      data-legal-version={LEGAL_VERSION}
      className="mobile-fullscreen-bleed relative flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-white/15 bg-ink-2 shadow-2xl"
    >
      <header className="mobile-safe-top shrink-0 border-b border-white/10 px-6 pt-6 pb-5 sm:px-7 sm:pt-7">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold tracking-[0.15em] text-sun uppercase">Sürüm {LEGAL_VERSION}</p>
          <button type="button" onClick={onClose} aria-label="Açıklamayı kapat" className="grid size-11 shrink-0 place-items-center rounded-full text-mint/80 transition hover:bg-white/10 hover:text-white"><X size={19} /></button>
        </div>
        <h2 id="account-legal-title" className="font-display mt-1 text-2xl leading-tight">{document.title}</h2>
        {reviewNotice && <p id="account-legal-review" role="status" className="mt-3 inline-flex rounded-full border border-amber-200/20 bg-amber-100/10 px-3 py-1.5 text-[11px] font-semibold text-amber-100">{reviewNotice}</p>}
        <p className="mt-3 text-[12px] text-mint/70">{document.updatedLine}</p>
      </header>

      <div className="thin-scroll min-h-0 flex-1 overscroll-contain overflow-y-auto px-6 py-6 sm:px-7">
        {document.intro.map((paragraph) => <p key={paragraph} className="mb-6 text-[14px] leading-7 text-mint/90">{paragraph}</p>)}
        {document.ordered
          ? <ol className="list-none space-y-6 p-0">{sections}</ol>
          : <div className="space-y-6">{sections}</div>}
      </div>

      <footer className="mobile-safe-bottom shrink-0 border-t border-white/10 bg-ink-2 px-6 py-4 sm:px-7">
        <button type="button" onClick={onClose} className="min-h-11 w-full rounded-full bg-sun px-6 text-sm font-semibold text-ink">Okudum</button>
      </footer>
    </aside>
  </div>;
}
