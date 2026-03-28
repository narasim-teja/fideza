import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/rpc",
        destination: "https://testnet-rpc.rayls.com/",
      },
    ];
  },
};

export default nextConfig;
