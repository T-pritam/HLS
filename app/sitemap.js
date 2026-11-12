import { SITE_URL } from '@/lib/seo';

// Public pages only. The intake (per-lead private link) and the APIs are left out.
export default function sitemap() {
  const page = (path, priority, changeFrequency = 'monthly') => ({ url: `${SITE_URL}${path}`, changeFrequency, priority });
  return [
    page('/', 1),
    page('/sip', 0.9, 'weekly'),
    page('/sip/contact', 0.4),
    page('/sip/privacy', 0.2, 'yearly'),
    page('/sip/terms', 0.2, 'yearly'),
  ];
}
