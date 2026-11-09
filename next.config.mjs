/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  // `next build` lints only the booking (/sip) code. The story page is left as shipped.
  eslint: {
    dirs: ['app/(book)', 'app/api', 'components/book', 'lib/book', 'scripts'],
  },
  async redirects() {
    return [
      // The story used to live at /story; it is the home page now.
      { source: '/story', destination: '/', permanent: true },
      // The booking page moved from /book to /sip. Kept temporary until the move is final.
      { source: '/book', destination: '/sip', permanent: false },
      { source: '/book/:page(confirmation|intake|privacy|terms|refund|contact)', destination: '/sip/:page', permanent: false },
    ];
  },
  // /sip page variants (?v=b, ?v=c) are separate static pages; the URL stays /sip?v=…
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/sip',
          has: [{ type: 'query', key: 'v', value: '(?<variant>b|c)' }],
          destination: '/sip/v/:variant',
        },
      ],
    };
  },
};

export default nextConfig;
