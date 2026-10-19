/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  // `next build` lints only the /book code. The teaser is left as shipped.
  eslint: {
    dirs: ['app/(book)', 'app/api', 'components/book', 'lib/book', 'scripts'],
  },
  // /book page variants (?v=b, ?v=c) are separate static pages; the URL stays /book?v=…
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/book',
          has: [{ type: 'query', key: 'v', value: '(?<variant>b|c)' }],
          destination: '/book/v/:variant',
        },
      ],
    };
  },
};

export default nextConfig;
