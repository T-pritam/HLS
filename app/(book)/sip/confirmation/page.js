import Header from '@/components/book/Header';
import Footer from '@/components/book/Footer';
import Confirmation from '@/components/book/Confirmation';
import { getPublicConfig } from '@/lib/book/config';

export const metadata = { title: 'Your booking' };

export default async function ConfirmationPage({ searchParams }) {
  const params = await searchParams;
  const cfg = getPublicConfig();
  return (
    <>
      <Header showCta={false} />
      <main id="main" className="section bg-hls-wash">
        <div className="wrap max-w-3xl">
          <Confirmation
            leadId={typeof params?.lead === 'string' ? params.lead : ''}
            token={typeof params?.t === 'string' ? params.t : ''}
            durationMin={cfg.durationMin}
            contact={{ phone: cfg.supportPhone, whatsapp: cfg.supportWhatsApp, email: cfg.supportEmail }}
          />
        </div>
      </main>
      <Footer cfg={cfg} />
    </>
  );
}
