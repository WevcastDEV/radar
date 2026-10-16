/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  swcMinify: true,
  transpilePackages: ['@radar/types'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async rewrites() {
    const internalApi =
      process.env.INTERNAL_API_URL ||
      (process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.startsWith('/')
        ? process.env.NEXT_PUBLIC_API_URL
        : 'http://127.0.0.1:3001/api');
    return [
      {
        source: '/api/:path*',
        destination: `${internalApi.replace(/\/+$/, '')}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
