import Todo from './Todo';
import { telHref, whatsappHref } from './format';

/** Support contacts from config. Unset ones are hidden (TODO marker in development only). */
export function hasContact(cfg) {
  return Boolean(cfg.supportPhone || cfg.supportWhatsApp || cfg.supportEmail);
}

export default function Contact({ cfg, tone = 'light', className = '' }) {
  const link = tone === 'dark' ? 'text-white underline' : 'underline';
  const items = [
    cfg.supportPhone && (
      <li key="phone">
        Phone: <a className={link} href={telHref(cfg.supportPhone)}>{cfg.supportPhone}</a>
      </li>
    ),
    cfg.supportWhatsApp && (
      <li key="wa">
        WhatsApp: <a className={link} href={whatsappHref(cfg.supportWhatsApp)}>{cfg.supportWhatsApp}</a>
      </li>
    ),
    cfg.supportEmail && (
      <li key="email">
        Email: <a className={link} href={`mailto:${cfg.supportEmail}`}>{cfg.supportEmail}</a>
      </li>
    ),
  ].filter(Boolean);

  return (
    <ul className={`space-y-1 ${className}`}>
      {items}
      {cfg.showTodoMarkers &&
        [
          !cfg.supportPhone && 'support phone (NEXT_PUBLIC_SUPPORT_PHONE)',
          !cfg.supportWhatsApp && 'support WhatsApp (NEXT_PUBLIC_SUPPORT_WHATSAPP)',
          !cfg.supportEmail && 'support email (NEXT_PUBLIC_SUPPORT_EMAIL)',
        ]
          .filter(Boolean)
          .map((t) => (
            <li key={t}>
              <Todo show>{t}</Todo>
            </li>
          ))}
    </ul>
  );
}
