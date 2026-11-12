import { NOINDEX, SITE_URL } from '@/lib/seo';

// Disallows everything while NEXT_PUBLIC_NOINDEX="true" (previews), otherwise opens the
// public pages and points crawlers at the sitemap.
export default function robots() {
  if (NOINDEX) return { rules: { userAgent: '*', disallow: '/' } };
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/sip/intake', '/sip/v/'] },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
