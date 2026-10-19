import BookTemplate from '@/components/book/BookTemplate';

// Variant A. B and C are served from ./v/[variant] via a rewrite.
export default function BookPage() {
  return <BookTemplate requested="a" />;
}
