/// <reference path="./.sst/platform/config.d.ts" />

const AWS_ORG_NAME = process.env.AWS_ORG_NAME;
if (!AWS_ORG_NAME) throw new Error("AWS_ORG_NAME is not set");

const AWS_REGION = process.env.AWS_REGION;
if (!AWS_REGION) throw new Error("AWS_REGION is not set");

export default $config({
  app(input) {
    return {
      name: "paperwait",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
      providers: {
        aws: {
          profile:
            input?.stage === "production"
              ? `${AWS_ORG_NAME}-production`
              : `${AWS_ORG_NAME}-dev`,
          region: AWS_REGION as aws.Region,
        },
        cloudflare: true,
        azuread: true,
        "@pulumiverse/time": true,
        tls: true,
      },
      version: ">= 0.1.0",
    };
  },
  async run() {
    const infra = await import("./infra");

    return {
      url: infra.astro.url,
      whitelistIp: infra.natInstance.publicIp,
      mockPapercutApi: infra.mockPapercutApi.url,
    };
  },
});
