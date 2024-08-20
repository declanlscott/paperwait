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
        "@upstash/pulumi": true,
        "@pulumiverse/time": true,
        tls: true,
        random: true,
      },
      version: ">= 3.0.1",
    };
  },
  async run() {
    const infra = await import("./infra");

    new sst.x.DevCommand("Studio", {
      link: [infra.db],
      dev: {
        command: "pnpm db:studio",
        directory: "packages/core",
        autostart: true,
      },
    });

    new sst.x.DevCommand("PartyKit", {
      dev: {
        command: $interpolate`npx partykit dev --var API_KEY=${infra.partyKitApiKey.result} --var REPLICACHE_LICENSE_KEY=${infra.replicacheLicenseKey.value}`,
        directory: "packages/realtime",
        autostart: true,
      },
    });

    return {
      url: infra.web.url,
    };
  },
});
