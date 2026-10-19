import LegalPage from '@/components/book/LegalPage';
import { getPublicConfig } from '@/lib/book/config';
import { checkToken } from '@/lib/book/tokens';

export const metadata = { title: 'Private intake' };

/**
 * Stub for the private, access-controlled intake. It checks the per-lead link
 * and accepts nothing: no tool or access list has been chosen yet.
 */
export default async function IntakePage({ searchParams }) {
  const params = await searchParams;
  const cfg = getPublicConfig();
  const valid =
    typeof params?.lead === 'string' &&
    typeof params?.t === 'string' &&
    checkToken(params.lead, params.t, 'intake');

  return (
    <LegalPage cfg={cfg} title="Share your marksheets and mock papers">
      {valid ? (
        <>
          <p>This is your private link for sharing previous marksheets and recent mock papers.</p>
          <p>
            Secure upload is being set up. We will contact you with the next step before your consultation. Please
            do not send documents by any other route.
          </p>
        </>
      ) : (
        <p>This link is not valid. Please use the private link from your booking email.</p>
      )}
    </LegalPage>
  );
}
