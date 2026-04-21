/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/.well-known/apple-app-site-association",
        destination: "/aasa",
      },
      {
        source: "/.well-known/assetlinks.json",
        destination: "/assetlinks",
      },
    ];
  },
};

module.exports = nextConfig;
