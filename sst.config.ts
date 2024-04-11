// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./.sst/platform/config.d.ts" />
import * as entraId from "@pulumi/azuread";
import env from "env";

import { ClientPrefix } from "~/lib/client-resource";
import { authRedirectPath, domain, localhost } from "~/utils/constants";

const { AWS_ORG_NAME, AWS_REGION } = env;

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
      },
    };
  },
  async run() {
    // TODO: Should be able to import this normally in the future
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

    const awsAccountId = aws.getCallerIdentityOutput().accountId;

    const databaseUrl = new sst.Secret("DatabaseUrl");

    const replicacheLicenseKey = new sst.Secret(
      `${ClientPrefix}ReplicacheLicenseKey`,
    );

    const entraIdApp = new entraId.Application("EntraIdApplication", {
      displayName: "Paperwait",
      preventDuplicateNames: true,
      signInAudience: "AzureADMultipleOrgs",
      web: {
        redirectUris: [
          `http://${localhost}${authRedirectPath}`,
          `https://${domain}${authRedirectPath}`,
        ],
      },
    });
    new entraId.ApplicationIdentifierUri("EntraIdApplicationIdentifierUri", {
      applicationId: entraIdApp.id,
      identifierUri: `api://paperwait`,
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

    const astro = new sst.aws.Astro("Paperwait", {
      link: [
        replicacheLicenseKey,
        databaseUrl,
        entraIdApp,
        entraIdClientSecret,
      ],
      permissions: [
        {
          actions: ["ssm:GetParameter", "ssm:PutParameter"],
          resources: [
            $resolve([awsAccountId]).apply(
              ([accountId]) =>
                `arn:aws:ssm:${AWS_REGION}:${accountId}:parameter/paperwait/org/*/papercut`,
            ),
          ],
        },
      ],
    });

    return {
      url: astro.url,
    };
  },
});
