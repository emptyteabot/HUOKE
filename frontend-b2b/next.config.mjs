import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
const projectRoot = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath,
  assetPrefix: basePath || undefined,
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'leadpulse.cc.cd' }],
        destination: 'https://leadpulseagi.com/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.leadpulse.cc.cd' }],
        destination: 'https://leadpulseagi.com/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.leadpulseagi.com' }],
        destination: 'https://leadpulseagi.com/:path*',
        permanent: true,
      },
    ];
  },
  experimental: {
    turbo: {
      root: projectRoot,
    },
  },
};

export default nextConfig;
