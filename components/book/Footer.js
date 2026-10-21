import Logo from './Logo';
import Contact, { hasContact } from './Contact';
import Todo from './Todo';

const LINKS = [
  { href: '/book/privacy', label: 'Privacy Notice' },
  { href: '/book/terms', label: 'Terms of Use' },
  { href: '/book/refund', label: 'Refund and Cancellation' },
  { href: '/book/contact', label: 'Contact' },
];

export default function Footer({ cfg }) {
  const year = new Date().getFullYear();
  const owner = cfg.legalEntityName || 'HIM LIFE SCHOOL';

  return (
    <footer className="bg-hls-navy text-hls-platinum">
      {/* Extra bottom space on mobile so the sticky booking bar never covers the links. */}
      <div className="wrap pb-28 pt-12 md:pb-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Logo tone="dark" className="block w-[120px] [&_img]:w-full" />
            <div className="border-l border-white/15 pl-4">
              <p className="text-[15px] font-semibold text-white">Blueprint Consultation</p>
              <p className="text-[13px] text-hls-mist">
                © {year} {owner}
              </p>
              {!cfg.legalEntityName && cfg.showTodoMarkers && (
                <p className="mt-1 text-[13px]">
                  <Todo show>legal entity name (NEXT_PUBLIC_LEGAL_ENTITY_NAME)</Todo>
                </p>
              )}
            </div>
          </div>
          <nav aria-label="Legal">
            <ul className="flex flex-wrap gap-x-6 gap-y-1 text-[15px]">
              {LINKS.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="inline-block py-2 text-hls-platinum no-underline hover:text-white hover:underline">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {(hasContact(cfg) || cfg.showTodoMarkers) && (
          <div className="mt-8 border-t border-white/10 pt-8 text-[15px]">
            <p className="label text-hls-mist">Support</p>
            <Contact cfg={cfg} tone="dark" className="mt-3" />
          </div>
        )}

        <p className="mt-8 border-t border-white/10 pt-6 text-[13px] text-hls-mist">
          Payments are processed securely by Razorpay. You share your papers through a private link after booking.
        </p>
      </div>
    </footer>
  );
}
