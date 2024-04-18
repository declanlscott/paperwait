import {
  AWS_REGION,
  CLIENT_RESOURCE_PREFIX,
  DOMAIN,
} from "@paperwait/core/constants";

import { databaseUrl } from "./database";
import { entraIdApp, entraIdClientSecret } from "./entra-id";

const awsAccountId = aws.getCallerIdentityOutput().accountId;

const replicacheLicenseKey = new sst.Secret(
  `${CLIENT_RESOURCE_PREFIX}ReplicacheLicenseKey`,
);

export const astro = new sst.aws.Astro("Paperwait", {
  path: "packages/web",
  link: [replicacheLicenseKey, databaseUrl, entraIdApp, entraIdClientSecret],
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
  environment: {
    PROD: String($app.stage === "production"),
  },
});
