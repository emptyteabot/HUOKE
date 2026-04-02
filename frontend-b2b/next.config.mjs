import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
const projectRoot = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath,
  assetPrefix: basePath || undefined,
  experimental: {
    turbo: {
      root: projectRoot,
    },
  },
};

export default nextConfig;
