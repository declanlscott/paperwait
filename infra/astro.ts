import { AWS_REGION } from "@paperwait/core/constants";

import { entraIdApp, entraIdClientSecret } from "./entra-id";
import {
  databaseUrl,
  googleClientId,
  googleClientSecret,
  isDev,
  partyKitApiKey,
  replicacheLicenseKey,
} from "./secrets";
import { xmlRpcApi } from "./xml-rpc-api";

export const astro = new sst.aws.Astro("Paperwait", {
  path: "packages/web",
  buildCommand: "pnpm build",
  link: [
    isDev,
    replicacheLicenseKey,
    databaseUrl,
    partyKitApiKey,
    entraIdApp,
    entraIdClientSecret,
    googleClientId,
    googleClientSecret,
    xmlRpcApi,
  ],
  permissions: [
    {
      actions: ["ssm:PutParameter"],
      resources: [
        $interpolate`arn:aws:ssm:${AWS_REGION}:${aws.getCallerIdentityOutput().accountId}:parameter/paperwait/org/*/papercut`,
      ],
    },
    { actions: ["lambda:InvokeFunction"], resources: [xmlRpcApi.arn] },
  ],
  environment: {
    PROD: String($app.stage === "production"),
  },
});
