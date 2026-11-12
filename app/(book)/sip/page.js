import BookTemplate from '@/components/book/BookTemplate';

export const metadata = { alternates: { canonical: '/sip' } };

// Variant A. B and C are served from ./v/[variant] via a rewrite.
export default function BookPage() {
  return <BookTemplate requested="a" />;
}
