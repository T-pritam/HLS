import { Fraunces, Hanken_Grotesk, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import SmoothScroll from '@/components/SmoothScroll';
import Preloader from '@/components/Preloader';
import Cursor from '@/components/Cursor';
import Nav from '@/components/Nav';

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
  metadataBase: new URL('https://himlifeschool.com'),
  openGraph: {
    title: 'At Your Own Desk · HIM LIFE SCHOOL',
    description: "For CA Final Group 1 repeaters. You worked. You still don't know why.",
    type: 'website',
  },
  // Kept out of search until launch. Set NEXT_PUBLIC_NOINDEX to "true" on previews.
  ...(process.env.NEXT_PUBLIC_NOINDEX === 'true' ? { robots: { index: false, follow: false } } : {}),
};

export const viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${hanken.variable} ${plexMono.variable}`}
    >
      <head>
        {/* Runs before first paint. Browser scroll restoration would drop the
            visitor into the middle of a pinned timeline on reload. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "if('scrollRestoration' in history){history.scrollRestoration='manual';}window.scrollTo(0,0);",
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
