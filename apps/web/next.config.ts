import type { NextConfig } from "next";

const config: NextConfig = {
  // The sim ships as TypeScript source rather than a build. It has no
  // dependencies and no build step of its own, so there is nothing to compile
  // ahead of time and nothing to keep in step with the app.
  transpilePackages: ["@packetbrawl/sim"],
};

export default config;
