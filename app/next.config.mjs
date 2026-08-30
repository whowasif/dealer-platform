/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // pg and bcryptjs are server-only; keep them external to the server bundle.
    serverComponentsExternalPackages: ["pg", "bcryptjs"],
    // Document uploads (Task 8) send a multipart body via a server action with
    // a file up to 15MB. The default server-action body limit is ~1MB, so raise
    // it here. (We chose the server-action approach over a separate Route
    // Handler because it keeps upload auth + validation alongside the other
    // server actions and builds cleanly.)
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
