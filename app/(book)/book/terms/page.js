import LegalPage, { DraftBanner, NotPublished } from '@/components/book/LegalPage';
import { getPublicConfig } from '@/lib/book/config';
import { Inr } from '@/components/book/format';

export const metadata = { title: 'Terms of Use' };

// Placeholder wording for review. Not legal advice and not approved.
function Draft({ cfg }) {
  return (
    <>
      <h2>The consultation</h2>
      <p>
        The Blueprint Consultation is a one-to-one conversation about your CA Final Group 1 attempt that ends in a
        written score-improvement blueprint. It is for CA Final Group 1 repeaters only.
      </p>
      <p>
        It is a standalone purchase. It does not enrol you in any programme, and there is no obligation to enrol
        afterwards.
      </p>
      <h2>No promise of results</h2>
      <p>
        The consultation gives you a diagnosis and a plan. It does not promise a pass or any particular marks.
      </p>
      <h2>Price and payment</h2>
      <p>
        The price is <Inr amount={cfg.priceInr} />, {cfg.taxLabel}, paid online through Razorpay. A booking is confirmed only
        when we receive confirmation of the payment from Razorpay.
      </p>
      <h2>Cancellation, rescheduling and refunds</h2>
      <p>
        See the <a href="/book/refund">Refund and Cancellation Policy</a>.
      </p>
    </>
  );
}

export default function TermsPage() {
  const cfg = getPublicConfig();
  return (
    <LegalPage cfg={cfg} title="Terms of Use">
      {cfg.policyPublished ? (
        <Draft cfg={cfg} />
      ) : (
        <>
          <NotPublished cfg={cfg} what="terms of use" />
          {cfg.showTodoMarkers && (
            <div className="mt-10 border-t border-dashed border-hls-line pt-8">
              <DraftBanner />
              <Draft cfg={cfg} />
            </div>
          )}
        </>
      )}
    </LegalPage>
  );
}
