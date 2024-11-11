/// <reference path="./.sst/platform/config.d.ts" />

import { readdirSync } from "fs";

const AWS_ORG_NAME = process.env.AWS_ORG_NAME;
if (!AWS_ORG_NAME) throw new Error("AWS_ORG_NAME is not set");

const AWS_REGION = process.env.AWS_REGION;
if (!AWS_REGION) throw new Error("AWS_REGION is not set");

const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
if (!SUPABASE_ACCESS_TOKEN) throw new Error("SUPABASE_ACCESS_TOKEN is not set");

export default $config({
  app(input) {
    return {
      name: "printworks",
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
        awsx: true,
        cloudflare: true,
        azuread: true,
        supabase: { accessToken: SUPABASE_ACCESS_TOKEN },
        "@pulumiverse/time": true,
        tls: true,
        random: true,
        command: true,
      },
      version: ">= 3.0.1",
    };
  },
  async run() {
    const outputs = {};

    for (const dir of readdirSync("./infra")) {
      const infra = await import(`./infra/${dir}`);

      if (infra.outputs) Object.assign(outputs, infra.outputs);
    }

    return outputs;
  },
});
