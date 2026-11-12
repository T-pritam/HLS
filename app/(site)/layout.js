import { Fraunces, Hanken_Grotesk, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import SmoothScroll from '@/components/SmoothScroll';
import Preloader from '@/components/Preloader';
import Cursor from '@/components/Cursor';
import Nav from '@/components/Nav';
import { SITE_URL, SITE_NAME, robotsMeta, verification, organizationJsonLd } from '@/lib/seo';

const fraunces = Fraunces({
  subsets: ['latin'],
  axes: ['opsz'],
  style: ['normal', 'italic'],
  variable: '--font-fraunces',
  display: 'swap',
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
});

export const metadata = {
  title: 'At Your Own Desk · HIM LIFE SCHOOL',
  description: "For CA Final Group 1 repeaters. You worked. You still don't know why.",
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: '/' },
  openGraph: {
    title: 'At Your Own Desk · HIM LIFE SCHOOL',
    description: "For CA Final Group 1 repeaters. You worked. You still don't know why.",
    type: 'website',
    url: '/',
    siteName: SITE_NAME,
    locale: 'en_IN',
  },
  twitter: { card: 'summary_large_image' },
  // Open to search engines unless NEXT_PUBLIC_NOINDEX="true" (previews).
  robots: robotsMeta,
  verification,
};

export const viewport = {
  themeColor: '#000000',
  // The page is already dark. Without this, Android's forced dark mode
  // inverts the platinum pills and paper into dark grey.
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${hanken.variable} ${plexMono.variable}`}
      // The head script may add static-story before React hydrates.
      suppressHydrationWarning
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        {/* Runs before first paint. Browser scroll restoration would drop the
            visitor into the middle of a pinned timeline on reload. A phone
            held sideways gets the static scenes (lib/motion.js staticScenes). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "if('scrollRestoration' in history){history.scrollRestoration='manual';}window.scrollTo(0,0);" +
              "if(matchMedia('(orientation: landscape) and (max-height: 500px) and (pointer: coarse)').matches){document.documentElement.classList.add('static-story');}",
          }}
        />

        {/* Google Analytics GA4, add the measurement ID and uncomment when ready.
            <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
            <script>
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-XXXXXXXXXX');
            </script>
        */}
      </head>
      <body className="bg-hls-black text-hls-platinum antialiased">
        <Preloader />
        <Cursor />
        <SmoothScroll />
        <Nav />
        <main id="top">{children}</main>
      </body>
    </html>
  );
}
