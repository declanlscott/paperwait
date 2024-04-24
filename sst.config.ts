/// <reference path="./.sst/platform/config.d.ts" />
import { AWS_REGION } from "@paperwait/core/constants";
import env from "env";

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
              ? `${env.AWS_ORG_NAME}-production`
              : `${env.AWS_ORG_NAME}-dev`,
          region: AWS_REGION,
        },
      },
    };
  },
  async run() {
    const infra = await import("./infra");

    return {
      url: infra.astro.url,
    };
  },
});
