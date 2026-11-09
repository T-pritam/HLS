import LegalPage, { DraftBanner, NotPublished } from '@/components/book/LegalPage';
import { getPublicConfig } from '@/lib/book/config';

export const metadata = { title: 'Terms of Use' };

// Placeholder wording for review. Not legal advice and not approved.
function Draft() {
  return (
    <>
      <h2>The consultation</h2>
      <p>
        The Blueprint Consultation is a one-to-one conversation about your CA Final Group 1 attempt that ends in a
        written score-improvement blueprint. It is for CA Final Group 1 repeaters only.
      </p>
      <p>
        It is free and standalone. It does not enrol you in any programme, and there is no obligation to enrol
        afterwards.
      </p>
      <h2>No promise of results</h2>
      <p>
        The consultation gives you a diagnosis and a plan. It does not promise a pass or any particular marks.
      </p>
      <h2>Price</h2>
      <p>The consultation is free. You are not asked to pay anything to book it.</p>
      <h2>Booking, rescheduling and cancelling</h2>
      <p>
        Times are booked through Calendly. Your booking is confirmed by Calendly&rsquo;s email, which also has the
        links to reschedule or cancel. Please cancel if you cannot attend, so the time can go to another student.
      </p>
    </>
  );
}

export default function TermsPage() {
  const cfg = getPublicConfig();
  return (
    <LegalPage cfg={cfg} title="Terms of Use">
      {cfg.policyPublished ? (
        <Draft />
      ) : (
        <>
          <NotPublished cfg={cfg} what="terms of use" />
          {cfg.showTodoMarkers && (
            <div className="mt-10 border-t border-dashed border-hls-line pt-8">
              <DraftBanner />
              <Draft />
            </div>
          )}
        </>
      )}
    </LegalPage>
  );
}
