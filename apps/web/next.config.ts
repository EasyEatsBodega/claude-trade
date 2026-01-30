import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  transpilePackages: ['@claude-trade/shared'],
  outputFileTracingRoot: path.join(__dirname, '../../'),
};

export default nextConfig;
