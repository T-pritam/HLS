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
  return (
    <footer className="bg-hls-navy text-hls-platinum">
      {/* Extra bottom space on mobile so the sticky booking bar never covers the links. */}
      <div className="wrap grid gap-10 pb-28 pt-14 md:grid-cols-[auto_1fr_auto] md:gap-16 md:pb-14">
        <div>
          <Logo tone="dark" />
          {cfg.legalEntityName ? (
            <p className="mt-5 text-[15px]">{cfg.legalEntityName}</p>
          ) : (
            cfg.showTodoMarkers && (
              <p className="mt-5 text-[15px]">
                <Todo show>legal entity name (NEXT_PUBLIC_LEGAL_ENTITY_NAME)</Todo>
              </p>
            )
          )}
        </div>
        {hasContact(cfg) || cfg.showTodoMarkers ? (
          <div className="text-[15px]">
            <p className="label text-hls-mist">Support</p>
            <Contact cfg={cfg} tone="dark" className="mt-3" />
          </div>
        ) : (
          <div aria-hidden="true" className="hidden md:block" />
        )}
        <nav aria-label="Legal">
          <ul className="space-y-1 text-[15px]">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="inline-block py-2 text-hls-platinum underline-offset-4 hover:underline">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
