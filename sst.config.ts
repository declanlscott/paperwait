/// <reference path="./.sst/platform/config.d.ts" />
import { AWS_REGION } from "@paperwait/core/constants";

const AWS_ORG_NAME = process.env.AWS_ORG_NAME;
if (!AWS_ORG_NAME) {
  throw new Error("AWS_ORG_NAME is not set");
}

export default $config({
  app(input) {
    return {
      name: "paperwait",
      removal: input.stage === "production" ? "retain" : "remove",
      home: "aws",
      providers: {
        aws: {
          profile:
            input.stage === "production"
              ? `${AWS_ORG_NAME}-production`
              : `${AWS_ORG_NAME}-dev`,
          region: AWS_REGION,
        },
        azuread: true,
        "@pulumiverse/time": true,
        tls: true,
      },
    };
  },
  async run() {
    const infra = await import("./infra");

    return {
      url: infra.astro.url,
      whitelistIp: infra.natInstance.publicIp,
    };
  },
});
