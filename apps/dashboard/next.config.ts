import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@chivo/contracts'],
};

export default nextConfig;
