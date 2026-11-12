// Shared search settings for both route groups. Read at build time.

/** The public address. NEXT_PUBLIC_SITE_URL wins; the fallback is the production domain. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://himlifeschool.com').replace(/\/$/, '');

/** NEXT_PUBLIC_NOINDEX="true" hides the whole site (previews, staging). */
export const NOINDEX = process.env.NEXT_PUBLIC_NOINDEX === 'true';

export const SITE_NAME = 'HIM LIFE SCHOOL';

/** robots metadata: open unless NOINDEX. */
export const robotsMeta = NOINDEX
  ? { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } }
  : { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } };

/** Google Search Console HTML-tag verification, if the token is set (a DNS TXT record also works). */
export const verification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
  ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
  : undefined;

/** Organization details for search results (JSON-LD). Only facts already on the site. */
export const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  logo: `${SITE_URL}/hls_crest.png`,
  sameAs: ['https://www.instagram.com/himlifeschool/'],
};
