import { Fraunces, Hanken_Grotesk, IBM_Plex_Mono } from 'next/font/google';
import './book.css';
import { SITE_URL, SITE_NAME, robotsMeta, verification } from '@/lib/seo';

// Same three families as the teaser, declared again so /sip shares nothing
// with the teaser's root layout (no preloader, cursor, smooth scroll or GSAP).
const fraunces = Fraunces({
  subsets: ['latin'],
  axes: ['opsz'],
  variable: '--font-fraunces',
  display: 'swap',
  // Only the body face is preloaded: it carries the largest text on a phone.
  preload: false,
});

const hanken = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-hanken',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
  preload: false,
});

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Blueprint Consultation · HIM LIFE SCHOOL',
    template: '%s · HIM LIFE SCHOOL',
  },
  description:
    'A one-to-one consultation for CA Final Group 1 repeaters, ending in a written score-improvement blueprint.',
  // Open to search engines unless NEXT_PUBLIC_NOINDEX="true".
  robots: robotsMeta,
  verification,
  openGraph: {
    title: 'The Blueprint Consultation · HIM LIFE SCHOOL',
    description: 'For CA Final Group 1 repeaters. Find where your marks are breaking.',
    type: 'website',
    siteName: SITE_NAME,
    locale: 'en_IN',
    images: [{ url: '/book/og.png', width: 1200, height: 630, alt: 'HIM LIFE SCHOOL' }],
  },
  twitter: { card: 'summary_large_image' },
};

export const viewport = {
  themeColor: '#ffffff',
  // Light by design: keeps Android's forced dark mode from turning the page black.
  colorScheme: 'only light',
  width: 'device-width',
  initialScale: 1,
};

export default function BookLayout({ children }) {
  return (
    <html lang="en-IN" className={`${fraunces.variable} ${hanken.variable} ${plexMono.variable}`}>
      <body className="book-body">{children}</body>
    </html>
  );
}
