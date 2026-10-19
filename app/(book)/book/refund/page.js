import LegalPage, { DraftBanner, NotPublished } from '@/components/book/LegalPage';
import { getPublicConfig } from '@/lib/book/config';

export const metadata = { title: 'Refund and Cancellation Policy' };

// Direction approved; text not yet confirmed by HLS. Hidden until published.
function Draft({ cfg }) {
  return (
    <>
      <h2>If we cancel</h2>
      <p>If HLS has to cancel your consultation, you can choose a replacement time or a full refund.</p>
      <h2>If you cancel</h2>
      <ul>
        <li>At least 24 hours before your consultation: full refund.</li>
        <li>Less than 24 hours before: no automatic refund.</li>
      </ul>
      <h2>Rescheduling</h2>
      <p>You can reschedule once, free of charge, with at least 24 hours&rsquo; notice.</p>
      <h2>If you miss the consultation</h2>
      <p>
        A missed consultation is not refunded automatically. Our support team reviews exceptional circumstances.
      </p>
      <h2>How refunds are paid</h2>
      <p>
        Refunds go back to the original payment method through Razorpay.{' '}
        {cfg.refundProcessingTime
          ? `They are processed within ${cfg.refundProcessingTime}.`
          : 'Processing time is to be confirmed.'}
      </p>
      <p>
        To cancel or reschedule, please use the <a href="/book/contact">contact page</a>.
      </p>
    </>
  );
}

export default function RefundPage() {
  const cfg = getPublicConfig();
  return (
    <LegalPage cfg={cfg} title="Refund and Cancellation Policy">
      {cfg.policyPublished ? (
        <Draft cfg={cfg} />
      ) : (
        <>
          <NotPublished cfg={cfg} what="refund and cancellation policy" />
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
