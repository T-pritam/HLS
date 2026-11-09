import LegalPage from '@/components/book/LegalPage';
import Contact, { hasContact } from '@/components/book/Contact';
import Todo from '@/components/book/Todo';
import { getPublicConfig } from '@/lib/book/config';

export const metadata = { title: 'Contact' };

export default function ContactPage() {
  const cfg = getPublicConfig();
  return (
    <LegalPage cfg={cfg} title="Contact">
      {cfg.legalEntityName ? (
        <p>{cfg.legalEntityName}</p>
      ) : (
        cfg.showTodoMarkers && (
          <p>
            <Todo show>legal entity name (NEXT_PUBLIC_LEGAL_ENTITY_NAME)</Todo>
          </p>
        )
      )}
      {hasContact(cfg) ? (
        <Contact cfg={cfg} className="mt-4" />
      ) : (
        <>
          <p>Support contact details are to be confirmed.</p>
          {cfg.showTodoMarkers && <Contact cfg={cfg} className="mt-4" />}
        </>
      )}
    </LegalPage>
  );
}
