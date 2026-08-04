import './globals.css';
import SmoothScroll from '@/components/SmoothScroll';
import Preloader from '@/components/Preloader';
import Cursor from '@/components/Cursor';
import Nav from '@/components/Nav';
import Duotone from '@/components/Duotone';

export const metadata = {
  title: 'HIM LIFE SCHOOL, CA Final Mentorship, Hyderabad',
  description:
    'A CA Final mentorship in Hyderabad for students who are done losing marks they should have won.',
  metadataBase: new URL('https://himlifeschool.com'),
  openGraph: {
    title: 'HIM LIFE SCHOOL',
    description: 'The gap between knowing and scoring.',
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
    <html lang="en">
      <head>
        {/* Runs before first paint. Browser scroll restoration would drop the
            visitor into the middle of a pinned timeline on reload. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "if('scrollRestoration' in history){history.scrollRestoration='manual';}window.scrollTo(0,0);",
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&display=swap"
          rel="stylesheet"
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
        <Duotone />
        <Preloader />
        <Cursor />
        <SmoothScroll />
        <Nav />
        <main id="top">{children}</main>
      </body>
    </html>
  );
}
