// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./.sst/platform/config.d.ts" />

import { ClientPrefix } from "~/lib/client-resource";
import env, { buildLocalDatabaseUrl } from "./env";

const { AWS_ORG_NAME, AWS_REGION } = env;

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
          region: AWS_REGION,
        },
      },
    };
  },
  async run() {
    const localDatabaseUrl = new sst.Secret(
      "LocalDatabaseUrl",
      buildLocalDatabaseUrl(),
    );
    const remoteDatabaseUrl = new sst.Secret("RemoteDatabaseUrl");

    const replicacheLicenseKey = new sst.Secret(
      `${ClientPrefix}ReplicacheLicenseKey`,
    );

    new sst.aws.Astro("Paperwait", {
      link: [replicacheLicenseKey, $dev ? localDatabaseUrl : remoteDatabaseUrl],
    });
  },
});
