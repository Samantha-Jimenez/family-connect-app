import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'flowbite.s3.amazonaws.com',
        port: '',
        pathname: '/docs/gallery/**',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'family-connect-app.s3.us-east-2.amazonaws.com',
        port: '',
        pathname: '/photos/**',
      },
    ],
    domains: [
      'flowbite.s3.amazonaws.com',
      `${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com`,
      'family-connect-app.s3.us-east-2.amazonaws.com'
    ],
  },
};

export default nextConfig;
