import BookTemplate from '@/components/book/BookTemplate';

// /sip?v=b and /sip?v=c are rewritten here (next.config.mjs), so each
// variant is prerendered. B renders A until an approved sample exists.
// Variants are copies of /sip for testing, so search engines are pointed at /sip.
export const metadata = { alternates: { canonical: '/sip' } };

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ variant: 'b' }, { variant: 'c' }];
}

export default async function VariantPage({ params }) {
  const { variant } = await params;
  return <BookTemplate requested={variant} />;
}
