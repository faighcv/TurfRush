/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['maplibre-gl'],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'maplibre-gl': require.resolve('maplibre-gl'),
    };
    return config;
  },
};

module.exports = nextConfig;
