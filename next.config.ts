import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      new URL("https://*.public.blob.vercel-storage.com/**"),
    ],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
