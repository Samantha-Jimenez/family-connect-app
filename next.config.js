/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), '@aws-sdk/client-s3'];
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'family-connect-app.s3.us-east-2.amazonaws.com',
      },
    ],
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  env: {
    NEXT_PUBLIC_AWS_S3_REGION: process.env.NEXT_PUBLIC_AWS_S3_REGION,
    NEXT_PUBLIC_AWS_S3_ACCESS_KEY_ID: process.env.NEXT_PUBLIC_AWS_S3_ACCESS_KEY_ID,
    NEXT_PUBLIC_AWS_S3_SECRET_ACCESS_KEY: process.env.NEXT_PUBLIC_AWS_S3_SECRET_ACCESS_KEY,
    NEXT_PUBLIC_AWS_S3_BUCKET_NAME: process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME,
  },
  experimental: {
    images: {
      timeout: 15000,
    },
  },
};

module.exports = nextConfig; 