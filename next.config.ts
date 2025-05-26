import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      // Add other image hostnames if needed, e.g., from news sources
      // {
      //   protocol: 'https',
      //   hostname: 'api.acleddata.com', // Example, if ACLED served images directly
      // },
    ],
  },
};

export default nextConfig;
