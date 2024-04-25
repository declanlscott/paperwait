import { AWS_REGION } from "@paperwait/core/constants";

import { entraIdApp, entraIdClientSecret } from "./entra-id";
import { databaseUrl, isDev, replicacheLicenseKey } from "./secrets";

const awsAccountId = aws.getCallerIdentityOutput().accountId;

export const astro = new sst.aws.Astro("Paperwait", {
  path: "packages/web",
  buildCommand: "pnpm build",
  link: [
    isDev,
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
  environment: {
    PROD: String($app.stage === "production"),
  },
});
