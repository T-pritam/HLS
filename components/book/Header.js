import Logo from './Logo';

/** Clear space around the lockup is at least the height of its "H". */
export default function Header({ ctaHref = '#book', showCta = true }) {
  return (
    <header className="border-b border-hls-line bg-white">
      <div className="wrap flex items-center justify-between gap-4 py-3">
        <a href="/book" className="block p-3 -m-3" aria-label="HIM LIFE SCHOOL, Blueprint Consultation">
          <Logo tone="light" priority />
        </a>
        {showCta && (
          <a href={ctaHref} className="btn-primary hidden md:inline-flex">
            Book your blueprint consultation
          </a>
        )}
      </div>
    </header>
  );
}
