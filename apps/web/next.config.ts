import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@proposal-agent/application",
    "@proposal-agent/contracts",
    "@proposal-agent/db",
    "@proposal-agent/domain",
  ],
};

export default nextConfig;
