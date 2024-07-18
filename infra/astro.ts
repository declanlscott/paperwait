import {
  MAX_FILE_SIZES_PARAMETER_NAME,
  PAPERCUT_PARAMETER_NAME,
} from "@paperwait/core/constants";

import {
  assetsBucket,
  assetsDistribution,
  assetsDistributionKeyPair,
  documentsBucket,
} from "./buckets";
import { entraIdApp, entraIdClientSecret } from "./entra-id";
import { papercutApiGateway } from "./papercut";
import {
  dbCredentials,
  domain,
  googleCredentials,
  isDev,
  partyKitSecrets,
  replicacheLicenseKey,
} from "./secrets";

export const astro = new sst.aws.Astro("Paperwait", {
  path: "packages/web",
  buildCommand: "pnpm build",
  link: [
    isDev,
    replicacheLicenseKey,
    ...Object.values(dbCredentials),
    ...Object.values(partyKitSecrets),
    entraIdApp,
    entraIdClientSecret,
    ...Object.values(googleCredentials),
    papercutApiGateway,
    domain,
    assetsBucket,
    ...Object.values(assetsDistributionKeyPair),
    assetsDistribution,
    documentsBucket,
  ],
  permissions: [
    {
      actions: ["ssm:PutParameter"],
      resources: [
        $interpolate`arn:aws:ssm:${aws.getRegionOutput().name}:${aws.getCallerIdentityOutput().accountId}:parameter/paperwait/org/*/${PAPERCUT_PARAMETER_NAME}`,
      ],
    },
    {
      actions: ["ssm:PutParameter", "ssm:GetParameter"],
      resources: [
        $interpolate`arn:aws:ssm:${aws.getRegionOutput().name}:${aws.getCallerIdentityOutput().accountId}:parameter/paperwait/org/*/${MAX_FILE_SIZES_PARAMETER_NAME}`,
      ],
    },
    {
      actions: ["execute-api:Invoke"],
      resources: [
        $interpolate`arn:aws:execute-api:${aws.getRegionOutput().name}:${aws.getCallerIdentityOutput().accountId}:${papercutApiGateway.nodes.api.id}/*/POST/*`,
      ],
    },
  ],
  environment: {
    PROD: String($app.stage === "production"),
  },
});
