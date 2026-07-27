import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'assets-alpha.ass8c.upcloudobjects.com',
      },
      {
        protocol: 'https',
        hostname: 'link.kjhomedecor.com',
      },
      {
        protocol: 'https',
        hostname: 'kjhomedecor.com',
      },
      {
        protocol: 'https',
        hostname: 'cf.shopee.co.id',
      },
    ],
  },
};

export default nextConfig;
