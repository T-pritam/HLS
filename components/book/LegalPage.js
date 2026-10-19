import Header from './Header';
import Footer from './Footer';

/** Shell for the draft legal pages. Never describes the text as approved. */
export default function LegalPage({ cfg, title, children }) {
  return (
    <>
      <Header ctaHref="/book#book" />
      <main id="main" className="section">
        <div className="wrap">
          <p className="label text-hls-signal-dark">HIM LIFE SCHOOL · Blueprint Consultation</p>
          <h1 className="mt-4 text-[38px] leading-tight md:text-[52px]">{title}</h1>
          <div className="prose-legal mt-8">{children}</div>
          <p className="mt-12">
            <a href="/book">Back to the Blueprint Consultation</a>
          </p>
        </div>
      </main>
      <Footer cfg={cfg} />
    </>
  );
}

/** Shown instead of the draft text until NEXT_PUBLIC_POLICY_PUBLISHED=true. */
export function NotPublished({ cfg, what }) {
  return (
    <>
      <p>Our {what} is being finalised and will be published here.</p>
      {cfg.showTodoMarkers && (
        <p>
          <span className="todo-marker">TODO: draft text below is visible in development only</span>
        </p>
      )}
    </>
  );
}

export function DraftBanner() {
  return (
    <p className="!mt-0 mb-6 inline-block rounded bg-[#fff7ed] px-2 py-1 font-mono text-[13px] text-[#92400e]">
      Draft. Not yet confirmed by HLS.
    </p>
  );
}
