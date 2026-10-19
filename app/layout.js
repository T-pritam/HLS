import { Fraunces, Hanken_Grotesk, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import SmoothScroll from '@/components/SmoothScroll';
import Preloader from '@/components/Preloader';
import Cursor from '@/components/Cursor';
import Nav from '@/components/Nav';
import InkFilter from '@/components/InkFilter';

const fraunces = Fraunces({
  subsets: ['latin'],
  axes: ['opsz'],
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
  title: 'HIM LIFE SCHOOL',
  description: 'You know the syllabus. So why did the marks not come?',
  metadataBase: new URL('https://himlifeschool.com'),
  openGraph: {
    title: 'HIM LIFE SCHOOL',
    description: 'You know the syllabus. So why did the marks not come?',
    type: 'website',
  },
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
        <InkFilter />
        <Preloader />
        <Cursor />
        <SmoothScroll />
        <Nav />
        <main id="top">{children}</main>
      </body>
    </html>
  );
}
