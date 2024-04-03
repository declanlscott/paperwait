// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./.sst/platform/config.d.ts" />
import * as entraId from "@pulumi/azuread";
import env, { buildLocalDatabaseUrl } from "env";

import { ClientPrefix } from "~/lib/client-resource";

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
    const time = await import("@pulumiverse/time");

    $linkable(entraId.Application, function () {
      return {
        properties: {
          clientId: this.clientId,
        },
      };
    });
    $linkable(entraId.ApplicationPassword, function () {
      return {
        properties: {
          value: this.value,
        },
      };
    });

    const localDatabaseUrl = new sst.Secret(
      "LocalDatabaseUrl",
      buildLocalDatabaseUrl(),
    );
    const remoteDatabaseUrl = new sst.Secret("RemoteDatabaseUrl");

    const replicacheLicenseKey = new sst.Secret(
      `${ClientPrefix}ReplicacheLicenseKey`,
    );

    const entraIdApp = new entraId.Application("EntraIdApplication", {
      displayName: "Paperwait",
    });

    const rotationHours = 24 * 7 * 26; // 6 months
    const clientSecretRotation = new time.Rotating("ClientSecretRotation", {
      rotationHours,
    });
    const entraIdClientSecret = new entraId.ApplicationPassword(
      "EntraIdClientSecret",
      {
        applicationObjectId: entraIdApp.id,
        endDateRelative: `${rotationHours.toString()}h`,
        rotateWhenChanged: {
          rotation: clientSecretRotation.id,
        },
      },
    );
    new entraId.ServicePrincipal("EntraIdServicePrincipal", {
      clientId: entraIdApp.clientId,
    });

    new sst.aws.Astro("Paperwait", {
      link: [
        replicacheLicenseKey,
        $dev ? localDatabaseUrl : remoteDatabaseUrl,
        entraIdApp,
        entraIdClientSecret,
      ],
    });
  },
});
