/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The published page and receipt routes read JSON from ./data at runtime, so
  // those files must be traced into the serverless bundle on Vercel.
  experimental: {
    outputFileTracingIncludes: {
      "/": ["./data/**"],
      "/examples/waitlist": ["./data/**"],
      "/p/[page]": ["./data/**"],
      "/r/[id]": ["./data/**"],
      "/api/receipt/[id]": ["./data/**"],
    },
  },
};

export default nextConfig;
