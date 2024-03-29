// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./.sst/platform/config.d.ts" />

import { z } from "astro/zod";

import { ClientPrefix } from "~/lib/client-resource";

const { AWS_ORG_NAME } = z
  .object({
    AWS_ORG_NAME: z.string(),
  })
  .parse(process.env);

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
          region: "us-east-2",
        },
      },
    };
  },
  async run() {
    new sst.Secret("RdsUsername");
    new sst.Secret("RdsPassword");

    const replicacheLicenseKey = new sst.Secret(
      `${ClientPrefix}ReplicacheLicenseKey`,
    );

    new sst.aws.Astro("Paperwait", {
      link: [replicacheLicenseKey],
    });
  },
});
