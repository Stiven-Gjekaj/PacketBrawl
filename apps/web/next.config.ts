import type { NextConfig } from "next";

const config: NextConfig = {
  // The sim and the content pack ship as TypeScript source rather than
  // builds. Neither has a build step, so there is nothing to compile ahead of
  // time and nothing to keep in step with the app.
  transpilePackages: ["@packetbrawl/sim", "@packetbrawl/content"],
};

export default config;
