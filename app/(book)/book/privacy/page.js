import LegalPage, { DraftBanner, NotPublished } from '@/components/book/LegalPage';
import { getPublicConfig } from '@/lib/book/config';

export const metadata = { title: 'Privacy Notice' };

// Placeholder wording for review. Not legal advice and not approved.
function Draft({ cfg }) {
  const who = cfg.legalEntityName ?? 'HIM LIFE SCHOOL';
  return (
    <>
      <p>
        This notice explains how {who} (&ldquo;HLS&rdquo;, &ldquo;we&rdquo;) uses the details you give when you book
        the Blueprint Consultation.
      </p>
      <h2>What we collect</h2>
      <ul>
        <li>Your name, mobile number (WhatsApp) and email address.</li>
        <li>Which attempt you are preparing for, and that you are a CA Final Group 1 repeater.</li>
        <li>Your consent choices, with the time you made them.</li>
        <li>How you reached the page (for example, a campaign link), and the page version you saw.</li>
        <li>
          Payment references from Razorpay. We do not see or store your card, UPI or bank details; Razorpay
          handles the payment.
        </li>
      </ul>
      <h2>Why we use it</h2>
      <ul>
        <li>To book, confirm and run your consultation, and to contact you about it.</li>
        <li>To follow up if a booking is not completed.</li>
        <li>
          To tell you about HLS programmes, only if you ticked the optional box, and only on the channels you
          chose. You can withdraw this at any time.
        </li>
      </ul>
      <h2>Marksheets and mock papers</h2>
      <p>
        These are never collected on the booking page. After booking, you get a separate private link to share
        them. They are used only to prepare your consultation and blueprint.
      </p>
      <h2>Who sees it</h2>
      <p>
        The HLS team members handling your booking, and the service providers we use to run it (Razorpay for
        payment, and our email provider). We do not sell your details.
      </p>
      <h2>How long we keep it, and your choices</h2>
      <p>
        Retention periods are to be confirmed. You can ask to see, correct or delete your details, or withdraw
        marketing consent, by contacting us through the <a href="/book/contact">contact page</a>.
      </p>
    </>
  );
}

export default function PrivacyPage() {
  const cfg = getPublicConfig();
  return (
    <LegalPage cfg={cfg} title="Privacy Notice">
      {cfg.policyPublished ? (
        <Draft cfg={cfg} />
      ) : (
        <>
          <NotPublished cfg={cfg} what="privacy notice" />
          <p>
            In short: we use your name, mobile and email only to book and run your consultation and to contact you
            about it. Marketing messages are sent only if you opt in, on the channels you choose. Marksheets and
            mock papers are never collected on the booking page.
          </p>
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
