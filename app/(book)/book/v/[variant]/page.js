import BookTemplate from '@/components/book/BookTemplate';

// /book?v=b and /book?v=c are rewritten here (next.config.mjs), so each
// variant is prerendered. B renders A until an approved sample exists.
export const dynamicParams = false;

export function generateStaticParams() {
  return [{ variant: 'b' }, { variant: 'c' }];
}

export default async function VariantPage({ params }) {
  const { variant } = await params;
  return <BookTemplate requested={variant} />;
}
