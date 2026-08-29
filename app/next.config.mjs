/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // pg and bcryptjs are server-only; keep them external to the server bundle.
    serverComponentsExternalPackages: ["pg", "bcryptjs"],
  },
};

export default nextConfig;
